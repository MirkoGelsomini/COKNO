import { SearchItem } from "../connectors/types";
import { BLOCKED_TERMS } from "../data/blockedTerms";

// Word-boundary match avoids false positives like "ass" in "classic"; punctuated terms fall back to substring
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
