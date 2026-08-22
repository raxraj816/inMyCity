import { Router } from "express";
import { db, hotelsTable } from "@workspace/db";
import { eq, and, ilike, lte } from "drizzle-orm";
import { applyProximity, parseOrigin } from "../lib/geo";

const router = Router();

router.get("/hotels", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const conditions = [];
    if (city) conditions.push(ilike(hotelsTable.city, `%${city}%`));
    if (category) conditions.push(eq(hotelsTable.category, category));
    if (maxPrice) conditions.push(lte(hotelsTable.pricePerNight, maxPrice));

    const hotels = await db
      .select()
      .from(hotelsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(hotelsTable.rating)
      .limit(origin ? 500 : limit)
      .offset(origin ? 0 : offset);

    const nearby = applyProximity(hotels, origin).slice(
      origin ? offset : 0,
      origin ? offset + limit : undefined,
    );

    res.json(nearby.map(h => ({
      ...h,
      rating: h.rating ?? null,
      reviewCount: h.reviewCount ?? null,
      pricePerNight: h.pricePerNight ?? null,
      imageUrl: h.imageUrl ?? null,
      phone: h.phone ?? null,
      website: h.website ?? null,
      description: h.description ?? null,
      lat: h.lat ?? null,
      lng: h.lng ?? null,
    })));
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
