import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  contentReportsTable,
  db,
  moderationActionsTable,
  pool,
  pulsePostsTable,
  pulseReactionsTable,
} from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

import app from "../app";
import { createSession, deleteSession } from "../lib/auth";

/**
 * Pulse, moderation and reporting end to end, against a real Postgres.
 *
 * The interesting behaviour is spread across a status column, a unique index and two routes,
 * so it cannot be shown in unit tests: that a pending post is invisible until a moderator
 * publishes it, that a like is idempotent per reader, that a takedown leaves a trail, and that
 * a report is stamped with the window it has to be answered in. Skips itself when no database
 * is reachable, so `pnpm test` still passes without Docker.
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

const TEST_CITY = "Pulse Test City";
const ADMIN_EMAIL = "pulse-integration-admin@example.test";
const DEVICE_ID = "pulseintegrationdevice01";

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl = "";
let adminSid = "";
let publishedId = 0;
let pendingId = 0;
const originalAdmins = process.env.ADMIN_EMAILS;
const originalSubmissions = process.env.COMMUNITY_SUBMISSIONS_ENABLED;

if (databaseAvailable) {
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const address = server.address();
  baseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
}

before(async () => {
  if (!databaseAvailable) return;

  process.env.ADMIN_EMAILS = ADMIN_EMAIL;
  // Submissions default to closed; these tests exercise both sides of that switch explicitly.
  delete process.env.COMMUNITY_SUBMISSIONS_ENABLED;

  const rows = await db
    .insert(pulsePostsTable)
    .values([
      {
        externalId: "test:pulse:published",
        city: TEST_CITY,
        tier: "official",
        authorName: "Test Desk",
        authorHandle: "@test.desk",
        caption: "A published post that readers can see.",
        filterTags: ["all", "tips"],
        trustLabel: "verified",
        confidence: "high",
        status: "published",
        publishedAt: new Date(),
      },
      {
        externalId: "test:pulse:pending",
        city: TEST_CITY,
        tier: "resident",
        authorName: "Test Resident",
        authorHandle: "@guest",
        caption: "A pending post that is waiting for a moderator.",
        filterTags: ["all", "food"],
        status: "pending",
      },
    ])
    .returning();

  publishedId = rows.find((row) => row.externalId === "test:pulse:published")!.id;
  pendingId = rows.find((row) => row.externalId === "test:pulse:pending")!.id;

  adminSid = await createSession({
    user: {
      id: "pulse-integration-admin",
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
    const ids = [publishedId, pendingId].filter(Boolean);
    if (ids.length > 0) {
      await db.delete(pulseReactionsTable).where(inArray(pulseReactionsTable.postId, ids));
      await db.delete(moderationActionsTable).where(inArray(moderationActionsTable.targetId, ids));
      await db.delete(contentReportsTable).where(inArray(contentReportsTable.targetId, ids));
    }
    await db.delete(pulsePostsTable).where(eq(pulsePostsTable.city, TEST_CITY));
    if (adminSid) await deleteSession(adminSid);

    if (originalAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdmins;
    if (originalSubmissions === undefined) delete process.env.COMMUNITY_SUBMISSIONS_ENABLED;
    else process.env.COMMUNITY_SUBMISSIONS_ENABLED = originalSubmissions;
  }

  server?.close();
  await pool.end().catch(() => {});
});

type Json = Record<string, unknown>;

async function call(path: string, init: RequestInit & { admin?: boolean; device?: boolean } = {}) {
  const { admin, device, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.body) headers.set("content-type", "application/json");
  if (admin) headers.set("authorization", `Bearer ${adminSid}`);
  if (device) headers.set("x-device-id", DEVICE_ID);

  const response = await fetch(new URL(path, baseUrl), { ...rest, headers });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Json | Json[]) : null };
}

describe("Pulse and moderation", { skip: databaseAvailable ? false : "no database reachable" }, () => {
  it("serves published posts and hides pending ones", async () => {
    const { status, body } = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`);
    const posts = body as Json[];

    assert.equal(status, 200);
    assert.deepEqual(
      posts.map((post) => post.id).sort(),
      [publishedId],
      "a pending post must not be readable",
    );
  });

  it("carries the provenance the trust labelling depends on", async () => {
    const { body } = await call(`/api/pulse/${publishedId}`);
    const post = body as Json;

    assert.equal(post.trustLabel, "verified");
    assert.equal(post.confidence, "high");
    assert.equal(post.city, TEST_CITY);
  });

  it("answers 404 for a pending post rather than leaking it by id", async () => {
    const { status } = await call(`/api/pulse/${pendingId}`);
    assert.equal(status, 404);
  });

  it("counts a like once per reader, and toggles it back off", async () => {
    const first = await call(`/api/pulse/${publishedId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ kind: "like" }),
      device: true,
    });
    assert.equal(first.status, 200);
    assert.equal((first.body as Json).active, true);
    assert.equal((first.body as Json).likeCount, 1);

    const second = await call(`/api/pulse/${publishedId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ kind: "like" }),
      device: true,
    });
    assert.equal((second.body as Json).active, false);
    assert.equal((second.body as Json).likeCount, 0, "toggling off must not leave the count inflated");
  });

  it("reports the reader's own like state back on the next read", async () => {
    await call(`/api/pulse/${publishedId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ kind: "save" }),
      device: true,
    });

    const withDevice = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`, { device: true });
    const withoutDevice = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`);

    assert.equal((withDevice.body as Json[])[0].viewerHasSaved, true);
    assert.equal(
      (withoutDevice.body as Json[])[0].viewerHasSaved,
      false,
      "one reader's save must not appear as everyone's",
    );
  });

  it("refuses a reaction from a caller it cannot attribute", async () => {
    const { status } = await call(`/api/pulse/${publishedId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ kind: "like" }),
    });
    assert.equal(status, 400);
  });

  it("turns submissions away while moderation is unstaffed", async () => {
    const { status } = await call("/api/pulse", {
      method: "POST",
      body: JSON.stringify({ city: TEST_CITY, caption: "Something worth sharing about the city." }),
      device: true,
    });
    assert.equal(status, 503);
  });

  it("accepts a submission as pending once submissions are open", async () => {
    process.env.COMMUNITY_SUBMISSIONS_ENABLED = "true";
    try {
      const { status, body } = await call("/api/pulse", {
        method: "POST",
        body: JSON.stringify({ city: TEST_CITY, caption: "Something worth sharing about the city." }),
        device: true,
      });

      assert.equal(status, 202);
      assert.equal((body as Json).status, "pending");

      const list = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`);
      assert.equal((list.body as Json[]).length, 1, "a submission must not appear before review");
    } finally {
      delete process.env.COMMUNITY_SUBMISSIONS_ENABLED;
    }
  });

  it("rejects a submission that is too short to be useful", async () => {
    process.env.COMMUNITY_SUBMISSIONS_ENABLED = "true";
    try {
      const { status } = await call("/api/pulse", {
        method: "POST",
        body: JSON.stringify({ city: TEST_CITY, caption: "short" }),
        device: true,
      });
      assert.equal(status, 400);
    } finally {
      delete process.env.COMMUNITY_SUBMISSIONS_ENABLED;
    }
  });

  it("keeps the moderation queue behind the admin allowlist", async () => {
    const anonymous = await call("/api/admin/moderation/queue");
    assert.equal(anonymous.status, 401);
  });

  it("shows a moderator what is waiting", async () => {
    const { status, body } = await call(
      `/api/admin/moderation/queue?city=${encodeURIComponent(TEST_CITY)}`,
      { admin: true },
    );
    const queue = body as Json;
    const pulseSection = (queue.sections as Json[]).find((section) => section.type === "pulse_post");

    assert.equal(status, 200);
    assert.ok((pulseSection!.pending as number) >= 1);
  });

  it("publishes a pending post, which makes it readable", async () => {
    const { status } = await call(`/api/admin/moderation/pulse_post/${pendingId}/publish`, {
      method: "POST",
      admin: true,
    });
    assert.equal(status, 200);

    const list = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`);
    const ids = (list.body as Json[]).map((post) => post.id);
    assert.ok(ids.includes(pendingId), "a published post must be readable");
  });

  it("refuses a takedown with no reason recorded", async () => {
    const { status } = await call(`/api/admin/moderation/pulse_post/${pendingId}/remove`, {
      method: "POST",
      admin: true,
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
  });

  it("takes a post down and leaves an accountable trail", async () => {
    const { status } = await call(`/api/admin/moderation/pulse_post/${pendingId}/remove`, {
      method: "POST",
      admin: true,
      body: JSON.stringify({ reason: "Unverifiable claim" }),
    });
    assert.equal(status, 200);

    const list = await call(`/api/pulse?city=${encodeURIComponent(TEST_CITY)}`);
    assert.equal(
      (list.body as Json[]).some((post) => post.id === pendingId),
      false,
      "a removed post must disappear from the feed",
    );

    const [row] = await db.select().from(pulsePostsTable).where(eq(pulsePostsTable.id, pendingId));
    assert.equal(row.status, "removed");
    assert.equal(row.removalReason, "Unverifiable claim");
    assert.ok(row.removedAt, "a takedown must record when it happened");

    const trail = await db
      .select()
      .from(moderationActionsTable)
      .where(eq(moderationActionsTable.targetId, pendingId));
    assert.ok(
      trail.some((entry) => entry.action === "remove" && entry.actorEmail === ADMIN_EMAIL),
      "the takedown must name who did it",
    );
  });

  it("files a report with the window it has to be answered in", async () => {
    const { status, body } = await call("/api/reports", {
      method: "POST",
      device: true,
      body: JSON.stringify({
        targetType: "pulse_post",
        targetId: publishedId,
        reason: "impersonation",
        details: "This account is not who it claims to be.",
      }),
    });
    const receipt = body as Json;

    assert.equal(status, 201);
    assert.equal(receipt.responseHours, 24, "impersonation carries the short window");

    const due = Date.parse(receipt.dueAt as string) - Date.now();
    assert.ok(due > 23 * 3600_000 && due <= 24 * 3600_000, "dueAt must be the window from now");
  });

  it("rejects a report against a target type that does not exist", async () => {
    const { status } = await call("/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "users", targetId: 1, reason: "spam" }),
    });
    assert.equal(status, 400);
  });

  it("publishes the grievance path readers are told about", async () => {
    const { status, body } = await call("/api/community-policy");
    const policy = body as Json;

    assert.equal(status, 200);
    assert.equal(policy.submissionsEnabled, false);
    const reasons = policy.reportReasons as { id: string; responseHours: number }[];
    assert.equal(reasons.find((reason) => reason.id === "impersonation")?.responseHours, 24);
    assert.equal(reasons.find((reason) => reason.id === "spam")?.responseHours, 72);
  });
});
