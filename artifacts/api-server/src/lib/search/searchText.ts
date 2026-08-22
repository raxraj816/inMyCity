import { normalizeSearchText } from "./normalize";

/**
 * Builds the `search_text` blob stored on every searchable row.
 *
 * Two details of the format carry weight:
 *
 * Fields are joined with a separator no query can contain, so a phrase can never match by
 * straddling two of them — "west pav" must not find a place on "Linking Road, Bandra West"
 * that serves "pav bhaji" only because the fields sit next to each other.
 *
 * The whole string is padded with a leading and trailing space, which lets search match whole
 * words with a plain `LIKE '% word %'`. Without the padding, a word at either end would need
 * a concatenation to match, and concatenating the column defeats its index — the difference
 * between an index lookup and a scan of the table.
 */
const FIELD_SEPARATOR = " ~ ";

export type SearchTextPart = string | number | null | undefined | (string | null | undefined)[];

export function buildSearchText(parts: SearchTextPart[]): string {
  const fields: string[] = [];

  for (const part of parts) {
    if (part === null || part === undefined) continue;

    if (Array.isArray(part)) {
      for (const entry of part) {
        const normalized = normalizeSearchText(entry);
        if (normalized) fields.push(normalized);
      }
      continue;
    }

    const normalized = normalizeSearchText(String(part));
    if (normalized) fields.push(normalized);
  }

  if (fields.length === 0) return "";
  return ` ${fields.join(FIELD_SEPARATOR)} `;
}
