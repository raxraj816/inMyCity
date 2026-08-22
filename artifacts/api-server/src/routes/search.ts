import { Router } from "express";
import {
  db,
  placesTable,
  eventsTable,
  dealsTable,
  hotelsTable,
  activitiesTable,
  moviesTable,
} from "@workspace/db";
import { and, desc, gte, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import { resolveIsOpen } from "../lib/openingHours";
import { parseOrigin } from "../lib/geo";
import { cityMatches, distanceKmExpression } from "../lib/sqlFilters";
import { expandSearchQuery, type ExpandedQuery } from "../lib/search/synonyms";
import { scoreResult } from "../lib/search/rank";

/**
 * One search endpoint across everything the city has.
 *
 * The app used to download every place, event, deal, hotel, activity and movie for the city
 * and filter them with `String.includes` — correct only while the catalogue is tiny, and
 * substring-only, so "vadapav" found nothing. Matching now happens in Postgres against the
 * `search_text` column, through a trigram index, after the query has been expanded with the
 * city's curated vocabulary.
 *
 * `search_text` always begins with the row's name or title, separated from the rest by " ~ ",
 * which is what lets relevance tell "the name is exactly this" apart from "the word appears
 * somewhere in the description".
 */

const router = Router();

/** Per-kind ceiling on rows pulled back for ranking. Counts are queried separately and exact. */
const KIND_FETCH_LIMIT = 60;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;
const MAX_SUGGESTIONS = 5;
/** Only the closest spellings are worth an extra index probe. */
const MAX_FUZZY_PHRASES = 4;
/** The row's own name: `search_text` always starts with it, before the first separator. */
const NAME_FIELD = sql`btrim(split_part(lower(search_text), ' ~ ', 1))`;

export const SEARCH_KINDS = ["place", "event", "deal", "hotel", "activity", "movie"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

type KindConfig = {
  table: PgTable;
  searchText: AnyPgColumn;
  city: AnyPgColumn;
  /** Filters that apply to browsing this kind at all, such as an event already being over. */
  baseCondition: (now: Date) => SQL | undefined;
};

const KIND_CONFIG: Record<SearchKind, KindConfig> = {
  place: {
    table: placesTable,
    searchText: placesTable.searchText,
    city: placesTable.city,
    baseCondition: () => undefined,
  },
  event: {
    table: eventsTable,
    searchText: eventsTable.searchText,
    city: eventsTable.city,
    baseCondition: (now) => gte(eventsTable.startDate, now),
  },
  deal: {
    table: dealsTable,
    searchText: dealsTable.searchText,
    city: dealsTable.city,
    baseCondition: (now) => or(isNull(dealsTable.expiresAt), gte(dealsTable.expiresAt, now)),
  },
  hotel: {
    table: hotelsTable,
    searchText: hotelsTable.searchText,
    city: hotelsTable.city,
    baseCondition: () => undefined,
  },
  activity: {
    table: activitiesTable,
    searchText: activitiesTable.searchText,
    city: activitiesTable.city,
    baseCondition: () => undefined,
  },
  movie: {
    table: moviesTable,
    searchText: moviesTable.searchText,
    city: moviesTable.city,
    baseCondition: () => undefined,
  },
};

export type SearchResult = {
  kind: SearchKind;
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  price: number | null;
  currency: string | null;
  badge: string | null;
  startDate: string | null;
  isOpen: boolean | null;
  distanceKm: number | null;
  tags: string[];
  score: number;
};

/**
 * Binds a JavaScript array as a single Postgres array parameter.
 *
 * Interpolating an array into a `sql` template expands it into a row constructor
 * (`($1, $2, …)`), which cannot be cast to `text[]`; this keeps it one parameter.
 */
function textArray(values: string[]): SQL {
  return sql`${sql.param(values)}::text[]`;
}

/**
 * Whole-word `LIKE` patterns. The spaces are what make them whole-word: stored text is padded
 * at both ends, so " bar " matches the word but never the middle of "bandra". The trigram
 * index serves these patterns directly, wildcards and all.
 */
function containsPatterns(phrases: string[]): string[] {
  return phrases.map((phrase) => `% ${phrase} %`);
}

function prefixPatterns(phrases: string[]): string[] {
  return phrases.map((phrase) => `${phrase}%`);
}

/**
 * Whether a row matches at all: the query (or one of its equivalent spellings) appears in the
 * row's text, or every meaningful word appears somewhere in it, or the row is a close enough
 * trigram match to survive a typo.
 */
function matchCondition(searchText: AnyPgColumn, query: ExpandedQuery): SQL {
  const clauses: SQL[] = [
    sql`lower(${searchText}) like any(${textArray(containsPatterns(query.phrases))})`,
    // Names match on a prefix too, so results appear while the user is still typing.
    sql`${NAME_FIELD} like any(${textArray(prefixPatterns(query.phrases))})`,
  ];

  if (query.words.length > 1) {
    clauses.push(
      sql.join(
        query.words.map((word) => sql`lower(${searchText}) like ${`% ${word} %`}`),
        sql` and `,
      ),
    );
  }

  // Typo tolerance is deliberately limited to the name. Trigram-matching a whole document
  // finds a 60%-similar fragment in almost anything — searching "chaat" returned an
  // electronics shop — while the same test against the name is precise.
  for (const phrase of query.phrases.slice(0, MAX_FUZZY_PHRASES)) {
    clauses.push(sql`${phrase} <% ${NAME_FIELD}`);
  }

  return sql`(${sql.join(clauses, sql` or `)})`;
}

/**
 * 0–1 text relevance. The tiers are ordered by how strongly a match implies the user meant
 * this row: its name is exactly the query, its name starts with it, its name contains it,
 * the row mentions it, the row mentions every word, or it is merely a fuzzy match.
 */
function relevanceExpression(searchText: AnyPgColumn, query: ExpandedQuery): SQL<number> {
  const contains = containsPatterns(query.phrases);
  const allWords =
    query.words.length > 1
      ? sql.join(
          query.words.map((word) => sql`lower(${searchText}) like ${`% ${word} %`}`),
          sql` and `,
        )
      : sql`false`;

  const fuzzy = sql`coalesce((
    select max(word_similarity(phrase, ${NAME_FIELD}))
    from unnest(${textArray(query.phrases.slice(0, MAX_FUZZY_PHRASES))}) as phrase
  ), 0)`;

  return sql<number>`case
    when ${NAME_FIELD} = any(${textArray(query.phrases)}) then 1
    when ${NAME_FIELD} like any(${textArray(prefixPatterns(query.phrases))}) then 0.92
    when ${NAME_FIELD} like any(${textArray(contains)}) then 0.85
    when lower(${searchText}) like any(${textArray(contains)}) then 0.7
    when ${allWords} then 0.6
    else 0.55 * ${fuzzy}
  end`;
}

function cityCondition(column: AnyPgColumn, city: string | undefined): SQL | undefined {
  return city ? cityMatches(column, city) : undefined;
}

function whereFor(kind: SearchKind, query: ExpandedQuery, city: string | undefined, now: Date) {
  const config = KIND_CONFIG[kind];
  return and(
    cityCondition(config.city, city),
    config.baseCondition(now),
    matchCondition(config.searchText, query),
  );
}

/** One round trip for the exact number of matches in every kind, so the filter tabs can't lie. */
async function countByKind(
  query: ExpandedQuery,
  city: string | undefined,
  now: Date,
): Promise<Record<SearchKind, number>> {
  const selects = SEARCH_KINDS.map(
    (kind) =>
      sql`select ${kind}::text as kind, count(*)::int as count from ${KIND_CONFIG[kind].table} where ${whereFor(kind, query, city, now)}`,
  );

  const rows = await db.execute<{ kind: SearchKind; count: number }>(
    sql.join(selects, sql` union all `),
  );

  const counts = Object.fromEntries(SEARCH_KINDS.map((kind) => [kind, 0])) as Record<
    SearchKind,
    number
  >;
  for (const row of rows.rows) {
    counts[row.kind] = Number(row.count);
  }
  return counts;
}

type Origin = { lat: number; lng: number } | null;

function distanceFor(
  latColumn: AnyPgColumn,
  lngColumn: AnyPgColumn,
  origin: Origin,
): SQL<number | null> {
  return origin
    ? (distanceKmExpression(latColumn, lngColumn, origin) as SQL<number | null>)
    : sql<number | null>`null::double precision`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function searchPlaces(query: ExpandedQuery, city: string | undefined, origin: Origin, now: Date) {
  const relevance = relevanceExpression(placesTable.searchText, query);
  const rows = await db
    .select({
      id: placesTable.id,
      title: placesTable.name,
      subtitle: placesTable.address,
      description: placesTable.description,
      category: placesTable.category,
      imageUrl: placesTable.imageUrl,
      address: placesTable.address,
      city: placesTable.city,
      lat: placesTable.lat,
      lng: placesTable.lng,
      rating: placesTable.rating,
      reviewCount: placesTable.reviewCount,
      tags: placesTable.tags,
      openingHours: placesTable.openingHours,
      openingHoursJson: placesTable.openingHoursJson,
      relevance,
      distanceKm: distanceFor(placesTable.lat, placesTable.lng, origin),
    })
    .from(placesTable)
    .where(whereFor("place", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => {
    const isOpen = resolveIsOpen(row, now);
    const distanceKm = toNumber(row.distanceKm);
    return {
      kind: "place",
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      category: row.category,
      imageUrl: row.imageUrl,
      address: row.address,
      city: row.city,
      lat: row.lat,
      lng: row.lng,
      rating: row.rating ?? null,
      reviewCount: row.reviewCount ?? null,
      price: null,
      currency: null,
      badge: null,
      startDate: null,
      isOpen,
      distanceKm,
      tags: row.tags ?? [],
      score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: row.rating, distanceKm, isOpen }),
    };
  });
}

async function searchEvents(query: ExpandedQuery, city: string | undefined, origin: Origin, now: Date) {
  const relevance = relevanceExpression(eventsTable.searchText, query);
  const rows = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      subtitle: eventsTable.venue,
      description: eventsTable.description,
      category: eventsTable.category,
      imageUrl: eventsTable.imageUrl,
      address: eventsTable.address,
      city: eventsTable.city,
      lat: eventsTable.lat,
      lng: eventsTable.lng,
      price: eventsTable.price,
      isFree: eventsTable.isFree,
      startDate: eventsTable.startDate,
      tags: eventsTable.tags,
      relevance,
      distanceKm: distanceFor(eventsTable.lat, eventsTable.lng, origin),
    })
    .from(eventsTable)
    .where(whereFor("event", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => {
    const distanceKm = toNumber(row.distanceKm);
    return {
      kind: "event",
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      category: row.category,
      imageUrl: row.imageUrl,
      address: row.address,
      city: row.city,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      rating: null,
      reviewCount: null,
      price: row.isFree ? 0 : (row.price ?? null),
      currency: "INR",
      badge: row.isFree ? "Free" : null,
      startDate: row.startDate.toISOString(),
      isOpen: null,
      distanceKm,
      tags: row.tags ?? [],
      score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: null, distanceKm, isOpen: null }),
    };
  });
}

