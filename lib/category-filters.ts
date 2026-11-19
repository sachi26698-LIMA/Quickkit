/**
 * Search and "type" filter shown above the tool list on every category page.
 *
 * Each category splits its tools into a few plain-language types. A tool
 * belongs to exactly one type per category it is listed in; a tool that is not
 * placed yet still appears under "All" and under an automatic "Other" option,
 * so a new catalogue entry can never disappear from its category page.
 */
export type CategoryFilterGroup = {
  id: string;
  label: string;
  slugs: readonly string[];
};

export type CategoryFilter = {
  /** Lower-case plural used in labels: "Search calculators". */
  noun: string;
  /** Label of the type picker. */
  typeLabel: string;
  groups: readonly CategoryFilterGroup[];
};

export const categoryFilters: Record<string, CategoryFilter> = {
  "pdf-tools": {
    noun: "PDF tools",
    typeLabel: "PDF tool type",
    groups: [
      {
        id: "organise",
        label: "Merge, split & edit",
        slugs: ["merge-pdf", "split-pdf", "pdf-studio"],
      },
      {
        id: "convert",
        label: "Convert to and from PDF",
        slugs: ["images-to-pdf", "pdf-to-image", "word-to-pdf", "pdf-to-word"],
      },
      {
        id: "optimise",
        label: "Compress & protect",
        slugs: ["compress-pdf", "pdf-lock-unlock"],
      },
    ],
  },
  "image-tools": {
    noun: "image tools",
    typeLabel: "Image tool type",
    groups: [
      {
        id: "size",
        label: "Resize & crop",
        slugs: ["image-resizer", "image-cropper"],
      },
      {
        id: "file",
        label: "Compress & convert",
        slugs: ["image-compressor", "image-to-image"],
      },
    ],
  },
  "qr-barcode": {
    noun: "QR and barcode tools",
    typeLabel: "Code tool type",
    groups: [
      {
        id: "qr",
        label: "QR codes",
        slugs: ["qr-generator", "qr-code-scanner"],
      },
      {
        id: "barcode",
        label: "Barcodes",
        slugs: ["barcode-generator", "barcode-scanner", "barcode-developer"],
      },
      {
        id: "data",
        label: "Batch & product data",
        slugs: [
          "batch-studio",
          "batch-code-checker",
          "gs1-intelligence",
          "product-lookup",
        ],
      },
    ],
  },
  "text-writing": {
    noun: "text tools",
    typeLabel: "Text tool type",
    groups: [
      {
        id: "write",
        label: "Count & format",
        slugs: ["word-counter", "case-converter"],
      },
      { id: "extract", label: "Extract text", slugs: ["image-to-text"] },
    ],
  },
  "developer-tools": {
    noun: "developer tools",
    typeLabel: "Developer tool type",
    groups: [
      {
        id: "format",
        label: "Format & validate",
        slugs: [
          "json-formatter",
          "json-validator",
          "html-formatter",
          "xml-formatter",
        ],
      },
      {
        id: "minify",
        label: "Minify",
        slugs: ["css-minifier", "javascript-minifier"],
      },
      {
        id: "encode",
        label: "Encode & hash",
        slugs: [
          "base64-encoder-decoder",
          "url-encoder-decoder",
          "hash-generator",
        ],
      },
      {
        id: "generate",
        label: "Generate & test",
        slugs: ["uuid-generator", "regex-tester"],
      },
    ],
  },
  calculators: {
    noun: "calculators",
    typeLabel: "Calculator type",
    groups: [
      {
        id: "everyday",
        label: "Everyday & health",
        slugs: [
          "percentage-calculator",
          "bmi-calculator",
          "age-calculator",
          "date-difference-calculator",
        ],
      },
      {
        id: "financial",
        label: "Money & finance",
        slugs: [
          "discount-calculator",
          "gst-calculator",
          "emi-calculator",
          "loan-calculator",
        ],
      },
      {
        id: "conversion",
        label: "Scientific & conversion",
        slugs: [
          "scientific-calculator",
          "unit-converter",
          "temperature-converter",
          "time-converter",
        ],
      },
    ],
  },
  "security-privacy": {
    noun: "security tools",
    typeLabel: "Security tool type",
    groups: [
      {
        id: "secrets",
        label: "Passwords, hashes & encryption",
        slugs: [
          "password-generator",
          "hash-generator",
          "advanced-cryptography",
          "api-credential-tools",
        ],
      },
      {
        id: "network",
        label: "Website & network checks",
        slugs: [
          "dns-email-security",
          "website-security-review",
          "url-network-privacy",
        ],
      },
      {
        id: "privacy",
        label: "Privacy & compliance",
        slugs: ["privacy-metadata-manager", "privacy-policy-workbench"],
      },
    ],
  },
  "hr-payroll": {
    noun: "HR tools",
    typeLabel: "HR tool type",
    groups: [
      {
        id: "salary",
        label: "Salary & take-home",
        slugs: [
          "salary-calculator-india",
          "in-hand-salary-calculator",
          "income-tax-calculator",
          "offer-letter-generator",
          "increment-letter-generator",
        ],
      },
      {
        id: "statutory",
        label: "PF, ESI & gratuity",
        slugs: [
          "pf-calculator",
          "esi-calculator",
          "gratuity-calculator",
          "full-and-final-settlement",
        ],
      },
      {
        id: "attendance",
        label: "Attendance & leave",
        slugs: [
          "attendance-calculator",
          "overtime-calculator",
          "shift-hours-calculator",
          "leave-encashment-calculator",
          "statutory-leave-calculator",
          "working-days-calculator",
        ],
      },
      {
        id: "documents",
        label: "Slips & letters",
        slugs: [
          "salary-slip-generator",
          "experience-letter-generator",
          "relieving-letter-generator",
          "warning-letter-generator",
          "appreciation-letter-generator",
          "termination-letter-generator",
          "internship-certificate-generator",
        ],
      },
      {
        id: "people",
        label: "Hiring & people ops",
        slugs: [
          "job-description-generator",
          "kpi-sheet-generator",
          "interview-plan-generator",
          "probation-period-calculator",
        ],
      },
    ],
  },
  "seo-growth": {
    noun: "SEO tools",
    typeLabel: "SEO tool type",
    groups: [
      {
        id: "onpage",
        label: "On-page analysis",
        slugs: [
          "serp-preview",
          "keyword-density-checker",
          "readability-checker",
          "on-page-audit",
        ],
      },
      {
        id: "schema",
        label: "Structured data",
        slugs: [
          "organization-schema-generator",
          "article-schema-generator",
          "faq-schema-generator",
          "product-schema-generator",
          "local-business-schema-generator",
          "job-posting-schema-generator",
          "breadcrumb-schema-generator",
          "json-ld-validator",
        ],
      },
      {
        id: "technical",
        label: "robots, sitemaps & canonicals",
        slugs: [
          "robots-txt-generator",
          "robots-txt-validator",
          "sitemap-generator",
          "sitemap-validator",
          "canonical-checker",
          "hreflang-checker",
          "redirect-checker",
        ],
      },
      {
        id: "content",
        label: "Content & copy",
        slugs: [
          "title-generator",
          "meta-description-generator",
          "content-brief-generator",
          "headline-generator",
          "alt-text-generator",
          "internal-link-suggestions",
          "topic-cluster-builder",
        ],
      },
      {
        id: "overlap",
        label: "Duplication & overlap",
        slugs: ["duplicate-content-checker", "keyword-cannibalisation-checker"],
      },
    ],
  },
  "career-jobs": {
    noun: "career tools",
    typeLabel: "Career tool type",
    groups: [
      {
        id: "resume",
        label: "Résumé & ATS",
        slugs: [
          "resume-ats-checker",
          "resume-keyword-matcher",
          "resume-bullet-improver",
          "resume-summary-generator",
          "resume-comparison",
        ],
      },
      {
        id: "offers",
        label: "Offers & compensation",
        slugs: [
          "offer-comparison-calculator",
          "total-compensation-calculator",
          "equity-vesting-calculator",
          "salary-converter",
          "contractor-rate-calculator",
          "relocation-calculator",
          "marginal-tax-rate",
        ],
      },
      {
        id: "timeline",
        label: "Notice & record",
        slugs: [
          "notice-period-calculator",
          "notice-buyout-calculator",
          "experience-calculator",
        ],
      },
      {
        id: "writing",
        label: "Letters & interview prep",
        slugs: [
          "cover-letter-generator",
          "follow-up-generator",
          "star-answer-builder",
          "linkedin-about-generator",
          "interview-prep-plan",
          "availability-statement",
        ],
      },
    ],
  },
};

