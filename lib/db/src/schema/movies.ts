import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moviesTable = pgTable("movies", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMovieSchema = createInsertSchema(moviesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof moviesTable.$inferSelect;
