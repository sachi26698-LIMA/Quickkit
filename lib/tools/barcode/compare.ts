/**
 * Compare two codes without pretending they are the same thing.
 *
 * The comparison is character-level and, when both sides are GTIN-shaped, also
 * numeric: "5901234123457" and "05901234123457" are the same product number with
 * and without the GTIN-14 zero padding, while "5901234123457" and
 * "5901234123458" are two different products or a bad check digit — and those
 * two situations must never be conflated.
 */
import { gtinCheckDigit, gtinCheckOk } from "./checksums";

export type SideReport = {
  value: string;
  /** Padded 14-digit form, when the value is a GTIN of a retail length. */
  gtin14?: string;
  gtinValid?: boolean;
  length: number;
  /** True when the value only contains digits. */
  numeric: boolean;
};

export type ComparisonDiff = {
  index: number;
  left: string;
  right: string;
};

export type ComparisonResult = {
  verdict:
    "identical" | "same-gtin" | "different-length" | "different" | "empty";
  left: SideReport;
  right: SideReport;
  diffs: ComparisonDiff[];
  commonPrefix: number;
  commonSuffix: number;
  summary: string;
  notes: string[];
};

function describe(value: string): SideReport {
  const digits = value.replace(/\s+/g, "");
  const numeric = /^\d+$/.test(digits);
  const asGtin =
    numeric && [8, 12, 13, 14].includes(digits.length)
      ? digits.padStart(14, "0")
      : undefined;
  return {
    value,
    gtin14: asGtin,
    gtinValid: asGtin ? gtinCheckOk(asGtin) : undefined,
    length: digits.length,
    numeric,
  };
}

export function compareCodes(
  leftRaw: string,
  rightRaw: string,
): ComparisonResult {
  const left = leftRaw.trim();
  const right = rightRaw.trim();
  const leftReport = describe(left);
  const rightReport = describe(right);

  if (!left || !right)
    return {
      verdict: "empty",
      left: leftReport,
      right: rightReport,
      diffs: [],
      commonPrefix: 0,
      commonSuffix: 0,
      summary: "Enter a value on both sides to compare them.",
      notes: [],
    };

  const notes: string[] = [];
  for (const [label, side] of [
    ["The first", leftReport],
    ["The second", rightReport],
  ] as const) {
    if (side.gtinValid === false)
      notes.push(
        `${label} value looks like a GTIN but fails its check digit (expected ${gtinCheckDigit(side.gtin14!.slice(0, 13))} as the last digit).`,
      );
  }

  if (left === right)
    return {
      verdict: "identical",
      left: leftReport,
      right: rightReport,
      diffs: [],
      commonPrefix: left.length,
      commonSuffix: 0,
      summary: "Both values are identical, character for character.",
      notes,
    };

  if (
    leftReport.gtin14 &&
    rightReport.gtin14 &&
    leftReport.gtin14 === rightReport.gtin14 &&
    leftReport.gtinValid
  )
    return {
      verdict: "same-gtin",
      left: leftReport,
      right: rightReport,
      diffs: [],
      commonPrefix: 0,
      commonSuffix: 0,
      summary: `Both values are the same GTIN-14 (${leftReport.gtin14}) written with different padding — the same product number.`,
      notes: [
        ...notes,
        "This is a formatting difference, not a different product. A leading zero does not change the GTIN.",
      ],
    };

  const diffs: ComparisonDiff[] = [];
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const a = left[index] ?? "";
    const b = right[index] ?? "";
    if (a !== b) diffs.push({ index, left: a, right: b });
  }

  let commonPrefix = 0;
  while (
    commonPrefix < left.length &&
    commonPrefix < right.length &&
    left[commonPrefix] === right[commonPrefix]
  )
    commonPrefix += 1;

  let commonSuffix = 0;
  while (
    commonSuffix < left.length - commonPrefix &&
    commonSuffix < right.length - commonPrefix &&
    left[left.length - 1 - commonSuffix] ===
      right[right.length - 1 - commonSuffix]
  )
    commonSuffix += 1;

  if (left.length !== right.length) {
    notes.push(
      `The values are different lengths (${left.length} and ${right.length} characters), which already rules out an identical GTIN.`,
    );
    return {
      verdict: "different-length",
      left: leftReport,
      right: rightReport,
      diffs,
      commonPrefix,
      commonSuffix,
      summary: `Different lengths: ${left.length} versus ${right.length} characters, with ${diffs.length} differing position${diffs.length === 1 ? "" : "s"}.`,
      notes,
    };
  }

  return {
    verdict: "different",
    left: leftReport,
    right: rightReport,
    diffs,
    commonPrefix,
    commonSuffix,
    summary: `${diffs.length} character${diffs.length === 1 ? "" : "s"} differ. First difference at position ${diffs[0].index + 1}: "${diffs[0].left || "∅"}" versus "${diffs[0].right || "∅"}".`,
    notes,
  };
}
