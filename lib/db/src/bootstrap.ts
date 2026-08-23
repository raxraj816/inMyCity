import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Database objects that Drizzle's schema DSL cannot express, applied after every `db:push`.
 *
 * Search matches a query against `search_text` with trigram similarity, which is only fast
 * with `pg_trgm` installed and a GIN index over the lowercased column. Both are created here
 * rather than in the schema files: `CREATE EXTENSION` has no schema representation at all, and
 * an expression index with an operator class does not survive Drizzle's push diffing.
 *
 * Every statement is idempotent, so running this repeatedly is safe.
 */
const SEARCHABLE_TABLES = [
  "places",
  "events",
  "deals",
  "hotels",
  "activities",
  "movies",
] as const;

/**
 * Phase 2 content tables are all filtered by `lower(city)` the same way the catalogue is, so
 * they need the same expression index. They carry no `search_text`, so no trigram index here.
 */
const CITY_SCOPED_TABLES = [
  "pulse_posts",
  "news_items",
  "qa_questions",
  "insider_tips",
  "city_facts",
] as const;

export async function ensureSearchObjects(): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  for (const table of SEARCHABLE_TABLES) {
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS ${table}_search_text_trgm_idx ON ${table} USING gin (lower(search_text) gin_trgm_ops)`,
      ),
    );

    // Typo tolerance and as-you-type prefix matching run against the row's name, which is the
    // first field of `search_text`. Indexing that expression is what keeps them off a scan.
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS ${table}_search_name_trgm_idx ON ${table} USING gin (btrim(split_part(lower(search_text), ' ~ ', 1)) gin_trgm_ops)`,
      ),
    );

    // Every list endpoint filters by city case-insensitively, which a plain index on the
    // column cannot serve. These match the `lower(city) = ...` predicate the routes emit.
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS ${table}_lower_city_idx ON ${table} (lower(city))`),
    );
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS ${table}_lower_city_category_idx ON ${table} (lower(city), ${table === "movies" ? "genre" : "category"})`,
      ),
    );
  }

  for (const table of CITY_SCOPED_TABLES) {
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS ${table}_lower_city_idx ON ${table} (lower(city))`),
    );
  }
}
