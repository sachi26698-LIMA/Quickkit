"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  openPdfPreview,
  type PdfPreviewHandle,
} from "@/lib/tools/pdf-to-word/preview-pdf";
import styles from "./word-to-pdf.module.css";
type Loaded = { bytes: Uint8Array; handle: PdfPreviewHandle };
export function usePdf(bytes?: Uint8Array) {
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [failure, setFailure] = useState<{
      bytes: Uint8Array;
      message: string;
    } | null>(null);
  useEffect(() => {
    if (!bytes) return;
    let disposed = false,
      handle: PdfPreviewHandle | undefined;
    void openPdfPreview(bytes, true)
      .then((value) => {
        handle = value;
        if (disposed) void value.destroy();
        else setLoaded({ bytes, handle: value });
      })
      .catch(() => {
        if (!disposed)
          setFailure({
            bytes,
            message:
              "This PDF could not be opened. Retry conversion or inspect an individual download.",
          });
      });
    return () => {
      disposed = true;
      void handle?.destroy();
    };
  }, [bytes]);
  return {
    handle: loaded && loaded.bytes === bytes ? loaded.handle : undefined,
    error: failure && failure.bytes === bytes ? failure.message : "",
  };
}
export function Thumb({
  handle,
  page,
  selected,
  onSelect,
}: {
  handle: PdfPreviewHandle;
  page: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<{
    handle: PdfPreviewHandle;
    page: number;
    url: string;
    failed: boolean;
  } | null>(null);
  const match = result?.handle === handle && result.page === page,
    url = match ? result.url : "";
  useEffect(() => {
    let dead = false,
      current = "";
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void handle.renderThumbnail(page, 90).then((value) => {
        if (!value) {
          if (!dead) setResult({ handle, page, url: "", failed: true });
          return;
        }
        if (dead) URL.revokeObjectURL(value);
        else {
          current = value;
          setResult({ handle, page, url: value, failed: false });
        }
      });
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      dead = true;
      observer.disconnect();
      if (current) URL.revokeObjectURL(current);
    };
  }, [handle, page]);
  return (
    <button
      ref={ref}
      className={`${styles.thumb} ${selected ? styles.selectedThumb : ""}`}
      aria-label={`Go to page ${page}`}
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
    >
      {url ? (
        <Image
          unoptimized
          draggable={false}
          src={url}
          alt={`Page ${page} thumbnail`}
          width={90}
          height={125}
        />
      ) : (
        <span className={styles.thumbPending}>
          {match && result.failed ? "Thumbnail unavailable" : "Rendering…"}
        </span>
      )}
      <span>{page}</span>
    </button>
  );
}

/** Fixed-height window: offscreen thumbnails unmount and revoke their object URLs. */
export function WindowedPages({
  count,
  rowHeight,
  active,
  pinned,
  className,
  children,
}: {
  count: number;
  rowHeight: number;
  active?: number;
  pinned?: number;
  className?: string;
  children: (index: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 480 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setViewport((v) => ({ ...v, height: el.clientHeight })),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && active !== undefined) {
      const y = active * rowHeight;
      if (y < el.scrollTop || y + rowHeight > el.scrollTop + el.clientHeight)
        el.scrollTo({ top: Math.max(0, y - rowHeight) });
    }
  }, [active, rowHeight]);
  const start = Math.max(
      0,
      Math.min(count - 1, Math.floor(viewport.top / rowHeight) - 2),
    ),
    end = Math.min(count, start + Math.ceil(viewport.height / rowHeight) + 5);
  return (
    <div
      ref={ref}
      role="region"
      tabIndex={0}
      aria-label="Scrollable PDF pages"
      className={`${styles.windowedPages} ${className || ""}`}
      onDragOver={(e) => {
        if (pinned === undefined || pinned < 0) return;
        const el = e.currentTarget,
          rect = el.getBoundingClientRect();
        if (e.clientY < rect.top + 35) el.scrollBy({ top: -35 });
        else if (e.clientY > rect.bottom - 35) el.scrollBy({ top: 35 });
      }}
      onScroll={(e) =>
        setViewport({
          top: e.currentTarget.scrollTop,
          height: e.currentTarget.clientHeight,
        })
      }
    >
      <div
        role="list"
        aria-label="Output pages"
        style={{ height: count * rowHeight, position: "relative" }}
      >
        {Array.from(
          { length: Math.max(0, end - start) },
          (_, i) => i + start,
        ).map((index) => (
          <div
            key={index}
            role="listitem"
            aria-setsize={count}
            aria-posinset={index + 1}
            style={{
              position: "absolute",
              top: index * rowHeight,
              width: "100%",
              height: rowHeight,
            }}
          >
            {children(index)}
          </div>
        ))}
      </div>
    </div>
  );
}
