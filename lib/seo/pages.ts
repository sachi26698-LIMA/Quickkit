// ─────────────────────────────────────────────────────────────────────────────
// Non-tool route metadata: the homepage, the index hubs, the guide, and the
// twelve policy/trust pages.
//
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------------
// `lib/seo/tools.ts` and `lib/seo/categories.ts` cover every tool and category
// route. Everything else — the page a visitor lands on first, the two index
// pages, the help centre, the barcode guide, the HTML sitemap, `/contact` and
// the policy pages — had its title written inline in a page component. That
// meant nobody could answer "is any page's title a duplicate of another, and
// does the portfolio still fit in 60 characters?" without reading 18 files.
//
// The rules here are the same as the tool registry:
//
//   • titles are stored WITHOUT the ` | QUICKKIT` suffix, ≤49 characters, so the
//     rendered title stays inside the 60-character SERP budget;
//   • descriptions target 130–160 characters — shorter than the tool target
//     because an index or policy page has to state what it is, not sell a task;
//   • the brand is never repeated inside a title (the template appends it);
//   • every record states intent, a keyword cluster, the H1 it was written for,
//     the research it rests on, and the routes it should link onward to.
//
// POLICY PAGE COPY IS NOT DUPLICATED HERE
// ---------------------------------------------------------------------------
// `lib/legal.ts` is the single source of truth for a policy page's visible
// title and description, and it is already covered by its own test suite.
// Duplicating those strings would create two places to forget. Instead the
// legal records below carry only the *search* layer — title composition,
// keyword, intent, research id, internal links — and read the description from
// `lib/legal.ts` at construction time. If the two ever disagree, the audit
// fails.
//
// The research behind these records is in `docs/seo/RESEARCH_LOG.md` under the
// page-level section, keyed by `researchId`.
// ─────────────────────────────────────────────────────────────────────────────
import { legalPageByHref } from "@/lib/legal";
import type { SearchIntent } from "./registry";

/** One non-tool route's search metadata. */
export type PageSeoRecord = {
  /** Route path, always leading slash. The registry key. */
  path: string;
  /** `<title>` text WITHOUT the ` | QUICKKIT` suffix. */
  title: string;
  /** Meta description. Editorial target 130–160 characters. */
  description: string;
  /** The H1 the page renders. */
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: SearchIntent;
  /** Key into `docs/seo/RESEARCH_LOG.md`. */
  researchId: string;
  alternativeTitles: [string, string];
  alternativeDescription: string;
  internalLinks: string[];
  indexable: boolean;
  localPhrasing?: string[];
};

/**
 * Placeholder for a live catalogue count.
 *
 * The homepage and `/tools` genuinely change when the operator publishes a tool,
 * and a hard-coded "56" would be wrong within a week. The placeholder is
 * substituted once, at resolve time, from the same catalogue the page renders —
 * so the `<title>`, the description and the visible H1 count cannot disagree.
 */
export const COUNT_PLACEHOLDER = "{count}";

