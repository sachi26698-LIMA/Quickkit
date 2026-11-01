import ToolShell from "@/components/tool-shell";
import QrGenerator from "@/components/tools/qr-generator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "QR Code Generator — custom PNG, SVG, PDF & batch QR codes",
  "Create QR codes for links, Wi-Fi, contacts, email, SMS, WhatsApp, locations, events and UPI. Add a local logo, gradient fill and custom dot or finder styles, check scan readability, and export PNG, SVG, PDF or batch ZIP in your browser.",
  "/tools/qr-generator",
);

export default function Page() {
  return (
    <ToolShell
      slug="qr-generator"
      content={{
        steps: [
          "Choose what your QR code should do: share text or a website, join Wi-Fi, start a call or message, save a contact, open a WhatsApp chat or map, add a calendar event, or create a compatible UPI intent.",
          "Add your details, then tune output size, quiet-zone margin and error correction. Choose solid or gradient colors, square/rounded/dot modules, square/rounded/circle finder corners and an optional local logo; each live preview is checked in your browser.",
          "Choose a safe filename and download PNG, SVG or print-ready PDF. Use Batch ZIP to generate up to 50 text or URL codes at once.",
        ],
        faqs: [
          {
            q: "Does QUICKKIT upload or store my QR content or logo?",
            a: "No. QR payloads, Wi-Fi credentials, contact details and selected images stay in your browser. Generation, decoding and exports run locally; no QR API or tool upload is used.",
          },
          {
            q: "Which QR code types can I make?",
            a: "Text, websites, Wi-Fi (WPA/WPA2/WPA3, WEP or open), phone, email, SMS, vCard contacts, WhatsApp chats, map coordinates, calendar events and UPI payment intents in INR are supported.",
          },
          {
            q: "Will a UPI QR code process a payment?",
            a: "No. It contains a UPI payment intent for compatible apps. QUICKKIT does not initiate, receive, verify or guarantee a payment. Confirm the payee and amount in your payment app before approving anything.",
          },
          {
            q: "Can I put a logo in the center?",
            a: "Yes. Choose a PNG, JPG or WebP image under 2 MB. Keep it small, use high error correction, retain the quiet zone and check the local scan result. Some readers may still have trouble with logo overlays, so test the final printed code with your own devices.",
          },
          {
            q: "Can I use a gradient or styled dots and corners?",
            a: "Yes. Choose a solid fill or a two-color diagonal gradient, then use square, rounded or dot modules with square, rounded or circular finder corners. Both gradient stops are checked against the background; the generated raster is decoded locally, but unusual styling can still behave differently across scanners.",
          },
          {
            q: "What does the scan-readability check verify?",
            a: "A local QR decoder attempts to read the generated PNG and compares the decoded value with your original payload. QUICKKIT also reports color contrast and module size. This is a helpful check, not a guarantee that every camera, print size, surface or scanner will work.",
          },
          {
            q: "How does the batch ZIP work?",
            a: "Enter up to 50 text or URL items, one per line. Add an optional filename as `name | content`. QUICKKIT builds and locally scan-checks each PNG before putting the files into a ZIP. No batch content is sent to a server.",
          },
          {
            q: "Does a QR code expire, and are URLs opened?",
            a: "The code stores its content directly and does not use a QUICKKIT redirect, so it does not expire. A URL is encoded but never visited or fetched. The person scanning the code chooses whether to open it.",
          },
        ],
      }}
    >
      <QrGenerator />
    </ToolShell>
  );
}
