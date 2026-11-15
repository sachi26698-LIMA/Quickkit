import Link from "next/link";
import ToolShell from "@/components/tool-shell";
import BarcodeScanner from "@/components/tools/barcode-scanner";
import BarcodeScannerReference from "@/components/tools/barcode-scanner/reference";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Barcode Scanner — EAN, UPC & Code 128 on Device",
  "Scan EAN-13, UPC-A, UPC-E, Code 128, Code 39 and ITF-14 from a camera or image, with copy, local history and an optional GTIN lookup.",
  "/tools/barcode-scanner",
);

export default function Page() {
  return (
    <ToolShell
      slug="barcode-scanner"
      headingDescription="Read a printed barcode with your camera or from an image, entirely in this tab. Copy the value, keep a local history, and look up a GTIN in a community product database — clearly labelled as such, because a barcode never carries a batch, a date or proof of authenticity."
      stepsHeading="How to scan a barcode without a second app"
      faqsHeading="Barcode scanner questions, answered"
      relatedHeading="Make codes, read codes, check the pack"
      referenceSection={<BarcodeScannerReference />}
      content={{
        steps: [
          "Choose Camera or Image upload. The camera is only opened after you press Start, the rear lens is preferred on a phone, and frames are decoded in a Web Worker on this device — no frame is uploaded.",
          "Fill about half the frame with the symbol and keep the light even. Results appear as they are read, labelled with the symbology that actually decoded: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, GS1-128, Code 39, ITF-14 or Codabar.",
          "Copy any value with one click. Values you scan are kept in this browser's local history unless you untick Remember scans, and you can remove a single record or clear the list at any time.",
          "If the value is a valid GTIN, you can ask for a product lookup. That sends only the number to this site's endpoint, which reads Open Food Facts; a match is a volunteer-recorded product entry, never a manufacturer-verified record.",
        ],
        faqs: [
          {
            q: "Does a barcode contain the batch code or the expiry date?",
            a: "No. A retail barcode carries a GTIN — the product number — and, in some retailer formats, a price or weight. The batch, lot, manufacture date and expiry date live in separate printed codes or in the packaging itself. The scanner says so on the page rather than implying otherwise, and links to the batch code checker for the lot-number question.",
          },
          {
            q: "Which symbologies can this scanner read?",
            a: "EAN-13, EAN-8, UPC-A, UPC-E, Code 128, GS1-128 (Code 128 carrying FNC1), Code 39, ITF-14 and Codabar. UPC-E is decoded by a dedicated reader because the JavaScript port of ZXing's UPC-E reader is unreliable. MSI and Pharmacode are generation-only and the scanner says so instead of failing silently.",
          },
          {
            q: "Are my camera frames or images uploaded?",
            a: "No. Frames are captured into a canvas and decoded in a Web Worker with the pixel buffer transferred, and uploaded images are decoded the same way. Nothing is sent anywhere unless you press Look up product, which sends exactly one GTIN to this site's own lookup endpoint.",
          },
          {
            q: "What is a GTIN lookup actually telling me?",
            a: "That a public, volunteer-maintained product database has a record for that number: usually a name, a brand and a quantity. It is not manufacturer-verified, it is not a proof that your pack is genuine, and it says nothing about the batch or expiry. If there is no record, the page says so plainly instead of inventing a product.",
          },
          {
            q: "Why is the device list empty until I grant permission?",
            a: "Browsers hide camera labels until permission is granted, so a named list before that would be guesswork. After you press Start, the tracks are enumerated again and the labels and the switch control appear. If permission is denied, the exact reason and the way to fix it are shown instead of a generic failure.",
          },
          {
            q: "Is the scan history private?",
            a: "It is stored in this browser's local storage under a QUICKKIT key, capped at 100 records, and never sent to a server. Untick Remember scans to stop adding to it, remove individual records, or clear the whole list. Because it is browser-local, it does not follow you to another device and disappears if you clear site data.",
          },
        ],
      }}
    >
      <BarcodeScanner />
      <p className="calculator-disclaimer">
        Looking for the batch or lot number rather than the product barcode? Use
        the <Link href="/tools/batch-code-checker">batch code checker</Link>.
        Building a label instead? The{" "}
        <Link href="/tools/barcode-generator">barcode generator</Link> encodes
        eleven symbologies with real check digits.
      </p>
    </ToolShell>
  );
}
