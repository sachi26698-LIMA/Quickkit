import ToolShell from "@/components/tool-shell";
import PdfSplitter from "@/components/tools/split-pdf";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Split PDF — extract ranges and pages locally",
  "Split a PDF by custom ranges, selected pages, every N pages or one PDF per page. Preview pages, name outputs and download validated PDFs or a ZIP. No upload.",
  "/tools/split-pdf",
);

export default function Page() {
  return (
    <ToolShell
      slug="split-pdf"
      content={{
        steps: [
          "Drop in or choose one PDF. QUICKKIT inspects it on your device and explains the next step if it is oversized, unreadable, password-protected, signed or a dynamic XFA form.",
          "Choose how to split: custom range groups such as 1-3; 4-6, selected-page extraction, equal groups of every N pages, or one PDF per page. The page previews show which output each page belongs to.",
          "Review the output plan before processing. Pages omitted by the plan and pages repeated by overlapping custom ranges are called out rather than changed silently.",
          "Set output and ZIP names, split locally, then download each validated PDF or one ZIP containing all outputs. Keep the original PDF and review important results in your reader.",
        ],
        faqs: [
          {
            q: "Are my PDF or password uploaded?",
            a: "No. A dedicated browser worker inspects and splits the bytes on your device, and page previews are rendered locally to canvas images. QUICKKIT does not receive your file, file name, password, selected pages or split outputs. Closing the tab clears the in-memory PDF, password and preview URLs.",
          },
          {
            q: "Can I split a password-protected PDF?",
            a: "Supported encrypted PDFs can be opened with their correct open password, including PDFs that open with a blank user password. The password is kept only in current-page/worker memory, cleared when the PDF is removed, the workspace resets or the split completes, and it is not re-applied to the outputs. Only split documents you are authorized to use.",
          },
          {
            q: "What happens if my ranges overlap or leave pages out?",
            a: "The output plan tells you before processing. Overlapping pages are copied into each matching output, and pages outside every chosen range are simply not included in that run. Duplicate pages inside one range or one extract selection are rejected so the mistake can be fixed.",
          },
          {
            q: "What should I check after splitting forms or complex documents?",
            a: "Interactive AcroForm fields are flattened only when their visible appearances can be checked; they do not remain editable. The original outline, attachments, layers, tagged-PDF structure, scripts and signature validity are not guaranteed in split files. Safe internal destinations that stay inside the same output are retained where possible, while links outside an output are removed and reported. Keep originals and review important output in your PDF reader.",
          },
        ],
      }}
    >
      <PdfSplitter />
    </ToolShell>
  );
}
