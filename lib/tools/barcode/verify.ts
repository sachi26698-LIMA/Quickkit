/**
 * "Will this actually scan?" — answered by decoding the rendered geometry.
 *
 * The raster is produced from the exact rectangles the preview draws, so a
 * pass here means the user's chosen colours, quiet zone and bar geometry
 * survived styling. PNG export paints the same rectangles through a canvas;
 * SVG and PDF emit the same rectangles as vector shapes.
 */
import { decodeBarcodes } from "./decode";
import { buildLayout, type BarcodeRenderOptions } from "./layout";
import { rasterizeLayout } from "./raster";
import type { BarcodeSpec } from "./types";

export type BarcodeVerification = {
  ok: boolean;
  /** What the decoder read, when it read anything. */
  found: string | null;
  /** Symbology the decoder reported. */
  format: string;
  message: string;
  attempts: string[];
};

function normalise(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function digitString(value: string) {
  return value.replace(/\D/g, "");
}

/** EAN-13 and UPC-A are the same symbol with one implicit leading digit. */
export function matchesExpected(expected: string[], actual: string) {
  const target = normalise(actual);
  for (const candidate of expected) if (normalise(candidate) === target) return true;
  const actualDigits = digitString(target);
  if (!actualDigits) return false;
  return expected.some((candidate) => {
    const digits = digitString(candidate);
    if (!digits) return false;
    if (digits === actualDigits) return true;
    return (
      digits.replace(/^0+/, "") === actualDigits.replace(/^0+/, "") &&
      Math.abs(digits.length - actualDigits.length) <= 1
    );
  });
}

export function verifyBarcode(
  spec: BarcodeSpec,
  options: Partial<BarcodeRenderOptions> = {},
): BarcodeVerification {
  const layout = buildLayout({ spec, options });
  // 2× the preview density: a decoder needs a few pixels per module, and the
  // check should not fail on a label that is perfectly printable at 300 dpi.
  const raster = rasterizeLayout(layout, { scale: 2 });
  const { barcodes, attempts } = decodeBarcodes(raster, { profile: "image" });
  const expected = [spec.value, spec.display];
  const match = barcodes.find((candidate) => matchesExpected(expected, candidate.text));
  if (match)
    return {
      ok: true,
      found: match.text,
      format: match.label,
      message: `Decoded as ${match.label}: ${match.text}`,
      attempts,
    };
  if (barcodes.length)
    return {
      ok: false,
      found: barcodes[0].text,
      format: barcodes[0].label,
      message: `The decoder read ${barcodes[0].text} instead of ${spec.value} — a colour, quiet-zone or size change broke it.`,
      attempts,
    };
  return {
    ok: false,
    found: null,
    format: "",
    message:
      "The decoder found nothing. Increase the bar width, restore the quiet zone, or darken the bar colour — those three changes fix almost every failure.",
    attempts,
  };
}
