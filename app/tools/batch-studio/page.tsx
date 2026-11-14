import ToolShell from "@/components/tool-shell";
import BatchStudio from "@/components/tools/batch-studio";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Batch Barcode Studio — Mixed CSV to SVG and PNG",
  "Turn a CSV into a ZIP of barcode symbols, one symbology per row if you need it: every row validated on its own, formats grouped into separate archives.",
  "/tools/batch-studio",
);

export default function Page() {
  return (
    <ToolShell
      slug="batch-studio"
      headingDescription="Paste a CSV and download an archive of symbols plus a report that names every row. A format column makes the sheet mixed-symbology, and each format is exported in its own folder — because a Code 128 label and a QR code cannot share a print run without per-row layout decisions."
      stepsHeading="How a batch run works"
      faqsHeading="Batch questions, answered"
      relatedHeading="Single labels, checks and lookups"
      content={{
        steps: [
          "Paste your rows or upload a CSV. The first row is the header, and the data, label and format columns are detected from the header names — you can override any of the three.",
          "Decide how the format is chosen. With a format column, each row's cell decides its symbology (EAN-13, Code 128, ITF-14, GS1-128, QR, Data Matrix, PDF417 and the rest); without one, a single fallback format applies to the whole sheet. An unrecognised cell is reported as invalid instead of being silently replaced.",
          "Read the result table before downloading. Rows are grouped by symbology and separated into ready, duplicate, skipped and invalid, each with the encoder's own sentence. One bad row never stops the rest.",
          "Download a folder per format, or one combined archive whose folders are named after each symbology, plus a report CSV with the same wording. The SVG files stay sharp at any print size; the PNG files are rendered at 3× for screen previews.",
        ],
        faqs: [
          {
            q: "Can one CSV carry different barcode formats?",
            a: "Yes. Add a format column and each row is encoded with the symbology its cell names, using ids or display names such as ean13, EAN-13, code128, itf14, gs1-128, qrcode, datamatrix or pdf417. Because the symbologies have different module widths, quiet zones and caption rules, the export is grouped into one folder per format rather than flattened into a single sheet. A cell that names no known format is reported as invalid — the tool never substitutes a symbology.",
          },
          {
            q: "What happens to a row that fails its check digit?",
            a: "It is marked invalid with the encoder's reason, and it is excluded from the ZIP. The tool never repairs a number: changing a digit to make a check digit pass would print a different product's barcode.",
          },
          {
            q: "Are duplicates removed?",
            a: "No, by default they are kept and flagged. Printing the same label twice is a normal, deliberate act on a multi-page sheet, so removing rows silently would be worse than keeping them with a note. The table shows which earlier row each duplicate matches.",
          },
          {
            q: "What are the limits, and what happens to a huge or broken file?",
            a: "1,000 data rows, a 5 MB file, 30 columns and 1,500 characters per cell. The CSV parser handles quoted fields, embedded commas and newlines, ragged rows and a missing final quote without throwing; anything it had to drop is reported above the table. When a file exceeds the row ceiling the run says so instead of pretending the whole file was processed — a 1,000-row mixed encode is measured at about 0.1 s in the test suite.",
          },
          {
            q: "Do 2D formats work in a batch too?",
            a: "Yes. QR Code, GS1 QR Code, Data Matrix and PDF417 rows are encoded alongside linear rows in the same run, and each 2D row keeps its own rendered symbol. They land in their own folder because a square 2D symbol and a 37 mm linear label cannot share a print layout.",
          },
          {
            q: "Is the CSV uploaded?",
            a: "No. The file is read in the browser with the File API and parsed locally. The ZIP is assembled in the tab too, so neither your product numbers nor your labels leave the device.",
          },
        ],
      }}
    >
      <BatchStudio />
    </ToolShell>
  );
}
