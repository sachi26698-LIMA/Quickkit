import ToolShell from "@/components/tool-shell";
import PdfStudio from "@/components/tools/pdf-studio";
import { pageMetadata, toolStructuredData } from "@/lib/seo";

const steps = [
  "Add one or more PDFs from your device, or drop them into the upload area. Each file's real page count is read before anything else, so the page grid, the plan summary and the button all describe what is actually there. Up to 25 MB and 100 pages per document.",
  "Choose what to write: merge everything into one PDF, extract just the pages you name, split into one PDF per range, or compress. The setting explains each action in plain words before you pick it.",
  "Work on the pages. Drag a thumbnail to reorder it, rotate a single page a quarter turn at a time, or mark a page as removed. Nothing is applied until you run, and the plan line updates as you go.",
  "Set the page ranges when you extract or split, for example 1-3, 7. Ranges apply to each file, so 1-2 across two PDFs means pages 1–2 of each. An invalid range is reported and blocks the run rather than guessing.",
  "For compress, pick a quality preset. Image streams are recompressed at that setting while text stays crisp, so a text-heavy document shrinks less than a scan-heavy one.",
  "Optionally set a document title and a file name, then run. Split produces one PDF per range, downloaded individually or as a single ZIP. Every output shows its page count and real file size before you save it.",
];

const faqs = [
  {
    q: "Are my PDFs uploaded anywhere?",
    a: "No. Pages are read with PDF.js and the output is written with pdf-lib, entirely inside this browser tab. There is no upload, no server-side copy and no logging of file contents. Closing the tab clears the queue and results; your original files are never modified.",
  },
  {
    q: "Can I merge PDFs of different page sizes?",
    a: "Yes. Each page keeps its own dimensions, so a merged document can hold A4 and Letter pages side by side. Nothing is rescaled or cropped to force a uniform size.",
  },
  {
    q: "How does split differ from extract?",
    a: "Extract writes one PDF containing every page in your range, in the original order. Split writes one PDF per range, so 1-3, 7 produces two files. Split parts get their range appended to the file name, and you can take them individually or as one ZIP.",
  },
  {
    q: "Do ranges apply across all my files at once?",
    a: "Ranges apply to each file separately. Entering 1-2 with two PDFs queued takes pages 1–2 from each of them. The plan line tells you how many pages from how many files will be written before you run.",
  },
  {
    q: "Can I rotate or reorder individual pages?",
    a: "Yes. Each page has its own rotate control, turning a quarter turn at a time, and pages can be dragged into a new order. Rotation and order are recorded in the plan and written to the output. Pages can also be marked as removed instead of deleted from your source file.",
  },
  {
    q: "What does compress actually do?",
    a: "It rebuilds the kept pages and recompresses the image streams inside them at the quality preset you choose. Text is left alone, so it stays crisp. A document that is mostly text will shrink less than a scan or a photo-heavy export, and the real output size is shown before you download.",
  },
  {
    q: "What happens if a page or file fails?",
    a: "The failure is reported with its message and the run does not pretend it succeeded. Progress shows how many pages completed out of how many were planned, so a partial result is never presented as a complete one. Password-protected PDFs are refused with a clear message rather than producing blank pages.",
  },
  {
    q: "How does this differ from PDF Merger, PDF Splitter and PDF Compressor?",
    a: "Those three remain available as separate single-purpose tools. PDF Studio combines them in one workspace and adds the page-level work they do not do: rotating, reordering and removing individual pages across several documents before you write the result.",
  },
];

export const metadata = pageMetadata(
  "PDF Studio — merge, split, extract, rotate and compress PDF pages",
  "Merge PDFs, extract or split page ranges, rotate, reorder and remove individual pages, and compress the result in your browser. Live thumbnails, real page counts and verified output. No upload.",
  "/tools/pdf-studio",
);

export default function Page() {
  const jsonLd = toolStructuredData({
    name: "PDF Studio",
    description:
      "Local browser tool for page-level PDF work: merge multiple documents, extract or split page ranges, rotate, reorder and remove individual pages, compress image streams, with live thumbnails, real page counts and single-file or ZIP download.",
    path: "/tools/pdf-studio",
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
      <ToolShell slug="pdf-studio" content={{ steps, faqs }}>
        <PdfStudio />
      </ToolShell>
    </>
  );
}
