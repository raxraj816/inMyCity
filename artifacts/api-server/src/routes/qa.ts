import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, qaAnswersTable, qaQuestionsTable, qaVotesTable, type QaAnswer, type QaQuestion } from "@workspace/db";

import { actorDisplayName, actorKeyFrom } from "../lib/actor";
import { submissionsEnabled } from "../lib/features";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches } from "../lib/sqlFilters";
import { reactionRateLimit, submissionRateLimit } from "../middlewares/rateLimit";

const router = Router();

const MAX_QUESTION_LENGTH = 300;
const MAX_BODY_LENGTH = 2000;
const MAX_TAGS = 5;

/** Two initials for the avatar, derived rather than stored so a rename stays consistent. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function questionResponse(question: QaQuestion, viewerHasUpvoted: boolean) {
  return {
    id: question.id,
    city: question.city,
    question: question.question,
    body: question.body,
    authorName: question.authorName,
    authorInitials: initialsFor(question.authorName),
    neighborhoodId: question.neighborhoodId,
    tags: question.tags,
    upvoteCount: question.upvoteCount,
    answerCount: question.answerCount,
    publishedAt: (question.publishedAt ?? question.createdAt).toISOString(),
    viewerHasUpvoted,
  };
}

function answerResponse(answer: QaAnswer, viewerHasUpvoted: boolean) {
  return {
    id: answer.id,
    questionId: answer.questionId,
    body: answer.body,
    authorName: answer.authorName,
    authorInitials: initialsFor(answer.authorName),
    isAccepted: answer.isAccepted,
    upvoteCount: answer.upvoteCount,
    publishedAt: (answer.publishedAt ?? answer.createdAt).toISOString(),
    viewerHasUpvoted,
  };
}

async function viewerVotes(
  actorKey: string | null,
  targetType: "question" | "answer",
  ids: number[],
): Promise<Set<number>> {
  if (!actorKey || ids.length === 0) return new Set();
  const rows = await db
    .select({ targetId: qaVotesTable.targetId })
    .from(qaVotesTable)
    .where(
      and(
        eq(qaVotesTable.actorKey, actorKey),
        eq(qaVotesTable.targetType, targetType),
        inArray(qaVotesTable.targetId, ids),
      ),
    );
  return new Set(rows.map((row) => row.targetId));
}

router.get("/qa/questions", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const sort = req.query.sort === "top" ? "top" : "recent";
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const conditions = [
      eq(qaQuestionsTable.status, "published"),
      city ? cityMatches(qaQuestionsTable.city, city) : undefined,
    ].filter((condition) => condition !== undefined);

    const questions = await db
      .select()
      .from(qaQuestionsTable)
      .where(and(...conditions))
      .orderBy(
        sort === "top"
          ? desc(qaQuestionsTable.upvoteCount)
          : desc(sql`coalesce(${qaQuestionsTable.publishedAt}, ${qaQuestionsTable.createdAt})`),
      )
      .limit(limit)
      .offset(offset);

    const voted = await viewerVotes(actorKeyFrom(req), "question", questions.map((q) => q.id));
    res.json(questions.map((question) => questionResponse(question, voted.has(question.id))));
  } catch (err) {
    req.log.error({ err }, "Failed to list questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/qa/questions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid question id" });
      return;
    }

    const [question] = await db
      .select()
      .from(qaQuestionsTable)
      .where(and(eq(qaQuestionsTable.id, id), eq(qaQuestionsTable.status, "published")));

    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const answers = await db
      .select()
      .from(qaAnswersTable)
      .where(and(eq(qaAnswersTable.questionId, id), eq(qaAnswersTable.status, "published")))
      // The accepted answer first — that is the whole point of accepting one.
      .orderBy(desc(qaAnswersTable.isAccepted), desc(qaAnswersTable.upvoteCount), asc(qaAnswersTable.createdAt));

    const actorKey = actorKeyFrom(req);
    const [questionVotes, answerVotes] = await Promise.all([
      viewerVotes(actorKey, "question", [question.id]),
      viewerVotes(actorKey, "answer", answers.map((answer) => answer.id)),
    ]);

    res.json({
      ...questionResponse(question, questionVotes.has(question.id)),
      answers: answers.map((answer) => answerResponse(answer, answerVotes.has(answer.id))),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/qa/questions", submissionRateLimit, async (req, res) => {
  try {
    if (!submissionsEnabled()) {
      res.status(503).json({
        error: "Asking isn't open yet. We're staffing moderation before we turn it on.",
      });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required." });
      return;
    }

    const { city, question, body, tags, neighborhoodId } = req.body ?? {};

    if (typeof city !== "string" || !city.trim()) {
      res.status(400).json({ error: "city is required" });
      return;
    }
    if (typeof question !== "string" || question.trim().length < 10) {
      res.status(400).json({ error: "question must be at least 10 characters" });
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      res.status(400).json({ error: `question must be under ${MAX_QUESTION_LENGTH} characters` });
      return;
    }
    if (body !== undefined && body !== null && (typeof body !== "string" || body.length > MAX_BODY_LENGTH)) {
      res.status(400).json({ error: `body must be a string under ${MAX_BODY_LENGTH} characters` });
      return;
    }

    const [row] = await db
      .insert(qaQuestionsTable)
      .values({
        externalId: `submission:${actorKey}:${Date.now()}`,
        city: city.trim(),
        question: question.trim(),
        body: typeof body === "string" ? body.trim() : null,
        authorName: actorDisplayName(req, "A neighbour"),
        authorUserId: req.isAuthenticated() ? (req.user?.id ?? null) : null,
        neighborhoodId: typeof neighborhoodId === "string" ? neighborhoodId : null,
        tags: Array.isArray(tags)
          ? tags.filter((tag): tag is string => typeof tag === "string").slice(0, MAX_TAGS)
          : [],
        status: "pending",
      })
      .returning();

    res.status(202).json({
      id: row.id,
      status: row.status,
      message: "Thanks — a moderator will review this before it appears.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/qa/questions/:id/answers", submissionRateLimit, async (req, res) => {
  try {
    if (!submissionsEnabled()) {
      res.status(503).json({
        error: "Answering isn't open yet. We're staffing moderation before we turn it on.",
      });
      return;
    }

    const questionId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(questionId)) {
      res.status(400).json({ error: "Invalid question id" });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required." });
      return;
    }

    const body = req.body?.body;
    if (typeof body !== "string" || body.trim().length < 10) {
      res.status(400).json({ error: "body must be at least 10 characters" });
      return;
    }
    if (body.length > MAX_BODY_LENGTH) {
      res.status(400).json({ error: `body must be under ${MAX_BODY_LENGTH} characters` });
      return;
    }

    const [question] = await db
      .select()
      .from(qaQuestionsTable)
      .where(and(eq(qaQuestionsTable.id, questionId), eq(qaQuestionsTable.status, "published")));
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    // `answerCount` is only incremented when a moderator publishes the answer, so the number
    // on the card always matches what a reader can actually open.
    const [row] = await db
      .insert(qaAnswersTable)
      .values({
        externalId: `submission:${actorKey}:${Date.now()}`,
        questionId,
        body: body.trim(),
        authorName: actorDisplayName(req, "A neighbour"),
        authorUserId: req.isAuthenticated() ? (req.user?.id ?? null) : null,
        status: "pending",
      })
      .returning();

    res.status(202).json({
      id: row.id,
      status: row.status,
      message: "Thanks — a moderator will review this before it appears.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit answer");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Toggles an upvote on a question or an answer. One per actor, enforced by a unique index. */
