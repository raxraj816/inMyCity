import { MUMBAI_PLACE_NAMES } from "@workspace/city-config";

/**
 * Whether a story is about this city.
 *
 * Indian publishers mostly run one general feed, so a city source delivers national politics,
 * cricket, book reviews and three other states alongside the local news that was wanted. Left
 * unfiltered that is a forty-item review queue with five useful rows in it, which is a queue an
 * editor stops opening. Everything rejected here is simply not filed — it is not a takedown and
 * nothing is deleted, the item is just never created.
 *
 * Matching is on whole words, which matters more than it looks: several Mumbai localities are
 * short enough to appear inside unrelated words, and a substring match would file every story
 * containing "comfort" as a Fort story.
 */
const CITY_VOCABULARY: Record<string, string[]> = {
  mumbai: MUMBAI_PLACE_NAMES,
};

/** Below this, a name is too short to be distinctive even on a word boundary. */
const MIN_NAME_LENGTH = 4;

const ASCII_ONLY = /^[\x20-\x7E]+$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatchers(names: string[]): { patterns: RegExp[]; literals: string[] } {
  const patterns: RegExp[] = [];
  const literals: string[] = [];

  for (const name of names) {
    if (name.length < MIN_NAME_LENGTH) continue;
    if (ASCII_ONLY.test(name)) {
      // `\b` is ASCII-only in JavaScript, which is exactly why Devanagari goes the other route.
      patterns.push(new RegExp(`\\b${escapeRegExp(name)}\\b`, "i"));
    } else {
      literals.push(name);
    }
  }

  return { patterns, literals };
}

const MATCHERS = new Map<string, ReturnType<typeof buildMatchers>>();

function matchersFor(city: string) {
  const key = city.trim().toLowerCase();
  const existing = MATCHERS.get(key);
  if (existing) return existing;

  const names = CITY_VOCABULARY[key];
  if (!names) return null;

  const built = buildMatchers(names);
  MATCHERS.set(key, built);
  return built;
}

/**
 * True when the text names the city or somewhere in it.
 *
 * A city with no curated vocabulary returns true for everything: the alternative is silently
 * dropping every story for a city nobody has written place names for yet, which is a worse
 * failure than an unfiltered queue.
 */
export function mentionsCity(city: string, ...parts: (string | null | undefined)[]): boolean {
  const matchers = matchersFor(city);
  if (!matchers) return true;

  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;

  if (matchers.patterns.some((pattern) => pattern.test(text))) return true;
  return matchers.literals.some((literal) => text.includes(literal));
}
