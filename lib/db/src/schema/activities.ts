import { pgTable, text, serial, timestamp, real, integer, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable(
  "activities",
  {
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
    /** Structured weekly hours; see the matching field on `places`. */
    openingHoursJson: jsonb("opening_hours_json").$type<{ start: number; end: number }[][]>(),
    bookingUrl: text("booking_url"),
    phone: text("phone"),
    tags: text("tags").array().notNull().default([]),
    /** Flattened searchable text; see the matching field on `places`. */
    searchText: text("search_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("activities_city_idx").on(table.city),
    index("activities_category_idx").on(table.category),
    index("activities_city_category_idx").on(table.city, table.category),
  ],
);

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
