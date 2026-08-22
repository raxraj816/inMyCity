import { pgTable, text, serial, timestamp, doublePrecision, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const placesTable = pgTable("places", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlaceSchema = createInsertSchema(placesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Place = typeof placesTable.$inferSelect;
