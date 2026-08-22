import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_LIMIT, MAX_LIMIT, parseLimit, parseOffset } from "./pagination";

describe("parseLimit", () => {
  it("falls back to the default for anything unusable", () => {
    for (const value of [undefined, null, "", "abc", "0", "-5"]) {
      assert.equal(parseLimit(value), DEFAULT_LIMIT);
    }
  });

  it("caps the limit so one request cannot sweep the table", () => {
    assert.equal(parseLimit("100000"), MAX_LIMIT);
  });

  it("passes a sensible limit through", () => {
    assert.equal(parseLimit("20"), 20);
  });
});

describe("parseOffset", () => {
  it("treats anything unusable or negative as no offset", () => {
    for (const value of [undefined, null, "", "abc", "-1"]) {
      assert.equal(parseOffset(value), 0);
    }
  });

  it("passes a real offset through", () => {
    assert.equal(parseOffset("120"), 120);
  });
});
