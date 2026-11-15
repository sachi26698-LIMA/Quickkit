"use client";
/**
 * One state engine for the studio.
 *
 * Every panel reads the same settings object and the same derived `spec` /
 * `layout` / `svg`, so the preview, the export row and the verification badge
 * can never disagree. Validation happens on every keystroke and its result is
 * the single gate for every download button.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadBlob } from "@/lib/tools/download";
import { buildBarcode } from "@/lib/tools/barcode/encode";
import {
  applyFormatPreset,
  defaultSettings,
  loadSettings,
  renderOptionsFrom,
  saveSettings,
  sanitizeSettings,
  type BarcodeStudioSettings,
} from "@/lib/tools/barcode/settings";
import { buildLayout } from "@/lib/tools/barcode/layout";
import { layoutToSvg } from "@/lib/tools/barcode/svg";
import type { BarcodeVerification } from "@/lib/tools/barcode/verify";
import type { BarcodeFormatId } from "@/lib/tools/barcode/types";
import { barcodeFilename, svgBlob } from "@/lib/tools/barcode/export";
import { FORMAT_SAMPLES, formatMeta } from "@/lib/tools/barcode/formats";

export type StudioFlash = {
  kind: "success" | "error" | "info";
  text: string;
} | null;

export function useBarcodeStudio() {
  // The whole studio mounts only after hydration (see `index.tsx`), so reading
  // local storage in the initialiser cannot disagree with the server markup.
  const [settings, setSettings] = useState<BarcodeStudioSettings>(() =>
    loadSettings(),
  );
  const [flash, setFlash] = useState<StudioFlash>(null);
  // Verification is stored next to the exact SVG it was run against: editing
  // anything invalidates the badge by derivation, not by an effect.
  const [verdict, setVerdict] = useState<{
    svg: string;
    result: BarcodeVerification;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const result = useMemo(
    () =>
      buildBarcode(settings.format, settings.data, {
        checksum: settings.checksum,
        numberSystem: settings.numberSystem,
        guardBars: settings.guardBars,
      }),
    [
      settings.format,
      settings.data,
      settings.checksum,
      settings.numberSystem,
      settings.guardBars,
    ],
  );

  const renderOptions = useMemo(() => renderOptionsFrom(settings), [settings]);

  const layout = useMemo(
    () =>
      result.ok
        ? buildLayout({ spec: result.spec, options: renderOptions })
        : null,
    [result, renderOptions],
  );

  const payload = result.ok ? result.spec : null;
  const label = payload
    ? `${formatMeta(settings.format).name} ${payload.display}`
    : "Barcode";

  const svg = useMemo(
    () =>
      result.ok && layout
        ? layoutToSvg(layout, {
            title: label,
            description: `${formatMeta(settings.format).name} encoding ${result.spec.display}`,
          })
        : null,
    [result, layout, label, settings.format],
  );

  // A new symbol invalidates the old decode: the badge must never vouch for a
  // barcode that has since changed.
  const verification = svg && verdict?.svg === svg ? verdict.result : null;

  const update = useCallback(
    <K extends keyof BarcodeStudioSettings>(
      key: K,
      value: BarcodeStudioSettings[K],
    ) => {
      setSettings((current) => sanitizeSettings({ ...current, [key]: value }));
    },
    [],
  );

  const patch = useCallback((values: Partial<BarcodeStudioSettings>) => {
    setSettings((current) => sanitizeSettings({ ...current, ...values }));
  }, []);

  const chooseFormat = useCallback((format: BarcodeFormatId) => {
    setSettings((current) => {
      const next = applyFormatPreset(current, format);
      // Swap the sample data only when the user has not typed something of
      // their own — replacing typed data on a format change is infuriating.
      const untouched = Object.values(FORMAT_SAMPLES).includes(current.data);
      return sanitizeSettings({
        ...next,
        data: untouched ? FORMAT_SAMPLES[format] : next.data,
      });
    });
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...defaultSettings });
    setVerdict(null);
    setFlash({ kind: "info", text: "Every setting is back to its default." });
  }, []);

  const checkScan = useCallback(async () => {
    if (!result.ok || !layout) return;
    setChecking(true);
    try {
      const { verifyBarcode } = await import("@/lib/tools/barcode/verify");
      const outcome = verifyBarcode(result.spec, renderOptions);
      if (svg) setVerdict({ svg, result: outcome });
      setFlash({
        kind: outcome.ok ? "success" : "error",
        text: outcome.message,
      });
    } catch {
      setFlash({
        kind: "error",
        text: "The decoder could not be loaded in this browser. The download files are unaffected.",
      });
    } finally {
      setChecking(false);
    }
  }, [result, layout, renderOptions, svg]);

  const downloadSvg = useCallback(() => {
    if (!svg) return;
    downloadBlob(
      svgBlob(svg),
      barcodeFilename({
        format: settings.format,
        value: payload?.value ?? "label",
        ext: "svg",
      }),
    );
    setFlash({
      kind: "success",
      text: "SVG saved — vector bars, so it prints at any size.",
    });
  }, [svg, settings.format, payload]);

  const downloadPng = useCallback(async () => {
    if (!result.ok || !layout) return;
    setBusy("png");
    try {
      const { layoutToPng } = await import("@/lib/tools/barcode/canvas");
      const { bytes, width } = await layoutToPng(layout, settings.scale);
      downloadBlob(
        new Blob([bytes as unknown as BlobPart], { type: "image/png" }),
        barcodeFilename({
          format: settings.format,
          value: result.spec.value,
          ext: "png",
          suffix: `${width}px`,
        }),
      );
      setFlash({
        kind: "success",
        text: `PNG saved at ${width} px wide (${settings.scale}× export scale).`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The PNG could not be created.",
      });
    } finally {
      setBusy(null);
    }
  }, [result, layout, settings.scale, settings.format]);

  /**
   * JPEG export via the canvas. The layout is still drawn by the same vector
   * renderer, so the symbol is identical to the PNG; JPEG is offered because
   * print shops and label portals often refuse a PNG upload.
   */
  const downloadJpeg = useCallback(async () => {
    if (!result.ok || !layout) return;
    setBusy("jpeg");
    try {
      const { layoutToPng } = await import("@/lib/tools/barcode/canvas");
      const { bytes, width } = await layoutToPng(layout, settings.scale);
      const bitmap = await createImageBitmap(
        new Blob([bytes as unknown as BlobPart], { type: "image/png" }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("This browser refused a 2D canvas context.");
      // JPEG has no alpha: paint the quiet zone colour first.
      context.fillStyle = layout.background ?? "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      const jpeg = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95),
      );
      if (!jpeg) throw new Error("The browser could not encode a JPEG.");
      downloadBlob(
        jpeg,
        barcodeFilename({
          format: settings.format,
          value: result.spec.value,
          ext: "jpeg",
          suffix: `${width}px`,
        }),
      );
      setFlash({
        kind: "success",
        text: `JPEG saved at ${width} px wide, on an opaque background.`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The JPEG could not be created.",
      });
    } finally {
      setBusy(null);
    }
  }, [result, layout, settings.scale, settings.format]);

  /**
   * Print through a same-origin iframe: no pop-up blocker, and the SVG stays
   * vector so the printer's own resolution decides how crisp the bars are.
   */
  const printLabel = useCallback(() => {
    if (!svg || typeof document === "undefined") return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.append(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      setFlash({
        kind: "error",
        text: "This browser blocked the print view — use the PDF export instead.",
      });
      return;
    }
    const escape = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>${escape(label)}</title><style>
        @page { margin: 12mm; }
        html, body { margin: 0; padding: 0; }
        body { display: flex; align-items: center; justify-content: center; min-height: 90vh; background: #fff; }
        svg { max-width: 100%; height: auto; }
      </style></head><body>${svg}</body></html>`,
    );
    doc.close();
    const win = frame.contentWindow;
    // Give the iframe a frame to lay the SVG out before the dialog opens.
    setTimeout(() => {
      try {
        win?.focus();
        win?.print();
      } finally {
        setTimeout(() => frame.remove(), 60_000);
      }
    }, 220);
  }, [svg, label]);

  return {
    settings,
    setSettings,
    update,
    patch,
    chooseFormat,
    reset,
    result,
    layout,
    svg,
    label,
    flash,
    setFlash,
    verification,
    checking,
    checkScan,
    busy,
    downloadSvg,
    downloadPng,
    downloadJpeg,
    printLabel,
  };
}
