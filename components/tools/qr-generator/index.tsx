"use client";
/**
 * QUICKKIT QR Code Studio — workspace shell.
 *
 * Four tabs over one state engine (create, bulk, history, presets) and one
 * rule: nothing can be downloaded until an independent decoder has read the
 * exact payload back out of the rendered pixels.
 *
 * Desktop is a balanced two-column studio — content, design and advanced on the
 * left, the live preview with its verification and the download row pinned on
 * the right. Below 1100px the same cards become one column with the preview on
 * top and every group folded into an accordion, so a phone shows a scannable
 * code and its PNG button before any form does.
 */
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Clock,
  Info,
  QrCode,
  Rows3,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { WorkspaceHeading } from "../tool-ui";
import AdvancedPanel from "./advanced-panel";
import BulkPanel from "./bulk-panel";
import ContentPanel from "./content-panel";
import DesignStudio from "./design-studio";
import HistoryPanel from "./history-panel";
import PresetsPanel from "./presets-panel";
import PreviewPanel from "./preview-panel";
import { useQrStudio } from "./use-qr-studio";

type TabId = "create" | "bulk" | "history" | "presets";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof QrCode;
}[] = [
  { id: "create", label: "Create QR", icon: QrCode },
  { id: "bulk", label: "Bulk (CSV)", icon: Rows3 },
  { id: "history", label: "History", icon: Clock },
  { id: "presets", label: "Presets", icon: Bookmark },
];

export default function QrGenerator() {
  const ready = useHydrated();
  const studio = useQrStudio();
  const [tab, setTab] = useState<TabId>("create");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Flash messages are announcements, not dialogs: they clear themselves.
  useEffect(() => {
    if (!studio.flash) return;
    const timer = setTimeout(() => studio.setFlash(null), 9000);
    return () => clearTimeout(timer);
  }, [studio]);

  const verified = Boolean(studio.output?.verification?.ok);
  const counts: Record<TabId, number | null> = {
    create: null,
    bulk: null,
    history: studio.history.length,
    presets: studio.presets.length,
  };

  return (
    <fieldset
      className="workspace qr-studio"
      disabled={!ready}
      aria-label="QR code workspace"
    >
      <WorkspaceHeading
        title="QR Code Studio"
        description="Twelve content types, colour, shape and logo styling, bulk CSV runs and a decoder that checks every code before you can download it. Everything happens in this tab."
      />

      <div className="qr-tabs" role="tablist" aria-label="QR code workspace">
        {TABS.map((entry, index) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          const count = counts[entry.id];
          return (
            <button
              key={entry.id}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`qr-tab-${entry.id}`}
              aria-selected={active}
              aria-controls={`qr-panel-${entry.id}`}
              tabIndex={active ? 0 : -1}
              className={active ? "qr-tab active" : "qr-tab"}
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
              <span>{entry.label}</span>
              {entry.id === "create" && verified ? (
                <span
                  className="qr-tab-dot"
                  title="Verified by decode"
                  aria-hidden="true"
                />
              ) : null}
              {count !== null && count > 0 ? (
                <span className="qr-tab-count">{count}</span>
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
            <X size={13} />
            <span className="sr-only">Dismiss message</span>
          </button>
        </p>
      ) : null}

      <div
        id="qr-panel-create"
        role="tabpanel"
        aria-labelledby="qr-tab-create"
        hidden={tab !== "create"}
        className="qr-layout"
      >
        <div className="qr-col qr-col-form">
          <ContentPanel studio={studio} />
          <DesignStudio studio={studio} />
          <AdvancedPanel studio={studio} />
        </div>
        <div className="qr-col qr-col-side">
          <PreviewPanel studio={studio} />
        </div>
      </div>

      <div
        id="qr-panel-bulk"
        role="tabpanel"
        aria-labelledby="qr-tab-bulk"
        hidden={tab !== "bulk"}
        className="qr-panel-solo"
      >
        {tab === "bulk" ? <BulkPanel studio={studio} /> : null}
      </div>
      <div
        id="qr-panel-history"
        role="tabpanel"
        aria-labelledby="qr-tab-history"
        hidden={tab !== "history"}
        className="qr-panel-solo"
      >
        {tab === "history" ? <HistoryPanel studio={studio} /> : null}
      </div>
      <div
        id="qr-panel-presets"
        role="tabpanel"
        aria-labelledby="qr-tab-presets"
        hidden={tab !== "presets"}
        className="qr-panel-solo"
      >
        {tab === "presets" ? <PresetsPanel studio={studio} /> : null}
      </div>

      <p className="qr-privacy-foot">
        <ShieldCheck size={15} aria-hidden="true" /> Encoding, styling,
        rasterising, decoding, ZIP building and PDF building all happen in this
        tab. No request leaves your device for any part of this tool, and
        nothing is written to disk except the files you download.
      </p>
    </fieldset>
  );
}
