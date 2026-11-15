/**
 * 2D symbols: QR, GS1 QR, Data Matrix and PDF417.
 *
 * The generator delegates encoding to BWIPP (`bwip-js`); the test rasterises the
 * exact SVG the product hands to the user and decodes it with zxing-wasm (C++
 * ZXing). Encoder and decoder therefore share no code.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import {
  TWO_D_FORMATS,
  buildTwoD,
  validateTwoD,
} from "@/lib/tools/barcode/twod";
import { asImage, readImage, type ReadOptions } from "./helpers/zxing-reader";

async function decodeSvg(
  svg: string,
  formats: string[],
  options: ReadOptions = {},
) {
  const image = await loadImage(Buffer.from(svg));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(
    0,
    0,
    image.width,
    image.height,
  );
  return readImage(asImage(data, width, height), formats, options);
}

function svgFor(
  format: Parameters<typeof buildTwoD>[0],
  text: string,
  options?: Parameters<typeof buildTwoD>[2],
) {
  const result = buildTwoD(format, text, options);
  if (!result.ok)
    throw new Error(`${format} failed: ${JSON.stringify(result.problems)}`);
  return result;
}

describe("2D catalogue", () => {
  it("lists four formats with honest metadata", () => {
    expect(TWO_D_FORMATS.map((format) => format.id)).toEqual([
      "qrcode",
      "gs1qrcode",
      "datamatrix",
      "pdf417",
    ]);
    for (const format of TWO_D_FORMATS) {
      expect(format.rules.length).toBeGreaterThanOrEqual(3);
      expect(format.example.length).toBeGreaterThan(3);
      expect(format.humanReadable).toBe(false);
    }
  });
});

describe("2D validation", () => {
  it("rejects empty data", () => {
    const result = validateTwoD("qrcode", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("empty");
  });

  it("rejects data above the format capacity", () => {
    const result = validateTwoD("datamatrix", "x".repeat(1600));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("length");
  });

  it("refuses a GS1 QR Code whose data is not GS1", () => {
    const result = validateTwoD("gs1qrcode", "https://example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("gs1-syntax");
  });

  it("refuses a GS1 QR Code that does not start with a primary identifier", () => {
    const result = validateTwoD("gs1qrcode", "(10)LOT-42(17)251231");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("gs1-ai");
  });

  it("refuses a GS1 GTIN with a broken check digit", () => {
    const result = validateTwoD("gs1qrcode", "(01)09506000134353(17)251231");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0].code).toBe("gs1-check");
  });
});

describe("2D decoding by an independent reader", () => {
  it("reads back a QR Code", async () => {
    const svg = svgFor("qrcode", "https://quickkit.online/tools").svg;
    expect(await decodeSvg(svg, ["QRCode"])).toContain(
      "https://quickkit.online/tools",
    );
  });

  it("reads back a QR Code at every error-correction level", async () => {
    for (const ecLevel of ["L", "M", "Q", "H"] as const) {
      const result = svgFor("qrcode", `QUICKKIT-${ecLevel}`, { ecLevel });
      expect(result.notes.join(" ")).toContain(`Error correction ${ecLevel}`);
      expect(await decodeSvg(result.svg, ["QRCode"])).toContain(
        `QUICKKIT-${ecLevel}`,
      );
    }
  });

  it("reads back a GS1 QR Code with a real FNC1", async () => {
    // A variable-length AI (10) placed before another AI forces a GS separator,
    // which is what proves the encoder inserted FNC1 rather than brackets.
    const result = svgFor(
      "gs1qrcode",
      "(01)09506000134352(10)LOT-42(17)251231",
    );

    // HRI mode is what a GS1-aware scanner shows.
    expect(await decodeSvg(result.svg, ["QRCode"])).toContain(
      "(01)09506000134352(10)LOT-42(17)251231",
    );

    // Plain mode exposes the element string: no brackets, and a GS (0x1D)
    // between the batch and the following expiry date.
    const [plain] = await decodeSvg(result.svg, ["QRCode"], {
      textMode: "Plain",
    });
    expect(plain.startsWith("010950600013435210LOT-42")).toBe(true);
    expect(plain).toContain("\u001d");
    expect(plain).not.toContain("(");
    expect(plain.endsWith("17251231")).toBe(true);
  });

  it("reads back a Data Matrix", async () => {
    const svg = svgFor("datamatrix", "QK-2026-0001").svg;
    expect(await decodeSvg(svg, ["DataMatrix"])).toContain("QK-2026-0001");
  });

  it("reads back a PDF417", async () => {
    const svg = svgFor("pdf417", "QUICKKIT|2026|A1B2C3", {
      pdf417Level: 5,
    }).svg;
    expect(await decodeSvg(svg, ["PDF417"])).toContain("QUICKKIT|2026|A1B2C3");
  });

  it("keeps a QR Code readable with a custom ink colour", async () => {
    const svg = svgFor("qrcode", "COLOUR-INK", {
      foreground: "#111827",
      background: "#ffffff",
    }).svg;
    expect(svg).toContain("#111827");
    expect(await decodeSvg(svg, ["QRCode"])).toContain("COLOUR-INK");
  });
});
