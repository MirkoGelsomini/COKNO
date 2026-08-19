// Semantic knowledge graph — models conceptual relationships for query expansion

import { SearchItem } from "../connectors/types";
import { textRelatesToQuery } from "./textRelevance";
import { fetchFromWikidata } from "./wikidata";
import { fetchJson } from "./fetchJson";

type RelationType = "synonym" | "related" | "broader" | "narrower";

interface Relation {
  type: RelationType;
  target: string;
  frequency?: number; // 0-100 vs top scorer in its relation type; unset for curated (Wikidata) relations
  curated?: boolean; // true for structured facts (Wikidata), unset for lexical association
}

export interface RelatedTag {
  tag: string;
  relation: RelationType;
  frequency?: number;
  curated?: boolean;
}

const RELATIONS_CACHE_TTL_MS = 30 * 60 * 1000;
const relationsCache = new Map<string, { relations: Relation[]; expiresAt: number }>();
// De-dups concurrent callers requesting the same term (e.g. expandQuery + getRelatedTags
// racing Wikidata for the same tag) so they share one in-flight request instead of each
// getting an independent, possibly-empty result.
const inFlightRelations = new Map<string, Promise<Relation[]>>();
const NODE_CAP = 12; // related nodes shown per query, plus the root
const RELATED_CAP = 7; // trigger/context words need more headroom than lexical relations
// Per-word cap for the multi-word fallback: higher than RELATED_CAP since each word's list
// still wastes a slot on the other query word before the outer merge filters it back out.
const MULTIWORD_RELATED_CAP = 10;

// Datamuse: no API key needed. rel_* codes map to our taxonomy.
async function fetchFromDatamuse(term: string, relatedCap: number = RELATED_CAP): Promise<Relation[]> {
  const encoded = encodeURIComponent(term);
  // md=p: part-of-speech tags, used by ambiguityRank below. rel_trg's own max is 15, not 6 like
  // the others — it was cutting contextual words (e.g. "waterloo" for "napoleon") out of the
  // pool entirely, before ranking/capping even got a chance to consider them.
  const [syn, gen, spc, trg] = await Promise.all([
    fetchJson(`https://api.datamuse.com/words?rel_syn=${encoded}&max=10&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_gen=${encoded}&max=8&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_spc=${encoded}&max=8&md=p`),
    fetchJson(`https://api.datamuse.com/words?rel_trg=${encoded}&max=15&md=p`),
  ]);

  const relations: Relation[] = [];
  const seen = new Set<string>([term.toLowerCase()]);

  // Prefer noun-tagged, fewer-POS candidates — cuts down on wrong-sense synonyms
  // (e.g. "prime" as in peak/heyday showing up for "flower").
  const ambiguityRank = (tags: string[] | undefined): number => {
    if (!tags?.length) return 5;
    const posTags = tags.filter((t) => t === "n" || t === "v" || t === "adj" || t === "adv");
    const hasNoun = posTags.includes("n");
    return (hasNoun ? 0 : 10) + (posTags.length || 1);
  };

  // Discard candidates scoring below 20% of their list's top scorer — trims rare/wrong-sense tails
  const FREQUENCY_FLOOR = 0.2;

  const addAll = (list: any[] | undefined, type: RelationType, cap: number) => {
    const pool = list ?? [];
    const maxScore = Math.max(0, ...pool.map((e) => e?.score ?? 0));
    const frequent = pool.filter((e) => (e?.score ?? 0) >= maxScore * FREQUENCY_FLOOR);
    const ranked = frequent.sort((a, b) => ambiguityRank(a.tags) - ambiguityRank(b.tags));
    let added = 0;
    for (const entry of ranked) {
      if (added >= cap || relations.length >= NODE_CAP) break;
      const target: string | undefined = entry?.word?.toLowerCase();
      if (!target || seen.has(target)) continue;
      const frequency = maxScore > 0 ? Math.round(((entry?.score ?? 0) / maxScore) * 100) : undefined;
      relations.push({ type, target, frequency });
      seen.add(target);
      added++;
    }
  };

  // Synonym cap stays at 3 (not raised with the others): 4 reintroduced "prime" for "flower"
  addAll(syn, "synonym", 3);
  addAll(gen, "broader", 3);
  addAll(spc, "narrower", 3);
  addAll(trg, "related", relatedCap);

  return relations;
}

// Curated facts lead, lexical association fills in the rest: dedupes by target (a curated
// entry wins over a lexical one for the same word) and caps the combined list at NODE_CAP so
// layering a second source never blows up the graph size. Pure/exported for testing.
export function mergeRelations(curated: Relation[], lexical: Relation[], cap: number): Relation[] {
  const seen = new Set(curated.map((r) => r.target));
  const rest = lexical.filter((r) => !seen.has(r.target));
  return [...curated, ...rest].slice(0, cap);
}

