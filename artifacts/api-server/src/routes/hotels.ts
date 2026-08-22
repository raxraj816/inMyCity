import { Router } from "express";
import { db, hotelsTable } from "@workspace/db";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { parseOrigin } from "../lib/geo";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches, distanceKmExpression, withinRadiusCondition } from "../lib/sqlFilters";

const router = Router();

router.get("/hotels", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const distanceKm = origin
      ? distanceKmExpression(hotelsTable.lat, hotelsTable.lng, origin)
      : sql<number | null>`null::double precision`;

    const conditions = [
      city ? cityMatches(hotelsTable.city, city) : undefined,
      category ? eq(hotelsTable.category, category) : undefined,
      maxPrice !== null && Number.isFinite(maxPrice) ? lte(hotelsTable.pricePerNight, maxPrice) : undefined,
      origin ? withinRadiusCondition(hotelsTable.lat, hotelsTable.lng, origin) : undefined,
    ].filter((condition) => condition !== undefined);

    // Best rated first. The previous ordering was ascending, so the list opened on the worst
    // hotel in the city.
    const orderBy = origin ? [asc(distanceKm)] : [sql`${hotelsTable.rating} desc nulls last`];

    const rows = await db
      .select({ hotel: hotelsTable, distanceKm })
      .from(hotelsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    res.json(
      rows.map(({ hotel, distanceKm: distance }) => ({
        ...hotel,
        rating: hotel.rating ?? null,
        reviewCount: hotel.reviewCount ?? null,
        pricePerNight: hotel.pricePerNight ?? null,
        imageUrl: hotel.imageUrl ?? null,
        phone: hotel.phone ?? null,
        website: hotel.website ?? null,
        description: hotel.description ?? null,
        lat: hotel.lat ?? null,
        lng: hotel.lng ?? null,
        distanceKm: distance === null ? null : Number(distance),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get hotels");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hotels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!hotel) {
      res.status(404).json({ error: "Hotel not found" });
      return;
    }
    res.json({
      ...hotel,
      rating: hotel.rating ?? null,
      reviewCount: hotel.reviewCount ?? null,
      pricePerNight: hotel.pricePerNight ?? null,
      imageUrl: hotel.imageUrl ?? null,
      phone: hotel.phone ?? null,
      website: hotel.website ?? null,
      description: hotel.description ?? null,
      lat: hotel.lat ?? null,
      lng: hotel.lng ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get hotel");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
