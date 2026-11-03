"use client";
/**
 * State engine for the QR workspace.
 *
 * Two render passes keep the interface responsive without ever letting the
 * preview and the download disagree:
 *   1. a light pass (preview pixels only) on every keystroke or slider move;
 *   2. a heavy pass (full size + PNG + SVG + independent decode proof) once
 *      things settle, which is the single source for the export panel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPayload,
  contentTypeDef,
  defaultValuesFor,
  isKnownContentType,
  type QrValues,
} from "@/lib/tools/qr/payload";
import { utf8Length } from "@/lib/tools/qr/capacity";
import { renderQr, type RenderOutput } from "@/lib/tools/qr/render";
import {
  defaultDesign,
  QR_TEMPLATES,
  templateById,
} from "@/lib/tools/qr/style";
import { safeFixDesign } from "@/lib/tools/qr/safety";
import { prepareLogo } from "@/lib/tools/qr/logo";
import {
  QrUserError,
  type QrContentTypeId,
  type QrDesign,
  type QrLogoImage,
} from "@/lib/tools/qr/types";
import {
  createQrPdf,
  pngBlob,
  qrFilename,
  svgBlob,
  type QrPdfOptions,
  DEFAULT_PDF_OPTIONS,
} from "@/lib/tools/qr/export";
import {
  decodeShareConfig,
  encodeShareConfig,
  readShareHash,
} from "@/lib/tools/qr/share";
import {
  clearHistory as clearHistoryStore,
  deletePreset as deletePresetStore,
  loadHistory,
  loadHistoryMode,
  loadPresets,
  recordHistory,
  removeHistory,
  saveHistoryMode,
  savePreset as savePresetStore,
  type QrHistoryEntry,
  type QrHistoryMode,
  type QrPreset,
} from "@/lib/tools/qr/storage";
import { downloadBlob } from "@/lib/tools/download";
import { rasterizeScene } from "@/lib/tools/qr/raster";
// (rasterize + verify are reused by the small-size test, which renders frames
//  the browser would otherwise never have seen.)
import { buildScene } from "@/lib/tools/qr/scene";
import { createMatrix } from "@/lib/tools/qr/matrix";
import { verifyBitmap } from "@/lib/tools/qr/verify";

export type StudioStatus =
  "empty" | "invalid" | "preview" | "rendering" | "ready" | "failed";

/**
 * A render result tagged with what produced it. `key` identifies the inputs,
 * `seq` the pass, so a slow frame from an earlier design can never overwrite a
 * newer one and export can prove it is holding bytes for *this* payload.
 */
type Slot<T> = { key: string; seq: number; value: T } | null;

