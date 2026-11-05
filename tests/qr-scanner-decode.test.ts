/**
 * The scanner engine, exercised on *real* QR pixels.
 *
 * Nothing here is mocked: symbols are rendered with the `qrcode` encoder the QR
 * Code Generator already ships, then read back through the same decode ladder
 * the browser uses. Every case that claims "this decodes" is a genuine decoder
 * round-trip, and every case that claims "this does not decode" is a genuine
 * miss — which is the half that matters most, because a scanner that invents
 * payloads is worse than no scanner at all.
 */
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { decodeRaster, symbolKey } from "../lib/tools/qr-scanner/decoder";
import { locateSymbolRegions } from "../lib/tools/qr-scanner/locator";
import {
  applyContrast,
  cropRaster,
  invertGrey,
  otsuThreshold,
  resample,
  rotateRaster,
  toGreyscale,
  greyToRaster,
} from "../lib/tools/qr-scanner/raster";
import type { Raster } from "../lib/tools/qr-scanner/types";

/** Render a QR to a plain RGBA raster using the `qrcode` package. */
async function renderQr(
  text: string,
  size = 420,
  options: { margin?: number; dark?: string; light?: string } = {},
): Promise<Raster> {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const modules = qr.modules.size;
  const margin = options.margin ?? 4;
  const total = modules + margin * 2;
  const rgba = new Uint8ClampedArray(size * size * 4);
  const darkRgb = options.dark ?? "#000000";
  const lightRgb = options.light ?? "#ffffff";
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const dark = parse(darkRgb);
  const light = parse(lightRgb);
  for (let y = 0; y < size; y += 1) {
    const row = Math.floor((y * total) / size) - margin;
    for (let x = 0; x < size; x += 1) {
      const col = Math.floor((x * total) / size) - margin;
      const on =
        row >= 0 && col >= 0 && row < modules && col < modules
          ? qr.modules.get(row, col) === 1
          : false;
      const rgb = on ? dark : light;
      const offset = (y * size + x) * 4;
      rgba[offset] = rgb[0];
      rgba[offset + 1] = rgb[1];
      rgba[offset + 2] = rgb[2];
      rgba[offset + 3] = 255;
    }
  }
  return { width: size, height: size, rgba };
}

/** Place a raster inside a larger white canvas at an offset. */
function pad(
  base: Raster,
  size: number,
  offsetX: number,
  offsetY: number,
): Raster {
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < base.height; y += 1)
    for (let x = 0; x < base.width; x += 1) {
      const source = (y * base.width + x) * 4;
      const target = ((y + offsetY) * size + x + offsetX) * 4;
      rgba[target] = base.rgba[source];
      rgba[target + 1] = base.rgba[source + 1];
      rgba[target + 2] = base.rgba[source + 2];
      rgba[target + 3] = 255;
    }
  return { width: size, height: size, rgba };
}

