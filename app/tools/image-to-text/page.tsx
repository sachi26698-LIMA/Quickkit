import ToolShell from "@/components/tool-shell";
import ImageToText from "@/components/tools/image-to-text";
import { pageMetadata, toolStructuredData } from "@/lib/seo";

const steps = [
  "Drop in or choose the images — JPG, PNG, WEBP, BMP, TIFF, AVIF — or a scanned PDF. Up to 40 files and 25 MB each; every file stays in the tab and is decoded on your device.",
  "Pick the languages that appear on the page. English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu ship with the tool and all of them run locally. After the first read, the detected script is offered for one-click confirmation.",
  "Choose an extraction mode: Plain Text, Original Layout, Formatted Text, Table Extraction, Structured Data or Smart OCR, which inspects the page and picks the best one. Rotate, crop and enhance any image first — grayscale, contrast, noise removal, skew correction.",
  "Press Start OCR. Progress is shown per page and for the whole batch, the engine works in a background worker, and Cancel stops it immediately. Nothing is uploaded at any point.",
  "Check the text beside the original page, proofread the highlighted low-confidence words, then find-and-replace or edit freely with undo and redo.",
  "Export as TXT, DOCX, PDF, CSV or JSON — one combined document, a single page, the pages you selected, or one file per page. Indic scripts keep their characters in every format.",
];

const faqs = [
  {
    q: "Are my images or PDFs uploaded anywhere?",
    a: "No. Images are decoded with your browser's own decoder, the OCR engine runs in a Web Worker on this device, and the language data is served from this site — never from a third-party OCR service. QUICKKIT receives no file, no image and no extracted text. There is no server-side OCR fallback, so nothing can be uploaded even in error.",
  },
  {
    q: "Which languages are actually supported?",
    a: "English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu. Those eight models are the ones shipped with this build, and no other language is advertised. You can select several at once for mixed-language pages; accuracy on handwriting and on damaged scans is lower for every language, and the confidence highlighting tells you exactly which words to check.",
  },
  {
    q: "How good is handwriting recognition?",
    a: "Best-effort, and honestly not comparable to printed text. Clean block letters usually read well; joined-up or rapid handwriting, signatures and stamps often will not. The tool never hides this: uncertain words are highlighted, each page shows its mean confidence, and a low score is reported instead of guessing silently.",
  },
  {
    q: "Can it read tables and receipts?",
    a: "Yes. Table Extraction groups lines into rows by vertical position and splits columns by horizontal gaps, so the grid survives editing and CSV export. Structured Data pulls out label/value pairs such as Invoice No, Date or Total, and keeps any tables it finds. Smart OCR checks the page for those patterns first and explains in the editor why it chose a mode.",
  },
  {
    q: "What happens with scanned PDFs?",
    a: "The PDF is rendered page by page in your browser at roughly 300 DPI and each page is then read exactly like an image. Use the page range setting for long documents, or the per-file page count is respected with a 40-page limit per PDF. Password-protected PDFs are reported as such rather than failing silently.",
  },
  {
    q: "Is the PDF export searchable?",
    a: "Yes, including Hindi, Gujarati, Bengali, Tamil, Telugu and Urdu. Latin text is written into the PDF as ordinary selectable text. For scripts the standard PDF fonts cannot encode, the page is drawn by your browser so the letterforms and conjuncts are correct, and an invisible Unicode text layer is placed over every line. That means you can select, copy and search the original text in the PDF, while the visible page keeps its correct shaping. The export report tells you exactly how many pages were written as plain text and how many lines carry that selectable layer. DOCX, TXT and JSON hold the text natively, which is the best choice for further editing.",
  },
  {
    q: "What about the file-size or memory cost of a big batch?",
    a: "Reading happens one page at a time in a worker, images are reduced to a sensible reading resolution first, and finished page images are released as soon as their text layer exists. Typical measured figures on a laptop-class machine: a 12-megapixel scan takes about 2.3 seconds, a four-file mixed batch about 2.5 seconds, and the JavaScript heap stayed around 13 MB throughout. Cancelling a batch stops the engine immediately and still frees the worker.",
  },
  {
    q: "Can I edit the text and keep the changes?",
    a: "Yes. Every page has its own editable text with undo and redo, find and replace with match-case and whole-word options, copy-selection and copy-all. Edits are kept for the current tab only — refreshing or closing the page discards them, because nothing is stored.",
  },
  {
    q: "Is there a file-size or page limit?",
    a: "Up to 40 images or PDF pages per batch, 25 MB per file and 200 MB per batch. Very large images are reduced to a sensible reading resolution (you can raise or lower it with the accuracy preference), and batch concurrency can stay at one page at a time to keep memory low on a phone.",
  },
];

export const metadata = pageMetadata(
  "Image to Text (OCR) — extract editable text from images and scans locally",
  "Free OCR that runs in your browser: extract text from photos, screenshots, receipts, tables and scanned PDFs in English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu. Six extraction modes, confidence highlighting, an editable side-by-side editor, and TXT, DOCX, PDF, CSV or JSON export. Nothing is uploaded.",
  "/tools/image-to-text",
);

export default function Page() {
  const jsonLd = toolStructuredData({
    name: "Image to Text (OCR)",
    description:
      "On-device OCR for images and scanned PDFs with multi-language support, table and field extraction, an editable side-by-side editor and Unicode-safe DOCX, PDF, CSV, JSON and TXT export.",
    path: "/tools/image-to-text",
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
      <ToolShell slug="image-to-text" content={{ steps, faqs }}>
        <ImageToText />
      </ToolShell>
    </>
  );
}
