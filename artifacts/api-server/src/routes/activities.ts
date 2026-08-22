import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { resolveIsOpen } from "../lib/openingHours";
import { applyProximity, parseOrigin } from "../lib/geo";

const router = Router();

router.get("/activities", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const openNow = req.query.openNow === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const origin = parseOrigin(req.query as Record<string, unknown>);

    const conditions = [];
    if (city) conditions.push(ilike(activitiesTable.city, `%${city}%`));
    if (category) conditions.push(eq(activitiesTable.category, category));

    const activities = await db
      .select()
      .from(activitiesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(activitiesTable.rating)
      .limit(origin ? 500 : limit)
      .offset(origin ? 0 : offset);

    const withStatus = applyProximity(activities, origin)
      .map((a) => ({ ...a, isOpen: resolveIsOpen(a) }))
      // Keep venues whose hours are unknown: absent data is not evidence of being closed.
      .filter((a) => !openNow || a.isOpen !== false)
      .slice(origin ? offset : 0, origin ? offset + limit : undefined);

    res.json(withStatus.map(a => ({
      ...a,
      rating: a.rating ?? null,
      reviewCount: a.reviewCount ?? null,
      price: a.price ?? null,
      imageUrl: a.imageUrl ?? null,
      description: a.description ?? null,
      durationMinutes: a.durationMinutes ?? null,
      openingHours: a.openingHours ?? null,
      bookingUrl: a.bookingUrl ?? null,
      phone: a.phone ?? null,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
    })));
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
