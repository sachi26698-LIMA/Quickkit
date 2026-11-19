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
  {
    slug: "salary-calculator-india",
    name: "Salary Calculator (India)",
    category: "HR & Payroll",
  },
  {
    slug: "in-hand-salary-calculator",
    name: "In-Hand Salary Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "income-tax-calculator",
    name: "Income Tax Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "pf-calculator",
    name: "PF Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "esi-calculator",
    name: "ESI Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "gratuity-calculator",
    name: "Gratuity Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "full-and-final-settlement",
    name: "Full and Final Settlement",
    category: "HR & Payroll",
  },
  {
    slug: "leave-encashment-calculator",
    name: "Leave Encashment Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "attendance-calculator",
    name: "Attendance Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "overtime-calculator",
    name: "Overtime Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "shift-hours-calculator",
    name: "Shift Hours Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "salary-slip-generator",
    name: "Salary Slip Generator",
    category: "HR & Payroll",
  },
  {
    slug: "offer-letter-generator",
    name: "Offer Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "experience-letter-generator",
    name: "Experience Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "relieving-letter-generator",
    name: "Relieving Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "warning-letter-generator",
    name: "Warning Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "appreciation-letter-generator",
    name: "Appreciation Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "increment-letter-generator",
    name: "Increment Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "termination-letter-generator",
    name: "Termination Letter Generator",
    category: "HR & Payroll",
  },
  {
    slug: "internship-certificate-generator",
    name: "Internship Certificate Generator",
    category: "HR & Payroll",
  },
  {
    slug: "job-description-generator",
    name: "Job Description Generator",
    category: "HR & Payroll",
  },
  {
    slug: "kpi-sheet-generator",
    name: "KPI Sheet Generator",
    category: "HR & Payroll",
  },
  {
    slug: "interview-plan-generator",
    name: "Interview Plan Generator",
    category: "HR & Payroll",
  },
  {
    slug: "probation-period-calculator",
    name: "Probation Period Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "statutory-leave-calculator",
    name: "Statutory Leave Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "working-days-calculator",
    name: "Working Days Calculator",
    category: "HR & Payroll",
  },
  {
    slug: "serp-preview",
    name: "SERP Preview",
    category: "SEO & Website Growth",
  },
  {
    slug: "keyword-density-checker",
    name: "Keyword Density Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "readability-checker",
    name: "Readability Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "on-page-audit",
    name: "On-Page Audit",
    category: "SEO & Website Growth",
  },
  {
    slug: "duplicate-content-checker",
    name: "Duplicate Content Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "keyword-cannibalisation-checker",
    name: "Keyword Cannibalisation Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "organization-schema-generator",
    name: "Organization Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "article-schema-generator",
    name: "Article Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "faq-schema-generator",
    name: "FAQ Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "product-schema-generator",
    name: "Product Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "local-business-schema-generator",
    name: "Local Business Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "job-posting-schema-generator",
    name: "Job Posting Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "breadcrumb-schema-generator",
    name: "Breadcrumb Schema Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "json-ld-validator",
    name: "JSON-LD Validator",
    category: "SEO & Website Growth",
  },
  {
    slug: "robots-txt-generator",
    name: "robots.txt Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "robots-txt-validator",
    name: "robots.txt Validator",
    category: "SEO & Website Growth",
  },
  {
    slug: "sitemap-generator",
    name: "Sitemap Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "sitemap-validator",
    name: "Sitemap Validator",
    category: "SEO & Website Growth",
  },
  {
    slug: "canonical-checker",
    name: "Canonical Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "hreflang-checker",
    name: "Hreflang Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "redirect-checker",
    name: "Redirect Checker",
    category: "SEO & Website Growth",
  },
  {
    slug: "title-generator",
    name: "Title Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "meta-description-generator",
    name: "Meta Description Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "content-brief-generator",
    name: "Content Brief Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "headline-generator",
    name: "Headline Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "alt-text-generator",
    name: "Alt Text Generator",
    category: "SEO & Website Growth",
  },
  {
    slug: "internal-link-suggestions",
    name: "Internal Link Suggestions",
    category: "SEO & Website Growth",
  },
  {
    slug: "topic-cluster-builder",
    name: "Topic Cluster Builder",
    category: "SEO & Website Growth",
  },
  {
    slug: "resume-ats-checker",
    name: "Résumé ATS Checker",
    category: "Career & Jobs",
  },
  {
    slug: "resume-keyword-matcher",
    name: "Résumé Keyword Matcher",
    category: "Career & Jobs",
  },
  {
    slug: "resume-bullet-improver",
    name: "Résumé Bullet Improver",
    category: "Career & Jobs",
  },
  {
    slug: "resume-summary-generator",
    name: "Résumé Summary Generator",
    category: "Career & Jobs",
  },
  {
    slug: "resume-comparison",
    name: "Résumé Comparison",
    category: "Career & Jobs",
  },
  {
    slug: "salary-converter",
    name: "Salary Converter",
    category: "Career & Jobs",
  },
  {
    slug: "contractor-rate-calculator",
    name: "Contractor Rate Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "offer-comparison-calculator",
    name: "Offer Comparison Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "total-compensation-calculator",
    name: "Total Compensation Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "equity-vesting-calculator",
    name: "Equity Vesting Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "relocation-calculator",
    name: "Relocation Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "marginal-tax-rate",
    name: "Marginal Tax Rate Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "notice-buyout-calculator",
    name: "Notice Buyout Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "notice-period-calculator",
    name: "Notice Period Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "experience-calculator",
    name: "Experience Calculator",
    category: "Career & Jobs",
  },
  {
    slug: "cover-letter-generator",
    name: "Cover Letter Generator",
    category: "Career & Jobs",
  },
  {
    slug: "follow-up-generator",
    name: "Follow-Up Message Generator",
    category: "Career & Jobs",
  },
  {
    slug: "star-answer-builder",
    name: "STAR Answer Builder",
    category: "Career & Jobs",
  },
  {
    slug: "linkedin-about-generator",
    name: "LinkedIn About Generator",
    category: "Career & Jobs",
  },
  {
    slug: "interview-prep-plan",
    name: "Interview Prep Plan",
    category: "Career & Jobs",
  },
  {
    slug: "availability-statement",
    name: "Availability Statement",
    category: "Career & Jobs",
  },
];
