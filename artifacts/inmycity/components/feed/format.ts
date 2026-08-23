/**
 * The small amount of formatting a feed card needs.
 *
 * All of it is client-side on purpose. The server sends instants and bare numbers, never a
 * rendered phrase and never a currency symbol, so that one row can read correctly in every
 * city the app supports and in the reader's own locale.
 */

const MINUTE = 60_000;
const DAY = 86_400_000;

/** "12m ago". How old a story or a post is. */
export function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / MINUTE));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

/** "Today 7:00 pm" reads better than a date for anything in the next couple of days. */
export function whenLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = date.toDateString() === new Date().toDateString();
  const days = Math.round((date.getTime() - Date.now()) / DAY);

  if (sameDay) return `Today ${time}`;
  if (days <= 1) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

/** How long an offer has left — the reason offers are in the feed at all. */
export function endsLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.ceil((Date.parse(iso) - Date.now()) / DAY);
  if (days <= 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 14) return `${days} days left`;
  return null;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

/**
 * Whether a subtitle says anything its title has not.
 *
 * A deal is titled "Bade Miyan — Buy 2 Kebab Plates, Get 1 Free" and its subtitle is the shop
 * the title has already named. Drawing both puts the same words on the card twice and pushes
 * what is actually new further down.
 */
export function addsSomething(title: string, subtitle: string | null | undefined): boolean {
  if (!subtitle) return false;
  return !title.toLowerCase().includes(subtitle.toLowerCase());
}

/** The bare host of a link, for the source rail under a headline. */
export function hostOf(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
