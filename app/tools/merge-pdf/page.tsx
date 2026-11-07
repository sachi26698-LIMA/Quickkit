import ToolShell from "@/components/tool-shell";
import PdfMerger from "@/components/tools/merge-pdf";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Merge PDF — combine PDFs locally with page picks",
  "Combine multiple PDFs in your browser. Reorder files, choose pages, unlock supported PDFs locally, add bookmarks and download a validated merged PDF. No upload.",
  "/tools/merge-pdf",
);

export default function Page() {
  return (
    <ToolShell
      slug="merge-pdf"
      content={{
        steps: [
          "Drop in or choose at least two PDFs. Each file is inspected on your device; unreadable, oversized, password-protected, signed and XFA files are identified with a specific next step.",
          "Drag a file’s handle, use Arrow Up or Arrow Down while it is focused, or use the first/up/down/last buttons. On mobile, the buttons give you the same complete ordering controls.",
          "Leave All pages selected, type a clear range such as 1-3, 5, or open the visual page picker and tap pages in or out. Duplicate and out-of-range selections are shown instead of being changed silently.",
          "Set the download name and PDF title, choose whether to add one bookmark per source file, then merge. QUICKKIT reopens and validates the output before offering the download.",
        ],
        faqs: [
          {
            q: "Are my PDFs or passwords uploaded?",
            a: "No. A dedicated browser worker inspects and merges the bytes on your device, and PDF previews are rendered locally to canvas images. QUICKKIT does not receive your files, file names, passwords, page selections or merged output. Closing the tab clears the in-memory queue and preview URLs.",
          },
          {
            q: "Can I merge a password-protected PDF?",
            a: "Supported encrypted PDFs can be opened with their correct open password, including PDFs that open with a blank user password. The password is kept only in current-page/worker memory, cleared when the file is removed, the queue resets or the merge completes, and the merged output is not encrypted. Only merge documents you are authorized to use.",
          },
          {
            q: "Why is a PDF blocked instead of skipped?",
            a: "Blocking is deliberate. Corrupted files, dynamic XFA forms, digitally signed PDFs and forms whose visible values cannot be flattened with confidence are named with an action you can take. QUICKKIT does not silently omit a file or page and pretend the merge is complete.",
          },
          {
            q: "What should I check after merging forms or complex documents?",
            a: "Interactive AcroForm fields are flattened only when their visible appearances can be checked; they do not remain editable. Original bookmarks, attachments, layers, tagged-PDF structure, scripts and signature validity are not preserved. Safe internal destinations are retargeted, while links to unselected pages are removed and reported. Keep originals and review important output in your PDF reader.",
          },
        ],
      }}
    >
      <PdfMerger />
    </ToolShell>
  );
}
