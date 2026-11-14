/**
 * Phase 3 Batch C — per-tool reference content for the 30 remaining tool pages.
 *
 * Every numeric limit, format list, and processing claim below was verified
 * against the tool's actual implementation in `lib/tools/*` (or, for
 * word-to-pdf, `app/api/word-to-pdf/route.ts` + `lib/tools/word-to-pdf/*`).
 * Do not add claims here without re-verifying them against the engine.
 *
 * Pages render this via `components/tool-reference-section.tsx` as an H2
 * section with two H3 subsections, so the heading hierarchy stays
 * H1 -> H2 -> H3 with no skipped levels.
 */

export type ToolSeoSpec = { label: string; detail: string };
export type ToolSeoExample = {
  scenario: string;
  input: string;
  output: string;
};

export type ToolSeoEntry = {
  /** Intent-specific H2 for the steps section (omitted = ToolShell default). */
  stepsHeading?: string;
  /** Intent-specific H2 for the FAQ section (omitted = ToolShell default). */
  faqsHeading?: string;
  /** Intent-specific H2 for the related-tools section. */
  relatedHeading?: string;
  /** H2 for the reference section. */
  referenceHeading: string;
  referenceIntro: string;
  specsTitle: string;
  specs: ToolSeoSpec[];
  examplesTitle: string;
  examples: ToolSeoExample[];
  /** Short privacy/processing note rendered under the reference section. */
  privacyNote?: string;
};

