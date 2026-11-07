import ToolShell from "@/components/tool-shell";
import QrGenerator from "@/components/tools/qr-generator";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "QR Code Generator — logo, colors, CSV, PNG & SVG",
  "Create QR codes for links, Wi-Fi, contacts and events. Style colors, dots, eyes and a logo, verify each code by decoding it, then export PNG, SVG, PDF or CSV.",
  "/tools/qr-generator",
);
export default function Page() {
  return (
    <ToolShell
      slug="qr-generator"
      content={{
        steps: [
          "Choose a content type (link, text, email, phone, SMS, WhatsApp, Wi-Fi, contact, location, event, social profile or app link) and fill in its fields — the preview builds as you type.",
          "Open Design Studio for colors, gradients, dot and eye styles, a logo or a template. The preview is decoded after every change, so a warning appears if a style stops scanning.",
          "Download the verified PNG, SVG or PDF, or switch to Bulk to queue one QR per CSV row and download the batch as a ZIP. Test a printed code at its final size before publishing.",
        ],
        faqs: [
          {
            q: "Does a QR code expire?",
            a: "No. The generated code stores your content directly and does not use a QUICKKIT redirect, so it cannot expire. A website it points to can still move or stop working.",
          },
          {
            q: "Is anything I type uploaded?",
            a: "No. Encoding, styling, logo handling, CSV parsing and the download files all happen in your browser. Nothing is sent to a server, no destination URL is visited, and your content is never written to the console. Recent codes and presets are kept in this browser's local storage, and the Wi-Fi password is left out of both — and out of a share link, which carries the rest of the content in its # fragment, so share only what you would paste into a chat.",
          },
          {
            q: "How do I know a styled code will still scan?",
            a: "After every render the app decodes the exact PNG bytes you would download, with an independent decoder, and compares the payload with what you entered. Export is offered only for a code that passed. There is also an on-demand scan test at 160–1200 px for phone cameras, posters and print.",
          },
          {
            q: "Can I put a logo in the middle of a QR code?",
            a: "Yes. The app automatically raises error correction when a logo would cover more than the level can survive, and the result is re-verified. Even so, keep logos small, high-contrast and away from the three finder squares, and test-scan a printed copy.",
          },
          {
            q: "Why won’t a dense code scan?",
            a: "Long content means smaller modules. Keep the quiet zone at four modules or more, use strong dark-on-light contrast, pick the highest error-correction level that still fits, and render large enough: the app accepts a decode down to about 2.4 pixels per module for a phone camera, while print wants roughly 8 pixels per module or more. A 1,000-character code measures about 4.4 px per module at 500 px and 10.6 px at 1,200 px, so use the larger export for anything printed below A5.",
          },
          {
            q: "What are the limits?",
            a: "Payload size is capped at 2,500 UTF-8 bytes (a URL field holds 2,000 characters), which is the practical QR byte limit — 2,500 bytes needs version 37 and only fits at error correction L. Exports go up to 2,048 px per side. Bulk batches start at 200 CSV rows and can be raised to 500, with files up to 3 MB, 30 columns and 1,500 characters per cell, and each code rendered at 256–1,024 px. PDF embeds each code as a raster image rather than vector paths, and Wi-Fi QR codes carry no encryption negotiation, so they only work on networks your device can already reach.",
          },
        ],
      }}
    >
      <QrGenerator />
    </ToolShell>
  );
}
