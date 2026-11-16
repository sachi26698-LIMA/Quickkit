import type { ToolSeoEntry } from "@/lib/tool-seo-content";

/**
 * Verified reference content for the four barcode-suite routes that shipped
 * without a specifications / worked-examples block.
 *
 * Every number below was read from the implementation, not estimated:
 *
 *   • batch limits — `BARCODE_BULK_LIMITS` in `lib/tools/barcode/bulk.ts`
 *     (1,000 rows, 5 MB file, 30 columns, 1,500 chars per cell);
 *   • batch-code input — `MAX_CODE` / `MAX_NAME` in `lib/tools/batch-code/check.ts`
 *     (200 and 80 characters);
 *   • GTIN normalisation — `toGtin14` in `lib/tools/gs1/engine.ts`
 *     (GTIN-8, -12, -13 and -14 only; a 14-digit input must pass its check digit);
 *   • Digital Link field caps — `buildDigitalLink` (20 characters each for batch
 *     and serial, optional query string);
 *   • product lookup — `lib/tools/barcode-scanner/product-lookup.ts`
 *     (v3.6 endpoint, 15 reads/minute per IP, ODbL 1.0 data, volunteer-entered);
 *   • image screening — `lib/tools/barcode/analyze.ts` measures resolution,
 *     contrast, cropping and quiet zone, and explicitly does not grade to
 *     ISO/IEC 15416 or 15415.
 *
 * Do not extend this file with a claim that has not been re-verified against
 * those modules. `tests/seo-registry.test.ts` fails if a route here is not in
 * `TOOL_SEO_CONTENT`… or in this registry, so a new barcode tool cannot ship
 * without its reference block.
 */
