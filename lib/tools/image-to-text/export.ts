"use client";

/**
 * Export builders for OCR results.
 *
 * Every format is generated in the browser from the user's own data:
 *  - TXT  : UTF-8 plain text (Unicode preserved exactly);
 *  - DOCX : a genuine OOXML package via the `docx` library, with headings,
 *           paragraphs and real tables, so Hindi/Gujarati/Tamil text stays
 *           editable in Word;
 *  - PDF  : a real PDF. Devanagari/Gujarati/Bengali/Tamil/Telugu/Urdu text is
 *           not representable in PDF's standard fonts, so those sections are
 *           *rendered* and embedded as high-resolution images inside the PDF
 *           (still one file, still local), and the page is marked as image
 *           text in the export report. Latin text is written as real,
 *           selectable, searchable text.
 *  - CSV  : one file per extracted table, RFC 4180 quoted, UTF-8 with BOM so
 *           Excel opens Indic scripts correctly;
 *  - JSON : text, fields, tables, per-page confidence and settings.
 */
import { createZip, type ZipEntry } from "@/lib/tools/zip";
import type { OcrDocumentSection, OcrPage, PageExtraction } from "./types";
import { languageTag } from "./language";

/* --------------------------------- helpers -------------------------------- */

/** Characters outside the PDF standard WinAnsi-ish range need image fallback. */
export function needsImageFallback(text: string): boolean {
  return /[^\u0000-\u00FF\u2010-\u2015\u2018-\u201D\u2022\u2026\u20AC]/u.test(
    text,
  );
}

