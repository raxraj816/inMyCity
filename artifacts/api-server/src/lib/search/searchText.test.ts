import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildSearchText } from "./searchText";

describe("buildSearchText", () => {
  it("puts the name first, which is how relevance identifies an exact match", () => {
    const text = buildSearchText(["Trishna", "food", "Kala Ghoda"]);
    assert.equal(text.split(" ~ ")[0].trim(), "trishna");
  });

  it("pads both ends so whole-word matching works at the edges", () => {
    const text = buildSearchText(["Trishna", "food"]);
    assert.ok(text.startsWith(" "));
    assert.ok(text.endsWith(" "));
    assert.ok(text.includes(" trishna "));
  });

  it("separates fields so a phrase cannot match across two of them", () => {
    const text = buildSearchText(["Linking Road Bandra West", "food", ["pav bhaji"]]);
    assert.ok(!text.includes("west pav"));
  });

  it("flattens arrays and skips absent fields", () => {
    const text = buildSearchText(["Elco", null, undefined, ["chaat", "pani puri"]]);
    assert.equal(text, " elco ~ chaat ~ pani puri ");
  });

  it("normalizes every field the same way a query is normalized", () => {
    assert.equal(buildSearchText(["Café  Métro!"]), " cafe metro ");
  });

  it("returns an empty string when there is nothing to index", () => {
    assert.equal(buildSearchText([null, undefined, "  "]), "");
  });
});
