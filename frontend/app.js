const API_BASE = "http://localhost:3001/api";

const PAGE_SIZE = 20; // fixed number of cards shown per click, regardless of how many sources answered

let currentQuery = "";
let currentCategory = "";
let currentPage = 1; // backend page: each connector's own next batch of up to 12 items
let subPage = 0; // client-side slice within the current backend page's combined pool
let displayPage = 1; // page number shown to the user; advances by 1 per click regardless of the above
let jumpToEnd = false; // set before going Precedente across a backend-page boundary
let resultPool = []; // full combined item pool fetched for the current backend page
let currentItems = [];
let expandCache = {}; // tag -> {expandedTerms, relatedTags} from /graph/expand
let pendingNavigation = null; // {from, relation} set right before a graph-driven search

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    currentPage = 1;
    subPage = 0;
    displayPage = 1;
    if (currentQuery) runSearch();
  });
});

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("query-input").value.trim();
  if (!q) return;
  currentQuery = q;
  currentPage = 1;
  subPage = 0;
  displayPage = 1;
  runSearch();
});

// Safe search preference persists across visits, default on
const safeCheckbox = document.getElementById("safe-checkbox");
const storedSafe = localStorage.getItem("safeSearch");
safeCheckbox.checked = storedSafe === null ? true : storedSafe === "true";
safeCheckbox.addEventListener("change", () => {
  localStorage.setItem("safeSearch", String(safeCheckbox.checked));
  currentPage = 1;
  subPage = 0;
  displayPage = 1;
  if (currentQuery) runSearch();
});

