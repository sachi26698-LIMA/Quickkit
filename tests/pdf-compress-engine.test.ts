import { PDFDocument, PDFName, PDFNumber, PDFStream } from "@cantoo/pdf-lib";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  compressPdfBytes,
  inflateFlateBytesCapped,
  inspectPdfForCompression,
  parseJpegInfo,
  reversePdfFlatePredictor,
  type PdfImageCodec,
} from "../lib/tools/pdf/compress-engine";
import { presetSettings } from "../lib/tools/pdf/compress-pdf-logic";
import { PdfMergeError } from "../lib/tools/pdf/merge-pdf-logic";
import {
  createImageHeavyPdf,
  createUncompressedTextPdf,
} from "./tools/pdf-compress-fixtures";
import {
  createSignedLikePdf,
  createXfaLikePdf,
  pageMarkerText,
} from "./tools/pdf-merge-fixtures";

const SMALL_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAgACADASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAABAUBAwYC/8QAJhAAAQMDBAIBBQAAAAAAAAAAAQIDEQAEEgUhMVETQSIGFIGhsf/EABgBAAMBAQAAAAAAAAAAAAAAAAAEBQMG/8QAHBEAAgIDAQEAAAAAAAAAAAAAAQIAAwQRITES/9oADAMBAAIRAxEAPwB47cpvLfJJGQ9gQCKSXiEPtkxipB3EUrtdQWxikKKm/wCVN7ehaFYqA25nmnXerehCjIRbvncruApgqEjjbbkUC+4fivygEH9Vy/dLdYnISmZ23qtSm3WclmZ2KT6oW1qwOzHJSzoHhlF15GVhKSrCZnruhHdTM4OLhPfdEXjTy2wG3MSnkEUkuH0AEOD5J4qVSXUgN2LKrMQWE2+ks295bgAQobg0FqFt9o/BEQfxQH09qarN5IMlB7rQPONaiVJSUkxIB91SqQPwzsMTCDp3wz//2Q==";
const SMALL_JPEG = Uint8Array.from(atob(SMALL_JPEG_BASE64), (character) =>
  character.charCodeAt(0),
);

const fakeCodec: PdfImageCodec = {
  async resizeEncodedToGraySamples(_bytes, _mimeType, width, height) {
    return { height, samples: new Uint8Array(width * height), width };
  },
  async resizeEncodedToJpeg() {
    return { bytes: SMALL_JPEG.slice(), height: 32, width: 32 };
  },
  async resizeSamplesToGraySamples(_samples, _width, _height, width, height) {
    return { height, samples: new Uint8Array(width * height), width };
  },
  async resizeSamplesToJpeg() {
    return { bytes: SMALL_JPEG.slice(), height: 32, width: 32 };
  },
};

async function imageStreamInfo(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(
      (object): object is PDFStream =>
        object instanceof PDFStream &&
        object.dict
          .lookupMaybe(PDFName.of("Subtype"), PDFName)
          ?.decodeText() === "Image",
    )
    .map((stream) => ({
      filter: stream.dict
        .lookupMaybe(PDFName.of("Filter"), PDFName)
        ?.decodeText(),
      height: stream.dict
        .lookupMaybe(PDFName.of("Height"), PDFNumber)
        ?.asNumber(),
      width: stream.dict
        .lookupMaybe(PDFName.of("Width"), PDFNumber)
        ?.asNumber(),
    }));
}

