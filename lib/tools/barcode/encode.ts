/**
 * The encoders.
 *
 * Each symbology is reduced to the same primitive: a run of modules. Bars are
 * emitted as `{ x, width }` in module units, so the renderer never guesses
 * where a bar starts, and the PNG, SVG, PDF and verify paths all draw the exact
 * same geometry.
 *
 * Pattern tables are the published symbology tables (ISO/IEC 15417 for
 * Code 128, ISO/IEC 16388 for Code 39, GS1 General Specifications for
 * EAN/UPC and ITF-14, AIM USS Codabar, and the Laetus Pharmacode definition).
 */
import type {
  BarcodeBar,
  BarcodeEncodeOptions,
  BarcodeFormatId,
  BarcodePrepareResult,
  BarcodeSpec,
  BarcodeTextSegment,
} from "./types";
import { normalizeBarcode, type NormalizedBarcode } from "./validate";
import {
  EAN13_PARITY,
  EAN_CENTRE_GUARD,
  EAN_G,
  EAN_L,
  EAN_R,
  EAN_SIDE_GUARD,
  UPCE_PARITY,
} from "./ean-tables";

// Re-exported: the tables are part of the public shape of the encoder for the
// reference table and the tests.
export { EAN13_PARITY, UPCE_PARITY };

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Parse a bar/space module string ("101100…") into bar rectangles. */
export function barsFromBinary(binary: string): BarcodeBar[] {
  const bars: BarcodeBar[] = [];
  let index = 0;
  while (index < binary.length) {
    if (binary[index] !== "1") {
      index += 1;
      continue;
    }
    const start = index;
    while (index < binary.length && binary[index] === "1") index += 1;
    bars.push({ x: start, width: index - start });
  }
  return bars;
}

/** Total module width of a bar/space string. */
function binaryWidth(binary: string) {
  return binary.length;
}

/**
 * Build a bar/space string from alternating element widths (bar first).
 * A wider "module" is expressed by repeating the same character.
 */
export function binaryFromWidths(widths: number[]) {
  return widths
    .map((width, index) =>
      (index % 2 === 0 ? "1" : "0").repeat(Math.max(1, Math.round(width))),
    )
    .join("");
}

function assemble(options: {
  format: BarcodeFormatId;
  value: string;
  display: string;
  binary: string;
  segments: BarcodeTextSegment[];
  quiet: { left: number; right: number };
  notes: string[];
  guards?: BarcodeBar[];
}): BarcodeSpec {
  return {
    format: options.format,
    value: options.value,
    display: options.display,
    modules: binaryWidth(options.binary),
    bars: barsFromBinary(options.binary),
    guards: options.guards ?? [],
    segments: options.segments,
    quiet: options.quiet,
    notes: options.notes,
  };
}

/* -------------------------------------------------------------------------- */
/* Code 128 (ISO/IEC 15417)                                                   */
/* -------------------------------------------------------------------------- */

/** Values 0–106: 11 modules each, and the 13-module stop pattern at 106. */
const CODE128_PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
];

export const CODE128_START_B = 104;
export const CODE128_START_C = 105;
export const CODE128_FNC1 = 102;
export const CODE128_STOP = 106;

type C128Token = { kind: "char"; char: string } | { kind: "fnc1" };

/**
 * Choose Code Set B/C symbols for a payload.
 *
 * Set C halves the width of digit runs (two digits per symbol), so it is used
 * for runs of six or more digits — where the switch symbols pay for
 * themselves — but never for short numbers, where switching would widen the
 * symbol. GS1-128 stays in Set B so an FNC1 separator can never land on an odd
 * digit boundary.
 */
