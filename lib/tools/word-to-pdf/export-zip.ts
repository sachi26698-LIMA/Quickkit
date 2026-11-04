import type { ZipEntry } from "../zip";
export type ZipProgress = {
  bytes: number;
  totalBytes: number;
  files: number;
  totalFiles: number;
};
export type ZipRequest =
  | { type: "init" }
  | { type: "file"; name: string }
  | { type: "chunk"; bytes: ArrayBuffer; last: boolean }
  | { type: "finish" };
export type ZipResponse =
  | { type: "ready" }
  | { type: "data"; bytes: ArrayBuffer }
  | { type: "done" }
  | { type: "error"; message: string };
/** Stream 1 MiB copies through one worker. Retained preview buffers are never detached. */
export async function buildZipBlob(
  entries: ZipEntry[],
  onProgress: (progress: ZipProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  signal.throwIfAborted();
  const totalBytes = entries.reduce((n, e) => n + e.data.length, 0);
  if (
    !entries.length ||
    entries.length > 11 ||
    totalBytes > 121 * 1024 * 1024 ||
    entries.some(
      (e) => !e.name || e.name.length > 200 || /[\\/\x00-\x1f]/.test(e.name),
    )
  )
    throw new Error("ZIP needs 1–11 safely named entries within 121 MiB.");
  const worker = new Worker(
    new URL("../../../workers/word-to-pdf-export.worker.ts", import.meta.url),
    { type: "module" },
  );
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let pending: { resolve: () => void; reject: (e: Error) => void } | undefined,
    failure: Error | undefined;
  const fail = (error: Error) => {
    failure = error;
    pending?.reject(error);
    pending = undefined;
  };
  const abort = () =>
    fail(new DOMException("ZIP export cancelled.", "AbortError"));
  signal.addEventListener("abort", abort, { once: true });
  worker.onerror = () =>
    fail(new Error("ZIP worker failed. Retry or download individual PDFs."));
  worker.onmessage = (event: MessageEvent<ZipResponse>) => {
    const value = event.data;
    if (value.type === "error") fail(new Error(value.message));
    else if (value.type === "data") parts.push(new Uint8Array(value.bytes));
    else {
      pending?.resolve();
      pending = undefined;
    }
  };
  const send = (request: ZipRequest) =>
    new Promise<void>((resolve, reject) => {
      signal.throwIfAborted();
      if (failure) {
        reject(failure);
        return;
      }
      pending = { resolve, reject };
      worker.postMessage(
        request,
        request.type === "chunk" ? [request.bytes] : [],
      );
    });
  try {
    await send({ type: "init" });
    let bytes = 0,
      files = 0;
    onProgress({ bytes, totalBytes, files, totalFiles: entries.length });
    for (const entry of entries) {
      await send({ type: "file", name: entry.name });
      if (!entry.data.length)
        await send({ type: "chunk", bytes: new ArrayBuffer(0), last: true });
      for (let offset = 0; offset < entry.data.length; offset += 1024 * 1024) {
        const chunk = entry.data.slice(
          offset,
          Math.min(entry.data.length, offset + 1024 * 1024),
        );
        const size = chunk.length;
        await send({
          type: "chunk",
          bytes: chunk.buffer as ArrayBuffer,
          last: offset + size === entry.data.length,
        });
        bytes += size;
        onProgress({ bytes, totalBytes, files, totalFiles: entries.length });
      }
      files++;
      onProgress({ bytes, totalBytes, files, totalFiles: entries.length });
    }
    await send({ type: "finish" });
    signal.throwIfAborted();
    return new Blob(parts, { type: "application/zip" });
  } finally {
    signal.removeEventListener("abort", abort);
    worker.terminate();
    parts.length = 0;
  }
}
