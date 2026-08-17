// Shared-prefix stem check, so simple inflections (eat/eating) still count as related.
// Capped at 6 rather than 4: a 4-char cap let unrelated words that merely start the same
// collide on longer terms (e.g. "principia" ~ "prince", both "prin"); short words are
// unaffected since min(a.length, b.length, 6) still shrinks to their own length.
export function sameStem(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, 6);
  return n >= 3 && a.slice(0, n) === b.slice(0, n);
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length > 2);
}

export function textRelatesToQuery(text: string, query: string): boolean {
  const textWords = words(text);
  const queryWords = words(query);
  return textWords.some((tw) => queryWords.some((qw) => sameStem(tw, qw)));
}
