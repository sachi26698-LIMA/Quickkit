import {
  securityGroups,
  securityGroupKeywords,
} from "@/lib/tools/security/consolidation";
import { CATEGORY_SEO_RECORDS } from "@/lib/seo/categories";

/**
 * The shipped category title/description.
 *
 * `categoryMeta` below is the visual catalogue (name, slug, tint, icon) and the
 * place where an administrator's override lands. The researched search copy
 * lives in `lib/seo/categories.ts`; this helper reads it so there is exactly one
 * authored source. Falling back to the category name keeps the type total.
 */
function shippedCategoryCopy(slug: string): {
  title: string;
  description: string;
} {
  const record = CATEGORY_SEO_RECORDS.find((item) => item.slug === slug);
  return {
    title: record?.title ?? slug,
    description: record?.description ?? "",
  };
}

export const toolCategories = [
  "PDF Tools",
  "Image Tools",
  "QR & Barcode",
  "Text & Writing",
  "Developer Tools",
  "Calculators",
  "Security & Privacy",
  "HR & Payroll",
  "SEO & Website Growth",
  "Career & Jobs",
  "AI Tools",
] as const;
export type ToolCategory = string;
export const categories = ["All tools", ...toolCategories] as const;
export type Category = string;

export type CategoryMeta = {
  name: ToolCategory;
  slug: string;
  seoTitle: string;
  blurb: string;
  description: string;
  tint: string;
  icon:
    | "pdf"
    | "image"
    | "qr"
    | "text"
    | "code"
    | "calc"
    | "shield"
    | "people"
    | "chart"
    | "briefcase"
    | "sparkles";
};

export const categoryMeta: CategoryMeta[] = [
  {
    name: "PDF Tools",
    slug: "pdf-tools",
    seoTitle: shippedCategoryCopy("pdf-tools").title,
    blurb: "Merge, split, convert, lock and manage PDF files.",
    description: shippedCategoryCopy("pdf-tools").description,
    tint: "tint-pdf",
    icon: "pdf",
  },
  {
    name: "Image Tools",
    slug: "image-tools",
    seoTitle: shippedCategoryCopy("image-tools").title,
    blurb: "Edit, convert, compress and optimize images.",
    description: shippedCategoryCopy("image-tools").description,
    tint: "tint-image",
    icon: "image",
  },
  {
    name: "QR & Barcode",
    slug: "qr-barcode",
    seoTitle: shippedCategoryCopy("qr-barcode").title,
    blurb: "Create and scan QR codes and barcodes.",
    description: shippedCategoryCopy("qr-barcode").description,
    tint: "tint-qr",
    icon: "qr",
  },
  {
    name: "Text & Writing",
    slug: "text-writing",
    seoTitle: shippedCategoryCopy("text-writing").title,
    blurb: "Format, analyze and transform text easily.",
    description: shippedCategoryCopy("text-writing").description,
    tint: "tint-text",
    icon: "text",
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    seoTitle: shippedCategoryCopy("developer-tools").title,
    blurb: "Encode, decode, format and work with dev utilities.",
    description: shippedCategoryCopy("developer-tools").description,
    tint: "tint-dev",
    icon: "code",
  },
  {
    name: "Calculators",
    slug: "calculators",
    seoTitle: shippedCategoryCopy("calculators").title,
    blurb: "Simple and advanced calculations for everyday use.",
    description: shippedCategoryCopy("calculators").description,
    tint: "tint-calc",
    icon: "calc",
  },
  {
    name: "Security & Privacy",
    slug: "security-privacy",
    seoTitle: shippedCategoryCopy("security-privacy").title,
    blurb: "Generate, check and manage your data securely.",
    description: shippedCategoryCopy("security-privacy").description,
    tint: "tint-security",
    icon: "shield",
  },
  {
    name: "HR & Payroll",
    slug: "hr-payroll",
    seoTitle: shippedCategoryCopy("hr-payroll").title,
    blurb:
      "Salaries, statutory deductions and the HR letters that document them.",
    description: shippedCategoryCopy("hr-payroll").description,
    tint: "tint-hr",
    icon: "people",
  },
  {
    name: "SEO & Website Growth",
    slug: "seo-growth",
    seoTitle: shippedCategoryCopy("seo-growth").title,
    blurb: "Measure what a browser can honestly measure about a page.",
    description: shippedCategoryCopy("seo-growth").description,
    tint: "tint-seo",
    icon: "chart",
  },
  {
    name: "Career & Jobs",
    slug: "career-jobs",
    seoTitle: shippedCategoryCopy("career-jobs").title,
    blurb: "Résumé checks, offer maths and the letters to send next.",
    description: shippedCategoryCopy("career-jobs").description,
    tint: "tint-career",
    icon: "briefcase",
  },
  {
    name: "AI Tools",
    slug: "ai-tools",
    seoTitle: shippedCategoryCopy("ai-tools").title,
    blurb: "Smart tools powered by artificial intelligence.",
    description: shippedCategoryCopy("ai-tools").description,
    tint: "tint-ai",
    icon: "sparkles",
  },
];

export const metaByCategory = (name: ToolCategory): CategoryMeta =>
  categoryMeta.find((c) => c.name === name)!;
export const metaBySlug = (slug: string): CategoryMeta | undefined =>
  categoryMeta.find((c) => c.slug === slug);

