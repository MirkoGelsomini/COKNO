import { Router, Request, Response } from "express";
import { getConnectors, listSources } from "../connectors/registry";
import { expandQuery, getRelatedTags, buildGraphNodes, findConceptPath } from "../services/knowledgeGraph";
import { filterSafe, isQueryBlocked } from "../services/safeSearch";
import { DICTIONARY_SOURCES, interleaveBySource, fetchDefinitionsFor, isTitleRelevant } from "../services/definitions";
import { textRelatesToQuery } from "../services/textRelevance";
import { suggestCorrection } from "../services/spellcheck";
import { Category, SearchItem, withTimeout } from "../connectors/types";

const router = Router();

const VALID_CATEGORIES: Category[] = ["images", "videos", "gifs", "models3d", "texts"];

// Some connectors (Pexels, Freepik, The Met) substitute generic/trending content instead of
// returning zero results for a nonsense query. Detected generically — zero items in the batch
// share any word-stem with the query — rather than by naming specific sources, so it keeps
// working for connectors added later. Stemmed, not exact match, since some connectors key
// results to a query's base form (e.g. "eating" -> Cambridge Dictionary's "eat").
function batchHasNoRelevance(items: SearchItem[], query: string): boolean {
  if (items.length === 0) return false;
  return !items.some((item) => {
    const haystack = `${item.title} ${item.description ?? ""} ${(item.tags ?? []).join(" ")}`;
    return textRelatesToQuery(haystack, query);
  });
}

// Covers a scraping connector's worst case even when queued for a Chrome tab
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 20000;

// In-memory only, no persistence
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
  cache.set(key, entry); // bump recency for LRU eviction
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

  // Blocked queries are refused outright, not fanned out and filtered after the fact
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
  const spellingSuggestion = suggestCorrection(q); // sync, never alters the actual search

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
      ? { ...s, items: [], error: "No relevant results (generic content discarded)" }
      : s
  );

  const allItems = sources.flatMap((s) => s.items);
  const definitions = interleaveBySource(
    allItems.filter((i) => DICTIONARY_SOURCES.has(i.source) && isTitleRelevant(i.title, q)),
    6
  );
  const items = allItems.filter((i) => !DICTIONARY_SOURCES.has(i.source));
  const errors = sources.filter((s) => s.error).map((s) => ({ source: s.source, error: s.error }));

  // "Available" = ran without error — a missing API key shouldn't read as "less knowledge"
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
        coveragePercent: sourcesAvailable // of responding sources, how many found something
          ? Math.round((sourcesWithResults / sourcesAvailable) * 100)
          : 0,
        availabilityPercent: connectors.length // how many were configured & reachable at all
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

// GET /api/graph/path?from=limit&to=integral — shortest chain of relations connecting two concepts
router.get("/graph/path", async (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || typeof from !== "string" || !to || typeof to !== "string") {
    return res.status(400).json({ error: "Parameters 'from' and 'to' are required" });
  }
  const path = await findConceptPath(from, to);
  return res.json({ from, to, path });
});

// GET /api/concept?tag=apple+tree&safe=true — definition + related concepts for one graph
// node. Separate from /graph/expand so ordinary node clicks don't pay for dictionary scraping.
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
