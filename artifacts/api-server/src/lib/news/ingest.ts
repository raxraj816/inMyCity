import { and, eq, sql } from "drizzle-orm";
import { db, newsItemsTable, newsSourcesTable, type NewsSource } from "@workspace/db";

import { logger } from "../logger";
import { feedUrlOverride, isAllowedFeedUrl } from "./allowlist";
import { parseFeed, type FeedEntry } from "./feed";
import { mentionsCity } from "./relevance";

/**
 * Scheduled news ingestion.
 *
 * Everything it writes lands as `pending`. Nothing an outside publisher says reaches a reader
 * until an editor publishes it in the moderation queue — that is decision 2 of the launch plan
 * (trust before volume) expressed as a constraint the code enforces rather than a habit.
 *
 * Re-running is safe: items are matched on `external_id` and an existing row is only refreshed
 * while it is still pending. Once an editor has published or removed an item, a later fetch of
 * the same feed cannot silently rewrite what they approved.
 */

const FETCH_TIMEOUT_MS = 15_000;
const MAX_ITEMS_PER_SOURCE = 40;

/** Headline keywords that place an item on a card. Ordered: the first match wins. */
const CATEGORY_KEYWORDS: [category: string, patterns: RegExp][] = [
  ["weather", /\b(rain|monsoon|imd|cyclone|heat ?wave|thunderstorm|red alert|orange alert|waterlog)/i],
  ["transit", /\b(local train|metro|monorail|railway|western line|central line|harbour line|best bus|megablock)/i],
  ["traffic", /\b(traffic|jam|diversion|road clos|flyover|sea link|expressway|potholes?)\b/i],
  ["civic", /\b(bmc|mcgm|civic|water cut|ward|municipal|garbage|sewer|budget)\b/i],
  ["sports", /\b(cricket|wankhede|mumbai indians|ipl|football|isl|marathon|match)\b/i],
  ["business", /\b(market|sensex|startup|ipo|investment|hiring|economy|business)\b/i],
];

export function inferCategory(headline: string, fallback: string): string {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(headline)) return category;
  }
  return fallback;
}

/** The feed URL to use for a source, or null when it is not configured or not allowed. */
export function resolveFeedUrl(source: Pick<NewsSource, "slug" | "feedUrl">): string | null {
  const candidate = feedUrlOverride(source.slug) ?? source.feedUrl;
  if (!candidate) return null;
  return isAllowedFeedUrl(source.slug, candidate) ? candidate : null;
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
        "user-agent": "inMyCity-news-ingest/1.0 (+https://inmycity.app)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export type SourceIngestResult = {
  slug: string;
  fetched: number;
  /** Dropped because the story is not about this city. Never written, so never reviewed. */
  offTopic: number;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
};

async function upsertEntries(
  source: NewsSource,
  entries: FeedEntry[],
): Promise<Pick<SourceIngestResult, "inserted" | "updated" | "skipped" | "offTopic">> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let offTopic = 0;

  for (const entry of entries.slice(0, MAX_ITEMS_PER_SOURCE)) {
    if (!mentionsCity(source.city, entry.headline, entry.summary)) {
      offTopic += 1;
      continue;
    }

    const values = {
      externalId: entry.externalId,
      sourceId: source.id,
      sourceName: source.name,
      sourceKind: source.kind,
      city: source.city,
      category: inferCategory(entry.headline, source.defaultCategory),
      headline: entry.headline,
      summary: entry.summary,
      imageUrl: entry.imageUrl,
      link: entry.link,
      trustLabel: source.trustLabel,
      confidence: source.defaultConfidence,
      status: "pending" as const,
      publishedAt: entry.publishedAt,
    };

    const result = await db
      .insert(newsItemsTable)
      .values(values)
      .onConflictDoUpdate({
        target: newsItemsTable.externalId,
        set: {
          category: values.category,
          headline: values.headline,
          summary: values.summary,
          imageUrl: values.imageUrl,
          link: values.link,
          publishedAt: values.publishedAt,
          updatedAt: new Date(),
        },
        // Only refresh items nobody has reviewed yet. An editor's decision is final until
        // they change it themselves.
        setWhere: eq(newsItemsTable.status, "pending"),
      })
      // `xmax` is zero on a row this statement inserted and non-zero on one it updated. It is
      // the only reliable way to tell the two apart in an upsert — comparing timestamps gets it
      // wrong for a row created moments ago, which is exactly the re-run case worth counting.
      .returning({ id: newsItemsTable.id, wasInserted: sql<boolean>`(xmax = 0)` });

    if (result.length === 0) {
      // `setWhere` blocked the update: an editor has already published or removed this item.
      skipped += 1;
    } else if (result[0].wasInserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated, skipped, offTopic };
}

export async function ingestSource(source: NewsSource): Promise<SourceIngestResult> {
  const url = resolveFeedUrl(source);
  if (!url) {
    return {
      slug: source.slug,
      fetched: 0,
      offTopic: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: source.feedUrl
        ? "Feed URL is not on this source's allowed host list"
        : "No feed URL configured",
    };
  }

  try {
    const entries = parseFeed(source.slug, await fetchFeed(url));
    const counts = await upsertEntries(source, entries);
    await db
      .update(newsSourcesTable)
      .set({ lastFetchedAt: new Date(), lastFetchError: null })
      .where(eq(newsSourcesTable.id, source.id));
    return { slug: source.slug, fetched: entries.length, ...counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(newsSourcesTable)
      .set({ lastFetchedAt: new Date(), lastFetchError: message })
      .where(eq(newsSourcesTable.id, source.id));
    return { slug: source.slug, fetched: 0, offTopic: 0, inserted: 0, updated: 0, skipped: 0, error: message };
  }
}

/** Runs every active source for a city. Returns one result per source, failures included. */
export async function ingestCity(city: string): Promise<SourceIngestResult[]> {
  const sources = await db
    .select()
    .from(newsSourcesTable)
    .where(and(eq(newsSourcesTable.city, city), eq(newsSourcesTable.isActive, true)));

  if (sources.length === 0) {
    logger.warn({ city }, "News ingestion found no active sources");
    return [];
  }

  const results: SourceIngestResult[] = [];
  for (const source of sources) {
    results.push(await ingestSource(source));
  }
  return results;
}
