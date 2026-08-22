import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { minutesIntoWeek } from "./sqlFilters";
import { getLocalDayAndMinute } from "./openingHours";

describe("minutesIntoWeek", () => {
  it("places an instant on the same week-long timeline isOpenAt uses", () => {
    // Wednesday 2026-08-19, 18:30 UTC → Thursday 00:00 in Asia/Kolkata (UTC+5:30).
    const date = new Date("2026-08-19T18:30:00Z");
    const { day, minute } = getLocalDayAndMinute(date);

    assert.equal(day, 4, "expected the city's clock to have rolled over to Thursday");
    assert.equal(minute, 0);
    assert.equal(minutesIntoWeek(date), 4 * 24 * 60);
  });

  it("uses the city's timezone rather than the server's", () => {
    // 20:00 UTC on a Saturday is already Sunday in Mumbai, so the week wraps to 0.
    const date = new Date("2026-08-22T20:00:00Z");
    assert.equal(minutesIntoWeek(date), 1 * 60 + 30);
  });

  it("stays inside one week", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-15T12:00:00Z", "2026-12-31T23:59:00Z"]) {
      const minutes = minutesIntoWeek(new Date(iso));
      assert.ok(minutes >= 0 && minutes < 7 * 24 * 60, `${iso} produced ${minutes}`);
    }
  });
});
