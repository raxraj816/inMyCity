import { Router } from "express";
import { db, dealsTable } from "@workspace/db";
import { eq, and, or, gte, ilike } from "drizzle-orm";
import { haversineKm } from "../lib/geo";

const router = Router();

router.get("/deals", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;
    const category = req.query.category as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const conditions = [];
    if (city) conditions.push(ilike(dealsTable.city, `%${city}%`));
    if (category) conditions.push(eq(dealsTable.category, category));

    const now = new Date();
    conditions.push(or(
      eq(dealsTable.expiresAt, null as any),
      gte(dealsTable.expiresAt, now)
    )!);

    let deals = await db
      .select()
      .from(dealsTable)
      .where(and(...conditions))
      .limit(200);

    const result = deals
      .map((d) => {
        const distanceKm =
          lat !== null && lng !== null && d.lat !== null && d.lng !== null
            ? haversineKm(lat, lng, d.lat, d.lng)
            : null;
        return { ...d, distanceKm };
      })
      .filter((d) => {
        if (lat !== null && lng !== null && d.distanceKm !== null) {
          if (d.distanceKm > radius) return false;
        }
        return true;
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      .slice(0, limit)
      .map((d) => ({
        ...d,
        expiresAt: d.expiresAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }));

    res.json(result);
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
    res.json({
      ...deal,
      distanceKm: null,
      expiresAt: deal.expiresAt?.toISOString() ?? null,
      createdAt: deal.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get deal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