describe("PDF compression image helpers", () => {
  it("parses real JPEG dimensions and component count", () => {
    expect(parseJpegInfo(SMALL_JPEG)).toEqual({
      components: 3,
      height: 32,
      width: 32,
    });
  });

  it("inflates Flate data only within an explicit decoded-size cap", async () => {
    const original = new TextEncoder().encode(
      "bounded local PDF stream ".repeat(100),
    );
    const compressed = new Uint8Array(deflateSync(original));
    await expect(
      inflateFlateBytesCapped(compressed, original.byteLength),
    ).resolves.toEqual(original);
    await expect(
      inflateFlateBytesCapped(compressed, original.byteLength - 1),
    ).resolves.toBeUndefined();
  });

  it("reverses PNG Up and TIFF predictors for 8-bit samples", () => {
    expect(
      reversePdfFlatePredictor(
        Uint8Array.from([2, 10, 20, 30, 2, 1, 2, 3]),
        3,
        2,
        1,
        12,
      ),
    ).toEqual(Uint8Array.from([10, 20, 30, 11, 22, 33]));

    expect(
      reversePdfFlatePredictor(
        Uint8Array.from([10, 5, 5, 5, 20, 1, 1, 1]),
        4,
        2,
        1,
        2,
      ),
    ).toEqual(Uint8Array.from([10, 15, 20, 25, 20, 21, 22, 23]));
  });
});

