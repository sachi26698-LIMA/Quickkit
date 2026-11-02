"use client";
import { useEffect, useRef, useState } from "react";
import type { ZoomSpec } from "./pdf-pane";

/**
 * Renders the ACTUAL generated DOCX bytes with docx-preview (lazy-loaded).
 * This is a faithful browser rendering of the file the user downloads —
 * never the source PDF and never a mockup. Word itself may paginate a
 * flowing (Clean Editable) document slightly differently.
 */

type DocxPreviewModule = typeof import("docx-preview");
let modulePromise: Promise<DocxPreviewModule> | null = null;
function loadDocxPreview(): Promise<DocxPreviewModule> {
  if (!modulePromise) modulePromise = import("docx-preview");
  return modulePromise;
}

export interface DocxPaneProps {
  blob: Blob;
  page: number;
  zoom: ZoomSpec;
  onPageCount: (count: number) => void;
  onVisiblePage: (page: number) => void;
  /** Reports the zoom percentage actually on screen. */
  onEffectiveZoom?: (percent: number) => void;
}

export default function DocxPane({
  blob,
  page,
  zoom,
  onPageCount,
  onVisiblePage,
  onEffectiveZoom,
}: DocxPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const programmaticScrollAt = useRef(0);
  const appliedFactorRef = useRef(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Reset when a different DOCX is shown (derived-state-during-render).
  const [prevBlob, setPrevBlob] = useState(blob);
  if (blob !== prevBlob) {
    setPrevBlob(blob);
    setStatus("loading");
    setBaseSize(null);
  }

  // Render the DOCX once per blob.
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    sectionsRef.current = [];
    void (async () => {
      try {
        const { renderAsync } = await loadDocxPreview();
        if (!host || cancelled) return;
        host.innerHTML = "";
        const buffer = await blob.arrayBuffer();
        await renderAsync(buffer, host, undefined, {
          className: "p2wv-docx",
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: false,
        });
        if (cancelled) return;
        host.querySelectorAll("img:not([alt])").forEach((img) => {
          img.setAttribute("alt", "Image from the source PDF");
        });
        const sections = [...host.querySelectorAll<HTMLElement>("section")];
        sectionsRef.current = sections;
        onPageCount(Math.max(1, sections.length));
        const first = sections[0];
        if (first) {
          const applied = appliedFactorRef.current || 1;
          setBaseSize({
            w: first.offsetWidth / applied,
            h: first.offsetHeight / applied,
          });
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (host) host.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render once per blob identity
  }, [blob]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Zoom factor is derived: percent directly; fit modes from the first
  // rendered section's intrinsic (100%) size.
  const clamp = (v: number) => Math.min(3, Math.max(0.2, v));
  const factor =
    zoom.kind === "percent"
      ? zoom.value / 100
      : !baseSize || containerSize.width === 0
        ? 1
        : zoom.kind === "fit-width"
          ? clamp((containerSize.width - 36) / Math.max(1, baseSize.w))
          : clamp(
              Math.min(
                (containerSize.width - 36) / Math.max(1, baseSize.w),
                (containerSize.height - 36) / Math.max(1, baseSize.h),
              ),
            );
  useEffect(() => {
    appliedFactorRef.current = factor;
    onEffectiveZoom?.(factor * 100);
  }, [factor, onEffectiveZoom]);

  // Scroll to the controlled page.
  useEffect(() => {
    if (status !== "ready") return;
    const scroller = scrollRef.current;
    const section = sectionsRef.current[page - 1];
    if (!scroller || !section) return;
    programmaticScrollAt.current = Date.now();
    scroller.scrollTo({ top: Math.max(0, section.offsetTop - 14) });
  }, [page, status]);

  // Report the page the user scrolled to.
  useEffect(() => {
    if (status !== "ready") return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() - programmaticScrollAt.current < 700) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sectionsRef.current.indexOf(
              entry.target as HTMLElement,
            );
            if (idx >= 0) onVisiblePage(idx + 1);
          }
        }
      },
      { root: scroller, threshold: 0.35 },
    );
    for (const section of sectionsRef.current) observer.observe(section);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks from parent dialog
  }, [status]);

  if (status === "error") {
    return (
      <div className="p2wv-pane">
        <p className="p2wv-error" role="alert">
          The Word preview could not be rendered in this browser. The converted
          file itself is unaffected — download it to view it in Word or
          LibreOffice.
        </p>
      </div>
    );
  }

  return (
    <div className="p2wv-pane">
      <div
        className="p2wv-docx-scroll"
        ref={scrollRef}
        tabIndex={0}
        aria-label="Word document view"
      >
        {status === "loading" && (
          <div className="p2wv-skeleton" aria-hidden="true">
            <span />
          </div>
        )}
        <div
          className="p2wv-docx-zoom"
          style={{ zoom: factor }}
          aria-label="Converted Word document preview"
        >
          <div ref={hostRef} className="p2wv-docx-host" />
        </div>
      </div>
    </div>
  );
}
