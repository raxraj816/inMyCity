import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { resolveIsOpen } from "../lib/openingHours";
import { parseOrigin } from "../lib/geo";
import { parseLimit, parseOffset } from "../lib/pagination";
import {
  cityMatches,
  distanceKmExpression,
  openNowCondition,
  withinRadiusCondition,
} from "../lib/sqlFilters";

const router = Router();

router.get("/activities", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const openNow = req.query.openNow === "true";
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const now = new Date();
    const distanceKm = origin
      ? distanceKmExpression(activitiesTable.lat, activitiesTable.lng, origin)
      : sql<number | null>`null::double precision`;

    const conditions = [
      city ? cityMatches(activitiesTable.city, city) : undefined,
      category ? eq(activitiesTable.category, category) : undefined,
      // Venues whose hours are unknown stay in: absent data is not evidence of being closed.
      openNow ? openNowCondition(activitiesTable.openingHoursJson, now) : undefined,
      origin ? withinRadiusCondition(activitiesTable.lat, activitiesTable.lng, origin) : undefined,
    ].filter((condition) => condition !== undefined);

    // Best rated first; the previous ordering was ascending and opened on the worst option.
    const orderBy = origin ? [asc(distanceKm)] : [sql`${activitiesTable.rating} desc nulls last`];

    const rows = await db
      .select({ activity: activitiesTable, distanceKm })
      .from(activitiesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    res.json(
      rows.map(({ activity, distanceKm: distance }) => ({
        ...activity,
        isOpen: resolveIsOpen(activity, now),
        rating: activity.rating ?? null,
        reviewCount: activity.reviewCount ?? null,
        price: activity.price ?? null,
        imageUrl: activity.imageUrl ?? null,
        description: activity.description ?? null,
        durationMinutes: activity.durationMinutes ?? null,
        openingHours: activity.openingHours ?? null,
        bookingUrl: activity.bookingUrl ?? null,
        phone: activity.phone ?? null,
        lat: activity.lat ?? null,
        lng: activity.lng ?? null,
        distanceKm: distance === null ? null : Number(distance),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, id));
    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }
    res.json({
      ...activity,
      isOpen: resolveIsOpen(activity),
      rating: activity.rating ?? null,
      reviewCount: activity.reviewCount ?? null,
      price: activity.price ?? null,
      imageUrl: activity.imageUrl ?? null,
      description: activity.description ?? null,
      durationMinutes: activity.durationMinutes ?? null,
      openingHours: activity.openingHours ?? null,
      bookingUrl: activity.bookingUrl ?? null,
      phone: activity.phone ?? null,
      lat: activity.lat ?? null,
      lng: activity.lng ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
