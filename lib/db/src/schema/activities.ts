import { pgTable, text, serial, timestamp, real, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // adventure | cultural | wellness | sports | workshop | tour
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  price: real("price"),
  currency: text("currency").notNull().default("INR"),
  imageUrl: text("image_url"),
  images: text("images").array().notNull().default([]),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  openingHours: text("opening_hours"),
  bookingUrl: text("booking_url"),
  phone: text("phone"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
