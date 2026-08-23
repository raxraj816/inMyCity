import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { firstWords, parseFeed, stripHtml } from "./feed";

/**
 * The Mumbai civic feeds this has to swallow are inconsistent in every way a feed can be:
 * RSS and Atom, guid or no guid, HTML in the summary, images in three different elements.
 * These cover the shapes that actually turn up, plus the ones that would crash a naive parser.
 */

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Example Mumbai</title>
    <item>
      <title>Heavy rain expected across Mumbai through Thursday</title>
      <link>https://example.test/rain</link>
      <guid isPermaLink="false">example-rain-1</guid>
      <description>&lt;p&gt;IMD has issued an &lt;b&gt;orange alert&lt;/b&gt;.&lt;/p&gt;</description>
      <pubDate>Wed, 20 Aug 2025 06:30:00 +0530</pubDate>
      <enclosure url="https://example.test/rain.jpg" type="image/jpeg" length="1024" />
    </item>
    <item>
      <title>Western Line megablock on Sunday</title>
      <link>https://example.test/megablock</link>
      <media:content url="https://example.test/train.jpg" />
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <id>urn:uuid:1234</id>
    <title>BEST adds night buses on three routes</title>
    <link rel="alternate" href="https://example.test/best" />
    <summary>Service extends to 1am from Monday.</summary>
    <updated>2025-08-20T09:00:00Z</updated>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("reads an RSS item down to headline, summary, link, image and date", () => {
    const [entry] = parseFeed("imd-mumbai", RSS);

    assert.equal(entry.headline, "Heavy rain expected across Mumbai through Thursday");
    assert.equal(entry.summary, "IMD has issued an orange alert.");
    assert.equal(entry.link, "https://example.test/rain");
    assert.equal(entry.imageUrl, "https://example.test/rain.jpg");
    assert.equal(entry.publishedAt?.toISOString(), "2025-08-20T01:00:00.000Z");
  });

  it("reads Atom, where the link is an attribute and the id is not a guid", () => {
    const [entry] = parseFeed("best-undertaking", ATOM);

    assert.equal(entry.headline, "BEST adds night buses on three routes");
    assert.equal(entry.link, "https://example.test/best");
    assert.equal(entry.publishedAt?.toISOString(), "2025-08-20T09:00:00.000Z");
  });

  it("falls back to the link when an item has no guid, so re-runs still match", () => {
    const [, second] = parseFeed("imd-mumbai", RSS);
    const [, secondAgain] = parseFeed("imd-mumbai", RSS);

    assert.equal(second.externalId, secondAgain.externalId);
    assert.match(second.externalId, /^imd-mumbai:[0-9a-f]{24}$/);
  });

  it("namespaces the external id by source, so two feeds carrying one wire story do not collide", () => {
    const [fromImd] = parseFeed("imd-mumbai", RSS);
    const [fromBmc] = parseFeed("bmc", RSS);

    assert.notEqual(fromImd.externalId, fromBmc.externalId);
  });

  it("drops a repeated guid rather than importing the item twice", () => {
    const duplicated = RSS.replace("</channel>", `
      <item>
        <title>Heavy rain expected across Mumbai through Thursday</title>
        <guid isPermaLink="false">example-rain-1</guid>
      </item>
    </channel>`);

    assert.equal(parseFeed("imd-mumbai", duplicated).length, 2);
  });

  it("skips an item with no headline instead of importing a blank card", () => {
    const headless = RSS.replace(
      "<title>Western Line megablock on Sunday</title>",
      "<title></title>",
    );

    assert.equal(parseFeed("imd-mumbai", headless).length, 1);
  });

  it("returns nothing for a document that is not a feed, rather than throwing", () => {
    assert.deepEqual(parseFeed("bmc", "<html><body>404</body></html>"), []);
    assert.deepEqual(parseFeed("bmc", "not xml at all"), []);
    assert.deepEqual(parseFeed("bmc", ""), []);
  });
});

describe("content:encoded fallback", () => {
  it("reads the article body when the feed leaves description empty", () => {
    // The Free Press Journal feed does exactly this: an empty <description> and the text in
    // <content:encoded>. Without the fallback every card ships with a blank summary.
    const feed = `<rss version="2.0"><channel><item>
      <title>GRP records a second statement</title>
      <guid>fpj-1</guid>
      <description></description>
      <content:encoded><![CDATA[ <p><strong>Mumbai:</strong> The Government Railway Police recorded a statement on Saturday.</p> ]]></content:encoded>
    </item></channel></rss>`;

    const [entry] = parseFeed("free-press-journal", feed);
    assert.equal(entry.summary, "Mumbai: The Government Railway Police recorded a statement on Saturday.");
  });

  it("caps a full article at short-news length", () => {
    const body = Array.from({ length: 200 }, (_, index) => `word${index}`).join(" ");
    const feed = `<rss version="2.0"><channel><item>
      <title>A long one</title><guid>fpj-2</guid>
      <content:encoded><![CDATA[ <p>${body}</p> ]]></content:encoded>
    </item></channel></rss>`;

    const [entry] = parseFeed("free-press-journal", feed);
    assert.equal(entry.summary!.split(/\s+/).length, 60);
    assert.ok(entry.summary!.endsWith("…"));
  });
});

describe("firstWords", () => {
  it("leaves anything already short enough alone, with no ellipsis", () => {
    assert.equal(firstWords("three little words", 60), "three little words");
  });

  it("cuts on a word boundary rather than mid-word", () => {
    assert.equal(firstWords("one two three four", 2), "one two…");
  });

  it("does not strand a comma against the ellipsis", () => {
    assert.equal(firstWords("Mumbai, Pune and Nashik", 1), "Mumbai…");
  });
});

describe("stripHtml", () => {
  it("removes markup and collapses the whitespace it leaves behind", () => {
    assert.equal(stripHtml("<p>One</p>\n<p>Two</p>"), "One Two");
  });

  it("truncates rather than letting a full article body into a summary", () => {
    const long = stripHtml("a".repeat(600));
    assert.equal(long?.length, 400);
    assert.ok(long?.endsWith("…"));
  });

  it("treats markup-only input as empty", () => {
    assert.equal(stripHtml("<br/><span> </span>"), null);
    assert.equal(stripHtml(null), null);
  });
});
