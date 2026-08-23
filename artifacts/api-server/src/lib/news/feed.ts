import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

/**
 * RSS 2.0 and Atom, reduced to the handful of fields the news card actually shows.
 *
 * Indian civic feeds are inconsistent: some are RSS with a `guid`, some are Atom with an `id`,
 * a few give neither and only a link. `externalId` therefore falls back to a hash of the link
 * so re-running ingestion updates the same row instead of creating a second copy of the item.
 */

export type FeedEntry = {
  externalId: string;
  headline: string;
  summary: string | null;
  link: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  // Feed text is HTML-escaped; without this the summary keeps its &amp; and &#8217;.
  processEntities: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Feed nodes are sometimes a string and sometimes `{ '#text': …, '@_type': … }`. */
function textOf(node: unknown): string | null {
  if (node === undefined || node === null) return null;
  if (typeof node === "string") return node.trim() || null;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"].trim() || null;
  }
  return null;
}

/** Atom links are `<link rel="alternate" href="…"/>`; RSS links are plain text. */
function linkOf(node: unknown): string | null {
  const direct = textOf(node);
  if (direct) return direct;
  for (const candidate of asArray(node)) {
    if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      const rel = record["@_rel"];
      const href = record["@_href"];
      if (typeof href === "string" && (rel === undefined || rel === "alternate")) return href;
    }
  }
  return null;
}

const HTML_TAG = /<[^>]*>/g;
const WHITESPACE = /\s+/g;
// A tag becomes a space so `<p>One</p><p>Two</p>` does not read as "OneTwo" — which then
// leaves "alert ." wherever the markup sat against punctuation. Closing that gap back up is
// the difference between a summary that reads like prose and one that reads like a scrape.
const SPACE_BEFORE_PUNCTUATION = /\s+([.,;:!?%)\]}»”’])/g;
const SPACE_AFTER_OPENING = /([(\[{«“‘])\s+/g;

/** Feed summaries routinely carry markup. The card renders plain text, so strip it here. */
export function stripHtml(value: string | null, maxLength = 400): string | null {
  if (!value) return null;
  const text = value
    .replace(HTML_TAG, " ")
    .replace(WHITESPACE, " ")
    .replace(SPACE_BEFORE_PUNCTUATION, "$1")
    .replace(SPACE_AFTER_OPENING, "$1")
    .trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function imageOf(item: Record<string, unknown>): string | null {
  const enclosure = asArray(item["enclosure"]).find((entry) => {
    const record = entry as Record<string, unknown>;
    const type = record?.["@_type"];
    return typeof type === "string" && type.startsWith("image/");
  }) as Record<string, unknown> | undefined;
  if (enclosure && typeof enclosure["@_url"] === "string") return enclosure["@_url"];

  const mediaContent = asArray(item["media:content"])[0] as Record<string, unknown> | undefined;
  if (mediaContent && typeof mediaContent["@_url"] === "string") return mediaContent["@_url"];

  const mediaThumbnail = asArray(item["media:thumbnail"])[0] as Record<string, unknown> | undefined;
  if (mediaThumbnail && typeof mediaThumbnail["@_url"] === "string") return mediaThumbnail["@_url"];

  return null;
}

function dateOf(...candidates: unknown[]): Date | null {
  for (const candidate of candidates) {
    const text = textOf(candidate);
    if (!text) continue;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function externalIdOf(slug: string, rawId: string | null, link: string | null): string | null {
  const basis = rawId ?? link;
  if (!basis) return null;
  const digest = createHash("sha1").update(basis).digest("hex").slice(0, 24);
  return `${slug}:${digest}`;
}

/**
 * Parses a feed document into entries. Anything without a headline is dropped rather than
 * imported as a blank card, and a malformed document yields an empty list rather than throwing.
 */
export function parseFeed(slug: string, xml: string): FeedEntry[] {
  let document: Record<string, unknown>;
  try {
    document = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  const rss = document["rss"] as Record<string, unknown> | undefined;
  const channel = rss?.["channel"] as Record<string, unknown> | undefined;
  const feed = document["feed"] as Record<string, unknown> | undefined;

  const items = channel
    ? asArray(channel["item"])
    : feed
      ? asArray(feed["entry"])
      : asArray((document["rdf:RDF"] as Record<string, unknown> | undefined)?.["item"]);

  const entries: FeedEntry[] = [];
  const seen = new Set<string>();

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const headline = stripHtml(textOf(item["title"]), 240);
    if (!headline) continue;

    const link = linkOf(item["link"]);
    const rawId = textOf(item["guid"]) ?? textOf(item["id"]);
    const externalId = externalIdOf(slug, rawId, link);
    if (!externalId || seen.has(externalId)) continue;
    seen.add(externalId);

    entries.push({
      externalId,
      headline,
      summary: stripHtml(
        textOf(item["description"]) ?? textOf(item["summary"]) ?? textOf(item["content"]),
      ),
      link,
      imageUrl: imageOf(item),
      publishedAt: dateOf(item["pubDate"], item["published"], item["updated"], item["dc:date"]),
    });
  }

  return entries;
}
