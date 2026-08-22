/**
 * Opening-hours parsing and evaluation.
 *
 * Venue hours are authored as free text ("Daily 7pm-3am", "Tue-Sun 9am-5pm"). This module
 * turns that text into a structured weekly schedule and answers "is it open right now" in
 * the city's timezone.
 *
 * Three things the previous inline implementation got wrong, all covered by tests:
 *   - hours that cross midnight (Mumbai's late-night food is mostly 7pm-3am)
 *   - the server's timezone leaking into the answer instead of the city's
 *   - day ranges, which were matched as substrings so "Tue-Sun" missed Wednesday
 */

export const CITY_TIME_ZONE = "Asia/Kolkata";

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** Minutes from midnight. `end` may exceed 1440 when the interval runs past midnight. */
export type Interval = { start: number; end: number };

/** Seven entries, index 0 = Sunday, matching `Date.prototype.getDay`. */
export type WeeklyHours = Interval[][];

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const ALWAYS_OPEN = /24\s*\/\s*7|24x7|always open|open 24|24 hours/;

const DAY_SPEC =
  /^\s*(?:(daily|everyday|every day|all days)|(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–—]\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*)?)\s*/;

const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/;

function emptyWeek(): WeeklyHours {
  return [[], [], [], [], [], [], []];
}

function dayIndex(name: string): number {
  return DAY_NAMES.indexOf(name.slice(0, 3));
}

/** Expands an inclusive day range, wrapping across the end of the week (e.g. fri-sat, sat-mon). */
function expandDayRange(from: number, to: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (from + i) % 7;
    days.push(day);
    if (day === to) break;
  }
  return days;
}

function toMinutes(hour: number, minute: number, period?: string): number {
  let h = hour;
  if (period === "pm" && h !== 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return h * 60 + minute;
}

/**
 * Resolves a time range to minutes, inferring a missing am/pm marker where the text omits it
 * and normalising ranges that run past midnight so `end` is always greater than `start`.
 */
function parseRange(match: RegExpMatchArray): Interval {
  const startHour = parseInt(match[1], 10);
  const startMin = match[2] ? parseInt(match[2], 10) : 0;
  let startPeriod = match[3];
  const endHour = parseInt(match[4], 10);
  const endMin = match[5] ? parseInt(match[5], 10) : 0;
  let endPeriod = match[6];

  // "9-5pm" — borrow the stated marker, then step back if that would invert the range.
  if (!startPeriod && endPeriod) {
    startPeriod = startHour > endHour ? "am" : endPeriod;
  }
  if (!endPeriod && startPeriod) {
    endPeriod = endHour < startHour ? (startPeriod === "am" ? "pm" : "am") : startPeriod;
  }

  const start = toMinutes(startHour, startMin, startPeriod);
  let end = toMinutes(endHour, endMin, endPeriod);

  // 7pm-3am, or 7:30am-12am where midnight reads as 0 and means end-of-day.
  if (end <= start) end += MINUTES_PER_DAY;

  return { start, end };
}

/**
 * Parses free-text opening hours into a weekly schedule.
 *
 * Understands comma-separated segments, each optionally prefixed with a day or day range.
 * A segment without its own day prefix inherits the previous one, so
 * "Daily 12pm-3:30pm, 6:30pm-11:30pm" applies both sittings to every day.
 *
 * Returns `null` when nothing usable could be read, which callers surface as "hours unknown"
 * rather than guessing.
 */
export function parseOpeningHours(text: string | null | undefined): WeeklyHours | null {
  if (!text) return null;

  // Drop editorial asides like "(busiest after 8pm)" so they can't be read as times.
  const normalized = text.toLowerCase().replace(/\([^)]*\)/g, " ").trim();
  if (!normalized) return null;

  if (ALWAYS_OPEN.test(normalized)) {
    return emptyWeek().map(() => [{ start: 0, end: MINUTES_PER_DAY }]);
  }

  const week = emptyWeek();
  let currentDays: number[] = [0, 1, 2, 3, 4, 5, 6];
  let sawAnyRange = false;
  let sawExplicitDays = false;

  for (const rawSegment of normalized.split(",")) {
    let segment = rawSegment.trim();
    if (!segment) continue;

    const daySpec = segment.match(DAY_SPEC);
    if (daySpec) {
      if (daySpec[1]) {
        currentDays = [0, 1, 2, 3, 4, 5, 6];
      } else {
        const from = dayIndex(daySpec[2]);
        const to = daySpec[3] ? dayIndex(daySpec[3]) : from;
        if (from >= 0 && to >= 0) currentDays = expandDayRange(from, to);
      }
      sawExplicitDays = true;
      segment = segment.slice(daySpec[0].length);
    }

    if (/\bclosed\b/.test(segment)) {
      for (const day of currentDays) week[day] = [];
      continue;
    }

    const range = segment.match(TIME_RANGE);
    if (!range) continue;

    const interval = parseRange(range);
    for (const day of currentDays) week[day].push(interval);
    sawAnyRange = true;
  }

  if (!sawAnyRange) {
    // "Mon-Sat closed" is a real answer; a string with neither days nor times is not.
    return sawExplicitDays && /\bclosed\b/.test(normalized) ? week : null;
  }

  return week;
}

