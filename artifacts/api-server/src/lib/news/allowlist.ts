/**
 * The Mumbai news allowlist.
 *
 * Ingestion only ever fetches a source that exists as a row in `news_sources`, and only ever
 * from a host listed here. Everything it produces lands as a `pending` item that an editor has
 * to publish, so a compromised or hijacked feed cannot put text in front of a reader on its own.
 *
 * `feedUrl` is deliberately left unset on every row and every source ships `isActive: false`.
 * A feed URL is an operational fact that has to be checked against the publisher — quite a few
 * Indian outlets moved or retired their RSS endpoints — and guessing one and shipping it
 * enabled is how an ingestion pipeline starts quietly importing the wrong city. Fill each one
 * in through the admin surface, or set `NEWS_FEED_<SLUG>_URL` in the environment, then flip
 * `isActive`. `CANDIDATE_FEED_URLS` below records the endpoints to check first.
 */

export type NewsSourceSeed = {
  slug: string;
  name: string;
  kind: "publisher" | "government" | "traffic" | "weather" | "sports" | "business";
  city: string;
  homepageUrl: string;
  /** Hosts this source may be fetched from. A feed URL outside the list is refused. */
  allowedHosts: string[];
  trustLabel: "verified" | "editorial";
  defaultConfidence: "high" | "medium";
  defaultCategory: "local" | "traffic" | "weather" | "civic" | "sports" | "business" | "transit";
};

export const MUMBAI_NEWS_SOURCES: NewsSourceSeed[] = [
  {
    slug: "imd-mumbai",
    name: "IMD Mumbai",
    kind: "weather",
    city: "Mumbai",
    homepageUrl: "https://mausam.imd.gov.in/",
    allowedHosts: ["mausam.imd.gov.in", "internal.imd.gov.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "weather",
  },
  {
    slug: "bmc",
    name: "BMC",
    kind: "government",
    city: "Mumbai",
    homepageUrl: "https://portal.mcgm.gov.in/",
    allowedHosts: ["portal.mcgm.gov.in", "www.mcgm.gov.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "civic",
  },
  {
    slug: "best-undertaking",
    name: "BEST",
    kind: "government",
    city: "Mumbai",
    homepageUrl: "https://www.bestundertaking.com/",
    allowedHosts: ["www.bestundertaking.com", "bestundertaking.com"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "transit",
  },
  {
    slug: "mumbai-metro",
    name: "Mumbai Metro",
    kind: "government",
    city: "Mumbai",
    homepageUrl: "https://www.mmrda.maharashtra.gov.in/",
    allowedHosts: ["www.mmrda.maharashtra.gov.in", "mmrc.co.in", "www.mmrc.co.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "transit",
  },
  {
    slug: "western-railway",
    name: "Western Railway",
    kind: "government",
    city: "Mumbai",
    homepageUrl: "https://wr.indianrailways.gov.in/",
    allowedHosts: ["wr.indianrailways.gov.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "transit",
  },
  {
    slug: "central-railway",
    name: "Central Railway",
    kind: "government",
    city: "Mumbai",
    homepageUrl: "https://cr.indianrailways.gov.in/",
    allowedHosts: ["cr.indianrailways.gov.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "transit",
  },
  {
    slug: "mumbai-traffic-police",
    name: "Mumbai Traffic Police",
    kind: "traffic",
    city: "Mumbai",
    homepageUrl: "https://trafficpolicemumbai.maharashtra.gov.in/",
    allowedHosts: ["trafficpolicemumbai.maharashtra.gov.in"],
    trustLabel: "verified",
    defaultConfidence: "high",
    defaultCategory: "traffic",
  },
  {
    slug: "hindustan-times-mumbai",
    name: "Hindustan Times Mumbai",
    kind: "publisher",
    city: "Mumbai",
    homepageUrl: "https://www.hindustantimes.com/cities/mumbai-news",
    allowedHosts: ["www.hindustantimes.com", "hindustantimes.com"],
    trustLabel: "editorial",
    defaultConfidence: "medium",
    defaultCategory: "local",
  },
  {
    slug: "mid-day",
    name: "Mid-Day",
    kind: "publisher",
    city: "Mumbai",
    homepageUrl: "https://www.mid-day.com/mumbai",
    allowedHosts: ["www.mid-day.com", "mid-day.com"],
    trustLabel: "editorial",
    defaultConfidence: "medium",
    defaultCategory: "local",
  },
  {
    slug: "free-press-journal",
    name: "The Free Press Journal",
    kind: "publisher",
    city: "Mumbai",
    homepageUrl: "https://www.freepressjournal.in/mumbai",
    allowedHosts: ["www.freepressjournal.in", "freepressjournal.in"],
    trustLabel: "editorial",
    defaultConfidence: "medium",
    defaultCategory: "local",
  },
];

/**
 * Endpoints worth checking first when enabling a source. These are candidates, not verified
 * facts — confirm each one returns the right city's items before switching a source on.
 */
export const CANDIDATE_FEED_URLS: Record<string, string> = {
  "hindustan-times-mumbai": "https://www.hindustantimes.com/feeds/rss/cities/mumbai-news/rssfeed.xml",
  "mid-day": "https://www.mid-day.com/rss/mumbai",
  "free-press-journal": "https://www.freepressjournal.in/stories.rss",
};

const BY_SLUG = new Map(MUMBAI_NEWS_SOURCES.map((source) => [source.slug, source]));

export function newsSourceSeed(slug: string): NewsSourceSeed | undefined {
  return BY_SLUG.get(slug);
}

/** Reads a per-source feed override, so a deployment can point at a mirror without a deploy. */
export function feedUrlOverride(slug: string): string | undefined {
  const key = `NEWS_FEED_${slug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}_URL`;
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * Guards the fetch. A feed URL must be https and must live on a host the source declares —
 * without this, anyone who can edit a source row can point the server at an internal address.
 */
export function isAllowedFeedUrl(slug: string, url: string): boolean {
  const seed = BY_SLUG.get(slug);
  if (!seed) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return seed.allowedHosts.includes(parsed.hostname.toLowerCase());
}