function renderKeyFor(
  payload: string,
  design: QrDesign,
  logo: QrLogoImage | null,
) {
  const text = `${payload}|${JSON.stringify(design)}|${logo ? `${logo.width}x${logo.height}` : "none"}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/** A real page, used by the empty state so the sample code actually works. */
export const QR_SAMPLE_URL = "https://quickkit.tools/?src=qr-example";

const PREVIEW_SIZE = 320;
const HEAVY_DEBOUNCE_MS = 650;

function labelFor(typeId: QrContentTypeId, values: QrValues) {
  const def = contentTypeDef(typeId);
  const candidates =
    typeId === "url"
      ? [values.url]
      : typeId === "text"
        ? [values.text]
        : typeId === "wifi"
          ? [values.ssid]
          : typeId === "vcard"
            ? [`${values.firstName ?? ""} ${values.lastName ?? ""}`]
            : typeId === "event"
              ? [values.title]
              : typeId === "social"
                ? [values.platform, values.username]
                : typeId === "email"
                  ? [values.to]
                  : [
                      values.title,
                      values.label,
                      values.name,
                      values.url,
                      values.text,
                    ];
  const chosen = candidates.filter(Boolean).join(" ").trim();
  return (chosen || def.label).slice(0, 48);
}

export function useQrStudio() {
  const [typeId, setTypeId] = useState<QrContentTypeId>("url");
  const [valuesByType, setValuesByType] = useState<
    Partial<Record<QrContentTypeId, QrValues>>
  >({});
  const [design, setDesignState] = useState<QrDesign>(() => defaultDesign());
  const [logo, setLogo] = useState<QrLogoImage | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "rendering" | "failed">("idle");
  const [renderError, setRenderError] = useState<{
    message: string;
    field?: string;
  } | null>(null);
  const [previewSlot, setPreviewSlot] =
    useState<Slot<{ width: number; rgba: Uint8ClampedArray } | null>>(null);
  const [outputSlot, setOutputSlot] = useState<Slot<RenderOutput>>(null);
  const [notesSlot, setNotesSlot] = useState<Slot<string[]>>(null);
  const [flash, setFlash] = useState<{
    kind: "info" | "error";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [presets, setPresets] = useState<QrPreset[]>([]);
  const [history, setHistory] = useState<QrHistoryEntry[]>([]);
  const [historyMode, setHistoryMode] = useState<QrHistoryMode>("full");
  const [storageReady, setStorageReady] = useState(false);
  const [pdfOptions, setPdfOptions] =
    useState<QrPdfOptions>(DEFAULT_PDF_OPTIONS);
  const [sizeSlot, setSizeSlot] =
    useState<Slot<{ size: number; ok: boolean; message: string }[]>>(null);
  const [testing, setTesting] = useState(false);

  const version = useRef(0);
  const heavyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredFromLink = useRef(false);

  const values = useMemo(
    () => valuesByType[typeId] ?? defaultValuesFor(typeId),
    [valuesByType, typeId],
  );

  const def = contentTypeDef(typeId);

  /* ------------------------------------------------------------- payload */

  const payloadResult = useMemo(() => {
    try {
      const payload = buildPayload(typeId, values);
      return { ok: true as const, payload, bytes: utf8Length(payload) };
    } catch (error) {
      if (error instanceof QrUserError)
        return {
          ok: false as const,
          payload: "",
          error: error.message,
          field: error.field,
        };
      return {
        ok: false as const,
        payload: "",
        error: "This content could not be encoded.",
      };
    }
  }, [typeId, values]);

  const renderKey = useMemo(
    () => renderKeyFor(payloadResult.payload, design, logo),
    [design, logo, payloadResult.payload],
  );
  const hasContent = useMemo(
    () =>
      Object.values(values).some((entry) =>
        typeof entry === "string" ? entry.trim() !== "" : entry === true,
      ),
    [values],
  );

  /* Nothing is cleared synchronously when the inputs move: the key decides what
   * is current, and the preview keeps the last frame to avoid a flicker. */
  const preview = payloadResult.ok ? (previewSlot?.value ?? null) : null;
  const notes = payloadResult.ok ? (notesSlot?.value ?? []) : [];
  const output = outputSlot?.key === renderKey ? outputSlot.value : null;
  const sizeTests = sizeSlot?.key === renderKey ? sizeSlot.value : null;
  const status: StudioStatus = !payloadResult.ok
    ? hasContent
      ? "invalid"
      : "empty"
    : phase === "failed"
      ? "failed"
      : phase === "rendering"
        ? "rendering"
        : preview
          ? "ready"
          : "preview";
  const formError = !payloadResult.ok
    ? { message: payloadResult.error, field: payloadResult.field }
    : phase === "failed"
      ? renderError
      : null;

  /* ------------------------------------------------------- storage on mount */

  useEffect(() => {
    /* Storage and the share fragment are read once on mount, then applied in a
     * single deferred batch: doing it synchronously here would cascade renders
     * while the browser is still painting the first frame. */
    const stored = loadPresets();
    const entries = loadHistory();
    const mode = loadHistoryMode();
    const shared = readShareHash(window.location.hash);
    const parsed = shared ? decodeShareConfig(shared) : null;
    if (parsed?.ok) restoredFromLink.current = true;
    queueMicrotask(() => {
      setPresets(stored);
      setHistory(entries);
      setHistoryMode(mode);
      if (parsed && parsed.ok) {
        setTypeId(parsed.config.typeId);
        setValuesByType((current) => ({
          ...current,
          [parsed.config.typeId]: {
            ...defaultValuesFor(parsed.config.typeId),
            ...parsed.config.values,
          },
        }));
        setDesignState(parsed.config.design);
        setFlash({
          kind: "info",
          text: parsed.dropped.length
            ? `Configuration loaded from this link. Not carried over: ${parsed.dropped.join(", ")}.`
            : "Configuration loaded from this link.",
        });
      } else if (parsed) {
        setFlash({ kind: "error", text: parsed.message });
      }
      setStorageReady(true);
    });
  }, []);

  /* --------------------------------------------------------- heavy render */

  /**
   * Full-resolution pass: PNG + SVG + an independent decode of the exact bytes
   * that will be downloaded. Only its result can reach the export panel.
   */
  const runHeavy = useCallback(
    async (key: string, seq: number) => {
      if (!payloadResult.ok) return;
      setPhase("rendering");
      try {
        const rendered = await renderQr({
          payload: payloadResult.payload,
          design,
          logo,
          artifacts: { png: true, svg: true },
          verify: true,
        });
        if (seq !== version.current) return;
        setOutputSlot((current) =>
          current && current.seq >= seq
            ? current
            : { key, seq, value: rendered },
        );
        setPhase("idle");
        if (rendered.verification?.ok && storageReady) {
          setHistory(
            recordHistory(
              {
                typeId,
                label: labelFor(typeId, values),
                bytes: rendered.bytes,
                version: rendered.matrix.version,
                design: rendered.design,
                values,
              },
              historyMode,
              loadHistory(),
            ),
          );
        }
      } catch (error) {
        if (seq !== version.current) return;
        setPhase("failed");
        setRenderError({
          message: error instanceof Error ? error.message : "Rendering failed.",
        });
      }
    },
    [design, historyMode, logo, payloadResult, storageReady, typeId, values],
  );

  /* --------------------------------------------------------- light render */

  useEffect(() => {
    if (!payloadResult.ok) return;
    const seq = ++version.current;
    if (heavyTimer.current) clearTimeout(heavyTimer.current);
    let cancelled = false;
    void (async () => {
      try {
        const rendered = await renderQr({
          payload: payloadResult.payload,
          design,
          logo,
          artifacts: { preview: PREVIEW_SIZE },
        });
        if (cancelled) return;
        const bitmap = rendered.preview
          ? { width: rendered.preview.width, rgba: rendered.preview.rgba }
          : null;
        setPreviewSlot((current) =>
          current && current.seq >= seq
            ? current
            : { key: renderKey, seq, value: bitmap },
        );
        setNotesSlot((current) =>
          current && current.seq >= seq
            ? current
            : {
                key: renderKey,
                seq,
                value: rendered.adjustments.map((entry) => entry.message),
              },
        );
        heavyTimer.current = setTimeout(
          () => void runHeavy(renderKey, seq),
          HEAVY_DEBOUNCE_MS,
        );
      } catch (error) {
        if (cancelled) return;
        setPhase("failed");
        setRenderError({
          message:
            error instanceof Error
              ? error.message
              : "This QR code could not be rendered.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [design, logo, payloadResult, renderKey, runHeavy]);

  const regenerate = useCallback(() => {
    const seq = ++version.current;
    void runHeavy(renderKey, seq);
  }, [renderKey, runHeavy]);

  /* ------------------------------------------------------------ mutators */

  const setValue = useCallback(
    (key: string, value: string | boolean) => {
      setValuesByType((current) => ({
        ...current,
        [typeId]: {
          ...(current[typeId] ?? defaultValuesFor(typeId)),
          [key]: value,
        },
      }));
    },
    [typeId],
  );

  const switchType = useCallback((next: QrContentTypeId) => {
    if (!isKnownContentType(next)) return;
    setTypeId(next);
    setValuesByType((current) =>
      current[next] ? current : { ...current, [next]: defaultValuesFor(next) },
    );
  }, []);

  /**
   * Empty-state helper: loads a working sample into the URL type so the
   * workspace shows a real, verified code instead of a blank box. It only ever
   * writes to the URL fields, and says so in the flash bar — nothing the user
   * typed in another content type is replaced.
   */
  const loadSample = useCallback(() => {
    const typed = String(valuesByType.url?.url ?? "").trim();
    setTypeId("url");
    if (typed) {
      setFlash({
        kind: "info",
        text: "Your own address is already in the Web address field, so it was left alone. Clear that field and press Try sample again for the example.",
      });
      return;
    }
    setValuesByType((current) => ({
      ...current,
      url: { ...(current.url ?? defaultValuesFor("url")), url: QR_SAMPLE_URL },
    }));
    setFlash({
      kind: "info",
      text: "Sample link loaded into the Web address field — the preview, the decode check and the downloads are all real. Overwrite it any time.",
    });
  }, [valuesByType]);

  const patchDesign = useCallback((patch: Partial<QrDesign>) => {
    setDesignState((current) => ({ ...current, ...patch }));
    setTemplateId("");
  }, []);

  const applyTemplate = useCallback((id: string) => {
    const template = templateById(id);
    if (!template) return;
    setTemplateId(id);
    setDesignState((current) => ({ ...current, ...template.design }));
  }, []);

  const applyPreset = useCallback((preset: QrPreset) => {
    setDesignState({ ...defaultDesign(), ...preset.design });
    setTemplateId(preset.id);
    setFlash({ kind: "info", text: `Preset “${preset.name}” applied.` });
  }, []);

  const savePreset = useCallback(
    (name: string) => {
      const next = savePresetStore(name, design, loadPresets());
      setPresets(next);
      setFlash({
        kind: "info",
        text: `“${name.trim() || "Untitled preset"}” saved in this browser.`,
      });
    },
    [design],
  );

  const deletePreset = useCallback((id: string) => {
    setPresets(deletePresetStore(id, loadPresets()));
  }, []);

  const resetDesign = useCallback(() => {
    setDesignState(defaultDesign());
    setTemplateId("");
    setLogo(null);
    setFlash({
      kind: "info",
      text: "Design reset to QUICKKIT defaults. Your content is untouched.",
    });
  }, []);

  const makeSafe = useCallback(() => {
    if (!output) return;
    setDesignState((current) => safeFixDesign(current, output.safety));
    setFlash({
      kind: "info",
      text: "Applied the safe settings: dark modules, light field, 4-module quiet zone.",
    });
  }, [output]);

  const attachLogo = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setBusy("Reading logo…");
      try {
        const prepared = await prepareLogo(file);
        setLogo(prepared);
        patchDesign({
          errorLevel:
            design.errorLevel === "L" || design.errorLevel === "M"
              ? "Q"
              : design.errorLevel,
        });
        setFlash({
          kind: "info",
          text: `${prepared.name} loaded — ${Math.round(prepared.bytes / 1024)} KB kept in memory only. Error correction raised to Q so the covered modules survive.`,
        });
      } catch (error) {
        setFlash({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "That logo could not be read.",
        });
      } finally {
        setBusy(null);
      }
    },
    [design.errorLevel, patchDesign],
  );

  const removeLogo = useCallback(() => {
    setLogo(null);
    setFlash({
      kind: "info",
      text: "Logo removed — its pixels were never written to disk.",
    });
  }, []);

  /* ------------------------------------------------------------- exports */

  const label = useMemo(() => labelFor(typeId, values), [typeId, values]);

  const exportPng = useCallback(
    async (size?: number) => {
      if (!payloadResult.ok) return;
      const target = size ?? design.size;
      setBusy(
        target === design.size
          ? "Preparing PNG…"
          : `Rendering ${target}×${target} px…`,
      );
      try {
        let png = output?.png ?? null;
        let verified = output?.verification ?? null;
        if (target !== design.size || !png) {
          const rendered = await renderQr({
            payload: payloadResult.payload,
            design: { ...design, size: target },
            logo,
            artifacts: { png: true },
            verify: true,
          });
          png = rendered.png;
          verified = rendered.verification;
        }
        if (!verified?.ok) {
          setFlash({
            kind: "error",
            text: `PNG export is blocked: ${verified?.message ?? "the rendered code could not be decoded."}`,
          });
          return;
        }
        if (!png) return;
        downloadBlob(
          pngBlob(png),
          qrFilename({
            label,
            typeId,
            ext: "png",
            size: target,
            suffix: target > 1024 ? "hi-res" : undefined,
          }),
        );
        setFlash({
          kind: "info",
          text: `PNG downloaded — ${target}×${target} px, ${design.transparent ? "transparent" : design.bg.base + " field"}, verified by decode before saving.`,
        });
      } catch (error) {
        setFlash({
          kind: "error",
          text: error instanceof Error ? error.message : "Export failed.",
        });
      } finally {
        setBusy(null);
      }
    },
    [design, label, logo, output, payloadResult, typeId],
  );

  const exportSvg = useCallback(async () => {
    if (!payloadResult.ok || !output) return;
    if (!output.verification?.ok) {
      setFlash({
        kind: "error",
        text: `SVG export is blocked: ${output.verification?.message ?? "not verified."}`,
      });
      return;
    }
    try {
      const rendered = await renderQr({
        payload: payloadResult.payload,
        design,
        logo,
        artifacts: { svg: true },
      });
      if (!rendered.svg) return;
      downloadBlob(
        svgBlob(rendered.svg),
        qrFilename({ label, typeId, ext: "svg", suffix: "vector" }),
      );
      setFlash({
        kind: "info",
        text: `SVG downloaded — ${rendered.svg.length.toLocaleString()} characters of vector paths.`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        text: error instanceof Error ? error.message : "Export failed.",
      });
    }
  }, [design, label, logo, output, payloadResult, typeId]);

  const exportPdf = useCallback(async () => {
    if (!payloadResult.ok || !output?.png) return;
    if (!output.verification?.ok) {
      setFlash({
        kind: "error",
        text: `PDF export is blocked: ${output.verification?.message ?? "not verified."}`,
      });
      return;
    }
    setBusy("Building PDF…");
    try {
      const bytes = await createQrPdf(
        [{ png: output.png, caption: pdfOptions.caption ? label : null }],
        pdfOptions,
      );
      downloadBlob(
        new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
        qrFilename({ label, typeId, ext: "pdf", suffix: pdfOptions.paper }),
      );
      setFlash({
        kind: "info",
        text: `PDF downloaded — ${PAPER_LABEL[pdfOptions.paper]} at ${pdfOptions.sizeMm} mm for the code.`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        text: error instanceof Error ? error.message : "PDF build failed.",
      });
    } finally {
      setBusy(null);
    }
  }, [label, output, pdfOptions, payloadResult, typeId]);

  const copyPayload = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        payloadResult.ok ? payloadResult.payload : "",
      );
      setFlash({
        kind: "info",
        text: "Encoded content copied — paste it anywhere to check it.",
      });
    } catch {
      setFlash({
        kind: "error",
        text: "Your browser blocked clipboard access. Select the text in “Encoded content” and copy manually.",
      });
    }
  }, [payloadResult]);

  const copyImage = useCallback(async () => {
    if (!output?.png) return;
    try {
      if (typeof ClipboardItem !== "function") throw new Error("unsupported");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob(output.png) }),
      ]);
      setFlash({ kind: "info", text: "QR image copied to the clipboard." });
    } catch {
      setFlash({
        kind: "error",
        text: "Image copy is not available in this browser — use Download PNG.",
      });
    }
  }, [output]);

  const shareLink = useCallback(async () => {
    try {
      const encoded = encodeShareConfig({ typeId, values, design });
      const url = `${window.location.origin}${window.location.pathname}#c=${encoded}`;
      await navigator.clipboard.writeText(url);
      setFlash({
        kind: "info",
        text: `Share link copied (${encoded.length.toLocaleString()} characters). Everything after the # rebuilds this code in the browser — anyone with the link can read that content, so keep it non-sensitive; passwords are never included and nothing is stored on a server.`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "This link could not be built — save a preset instead.",
      });
    }
  }, [design, typeId, values]);

  const testSizes = useCallback(async () => {
    if (!payloadResult.ok) return;
    setTesting(true);
    const results: { size: number; ok: boolean; message: string }[] = [];
    for (const size of [128, 256, 512, design.size]) {
      try {
        const matrix = createMatrix(payloadResult.payload, design.errorLevel, {
          boost: design.boost,
        });
        const bitmap = rasterizeScene(
          buildScene(matrix, { ...design, size }, logo),
        );
        const check = verifyBitmap(bitmap, payloadResult.payload, {
          totalModules: matrix.size + design.margin * 2,
        });
        results.push({
          size,
          ok: check.ok,
          message: check.ok
            ? `Decoded from ${check.frameWidth}px · ${check.message.includes("as rendered") ? "as rendered" : "resampled"}`
            : check.attempts.filter((attempt) => attempt.includes("no lock"))
                  .length
              ? "no decoder lock"
              : "decoded different content",
        });
      } catch (error) {
        results.push({
          size,
          ok: false,
          message: error instanceof Error ? error.message : "could not render",
        });
      }
    }
    setSizeSlot({ key: renderKey, seq: version.current, value: results });
    setTesting(false);
  }, [design, logo, payloadResult, renderKey]);

  const restoreHistory = useCallback(
    (entry: QrHistoryEntry) => {
      switchType(entry.typeId);
      if (entry.mode === "full")
        setValuesByType((current) => ({
          ...current,
          [entry.typeId]: {
            ...defaultValuesFor(entry.typeId),
            ...entry.values,
          },
        }));
      setDesignState({ ...defaultDesign(), ...entry.design });
      setFlash({
        kind: "info",
        text:
          entry.mode === "full"
            ? "Restored from history (this browser only). Passwords are never stored, so re-enter those."
            : "Design restored. Content is not stored in “designs only” mode.",
      });
    },
    [switchType],
  );

  const toggleHistoryMode = useCallback((mode: QrHistoryMode) => {
    setHistoryMode(mode);
    saveHistoryMode(mode);
    if (mode === "designs") setHistory(clearHistoryStore());
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory(clearHistoryStore());
    setFlash({ kind: "info", text: "History cleared from this browser." });
  }, []);

  const removeOne = useCallback((id: string) => {
    setHistory(removeHistory(id, loadHistory()));
  }, []);

  return {
    typeId,
    def,
    values,
    setValue,
    switchType,
    loadSample,
    hasContent,
    design,
    patchDesign,
    logo,
    attachLogo,
    removeLogo,
    payloadResult,
    status,
    formError,
    preview,
    output,
    notes,
    flash,
    setFlash,
    busy,
    presets,
    history,
    historyMode,
    storageReady,
    pdfOptions,
    setPdfOptions,
    sizeTests,
    testing,
    label,
    templateId,
    templates: QR_TEMPLATES,
    applyTemplate,
    applyPreset,
    savePreset,
    deletePreset,
    resetDesign,
    makeSafe,
    regenerate,
    exportPng,
    exportSvg,
    exportPdf,
    copyPayload,
    copyImage,
    shareLink,
    testSizes,
    restoreHistory,
    toggleHistoryMode,
    clearAllHistory,
    removeOne,
  };
}

const PAPER_LABEL: Record<string, string> = {
  a4: "A4 page",
  letter: "US Letter page",
  square: "60 mm square label",
  fit: "tight crop",
};

export type QrStudio = ReturnType<typeof useQrStudio>;
