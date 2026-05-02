import { pgTable, text, serial, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transitLinesTable = pgTable("transit_lines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  type: text("type").notNull(), // metro | bus | tram | ferry | suburban_rail
  city: text("city").notNull(),
  color: text("color").notNull().default("#6366f1"),
  from: text("from").notNull(),
  to: text("to").notNull(),
  stops: text("stops").array().notNull().default([]),
  frequency: text("frequency"),
  firstTrain: text("first_train"),
  lastTrain: text("last_train"),
  fare: real("fare"),
  currency: text("currency").notNull().default("INR"),
  operatedBy: text("operated_by"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transitRoutesTable = pgTable("transit_routes", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id").notNull(),
  lineName: text("line_name").notNull(),
  lineType: text("line_type").notNull(),
  lineColor: text("line_color").notNull().default("#6366f1"),
  city: text("city").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  stops: text("stops").array().notNull().default([]),
  durationMinutes: integer("duration_minutes"),
  fare: real("fare"),
  currency: text("currency").notNull().default("INR"),
  transfers: integer("transfers").notNull().default(0),
  transferDetails: text("transfer_details").array().notNull().default([]),
  tips: text("tips"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransitLineSchema = createInsertSchema(transitLinesTable).omit({ id: true, createdAt: true });
export const insertTransitRouteSchema = createInsertSchema(transitRoutesTable).omit({ id: true, createdAt: true });
export type InsertTransitLine = z.infer<typeof insertTransitLineSchema>;
export type InsertTransitRoute = z.infer<typeof insertTransitRouteSchema>;
export type TransitLine = typeof transitLinesTable.$inferSelect;
export type TransitRoute = typeof transitRoutesTable.$inferSelect;
