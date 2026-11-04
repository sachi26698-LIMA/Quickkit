"use client";
import { useEffect, useState } from "react";
import DocxPane from "@/components/tools/pdf-to-word/docx-pane";
import { prepareDocx } from "@/lib/tools/word-to-pdf/docx";
import { defaults } from "@/lib/tools/word-to-pdf/settings";
import styles from "./word-to-pdf.module.css";
export default function OriginalPane({ file }: { file: File }) {
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
      {loaded?.file !== file ? (
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
            <DocxPane
              blob={loaded.blob}
              page={1}
              zoom={{ kind: "fit-width" }}
              onPageCount={() => {}}
              onVisiblePage={() => {}}
            />
          </div>
        )
      )}
    </div>
  );
}
