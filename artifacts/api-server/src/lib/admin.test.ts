import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";

import { adminEmails, isAdminEmail, requireAdmin } from "./admin";

/**
 * The admin allowlist decides who can edit every content row and take a post down, so the
 * cases worth pinning are the ones where a mistake opens it up: an unset variable, a casing
 * difference, a signed-in account that simply is not on the list.
 */
const originalAdmins = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (originalAdmins === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdmins;
});

function fakeRequest(user?: { id: string; email: string | null }): Request {
  return {
    user,
    isAuthenticated: () => user != null,
    log: { warn: () => {}, error: () => {} },
  } as unknown as Request;
}

function fakeResponse() {
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, captured };
}

describe("adminEmails", () => {
  it("parses a comma-separated list, trimming and lowercasing", () => {
    process.env.ADMIN_EMAILS = " Ops@Example.com , editor@example.com ";
    assert.deepEqual(adminEmails(), ["ops@example.com", "editor@example.com"]);
  });

  it("is empty when unset, so nothing can accidentally be treated as configured", () => {
    delete process.env.ADMIN_EMAILS;
    assert.deepEqual(adminEmails(), []);
  });

  it("ignores empty entries from a trailing comma", () => {
    process.env.ADMIN_EMAILS = "ops@example.com,,";
    assert.deepEqual(adminEmails(), ["ops@example.com"]);
  });
});

describe("isAdminEmail", () => {
  it("matches regardless of casing or surrounding space", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    assert.equal(isAdminEmail(" OPS@Example.com "), true);
  });

  it("rejects a null or missing email", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAdminEmail(undefined), false);
  });
});

describe("requireAdmin", () => {
  it("refuses everyone when the allowlist is unset — a missing config is not 'everyone'", () => {
    delete process.env.ADMIN_EMAILS;
    const { res, captured } = fakeResponse();
    let passed = false;

    requireAdmin(fakeRequest({ id: "1", email: "ops@example.com" }), res, (() => {
      passed = true;
    }) as NextFunction);

    assert.equal(passed, false);
    assert.equal(captured.status, 503);
  });

  it("answers 401 for a signed-out caller", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    const { res, captured } = fakeResponse();

    requireAdmin(fakeRequest(), res, (() => assert.fail("should not pass")) as NextFunction);

    assert.equal(captured.status, 401);
  });

  it("answers 403 for a signed-in account that is not on the list", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    const { res, captured } = fakeResponse();

    requireAdmin(
      fakeRequest({ id: "2", email: "someone@example.com" }),
      res,
      (() => assert.fail("should not pass")) as NextFunction,
    );

    assert.equal(captured.status, 403);
  });

  it("lets an allowlisted admin through", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    const { res } = fakeResponse();
    let passed = false;

    requireAdmin(fakeRequest({ id: "3", email: "Ops@example.com" }), res, (() => {
      passed = true;
    }) as NextFunction);

    assert.equal(passed, true);
  });
});
