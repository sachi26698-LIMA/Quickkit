"use client";
/** Small UI atoms shared by the QR workspace panels. */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  contentTypeDef,
  type QrField,
  type QrValues,
} from "@/lib/tools/qr/payload";
import type { QrContentTypeId } from "@/lib/tools/qr/types";

/**
 * Draws a rasterised bitmap into a canvas. Used by the live preview, the
 * thumbnails and the mobile bar, so every surface shows the same pixels.
 */
export function QrCanvas({
  bitmap,
  size,
  label,
  transparent,
}: {
  bitmap: { width: number; rgba: Uint8ClampedArray } | null;
  size: number;
  label: string;
  transparent: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frame = ctx.createImageData(bitmap.width, bitmap.width);
    frame.data.set(bitmap.rgba);
    ctx.putImageData(frame, 0, 0);
  }, [bitmap]);
  // The backing store is always the bitmap's own size: `size` only asks for
  // that much room, and CSS scales the frame up or down. Drawing a 320 px
  // render into a 44 px canvas would otherwise show its top-left corner.
  const edge = bitmap?.width ?? size;
  return (
    <div
      className={transparent ? "qr-canvas-wrap transparent" : "qr-canvas-wrap"}
      style={{ width: size, maxWidth: "100%" }}
    >
      <canvas
        ref={ref}
        width={edge}
        height={edge}
        style={{ width: "100%", aspectRatio: "1 / 1" }}
        role="img"
        aria-label={label}
      />
    </div>
  );
}

