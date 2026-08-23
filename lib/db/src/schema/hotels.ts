import { pgTable, text, serial, timestamp, real, integer, doublePrecision, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hotelsTable = pgTable(
  "hotels",
  {
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
    index("hotels_city_idx").on(table.city),
    index("hotels_category_idx").on(table.category),
    index("hotels_city_category_idx").on(table.city, table.category),
    uniqueIndex("hotels_external_id_idx").on(table.externalId),
    index("hotels_last_verified_idx").on(table.lastVerifiedAt),
  ],
);

export const insertHotelSchema = createInsertSchema(hotelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotelsTable.$inferSelect;