async function searchDeals(query: ExpandedQuery, city: string | undefined, origin: Origin, now: Date) {
  const relevance = relevanceExpression(dealsTable.searchText, query);
  const rows = await db
    .select({
      id: dealsTable.id,
      title: dealsTable.title,
      subtitle: dealsTable.placeName,
      description: dealsTable.description,
      category: dealsTable.category,
      imageUrl: dealsTable.imageUrl,
      city: dealsTable.city,
      lat: dealsTable.lat,
      lng: dealsTable.lng,
      dealPrice: dealsTable.dealPrice,
      discountText: dealsTable.discountText,
      relevance,
      distanceKm: distanceFor(dealsTable.lat, dealsTable.lng, origin),
    })
    .from(dealsTable)
    .where(whereFor("deal", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => {
    const distanceKm = toNumber(row.distanceKm);
    return {
      kind: "deal",
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      category: row.category,
      imageUrl: row.imageUrl,
      address: null,
      city: row.city,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      rating: null,
      reviewCount: null,
      price: row.dealPrice ?? null,
      currency: "INR",
      badge: row.discountText,
      startDate: null,
      isOpen: null,
      distanceKm,
      tags: [],
      score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: null, distanceKm, isOpen: null }),
    };
  });
}

async function searchHotels(query: ExpandedQuery, city: string | undefined, origin: Origin, now: Date) {
  const relevance = relevanceExpression(hotelsTable.searchText, query);
  const rows = await db
    .select({
      id: hotelsTable.id,
      title: hotelsTable.name,
      subtitle: hotelsTable.address,
      description: hotelsTable.description,
      category: hotelsTable.category,
      imageUrl: hotelsTable.imageUrl,
      address: hotelsTable.address,
      city: hotelsTable.city,
      lat: hotelsTable.lat,
      lng: hotelsTable.lng,
      rating: hotelsTable.rating,
      reviewCount: hotelsTable.reviewCount,
      pricePerNight: hotelsTable.pricePerNight,
      currency: hotelsTable.currency,
      tags: hotelsTable.tags,
      relevance,
      distanceKm: distanceFor(hotelsTable.lat, hotelsTable.lng, origin),
    })
    .from(hotelsTable)
    .where(whereFor("hotel", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => {
    const distanceKm = toNumber(row.distanceKm);
    return {
      kind: "hotel",
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      category: row.category,
      imageUrl: row.imageUrl,
      address: row.address,
      city: row.city,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      rating: row.rating ?? null,
      reviewCount: row.reviewCount ?? null,
      price: row.pricePerNight ?? null,
      currency: row.currency,
      badge: null,
      startDate: null,
      isOpen: null,
      distanceKm,
      tags: row.tags ?? [],
      score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: row.rating, distanceKm, isOpen: null }),
    };
  });
}

