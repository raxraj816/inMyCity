import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { placesTable } from "./places";

export const collectionsTable = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const collectionPlacesTable = pgTable("collection_places", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collectionsTable.id, { onDelete: "cascade" }),
  placeId: integer("place_id").notNull().references(() => placesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.collectionId, t.placeId)]);

export const insertCollectionSchema = createInsertSchema(collectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collectionsTable.$inferSelect;
export type CollectionPlace = typeof collectionPlacesTable.$inferSelect;