// Runs a search against the API and renders meta info + results
async function runSearch() {
  setStatus("Searching across sources…");
  clearResults();

  const expand = document.getElementById("expand-checkbox").checked;
  const safe = safeCheckbox.checked;
  const nav = pendingNavigation;
  pendingNavigation = null; // only applies to this one search
  let url = `${API_BASE}/search?q=${encodeURIComponent(currentQuery)}&expand=${expand}&safe=${safe}&page=${currentPage}`;
  if (currentCategory) url += `&category=${currentCategory}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    currentItems = data.items;
    resultPool = data.items;
    if (jumpToEnd) {
      subPage = Math.max(0, Math.ceil(resultPool.length / PAGE_SIZE) - 1);
      jumpToEnd = false;
    } else {
      subPage = 0;
    }

    renderMeta(data);
    renderGraph(data.knowledgeGraph, data.query);
    renderResultsSlice();

    if (data.blockedQuery) {
      setStatus("Questa ricerca è bloccata dalla Safe Search. Disattivala per procedere comunque.");
    } else {
      setStatus(data.items.length === 0 ? "No results found." : "");
    }

    // Only a fresh page-1 search advances the trail — paging back and forth
    // through the same query shouldn't spam the session's knowledge path.
    // A blocked query never actually ran, so it doesn't belong in the trail.
    if (currentPage === 1 && !data.blockedQuery) {
      renderTrail(appendToTrail(data.query, data.totalItems, nav));
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

// --- Knowledge Trail ---
// A locally-persisted record of every distinct query explored in this browser,
// with a link back to whichever query/relation led here (if reached via the graph
// rather than typed fresh). This is what survives across searches and page reloads,
// unlike the per-query Knowledge Map above which resets every time.
const TRAIL_KEY = "coknoTrail";
const TRAIL_MAX = 30;

function loadTrail() {
  try {
    return JSON.parse(localStorage.getItem(TRAIL_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTrail(trail) {
  localStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-TRAIL_MAX)));
}

function appendToTrail(query, totalItems, nav) {
  const trail = loadTrail();
  const last = trail[trail.length - 1];
  if (last && last.query.toLowerCase() === query.toLowerCase()) return trail; // no consecutive dupes
  trail.push({
    query,
    totalItems,
    cameFrom: nav?.from ?? null,
    relation: nav?.relation ?? null,
    timestamp: Date.now(),
  });
  saveTrail(trail);
  return trail;
}

function renderTrail(trail) {
  const section = document.getElementById("trail-section");
  const path = document.getElementById("trail-path");

  if (!trail.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  path.innerHTML = "";

  trail.forEach((entry, i) => {
    const prev = trail[i - 1];
    const isContinuation = prev && entry.cameFrom && entry.cameFrom.toLowerCase() === prev.query.toLowerCase();

    if (i > 0) {
      const connector = document.createElement("span");
      connector.className = isContinuation ? `trail-connector rel-${entry.relation}` : "trail-connector trail-break";
      connector.textContent = isContinuation ? `→ ${entry.relation}` : "•";
      path.appendChild(connector);
    }

    const chip = document.createElement("button");
    chip.className = "trail-chip";
    chip.innerHTML = `${escapeHtml(entry.query)} <span class="node-count">${entry.totalItems}</span>`;
    chip.title = new Date(entry.timestamp).toLocaleString();
    chip.addEventListener("click", () => searchTag(entry.query));
    path.appendChild(chip);
  });
}

document.getElementById("trail-clear").addEventListener("click", () => {
  localStorage.removeItem(TRAIL_KEY);
  renderTrail([]);
});

// Renders exactly PAGE_SIZE cards from the already-fetched pool, so clicking through
// pages feels uniform instead of jumping by however many items the sources happened
// to return. Only once the pool itself is exhausted does "next" reach out to the
// backend for each connector's own next batch.
function renderResultsSlice() {
  const start = subPage * PAGE_SIZE;
  const slice = resultPool.slice(start, start + PAGE_SIZE);
  renderResults(slice, currentCategory);
  renderPaginationControls();
}

function renderPaginationControls() {
  const el = document.getElementById("pagination");
  const totalLocalPages = Math.max(1, Math.ceil(resultPool.length / PAGE_SIZE));
  const isFirst = subPage === 0 && currentPage === 1;
  const isLastLocalChunk = subPage >= totalLocalPages - 1;
  const canGoNext = !isLastLocalChunk || resultPool.length > 0;

  if (isFirst && resultPool.length === 0) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }

  el.classList.remove("hidden");
  el.innerHTML = `
    <button class="page-btn" id="page-prev" ${isFirst ? "disabled" : ""}>‹ Precedente</button>
    <span class="page-btn active">${displayPage}</span>
    <button class="page-btn" id="page-next" ${canGoNext ? "" : "disabled"}>Successiva ›</button>
  `;

  document.getElementById("page-prev").addEventListener("click", goPrevPage);
  document.getElementById("page-next").addEventListener("click", goNextPage);
}

function goNextPage() {
  const totalLocalPages = Math.max(1, Math.ceil(resultPool.length / PAGE_SIZE));
  displayPage++;
  if (subPage + 1 < totalLocalPages) {
    subPage++;
    renderResultsSlice();
  } else {
    currentPage++;
    runSearch();
  }
  document.getElementById("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function goPrevPage() {
  if (displayPage <= 1) return;
  displayPage--;
  if (subPage > 0) {
    subPage--;
    renderResultsSlice();
  } else if (currentPage > 1) {
    currentPage--;
    jumpToEnd = true;
    runSearch();
  }
  document.getElementById("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Renders result count, per-source badges and related-tag chips
function renderMeta(data) {
  document.getElementById("meta-section").classList.remove("hidden");

  let info = `<strong>${data.totalItems}</strong> results for <strong>"${data.query}"</strong>`;
  if (data.expandedQuery) info += ` → expanded: <strong>"${data.expandedQuery}"</strong>`;
  document.getElementById("query-info").innerHTML = info;

  const badges = document.getElementById("source-badges");
  badges.innerHTML = "";
  (data.sources ?? []).forEach(({ source, count, error }) => {
    const b = document.createElement("span");
    b.className = "source-badge" + (error ? " source-error" : "");
    b.textContent = error ? `${source} ✕` : `${source} (${count})`;
    b.title = error || "";
    badges.appendChild(b);
  });

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
      chip.addEventListener("click", () => searchTag(tag, data.query, relation));
      related.appendChild(chip);
    });
  }
}

// Sets the query box to a tag and re-runs the search. When reached via a graph node
// or related-tag chip, fromQuery/relation record that link for the knowledge trail.
function searchTag(tag, fromQuery, relation) {
  document.getElementById("query-input").value = tag;
  currentQuery = tag;
  currentPage = 1;
  subPage = 0;
  displayPage = 1;
  pendingNavigation = fromQuery ? { from: fromQuery, relation } : null;
  runSearch();
}

// --- Knowledge Map ---
// Renders a query-centered graph (root = current query, branches = live ConceptNet
// relations) plus a "grado di conoscenza" coverage indicator for this search.
function renderGraph(graph, query) {
  const section = document.getElementById("graph-section");
  const canvas = document.getElementById("graph-canvas");
  const edgesSvg = document.getElementById("graph-edges");
  const coverageBadge = document.getElementById("coverage-badge");
  const detail = document.getElementById("graph-detail");

  expandCache = {};
  detail.classList.add("hidden");
  detail.innerHTML = "";

  if (!graph || !graph.nodes?.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const { coveragePercent, sourcesWithResults, sourcesQueried, categories } = graph.coverage;
  coverageBadge.innerHTML = `
    <span class="coverage-label">Grado di conoscenza</span>
    <div class="coverage-bar"><div class="coverage-fill" style="width:${coveragePercent}%"></div></div>
    <span class="coverage-value">${coveragePercent}% · ${sourcesWithResults}/${sourcesQueried} fonti · ${categories.length} categorie</span>
  `;

  canvas.querySelectorAll(".graph-node").forEach((n) => n.remove());
  edgesSvg.innerHTML = "";

  const root = graph.nodes.find((n) => n.relation === "root");
  const related = graph.nodes.filter((n) => n.relation !== "root");

  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 320;
  edgesSvg.setAttribute("width", width);
  edgesSvg.setAttribute("height", height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  canvas.appendChild(makeGraphNode(root, centerX, centerY, query));

  related.forEach((node, i) => {
    const angle = (i / Math.max(related.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centerX);
    line.setAttribute("y1", centerY);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("class", `graph-edge rel-${node.relation}`);
    edgesSvg.appendChild(line);

    canvas.appendChild(makeGraphNode(node, x, y, query));
  });
}

function makeGraphNode(node, x, y, rootQuery) {
  const el = document.createElement("button");
  el.className = `graph-node rel-${node.relation}`;
  if (node.relation !== "root" && node.matchCount === 0) el.classList.add("no-match");
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = node.relation === "root"
    ? escapeHtml(node.label)
    : `${escapeHtml(node.label)}${node.matchCount > 0 ? ` <span class="node-count">${node.matchCount}</span>` : ""}`;
  el.title = node.relation === "root"
    ? "Query corrente"
    : `${node.relation} — ${node.matchCount} risultat${node.matchCount === 1 ? "o" : "i"} corrente${node.matchCount === 1 ? "" : "i"}`;

  if (node.relation === "root") {
    el.classList.add("root");
  } else {
    el.addEventListener("click", () => {
      const wasSelected = el.classList.contains("selected");
      document.querySelectorAll(".graph-node").forEach((n) => n.classList.remove("selected"));
      clearHighlights();
      if (wasSelected) {
        document.getElementById("graph-detail").classList.add("hidden");
        return;
      }
      el.classList.add("selected");
      highlightMatches(node.matchedIds);
      showGraphDetail(node, rootQuery);
    });
  }
  return el;
}

// Dims every result card except the ones a graph node actually matches, and scrolls
// the first match into view — this is what ties the graph to the results already on screen.
function highlightMatches(matchedIds) {
  const ids = new Set(matchedIds ?? []);
  const cards = document.querySelectorAll(".result-card");
  if (ids.size === 0) {
    cards.forEach((c) => c.classList.remove("dimmed", "matched"));
    return;
  }
  let firstMatch = null;
  cards.forEach((c) => {
    const isMatch = ids.has(c.dataset.itemId);
    c.classList.toggle("matched", isMatch);
    c.classList.toggle("dimmed", !isMatch);
    if (isMatch && !firstMatch) firstMatch = c;
  });
  firstMatch?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearHighlights() {
  document.querySelectorAll(".result-card").forEach((c) => c.classList.remove("dimmed", "matched"));
}

// Clicking a node shows its own relations (fetched lazily) without leaving the current search
async function showGraphDetail(node, rootQuery) {
  const detail = document.getElementById("graph-detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `<p class="graph-detail-loading">Caricamento relazioni per "${escapeHtml(node.label)}"…</p>`;

  let data = expandCache[node.label];
  if (!data) {
    try {
      const res = await fetch(`${API_BASE}/graph/expand?tag=${encodeURIComponent(node.label)}`);
      data = await res.json();
      expandCache[node.label] = data;
    } catch {
      data = { relatedTags: [] };
    }
  }

  const relTags = (data.relatedTags ?? []).filter((t) => t.tag !== rootQuery.toLowerCase());
  const chips = relTags.length
    ? relTags.map(
        (t) => `<button class="tag-chip ${t.relation}" data-tag="${escapeHtml(t.tag)}" data-relation="${t.relation}" title="${t.relation}">${escapeHtml(t.tag)}</button>`
      ).join("")
    : `<span class="graph-detail-empty">Nessuna relazione ulteriore trovata.</span>`;

  const matchInfo = node.matchCount > 0
    ? `<span class="match-info match-yes">Presente in ${node.matchCount} risultat${node.matchCount === 1 ? "o" : "i"} di questa ricerca</span>`
    : `<span class="match-info match-no">Nessun risultato attuale è taggato con questo termine</span>`;

  detail.innerHTML = `
    <div class="graph-detail-header">
      <strong>${escapeHtml(node.label)}</strong>
      <span class="rel-badge rel-${node.relation}">${node.relation === "root" ? "query" : node.relation} rispetto a "${escapeHtml(rootQuery)}"</span>
      <button class="graph-detail-search" data-tag="${escapeHtml(node.label)}">Cerca «${escapeHtml(node.label)}»</button>
    </div>
    <div class="graph-detail-match">${matchInfo}</div>
    <div class="graph-detail-relations">${chips}</div>
  `;

  detail.querySelector(".graph-detail-search")?.addEventListener("click", () => {
    searchTag(node.label, rootQuery, node.relation);
  });
  detail.querySelectorAll(".graph-detail-relations .tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => searchTag(chip.dataset.tag, node.label, chip.dataset.relation));
  });
}

// Renders the result grid, using a text-specific layout for the texts category
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
    card.dataset.itemId = item.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const hasThumbnail = item.thumbnailUrl;
    const tagsHtml = (item.tags ?? []).slice(0, 3).map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join("");
    const sourceBadge = `<span class="card-source">${escapeHtml(item.source)}</span>`;

    if (item.category === "texts") {
      card.innerHTML = `
        <div class="card-body">
          ${sourceBadge}
          <p class="card-title card-title-link">${escapeHtml(item.title)}</p>
          ${item.description ? `<p class="card-desc">${escapeHtml(item.description.slice(0, 180))}…</p>` : ""}
          ${item.author ? `<p class="card-author">${escapeHtml(item.author)}</p>` : ""}
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-thumb">
          ${hasThumbnail
            ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}" loading="lazy" />`
            : `<div class="no-thumb">${escapeHtml(item.category)}</div>`}
        </div>
        <div class="card-body">
          ${sourceBadge}
          <p class="card-title">${escapeHtml(item.title)}</p>
          ${item.author ? `<p class="card-author">${escapeHtml(item.author)}</p>` : ""}
          ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}
        </div>
      `;
    }

    // Clicking a card opens the in-app detail view rather than navigating away immediately
    card.addEventListener("click", () => openResultModal(item));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openResultModal(item);
      }
    });

    grid.appendChild(card);
  });
}

// --- Result detail modal ---
function openResultModal(item) {
  document.getElementById("modal-source").textContent = item.source;
  document.getElementById("modal-title").textContent = item.title;

  const authorEl = document.getElementById("modal-author");
  authorEl.textContent = item.author || "";
  authorEl.style.display = item.author ? "block" : "none";

  const descEl = document.getElementById("modal-desc");
  descEl.textContent = item.description || "";
  descEl.style.display = item.description ? "block" : "none";

  document.getElementById("modal-open-link").href = item.url;

  const media = document.getElementById("modal-media");
  media.innerHTML = item.thumbnailUrl
    ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}" />`
    : "";
  media.style.display = item.thumbnailUrl ? "block" : "none";

  const tagsEl = document.getElementById("modal-tags");
  tagsEl.innerHTML = (item.tags ?? []).map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join("");

  renderModalRelated(item);

  document.getElementById("result-modal").classList.remove("hidden");
}

