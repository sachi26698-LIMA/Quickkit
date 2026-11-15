"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export type ResourceKind =
  "tools" | "categories" | "submissions" | "feedback" | "seo" | "activity";
type Row = AdminTool | AdminCategory | SubmissionRow | Record<string, unknown>;

export default function AdminResourceTable({ kind }: { kind: ResourceKind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [feedbackType, setFeedbackType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${kind}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as {
        data?: Row[];
        category_options?: string[];
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(body?.error ?? `Could not load ${kind}.`);
      setRows(body?.data ?? []);
      if (kind === "tools") setCategoryOptions(body?.category_options ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The data service is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
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
        return (
          matchesQuery &&
          matchesStatus &&
          matchesFeedbackType &&
          matchesFromDate
        );
      }),
    [rows, query, status, feedbackType, fromDate, kind],
  );

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
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(body?.error ?? "The change could not be saved.");
      setSelected(null);
      setNotice("Saved. The change was recorded in the admin activity log.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The change could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveTool(row: Row) {
    const slug = "slug" in row ? String(row.slug) : "";
    if (!slug) return;
    if (
      !window.confirm(
        "Archive this tool from the public website? It will remain in the catalogue and can be restored by republishing it.",
      )
    )
      return;
    await save({ slug, is_enabled: false, is_published: false });
  }

  async function remove(row: Row) {
    if (kind === "tools" || kind === "categories") {
      const slug = "slug" in row ? String(row.slug) : "";
      if (!slug) return;
      const message =
        kind === "tools"
          ? "Reset this tool’s saved overrides to the shipped catalog defaults? The tool itself will not be deleted."
          : "Archive this category from the public website? Its saved record will be retained and can be republished later.";
      if (!window.confirm(message)) return;
      await save({ slug, confirm: true }, "DELETE");
      return;
    }
    const id = "id" in row ? String(row.id) : "";
    if (
      !id ||
      !window.confirm(
        "Permanently delete this submission? This cannot be undone.",
      )
    )
      return;
    await save({ id, confirm: true }, "DELETE");
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
  return (
    <>
      {notice ? (
        <div className={styles["admin-state"]} role="status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className={styles["admin-error"]} role="alert">
          {error}
          {!loading ? (
            <button
              className={styles["admin-link"]}
              onClick={() => void load()}
            >
              {" "}
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={styles["admin-toolbar"]}>
        {kind === "categories" ? (
          <button
            className={styles["admin-button"]}
            onClick={startCategoryCreate}
          >
            Add custom category
          </button>
        ) : null}
        <input
          className={styles["admin-input"]}
          type="search"
          placeholder={`Search ${kind}…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={`Search ${kind}`}
        />
        {kind === "submissions" || kind === "feedback" ? (
          <select
            className={styles["admin-select"]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
            onChange={(event) => setFeedbackType(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="unclassified">Unclassified</option>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature request</option>
            <option value="other">Other</option>
          </select>
        ) : null}
        {kind === "submissions" || kind === "feedback" ? (
          <input
            className={styles["admin-input"]}
            type="date"
            aria-label="Filter from date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        ) : null}
      </div>
      {loading ? (
        <div className={styles["admin-state"]} role="status">
          Loading private data…
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <div className={styles["admin-empty"]}>
          <strong>{rows.length === 0 ? "No records yet" : "No matches"}</strong>
          {rows.length === 0
            ? "There are no database records to display."
            : "Try a different search or filter."}
        </div>
      ) : (
        <div className={styles["admin-table-wrap"]}>
          <table className={styles["admin-table"]}>
            <thead>
              <tr>
                {headers(kind).map((head) => (
                  <th key={head}>{head}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={
                    "slug" in row
                      ? String(row.slug)
                      : "id" in row
                        ? String(row.id)
                        : String(row.id ?? index)
                  }
                >
                  {cells(kind, row)}
                  <td>
                    <div className={styles["admin-row-actions"]}>
                      {editable ? (
                        <button
                          className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                          onClick={() => setSelected(row)}
                        >
                          View / edit
                        </button>
                      ) : null}
                      {kind === "submissions" || kind === "feedback" ? (
                        <button
                          className={`${styles["admin-button"]} ${styles["admin-button--danger"]}`}
                          onClick={() => void remove(row)}
                        >
                          Delete
                        </button>
                      ) : null}
                      {kind === "tools" ? (
                        <>
                          <button
                            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                            onClick={() => void remove(row)}
                          >
                            Reset overrides
                          </button>
                          <button
                            className={`${styles["admin-button"]} ${styles["admin-button--danger"]}`}
                            disabled={Boolean(
                              "is_enabled" in row &&
                              "is_published" in row &&
                              !row.is_enabled &&
                              !row.is_published,
                            )}
                            onClick={() => void archiveTool(row)}
                          >
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
                        <button
                          className={`${styles["admin-button"]} ${styles["admin-button--danger"]}`}
                          disabled={
                            "tool_count" in row && Number(row.tool_count) > 0
                          }
                          title={
                            "tool_count" in row && Number(row.tool_count) > 0
                              ? "Reassign or unpublish tools before archiving this category."
                              : undefined
                          }
                          onClick={() => void remove(row)}
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    </>
  );
}

function headers(kind: ResourceKind) {
  if (kind === "tools") return ["Tool", "Category", "Visibility", "SEO"];
  if (kind === "categories")
    return ["Category", "Tools", "Visibility", "Order"];
  if (kind === "submissions")
    return ["Received", "Sender", "Subject", "Status"];
  if (kind === "feedback") return ["Received", "From", "Type", "Status"];
  if (kind === "activity") return ["Time", "Administrator", "Action", "Record"];
  return ["Page", "Title", "Description", "Indexing"];
}

function cells(kind: ResourceKind, row: Row) {
  const td = (key: string, value: React.ReactNode) => (
    <td key={key}>{value}</td>
  );
  if (kind === "tools") {
    const r = row as AdminTool;
    return (
      <>
        {td(
          "tool",
          <>
            <strong>{r.name}</strong>
            <small>
              <code>{r.slug}</code>
            </small>
          </>,
        )}
        {td("category", r.category)}
        {td(
          "visibility",
          <span
            className={`${styles["admin-badge"]} ${r.is_published && r.is_enabled ? styles["admin-badge--green"] : styles["admin-badge--gray"]}`}
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
          <>
            <span>{r.seo_title || "Missing title"}</span>
            <small>
              {r.seo_description ? "Description set" : "Missing description"}
            </small>
          </>,
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
          <>
            <strong>{r.name}</strong>
            <small>
              <code>/{r.slug}</code>
            </small>
          </>,
        )}
        {td("count", r.tool_count)}
        {td("published", r.is_published ? "Published" : "Unpublished")}
        {td("order", r.display_order + 1)}
      </>
    );
  }
  if (kind === "submissions" || kind === "feedback") {
    const r = row as SubmissionRow;
    return (
      <>
        {td("date", new Date(r.created_at).toLocaleString())}
        {td(
          "sender",
          <>
            <strong>{r.name || "Anonymous"}</strong>
            {r.email ? <small>{r.email}</small> : null}
          </>,
        )}
        {td(
          "subject",
          kind === "submissions"
            ? (r as SubmissionRow).subject
            : r.message.slice(0, 100),
        )}
        {td(
          "status",
          <span className={styles["admin-badge"]}>
            {r.status.replace("_", " ")}
          </span>,
        )}
      </>
    );
  }
  if (kind === "activity") {
    const r = row as Record<string, unknown>;
    return (
      <>
        {td("time", String(r.created_at ?? ""))}
        {td("actor", String(r.actor_email ?? ""))}
        {td("action", String(r.action ?? ""))}
        {td(
          "entity",
          `${String(r.entity_type ?? "")} ${String(r.entity_id ?? "")}`,
        )}
      </>
    );
  }
  const r = row as Record<string, unknown>;
  return (
    <>
      {td(
        "path",
        <Link className={styles["admin-link"]} href={String(r.path ?? "/")}>
          {String(r.path ?? "/")}
        </Link>,
      )}
      {td("title", String(r.title ?? ""))}
      {td("description", String(r.description ?? ""))}
      {td("index", r.indexable ? "Indexable" : "noindex")}
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
  const area = (key: string, label: string, maxLength?: number) => (
    <label key={key}>
      {label}
      <textarea
        maxLength={maxLength}
        value={String(values[key] ?? "")}
        onChange={(event) =>
          setValues((old) => ({ ...old, [key]: event.target.value }))
        }
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
      {label}
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
        {field("canonical_path", "Canonical path (same-site URL)", "text", 500)}
        <p>
          Use a relative path such as /tools/merge-pdf. Leave blank to use this
          tool’s own route.
        </p>
        {toggle("is_indexable", "Allow indexing and sitemap inclusion")}
        {toggle("is_published", "Published")}
        {toggle("is_enabled", "Enabled")}
        {toggle("is_featured", "Featured / popular")}
        <p>
          Tool slug and implementation are immutable here. Preview:{" "}
          <Link
            className={styles["admin-link"]}
            href={String(values.route ?? "/tools")}
            target="_blank"
            rel="noreferrer"
          >
            Open public tool
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
        {toggle("is_published", "Published")}
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
        <div className={styles["admin-detail-grid"]}>
          <p>
            <strong>Received:</strong> {String(values.created_at ?? "")}
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
          <div>{area("message", "Full message")}</div>
        </div>
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
    <div
      className={styles["admin-modal-backdrop"]}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className={styles["admin-modal"]}
        role="dialog"
        aria-modal="true"
        aria-label={`${kind} details`}
      >
        <div className={styles["admin-modal-head"]}>
          <h3>
            {kind === "categories" && r.is_new
              ? "Create custom category"
              : kind === "tools" || kind === "categories"
                ? "Edit catalog metadata"
                : "Record details"}
          </h3>
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={close}
          >
            Close
          </button>
        </div>
        <form className={styles["admin-form"]} onSubmit={submit}>
          {content}
          <div className={styles["admin-row-actions"]}>
            <button
              className={styles["admin-button"]}
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              type="button"
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
