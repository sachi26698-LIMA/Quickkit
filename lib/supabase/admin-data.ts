import "server-only";

import { categoryMeta, toolCategoriesOf, tools } from "@/lib/catalog";
import type {
  AdminSubmissionStatus,
  CategoryOverrideRow,
  FeedbackType,
  ToolOverrideRow,
} from "./database.types";
import { getMasterAdminServiceClient } from "./master-admin";

export type AdminTool = {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  is_published: boolean;
  is_enabled: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  canonical_path: string;
  is_indexable: boolean;
  route: string;
};

export type AdminCategory = {
  slug: string;
  name: string;
  description: string;
  display_order: number;
  is_published: boolean;
  seo_title: string;
  icon: string;
  tool_count: number;
  is_custom: boolean;
};

export async function readToolCatalog() {
  const db = getMasterAdminServiceClient();
  let configured = false;
  let data: ToolOverrideRow[] = [];
  if (db) {
    const result = await db.from("quickkit_admin_tool_overrides").select("*");
    configured = !result.error;
    if (!result.error) data = (result.data ?? []) as ToolOverrideRow[];
  }
  const overrides = new Map(data.map((row) => [row.tool_slug, row]));
  const result = tools.map((tool) => {
    const row = overrides.get(tool.slug);
    const category = row?.category_override ?? tool.category;
    return {
      slug: tool.slug,
      name: row?.name_override ?? tool.name,
      description: row?.description_override ?? tool.description,
      category,
      icon: row?.icon_override ?? tool.icon,
      is_published: row?.is_published ?? true,
      is_enabled: row?.is_enabled ?? true,
      is_featured: row?.is_featured ?? false,
      seo_title: row?.seo_title ?? tool.name,
      seo_description: row?.seo_description ?? tool.description,
      canonical_path: row?.canonical_path ?? `/tools/${tool.slug}`,
      is_indexable: row?.is_indexable ?? true,
      route: `/tools/${tool.slug}`,
    } satisfies AdminTool;
  });
  return { configured, tools: result };
}

export async function readCategoryCatalog() {
  const db = getMasterAdminServiceClient();
  let configured = false;
  let data: CategoryOverrideRow[] = [];
  let toolData: ToolOverrideRow[] = [];
  if (db) {
    const [categoryResult, toolResult] = await Promise.all([
      db.from("quickkit_admin_category_overrides").select("*"),
      db.from("quickkit_admin_tool_overrides").select("*"),
    ]);
    configured = !categoryResult.error && !toolResult.error;
    if (!categoryResult.error)
      data = (categoryResult.data ?? []) as CategoryOverrideRow[];
    if (!toolResult.error)
      toolData = (toolResult.data ?? []) as ToolOverrideRow[];
  }
  const overrides = new Map(data.map((row) => [row.category_slug, row]));
  const toolOverrides = new Map(toolData.map((row) => [row.tool_slug, row]));
  const customRows = data.filter(
    (row) =>
      !categoryMeta.some((category) => category.slug === row.category_slug) &&
      typeof row.name_override === "string" &&
      row.name_override.trim().length > 0,
  );
  const allCategories: AdminCategory[] = [
    ...categoryMeta.map((category, index) => {
      const row = overrides.get(category.slug);
      return {
        slug: category.slug,
        name: row?.name_override ?? category.name,
        description: row?.description_override ?? category.description,
        display_order: row?.display_order ?? index,
        is_published: row?.is_published ?? true,
        seo_title: row?.seo_title ?? category.seoTitle,
        icon: row?.icon_override ?? category.icon,
        tool_count: 0,
        is_custom: false,
      };
    }),
    ...customRows.map((row) => ({
      slug: row.category_slug,
      name: row.name_override!,
      description: row.description_override ?? "",
      display_order: row.display_order ?? 1000,
      is_published: row.is_published,
      seo_title: row.seo_title ?? row.name_override!,
      icon: row.icon_override ?? "text",
      tool_count: 0,
      is_custom: true,
    })),
  ];
  const nameToCategory = new Map<string, AdminCategory>();
  for (const category of allCategories)
    nameToCategory.set(category.name, category);
  for (const base of categoryMeta) {
    const row = overrides.get(base.slug);
    if (row?.name_override)
      nameToCategory.set(base.name, nameToCategory.get(row.name_override)!);
  }
  const counts = new Map<string, number>();
  for (const tool of tools) {
    const toolRow = toolOverrides.get(tool.slug);
    const assignedCategories = toolCategoriesOf(tool).map((name, index) =>
      index === 0 && toolRow?.category_override
        ? toolRow.category_override
        : name,
    );
    for (const name of new Set(assignedCategories)) {
      const category = nameToCategory.get(name);
      if (category)
        counts.set(category.slug, (counts.get(category.slug) ?? 0) + 1);
    }
  }
  return {
    configured,
    categories: allCategories
      .map((category) => ({
        ...category,
        tool_count: counts.get(category.slug) ?? 0,
      }))
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.name.localeCompare(b.name),
      ),
  };
}

export type SubmissionRow = {
  id: string;
  created_at: string;
  status: AdminSubmissionStatus;
  internal_notes: string;
  name: string | null;
  message: string;
  email?: string;
  subject?: string;
  feedback_type?: FeedbackType;
};

export async function getOverviewSnapshot() {
  const db = getMasterAdminServiceClient();
  if (!db) return { connected: false as const };
  const [toolData, categoryData, contacts, feedback, activity] =
    await Promise.all([
      readToolCatalog(),
      readCategoryCatalog(),
      db
        .from("quickkit_contact_submissions")
        .select("id", { count: "exact", head: true }),
      db
        .from("quickkit_feedback_submissions")
        .select("id", { count: "exact", head: true }),
      db
        .from("quickkit_admin_activity")
        .select(
          "id,actor_email,action,entity_type,entity_id,created_at,details",
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
  const connected =
    toolData.configured &&
    categoryData.configured &&
    !contacts.error &&
    !feedback.error &&
    !activity.error;
  if (!connected) return { connected: false as const };
  const enabledTools = toolData.tools.filter((tool) => tool.is_enabled);
  return {
    connected: true as const,
    total_tools: toolData.tools.length,
    active_tools: enabledTools.filter((tool) => tool.is_published).length,
    published_tools: toolData.tools.filter((tool) => tool.is_published).length,
    unpublished_tools: toolData.tools.filter((tool) => !tool.is_published)
      .length,
    total_categories: categoryData.categories.length,
    published_categories: categoryData.categories.filter(
      (category) => category.is_published,
    ).length,
    contact_count: contacts.count ?? 0,
    feedback_count: feedback.count ?? 0,
    activity: activity.data ?? [],
  };
}
