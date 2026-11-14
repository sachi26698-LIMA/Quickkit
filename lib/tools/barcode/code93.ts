/**
 * Code 93 (AIM USS Code 93 / ISO/IEC 15417's sibling for 93).
 *
 * Code 93 is a continuous, self-checking symbology: every character is nine
 * modules wide with three bars and three spaces, and the symbol carries two
 * mod-47 check characters (C and K) plus a termination bar. It is denser than
 * Code 39 and is common on logistics, library and automotive labels.
 *
 * The nine-bit patterns below are the published tables, cross-checked against
 * ZXing's Apache-2.0 reference implementation (`Code93Reader.CHARACTER_ENCODINGS`)
 * and verified in `tests/barcode-code93.test.ts` by decoding our own output with
 * an independent reader.
 *
 * The four "shift" characters (`a`, `b`, `c`, `d`) are not printable data: they
 * introduce the extended-ASCII pairs defined by the specification, which is how
 * this encoder can carry lowercase and punctuation without lying about the
 * character set.
 */

/** Data characters, then the four shift characters, then start/stop. */
export const CODE93_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%abcd*";

/** Nine-module patterns, most-significant bit first (1 = bar). */
export const CODE93_ENCODINGS = [
  0x114,
  0x148,
  0x144,
  0x142,
  0x128,
  0x124,
  0x122,
  0x150,
  0x112,
  0x10a, // 0-9
  0x1a8,
  0x1a4,
  0x1a2,
  0x194,
  0x192,
  0x18a,
  0x168,
  0x164,
  0x162,
  0x134, // A-J
  0x11a,
  0x158,
  0x14c,
  0x146,
  0x12c,
  0x116,
  0x1b4,
  0x1b2,
  0x1ac,
  0x1a6, // K-T
  0x196,
  0x19a,
  0x16c,
  0x166,
  0x136,
  0x13a, // U-Z
  0x12e,
  0x1d4,
  0x1d2,
  0x1ca,
  0x16e,
  0x176,
  0x1ae, // - . space $ / + %
  0x126,
  0x1da,
  0x1d6,
  0x132,
  0x15e, // shift a b c d, start/stop *
] as const;

/** Index of the start/stop character in the alphabet. */
export const CODE93_START_STOP = 47;

/** Characters the encoder accepts before extension (printable ASCII). */
export function isCode93Input(value: string) {
  return /^[\x20-\x7e]+$/.test(value);
}

/**
 * Convert printable ASCII to the Code 93 basic character set, using the four
 * shift characters exactly as the specification defines them.
 */
export function code93Extend(value: string) {
  let out = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code > 126)
      throw new Error("Code 93 accepts printable ASCII only.");

    // Characters that exist in the Code 93 basic set verbatim.
    if (
      character === " " ||
      character === "$" ||
      character === "%" ||
      character === "+" ||
      (code >= 45 && code <= 57) || // - . / 0-9
      (code >= 65 && code <= 90) // A-Z
    ) {
      out += character;
      continue;
    }

    // Shift pairs, exactly as the specification defines them.
    if (code >= 33 && code <= 44) {
      out += `c${String.fromCharCode(65 + code - 33)}`; // ! to , -> cA..cL
      continue;
    }
    if (code === 58) {
      out += "cZ"; // : -> cZ
      continue;
    }
    if (code >= 59 && code <= 63) {
      out += `b${String.fromCharCode(70 + code - 59)}`; // ; to ? -> bF..bJ
      continue;
    }
    if (code === 64) {
      out += "bV"; // @
      continue;
    }
    if (code >= 91 && code <= 95) {
      out += `b${String.fromCharCode(75 + code - 91)}`; // [ to _ -> bK..bO
      continue;
    }
    if (code === 96) {
      out += "bW"; // `
      continue;
    }
    if (code >= 97 && code <= 122) {
      out += `d${character.toUpperCase()}`; // a to z -> dA..dZ
      continue;
    }
    if (code >= 123 && code <= 126) {
      out += `b${String.fromCharCode(80 + code - 123)}`; // { to ~ -> bP..bS
      continue;
    }
    throw new Error(`"${character}" cannot be encoded in Code 93.`);
  }
  return out;
}

/** Mod-47 check character over `characters`, weights cycling 1…maxWeight. */
export function code93Checksum(characters: string, maxWeight: number) {
  let weight = 1;
  let total = 0;
  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const value = CODE93_ALPHABET.indexOf(characters[index]);
    if (value < 0)
      throw new Error("Code 93 checksum met an unknown character.");
    total += value * weight;
    weight += 1;
    if (weight > maxWeight) weight = 1;
  }
  return total % 47;
}

function patternFor(index: number) {
  const pattern = CODE93_ENCODINGS[index];
  return pattern.toString(2).padStart(9, "0");
}

export type Code93Binary = {
  /** Module string: 1 = bar, 0 = space. */
  binary: string;
  /** Extended character string that was encoded (shifts included). */
  extended: string;
  /** Check characters C and K, as readable characters. */
  checks: { c: string; k: string };
  /** Modules of the symbol, including the termination bar. */
  modules: number;
};

/**
 * Build the module pattern for `value`.
 *
 * Layout: start * · data · check C · check K · stop * · termination bar.
 */
export function code93Binary(value: string): Code93Binary {
  const extended = code93Extend(value);
  if (extended.length === 0)
    throw new Error("Code 93 needs at least one character.");
  if (extended.length > 80)
    throw new Error("Code 93 allows at most 80 characters after extension.");

  const start = patternFor(CODE93_START_STOP);
  let binary = start;
  for (const character of extended) {
    const index = CODE93_ALPHABET.indexOf(character);
    if (index < 0) throw new Error(`Unknown Code 93 character "${character}".`);
    binary += patternFor(index);
  }

  const cIndex = code93Checksum(extended, 20);
  const c = CODE93_ALPHABET[cIndex];
  binary += patternFor(cIndex);

  const kIndex = code93Checksum(`${extended}${c}`, 15);
  const k = CODE93_ALPHABET[kIndex];
  binary += patternFor(kIndex);

  binary += patternFor(CODE93_START_STOP);
  binary += "1"; // termination bar

  return {
    binary,
    extended,
    checks: { c, k },
    modules: binary.length,
  };
}
