"use client";
/**
 * CONTENT — what the code does, and the fields that describe it.
 *
 * One folded card: a compact type picker, the validated fields for that type,
 * a sample when there is nothing to encode yet, and the exact encoded string
 * behind a disclosure so the card never grows to half a page.
 */
import { useState } from "react";
import {
  AppWindow,
  Bookmark,
  Briefcase,
  Calendar,
  CalendarCheck,
  Camera,
  ChevronDown,
  Contact,
  FileText,
  Images,
  LayoutTemplate,
  Link,
  Mail,
  MapPin,
  MessageSquare,
  MonitorPlay,
  Music,
  Phone,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Type,
  Users,
  Video,
  Wifi,
} from "lucide-react";
import { MAX_QR_PAYLOAD_BYTES, utf8Length } from "@/lib/tools/qr/capacity";
import { QR_CONTENT_TYPES, redactForDisplay } from "@/lib/tools/qr/payload";
import type { QrContentTypeId } from "@/lib/tools/qr/types";
import { QrDisclosure, QrFieldGrid } from "./shared";
import type { QrStudio } from "./use-qr-studio";

const ICONS: Record<string, typeof QrCode> = {
  link: Link,
  text: Type,
  mail: Mail,
  phone: Phone,
  message: MessageSquare,
  whatsapp: MessageSquare,
  wifi: Wifi,
  contact: Contact,
  "map-pin": MapPin,
  calendar: Calendar,
  share: Share2,
  app: AppWindow,
  bookmark: Bookmark,
  instagram: Camera,
  facebook: Users,
  youtube: MonitorPlay,
  music: Music,
  star: Star,
  briefcase: Briefcase,
  "shopping-bag": ShoppingBag,
  "calendar-check": CalendarCheck,
  ticket: Ticket,
  "file-text": FileText,
  images: Images,
  video: Video,
  layout: LayoutTemplate,
};

export default function ContentPanel({ studio }: { studio: QrStudio }) {
  const [showPayload, setShowPayload] = useState(false);
  const {
    typeId,
    def,
    values,
    payloadResult,
    formError,
    hasContent,
    switchType,
    loadSample,
  } = studio;
  const TypeIcon = ICONS[def.icon] ?? QrCode;
  const bytes = payloadResult.ok
    ? payloadResult.bytes
    : utf8Length(String(values.text ?? values.url ?? ""));
  const nearLimit = bytes > MAX_QR_PAYLOAD_BYTES * 0.8;

  return (
    <QrDisclosure
      id="qr-content"
      title="Content"
      hint="Pick what the code should do, then fill its fields. Each type builds a standard payload and validates it here — nothing is sent anywhere."
      icon={<QrCode size={17} />}
      defaultOpen
      action={
        <span
          className={nearLimit ? "char-meter near-limit" : "char-meter"}
          title={`The symbol holds up to ${MAX_QR_PAYLOAD_BYTES.toLocaleString()} UTF-8 bytes`}
        >
          {bytes.toLocaleString()} / {MAX_QR_PAYLOAD_BYTES.toLocaleString()}
        </span>
      }
    >
      <span className="qr-block-label" id="qr-content-type-label">
        Code type
      </span>
      <div
        className="qr-type-picker"
        role="group"
        aria-labelledby="qr-content-type-label"
      >
        <span className="qr-type-picker-icon" aria-hidden="true">
          <TypeIcon size={16} />
        </span>
        <label className="sr-only" htmlFor="qr-type-select">
          QR content type
        </label>
        <select
          id="qr-type-select"
          className="qr-type-select"
          value={typeId}
          onChange={(event) =>
            switchType(event.target.value as QrContentTypeId)
          }
        >
          {QR_CONTENT_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} aria-hidden="true" className="qr-type-caret" />
      </div>
      <p className="qr-type-blurb">{def.blurb}</p>

      {!payloadResult.ok ? (
        <div className="qr-sample-strip">
          <p>
            {hasContent
              ? "Almost there — one field still needs attention."
              : "Nothing to encode yet. Load a working sample and the preview, the checks and the downloads all come alive — or fill the fields yourself."}
          </p>
          <button
            type="button"
            className="secondary qr-mini-button"
            onClick={loadSample}
          >
            <Sparkles size={14} /> Try sample
          </button>
        </div>
      ) : null}

      <QrFieldGrid
        typeId={typeId}
        values={values}
        // A pristine form gets guidance, not red text: `hasContent` is the same
        // flag the status machine uses to tell "empty" from "invalid", so the
        // field errors and the preview verdict never disagree about the state.
        error={hasContent ? formError : null}
        onChange={studio.setValue}
      />

      <div className="qr-payload-bar">
        <button
          type="button"
          className="qr-link-button"
          onClick={() => setShowPayload((current) => !current)}
          aria-expanded={showPayload}
          aria-controls="qr-payload-view"
        >
          <ChevronDown
            size={14}
            className={showPayload ? "qr-chev open" : "qr-chev"}
          />
          {showPayload ? "Hide" : "Show"} the exact encoded content
        </button>
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={() => void studio.copyPayload()}
          disabled={!payloadResult.ok}
        >
          {showPayload ? "Copy" : "Copy content"}
        </button>
      </div>
      {showPayload ? (
        <div id="qr-payload-view" className="qr-payload-view">
          {payloadResult.ok ? (
            <pre aria-label="Exact text encoded in the QR code">
              {redactForDisplay(payloadResult.payload, typeId, values)}
            </pre>
          ) : (
            <p className="qr-field-error" role="alert">
              {payloadResult.error ?? "Fill in the fields above."}
            </p>
          )}
          <p className="help">
            The literal string stored in the symbol — what a scanner reads back,
            and what the verification compares character for character. Secrets
            such as a Wi-Fi password are dotted out here; they are still encoded
            normally.
          </p>
        </div>
      ) : null}
    </QrDisclosure>
  );
}