export const tools = [
  {
    slug: "word-counter",
    name: "Word Counter",
    category: "Text & Writing",
    description:
      "Make every word count. Check words, characters, and reading time as you type.",
    keywords: "writing sentences paragraphs length",
    icon: "text",
    color: "purple",
    phase: 2,
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    category: "Text & Writing",
    description:
      "From ALL CAPS to just right. Change your text case in a couple of clicks.",
    keywords: "uppercase lowercase title sentence writing",
    icon: "case",
    color: "purple",
    phase: 2,
  },
  {
    slug: "image-to-text",
    name: "Image to Text (OCR)",
    category: "Text & Writing",
    description:
      "Turn photos, screenshots, receipts and scanned PDFs into editable text — English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu, read on your device.",
    keywords:
      "ocr image to text text from image extract text scan scanned document photo screenshot receipt invoice handwriting handwritten notes table extraction columns structured data key value form copy paste editable english hindi gujarati marathi bengali tamil telugu urdu devanagari multi language detect language confidence batch rotate crop deskew enhance privacy offline local",
    icon: "ocr",
    color: "rose",
    phase: 7,
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    category: "Developer Tools",
    description:
      "Beautify, validate or minify JSON with exact syntax locations, a collapsible tree and safe, local processing.",
    keywords:
      "code pretty print validator beautify minify syntax highlight tree developer",
    icon: "code",
    color: "blue",
    phase: 2,
  },
  {
    slug: "json-validator",
    name: "JSON Validator",
    category: "Developer Tools",
    description:
      "Check JSON syntax, pinpoint missing commas or brackets and read a clear explanation of errors — without running code.",
    keywords:
      "json parse validate syntax error location line column malformed brackets commas developer",
    icon: "code",
    color: "cyan",
    phase: 20,
  },
  {
    slug: "html-formatter",
    name: "HTML Formatter",
    category: "Developer Tools",
    description:
      "Beautify and minify HTML with safe syntax highlighting, useful size stats and local copy or download.",
    keywords:
      "markup html beautifier pretty print minifier code formatting developer",
    icon: "code",
    color: "peach",
    phase: 20,
  },
  {
    slug: "css-minifier",
    name: "CSS Minifier",
    category: "Developer Tools",
    description:
      "Compress CSS with a syntax-aware parser and compare original, compressed and saved byte counts.",
    keywords:
      "stylesheet style css compress optimize optimizer comments whitespace size percentage developer",
    icon: "code",
    color: "mint",
    phase: 20,
  },
  {
    slug: "javascript-minifier",
    name: "JavaScript Minifier",
    category: "Developer Tools",
    description:
      "Safely compress JavaScript with a real parser, compare file sizes and see readable syntax errors. Your code is never executed.",
    keywords:
      "javascript js minify compress terser optimize code safely no execution developer",
    icon: "code",
    color: "gold",
    phase: 20,
  },
  {
    slug: "base64-encoder-decoder",
    name: "Base64 Encoder / Decoder",
    category: "Developer Tools",
    categories: ["Developer Tools"],
    description:
      "Encode Unicode text or local files to Base64, or decode Base64 back to UTF-8 text or a downloadable binary file.",
    keywords: "base64 encode decode binary file utf-8 unicode text developer",
    icon: "code",
    color: "plum",
    phase: 20,
  },
  {
    slug: "url-encoder-decoder",
    name: "URL Encoder / Decoder",
    category: "Developer Tools",
    description:
      "Encode and decode complete URLs or individual query components, including Unicode and reserved characters.",
    keywords:
      "url uri percent encode decode query parameter component urlencoding developer",
    icon: "code",
    color: "teal",
    phase: 20,
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    category: "Developer Tools",
    description:
      "Generate secure UUID v4 values in unique bulk batches, ready to copy or download.",
    keywords: "guid identifier unique id uuid v4 random bulk batch developer",
    icon: "code",
    color: "rose",
    phase: 20,
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    category: "Developer Tools",
    description:
      "Test regular expressions live in a time-limited local worker with flags, highlighted matches, capture groups and replacement previews.",
    keywords:
      "regular expression regexp pattern flags match capture groups replacement tester developer",
    icon: "code",
    color: "violet",
    phase: 20,
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    category: "Developer Tools",
    categories: ["Developer Tools", "Security & Privacy"],
    description:
      "Hash text and files, verify batch checksums, compare digests and inspect file signature hints locally.",
    keywords:
      "checksum digest md5 sha1 sha-1 sha256 sha-256 sha384 sha-384 sha512 sha-512 hash file developer " +
      securityGroupKeywords("hash-generator"),
    icon: "code",
    color: "emerald",
    phase: 20,
  },
  {
    slug: "xml-formatter",
    name: "XML Formatter",
    category: "Developer Tools",
    description:
      "Format or compact well-formed XML with safe syntax highlighting, local processing and secure DTD rejection.",
    keywords: "xml beautifier minifier format pretty print markup developer",
    icon: "code",
    color: "azure",
    phase: 20,
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    category: "Security & Privacy",
    description:
      "Generate passwords and passphrases, check strength and entropy, and build a password policy locally.",
    keywords:
      "secure random crypto credentials " +
      securityGroupKeywords("password-generator"),
    icon: "key",
    color: "purple",
    phase: 2,
  },
  {
    slug: "qr-generator",
    name: "QR Code Generator",
    category: "QR & Barcode",
    description:
      "Make a QR code for a link, Wi-Fi, a contact or an event — styled, logo-ready and checked by a real decoder before you download.",
    keywords:
      "url link text wifi vcard contact email phone sms whatsapp location map calendar event ical social app store logo design template bulk csv zip png svg pdf scan qrcode offline free",
    icon: "qr",
    color: "mint",
    phase: 2,
  },
  {
    slug: "qr-code-scanner",
    name: "QR Code Scanner",
    category: "QR & Barcode",
    description:
      "Scan QR codes with your camera, an uploaded image or a whole folder of screenshots — decode every code in a picture, identify its content type and inspect the destination before you open it.",
    keywords:
      "scan scanner reader decode camera webcam upload image screenshot batch multiple codes wifi vcard contact url link payment upi crypto security phishing inspect history export csv json txt offline free qrcode",
    icon: "scan",
    color: "blue",
    phase: 14,
  },
  {
    slug: "barcode-generator",
    name: "Barcode Generator",
    category: "QR & Barcode",
    description:
      "Create Code 128, EAN, UPC, ITF-14 and GS1-128 barcodes with real check-digit validation, then style, print or bulk-export them — and scan barcodes back from a camera or an image.",
    keywords:
      "barcode generator maker create code 128 code128 code 39 code39 ean 13 ean13 ean 8 ean8 upc-a upca upc-e upce itf-14 itf14 gtin sscc gs1-128 application identifier codabar msi pharmacode label printing printer pdf svg png bulk csv zip reader scanner camera image quiet zone check digit offline free",
    icon: "barcode",
    color: "red",
    phase: 15,
  },
  {
    slug: "batch-code-checker",
    name: "Batch Code Checker",
    category: "QR & Barcode",
    description:
      "Check a cosmetics batch or lot code against documented decoders: a GS1 element string or a date inside the code, with printed dates and PAO kept separate and no invented expiry dates.",
    keywords:
      "batch code checker lot number check cosmetics skincare expiry manufacture date decoder gs1 application identifier production date expiration date pao period after opening open jar symbol shelf life brand directory verified estimated not decodable offline free",
    icon: "calc",
    color: "amber",
    phase: 16,
  },
  {
    slug: "barcode-scanner",
    name: "Barcode Scanner",
    category: "QR & Barcode",
    description:
      "Scan EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF-14 and Codabar from a camera or an image on your device, copy values, keep local history and optionally look up a GTIN.",
    keywords:
      "barcode scanner scan reader decode camera webcam upload image ean 13 ean13 ean 8 upc-a upca upc-e upce code 128 code128 code 39 code39 itf-14 codabar gtin product lookup history copy offline free",
    icon: "barcode",
    color: "cyan",
    phase: 16,
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    category: "Image Tools",
    description:
      "Less file size, more possibilities. Compress to a quality level or an exact KB target, in batches.",
    keywords:
      "photo picture jpeg jpg webp png avif compress optimise optimize quality size kb mb batch zip transparency",
    icon: "image",
    color: "peach",
    phase: 3,
  },
  {
    slug: "image-resizer",
    name: "Image Resizer",
    category: "Image Tools",
    description:
      "Make every image fit. Resize by pixels or percentage, crop to social presets and export in batches.",
    keywords:
      "resize dimensions scale aspect ratio percentage instagram story facebook post linkedin banner youtube thumbnail webp jpeg png batch zip banner",
    icon: "resize",
    color: "sky",
    phase: 3,
  },
  {
    slug: "image-cropper",
    name: "Image Cropper",
    category: "Image Tools",
    description:
      "Frame it your way. Crop to any ratio, social preset, circle or square, and export exactly the pixels you need.",
    keywords:
      "crop cut trim frame aspect ratio instagram instagram story youtube thumbnail facebook post square circle round avatar rotate flip zoom pan batch zip exif transparent",
    icon: "crop",
    color: "mint",
    phase: 3,
  },
  {
    slug: "image-to-image",
    name: "Image to Image Converter",
    category: "Image Tools",
    description:
      "Convert JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF in batch, with quality-first compression, target file sizes, resizing and a real before/after preview.",
    keywords:
      "convert conversion format jpg jpeg png webp avif gif bmp tiff heic heif batch zip quality target kb mb lossless lossy transparency background resize aspect ratio crop rotate flip straighten exif orientation metadata prefix suffix",
    icon: "convert",
    color: "blue",
    phase: 3,
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF Converter",
    category: "PDF Tools",
    description:
      "Turn your pictures into one PDF, one image per page. Drag to order pages, rotate them, pick A4, A3, A5, Letter or a custom size, set margins and fit, and download a real PDF.",
    keywords:
      "images to pdf pictures photos to pdf jpg png webp to pdf create build make pdf page order drag drop reorder rotate remove a4 a3 a5 letter custom size portrait landscape margin contain cover fill background quality dpi title filename preview page count",
    icon: "imagesToPdf",
    color: "purple",
    phase: 3,
  },
  {
    slug: "pdf-to-image",
    name: "PDF to Image Converter",
    category: "PDF Tools",
    description:
      "Export PDF pages as JPG, PNG or WEBP images. Choose every page or a custom range, set the resolution up to 300 DPI, preview the real rendered pages, and download single pages or one ZIP.",
    keywords:
      "pdf to image pdf to jpg pdf to png pdf to webp convert pdf pages export render extract pages as pictures screenshots dpi resolution quality page range background thumbnail preview zip download batch",
    icon: "pdfToImage",
    color: "blue",
    phase: 3,
  },
  {
    slug: "pdf-studio",
    name: "PDF Studio",
    category: "PDF Tools",
    description:
      "Merge PDFs, extract or split page ranges, delete, rotate and reorder individual pages, and compress the result — with live thumbnails and page counts, all processed on your device.",
    keywords:
      "pdf studio merge combine join pdf split extract pages delete remove rotate reorder drag drop page order compress shrink organize arrange thumbnails page count batch multiple pdfs",
    icon: "pdfStudio",
    color: "purple",
    phase: 3,
  },
  {
    slug: "merge-pdf",
    name: "PDF Merger",
    category: "PDF Tools",
    description:
      "Many PDFs, one tidy document. Arrange files, choose pages, and merge locally with no upload.",
    keywords: "pdf merge combine join pages bookmarks password documents",
    icon: "pdf",
    color: "purple",
    phase: 5,
  },
  {
    slug: "split-pdf",
    name: "PDF Splitter",
    category: "PDF Tools",
    description:
      "One PDF, the right pieces. Split ranges, extract pages, and download named PDFs or a ZIP locally.",
    keywords: "pdf split extract separate ranges pages zip documents password",
    icon: "pdfSplit",
    color: "mint",
    phase: 5,
  },
  {
    slug: "compress-pdf",
    name: "PDF Compressor",
    category: "PDF Tools",
    description:
      "Smaller PDFs, same pages. Batch-compress locally with quality presets, target size and exact savings.",
    keywords:
      "pdf compress reduce shrink target size optimize file size batch zip scanned image documents password",
    icon: "pdfCompress",
    color: "peach",
    phase: 5,
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF Converter",
    category: "PDF Tools",
    description:
      "Convert DOCX documents on this server after explicit consent, with real page previews and per-page editing. Uses the bundled renderer or a native LibreOffice engine; nothing is converted in your browser.",
    keywords: "word docx pdf office document batch convert",
    icon: "word",
    color: "purple",
    phase: 6,
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    category: "PDF Tools",
    description:
      "Turn PDFs into editable Word documents. Headings, lists, tables and images carried over — converted on your device.",
    keywords: "pdf word docx convert office edit document",
    icon: "word",
    color: "blue",
    phase: 6,
  },
  {
    slug: "pdf-lock-unlock",
    name: "PDF Lock & Unlock",
    category: "PDF Tools",
    description:
      "Protect PDFs with AES-256 encryption, open and permissions passwords, and reader permission controls — or unlock them with the correct existing password. Batch processing and verified ZIP downloads, all on your device.",
    keywords:
      "pdf lock unlock password protect encrypt decrypt permissions aes aes-256 aes-128 security batch zip open password owner password restrict printing copying editing",
    icon: "pdfLock",
    color: "purple",
    phase: 10,
  },
  {
    slug: "percentage-calculator",
    name: "Percentage Calculator",
    category: "Calculators",
    description: "Calculate percentages, changes and reverse percentages.",
    keywords: "percent change difference",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "bmi-calculator",
    name: "BMI Calculator",
    category: "Calculators",
    description: "Estimate BMI and a healthy-weight range.",
    keywords: "health height weight",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "discount-calculator",
    name: "Discount Calculator",
    category: "Calculators",
    description: "Calculate discounts, savings and tax.",
    keywords: "sale price savings",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "gst-calculator",
    name: "GST Calculator",
    category: "Calculators",
    description: "Add or remove GST and see the tax breakdown.",
    keywords: "india tax cgst sgst igst",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "age-calculator",
    name: "Age Calculator",
    category: "Calculators",
    description:
      "Calculate exact age on any date and count down to a birthday.",
    keywords: "age calculator",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "date-difference-calculator",
    name: "Date Difference Calculator",
    category: "Calculators",
    description:
      "Find calendar and business-day differences or add and subtract days.",
    keywords: "date difference calculator",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "emi-calculator",
    name: "EMI Calculator",
    category: "Calculators",
    description:
      "Estimate monthly installments and see a complete repayment schedule.",
    keywords: "emi calculator",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "loan-calculator",
    name: "Loan Calculator",
    category: "Calculators",
    description:
      "Estimate loan payments, compare scenarios and review amortization.",
    keywords: "loan calculator",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "scientific-calculator",
    name: "Scientific Calculator",
    category: "Calculators",
    description:
      "Evaluate scientific expressions with trigonometry, powers, constants and memory.",
    keywords: "scientific calculator",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "unit-converter",
    name: "Unit Converter",
    category: "Calculators",
    description: "Convert common units of length, mass, energy, data and more.",
    keywords: "unit converter",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "temperature-converter",
    name: "Temperature Converter",
    category: "Calculators",
    description:
      "Convert Celsius, Fahrenheit and Kelvin with absolute-zero validation.",
    keywords: "temperature converter",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  {
    slug: "time-converter",
    name: "Time Converter",
    category: "Calculators",
    description:
      "Convert durations and add or subtract them from a local date and time.",
    keywords: "time converter",
    icon: "calc",
    color: "purple",
    phase: 9,
  },
  ...securityGroups
    .filter(
      (item) =>
        item.slug !== "password-generator" && item.slug !== "hash-generator",
    )
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.description,
      category: "Security & Privacy" as const,
      keywords:
        "privacy security " +
        item.name.toLowerCase() +
        " " +
        securityGroupKeywords(item.slug),
      icon: "key" as const,
      color: "purple" as const,
      phase: 30,
    })),
  {
    slug: "gs1-intelligence",
    name: "GS1 Intelligence",
    category: "QR & Barcode",
    description:
      "Parse a GS1 element string, HRI string or Digital Link: every application identifier explained, GS1 dates interpreted, GTIN check digit verified and a Digital Link built with its QR preview.",
    keywords:
      "gs1 intelligence parser application identifier ai element string fnc1 gs hri human readable interpretation gtin sscc itip production date expiry best before digital link uri builder qr preview check digit verify batch serial lot offline free",
    icon: "barcode",
    color: "violet",
    phase: 19,
  },
  {
    slug: "product-lookup",
    name: "Product Lookup",
    category: "QR & Barcode",
    description:
      "Look up a GTIN in Open Food Facts: ingredients, allergens and nutrition exactly as recorded, missing fields listed as missing, ODbL attribution and not-found, rate-limit and outage reported separately.",
    keywords:
      "gtin product lookup barcode number open food facts ingredients allergens nutrition calories database odbl community record not found rate limit attribution export csv json offline free",
    icon: "scan",
    color: "sky",
    phase: 19,
  },
  {
    slug: "batch-studio",
    name: "Batch Barcode Studio",
    category: "QR & Barcode",
    description:
      "Turn a CSV into a ZIP of barcode symbols with every row reported as ready, duplicate, skipped or invalid, plus a report CSV and an on-screen table that never drops a row.",
    keywords:
      "batch barcode studio csv bulk labels zip svg png export report row status duplicate invalid print sheet product numbers offline free",
    icon: "qr",
    color: "peach",
    phase: 19,
  },
  {
    slug: "barcode-developer",
    name: "Barcode Developer Tools",
    category: "QR & Barcode",
    description:
      "Compare two barcode values character by character, screen a photographed symbol for resolution, contrast, quiet-zone and cropping faults, and read the product lookup endpoint contract.",
    keywords:
      "barcode developer tools compare values diff gtin check digit image analyser module width contrast quiet zone cropping debug api endpoint status codes iso 15416 disclaimer offline free",
    icon: "code",
    color: "blue",
    phase: 19,
  },
  {
    slug: "salary-calculator-india",
    name: "Salary Calculator (India)",
    category: "HR & Payroll",
    description:
      "Turn an annual CTC into a monthly take-home, with employer PF, the gratuity provision, employee PF, ESI, professional tax and income tax shown line by line.",
    keywords:
      "salary calculator india ctc to take home in hand monthly salary pf esi professional tax income tax new regime old regime 12 lakh",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "in-hand-salary-calculator",
    name: "In-Hand Salary Calculator",
    category: "HR & Payroll",
    description:
      "Start from the monthly take-home you need and work backwards to the CTC that delivers it, solving through the tax slabs and the PF ceiling rather than inverting a formula.",
    keywords:
      "in hand salary calculator reverse ctc from take home net to gross salary target monthly in hand negotiate offer",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "income-tax-calculator",
    name: "Income Tax Calculator",
    category: "HR & Payroll",
    description:
      "Salary income tax under both regimes, with the slab bands, the section 87A rebate and cess itemised so you can see which band each rupee fell into.",
    keywords:
      "income tax calculator india new regime old regime 87a rebate standard deduction slabs salaried fy 2025-26 cess",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "pf-calculator",
    name: "PF Calculator",
    category: "HR & Payroll",
    description:
      "Employee and employer provident-fund contributions on the ₹15,000 statutory ceiling or on full basic, with the annual and monthly split and what the employer share covers.",
    keywords:
      "pf calculator epf employee provident fund 12% contribution 15000 wage ceiling employer share pension epf eps monthly annual",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "esi-calculator",
    name: "ESI Calculator",
    category: "HR & Payroll",
    description:
      "Employee and employer ESI contributions at 0.75% and 3.25%, showing clearly that the scheme applies only while monthly gross is at or below the ₹21,000 ceiling.",
    keywords:
      "esi calculator esic employee state insurance 0.75 3.25 wage ceiling 21000 monthly gross eligibility contribution",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "gratuity-calculator",
    name: "Gratuity Calculator",
    category: "HR & Payroll",
    description:
      "Gratuity under the Payment of Gratuity Act: 15/26 of last drawn basic plus DA for each completed year, with the six-month rounding rule and the ₹20 lakh ceiling applied.",
    keywords:
      "gratuity calculator payment of gratuity act 15/26 last drawn basic da five years completed years ceiling 20 lakh resignation retirement",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "full-and-final-settlement",
    name: "Full and Final Settlement",
    category: "HR & Payroll",
    description:
      "Everything owed on the last working day — prorated salary, leave encashment, gratuity and bonus — minus notice recovery, with each line itemised.",
    keywords:
      "full and final settlement calculator fnf settlement leaving job salary prorated leave encashment gratuity notice recovery exit dues",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "leave-encashment-calculator",
    name: "Leave Encashment Calculator",
    category: "HR & Payroll",
    description:
      "Leave balance under monthly or annual accrual, the carry-forward cap and what lapses, plus the encashment value at the basic plus DA day rate.",
    keywords:
      "leave encashment calculator earned leave balance accrual carry forward cap lapse encashment value basic da day rate annual leave",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "attendance-calculator",
    name: "Attendance Calculator",
    category: "HR & Payroll",
    description:
      "Attendance percentage, present-only percentage, payable days and the loss-of-pay deduction, keeping the two percentages that payroll must not confuse apart.",
    keywords:
      "attendance percentage calculator working days present absent paid leave half day loss of pay lop salary deduction hr",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "overtime-calculator",
    name: "Overtime Calculator",
    category: "HR & Payroll",
    description:
      "Overtime pay on the ordinary hourly rate with the multiplier as an explicit choice, because the statutory position is twice the ordinary rate under the Factories Act, not one and a half.",
    keywords:
      "overtime calculator india factories act double rate ordinary hourly wage multiplier 2x code on wages 48 hour week overtime pay",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "shift-hours-calculator",
    name: "Shift Hours Calculator",
    category: "HR & Payroll",
    description:
      "Paid hours in a shift after break, overnight shifts crossing midnight, and the weekly total checked against the 48-hour statutory limit.",
    keywords:
      "shift hours calculator overnight shift duration night shift payroll weekly hours 48 hour limit break deduction",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "salary-slip-generator",
    name: "Salary Slip Generator",
    category: "HR & Payroll",
    description:
      "Generate a printable payslip from earnings and deductions you enter, with gross, total deductions, net pay and employer cost summed and checked.",
    keywords:
      "salary slip generator payslip format india printable earnings deductions net pay code on wages wage slip employer",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "offer-letter-generator",
    name: "Offer Letter Generator",
    category: "HR & Payroll",
    description:
      "An offer letter with designation, compensation, joining date, conditions and validity, built only from facts you supply — every gap stays a visible placeholder.",
    keywords:
      "offer letter generator india format employment offer ctc joining date conditions appointment letter template hr",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "experience-letter-generator",
    name: "Experience Letter Generator",
    category: "HR & Payroll",
    description:
      "An experience certificate stating the dates, designation, department and responsibilities on record, with no performance claims added.",
    keywords:
      "experience letter generator india format experience certificate relieving letter employment certificate work experience hr",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "relieving-letter-generator",
    name: "Relieving Letter Generator",
    category: "HR & Payroll",
    description:
      "A relieving letter confirming the last working day, that duties were handed over, and the full and final settlement that has been processed.",
    keywords:
      "relieving letter generator india format last working day full and final settlement exit clearance resignation acceptance",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "warning-letter-generator",
    name: "Warning Letter Generator",
    category: "HR & Payroll",
    description:
      "A warning letter that records the specific incident, the policy breached, the improvement expected and a response deadline — the due-process elements a warning needs.",
    keywords:
      "warning letter generator india format employee misconduct performance warning show cause notice hr disciplinary due process",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "appreciation-letter-generator",
    name: "Appreciation Letter Generator",
    category: "HR & Payroll",
    description:
      "A recognition letter that names the specific contribution, the period and the concrete impact, rather than generic praise.",
    keywords:
      "appreciation letter generator india format recognition letter employee award commendation specific contribution hr",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "increment-letter-generator",
    name: "Increment Letter Generator",
    category: "HR & Payroll",
    description:
      "An increment letter stating the previous and revised CTC, the effective date and the statutory components that are recalculated.",
    keywords:
      "increment letter generator india format salary revision letter appraisal hike letter revised ctc effective date pf recalculation",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "termination-letter-generator",
    name: "Termination Letter Generator",
    category: "HR & Payroll",
    description:
      "A termination letter stating the clause relied on, the effective date, notice or pay in lieu and the settlement terms, with explicit legal-review warnings.",
    keywords:
      "termination letter generator india format employment termination notice pay in lieu settlement clause contractual discharge hr",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "internship-certificate-generator",
    name: "Internship Certificate Generator",
    category: "HR & Payroll",
    description:
      "An internship certificate confirming the period, the work performed and the outcomes delivered, for academic credit or a job application.",
    keywords:
      "internship certificate generator india format completion certificate intern letter academic credit work experience",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "job-description-generator",
    name: "Job Description Generator",
    category: "HR & Payroll",
    description:
      "Assemble a job description from your own responsibility and requirement lists, with the sections a JD needs and flags for the choices that cost applications.",
    keywords:
      "job description generator india format responsibilities requirements jd template hiring salary range must have",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "kpi-sheet-generator",
    name: "KPI Sheet Generator",
    category: "HR & Payroll",
    description:
      "Structure a KPI sheet from the metrics you choose, enforcing weights that sum to 100 and a measurable target for each, without inventing the targets.",
    keywords:
      "kpi sheet generator india format performance metrics weights targets employee appraisal scorecard review period",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "interview-plan-generator",
    name: "Interview Plan Generator",
    category: "HR & Payroll",
    description:
      "Build a structured interview from competencies, with a fixed question bank and a prompt for what a strong answer shows in your specific context.",
    keywords:
      "interview plan generator india structured interview questions competencies scorecard hiring panel question bank",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "probation-period-calculator",
    name: "Probation Period Calculator",
    category: "HR & Payroll",
    description:
      "Probation end date from a joining date, extended where a policy allows, with the confirmation-in-writing caution stated.",
    keywords:
      "probation period calculator india joining date confirmation end date extension appointment letter employment",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "statutory-leave-calculator",
    name: "Statutory Leave Calculator",
    category: "HR & Payroll",
    description:
      "Leave entitlement on the Factories Act basis — one day for every 20 days worked — with the divisor adjustable for state variations.",
    keywords:
      "statutory leave calculator india factories act annual leave earned leave 20 days entitlement shops establishments act",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "working-days-calculator",
    name: "Working Days Calculator",
    category: "HR & Payroll",
    description:
      "Add or subtract working days from a date, skipping weekends and any declared holidays, for notice periods, deadlines and joining dates.",
    keywords:
      "working days calculator india business days add subtract holidays weekends deadline notice period date",
    icon: "calc",
    color: "amber",
    phase: 21,
  },
  {
    slug: "serp-preview",
    name: "SERP Preview",
    category: "SEO & Website Growth",
    description:
      "Preview how a title and description will look in search results, with both character count and estimated pixel width against Google's truncation.",
    keywords:
      "serp preview google snippet title length checker pixel width meta description truncation 580px 920px search result",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "keyword-density-checker",
    name: "Keyword Density Checker",
    category: "SEO & Website Growth",
    description:
      "Keyword occurrences, density and placement across title, description, headings, first paragraph and URL — plus repeated phrases that signal accidental stuffing.",
    keywords:
      "keyword density checker seo on page keyword frequency placement title heading first paragraph repeated phrases stuffing analysis",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "readability-checker",
    name: "Readability Checker",
    category: "SEO & Website Growth",
    description:
      "Flesch Reading Ease and Flesch–Kincaid grade with sentence and syllable detail, and an explicit warning when the text is not in English.",
    keywords:
      "readability checker flesch reading ease kincaid grade level sentence length syllables english content score",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "on-page-audit",
    name: "On-Page Audit",
    category: "SEO & Website Growth",
    description:
      "Audit pasted HTML for multiple H1s, skipped heading levels, missing alt attributes, empty anchors and thin visible text.",
    keywords:
      "on page audit heading structure h1 alt text accessibility seo html checker document outline screen reader",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "duplicate-content-checker",
    name: "Duplicate Content Checker",
    category: "SEO & Website Growth",
    description:
      "Compare two pages for near-duplicate copy using three-word overlap, the pattern that catches doorway pages before they are published.",
    keywords:
      "duplicate content checker near duplicate detection jaccard similarity doorway pages shingle comparison two pages seo",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "keyword-cannibalisation-checker",
    name: "Keyword Cannibalisation Checker",
    category: "SEO & Website Growth",
    description:
      "Find pages on your own site that target the same keyword, ranked by severity with the near-duplicate titles that make it worst.",
    keywords:
      "keyword cannibalisation checker seo same keyword two pages internal competition consolidation duplicate targeting",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "organization-schema-generator",
    name: "Organization Schema Generator",
    category: "SEO & Website Growth",
    description:
      "Generate valid Organization JSON-LD with the required properties checked and every field optional until you supply it.",
    keywords:
      "organization schema generator json-ld structured data schema.org company markup knowledge panel logo sameas",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "article-schema-generator",
    name: "Article Schema Generator",
    category: "SEO & Website Growth",
    description:
      "Article JSON-LD with headline, author, publisher and ISO dates, validated for the properties that actually make a block invalid.",
    keywords:
      "article schema generator json-ld blog post structured data headline author publisher datepublished datemodified",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "faq-schema-generator",
    name: "FAQ Schema Generator",
    category: "SEO & Website Growth",
    description:
      "FAQPage JSON-LD from question-and-answer pairs, with a reminder that the questions must actually be visible on the page.",
    keywords:
      "faq schema generator json-ld faqpage structured data questions answers rich results markup",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "product-schema-generator",
    name: "Product Schema Generator",
    category: "SEO & Website Growth",
    description:
      "Product JSON-LD with offers, price, currency and availability — and no rating field, because an invented aggregate rating is a policy violation.",
    keywords:
      "product schema generator json-ld offer price currency availability structured data ecommerce rich results rating",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "local-business-schema-generator",
    name: "Local Business Schema Generator",
    category: "SEO & Website Growth",
    description:
      "LocalBusiness JSON-LD with a postal address, opening hours and coordinates, requiring the city and country that make local markup valid.",
    keywords:
      "local business schema generator json-ld postal address opening hours geo coordinates storefront seo local",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "job-posting-schema-generator",
    name: "Job Posting Schema Generator",
    category: "SEO & Website Growth",
    description:
      "JobPosting JSON-LD with the organization, location, salary and full description that Google requires — the most heavily validated rich-result type.",
    keywords:
      "job posting schema generator json-ld jobposting structured data hiring organization salary google jobs rich results",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "breadcrumb-schema-generator",
    name: "Breadcrumb Schema Generator",
    category: "SEO & Website Growth",
    description:
      "BreadcrumbList JSON-LD from an ordered path, with absolute URLs enforced and a minimum of two items.",
    keywords:
      "breadcrumb schema generator json-ld breadcrumblist structured data navigation path seo sitelinks",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "json-ld-validator",
    name: "JSON-LD Validator",
    category: "SEO & Website Growth",
    description:
      "Check pasted JSON-LD for valid syntax, an @type and a schema.org @context, with the exact parse error when it fails.",
    keywords:
      "json-ld validator structured data checker schema.org json syntax @type @context debug markup error",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "robots-txt-generator",
    name: "robots.txt Generator",
    category: "SEO & Website Growth",
    description:
      "Build robots.txt and have it validated in the same pass, with the failure modes that cost the most traffic flagged as errors.",
    keywords:
      "robots txt generator validator disallow allow user agent sitemap crawl delay googlebot seo",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "robots-txt-validator",
    name: "robots.txt Validator",
    category: "SEO & Website Growth",
    description:
      "Parse a robots.txt file into groups and report the directives that will be ignored, including rules set before any User-agent line.",
    keywords:
      "robots txt validator parser check directives ignored user agent rules seo debug syntax",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "sitemap-generator",
    name: "Sitemap Generator",
    category: "SEO & Website Growth",
    description:
      "Build sitemap.xml from a URL list with lastmod, validating absolute URLs, the 50,000 limit, duplicates and the 50 MB cap.",
    keywords:
      "sitemap generator xml urlset lastmod changefreq priority seo 50000 urls 50mb absolute urls",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "sitemap-validator",
    name: "Sitemap Validator",
    category: "SEO & Website Growth",
    description:
      "Parse sitemap XML and check the namespace, URL validity, duplicates and the 50,000 limit, distinguishing a urlset from an index.",
    keywords:
      "sitemap validator xml checker urlset sitemapindex namespace absolute urls duplicates seo debug",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "canonical-checker",
    name: "Canonical Checker",
    category: "SEO & Website Growth",
    description:
      "Compare a page URL with its declared canonical and flag the conflicts that actually de-index pages: relative canonicals, host mismatches and path differences.",
    keywords:
      "canonical checker url tag self referencing host mismatch relative canonical seo duplicate consolidation",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "hreflang-checker",
    name: "Hreflang Checker",
    category: "SEO & Website Growth",
    description:
      "Check an hreflang cluster for reciprocity, self-reference, valid language tags and a sane x-default — a cluster missing any of those is ignored entirely.",
    keywords:
      "hreflang checker validator reciprocal self reference x-default language region tag international seo cluster",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "redirect-checker",
    name: "Redirect Checker",
    category: "SEO & Website Growth",
    description:
      "Resolve redirect chains from a rule list, catching loops, multi-hop chains and 302s standing in for permanent 301s.",
    keywords:
      "redirect checker chain loop 301 302 multi hop seo crawl budget temporary permanent redirect analysis",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "title-generator",
    name: "Title Generator",
    category: "SEO & Website Growth",
    description:
      "Draft page titles from your keyword plus one concrete differentiator, with length checks — no invented superlatives and no keyword stuffing.",
    keywords:
      "title generator seo page title tag drafts keyword differentiator length 60 characters meta title",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "meta-description-generator",
    name: "Meta Description Generator",
    category: "SEO & Website Growth",
    description:
      "Draft meta descriptions from the benefit you supply, with the mechanism and a call to action, each measured against the display window.",
    keywords:
      "meta description generator seo snippet drafts benefit mechanism call to action 160 characters length",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "content-brief-generator",
    name: "Content Brief Generator",
    category: "SEO & Website Growth",
    description:
      "Turn a topic and a search intent into an outline with the questions a reader at that stage will have and the evidence to gather first.",
    keywords:
      "content brief generator seo outline search intent reader questions evidence structure article plan",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "headline-generator",
    name: "Headline Generator",
    category: "SEO & Website Growth",
    description:
      "Headline variants by angle — how-to, comparison, explainer, data or mistakes — each promising only what the page can support.",
    keywords:
      "headline generator article title ideas angle how to comparison explainer mistakes content marketing",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "alt-text-generator",
    name: "Alt Text Generator",
    category: "SEO & Website Growth",
    description:
      "Alt text that fits the image's role — informational, functional, chart or decorative — including telling you when the correct answer is an empty alt.",
    keywords:
      "alt text generator image accessibility seo decorative functional chart empty alt attribute description",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "internal-link-suggestions",
    name: "Internal Link Suggestions",
    category: "SEO & Website Growth",
    description:
      "Find internal linking gaps: pages whose target keyword appears in another page's text but is not linked, with a suggested anchor.",
    keywords:
      "internal link suggestions internal linking seo anchor text page gaps site structure navigation",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "topic-cluster-builder",
    name: "Topic Cluster Builder",
    category: "SEO & Website Growth",
    description:
      "Group pages sharing significant keywords into clusters and find the orphan pages nothing links to.",
    keywords:
      "topic cluster builder pillar page orphan pages internal links site architecture seo content groups",
    icon: "sparkles",
    color: "teal",
    phase: 21,
  },
  {
    slug: "resume-ats-checker",
    name: "Résumé ATS Checker",
    category: "Career & Jobs",
    description:
      "Score résumé readiness across parseability, quantified impact, bullet mechanics and keyword match, with every finding itemised — not a fabricated per-vendor score.",
    keywords:
      "resume ats checker india ats score job description parseability quantified bullets contact sections readiness keyword match",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "resume-keyword-matcher",
    name: "Résumé Keyword Matcher",
    category: "Career & Jobs",
    description:
      "Extract the terms a job description emphasises and check each against your résumé, with the mention count shown for every term.",
    keywords:
      "resume keyword matcher job description terms coverage skills match ats missing keywords application tailoring",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "resume-bullet-improver",
    name: "Résumé Bullet Improver",
    category: "Career & Jobs",
    description:
      "Rewrite résumé bullets with rule-based changes — weak openers replaced, filler stripped — and a visible prompt where a metric is missing.",
    keywords:
      "resume bullet improver action verbs weak openers responsible for quantified achievements rewrite bullets cv",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "resume-summary-generator",
    name: "Résumé Summary Generator",
    category: "Career & Jobs",
    description:
      "Professional summary drafts at three lengths from your role, experience and one achievement — with hollow adjectives deliberately excluded.",
    keywords:
      "resume summary generator professional profile objective statement resume india fresher experienced achievement",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "resume-comparison",
    name: "Résumé Comparison",
    category: "Career & Jobs",
    description:
      "Compare two versions of a résumé on the same measurable axes, with the score delta and the words that changed.",
    keywords:
      "resume comparison two versions cv diff score change quantified bullets word differences job application",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "salary-converter",
    name: "Salary Converter",
    category: "Career & Jobs",
    description:
      "Convert a salary between hourly, daily, monthly and annual with the working-hours assumption stated rather than hidden.",
    keywords:
      "salary converter hourly daily monthly annual rate conversion ctc per hour per day per month per year",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "contractor-rate-calculator",
    name: "Contractor Rate Calculator",
    category: "Career & Jobs",
    description:
      "The contractor day rate that matches a salaried CTC, accounting for billed days and the benefits an employer would otherwise fund.",
    keywords:
      "contractor rate calculator india day rate freelance salary equivalent billed days loading benefits comparison",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "offer-comparison-calculator",
    name: "Offer Comparison Calculator",
    category: "Career & Jobs",
    description:
      "Compare two CTCs after Indian income tax and see how much of the raise actually reaches your bank account.",
    keywords:
      "offer comparison calculator india ctc after tax take home hike percentage salary negotiation new job switch",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "total-compensation-calculator",
    name: "Total Compensation Calculator",
    category: "Career & Jobs",
    description:
      "Year-one cash, steady-state and equity-inclusive totals, with a joining bonus's clawback and a variable payout's pro-rating stated.",
    keywords:
      "total compensation calculator ctc joining bonus clawback variable equity relocation year one steady state package",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "equity-vesting-calculator",
    name: "Equity Vesting Calculator",
    category: "Career & Jobs",
    description:
      "Value an ESOP or RSU grant with the cliff, the vesting schedule and the vested spread at a chosen month — and flag it when the options are underwater.",
    keywords:
      "equity vesting calculator esop rsu grant cliff strike price fmv spread schedule startup india",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "relocation-calculator",
    name: "Relocation Calculator",
    category: "Career & Jobs",
    description:
      "Compare an offer in a new city using a cost index you supply, with the break-even CTC that preserves your current purchasing power.",
    keywords:
      "relocation calculator cost of living city comparison salary india break even ctc purchasing power move job",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "marginal-tax-rate",
    name: "Marginal Tax Rate Calculator",
    category: "Career & Jobs",
    description:
      "The tax on your next ₹10,000, versus your average rate — the number that answers what a bonus is actually worth.",
    keywords:
      "marginal tax rate calculator india average rate bonus tax slab next rupee new regime old regime",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "notice-buyout-calculator",
    name: "Notice Buyout Calculator",
    category: "Career & Jobs",
    description:
      "The cost of leaving before your notice period completes, on the basic-plus-DA basis most contracts use rather than full gross.",
    keywords:
      "notice buyout calculator india notice period recovery salary basic da resignation early exit cost",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "notice-period-calculator",
    name: "Notice Period Calculator",
    category: "Career & Jobs",
    description:
      "Last working day from a resignation date, counting business days and skipping weekends and holidays you declare.",
    keywords:
      "notice period calculator india last working day resignation date business days holidays 30 60 90 days",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "experience-calculator",
    name: "Experience Calculator",
    category: "Career & Jobs",
    description:
      "Total experience from employment date ranges, merging overlapping roles so concurrent work is not double counted, with gaps listed.",
    keywords:
      "experience calculator total years months employment history dates overlapping roles gaps resume india",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "cover-letter-generator",
    name: "Cover Letter Generator",
    category: "Career & Jobs",
    description:
      "A four-paragraph cover letter built from your own facts, with a visible placeholder where the one thing only you can write is missing.",
    keywords:
      "cover letter generator india format job application letter why this company achievement skills professional",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "follow-up-generator",
    name: "Follow-Up Message Generator",
    category: "Career & Jobs",
    description:
      "Follow-up messages for after an interview, after a final round, or after silence — each designed to be easy to answer.",
    keywords:
      "follow up email after interview generator job application no response thank you message recruiter",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "star-answer-builder",
    name: "STAR Answer Builder",
    category: "Career & Jobs",
    description:
      "Structure a behavioural interview answer, with checks for a missing metric, a short action block and an answer that says we instead of I.",
    keywords:
      "star answer builder interview behavioural questions situation task action result competency preparation",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "linkedin-about-generator",
    name: "LinkedIn About Generator",
    category: "Career & Jobs",
    description:
      "A LinkedIn About section in four short paragraphs from your role, focus and one achievement, with placeholders where proof is missing.",
    keywords:
      "linkedin about generator summary section profile india professional headline achievement job search",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "interview-prep-plan",
    name: "Interview Prep Plan",
    category: "Career & Jobs",
    description:
      "A preparation plan by interview stage — the research to do, the stories to rehearse and the questions worth asking.",
    keywords:
      "interview preparation plan india screening technical manager final round questions to ask research company",
    icon: "text",
    color: "rose",
    phase: 21,
  },
  {
    slug: "availability-statement",
    name: "Availability Statement",
    category: "Career & Jobs",
    description:
      "A one-line availability statement generated from your real notice terms, including buyout, so it is accurate before you send it.",
    keywords:
      "availability statement job application notice period immediate joiner buyout sentence resume cover letter",
    icon: "text",
    color: "rose",
    phase: 21,
  },
] as const;

