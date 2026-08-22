import { Router } from "express";
import { db, placesTable } from "@workspace/db";
import { and, asc, eq, gte, sql } from "drizzle-orm";
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

router.get("/places", async (req, res) => {
  try {
    const origin = parseOrigin(req.query as Record<string, unknown>);
    const category = req.query.category as string | undefined;
    const minRating = req.query.rating ? parseFloat(req.query.rating as string) : null;
    const openNow = req.query.openNow === "true";
    const city = req.query.city as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const now = new Date();
    const distanceKm = origin
      ? distanceKmExpression(placesTable.lat, placesTable.lng, origin)
      : sql<number | null>`null::double precision`;

    const conditions = [
      city ? cityMatches(placesTable.city, city) : undefined,
      category ? eq(placesTable.category, category) : undefined,
      minRating !== null && Number.isFinite(minRating) ? gte(placesTable.rating, minRating) : undefined,
      openNow ? openNowCondition(placesTable.openingHoursJson, now) : undefined,
      origin ? withinRadiusCondition(placesTable.lat, placesTable.lng, origin) : undefined,
    ].filter((condition) => condition !== undefined);

    // Nearest first when the caller shared a location, best-rated first otherwise. Both run in
    // the database, so `limit`/`offset` describe the same page the ordering produced.
    const orderBy = origin ? [asc(distanceKm)] : [sql`${placesTable.rating} desc nulls last`];

    const places = await db
      .select({ place: placesTable, distanceKm })
      .from(placesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    res.json(
      places.map(({ place, distanceKm: distance }) => ({
        ...place,
        rating: place.rating ?? null,
        reviewCount: place.reviewCount ?? null,
        phone: place.phone ?? null,
        website: place.website ?? null,
        openingHours: place.openingHours ?? null,
        imageUrl: place.imageUrl ?? null,
        description: place.description ?? null,
        distanceKm: distance === null ? null : Number(distance),
        isOpen: resolveIsOpen(place, now),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get places");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/places/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [place] = await db.select().from(placesTable).where(eq(placesTable.id, id));
    if (!place) {
      res.status(404).json({ error: "Place not found" });
      return;
    }
    res.json({ ...place, distanceKm: null, isOpen: resolveIsOpen(place) });
  } catch (err) {
    req.log.error({ err }, "Failed to get place");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
