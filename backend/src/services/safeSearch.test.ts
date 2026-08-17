import test from "node:test";
import assert from "node:assert/strict";
import { isQueryBlocked, filterSafe } from "./safeSearch";
import { SearchItem } from "../connectors/types";

test("isQueryBlocked flags a query matching a blocked term", () => {
  assert.equal(isQueryBlocked("ass"), true);
});

test("isQueryBlocked uses word boundaries, not substring match", () => {
  // "ass" is blocked, but must not fire on words that merely contain it
  assert.equal(isQueryBlocked("classic"), false);
});

test("isQueryBlocked allows ordinary queries", () => {
  assert.equal(isQueryBlocked("gravity"), false);
  assert.equal(isQueryBlocked("newton"), false);
});

test("filterSafe removes only items whose text matches a blocked term", () => {
  const items: SearchItem[] = [
    { id: "1", title: "A classic physics diagram", url: "#", source: "Test", category: "images" },
    { id: "2", title: "Explicit ass content", url: "#", source: "Test", category: "images" },
  ];
  const result = filterSafe(items);
  assert.deepEqual(result.map((i) => i.id), ["1"]);
});
