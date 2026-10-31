/**
 * QUICKKIT tool catalog — the single source of truth for tool discovery,
 * navigation, the sitemap and the homepage/directory grids.
 *
 * Only genuinely working tools belong here: every entry must resolve to a
 * real route. Marketing copy stays short, accurate and free of usage claims.
 */

export const categories = [
  "All tools",
  "Text",
  "Developer",
  "Security",
  "Image & QR",
] as const;

export type Category = (typeof categories)[number];

export type ToolIconName = "text" | "case" | "code" | "key" | "qr" | "image";

export type ToolColor = "purple" | "blue" | "mint" | "peach";

export type Tool = {
  slug: string;
  name: string;
  category: Exclude<Category, "All tools">;
  /** One-line promise shown on cards and in the tool header. */
  description: string;
  /** Longer sentence used on directory sections. */
  summary: string;
  keywords: string;
  icon: ToolIconName;
  color: ToolColor;
  phase: 2 | 3;
};

export const tools: Tool[] = [
  {
    slug: "word-counter",
    name: "Word Counter",
    category: "Text",
    description:
      "Count words, characters, sentences and reading time as you type.",
    summary:
      "Live word, character, sentence and paragraph counts with a reading-time estimate — no upload, no account.",
    keywords: "writing sentences paragraphs length reading time typing",
    icon: "text",
    color: "purple",
    phase: 2,
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    category: "Text",
    description:
      "Switch text between UPPERCASE, lowercase, Title and Sentence case.",
    summary:
      "Four everyday case styles with line breaks preserved and one-click copy of the result.",
    keywords: "uppercase lowercase title sentence writing",
    icon: "case",
    color: "purple",
    phase: 2,
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    category: "Developer",
    description: "Format, validate and minify JSON with clear error messages.",
    summary:
      "Pretty-print, minify or validate JSON locally, with readable parse errors and Unicode-safe output.",
    keywords: "code pretty print validator developer data",
    icon: "code",
    color: "blue",
    phase: 2,
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    category: "Security",
    description:
      "Create strong random passwords with crypto-secure randomness.",
    summary:
      "Choose length and character sets; generation uses the browser’s cryptographic random source.",
    keywords: "secure random crypto credentials account",
    icon: "key",
    color: "purple",
    phase: 2,
  },
  {
    slug: "qr-generator",
    name: "QR Code Generator",
    category: "Image & QR",
    description:
      "Turn a link or short text into a downloadable QR code in seconds.",
    summary:
      "Scannable QR codes generated in your browser, ready to download as a high-resolution PNG.",
    keywords: "url scan png download share link",
    icon: "qr",
    color: "mint",
    phase: 3,
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    category: "Image & QR",
    description: "Shrink JPEG, PNG and WebP images without uploading them.",
    summary:
      "Adjust quality and output format, compare before and after sizes, then download — all on your device.",
    keywords: "photo picture jpeg webp optimize resize compress",
    icon: "image",
    color: "peach",
    phase: 3,
  },
];

/** Display metadata for the category chips and the directory sections. */
export const categoryMeta: Record<
  Exclude<Category, "All tools">,
  {
    label: string;
    blurb: string;
    icon: "grid" | "type" | "code" | "shield" | "image";
  }
> = {
  Text: {
    label: "Text",
    blurb: "Writing, counting and tidying words.",
    icon: "type",
  },
  Developer: {
    label: "Developer",
    blurb: "Quick checks for structured data.",
    icon: "code",
  },
  Security: {
    label: "Security",
    blurb: "Small habits that protect accounts.",
    icon: "shield",
  },
  "Image & QR": {
    label: "Image & QR",
    blurb: "Graphics handled right in the browser.",
    icon: "image",
  },
};

export const toolCategories = categories.filter(
  (category): category is Exclude<Category, "All tools"> =>
    category !== "All tools",
);

export function isCategory(value: string): value is Category {
  return (categories as readonly string[]).includes(value);
}

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

/**
 * Case-insensitive, whitespace-trimmed search across names, descriptions,
 * summaries and keywords, optionally narrowed to a single category.
 */
export function filterTools(query: string, category: Category = "All tools") {
  const search = query.trim().toLocaleLowerCase();
  return tools.filter(
    (tool) =>
      (category === "All tools" || tool.category === category) &&
      `${tool.name} ${tool.description} ${tool.summary} ${tool.keywords}`
        .toLocaleLowerCase()
        .includes(search),
  );
}

export function toolsInCategory(category: Category) {
  return filterTools("", category);
}

export function categoryCount(category: Category) {
  return toolsInCategory(category).length;
}