export function code128Values(data: string, gs1 = false): number[] {
  const items: C128Token[] = [...data].map((char) =>
    char === "\u001d" ? { kind: "fnc1" } : { kind: "char", char },
  );
  const isDigit = (token?: C128Token) =>
    token?.kind === "char" && token.char >= "0" && token.char <= "9";
  const digitRun = (from: number) => {
    let count = 0;
    while (isDigit(items[from + count])) count += 1;
    return count;
  };

  const values: number[] = [];
  let set: "B" | "C" = "B";
  let index = 0;

  if (gs1) {
    values.push(CODE128_START_B, CODE128_FNC1);
  } else {
    const allDigits = items.length > 0 && items.every(isDigit);
    const startInC = allDigits && items.length >= 4 && items.length % 2 === 0;
    values.push(startInC ? CODE128_START_C : CODE128_START_B);
    if (startInC) set = "C";
  }

  let guard = 0;
  while (index < items.length) {
    guard += 1;
    if (guard > items.length * 4 + 16)
      throw new Error(
        "Code 128 encoder did not converge — please report this payload.",
      );
    if (set === "C") {
      const token = items[index];
      if (token.kind === "fnc1") {
        values.push(CODE128_FNC1);
        index += 1;
        continue;
      }
      if (isDigit(token) && isDigit(items[index + 1])) {
        values.push(
          Number(token.char + (items[index + 1] as { char: string }).char),
        );
        index += 2;
        continue;
      }
      values.push(100); // CODE B
      set = "B";
      continue;
    }
    if (gs1) {
      const token = items[index];
      values.push(
        token.kind === "fnc1" ? CODE128_FNC1 : token.char.charCodeAt(0) - 32,
      );
      index += 1;
      continue;
    }
    const run = digitRun(index);
    if (run >= 6 || (index === 0 && run >= 4 && run % 2 === 0)) {
      if (run % 2 === 1) {
        values.push((items[index] as { char: string }).char.charCodeAt(0) - 32);
        index += 1;
        continue;
      }
      values.push(99); // CODE C
      set = "C";
      continue;
    }
    values.push((items[index] as { char: string }).char.charCodeAt(0) - 32);
    index += 1;
  }

  const checksum =
    values.reduce(
      (sum, value, position) => sum + value * Math.max(1, position),
      0,
    ) % 103;
  values.push(checksum, CODE128_STOP);
  return values;
}

export function code128Binary(data: string, gs1 = false) {
  return code128Values(data, gs1)
    .map((value) => CODE128_PATTERNS[value])
    .join("");
}

