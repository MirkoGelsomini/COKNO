// Semantic knowledge graph — models conceptual relationships for query expansion

import { SearchItem } from "../connectors/types";
import { textRelatesToQuery } from "./textRelevance";

type RelationType = "synonym" | "related" | "broader" | "narrower";

interface Relation {
  type: RelationType;
  target: string;
  frequency?: number; // 0-100 vs top scorer in its relation type; unset for ConceptNet
}

export interface RelatedTag {
  tag: string;
  relation: RelationType;
  frequency?: number;
}

const FETCH_TIMEOUT_MS = 5000;
const RELATIONS_CACHE_TTL_MS = 30 * 60 * 1000;
const relationsCache = new Map<string, { relations: Relation[]; expiresAt: number }>();
const NODE_CAP = 12; // "una decina" of related nodes shown per query, plus the root
const RELATED_CAP = 7; // trigger/context words need more headroom than lexical relations
// Per-word cap when a multi-word query falls back to per-word lookup: higher than RELATED_CAP
// because each word's own list still wastes ~1 slot on the OTHER query word (e.g. "bonaparte"
// shows up in "napoleon"'s own trigger list) before the outer merge filters it back out.
const MULTIWORD_RELATED_CAP = 10;

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

// Datamuse: no API key needed, more reliably up than ConceptNet. rel_* codes map to our taxonomy.
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

// Fallback, tried only if Datamuse yields nothing
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
    if (relations.length >= NODE_CAP) break;
  }

  return relations;
}

async function getRelations(term: string, relatedCap: number = RELATED_CAP): Promise<Relation[]> {
  const cacheKey = `${term}::${relatedCap}`;
  const cached = relationsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.relations;

  let relations = await fetchFromDatamuse(term, relatedCap);
  if (relations.length === 0) relations = await fetchFromConceptNet(term);

  // Only cache real results, so a failure doesn't parrot the outage for the full TTL
  if (relations.length > 0) {
    relationsCache.set(cacheKey, { relations, expiresAt: Date.now() + RELATIONS_CACHE_TTL_MS });
  }
  return relations;
}

export async function expandQuery(query: string): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>(terms);

  // Parallel per term, so a slow lookup costs one timeout, not one per word
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

  return relations.map((r) => ({ tag: r.target, relation: r.type, frequency: r.frequency }));
}

export interface GraphNode {
  id: string;
  label: string;
  relation: RelationType | "root";
  matchCount: number;
  matchedIds: string[];
  frequency?: number;
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

  for (const { tag, relation, frequency } of relatedTags) {
    const matched = itemsMatchingTag(items, tag);
    nodes.push({
      id: tag,
      label: tag,
      relation,
      matchCount: matched.length,
      matchedIds: matched.map((i) => i.id),
      frequency,
    });
    edges.push({ source: rootId, target: tag, relation });
  }

  return { nodes, edges };
}
