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
let activeFilter = null; // {ids: Set<string>, label} when a graph node is narrowing the results list

let graphState = null; // { rootId, rootQuery, selectedId, nodesById: Map<id, node> }
const EXPAND_CHILD_CAP = 6; // new nodes added per "Espandi nel grafo" click
const GRAPH_NODE_CAP = 40; // total nodes across all levels before further expansion is blocked

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
    renderSpellingSuggestion(data.spellingSuggestion);
    renderDefinitions(data.definitions);
    renderGraph(data.knowledgeGraph, data.query);
    renderResultsSlice();

    if (data.blockedQuery) {
      setStatus("Questa ricerca è bloccata dalla Safe Search. Disattivala per procedere comunque.");
    } else {
      setStatus(data.items.length === 0 ? "No results found." : "");
    }

    // Only a fresh page-1, non-blocked search advances the trail
    if (currentPage === 1 && !data.blockedQuery) {
      renderTrail(appendToTrail(data.query, data.totalItems, nav));
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

// --- Knowledge Trail --- localStorage-persisted, survives searches/reloads unlike the graph below
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

// Slices PAGE_SIZE cards from the fetched pool; only exhausting the pool fetches a new backend page
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

  const sources = data.sources ?? []; // collapsed behind a <details>, up to 99 sources for "All"
  const withResults = sources.filter((s) => !s.error && s.count > 0).length;
  document.getElementById("source-summary").textContent =
    `${withResults}/${sources.length} fonti con risultati ▾`;

  const badges = document.getElementById("source-badges");
  badges.innerHTML = "";
  sources.forEach(({ source, count, error }) => {
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

// Shared with the concept modal so the two don't drift into inconsistent layouts
function definitionCardsHtml(definitions) {
  return definitions.map((d) => `
    <div class="definition-card">
      <div class="definition-source">${escapeHtml(d.source)}</div>
      <div class="definition-title">${escapeHtml(d.title)}</div>
      ${d.description ? `<p class="definition-text">${escapeHtml(d.description)}</p>` : ""}
      <a class="definition-link" href="${d.url}" target="_blank" rel="noopener">Apri su ${escapeHtml(d.source)} ↗</a>
    </div>
  `).join("");
}

function renderSpellingSuggestion(suggestion) {
  const el = document.getElementById("spelling-suggestion");
  if (!suggestion) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `Forse intendevi: <button class="spelling-suggestion-btn">${escapeHtml(suggestion)}</button>?`;
  el.querySelector(".spelling-suggestion-btn").addEventListener("click", () => searchTag(suggestion));
}

function renderDefinitions(definitions) {
  const section = document.getElementById("definitions-section");
  const list = document.getElementById("definitions-list");

  if (!definitions?.length) {
    section.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = definitionCardsHtml(definitions);
}

// fromQuery/relation record the trail link when reached via a graph node or tag chip
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
// Mirrors backend/textRelevance.ts, so nodes added by expanding a branch can compute their
// own match count against resultPool client-side, the same way the server does.
function sameStemJS(a, b) {
  const n = Math.min(a.length, b.length, 4);
  return n >= 3 && a.slice(0, n) === b.slice(0, n);
}
function wordsJS(text) {
  return (text ?? "").toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length > 2);
}
function textRelatesToQueryJS(text, query) {
  const textWords = wordsJS(text);
  const queryWords = wordsJS(query);
  return textWords.some((tw) => queryWords.some((qw) => sameStemJS(tw, qw)));
}
function itemsMatchingTagJS(items, tag) {
  const needle = tag.toLowerCase();
  return items.filter((item) => {
    if (item.tags?.some((t) => t.toLowerCase() === needle)) return true;
    const haystack = `${item.title} ${item.description ?? ""}`;
    return textRelatesToQueryJS(haystack, tag);
  });
}

// Entry point for a new search result: rebuilds graphState from scratch, discarding any
// branches expanded on a previous query
function renderGraph(graph, query) {
  const section = document.getElementById("graph-section");
  const coverageBadge = document.getElementById("coverage-badge");
  const detail = document.getElementById("graph-detail");

  expandCache = {};
  detail.classList.add("hidden");
  detail.innerHTML = "";

  if (!graph || !graph.nodes?.length) {
    section.classList.add("hidden");
    graphState = null;
    return;
  }
  section.classList.remove("hidden");

  // coveragePercent = content signal; availabilityPercent = infrastructure signal — kept
  // separate so a missing API key doesn't read as "topic isn't well documented"
  const { coveragePercent, sourcesWithResults, sourcesAvailable, sourcesQueried, availabilityPercent, categories } = graph.coverage;
  coverageBadge.innerHTML = `
    <span class="coverage-label">Grado di conoscenza</span>
    <div class="coverage-bar"><div class="coverage-fill" style="width:${coveragePercent}%"></div></div>
    <span class="coverage-value">${coveragePercent}% · ${sourcesWithResults}/${sourcesAvailable} fonti disponibili · ${categories.length} categorie</span>
    <span class="coverage-availability" title="Fonti configurate e raggiungibili in questa ricerca, a prescindere dal contenuto trovato">${sourcesAvailable}/${sourcesQueried} fonti raggiungibili (${availabilityPercent}%)</span>
  `;

  const rootData = graph.nodes.find((n) => n.relation === "root");
  const relatedData = graph.nodes.filter((n) => n.relation !== "root");

  const nodesById = new Map();
  nodesById.set(rootData.id, {
    id: rootData.id, label: rootData.label, relation: "root",
    matchCount: rootData.matchCount, matchedIds: rootData.matchedIds ?? [], frequency: rootData.frequency,
    parentId: null, depth: 0, expanded: true, children: relatedData.map((n) => n.id),
  });
  relatedData.forEach((n) => {
    nodesById.set(n.id, {
      id: n.id, label: n.label, relation: n.relation,
      matchCount: n.matchCount, matchedIds: n.matchedIds ?? [], frequency: n.frequency,
      parentId: rootData.id, depth: 1, expanded: false, children: [],
    });
  });

  graphState = { rootId: rootData.id, rootQuery: query, selectedId: null, nodesById };
  renderGraphDOM();
}

// Rebuilds the layout; each node's sector splits by a "pixel budget" weight so an
// expanded branch grows its own share instead of squeezing its siblings.
function renderGraphDOM() {
  const canvas = document.getElementById("graph-canvas"); // fixed-width scroll viewport
  const inner = document.getElementById("graph-inner"); // resized to the graph's real extent
  const edgesSvg = document.getElementById("graph-edges");
  inner.querySelectorAll(".graph-node").forEach((n) => n.remove());
  edgesSvg.innerHTML = "";

  if (!graphState) return;
  const root = graphState.nodesById.get(graphState.rootId);
  if (!root) return;

  const estimateNodeWidth = (node) => {
    const countWidth = node.matchCount > 0 ? 30 : 0;
    const freqWidth = node.frequency != null ? 34 : 0;
    return 34 + node.label.length * 7.2 + countWidth + freqWidth;
  };

  const GAP = 16;
  const nodeWeight = (node) => {
    const own = estimateNodeWidth(node) + GAP;
    if (!node.children.length) return own;
    const childrenTotal = node.children.reduce((sum, id) => {
      const c = graphState.nodesById.get(id);
      return sum + (c ? nodeWeight(c) : 0);
    }, 0);
    return Math.max(own, childrenTotal);
  };

  const width = canvas.clientWidth || 600;
  const MIN_STEP = 100; // never sit closer than this to the parent ring
  const minRadius = 130;

  // Coordinates relative to root at (0,0), radius never capped mid-layout — the canvas is
  // sized to the tree's actual extent afterward instead (see below), so nodes never compress
  root.angleStart = 0;
  root.angleEnd = 2 * Math.PI;
  root.radius = 0;
  root.relX = 0;
  root.relY = 0;

  (function layout(node) {
    const kids = node.children.map((id) => graphState.nodesById.get(id)).filter(Boolean);
    if (!kids.length) return;

    const span = node.angleEnd - node.angleStart;
    const weights = kids.map(nodeWeight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const rawStep = totalWeight / Math.max(span, 0.001);
    const step = node.depth === 0 ? Math.max(minRadius, rawStep) : Math.max(MIN_STEP, rawStep);
    const childRadius = node.radius + step;

    let cursor = node.angleStart;
    kids.forEach((child, i) => {
      const w = weights[i] / totalWeight;
      child.angleStart = cursor;
      child.angleEnd = cursor + span * w;
      cursor = child.angleEnd;
      child.angle = (child.angleStart + child.angleEnd) / 2 - Math.PI / 2; // start at 12 o'clock
      child.radius = childRadius;
      child.relX = childRadius * Math.cos(child.angle);
      child.relY = childRadius * Math.sin(child.angle);
      layout(child);
    });
  })(root);

  const all = [];
  (function collect(node) {
    all.push(node);
    node.children.forEach((id) => { const c = graphState.nodesById.get(id); if (c) collect(c); });
  })(root);

  // #graph-inner grows to the tree's natural extent; #graph-canvas scrolls horizontally
  // when that exceeds its own fixed width (see CSS)
  const maxAbsX = Math.max(width / 2 - 40, ...all.map((n) => Math.abs(n.relX)));
  const maxAbsY = Math.max(minRadius, ...all.map((n) => Math.abs(n.relY)));
  const innerWidth = Math.round(maxAbsX * 2 + 80);
  const innerHeight = Math.round(maxAbsY * 2 + 90);

  canvas.style.height = `${innerHeight}px`;
  inner.style.width = `${innerWidth}px`;
  inner.style.height = `${innerHeight}px`;
  edgesSvg.setAttribute("width", innerWidth);
  edgesSvg.setAttribute("height", innerHeight);
  const centerX = innerWidth / 2;
  const centerY = innerHeight / 2;

  all.forEach((node) => {
    node.x = centerX + node.relX;
    node.y = centerY + node.relY;
  });

  canvas.scrollLeft = Math.max(0, centerX - canvas.clientWidth / 2); // center on root

  all.forEach((node) => {
    if (node.parentId) {
      const parent = graphState.nodesById.get(node.parentId);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", parent.x);
      line.setAttribute("y1", parent.y);
      line.setAttribute("x2", node.x);
      line.setAttribute("y2", node.y);
      line.setAttribute("class", `graph-edge rel-${node.relation}`);
      edgesSvg.appendChild(line);
    }
    inner.appendChild(makeGraphNode(node, node.x, node.y, graphState.rootQuery));
  });
}

function makeGraphNode(node, x, y, rootQuery) {
  const el = document.createElement("button");
  el.className = `graph-node rel-${node.relation}`;
  if (node.relation !== "root" && node.matchCount === 0) el.classList.add("no-match");
  if (graphState.selectedId === node.id) el.classList.add("selected");
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  const freqBadge = node.frequency != null ? ` <span class="node-freq">${node.frequency}%</span>` : "";
  const countBadge = node.matchCount > 0 ? ` <span class="node-count">${node.matchCount}</span>` : "";
  el.innerHTML = node.relation === "root"
    ? escapeHtml(node.label)
    : `${escapeHtml(node.label)}${freqBadge}${countBadge}`;
  el.title = node.relation === "root"
    ? "Query corrente"
    : `${node.relation}${node.frequency != null ? ` — ${node.frequency}% frequenza` : ""} — ${node.matchCount} risultat${node.matchCount === 1 ? "o" : "i"} corrente${node.matchCount === 1 ? "" : "i"}`;

  if (node.relation === "root") {
    el.classList.add("root");
  } else {
    el.addEventListener("click", () => {
      const wasSelected = graphState.selectedId === node.id;
      document.querySelectorAll(".graph-node").forEach((n) => n.classList.remove("selected"));
      if (wasSelected) {
        graphState.selectedId = null;
        document.getElementById("graph-detail").classList.add("hidden");
        clearGraphFilter();
        return;
      }
      graphState.selectedId = node.id;
      el.classList.add("selected");
      applyGraphFilter(node);
      showGraphDetail(node, rootQuery);
    });
  }
  return el;
}

// Materializes a node's related tags as child nodes (capped at EXPAND_CHILD_CAP); toggling
// an already-expanded node collapses its branch instead
async function toggleExpandNode(node) {
  if (node.expanded) {
    collapseBranch(node);
    renderGraphDOM();
    showGraphDetail(node, graphState.rootQuery);
    return;
  }

  if (graphState.nodesById.size >= GRAPH_NODE_CAP) return;

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

  const existingIds = new Set(graphState.nodesById.keys());
  const candidates = (data.relatedTags ?? [])
    .filter((t) => t.tag !== graphState.rootQuery.toLowerCase() && t.tag !== node.id && !existingIds.has(t.tag))
    .slice(0, EXPAND_CHILD_CAP);

  const childIds = [];
  candidates.forEach((c) => {
    const matched = itemsMatchingTagJS(resultPool, c.tag);
    graphState.nodesById.set(c.tag, {
      id: c.tag, label: c.tag, relation: c.relation, frequency: c.frequency,
      matchCount: matched.length, matchedIds: matched.map((m) => m.id),
      parentId: node.id, depth: node.depth + 1, expanded: false, children: [],
    });
    childIds.push(c.tag);
  });

  node.children = childIds;
  node.expanded = true;
  renderGraphDOM();
  showGraphDetail(node, graphState.rootQuery);
}

function collapseBranch(node) {
  node.children.forEach((childId) => {
    const child = graphState.nodesById.get(childId);
    if (child) collapseBranch(child);
    graphState.nodesById.delete(childId);
  });
  node.children = [];
  node.expanded = false;
}

// Filters the full fetched pool (not just the current page), so pagination is hidden while active
function applyGraphFilter(node) {
  activeFilter = { ids: new Set(node.matchedIds ?? []), label: node.label };
  const filtered = resultPool.filter((item) => activeFilter.ids.has(item.id));
  renderResults(filtered, currentCategory);
  renderFilterBanner();
  document.getElementById("pagination").classList.add("hidden");
  setStatus(filtered.length === 0 ? `Nessun risultato di questa ricerca è taggato con "${node.label}".` : "");
}

function clearGraphFilter() {
  activeFilter = null;
  document.getElementById("result-filter-banner").classList.add("hidden");
  renderResultsSlice();
  setStatus(resultPool.length === 0 ? "No results found." : "");
}

function renderFilterBanner() {
  const el = document.getElementById("result-filter-banner");
  el.classList.remove("hidden");
  el.innerHTML = `Mostrando solo i risultati per <strong>${escapeHtml(activeFilter.label)}</strong> <button id="clear-filter-btn">Mostra tutti</button>`;
  document.getElementById("clear-filter-btn").addEventListener("click", () => {
    if (graphState) graphState.selectedId = null;
    document.querySelectorAll(".graph-node.selected").forEach((n) => n.classList.remove("selected"));
    document.getElementById("graph-detail").classList.add("hidden");
    clearGraphFilter();
  });
}

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
        (t) => `<button class="tag-chip ${t.relation}" data-tag="${escapeHtml(t.tag)}" data-relation="${t.relation}" title="${t.relation}">${escapeHtml(t.tag)}${t.frequency != null ? ` <span class="node-freq">${t.frequency}%</span>` : ""}</button>`
      ).join("")
    : `<span class="graph-detail-empty">Nessuna relazione ulteriore trovata.</span>`;

  const matchInfo = node.matchCount > 0
    ? `<span class="match-info match-yes">Presente in ${node.matchCount} risultat${node.matchCount === 1 ? "o" : "i"} di questa ricerca</span>`
    : `<span class="match-info match-no">Nessun risultato attuale è taggato con questo termine</span>`;

  const freqInfo = node.frequency != null
    ? `<span class="match-info freq-info">${node.frequency}% frequenza rispetto al termine più comune della stessa categoria</span>`
    : "";

  const existingIds = new Set(graphState.nodesById.keys());
  const expandableCount = relTags.filter((t) => t.tag !== node.id && !existingIds.has(t.tag)).length;
  const atCap = !node.expanded && graphState.nodesById.size >= GRAPH_NODE_CAP;
  const expandLabel = node.expanded
    ? "− Comprimi ramo"
    : atCap
    ? "Mappa piena (40 nodi)"
    : `+ Espandi nel grafo (${Math.min(expandableCount, EXPAND_CHILD_CAP)})`;
  const expandDisabled = atCap || (!node.expanded && expandableCount === 0);
  const expandBtn = node.relation === "root" ? "" : `
      <button class="graph-detail-expand${node.expanded ? " expanded" : ""}" ${expandDisabled ? "disabled" : ""}>${expandLabel}</button>`;

  detail.innerHTML = `
    <div class="graph-detail-header">
      <strong>${escapeHtml(node.label)}</strong>
      <span class="rel-badge rel-${node.relation}">${node.relation === "root" ? "query" : node.relation} rispetto a "${escapeHtml(rootQuery)}"</span>
      <button class="graph-detail-concept" data-tag="${escapeHtml(node.label)}">📖 Pagina di sintesi</button>
      <button class="graph-detail-search" data-tag="${escapeHtml(node.label)}">Cerca «${escapeHtml(node.label)}»</button>${expandBtn}
    </div>
    <div class="graph-detail-match">${matchInfo} ${freqInfo}</div>
    <div class="graph-detail-relations">${chips}</div>
  `;

  detail.querySelector(".graph-detail-concept")?.addEventListener("click", () => {
    openConceptPage(node, rootQuery);
  });
  detail.querySelector(".graph-detail-search")?.addEventListener("click", () => {
    searchTag(node.label, rootQuery, node.relation);
  });
  detail.querySelector(".graph-detail-expand")?.addEventListener("click", () => {
    toggleExpandNode(node);
  });
  detail.querySelectorAll(".graph-detail-relations .tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => searchTag(chip.dataset.tag, node.label, chip.dataset.relation));
  });
}

// --- Concept synthesis page --- definition + matched results + related concepts, one place
async function openConceptPage(node, rootQuery) {
  const modal = document.getElementById("concept-modal");
  const title = document.getElementById("concept-modal-title");
  const relationBadge = document.getElementById("concept-modal-relation");
  const defsEl = document.getElementById("concept-modal-definitions");
  const mediaSection = document.getElementById("concept-modal-media");
  const mediaGrid = document.getElementById("concept-modal-media-grid");
  const relatedSection = document.getElementById("concept-modal-related");
  const relatedList = document.getElementById("concept-modal-related-list");
  const searchBtn = document.getElementById("concept-modal-search-btn");

  title.textContent = node.label;
  relationBadge.className = `rel-badge rel-${node.relation}`;
  relationBadge.textContent = `${node.relation === "root" ? "query" : node.relation} rispetto a "${rootQuery}"`;
  defsEl.innerHTML = `<p class="concept-loading">Caricamento definizione…</p>`;
  relatedList.innerHTML = `<p class="concept-loading">Caricamento concetti collegati…</p>`;
  searchBtn.onclick = () => {
    closeConceptModal();
    searchTag(node.label, rootQuery, node.relation);
  };

  // Already in hand from the current search — no extra request needed for this part
  const matchedIds = new Set(node.matchedIds ?? []);
  const matchedItems = currentItems.filter((item) => matchedIds.has(item.id));
  if (matchedItems.length) {
    mediaSection.classList.remove("hidden");
    mediaGrid.innerHTML = matchedItems.slice(0, 12).map((item) => `
      <div class="concept-media-item" data-id="${escapeHtml(item.id)}">
        ${item.thumbnailUrl
          ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}" />`
          : `<div class="no-thumb small">${escapeHtml(item.category)}</div>`}
        <div class="concept-media-caption">${escapeHtml(item.title)}</div>
      </div>
    `).join("");
    mediaGrid.querySelectorAll(".concept-media-item").forEach((el) => {
      el.addEventListener("click", () => {
        const item = matchedItems.find((i) => i.id === el.dataset.id);
        if (item) {
          closeConceptModal();
          openResultModal(item);
        }
      });
    });
  } else {
    mediaSection.classList.add("hidden");
  }

  modal.classList.remove("hidden");

  try {
    const safe = safeCheckbox.checked;
    const res = await fetch(`${API_BASE}/concept?tag=${encodeURIComponent(node.label)}&safe=${safe}`);
    const data = await res.json();

    defsEl.innerHTML = data.definitions?.length
      ? definitionCardsHtml(data.definitions)
      : `<p class="concept-empty">Nessuna definizione trovata per questo termine.</p>`;

    const related = (data.relatedTags ?? []).filter((t) => t.tag !== node.label.toLowerCase());
    relatedSection.classList.toggle("hidden", related.length === 0);
    relatedList.innerHTML = related.length
      ? related.map(
          (t) => `<button class="tag-chip ${t.relation}" data-tag="${escapeHtml(t.tag)}" data-relation="${t.relation}" title="${t.relation}">${escapeHtml(t.tag)}</button>`
        ).join("")
      : "";
    relatedList.querySelectorAll(".tag-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        closeConceptModal();
        searchTag(chip.dataset.tag, node.label, chip.dataset.relation);
      });
    });
  } catch (err) {
    defsEl.innerHTML = `<p class="concept-empty">Errore nel caricamento: ${escapeHtml(err.message)}</p>`;
    relatedList.innerHTML = "";
  }
}

function closeConceptModal() {
  document.getElementById("concept-modal").classList.add("hidden");
}

document.getElementById("concept-modal-close").addEventListener("click", closeConceptModal);
document.getElementById("concept-modal-backdrop").addEventListener("click", closeConceptModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeConceptModal();
});

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

// Other results from the same search sharing at least one tag
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
  document.getElementById("definitions-section").classList.add("hidden");
  document.getElementById("spelling-suggestion").classList.add("hidden");
  document.getElementById("pagination").classList.add("hidden");
  document.getElementById("result-filter-banner").classList.add("hidden");
  activeFilter = null;
}
function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Show whatever was already explored in previous visits/searches, before any new search runs
renderTrail(loadTrail());
