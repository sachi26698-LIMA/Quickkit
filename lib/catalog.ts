export const toolCategories = [
  "PDF Tools",
  "Image Tools",
  "QR & Barcode",
  "Text & Writing",
  "Developer Tools",
  "Calculators",
  "Security & Privacy",
  "AI Tools",
] as const;
export type ToolCategory = (typeof toolCategories)[number];
export const categories = ["All tools", ...toolCategories] as const;
export type Category = (typeof categories)[number];

export type CategoryMeta = {
  name: ToolCategory;
  slug: string;
  seoTitle: string;
  blurb: string;
  description: string;
  tint: string;
  icon:
    "pdf" | "image" | "qr" | "text" | "code" | "calc" | "shield" | "sparkles";
};

export const categoryMeta: CategoryMeta[] = [
  {
    name: "PDF Tools",
    slug: "pdf-tools",
    seoTitle: "Free Online PDF Tools — Merge, Split & Convert",
    blurb: "Merge, split, convert, lock and manage PDF files.",
    description:
      "Merge, split, compress, edit, lock/unlock and convert PDFs to Word or images. Browser-local PDF utilities plus consent-based Word to PDF conversion.",
    tint: "tint-pdf",
    icon: "pdf",
  },
  {
    name: "Image Tools",
    slug: "image-tools",
    seoTitle: "Free Online Image Tools — Compress, Resize & Crop",
    blurb: "Edit, convert, compress and optimize images.",
    description:
      "Compress images to an exact KB size, resize by pixels or presets, crop ratios or circles, and convert JPG, PNG, WebP, AVIF and TIFF locally in your browser.",
    tint: "tint-image",
    icon: "image",
  },
  {
    name: "QR & Barcode",
    slug: "qr-barcode",
    seoTitle: "QR Code Generator & Scanner — Free Online Tools",
    blurb: "Create and scan QR codes and barcodes.",
    description:
      "Create custom scannable QR codes with logos, colours, Payment/UPI links and CSV batches, or scan QR codes from your camera and screenshots in your browser.",
    tint: "tint-qr",
    icon: "qr",
  },
  {
    name: "Text & Writing",
    slug: "text-writing",
    seoTitle: "Text & OCR Tools — Word Counter & Case Converter",
    blurb: "Format, analyze and transform text easily.",
    description:
      "Count words, characters and reading time, convert between 10 text case styles, and extract text from images or scanned PDFs in 8 languages locally.",
    tint: "tint-text",
    icon: "text",
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    seoTitle: "Developer Tools — JSON, Minifiers, Regex & Hashes",
    blurb: "Encode, decode, format and work with dev utilities.",
    description:
      "Format and validate JSON, XML and HTML, minify CSS and JavaScript, test regex in a worker, encode Base64/URLs, and generate UUID v4 or SHA hashes locally.",
    tint: "tint-dev",
    icon: "code",
  },
  {
    name: "Calculators",
    slug: "calculators",
    seoTitle: "Online Calculators — EMI, GST, BMI & Unit Tools",
    blurb: "Simple and advanced calculations for everyday use.",
    description:
      "Calculate EMI and loan schedules, Indian GST, discounts, percentages, BMI, exact age, business-day differences, scientific math and unit conversions locally.",
    tint: "tint-calc",
    icon: "calc",
  },
  {
    name: "Security & Privacy",
    slug: "security-privacy",
    seoTitle: "Security & Privacy — Browser Password Generator",
    blurb: "Generate, check and manage your data securely.",
    description:
      "Generate high-entropy 8–64 character random passwords in your browser using Web Crypto (crypto.getRandomValues) with zero network requests or storage.",
    tint: "tint-security",
    icon: "shield",
  },
  {
    name: "AI Tools",
    slug: "ai-tools",
    seoTitle: "AI Tools (Coming Soon) — Roadmap Category",
    blurb: "Smart tools powered by artificial intelligence.",
    description:
      "AI-assisted document and text utilities are on the QUICKKIT roadmap. Explore all 42 live PDF, image, OCR, QR, developer and calculator tools today.",
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
    description:
      "Generate MD5, SHA-1, SHA-256 or SHA-512 digests from text or files, locally and in chunks.",
    keywords:
      "checksum digest md5 sha1 sha-1 sha256 sha-256 sha512 sha-512 hash file developer",
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
      "Create strong, random passwords with the length and characters you choose.",
    keywords: "secure random crypto credentials",
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
    "url-encoder-decoder",
    "images-to-pdf",
    "image-resizer",
  ],
  "qr-code-scanner": [
    "barcode-generator",
    "qr-generator",
    "url-encoder-decoder",
    "image-cropper",
    "hash-generator",
  ],
  "barcode-generator": [
    "qr-generator",
    "qr-code-scanner",
    "images-to-pdf",
    "image-resizer",
    "url-encoder-decoder",
  ],

  // Security & Privacy (1): local cryptography, passwords and document/QR protection
  "password-generator": [
    "hash-generator",
    "pdf-lock-unlock",
    "uuid-generator",
    "base64-encoder-decoder",
    "qr-generator",
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
    "password-generator",
    "uuid-generator",
    "base64-encoder-decoder",
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
  const search = query.trim().toLocaleLowerCase();
  const matches = tools.filter(
    (tool) =>
      (category === "All tools" ||
        toolCategoriesOf(tool).includes(category as ToolCategory)) &&
      `${tool.name} ${tool.description} ${tool.keywords}`
        .toLocaleLowerCase()
        .includes(search),
  );
  if (!search) return matches;
  // A tool whose *name* contains the query outranks one that only matched a
  // keyword, so typing "JSON" lands on JSON Formatter and JSON Validator first.
  // Ordering stays stable within each group.
  const byName = matches.filter((tool) =>
    tool.name.toLocaleLowerCase().includes(search),
  );
  return byName.length
    ? [...byName, ...matches.filter((tool) => !byName.includes(tool))]
    : matches;
}
