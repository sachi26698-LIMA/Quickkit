import ToolShell from "@/components/tool-shell";
import QrGenerator from "@/components/tools/qr-generator";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "QR Code Generator — create and download PNG codes",
  "Create QR codes for links or text with size, color and error-correction controls. Download PNG or SVG — no third-party QR service or input upload.",
  "/tools/qr-generator",
);
export default function Page() {
  return (
    <ToolShell
      slug="qr-generator"
      content={{
        steps: [
          "Enter a link or plain text (within 2,000 UTF-8 bytes).",
          "Optionally adjust size, error correction and colors (keep contrast at least 3:1), then choose Generate QR code.",
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
            a: "Long content produces denser codes. Keep content short, retain the white border and print it large enough. Pick a larger PNG size, a higher error-correction level, and strong dark-on-light contrast.",
          },
        ],
      }}
    >
      <QrGenerator />
    </ToolShell>
  );
}