router.post("/qa/:targetType/:id/upvote", reactionRateLimit, async (req, res) => {
  try {
    const targetType = req.params.targetType === "questions" ? "question" : req.params.targetType === "answers" ? "answer" : null;
    const id = parseInt(String(req.params.id), 10);

    if (!targetType) {
      res.status(400).json({ error: "targetType must be questions or answers" });
      return;
    }
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required." });
      return;
    }

    const table = targetType === "question" ? qaQuestionsTable : qaAnswersTable;

    const result = await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: table.id })
        .from(table)
        .where(and(eq(table.id, id), eq(table.status, "published")));
      if (!target) return null;

      const [existing] = await tx
        .select()
        .from(qaVotesTable)
        .where(
          and(
            eq(qaVotesTable.targetType, targetType),
            eq(qaVotesTable.targetId, id),
            eq(qaVotesTable.actorKey, actorKey),
          ),
        );

      if (existing) {
        await tx.delete(qaVotesTable).where(eq(qaVotesTable.id, existing.id));
        const [updated] = await tx
          .update(table)
          .set({ upvoteCount: sql`greatest(0, ${table.upvoteCount} - 1)` })
          .where(eq(table.id, id))
          .returning({ upvoteCount: table.upvoteCount });
        return { upvoteCount: updated.upvoteCount, active: false };
      }

      await tx.insert(qaVotesTable).values({ targetType, targetId: id, actorKey });
      const [updated] = await tx
        .update(table)
        .set({ upvoteCount: sql`${table.upvoteCount} + 1` })
        .where(eq(table.id, id))
        .returning({ upvoteCount: table.upvoteCount });
      return { upvoteCount: updated.upvoteCount, active: true };
    });

    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ id, targetType, upvoteCount: result.upvoteCount, active: result.active });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle upvote");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
