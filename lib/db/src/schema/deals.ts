import { pgTable, text, serial, timestamp, doublePrecision, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { placesTable } from "./places";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  placeId: integer("place_id").references(() => placesTable.id),
  placeName: text("place_name").notNull(),
  category: text("category").notNull(),
  discountPercent: integer("discount_percent"),
  discountText: text("discount_text").notNull(),
  originalPrice: real("original_price"),
  dealPrice: real("deal_price"),
  code: text("code"),
  qrData: text("qr_data"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
