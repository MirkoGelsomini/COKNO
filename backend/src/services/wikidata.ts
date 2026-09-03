// Curated structured facts from Wikidata, complementing Datamuse's lexical associations. No API key needed.

import { fetchJson } from "./fetchJson";

export interface WikidataRelation {
  type: "broader" | "related";
  target: string;
  curated: true;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // facts change less often than word associations
const cache = new Map<string, { relations: WikidataRelation[]; expiresAt: number }>();

// Wikidata property -> [our relation type, how many values to keep]
const RELEVANT_PROPERTIES: Record<string, { type: "broader" | "related"; cap: number }> = {
  P279: { type: "broader", cap: 2 }, // subclass of
  P361: { type: "broader", cap: 2 }, // part of
  P31: { type: "broader", cap: 2 }, // instance of
  P828: { type: "related", cap: 2 }, // has cause
  P1542: { type: "related", cap: 2 }, // has effect
  P2579: { type: "related", cap: 2 }, // studied in
};

const MAX_RELATIONS = 8; // leaves room for lexical relations up to NODE_CAP
const MIN_SITELINKS = 3; // notability floor, filters out coincidental homonyms (see resolveBestEntity)
const MAX_CANDIDATES = 8;

async function searchCandidateIds(term: string): Promise<string[]> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&format=json&limit=5`;
  const data = await fetchJson(url);
  return (data?.search ?? []).map((r: any) => r.id).filter(Boolean);
}

// Crude singular guess used as a fallback candidate source, not authoritative on its own.
function naiveSingular(term: string): string | undefined {
  if (term.endsWith("ies") && term.length > 4) return term.slice(0, -3) + "y";
  if (term.endsWith("s") && !term.endsWith("ss") && term.length > 3) return term.slice(0, -1);
  return undefined;
}

// Picks the most notable (by sitelink count) candidate with a usable claim, rather than
// trusting the top search hit — that's what let an obscure company outrank the real concept
// for a term like "integrals".
async function scoreCandidates(ids: string[]): Promise<any | undefined> {
  if (ids.length === 0) return undefined;
  const data = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=sitelinks|claims&format=json`
  );
  if (!data?.entities) return undefined;

  let best: { entity: any; sitelinks: number } | undefined;
  for (const id of ids) {
    const entity = data.entities[id];
    if (!entity) continue;
    const sitelinks = Object.keys(entity.sitelinks ?? {}).length;
    if (sitelinks < MIN_SITELINKS) continue;
    if (!Object.keys(RELEVANT_PROPERTIES).some((p) => entity.claims?.[p])) continue;
    if (!best || sitelinks > best.sitelinks) best = { entity, sitelinks };
  }
  return best?.entity;
}

// Tries the term as typed first; only searches a singular guess too if that finds nothing —
// keeps the common case to one Wikidata round trip instead of always doubling it.
async function resolveBestEntity(term: string): Promise<any | undefined> {
  const primaryIds = await searchCandidateIds(term);
  const primaryBest = await scoreCandidates(primaryIds.slice(0, MAX_CANDIDATES));
  if (primaryBest) return primaryBest;

  const singular = naiveSingular(term);
  if (!singular) return undefined;
  const singularIds = await searchCandidateIds(singular);
  const extraIds = singularIds.filter((id) => !primaryIds.includes(id)).slice(0, MAX_CANDIDATES);
  return scoreCandidates(extraIds);
}

async function resolveLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (ids.length === 0) return labels;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels&languages=en&format=json`;
  const data = await fetchJson(url);
  for (const id of ids) {
    const label = data?.entities?.[id]?.labels?.en?.value;
    if (label) labels.set(id, label);
  }
  return labels;
}

function extractCandidates(claims: any): { id: string; type: "broader" | "related" }[] {
  const candidates: { id: string; type: "broader" | "related" }[] = [];
  for (const [prop, { type, cap }] of Object.entries(RELEVANT_PROPERTIES)) {
    const values = claims[prop];
    if (!values) continue;
    for (const claim of values.slice(0, cap)) {
      const value = claim?.mainsnak?.datavalue?.value;
      if (value?.["entity-type"] === "item" && value?.id) candidates.push({ id: value.id, type });
    }
  }
  return candidates;
}

export async function fetchFromWikidata(term: string): Promise<WikidataRelation[]> {
  const key = term.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.relations;

  const entity = await resolveBestEntity(term);
  const candidates = entity?.claims ? extractCandidates(entity.claims) : [];
  const labels = await resolveLabels(candidates.map((c) => c.id));

  const relations: WikidataRelation[] = [];
  const seen = new Set<string>([key]);
  for (const { id, type } of candidates) {
    if (relations.length >= MAX_RELATIONS) break;
    const label = labels.get(id)?.toLowerCase();
    if (!label || seen.has(label)) continue;
    relations.push({ type, target: label, curated: true });
    seen.add(label);
  }

  // Only cache real results, so a failure doesn't parrot the outage for the full TTL
  if (relations.length > 0) cache.set(key, { relations, expiresAt: Date.now() + CACHE_TTL_MS });
  return relations;
}
