import { Router } from "express";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";

import { adminEmailFor, requireAdmin } from "../lib/admin";
import {
  ADMIN_COLLECTIONS,
  coerceBody,
  FieldError,
  isCollectionName,
  type CollectionName,
  type CollectionSpec,
} from "../lib/adminCollections";
import { recordModerationAction } from "../lib/moderation";
import { parseOpeningHours } from "../lib/openingHours";
import { searchTextFor } from "../lib/search/searchFields";
import { parseLimit, parseOffset } from "../lib/pagination";

/**
 * The protected content surface.
 *
 * Section 2.3 of the launch plan calls this a prerequisite for everything else: without it,
 * correcting a wrong phone number needs a deploy, and nobody outside engineering can fix
 * anything. Every route here is behind `requireAdmin`, and every state change is appended to
 * `moderation_actions` so a takedown can be accounted for afterwards.
 */
const router = Router();

router.use("/admin", requireAdmin);

/** Drizzle's update/insert builders are typed per table; the registry is deliberately generic. */
type GenericRow = Record<string, unknown>;

function specFor(name: CollectionName): CollectionSpec {
  return ADMIN_COLLECTIONS[name] as CollectionSpec;
}

/**
 * Recomputes the columns derived from other columns.
 *
 * `search_text` and `opening_hours_json` are written at seed time from the row's own fields.
 * An edit that changed a name or the hours string and left these alone would leave a row that
 * is findable only under its old name, or open at its old times.
 */
function withDerivedColumns(spec: CollectionSpec, merged: GenericRow, changed: GenericRow): GenericRow {
  const values: GenericRow = { ...changed };

  if (spec.searchKind) values.searchText = searchTextFor(spec.searchKind, merged);
  if (spec.hasOpeningHours && "openingHours" in changed) {
    values.openingHoursJson = parseOpeningHours(merged.openingHours as string | null | undefined);
  }

  return values;
}

router.get("/admin/collections", (_req, res) => {
  res.json(
    Object.entries(ADMIN_COLLECTIONS).map(([name, raw]) => {
      const spec = raw as CollectionSpec;
      return {
        name,
        label: spec.label,
        fields: Object.entries(spec.fields).map(([field, type]) => ({
          name: field,
          type,
          required: spec.required.includes(field),
        })),
        moderated: Boolean(spec.statusColumn),
        deletable: spec.deletable,
      };
    }),
  );
});

