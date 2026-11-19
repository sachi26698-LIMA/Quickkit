/**
 * Document export for the tool workspaces.
 *
 * ## Why the exporters live here
 *
 * The workspaces produce *text*. A salary slip, an offer letter and an SEO
 * report are meant to be handed to a person or filed, and a wall of plain text
 * in a `.txt` file is not that. These helpers turn the same text into real
 * documents — a `.docx` that opens in Word, a `.pdf` that opens in any
 * reader — without the workspace having to know anything about formats.
 *
 * ## The PDF problem, and the fix
 *
 * `lib/tools/calculator-pdf.ts` already generates PDFs, but it embeds one of
 * the standard PDF fonts, which cover ASCII only. An HR report is not ASCII:
 * it is full of ₹, ·, — and →, and the standard font throws
 * "unsupported text" the moment it meets one. So this module embeds a real
 * Unicode face instead — the same SIL OFL Noto fonts the DOCX renderer already
 * uses — fetched once from the app's own origin and subset per document.
 *
 * ## Everything stays in the browser
 *
 * The font is the only thing fetched, and it carries no user data. The text
 * never leaves the tab: the document is built in memory and handed to the
 * browser as a download.
 */

import { downloadBlob } from "@/lib/tools/download";

export type ExportKind = "docx" | "pdf";

/** Where the bundled faces are served from. Mirrors scripts/copy-font-assets.mjs. */
const FONT_URLS = {
  regular: "/fonts/NotoSans-Regular.ttf",
  bold: "/fonts/NotoSans-Bold.ttf",
} as const;

const fontCache = new Map<string, Promise<ArrayBuffer>>();

async function loadFont(url: string): Promise<ArrayBuffer> {
  let pending = fontCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `The document font could not be loaded (${response.status}). Try again in a moment.`,
          );
        }
        return response.arrayBuffer();
      })
      .catch((cause) => {
        fontCache.delete(url);
        throw cause;
      });
    fontCache.set(url, pending);
  }
  return pending;
}

/** A document to export: a title, an optional subtitle and a body. */
export type ExportDocument = {
  title: string;
  /** A line under the title — a subtitle, a date, a reference. */
  subtitle?: string;
  /**
   * The body. A string is one paragraph per newline; an array of sections is
   * a heading followed by its lines.
   */
  body: string | { heading: string; lines: string[] }[];
  /** Shown in the footer of a PDF, e.g. a disclaimer. */
  footer?: string;
};

/** Normalise a document body into sections. */
function toSections(
  body: ExportDocument["body"],
): { heading: string; lines: string[] }[] {
  if (typeof body !== "string") return body;
  const sections: { heading: string; lines: string[] }[] = [];
  let lines: string[] = [];
  for (const line of body.split("\n")) {
    if (line.trim() === "" && lines.length) {
      sections.push({ heading: "", lines });
      lines = [];
      continue;
    }
    lines.push(line);
  }
  if (lines.length) sections.push({ heading: "", lines });
  return sections;
}

/**
 * Build a `.docx` from a document description.
 *
 * The `docx` package is already a dependency and runs in the browser, so this
 * needs no server and no font: Word substitutes its own face and renders the
 * rupee sign correctly.
 */
export async function buildDocx(document: ExportDocument): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: document.title, bold: true, size: 32 })],
    }),
  );

  if (document.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: document.subtitle, size: 20, color: "555555" }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      text: "",
      children: [new TextRun({ text: "", size: 12 })],
    }),
  );

  for (const section of toSections(document.body)) {
    if (section.heading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({ text: section.heading, bold: true, size: 24 }),
          ],
        }),
      );
    }
    for (const line of section.lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 21 })],
        }),
      );
    }
  }

  if (document.footer) {
    children.push(
      new Paragraph({
        text: "",
        children: [new TextRun({ text: "", size: 12 })],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: document.footer, size: 17, color: "777777" }),
        ],
      }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * Build a `.pdf` from a document description.
 *
 * A4, with the title in the embedded bold face, section headings in the
 * regular face, and the body wrapped at the page width. A long word (a URL, a
 * file path) is broken rather than allowed to run off the page.
 */
export async function buildPdf(document: ExportDocument): Promise<Blob> {
  const { PDFDocument, rgb } = await import("@cantoo/pdf-lib");
  const fontkit = (await import("@cantoo/fontkit")).default;

  const [regularBytes, boldBytes] = await Promise.all([
    loadFont(FONT_URLS.regular),
    loadFont(FONT_URLS.bold),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const drawLine = (
    text: string,
    options: {
      font?: typeof regular;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) => {
    const font = options.font ?? regular;
    const size = options.size ?? 10.5;
    const color = options.color ?? rgb(0.15, 0.12, 0.2);
    // Break overlong words rather than letting them run off the page.
    const words = text.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const candidate = line + word;
      if (font.widthOfTextAtSize(candidate.trimEnd(), size) > maxWidth) {
        if (line.trim()) {
          if (y < margin + 14) newPage();
          page.drawText(line.trimEnd(), { x: margin, y, size, font, color });
          y -= size + 5;
        }
        line = word.trimStart();
      } else {
        line = candidate;
      }
    }
    if (line.trim()) {
      if (y < margin + 14) newPage();
      page.drawText(line.trimEnd(), { x: margin, y, size, font, color });
      y -= size + 5;
    }
  };

  drawLine(document.title, {
    font: bold,
    size: 16,
    color: rgb(0.21, 0.11, 0.31),
  });
  y -= 4;
  if (document.subtitle) {
    drawLine(document.subtitle, { size: 10, color: rgb(0.4, 0.36, 0.47) });
  }
  y -= 8;

  for (const section of toSections(document.body)) {
    if (section.heading) {
      y -= 6;
      drawLine(section.heading, { font: bold, size: 12 });
      y -= 2;
    }
    for (const line of section.lines) {
      drawLine(line);
    }
  }

  if (document.footer) {
    y -= 10;
    drawLine(document.footer, { size: 8.5, color: rgb(0.47, 0.45, 0.52) });
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], {
    type: "application/pdf",
  });
}

/**
 * Download a document in the requested format.
 *
 * The caller gets a real file whose contents are the results shown on screen.
 */
export async function exportDocument(
  document: ExportDocument,
  kind: ExportKind,
  filename: string,
): Promise<void> {
  if (kind === "docx") {
    const blob = await buildDocx(document);
    downloadBlob(blob, `${filename}.docx`);
    return;
  }
  const blob = await buildPdf(document);
  downloadBlob(blob, `${filename}.pdf`);
}

/**
 * Build a CSV document from rows.
 *
 * Already exists as `lib/tools/csv.ts`; re-exported here so a workspace can
 * reach every export it needs from one module.
 */
export { csvDocument } from "@/lib/tools/csv";