export const TOOL_SEO_CONTENT: Record<string, ToolSeoEntry> = {
  // ---------------------------------------------------------------- PDF (9)
  "merge-pdf": {
    stepsHeading: "How to merge PDFs in the right order",
    faqsHeading: "Merge PDF questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "Merge PDF: limits, page selection, and what survives",
    referenceIntro:
      "Merging is a page-copy operation: QUICKKIT copies the pages you select from each source into a new PDF, in the file order you set. Nothing is re-typeset, so text stays text and vector drawings stay vector.",
    specsTitle: "Merge PDF specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 25 PDFs per batch, 50 MiB per file, 100 MiB total, and 1,000 pages per file and per merged output.",
      },
      {
        label: "Page selection",
        detail:
          "All pages, a typed range such as 1-3, 5, or a visual picker. Duplicate and out-of-range pages are reported, never silently changed.",
      },
      {
        label: "Encrypted PDFs",
        detail:
          "Supported encrypted PDFs open with their correct open password; the merged output is not encrypted.",
      },
      {
        label: "Bookmarks",
        detail:
          "Optional one bookmark per source file, plus a custom document title and download name.",
      },
      {
        label: "Blocked inputs",
        detail:
          "Corrupted files, dynamic XFA forms, digitally signed PDFs, and forms whose visible values cannot be flattened with confidence are blocked with a named next step.",
      },
      {
        label: "Processing",
        detail:
          "A dedicated browser worker merges the bytes on your device; the output is reopened and validated before download.",
      },
    ],
    examplesTitle: "Merge PDF examples",
    examples: [
      {
        scenario: "Invoice bundle",
        input:
          "Three PDFs (cover, invoice, terms), pages 1-2 of the terms file only",
        output:
          "One PDF with the cover, invoice, and terms pages in that order",
      },
      {
        scenario: "Bookmarked dossier",
        input: "Four source PDFs with “add one bookmark per file” enabled",
        output:
          "One PDF whose outline has four top-level bookmarks, one per source",
      },
      {
        scenario: "Locked source",
        input: "A PDF that opens with a password, merged with an unlocked PDF",
        output: "One unencrypted PDF containing both documents’ selected pages",
      },
    ],
    privacyNote:
      "Files, passwords, and page selections stay in browser memory. Closing the tab clears the queue and preview URLs.",
  },

  "split-pdf": {
    stepsHeading: "How to split a PDF into separate files",
    faqsHeading: "Split PDF questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "Split PDF: modes, limits, and output rules",
    referenceIntro:
      "Splitting copies pages into new PDFs without re-typesetting them. The output plan shows exactly which pages land in each file before anything is written.",
    specsTitle: "Split PDF specifications",
    specs: [
      {
        label: "Input limits",
        detail:
          "One PDF per run, up to 50 MiB and 1,000 pages. Oversized, unreadable, password-protected, signed, and dynamic XFA files are identified with a next step.",
      },
      {
        label: "Split modes",
        detail:
          "Custom range groups (1-3; 4-6), selected-page extraction, equal groups of every N pages, or one PDF per page.",
      },
      {
        label: "Output limits",
        detail:
          "Up to 100 output PDFs, 1,000 output pages, and 128 MiB of output per run.",
      },
      {
        label: "Overlap handling",
        detail:
          "Overlapping ranges copy the shared pages into each matching output; pages outside every range are omitted. Duplicate pages inside one range are rejected.",
      },
      {
        label: "Encrypted PDFs",
        detail:
          "Supported encrypted PDFs open with their correct open password; the password is not re-applied to outputs.",
      },
      {
        label: "Processing",
        detail:
          "A dedicated browser worker splits the bytes on your device; every output is validated before download.",
      },
    ],
    examplesTitle: "Split PDF examples",
    examples: [
      {
        scenario: "Chapter extraction",
        input: "A 40-page report, ranges 1-3; 4-6; 7-40",
        output: "Three PDFs: pages 1–3, 4–6, and 7–40",
      },
      {
        scenario: "One page per file",
        input: "A 12-page form, “one PDF per page” mode",
        output:
          "Twelve single-page PDFs, downloadable individually or as one ZIP",
      },
      {
        scenario: "Every 5 pages",
        input: "A 23-page scan, equal groups of 5 pages",
        output: "Five PDFs of 5, 5, 5, 5, and 3 pages",
      },
    ],
    privacyNote:
      "The PDF, password, and preview URLs live only in browser memory and are cleared when the workspace resets or the tab closes.",
  },

  "compress-pdf": {
    stepsHeading: "How to shrink a PDF without losing text",
    faqsHeading: "Compress PDF questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "Compress PDF: presets, target size, and safety rules",
    referenceIntro:
      "Compression rewrites embedded images only. Text, fonts, and vector drawings are never rasterized, so a text PDF stays selectable and a CAD drawing stays sharp.",
    specsTitle: "Compress PDF specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 PDFs, 50 MiB per file, 100 MiB total, 1,000 pages per file (2,000 per batch), and 128 MiB of output.",
      },
      {
        label: "Presets",
        detail:
          "Low, Medium, High, and Maximum, plus a Custom mode with your own embedded-image quality and maximum image resolution.",
      },
      {
        label: "Target size",
        detail:
          "An optional per-PDF KiB/MiB target. Target mode tries your quality first, then progressively lowers supported-image quality and resolution; if fonts, text, or vector data set a higher floor, the result says “target not reached.”",
      },
      {
        label: "Grayscale",
        detail: "Optional grayscale conversion for supported embedded images.",
      },
      {
        label: "Safety",
        detail:
          "Page count, sizes, and rotations are validated on the reopened output. Digitally signed PDFs and dynamic XFA forms are blocked; if no safely smaller rewrite exists, the original is returned unchanged and labelled.",
      },
      {
        label: "Processing",
        detail:
          "A dedicated browser worker compresses the bytes on your device; previews are rendered locally to canvas images.",
      },
    ],
    examplesTitle: "Compress PDF examples",
    examples: [
      {
        scenario: "Photo-heavy report",
        input: "A 12 MB report whose pages are mostly photos, Medium preset",
        output:
          "A smaller PDF with the same pages, sizes, and selectable text; photos re-encoded at lower quality",
      },
      {
        scenario: "Email attachment target",
        input: "An 8 MB scan, target size 2 MiB",
        output:
          "The best quality that fits 2 MiB, or a clear “target not reached” note if the floor is higher",
      },
      {
        scenario: "Text-only contract",
        input: "A 400 KB text contract, Maximum preset",
        output:
          "The original file returned unchanged and labelled, because no safely smaller rewrite exists",
      },
    ],
    privacyNote:
      "PDFs, passwords, and settings never leave the browser. Closing the tab clears files, passwords, and preview URLs.",
  },

  "pdf-to-image": {
    stepsHeading: "How to export PDF pages as images",
    faqsHeading: "PDF to image questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "PDF to Image: formats, DPI, and page-range rules",
    referenceIntro:
      "Each selected page is rasterized with PDF.js onto a canvas and encoded in the browser. The preview you see before exporting is the same renderer, so what you preview is what you get.",
    specsTitle: "PDF to Image specifications",
    specs: [
      {
        label: "Input limits",
        detail:
          "One PDF per run, up to 25 MB and 100 pages. The real page count is read before any export setting is offered.",
      },
      {
        label: "Output formats",
        detail:
          "JPG (smallest, no transparency), PNG (lossless; quality slider does not apply), and WEBP where the browser can encode it.",
      },
      {
        label: "Resolution",
        detail:
          "72 to 600 DPI with presets at 96, 150, 200, 300, 400, and 600. Pages are capped at 36 megapixels so a huge page cannot exhaust the tab.",
      },
      {
        label: "Page selection",
        detail:
          "All pages, or a range such as 1-3, 5. Invalid or out-of-range entries block the export instead of guessing.",
      },
      {
        label: "Naming",
        detail:
          "Pages are named base-page-001, base-page-002, and so on, with an optional custom base name and suffix.",
      },
      {
        label: "Processing",
        detail:
          "PDF.js rendering, canvas rasterization, and encoding all run in the browser tab; results are shown at their real pixel dimensions.",
      },
    ],
    examplesTitle: "PDF to Image examples",
    examples: [
      {
        scenario: "Print-ready poster",
        input: "A one-page poster PDF at 300 DPI, PNG",
        output: "A lossless PNG at print resolution, named poster-page-001.png",
      },
      {
        scenario: "Slide thumbnails",
        input: "A 20-slide deck, pages 1-3, 5 at 150 DPI, JPG",
        output:
          "Four JPGs (pages 1, 2, 3, 5) plus one ZIP containing all of them",
      },
      {
        scenario: "Screen reading",
        input: "A 100-page manual, all pages at 96 DPI, WEBP",
        output:
          "100 WEBP images, each with its real dimensions and file size in the results list",
      },
    ],
    privacyNote:
      "The PDF is never uploaded. Closing the tab clears the queue and results; the original file is never modified.",
  },

  "images-to-pdf": {
    stepsHeading: "How to turn images into one PDF",
    faqsHeading: "Images to PDF questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "Images to PDF: paper sizes, fit modes, and limits",
    referenceIntro:
      "Each image becomes one PDF page, embedded as JPEG pixels at the quality you choose. The layout preview uses the same geometry as the export, and the post-export preview is rendered from the PDF that was actually written.",
    specsTitle: "Images to PDF specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 images, 15 MB each, 150 MB per batch. Images are capped at 24 megapixels and 8,192 pixels per side.",
      },
      {
        label: "Input formats",
        detail:
          "JPEG, PNG, WebP, AVIF, GIF, BMP, and TIFF, plus HEIC/HEIF where the browser can decode it. Tiled, 16-bit, and CMYK TIFFs are not supported.",
      },
      {
        label: "Paper sizes",
        detail:
          "A4, A3, A5, Letter, Legal, or a custom width and height in millimetres, portrait or landscape, with a margin you set.",
      },
      {
        label: "Fit modes",
        detail:
          "Contain shows the whole image with even margins; cover fills the area and centre-crops overflow; fill stretches to the box and changes the aspect ratio.",
      },
      {
        label: "Text layer",
        detail:
          "None. Images are embedded as JPEG pixels, so the PDF has no selectable text. Run the result through an OCR tool if you need searchable text.",
      },
      {
        label: "Processing",
        detail:
          "Reading, encoding, and PDF assembly with pdf-lib all happen in the browser tab.",
      },
    ],
    examplesTitle: "Images to PDF examples",
    examples: [
      {
        scenario: "Receipt archive",
        input: "Ten phone photos of receipts, A4 portrait, contain fit",
        output: "A 10-page A4 PDF with each receipt centred and fully visible",
      },
      {
        scenario: "Full-bleed portfolio",
        input: "Six landscape photos, Letter landscape, cover fit",
        output:
          "A 6-page PDF where each photo fills its page with overflow centre-cropped",
      },
      {
        scenario: "Custom print size",
        input: "Four images, custom 100 × 150 mm pages, 10 mm margin",
        output: "A 4-page PDF at exactly 100 × 150 mm per page",
      },
    ],
    privacyNote:
      "Images are never uploaded. Closing the tab clears the queue, results, and object URLs.",
  },

  "pdf-lock-unlock": {
    stepsHeading: "How to password-protect or unlock a PDF",
    faqsHeading: "PDF lock and unlock questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "PDF Lock & Unlock: encryption standards and limits",
    referenceIntro:
      "Locking encrypts the document bytes with AES; unlocking removes encryption only with the correct existing password and your authorization. There is no password recovery, cracking, or bypass.",
    specsTitle: "PDF Lock & Unlock specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 PDFs, 50 MiB per file, 100 MiB total, 1,000 pages per file, and 2,000 pages per queue.",
      },
      {
        label: "Lock encryption",
        detail:
          "AES-256 (PDF 2.0 / R6, AESV3) by default, or AES-128 (PDF 1.6 / R4, AESV2) for older readers. Broken RC4 modes are not offered for locking.",
      },
      {
        label: "Unlock support",
        detail:
          "AES-256, AES-128, and RC4 PDFs unlock with their correct password.",
      },
      {
        label: "Passwords",
        detail:
          "A required open password plus an optional separate permissions (owner) password. AES-128 requires printable ASCII passwords up to 32 characters.",
      },
      {
        label: "Permissions",
        detail:
          "Reader restrictions (print, copy, modify) are enforced by compliant readers only; they are not strong encryption.",
      },
      {
        label: "Processing",
        detail:
          "Same-origin QPDF WebAssembly in a browser worker. Digitally signed PDFs are blocked because rewriting invalidates signatures.",
      },
    ],
    examplesTitle: "PDF Lock & Unlock examples",
    examples: [
      {
        scenario: "Protect a contract",
        input:
          "A contract PDF, AES-256, open password set, permissions password left blank",
        output:
          "An encrypted PDF where the open password also grants owner access in supporting readers",
      },
      {
        scenario: "Legacy reader",
        input:
          "A PDF to lock with AES-128 for an older reader, 24-character ASCII password",
        output:
          "An AES-128 encrypted PDF readable by the older reader with that password",
      },
      {
        scenario: "Authorized unlock",
        input:
          "An RC4-encrypted PDF plus its correct password and your confirmation",
        output:
          "An unencrypted copy of the document; the original file is unchanged",
      },
    ],
    privacyNote:
      "Passwords stay in page/worker memory and are cleared after processing, cancellation, or clearing the queue.",
  },

  "pdf-studio": {
    stepsHeading: "How to edit PDF pages in one workspace",
    faqsHeading: "PDF Studio questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "PDF Studio: page-level operations and limits",
    referenceIntro:
      "PDF Studio combines merge, extract, split, and compress with page-level rotate, reorder, and remove across several documents. Ranges apply to each file separately, and the plan line states the outcome before you run.",
    specsTitle: "PDF Studio specifications",
    specs: [
      {
        label: "Input limits",
        detail:
          "One or more PDFs, up to 25 MB and 100 pages per document. Real page counts are read before anything else.",
      },
      {
        label: "Operations",
        detail:
          "Merge everything, extract named pages, split into one PDF per range, or compress. Pages can be dragged to reorder, rotated a quarter turn at a time, or marked removed.",
      },
      {
        label: "Page ranges",
        detail:
          "For example 1-3, 7. Ranges apply to each file, so 1-2 across two PDFs means pages 1–2 of each. Invalid ranges block the run.",
      },
      {
        label: "Compression",
        detail:
          "Image streams are recompressed at the chosen quality preset while text stays crisp; text-heavy documents shrink less than scan-heavy ones.",
      },
      {
        label: "Page sizes",
        detail:
          "Each page keeps its own dimensions, so merged documents can hold A4 and Letter pages side by side.",
      },
      {
        label: "Processing",
        detail:
          "PDF.js reads pages and pdf-lib writes output, entirely inside the browser tab. Password-protected PDFs are refused with a clear message.",
      },
    ],
    examplesTitle: "PDF Studio examples",
    examples: [
      {
        scenario: "Mixed-size merge",
        input:
          "An A4 invoice plus a Letter appendix, merged with one rotated page",
        output:
          "One PDF keeping each page’s own size, with the rotated page corrected",
      },
      {
        scenario: "Extract and split",
        input: "Two PDFs queued, ranges 1-3, 7",
        output:
          "Extract mode: one PDF with pages 1–3 and 7 from each file; split mode: two PDFs, one per range",
      },
      {
        scenario: "Scan cleanup",
        input:
          "A scan-heavy PDF with three blank pages marked removed, then compress",
        output:
          "A shorter, smaller PDF with the blank pages gone and text still crisp",
      },
    ],
    privacyNote:
      "PDFs are never uploaded. Closing the tab clears the queue and results; original files are never modified.",
  },

  "pdf-to-word": {
    stepsHeading: "How to convert a PDF into editable Word text",
    faqsHeading: "PDF to Word questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "PDF to Word: modes, OCR languages, and limits",
    referenceIntro:
      "Conversion rebuilds a DOCX from the PDF’s text layer (or from OCR for scans). Original Layout preserves page size and approximate positions; Clean Editable rebuilds a flowing document that is easiest to edit.",
    specsTitle: "PDF to Word specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 50 PDFs, 25 MiB per file, 250 MiB total, and 300 pages per file.",
      },
      {
        label: "Modes",
        detail:
          "Original Layout keeps each page’s size and places text and images near their PDF positions. Clean Editable rebuilds tidy headings, lists, and tables for editing.",
      },
      {
        label: "Tables, images, links",
        detail:
          "Clear column layouts become real Word tables, embedded images are placed back at their page position, and clickable links become hyperlinks. Each can be switched off in Advanced settings.",
      },
      {
        label: "OCR",
        detail:
          "Optional on-device OCR for scanned pages in English, Hindi, and Gujarati. It loads only when you enable it and runs slower than text-layer conversion.",
      },
      {
        label: "Page ranges",
        detail:
          "Convert only selected pages, for example 1-3, 5, 8-10. Pages beyond a file’s end are ignored with a note.",
      },
      {
        label: "Processing",
        detail:
          "Inspection, previews, extraction, conversion, OCR, and ZIP creation all run locally. Every file gets a quality report listing anything that could not be carried over.",
      },
    ],
    examplesTitle: "PDF to Word examples",
    examples: [
      {
        scenario: "Editable report",
        input: "A text-based PDF report, Clean Editable mode",
        output:
          "A DOCX with headings, lists, and tables you can edit, previewed side by side with the PDF",
      },
      {
        scenario: "Scanned invoice",
        input: "A scanned invoice marked Scanned, OCR on, English",
        output:
          "A DOCX with the invoice text read from page images, flagged in the quality report as OCR-read",
      },
      {
        scenario: "Partial conversion",
        input: "A 30-page manual, pages 1-3, 5 in Advanced settings",
        output:
          "A DOCX containing only pages 1, 2, 3, and 5, with the selection recorded in the report",
      },
    ],
    privacyNote:
      "QUICKKIT never receives your files. Optional recent-conversion history stores only converted DOCX files, only in your browser, and only if you turn retention on.",
  },

  "word-to-pdf": {
    stepsHeading: "How to convert DOCX files to PDF",
    faqsHeading: "Word to PDF questions, answered",
    relatedHeading: "More ways to work with PDFs",
    referenceHeading: "Word to PDF: server processing, limits, and consent",
    referenceIntro:
      "This is the one QUICKKIT tool that processes files on a server: DOCX conversion needs a full document engine. You opt in explicitly before anything is sent, and files are deleted when the conversion finishes.",
    specsTitle: "Word to PDF specifications",
    specs: [
      {
        label: "Consent",
        detail:
          "Conversion requires your explicit server-processing consent for the current batch. Without it, files stay on your device and nothing is sent.",
      },
      {
        label: "Batch limits",
        detail:
          "Up to 10 DOCX files, 20 MiB per file, 80 MiB per queue, 1,000 pages, and 50 MiB of output. Legacy .doc files and encrypted DOCX files are rejected.",
      },
      {
        label: "Processing",
        detail:
          "Files are POSTed to /api/word-to-pdf with a no-store cache policy, converted in an ephemeral temporary directory, and deleted in a finally block. QUICKKIT does not retain them.",
      },
      {
        label: "Page controls",
        detail:
          "Per-page editing, page-range selection, page settings, and watermark controls, with PDF.js previews of the actual output.",
      },
      {
        label: "Output",
        detail:
          "Validated PDFs, downloadable individually or as a batch. Each output is previewed from the real converted file, not a mock-up.",
      },
    ],
    examplesTitle: "Word to PDF examples",
    examples: [
      {
        scenario: "Single document",
        input: "One DOCX with consent granted, all pages",
        output: "One PDF previewed page by page with PDF.js, then downloaded",
      },
      {
        scenario: "Batch with a range",
        input: "Three DOCX files, pages 1-2 of the second file only",
        output:
          "Three PDFs, with the second containing only its first two pages",
      },
      {
        scenario: "Without consent",
        input: "A DOCX added but server consent not granted",
        output:
          "No upload and no conversion; the file stays on your device until you opt in",
      },
    ],
    privacyNote:
      "Unlike the other PDF tools, this one sends files to the server — only after your explicit consent, and they are deleted after conversion.",
  },

  // --------------------------------------------------------------- Image (4)
  "image-compressor": {
    stepsHeading: "How to shrink images by quality or exact size",
    faqsHeading: "Image compressor questions, answered",
    relatedHeading: "More ways to work with images",
    referenceHeading: "Image Compressor: modes, formats, and limits",
    referenceIntro:
      "Two modes: Quality encodes once at a level you pick, while Target size searches for the highest quality that fits your KB or MB limit. By default every pixel dimension is preserved.",
    specsTitle: "Image Compressor specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 images, 15 MB per file, 24 megapixels per image, 8,192 pixels per side, and 200 megapixels across the batch.",
      },
      {
        label: "Formats",
        detail:
          "JPEG, PNG, WebP, and AVIF are supported as inputs and outputs; AVIF output is available only when the browser can encode it. HEIC, GIF, and SVG are not accepted by this tool.",
      },
      {
        label: "Target size",
        detail:
          "Encodes at several quality levels and keeps the highest that fits. If even the lowest is too large, optional downscaling in small steps is offered, or the smallest file is returned and flagged as not reaching the target.",
      },
      {
        label: "Transparency",
        detail:
          "PNG, WebP, and AVIF keep alpha; JPEG fills transparent areas with the background colour you choose.",
      },
      {
        label: "Metadata",
        detail:
          "Re-encoding from pixels strips EXIF, GPS, XMP, and ICC profiles. The metadata panel shows what was found before you compress.",
      },
      {
        label: "Processing",
        detail:
          "Decoding, compression, conversion, and ZIP packaging all run in the browser tab.",
      },
    ],
    examplesTitle: "Image Compressor examples",
    examples: [
      {
        scenario: "Email attachment",
        input: "A 4 MB JPEG photo, target size 500 KB",
        output:
          "The best-quality JPEG that fits at full resolution; if the target cannot be met, the result explains that rather than claiming success.",
      },
      {
        scenario: "Logo with transparency",
        input: "A PNG logo with alpha, WebP output, keep transparency",
        output:
          "A smaller WebP with the alpha channel intact, previewed on a checkerboard",
      },
      {
        scenario: "Already-optimized file",
        input: "A tightly optimized PNG, Quality mode",
        output:
          "A result marked as larger than the source when re-encoding grows it, with real byte counts",
      },
    ],
    privacyNote:
      "Images never touch a QUICKKIT server. Closing the tab discards everything.",
  },

  "image-resizer": {
    stepsHeading: "How to resize images to exact dimensions",
    faqsHeading: "Image resizer questions, answered",
    relatedHeading: "More ways to work with images",
    referenceHeading: "Image Resizer: resize modes, presets, and limits",
    referenceIntro:
      "Resize by exact pixels, percentage, longest or shortest side, or social preset. The aspect lock keeps proportions; unlocking lets you fill, fit, stretch, or crop to the target box.",
    specsTitle: "Image Resizer specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 images, 15 MB per file, 24 megapixels per image, 8,192 pixels per side, and 200 megapixels across the batch.",
      },
      {
        label: "Resize modes",
        detail:
          "Dimensions, Percentage, Presets, or longest/shortest side. In preset mode, Fill centre-crops to the exact preset, Fit inside keeps the whole frame, and Stretch forces the preset box.",
      },
      {
        label: "Editing",
        detail:
          "Fixed-ratio crop, 90° rotation steps or any angle, flip, brightness, contrast, saturation, and filters.",
      },
      {
        label: "Formats",
        detail:
          "Inputs are JPEG, PNG, or WebP. Outputs can be JPEG, PNG, WebP, or AVIF when the browser can encode it; HEIC and SVG inputs are not accepted.",
      },
      {
        label: "Print sizes",
        detail:
          "The export is pixel-sized rather than tagged with an adjustable print DPI; the print-size panel converts between centimetres and pixels in both directions.",
      },
      {
        label: "Processing",
        detail:
          "All editing and ZIP packaging run in the browser tab; every download is re-encoded from pixels, stripping EXIF, GPS, XMP, and ICC.",
      },
    ],
    examplesTitle: "Image Resizer examples",
    examples: [
      {
        scenario: "Social square",
        input: "A 4000 × 3000 photo, preset 1080 × 1080, Fill",
        output:
          "A 1080 × 1080 image centre-cropped from the middle of the frame",
      },
      {
        scenario: "Web hero",
        input: "A 6000 px photo, longest side 1920 px, WebP output",
        output:
          "A 1920 × 1280 WebP with proportions preserved by the aspect lock",
      },
      {
        scenario: "Print at 300 DPI",
        input: "A photo for a 10 × 15 cm print at 300 DPI",
        output:
          "Exact pixel dimensions computed by the DPI panel (1181 × 1772 px), ready to print",
      },
    ],
    privacyNote:
      "Photos never leave the browser. Closing or refreshing the tab discards everything.",
  },

  "image-cropper": {
    stepsHeading: "How to crop images with ratios and presets",
    faqsHeading: "Image cropper questions, answered",
    relatedHeading: "More ways to work with images",
    referenceHeading: "Image Cropper: ratios, shapes, presets, and limits",
    referenceIntro:
      "Crop with a freeform frame, a fixed ratio, or a social preset, then export at crop pixels, a percentage scale, exact pixels, or the preset’s own size. Each image in a batch keeps its own crop.",
    specsTitle: "Image Cropper specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 images, 15 MB per file, 24 megapixels per image, 8,192 pixels per side, and 200 megapixels across the batch. EXIF orientation is applied before display.",
      },
      {
        label: "Formats",
        detail: "JPEG, PNG, and WebP inputs and outputs.",
      },
      {
        label: "Ratios and shapes",
        detail:
          "Free crop, fixed ratios such as 1:1, 4:3, and 16:9, plus Square and Circle (a 1:1 crop with a circular alpha mask). PNG and WebP keep the circle corners transparent; JPEG fills them with your background colour.",
      },
      {
        label: "Social presets",
        detail:
          "Instagram, YouTube, Facebook, X, LinkedIn, Pinterest, and WhatsApp sizes, each setting both the crop ratio and the export size (for example Instagram post 1080 × 1080).",
      },
      {
        label: "Undo",
        detail:
          "Undo and redo walk through every crop, ratio, shape, rotation, flip, size, format, and quality change, up to 50 steps.",
      },
      {
        label: "Processing",
        detail:
          "Decoding, masking, encoding, and ZIP packaging run in the browser tab. Exports are re-encoded from pixels, removing EXIF, GPS, XMP, and ICC.",
      },
    ],
    examplesTitle: "Image Cropper examples",
    examples: [
      {
        scenario: "Profile photo",
        input: "A landscape photo, Circle shape, PNG output",
        output:
          "A square PNG with transparent corners, exported at the crop’s own pixels",
      },
      {
        scenario: "Story format",
        input: "A photo, WhatsApp status preset (1080 × 1920)",
        output:
          "A 1080 × 1920 image cropped to the 9:16 ratio and exported at preset size",
      },
      {
        scenario: "Batch with mixed crops",
        input: "Five images, each with its own frame and ratio",
        output:
          "Five individually cropped files, downloadable one by one or as one ZIP",
      },
    ],
    privacyNote:
      "Images never touch a QUICKKIT server. Closing the tab discards everything.",
  },

  "image-to-image": {
    stepsHeading: "How to convert images between formats",
    faqsHeading: "Image converter questions, answered",
    relatedHeading: "More ways to work with images",
    referenceHeading: "Image Converter: formats, target size, and limits",
    referenceIntro:
      "Convert between seven output formats with optional crop, resize, and target-size compression. The tool probes the real encoder first and disables any format the browser cannot produce.",
    specsTitle: "Image Converter specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 20 files and 150 MB per batch. Image files are limited to 15 MB, 24 megapixels, and 8,192 pixels per side; PDFs are limited to 25 MB and 100 pages.",
      },
      {
        label: "Inputs",
        detail:
          "JPG, JPEG, PNG, WEBP, AVIF, GIF, BMP, and TIFF, plus HEIC/HEIF where the browser can decode it; PDFs are accepted in the PDF-specific modes.",
      },
      {
        label: "Outputs",
        detail:
          "JPG, PNG, WEBP, AVIF, GIF, BMP, and TIFF. AVIF and WEBP output appear only after a real encode test succeeds; TIFF is read and written by QUICKKIT because browsers cannot open it.",
      },
      {
        label: "Target size",
        detail:
          "Tries lossless first, then a bounded quality search, then downscaling — and warns plainly when a target cannot be met without significant degradation.",
      },
      {
        label: "Animation",
        detail:
          "An unedited animated GIF passes through byte-for-byte; any crop, rotate, resize, or re-encode exports the first frame only.",
      },
      {
        label: "Processing",
        detail:
          "Decoding, editing, re-encoding, and ZIP packaging run in the browser tab via the Canvas API and built-in codecs.",
      },
    ],
    examplesTitle: "Image Converter examples",
    examples: [
      {
        scenario: "HEIC to JPG",
        input: "An iPhone HEIC photo (Safari), JPG output",
        output:
          "A JPG with EXIF orientation applied so the photo is not sideways",
      },
      {
        scenario: "PNG to WebP under a cap",
        input: "A 3 MB PNG, WebP output, target size 500 KB",
        output:
          "The best WebP under 500 KB, or a warning with the best achievable size",
      },
      {
        scenario: "Animated GIF passthrough",
        input: "An animated GIF with no edits applied",
        output: "The original GIF bytes copied unchanged, animation intact",
      },
    ],
    privacyNote:
      "Images are never uploaded. Closing the tab clears the queue, results, and object URLs.",
  },

  // --------------------------------------------------------- QR / Security (3)
  "qr-generator": {
    stepsHeading: "How to create a QR code that scans first time",
    faqsHeading: "QR generator questions, answered",
    relatedHeading: "More ways to create and scan codes",
    referenceHeading: "QR Generator: content types, verification, and limits",
    referenceIntro:
      "The code stores your content directly — no QUICKKIT redirect — so it cannot expire. After every render the app decodes the exact PNG bytes you would download and compares the payload with what you entered; export is offered only for a code that passed.",
    specsTitle: "QR Generator specifications",
    specs: [
      {
        label: "Content types",
        detail:
          "28 types including URLs, text, email, phone, SMS, WhatsApp, Wi-Fi, vCard contacts, locations, events, social profiles, app links, UPI payments, and data templates.",
      },
      {
        label: "Payload cap",
        detail:
          "2,500 UTF-8 bytes (a URL field holds 2,000 characters). Exports go up to 2,048 px per side.",
      },
      {
        label: "Design",
        detail:
          "Colours, gradients, dot and eye styles, templates, and a centre logo up to 3 MB. Error correction is raised automatically when a logo would exceed the level’s capacity.",
      },
      {
        label: "Verification",
        detail:
          "Independent decode check after every render, plus an on-demand scan test from 160 to 1,200 px for phone cameras, posters, and print.",
      },
      {
        label: "Bulk CSV",
        detail:
          "One QR per CSV row: 200 rows by default, raisable to 500, files up to 3 MB, 30 columns, 1,500 characters per cell, each code at 256–1,024 px.",
      },
      {
        label: "Processing",
        detail:
          "Encoding, styling, logo handling, CSV parsing, and downloads all run in the browser. Recent codes and presets stay in local storage; the Wi-Fi password is excluded from both.",
      },
    ],
    examplesTitle: "QR Generator examples",
    examples: [
      {
        scenario: "Wi-Fi card",
        input: "SSID “CafeNet”, WPA2 password, QR type Wi-Fi",
        output:
          "A verified QR that joins guests to the network, with the password kept out of storage and share links",
      },
      {
        scenario: "Payment code",
        input: "UPI ID, payee name, and an amount",
        output:
          "A payment QR encoding the UPI intent, verified by decode before export",
      },
      {
        scenario: "Bulk labels",
        input: "A 300-row CSV of product URLs",
        output: "300 QR PNGs in one ZIP, each rendered at the chosen size",
      },
    ],
    privacyNote:
      "Nothing you type is uploaded. A share link carries content in its # fragment, so share only what you would paste into a chat.",
  },

  "qr-code-scanner": {
    stepsHeading: "How to scan QR codes from camera or images",
    faqsHeading: "QR scanner questions, answered",
    relatedHeading: "More ways to create and scan codes",
    referenceHeading: "QR Scanner: sources, safety checks, and limits",
    referenceIntro:
      "Decoding runs locally in the tab. The safety check is a local look at the payload’s structure — it cannot know whether a domain is currently hosting a scam, because nothing is sent to any reputation service.",
    specsTitle: "QR Scanner specifications",
    specs: [
      {
        label: "Sources",
        detail:
          "Live camera, single photos, screenshots, and whole folders of images. Batch mode runs a bounded number of images at once.",
      },
      {
        label: "Multiple codes",
        detail:
          "When an image holds several symbols, the scanner sweeps overlapping tiles so each code is decoded as its own picture and listed as a numbered card.",
      },
      {
        label: "Safety heuristics",
        detail:
          "Flags plain HTTP, raw IP addresses, shortened links, punycode, lookalike domains, embedded credentials, and dangerous schemes. High-risk destinations stay blocked; nothing auto-redirects without your click.",
      },
      {
        label: "Image limits",
        detail:
          "JPG, PNG, WebP, GIF (first frame), BMP, and AVIF decode through the browser. HEIC works only in Safari. Every image is capped at 40 megapixels and 25 MB.",
      },
      {
        label: "Camera",
        detail:
          "Browsers expose the camera only on secure connections (HTTPS or localhost) and after permission. Over plain HTTP the tool says so instead of showing a fake preview.",
      },
      {
        label: "History",
        detail:
          "Timestamp, content type, and decoded text in local storage. Payloads carrying secrets such as Wi-Fi passwords are stored redacted unless you explicitly allow full storage. Image files are never stored, only their names.",
      },
    ],
    examplesTitle: "QR Scanner examples",
    examples: [
      {
        scenario: "Screenshot with two codes",
        input: "A screenshot containing a Wi-Fi code and a payment code",
        output:
          "Two numbered result cards, each with decoded data and a local safety check",
      },
      {
        scenario: "Suspicious link",
        input:
          "A code encoding http://192.168.0.1/login with embedded credentials",
        output:
          "A warning card naming the raw-IP and credential risks, with the destination blocked",
      },
      {
        scenario: "Batch export",
        input: "A folder of 20 photos, each with one code",
        output: "20 decoded results exportable as CSV, JSON, or TXT",
      },
    ],
    privacyNote:
      "Images are decoded locally and never uploaded for processing. History lives in your browser and can be cleared at any time.",
  },

  "barcode-generator": {
    stepsHeading: "How to create a barcode that scans the first time",
    faqsHeading: "Barcode questions, answered",
    relatedHeading: "More ways to create and read codes",
    referenceHeading:
      "Barcode Studio: symbologies, check digits, and print limits",
    referenceIntro:
      "Every symbol is built from the published module tables of its symbology, then validated against that symbology's own rules. Nothing is drawn until the data passes, and a check digit that is missing is calculated while one that is wrong is refused — the difference matters when a label has already been printed a thousand times.",
    specsTitle: "Barcode Studio specifications",
    specs: [
      {
        label: "Formats",
        detail:
          "Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, Codabar, MSI, Pharmacode and GS1-128. Code 128 accepts printable ASCII up to 80 characters and switches to Code Set C for runs of six or more digits.",
      },
      {
        label: "Check digits",
        detail:
          "EAN-13 (12 data digits), EAN-8 (7), UPC-A (11) and ITF-14 (13) calculate the GS1 mod-10 digit when it is missing and verify it when it is present. UPC-E derives its check digit from the expanded UPC-A. Code 39 offers mod-43, MSI offers mod-10 or mod-11. Pharmacode and Codabar have no check digit in the symbology.",
      },
      {
        label: "GS1-128",
        detail:
          "Application identifiers are parsed from the bracketed form, checked against the AI table for length and character set, and separated with GS characters after every variable-length field. GTIN (01, 02) and SSCC (00) check digits must already be correct — the tool will not silently recalculate one.",
      },
      {
        label: "Quiet zones and print size",
        detail:
          "Each format enforces its minimum quiet zone: 11 modules on the left and 7 on the right for EAN-13, 9/9 for UPC-A, 10 for ITF-14, Code 128 and Code 39, 12 for MSI, 6 for Pharmacode. A smaller setting is raised to the minimum. The preview reports the symbol size and the narrow-bar width in millimetres at 300 dpi.",
      },
      {
        label: "Bulk limits",
        detail:
          "Up to 1,000 rows per CSV, 5 MB per file, 30 columns and 1,500 characters per cell. Rows are validated up front, thumbnails render in batches of two and ZIP entries in batches of fifty, so the tab stays responsive. Every row reports ready, duplicate or invalid with a reason, and the report CSV repeats all of it.",
      },
      {
        label: "Exports",
        detail:
          "PNG at 1–6× the preview density, SVG that stays vector, a PDF label at a chosen millimetre size on A4, US Letter or a fitted page, a ZIP of SVG or PNG files, and a direct print dialog that sends the vector symbol. PDF and SVG bars are vector rectangles, so the printer's resolution decides the edge sharpness.",
      },
      {
        label: "Scanner",
        detail:
          "Reads Code 128, GS1-128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 and Codabar from a camera or an image. The camera opens only after a click and prefers the rear lens; images are capped at 25 MB and 40 megapixels and are swept in overlapping tiles so several symbols can be found in one picture. MSI and Pharmacode are generation-only.",
      },
      {
        label: "Privacy",
        detail:
          "Encoding, layout, rasterising, PDF and ZIP building and decoding all run in the tab. No barcode, CSV row or camera frame is uploaded. The only thing stored is your own styling, in this browser's local storage.",
      },
    ],
    examplesTitle: "Barcode Studio examples",
    examples: [
      {
        scenario: "Retail EAN-13",
        input: "590123412345",
        output:
          "The check digit 7 is calculated, the 95-module symbol is drawn with standard guard bars, and the preview reports a 76.2 × 40.6 mm label at 300 dpi with quiet zones intact",
      },
      {
        scenario: "GS1-128 shipping label",
        input: "(01)09501101530003(17)251231(10)LOT-42",
        output:
          "Three validated application identifiers, a GS separator after the variable-length batch field, and the human-readable line printed as (01)… (17)… (10)…",
      },
      {
        scenario: "Bulk CSV with bad rows",
        input: "250 rows of EAN-13 data, three of them 11 digits long",
        output:
          "247 labels ready, 3 rows marked invalid with the exact length problem, a ZIP of the valid symbols and a report CSV listing every row",
      },
    ],
    privacyNote:
      "Nothing you type, upload or scan leaves the browser. There is no account, no server-side render of your data, and no analytics on the values themselves.",
  },

  "password-generator": {
    stepsHeading: "How to generate a strong random password",
    faqsHeading: "Password generator questions, answered",
    relatedHeading: "More ways to protect accounts and files",
    referenceHeading: "Password Generator: randomness, entropy, and limits",
    referenceIntro:
      "Passwords are drawn with crypto.getRandomValues using rejection sampling (no modulo bias) and a secure Fisher–Yates shuffle, with unbiased selection from each pool. The displayed L × log₂(pool) is an approximate upper bound for unconstrained random strings, not actual entropy of the constrained generator.",
    specsTitle: "Password Generator specifications",
    specs: [
      {
        label: "Length",
        detail: "8 to 64 characters (default 20).",
      },
      {
        label: "Character pools",
        detail:
          "Uppercase, lowercase, numbers, and symbols. Every selected pool contributes at least one character.",
      },
      {
        label: "Ambiguous filter",
        detail:
          "Optional exclusion of look-alike characters (I, l, 1, O, 0, o, |) for passwords you will type by hand.",
      },
      {
        label: "Entropy examples",
        detail:
          "For unconstrained random strings, 20 characters from all four pools (85 symbols) have approximately 128 bits; 16 alphanumeric characters without ambiguous ones (56 symbols) have approximately 93 bits. The generator requires each chosen set, so its distribution differs.",
      },
      {
        label: "Randomness",
        detail:
          "crypto.getRandomValues with rejection sampling and a secure shuffle. No Math.random, no server, no analytics.",
      },
      {
        label: "Storage",
        detail:
          "Passwords stay in page memory only. Copying puts the password on your device clipboard, which other applications may access.",
      },
    ],
    examplesTitle: "Password Generator examples",
    examples: [
      {
        scenario: "Maximum strength",
        input: "Length 20, all four pools, ambiguous allowed",
        output:
          "A 20-character password; the unconstrained pool bound is approximately 128 bits",
      },
      {
        scenario: "Typed by hand",
        input: "Length 16, alphanumeric only, ambiguous excluded",
        output:
          "A 16-character password; unconstrained pool bound approximately 93 bits, with no I/l/1/O/0/o/| to confuse",
      },
      {
        scenario: "Minimum length",
        input: "Length 8, lowercase only",
        output:
          "An 8-character password; unconstrained pool bound approximately 38 bits — use a longer password",
      },
    ],
    privacyNote:
      "The generator does not send passwords to a server. Copying places them on your clipboard and downloading saves a plaintext file. Store passwords in a password manager and enable multi-factor authentication where available.",
  },

  // ----------------------------------------------------------- Developer (11)
  "json-formatter": {
    stepsHeading: "How to format, sort, and minify JSON",
    faqsHeading: "JSON formatter questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "JSON Formatter: limits, key sorting, and number safety",
    referenceIntro:
      "Formatting is JSON.parse followed by JSON.stringify with your chosen indent — never eval, never code execution. Key sorting is deep: it applies at every nesting level, not just the top.",
    specsTitle: "JSON Formatter specifications",
    specs: [
      {
        label: "Input limit",
        detail:
          "Up to 1,000,000 characters. Formatted output is capped at 6,000,000 characters.",
      },
      {
        label: "Indent styles",
        detail: "2 spaces, 4 spaces, or a tab.",
      },
      {
        label: "Key sorting",
        detail:
          "Optional deep sort. For example, {“roles”:…, “active”:…, “user”:…} formats to active, roles, user order.",
      },
      {
        label: "Depth limit",
        detail: "Nesting up to 128 levels is accepted.",
      },
      {
        label: "Number safety",
        detail:
          "Integers beyond the safe range (9,007,199,254,740,991) may be rounded by JavaScript parsing, and duplicate keys collapse to the last value. Store such values as quoted strings; do not use this tool for lossless transforms of those inputs.",
      },
      {
        label: "Processing",
        detail:
          "JSON.parse/JSON.stringify in the browser only. Unicode strings are preserved.",
      },
    ],
    examplesTitle: "JSON Formatter examples",
    examples: [
      {
        scenario: "Sorted API response",
        input:
          '{"roles":["admin","editor"],"active":true,"user":"Asha"}' +
          " with sort keys on",
        output:
          '{\n  "active": true,\n  "roles": [\n    "admin",\n    "editor"\n  ],\n  "user": "Asha"\n}',
      },
      {
        scenario: "Minified config",
        input: "A pretty-printed config with 2-space indents",
        output: "The same data on one line, ready to embed in a script tag",
      },
      {
        scenario: "Trailing comma",
        input: '{\n  "port": 8080,\n}',
        output:
          "A syntax error pointing at line 3, column 1 — the closing brace after the comma",
      },
    ],
    privacyNote:
      "Input is parsed locally and never uploaded. Navigating away or refreshing clears the editor.",
  },

  "json-validator": {
    stepsHeading: "How to validate JSON and find the exact error",
    faqsHeading: "JSON validator questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "JSON Validator: error locations and inspection stats",
    referenceIntro:
      "Validation is JSON.parse in the browser. When the parser reports a position, it is mapped to a one-based line and column with a short escaped excerpt, so you can jump straight to the problem.",
    specsTitle: "JSON Validator specifications",
    specs: [
      {
        label: "Input limit",
        detail: "Up to 1,000,000 characters, or a local .json file.",
      },
      {
        label: "Error locations",
        detail:
          "One-based line and column plus the parser message and a short excerpt. For example, a trailing comma after “port”: 8080 is reported at line 3, column 1.",
      },
      {
        label: "Inspection stats",
        detail:
          "Root type (object, array, string, number, boolean, null), key count, maximum depth, and UTF-8 byte size.",
      },
      {
        label: "What is invalid",
        detail:
          "Comments, trailing commas, single-quoted strings, undefined, and NaN are not JSON. Keys and strings must be double-quoted.",
      },
      {
        label: "Valid output",
        detail:
          "A normalized preview you can copy or download, plus the stats above.",
      },
      {
        label: "Processing",
        detail:
          "JSON.parse only — input is never evaluated as JavaScript and never uploaded.",
      },
    ],
    examplesTitle: "JSON Validator examples",
    examples: [
      {
        scenario: "Trailing comma",
        input: '{\n  "port": 8080,\n}',
        output:
          "Invalid — error at line 3, column 1, pointing at the closing brace",
      },
      {
        scenario: "Valid config",
        input: '{"user":"Asha","roles":["admin","editor"],"active":true}',
        output:
          "Valid — root type object, 3 keys, maximum depth 3, 56 UTF-8 bytes",
      },
      {
        scenario: "Single quotes",
        input: "{'name': 'Asha'}",
        output:
          "Invalid — single quotes are not JSON; keys and strings need double quotes",
      },
    ],
    privacyNote:
      "Validation runs entirely in the browser. QUICKKIT does not receive your input.",
  },

  "xml-formatter": {
    stepsHeading: "How to format or minify XML safely",
    faqsHeading: "XML formatter questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "XML Formatter: safety rules, limits, and whitespace",
    referenceIntro:
      'Formatting parses with @xmldom/xmldom and re-serializes with your indent. Minification removes only layout whitespace between element-only children; mixed text and xml:space="preserve" sections are retained.',
    specsTitle: "XML Formatter specifications",
    specs: [
      {
        label: "Input limits",
        detail:
          "Up to 1,000,000 characters and 1,000,000 file bytes, 50,000 nodes, and 128 levels of depth.",
      },
      {
        label: "DOCTYPE protection",
        detail:
          "Any <!DOCTYPE declaration is rejected, which blocks external entity access and entity-expansion (XXE) attacks. Built-in XML entities and normal namespaces are supported.",
      },
      {
        label: "Indent styles",
        detail: "2 spaces, 4 spaces, or a tab.",
      },
      {
        label: "Whitespace rules",
        detail:
          'Mixed text content and xml:space="preserve" sections survive minification; only layout whitespace between element-only children is removed.',
      },
      {
        label: "Size stats",
        detail: "Real UTF-8 byte comparison between input and output.",
      },
      {
        label: "Processing",
        detail:
          "Parsing and formatting happen in the browser; no source is uploaded.",
      },
    ],
    examplesTitle: "XML Formatter examples",
    examples: [
      {
        scenario: "Compact note",
        input:
          '<?xml version="1.0"?><note><to>Riya</to><body>Ship v2</body></note>',
        output:
          '<?xml version="1.0"?>\n<note>\n  <to>Riya</to>\n  <body>Ship v2</body>\n</note>',
      },
      {
        scenario: "Entity risk",
        input: "An XML file containing a <!DOCTYPE declaration",
        output:
          "Rejected with an explanation, because DTDs can enable entity-expansion attacks",
      },
      {
        scenario: "Preserved text",
        input: 'An element with xml:space="preserve" and significant spaces',
        output:
          "The significant spaces kept intact while surrounding layout whitespace is minified",
      },
    ],
    privacyNote:
      "XML is parsed locally in the browser. Nothing is uploaded or saved by QUICKKIT.",
  },

  "html-formatter": {
    stepsHeading: "How to beautify or minify HTML",
    faqsHeading: "HTML formatter questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading:
      "HTML Formatter: engines, limits, and what is not touched",
    referenceIntro:
      "Beautifying uses Prettier (print width 100, indent 2/4/tab). Minifying uses a local WebAssembly minifier with embedded JavaScript and CSS minification explicitly disabled, so only markup is compacted.",
    specsTitle: "HTML Formatter specifications",
    specs: [
      {
        label: "Input limits",
        detail: "Up to 1,000,000 characters and 1,000,000 file bytes.",
      },
      {
        label: "Format engine",
        detail:
          "Prettier standalone with printWidth 100 and 2-space, 4-space, or tab indentation.",
      },
      {
        label: "Minify engine",
        detail:
          "Local minify-html-wasm with minify_css and minify_js both false. Embedded scripts and styles are never executed or rewritten.",
      },
      {
        label: "Safety",
        detail:
          "Input is parsed and returned as inert text. The result is never inserted into the document, so script text cannot run.",
      },
      {
        label: "Size stats",
        detail: "Real UTF-8 byte comparison between input and output.",
      },
      {
        label: "Processing",
        detail: "Files are read locally in the browser and are not uploaded.",
      },
    ],
    examplesTitle: "HTML Formatter examples",
    examples: [
      {
        scenario: "Beautify a card",
        input: '<div class="card"><h2>Title</h2><p>Body</p></div>',
        output: "The same markup indented one element per line at 2 spaces",
      },
      {
        scenario: "Minify a page",
        input: "A page with layout whitespace between every element",
        output:
          "Compact markup with meaningful text whitespace preserved and inline JS/CSS untouched",
      },
      {
        scenario: "Script safety",
        input: "HTML containing a <script> block",
        output: "The script text passed through as inert text — never executed",
      },
    ],
    privacyNote:
      "Formatting and minification run locally. QUICKKIT does not receive your HTML.",
  },

  "css-minifier": {
    stepsHeading: "How to minify CSS with a real parser",
    faqsHeading: "CSS minifier questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "CSS Minifier: parser, license comments, and limits",
    referenceIntro:
      "Minification uses CSSO’s syntax parser — not regular expressions — so strings, comments, and whitespace are handled as CSS tokens. Structure-rewriting optimizations are disabled to reduce semantic risk.",
    specsTitle: "CSS Minifier specifications",
    specs: [
      {
        label: "Input limits",
        detail: "Up to 1,000,000 characters and 1,000,000 file bytes.",
      },
      {
        label: "Engine",
        detail:
          "CSSO with restructure disabled. Syntax errors are reported instead of being “fixed” with unsafe text substitutions.",
      },
      {
        label: "License comments",
        detail:
          "The first /*! license-style comment is kept; ordinary comments are removed.",
      },
      {
        label: "Size stats",
        detail:
          "Real UTF-8 byte comparison. For example, the 75-byte hero-card sample below minifies to 45 bytes (40% smaller).",
      },
      {
        label: "Error checking",
        detail: "Bracket and syntax errors are reported with line information.",
      },
      {
        label: "Processing",
        detail: "Parsing and minification run locally in the browser.",
      },
    ],
    examplesTitle: "CSS Minifier examples",
    examples: [
      {
        scenario: "Hero card",
        input:
          "/* Hero card */\n.hero {\n  padding: 16px 24px 16px 24px;\n  color: #ffffff;\n}",
        output:
          ".hero{padding:16px 24px 16px 24px;color:#fff} — 75 → 45 bytes (40% smaller)",
      },
      {
        scenario: "License header",
        input: "/*! MIT License */\n.btn { color: red; }",
        output:
          "The license comment kept, the rule minified to .btn{color:red}",
      },
      {
        scenario: "Broken bracket",
        input: ".card { padding: 8px;",
        output:
          "A syntax error naming the unclosed bracket instead of a guessed fix",
      },
    ],
    privacyNote: "Your stylesheet is parsed locally. Nothing is uploaded.",
  },

  "javascript-minifier": {
    stepsHeading: "How to minify JavaScript safely",
    faqsHeading: "JavaScript minifier questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "JavaScript Minifier: Terser settings and safety",
    referenceIntro:
      "Terser parses the source into an AST and minifies it without ever executing it — no eval, no Function constructor, no script element. One conservative compression pass is used, and top-level mangling is off.",
    specsTitle: "JavaScript Minifier specifications",
    specs: [
      {
        label: "Input limits",
        detail: "Up to 1,000,000 characters and 1,000,000 file bytes.",
      },
      {
        label: "Engine",
        detail:
          "Terser with ecma 2020, one compression pass, local name mangling on, top-level mangling off. Comments starting with ! (licenses) are kept.",
      },
      {
        label: "Size stats",
        detail:
          "Real UTF-8 byte comparison. For example, the 88-byte function sample below minifies to 40 bytes (54.5% smaller).",
      },
      {
        label: "Syntax errors",
        detail:
          "Invalid syntax is reported with its location instead of producing output.",
      },
      {
        label: "Execution",
        detail:
          "Never. The tool is a parser and AST minifier only; your code cannot run inside it.",
      },
      {
        label: "Processing",
        detail: "Files are read in the browser and are not uploaded.",
      },
    ],
    examplesTitle: "JavaScript Minifier examples",
    examples: [
      {
        scenario: "Tax helper",
        input:
          "function totalWithTax(price, rate) {\n  const tax = price * rate;\n  return price + tax;\n}",
        output:
          "function totalWithTax(t,n){return t+t*n} — 88 → 40 bytes (54.5% smaller)",
      },
      {
        scenario: "License header",
        input: "/*! Copyright 2026 */\nconst x = 1;",
        output: "The license comment kept, the code minified",
      },
      {
        scenario: "Syntax error",
        input: "const x = ;",
        output: "A syntax error report, no output produced",
      },
    ],
    privacyNote:
      "Minification runs locally and your code is never executed or uploaded.",
  },

  "base64-encoder-decoder": {
    stepsHeading: "How to encode or decode Base64",
    faqsHeading: "Base64 encoder/decoder questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "Base64: UTF-8 text, binary files, and limits",
    referenceIntro:
      "Text is encoded as UTF-8 bytes before Base64 conversion and decoded with strict UTF-8 validation. Files are encoded as raw bytes, and decoding can save the bytes back as a binary file.",
    specsTitle: "Base64 specifications",
    specs: [
      {
        label: "File limit",
        detail: "Selected files up to 10 MB (10,000,000 bytes).",
      },
      {
        label: "Encoded string limit",
        detail: "Base64 input up to 14,000,000 characters.",
      },
      {
        label: "Text handling",
        detail:
          "Unicode is encoded as UTF-8 bytes first, so characters like — and Hindi text survive the round trip.",
      },
      {
        label: "Validation",
        detail:
          "Invalid characters, bad padding, and invalid UTF-8 on decode are reported clearly instead of producing garbage.",
      },
      {
        label: "Binary mode",
        detail:
          "Non-text files are Base64-encoded without text conversion; decoding can download the original bytes as a binary file.",
      },
      {
        label: "Processing",
        detail: "Everything runs in the browser; nothing leaves the device.",
      },
    ],
    examplesTitle: "Base64 examples",
    examples: [
      {
        scenario: "Unicode text",
        input: "QUICKKIT — local tools",
        output: "UVVJQ0tLSVQg4oCUIGxvY2FsIHRvb2xz",
      },
      {
        scenario: "Binary file",
        input: "A 2 MB ZIP file",
        output:
          "Its Base64 text, downloadable, with the original bytes recoverable on decode",
      },
      {
        scenario: "Invalid padding",
        input: "abc",
        output:
          "An error naming the padding problem instead of a silent wrong decode",
      },
    ],
    privacyNote:
      "Text and file bytes stay in the browser. Clear removes the current data; Reset also restores defaults.",
  },

  "url-encoder-decoder": {
    stepsHeading: "How to percent-encode or decode URLs",
    faqsHeading: "URL encoder/decoder questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "URL Encoder: component vs full-URL modes and limits",
    referenceIntro:
      "Component mode (encodeURIComponent) escapes reserved characters inside a single value; full-URL mode (encodeURI) preserves URL structure such as : / ? & = # while escaping spaces and Unicode. The tool never fetches the URL.",
    specsTitle: "URL Encoder specifications",
    specs: [
      {
        label: "Input limit",
        detail: "Up to 1,000,000 characters.",
      },
      {
        label: "Component mode",
        detail:
          "Escapes ? & = and other reserved characters inside one query value. For example, plan=pro&redirect=https://example.com/a b becomes plan%3Dpro%26redirect%3Dhttps%3A%2F%2Fexample.com%2Fa%20b.",
      },
      {
        label: "Full-URL mode",
        detail:
          "Keeps : / ? & = # intact. For example, https://example.com/docs/my guide?lang=हिन्दी#top becomes https://example.com/docs/my%20guide?lang=%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80#top.",
      },
      {
        label: "UTF-8 handling",
        detail:
          "Non-ASCII text is percent-encoded as UTF-8 bytes in both modes.",
      },
      {
        label: "Error handling",
        detail:
          "Invalid percent escapes on decode are shown as errors rather than silently changed.",
      },
      {
        label: "Processing",
        detail:
          "Text transformation only — the tool never opens, fetches, or submits the supplied URL.",
      },
    ],
    examplesTitle: "URL Encoder examples",
    examples: [
      {
        scenario: "Query value",
        input: "plan=pro&redirect=https://example.com/a b (component mode)",
        output: "plan%3Dpro%26redirect%3Dhttps%3A%2F%2Fexample.com%2Fa%20b",
      },
      {
        scenario: "Full URL with Hindi",
        input:
          "https://example.com/docs/my guide?lang=हिन्दी#top (full-URL mode)",
        output:
          "https://example.com/docs/my%20guide?lang=%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80#top",
      },
      {
        scenario: "Bad escape",
        input: "%zz on decode",
        output: "An error naming the invalid escape instead of a silent change",
      },
    ],
    privacyNote:
      "Encoding runs locally. The tool never makes a request to the URL you enter.",
  },

  "uuid-generator": {
    stepsHeading: "How to generate bulk UUID v4 identifiers",
    faqsHeading: "UUID generator questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "UUID Generator: version, batch size, and uniqueness",
    referenceIntro:
      "Every value is an RFC 4122 version 4 UUID: the version and variant bits are set correctly and the random bytes come from crypto.getRandomValues. Each batch is checked for duplicates before it is shown.",
    specsTitle: "UUID Generator specifications",
    specs: [
      {
        label: "Version",
        detail: "UUID v4 (random) with correct version and variant bits.",
      },
      {
        label: "Batch size",
        detail: "1 to 2,000 UUIDs per batch.",
      },
      {
        label: "Randomness",
        detail: "crypto.getRandomValues in the browser; no server involved.",
      },
      {
        label: "Uniqueness",
        detail:
          "Each batch is deduplicated with a Set and any collision is retried before the batch is displayed.",
      },
      {
        label: "Output",
        detail:
          "Newline-separated UUID v4 values, copyable or downloadable as a text file.",
      },
      {
        label: "Processing",
        detail:
          "Generation occurs in the browser; QUICKKIT does not collect the values.",
      },
    ],
    examplesTitle: "UUID Generator examples",
    examples: [
      {
        scenario: "Single ID",
        input: "Quantity 1",
        output:
          "One UUID v4 such as 3f8a2c1e-…-4…-…-… (version nibble 4, variant 8/9/a/b)",
      },
      {
        scenario: "Seed data",
        input: "Quantity 500",
        output:
          "500 unique UUID v4 values, collision-checked, downloadable as a text file",
      },
      {
        scenario: "Maximum batch",
        input: "Quantity 2,000",
        output: "2,000 unique UUID v4 values in one batch",
      },
    ],
    privacyNote: "Identifiers are generated locally and never sent anywhere.",
  },

  "hash-generator": {
    stepsHeading: "How to hash text or files locally",
    faqsHeading: "Hash generator questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "Hash Generator: algorithms, limits, and security notes",
    referenceIntro:
      "Digests are computed with the local hash-wasm library and shown as lowercase hexadecimal. MD5 and SHA-1 are legacy algorithms for compatibility — use SHA-256 or SHA-512 for anything security-sensitive.",
    specsTitle: "Hash Generator specifications",
    specs: [
      {
        label: "Algorithms",
        detail:
          "MD5, SHA-1, SHA-256, SHA-384, and SHA-512, output as lowercase hex.",
      },
      {
        label: "Text limit",
        detail: "Up to 20,000,000 UTF-8 bytes.",
      },
      {
        label: "File limit",
        detail:
          "Up to 100 MiB, read and hashed in 1 MiB chunks entirely in the browser.",
      },
      {
        label: "Empty input",
        detail:
          "Empty text and empty files are valid hash inputs. SHA-256 of the empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.",
      },
      {
        label: "Security notes",
        detail:
          "Do not use MD5 or SHA-1 for signatures, password storage, or collision-resistant integrity checks.",
      },
      {
        label: "Processing",
        detail:
          "Text and file bytes remain local; only the digest is shown in the workspace.",
      },
    ],
    examplesTitle: "Hash Generator examples",
    examples: [
      {
        scenario: "Text fingerprint",
        input: "quickkit, SHA-256",
        output:
          "e133bd37e76295202d06456dfbb31297d4e326ca73d30cddfd81ff9d5a2e2832",
      },
      {
        scenario: "Legacy checksum",
        input: "quickkit, MD5",
        output: "0c304272911a57e46ac6fd9362d8f97a",
      },
      {
        scenario: "Large file",
        input: "An 80 MiB file, SHA-512",
        output:
          "A 128-character hex digest computed in 1 MiB chunks without uploading the file",
      },
    ],
    privacyNote:
      "Input never leaves the browser. Only the digest is displayed, copyable, and downloadable.",
  },

  "regex-tester": {
    stepsHeading: "How to test regex patterns and replacements",
    faqsHeading: "Regex tester questions, answered",
    relatedHeading: "More developer tools for data and code",
    referenceHeading: "Regex Tester: flags, limits, and hang protection",
    referenceIntro:
      "Matching runs in a disposable Web Worker that is terminated after 300 ms, so a catastrophic-backtracking pattern cannot freeze the page. Patterns are passed only to the browser’s RegExp constructor — no eval, no Function.",
    specsTitle: "Regex Tester specifications",
    specs: [
      {
        label: "Input limits",
        detail:
          "Pattern up to 500 characters, test text up to 20,000 characters, replacement up to 10,000 characters, and at most 500 matches.",
      },
      {
        label: "Flags",
        detail:
          "g (global), i (ignore case), m (multiline), s (dotAll), u (Unicode).",
      },
      {
        label: "Match inspection",
        detail:
          "Highlighted matches, match indexes, and capture groups (numbered and named) for every match.",
      },
      {
        label: "Replacements",
        detail:
          "Live preview following String.replace conventions: $$, $&, $1–$99, and $<name>.",
      },
      {
        label: "Hang protection",
        detail:
          "A 300 ms worker timeout terminates slow patterns and reports an error instead of freezing the tab.",
      },
      {
        label: "Processing",
        detail: "Everything runs locally in the browser.",
      },
    ],
    examplesTitle: "Regex Tester examples",
    examples: [
      {
        scenario: "Email extraction",
        input: "Pattern [\\w.]+@[\\w.]+\\.\\w+ with flag g over a paragraph",
        output: "Every email address highlighted with its index and full match",
      },
      {
        scenario: "Named-group swap",
        input:
          "Pattern (?<first>\\w+) (?<last>\\w+), replacement $<last>, $<first>",
        output:
          "Each “First Last” pair rewritten as “Last, First” in the live preview",
      },
      {
        scenario: "Catastrophic pattern",
        input: "A nested-quantifier pattern over a long non-matching string",
        output: "A timeout error after 300 ms instead of a frozen page",
      },
    ],
    privacyNote:
      "Patterns and test text stay in the browser. The worker is disposable and terminated after each run.",
  },

  // ---------------------------------------------------------- Text / OCR (3)
  "word-counter": {
    stepsHeading: "How to count words and check your goal",
    faqsHeading: "Word counter questions, answered",
    relatedHeading: "More ways to work with text",
    referenceHeading: "Word Counter: counting rules, rates, and limits",
    referenceIntro:
      "Counts update live as you type. Words are whitespace-separated tokens containing a letter or number; blank lines separate paragraphs. Languages without spaces need a dedicated language-specific counter.",
    specsTitle: "Word Counter specifications",
    specs: [
      {
        label: "Input limit",
        detail: "Up to 1,000,000 characters.",
      },
      {
        label: "Counts",
        detail:
          "Words, characters (Unicode code points), characters without spaces, sentences, paragraphs, and lines.",
      },
      {
        label: "Reading and speaking time",
        detail:
          "Reading time assumes 200 words per minute; speaking time assumes 150 words per minute. Both round up to the next second.",
      },
      {
        label: "Keyword analysis",
        detail:
          "Average word length, longest word, unique word count, and the top 8 non-stopword keywords with counts and percentages.",
      },
      {
        label: "Word goal",
        detail: "An optional target word count with live progress toward it.",
      },
      {
        label: "Processing",
        detail:
          "Text lives in page memory only. Navigating away or refreshing clears it.",
      },
    ],
    examplesTitle: "Word Counter examples",
    examples: [
      {
        scenario: "Sample sentence",
        input:
          "Clear documentation saves engineering hours. Clear examples prevent support tickets.",
        output:
          "10 words, 84 characters, 2 sentences, 3 seconds reading, 4 seconds speaking; top keyword “clear” ×2 (20%)",
      },
      {
        scenario: "Essay draft",
        input: "A 1,200-word draft with a 1,500-word goal",
        output:
          "1,200 words counted with 80% of the goal reached, plus reading time and keyword density",
      },
      {
        scenario: "Social post",
        input: "A 240-character post",
        output:
          "Character and word counts update per keystroke so the post fits its limit",
      },
    ],
    privacyNote:
      "Your writing is never uploaded. The text lives in this page’s memory only.",
  },

  "case-converter": {
    stepsHeading: "How to convert text between case styles",
    faqsHeading: "Case converter questions, answered",
    relatedHeading: "More ways to work with text",
    referenceHeading: "Case Converter: 10 styles and conversion rules",
    referenceIntro:
      "Conversion is live as you type and preserves line breaks and whitespace. Identifier styles (camelCase, snake_case, kebab-case, and friends) work line by line; some Unicode characters expand during conversion, so character counts may change.",
    specsTitle: "Case Converter specifications",
    specs: [
      {
        label: "Input limit",
        detail: "Up to 1,000,000 characters.",
      },
      {
        label: "Reading styles",
        detail:
          "UPPERCASE, lowercase, Title Case, Sentence case, and aLtErNaTiNg (alternating).",
      },
      {
        label: "Identifier styles",
        detail:
          "camelCase, PascalCase, snake_case, kebab-case, and CONSTANT_CASE — applied line by line.",
      },
      {
        label: "Title rules",
        detail:
          "Title Case capitalizes word beginnings with simple Unicode-aware rules; Sentence case capitalizes the beginning and text after punctuation or line breaks. Names and acronyms may need manual editing.",
      },
      {
        label: "Line breaks",
        detail:
          "Preserved exactly. You can copy or download the output, or send it back to the input for another pass.",
      },
      {
        label: "Processing",
        detail: "Conversion runs only in the browser.",
      },
    ],
    examplesTitle: "Case Converter examples",
    examples: [
      {
        scenario: "Identifier to camelCase",
        input: "user_profile-avatar URL",
        output: "userProfileAvatarUrl",
      },
      {
        scenario: "PascalCase to kebab-case",
        input: "UserProfileAvatarUrl",
        output: "user-profile-avatar-url",
      },
      {
        scenario: "Class name to snake_case",
        input: "OrderCheckoutTotal",
        output: "order_checkout_total",
      },
    ],
    privacyNote:
      "Your text is never sent to a server. It is processed only in the browser.",
  },

  "image-to-text": {
    stepsHeading: "How to extract text from images and scans",
    faqsHeading: "Image to text (OCR) questions, answered",
    relatedHeading: "More ways to work with text",
    referenceHeading: "Image to Text: languages, modes, and limits",
    referenceIntro:
      "The OCR engine runs in a Web Worker on your device with language data served from this site — never from a third-party OCR service. There is no server-side fallback, so nothing can be uploaded even in error.",
    specsTitle: "Image to Text specifications",
    specs: [
      {
        label: "Batch limits",
        detail:
          "Up to 40 files, 25 MB each, 200 MB per batch, and 40 pages per PDF. Very large images are reduced to a sensible reading resolution.",
      },
      {
        label: "Languages",
        detail:
          "English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, and Urdu — all running locally. Several can be selected at once for mixed-language pages.",
      },
      {
        label: "Extraction modes",
        detail:
          "Plain Text, Original Layout, Formatted Text, Table Extraction, Structured Data, and Smart OCR, which inspects the page and picks the best mode.",
      },
      {
        label: "Image preparation",
        detail:
          "Rotate, crop, and enhance first: grayscale, contrast, noise removal, and skew correction.",
      },
      {
        label: "Review tools",
        detail:
          "Low-confidence words are highlighted, each page shows mean confidence, and the editor supports undo/redo and find-and-replace.",
      },
      {
        label: "Export",
        detail:
          "TXT, DOCX, PDF, CSV, or JSON — combined, single page, selected pages, or one file per page. The PDF export carries a selectable text layer, including for Indic scripts.",
      },
    ],
    examplesTitle: "Image to Text examples",
    examples: [
      {
        scenario: "Receipt table",
        input: "A photo of an invoice, Table Extraction mode",
        output:
          "Rows grouped by vertical position and columns split by horizontal gaps, exportable to CSV",
      },
      {
        scenario: "Mixed-language page",
        input: "A page with English and Hindi text, both languages selected",
        output: "Both scripts extracted with per-word confidence highlighting",
      },
      {
        scenario: "Scanned PDF",
        input: "A 10-page scanned PDF, pages 1-5 selected",
        output:
          "Five pages rendered at about 300 DPI and read like images, with per-page progress",
      },
    ],
    privacyNote:
      "Images are decoded with your browser’s own decoder and read on this device. QUICKKIT receives no file, image, or extracted text.",
  },
};

