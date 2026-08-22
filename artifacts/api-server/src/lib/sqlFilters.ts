import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { CITY_TIME_ZONE, getLocalDayAndMinute } from "./openingHours";
import type { Origin } from "./geo";

/**
 * Filters that used to run in JavaScript over an over-fetched slice, expressed as SQL.
 *
 * The list endpoints previously pulled up to 500 rows, then filtered by distance and opening
 * hours and paginated the survivors in memory. That is wrong as well as slow: anything past
 * the fetch cap was invisible, and a page boundary computed after filtering does not match the
 * one the database would produce. Everything here goes into the WHERE/ORDER BY clause so the
 * database returns exactly the page that was asked for.
 */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.045;
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * Great-circle distance in kilometres, matching `haversineKm` in `geo.ts`.
 * `least(1, …)` keeps rounding error from pushing `asin` outside its domain.
 */
export function distanceKmExpression(
  latColumn: AnyPgColumn,
  lngColumn: AnyPgColumn,
  origin: { lat: number; lng: number },
): SQL<number> {
  return sql<number>`
    ${EARTH_RADIUS_KM} * 2 * asin(least(1, sqrt(
      power(sin(radians(${latColumn} - ${origin.lat}) / 2), 2)
      + cos(radians(${origin.lat})) * cos(radians(${latColumn}))
        * power(sin(radians(${lngColumn} - ${origin.lng}) / 2), 2)
    )))
  `;
}

/**
 * A cheap latitude/longitude window around the origin, wide enough to contain every point
 * within the radius. It exists to let the `(lat, lng)` index discard most of the table before
 * anything evaluates trigonometry, so the exact haversine check runs over a handful of rows.
 */
export function boundingBoxCondition(
  latColumn: AnyPgColumn,
  lngColumn: AnyPgColumn,
  origin: Exclude<Origin, null>,
): SQL {
  const latDelta = origin.radiusKm / KM_PER_DEGREE_LAT;
  // Longitude degrees shrink towards the poles; near either pole the window is the whole world.
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const lngDelta =
    Math.abs(cosLat) < 0.01 ? 180 : Math.min(180, origin.radiusKm / (KM_PER_DEGREE_LAT * Math.abs(cosLat)));

  return sql`${latColumn} between ${origin.lat - latDelta} and ${origin.lat + latDelta}
    and ${lngColumn} between ${origin.lng - lngDelta} and ${origin.lng + lngDelta}`;
}

/** Bounding box plus the exact radius check, as one condition. */
export function withinRadiusCondition(
  latColumn: AnyPgColumn,
  lngColumn: AnyPgColumn,
  origin: Exclude<Origin, null>,
): SQL {
  return sql`${boundingBoxCondition(latColumn, lngColumn, origin)}
    and ${distanceKmExpression(latColumn, lngColumn, origin)} <= ${origin.radiusKm}`;
}

/**
 * Case-insensitive exact match on a city name.
 *
 * Callers send the display name from the city config ("Mumbai"), so this is an equality test
 * rather than the substring match the list endpoints used to do. Written as `lower(column) =`
 * to line up with the expression index the bootstrap creates, which `ILIKE` could never use.
 */
export function cityMatches(cityColumn: AnyPgColumn, city: string): SQL {
  return sql`lower(${cityColumn}) = ${city.toLowerCase()}`;
}

/** Minutes since Sunday 00:00 in the city's timezone — the timeline `isOpenAt` compares against. */
export function minutesIntoWeek(now: Date = new Date(), timeZone: string = CITY_TIME_ZONE): number {
  const { day, minute } = getLocalDayAndMinute(now, timeZone);
  return day * MINUTES_PER_DAY + minute;
}

/**
 * "Open right now" evaluated against the structured weekly hours, mirroring `isOpenAt`:
 * each interval is placed on a week-long timeline, and the second comparison catches a
 * Saturday-night interval that runs into Sunday morning.
 *
 * Rows whose structured hours are absent pass the filter. Unknown hours are not evidence that
 * a venue is closed, and the response still reports `isOpen: null` for them so the UI can stay
 * silent rather than claim a status it does not have.
 */
export function openNowCondition(hoursColumn: AnyPgColumn, now: Date = new Date()): SQL {
  const nowInWeek = minutesIntoWeek(now);

  return sql`(
    ${hoursColumn} is null
    or jsonb_typeof(${hoursColumn}) <> 'array'
    or exists (
      select 1
      from generate_series(0, 6) as d
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(${hoursColumn} -> d) = 'array' then ${hoursColumn} -> d else '[]'::jsonb end
      ) as iv
      where (
        ${nowInWeek} >= d * ${MINUTES_PER_DAY} + (iv->>'start')::int
        and ${nowInWeek} < d * ${MINUTES_PER_DAY} + (iv->>'end')::int
      ) or (
        ${nowInWeek + MINUTES_PER_WEEK} >= d * ${MINUTES_PER_DAY} + (iv->>'start')::int
        and ${nowInWeek + MINUTES_PER_WEEK} < d * ${MINUTES_PER_DAY} + (iv->>'end')::int
      )
    )
  )`;
}
