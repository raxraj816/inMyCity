import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { communitiesTable, communityMembersTable, db, type Community } from "@workspace/db";

import { actorKeyFrom } from "../lib/actor";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches } from "../lib/sqlFilters";
import { reactionRateLimit } from "../middlewares/rateLimit";

const router = Router();

function toResponse(community: Community, viewerHasJoined: boolean) {
  return {
    id: community.id,
    slug: community.slug,
    city: community.city,
    name: community.name,
    description: community.description,
    icon: community.icon,
    tags: community.tags,
    memberCount: community.memberCount,
    activitySummary: community.activitySummary,
    viewerHasJoined,
  };
}

async function viewerMemberships(actorKey: string | null, ids: number[]): Promise<Set<number>> {
  if (!actorKey || ids.length === 0) return new Set();
  const rows = await db
    .select({ communityId: communityMembersTable.communityId })
    .from(communityMembersTable)
    .where(
      and(
        eq(communityMembersTable.actorKey, actorKey),
        inArray(communityMembersTable.communityId, ids),
      ),
    );
  return new Set(rows.map((row) => row.communityId));
}

router.get("/communities", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const conditions = [
      eq(communitiesTable.status, "published"),
      city ? cityMatches(communitiesTable.city, city) : undefined,
    ].filter((condition) => condition !== undefined);

    const communities = await db
      .select()
      .from(communitiesTable)
      .where(and(...conditions))
      .orderBy(desc(communitiesTable.memberCount), asc(communitiesTable.name))
      .limit(limit)
      .offset(offset);

    const joined = await viewerMemberships(actorKeyFrom(req), communities.map((c) => c.id));
    res.json(communities.map((community) => toResponse(community, joined.has(community.id))));
  } catch (err) {
    req.log.error({ err }, "Failed to list communities");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Join or leave. Membership is keyed by actor, so it works before sign-in — the same rule
 * favorites follow — and the counter moves in the same transaction as the membership row.
 */
router.post("/communities/:id/membership", reactionRateLimit, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid community id" });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required." });
      return;
    }

    const join = req.body?.join !== false;

    const result = await db.transaction(async (tx) => {
      const [community] = await tx
        .select()
        .from(communitiesTable)
        .where(and(eq(communitiesTable.id, id), eq(communitiesTable.status, "published")));
      if (!community) return null;

      const [existing] = await tx
        .select()
        .from(communityMembersTable)
        .where(
          and(
            eq(communityMembersTable.communityId, id),
            eq(communityMembersTable.actorKey, actorKey),
          ),
        );

      if (join && !existing) {
        await tx.insert(communityMembersTable).values({ communityId: id, actorKey });
        const [updated] = await tx
          .update(communitiesTable)
          .set({ memberCount: sql`${communitiesTable.memberCount} + 1` })
          .where(eq(communitiesTable.id, id))
          .returning();
        return { community: updated, joined: true };
      }

      if (!join && existing) {
        await tx.delete(communityMembersTable).where(eq(communityMembersTable.id, existing.id));
        const [updated] = await tx
          .update(communitiesTable)
          .set({ memberCount: sql`greatest(0, ${communitiesTable.memberCount} - 1)` })
          .where(eq(communitiesTable.id, id))
          .returning();
        return { community: updated, joined: false };
      }

      return { community, joined: Boolean(existing) };
    });

    if (!result) {
      res.status(404).json({ error: "Community not found" });
      return;
    }

    res.json(toResponse(result.community, result.joined));
  } catch (err) {
    req.log.error({ err }, "Failed to update community membership");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
