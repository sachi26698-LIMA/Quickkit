"use client";
/**
 * QUICKKIT QR Code Scanner — workspace shell.
 *
 * Four tabs over one state engine: Live Camera, Upload Image, Batch Scan and
 * History. The results panel is shared by the first three because a decoded code
 * is a decoded code — which surface produced it changes nothing about what can
 * honestly be said about it.
 *
 * The layout is a two-column studio above 1100 px (input on the left, results
 * pinned on the right) and a single column below, so a phone shows the camera
 * and its controls first with results stacked underneath, never side-scrolled.
 */
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Clock,
  ImagePlus,
  Info,
  QrCode,
  Rows3,
  ScanLine,
  TriangleAlert,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { WorkspaceHeading } from "../tool-ui";
import BatchPanel from "./batch-panel";
import CameraPanel from "./camera-panel";
import HistoryTab from "./history-tab";
import ResultsPanel from "./results-panel";
import SettingsPanel from "./settings-panel";
import UploadPanel from "./upload-panel";
import { useScanner } from "./use-scanner";

type TabId = "camera" | "upload" | "batch" | "history";

const TABS: { id: TabId; label: string; short: string; icon: typeof Camera }[] =
  [
    { id: "camera", label: "Live Camera", short: "Camera", icon: Camera },
    { id: "upload", label: "Upload Image", short: "Upload", icon: ImagePlus },
    { id: "batch", label: "Batch Scan", short: "Batch", icon: Rows3 },
    { id: "history", label: "History", short: "History", icon: Clock },
  ];

export default function QrScanner() {
  const ready = useHydrated();
  const api = useScanner();
  const [tab, setTab] = useState<TabId>("camera");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const appliedDefault = useRef(false);

  // Honour the saved default mode once, after hydration.
  useEffect(() => {
    if (!api.ready || appliedDefault.current) return;
    appliedDefault.current = true;
    setTab(api.settings.defaultMode);
  }, [api.ready, api.settings.defaultMode]);

  const showResults = tab !== "history";

  return (
    <fieldset
      className="workspace scanner"
      disabled={!ready}
      aria-label="QR code scanner workspace"
    >
      <WorkspaceHeading
        title="QR Code Scanner"
        description="Read a QR code from a camera, a photo, a screenshot or a whole batch — then see exactly what it contains and what the destination deserves before you open it."
      />

      <div className="scanner-tabs" role="tablist" aria-label="Scanning mode">
        {TABS.map((entry, index) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`scanner-tab-${entry.id}`}
              aria-selected={active}
              aria-controls={`scanner-panel-${entry.id}`}
              tabIndex={active ? 0 : -1}
              className={active ? "scanner-tab active" : "scanner-tab"}
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                  return;
                event.preventDefault();
                const delta = event.key === "ArrowRight" ? 1 : -1;
                const next = (index + delta + TABS.length) % TABS.length;
                setTab(TABS[next].id);
                tabsRef.current[next]?.focus();
              }}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="scanner-tab-label">{entry.label}</span>
              <span className="scanner-tab-short">{entry.short}</span>
              {entry.id === "history" && api.history.length > 0 && (
                <span className="scanner-tab-count">{api.history.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {api.flash && (
        <p
          className={`status ${api.flash.kind === "error" ? "error" : api.flash.kind === "success" ? "success" : ""}`}
          role="status"
        >
          {api.flash.kind === "error" ? (
            <TriangleAlert size={14} aria-hidden="true" />
          ) : (
            <Info size={14} aria-hidden="true" />
          )}
          {api.flash.text}
          <button
            type="button"
            className="scanner-flash-close"
            onClick={() => api.setFlash(null)}
            aria-label="Dismiss message"
          >
            <X size={13} />
          </button>
        </p>
      )}

      <div className={showResults ? "scanner-layout" : "scanner-layout single"}>
        <div className="scanner-main">
          {tab === "camera" && (
            <section
              id="scanner-panel-camera"
              role="tabpanel"
              aria-labelledby="scanner-tab-camera"
              className="scanner-card"
            >
              <header className="scanner-card-head">
                <span className="scanner-card-icon">
                  <Camera size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Live camera</h3>
                  <p>
                    Point your camera at a code. Front and rear cameras are
                    listed once the browser has granted permission, along with a
                    torch and zoom control where the hardware offers them.
                  </p>
                </div>
              </header>
              <CameraPanel api={api} />
            </section>
          )}

          {tab === "upload" && (
            <section
              id="scanner-panel-upload"
              role="tabpanel"
              aria-labelledby="scanner-tab-upload"
              className="scanner-card"
            >
              <header className="scanner-card-head">
                <span className="scanner-card-icon">
                  <ImagePlus size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Upload an image or screenshot</h3>
                  <p>
                    Drop a file, browse for it, or paste a screenshot straight
                    from the clipboard. Rotate, crop, or adjust contrast and
                    scan again — the same pixels are re-decoded, nothing is
                    re-uploaded.
                  </p>
                </div>
              </header>
              <UploadPanel api={api} />
            </section>
          )}

          {tab === "batch" && (
            <section
              id="scanner-panel-batch"
              role="tabpanel"
              aria-labelledby="scanner-tab-batch"
              className="scanner-card"
            >
              <header className="scanner-card-head">
                <span className="scanner-card-icon">
                  <Rows3 size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Batch scan</h3>
                  <p>
                    Work through a stack of images with a fixed number in
                    flight. Cancel at any point, retry only the files that
                    failed, and export every decoded result in one file.
                  </p>
                </div>
              </header>
              <BatchPanel api={api} />
            </section>
          )}

          {tab === "history" && (
            <section
              id="scanner-panel-history"
              role="tabpanel"
              aria-labelledby="scanner-tab-history"
              className="scanner-card"
            >
              <header className="scanner-card-head">
                <span className="scanner-card-icon">
                  <Clock size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Scan history</h3>
                  <p>
                    Recent scans kept in this browser only. Secrets are redacted
                    unless you allow them, image files are never stored, and
                    clearing the list removes it completely.
                  </p>
                </div>
              </header>
              <HistoryTab api={api} />
            </section>
          )}

          <SettingsPanel
            api={api}
            open={settingsOpen}
            onToggle={() => setSettingsOpen((value) => !value)}
          />
        </div>

        {showResults && (
          <aside className="scanner-aside" aria-label="Scan results">
            <div className="scanner-card scanner-results-card">
              <ResultsPanel api={api} />
            </div>
          </aside>
        )}
      </div>

      <div className="scanner-privacy">
        <ScanLine size={17} aria-hidden="true" />
        <p>
          <strong>Decoded on your device.</strong> Images are read by the
          browser, decoded by a local QR reader and never uploaded. No
          destination is visited, no reputation service is queried, and decoded
          content is never rendered as HTML.
        </p>
        <QrCode size={17} aria-hidden="true" />
      </div>
    </fieldset>
  );
}