describe("QR scanner — real decoding", () => {
  it("decodes a clean, correctly rendered QR code", async () => {
    const text = "https://quickkit.example/tools/qr-code-scanner";
    const raster = await renderQr(text);
    const { symbols, attempts } = decodeRaster({ raster });
    expect(symbols).toHaveLength(1);
    expect(symbols[0].data).toBe(text);
    expect(symbols[0].version).toBeGreaterThan(0);
    expect(attempts.length).toBeGreaterThan(0);
    // Corners must land inside the source frame.
    for (const corner of Object.values(symbols[0].corners)) {
      expect(corner.x).toBeGreaterThanOrEqual(0);
      expect(corner.x).toBeLessThanOrEqual(raster.width);
      expect(corner.y).toBeGreaterThanOrEqual(0);
      expect(corner.y).toBeLessThanOrEqual(raster.height);
    }
  });

  it("never invents a payload for an image with no QR code", async () => {
    const size = 320;
    const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
    // A plain grey gradient — plenty of contrast, but no symbol.
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1) {
        const value = (x * 255) / size;
        const offset = (y * size + x) * 4;
        rgba[offset] = value;
        rgba[offset + 1] = value;
        rgba[offset + 2] = value;
        rgba[offset + 3] = 255;
      }
    const { symbols, attempts } = decodeRaster({
      raster: { width: size, height: size, rgba },
    });
    expect(symbols).toEqual([]);
    expect(attempts.some((entry) => entry.includes("no lock"))).toBe(true);
  });

  it("decodes an inverted (light-on-dark) code", async () => {
    const text = "INVERTED-PAYLOAD-42";
    const raster = await renderQr(text, 420, {
      dark: "#ffffff",
      light: "#101010",
    });
    const { symbols } = decodeRaster({ raster });
    expect(symbols.map((symbol) => symbol.data)).toContain(text);
    expect(symbols[0].inverted).toBe(true);
  });

  it("decodes a rotated code", async () => {
    const text = "https://quickkit.example/rotated";
    const raster = await renderQr(text);
    for (const rotation of [90, 180, 270] as const) {
      const { symbols } = decodeRaster({
        raster,
        profile: "precise",
        adjustments: { rotation },
      });
      expect(
        symbols.map((symbol) => symbol.data),
        `rotation ${rotation}°`,
      ).toContain(text);
    }
  });

  it("decodes a low-contrast code after preprocessing", async () => {
    const text = "https://quickkit.example/faint";
    const raster = await renderQr(text, 420, {
      dark: "#5b5b5b",
      light: "#b9b9b9",
    });
    const { symbols } = decodeRaster({ raster, profile: "precise" });
    expect(symbols.map((symbol) => symbol.data)).toContain(text);
  });

  it("decodes a downscaled code that is too small at full resolution", async () => {
    const text = "small-code";
    const raster = await renderQr(text, 240, { margin: 2 });
    // Deliberately destroy detail, then confirm the ladder still finds it.
    const shrunk = resample(raster, 150);
    const { symbols } = decodeRaster({ raster: shrunk, profile: "precise" });
    expect(symbols.map((symbol) => symbol.data)).toContain(text);
  });

  it("extracts every code from an image containing several", async () => {
    const codes = [
      "https://a.example/one",
      "WIFI:S:KitchenNet;T:WPA;P:not-a-real-password;;",
      "BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nEND:VCARD",
    ];
    const size = 900;
    const cell = 300;
    const canvas: Raster = {
      width: size,
      height: size,
      rgba: new Uint8ClampedArray(size * size * 4).fill(255),
    };
    for (const [index, text] of codes.entries()) {
      const qr = await renderQr(text, cell);
      const x = (index % 3) * cell;
      const y = Math.floor(index / 3) * cell;
      for (let py = 0; py < cell; py += 1)
        for (let px = 0; px < cell; px += 1) {
          const source = (py * cell + px) * 4;
          const target = ((py + y) * size + px + x) * 4;
          canvas.rgba[target] = qr.rgba[source];
          canvas.rgba[target + 1] = qr.rgba[source + 1];
          canvas.rgba[target + 2] = qr.rgba[source + 2];
          canvas.rgba[target + 3] = 255;
        }
    }
    const { symbols } = decodeRaster({ raster: canvas });
    const decoded = symbols.map((symbol) => symbol.data);
    expect(decoded).toEqual(expect.arrayContaining(codes));
  });

  it("locates finder patterns in a padded screenshot", async () => {
    const raster = pad(await renderQr("region-test", 260), 700, 210, 220);
    const regions = locateSymbolRegions(raster);
    expect(regions.length).toBeGreaterThan(0);
    const overlap = regions.some(
      (region) =>
        region.x <= 240 &&
        region.y <= 250 &&
        region.x + region.size >= 500 &&
        region.y + region.size >= 500,
    );
    expect(overlap, "a region covers the symbol").toBe(true);
  });

  it("reports a version and raw bytes for every decode", async () => {
    const text = "unicode ✓ payload — with accents é";
    const raster = await renderQr(text);
    const { symbols } = decodeRaster({ raster });
    expect(symbols[0].data).toBe(text);
    expect(symbols[0].bytes.length).toBeGreaterThan(0);
    expect(Array.from(symbols[0].bytes).length).toBeGreaterThan(0);
  });

  it("keeps the payload exactly as encoded, including whitespace", async () => {
    const text = "  spaced\ntext\twith tabs  ";
    const raster = await renderQr(text, 460);
    const { symbols } = decodeRaster({ raster });
    expect(symbols[0].data).toBe(text);
  });

  it("de-duplicates the same payload decoded through several passes", async () => {
    const raster = await renderQr("https://dedupe.example");
    const { symbols } = decodeRaster({ raster, profile: "precise" });
    expect(symbols).toHaveLength(1);
  });

  it("stops when the signal is aborted", async () => {
    const raster = await renderQr("https://abort.example");
    const controller = new AbortController();
    controller.abort();
    const { symbols } = decodeRaster({ raster, signal: controller.signal });
    expect(symbols).toEqual([]);
  });
});

