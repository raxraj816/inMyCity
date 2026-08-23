import { and, count, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  activitiesTable,
  db,
  dealsTable,
  eventsTable,
  hotelsTable,
  moviesTable,
  placesTable,
} from "@workspace/db";
import { MUMBAI_LAUNCH_ZONES } from "@workspace/city-config";

/**
 * Whether the catalogue is actually good enough to launch on, measured rather than assumed.
 *
 * Section 2.3 sets an explicit volume target per category and asks for staleness to be visible
 * internally. Both are computed here from the live tables, so "are we ready" is a request
 * rather than a spreadsheet somebody updates by hand.
 */

/** Launch targets from section 2.3 of the readiness plan. */
export const CONTENT_TARGETS: Record<string, number> = {
  places: 300,
  activities: 60,
  events: 40,
  deals: 30,
  neighborhoods: MUMBAI_LAUNCH_ZONES.length,
};

/** A row nobody has confirmed in this long is treated as unverified. */
export const STALE_AFTER_DAYS = 90;

type Measured = {
  table: PgTable;
  cityColumn: AnyPgColumn;
  verifiedColumn: AnyPgColumn;
  /** Extra predicate for "counts toward the target", e.g. an event that has not happened yet. */
  liveCondition?: () => SQL;
};

const MEASURED: Record<string, Measured> = {
  places: { table: placesTable, cityColumn: placesTable.city, verifiedColumn: placesTable.lastVerifiedAt },
  activities: { table: activitiesTable, cityColumn: activitiesTable.city, verifiedColumn: activitiesTable.lastVerifiedAt },
  events: {
    table: eventsTable,
    cityColumn: eventsTable.city,
    verifiedColumn: eventsTable.lastVerifiedAt,
    // Only events still ahead of us count as live inventory.
    liveCondition: () => sql`${eventsTable.startDate} >= now()`,
  },
  deals: {
    table: dealsTable,
    cityColumn: dealsTable.city,
    verifiedColumn: dealsTable.lastVerifiedAt,
    liveCondition: () => sql`(${dealsTable.expiresAt} is null or ${dealsTable.expiresAt} >= now())`,
  },
  hotels: { table: hotelsTable, cityColumn: hotelsTable.city, verifiedColumn: hotelsTable.lastVerifiedAt },
  movies: { table: moviesTable, cityColumn: moviesTable.city, verifiedColumn: moviesTable.lastVerifiedAt },
};

export type CategoryHealth = {
  category: string;
  total: number;
  live: number;
  verified: number;
  stale: number;
  target: number | null;
  meetsTarget: boolean;
};

export async function contentHealth(city: string): Promise<{
  city: string;
  staleAfterDays: number;
  categories: CategoryHealth[];
  meetsAllTargets: boolean;
}> {
  const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const categories: CategoryHealth[] = [];

  for (const [category, measured] of Object.entries(MEASURED)) {
    const inCity = sql`lower(${measured.cityColumn}) = lower(${city})`;
    const liveWhere = measured.liveCondition
      ? and(inCity, measured.liveCondition())
      : inCity;

    const [[totals], [lives], [verifieds]] = await Promise.all([
      db.select({ value: count() }).from(measured.table).where(inCity),
      db.select({ value: count() }).from(measured.table).where(liveWhere),
      db
        .select({ value: count() })
        .from(measured.table)
        .where(and(liveWhere, sql`${measured.verifiedColumn} >= ${staleBefore}`)),
    ]);

    const target = CONTENT_TARGETS[category] ?? null;
    categories.push({
      category,
      total: totals.value,
      live: lives.value,
      verified: verifieds.value,
      stale: lives.value - verifieds.value,
      target,
      meetsTarget: target === null ? true : lives.value >= target,
    });
  }

  return {
    city,
    staleAfterDays: STALE_AFTER_DAYS,
    categories,
    meetsAllTargets: categories.every((category) => category.meetsTarget),
  };
}

/** The rows most overdue for verification, so content ops has a work queue rather than a number. */
export async function stalestRows(city: string, limit = 20) {
  const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: placesTable.id,
      name: placesTable.name,
      category: placesTable.category,
      phone: placesTable.phone,
      lastVerifiedAt: placesTable.lastVerifiedAt,
    })
    .from(placesTable)
    .where(
      and(
        sql`lower(${placesTable.city}) = lower(${city})`,
        or(isNull(placesTable.lastVerifiedAt), lt(placesTable.lastVerifiedAt, staleBefore)),
      ),
    )
    .orderBy(sql`${placesTable.lastVerifiedAt} asc nulls first`)
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
  }));
}

/** Deals whose expiry has passed but which are still being served. Section 2.3's "freshness". */
export async function expiredDealIds(city?: string): Promise<number[]> {
  const conditions = [
    sql`${dealsTable.expiresAt} is not null and ${dealsTable.expiresAt} < now()`,
    city ? sql`lower(${dealsTable.city}) = lower(${city})` : undefined,
  ].filter((condition): condition is SQL => condition !== undefined);

  const rows = await db
    .select({ id: dealsTable.id })
    .from(dealsTable)
    .where(and(...conditions));
  return rows.map((row) => row.id);
}
