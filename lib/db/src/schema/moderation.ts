import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Content types a reader can report. Kept as a plain string column rather than a Postgres
 * enum so adding a surface does not need a migration dance.
 */
export const REPORTABLE_TYPES = ["pulse_post", "news_item", "qa_question", "qa_answer", "community"] as const;
export type ReportableType = (typeof REPORTABLE_TYPES)[number];

export const REPORT_REASONS = [
  "inaccurate",
  "spam",
  "harassment",
  "hate_speech",
  "adult_content",
  "impersonation",
  "copyright",
  "privacy",
  "illegal",
  "other",
] as const;

export const REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;

/**
 * Reader reports, and the clock the IT Rules put on answering them.
 *
 * `dueAt` is stamped at creation from the window for the reason — the rules give 24 hours for
 * the sexual-content categories and 72 for everything else — so the moderation queue can sort
 * by what is closest to breaching rather than by what arrived first.
 */
export const contentReportsTable = pgTable(
  "content_reports",
  {
    id: serial("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    reporterActorKey: text("reporter_actor_key"),
    reporterEmail: text("reporter_email"),
    status: text("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("content_reports_status_due_idx").on(table.status, table.dueAt),
    index("content_reports_target_idx").on(table.targetType, table.targetId),
  ],
);

/** Append-only trail of every moderation decision, for the grievance-officer record. */
export const moderationActionsTable = pgTable(
  "moderation_actions",
  {
    id: serial("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    action: text("action").notNull(),
    actorEmail: text("actor_email").notNull(),
    note: text("note"),
    reportId: integer("report_id").references(() => contentReportsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_actions_target_idx").on(table.targetType, table.targetId),
    index("moderation_actions_created_idx").on(table.createdAt),
  ],
);

export const insertContentReportSchema = createInsertSchema(contentReportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ContentReport = typeof contentReportsTable.$inferSelect;
export type ModerationAction = typeof moderationActionsTable.$inferSelect;