/** Search snippets for the Batch C routes whose metadata is not colocated in a ToolShell page. */
export const TOOL_SEO_METADATA: Record<
  string,
  { title: string; description: string }
> = {
  "password-generator": {
    title: "Password Generator — Secure Random Passwords",
    description:
      "Generate passwords and passphrases with secure randomness, check strength and entropy, and build a password policy locally without uploading secrets.",
  },
  "word-counter": {
    title: "Word Counter — Words, Characters & Reading Time",
    description:
      "Count words, characters, sentences, paragraphs, lines, reading time, and top keywords as you type. Set a word goal; your text stays in the browser.",
  },
  "case-converter": {
    title: "Case Converter — camelCase, snake_case & More",
    description:
      "Convert text to uppercase, Title Case, camelCase, snake_case, kebab-case, and five more styles. Preserve line breaks and process text locally in your browser.",
  },
  "json-formatter": {
    title: "JSON Formatter — Beautify, Sort & Minify JSON",
    description:
      "Format, minify, sort nested JSON keys, or validate syntax with line and column errors. Choose 2-space, 4-space, or tab indentation; runs locally.",
  },
  "json-validator": {
    title: "JSON Validator — Find Errors by Line & Column",
    description:
      "Validate JSON locally and locate syntax errors by line and column. Inspect root type, keys, nesting depth, and UTF-8 size without running JavaScript code.",
  },
  "xml-formatter": {
    title: "XML Formatter — Pretty Print & Minify XML Safely",
    description:
      "Format or minify XML with 2-space, 4-space, or tab indentation. DOCTYPE is rejected to prevent entity risks; mixed text and preserved spaces stay intact.",
  },
  "html-formatter": {
    title: "HTML Formatter — Beautify & Minify HTML Online",
    description:
      "Beautify HTML with Prettier or minify markup locally with CSS and JavaScript untouched. Compare UTF-8 byte sizes; embedded scripts are never executed.",
  },
  "css-minifier": {
    title: "CSS Minifier — Compress CSS & Compare File Size",
    description:
      "Minify CSS with CSSO's syntax-aware parser, preserve the first license comment, and compare exact UTF-8 byte sizes. Your stylesheet stays in your browser.",
  },
  "javascript-minifier": {
    title: "JavaScript Minifier — Compress JS Safely",
    description:
      "Minify JavaScript with Terser, compare UTF-8 byte sizes, and see syntax errors clearly. Code is parsed but never executed or uploaded from your browser.",
  },
  "base64-encoder-decoder": {
    title: "Base64 Encoder & Decoder — Text and File Tools",
    description:
      "Encode UTF-8 text or files up to 10 MB to Base64, or decode Base64 to text or binary downloads. Validate padding and process data locally in browser.",
  },
  "url-encoder-decoder": {
    title: "URL Encoder & Decoder — Query Components and URLs",
    description:
      "Percent-encode or decode query values and full URLs with correct Unicode handling. Choose component or URL mode; input is never fetched or uploaded.",
  },
  "uuid-generator": {
    title: "UUID Generator — Create Secure Bulk UUID v4 IDs",
    description:
      "Generate cryptographically random UUID v4 identifiers in duplicate-checked batches of 1–2,000. Copy or download locally; no identifiers are uploaded.",
  },
  "hash-generator": {
    title: "Hash Generator — SHA-256, SHA-384, SHA-512 & MD5",
    description:
      "Hash text or files locally with MD5 and SHA algorithms, verify batch checksums, compare digests and inspect file signature hints without uploading.",
  },
  "regex-tester": {
    title: "Regex Tester — Match, Capture & Replace Text",
    description:
      "Test regex matches, groups, and replacements with g, i, m, s, or u flags. A 300 ms worker timeout protects pages; patterns run in a disposable local worker.",
  },
  "word-to-pdf": {
    title: "Word to PDF Converter — DOCX to PDF with Consent",
    description:
      "Convert DOCX files to PDF with per-page controls and real previews. Files are sent to the server only after consent, then deleted after conversion.",
  },
};
