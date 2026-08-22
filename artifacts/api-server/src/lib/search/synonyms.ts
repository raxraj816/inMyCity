import { searchSynonymsForCity, type SearchSynonymGroup } from "@workspace/city-config";
import { normalizeSearchText, toSearchWords } from "./normalize";

/**
 * Query expansion against a city's curated vocabulary.
 *
 * A query is rewritten into every equivalent spelling before it reaches the database, so
 * "vadapav", "vada paav" and "वडा पाव" all end up asking for the same thing. Expansion is
 * one-sided on purpose: content is stored as authored, and only the query is widened. That
 * keeps the stored text honest and means a vocabulary change takes effect without a reseed.
 */

/** Enough alternatives to cover real spellings without turning one query into a huge OR. */
const MAX_PHRASES = 16;

export type ExpandedQuery = {
  /** Exactly what the user typed. */
  raw: string;
  /** The query after normalization — the phrase to rank exact matches against. */
  normalized: string;
  /** Normalized phrases to match, the user's own wording first. */
  phrases: string[];
  /** Individual meaningful words, all of which a row should contain to count as a match. */
  words: string[];
};

type NormalizedGroup = { terms: string[] };

const groupCache = new Map<string, NormalizedGroup[]>();

function normalizeGroups(groups: SearchSynonymGroup[]): NormalizedGroup[] {
  return groups.map((group) => ({
    terms: Array.from(
      new Set(
        [group.canonical, ...group.aliases]
          .map(normalizeSearchText)
          .filter((term) => term.length > 0),
      ),
    ),
  }));
}

function groupsForCity(cityId: string): NormalizedGroup[] {
  const key = cityId.toLowerCase();
  let cached = groupCache.get(key);
  if (!cached) {
    cached = normalizeGroups(searchSynonymsForCity(key));
    groupCache.set(key, cached);
  }
  return cached;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches a term only as whole words, so "bar" never fires inside "bandra". */
function phraseMatcher(term: string): RegExp {
  return new RegExp(`(?:^| )${escapeRegExp(term)}(?= |$)`, "g");
}

export function expandSearchQuery(raw: string, cityId = "mumbai"): ExpandedQuery {
  const normalized = normalizeSearchText(raw);
  const phrases = [normalized];

  if (normalized) {
    const seen = new Set(phrases);

    for (const group of groupsForCity(cityId)) {
      const present = group.terms.filter((term) => phraseMatcher(term).test(normalized));
      if (present.length === 0) continue;

      for (const found of present) {
        for (const replacement of group.terms) {
          if (replacement === found) continue;
          const variant = normalized
            .replace(phraseMatcher(found), (match) => match.replace(found, replacement))
            .trim();
          if (variant && !seen.has(variant)) {
            seen.add(variant);
            phrases.push(variant);
          }
          if (phrases.length >= MAX_PHRASES) break;
        }
        if (phrases.length >= MAX_PHRASES) break;
      }
      if (phrases.length >= MAX_PHRASES) break;
    }
  }

  return {
    raw,
    normalized,
    phrases: phrases.filter((phrase) => phrase.length > 0),
    words: toSearchWords(normalized),
  };
}
