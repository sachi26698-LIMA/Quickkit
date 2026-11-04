"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  PanelLeftClose,
  Settings2,
  ShieldCheck,
  Undo2,
  Redo2,
  Upload,
  X,
  RotateCcw,
  Eye,
} from "lucide-react";
import {
  defaults,
  outputName,
  nativeKey,
  orderedPages,
} from "@/lib/tools/word-to-pdf/settings";
import { createZip } from "@/lib/tools/zip";
import { downloadBlob, downloadText, formatBytes } from "@/lib/tools/download";
import { useStudio } from "./use-studio";
import {
  initialPlan,
  patchPages,
  type VisualPlan,
  type PageOverrides,
} from "@/lib/tools/word-to-pdf/page-plan";
import PageEditor from "./page-editor";
import PageAppearance from "./page-appearance";
import SettingsForm from "./settings-form";
import StudioPreview from "./studio-preview";
import QueueThumbnail from "./queue-thumbnail";
import styles from "./word-to-pdf.module.css";

const mobileSnapshot = () => window.matchMedia("(max-width: 760px)").matches;
const serverMobileSnapshot = () => false;
const subscribeMobile = (notify: () => void) => {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export default function WordToPdf() {
  const mobile = useSyncExternalStore(
    subscribeMobile,
    mobileSnapshot,
    serverMobileSnapshot,
  );
  const [pageMode, setPageMode] = useState("files"),
    [previewPage, setPreviewPage] = useState(1),
    [pageSelection, setPageSelection] = useState<{
      file: string;
      ids: string[];
    }>({ file: "", ids: [] });
  const studio = useStudio();
  const { rows, selected, selectedSettings, busy, ready } = studio;
  const [mobileTab, setMobileTab] = useState("files"),
    [showFiles, setShowFiles] = useState(true),
    [showSettings, setShowSettings] = useState(true),
    [help, setHelp] = useState(false),
    [scope, setScope] = useState("global");
  const viewerAnchor = useRef<HTMLDivElement>(null);
  const fileScope =
    scope === "file" && !!selected && !!studio.prefs.individual[selected.id];
  const formSettings = fileScope ? selectedSettings : studio.prefs.global;
  const completed = rows.filter(ready),
    failed = rows.filter((r) => r.status === "error"),
    stale = rows.filter((r) => r.bytes && !ready(r));
  const report = () =>
    JSON.stringify(
      {
        tool: "Word to PDF Converter V3",
        completed: completed.length,
        failed: failed.length,
        needsUpdate: stale.length,
        files: rows.map((r) => ({
          input: r.file.name,
          output: outputName(r.name),
          status: ready(r)
            ? "completed"
            : r.status === "error"
              ? "error"
              : r.bytes
                ? "needs-update"
                : r.status,
          message: r.message,
          sourcePages: r.sourcePages ?? null,
          outputPages: r.pages ?? null,
          actualBytes: r.bytes?.length ?? null,
          previewExportSynchronized: ready(r),
        })),
      },
      null,
      2,
    );
  function exportZip() {
    try {
      downloadBlob(
        new Blob(
          [
            createZip([
              ...completed.map((r, i) => ({
                name: `${i + 1}-${outputName(r.name)}`,
                data: r.bytes!,
              })),
              {
                name: "conversion-report.json",
                data: new TextEncoder().encode(report()),
              },
            ]) as Uint8Array<ArrayBuffer>,
          ],
          { type: "application/zip" },
        ),
        "quickkit-pdfs.zip",
      );
    } catch {
      studio.setError("ZIP export failed. Download individual PDFs instead.");
    }
  }
  function previewFile(id: string) {
    studio.setActiveId(id);
    setMobileTab("preview");
    viewerAnchor.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }
  const nativeChanged = selected?.native !== nativeKey(selectedSettings);
  let visualPlan: VisualPlan | null = null,
    planProblem = "";
  if (selected?.base && selected.sourcePages)
    try {
      visualPlan =
        selectedSettings.visualPlan ||
        initialPlan(
          selected.sourcePages,
          orderedPages(selectedSettings, selected.sourcePages),
        );
    } catch (e) {
      planProblem = e instanceof Error ? e.message : "Invalid page plan.";
    }
  const selection =
    pageSelection.file === selected?.id
      ? pageSelection.ids.filter((id) =>
          visualPlan?.pages.some((p) => p.id === id),
        )
      : [];
  const selectPages = (ids: string[]) =>
    setPageSelection({ file: selected?.id || "", ids });
  const changePlan = (plan: VisualPlan | null) => {
    if (selected) {
      setScope("file");
      studio.changeSettings(
        { ...selectedSettings, visualPlan: plan },
        selected.id,
      );
    }
  };
  const patchSelected = (patch: PageOverrides) => {
    if (visualPlan) changePlan(patchPages(visualPlan, selection, patch));
  };
  const pageEditor = visualPlan ? (
    <PageEditor
      key={selected!.id}
      plan={visualPlan}
      bytes={selected?.bytes}
      synchronized={!!selected && ready(selected)}
      selection={selection}
      onSelect={selectPages}
      onChange={changePlan}
      onGoTo={(page) => {
        setPreviewPage(page);
        setMobileTab("preview");
      }}
      onExtract={async () => {
        if (!selected || !visualPlan) return;
        const bytes = await studio.extract(
          selected.id,
          visualPlan.pages.flatMap((p, i) =>
            selection.includes(p.id) ? [i] : [],
          ),
        );
        downloadBlob(
          new Blob([bytes]),
          outputName(selected.name.replace(/\.pdf$/i, "") + "-selected"),
        );
      }}
      onCancelExtract={studio.cancelExtraction}
      onReset={() => {
        changePlan(null);
        selectPages([]);
      }}
      disabled={busy || studio.nativeStale}
    />
  ) : (
    <p className={styles.note} role={planProblem ? "alert" : undefined}>
      {planProblem ||
        "Convert a DOCX to unlock editing of actual PDF pages. A retained native PDF is required; no simulated pages are shown."}
    </p>
  );

  return (
    <div className={styles.studio}>
      <div className={styles.toolbar}>
        <div className={styles.toolIdentity}>
          <span className={styles.toolMark}>
            <FileText size={23} />
          </span>
          <div>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <Link href="/tools">QUICKKIT</Link>
              <ChevronRight size={11} />
              <Link href="/category/pdf-tools">PDF Tools</Link>
            </nav>
            <h1>Word to PDF Converter</h1>
          </div>
          <span className={styles.version}>STUDIO V3</span>
        </div>
        <div className={styles.toolbarActions}>
          <span className={styles.statusPill} role="status">
            {busy
              ? "Converting documents…"
              : studio.localBusy
                ? "Updating preview…"
                : `${completed.length} of ${rows.length} ready`}
          </span>
          <button
            aria-label="Undo settings"
            disabled={busy || !studio.undoCount}
            onClick={studio.undo}
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          <button
            aria-label="Redo edits"
            disabled={busy || !studio.redoCount}
            onClick={studio.redo}
          >
            <Redo2 size={16} />
            <span>Redo</span>
          </button>
          <button
            aria-label="Open page editor"
            onClick={() => {
              setPageMode("pages");
              setShowFiles(true);
              setShowSettings(true);
              setMobileTab("edit");
            }}
          >
            <Settings2 size={16} />
            <span>Page editor</span>
          </button>
          <button
            aria-label="Export complete PDF"
            disabled={!selected || !ready(selected) || busy}
            onClick={() => {
              if (selected && ready(selected))
                downloadBlob(
                  new Blob([selected.bytes!]),
                  outputName(selected.name),
                );
            }}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            aria-label="Reset settings"
            disabled={busy}
            onClick={() =>
              studio.changeSettings(
                { ...defaults },
                fileScope ? selected?.id : undefined,
              )
            }
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
          <button
            aria-label="Help"
            aria-expanded={help}
            onClick={() => setHelp((v) => !v)}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      <div className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>
            YOUR DOCUMENT. READY FOR WHAT’S NEXT.
          </span>
          <h2>One workspace. Every final detail.</h2>
          <p>
            Fine-tune your pages, compare the result, and export with
            confidence.
          </p>
        </div>
        <span className={styles.privateBadge}>
          <ShieldCheck size={16} />
          Consent-first processing
        </span>
      </div>
      {help && (
        <section className={styles.help} aria-label="Workspace help">
          <strong>
            A precise preview, not a promise of perfect conversion.
          </strong>
          <p>
            Add DOCX files, choose settings and consent to server processing.
            Click Convert documents. Local overlays, page edits and metadata
            refresh after a short debounce without uploading again.
            Full-document layout, tagging and image export changes need
            LibreOffice: click Refresh preview or opt in separately to automatic
            re-uploads. Download is enabled only for synchronized output.
          </p>
          <p>
            Original DOCX comparison renders the actual package with an
            approximate browser layout; it is not Microsoft Word pagination.
            Before/after PDF compares native PDF bytes to exact final export
            bytes. Use the preview toolbar for zoom, text search, thumbnails and
            fullscreen. Native rendering may change charts, complex tables and
            missing fonts. No lossless or certified print-ready claim.
          </p>
          <button onClick={() => setHelp(false)}>Close help</button>
        </section>
      )}
      <div className={styles.privacy}>
        <ShieldCheck size={19} />
        <div>
          <strong>Your documents. Your decision.</strong>
          <span>
            {" "}
            LibreOffice on this QUICKKIT server handles conversion—not your
            browser. Uploads require consent and Convert, Refresh, or separately
            enabled automatic re-upload. No third-party conversion API.
            Temporary server files are deleted after processing; local results
            remain in this tab until cleared or closed.
          </span>
        </div>
      </div>
      <div className={styles.engine} role="status">
        <span className={styles.dot} />
        <span>
          {studio.available === null
            ? "Checking conversion engine…"
            : studio.available
              ? "Self-hosted LibreOffice is available"
              : "Conversion engine is not enabled on this installation"}
        </span>
        {studio.available === false && (
          <span>
            {" "}
            · No files will be uploaded. An operator must install and isolate
            the native engine.
          </span>
        )}
      </div>
      <nav className={styles.mobileTabs} aria-label="Workspace panels">
        {["files", "preview", "edit"].map((tab) => (
          <button
            key={tab}
            aria-pressed={mobileTab === tab}
            onClick={() => {
              setMobileTab(tab);
              if (tab === "files") setShowFiles(true);
              if (tab === "edit") setShowSettings(true);
            }}
          >
            {tab === "files" ? (
              <FileText size={16} />
            ) : tab === "edit" ? (
              <Settings2 size={16} />
            ) : (
              <Eye size={16} />
            )}
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <div className={styles.panelToggles}>
        <button
          aria-label="Toggle files panel"
          aria-pressed={showFiles}
          onClick={() => setShowFiles((v) => !v)}
        >
          <PanelLeftClose size={15} />
          Files
        </button>
        <button
          aria-label="Toggle settings panel"
          aria-pressed={showSettings}
          onClick={() => setShowSettings((v) => !v)}
        >
          <Settings2 size={15} />
          Settings
        </button>
        <span>Drag the lower corner of a sidebar to resize</span>
      </div>
      <div
        className={styles.workspace}
        style={{
          gridTemplateColumns: `${showFiles ? "auto " : ""}minmax(0,1fr)${showSettings ? " auto" : ""}`,
        }}
      >
        {showFiles && (
          <aside
            className={`${styles.filesPanel} ${mobileTab !== "files" ? styles.mobileInactive : ""}`}
            aria-label="Document queue"
          >
            {!mobile && (
              <div className={styles.panelSwitch}>
                <button
                  aria-pressed={pageMode === "files"}
                  onClick={() => setPageMode("files")}
                >
                  File queue
                </button>
                <button
                  aria-pressed={pageMode === "pages"}
                  onClick={() => setPageMode("pages")}
                >
                  Pages
                </button>
              </div>
            )}
            {pageMode === "pages" && !mobile ? (
              pageEditor
            ) : (
              <>
                <div className={styles.panelHeading}>
                  <div>
                    <span className={styles.eyebrow}>SOURCE FILES</span>
                    <h2>
                      Your documents <span>{rows.length}/10</span>
                    </h2>
                  </div>
                </div>
                <fieldset disabled={busy} className={styles.fieldset}>
                  <label
                    className={styles.drop}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      studio.add(e.dataTransfer.files);
                    }}
                  >
                    <Upload size={25} />
                    <strong>Drop DOCX files here</strong>
                    <span>or choose documents</span>
                    <small>20 MiB each · 80 MiB batch</small>
                    <input
                      aria-label="Choose DOCX files"
                      type="file"
                      multiple
                      accept=".docx"
                      onChange={(e) => {
                        if (e.target.files) studio.add(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className={styles.fileList}>
                    {rows.map((r, index) => (
                      <article
                        key={r.id}
                        className={`${styles.fileCard} ${selected?.id === r.id ? styles.activeFile : ""}`}
                      >
                        <div className={styles.fileTitle}>
                          <button
                            className={styles.selectFile}
                            aria-label={`Select ${r.file.name}`}
                            aria-pressed={selected?.id === r.id}
                            onClick={() => studio.setActiveId(r.id)}
                          >
                            <QueueThumbnail
                              bytes={r.bytes}
                              name={r.file.name}
                            />
                            <span>
                              <strong>{r.file.name}</strong>
                              <small>
                                {formatBytes(r.file.size)} ·{" "}
                                {r.sourcePages
                                  ? `${r.sourcePages} source pages`
                                  : "Pages unknown"}
                              </small>
                            </span>
                          </button>
                          <button
                            aria-label={`Remove ${r.file.name}`}
                            onClick={() => studio.remove(r.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p
                          className={
                            r.status === "error"
                              ? styles.error
                              : styles.fileStatus
                          }
                          role={r.status === "error" ? "alert" : "status"}
                        >
                          {r.status === "error"
                            ? r.message
                            : r.bytes && !ready(r)
                              ? "Settings changed — update required"
                              : r.message}
                        </p>
                        {r.status === "converting" && (
                          <progress
                            aria-label={`Conversion progress for ${r.file.name}`}
                          />
                        )}
                        <label className={styles.filename}>
                          Output filename
                          <input
                            value={r.name}
                            onChange={(e) =>
                              studio.patch(r.id, { name: e.target.value })
                            }
                          />
                        </label>
                        <div className={styles.fileActions}>
                          <button
                            aria-label={`Move ${r.file.name} up`}
                            disabled={index === 0}
                            onClick={() => studio.move(r.id, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            aria-label={`Move ${r.file.name} down`}
                            disabled={index === rows.length - 1}
                            onClick={() => studio.move(r.id, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <label className={styles.replace}>
                            Replace
                            <input
                              type="file"
                              aria-label={`Replace ${r.file.name}`}
                              accept=".docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) studio.replace(r.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {r.bytes && (
                            <button onClick={() => previewFile(r.id)}>
                              Preview PDF
                            </button>
                          )}
                          {["error", "cancelled"].includes(r.status) && (
                            <button
                              disabled={!studio.available || !studio.consent}
                              onClick={() => void studio.run(r.id)}
                            >
                              Retry
                            </button>
                          )}
                        </div>
                        <details className={styles.individual}>
                          <summary>Individual page & quality settings</summary>
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              checked={!!studio.prefs.individual[r.id]}
                              onChange={(e) => {
                                studio.override(r.id, e.target.checked);
                                studio.setActiveId(r.id);
                                setScope(e.target.checked ? "file" : "global");
                              }}
                            />
                            Override global settings
                          </label>
                          {studio.prefs.individual[r.id] && (
                            <>
                              <label>
                                Page size
                                <select
                                  value={studio.prefs.individual[r.id].paper}
                                  onChange={(e) =>
                                    studio.changeSettings(
                                      {
                                        ...studio.prefs.individual[r.id],
                                        paper: e.target
                                          .value as typeof selectedSettings.paper,
                                      },
                                      r.id,
                                    )
                                  }
                                >
                                  {[
                                    "Original",
                                    "A4",
                                    "A3",
                                    "A5",
                                    "Letter",
                                    "Legal",
                                    "Custom",
                                  ].map((v) => (
                                    <option key={v}>{v}</option>
                                  ))}
                                </select>
                              </label>
                              <button
                                onClick={() => {
                                  studio.setActiveId(r.id);
                                  setScope("file");
                                  setShowSettings(true);
                                  setMobileTab("edit");
                                }}
                              >
                                Edit all file settings
                              </button>
                            </>
                          )}
                        </details>
                        {r.bytes && (
                          <div className={styles.fileResult}>
                            <span>
                              {r.pages} output pages ·{" "}
                              {formatBytes(r.bytes.length)}
                            </span>
                            <button
                              disabled={!ready(r) || studio.localBusy}
                              onClick={() =>
                                downloadBlob(
                                  new Blob([r.bytes!], {
                                    type: "application/pdf",
                                  }),
                                  outputName(r.name),
                                )
                              }
                            >
                              <Download size={13} />
                              Download
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                  {!rows.length && (
                    <p className={styles.queueEmpty}>
                      Your originals stay unchanged.
                      <br />
                      Add up to 10 documents to begin.
                    </p>
                  )}
                  <button
                    className={styles.clearButton}
                    disabled={!rows.length}
                    onClick={studio.clear}
                  >
                    Clear files
                  </button>
                </fieldset>
              </>
            )}
          </aside>
        )}
        <section
          className={`${styles.mainPreview} ${mobileTab !== "preview" ? styles.mobileInactive : ""}`}
          ref={viewerAnchor}
          aria-label="Document preview workspace"
        >
          <StudioPreview
            key={selected?.id || "empty"}
            page={previewPage}
            onPageChange={setPreviewPage}
            bytes={selected?.bytes}
            base={selected?.base}
            file={selected?.file}
            sourcePages={selected?.sourcePages}
            settings={selected?.outputSettings || selectedSettings}
            stale={!!selected?.bytes && !ready(selected)}
            loading={busy || studio.localBusy}
            onRotate={() => {
              if (selected) {
                setScope("file");
                studio.changeSettings(
                  {
                    ...selectedSettings,
                    rotation: (selectedSettings.rotation + 90) % 360,
                  },
                  selected.id,
                );
              }
            }}
            onRefresh={() => {
              if (!selected) return;
              if (nativeChanged || !selected.base)
                void studio.run(selected.id, true);
              else
                studio.patch(selected.id, {
                  outputKey: undefined,
                  version: selected.version + 1,
                });
            }}
            canRefresh={
              !!selected &&
              !busy &&
              (!!selected.base || (!!studio.available && studio.consent))
            }
          />
          <div className={styles.syncNote}>
            <Check size={14} />
            <span>
              {selected && ready(selected)
                ? `Preview & export use the same ${formatBytes(selected.bytes!.length)} PDF. Native processing settings are current.`
                : "Preview and export consistency is checked against every setting. Stale output cannot be downloaded."}
            </span>
          </div>
        </section>
        {showSettings && (
          <aside
            className={`${styles.settingsPanel} ${mobileTab !== "edit" ? styles.mobileInactive : ""}`}
            aria-label="Export settings"
          >
            {mobile && mobileTab === "edit" && pageEditor}
            {visualPlan && (
              <PageAppearance
                settings={selectedSettings}
                plan={visualPlan}
                selection={selection}
                onPatch={patchSelected}
                onClear={() =>
                  changePlan({
                    ...visualPlan,
                    pages: visualPlan.pages.map((p) =>
                      selection.includes(p.id) ? { ...p, overrides: {} } : p,
                    ),
                  })
                }
                disabled={busy || studio.nativeStale}
              />
            )}
            <div className={styles.panelHeading}>
              <span className={styles.eyebrow}>MAKE IT YOURS</span>
              <h2>Export settings</h2>
              <label>
                Settings scope
                <select
                  value={fileScope ? "file" : "global"}
                  onChange={(e) => {
                    if (
                      e.target.value === "file" &&
                      selected &&
                      !studio.prefs.individual[selected.id]
                    )
                      studio.override(selected.id, true);
                    setScope(e.target.value);
                  }}
                  disabled={busy}
                >
                  <option value="global">
                    Global · files without overrides
                  </option>
                  <option value="file" disabled={!selected}>
                    Active file only
                  </option>
                </select>
              </label>
              {fileScope && (
                <p className={styles.note}>
                  {selected?.file.name} has individual settings.{" "}
                  <button
                    disabled={busy}
                    onClick={() => {
                      studio.override(selected!.id, false);
                      setScope("global");
                    }}
                  >
                    Use global settings
                  </button>
                </p>
              )}
            </div>
            <fieldset disabled={busy} className={styles.fieldset}>
              <SettingsForm
                value={formSettings}
                onChange={(s) =>
                  studio.changeSettings(s, fileScope ? selected?.id : undefined)
                }
              />
            </fieldset>
            <div className={styles.livePolicy}>
              <span className={styles.liveDot} />
              Local edits update after 400 ms.
              {studio.localBusy && (
                <button onClick={studio.cancelLocal}>Cancel PDF update</button>
              )}
              {selected?.base &&
                !ready(selected) &&
                !studio.nativeStale &&
                !studio.localBusy && (
                  <button onClick={studio.retryLocal}>Retry PDF update</button>
                )}
              <p>
                Native layout and quality need a new upload. No automatic
                re-upload by default.
              </p>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  disabled={!studio.consent || !studio.available || busy}
                  checked={studio.auto}
                  onChange={(e) => studio.setAuto(e.target.checked)}
                />
                Automatically re-upload active DOCX after native setting changes
              </label>
            </div>
          </aside>
        )}
      </div>
      <div className={styles.exportBar}>
        <div className={styles.consentArea}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={studio.consent}
              disabled={busy}
              onChange={(e) => {
                studio.setConsent(e.target.checked);
                if (!e.target.checked) studio.setAuto(false);
              }}
            />
            I agree to upload these documents to this QUICKKIT server for
            conversion.
          </label>
          <span>
            {rows.length} documents · {completed.length} completed ·{" "}
            {failed.length} failed
            {stale.length ? ` · ${stale.length} need update` : ""}
          </span>
        </div>
        <div className={styles.exportActions}>
          {busy ? (
            <button onClick={studio.cancel}>Cancel batch</button>
          ) : (
            <button
              className={styles.primary}
              disabled={
                !studio.available ||
                !studio.consent ||
                !rows.some((r) => !ready(r)) ||
                studio.localBusy
              }
              onClick={() => void studio.run()}
            >
              <ArrowRight size={17} />
              Convert documents
            </button>
          )}
          <button
            disabled={busy || studio.localBusy || !completed.length}
            onClick={exportZip}
          >
            <Download size={16} />
            Download all ZIP ({completed.length})
          </button>
          <button
            disabled={!rows.length || busy}
            onClick={() =>
              downloadText(
                report(),
                "quickkit-conversion-report.json",
                "application/json",
              )
            }
          >
            Report
          </button>
        </div>
      </div>
      {studio.error && (
        <p role="alert" className={styles.error}>
          {studio.error}
        </p>
      )}
      <div className={styles.bottomNotes}>
        <span>Real workflow stages, not simulated page progress.</span>
        <span>
          DOCX only · provisional 100-page native cap · no 1,000-page claim
        </span>
        <button onClick={() => setHelp(true)}>
          How this workspace works <HelpCircle size={13} />
        </button>
      </div>
    </div>
  );
}
