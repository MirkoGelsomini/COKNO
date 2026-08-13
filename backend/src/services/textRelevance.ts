// Shared, lightweight "does this text relate to this word" check used by every relevance
// filter in the app (batch-level fallback-content detection, definition title filtering).
// Uses a short shared-prefix comparison rather than exact matching so simple inflections
// (eat/eating, apple/apples) still count as related — important because some connectors
// only look up the first word of a query and return results keyed to its base form.
export function sameStem(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, 4);
  return n >= 3 && a.slice(0, n) === b.slice(0, n);
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length > 2);
}

// True if any word in `text` shares a stem with any word in `query`.
export function textRelatesToQuery(text: string, query: string): boolean {
  const textWords = words(text);
  const queryWords = words(query);
  return textWords.some((tw) => queryWords.some((qw) => sameStem(tw, qw)));
}
