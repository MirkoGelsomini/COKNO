import { Router, Request, Response } from "express";
import { getConnectors, listSources } from "../connectors/registry";
import { expandQuery, getRelatedTags, getFullGraph } from "../services/knowledgeGraph";
import { Category } from "../connectors/types";

const router = Router();

const VALID_CATEGORIES: Category[] = ["images", "videos", "gifs", "models3d", "texts"];

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
  const relatedTags = getRelatedTags(q);
  const connectors = getConnectors(cat);

  const settled = await Promise.allSettled(
    connectors.map((c) => c.search(searchQuery, parseInt(page as string)))
  );

  const sources = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { source: connectors[i].name, items: [], total: 0, error: String((s as any).reason) }
  );

  const allItems = sources.flatMap((s) => s.items);
  const errors = sources.filter((s) => s.error).map((s) => ({ source: s.source, error: s.error }));

  return res.json({
    query: q,
    expandedQuery: expand === "true" ? searchQuery : null,
    relatedTags,
    category: cat ?? "all",
    page: parseInt(page as string),
    totalSources: connectors.length,
    totalItems: allItems.length,
    sources: sources.map((s) => ({ source: s.source, count: s.items.length, error: s.error ?? null })),
    errors: errors.length ? errors : undefined,
    items: allItems,
  });
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
