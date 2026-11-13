/**
 * A UPC-E reader that actually works.
 *
 * Why this exists: `@zxing/library` ships a UPC-E reader whose `decodeMiddle`
 * returns a bare offset instead of the `{ rowOffset, resultString }` object its
 * own base class reads, and whose base class then calls `checkChecksum`
 * statically instead of polymorphically. The net effect is that every UPC-E
 * symbol fails to decode in the JavaScript port (0.20–0.23), even though the
 * Java original is fine. Rather than monkey-patching a dependency's prototype,
 * this file decodes UPC-E from ZXing's binarised bit matrix directly, and the
 * generated symbols are round-trip tested against it.
 *
 * It only needs the six-digit middle and its parity pattern: everything else
 * (quiet zones, the 010101 terminator, the checksum) is arithmetic we already
 * own.
 */
import { EAN_G, EAN_L, UPCE_PARITY, type BitRow } from "./ean-tables";
import { upceToUpca } from "./checksums";

/** Run widths of a 7-module pattern that starts with a space. */
function runWidths(binary: string): number[] {
  const widths: number[] = [];
  let index = 0;
  while (index < binary.length) {
    const bit = binary[index];
    let length = 0;
    while (index < binary.length && binary[index] === bit) {
      length += 1;
      index += 1;
    }
    widths.push(length);
  }
  return widths;
}

const L_WIDTHS = EAN_L.map(runWidths);
const G_WIDTHS = EAN_G.map(runWidths);

/**
 * Per-run tolerance in modules. A 1-module bar rendered at 4.8 px and snapped
 * to whole pixels is already 0.2 modules off; the summed error therefore has to
 * scale with the number of runs or a six-run terminator would fail a symbol
 * that scanned perfectly.
 */
const MAX_INDIVIDUAL_VARIANCE = 0.8;
const AVERAGE_TOLERANCE = 0.38;

/**
 * Compare measured run widths with a pattern, normalised to the measured total
 * (ZXing's variance metric). Returns the summed error in modules.
 */
export function patternError(counters: number[], pattern: number[]) {
  const total = counters.reduce((sum, value) => sum + value, 0);
  const patternTotal = pattern.reduce((sum, value) => sum + value, 0);
  if (!total || !patternTotal) return Number.POSITIVE_INFINITY;
  const unit = total / patternTotal;
  let error = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index] * unit;
    const variance = Math.abs(counters[index] - expected) / unit;
    if (variance > MAX_INDIVIDUAL_VARIANCE) return Number.POSITIVE_INFINITY;
    error += variance;
  }
  return error;
}

type DigitMatch = { digit: number; parity: "L" | "G"; error: number };

/** Best L/G match for four run widths (space, bar, space, bar). */
export function matchDigit(counters: number[]): DigitMatch | null {
  let best: DigitMatch | null = null;
  for (let digit = 0; digit < 10; digit += 1) {
    const lError = patternError(counters, L_WIDTHS[digit]);
    if (lError < (best?.error ?? Number.POSITIVE_INFINITY))
      best = { digit, parity: "L", error: lError };
    const gError = patternError(counters, G_WIDTHS[digit]);
    if (gError < (best?.error ?? Number.POSITIVE_INFINITY))
      best = { digit, parity: "G", error: gError };
  }
  if (!best || best.error > AVERAGE_TOLERANCE * 4) return null;
  return best;
}

const guardPattern = [1, 1, 1];
const endPattern = [1, 1, 1, 1, 1, 1];

function runsAt(row: BitRow, y: number, start: number, count: number, firstDark: boolean) {
  const width = row.getWidth();
  const runs: number[] = [];
  let x = start;
  let dark = firstDark;
  for (let index = 0; index < count; index += 1) {
    let length = 0;
    while (x < width && Boolean(row.get(x, y)) === dark) {
      length += 1;
      x += 1;
    }
    if (length === 0) return null;
    runs.push(length);
    dark = !dark;
  }
  return { runs, end: x };
}

/** Decode one UPC-E symbol from a single row, or null. */
export function decodeUpceRow(row: BitRow, y: number): string | null {
  const width = row.getWidth();
  let start = 0;
  while (start < width && !row.get(start, y)) start += 1;
  if (start >= width) return null;

  const guard = runsAt(row, y, start, 3, true);
  if (!guard) return null;
  if (patternError(guard.runs, guardPattern) > AVERAGE_TOLERANCE * 3) return null;
  let unit = guard.runs.reduce((sum, value) => sum + value, 0) / 3;
  if (unit < 1) return null;
  // UPC-E needs a 9-module left quiet zone; photographs lose a little of it,
  // so 6 modules is the practical floor before we reject the row.
  if (start < unit * 6) return null;

  let cursor = guard.end;
  let parity = "";
  let middle = "";
  for (let digit = 0; digit < 6; digit += 1) {
    const measured = runsAt(row, y, cursor, 4, false);
    if (!measured) return null;
    const match = matchDigit(measured.runs);
    if (!match) return null;
    middle += String(match.digit);
    parity += match.parity === "G" ? "E" : "O";
    cursor = measured.end;
    // Track scale drift (perspective, lens distortion) instead of assuming the
    // start-guard width holds across the whole symbol.
    const localUnit = measured.runs.reduce((sum, value) => sum + value, 0) / 7;
    unit = unit * 0.7 + localUnit * 0.3;
  }

  const end = runsAt(row, y, cursor, 6, false);
  if (!end) return null;
  if (patternError(end.runs, endPattern) > AVERAGE_TOLERANCE * 6) return null;
  cursor = end.end;

  // Right quiet zone (7 modules in the spec, 5 tolerated for tight crops).
  let quiet = 0;
  while (cursor < width && !row.get(cursor, y)) {
    quiet += 1;
    cursor += 1;
  }
  if (quiet < unit * 5 && cursor < width) return null;

  for (let numberSystem = 0; numberSystem <= 1; numberSystem += 1)
    for (let check = 0; check < 10; check += 1) {
      const expected = UPCE_PARITY[check];
      const matches =
        numberSystem === 0 ? expected === parity : invert(expected) === parity;
      if (!matches) continue;
      const upca = upceToUpca(middle, numberSystem as 0 | 1);
      if (!upca || Number(upca.slice(-1)) !== check) return null;
      return `${numberSystem}${middle}${check}`;
    }
  return null;
}

function invert(parity: string) {
  return parity.replace(/[EO]/g, (char) => (char === "E" ? "O" : "E"));
}

/** Sweep the middle band of a binarised image for a UPC-E symbol. */
export function decodeUpceMatrix(matrix: BitRow, maxRows = 120): string | null {
  const height = matrix.getHeight();
  if (!height) return null;
  const step = Math.max(1, Math.floor(height / maxRows));
  for (let y = 0; y < height; y += step) {
    const text = decodeUpceRow(matrix, y);
    if (text) return text;
  }
  return null;
}
