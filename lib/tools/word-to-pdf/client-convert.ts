import { nativeRequestSettings, type Settings } from "./settings";
/** The existing consent-gated NDJSON transport, with optional native-base response for V2. */
export async function requestConversion(
  file: File,
  settings: Settings,
  signal: AbortSignal,
  onStage: (stage: string) => void,
) {
  const response = await fetch("/api/word-to-pdf", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Quickkit-Consent": "server-conversion",
      "X-Quickkit-Settings": encodeURIComponent(
        JSON.stringify(nativeRequestSettings(settings)),
      ),
      "X-Quickkit-Base": "true",
    },
    body: file,
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Conversion request failed.");
  }
  if (!response.body) throw new Error("Conversion returned no response body.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let pending = "",
    result:
      | { bytes: Uint8Array<ArrayBuffer>; pages: number; base: boolean }
      | undefined;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      if (pending.length > 72 * 1024 * 1024)
        throw new Error("Server response exceeds the safe output limit.");
      let newline;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const event = JSON.parse(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        if (event.error) throw new Error(event.error);
        if (event.stage) onStage(event.stage);
        if (event.result) {
          if (
            result ||
            typeof event.result !== "string" ||
            event.result.length > 70 * 1024 * 1024
          )
            throw new Error("Invalid conversion result.");
          const binary = atob(event.result);
          if (
            binary.length > 50 * 1024 * 1024 ||
            !Number.isInteger(event.pages) ||
            event.pages < 1 ||
            event.pages > 100
          )
            throw new Error("Invalid PDF size or page count.");
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          result = { bytes, pages: event.pages, base: event.base === true };
        }
      }
    }
    if (!result || pending.trim())
      throw new Error("Conversion ended without a complete PDF. Please retry.");
    return result;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
