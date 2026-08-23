import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, pulsePostsTable, pulseReactionsTable, type PulsePost } from "@workspace/db";

import { actorDisplayName, actorKeyFrom } from "../lib/actor";
import { buildDigest } from "../lib/digest";
import { viewerReactions } from "../lib/pulseReactions";
import { submissionsEnabled } from "../lib/features";
import { parseLimit, parseOffset } from "../lib/pagination";
import { cityMatches } from "../lib/sqlFilters";
import { reactionRateLimit, submissionRateLimit } from "../middlewares/rateLimit";

const router = Router();

const REACTION_KINDS = ["like", "save"] as const;
type ReactionKind = (typeof REACTION_KINDS)[number];

const MAX_CAPTION_LENGTH = 1000;
const MAX_TAGS = 6;

/**
 * The shape the Pulse feed renders.
 *
 * `viewerHasLiked` and `viewerHasSaved` come from the caller's own reactions, so the feed can
 * paint the correct state on first load instead of guessing until the user taps something.
 */
function toResponse(
  post: PulsePost,
  viewer: { liked: boolean; saved: boolean },
) {
  return {
    id: post.id,
    city: post.city,
    tier: post.tier,
    authorName: post.authorName,
    authorHandle: post.authorHandle,
    location: post.location,
    neighborhoodId: post.neighborhoodId,
    caption: post.caption,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    videoDurationSeconds: post.videoDurationSeconds,
    filterTags: post.filterTags,
    likeCount: post.likeCount,
    saveCount: post.saveCount,
    source: post.source,
    sourceUrl: post.sourceUrl,
    trustLabel: post.trustLabel,
    confidence: post.confidence,
    isSponsored: post.isSponsored,
    isFeatured: post.isFeatured,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    viewerHasLiked: viewer.liked,
    viewerHasSaved: viewer.saved,
  };
}

