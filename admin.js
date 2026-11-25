// SIRAYAT CMS - Admin Dashboard
// Uses Supabase Publishable Key only. Never use service_role here.

const SUPABASE_URL = "https://elidsfdxjowuvpqmzefq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vD4mcf115FSQj-yVkBDi9g_ayxo5Q57";
const BUCKET = "sirayat-articles";

const configured =
  SUPABASE_URL.startsWith("https://elidsfdxjowuvpqmzefq.supabase.co") &&
  !SUPABASE_ANON_KEY.includes("sb_publishable_vD4mcf115FSQj-yVkBDi9g_ayxo5Q57");

const $ = id => document.getElementById(id);

let client = null;
let currentUser = null;
let currentProfile = null;
let articles = [];
let currentImageUrl = null;
let previewObjectUrl = null;

if (configured && window.supabase) {
  client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

if (configured) $("setupNotice").hidden = true;

// LOGIN
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!client) {
    $("loginMessage").textContent =
      "Backend not configured. Check your Supabase settings.";
    return;
  }

  $("loginMessage").textContent = "Signing in…";

  const { data, error } = await client.auth.signInWithPassword({
    email: $("email").value,
    password: $("password").value
  });

  if (error) {
    $("loginMessage").textContent = error.message;
    return;
  }

  await loadSession(data.user);
});

// SESSION
async function loadSession(user) {
  currentUser = user;

  const { data: profile, error } = await client
    .from("profiles")
    .select("display_name,role,section")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    $("loginMessage").textContent =
      "Your profile is not configured. Ask the administrator.";
    await client.auth.signOut();
    return;
  }

  currentProfile = profile;

  $("loginPanel").hidden = true;
  $("dashboard").hidden = false;

  $("userRole").textContent =
    `Signed in as ${profile.display_name || user.email} · ${profile.role.replaceAll("_", " ")}`;

  $("roleStat").textContent = profile.role.replaceAll("_", " ");

  await loadArticles();
}

// PERMISSIONS
function canReview() {
  return ["admin", "editor_in_chief", "section_editor"]
    .includes(currentProfile?.role);
}

// HTML ESCAPE
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// ARTICLE LIST
async function loadArticles() {
  $("articleList").innerHTML =
    "<p class='muted'>Loading…</p>";

  const { data, error } = await client
    .from("articles")
    .select("id,title,title_fil,category,status,excerpt,body,body_fil,created_at,author_id,author_name,image_url,published_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    $("articleList").innerHTML =
      `<p class="message">${escapeHtml(error.message)}</p>`;
    return;
  }

  articles = data || [];
  $("countStat").textContent = articles.length;

  $("articleList").innerHTML = articles.length
    ? articles.map(article => `
      <article class="article-item">

        ${article.image_url ? `
          <img
            src="${escapeHtml(article.image_url)}"
            alt="Article cover"
            style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-bottom:10px;"
          >
        ` : ""}

        <h3>${escapeHtml(article.title)}</h3>

        <p>
          ${escapeHtml(article.category)}
          · ${escapeHtml(article.status.replaceAll("_", " "))}
        </p>

        <p>Author: ${escapeHtml(article.author_name || "Not specified")}</p>

        <p>${escapeHtml((article.excerpt || "").slice(0, 130))}</p>

        <div class="item-actions">
          <button data-edit="${escapeHtml(article.id)}">Edit</button>

          ${canReview() && article.status !== "published"
            ? `<button data-review="${escapeHtml(article.id)}">Approve & publish</button>`
            : ""}

          <button class="danger" data-delete="${escapeHtml(article.id)}">
            Delete
          </button>
        </div>
      </article>
    `).join("")
    : "<p class='muted'>No articles yet. Create your first article.</p>";

  $("articleList").querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => editArticle(button.dataset.edit);
  });

  $("articleList").querySelectorAll("[data-review]").forEach(button => {
    button.onclick = () => publishArticle(button.dataset.review);
  });

  $("articleList").querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = () => deleteArticle(button.dataset.delete);
  });
}

