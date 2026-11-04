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
      content={{
        steps: [
          "Choose Lock or Unlock, then drop in one or more PDFs. QUICKKIT inspects each file locally for page count, dimensions, encryption status and features that should not be rewritten silently.",
          "To lock: set an open password, confirm it, optionally set a separate permissions password, choose AES-256 (recommended) or AES-128 compatibility, and configure printing, copying, editing, annotations, forms, assembly and accessibility permissions.",
          "To unlock: enter the correct existing password and confirm you own the PDF or have permission to remove protection. Use a shared password for the batch or individual passwords per file. Incorrect passwords are rejected without changing the original.",
          "Process the queue, review the verified result for each file, rename outputs if needed, then download individual PDFs or one ZIP. Keep the originals until you have checked the results in your PDF reader.",
        ],
        faqs: [
          {
            q: "How do I lock a PDF?",
            a: "Open the Lock tab, add your PDFs, set and confirm an open password, optionally add a separate permissions password, choose an encryption standard and permission settings, then click Lock. QUICKKIT encrypts the file locally with QPDF WebAssembly and reopens the output to verify that encryption, permissions, page count, dimensions and metadata were preserved before offering a download.",
          },
          {
            q: "How do I unlock a PDF?",
            a: "Open the Unlock tab, add the protected PDFs, enter the correct existing password, confirm authorization, and click Unlock. QUICKKIT removes opening-password protection and, where technically supported, permission restrictions. It verifies that the output is unencrypted and reopenable. If the password is wrong, the original PDF is left unchanged and a clear error is shown.",
          },
          {
            q: "What is the difference between an Open Password and a Permissions Password?",
            a: "The open password (user password) is required to view the document. The permissions password (owner password) controls who can change reader restrictions in supporting software. If you do not set a separate permissions password, the open password also grants owner access, so anyone who can open the file may be able to change permissions. Permission flags are reader-enforced requests, not strong encryption.",
          },
          {
            q: "What encryption is actually used?",
            a: "The default is AES-256 with the PDF 2.0 standard security handler (V5/R6, AESV3). For older readers, AES-128 (V4/R4, AESV2) is available. Broken RC4 modes are not offered for locking. Legacy RC4-encrypted PDFs can be unlocked with the correct password. AES-256 output is written with a PDF 1.7 header plus Adobe extension level 8 where needed, and is supported by modern PDF readers; test your target reader for critical workflows.",
          },
          {
            q: "Can QUICKKIT recover a lost PDF password?",
            a: "No. There is no password cracking, brute-force, dictionary attack, guessing or security bypass. Unlocking requires the correct existing password and appropriate authorization. If a password is lost, restore it from your own records or ask the document owner; QUICKKIT cannot recover it.",
          },
          {
            q: "Are my PDFs or passwords uploaded or stored?",
            a: "No. Processing happens locally in a dedicated browser worker using same-origin QPDF WebAssembly assets. QUICKKIT does not receive your files, file names, passwords or outputs. Passwords are kept only in current page/worker memory, are never written to URLs, analytics, local storage or the console, and are cleared after processing, cancellation or clearing the queue. Closing the tab clears the in-memory data.",
          },
          {
            q: "Will permissions stop everyone from copying or printing?",
            a: "No. PDF permission restrictions depend on reader software and are not equivalent to strong encryption. Compliant readers usually respect them, but non-compliant tools may ignore them. The open password and AES encryption protect the document bytes; permissions alone do not. Always test important restrictions in the readers your audience uses.",
          },
          {
            q: "What are the limits and compatibility notes?",
            a: "Up to 20 PDFs per batch, 50 MiB per file, 100 MiB total, 1,000 pages per file and 2,000 pages total, subject to device memory. No pages are silently truncated. AES-256 supports Unicode passwords up to 127 UTF-8 bytes; AES-128 compatibility mode requires printable ASCII passwords up to 32 characters. Digitally signed PDFs are blocked because rewriting invalidates signatures. Dynamic XFA forms, attachments, JavaScript and tagged structure are preserved where possible but should be checked in the target reader. PDF/A conformance is not guaranteed after encryption.",
          },
        ],
      }}
    >
      <PdfLockUnlock />
    </ToolShell>
  );
}
