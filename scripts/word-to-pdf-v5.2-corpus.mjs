// Generates the V5.2/V5.3 regression corpus: one document per acceptance case
// (A–J) so conversion quality can be measured instead of eyeballed.
import {
  AlignmentType,
  BorderStyle,
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

const OUT = "docs/word-to-pdf/v5.2/corpus";

// 32x32 PNG (two colours) and 1x1 JPEG, generated in-memory so the corpus is
// reproducible without binary assets in git history.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAAt/+nTAAAAP0lEQVR4nO3PMQ0AMAgAMOTswdWUTNgMYQINHHxNaqBx7l9VL1eFgICAgICAgICAgICAgICAgICAgICAgMBUA+ErkKbjB4dtAAAAAElFTkSuQmCC",
  "base64",
);

const text = (value, options = {}) =>
  new Paragraph({ children: [new TextRun({ text: value, ...options })] });

const footer = (label) =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${label} · page `, size: 16, color: "666666" }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 16,
            color: "666666",
          }),
          new TextRun({ text: " of ", size: 16, color: "666666" }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 16,
            color: "666666",
          }),
        ],
      }),
    ],
  });

const header = (label) =>
  new Header({
    children: [
      new Paragraph({
        children: [new TextRun({ text: label, size: 16, color: "3B1B4F" })],
      }),
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "D6598F" },
        },
        children: [],
      }),
    ],
  });

function simple(paragraphs) {
  return new Document({
    creator: "QUICKKIT corpus",
    title: "A — simple one-page document",
    sections: [{ children: paragraphs }],
  });
}

function resume() {
  const bullet = (value) =>
    new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: [new TextRun({ text: value, size: 21 })],
    });
  return new Document({
    creator: "QUICKKIT corpus",
    title: "B — multi-page resume",
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 460, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: { default: header("Ananya Rao · Curriculum Vitae") },
        footers: { default: footer("Resume") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Ananya Rao")],
          }),
          text(
            "Senior document engineer · Ahmedabad, India · ananya@example.com",
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Experience")],
          }),
          ...Array.from({ length: 9 }, () => [
            new Paragraph({
              spacing: { before: 160, after: 40 },
              children: [
                new TextRun({
                  text: `Principal Engineer — Meridian Docs`,
                  bold: true,
                }),
                new TextRun({ text: "\t2021 — present", italics: true }),
              ],
              tabStops: [{ type: "right", position: 9000 }],
            }),
            bullet(
              "Rebuilt a DOCX rendering pipeline covering tables, images, headers and Indic scripts.",
            ),
            bullet(
              "Cut conversion time for 1,000-page documents to under three seconds.",
            ),
            bullet(
              "Owned fidelity metrics and the regression corpus used for releases.",
            ),
          ]).flat(),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Education")],
          }),
          ...Array.from({ length: 6 }, (_, index) =>
            text(
              `B.Tech Computer Science — University ${index + 1} · 20${10 + index}`,
            ),
          ),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Selected projects")],
          }),
          ...Array.from(
            { length: 14 },
            (_, index) =>
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: `Project ${index + 1}: `, bold: true }),
                  new TextRun(
                    "Delivered a document conversion workspace with real previews, page management and verified export settings.",
                  ),
                ],
              }),
          ),
        ],
      },
    ],
  });
}

function tables() {
  const cell = (value, options = {}) =>
    new TableCell({
      columnSpan: options.span,
      shading: options.head
        ? { type: ShadingType.CLEAR, fill: "F4D7D4", color: "auto" }
        : undefined,
      children: [
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({ text: value, bold: Boolean(options.head), size: 20 }),
          ],
        }),
      ],
    });
  return new Document({
    creator: "QUICKKIT corpus",
    title: "C — tables",
    sections: [
      {
        headers: { default: header("Tables fixture") },
        footers: { default: footer("Tables") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Tables and merged cells")],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell("Region", { head: true }),
                  cell("Revenue", { head: true }),
                  cell("Growth", { head: true }),
                ],
              }),
              ...["North", "South", "East", "West"].map(
                (region, index) =>
                  new TableRow({
                    children: [
                      cell(region),
                      cell(`₹${(1200 * (index + 1)).toLocaleString("en-IN")}`),
                      cell(`${(4 + index * 1.5).toFixed(1)}%`),
                    ],
                  }),
              ),
              new TableRow({
                children: [
                  cell("Total across all regions", { span: 2 }),
                  cell("+12.4%"),
                ],
              }),
            ],
          }),
          text(""),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      text("Nested table below"),
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [cell("inner A"), cell("inner B")],
                          }),
                          new TableRow({
                            children: [cell("inner C"), cell("inner D")],
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      text(
                        "Sibling cell with a longer paragraph so the row height is driven by text wrapping, not by the nested table.",
                      ),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

function images() {
  return new Document({
    creator: "QUICKKIT corpus",
    title: "D — images",
    sections: [
      {
        headers: { default: header("Images fixture") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Images at several sizes")],
          }),
          text("Inline image at 96 px:"),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: png,
                transformation: { width: 96, height: 96 },
              }),
            ],
          }),
          text("Same asset scaled to 240 px:"),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: png,
                transformation: { width: 240, height: 240 },
              }),
            ],
          }),
          text("Text after the images must not overlap the drawings."),
        ],
      },
    ],
  });
}

function headersFooters() {
  return new Document({
    creator: "QUICKKIT corpus",
    title: "E — headers and footers",
    sections: [
      {
        properties: { titlePage: true },
        headers: {
          default: header("Default header — later pages"),
          first: header("First-page header"),
        },
        footers: {
          default: footer("Headers fixture"),
          first: footer("First-page footer"),
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Headers, footers and page fields")],
          }),
          text("The first page uses the first-page header part."),
          new Paragraph({ children: [new PageBreak()] }),
          text("The second page uses the default header and the page field."),
          new Paragraph({ children: [new PageBreak()] }),
          text("The third page repeats the default header."),
        ],
      },
    ],
  });
}

function fonts() {
  const families = [
    "Calibri",
    "Cambria",
    "Times New Roman",
    "Arial",
    "Courier New",
  ];
  return new Document({
    creator: "QUICKKIT corpus",
    title: "F — font families and sizes",
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Font families, sizes and weights")],
          }),
          ...families.flatMap((family) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${family} regular `,
                  font: family,
                  size: 22,
                }),
                new TextRun({
                  text: "bold ",
                  font: family,
                  size: 22,
                  bold: true,
                }),
                new TextRun({
                  text: "italic ",
                  font: family,
                  size: 22,
                  italics: true,
                }),
                new TextRun({
                  text: "bold-italic",
                  font: family,
                  size: 22,
                  bold: true,
                  italics: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${family} at 9 / 14 / 24 pt`,
                  font: family,
                  size: 22,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "9 pt · ", font: family, size: 18 }),
                new TextRun({ text: "14 pt · ", font: family, size: 28 }),
                new TextRun({ text: "24 pt", font: family, size: 48 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${family} colours: `,
                  font: family,
                  size: 22,
                }),
                new TextRun({
                  text: "plum ",
                  font: family,
                  size: 22,
                  color: "3B1B4F",
                }),
                new TextRun({
                  text: "rose ",
                  font: family,
                  size: 22,
                  color: "D6598F",
                }),
                new TextRun({
                  text: "coral",
                  font: family,
                  size: 22,
                  color: "FF6B6B",
                }),
              ],
            }),
            new Paragraph({ children: [] }),
          ]),
          text(
            "Mixed script line: English, ગુજરાતી, हिन्दी, বাংলা, தமிழ் — all in one paragraph.",
            { size: 24 },
          ),
        ],
      },
    ],
  });
}