const HUB_PAGE_SEO: PageSeoRecord[] = [
  {
    path: "/",
    // Researched: the head query cluster is "free online tools" plus the format
    // nouns people actually type ("pdf tools", "image tools", "qr code
    // generator"). The title names the four formats QUICKKIT leads with, because
    // a generic "all in one tools" title loses to aggregators with 300+ pages.
    title: "Free Online PDF, Image, QR, Code & Math Tools",
    description: `Use {count} free online tools for PDFs, images, OCR, QR codes, JSON, code and calculators. Browser-first, no account needed; most files never leave your device.`,
    h1: "Free online tools for PDFs, images, text and code",
    primaryKeyword: "free online tools",
    secondaryKeywords: [
      "free pdf tools",
      "free image tools",
      "online tools no signup",
      "browser tools no upload",
      "free qr code generator",
      "free json formatter",
    ],
    intent: "transactional",
    researchId: "page-home",
    alternativeTitles: [
      "Free PDF, Image, OCR & Developer Tools Online",
      "56 Browser Tools for PDF, Images, Text & Code",
    ],
    alternativeDescription:
      "PDF, image, OCR, QR, code and calculator tools that run in your browser. No account, no install, no watermark; most files never leave your device.",
    internalLinks: [
      "/tools",
      "/category/pdf-tools",
      "/category/image-tools",
      "/category/qr-barcode",
      "/guides/barcode",
      "/help",
    ],
    indexable: true,
    localPhrasing: [
      "compress pdf to 100kb for indian exam forms",
      "gst calculator india",
      "hindi gujarati ocr",
    ],
  },
  {
    path: "/tools",
    // Researched: the second-hop query after someone bounces off an aggregator —
    // "all online tools", "free tools list", "list of pdf tools". Naming the
    // count in the title is the one honest differentiator a 56-tool catalogue
    // has against a 300-tool competitor, so it stays.
    title: "All {count} Free Online Tools — PDF, Image & Code",
    description: `Browse all {count} published QUICKKIT tools by category: PDF, image, OCR, QR and barcode, developer, text, calculator and security utilities.`,
    h1: "Every tool in one calm place",
    primaryKeyword: "free online tools list",
    secondaryKeywords: [
      "all online tools",
      "free tools list",
      "browse pdf tools",
      "tool categories",
      "free utility website",
    ],
    intent: "transactional",
    researchId: "page-tools-index",
    alternativeTitles: [
      "Browse Every Free Tool — PDF, Image, OCR & Code",
      "Free Online Tool Directory — {count} Utilities",
    ],
    alternativeDescription:
      "The full index of QUICKKIT utilities with categories, search and filters. PDF and image converters, OCR, QR codes, JSON and text tools, calculators.",
    internalLinks: [
      "/category/pdf-tools",
      "/category/image-tools",
      "/category/qr-barcode",
      "/category/text-writing",
      "/category/developer-tools",
      "/category/calculators",
      "/category/security-privacy",
    ],
    indexable: true,
  },
  {
    path: "/help",
    // Researched: support-intent queries — "is this tool free", "why did my file
    // not convert", "does it upload my file". The title names the three things
    // people are actually asking about rather than "Support".
    title: "Help Center — Tool Guides, Privacy & Support",
    description:
      "Guides for QUICKKIT tools: how browser-local processing works, the Word to PDF upload exception, browser support, real file limits and contact routes.",
    h1: "How can we help",
    primaryKeyword: "online tools help center",
    secondaryKeywords: [
      "why is my pdf not converting",
      "does this site upload my files",
      "tool limits explained",
      "browser support",
      "how to save favourites",
    ],
    intent: "informational",
    researchId: "page-help",
    alternativeTitles: [
      "Help & Guides — How QUICKKIT Tools Work",
      "Support — File Limits, Privacy & Troubleshooting",
    ],
    alternativeDescription:
      "Answers about processing location, supported browsers, file and page limits, why a conversion can fail, and how to reach a human about a problem.",
    internalLinks: [
      "/faq",
      "/file-handling",
      "/security",
      "/contact",
      "/tools",
      "/guides/barcode",
    ],
    indexable: true,
  },
  {
    path: "/guides/barcode",
    // Researched: "barcode format guide", "code 128 vs qr", "gs1 barcode
    // explained", "barcode check digit". This is the only long-form reference
    // page on the site, so it is written to be citable rather than to sell.
    title: "Barcode Guide — Formats, GS1 Data and Printing",
    description:
      "A practical barcode guide: choosing a symbology, how check digits work, GS1 application identifiers, quiet zones, printing density and what a scan cannot prove.",
    h1: "The barcode guide",
    primaryKeyword: "barcode guide",
    secondaryKeywords: [
      "code 128 vs qr code",
      "gs1 barcode explained",
      "barcode check digit calculator",
      "quiet zone barcode printing",
      "ean 13 vs upc a",
    ],
    intent: "informational",
    researchId: "page-barcode-guide",
    alternativeTitles: [
      "Barcode Formats Explained — GS1, EAN & Code 128",
      "How Barcodes Work — Symbologies, Checks & Printing",
    ],
    alternativeDescription:
      "What each barcode symbology is for, how a check digit is calculated, how GS1 data is structured, and what a scan can never prove about a product.",
    internalLinks: [
      "/tools/barcode-generator",
      "/tools/barcode-scanner",
      "/tools/batch-code-checker",
      "/tools/gs1-intelligence",
      "/tools/barcode-developer",
      "/category/qr-barcode",
    ],
    indexable: true,
  },
  {
    path: "/sitemap",
    // Researched: "site map" / "<brand> sitemap" navigational queries, plus the
    // crawl path for a visitor who wants one page listing every route. The title
    // says HTML sitemap so it is never confused with sitemap.xml.
    title: "HTML Sitemap — All Tools, Categories & Policies",
    description:
      "Every indexable QUICKKIT page in one place: all online tools, every populated tool category, the barcode guide, help pages and each legal and trust policy.",
    h1: "Site Map",
    primaryKeyword: "html sitemap",
    secondaryKeywords: [
      "list of all tools",
      "site index page",
      "quickkit sitemap",
      "all categories",
      "policy pages index",
    ],
    intent: "navigational",
    researchId: "page-html-sitemap",
    alternativeTitles: [
      "Site Index — Every Tool, Category & Policy Page",
      "Browse the Whole Site — Tools, Guides & Policies",
    ],
    alternativeDescription:
      "A human-readable index of the site: each published tool, every category hub, the barcode guide, help pages and the privacy, terms and trust documents.",
    internalLinks: [
      "/tools",
      "/category/pdf-tools",
      "/privacy",
      "/terms",
      "/security",
      "/guides/barcode",
    ],
    indexable: true,
  },
];

