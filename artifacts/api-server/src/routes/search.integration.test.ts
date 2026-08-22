import { after, describe, it } from "node:test";
import assert from "node:assert/strict";

import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

import app from "../app";

/**
 * End-to-end coverage for the search endpoint, against a real Postgres.
 *
 * Trigram matching, the expression indexes and the relevance CASE only exist in SQL, so unit
 * tests over the query expander cannot show that a search actually finds anything. These run
 * against the seeded development database and skip themselves when it is not reachable, so
 * `pnpm test` still passes on a machine with no Docker running.
 */

// Resolved before the suite is declared: `describe`'s skip option is read at definition time,
// so probing the database in a `before` hook would always report "not reachable".
async function seededDatabaseIsReachable(): Promise<boolean> {
  try {
    const result = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from places`,
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

const databaseAvailable = await seededDatabaseIsReachable();

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl = "";

if (databaseAvailable) {
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  const address = server.address();
  baseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
}

after(async () => {
  server?.close();
  await pool.end().catch(() => {});
});

async function search(query: string, params: Record<string, string> = {}) {
  const url = new URL("/api/search", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("city", "Mumbai");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url);
  assert.equal(response.status, 200, `search for "${query}" responded ${response.status}`);
  return (await response.json()) as {
    total: number;
    counts: Record<string, number>;
    results: { kind: string; id: number; title: string; score: number }[];
    suggestions: string[];
  };
}

describe("GET /api/search", { skip: !databaseAvailable && "database not reachable" }, () => {
  it("finds the same rows for every spelling of a dish", async () => {
    const spellings = ["vada pav", "vadapav", "vada paav", "वडा पाव"];
    const [first, ...rest] = await Promise.all(spellings.map((spelling) => search(spelling)));

    assert.ok(first.total > 0, "expected the seeded street-food places to match");
    const expected = first.results.map((result) => `${result.kind}:${result.id}`).sort();

    for (const [index, response] of rest.entries()) {
      assert.deepEqual(
        response.results.map((result) => `${result.kind}:${result.id}`).sort(),
        expected,
        `"${spellings[index + 1]}" returned different results from "vada pav"`,
      );
    }
  });

  it("resolves station abbreviations to the terminus", async () => {
    const response = await search("cst");
    assert.ok(
      response.results.some((result) => result.title.includes("Chhatrapati Shivaji")),
      "expected CST to find the terminus",
    );
  });

  it("ranks an exact name match first", async () => {
    const response = await search("trishna");
    assert.equal(response.results[0]?.title, "Trishna");
  });

  it("matches a name prefix, so results appear while typing", async () => {
    const response = await search("trish");
    assert.ok(response.results.some((result) => result.title === "Trishna"));
  });

  it("returns counts that match the number of results per kind", async () => {
    const response = await search("mumbai");
    const summed = Object.values(response.counts).reduce((total, count) => total + count, 0);
    assert.equal(summed, response.total);
  });

  it("restricts results to one kind without hiding the other counts", async () => {
    const all = await search("bandra");
    const placesOnly = await search("bandra", { kind: "place" });

    assert.ok(placesOnly.results.every((result) => result.kind === "place"));
    assert.equal(placesOnly.total, all.counts.place);
    assert.deepEqual(placesOnly.counts, all.counts);
  });

  it("offers a suggestion instead of a dead end", async () => {
    const response = await search("elefanta");
    assert.equal(response.total, 0);
    assert.ok(response.suggestions.length > 0, "expected a did-you-mean suggestion");
  });

  it("treats an empty query as no results rather than an error", async () => {
    const response = await search("   ");
    assert.equal(response.total, 0);
    assert.deepEqual(response.results, []);
  });

  it("answers well inside the 300ms budget", async () => {
    const started = performance.now();
    await search("vada pav");
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 300, `search took ${elapsed.toFixed(0)}ms`);
  });
});
