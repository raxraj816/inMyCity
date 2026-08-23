import { pool } from "@workspace/db";

import { ingestCity } from "./lib/news/ingest";
import { logger } from "./lib/logger";

/**
 * `pnpm run news:ingest [city]` — fetches every active allowlisted feed for a city and files
 * what it finds into the moderation queue as pending items.
 *
 * Intended to be run on a schedule. It never publishes anything: a human still has to approve
 * each item before it appears in the app.
 */
async function main() {
  const city = process.argv[2] ?? process.env.NEWS_INGEST_CITY ?? "Mumbai";
  const results = await ingestCity(city);

  if (results.length === 0) {
    logger.warn({ city }, "Nothing to ingest — no active sources for this city");
    return;
  }

  for (const result of results) {
    if (result.error === "No feed URL configured") {
      logger.warn({ source: result.slug }, "Source has no verified feed URL yet — skipped");
    } else if (result.error) {
      logger.error({ source: result.slug, error: result.error }, "Source ingestion failed");
    } else {
      logger.info(
        { source: result.slug, fetched: result.fetched, inserted: result.inserted, updated: result.updated, skipped: result.skipped },
        "Source ingested",
      );
    }
  }

  // A source with no feed URL yet is the expected pre-launch state, not a failure — only a
  // source that was configured and then could not be fetched is worth waking someone for.
  const fetchFailures = results.filter(
    (result) => result.error && result.error !== "No feed URL configured",
  ).length;
  const pending = results.reduce((total, result) => total + result.inserted, 0);
  logger.info(
    { city, sources: results.length, fetchFailures, pending },
    "News ingestion finished",
  );

  if (fetchFailures > 0 && fetchFailures === results.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    logger.error({ err }, "News ingestion crashed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
