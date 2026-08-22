import { Router } from "express";
import { db, collectionsTable, collectionPlacesTable, placesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getCollectionWithPlaces(id: number) {
  const [col] = await db.select().from(collectionsTable).where(eq(collectionsTable.id, id));
  if (!col) return null;

  const rows = await db
    .select()
    .from(collectionPlacesTable)
    .leftJoin(placesTable, eq(collectionPlacesTable.placeId, placesTable.id))
    .where(eq(collectionPlacesTable.collectionId, id))
    .orderBy(collectionPlacesTable.createdAt);

  const places = rows
    .filter((r) => r.places !== null)
    .map((r) => ({ ...r.places!, distanceKm: null, isOpen: null }));

  return { ...col, places };
}

router.get("/collections", async (req, res) => {
  try {
    const collections = await db.select().from(collectionsTable).orderBy(collectionsTable.createdAt);

    const result = await Promise.all(
      collections.map(async (col) => {
        const rows = await db
          .select()
          .from(collectionPlacesTable)
          .leftJoin(placesTable, eq(collectionPlacesTable.placeId, placesTable.id))
          .where(eq(collectionPlacesTable.collectionId, col.id));

        const places = rows
          .filter((r) => r.places !== null)
          .map((r) => ({ ...r.places!, distanceKm: null, isOpen: null }));

        return { ...col, places };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get collections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/collections", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const [col] = await db.insert(collectionsTable).values({ name, description }).returning();
    res.status(201).json({ ...col, places: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to create collection");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/collections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const col = await getCollectionWithPlaces(id);
    if (!col) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    res.json(col);
  } catch (err) {
    req.log.error({ err }, "Failed to get collection");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/collections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(collectionsTable).where(eq(collectionsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete collection");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/collections/:id/places", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { placeId } = req.body;
    if (!placeId) {
      res.status(400).json({ error: "placeId is required" });
      return;
    }

    const [existing] = await db
      .select()
      .from(collectionPlacesTable)
      .where(eq(collectionPlacesTable.collectionId, id));

    if (!existing) {
      await db.insert(collectionPlacesTable).values({ collectionId: id, placeId }).onConflictDoNothing();
    } else {
      await db.insert(collectionPlacesTable).values({ collectionId: id, placeId }).onConflictDoNothing();
    }

    const col = await getCollectionWithPlaces(id);
    if (!col) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    res.json(col);
  } catch (err) {
    req.log.error({ err }, "Failed to add place to collection");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/collections/:id/places/:placeId", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const placeId = parseInt(req.params.placeId);

    await db
      .delete(collectionPlacesTable)
      .where(
        eq(collectionPlacesTable.collectionId, id)
      );

    const col = await getCollectionWithPlaces(id);
    if (!col) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    res.json(col);
  } catch (err) {
    req.log.error({ err }, "Failed to remove place from collection");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
