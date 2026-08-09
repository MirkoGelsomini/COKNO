import { SearchItem } from "../connectors/types";
import { BLOCKED_TERMS } from "../data/blockedTerms";

// Word-boundary matching for plain alphanumeric terms avoids false positives like
// "ass" flagging "classic" or "assassin"; terms with punctuation (e.g. "s&m", "g-spot")
// fall back to a plain substring match since \b doesn't apply cleanly to them.
const WORDY = /^[\w\s]+$/;

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BLOCKED_PATTERN = new RegExp(
  BLOCKED_TERMS.map((term) => {
    const escaped = escapeRegExp(term);
    return WORDY.test(term) ? `\\b${escaped}\\b` : escaped;
  }).join("|"),
  "i"
);

// Used to refuse the search outright when the query itself is explicit, rather than
// silently letting every connector run and filtering results after the fact.
export function isQueryBlocked(query: string): boolean {
  return BLOCKED_PATTERN.test(query);
}

function isSafe(item: SearchItem): boolean {
  const haystack = [item.title, item.description, ...(item.tags ?? [])].filter(Boolean).join(" ");
  return !BLOCKED_PATTERN.test(haystack);
}

export function filterSafe(items: SearchItem[]): SearchItem[] {
  return items.filter(isSafe);
}
