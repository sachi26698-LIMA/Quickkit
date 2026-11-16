import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  categoryMeta,
  toolCategoriesOf,
  tools as staticTools,
  type CategoryMeta,
  type Tool,
} from "@/lib/catalog";
import { getMasterAdminServiceClient } from "./master-admin";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import type { CategoryOverrideRow, ToolOverrideRow } from "./database.types";
import {
  readToolMaintenance,
  type ToolMaintenance,
} from "@/lib/tool-maintenance";

export const PUBLIC_CATALOG_CACHE_TAG = "public-catalog";
export const PUBLIC_SITE_SETTINGS_CACHE_TAG = "public-site-settings";
const PUBLIC_CACHE_REVALIDATE_SECONDS = 300;

export type PublicTool = Tool & {
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isIndexable: boolean;
  isFeatured: boolean;
  publicDescription: string | null;
  /** Set while an administrator has switched this tool off for maintenance. */
  maintenance: ToolMaintenance | null;
};

async function fetchPublicCatalogUncached() {
  const db = getMasterAdminServiceClient();
  if (!db) return mergePublicCatalog([], []);
  const [toolResult, categoryResult] = await Promise.all([
    db.from("quickkit_admin_tool_overrides").select("*"),
    db.from("quickkit_admin_category_overrides").select("*"),
  ]);
  // Treat either failed read as an unavailable override set. Mixing a partial
  // projection with defaults can hide every public route in the failed half;
  // prefer the shipped catalogue until both reads succeed.
  if (toolResult.error || categoryResult.error)
    return mergePublicCatalog([], []);
  const toolRows = (toolResult.data ?? []) as ToolOverrideRow[];
  const categoryRows = (categoryResult.data ?? []) as CategoryOverrideRow[];
  return mergePublicCatalog(toolRows, categoryRows);
}

