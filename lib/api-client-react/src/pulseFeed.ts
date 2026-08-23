import { useInfiniteQuery, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { getPulseFeed } from "./generated/api";
import type { FeedItem, GetPulseFeedParams, PulseFeedPage } from "./generated/api.schemas";

/**
 * The Pulse feed, paged.
 *
 * Hand-written rather than generated. Orval can emit an infinite-query hook, but it types the
 * page param as `unknown` and it cannot know what `getNextPageParam` should read — the cursor
 * policy is ours, not the spec's. Turning `useInfinite` on in the config also emits a second
 * hook for every operation in the API, nearly all of them dead code. So this file is the one
 * place that knows the feed pages on `nextCursor`, and everything under `generated/` stays
 * generated.
 */
export function usePulseFeed(params: GetPulseFeedParams, options?: { enabled?: boolean }) {
  return useInfiniteQuery<PulseFeedPage, Error, PulseFeedPage[], readonly unknown[], string | undefined>({
    queryKey: ["/api/pulse/feed", params.city],
    queryFn: ({ pageParam, signal }) => getPulseFeed({ ...params, cursor: pageParam }, { signal }),
    initialPageParam: undefined,
    // A null cursor is the end of the feed, and returning undefined is what stops React Query
    // asking for more.
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (data) => data.pages,
    enabled: options?.enabled ?? true,
  });
}

/** The query key the feed is cached under, for invalidating it after a like or a save. */
export const PULSE_FEED_QUERY_KEY = ["/api/pulse/feed"] as const;

/**
 * Paint a like or a save immediately, in place.
 *
 * Invalidating the feed after a reaction would refetch every page the reader has scrolled
 * through — one tap on a heart at the bottom of the third page costs three round trips and a
 * visible reflow. The server is still the authority; this only moves the card the reader
 * touched, and the next refresh reconciles it.
 */
export function applyPulseReaction(queryClient: QueryClient, postId: number, kind: "like" | "save") {
  queryClient.setQueriesData<InfiniteData<PulseFeedPage>>({ queryKey: PULSE_FEED_QUERY_KEY }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.kind === "post" && item.id === postId ? toggled(item, kind) : item,
            ),
          })),
        }
      : data,
  );
}

function toggled(item: FeedItem, kind: "like" | "save"): FeedItem {
  if (kind === "like") {
    const liked = !item.viewerHasLiked;
    return { ...item, viewerHasLiked: liked, likeCount: Math.max(0, (item.likeCount ?? 0) + (liked ? 1 : -1)) };
  }

  const saved = !item.viewerHasSaved;
  return { ...item, viewerHasSaved: saved, saveCount: Math.max(0, (item.saveCount ?? 0) + (saved ? 1 : -1)) };
}
