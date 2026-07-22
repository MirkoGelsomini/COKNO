import { Router, Request, Response } from "express";
import { getConnectors, listSources } from "../connectors/registry";
import { expandQuery, getRelatedTags, getFullGraph } from "../services/knowledgeGraph";
import { Category, withTimeout } from "../connectors/types";

const router = Router();

const VALID_CATEGORIES: Category[] = ["images", "videos", "gifs", "models3d", "texts"];

// Per-connector cutoff — bounds the worst case response time regardless of
// how many of the ~100 connectors are slow or unresponsive.
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 8000;

// In-memory result cache (no persistent storage — just RAM, cleared on
// restart) so repeated identical searches skip the full connector fan-out.
const CACHE_TTL_MS = Number(process.env.SEARCH_CACHE_TTL_MS) || 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { body: unknown; expiresAt: number }>();

function cacheKey(q: string, cat: string, page: number, expand: string): string {
  return `${q}::${cat}::${page}::${expand}`;
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
  const { q, category, page = "1", expand = "false" } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const cat = typeof category === "string" && VALID_CATEGORIES.includes(category as Category)
    ? (category as Category)
    : undefined;

  const searchQuery = expand === "true" ? expandQuery(q).join(" ") : q;
  const pageNum = parseInt(page as string);
  const key = cacheKey(searchQuery, cat ?? "all", pageNum, expand as string);

  const cached = getCached(key);
  if (cached) {
    return res.json({ ...(cached as object), cached: true });
  }

  const relatedTags = getRelatedTags(q);
  const connectors = getConnectors(cat);

  const settled = await Promise.allSettled(
    connectors.map((c) =>
      withTimeout(c.search(searchQuery, pageNum), c.name, CONNECTOR_TIMEOUT_MS)
    )
  );

  const sources = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { source: connectors[i].name, items: [], total: 0, error: String((s as any).reason) }
  );

  const allItems = sources.flatMap((s) => s.items);
  const errors = sources.filter((s) => s.error).map((s) => ({ source: s.source, error: s.error }));

  const body = {
    query: q,
    expandedQuery: expand === "true" ? searchQuery : null,
    relatedTags,
    category: cat ?? "all",
    page: pageNum,
    totalSources: connectors.length,
    totalItems: allItems.length,
    sources: sources.map((s) => ({ source: s.source, count: s.items.length, error: s.error ?? null })),
    errors: errors.length ? errors : undefined,
    items: allItems,
  };

  setCached(key, body);
  return res.json(body);
});

// GET /api/sources — list all available connectors
router.get("/sources", (_req: Request, res: Response) => {
  return res.json(listSources());
});

// GET /api/graph
router.get("/graph", (_req: Request, res: Response) => {
  return res.json(getFullGraph());
});

// GET /api/graph/expand?tag=nature
router.get("/graph/expand", (req: Request, res: Response) => {
  const { tag } = req.query;
  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ error: "Parameter 'tag' is required" });
  }
  return res.json({ tag, expandedTerms: expandQuery(tag), relatedTags: getRelatedTags(tag) });
});

export default router;
