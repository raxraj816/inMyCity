import { pgTable, text, serial, timestamp, real, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hotelsTable = pgTable("hotels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // budget | mid-range | luxury | boutique
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  pricePerNight: real("price_per_night"),
  currency: text("currency").notNull().default("INR"),
  imageUrl: text("image_url"),
  images: text("images").array().notNull().default([]),
  amenities: text("amenities").array().notNull().default([]),
  phone: text("phone"),
  website: text("website"),
  checkIn: text("check_in").default("12:00"),
  checkOut: text("check_out").default("11:00"),
  description: text("description"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHotelSchema = createInsertSchema(hotelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotelsTable.$inferSelect;
