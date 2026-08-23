import type { Request } from "express";

/**
 * Who a like, save, join or upvote belongs to.
 *
 * Decision 4 of the launch plan is that saving must work before sign-in, so these actions
 * cannot key on a user id alone. A signed-in reader is keyed by their user id; everyone else
 * is keyed by the device identifier the app sends, namespaced so the two can never collide.
 * When an anonymous reader signs in, `reconcileActorKey` rewrites their rows to the user key.
 */

export const DEVICE_ID_HEADER = "x-device-id";

const MAX_DEVICE_ID_LENGTH = 64;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function anonymousActorKey(deviceId: string): string {
  return `anon:${deviceId}`;
}

/** The device id the app sends, or null when it is missing or malformed. */
export function deviceIdFrom(req: Request): string | null {
  const raw = req.headers[DEVICE_ID_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_DEVICE_ID_LENGTH);
  return DEVICE_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * The actor key for this request, or null when the caller is neither signed in nor
 * identifiable — in which case the write cannot be attributed and should be rejected.
 */
export function actorKeyFrom(req: Request): string | null {
  if (req.isAuthenticated() && req.user?.id) return req.user.id;
  const deviceId = deviceIdFrom(req);
  return deviceId ? anonymousActorKey(deviceId) : null;
}

/** The display name to attach to a submission. */
export function actorDisplayName(req: Request, fallback = "Someone in the city"): string {
  if (!req.isAuthenticated() || !req.user) return fallback;
  const { firstName, lastName, email } = req.user as {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (email) return email.split("@")[0];
  return fallback;
}
