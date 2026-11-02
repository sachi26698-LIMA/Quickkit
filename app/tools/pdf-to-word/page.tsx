import ToolShell from "@/components/tool-shell";
import PdfToWord from "@/components/tools/pdf-to-word";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "PDF to Word Converter — turn PDFs into editable DOCX locally",
  "Convert PDF documents to editable Microsoft Word DOCX files in your browser. Two conversion modes, batch processing with ZIP download and optional on-device OCR for scanned PDFs. Nothing is uploaded.",
  "/tools/pdf-to-word",
);

export default function Page() {
  return (
    <ToolShell
      slug="pdf-to-word"
      content={{
        steps: [
          "Drop in or choose your PDFs (up to 50 files, 25 MB each). Every file is inspected on your device first — page count, whether it has a text layer, and any problem such as a password or corruption is shown before you convert.",
          "Pick a mode. Original Layout keeps each page's size and places text and images close to where they sit in the PDF. Clean Editable rebuilds a flowing document with tidy headings, lists and tables that is easiest to edit.",
          "If a file is marked Scanned, tick “Use OCR for scanned pages” so its text can be read from the page images. OCR also runs fully on your device — it is just slower.",
          "Convert, then download each Word file on its own or everything at once as a ZIP with a batch report. Anything that could not be carried over is listed in the result notes instead of being hidden.",
        ],
        faqs: [
          {
            q: "Are my PDFs uploaded anywhere?",
            a: "No. Text extraction, conversion, OCR and ZIP creation all run locally in your browser using PDF.js, an on-device OCR engine and a DOCX writer shipped with this page. QUICKKIT never receives your files or their contents, and closing the tab clears the in-memory queue.",
          },
          {
            q: "Will the Word file look exactly like my PDF?",
            a: "Not pixel-for-pixel — no honest converter can promise that. Original Layout mode preserves page size and approximate positions, sizes and alignment; Clean Editable mode rebuilds the reading flow for easy editing. Fonts are substituted with standard Word fonts, multi-column reading order is approximated, and vector drawings or form fields cannot be carried over. The result notes tell you what was approximated.",
          },
          {
            q: "What happens with tables and images?",
            a: "Text arranged in clear columns is detected and rebuilt as a real Word table. Images stored inside the PDF are extracted and placed back into the document at their page position. Purely decorative vector graphics and backgrounds are not reproduced, and any image that cannot be decoded is counted in the result notes.",
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
