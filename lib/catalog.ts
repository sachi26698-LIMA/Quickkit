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
    blurb: "Merge, split, compress and manage PDF files.",
    description:
      "Everything you need to work with PDFs — combine documents and organize pages right in your browser, with nothing uploaded.",
    tint: "tint-pdf",
    icon: "pdf",
  },
  {
    name: "Image Tools",
    slug: "image-tools",
    blurb: "Edit, convert, compress and optimize images.",
    description:
      "Shrink and optimize your images for the web, email and sharing — processed locally on your device.",
    tint: "tint-image",
    icon: "image",
  },
  {
    name: "QR & Barcode",
    slug: "qr-barcode",
    blurb: "Create and scan QR codes and barcodes.",
    description:
      "Turn links and text into scannable QR codes in seconds, ready to download and share anywhere.",
    tint: "tint-qr",
    icon: "qr",
  },
  {
    name: "Text & Writing",
    slug: "text-writing",
    blurb: "Format, analyze and transform text easily.",
    description:
      "Count words, fix casing and polish your writing with simple tools that work as you type.",
    tint: "tint-text",
    icon: "text",
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    blurb: "Encode, decode, format and work with dev utilities.",
    description:
      "Everyday developer utilities — format and validate data cleanly without sending it to a server.",
    tint: "tint-dev",
    icon: "code",
  },
  {
    name: "Calculators",
    slug: "calculators",
    blurb: "Simple and advanced calculations for everyday use.",
    description:
      "Practical calculators for everyday numbers, with clear explanations and local processing.",
    tint: "tint-calc",
    icon: "calc",
  },
  {
    name: "Security & Privacy",
    slug: "security-privacy",
    blurb: "Generate, check and manage your data securely.",
    description:
      "Create strong passwords and handle sensitive data with tools that never leave your device.",
    tint: "tint-security",
    icon: "shield",
  },
  {
    name: "AI Tools",
    slug: "ai-tools",
    blurb: "Smart tools powered by artificial intelligence.",
    description:
      "AI-powered helpers are on our roadmap. This category is coming soon — explore the rest of the toolkit today.",
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
    slug: "json-formatter",
    name: "JSON Formatter",
    category: "Developer Tools",
    description:
      "Bring order to your data. Format, validate, and minify JSON without the fuss.",
    keywords: "code pretty print validator developer",
    icon: "code",
    color: "blue",
    phase: 2,
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
      "Turn a link or a little text into a scannable QR code. Ready to share.",
    keywords: "url scan png download",
    icon: "qr",
    color: "mint",
    phase: 2,
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    category: "Image Tools",
    description:
      "Less file size, more possibilities. Compress images right in your browser.",
    keywords: "photo picture jpeg webp optimize resize",
    icon: "image",
    color: "peach",
    phase: 2,
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
] as const;

export type Tool = (typeof tools)[number];
export const toolBySlug = (slug: string): Tool | undefined =>
  tools.find((t) => t.slug === slug);
export const toolsByCategory = (category: ToolCategory) =>
  tools.filter((t) => t.category === category);

export function filterTools(query: string, category: Category) {
  const search = query.trim().toLocaleLowerCase();
  return tools.filter(
    (tool) =>
      (category === "All tools" || tool.category === category) &&
      `${tool.name} ${tool.description} ${tool.keywords}`
        .toLocaleLowerCase()
        .includes(search),
  );
}
