import test from "node:test";
import assert from "node:assert/strict";
import { suggestCorrection } from "./spellcheck";

test("suggestCorrection returns null for an already-correct query", () => {
  assert.equal(suggestCorrection("hello world"), null);
});

test("suggestCorrection returns null for words shorter than the minimum length", () => {
  // Below MIN_WORD_LENGTH (4), even a typo is left alone — too many unrelated real
  // short words would sit within edit distance 2.
  assert.equal(suggestCorrection("cat"), null);
  assert.equal(suggestCorrection("xyz"), null);
});

test("suggestCorrection fixes a misspelled word with a real dictionary word", () => {
  const result = suggestCorrection("gravty");
  assert.notEqual(result, null);
  assert.notEqual(result, "gravty");
});

test("suggestCorrection never mutates the input for a query with no confident fix", () => {
  assert.equal(suggestCorrection("newton principia gravitation"), null);
});
