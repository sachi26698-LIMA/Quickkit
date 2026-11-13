"use client";
/**
 * QUICKKIT Advanced Barcode Studio — workspace shell.
 *
 * Three modes over one engine: Generator (live preview + exports), Scanner
 * (camera and image, decoded locally) and Bulk (CSV → labels). The scanner and
 * bulk panels are code-split: a visitor who only wants one barcode never
 * downloads the decoder or the batch exporter.
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Barcode,
  Info,
  Camera,
  Rows3,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { WorkspaceHeading } from "../tool-ui";
import CustomizePanel from "./customize-panel";
import FormatPanel from "./format-panel";
import PreviewPanel from "./preview-panel";
import { useBarcodeStudio } from "./use-barcode-studio";

const ScannerPanel = dynamic(() => import("./scanner-panel"), {
  loading: () => (
    <p className="bc-loading" role="status">
      Loading the local decoder…
    </p>
  ),
});

const BulkPanel = dynamic(() => import("./bulk-panel"), {
  loading: () => (
    <p className="bc-loading" role="status">
      Loading the bulk generator…
    </p>
  ),
});

type TabId = "generate" | "scan" | "bulk";

const TABS: { id: TabId; label: string; icon: typeof Barcode }[] = [
  { id: "generate", label: "Generator", icon: Barcode },
  { id: "scan", label: "Scanner", icon: Camera },
  { id: "bulk", label: "Bulk (CSV)", icon: Rows3 },
];

const HERO_POINTS = [
  "11 symbologies with real check-digit maths",
  "Bulk CSV up to 1,000 labels",
  "PNG · SVG · PDF · ZIP · print",
  "Camera and image scanning, on-device",
];

/**
 * The studio reads its saved styling from local storage in a state initialiser,
 * which is only safe once the client tree is live. Mounting the workspace after
 * hydration keeps the server markup and the first client render identical, so
 * there is no mismatch warning and no disabled-input flash.
 */
export default function BarcodeStudio() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="workspace bc-studio" aria-busy="true">
        <WorkspaceHeading
          title="Advanced Barcode Studio"
          description="Generate a valid barcode, style it, print it at the right size, or decode one from a photo — everything runs in this tab."
        />
        <p className="bc-loading" role="status">
          Preparing the barcode studio…
        </p>
      </div>
    );
  }

  return <StudioWorkspace />;
}

function StudioWorkspace() {
  const studio = useBarcodeStudio();
  const [tab, setTab] = useState<TabId>("generate");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Dismiss on the message itself, not on the whole studio object — the studio
  // is recreated on every render, which would restart the timer forever.
  const flash = studio.flash;
  const clearFlash = studio.setFlash;
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => clearFlash(null), 9000);
    return () => clearTimeout(timer);
  }, [flash, clearFlash]);

  return (
    <fieldset className="workspace bc-studio" aria-label="Barcode studio">
      <WorkspaceHeading
        title="Advanced Barcode Studio"
        description="Generate a valid barcode, style it, print it at the right size, or decode one from a photo — everything runs in this tab."
      />

      <ul className="bc-hero" aria-label="What this studio does">
        {HERO_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="qr-tabs" role="tablist" aria-label="Barcode studio modes">
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
              id={`bc-tab-${entry.id}`}
              aria-selected={active}
              aria-controls={`bc-panel-${entry.id}`}
              tabIndex={active ? 0 : -1}
              className={active ? "qr-tab active" : "qr-tab"}
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const delta = event.key === "ArrowRight" ? 1 : -1;
                const next = (index + delta + TABS.length) % TABS.length;
                setTab(TABS[next].id);
                tabsRef.current[next]?.focus();
              }}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{entry.label}</span>
              {entry.id === "generate" && studio.verification?.ok ? (
                <span className="qr-tab-dot" title="Verified by decode" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      {studio.flash ? (
        <p
          className={`status ${studio.flash.kind === "error" ? "error" : "success"}`}
          role="status"
        >
          {studio.flash.kind === "error" ? (
            <TriangleAlert size={14} aria-hidden="true" />
          ) : (
            <Info size={14} aria-hidden="true" />
          )}
          {studio.flash.text}
          <button
            type="button"
            className="qr-flash-close"
            onClick={() => studio.setFlash(null)}
          >
            <X size={13} aria-hidden="true" />
            <span className="sr-only">Dismiss message</span>
          </button>
        </p>
      ) : null}

      <div
        id="bc-panel-generate"
        role="tabpanel"
        aria-labelledby="bc-tab-generate"
        hidden={tab !== "generate"}
        className="qr-layout"
      >
        <div className="qr-col qr-col-form">
          <FormatPanel studio={studio} />
          <CustomizePanel studio={studio} />
        </div>
        <div className="qr-col qr-col-side">
          <PreviewPanel studio={studio} />
        </div>
      </div>

      <div
        id="bc-panel-scan"
        role="tabpanel"
        aria-labelledby="bc-tab-scan"
        hidden={tab !== "scan"}
        className="qr-panel-solo"
      >
        {tab === "scan" ? <ScannerPanel /> : null}
      </div>

      <div
        id="bc-panel-bulk"
        role="tabpanel"
        aria-labelledby="bc-tab-bulk"
        hidden={tab !== "bulk"}
        className="qr-panel-solo"
      >
        {tab === "bulk" ? <BulkPanel studio={studio} /> : null}
      </div>

      <p className="qr-privacy-foot">
        <ShieldCheck size={15} aria-hidden="true" /> Encoding, layout, rasterising,
        PDF building, ZIP packing and decoding all happen in this tab. No barcode,
        CSV row or camera frame is uploaded, and nothing is written to storage
        except your own settings.
      </p>
    </fieldset>
  );
}
