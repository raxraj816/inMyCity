import type { NextFunction, Request, Response } from "express";

/**
 * Who may use the admin surface.
 *
 * The allowlist is an environment variable rather than a database column on purpose: the
 * people who can edit every content row and take posts down are an operational decision, and
 * an attacker who reaches the database should not be able to grant it to themselves.
 *
 * `ADMIN_EMAILS` is a comma-separated list. With it unset, the admin routes answer 503 rather
 * than opening up — a missing configuration must never mean "everyone".
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** The signed-in admin's email, for the moderation trail. Only valid after `requireAdmin`. */
export function adminEmailFor(req: Request): string {
  return req.user?.email?.toLowerCase() ?? "unknown";
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (adminEmails().length === 0) {
    req.log.error("Admin route reached with ADMIN_EMAILS unset");
    res.status(503).json({ error: "Admin access is not configured on this server." });
    return;
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to use the admin surface." });
    return;
  }

  if (!isAdminEmail(req.user?.email)) {
    req.log.warn({ email: req.user?.email }, "Non-admin attempted an admin route");
    res.status(403).json({ error: "This account does not have admin access." });
    return;
  }

  next();
}
