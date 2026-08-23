import { pgTable, text, serial, timestamp, real, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moviesTable = pgTable(
  "movies",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    genre: text("genre").notNull(),
    language: text("language").notNull().default("English"),
    durationMinutes: integer("duration_minutes"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    posterUrl: text("poster_url"),
    synopsis: text("synopsis"),
    director: text("director"),
    cast: text("cast").array().notNull().default([]),
    releaseDate: text("release_date"),
    city: text("city").notNull(),
    status: text("status").notNull().default("now_showing"), // now_showing | coming_soon
    venue: text("venue"),
    price: real("price"),
    bookingUrl: text("booking_url"),
    tags: text("tags").array().notNull().default([]),
    /** Flattened searchable text; see the matching field on `places`. */
    searchText: text("search_text"),
    /** Stable key from the content source. Idempotent seeding and admin imports match on it. */
    externalId: text("external_id"),
    /** When someone last confirmed this row's hours, phone, address and price against reality. */
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("movies_city_idx").on(table.city),
    index("movies_genre_idx").on(table.genre),
    index("movies_city_status_idx").on(table.city, table.status),
    uniqueIndex("movies_external_id_idx").on(table.externalId),
    index("movies_last_verified_idx").on(table.lastVerifiedAt),
  ],
);

export const insertMovieSchema = createInsertSchema(moviesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof moviesTable.$inferSelect;
