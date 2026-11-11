import ToolShell from "@/components/tool-shell";
import PdfToWord from "@/components/tools/pdf-to-word";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  "PDF to Word Converter — PDF to Editable DOCX",
  "Convert PDFs into editable Word (DOCX) files in your browser with layout or clean-flow modes, page ranges, side-by-side preview, and on-device OCR.",
  "/tools/pdf-to-word",
);

export default function Page() {
  return (
    <ToolShell
      slug="pdf-to-word"
      headingDescription="Convert PDFs into editable Word (DOCX) files in your browser with layout or clean-flow modes, page ranges, side-by-side preview, and on-device OCR."
      stepsHeading="How to convert a PDF into editable Word text"
      faqsHeading="PDF to Word questions, answered"
      relatedHeading="More ways to work with PDFs"
      referenceSection={
        <ToolReferenceSection
          slug="pdf-to-word"
          entry={TOOL_SEO_CONTENT["pdf-to-word"]}
        />
      }
      content={{
        steps: [
          "Drop in or choose your PDFs (up to 50 files, 25 MB each). Every file is inspected on your device first — page count, whether it has a text layer, and any problem such as a password or corruption is shown before you convert. Use the eye button to preview the actual PDF page by page.",
          "Pick a mode. Original Layout keeps each page's size and places text and images close to where they sit in the PDF. Clean Editable rebuilds a flowing document with tidy headings, lists and tables that is easiest to edit. Advanced settings let you convert only selected pages (for example 1-3, 5), choose what to preserve, and name the output files.",
          "If a file is marked Scanned, tick “Use OCR for scanned pages” so its text can be read from the page images, and pick the document language. OCR also runs fully on your device — it is just slower.",
          "Convert, then preview the converted Word file next to the original PDF to check the result before you rely on it. Download each Word file on its own or everything at once as a ZIP with a batch report. Every file gets a quality report — anything that could not be carried over is listed there instead of being hidden.",
        ],
        faqs: [
          {
            q: "Are my PDFs uploaded anywhere?",
            a: "No. Inspection, previews, text extraction, conversion, OCR and ZIP creation all run locally in your browser. QUICKKIT never receives your files or their contents. Optional recent-conversion history stores only the converted DOCX files, only in your own browser, and only if you turn retention on — original PDFs are never stored.",
          },
          {
            q: "Will the Word file look exactly like my PDF?",
            a: "Not pixel-for-pixel — no honest converter can promise that, and this one never claims a percentage accuracy. Original Layout mode preserves page size and approximate positions, sizes and alignment; Clean Editable mode rebuilds the reading flow for easy editing. Fonts are substituted with standard Word fonts, multi-column reading order is approximated, and vector drawings or form fields cannot be carried over. That is exactly why the side-by-side preview and the per-file quality report exist: you can see what changed before downloading.",
          },
          {
            q: "What happens with tables, images and links?",
            a: "Text arranged in clear columns is detected and rebuilt as a real Word table. Images stored inside the PDF are extracted and placed back into the document at their page position. Clickable web links in the PDF become real Word hyperlinks. You can switch any of these off in Advanced settings. Purely decorative vector graphics and backgrounds are not reproduced, and anything that could not be carried over is counted in the quality report.",
          },
          {
            q: "Can I convert only some pages?",
            a: "Yes. In Advanced settings, enter a page range such as 1-3, 5, 8-10 and only those pages are converted. The quality report records the selection, and page numbers beyond the end of a particular file are ignored with a note.",
          },
          {
            q: "Which languages can OCR read?",
            a: "English, Hindi and Gujarati. OCR runs entirely on your device and is only loaded when you switch it on for scanned PDFs. Handwriting and very low-quality scans will still come out imperfect — the quality report says which pages were read with OCR so you know where to proofread.",
          },
          {
            q: "Why did a file fail to convert?",
            a: "The usual reasons are a password-protected or corrupted PDF, a file over the size or page limit, or a scanned PDF converted with OCR switched off. Each failed file names its specific reason and can be retried after you fix it — QUICKKIT never renames a PDF or returns an empty document pretending the conversion worked.",
          },
        ],
      }}
    >
      <PdfToWord />
    </ToolShell>
  );
}