async function searchActivities(query: ExpandedQuery, city: string | undefined, origin: Origin, now: Date) {
  const relevance = relevanceExpression(activitiesTable.searchText, query);
  const rows = await db
    .select({
      id: activitiesTable.id,
      title: activitiesTable.name,
      subtitle: activitiesTable.address,
      description: activitiesTable.description,
      category: activitiesTable.category,
      imageUrl: activitiesTable.imageUrl,
      address: activitiesTable.address,
      city: activitiesTable.city,
      lat: activitiesTable.lat,
      lng: activitiesTable.lng,
      rating: activitiesTable.rating,
      reviewCount: activitiesTable.reviewCount,
      price: activitiesTable.price,
      currency: activitiesTable.currency,
      tags: activitiesTable.tags,
      openingHours: activitiesTable.openingHours,
      openingHoursJson: activitiesTable.openingHoursJson,
      relevance,
      distanceKm: distanceFor(activitiesTable.lat, activitiesTable.lng, origin),
    })
    .from(activitiesTable)
    .where(whereFor("activity", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => {
    const isOpen = resolveIsOpen(row, now);
    const distanceKm = toNumber(row.distanceKm);
    return {
      kind: "activity",
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      category: row.category,
      imageUrl: row.imageUrl,
      address: row.address,
      city: row.city,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      rating: row.rating ?? null,
      reviewCount: row.reviewCount ?? null,
      price: row.price ?? null,
      currency: row.currency,
      badge: null,
      startDate: null,
      isOpen,
      distanceKm,
      tags: row.tags ?? [],
      score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: row.rating, distanceKm, isOpen }),
    };
  });
}

