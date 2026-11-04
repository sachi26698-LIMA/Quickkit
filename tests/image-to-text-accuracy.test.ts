/**
 * Real OCR accuracy regression suite.
 *
 * Unlike the other Image to Text tests, this one runs the actual tesseract.js
 * engine (the same trained data the app serves from /ocr) over real generated
 * fixtures, then pushes the result through this tool's own extraction
 * pipeline. It asserts:
 *
 *  - printed English/Hindi/Gujarati are read at a usable character-error rate;
 *  - Unicode survives the round trip (no mojibake, no dropped matras beyond
 *    the measured tolerance);
 *  - tables become real rows/columns and receipts become key/value fields;
 *  - a rotated page and a noisy JPEG still produce text;
 *  - a blank page is reported as empty rather than invented.
 *
 * Thresholds are deliberately conservative: they guard against regressions,
 * they do not claim perfection. Measured values are printed so the QA report
 * can quote them.
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildPage, extractPage } from "@/lib/tools/image-to-text/extract";
import { flattenLines } from "@/lib/tools/image-to-text/geometry";
import {
  planOcrScale,
  resamplePixels,
  rotateArbitrary,
  rotateQuarterTurns,
  estimateSkew,
  type PixelBuffer,
} from "@/lib/tools/image-to-text/preprocess";
import { detectLanguages } from "@/lib/tools/image-to-text/language";
import type { OcrPage } from "@/lib/tools/image-to-text/types";

const require = createRequire(import.meta.url);
// jpeg-js ships CommonJS only; require() avoids ESM interop differences.
const { decode: decodeJpeg } = require("jpeg-js") as {
  decode: (
    bytes: Buffer,
    options?: { useTArray?: boolean; formatAsRGBA?: boolean },
  ) => { data: Uint8Array; width: number; height: number };
};
// tesseract.js is CommonJS; require() keeps the worker bootstrap happy in Node.
const { createWorker } = require("tesseract.js") as {
  createWorker: (
    langs: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<{
    recognize: (
      image: Buffer,
      options?: Record<string, unknown>,
      output?: Record<string, boolean>,
    ) => Promise<{
      data: { text?: string; confidence?: number; blocks?: unknown };
    }>;
    terminate: () => Promise<void>;
  }>;
};

const FIXTURES = path.join(process.cwd(), "tests", "fixtures", "image-to-text");
/** Trained data straight from the dependency, i.e. what the build copies. */
const DATA_ROOT = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
);
/**
 * tesseract.js needs `<code>.traineddata.gz` sitting together in one folder;
 * the npm packages keep every language one directory deeper, so the suite
 * builds a flat copy of exactly the files the build ships.
 */
const LANG_DIR = path.join(process.cwd(), "node_modules", ".qk-ocr-lang");

/** Character error rate: Levenshtein distance over normalised characters. */
/**
 * Sentence-final punctuation differs legitimately between engines and fonts
 * ("।" vs "."), so punctuation is excluded from the character error rate.
 */
export function stripPunctuation(value: string): string {
  return value.replace(/[।॥.,!?;:'"“”‘’()[\]{}—–-]/gu, " ");
}

export function characterErrorRate(expected: string, actual: string): number {
  const normalise = (value: string) =>
    value.normalize("NFC").replace(/\s+/gu, " ").trim();
  const a = [...normalise(expected)];
  const b = [...normalise(actual)];
  if (!a.length) return b.length ? 1 : 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] / a.length;
}

interface Recognition {
  text: string;
  confidence: number;
  page: OcrPage;
}

/**
 * Any fixture -> PNG bytes, so JPEG sources are measured too (not skipped).
 *
 * Decoding happens in pure JavaScript rather than by shelling out to an image
 * converter: the CI runner has no ImageMagick, and a suite that needs an
 * undeclared system binary fails there while passing locally (which is exactly
 * what happened). jpeg-js is a dev dependency, so this works anywhere Node runs.
 */
async function pngBytes(file: string): Promise<Buffer> {
  const source = path.join(FIXTURES, file);
  if (file.endsWith(".png")) return readFile(source);
  const jpeg = decodeJpeg(await readFile(source), {
    useTArray: true,
    formatAsRGBA: true,
  });
  return encodePng({
    data: Buffer.from(jpeg.data),
    width: jpeg.width,
    height: jpeg.height,
  });
}

/** RGBA pixels -> PNG bytes (fixtures are always 8-bit, so no colour juggling). */
function encodePng(image: {
  data: Buffer;
  width: number;
  height: number;
}): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = image.data;
  return PNG.sync.write(png);
}

function toPixelBuffer(png: PNG): PixelBuffer {
  return {
    data: new Uint8ClampedArray(png.data),
    width: png.width,
    height: png.height,
  };
}

