import { and, getTableColumns, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";

/**
 * Idempotent seeding.
 *
 * The seed used to open by `DELETE`-ing every content table. Run against production that wipes
 * live data — including the rows users' favorites and collections point at — so it is replaced
 * by upserts keyed on a stable external id. Re-running now corrects the rows it owns and
 * touches nothing else.
 *
 * External ids are derived from the row's natural key rather than hand-written, so adding a
 * venue to the seed does not mean inventing an identifier. Renaming a seeded row changes its
 * key and therefore creates a new row — which is the honest outcome: the old one has to be
 * retired deliberately rather than silently rewritten.
 */

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function seedExternalId(kind: string, ...parts: (string | number | null | undefined)[]): string {
  const tail = parts
    .filter((part) => part !== null && part !== undefined && part !== "")
    .map((part) => slugify(String(part)))
    .join(":");
  return `seed:${kind}:${tail}`;
}

/** Guards against running the seed at a live database by accident. */
export function assertSeedAllowed(options: { destructive: boolean }): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (options.destructive) {
    if (isProduction) {
      throw new Error(
        "Refusing to run a destructive seed with NODE_ENV=production. --reset deletes every content row.",
      );
    }
    if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
      throw new Error(
        "--reset deletes every content row. Set ALLOW_DESTRUCTIVE_SEED=true to confirm you mean it.",
      );
    }
    return;
  }

  if (isProduction && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Refusing to seed with NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true if this is intentional.",
    );
  }
}

/** Columns the seed must never overwrite on an existing row. */
const PRESERVED = new Set(["id", "createdAt", "externalId"]);

/**
 * Upserts a batch on `externalId`, returning the resulting rows.
 *
 * The update list is built from the columns the batch actually supplies, so a table gains a
 * column without this helper needing to know about it, and a column the seed does not manage —
 * a moderation status, a live counter — keeps whatever value it already had.
 */
export async function upsertSeedRows<Row extends Record<string, unknown>>(
  table: PgTable,
  target: AnyPgColumn | AnyPgColumn[],
  rows: Row[],
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return [];

  const columns = getTableColumns(table) as Record<string, AnyPgColumn>;
  const supplied = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) supplied.add(key);
  }

  const set: Record<string, unknown> = {};
  for (const key of supplied) {
    if (PRESERVED.has(key)) continue;
    const column = columns[key];
    if (!column) continue;
    set[key] = sql.raw(`excluded."${column.name}"`);
  }
  if ("updatedAt" in columns) set.updatedAt = new Date();

  return (await db
    .insert(table)
    .values(rows as never)
    .onConflictDoUpdate({ target, set: set as never })
    .returning()) as Record<string, unknown>[];
}

/** Stamps the derived external id onto a batch, keyed on whatever makes each row unique. */
export function withExternalId<Row extends Record<string, unknown>>(
  kind: string,
  rows: Row[],
  key: (row: Row) => (string | number | null | undefined)[],
): (Row & { externalId: string })[] {
  return rows.map((row) => ({ ...row, externalId: seedExternalId(kind, ...key(row)) }));
}

/**
 * Assigns external ids to rows a previous, pre-upsert seed left without one.
 *
 * Without this, the first idempotent run against an existing database matches nothing and
 * inserts a second copy of every venue — the failure mode is a duplicated catalogue rather
 * than a lost one, but it is still wrong, and it would happen exactly once in each
 * environment at the worst possible moment.
 *
 * A derived id that some other row already owns is skipped rather than forced: two old rows
 * that share a natural key are a data problem for a person to look at, not something a seed
 * should resolve by overwriting one of them.
 */
export async function backfillExternalIds<Row extends Record<string, unknown>>(
  table: PgTable,
  externalIdColumn: AnyPgColumn,
  kind: string,
  key: (row: Row) => (string | number | null | undefined)[],
): Promise<number> {
  const rows = (await db.select().from(table).where(isNull(externalIdColumn))) as Row[];
  if (rows.length === 0) return 0;

  const columns = getTableColumns(table) as Record<string, AnyPgColumn>;
  const idColumn = columns.id;
  if (!idColumn) return 0;

  const taken = new Set(
    (
      (await db
        .select({ value: externalIdColumn })
        .from(table)
        .where(sql`${externalIdColumn} is not null`)) as { value: string | null }[]
    )
      .map((row) => row.value)
      .filter((value): value is string => value !== null),
  );

  let updated = 0;
  for (const row of rows) {
    const externalId = seedExternalId(kind, ...key(row));
    if (taken.has(externalId)) continue;
    taken.add(externalId);

    await db
      .update(table)
      .set({ externalId } as never)
      .where(and(sql`${idColumn} = ${row.id}`, isNull(externalIdColumn)));
    updated += 1;
  }
  return updated;
}
