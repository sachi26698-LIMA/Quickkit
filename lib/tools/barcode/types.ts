/**
 * Shared types for the Barcode Studio engine.
 *
 * Everything in `lib/tools/barcode` is pure: bytes in, bytes out, no DOM and
 * no network. That is what lets the same geometry drive the live SVG preview,
 * the PNG raster, the PDF sheet and the decoder round-trip the tests run.
 */

/** Every symbology the studio can generate. */
export type BarcodeFormatId =
  | "code128"
  | "code39"
  | "code93"
  | "ean13"
  | "ean8"
  | "upca"
  | "upce"
  | "itf14"
  | "codabar"
  | "msi"
  | "pharmacode"
  | "gs1-128";

/** A bar in module units: `x` from the first module, `width` in modules. */
export type BarcodeBar = { x: number; width: number };

/**
 * A run of human-readable characters, positioned in module units. `center` is
 * the centre of the run relative to the first module (negative values sit in
 * the left quiet zone, which is where EAN/UPC print the leading digit).
 */
export type BarcodeTextSegment = { text: string; center: number };

/** A fully encoded symbol, before any styling is applied. */
export type BarcodeSpec = {
  format: BarcodeFormatId;
  /** Canonical encoded payload, including a check digit where one applies. */
  value: string;
  /** What a human reads: EAN digits, GS1 HRI, or the raw data for Code 128. */
  display: string;
  /** Width of the bar pattern in modules (quiet zones excluded). */
  modules: number;
  bars: BarcodeBar[];
  /** Bars that run below the symbol: EAN/UPC guard bars. */
  guards: BarcodeBar[];
  segments: BarcodeTextSegment[];
  /** Symbology-mandated minimum quiet zone, in modules. */
  quiet: { left: number; right: number };
  /** Human-readable notes about what the encoder did (check digit, …). */
  notes: string[];
};

export type BarcodeChecksumOption = "none" | "mod43" | "mod10" | "mod11";

export type BarcodeNumberSystem = 0 | 1;

/** Knobs that change the encoded data rather than its appearance. */
export type BarcodeEncodeOptions = {
  /** Code 39 mod-43 check, MSI mod-10/mod-11 check. */
  checksum?: BarcodeChecksumOption;
  /** UPC-E number system digit. */
  numberSystem?: BarcodeNumberSystem;
  /** Codabar start/stop character; defaults to A. */
  codabarStart?: "A" | "B" | "C" | "D";
  /** Use the EAN/UPC guard-bar extension into the text line. */
  guardBars?: boolean;
};

/** Validation failure with an actionable message. */
export type BarcodeProblem = {
  /** Stable code so tests can assert the specific rule that fired. */
  code:
    | "empty"
    | "length"
    | "charset"
    | "checksum"
    | "range"
    | "gs1-ai"
    | "gs1-data"
    | "gs1-check"
    | "gs1-syntax"
    | "unsupported";
  message: string;
  /** Concrete example the user can paste to get moving again. */
  example?: string;
};

export type BarcodePrepareResult =
  | { ok: true; spec: BarcodeSpec; warnings: string[] }
  | { ok: false; problems: BarcodeProblem[] };

/**
 * 2D symbologies the scanner can read. They are not generator formats — the 2D
 * encoder lives in `twod.ts` and has its own format ids — so the scanner's
 * decoded format is a wider union than `BarcodeFormatId`.
 */
export type DecodedTwoDFormat = "qrcode" | "datamatrix" | "pdf417";

/** One decoded symbol from the scanner. */
export type DecodedBarcode = {
  text: string;
  /** Symbology as reported by the decoder, e.g. "CODE_128". */
  rawFormat: string;
  /** Mapped back onto a known format where possible. */
  format: BarcodeFormatId | DecodedTwoDFormat | "unknown";
  label: string;
  /** Normalised bounding points in raster pixels, when the decoder reports them. */
  points?: { x: number; y: number }[];
};