export type Tool = (typeof tools)[number];

/**
 * A tool can belong to more than one category (the Image & PDF Converter is
 * both an image tool and a PDF tool) without duplicating its route or record.
 */
export function toolCategoriesOf(tool: Tool): ToolCategory[] {
  return "categories" in tool && Array.isArray(tool.categories)
    ? [...(tool.categories as readonly ToolCategory[])]
    : [tool.category as ToolCategory];
}

export const toolBySlug = (slug: string): Tool | undefined =>
  tools.find((t) => t.slug === slug);

export const toolsByCategory = (category: ToolCategory) =>
  tools.filter((tool) => toolCategoriesOf(tool).includes(category));

const RELATED_TOOL_AFFINITIES: Readonly<Record<string, readonly string[]>> = {
  // PDF Tools (9)
  "images-to-pdf": [
    "pdf-to-image",
    "compress-pdf",
    "merge-pdf",
    "pdf-studio",
    "image-compressor",
    "image-resizer",
  ],
  "pdf-to-image": [
    "images-to-pdf",
    "split-pdf",
    "compress-pdf",
    "pdf-studio",
    "image-to-image",
    "image-to-text",
  ],
  "pdf-studio": [
    "merge-pdf",
    "split-pdf",
    "compress-pdf",
    "pdf-lock-unlock",
    "word-to-pdf",
    "pdf-to-word",
  ],
  "merge-pdf": [
    "split-pdf",
    "compress-pdf",
    "pdf-studio",
    "images-to-pdf",
    "word-to-pdf",
    "pdf-lock-unlock",
  ],
  "split-pdf": [
    "merge-pdf",
    "pdf-studio",
    "compress-pdf",
    "pdf-to-image",
    "pdf-to-word",
    "pdf-lock-unlock",
  ],
  "compress-pdf": [
    "merge-pdf",
    "split-pdf",
    "pdf-studio",
    "word-to-pdf",
    "images-to-pdf",
    "pdf-lock-unlock",
  ],
  "word-to-pdf": [
    "pdf-to-word",
    "merge-pdf",
    "compress-pdf",
    "pdf-studio",
    "pdf-lock-unlock",
    "split-pdf",
  ],
  "pdf-to-word": [
    "word-to-pdf",
    "image-to-text",
    "split-pdf",
    "pdf-studio",
    "merge-pdf",
    "word-counter",
  ],
  "pdf-lock-unlock": [
    "pdf-studio",
    "merge-pdf",
    "compress-pdf",
    "split-pdf",
    "word-to-pdf",
    "password-generator",
  ],

  // Image Tools (4): same-category Image Tools first, then genuine image workflows
  "image-compressor": [
    "image-resizer",
    "image-cropper",
    "image-to-image",
    "images-to-pdf",
    "pdf-to-image",
    "image-to-text",
  ],
  "image-resizer": [
    "image-cropper",
    "image-to-image",
    "image-compressor",
    "images-to-pdf",
    "pdf-to-image",
    "image-to-text",
  ],
  "image-cropper": [
    "image-to-image",
    "image-compressor",
    "image-resizer",
    "image-to-text",
    "images-to-pdf",
    "pdf-to-image",
  ],
  "image-to-image": [
    "image-compressor",
    "image-resizer",
    "image-cropper",
    "images-to-pdf",
    "pdf-to-image",
    "image-to-text",
  ],

  // Text & Writing (3): same-category Text & Writing first, then document/text workflows
  "word-counter": [
    "case-converter",
    "image-to-text",
    "pdf-to-word",
    "word-to-pdf",
  ],
  "case-converter": [
    "word-counter",
    "image-to-text",
    "pdf-to-word",
    "regex-tester",
    "url-encoder-decoder",
  ],
  "image-to-text": [
    "word-counter",
    "case-converter",
    "pdf-to-word",
    "pdf-to-image",
    "image-cropper",
    "images-to-pdf",
  ],

  // QR & Barcode (2): QR encoding, scanning, security and print-asset workflows
  "qr-generator": [
    "barcode-generator",
    "qr-code-scanner",
    "batch-studio",
    "url-encoder-decoder",
    "images-to-pdf",
    "image-resizer",
  ],
  "qr-code-scanner": [
    "barcode-generator",
    "qr-generator",
    "barcode-scanner",
    "url-network-privacy",
    "url-encoder-decoder",
    "hash-generator",
  ],
  "barcode-generator": [
    "batch-studio",
    "barcode-scanner",
    "gs1-intelligence",
    "barcode-developer",
    "qr-generator",
    "qr-code-scanner",
  ],
  "batch-code-checker": [
    "barcode-scanner",
    "gs1-intelligence",
    "product-lookup",
    "barcode-generator",
    "qr-code-scanner",
  ],
  "barcode-scanner": [
    "barcode-generator",
    "batch-code-checker",
    "product-lookup",
    "barcode-developer",
    "batch-studio",
    "qr-code-scanner",
  ],
  "gs1-intelligence": [
    "barcode-generator",
    "barcode-scanner",
    "product-lookup",
    "batch-code-checker",
    "batch-studio",
    "barcode-developer",
  ],
  "product-lookup": [
    "barcode-scanner",
    "gs1-intelligence",
    "batch-code-checker",
    "barcode-generator",
    "barcode-developer",
  ],
  "batch-studio": [
    "barcode-generator",
    "barcode-scanner",
    "qr-generator",
    "gs1-intelligence",
    "barcode-developer",
  ],
  "barcode-developer": [
    "barcode-generator",
    "barcode-scanner",
    "gs1-intelligence",
    "product-lookup",
    "batch-studio",
  ],

  // Security & Privacy (9): local cryptography, passwords, headers, DNS, metadata and policy drafts
  "password-generator": [
    "advanced-cryptography",
    "hash-generator",
    "api-credential-tools",
    "pdf-lock-unlock",
    "uuid-generator",
    "qr-generator",
  ],
  "advanced-cryptography": [
    "password-generator",
    "hash-generator",
    "api-credential-tools",
    "base64-encoder-decoder",
    "pdf-lock-unlock",
    "website-security-review",
  ],
  "dns-email-security": [
    "website-security-review",
    "url-network-privacy",
    "api-credential-tools",
    "advanced-cryptography",
    "privacy-policy-workbench",
  ],
  "website-security-review": [
    "dns-email-security",
    "url-network-privacy",
    "api-credential-tools",
    "privacy-policy-workbench",
    "advanced-cryptography",
    "html-formatter",
  ],
  "privacy-metadata-manager": [
    "privacy-policy-workbench",
    "url-network-privacy",
    "pdf-lock-unlock",
    "hash-generator",
    "password-generator",
  ],
  "url-network-privacy": [
    "website-security-review",
    "dns-email-security",
    "privacy-metadata-manager",
    "privacy-policy-workbench",
    "url-encoder-decoder",
    "qr-code-scanner",
  ],
  "privacy-policy-workbench": [
    "privacy-metadata-manager",
    "website-security-review",
    "url-network-privacy",
    "dns-email-security",
  ],
  "api-credential-tools": [
    "advanced-cryptography",
    "website-security-review",
    "password-generator",
    "hash-generator",
    "json-formatter",
    "base64-encoder-decoder",
  ],

  // Developer Tools (11)
  "json-formatter": [
    "json-validator",
    "xml-formatter",
    "html-formatter",
    "base64-encoder-decoder",
    "url-encoder-decoder",
    "regex-tester",
  ],
  "json-validator": [
    "json-formatter",
    "xml-formatter",
    "html-formatter",
    "regex-tester",
    "base64-encoder-decoder",
    "url-encoder-decoder",
  ],
  "xml-formatter": [
    "json-formatter",
    "json-validator",
    "html-formatter",
    "css-minifier",
  ],
  "html-formatter": [
    "css-minifier",
    "javascript-minifier",
    "xml-formatter",
    "json-formatter",
    "url-encoder-decoder",
    "regex-tester",
  ],
  "css-minifier": ["javascript-minifier", "html-formatter", "xml-formatter"],
  "javascript-minifier": ["css-minifier", "html-formatter", "regex-tester"],
  "base64-encoder-decoder": [
    "url-encoder-decoder",
    "hash-generator",
    "uuid-generator",
    "json-formatter",
    "password-generator",
    "qr-code-scanner",
  ],
  "url-encoder-decoder": [
    "base64-encoder-decoder",
    "regex-tester",
    "case-converter",
    "json-formatter",
    "html-formatter",
    "qr-generator",
  ],
  "uuid-generator": [
    "hash-generator",
    "password-generator",
    "base64-encoder-decoder",
    "json-formatter",
    "json-validator",
  ],
  "regex-tester": [
    "word-counter",
    "case-converter",
    "url-encoder-decoder",
    "json-validator",
    "html-formatter",
    "javascript-minifier",
  ],
  "hash-generator": [
    "advanced-cryptography",
    "password-generator",
    "uuid-generator",
    "base64-encoder-decoder",
    "privacy-metadata-manager",
  ],

  // Calculators (12): strictly clustered by finance/rate, date/time, health, and physical/math conversion
  "emi-calculator": [
    "loan-calculator",
    "percentage-calculator",
    "gst-calculator",
    "discount-calculator",
    "date-difference-calculator",
  ],
  "loan-calculator": [
    "emi-calculator",
    "percentage-calculator",
    "gst-calculator",
    "discount-calculator",
    "date-difference-calculator",
  ],
  "gst-calculator": [
    "discount-calculator",
    "percentage-calculator",
    "emi-calculator",
    "loan-calculator",
  ],
  "discount-calculator": [
    "gst-calculator",
    "percentage-calculator",
    "emi-calculator",
    "loan-calculator",
  ],
  "percentage-calculator": [
    "discount-calculator",
    "gst-calculator",
    "emi-calculator",
    "loan-calculator",
    "scientific-calculator",
  ],
  "age-calculator": [
    "date-difference-calculator",
    "time-converter",
    "bmi-calculator",
  ],
  "date-difference-calculator": [
    "age-calculator",
    "time-converter",
    "emi-calculator",
    "loan-calculator",
  ],
  "time-converter": [
    "date-difference-calculator",
    "age-calculator",
    "unit-converter",
    "temperature-converter",
    "scientific-calculator",
  ],
  "bmi-calculator": [
    "age-calculator",
    "unit-converter",
    "percentage-calculator",
  ],
  "unit-converter": [
    "temperature-converter",
    "time-converter",
    "scientific-calculator",
    "percentage-calculator",
  ],
  "temperature-converter": [
    "unit-converter",
    "time-converter",
    "scientific-calculator",
  ],
  "scientific-calculator": [
    "percentage-calculator",
    "unit-converter",
    "temperature-converter",
    "time-converter",
  ],
};

