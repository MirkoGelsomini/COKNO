// Shared-prefix stem check, so simple inflections (eat/eating) still count as related
export function sameStem(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, 4);
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