router.get("/admin/:collection", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const city = req.query.city as string | undefined;
    const status = req.query.status as string | undefined;
    const term = (req.query.q as string | undefined)?.trim();

    const conditions: (SQL | undefined)[] = [
      city && spec.cityColumn ? sql`lower(${spec.cityColumn}) = lower(${city})` : undefined,
      status && status !== "all" && spec.statusColumn ? eq(spec.statusColumn, status) : undefined,
      term && spec.searchColumns.length > 0
        ? or(...spec.searchColumns.map((column) => ilike(column, `%${term}%`)))
        : undefined,
    ];
    const where = and(...conditions.filter((condition) => condition !== undefined));

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(spec.table).where(where).orderBy(desc(spec.orderColumn)).limit(limit).offset(offset),
      db.select({ total: count() }).from(spec.table).where(where),
    ]);

    res.json({ collection: name, total, limit, offset, rows });
  } catch (err) {
    req.log.error({ err, collection: name }, "Admin list failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/:collection/:id", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [row] = await db.select().from(spec.table).where(eq(spec.idColumn, id));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err, collection: name }, "Admin read failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/:collection", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    const values = coerceBody(spec, (req.body ?? {}) as GenericRow, { partial: false });
    const derived = withDerivedColumns(spec, values, values);

    // New rows start unpublished wherever the table is moderated, so nothing reaches readers
    // as a side effect of being created.
    if (spec.statusColumn) derived.status = "pending";

    const [row] = await db
      .insert(spec.table)
      .values(derived as never)
      .returning();

    await recordModerationAction({
      targetType: name,
      targetId: (row as GenericRow).id as number,
      action: "edit",
      actorEmail: adminEmailFor(req),
      note: "Created through the admin surface",
    });

    res.status(201).json(row);
  } catch (err) {
    if (err instanceof FieldError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err, collection: name }, "Admin create failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/:collection/:id", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db.select().from(spec.table).where(eq(spec.idColumn, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const changed = coerceBody(spec, (req.body ?? {}) as GenericRow, { partial: true });
    const merged = { ...(existing as GenericRow), ...changed };
    const values = withDerivedColumns(spec, merged, changed);

    const [row] = await db
      .update(spec.table)
      .set(values as never)
      .where(eq(spec.idColumn, id))
      .returning();

    await recordModerationAction({
      targetType: name,
      targetId: id,
      action: "edit",
      actorEmail: adminEmailFor(req),
      note: `Edited: ${Object.keys(changed).join(", ")}`,
    });

    res.json(row);
  } catch (err) {
    if (err instanceof FieldError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err, collection: name }, "Admin update failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Marks a row verified now. The one action content ops performs more than any other. */
router.post("/admin/:collection/:id/verify", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    if (!spec.lastVerifiedColumn) {
      res.status(400).json({ error: `${spec.label} does not track verification` });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const [row] = await db
      .update(spec.table)
      .set({ lastVerifiedAt: new Date() } as never)
      .where(eq(spec.idColumn, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await recordModerationAction({
      targetType: name,
      targetId: id,
      action: "edit",
      actorEmail: adminEmailFor(req),
      note: "Marked verified",
    });

    res.json(row);
  } catch (err) {
    req.log.error({ err, collection: name }, "Admin verify failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Deletion.
 *
 * Moderated tables are soft-removed: the row survives with a reason, so a takedown can be
 * produced later if the decision is challenged. Everything else is deleted outright, but only
 * once nothing points at it — a venue closing must not quietly empty someone's saved list or
 * leave a hole in an itinerary. What counts as pointing at it is declared per collection; see
 * `blockingReferences`.
 */
router.delete("/admin/:collection/:id", async (req, res, next) => {
  const name = req.params.collection;
  if (!isCollectionName(name)) {
    next();
    return;
  }

  try {
    const spec = specFor(name);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    if (spec.statusColumn) {
      const [row] = await db
        .update(spec.table)
        .set({
          status: "removed",
          removedAt: new Date(),
          removalReason: typeof req.body?.reason === "string" ? req.body.reason : "Removed by admin",
        } as never)
        .where(eq(spec.idColumn, id))
        .returning();

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      await recordModerationAction({
        targetType: name,
        targetId: id,
        action: "remove",
        actorEmail: adminEmailFor(req),
        note: typeof req.body?.reason === "string" ? req.body.reason : null,
      });

      res.json({ success: true, softDeleted: true, row });
      return;
    }

    if (!spec.deletable) {
      res.status(409).json({ error: `${spec.label} rows cannot be deleted. Edit the row instead.` });
      return;
    }

    const [existing] = await db.select().from(spec.table).where(eq(spec.idColumn, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    for (const reference of spec.blockingReferences ?? []) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(reference.table)
        .where(eq(reference.column, id));

      if (total > 0) {
        res.status(409).json({
          error: `This row is still in ${reference.label}. Edit it instead of deleting it.`,
        });
        return;
      }
    }

    await db.delete(spec.table).where(eq(spec.idColumn, id));

    await recordModerationAction({
      targetType: name,
      targetId: id,
      action: "remove",
      actorEmail: adminEmailFor(req),
      note: "Deleted through the admin surface",
    });

    res.json({ success: true, softDeleted: false });
  } catch (err) {
    req.log.error({ err, collection: name }, "Admin delete failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

/** Exported for the moderation router, which shares the collection registry. */
export { specFor, type GenericRow };
