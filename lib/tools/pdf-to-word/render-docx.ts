import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type {
  Block,
  ConversionMode,
  StructuredPage,
  TextRun as ModelRun,
} from "./types";
import { PdfToWordError } from "./types";

/**
 * StructuredPage[] -> genuine DOCX (OOXML) Blob via the `docx` library.
 * "clean"  = one flowing, easily editable document.
 * "layout" = one Word section per PDF page (same page size), with text
 *            positioned by indent/spacing to approximate the original.
 * Neither mode claims pixel-perfect reproduction.
 */

const TWIPS_PER_PT = 20;
const PX_PER_PT = 96 / 72;

const pt = (points: number) => Math.max(0, Math.round(points * TWIPS_PER_PT));

function toRuns(runs: ModelRun[], fontSizePt?: number): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        ...(fontSizePt
          ? { size: Math.max(8, Math.round(fontSizePt * 2)) }
          : {}),
      }),
  );
}

const ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const HEADING = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

function tableBlock(
  block: Extract<Block, { kind: "table" }>,
  mode: ConversionMode,
  contentWidthPt: number,
): Table {
  const totalPt =
    block.colWidthsPt.reduce((a, b) => a + b, 0) || contentWidthPt;
  const scale = Math.min(1, contentWidthPt / totalPt);
  const columnWidths = block.colWidthsPt.map((w) => pt(w * scale));
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    space: 0,
    color: "C9B8F2",
  };
  const rows = block.rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              ...(mode === "clean" && rowIndex === 0
                ? {
                    shading: { type: ShadingType.CLEAR, fill: "EDE3FF" },
                  }
                : {}),
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      size: Math.round(
                        Math.min(11, Math.max(8, block.fontSize)) * 2,
                      ),
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
  );
  return new Table({
    rows,
    width: { size: pt(totalPt * scale), type: WidthType.DXA },
    columnWidths,
    borders: {
      top: border,
      left: border,
      bottom: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
  });
}

function imageParagraph(
  block: Extract<Block, { kind: "image" }>,
  contentWidthPt: number,
): Paragraph {
  const { image } = block;
  const displayWidthPt = Math.min(image.width, contentWidthPt);
  const ratio = image.height > 0 ? image.height / image.width : 0.75;
  return new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data: image.png,
        transformation: {
          width: Math.max(1, Math.round(displayWidthPt * PX_PER_PT)),
          height: Math.max(1, Math.round(displayWidthPt * ratio * PX_PER_PT)),
        },
        altText: {
          title: "Image from PDF",
          description: "Image extracted from the source PDF",
          name: "pdf-image",
        },
      }),
    ],
  });
}

interface RenderContext {
  mode: ConversionMode;
  listCounter: { ordered: number };
}

function blockChildren(
  block: Block,
  context: RenderContext,
  contentWidthPt: number,
  marginLeftPt: number,
  spacingBeforePt: number,
): (Paragraph | Table)[] {
  const layout = context.mode === "layout";
  const indent = layout
    ? { left: pt(Math.max(0, ("x" in block ? block.x : 0) - marginLeftPt)) }
    : undefined;
  const spacing = layout
    ? { before: pt(spacingBeforePt), after: 0 }
    : { after: pt(6) };

  switch (block.kind) {
    case "heading":
      return [
        new Paragraph({
          heading: HEADING[block.level],
          alignment: ALIGN[block.align],
          indent,
          spacing: layout ? spacing : { before: pt(12), after: pt(4) },
          children: toRuns(block.runs, layout ? block.fontSize : undefined),
        }),
      ];
    case "paragraph":
      return [
        new Paragraph({
          alignment: ALIGN[block.align],
          indent,
          spacing,
          children: toRuns(block.runs, layout ? block.fontSize : undefined),
        }),
      ];
    case "list": {
      const reference = block.ordered
        ? `qk-num-${context.listCounter.ordered++}`
        : "qk-bullets";
      return block.items.map(
        (itemRuns) =>
          new Paragraph({
            numbering: { reference, level: 0 },
            indent,
            spacing: layout ? { before: 0, after: 0 } : { after: pt(2) },
            children: toRuns(itemRuns, layout ? block.fontSize : undefined),
          }),
      );
    }
    case "table":
      return [tableBlock(block, context.mode, contentWidthPt)];
    case "image":
      return [imageParagraph(block, contentWidthPt)];
  }
}

