import { Router } from "express";
import { db, dealsTable } from "@workspace/db";
import { and, asc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { parseOrigin } from "../lib/geo";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches, distanceKmExpression, withinRadiusCondition } from "../lib/sqlFilters";

const router = Router();

router.get("/deals", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const now = new Date();
    const distanceKm = origin
      ? distanceKmExpression(dealsTable.lat, dealsTable.lng, origin)
      : sql<number | null>`null::double precision`;

    const conditions = [
      city ? cityMatches(dealsTable.city, city) : undefined,
      category ? eq(dealsTable.category, category) : undefined,
      // A deal with no expiry never expires.
      or(isNull(dealsTable.expiresAt), gte(dealsTable.expiresAt, now)),
      origin ? withinRadiusCondition(dealsTable.lat, dealsTable.lng, origin) : undefined,
    ].filter((condition) => condition !== undefined);

    // Nearest first with a location; otherwise the ones about to run out come first, which is
    // both useful and stable — the old route left the order to the database.
    const orderBy = origin
      ? [asc(distanceKm)]
      : [sql`${dealsTable.expiresAt} asc nulls last`, asc(dealsTable.id)];

    const rows = await db
      .select({ deal: dealsTable, distanceKm })
      .from(dealsTable)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    res.json(
      rows.map(({ deal, distanceKm: distance }) => ({
        ...deal,
        distanceKm: distance === null ? null : Number(distance),
        expiresAt: deal.expiresAt?.toISOString() ?? null,
        isExpired: false,
        createdAt: deal.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get deals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, id));
    if (!deal) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }
    // The list route hides an expired deal, but a saved link or a share still opens this one.
    // Saying so is the difference between a stale page and one that lies about being live.
    res.json({
      ...deal,
      distanceKm: null,
      expiresAt: deal.expiresAt?.toISOString() ?? null,
      isExpired: deal.expiresAt !== null && deal.expiresAt.getTime() < Date.now(),
      createdAt: deal.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get deal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
