import type { CorsOptions } from "cors";
import helmet from "helmet";

/**
 * CORS origin allowlist.
 *
 * The previous configuration was `origin: true`, which reflects whatever Origin the caller
 * sends while `credentials: true` is set — any website could make authenticated requests
 * against a signed-in user's session.
 *
 * Native builds of the Expo app send no Origin header at all, so a missing origin must stay
 * allowed; the browser is the only client the allowlist can meaningfully constrain.
 */

const DEV_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/[a-z0-9-]+\.exp\.direct(:\d+)?$/,
  /^https?:\/\/[a-z0-9-]+\.ngrok(-free)?\.(io|app|dev)$/,
];

function configuredOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // Native apps, server-to-server calls and same-origin requests send no Origin.
  if (!origin) return true;

  if (configuredOrigins().includes(origin)) return true;

  if (process.env.NODE_ENV !== "production") {
    return DEV_ORIGINS.some((pattern) => pattern.test(origin));
  }

  return false;
}

/** Marker for a blocked cross-origin request, so it can be answered with 403 not 500. */
export class CorsError extends Error {
  readonly status = 403;

  constructor(origin: string) {
    super(`Origin not allowed: ${origin}`);
    this.name = "CorsError";
  }
}

export function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new CorsError(origin ?? "unknown"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

/**
 * Security headers, via helmet.
 *
 * `contentSecurityPolicy` is disabled: this process serves JSON only, so a CSP governs
 * nothing here, and helmet's default policy would need revisiting the moment any HTML is
 * served. Everything else — nosniff, frameguard, referrer policy, HSTS in production,
 * cross-origin policies — is left on.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  // Helmet defaults to SAMEORIGIN; nothing here is ever meant to be framed.
  frameguard: { action: "deny" },
  // Only advertise HSTS over real HTTPS. Emitting it in development risks a browser pinning
  // https for localhost, which then breaks every other local project on that port.
  hsts:
    process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
});
