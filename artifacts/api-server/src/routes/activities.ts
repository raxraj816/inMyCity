import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/activities", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const conditions = [];
    if (city) conditions.push(ilike(activitiesTable.city, `%${city}%`));
    if (category) conditions.push(eq(activitiesTable.category, category));

    const activities = await db
      .select()
      .from(activitiesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(activitiesTable.rating)
      .limit(limit)
      .offset(offset);

    res.json(activities.map(a => ({
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
