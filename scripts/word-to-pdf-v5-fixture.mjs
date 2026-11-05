// Generates a realistic DOCX used for V5 layout quality checks.
// It is a synthetic Word document built with the `docx` library — not Word
// output — so it can be regenerated deterministically in CI.
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { mkdir, writeFile } from "node:fs/promises";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAP0lEQVR4nO3PMQ0AMAgAMOTswdWUTNgMYQINHHxNaqBx7l9VL1eFgICAgICAgICAgICAgICAgICAgICAgMBUA+ErkKbjB4dtAAAAAElFTkSuQmCC",
  "base64",
);

const cell = (text, options = {}) =>
  new TableCell({
    shading: options.heading
      ? { type: ShadingType.CLEAR, fill: "F4D7D4", color: "auto" }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: Boolean(options.heading), size: 20 }),
        ],
      }),
    ],
  });

export async function buildQualityFixture() {
  const doc = new Document({
    creator: "QUICKKIT QA",
    title: "QUICKKIT layout quality fixture",
    description: "Synthetic DOCX covering layout features",
    numbering: {
      config: [
        {
          reference: "steps",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2)",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "QUICKKIT · layout fixture", size: 18 }),
                  new TextRun({ text: "   page ", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                  new TextRun({ text: " of ", size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Synthetic document · generated for QA only",
                    size: 16,
                    color: "3B1B4F",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Quarterly operations review")],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Prepared by ", italics: true }),
              new TextRun({ text: "the QUICKKIT QA team", bold: true }),
              new TextRun({ text: " on 4 November 2026.", italics: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Highlights: ", bold: true }),
              new TextRun({
                text: "conversion throughput doubled",
                color: "D6598F",
                underline: {},
              }),
              new TextRun({
                text: ", while median export time stayed under two seconds.",
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Where the time goes")],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell("Stage", { heading: true }),
                  cell("Median", { heading: true }),
                  cell("Notes", { heading: true }),
                ],
              }),
              new TableRow({
                children: [
                  cell("Package read"),
                  cell("40 ms"),
                  cell("ZIP + XML parse"),
                ],
              }),
              new TableRow({
                children: [
                  cell("Layout + render"),
                  cell("620 ms"),
                  cell("Text, tables, images, headers"),
                ],
              }),
              new TableRow({
                children: [
                  cell("Export settings"),
                  cell("120 ms"),
                  cell("Overlays, numbering, metadata"),
                ],
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Next steps")],
          }),
          new Paragraph({
            numbering: { reference: "steps", level: 0 },
            children: [
              new TextRun("Run the 1,000-page ladder on the target host."),
            ],
          }),
          new Paragraph({
            numbering: { reference: "steps", level: 1 },
            children: [
              new TextRun("Record RSS, CPU and duration for each step."),
            ],
          }),
          new Paragraph({
            numbering: { reference: "steps", level: 0 },
            children: [
              new TextRun("Publish the numbers with the release notes."),
            ],
          }),
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: [new TextRun("Keep consent explicit and revocable.")],
          }),
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: [
              new TextRun("Never present a placeholder as a converted page."),
            ],
          }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: png,
                transformation: { width: 64, height: 32 },
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "ગુજરાતી લખાણ · નમસ્તે દુનિયા — QUICKKIT ગુજરાતી પરીક્ષણ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "हिन्दी पाठ · नमस्ते दुनिया — देवनागरी परीक्षण।",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Right-aligned closing note.",
                size: 20,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Second page")],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This paragraph exists to verify that page two keeps the header, the footer and its own numbering.",
              }),
            ],
          }),
        ],
      },
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Landscape appendix")],
          }),
          new Paragraph(
            "A landscape section proves that section geometry is read from the DOCX rather than assumed.",
          ),
        ],
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir("docs/word-to-pdf/v5/fixtures", { recursive: true });
  await writeFile(
    "docs/word-to-pdf/v5/fixtures/quality.docx",
    await buildQualityFixture(),
  );
  console.log("wrote docs/word-to-pdf/v5/fixtures/quality.docx");
}
