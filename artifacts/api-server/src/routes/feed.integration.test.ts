import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  db,
  dealsTable,
  eventsTable,
  newsItemsTable,
  pool,
  pulsePostsTable,
  sponsoredPlacementsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import app from "../app";

/**
 * The Pulse feed, against a real Postgres.
 *
 * The feed is the app's front page and it is assembled from five tables into one ranked
 * column, so the things worth pinning are the ones a refactor would quietly break: that
 * unpublished content cannot reach it, that the bands documented in `ranking.ts` are the order
 * it actually returns, that a sponsored card is always labelled, and above all that paging is
 * stable — no card appearing twice and none skipped, which is what a shifting cursor does to a
 * feed of rows that expire. Skips itself when no database is reachable, so `pnpm test` still
 * passes without Docker.
 */
async function databaseIsReachable(): Promise<boolean> {
  try {
    await db.execute<{ ok: number }>(sql`select 1 as ok from pulse_posts limit 1`);
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await databaseIsReachable();

const TEST_CITY = "Feed Test City";

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl = "";

if (databaseAvailable) {
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const address = server.address();
  baseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);
const hour = (offset: number) => new Date(Date.now() + offset * 3_600_000);

before(async () => {
  if (!databaseAvailable) return;

  await db.insert(pulsePostsTable).values([
    {
      externalId: "test:feed:featured",
      city: TEST_CITY,
      tier: "official",
      authorName: "Test Desk",
      authorHandle: "@test",
      caption: "The featured post readers should see first.",
      isFeatured: true,
      status: "published",
      publishedAt: day(-10),
    },
    {
      externalId: "test:feed:desk",
      city: TEST_CITY,
      tier: "local_expert",
      authorName: "Test Desk",
      authorHandle: "@test",
      caption: "An ordinary desk post.",
      status: "published",
      publishedAt: hour(-2),
    },
    {
      externalId: "test:feed:pending",
      city: TEST_CITY,
      tier: "resident",
      authorName: "Someone",
      authorHandle: "@guest",
      caption: "A post still waiting for review.",
      status: "pending",
    },
  ]);

  await db.insert(newsItemsTable).values([
    {
      externalId: "test:feed:news-fresh",
      sourceName: "Test Herald",
      sourceKind: "publisher",
      city: TEST_CITY,
      category: "local",
      headline: "A story from an hour ago",
      status: "published",
      publishedAt: hour(-1),
    },
    {
      externalId: "test:feed:news-old",
      sourceName: "Test Herald",
      sourceKind: "publisher",
      city: TEST_CITY,
      category: "local",
      headline: "A story from last week",
      status: "published",
      publishedAt: day(-7),
    },
    {
      externalId: "test:feed:news-pending",
      sourceName: "Test Herald",
      sourceKind: "publisher",
      city: TEST_CITY,
      category: "local",
      headline: "A story nobody has reviewed",
      status: "pending",
      publishedAt: hour(-1),
    },
    // Enough filler to push the feed past a single page, so paging is exercised for real.
    ...Array.from({ length: 14 }, (_, index) => ({
      externalId: `test:feed:news-filler-${index}`,
      sourceName: "Test Herald",
      sourceKind: "publisher",
      city: TEST_CITY,
      category: "local",
      headline: `Filler story ${index}`,
      status: "published",
      publishedAt: day(-2 - index),
    })),
  ]);

  await db.insert(eventsTable).values([
    { externalId: "test:feed:tonight", title: "Tonight event", category: "music", venue: "A", address: "A", city: TEST_CITY, startDate: hour(4) },
    { externalId: "test:feed:later", title: "Later event", category: "music", venue: "B", address: "B", city: TEST_CITY, startDate: day(5) },
    // Beyond the window, so it must not appear.
    { externalId: "test:feed:distant", title: "Distant event", category: "music", venue: "C", address: "C", city: TEST_CITY, startDate: day(200) },
    // Already happened.
    { externalId: "test:feed:past", title: "Past event", category: "music", venue: "D", address: "D", city: TEST_CITY, startDate: day(-3) },
  ]);

  await db.insert(dealsTable).values([
    { externalId: "test:feed:soonest", title: "Ending soonest", placeName: "A", category: "food", discountText: "20% off", city: TEST_CITY, expiresAt: hour(20) },
    { externalId: "test:feed:latest", title: "Ending later", placeName: "B", category: "food", discountText: "10% off", city: TEST_CITY, expiresAt: day(20) },
    // Already over, so the list route hides it and the feed must too.
    { externalId: "test:feed:expired", title: "Already expired", placeName: "C", category: "food", discountText: "50% off", city: TEST_CITY, expiresAt: day(-2) },
  ]);

  await db.insert(sponsoredPlacementsTable).values([
    {
      externalId: "test:feed:ad-live",
      city: TEST_CITY,
      advertiserName: "Test Advertiser",
      headline: "A booked placement",
      targetKind: "deal",
      targetId: 1,
      startsAt: day(-1),
      endsAt: day(30),
    },
    // The flight is over. Its row stays, but nothing may serve it.
    {
      externalId: "test:feed:ad-finished",
      city: TEST_CITY,
      advertiserName: "Lapsed Advertiser",
      headline: "A campaign that has ended",
      targetKind: "deal",
      targetId: 1,
      startsAt: day(-30),
      endsAt: day(-2),
    },
  ]);
});

after(async () => {
  if (databaseAvailable) {
    await db.delete(pulsePostsTable).where(eq(pulsePostsTable.city, TEST_CITY));
    await db.delete(newsItemsTable).where(eq(newsItemsTable.city, TEST_CITY));
    await db.delete(eventsTable).where(eq(eventsTable.city, TEST_CITY));
    await db.delete(dealsTable).where(eq(dealsTable.city, TEST_CITY));
    await db.delete(sponsoredPlacementsTable).where(eq(sponsoredPlacementsTable.city, TEST_CITY));
  }
  server?.close();
  await pool.end().catch(() => {});
});

type Item = Record<string, unknown> & { key: string; kind: string; title: string };
type Page = { city: string; items: Item[]; nextCursor: string | null };

async function feedPage(cursor?: string): Promise<Page> {
  const url = new URL(`/api/pulse/feed?city=${encodeURIComponent(TEST_CITY)}`, baseUrl);
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return (await response.json()) as Page;
}

/** Every page of the feed, walked the way the app walks it. */
async function wholeFeed(): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: string | undefined;
  // Bounded so a cursor that never terminates fails as a test rather than as a hang.
  for (let page = 0; page < 30; page += 1) {
    const body = await feedPage(cursor);
    items.push(...body.items);
    if (!body.nextCursor) return items;
    cursor = body.nextCursor;
  }
  assert.fail("the feed never reported an end");
}

describe("Pulse feed", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("asks for a city rather than guessing one", async () => {
    const response = await fetch(new URL("/api/pulse/feed", baseUrl));
    assert.equal(response.status, 400);
  });

  it("never includes content that has not been published", async () => {
    const titles = (await wholeFeed()).map((item) => item.title);
    assert.ok(!titles.includes("A story nobody has reviewed"));
    assert.ok(!titles.some((title) => String(title).includes("waiting for review")));
  });

  it("leaves out content whose moment has passed", async () => {
    const titles = (await wholeFeed()).map((item) => item.title);
    assert.ok(!titles.includes("Already expired"), "an expired offer is not happening now");
    assert.ok(!titles.includes("Past event"), "an event that has been and gone is not happening now");
    assert.ok(!titles.includes("Distant event"), "an event months out is not happening now");
  });

  it("leads with the things that are urgent", async () => {
    // Everything in the `now` band: tonight's gig, the offer ending tomorrow, the hour-old
    // story, and the featured post. They should all land before the week-old news.
    const items = await wholeFeed();
    const positionOf = (title: string) => items.findIndex((item) => item.title === title);
    const stale = positionOf("A story from last week");

    for (const urgent of ["Tonight event", "Ending soonest", "A story from an hour ago"]) {
      assert.ok(positionOf(urgent) < stale, `${urgent} should outrank a week-old story`);
    }
  });

  it("puts a featured post at the top however old it is", async () => {
    const items = await wholeFeed();
    const featured = items.findIndex((item) => item.body === "The featured post readers should see first.");
    assert.ok(featured >= 0 && featured < 5, `expected the featured post near the top, found it at ${featured}`);
  });

  it("never runs three cards of one kind together while it has variety to spend", async () => {
    // Once only one kind is left there is nothing to break the run with, and padding the tail
    // with something irrelevant would be worse than letting it run. So the rule is checked over
    // the stretch where a choice actually existed.
    const items = await wholeFeed();
    let run = 1;

    for (let index = 1; index < items.length; index += 1) {
      const remainingKinds = new Set(items.slice(index).map((item) => item.kind));
      if (remainingKinds.size === 1) break;

      run = items[index].kind === items[index - 1].kind ? run + 1 : 1;
      assert.ok(run <= 2, `three ${items[index].kind} cards in a row at position ${index}`);
    }
  });

  it("serves a booked placement and labels it", async () => {
    const ad = (await wholeFeed()).find((item) => item.kind === "ad");
    assert.ok(ad, "the live placement should be in the feed");
    assert.equal(ad.advertiserName, "Test Advertiser");
  });

  it("does not serve a campaign whose flight has ended", async () => {
    const advertisers = (await wholeFeed()).map((item) => item.advertiserName);
    assert.ok(!advertisers.includes("Lapsed Advertiser"));
  });

  it("pages without repeating a card or skipping one", async () => {
    // The failure this guards against is an offset over four tables whose rows expire while a
    // reader scrolls: the same deal arrives on two pages, or one falls between them.
    const keys = (await wholeFeed()).map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length, "a card was served twice");

    const firstPage = await feedPage();
    assert.ok(firstPage.nextCursor, "a feed this size should have more than one page");
    assert.deepEqual(firstPage.items.map((item) => item.key), keys.slice(0, firstPage.items.length));
  });

  it("reads a cursor it did not issue as the top of the feed", async () => {
    const top = await feedPage();
    const garbage = await feedPage("not-a-cursor-we-made");
    assert.deepEqual(garbage.items.map((item) => item.key), top.items.map((item) => item.key));
  });

  it("ends rather than paging forever", async () => {
    let cursor: string | undefined;
    let pages = 0;
    for (;;) {
      const body = await feedPage(cursor);
      pages += 1;
      if (!body.nextCursor) break;
      cursor = body.nextCursor;
      assert.ok(pages < 30, "the feed should run out");
    }
    assert.ok(pages >= 1);
  });
});
