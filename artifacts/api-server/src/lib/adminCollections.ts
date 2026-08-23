import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  activitiesTable,
  collectionPlacesTable,
  favoritesTable,
  itineraryStopsTable,
  cityFactsTable,
  cityGuidesTable,
  dealsTable,
  eventsTable,
  hotelsTable,
  insiderTipsTable,
  moviesTable,
  newsItemsTable,
  newsSourcesTable,
  placesTable,
  pulsePostsTable,
  qaAnswersTable,
  qaQuestionsTable,
} from "@workspace/db";

import type { SearchableKind } from "./search/searchFields";

/**
 * The content tables the admin surface can edit, and what may be written to each.
 *
 * Driving CRUD from a declaration rather than fifteen near-identical routers is what keeps the
 * admin API honest: a column that is not listed here cannot be written through the API at all,
 * so `id`, `created_at`, the derived `search_text`, and the moderation trail are structurally
 * out of reach of a bad request rather than defended by a check somebody has to remember.
 */

export type FieldType = "string" | "text" | "int" | "float" | "boolean" | "stringArray" | "date";

export type CollectionSpec = {
  label: string;
  table: PgTable;
  idColumn: AnyPgColumn;
  fields: Record<string, FieldType>;
  required: string[];
  /** Free-text search across the admin list. */
  searchColumns: AnyPgColumn[];
  cityColumn?: AnyPgColumn;
  statusColumn?: AnyPgColumn;
  externalIdColumn?: AnyPgColumn;
  lastVerifiedColumn?: AnyPgColumn;
  orderColumn: AnyPgColumn;
  /** Set when edits must rewrite `search_text`. */
  searchKind?: SearchableKind;
  /** Set when edits must re-derive `opening_hours_json` from the display string. */
  hasOpeningHours?: boolean;
  deletable: boolean;
  /**
   * Rows elsewhere that point at this one. A delete is refused while any of them exist, which
   * is what stops a closed venue from taking someone's saved list — or an itinerary — with it.
   *
   * It is declared per collection rather than checked generically because the foreign keys are
   * all named `place_id`: running the same check for an event would compare an event's id
   * against a place's, and refuse or allow the delete for entirely the wrong reason.
   */
  blockingReferences?: { table: PgTable; column: AnyPgColumn; label: string }[];
};

/** Everything that points at `places.id`. */
const PLACE_REFERENCES = [
  { table: favoritesTable, column: favoritesTable.placeId, label: "a saved list" },
  { table: collectionPlacesTable, column: collectionPlacesTable.placeId, label: "a collection" },
  { table: itineraryStopsTable, column: itineraryStopsTable.placeId, label: "an itinerary" },
  { table: dealsTable, column: dealsTable.placeId, label: "a deal" },
];

const CATALOGUE_COMMON = {
  externalId: "string",
  lastVerifiedAt: "date",
} as const;

