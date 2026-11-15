import type { CategoryMeta, ToolCategory } from "@/lib/catalog";

/**
 * The header's category menu, without the catalogue.
 *
 * The header is a client component and is rendered on every page. Importing
 * `lib/catalog` there pulled all 42 tool descriptions into the browser bundle
 * of every route — for a menu that only needs a name, a slug, a tint class, an
 * icon and whether the category has published tools. Those five fields are
 * duplicated here, deliberately, and a test
 * (tests/nav-categories.test.ts) keeps this list identical to `categoryMeta`.
 */
export type NavCategory = {
  name: ToolCategory;
  slug: string;
  tint: string;
  icon: CategoryMeta["icon"];
  /** True when the category has no published tool yet. */
  empty: boolean;
};

export const navCategories: NavCategory[] = [
  {
    name: "PDF Tools",
    slug: "pdf-tools",
    tint: "tint-pdf",
    icon: "pdf",
    empty: false,
  },
  {
    name: "Image Tools",
    slug: "image-tools",
    tint: "tint-image",
    icon: "image",
    empty: false,
  },
  {
    name: "QR & Barcode",
    slug: "qr-barcode",
    tint: "tint-qr",
    icon: "qr",
    empty: false,
  },
  {
    name: "Text & Writing",
    slug: "text-writing",
    tint: "tint-text",
    icon: "text",
    empty: false,
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    tint: "tint-dev",
    icon: "code",
    empty: false,
  },
  {
    name: "Calculators",
    slug: "calculators",
    tint: "tint-calc",
    icon: "calc",
    empty: false,
  },
  {
    name: "Security & Privacy",
    slug: "security-privacy",
    tint: "tint-security",
    icon: "shield",
    empty: false,
  },
  {
    name: "AI Tools",
    slug: "ai-tools",
    tint: "tint-ai",
    icon: "sparkles",
    empty: true,
  },
];