export const BARCODE_SUITE_SEO_CONTENT: Record<string, ToolSeoEntry> = {
  "batch-studio": {
    stepsHeading: "How a batch run works",
    faqsHeading: "Batch questions, answered",
    relatedHeading: "Single labels, checks and lookups",
    referenceHeading: "Batch Barcode Studio: row limits and export layout",
    referenceIntro:
      "A CSV is read as a table of independent rows. Each row is validated and encoded on its own, so one invalid number never stops the rows after it — and nothing is silently repaired to make a row pass.",
    specsTitle: "Batch barcode specifications",
    specs: [
      {
        label: "Row and file limits",
        detail:
          "Up to 1,000 data rows, a 5 MB CSV, 30 columns and 1,500 characters per cell. A file past the row ceiling is reported, not truncated quietly.",
      },
      {
        label: "Column mapping",
        detail:
          "The header row supplies the data, label and format columns, and any of the three can be overridden. Without a format column, one fallback symbology applies to the whole sheet.",
      },
      {
        label: "Row status",
        detail:
          "Every row returns as ready, duplicate, skipped or invalid with the encoder's own sentence. Duplicates are kept and flagged rather than removed, because printing the same label twice is a normal deliberate act.",
      },
      {
        label: "Export layout",
        detail:
          "Files are grouped into one folder per symbology — a 37 mm linear label and a square 2D symbol cannot share a print layout. SVG stays vector; PNG is rendered at 3× for screen previews.",
      },
      {
        label: "2D formats",
        detail:
          "QR Code, GS1 QR Code, Data Matrix and PDF417 rows encode beside linear rows in the same run, each keeping its own rendered symbol.",
      },
      {
        label: "Processing",
        detail:
          "The CSV is read with the File API and parsed in the tab, and the ZIP is assembled in the tab. Neither the numbers nor the labels are uploaded.",
      },
    ],
    examplesTitle: "Batch barcode examples",
    examples: [
      {
        scenario: "Asset tags",
        input: "850 rows of asset IDs, one Code 128 symbol per row",
        output:
          "A ZIP of 850 SVG files plus a report CSV naming every row as ready",
      },
      {
        scenario: "Mixed sheet",
        input:
          "A format column with ean13, code128 and qrcode values across 300 rows",
        output:
          "Three format folders in one archive, each row status reported separately",
      },
      {
        scenario: "Bad check digit",
        input: "One row whose EAN-13 number fails its check digit",
        output:
          "That row marked invalid with the encoder's reason and excluded from the ZIP; every other row still exports",
      },
    ],
    privacyNote:
      "The CSV, the product numbers and the generated symbols stay in browser memory. Closing the tab clears the run.",
  },

  "gs1-intelligence": {
    stepsHeading: "How to read a GS1 element string",
    faqsHeading: "GS1 questions, answered",
    relatedHeading: "Identify, look up, decode",
    referenceHeading: "GS1 Intelligence: identifiers, dates and Digital Links",
    referenceIntro:
      "GS1 data is a sequence of application identifiers, not free text. Each AI has a fixed meaning, a length rule and — for dates — a calendar interpretation, and this workspace reads the string the way a scanner does.",
    specsTitle: "GS1 parsing specifications",
    specs: [
      {
        label: "Accepted input",
        detail:
          "An element string with FNC1 group separators, a human-readable interpretation string, or a GS1 Digital Link URI. Parentheses in an HRI string are read as AI delimiters, not as data.",
      },
      {
        label: "GTIN handling",
        detail:
          "GTIN-8, GTIN-12, GTIN-13 and GTIN-14 are normalised to GTIN-14, and a 14-digit value must pass its check digit before it is accepted.",
      },
      {
        label: "Dates",
        detail:
          "AI (11) production, (13) packaging, (15) best-before, (16) sell-by and (17) expiration are read as YYMMDD with GS1's day-of-month rule. A sell-by date is a retailer instruction, not a safety limit.",
      },
      {
        label: "Digital Link output",
        detail:
          "Builds a Digital Link URI with batch and serial qualifiers capped at 20 characters each, plus optional query pairs, and renders the QR preview for that link.",
      },
      {
        label: "Refusals",
        detail:
          "An unknown AI, a truncated fixed-length field or a failing check digit is reported as a problem instead of being repaired into something plausible.",
      },
      {
        label: "Processing",
        detail:
          "Parsing, date interpretation and the QR preview render locally. No string, GTIN or batch number is uploaded.",
      },
    ],
    examplesTitle: "GS1 examples",
    examples: [
      {
        scenario: "Retail carton",
        input: "(01)09501101530003(17)270630(10)AB1234",
        output:
          "GTIN-14 09501101530003 with a valid check digit, expiry 30 June 2027, batch AB1234, each AI explained",
      },
      {
        scenario: "Digital Link",
        input: "https://example.com/01/09501101530003/10/AB1234",
        output:
          "The same element string, resolved into its AI/value pairs with the qualifiers identified",
      },
      {
        scenario: "Broken check digit",
        input: "(01)09501101530004",
        output:
          "The GTIN is reported as failing its check digit rather than shown as a valid number",
      },
    ],
    privacyNote:
      "Element strings, GTINs and batch or serial numbers are parsed in page memory and are not transmitted.",
  },

  "product-lookup": {
    stepsHeading: "How to read a lookup result",
    faqsHeading: "Product lookup questions, answered",
    relatedHeading: "Generate, scan, then look up",
    referenceHeading: "Product Lookup: source, licence and failure states",
    referenceIntro:
      "A match confirms only that someone recorded this GTIN in a public database. The record is volunteer-entered, so a missing field stays visibly missing and an absent product is reported as absent.",
    specsTitle: "Product lookup specifications",
    specs: [
      {
        label: "Data source",
        detail:
          "Open Food Facts API v3.6, which redirects a GTIN to the food, beauty, pet-food or general-products server. Data is ODbL 1.0 and images are CC-BY-SA.",
      },
      {
        label: "Request path",
        detail:
          "The lookup runs through QUICKKIT's own server route, so the browser never contacts the third-party host and the page's Content-Security-Policy stays narrow.",
      },
      {
        label: "Rate limit",
        detail:
          "The upstream API allows 15 product reads per minute per IP. When that limit is hit, the page says so and shows nothing rather than stale or partial data.",
      },
      {
        label: "Failure states",
        detail:
          "Not found, rate-limited and service-unavailable are reported separately, each with its own message, so a network problem is never mistaken for a missing product.",
      },
      {
        label: "Recorded fields only",
        detail:
          "Ingredients, allergens and nutrition appear exactly as recorded. A field the record does not carry stays empty; nothing is filled in from another product or a guess.",
      },
      {
        label: "What a match does not prove",
        detail:
          "It is not manufacturer-verified and says nothing about the batch, date, expiry or authenticity of the pack in your hand. Check the printed date and the brand's own channel.",
      },
    ],
    examplesTitle: "Product lookup examples",
    examples: [
      {
        scenario: "Known food product",
        input: "A 13-digit EAN-13 from a packet",
        output:
          "Name, brand, ingredients, allergens and nutrition as entered in Open Food Facts, with the ODbL attribution shown",
      },
      {
        scenario: "Cosmetic barcode",
        input: "A GTIN whose record lives on Open Beauty Facts",
        output:
          "The redirect is followed and the record is labelled as cosmetics rather than food",
      },
      {
        scenario: "Unknown number",
        input: "A GTIN with no record",
        output:
          "An explicit not-found message — no invented product name and no partial record",
      },
    ],
    privacyNote:
      "The GTIN you type is sent to QUICKKIT's server route only when you run the lookup. Nothing else in the page is transmitted, and no history is kept.",
  },

  "barcode-developer": {
    stepsHeading: "Debug a barcode problem in three steps",
    faqsHeading: "Developer questions, answered",
    relatedHeading: "Generate, parse and look up",
    referenceHeading: "Barcode Developer Tools: what each check measures",
    referenceIntro:
      "Three separate debugging jobs: whether two values really are the same number, why a photographed symbol will not decode, and what the product-lookup endpoint returns when it fails.",
    specsTitle: "Developer tool specifications",
    specs: [
      {
        label: "Value comparison",
        detail:
          "Compares two barcode values character by character, including the difference between a 12-digit UPC-A and its 13-digit EAN-13 form with a leading zero.",
      },
      {
        label: "Image screening",
        detail:
          "Measures pixels per module, dark/light contrast as a WCAG relative luminance ratio, quiet-zone width on all four sides, and whether content runs off the image edge.",
      },
      {
        label: "Grading limits",
        detail:
          "This is screening, not verification. It never claims ISO/IEC 15416 (linear print) or ISO/IEC 15415 (2D) grading, which need a calibrated verifier with defined aperture and lighting.",
      },
      {
        label: "Endpoint contract",
        detail:
          "Documents the lookup route's status codes and shape so a failed integration can be distinguished from a missing product before you change any code.",
      },
      {
        label: "Input limits",
        detail:
          "Image screening decodes locally; very large images are bounded by the browser's own canvas limits, so a full-resolution studio photo is downscaled before analysis.",
      },
      {
        label: "Processing",
        detail:
          "Comparison, image analysis and the symbol checks all run in the tab. No value, image or header is uploaded.",
      },
    ],
    examplesTitle: "Debugging examples",
    examples: [
      {
        scenario: "Two 'identical' numbers",
        input: "UPC-A 012345678905 and EAN-13 0012345678905",
        output:
          "The difference is a leading zero, not a different product — the comparison shows exactly where the strings diverge",
      },
      {
        scenario: "Photo will not scan",
        input: "A phone photo of a Code 128 label",
        output:
          "A module-width warning and a clipped quiet zone named as the two faults, with the pixel counts behind each",
      },
      {
        scenario: "Check digit mismatch",
        input: "A GTIN and the number printed beneath the symbol",
        output:
          "The failing digit position is identified instead of a generic 'invalid barcode'",
      },
    ],
    privacyNote:
      "Values and images stay in page memory. Only the product-lookup route contacts a third party, and only when you run that lookup.",
  },
};