// IMAGE PREVIEW
$("articleImage").addEventListener("change", () => {
  const file = $("articleImage").files[0];

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  if (!file) {
    $("imagePreview").hidden = !currentImageUrl;

    if (currentImageUrl) {
      $("imagePreview").src = currentImageUrl;
    }
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please select a JPG, PNG, or WebP image.");
    $("articleImage").value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image must not exceed 5 MB.");
    $("articleImage").value = "";
    return;
  }

  previewObjectUrl = URL.createObjectURL(file);
  $("imagePreview").src = previewObjectUrl;
  $("imagePreview").hidden = false;
});

// UPLOAD IMAGE
async function uploadArticleImage(file) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported image format.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must not exceed 5 MB.");
  }

  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extension = extensions[file.type];
  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const filePath = `covers/${uniqueName}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;

  const { data } = client.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// EDIT ARTICLE
function editArticle(id) {
  const article = articles.find(item => item.id === id);
  if (!article) return;

  $("articleId").value = article.id;
  $("articleTitle").value = article.title;
  $("articleTitleFil").value = article.title_fil || "";
  $("articleCategory").value = article.category;
  $("articleStatus").value =
    article.status === "published" ? "for_review" : article.status;

  $("articleExcerpt").value = article.excerpt || "";
  $("articleBody").value = article.body || "";
  $("articleBodyFil").value = article.body_fil || "";

  $("authorName").value = article.author_name || "";

  $("articleImage").value = "";

  currentImageUrl = article.image_url || null;

  if (currentImageUrl) {
    $("imagePreview").src = currentImageUrl;
    $("imagePreview").hidden = false;
  } else {
    $("imagePreview").hidden = true;
    $("imagePreview").removeAttribute("src");
  }

  $("formHeading").textContent = "Edit article";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// SAVE ARTICLE
$("articleForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!client || !currentUser) return;

  const id = $("articleId").value;
  const file = $("articleImage").files[0];

  $("formMessage").textContent = "Saving article…";

  try {
    let imageUrl = currentImageUrl;

    if (file) {
      $("formMessage").textContent = "Uploading cover photo…";
      imageUrl = await uploadArticleImage(file);
    }

    const payload = {
      title: $("articleTitle").value.trim(),
      title_fil: $("articleTitleFil").value.trim() || null,
      category: $("articleCategory").value,
      status: $("articleStatus").value,
      excerpt: $("articleExcerpt").value.trim(),
      body: $("articleBody").value.trim(),
      body_fil: $("articleBodyFil").value.trim() || null,
      author_name: $("authorName").value.trim() || null,
      image_url: imageUrl
    };

    $("formMessage").textContent = "Saving article details…";

    let result;

    if (id) {
      result = await client
        .from("articles")
        .update(payload)
        .eq("id", id);
    } else {
      result = await client
        .from("articles")
        .insert({
          ...payload,
          author_id: currentUser.id
        });
    }

    if (result.error) throw result.error;

    $("formMessage").textContent =
      "Article saved successfully.";

    clearForm(false);
    await loadArticles();

  } catch (error) {
    console.error("SIRAYAT save error:", error);

    $("formMessage").textContent =
      "Error: " + error.message;
  }
});

// CLEAR FORM
function clearForm(clearMessage = true) {
  $("articleForm").reset();
  $("articleId").value = "";
  $("formHeading").textContent = "Create an article";

  currentImageUrl = null;

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  $("imagePreview").hidden = true;
  $("imagePreview").removeAttribute("src");

  if (clearMessage) {
    $("formMessage").textContent = "";
  }
}

$("clearBtn").onclick = () => clearForm();

$("refreshBtn").onclick = loadArticles;

// PUBLISH ARTICLE
async function publishArticle(id) {
  if (!canReview()) return;

  if (!confirm("Publish this article to the public website?")) {
    return;
  }

  const { error } = await client
    .from("articles")
    .update({
      status: "published",
      published_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
  } else {
    await loadArticles();
  }
}

// DELETE ARTICLE
async function deleteArticle(id) {
  if (!confirm("Delete this article? This cannot be undone.")) {
    return;
  }

  const { error } = await client
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
  } else {
    await loadArticles();
  }
}

// LOGOUT
$("logoutBtn").onclick = async () => {
  await client.auth.signOut();

  currentUser = null;
  currentProfile = null;

  $("dashboard").hidden = true;
  $("loginPanel").hidden = false;
};

// AUTH STATE
client?.auth.onAuthStateChange((_event, session) => {
  if (session?.user && !currentUser) {
    loadSession(session.user);
  }
});
