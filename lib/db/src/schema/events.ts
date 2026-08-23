import { pgTable, text, serial, timestamp, doublePrecision, real, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    venue: text("venue").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    price: real("price"),
    isFree: boolean("is_free").notNull().default(false),
    imageUrl: text("image_url"),
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
    index("events_city_idx").on(table.city),
    index("events_category_idx").on(table.category),
    index("events_city_category_idx").on(table.city, table.category),
    index("events_city_start_date_idx").on(table.city, table.startDate),
    uniqueIndex("events_external_id_idx").on(table.externalId),
    index("events_last_verified_idx").on(table.lastVerifiedAt),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
