import { nativeRequestSettings, type Settings } from "./settings";

export type EngineInfo = {
  available: boolean;
  engine: "worker" | "libreoffice" | "builtin" | null;
  label: string;
  native: boolean;
  fidelity: "office-grade" | "quickkit-renderer" | "unavailable";
  notes: string[];
  maxPages: number;
};

export type ConversionStage = {
  stage: string;
  done?: number;
  total?: number;
};

export type ConversionResult = {
  bytes: Uint8Array<ArrayBuffer>;
  pages: number;
  base: boolean;
  engine: string;
  native: boolean;
  warnings: string[];
};

const FALLBACK_MAX_PAGES = 1000;

export async function fetchEngineInfo(
  signal?: AbortSignal,
): Promise<EngineInfo> {
  const response = await fetch("/api/word-to-pdf", {
    signal,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Could not read the conversion engine status.");
  const value = (await response.json()) as Partial<EngineInfo>;
  return {
    available: value.available === true,
    engine: value.engine ?? null,
    label: value.label || "Conversion engine",
    native: value.native === true,
    fidelity: value.fidelity || "unavailable",
    notes: Array.isArray(value.notes) ? value.notes : [],
    maxPages:
      Number.isInteger(value.maxPages) && (value.maxPages as number) > 0
        ? (value.maxPages as number)
        : FALLBACK_MAX_PAGES,
  };
}

/** The consent-gated NDJSON transport, now with real stage progress. */
export async function requestConversion(
  file: File,
  settings: Settings,
  signal: AbortSignal,
  onStage: (stage: ConversionStage) => void,
  maxPages = FALLBACK_MAX_PAGES,
): Promise<ConversionResult> {
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
    let message = "Conversion request failed.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      /* non-JSON failure response */
    }
    throw new Error(message);
  }
  if (!response.body) throw new Error("Conversion returned no response body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result: ConversionResult | undefined;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      if (pending.length > 96 * 1024 * 1024)
        throw new Error("Server response exceeds the safe output limit.");
      let newline;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line) as {
          stage?: string;
          done?: number;
          total?: number;
          error?: string;
          result?: string;
          pages?: number;
          base?: boolean;
          engine?: string;
          native?: boolean;
          warnings?: string[];
        };
        if (event.error) throw new Error(event.error);
        if (event.stage)
          onStage({ stage: event.stage, done: event.done, total: event.total });
        if (event.result) {
          if (result || typeof event.result !== "string")
            throw new Error("Invalid conversion result.");
          if (event.result.length > 90 * 1024 * 1024)
            throw new Error(
              "Converted PDF is too large to return to this browser.",
            );
          const binary = atob(event.result);
          if (
            binary.length > 50 * 1024 * 1024 ||
            !Number.isInteger(event.pages) ||
            (event.pages as number) < 1 ||
            (event.pages as number) > maxPages
          )
            throw new Error("Invalid PDF size or page count.");
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          result = {
            bytes,
            pages: event.pages as number,
            base: event.base === true,
            engine: event.engine || "unknown",
            native: event.native === true,
            warnings: Array.isArray(event.warnings) ? event.warnings : [],
          };
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