export function QrSection({
  title,
  hint,
  icon,
  action,
  children,
  id,
}: {
  title: string;
  hint?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      className="qr-card"
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="qr-card-head">
        <span className="qr-card-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 id={id ? `${id}-title` : undefined}>{title}</h3>
          {hint ? <p>{hint}</p> : null}
        </div>
        {action ? <div className="qr-card-action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * A section or sub-group whose body folds away. Used wherever a panel should
 * be reachable without being loud: `level="section"` is a card of its own,
 * `level="sub"` is one fold inside a card. The head is the label, never a
 * heading — an open `<details>` reads as a plain group to assistive tech.
 */
export function QrDisclosure({
  title,
  hint,
  icon,
  action,
  id,
  defaultOpen = false,
  level = "section",
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
  id?: string;
  defaultOpen?: boolean;
  level?: "section" | "sub";
  children: ReactNode;
}) {
  // The summary's accessible name is the label alone: the hint stays readable
  // as text inside the region instead of being folded into the name.
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  const chevron = (
    <ChevronDown
      size={level === "sub" ? 14 : 15}
      className="qr-chev"
      aria-hidden="true"
    />
  );
  // A head action must be non-interactive: a focusable control inside
  // <summary> is a WCAG 2.2 "nested interactive" failure, and `preventDefault`
  // stops a click on a pill from toggling the fold. Cards that genuinely need a
  // button (Design's "Reset") place it at the top of the body instead — which
  // also keeps <details> on its default layout, where a closed fold really does
  // hide its body.
  return (
    <details
      className={level === "sub" ? "qr-sub" : "qr-card qr-acc"}
      id={id}
      aria-labelledby={titleId}
      open={defaultOpen || undefined}
    >
      <summary
        className={level === "sub" ? "qr-sub-head" : "qr-acc-head"}
        aria-labelledby={titleId}
      >
        {icon ? (
          <span
            className={level === "sub" ? "qr-sub-icon" : "qr-card-icon"}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        {level === "sub" ? (
          <strong className="qr-sub-title" id={titleId}>
            {title}
          </strong>
        ) : (
          <span className="qr-acc-titles">
            <strong id={titleId}>{title}</strong>
            {hint ? <span className="qr-acc-hint">{hint}</span> : null}
          </span>
        )}
        {level === "sub" && hint ? (
          <span className="qr-sub-hint">{hint}</span>
        ) : null}
        {action ? (
          <span
            className={level === "sub" ? "qr-sub-actions" : "qr-acc-actions"}
            onClick={(event) => event.preventDefault()}
          >
            {action}
          </span>
        ) : null}
        {chevron}
      </summary>
      <div className={level === "sub" ? "qr-sub-body" : "qr-acc-body"}>
        {children}
      </div>
    </details>
  );
}

export function QrRange({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="qr-range">
      <label htmlFor={id}>
        {label}
        <output htmlFor={id}>
          {format ? format(value) : `${value}${suffix}`}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function QrToggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check-label qr-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

export function QrColorInput({
  id,
  label,
  value,
  onChange,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Keep the accessible name but drop the visible caption — used where the
   * group already says which colour this is (e.g. "Modules (foreground)").
   */
  hideLabel?: boolean;
}) {
  return (
    <div className="color-field qr-color">
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </label>
      <div className="qr-color-row">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          value={value}
          aria-label={`${label} hex value`}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$/i.test(next))
              onChange(next.startsWith("#") ? next : `#${next}`);
            else onChange(next);
          }}
        />
      </div>
    </div>
  );
}

export function QrChoice<T extends string>({
  legend,
  value,
  options,
  onChange,
  columns = 3,
}: {
  legend: string;
  value: T;
  options: { id: T; label: string; hint?: string; preview?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className="qr-choice" role="group" aria-label={legend}>
      <span className="field-label">{legend}</span>
      <div
        className="qr-choice-grid"
        style={{ "--qr-choice-columns": columns } as React.CSSProperties}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              option.id === value ? "qr-choice-item active" : "qr-choice-item"
            }
            aria-pressed={option.id === value}
            onClick={() => onChange(option.id)}
            title={option.hint}
          >
            {option.preview ? (
              <span className="qr-choice-preview" aria-hidden="true">
                {option.preview}
              </span>
            ) : null}
            <strong>{option.label}</strong>
            {option.hint ? <small>{option.hint}</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

const INPUT_TYPES = new Set([
  "text",
  "url",
  "email",
  "tel",
  "number",
  "date",
  "time",
  "datetime-local",
  "password",
]);

export function QrFieldInput({
  typeId,
  field,
  value,
  error,
  onChange,
}: {
  typeId: QrContentTypeId;
  field: QrField;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const id = `qr-field-${typeId}-${field.key}`;
  const describedBy = `${id}-help`;
  const text = typeof value === "string" ? value : "";

  if (field.type === "checkbox") {
    return (
      <QrToggle
        id={id}
        label={field.label}
        hint={field.help}
        checked={value === true}
        onChange={onChange}
      />
    );
  }

  return (
    <div className={field.half ? "qr-field half" : "qr-field"}>
      <label htmlFor={id}>
        {field.label}
        {field.required ? <span className="qr-required"> required</span> : null}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          maxLength={field.max}
          placeholder={field.placeholder}
          aria-describedby={field.help ? describedBy : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          value={text}
          aria-describedby={field.help ? describedBy : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={INPUT_TYPES.has(field.type) ? field.type : "text"}
          value={text}
          maxLength={field.max}
          placeholder={field.placeholder}
          inputMode={
            field.type === "number"
              ? "decimal"
              : field.type === "tel"
                ? "tel"
                : undefined
          }
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={field.help ? describedBy : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help ? (
        <p className="help" id={describedBy}>
          {field.help}
        </p>
      ) : null}
      {error ? (
        <p className="qr-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** All fields of the active content type, laid out in a responsive grid. */
export function QrFieldGrid({
  typeId,
  values,
  error,
  onChange,
}: {
  typeId: QrContentTypeId;
  values: QrValues;
  error: { message: string; field?: string } | null;
  onChange: (key: string, value: string | boolean) => void;
}) {
  const def = contentTypeDef(typeId);
  return (
    <div className="qr-fields">
      {def.fields.map((field) => (
        <QrFieldInput
          key={field.key}
          typeId={typeId}
          field={field}
          value={values[field.key] ?? (field.type === "checkbox" ? false : "")}
          error={error?.field === field.key ? error.message : undefined}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}
