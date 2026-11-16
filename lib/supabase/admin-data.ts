import "server-only";

import { categoryMeta, toolCategoriesOf, tools } from "@/lib/catalog";
import { indexingEnabled } from "@/lib/launch";
import { getErrorMonitoringStatus } from "@/lib/monitoring/error-reporter";
import { siteOrigin } from "@/lib/seo";
import { getAdminEmailAllowlist } from "./admin-auth";
import type {
  AdminSubmissionStatus,
  CategoryOverrideRow,
  FeedbackType,
  ToolOverrideRow,
} from "./database.types";
import { getMasterAdminServiceClient } from "./master-admin";
import { readStoredToolMaintenance } from "@/lib/tool-maintenance";

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
  /** True while the tool is switched off for maintenance. */
  maintenance_enabled: boolean;
  /** Note shown to visitors while the tool is off (kept for reuse when on). */
  maintenance_reason: string;
  maintenance_since: string | null;
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
    const maintenance = readStoredToolMaintenance(row?.metadata_override);
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
      maintenance_enabled: maintenance.enabled,
      maintenance_reason: maintenance.reason,
      maintenance_since: maintenance.since,
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
  /** Feedback inbox only: a written message or a tool star rating. */
  source?: "message" | "rating";
  tool_slug?: string;
  tool_name?: string;
  rating?: number;
  tags?: string[];
};

export type AdminActivityItem = {
  id: string | number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  details?: unknown;
};

export type OverviewPeriodComparison = {
  contacts_7d: number;
  contacts_prev_7d: number;
  feedback_7d: number;
  feedback_prev_7d: number;
  activity_7d: number;
  activity_prev_7d: number;
  has_contact_history: boolean;
  has_feedback_history: boolean;
  has_activity_history: boolean;
};

export type OverviewDailyTrendPoint = {
  date: string;
  contacts: number;
  feedback: number;
  activity: number;
};

export type OverviewRecentEntity = {
  label: string;
  entity_type: string;
  entity_id: string | null;
  count: number;
  last_at: string;
};

export type OverviewHealthStatus = {
  checked_at: string;
  supabase_connected: boolean;
  auth_verified: boolean;
  allowlist_configured: boolean;
  analytics_url_present: boolean;
  analytics_token_present: boolean;
  sitemap_origin_configured: boolean;
  indexing_enabled: boolean;
  rls_verified_by_app: false;
  smtp_verified_by_app: false;
  error_monitoring_configured: boolean;
};

export type OverviewConnectedSnapshot = {
  connected: true;
  total_tools: number;
  active_tools: number;
  published_tools: number;
  unpublished_tools: number;
  featured_tools?: number;
  total_categories: number;
  published_categories: number;
  contact_count: number;
  feedback_count: number;
  new_contact_count?: number;
  new_feedback_count?: number;
  category_distribution: {
    slug: string;
    name: string;
    count: number;
    published?: boolean;
  }[];
  activity: AdminActivityItem[];
  period_comparison?: OverviewPeriodComparison;
  trends?: {
    daily: OverviewDailyTrendPoint[];
    recent_entities: OverviewRecentEntity[];
  };
  health?: OverviewHealthStatus;
};

export type OverviewSnapshot = OverviewConnectedSnapshot | { connected: false };

function buildDailyBuckets(
  nowMs: number,
  days: number,
  contactDates: string[],
  feedbackDates: string[],
  activityDates: string[],
): OverviewDailyTrendPoint[] {
  const buckets = new Map<string, OverviewDailyTrendPoint>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(nowMs - offset * 86_400_000)
      .toISOString()
      .slice(0, 10);
    buckets.set(date, { date, contacts: 0, feedback: 0, activity: 0 });
  }
  for (const iso of contactDates) {
    const key = iso.slice(0, 10);
    const point = buckets.get(key);
    if (point) point.contacts += 1;
  }
  for (const iso of feedbackDates) {
    const key = iso.slice(0, 10);
    const point = buckets.get(key);
    if (point) point.feedback += 1;
  }
  for (const iso of activityDates) {
    const key = iso.slice(0, 10);
    const point = buckets.get(key);
    if (point) point.activity += 1;
  }
  return [...buckets.values()];
}

