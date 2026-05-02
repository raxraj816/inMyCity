import { Router } from "express";
import { db, transitLinesTable, transitRoutesTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

const router = Router();

router.get("/transit/lines", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const type = req.query.type as string | undefined;

    const conditions = [];
    if (city) conditions.push(ilike(transitLinesTable.city, `%${city}%`));
    if (type) conditions.push(eq(transitLinesTable.type, type));

    const lines = await db
      .select()
      .from(transitLinesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(transitLinesTable.type, transitLinesTable.name);

    res.json(lines);
  } catch (err) {
    req.log.error({ err }, "Failed to get transit lines");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transit/lines/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [line] = await db.select().from(transitLinesTable).where(eq(transitLinesTable.id, id));
    if (!line) return res.status(404).json({ error: "Transit line not found" });
    res.json(line);
  } catch (err) {
    req.log.error({ err }, "Failed to get transit line");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transit/search", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (city) conditions.push(ilike(transitRoutesTable.city, `%${city}%`));
    if (from) conditions.push(
      or(
        ilike(transitRoutesTable.from, `%${from}%`),
        ilike(transitRoutesTable.to, `%${from}%`)
      )!
    );
    if (to) conditions.push(
      or(
        ilike(transitRoutesTable.to, `%${to}%`),
        ilike(transitRoutesTable.from, `%${to}%`)
      )!
    );

    const routes = await db
      .select()
      .from(transitRoutesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(transitRoutesTable.durationMinutes);

    res.json(routes);
  } catch (err) {
    req.log.error({ err }, "Failed to search transit routes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transit/routes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [route] = await db.select().from(transitRoutesTable).where(eq(transitRoutesTable.id, id));
    if (!route) return res.status(404).json({ error: "Transit route not found" });
    res.json(route);
  } catch (err) {
    req.log.error({ err }, "Failed to get transit route");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
