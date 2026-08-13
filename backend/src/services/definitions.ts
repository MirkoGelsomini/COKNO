import { SearchItem, withTimeout } from "../connectors/types";
import { textRelatesToQuery } from "./textRelevance";
import merriamwebster from "../connectors/texts/merriamwebster";
import cambridge from "../connectors/texts/cambridge";
import etymonline from "../connectors/texts/etymonline";
import treccani from "../connectors/texts/treccani";

// Connectors that return a short authoritative definition rather than a general
// article/media result. Pulled out of the grid so they can be shown as a dedicated
// "Definizione" box instead of being just another card among dozens.
export const DICTIONARY_SOURCES = new Set(["Merriam-Webster", "Cambridge Dictionary", "Etymonline", "Treccani"]);

const DICTIONARY_CONNECTORS = [merriamwebster, cambridge, etymonline, treccani];
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 20000;

// Round-robins across sources before capping, so a single source that returns lots of
// entries (e.g. Etymonline) can't crowd out the others (e.g. Cambridge Dictionary) —
// same fix as applied to graph relations, same reason: fair mix beats raw array order.
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

// Etymonline and Treccani run their own whole-site search for a query rather than a strict
// headword lookup (see those connectors' own comments), so for a multi-word query they can
// surface an entry for a completely different word whose etymology write-up merely mentions
// one of the query's words in passing — e.g. searching "eating apple" surfaces Etymonline's
// "melon" and "Pomona" entries, since both happen to reference "apple" while defining
// something else entirely. A definition should define one of the words you searched, not
// just reference it, so require the entry's own title (not its body text) to relate to the
// query.
export function isTitleRelevant(title: string, query: string): boolean {
  return textRelatesToQuery(title, query);
}

// Looks up a single term directly against only the dictionary connectors. Used both to
// pull definitions out of a full search's results (search.ts, no extra network calls
// since those connectors already ran) and standalone for the concept page, which needs a
// definition even when the current search never touched the texts category at all.
export async function fetchDefinitionsFor(term: string, safe: boolean, cap = 6): Promise<SearchItem[]> {
  const results = await Promise.all(
    DICTIONARY_CONNECTORS.map((c) => withTimeout(c.search(term, 1, safe), c.name, CONNECTOR_TIMEOUT_MS))
  );
  const items = results.flatMap((r) => r.items).filter((i) => isTitleRelevant(i.title, term));
  return interleaveBySource(items, cap);
}
