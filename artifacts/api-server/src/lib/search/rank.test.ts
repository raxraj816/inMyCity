import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { distanceScore, openNowScore, ratingScore, scoreResult } from "./rank";

describe("scoreResult", () => {
  it("lets text relevance dominate", () => {
    const relevant = scoreResult({ relevance: 1, rating: null, distanceKm: 10, isOpen: false });
    const irrelevant = scoreResult({ relevance: 0.2, rating: 5, distanceKm: 0, isOpen: true });
    assert.ok(relevant > irrelevant);
  });

  it("prefers the closer of two equally relevant results", () => {
    const near = scoreResult({ relevance: 0.8, rating: 4, distanceKm: 0.5, isOpen: true });
    const far = scoreResult({ relevance: 0.8, rating: 4, distanceKm: 9, isOpen: true });
    assert.ok(near > far);
  });

  it("prefers the better rated of two equally relevant results", () => {
    const good = scoreResult({ relevance: 0.8, rating: 4.6, distanceKm: 2, isOpen: true });
    const poor = scoreResult({ relevance: 0.8, rating: 3.1, distanceKm: 2, isOpen: true });
    assert.ok(good > poor);
  });

  it("prefers open over closed, all else equal", () => {
    const open = scoreResult({ relevance: 0.8, rating: 4, distanceKm: 2, isOpen: true });
    const closed = scoreResult({ relevance: 0.8, rating: 4, distanceKm: 2, isOpen: false });
    assert.ok(open > closed);
  });

  it("treats unknown values as neutral rather than as bad", () => {
    assert.equal(ratingScore(null), 0.5);
    assert.equal(distanceScore(undefined), 0.5);
    assert.equal(openNowScore(null), 0.5);

    const unknown = scoreResult({ relevance: 0.8, rating: null, distanceKm: null, isOpen: null });
    const bad = scoreResult({ relevance: 0.8, rating: 1, distanceKm: 40, isOpen: false });
    assert.ok(unknown > bad);
  });

  it("stays within 0 and 1 for out-of-range inputs", () => {
    assert.equal(scoreResult({ relevance: 5, rating: 9, distanceKm: -3, isOpen: true }), 1);
    assert.equal(scoreResult({ relevance: -1, rating: -1, distanceKm: 1000, isOpen: false }), 0);
  });
});
