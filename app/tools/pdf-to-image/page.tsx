import ToolShell from "@/components/tool-shell";
import PdfToImage from "@/components/tools/pdf-to-image";
import { pageMetadata, toolStructuredData } from "@/lib/seo";

const steps = [
  "Add a PDF from your device or drop it into the upload area. The tool reads the real page count before anything else, so the range hint and the export button tell you the truth. Up to 25 MB and 100 pages per document.",
  "Choose the pages. Leave the range blank for every page, or type a range such as 1-3, 5. The hint resolves it against the actual page count and says how many pages you selected, or explains why a range is invalid.",
  "Pick the output format. JPG is the smallest and has no transparency, PNG is lossless, WEBP is offered only when this browser can actually encode it. Quality applies to JPG and WEBP; PNG ignores it and says so.",
  "Set the resolution. 72 to 600 DPI, with one-tap presets at 96, 150, 200, 300, 400 and 600. Higher DPI keeps print detail and grows the file; pages are capped at 36 megapixels so a huge page cannot exhaust the tab.",
  "Optionally set a page background colour, flattened behind the page content before encoding, plus a custom base name and suffix. Pages are named base-page-001, base-page-002 and so on.",
  "Export. Progress counts the pages as they render, and every page lands in the results list with its own dimensions, file size and download button. Take single pages, or download the whole set as one ZIP.",
];

const faqs = [
  {
    q: "Is my PDF uploaded anywhere?",
    a: "No. The PDF is read with PDF.js, each page is rasterised on a canvas, and the images are encoded in this browser tab. There is no upload, no server-side copy and no logging of file contents. Closing the tab clears the queue and results; your original file is never modified.",
  },
  {
    q: "Which output formats are supported?",
    a: "JPG, PNG and WEBP. JPG gives the smallest files and has no transparency. PNG is lossless, so the quality slider does not apply and the interface marks it as not used. WEBP is listed but disabled with a note if this particular browser cannot encode it, rather than failing after the work is done.",
  },
  {
    q: "Can I export only some pages?",
    a: "Yes. Leave the range empty for every page, or enter a range such as 1-3, 5, 10-12. The field resolves your entry against the document's real page count and reports how many pages are selected. An invalid or out-of-range entry is reported in the field and blocks the export instead of silently doing something else.",
  },
  {
    q: "What resolution should I choose?",
    a: "96 DPI is fine for reading on screen, 150 DPI suits most documents and slides, 300 DPI is the print standard and 600 DPI preserves fine detail for archival scans. The range runs from 72 to 600 DPI. Each page is capped at 36 megapixels, so an unusually large page at a high DPI is scaled down and the tool tells you it was capped.",
  },
  {
    q: "How are the files named?",
    a: "Each page is named from the PDF's own name, or the custom base name you set, followed by a zero-padded page number: brochure-page-001.jpg, brochure-page-002.jpg. An optional suffix is inserted before the page number. The ZIP takes the base name as well.",
  },
  {
    q: "Is the preview the real output?",
    a: "Yes. Before you export, the preview is the source PDF rendered page by page with PDF.js, and the pages your range selects are marked. After you export, the preview shows the images that were actually produced, at their real pixel dimensions, and you can step through them.",
  },
  {
    q: "What happens if a page fails?",
    a: "The failure is reported for that page with its message, and the run does not pretend it succeeded. Progress shows how many pages completed out of how many were requested, so a partial export is never presented as a complete one. Password-protected PDFs are refused with a clear message rather than producing blank pages.",
  },
  {
    q: "Why is an image rejected here?",
    a: "This tool takes a PDF and writes images. An image dropped here is rejected with a message pointing you to Image to Image or Images to PDF, rather than being queued and then failing during the export.",
  },
];

export const metadata = pageMetadata(
  "PDF to Image Converter — export PDF pages as JPG, PNG or WEBP",
  "Render the pages of a PDF to JPG, PNG or WEBP right in your browser. Export every page or a custom range, choose 72 to 600 DPI, preview the real rendered pages, and download single pages or one ZIP. No upload.",
  "/tools/pdf-to-image",
);

export default function Page() {
  const jsonLd = toolStructuredData({
    name: "PDF to Image Converter",
    description:
      "Local browser tool that renders PDF pages to images: all pages or a custom range, JPG, PNG or WEBP output, 72 to 600 DPI with presets, quality and background controls, a real rendered preview, and single-page or ZIP download.",
    path: "/tools/pdf-to-image",
    steps,
    faqs,
  });
  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-rendered structured data; no user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolShell slug="pdf-to-image" content={{ steps, faqs }}>
        <PdfToImage />
      </ToolShell>
    </>
  );
}
