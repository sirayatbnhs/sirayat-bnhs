
// SIRAYAT Public Homepage - Supabase Integration

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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(
    language === "en" ? "en-US" : "fil-PH",
    { year: "numeric", month: "long", day: "numeric" }
  );
}

function getTitle(story) {
  return language === "en"
    ? story.title
    : (story.title_fil || story.title);
}

function getExcerpt(story) {
  return language === "en"
    ? story.excerpt
    : (story.excerpt_fil || story.excerpt);
}

function getBody(story) {
  return language === "en"
    ? story.body
    : (story.body_fil || story.body);
}

function render() {
  const filtered = stories.filter(story => {
    const matchesCategory =
      activeSection === "all" || story.category === activeSection;

    const searchable = [
      story.title,
      story.title_fil,
      story.excerpt,
      story.category
    ].join(" ").toLowerCase();

    return matchesCategory && searchable.includes(query.toLowerCase());
  });

  grid.innerHTML = filtered.map((story, index) => `
    <article class="story-card"
      data-id="${escapeHTML(story.id)}"
      tabindex="0"
      role="button"
      aria-label="Read ${escapeHTML(story.title)}">

      <div class="story-thumb tone-${(index % 3) + 1}">
        ${escapeHTML(labels[story.category] || story.category)}
      </div>

      <div class="story-body">
        <div class="story-category">
          ${escapeHTML(
            language === "en"
              ? (labels[story.category] || story.category)
              : (labelsFil[story.category] || story.category)
          )}
        </div>

        <h3>${escapeHTML(getTitle(story))}</h3>
        <p>${escapeHTML(getExcerpt(story))}</p>

        <div class="story-meta">
          <span>SIRAYAT</span>
          <span>${escapeHTML(formatDate(story.published_at || story.created_at))}</span>
        </div>
      </div>
    </article>
  `).join("");

  empty.hidden = filtered.length !== 0;

  grid.querySelectorAll(".story-card").forEach(card => {
    const open = () => openStory(card.dataset.id);

    card.addEventListener("click", open);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function openStory(id) {
  const story = stories.find(item => String(item.id) === String(id));
  if (!story) return;

  const safeBody = escapeHTML(getBody(story)).replace(/\n/g, "<br>");

  document.getElementById("dialogContent").innerHTML = `
    <div class="dialog-inner">
      <div class="story-category">
        ${escapeHTML(
          language === "en"
            ? (labels[story.category] || story.category)
            : (labelsFil[story.category] || story.category)
        )}
        · ${escapeHTML(formatDate(story.published_at || story.created_at))}
      </div>

      <h2>${escapeHTML(getTitle(story))}</h2>
      <p><strong>SIRAYAT Editorial Team</strong></p>
      <p>${safeBody}</p>
      <p class="story-meta">SIRAYAT · BUTIG NATIONAL HIGH SCHOOL</p>
    </div>
  `;

  dialog.showModal();
}

async function loadPublishedArticles() {
  grid.innerHTML = "<p>Loading articles...</p>";

  const { data, error } = await client
    .from("articles")
    .select("id,title,title_fil,category,excerpt,body,body_fil,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("SIRAYAT Supabase error:", error);
    grid.innerHTML = "<p>Unable to load articles. Please try again later.</p>";
    empty.hidden = true;
    return;
  }

  stories = data || [];
  render();
}

document.getElementById("closeDialog")
  .addEventListener("click", () => dialog.close());

dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");
    activeSection = button.dataset.section;

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

document.getElementById("searchForm")
  .addEventListener("submit", event => {
    event.preventDefault();
    query = document.getElementById("searchInput").value.trim();
    render();
    document.getElementById("latestSection").scrollIntoView();
  });

document.getElementById("exploreBtn")
  .addEventListener("click", () => {
    document.getElementById("latestSection").scrollIntoView();
  });

document.getElementById("menuToggle")
  .addEventListener("click", () => {
    document.getElementById("navItems").classList.toggle("open");
  });

document.getElementById("langToggle")
  .addEventListener("click", () => {
    language = language === "en" ? "fil" : "en";

    document.getElementById("langToggle").textContent =
      language === "en" ? "FILIPINO" : "ENGLISH";

    document.querySelectorAll("[data-en][data-fil]").forEach(element => {
      element.textContent = element.dataset[language];
    });

    document.getElementById("searchInput").placeholder =
      language === "en"
        ? "Search stories..."
        : "Maghanap ng mga artikulo...";

    render();
  });

document.getElementById("dateLine").textContent =
  "BUTIG NATIONAL HIGH SCHOOL · SCHOOL PUBLICATION";

loadPublishedArticles();
