/**
 * Shared zxing-wasm helper for the independent-decode tests.
 *
 * zxing-wasm is the C++ ZXing core compiled to WASI: a reader that shares no
 * code with `lib/tools/barcode`. The WASM binary is loaded from node_modules, so
 * the tests stay offline.
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

const require = createRequire(import.meta.url);

let ready: Promise<void> | null = null;

export function prepareReader() {
  ready ??= (async () => {
    const entry = require.resolve("zxing-wasm/reader");
    const wasm = await readFile(
      join(dirname(entry), "../../reader/zxing_reader.wasm"),
    );
    await prepareZXingModule({
      overrides: { wasmBinary: wasm },
      fireImmediately: true,
    });
  })();
  return ready;
}

/** Node has no `ImageData`; the reader reads data/width/height only. */
export function asImage(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  return {
    data: rgba,
    width,
    height,
    colorSpace: "srgb",
  } as unknown as ImageData;
}

export type ReadOptions = {
  /** zxing-wasm defaults to HRI; "Plain" returns the raw element string. */
  textMode?: "Plain" | "HRI" | "Hex" | "Escaped";
};

export async function readImage(
  image: ImageData,
  formats: string[],
  options: ReadOptions = {},
): Promise<string[]> {
  await prepareReader();
  const results = await readBarcodes(image, {
    formats,
    tryHarder: true,
    ...(options.textMode ? { textMode: options.textMode } : {}),
  } as Parameters<typeof readBarcodes>[1]);
  return results.map((entry) => entry.text);
}
