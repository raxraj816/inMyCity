import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { placesTable } from "./places";

export const itinerariesTable = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  durationDays: integer("duration_days").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  tips: text("tips").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const itineraryStopsTable = pgTable("itinerary_stops", {
  id: serial("id").primaryKey(),
  itineraryId: integer("itinerary_id").notNull().references(() => itinerariesTable.id, { onDelete: "cascade" }),
  placeId: integer("place_id").notNull().references(() => placesTable.id),
  day: integer("day").notNull(),
  order: integer("order").notNull(),
  tip: text("tip"),
  bestTimeToVisit: text("best_time_to_visit"),
  estimatedCost: text("estimated_cost"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItinerarySchema = createInsertSchema(itinerariesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itinerariesTable.$inferSelect;
export type ItineraryStop = typeof itineraryStopsTable.$inferSelect;
