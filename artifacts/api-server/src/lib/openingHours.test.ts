import test from "node:test";
import assert from "node:assert/strict";

import {
  getLocalDayAndMinute,
  isPlaceOpen,
  parseOpeningHours,
} from "./openingHours";

/**
 * Every instant is written as an IST wall-clock time with an explicit offset, so the
 * assertions read the way a Mumbai user would experience them. 2026-08-23 is a Sunday and
 * 2026-08-29 is the Saturday of the same week.
 */
const ist = (value: string) => new Date(`${value}+05:30`);

const SUNDAY = "2026-08-23";
const MONDAY = "2026-08-24";
const TUESDAY = "2026-08-25";
const WEDNESDAY = "2026-08-26";
const THURSDAY = "2026-08-27";
const SATURDAY = "2026-08-29";

// Real strings from the Mumbai seed data.
const BADE_MIYAN = "Daily 7pm-3am";
const LEOPOLD = "Daily 7:30am-12am";
const TRISHNA = "Daily 12pm-3:30pm, 6:30pm-11:30pm";
const ELEPHANTA = "Tue-Sun 9am-5pm";
const BRITANNIA = "Mon-Sat 12pm-4pm";
const MOHAMMED_ALI_RD = "Daily 9am-2am (busiest after 8pm)";
const GATEWAY = "24/7";
const SEA_LINK = "24/7 (toll road)";
const MTR = "Tue-Sun 6:30am-11am, 12pm-2pm, 3:30pm-7:30pm";
const KATZ = "Mon-Wed 8am-10:45pm, Thu-Sun 8am-12am";

test("late-night venues stay open past midnight", () => {
  // The old implementation computed `hour >= 19 && hour < 3`, which is never true, so
  // Bade Miyan showed Closed at every hour of every day.
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${MONDAY}T23:00:00`)), true);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${MONDAY}T20:00:00`)), true);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${TUESDAY}T02:00:00`)), true);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${TUESDAY}T02:59:00`)), true);

  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${TUESDAY}T03:00:00`)), false);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${TUESDAY}T06:00:00`)), false);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${TUESDAY}T18:59:00`)), false);
});

test("a Saturday night slot covers early Sunday morning", () => {
  // Requires comparing across the week boundary, not just within a single day.
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${SATURDAY}T23:30:00`)), true);
  assert.equal(isPlaceOpen(BADE_MIYAN, ist(`${SUNDAY}T01:00:00`)), true);
});

test("the answer depends on Mumbai's clock, not the server's", () => {
  // 18:00 UTC is 23:30 IST. A server reading its own local hours in UTC would see 18 and
  // report Bade Miyan closed; every Mumbai badge would be 5h30m out.
  const instant = new Date("2026-08-24T18:00:00Z");
  assert.equal(isPlaceOpen(BADE_MIYAN, instant), true);

  // 20:00 UTC is 01:30 IST the next day — still within the 7pm-3am window.
  assert.equal(isPlaceOpen(BADE_MIYAN, new Date("2026-08-24T20:00:00Z")), true);

  // 02:00 UTC is 07:30 IST, comfortably closed.
  assert.equal(isPlaceOpen(BADE_MIYAN, new Date("2026-08-25T02:00:00Z")), false);
});

test("midnight as a closing time means end of day", () => {
  assert.equal(isPlaceOpen(LEOPOLD, ist(`${MONDAY}T23:30:00`)), true);
  assert.equal(isPlaceOpen(LEOPOLD, ist(`${MONDAY}T08:00:00`)), true);
  assert.equal(isPlaceOpen(LEOPOLD, ist(`${MONDAY}T07:00:00`)), false);
  assert.equal(isPlaceOpen(LEOPOLD, ist(`${TUESDAY}T03:00:00`)), false);
});

test("day ranges include the days between their endpoints", () => {
  // The old substring match looked for the literal "wed" in "tue-sun 9am-5pm" and returned
  // null on Wednesdays, hiding the badge for most of the week.
  assert.equal(isPlaceOpen(ELEPHANTA, ist(`${WEDNESDAY}T12:00:00`)), true);
  assert.equal(isPlaceOpen(ELEPHANTA, ist(`${THURSDAY}T12:00:00`)), true);
  assert.equal(isPlaceOpen(ELEPHANTA, ist(`${SUNDAY}T12:00:00`)), true);

  // Closed Mondays.
  assert.equal(isPlaceOpen(ELEPHANTA, ist(`${MONDAY}T12:00:00`)), false);
  // Open days, but outside hours.
  assert.equal(isPlaceOpen(ELEPHANTA, ist(`${WEDNESDAY}T18:00:00`)), false);
});

