import type { CategorySeoRecord } from "./registry";

/**
 * Category hub records — one per category in the catalogue.
 *
 * A category only becomes indexable when it actually contains published tools;
 * `indexable: false` here documents the intent (a roadmap category is not a
 * destination) and `app/sitemap.ts` plus the category page still compute the
 * live truth from the public catalogue, so hiding a tool in the admin panel
 * removes its category from the sitemap on the next revalidation.
 */
export const CATEGORY_SEO_RECORDS: CategorySeoRecord[] = [
  {
    path: "/category/pdf-tools",
    slug: "pdf-tools",
    title: "Free Online PDF Tools — Merge, Split & Convert",
    description:
      "Merge, split, compress, lock and convert PDFs in your browser, plus a consent-based Word to PDF step. Nine document tools with their limits stated on each page.",
    h1: "PDF Tools",
    primaryKeyword: "free pdf tools",
    secondaryKeywords: [
      "pdf tools online",
      "merge and split pdf",
      "compress pdf online",
      "pdf to word free",
      "edit pdf in browser",
    ],
    intent: "transactional",
    researchId: "category-pdf",
    alternativeTitles: [
      "PDF Tools Online — Merge, Split, Compress, Convert",
      "Browser PDF Toolkit — Nine Document Utilities",
    ],
    alternativeDescription:
      "Every document job in one place: combine reports, split a scan, shrink a file for email, protect a draft or convert between PDF, Word and images.",
    internalLinks: [
      "/tools/merge-pdf",
      "/tools/split-pdf",
      "/tools/compress-pdf",
      "/tools/pdf-studio",
      "/tools/word-to-pdf",
      "/category/image-tools",
    ],
    indexable: true,
  },
  {
    path: "/category/image-tools",
    slug: "image-tools",
    title: "Free Online Image Tools — Compress, Resize & Crop",
    description:
      "Compress images to an exact KB size, resize by pixels or presets, crop to a ratio or circle, and convert JPG, PNG, WebP, AVIF and TIFF — all on your device.",
    h1: "Image Tools",
    primaryKeyword: "free image tools",
    secondaryKeywords: [
      "image compressor online",
      "resize image in pixels",
      "crop image free",
      "convert webp to jpg",
      "compress image for form upload",
    ],
    intent: "transactional",
    researchId: "category-image",
    alternativeTitles: [
      "Image Compressor, Resizer and Converter — Free",
      "Photo Tools That Never Upload Your Files",
    ],
    alternativeDescription:
      "Four tools that cover the photo jobs people actually search for: making a file smaller for an upload limit, hitting an exact pixel size, cropping, and changing format.",
    internalLinks: [
      "/tools/image-compressor",
      "/tools/image-resizer",
      "/tools/image-cropper",
      "/tools/image-to-image",
      "/category/pdf-tools",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/category/qr-barcode",
    slug: "qr-barcode",
    title: "QR Code Generator & Scanner — Free Online Tools",
    description:
      "Create QR codes for links, Wi-Fi, vCards and UPI payments, scan them from a camera or screenshot, and generate or decode GS1 and retail barcodes.",
    h1: "QR & Barcode",
    primaryKeyword: "qr code and barcode tools",
    secondaryKeywords: [
      "qr code generator with logo",
      "qr code scanner online",
      "barcode generator ean 13",
      "gs1 128 label",
      "batch barcode from csv",
    ],
    intent: "transactional",
    researchId: "category-qr",
    alternativeTitles: [
      "QR & Barcode Toolkit — Generate, Scan, Verify",
      "Create and Read QR Codes and Barcodes Online",
    ],
    alternativeDescription:
      "Nine tools behind one category: a styled QR generator, a scanner that reads images as well as cameras, retail and GS1 barcode encoders, and a bulk CSV studio.",
    internalLinks: [
      "/tools/qr-generator",
      "/tools/qr-code-scanner",
      "/tools/barcode-generator",
      "/tools/barcode-scanner",
      "/guides/barcode",
      "/category/developer-tools",
    ],
    indexable: true,
  },
  {
    path: "/category/text-writing",
    slug: "text-writing",
    title: "Text & OCR Tools — Word Counter & Case Converter",
    description:
      "Count words and characters against a limit, convert between ten text cases, and turn photos or scans into editable text in eight languages, including Hindi.",
    h1: "Text & Writing",
    primaryKeyword: "text tools online",
    secondaryKeywords: [
      "word counter online",
      "case converter",
      "image to text ocr hindi",
      "character count for essay",
      "screenshot to text",
    ],
    intent: "transactional",
    researchId: "category-text",
    alternativeTitles: [
      "Word Counter, Case Converter and OCR — Free",
      "Text Tools for Writing Limits and Scanned Pages",
    ],
    alternativeDescription:
      "Three tools for the rules around writing: how long a draft is, how it is capitalised, and how to get text out of a picture you cannot select from.",
    internalLinks: [
      "/tools/word-counter",
      "/tools/case-converter",
      "/tools/image-to-text",
      "/category/developer-tools",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/category/developer-tools",
    slug: "developer-tools",
    title: "Developer Tools — JSON, Minifiers, Regex & Hashes",
    description:
      "Format and validate JSON, XML and HTML, minify CSS and JavaScript, test regex in a worker, encode Base64 and URLs, and generate UUIDs or hashes locally.",
    h1: "Developer Tools",
    primaryKeyword: "developer tools online",
    secondaryKeywords: [
      "json formatter",
      "javascript minifier",
      "regex tester",
      "base64 encoder",
      "sha256 hash generator",
    ],
    intent: "transactional",
    researchId: "category-dev",
    alternativeTitles: [
      "Browser Dev Utilities — Format, Minify, Encode",
      "Eleven Developer Tools That Never Upload Input",
    ],
    alternativeDescription:
      "The checks developers make all day: is this valid, what is wrong with it, how big is it, and what does this string actually encode — answered in the tab.",
    internalLinks: [
      "/tools/json-formatter",
      "/tools/regex-tester",
      "/tools/hash-generator",
      "/tools/base64-encoder-decoder",
      "/category/text-writing",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/category/calculators",
    slug: "calculators",
    title: "Online Calculators — EMI, GST, BMI & Unit Tools",
    description:
      "Calculate EMI and loan schedules, Indian GST with CGST/SGST or IGST split, discounts, percentages, BMI, exact age, business days and unit conversions locally.",
    h1: "Calculators",
    primaryKeyword: "online calculators",
    secondaryKeywords: [
      "emi calculator",
      "gst calculator india",
      "bmi calculator",
      "percentage calculator",
      "age calculator by date of birth",
    ],
    intent: "transactional",
    researchId: "category-calc",
    alternativeTitles: [
      "EMI, GST and Everyday Calculators — Free",
      "Twelve Calculators That Show Their Working",
    ],
    alternativeDescription:
      "Money, dates and measurements side by side, each one printing the formula it used and refusing input that cannot be true — a temperature below absolute zero, say.",
    internalLinks: [
      "/tools/emi-calculator",
      "/tools/gst-calculator",
      "/tools/bmi-calculator",
      "/tools/percentage-calculator",
      "/category/text-writing",
      "/category/pdf-tools",
    ],
    indexable: true,
  },
  {
    path: "/category/security-privacy",
    slug: "security-privacy",
    title: "Security & Privacy Tools — Local, Honest Limits",
    description:
      "Generate passwords, encrypt text and files, hash and compare checksums, review DNS and email authentication, and inspect metadata — all locally.",
    h1: "Security & Privacy",
    primaryKeyword: "security and privacy tools",
    secondaryKeywords: [
      "password generator",
      "encrypt text online",
      "spf dkim dmarc checker",
      "remove exif metadata",
      "privacy policy generator",
    ],
    intent: "informational",
    researchId: "category-security",
    alternativeTitles: [
      "Privacy Tools That Run in Your Browser",
      "Password, Encryption and DNS Review Tools",
    ],
    alternativeDescription:
      "Nine suites covering credentials, cryptography, email authentication and metadata, each stating what it can verify and what only a server or a lawyer can.",
    internalLinks: [
      "/tools/password-generator",
      "/tools/advanced-cryptography",
      "/tools/dns-email-security",
      "/tools/website-security-review",
      "/category/developer-tools",
      "/security",
    ],
    indexable: true,
  },
  {
    path: "/category/ai-tools",
    slug: "ai-tools",
    title: "AI Tools — Roadmap Category, Not Yet Published",
    description:
      "AI-assisted document and text utilities are on the QUICKKIT roadmap. Until they ship, explore the published PDF, image, OCR, QR, developer and calculator tools.",
    h1: "AI Tools",
    primaryKeyword: "ai document tools",
    secondaryKeywords: [
      "ai pdf summariser",
      "ai ocr tools",
      "ai writing tools free",
    ],
    intent: "informational",
    researchId: "category-ai",
    alternativeTitles: [
      "AI Tools on the Roadmap — Not Published Yet",
      "Planned AI Utilities — Use Today's Tools",
    ],
    alternativeDescription:
      "This category has no published tool yet, so it is not indexed. Every working QUICKKIT tool is listed under its own category until something ships here.",
    internalLinks: ["/tools", "/category/pdf-tools", "/category/text-writing"],
    indexable: false,
  },
  {
    path: "/category/hr-payroll",
    slug: "hr-payroll",
    title: "HR & Payroll Tools — Salary, PF & Letters",
    description:
      "Salary-to-take-home in India with PF, ESI, professional tax and income tax shown line by line, plus gratuity, attendance, leave and HR letters — all local.",
    h1: "HR & Payroll Tools",
    primaryKeyword: "hr and payroll tools",
    secondaryKeywords: [
      "indian salary calculator tools",
      "pf esi professional tax calculator",
      "hr letters and formats",
      "attendance and leave calculator",
      "gratuity and full and final settlement",
    ],
    intent: "transactional",
    researchId: "hr-payroll-hub",
    alternativeTitles: [
      "Payroll Calculators & HR Documents for India",
      "Salary, PF, Gratuity and HR Letter Tools",
    ],
    alternativeDescription:
      "Work out take-home pay, PF, ESI, professional tax and gratuity with every rate disclosed, then generate the letters and registers that support them.",
    internalLinks: [
      "/category/career-jobs",
      "/tools/salary-calculator-india",
      "/tools/gratuity-calculator",
    ],
    indexable: true,
  },
  {
    path: "/category/seo-growth",
    slug: "seo-growth",
    title: "SEO Tools — SERP Preview, Schema & Page Audit",
    description:
      "Check title pixel width and SERP truncation, audit on-page keywords and readability, build valid JSON-LD, robots.txt and sitemaps — computed honestly, locally.",
    h1: "SEO & Website Growth Tools",
    primaryKeyword: "seo tools",
    secondaryKeywords: [
      "serp preview and title length checker",
      "meta description generator",
      "json-ld structured data generator",
      "robots txt and sitemap generator",
      "on-page seo audit tool",
    ],
    intent: "transactional",
    researchId: "seo-growth-hub",
    alternativeTitles: [
      "Free SEO Analysis & Schema Tools",
      "On-Page SEO, Schema and Robots Tools",
    ],
    alternativeDescription:
      "Measure what a browser can actually measure: title pixels, keyword use, readability, duplicate copy, structured data validity and crawl directives.",
    internalLinks: [
      "/category/developer-tools",
      "/category/text-writing",
      "/tools/serp-preview",
    ],
    indexable: true,
  },
  {
    path: "/category/career-jobs",
    slug: "career-jobs",
    title: "Career Tools — Resume Check, Salary & Letters",
    description:
      "Check resume readiness against a real job description, compare offers after Indian tax, plan notice periods and write the follow-ups — all processed locally.",
    h1: "Career & Jobs Tools",
    primaryKeyword: "career tools",
    secondaryKeywords: [
      "resume ats check against job description",
      "salary comparison after tax india",
      "cover letter and follow up generator",
      "notice period and buyout calculator",
      "interview preparation checklist",
    ],
    intent: "transactional",
    researchId: "career-jobs-hub",
    alternativeTitles: [
      "Job Search Tools — Resume, Salary, Letters",
      "Resume Analysis and Salary Calculators",
    ],
    alternativeDescription:
      "Measure your resume against the job you want, work out what an offer is worth after tax, and generate the letters you need next.",
    internalLinks: [
      "/category/hr-payroll",
      "/category/text-writing",
      "/tools/resume-ats-checker",
    ],
    indexable: true,
  },
];
