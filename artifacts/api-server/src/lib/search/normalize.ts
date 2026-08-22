/**
 * Turning what a user typed into something comparable with stored content.
 *
 * Everything searchable is stored already normalized, and every query goes through the same
 * function, so matching never has to care about case, accents, punctuation or script. Queries
 * arriving in Devanagari are transliterated to Latin first — "सीएसटी" and "CST" have to reach
 * the same rows, and the content is authored in Latin.
 */

/** Consonants carry an inherent "a" unless a matra or virama follows. */
const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "ळ": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f",
};

/** Independent vowels, which stand on their own rather than modifying a consonant. */
const VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o", "ॲ": "a",
};

/** Matras replace the inherent "a" of the consonant they attach to. */
const MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "a",
};

const DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

const VIRAMA = "्";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const VISARGA = "ः";
const NUKTA = "़";

const DEVANAGARI = /[\u0900-\u097F]/;

export function hasDevanagari(input: string): boolean {
  return DEVANAGARI.test(input);
}

/**
 * Approximate Devanagari → Latin transliteration.
 *
 * Deliberately approximate: it only has to land close enough for trigram matching, and the
 * spellings that matter most ("सीएसटी", "वडा पाव") are also listed as explicit aliases in the
 * city's search vocabulary, which is applied on top of this.
 */
export function transliterateDevanagari(input: string): string {
  if (!hasDevanagari(input)) return input;

  let out = "";

  for (let i = 0; i < input.length; i++) {
    let char = input[i];

    // A nukta modifies the preceding consonant; consume it so the pair maps as one letter.
    if (input[i + 1] === NUKTA && CONSONANTS[char + NUKTA]) {
      char = char + NUKTA;
      i++;
    }

    const consonant = CONSONANTS[char];
    if (consonant) {
      const next = input[i + 1];
      if (next === VIRAMA) {
        out += consonant;
        i++;
      } else if (next !== undefined && MATRAS[next] !== undefined) {
        out += consonant + MATRAS[next];
        i++;
      } else {
        out += consonant + "a";
      }
      continue;
    }

    if (VOWELS[char] !== undefined) {
      out += VOWELS[char];
      continue;
    }
    if (DIGITS[char] !== undefined) {
      out += DIGITS[char];
      continue;
    }
    if (char === ANUSVARA || char === CHANDRABINDU) {
      out += "n";
      continue;
    }
    if (char === VISARGA) {
      out += "h";
      continue;
    }
    if (MATRAS[char] !== undefined || char === VIRAMA || char === NUKTA) {
      // A stray matra, virama or nukta with no consonant to attach to: nothing to render.
      continue;
    }

    out += char;
  }

  return out;
}

/**
 * The one normalization every query and every stored `search_text` passes through:
 * lowercase, Latin script, no accents, no punctuation, single spaces.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";

  return transliterateDevanagari(input)
    .toLowerCase()
    .normalize("NFKD")
    // Combining marks left over from decomposing accented Latin letters.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Words too common to narrow anything down, or that describe the filter rather than the thing. */
const STOP_WORDS = new Set([
  "a", "an", "the", "of", "and", "or", "in", "on", "at", "to", "for", "with",
  "near", "nearby", "around", "me", "my", "is", "are", "some", "any",
]);

/** The words of a query that are worth requiring a match on. */
export function toSearchWords(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}
