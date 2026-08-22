/**
 * Canonical links for shareable content.
 *
 * A share with no link is a dead end for whoever receives it, so every share should carry a
 * URL that opens the app when installed and a web page when not.
 *
 * The public web origin is supplied by `EXPO_PUBLIC_WEB_BASE_URL`. Until that is set, share
 * sheets fall back to text only rather than emitting a link to a domain that does not
 * resolve — a broken link is worse than none.
 *
 * Inbound `inmycity://` links already work through the Expo Router scheme. Turning the https
 * links into Universal Links / App Links additionally needs, outside this codebase:
 *   - a domain serving `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
 *   - `ios.associatedDomains` and `android.intentFilters` in the Expo config
 * See docs/mumbai-launch-readiness.md, section 4 (0.5).
 */

export type ShareableKind =
  | "place"
  | "event"
  | "deal"
  | "hotel"
  | "activity"
  | "movie"
  | "itinerary"
  | "neighborhood";

/** Web origin for shareable links, or null when none is configured. */
export function webBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/**
 * Path for an entity, identical in the app router and on the web, so one string works for
 * both deep linking and the web fallback.
 */
export function entityPath(kind: ShareableKind, id: string | number): string {
  return `/${kind}/${id}`;
}

/** Shareable https URL, or null when no public web origin is configured yet. */
export function buildShareUrl(
  kind: ShareableKind,
  id: string | number | null | undefined,
): string | null {
  if (id === null || id === undefined || id === "") return null;

  const base = webBaseUrl();
  if (!base) return null;

  return `${base}${entityPath(kind, id)}`;
}

/**
 * Shareable URL for an in-app route such as `/itinerary/12` or `/neighborhood/bandra`.
 * Routes are identical on the web, so the same path serves both.
 */
export function shareUrlForRoute(route: string | null | undefined): string | null {
  if (!route) return null;

  const base = webBaseUrl();
  if (!base) return null;

  return `${base}${route.startsWith("/") ? route : `/${route}`}`;
}

/** Deep link into an installed app. Useful for QR codes and internal tooling. */
export function buildDeepLink(
  kind: ShareableKind,
  id: string | number,
): string {
  return `inmycity:/${entityPath(kind, id)}`;
}
