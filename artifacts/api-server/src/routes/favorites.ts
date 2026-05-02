import { Router } from "express";
import { db, favoritesTable, placesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/favorites", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(favoritesTable)
      .leftJoin(placesTable, eq(favoritesTable.placeId, placesTable.id))
      .orderBy(favoritesTable.createdAt);

    const favorites = rows
      .filter((r) => r.places !== null)
      .map((r) => ({
        id: r.favorites.id,
        placeId: r.favorites.placeId,
        createdAt: r.favorites.createdAt.toISOString(),
        place: { ...r.places!, distanceKm: null, isOpen: null },
      }));

    res.json(favorites);
  } catch (err) {
    req.log.error({ err }, "Failed to get favorites");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", async (req, res) => {
  try {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: "placeId is required" });

    const [place] = await db.select().from(placesTable).where(eq(placesTable.id, placeId));
    if (!place) return res.status(404).json({ error: "Place not found" });

    const [existing] = await db.select().from(favoritesTable).where(eq(favoritesTable.placeId, placeId));
    if (existing) {
      return res.status(201).json({
        id: existing.id,
        placeId: existing.placeId,
        createdAt: existing.createdAt.toISOString(),
        place: { ...place, distanceKm: null, isOpen: null },
      });
    }

    const [fav] = await db.insert(favoritesTable).values({ placeId }).returning();
    res.status(201).json({
      id: fav.id,
      placeId: fav.placeId,
      createdAt: fav.createdAt.toISOString(),
      place: { ...place, distanceKm: null, isOpen: null },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add favorite");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/favorites/:placeId", async (req, res) => {
  try {
    const placeId = parseInt(req.params.placeId);
    await db.delete(favoritesTable).where(eq(favoritesTable.placeId, placeId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove favorite");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
