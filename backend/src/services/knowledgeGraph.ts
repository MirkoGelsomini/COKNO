// Semantic knowledge graph — models conceptual relationships for query expansion

import { SearchItem } from "../connectors/types";

type RelationType = "synonym" | "related" | "broader" | "narrower";

interface Relation {
  type: RelationType;
  target: string;
}

export interface RelatedTag {
  tag: string;
  relation: RelationType;
}

const FETCH_TIMEOUT_MS = 5000;
const RELATIONS_CACHE_TTL_MS = 30 * 60 * 1000;
const relationsCache = new Map<string, { relations: Relation[]; expiresAt: number }>();

async function fetchJson(url: string): Promise<any | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

// Datamuse (api.datamuse.com) — no API key, no rate-limit auth, and in practice far more
// reliably up than ConceptNet. Its rel_* relation codes map directly onto our taxonomy.
async function fetchFromDatamuse(term: string): Promise<Relation[]> {
  const encoded = encodeURIComponent(term);
  // md=p asks Datamuse for each candidate's part-of-speech tags, used below to prefer
  // nominal, less-ambiguous senses. Pulling a larger pool than we need (max=8/6/6) gives
  // the ranking something to actually choose between after the obviously-ambiguous ones
  // sink to the bottom.
  const [syn, gen, spc, trg] = await Promise.all([
    fetchJson(`https://api.datamuse.com/words?rel_syn=${encoded}&max=8&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_gen=${encoded}&max=6&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_spc=${encoded}&max=6&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_trg=${encoded}&max=4&md=p`),
  ]);

  const relations: Relation[] = [];
  const seen = new Set<string>([term.toLowerCase()]);

  // Search queries are almost always noun-like ("cat", "sunset"), and WordNet-derived
  // synonym sets often mix in unrelated senses of a word (flower's synonym list includes
  // "prime" — not the plant sense, but "prime" as in peak/heyday, tagged adj/n/v/prop).
  // Words tagged with fewer distinct parts of speech are less likely to be dragging in an
  // unrelated sense, so we rank those first. This is a heuristic, not real word-sense
  // disambiguation, but it measurably pushes "efflorescence"/"heyday" ahead of "prime"/
  // "flush" for a query like "flower" without adding any new infrastructure.
  const ambiguityRank = (tags: string[] | undefined): number => {
    if (!tags?.length) return 5;
    const posTags = tags.filter((t) => t === "n" || t === "v" || t === "adj" || t === "adv");
    const hasNoun = posTags.includes("n");
    return (hasNoun ? 0 : 10) + (posTags.length || 1);
  };

  const addAll = (list: any[] | undefined, type: RelationType, cap: number) => {
    const ranked = [...(list ?? [])].sort((a, b) => ambiguityRank(a.tags) - ambiguityRank(b.tags));
    let added = 0;
    for (const entry of ranked) {
      if (added >= cap || relations.length >= 8) break;
      const target: string | undefined = entry?.word?.toLowerCase();
      if (!target || seen.has(target)) continue;
      relations.push({ type, target });
      seen.add(target);
      added++;
    }
  };

  addAll(syn, "synonym", 3);
  addAll(gen, "broader", 2);
  addAll(spc, "narrower", 2);
  addAll(trg, "related", 4);

  return relations;
}

// Fallback source, tried only if Datamuse yields nothing (e.g. a genuine outage on both sides).
async function fetchFromConceptNet(term: string): Promise<Relation[]> {
  const encoded = encodeURIComponent(term.replace(/\s+/g, "_"));
  const data = await fetchJson(`https://api.conceptnet.io/c/en/${encoded}?limit=20`);
  if (!data) return [];

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

  return relations;
}

async function getRelations(term: string): Promise<Relation[]> {
  const cached = relationsCache.get(term);
  if (cached && Date.now() < cached.expiresAt) return cached.relations;

  let relations = await fetchFromDatamuse(term);
  if (relations.length === 0) relations = await fetchFromConceptNet(term);

  // Only cache a real result — leave failures uncached so the next request retries
  // instead of parroting an outage for the full TTL.
  if (relations.length > 0) {
    relationsCache.set(term, { relations, expiresAt: Date.now() + RELATIONS_CACHE_TTL_MS });
  }
  return relations;
}

// Returns query terms expanded with synonyms for better search coverage
export async function expandQuery(query: string): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>(terms);

  // Fetched in parallel per term — a slow ConceptNet should cost one timeout, not one per word
  const relationsByTerm = await Promise.all(terms.map((term) => getRelations(term)));
  for (const relations of relationsByTerm) {
    for (const rel of relations) {
      if (rel.type === "synonym") {
        expanded.add(rel.target);
      }
    }
  }

  return Array.from(expanded);
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or", "is", "are",
]);

// Returns semantically related tags to show in the UI
export async function getRelatedTags(query: string): Promise<RelatedTag[]> {
  const term = query.toLowerCase().trim();
  let relations = await getRelations(term);

  // Both Datamuse and ConceptNet key on single words (plus a few known fixed compounds),
  // so an arbitrary multi-word query like "eating apple" won't match as one unit. Fall back
  // to looking up each word separately and merging, so short phrases still populate the graph.
  if (relations.length === 0 && term.includes(" ")) {
    const words = term.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    const perWord = await Promise.all(words.map((w) => getRelations(w)));
    const seen = new Set<string>([term, ...words]);
    const cursors = perWord.map(() => 0);
    relations = [];

    // Round-robin across words so a short phrase reflects all its parts, not just the first
    while (relations.length < 8) {
      let progressed = false;
      for (let i = 0; i < perWord.length && relations.length < 8; i++) {
        while (cursors[i] < perWord[i].length) {
          const rel = perWord[i][cursors[i]++];
          if (seen.has(rel.target)) continue;
          relations.push(rel);
          seen.add(rel.target);
          progressed = true;
          break;
        }
      }
      if (!progressed) break;
    }
  }

  return relations.map((r) => ({ tag: r.target, relation: r.type }));
}

export interface GraphNode {
  id: string;
  label: string;
  relation: RelationType | "root";
  matchCount: number;
  matchedIds: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: RelationType;
}

// A tag "matches" a result if it appears as one of its own tags, or as a substring of its
// title/description — this is what lets the graph show which nodes are actually backed by
// the current result set, rather than being pure exploration suggestions.
function itemsMatchingTag(items: SearchItem[], tag: string): SearchItem[] {
  const needle = tag.toLowerCase();
  return items.filter((item) => {
    if (item.tags?.some((t) => t.toLowerCase() === needle)) return true;
    const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

// Builds a query-centered graph: the query is the root node, related tags branch off it.
// Unlike a fixed ontology, this reflects the live query so the map changes with every search.
// Each node also records which of the current result items it matches, so the graph can be
// used to explain/highlight the results already on screen, not just to launch new searches.
export function buildGraphNodes(
  query: string,
  relatedTags: RelatedTag[],
  items: SearchItem[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rootId = query.toLowerCase().trim();
  const nodes: GraphNode[] = [
    { id: rootId, label: query, relation: "root", matchCount: items.length, matchedIds: [] },
  ];
  const edges: GraphEdge[] = [];

  for (const { tag, relation } of relatedTags) {
    const matched = itemsMatchingTag(items, tag);
    nodes.push({
      id: tag,
      label: tag,
      relation,
      matchCount: matched.length,
      matchedIds: matched.map((i) => i.id),
    });
    edges.push({ source: rootId, target: tag, relation });
  }

  return { nodes, edges };
}
