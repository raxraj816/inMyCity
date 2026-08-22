import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

/**
 * Request budgets.
 *
 * `POST /api/ai/chat` was previously unauthenticated and unmetered — an open, uncapped path
 * to the project's OpenAI spend — so it gets a much tighter allowance than the rest of the API.
 *
 * Counters live in the default in-process store, which is correct for a single instance but
 * means each replica enforces its own budget once the API is scaled out. Swap in a shared
 * store (`rate-limit-redis`) at that point; the limiter definitions below do not change.
 */

/**
 * Identifies the caller: a signed-in session first, so several people behind one mobile
 * carrier NAT are not throttled as a single client, and the IP otherwise.
 *
 * `ipKeyGenerator` is used rather than raw `req.ip` because it normalises IPv6 into a /56
 * subnet — without it, a client can trivially rotate through addresses in its own prefix.
 */
function clientKey(req: Request): string {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return `token:${authHeader.slice(7, 39)}`;
  }

  const sid = req.cookies?.sid;
  if (typeof sid === "string" && sid) return `sid:${sid.slice(0, 32)}`;

  return ipKeyGenerator(req.ip ?? "");
}

const shared = {
  keyGenerator: clientKey,
  // RateLimit-* headers; the legacy X-RateLimit-* set is redundant.
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
};

/**
 * Broad ceiling so a runaway client cannot saturate the API. Generous enough that normal
 * browsing — which fans out to several list endpoints per screen — never reaches it.
 */
export const apiRateLimit = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 300),
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/** Burst protection for CityPilot, which costs real money per call. */
export const aiPerMinuteRateLimit = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 10),
  message: {
    error: "You're sending messages very quickly. Give CityPilot a moment to catch up.",
  },
});

/** Daily spend ceiling per client. */
export const aiPerDayRateLimit = rateLimit({
  ...shared,
  windowMs: 24 * 60 * 60 * 1000,
  limit: Number(process.env.AI_RATE_LIMIT_PER_DAY ?? 200),
  message: {
    error: "You've reached today's CityPilot limit. It resets in a few hours.",
  },
});