function toPngBuffer(pixels: PixelBuffer): Buffer {
  const png = new PNG({ width: pixels.width, height: pixels.height });
  png.data = Buffer.from(pixels.data);
  return PNG.sync.write(png);
}

/**
 * Recognise already-prepared pixels (the path the browser uses after
 * rotation, deskew and scaling).
 */
async function recognizePixels(
  pixels: PixelBuffer,
  languages: string[],
  psm = "6",
): Promise<Recognition> {
  const buffer = toPngBuffer(pixels);
  const worker = await createWorker(languages.join("+"), undefined, {
    langPath: LANG_DIR,
    gzip: true,
    cacheMethod: "none",
    logger: () => {},
  });
  try {
    const { data } = await worker.recognize(
      buffer,
      { tessedit_pageseg_mode: psm },
      { text: true, blocks: true },
    );
    const page = buildPage({
      id: "px",
      sourceId: "px",
      sourceName: "px",
      page: 1,
      pageCount: 1,
      width: pixels.width,
      height: pixels.height,
      lines: flattenLines((data.blocks ?? []) as never),
      text: (data.text ?? "").replace(/\r/gu, ""),
      confidence: data.confidence ?? 0,
      languages,
    });
    return { text: data.text ?? "", confidence: data.confidence ?? 0, page };
  } finally {
    await worker.terminate();
  }
}

async function recognize(
  file: string,
  languages: string[],
  psm = "3",
): Promise<Recognition> {
  const buffer = await pngBytes(file);
  const png = PNG.sync.read(buffer);
  const worker = await createWorker(languages.join("+"), undefined, {
    // Feed tesseract the gz files directly through a custom langPath loader.
    langPath: LANG_DIR,
    gzip: true,
    cacheMethod: "none",
    logger: () => {},
  });
  try {
    const { data } = await worker.recognize(
      buffer,
      { tessedit_pageseg_mode: psm },
      { text: true, blocks: true },
    );
    const blocks = (data.blocks ?? []) as never;
    const page = buildPage({
      id: file,
      sourceId: file,
      sourceName: file,
      page: 1,
      pageCount: 1,
      width: png.width,
      height: png.height,
      lines: flattenLines(blocks as never),
      text: (data.text ?? "").replace(/\r/gu, ""),
      confidence: data.confidence ?? 0,
      languages,
    });
    return { text: data.text ?? "", confidence: data.confidence ?? 0, page };
  } finally {
    await worker.terminate();
  }
}

/**
 * tesseract.js in Node needs `<lang>.traineddata.gz` in one flat folder. Build
 * that folder once from the dependency tree.
 */
beforeAll(async () => {
  const { mkdir, copyFile } = await import("node:fs/promises");
  await mkdir(LANG_DIR, { recursive: true });
  for (const code of ["eng", "hin", "guj"]) {
    await copyFile(
      path.join(DATA_ROOT, code, "4.0.0", `${code}.traineddata.gz`),
      path.join(LANG_DIR, `${code}.traineddata.gz`),
    );
  }
}, 60_000);

