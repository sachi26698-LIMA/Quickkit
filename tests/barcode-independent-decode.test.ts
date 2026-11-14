/**
 * Independent decode verification for the Barcode Generator.
 *
 * The product's own round-trip check uses `@zxing/library` in JavaScript
 * (`lib/tools/barcode/verify.ts`). That proves the layout matches the encoder's
 * intent, but it shares a port with the generator's decoder expectations. This
 * test decodes the same rendered rasters with **zxing-wasm** — the C++ ZXing
 * core compiled to WebAssembly, a separate implementation — so a symbol is only
 * "verified" here if an unrelated reader agrees.
 *
 * Nothing leaves the machine: the WASM binary is read from node_modules.
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { buildBarcode } from "@/lib/tools/barcode/encode";
import { buildLayout } from "@/lib/tools/barcode/layout";
import { rasterizeLayout } from "@/lib/tools/barcode/raster";
import type { BarcodeFormatId, BarcodeSpec } from "@/lib/tools/barcode/types";

const require = createRequire(import.meta.url);

type Reader =
  "Code128" | "Code39" | "EAN13" | "EAN8" | "UPCA" | "ITF" | "Codabar";

function specFor(format: BarcodeFormatId, data: string): BarcodeSpec {
  const result = buildBarcode(format, data);
  if (!result.ok)
    throw new Error(
      `${format} rejected ${data}: ${JSON.stringify(result.problems)}`,
    );
  return result.spec;
}

function asImage(rgba: Uint8ClampedArray, width: number, height: number) {
  // This suite runs in the Node environment, which has no `ImageData`
  // constructor. The reader only ever reads `data`, `width` and `height`; the
  // DOM type additionally declares `colorSpace`, so that field is supplied to
  // keep the structural type honest instead of casting a bare literal.
  return {
    data: rgba,
    width,
    height,
    colorSpace: "srgb",
  } as unknown as ImageData;
}

function imageOf(spec: BarcodeSpec, moduleWidth = 3) {
  const layout = buildLayout({ spec, options: { moduleWidth } });
  const raster = rasterizeLayout(layout, { scale: 2 });
  return asImage(
    new Uint8ClampedArray(raster.rgba),
    raster.width,
    raster.height,
  );
}

async function read(spec: BarcodeSpec, format: Reader) {
  const results = await readBarcodes(imageOf(spec), {
    formats: [format],
    tryHarder: true,
  });
  return results.map((entry) => entry.text);
}

beforeAll(async () => {
  const entry = require.resolve("zxing-wasm/reader");
  const wasm = await readFile(
    join(dirname(entry), "../../reader/zxing_reader.wasm"),
  );
  await prepareZXingModule({
    overrides: { wasmBinary: wasm },
    fireImmediately: true,
  });
});

describe("zxing-wasm reads what the generator renders", () => {
  it("agrees on EAN-13", async () => {
    const spec = specFor("ean13", "5901234123457");
    expect(await read(spec, "EAN13")).toContain(spec.value);
  });

  it("agrees on EAN-8", async () => {
    const spec = specFor("ean8", "96385074");
    expect(await read(spec, "EAN8")).toContain(spec.value);
  });

  it("agrees on UPC-A", async () => {
    const spec = specFor("upca", "036000291452");
    // ZXing's UPC-A reader reports the EAN-13 form with a leading zero, so the
    // zeros are stripped before comparing the 12 significant digits.
    const found = await read(spec, "UPCA");
    expect(found.map((value) => value.replace(/^0+/, ""))).toContain(
      spec.value.replace(/^0+/, ""),
    );
  });

  it("agrees on Code 128", async () => {
    const spec = specFor("code128", "QUICKKIT-2026");
    expect(await read(spec, "Code128")).toContain(spec.value);
  });

  it("agrees on Code 39", async () => {
    const spec = specFor("code39", "QUICKKIT39");
    expect(await read(spec, "Code39")).toContain(spec.value);
  });

  it("agrees on ITF-14", async () => {
    const spec = specFor("itf14", "10012345678902");
    const found = await read(spec, "ITF");
    expect(found.join(" ")).toContain(spec.value);
  });

  it("agrees on Codabar", async () => {
    const spec = specFor("codabar", "A123456789A");
    const found = await read(spec, "Codabar");
    expect(found.join(" ").replace(/[^0-9]/g, "")).toContain(
      spec.value.replace(/[^0-9]/g, ""),
    );
  });

  it("still reads a narrow-module label", async () => {
    const spec = specFor("ean13", "5901234123457");
    const results = await readBarcodes(imageOf(spec, 2), {
      formats: ["EAN13"],
    });
    expect(results.map((entry) => entry.text)).toContain(spec.value);
  });

  it("reads nothing from a blank raster (the decoder is not hallucinating)", async () => {
    const width = 320;
    const height = 160;
    const blank = new Uint8ClampedArray(width * height * 4).fill(255);
    const results = await readBarcodes(asImage(blank, width, height), {
      formats: ["EAN13", "Code128"],
    });
    expect(results).toEqual([]);
  });
});
