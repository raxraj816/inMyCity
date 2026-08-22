import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  hasDevanagari,
  normalizeSearchText,
  toSearchWords,
  transliterateDevanagari,
} from "./normalize";

describe("normalizeSearchText", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    assert.equal(normalizeSearchText("  Leopold  Cafe & Bar!  "), "leopold cafe bar");
  });

  it("strips Latin accents so accented content stays reachable", () => {
    assert.equal(normalizeSearchText("Café Métro"), "cafe metro");
  });

  it("keeps digits, which carry meaning in queries like 'under 500'", () => {
    assert.equal(normalizeSearchText("Under 500"), "under 500");
  });

  it("returns an empty string for absent input", () => {
    assert.equal(normalizeSearchText(null), "");
    assert.equal(normalizeSearchText(undefined), "");
    assert.equal(normalizeSearchText("   "), "");
  });
});

describe("transliterateDevanagari", () => {
  it("leaves Latin text untouched", () => {
    assert.equal(transliterateDevanagari("vada pav"), "vada pav");
    assert.equal(hasDevanagari("vada pav"), false);
  });

  it("renders the inherent vowel on a bare consonant", () => {
    // Approximate by design — "ई" becomes "ee" — which is close enough for a trigram match.
    // The exact spelling users type is carried by the city's alias list, not by this.
    assert.equal(transliterateDevanagari("मुंबई"), "munbaee");
  });

  it("lets a matra replace the inherent vowel", () => {
    assert.equal(normalizeSearchText("वडा पाव"), "vada pava");
  });

  it("drops the inherent vowel after a virama", () => {
    assert.equal(transliterateDevanagari("क्ष"), "ksha");
  });

  it("produces something a trigram match can work with for station names", () => {
    // Not a perfect romanization, and it does not need to be: the curated alias list
    // carries the exact spelling, and this only has to land close.
    assert.match(normalizeSearchText("सीएसटी"), /^s.*t/);
  });
});

describe("toSearchWords", () => {
  it("drops stop words and single characters", () => {
    assert.deepEqual(toSearchWords("bars near me in bandra"), ["bars", "bandra"]);
  });

  it("keeps every meaningful word", () => {
    assert.deepEqual(toSearchWords("rooftop bar bandra"), ["rooftop", "bar", "bandra"]);
  });
});