async function searchMovies(query: ExpandedQuery, city: string | undefined, now: Date) {
  const relevance = relevanceExpression(moviesTable.searchText, query);
  const rows = await db
    .select({
      id: moviesTable.id,
      title: moviesTable.title,
      genre: moviesTable.genre,
      language: moviesTable.language,
      synopsis: moviesTable.synopsis,
      posterUrl: moviesTable.posterUrl,
      city: moviesTable.city,
      rating: moviesTable.rating,
      reviewCount: moviesTable.reviewCount,
      price: moviesTable.price,
      venue: moviesTable.venue,
      status: moviesTable.status,
      tags: moviesTable.tags,
      relevance,
    })
    .from(moviesTable)
    .where(whereFor("movie", query, city, now))
    .orderBy(desc(relevance))
    .limit(KIND_FETCH_LIMIT);

  return rows.map((row): SearchResult => ({
    kind: "movie",
    id: row.id,
    title: row.title,
    subtitle: [row.genre, row.language].filter(Boolean).join(" · ") || null,
    description: row.synopsis,
    category: row.genre,
    imageUrl: row.posterUrl,
    address: row.venue,
    city: row.city,
    lat: null,
    lng: null,
    rating: row.rating ?? null,
    reviewCount: row.reviewCount ?? null,
    price: row.price ?? null,
    currency: "INR",
    badge: row.status === "coming_soon" ? "Coming soon" : null,
    startDate: null,
    isOpen: null,
    distanceKm: null,
    tags: row.tags ?? [],
    score: scoreResult({ relevance: toNumber(row.relevance) ?? 0, rating: row.rating, distanceKm: null, isOpen: null }),
  }));
}

