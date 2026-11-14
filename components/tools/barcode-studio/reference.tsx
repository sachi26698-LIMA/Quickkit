/**
 * Server-rendered reference block: the format table and the troubleshooting
 * list. It is static content derived from the same catalogue the generator
 * uses, so the page cannot drift out of sync with the tool.
 */
import { BARCODE_FORMATS, FORMAT_GROUPS } from "@/lib/tools/barcode/formats";

const CHECKS: Record<string, string> = {
  code128: "Internal mod-103 symbol check; optional GS1 FNC1",
  code39: "Optional mod-43 check character",
  ean13: "GS1 mod-10, calculated from 12 digits",
  ean8: "GS1 mod-10, calculated from 7 digits",
  upca: "GS1 mod-10, calculated from 11 digits",
  upce: "GS1 mod-10 via the expanded UPC-A",
  itf14: "GTIN-14 mod-10, calculated from 13 digits",
  codabar: "None (checksum is not part of the symbology)",
  msi: "Optional mod-10 or mod-11",
  pharmacode: "None — the value is the bar pattern",
  "gs1-128": "Code 128 check plus GS1 AI grammar and GTIN/SSCC check digits",
};

const TROUBLESHOOTING: { problem: string; fix: string }[] = [
  {
    problem: "Nothing happens when the scanner sweeps the barcode",
    fix: "Check the quiet zone first: every symbology needs clear, unprinted space on both sides — 11 modules on the left of an EAN-13, 7 on the right, 10 around a Code 128. The studio enforces these minimums unless you lower the margin to zero.",
  },
  {
    problem: "It scans on screen but not on paper",
    fix: "Print from SVG or PDF, not a screenshot, and keep the narrow bar above 0.25 mm. The preview reports the narrow bar in millimetres at 300 dpi; EAN-13 nominal size is 0.33 mm (100% magnification), and 0.264 mm (80%) is the practical floor.",
  },
  {
    problem: "The bars print grey or patchy",
    fix: "A raster PNG scaled down by the printer driver loses bar edges. Export SVG or the PDF sheet, and turn on the opaque white background when printing on coloured or kraft stock.",
  },
  {
    problem: "Handheld scanners read it only at point-blank range",
    fix: "The symbol is truncated — too short for its width. Raise the symbol height; GS1 recommends a bar height of at least half the symbol length for retail EAN/UPC.",
  },
  {
    problem: "Light bars on a dark label fail",
    fix: "Most scanners expect dark bars on a light field and reject an inverted symbol. The preview flags inverted colours above 4.5:1 contrast, but the inversion itself is the problem, not the ratio.",
  },
  {
    problem: "The number is scannable but wrong",
    fix: "A computed check digit makes a wrong number a valid barcode. EAN-13, EAN-8, UPC-A, UPC-E and ITF-14 show the full value including the digit the studio calculated — compare it with your product database before printing a run.",
  },
  {
    problem: "An MSI or Pharmacode label will not scan here",
    fix: "Those two formats are generation-only: the bundled ZXing reader has no MSI or Pharmacode support, and pretending otherwise would only hide the problem. Any hardware scanner that supports the symbology can read the printed label.",
  },
];

export default function BarcodeReference() {
  return (
    <section className="bc-reference" aria-labelledby="bc-formats-heading">
      <h2 id="bc-formats-heading">Supported barcode formats</h2>
      <p>
        Eleven symbologies, each with the character set, length and check-digit
        rules from its published specification. Where a check digit is missing,
        the studio calculates it and says so; where one is present and wrong, it
        refuses to draw a symbol.
      </p>
      <div className="bc-table-wrap">
        <table className="bc-table">
          <caption className="sr-only">
            Barcode formats, their data rules, checksums, scanner support and
            typical use
          </caption>
          <thead>
            <tr>
              <th scope="col">Format</th>
              <th scope="col">Group</th>
              <th scope="col">Holds</th>
              <th scope="col">Check digit</th>
              <th scope="col">Scanner</th>
              <th scope="col">Typical use</th>
            </tr>
          </thead>
          <tbody>
            {BARCODE_FORMATS.map((entry) => (
              <tr key={entry.id}>
                <th scope="row">{entry.name}</th>
                <td>{entry.group}</td>
                <td>{entry.rules[0]}</td>
                <td>{CHECKS[entry.id]}</td>
                <td>{entry.scannable ? "Reads it back" : "Generation only"}</td>
                <td>{entry.usedFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="bc-dim">
        Groups: {FORMAT_GROUPS.join(" · ")}. EAN-13 with a leading zero and
        UPC-A are the same bars — which is why a UPC-A label can be read by an
        EAN-13 reader.
      </p>

      <h2 id="bc-troubleshooting-heading">
        Troubleshooting a barcode that will not scan
      </h2>
      <dl className="bc-trouble">
        {TROUBLESHOOTING.map((item) => (
          <div key={item.problem}>
            <dt>{item.problem}</dt>
            <dd>{item.fix}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
