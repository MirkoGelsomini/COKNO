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

// Returns query terms expanded with synonyms for better search coverage
export function expandQuery(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const node = graph[term];
    if (node) {
      for (const rel of node.relations) {
        if (rel.type === "synonym") {
          expanded.add(rel.target);
        }
      }
    }
  }

  return Array.from(expanded);
}

// Returns semantically related tags to show in the UI
export function getRelatedTags(query: string): RelatedTag[] {
  const term = query.toLowerCase().trim();
  const node = graph[term];
  if (!node) return [];

  return node.relations.map((r) => ({ tag: r.target, relation: r.type }));
}

// Returns the full graph as an array of nodes
export function getFullGraph(): GraphNode[] {
  return Object.entries(graph).map(([tag, node]) => ({
    tag,
    category: node.category,
    relations: node.relations,
  }));
}
