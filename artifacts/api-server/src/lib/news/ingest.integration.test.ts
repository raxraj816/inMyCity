import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { db, newsItemsTable, newsSourcesTable, pool, type NewsSource } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import { inferCategory, ingestSource, resolveFeedUrl } from "./ingest";

/**
 * Ingestion end to end, with the network stubbed.
 *
 * The properties that matter are the ones a second run exposes: an item must land as pending,
 * a re-fetch must update it rather than duplicate it, and once an editor has published or
 * removed something, a later fetch of the same feed must not quietly rewrite their decision.
 */
async function databaseIsReachable(): Promise<boolean> {
  try {
    await db.execute<{ ok: number }>(sql`select 1 as ok from news_items limit 1`);
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await databaseIsReachable();

const SLUG = "mid-day";
const FEED_URL = "https://www.mid-day.com/rss/mumbai";
const TEST_CITY = "Ingest Test City";

function feed(headline: string, summary: string) {
  return `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>${headline}</title>
    <link>https://www.mid-day.com/article-one</link>
    <guid>ingest-test-1</guid>
    <description>${summary}</description>
  </item>
  <item>
    <title>Central Line megablock this Sunday between Kurla and Thane</title>
    <link>https://www.mid-day.com/article-two</link>
    <guid>ingest-test-2</guid>
  </item>
</channel></rss>`;
}

let source: NewsSource;
const realFetch = globalThis.fetch;
let served = "";

before(async () => {
  if (!databaseAvailable) return;

  [source] = await db
    .insert(newsSourcesTable)
    .values({
      slug: SLUG,
      name: "Mid-Day (test)",
      kind: "publisher",
      city: TEST_CITY,
      feedUrl: FEED_URL,
      trustLabel: "editorial",
      defaultConfidence: "medium",
      defaultCategory: "local",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: newsSourcesTable.slug,
      set: { city: TEST_CITY, feedUrl: FEED_URL, isActive: true },
    })
    .returning();

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    assert.equal(String(input), FEED_URL, "ingestion must only fetch the allowlisted URL");
    return new Response(served, { status: 200, headers: { "content-type": "application/rss+xml" } });
  }) as typeof fetch;
});

after(async () => {
  globalThis.fetch = realFetch;

  if (databaseAvailable) {
    await db.delete(newsItemsTable).where(eq(newsItemsTable.city, TEST_CITY));
    await db.delete(newsSourcesTable).where(eq(newsSourcesTable.slug, SLUG));
  }
  await pool.end().catch(() => {});
});

describe("inferCategory", () => {
  it("reads the category off the headline where it can", () => {
    assert.equal(inferCategory("IMD issues an orange alert for heavy rain", "local"), "weather");
    assert.equal(inferCategory("Western Line megablock on Sunday", "local"), "transit");
    assert.equal(inferCategory("BMC announces a water cut in Andheri", "local"), "civic");
  });

  it("falls back to the source's default rather than guessing", () => {
    assert.equal(inferCategory("A profile of a Bandra bookshop", "local"), "local");
  });
});

describe("resolveFeedUrl", () => {
  it("refuses a stored URL that is not on the source's allowed hosts", () => {
    assert.equal(resolveFeedUrl({ slug: SLUG, feedUrl: "https://evil.test/rss" }), null);
  });

  it("returns null when nothing is configured", () => {
    assert.equal(resolveFeedUrl({ slug: SLUG, feedUrl: null }), null);
  });
});

describe("ingestSource", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("files everything it finds as pending, never as published", async () => {
    served = feed("Heavy rain expected across the city", "IMD has issued an alert.");
    const result = await ingestSource(source);

    assert.equal(result.error, undefined);
    assert.equal(result.fetched, 2);
    assert.equal(result.inserted, 2);

    const rows = await db.select().from(newsItemsTable).where(eq(newsItemsTable.city, TEST_CITY));
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.status === "pending"), "ingestion must never publish");
    assert.ok(rows.every((row) => row.trustLabel === "editorial"));
  });

  it("updates a pending item on the next run instead of duplicating it", async () => {
    served = feed("Heavy rain expected across the city — updated", "IMD has extended the alert.");
    const result = await ingestSource(source);

    assert.equal(result.inserted, 0);
    assert.equal(result.updated, 2);

    const rows = await db.select().from(newsItemsTable).where(eq(newsItemsTable.city, TEST_CITY));
    assert.equal(rows.length, 2, "a re-fetch must not create a second copy");
    assert.ok(rows.some((row) => row.headline.endsWith("updated")));
  });

  it("leaves an editor's decision alone once they have made it", async () => {
    const [reviewed] = await db
      .update(newsItemsTable)
      .set({ status: "published", headline: "Headline an editor approved", reviewedBy: "ops@example.test" })
      .where(eq(newsItemsTable.externalId, "mid-day:" + (await firstExternalIdSuffix())))
      .returning();
    assert.ok(reviewed, "the fixture item should exist");

    served = feed("A rewritten headline the publisher pushed later", "Different summary.");
    const result = await ingestSource(source);

    const [after] = await db
      .select()
      .from(newsItemsTable)
      .where(eq(newsItemsTable.id, reviewed.id));

    assert.equal(after.headline, "Headline an editor approved", "a published item must not be rewritten");
    assert.equal(after.status, "published");
    assert.ok(result.skipped >= 1, "the untouched item should be reported as skipped");
  });

  it("records a fetch failure against the source rather than throwing", async () => {
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    const result = await ingestSource(source);

    assert.match(result.error ?? "", /HTTP 500/);

    const [row] = await db.select().from(newsSourcesTable).where(eq(newsSourcesTable.slug, SLUG));
    assert.match(row.lastFetchError ?? "", /HTTP 500/);
    assert.ok(row.lastFetchedAt, "a failed attempt still counts as an attempt");
  });
});

/** The external id is a hash of the guid, so read it back rather than recomputing it here. */
async function firstExternalIdSuffix(): Promise<string> {
  const rows = await db
    .select({ externalId: newsItemsTable.externalId })
    .from(newsItemsTable)
    .where(eq(newsItemsTable.city, TEST_CITY));
  return rows[0].externalId.split(":")[1];
}
