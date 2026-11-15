import ToolShell from "@/components/tool-shell";
import BarcodeStudio from "@/components/tools/barcode-studio";
import BarcodeReference from "@/components/tools/barcode-studio/reference";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Barcode Generator — Code 128, EAN-13 & GS1",
  "Generate Code 128, EAN-13, UPC, ITF-14 and GS1-128 barcodes with real check-digit validation, then style, print, bulk-export or scan them in your browser.",
  "/tools/barcode-generator",
);

export default function Page() {
  return (
    <ToolShell
      slug="barcode-generator"
      headingDescription="Create scannable Code 128, EAN, UPC, ITF-14 and GS1-128 labels with check digits enforced, style them, print them at a real physical size, or decode a barcode from a camera or image — nothing leaves your device."
      stepsHeading="How to create a barcode that scans the first time"
      faqsHeading="Barcode questions, answered"
      relatedHeading="More ways to create and read codes"
      referenceSection={
        <>
          <BarcodeReference />
          <ToolReferenceSection
            slug="barcode-generator"
            entry={TOOL_SEO_CONTENT["barcode-generator"]}
          />
        </>
      }
      content={{
        steps: [
          "Pick a symbology — Code 128 for internal labels, EAN-13/EAN-8/UPC for retail, ITF-14 for cases, GS1-128 when a trading partner asks for application identifiers. Type the data: the studio calculates a missing check digit and refuses a wrong one.",
          "Adjust the bar width, symbol height, colours and quiet zone. The preview is an SVG drawn from module geometry, so bars never stretch, and inverted or low-contrast colours are flagged before you print.",
          "Press Check it scans to decode the rendered bars with an independent reader, then download PNG, SVG or a PDF label at a real millimetre size, or send it straight to the printer.",
          "For a batch, switch to Bulk, drop in a CSV, choose the data column and the format, and export a ZIP of SVG or PNG files or a PDF sheet of labels. Every row reports success, duplicates or the exact reason it failed.",
        ],
        faqs: [
          {
            q: "Which barcode formats does this generator support?",
            a: "Eleven: Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, Codabar, MSI, Pharmacode and GS1-128. Each is encoded from its published symbology tables and validated against its own rules — Code 128 accepts printable ASCII, Code 39 accepts 0-9 A-Z and - . $ / + %, EAN-13 takes 12 digits and computes the thirteenth, Pharmacode covers 3 to 131070.",
          },
          {
            q: "Are check digits calculated or verified?",
            a: "Both, depending on what you enter. Give EAN-13 twelve digits and the thirteenth is computed and shown; give it thirteen and the check digit is verified. UPC-A, UPC-E, EAN-8 and ITF-14 work the same way. GS1-128 is stricter: every application identifier must exist in the GS1 table, fixed-length fields must match exactly, and the GTIN (01/02) or SSCC (00) check digit must already be correct.",
          },
          {
            q: "Will the styled barcode still scan?",
            a: "The bars are drawn from module geometry at whole-pixel edges, with the symbology's minimum quiet zone enforced, so colour and size changes never skew the pattern. The Check it scans button decodes the same rectangles you would export and tells you what it read. Contrast below 4.5:1 and light-on-dark colours are flagged, because most scanners reject an inverted symbol.",
          },
          {
            q: "What can I export, and at what size?",
            a: "PNG at up to 6× the preview density, SVG that stays vector, a PDF label at a physical size you choose in millimetres, a ZIP of files for a batch, and a direct print dialog that sends the vector symbol to your printer. The preview reports the symbol's size and narrow-bar width at 300 dpi so you can judge print quality before committing to a run.",
          },
          {
            q: "What are the bulk limits?",
            a: "Up to 1,000 CSV rows, 5 MB per file, 30 columns and 1,500 characters per cell. Rows are validated up front, rendered in small batches so the tab stays responsive, and every row comes back with a status — ready, duplicate or invalid with a reason — plus a report CSV. Invalid rows are never silently dropped.",
          },
          {
            q: "Does the scanner upload my camera or images?",
            a: "No. The camera is only opened after you press Start, frames are read into a canvas and decoded in a Web Worker on transferred pixels, and images are decoded the same way. Camera frames, image files and decoded values stay in the tab; only the results you explicitly copy or export leave it. The scanner reads Code 128, GS1-128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 and Codabar — MSI and Pharmacode are generation-only because the bundled reader does not support them.",
          },
        ],
      }}
    >
      <BarcodeStudio />
    </ToolShell>
  );
}