function landscape() {
  return new Document({
    creator: "QUICKKIT corpus",
    title: "G — landscape document",
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        headers: { default: header("Landscape fixture") },
        footers: { default: footer("Landscape") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("A landscape page")],
          }),
          ...Array.from({ length: 20 }, (_, index) =>
            text(
              `Line ${index + 1}: the text block is wide, so line lengths are longer than in portrait.`,
            ),
          ),
        ],
      },
    ],
  });
}

function mixedOrientation() {
  return new Document({
    creator: "QUICKKIT corpus",
    title: "H — mixed portrait and landscape",
    sections: [
      {
        headers: { default: header("Section 1 header") },
        footers: { default: footer("Mixed orientation") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Portrait section")],
          }),
          ...Array.from({ length: 12 }, (_, index) =>
            text(`Portrait body line ${index + 1}.`),
          ),
        ],
      },
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Landscape section")],
          }),
          ...Array.from({ length: 10 }, (_, index) =>
            text(`Landscape body line ${index + 1}.`),
          ),
        ],
      },
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Back to portrait")],
          }),
          text("Headers and footers are inherited from the first section."),
        ],
      },
    ],
  });
}

function complex() {
  const cell = (value, head = false) =>
    new TableCell({
      shading: head
        ? { type: ShadingType.CLEAR, fill: "EDE7F6", color: "auto" }
        : undefined,
      children: [
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: value, bold: head, size: 19 })],
        }),
      ],
    });
  return new Document({
    creator: "QUICKKIT corpus",
    title: "I — complex multi-page report",
    sections: [
      {
        headers: { default: header("Quarterly report · confidential") },
        footers: { default: footer("Complex report") },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Quarterly operations report")],
          }),
          text("Prepared for the board · 4 November 2026", { italics: true }),
          ...Array.from({ length: 6 }, (_, section) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              pageBreakBefore: section === 2 || section === 4,
              children: [new TextRun(`${section + 1}. Section ${section + 1}`)],
            }),
            ...Array.from(
              { length: 8 },
              (_, line) =>
                new Paragraph({
                  spacing: { after: 80 },
                  alignment:
                    line % 4 === 0 ? AlignmentType.JUSTIFY : AlignmentType.LEFT,
                  children: [
                    new TextRun(
                      `Section ${section + 1}, paragraph ${line + 1}: the quick brown fox jumps over the lazy dog while the document engine measures line height, indentation and justification across a realistic block of prose.`,
                    ),
                  ],
                }),
            ),
            ...(section === 1
              ? [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({
                        tableHeader: true,
                        children: [
                          cell("Metric", true),
                          cell("Value", true),
                          cell("Change", true),
                        ],
                      }),
                      ...["Revenue", "Margin", "Headcount", "Churn"].map(
                        (metric, index) =>
                          new TableRow({
                            children: [
                              cell(metric),
                              cell(`${(index + 1) * 12.5}%`),
                              cell(
                                `${index % 2 ? "+" : "-"}${index + 1}.2 pts`,
                              ),
                            ],
                          }),
                      ),
                    ],
                  }),
                ]
              : []),
            ...(section === 3
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        type: "png",
                        data: png,
                        transformation: { width: 120, height: 120 },
                      }),
                    ],
                  }),
                ]
              : []),
          ]).flat(),
        ],
      },
    ],
  });
}

