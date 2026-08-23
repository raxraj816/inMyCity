import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { cityFactsTable, cityGuidesTable, db, insiderTipsTable } from "@workspace/db";

import { cityMatches } from "../lib/sqlFilters";

const router = Router();

/**
 * Everything the City Guide header used to hardcode, in one request.
 *
 * The tagline, the practical facts and the insider tips were four in-file constants keyed by
 * city name; they are rows now, so fixing a wrong emergency number is an edit rather than a
 * deploy. Currency is deliberately absent — `currencyFor` in `@workspace/city-config` decides
 * that, and it is the only thing allowed to.
 */
router.get("/city-guide", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    if (!city) {
      res.status(400).json({ error: "city is required" });
      return;
    }

    const [guide] = await db
      .select()
      .from(cityGuidesTable)
      .where(and(cityMatches(cityGuidesTable.city, city), eq(cityGuidesTable.status, "published")));

    const facts = await db
      .select()
      .from(cityFactsTable)
      .where(and(cityMatches(cityFactsTable.city, city), eq(cityFactsTable.status, "published")))
      .orderBy(asc(cityFactsTable.group), asc(cityFactsTable.sortOrder));

    const tips = await db
      .select()
      .from(insiderTipsTable)
      .where(and(cityMatches(insiderTipsTable.city, city), eq(insiderTipsTable.status, "published")))
      .orderBy(asc(insiderTipsTable.sortOrder));

    res.json({
      city,
      tagline: guide?.tagline ?? null,
      knownFor: guide?.knownFor ?? null,
      tripLength: guide?.tripLength ?? null,
      timezoneLabel: guide?.timezoneLabel ?? null,
      lastVerifiedAt: guide?.lastVerifiedAt?.toISOString() ?? null,
      facts: facts.map((fact) => ({
        id: fact.id,
        group: fact.group,
        label: fact.label,
        value: fact.value,
        icon: fact.icon,
      })),
      insiderTips: tips.map((tip) => ({
        id: tip.id,
        label: tip.label,
        tip: tip.tip,
        icon: tip.icon,
        color: tip.color,
        neighborhoodId: tip.neighborhoodId,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get city guide");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
