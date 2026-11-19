"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  CheckCircle2,
  Download,
  FileJson,
  FileUp,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import styles from "./admin-fonts.module.css";
import type {
  FontInspectionReport,
  FontLicenseIndexEntry,
  RejectedFont,
} from "@/lib/fonts/types";

type Status = "approved" | "pending" | "rejected";

type FontRow = {
  slug: string;
  family: string;
  category: string;
  tags: string[];
  weights: number[];
  weightRange: [number, number];
  variable: boolean;
  featured: boolean;
  score: number;
  coverage: number;
  conjunctSingleGlyph: number;
  conjunctTotal: number;
  licenseType: string;
  version: string;
  addedAt: string;
  updatedAt: string;
  bytes: number;
  files: number;
  status: Status;
  overrideNote: string;
  overrideFamily: string;
  overrideCategory: string;
  overrideTags: string[];
  errors: string[];
  warnings: string[];
  sampleText: string;
  conjuncts: { text: string; singleGlyph: boolean; ok: boolean }[];
  matras: { text: string; ok: boolean }[];
  nukta: { text: string; ok: boolean }[];
  latin: { required: number; present: number; percent: number } | null;
};

type QueueItem = {
  id: string;
  fileName: string;
  family: string;
  sha256: string;
  bytes: number;
  addedAt: string;
  status: "pending" | "approved" | "rejected";
  report: FontInspectionReport;
  storedFile: string | null;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "catalogue", label: "Catalogue" },
  { id: "validation", label: "Validation" },
  { id: "imports", label: "Imports" },
  { id: "usage", label: "Usage" },
  { id: "licences", label: "Licences" },
  { id: "export", label: "Export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const escaped = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([`\ufeff${escaped}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bytes(value: number): string {
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

export default function AdminFonts({
  generatedAt,
  stats,
  fonts: initialFonts,
  rejected,
  validationTotals,
  verifier,
  queue: initialQueue,
  usage,
  duplicates,
  licenses,
  importReport,
  overridesUpdatedAt,
}: {
  generatedAt: string;
  stats: {
    discovered: number;
    verified: number;
    rejected: number;
    files: number;
    woff2Bytes: number;
    variableFamilies: number;
    licenses: string[];
  };
  fonts: FontRow[];
  rejected: RejectedFont[];
  validationTotals: {
    discovered: number;
    verified: number;
    rejected: number;
    scannedFiles: number;
  };
  verifier: {
    engine: string;
    fontTools: string;
    checks: string[];
    sampleText: string;
  };
  queue: QueueItem[];
  usage: {
    fonts: Record<string, number>;
    updatedAt: string | null;
    persisted: boolean;
  };
  duplicates: {
    kind: string;
    key: string;
    fonts: { slug: string; family: string }[];
  }[];
  licenses: FontLicenseIndexEntry[];
  importReport: {
    generatedAt: string;
    summary: { discovered: number; verified: number; rejected: number };
    rejected: RejectedFont[];
  };
  overridesUpdatedAt: string | null;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [fonts, setFonts] = useState(initialFonts);
  const [queue, setQueue] = useState(initialQueue);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<FontRow | null>(null);
  const [reports, setReports] = useState<
    {
      fileName: string;
      report: FontInspectionReport;
      stageError: string | null;
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fonts
      .filter((font) =>
        statusFilter === "all" ? true : font.status === statusFilter,
      )
      .filter((font) =>
        needle
          ? `${font.family} ${font.category} ${font.tags.join(" ")} ${font.slug}`
              .toLowerCase()
              .includes(needle)
          : true,
      );
  }, [fonts, query, statusFilter]);

  const usageRows = useMemo(
    () =>
      Object.entries(usage.fonts)
        .map(([slug, count]) => ({
          slug,
          count,
          family: fonts.find((font) => font.slug === slug)?.family ?? slug,
        }))
        .sort((a, b) => b.count - a.count),
    [usage.fonts, fonts],
  );

  const updateStatus = async (slug: string, status: Status) => {
    setMessage(null);
    const response = await fetch("/api/admin/fonts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set-status", slug, status }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !body?.ok) {
      setMessage({
        kind: "error",
        text: body?.error ?? "The status change could not be saved.",
      });
      return;
    }
    setFonts((current) =>
      current.map((font) => (font.slug === slug ? { ...font, status } : font)),
    );
    setMessage({
      kind: "ok",
      text:
        status === "approved"
          ? "Family approved and visible in the public library."
          : status === "rejected"
            ? "Family rejected and removed from the public library."
            : "Family set to pending and hidden from the public library.",
    });
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    setMessage(null);
    const next: typeof reports = [];
    for (const file of Array.from(fileList).slice(0, 12)) {
      const form = new FormData();
      form.append("file", file);
      form.append("stage", "true");
      try {
        const response = await fetch("/api/admin/fonts/verify", {
          method: "POST",
          body: form,
        });
        const body = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          report?: FontInspectionReport;
          staged?: QueueItem | null;
          stageError?: string | null;
        } | null;
        if (!response.ok || !body?.report) {
          next.push({
            fileName: file.name,
            report: {
              family: file.name,
              subfamily: null,
              version: null,
              unitsPerEm: 0,
              glyphCount: 0,
              cmapEntries: 0,
              licenses: null,
              hasGsub: false,
              hasGpos: false,
              variableAxes: {},
              checks: {
                devanagariCoverage: 0,
                conjunctsSingleGlyph: 0,
                conjunctsTested: 0,
                matrasRendered: 0,
                nuktaRendered: 0,
                numeralsRendered: 0,
                latinRendered: false,
                mixedRendered: false,
              },
              issues: [
                {
                  code: "request_failed",
                  severity: "error",
                  message: body?.error ?? "The verification request failed.",
                },
              ],
              status: "fail",
              sha256: "",
              bytes: file.size,
              suggestedTheme: {
                slug: "",
                family: file.name,
                category: "Sans Serif",
                tags: [],
              },
            },
            stageError: null,
          });
          continue;
        }
        next.push({
          fileName: file.name,
          report: body.report,
          stageError: body.stageError ?? null,
        });
        if (body.staged) {
          setQueue((current) => [
            body.staged as QueueItem,
            ...current.filter((item) => item.id !== body.staged?.id),
          ]);
        }
      } catch {
        setMessage({
          kind: "error",
          text: `Upload of ${file.name} could not be verified.`,
        });
      }
    }
    setReports((current) => [...next, ...current].slice(0, 24));
    setUploading(false);
  };

  const queueAction = async (
    id: string,
    action: { status?: Status; remove?: boolean },
  ) => {
    const response = await fetch("/api/admin/fonts/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...action }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !body?.ok) {
      setMessage({
        kind: "error",
        text: body?.error ?? "The import queue could not be updated.",
      });
      return;
    }
    if (action.remove) {
      setQueue((current) => current.filter((item) => item.id !== id));
    } else if (action.status) {
      setQueue((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action.status as Status } : item,
        ),
      );
    }
  };

  const saveEdit = async (form: HTMLFormElement) => {
    if (!editing) return;
    const data = new FormData(form);
    const payload = {
      action: "update",
      slug: editing.slug,
      patch: {
        family: String(data.get("family") ?? ""),
        category: String(data.get("category") ?? ""),
        tags: String(data.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        note: String(data.get("note") ?? ""),
      },
    };
    const response = await fetch("/api/admin/fonts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !body?.ok) {
      setMessage({
        kind: "error",
        text: body?.error ?? "The edit could not be saved.",
      });
      return;
    }
    setFonts((current) =>
      current.map((font) =>
        font.slug === editing.slug
          ? {
              ...font,
              overrideFamily: payload.patch.family,
              overrideCategory: payload.patch.category,
              overrideTags: payload.patch.tags,
              overrideNote: payload.patch.note,
            }
          : font,
      ),
    );
    setEditing(null);
    setMessage({ kind: "ok", text: "Metadata overlay saved." });
  };

  const catalogueExport = () =>
    downloadJson("biocraft-font-catalogue-admin.json", {
      exportedAt: new Date().toISOString(),
      generatedAt,
      overridesUpdatedAt,
      stats,
      fonts,
    });

  const patchExport = () => {
    const approved = queue.filter((item) => item.status === "approved");
    downloadJson("biocraft-font-import-patch.json", {
      generatedAt: new Date().toISOString(),
      note: "Publish through scripts/fonts/import-devanagari.mjs → verify_fonts.py → build-catalogue.mjs, then deploy.",
      approved: approved.map((item) => ({
        family: item.report.family,
        slug: item.report.suggestedTheme.slug,
        sha256: item.report.sha256,
        bytes: item.report.bytes,
        category: item.report.suggestedTheme.category,
        tags: item.report.suggestedTheme.tags,
        verifiedWith: "fontkit pre-check (full HarfBuzz gate still required)",
        fileName: item.fileName,
      })),
      pending: queue
        .filter((item) => item.status === "pending")
        .map((item) => ({
          family: item.report.family,
          sha256: item.report.sha256,
        })),
    });
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Font admin sections"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "imports" && queue.length ? (
              <span className={`${styles.badge} ${styles.pending}`}>
                {queue.length}
              </span>
            ) : null}
            {item.id === "validation" && rejected.length ? (
              <span className={`${styles.badge} ${styles.rejected}`}>
                {rejected.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {message ? (
        <div
          className={`${styles.alert} ${message.kind === "ok" ? styles.alertOk : styles.alertError}`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      {tab === "overview" ? (
        <>
          <div className={styles.statGrid}>
            <div className={styles.stat}>
              <strong>{stats.verified}</strong>
              <span>verified families</span>
            </div>
            <div className={styles.stat}>
              <strong>{stats.discovered}</strong>
              <span>families discovered</span>
            </div>
            <div className={styles.stat}>
              <strong>{stats.rejected}</strong>
              <span>rejected by verification</span>
            </div>
            <div className={styles.stat}>
              <strong>{stats.files}</strong>
              <span>WOFF2 files</span>
            </div>
            <div className={styles.stat}>
              <strong>{bytes(stats.woff2Bytes)}</strong>
              <span>font assets</span>
            </div>
            <div className={styles.stat}>
              <strong>{stats.variableFamilies}</strong>
              <span>variable families</span>
            </div>
            <div className={styles.stat}>
              <strong>{duplicates.length}</strong>
              <span>duplicate groups</span>
            </div>
            <div className={styles.stat}>
              <strong>
                {queue.filter((item) => item.status === "pending").length}
              </strong>
              <span>imports waiting</span>
            </div>
          </div>

          <div className={styles.panel}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Verification engine</h3>
            <p className={styles.sub} style={{ marginTop: 6 }}>
              {verifier.engine} · fontTools {verifier.fontTools} · catalogue
              built {generatedAt.slice(0, 10)}
            </p>
            <div className={styles.checkGrid}>
              {verifier.checks.map((check) => (
                <div className={styles.check} key={check}>
                  <ShieldCheck size={12} /> {check}
                </div>
              ))}
            </div>
            <p className={styles.note}>
              Sample gate text: <span lang="hi">{verifier.sampleText}</span>
            </p>
            <p className={styles.note}>
              {validationTotals.scannedFiles} Devanagari files scanned ·{" "}
              {validationTotals.verified} verified · {validationTotals.rejected}{" "}
              rejected · {importReport.summary.discovered} discovered from the
              upstream metadata.
            </p>
          </div>

          {rejected.length ? (
            <div className={styles.panel}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Rejected imports</h3>
              <p className={styles.sub} style={{ marginTop: 4 }}>
                Withheld from the public library. The failing check is kept here
                rather than hidden.
              </p>
              {rejected.map((item) => (
                <div className={styles.reportCard} key={item.slug}>
                  <div className={styles.reportHead}>
                    <strong>{item.family}</strong>
                    <span className={`${styles.badge} ${styles.rejected}`}>
                      rejected
                    </span>
                  </div>
                  <div className={styles.sub}>{item.reason}</div>
                </div>
              ))}
            </div>
          ) : null}

          {duplicates.length ? (
            <div className={styles.panel}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Duplicate detection</h3>
              <p className={styles.sub}>
                Identical normalised family names or identical binary hashes.
              </p>
              {duplicates.map((group) => (
                <div
                  className={styles.reportCard}
                  key={`${group.kind}-${group.key}`}
                >
                  <strong>
                    {group.kind === "family"
                      ? "Same family name"
                      : "Identical files"}
                  </strong>
                  <div className={styles.sub}>
                    {group.fonts.map((font) => font.family).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.note}>
              Duplicate check passed: no two families share a name or a
              concatenated file hash.
            </div>
          )}
        </>
      ) : null}

      {tab === "catalogue" ? (
        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <label
              className={styles.input}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search families, tags or slugs"
                style={{
                  border: 0,
                  outline: 0,
                  flex: 1,
                  minWidth: 0,
                  font: "inherit",
                }}
                aria-label="Search fonts"
              />
            </label>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | Status)
              }
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              className={styles.button}
              onClick={catalogueExport}
            >
              <Download size={13} /> Export
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Weights</th>
                  <th>Score</th>
                  <th>Files</th>
                  <th>Licence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((font) => (
                  <tr key={font.slug}>
                    <td>
                      <div className={styles.family}>
                        {font.overrideFamily || font.family}
                      </div>
                      <div className={styles.sub}>
                        {font.slug} · v{font.version}
                      </div>
                      {font.overrideNote ? (
                        <div className={styles.sub}>
                          Note: {font.overrideNote}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[font.status] ?? ""}`}
                      >
                        {font.status}
                      </span>
                    </td>
                    <td>{font.overrideCategory || font.category}</td>
                    <td>
                      {font.weightRange[0]}–{font.weightRange[1]}
                      {font.variable ? " · var" : ""}
                    </td>
                    <td>
                      {font.score}
                      <div className={styles.scoreBar}>
                        <span
                          style={{ width: `${Math.min(100, font.score)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      {font.files}
                      <div className={styles.sub}>{bytes(font.bytes)}</div>
                    </td>
                    <td>{font.licenseType}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" onClick={() => setEditing(font)}>
                          <Pencil size={11} /> Edit
                        </button>
                        {font.status !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(font.slug, "approved")}
                          >
                            <Check size={11} /> Approve
                          </button>
                        ) : null}
                        {font.status !== "rejected" ? (
                          <button
                            type="button"
                            className={styles.danger}
                            onClick={() => updateStatus(font.slug, "rejected")}
                          >
                            <X size={11} /> Reject
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length ? (
            <div className={styles.empty}>No family matches.</div>
          ) : null}
          <p className={styles.note}>
            Status is stored as a local overlay in{" "}
            <span className={styles.mono}>data/fonts/overrides.json</span>. The
            committed catalogue remains the source of truth on read-only
            deployments; export the overlay and commit it there.
          </p>
        </div>
      ) : null}

      {tab === "validation" ? (
        <div className={styles.panel}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Validation report</h3>
          <p className={styles.sub}>
            Every family, its real coverage numbers and the checks that produced
            them. Expand a row for the conjunct, matra and nukta probes.
          </p>
          <div className={styles.tableWrap} style={{ marginTop: 12 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Status</th>
                  <th>Devanagari</th>
                  <th>Conjuncts</th>
                  <th>Latin</th>
                  <th>Findings</th>
                </tr>
              </thead>
              <tbody>
                {fonts.map((font) => (
                  <tr key={font.slug}>
                    <td>
                      <div className={styles.family}>{font.family}</div>
                      <div className={styles.sub}>{font.slug}</div>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${font.errors.length ? styles.rejected : ""}`}
                      >
                        {font.errors.length ? "rejected" : "verified"}
                      </span>
                    </td>
                    <td>{font.coverage}%</td>
                    <td>
                      {font.conjunctSingleGlyph}/{font.conjunctTotal}
                    </td>
                    <td>{font.latin ? `${font.latin.percent}%` : "—"}</td>
                    <td>
                      <details className={styles.details}>
                        <summary>
                          {font.errors.length
                            ? `${font.errors.length} error(s)`
                            : "View probes"}
                        </summary>
                        {font.errors.length ? (
                          <ul className={styles.errorList}>
                            {font.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : null}
                        {font.warnings.length ? (
                          <ul className={styles.warnList}>
                            {font.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className={styles.sub} style={{ marginTop: 8 }}>
                          Conjuncts:{" "}
                          {font.conjuncts.map((test) => test.text).join(" ")} ·
                          Matras:{" "}
                          {font.matras
                            .map((test) => `${test.text}${test.ok ? "" : "✗"}`)
                            .join(" ")}{" "}
                          · Nukta:{" "}
                          {font.nukta
                            .map((test) => `${test.text}${test.ok ? "" : "✗"}`)
                            .join(" ")}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "imports" ? (
        <>
          <div className={styles.panel}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Bulk font import</h3>
            <p className={styles.sub}>
              Upload up to 12 files at a time (.woff2, .woff, .ttf, .otf). Each
              file is decoded and shaped with real Hindi text before it can be
              queued. The full HarfBuzz gate still runs before publication.
            </p>
            <label
              className={styles.dropzone}
              style={{ marginTop: 12, display: "block" }}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".woff2,.woff,.ttf,.otf"
                multiple
                onChange={(event) => void uploadFiles(event.target.files)}
              />
              <strong>
                {uploading
                  ? "Verifying…"
                  : "Choose font files or drop them here"}
              </strong>
              <span>
                Devanagari, Latin, variable and static builds are accepted.
              </span>
            </label>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className={styles.button}
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={13} /> : <FileUp size={13} />}{" "}
                Upload & verify
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={patchExport}
              >
                <FileJson size={13} /> Export publish patch
              </button>
            </div>

            {reports.map((entry, index) => (
              <div
                className={styles.reportCard}
                key={`${entry.fileName}-${index}`}
              >
                <div className={styles.reportHead}>
                  <strong>
                    {entry.report.family}{" "}
                    <span className={styles.sub}>· {entry.fileName}</span>
                  </strong>
                  <span
                    className={`${styles.badge} ${
                      entry.report.status === "fail"
                        ? styles.rejected
                        : entry.report.status === "warn"
                          ? styles.pending
                          : ""
                    }`}
                  >
                    {entry.report.status}
                  </span>
                </div>
                <div className={styles.sub}>
                  {entry.report.glyphCount} glyphs · {entry.report.cmapEntries}{" "}
                  cmap entries · {entry.report.hasGsub ? "GSUB" : "no GSUB"} ·{" "}
                  {entry.report.hasGpos ? "GPOS" : "no GPOS"} ·{" "}
                  {Object.keys(entry.report.variableAxes).join(", ") ||
                    "static"}
                </div>
                <div className={styles.checkGrid}>
                  <div className={styles.check}>
                    <strong>{entry.report.checks.devanagariCoverage}%</strong>
                    Devanagari
                  </div>
                  <div className={styles.check}>
                    <strong>
                      {entry.report.checks.conjunctsSingleGlyph}/
                      {entry.report.checks.conjunctsTested}
                    </strong>
                    single-glyph conjuncts
                  </div>
                  <div className={styles.check}>
                    <strong>{entry.report.checks.matrasRendered}/8</strong>
                    matras
                  </div>
                  <div className={styles.check}>
                    <strong>{entry.report.checks.numeralsRendered}/10</strong>
                    numerals
                  </div>
                </div>
                {entry.report.issues.length ? (
                  <ul className={styles.errorList}>
                    {entry.report.issues.map((issue) => (
                      <li key={`${issue.code}-${issue.message}`}>
                        <strong>{issue.severity}</strong> · {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.sub} style={{ color: "#1a7f5a" }}>
                    Passed the pre-flight checks.
                  </div>
                )}
                {entry.stageError ? (
                  <div className={`${styles.alert} ${styles.alertError}`}>
                    {entry.stageError}
                  </div>
                ) : null}
                <div className={styles.mono} style={{ marginTop: 6 }}>
                  sha256 {entry.report.sha256 || "—"} ·{" "}
                  {bytes(entry.report.bytes)}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.panel}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Publish queue</h3>
            <p className={styles.sub}>
              Approving keeps a font in this review queue and adds it to the
              export patch. Publication still goes through the versioned import
              pipeline, so a deployment never silently changes its public
              catalogue.
            </p>
            {queue.length ? (
              <div className={styles.tableWrap} style={{ marginTop: 12 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Family</th>
                      <th>Status</th>
                      <th>Pre-flight</th>
                      <th>File</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.family}>{item.family}</div>
                          <div className={styles.sub}>{item.fileName}</div>
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${styles[item.status] ?? ""}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {item.report.status} ·{" "}
                          {item.report.checks.devanagariCoverage}%
                        </td>
                        <td className={styles.mono}>{bytes(item.bytes)}</td>
                        <td className={styles.sub}>
                          {item.addedAt.slice(0, 16).replace("T", " ")}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {item.status !== "approved" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  queueAction(item.id, { status: "approved" })
                                }
                              >
                                <CheckCircle2 size={11} /> Approve
                              </button>
                            ) : null}
                            {item.status !== "rejected" ? (
                              <button
                                type="button"
                                className={styles.danger}
                                onClick={() =>
                                  queueAction(item.id, { status: "rejected" })
                                }
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() =>
                                queueAction(item.id, { remove: true })
                              }
                            >
                              <Trash2 size={11} /> Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.empty}>
                No staged imports. Verified files you upload appear here.
              </div>
            )}
            {queue.some((item) => item.status === "approved") ? (
              <p className={styles.note}>
                {queue.filter((item) => item.status === "approved").length}{" "}
                approved import(s) ready to export as a publish patch. Run the
                pipeline (
                <span className={styles.mono}>npm run fonts:import</span>) to
                regenerate the catalogue and verification report.
              </p>
            ) : null}
          </div>

          {importReport.rejected.length ? (
            <div className={styles.panel}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Failed imports</h3>
              <p className={styles.sub}>
                Recorded by the last catalogue build.
              </p>
              {importReport.rejected.map((item) => (
                <div className={styles.reportCard} key={item.slug}>
                  <strong>{item.family}</strong>
                  <div className={styles.sub}>{item.reason}</div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "usage" ? (
        <div className={styles.panel}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Font usage</h3>
          <p className={styles.sub}>
            Anonymous aggregate counters from the library, specimen, studio and
            poster surfaces. Updated{" "}
            {usage.updatedAt?.slice(0, 16).replace("T", " ") ?? "never"}.
            {usage.persisted
              ? " Persisted to the local usage store."
              : " This server instance could not persist counters; they are held in memory until restart."}
          </p>
          {usageRows.length ? (
            <div className={styles.tableWrap} style={{ marginTop: 12 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Font</th>
                    <th>Uses</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRows.map((row) => (
                    <tr key={row.slug}>
                      <td>
                        <div className={styles.family}>{row.family}</div>
                        <div className={styles.sub}>{row.slug}</div>
                      </td>
                      <td>{row.count}</td>
                      <td>
                        {Math.round(
                          (row.count /
                            Math.max(
                              1,
                              usageRows.reduce(
                                (total, item) => total + item.count,
                                0,
                              ),
                            )) *
                            100,
                        )}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              No usage recorded yet. Counters start collecting when visitors use
              a font in the public studio.
            </div>
          )}
        </div>
      ) : null}

      {tab === "licences" ? (
        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <h3 style={{ margin: 0, fontSize: 16, flex: 1 }}>
              Licences ({licenses.length})
            </h3>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                downloadJson("biocraft-font-licences.json", licenses)
              }
            >
              <Download size={13} /> Export licences
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Licence</th>
                  <th>Version</th>
                  <th>Author / copyright</th>
                  <th>Source</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.slug}>
                    <td>
                      <div className={styles.family}>{license.family}</div>
                      <div className={styles.sub}>{license.slug}</div>
                    </td>
                    <td>{license.type}</td>
                    <td>{license.version}</td>
                    <td style={{ maxWidth: 320 }}>{license.attribution}</td>
                    <td>
                      <a href={license.source} target="_blank" rel="noreferrer">
                        repository
                      </a>
                    </td>
                    <td>
                      {license.downloadAllowed ? (
                        <a
                          href={license.licenseFile ?? license.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          licence file
                        </a>
                      ) : (
                        "not permitted"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "export" ? (
        <div className={styles.panel}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Export & reports</h3>
          <p className={styles.sub}>
            Machine-readable snapshots for backups, licensing reviews and
            release notes. No visitor data is included.
          </p>
          <div className={styles.checkGrid} style={{ marginTop: 14 }}>
            <button
              type="button"
              className={styles.button}
              onClick={catalogueExport}
            >
              <Archive size={13} /> Catalogue JSON
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                downloadCsv("biocraft-font-catalogue.csv", [
                  [
                    "family",
                    "slug",
                    "category",
                    "weights",
                    "score",
                    "coverage",
                    "status",
                    "license",
                  ],
                  ...fonts.map((font) => [
                    font.family,
                    font.slug,
                    font.category,
                    `${font.weightRange[0]}-${font.weightRange[1]}`,
                    font.score,
                    `${font.coverage}%`,
                    font.status,
                    font.licenseType,
                  ]),
                ])
              }
            >
              <Download size={13} /> Catalogue CSV
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                downloadJson("biocraft-font-licences.json", licenses)
              }
            >
              <FileJson size={13} /> Licences JSON
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                downloadJson(
                  "biocraft-font-validation-report.json",
                  fonts.map((font) => ({
                    family: font.family,
                    slug: font.slug,
                    status: font.errors.length ? "rejected" : "verified",
                    score: font.score,
                    coverage: font.coverage,
                    conjuncts: font.conjuncts,
                    matras: font.matras,
                    nukta: font.nukta,
                    latin: font.latin,
                    errors: font.errors,
                    warnings: font.warnings,
                  })),
                )
              }
            >
              <ShieldCheck size={13} /> Validation report
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={patchExport}
            >
              <FileUp size={13} /> Import queue patch
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                downloadJson("biocraft-font-usage.json", {
                  exportedAt: new Date().toISOString(),
                  ...usage,
                })
              }
            >
              <FileJson size={13} /> Usage snapshot
            </button>
          </div>
          <p className={styles.note}>
            Exporting is read-only and works even when the deployment cannot
            write admin overlays.
          </p>
        </div>
      ) : null}

      {editing ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editing.family}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <form
            className={styles.modal}
            onSubmit={(event) => {
              event.preventDefault();
              void saveEdit(event.currentTarget);
            }}
          >
            <h3>Edit metadata</h3>
            <p className={styles.sub}>
              Overlays change the public label without touching the generated
              catalogue or the font binary.
            </p>
            <div className={styles.field}>
              <label htmlFor="edit-family">Family name</label>
              <input
                id="edit-family"
                name="family"
                defaultValue={editing.overrideFamily || editing.family}
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="edit-category">Category</label>
              <select
                id="edit-category"
                name="category"
                defaultValue={editing.overrideCategory || editing.category}
              >
                {[
                  "Serif",
                  "Sans Serif",
                  "Handwriting",
                  "Display",
                  "Monospace",
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="edit-tags">Tags (comma separated)</label>
              <input
                id="edit-tags"
                name="tags"
                defaultValue={(editing.overrideTags.length
                  ? editing.overrideTags
                  : editing.tags
                ).join(", ")}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="edit-note">Admin note</label>
              <textarea
                id="edit-note"
                name="note"
                defaultValue={editing.overrideNote}
                maxLength={300}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.primary}`}
              >
                Save overlay
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
