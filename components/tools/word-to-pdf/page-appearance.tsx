"use client";
import { sizes, type Settings } from "@/lib/tools/word-to-pdf/settings";
import type {
  PageOverrides,
  VisualPlan,
} from "@/lib/tools/word-to-pdf/page-plan";
import styles from "./word-to-pdf.module.css";
export default function PageAppearance({
  settings,
  plan,
  selection,
  onPatch,
  onClear,
  disabled,
}: {
  settings: Settings;
  plan: VisualPlan;
  selection: string[];
  onPatch: (patch: PageOverrides) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const selected = plan.pages.filter((p) => selection.includes(p.id));
  const value = { ...settings, ...selected[0]?.overrides };
  const text = (key: keyof PageOverrides, label: string, max = 120) => (
    <label>
      {label}
      <input
        value={String(value[key])}
        maxLength={max}
        onChange={(e) => onPatch({ [key]: e.target.value })}
      />
    </label>
  );
  const number = (
    key: keyof PageOverrides,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={Number.isFinite(value[key]) ? Number(value[key]) : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onPatch({ [key]: e.target.valueAsNumber })}
      />
    </label>
  );
  const check = (key: keyof PageOverrides, label: string) => (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={Boolean(value[key])}
        onChange={(e) => onPatch({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const color = (key: keyof PageOverrides, label: string) => (
    <label>
      {label}
      <input
        type="color"
        value={String(value[key])}
        onChange={(e) => onPatch({ [key]: e.target.value })}
      />
    </label>
  );
  return (
    <details open={selected.length > 0} className={styles.pageAppearance}>
      <summary>Selected page appearance · {selected.length}</summary>
      <fieldset
        disabled={disabled || !selected.length}
        className={styles.fieldset}
      >
        <div className={styles.settings}>
          <p className={styles.note}>
            Select pages in the page editor. Controls show the first selected
            page; changing one property applies only that property to all
            selected pages. Per-page overrides win over file/global settings.
          </p>
          {text("header", "Selected page header")}
          {text("footer", "Selected page footer")}
          <label>
            Selected overlay font
            <select
              value={value.font}
              onChange={(e) =>
                onPatch({ font: e.target.value as Settings["font"] })
              }
            >
              {["Helvetica", "Times-Roman", "Courier"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {number("fontSize", "Selected overlay font size", 6, 36)}
          {color("color", "Selected overlay colour")}
          <label>
            Selected overlay alignment
            <select
              value={value.align}
              onChange={(e) =>
                onPatch({ align: e.target.value as Settings["align"] })
              }
            >
              {["left", "center", "right"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {check("numbering", "Number selected pages")}
          {text("numberFormat", "Selected number template", 80)}
          {check("backgroundEnabled", "Selected page background")}
          {color("backgroundColor", "Selected background colour")}
          <details>
            <summary>Selected watermarks</summary>
            <div className={styles.settings}>
              {text("watermarkText", "Selected text watermark", 80)}
              {color("watermarkColor", "Selected watermark colour")}
              {number("watermarkSize", "Selected watermark size", 12, 96)}
              {number(
                "watermarkOpacity",
                "Selected watermark opacity",
                0.05,
                1,
                0.05,
              )}
              {number("watermarkAngle", "Selected watermark angle", -90, 90)}
              {check(
                "imageWatermarkEnabled",
                "Image watermark on selected pages",
              )}
              {number(
                "imageWatermarkWidth",
                "Selected image width (%)",
                10,
                80,
              )}
              {number(
                "imageWatermarkOpacity",
                "Selected image opacity",
                0.05,
                1,
                0.05,
              )}
              <p className={styles.note}>
                Choose the local image asset under Watermarks. A document has
                one image asset; individual pages can enable/disable it and
                change its width/opacity.
              </p>
            </div>
          </details>
          <details>
            <summary>Selected PDF geometry</summary>
            <div className={styles.settings}>
              <label>
                Selected page size
                <select
                  value={value.paper}
                  onChange={(e) =>
                    onPatch({ paper: e.target.value as Settings["paper"] })
                  }
                >
                  {["Original", ...Object.keys(sizes), "Custom"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {check("landscape", "Selected landscape (preset/custom size)")}
              {value.paper === "Custom" && (
                <>
                  {number("width", "Selected page width (mm)", 50, 600)}
                  {number("height", "Selected page height (mm)", 50, 600)}
                </>
              )}
              {check("margins", "Selected PDF margins")}
              {value.margins &&
                (["top", "right", "bottom", "left"] as const).map((key) => (
                  <div key={key}>
                    {number(key, `Selected ${key} margin (mm)`, 0, 100)}
                  </div>
                ))}
              <p className={styles.note}>
                Per-page size/margins scale existing PDF content after
                pagination, not Word reflow. Original retains the existing sheet
                size; choose a preset/custom size to change orientation.
                Source-native margins cannot be removed by post-scaling.
              </p>
            </div>
          </details>
          <button onClick={onClear}>Clear selected overrides</button>
        </div>
      </fieldset>
    </details>
  );
}
