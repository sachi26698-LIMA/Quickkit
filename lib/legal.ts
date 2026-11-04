// ─────────────────────────────────────────────────────────────────────────────
// Legal & information page registry.
//
// One source of truth for: every legal/information route, its title,
// description, nav group and cross-references. The footer, the sitemap, the
// page shell's "related pages" sidebar and the sitemap page all read from here,
// so a route can never drift out of sync with its links.
//
// No company registration number, address, jurisdiction or legal contact is
// invented anywhere in these records. Anything the operator must supply lives
// in `OWNER_DETAILS_REQUIRED` (lib/legal.ts → docs/LEGAL_PAGES.md) and is shown
// to the reader as an explicitly marked placeholder.
// ─────────────────────────────────────────────────────────────────────────────

/** The date the current *draft* text was written. Not a legal approval date. */
export const LEGAL_LAST_UPDATED = "4 November 2026";
export const LEGAL_LAST_UPDATED_ISO = "2026-11-04";

export type LegalGroup = "company" | "legal" | "trust" | "tools";

export type LegalPage = {
  /** Route, always leading slash. */
  href: string;
  /** Navigation label (short, used in the footer). */
  navLabel: string;
  /** Page <h1>. */
  title: string;
  /** Short line under the title. */
  intro: string;
  /** Meta description (40–160 chars). */
  description: string;
  group: LegalGroup;
  /** Anchor id used by the Table of Contents and section headings. */
  sections: { id: string; label: string }[];
  /** Whether this page should be listed in the XML sitemap when indexing is on. */
  indexable: boolean;
};

/**
 * Anchor ids for the shared documents. Kept next to the registry so the table
 * of contents and the page body cannot disagree about an id.
 */

