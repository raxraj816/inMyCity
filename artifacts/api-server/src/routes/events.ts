import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const dateStr = req.query.date as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const conditions = [];
    if (category) conditions.push(eq(eventsTable.category, category));
    if (dateStr) {
      const date = new Date(dateStr);
      conditions.push(gte(eventsTable.startDate, date));
    } else {
      conditions.push(gte(eventsTable.startDate, new Date()));
    }

    const events = await db
      .select()
      .from(eventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(eventsTable.startDate)
      .limit(limit)
      .offset(offset);

    res.json(events.map(e => ({
      ...e,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({
      ...event,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get event");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
