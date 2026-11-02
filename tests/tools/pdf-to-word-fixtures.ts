import { deflateSync } from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

/**
 * Deterministic PDF fixtures for the PDF to Word e2e suite. Everything is
 * generated in code (no binary blobs): a tiny PNG encoder plus a 5x7
 * bitmap font produce the embedded images, including machine-readable
 * text for the OCR path.
 */

/* ---------------- tiny PNG encoder (RGB, filter 0) ---------------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const GLYPHS: Record<string, string[]> = {
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

function textImagePng(lines: string[]): Buffer {
  const S = 14;
  const charW = 7 * S;
  const lineH = 10 * S;
  const width = Math.max(...lines.map((l) => l.length)) * charW + 40;
  const height = lines.length * lineH + 40;
  const ink = new Set<string>();
  lines.forEach((line, li) => {
    [...line].forEach((ch, ci) => {
      const glyph = GLYPHS[ch];
      if (!glyph) return;
      glyph.forEach((row, gy) => {
        [...row].forEach((cell, gx) => {
          if (cell !== "#") return;
          for (let dy = 0; dy < S; dy++)
            for (let dx = 0; dx < S; dx++)
              ink.add(
                `${20 + ci * charW + gx * S + dx},${20 + li * lineH + gy * S + dy}`,
              );
        });
      });
    });
  });
  return encodePng(width, height, (x, y) =>
    ink.has(`${x},${y}`) ? [10, 10, 10] : [255, 255, 255],
  );
}

function decorPng(): Buffer {
  return encodePng(240, 160, (x, y) => {
    if (x < 80) return [108, 53, 232];
    if (x < 160) return [163, 151, 255];
    return y < 80 ? [230, 220, 255] : [140, 120, 220];
  });
}

/** Two-page born-digital PDF: headings, wrapped body, bullets, table, image. */
export async function createReportPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const img = await doc.embedPng(decorPng());
  const black = rgb(0.1, 0.1, 0.15);

  const p1 = doc.addPage([612, 792]);
  p1.drawText("Quarterly Report", {
    x: 72,
    y: 700,
    size: 24,
    font: bold,
    color: black,
  });
  p1.drawText("Sales Overview", {
    x: 72,
    y: 664,
    size: 16,
    font: bold,
    color: black,
  });
  const body = [
    "Revenue grew steadily through the quarter as new regions came online and",
    "repeat customers increased their order sizes. The team focused on fulfil-",
    "ment speed, cutting average delivery time by almost a full day overall.",
  ];
  body.forEach((line, i) =>
    p1.drawText(line, {
      x: 72,
      y: 636 - i * 15,
      size: 11,
      font: regular,
      color: black,
    }),
  );
  [
    "• Revenue up twelve percent",
    "• Two new regions launched",
    "• Delivery time improved",
  ].forEach((line, i) =>
    p1.drawText(line, {
      x: 72,
      y: 578 - i * 16,
      size: 11,
      font: regular,
      color: black,
    }),
  );
  const rows = [
    ["Region", "Units", "Revenue"],
    ["North", "1204", "48200"],
    ["South", "987", "39150"],
    ["West", "1430", "57800"],
  ];
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      p1.drawText(cell, {
        x: [72, 250, 400][ci],
        y: 516 - ri * 17,
        size: 11,
        font: ri === 0 ? bold : regular,
        color: black,
      });
    });
  });
  p1.drawImage(img, { x: 72, y: 300, width: 240, height: 160 });
  p1.drawText("Figure 1: Regional mix", {
    x: 72,
    y: 282,
    size: 9,
    font: regular,
    color: black,
  });

  const p2 = doc.addPage([612, 792]);
  p2.drawText("Next Steps", {
    x: 72,
    y: 700,
    size: 16,
    font: bold,
    color: black,
  });
  [
    "1. Review regional targets",
    "2. Hire two support staff",
    "3. Launch referral program",
  ].forEach((line, i) =>
    p2.drawText(line, {
      x: 72,
      y: 668 - i * 16,
      size: 11,
      font: regular,
      color: black,
    }),
  );
  p2.drawText("Thank you to everyone who contributed during the quarter.", {
    x: 72,
    y: 606,
    size: 11,
    font: regular,
    color: black,
  });
  return doc.save();
}

/** Image-only PDF whose page image contains machine-readable text. */
export async function createScannedTextPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(textImagePng(["HELLO OCR", "WORLD 123"]));
  const page = doc.addPage([612, 792]);
  page.drawImage(img, { x: 36, y: 480, width: 540, height: 270 });
  return doc.save();
}
