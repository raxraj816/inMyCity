import { pgTable, serial, timestamp, integer, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { placesTable } from "./places";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  placeId: integer("place_id").notNull().references(() => placesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.placeId)]);

export const insertFavoriteSchema = createInsertSchema(favoritesTable).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favoritesTable.$inferSelect;
