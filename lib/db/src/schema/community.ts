import { pgTable, text, serial, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communitiesTable = pgTable(
  "communities",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    slug: text("slug").notNull(),
    city: text("city").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("users"),
    tags: text("tags").array().notNull().default([]),
    /**
     * Real members, maintained by the join and leave routes alongside `community_members`.
     * Nothing seeds a baseline into it — a fabricated member count is the kind of social proof
     * the trust principle exists to rule out.
     */
    memberCount: integer("member_count").notNull().default(0),
    /** Editor-set line under the member count. Null renders nothing rather than a guess. */
    activitySummary: text("activity_summary"),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("communities_external_id_idx").on(table.externalId),
    uniqueIndex("communities_slug_idx").on(table.slug),
    index("communities_city_status_idx").on(table.city, table.status),
  ],
);

/** Membership keyed by actor, so joining works before sign-in and reconciles afterwards. */
export const communityMembersTable = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id").notNull().references(() => communitiesTable.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("community_members_unique_idx").on(table.communityId, table.actorKey),
    index("community_members_actor_idx").on(table.actorKey),
  ],
);

export const insertCommunitySchema = createInsertSchema(communitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;
export type CommunityMember = typeof communityMembersTable.$inferSelect;
