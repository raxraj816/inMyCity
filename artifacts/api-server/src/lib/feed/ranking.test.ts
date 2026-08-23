import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  AD_EVERY,
  AD_FIRST_SLOT,
  MAX_CURSOR_AGE_MS,
  bandFor,
  clampAsOf,
  decodeCursor,
  encodeCursor,
  interleave,
  rank,
  withAds,
  type Rankable,
} from "./ranking";

/**
 * The Pulse ordering.
 *
 * Pulse has no filters, so ordering is the only thing standing between the reader and the
 * content — which makes these rules worth pinning precisely. The properties that matter are
 * that the bands mean what the table in `ranking.ts` says, that one kind cannot take over the
 * column, and above all that the same `asOf` always yields the same order: paging is a slice
 * of this list, so a wobble here is a card repeating or vanishing mid-scroll.
 */

const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 86_400_000;

const item = (partial: Partial<Rankable> & { key: string; kind: Rankable["kind"] }): Rankable => ({
  at: NOW,
  ...partial,
});

describe("bandFor", () => {
  it("leads with an event inside the next day and demotes one further out", () => {
    assert.equal(bandFor(item({ key: "event:1", kind: "event", at: NOW + 6 * HOUR }), NOW), "now");
    assert.equal(bandFor(item({ key: "event:2", kind: "event", at: NOW + 3 * DAY }), NOW), "week");
    assert.equal(bandFor(item({ key: "event:3", kind: "event", at: NOW + 30 * DAY }), NOW), "around");
  });

  it("does not lead with an event that has already started", () => {
    assert.equal(bandFor(item({ key: "event:4", kind: "event", at: NOW - HOUR }), NOW), "around");
  });

  it("treats an offer as urgent only once it is nearly over", () => {
    assert.equal(bandFor(item({ key: "deal:1", kind: "deal", at: NOW + 12 * HOUR }), NOW), "now");
    assert.equal(bandFor(item({ key: "deal:2", kind: "deal", at: NOW + 5 * DAY }), NOW), "week");
    assert.equal(bandFor(item({ key: "deal:3", kind: "deal", at: NOW + 40 * DAY }), NOW), "around");
  });

  it("never calls an offer without an end date urgent", () => {
    // It has sat there for months and will sit there for months more. Nothing is running out.
    assert.equal(bandFor(item({ key: "deal:4", kind: "deal", at: NOW, dated: false }), NOW), "around");
  });

  it("bands news by how old it is", () => {
    assert.equal(bandFor(item({ key: "news:1", kind: "news", at: NOW - HOUR }), NOW), "now");
    assert.equal(bandFor(item({ key: "news:2", kind: "news", at: NOW - 8 * HOUR }), NOW), "week");
    assert.equal(bandFor(item({ key: "news:3", kind: "news", at: NOW - 4 * DAY }), NOW), "around");
  });

  it("puts a featured post at the top however old it is", () => {
    assert.equal(bandFor(item({ key: "post:1", kind: "post", at: NOW - 20 * DAY, featured: true }), NOW), "now");
    assert.equal(bandFor(item({ key: "post:2", kind: "post", at: NOW - 20 * DAY }), NOW), "around");
  });
});

describe("rank", () => {
  it("orders by band before anything else", () => {
    const ordered = rank(
      [
        item({ key: "news:old", kind: "news", at: NOW - 5 * DAY }),
        item({ key: "event:tonight", kind: "event", at: NOW + 4 * HOUR }),
        item({ key: "news:recent", kind: "news", at: NOW - 12 * HOUR }),
      ],
      NOW,
    );

    assert.deepEqual(
      ordered.map((entry) => entry.key),
      ["event:tonight", "news:recent", "news:old"],
    );
  });

  it("sorts by closeness to now inside a band, in both directions", () => {
    // A story from an hour ago and a gig in two hours are both "now"; the gig is nearer.
    const ordered = rank(
      [
        item({ key: "news:a", kind: "news", at: NOW - 2 * HOUR }),
        item({ key: "event:b", kind: "event", at: NOW + 1 * HOUR }),
      ],
      NOW,
    );

    assert.deepEqual(
      ordered.map((entry) => entry.key),
      ["event:b", "news:a"],
    );
  });

  it("is deterministic for a given clock, which is what makes paging safe", () => {
    const candidates = [
      item({ key: "deal:1", kind: "deal", at: NOW + DAY }),
      item({ key: "deal:2", kind: "deal", at: NOW + DAY }),
      item({ key: "news:1", kind: "news", at: NOW - HOUR }),
      item({ key: "event:1", kind: "event", at: NOW + HOUR }),
    ];

    const first = rank(candidates, NOW).map((entry) => entry.key);
    const again = rank([...candidates].reverse(), NOW).map((entry) => entry.key);

    assert.deepEqual(first, again);
  });

  it("hands out every candidate exactly once", () => {
    const candidates = Array.from({ length: 40 }, (_, index) =>
      item({ key: `news:${index}`, kind: "news", at: NOW - index * HOUR }),
    );

    const keys = rank(candidates, NOW).map((entry) => entry.key);
    assert.equal(new Set(keys).size, candidates.length);
  });
});

