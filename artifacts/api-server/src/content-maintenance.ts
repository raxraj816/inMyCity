import { and, isNotNull, lt, sql } from "drizzle-orm";
import { db, dealsTable, pool } from "@workspace/db";

import { contentHealth, stalestRows } from "./lib/contentHealth";
import { logger } from "./lib/logger";

/**
 * `pnpm run content:maintain [city]` — the weekly content-operations pass.
 *
 * Section 2.3 asks for two things that only happen if something runs them: deals expiring
 * automatically, and staleness being visible. The list endpoints already hide an expired deal
 * the moment it lapses, so this is about clearing the ones that lapsed long enough ago to be
 * clutter, and printing the numbers a content owner needs to see each week.
 *
 * Deleting is deliberate rather than a soft flag: an expired deal has no readers and nothing
 * references it. Anything within the grace window is left alone so a partner extending a deal
 * can have it re-seeded rather than re-authored.
 */
const GRACE_DAYS = Number(process.env.DEAL_EXPIRY_GRACE_DAYS ?? 30);

async function purgeLongExpiredDeals(): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  const removed = await db
    .delete(dealsTable)
    .where(and(isNotNull(dealsTable.expiresAt), lt(dealsTable.expiresAt, cutoff)))
    .returning({ id: dealsTable.id, title: dealsTable.title });

  for (const deal of removed) {
    logger.info({ dealId: deal.id, title: deal.title }, "Removed a long-expired deal");
  }
  return removed.length;
}

async function main() {
  const city = process.argv[2] ?? process.env.CONTENT_MAINTENANCE_CITY ?? "Mumbai";

  const purged = await purgeLongExpiredDeals();
  const [{ expiringSoon }] = await db
    .select({ expiringSoon: sql<number>`count(*)::int` })
    .from(dealsTable)
    .where(sql`${dealsTable.expiresAt} between now() and now() + interval '7 days'`);

  const health = await contentHealth(city);
  const stale = await stalestRows(city, 10);

  for (const category of health.categories) {
    logger.info(
      {
        category: category.category,
        live: category.live,
        target: category.target,
        verified: category.verified,
        stale: category.stale,
        meetsTarget: category.meetsTarget,
      },
      category.meetsTarget ? "Category meets its launch target" : "Category is below its launch target",
    );
  }

  if (stale.length > 0) {
    logger.warn(
      { city, oldest: stale.slice(0, 5).map((row) => row.name) },
      `${stale.length} places need re-verification`,
    );
  }

  logger.info(
    { city, purgedDeals: purged, dealsExpiringWithin7Days: expiringSoon, meetsAllTargets: health.meetsAllTargets },
    "Content maintenance finished",
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "Content maintenance crashed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
