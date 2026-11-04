/**
 * The decode engine.
 *
 * One rule governs this file: a `DecodedSymbol` exists only because `jsQR` —
 * a real, independent QR decoder — returned data for those exact pixels.
 * Nothing is inferred, guessed or filled in. If every pass comes back empty,
 * the caller gets an empty array and a reason, never a plausible-looking
 * payload.
 *
 * The retry ladder exists because real codes are awkward: rotated, inverted,
 * low-contrast, tiny, blurry, or one of several in the same screenshot. Every
 * pass is named so the UI can show what was genuinely attempted.
 */
import jsQR from "jsqr";
import { locateSymbolRegions } from "./locator";
import {
  applyContrast,
  cropRaster,
  flatten,
  greyToRaster,
  invertGrey,
  otsuThreshold,
  resample,
  rotateRaster,
  sharpen,
  toGreyscale,
} from "./raster";
import type {
  CropRect,
  DecodedSymbol,
  ImageRotation,
  Point,
  Raster,
  ScanRequest,
} from "./types";

/**
 * How to get from a point in the frame the decoder saw back to the original
 * source raster. Every field is explicit so the mapping can be tested.
 */
type PassTransform = {
  /** Rotation applied to the source before cropping. */
  rotation: ImageRotation;
  /** Crop inside the rotated source, in rotated-source pixels. */
  cropX: number;
  cropY: number;
  /** Dimensions of the rotated source. */
  rotatedWidth: number;
  rotatedHeight: number;
  /** Region offset inside the crop, in crop pixels. */
  regionX: number;
  regionY: number;
  /** Frame pixels per crop pixel. */
  scale: number;
};

function inverseRotate(
  point: Point,
  rotation: ImageRotation,
  rotatedWidth: number,
  rotatedHeight: number,
): Point {
  // rotateRaster maps: 90 → (x,y)⇒(h−1−y, x); 180 → (w−1−x, h−1−y);
  // 270 → (x,y)⇒(y, w−1−x).
  if (rotation === 90) return { x: point.y, y: rotatedWidth - 1 - point.x };
  if (rotation === 180)
    return { x: rotatedWidth - 1 - point.x, y: rotatedHeight - 1 - point.y };
  if (rotation === 270) return { x: rotatedWidth - 1 - point.y, y: point.x };
  return point;
}

function toSource(transform: PassTransform, point: Point): Point {
  const inCrop = {
    x: point.x / transform.scale + transform.regionX,
    y: point.y / transform.scale + transform.regionY,
  };
  const inRotated = {
    x: inCrop.x + transform.cropX,
    y: inCrop.y + transform.cropY,
  };
  return inverseRotate(
    inRotated,
    transform.rotation,
    transform.rotatedWidth,
    transform.rotatedHeight,
  );
}

/** Luma at a source-raster point, or null when the point is outside it. */
function lumaAt(raster: Raster, point: Point): number | null {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return null;
  const offset = (y * raster.width + x) * 4;
  return (
    raster.rgba[offset] * 0.299 +
    raster.rgba[offset + 1] * 0.587 +
    raster.rgba[offset + 2] * 0.114
  );
}

/**
 * Polarity, measured rather than assumed.
 *
 * A finder pattern's centre square is always *dark* in a normal symbol and
 * *light* in an inverted one. The decoder reports that centre precisely, so
 * sampling it settles the question with pixels instead of a guess. When the
 * point falls outside the frame the pass identity is used as a fallback.
 */
function measureInverted(
  raster: Raster,
  transform: PassTransform,
  finderCentre: Point,
  fallback: boolean,
): boolean {
  const luma = lumaAt(raster, toSource(transform, finderCentre));
  if (luma === null) return fallback;
  return luma > 140;
}

function symbolFrom(
  result: NonNullable<ReturnType<typeof jsQR>>,
  transform: PassTransform,
  pass: string,
  inverted: boolean,
  source: Raster,
): DecodedSymbol | null {
  if (typeof result.data !== "string") return null;
  const { location } = result;
  return {
    data: result.data,
    bytes: Uint8Array.from(result.binaryData ?? []),
    version: result.version ?? 0,
    // jsQR does not report the error-correction level. Guessing it would be
    // exactly the kind of invention this tool refuses to make.
    errorCorrection: null,
    corners: {
      topLeft: toSource(transform, location.topLeftCorner),
      topRight: toSource(transform, location.topRightCorner),
      bottomRight: toSource(transform, location.bottomRightCorner),
      bottomLeft: toSource(transform, location.bottomLeftCorner),
    },
    pass,
    inverted: measureInverted(
      source,
      transform,
      location.topLeftFinderPattern,
      inverted,
    ),
  };
}

type Pass = {
  name: string;
  frame: Raster;
  transform: PassTransform;
  inverted: boolean;
};

/** Frame widths worth trying: full size first, then progressively smaller. */
function widthLadder(
  width: number,
  profile: "image" | "frame" | "precise",
): number[] {
  if (profile === "frame")
    return width > 320 ? [width, Math.round(width * 0.6)] : [width];
  const widths = new Set<number>([width]);
  for (const factor of [0.72, 0.5, 0.35]) {
    const value = Math.round(width * factor);
    if (value >= 160) widths.add(value);
  }
  return [...widths];
}

