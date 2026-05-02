import { Router } from "express";
import { db, placesTable, eventsTable, dealsTable } from "@workspace/db";
import { gte, or, eq } from "drizzle-orm";

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

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food & Cafes",
  attraction: "Attractions",
  essentials: "Essentials",
  nightlife: "Nightlife",
  shopping: "Shopping",
  nature: "Nature",
  culture: "Culture",
  sports: "Sports",
};

router.get("/explore/summary", async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 10;

    const [places, events, deals] = await Promise.all([
      db.select().from(placesTable).limit(1000),
      db.select().from(eventsTable).where(gte(eventsTable.startDate, new Date())).limit(200),
      db.select().from(dealsTable).where(
        or(eq(dealsTable.expiresAt, null as any), gte(dealsTable.expiresAt, new Date()))
      ).limit(200),
    ]);

    const nearbyPlaces = places.filter((p) => {
      if (lat !== null && lng !== null) {
        return haversineKm(lat, lng, p.lat, p.lng) <= radius;
      }
      return true;
    });

    const categoryCounts: Record<string, number> = {};
    for (const p of nearbyPlaces) {
      categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
    }

    const categories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        label: CATEGORY_LABELS[category] ?? category,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalPlaces: nearbyPlaces.length,
      totalEvents: events.length,
      totalDeals: deals.length,
      categories,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get explore summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
