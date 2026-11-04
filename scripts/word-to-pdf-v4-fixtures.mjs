// Synthetic DOCX inputs, NOT native output or fidelity certification.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ExternalHyperlink,
  ImageRun,
  PageBreak,
  PageOrientation,
} from "docx";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDasAAAAASUVORK5CYII=",
  "base64",
);
const cell = (text) => new TableCell({ children: [new Paragraph(text)] });
export async function buildFixture(pages = 4, complex = false) {
  const header = new Header({
      children: [
        new Paragraph("QUICKKIT synthetic native validation — header"),
      ],
    }),
    footer = new Footer({
      children: [
        new Paragraph("Synthetic footer — inspect positioning and pagination"),
      ],
    });
  const children = [];
  for (let i = 0; i < pages; i++) {
    children.push(
      new Paragraph({
        children: [
          ...(i ? [new PageBreak()] : []),
          new TextRun({
            text: `Native fixture page ${i + 1} of ${pages}`,
            bold: true,
          }),
        ],
      }),
      new Paragraph(
        `Deterministic validation text on page ${i + 1}. Do not label this an actual native success before conversion.`,
      ),
    );
    if (complex && i === 0)
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Requested custom font; operator must install/license and inspect actual embedding.",
              font:
                process.env.WORD_TO_PDF_FIXTURE_FONT ||
                "Quickkit Operator Test Font",
            }),
          ],
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 2,
                  children: [new Paragraph("Merged table heading")],
                }),
              ],
            }),
            new TableRow({
              children: [
                cell("Left cell — wraps within its column."),
                cell("Right cell\nSecond line"),
              ],
            }),
            new TableRow({
              children: [cell("Repeated data row"), cell("123.45")],
            }),
          ],
        }),
        new Paragraph({
          children: [
            new ExternalHyperlink({
              link: "https://example.com/quickkit-fidelity",
              children: [
                new TextRun({
                  text: "HTTP hyperlink (click-test final PDF)",
                  style: "Hyperlink",
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: png,
              transformation: { width: 96, height: 48 },
            }),
          ],
        }),
        new Paragraph("QUICKKIT_CACHED_CHART_MARKER"),
      );
  }
  const sections = [
    {
      headers: { default: header },
      footers: { default: footer },
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, bottom: 900, left: 900, right: 900 },
        },
      },
      children,
    },
  ];
  if (complex)
    sections.push({
      headers: { default: header },
      footers: { default: footer },
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: 900, bottom: 900, left: 900, right: 900 },
        },
      },
      children: [
        new Paragraph(
          "Mixed section: US Letter landscape. Check actual PDF dimensions and section break.",
        ),
      ],
    });
  const bytes = new Uint8Array(
    await Packer.toBuffer(new Document({ sections })),
  );
  if (!complex) return bytes;
  const files = unzipSync(bytes);
  const drawing =
    '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="3048000" cy="1524000"/><wp:docPr id="333" name="Cached-only synthetic bar chart"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdQuickkitChart"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  let document = strFromU8(files["word/document.xml"]);
  document = document.replace(
    /<w:r>\s*<w:t[^>]*>QUICKKIT_CACHED_CHART_MARKER<\/w:t>\s*<\/w:r>/,
    drawing,
  );
  if (document.includes("QUICKKIT_CACHED_CHART_MARKER"))
    throw new Error("Chart insertion failed");
  files["word/document.xml"] = strToU8(document);
  files["word/_rels/document.xml.rels"] = strToU8(
    strFromU8(files["word/_rels/document.xml.rels"]).replace(
      "</Relationships>",
      '<Relationship Id="rIdQuickkitChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart1.xml"/></Relationships>',
    ),
  );
  files["[Content_Types].xml"] = strToU8(
    strFromU8(files["[Content_Types].xml"]).replace(
      "</Types>",
      '<Override PartName="/word/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>',
    ),
  );
  files["word/charts/chart1.xml"] = strToU8(
    '<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Cached synthetic data</c:v></c:tx><c:cat><c:strLit><c:ptCount val="2"/><c:pt idx="0"><c:v>A</c:v></c:pt><c:pt idx="1"><c:v>B</c:v></c:pt></c:strLit></c:cat><c:val><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>3</c:v></c:pt><c:pt idx="1"><c:v>7</c:v></c:pt></c:numLit></c:val></c:ser><c:axId val="100"/><c:axId val="200"/></c:barChart><c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="200"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>',
  );
  return zipSync(files, { level: 6 });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const output = process.argv[2] || "test-results/word-to-pdf-v4-fixtures";
  await mkdir(output, { recursive: true });
  for (const pages of [100, 500, 1000])
    await writeFile(`${output}/${pages}-pages.docx`, await buildFixture(pages));
  await writeFile(`${output}/complex.docx`, await buildFixture(4, true));
  console.log(
    `Synthetic DOCX fixtures written to ${output}; native rendering remains unverified.`,
  );
}