export const legalPages: LegalPage[] = [
  {
    href: "/terms",
    navLabel: "Terms & Conditions",
    title: "Terms and Conditions",
    intro:
      "The rules for using QUICKKIT: what you may do with the tools, what we ask of you, and the limits of what we promise.",
    description:
      "The terms for using QUICKKIT's free browser tools: acceptable use, your content, availability, disclaimers, liability and the governing-law position.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "acceptance", label: "Acceptance of these terms" },
      { id: "the-service", label: "What QUICKKIT provides" },
      { id: "accounts", label: "No accounts or registration" },
      { id: "acceptable-use", label: "Acceptable use" },
      { id: "user-responsibilities", label: "Your responsibilities" },
      { id: "prohibited", label: "Prohibited activities" },
      { id: "your-content", label: "Your content" },
      { id: "ip", label: "Intellectual property" },
      { id: "third-party", label: "Third-party services and links" },
      { id: "availability", label: "Service availability" },
      { id: "limitations", label: "Feature limitations" },
      { id: "liability", label: "Limitation of liability" },
      { id: "changes", label: "Changes to the service and these terms" },
      { id: "law", label: "Governing law and disputes" },
      { id: "contact", label: "Contact" },
    ],
  },
  {
    href: "/privacy",
    navLabel: "Privacy Policy",
    title: "Privacy Policy",
    intro:
      "What QUICKKIT actually collects, what stays in your browser, and what never leaves your device.",
    description:
      "How QUICKKIT handles data: no accounts, no analytics, browser-local tool processing, the local-storage keys used and where ordinary hosting requests apply.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "summary", label: "The short version" },
      { id: "what-we-collect", label: "Information we collect" },
      { id: "accounts", label: "Accounts and registration" },
      { id: "local-processing", label: "Browser-local processing" },
      { id: "uploads", label: "Do files leave my device?" },
      { id: "storage", label: "Cookies and browser storage" },
      { id: "analytics", label: "Analytics and tracking" },
      { id: "third-party", label: "Third-party integrations" },
      { id: "hosting", label: "Hosting and server requests" },
      { id: "retention", label: "Data retention and deletion" },
      { id: "security", label: "Security measures" },
      { id: "children", label: "Children's privacy" },
      { id: "rights", label: "Your privacy rights" },
      { id: "contact", label: "Contact and policy updates" },
    ],
  },
  {
    href: "/cookies",
    navLabel: "Cookie Policy",
    title: "Cookie Policy",
    intro:
      "QUICKKIT sets no tracking cookies. Here is exactly what is stored in your browser, why, and how to remove it.",
    description:
      "QUICKKIT uses no analytics or advertising cookies. A complete list of the local-storage and IndexedDB entries the site can create, and how to manage them.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "summary", label: "The short version" },
      { id: "what-are-cookies", label: "Cookies and local storage explained" },
      { id: "essential", label: "Essential storage" },
      { id: "functional", label: "Functional storage" },
      { id: "analytics", label: "Analytics cookies" },
      { id: "advertising", label: "Advertising cookies" },
      { id: "inventory", label: "Full storage inventory" },
      { id: "consent", label: "Consent" },
      { id: "third-party", label: "Third-party cookies" },
      { id: "managing", label: "Managing and deleting storage" },
      { id: "changes", label: "Changes to this policy" },
      { id: "contact", label: "Contact" },
    ],
  },
  {
    href: "/disclaimer",
    navLabel: "Disclaimer",
    title: "Disclaimer",
    intro:
      "What the tools estimate, where they approximate, and why you should verify important results.",
    description:
      "QUICKKIT's disclaimers: calculation accuracy, image and PDF conversion limits, OCR limits, QR verification, and no legal, financial or medical advice.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "general", label: "General information only" },
      {
        id: "no-professional-advice",
        label: "No legal, financial or medical advice",
      },
      { id: "calculations", label: "Accuracy of calculations" },
      { id: "financial", label: "Financial calculations" },
      { id: "images", label: "Image compression and conversion quality" },
      { id: "pdf", label: "PDF conversion limitations" },
      { id: "ocr", label: "OCR and text recognition" },
      { id: "translation", label: "Translation (planned feature)" },
      { id: "qr", label: "QR codes and scanning" },
      { id: "third-party", label: "Third-party tools and dependencies" },
      { id: "availability", label: "Availability and compatibility" },
      { id: "estimated-vs-guaranteed", label: "Estimates versus guarantees" },
      { id: "contact", label: "Questions" },
    ],
  },
  {
    href: "/about",
    navLabel: "About QUICKKIT",
    title: "About Us",
    intro:
      "A free browser toolkit for the small tasks that interrupt a working day — built to run on your device.",
    description:
      "What QUICKKIT is, the categories it covers, how the tools process data locally, which devices are supported and what is on the roadmap.",
    group: "company",
    indexable: true,
    sections: [
      { id: "mission", label: "Mission and purpose" },
      { id: "whats-inside", label: "Main tool categories" },
      { id: "privacy", label: "How privacy is designed in" },
      { id: "devices", label: "Supported devices and browsers" },
      { id: "philosophy", label: "Product philosophy" },
      { id: "roadmap", label: "Future development" },
      { id: "operator", label: "Who runs QUICKKIT" },
      { id: "more", label: "Where to go next" },
    ],
  },
  {
    href: "/contact",
    navLabel: "Contact",
    title: "Contact Us",
    intro:
      "General questions, bug reports, privacy requests, copyright complaints and business enquiries — here is where each one goes.",
    description:
      "Contact QUICKKIT for support, bug reports, privacy requests, security reports, copyright complaints or business enquiries, with verified channels pending.",
    group: "company",
    indexable: true,
    sections: [
      { id: "channels", label: "Where to send what" },
      { id: "form", label: "Send a message" },
      { id: "response", label: "Response times" },
      { id: "security", label: "Security reports" },
      { id: "privacy-requests", label: "Privacy requests" },
      { id: "copyright", label: "Copyright complaints" },
      { id: "business", label: "Business enquiries" },
      { id: "before-you-write", label: "Before you write" },
    ],
  },
  {
    href: "/faq",
    navLabel: "FAQ",
    title: "Frequently Asked Questions",
    intro:
      "Direct answers about privacy, accounts, file handling, results and using QUICKKIT day to day.",
    description:
      "Answers to common QUICKKIT questions: whether files are uploaded, why there is no account, what the tools cannot do, and how to report a problem.",
    group: "company",
    indexable: true,
    sections: [
      { id: "privacy", label: "Privacy and your files" },
      { id: "accounts", label: "Accounts and pricing" },
      { id: "results", label: "Tools and results" },
      { id: "devices", label: "Browsers and devices" },
      { id: "support", label: "Getting help" },
      { id: "legal", label: "Policies" },
    ],
  },
  {
    href: "/copyright",
    navLabel: "Copyright Policy",
    title: "Copyright and DMCA Policy",
    intro:
      "How QUICKKIT handles copyright in its own materials, and how to report material you believe infringes yours.",
    description:
      "QUICKKIT's copyright position: ownership of branding and content, third-party licences, how to file a takedown notice and the counter-notification process.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "ownership", label: "QUICKKIT's own material" },
      { id: "third-party-ip", label: "Third-party intellectual property" },
      { id: "user-outputs", label: "Your files and outputs" },
      { id: "reporting", label: "Reporting infringement" },
      { id: "dmca", label: "DMCA notice process" },
      { id: "counter-notice", label: "Counter-notification" },
      { id: "repeat-infringers", label: "Repeat infringers" },
      { id: "misrepresentation", label: "Misrepresentation and misuse" },
      { id: "contact", label: "Designated contact" },
    ],
  },
  {
    href: "/accessibility",
    navLabel: "Accessibility",
    title: "Accessibility Statement",
    intro:
      "What works today with a keyboard and a screen reader, and the accessibility gaps we already know about.",
    description:
      "QUICKKIT's accessibility commitments: keyboard navigation, screen reader support, contrast, focus visibility and documented known limitations.",
    group: "trust",
    indexable: true,
    sections: [
      { id: "commitment", label: "Our commitment" },
      { id: "keyboard", label: "Keyboard navigation" },
      { id: "screen-readers", label: "Screen readers and semantics" },
      { id: "contrast", label: "Colour and contrast" },
      { id: "focus", label: "Focus visibility" },
      { id: "forms", label: "Forms and error messages" },
      { id: "responsive", label: "Responsive and zoomed layouts" },
      { id: "motion", label: "Motion and animation" },
      { id: "testing", label: "How this is tested" },
      { id: "limitations", label: "Known limitations" },
      { id: "feedback", label: "Accessibility feedback" },
      { id: "standards", label: "Standards and status" },
    ],
  },
  {
    href: "/security",
    navLabel: "Security Policy",
    title: "Security Policy",
    intro:
      "How QUICKKIT is built and served securely, what the browser-side model does and does not protect, and how to report a vulnerability.",
    description:
      "QUICKKIT security practices: secure development, browser-side data handling, security headers, dependency review and the responsible disclosure process.",
    group: "trust",
    indexable: true,
    sections: [
      { id: "model", label: "Security model" },
      { id: "development", label: "Secure development practices" },
      { id: "data-handling", label: "Data handling" },
      { id: "browser-side", label: "Browser-side security" },
      { id: "headers", label: "Response headers and transport" },
      { id: "dependencies", label: "External dependencies" },
      { id: "reporting", label: "Reporting a vulnerability" },
      { id: "disclosure", label: "Responsible disclosure" },
      { id: "scope", label: "Out of scope" },
      { id: "contact", label: "Security contact" },
      { id: "no-certifications", label: "Certifications and compliance" },
    ],
  },
  {
    href: "/file-handling",
    navLabel: "File Handling Policy",
    title: "Data Processing and File Handling Policy",
    intro:
      "Tool by tool: where your file goes, what is kept in memory, what is written to storage, and when it is deleted.",
    description:
      "How each QUICKKIT tool handles files: local processing, memory, browser storage, downloads, retention and deletion, and where tools differ.",
    group: "trust",
    indexable: true,
    sections: [
      { id: "principles", label: "How processing works" },
      { id: "file-selection", label: "File selection" },
      { id: "memory", label: "Temporary memory" },
      { id: "browser-storage", label: "Browser storage" },
      { id: "per-tool", label: "Tool-by-tool processing" },
      { id: "pdf-merger", label: "PDF Merger" },
      { id: "pdf-splitter", label: "PDF Splitter" },
      { id: "pdf-compressor", label: "PDF Compressor" },
      { id: "pdf-to-word", label: "PDF to Word (with optional OCR)" },
      { id: "pdf-translator", label: "PDF Translator (not implemented)" },
      { id: "image-to-image", label: "Image to Image Converter" },
      { id: "images-to-pdf", label: "Images to PDF" },
      { id: "pdf-to-image", label: "PDF to Image" },
      { id: "pdf-studio", label: "PDF Studio" },
      { id: "qr-generator", label: "QR Code Generator" },
      { id: "calculators", label: "Calculators and other browser tools" },
      { id: "external", label: "External processing dependencies" },
      { id: "downloads", label: "Download handling" },
      { id: "retention", label: "Retention and deletion" },
      { id: "limitations", label: "Technical limitations" },
    ],
  },
  {
    href: "/intellectual-property",
    navLabel: "Intellectual Property",
    title: "Intellectual Property Policy",
    intro:
      "What QUICKKIT owns, what it licenses from others, and what you may and may not do with the site's material.",
    description:
      "QUICKKIT's intellectual property position: brand and content ownership, open-source licences, permitted use and how to request permission.",
    group: "legal",
    indexable: true,
    sections: [
      { id: "quicksummary", label: "Summary" },
      { id: "brand", label: "Brand and site content" },
      { id: "open-source", label: "Open-source components" },
      { id: "fonts-icons", label: "Fonts and icons" },
      { id: "permitted", label: "Permitted use" },
      { id: "not-permitted", label: "Uses that need permission" },
      { id: "user-content", label: "Your content and outputs" },
      { id: "permission", label: "Requesting permission" },
      { id: "contact", label: "Contact" },
    ],
  },
];

