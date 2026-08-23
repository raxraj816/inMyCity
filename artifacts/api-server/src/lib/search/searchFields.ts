import { buildSearchText, type SearchTextPart } from "./searchText";

/**
 * Fields that go into each table's `search_text`, in the order they are written.
 *
 * The name or title always comes first: the search route reads the first field back out to
 * tell "this row is called exactly that" apart from "the words appear somewhere in the blurb",
 * and the two rank very differently.
 *
 * This lives here rather than in the seed because the admin surface edits the same rows. A
 * name corrected through the admin API has to update `search_text` too, or the row stays
 * findable only under the name it used to have.
 */
export const SEARCH_TEXT_FIELDS = {
  places: ["name", "category", "address", "tags", "description"],
  events: ["title", "category", "venue", "address", "tags", "description"],
  deals: ["title", "placeName", "category", "discountText", "description"],
  hotels: ["name", "category", "address", "amenities", "tags", "description"],
  activities: ["name", "category", "address", "tags", "description"],
  movies: ["title", "genre", "language", "director", "cast", "venue", "tags", "synopsis"],
} as const satisfies Record<string, readonly string[]>;

export type SearchableKind = keyof typeof SEARCH_TEXT_FIELDS;

export function isSearchableKind(kind: string): kind is SearchableKind {
  return kind in SEARCH_TEXT_FIELDS;
}

/** The flattened, normalized text a single row is matched against. */
export function searchTextFor(kind: SearchableKind, row: Record<string, unknown>): string {
  const fields: readonly string[] = SEARCH_TEXT_FIELDS[kind];
  return buildSearchText(fields.map((field) => row[field] as SearchTextPart));
}

/** Adds the flattened, normalized text every search matches against. */
export function withSearchText<T extends Record<string, unknown>>(
  kind: SearchableKind,
  rows: T[],
): (T & { searchText: string })[] {
  return rows.map((row) => ({ ...row, searchText: searchTextFor(kind, row) }));
}