async function getRelations(term: string, relatedCap: number = RELATED_CAP): Promise<Relation[]> {
  const cacheKey = `${term}::${relatedCap}`;
  const cached = relationsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.relations;

  const pending = inFlightRelations.get(cacheKey);
  if (pending) return pending;

  const promise = (async (): Promise<Relation[]> => {
    const [curated, lexical] = await Promise.all([
      fetchFromWikidata(term),
      fetchFromDatamuse(term, relatedCap),
    ]);
    const relations = mergeRelations(curated, lexical, NODE_CAP);

    // Only cache real results, so a failure doesn't parrot the outage for the full TTL
    if (relations.length > 0) {
      relationsCache.set(cacheKey, { relations, expiresAt: Date.now() + RELATIONS_CACHE_TTL_MS });
    }
    return relations;
  })();

  inFlightRelations.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightRelations.delete(cacheKey);
  }
}

export async function expandQuery(query: string): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>(terms);

  // Parallel per term, so a slow lookup costs one timeout, not one per word
  const relationsByTerm = await Promise.all(terms.map((term) => getRelations(term)));
  relationsByTerm.flat().forEach((rel) => rel.type === "synonym" && expanded.add(rel.target));

  return Array.from(expanded);
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or", "is", "are",
]);

export async function getRelatedTags(query: string): Promise<RelatedTag[]> {
  const term = query.toLowerCase().trim();
  let relations = await getRelations(term);

  // Multi-word queries rarely match as a single unit — fall back to per-word lookup, merged
  if (relations.length === 0 && term.includes(" ")) {
    const words = term.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    const perWord = await Promise.all(words.map((w) => getRelations(w, MULTIWORD_RELATED_CAP)));
    const seen = new Set<string>([term, ...words]);
    const cursors = perWord.map(() => 0);
    relations = [];

    // Round-robin so a short phrase reflects all its words, not just the first
    while (relations.length < NODE_CAP) {
      let progressed = false;
      for (let i = 0; i < perWord.length && relations.length < NODE_CAP; i++) {
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

  return relations.map((r) => ({ tag: r.target, relation: r.type, frequency: r.frequency, curated: r.curated }));
}

export interface ConceptPathStep {
  tag: string;
  relation: RelationType | "start";
}

const PATH_MAX_DEPTH = 3; // hops
const PATH_MAX_NODES = 60; // total lookups before giving up, keeps this bounded

// Breadth-first search over the same relations used elsewhere: expand one "ring" of
// neighbors at a time (in parallel), stop as soon as `to` is found. Unweighted — the
// first path found is the shortest by hop count, no preference between relation types.
export async function findConceptPath(from: string, to: string): Promise<ConceptPathStep[] | null> {
  const start = from.toLowerCase().trim();
  const target = to.toLowerCase().trim();
  if (start === target) return [{ tag: from, relation: "start" }];

  const visited = new Set<string>([start]);
  let frontier: { term: string; path: ConceptPathStep[] }[] = [
    { term: start, path: [{ tag: from, relation: "start" }] },
  ];
  let explored = 0;

  for (let depth = 0; depth < PATH_MAX_DEPTH && frontier.length && explored < PATH_MAX_NODES; depth++) {
    const batch = frontier.slice(0, PATH_MAX_NODES - explored);
    explored += batch.length;
    const results = await Promise.all(batch.map((f) => getRelations(f.term)));

    const nextFrontier: typeof frontier = [];
    for (let i = 0; i < batch.length; i++) {
      for (const rel of results[i]) {
        if (rel.target === target) return [...batch[i].path, { tag: rel.target, relation: rel.type }];
        if (!visited.has(rel.target)) {
          visited.add(rel.target);
          nextFrontier.push({ term: rel.target, path: [...batch[i].path, { tag: rel.target, relation: rel.type }] });
        }
      }
    }
    frontier = nextFrontier;
  }

  return null;
}

export interface GraphNode {
  id: string;
  label: string;
  relation: RelationType | "root";
  matchCount: number;
  matchedIds: string[];
  frequency?: number;
  curated?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: RelationType;
}

// A tag "matches" a result via its own tags, or stemmed against title/description
function itemsMatchingTag(items: SearchItem[], tag: string): SearchItem[] {
  const needle = tag.toLowerCase();
  return items.filter((item) => {
    if (item.tags?.some((t) => t.toLowerCase() === needle)) return true;
    const haystack = `${item.title} ${item.description ?? ""}`;
    return textRelatesToQuery(haystack, tag);
  });
}

// Query-centered graph: root is the query, related tags branch off it, each recording which
// current result items it matches (for filtering/highlighting the results list).
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

  for (const { tag, relation, frequency, curated } of relatedTags) {
    const matched = itemsMatchingTag(items, tag);
    nodes.push({
      id: tag,
      label: tag,
      relation,
      matchCount: matched.length,
      matchedIds: matched.map((i) => i.id),
      frequency,
      curated,
    });
    edges.push({ source: rootId, target: tag, relation });
  }

  return { nodes, edges };
}
