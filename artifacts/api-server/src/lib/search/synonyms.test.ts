import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { expandSearchQuery } from "./synonyms";

describe("expandSearchQuery", () => {
  it("keeps the user's own wording first", () => {
    const expanded = expandSearchQuery("Vada Pav");
    assert.equal(expanded.phrases[0], "vada pav");
  });

  it("reaches the same phrases from every spelling of a dish", () => {
    const spellings = ["vada pav", "vadapav", "vada paav", "वडा पाव"];
    const sets = spellings.map((spelling) => new Set(expandSearchQuery(spelling).phrases));

    for (const set of sets) {
      assert.ok(set.has("vada pav"), "expected every spelling to reach the canonical form");
      assert.ok(set.has("vadapav"));
    }
  });

  it("expands station abbreviations to the full terminus name", () => {
    const expanded = expandSearchQuery("cst");
    assert.ok(expanded.phrases.includes("chhatrapati shivaji maharaj terminus"));
    assert.ok(expanded.phrases.includes("csmt"));
  });

  it("expands a term embedded in a longer query without losing the rest", () => {
    const expanded = expandSearchQuery("bar in bandra");
    assert.ok(expanded.phrases.includes("pub in bandra"));
    assert.equal(expanded.phrases[0], "bar in bandra");
  });

  it("only matches whole words, so 'bar' does not fire inside 'bandra'", () => {
    const expanded = expandSearchQuery("bandra");
    assert.ok(!expanded.phrases.some((phrase) => phrase.includes("pub")));
  });

  it("caps the number of alternatives so one query cannot explode into a huge OR", () => {
    const expanded = expandSearchQuery("mumbai");
    assert.ok(expanded.phrases.length <= 16);
  });

  it("returns nothing to match on for an empty query", () => {
    const expanded = expandSearchQuery("   ");
    assert.equal(expanded.normalized, "");
    assert.deepEqual(expanded.phrases, []);
    assert.deepEqual(expanded.words, []);
  });

  it("falls back to the query itself for a city with no curated vocabulary", () => {
    const expanded = expandSearchQuery("vada pav", "san-francisco");
    assert.deepEqual(expanded.phrases, ["vada pav"]);
  });
});
