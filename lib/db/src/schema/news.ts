import { pgTable, text, serial, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const NEWS_CATEGORIES = ["local", "traffic", "weather", "civic", "sports", "business", "transit"] as const;
export const NEWS_SOURCE_KINDS = ["publisher", "government", "traffic", "weather", "sports", "business"] as const;

/**
 * The ingestion allowlist. Nothing is fetched from a host that is not a row here, so adding a
 * publisher is a data change and a reviewable one — not a code change.
 */
export const newsSourcesTable = pgTable(
  "news_sources",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    city: text("city").notNull(),
    homepageUrl: text("homepage_url"),
    feedUrl: text("feed_url"),
    /** Trust label stamped onto every item this source produces, before editorial review. */
    trustLabel: text("trust_label").notNull().default("editorial"),
    defaultConfidence: text("default_confidence").notNull().default("medium"),
    /** Default category for items whose feed gives no usable hint. */
    defaultCategory: text("default_category").notNull().default("local"),
    isActive: boolean("is_active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastFetchError: text("last_fetch_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("news_sources_slug_idx").on(table.slug),
    index("news_sources_city_active_idx").on(table.city, table.isActive),
  ],
);

export const newsItemsTable = pgTable(
  "news_items",
  {
    id: serial("id").primaryKey(),
    /** Feed guid, or a hash of the link. Re-running ingestion updates rather than duplicates. */
    externalId: text("external_id").notNull(),
    sourceId: integer("source_id").references(() => newsSourcesTable.id, { onDelete: "set null" }),
    /** Denormalised so an item survives its source row being retired. */
    sourceName: text("source_name").notNull(),
    sourceKind: text("source_kind").notNull(),
    city: text("city").notNull(),
    category: text("category").notNull(),
    headline: text("headline").notNull(),
    summary: text("summary"),
    imageUrl: text("image_url"),
    link: text("link"),
    trustLabel: text("trust_label"),
    confidence: text("confidence"),
    /** Ingested items land `pending` and only reach the app once an editor publishes them. */
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("news_items_external_id_idx").on(table.externalId),
    index("news_items_city_status_published_idx").on(table.city, table.status, table.publishedAt),
    index("news_items_status_idx").on(table.status),
    index("news_items_category_idx").on(table.category),
  ],
);

export const insertNewsSourceSchema = createInsertSchema(newsSourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNewsItemSchema = createInsertSchema(newsItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNewsSource = z.infer<typeof insertNewsSourceSchema>;
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type NewsSource = typeof newsSourcesTable.$inferSelect;
export type NewsItem = typeof newsItemsTable.$inferSelect;
