/**
 * Distance helpers shared by every list endpoint that can be sorted by proximity.
 *
 * `haversineKm` previously existed as separate copies in the places and deals routes; this is
 * the single implementation those and the newer endpoints use.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parsed `lat`/`lng`/`radius` query parameters, or nulls when the caller sent none. */
export type Origin = { lat: number; lng: number; radiusKm: number } | null;

const DEFAULT_RADIUS_KM = 10;

export function parseOrigin(query: Record<string, unknown>): Origin {
  const lat = query.lat !== undefined ? parseFloat(String(query.lat)) : NaN;
  const lng = query.lng !== undefined ? parseFloat(String(query.lng)) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const radius =
    query.radius !== undefined ? parseFloat(String(query.radius)) : NaN;

  return {
    lat,
    lng,
    radiusKm: Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_RADIUS_KM,
  };
}

/**
 * Adds `distanceKm` to each row, filters out anything beyond the radius, and sorts nearest
 * first. With no origin the rows pass through with `distanceKm: null` and their existing
 * order intact, so callers can apply this unconditionally.
 */
export function applyProximity<T extends { lat?: number | null; lng?: number | null }>(
  rows: T[],
  origin: Origin,
): (T & { distanceKm: number | null })[] {
  if (!origin) {
    return rows.map((row) => ({ ...row, distanceKm: null }));
  }

  return rows
    .map((row) => ({
      ...row,
      distanceKm:
        typeof row.lat === "number" && typeof row.lng === "number"
          ? haversineKm(origin.lat, origin.lng, row.lat, row.lng)
          : null,
    }))
    // Rows with no coordinates are dropped when the user asked for nearby results: we cannot
    // claim they are close, and showing them would undermine the filter.
    .filter((row) => row.distanceKm !== null && row.distanceKm <= origin.radiusKm)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
