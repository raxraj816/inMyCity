import test from "node:test";
import assert from "node:assert/strict";

import {
  directionsUrlCandidates,
  isValidCoordinate,
  showOnMapUrlCandidates,
  telUrl,
  websiteUrl,
} from "./mapLinks.ts";

// Gateway of India.
const GATEWAY = { lat: 18.922, lng: 72.8347, label: "Gateway of India" };

test("every platform ends with an openable https URL", () => {
  // canOpenURL can refuse a custom scheme, so each list must terminate in something that
  // cannot fail — otherwise the Directions button silently does nothing.
  for (const platform of ["ios", "android", "web"] as const) {
    const candidates = directionsUrlCandidates(GATEWAY, platform);
    assert.ok(candidates.length > 0);
    assert.ok(
      candidates.some((url) => url.startsWith("https://")),
      `${platform} has no https fallback`,
    );
  }
});

test("Google Maps is preferred, since that is what Mumbai uses", () => {
  assert.match(directionsUrlCandidates(GATEWAY, "ios")[0], /^comgooglemaps:\/\//);
  assert.match(directionsUrlCandidates(GATEWAY, "android")[0], /^google\.navigation:/);
});

test("iOS always retains an Apple Maps fallback", () => {
  // Apple Maps is guaranteed present, so directions can never dead-end on iOS.
  const candidates = directionsUrlCandidates(GATEWAY, "ios");
  assert.ok(candidates.some((url) => url.startsWith("maps://")));
});

test("coordinates are carried through unchanged", () => {
  for (const platform of ["ios", "android", "web"] as const) {
    for (const url of directionsUrlCandidates(GATEWAY, platform)) {
      assert.ok(url.includes("18.922"), `${url} lost latitude`);
      assert.ok(url.includes("72.8347"), `${url} lost longitude`);
    }
  }
});

test("labels with spaces and ampersands are encoded", () => {
  const url = showOnMapUrlCandidates(
    { lat: 18.9229, lng: 72.8318, label: "Leopold Cafe & Bar" },
    "android",
  )[0];
  assert.ok(!url.includes(" "), "unencoded space would break the intent URL");
  assert.ok(url.includes("%26"), "ampersand must be encoded");
});

test("missing coordinates are rejected rather than pointing at the Atlantic", () => {
  assert.equal(isValidCoordinate(0, 0), false);
  assert.equal(isValidCoordinate(null, 72.8), false);
  assert.equal(isValidCoordinate(undefined, undefined), false);
  assert.equal(isValidCoordinate(NaN, 72.8), false);
  assert.equal(isValidCoordinate(91, 72.8), false);
  assert.equal(isValidCoordinate(19.076, 200), false);

  assert.equal(isValidCoordinate(19.076, 72.8777), true);
  // Negative coordinates are valid; the demo cities use them.
  assert.equal(isValidCoordinate(37.7749, -122.4194), true);
});

test("phone numbers are normalised for tel:", () => {
  // The seed stores numbers like "+91-22-2202-0131".
  assert.equal(telUrl("+91-22-2202-0131"), "tel:+912222020131");
  assert.equal(telUrl("+1-212-535-7710"), "tel:+12125357710");
  assert.equal(telUrl(" 022 2202 0131 "), "tel:02222020131");

  assert.equal(telUrl(""), null);
  assert.equal(telUrl("call us"), null);
});

test("websites are coerced to absolute URLs", () => {
  assert.equal(websiteUrl("https://example.com"), "https://example.com");
  assert.equal(websiteUrl("http://example.com"), "http://example.com");
  assert.equal(websiteUrl("example.com"), "https://example.com");
  assert.equal(websiteUrl("example.com/menu"), "https://example.com/menu");

  assert.equal(websiteUrl(""), null);
  assert.equal(websiteUrl("not a url"), null);
});
