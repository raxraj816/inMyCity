import { Router } from "express";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  communitiesTable,
  contentReportsTable,
  db,
  newsItemsTable,
  pulsePostsTable,
  qaAnswersTable,
  qaQuestionsTable,
  REPORTABLE_TYPES,
  type ReportableType,
} from "@workspace/db";

import { adminEmailFor, requireAdmin } from "../lib/admin";
import { contentHealth, expiredDealIds, stalestRows } from "../lib/contentHealth";
import { recordModerationAction } from "../lib/moderation";
import { parseLimit, parseOffset } from "../lib/pagination";

/**
 * The moderation queue and the grievance record.
 *
 * Two things have to be true for the launch plan's "a reported post can be taken down within
 * the required window": someone must be able to see what is waiting, ordered by how close it
 * is to breaching, and the takedown itself must be one action that leaves a trail. That is all
 * this router is.
 */
const router = Router();

router.use("/admin", requireAdmin);

type ModeratedTarget = {
  table: PgTable;
  idColumn: AnyPgColumn;
  statusColumn: AnyPgColumn;
  /** What the queue shows as the row's headline. */
  titleColumn: AnyPgColumn;
  publishedAtColumn?: AnyPgColumn;
  createdAtColumn: AnyPgColumn;
  cityColumn?: AnyPgColumn;
  /** Kept in step when an answer is published or removed. */
  onStatusChange?: (id: number) => Promise<void>;
};

/** Publishing an answer is the only place an aggregate on another row has to move with it. */
async function syncAnswerCount(answerId: number): Promise<void> {
  const [answer] = await db
    .select({ questionId: qaAnswersTable.questionId })
    .from(qaAnswersTable)
    .where(eq(qaAnswersTable.id, answerId));
  if (!answer) return;

  const [{ total }] = await db
    .select({ total: count() })
    .from(qaAnswersTable)
    .where(and(eq(qaAnswersTable.questionId, answer.questionId), eq(qaAnswersTable.status, "published")));

  await db
    .update(qaQuestionsTable)
    .set({ answerCount: total })
    .where(eq(qaQuestionsTable.id, answer.questionId));
}

const MODERATED: Record<string, ModeratedTarget> = {
  pulse_post: {
    table: pulsePostsTable,
    idColumn: pulsePostsTable.id,
    statusColumn: pulsePostsTable.status,
    titleColumn: pulsePostsTable.caption,
    publishedAtColumn: pulsePostsTable.publishedAt,
    createdAtColumn: pulsePostsTable.createdAt,
    cityColumn: pulsePostsTable.city,
  },
  news_item: {
    table: newsItemsTable,
    idColumn: newsItemsTable.id,
    statusColumn: newsItemsTable.status,
    titleColumn: newsItemsTable.headline,
    publishedAtColumn: newsItemsTable.publishedAt,
    createdAtColumn: newsItemsTable.createdAt,
    cityColumn: newsItemsTable.city,
  },
  qa_question: {
    table: qaQuestionsTable,
    idColumn: qaQuestionsTable.id,
    statusColumn: qaQuestionsTable.status,
    titleColumn: qaQuestionsTable.question,
    publishedAtColumn: qaQuestionsTable.publishedAt,
    createdAtColumn: qaQuestionsTable.createdAt,
    cityColumn: qaQuestionsTable.city,
  },
  qa_answer: {
    table: qaAnswersTable,
    idColumn: qaAnswersTable.id,
    statusColumn: qaAnswersTable.status,
    titleColumn: qaAnswersTable.body,
    publishedAtColumn: qaAnswersTable.publishedAt,
    createdAtColumn: qaAnswersTable.createdAt,
    onStatusChange: syncAnswerCount,
  },
  community: {
    table: communitiesTable,
    idColumn: communitiesTable.id,
    statusColumn: communitiesTable.status,
    titleColumn: communitiesTable.name,
    createdAtColumn: communitiesTable.createdAt,
    cityColumn: communitiesTable.city,
  },
};

function isModeratedType(value: string): value is ReportableType {
  return Object.prototype.hasOwnProperty.call(MODERATED, value);
}