// Surfaces other results from the same search that share at least one tag —
// this is what turns a click from "leave the site" into "keep exploring the knowledge".
function renderModalRelated(item) {
  const relatedSection = document.getElementById("modal-related");
  const relatedGrid = document.getElementById("modal-related-grid");

  const related = (item.tags?.length ? currentItems : []).filter(
    (other) => other !== item && other.tags?.some((t) => item.tags.includes(t))
  );

  if (!related.length) {
    relatedSection.classList.add("hidden");
    return;
  }

  relatedSection.classList.remove("hidden");
  relatedGrid.innerHTML = "";
  related.slice(0, 6).forEach((r) => {
    const mini = document.createElement("div");
    mini.className = "modal-related-item";
    mini.title = r.title;
    mini.innerHTML = r.thumbnailUrl
      ? `<img src="${r.thumbnailUrl}" alt="${escapeHtml(r.title)}" />`
      : `<div class="no-thumb small">${escapeHtml(r.category)}</div>`;
    mini.addEventListener("click", () => openResultModal(r));
    relatedGrid.appendChild(mini);
  });
}

function closeModal() {
  document.getElementById("result-modal").classList.add("hidden");
}

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function setStatus(msg) { document.getElementById("status-message").textContent = msg; }
function clearResults() {
  document.getElementById("results-grid").innerHTML = "";
  document.getElementById("graph-section").classList.add("hidden");
  document.getElementById("pagination").classList.add("hidden");
}
function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Show whatever was already explored in previous visits/searches, before any new search runs
renderTrail(loadTrail());
