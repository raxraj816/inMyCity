/**
 * How the Pulse feed decides what comes next.
 *
 * Pulse is one uninterrupted column — no sections, no filter chips, no tabs. That makes
 * ordering the entire product: a reader who does not like card three has no control to rescue
 * it with, they just stop scrolling. So the rules here are stated rather than scored, the way
 * the section rules in `digest.ts` were, and any card's position can be explained in a
 * sentence.
 *
 * Three bands, in order:
 *
 * | Band   | What lands in it                                                             |
 * | ------ | ---------------------------------------------------------------------------- |
 * | now    | events within 24h · deals ending within 48h · news under 3h · featured posts  |
 * | week   | events within 7d · deals ending within 7d · news under 24h · posts under 24h  |
 * | around | everything else still inside the window                                       |
 *
 * Within a band the item closest to *right now* comes first — time until it starts for
 * something ahead of us, time since it happened for something behind us. One axis, both
 * directions, which is what lets a concert tonight and a story from an hour ago sit in the
 * same list without either being sorted nonsensically.
 *
 * Nothing here touches the database, so the ordering is testable on its own.
 */

export const FEED_KINDS = ["post", "news", "event", "deal", "ad"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export const FEED_BANDS = ["now", "week", "around"] as const;
export type FeedBand = (typeof FEED_BANDS)[number];

const BAND_ORDER: Record<FeedBand, number> = { now: 0, week: 1, around: 2 };

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Never more than this many cards of one kind in a row. */
const MAX_RUN = 2;

/** Where sponsored cards sit. Fixed slots, never a ranking outcome. */
export const AD_FIRST_SLOT = 3;
export const AD_EVERY = 8;

/**
 * The little a candidate has to say about itself to be ordered.
 *
 * Deliberately not the card: ranking should not be able to depend on a headline or an image,
 * because then "why is this third" stops having an answer.
 */
export type Rankable = {
  /** Stable across pages and unique across kinds, e.g. `deal:412`. */
  key: string;
  kind: FeedKind;
  /** The moment the item is about — when it was published, when it starts, when it expires. */
  at: number;
  /** Editorially pinned. Only the city desk sets this. */
  featured?: boolean;
  /** False for an offer with no end date: it can sit there for a year, so it is never urgent. */
  dated?: boolean;
};

export function bandFor(item: Rankable, asOf: number): FeedBand {
  const delta = item.at - asOf;

  switch (item.kind) {
    case "event":
      // Something already under way has missed its moment; it is not what to lead with.
      if (delta < 0) return "around";
      if (delta <= DAY) return "now";
      if (delta <= 7 * DAY) return "week";
      return "around";

    case "deal":
      if (item.dated === false) return "around";
      if (delta <= 2 * DAY) return "now";
      if (delta <= 7 * DAY) return "week";
      return "around";

    case "news":
      if (asOf - item.at <= 3 * HOUR) return "now";
      if (asOf - item.at <= DAY) return "week";
      return "around";

    case "post":
      if (item.featured) return "now";
      return asOf - item.at <= DAY ? "week" : "around";

    case "ad":
      // Ads are slotted by position, never ranked. This is here so the union is exhaustive.
      return "around";
  }
}

/** How far an item sits from now, in either direction. The sort key inside a band. */
export function distanceFromNow(item: Rankable, asOf: number): number {
  return Math.abs(item.at - asOf);
}

/**
 * Break up runs of one kind.
 *
 * Six offers in a row reads as an ad break even when every one of them is organic, so the
 * third consecutive card of a kind is swapped for the next card that is anything else. Only
 * ever pulls a later item forward, and only to break a run — so when the tail of the list is
 * all one kind, band order gives way to variety rather than the other way round. That trade is
 * deliberate: a reader notices monotony long before they notice a day-old story ranked high.
 */
export function interleave<T extends Rankable>(items: T[]): T[] {
  const remaining = [...items];
  const out: T[] = [];
  let runKind: FeedKind | null = null;
  let run = 0;

  while (remaining.length > 0) {
    let index = 0;
    if (run >= MAX_RUN) {
      const alternative = remaining.findIndex((item) => item.kind !== runKind);
      if (alternative !== -1) index = alternative;
    }

    const [next] = remaining.splice(index, 1);
    if (next.kind === runKind) {
      run += 1;
    } else {
      runKind = next.kind;
      run = 1;
    }
    out.push(next);
  }

  return out;
}

/**
 * The whole ordering, start to finish.
 *
 * Deterministic for a given `asOf` — same candidates in, same order out, every time. That is
 * what makes paging safe: page two re-runs this with the timestamp page one stamped, so a
 * deal expiring mid-scroll cannot shuffle a card the reader has already passed back into view.
 */
export function rank<T extends Rankable>(candidates: T[], asOf: number): T[] {
  const ordered = [...candidates]
    .map((item) => ({ item, band: BAND_ORDER[bandFor(item, asOf)], distance: distanceFromNow(item, asOf) }))
    .sort(
      (a, b) =>
        a.band - b.band ||
        a.distance - b.distance ||
        // Never leave two equally-placed items to the sort's discretion; paging depends on it.
        (a.item.key < b.item.key ? -1 : a.item.key > b.item.key ? 1 : 0),
    )
    .map((row) => row.item);

  return interleave(ordered);
}

/**
 * Drop sponsored cards into their fixed slots.
 *
 * Every ad is used at most once. Repeating one to fill every slot would inflate the
 * impressions an advertiser is billed for and wear the reader out, so a short flight simply
 * means fewer ads in the scroll.
 */
export function withAds<T extends Rankable>(organic: T[], ads: T[]): T[] {
  if (ads.length === 0) return organic;

  const out: T[] = [];
  const queue = [...ads];

  for (let index = 0; index < organic.length; index += 1) {
    if (queue.length > 0 && index >= AD_FIRST_SLOT && (index - AD_FIRST_SLOT) % AD_EVERY === 0) {
      out.push(queue.shift()!);
    }
    out.push(organic[index]);
  }

  return out;
}

/**
 * Where a reader is in the feed.
 *
 * `asOf` is the timestamp the first page was built at, carried forward so every later page is
 * ranked against the same clock. Opaque on the wire on purpose: when the ranking learns to
 * take the reader into account, what is inside here changes without touching the API contract.
 */
export type FeedCursor = { asOf: number; offset: number };

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * A cursor we issued, or null for anything else — a truncated string, a hand-edited one, or
 * simply the first request of a session. Every one of those means "start at the top".
 */
export function decodeCursor(raw: unknown): FeedCursor | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;

    const { asOf, offset } = parsed as Record<string, unknown>;
    if (!Number.isFinite(asOf) || !Number.isFinite(offset)) return null;
    if ((offset as number) < 0) return null;

    return { asOf: asOf as number, offset: Math.floor(offset as number) };
  } catch {
    return null;
  }
}

/**
 * The clock the feed is built against.
 *
 * A cursor is a client-supplied value, and `asOf` is used as "now" by the queries behind it —
 * so left unchecked it decides which offers count as expired. Clamped to the recent past: far
 * enough back for a slow scroll, never far enough to resurrect a finished offer or to reach
 * forward past content that has not gone live.
 */
export const MAX_CURSOR_AGE_MS = 6 * HOUR;

export function clampAsOf(asOf: number | undefined, now: number): number {
  if (asOf === undefined || !Number.isFinite(asOf)) return now;
  if (asOf > now) return now;
  return Math.max(asOf, now - MAX_CURSOR_AGE_MS);
}
