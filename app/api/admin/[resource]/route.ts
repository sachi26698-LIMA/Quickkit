import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { categoryMeta, tools } from "@/lib/catalog";
import { isSocialIconId } from "@/lib/social-platforms";
import { indexingEnabled } from "@/lib/launch";
import { getServerErrorMonitoringStatus } from "@/lib/monitoring/error-store";
import { siteOrigin } from "@/lib/seo";
import { allPageSeoRecords, fillToolCount } from "@/lib/seo/pages";
import { getSystemHealth, readRecentErrors } from "@/lib/system-health";
import {
  authorizeAdminApi,
  apiError,
  assertSameOrigin,
  auditAdminAction,
  noStoreJson,
  normalizeText,
  parseJsonObject,
} from "@/lib/supabase/admin-api";
import {
  getOverviewSnapshot,
  readCategoryCatalog,
  readToolCatalog,
} from "@/lib/supabase/admin-data";
import type {
  AdminSubmissionStatus,
  FeedbackType,
  SiteSettingKey,
} from "@/lib/supabase/database.types";
import {
  PUBLIC_CATALOG_CACHE_TAG,
  PUBLIC_SITE_SETTINGS_CACHE_TAG,
} from "@/lib/supabase/public-catalog";
import {
  TOOL_MAINTENANCE_REASON_MAX,
  readStoredToolMaintenance,
  withToolMaintenance,
} from "@/lib/tool-maintenance";

