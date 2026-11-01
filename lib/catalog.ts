export const categories = [
  "All tools",
  "Text",
  "Developer",
  "Security",
  "Image & QR",
  "Image Tools",
] as const;
export type Category = (typeof categories)[number];
export const tools = [
  {
    slug: "word-counter",
    name: "Word Counter",
    category: "Text",
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
    category: "Text",
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
    category: "Developer",
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
    category: "Security",
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
    category: "Image & QR",
    description:
      "Turn a link or a little text into a scannable QR code. Ready to share.",
    keywords: "url scan png download",
    icon: "qr",
    color: "mint",
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
] as const;
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
