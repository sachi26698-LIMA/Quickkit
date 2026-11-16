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