describe("PDF compression engine", () => {
  it("analyzes embedded images without modifying the source", async () => {
    const bytes = await createImageHeavyPdf({ pages: 2 });
    const before = bytes.slice();
    const { analysis, inspection } = await inspectPdfForCompression(bytes);

    expect(bytes).toEqual(before);
    expect(inspection.pageCount).toBe(2);
    expect(analysis.imageCount).toBeGreaterThanOrEqual(1);
    expect(analysis.supportedImageCount).toBeGreaterThanOrEqual(1);
    expect(analysis.imageBytes).toBeGreaterThan(10_000);
  });

  it("recompresses a supported raster image, preserves text/order/geometry and reopens", async () => {
    const bytes = await createImageHeavyPdf({
      pages: 2,
      rotateSecondPage: true,
      title: "Image source",
    });
    const result = await compressPdfBytes(bytes, presetSettings("medium"), {
      imageCodec: fakeCodec,
      now: new Date("2026-11-01T00:00:00.000Z"),
      yieldControl: async () => undefined,
    });

    expect(result.outputBytes).toBeLessThan(result.originalBytes);
    expect(result.stats.imagesRecompressed).toBeGreaterThanOrEqual(1);
    expect(result.pageCount).toBe(2);
    expect(await pageMarkerText(result.bytes)).toEqual([
      expect.stringContaining("IMAGE-PAGE-1"),
      expect.stringContaining("IMAGE-PAGE-2"),
    ]);
    const output = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(output.getPage(0).getSize()).toEqual({ height: 792, width: 612 });
    expect(output.getPage(1).getRotation().angle).toBe(90);
    expect(await imageStreamInfo(result.bytes)).toContainEqual({
      filter: "DCTDecode",
      height: 32,
      width: 32,
    });
  });

  it("supports ICC-based JPEG images through the browser JPEG codec path", async () => {
    const comment = new Uint8Array(20_004);
    comment[0] = 0xff;
    comment[1] = 0xfe;
    comment[2] = 0x4e;
    comment[3] = 0x22;
    comment.fill(0x20, 4);
    const jpeg = Uint8Array.from([
      ...SMALL_JPEG.slice(0, 2),
      ...comment,
      ...SMALL_JPEG.slice(2),
    ]);
    const doc = await PDFDocument.create({ updateMetadata: false });
    const image = await doc.embedJpg(jpeg);
    const page = doc.addPage([320, 420]);
    page.drawImage(image, { height: 200, width: 200, x: 40, y: 100 });
    await image.embed();
    const profileRef = doc.context.register(
      doc.context.stream("synthetic ICC profile", {
        Alternate: PDFName.of("DeviceRGB"),
        N: PDFNumber.of(3),
      }),
    );
    const stream = doc.context.lookup(image.ref, PDFStream);
    stream.dict.set(
      PDFName.of("ColorSpace"),
      doc.context.obj([PDFName.of("ICCBased"), profileRef]),
    );
    const bytes = await doc.save({ useObjectStreams: false });

    const { analysis } = await inspectPdfForCompression(bytes);
    expect(analysis.supportedImageCount).toBe(1);
    const result = await compressPdfBytes(bytes, presetSettings("medium"), {
      imageCodec: fakeCodec,
      yieldControl: async () => undefined,
    });
    expect(result.stats.imagesRecompressed).toBe(1);
    expect(result.outputBytes).toBeLessThan(result.originalBytes);
  });

  it("returns a valid structural result for a text-heavy PDF and never a larger file", async () => {
    const bytes = await createUncompressedTextPdf(8);
    const result = await compressPdfBytes(bytes, presetSettings("low"), {
      imageCodec: null,
      yieldControl: async () => undefined,
    });

    expect(result.outputBytes).toBeLessThanOrEqual(result.originalBytes);
    expect(await pageMarkerText(result.bytes)).toHaveLength(8);
    expect(result.analysis.imageCount).toBe(0);
  });

  it("recovers when every image encode fails by keeping images and validating structure", async () => {
    const bytes = await createImageHeavyPdf({ pages: 1 });
    const failingCodec: PdfImageCodec = {
      ...fakeCodec,
      async resizeSamplesToJpeg() {
        throw new Error("encoder unavailable");
      },
    };
    const result = await compressPdfBytes(bytes, presetSettings("high"), {
      imageCodec: failingCodec,
      yieldControl: async () => undefined,
    });

    expect(result.pageCount).toBe(1);
    expect(result.stats.imagesRecompressed).toBe(0);
    expect(result.stats.imagesSkipped).toBeGreaterThanOrEqual(1);
    expect(result.outputBytes).toBeLessThanOrEqual(result.originalBytes);
  });

  it("tries bounded attempts and honestly reports an impossible target", async () => {
    const bytes = await createImageHeavyPdf({ pages: 1 });
    const result = await compressPdfBytes(
      bytes,
      { ...presetSettings("medium"), targetBytes: 1024 },
      {
        imageCodec: fakeCodec,
        yieldControl: async () => undefined,
      },
    );

    expect(result.stats.attempts).toBeGreaterThan(1);
    expect(result.stats.targetReached).toBe(false);
    expect(result.outputBytes).toBeGreaterThan(1024);
    expect(result.notices.join(" ")).toMatch(/Target not reached/);
  });

  it("requires the correct password and emits an unencrypted smaller copy", async () => {
    const plain = await createImageHeavyPdf({ pages: 1 });
    const encryptedDoc = await PDFDocument.load(plain, {
      updateMetadata: false,
    });
    encryptedDoc.encrypt({
      ownerPassword: "owner horse",
      permissions: { printing: "highResolution" },
      userPassword: "correct horse",
    });
    const encrypted = await encryptedDoc.save({ useObjectStreams: false });

    await expect(
      compressPdfBytes(encrypted, presetSettings("medium"), {
        imageCodec: fakeCodec,
        password: "wrong horse",
      }),
    ).rejects.toMatchObject({ code: "password_invalid" });

    const result = await compressPdfBytes(encrypted, presetSettings("medium"), {
      imageCodec: fakeCodec,
      password: "correct horse",
      yieldControl: async () => undefined,
    });
    expect(result.inspection.encrypted).toBe(true);
    expect(result.outputBytes).toBeLessThan(result.originalBytes);
    const reopened = await PDFDocument.load(result.bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    expect(reopened.isEncrypted).toBe(false);
  });

  it("blocks signed-like and XFA-like PDFs rather than rewriting them", async () => {
    await expect(
      compressPdfBytes(await createSignedLikePdf(), presetSettings("low"), {
        imageCodec: fakeCodec,
      }),
    ).rejects.toMatchObject({ code: "signed_pdf" });
    await expect(
      compressPdfBytes(await createXfaLikePdf(), presetSettings("low"), {
        imageCodec: fakeCodec,
      }),
    ).rejects.toMatchObject({ code: "unsupported_xfa" });
  });

  it("rejects invalid PDF bytes with an actionable typed error", async () => {
    await expect(
      compressPdfBytes(
        new TextEncoder().encode("not a pdf"),
        presetSettings("low"),
        { imageCodec: fakeCodec },
      ),
    ).rejects.toBeInstanceOf(PdfMergeError);
  });
});