describe("QR scanner — raster primitives", () => {
  const sample = (): Raster => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let index = 0; index < 16; index += 1) {
      rgba[index * 4] = index * 16;
      rgba[index * 4 + 1] = index * 16;
      rgba[index * 4 + 2] = index * 16;
      rgba[index * 4 + 3] = 255;
    }
    return { width: 4, height: 4, rgba };
  };

  it("rotates four quarter turns back to the original", () => {
    const original = sample();
    let current = original;
    for (let turn = 0; turn < 4; turn += 1) current = rotateRaster(current, 90);
    expect(current.width).toBe(original.width);
    expect(Array.from(current.rgba)).toEqual(Array.from(original.rgba));
  });

  it("swaps width and height on a quarter turn", () => {
    const wide: Raster = {
      width: 6,
      height: 2,
      rgba: new Uint8ClampedArray(6 * 2 * 4).fill(200),
    };
    const rotated = rotateRaster(wide, 90);
    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(6);
  });

  it("clamps out-of-range crops instead of producing empty pixels", () => {
    const cropped = cropRaster(sample(), { x: -1, y: -1, width: 3, height: 3 });
    expect(cropped.width).toBe(4);
    expect(cropped.height).toBe(4);
  });

  it("falls back to the full frame for a degenerate crop", () => {
    const cropped = cropRaster(sample(), {
      x: 0.9,
      y: 0.9,
      width: 0.01,
      height: 0.01,
    });
    expect(cropped.width).toBe(4);
  });

  it("computes a real Otsu threshold for a bimodal image", () => {
    const grey = new Uint8ClampedArray(100);
    for (let index = 0; index < 50; index += 1) grey[index] = 20;
    for (let index = 50; index < 100; index += 1) grey[index] = 230;
    const threshold = otsuThreshold(grey);
    expect(threshold).not.toBeNull();
    expect(threshold!).toBeGreaterThan(20);
    expect(threshold!).toBeLessThan(230);
  });

  it("declines to threshold a flat image", () => {
    expect(otsuThreshold(new Uint8ClampedArray(64).fill(128))).toBeNull();
  });

  it("inverts luminance without changing length", () => {
    const grey = new Uint8ClampedArray([0, 64, 255]);
    expect(Array.from(invertGrey(grey))).toEqual([255, 191, 0]);
  });

  it("keeps mid-grey fixed when boosting contrast", () => {
    const grey = new Uint8ClampedArray([128]);
    expect(Array.from(applyContrast(grey, 2))).toEqual([128]);
  });

  it("resamples to an exact width and preserves aspect ratio", () => {
    const wide: Raster = {
      width: 100,
      height: 50,
      rgba: new Uint8ClampedArray(100 * 50 * 4).fill(255),
    };
    const resized = resample(wide, 40);
    expect(resized.width).toBe(40);
    expect(resized.height).toBe(20);
  });

  it("produces a greyscale of exactly one byte per pixel", () => {
    expect(toGreyscale(sample()).length).toBe(16);
  });

  it("round-trips greyscale back to RGBA", () => {
    const grey = new Uint8ClampedArray([0, 128, 255, 7]);
    const raster = greyToRaster(grey, 2, 2);
    expect(raster.rgba.length).toBe(16);
    expect(raster.rgba[4]).toBe(128);
    expect(raster.rgba[7]).toBe(255);
  });

  it("produces a stable, distinct key per payload", () => {
    expect(symbolKey("abc")).toBe(symbolKey("abc"));
    expect(symbolKey("abc")).not.toBe(symbolKey("abd"));
    expect(symbolKey("abc")).not.toBe(symbolKey("ab"));
  });
});