/** Wall-clock day-of-week and minute-of-day in the given timezone. */
export function getLocalDayAndMinute(
  date: Date,
  timeZone: string = CITY_TIME_ZONE,
): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const day = dayIndex(lookup("weekday").toLowerCase());
  // Intl renders midnight as "24" in some ICU versions under hour12: false.
  const hour = parseInt(lookup("hour"), 10) % 24;
  const minute = parseInt(lookup("minute"), 10);

  return { day, minute: hour * 60 + minute };
}

/**
 * Evaluates a weekly schedule at an instant. Intervals are compared on a week-long timeline
 * so a Saturday 9pm-2am slot correctly covers Sunday 00:30.
 */
export function isOpenAt(
  hours: WeeklyHours,
  date: Date = new Date(),
  timeZone: string = CITY_TIME_ZONE,
): boolean {
  const { day, minute } = getLocalDayAndMinute(date, timeZone);
  const nowInWeek = day * MINUTES_PER_DAY + minute;

  for (let d = 0; d < 7; d++) {
    for (const interval of hours[d]) {
      const start = d * MINUTES_PER_DAY + interval.start;
      const end = d * MINUTES_PER_DAY + interval.end;
      // The second test catches intervals that started late on Saturday and run into Sunday.
      if (
        (nowInWeek >= start && nowInWeek < end) ||
        (nowInWeek + MINUTES_PER_WEEK >= start && nowInWeek + MINUTES_PER_WEEK < end)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Whether a venue is open at `date`, or `null` when its hours could not be read.
 * `null` means "we don't know" and should be rendered as absent, never as closed.
 */
export function isPlaceOpen(
  openingHours: string | null | undefined,
  date: Date = new Date(),
  timeZone: string = CITY_TIME_ZONE,
): boolean | null {
  const hours = parseOpeningHours(openingHours);
  if (!hours) return null;
  return isOpenAt(hours, date, timeZone);
}

function isUsableSchedule(value: unknown): value is WeeklyHours {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    value.every(
      (day) =>
        Array.isArray(day) &&
        day.every(
          (slot) =>
            !!slot &&
            typeof slot === "object" &&
            typeof (slot as Interval).start === "number" &&
            typeof (slot as Interval).end === "number",
        ),
    )
  );
}

/**
 * Resolves open/closed for a stored row, preferring curated structured hours and falling
 * back to parsing the display string.
 *
 * The structured column is authoritative because prose parsing can only ever be a best
 * effort; the fallback keeps rows working before the column has been backfilled.
 */
export function resolveIsOpen(
  row: {
    openingHoursJson?: { start: number; end: number }[][] | null;
    openingHours?: string | null;
  },
  date: Date = new Date(),
  timeZone: string = CITY_TIME_ZONE,
): boolean | null {
  if (isUsableSchedule(row.openingHoursJson)) {
    return isOpenAt(row.openingHoursJson, date, timeZone);
  }
  return isPlaceOpen(row.openingHours, date, timeZone);
}
