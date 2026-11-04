"use client";
/**
 * DESIGN — one card, four folds: colour and gradient, module and eye shapes,
 * the logo overlay, and the template shelf. Every control here changes the
 * scene model that the preview, the exports and the decoder all read from.
 */
import { useRef, useState } from "react";
import { Eraser, ImagePlus, Lock, SwatchBook, X } from "lucide-react";
import {
  DOT_STYLES,
  EYE_STYLES,
  FILL_KINDS,
  MIN_CONTRAST,
  contrastRatio,
  effectiveContrast,
} from "@/lib/tools/qr/style";
import { logoOpacity } from "@/lib/tools/qr/logo";
import type {
  QrDotStyle,
  QrEyeStyle,
  QrFill,
  QrFillKind,
} from "@/lib/tools/qr/types";
import {
  QrChoice,
  QrColorInput,
  QrDisclosure,
  QrRange,
  QrToggle,
} from "./shared";
import type { QrStudio } from "./use-qr-studio";
import TemplateGallery from "./template-gallery";

const PRESET_SWATCHES = [
  { name: "QUICKKIT purple", fg: "#4b19b8", bg: "#ffffff" },
  { name: "Ink", fg: "#17152b", bg: "#ffffff" },
  { name: "Grape on lavender", fg: "#2a1b5e", bg: "#ede3ff" },
  { name: "Teal", fg: "#0f5f52", bg: "#f2fbf7" },
  { name: "Crimson", fg: "#7f1d1d", bg: "#fff5f5" },
  { name: "Amber", fg: "#78350f", bg: "#fffbeb" },
];

