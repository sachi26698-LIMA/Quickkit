"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./admin.module.css";
import type {
  AdminCategory,
  AdminTool,
  SubmissionRow,
} from "@/lib/supabase/admin-data";
import {
  categoryMeta,
  toolCategories,
  tools as catalogTools,
} from "@/lib/catalog";
import {
  AdminConfirmDialog,
  type AdminConfirmConfig,
} from "./admin-confirm-dialog";
import { useAdminLive } from "./admin-live-context";
import { AdminModalLayer } from "./admin-modal-layer";

export type ResourceKind =
  "tools" | "categories" | "submissions" | "feedback" | "seo" | "activity";
type Row = AdminTool | AdminCategory | SubmissionRow | Record<string, unknown>;

export default function AdminResourceTable({ kind }: { kind: ResourceKind }) {
  const router = useRouter();
  const { registerRefreshHandler, setSyncSnapshot, pushToast } = useAdminLive();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [feedbackType, setFeedbackType] = useState("all");
  const [activityEntity, setActivityEntity] = useState("all");
  const [activityWindow, setActivityWindow] = useState("all");
  const [referenceNowMs, setReferenceNowMs] = useState<number>(0);
  const [fromDate, setFromDate] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [draggingId, setDraggingId] = useState("");
  const [confirmConfig, setConfirmConfig] = useState<AdminConfirmConfig | null>(
    null,
  );
  const inFlight = useRef(false);

  const redirectIfUnauthorized = useCallback(
    (response: Response) => {
      if (response.status === 401 || response.status === 403) {
        router.replace(
          response.status === 403
            ? "/admin/login?reason=forbidden"
            : "/admin/login?reason=expired",
        );
        return true;
      }
      return false;
    },
    [router],
  );

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setSyncSnapshot({ refreshing: true });
    try {
      const response = await fetch(`/api/admin/${kind}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (redirectIfUnauthorized(response))
        throw new Error("Admin session expired. Sign in again to continue.");
      const body = (await response.json().catch(() => null)) as {
        data?: Row[];
        category_options?: string[];
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(body?.error ?? `Could not load ${kind}.`);
      const nextRows = body?.data ?? [];
      setRows(nextRows);
      setSelectedIds([]);
      if (kind === "tools") setCategoryOptions(body?.category_options ?? []);
      const syncedAt = Date.now();
      setReferenceNowMs(syncedAt);
      if (kind === "submissions") {
        const newCount = nextRows.filter(
          (row) => "status" in row && row.status === "new",
        ).length;
        setSyncSnapshot({
          syncState: "connected",
          lastSynced: syncedAt,
          badges: { submissions: newCount },
        });
      } else if (kind === "feedback") {
        const newCount = nextRows.filter(
          (row) => "status" in row && row.status === "new",
        ).length;
        setSyncSnapshot({
          syncState: "connected",
          lastSynced: syncedAt,
          badges: { feedback: newCount },
        });
      } else {
        setSyncSnapshot({ syncState: "connected", lastSynced: syncedAt });
      }
    } catch (cause) {
      setSyncSnapshot({ syncState: "stale" });
      setError(
        cause instanceof Error
          ? cause.message
          : "The data service is unavailable.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
      setSyncSnapshot({ refreshing: false });
    }
  }, [kind, redirectIfUnauthorized, setSyncSnapshot]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => registerRefreshHandler(load), [registerRefreshHandler, load]);

  const hasActiveFilters = Boolean(
    query ||
    status !== "all" ||
    feedbackType !== "all" ||
    activityEntity !== "all" ||
    activityWindow !== "all" ||
    fromDate ||
    categoryFilter !== "all" ||
    visibility !== "all" ||
    sortBy !== "default",
  );

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setFeedbackType("all");
    setActivityEntity("all");
    setActivityWindow("all");
    setFromDate("");
    setCategoryFilter("all");
    setVisibility("all");
    setSortBy("default");
    setPage(1);
  }

  const filtered = useMemo(() => {
    const activityCutoff =
      referenceNowMs > 0
        ? activityWindow === "24h"
          ? referenceNowMs - 86_400_000
          : activityWindow === "7d"
            ? referenceNowMs - 7 * 86_400_000
            : activityWindow === "30d"
              ? referenceNowMs - 30 * 86_400_000
              : 0
        : 0;

    return rows.filter((row) => {
      const haystack = Object.values(row)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const rowStatus = "status" in row ? String(row.status) : "";
      const matchesStatus = status === "all" || rowStatus === status;
      const rowFeedbackType =
        "feedback_type" in row ? String(row.feedback_type) : "";
      const matchesFeedbackType =
        kind !== "feedback" ||
        feedbackType === "all" ||
        rowFeedbackType === feedbackType;
      const createdAt = "created_at" in row ? String(row.created_at) : "";
      const matchesFromDate = !fromDate || createdAt.slice(0, 10) >= fromDate;
      const rowEntity =
        "entity_type" in row ? String(row.entity_type).toLowerCase() : "";
      const matchesActivityEntity =
        kind !== "activity" ||
        activityEntity === "all" ||
        rowEntity.includes(activityEntity);
      const createdMs = createdAt ? Date.parse(createdAt) : Number.NaN;
      const matchesActivityWindow =
        kind !== "activity" ||
        activityCutoff === 0 ||
        Number.isNaN(createdMs) ||
        createdMs >= activityCutoff;
      const matchesCategory =
        kind !== "tools" ||
        categoryFilter === "all" ||
        ("category" in row && row.category === categoryFilter);
      const isPublished =
        "is_published" in row ? Boolean(row.is_published) : false;
      const isEnabled = "is_enabled" in row ? Boolean(row.is_enabled) : true;
      const rowVisibility = !isEnabled
        ? "archived"
        : isPublished
          ? "published"
          : "unpublished";
      const matchesVisibility =
        !["tools", "categories"].includes(kind) ||
        visibility === "all" ||
        rowVisibility === visibility;
      return (
        matchesQuery &&
        matchesStatus &&
        matchesFeedbackType &&
        matchesFromDate &&
        matchesActivityEntity &&
        matchesActivityWindow &&
        matchesCategory &&
        matchesVisibility
      );
    });
  }, [
    rows,
    query,
    status,
    feedbackType,
    activityEntity,
    activityWindow,
    referenceNowMs,
    fromDate,
    kind,
    categoryFilter,
    visibility,
  ]);

  const sorted = useMemo(() => {
    if (sortBy === "default") return filtered;
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return [...filtered].sort((a, b) => {
      const value = (row: Row) => {
        if (sortBy === "name") return "name" in row ? String(row.name) : "";
        if (sortBy === "category")
          return "category" in row ? String(row.category) : "";
        if (sortBy === "status")
          return "status" in row ? String(row.status) : "";
        if (sortBy === "date")
          return "created_at" in row ? String(row.created_at) : "";
        return "slug" in row ? String(row.slug) : "";
      };
      const left = value(a);
      const right = value(b);
      return sortBy === "date"
        ? right.localeCompare(left)
        : collator.compare(left, right);
    });
  }, [filtered, sortBy]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const summaryStats = useMemo(() => {
    if (loading || error) return null;
    if (kind === "tools") {
      const toolRows = rows as AdminTool[];
      return [
        {
          label: "Total catalog tools",
          value: toolRows.length,
          tone: "violet",
        },
        {
          label: "Published",
          value: toolRows.filter((r) => r.is_published && r.is_enabled).length,
          tone: "teal",
        },
        {
          label: "Unpublished / disabled",
          value: toolRows.filter((r) => !r.is_published || !r.is_enabled)
            .length,
          tone: "rose",
        },
        {
          label: "Featured",
          value: toolRows.filter((r) => r.is_featured).length,
          tone: "cyan",
        },
      ];
    }
    if (kind === "categories") {
      const catRows = rows as AdminCategory[];
      return [
        { label: "Total categories", value: catRows.length, tone: "violet" },
        {
          label: "Published",
          value: catRows.filter((r) => r.is_published).length,
          tone: "teal",
        },
        {
          label: "Custom categories",
          value: catRows.filter((r) => r.is_custom).length,
          tone: "cyan",
        },
        {
          label: "Assigned tool links",
          value: catRows.reduce((sum, r) => sum + r.tool_count, 0),
          tone: "rose",
        },
      ];
    }
    if (kind === "submissions" || kind === "feedback") {
      const subRows = rows as SubmissionRow[];
      return [
        { label: "Total records", value: subRows.length, tone: "violet" },
        {
          label: "New",
          value: subRows.filter((r) => r.status === "new").length,
          tone: "rose",
        },
        {
          label: "In progress",
          value: subRows.filter((r) => r.status === "in_progress").length,
          tone: "cyan",
        },
        {
          label: "Resolved",
          value: subRows.filter((r) => r.status === "resolved").length,
          tone: "teal",
        },
      ];
    }
    if (kind === "activity") {
      const actRows = rows as Record<string, unknown>[];
      return [
        { label: "Recorded events", value: actRows.length, tone: "violet" },
        {
          label: "Tool events",
          value: actRows.filter((r) =>
            String(r.entity_type ?? "").includes("tool"),
          ).length,
          tone: "cyan",
        },
        {
          label: "Category events",
          value: actRows.filter((r) =>
            String(r.entity_type ?? "").includes("category"),
          ).length,
          tone: "rose",
        },
        {
          label: "Settings & inbox",
          value: actRows.filter((r) => {
            const t = String(r.entity_type ?? "");
            return (
              t.includes("setting") ||
              t.includes("submission") ||
              t.includes("feedback")
            );
          }).length,
          tone: "teal",
        },
      ];
    }
    return null;
  }, [kind, rows, loading, error]);

  const seoDiagnostics = useMemo(() => {
    if (kind !== "seo") return null;
    const seoRows = rows as Record<string, unknown>[];
    const titles = seoRows
      .map((row) =>
        String(row.title ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    const titleCounts = new Map<string, number>();
    for (const title of titles)
      titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    return {
      total: seoRows.length,
      missingTitle: seoRows.filter((row) => !String(row.title ?? "").trim())
        .length,
      missingDescription: seoRows.filter(
        (row) => !String(row.description ?? "").trim(),
      ).length,
      duplicateTitles: [...titleCounts.values()].filter((count) => count > 1)
        .length,
    };
  }, [kind, rows]);

  async function save(payload: Record<string, unknown>, method = "PATCH") {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/${kind}`, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (redirectIfUnauthorized(response))
        throw new Error("Admin session expired. Sign in again to continue.");
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(body?.error ?? "The change could not be saved.");
      setSelected(null);
      setConfirmConfig(null);
      const successText =
        "Saved. The change was recorded in the admin activity log.";
      setNotice(successText);
      pushToast({
        tone: "success",
        title:
          method === "DELETE"
            ? "Action confirmed"
            : method === "POST"
              ? "Record created"
              : "Changes saved",
        description: "Recorded in the administrator audit log.",
      });
      await load();
      window.dispatchEvent(new Event("quickkit:admin-mutated"));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The change could not be saved.";
      setError(message);
      pushToast({
        tone: "error",
        title: "Action failed",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  function rowKey(row: Row) {
    return "slug" in row ? String(row.slug) : "id" in row ? String(row.id) : "";
  }

  function categoryPosition(slug: string) {
    return [...(rows as AdminCategory[])]
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.name.localeCompare(b.name),
      )
      .findIndex((item) => item.slug === slug);
  }

  function moveCategory(slug: string, offset: -1 | 1) {
    const ordered = [...(rows as AdminCategory[])].sort(
      (a, b) =>
        a.display_order - b.display_order || a.name.localeCompare(b.name),
    );
    const position = ordered.findIndex((item) => item.slug === slug);
    return reorderCategory(slug, ordered[position + offset]?.slug ?? "");
  }

  async function reorderCategory(fromSlug: string, toSlug: string) {
    if (!fromSlug || !toSlug || fromSlug === toSlug || kind !== "categories")
      return;
    const ordered = [...(rows as AdminCategory[])].sort(
      (a, b) =>
        a.display_order - b.display_order || a.name.localeCompare(b.name),
    );
    const fromIndex = ordered.findIndex((item) => item.slug === fromSlug);
    const toIndex = ordered.findIndex((item) => item.slug === toSlug);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    const changed = ordered.map((item, index) => ({
      ...item,
      display_order: index,
    }));
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const responses = await Promise.all(
        changed.map(async (item) => {
          const existing = rows.find((row) => rowKey(row) === item.slug) as
            AdminCategory | undefined;
          if (item.display_order === existing?.display_order) return true;
          const response = await fetch(`/api/admin/categories`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: item.slug,
              display_order: item.display_order,
            }),
          });
          redirectIfUnauthorized(response);
          return response.ok;
        }),
      );
      await load();
      if (responses.some((ok) => !ok))
        throw new Error(
          "Category order may be partially updated. The list was refreshed; review it before trying again.",
        );
      setNotice("Category order saved and confirmed by the Admin API.");
      pushToast({
        tone: "success",
        title: "Category order updated",
        description: "New display sequence confirmed by Admin API.",
      });
      window.dispatchEvent(new Event("quickkit:admin-mutated"));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Category order could not be saved.";
      setError(message);
      pushToast({
        tone: "error",
        title: "Reorder failed",
        description: message,
      });
    } finally {
      setSaving(false);
      setDraggingId("");
    }
  }

  async function executeBulkPatch(
    description: string,
    makePayload: (row: Row) => Record<string, unknown>,
  ) {
    const selectedRows = rows.filter((row) =>
      selectedIds.includes(rowKey(row)),
    );
    if (!selectedRows.length) return;
    setBulkSaving(true);
    setError("");
    setNotice("");
    try {
      const results = await Promise.all(
        selectedRows.map(async (row) => {
          const response = await fetch(`/api/admin/${kind}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(makePayload(row)),
          });
          redirectIfUnauthorized(response);
          return response.ok;
        }),
      );
      setConfirmConfig(null);
      await load();
      if (results.some((ok) => !ok))
        throw new Error(
          "Some selected records could not be updated. The list was refreshed; review each row before retrying.",
        );
      const summary = `${description} for ${selectedRows.length} selected ${kind}.`;
      setNotice(summary);
      pushToast({
        tone: "success",
        title: "Bulk update complete",
        description: summary,
      });
      window.dispatchEvent(new Event("quickkit:admin-mutated"));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The bulk change could not be completed.";
      setError(message);
      pushToast({
        tone: "error",
        title: "Bulk update failed",
        description: message,
      });
    } finally {
      setBulkSaving(false);
    }
  }

  function exportCsv() {
    const headersForExport: string[] =
      kind === "tools"
        ? [
            "slug",
            "name",
            "category",
            "is_enabled",
            "is_published",
            "is_featured",
            "seo_title",
            "seo_description",
            "canonical_path",
          ]
        : kind === "categories"
          ? [
              "slug",
              "name",
              "description",
              "display_order",
              "is_published",
              "seo_title",
              "tool_count",
            ]
          : kind === "activity"
            ? [
                "created_at",
                "actor_email",
                "action",
                "entity_type",
                "entity_id",
              ]
            : [
                "id",
                "created_at",
                "name",
                "email",
                "subject",
                "message",
                "status",
                "feedback_type",
                "internal_notes",
              ];
    const cell = (value: unknown) => {
      let text = value == null ? "" : String(value);
      if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const lines = [
      headersForExport,
      ...sorted.map((row) =>
        headersForExport.map((key) =>
          key in row ? (row as Record<string, unknown>)[key] : "",
        ),
      ),
    ].map((line) => line.map(cell).join(","));
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quickkit-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast({
      tone: "info",
      title: "CSV exported",
      description: `Downloaded ${sorted.length} filtered ${kind} rows.`,
    });
  }

  function requestArchiveTool(row: Row) {
    const slug = "slug" in row ? String(row.slug) : "";
    const name = "name" in row ? String(row.name) : slug;
    if (!slug) return;
    setConfirmConfig({
      title: `Archive ${name}?`,
      description:
        "This disables and hides the tool from the public QUICKKIT catalog. Its catalog record remains intact and can be restored anytime by republishing it.",
      confirmLabel: "Archive tool",
      targetLabel: slug,
      tone: "warning",
      onConfirm: () => save({ slug, is_enabled: false, is_published: false }),
    });
  }

  function requestRemove(row: Row) {
    if (kind === "tools") {
      const slug = "slug" in row ? String(row.slug) : "";
      const name = "name" in row ? String(row.name) : slug;
      if (!slug) return;
      setConfirmConfig({
        title: `Reset overrides for ${name}?`,
        description:
          "Saved name, description, category, icon, visibility, and SEO overrides will revert to the shipped catalog defaults. The tool itself is not deleted.",
        confirmLabel: "Confirm reset",
        targetLabel: slug,
        tone: "warning",
        onConfirm: () => save({ slug, confirm: true }, "DELETE"),
      });
      return;
    }
    if (kind === "categories") {
      const slug = "slug" in row ? String(row.slug) : "";
      const name = "name" in row ? String(row.name) : slug;
      if (!slug) return;
      setConfirmConfig({
        title: `Archive ${name}?`,
        description:
          "This unpublishes the category from the public website while retaining its saved override record so it can be republished later.",
        confirmLabel: "Archive category",
        targetLabel: slug,
        tone: "warning",
        onConfirm: () => save({ slug, confirm: true }, "DELETE"),
      });
      return;
    }
    const id = "id" in row ? String(row.id) : "";
    if (!id) return;
    setConfirmConfig({
      title: `Permanently delete this ${kind === "submissions" ? "submission" : "feedback record"}?`,
      description:
        "This record will be permanently removed from Supabase and cannot be recovered. An audit event recording the deletion will remain in the activity log.",
      confirmLabel: "Delete permanently",
      targetLabel: id,
      tone: "danger",
      onConfirm: () => save({ id, confirm: true }, "DELETE"),
    });
  }

  function startCategoryCreate() {
    setError("");
    setSelected({
      slug: "",
      name: "",
      description: "",
      display_order: 1000,
      is_published: false,
      seo_title: "",
      icon: "text",
      tool_count: 0,
      is_custom: true,
      is_new: true,
    } as unknown as Row);
  }

  const editable =
    kind === "tools" ||
    kind === "categories" ||
    kind === "submissions" ||
    kind === "feedback";

  const columnHeaders = headers(kind);

  return (
    <>
      {summaryStats ? (
        <div
          className={styles["admin-summary-strip"]}
          aria-label={`${kind} summary metrics`}
        >
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className={`${styles["admin-summary-pill"]} ${styles[`admin-summary-pill--${stat.tone}`]}`}
            >
              <span>{stat.label}</span>
              <strong>{stat.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {notice ? (
        <div className={styles["admin-state"]} role="status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className={styles["admin-error"]} role="alert">
          <span>{error}</span>
          {!loading ? (
            <button
              type="button"
              className={styles["admin-link"]}
              onClick={() => void load()}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {seoDiagnostics && !loading && !error ? (
        <div
          className={styles["admin-seo-summary"]}
          aria-label="SEO inventory checks"
        >
          <div>
            <strong>{seoDiagnostics.total}</strong>
            <span>inventory routes</span>
          </div>
          <div>
            <strong>{seoDiagnostics.missingTitle}</strong>
            <span>missing titles</span>
          </div>
          <div>
            <strong>{seoDiagnostics.missingDescription}</strong>
            <span>missing descriptions</span>
          </div>
          <div>
            <strong>{seoDiagnostics.duplicateTitles}</strong>
            <span>duplicate title groups</span>
          </div>
          <p>
            Local metadata inventory only. It does not report search-engine
            indexing or Search Console status.
          </p>
        </div>
      ) : null}

      <div className={styles["admin-toolbar"]}>
        {kind === "categories" ? (
          <button
            type="button"
            className={styles["admin-button"]}
            onClick={startCategoryCreate}
          >
            <Plus size={15} aria-hidden="true" />
            Add custom category
          </button>
        ) : null}
        <div className={styles["admin-search-field"]}>
          <Search size={15} aria-hidden="true" />
          <input
            className={styles["admin-input"]}
            type="search"
            placeholder={`Search ${kind}…`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            aria-label={`Search ${kind}`}
          />
        </div>
        {kind === "submissions" || kind === "feedback" ? (
          <select
            className={styles["admin-select"]}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        ) : null}
        {kind === "feedback" ? (
          <select
            className={styles["admin-select"]}
            aria-label="Feedback type"
            value={feedbackType}
            onChange={(event) => {
              setFeedbackType(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            <option value="unclassified">Unclassified</option>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature request</option>
            <option value="other">Other</option>
          </select>
        ) : null}
        {kind === "activity" ? (
          <>
            <select
              className={styles["admin-select"]}
              value={activityEntity}
              onChange={(event) => {
                setActivityEntity(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by event category"
            >
              <option value="all">All events</option>
              <option value="tool">Tool updates</option>
              <option value="category">Category updates</option>
              <option value="submission">Submission actions</option>
              <option value="feedback">Feedback actions</option>
              <option value="setting">Site settings</option>
            </select>
            <select
              className={styles["admin-select"]}
              value={activityWindow}
              onChange={(event) => {
                setActivityWindow(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by time period"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </>
        ) : null}
        {kind === "submissions" || kind === "feedback" ? (
          <input
            className={styles["admin-input"]}
            type="date"
            aria-label="Filter from date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
          />
        ) : null}
        {kind === "tools" ? (
          <select
            className={styles["admin-select"]}
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        ) : null}
        {kind === "tools" || kind === "categories" ? (
          <select
            className={styles["admin-select"]}
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by visibility"
          >
            <option value="all">All visibility</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            {kind === "tools" ? (
              <option value="archived">Archived</option>
            ) : null}
          </select>
        ) : null}
        <label className={styles["admin-sort-control"]}>
          <span>Sort</span>
          <select
            className={styles["admin-select"]}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort records"
          >
            <option value="default">Default order</option>
            <option value="name">Name A–Z</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
            <option value="date">Newest first</option>
          </select>
        </label>
        {hasActiveFilters ? (
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--ghost"]}`}
            onClick={clearFilters}
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        ) : null}
        <div className={styles["admin-toolbar-right"]}>
          <button
            type="button"
            className={styles["admin-icon-button"]}
            onClick={() => void load()}
            disabled={loading}
            aria-label={`Refresh ${kind}`}
            title={`Refresh ${kind}`}
          >
            <RefreshCw
              size={15}
              className={loading ? styles["admin-spin"] : ""}
              aria-hidden="true"
            />
          </button>
          <button
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={exportCsv}
            disabled={!sorted.length}
            type="button"
          >
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {kind === "tools" && selectedIds.length ? (
        <div
          className={styles["admin-bulk-bar"]}
          role="region"
          aria-label="Bulk tool actions"
        >
          <strong>{selectedIds.length} selected</strong>
          <button
            type="button"
            className={styles["admin-button"]}
            disabled={bulkSaving}
            onClick={() =>
              void executeBulkPatch("Published", (row) => ({
                slug: rowKey(row),
                is_enabled: true,
                is_published: true,
              }))
            }
          >
            Publish
          </button>
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            disabled={bulkSaving}
            onClick={() =>
              void executeBulkPatch("Unpublished", (row) => ({
                slug: rowKey(row),
                is_published: false,
              }))
            }
          >
            Unpublish
          </button>
          <label className={styles["admin-sort-control"]}>
            <span className={styles["admin-visually-hidden"]}>
              Assign selected tools to category
            </span>
            <select
              className={styles["admin-select"]}
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              aria-label="Bulk category assignment"
            >
              <option value="">Assign category…</option>
              {categoryOptions.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            disabled={bulkSaving || !bulkCategory}
            onClick={() =>
              void executeBulkPatch("Category assigned", (row) => ({
                slug: rowKey(row),
                category: bulkCategory,
              }))
            }
          >
            Apply
          </button>
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--danger"]}`}
            disabled={bulkSaving}
            onClick={() =>
              setConfirmConfig({
                title: `Archive ${selectedIds.length} selected tools?`,
                description:
                  "All selected tools will be disabled and hidden from public listings. Their catalog records remain intact and can be republished later.",
                confirmLabel: "Archive selected",
                tone: "danger",
                onConfirm: () =>
                  executeBulkPatch("Archived", (row) => ({
                    slug: rowKey(row),
                    is_enabled: false,
                    is_published: false,
                  })),
              })
            }
          >
            <Archive size={14} aria-hidden="true" />
            Archive selected
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className={styles["admin-skeleton-panel"]} role="status">
          <span className={styles["admin-visually-hidden"]}>
            Loading private data…
          </span>
          {Array.from({ length: 6 }).map((_, index) => (
            <div className={styles["admin-skeleton-row"]} key={index}>
              <span className={styles["admin-skeleton-bar"]} />
              <span className={styles["admin-skeleton-bar"]} />
              <span className={styles["admin-skeleton-bar"]} />
              <span className={styles["admin-skeleton-bar"]} />
            </div>
          ))}
        </div>
      ) : error ? null : sorted.length === 0 ? (
        <div className={styles["admin-empty"]}>
          <span className={styles["admin-empty-icon"]} aria-hidden="true">
            <FolderOpen size={22} />
          </span>
          <strong>{rows.length === 0 ? "No records yet" : "No matches"}</strong>
          <p>
            {rows.length === 0
              ? "There are no persisted database records to display."
              : "No records match the active search or filters."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              onClick={clearFilters}
            >
              Reset filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles["admin-table-wrap"]}>
          <table className={styles["admin-table"]}>
            <thead>
              <tr>
                {kind === "tools" ? (
                  <th className={styles["admin-th-check"]}>
                    <input
                      type="checkbox"
                      aria-label="Select all tools on this page"
                      checked={
                        pageRows.length > 0 &&
                        pageRows.every((row) =>
                          selectedIds.includes(rowKey(row)),
                        )
                      }
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [
                                ...new Set([
                                  ...current,
                                  ...pageRows.map(rowKey),
                                ]),
                              ]
                            : current.filter(
                                (id) =>
                                  !pageRows.some((row) => rowKey(row) === id),
                              ),
                        )
                      }
                    />
                  </th>
                ) : null}
                {columnHeaders.map((head) => (
                  <th key={head}>{head}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  draggable={kind === "categories"}
                  onDragStart={(event) => {
                    if (kind === "categories") {
                      setDraggingId(rowKey(row));
                      event.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onDragOver={(event) => {
                    if (kind === "categories") event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (kind === "categories") {
                      event.preventDefault();
                      void reorderCategory(draggingId, rowKey(row));
                    }
                  }}
                  key={
                    "slug" in row
                      ? String(row.slug)
                      : "id" in row
                        ? String(row.id)
                        : String(index)
                  }
                >
                  {kind === "tools" ? (
                    <td
                      className={styles["admin-td-check"]}
                      data-label="Select"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${"name" in row ? String(row.name) : rowKey(row)}`}
                        checked={selectedIds.includes(rowKey(row))}
                        onChange={(event) =>
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, rowKey(row)])]
                              : current.filter((id) => id !== rowKey(row)),
                          )
                        }
                      />
                    </td>
                  ) : null}
                  {cells(kind, row, columnHeaders)}
                  <td data-label="Actions">
                    <div className={styles["admin-row-actions"]}>
                      {editable ? (
                        <button
                          type="button"
                          className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
                          onClick={() => setSelected(row)}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          View / edit
                        </button>
                      ) : null}
                      {kind === "submissions" || kind === "feedback" ? (
                        <button
                          type="button"
                          className={`${styles["admin-button"]} ${styles["admin-button--danger"]} ${styles["admin-button--sm"]}`}
                          onClick={() => requestRemove(row)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Delete
                        </button>
                      ) : null}
                      {kind === "tools" ? (
                        <>
                          <button
                            type="button"
                            className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
                            onClick={() => requestRemove(row)}
                          >
                            <RotateCcw size={13} aria-hidden="true" />
                            Reset overrides
                          </button>
                          <button
                            type="button"
                            className={`${styles["admin-button"]} ${styles["admin-button--danger"]} ${styles["admin-button--sm"]}`}
                            disabled={Boolean(
                              "is_enabled" in row &&
                              "is_published" in row &&
                              !row.is_enabled &&
                              !row.is_published,
                            )}
                            onClick={() => requestArchiveTool(row)}
                          >
                            <Archive size={13} aria-hidden="true" />
                            {"is_enabled" in row &&
                            "is_published" in row &&
                            !row.is_enabled &&
                            !row.is_published
                              ? "Archived"
                              : "Archive"}
                          </button>
                        </>
                      ) : null}
                      {kind === "categories" ? (
                        <>
                          <button
                            type="button"
                            className={`${styles["admin-icon-button"]} ${styles["admin-icon-button--sm"]}`}
                            aria-label={`Move ${"name" in row ? String(row.name) : "category"} up`}
                            disabled={
                              categoryPosition(rowKey(row)) <= 0 || saving
                            }
                            onClick={() => void moveCategory(rowKey(row), -1)}
                          >
                            <ArrowUp size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles["admin-icon-button"]} ${styles["admin-icon-button--sm"]}`}
                            aria-label={`Move ${"name" in row ? String(row.name) : "category"} down`}
                            disabled={
                              categoryPosition(rowKey(row)) >=
                                rows.length - 1 || saving
                            }
                            onClick={() => void moveCategory(rowKey(row), 1)}
                          >
                            <ArrowDown size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles["admin-button"]} ${styles["admin-button--danger"]} ${styles["admin-button--sm"]}`}
                            disabled={
                              "tool_count" in row && Number(row.tool_count) > 0
                            }
                            title={
                              "tool_count" in row && Number(row.tool_count) > 0
                                ? "Reassign or unpublish tools before archiving this category."
                                : undefined
                            }
                            onClick={() => requestRemove(row)}
                          >
                            <Archive size={13} aria-hidden="true" />
                            Archive
                          </button>
                        </>
                      ) : null}
                      {kind === "seo" ? (
                        <Link
                          className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
                          href={String(
                            (row as Record<string, unknown>).path ?? "/",
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={13} aria-hidden="true" />
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && sorted.length ? (
        <div className={styles["admin-pagination"]}>
          <span>
            Showing{" "}
            <strong>
              {Math.min((currentPage - 1) * pageSize + 1, sorted.length)}–
              {Math.min(currentPage * pageSize, sorted.length)}
            </strong>{" "}
            of <strong>{sorted.length}</strong>
          </span>
          <label>
            Rows per page{" "}
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className={styles["admin-pagination-controls"]}>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <Editor
          kind={kind}
          row={selected}
          categoryOptions={categoryOptions}
          saving={saving}
          close={() => setSelected(null)}
          save={save}
        />
      ) : null}

      <AdminConfirmDialog
        config={confirmConfig}
        pending={saving || bulkSaving}
        onClose={() => setConfirmConfig(null)}
      />
    </>
  );
}

function headers(kind: ResourceKind): string[] {
  if (kind === "tools") return ["Tool", "Category", "Visibility", "SEO"];
  if (kind === "categories")
    return ["Category", "Tools", "Visibility", "Order"];
  if (kind === "submissions")
    return ["Received", "Sender", "Subject", "Status"];
  if (kind === "feedback") return ["Received", "From", "Type", "Status"];
  if (kind === "activity") return ["Time", "Administrator", "Action", "Record"];
  return ["Page", "Search preview", "Canonical URL", "Indexing"];
}

function cells(kind: ResourceKind, row: Row, cols: string[]) {
  const td = (key: string, label: string, value: React.ReactNode) => (
    <td key={key} data-label={label}>
      {value}
    </td>
  );

  if (kind === "tools") {
    const r = row as AdminTool;
    return (
      <>
        {td(
          "tool",
          cols[0],
          <div className={styles["admin-cell-primary"]}>
            <strong>{r.name}</strong>
            <small>
              <code className={styles["admin-code"]}>{r.slug}</code>
              {r.is_featured ? (
                <span className={styles["admin-badge--featured"]}>
                  Featured
                </span>
              ) : null}
            </small>
          </div>,
        )}
        {td(
          "category",
          cols[1],
          <span className={styles["admin-category-chip"]}>{r.category}</span>,
        )}
        {td(
          "visibility",
          cols[2],
          <span
            className={`${styles["admin-badge"]} ${
              r.is_published && r.is_enabled
                ? styles["admin-badge--green"]
                : !r.is_enabled
                  ? styles["admin-badge--danger"]
                  : styles["admin-badge--gray"]
            }`}
          >
            {r.is_enabled
              ? r.is_published
                ? "Published"
                : "Unpublished"
              : "Disabled"}
          </span>,
        )}
        {td(
          "seo",
          cols[3],
          <div className={styles["admin-cell-seo"]}>
            <span>{r.seo_title || "Missing title"}</span>
            <small>
              {r.seo_description ? "Description set" : "Missing description"}
            </small>
          </div>,
        )}
      </>
    );
  }
  if (kind === "categories") {
    const r = row as AdminCategory;
    return (
      <>
        {td(
          "category",
          cols[0],
          <div className={styles["admin-cell-drag"]}>
            <GripVertical
              size={14}
              className={styles["admin-drag-grip"]}
              aria-hidden="true"
            />
            <div>
              <strong>{r.name}</strong>
              <small>
                <code className={styles["admin-code"]}>/{r.slug}</code>
              </small>
            </div>
          </div>,
        )}
        {td(
          "count",
          cols[1],
          <strong className={styles["admin-tabular"]}>{r.tool_count}</strong>,
        )}
        {td(
          "published",
          cols[2],
          <span
            className={`${styles["admin-badge"]} ${r.is_published ? styles["admin-badge--green"] : styles["admin-badge--gray"]}`}
          >
            {r.is_published ? "Published" : "Unpublished"}
          </span>,
        )}
        {td(
          "order",
          cols[3],
          <span className={styles["admin-order-pill"]}>
            #{r.display_order + 1}
          </span>,
        )}
      </>
    );
  }
  if (kind === "submissions" || kind === "feedback") {
    const r = row as SubmissionRow;
    const statusClass =
      r.status === "resolved"
        ? styles["admin-badge--green"]
        : r.status === "in_progress"
          ? styles["admin-badge--cyan"]
          : styles["admin-badge--rose"];
    return (
      <>
        {td(
          "date",
          cols[0],
          <time dateTime={r.created_at} className={styles["admin-tabular"]}>
            {new Date(r.created_at).toLocaleString()}
          </time>,
        )}
        {td(
          "sender",
          cols[1],
          <div className={styles["admin-cell-primary"]}>
            <strong>{r.name || "Anonymous"}</strong>
            {r.email ? <small>{r.email}</small> : null}
          </div>,
        )}
        {td(
          "subject",
          cols[2],
          kind === "submissions" ? (
            <span>{r.subject}</span>
          ) : (
            <div className={styles["admin-cell-primary"]}>
              <span className={styles["admin-category-chip"]}>
                {(r.feedback_type ?? "unclassified").replaceAll("_", " ")}
              </span>
              <small>{r.message.slice(0, 100)}</small>
            </div>
          ),
        )}
        {td(
          "status",
          cols[3],
          <span className={`${styles["admin-badge"]} ${statusClass}`}>
            {r.status.replaceAll("_", " ")}
          </span>,
        )}
      </>
    );
  }
  if (kind === "activity") {
    const r = row as Record<string, unknown>;
    const createdAt = String(r.created_at ?? "");
    return (
      <>
        {td(
          "time",
          cols[0],
          <time dateTime={createdAt} className={styles["admin-tabular"]}>
            {createdAt ? new Date(createdAt).toLocaleString() : "—"}
          </time>,
        )}
        {td("actor", cols[1], <strong>{String(r.actor_email ?? "")}</strong>)}
        {td(
          "action",
          cols[2],
          <span className={styles["admin-category-chip"]}>
            {String(r.action ?? "")}
          </span>,
        )}
        {td(
          "entity",
          cols[3],
          <span>
            {String(r.entity_type ?? "")}
            {r.entity_id ? (
              <>
                {" "}
                <code className={styles["admin-code"]}>
                  {String(r.entity_id)}
                </code>
              </>
            ) : null}
          </span>,
        )}
      </>
    );
  }
  const r = row as Record<string, unknown>;
  const title = String(r.title ?? "");
  const description = String(r.description ?? "");
  const canonical = String(r.canonical ?? "");
  return (
    <>
      {td(
        "path",
        cols[0],
        <Link className={styles["admin-link"]} href={String(r.path ?? "/")}>
          {String(r.path ?? "/")}
        </Link>,
      )}
      {td(
        "preview",
        cols[1],
        <div className={styles["admin-cell-seo"]}>
          <strong>{title || "Missing title"}</strong>
          <small>{description || "Missing description"}</small>
          <small>
            {title.length}/180 title · {description.length}/320 description
            characters
          </small>
        </div>,
      )}
      {td(
        "canonical",
        cols[2],
        canonical ? (
          <a
            className={styles["admin-link"]}
            href={canonical}
            target="_blank"
            rel="noreferrer"
          >
            Inspect canonical ↗
          </a>
        ) : (
          <span className={styles["admin-muted-inline"]}>
            Canonical origin not configured
          </span>
        ),
      )}
      {td(
        "index",
        cols[3],
        <span
          className={`${styles["admin-badge"]} ${r.indexable ? styles["admin-badge--green"] : styles["admin-badge--gray"]}`}
        >
          {r.indexable ? "Indexable by config" : "Noindex by config"}
        </span>,
      )}
    </>
  );
}

function Editor({
  kind,
  row,
  categoryOptions,
  saving,
  close,
  save,
}: {
  kind: ResourceKind;
  row: Row;
  categoryOptions: string[];
  saving: boolean;
  close: () => void;
  save: (payload: Record<string, unknown>, method?: string) => Promise<void>;
}) {
  const r = row as Record<string, unknown>;
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      Object.entries(r).map(([key, value]) => [
        key,
        typeof value === "boolean" ? value : value == null ? "" : String(value),
      ]),
    ),
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, saving]);

  const field = (
    key: string,
    label: string,
    type = "text",
    maxLength?: number,
  ) => (
    <label key={key}>
      {label}
      <input
        type={type}
        maxLength={maxLength}
        value={String(values[key] ?? "")}
        onChange={(event) =>
          setValues((old) => ({ ...old, [key]: event.target.value }))
        }
      />
    </label>
  );
  const selectField = (key: string, label: string, options: string[]) => (
    <label key={key}>
      {label}
      <select
        value={String(values[key] ?? "")}
        onChange={(event) =>
          setValues((old) => ({ ...old, [key]: event.target.value }))
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
  const area = (
    key: string,
    label: string,
    maxLength?: number,
    readOnly = false,
  ) => (
    <label key={key}>
      {label}
      <textarea
        maxLength={maxLength}
        readOnly={readOnly}
        value={String(values[key] ?? "")}
        onChange={(event) => {
          if (!readOnly)
            setValues((old) => ({ ...old, [key]: event.target.value }));
        }}
      />
    </label>
  );
  const toggle = (key: string, label: string) => (
    <label className={styles["admin-toggle"]} key={key}>
      <input
        type="checkbox"
        checked={Boolean(values[key])}
        onChange={(event) =>
          setValues((old) => ({ ...old, [key]: event.target.checked }))
        }
      />
      <span>{label}</span>
    </label>
  );

  let content: React.ReactNode;
  if (kind === "tools")
    content = (
      <>
        <div className={styles["admin-detail-grid"]}>
          {field("name", "Tool name", "text", 120)}
          {selectField(
            "category",
            "Category",
            categoryOptions.length ? categoryOptions : [...toolCategories],
          )}
          {selectField("icon", "Icon", [
            ...new Set(catalogTools.map((tool) => tool.icon)),
          ])}
          {field("seo_title", "SEO title", "text", 180)}
        </div>
        {area("description", "Public description", 1000)}
        {area("seo_description", "SEO description", 320)}
        <p className={styles["admin-character-guidance"]}>
          {String(values.seo_title ?? "").length}/180 title characters ·{" "}
          {String(values.seo_description ?? "").length}/320 description
          characters
        </p>
        {field("canonical_path", "Canonical path (same-site URL)", "text", 500)}
        <p className={styles["admin-field-hint"]}>
          Use a relative path such as /tools/merge-pdf. Leave blank to use this
          tool’s own route.
        </p>
        <div className={styles["admin-toggle-group"]}>
          {toggle("is_indexable", "Allow indexing and sitemap inclusion")}
          {toggle("is_published", "Published")}
          {toggle("is_enabled", "Enabled")}
          {toggle("is_featured", "Featured / popular")}
        </div>
        <p className={styles["admin-field-hint"]}>
          Tool slug and implementation are immutable here. Preview:{" "}
          <Link
            className={styles["admin-link"]}
            href={String(values.route ?? "/tools")}
            target="_blank"
            rel="noreferrer"
          >
            Open public tool ↗
          </Link>
        </p>
      </>
    );
  else if (kind === "categories")
    content = (
      <>
        {r.is_new ? (
          <div className={styles["admin-detail-grid"]}>
            {field(
              "slug",
              "URL slug (lowercase letters, numbers and hyphens)",
              "text",
              80,
            )}
          </div>
        ) : null}
        <div className={styles["admin-detail-grid"]}>
          {field("name", "Category name", "text", 80)}
          {field("display_order", "Display order", "number")}
          {field("seo_title", "SEO title", "text", 180)}
          {selectField("icon", "Icon", [
            ...new Set(categoryMeta.map((category) => category.icon)),
          ])}
        </div>
        {area("description", "Description", 1000)}
        <p className={styles["admin-character-guidance"]}>
          {String(values.seo_title ?? "").length}/180 SEO title characters ·{" "}
          {String(values.description ?? "").length}/1000 description characters
        </p>
        <div className={styles["admin-toggle-group"]}>
          {toggle("is_published", "Published")}
        </div>
        <p className={styles["admin-field-hint"]}>
          Preview the currently published version:{" "}
          {String(values.slug ?? "") ? (
            <Link
              className={styles["admin-link"]}
              href={`/category/${encodeURIComponent(String(values.slug))}`}
              target="_blank"
              rel="noreferrer"
            >
              Open public category ↗
            </Link>
          ) : (
            "Save the category first to create its preview URL."
          )}
        </p>
      </>
    );
  else if (kind === "submissions" || kind === "feedback")
    content = (
      <>
        <div className={styles["admin-detail-grid"]}>
          {selectField("status", "Status", ["new", "in_progress", "resolved"])}
          {kind === "feedback"
            ? selectField("feedback_type", "Feedback type", [
                "unclassified",
                "general",
                "bug",
                "feature_request",
                "other",
              ])
            : null}
        </div>
        <div className={styles["admin-meta-box"]}>
          <p>
            <strong>Received:</strong>{" "}
            {values.created_at
              ? new Date(String(values.created_at)).toLocaleString()
              : "—"}
          </p>
          <p>
            <strong>From:</strong> {String(values.name || "Anonymous")}{" "}
            {values.email ? `· ${String(values.email)}` : ""}
          </p>
          {kind === "submissions" ? (
            <p>
              <strong>Subject:</strong> {String(values.subject ?? "")}
            </p>
          ) : null}
        </div>
        {area("message", "Full message", undefined, true)}
        {area("internal_notes", "Internal notes (private)", 10000)}
      </>
    );
  else content = <p>Read-only record.</p>;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const idKey =
      kind === "tools" ? "slug" : kind === "categories" ? "slug" : "id";
    const id = String(values[idKey] ?? "");
    if (kind === "tools")
      void save({
        slug: id,
        name: values.name,
        description: values.description,
        category: values.category,
        icon: values.icon,
        seo_title: values.seo_title,
        seo_description: values.seo_description,
        canonical_path: values.canonical_path,
        is_indexable: values.is_indexable,
        is_published: values.is_published,
        is_enabled: values.is_enabled,
        is_featured: values.is_featured,
      });
    else if (kind === "categories") {
      const payload = {
        slug: id,
        name: values.name,
        description: values.description,
        display_order: Number(values.display_order),
        seo_title: values.seo_title,
        icon: values.icon,
        is_published: values.is_published,
      };
      void save(payload, r.is_new ? "POST" : "PATCH");
    } else if (kind === "submissions" || kind === "feedback")
      void save({
        id,
        status: values.status,
        feedback_type: values.feedback_type,
        internal_notes: values.internal_notes,
      });
  }

  return (
    <AdminModalLayer>
      <div
        className={styles["admin-modal-backdrop"]}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) close();
        }}
      >
        <section
          className={styles["admin-modal"]}
          role="dialog"
          aria-modal="true"
          aria-label={`${kind} details`}
        >
          <div className={styles["admin-modal-head"]}>
            <div>
              <span className={styles["admin-kicker"]}>
                {kind.toUpperCase()}
              </span>
              <h3>
                {kind === "categories" && r.is_new
                  ? "Create custom category"
                  : kind === "tools" || kind === "categories"
                    ? "Edit catalog metadata"
                    : "Record details"}
              </h3>
            </div>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
              onClick={close}
              disabled={saving}
            >
              <X size={14} aria-hidden="true" />
              Close
            </button>
          </div>
          <form
            className={`${styles["admin-form"]} ${styles["admin-modal-form"]}`}
            onSubmit={submit}
          >
            <div className={styles["admin-modal-body"]}>{content}</div>
            <div className={styles["admin-modal-actions"]}>
              <button
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                type="button"
                onClick={close}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles["admin-button"]}
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminModalLayer>
  );
}
