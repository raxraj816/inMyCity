import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MUMBAI_LAUNCH_ZONES } from "./index";

/**
 * The neighbourhood zones are the single source of truth for City Guide, the neighbourhood
 * pages, CityPilot and the recommendations route. A zone missing a field does not fail to
 * compile — it renders as a blank section — so completeness is checked here instead.
 */
describe("MUMBAI_LAUNCH_ZONES", () => {
  it("has a unique id per zone", () => {
    const ids = MUMBAI_LAUNCH_ZONES.map((zone) => zone.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("gives every zone the full page: what it is for, how to get there, cost, and what to avoid", () => {
    for (const zone of MUMBAI_LAUNCH_ZONES) {
      assert.ok(zone.summary.length > 80, `${zone.id} has no real summary`);
      assert.ok(zone.gettingThere.length >= 2, `${zone.id} lists fewer than two ways in`);
      assert.ok(zone.avoid.length >= 2, `${zone.id} lists fewer than two things to avoid`);
      assert.ok(zone.highlights.length >= 3, `${zone.id} lists fewer than three anchors`);
      assert.ok(zone.costNote.length > 40, `${zone.id} has no cost guidance`);
      assert.ok(zone.monsoonNote.length > 20, `${zone.id} has no monsoon note`);
      assert.ok(zone.safetyContext.length > 20, `${zone.id} has no safety note`);
    }
  });

  it("keeps cost as bare numbers, so the screen formats them in the city's own currency", () => {
    for (const zone of MUMBAI_LAUNCH_ZONES) {
      assert.ok(Number.isFinite(zone.costPerPerson.min), `${zone.id} has no minimum`);
      assert.ok(
        zone.costPerPerson.max > zone.costPerPerson.min,
        `${zone.id} has a cost range that is not a range`,
      );
      assert.ok(zone.costPerPerson.min >= 0, `${zone.id} has a negative minimum`);
    }
  });

  it("never writes a currency symbol into copy — that is `formatPrice`'s job alone", () => {
    // A symbol written into a zone description is how a Mumbai row ends up priced in dollars.
    const symbols = /[₹$€£¥]|\bRs\.?\s?\d|\bUSD\b|\bINR\b/;

    for (const zone of MUMBAI_LAUNCH_ZONES) {
      const copy = [
        zone.summary,
        zone.costNote,
        zone.vibe,
        zone.monsoonNote,
        zone.safetyContext,
        ...zone.gettingThere,
        ...zone.avoid,
        ...zone.highlights,
      ].join(" ");

      assert.ok(!symbols.test(copy), `${zone.id} writes a currency into its copy`);
    }
  });
});
