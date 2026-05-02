import { pgTable, text, serial, timestamp, doublePrecision, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
