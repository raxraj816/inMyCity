import { pgTable, text, serial, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * The City Guide header: one row per city, editable without a deploy.
 *
 * Currency deliberately has no column. It is resolved from `currencyFor` in
 * `@workspace/city-config`, which is the only place allowed to decide what a price is
 * denominated in.
 */
export const cityGuidesTable = pgTable(
  "city_guides",
  {
    id: serial("id").primaryKey(),
    city: text("city").notNull(),
    tagline: text("tagline").notNull(),
    knownFor: text("known_for"),
    tripLength: text("trip_length"),
    timezoneLabel: text("timezone_label"),
    status: text("status").notNull().default("published"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("city_guides_city_idx").on(table.city)],
);

/**
 * The labelled facts shown under the City Guide header.
 *
 * `group` is `essential` for the practical strip a visitor needs first — best season, getting
 * around, emergency number, language, tipping — and `extra` for the secondary strip.
 */
export const CITY_FACT_GROUPS = ["essential", "extra"] as const;

export const cityFactsTable = pgTable(
  "city_facts",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    city: text("city").notNull(),
    group: text("group").notNull().default("essential"),
    label: text("label").notNull(),
    value: text("value").notNull(),
    icon: text("icon").notNull().default("info"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("published"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("city_facts_external_id_idx").on(table.externalId),
    index("city_facts_city_group_idx").on(table.city, table.group, table.sortOrder),
  ],
);

export const insiderTipsTable = pgTable(
  "insider_tips",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    city: text("city").notNull(),
    /** Launch zone id when the tip is about one neighbourhood, null when it is city-wide. */
    neighborhoodId: text("neighborhood_id"),
    label: text("label").notNull(),
    tip: text("tip").notNull(),
    icon: text("icon").notNull().default("map-pin"),
    color: text("color").notNull().default("#b45309"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("published"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("insider_tips_external_id_idx").on(table.externalId),
    index("insider_tips_city_status_idx").on(table.city, table.status, table.sortOrder),
    index("insider_tips_neighborhood_idx").on(table.neighborhoodId),
  ],
);

export const insertCityGuideSchema = createInsertSchema(cityGuidesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCityFactSchema = createInsertSchema(cityFactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInsiderTipSchema = createInsertSchema(insiderTipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCityGuide = z.infer<typeof insertCityGuideSchema>;
export type InsertCityFact = z.infer<typeof insertCityFactSchema>;
export type InsertInsiderTip = z.infer<typeof insertInsiderTipSchema>;
export type CityGuide = typeof cityGuidesTable.$inferSelect;
export type CityFact = typeof cityFactsTable.$inferSelect;
export type InsiderTip = typeof insiderTipsTable.$inferSelect;