const fetchPublicCatalogCached = unstable_cache(
  fetchPublicCatalogUncached,
  ["quickkit-public-catalog"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
);

/**
 * Reads validated admin overrides for server-rendered public pages. Database
 * failures deliberately fall back to the shipped catalogue. This module never
 * returns credentials or private submissions to a caller. Wrapped in Next's
 * Data Cache (`unstable_cache`) for fast ISR/static rendering + on-demand
 * admin revalidation, and in React `cache` so layouts and pages in a single
 * render pass share one read.
 */
export const getPublicCatalog = cache(async function getPublicCatalog() {
  if (process.env.VITEST) return fetchPublicCatalogUncached();
  try {
    return await fetchPublicCatalogCached();
  } catch {
    return fetchPublicCatalogUncached();
  }
});

export type PublicToolShellData = Awaited<
  ReturnType<typeof getPublicCatalog>
> & {
  tool: PublicTool;
  categories: CategoryMeta[];
};

export function resolvePublicToolShellData(
  catalog: Awaited<ReturnType<typeof getPublicCatalog>>,
  slug: string,
): PublicToolShellData | null {
  const tool = catalog.tools.find((item) => item.slug === slug);
  if (!tool) return null;
  return {
    ...catalog,
    tool,
    categories: toolCategoriesOf(tool)
      .map((name) => catalog.categories.find((item) => item.name === name))
      .filter((item): item is CategoryMeta => Boolean(item)),
  };
}

export function requirePublicToolShellData(
  catalog: Awaited<ReturnType<typeof getPublicCatalog>>,
  slug: string,
): PublicToolShellData {
  const result = resolvePublicToolShellData(catalog, slug);
  if (!result) notFound();
  return result;
}

export async function getPublicToolShellData(
  slug: string,
): Promise<PublicToolShellData> {
  return requirePublicToolShellData(await getPublicCatalog(), slug);
}

/** Pure, deterministic projection of sparse rows over the code catalogue. */
export function mergePublicCatalog(
  toolRows: ToolOverrideRow[],
  categoryRows: CategoryOverrideRow[],
) {
  const toolOverrides = new Map(toolRows.map((row) => [row.tool_slug, row]));
  const categoryOverrides = new Map(
    categoryRows.map((row) => [row.category_slug, row]),
  );
  const categoryNames = new Map(
    categoryMeta.map((base) => [
      base.name,
      categoryOverrides.get(base.slug)?.name_override ?? base.name,
    ]),
  );
  const customCategories = categoryRows.filter(
    (row) =>
      !categoryMeta.some((base) => base.slug === row.category_slug) &&
      row.is_published &&
      typeof row.name_override === "string" &&
      row.name_override.trim().length > 0,
  );
  const validCategoryNames = new Set([
    ...categoryNames.keys(),
    ...categoryNames.values(),
    ...customCategories.map((row) => row.name_override!),
  ]);
  const visibleTools: PublicTool[] = staticTools.flatMap(
    (base): PublicTool[] => {
      const row = toolOverrides.get(base.slug);
      if (row && (!row.is_enabled || !row.is_published)) return [];
      const requestedCategory = row?.category_override;
      const requestedCustom = customCategories.find(
        (category) => category.category_slug === requestedCategory,
      );
      const category =
        requestedCustom?.name_override ??
        (requestedCategory && validCategoryNames.has(requestedCategory)
          ? (categoryNames.get(requestedCategory) ?? requestedCategory)
          : (categoryNames.get(base.category) ?? base.category));
      const safeIcon =
        row?.icon_override &&
        staticTools.some((tool) => tool.icon === row.icon_override)
          ? row.icon_override
          : base.icon;
      const categoryList =
        "categories" in base && Array.isArray(base.categories)
          ? base.categories.map((name) =>
              name === base.category
                ? category
                : (categoryNames.get(name) ?? name),
            )
          : undefined;
      return [
        {
          ...base,
          ...(categoryList ? { categories: categoryList } : {}),
          name: row?.name_override ?? base.name,
          description: row?.description_override ?? base.description,
          category: category as Tool["category"],
          icon: safeIcon as Tool["icon"],
          seoTitle: safeText(row?.seo_title, 180),
          seoDescription: safeText(row?.seo_description, 320),
          canonicalPath: isSafeCanonicalPath(row?.canonical_path)
            ? row.canonical_path
            : null,
          isIndexable: row?.is_indexable ?? true,
          isFeatured: row?.is_featured ?? false,
          publicDescription: safeText(row?.description_override, 1000),
          maintenance: readToolMaintenance(row?.metadata_override),
        } as PublicTool,
      ];
    },
  );
  const visibleCategories: CategoryMeta[] = [
    ...categoryMeta.flatMap((base): CategoryMeta[] => {
      const row = categoryOverrides.get(base.slug);
      if (row && !row.is_published) return [];
      return [
        {
          ...base,
          name: categoryNames.get(base.name) ?? base.name,
          description: row?.description_override ?? base.description,
          blurb: row?.description_override ?? base.blurb,
          seoTitle: row?.seo_title ?? base.seoTitle,
          icon:
            row?.icon_override &&
            categoryMeta.some((item) => item.icon === row.icon_override)
              ? (row.icon_override as CategoryMeta["icon"])
              : base.icon,
        },
      ];
    }),
    ...customCategories.map((row) => {
      const icon = categoryMeta.some((item) => item.icon === row.icon_override)
        ? (row.icon_override as CategoryMeta["icon"])
        : "text";
      const template = categoryMeta.find((item) => item.icon === icon)!;
      return {
        name: row.name_override!,
        slug: row.category_slug,
        seoTitle: row.seo_title ?? row.name_override!,
        blurb: row.description_override ?? "",
        description: row.description_override ?? "",
        tint: template.tint,
        icon,
      };
    }),
  ].sort((a, b) => {
    const aBase = categoryMeta.findIndex((item) => item.slug === a.slug);
    const bBase = categoryMeta.findIndex((item) => item.slug === b.slug);
    const aOrder =
      categoryOverrides.get(a.slug)?.display_order ??
      (aBase < 0 ? 1000 : aBase);
    const bOrder =
      categoryOverrides.get(b.slug)?.display_order ??
      (bBase < 0 ? 1000 : bBase);
    return aOrder - bOrder || a.name.localeCompare(b.name);
  });
  return { tools: visibleTools, categories: visibleCategories };
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

export function isSafeCanonicalPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 500 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\\") ||
    value.split("/").some((part) => part === "." || part === "..")
  )
    return false;
  try {
    const url = new URL(value, "https://quickkit.invalid");
    return url.origin === "https://quickkit.invalid" && url.pathname === value;
  } catch {
    return false;
  }
}

