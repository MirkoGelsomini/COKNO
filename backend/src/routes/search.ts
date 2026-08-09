import { Router, Request, Response } from "express";
import { getConnectors, listSources } from "../connectors/registry";
import { expandQuery, getRelatedTags, buildGraphNodes } from "../services/knowledgeGraph";
import { filterSafe, isQueryBlocked } from "../services/safeSearch";
import { Category, withTimeout } from "../connectors/types";

const router = Router();

const VALID_CATEGORIES: Category[] = ["images", "videos", "gifs", "models3d", "texts"];

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
        coverage: { sourcesQueried: 0, sourcesWithResults: 0, coveragePercent: 0, categories: [] },
      },
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

  const sources = safeMode
    ? rawSources.map((s) => ({ ...s, items: filterSafe(s.items) }))
    : rawSources;

  const allItems = sources.flatMap((s) => s.items);
  const errors = sources.filter((s) => s.error).map((s) => ({ source: s.source, error: s.error }));

  const sourcesWithResults = sources.filter((s) => s.items.length > 0).length;
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
        sourcesWithResults,
        coveragePercent: connectors.length
          ? Math.round((sourcesWithResults / connectors.length) * 100)
          : 0,
        categories,
      },
    },
    items: allItems,
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

export default router;
