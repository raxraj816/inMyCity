import { Router } from "express";
import { db, contentReportsTable, REPORTABLE_TYPES, REPORT_REASONS } from "@workspace/db";

import { actorKeyFrom } from "../lib/actor";
import { grievanceContact, submissionsEnabled } from "../lib/features";
import { dueAtFor, responseWindowHours } from "../lib/moderation";
import { submissionRateLimit } from "../middlewares/rateLimit";

const router = Router();

const MAX_DETAILS_LENGTH = 2000;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The published takedown path.
 *
 * The IT Rules require an intermediary to publish a named grievance officer, a way to reach
 * them, and the window inside which a complaint is handled. The app reads this endpoint rather
 * than hardcoding a contact, so the published detail and the one moderation actually uses are
 * the same string.
 */
router.get("/community-policy", (req, res) => {
  const contact = grievanceContact();
  res.json({
    submissionsEnabled: submissionsEnabled(),
    reportReasons: REPORT_REASONS.map((reason) => ({
      id: reason,
      responseHours: responseWindowHours(reason),
    })),
    grievanceOfficer: contact,
  });
});

/**
 * Files a report. Open to anyone, signed in or not — a takedown path that requires an account
 * is not a takedown path — and rate limited because the queue behind it is a person's time.
 */
router.post("/reports", submissionRateLimit, async (req, res) => {
  try {
    const { targetType, targetId, reason, details, reporterEmail } = req.body ?? {};

    if (typeof targetType !== "string" || !(REPORTABLE_TYPES as readonly string[]).includes(targetType)) {
      res.status(400).json({ error: `targetType must be one of ${REPORTABLE_TYPES.join(", ")}` });
      return;
    }

    const id = Number(targetId);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "targetId must be a positive integer" });
      return;
    }

    if (typeof reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(reason)) {
      res.status(400).json({ error: `reason must be one of ${REPORT_REASONS.join(", ")}` });
      return;
    }

    if (details !== undefined && details !== null && (typeof details !== "string" || details.length > MAX_DETAILS_LENGTH)) {
      res.status(400).json({ error: `details must be a string under ${MAX_DETAILS_LENGTH} characters` });
      return;
    }

    if (reporterEmail !== undefined && reporterEmail !== null && (typeof reporterEmail !== "string" || !EMAIL_PATTERN.test(reporterEmail))) {
      res.status(400).json({ error: "reporterEmail must be a valid email address" });
      return;
    }

    const [report] = await db
      .insert(contentReportsTable)
      .values({
        targetType,
        targetId: id,
        reason,
        details: typeof details === "string" ? details.trim() : null,
        reporterActorKey: actorKeyFrom(req),
        reporterEmail: typeof reporterEmail === "string" ? reporterEmail.trim().toLowerCase() : (req.user?.email ?? null),
        status: "open",
        dueAt: dueAtFor(reason),
      })
      .returning();

    req.log.warn({ reportId: report.id, targetType, targetId: id, reason }, "Content reported");

    res.status(201).json({
      id: report.id,
      status: report.status,
      dueAt: report.dueAt.toISOString(),
      responseHours: responseWindowHours(reason),
      message: `Thanks for flagging this. We review reports like this within ${responseWindowHours(reason)} hours.`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to file report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