function numberingConfig(orderedCount: number) {
  const level = (
    format: (typeof LevelFormat)[keyof typeof LevelFormat],
    text: string,
  ) => ({
    level: 0,
    format,
    text,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 420, hanging: 220 } } },
  });
  const config = [
    { reference: "qk-bullets", levels: [level(LevelFormat.BULLET, "•")] },
  ];
  for (let i = 0; i < orderedCount; i++) {
    config.push({
      reference: `qk-num-${i}`,
      levels: [level(LevelFormat.DECIMAL, "%1.")],
    });
  }
  return { config };
}

function estimateBlockHeight(block: Block, contentWidthPt: number): number {
  switch (block.kind) {
    case "heading":
      return block.fontSize * 1.4;
    case "paragraph": {
      const chars = block.runs.reduce((n, r) => n + r.text.length, 0);
      const charsPerLine = Math.max(
        12,
        (contentWidthPt / (block.fontSize * 0.5)) | 0,
      );
      return Math.ceil(chars / charsPerLine) * block.fontSize * 1.3;
    }
    case "list":
      return block.items.length * block.fontSize * 1.35;
    case "table":
      return block.rows.length * block.fontSize * 1.5;
    case "image":
      return Math.min(block.image.height, 600);
  }
}

export async function buildDocx(
  pages: StructuredPage[],
  mode: ConversionMode,
  sourceName: string,
): Promise<Blob> {
  const totalBlocks = pages.reduce((n, p) => n + p.blocks.length, 0);
  if (totalBlocks === 0) {
    throw new PdfToWordError(
      "empty",
      "No readable content could be structured from this PDF.",
    );
  }
  const orderedCount = pages.reduce(
    (n, p) => n + p.blocks.filter((b) => b.kind === "list" && b.ordered).length,
    0,
  );
  const context: RenderContext = { mode, listCounter: { ordered: 0 } };

  const sections =
    mode === "layout"
      ? pages.map((page) => {
          const marginPt = 36;
          const contentWidthPt = Math.max(120, page.widthPt - marginPt * 2);
          const children: (Paragraph | Table)[] = [];
          let prevBottom = marginPt;
          for (const block of page.blocks) {
            const y = "y" in block ? block.y : prevBottom;
            const gap = Math.max(0, Math.min(160, y - prevBottom));
            children.push(
              ...blockChildren(block, context, contentWidthPt, marginPt, gap),
            );
            prevBottom = y + estimateBlockHeight(block, contentWidthPt);
          }
          if (children.length === 0) children.push(new Paragraph({}));
          return {
            properties: {
              page: {
                size: { width: pt(page.widthPt), height: pt(page.heightPt) },
                margin: {
                  top: pt(marginPt),
                  right: pt(marginPt),
                  bottom: pt(marginPt),
                  left: pt(marginPt),
                },
              },
            },
            children,
          };
        })
      : (() => {
          const first = pages[0] ?? { widthPt: 595, heightPt: 842 };
          const marginPt = 56.7; // 2 cm
          const contentWidthPt = Math.max(200, first.widthPt - marginPt * 2);
          const children: (Paragraph | Table)[] = [];
          for (const page of pages) {
            for (const block of page.blocks) {
              children.push(
                ...blockChildren(block, context, contentWidthPt, marginPt, 0),
              );
            }
          }
          return [
            {
              properties: {
                page: {
                  size: {
                    width: pt(first.widthPt),
                    height: pt(first.heightPt),
                  },
                  margin: {
                    top: pt(marginPt),
                    right: pt(marginPt),
                    bottom: pt(marginPt),
                    left: pt(marginPt),
                  },
                },
              },
              children,
            },
          ];
        })();

  const document = new Document({
    creator: "QUICKKIT",
    title: sourceName.replace(/\.pdf$/i, ""),
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    numbering: numberingConfig(orderedCount),
    sections,
  });

  return Packer.toBlob(document);
}
