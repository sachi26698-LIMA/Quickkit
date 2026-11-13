/**
 * Barcode decoding, local to the device.
 *
 * The decoder is ZXing (`@zxing/library`, Apache-2.0). It runs on raw RGBA in a
 * Web Worker for camera frames and image uploads, and in the main thread as a
 * fallback — the same code path either way, so a decode in the test suite and a
 * decode in the scanner are the same function.
 *
 * The retry ladder exists because 1D symbols are unforgiving: a photo taken
 * sideways, at a slight angle, or with the label filling only a corner needs a
 * rotation or a tile to be found at all.
 */
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { decodeUpceMatrix } from "./upce-reader";
import type { BitRow } from "./ean-tables";
import type { BarcodeFormatId, DecodedBarcode } from "./types";

export type Raster = { width: number; height: number; rgba: Uint8ClampedArray };

/**
 * Formats the studio can read. MSI and Pharmacode are generation-only: ZXing
 * has no reader for either, and claiming otherwise would be a lie a user could
 * only discover by failing to scan their own barcode.
 */
const READABLE: { format: BarcodeFormat; id: BarcodeFormatId }[] = [
  { format: BarcodeFormat.CODE_128, id: "code128" },
  { format: BarcodeFormat.CODE_39, id: "code39" },
  { format: BarcodeFormat.EAN_13, id: "ean13" },
  { format: BarcodeFormat.EAN_8, id: "ean8" },
  { format: BarcodeFormat.UPC_A, id: "upca" },
  { format: BarcodeFormat.UPC_E, id: "upce" },
  { format: BarcodeFormat.ITF, id: "itf14" },
  { format: BarcodeFormat.CODABAR, id: "codabar" },
];

export const READABLE_FORMATS = READABLE.map((entry) => entry.id);

export const FORMAT_LABELS: Record<string, string> = {
  code128: "Code 128",
  "gs1-128": "GS1-128",
  code39: "Code 39",
  ean13: "EAN-13",
  ean8: "EAN-8",
  upca: "UPC-A",
  upce: "UPC-E",
  itf14: "ITF-14",
  codabar: "Codabar",
  msi: "MSI",
  pharmacode: "Pharmacode",
  unknown: "Unknown format",
};

function rawFormatName(format: BarcodeFormat) {
  return String(format);
}

function mapFormat(format: BarcodeFormat, text: string): BarcodeFormatId | "unknown" {
  const match = READABLE.find((entry) => entry.format === format);
  if (!match) return "unknown";
  // A GS1-128 is a Code 128 that carries an FNC1, which decoders surface as a
  // GS (0x1D) separator. That is the honest distinction between the two.
  if (match.id === "code128" && /[\u001d]/.test(text)) return "gs1-128";
  return match.id;
}

/**
 * ZXing handles every format here *except* UPC-E, whose reader is broken in the
 * JavaScript port (see `upce-reader.ts`). UPC-E is decoded by our own pass over
 * the same binarised matrix.
 */
const ZXING_FORMATS = READABLE.filter((entry) => entry.id !== "upce").map(
  (entry) => entry.format,
);

function hints(tryHarder: boolean) {
  const map = new Map<DecodeHintType, unknown>();
  map.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
  if (tryHarder) map.set(DecodeHintType.TRY_HARDER, true);
  return map;
}

/**
 * RGBA → one luminance byte per pixel.
 *
 * `RGBLuminanceSource` only converts an `Int32Array` (ARGB); for a byte array it
 * assumes the values are already luminance. Handing it RGBA would decode noise,
 * so the conversion is explicit here.
 */
export function luminanceOf(raster: Raster) {
  const { rgba } = raster;
  const luminance = new Uint8ClampedArray(raster.width * raster.height);
  for (let index = 0, pixel = 0; index < luminance.length; index += 1, pixel += 4)
    luminance[index] = (rgba[pixel] + rgba[pixel + 1] * 2 + rgba[pixel + 2]) >> 2;
  return luminance;
}

/** Decode one orientation of a raster. Returns [] when nothing is found. */
function readOnce(raster: Raster, tryHarder: boolean): DecodedBarcode[] {
  if (!raster.width || !raster.height) return [];
  try {
    const source = new RGBLuminanceSource(
      luminanceOf(raster),
      raster.width,
      raster.height,
    );
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const reader = new MultiFormatReader();
    // Hints must be passed to `decode`: calling `decode(bitmap)` alone resets
    // them (MultiFormatReader compares the hint object by identity), which
    // silently re-enables every 2D reader and costs seconds per frame.
    const result = reader.decode(bitmap, hints(tryHarder));
    const text = result.getText();
    const format = mapFormat(result.getBarcodeFormat(), text);
    const points = result.getResultPoints?.() ?? [];
    return [
      {
        text,
        rawFormat: rawFormatName(result.getBarcodeFormat()),
        format,
        label: FORMAT_LABELS[format] ?? FORMAT_LABELS.unknown,
        points: points.map((point) => ({
          x: point ? Math.round(point.getX()) : 0,
          y: point ? Math.round(point.getY()) : 0,
        })),
      },
    ];
  } catch {
    // ZXing throws NotFoundException for "no symbol here" — that is a normal
    // outcome of the retry ladder, not an error worth surfacing.
  }

  // UPC-E fallback, on the same binarised pixels ZXing just searched.
  try {
    const source = new RGBLuminanceSource(
      luminanceOf(raster),
      raster.width,
      raster.height,
    );
    const matrix = new HybridBinarizer(source).getBlackMatrix();
    const text = decodeUpceMatrix(matrix as unknown as BitRow);
    if (text)
      return [
        {
          text,
          rawFormat: rawFormatName(BarcodeFormat.UPC_E),
          format: "upce",
          label: FORMAT_LABELS.upce,
        },
      ];
  } catch {
    /* no matrix, no UPC-E — the other formats are unaffected */
  }
  return [];
}

