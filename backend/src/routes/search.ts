import { Router, Request, Response } from "express";
import { getConnectors, listSources } from "../connectors/registry";
import { expandQuery, getRelatedTags, buildGraphNodes } from "../services/knowledgeGraph";
import { filterSafe, isQueryBlocked } from "../services/safeSearch";
import { DICTIONARY_SOURCES, interleaveBySource, fetchDefinitionsFor, isTitleRelevant } from "../services/definitions";
import { textRelatesToQuery } from "../services/textRelevance";
import { suggestCorrection } from "../services/spellcheck";
import { Category, SearchItem, withTimeout } from "../connectors/types";

const router = Router();

const VALID_CATEGORIES: Category[] = ["images", "videos", "gifs", "models3d", "texts"];

// Some connectors (confirmed: Pexels, Freepik, The Met) never return "zero results" for a
// query with no real matches — they silently substitute generic/trending content instead.
// There's no explicit flag for this in their responses, but the substituted batches share a
// tell: not a single item has any textual connection to the query anywhere. A genuine batch,
// even from a connector doing loose semantic matching, almost always has at least one item
// that does (verified: searching "bank" on Unsplash gives 2/12 literal matches even though
// most captions are unrelated-sounding; a nonsense query gives 0/12 on the affected sources).
// Checking for that rather than naming specific connectors means this keeps working
// automatically for any source added later, without needing to be told which ones do this.
// Uses the same stemmed match as the definitions filter (not exact substring) since some
// connectors only look up a query's first word and return results keyed to its base form
// (e.g. "eating" -> Cambridge Dictionary's "eat") — an early, stricter version of this check
// mistook that for zero relevance and dropped an entire legitimate source.
function batchHasNoRelevance(items: SearchItem[], query: string): boolean {
  if (items.length === 0) return false;
  return !items.some((item) => {
    const haystack = `${item.title} ${item.description ?? ""} ${(item.tags ?? []).join(" ")}`;
    return textRelatesToQuery(haystack, query);
  });
}

// Per-connector cutoff, bounds worst-case response time. 20s covers a scraping connector's
// own worst case (15s page load + 5s selector wait) even when it has to queue for a Chrome tab.
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 20000;

// In-memory cache (no persistence) so repeated searches skip the connector fan-out
const CACHE_TTL_MS = Number(process.env.SEARCH_CACHE_TTL_MS) || 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { body: unknown; expiresAt: number }>();

function cacheKey(q: string, cat: string, page: number, expand: string, safe: string): string {
  return `${q}::${cat}::${page}::${expand}::${safe}`;
}

function getCached(key: string): unknown {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry); // bump recency for LRU-style eviction
  return entry.body;
}

function setCached(key: string, body: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
}