/**
 * Names close enough to the query to be worth offering when nothing matched. Only runs on a
 * zero-result search, where a full scan of short names costs less than showing a dead end.
 */
async function suggestionsFor(query: ExpandedQuery, city: string | undefined): Promise<string[]> {
  if (!query.normalized) return [];

  const kinds: SearchKind[] = ["place", "event", "activity", "hotel", "movie"];
  const selects = kinds.map((kind) => {
    const config = KIND_CONFIG[kind];
    return sql`(
      select ${NAME_FIELD} as name, similarity(${NAME_FIELD}, ${query.normalized}) as score
      from ${config.table}
      where ${and(cityCondition(config.city, city), sql`${NAME_FIELD} % ${query.normalized}`)}
      order by score desc
      limit ${MAX_SUGGESTIONS}
    )`;
  });

  const rows = await db.execute<{ name: string; score: number }>(
    sql`select name, score from (${sql.join(selects, sql` union all `)}) as candidates order by score desc limit ${MAX_SUGGESTIONS}`,
  );

  return rows.rows.map((row) => row.name).filter((name): name is string => Boolean(name));
}

router.get("/search", async (req, res) => {
  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const city = typeof req.query.city === "string" && req.query.city ? req.query.city : undefined;
    const kindParam = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const kind = SEARCH_KINDS.includes(kindParam as SearchKind) ? (kindParam as SearchKind) : undefined;
    const limit = Math.min(
      Math.max(req.query.limit ? parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT : DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = Math.max(req.query.offset ? parseInt(String(req.query.offset), 10) || 0 : 0, 0);
    const parsedOrigin = parseOrigin(req.query as Record<string, unknown>);
    const origin: Origin = parsedOrigin ? { lat: parsedOrigin.lat, lng: parsedOrigin.lng } : null;

    const expanded = expandSearchQuery(rawQuery, city?.toLowerCase() ?? "mumbai");

    // A blank query is not an error: the app asks for it while the field is empty.
    if (!expanded.normalized) {
      res.json({
        query: rawQuery,
        normalizedQuery: "",
        total: 0,
        counts: Object.fromEntries(SEARCH_KINDS.map((k) => [k, 0])),
        results: [],
        suggestions: [],
      });
      return;
    }

    const now = new Date();
    const wanted = kind ? [kind] : SEARCH_KINDS;

    const [counts, groups] = await Promise.all([
      countByKind(expanded, city, now),
      Promise.all(
        wanted.map((k): Promise<SearchResult[]> => {
          switch (k) {
            case "place": return searchPlaces(expanded, city, origin, now);
            case "event": return searchEvents(expanded, city, origin, now);
            case "deal": return searchDeals(expanded, city, origin, now);
            case "hotel": return searchHotels(expanded, city, origin, now);
            case "activity": return searchActivities(expanded, city, origin, now);
            case "movie": return searchMovies(expanded, city, now);
          }
        }),
      ),
    ]);

    const merged = groups
      .flat()
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    const total = kind ? counts[kind] : SEARCH_KINDS.reduce((sum, k) => sum + counts[k], 0);
    const results = merged.slice(offset, offset + limit);

    res.json({
      query: rawQuery,
      normalizedQuery: expanded.normalized,
      total,
      counts,
      results,
      suggestions: merged.length === 0 ? await suggestionsFor(expanded, city) : [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to run search");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