router.get("/pulse", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const neighborhood = req.query.neighborhood as string | undefined;
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const conditions = [
      eq(pulsePostsTable.status, "published"),
      city ? cityMatches(pulsePostsTable.city, city) : undefined,
      neighborhood ? eq(pulsePostsTable.neighborhoodId, neighborhood) : undefined,
    ].filter((condition) => condition !== undefined);

    const posts = await db
      .select()
      .from(pulsePostsTable)
      .where(and(...conditions))
      // Featured first so an editorial hero stays at the top of its own feed, newest after.
      .orderBy(desc(pulsePostsTable.isFeatured), desc(sql`coalesce(${pulsePostsTable.publishedAt}, ${pulsePostsTable.createdAt})`))
      .limit(limit)
      .offset(offset);

    const viewer = await viewerReactions(actorKeyFrom(req), posts.map((post) => post.id));
    res.json(posts.map((post) => toResponse(post, viewer.get(post.id) ?? { liked: false, saved: false })));
  } catch (err) {
    req.log.error({ err }, "Failed to list pulse posts");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * The Pulse front page: a ranked mix of everything the app holds for this city.
 *
 * Registered before `/pulse/:id` so Express does not read "digest" as a post id.
 */
router.get("/pulse/digest", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    if (!city) {
      res.status(400).json({ error: "city is required" });
      return;
    }

    // The reader's own likes and saves are resolved in one pass over the posts the digest
    // chose, so the featured card paints the right state on first render.
    const actorKey = actorKeyFrom(req);
    const postIds = await db
      .select({ id: pulsePostsTable.id })
      .from(pulsePostsTable)
      .where(and(cityMatches(pulsePostsTable.city, city), eq(pulsePostsTable.status, "published")));

    const viewer = await viewerReactions(actorKey, postIds.map((row) => row.id));

    res.json({ city, sections: await buildDigest(city, viewer) });
  } catch (err) {
    req.log.error({ err }, "Failed to build the Pulse digest");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pulse/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }

    const [post] = await db
      .select()
      .from(pulsePostsTable)
      .where(and(eq(pulsePostsTable.id, id), eq(pulsePostsTable.status, "published")));

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const viewer = await viewerReactions(actorKeyFrom(req), [post.id]);
    res.json(toResponse(post, viewer.get(post.id) ?? { liked: false, saved: false }));
  } catch (err) {
    req.log.error({ err }, "Failed to get pulse post");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pulse", submissionRateLimit, async (req, res) => {
  try {
    if (!submissionsEnabled()) {
      res.status(503).json({
        error: "Pulse submissions aren't open yet. We're staffing moderation before we turn them on.",
      });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required to post." });
      return;
    }

    const { city, caption, mediaUrl, mediaType, neighborhoodId, location, filterTags } = req.body ?? {};

    if (typeof city !== "string" || !city.trim()) {
      res.status(400).json({ error: "city is required" });
      return;
    }
    if (typeof caption !== "string" || caption.trim().length < 10) {
      res.status(400).json({ error: "caption must be at least 10 characters" });
      return;
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      res.status(400).json({ error: `caption must be under ${MAX_CAPTION_LENGTH} characters` });
      return;
    }
    if (mediaUrl !== undefined && mediaUrl !== null && typeof mediaUrl !== "string") {
      res.status(400).json({ error: "mediaUrl must be a string" });
      return;
    }

    const tags = Array.isArray(filterTags)
      ? filterTags.filter((tag): tag is string => typeof tag === "string").slice(0, MAX_TAGS)
      : [];

    const [post] = await db
      .insert(pulsePostsTable)
      .values({
        externalId: `submission:${actorKey}:${Date.now()}`,
        city: city.trim(),
        tier: "resident",
        authorName: actorDisplayName(req),
        authorHandle: req.isAuthenticated() ? "@resident" : "@guest",
        authorUserId: req.isAuthenticated() ? (req.user?.id ?? null) : null,
        location: typeof location === "string" ? location.trim().slice(0, 120) : null,
        neighborhoodId: typeof neighborhoodId === "string" ? neighborhoodId : null,
        caption: caption.trim(),
        mediaType: mediaType === "video" ? "video" : "image",
        mediaUrl: typeof mediaUrl === "string" ? mediaUrl : null,
        filterTags: ["all", ...tags.filter((tag) => tag !== "all")],
        trustLabel: "user-submitted",
        confidence: "low",
        // Everything a reader writes waits for review. There is no path from this route to a
        // published row, which is what makes the takedown window in section 2.1 achievable.
        status: "pending",
      })
      .returning();

    res.status(202).json({
      id: post.id,
      status: post.status,
      message: "Thanks — a moderator will review this before it appears in Pulse.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit pulse post");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Toggles a like or a save.
 *
 * The counter on the post and the reaction row move together in one transaction, so the number
 * the feed shows is always the number of rows that exist rather than a drifting cache.
 */
router.post("/pulse/:id/reactions", reactionRateLimit, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const kind = req.body?.kind as ReactionKind | undefined;

    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid post id" });
      return;
    }
    if (!kind || !REACTION_KINDS.includes(kind)) {
      res.status(400).json({ error: `kind must be one of ${REACTION_KINDS.join(", ")}` });
      return;
    }

    const actorKey = actorKeyFrom(req);
    if (!actorKey) {
      res.status(400).json({ error: "A device id or a signed-in session is required." });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [post] = await tx
        .select()
        .from(pulsePostsTable)
        .where(and(eq(pulsePostsTable.id, id), eq(pulsePostsTable.status, "published")));
      if (!post) return null;

      const [existing] = await tx
        .select()
        .from(pulseReactionsTable)
        .where(
          and(
            eq(pulseReactionsTable.postId, id),
            eq(pulseReactionsTable.actorKey, actorKey),
            eq(pulseReactionsTable.kind, kind),
          ),
        );

      const column = kind === "like" ? pulsePostsTable.likeCount : pulsePostsTable.saveCount;
      const field = kind === "like" ? "likeCount" : "saveCount";

      if (existing) {
        await tx.delete(pulseReactionsTable).where(eq(pulseReactionsTable.id, existing.id));
        const [updated] = await tx
          .update(pulsePostsTable)
          .set({ [field]: sql`greatest(0, ${column} - 1)` })
          .where(eq(pulsePostsTable.id, id))
          .returning();
        return { post: updated, active: false };
      }

      await tx.insert(pulseReactionsTable).values({ postId: id, actorKey, kind });
      const [updated] = await tx
        .update(pulsePostsTable)
        .set({ [field]: sql`${column} + 1` })
        .where(eq(pulsePostsTable.id, id))
        .returning();
      return { post: updated, active: true };
    });

    if (!result) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json({
      postId: result.post.id,
      kind,
      active: result.active,
      likeCount: result.post.likeCount,
      saveCount: result.post.saveCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle pulse reaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