export const ADMIN_COLLECTIONS = {
  places: {
    label: "Places",
    table: placesTable,
    idColumn: placesTable.id,
    fields: {
      name: "string",
      category: "string",
      description: "text",
      address: "string",
      city: "string",
      lat: "float",
      lng: "float",
      rating: "float",
      reviewCount: "int",
      phone: "string",
      website: "string",
      openingHours: "string",
      imageUrl: "string",
      images: "stringArray",
      tags: "stringArray",
      ...CATALOGUE_COMMON,
    },
    required: ["name", "category", "address", "city", "lat", "lng"],
    searchColumns: [placesTable.name, placesTable.address],
    cityColumn: placesTable.city,
    externalIdColumn: placesTable.externalId,
    lastVerifiedColumn: placesTable.lastVerifiedAt,
    orderColumn: placesTable.updatedAt,
    searchKind: "places",
    hasOpeningHours: true,
    deletable: true,
    blockingReferences: PLACE_REFERENCES,
  },
  events: {
    label: "Events",
    table: eventsTable,
    idColumn: eventsTable.id,
    fields: {
      title: "string",
      description: "text",
      category: "string",
      venue: "string",
      address: "string",
      city: "string",
      lat: "float",
      lng: "float",
      startDate: "date",
      endDate: "date",
      price: "float",
      isFree: "boolean",
      imageUrl: "string",
      bookingUrl: "string",
      tags: "stringArray",
      ...CATALOGUE_COMMON,
    },
    required: ["title", "category", "venue", "address", "city", "startDate"],
    searchColumns: [eventsTable.title, eventsTable.venue],
    cityColumn: eventsTable.city,
    externalIdColumn: eventsTable.externalId,
    lastVerifiedColumn: eventsTable.lastVerifiedAt,
    orderColumn: eventsTable.startDate,
    searchKind: "events",
    deletable: true,
  },
  deals: {
    label: "Deals",
    table: dealsTable,
    idColumn: dealsTable.id,
    fields: {
      title: "string",
      description: "text",
      placeId: "int",
      placeName: "string",
      category: "string",
      discountPercent: "int",
      discountText: "string",
      originalPrice: "float",
      dealPrice: "float",
      code: "string",
      expiresAt: "date",
      imageUrl: "string",
      lat: "float",
      lng: "float",
      city: "string",
      ...CATALOGUE_COMMON,
    },
    required: ["title", "placeName", "category", "discountText"],
    searchColumns: [dealsTable.title, dealsTable.placeName],
    cityColumn: dealsTable.city,
    externalIdColumn: dealsTable.externalId,
    lastVerifiedColumn: dealsTable.lastVerifiedAt,
    orderColumn: dealsTable.updatedAt,
    searchKind: "deals",
    deletable: true,
  },
  movies: {
    label: "Movies",
    table: moviesTable,
    idColumn: moviesTable.id,
    fields: {
      title: "string",
      genre: "string",
      language: "string",
      durationMinutes: "int",
      rating: "float",
      reviewCount: "int",
      posterUrl: "string",
      synopsis: "text",
      director: "string",
      cast: "stringArray",
      releaseDate: "string",
      city: "string",
      // The release status — `now_showing` or `coming_soon` — not a moderation state. Movies
      // carry no `statusColumn`, so nothing here can publish or take anything down.
      status: "string",
      venue: "string",
      price: "float",
      tags: "stringArray",
      ...CATALOGUE_COMMON,
    },
    required: ["title", "genre", "city"],
    searchColumns: [moviesTable.title, moviesTable.director],
    cityColumn: moviesTable.city,
    externalIdColumn: moviesTable.externalId,
    lastVerifiedColumn: moviesTable.lastVerifiedAt,
    orderColumn: moviesTable.updatedAt,
    searchKind: "movies",
    deletable: true,
  },
  hotels: {
    label: "Hotels",
    table: hotelsTable,
    idColumn: hotelsTable.id,
    fields: {
      name: "string",
      category: "string",
      address: "string",
      city: "string",
      lat: "float",
      lng: "float",
      rating: "float",
      reviewCount: "int",
      pricePerNight: "float",
      currency: "string",
      imageUrl: "string",
      images: "stringArray",
      amenities: "stringArray",
      phone: "string",
      website: "string",
      checkIn: "string",
      checkOut: "string",
      description: "text",
      tags: "stringArray",
      ...CATALOGUE_COMMON,
    },
    required: ["name", "category", "address", "city"],
    searchColumns: [hotelsTable.name, hotelsTable.address],
    cityColumn: hotelsTable.city,
    externalIdColumn: hotelsTable.externalId,
    lastVerifiedColumn: hotelsTable.lastVerifiedAt,
    orderColumn: hotelsTable.updatedAt,
    searchKind: "hotels",
    deletable: true,
  },
  activities: {
    label: "Activities",
    table: activitiesTable,
    idColumn: activitiesTable.id,
    fields: {
      name: "string",
      category: "string",
      address: "string",
      city: "string",
      lat: "float",
      lng: "float",
      description: "text",
      durationMinutes: "int",
      price: "float",
      currency: "string",
      imageUrl: "string",
      images: "stringArray",
      rating: "float",
      reviewCount: "int",
      openingHours: "string",
      phone: "string",
      tags: "stringArray",
      ...CATALOGUE_COMMON,
    },
    required: ["name", "category", "address", "city"],
    searchColumns: [activitiesTable.name, activitiesTable.address],
    cityColumn: activitiesTable.city,
    externalIdColumn: activitiesTable.externalId,
    lastVerifiedColumn: activitiesTable.lastVerifiedAt,
    orderColumn: activitiesTable.updatedAt,
    searchKind: "activities",
    hasOpeningHours: true,
    deletable: true,
  },
  pulse_posts: {
    label: "Pulse posts",
    table: pulsePostsTable,
    idColumn: pulsePostsTable.id,
    fields: {
      city: "string",
      tier: "string",
      authorName: "string",
      authorHandle: "string",
      location: "string",
      neighborhoodId: "string",
      caption: "text",
      mediaType: "string",
      mediaUrl: "string",
      videoDurationSeconds: "int",
      filterTags: "stringArray",
      source: "string",
      sourceUrl: "string",
      trustLabel: "string",
      confidence: "string",
      isSponsored: "boolean",
      isFeatured: "boolean",
      externalId: "string",
      lastVerifiedAt: "date",
    },
    required: ["city", "tier", "authorName", "authorHandle", "caption", "externalId"],
    searchColumns: [pulsePostsTable.caption, pulsePostsTable.authorName],
    cityColumn: pulsePostsTable.city,
    statusColumn: pulsePostsTable.status,
    externalIdColumn: pulsePostsTable.externalId,
    lastVerifiedColumn: pulsePostsTable.lastVerifiedAt,
    orderColumn: pulsePostsTable.updatedAt,
    deletable: true,
  },
  news_items: {
    label: "News items",
    table: newsItemsTable,
    idColumn: newsItemsTable.id,
    fields: {
      city: "string",
      category: "string",
      headline: "string",
      summary: "text",
      imageUrl: "string",
      link: "string",
      sourceName: "string",
      sourceKind: "string",
      trustLabel: "string",
      confidence: "string",
      publishedAt: "date",
      externalId: "string",
    },
    required: ["city", "category", "headline", "sourceName", "sourceKind", "externalId"],
    searchColumns: [newsItemsTable.headline, newsItemsTable.sourceName],
    cityColumn: newsItemsTable.city,
    statusColumn: newsItemsTable.status,
    externalIdColumn: newsItemsTable.externalId,
    orderColumn: newsItemsTable.updatedAt,
    deletable: true,
  },
  news_sources: {
    label: "News sources",
    table: newsSourcesTable,
    idColumn: newsSourcesTable.id,
    fields: {
      slug: "string",
      name: "string",
      kind: "string",
      city: "string",
      homepageUrl: "string",
      feedUrl: "string",
      trustLabel: "string",
      defaultConfidence: "string",
      defaultCategory: "string",
      isActive: "boolean",
    },
    required: ["slug", "name", "kind", "city"],
    searchColumns: [newsSourcesTable.name, newsSourcesTable.slug],
    cityColumn: newsSourcesTable.city,
    orderColumn: newsSourcesTable.updatedAt,
    deletable: true,
  },
  qa_questions: {
    label: "Q&A questions",
    table: qaQuestionsTable,
    idColumn: qaQuestionsTable.id,
    fields: {
      externalId: "string",
      city: "string",
      question: "string",
      body: "text",
      authorName: "string",
      neighborhoodId: "string",
      tags: "stringArray",
    },
    required: ["externalId", "city", "question", "authorName"],
    searchColumns: [qaQuestionsTable.question, qaQuestionsTable.authorName],
    cityColumn: qaQuestionsTable.city,
    statusColumn: qaQuestionsTable.status,
    externalIdColumn: qaQuestionsTable.externalId,
    orderColumn: qaQuestionsTable.updatedAt,
    deletable: true,
  },
  qa_answers: {
    label: "Q&A answers",
    table: qaAnswersTable,
    idColumn: qaAnswersTable.id,
    fields: {
      externalId: "string",
      questionId: "int",
      body: "text",
      authorName: "string",
      isAccepted: "boolean",
    },
    required: ["externalId", "questionId", "body", "authorName"],
    searchColumns: [qaAnswersTable.body, qaAnswersTable.authorName],
    statusColumn: qaAnswersTable.status,
    externalIdColumn: qaAnswersTable.externalId,
    orderColumn: qaAnswersTable.updatedAt,
    deletable: true,
  },
  city_guides: {
    label: "City guide header",
    table: cityGuidesTable,
    idColumn: cityGuidesTable.id,
    fields: {
      city: "string",
      tagline: "string",
      knownFor: "string",
      tripLength: "string",
      timezoneLabel: "string",
      lastVerifiedAt: "date",
    },
    required: ["city", "tagline"],
    searchColumns: [cityGuidesTable.city, cityGuidesTable.tagline],
    cityColumn: cityGuidesTable.city,
    statusColumn: cityGuidesTable.status,
    lastVerifiedColumn: cityGuidesTable.lastVerifiedAt,
    orderColumn: cityGuidesTable.updatedAt,
    deletable: true,
  },
  city_facts: {
    label: "City facts",
    table: cityFactsTable,
    idColumn: cityFactsTable.id,
    fields: {
      externalId: "string",
      city: "string",
      group: "string",
      label: "string",
      value: "string",
      icon: "string",
      sortOrder: "int",
      lastVerifiedAt: "date",
    },
    required: ["externalId", "city", "label", "value"],
    searchColumns: [cityFactsTable.label, cityFactsTable.value],
    cityColumn: cityFactsTable.city,
    statusColumn: cityFactsTable.status,
    externalIdColumn: cityFactsTable.externalId,
    lastVerifiedColumn: cityFactsTable.lastVerifiedAt,
    orderColumn: cityFactsTable.sortOrder,
    deletable: true,
  },
  insider_tips: {
    label: "Insider tips",
    table: insiderTipsTable,
    idColumn: insiderTipsTable.id,
    fields: {
      externalId: "string",
      city: "string",
      neighborhoodId: "string",
      label: "string",
      tip: "text",
      icon: "string",
      color: "string",
      sortOrder: "int",
      lastVerifiedAt: "date",
    },
    required: ["externalId", "city", "label", "tip"],
    searchColumns: [insiderTipsTable.label, insiderTipsTable.tip],
    cityColumn: insiderTipsTable.city,
    statusColumn: insiderTipsTable.status,
    externalIdColumn: insiderTipsTable.externalId,
    lastVerifiedColumn: insiderTipsTable.lastVerifiedAt,
    orderColumn: insiderTipsTable.sortOrder,
    deletable: true,
  },
} as const satisfies Record<string, CollectionSpec>;

