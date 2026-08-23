import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import {
  db,
  dealsTable,
  eventsTable,
  newsItemsTable,
  pulsePostsTable,
  sponsoredPlacementsTable,
} from "@workspace/db";

import { cityMatches } from "../sqlFilters";
import {
  clampAsOf,
  encodeCursor,
  rank,
  withAds,
  type FeedCursor,
  type FeedKind,
  type Rankable,
} from "./ranking";

/**
 * The Pulse feed: everything happening in a city, as one column a reader scrolls.
 *
 * This replaces the digest, which was four sections of horizontal tiles. The tiles were the
 * problem — nothing on the page was ever the main thing, a card expiring tonight got the same
 * 172 points as one expiring in a fortnight, and the whole page ended after twenty-six items.
 * A feed makes each item full width and the scroll effectively endless, which is the trade:
 * fewer things seen, each one actually seen.
 *
 * The ordering lives in `ranking.ts` and nothing here reorders anything. This file's job is
 * only to fetch a bounded pool of candidates, describe each one to the ranker, and turn the
 * slice the reader asked for into cards.
 *
 * Everything is still one request. Six list calls on the busiest screen is the pattern Phase 1
 * moved away from, and a feed that pages makes that worse, not better.
 */

/** How far back or forward each kind is worth pulling from. */
const NEWS_WINDOW_DAYS = 30;
const EVENT_WINDOW_DAYS = 60;
const POST_WINDOW_DAYS = 90;

/**
 * The most cards one ranking pass considers.
 *
 * A city feed is not infinite and pretending otherwise means an unbounded query on the screen
 * people open first. Past this depth a reader is no longer catching up on their city, and the
 * honest thing is to run out.
 */
export const MAX_FEED_ITEMS = 120;
const MAX_ADS = 8;
const PAGE_SIZE = 12;

const DAY = 86_400_000;

export type FeedItem = {
  /** Unique across kinds and stable across pages, so no two pages can draw the same card. */
  key: string;
  kind: FeedKind;
  id: number;
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  /** `image` or `video`, on the kinds that carry reader media. */
  mediaType: string | null;
  /** Where a news item was published, for the source rail under the headline. */
  link: string | null;
  category: string | null;
  /** Bare numbers. The app formats them through `formatPriceForCity`; nothing here is a symbol. */
  price: number | null;
  originalPrice: number | null;
  isFree: boolean | null;
  discountText: string | null;
  startDate: string | null;
  expiresAt: string | null;
  publishedAt: string | null;
  authorName: string | null;
  authorHandle: string | null;
  location: string | null;
  /** Provenance, on the kinds that make a claim. */
  source: string | null;
  trustLabel: string | null;
  confidence: string | null;
  likeCount: number | null;
  saveCount: number | null;
  viewerHasLiked: boolean | null;
  viewerHasSaved: boolean | null;
  isFeatured: boolean | null;
  /** Set only on a sponsored card. Its presence is what makes the label non-optional. */
  advertiserName: string | null;
  ctaLabel: string | null;
  /** Where tapping a sponsored card goes — always somewhere inside the app. */
  targetKind: string | null;
  targetId: number | null;
};

export type FeedPage = {
  city: string;
  items: FeedItem[];
  /** Null at the end of the feed, which is how the app knows to stop asking. */
  nextCursor: string | null;
};

/** Every field defaults to null, so each kind fills in only what it actually has. */
function card(partial: Partial<FeedItem> & { key: string; kind: FeedKind; id: number; title: string }): FeedItem {
  return {
    subtitle: null,
    body: null,
    imageUrl: null,
    mediaType: null,
    link: null,
    category: null,
    price: null,
    originalPrice: null,
    isFree: null,
    discountText: null,
    startDate: null,
    expiresAt: null,
    publishedAt: null,
    authorName: null,
    authorHandle: null,
    location: null,
    source: null,
    trustLabel: null,
    confidence: null,
    likeCount: null,
    saveCount: null,
    viewerHasLiked: null,
    viewerHasSaved: null,
    isFeatured: null,
    advertiserName: null,
    ctaLabel: null,
    targetKind: null,
    targetId: null,
    ...partial,
  };
}

/** A card paired with the little the ranker is allowed to know about it. */
type Candidate = Rankable & { card: FeedItem };

