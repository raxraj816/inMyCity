import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";

import { actorDisplayName, actorKeyFrom, anonymousActorKey, deviceIdFrom } from "./actor";

/**
 * The actor key is what makes saving work before sign-in. Two properties have to hold or the
 * whole scheme is unsafe: a device id can never be shaped like a user id, and a caller cannot
 * choose someone else's key by sending a header.
 */
function fakeRequest(headers: Record<string, string | string[]> = {}, user?: Record<string, unknown>): Request {
  return {
    headers,
    user,
    isAuthenticated: () => user != null,
  } as unknown as Request;
}

describe("deviceIdFrom", () => {
  it("accepts a plausible device id", () => {
    assert.equal(deviceIdFrom(fakeRequest({ "x-device-id": "a1b2c3d4e5f6a7b8" })), "a1b2c3d4e5f6a7b8");
  });

  it("rejects one that is too short to be random", () => {
    assert.equal(deviceIdFrom(fakeRequest({ "x-device-id": "abc" })), null);
  });

  it("rejects anything with characters that could change the key's meaning", () => {
    assert.equal(deviceIdFrom(fakeRequest({ "x-device-id": "abcdefgh:ijklmnop" })), null);
    assert.equal(deviceIdFrom(fakeRequest({ "x-device-id": "abcdefgh ijklmnop" })), null);
  });

  it("returns null when the header is missing", () => {
    assert.equal(deviceIdFrom(fakeRequest()), null);
  });
});

describe("actorKeyFrom", () => {
  it("uses the signed-in user's id, ignoring any device header they also sent", () => {
    const request = fakeRequest({ "x-device-id": "a1b2c3d4e5f6a7b8" }, { id: "user-42" });
    assert.equal(actorKeyFrom(request), "user-42");
  });

  it("namespaces an anonymous key so it can never collide with a user id", () => {
    const key = actorKeyFrom(fakeRequest({ "x-device-id": "a1b2c3d4e5f6a7b8" }));
    assert.equal(key, anonymousActorKey("a1b2c3d4e5f6a7b8"));
    assert.ok(key!.startsWith("anon:"));
  });

  it("cannot be tricked into producing a bare user id from a header", () => {
    // A device id may not contain a colon, so "anon:" cannot be escaped out of.
    assert.equal(actorKeyFrom(fakeRequest({ "x-device-id": "user-42" })), null);
  });

  it("returns null when the caller is neither signed in nor identifiable", () => {
    assert.equal(actorKeyFrom(fakeRequest()), null);
  });
});

describe("actorDisplayName", () => {
  it("prefers a full name", () => {
    assert.equal(
      actorDisplayName(fakeRequest({}, { id: "1", firstName: "Riya", lastName: "Desai" })),
      "Riya Desai",
    );
  });

  it("falls back to the local part of the email rather than showing the address", () => {
    const name = actorDisplayName(fakeRequest({}, { id: "1", email: "riya@example.com" }));
    assert.equal(name, "riya");
    assert.ok(!name.includes("@"));
  });

  it("uses the fallback for a signed-out submitter", () => {
    assert.equal(actorDisplayName(fakeRequest(), "A neighbour"), "A neighbour");
  });
});