/**
 * Search layer for the policy and trust pages.
 *
 * `title` is the full page title (already inside the 49-character raw budget);
 * `description` is read from `lib/legal.ts` so the policy text has one home.
 * These pages exist to be found by people checking whether the site is safe —
 * "is quickkit safe", "does it store my files", "terms of use" — so the intent
 * is `trust` and the internal links point at the documents a reader checks next.
 */
type LegalSeoSeed = {
  href: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: SearchIntent;
  researchId: string;
  alternativeTitles: [string, string];
  alternativeDescription: string;
  internalLinks: string[];
};

const LEGAL_PAGE_SEO: LegalSeoSeed[] = [
  {
    href: "/about",
    title: "About Us — Browser-First Free Online Tools",
    primaryKeyword: "about quickkit",
    secondaryKeywords: [
      "who runs this site",
      "browser based tools",
      "free tools no account",
      "how the tools work",
    ],
    intent: "trust",
    researchId: "page-about",
    alternativeTitles: [
      "About QUICKKIT — Free Tools That Run Locally",
      "Who We Are and How the Tools Process Files",
    ],
    alternativeDescription:
      "What QUICKKIT is, why most tools process files inside the browser, which one deliberately does not, and how the site is paid for.",
    internalLinks: ["/security", "/file-handling", "/contact", "/tools"],
  },
  {
    href: "/contact",
    title: "Contact — support, privacy, security, business",
    primaryKeyword: "contact quickkit",
    secondaryKeywords: [
      "report a bug",
      "privacy request",
      "copyright complaint",
      "security disclosure",
      "business enquiry",
    ],
    intent: "trust",
    researchId: "page-contact",
    alternativeTitles: [
      "Contact QUICKKIT — Support, Privacy & Security",
      "Get in Touch — Bug Reports, Privacy, Copyright",
    ],
    alternativeDescription:
      "Where to send a bug report, a privacy or deletion request, a copyright notice or a security disclosure, and what response to expect for each.",
    internalLinks: ["/help", "/security", "/privacy", "/copyright"],
  },
  {
    href: "/faq",
    title: "Frequently Asked Questions — Privacy & Limits",
    primaryKeyword: "quickkit faq",
    secondaryKeywords: [
      "is it really free",
      "does it upload my files",
      "file size limits",
      "why did conversion fail",
      "do i need an account",
    ],
    intent: "informational",
    researchId: "page-faq",
    alternativeTitles: [
      "FAQ — Free, Private, and What the Limits Are",
      "Common Questions About the Tools and Privacy",
    ],
    alternativeDescription:
      "Short answers to what people ask before using the site: cost, uploads, file limits, accuracy, saved favourites and what happens when a conversion fails.",
    internalLinks: ["/help", "/file-handling", "/privacy", "/contact"],
  },
  {
    href: "/privacy",
    title: "Privacy Policy — how your data is handled",
    primaryKeyword: "privacy policy",
    secondaryKeywords: [
      "does this site store my files",
      "browser local processing",
      "what data is collected",
      "cookie policy",
      "data deletion request",
    ],
    intent: "trust",
    researchId: "page-privacy",
    alternativeTitles: [
      "Privacy Policy — What Stays in Your Browser",
      "How QUICKKIT Handles Data and Local Files",
    ],
    alternativeDescription:
      "What QUICKKIT never receives, what the host and the advertising script do see, what stays in browser storage, and how to ask for deletion.",
    internalLinks: ["/cookies", "/file-handling", "/terms", "/security"],
  },
  {
    href: "/terms",
    title: "Terms and Conditions — rules for using the tools",
    primaryKeyword: "terms and conditions",
    secondaryKeywords: [
      "acceptable use",
      "terms of service",
      "service availability",
      "limitation of liability",
      "governing law",
    ],
    intent: "trust",
    researchId: "page-terms",
    alternativeTitles: [
      "Terms of Use — Acceptable Use and Liability",
      "The Rules for Using QUICKKIT Tools",
    ],
    alternativeDescription:
      "The conditions attached to using the tools: acceptable use, your responsibilities, ownership of your output, availability and the limits of our liability.",
    internalLinks: [
      "/privacy",
      "/disclaimer",
      "/intellectual-property",
      "/contact",
    ],
  },
  {
    href: "/cookies",
    title: "Cookie Policy — what we store and what we don’t",
    primaryKeyword: "cookie policy",
    secondaryKeywords: [
      "does this site use cookies",
      "local storage entries",
      "indexeddb history",
      "adsense cookies",
      "manage cookies",
    ],
    intent: "trust",
    researchId: "page-cookies",
    alternativeTitles: [
      "Cookies & Local Storage — The Full Inventory",
      "What QUICKKIT Stores in Your Browser",
    ],
    alternativeDescription:
      "A named inventory of every cookie, local-storage key and IndexedDB store the site uses, which ones the AdSense script may add, and how to clear them.",
    internalLinks: ["/privacy", "/file-handling", "/security", "/contact"],
  },
  {
    href: "/disclaimer",
    title: "Disclaimer — limits, estimates and accuracy",
    primaryKeyword: "disclaimer",
    secondaryKeywords: [
      "calculator accuracy",
      "ocr accuracy limits",
      "conversion fidelity",
      "not legal advice",
      "not financial advice",
    ],
    intent: "trust",
    researchId: "page-disclaimer",
    alternativeTitles: [
      "Disclaimer — What the Results Can and Cannot Promise",
      "Accuracy Limits for Conversions and Calculators",
    ],
    alternativeDescription:
      "Where results are estimates: OCR confidence, image and PDF conversion fidelity, calculator assumptions, QR verification, and the absence of professional advice.",
    internalLinks: ["/terms", "/help", "/file-handling", "/contact"],
  },
  {
    href: "/copyright",
    title: "Copyright & DMCA Policy — Ownership & Notices",
    primaryKeyword: "copyright policy",
    secondaryKeywords: [
      "dmca takedown",
      "counter notification",
      "content ownership",
      "report infringement",
    ],
    intent: "trust",
    researchId: "page-copyright",
    alternativeTitles: [
      "Copyright Policy — Takedown and Counter-Notice",
      "Content Ownership and How to Report Infringement",
    ],
    alternativeDescription:
      "Who owns the site's writing and design, which parts are open source, who owns what you produce with a tool, and how a takedown notice is handled.",
    internalLinks: [
      "/intellectual-property",
      "/terms",
      "/contact",
      "/accessibility",
    ],
  },
  {
    href: "/accessibility",
    title: "Accessibility Statement — Keyboard & Contrast",
    primaryKeyword: "accessibility statement",
    secondaryKeywords: [
      "keyboard navigation",
      "screen reader support",
      "colour contrast",
      "focus visibility",
      "known accessibility issues",
    ],
    intent: "trust",
    researchId: "page-accessibility",
    alternativeTitles: [
      "Accessibility — What Works and What Still Doesn’t",
      "Keyboard, Contrast and Screen-Reader Support",
    ],
    alternativeDescription:
      "The accessibility work behind the site — landmarks, focus styles, contrast targets, reduced-motion handling — plus the limitations that are still open.",
    internalLinks: ["/contact", "/terms", "/help", "/sitemap"],
  },
  {
    href: "/security",
    title: "Security Policy — Data Handling & Disclosure",
    primaryKeyword: "security policy",
    secondaryKeywords: [
      "responsible disclosure",
      "security headers",
      "content security policy",
      "dependency review",
      "report a vulnerability",
    ],
    intent: "trust",
    researchId: "page-security",
    alternativeTitles: [
      "Security — Headers, Data Handling and Disclosure",
      "How to Report a Vulnerability in QUICKKIT",
    ],
    alternativeDescription:
      "The security headers the site sends, how browser-local processing bounds the data risk, dependency review, and the private route for reporting a vulnerability.",
    internalLinks: [
      "/file-handling",
      "/privacy",
      "/contact",
      "/tools/hash-generator",
    ],
  },
  {
    href: "/file-handling",
    title: "File Handling & Data Processing Policy",
    primaryKeyword: "file handling policy",
    secondaryKeywords: [
      "does it upload my pdf",
      "file size limits",
      "web worker processing",
      "indexeddb conversion history",
      "word to pdf server cleanup",
    ],
    intent: "trust",
    researchId: "page-file-handling",
    alternativeTitles: [
      "Where Your Files Go — Tool-by-Tool File Handling",
      "File Handling — Limits, Memory and the One Upload",
    ],
    alternativeDescription:
      "A tool-by-tool account of where each file is processed, the enforced size and page limits, what stays in memory, and the single consented upload path.",
    internalLinks: ["/privacy", "/security", "/help", "/tools/merge-pdf"],
  },
  {
    href: "/intellectual-property",
    title: "Intellectual Property & Open-Source Licences",
    primaryKeyword: "intellectual property policy",
    secondaryKeywords: [
      "open source licences",
      "mit licence",
      "apache 2.0",
      "user output rights",
      "brand usage permission",
    ],
    intent: "trust",
    researchId: "page-intellectual-property",
    alternativeTitles: [
      "Intellectual Property — Ownership, Licences, Permissions",
      "Open-Source Licences and Your Rights to Output",
    ],
    alternativeDescription:
      "Who owns the brand and editorial content, which dependencies are MIT or Apache-2.0, what you may do with what a tool produces, and how to request permission.",
    internalLinks: ["/copyright", "/terms", "/security", "/contact"],
  },
];