function encodeCode128(normalized: NormalizedBarcode): BarcodeSpec {
  const gs1 = Boolean(normalized.gs1);
  const binary = code128Binary(
    gs1 ? normalized.gs1!.encoded : normalized.value,
    gs1,
  );
  const modules = binary.length;
  const segments: BarcodeTextSegment[] = [
    { text: normalized.display, center: modules / 2 },
  ];
  return assemble({
    format: gs1 ? "gs1-128" : "code128",
    value: normalized.value,
    display: normalized.display,
    binary,
    segments,
    quiet: { left: 10, right: 10 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* Code 39 (ISO/IEC 16388)                                                    */
/* -------------------------------------------------------------------------- */

/** Nine elements per character: n = narrow (1 module), w = wide (3 modules). */
const CODE39_ELEMENTS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

const CODE39_WIDE = 3;

export function code39Binary(value: string) {
  const chars = `*${value}*`;
  let binary = "";
  chars.split("").forEach((char, charIndex) => {
    const pattern = CODE39_ELEMENTS[char];
    if (!pattern) throw new Error(`Code 39 cannot encode "${char}".`);
    for (let index = 0; index < pattern.length; index += 1) {
      const bit = index % 2 === 0 ? "1" : "0";
      binary += bit.repeat(pattern[index] === "w" ? CODE39_WIDE : 1);
    }
    // Narrow inter-character gap (the last character has none).
    if (charIndex < chars.length - 1) binary += "0";
  });
  return binary;
}

/** Module width of one Code 39 character including its gap. */
export function code39CharModules(char: string) {
  const pattern = CODE39_ELEMENTS[char];
  if (!pattern) return 0;
  return pattern
    .split("")
    .reduce((width, element) => width + (element === "w" ? CODE39_WIDE : 1), 1);
}

function encodeCode39(normalized: NormalizedBarcode): BarcodeSpec {
  const binary = code39Binary(normalized.value);
  const segments: BarcodeTextSegment[] = [
    { text: normalized.display, center: binary.length / 2 },
  ];
  return assemble({
    format: "code39",
    value: normalized.value,
    display: normalized.display,
    binary,
    segments,
    quiet: { left: 10, right: 10 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* EAN / UPC (GS1 General Specifications)                                     */
/* -------------------------------------------------------------------------- */

const SIDE_GUARD = EAN_SIDE_GUARD;
const CENTRE_GUARD = EAN_CENTRE_GUARD;

/**
 * The guard bars that extend below an EAN/UPC symbol, in module units.
 *
 * Only the black modules inside a guard are extended — a solid block across
 * "01010" would draw bars where the symbology has spaces.
 */
export function guardRuns(
  binary: string,
  ranges: [start: number, length: number][],
) {
  const runs: BarcodeBar[] = [];
  for (const [start, length] of ranges) {
    const slice = binary.slice(start, start + length);
    for (const run of barsFromBinary(slice))
      runs.push({ x: start + run.x, width: run.width });
  }
  return runs;
}

function encodeEan13(
  normalized: NormalizedBarcode,
  guardBars: boolean,
): BarcodeSpec {
  const digits = normalized.value;
  const parity = EAN13_PARITY[Number(digits[0])];
  let binary = SIDE_GUARD;
  for (let index = 0; index < 6; index += 1) {
    const digit = Number(digits[index + 1]);
    binary += parity[index] === "L" ? EAN_L[digit] : EAN_G[digit];
  }
  binary += CENTRE_GUARD;
  for (let index = 0; index < 6; index += 1) {
    binary += EAN_R[Number(digits[index + 7])];
  }
  binary += SIDE_GUARD;
  return assemble({
    format: "ean13",
    value: digits,
    display: digits,
    binary,
    segments: [
      { text: digits[0], center: -6 },
      { text: digits.slice(1, 7), center: 24 },
      { text: digits.slice(7), center: 71 },
    ],
    quiet: { left: 11, right: 7 },
    notes: normalized.notes,
    guards: guardBars
      ? guardRuns(binary, [
          [0, 3],
          [45, 5],
          [92, 3],
        ])
      : [],
  });
}

function encodeEan8(
  normalized: NormalizedBarcode,
  guardBars: boolean,
): BarcodeSpec {
  const digits = normalized.value;
  let binary = SIDE_GUARD;
  for (let index = 0; index < 4; index += 1)
    binary += EAN_L[Number(digits[index])];
  binary += CENTRE_GUARD;
  for (let index = 4; index < 8; index += 1)
    binary += EAN_R[Number(digits[index])];
  binary += SIDE_GUARD;
  return assemble({
    format: "ean8",
    value: digits,
    display: digits,
    binary,
    segments: [
      { text: digits.slice(0, 4), center: 17 },
      { text: digits.slice(4), center: 50 },
    ],
    quiet: { left: 9, right: 7 },
    notes: normalized.notes,
    guards: guardBars
      ? guardRuns(binary, [
          [0, 3],
          [31, 5],
          [64, 3],
        ])
      : [],
  });
}

function encodeUpca(
  normalized: NormalizedBarcode,
  guardBars: boolean,
): BarcodeSpec {
  const digits = normalized.value;
  let binary = SIDE_GUARD;
  for (let index = 0; index < 6; index += 1)
    binary += EAN_L[Number(digits[index])];
  binary += CENTRE_GUARD;
  for (let index = 6; index < 12; index += 1)
    binary += EAN_R[Number(digits[index])];
  binary += SIDE_GUARD;
  return assemble({
    format: "upca",
    value: digits,
    display: digits,
    binary,
    segments: [
      { text: digits[0], center: -6 },
      { text: digits.slice(1, 6), center: 27.5 },
      { text: digits.slice(6, 11), center: 67.5 },
      { text: digits[11], center: 101 },
    ],
    quiet: { left: 9, right: 9 },
    notes: normalized.notes,
    guards: guardBars
      ? guardRuns(binary, [
          [0, 3],
          [45, 5],
          [92, 3],
        ])
      : [],
  });
}

function encodeUpce(
  normalized: NormalizedBarcode,
  guardBars: boolean,
): BarcodeSpec {
  // value = number system + six digits + check digit
  const numberSystem = normalized.value[0];
  const middle = normalized.value.slice(1, 7);
  const check = Number(normalized.value[7]);
  const pattern = UPCE_PARITY[check];
  const inverted = numberSystem === "1";
  let binary = SIDE_GUARD;
  for (let index = 0; index < 6; index += 1) {
    const even = pattern[index] === "E";
    const useEven = inverted ? !even : even;
    binary += useEven
      ? EAN_G[Number(middle[index])]
      : EAN_L[Number(middle[index])];
  }
  binary += "010101";
  return assemble({
    format: "upce",
    value: normalized.value,
    display: normalized.value,
    binary,
    segments: [
      { text: numberSystem, center: -6 },
      { text: middle.slice(0, 3), center: 13.5 },
      { text: middle.slice(3), center: 34.5 },
      { text: String(check), center: 57 },
    ],
    quiet: { left: 9, right: 7 },
    notes: normalized.notes,
    guards: guardBars
      ? guardRuns(binary, [
          [0, 3],
          [45, 6],
        ])
      : [],
  });
}

/* -------------------------------------------------------------------------- */
/* ITF-14 (Interleaved 2 of 5)                                                */
/* -------------------------------------------------------------------------- */

const ITF_DIGITS = [
  "00110",
  "10001",
  "01001",
  "11000",
  "00101",
  "10100",
  "01100",
  "00011",
  "10010",
  "01010",
];

export function itfBinary(digits: string) {
  let binary = "1010"; // start: narrow bar, narrow space, narrow bar, narrow space
  for (let index = 0; index < digits.length; index += 2) {
    const bars = ITF_DIGITS[Number(digits[index])];
    const spaces = ITF_DIGITS[Number(digits[index + 1])];
    for (let element = 0; element < 5; element += 1) {
      binary += "1".repeat(bars[element] === "1" ? 3 : 1);
      binary += "0".repeat(spaces[element] === "1" ? 3 : 1);
    }
  }
  binary += "11101"; // stop: wide bar, narrow space, narrow bar
  return binary;
}

function encodeItf14(normalized: NormalizedBarcode): BarcodeSpec {
  const binary = itfBinary(normalized.value);
  return assemble({
    format: "itf14",
    value: normalized.value,
    display: normalized.value,
    binary,
    segments: [{ text: normalized.value, center: binary.length / 2 }],
    quiet: { left: 10, right: 10 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* Codabar (AIM USS Codabar)                                                  */
/* -------------------------------------------------------------------------- */

const CODABAR_PATTERNS: Record<string, string> = {
  "0": "101010011",
  "1": "101011001",
  "2": "101001011",
  "3": "110010101",
  "4": "101101001",
  "5": "110101001",
  "6": "100101011",
  "7": "100101101",
  "8": "100110101",
  "9": "110100101",
  "-": "101001101",
  $: "101100101",
  ":": "1101011011",
  "/": "1101101011",
  ".": "1101101101",
  "+": "1011011011",
  A: "1011001001",
  B: "1001001011",
  C: "1010010011",
  D: "1010011001",
};

export function codabarBinary(value: string) {
  return value
    .split("")
    .map((char) => {
      const pattern = CODABAR_PATTERNS[char];
      if (!pattern) throw new Error(`Codabar cannot encode "${char}".`);
      return pattern;
    })
    .join("0");
}

function encodeCodabar(normalized: NormalizedBarcode): BarcodeSpec {
  const binary = codabarBinary(normalized.value);
  return assemble({
    format: "codabar",
    value: normalized.value,
    display: normalized.display,
    binary,
    segments: [{ text: normalized.display, center: binary.length / 2 }],
    quiet: { left: 10, right: 10 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* MSI (Modified Plessey)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * MSI is a 4-bit binary code per digit: a "1" bit is a wide bar (2 modules), a
 * "0" bit a narrow bar (1 module), each followed by a one-module space.
 */
export function msiBinary(value: string) {
  let binary = "110"; // start: wide bar + narrow space
  for (const char of value) {
    const bits = Number(char).toString(2).padStart(4, "0");
    for (const bit of bits) binary += bit === "1" ? "110" : "100";
  }
  return `${binary}1001`; // stop: narrow bar, narrow space, narrow bar
}

function encodeMsi(normalized: NormalizedBarcode): BarcodeSpec {
  const binary = msiBinary(normalized.value);
  return assemble({
    format: "msi",
    value: normalized.value,
    display: normalized.display,
    binary,
    segments: [{ text: normalized.display, center: binary.length / 2 }],
    quiet: { left: 12, right: 12 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* Pharmacode (Laetus)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Pharmacode is a two-width binary code, read right to left: narrow bars stand
 * for 1, wide bars for 2, and each step left doubles the value.
 */
export function pharmacodeBars(value: number): number[] {
  const widths: number[] = [];
  let remaining = Math.round(value);
  let guard = 0;
  while (remaining > 0) {
    guard += 1;
    if (guard > 32) throw new Error("Pharmacode value is out of range.");
    if (remaining % 2 === 0) {
      widths.unshift(3); // wide bar = digit 2
      remaining = (remaining - 2) / 2;
    } else {
      widths.unshift(1); // narrow bar = digit 1
      remaining = (remaining - 1) / 2;
    }
  }
  return widths;
}

function encodePharmacode(normalized: NormalizedBarcode): BarcodeSpec {
  const widths = pharmacodeBars(Number(normalized.value));
  let binary = "";
  widths.forEach((width, index) => {
    binary += "1".repeat(width);
    if (index < widths.length - 1) binary += "00";
  });
  // Pharmacode has no human-readable line on the symbol itself.
  return assemble({
    format: "pharmacode",
    value: normalized.value,
    display: normalized.display,
    binary,
    segments: [{ text: normalized.display, center: binary.length / 2 }],
    quiet: { left: 6, right: 6 },
    notes: normalized.notes,
  });
}

/* -------------------------------------------------------------------------- */
/* Public entry points                                                        */
/* -------------------------------------------------------------------------- */

/** Encode already-normalised data. Throws only on a programming error. */
export function encodeSpec(
  format: BarcodeFormatId,
  normalized: NormalizedBarcode,
  options: BarcodeEncodeOptions = {},
): BarcodeSpec {
  const guardBars = options.guardBars !== false;
  switch (format) {
    case "code128":
    case "gs1-128":
      return encodeCode128(normalized);
    case "code39":
      return encodeCode39(normalized);
    case "ean13":
      return encodeEan13(normalized, guardBars);
    case "ean8":
      return encodeEan8(normalized, guardBars);
    case "upca":
      return encodeUpca(normalized, guardBars);
    case "upce":
      return encodeUpce(normalized, guardBars);
    case "itf14":
      return encodeItf14(normalized);
    case "codabar":
      return encodeCodabar(normalized);
    case "msi":
      return encodeMsi(normalized);
    case "pharmacode":
      return encodePharmacode(normalized);
    default:
      throw new Error(`Unsupported barcode format: ${format satisfies never}`);
  }
}

/**
 * The one function the UI and the tests call: validate, normalise, encode.
 * Invalid input never reaches the renderer.
 */
export function buildBarcode(
  format: BarcodeFormatId,
  raw: string,
  options: BarcodeEncodeOptions = {},
): BarcodePrepareResult {
  const normalized = normalizeBarcode(format, raw, options);
  if (!normalized.ok) return { ok: false, problems: normalized.problems };
  try {
    const spec = encodeSpec(format, normalized.normalized, options);
    return { ok: true, spec, warnings: normalized.normalized.warnings };
  } catch (error) {
    return {
      ok: false,
      problems: [
        {
          code: "unsupported",
          message:
            error instanceof Error
              ? error.message
              : "That data could not be encoded in this format.",
        },
      ],
    };
  }
}
