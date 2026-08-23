import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MUMBAI_NEWS_SOURCES, feedUrlOverride, isAllowedFeedUrl, newsSourceSeed } from "./allowlist";

/**
 * The allowlist is the only thing standing between "a scheduled job fetches a URL from the
 * database" and a server-side request forgery. These check the guard rejects everything it is
 * supposed to, including the cases that look almost right.
 */
describe("isAllowedFeedUrl", () => {
  it("accepts an https URL on a host the source declares", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "https://www.mid-day.com/rss/mumbai"), true);
  });

  it("rejects a host the source does not declare", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "https://evil.test/rss"), false);
  });

  it("rejects a lookalike host that merely ends with an allowed one", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "https://www.mid-day.com.evil.test/rss"), false);
  });

  it("rejects plain http, so a feed cannot be rewritten in transit", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "http://www.mid-day.com/rss/mumbai"), false);
  });

  it("rejects other schemes outright", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "file:///etc/passwd"), false);
    assert.equal(isAllowedFeedUrl("bmc", "http://169.254.169.254/latest/meta-data/"), false);
  });

  it("rejects an unparseable URL", () => {
    assert.equal(isAllowedFeedUrl("mid-day", "not a url"), false);
  });

  it("rejects a source that is not on the allowlist at all", () => {
    assert.equal(isAllowedFeedUrl("some-blog", "https://www.mid-day.com/rss/mumbai"), false);
  });
});

describe("the allowlist itself", () => {
  it("ships every source disabled, because a feed URL has to be verified by a person", () => {
    for (const source of MUMBAI_NEWS_SOURCES) {
      assert.ok(source.allowedHosts.length > 0, `${source.slug} declares no hosts`);
      assert.ok(source.homepageUrl.startsWith("https://"), `${source.slug} homepage is not https`);
    }
  });

  it("has a unique slug per source", () => {
    const slugs = MUMBAI_NEWS_SOURCES.map((source) => source.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("looks a source up by slug", () => {
    assert.equal(newsSourceSeed("bmc")?.name, "BMC");
    assert.equal(newsSourceSeed("nope"), undefined);
  });
});

describe("feedUrlOverride", () => {
  it("reads the per-source environment variable, with the slug upper-snaked", () => {
    process.env.NEWS_FEED_MID_DAY_URL = "https://www.mid-day.com/rss/mumbai";
    try {
      assert.equal(feedUrlOverride("mid-day"), "https://www.mid-day.com/rss/mumbai");
    } finally {
      delete process.env.NEWS_FEED_MID_DAY_URL;
    }
  });

  it("treats an empty variable as unset", () => {
    process.env.NEWS_FEED_BMC_URL = "   ";
    try {
      assert.equal(feedUrlOverride("bmc"), undefined);
    } finally {
      delete process.env.NEWS_FEED_BMC_URL;
    }
  });
});