function dotPreview(style: QrDotStyle) {
  const cells = [0, 1, 2];
  return (
    <svg viewBox="0 0 30 12" width="52" height="21" aria-hidden="true">
      {cells.map((x) => {
        const offset = x * 10 + 1;
        if (style === "dots")
          return (
            <circle key={x} cx={offset + 4} cy={6} r={4} fill="currentColor" />
          );
        if (style === "rounded")
          return (
            <rect
              key={x}
              x={offset}
              y={2}
              width={8}
              height={8}
              rx={3}
              fill="currentColor"
            />
          );
        if (style === "classy")
          return (
            <path
              key={x}
              d={`M${offset + 4} 2H${offset + 8}V${6}A4 4 0 0 1 ${offset + 4} 10Z`}
              fill="currentColor"
            />
          );
        if (style === "classy-rounded")
          return (
            <path
              key={x}
              d={`M${offset + 2} 2H${offset + 8}V${8}H${offset + 6}A4 4 0 0 1 ${offset + 2} ${4}Z`}
              fill="currentColor"
            />
          );
        return (
          <rect
            key={x}
            x={offset}
            y={2}
            width={8}
            height={8}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

function eyePreview(style: QrEyeStyle) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 2.2 };
  return (
    <svg viewBox="0 0 22 22" width="26" height="26" aria-hidden="true">
      {style === "dots" || style === "circle" ? (
        <circle cx={11} cy={11} r={8.4} {...shared} />
      ) : style === "rounded" ? (
        <rect x={2.5} y={2.5} width={17} height={17} rx={5.5} {...shared} />
      ) : style === "classy" ? (
        <path
          d="M8 2.5H19.5V14A5.5 5.5 0 0 1 14 19.5H2.5V8A5.5 5.5 0 0 1 8 2.5Z"
          {...shared}
        />
      ) : (
        <rect x={2.5} y={2.5} width={17} height={17} {...shared} />
      )}
      {style === "dots" ? (
        <circle cx={11} cy={11} r={3.4} fill="currentColor" />
      ) : style === "circle" ? (
        <circle cx={11} cy={11} r={2.6} fill="currentColor" />
      ) : (
        <rect
          x={7.6}
          y={7.6}
          width={6.8}
          height={6.8}
          rx={style === "rounded" ? 2 : 0}
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function FillEditor({
  legend,
  fill,
  onChange,
  idPrefix,
}: {
  legend: string;
  fill: QrFill;
  onChange: (fill: QrFill) => void;
  idPrefix: string;
}) {
  return (
    <div className="qr-fill-editor">
      <div className="qr-fill-head">
        <span className="field-label">{legend}</span>
        <div className="qr-segment" role="group" aria-label={`${legend} type`}>
          {FILL_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              className={fill.kind === kind.id ? "active" : ""}
              aria-pressed={fill.kind === kind.id}
              onClick={() => onChange({ ...fill, kind: kind.id as QrFillKind })}
            >
              {kind.label}
            </button>
          ))}
        </div>
      </div>
      <div className="qr-fill-row">
        <QrColorInput
          id={`${idPrefix}-base`}
          label="Colour"
          hideLabel
          value={fill.base}
          onChange={(base) => onChange({ ...fill, base })}
        />
        {fill.kind !== "solid" ? (
          <QrColorInput
            id={`${idPrefix}-accent`}
            label="Second stop"
            hideLabel
            value={fill.accent}
            onChange={(accent) => onChange({ ...fill, accent })}
          />
        ) : null}
      </div>
      {fill.kind === "linear" ? (
        <QrRange
          id={`${idPrefix}-angle`}
          label="Gradient angle"
          value={fill.angle}
          min={0}
          max={359}
          suffix="°"
          onChange={(angle) => onChange({ ...fill, angle })}
        />
      ) : null}
      <div
        className="qr-gradient-strip"
        style={{
          background:
            fill.kind === "solid"
              ? fill.base
              : fill.kind === "radial"
                ? `radial-gradient(circle at 50% 50%, ${fill.base}, ${fill.accent})`
                : `linear-gradient(${fill.angle}deg, ${fill.base}, ${fill.accent})`,
        }}
        role="img"
        aria-label={`${legend} preview: ${fill.kind === "solid" ? fill.base : `${fill.base} to ${fill.accent}`}`}
      />
    </div>
  );
}

type DesignTab = "colours" | "pattern" | "corners" | "logo" | "templates";

const DESIGN_TABS: { id: DesignTab; label: string }[] = [
  { id: "colours", label: "Colours" },
  { id: "pattern", label: "Pattern" },
  { id: "corners", label: "Corners" },
  { id: "logo", label: "Logo" },
  { id: "templates", label: "Templates" },
];

/** One tab of the design card. Only the selected panel is in the DOM. */
function DesignPanel({
  id,
  active,
  label,
  children,
}: {
  id: DesignTab;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      className="qr-panel"
      role="tabpanel"
      id={`qr-design-panel-${id}`}
      aria-labelledby={`qr-design-tab-${id}`}
      aria-label={label}
    >
      {children}
    </div>
  );
}

export default function DesignStudio({ studio }: { studio: QrStudio }) {
  const { design, patchDesign, logo, attachLogo, removeLogo, templateId } =
    studio;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<DesignTab>("colours");
  const contrast = effectiveContrast(design.fg, design.bg);
  const templateName = studio.allTemplates.find(
    (entry) => entry.id === templateId,
  )?.name;
  const fieldContrast = contrastRatio(design.fg.base, design.bg.base);
  const opacity = logo ? Math.round(logoOpacity(logo) * 100) : 0;

  return (
    <QrDisclosure
      id="qr-design"
      title="Design & Customize"
      hint="Ink, shape, logo and ready-made looks — re-rendered and re-decoded after every change."
      icon={<SwatchBook size={17} />}
      defaultOpen
      action={
        templateId ? (
          <span className="qr-badge">{templateName ?? "template"}</span>
        ) : null
      }
    >
      <div className="qr-design-bar">
        <div className="qr-seg" role="tablist" aria-label="Design controls">
          {DESIGN_TABS.map((entry, index) => {
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`qr-design-tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`qr-design-panel-${entry.id}`}
                tabIndex={active ? 0 : -1}
                className={active ? "qr-seg-tab active" : "qr-seg-tab"}
                onClick={() => setTab(entry.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                    return;
                  event.preventDefault();
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  const next =
                    DESIGN_TABS[
                      (index + delta + DESIGN_TABS.length) % DESIGN_TABS.length
                    ];
                  setTab(next.id);
                  document.getElementById(`qr-design-tab-${next.id}`)?.focus();
                }}
              >
                {entry.label}
                {entry.id === "logo" && logo ? (
                  <span className="qr-tab-dot" aria-hidden="true" />
                ) : null}
                {entry.id === "templates" && templateId ? (
                  <span className="qr-tab-dot" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="qr-link-button"
          onClick={studio.resetDesign}
        >
          <Eraser size={14} /> Reset
        </button>
      </div>

      <DesignPanel
        id="colours"
        active={tab === "colours"}
        label="Colour, gradient and contrast"
      >
        <div className="qr-fill-grid">
          <FillEditor
            legend="Modules (foreground)"
            idPrefix="qr-fg"
            fill={design.fg}
            onChange={(fg) => patchDesign({ fg })}
          />
          <FillEditor
            legend="Background field"
            idPrefix="qr-bg"
            fill={design.bg}
            onChange={(bg) => patchDesign({ bg })}
          />
        </div>
        <p
          className={`qr-contrast ${contrast >= MIN_CONTRAST ? "ok" : "bad"}`}
          role="status"
        >
          <span
            className="qr-contrast-chip"
            style={{
              background: `linear-gradient(90deg, ${design.fg.base}, ${design.fg.kind === "solid" ? design.fg.base : design.fg.accent})`,
            }}
            aria-hidden="true"
          />
          Worst-case contrast {contrast.toFixed(2)}:1 · solid pair{" "}
          {fieldContrast.toFixed(2)}:1.{" "}
          {contrast >= 4.5
            ? "Strong — safe for small prints and photos."
            : contrast >= MIN_CONTRAST
              ? "Workable. Aim for 4.5:1 or better for posters and fabric."
              : `Below the ${MIN_CONTRAST}:1 floor — expect decode failures.`}
        </p>
        <div className="qr-swatches">
          {PRESET_SWATCHES.map((swatch) => (
            <button
              key={swatch.name}
              type="button"
              className="qr-swatch"
              onClick={() =>
                patchDesign({
                  fg: {
                    ...design.fg,
                    kind: "solid",
                    base: swatch.fg,
                    accent: swatch.fg,
                  },
                  bg: {
                    ...design.bg,
                    kind: "solid",
                    base: swatch.bg,
                    accent: swatch.bg,
                  },
                })
              }
              title={`${swatch.name} — contrast ${contrastRatio(swatch.fg, swatch.bg).toFixed(1)}:1`}
              aria-label={`Apply ${swatch.name}`}
            >
              <span style={{ background: swatch.bg }}>
                <span style={{ background: swatch.fg }} />
              </span>
              {swatch.name}
            </button>
          ))}
        </div>
      </DesignPanel>

      <DesignPanel
        id="pattern"
        active={tab === "pattern"}
        label="Module shape and fill"
      >
        <p className="qr-panel-note">
          Modules are drawn inside their own cell, so a pattern can soften a
          code without ever joining two modules together.
        </p>
        <QrChoice
          legend="Dot pattern"
          value={design.dotStyle}
          columns={5}
          onChange={(dotStyle) => patchDesign({ dotStyle })}
          options={DOT_STYLES.map((style) => ({
            id: style.id,
            label: style.label,
            hint: style.hint,
            preview: dotPreview(style.id),
          }))}
        />
        <QrRange
          id="qr-dot-scale"
          label="Module fill"
          value={Math.round(design.dotScale * 100)}
          min={55}
          max={100}
          suffix="%"
          onChange={(value) => patchDesign({ dotScale: value / 100 })}
        />
      </DesignPanel>

      <DesignPanel
        id="corners"
        active={tab === "corners"}
        label="Finder pattern and corner style"
      >
        <p className="qr-panel-note">
          The three finder patterns keep the 1:1:3:1:1 profile a decoder locks
          onto — only the outline changes here, never the ratios.
        </p>
        <QrChoice
          legend="Corner and eye style"
          value={design.eyeStyle}
          columns={5}
          onChange={(eyeStyle) => patchDesign({ eyeStyle })}
          options={EYE_STYLES.map((style) => ({
            id: style.id,
            label: style.label.replace(" eyes", ""),
            preview: eyePreview(style.id),
          }))}
        />
        <QrRange
          id="qr-corner"
          label="Corner roundness"
          value={Math.round(design.cornerRadius * 100)}
          min={0}
          max={50}
          suffix="%"
          onChange={(value) => patchDesign({ cornerRadius: value / 100 })}
        />
      </DesignPanel>

      <DesignPanel
        id="logo"
        active={tab === "logo"}
        label="Logo overlay, size and mask"
      >
        {!logo ? (
          <label
            className={`qr-dropzone ${dragOver ? "over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void attachLogo(event.dataTransfer.files?.[0]);
            }}
            htmlFor="qr-logo-file"
          >
            <ImagePlus size={20} aria-hidden="true" />
            <span>
              Drop a PNG, JPEG, WebP, GIF or BMP here
              <small>
                or choose a file — under 3 MB, square crops work best
              </small>
            </span>
            <input
              id="qr-logo-file"
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
              onChange={(event) => void attachLogo(event.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="qr-logo-body">
            <div className="qr-logo-head">
              <div className="qr-logo-meta">
                <strong>{logo.name}</strong>
                <small>
                  {logo.width}×{logo.height} px in memory ·{" "}
                  {Math.round(logo.bytes / 1024)} KB · {opacity}% opaque
                </small>
              </div>
              <button
                type="button"
                className="secondary qr-mini-button"
                onClick={removeLogo}
              >
                <X size={14} /> Remove
              </button>
            </div>
            <div className="qr-range-pair">
              <QrRange
                id="qr-logo-scale"
                label="Logo size"
                value={Math.round(design.logo.scale * 100)}
                min={8}
                max={30}
                suffix="%"
                onChange={(scale) =>
                  patchDesign({ logo: { ...design.logo, scale: scale / 100 } })
                }
              />
              <QrRange
                id="qr-logo-pad"
                label="Halo padding"
                value={Math.round(design.logo.padding * 10) / 10}
                min={0}
                max={3}
                step={0.1}
                suffix=" modules"
                onChange={(padding) =>
                  patchDesign({ logo: { ...design.logo, padding } })
                }
              />
              <QrRange
                id="qr-logo-x"
                label="Horizontal offset"
                value={Math.round(design.logo.offsetX * 100)}
                min={-34}
                max={34}
                suffix="%"
                onChange={(offsetX) =>
                  patchDesign({
                    logo: { ...design.logo, offsetX: offsetX / 100 },
                  })
                }
              />
              <QrRange
                id="qr-logo-y"
                label="Vertical offset"
                value={Math.round(design.logo.offsetY * 100)}
                min={-34}
                max={34}
                suffix="%"
                onChange={(offsetY) =>
                  patchDesign({
                    logo: { ...design.logo, offsetY: offsetY / 100 },
                  })
                }
              />
            </div>
            <QrChoice
              legend="Logo mask"
              value={design.logo.shape}
              columns={3}
              onChange={(shape) =>
                patchDesign({ logo: { ...design.logo, shape } })
              }
              options={[
                { id: "square", label: "Square" },
                { id: "rounded", label: "Rounded" },
                { id: "circle", label: "Circle" },
              ]}
            />
            <div className="qr-logo-toggles">
              <QrToggle
                id="qr-logo-halo"
                label="Field-coloured halo behind the logo"
                hint="Clears the modules underneath so the overlay cannot corrupt them."
                checked={design.logo.halo}
                onChange={(halo) =>
                  patchDesign({ logo: { ...design.logo, halo } })
                }
              />
              <p className="qr-logo-note">
                <Lock size={13} aria-hidden="true" /> Error correction is forced
                to Q or H while a logo is present — that redundancy is what the
                covered modules are rebuilt from.
              </p>
            </div>
            <button
              type="button"
              className="secondary qr-mini-button"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={14} /> Replace image
            </button>
          </div>
        )}
      </DesignPanel>

      <DesignPanel
        id="templates"
        active={tab === "templates"}
        label="Template gallery"
      >
        <TemplateGallery studio={studio} />
      </DesignPanel>
    </QrDisclosure>
  );
}
