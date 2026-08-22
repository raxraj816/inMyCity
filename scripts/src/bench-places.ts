/**
 * Load-checks the list endpoints against a realistically sized catalogue.
 *
 * The Phase 1 target is `/api/places` for Mumbai answering in under 150 ms with 2,000 rows
 * seeded, which the old in-memory filtering could not do. This inserts synthetic rows tagged
 * as generated, measures the endpoints, and deletes them again — the curated seed data is
 * never touched.
 *
 * Usage: corepack pnpm --filter @workspace/scripts run bench:places [rows]
 */
import { db, placesTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { sql } from "drizzle-orm";

const BENCH_TAG = "__bench__";
const BASE_URL = process.env.BENCH_BASE_URL ?? "http://localhost:3001";
const ROW_TARGET = parseInt(process.argv[2] ?? "2000", 10);
const SAMPLES = 20;

const CATEGORIES = ["food", "attraction", "nightlife", "essentials"];
const HOURS = ["Daily 9am-11pm", "Mon-Sat 8am-9pm", "Daily 7pm-3am", "24/7", "Tue-Sun 10am-10:30pm"];

/** Spread over roughly the Mumbai municipal area so distance filters have something to cut. */
function mumbaiPoint(index: number) {
  return {
    lat: 18.89 + ((index * 37) % 400) / 1000,
    lng: 72.79 + ((index * 53) % 180) / 1000,
  };
}

async function insertRows(count: number) {
  const rows = Array.from({ length: count }, (_, i) => {
    const { lat, lng } = mumbaiPoint(i);
    return {
      name: `Bench Venue ${i}`,
      category: CATEGORIES[i % CATEGORIES.length],
      description: `Synthetic row ${i} used only for load measurement.`,
      address: `${i} Bench Road, Mumbai`,
      city: "Mumbai",
      lat,
      lng,
      rating: 2 + ((i * 7) % 30) / 10,
      reviewCount: (i * 13) % 5000,
      openingHours: HOURS[i % HOURS.length],
      tags: [BENCH_TAG],
      searchText: ` bench venue ${i} ~ ${CATEGORIES[i % CATEGORIES.length]} ~ ${i} bench road mumbai ~ ${BENCH_TAG} `,
    };
  });

  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    await db.insert(placesTable).values(rows.slice(start, start + CHUNK));
  }
}

async function timeRequest(path: string): Promise<number[]> {
  const timings: number[] = [];
  // One warm-up request so the measurement is not dominated by connection setup.
  await fetch(`${BASE_URL}${path}`);
  for (let i = 0; i < SAMPLES; i++) {
    const started = performance.now();
    const response = await fetch(`${BASE_URL}${path}`);
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`${path} responded ${response.status}`);
    timings.push(performance.now() - started);
  }
  return timings.sort((a, b) => a - b);
}

function report(label: string, timings: number[]) {
  const p50 = timings[Math.floor(timings.length * 0.5)];
  const p95 = timings[Math.floor(timings.length * 0.95)];
  const verdict = p95 < 150 ? "PASS" : "FAIL";
  console.log(`${verdict}  ${label.padEnd(58)} p50 ${p50.toFixed(1)}ms  p95 ${p95.toFixed(1)}ms`);
  return p95 < 150;
}

async function main() {
  const [{ count: existing }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(placesTable);
  const toInsert = Math.max(0, ROW_TARGET - Number(existing));

  console.log(`Places already seeded: ${existing}. Inserting ${toInsert} synthetic rows.`);
  if (toInsert > 0) await insertRows(toInsert);
  await db.execute(sql`analyze places`);

  const cases: [string, string][] = [
    ["/api/places?city=Mumbai", "city only"],
    ["/api/places?city=Mumbai&category=food", "city + category"],
    ["/api/places?city=Mumbai&openNow=true", "city + open now"],
    ["/api/places?city=Mumbai&lat=19.076&lng=72.8777&radius=5", "city + near me"],
    ["/api/places?city=Mumbai&lat=19.076&lng=72.8777&radius=5&openNow=true", "near me + open now"],
    ["/api/places?city=Mumbai&offset=1000&limit=50", "deep page"],
    ["/api/search?city=Mumbai&q=vada%20pav", "search: vada pav"],
    ["/api/search?city=Mumbai&q=vadapav", "search: vadapav (fuzzy)"],
  ];

  let allPassed = true;
  try {
    for (const [path, label] of cases) {
      allPassed = report(`${label}  ${path}`, await timeRequest(path)) && allPassed;
    }
  } finally {
    const deleted = await db
      .delete(placesTable)
      .where(sql`${BENCH_TAG} = any(${placesTable.tags})`)
      .returning({ id: placesTable.id });
    console.log(`Removed ${deleted.length} synthetic rows.`);
    await pool.end();
  }

  if (!allPassed) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
