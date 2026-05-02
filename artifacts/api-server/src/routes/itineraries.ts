import { Router } from "express";
import { db, itinerariesTable, itineraryStopsTable, placesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/itineraries", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const duration = req.query.duration ? parseInt(req.query.duration as string) : undefined;

    const conditions = [];
    if (city) conditions.push(ilike(itinerariesTable.city, `%${city}%`));
    if (duration) conditions.push(eq(itinerariesTable.durationDays, duration));

    const itineraries = await db
      .select()
      .from(itinerariesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(itinerariesTable.durationDays);

    const result = await Promise.all(
      itineraries.map(async (itin) => {
        const stopRows = await db
          .select()
          .from(itineraryStopsTable)
          .leftJoin(placesTable, eq(itineraryStopsTable.placeId, placesTable.id))
          .where(eq(itineraryStopsTable.itineraryId, itin.id))
          .orderBy(itineraryStopsTable.day, itineraryStopsTable.order);

        const stops = stopRows
          .filter((r) => r.places !== null)
          .map((r) => ({
            id: r.itinerary_stops.id,
            day: r.itinerary_stops.day,
            order: r.itinerary_stops.order,
            placeId: r.itinerary_stops.placeId,
            tip: r.itinerary_stops.tip,
            bestTimeToVisit: r.itinerary_stops.bestTimeToVisit,
            estimatedCost: r.itinerary_stops.estimatedCost,
            durationMinutes: r.itinerary_stops.durationMinutes,
            place: { ...r.places!, distanceKm: null, isOpen: null },
          }));

        return { ...itin, stops };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get itineraries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/itineraries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [itin] = await db.select().from(itinerariesTable).where(eq(itinerariesTable.id, id));
    if (!itin) return res.status(404).json({ error: "Itinerary not found" });

    const stopRows = await db
      .select()
      .from(itineraryStopsTable)
      .leftJoin(placesTable, eq(itineraryStopsTable.placeId, placesTable.id))
      .where(eq(itineraryStopsTable.itineraryId, id))
      .orderBy(itineraryStopsTable.day, itineraryStopsTable.order);

    const stops = stopRows
      .filter((r) => r.places !== null)
      .map((r) => ({
        id: r.itinerary_stops.id,
        day: r.itinerary_stops.day,
        order: r.itinerary_stops.order,
        placeId: r.itinerary_stops.placeId,
        tip: r.itinerary_stops.tip,
        bestTimeToVisit: r.itinerary_stops.bestTimeToVisit,
        estimatedCost: r.itinerary_stops.estimatedCost,
        durationMinutes: r.itinerary_stops.durationMinutes,
        place: { ...r.places!, distanceKm: null, isOpen: null },
      }));

    res.json({ ...itin, stops });
  } catch (err) {
    req.log.error({ err }, "Failed to get itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