function stressPages(chapters) {
  const rows = [];
  for (let index = 0; index < chapters; index++) {
    rows.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(`Chapter ${index + 1}`)],
      }),
      ...Array.from(
        { length: 3 },
        (_, line) =>
          new Paragraph(
            `Chapter ${index + 1}, line ${line + 1}: stress content with numbers ${index * 7 + line} and a sentence long enough to wrap once inside the text column of the page.`,
          ),
      ),
      new Paragraph({ children: [new PageBreak()] }),
    );
  }
  return new Document({
    creator: "QUICKKIT corpus",
    title: `J — ${chapters}-page stress document`,
    sections: [
      {
        headers: { default: header("Stress document") },
        footers: { default: footer("Stress") },
        children: rows,
      },
    ],
  });
}

const cases = [
  [
    "a-simple.docx",
    () =>
      simple([
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Simple one-page document")],
        }),
        text("This document has a heading, two paragraphs and a closing line."),
        text(
          "The second paragraph checks that consecutive paragraphs keep their line spacing.",
        ),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Centred closing line", italics: true }),
          ],
        }),
      ]),
  ],
  ["b-resume.docx", resume],
  ["c-tables.docx", tables],
  ["d-images.docx", images],
  ["e-headers-footers.docx", headersFooters],
  ["f-fonts.docx", fonts],
  ["g-landscape.docx", landscape],
  ["h-mixed-orientation.docx", mixedOrientation],
  ["i-complex-report.docx", complex],
  ["j-stress-100-pages.docx", () => stressPages(100)],
  ["k-stress-250-pages.docx", () => stressPages(250)],
];

await mkdir(OUT, { recursive: true });
for (const [name, build] of cases) {
  const buffer = await Packer.toBuffer(build());
  await writeFile(`${OUT}/${name}`, buffer);
  console.log(`${name} ${(buffer.length / 1024).toFixed(0)} KiB`);
}
