import { Router } from "express";
import { db, placesTable } from "@workspace/db";
import { eq, and, gte, sql, ilike, or } from "drizzle-orm";

const router = Router();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPlaceOpen(openingHours: string | null): boolean | null {
  if (!openingHours) return null;
  try {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayName = days[day];
    const lowerHours = openingHours.toLowerCase();
    if (lowerHours.includes("24/7") || lowerHours.includes("always open")) return true;
    if (lowerHours.includes("closed")) return false;
    if (lowerHours.includes(dayName) || lowerHours.includes("daily") || lowerHours.includes("mon-sun")) {
      const match = lowerHours.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (match) {
        let open = parseInt(match[1]);
        const openPeriod = match[3];
        let close = parseInt(match[4]);
        const closePeriod = match[6];
        if (openPeriod === "pm" && open !== 12) open += 12;
        if (closePeriod === "pm" && close !== 12) close += 12;
        if (closePeriod === "am" && close === 12) close = 0;
        return hour >= open && hour < close;
      }
    }
    return null;
  } catch {
    return null;
  }
}

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

    const conditions = [];
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
        const isOpen = isPlaceOpen(p.openingHours);
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
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.json({ ...place, distanceKm: null, isOpen: isPlaceOpen(place.openingHours) });
  } catch (err) {
    req.log.error({ err }, "Failed to get place");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