/** Everything waiting on a human, newest first within each type. */
router.get("/admin/moderation/queue", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const limit = parseLimit(req.query.limit, 25);

    const sections = await Promise.all(
      Object.entries(MODERATED).map(async ([type, target]) => {
        const where = and(
          eq(target.statusColumn, "pending"),
          city && target.cityColumn ? sql`lower(${target.cityColumn}) = lower(${city})` : undefined,
        );

        const [rows, [{ total }]] = await Promise.all([
          db
            .select({
              id: target.idColumn,
              title: target.titleColumn,
              createdAt: target.createdAtColumn,
            })
            .from(target.table)
            .where(where)
            .orderBy(asc(target.createdAtColumn))
            .limit(limit),
          db.select({ total: count() }).from(target.table).where(where),
        ]);

        return {
          type,
          pending: total,
          items: rows.map((row) => ({
            id: row.id as number,
            title: String(row.title ?? "").slice(0, 200),
            createdAt: (row.createdAt as Date).toISOString(),
          })),
        };
      }),
    );

    const [{ openReports }] = await db
      .select({ openReports: count() })
      .from(contentReportsTable)
      .where(eq(contentReportsTable.status, "open"));

    const [overdue] = await db
      .select({ total: count() })
      .from(contentReportsTable)
      .where(and(eq(contentReportsTable.status, "open"), sql`${contentReportsTable.dueAt} < now()`));

    res.json({
      city: city ?? null,
      openReports,
      overdueReports: overdue.total,
      sections,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to build moderation queue");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Publish, remove or restore one row.
 *
 * `remove` is the takedown. It keeps the row and stamps a reason, so the item can be produced
 * later if the decision is challenged — deleting it would leave nothing to account for.
 */
router.post("/admin/moderation/:type/:id/:action", async (req, res) => {
  try {
    const { type, action } = req.params;
    const id = parseInt(req.params.id, 10);

    if (!isModeratedType(type)) {
      res.status(400).json({ error: `type must be one of ${Object.keys(MODERATED).join(", ")}` });
      return;
    }
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (action !== "publish" && action !== "remove" && action !== "unpublish") {
      res.status(400).json({ error: "action must be publish, unpublish or remove" });
      return;
    }

    const target = MODERATED[type];
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    const reportId = Number.isInteger(req.body?.reportId) ? (req.body.reportId as number) : null;

    if (action === "remove" && !reason) {
      res.status(400).json({ error: "A reason is required to remove content." });
      return;
    }

    const values: Record<string, unknown> =
      action === "publish"
        ? { status: "published", removedAt: null, removalReason: null }
        : action === "unpublish"
          ? { status: "pending" }
          : { status: "removed", removedAt: new Date(), removalReason: reason };

    if (action === "publish" && target.publishedAtColumn) values.publishedAt = new Date();
    if (type === "news_item") {
      values.reviewedBy = adminEmailFor(req);
      values.reviewedAt = new Date();
    }

    const [row] = await db
      .update(target.table)
      .set(values as never)
      .where(eq(target.idColumn, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await target.onStatusChange?.(id);

    await recordModerationAction({
      targetType: type,
      targetId: id,
      action: action === "publish" ? "publish" : action === "unpublish" ? "unpublish" : "remove",
      actorEmail: adminEmailFor(req),
      note: reason,
      reportId,
    });

    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Moderation action failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/reports", async (req, res) => {
  try {
    const status = (req.query.status as string | undefined) ?? "open";
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const where = status === "all" ? undefined : eq(contentReportsTable.status, status);

    const rows = await db
      .select()
      .from(contentReportsTable)
      .where(where)
      // Closest to breaching first — the queue is ordered by obligation, not arrival.
      .orderBy(asc(contentReportsTable.dueAt), desc(contentReportsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(
      rows.map((row) => ({
        ...row,
        dueAt: row.dueAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        overdue: row.status === "open" && row.dueAt.getTime() < Date.now(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Closes a report. `actioned` means the content was taken down or corrected; `dismissed` means
 * it was reviewed and left up. Both are recorded — a dismissal has to be accountable too.
 */
router.post("/admin/reports/:id/resolve", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const outcome = req.body?.outcome;
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : null;

    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid report id" });
      return;
    }
    if (outcome !== "actioned" && outcome !== "dismissed") {
      res.status(400).json({ error: "outcome must be actioned or dismissed" });
      return;
    }
    if (!note) {
      res.status(400).json({ error: "A note is required when closing a report." });
      return;
    }

    const [report] = await db
      .update(contentReportsTable)
      .set({
        status: outcome,
        resolvedAt: new Date(),
        resolvedBy: adminEmailFor(req),
        resolutionNote: note,
      })
      .where(eq(contentReportsTable.id, id))
      .returning();

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    await recordModerationAction({
      targetType: report.targetType as ReportableType,
      targetId: report.targetId,
      action: outcome === "actioned" ? "action_report" : "dismiss_report",
      actorEmail: adminEmailFor(req),
      note,
      reportId: report.id,
    });

    res.json({
      ...report,
      dueAt: report.dueAt.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to resolve report");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Volume against the launch targets, plus what has gone stale. */
router.get("/admin/content-health", async (req, res) => {
  try {
    const city = (req.query.city as string | undefined) ?? "Mumbai";
    const [health, stale, expiredDeals] = await Promise.all([
      contentHealth(city),
      stalestRows(city),
      expiredDealIds(city),
    ]);

    res.json({
      ...health,
      reportableTypes: REPORTABLE_TYPES,
      expiredDealsStillListed: expiredDeals.length,
      stalest: stale,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute content health");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
