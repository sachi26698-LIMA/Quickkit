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
    blurb: "Merge, split, convert, lock and manage PDF files.",
    description:
      "Everything you need to work with PDFs — combine documents, export pages as images, turn photos into a PDF, and lock or unlock files with AES encryption, all in your browser with nothing uploaded.",
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
      "Make a QR code for a link, Wi-Fi, a contact or an event — styled, logo-ready and checked by a real decoder before you download.",
    keywords:
      "url link text wifi vcard contact email phone sms whatsapp location map calendar event ical social app store logo design template bulk csv zip png svg pdf scan qrcode offline free",
    icon: "qr",
    color: "mint",
    phase: 2,
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

/**
 * Related tools for a detail page: round-robin across the tool's categories so
 * a tool listed in two categories surfaces neighbours from both, then fill
 * with the rest of the catalogue.
 */
export function relatedTools(tool: Tool, limit = 3): Tool[] {
  const categories = toolCategoriesOf(tool);
  const pool = tools.filter((candidate) => candidate.slug !== tool.slug);
  const buckets = categories.map((name) =>
    pool.filter((candidate) => toolCategoriesOf(candidate).includes(name)),
  );
  const ordered: Tool[] = [];
  for (let index = 0; ; index += 1) {
    let found = false;
    for (const bucket of buckets) {
      const next = bucket[index];
      if (!next) continue;
      found = true;
      if (!ordered.includes(next)) ordered.push(next);
    }
    if (!found) break;
  }
  for (const candidate of pool)
    if (!ordered.includes(candidate)) ordered.push(candidate);
  return ordered.slice(0, limit);
}

export function filterTools(query: string, category: Category) {
  const search = query.trim().toLocaleLowerCase();
  return tools.filter(
    (tool) =>
      (category === "All tools" ||
        toolCategoriesOf(tool).includes(category as ToolCategory)) &&
      `${tool.name} ${tool.description} ${tool.keywords}`
        .toLocaleLowerCase()
        .includes(search),
  );
}
