import ToolShell from "@/components/tool-shell";
import BatchStudio from "@/components/tools/batch-studio";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Batch Barcode Studio — CSV to SVG, PNG and Report",
  "Turn a CSV of product numbers into a ZIP of barcode symbols, with every row's status reported as valid, duplicate or invalid and a matching report CSV.",
  "/tools/batch-studio",
);

export default function Page() {
  return (
    <ToolShell
      slug="batch-studio"
      headingDescription="Paste a CSV, choose one symbology, and download an archive of symbols plus a report that names every row. Rows that cannot be encoded are listed with their reason instead of disappearing."
      stepsHeading="How a batch run works"
      faqsHeading="Batch questions, answered"
      relatedHeading="Single labels, checks and lookups"
      content={{
        steps: [
          "Paste your rows or upload a CSV. The first row is the header, and the first column holding barcode data is detected automatically — you can override both the data column and an optional label column.",
          "Choose one format for the whole run. A single label sheet should use one symbology; mixing Code 128 and EAN-13 in one print run produces a sheet nobody can verify at a glance.",
          "Read the result table before downloading. It separates rows that are ready, rows that repeat an earlier value, and rows that failed, with the encoder's own sentence for each failure. Nothing is dropped silently.",
          "Download SVG or PNG symbols as a ZIP, plus a report CSV with the same wording. The SVG files stay sharp at any print size; the PNG files are rendered at 3× for screen previews.",
        ],
        faqs: [
          {
            q: "Why does one format apply to the whole batch?",
            a: "Because a batch is a print job. Different symbologies need different module widths, quiet zones and human-readable text placement, so a mixed sheet would need a layout decision per row that a CSV cannot express. Run two batches instead, one per format.",
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
            q: "What are the limits?",
            a: "1,000 data rows, a 5 MB file, 30 columns and 1,500 characters per cell. These caps keep the tab responsive; the encoder reports when a run was truncated rather than pretending the whole file was processed.",
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
