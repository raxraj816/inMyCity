import { and, eq, inArray } from "drizzle-orm";
import { db, pulseReactionsTable } from "@workspace/db";

/** The caller's like/save state across a page of posts, in one query rather than N. */
export async function viewerReactions(
  actorKey: string | null,
  postIds: number[],
): Promise<Map<number, { liked: boolean; saved: boolean }>> {
  const state = new Map<number, { liked: boolean; saved: boolean }>();
  if (!actorKey || postIds.length === 0) return state;

  const rows = await db
    .select({ postId: pulseReactionsTable.postId, kind: pulseReactionsTable.kind })
    .from(pulseReactionsTable)
    .where(
      and(eq(pulseReactionsTable.actorKey, actorKey), inArray(pulseReactionsTable.postId, postIds)),
    );

  for (const row of rows) {
    const current = state.get(row.postId) ?? { liked: false, saved: false };
    if (row.kind === "like") current.liked = true;
    if (row.kind === "save") current.saved = true;
    state.set(row.postId, current);
  }
  return state;
}

