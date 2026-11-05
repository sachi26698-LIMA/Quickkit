"use client";
/** Search is opt-in, sequential and capped at the tool's 100-page limit. No OCR or uploads. */
export async function searchPdf(
  bytes: Uint8Array,
  query: string,
  signal: AbortSignal,
): Promise<number[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    useWasm: false,
    verbosity: 0,
  });
  const abort = () => {
    void task.destroy().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    const doc = await task.promise;
    if (doc.numPages > 100) throw new Error("Search is limited to 100 pages.");
    const hits: number[] = [],
      needle = query.trim().toLocaleLowerCase();
    if (!needle) return hits;
    for (let i = 1; i <= doc.numPages; i++) {
      signal.throwIfAborted();
      const page = await doc.getPage(i);
      const text = await page.getTextContent();
      if (
        text.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)
      )
        hits.push(i);
      page.cleanup();
    }
    return hits;
  } finally {
    signal.removeEventListener("abort", abort);
    await task.destroy().catch(() => undefined);
  }
}
