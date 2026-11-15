import { describe, expect, it } from "vitest";
import { categoryMeta, toolBySlug, tools } from "@/lib/catalog";
import {
  isSafeCanonicalPath,
  mergePublicCatalog,
} from "@/lib/supabase/public-catalog";

describe("public catalog projection", () => {
  it("preserves stable tool slugs while applying published metadata overrides", () => {
    const { tools: visible } = mergePublicCatalog(
      [
        {
          tool_slug: "merge-pdf",
          name_override: "Join PDF files",
          description_override: "Join several PDFs locally.",
          category_override: "PDF Tools",
          icon_override: "svg/onload",
          is_published: true,
          is_enabled: true,
          is_featured: true,
        } as never,
      ],
      [],
    );
    const tool = visible.find((item) => item.slug === "merge-pdf");
    expect(tool).toMatchObject({
      slug: "merge-pdf",
      name: "Join PDF files",
      description: "Join several PDFs locally.",
      category: "PDF Tools",
    });
    expect(`/tools/${tool?.slug}`).toBe("/tools/merge-pdf");
    expect(tool?.icon).toBe(toolBySlug("merge-pdf")?.icon);
  });

  it("projects safe per-tool SEO, canonical and indexability overrides", () => {
    const { tools: visible } = mergePublicCatalog(
      [
        {
          tool_slug: "merge-pdf",
          seo_title: "Join PDFs without an account",
          seo_description: "A private, browser-first PDF joining tool.",
          canonical_path: "/tools/pdf-studio",
          is_indexable: false,
          is_published: true,
          is_enabled: true,
        } as never,
      ],
      [],
    );
    const tool = visible.find((item) => item.slug === "merge-pdf");
    expect(tool).toMatchObject({
      seoTitle: "Join PDFs without an account",
      seoDescription: "A private, browser-first PDF joining tool.",
      canonicalPath: "/tools/pdf-studio",
      isIndexable: false,
    });
    expect(isSafeCanonicalPath("/tools/pdf-studio")).toBe(true);
    for (const path of [
      "https://evil.example/",
      "//evil.example",
      "/x?y=1",
      "/x#part",
      "/../admin",
      "/a\\\\b",
    ]) {
      expect(isSafeCanonicalPath(path), path).toBe(false);
    }
  });

  it("omits unpublished or disabled tools and unpublished categories", () => {
    const { tools: visibleTools, categories: visibleCategories } =
      mergePublicCatalog(
        [
          {
            tool_slug: "merge-pdf",
            is_published: false,
            is_enabled: true,
          } as never,
          {
            tool_slug: "word-counter",
            is_published: true,
            is_enabled: false,
          } as never,
        ],
        [{ category_slug: "calculators", is_published: false } as never],
      );
    expect(visibleTools.some((tool) => tool.slug === "merge-pdf")).toBe(false);
    expect(visibleTools.some((tool) => tool.slug === "word-counter")).toBe(
      false,
    );
    expect(
      visibleCategories.some((category) => category.slug === "calculators"),
    ).toBe(false);
    expect(visibleTools).toHaveLength(tools.length - 2);
  });

  it("propagates renamed category metadata and order without changing the route slug", () => {
    const { categories: visibleCategories, tools: visibleTools } =
      mergePublicCatalog(
        [],
        [
          {
            category_slug: "pdf-tools",
            name_override: "Document Utilities",
            description_override: "A concise guide to document tools.",
            seo_title: "Document tools for everyone",
            display_order: 999,
            is_published: true,
          } as never,
        ],
      );
    const category = visibleCategories.find(
      (item) => item.slug === "pdf-tools",
    );
    expect(category).toMatchObject({
      slug: "pdf-tools",
      name: "Document Utilities",
      description: "A concise guide to document tools.",
      seoTitle: "Document tools for everyone",
    });
    expect(
      visibleTools.find((tool) => tool.slug === "merge-pdf")?.category,
    ).toBe("Document Utilities");
    expect(visibleCategories.at(-1)?.slug).toBe("pdf-tools");
    expect(categoryMeta.some((item) => item.slug === "pdf-tools")).toBe(true);
  });
});

describe("custom category catalog projection", () => {
  it("publishes owner-created categories and routes an existing tool into them", () => {
    const { tools: visibleTools, categories: visibleCategories } =
      mergePublicCatalog(
        [
          {
            tool_slug: "merge-pdf",
            category_override: "Document Lab",
            is_published: true,
            is_enabled: true,
          } as never,
        ],
        [
          {
            category_slug: "document-lab",
            name_override: "Document Lab",
            description_override: "A custom tool collection.",
            display_order: 30,
            is_published: true,
            icon_override: "pdf",
          } as never,
        ],
      );
    expect(
      visibleCategories.find((category) => category.slug === "document-lab"),
    ).toMatchObject({
      name: "Document Lab",
      description: "A custom tool collection.",
      icon: "pdf",
    });
    expect(
      visibleTools.find((tool) => tool.slug === "merge-pdf")?.category,
    ).toBe("Document Lab");
  });

  it("never projects an unpublished custom category into public navigation", () => {
    const { categories } = mergePublicCatalog(
      [],
      [
        {
          category_slug: "draft-tools",
          name_override: "Draft Tools",
          is_published: false,
        } as never,
      ],
    );
    expect(categories.some((category) => category.slug === "draft-tools")).toBe(
      false,
    );
  });
});
