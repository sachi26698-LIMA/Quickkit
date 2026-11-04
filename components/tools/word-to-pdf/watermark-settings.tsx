"use client";
import { useEffect, useRef, useState } from "react";
import {
  decodeWatermark,
  type Settings,
} from "@/lib/tools/word-to-pdf/settings";
import styles from "./word-to-pdf.module.css";
export default function WatermarkSettings({
  value: s,
  onChange,
}: {
  value: Settings;
  onChange: (settings: Settings) => void;
}) {
  const [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const reader = useRef<FileReader | null>(null),
    latest = useRef({ s, onChange });
  useEffect(() => {
    latest.current = { s, onChange };
  }, [s, onChange]);
  useEffect(
    () => () => {
      reader.current?.abort();
    },
    [],
  );
  function upload(file?: File) {
    if (!file) return;
    reader.current?.abort();
    setError("");
    if (
      file.size > 256 * 1024 ||
      !["image/png", "image/jpeg"].includes(file.type)
    ) {
      setError("Choose a PNG or JPEG up to 256 KiB.");
      return;
    }
    const next = new FileReader();
    reader.current = next;
    setReading(true);
    next.onload = () => {
      try {
        const data = String(next.result);
        decodeWatermark(data);
        const current = latest.current;
        current.onChange({
          ...current.s,
          imageWatermark: data,
          imageWatermarkEnabled: true,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Image could not be opened.");
      } finally {
        setReading(false);
      }
    };
    next.onerror = () => {
      setReading(false);
      setError("Image could not be read. Try again.");
    };
    next.onabort = () => setReading(false);
    next.readAsDataURL(file);
  }
  const set = (key: keyof Settings, value: string | number | boolean) =>
    onChange({ ...s, [key]: value });
  const number = (
    key: keyof Settings,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={Number.isFinite(s[key]) ? Number(s[key]) : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(key, e.target.valueAsNumber)}
      />
    </label>
  );
  return (
    <details>
      <summary>
        <span>06</span> Watermarks
      </summary>
      <div className={styles.settings}>
        <label>
          Text watermark
          <input
            value={s.watermarkText}
            maxLength={80}
            placeholder="e.g. DRAFT"
            onChange={(e) => set("watermarkText", e.target.value)}
          />
        </label>
        <label>
          Watermark colour
          <input
            type="color"
            value={s.watermarkColor}
            onChange={(e) => set("watermarkColor", e.target.value)}
          />
        </label>
        {number("watermarkSize", "Watermark font size", 12, 96)}
        {number("watermarkOpacity", "Watermark opacity", 0.05, 1, 0.05)}
        {number("watermarkAngle", "Watermark angle", -90, 90)}
        <label>
          Watermark output pages
          <input
            value={s.watermarkPages}
            maxLength={400}
            placeholder="All output pages, or 1-3, 5"
            onChange={(e) => set("watermarkPages", e.target.value)}
          />
        </label>
        <label>
          Local watermark image
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={reading}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={s.imageWatermarkEnabled}
            disabled={!s.imageWatermark}
            onChange={(e) => set("imageWatermarkEnabled", e.target.checked)}
          />
          Enable image watermark
        </label>
        {number("imageWatermarkWidth", "Watermark image width (%)", 10, 80)}
        {number(
          "imageWatermarkOpacity",
          "Image watermark opacity",
          0.05,
          1,
          0.05,
        )}
        {s.imageWatermark && (
          <button
            onClick={() =>
              onChange({
                ...s,
                imageWatermark: "",
                imageWatermarkEnabled: false,
                visualPlan: s.visualPlan
                  ? {
                      ...s.visualPlan,
                      pages: s.visualPlan.pages.map((p) => ({
                        ...p,
                        overrides: {
                          ...p.overrides,
                          imageWatermarkEnabled: false,
                        },
                      })),
                    }
                  : null,
              })
            }
          >
            Remove watermark image
          </button>
        )}
        {reading && <p role="status">Reading local watermark image…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <p className={styles.note}>
          Local PNG/JPEG only, up to 256 KiB / 4 megapixels / 4,096 pixels per
          edge. This image and the visual page plan are never uploaded. One
          image asset per document; selected-page overrides can enable/disable
          it. Blank output-page ranges mean all pages. Watermarks are PDF
          overlays, not security or redaction.
        </p>
      </div>
    </details>
  );
}