export const legalPageByHref = (href: string): LegalPage | undefined =>
  legalPages.find((page) => page.href === href);

/** Pages the operator must review or complete before publication. */
export const legalPagesRequiringOwnerInput = [
  "/terms",
  "/privacy",
  "/cookies",
  "/disclaimer",
  "/copyright",
  "/security",
  "/contact",
  "/intellectual-property",
] as const;

/** Footer column definitions — the single source for both footer variants. */
export const footerGroups: {
  id: LegalGroup;
  heading: string;
  links: { href: string; label: string }[];
}[] = [
  {
    id: "tools",
    heading: "Tools",
    links: [
      { href: "/tools", label: "All Tools" },
      { href: "/#categories", label: "Categories" },
      { href: "/category/pdf-tools", label: "PDF Tools" },
      { href: "/category/image-tools", label: "Image Tools" },
      { href: "/category/qr-barcode", label: "QR & Barcode" },
      { href: "/category/calculators", label: "Calculators" },
    ],
  },
  {
    id: "company",
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
      { href: "/help", label: "Help Center" },
    ],
  },
  {
    id: "legal",
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/copyright", label: "Copyright Policy" },
      { href: "/intellectual-property", label: "Intellectual Property" },
    ],
  },
  {
    id: "trust",
    heading: "Trust & Security",
    links: [
      { href: "/security", label: "Security Policy" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/file-handling", label: "File Handling Policy" },
      { href: "/sitemap", label: "Sitemap" },
    ],
  },
];