function legalRecords(): PageSeoRecord[] {
  return LEGAL_PAGE_SEO.flatMap((seed) => {
    const page = legalPageByHref(seed.href);
    // A seed without a `lib/legal.ts` record would silently ship no description;
    // the audit treats this as an error rather than letting it through.
    if (!page) return [];
    return [
      {
        path: seed.href,
        title: seed.title,
        description: page.description,
        h1: page.title,
        primaryKeyword: seed.primaryKeyword,
        secondaryKeywords: seed.secondaryKeywords,
        intent: seed.intent,
        researchId: seed.researchId,
        alternativeTitles: seed.alternativeTitles,
        alternativeDescription: seed.alternativeDescription,
        internalLinks: seed.internalLinks,
        indexable: page.indexable,
      },
    ];
  });
}

/** Hub records plus the twelve policy records, in route order. */
export function allPageSeoRecords(): PageSeoRecord[] {
  return [...HUB_PAGE_SEO, ...legalRecords()];
}

const pageByPath = new Map<string, PageSeoRecord>(
  allPageSeoRecords().map((record) => [record.path, record]),
);

export function fillToolCount(text: string, toolCount: number): string {
  return text.split(COUNT_PLACEHOLDER).join(String(toolCount));
}

/**
 * Resolves a non-tool route's metadata.
 *
 * `toolCount` substitutes `{count}`. It is passed by the caller from the same
 * catalogue read the page body uses, so the number in the snippet and the number
 * in the H1 are always the same number. When it is omitted the placeholder is
 * left in place and the audit reports it — a literal `{count}` in a live
 * `<title>` is a bug, not a style choice.
 */
export function resolvePageSeo(
  path: string,
  options?: { toolCount?: number },
): PageSeoRecord | undefined {
  const record = pageByPath.get(path);
  if (!record) return undefined;
  const count = options?.toolCount;
  if (count === undefined) return record;
  return {
    ...record,
    title: fillToolCount(record.title, count),
    description: fillToolCount(record.description, count),
  };
}

/** Paths this module intends to be indexable — compared against the sitemap. */
export function registeredPagePaths(): string[] {
  return allPageSeoRecords()
    .filter((record) => record.indexable)
    .map((record) => record.path);
}

/** Route paths that are expected to resolve — used by the audit's link check. */
export function knownPagePaths(): string[] {
  return allPageSeoRecords().map((record) => record.path);
}
