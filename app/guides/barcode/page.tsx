import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/page-hero";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Barcode Guide — Formats, GS1 Data and Printing",
  "A practical guide to barcode formats, check digits, GS1 identifiers, quiet zones, printing and scanning: what each symbol is for, and what it cannot prove.",
  "/guides/barcode",
);

const SECTIONS: { id: string; heading: string; body: string[] }[] = [
  {
    id: "choosing",
    heading: "Choosing a symbology",
    body: [
      "Code 128 packs all 128 ASCII characters into the narrowest linear symbol, which makes it the default for internal labels: order cards, asset tags, shipping references. GS1-128 is the same symbology with an FNC1 in first position and the data formatted as application identifiers.",
      "EAN-13 and UPC-A are the retail symbols under the barcode on a product. UPC-A is twelve digits and is a subset of EAN-13 with a leading zero; scanners report one or the other depending on their configuration, so a comparison tool must normalise before it says two numbers are different.",
      "EAN-8 and UPC-E are the short forms for small packaging. UPC-E compresses a UPC-A number by dropping zero runs, which is why a six-digit UPC-E and a twelve-digit UPC-A can be the same product. ITF-14 identifies a case or carton, not a consumer unit, and is printed with a bearer bar that protects the symbol during handling.",
      "Code 39 is the simplest industrial symbol — uppercase letters, digits and a few punctuation marks — and remains common on assets and ID cards because it can be read by older equipment. Code 93 is its denser successor with two check characters. Codabar is still used by some logistics and library systems and encodes digits plus a few separators.",
      "QR Code is the general-purpose 2D symbol: any bytes, strong error correction and omnidirectional reading. Data Matrix is the choice for very small parts and for marks that will be laser-etched. PDF417 is a stacked linear symbol used on identity documents and boarding passes, where a large payload must survive partial damage.",
    ],
  },
  {
    id: "check-digits",
    heading: "Check digits are arithmetic, not authority",
    body: [
      "A GTIN check digit is computed from the preceding digits with a fixed weighting. It catches a single mistyped digit or two transposed digits; it catches nothing else. Anyone can compute one, and this site does, in the browser.",
      "A valid check digit therefore means the number is well formed. It does not mean the number was issued by GS1, does not mean the product exists, and does not mean the label is genuine. The company prefix at the front of a GTIN is assigned by a GS1 member organisation; only GS1's own registries can confirm that assignment.",
      "The same distinction applies to a scanned code and to a product database record. A scan proves what the symbol contains. A database record proves what a contributor typed. Neither is a manufacturer's declaration, and no laboratory or brand verification is implied anywhere on this site.",
    ],
  },
  {
    id: "gs1",
    heading: "GS1 data: identifiers, dates and element strings",
    body: [
      "GS1 data is a sequence of application identifiers. AI (01) is the GTIN, (10) the batch, (21) the serial, (17) the expiry date, (15) the best-before date, (11) the production date and (13) the packaging date. A variable-length field ends at an FNC1 character, which a scanner emits as a group separator.",
      "Dates are written YYMMDD. A day of 00 means the last day of that month, so 250200 is 28 February 2025. Two-digit years are interpreted in the standard's own window; the parser on this site applies that rule and shows the resulting calendar date so you can check it.",
      "A GS1 Digital Link is a URL that carries the same identifiers, for example https://id.example.com/01/09506000134352/10/LOT-42?17=251231. The path holds the primary key and its identifying attributes, the query holds the rest. The same link can sit inside a QR code or a Data Matrix; the standard defines the URL, not the symbol.",
      "When a label prints a batch code next to a barcode, the two are different things. The barcode identifies the product; the batch identifies the run. Turning a batch code into a date requires the manufacturer's own scheme, which is why this site separates VERIFIED, ESTIMATED and NOT DECODABLE instead of guessing.",
    ],
  },
  {
    id: "printing",
    heading: "Printing a symbol that actually scans",
    body: [
      "Leave a quiet zone. A linear symbol needs at least ten module widths of light space on each side; a QR code needs four modules on every side. A quiet zone printed over with a border, a folding line or another element is the most common reason a symbol scans on screen and fails on paper.",
      "Print at a module width your scanner can resolve. At 100% magnification a typical EAN-13 is about 37.3 mm wide with 0.33 mm modules; laser printers routinely round that down, so a 0.25 mm module is a safer target for a desktop label than the theoretical minimum. Below roughly 0.2 mm, phone cameras start failing.",
      "Keep contrast high and ink dark. Black on white is not a stylistic choice: a 4.5:1 contrast ratio is the floor for comfortable camera reading, and 7:1 or better survives ordinary office lighting. Printing a symbol in a brand colour, or inverted (light bars on a dark field), breaks many decoders.",
      "Check the artwork at the size it will print. A symbol that looks fine at 800 px on screen can be 9 mm wide on paper. The generator computes its size from the encoded module count and the chosen scale, and the exported SVG keeps that geometry exact at any print resolution.",
    ],
  },
  {
    id: "scanning",
    heading: "What a scanner can and cannot tell you",
    body: [
      "A scanner reports the characters it decoded. It does not report whether the label is genuine, whether the product is authentic, or whether the database record is correct. Those are three separate questions with three separate answers, and this site keeps them apart in every tool.",
      "Camera scanning on a phone works best with the whole symbol in frame, even lighting and no glare. Auto-focus needs a moment on very small symbols; moving closer than the focus distance produces a blur that no decoder can recover. The scanner here pauses between reads of the same value so a single label does not flood the history.",
      "The image analyser measures pixels per module. A 0.33 mm module photographed across 300 px is roughly 11 px per module, which is comfortable; 1 px per module is not recoverable. That measurement is a screening aid, not an ISO/IEC 15416 or ISO/IEC 15415 grade — those need a calibrated verifier with a defined aperture and lighting geometry.",
      "Nothing you scan, generate or upload on these pages is sent to this site. The generator, the camera decoder, the CSV batch and the image analyser all run in the browser tab. The one optional outbound request is the GTIN product lookup, which sends a product number and nothing else.",
    ],
  },
];

export default function Page() {
  return (
    <div className="tool-page" data-tool="barcode-guide">
      <PageHero
        eyebrow="QR & Barcode"
        title="The barcode"
        titleAccent="guide"
        lede="What each symbology is for, how check digits work, how GS1 data is structured, and what a scan can never prove — written to be read before you print a label."
      />
      <div className="workspace" style={{ display: "grid", gap: 16 }}>
        <nav aria-label="Guide contents" className="qr-card">
          <h2 style={{ margin: "0 0 10px", fontSize: 14 }}>Contents</h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="qr-card">
            <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.75 }}
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="qr-card">
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Where to go next</h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13.5,
              lineHeight: 1.9,
            }}
          >
            <li>
              <Link href="/tools/barcode-generator">Barcode studio</Link> —
              generate and style a symbol, or decode one from a photo.
            </li>
            <li>
              <Link href="/tools/gs1-intelligence">GS1 Intelligence</Link> —
              parse an element string, read every AI and build a Digital Link.
            </li>
            <li>
              <Link href="/tools/product-lookup">Product lookup</Link> — see
              what a community database records for a GTIN, with its gaps shown.
            </li>
            <li>
              <Link href="/tools/batch-code-checker">Batch Code Checker</Link> —
              check a lot code against documented decoders.
            </li>
            <li>
              <Link href="/tools/barcode-developer">Developer tools</Link> —
              compare values and diagnose a photo that will not scan.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