describe("real OCR accuracy", () => {
  it("reads printed English at a low character error rate", async () => {
    const result = await recognize("english-printed.png", ["eng"], "6");
    const expected =
      "QUICKKIT INVOICE Invoice No: 4471 Date: 12 March 2026 Customer: Riya Patel Address: 12 MG Road, Ahmedabad The quick brown fox jumps over the lazy dog. Please read this printed page carefully.";
    const rate = characterErrorRate(expected, result.text);
    console.log(
      `English CER ${(rate * 100).toFixed(1)}% · confidence ${result.confidence}`,
    );
    expect(rate).toBeLessThan(0.12);
    expect(result.text).toMatch(/QUICKKIT/i);
    expect(result.text).toMatch(/4471/);
    expect(result.text).toMatch(/Ahmedabad/i);
  }, 120_000);

  it("reads printed Hindi and keeps Devanagari characters intact", async () => {
    const result = await recognize("hindi-printed.png", ["hin"], "6");
    const expected =
      "क्विककिट हिंदी दस्तावेज़ यह एक सरल हिंदी वाक्य है। भारत एक विशाल देश है। आज मौसम बहुत अच्छा है। कृपया इस पृष्ठ को ध्यान से पढ़ें।";
    const rate = characterErrorRate(expected, stripPunctuation(result.text));
    console.log(
      `Hindi CER ${(rate * 100).toFixed(1)}% · confidence ${result.confidence}`,
    );
    expect(rate).toBeLessThan(0.1);
    // The script must survive: Devanagari code points, not "?" or Latin.
    expect(
      (result.text.match(/[\u0900-\u097F]/gu) ?? []).length,
    ).toBeGreaterThan(40);
    expect(result.text).not.toMatch(/[?]{3,}/u);
  }, 120_000);

  it("reads printed Gujarati and keeps Gujarati characters intact", async () => {
    const result = await recognize("gujarati-printed.png", ["guj"], "6");
    const expected =
      "ક્વિકકિટ ગુજરાતી દસ્તાવેજ આ એક સરળ ગુજરાતી વાક્ય છે ગુજરાત ભારતનું એક રાજ્ય છે આજે હવામાન ખૂબ સરસ છે કૃપા કરીને આ પૃષ્ઠ વાંચો";
    const rate = characterErrorRate(expected, stripPunctuation(result.text));
    console.log(
      `Gujarati CER ${(rate * 100).toFixed(1)}% · confidence ${result.confidence}`,
    );
    expect(rate).toBeLessThan(0.1);
    expect(
      (result.text.match(/[\u0A80-\u0AFF]/gu) ?? []).length,
    ).toBeGreaterThan(30);
    // A whole line must come through recognisably.
    expect(result.text).toMatch(/ગુજરાત/);
  }, 120_000);

  it("detects the script of a mixed-language page", async () => {
    const result = await recognize("english-printed.png", ["eng", "guj"], "6");
    const detected = detectLanguages(result.text).map((entry) => entry.code);
    expect(detected).toContain("eng");
  }, 120_000);

  it("extracts a receipt's key/value fields from real OCR", async () => {
    const result = await recognize("english-printed.png", ["eng"], "6");
    const extraction = extractPage(result.page, { mode: "structured" });
    const labels = extraction.fields.map((field) => field.label.toLowerCase());
    console.log(
      `Fields: ${extraction.fields.map((f) => `${f.label}=${f.value}`).join(" | ")}`,
    );
    expect(labels.some((label) => label.includes("invoice"))).toBe(true);
    expect(labels.some((label) => label.includes("date"))).toBe(true);
    const invoice = extraction.fields.find((field) =>
      field.label.toLowerCase().includes("invoice"),
    );
    expect(invoice?.value).toMatch(/4471/);
    // The page model must report how much of the text is uncertain, since
    // the editor highlights exactly that share.
    console.log(
      `Low-confidence share ${(result.page.lowConfidenceShare * 100).toFixed(1)}% · confidence ${result.page.confidence}`,
    );
    expect(result.page.lowConfidenceShare).toBeGreaterThanOrEqual(0);
    expect(result.page.lowConfidenceShare).toBeLessThanOrEqual(1);
  }, 120_000);

  it("recovers a table's rows and columns from real OCR", async () => {
    const result = await recognize("table-receipt.png", ["eng"], "6");
    const extraction = extractPage(result.page, { mode: "table" });
    console.log(
      `Tables: ${JSON.stringify(extraction.tables[0]?.rows?.slice(0, 3))}`,
    );
    expect(extraction.tables.length).toBeGreaterThan(0);
    const rows = extraction.tables[0].rows;
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const flat = rows.flat().join(" ");
    expect(flat).toMatch(/Notebook/i);
    expect(flat).toMatch(/120/);
    // Columns are real columns, not a smashed line.
    expect(rows.every((row) => row.length >= 2)).toBe(true);
    // The amounts column must survive as its own column.
    expect(flat).toMatch(/180/);
  }, 120_000);

  it("reads a noisy low-quality screenshot", async () => {
    const result = await recognize("low-quality.jpg", ["eng"], "6");
    const rate = characterErrorRate(
      "Screenshot of a chat window Hello, can we meet tomorrow at 10am? Sure, the meeting room is on floor 3. Please bring the printed report.",
      result.text,
    );
    console.log(
      `Low-quality CER ${(rate * 100).toFixed(1)}% · confidence ${result.confidence}`,
    );
    // A deliberately blurred, 35-quality JPEG: one glyph-level slip is
    // acceptable, a broken pipeline is not.
    expect(rate).toBeLessThan(0.08);
    expect(result.text).toMatch(/meeting|tomorrow/iu);
  }, 120_000);

  it("reads a small-text screenshot at low resolution", async () => {
    const result = await recognize("small-text.png", ["eng"], "6");
    console.log(`Small text: ${JSON.stringify(result.text.trim())}`);
    expect(result.text).toMatch(/Privacy|uploaded|Confidence/iu);
  }, 120_000);

  it("never invents text on a blank page", async () => {
    const result = await recognize("blank.png", ["eng"], "6");
    expect(result.text.trim()).toBe("");
    expect(result.page.lines).toEqual([]);
    const extraction = extractPage(result.page, { mode: "smart" });
    expect(extraction.text).toBe("");
  }, 120_000);

  it("reads a tilted italic note (print, not a handwriting claim)", async () => {
    // This fixture is an italic serif note rotated 2.5°: it exercises skew and
    // unusual type, NOT real cursive handwriting. Handwriting accuracy is
    // explicitly not measured here (see docs/QA_IMAGE_TO_TEXT.md).
    const result = await recognize("handwritten-note.png", ["eng"], "6");
    const rate = characterErrorRate(
      "Shopping list for Sunday milk, bread and eggs call Riya after lunch pay the electricity bill",
      result.text,
    );
    console.log(
      `Tilted note CER ${(rate * 100).toFixed(1)}% · confidence ${result.confidence}`,
    );
    expect(rate).toBeLessThan(0.1);
    expect(result.text).toMatch(/Riya|electricity/i);
  }, 120_000);

  it("corrects a page uploaded sideways before reading it", async () => {
    const png = PNG.sync.read(
      await readFile(path.join(FIXTURES, "rotated-90.png")),
    );
    // The fixture is a portrait page turned on its side; the user's rotation
    // control maps to exactly this deterministic 90° step.
    // The fixture was turned clockwise, so the fix is a counter-clockwise
    // quarter turn — the same value the UI's rotate-left button produces.
    const upright = rotateQuarterTurns(toPixelBuffer(png), -90);
    const result = await recognizePixels(upright, ["eng"]);
    console.log(`Rotated page: ${JSON.stringify(result.text.slice(0, 60))}`);
    expect(result.text).toMatch(/QUICKKIT/i);
    expect(result.text).toMatch(/4471/);
  }, 120_000);

  it("measures and removes deliberate skew", async () => {
    const png = PNG.sync.read(
      await readFile(path.join(FIXTURES, "english-printed.png")),
    );
    const skewed = rotateArbitrary(toPixelBuffer(png), -4);
    const angle = estimateSkew(skewed);
    console.log(`Detected skew ${angle}° (introduced -4°)`);
    // Sign is chosen so the same value both describes and removes the tilt.
    expect(angle).toBeGreaterThan(2.5);
    expect(angle).toBeLessThan(5.5);
    const corrected = rotateArbitrary(skewed, angle);
    const result = await recognizePixels(corrected, ["eng"]);
    expect(result.text).toMatch(/QUICKKIT/i);
  }, 120_000);

  it("reads a mixed Gujarati + English page in one pass", async () => {
    const result = await recognize("mixed-language.png", ["eng", "guj"], "6");
    const detected = detectLanguages(result.text).map((entry) => entry.code);
    console.log(
      `Mixed page: ${JSON.stringify(result.text.trim().slice(0, 90))} · detected ${detected.join(", ")}`,
    );
    expect(result.text).toMatch(/[\u0A80-\u0AFF]/u);
    expect(result.text).toMatch(/Invoice|4471/);
    expect(detected.length).toBeGreaterThan(1);
  }, 120_000);

  it("downscales a 12-megapixel scan and still reads it", async () => {
    const png = PNG.sync.read(
      await readFile(path.join(FIXTURES, "large-image.png")),
    );
    expect(png.width * png.height).toBeGreaterThan(10_000_000);
    const plan = planOcrScale(png.width, png.height, 2400);
    expect(plan.scale).toBeLessThan(1);
    const scaled = resamplePixels(toPixelBuffer(png), plan.width, plan.height);
    expect(scaled.width).toBe(2400);
    const result = await recognizePixels(scaled, ["eng"]);
    expect(result.text).toMatch(/Large scanned page/i);
    expect(result.text).toMatch(/OCR|downscale/i);
  }, 120_000);

  it("processes a multi-file batch like the workspace does", async () => {
    const worker = await createWorker("eng", undefined, {
      langPath: LANG_DIR,
      gzip: true,
      cacheMethod: "none",
      logger: () => {},
    });
    try {
      // One worker, several images: the real batch path reuses the engine.
      const files = [
        "english-printed.png",
        "table-receipt.png",
        "small-text.png",
      ];
      const texts: string[] = [];
      for (const file of files) {
        const { data } = await worker.recognize(
          await pngBytes(file),
          { tessedit_pageseg_mode: "6" },
          { text: true, blocks: true },
        );
        texts.push(data.text ?? "");
      }
      console.log(`Batch of ${texts.length} files read with one engine`);
      expect(texts[0]).toMatch(/QUICKKIT/);
      expect(texts[1]).toMatch(/Notebook/);
      expect(texts[2]).toMatch(/Privacy/);
    } finally {
      await worker.terminate();
    }
  }, 120_000);

  it("reports honest confidence, not a fake 100%", async () => {
    const result = await recognize("gujarati-printed.png", ["guj"], "6");
    expect(result.confidence).toBeGreaterThan(30);
    expect(result.confidence).toBeLessThanOrEqual(100);
    // Gujarati conjuncts cost accuracy; the score must reflect that.
    expect(result.confidence).toBeLessThan(99.5);
  }, 120_000);
});