/**
 * Contextual related tools for a detail page: returns only genuinely relevant
 * workflow/category neighbours (3–6 tools depending on natural cluster size),
 * never padding smaller sub-clusters with unrelated filler just to hit 6.
 */
export function relatedTools(tool: Tool, limit = 6): Tool[] {
  const ordered: Tool[] = [];
  const pushUnique = (candidate: Tool | undefined) => {
    if (!candidate || candidate.slug === tool.slug) return;
    if (!ordered.includes(candidate)) ordered.push(candidate);
  };

  const curatedSlugs = RELATED_TOOL_AFFINITIES[tool.slug];
  if (curatedSlugs) {
    for (const slug of curatedSlugs) {
      pushUnique(toolBySlug(slug));
    }
    return ordered.slice(0, limit);
  }

  // Fallback for any newly added tool not yet listed in RELATED_TOOL_AFFINITIES:
  // rotate through same-category peers only, without cross-category filler.
  for (const categoryName of toolCategoriesOf(tool)) {
    const peers = toolsByCategory(categoryName);
    const selfIdx = peers.findIndex((item) => item.slug === tool.slug);
    for (let offset = 1; offset <= peers.length; offset += 1) {
      const idx = selfIdx >= 0 ? (selfIdx + offset) % peers.length : offset - 1;
      pushUnique(peers[idx]);
    }
  }

  return ordered.slice(0, limit);
}

export function filterTools(query: string, category: Category) {
  const search = query.trim().toLowerCase();
  const matches = tools.filter(
    (tool) =>
      (category === "All tools" ||
        toolCategoriesOf(tool).includes(category as ToolCategory)) &&
      `${tool.name} ${tool.description} ${tool.keywords}`
        .toLowerCase()
        .includes(search),
  );
  if (!search) return matches;
  // A tool whose *name* contains the query outranks one that only matched a
  // keyword, so typing "JSON" lands on JSON Formatter and JSON Validator first.
  // Ordering stays stable within each group.
  const byName = matches.filter((tool) =>
    tool.name.toLowerCase().includes(search),
  );
  return byName.length
    ? [...byName, ...matches.filter((tool) => !byName.includes(tool))]
    : matches;
}
