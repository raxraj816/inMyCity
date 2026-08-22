import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { parseOrigin } from "../lib/geo";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches, distanceKmExpression, withinRadiusCondition } from "../lib/sqlFilters";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const dateStr = req.query.date as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const from = dateStr ? new Date(dateStr) : new Date();
    const distanceKm = origin
      ? distanceKmExpression(eventsTable.lat, eventsTable.lng, origin)
      : sql<number | null>`null::double precision`;

    const conditions = [
      city ? cityMatches(eventsTable.city, city) : undefined,
      category ? eq(eventsTable.category, category) : undefined,
      gte(eventsTable.startDate, Number.isNaN(from.getTime()) ? new Date() : from),
      origin ? withinRadiusCondition(eventsTable.lat, eventsTable.lng, origin) : undefined,
    ].filter((condition) => condition !== undefined);

    // Nearest first once the caller shares a location, soonest first otherwise.
    const orderBy = origin ? [asc(distanceKm)] : [asc(eventsTable.startDate)];

    const rows = await db
      .select({ event: eventsTable, distanceKm })
      .from(eventsTable)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    res.json(
      rows.map(({ event, distanceKm: distance }) => ({
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() ?? null,
        distanceKm: distance === null ? null : Number(distance),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json({
      ...event,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get event");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
