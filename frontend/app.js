const API_BASE = "http://localhost:3001/api";

let currentQuery = "";
let currentCategory = "";

// --- Category tabs ---

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    if (currentQuery) runSearch();
  });
});

// --- Search ---

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("query-input").value.trim();
  if (!q) return;
  currentQuery = q;
  runSearch();
});

async function runSearch() {
  setStatus("Searching across sources…");
  clearResults();

  const expand = document.getElementById("expand-checkbox").checked;
  let url = `${API_BASE}/search?q=${encodeURIComponent(currentQuery)}&expand=${expand}`;
  if (currentCategory) url += `&category=${currentCategory}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    renderMeta(data);
    renderResults(data.items, currentCategory);
    setStatus(data.items.length === 0 ? "No results found." : "");
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

function renderMeta(data) {
  document.getElementById("meta-section").classList.remove("hidden");

  let info = `<strong>${data.totalItems}</strong> results for <strong>"${data.query}"</strong>`;
  if (data.expandedQuery) info += ` → expanded: <strong>"${data.expandedQuery}"</strong>`;
  document.getElementById("query-info").innerHTML = info;

  // Source badges
  const badges = document.getElementById("source-badges");
  badges.innerHTML = "";
  (data.sources ?? []).forEach(({ source, count, error }) => {
    const b = document.createElement("span");
    b.className = "source-badge" + (error ? " source-error" : "");
    b.textContent = error ? `${source} ✕` : `${source} (${count})`;
    b.title = error || "";
    badges.appendChild(b);
  });

  // Related tags
  const related = document.getElementById("related-tags");
  related.innerHTML = "";
  if (data.relatedTags?.length) {
    const label = document.createElement("span");
    label.className = "related-label";
    label.textContent = "Related:";
    related.appendChild(label);
    data.relatedTags.forEach(({ tag, relation }) => {
      const chip = document.createElement("button");
      chip.className = `tag-chip ${relation}`;
      chip.textContent = tag;
      chip.title = relation;
      chip.addEventListener("click", () => {
        document.getElementById("query-input").value = tag;
        currentQuery = tag;
        runSearch();
      });
      related.appendChild(chip);
    });
  }
}

function renderResults(items, category) {
  const grid = document.getElementById("results-grid");
  grid.innerHTML = "";
  grid.className = "results-grid";

  if (category === "texts" || (!category && items.every((i) => i.category === "texts"))) {
    grid.classList.add("text-layout");
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = `result-card cat-${item.category}`;

    const hasThumbnail = item.thumbnailUrl;
    const tagsHtml = (item.tags ?? []).slice(0, 3).map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join("");
    const sourceBadge = `<span class="card-source">${escapeHtml(item.source)}</span>`;

    if (item.category === "texts") {
      card.innerHTML = `
        <div class="card-body">
          ${sourceBadge}
          <a class="card-title-link" href="${item.url}" target="_blank" rel="noopener">
            <p class="card-title">${escapeHtml(item.title)}</p>
          </a>
          ${item.description ? `<p class="card-desc">${escapeHtml(item.description.slice(0, 180))}…</p>` : ""}
          ${item.author ? `<p class="card-author">${escapeHtml(item.author)}</p>` : ""}
        </div>
      `;
    } else {
      card.innerHTML = `
        <a href="${item.url}" target="_blank" rel="noopener">
          ${hasThumbnail
            ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}" loading="lazy" />`
            : `<div class="no-thumb">${escapeHtml(item.category)}</div>`}
        </a>
        <div class="card-body">
          ${sourceBadge}
          <p class="card-title">${escapeHtml(item.title)}</p>
          ${item.author ? `<p class="card-author">${escapeHtml(item.author)}</p>` : ""}
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}
        </div>
      `;
    }
    grid.appendChild(card);
  });
}

// --- Knowledge Graph ---

async function loadGraph() {
  try {
    const res = await fetch(`${API_BASE}/graph`);
    renderGraphNodes(await res.json());
  } catch {}
}

function renderGraphNodes(nodes) {
  const container = document.getElementById("graph-nodes");
  container.innerHTML = "";
  nodes.forEach((node) => {
    const el = document.createElement("button");
    el.className = "graph-node";
    el.dataset.category = node.category;
    el.textContent = node.tag;
    el.addEventListener("click", () => {
      document.querySelectorAll(".graph-node").forEach((n) => n.classList.remove("active"));
      el.classList.add("active");
      renderGraphDetail(node);
    });
    container.appendChild(el);
  });
}

function renderGraphDetail(node) {
  const detail = document.getElementById("graph-detail");
  detail.classList.remove("hidden");
  document.getElementById("graph-detail-title").textContent = node.tag;
  const list = document.getElementById("graph-detail-relations");
  list.innerHTML = "";
  node.relations.forEach(({ type, target }) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="rel-badge rel-${type}">${type}</span>
      <button class="tag-chip ${type}" style="font-size:0.8rem">${target}</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      document.getElementById("query-input").value = target;
      currentQuery = target;
      runSearch();
    });
    list.appendChild(li);
  });
}

// --- Helpers ---

function setStatus(msg) { document.getElementById("status-message").textContent = msg; }
function clearResults() { document.getElementById("results-grid").innerHTML = ""; }
function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

loadGraph();
