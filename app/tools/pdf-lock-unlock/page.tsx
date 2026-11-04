import ToolShell from "@/components/tool-shell";
import PdfLockUnlock from "@/components/tools/pdf-lock-unlock";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "PDF Lock & Unlock — AES-256 password protection locally",
  "Lock PDFs with AES-256 or AES-128 encryption, open and permissions passwords, and reader permission controls — or unlock PDFs with the correct existing password. Batch processing, verified downloads and ZIP export, all in your browser.",
  "/tools/pdf-lock-unlock",
);

export default function Page() {
  return (
    <ToolShell
      slug="pdf-lock-unlock"
      variant="compact"
      headingDescription="Password-protect or unlock PDFs locally, with verified results."
      content={{
        steps: [
          "Choose Lock or Unlock and add PDFs. QUICKKIT inspects each file locally before processing.",
          "To lock, set and confirm an open password, choose AES-256 or AES-128, and configure permissions. To unlock, enter the correct existing password and confirm authorization.",
          "Process the queue, review each verified result, rename outputs if needed, then download PDFs individually or as a ZIP.",
        ],
        faqs: [
          {
            q: "What is the difference between an open password and a permissions password?",
            a: "The open password is required to view the PDF. The optional permissions (owner) password controls who can change reader restrictions. Without a separate owner password, the open password also grants owner access in supporting readers.",
          },
          {
            q: "What encryption is actually used?",
            a: "The default is AES-256 (PDF 2.0 / R6, AESV3). AES-128 (PDF 1.6 / R4, AESV2) is available for older readers and requires printable ASCII passwords up to 32 characters. Broken RC4 modes are not offered for locking.",
          },
          {
            q: "Are my PDFs or passwords uploaded or stored?",
            a: "No. Processing runs locally in a browser worker with same-origin QPDF WebAssembly. QUICKKIT does not receive your files or passwords. Passwords stay in current page/worker memory and are cleared after processing, cancellation or clearing the queue.",
          },
          {
            q: "Will permissions stop everyone from copying or printing?",
            a: "No. Permission flags are reader-enforced requests, not strong encryption. Compliant readers usually respect them, but non-compliant tools may ignore them. The open password and AES encryption protect the document bytes.",
          },
          {
            q: "Can QUICKKIT recover a lost PDF password?",
            a: "No. Unlocking requires the correct existing password and your authorization. There is no cracking, brute force, guessing or bypass. Restore a lost password from your own records or ask the document owner.",
          },
          {
            q: "What are the limits and compatibility notes?",
            a: "Up to 20 PDFs, 50 MiB per file, 100 MiB total, 1,000 pages per file and 2,000 pages per queue, subject to device memory. No pages are silently truncated. Digitally signed PDFs are blocked because rewriting invalidates signatures. Check important results in your target reader.",
          },
        ],
      }}
    >
      <PdfLockUnlock />
    </ToolShell>
  );
}
