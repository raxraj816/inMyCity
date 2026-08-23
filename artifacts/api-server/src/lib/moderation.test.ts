import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { STANDARD_RESPONSE_HOURS, URGENT_RESPONSE_HOURS, dueAtFor, responseWindowHours } from "./moderation";

/**
 * The response window is a legal obligation, not a preference: the IT Rules give 24 hours for
 * the sexual-content and impersonation categories and 72 for a general grievance. Getting the
 * mapping wrong means a queue sorted by the wrong deadline and a promise the app cannot keep.
 */
describe("responseWindowHours", () => {
  it("gives the short window to the categories that have one", () => {
    for (const reason of ["adult_content", "impersonation", "privacy", "harassment"]) {
      assert.equal(responseWindowHours(reason), URGENT_RESPONSE_HOURS, reason);
    }
  });

  it("gives the general window to everything else", () => {
    for (const reason of ["inaccurate", "spam", "hate_speech", "copyright", "illegal", "other"]) {
      assert.equal(responseWindowHours(reason), STANDARD_RESPONSE_HOURS, reason);
    }
  });

  it("treats an unknown reason as a general grievance rather than as no obligation", () => {
    assert.equal(responseWindowHours("something-new"), STANDARD_RESPONSE_HOURS);
  });
});

describe("dueAtFor", () => {
  it("stamps the deadline forward from when the report was filed", () => {
    const filed = new Date("2026-03-01T10:00:00.000Z");

    assert.equal(dueAtFor("impersonation", filed).toISOString(), "2026-03-02T10:00:00.000Z");
    assert.equal(dueAtFor("inaccurate", filed).toISOString(), "2026-03-04T10:00:00.000Z");
  });

  it("always lands in the future", () => {
    assert.ok(dueAtFor("spam").getTime() > Date.now());
  });
});
