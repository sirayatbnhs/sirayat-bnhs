
const SUPABASE_URL = "https://elidsfdxjowuvpqmzefq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vD4mcf115FSQj-yVkBDi9g_ayxo5Q57";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let stories = [];
let language = "en";
let activeSection = "all";
let query = "";

const grid = document.getElementById("storyGrid");
const empty = document.getElementById("emptyState");
const dialog = document.getElementById("articleDialog");

const labels = {
  News: "NEWS",
  Editorial: "EDITORIAL",
  Feature: "FEATURE",
  Sports: "SPORTS",
  "Science & Technology": "SCIENCE & TECHNOLOGY",
  Literary: "LITERARY",
  Photojournalism: "PHOTOJOURNALISM"
};

const labelsFil = {
  News: "BALITA",
  Editorial: "EDITORYAL",
  Feature: "LATHALAIN",
  Sports: "PALAKASAN",
  "Science & Technology": "AGHAM AT TEKNOLOHIYA",
  Literary: "PANITIKAN",
  Photojournalism: "PAMAMAHAYAG SA LARAWAN"
};

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function articleTitle(a) {
  return language === "en"
    ? a.title
    : (a.title_fil || a.title);
}

function articleBody(a) {
  return language === "en"
    ? a.body
    : (a.body_fil || a.body);
}

function categoryName(category) {
  return language === "en"
    ? (labels[category] || category)
    : (labelsFil[category] || category);
}

function articleDate(a) {
  const date = a.published_at || a.created_at;
  if (!date) return "";

  return new Date(date).toLocaleDateString(
    language === "en" ? "en-US" : "fil-PH",
    { year: "numeric", month: "long", day: "numeric" }
  );
}

function render() {
  const filtered = stories.filter(a => {
    const matchesCategory =
      activeSection === "all" ||
      a.category === activeSection;

    const searchable = [
      a.title,
      a.title_fil,
      a.excerpt,
      a.category,
      a.author_name
    ].join(" ").toLowerCase();

    return matchesCategory &&
      searchable.includes(query.toLowerCase());
  });

  grid.innerHTML = filtered.map((a, i) => `
    <article class="story-card"
      data-id="${safe(a.id)}"
      tabindex="0"
      role="button"
      aria-label="Read ${safe(articleTitle(a))}">

      ${a.image_url
        ? `<img
            src="${safe(a.image_url)}"
            alt="${safe(articleTitle(a))}"
            loading="lazy"
            style="width:100%;height:210px;object-fit:cover;display:block;"
          >`
        : `<div class="story-thumb tone-${(i % 3) + 1}">
            ${safe(categoryName(a.category))}
          </div>`
      }

      <div class="story-body">
        <div class="story-category">
          ${safe(categoryName(a.category))}
        </div>

        <h3>${safe(articleTitle(a))}</h3>

        <p>${safe(a.excerpt || "")}</p>

        <div class="story-meta">
          <span>${safe(a.author_name || "SIRAYAT Editorial Team")}</span>
          <span>${safe(articleDate(a))}</span>
        </div>
      </div>
    </article>
  `).join("");

  empty.hidden = filtered.length !== 0;

  if (filtered.length === 0) {
    empty.textContent = language === "en"
      ? "No published stories found."
      : "Walang nailathalang artikulo.";
  }

  grid.querySelectorAll(".story-card").forEach(card => {
    const open = () => openStory(card.dataset.id);

    card.addEventListener("click", open);

    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function openStory(id) {
  const a = stories.find(item => String(item.id) === String(id));
  if (!a) return;

  const body = safe(articleBody(a)).replace(/\n/g, "<br>");

  document.getElementById("dialogContent").innerHTML = `
    <div class="dialog-inner">

      ${a.image_url
        ? `<img
            src="${safe(a.image_url)}"
            alt="${safe(articleTitle(a))}"
            style="width:100%;max-height:420px;object-fit:cover;margin-bottom:20px;border-radius:6px;"
          >`
        : ""
      }

      <div class="story-category">
        ${safe(categoryName(a.category))}
        · ${safe(articleDate(a))}
      </div>

      <h2>${safe(articleTitle(a))}</h2>

      <p><strong>${safe(a.author_name || "SIRAYAT Editorial Team")}</strong></p>

      <p>${body}</p>

      <p class="story-meta">
        SIRAYAT · BUTIG NATIONAL HIGH SCHOOL
      </p>
    </div>
  `;

  dialog.showModal();
}

async function loadPublishedArticles() {
  grid.innerHTML = "<p>Loading published stories...</p>";

  const { data, error } = await client
    .from("articles")
    .select("id,title,title_fil,category,excerpt,body,body_fil,author_name,image_url,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("SIRAYAT article loading error:", error);
    grid.innerHTML =
      "<p>Unable to load stories. Please try again later.</p>";
    empty.hidden = true;
    return;
  }

  stories = data || [];
  render();
}

// CLOSE ARTICLE
document.getElementById("closeDialog")
  .addEventListener("click", () => dialog.close());

dialog.addEventListener("click", e => {
  if (e.target === dialog) dialog.close();
});

// CATEGORY NAVIGATION
document.querySelectorAll(".nav-link").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-link")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    activeSection = btn.dataset.section;

    if (activeSection === "About") {
      document.getElementById("aboutSection").scrollIntoView();
      activeSection = "all";
    } else {
      document.getElementById("latestSection").scrollIntoView();
    }

    render();
    document.getElementById("navItems").classList.remove("open");
  });
});

// SEARCH
document.getElementById("searchForm")
  .addEventListener("submit", e => {
    e.preventDefault();
    query = document.getElementById("searchInput").value.trim();
    render();
    document.getElementById("latestSection").scrollIntoView();
  });

// EXPLORE BUTTON
document.getElementById("exploreBtn")
  .addEventListener("click", () => {
    document.getElementById("latestSection").scrollIntoView();
  });

// MOBILE MENU
document.getElementById("menuToggle")
  .addEventListener("click", () => {
    document.getElementById("navItems").classList.toggle("open");
  });

// LANGUAGE TOGGLE
document.getElementById("langToggle")
  .addEventListener("click", () => {
    language = language === "en" ? "fil" : "en";

    document.getElementById("langToggle").textContent =
      language === "en" ? "FILIPINO" : "ENGLISH";

    document.querySelectorAll("[data-en][data-fil]")
      .forEach(el => {
        el.textContent = el.dataset[language];
      });

    document.getElementById("searchInput").placeholder =
      language === "en"
        ? "Search stories..."
        : "Maghanap ng mga artikulo...";

    render();
  });

document.getElementById("dateLine").textContent =
  "BUTIG NATIONAL HIGH SCHOOL · SCHOOL PUBLICATION";

// START
loadPublishedArticles();
