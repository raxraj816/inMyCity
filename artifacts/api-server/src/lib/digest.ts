import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import {
  activitiesTable,
  db,
  dealsTable,
  eventsTable,
  moviesTable,
  placesTable,
  pulsePostsTable,
  qaQuestionsTable,
} from "@workspace/db";

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
 * "Top" is a stated rule per section rather than a score:
 *
 * | Section   | What it holds        | Ordered by                         |
 * | --------- | -------------------- | ---------------------------------- |
 * | featured  | one editorial post   | most recently published            |
 * | now       | events within 14 days| soonest first                      |
 * | pulse     | the rest of the desk | most recently published            |
 * | eat       | food places          | rating, then review count          |
 * | deals     | unexpired deals      | expiring soonest                   |
 * | do        | activities           | rating, then review count          |
 * | watch     | films now showing    | rating                             |
 * | asked     | answered questions   | upvotes, then most recent          |
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
  kind: "pulse" | "event" | "place" | "deal" | "activity" | "movie" | "question";
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

  const [featured, events, desk, food, deals, activities, movies, questions] = await Promise.all([
    db
      .select()
      .from(pulsePostsTable)
      .where(
        and(
          cityMatches(pulsePostsTable.city, city),
          eq(pulsePostsTable.status, "published"),
          eq(pulsePostsTable.isFeatured, true),
        ),
      )
      .orderBy(desc(publishedAt))
      .limit(1),

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
      .limit(4),

    db
      .select()
      .from(pulsePostsTable)
      .where(
        and(
          cityMatches(pulsePostsTable.city, city),
          eq(pulsePostsTable.status, "published"),
          eq(pulsePostsTable.isFeatured, false),
        ),
      )
      .orderBy(desc(publishedAt))
      .limit(5),

    db
      .select()
      .from(placesTable)
      .where(and(cityMatches(placesTable.city, city), eq(placesTable.category, "food")))
      .orderBy(desc(placesTable.rating), desc(placesTable.reviewCount))
      .limit(4),

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
      .limit(3),

    db
      .select()
      .from(activitiesTable)
      .where(cityMatches(activitiesTable.city, city))
      .orderBy(desc(activitiesTable.rating), desc(activitiesTable.reviewCount))
      .limit(4),

    db
      .select()
      .from(moviesTable)
      .where(and(cityMatches(moviesTable.city, city), eq(moviesTable.status, "now_showing")))
      .orderBy(desc(moviesTable.rating))
      .limit(4),

    db
      .select()
      .from(qaQuestionsTable)
      .where(
        and(
          cityMatches(qaQuestionsTable.city, city),
          eq(qaQuestionsTable.status, "published"),
          sql`${qaQuestionsTable.answerCount} > 0`,
        ),
      )
      .orderBy(desc(qaQuestionsTable.upvoteCount), desc(qaQuestionsTable.createdAt))
      .limit(3),
  ]);

  const pulseEntry = (post: (typeof featured)[number]) => {
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
      id: "featured",
      label: "Featured",
      kind: "pulse",
      entries: featured.map(pulseEntry),
    },
    {
      id: "now",
      label: "Happening soon",
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
      entries: desk.map(pulseEntry),
    },
    {
      id: "eat",
      label: "Where to eat",
      kind: "place",
      entries: food.map((place) =>
        entry({
          id: place.id,
          title: place.name,
          subtitle: place.address,
          imageUrl: place.imageUrl,
          rating: place.rating,
        }),
      ),
    },
    {
      id: "deals",
      label: "Ending soon",
      kind: "deal",
      entries: deals.map((deal) =>
        entry({
          id: deal.id,
          title: deal.title,
          subtitle: deal.placeName,
          imageUrl: deal.imageUrl,
          price: deal.dealPrice,
          discountText: deal.discountText,
        }),
      ),
    },
    {
      id: "do",
      label: "Things to do",
      kind: "activity",
      entries: activities.map((activity) =>
        entry({
          id: activity.id,
          title: activity.name,
          subtitle: activity.address,
          imageUrl: activity.imageUrl,
          price: activity.price,
          currency: activity.currency,
          rating: activity.rating,
        }),
      ),
    },
    {
      id: "watch",
      label: "In cinemas",
      kind: "movie",
      entries: movies.map((movie) =>
        entry({
          id: movie.id,
          title: movie.title,
          subtitle: [movie.genre, movie.language].filter(Boolean).join(" · ") || null,
          imageUrl: movie.posterUrl,
          price: movie.price,
          rating: movie.rating,
        }),
      ),
    },
    {
      id: "asked",
      label: "Mumbai asks",
      kind: "question",
      entries: questions.map((question) =>
        entry({
          id: question.id,
          title: question.question,
          subtitle: question.authorName,
          answerCount: question.answerCount,
          upvoteCount: question.upvoteCount,
          publishedAt: (question.publishedAt ?? question.createdAt).toISOString(),
        }),
      ),
    },
  ];

  return sections.filter((section) => section.entries.length > 0);
}
