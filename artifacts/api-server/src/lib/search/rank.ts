/**
 * The blend that decides result order.
 *
 * Text relevance dominates — a user who typed "trishna" wants Trishna first wherever it is —
 * but among comparably relevant rows, closer, better-rated and currently-open wins. Unknown
 * values score neutral rather than zero: a venue with no rating should not be punished below
 * one that is genuinely rated badly.
 */

const WEIGHTS = {
  relevance: 0.6,
  rating: 0.15,
  distance: 0.15,
  openNow: 0.1,
} as const;

/** Beyond this, extra distance no longer changes the score — everything far is equally far. */
const DISTANCE_HORIZON_KM = 12;

const NEUTRAL = 0.5;

export type RankInputs = {
  /** 0–1 text relevance, as computed by the database. */
  relevance: number;
  rating: number | null | undefined;
  distanceKm: number | null | undefined;
  isOpen: boolean | null | undefined;
};

export function ratingScore(rating: number | null | undefined): number {
  if (rating === null || rating === undefined) return NEUTRAL;
  return Math.min(Math.max(rating / 5, 0), 1);
}

export function distanceScore(distanceKm: number | null | undefined): number {
  if (distanceKm === null || distanceKm === undefined) return NEUTRAL;
  if (distanceKm <= 0) return 1;
  return Math.max(0, 1 - Math.min(distanceKm, DISTANCE_HORIZON_KM) / DISTANCE_HORIZON_KM);
}

export function openNowScore(isOpen: boolean | null | undefined): number {
  if (isOpen === null || isOpen === undefined) return NEUTRAL;
  return isOpen ? 1 : 0;
}

export function scoreResult(inputs: RankInputs): number {
  const score =
    WEIGHTS.relevance * Math.min(Math.max(inputs.relevance, 0), 1) +
    WEIGHTS.rating * ratingScore(inputs.rating) +
    WEIGHTS.distance * distanceScore(inputs.distanceKm) +
    WEIGHTS.openNow * openNowScore(inputs.isOpen);

  // Rounded so ties order deterministically rather than on floating-point noise.
  return Math.round(score * 1e6) / 1e6;
}
