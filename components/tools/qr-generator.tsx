"use client";
/* QR previews and user-selected logos are local data URLs, not remote images. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  ImagePlus,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wifi,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import {
  buildQrPayload,
  qrContrast,
  defaultQrFormValues,
  defaultQrOptions,
  MAX_BATCH_ITEMS,
  MAX_QR_BYTES,
  parseBatchQrInput,
  QR_CONTENT_TYPES,
  QR_MARGINS,
  QR_SIZES,
  qrByteLength,
  qrReadabilityGuidance,
  sanitizeQrFilename,
  validateQr,
  validateQrOptions,
  type QrContentType,
  type QrFormValues,
  type QrOptions,
} from "@/lib/tools/qr";
import { generateQrAssets, type GeneratedQr } from "@/lib/tools/qr-browser";
import { downloadBlob, downloadText } from "@/lib/tools/download";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

type LogoImage = { dataUrl: string; name: string };
type PreviewState = "idle" | "working" | "ready" | "error";
type BatchZip = { blob: Blob; count: number };

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url" | "email" | "tel" | "number" | "datetime-local";
  inputMode?: "decimal" | "email" | "numeric" | "tel" | "url";
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
};

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  required,
  min,
  max,
  step,
  maxLength,
}: TextFieldProps) {
  return (
    <div className="qr-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="qr-required"> · required</span> : null}
      </label>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="qr-field qr-field-wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="qr-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The selected image could not be read."));
    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadLogo(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Choose a valid PNG, JPG or WebP image."));
    image.src = source;
  });
}

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default function QrGenerator() {
  const ready = useHydrated();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [contentType, setContentType] = useState<QrContentType>("text");
  const [form, setForm] = useState<QrFormValues>(defaultQrFormValues);
  const [options, setOptions] = useState<QrOptions>(defaultQrOptions);
  const [filename, setFilename] = useState("quickkit-qr-code");
  const [batchInput, setBatchInput] = useState("");
  const [logo, setLogo] = useState<LogoImage | null>(null);
  const [preview, setPreview] = useState<GeneratedQr | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchZip, setBatchZip] = useState<BatchZip | null>(null);
  const [exportBusy, setExportBusy] = useState<"pdf" | "copy" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const renderToken = useRef(0);

  const payloadState = useMemo(() => {
    if (mode !== "single") return null;
    try {
      return { payload: buildQrPayload(contentType, form), error: "" };
    } catch (reason) {
      return {
        payload: "",
        error:
          reason instanceof Error
            ? reason.message
            : "Review the fields and try again.",
      };
    }
  }, [mode, contentType, form]);
  const payload = payloadState?.payload ?? "";
  const payloadBytes = payload ? qrByteLength(payload) : 0;
  const rawTextBytes = qrByteLength(form.text);
  const adjustedFilename = sanitizeQrFilename(filename);
  const contrastValue = useMemo(() => qrContrast(options), [options]);

  const renderPreview = useCallback(
    async (text: string) => {
      const token = ++renderToken.current;
      setPreviewState("working");
      setError("");
      setNote("");
      try {
        validateQrOptions(options);
        const result = await generateQrAssets(text, options, logo?.dataUrl);
        if (token !== renderToken.current) return;
        setPreview(result);
        setPreviewState("ready");
      } catch (reason) {
        if (token !== renderToken.current) return;
        setPreview(null);
        setPreviewState("error");
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to generate this QR code. Try shorter content.",
        );
      }
    },
    [options, logo],
  );

  useEffect(() => {
    if (!ready || mode !== "single" || !payload) {
      renderToken.current++;
      return;
    }
    const timeout = window.setTimeout(() => void renderPreview(payload), 320);
    return () => window.clearTimeout(timeout);
  }, [ready, mode, payload, renderPreview]);

  const updateForm = useCallback(
    <K extends keyof QrFormValues>(key: K, value: QrFormValues[K]) => {
      renderToken.current++;
      setForm((previous) => ({ ...previous, [key]: value }));
      setPreview(null);
      setPreviewState("idle");
      setError("");
      setNote("");
      setBatchZip(null);
    },
    [],
  );

  function changeOptions(next: QrOptions) {
    renderToken.current++;
    setOptions(next);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchZip(null);
  }

  function changeMode(next: "single" | "batch") {
    if (next === mode) return;
    renderToken.current++;
    setMode(next);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchZip(null);
  }

  function changeType(next: QrContentType) {
    setContentType(next);
    renderToken.current++;
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
  }

  function generateSingle() {
    if (!payload) {
      setError(payloadState?.error || "Enter content to generate a QR code.");
      return;
    }
    void renderPreview(payload);
  }

  async function chooseLogo(file?: File) {
    setError("");
    setNote("");
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG or WebP logo image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("Keep logo images under 2 MB so QR generation stays quick.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadLogo(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new Error(
          "Logo dimensions must be 4,096 × 4,096 pixels or smaller.",
        );
      }
      renderToken.current++;
      setLogo({ dataUrl, name: file.name });
      setPreview(null);
      setPreviewState("idle");
      setBatchZip(null);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Choose a valid PNG, JPG or WebP image.",
      );
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeLogo() {
    renderToken.current++;
    setLogo(null);
    setPreview(null);
    setPreviewState("idle");
    setBatchZip(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function generateBatch() {
    setError("");
    setNote("");
    setBatchZip(null);
    let items;
    try {
      validateQrOptions(options);
      items = parseBatchQrInput(batchInput);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Review the batch and try again.",
      );
      return;
    }

    setBatchBusy(true);
    setBatchProgress(0);
    const files: Record<string, Uint8Array> = {};
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        validateQr(item.content);
        const result = await generateQrAssets(
          item.content,
          options,
          logo?.dataUrl,
        );
        files[`${item.filename}.png`] = dataUrlBytes(result.pngDataUrl);
        setBatchProgress(index + 1);
      }
      const { zipSync } = await import("fflate");
      const zipped = zipSync(files, { level: 6 });
      const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
      setBatchZip({ blob, count: items.length });
      setNote(
        `${items.length} QR codes generated and scan-checked locally. Your ZIP is ready to download.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The batch could not be generated. Reduce its size and try again.",
      );
    } finally {
      setBatchBusy(false);
    }
  }

  async function downloadPdf() {
    if (!preview) return;
    setExportBusy("pdf");
    setError("");
    setNote("");
    try {
      const { PDFDocument } = await import("@cantoo/pdf-lib");
      const document = await PDFDocument.create({ updateMetadata: false });
      const page = document.addPage([595.28, 841.89]);
      const qrImage = await document.embedPng(dataUrlBytes(preview.pngDataUrl));
      const imageSize = 430;
      page.drawImage(qrImage, {
        x: (595.28 - imageSize) / 2,
        y: (841.89 - imageSize) / 2,
        width: imageSize,
        height: imageSize,
      });
      const bytes = await document.save();
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        `${adjustedFilename}.pdf`,
      );
      setNote("Print-ready PDF created on your device.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `PDF export failed: ${reason.message}`
          : "PDF export failed. Download the PNG instead.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function copyPng() {
    if (!preview) return;
    setExportBusy("copy");
    setError("");
    setNote("");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined")
        throw new Error("Image copy is not available in this browser.");
      const blob = new Blob([dataUrlBytes(preview.pngDataUrl)], {
        type: "image/png",
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setNote("QR image copied — paste it anywhere.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `${reason.message} Use Download PNG instead.`
          : "Image copy is not available here. Use Download PNG instead.",
      );
    } finally {
      setExportBusy(null);
    }
  }

  function resetAll() {
    renderToken.current++;
    setMode("single");
    setContentType("text");
    setForm(defaultQrFormValues);
    setOptions(defaultQrOptions);
    setFilename("quickkit-qr-code");
    setBatchInput("");
    setLogo(null);
    setPreview(null);
    setPreviewState("idle");
    setError("");
    setNote("");
    setBatchBusy(false);
    setBatchProgress(0);
    setBatchZip(null);
    setExportBusy(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const title =
    QR_CONTENT_TYPES.find((item) => item.value === contentType)?.label ??
    "QR code";
  const readability = preview
    ? qrReadabilityGuidance({
        contrast: contrastValue,
        modulePixels: preview.modulePixels,
        quietZone: options.margin,
        errorLevel: options.errorLevel,
        hasLogo: Boolean(logo),
        decodeVerified: preview.decodeVerified,
      })
    : "A local decoder checks each preview against its original content.";

  return (
    <fieldset
      className="workspace qr-workspace"
      disabled={!ready}
      aria-label="QR code generator workspace"
    >
      <WorkspaceHeading
        title="Make a QR code that feels like yours"
        description="Create, customize and check scannable codes — all processing stays right here on your device."
      />

      <div className="qr-mode-tabs" role="tablist" aria-label="Generation mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "qr-mode-tab active" : "qr-mode-tab"}
          onClick={() => changeMode("single")}
        >
          <QrCode size={16} /> Single QR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "batch"}
          className={mode === "batch" ? "qr-mode-tab active" : "qr-mode-tab"}
          onClick={() => changeMode("batch")}
        >
          <FileArchive size={16} /> Batch ZIP
        </button>
        <span className="qr-local-note">
          <ShieldCheck size={15} /> No uploads
        </span>
      </div>

      {mode === "single" ? (
        <div className="qr-content-picker">
          <div className="qr-picker-heading">
            <div>
              <span className="eyebrow">START WITH A PURPOSE</span>
              <h3>What should this QR code do?</h3>
            </div>
            <span className="qr-private-pill">
              <ShieldCheck size={13} /> Private by design
            </span>
          </div>
          <div
            className="qr-type-grid"
            role="group"
            aria-label="QR content type"
          >
            {QR_CONTENT_TYPES.map((item) => {
              const active = contentType === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={active}
                  className={active ? "qr-type-card active" : "qr-type-card"}
                  onClick={() => changeType(item.value)}
                >
                  <span className="qr-type-icon">
                    {item.value === "wifi" ? (
                      <Wifi size={16} />
                    ) : (
                      <QrCode size={16} />
                    )}
                  </span>
                  <span className="qr-type-copy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {active ? (
                    <Check size={15} className="qr-type-check" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="qr-builder-grid">
            <section className="qr-editor" aria-label={`${title} QR details`}>
              <div className="qr-editor-heading">
                <div>
                  <span className="eyebrow">YOUR CONTENT</span>
                  <h3>{title} details</h3>
                </div>
                <span
                  className={
                    payloadBytes > MAX_QR_BYTES * 0.9
                      ? "char-meter near-limit"
                      : "char-meter"
                  }
                >
                  {payloadBytes.toLocaleString()} /{" "}
                  {MAX_QR_BYTES.toLocaleString()} bytes
                </span>
              </div>
              {contentType === "text" ? (
                <div className="qr-field">
                  <label htmlFor="qr-input">Text or URL</label>
                  <textarea
                    id="qr-input"
                    value={form.text}
                    onChange={(event) => updateForm("text", event.target.value)}
                    rows={4}
                    maxLength={MAX_QR_BYTES}
                    placeholder="https://example.com or a little text to share…"
                    aria-describedby="qr-help"
                  />
                  <p id="qr-help" className="help">
                    {rawTextBytes.toLocaleString()} UTF-8 bytes. Links are
                    encoded as text and never opened or fetched.
                  </p>
                </div>
              ) : null}
              {contentType === "url" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="qr-url"
                    label="Website URL"
                    value={form.url}
                    type="url"
                    placeholder="https://example.com"
                    onChange={(value) => updateForm("url", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    A website scheme is added if you omit it. Only http and
                    https links are accepted.
                  </p>
                </div>
              ) : null}
              {contentType === "wifi" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="wifi-ssid"
                    label="Network name (SSID)"
                    value={form.wifiSsid}
                    placeholder="e.g. Studio Wi-Fi"
                    onChange={(value) => updateForm("wifiSsid", value)}
                    required
                    maxLength={128}
                  />
                  <SelectField
                    id="wifi-security"
                    label="Security"
                    value={form.wifiSecurity}
                    onChange={(value) =>
                      updateForm(
                        "wifiSecurity",
                        value as QrFormValues["wifiSecurity"],
                      )
                    }
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Open network · no password</option>
                  </SelectField>
                  {form.wifiSecurity !== "nopass" ? (
                    <TextField
                      id="wifi-password"
                      label="Network password"
                      value={form.wifiPassword}
                      onChange={(value) => updateForm("wifiPassword", value)}
                      required
                      maxLength={128}
                    />
                  ) : null}
                  <label className="check-label qr-field-wide">
                    <input
                      type="checkbox"
                      checked={form.wifiHidden}
                      onChange={(event) =>
                        updateForm("wifiHidden", event.target.checked)
                      }
                    />
                    Hidden network
                  </label>
                  <p className="help qr-field-wide">
                    Wi-Fi credentials are encoded only into this QR image and
                    are never saved or uploaded.
                  </p>
                </div>
              ) : null}
              {contentType === "phone" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="phone-number"
                    label="Phone number"
                    value={form.phone}
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    onChange={(value) => updateForm("phone", value)}
                    required
                  />
                  <p className="help qr-field-wide">
                    Use an international country code where possible. QUICKKIT
                    does not verify phone numbers.
                  </p>
                </div>
              ) : null}
              {contentType === "email" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="email-address"
                    label="To"
                    value={form.emailAddress}
                    type="email"
                    inputMode="email"
                    placeholder="hello@example.com"
                    onChange={(value) => updateForm("emailAddress", value)}
                    required
                  />
                  <TextField
                    id="email-subject"
                    label="Subject (optional)"
                    value={form.emailSubject}
                    onChange={(value) => updateForm("emailSubject", value)}
                  />
                  <TextAreaField
                    id="email-body"
                    label="Message (optional)"
                    value={form.emailBody}
                    onChange={(value) => updateForm("emailBody", value)}
                  />
                </div>
              ) : null}
              {contentType === "sms" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="sms-number"
                    label="Phone number"
                    value={form.smsNumber}
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 123 4567"
                    onChange={(value) => updateForm("smsNumber", value)}
                    required
                  />
                  <TextAreaField
                    id="sms-message"
                    label="Prefilled message (optional)"
                    value={form.smsMessage}
                    onChange={(value) => updateForm("smsMessage", value)}
                  />
                </div>
              ) : null}
              {contentType === "vcard" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="contact-first-name"
                    label="First name"
                    value={form.firstName}
                    onChange={(value) => updateForm("firstName", value)}
                  />
                  <TextField
                    id="contact-last-name"
                    label="Last name"
                    value={form.lastName}
                    onChange={(value) => updateForm("lastName", value)}
                  />
                  <TextField
                    id="contact-organization"
                    label="Organization"
                    value={form.contactOrganization}
                    onChange={(value) =>
                      updateForm("contactOrganization", value)
                    }
                  />
                  <TextField
                    id="contact-title"
                    label="Job title"
                    value={form.contactTitle}
                    onChange={(value) => updateForm("contactTitle", value)}
                  />
                  <TextField
                    id="contact-phone"
                    label="Phone (optional)"
                    value={form.contactPhone}
                    type="tel"
                    onChange={(value) => updateForm("contactPhone", value)}
                  />
                  <TextField
                    id="contact-email"
                    label="Email (optional)"
                    value={form.contactEmail}
                    type="email"
                    onChange={(value) => updateForm("contactEmail", value)}
                  />
                  <TextField
                    id="contact-website"
                    label="Website (optional)"
                    value={form.contactWebsite}
                    type="url"
                    onChange={(value) => updateForm("contactWebsite", value)}
                  />
                  <TextField
                    id="contact-street"
                    label="Street (optional)"
                    value={form.contactStreet}
                    onChange={(value) => updateForm("contactStreet", value)}
                  />
                  <TextField
                    id="contact-city"
                    label="City (optional)"
                    value={form.contactCity}
                    onChange={(value) => updateForm("contactCity", value)}
                  />
                  <TextField
                    id="contact-region"
                    label="State / region (optional)"
                    value={form.contactRegion}
                    onChange={(value) => updateForm("contactRegion", value)}
                  />
                  <TextField
                    id="contact-postal"
                    label="Postal code (optional)"
                    value={form.contactPostalCode}
                    onChange={(value) => updateForm("contactPostalCode", value)}
                  />
                  <TextField
                    id="contact-country"
                    label="Country (optional)"
                    value={form.contactCountry}
                    onChange={(value) => updateForm("contactCountry", value)}
                  />
                  <p className="help qr-field-wide">
                    A vCard 3.0 contact is generated for common phone and
                    contacts apps.
                  </p>
                </div>
              ) : null}
              {contentType === "whatsapp" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="whatsapp-number"
                    label="WhatsApp phone number"
                    value={form.whatsappNumber}
                    type="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    onChange={(value) => updateForm("whatsappNumber", value)}
                    required
                  />
                  <TextAreaField
                    id="whatsapp-message"
                    label="Prefilled message (optional)"
                    value={form.whatsappMessage}
                    onChange={(value) => updateForm("whatsappMessage", value)}
                  />
                  <p className="help qr-field-wide">
                    Include the country code. The destination opens in WhatsApp
                    when scanned.
                  </p>
                </div>
              ) : null}
              {contentType === "location" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="location-latitude"
                    label="Latitude"
                    value={form.latitude}
                    type="number"
                    inputMode="decimal"
                    min="-90"
                    max="90"
                    step="any"
                    placeholder="23.0225"
                    onChange={(value) => updateForm("latitude", value)}
                    required
                  />
                  <TextField
                    id="location-longitude"
                    label="Longitude"
                    value={form.longitude}
                    type="number"
                    inputMode="decimal"
                    min="-180"
                    max="180"
                    step="any"
                    placeholder="72.5714"
                    onChange={(value) => updateForm("longitude", value)}
                    required
                  />
                  <TextField
                    id="location-label"
                    label="Place name (optional)"
                    value={form.locationLabel}
                    placeholder="Ahmedabad"
                    onChange={(value) => updateForm("locationLabel", value)}
                  />
                  <p className="help qr-field-wide">
                    Coordinates are checked against the valid latitude and
                    longitude ranges.
                  </p>
                </div>
              ) : null}
              {contentType === "event" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="event-title"
                    label="Event name"
                    value={form.eventTitle}
                    onChange={(value) => updateForm("eventTitle", value)}
                    required
                    maxLength={200}
                  />
                  <TextField
                    id="event-start"
                    label="Starts"
                    value={form.eventStart}
                    type="datetime-local"
                    onChange={(value) => updateForm("eventStart", value)}
                    required
                  />
                  <TextField
                    id="event-end"
                    label="Ends"
                    value={form.eventEnd}
                    type="datetime-local"
                    onChange={(value) => updateForm("eventEnd", value)}
                    required
                  />
                  <TextField
                    id="event-location"
                    label="Location (optional)"
                    value={form.eventLocation}
                    onChange={(value) => updateForm("eventLocation", value)}
                  />
                  <TextAreaField
                    id="event-description"
                    label="Description (optional)"
                    value={form.eventDescription}
                    onChange={(value) => updateForm("eventDescription", value)}
                  />
                  <p className="help qr-field-wide">
                    Calendar times are converted to UTC using your device’s
                    current time zone.
                  </p>
                </div>
              ) : null}
              {contentType === "upi" ? (
                <div className="qr-form-grid">
                  <TextField
                    id="upi-id"
                    label="UPI ID (VPA)"
                    value={form.upiId}
                    placeholder="name@bank"
                    onChange={(value) => updateForm("upiId", value)}
                    required
                  />
                  <TextField
                    id="upi-name"
                    label="Payee name (optional)"
                    value={form.upiName}
                    onChange={(value) => updateForm("upiName", value)}
                  />
                  <TextField
                    id="upi-amount"
                    label="Amount in INR (optional)"
                    value={form.upiAmount}
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="100000000"
                    step="0.01"
                    placeholder="250.00"
                    onChange={(value) => updateForm("upiAmount", value)}
                  />
                  <TextField
                    id="upi-note"
                    label="Payment note (optional)"
                    value={form.upiNote}
                    onChange={(value) => updateForm("upiNote", value)}
                  />
                  <p className="help qr-field-wide">
                    Creates a UPI payment intent (INR). It does not process or
                    verify a payment. Only scan payment codes from trusted
                    sources.
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="status error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="action-row qr-generate-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={generateSingle}
                  disabled={previewState === "working"}
                >
                  {previewState === "working" ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {previewState === "working"
                    ? "Generating…"
                    : "Generate QR code"}
                </button>
                <button type="button" className="secondary" onClick={resetAll}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            </section>

            <aside
              className="qr-preview-column"
              aria-label="QR code live preview"
            >
              <div className="qr-preview-card">
                <div className="qr-preview-topline">
                  <div>
                    <span className="eyebrow">LIVE PREVIEW</span>
                    <h3>Your QR code</h3>
                  </div>
                  {preview?.decodeVerified ? (
                    <span className="qr-verified-pill">
                      <CheckCircle2 size={14} /> Scan checked
                    </span>
                  ) : null}
                </div>
                <div
                  className={
                    preview ? "qr-image-stage has-image" : "qr-image-stage"
                  }
                >
                  {preview ? (
                    <img
                      src={preview.pngDataUrl}
                      width={options.size}
                      height={options.size}
                      alt="Generated QR code preview"
                      style={{ backgroundColor: options.background }}
                    />
                  ) : (
                    <EmptyState
                      icon={
                        previewState === "working" ? (
                          <LoaderCircle size={34} className="spin" />
                        ) : (
                          <QrCode size={36} />
                        )
                      }
                    >
                      {previewState === "working"
                        ? "Building and scan-checking your QR code…"
                        : "Your finished code will appear here as you edit."}
                    </EmptyState>
                  )}
                </div>
                {preview ? (
                  <>
                    <div
                      className={
                        preview.decodeVerified
                          ? "qr-scan-check passed"
                          : "qr-scan-check warning"
                      }
                      role="status"
                    >
                      {preview.decodeVerified ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>
                        {preview.decodeVerified
                          ? "Local scan test passed — the code decodes to your exact content."
                          : "The local decoder could not confirm this design. Adjust logo, contrast or content before sharing."}
                      </span>
                    </div>
                    <p className="qr-readability-help">{readability}</p>
                    <div className="qr-preview-stats">
                      <span>
                        <strong>{options.size}px</strong> output
                      </span>
                      <span>
                        <strong>{preview.modulePixels.toFixed(1)}px</strong> per
                        module
                      </span>
                      <span>
                        <strong>{options.errorLevel}</strong> correction
                      </span>
                    </div>
                    <div className="qr-download-grid">
                      <a
                        href={preview.pngDataUrl}
                        download={`${adjustedFilename}.png`}
                        className="primary"
                      >
                        <Download size={15} /> Download PNG
                      </a>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          downloadText(
                            preview.svg,
                            `${adjustedFilename}.svg`,
                            "image/svg+xml;charset=utf-8",
                          )
                        }
                      >
                        <FileCode2 size={15} /> Download SVG
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void downloadPdf()}
                        disabled={exportBusy === "pdf"}
                      >
                        {exportBusy === "pdf" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <FileText size={15} />
                        )}{" "}
                        Download PDF
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void copyPng()}
                        disabled={exportBusy === "copy"}
                      >
                        {exportBusy === "copy" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <Copy size={15} />
                        )}{" "}
                        Copy image
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="qr-batch-workspace">
          <div className="qr-batch-intro">
            <span className="eyebrow">MANY CODES, ONE DOWNLOAD</span>
            <h3>Generate a batch of QR codes</h3>
            <p>
              Enter one text or URL per line. Optionally add a custom filename
              using <code>filename | content</code>. Every image uses your
              current size, colors, correction level and logo.
            </p>
          </div>
          <label htmlFor="qr-batch-input">
            Batch items · up to {MAX_BATCH_ITEMS}
          </label>
          <textarea
            id="qr-batch-input"
            value={batchInput}
            onChange={(event) => {
              setBatchInput(event.target.value);
              setBatchZip(null);
              setError("");
              setNote("");
            }}
            rows={9}
            placeholder={
              "menu | https://example.com/menu\ninstagram | https://instagram.com/yourbrand\nA short note to share"
            }
          />
          <p className="help">
            {batchInput.split(/\r?\n/).filter((line) => line.trim()).length}{" "}
            items · each item is validated and decoded in your browser before it
            goes into the ZIP.
          </p>
          {error ? (
            <p className="status error" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="status success" role="status">
              {note}
            </p>
          ) : null}
          <div className="qr-batch-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void generateBatch()}
              disabled={batchBusy}
            >
              {batchBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <FileArchive size={16} />
              )}
              {batchBusy
                ? `Generating ${batchProgress}…`
                : "Generate batch ZIP"}
            </button>
            {batchZip ? (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  downloadBlob(batchZip.blob, `${adjustedFilename}-batch.zip`)
                }
              >
                <Download size={16} /> Download ZIP ({batchZip.count})
              </button>
            ) : null}
            {batchBusy ? (
              <span className="qr-progress" role="status">
                {batchProgress} /{" "}
                {batchInput.split(/\r?\n/).filter((line) => line.trim()).length}{" "}
                codes scan-checked
              </span>
            ) : null}
          </div>
        </div>
      )}

      <details className="qr-settings-panel" open>
        <summary>
          <Sparkles size={15} /> Design, logo & export settings
        </summary>
        <div className="qr-settings-layout">
          <div className="qr-form-grid qr-setting-controls">
            <SelectField
              id="qr-size"
              label="PNG size"
              value={String(options.size)}
              onChange={(value) =>
                changeOptions({ ...options, size: Number(value) })
              }
            >
              {QR_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} × {size} px
                </option>
              ))}
            </SelectField>
            <SelectField
              id="qr-margin"
              label="Quiet-zone margin"
              value={String(options.margin)}
              onChange={(value) =>
                changeOptions({ ...options, margin: Number(value) })
              }
            >
              {QR_MARGINS.map((margin) => (
                <option key={margin} value={margin}>
                  {margin} modules
                </option>
              ))}
            </SelectField>
            <SelectField
              id="qr-level"
              label="Error correction"
              value={options.errorLevel}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  errorLevel: value as QrOptions["errorLevel"],
                })
              }
            >
              <option value="L">Low · smallest code</option>
              <option value="M">Medium · recommended</option>
              <option value="Q">Quartile · more recovery</option>
              <option value="H">High · logo-friendly</option>
            </SelectField>
            <SelectField
              id="qr-fill-style"
              label="Code fill style"
              value={options.fillStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  fillStyle: value as QrOptions["fillStyle"],
                })
              }
            >
              <option value="solid">Solid color</option>
              <option value="gradient">Diagonal gradient</option>
            </SelectField>
            <SelectField
              id="qr-dot-style"
              label="Dot style"
              value={options.dotStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  dotStyle: value as QrOptions["dotStyle"],
                })
              }
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="dots">Dots</option>
            </SelectField>
            <SelectField
              id="qr-corner-style"
              label="Finder corner style"
              value={options.cornerStyle}
              onChange={(value) =>
                changeOptions({
                  ...options,
                  cornerStyle: value as QrOptions["cornerStyle"],
                })
              }
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
            </SelectField>
            <div className="qr-field">
              <label htmlFor="qr-filename">Download filename</label>
              <input
                id="qr-filename"
                type="text"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="quickkit-qr-code"
                maxLength={100}
              />
              <small className="help">
                Saved safely as {adjustedFilename}.*
              </small>
            </div>
            <div className="qr-field">
              <label htmlFor="qr-fg">Code color</label>
              <div className="color-field">
                <input
                  id="qr-fg"
                  aria-label="Code color"
                  type="color"
                  value={options.foreground}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      foreground: event.target.value,
                    })
                  }
                />
                <code>{options.foreground}</code>
              </div>
              {options.fillStyle === "gradient" ? (
                <small className="help">Gradient start color</small>
              ) : null}
            </div>
            {options.fillStyle === "gradient" ? (
              <div className="qr-field">
                <label htmlFor="qr-gradient-end">Gradient end color</label>
                <div className="color-field">
                  <input
                    id="qr-gradient-end"
                    aria-label="Gradient end color"
                    type="color"
                    value={options.gradientEnd}
                    onChange={(event) =>
                      changeOptions({
                        ...options,
                        gradientEnd: event.target.value,
                      })
                    }
                  />
                  <code>{options.gradientEnd}</code>
                </div>
              </div>
            ) : null}
            <div className="qr-field">
              <label htmlFor="qr-bg">Background</label>
              <div className="color-field">
                <input
                  id="qr-bg"
                  aria-label="Background"
                  type="color"
                  value={options.background}
                  onChange={(event) =>
                    changeOptions({
                      ...options,
                      background: event.target.value,
                    })
                  }
                />
                <code>{options.background}</code>
              </div>
            </div>
            <p
              className={
                contrastValue < 3
                  ? "help qr-contrast low qr-field-wide"
                  : "help qr-contrast qr-field-wide"
              }
              role="status"
            >
              <ShieldCheck size={15} /> Color contrast
              {options.fillStyle === "gradient" ? " (minimum stop)" : ""}{" "}
              {contrastValue.toFixed(1)}:1{" "}
              {contrastValue < 3
                ? "— too low to generate reliably."
                : contrastValue < 4.5
                  ? "— scannable; darker-on-lighter colors work best."
                  : "— strong dark-on-light contrast."}
            </p>
          </div>

          <div className="qr-logo-controls">
            <div className="qr-logo-heading">
              <span className="qr-logo-icon">
                <ImagePlus size={17} />
              </span>
              <div>
                <strong>Add your logo</strong>
                <small>
                  Stays on this device · PNG, JPG or WebP · max 2 MB
                </small>
              </div>
            </div>
            <label className="qr-upload-button" htmlFor="qr-logo-input">
              <Upload size={15} />{" "}
              {logo ? "Replace image" : "Choose logo image"}
            </label>
            <input
              ref={fileInput}
              id="qr-logo-input"
              aria-label="Center logo or image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void chooseLogo(event.target.files?.[0])}
            />
            {logo ? (
              <div className="qr-logo-selected">
                <img src={logo.dataUrl} alt="Selected logo" />
                <span title={logo.name}>{logo.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remove logo"
                  onClick={removeLogo}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : null}
            <label htmlFor="qr-logo-scale" className="qr-range-label">
              <span>Logo size</span>
              <strong>{Math.round(options.logoScale * 100)}%</strong>
            </label>
            <input
              id="qr-logo-scale"
              aria-label="Logo size"
              type="range"
              min="12"
              max="22"
              step="1"
              value={Math.round(options.logoScale * 100)}
              onChange={(event) =>
                changeOptions({
                  ...options,
                  logoScale: Number(event.target.value) / 100,
                })
              }
              disabled={!logo}
            />
            <p className="help">
              Keep logos small and use error correction H. The generator runs a
              real local scan check on each design.
            </p>
          </div>
        </div>
      </details>

      {mode === "batch" ? (
        <details className="qr-settings-panel qr-batch-settings">
          <summary>
            <Sparkles size={15} /> Batch design settings
          </summary>
          <p className="help">
            Size, quiet zone, error correction, colors, logo and download
            filename are shared with single-code settings above.
          </p>
        </details>
      ) : null}

      {note && mode === "single" ? (
        <p className="status success qr-bottom-status" role="status">
          {note}
        </p>
      ) : null}
      {mode === "batch" ? (
        <div className="qr-batch-limits">
          <FileImage size={15} /> Each QR is PNG inside one ZIP. Batches contain
          up to {MAX_BATCH_ITEMS} items and run entirely in your browser.
        </div>
      ) : null}
    </fieldset>
  );
}