function summarizeRecentEntities(
  activity: AdminActivityItem[],
): OverviewRecentEntity[] {
  const counts = new Map<string, OverviewRecentEntity>();
  for (const item of activity) {
    const target = item.entity_id?.trim() || item.entity_type;
    const key = `${item.entity_type}:${target}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      if (item.created_at > existing.last_at)
        existing.last_at = item.created_at;
    } else {
      counts.set(key, {
        label: item.entity_id ? item.entity_id : item.entity_type,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        count: 1,
        last_at: item.created_at,
      });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.last_at.localeCompare(a.last_at))
    .slice(0, 6);
}

function countWindow(dates: string[], startMs: number, endMs: number): number {
  let total = 0;
  for (const iso of dates) {
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms) && ms >= startMs && ms < endMs) total += 1;
  }
  return total;
}

export async function getAdminInboxBadges(): Promise<{
  submissions: number;
  feedback: number;
  recentActivity: AdminActivityItem[];
}> {
  const db = getMasterAdminServiceClient();
  if (!db) return { submissions: 0, feedback: 0, recentActivity: [] };
  try {
    const [newContacts, newFeedback, newRatings, recentActivity] =
      await Promise.all([
        db
          .from("quickkit_contact_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        db
          .from("quickkit_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        db
          .from("quickkit_tool_feedback")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        db
          .from("quickkit_admin_activity")
          .select(
            "id,actor_email,action,entity_type,entity_id,created_at,details",
          )
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
    return {
      submissions: !newContacts.error ? (newContacts.count ?? 0) : 0,
      // Tool star ratings share the Feedback inbox with written messages.
      feedback:
        (!newFeedback.error ? (newFeedback.count ?? 0) : 0) +
        (!newRatings.error ? (newRatings.count ?? 0) : 0),
      recentActivity: !recentActivity.error
        ? ((recentActivity.data ?? []) as AdminActivityItem[])
        : [],
    };
  } catch {
    return { submissions: 0, feedback: 0, recentActivity: [] };
  }
}

export async function getOverviewSnapshot(): Promise<OverviewSnapshot> {
  const db = getMasterAdminServiceClient();
  if (!db) return { connected: false as const };
  const nowMs = Date.now();
  const fourteenDaysAgoMs = nowMs - 14 * 86_400_000;
  const sevenDaysAgoMs = nowMs - 7 * 86_400_000;
  const fourteenDaysAgoIso = new Date(fourteenDaysAgoMs).toISOString();

  const [
    toolData,
    categoryData,
    contacts,
    feedback,
    newContacts,
    newFeedback,
    recentContacts,
    recentFeedback,
    activity,
    ratings,
    newRatings,
    recentRatings,
  ] = await Promise.all([
    readToolCatalog(),
    readCategoryCatalog(),
    db
      .from("quickkit_contact_submissions")
      .select("id", { count: "exact", head: true }),
    db
      .from("quickkit_feedback_submissions")
      .select("id", { count: "exact", head: true }),
    db
      .from("quickkit_contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("quickkit_feedback_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("quickkit_contact_submissions")
      .select("created_at")
      .gte("created_at", fourteenDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("quickkit_feedback_submissions")
      .select("created_at")
      .gte("created_at", fourteenDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("quickkit_admin_activity")
      .select("id,actor_email,action,entity_type,entity_id,created_at,details")
      .order("created_at", { ascending: false })
      .limit(60),
    // Tool star ratings. These reads fail until their migration is applied;
    // the overview then simply counts written feedback only.
    db
      .from("quickkit_tool_feedback")
      .select("id", { count: "exact", head: true }),
    db
      .from("quickkit_tool_feedback")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("quickkit_tool_feedback")
      .select("created_at")
      .gte("created_at", fourteenDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const ratingCount = !ratings.error ? (ratings.count ?? 0) : 0;
  const newRatingCount = !newRatings.error ? (newRatings.count ?? 0) : 0;
  const connected =
    toolData.configured &&
    categoryData.configured &&
    !contacts.error &&
    !feedback.error &&
    !activity.error;
  if (!connected) return { connected: false as const };

  const activityRows = (activity.data ?? []) as AdminActivityItem[];
  const contactDates = !recentContacts.error
    ? ((recentContacts.data ?? []) as { created_at: string }[]).map(
        (row) => row.created_at,
      )
    : [];
  const feedbackDates = [
    ...(!recentFeedback.error
      ? ((recentFeedback.data ?? []) as { created_at: string }[])
      : []),
    ...(!recentRatings.error
      ? ((recentRatings.data ?? []) as { created_at: string }[])
      : []),
  ].map((row) => row.created_at);
  const activityDates = activityRows.map((row) => row.created_at);

  const contacts7d = countWindow(contactDates, sevenDaysAgoMs, nowMs + 1000);
  const contactsPrev7d = countWindow(
    contactDates,
    fourteenDaysAgoMs,
    sevenDaysAgoMs,
  );
  const feedback7d = countWindow(feedbackDates, sevenDaysAgoMs, nowMs + 1000);
  const feedbackPrev7d = countWindow(
    feedbackDates,
    fourteenDaysAgoMs,
    sevenDaysAgoMs,
  );
  const activity7d = countWindow(activityDates, sevenDaysAgoMs, nowMs + 1000);
  const activityPrev7d = countWindow(
    activityDates,
    fourteenDaysAgoMs,
    sevenDaysAgoMs,
  );

  const enabledTools = toolData.tools.filter((tool) => tool.is_enabled);
  return {
    connected: true as const,
    total_tools: toolData.tools.length,
    active_tools: enabledTools.filter((tool) => tool.is_published).length,
    published_tools: toolData.tools.filter((tool) => tool.is_published).length,
    unpublished_tools: toolData.tools.filter((tool) => !tool.is_published)
      .length,
    featured_tools: toolData.tools.filter((tool) => tool.is_featured).length,
    total_categories: categoryData.categories.length,
    published_categories: categoryData.categories.filter(
      (category) => category.is_published,
    ).length,
    contact_count: contacts.count ?? 0,
    feedback_count: (feedback.count ?? 0) + ratingCount,
    new_contact_count: !newContacts.error ? (newContacts.count ?? 0) : 0,
    new_feedback_count:
      (!newFeedback.error ? (newFeedback.count ?? 0) : 0) + newRatingCount,
    category_distribution: categoryData.categories
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        count: category.tool_count,
        published: category.is_published,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    activity: activityRows,
    period_comparison: {
      contacts_7d: contacts7d,
      contacts_prev_7d: contactsPrev7d,
      feedback_7d: feedback7d,
      feedback_prev_7d: feedbackPrev7d,
      activity_7d: activity7d,
      activity_prev_7d: activityPrev7d,
      has_contact_history: (contacts.count ?? 0) > 0,
      has_feedback_history: (feedback.count ?? 0) + ratingCount > 0,
      has_activity_history: activityRows.length > 0,
    },
    trends: {
      daily: buildDailyBuckets(
        nowMs,
        14,
        contactDates,
        feedbackDates,
        activityDates,
      ),
      recent_entities: summarizeRecentEntities(activityRows),
    },
    health: {
      checked_at: new Date(nowMs).toISOString(),
      supabase_connected: true,
      auth_verified: true,
      allowlist_configured: getAdminEmailAllowlist().size > 0,
      analytics_url_present: Boolean(
        process.env.ANALYTICS_DATABASE_URL?.trim(),
      ),
      analytics_token_present: Boolean(
        process.env.ANALYTICS_DATABASE_TOKEN?.trim(),
      ),
      sitemap_origin_configured: Boolean(siteOrigin),
      indexing_enabled: indexingEnabled,
      rls_verified_by_app: false,
      smtp_verified_by_app: false,
      error_monitoring_configured: getErrorMonitoringStatus().configured,
    },
  };
}
