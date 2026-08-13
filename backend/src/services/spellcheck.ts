import { ENGLISH_WORDS } from "../data/englishWords";

const WORD_LIST = ENGLISH_WORDS.split(" ");
const WORD_SET = new Set(WORD_LIST);

// Indexed by length so a lookup only has to scan words within a couple characters of the
// target instead of all ~370k entries — a genuine typo rarely changes a word's length by
// more than the edit distance we're willing to accept anyway.
const WORDS_BY_LENGTH = new Map<number, string[]>();
for (const w of WORD_LIST) {
  const bucket = WORDS_BY_LENGTH.get(w.length);
  if (bucket) bucket.push(w);
  else WORDS_BY_LENGTH.set(w.length, [w]);
}

// Optimal-string-alignment distance: standard Levenshtein (insert/delete/substitute) plus
// adjacent-transposition as a single edit. Plain Levenshtein charges 2 for swapped letters
// (e.g. "recieve" -> "receive" is a transposition), which made it lose to an unrelated word
// only 1 substitution away (it picked "relieve" over "receive") — transpositions are one of
// the most common typo types, so this is worth the extra check.
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// Only ever suggests close, confident corrections — a wrong guess is worse than no guess.
const MAX_EDIT_DISTANCE = 2;
const MIN_WORD_LENGTH = 4; // below this, too many unrelated real words sit within distance 2

// Returns the closest dictionary word to `word`, or null if the word is already recognized,
// too short to safely correct, or nothing in the dictionary is close enough to be a confident
// fix (proper nouns, technical terms, foreign words: silence beats a wrong correction).
function closestWord(word: string): string | null {
  if (word.length < MIN_WORD_LENGTH || WORD_SET.has(word)) return null;

  let best: string | null = null;
  let bestDistance = MAX_EDIT_DISTANCE + 1;

  for (let len = word.length - MAX_EDIT_DISTANCE; len <= word.length + MAX_EDIT_DISTANCE; len++) {
    const candidates = WORDS_BY_LENGTH.get(len);
    if (!candidates) continue;
    for (const candidate of candidates) {
      const d = editDistance(word, candidate);
      if (d < bestDistance) {
        bestDistance = d;
        best = candidate;
        if (d === 1) return best; // as confident as this gets — stop early
      }
    }
  }

  return bestDistance <= MAX_EDIT_DISTANCE ? best : null;
}

// Checks each word of a query against the dictionary and, if at least one looks like a typo
// with a confident fix, returns a corrected version of the whole query — otherwise null. Never
// applied to the search itself: this only powers an optional "did you mean" suggestion the
// user can act on or ignore, so a wrong guess costs nothing beyond an unhelpful hint.
export function suggestCorrection(query: string): string | null {
  const words = query.split(/\s+/);
  let changed = false;

  const corrected = words.map((w) => {
    const cleaned = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!cleaned) return w;
    const fix = closestWord(cleaned);
    if (fix && fix !== cleaned) {
      changed = true;
      return fix;
    }
    return w;
  });

  return changed ? corrected.join(" ") : null;
}
