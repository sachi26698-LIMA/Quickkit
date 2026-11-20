import type { ToolSeoRecord } from "./registry";
import { launchCategories, launchTools } from "@/lib/tools/launch/registry";

/**
 * Per-tool search records — one per published tool route.
 *
 * Editorial rules applied to every record below (enforced by `audit.ts`):
 *   • title ≤ 49 characters before the ` | QUICKKIT` suffix;
 *   • description 140–160 characters, specific to this tool's own behaviour;
 *   • the H1 is the tool's plain name, because that is what the page renders;
 *   • no claim that the engine cannot keep (limits are stated, not hidden);
 *   • no "unlimited", "instant", "100% private" or accuracy promises.
 *
 * `researchId` points at the entry in `docs/seo/RESEARCH_LOG.md` that records
 * the queries examined, the SERP intent observed and the reasoning.
 */
export const TOOL_SEO_RECORDS: ToolSeoRecord[] = [
  // ──────────────────────────────────────────────────────────── PDF Tools (9)
  {
    path: "/tools/merge-pdf",
    slug: "merge-pdf",
    title: "Merge PDF Online — Combine & Reorder PDF Pages",
    description:
      "Combine up to 25 PDFs in your browser: reorder files, pick page ranges, add one bookmark per source and download a validated PDF. Nothing is uploaded.",
    h1: "PDF Merger",
    primaryKeyword: "merge pdf",
    secondaryKeywords: [
      "combine pdf files",
      "merge pdf without uploading",
      "join pdf pages online",
      "merge pdf on mobile",
      // "reorder pdf pages" belonged here and to /tools/pdf-studio, so the two
      // pages competed for one query. Reordering is pdf-studio's whole job, so
      // it keeps the phrase; merge-pdf keeps the ordering work it actually
      // does — choosing the sequence of files being combined.
      "arrange pdf files before merging",
    ],
    intent: "transactional",
    researchId: "pdf-merge",
    alternativeTitles: [
      "Merge PDF Files Free — No Upload, No Watermark",
      "Combine PDF Files Online — Reorder Before Merging",
    ],
    alternativeDescription:
      "Join two to 25 PDFs locally, choose page ranges, unlock authorized files, and get one output that is reopened and checked before you download it.",
    internalLinks: [
      "/tools/split-pdf",
      "/tools/compress-pdf",
      "/tools/pdf-studio",
      "/tools/pdf-lock-unlock",
      "/tools/images-to-pdf",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/split-pdf",
    slug: "split-pdf",
    title: "Split PDF Online — Extract Pages & Custom Ranges",
    description:
      "Split a PDF by typed ranges, selected pages, every N pages or one file per page. See the exact output plan first, then download single files or a ZIP.",
    h1: "PDF Splitter",
    primaryKeyword: "split pdf",
    secondaryKeywords: [
      "extract pages from pdf",
      "pdf page range splitter",
      "separate pdf into individual pages",
      "split pdf without uploading",
      "split pdf on phone",
    ],
    intent: "transactional",
    researchId: "pdf-split",
    alternativeTitles: [
      "Split PDF Files — One File Per Page or by Range",
      "Extract PDF Pages — Preview Before Download",
    ],
    alternativeDescription:
      "Break one PDF into many: type ranges like 1-3, 5, split every N pages or export page by page. Output names and page counts are shown before anything is written.",
    internalLinks: [
      "/tools/merge-pdf",
      "/tools/pdf-studio",
      "/tools/compress-pdf",
      "/tools/pdf-to-image",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/compress-pdf",
    slug: "compress-pdf",
    title: "Compress PDF Online — Target Size, No Upload",
    description:
      "Shrink PDFs with four presets or a target KiB/MiB size. Only embedded images are re-encoded, so text stays selectable and vectors stay sharp. Runs locally.",
    h1: "PDF Compressor",
    primaryKeyword: "compress pdf",
    secondaryKeywords: [
      "reduce pdf file size",
      "compress pdf to 100kb",
      "compress pdf for email attachment",
      "pdf compressor without uploading",
      "shrink scanned pdf",
    ],
    intent: "transactional",
    researchId: "pdf-compress",
    alternativeTitles: [
      "Reduce PDF File Size — Presets or Exact Target",
      "Compress PDF Files Locally — Text Stays Text",
    ],
    alternativeDescription:
      "Set image quality and a max image resolution, or ask for a target size. Unsupported images are left alone; an unreachable target is reported, not faked.",
    internalLinks: [
      "/tools/merge-pdf",
      "/tools/split-pdf",
      "/tools/pdf-studio",
      "/tools/pdf-to-image",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/pdf-to-image",
    slug: "pdf-to-image",
    title: "PDF to Image — Export JPG, PNG & WebP Pages",
    description:
      "Render PDF pages to JPG, PNG or WebP from 72 to 600 DPI, all pages or a chosen range, with a real pixel preview and a ZIP download. Conversion stays local.",
    h1: "PDF to Image Converter",
    primaryKeyword: "pdf to image",
    secondaryKeywords: [
      "pdf to jpg converter",
      "pdf to png high resolution",
      "convert pdf pages to images",
      "pdf to image without uploading",
      "pdf to image 300 dpi",
    ],
    intent: "transactional",
    researchId: "pdf-to-image",
    alternativeTitles: [
      "Convert PDF Pages to JPG or PNG — 72 to 600 DPI",
      "PDF to JPG Converter — Choose DPI and Page Range",
    ],
    alternativeDescription:
      "Pick a DPI, a format and the pages you need, preview the actual rendered pixels, then download individual images or a ZIP assembled in your browser.",
    internalLinks: [
      "/tools/images-to-pdf",
      "/tools/pdf-to-word",
      "/tools/image-to-text",
      "/tools/compress-pdf",
      "/category/image-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/images-to-pdf",
    slug: "images-to-pdf",
    title: "Images to PDF — JPG, PNG, WebP & TIFF to PDF",
    description:
      "Combine up to 20 JPG, PNG, WebP, AVIF, GIF, BMP or TIFF images into one PDF. Reorder pages, pick A4, Letter or custom millimetres, and download locally.",
    h1: "Images to PDF Converter",
    primaryKeyword: "images to pdf",
    secondaryKeywords: [
      "jpg to pdf converter",
      "png to pdf",
      "photos to pdf online",
      "combine images into one pdf",
      "image to pdf on mobile",
    ],
    intent: "transactional",
    researchId: "images-to-pdf",
    alternativeTitles: [
      "JPG to PDF Converter — A4, Letter or Custom Size",
      "Combine Photos into One PDF — No Upload",
    ],
    alternativeDescription:
      "Drop in photos or scans, drag them into order, choose a page size and margins, and receive a single PDF whose page count and file size are checked first.",
    internalLinks: [
      "/tools/pdf-to-image",
      "/tools/image-compressor",
      "/tools/merge-pdf",
      "/tools/image-cropper",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/pdf-lock-unlock",
    slug: "pdf-lock-unlock",
    title: "PDF Lock & Unlock — AES-256 Password Protection",
    description:
      "Encrypt a PDF with an AES-256 or AES-128 password and reader permissions, or remove a password you are authorized to use. Key handling and output stay local.",
    h1: "PDF Lock & Unlock",
    primaryKeyword: "pdf lock & unlock",
    secondaryKeywords: [
      "encrypt pdf with password",
      "unlock pdf remove password",
      "aes 256 pdf encryption",
      "restrict pdf printing copying",
      "pdf password remover free",
    ],
    intent: "transactional",
    researchId: "pdf-security",
    alternativeTitles: [
      "Protect PDF with Password — AES-256, Offline",
      "Unlock a PDF You Own — Password Removal",
    ],
    alternativeDescription:
      "Add an open password, restrict printing or copying, or strip a password from a document you have the right to open. QPDF runs in a browser worker, not a server.",
    internalLinks: [
      "/tools/pdf-studio",
      "/tools/password-generator",
      "/tools/hash-generator",
      "/tools/merge-pdf",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/pdf-studio",
    slug: "pdf-studio",
    title: "PDF Studio — Merge, Split, Rotate & Reorder Pages",
    description:
      "One local workspace for page-level PDF edits: merge, split, extract, rotate, reorder, delete, add page numbers or a watermark, then export files or a ZIP.",
    h1: "PDF Studio",
    primaryKeyword: "pdf studio",
    secondaryKeywords: [
      "rotate pdf pages",
      "reorder pdf pages",
      "delete pages from pdf",
      "add page numbers to pdf",
      "pdf editor in browser",
    ],
    intent: "transactional",
    researchId: "pdf-studio",
    alternativeTitles: [
      "Organize PDF Pages — Rotate, Reorder & Extract",
      "Edit PDF Pages in Your Browser — No Upload",
    ],
    alternativeDescription:
      "Work on thumbnails of real pages: turn or delete one page, extract a selection, stamp page numbers, and export the result with its page count and size checked.",
    internalLinks: [
      "/tools/merge-pdf",
      "/tools/split-pdf",
      "/tools/compress-pdf",
      "/tools/pdf-lock-unlock",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/word-to-pdf",
    slug: "word-to-pdf",
    title: "Word to PDF Converter — DOCX to PDF with Consent",
    description:
      "Convert DOCX files to PDF with per-page controls and a real page preview. Files reach the conversion engine only after you consent, and are deleted afterwards.",
    h1: "Word to PDF Converter",
    primaryKeyword: "word to pdf",
    secondaryKeywords: [
      "docx to pdf converter",
      "convert word document to pdf online",
      "word to pdf free without email",
      "word to pdf keep formatting",
      "word to pdf on mobile",
    ],
    intent: "transactional",
    researchId: "word-to-pdf",
    alternativeTitles: [
      "DOCX to PDF Converter — Consent-Based Conversion",
      "Convert Word to PDF Online — Preview Every Page",
    ],
    alternativeDescription:
      "Upload a .docx only when you tick consent, choose page ranges and output options, then review the converted pages. Temporary job files are deleted after.",
    internalLinks: [
      "/tools/pdf-to-word",
      "/tools/merge-pdf",
      "/tools/compress-pdf",
      "/tools/pdf-studio",
      "/guides/barcode",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/pdf-to-word",
    slug: "pdf-to-word",
    title: "PDF to Word — Editable DOCX, Read on Your Device",
    description:
      "Turn a PDF into an editable DOCX with layout or clean-flow modes, page ranges, a side-by-side preview and on-device OCR for scanned pages. Files stay local.",
    h1: "PDF to Word",
    primaryKeyword: "pdf to word",
    secondaryKeywords: [
      "pdf to docx converter",
      "convert pdf to editable word",
      "scanned pdf to word ocr",
      "pdf to word without email",
      "pdf to word on phone",
    ],
    intent: "transactional",
    researchId: "pdf-to-word",
    alternativeTitles: [
      "Convert PDF to Word — Layout or Clean Flow",
      "PDF to DOCX Converter with On-Device OCR",
    ],
    alternativeDescription:
      "Rebuild paragraphs, headings and tables into a Word file, choose how closely to follow the layout, and run OCR on scans without sending the document anywhere.",
    internalLinks: [
      "/tools/word-to-pdf",
      "/tools/image-to-text",
      "/tools/split-pdf",
      "/tools/word-counter",
      "/category/pdf-tools",
    ],
    indexable: true,
  },

  // ────────────────────────────────────────────────────────── Image Tools (4)
  {
    path: "/tools/image-compressor",
    slug: "image-compressor",
    title: "Image Compressor — Shrink JPG, PNG, WebP & AVIF",
    description:
      "Compress up to 20 JPEG, PNG, WebP or AVIF images by quality slider or exact KB/MB target, keep or flatten transparency, and download a ZIP. Runs in the tab.",
    h1: "Image Compressor",
    primaryKeyword: "image compressor",
    secondaryKeywords: [
      "compress image to 100kb",
      "reduce jpg file size",
      "compress image for job application form",
      "webp compressor online",
      "bulk image compression",
    ],
    intent: "transactional",
    researchId: "image-compress",
    alternativeTitles: [
      "Compress Images to an Exact KB Size — No Upload",
      "Bulk Image Compressor — JPG, PNG, WebP, AVIF",
    ],
    alternativeDescription:
      "Pick a quality level or a target size, compare original and compressed bytes per file, and see which files met the target instead of being told all of them did.",
    internalLinks: [
      "/tools/image-resizer",
      "/tools/image-cropper",
      "/tools/image-to-image",
      "/tools/images-to-pdf",
      "/category/image-tools",
    ],
    indexable: true,
    localPhrasing: [
      "compress image to 100kb for exam form",
      "photo size kam kaise kare",
      "signature image compressor",
    ],
  },
  {
    path: "/tools/image-resizer",
    slug: "image-resizer",
    title: "Image Resizer — Pixels, Percent & Social Presets",
    description:
      "Resize JPEG, PNG, WebP or AVIF by exact pixels, percentage or longest side, or use a social preset. Crop, set an output size cap and export a ZIP locally.",
    h1: "Image Resizer",
    primaryKeyword: "image resizer",
    secondaryKeywords: [
      "resize image in pixels",
      "resize photo for passport size",
      "resize image for instagram",
      "resize image without losing quality",
      "bulk image resize online",
    ],
    intent: "transactional",
    researchId: "image-resize",
    alternativeTitles: [
      "Resize Images by Pixels or Percent — Free & Local",
      "Photo Resizer — Presets and Exact Pixel Sizes",
    ],
    alternativeDescription:
      "Enter a width and height, a percentage or a preset, optionally crop to the new ratio, and download the resized files — individually or as one archive.",
    internalLinks: [
      "/tools/image-compressor",
      "/tools/image-cropper",
      "/tools/image-to-image",
      "/tools/images-to-pdf",
      "/category/image-tools",
    ],
    indexable: true,
    localPhrasing: [
      "passport size photo banane wala tool",
      "resize photo in kb and pixels",
    ],
  },
  {
    path: "/tools/image-cropper",
    slug: "image-cropper",
    title: "Image Cropper — Aspect Ratios, Circle & Social",
    description:
      "Crop up to 20 images with a freeform frame, fixed aspect ratios, a circle mask or a social preset. Fifty-step undo, keyboard nudging and ZIP export, all local.",
    h1: "Image Cropper",
    primaryKeyword: "image cropper",
    secondaryKeywords: [
      "crop image online free",
      "circle crop profile picture",
      "crop image to 1:1",
      "crop photo for whatsapp dp",
      "batch crop images",
    ],
    intent: "transactional",
    researchId: "image-crop",
    alternativeTitles: [
      "Crop Images Online — Ratios, Circle Mask, Batch",
      "Free Image Cropper — Undo, Nudge and Export a ZIP",
    ],
    alternativeDescription:
      "Drag a frame or type exact crop numbers, lock a ratio, mask to a circle, and export crops one by one or in a batch — with every step reversible while you work.",
    internalLinks: [
      "/tools/image-resizer",
      "/tools/image-compressor",
      "/tools/image-to-image",
      "/tools/images-to-pdf",
      "/category/image-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/image-to-image",
    slug: "image-to-image",
    title: "Image Converter — JPG, PNG, WebP, AVIF & TIFF",
    description:
      "Convert up to 20 images between JPG, PNG, WebP, AVIF, GIF, BMP and TIFF, with resize, crop, transparency handling and a target KB/MB size. Nothing is uploaded.",
    h1: "Image to Image Converter",
    primaryKeyword: "image converter",
    secondaryKeywords: [
      "jpg to png converter",
      "webp to jpg",
      "png to jpg converter free",
      "heic to jpg in browser",
      "convert images in bulk",
    ],
    intent: "transactional",
    researchId: "image-convert",
    alternativeTitles: [
      "Convert Images Between Formats — Bulk, Locally",
      "JPG, PNG, WebP & AVIF Converter — No Upload",
    ],
    alternativeDescription:
      "Choose an output format per batch, decide what happens to transparency, re-encode from pixels so location metadata is dropped, and export files or a ZIP.",
    internalLinks: [
      "/tools/image-compressor",
      "/tools/image-resizer",
      "/tools/image-cropper",
      "/tools/pdf-to-image",
      "/category/image-tools",
    ],
    indexable: true,
  },

  // ─────────────────────────────────────────────────────── QR & Barcode (9)
  {
    path: "/tools/qr-generator",
    slug: "qr-generator",
    title: "QR Code Generator — Logo, Colors, SVG & Bulk CSV",
    description:
      "Create QR codes for URLs, Wi-Fi, vCard, UPI payments and more. Style colours and a centre logo, verify the scan, then export PNG, SVG or print-ready PDF.",
    h1: "QR Code Generator",
    primaryKeyword: "qr code generator",
    secondaryKeywords: [
      "qr code generator with logo",
      "upi qr code generator",
      "wifi qr code",
      "vcard qr code",
      "qr code generator free no watermark",
      "bulk qr code csv",
    ],
    intent: "transactional",
    researchId: "qr-generator",
    alternativeTitles: [
      "Free QR Code Generator — Logo, UPI & Wi-Fi Codes",
      "Create a QR Code with Logo — PNG, SVG or PDF",
    ],
    alternativeDescription:
      "Pick a QR type, fill the fields, adjust error correction and colours, add a logo without breaking the symbol, and export at print resolution after a scan test.",
    internalLinks: [
      "/tools/qr-code-scanner",
      "/tools/barcode-generator",
      "/tools/batch-studio",
      "/tools/url-encoder-decoder",
      "/category/qr-barcode",
    ],
    indexable: true,
    localPhrasing: [
      "upi qr code banane wala tool",
      "shop payment qr code",
      "qr code generator india",
    ],
  },
  {
    path: "/tools/qr-code-scanner",
    slug: "qr-code-scanner",
    title: "QR Code Scanner — Camera, Screenshot & Batch Scan",
    description:
      "Scan QR codes from a camera, photo, screenshot or a batch of images. Inspect the decoded content and URL safety signals before opening, then export CSV or JSON.",
    h1: "QR Code Scanner",
    primaryKeyword: "qr code scanner",
    secondaryKeywords: [
      "scan qr code from screenshot",
      "qr code reader online",
      "qr scanner without app",
      "scan qr code on laptop webcam",
      "check qr code link safety",
    ],
    intent: "transactional",
    researchId: "qr-scanner",
    alternativeTitles: [
      "QR Code Reader Online — No App Needed",
      "Scan a QR Code from an Image or Your Camera",
    ],
    alternativeDescription:
      "Decode a code you can see: use the camera, drop in a screenshot, or scan a folder of images. The destination is shown as text before anything opens.",
    internalLinks: [
      "/tools/qr-generator",
      "/tools/barcode-scanner",
      "/tools/url-network-privacy",
      "/tools/url-encoder-decoder",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/barcode-generator",
    slug: "barcode-generator",
    title: "Barcode Generator — Code 128, EAN-13 & GS1",
    description:
      "Generate Code 128, EAN-13, UPC, ITF-14 and GS1-128 barcodes with real check-digit validation, then style, print at a true physical size or bulk-export them.",
    h1: "Barcode Generator",
    primaryKeyword: "barcode generator",
    secondaryKeywords: [
      "ean 13 barcode generator",
      "code 128 barcode generator",
      "gs1 128 label generator",
      "barcode generator with check digit",
      "print barcode labels free",
    ],
    intent: "transactional",
    researchId: "barcode-generator",
    alternativeTitles: [
      "Free Barcode Generator — EAN, UPC, Code 128, GS1",
      "Create Barcode Labels — Validate, Style, Print",
    ],
    alternativeDescription:
      "Enter a number or text, let the encoder verify the check digit and guard the quiet zone, then export a proofed symbol at a real print size.",
    internalLinks: [
      "/tools/batch-studio",
      "/tools/barcode-scanner",
      "/tools/gs1-intelligence",
      "/tools/barcode-developer",
      "/guides/barcode",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/barcode-scanner",
    slug: "barcode-scanner",
    title: "Barcode Scanner — EAN, UPC & Code 128 on Device",
    description:
      "Scan EAN-13, UPC-A, UPC-E, Code 128, Code 39 and ITF-14 with your camera or from an image. Copy the value, keep local history, look up a GTIN if you choose.",
    h1: "Barcode Scanner",
    primaryKeyword: "barcode scanner",
    secondaryKeywords: [
      "scan barcode with phone camera",
      "barcode reader online free",
      "scan ean 13 from image",
      "barcode scanner without app",
      "check barcode number",
    ],
    intent: "transactional",
    researchId: "barcode-scanner",
    alternativeTitles: [
      "Online Barcode Reader — Camera or Image",
      "Scan EAN and UPC Codes in the Browser",
    ],
    alternativeDescription:
      "Point the camera or drop in a photo, read the number the symbol carries, and treat it as a number — a barcode proves no batch, date or authenticity by itself.",
    internalLinks: [
      "/tools/barcode-generator",
      "/tools/batch-code-checker",
      "/tools/product-lookup",
      "/tools/gs1-intelligence",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/batch-code-checker",
    slug: "batch-code-checker",
    title: "Batch Code Checker — Lot Codes, Decoded Honestly",
    description:
      "Check a cosmetics lot code against documented decoders and see whether the date is verified, estimated from cited guidance, or not decodable — never invented.",
    h1: "Batch Code Checker",
    primaryKeyword: "batch code checker",
    secondaryKeywords: [
      "cosmetic batch code decoder",
      "check product expiry by batch code",
      "lot code lookup",
      "is my skincare expired batch code",
      "batch code checker india",
    ],
    intent: "transactional",
    researchId: "batch-code",
    alternativeTitles: [
      "Cosmetic Batch Code Decoder — Verified or Not",
      "Decode a Lot Code — With Sources, Not Guesses",
    ],
    alternativeDescription:
      "Enter the code, the brand and the dates on the pack. Results are labelled verified, estimated or not decodable, and the reasoning is shown for each verdict.",
    internalLinks: [
      "/tools/barcode-scanner",
      "/tools/product-lookup",
      "/tools/gs1-intelligence",
      "/guides/barcode",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/gs1-intelligence",
    slug: "gs1-intelligence",
    title: "GS1 Intelligence — Parse AIs and Digital Links",
    description:
      "Parse a GS1 element string, HRI string or Digital Link: every application identifier explained, GS1 dates read as dates, and the GTIN check digit verified.",
    h1: "GS1 Intelligence",
    primaryKeyword: "gs1 intelligence",
    secondaryKeywords: [
      "gs1 128 application identifier list",
      "gs1 element string parser",
      "gtin check digit calculator",
      "gs1 digital link builder",
      "fnc1 explained",
    ],
    intent: "informational",
    researchId: "gs1",
    alternativeTitles: [
      "GS1-128 Parser — Each Identifier Explained",
      "Read a GS1 Element String — Dates & Check Digits",
    ],
    alternativeDescription:
      "Paste an element string and get each AI named with its meaning, length rule and date format, plus a check-digit verdict and a Digital Link you can print.",
    internalLinks: [
      "/tools/barcode-generator",
      "/tools/barcode-scanner",
      "/guides/barcode",
      "/tools/product-lookup",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/product-lookup",
    slug: "product-lookup",
    title: "GTIN Product Lookup — Open Food Facts, Labelled",
    description:
      "Look up a GTIN in Open Food Facts: ingredients, allergens and nutrition as recorded, missing fields shown as missing, ODbL attribution and real error states.",
    h1: "Product Lookup",
    primaryKeyword: "gtin product lookup",
    secondaryKeywords: [
      "barcode number lookup product",
      "open food facts search by barcode",
      "check product ingredients by barcode",
      "ean 13 lookup",
      "barcode product database india",
    ],
    intent: "informational",
    researchId: "product-lookup",
    alternativeTitles: [
      "Barcode Product Lookup — Community Data, Labelled",
      "Check a Barcode Number in Open Food Facts",
    ],
    alternativeDescription:
      "Type the digits under a barcode and read the volunteer-entered record: ingredients, allergens, nutrition. A missing field stays missing; failures are named.",
    internalLinks: [
      "/tools/barcode-scanner",
      "/tools/gs1-intelligence",
      "/tools/batch-code-checker",
      "/guides/barcode",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/batch-studio",
    slug: "batch-studio",
    title: "Batch Barcode Studio — CSV to SVG, PNG & PDF",
    description:
      "Turn a CSV into a ZIP of barcode symbols and a per-row report. A format column mixes symbologies safely; every row is ready, duplicate, skipped or invalid.",
    h1: "Batch Barcode Studio",
    primaryKeyword: "batch barcode studio",
    secondaryKeywords: [
      "csv to barcode labels",
      "batch barcode generator svg",
      "print barcode sheet pdf",
      "bulk qr code from csv",
      "barcode label generator spreadsheet",
    ],
    intent: "transactional",
    researchId: "batch-studio",
    alternativeTitles: [
      "Bulk Barcode Generator — One Label Per CSV Row",
      "Generate Barcode Labels from CSV — With a Report",
    ],
    alternativeDescription:
      "Upload up to 1,000 rows, map the data, label and format columns, and download symbols grouped by symbology plus a CSV naming every row that failed and why.",
    internalLinks: [
      "/tools/barcode-generator",
      "/tools/qr-generator",
      "/tools/barcode-developer",
      "/tools/gs1-intelligence",
      "/guides/barcode",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/tools/barcode-developer",
    slug: "barcode-developer",
    title: "Barcode Developer Tools — Compare, Analyse, Debug",
    description:
      "Compare two barcode values character by character, screen a photo for module width, contrast and quiet-zone faults, and read the lookup endpoint contract.",
    h1: "Barcode Developer Tools",
    primaryKeyword: "barcode developer tools",
    secondaryKeywords: [
      "compare gtin numbers",
      "barcode print quality check",
      "quiet zone too small barcode",
      "barcode will not scan troubleshooting",
      "gs1 check digit mismatch",
    ],
    intent: "informational",
    researchId: "barcode-debug",
    alternativeTitles: [
      "Why Won't This Barcode Scan? Analyse the Symbol",
      "GTIN Comparison & Barcode Fault Finder",
    ],
    alternativeDescription:
      "Two values that look identical often are not. Diff them, measure a photographed symbol, and see the resolutions and quiet-zone faults a printer should fix.",
    internalLinks: [
      "/tools/barcode-generator",
      "/tools/barcode-scanner",
      "/tools/gs1-intelligence",
      "/guides/barcode",
      "/category/qr-barcode",
    ],
    indexable: true,
  },

  // ──────────────────────────────────────────────── Text & Writing (3)
  {
    path: "/tools/word-counter",
    slug: "word-counter",
    title: "Word Counter — Words, Characters & Reading Time",
    description:
      "Count words, characters, sentences and paragraphs as you type, with reading time, speaking time and repeated keywords. Set a word goal; your text stays local.",
    h1: "Word Counter",
    primaryKeyword: "word counter",
    secondaryKeywords: [
      "character counter",
      "count words in essay",
      "reading time calculator",
      "word count for twitter bio",
      "words per page count",
    ],
    intent: "transactional",
    researchId: "word-counter",
    alternativeTitles: [
      "Word Count Tool — Characters and Read Time",
      "Count Words & Characters Online — No Paste Risk",
    ],
    alternativeDescription:
      "Paste a draft and watch the totals update live, including characters with and without spaces. Document limits for essays and social posts become checkable.",
    internalLinks: [
      "/tools/case-converter",
      "/tools/image-to-text",
      "/tools/pdf-to-word",
      "/category/text-writing",
    ],
    indexable: true,
    localPhrasing: ["word count kaise check kare", "essay word limit checker"],
  },
  {
    path: "/tools/case-converter",
    slug: "case-converter",
    title: "Case Converter — camelCase, snake_case & More",
    description:
      "Convert text between ten case styles: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case and kebab-case. Line breaks kept.",
    h1: "Case Converter",
    primaryKeyword: "case converter",
    secondaryKeywords: [
      "uppercase to lowercase converter",
      "title case converter",
      "camelcase converter",
      "sentence case tool",
      "convert text case without retyping",
    ],
    intent: "transactional",
    researchId: "case-converter",
    alternativeTitles: [
      "Change Text Case Online — Ten Styles, One Click",
      "Convert to Title Case, camelCase or snake_case",
    ],
    alternativeDescription:
      "Select all, pick a style, paste it back. Ten conversions cover headings, identifiers and code names, and paragraph breaks survive the change.",
    internalLinks: [
      "/tools/word-counter",
      "/tools/regex-tester",
      "/tools/url-encoder-decoder",
      "/category/text-writing",
    ],
    indexable: true,
  },
  {
    path: "/tools/image-to-text",
    slug: "image-to-text",
    title: "Image to Text (OCR) — Hindi, Gujarati & English",
    description:
      "Run OCR on photos, screenshots and PDFs in 8 languages, including Hindi, Gujarati and Urdu. Local reading, confidence highlighting, export to TXT or DOCX.",
    h1: "Image to Text (OCR)",
    primaryKeyword: "image to text",
    secondaryKeywords: [
      "ocr online free",
      "hindi image to text",
      "screenshot to text",
      "scanned pdf to editable text",
      "handwriting to text ocr",
      "gujarati ocr",
    ],
    intent: "transactional",
    researchId: "ocr",
    alternativeTitles: [
      "Free OCR Online — 8 Languages, Read on Device",
      "Convert a Photo or Scan to Editable Text",
    ],
    alternativeDescription:
      "English, Hindi, Gujarati, Marathi and four more languages are recognised on your own device, with confidence highlighting so a guess is never shown as fact.",
    internalLinks: [
      "/tools/pdf-to-word",
      "/tools/word-counter",
      "/tools/case-converter",
      "/tools/pdf-to-image",
      "/category/text-writing",
    ],
    indexable: true,
    localPhrasing: [
      "hindi photo se text kaise nikale",
      "gujarati ocr online",
      "marathi image to text",
    ],
  },

  // ─────────────────────────────────────────────────── Developer Tools (11)
  {
    path: "/tools/json-formatter",
    slug: "json-formatter",
    title: "JSON Formatter — Beautify, Sort & Minify JSON",
    description:
      "Beautify, minify, sort keys or validate JSON with the exact line and column of the first error. Choose 2-space, 4-space or tab indentation; nothing is uploaded.",
    h1: "JSON Formatter",
    primaryKeyword: "json formatter",
    secondaryKeywords: [
      "json beautifier online",
      // /tools/json-validator owns "json validator" as its primary keyword.
      // This page does validate, but naming the dedicated validator here made
      // two URLs claim one query, so it names the capability instead.
      "check json syntax",
      "minify json",
      "sort json keys",
      "format json without upload",
    ],
    intent: "transactional",
    researchId: "json-formatter",
    alternativeTitles: [
      "Format & Validate JSON Online — Errors by Line",
      "JSON Pretty Print — Indent, Sort and Minify",
    ],
    alternativeDescription:
      "Paste a payload, choose indentation, and read the tree instead of the wall of text. Parsing happens in the tab, so internal responses can be inspected safely.",
    internalLinks: [
      "/tools/json-validator",
      "/tools/xml-formatter",
      "/tools/html-formatter",
      "/tools/base64-encoder-decoder",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/json-validator",
    slug: "json-validator",
    title: "JSON Validator — Find Errors by Line & Column",
    description:
      "Validate JSON and locate the first syntax error by line and column. Inspect root type, key count, nesting depth and UTF-8 size without executing anything.",
    h1: "JSON Validator",
    primaryKeyword: "json validator",
    secondaryKeywords: [
      "check json syntax online",
      "json parse error location",
      "validate json file",
      "json lint online",
      "missing comma json",
    ],
    intent: "transactional",
    researchId: "json-validator",
    alternativeTitles: [
      "JSON Syntax Checker — Exact Error Position",
      "Is This JSON Valid? Check Structure and Size",
    ],
    alternativeDescription:
      "When a build fails on a parse error, paste the payload here: the offset, line and column are named, and a short explanation says what the parser expected.",
    internalLinks: [
      "/tools/json-formatter",
      "/tools/xml-formatter",
      "/tools/regex-tester",
      "/tools/base64-encoder-decoder",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/xml-formatter",
    slug: "xml-formatter",
    title: "XML Formatter — Pretty Print & Minify XML Safely",
    description:
      "Format or minify XML with 2-space, 4-space or tab indentation. DOCTYPE is rejected to avoid entity risks, and mixed text with preserved spaces stays intact.",
    h1: "XML Formatter",
    primaryKeyword: "xml formatter",
    secondaryKeywords: [
      "xml beautifier online",
      "pretty print xml",
      "minify xml",
      "xml validation tool",
      "format xml soap response",
    ],
    intent: "transactional",
    researchId: "xml-formatter",
    alternativeTitles: [
      "XML Beautifier — Indent or Minify, Entity-Safe",
      "Pretty Print XML Online Without Breaking Text",
    ],
    alternativeDescription:
      "Indent a SOAP envelope or config file, or collapse it back to one line. Documents declaring a DOCTYPE are refused on purpose rather than parsed unsafely.",
    internalLinks: [
      "/tools/json-formatter",
      "/tools/html-formatter",
      "/tools/css-minifier",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/html-formatter",
    slug: "html-formatter",
    title: "HTML Formatter — Beautify & Minify HTML Online",
    description:
      "Beautify HTML or minify markup while leaving embedded CSS and JavaScript untouched. Compare UTF-8 byte sizes; embedded scripts are never executed or uploaded.",
    h1: "HTML Formatter",
    primaryKeyword: "html formatter",
    secondaryKeywords: [
      "html beautifier online",
      "minify html",
      "format html code",
      "html pretty print",
      "reduce html file size",
    ],
    intent: "transactional",
    researchId: "html-formatter",
    alternativeTitles: [
      "Beautify HTML — Indent Markup Without Running It",
      "HTML Minifier with Real Byte Counts",
    ],
    alternativeDescription:
      "Clean up an email template or a pasted fragment, or strip whitespace before shipping. Inline style and script blocks are preserved exactly as written.",
    internalLinks: [
      "/tools/css-minifier",
      "/tools/javascript-minifier",
      "/tools/xml-formatter",
      "/tools/json-formatter",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/css-minifier",
    slug: "css-minifier",
    title: "CSS Minifier — Compress CSS & Compare File Size",
    description:
      "Minify CSS with a syntax-aware parser, keep the first licence comment, and compare exact UTF-8 byte counts. The stylesheet is processed in your browser only.",
    h1: "CSS Minifier",
    primaryKeyword: "css minifier",
    secondaryKeywords: [
      "minify css online",
      "css compressor",
      "reduce css file size",
      "css optimizer free",
      "minify css without breaking it",
    ],
    intent: "transactional",
    researchId: "css-minifier",
    alternativeTitles: [
      "Compress CSS Online — Syntax-Aware Minifier",
      "CSS Size Checker — Minify and Compare Bytes",
    ],
    alternativeDescription:
      "Paste a stylesheet, minify it with CSSO, and see the saved bytes and percentage. Structure-sensitive rewrites are skipped so the cascade keeps behaving.",
    internalLinks: [
      "/tools/javascript-minifier",
      "/tools/html-formatter",
      "/tools/xml-formatter",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/javascript-minifier",
    slug: "javascript-minifier",
    title: "JavaScript Minifier — Compress JS Safely",
    description:
      "Minify JavaScript with Terser, compare UTF-8 byte sizes and read syntax errors in plain language. Your code is parsed but never executed or uploaded.",
    h1: "JavaScript Minifier",
    primaryKeyword: "javascript minifier",
    secondaryKeywords: [
      "minify js online",
      "js compressor",
      "reduce javascript size",
      "terser minifier online",
      "uglify javascript alternative",
    ],
    intent: "transactional",
    researchId: "javascript-minifier",
    alternativeTitles: [
      "Minify JavaScript Online — Terser, No Execution",
      "Compress JS and See the Exact Byte Saving",
    ],
    alternativeDescription:
      "Drop in a script, minify it, and check the before and after sizes. A syntax error is reported with its position instead of a mangled output file.",
    internalLinks: [
      "/tools/css-minifier",
      "/tools/html-formatter",
      "/tools/regex-tester",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/base64-encoder-decoder",
    slug: "base64-encoder-decoder",
    title: "Base64 Encoder & Decoder — Text and File Tools",
    description:
      "Encode UTF-8 text or a file up to 10 MB to Base64, or decode Base64 back to text or a downloadable binary. Padding and UTF-8 are validated locally.",
    h1: "Base64 Encoder / Decoder",
    primaryKeyword: "base64 encoder",
    secondaryKeywords: [
      "base64 decode online",
      "base64 to text",
      "encode file to base64",
      "base64 image decoder",
      "base64url converter",
    ],
    intent: "transactional",
    researchId: "base64",
    alternativeTitles: [
      "Base64 Encode or Decode — Files and Unicode Text",
      "Base64 Converter with Strict Padding Checks",
    ],
    alternativeDescription:
      "Unicode text is encoded correctly rather than byte-mangled, padding errors are explained, and decoded binary comes back as a file, not unreadable characters.",
    internalLinks: [
      "/tools/url-encoder-decoder",
      "/tools/hash-generator",
      "/tools/uuid-generator",
      "/tools/advanced-cryptography",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/url-encoder-decoder",
    slug: "url-encoder-decoder",
    title: "URL Encoder & Decoder — Query Components and URLs",
    description:
      "Percent-encode or decode a single query value or a whole URL, with correct handling of Unicode and reserved characters. Input is never fetched or uploaded.",
    h1: "URL Encoder / Decoder",
    primaryKeyword: "url encoder",
    secondaryKeywords: [
      "url decode online",
      "percent encoding converter",
      "encode query string",
      "decode url parameter",
      "urlencode unicode",
    ],
    intent: "transactional",
    researchId: "url-encode",
    alternativeTitles: [
      "URL Encode & Decode — Component or Full URL",
      "Percent-Encoding Tool for Query Strings",
    ],
    alternativeDescription:
      "Encoding a whole URL and encoding one parameter are different jobs. Pick the right mode and copy a string that keeps its reserved characters intact.",
    internalLinks: [
      "/tools/base64-encoder-decoder",
      "/tools/regex-tester",
      "/tools/case-converter",
      "/tools/qr-generator",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/uuid-generator",
    slug: "uuid-generator",
    title: "UUID Generator — Create Secure Bulk UUID v4 IDs",
    description:
      "Generate cryptographically random UUID v4 identifiers in duplicate-checked batches of 1 to 2,000. Copy or download the list; no identifier is ever uploaded.",
    h1: "UUID Generator",
    primaryKeyword: "uuid generator",
    secondaryKeywords: [
      "guid generator",
      "uuid v4 online",
      "generate bulk uuid",
      "random uuid for database",
      "uuid without upload",
    ],
    intent: "transactional",
    researchId: "uuid",
    alternativeTitles: [
      "Generate UUID v4 — Bulk, From a Secure Source",
      "Random UUID Generator for Seeds and Fixtures",
    ],
    alternativeDescription:
      "Choose how many identifiers you need, generate them from the browser's cryptographic random source, and check the batch for duplicates before you paste them in.",
    internalLinks: [
      "/tools/hash-generator",
      "/tools/password-generator",
      "/tools/base64-encoder-decoder",
      "/tools/json-formatter",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/regex-tester",
    slug: "regex-tester",
    title: "Regex Tester — Match, Capture & Replace Text",
    description:
      "Test a regular expression against sample text and read matches, groups and replacements. A worker timeout stops runaway patterns; nothing is uploaded or stored.",
    h1: "Regex Tester",
    primaryKeyword: "regex tester",
    secondaryKeywords: [
      "regex101 alternative",
      "test regular expression online",
      "javascript regex tester",
      "regex replace preview",
      "named capture group tester",
    ],
    intent: "transactional",
    researchId: "regex",
    alternativeTitles: [
      "Test Regex Online — Groups & Replacements",
      "Regex Match Checker with a Runaway Guard",
    ],
    alternativeDescription:
      "Write a pattern, paste a sample, and see each match with its capture groups. A 300 ms worker timeout means a runaway pattern cannot freeze the page.",
    internalLinks: [
      "/tools/word-counter",
      "/tools/case-converter",
      "/tools/json-validator",
      "/tools/javascript-minifier",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/tools/hash-generator",
    slug: "hash-generator",
    title: "Hash Generator — SHA-256, SHA-384, SHA-512 & MD5",
    description:
      "Hash text or a file with MD5, SHA-1, SHA-256, SHA-384 and SHA-512, compare checksums and inspect file signature hints. Digests are computed on your device.",
    h1: "Hash Generator",
    primaryKeyword: "hash generator",
    secondaryKeywords: [
      "sha256 generator online",
      "md5 hash calculator",
      "checksum verifier",
      "hash a file in browser",
      "sha512 online tool",
    ],
    intent: "transactional",
    researchId: "hash",
    alternativeTitles: [
      "SHA-256 & MD5 Hash Calculator — Files and Text",
      "Verify a Checksum Without Uploading the File",
    ],
    alternativeDescription:
      "Drop a download or paste a string and read its digest from several algorithms at once, with a note that MD5 and SHA-1 are legacy checks, not signatures.",
    internalLinks: [
      "/tools/password-generator",
      "/tools/advanced-cryptography",
      "/tools/uuid-generator",
      "/tools/privacy-metadata-manager",
      "/category/security-privacy",
    ],
    indexable: true,
  },

  // ────────────────────────────────────────────────────────── Calculators (12)
  {
    path: "/tools/percentage-calculator",
    slug: "percentage-calculator",
    title: "Percentage Calculator — Change & Reverse Math",
    description:
      "Work out X% of a number, percentage increase or decrease, percentage difference, reverse percentages and chained steps, with the formula shown for each answer.",
    h1: "Percentage Calculator",
    primaryKeyword: "percentage calculator",
    secondaryKeywords: [
      "percentage increase calculator",
      "what is x percent of y",
      "percentage difference calculator",
      "reverse percentage calculator",
      "marks percentage calculator",
    ],
    intent: "transactional",
    researchId: "percentage",
    alternativeTitles: [
      "Percent Calculator — Increase, Decrease, Reverse",
      "Calculate Percentages with the Working Shown",
    ],
    alternativeDescription:
      "Six percentage questions in one place, from a simple share of a number to the pre-increase value. Every mode prints the expression it evaluated.",
    internalLinks: [
      "/tools/discount-calculator",
      "/tools/gst-calculator",
      "/tools/emi-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/bmi-calculator",
    slug: "bmi-calculator",
    title: "BMI Calculator — Metric, Imperial & Weight Range",
    description:
      "Calculate BMI from metric or imperial measurements and see the healthy-weight range for your height. A screening indicator with stated limits, not a diagnosis.",
    h1: "BMI Calculator",
    primaryKeyword: "bmi calculator",
    secondaryKeywords: [
      "bmi chart for adults",
      "bmi calculator in kg and cm",
      "healthy weight range calculator",
      "bmi calculator in feet and inches",
      "what is a normal bmi",
    ],
    intent: "transactional",
    researchId: "bmi",
    alternativeTitles: [
      "Check Your BMI — kg/cm or lb/in, With Ranges",
      "Body Mass Index Calculator and Healthy Range",
    ],
    alternativeDescription:
      "Enter height and weight in either unit system, read the BMI value and the weight range it implies, and see why BMI alone cannot judge an individual's health.",
    internalLinks: [
      "/tools/age-calculator",
      "/tools/unit-converter",
      "/tools/percentage-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/discount-calculator",
    slug: "discount-calculator",
    title: "Discount Calculator — Stacked Deals, Tax & Margin",
    description:
      "Find the sale price and the money saved, stack two or more sequential discounts, add tax back on and compare offers with the effective discount each one gives.",
    h1: "Discount Calculator",
    primaryKeyword: "discount calculator",
    secondaryKeywords: [
      "percent off calculator",
      "sale price calculator",
      "stacked discount calculator",
      "discount and gst calculator",
      "compare two offers",
    ],
    intent: "transactional",
    researchId: "discount",
    alternativeTitles: [
      "Sale Price Calculator — Percent Off and Savings",
      "Stacked Discounts Compared — With Tax Options",
    ],
    alternativeDescription:
      "Two 20% discounts are not 40%. Enter each step, see the real effective discount, and compare a flat amount against a percentage before you decide.",
    internalLinks: [
      "/tools/gst-calculator",
      "/tools/percentage-calculator",
      "/tools/emi-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/gst-calculator",
    slug: "gst-calculator",
    title: "GST Calculator — Add or Remove CGST, SGST & IGST",
    description:
      "Add GST to a base price or extract it from a gross amount, split into CGST and SGST for intra-state supply or IGST across states. Check an invoice line by line.",
    h1: "GST Calculator",
    primaryKeyword: "gst calculator",
    secondaryKeywords: [
      "gst inclusive and exclusive calculator",
      "cgst sgst calculator",
      "igst calculator",
      "reverse gst calculation",
      "gst calculator india",
    ],
    intent: "transactional",
    researchId: "gst",
    alternativeTitles: [
      "GST Calculator India — Inclusive & Exclusive",
      "CGST, SGST and IGST Breakup Calculator",
    ],
    alternativeDescription:
      "Enter an amount, choose a rate and whether GST is included, then read the taxable value, tax split and invoice total. Built for Indian rates and supply types.",
    internalLinks: [
      "/tools/discount-calculator",
      "/tools/percentage-calculator",
      "/tools/emi-calculator",
      "/category/calculators",
    ],
    indexable: true,
    localPhrasing: [
      "gst calculator india",
      "gst kaise nikale",
      "18% gst kitna hoga",
      "cgst sgst calculation",
    ],
  },
  {
    path: "/tools/age-calculator",
    slug: "age-calculator",
    title: "Age Calculator — Exact Years, Months & Days",
    description:
      "Work out an exact age in years, months and days from any two dates, with total days, weeks and hours, and the next birthday counted for the date you choose.",
    h1: "Age Calculator",
    primaryKeyword: "age calculator",
    secondaryKeywords: [
      "how old am i",
      "age calculator by date of birth",
      "age in days calculator",
      "age as on date calculator",
      "birthday countdown",
    ],
    intent: "transactional",
    researchId: "age",
    alternativeTitles: [
      "Calculate Exact Age from Date of Birth",
      "Age in Years, Months, Days and Total Days",
    ],
    alternativeDescription:
      "Enter a date of birth and a reference date to get the age a form expects, plus totals in days and the days remaining until the next birthday.",
    internalLinks: [
      "/tools/date-difference-calculator",
      "/tools/time-converter",
      "/tools/bmi-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/date-difference-calculator",
    slug: "date-difference-calculator",
    title: "Date Difference Calculator — Calendar & Work Days",
    description:
      "Count days between two dates as calendar or business days, or add and subtract days, weeks and months from a date, with the end date included if you want it.",
    h1: "Date Difference Calculator",
    primaryKeyword: "date difference calculator",
    secondaryKeywords: [
      "days between two dates",
      "business days calculator",
      "add days to date",
      "date calculator online",
      "working days excluding weekends",
    ],
    intent: "transactional",
    researchId: "date-difference",
    alternativeTitles: [
      "Days Between Dates — Calendar or Business Days",
      "Add or Subtract Days from a Date",
    ],
    alternativeDescription:
      "Two dates, one count — with an honest choice about whether the last day is included and whether weekends are skipped. Also shifts a date by a duration.",
    internalLinks: [
      "/tools/age-calculator",
      "/tools/time-converter",
      "/tools/percentage-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/emi-calculator",
    slug: "emi-calculator",
    title: "EMI Calculator — Monthly EMI, Interest & Schedule",
    description:
      "Calculate the monthly EMI on a home, car or personal loan, plus total interest, the principal-to-interest split and a month-by-month amortisation schedule.",
    h1: "EMI Calculator",
    primaryKeyword: "emi calculator",
    secondaryKeywords: [
      "home loan emi calculator",
      "car loan emi calculator",
      "personal loan emi india",
      "loan amortization schedule",
      "emi formula in rupees",
    ],
    intent: "transactional",
    researchId: "emi",
    alternativeTitles: [
      "Loan EMI Calculator — Schedule and Total Interest",
      "Home, Car and Personal Loan EMI Calculator",
    ],
    alternativeDescription:
      "Enter amount, rate and tenure to see what you would pay each month, what the loan costs in total, and how much of every early instalment is interest.",
    internalLinks: [
      "/tools/loan-calculator",
      "/tools/percentage-calculator",
      "/tools/gst-calculator",
      "/category/calculators",
    ],
    indexable: true,
    localPhrasing: [
      "home loan emi calculator india",
      "emi kaise nikale",
      "lakh rupees loan emi",
    ],
  },
  {
    path: "/tools/loan-calculator",
    slug: "loan-calculator",
    title: "Loan Calculator — Payments, Scenarios & Schedule",
    description:
      "Compare loan scenarios, model affordability and see a full repayment schedule. Variable-rate steps show how a rate change moves the instalment and interest.",
    h1: "Loan Calculator",
    primaryKeyword: "loan calculator",
    secondaryKeywords: [
      "loan repayment calculator",
      "loan affordability calculator",
      "variable interest rate loan",
      "prepayment effect on loan",
      "loan tenure calculator",
    ],
    intent: "transactional",
    researchId: "loan",
    alternativeTitles: [
      "Repayment Calculator — Scenarios Side by Side",
      "Model a Loan: Rates, Tenure, Affordability",
    ],
    alternativeDescription:
      "Test what a longer tenure does to the monthly payment and the total interest, and what happens when a variable rate steps up part-way through the term.",
    internalLinks: [
      "/tools/emi-calculator",
      "/tools/percentage-calculator",
      "/tools/discount-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/scientific-calculator",
    slug: "scientific-calculator",
    title: "Scientific Calculator — Trig, Logs, Powers & nCr",
    description:
      "Evaluate expressions with trigonometry in degrees or radians, logs, powers, roots, factorials, permutations and combinations, plus constants and memory.",
    h1: "Scientific Calculator",
    primaryKeyword: "scientific calculator",
    secondaryKeywords: [
      "scientific calculator online free",
      "trigonometry calculator degrees",
      "log calculator",
      "permutation combination calculator",
      "calculator with fractions and powers",
    ],
    intent: "transactional",
    researchId: "scientific",
    alternativeTitles: [
      "Online Scientific Calculator — Degrees or Radians",
      "Trig, Log and Power Calculator with Memory",
    ],
    alternativeDescription:
      "Type a full expression instead of tapping one operation at a time, switch between degree and radian input, and keep an intermediate value in memory.",
    internalLinks: [
      "/tools/percentage-calculator",
      "/tools/unit-converter",
      "/tools/temperature-converter",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/unit-converter",
    slug: "unit-converter",
    title: "Unit Converter — Length, Weight, Area & Volume",
    description:
      "Convert length, mass, area, volume, speed, energy, pressure and data units in both directions, with the exact factor used shown for every conversion.",
    h1: "Unit Converter",
    primaryKeyword: "unit converter",
    secondaryKeywords: [
      "length converter",
      "kg to lbs converter",
      "square feet to square metres",
      "data size converter",
      "unit conversion table",
    ],
    intent: "transactional",
    researchId: "unit-converter",
    alternativeTitles: [
      "Convert Units Online — Length, Mass, Area, Data",
      "Unit Conversion Calculator with Exact Factors",
    ],
    alternativeDescription:
      "Pick a quantity, type a value and read the conversion in every listed unit at once, so comparing a recipe, a floor plan or a file size takes one glance.",
    internalLinks: [
      "/tools/temperature-converter",
      "/tools/time-converter",
      "/tools/scientific-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/temperature-converter",
    slug: "temperature-converter",
    title: "Temperature Converter — °C, °F, Kelvin & Rankine",
    description:
      "Convert between Celsius, Fahrenheit, Kelvin and Rankine, with absolute-zero validation so an impossible temperature is refused rather than converted silently.",
    h1: "Temperature Converter",
    primaryKeyword: "temperature converter",
    secondaryKeywords: [
      "celsius to fahrenheit",
      "fahrenheit to celsius formula",
      "kelvin to celsius converter",
      "body temperature conversion",
      "oven temperature conversion",
    ],
    intent: "transactional",
    researchId: "temperature",
    alternativeTitles: [
      "Celsius to Fahrenheit Converter — All Four Scales",
      "Convert °C, °F, K and °R with Validation",
    ],
    alternativeDescription:
      "Type a temperature in any scale and read the other three, plus the formula behind the conversion. Values below absolute zero are rejected with a reason.",
    internalLinks: [
      "/tools/unit-converter",
      "/tools/time-converter",
      "/tools/scientific-calculator",
      "/category/calculators",
    ],
    indexable: true,
  },
  {
    path: "/tools/time-converter",
    slug: "time-converter",
    title: "Time Converter — Durations, Work Hours & Zones",
    description:
      "Convert durations between units, add or subtract them from a real local date and time, total working hours across a break, and translate between time zones.",
    h1: "Time Converter",
    primaryKeyword: "time converter",
    secondaryKeywords: [
      "hours to minutes converter",
      "add time calculator",
      "work hours calculator with break",
      "time zone converter",
      "duration calculator",
    ],
    intent: "transactional",
    researchId: "time-converter",
    alternativeTitles: [
      "Convert and Add Time — Hours, Minutes, Zones",
      "Duration Calculator with Working-Hours Support",
    ],
    alternativeDescription:
      "Turn 145 minutes into hours and minutes, add a duration to a timestamp, or total a shift after subtracting a break — all using the clock on your device.",
    internalLinks: [
      "/tools/date-difference-calculator",
      "/tools/age-calculator",
      "/tools/unit-converter",
      "/category/calculators",
    ],
    indexable: true,
  },

  // ───────────────────────────────────────────────── Security & Privacy (9)
  {
    path: "/tools/password-generator",
    slug: "password-generator",
    title: "Password Generator — Secure Random Passwords",
    description:
      "Generate strong random passwords and passphrases with the platform's secure random source, check entropy and build a password policy document locally.",
    h1: "Ultimate Password Security",
    primaryKeyword: "password generator",
    secondaryKeywords: [
      "strong random password generator",
      "passphrase generator",
      "password strength checker",
      "password policy generator",
      "16 character password",
    ],
    intent: "transactional",
    researchId: "password",
    alternativeTitles: [
      "Create a Strong Password — Local, No Upload",
      "Random Password & Passphrase Generator",
    ],
    alternativeDescription:
      "Set a length and character mix, exclude look-alike characters, and read the strength estimate. Nothing is sent anywhere or kept after you close the tab.",
    internalLinks: [
      "/tools/hash-generator",
      "/tools/advanced-cryptography",
      "/tools/api-credential-tools",
      "/tools/pdf-lock-unlock",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/advanced-cryptography",
    slug: "advanced-cryptography",
    title: "Encrypt Text & Files Online — AES, RSA & JWT",
    description:
      "Encrypt text and files with AES-256-GCM, generate RSA-OAEP and RS256 key pairs, verify HMAC digests and inspect or sign test JWTs with the browser's Web Crypto.",
    h1: "Ultimate Encryption & Cryptography",
    primaryKeyword: "encrypt text & files online",
    secondaryKeywords: [
      "aes 256 encryption online",
      "rsa key pair generator",
      "jwt decoder",
      "hmac generator",
      "encrypt file in browser",
    ],
    intent: "transactional",
    researchId: "crypto-suite",
    alternativeTitles: [
      "AES-GCM File Encryption — Keys Stay on Device",
      "Web Crypto Toolkit — AES, RSA, HMAC, JWT",
    ],
    alternativeDescription:
      "Nine Web Crypto operations in one workspace, from AES-256-GCM with PBKDF2 key derivation to JWK key pairs, without plaintext or keys ever leaving the page.",
    internalLinks: [
      "/tools/password-generator",
      "/tools/hash-generator",
      "/tools/api-credential-tools",
      "/tools/base64-encoder-decoder",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/dns-email-security",
    slug: "dns-email-security",
    title: "SPF, DKIM & DMARC Checker — Email Security",
    description:
      "Review SPF, DKIM and DMARC configuration, read raw email headers and check DNSSEC. DNS queries reach Cloudflare only after consent; local work needs no network.",
    h1: "Ultimate DNS & Email Security",
    primaryKeyword: "spf, dkim & dmarc checker",
    secondaryKeywords: [
      "email header analyzer",
      "dmarc record lookup",
      "dnssec status checker",
      "why is my email going to spam",
      "spf record generator",
    ],
    intent: "informational",
    researchId: "dns-email",
    alternativeTitles: [
      "Check SPF, DKIM and DMARC Records — With Consent",
      "Email Authentication Review — Headers and DNS",
    ],
    alternativeDescription:
      "Find out why a legitimate message is being refused: paste the headers, look up the domain's records with your consent, and read which check actually failed.",
    internalLinks: [
      "/tools/website-security-review",
      "/tools/url-network-privacy",
      "/tools/privacy-policy-workbench",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/website-security-review",
    slug: "website-security-review",
    title: "Security Headers Checker — CSP, HSTS & Cookies",
    description:
      "Review pasted security headers, CSP, HSTS, Referrer-Policy and cookie flags, or inspect a PEM certificate offline. It explains configuration, not live scanning.",
    h1: "Ultimate Website Security Review",
    primaryKeyword: "security headers checker",
    secondaryKeywords: [
      "csp generator",
      "hsts checker",
      "cookie flags secure httponly",
      "x frame options check",
      "permissions policy generator",
    ],
    intent: "informational",
    researchId: "web-security-review",
    alternativeTitles: [
      "Analyse Security Headers and Build a CSP",
      "Cookie, HSTS and Certificate Review — Offline",
    ],
    alternativeDescription:
      "Paste the response headers a browser received and get a plain verdict per directive, plus a CSP and Permissions-Policy you can drop into a config.",
    internalLinks: [
      "/tools/dns-email-security",
      "/tools/url-network-privacy",
      "/tools/privacy-policy-workbench",
      "/tools/barcode-developer",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/privacy-metadata-manager",
    slug: "privacy-metadata-manager",
    title: "Remove EXIF Data — Metadata & Privacy Manager",
    description:
      "Inspect EXIF, GPS, XMP and ICC data in your own files, and review browser privacy settings, permissions and trackers with a checklist you can act on today.",
    h1: "Ultimate Privacy & Metadata Manager",
    primaryKeyword: "remove exif data",
    secondaryKeywords: [
      "photo metadata viewer",
      "strip gps from photo",
      "browser privacy checker",
      "fingerprinting explained",
      "privacy settings checklist",
    ],
    intent: "informational",
    researchId: "metadata-privacy",
    alternativeTitles: [
      "See What Your Photos Reveal — EXIF and GPS",
      "Metadata Viewer and Browser Privacy Checklist",
    ],
    alternativeDescription:
      "Find the location, device and edit history stored inside a photo, then learn which of those fields your exports drop and which browsers still leak.",
    internalLinks: [
      "/tools/image-to-image",
      "/tools/url-network-privacy",
      "/tools/privacy-policy-workbench",
      "/tools/hash-generator",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/url-network-privacy",
    slug: "url-network-privacy",
    // The tool parses a URL's syntax and never requests it (`analyzeUrl` in
    // lib/tools/security/url-review.ts), so redirect hops cannot be observed and
    // nothing is stripped from a link. Both claims were removed from the title,
    // description and keywords; `auditKeywordClusters` found the secondaries but
    // could not see the rendered title, which is what a searcher actually reads.
    title: "URL Privacy Checker — Inspect a Link & Your IP",
    description:
      "Break a link into parts, flag tracking tags and deceptive userinfo without opening it, and review browser privacy signals. IP lookup asks consent.",
    h1: "Ultimate URL, IP & Browser Privacy",
    primaryKeyword: "url privacy checker",
    secondaryKeywords: [
      "what does this url contain",
      "url inspector",
      "what is my public ip",
      "browser privacy check",
    ],
    intent: "informational",
    researchId: "url-privacy",
    alternativeTitles: [
      "Inspect a Link Before You Click It",
      "URL Parts, Tracking Tags and IP Exposure",
    ],
    alternativeDescription:
      "Paste a suspicious link and read its host, path and tracking tags without visiting it, then review the permissions and fingerprinting surface you are exposing.",
    internalLinks: [
      "/tools/qr-code-scanner",
      "/tools/website-security-review",
      "/tools/privacy-metadata-manager",
      "/tools/url-encoder-decoder",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/privacy-policy-workbench",
    slug: "privacy-policy-workbench",
    title: "Privacy Policy Generator — Drafts for Review",
    description:
      "Draft a privacy policy, cookie policy, consent notice, retention schedule and GDPR checklist from your actual data practices, ready for qualified legal review.",
    h1: "Privacy Policy & Compliance Workbench",
    primaryKeyword: "privacy policy generator",
    secondaryKeywords: [
      "cookie policy template",
      "gdpr checklist",
      "data retention policy template",
      "consent notice generator",
      "data processing agreement template",
    ],
    intent: "transactional",
    researchId: "privacy-policy",
    alternativeTitles: [
      "Generate a Privacy and Cookie Policy Draft",
      "GDPR and Retention Checklists — Then Get Review",
    ],
    alternativeDescription:
      "Answer questions about what you collect and why, and get a structured draft with the gaps flagged. It is a starting document, explicitly not legal advice.",
    internalLinks: [
      "/tools/privacy-metadata-manager",
      "/tools/website-security-review",
      "/tools/dns-email-security",
      "/privacy",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/tools/api-credential-tools",
    slug: "api-credential-tools",
    title: "API Key Validator — Token & Header Review",
    description:
      "Check an API key's shape against documented formats, format a bearer token, and review pasted request headers for missing authentication or secret leakage.",
    h1: "API Credential & Request Review",
    primaryKeyword: "api key validator",
    secondaryKeywords: [
      "bearer token formatter",
      "api request header analyzer",
      "is my api key exposed",
      "jwt vs api key",
      "check authorization header",
    ],
    intent: "informational",
    researchId: "api-credentials",
    alternativeTitles: [
      "Check an API Key Format — Identify the Provider",
      "Request Header Review Before You Debug Further",
    ],
    alternativeDescription:
      "Paste a key or a set of headers and learn which provider the pattern matches, what is missing, and why a credential pasted into chat should be rotated.",
    internalLinks: [
      "/tools/advanced-cryptography",
      "/tools/website-security-review",
      "/tools/password-generator",
      "/tools/json-formatter",
      "/category/security-privacy",
    ],
    indexable: true,
  },
];

/**
 * The launched HR / SEO / Career tools declare their own search metadata in
 * `lib/tools/launch/registry.ts`, next to the H1, the FAQs and the reference
 * section they ship with. Keeping a second hand-copied record here would give
 * the title and the H1 two places to drift apart, which is the exact failure
 * `audit.ts` exists to catch — so those records are derived instead.
 *
 * Everything checked by the audit still applies to them: unique title inside the
 * SERP budget, description inside the snippet budget, one record per route, a
 * researchId, two alternative titles, an alternative description and at least
 * three internal-link targets.
 */
const LAUNCHED_TOOL_RECORDS: ToolSeoRecord[] = launchTools.map((tool) => ({
  path: `/tools/${tool.slug}`,
  slug: tool.slug,
  title: tool.seoTitle,
  description: tool.seoDescription,
  h1: tool.h1,
  primaryKeyword: tool.primaryKeyword,
  secondaryKeywords: tool.secondaryKeywords,
  intent: "transactional",
  researchId: tool.researchId,
  alternativeTitles: tool.alternativeTitles,
  alternativeDescription: tool.alternativeDescription,
  internalLinks: [
    ...new Set([
      ...tool.internalLinks,
      ...launchCategories
        .filter((category) => category.name === tool.categoryName)
        .map((category) => `/category/${category.slug}`),
    ]),
  ],
  indexable: tool.status === "live",
}));

export const ALL_TOOL_SEO_RECORDS: ToolSeoRecord[] = [
  ...TOOL_SEO_RECORDS,
  ...LAUNCHED_TOOL_RECORDS,
];
