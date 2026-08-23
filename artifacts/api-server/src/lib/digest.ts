import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { db, dealsTable, eventsTable, newsItemsTable, pulsePostsTable } from "@workspace/db";

import { cityMatches } from "./sqlFilters";

/**
 * The Pulse digest: the best of everything the app holds for a city, in one ranked response.
 *
 * Pulse used to be a feed of one content type behind a row of filter chips. It is a front page
 * now — what is on tonight, where to eat, what is about to expire — which means it has to draw
 * from six tables at once. Composing that in the app would mean six round trips on the busiest
 * screen, and a ranking nobody could audit; Phase 1 moved the list endpoints away from exactly
 * that pattern and this follows it.
 *
 * Pulse answers one question — what is happening in this city right now — so it holds only
 * things that change: news, offers that are running out, events that have not happened yet, and
 * what the city desk has written. Top-rated restaurants and films are not that question; the
 * category grid and Explore already browse the catalogue, and duplicating them here made the
 * front page longer without making it more useful.
 *
 * "Top" is a stated rule per section rather than a score:
 *
 * | Section  | What it holds         | Ordered by                |
 * | -------- | --------------------- | ------------------------- |
 * | news     | published local news  | most recently published   |
 * | deals    | unexpired deals       | expiring soonest          |
 * | now      | events within 14 days | soonest first             |
 * | pulse    | the city desk         | featured first, then newest |
 *
 * A section with nothing in it is left out rather than rendered empty, so a city with a thin
 * catalogue gets a shorter page instead of a page full of apologies.
 */

const HORIZON_DAYS = 14;

export type DigestEntry = {
  id: number;
  title: string;
  subtitle: string | null;
  /** Long-form text for the kinds that are read in place, such as a Pulse post. */
  body: string | null;
  imageUrl: string | null;
  /** Bare numbers. The app formats them through `formatPriceForCity`; nothing here is a symbol. */
  price: number | null;
  currency: string | null;
  isFree: boolean | null;
  rating: number | null;
  startDate: string | null;
  discountText: string | null;
  /** Provenance, on the kinds that make a claim. */
  source: string | null;
  trustLabel: string | null;
  confidence: string | null;
  authorName: string | null;
  authorHandle: string | null;
  likeCount: number | null;
  saveCount: number | null;
  viewerHasLiked: boolean | null;
  viewerHasSaved: boolean | null;
  answerCount: number | null;
  upvoteCount: number | null;
  publishedAt: string | null;
};

export type DigestSection = {
  id: string;
  label: string;
  /** What the entries are, so the app knows which card to draw and where a tap goes. */
  kind: "pulse" | "news" | "event" | "deal";
  entries: DigestEntry[];
};

/** Every field defaults to null, so each section only fills in what its kind actually has. */
function entry(partial: Partial<DigestEntry> & { id: number; title: string }): DigestEntry {
  return {
    subtitle: null,
    body: null,
    imageUrl: null,
    price: null,
    currency: null,
    isFree: null,
    rating: null,
    startDate: null,
    discountText: null,
    source: null,
    trustLabel: null,
    confidence: null,
    authorName: null,
    authorHandle: null,
    likeCount: null,
    saveCount: null,
    viewerHasLiked: null,
    viewerHasSaved: null,
    answerCount: null,
    upvoteCount: null,
    publishedAt: null,
    ...partial,
  };
}

export async function buildDigest(
  city: string,
  viewer: Map<number, { liked: boolean; saved: boolean }>,
): Promise<DigestSection[]> {
  const horizon = new Date(Date.now() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const publishedAt = sql`coalesce(${pulsePostsTable.publishedAt}, ${pulsePostsTable.createdAt})`;

  const [news, deals, events, posts] = await Promise.all([
    db
      .select()
      .from(newsItemsTable)
      .where(and(cityMatches(newsItemsTable.city, city), eq(newsItemsTable.status, "published")))
      .orderBy(desc(sql`coalesce(${newsItemsTable.publishedAt}, ${newsItemsTable.createdAt})`))
      .limit(8),

    db
      .select()
      .from(dealsTable)
      .where(
        and(
          cityMatches(dealsTable.city, city),
          or(isNull(dealsTable.expiresAt), gte(dealsTable.expiresAt, new Date())),
        ),
      )
      .orderBy(sql`${dealsTable.expiresAt} asc nulls last`)
      .limit(6),

    db
      .select()
      .from(eventsTable)
      .where(
        and(
          cityMatches(eventsTable.city, city),
          gte(eventsTable.startDate, new Date()),
          sql`${eventsTable.startDate} <= ${horizon}`,
        ),
      )
      .orderBy(asc(eventsTable.startDate))
      .limit(6),

    // Featured first so an editorial hero leads the desk, newest after.
    db
      .select()
      .from(pulsePostsTable)
      .where(and(cityMatches(pulsePostsTable.city, city), eq(pulsePostsTable.status, "published")))
      .orderBy(desc(pulsePostsTable.isFeatured), desc(publishedAt))
      .limit(6),
  ]);

  const pulseEntry = (post: (typeof posts)[number]) => {
    const state = viewer.get(post.id) ?? { liked: false, saved: false };
    return entry({
      id: post.id,
      title: post.authorName,
      subtitle: [post.authorHandle, post.location].filter(Boolean).join(" · ") || null,
      body: post.caption,
      imageUrl: post.mediaUrl,
      source: post.source,
      trustLabel: post.trustLabel,
      confidence: post.confidence,
      authorName: post.authorName,
      authorHandle: post.authorHandle,
      likeCount: post.likeCount,
      saveCount: post.saveCount,
      viewerHasLiked: state.liked,
      viewerHasSaved: state.saved,
      publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    });
  };

  const sections: DigestSection[] = [
    {
      id: "news",
      label: "Local news",
      kind: "news",
      entries: news.map((item) =>
        entry({
          id: item.id,
          title: item.headline,
          subtitle: item.sourceName,
          body: item.summary,
          imageUrl: item.imageUrl,
          source: item.sourceName,
          trustLabel: item.trustLabel,
          confidence: item.confidence,
          publishedAt: (item.publishedAt ?? item.createdAt).toISOString(),
        }),
      ),
    },
    {
      id: "deals",
      label: "Offers running now",
      kind: "deal",
      entries: deals.map((deal) =>
        entry({
          id: deal.id,
          title: deal.title,
          subtitle: deal.placeName,
          imageUrl: deal.imageUrl,
          price: deal.dealPrice,
          discountText: deal.discountText,
          // The card says how long is left, which is the whole reason this section exists.
          startDate: deal.expiresAt?.toISOString() ?? null,
        }),
      ),
    },
    {
      id: "now",
      label: "On in the city",
      kind: "event",
      entries: events.map((event) =>
        entry({
          id: event.id,
          title: event.title,
          subtitle: event.venue,
          imageUrl: event.imageUrl,
          price: event.price,
          isFree: event.isFree,
          startDate: event.startDate.toISOString(),
        }),
      ),
    },
    {
      id: "pulse",
      label: "From the city desk",
      kind: "pulse",
      entries: posts.map(pulseEntry),
    },
  ];

  return sections.filter((section) => section.entries.length > 0);
}
