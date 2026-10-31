import ToolShell from "@/components/tool-shell";
import QrGenerator from "@/components/tools/qr-generator";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "QR Code Generator — create and download PNG codes",
  "Create QR codes for links or text, preview locally and download a high-resolution PNG. No third-party QR service or input upload.",
  "/tools/qr-generator",
);
export default function Page() {
  return (
    <ToolShell
      slug="qr-generator"
      content={{
        steps: [
          "Enter a link or plain text (within 2,000 UTF-8 bytes).",
          "Choose Generate QR code to create a local preview.",
          "Download the PNG, and scan it with your phone to check it before sharing.",
        ],
        faqs: [
          {
            q: "Does a QR code expire?",
            a: "The generated code stores the text directly and does not use a QUICKKIT redirect. The code itself does not expire, but a website it points to may change or stop working.",
          },
          {
            q: "Is the entered link visited?",
            a: "No. The QR encoder treats your input as text and does not fetch or open URLs. A person scanning the code chooses whether to open its destination. Only encode destinations you trust.",
          },
          {
            q: "Why won’t a dense code scan?",
            a: "Long content produces denser codes. Keep content short, retain the white border and print it large enough. The PNG is 768 × 768 with medium error correction.",
          },
        ],
      }}
    >
      <QrGenerator />
    </ToolShell>
  );
}