export async function buildFeed(
  city: string,
  viewer: Map<number, { liked: boolean; saved: boolean }>,
  cursor: FeedCursor | null,
): Promise<FeedPage> {
  const now = Date.now();
  const asOf = clampAsOf(cursor?.asOf, now);
  const offset = cursor?.offset ?? 0;
  const clock = new Date(asOf);

  const [news, deals, events, posts, placements] = await Promise.all([
    db
      .select()
      .from(newsItemsTable)
      .where(
        and(
          cityMatches(newsItemsTable.city, city),
          eq(newsItemsTable.status, "published"),
          gte(
            sql`coalesce(${newsItemsTable.publishedAt}, ${newsItemsTable.createdAt})`,
            new Date(asOf - NEWS_WINDOW_DAYS * DAY),
          ),
        ),
      )
      .orderBy(desc(sql`coalesce(${newsItemsTable.publishedAt}, ${newsItemsTable.createdAt})`))
      .limit(40),

    db
      .select()
      .from(dealsTable)
      .where(
        and(
          cityMatches(dealsTable.city, city),
          or(isNull(dealsTable.expiresAt), gte(dealsTable.expiresAt, clock)),
        ),
      )
      .orderBy(sql`${dealsTable.expiresAt} asc nulls last`)
      .limit(30),

    db
      .select()
      .from(eventsTable)
      .where(
        and(
          cityMatches(eventsTable.city, city),
          gte(eventsTable.startDate, clock),
          lte(eventsTable.startDate, new Date(asOf + EVENT_WINDOW_DAYS * DAY)),
        ),
      )
      .orderBy(eventsTable.startDate)
      .limit(30),

    db
      .select()
      .from(pulsePostsTable)
      .where(
        and(
          cityMatches(pulsePostsTable.city, city),
          eq(pulsePostsTable.status, "published"),
          gte(
            sql`coalesce(${pulsePostsTable.publishedAt}, ${pulsePostsTable.createdAt})`,
            new Date(asOf - POST_WINDOW_DAYS * DAY),
          ),
        ),
      )
      .orderBy(desc(sql`coalesce(${pulsePostsTable.publishedAt}, ${pulsePostsTable.createdAt})`))
      .limit(40),

    // Only what is booked, live, and inside its flight. An expired campaign keeps its row.
    db
      .select()
      .from(sponsoredPlacementsTable)
      .where(
        and(
          cityMatches(sponsoredPlacementsTable.city, city),
          eq(sponsoredPlacementsTable.isActive, true),
          lte(sponsoredPlacementsTable.startsAt, clock),
          gte(sponsoredPlacementsTable.endsAt, clock),
        ),
      )
      .orderBy(sponsoredPlacementsTable.priority, sponsoredPlacementsTable.id)
      .limit(MAX_ADS),
  ]);

  const candidates: Candidate[] = [
    ...news.map((item): Candidate => {
      const at = (item.publishedAt ?? item.createdAt).getTime();
      return {
        key: `news:${item.id}`,
        kind: "news",
        at,
        card: card({
          key: `news:${item.id}`,
          kind: "news",
          id: item.id,
          title: item.headline,
          subtitle: item.sourceName,
          body: item.summary,
          imageUrl: item.imageUrl,
          link: item.link,
          category: item.category,
          source: item.sourceName,
          trustLabel: item.trustLabel,
          confidence: item.confidence,
          publishedAt: new Date(at).toISOString(),
        }),
      };
    }),

    ...deals.map((deal): Candidate => {
      const at = (deal.expiresAt ?? deal.createdAt).getTime();
      return {
        key: `deal:${deal.id}`,
        kind: "deal",
        at,
        dated: deal.expiresAt !== null,
        card: card({
          key: `deal:${deal.id}`,
          kind: "deal",
          id: deal.id,
          title: deal.title,
          subtitle: deal.placeName,
          body: deal.description,
          imageUrl: deal.imageUrl,
          category: deal.category,
          price: deal.dealPrice,
          originalPrice: deal.originalPrice,
          discountText: deal.discountText,
          expiresAt: deal.expiresAt?.toISOString() ?? null,
          publishedAt: deal.createdAt.toISOString(),
        }),
      };
    }),

    ...events.map((event): Candidate => ({
      key: `event:${event.id}`,
      kind: "event",
      at: event.startDate.getTime(),
      card: card({
        key: `event:${event.id}`,
        kind: "event",
        id: event.id,
        title: event.title,
        subtitle: event.venue,
        body: event.description,
        imageUrl: event.imageUrl,
        category: event.category,
        price: event.price,
        isFree: event.isFree,
        startDate: event.startDate.toISOString(),
        publishedAt: event.createdAt.toISOString(),
      }),
    })),

    ...posts.map((post): Candidate => {
      const at = (post.publishedAt ?? post.createdAt).getTime();
      const state = viewer.get(post.id) ?? { liked: false, saved: false };
      return {
        key: `post:${post.id}`,
        kind: "post",
        at,
        featured: post.isFeatured,
        card: card({
          key: `post:${post.id}`,
          kind: "post",
          id: post.id,
          title: post.authorName,
          subtitle: post.location,
          body: post.caption,
          imageUrl: post.mediaUrl,
          mediaType: post.mediaType,
          authorName: post.authorName,
          authorHandle: post.authorHandle,
          location: post.location,
          source: post.source,
          trustLabel: post.trustLabel,
          confidence: post.confidence,
          likeCount: post.likeCount,
          saveCount: post.saveCount,
          viewerHasLiked: state.liked,
          viewerHasSaved: state.saved,
          isFeatured: post.isFeatured,
          publishedAt: new Date(at).toISOString(),
        }),
      };
    }),
  ];

  /**
   * A sponsored card draws the creative that was booked, and the target only decides where a
   * tap lands. Resolving each placement's target row to borrow its title and photo would mean
   * a query per ad on the busiest screen, and would let a card promise something the
   * advertiser never wrote.
   */
  const ads: Candidate[] = placements.map((placement) => ({
    key: `ad:${placement.id}`,
    kind: "ad",
    at: placement.startsAt.getTime(),
    card: card({
      key: `ad:${placement.id}`,
      kind: "ad",
      id: placement.id,
      title: placement.headline ?? placement.advertiserName,
      subtitle: placement.advertiserName,
      body: placement.body,
      imageUrl: placement.imageUrl,
      advertiserName: placement.advertiserName,
      ctaLabel: placement.ctaLabel,
      targetKind: placement.targetKind,
      targetId: placement.targetId,
    }),
  }));

  const ordered = withAds(rank(candidates, asOf), ads).slice(0, MAX_FEED_ITEMS);
  const page = ordered.slice(offset, offset + PAGE_SIZE);
  const nextOffset = offset + page.length;

  return {
    city,
    items: page.map((candidate) => candidate.card),
    // The clock travels with the cursor: every later page is ranked against the moment the
    // first one was built, so nothing the reader has already scrolled past can reappear.
    nextCursor: nextOffset < ordered.length ? encodeCursor({ asOf, offset: nextOffset }) : null,
  };
}
