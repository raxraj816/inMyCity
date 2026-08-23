import { pgTable, text, serial, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

/**
 * Moderation state every user-visible content row carries.
 *
 * `pending` rows exist but are invisible to the app: that is where submissions and ingested
 * news land until someone reviews them. `removed` is a takedown — the row is kept so the
 * moderation trail in `moderation_actions` still points at something.
 */
export const CONTENT_STATUSES = ["pending", "published", "removed"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const POSTER_TIERS = ["official", "local_expert", "creator", "business", "resident"] as const;
export const TRUST_LABELS = ["verified", "editorial", "partner", "community", "user-submitted"] as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export const pulsePostsTable = pgTable(
  "pulse_posts",
  {
    id: serial("id").primaryKey(),
    /** Stable key for idempotent seeding and re-ingestion. Never reused across rows. */
    externalId: text("external_id").notNull(),
    city: text("city").notNull(),
    tier: text("tier").notNull(),
    authorName: text("author_name").notNull(),
    authorHandle: text("author_handle").notNull(),
    /** Set when the post came from a signed-in submission; null for editorial rows. */
    authorUserId: text("author_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    location: text("location"),
    /** Launch zone id from `MUMBAI_LAUNCH_ZONES`, when the post is about one neighbourhood. */
    neighborhoodId: text("neighborhood_id"),
    caption: text("caption").notNull(),
    mediaType: text("media_type").notNull().default("image"),
    mediaUrl: text("media_url"),
    videoDurationSeconds: integer("video_duration_seconds"),
    filterTags: text("filter_tags").array().notNull().default([]),
    /**
     * Real counters, maintained by the reaction route alongside `pulse_post_reactions`.
     * Seeds leave them at zero: an editorial launch post with three thousand invented likes
     * is exactly the manufactured social proof the trust principle rules out.
     */
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    /** Where the claim comes from, so the UI can show it next to the trust label. */
    source: text("source"),
    sourceUrl: text("source_url"),
    trustLabel: text("trust_label"),
    confidence: text("confidence"),
    isSponsored: boolean("is_sponsored").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("pulse_posts_external_id_idx").on(table.externalId),
    index("pulse_posts_city_status_published_idx").on(table.city, table.status, table.publishedAt),
    index("pulse_posts_status_idx").on(table.status),
    index("pulse_posts_neighborhood_idx").on(table.neighborhoodId),
  ],
);

/**
 * Likes and saves, keyed by an actor rather than a user id so they work before sign-in.
 * `actorKey` is the user id for a signed-in reader and `anon:<device id>` otherwise, which
 * is the same reconciliation seam favorites use.
 */
export const pulseReactionsTable = pgTable(
  "pulse_post_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => pulsePostsTable.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pulse_reactions_unique_idx").on(table.postId, table.actorKey, table.kind),
    index("pulse_reactions_actor_idx").on(table.actorKey),
  ],
);

export const insertPulsePostSchema = createInsertSchema(pulsePostsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPulsePost = z.infer<typeof insertPulsePostSchema>;
export type PulsePost = typeof pulsePostsTable.$inferSelect;
export type PulseReaction = typeof pulseReactionsTable.$inferSelect;