/** Used for a category that has no entry above (for example a new one). */
export function categoryFilterFor(
  categorySlug: string,
  categoryName: string,
): CategoryFilter {
  return (
    categoryFilters[categorySlug] ?? {
      noun: "tools",
      typeLabel: `${categoryName} type`,
      groups: [],
    }
  );
}

/** Id of the automatic option that collects tools not placed in any type. */
export const OTHER_GROUP_ID = "other";

/** The tools of `groupId`, in the order they were given. */
export function filterCategoryTools<
  T extends {
    slug: string;
    name: string;
    description: string;
    keywords?: string;
  },
>(
  tools: readonly T[],
  filter: CategoryFilter,
  groupId: string,
  query: string,
): T[] {
  const placed = new Set(filter.groups.flatMap((group) => group.slugs));
  const group = filter.groups.find((entry) => entry.id === groupId);
  const needle = query.trim().toLocaleLowerCase();
  return tools.filter((tool) => {
    const inGroup =
      groupId === "all" ||
      (groupId === OTHER_GROUP_ID
        ? !placed.has(tool.slug)
        : Boolean(group?.slugs.includes(tool.slug)));
    return (
      inGroup &&
      `${tool.name} ${tool.description} ${tool.keywords ?? ""}`
        .toLocaleLowerCase()
        .includes(needle)
    );
  });
}