export type CollectionName = keyof typeof ADMIN_COLLECTIONS;

export function isCollectionName(value: string): value is CollectionName {
  return Object.prototype.hasOwnProperty.call(ADMIN_COLLECTIONS, value);
}

export class FieldError extends Error {}

/**
 * Coerces one submitted value to the column's type, or throws with a message the admin UI can
 * show. Empty string means "clear this field", which is what a cleared text input sends.
 */
export function coerceField(field: string, type: FieldType, raw: unknown): unknown {
  if (raw === null || raw === "") return null;
  if (raw === undefined) return undefined;

  switch (type) {
    case "string":
    case "text": {
      if (typeof raw !== "string") throw new FieldError(`${field} must be a string`);
      return raw.trim();
    }
    case "int": {
      const value = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isInteger(value)) throw new FieldError(`${field} must be a whole number`);
      return value;
    }
    case "float": {
      const value = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(value)) throw new FieldError(`${field} must be a number`);
      return value;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      throw new FieldError(`${field} must be true or false`);
    }
    case "stringArray": {
      if (!Array.isArray(raw)) throw new FieldError(`${field} must be an array of strings`);
      const values = raw.map((entry) => {
        if (typeof entry !== "string") throw new FieldError(`${field} must contain only strings`);
        return entry.trim();
      });
      return values.filter(Boolean);
    }
    case "date": {
      const value = new Date(String(raw));
      if (Number.isNaN(value.getTime())) throw new FieldError(`${field} must be a valid date`);
      return value;
    }
  }
}

/** Validates and coerces a whole body against a collection, ignoring unknown keys. */
export function coerceBody(
  spec: CollectionSpec,
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const [field, type] of Object.entries(spec.fields)) {
    if (!(field in body)) continue;
    const coerced = coerceField(field, type, body[field]);
    if (coerced !== undefined) values[field] = coerced;
  }

  if (!partial) {
    for (const field of spec.required) {
      const value = values[field];
      if (value === undefined || value === null || value === "") {
        throw new FieldError(`${field} is required`);
      }
    }
  } else {
    for (const field of spec.required) {
      if (field in values && (values[field] === null || values[field] === "")) {
        throw new FieldError(`${field} cannot be cleared`);
      }
    }
  }

  if (Object.keys(values).length === 0) throw new FieldError("No editable fields were provided");
  return values;
}
