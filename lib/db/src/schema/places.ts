import { pgTable, text, serial, timestamp, doublePrecision, integer, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const placesTable = pgTable(
  "places",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    phone: text("phone"),
    website: text("website"),
    openingHours: text("opening_hours"),
    /**
     * Structured weekly hours, derived from `openingHours`. Seven entries, index 0 = Sunday;
     * each holds minute-of-day intervals whose `end` may exceed 1440 when the venue trades
     * past midnight. Authoritative when present — `openingHours` remains the display string.
     */
    openingHoursJson: jsonb("opening_hours_json").$type<{ start: number; end: number }[][]>(),
    imageUrl: text("image_url"),
    images: text("images").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    /**
     * Everything this row can be found by, flattened into one lowercase blob: name, category,
     * address, tags, description, plus the curated Mumbai synonyms and transliterations from
     * `buildSearchText`. Written at seed time and matched with a trigram index, so search is a
     * single indexed predicate instead of six list downloads filtered in the client.
     */
    searchText: text("search_text"),
    /** Stable key from the content source. Idempotent seeding and admin imports match on it. */
    externalId: text("external_id"),
    /** When someone last confirmed this row's hours, phone, address and price against reality. */
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("places_city_idx").on(table.city),
    index("places_category_idx").on(table.category),
    index("places_city_category_idx").on(table.city, table.category),
    index("places_lat_lng_idx").on(table.lat, table.lng),
    uniqueIndex("places_external_id_idx").on(table.externalId),
    index("places_last_verified_idx").on(table.lastVerifiedAt),
  ],
);

export const insertPlaceSchema = createInsertSchema(placesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Place = typeof placesTable.$inferSelect;