function revalidatePublicCatalog() {
  try {
    revalidateTag(PUBLIC_CATALOG_CACHE_TAG, { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
  } catch {
    // Revalidation store is unavailable in unit-test environments outside Next request context.
  }
}

function revalidatePublicSiteSettings() {
  try {
    revalidateTag(PUBLIC_SITE_SETTINGS_CACHE_TAG, { expire: 0 });
    revalidatePath("/", "layout");
  } catch {
    // Revalidation store is unavailable in unit-test environments outside Next request context.
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = new Set<AdminSubmissionStatus>([
  "new",
  "in_progress",
  "resolved",
]);
const feedbackTypes = new Set<FeedbackType>([
  "unclassified",
  "general",
  "bug",
  "feature_request",
  "other",
]);
const validToolSlugs = new Set<string>(tools.map((tool) => tool.slug));
const settingKeys = new Set<SiteSettingKey>([
  "website_name",
  "tagline",
  "contact_email",
  "social_links",
  "footer_links",
  "announcement",
  "maintenance",
  "homepage_content",
  "legal_meta",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { resource } = await context.params;
  try {
    if (resource === "overview") {
      const snapshot = await getOverviewSnapshot();
      if (!snapshot.connected)
        return apiError(503, "Admin database tables are not ready.");
      return noStoreJson({ data: snapshot });
    }
    if (resource === "tools") {
      const [catalog, categories] = await Promise.all([
        readToolCatalog(),
        readCategoryCatalog(),
      ]);
      return noStoreJson({
        data: catalog.tools,
        category_options: categories.categories.map(
          (category) => category.name,
        ),
        persisted: catalog.configured && categories.configured,
      });
    }
    if (resource === "categories") {
      const catalog = await readCategoryCatalog();
      return noStoreJson({
        data: catalog.categories,
        persisted: catalog.configured,
      });
    }
    if (resource === "submissions" || resource === "feedback") {
      const table =
        resource === "submissions"
          ? "quickkit_contact_submissions"
          : "quickkit_feedback_submissions";
      let query = access.context.db
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      const status = request.nextUrl.searchParams.get("status");
      const statusFilter =
        status && statuses.has(status as AdminSubmissionStatus)
          ? (status as AdminSubmissionStatus)
          : null;
      if (statusFilter) query = query.eq("status", statusFilter);
      if (resource === "submissions") {
        const { data, error } = await query;
        if (error) return apiError(503, "Private submissions are unavailable.");
        return noStoreJson({ data: data ?? [] });
      }
      // The feedback inbox combines written messages with tool star ratings.
      let ratingQuery = access.context.db
        .from("quickkit_tool_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter) ratingQuery = ratingQuery.eq("status", statusFilter);
      // Reads nothing useful; it only tells whether the homepage form's
      // rating column exists yet (see `homepage_ratings_ready` below).
      const homepageRatingProbe = access.context.db
        .from("quickkit_feedback_submissions")
        .select("rating")
        .limit(1);
      const [messages, ratings, homepageRatings] = await Promise.all([
        query,
        ratingQuery,
        homepageRatingProbe,
      ]);
      if (messages.error)
        return apiError(503, "Private submissions are unavailable.");
      const toolNames = new Map<string, string>(
        tools.map((tool) => [tool.slug, tool.name]),
      );
      // Homepage feedback: a message, a star rating, or both.
      const messageRows = (messages.data ?? []).map((row) => {
        const { rating, tags, tool_slug, ...rest } = row as typeof row & {
          rating?: unknown;
          tags?: unknown;
          tool_slug?: unknown;
        };
        // "About": the tool the visitor chose, when they chose one.
        const about =
          typeof tool_slug === "string" && tool_slug ? tool_slug : null;
        const hasRating =
          typeof rating === "number" &&
          Number.isInteger(rating) &&
          rating >= 1 &&
          rating <= 5;
        return {
          ...rest,
          source: "message" as const,
          ...(hasRating
            ? { rating, tags: Array.isArray(tags) ? tags : [] }
            : {}),
          ...(about
            ? { tool_slug: about, tool_name: toolNames.get(about) ?? about }
            : {}),
        };
      });
      // Until the tool-ratings migration is applied the ratings read fails;
      // the written messages are still shown and the page says why.
      const ratingRows = ratings.error
        ? []
        : (ratings.data ?? []).map((row) => ({
            id: row.id,
            created_at: row.created_at,
            status: row.status,
            internal_notes: row.internal_notes,
            name: null,
            message: row.comment,
            source: "rating" as const,
            tool_slug: row.tool_slug,
            tool_name: toolNames.get(row.tool_slug) ?? row.tool_slug,
            rating: row.rating,
            tags: Array.isArray(row.tags) ? row.tags : [],
          }));
      return noStoreJson({
        data: [...messageRows, ...ratingRows].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        ),
        ratings_ready: !ratings.error,
        // False until the homepage-rating migration is applied: plain
        // messages still arrive, but a visitor's star rating cannot be saved.
        homepage_ratings_ready: !homepageRatings.error,
      });
    }
    if (resource === "settings") {
      const { data, error } = await access.context.db
        .from("quickkit_admin_site_settings")
        .select("setting_key,setting_value,updated_at")
        .order("setting_key");
      if (error) return apiError(503, "Site settings are unavailable.");
      return noStoreJson({ data: data ?? [] });
    }
    if (resource === "activity") {
      const { data, error } = await access.context.db
        .from("quickkit_admin_activity")
        .select(
          "id,actor_email,action,entity_type,entity_id,details,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) return apiError(503, "Audit activity is unavailable.");
      return noStoreJson({ data: data ?? [] });
    }
    if (resource === "seo") {
      const [toolCatalog, categoryCatalog] = await Promise.all([
        readToolCatalog(),
        readCategoryCatalog(),
      ]);
      const activeToolCount = toolCatalog.tools.filter(
        (tool) => tool.is_published && tool.is_enabled,
      ).length;
      // The static/non-tool inventory is composed from the same registry the
      // pages resolve their metadata from, rather than a second hand-maintained
      // copy. `{count}` is filled with the live published-tool count so the
      // admin preview matches what the page will render.
      const pageRecords = allPageSeoRecords().filter(
        (record) => record.indexable,
      );
      const common = pageRecords.map((record) => {
        const title = fillToolCount(record.title, activeToolCount);
        const description = fillToolCount(record.description, activeToolCount);
        return {
          path: record.path,
          // The rendered `<title>`, brand suffix included, exactly as
          // `pageMetadata()` produces it — the operator is reviewing the SERP
          // string, not the raw registry field.
          title: `${title} | QUICKKIT`,
          description,
          canonical: siteOrigin ? `${siteOrigin}${record.path}` : null,
          indexable: indexingEnabled,
        };
      });
      const toolPages = toolCatalog.tools.map((tool) => ({
        path: tool.route,
        title: tool.seo_title,
        description: tool.seo_description,
        canonical: siteOrigin ? `${siteOrigin}${tool.canonical_path}` : null,
        indexable:
          indexingEnabled &&
          tool.is_published &&
          tool.is_enabled &&
          tool.is_indexable &&
          tool.canonical_path === tool.route,
      }));
      const categoryPages = categoryCatalog.categories.map((category) => ({
        path: `/category/${category.slug}`,
        title: category.seo_title,
        description: category.description,
        canonical: siteOrigin
          ? `${siteOrigin}/category/${category.slug}`
          : null,
        indexable:
          indexingEnabled && category.is_published && category.tool_count > 0,
      }));
      return noStoreJson({
        data: [...common, ...categoryPages, ...toolPages],
        configuration: {
          sitemap: siteOrigin ? `${siteOrigin}/sitemap.xml` : null,
          robots_path: "/robots.txt",
          indexing_enabled: indexingEnabled,
          last_generated: null,
        },
      });
    }
    if (resource === "security") {
      // "Run full check" and the Security page land here, so the two HTTP
      // probes skip their cache and every answer is from this request.
      const [probe, system, recentErrors] = await Promise.all([
        access.context.db
          .from("quickkit_admin_activity")
          .select("id", { count: "exact", head: true }),
        getSystemHealth(access.context.db, { fresh: true }),
        readRecentErrors(access.context.db),
      ]);
      const rls = system.rls;
      return noStoreJson({
        data: {
          email: access.context.admin.email,
          last_sign_in_at: access.context.admin.lastSignInAt,
          allowlist_configured: !!process.env.QUICKKIT_ADMIN_EMAILS?.trim(),
          supabase_configured:
            !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
            !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
          service_role_configured:
            !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
          submission_hmac_configured:
            !!process.env.SUPABASE_SUBMISSION_HMAC_SECRET?.trim(),
          database_status: probe.error ? "Unavailable" : "Connected",
          rls_status:
            rls.status === "verified"
              ? `Verified · ${rls.tables} tables protected`
              : rls.status === "issues"
                ? `Needs attention · ${
                    new Set([...rls.unprotected, ...rls.anon_readable]).size
                  } of ${rls.tables} tables`
                : probe.error
                  ? "Migration/table unavailable; verify in Supabase"
                  : "Live check unavailable · apply the system health migration",
          signup_disabled: system.smtp.signup_disabled,
          checked_at: system.checked_at,
          analytics_url_present: Boolean(
            process.env.ANALYTICS_DATABASE_URL?.trim(),
          ),
          analytics_token_present: Boolean(
            process.env.ANALYTICS_DATABASE_TOKEN?.trim(),
          ),
          sitemap_origin_configured: Boolean(siteOrigin),
          indexing_enabled: indexingEnabled,
          smtp_status: system.smtp.verified_on
            ? `Custom SMTP confirmed in Supabase on ${system.smtp.verified_on}`
            : "Managed externally in Supabase Auth · not verified by app",
          error_monitoring_status: system.error_monitoring.configured
            ? "Enabled · first-party store"
            : getServerErrorMonitoringStatus().enabled
              ? "Enabled · store unavailable"
              : "Not configured",
          system,
          recent_errors: recentErrors,
        },
      });
    }
    if (resource === "profile")
      return noStoreJson({
        data: {
          email: access.context.admin.email,
          id: access.context.admin.id,
          last_sign_in_at: access.context.admin.lastSignInAt,
        },
      });
    return apiError(404, "Admin resource not found.");
  } catch {
    return apiError(503, "The administrator data service is unavailable.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  if (!assertSameOrigin(request))
    return apiError(403, "This create request was not accepted.");
  const body = await parseJsonObject(request);
  if (!body) return apiError(400, "A valid JSON object is required.");
  const { resource } = await context.params;
  if (resource !== "categories")
    return apiError(405, "This resource does not support record creation.");
  try {
    return await createCategory(body, access.context);
  } catch {
    return apiError(503, "The administrator data service is unavailable.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  if (!assertSameOrigin(request))
    return apiError(403, "This change request was not accepted.");
  const body = await parseJsonObject(request);
  if (!body) return apiError(400, "A valid JSON object is required.");
  const { resource } = await context.params;
  try {
    if (resource === "tools")
      return await updateTool(request, body, access.context);
    if (resource === "categories")
      return await updateCategory(body, access.context);
    if (resource === "submissions" || resource === "feedback")
      return await updateSubmission(resource, body, access.context);
    if (resource === "settings")
      return await updateSettings(body, access.context);
    return apiError(404, "Admin resource not found.");
  } catch {
    return apiError(503, "The administrator data service is unavailable.");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  if (!assertSameOrigin(request))
    return apiError(403, "This delete request was not accepted.");
  const body = await parseJsonObject(request);
  if (!body || body.confirm !== true)
    return apiError(400, "Explicit confirmation is required.");
  const { resource } = await context.params;
  try {
    if (resource === "tools") {
      if (
        Object.keys(body).some((key) => !["slug", "confirm"].includes(key)) ||
        typeof body.slug !== "string" ||
        !validToolSlugs.has(body.slug)
      )
        return apiError(
          400,
          "Confirm a known tool before resetting its overrides.",
        );
      const tool = tools.find((item) => item.slug === body.slug)!;
      if (
        !(await auditAdminAction(
          access.context,
          "tool.reset",
          "tool",
          tool.slug,
        ))
      )
        return apiError(
          503,
          "The change could not be recorded; no data was changed.",
        );
      const { error } = await access.context.db
        .from("quickkit_admin_tool_overrides")
        .upsert(
          {
            tool_slug: tool.slug,
            name_override: null,
            description_override: null,
            category_override: null,
            icon_override: null,
            metadata_override: {},
            is_published: true,
            is_enabled: true,
            is_featured: false,
            seo_title: null,
            seo_description: null,
            canonical_path: null,
            is_indexable: true,
            updated_by: access.context.admin.id,
          } as never,
          { onConflict: "tool_slug" },
        );
      if (error) return apiError(503, "Tool overrides could not be reset.");
      revalidatePublicCatalog();
      return noStoreJson({ ok: true, reset: true });
    }
    if (resource === "categories") {
      if (
        Object.keys(body).some((key) => !["slug", "confirm"].includes(key)) ||
        typeof body.slug !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(body.slug)
      )
        return apiError(400, "Confirm a valid category before archiving it.");
      const catalog = await readCategoryCatalog();
      const category = catalog.categories.find(
        (item) => item.slug === body.slug,
      );
      if (!category) return apiError(404, "Category not found.");
      if (category.tool_count > 0)
        return apiError(
          409,
          "Reassign or unpublish tools before archiving this category.",
        );
      if (
        !(await auditAdminAction(
          access.context,
          "category.archive",
          "category",
          category.slug,
        ))
      )
        return apiError(
          503,
          "The change could not be recorded; category was not archived.",
        );
      const { error } = await access.context.db
        .from("quickkit_admin_category_overrides")
        .upsert(
          {
            category_slug: category.slug,
            is_published: false,
            updated_by: access.context.admin.id,
          } as never,
          { onConflict: "category_slug" },
        );
      if (error) return apiError(503, "Category could not be archived.");
      revalidatePublicCatalog();
      return noStoreJson({ ok: true, archived: true });
    }
    if (resource !== "submissions" && resource !== "feedback")
      return apiError(405, "This resource cannot be deleted.");
    if (
      Object.keys(body).some(
        (key) =>
          ![
            "id",
            "confirm",
            ...(resource === "feedback" ? ["source"] : []),
          ].includes(key),
      ) ||
      typeof body.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.id) ||
      ("source" in body &&
        body.source !== "message" &&
        body.source !== "rating")
    )
      return apiError(
        400,
        "Confirm the specific submission before deleting it.",
      );
    const table =
      resource === "submissions"
        ? "quickkit_contact_submissions"
        : body.source === "rating"
          ? "quickkit_tool_feedback"
          : "quickkit_feedback_submissions";
    if (
      !(await auditAdminAction(
        access.context,
        "submission.delete",
        resource,
        body.id,
      ))
    )
      return apiError(
        503,
        "The change could not be recorded; no data was deleted.",
      );
    const { data, error } = await access.context.db
      .from(table)
      .delete()
      .eq("id", body.id)
      .select("id")
      .maybeSingle();
    if (error) return apiError(503, "The submission could not be deleted.");
    if (!data) return apiError(404, "Submission not found.");
    return noStoreJson({ ok: true });
  } catch {
    return apiError(503, "The administrator data service is unavailable.");
  }
}

async function updateTool(
  request: NextRequest,
  body: Record<string, unknown>,
  context: Parameters<typeof auditAdminAction>[0],
) {
  const allowed = new Set([
    "slug",
    "name",
    "description",
    "category",
    "icon",
    "is_published",
    "is_enabled",
    "is_featured",
    "seo_title",
    "seo_description",
    "canonical_path",
    "is_indexable",
    "maintenance_enabled",
    "maintenance_reason",
  ]);
  if (
    Object.keys(body).some((key) => !allowed.has(key)) ||
    typeof body.slug !== "string" ||
    !validToolSlugs.has(body.slug)
  )
    return apiError(400, "Unknown tool or unsupported fields.");
  const tool = tools.find((item) => item.slug === body.slug)!;
  const update: Record<string, unknown> = {
    tool_slug: tool.slug,
    updated_by: context.admin.id,
  };
  const textFields: [
    [string, string, number],
    [string, string, number],
    [string, string, number],
    [string, string, number],
    [string, string, number],
    [string, string, number],
  ] = [
    ["name", "name_override", 120],
    ["description", "description_override", 1000],
    ["category", "category_override", 80],
    ["icon", "icon_override", 40],
    ["seo_title", "seo_title", 180],
    ["seo_description", "seo_description", 320],
  ];
  for (const [input, column, max] of textFields) {
    if (!(input in body)) continue;
    const value = normalizeText(body[input], max);
    if (value === null || (!value && ["name", "category"].includes(input)))
      return apiError(400, `Invalid ${input}.`);
    if (input === "category") {
      const categories = await readCategoryCatalog();
      if (!categories.categories.some((category) => category.name === value))
        return apiError(400, "Select an existing QUICKKIT category.");
    }
    if (
      input === "icon" &&
      !tools.some((catalogTool) => catalogTool.icon === value)
    )
      return apiError(400, "Select a supported QUICKKIT tool icon.");
    const base =
      input === "name"
        ? tool.name
        : input === "description"
          ? tool.description
          : input === "category"
            ? tool.category
            : input === "icon"
              ? tool.icon
              : input === "seo_title"
                ? tool.name
                : tool.description;
    update[column] = value === base ? null : value;
  }
  if ("canonical_path" in body) {
    const canonicalPath = normalizeText(body.canonical_path, 500);
    if (canonicalPath === null)
      return apiError(400, "Canonical path must be a relative site path.");
    if (!canonicalPath) update.canonical_path = null;
    else {
      const validTarget =
        canonicalPath === `/tools/${tool.slug}` ||
        (canonicalPath.startsWith("/tools/") &&
          validToolSlugs.has(canonicalPath.slice("/tools/".length))) ||
        (canonicalPath.startsWith("/category/") &&
          (await readCategoryCatalog()).categories.some(
            (category) =>
              category.slug === canonicalPath.slice("/category/".length),
          ));
      if (
        !validTarget ||
        !canonicalPath.startsWith("/") ||
        canonicalPath.startsWith("//") ||
        canonicalPath.includes("?") ||
        canonicalPath.includes("#") ||
        canonicalPath.includes("\\") ||
        canonicalPath.includes("..")
      )
        return apiError(
          400,
          "Canonical path must be a known same-site catalog route.",
        );
      update.canonical_path =
        canonicalPath === `/tools/${tool.slug}` ? null : canonicalPath;
    }
  }
  for (const key of [
    "is_published",
    "is_enabled",
    "is_featured",
    "is_indexable",
  ]) {
    if (key in body) {
      if (typeof body[key] !== "boolean")
        return apiError(400, "Visibility flags must be boolean.");
      update[key] = body[key];
    }
  }
  // Maintenance mode ("temporarily off") is stored inside metadata_override.
  let maintenanceChange: "on" | "off" | "note" | null = null;
  if ("maintenance_enabled" in body || "maintenance_reason" in body) {
    if (
      "maintenance_enabled" in body &&
      typeof body.maintenance_enabled !== "boolean"
    )
      return apiError(400, "Maintenance mode must be on or off.");
    const reason =
      "maintenance_reason" in body
        ? normalizeText(body.maintenance_reason, TOOL_MAINTENANCE_REASON_MAX)
        : undefined;
    if (reason === null)
      return apiError(
        400,
        `The maintenance note must be ${TOOL_MAINTENANCE_REASON_MAX} characters or fewer.`,
      );
    const existing = await context.db
      .from("quickkit_admin_tool_overrides")
      .select("metadata_override")
      .eq("tool_slug", tool.slug)
      .maybeSingle();
    if (existing.error)
      return apiError(
        503,
        "Tool metadata could not be read. Verify server configuration and database access.",
      );
    const metadata = existing.data?.metadata_override ?? {};
    const current = readStoredToolMaintenance(metadata);
    const enabled =
      typeof body.maintenance_enabled === "boolean"
        ? body.maintenance_enabled
        : current.enabled;
    const nextReason = reason ?? current.reason;
    if (enabled !== current.enabled || nextReason !== current.reason) {
      update.metadata_override = withToolMaintenance(metadata, {
        enabled,
        reason: nextReason,
        // Keep the original time while the tool stays off.
        since: enabled
          ? current.enabled && current.since
            ? current.since
            : new Date().toISOString()
          : null,
      });
      maintenanceChange =
        enabled !== current.enabled ? (enabled ? "on" : "off") : "note";
    }
  }
  if (Object.keys(update).length <= 2)
    return apiError(400, "No editable changes provided.");
  if (
    !(await auditAdminAction(
      context,
      maintenanceChange === "on"
        ? "tool.maintenance_on"
        : maintenanceChange === "off"
          ? "tool.maintenance_off"
          : "tool.update",
      "tool",
      tool.slug,
      {
        fields: Object.keys(update).filter(
          (k) => !["tool_slug", "updated_by"].includes(k),
        ),
      },
    ))
  )
    return apiError(
      503,
      "The change could not be recorded; no data was changed.",
    );
  const { error } = await context.db
    .from("quickkit_admin_tool_overrides")
    .upsert(update as never, { onConflict: "tool_slug" });
  if (error)
    return apiError(
      503,
      "Tool metadata could not be saved. Verify server configuration and database access.",
    );
  revalidatePublicCatalog();
  return noStoreJson({ ok: true });
}

async function createCategory(
  body: Record<string, unknown>,
  context: Parameters<typeof auditAdminAction>[0],
) {
  const allowed = new Set([
    "slug",
    "name",
    "description",
    "display_order",
    "seo_title",
    "icon",
    "is_published",
  ]);
  if (
    Object.keys(body).some((key) => !allowed.has(key)) ||
    typeof body.slug !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(body.slug) ||
    typeof body.name !== "string"
  )
    return apiError(400, "Provide a valid custom category slug and name.");
  const catalog = await readCategoryCatalog();
  if (catalog.categories.some((category) => category.slug === body.slug))
    return apiError(409, "That category slug already exists.");
  const name = normalizeText(body.name, 80);
  const description = normalizeText(body.description ?? "", 1000);
  const seoTitle = normalizeText(body.seo_title ?? body.name, 180);
  const icon = normalizeText(body.icon ?? "text", 40);
  const order = body.display_order ?? 1000;
  const isPublished = body.is_published ?? false;
  if (
    typeof isPublished !== "boolean" ||
    !name ||
    !description ||
    !seoTitle ||
    !icon ||
    !categoryMeta.some((category) => category.icon === icon) ||
    typeof order !== "number" ||
    !Number.isInteger(order) ||
    order < 0 ||
    order > 1000
  )
    return apiError(400, "Category fields are invalid.");
  if (
    catalog.categories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    )
  )
    return apiError(409, "A category with that name already exists.");
  const row = {
    category_slug: body.slug,
    name_override: name,
    description_override: description,
    display_order: order,
    is_published: isPublished,
    seo_title: seoTitle,
    icon_override: icon,
    updated_by: context.admin.id,
  };
  if (
    !(await auditAdminAction(
      context,
      "category.create",
      "category",
      body.slug,
      {
        fields: [
          "name",
          "description",
          "display_order",
          "seo_title",
          "icon",
          "is_published",
        ],
      },
    ))
  )
    return apiError(
      503,
      "The change could not be recorded; no category was created.",
    );
  const { error } = await context.db
    .from("quickkit_admin_category_overrides")
    .insert(row as never);
  if (error) return apiError(503, "Category could not be created.");
  revalidatePublicCatalog();
  return noStoreJson({ ok: true, created: true }, 201);
}

async function updateCategory(
  body: Record<string, unknown>,
  context: Parameters<typeof auditAdminAction>[0],
) {
  const allowed = new Set([
    "slug",
    "name",
    "description",
    "display_order",
    "is_published",
    "seo_title",
    "icon",
  ]);
  if (
    Object.keys(body).some((key) => !allowed.has(key)) ||
    typeof body.slug !== "string"
  )
    return apiError(400, "Unknown category or unsupported fields.");
  const catalog = await readCategoryCatalog();
  const category = catalog.categories.find((item) => item.slug === body.slug);
  if (!category) return apiError(404, "Category not found.");
  const update: Record<string, unknown> = {
    category_slug: category.slug,
    updated_by: context.admin.id,
  };
  const fields: [string, string, number][] = [
    ["name", "name_override", 80],
    ["description", "description_override", 1000],
    ["seo_title", "seo_title", 180],
    ["icon", "icon_override", 40],
  ];
  for (const [input, column, max] of fields) {
    if (!(input in body)) continue;
    const value = normalizeText(body[input], max);
    if (value === null || (input === "name" && !value))
      return apiError(400, `Invalid ${input}.`);
    if (input === "icon" && !categoryMeta.some((item) => item.icon === value))
      return apiError(400, "Select a supported QUICKKIT category icon.");
    if (
      input === "name" &&
      catalog.categories.some(
        (item) =>
          item.slug !== category.slug &&
          item.name.toLowerCase() === value.toLowerCase(),
      )
    )
      return apiError(409, "A category with that name already exists.");
    if (
      input === "name" &&
      category.is_custom &&
      value !== category.name &&
      category.tool_count > 0
    )
      return apiError(409, "Reassign tools before renaming this category.");
    const base =
      input === "name"
        ? category.is_custom
          ? category.name
          : categoryMeta.find((item) => item.slug === category.slug)?.name
        : input === "description"
          ? category.is_custom
            ? category.description
            : categoryMeta.find((item) => item.slug === category.slug)
                ?.description
          : input === "seo_title"
            ? category.is_custom
              ? category.seo_title
              : categoryMeta.find((item) => item.slug === category.slug)
                  ?.seoTitle
            : category.is_custom
              ? category.icon
              : categoryMeta.find((item) => item.slug === category.slug)?.icon;
    update[column] =
      category.is_custom && input === "name"
        ? value
        : value === base
          ? null
          : value;
  }
  if ("display_order" in body) {
    const order = body.display_order;
    if (
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 0 ||
      order > 1000
    )
      return apiError(
        400,
        "Display order must be an integer between 0 and 1000.",
      );
    update.display_order = order;
  }
  if ("is_published" in body) {
    if (typeof body.is_published !== "boolean")
      return apiError(400, "Published must be boolean.");
    update.is_published = body.is_published;
  }
  if (Object.keys(update).length <= 2)
    return apiError(400, "No editable changes provided.");
  if (
    !(await auditAdminAction(
      context,
      "category.update",
      "category",
      category.slug,
      {
        fields: Object.keys(update).filter(
          (key) => !["category_slug", "updated_by"].includes(key),
        ),
      },
    ))
  )
    return apiError(
      503,
      "The change could not be recorded; no data was changed.",
    );
  const { error } = await context.db
    .from("quickkit_admin_category_overrides")
    .upsert(update as never, { onConflict: "category_slug" });
  if (error) return apiError(503, "Category metadata could not be saved.");
  revalidatePublicCatalog();
  return noStoreJson({ ok: true });
}

async function updateSubmission(
  resource: "submissions" | "feedback",
  body: Record<string, unknown>,
  context: Parameters<typeof auditAdminAction>[0],
) {
  const keys =
    resource === "feedback"
      ? ["id", "status", "feedback_type", "internal_notes", "source"]
      : ["id", "status", "internal_notes"];
  if (
    Object.keys(body).some((k) => !keys.includes(k)) ||
    typeof body.id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.id) ||
    ("source" in body && body.source !== "message" && body.source !== "rating")
  )
    return apiError(400, "Invalid submission update.");
  // Star ratings live in their own table and have no message type.
  const isRating = resource === "feedback" && body.source === "rating";
  const update: Record<string, unknown> = {};
  if ("status" in body) {
    if (
      typeof body.status !== "string" ||
      !statuses.has(body.status as AdminSubmissionStatus)
    )
      return apiError(400, "Invalid status.");
    update.status = body.status;
  }
  if ("internal_notes" in body) {
    const notes = normalizeText(body.internal_notes, 10000);
    if (notes === null) return apiError(400, "Internal notes are too long.");
    update.internal_notes = notes;
  }
  if ("feedback_type" in body) {
    if (
      resource !== "feedback" ||
      isRating ||
      typeof body.feedback_type !== "string" ||
      !feedbackTypes.has(body.feedback_type as FeedbackType)
    )
      return apiError(400, "Invalid feedback type.");
    update.feedback_type = body.feedback_type;
  }
  if (!Object.keys(update).length)
    return apiError(400, "No editable fields were provided.");
  if (
    !(await auditAdminAction(context, "submission.update", resource, body.id, {
      fields: Object.keys(update),
    }))
  )
    return apiError(
      503,
      "The change could not be recorded; no data was changed.",
    );
  const table =
    resource === "submissions"
      ? "quickkit_contact_submissions"
      : isRating
        ? "quickkit_tool_feedback"
        : "quickkit_feedback_submissions";
  const { data, error } = await context.db
    .from(table)
    .update(update as never)
    .eq("id", body.id)
    .select("id")
    .maybeSingle();
  if (error) return apiError(503, "Submission could not be updated.");
  if (!data) return apiError(404, "Submission not found.");
  return noStoreJson({ ok: true });
}

async function updateSettings(
  body: Record<string, unknown>,
  context: Parameters<typeof auditAdminAction>[0],
) {
  if (
    Object.keys(body).length !== 1 ||
    !Array.isArray(body.entries) ||
    body.entries.length < 1 ||
    body.entries.length > 16
  )
    return apiError(400, "Provide one or more supported settings.");
  const validated: { setting_key: SiteSettingKey; setting_value: unknown }[] =
    [];
  for (const entry of body.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return apiError(400, "Invalid setting entry.");
    const row = entry as Record<string, unknown>;
    if (
      Object.keys(row).some(
        (k) => !["setting_key", "setting_value"].includes(k),
      ) ||
      typeof row.setting_key !== "string" ||
      !settingKeys.has(row.setting_key as SiteSettingKey)
    )
      return apiError(400, "Unsupported setting key.");
    const key = row.setting_key as SiteSettingKey;
    const value = validateSetting(key, row.setting_value);
    if (value === null) return apiError(400, `Invalid ${key} setting.`);
    validated.push({ setting_key: key, setting_value: value });
  }
  if (
    !(await auditAdminAction(
      context,
      "site_settings.update",
      "site_settings",
      null,
      { keys: validated.map((v) => v.setting_key) },
    ))
  )
    return apiError(
      503,
      "The change could not be recorded; no data was changed.",
    );
  const { error } = await context.db
    .from("quickkit_admin_site_settings")
    .upsert(
      validated.map((row) => ({
        setting_key: row.setting_key,
        setting_value: row.setting_value as never,
        updated_by: context.admin.id,
      })),
      { onConflict: "setting_key" },
    );
  if (error)
    return apiError(
      503,
      "Settings could not be saved. Verify server configuration and database access.",
    );
  revalidatePublicSiteSettings();
  return noStoreJson({ ok: true });
}

function validateSetting(key: SiteSettingKey, value: unknown): unknown | null {
  if (key === "website_name" || key === "tagline") {
    const text = normalizeText(value, key === "website_name" ? 80 : 160);
    return text || null;
  }
  if (key === "contact_email") {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return !text ||
      (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) && text.length <= 254)
      ? text
      : null;
  }
  if (key === "announcement" || key === "maintenance") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const obj = value as Record<string, unknown>;
    if (
      Object.keys(obj).some((k) => !["enabled", "message"].includes(k)) ||
      typeof obj.enabled !== "boolean" ||
      typeof obj.message !== "string" ||
      obj.message.trim().length > 500 ||
      (obj.enabled && !obj.message.trim())
    )
      return null;
    return { enabled: obj.enabled, message: obj.message.trim() };
  }
  if (key === "social_links" || key === "footer_links") {
    if (!Array.isArray(value) || value.length > 20) return null;
    const result = [];
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      // `icon` is optional and must match the fixed platform allowlist, so the
      // panel can never introduce an arbitrary icon name or remote image.
      if (
        Object.keys(row).some((k) => !["label", "href", "icon"].includes(k)) ||
        typeof row.label !== "string" ||
        row.label.trim().length < 1 ||
        row.label.length > 50 ||
        typeof row.href !== "string" ||
        row.href.length > 500 ||
        (row.icon !== undefined &&
          (typeof row.icon !== "string" || !isSocialIconId(row.icon)))
      )
        return null;
      try {
        const url = new URL(row.href);
        if (url.protocol !== "https:" || url.username || url.password)
          return null;
      } catch {
        return null;
      }
      result.push({
        label: row.label.trim(),
        href: row.href,
        ...(row.icon ? { icon: row.icon } : {}),
      });
    }
    return result;
  }
  if (key === "legal_meta") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const obj = value as Record<string, unknown>;
    if (
      Object.keys(obj).some(
        (k) => !["last_updated", "last_updated_iso"].includes(k),
      )
    )
      return null;
    const lastUpdated = obj.last_updated;
    const lastUpdatedIso = obj.last_updated_iso;
    if (
      typeof lastUpdated !== "string" ||
      lastUpdated.length < 1 ||
      lastUpdated.length > 60 ||
      /[<>]/.test(lastUpdated)
    )
      return null;
    if (
      typeof lastUpdatedIso !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(lastUpdatedIso)
    )
      return null;
    // The ISO value must be a real calendar date, not just the right shape.
    const parsed = new Date(`${lastUpdatedIso}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== lastUpdatedIso
    )
      return null;
    return {
      last_updated: lastUpdated.trim(),
      last_updated_iso: lastUpdatedIso,
    };
  }
  if (key === "homepage_content") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const obj = value as Record<string, unknown>;
    if (
      Object.keys(obj).some(
        (k) => !["announcement_title", "announcement_body"].includes(k),
      ) ||
      Object.values(obj).some((v) => typeof v !== "string" || v.length > 500)
    )
      return null;
    return obj;
  }
  return null;
}
