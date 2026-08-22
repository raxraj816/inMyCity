import { Router } from "express";
import { db, placesTable } from "@workspace/db";
import { eq, and, gte, sql, ilike, or } from "drizzle-orm";
import { resolveIsOpen } from "../lib/openingHours";
import { haversineKm } from "../lib/geo";

const router = Router();

router.get("/places", async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 10;
    const category = req.query.category as string | undefined;
    const minRating = req.query.rating ? parseFloat(req.query.rating as string) : null;
    const openNow = req.query.openNow === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const city = req.query.city as string | undefined;

    const conditions = [];
    if (city) conditions.push(ilike(placesTable.city, `%${city}%`));
    if (category) conditions.push(eq(placesTable.category, category));
    if (minRating) conditions.push(gte(placesTable.rating, minRating));

    let places = await db
      .select()
      .from(placesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(500);

    const result = places
      .map((p) => {
        const distanceKm = lat !== null && lng !== null ? haversineKm(lat, lng, p.lat, p.lng) : null;
        const isOpen = resolveIsOpen(p);
        return { ...p, distanceKm, isOpen };
      })
      .filter((p) => {
        if (lat !== null && lng !== null && p.distanceKm !== null) {
          if (p.distanceKm > radius) return false;
        }
        if (openNow && p.isOpen === false) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(offset, offset + limit)
      .map((p) => ({
        ...p,
        rating: p.rating ?? null,
        reviewCount: p.reviewCount ?? null,
        phone: p.phone ?? null,
        website: p.website ?? null,
        openingHours: p.openingHours ?? null,
        imageUrl: p.imageUrl ?? null,
        description: p.description ?? null,
      }));

    res.json(result);
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