export async function publicToolMetadata(
  slug: string,
  fallbackTitle: string,
  fallbackDescription: string,
): Promise<Metadata> {
  const { tools } = await getPublicCatalog();
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) return { robots: { index: false, follow: false } };
  const canonicalPath = tool.canonicalPath ?? `/tools/${tool.slug}`;
  return {
    ...pageMetadata(
      tool.seoTitle ?? fallbackTitle,
      tool.seoDescription ?? fallbackDescription,
      canonicalPath,
    ),
    ...(!tool.isIndexable ? { robots: { index: false, follow: true } } : {}),
  };
}

type PublicSiteSettings = {
  website_name?: string;
  tagline?: string;
  contact_email?: string;
  announcement?: { enabled: boolean; message: string };
  maintenance?: { enabled: boolean; message: string };
  homepage_content?: {
    announcement_title?: string;
    announcement_body?: string;
  };
  social_links?: { label: string; href: string }[];
  footer_links?: { label: string; href: string }[];
};

async function fetchPublicSiteSettingsUncached(): Promise<PublicSiteSettings> {
  const db = getMasterAdminServiceClient();
  if (!db) return {};
  const { data, error } = await db
    .from("quickkit_admin_site_settings")
    .select("setting_key,setting_value");
  if (error || !data) return {};
  const settings: Record<string, unknown> = {};
  for (const row of data) {
    const value = row.setting_value;
    if (row.setting_key === "website_name" || row.setting_key === "tagline") {
      if (
        typeof value === "string" &&
        value.length <= 160 &&
        !/[<>]/.test(value)
      )
        settings[row.setting_key] = value;
    } else if (
      (row.setting_key === "announcement" ||
        row.setting_key === "maintenance") &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const message = value as { enabled?: unknown; message?: unknown };
      if (
        typeof message.enabled === "boolean" &&
        typeof message.message === "string" &&
        message.message.length <= 500 &&
        !/[<>]/.test(message.message)
      ) {
        settings[row.setting_key] = {
          enabled: message.enabled,
          message: message.message,
        };
      }
    } else if (
      row.setting_key === "homepage_content" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const content = value as Record<string, unknown>;
      if (
        Object.keys(content).every((key) =>
          ["announcement_title", "announcement_body"].includes(key),
        ) &&
        Object.values(content).every(
          (text) =>
            typeof text === "string" &&
            text.length <= 500 &&
            !/[<>]/.test(text),
        )
      )
        settings.homepage_content = content;
    } else if (
      row.setting_key === "contact_email" &&
      typeof value === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
      value.length <= 254
    ) {
      settings.contact_email = value;
    } else if (
      row.setting_key === "social_links" ||
      row.setting_key === "footer_links"
    ) {
      if (
        Array.isArray(value) &&
        value.length <= 20 &&
        value.every((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item))
            return false;
          const link = item as { label?: unknown; href?: unknown };
          if (
            typeof link.label !== "string" ||
            link.label.length < 1 ||
            link.label.length > 50 ||
            typeof link.href !== "string" ||
            link.href.length > 500
          )
            return false;
          try {
            const url = new URL(link.href);
            return url.protocol === "https:" && !url.username && !url.password;
          } catch {
            return false;
          }
        })
      )
        settings[row.setting_key] = value;
    }
  }
  return settings as PublicSiteSettings;
}

const fetchPublicSiteSettingsCached = unstable_cache(
  fetchPublicSiteSettingsUncached,
  ["quickkit-public-site-settings"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_SITE_SETTINGS_CACHE_TAG],
  },
);

export const getPublicSiteSettings = cache(
  async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
    if (process.env.VITEST) return fetchPublicSiteSettingsUncached();
    try {
      return await fetchPublicSiteSettingsCached();
    } catch {
      return fetchPublicSiteSettingsUncached();
    }
  },
);
