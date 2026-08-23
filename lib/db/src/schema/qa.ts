import { pgTable, text, serial, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const qaQuestionsTable = pgTable(
  "qa_questions",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    city: text("city").notNull(),
    question: text("question").notNull(),
    body: text("body"),
    authorName: text("author_name").notNull(),
    authorUserId: text("author_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    neighborhoodId: text("neighborhood_id"),
    tags: text("tags").array().notNull().default([]),
    /** Maintained by the vote routes from `qa_votes`; never seeded with a baseline. */
    upvoteCount: integer("upvote_count").notNull().default(0),
    /** Maintained by the answer routes, counting published answers only. */
    answerCount: integer("answer_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("qa_questions_external_id_idx").on(table.externalId),
    index("qa_questions_city_status_idx").on(table.city, table.status, table.publishedAt),
    index("qa_questions_status_idx").on(table.status),
  ],
);

export const qaAnswersTable = pgTable(
  "qa_answers",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    questionId: integer("question_id").notNull().references(() => qaQuestionsTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorName: text("author_name").notNull(),
    authorUserId: text("author_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** Set by an editor when an answer is the one a reader should trust. */
    isAccepted: boolean("is_accepted").notNull().default(false),
    /** Maintained by the vote routes from `qa_votes`; never seeded with a baseline. */
    upvoteCount: integer("upvote_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("qa_answers_external_id_idx").on(table.externalId),
    index("qa_answers_question_status_idx").on(table.questionId, table.status),
  ],
);

/** One upvote per actor per target; `targetType` is `question` or `answer`. */
export const qaVotesTable = pgTable(
  "qa_votes",
  {
    id: serial("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    actorKey: text("actor_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("qa_votes_unique_idx").on(table.targetType, table.targetId, table.actorKey),
    index("qa_votes_target_idx").on(table.targetType, table.targetId),
  ],
);

export const insertQaQuestionSchema = createInsertSchema(qaQuestionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQaAnswerSchema = createInsertSchema(qaAnswersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQaQuestion = z.infer<typeof insertQaQuestionSchema>;
export type InsertQaAnswer = z.infer<typeof insertQaAnswerSchema>;
export type QaQuestion = typeof qaQuestionsTable.$inferSelect;
export type QaAnswer = typeof qaAnswersTable.$inferSelect;
export type QaVote = typeof qaVotesTable.$inferSelect;
