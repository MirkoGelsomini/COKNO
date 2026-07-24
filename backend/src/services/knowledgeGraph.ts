// Semantic knowledge graph — models conceptual relationships for query expansion

type RelationType = "synonym" | "related" | "broader" | "narrower";

interface Relation {
  type: RelationType;
  target: string;
}

interface KnowledgeNode {
  category: string;
  relations: Relation[];
}

// Small ontology focused on image/photo search domains
const graph: Record<string, KnowledgeNode> = {
  nature: {
    category: "environment",
    relations: [
      { type: "narrower", target: "forest" },
      { type: "narrower", target: "mountain" },
      { type: "narrower", target: "ocean" },
      { type: "narrower", target: "desert" },
      { type: "related", target: "landscape" },
      { type: "synonym", target: "natural" },
    ],
  },
  forest: {
    category: "environment",
    relations: [
      { type: "broader", target: "nature" },
      { type: "related", target: "trees" },
      { type: "related", target: "wildlife" },
      { type: "synonym", target: "woods" },
    ],
  },
  mountain: {
    category: "environment",
    relations: [
      { type: "broader", target: "nature" },
      { type: "related", target: "snow" },
      { type: "related", target: "hiking" },
      { type: "synonym", target: "peak" },
    ],
  },
  ocean: {
    category: "environment",
    relations: [
      { type: "broader", target: "nature" },
      { type: "related", target: "beach" },
      { type: "related", target: "waves" },
      { type: "synonym", target: "sea" },
    ],
  },
  city: {
    category: "urban",
    relations: [
      { type: "narrower", target: "architecture" },
      { type: "narrower", target: "street" },
      { type: "related", target: "skyline" },
      { type: "synonym", target: "urban" },
    ],
  },
  architecture: {
    category: "urban",
    relations: [
      { type: "broader", target: "city" },
      { type: "related", target: "building" },
      { type: "related", target: "design" },
    ],
  },
  portrait: {
    category: "people",
    relations: [
      { type: "related", target: "person" },
      { type: "related", target: "face" },
      { type: "related", target: "photography" },
      { type: "synonym", target: "headshot" },
    ],
  },
  food: {
    category: "lifestyle",
    relations: [
      { type: "narrower", target: "coffee" },
      { type: "narrower", target: "fruit" },
      { type: "related", target: "restaurant" },
      { type: "related", target: "cooking" },
    ],
  },
  technology: {
    category: "tech",
    relations: [
      { type: "narrower", target: "computer" },
      { type: "narrower", target: "phone" },
      { type: "related", target: "digital" },
      { type: "synonym", target: "tech" },
    ],
  },
  abstract: {
    category: "art",
    relations: [
      { type: "related", target: "texture" },
      { type: "related", target: "pattern" },
      { type: "related", target: "color" },
      { type: "synonym", target: "artistic" },
    ],
  },
};

export interface GraphNode {
  tag: string;
  category: string;
  relations: Relation[];
}

export interface RelatedTag {
  tag: string;
  relation: RelationType;
}

const CONCEPTNET_TIMEOUT_MS = 5000;
const CONCEPTNET_CACHE_TTL_MS = 30 * 60 * 1000;
const conceptNetCache = new Map<string, { relations: Relation[]; expiresAt: number }>();

async function fetchConceptNetRelations(term: string): Promise<Relation[]> {
  const cached = conceptNetCache.get(term);
  if (cached && Date.now() < cached.expiresAt) return cached.relations;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONCEPTNET_TIMEOUT_MS);

  try {
    const encoded = encodeURIComponent(term.replace(/\s+/g, "_"));
    const res = await fetch(`https://api.conceptnet.io/c/en/${encoded}?limit=20`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    const edges: any[] = data.edges ?? [];
    const relations: Relation[] = [];
    const seen = new Set<string>();

    for (const e of edges) {
      const startId: string = e.start?.["@id"] ?? "";
      const endId: string = e.end?.["@id"] ?? "";
      const startLabel: string | undefined = e.start?.label?.toLowerCase();
      const endLabel: string | undefined = e.end?.label?.toLowerCase();
      const relLabel: string | undefined = e.rel?.label;
      if (!startLabel || !endLabel || !relLabel) continue;
      if (!startId.startsWith("/c/en/") || !endId.startsWith("/c/en/")) continue;

      const isStart = startLabel === term.toLowerCase();
      const target = isStart ? endLabel : startLabel;
      if (target === term.toLowerCase() || seen.has(target)) continue;

      let type: RelationType;
      if (relLabel === "Synonym") type = "synonym";
      else if (relLabel === "IsA") type = isStart ? "broader" : "narrower";
      else type = "related";

      relations.push({ type, target });
      seen.add(target);
      if (relations.length >= 8) break;
    }

    conceptNetCache.set(term, { relations, expiresAt: Date.now() + CONCEPTNET_CACHE_TTL_MS });
    return relations;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Curated graph first, live ConceptNet lookup for terms outside it
async function getRelations(term: string): Promise<Relation[]> {
  const node = graph[term];
  if (node) return node.relations;
  return fetchConceptNetRelations(term);
}

// Returns query terms expanded with synonyms for better search coverage
export async function expandQuery(query: string): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const relations = await getRelations(term);
    for (const rel of relations) {
      if (rel.type === "synonym") {
        expanded.add(rel.target);
      }
    }
  }

  return Array.from(expanded);
}

// Returns semantically related tags to show in the UI
export async function getRelatedTags(query: string): Promise<RelatedTag[]> {
  const term = query.toLowerCase().trim();
  const relations = await getRelations(term);
  return relations.map((r) => ({ tag: r.target, relation: r.type }));
}

// Returns the full graph as an array of nodes
export function getFullGraph(): GraphNode[] {
  return Object.entries(graph).map(([tag, node]) => ({
    tag,
    category: node.category,
    relations: node.relations,
  }));
}
