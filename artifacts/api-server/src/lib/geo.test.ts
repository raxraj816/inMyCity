import test from "node:test";
import assert from "node:assert/strict";

import { applyProximity, haversineKm, parseOrigin } from "./geo";

// Real Mumbai coordinates from the seed data.
const BANDRA = { lat: 19.06, lng: 72.83 };
const GATEWAY = { lat: 18.922, lng: 72.8347, name: "Gateway of India" };
const JUHU = { lat: 19.0989, lng: 72.8265, name: "Juhu Beach" };
const NANDI_HILLS = { lat: 13.3709, lng: 77.6834, name: "Nandi Hills" };

test("haversine matches known Mumbai distances", () => {
  // Bandra to the Gateway of India is roughly 15 km as the crow flies.
  const d = haversineKm(BANDRA.lat, BANDRA.lng, GATEWAY.lat, GATEWAY.lng);
  assert.ok(d > 14 && d < 17, `expected ~15 km, got ${d}`);

  // Bandra to Juhu is a short hop north.
  const juhu = haversineKm(BANDRA.lat, BANDRA.lng, JUHU.lat, JUHU.lng);
  assert.ok(juhu > 3 && juhu < 6, `expected ~4.5 km, got ${juhu}`);

  assert.equal(haversineKm(BANDRA.lat, BANDRA.lng, BANDRA.lat, BANDRA.lng), 0);
});

test("parseOrigin reads coordinates and defaults the radius", () => {
  assert.deepEqual(parseOrigin({ lat: "19.06", lng: "72.83" }), {
    lat: 19.06,
    lng: 72.83,
    radiusKm: 10,
  });
  assert.deepEqual(parseOrigin({ lat: "19.06", lng: "72.83", radius: "3" }), {
    lat: 19.06,
    lng: 72.83,
    radiusKm: 3,
  });
});

test("parseOrigin returns null when coordinates are absent or unusable", () => {
  assert.equal(parseOrigin({}), null);
  assert.equal(parseOrigin({ lat: "19.06" }), null);
  assert.equal(parseOrigin({ lat: "abc", lng: "72.83" }), null);
  // A nonsense radius falls back to the default rather than filtering everything out.
  assert.equal(parseOrigin({ lat: "19.06", lng: "72.83", radius: "0" })?.radiusKm, 10);
});

test("no origin leaves rows untouched and ordered as received", () => {
  const rows = [JUHU, GATEWAY, NANDI_HILLS];
  const result = applyProximity(rows, null);

  assert.deepEqual(
    result.map((r) => r.name),
    ["Juhu Beach", "Gateway of India", "Nandi Hills"],
  );
  assert.ok(result.every((r) => r.distanceKm === null));
});

test("an origin sorts nearest first and drops anything beyond the radius", () => {
  const origin = { ...BANDRA, radiusKm: 20 };
  const result = applyProximity([GATEWAY, NANDI_HILLS, JUHU], origin);

  assert.deepEqual(
    result.map((r) => r.name),
    ["Juhu Beach", "Gateway of India"],
  );
  // Nandi Hills is near Bangalore, ~840 km away.
  assert.ok(!result.some((r) => r.name === "Nandi Hills"));
  assert.ok(result[0].distanceKm! < result[1].distanceKm!);
});

test("rows without coordinates are excluded from a nearby search", () => {
  // We cannot claim an unmapped venue is close, so it must not appear under "Near me".
  const rows = [GATEWAY, { lat: null, lng: null, name: "Unmapped venue" }];
  const result = applyProximity(rows, { ...BANDRA, radiusKm: 20 });

  assert.deepEqual(
    result.map((r) => r.name),
    ["Gateway of India"],
  );
});

test("a tight radius excludes places across the city", () => {
  const result = applyProximity([GATEWAY, JUHU], { ...BANDRA, radiusKm: 5 });

  assert.deepEqual(
    result.map((r) => r.name),
    ["Juhu Beach"],
  );
});
