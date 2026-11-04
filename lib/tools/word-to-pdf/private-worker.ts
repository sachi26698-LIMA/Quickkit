import type { Settings } from "./settings";
const MAX_PDF = 50 * 1024 * 1024;
export const workerConfigured = () =>
  process.env.WORD_TO_PDF_WORKER_URL !== undefined ||
  process.env.WORD_TO_PDF_WORKER_TOKEN !== undefined;
export function workerConfig() {
  const token = process.env.WORD_TO_PDF_WORKER_TOKEN || "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token))
    throw new Error(
      "Private conversion worker credentials are not configured.",
    );
  let url: URL;
  try {
    url = new URL(process.env.WORD_TO_PDF_WORKER_URL || "");
  } catch {
    throw new Error("Private conversion worker URL is not configured.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error(
      "Private conversion worker requires HTTPS (or explicit loopback HTTP) and a root URL without credentials/query.",
    );
  return { url, token };
}
async function limited(response: Response, max: number, signal: AbortSignal) {
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new Error("Private worker response exceeds the safe limit.");
  }
  if (!response.body)
    throw new Error("Private worker returned an empty response.");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max)
        throw new Error("Private worker response exceeds the safe limit.");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return bytes;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function privateWorkerAvailable() {
  try {
    const { url, token } = workerConfig(),
      signal = AbortSignal.timeout(8000);
    const response = await fetch(new URL("health", url), {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      cache: "no-store",
      signal,
    });
    if (!response.ok) return false;
    const health = JSON.parse(
      new TextDecoder().decode(await limited(response, 4096, signal)),
    );
    return (
      health.protocol === 1 &&
      health.available === true &&
      health.isolated === true &&
      health.engine === "LibreOffice"
    );
  } catch {
    return false;
  }
}
export function workerExportOptions(s: Settings) {
  return {
    lossless:
      s.compression === "lossless" ||
      (s.compression === "auto" && s.quality !== "standard"),
    jpegQuality: s.jpegQuality,
    reduceResolution: !s.preserveResolution,
    maxDpi: s.imageDpi,
    tagged: s.tagged,
  };
}
/** Explicit private-worker mode; never fall back to a local executable or third party. */
export async function renderWithPrivateWorker(
  bytes: Uint8Array,
  s: Settings,
  signal: AbortSignal,
) {
  const { url, token } = workerConfig();
  signal.throwIfAborted();
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(130_000)]);
  try {
    const response = await fetch(new URL("convert", url), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-Quickkit-Export": JSON.stringify(workerExportOptions(s)),
      },
      body: bytes as Uint8Array<ArrayBuffer>,
      redirect: "error",
      cache: "no-store",
      signal: deadline,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        response.status === 429
          ? "Private conversion worker is busy. Please retry."
          : "Private native conversion failed. Retry or contact the operator.",
      );
    }
    if (response.headers.get("content-type") !== "application/pdf") {
      await response.body?.cancel();
      throw new Error("Private worker did not return a PDF.");
    }
    const source = await limited(response, MAX_PDF, deadline);
    if (new TextDecoder().decode(source.subarray(0, 5)) !== "%PDF-")
      throw new Error("Private worker returned invalid PDF bytes.");
    return source;
  } catch (e) {
    if (signal.aborted) throw new Error("Conversion cancelled.");
    if (deadline.aborted)
      throw new Error("Private native conversion exceeded its deadline.");
    throw e;
  }
}