// GET /api/search?q=nature&category=images&page=1&expand=false
router.get("/search", async (req: Request, res: Response) => {
  const { q, category, page = "1", expand = "false", safe = "true" } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const cat = typeof category === "string" && VALID_CATEGORIES.includes(category as Category)
    ? (category as Category)
    : undefined;

  const safeMode = safe !== "false";
  const pageNum = parseInt(page as string);

  // Explicit queries are refused outright in safe mode, rather than fanning out to every
  // connector and relying on filtering the results after the fact.
  if (safeMode && isQueryBlocked(q)) {
    return res.json({
      query: q,
      expandedQuery: null,
      relatedTags: [],
      category: cat ?? "all",
      page: pageNum,
      safe: safeMode,
      blockedQuery: true,
      totalSources: 0,
      totalItems: 0,
      sources: [],
      knowledgeGraph: {
        nodes: [],
        edges: [],
        coverage: {
          sourcesQueried: 0,
          sourcesAvailable: 0,
          sourcesWithResults: 0,
          coveragePercent: 0,
          availabilityPercent: 0,
          categories: [],
        },
      },
      definitions: [],
      spellingSuggestion: null,
      items: [],
    });
  }

  const searchQuery = expand === "true" ? (await expandQuery(q)).join(" ") : q;
  const key = cacheKey(searchQuery, cat ?? "all", pageNum, expand as string, String(safeMode));

  const cached = getCached(key);
  if (cached) {
    return res.json({ ...(cached as object), cached: true });
  }

  const connectors = getConnectors(cat);

  // Cheap and synchronous (no network) — a "did you mean" hint the frontend can offer
  // alongside the results, never used to alter the search itself.
  const spellingSuggestion = suggestCorrection(q);

  // Run in parallel: a slow/unreachable ConceptNet must never delay the actual search results
  const [relatedTags, settled] = await Promise.all([
    getRelatedTags(q),
    Promise.allSettled(
      connectors.map((c) =>
        withTimeout(c.search(searchQuery, pageNum, safeMode), c.name, CONNECTOR_TIMEOUT_MS)
      )
    ),
  ]);

  const rawSources = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { source: connectors[i].name, items: [], total: 0, error: String((s as any).reason) }
  );

  const safeSources = safeMode
    ? rawSources.map((s) => ({ ...s, items: filterSafe(s.items) }))
    : rawSources;

  const sources = safeSources.map((s) =>
    !s.error && batchHasNoRelevance(s.items, q)
      ? { ...s, items: [], error: "Nessun risultato pertinente (contenuti generici scartati)" }
      : s
  );

  const allItems = sources.flatMap((s) => s.items);
  const definitions = interleaveBySource(
    allItems.filter((i) => DICTIONARY_SOURCES.has(i.source) && isTitleRelevant(i.title, q)),
    6
  );
  const items = allItems.filter((i) => !DICTIONARY_SOURCES.has(i.source));
  const errors = sources.filter((s) => s.error).map((s) => ({ source: s.source, error: s.error }));

  // "Available" = the connector actually ran (no missing key / timeout / HTTP error).
  // Scoring coverage against only those isolates real content signal from our own
  // infrastructure reliability — a missing API key shouldn't read as "less knowledge".
  const sourcesAvailable = sources.filter((s) => !s.error).length;
  const sourcesWithResults = sources.filter((s) => !s.error && s.items.length > 0).length;
  const categories = Array.from(new Set(allItems.map((i) => i.category)));
  const { nodes, edges } = buildGraphNodes(q, relatedTags, allItems);

  const body = {
    query: q,
    expandedQuery: expand === "true" ? searchQuery : null,
    relatedTags,
    category: cat ?? "all",
    page: pageNum,
    safe: safeMode,
    totalSources: connectors.length,
    totalItems: allItems.length,
    sources: sources.map((s) => ({ source: s.source, count: s.items.length, error: s.error ?? null })),
    errors: errors.length ? errors : undefined,
    knowledgeGraph: {
      nodes,
      edges,
      coverage: {
        sourcesQueried: connectors.length,
        sourcesAvailable,
        sourcesWithResults,
        // Content signal: of the sources that actually responded, how many found something
        coveragePercent: sourcesAvailable
          ? Math.round((sourcesWithResults / sourcesAvailable) * 100)
          : 0,
        // Infrastructure signal: how many sources were configured & reachable at all
        availabilityPercent: connectors.length
          ? Math.round((sourcesAvailable / connectors.length) * 100)
          : 0,
        categories,
      },
    },
    definitions,
    spellingSuggestion,
    items,
  };

  setCached(key, body);
  return res.json(body);
});

// GET /api/sources — list all available connectors
router.get("/sources", (_req: Request, res: Response) => {
  return res.json(listSources());
});

// GET /api/graph/expand?tag=nature
router.get("/graph/expand", async (req: Request, res: Response) => {
  const { tag } = req.query;
  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ error: "Parameter 'tag' is required" });
  }
  const [expandedTerms, relatedTags] = await Promise.all([expandQuery(tag), getRelatedTags(tag)]);
  return res.json({ tag, expandedTerms, relatedTags });
});

// GET /api/concept?tag=apple+tree&safe=true
// Synthesis view for a single concept (usually a graph node the user clicked): a
// definition looked up directly against the dictionary connectors (independent of
// whatever category the current search happened to run), plus its own related concepts.
// Kept as a separate, opt-in endpoint rather than folded into /graph/expand so that just
// browsing the graph (which already calls /graph/expand on every node click) doesn't pay
// the cost of the scraping-based dictionary connectors unless the user actually asks for it.
router.get("/concept", async (req: Request, res: Response) => {
  const { tag, safe = "true" } = req.query;
  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ error: "Parameter 'tag' is required" });
  }
  const safeMode = safe !== "false";

  const [definitions, relatedTags] = await Promise.all([
    fetchDefinitionsFor(tag, safeMode),
    getRelatedTags(tag),
  ]);

  return res.json({ tag, definitions, relatedTags });
});

export default router;