test("a Mon-Sat venue is closed on Sunday", () => {
  assert.equal(isPlaceOpen(BRITANNIA, ist(`${SATURDAY}T13:00:00`)), true);
  assert.equal(isPlaceOpen(BRITANNIA, ist(`${MONDAY}T13:00:00`)), true);
  assert.equal(isPlaceOpen(BRITANNIA, ist(`${SUNDAY}T13:00:00`)), false);
});

test("multiple sittings inherit the segment's day spec", () => {
  assert.equal(isPlaceOpen(TRISHNA, ist(`${MONDAY}T14:00:00`)), true);
  assert.equal(isPlaceOpen(TRISHNA, ist(`${MONDAY}T20:00:00`)), true);
  // The afternoon break between sittings.
  assert.equal(isPlaceOpen(TRISHNA, ist(`${MONDAY}T17:00:00`)), false);

  // Three sittings, all inheriting "Tue-Sun".
  assert.equal(isPlaceOpen(MTR, ist(`${TUESDAY}T07:00:00`)), true);
  assert.equal(isPlaceOpen(MTR, ist(`${TUESDAY}T11:30:00`)), false);
  assert.equal(isPlaceOpen(MTR, ist(`${TUESDAY}T13:00:00`)), true);
  assert.equal(isPlaceOpen(MTR, ist(`${MONDAY}T13:00:00`)), false);
});

test("each segment can carry its own day range", () => {
  // Mon-Wed closes at 10:45pm, Thu-Sun runs to midnight.
  assert.equal(isPlaceOpen(KATZ, ist(`${MONDAY}T23:00:00`)), false);
  assert.equal(isPlaceOpen(KATZ, ist(`${MONDAY}T22:00:00`)), true);
  assert.equal(isPlaceOpen(KATZ, ist(`${THURSDAY}T23:00:00`)), true);
});

test("parenthetical notes are not read as times", () => {
  assert.equal(isPlaceOpen(MOHAMMED_ALI_RD, ist(`${MONDAY}T21:00:00`)), true);
  assert.equal(isPlaceOpen(MOHAMMED_ALI_RD, ist(`${TUESDAY}T01:00:00`)), true);
  assert.equal(isPlaceOpen(MOHAMMED_ALI_RD, ist(`${TUESDAY}T03:00:00`)), false);
});

test("always-open venues report open at any hour", () => {
  assert.equal(isPlaceOpen(GATEWAY, ist(`${MONDAY}T04:00:00`)), true);
  assert.equal(isPlaceOpen(SEA_LINK, ist(`${SUNDAY}T04:00:00`)), true);
});

test("unknown hours are null, never closed", () => {
  // Null is rendered as an absent badge. Returning false here would libel every venue whose
  // hours we simply have not recorded.
  assert.equal(isPlaceOpen(null), null);
  assert.equal(isPlaceOpen(""), null);
  assert.equal(isPlaceOpen("Call ahead"), null);
  assert.equal(isPlaceOpen("Timings vary by season"), null);
});

test("parseOpeningHours produces a seven-day schedule", () => {
  const week = parseOpeningHours(ELEPHANTA);
  assert.ok(week);
  assert.equal(week.length, 7);
  assert.deepEqual(week[1], []); // Monday closed
  assert.deepEqual(week[3], [{ start: 9 * 60, end: 17 * 60 }]); // Wednesday
});

test("getLocalDayAndMinute reports Mumbai wall-clock time", () => {
  // 18:00 UTC on Monday is 23:30 IST, still Monday.
  assert.deepEqual(getLocalDayAndMinute(new Date("2026-08-24T18:00:00Z")), {
    day: 1,
    minute: 23 * 60 + 30,
  });

  // 20:00 UTC on Monday is 01:30 IST on Tuesday.
  assert.deepEqual(getLocalDayAndMinute(new Date("2026-08-24T20:00:00Z")), {
    day: 2,
    minute: 90,
  });

  // Midnight IST must read as minute 0 of the new day, not 1440 of the old one.
  assert.deepEqual(getLocalDayAndMinute(new Date("2026-08-24T18:30:00Z")), {
    day: 2,
    minute: 0,
  });
});
