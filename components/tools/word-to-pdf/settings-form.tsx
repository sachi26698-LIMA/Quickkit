"use client";
import { sizes, type Settings } from "@/lib/tools/word-to-pdf/settings";
import WatermarkSettings from "./watermark-settings";
import styles from "./word-to-pdf.module.css";
export default function SettingsForm({
  value: s,
  native = true,
  onChange,
}: {
  value: Settings;
  /** The built-in renderer embeds images losslessly and ignores native export knobs. */
  native?: boolean;
  onChange: (s: Settings) => void;
}) {
  const set = (key: keyof Settings, value: string | number | boolean) =>
    onChange({ ...s, [key]: value });
  const text = (key: keyof Settings, label: string, placeholder = "") => (
    <label>
      {label}
      <input
        value={String(s[key])}
        maxLength={key === "header" || key === "footer" ? 120 : 400}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  const number = (
    key: keyof Settings,
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={Number.isFinite(s[key]) ? Number(s[key]) : ""}
        min={min}
        max={max}
        onChange={(e) => set(key, e.target.valueAsNumber)}
      />
    </label>
  );
  const check = (key: keyof Settings, label: string) => (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={Boolean(s[key])}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );
  const select = (
    key: keyof Settings,
    label: string,
    choices: [string, string][],
  ) => (
    <label>
      {label}
      <select value={String(s[key])} onChange={(e) => set(key, e.target.value)}>
        {choices.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className={styles.settingsSections}>
      <details open>
        <summary>
          <span>01</span> Page Setup
        </summary>
        <div className={styles.settings}>
          {select(
            "paper",
            "Page size",
            ["Original", ...Object.keys(sizes), "Custom"].map((v) => [v, v]),
          )}
          <label>
            Orientation
            <select
              disabled={s.paper === "Original"}
              value={s.landscape ? "landscape" : "portrait"}
              onChange={(e) => set("landscape", e.target.value === "landscape")}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          {s.paper === "Custom" && (
            <>
              {number("width", "Width (mm)", 50, 600)}
              {number("height", "Height (mm)", 50, 600)}
            </>
          )}
          {select("layoutScope", "Apply page setup to", [
            ["all", "All pages · native reflow"],
            ["selected", "Selected pages · PDF geometry"],
          ])}
          {s.layoutScope === "selected" &&
            text("layoutPages", "Layout pages (source PDF)", "All, or 1-3, 5")}
          {check("margins", "Override document margins")}
          {s.margins &&
            (["top", "right", "bottom", "left"] as const).map((key) => (
              <div key={key}>
                {number(
                  key,
                  `${key[0].toUpperCase() + key.slice(1)} margin (mm)`,
                  0,
                  100,
                )}
              </div>
            ))}
          <p className={styles.note}>
            {s.layoutScope === "all"
              ? "Original preserves section sizes. All-page size and margin changes reflow inside the conversion engine and require a new consented upload."
              : "Selected-page layout scales the already-paginated PDF into the new size/margins; it does not selectively reflow Word text. Annotation placement and structure may change."}
          </p>
        </div>
      </details>
      <details>
        <summary>
          <span>02</span> Page Management
        </summary>
        <div className={styles.settings}>
          <fieldset className={styles.rangeFields} disabled={!!s.visualPlan}>
            {text("pages", "Pages to export", "All pages, or 1-3, 5")}
            {text("excludePages", "Exclude pages", "None, or 2, 4-6")}
            {text(
              "pageOrder",
              "Output page order",
              "Original order, or 3, 1-2",
            )}
          </fieldset>
          {s.visualPlan && (
            <p className={styles.note}>
              Visual page edits control output order. Reset visual edits in the
              page editor to use source ranges again.
            </p>
          )}
          <p className={styles.note}>
            Ranges use source-PDF page numbers after native pagination. Output
            order must list every included page exactly once. Subsets/reordering
            can lose outlines, structure and links to omitted pages.
          </p>
          {check("numbering", "Add page numbers")}
          {s.numbering && (
            <>
              {text(
                "numberFormat",
                "Custom number template",
                "Page {n} of {total}",
              )}
              {text(
                "numberingPages",
                "Number output pages",
                "All output pages, or 1-3, 5",
              )}
              <p className={styles.note}>
                Templates: {"{n}"}, {"{total}"}, {"{section}"}. Numbers follow
                output positions, including unprinted pages. Explicit per-page
                number switches override range gates; skip-first still applies.
              </p>
              {number("startNumber", "Numbering starts at", 1, 3900)}
              {select("numberStyle", "Number format", [
                ["arabic", "Arabic · 1, 2, 3"],
                ["roman", "Roman · I, II, III"],
              ])}
              {check(
                "skipFirstNumber",
                "First page unnumbered; start on page 2",
              )}
              {select("position", "Number position", [
                ["bottom", "Bottom"],
                ["top", "Top"],
              ])}
            </>
          )}
          {text("header", "Custom header", "Optional PDF overlay")}
          {text("footer", "Custom footer", "Optional PDF overlay")}
          {text(
            "overlayPages",
            "Apply overlays to source pages",
            "All included pages, or 1, 3-5",
          )}
          <label>
            Output rotation
            <select
              value={s.rotation}
              onChange={(e) => set("rotation", Number(e.target.value))}
            >
              {[0, 90, 180, 270].map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
          <p className={styles.note}>
            Numbers follow the output order. Reserve space for overlays to avoid
            overlapping existing headers and footers. Overlay text supports
            basic Latin only; source text is unrestricted.
          </p>
        </div>
      </details>
      <details>
        <summary>
          <span>03</span> Appearance
        </summary>
        <div className={styles.settings}>
          {check("backgroundEnabled", "Add PDF background colour")}
          {s.backgroundEnabled && (
            <label>
              Background colour
              <input
                type="color"
                value={s.backgroundColor}
                onChange={(e) => set("backgroundColor", e.target.value)}
              />
            </label>
          )}
          <p className={styles.note}>
            Background is placed behind existing PDF content, not painted over
            it. Opaque Word page backgrounds remain opaque.
          </p>
          {select("align", "Overlay alignment", [
            ["left", "Left"],
            ["center", "Centre"],
            ["right", "Right"],
          ])}
          {select(
            "font",
            "Overlay font",
            ["Helvetica", "Times-Roman", "Courier"].map((v) => [v, v]),
          )}
          {number("fontSize", "Overlay size (pt)", 6, 36)}
          <label>
            Overlay colour
            <input
              type="color"
              value={s.color}
              onChange={(e) => set("color", e.target.value)}
            />
          </label>
          {check("tagged", "Request tagged native PDF (requires conversion)")}
          {!native && (
            <p className={styles.note}>
              Tags and PDF structure come from the native engine only. The
              built-in renderer keeps real text and fonts, but does not emit a
              tagged PDF.
            </p>
          )}
          <label>
            Text rendering
            <select disabled>
              <option>Native text · no forced rasterization</option>
            </select>
          </label>
          <label>
            Font embedding
            <select disabled>
              <option>Automatic · availability & licensing dependent</option>
            </select>
          </label>
          <p className={styles.note}>
            Native hyperlinks and selectable text are retained where supported.
            Missing fonts can substitute. Tagging is best-effort; page editing
            can degrade document structure. No claim of PDF/UA or exact Word
            rendering.
          </p>
        </div>
      </details>
      <details>
        <summary>
          <span>04</span> Quality
        </summary>
        <div className={styles.settings}>
          {select("quality", "PDF quality", [
            ["standard", "Standard PDF"],
            ["high", "High-quality PDF"],
            ["print", "Print-quality PDF (not PDF/X)"],
          ])}
          {select("compression", "Image compression", [
            ["auto", "Automatic for quality preset"],
            ["jpeg", "JPEG"],
            ["lossless", "Lossless image encoding (not conversion)"],
          ])}
          {s.compression !== "lossless" &&
            number("jpegQuality", "JPEG quality (1–100)", 1, 100)}
          {check("preserveResolution", "Preserve image resolution")}
          {!s.preserveResolution &&
            number("imageDpi", "Maximum image DPI", 72, 600)}
          <p className={styles.note}>
            {native
              ? "Image transparency and resolution depend on native support. High/Print use lossless image encoding in Automatic mode; this is not a lossless-conversion promise. Print is not PDF/X, CMYK, bleed or press certification."
              : "The built-in renderer keeps every source image losslessly, so JPEG quality, DPI limiting and tagging here apply to the native LibreOffice engine only. Page size, margins, overlays, numbering, watermarks and metadata do apply to your output."}
          </p>
          <p className={styles.note}>
            Output estimate: unavailable before native rendering. DOCX size is
            not a reliable PDF size predictor. Actual size appears after
            conversion.
          </p>
        </div>
      </details>
      <details>
        <summary>
          <span>05</span> PDF Metadata
        </summary>
        <div className={styles.settings}>
          {text("title", "PDF title", "Preserve native title if blank")}
          {text("author", "PDF author")}
          {text("subject", "PDF subject")}
          {text("keywords", "PDF keywords", "Comma-separated keywords")}
          <p className={styles.note}>
            Metadata is embedded in the exported PDF. Empty fields preserve
            native metadata; they do not redact it.
          </p>
        </div>
      </details>
      <WatermarkSettings value={s} onChange={onChange} />
    </div>
  );
}
