/**
 * Shared parsing for the `limit`/`offset` pair every list endpoint accepts.
 *
 * The cap matters: without one, a single request can ask the database for the whole table,
 * which is exactly what these endpoints used to do internally.
 */

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 50;

export function parseLimit(value: unknown, fallback = DEFAULT_LIMIT): number {
  const parsed = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
}

export function parseOffset(value: unknown): number {
  const parsed = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}
