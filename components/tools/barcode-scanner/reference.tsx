import ToolReferenceSection from "@/components/tool-reference-section";

/**
 * Reference content for /tools/barcode-scanner.
 *
 * Deliberately not part of `TOOL_SEO_CONTENT`: that registry is asserted to
 * hold exactly the Phase 3 Batch C pages. This entry is scoped to this route.
 */
export default function BarcodeScannerReference() {
  return (
    <ToolReferenceSection
      slug="barcode-scanner"
      entry={{
        referenceHeading: "What a barcode scanner can and cannot tell you",
        referenceIntro:
          "A scanner reports what the bars encode and which symbology encoded it. Those are the only two facts in the pixels. Everything else — the product name, the batch, the expiry, whether the pack is genuine — comes from somewhere else, and this page keeps that distinction visible.",
        specsTitle: "Scanner specifications",
        specs: [
          {
            label: "Symbologies read",
            detail:
              "EAN-13, EAN-8, UPC-A, UPC-E, Code 128, GS1-128, Code 39, ITF-14 and Codabar. UPC-E uses a dedicated reader; MSI and Pharmacode are generation-only.",
          },
          {
            label: "Decode order",
            detail:
              "Original orientation first, then 180°, 90° and 270°; image uploads additionally get an overlapping 2×2 tile sweep so several labels in one photo can each be read, up to twelve per image.",
          },
          {
            label: "Where decoding happens",
            detail:
              "In a Web Worker in this tab, over pixel buffers transferred from a canvas. If the worker cannot start, decoding falls back to the main thread rather than failing.",
          },
          {
            label: "Camera behaviour",
            detail:
              "The camera is requested only after a click, the rear lens is preferred, and switching devices restarts the stream. Permission, missing-camera, in-use and insecure-context failures each get their own explanation.",
          },
          {
            label: "Image limits",
            detail:
              "Up to 25 MB and 40 megapixels per file; PNG, JPEG, WebP, GIF and BMP. A rejected file is counted and reported, never silently skipped.",
          },
          {
            label: "GTIN lookup",
            detail:
              "Optional and click-only. One 8/12/13/14-digit number with a valid check digit is sent to this site's /api/product-lookup endpoint, which reads Open Food Facts. Nothing else leaves the tab.",
          },
          {
            label: "History",
            detail:
              "Browser-local, capped at 100 records, de-duplicated by value and format with a visit counter. Disable, delete single records or clear the list; nothing is synced to an account.",
          },
        ],
        examplesTitle: "Worked examples",
        examples: [
          {
            scenario: "A retail EAN-13",
            input: "Symbol printed on a shampoo bottle",
            output:
              "EAN-13 value with the check digit included — a GTIN, no date",
          },
          {
            scenario: "A Code 128 warehouse label",
            input: "Internal label reading ABC-123",
            output: "Code 128 · ABC-123, exactly the characters encoded",
          },
          {
            scenario: "A GS1-128 data string",
            input: "Code 128 that carries an FNC1 separator",
            output: "GS1-128, reported separately from plain Code 128",
          },
        ],
        privacyNote:
          "Camera frames, uploaded images and decoded values stay in this tab. The only outbound request the page can make is the product lookup you trigger, and it carries a GTIN and nothing else.",
      }}
    />
  );
}
