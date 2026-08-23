import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { assertSeedAllowed, seedExternalId, slugify } from "./seedUpsert";

/**
 * The seed used to open by deleting every content table. These pin the two things that keep
 * the replacement safe: ids that are stable across runs, and guards that make the destructive
 * path impossible to reach by accident.
 */
const original = { ...process.env };

afterEach(() => {
  process.env.NODE_ENV = original.NODE_ENV;
  delete process.env.ALLOW_PRODUCTION_SEED;
  delete process.env.ALLOW_DESTRUCTIVE_SEED;
});

describe("slugify", () => {
  it("collapses punctuation and casing so a name yields one key", () => {
    assert.equal(slugify("Britannia & Co."), "britannia-co");
    assert.equal(slugify("  Bade   Miyan  "), "bade-miyan");
  });

  it("keeps accented characters from producing an empty key", () => {
    assert.equal(slugify("Café Mondegar"), "cafe-mondegar");
  });

  it("caps the length so a long title cannot produce an unbounded key", () => {
    assert.ok(slugify("x".repeat(200)).length <= 80);
  });
});

describe("seedExternalId", () => {
  it("is stable for the same natural key", () => {
    assert.equal(seedExternalId("place", "Mumbai", "Trishna"), seedExternalId("place", "Mumbai", "Trishna"));
  });

  it("separates the same name in two cities", () => {
    assert.notEqual(seedExternalId("place", "Mumbai", "Social"), seedExternalId("place", "Bangalore", "Social"));
  });

  it("separates the same name in two tables", () => {
    assert.notEqual(seedExternalId("place", "Mumbai", "Bastian"), seedExternalId("hotel", "Mumbai", "Bastian"));
  });

  it("skips missing key parts rather than leaving a hole in the id", () => {
    assert.equal(seedExternalId("deal", null, "Half price coffee"), "seed:deal:half-price-coffee");
  });
});

describe("assertSeedAllowed", () => {
  it("allows an ordinary development seed", () => {
    process.env.NODE_ENV = "development";
    assert.doesNotThrow(() => assertSeedAllowed({ destructive: false }));
  });

  it("refuses to seed production without an explicit opt-in", () => {
    process.env.NODE_ENV = "production";
    assert.throws(() => assertSeedAllowed({ destructive: false }), /NODE_ENV=production/);
  });

  it("allows a production seed when someone has said so out loud", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_PRODUCTION_SEED = "true";
    assert.doesNotThrow(() => assertSeedAllowed({ destructive: false }));
  });

  it("refuses a destructive seed in production even with the ordinary opt-in set", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_PRODUCTION_SEED = "true";
    process.env.ALLOW_DESTRUCTIVE_SEED = "true";
    assert.throws(() => assertSeedAllowed({ destructive: true }), /Refusing to run a destructive seed/);
  });

  it("refuses a destructive seed anywhere without its own opt-in", () => {
    process.env.NODE_ENV = "development";
    assert.throws(() => assertSeedAllowed({ destructive: true }), /ALLOW_DESTRUCTIVE_SEED/);
  });
});