function makeTransform(
  rotatedRaster: Raster,
  crop: CropRect | null,
  rotation: ImageRotation,
): PassTransform {
  const cropX = crop ? Math.round(crop.x * rotatedRaster.width) : 0;
  const cropY = crop ? Math.round(crop.y * rotatedRaster.height) : 0;
  return {
    rotation,
    cropX,
    cropY,
    rotatedWidth: rotatedRaster.width,
    rotatedHeight: rotatedRaster.height,
    regionX: 0,
    regionY: 0,
    scale: 1,
  };
}

export type DecodeResult = {
  symbols: DecodedSymbol[];
  attempts: string[];
};

/**
 * Decode every symbol in a raster.
 *
 * Pass order is "most likely to work first", so a clean photo decodes on pass
 * one and a difficult screenshot still gets the full treatment.
 */
export function decodeRaster(request: ScanRequest): DecodeResult {
  const profile = request.profile ?? "image";
  const adjustments = request.adjustments ?? {};
  const attempts: string[] = [];
  const found: DecodedSymbol[] = [];
  const seen = new Set<string>();
  const rotation = (adjustments.rotation ?? 0) as ImageRotation;

  const record = (symbol: DecodedSymbol | null) => {
    if (!symbol || seen.has(symbol.data)) return;
    seen.add(symbol.data);
    found.push(symbol);
  };

  const aborted = () => Boolean(request.signal?.aborted);

  const flattened = flatten(request.raster);
  const rotated = rotation ? rotateRaster(flattened, rotation) : flattened;
  const cropped = cropRaster(rotated, adjustments.crop ?? null);
  if (adjustments.crop)
    attempts.push(
      `crop ${Math.round(adjustments.crop.width * 100)}% × ${Math.round(adjustments.crop.height * 100)}%`,
    );

  const transform = makeTransform(rotated, adjustments.crop ?? null, rotation);
  const grey = toGreyscale(cropped);
  const otsu = otsuThreshold(grey);
  const contrast = adjustments.contrast ?? 1;
  const sharpenAmount = adjustments.sharpen ?? 0;

  const passes: Pass[] = [
    { name: "original", frame: cropped, transform, inverted: false },
  ];

  if (otsu !== null)
    passes.push({
      name: "otsu threshold",
      frame: greyToRaster(
        Uint8ClampedArray.from(grey, (value) => (value < otsu ? 0 : 255)),
        cropped.width,
        cropped.height,
      ),
      transform,
      inverted: false,
    });

  if (Math.abs(contrast - 1) > 0.01)
    passes.push({
      name: `contrast ${contrast.toFixed(2)}×`,
      frame: greyToRaster(
        applyContrast(grey, contrast),
        cropped.width,
        cropped.height,
      ),
      transform,
      inverted: false,
    });

  if (sharpenAmount > 0.05)
    passes.push({
      name: `sharpen ${sharpenAmount.toFixed(1)}×`,
      frame: greyToRaster(
        sharpen(grey, cropped.width, cropped.height, sharpenAmount),
        cropped.width,
        cropped.height,
      ),
      transform,
      inverted: false,
    });

  passes.push({
    name: "inverted",
    frame: greyToRaster(invertGrey(grey), cropped.width, cropped.height),
    transform,
    inverted: true,
  });

  if (profile === "precise") {
    for (const extra of [90, 180, 270] as ImageRotation[]) {
      // The extra turn is applied to the already-cropped frame, so its inverse
      // is composed on top of the existing transform.
      const frame = rotateRaster(cropped, extra);
      passes.push({
        name: `rotated ${extra}°`,
        frame,
        transform: {
          ...transform,
          rotation: ((rotation + extra) % 360) as ImageRotation,
        },
        inverted: false,
      });
    }
  }

  const runPass = (pass: Pass) => {
    const widths = widthLadder(pass.frame.width, profile);
    for (const width of widths) {
      if (aborted()) return;
      const scaled =
        width === pass.frame.width ? pass.frame : resample(pass.frame, width);
      const scale = scaled.width / pass.frame.width;
      const label = `${pass.name}${scale === 1 ? "" : ` @${scaled.width}px`}`;
      const result = jsQR(scaled.rgba, scaled.width, scaled.height, {
        // jsQR never honours "onlyInvert" on its own — it leaves the inverted
        // matrix undefined and throws. An inverted pass is handed pixels that
        // are already the right polarity, so "dontInvert" is both correct and
        // the cheapest option.
        inversionAttempts: pass.inverted ? "dontInvert" : "attemptBoth",
      });
      attempts.push(`${label}: ${result ? "decoded" : "no lock"}`);
      if (!result) continue;
      record(
        symbolFrom(
          result,
          { ...pass.transform, scale: pass.transform.scale * scale },
          label,
          pass.inverted,
          flattened,
        ),
      );
      // A lock at full resolution is the usual case; stop shrinking once the
      // frame has produced something, unless more symbols are being hunted.
      if (profile !== "precise" && found.length) return;
    }
  };

  for (const pass of passes) {
    if (aborted()) break;
    runPass(pass);
  }

  // Multi-symbol stage.
  //
  // jsQR returns one symbol per call and, handed a 3,000 px screenshot, its
  // locator locks onto whichever symbol it finds first. Two complementary
  // strategies follow, because neither is sufficient alone:
  //
  //   1. a single-symbol pass at reduced width (handles a normal photo), then
  //   2. overlapping tiles at several grid densities (handles screenshots and
  //      collages, where symbols sit side by side).
  //
  // Tiles are overlapping by 20% so a symbol that straddles a tile boundary
  // still appears whole in the neighbouring tile. Every decode is a real
  // decoder return; tiles that contain nothing simply report nothing.
  if (profile !== "frame" && !aborted() && cropped.width >= 120) {
    const maxSide = 1600;
    const base =
      Math.max(cropped.width, cropped.height) > maxSide
        ? resample(
            cropped,
            Math.round(
              (cropped.width * maxSide) /
                Math.max(cropped.width, cropped.height),
            ),
          )
        : cropped;
    const baseScale = base.width / cropped.width;

    const tryFrame = (frame: Raster, label: string) => {
      const result = jsQR(frame.rgba, frame.width, frame.height, {
        inversionAttempts: "attemptBoth",
      });
      if (!result) return false;
      attempts.push(`${label}: decoded`);
      record(
        symbolFrom(
          result,
          { ...transform, scale: transform.scale * baseScale },
          label,
          false,
          flattened,
        ),
      );
      return true;
    };

    tryFrame(base, "multi-symbol frame");

    const gridDensities = [3, 2, 4];
    for (const tiles of gridDensities) {
      if (aborted()) break;
      // A tile must still be big enough for a symbol; skip pointless grids on
      // small frames rather than burning time on slices of nothing.
      if (base.width / tiles < 120) continue;
      for (let row = 0; row < tiles; row += 1) {
        for (let col = 0; col < tiles; col += 1) {
          if (aborted()) break;
          const tileW = Math.ceil(base.width / tiles);
          const tileH = Math.ceil(base.height / tiles);
          const padX = Math.round(tileW * 0.2);
          const padY = Math.round(tileH * 0.2);
          const x0 = Math.max(0, col * tileW - padX);
          const y0 = Math.max(0, row * tileH - padY);
          const x1 = Math.min(base.width, (col + 1) * tileW + padX);
          const y1 = Math.min(base.height, (row + 1) * tileH + padY);
          if (x1 - x0 < 40 || y1 - y0 < 40) continue;
          const tile = cropRaster(base, {
            x: x0 / base.width,
            y: y0 / base.height,
            width: (x1 - x0) / base.width,
            height: (y1 - y0) / base.height,
          });
          const result = jsQR(tile.rgba, tile.width, tile.height, {
            inversionAttempts: "attemptBoth",
          });
          if (!result) continue;
          attempts.push(`tile ${tiles}×${tiles} r${row}c${col}: decoded`);
          record(
            symbolFrom(
              result,
              {
                ...transform,
                regionX: x0,
                regionY: y0,
                scale: baseScale,
              },
              `tile ${tiles}×${tiles} r${row}c${col}`,
              false,
              flattened,
            ),
          );
        }
      }
      // Once the finest grid that can hold a symbol has been swept, there is
      // nothing coarser left to find.
    }
  }

  // Locator pass: aim the decoder at each region finder patterns support. This
  // reaches codes the tile sweep can miss — heavily skewed or partly occluded
  // symbols that straddle several tiles.
  if (profile === "precise" && !aborted()) {
    const regions = locateSymbolRegions(cropped);
    if (regions.length)
      attempts.push(`${regions.length} finder-pattern region(s)`);
    for (const region of regions.slice(0, 8)) {
      if (aborted()) break;
      const regionRaster = cropRaster(cropped, {
        x: region.x / cropped.width,
        y: region.y / cropped.height,
        width: region.size / cropped.width,
        height: region.size / cropped.height,
      });
      if (regionRaster.width < 24) continue;
      const lift = region.size < 420 ? Math.min(4, 1200 / region.size) : 1;
      const scaled =
        lift > 1
          ? resample(regionRaster, regionRaster.width * lift)
          : regionRaster;
      const result = jsQR(scaled.rgba, scaled.width, scaled.height, {
        inversionAttempts: "attemptBoth",
      });
      const label = `region ${Math.round(region.size)}px`;
      attempts.push(`${label}: ${result ? "decoded" : "no lock"}`);
      if (!result) continue;
      record(
        symbolFrom(
          result,
          { ...transform, regionX: region.x, regionY: region.y, scale: lift },
          label,
          false,
          flattened,
        ),
      );
    }
  }

  return { symbols: found, attempts };
}

/** Stable key for a decoded payload, used by duplicate detection and history. */
export function symbolKey(data: string): string {
  // A cheap FNV-1a over UTF-16 code units. Not a security hash — it only has to
  // be stable within a session and short enough to store.
  let hash = 0x811c9dc5;
  for (let index = 0; index < data.length; index += 1) {
    hash ^= data.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(36)}-${data.length}`;
}