/** Rotate RGBA by 90° steps (multiples of 90 only). */
export function rotateRaster(raster: Raster, degrees: 0 | 90 | 180 | 270): Raster {
  if (degrees === 0) return raster;
  const { width, height, rgba } = raster;
  const swap = degrees === 90 || degrees === 270;
  const outWidth = swap ? height : width;
  const outHeight = swap ? width : height;
  const out = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let nx: number;
      let ny: number;
      if (degrees === 90) {
        nx = height - 1 - y;
        ny = x;
      } else if (degrees === 180) {
        nx = width - 1 - x;
        ny = height - 1 - y;
      } else {
        nx = y;
        ny = width - 1 - x;
      }
      const from = (y * width + x) * 4;
      const to = (ny * outWidth + nx) * 4;
      out[to] = rgba[from];
      out[to + 1] = rgba[from + 1];
      out[to + 2] = rgba[from + 2];
      out[to + 3] = rgba[from + 3];
    }
  }
  return { width: outWidth, height: outHeight, rgba: out };
}

function cropRaster(
  raster: Raster,
  box: { x: number; y: number; width: number; height: number },
): Raster {
  const x0 = Math.max(0, Math.min(raster.width - 1, Math.round(box.x)));
  const y0 = Math.max(0, Math.min(raster.height - 1, Math.round(box.y)));
  const x1 = Math.max(x0 + 1, Math.min(raster.width, Math.round(box.x + box.width)));
  const y1 = Math.max(y0 + 1, Math.min(raster.height, Math.round(box.y + box.height)));
  const width = x1 - x0;
  const height = y1 - y0;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const from = ((y0 + y) * raster.width + x0) * 4;
    rgba.set(raster.rgba.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, rgba };
}

function dedupe(list: DecodedBarcode[]) {
  const seen = new Set<string>();
  const out: DecodedBarcode[] = [];
  for (const item of list) {
    const key = `${item.rawFormat}:${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type DecodeProfile = "frame" | "image";

export type DecodeOutcome = {
  barcodes: DecodedBarcode[];
  /** Human-readable description of each pass, for the "what we tried" line. */
  attempts: string[];
};

/**
 * Decode a raster.
 *
 * `frame` is the camera path: fast, one rotation, no tiling, because a preview
 * runs at several frames a second. `image` is the upload path: everything,
 * including four orientations and an overlapping 2×2 tile sweep so a photo of
 * several labels returns several symbols.
 */
export function decodeBarcodes(
  raster: Raster,
  options: { profile?: DecodeProfile; maxResults?: number } = {},
): DecodeOutcome {
  const profile = options.profile ?? "image";
  const maxResults = Math.max(1, Math.min(24, options.maxResults ?? 12));
  const attempts: string[] = [];
  const found: DecodedBarcode[] = [];

  const pass = (label: string, input: Raster) => {
    if (found.length >= maxResults) return;
    attempts.push(label);
    found.push(...readOnce(input, profile === "image"));
  };

  pass("original", raster);
  if (!found.length) pass("rotated 180°", rotateRaster(raster, 180));
  if (!found.length) pass("rotated 90°", rotateRaster(raster, 90));
  if (!found.length) pass("rotated 270°", rotateRaster(raster, 270));

  if (profile === "image" && found.length < maxResults) {
    const overlap = 0.16;
    const tileWidth = raster.width / 2;
    const tileHeight = raster.height / 2;
    const stepX = tileWidth * (1 - overlap);
    const stepY = tileHeight * (1 - overlap);
    for (let row = 0; row < 2 && found.length < maxResults; row += 1)
      for (let column = 0; column < 2 && found.length < maxResults; column += 1) {
        const box = {
          x: column * stepX,
          y: row * stepY,
          width: tileWidth,
          height: tileHeight,
        };
        const tile = cropRaster(raster, box);
        pass(`tile ${row + 1}.${column + 1}`, tile);
        if (!found.length) pass(`tile ${row + 1}.${column + 1} rotated 90°`, rotateRaster(tile, 90));
      }
  }

  return { barcodes: dedupe(found).slice(0, maxResults), attempts };
}

/** Convenience for callers that only need to know whether anything decoded. */
export function decodeFirst(raster: Raster, profile: DecodeProfile = "frame") {
  return decodeBarcodes(raster, { profile, maxResults: 1 }).barcodes[0] ?? null;
}
