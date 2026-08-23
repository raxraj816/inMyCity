import { pgTable, text, serial, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Paid placements in the Pulse feed.
 *
 * Kept well away from `pulse_posts` on purpose. That table is moderated content: its `status`
 * may only move through `/api/admin/moderation/...`, which records who published a row and
 * why, because a post that reaches readers without review is a takedown obligation nobody can
 * meet. An advertisement has none of those questions and all of a different set — who booked
 * it, what they paid for, when the flight ends. Overloading `pulse_posts.isSponsored` into an
 * ad system would put two lifecycles on one status column and corrupt the moderation trail for
 * both.
 *
 * A placement points at something the app already holds rather than carrying its own
 * destination. An advertiser buys reach for a real offer or event, which means the card a
 * reader taps lands on a page the app can vouch for, and a placement cannot become an open
 * redirect to anywhere on the internet.
 */
export const PLACEMENT_TARGETS = ["deal", "event", "place"] as const;
export type PlacementTarget = (typeof PLACEMENT_TARGETS)[number];

export const sponsoredPlacementsTable = pgTable(
  "sponsored_placements",
  {
    id: serial("id").primaryKey(),
    /** Stable key for idempotent seeding and admin imports. */
    externalId: text("external_id").notNull(),
    city: text("city").notNull(),
    /** Shown on the card, next to the label. Readers are told who is paying. */
    advertiserName: text("advertiser_name").notNull(),
    /** Optional override copy. Null means the card draws the target row's own title and image. */
    headline: text("headline"),
    body: text("body"),
    imageUrl: text("image_url"),
    ctaLabel: text("cta_label"),
    targetKind: text("target_kind").notNull(),
    targetId: integer("target_id").notNull(),
    /**
     * The flight. A placement outside its window is not served — which is why these are not
     * nullable: an ad with no end date is one nobody remembers to stop paying attention to.
     */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Lets a campaign be paused without losing the booking. */
    isActive: boolean("is_active").notNull().default(true),
    /** Lowest first, so a premium booking outranks filler within the same slot. */
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("sponsored_placements_external_id_idx").on(table.externalId),
    index("sponsored_placements_city_active_idx").on(table.city, table.isActive, table.startsAt),
  ],
);

export const insertSponsoredPlacementSchema = createInsertSchema(sponsoredPlacementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSponsoredPlacement = z.infer<typeof insertSponsoredPlacementSchema>;
export type SponsoredPlacement = typeof sponsoredPlacementsTable.$inferSelect;
