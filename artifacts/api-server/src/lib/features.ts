/**
 * Runtime switches for the user-generated side of Pulse.
 *
 * Decision 2 of the launch plan is that Pulse ships editorial on day one and opens to
 * submissions only once the moderation queue and the grievance process are actually staffed.
 * That is enforced here rather than left to a deploy: with `COMMUNITY_SUBMISSIONS_ENABLED`
 * unset, every submission route answers 503 and the app hides the compose affordances, so the
 * UI never offers something the operation cannot yet stand behind.
 */
export function submissionsEnabled(): boolean {
  return process.env.COMMUNITY_SUBMISSIONS_ENABLED === "true";
}

export type GrievanceContact = {
  officerName: string;
  email: string;
  address: string | null;
  /** Hours within which a complaint is acknowledged, published alongside the contact. */
  acknowledgementHours: number;
};

/**
 * The grievance officer the IT Rules require an intermediary to name and publish.
 *
 * Null when unset. The app then shows the report flow's fallback copy instead of inventing a
 * contact, and `submissionsEnabled` should not be turned on until this is configured.
 */
export function grievanceContact(): GrievanceContact | null {
  const officerName = process.env.GRIEVANCE_OFFICER_NAME?.trim();
  const email = process.env.GRIEVANCE_OFFICER_EMAIL?.trim();
  if (!officerName || !email) return null;

  return {
    officerName,
    email,
    address: process.env.GRIEVANCE_OFFICER_ADDRESS?.trim() || null,
    acknowledgementHours: Number(process.env.GRIEVANCE_ACK_HOURS ?? 24),
  };
}