export function safeFilename(input: string, fallback = "ocr-result"): string {
  const cleaned = input
    .replace(/\.(jpe?g|png|webp|bmp|tiff?|avif|gif|pdf)$/iu, "")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

/** de-duplicate names inside one export ("scan.txt", "scan-2.txt"). */
export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  let candidate = `${base}-${index}${extension}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

const encoder = new TextEncoder();

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

/* ---------------------------------- TXT ---------------------------------- */

export function buildTxt(
  sections: OcrDocumentSection[],
  options: { includeHeaders: boolean } = { includeHeaders: false },
): string {
  return sections
    .map((section, index) =>
      options.includeHeaders
        ? `${index ? "\n\n" : ""}--- ${section.title} ---\n${section.text}`
        : section.text,
    )
    .join(options.includeHeaders ? "\n" : "\n\n");
}

/* ---------------------------------- CSV ---------------------------------- */

function csvCell(value: string): string {
  const needsQuotes = /[",\n\r]/u.test(value);
  const escaped = value.replace(/"/gu, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function buildCsv(table: {
  headers: string[];
  rows: string[][];
}): string {
  const lines: string[] = [];
  if (table.headers.length) lines.push(table.headers.map(csvCell).join(","));
  for (const row of table.rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** Excel-friendly CSV: UTF-8 BOM + CRLF, so Indic scripts open correctly. */
export function csvBytes(text: string): Uint8Array {
  return utf8(`\uFEFF${text}`);
}

export interface CsvFile {
  name: string;
  text: string;
}

/** One CSV per table; tables without a name use the source and index. */
export function buildCsvFiles(sections: OcrDocumentSection[]): CsvFile[] {
  const used = new Set<string>();
  const files: CsvFile[] = [];
  for (const section of sections) {
    section.extraction.tables.forEach((table, index) => {
      const base = safeFilename(section.title);
      const name = uniqueName(
        `${base}${section.extraction.tables.length > 1 ? `-table-${index + 1}` : ""}.csv`,
        used,
      );
      files.push({ name, text: buildCsv(table) });
    });
  }
  return files;
}

/* ---------------------------------- JSON --------------------------------- */

export interface JsonExportOptions {
  includeGeometry: boolean;
  includeSettings: unknown;
}

export function buildJson(
  sections: OcrDocumentSection[],
  options: JsonExportOptions,
): string {
  const payload = {
    tool: "QUICKKIT Image to Text (OCR)",
    generatedAt: new Date().toISOString(),
    processing: "on-device",
    settings: options.includeSettings,
    pages: sections.map((section) => ({
      id: section.id,
      title: section.title,
      source: section.page.sourceName,
      page: section.page.page,
      pageCount: section.page.pageCount,
      languages: section.page.languages.map((code) => ({
        code,
        tag: languageTag([code]),
      })),
      rtl: section.page.rtl,
      confidence: section.page.confidence,
      mode: section.extraction.resolvedMode,
      durationMs: section.page.durationMs,
      text: section.text,
      fields: section.extraction.fields.map((field) => ({
        label: field.label,
        value: field.value,
        confidence: field.confidence,
      })),
      tables: section.extraction.tables.map((table) => ({
        headers: table.headers,
        rows: table.rows,
        confidence: table.confidence,
      })),
      ...(options.includeGeometry
        ? {
            lines: section.page.lines.map((line) => ({
              text: line.text,
              confidence: line.confidence,
              bbox: line.bbox,
            })),
          }
        : {}),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/* ---------------------------------- DOCX --------------------------------- */

export interface DocxSection {
  title: string;
  text: string;
  headings: string[];
  tables: { headers: string[]; rows: string[][] }[];
  rtl: boolean;
}

/**
 * Build a real DOCX package. Headings become Word heading styles, tables
 * become real Word tables (with a header row), paragraphs keep their breaks.
 */
export async function buildDocx(
  sections: DocxSection[],
  options: { title: string; includePageHeadings: boolean; fontFamily?: string },
): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");
  const font = options.fontFamily ?? "Nirmala UI";
  const rightToLeft = sections.some((section) => section.rtl);

  const children: Array<
    InstanceType<typeof Paragraph> | InstanceType<typeof Table>
  > = [];
  children.push(
    new Paragraph({
      text: options.title,
      heading: HeadingLevel.TITLE,
    }),
  );

  for (const section of sections) {
    if (options.includePageHeadings) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          bidirectional: section.rtl,
        }),
      );
    }
    const blocks = section.text.split(/\n{2,}/u);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      const [firstLine, ...rest] = trimmed.split("\n");
      const isHeading = section.headings.includes(firstLine.trim());
      if (isHeading) {
        children.push(
          new Paragraph({
            text: firstLine.trim(),
            heading: HeadingLevel.HEADING_2,
            bidirectional: section.rtl,
          }),
        );
        if (rest.length) {
          children.push(
            new Paragraph({
              bidirectional: section.rtl,
              children: [
                new TextRun({
                  text: rest.join("\n"),
                  font,
                  size: 22,
                }),
              ],
            }),
          );
        }
        continue;
      }
      children.push(
        new Paragraph({
          bidirectional: section.rtl,
          children: [
            new TextRun({
              text: trimmed,
              font,
              size: 22,
            }),
          ],
        }),
      );
    }
    for (const table of section.tables) {
      const rows = table.headers.length
        ? [table.headers, ...table.rows]
        : table.rows;
      if (!rows.length) continue;
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map(
            (row, rowIndex) =>
              new TableRow({
                tableHeader: rowIndex === 0 && table.headers.length > 0,
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          bidirectional: section.rtl,
                          alignment: rightToLeft
                            ? AlignmentType.RIGHT
                            : undefined,
                          children: [
                            new TextRun({
                              text: cell,
                              font,
                              size: 20,
                              bold: rowIndex === 0 && table.headers.length > 0,
                            }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
      children.push(new Paragraph({ text: "" }));
    }
  }

  const document = new Document({
    creator: "QUICKKIT",
    description: "Text extracted on-device by QUICKKIT Image to Text (OCR)",
    title: options.title,
    styles: {
      default: {
        document: {
          run: { font, size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
  return Packer.toBlob(document);
}

/** Section model -> DOCX sections, keeping headings and tables. */
export function docxSections(
  sections: OcrDocumentSection[],
  includePageHeadings: boolean,
): DocxSection[] {
  return sections.map((section, index) => ({
    title: includePageHeadings
      ? section.title
      : index === 0
        ? section.title
        : section.title,
    text: section.text,
    headings: section.extraction.headings,
    tables: section.extraction.tables.map((table) => ({
      headers: table.headers,
      rows: table.rows,
    })),
    rtl: section.page.rtl,
  }));
}

/* ---------------------------------- PDF ---------------------------------- */

export interface PdfPageImage {
  /** PNG data URL of the rendered text, used for non-Latin sections. */
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfSectionInput {
  title: string;
  text: string;
  /** Provide when the text needs image fallback (non-Latin script). */
  image?: PdfPageImage;
  rtl: boolean;
}

export interface PdfExportResult {
  blob: Blob;
  /** Sections written as real text vs. rendered as images. */
  textSections: number;
  imageSections: number;
}

const PAGE_WIDTH = 595.28; // A4 points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15.5;

/** Wrap text to a printable width using an approximate average glyph width. */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize = FONT_SIZE,
): string[] {
  const averageGlyph = fontSize * 0.5;
  const perLine = Math.max(10, Math.floor(maxWidth / averageGlyph));
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/u)) {
      if (!current) {
        current = word;
      } else if ([...`${current} ${word}`].length <= perLine) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
      while ([...current].length > perLine) {
        lines.push([...current].slice(0, perLine).join(""));
        current = [...current].slice(perLine).join("");
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Build a PDF. Latin sections are written as real selectable text; sections in
 * scripts the standard PDF fonts cannot encode are embedded as page images so
 * the characters are still correct on screen and in print.
 */
export async function buildPdf(
  sections: PdfSectionInput[],
  title: string,
): Promise<PdfExportResult> {
  const { PDFDocument, StandardFonts, rgb } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("QUICKKIT Image to Text (OCR)");
  doc.setProducer("QUICKKIT — processed on your device");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let textSections = 0;
  let imageSections = 0;

  for (const section of sections) {
    if (section.image && needsImageFallback(section.text)) {
      imageSections += 1;
      const png = await doc.embedPng(section.image.dataUrl);
      const scale = Math.min(
        (PAGE_WIDTH - MARGIN * 2) / png.width,
        (PAGE_HEIGHT - MARGIN * 2) / png.height,
        1,
      );
      const width = png.width * scale;
      const height = png.height * scale;
      const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText("Rendered text (Unicode script)", {
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN + 12,
        size: 8,
        font,
        color: rgb(0.42, 0.33, 0.44),
      });
      page.drawImage(png, {
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - height,
        width,
        height,
      });
      continue;
    }
    textSections += 1;
    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursor = PAGE_HEIGHT - MARGIN;
    page.drawText(section.title.slice(0, 90), {
      x: MARGIN,
      y: cursor,
      size: 13,
      font: bold,
      color: rgb(0.23, 0.11, 0.31),
    });
    cursor -= 24;
    for (const line of wrapText(section.text, PAGE_WIDTH - MARGIN * 2)) {
      if (cursor < MARGIN) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursor = PAGE_HEIGHT - MARGIN;
      }
      if (line) {
        // Standard fonts are WinAnsi: replace anything unencodable so a stray
        // symbol never throws and never silently corrupts the page.
        const safe = line.replace(/[^\u0020-\u00FF]/gu, "?");
        page.drawText(safe, {
          x: MARGIN,
          y: cursor,
          size: FONT_SIZE,
          font,
          color: rgb(0.1, 0.06, 0.18),
        });
      }
      cursor -= LINE_HEIGHT;
    }
  }
  if (!doc.getPageCount()) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const bytes = await doc.save();
  return {
    blob: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    textSections,
    imageSections,
  };
}

/**
 * Render a section's text to a PNG data URL for PDF image fallback.
 * Uses the browser's own font rendering, which shapes Indic scripts correctly.
 */
export function renderTextToImage(
  text: string,
  options: { rtl: boolean; heading?: string },
): PdfPageImage {
  const width = 1240;
  const padding = 64;
  const fontSize = 28;
  const lineHeight = 44;
  const measure = document.createElement("canvas");
  const measureContext = measure.getContext("2d");
  if (!measureContext)
    throw new Error("Canvas is unavailable in this browser.");
  const family =
    "'Nirmala UI', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'Noto Sans', system-ui, sans-serif";
  measureContext.font = `${fontSize}px ${family}`;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/u)) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureContext.measureText(candidate).width > width - padding * 2) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  const headingHeight = options.heading ? 54 : 0;
  const height = Math.max(
    200,
    padding * 2 + headingHeight + lines.length * lineHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#1a0f2e";
  context.textBaseline = "top";
  let y = padding;
  if (options.heading) {
    context.font = `bold 26px ${family}`;
    context.direction = options.rtl ? "rtl" : "ltr";
    context.textAlign = options.rtl ? "right" : "left";
    context.fillText(
      options.heading,
      options.rtl ? width - padding : padding,
      y,
    );
    y += headingHeight;
  }
  context.font = `${fontSize}px ${family}`;
  context.direction = options.rtl ? "rtl" : "ltr";
  context.textAlign = options.rtl ? "right" : "left";
  for (const line of lines) {
    if (line)
      context.fillText(line, options.rtl ? width - padding : padding, y);
    y += lineHeight;
  }
  const dataUrl = canvas.toDataURL("image/png");
  canvas.width = 0;
  canvas.height = 0;
  return { dataUrl, width, height };
}

/* --------------------------------- ZIP ----------------------------------- */

export interface BatchFile {
  name: string;
  /** Plain text or CSV payload. */
  text?: string;
  bytes?: Uint8Array;
  blob?: Blob;
}

export async function buildZip(files: BatchFile[]): Promise<Blob> {
  const entries: ZipEntry[] = [];
  const used = new Set<string>();
  for (const file of files) {
    const name = uniqueName(file.name, used);
    if (file.bytes) entries.push({ name, data: file.bytes });
    else if (file.blob)
      entries.push({
        name,
        data: new Uint8Array(await file.blob.arrayBuffer()),
      });
    else if (file.text !== undefined)
      entries.push({ name, data: utf8(file.text) });
  }
  const zip = createZip(entries);
  return new Blob([zip as unknown as BlobPart], { type: "application/zip" });
}

/* ------------------------------ export helper ---------------------------- */

export interface BuiltExport {
  files: BatchFile[];
  /** Human summary for the report seen by the user. */
  summary: string;
}

/**
 * Build one export for the chosen format. Individual / page-wise / combined
 * scopes are handled by the caller choosing the section list.
 */
export async function buildExport(
  format: "txt" | "docx" | "pdf" | "csv" | "json",
  sections: OcrDocumentSection[],
  options: {
    combined: boolean;
    includeHeaders: boolean;
    includeGeometry: boolean;
    settings: unknown;
    documentTitle: string;
  },
): Promise<BuiltExport> {
  if (!sections.length)
    throw new Error("There is no extracted text to export yet.");
  const base = safeFilename(
    options.combined ? options.documentTitle : sections[0].title,
  );
  switch (format) {
    case "txt":
      return {
        files: [
          {
            name: `${base}.txt`,
            text: buildTxt(sections, {
              includeHeaders: options.includeHeaders,
            }),
          },
        ],
        summary: `${sections.length} page(s) as UTF-8 text`,
      };
    case "json":
      return {
        files: [
          {
            name: `${base}.json`,
            text: buildJson(sections, {
              includeGeometry: options.includeGeometry,
              includeSettings: options.settings,
            }),
          },
        ],
        summary: `${sections.length} page(s) with fields${
          options.includeGeometry ? " and word boxes" : ""
        }`,
      };
    case "csv": {
      const files = buildCsvFiles(sections).map((file) => ({
        name: options.combined ? `${base}-${file.name}` : file.name,
        bytes: csvBytes(file.text),
      }));
      if (!files.length)
        throw new Error(
          "No tables were found on the selected pages. Choose Table Extraction and run OCR again.",
        );
      return {
        files,
        summary: `${files.length} table file(s)`,
      };
    }
    case "docx": {
      const blob = await buildDocx(
        docxSections(sections, options.includeHeaders),
        {
          title: options.documentTitle,
          includePageHeadings: options.includeHeaders,
        },
      );
      return {
        files: [{ name: `${base}.docx`, blob }],
        summary: `${sections.length} page(s) in an editable Word document`,
      };
    }
    case "pdf": {
      const inputs: PdfSectionInput[] = sections.map((section) => ({
        title: section.title,
        text: section.text,
        rtl: section.page.rtl,
        image: needsImageFallback(section.text)
          ? renderTextToImage(section.text, {
              rtl: section.page.rtl,
              heading: options.includeHeaders ? section.title : undefined,
            })
          : undefined,
      }));
      const result = await buildPdf(inputs, options.documentTitle);
      return {
        files: [{ name: `${base}.pdf`, blob: result.blob }],
        summary: `${result.textSections} page(s) as real text${
          result.imageSections
            ? `, ${result.imageSections} as rendered Unicode text (non-Latin script)`
            : ""
        }`,
      };
    }
    default:
      throw new Error("Unknown export format.");
  }
}

/* ------------------------------- page model ------------------------------ */

/** Convenience: a stable, human title for a page/section. */
export function sectionTitle(page: OcrPage): string {
  return page.pageCount > 1
    ? `${safeFilename(page.sourceName)} — page ${page.page}`
    : safeFilename(page.sourceName);
}

export function countWords(text: string): number {
  const matches = text
    .trim()
    .match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu);
  return matches ? matches.length : 0;
}

export function sectionStats(extraction: PageExtraction): {
  tables: number;
  fields: number;
  headings: number;
} {
  return {
    tables: extraction.tables.length,
    fields: extraction.fields.length,
    headings: extraction.headings.length,
  };
}
