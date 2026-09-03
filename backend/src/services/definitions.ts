import { SearchItem, withTimeout } from "../connectors/types";
import { textRelatesToQuery } from "./textRelevance";
import merriamwebster from "../connectors/texts/merriamwebster";
import cambridge from "../connectors/texts/cambridge";
import etymonline from "../connectors/texts/etymonline";
import treccani from "../connectors/texts/treccani";

// Shown as a dedicated "Definizione" box instead of as regular grid cards
export const DICTIONARY_SOURCES = new Set(["Merriam-Webster", "Cambridge Dictionary", "Etymonline", "Treccani"]);

const DICTIONARY_CONNECTORS = [merriamwebster, cambridge, etymonline, treccani];
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 20000;

// Round-robins across sources before capping, so one prolific source can't crowd out the rest
export function interleaveBySource(items: SearchItem[], cap: number): SearchItem[] {
  const bySource = new Map<string, SearchItem[]>();
  for (const item of items) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source)!.push(item);
  }
  const buckets = [...bySource.values()];
  const result: SearchItem[] = [];
  for (let i = 0; result.length < cap; i++) {
    let addedAny = false;
    for (const bucket of buckets) {
      if (i < bucket.length) {
        result.push(bucket[i]);
        addedAny = true;
        if (result.length >= cap) break;
      }
    }
    if (!addedAny) break;
  }
  return result;
}

// Etymonline/Treccani run whole-site search, so a multi-word query can surface an entry that
// only mentions a word in passing (e.g. "eating apple" -> "melon"). Require the entry's own
// title, not just its body, to relate to the query.
export function isTitleRelevant(title: string, query: string): boolean {
  return textRelatesToQuery(title, query);
}

// Looks up a term directly against the dictionary connectors — used both to pull definitions
// out of a full search and standalone for the concept page (which may need one even when the
// current search never touched texts).
export async function fetchDefinitionsFor(term: string, safe: boolean, cap = 6): Promise<SearchItem[]> {
  const results = await Promise.all(
    DICTIONARY_CONNECTORS.map((c) => withTimeout(c.search(term, 1, safe), c.name, CONNECTOR_TIMEOUT_MS))
  );
  const items = results.flatMap((r) => r.items).filter((i) => isTitleRelevant(i.title, term));
  return interleaveBySource(items, cap);
}