describe("interleave", () => {
  it("never leaves three cards of one kind in a row", () => {
    const ordered = interleave([
      item({ key: "deal:1", kind: "deal" }),
      item({ key: "deal:2", kind: "deal" }),
      item({ key: "deal:3", kind: "deal" }),
      item({ key: "deal:4", kind: "deal" }),
      item({ key: "news:1", kind: "news" }),
      item({ key: "event:1", kind: "event" }),
    ]);

    let run = 1;
    for (let index = 1; index < ordered.length; index += 1) {
      run = ordered[index].kind === ordered[index - 1].kind ? run + 1 : 1;
      assert.ok(run <= 2, `three ${ordered[index].kind} cards in a row at ${index}`);
    }
  });

  it("leaves a list that is already varied alone", () => {
    const input = [
      item({ key: "news:1", kind: "news" }),
      item({ key: "deal:1", kind: "deal" }),
      item({ key: "news:2", kind: "news" }),
    ];

    assert.deepEqual(
      interleave(input).map((entry) => entry.key),
      ["news:1", "deal:1", "news:2"],
    );
  });

  it("keeps everything when there is nothing to break a run with", () => {
    const input = Array.from({ length: 5 }, (_, index) => item({ key: `deal:${index}`, kind: "deal" }));
    assert.equal(interleave(input).length, 5);
  });
});

describe("withAds", () => {
  it("puts sponsored cards in fixed slots rather than ranking them", () => {
    const organic = Array.from({ length: 20 }, (_, index) => item({ key: `news:${index}`, kind: "news" }));
    const ads = [item({ key: "ad:1", kind: "ad" }), item({ key: "ad:2", kind: "ad" })];

    const merged = withAds(organic, ads);

    assert.equal(merged[AD_FIRST_SLOT].key, "ad:1");
    assert.equal(merged[AD_FIRST_SLOT + AD_EVERY + 1].key, "ad:2");
  });

  it("uses each ad once instead of repeating one to fill every slot", () => {
    const organic = Array.from({ length: 40 }, (_, index) => item({ key: `news:${index}`, kind: "news" }));
    const merged = withAds(organic, [item({ key: "ad:1", kind: "ad" })]);

    assert.equal(merged.filter((entry) => entry.kind === "ad").length, 1);
    assert.equal(merged.length, organic.length + 1);
  });

  it("leaves the feed untouched when nothing is booked", () => {
    const organic = [item({ key: "news:1", kind: "news" })];
    assert.deepEqual(withAds(organic, []), organic);
  });
});

describe("cursors", () => {
  it("round-trips", () => {
    const cursor = { asOf: NOW, offset: 40 };
    assert.deepEqual(decodeCursor(encodeCursor(cursor)), cursor);
  });

  it("reads anything it did not issue as the top of the feed", () => {
    for (const raw of ["", "not-base64!", Buffer.from("{}").toString("base64url"), "x".repeat(600), undefined, 12]) {
      assert.equal(decodeCursor(raw), null);
    }
  });

  it("refuses a negative offset", () => {
    assert.equal(decodeCursor(encodeCursor({ asOf: NOW, offset: -5 })), null);
  });

  it("will not let a cursor reach into the future", () => {
    // `asOf` decides which offers count as expired, and it arrives from the client.
    assert.equal(clampAsOf(NOW + 10 * DAY, NOW), NOW);
  });

  it("will not let a stale cursor resurrect finished offers", () => {
    assert.equal(clampAsOf(NOW - 30 * DAY, NOW), NOW - MAX_CURSOR_AGE_MS);
  });

  it("keeps a cursor from a few minutes ago exactly as it was", () => {
    assert.equal(clampAsOf(NOW - 5 * 60_000, NOW), NOW - 5 * 60_000);
  });
});
