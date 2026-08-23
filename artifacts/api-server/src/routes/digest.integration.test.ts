import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { db, eventsTable, placesTable, pool, pulsePostsTable, qaAnswersTable, qaQuestionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import app from "../app";

/**
 * The Pulse digest, against a real Postgres.
 *
 * The digest is the app's front page and it is assembled from six tables, so the things worth
 * pinning are the ones a refactor would quietly break: that unpublished content cannot reach
 * it, that an empty section is left out rather than rendered blank, and that the ordering each
 * section documents is the ordering it actually returns.
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

const TEST_CITY = "Digest Test City";

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl = "";

if (databaseAvailable) {
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const address = server.address();
  baseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);

before(async () => {
  if (!databaseAvailable) return;

  await db.insert(pulsePostsTable).values([
    {
      externalId: "test:digest:featured",
      city: TEST_CITY,
      tier: "official",
      authorName: "Test Desk",
      authorHandle: "@test",
      caption: "The featured post readers should see first.",
      isFeatured: true,
      status: "published",
      publishedAt: new Date(),
    },
    {
      externalId: "test:digest:desk",
      city: TEST_CITY,
      tier: "local_expert",
      authorName: "Test Desk",
      authorHandle: "@test",
      caption: "An ordinary desk post.",
      status: "published",
      publishedAt: new Date(),
    },
    {
      externalId: "test:digest:pending",
      city: TEST_CITY,
      tier: "resident",
      authorName: "Someone",
      authorHandle: "@guest",
      caption: "A post still waiting for review.",
      status: "pending",
    },
  ]);

  await db.insert(eventsTable).values([
    { externalId: "test:digest:soon", title: "Sooner event", category: "music", venue: "A", address: "A", city: TEST_CITY, startDate: day(2) },
    { externalId: "test:digest:later", title: "Later event", category: "music", venue: "B", address: "B", city: TEST_CITY, startDate: day(5) },
    // Beyond the fourteen-day horizon, so it must not appear.
    { externalId: "test:digest:distant", title: "Distant event", category: "music", venue: "C", address: "C", city: TEST_CITY, startDate: day(90) },
    // Already happened.
    { externalId: "test:digest:past", title: "Past event", category: "music", venue: "D", address: "D", city: TEST_CITY, startDate: day(-3) },
  ]);

  await db.insert(placesTable).values([
    { externalId: "test:digest:best", name: "Higher rated", category: "food", address: "A", city: TEST_CITY, lat: 19, lng: 72, rating: 4.9, reviewCount: 100 },
    { externalId: "test:digest:worse", name: "Lower rated", category: "food", address: "B", city: TEST_CITY, lat: 19, lng: 72, rating: 3.1, reviewCount: 100 },
  ]);

  const [answered] = await db
    .insert(qaQuestionsTable)
    .values([
      { externalId: "test:digest:answered", city: TEST_CITY, question: "A question with an answer?", authorName: "Editorial", status: "published", publishedAt: new Date(), answerCount: 1 },
      { externalId: "test:digest:unanswered", city: TEST_CITY, question: "A question nobody answered?", authorName: "Editorial", status: "published", publishedAt: new Date() },
    ])
    .returning();

  await db.insert(qaAnswersTable).values({
    externalId: "test:digest:answer",
    questionId: answered.id,
    body: "The answer.",
    authorName: "Editorial",
    status: "published",
    publishedAt: new Date(),
  });
});

after(async () => {
  if (databaseAvailable) {
    await db.delete(pulsePostsTable).where(eq(pulsePostsTable.city, TEST_CITY));
    await db.delete(eventsTable).where(eq(eventsTable.city, TEST_CITY));
    await db.delete(placesTable).where(eq(placesTable.city, TEST_CITY));
    await db.delete(qaQuestionsTable).where(eq(qaQuestionsTable.city, TEST_CITY));
  }
  server?.close();
  await pool.end().catch(() => {});
});

type Section = { id: string; label: string; kind: string; entries: Record<string, unknown>[] };

async function digest(city = TEST_CITY) {
  const response = await fetch(new URL(`/api/pulse/digest?city=${encodeURIComponent(city)}`, baseUrl));
  assert.equal(response.status, 200);
  return (await response.json()) as { city: string; sections: Section[] };
}

describe("Pulse digest", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("asks for a city rather than guessing one", async () => {
    const response = await fetch(new URL("/api/pulse/digest", baseUrl));
    assert.equal(response.status, 400);
  });

  it("separates the featured post from the rest of the desk", async () => {
    const { sections } = await digest();
    const featured = sections.find((section) => section.id === "featured")!;
    const desk = sections.find((section) => section.id === "pulse")!;

    assert.equal(featured.entries.length, 1);
    assert.equal(featured.entries[0].body, "The featured post readers should see first.");
    assert.ok(desk.entries.every((post) => post.body !== "The featured post readers should see first."));
  });

  it("never includes content that has not been published", async () => {
    const { sections } = await digest();
    const captions = sections
      .filter((section) => section.kind === "pulse")
      .flatMap((section) => section.entries.map((post) => post.body));

    assert.ok(!captions.includes("A post still waiting for review."));
  });

  it("shows only events inside the horizon, soonest first", async () => {
    const { sections } = await digest();
    const titles = sections.find((section) => section.id === "now")!.entries.map((entry) => entry.title);

    assert.deepEqual(titles, ["Sooner event", "Later event"]);
  });

  it("orders places by rating", async () => {
    const { sections } = await digest();
    const titles = sections.find((section) => section.id === "eat")!.entries.map((entry) => entry.title);

    assert.deepEqual(titles, ["Higher rated", "Lower rated"]);
  });

  it("only asks a question that has an answer to read", async () => {
    const { sections } = await digest();
    const asked = sections.find((section) => section.id === "asked")!;

    assert.deepEqual(asked.entries.map((entry) => entry.title), ["A question with an answer?"]);
  });

  it("leaves a section out when it has nothing in it", async () => {
    const { sections } = await digest();
    // This city has no deals, activities or films seeded.
    for (const id of ["deals", "do", "watch"]) {
      assert.equal(sections.some((section) => section.id === id), false, `${id} should be omitted`);
    }
    assert.ok(sections.every((section) => section.entries.length > 0));
  });

  it("returns no sections at all for a city with nothing in it", async () => {
    const { sections } = await digest("City With No Content");
    assert.deepEqual(sections, []);
  });

  it("prices as bare numbers, leaving the currency to the client", async () => {
    const { sections } = await digest();
    for (const section of sections) {
      for (const entry of section.entries) {
        if (entry.price !== null) assert.equal(typeof entry.price, "number");
      }
    }
  });
});
