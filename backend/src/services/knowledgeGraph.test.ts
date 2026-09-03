import test from "node:test";
import assert from "node:assert/strict";
import { buildGraphNodes, mergeRelations } from "./knowledgeGraph";
import { SearchItem } from "../connectors/types";

test("mergeRelations puts curated relations first", () => {
  const curated = [{ type: "broader" as const, target: "fundamental interaction", curated: true }];
  const lexical = [{ type: "related" as const, target: "solemnity" }];
  const result = mergeRelations(curated, lexical, 10);
  assert.deepEqual(result.map((r) => r.target), ["fundamental interaction", "solemnity"]);
});

test("mergeRelations drops a lexical duplicate of a curated target", () => {
  const curated = [{ type: "broader" as const, target: "gravitation", curated: true }];
  const lexical = [
    { type: "related" as const, target: "gravitation" }, // same word, lexical source — should lose
    { type: "related" as const, target: "relativity" },
  ];
  const result = mergeRelations(curated, lexical, 10);
  assert.deepEqual(result.map((r) => r.target), ["gravitation", "relativity"]);
  assert.equal(result[0].curated, true);
});

test("mergeRelations respects the overall cap", () => {
  const curated = [
    { type: "broader" as const, target: "a", curated: true },
    { type: "broader" as const, target: "b", curated: true },
  ];
  const lexical = [
    { type: "related" as const, target: "c" },
    { type: "related" as const, target: "d" },
  ];
  const result = mergeRelations(curated, lexical, 3);
  assert.equal(result.length, 3);
});

test("buildGraphNodes creates a root node reflecting all current results", () => {
  const items: SearchItem[] = [
    { id: "1", title: "Anything", url: "#", source: "Test", category: "texts" },
    { id: "2", title: "Anything else", url: "#", source: "Test", category: "texts" },
  ];
  const { nodes } = buildGraphNodes("newton", [], items);
  const root = nodes.find((n) => n.relation === "root");
  assert.ok(root);
  assert.equal(root!.id, "newton");
  assert.equal(root!.matchCount, 2);
});

test("buildGraphNodes creates one node and edge per related tag", () => {
  const { nodes, edges } = buildGraphNodes(
    "newton",
    [
      { tag: "gravitation", relation: "related", frequency: 100 },
      { tag: "calculus", relation: "narrower" },
    ],
    []
  );
  assert.equal(nodes.length, 3); // root + 2 related
  assert.equal(edges.length, 2);
  assert.deepEqual(edges[0], { source: "newton", target: "gravitation", relation: "related" });
});

test("buildGraphNodes only matches items genuinely related to a tag, not text sharing a short prefix", () => {
  // Regression for the stemming bug: "principia" and "prince" both start with "prin",
  // which used to make the royal-wedding item count as a match for the "principia" node.
  const items: SearchItem[] = [
    { id: "1", title: "Philosophiae Naturalis Principia Mathematica", url: "#", source: "Test", category: "texts" },
    { id: "2", title: "Prince Harry and Meghan Markle wedding day", url: "#", source: "Test", category: "images" },
  ];
  const { nodes } = buildGraphNodes("newton", [{ tag: "principia", relation: "related" }], items);
  const principiaNode = nodes.find((n) => n.id === "principia");
  assert.ok(principiaNode);
  assert.deepEqual(principiaNode!.matchedIds, ["1"]);
  assert.equal(principiaNode!.matchCount, 1);
});
