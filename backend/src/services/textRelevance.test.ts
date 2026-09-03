import test from "node:test";
import assert from "node:assert/strict";
import { sameStem, textRelatesToQuery } from "./textRelevance";

test("sameStem matches simple inflections", () => {
  assert.equal(sameStem("eat", "eating"), true);
  assert.equal(sameStem("cat", "cats"), true);
});

test("sameStem does not collide unrelated words that merely share a short prefix", () => {
  // Regression: a 4-char prefix cap used to treat "principia" and "prince" as the same
  // concept (both start "prin"), pulling royal-wedding results into a Newton search.
  assert.equal(sameStem("principia", "prince"), false);
  assert.equal(sameStem("gravity", "gravy"), false);
});

test("sameStem still matches genuinely related longer words", () => {
  assert.equal(sameStem("principia", "principle"), true);
  assert.equal(sameStem("relativity", "relative"), true);
});

test("textRelatesToQuery finds a shared stem between text and query", () => {
  assert.equal(textRelatesToQuery("A gravity-defying apple floats above a hand", "gravity"), true);
});

test("textRelatesToQuery rejects text that only coincidentally shares a short prefix", () => {
  assert.equal(
    textRelatesToQuery("Prince Harry and Meghan Markle wedding day", "principia"),
    false
  );
});

test("textRelatesToQuery handles empty input without throwing", () => {
  assert.equal(textRelatesToQuery("", "anything"), false);
});
