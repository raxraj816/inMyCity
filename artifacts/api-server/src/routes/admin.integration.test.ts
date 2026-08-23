import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  cityFactsTable,
  cityGuidesTable,
  collectionPlacesTable,
  db,
  favoritesTable,
  insiderTipsTable,
  moderationActionsTable,
  placesTable,
  pool,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import app from "../app";
import { createSession, deleteSession } from "../lib/auth";

/**
 * The admin surface, against a real Postgres.
 *
 * Section 2.3 calls this a prerequisite for the rest of content operations, and the parts that
 * can fail quietly are the ones worth pinning: an edited name that leaves `search_text` behind,
 * a delete that takes someone's saved list with it, an edit that writes a column the registry
 * never exposed. Skips itself when no database is reachable.
 */
async function databaseIsReachable(): Promise<boolean> {
  try {
    await db.execute<{ ok: number }>(sql`select 1 as ok from places limit 1`);
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await databaseIsReachable();

const TEST_CITY = "Admin Test City";
const ADMIN_EMAIL = "admin-integration@example.test";

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl = "";
let adminSid = "";
let placeId = 0;
let favouritePlaceId = 0;
const originalAdmins = process.env.ADMIN_EMAILS;

if (databaseAvailable) {
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const address = server.address();
  baseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
}

before(async () => {
  if (!databaseAvailable) return;
  process.env.ADMIN_EMAILS = ADMIN_EMAIL;

  const inserted = await db
    .insert(placesTable)
    .values([
      {
        externalId: "test:admin:place",
        name: "Old Name Cafe",
        category: "food",
        address: "Somewhere",
        city: TEST_CITY,
        lat: 19,
        lng: 72,
        openingHours: "Daily 9am-5pm",
        searchText: " old name cafe ~ food ~ somewhere ",
      },
      {
        externalId: "test:admin:favourited",
        name: "Someone's Saved Place",
        category: "food",
        address: "Elsewhere",
        city: TEST_CITY,
        lat: 19,
        lng: 72,
      },
    ])
    .returning();

  placeId = inserted[0].id;
  favouritePlaceId = inserted[1].id;

  await db.insert(favoritesTable).values({ placeId: favouritePlaceId, userId: null });
  await db.insert(cityGuidesTable).values({ city: TEST_CITY, tagline: "A test city", status: "published" });
  await db.insert(cityFactsTable).values({
    externalId: "test:admin:fact",
    city: TEST_CITY,
    group: "essential",
    label: "Emergency",
    value: "112",
    icon: "phone",
    status: "published",
  });
  await db.insert(insiderTipsTable).values({
    externalId: "test:admin:tip",
    city: TEST_CITY,
    label: "Local hack",
    tip: "Arrive before the crowd.",
    status: "published",
  });

  adminSid = await createSession({
    user: {
      id: "admin-integration",
      email: ADMIN_EMAIL,
      firstName: "Ops",
      lastName: "Admin",
      profileImageUrl: null,
    },
    // No refresh token and no expiry, so `authMiddleware` accepts the session as-is rather
    // than trying to refresh it against an OIDC issuer that is not configured under test.
    access_token: "integration-test-token",
  });
});

after(async () => {
  if (databaseAvailable) {
    await db.delete(favoritesTable).where(eq(favoritesTable.placeId, favouritePlaceId));
    await db.delete(collectionPlacesTable).where(eq(collectionPlacesTable.placeId, favouritePlaceId));
    for (const id of [placeId, favouritePlaceId]) {
      if (id) await db.delete(moderationActionsTable).where(eq(moderationActionsTable.targetId, id));
    }
    await db.delete(placesTable).where(eq(placesTable.city, TEST_CITY));
    await db.delete(cityFactsTable).where(eq(cityFactsTable.city, TEST_CITY));
    await db.delete(insiderTipsTable).where(eq(insiderTipsTable.city, TEST_CITY));
    await db.delete(cityGuidesTable).where(eq(cityGuidesTable.city, TEST_CITY));
    if (adminSid) await deleteSession(adminSid);

    if (originalAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdmins;
  }

  server?.close();
  await pool.end().catch(() => {});
});

type Json = Record<string, unknown>;

async function call(path: string, init: RequestInit & { admin?: boolean } = {}) {
  const { admin, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.body) headers.set("content-type", "application/json");
  if (admin) headers.set("authorization", `Bearer ${adminSid}`);

  const response = await fetch(new URL(path, baseUrl), { ...rest, headers });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Json | Json[]) : null };
}

describe("Admin content surface", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("is closed to anyone who is not an allowlisted admin", async () => {
    assert.equal((await call("/api/admin/places")).status, 401);
    assert.equal((await call(`/api/admin/places/${placeId}`, { method: "PATCH", body: "{}" })).status, 401);
  });

  it("lists the editable collections and their fields", async () => {
    const { status, body } = await call("/api/admin/collections", { admin: true });
    const collections = body as Json[];

    assert.equal(status, 200);
    const places = collections.find((entry) => entry.name === "places")!;
    assert.ok((places.fields as Json[]).some((field) => field.name === "phone"));
    assert.ok((places.fields as Json[]).every((field) => field.name !== "searchText"));
  });

  it("filters the list by city and free text", async () => {
    const { body } = await call(
      `/api/admin/places?city=${encodeURIComponent(TEST_CITY)}&q=Old%20Name`,
      { admin: true },
    );
    const page = body as Json;

    assert.equal(page.total, 1);
    assert.equal((page.rows as Json[])[0].id, placeId);
  });

  it("fixes a phone number without a deploy — the point of the whole surface", async () => {
    const { status, body } = await call(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ phone: "+91-22-1234-5678" }),
    });

    assert.equal(status, 200);
    assert.equal((body as Json).phone, "+91-22-1234-5678");
  });

  it("rewrites search_text when a name changes, so the row stays findable", async () => {
    await call(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ name: "Renamed Chai House" }),
    });

    const [row] = await db.select().from(placesTable).where(eq(placesTable.id, placeId));
    assert.match(row.searchText ?? "", /renamed chai house/);
    assert.ok(!/old name cafe/.test(row.searchText ?? ""), "the old name must not linger in the index");
  });

  it("re-derives the structured hours when the display string changes", async () => {
    await call(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ openingHours: "Daily 7am-11pm" }),
    });

    const [row] = await db.select().from(placesTable).where(eq(placesTable.id, placeId));
    assert.ok(row.openingHoursJson, "opening_hours_json must follow the display string");
    assert.equal(row.openingHoursJson?.[1]?.[0]?.start, 7 * 60);
  });

  it("refuses a column the registry does not expose", async () => {
    await call(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ searchText: "injected", createdAt: "1999-01-01" }),
    });

    const [row] = await db.select().from(placesTable).where(eq(placesTable.id, placeId));
    assert.ok(!/injected/.test(row.searchText ?? ""));
  });

  it("rejects a value that is the wrong shape", async () => {
    const { status, body } = await call(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      admin: true,
      body: JSON.stringify({ lat: "north" }),
    });

    assert.equal(status, 400);
    assert.match(String((body as Json).error), /lat must be a number/);
  });

  it("stamps a verification date, which is how staleness is tracked", async () => {
    const { status } = await call(`/api/admin/places/${placeId}/verify`, { method: "POST", admin: true });
    assert.equal(status, 200);

    const [row] = await db.select().from(placesTable).where(eq(placesTable.id, placeId));
    assert.ok(row.lastVerifiedAt && Date.now() - row.lastVerifiedAt.getTime() < 60_000);
  });

  it("records every edit against the row, so a change can be accounted for", async () => {
    const trail = await db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.targetId, placeId));

    assert.ok(trail.length > 0);
    assert.ok(trail.every((entry) => entry.actorEmail === ADMIN_EMAIL));
  });

  it("will not delete a place while someone's saved list points at it", async () => {
    const { status, body } = await call(`/api/admin/places/${favouritePlaceId}`, {
      method: "DELETE",
      admin: true,
    });

    assert.equal(status, 409);
    assert.match(String((body as Json).error), /saved list/);

    const [row] = await db.select().from(placesTable).where(eq(placesTable.id, favouritePlaceId));
    assert.ok(row, "the row must survive a refused delete");
  });

  it("deletes a place once nothing points at it any more", async () => {
    const [orphan] = await db
      .insert(placesTable)
      .values({
        externalId: "test:admin:orphan",
        name: "Closed For Good",
        category: "food",
        address: "Nowhere",
        city: TEST_CITY,
        lat: 19,
        lng: 72,
      })
      .returning();

    const { status, body } = await call(`/api/admin/places/${orphan.id}`, { method: "DELETE", admin: true });

    assert.equal(status, 200);
    assert.equal((body as Json).softDeleted, false);

    const rows = await db.select().from(placesTable).where(eq(placesTable.id, orphan.id));
    assert.equal(rows.length, 0);
  });

  it("answers 404 rather than reporting success for a row that is not there", async () => {
    const { status } = await call("/api/admin/places/99999999", { method: "DELETE", admin: true });
    assert.equal(status, 404);
  });

  it("soft-removes a moderated row instead of deleting it", async () => {
    const created = await call("/api/admin/insider_tips", {
      method: "POST",
      admin: true,
      body: JSON.stringify({
        externalId: "test:admin:tip-two",
        city: TEST_CITY,
        label: "Timing",
        tip: "Go early, before nine.",
      }),
    });
    const id = (created.body as Json).id as number;
    assert.equal(created.status, 201);
    assert.equal((created.body as Json).status, "pending", "a new moderated row must not be live");

    const removed = await call(`/api/admin/insider_tips/${id}`, {
      method: "DELETE",
      admin: true,
      body: JSON.stringify({ reason: "Duplicate" }),
    });
    assert.equal((removed.body as Json).softDeleted, true);

    const [row] = await db.select().from(insiderTipsTable).where(eq(insiderTipsTable.id, id));
    assert.equal(row.status, "removed");
  });

  it("reports catalogue volume against the launch targets", async () => {
    const { status, body } = await call(`/api/admin/content-health?city=${encodeURIComponent(TEST_CITY)}`, {
      admin: true,
    });
    const health = body as Json;
    const categories = health.categories as Json[];

    assert.equal(status, 200);
    assert.equal(categories.find((entry) => entry.category === "places")?.target, 300);
    assert.equal(health.meetsAllTargets, false, "a two-row test city cannot meet the launch target");
  });
});

describe("City guide content", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("returns the header, facts and tips the screen used to hardcode", async () => {
    const { status, body } = await call(`/api/city-guide?city=${encodeURIComponent(TEST_CITY)}`);
    const guide = body as Json;

    assert.equal(status, 200);
    assert.equal(guide.tagline, "A test city");
    assert.equal((guide.facts as Json[])[0].label, "Emergency");
    assert.equal((guide.insiderTips as Json[])[0].label, "Local hack");
  });

  it("never returns a currency, because only currencyFor may decide that", async () => {
    const { body } = await call(`/api/city-guide?city=${encodeURIComponent(TEST_CITY)}`);
    assert.equal("currency" in (body as Json), false);
  });

  it("asks for a city rather than guessing one", async () => {
    assert.equal((await call("/api/city-guide")).status, 400);
  });
});
