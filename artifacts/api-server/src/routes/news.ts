import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, newsItemsTable, type NewsItem } from "@workspace/db";

import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches } from "../lib/sqlFilters";

const router = Router();

/**
 * Published news only.
 *
 * Ingested items sit at `pending` until an editor approves them, so this route never has to
 * decide whether a source can be trusted — that decision has already been made by a person and
 * recorded in `reviewed_by`.
 */
function toResponse(item: NewsItem) {
  return {
    id: item.id,
    city: item.city,
    category: item.category,
    headline: item.headline,
    summary: item.summary,
    imageUrl: item.imageUrl,
    link: item.link,
    source: item.sourceName,
    sourceKind: item.sourceKind,
    trustLabel: item.trustLabel,
    confidence: item.confidence,
    publishedAt: (item.publishedAt ?? item.createdAt).toISOString(),
  };
}

router.get("/news", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const conditions = [
      eq(newsItemsTable.status, "published"),
      city ? cityMatches(newsItemsTable.city, city) : undefined,
      category && category !== "all" ? eq(newsItemsTable.category, category) : undefined,
    ].filter((condition) => condition !== undefined);

    const items = await db
      .select()
      .from(newsItemsTable)
      .where(and(...conditions))
      .orderBy(desc(sql`coalesce(${newsItemsTable.publishedAt}, ${newsItemsTable.createdAt})`))
      .limit(limit)
      .offset(offset);

    res.json(items.map(toResponse));
  } catch (err) {
    req.log.error({ err }, "Failed to list news items");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
