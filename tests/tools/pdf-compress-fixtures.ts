import { PDFDocument, StandardFonts, degrees } from "@cantoo/pdf-lib";
import { PNG } from "pngjs";

function deterministicNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function createNoisePng(
  width = 256,
  height = 192,
  seed = 123456789,
): Uint8Array {
  const png = new PNG({ height, width });
  const random = deterministicNoise(seed);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) * 4;
      const gradient = Math.round((x / Math.max(1, width - 1)) * 80);
      png.data[index] = Math.min(255, Math.floor(random() * 190) + gradient);
      png.data[index + 1] = Math.floor(random() * 255);
      png.data[index + 2] = Math.floor(random() * 255);
      png.data[index + 3] = 255;
    }
  }
  return new Uint8Array(PNG.sync.write(png));
}

export async function createImageHeavyPdf(
  options: {
    height?: number;
    pages?: number;
    rotateSecondPage?: boolean;
    seed?: number;
    title?: string;
    width?: number;
  } = {},
): Promise<Uint8Array> {
  const width = options.width ?? 256;
  const height = options.height ?? 192;
  const pages = options.pages ?? 2;
  const doc = await PDFDocument.create({ updateMetadata: false });
  if (options.title) doc.setTitle(options.title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const image = await doc.embedPng(
    createNoisePng(width, height, options.seed ?? 123456789),
  );

  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([612, 792]);
    if (options.rotateSecondPage && index === 1) {
      page.setRotation(degrees(90));
    }
    page.drawImage(image, { height: 520, width: 520, x: 46, y: 150 });
    page.drawText(`IMAGE-PAGE-${index + 1}`, {
      font,
      size: 18,
      x: 46,
      y: 720,
    });
    page.drawText("Readable text stays vector text.", {
      font,
      size: 11,
      x: 46,
      y: 104,
    });
  }

  return doc.save({ useObjectStreams: false });
}

export async function createUncompressedTextPdf(
  pageCount = 12,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = doc.addPage([612, 792]);
    page.drawText(`TEXT-PAGE-${pageIndex + 1}`, {
      font,
      size: 18,
      x: 46,
      y: 720,
    });
    for (let line = 0; line < 28; line += 1) {
      page.drawText(
        `Repeated local compression fixture line ${line + 1} with enough text to create a stream.`,
        { font, size: 10, x: 46, y: 680 - line * 20 },
      );
    }
  }
  return doc.save({ addDefaultPage: false, useObjectStreams: false });
}
