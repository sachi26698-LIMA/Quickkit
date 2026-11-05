/**
 * Shared types for the QUICKKIT QR Code Scanner.
 *
 * Everything here describes data that was actually read out of pixels by a
 * decoder. There is no "simulated" result type: a scan that finds nothing is a
 * `null` decode, never an invented payload.
 */

/** A decoded QR symbol, exactly as the decoder reported it. */
export type DecodedSymbol = {
  /** UTF-8 (or byte-mode) text the decoder produced. */
  data: string;
  /** Raw payload bytes, so binary/ECI payloads can still be hashed or exported. */
  bytes: Uint8Array;
  /** QR version (1–40) reported by the decoder. */
  version: number;
  /** Error-correction level the symbol was printed with, when determinable. */
  errorCorrection: "L" | "M" | "Q" | "H" | null;
  /** Corner coordinates in source-image space, for drawing an overlay. */
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  };
  /** Which preprocessing pass produced this read (see preprocessing.ts). */
  pass: string;
  /** True when the symbol only decoded after inverting it. */
  inverted: boolean;
};

export type Point = { x: number; y: number };

/** An RGBA raster, row-major, top-down. Shared with the existing QR engine. */
export type Raster = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export type ImageRotation = 0 | 90 | 180 | 270;

/**
 * A crop rectangle expressed as fractions of the source image, so a crop made
 * on one preview size still applies to the full-resolution decode.
 */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageAdjustments = {
  rotation: ImageRotation;
  crop: CropRect | null;
  /** Extra contrast boost applied to greyscale before thresholding, 0–2. */
  contrast: number;
  /** Binary threshold override in 0–255, or null for adaptive. */
  threshold: number | null;
  /** Unsharp mask strength, 0–2. */
  sharpen: number;
  invert: boolean;
};

export const defaultAdjustments: ImageAdjustments = {
  rotation: 0,
  crop: null,
  contrast: 1,
  threshold: null,
  sharpen: 0,
  invert: false,
};

/** Per-file result of a scan, used by every mode (camera, upload, batch). */
export type ScanOutcome = {
  id: string;
  /** File name, or "Camera capture", or "Pasted image". */
  sourceName: string;
  /** 0 for live camera frames; otherwise the image's byte size. */
  sourceBytes: number;
  scannedAt: number;
  /** Every symbol the decoder genuinely returned, deduplicated by payload. */
  symbols: DecodedSymbol[];
  /** Passes that were attempted, in order, for the audit trail. */
  attempts: string[];
  /** Milliseconds the decode took. */
  durationMs: number;
  /** Why nothing was found, when nothing was found. */
  failure: string | null;
};

export type ScanRequest = {
  raster: Raster;
  /** "image" runs the full ladder; "frame" trims it for 60 fps camera use. */
  profile?: "image" | "frame" | "precise";
  adjustments?: Partial<ImageAdjustments>;
  signal?: AbortSignal;
};
