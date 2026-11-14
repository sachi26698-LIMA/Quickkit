import type { ToolCategory } from "@/lib/catalog";

/**
 * The laptop's colour cycle, without the catalogue.
 *
 * `lib/laptop-finishes.ts` only needs a tool's slug, its display name and its
 * category to build the finish palette. Importing `lib/catalog` for those three
 * fields pulled every description and keyword of all 49 tools into the
 * homepage's first-load JavaScript (the hero controls are a client component),
 * which is far more than the palette is worth. The list is duplicated here and
 * `tests/tool-palette.test.ts` fails if it ever drifts from the catalogue.
 */
export type ToolPaletteEntry = {
  slug: string;
  name: string;
  category: ToolCategory;
};

export const toolPalette: ToolPaletteEntry[] = [
  { slug: "word-counter", name: "Word Counter", category: "Text & Writing" },
  {
    slug: "case-converter",
    name: "Case Converter",
    category: "Text & Writing",
  },
  {
    slug: "image-to-text",
    name: "Image to Text (OCR)",
    category: "Text & Writing",
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    category: "Developer Tools",
  },
  {
    slug: "json-validator",
    name: "JSON Validator",
    category: "Developer Tools",
  },
  {
    slug: "html-formatter",
    name: "HTML Formatter",
    category: "Developer Tools",
  },
  { slug: "css-minifier", name: "CSS Minifier", category: "Developer Tools" },
  {
    slug: "javascript-minifier",
    name: "JavaScript Minifier",
    category: "Developer Tools",
  },
  {
    slug: "base64-encoder-decoder",
    name: "Base64 Encoder / Decoder",
    category: "Developer Tools",
  },
  {
    slug: "url-encoder-decoder",
    name: "URL Encoder / Decoder",
    category: "Developer Tools",
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    category: "Developer Tools",
  },
  { slug: "regex-tester", name: "Regex Tester", category: "Developer Tools" },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    category: "Developer Tools",
  },
  { slug: "xml-formatter", name: "XML Formatter", category: "Developer Tools" },
  {
    slug: "password-generator",
    name: "Password Generator",
    category: "Security & Privacy",
  },
  { slug: "qr-generator", name: "QR Code Generator", category: "QR & Barcode" },
  {
    slug: "qr-code-scanner",
    name: "QR Code Scanner",
    category: "QR & Barcode",
  },
  {
    slug: "barcode-generator",
    name: "Barcode Generator",
    category: "QR & Barcode",
  },
  {
    slug: "batch-code-checker",
    name: "Batch Code Checker",
    category: "QR & Barcode",
  },
  {
    slug: "barcode-scanner",
    name: "Barcode Scanner",
    category: "QR & Barcode",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    category: "Image Tools",
  },
  { slug: "image-resizer", name: "Image Resizer", category: "Image Tools" },
  { slug: "image-cropper", name: "Image Cropper", category: "Image Tools" },
  {
    slug: "image-to-image",
    name: "Image to Image Converter",
    category: "Image Tools",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF Converter",
    category: "PDF Tools",
  },
  {
    slug: "pdf-to-image",
    name: "PDF to Image Converter",
    category: "PDF Tools",
  },
  { slug: "pdf-studio", name: "PDF Studio", category: "PDF Tools" },
  { slug: "merge-pdf", name: "PDF Merger", category: "PDF Tools" },
  { slug: "split-pdf", name: "PDF Splitter", category: "PDF Tools" },
  { slug: "compress-pdf", name: "PDF Compressor", category: "PDF Tools" },
  { slug: "word-to-pdf", name: "Word to PDF Converter", category: "PDF Tools" },
  { slug: "pdf-to-word", name: "PDF to Word", category: "PDF Tools" },
  { slug: "pdf-lock-unlock", name: "PDF Lock & Unlock", category: "PDF Tools" },
  {
    slug: "percentage-calculator",
    name: "Percentage Calculator",
    category: "Calculators",
  },
  { slug: "bmi-calculator", name: "BMI Calculator", category: "Calculators" },
  {
    slug: "discount-calculator",
    name: "Discount Calculator",
    category: "Calculators",
  },
  { slug: "gst-calculator", name: "GST Calculator", category: "Calculators" },
  { slug: "age-calculator", name: "Age Calculator", category: "Calculators" },
  {
    slug: "date-difference-calculator",
    name: "Date Difference Calculator",
    category: "Calculators",
  },
  { slug: "emi-calculator", name: "EMI Calculator", category: "Calculators" },
  { slug: "loan-calculator", name: "Loan Calculator", category: "Calculators" },
  {
    slug: "scientific-calculator",
    name: "Scientific Calculator",
    category: "Calculators",
  },
  { slug: "unit-converter", name: "Unit Converter", category: "Calculators" },
  {
    slug: "temperature-converter",
    name: "Temperature Converter",
    category: "Calculators",
  },
  { slug: "time-converter", name: "Time Converter", category: "Calculators" },
  {
    slug: "advanced-cryptography",
    name: "Ultimate Encryption & Cryptography",
    category: "Security & Privacy",
  },
  {
    slug: "dns-email-security",
    name: "Ultimate DNS & Email Security",
    category: "Security & Privacy",
  },
  {
    slug: "website-security-review",
    name: "Ultimate Website Security Review",
    category: "Security & Privacy",
  },
  {
    slug: "privacy-metadata-manager",
    name: "Ultimate Privacy & Metadata Manager",
    category: "Security & Privacy",
  },
  {
    slug: "url-network-privacy",
    name: "Ultimate URL, IP & Browser Privacy",
    category: "Security & Privacy",
  },
  {
    slug: "privacy-policy-workbench",
    name: "Privacy Policy & Compliance Workbench",
    category: "Security & Privacy",
  },
  {
    slug: "api-credential-tools",
    name: "API Credential & Request Review",
    category: "Security & Privacy",
  },
  {
    slug: "gs1-intelligence",
    name: "GS1 Intelligence",
    category: "QR & Barcode",
  },
  { slug: "product-lookup", name: "Product Lookup", category: "QR & Barcode" },
  {
    slug: "batch-studio",
    name: "Batch Barcode Studio",
    category: "QR & Barcode",
  },
  {
    slug: "barcode-developer",
    name: "Barcode Developer Tools",
    category: "QR & Barcode",
  },
];
