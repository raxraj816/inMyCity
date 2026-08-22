import { after, describe, it } from "node:test";
import assert from "node:assert/strict";

import { activitiesTable, db, placesTable, pool } from "@workspace/db";
import { and, sql } from "drizzle-orm";

import { resolveIsOpen } from "./openingHours";
import { cityMatches, openNowCondition } from "./sqlFilters";

/**
 * The SQL "open now" filter and the JavaScript evaluator have to agree.
 *
 * `openNowCondition` is a hand translation of `isOpenAt` into SQL — it exists so the filter
 * can run before pagination instead of over an over-fetched slice. Two implementations of one
 * rule drift, and the failure mode is quiet: a venue silently missing from a filtered list.
 * This walks every seeded row at four instants and asserts the two answers match.
 */

async function seededDatabaseIsReachable(): Promise<boolean> {
  try {
    const result = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from places`,
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

const databaseAvailable = await seededDatabaseIsReachable();

after(async () => {
  await pool.end().catch(() => {});
});

/** Chosen to straddle the cases that break naive implementations, in Asia/Kolkata. */
const INSTANTS = [
  ["Wednesday 03:00 — inside a 7pm-3am shift", "2026-08-19T21:30:00Z"],
  ["Wednesday 09:00 — before most venues open", "2026-08-19T03:30:00Z"],
  ["Wednesday 14:00 — mid-afternoon", "2026-08-19T08:30:00Z"],
  ["Saturday 23:30 — late night, about to cross midnight", "2026-08-22T18:00:00Z"],
] as const;

describe(
  "openNowCondition",
  { skip: !databaseAvailable && "database not reachable" },
  () => {
    for (const [label, iso] of INSTANTS) {
      it(`agrees with isOpenAt at ${label}`, async () => {
        const now = new Date(iso);

        for (const [name, table, hours] of [
          ["places", placesTable, placesTable.openingHoursJson],
          ["activities", activitiesTable, activitiesTable.openingHoursJson],
        ] as const) {
          const rows = await db.select().from(table).where(cityMatches(table.city, "Mumbai"));
          const kept = await db
            .select({ id: table.id })
            .from(table)
            .where(and(cityMatches(table.city, "Mumbai"), openNowCondition(hours, now)));
          const keptIds = new Set(kept.map((row) => row.id));

          assert.ok(rows.length > 0, `expected seeded ${name}`);

          for (const row of rows) {
            // The route keeps venues whose hours are unknown: absent data is not evidence of
            // being closed.
            const keptByJs = resolveIsOpen(row, now) !== false;
            assert.equal(
              keptIds.has(row.id),
              keptByJs,
              `${name} #${row.id} "${row.name}" (${row.openingHours ?? "no hours"}) at ${label}`,
            );
          }
        }
      });
    }
  },
);
