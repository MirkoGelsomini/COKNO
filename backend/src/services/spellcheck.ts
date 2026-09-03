import { ENGLISH_WORDS } from "../data/englishWords";

const WORD_LIST = ENGLISH_WORDS.split(" ");
const WORD_SET = new Set(WORD_LIST);

// Indexed by length so lookups scan only nearby-length words, not all ~370k entries
const WORDS_BY_LENGTH = new Map<number, string[]>();
for (const w of WORD_LIST) {
  const bucket = WORDS_BY_LENGTH.get(w.length);
  if (bucket) bucket.push(w);
  else WORDS_BY_LENGTH.set(w.length, [w]);
}

// Levenshtein + adjacent-transposition as a single edit (plain Levenshtein charges 2 for a
// swap like "recieve"->"receive", which lost to unrelated 1-substitution words)
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

const MAX_EDIT_DISTANCE = 2; // a wrong guess is worse than no guess
const MIN_WORD_LENGTH = 4; // below this, too many unrelated real words sit within distance 2

// Null if already recognized, too short, or nothing close enough for a confident fix
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

// Corrected query if any word looks like a confident typo fix, else null — only ever powers
// an optional "did you mean" hint, never applied to the search itself
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
