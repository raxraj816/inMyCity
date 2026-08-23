import { db, moderationActionsTable } from "@workspace/db";

/**
 * Response windows for reported content.
 *
 * India's IT Rules give an intermediary 24 hours to act on a complaint about content that is
 * sexual in nature or impersonates someone, and 72 hours for a general grievance. `dueAt` is
 * stamped from the reason at the moment the report is filed, so the queue can be ordered by
 * what is closest to breaching rather than by arrival time, and so a missed window is visible
 * rather than discovered later.
 */
const URGENT_REASONS = new Set(["adult_content", "impersonation", "privacy", "harassment"]);

export const URGENT_RESPONSE_HOURS = 24;
export const STANDARD_RESPONSE_HOURS = 72;

export function responseWindowHours(reason: string): number {
  return URGENT_REASONS.has(reason) ? URGENT_RESPONSE_HOURS : STANDARD_RESPONSE_HOURS;
}

export function dueAtFor(reason: string, from: Date = new Date()): Date {
  return new Date(from.getTime() + responseWindowHours(reason) * 60 * 60 * 1000);
}

export type ModerationActionKind =
  | "publish"
  | "unpublish"
  | "remove"
  | "restore"
  | "edit"
  | "dismiss_report"
  | "action_report";

/**
 * Appends to the moderation trail. Every state change an admin makes goes through here.
 *
 * `targetType` is a reportable type for a takedown and a collection name for a content edit —
 * the trail spans both, because "who changed this row" is the same question either way.
 */
export async function recordModerationAction(input: {
  targetType: string;
  targetId: number;
  action: ModerationActionKind;
  actorEmail: string;
  note?: string | null;
  reportId?: number | null;
}): Promise<void> {
  await db.insert(moderationActionsTable).values({
    targetType: input.targetType,
    targetId: input.targetId,
    action: input.action,
    actorEmail: input.actorEmail,
    note: input.note ?? null,
    reportId: input.reportId ?? null,
  });
}
