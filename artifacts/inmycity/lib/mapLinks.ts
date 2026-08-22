/**
 * URL builders for handing a destination off to a maps app.
 *
 * Deliberately free of React Native imports so the logic stays pure and testable; the
 * side-effectful wrappers live in `placeActions.ts`.
 *
 * Ordering matters in Mumbai: Google Maps is what people actually use for navigation and
 * what has usable local traffic and auto/train data, so it is tried first on both platforms
 * before falling back to the OS default.
 */

export type MapPlatform = "ios" | "android" | "web";

export type Destination = {
  lat: number;
  lng: number;
  /** Venue name, shown as the pin label where the target app supports one. */
  label?: string;
};

export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // 0,0 is in the Atlantic; in this dataset it means "coordinates missing".
    !(lat === 0 && lng === 0)
  );
}

/** Always-openable https link to directions. Used as the final fallback everywhere. */
export function googleMapsWebDirectionsUrl({ lat, lng }: Destination): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Candidate directions URLs in preference order. Callers try each until one opens, so the
 * list always ends with an https URL that cannot fail.
 */
export function directionsUrlCandidates(
  destination: Destination,
  platform: MapPlatform,
): string[] {
  const { lat, lng, label } = destination;
  const coords = `${lat},${lng}`;
  const web = googleMapsWebDirectionsUrl(destination);

  if (platform === "ios") {
    return [
      `comgooglemaps://?daddr=${coords}&directionsmode=driving`,
      web,
      // Apple Maps is guaranteed present on iOS, so this can never dead-end.
      `maps://?daddr=${coords}&dirflg=d`,
    ];
  }

  if (platform === "android") {
    return [
      `google.navigation:q=${coords}`,
      `geo:${coords}?q=${coords}${label ? `(${encodeURIComponent(label)})` : ""}`,
      web,
    ];
  }

  return [web];
}

/** Candidate URLs for viewing a location on a map, without starting navigation. */
export function showOnMapUrlCandidates(
  destination: Destination,
  platform: MapPlatform,
): string[] {
  const { lat, lng, label } = destination;
  const coords = `${lat},${lng}`;
  const web = `https://www.google.com/maps/search/?api=1&query=${coords}`;

  if (platform === "ios") {
    return [`comgooglemaps://?q=${coords}`, web, `maps://?ll=${coords}&q=${encodeURIComponent(label ?? "Location")}`];
  }
  if (platform === "android") {
    return [`geo:${coords}?q=${coords}${label ? `(${encodeURIComponent(label)})` : ""}`, web];
  }
  return [web];
}

/**
 * Normalises a user-facing phone number into a `tel:` URL.
 * Keeps a leading `+` and strips the spaces and dashes the seed data uses.
 */
export function telUrl(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  const normalized = digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\+/g, "")}`
    : digits;
  if (normalized.replace(/\D/g, "").length < 6) return null;
  return `tel:${normalized}`;
}

/** Ensures a stored website value is an absolute http(s) URL before it is opened. */
export function websiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
