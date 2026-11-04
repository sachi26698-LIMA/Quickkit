"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import DocxPane from "@/components/tools/pdf-to-word/docx-pane";
import { prepareDocx } from "@/lib/tools/word-to-pdf/docx";
import { defaults } from "@/lib/tools/word-to-pdf/settings";
import styles from "./word-to-pdf.module.css";
export default function OriginalPane({
  file,
  page,
  zoom,
  count,
  onPageCount,
  onVisiblePage,
}: {
  file: File;
  page: number | null;
  zoom: string;
  count: number;
  onPageCount: (n: number) => void;
  onVisiblePage: (n: number) => void;
}) {
  const callbacks = useRef({ onPageCount, onVisiblePage });
  useEffect(() => {
    callbacks.current = { onPageCount, onVisiblePage };
  }, [onPageCount, onVisiblePage]);
  const reportCount = useCallback(
    (n: number) => callbacks.current.onPageCount(n),
    [],
  );
  const reportPage = useCallback(
    (n: number) => callbacks.current.onVisiblePage(n),
    [],
  );
  const [loaded, setLoaded] = useState<{
    file: File;
    blob?: Blob;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        if (file.size > 5 * 1024 * 1024)
          throw new Error(
            "Local DOCX comparison is limited to 5 MiB to bound browser DOM memory. PDF conversion still supports 20 MiB.",
          );
        const bytes = prepareDocx(
          new Uint8Array(await file.arrayBuffer()),
          defaults,
        );
        if (!stopped)
          setLoaded({
            file,
            blob: new Blob([bytes as Uint8Array<ArrayBuffer>]),
          });
      } catch (e) {
        if (!stopped)
          setLoaded({
            file,
            error:
              e instanceof Error
                ? e.message
                : "Original DOCX cannot be previewed.",
          });
      }
    })();
    return () => {
      stopped = true;
    };
  }, [file]);
  return (
    <div className={styles.original}>
      <div className={styles.compareLabel}>
        ORIGINAL DOCX{" "}
        <span>Approximate browser layout — not a Word reference PDF</span>
      </div>
      {page === null ? (
        <p className={styles.note}>
          Inserted blank page — no original DOCX page.
        </p>
      ) : loaded?.file !== file ? (
        <div className={styles.skeleton} role="status">
          Opening original DOCX…
        </div>
      ) : loaded.error ? (
        <p role="alert" className={styles.note}>
          {loaded.error}
        </p>
      ) : (
        loaded.blob && (
          <div
            className={styles.docxHost}
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.preventDefault();
            }}
          >
            {count > 0 && page > count && (
              <p className={styles.note}>
                Source page {page} exceeds this approximate browser layout;
                showing its last page ({count}).
              </p>
            )}
            <DocxPane
              blob={loaded.blob}
              page={Math.min(page, count || page)}
              zoom={
                zoom === "fit-width"
                  ? { kind: "fit-width" }
                  : zoom === "fit-page"
                    ? { kind: "fit-page" }
                    : { kind: "percent", value: Number(zoom) }
              }
              onPageCount={reportCount}
              onVisiblePage={reportPage}
            />
          </div>
        )
      )}
    </div>
  );
}
