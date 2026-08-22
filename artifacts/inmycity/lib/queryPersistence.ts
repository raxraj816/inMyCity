import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

/**
 * The query cache, written to disk so a cold start has something to show immediately.
 *
 * Mumbai is a city of local trains, basements and congested cells. Without persistence every
 * cold start on a bad connection was a blank screen, because the in-memory cache died with
 * the process and the first render had nothing to draw. With it, the app opens on the last
 * content it saw — stale, clearly marked when offline, but browsable — and quietly refreshes
 * behind that as soon as the network allows.
 */

/** How long persisted content may be shown before it is discarded rather than restored. */
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24;

/**
 * Bump when a cached response shape changes. Restoring a cache written by an older build
 * would render today's screens against yesterday's data shape.
 */
const CACHE_VERSION = "v1";

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      // Must outlive the persisted cache: a query garbage-collected in memory is dropped from
      // the persisted snapshot too, which would defeat the point of writing it to disk.
      gcTime: MAX_CACHE_AGE_MS,
      retry: 2,
      // The persisted copy is what the user sees first, so refetch when the app comes back to
      // the foreground or the network returns rather than leaving them on stale content.
      refetchOnReconnect: true,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: `@inmycity/query-cache/${CACHE_VERSION}`,
  // Writing on every cache change would hammer AsyncStorage while a list scrolls.
  throttleTime: 2000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: MAX_CACHE_AGE_MS,
  buster: CACHE_VERSION,
} as const;
