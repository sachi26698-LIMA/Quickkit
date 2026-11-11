/**
 * Universal QR Data Templates + Original Shareable Link Engine.
 *
 * Every QR content type in QUICKKIT — especially types without a native web
 * address (`vcard`, `wifi`, `text`, `email`, `phone`, `sms`, `event`,
 * `location`, `business`, `payment` UPI) as well as destination link types —
 * can generate an original self-contained QUICKKIT link (`/qr?d=…`) encoded
 * directly inside the QR symbol.
 *
 * Scanning that QR with any phone camera, Google Lens or QUICKKIT's own QR
 * Scanner opens `/qr?d=…` and renders a structured, themed Data Template card
 * with safe one-tap actions (Pay via UPI, Save Contact `.vcf`, Copy Wi-Fi
 * Password, Add to Calendar `.ics`, Call, Email, SMS, Maps, Open Link).
 *
 * Privacy & security guarantees:
 * - Zero database or server storage: structured fields are compressed into `?d=`.
 * - Sensitive fields (`wifi.password`) are placed in the `#s=` URL fragment so
 *   browsers never transmit them in HTTP requests, server logs or Referer headers.
 * - Decompression is strictly byte-capped (`MAX_INFLATED_BYTES`) against zip bombs.
 * - Every action URI is re-validated against an explicit allowlist of safe schemes.
 */
import { Inflate, deflateSync } from "fflate";
import { MAX_QR_PAYLOAD_BYTES, utf8Length } from "./capacity";
import type { LandingLink } from "./landing";
import {
  buildPayload,
  contentTypeDef,
  defaultValuesFor,
  hasDirectWebLink,
  isKnownContentType,
  normalizeUrl,
  sensitiveKeysFor,
  type QrValues,
} from "./payload";
import { base64UrlFromBytes, bytesFromBase64Url } from "./png";
import {
  DIRECT_ENCRYPTED_PREFIX,
  ENCRYPTED_QUERY_PARAM,
  FRAGMENT_KEY_PARAM,
  SIGNATURE_QUERY_PARAM,
  createSignatureProof,
  decryptWithFragmentKey,
  decryptWithPassphrase,
  encryptWithFragmentKey,
  encryptWithPassphrase,
  getOrCreateSigner,
  inspectEncryptedEnvelope,
  loadPinnedSigners,
  parseSignatureProof,
  verifySignatureProof,
  type ActiveSigner,
} from "./crypto-security";
import {
  QrUserError,
  type QrContentTypeId,
  type QrDataTemplateThemeId,
  type QrEncodingMode,
  type QrSecurityMode,
} from "./types";

export const DATA_TEMPLATE_PATH = "/qr";
export const DATA_TEMPLATE_PARAM = "d";
export const DATA_TEMPLATE_SECRET_PARAM = "s";
export const DEFAULT_PUBLIC_ORIGIN = "https://quickkit.tools";

const MAX_TOKEN_CHARS = 6_000;
const MAX_INFLATED_BYTES = 24_576;

export type DataTemplateTheme = {
  id: QrDataTemplateThemeId;
  name: string;
  blurb: string;
  headerBg: string;
  headerText: string;
  accent: string;
  accentSoft: string;
  cardBg: string;
  cardBorder: string;
  ink: string;
  muted: string;
  dark?: boolean;
};

export const QR_DATA_TEMPLATES: DataTemplateTheme[] = [
  {
    id: "plum",
    name: "Signature Plum",
    blurb: "Warm plum & rose — the QUICKKIT house card",
    headerBg: "linear-gradient(135deg, #3b1b4f 0%, #b93a73 100%)",
    headerText: "#ffffff",
    accent: "#b93a73",
    accentSoft: "#fdf2f7",
    cardBg: "#ffffff",
    cardBorder: "#f0dce6",
    ink: "#1a0f2e",
    muted: "#6b5e7a",
  },
  {
    id: "emerald",
    name: "Emerald Pay",
    blurb: "Crisp merchant green for UPI, payments & WhatsApp",
    headerBg: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
    headerText: "#ffffff",
    accent: "#059669",
    accentSoft: "#ecfdf5",
    cardBg: "#ffffff",
    cardBorder: "#d1fae5",
    ink: "#062c22",
    muted: "#4b6b62",
  },
  {
    id: "royal",
    name: "Royal Corporate",
    blurb: "Executive indigo for contacts, business & documents",
    headerBg: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    headerText: "#ffffff",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
    cardBg: "#ffffff",
    cardBorder: "#dbeafe",
    ink: "#0f172a",
    muted: "#475569",
  },
  {
    id: "sunset",
    name: "Warm Sunset",
    blurb: "Vibrant coral & amber for cafés, events & menus",
    headerBg: "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)",
    headerText: "#ffffff",
    accent: "#ea580c",
    accentSoft: "#fff7ed",
    cardBg: "#ffffff",
    cardBorder: "#fed7aa",
    ink: "#29140a",
    muted: "#7c5846",
  },
  {
    id: "minimal",
    name: "Crisp Minimal",
    blurb: "Editorial monochrome card with clean borders",
    headerBg: "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
    headerText: "#ffffff",
    accent: "#18181b",
    accentSoft: "#f4f4f5",
    cardBg: "#ffffff",
    cardBorder: "#e4e4e7",
    ink: "#18181b",
    muted: "#52525b",
  },
  {
    id: "midnight",
    name: "Midnight Luxe",
    blurb: "Sleek dark slate card with luminous indigo highlights",
    headerBg: "linear-gradient(135deg, #0f172a 0%, #4338ca 100%)",
    headerText: "#ffffff",
    accent: "#6366f1",
    accentSoft: "#1e293b",
    cardBg: "#0f172a",
    cardBorder: "#334155",
    ink: "#f8fafc",
    muted: "#94a3b8",
    dark: true,
  },
];

export function isDataTemplateThemeId(
  value: string,
): value is QrDataTemplateThemeId {
  return QR_DATA_TEMPLATES.some((theme) => theme.id === value);
}

export function dataTemplateThemeById(id?: string | null): DataTemplateTheme {
  return (
    QR_DATA_TEMPLATES.find((theme) => theme.id === id) ?? QR_DATA_TEMPLATES[0]
  );
}

export function recommendedThemeForType(
  typeId: QrContentTypeId,
): QrDataTemplateThemeId {
  switch (typeId) {
    case "payment":
    case "whatsapp":
      return "emerald";
    case "vcard":
    case "business":
    case "document":
      return "royal";
    case "event":
    case "ticket":
    case "booking":
    case "gmaps":
    case "location":
      return "sunset";
    case "wifi":
    case "text":
      return "minimal";
    case "spotify":
    case "video":
    case "youtube":
      return "midnight";
    default:
      return "plum";
  }
}

export type DataTemplateConfig = {
  typeId: QrContentTypeId;
  values: QrValues;
  theme?: QrDataTemplateThemeId;
  customTitle?: string;
  landingLinks?: LandingLink[];
  /** True when the envelope requires a valid `&sg=` ECDSA signature. */
  sealed?: boolean;
  /** Expected signer fingerprint (`QK-XXXX-XXXX-XXXX`) bound inside the sealed envelope. */
  signerFingerprint?: string;
  /** Optional Unix expiry timestamp (seconds). */
  expiresAtSec?: number;
};

export type DataTemplateFieldRow = {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  secret?: boolean;
  href?: string;
};

export type DataTemplateAction = {
  id: string;
  label: string;
  primary?: boolean;
  kind: "link" | "copy" | "download";
  href?: string;
  external?: boolean;
  copyText?: string;
  downloadName?: string;
  downloadMime?: string;
  downloadContent?: string;
};

export type DataTemplateHighlight =
  | {
      kind: "payment";
      amountDisplay: string;
      upiId?: string;
      note?: string;
    }
  | {
      kind: "wifi";
      ssid: string;
      security: string;
      password: string;
      passwordOmitted?: boolean;
      hidden?: boolean;
    }
  | {
      kind: "note";
      text: string;
      meta: string;
    }
  | {
      kind: "message";
      channel: string;
      recipient: string;
      subject?: string;
      body: string;
    }
  | {
      kind: "event";
      when: string;
      where?: string;
      description?: string;
    }
  | {
      kind: "links";
      links: LandingLink[];
    };

export type DataTemplateModel = {
  typeId: QrContentTypeId;
  theme: DataTemplateTheme;
  badge: string;
  headline: string;
  subheadline: string;
  avatarText: string;
  hasNativeWebLink: boolean;
  highlight?: DataTemplateHighlight;
  fields: DataTemplateFieldRow[];
  actions: DataTemplateAction[];
  rawPayload: string;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SGD: "S$",
  CAD: "CA$",
  AUD: "A$",
};

const SAFE_ACTION_SCHEMES = new Set([
  "https:",
  "http:",
  "upi:",
  "mailto:",
  "tel:",
  "sms:",
]);

function isSafeActionHref(href: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(href.trim());
  if (!match) return false;
  const scheme = `${match[1].toLowerCase()}:`;
  if (!SAFE_ACTION_SCHEMES.has(scheme)) return false;
  if (scheme === "https:" || scheme === "http:") {
    try {
      const parsed = new URL(href);
      return !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }
  return true;
}

function cleanOrigin(origin?: string): string {
  const candidate = (origin ?? "").trim();
  if (!candidate) return DEFAULT_PUBLIC_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "https:" || parsed.protocol === "http:")
      return parsed.origin;
  } catch {
    /* fall through */
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

function safeInflate(compressed: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inflator = new Inflate((chunk, final) => {
    total += chunk.length;
    if (total > MAX_INFLATED_BYTES) {
      throw new Error("Encoded QR template exceeds safe size limit.");
    }
    chunks.push(chunk);
    void final;
  });
  inflator.push(compressed, true);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function encodeBytesCompact(json: string): string {
  const raw = new TextEncoder().encode(json);
  const rawToken = `r.${base64UrlFromBytes(raw)}`;
  try {
    const deflated = deflateSync(raw, { level: 9 });
    const zipToken = `z.${base64UrlFromBytes(deflated)}`;
    return zipToken.length < rawToken.length ? zipToken : rawToken;
  } catch {
    return rawToken;
  }
}

function decodeBytesCompact(token: string): string {
  const clean = token.trim();
  if (!clean || clean.length > MAX_TOKEN_CHARS)
    throw new Error("Template token is empty or too large.");
  if (clean.startsWith("z.")) {
    const bytes = safeInflate(bytesFromBase64Url(clean.slice(2)));
    return new TextDecoder().decode(bytes);
  }
  const body = clean.startsWith("r.") ? clean.slice(2) : clean;
  const raw = bytesFromBase64Url(body);
  if (raw.length > MAX_INFLATED_BYTES)
    throw new Error("Template token exceeds safe size limit.");
  return new TextDecoder().decode(raw);
}

function sanitizeLandingLinks(links?: LandingLink[]): LandingLink[] {
  if (!Array.isArray(links)) return [];
  const valid: LandingLink[] = [];
  for (const item of links.slice(0, 8)) {
    const label = String(item?.label ?? "")
      .trim()
      .slice(0, 60);
    const rawUrl = String(item?.url ?? "").trim();
    if (!label || !rawUrl) continue;
    try {
      valid.push({ label, url: normalizeUrl(rawUrl) });
    } catch {
      /* skip incomplete builder rows */
    }
  }
  return valid;
}

export type EncodedDataTemplate = {
  url: string;
  token: string;
  secretToken: string | null;
  bytes: number;
};

/**
 * Validate `config` and pack it into an original QUICKKIT Data Template URL
 * (`https://<origin>/qr?d=<token>` + optional `#s=<secret>`).
 */
export function buildDataTemplateUrl(
  config: DataTemplateConfig,
  origin?: string,
): EncodedDataTemplate {
  // Validate the underlying QR content first so invalid inputs throw field errors.
  buildPayload(config.typeId, config.values);

  const def = contentTypeDef(config.typeId);
  const secretKeys = new Set(sensitiveKeysFor(config.typeId));
  const publicFields: Record<string, string | number> = {};
  const secretFields: Record<string, string> = {};

  for (const field of def.fields) {
    const val = config.values[field.key];
    if (secretKeys.has(field.key)) {
      const str = typeof val === "string" ? val : "";
      if (str) secretFields[field.key] = str;
      continue;
    }
    if (field.type === "checkbox") {
      if (val === true) publicFields[field.key] = 1;
      continue;
    }
    const str = typeof val === "string" ? val.trim() : "";
    const defVal =
      typeof field.defaultValue === "string" ? field.defaultValue : "";
    // Preserve raw newlines for textarea fields (text, body, note, description).
    const kept =
      field.type === "textarea" && typeof val === "string"
        ? val.replace(/\r\n?/g, "\n").trim()
        : str;
    if (kept && kept !== defVal) {
      publicFields[field.key] = kept;
    } else if (field.required && kept) {
      publicFields[field.key] = kept;
    }
  }

  const theme = isDataTemplateThemeId(String(config.theme ?? ""))
    ? config.theme!
    : recommendedThemeForType(config.typeId);
  const customTitle = String(config.customTitle ?? "")
    .trim()
    .slice(0, 80);
  const validLinks =
    config.typeId === "landing" || config.typeId === "socials"
      ? sanitizeLandingLinks(config.landingLinks)
      : [];

  const envelope: Record<string, unknown> = {
    v: 1,
    t: config.typeId,
    th: theme,
    f: publicFields,
    ...(customTitle ? { ti: customTitle } : {}),
    ...(validLinks.length ? { l: validLinks } : {}),
    ...(config.sealed ? { sl: 1 } : {}),
    ...(config.signerFingerprint ? { fp: config.signerFingerprint } : {}),
    ...(config.expiresAtSec && config.expiresAtSec > 0
      ? { xp: Math.floor(config.expiresAtSec) }
      : {}),
  };

  const token = encodeBytesCompact(JSON.stringify(envelope));
  const secretToken =
    Object.keys(secretFields).length > 0
      ? encodeBytesCompact(JSON.stringify(secretFields))
      : null;

  const base = cleanOrigin(origin);
  const url = `${base}${DATA_TEMPLATE_PATH}?${DATA_TEMPLATE_PARAM}=${token}${
    secretToken ? `#${DATA_TEMPLATE_SECRET_PARAM}=${secretToken}` : ""
  }`;
  const bytes = utf8Length(url);
  if (bytes > MAX_QR_PAYLOAD_BYTES) {
    throw new QrUserError(
      `This Data Template link is ${bytes.toLocaleString()} bytes, over the ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte QR limit. Shorten the text or switch to Direct Raw Content.`,
    );
  }

  return { url, token, secretToken, bytes };
}

export type DecodedDataTemplateResult =
  | {
      ok: true;
      config: DataTemplateConfig;
      model: DataTemplateModel;
    }
  | {
      ok: false;
      message: string;
    };

function readSecretFragment(hash?: string | null): Record<string, string> {
  if (!hash) return {};
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean) return {};
  const params = new URLSearchParams(
    clean.startsWith("?") ? clean.slice(1) : clean,
  );
  const raw = params.get(DATA_TEMPLATE_SECRET_PARAM);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeBytesCompact(raw)) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v.slice(0, 200);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Decode either a full `/qr?d=…` URL or raw `d` + optional `#s=` parameters
 * into a validated `DataTemplateConfig` + presentation `DataTemplateModel`.
 */
export function decodeDataTemplate(
  tokenOrUrl: string | null | undefined,
  explicitHash?: string | null,
): DecodedDataTemplateResult {
  const rawInput = (tokenOrUrl ?? "").trim();
  if (!rawInput) {
    return {
      ok: false,
      message: "No QR data template was found in this link.",
    };
  }

  let token = rawInput;
  let hash = explicitHash ?? null;

  if (/^https?:\/\//i.test(rawInput) || rawInput.startsWith("/")) {
    try {
      const parsed = new URL(rawInput, DEFAULT_PUBLIC_ORIGIN);
      const pathClean = parsed.pathname.replace(/\/+$/, "") || "/";
      if (pathClean !== DATA_TEMPLATE_PATH) {
        return { ok: false, message: "Not a QUICKKIT QR Data Template URL." };
      }
      const fromQuery = parsed.searchParams.get(DATA_TEMPLATE_PARAM);
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
      token = fromQuery ?? hashParams.get(DATA_TEMPLATE_PARAM) ?? "";
      if (!hash && parsed.hash) hash = parsed.hash;
    } catch {
      return { ok: false, message: "This QR template link is malformed." };
    }
  }

  if (!token) {
    return { ok: false, message: "No QR data was found in this link." };
  }

  let envelope: Record<string, unknown>;
  try {
    const parsed = JSON.parse(decodeBytesCompact(token)) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("shape");
    envelope = parsed as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      message: "This QR data template link appears damaged or incomplete.",
    };
  }

  const typeIdRaw = String(envelope.t ?? "");
  if (!isKnownContentType(typeIdRaw)) {
    return {
      ok: false,
      message: "This QR code uses an unknown content type.",
    };
  }
  const typeId = typeIdRaw as QrContentTypeId;
  const def = contentTypeDef(typeId);
  const values: QrValues = defaultValuesFor(typeId);
  const incomingFields =
    envelope.f && typeof envelope.f === "object"
      ? (envelope.f as Record<string, unknown>)
      : {};

  for (const field of def.fields) {
    if (!(field.key in incomingFields)) continue;
    const rawVal = incomingFields[field.key];
    if (field.type === "checkbox") {
      values[field.key] = rawVal === 1 || rawVal === true || rawVal === "true";
    } else if (typeof rawVal === "string" || typeof rawVal === "number") {
      values[field.key] = String(rawVal).slice(0, field.max ?? 2500);
    }
  }

  const secrets = readSecretFragment(hash);
  for (const secretKey of sensitiveKeysFor(typeId)) {
    if (secrets[secretKey]) {
      const maxLen = def.fields.find((f) => f.key === secretKey)?.max ?? 200;
      values[secretKey] = secrets[secretKey].slice(0, maxLen);
    }
  }

  const theme = isDataTemplateThemeId(String(envelope.th ?? ""))
    ? (envelope.th as QrDataTemplateThemeId)
    : recommendedThemeForType(typeId);
  const customTitle =
    typeof envelope.ti === "string" ? envelope.ti.trim().slice(0, 80) : "";
  const landingLinks = Array.isArray(envelope.l)
    ? sanitizeLandingLinks(envelope.l as LandingLink[])
    : [];

  const sealed = envelope.sl === 1;
  const signerFingerprint =
    typeof envelope.fp === "string" ? envelope.fp.slice(0, 32) : undefined;
  const expiresAtSec =
    typeof envelope.xp === "number" &&
    Number.isFinite(envelope.xp) &&
    envelope.xp > 0
      ? Math.floor(envelope.xp)
      : undefined;

  const config: DataTemplateConfig = {
    typeId,
    values,
    theme,
    ...(customTitle ? { customTitle } : {}),
    ...(landingLinks.length ? { landingLinks } : {}),
    ...(sealed ? { sealed: true } : {}),
    ...(signerFingerprint ? { signerFingerprint } : {}),
    ...(expiresAtSec ? { expiresAtSec } : {}),
  };

  try {
    const model = buildDataTemplateModel(config, {
      allowMissingWifiPassword: true,
    });
    return { ok: true, config, model };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This QR template contains invalid field data.",
    };
  }
}

/** Quick check used by the QR Scanner to inspect `/qr?d=…` links synchronously. */
export function isQuickkitDataTemplateUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    const pathClean = parsed.pathname.replace(/\/+$/, "");
    return (
      pathClean === DATA_TEMPLATE_PATH &&
      Boolean(parsed.searchParams.get(DATA_TEMPLATE_PARAM))
    );
  } catch {
    return false;
  }
}

/* ----------------------------------------------------- presentation builder */

const str = (values: QrValues, key: string) =>
  typeof values[key] === "string" ? String(values[key]).trim() : "";

function initialsFrom(text: string, fallback = "QR"): string {
  const words = text
    .trim()
    .replace(/^@+/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

function formatReadableDateTime(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d, hh, mm] = match;
  const dt = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm));
  return `${dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })} · ${hh}:${mm}`;
}

function googleCalendarUrl(values: QrValues): string {
  const title = str(values, "title") || "Event";
  const location = str(values, "location");
  const details =
    typeof values.description === "string" ? values.description.trim() : "";
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  if (location) url.searchParams.set("location", location);
  if (details) url.searchParams.set("details", details);
  return url.toString();
}

function firstEmbeddedUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"'`]+/i.exec(text);
  if (!match) return null;
  const cleaned = match[0].replace(/[),.;!?\]}>]+$/g, "");
  try {
    return normalizeUrl(cleaned);
  } catch {
    return null;
  }
}

const BADGE_BY_TYPE: Record<QrContentTypeId, string> = {
  url: "Website Link",
  payment: "Payment / UPI",
  text: "Text Note",
  email: "Email Message",
  phone: "Phone Number",
  sms: "SMS Message",
  whatsapp: "WhatsApp Chat",
  wifi: "Wi‑Fi Network",
  vcard: "Contact Card",
  location: "Map Coordinates",
  event: "Calendar Event",
  social: "Social Profile",
  app: "App Download",
  instagram: "Instagram Profile",
  facebook: "Facebook Page",
  youtube: "YouTube Channel",
  spotify: "Music / Audio",
  gmaps: "Google Maps",
  greview: "Google Review",
  business: "Business Card",
  product: "Product Page",
  booking: "Appointment Booking",
  ticket: "Event / Ticket",
  document: "Document / PDF",
  gallery: "Photo Gallery",
  video: "Video Link",
  socials: "Social Links Hub",
  landing: "Smart Link Page",
};

const CTA_BY_LINK_TYPE: Partial<Record<QrContentTypeId, string>> = {
  url: "Open Website",
  social: "Open Profile",
  app: "Open App Store",
  instagram: "Open Instagram",
  facebook: "Open Facebook Page",
  youtube: "Open YouTube Channel",
  spotify: "Listen Now",
  gmaps: "Open in Google Maps",
  greview: "Write a Google Review",
  product: "View Product",
  booking: "Book Appointment",
  ticket: "Open Ticket Page",
  document: "Open Document",
  gallery: "Open Photo Gallery",
  video: "Watch Video",
  socials: "Open Links Page",
  landing: "Open Landing Page",
};

/**
 * Build the complete structured Data Template presentation model for any of the
 * 28 QR content types. Used both on `/qr` and inside the live generator preview.
 */
export function buildDataTemplateModel(
  config: DataTemplateConfig,
  options: { allowMissingWifiPassword?: boolean } = {},
): DataTemplateModel {
  const { typeId, values } = config;
  const theme = dataTemplateThemeById(
    config.theme ?? recommendedThemeForType(typeId),
  );
  const badge = BADGE_BY_TYPE[typeId] ?? contentTypeDef(typeId).label;

  let rawPayload = "";
  let wifiPasswordOmitted = false;
  if (
    typeId === "wifi" &&
    options.allowMissingWifiPassword &&
    (str(values, "encryption") || "WPA") !== "nopass" &&
    !str(values, "eap") &&
    !str(values, "password")
  ) {
    wifiPasswordOmitted = true;
    rawPayload = buildPayload("wifi", { ...values, encryption: "nopass" });
  } else {
    rawPayload = buildPayload(typeId, values);
  }

  const hasNativeWebLink = hasDirectWebLink(typeId, rawPayload);
  const fields: DataTemplateFieldRow[] = [];
  const actions: DataTemplateAction[] = [];
  let headline = config.customTitle?.trim() || "";
  let subheadline = "";
  let avatarText = "";
  let highlight: DataTemplateHighlight | undefined;

  const pushAction = (action: DataTemplateAction) => {
    if (action.kind === "link" && action.href && !isSafeActionHref(action.href))
      return;
    actions.push(action);
  };

  switch (typeId) {
    case "payment": {
      const method = str(values, "method") || "upi";
      const payeeName = str(values, "payeeName");
      const upiId = str(values, "upiId");
      const rawAmount = str(values, "amount");
      const currency = (str(values, "currency") || "INR").toUpperCase();
      const note = str(values, "note");
      const rawPaymentUrl = str(values, "paymentUrl");
      const cleanPaymentUrl = rawPaymentUrl
        ? normalizeUrl(rawPaymentUrl, "paymentUrl")
        : "";
      const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
      const formattedAmt = rawAmount
        ? `${sym}${Number(rawAmount.replace(/,/g, "")).toFixed(2)}`
        : "Open amount (enter in payment app)";

      headline = headline || payeeName;
      subheadline =
        method === "upi" && upiId
          ? `UPI · ${upiId}`
          : cleanPaymentUrl
            ? `Checkout · ${hostFromUrl(cleanPaymentUrl)}`
            : "Verified QR payment details";
      avatarText = initialsFrom(payeeName, "PY");
      highlight = {
        kind: "payment",
        amountDisplay: formattedAmt,
        ...(upiId ? { upiId } : {}),
        ...(note ? { note } : {}),
      };

      fields.push({ key: "payeeName", label: "Payee", value: payeeName });
      if (upiId) {
        fields.push({
          key: "upiId",
          label: "UPI ID (VPA)",
          value: upiId,
          mono: true,
          copyable: true,
        });
      }
      if (rawAmount) {
        fields.push({
          key: "amount",
          label: "Amount",
          value: formattedAmt,
          copyable: true,
        });
      }
      fields.push({ key: "currency", label: "Currency", value: currency });
      if (note) {
        fields.push({ key: "note", label: "Note / Reference", value: note });
      }
      if (cleanPaymentUrl) {
        fields.push({
          key: "paymentUrl",
          label: "Payment Link",
          value: cleanPaymentUrl,
          href: cleanPaymentUrl,
          copyable: true,
        });
      }

      if (method === "upi" && rawPayload.startsWith("upi://")) {
        pushAction({
          id: "pay-upi",
          label: rawAmount
            ? `Pay ${sym}${Number(rawAmount).toFixed(2)} via UPI`
            : "Pay via UPI App",
          kind: "link",
          href: rawPayload,
          primary: true,
        });
      }
      if (cleanPaymentUrl) {
        pushAction({
          id: "pay-link",
          label: "Open Payment Link",
          kind: "link",
          href: cleanPaymentUrl,
          external: true,
          primary: method === "link",
        });
      }
      if (upiId) {
        pushAction({
          id: "copy-upi",
          label: "Copy UPI ID",
          kind: "copy",
          copyText: upiId,
        });
      } else if (cleanPaymentUrl) {
        pushAction({
          id: "copy-pay-url",
          label: "Copy Payment Link",
          kind: "copy",
          copyText: cleanPaymentUrl,
        });
      }
      break;
    }

    case "vcard":
    case "business": {
      const fullName =
        typeId === "vcard"
          ? [str(values, "firstName"), str(values, "lastName")]
              .filter(Boolean)
              .join(" ")
          : str(values, "company");
      const org =
        typeId === "vcard" ? str(values, "org") : str(values, "company");
      const contactPerson =
        typeId === "business" ? str(values, "contactName") : "";
      const role = str(values, "title");
      const mobile = str(values, "mobile") || str(values, "phone");
      const workPhone = typeId === "vcard" ? str(values, "workPhone") : "";
      const email = str(values, "email");
      const rawWebsite = str(values, "website");
      const cleanWebsite = rawWebsite
        ? normalizeUrl(rawWebsite, "website")
        : "";
      const address = [
        str(values, "street"),
        str(values, "city"),
        str(values, "region"),
        str(values, "postal"),
        str(values, "country"),
      ]
        .filter(Boolean)
        .join(", ");
      const note = typeof values.note === "string" ? values.note.trim() : "";

      headline = headline || fullName;
      subheadline = [contactPerson, role, typeId === "vcard" ? org : ""]
        .filter(Boolean)
        .join(" · ");
      avatarText = initialsFrom(fullName, "VC");

      fields.push({
        key: "name",
        label: typeId === "business" ? "Business" : "Full Name",
        value: fullName,
      });
      if (contactPerson)
        fields.push({
          key: "contactName",
          label: "Contact Person",
          value: contactPerson,
        });
      if (org && typeId === "vcard")
        fields.push({ key: "org", label: "Company", value: org });
      if (role) fields.push({ key: "title", label: "Role", value: role });
      if (mobile) {
        const dial = `tel:${mobile.replace(/[^\d+]/g, "")}`;
        fields.push({
          key: "mobile",
          label: typeId === "business" ? "Phone" : "Mobile",
          value: mobile,
          href: dial,
          copyable: true,
        });
      }
      if (workPhone) {
        const dial = `tel:${workPhone.replace(/[^\d+]/g, "")}`;
        fields.push({
          key: "workPhone",
          label: "Work Phone",
          value: workPhone,
          href: dial,
          copyable: true,
        });
      }
      if (email) {
        fields.push({
          key: "email",
          label: "Email",
          value: email,
          href: `mailto:${email}`,
          copyable: true,
        });
      }
      if (cleanWebsite) {
        fields.push({
          key: "website",
          label: "Website",
          value: cleanWebsite,
          href: cleanWebsite,
          copyable: true,
        });
      }
      if (address) {
        fields.push({
          key: "address",
          label: "Address",
          value: address,
          copyable: true,
        });
      }
      if (note) {
        fields.push({ key: "note", label: "Note", value: note });
      }

      pushAction({
        id: "save-vcf",
        label: "Save Contact (.vcf)",
        kind: "download",
        downloadName: `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "contact"}.vcf`,
        downloadMime: "text/vcard;charset=utf-8",
        downloadContent: rawPayload,
        primary: true,
      });
      if (mobile) {
        pushAction({
          id: "call",
          label: "Call",
          kind: "link",
          href: `tel:${mobile.replace(/[^\d+]/g, "")}`,
        });
      }
      if (email) {
        pushAction({
          id: "email",
          label: "Send Email",
          kind: "link",
          href: `mailto:${email}`,
        });
      }
      if (cleanWebsite) {
        pushAction({
          id: "website",
          label: "Visit Website",
          kind: "link",
          href: cleanWebsite,
          external: true,
        });
      }
      if (address) {
        pushAction({
          id: "maps",
          label: "Open in Maps",
          kind: "link",
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
          external: true,
        });
      }
      break;
    }

    case "wifi": {
      const ssid = str(values, "ssid");
      const encType = str(values, "encryption") || "WPA";
      const password =
        typeof values.password === "string" ? values.password : "";
      const hidden = values.hidden === true || values.hidden === "true";
      const eap = str(values, "eap");
      const identity = str(values, "identity");
      const securityLabel =
        encType === "nopass"
          ? "Open network (no password)"
          : encType === "WEP"
            ? "WEP"
            : "WPA / WPA2 / WPA3";

      headline = headline || ssid;
      subheadline = `${securityLabel}${hidden ? " · Hidden SSID" : ""}`;
      avatarText = "WF";
      highlight = {
        kind: "wifi",
        ssid,
        security: securityLabel,
        password: encType === "nopass" ? "" : password,
        passwordOmitted: wifiPasswordOmitted,
        hidden,
      };

      fields.push({
        key: "ssid",
        label: "Network Name (SSID)",
        value: ssid,
        copyable: true,
      });
      fields.push({ key: "security", label: "Security", value: securityLabel });
      if (encType !== "nopass" && password) {
        fields.push({
          key: "password",
          label: "Password",
          value: password,
          mono: true,
          copyable: true,
          secret: true,
        });
      }
      if (hidden) {
        fields.push({
          key: "hidden",
          label: "Visibility",
          value: "Hidden network",
        });
      }
      if (eap) {
        fields.push({
          key: "eap",
          label: "Enterprise EAP",
          value: eap.toUpperCase(),
        });
      }
      if (identity) {
        fields.push({
          key: "identity",
          label: "Username",
          value: identity,
          copyable: true,
        });
      }

      if (encType !== "nopass" && password) {
        pushAction({
          id: "copy-wifi-pass",
          label: "Copy Wi‑Fi Password",
          kind: "copy",
          copyText: password,
          primary: true,
        });
      }
      pushAction({
        id: "copy-ssid",
        label: "Copy Network Name",
        kind: "copy",
        copyText: ssid,
        primary: encType === "nopass" || !password,
      });
      break;
    }

    case "text": {
      const text = String(values.text ?? "")
        .replace(/\r\n?/g, "\n")
        .trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      const firstLine = text.split("\n")[0]?.trim() ?? "Note";
      const embeddedUrl = firstEmbeddedUrl(text);

      headline =
        headline ||
        (firstLine.length > 48 ? `${firstLine.slice(0, 47)}…` : firstLine);
      subheadline = `${words} word${words === 1 ? "" : "s"} · ${text.length} characters`;
      avatarText = "TX";
      highlight = {
        kind: "note",
        text,
        meta: subheadline,
      };

      fields.push({
        key: "length",
        label: "Length",
        value: `${text.length} characters (${words} words)`,
      });
      if (embeddedUrl) {
        fields.push({
          key: "embeddedUrl",
          label: "Detected Link",
          value: embeddedUrl,
          href: embeddedUrl,
          copyable: true,
        });
      }

      pushAction({
        id: "copy-text",
        label: "Copy Text",
        kind: "copy",
        copyText: text,
        primary: !embeddedUrl,
      });
      if (embeddedUrl) {
        pushAction({
          id: "open-embedded",
          label: "Open Detected Link",
          kind: "link",
          href: embeddedUrl,
          external: true,
          primary: true,
        });
      }
      pushAction({
        id: "download-txt",
        label: "Download .txt",
        kind: "download",
        downloadName: "qr-note.txt",
        downloadMime: "text/plain;charset=utf-8",
        downloadContent: text,
      });
      break;
    }

    case "email": {
      const to = str(values, "to");
      const cc = str(values, "cc");
      const subject = str(values, "subject");
      const body =
        typeof values.body === "string"
          ? values.body.replace(/\r\n?/g, "\n").trim()
          : "";

      headline = headline || subject || to;
      subheadline = `To: ${to}`;
      avatarText = initialsFrom(to.split("@")[0] ?? "EM", "EM");
      if (subject || body) {
        highlight = {
          kind: "message",
          channel: "Email Draft",
          recipient: to,
          ...(subject ? { subject } : {}),
          body: body || "(No message body)",
        };
      }

      fields.push({
        key: "to",
        label: "Recipient",
        value: to,
        href: `mailto:${to}`,
        copyable: true,
      });
      if (cc)
        fields.push({ key: "cc", label: "CC", value: cc, copyable: true });
      if (subject)
        fields.push({
          key: "subject",
          label: "Subject",
          value: subject,
          copyable: true,
        });
      if (body) fields.push({ key: "body", label: "Message", value: body });

      pushAction({
        id: "open-email",
        label: "Open in Email App",
        kind: "link",
        href: rawPayload,
        primary: true,
      });
      pushAction({
        id: "copy-email",
        label: "Copy Email Address",
        kind: "copy",
        copyText: to,
      });
      break;
    }

    case "phone": {
      const phone = str(values, "phone");
      const cleanDial = phone.replace(/[^\d+]/g, "");
      headline = headline || phone;
      subheadline = "Direct voice & SMS number";
      avatarText = "PH";

      fields.push({
        key: "phone",
        label: "Phone Number",
        value: phone,
        href: rawPayload,
        mono: true,
        copyable: true,
      });

      pushAction({
        id: "call-phone",
        label: "Call Number",
        kind: "link",
        href: rawPayload,
        primary: true,
      });
      pushAction({
        id: "sms-phone",
        label: "Send SMS",
        kind: "link",
        href: `sms:${cleanDial}`,
      });
      pushAction({
        id: "copy-phone",
        label: "Copy Number",
        kind: "copy",
        copyText: phone,
      });
      break;
    }

    case "sms": {
      const phone = str(values, "phone");
      const cleanDial = phone.replace(/[^\d+]/g, "");
      const message =
        typeof values.message === "string"
          ? values.message.replace(/\r\n?/g, "\n").trim()
          : "";
      const smsHref = `sms:${cleanDial}${message ? `?body=${encodeURIComponent(message)}` : ""}`;

      headline = headline || phone;
      subheadline = "Pre-filled SMS text message";
      avatarText = "SM";
      if (message) {
        highlight = {
          kind: "message",
          channel: "SMS Message",
          recipient: phone,
          body: message,
        };
      }

      fields.push({
        key: "phone",
        label: "Recipient Number",
        value: phone,
        mono: true,
        copyable: true,
      });
      if (message) {
        fields.push({
          key: "message",
          label: "Message",
          value: message,
          copyable: true,
        });
      }

      pushAction({
        id: "open-sms",
        label: "Open in SMS App",
        kind: "link",
        href: smsHref,
        primary: true,
      });
      pushAction({
        id: "copy-sms-phone",
        label: "Copy Number",
        kind: "copy",
        copyText: phone,
      });
      break;
    }

    case "whatsapp": {
      const phone = str(values, "phone");
      const message =
        typeof values.message === "string"
          ? values.message.replace(/\r\n?/g, "\n").trim()
          : "";

      headline = headline || phone;
      subheadline = "WhatsApp direct chat";
      avatarText = "WA";
      if (message) {
        highlight = {
          kind: "message",
          channel: "WhatsApp Chat",
          recipient: phone,
          body: message,
        };
      }

      fields.push({
        key: "phone",
        label: "WhatsApp Number",
        value: phone,
        mono: true,
        copyable: true,
      });
      if (message) {
        fields.push({
          key: "message",
          label: "Pre-filled Message",
          value: message,
          copyable: true,
        });
      }

      pushAction({
        id: "open-wa",
        label: "Chat on WhatsApp",
        kind: "link",
        href: rawPayload,
        external: true,
        primary: true,
      });
      pushAction({
        id: "copy-wa",
        label: "Copy Number",
        kind: "copy",
        copyText: phone,
      });
      break;
    }

    case "location": {
      const lat = str(values, "latitude");
      const lng = str(values, "longitude");
      const label = str(values, "label");
      const zoom = str(values, "zoom");
      const coords = `${lat}, ${lng}`;
      const googleHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        label ? `${label} ${lat},${lng}` : `${lat},${lng}`,
      )}`;
      const appleHref = `https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lng}`)}${
        label ? `&q=${encodeURIComponent(label)}` : ""
      }`;

      headline = headline || label || coords;
      subheadline = label ? `Coordinates · ${coords}` : "Geographic map pin";
      avatarText = "MP";

      if (label) fields.push({ key: "label", label: "Place", value: label });
      fields.push({
        key: "coords",
        label: "Coordinates",
        value: coords,
        mono: true,
        copyable: true,
      });
      if (zoom) fields.push({ key: "zoom", label: "Zoom Level", value: zoom });

      pushAction({
        id: "open-gmaps",
        label: "Open in Google Maps",
        kind: "link",
        href: googleHref,
        external: true,
        primary: true,
      });
      pushAction({
        id: "open-apple-maps",
        label: "Open in Apple Maps",
        kind: "link",
        href: appleHref,
        external: true,
      });
      pushAction({
        id: "copy-coords",
        label: "Copy Coordinates",
        kind: "copy",
        copyText: coords,
      });
      break;
    }

    case "event": {
      const title = str(values, "title");
      const allDay = values.allDay === true || values.allDay === "true";
      const location = str(values, "location");
      const description =
        typeof values.description === "string"
          ? values.description.replace(/\r\n?/g, "\n").trim()
          : "";
      const tz = str(values, "timezone") === "utc" ? "UTC" : "Local time";
      const startText = allDay
        ? formatReadableDateTime(str(values, "date"))
        : formatReadableDateTime(str(values, "startDate"));
      const endRaw = allDay
        ? str(values, "endDateAllDay")
        : str(values, "endDate");
      const endText = endRaw ? formatReadableDateTime(endRaw) : "";
      const when = endText ? `${startText} → ${endText}` : startText;

      headline = headline || title;
      subheadline = location ? `${when} · ${location}` : when;
      avatarText = "EV";
      highlight = {
        kind: "event",
        when: `${when}${allDay ? " (All day)" : ` (${tz})`}`,
        ...(location ? { where: location } : {}),
        ...(description ? { description } : {}),
      };

      fields.push({ key: "title", label: "Event", value: title });
      fields.push({ key: "starts", label: "Starts", value: startText });
      if (endText) fields.push({ key: "ends", label: "Ends", value: endText });
      if (location) {
        fields.push({
          key: "location",
          label: "Location",
          value: location,
          copyable: true,
        });
      }
      if (description) {
        fields.push({
          key: "description",
          label: "Details",
          value: description,
        });
      }

      pushAction({
        id: "save-ics",
        label: "Add to Calendar (.ics)",
        kind: "download",
        downloadName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "event"}.ics`,
        downloadMime: "text/calendar;charset=utf-8",
        downloadContent: rawPayload,
        primary: true,
      });
      pushAction({
        id: "gcal",
        label: "Google Calendar",
        kind: "link",
        href: googleCalendarUrl(values),
        external: true,
      });
      if (location) {
        pushAction({
          id: "event-maps",
          label: "View Venue on Map",
          kind: "link",
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
          external: true,
        });
      }
      break;
    }

    default: {
      // Destination, social, media, store, review & smart-link types.
      const isWeb = /^https?:\/\//i.test(rawPayload);
      const host = isWeb ? hostFromUrl(rawPayload) : "";
      const handle =
        str(values, "username") ||
        str(values, "page") ||
        str(values, "channel") ||
        str(values, "place") ||
        str(values, "packageName") ||
        str(values, "appId");

      headline =
        headline ||
        (handle
          ? handle.startsWith("@") || typeId === "gmaps" || typeId === "app"
            ? handle
            : `@${handle}`
          : host || contentTypeDef(typeId).label);
      subheadline = host
        ? `Destination · ${host}`
        : contentTypeDef(typeId).blurb;
      avatarText = initialsFrom(headline, badge.slice(0, 2));

      if (
        (typeId === "landing" || typeId === "socials") &&
        config.landingLinks &&
        config.landingLinks.length > 0
      ) {
        highlight = {
          kind: "links",
          links: config.landingLinks,
        };
      }

      for (const field of contentTypeDef(typeId).fields) {
        const val = str(values, field.key);
        if (!val) continue;
        fields.push({
          key: field.key,
          label: field.label,
          value: val,
          copyable: field.key === "url" || field.key === "placeId",
          ...(field.key === "url" && isWeb ? { href: rawPayload } : {}),
        });
      }
      if (isWeb && !fields.some((f) => f.value === rawPayload)) {
        fields.push({
          key: "resolvedUrl",
          label: "Destination URL",
          value: rawPayload,
          href: rawPayload,
          copyable: true,
        });
      }

      if (isWeb) {
        pushAction({
          id: "open-destination",
          label: CTA_BY_LINK_TYPE[typeId] ?? "Open Link",
          kind: "link",
          href: rawPayload,
          external: true,
          primary: true,
        });
      }
      pushAction({
        id: "copy-destination",
        label: "Copy Link",
        kind: "copy",
        copyText: rawPayload,
        primary: !isWeb,
      });
      break;
    }
  }

  return {
    typeId,
    theme,
    badge,
    headline: headline || contentTypeDef(typeId).label,
    subheadline,
    avatarText: avatarText || "QR",
    hasNativeWebLink,
    ...(highlight ? { highlight } : {}),
    fields,
    actions,
    rawPayload,
  };
}

/* --------------- High-Class Cryptographic QR Builder & Verifier ---------- */

export function isQuickkitEncryptedTemplateUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    const pathClean = parsed.pathname.replace(/\/+$/, "");
    return (
      pathClean === DATA_TEMPLATE_PATH &&
      Boolean(parsed.searchParams.get(ENCRYPTED_QUERY_PARAM))
    );
  } catch {
    return false;
  }
}

export type ProtectedQrBuildInput = {
  encodingMode: QrEncodingMode;
  securityMode: QrSecurityMode;
  config: DataTemplateConfig;
  origin?: string;
  passphrase?: string;
  passphraseHint?: string;
  expiresAtSec?: number;
  iterations?: number;
  signer?: ActiveSigner;
};

export type ProtectedQrBuildOutput = {
  /** Final payload encoded into the QR matrix. */
  payload: string;
  /** Hosted `/qr?…` link when available, or `null` for offline raw payloads. */
  hostedUrl: string | null;
  bytes: number;
  securityLabel: string;
  signerFingerprint: string | null;
};

/**
 * Build a cryptographically signed and/or AES-256-GCM encrypted QR payload.
 */
export async function buildProtectedQrPayload(
  input: ProtectedQrBuildInput,
): Promise<ProtectedQrBuildOutput> {
  const {
    encodingMode,
    securityMode,
    config,
    origin,
    passphrase = "",
    passphraseHint = "",
    expiresAtSec = 0,
    iterations,
  } = input;

  const rawPayload = buildPayload(config.typeId, config.values);
  const baseOrigin = cleanOrigin(origin);

  // 1. Passphrase-Locked AES-256-GCM + PBKDF2-SHA256 Vault (works in both modes!)
  if (securityMode === "password-aes") {
    const cleanPass = passphrase.trim();
    if (cleanPass.length < 4) {
      throw new QrUserError(
        "Enter an encryption passphrase of at least 4 characters to lock this QR code.",
      );
    }
    if (encodingMode === "raw") {
      const eToken = await encryptWithPassphrase(rawPayload, cleanPass, {
        hint: passphraseHint,
        expiresAtSec,
        iterations,
      });
      const payload = `${DIRECT_ENCRYPTED_PREFIX}${eToken}`;
      const bytes = utf8Length(payload);
      if (bytes > MAX_QR_PAYLOAD_BYTES) {
        throw new QrUserError(
          `Encrypted QR payload is ${bytes.toLocaleString()} bytes, exceeding the ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte QR limit.`,
        );
      }
      return {
        payload,
        hostedUrl: null,
        bytes,
        securityLabel: "AES-256-GCM + PBKDF2 Vault (Offline QR)",
        signerFingerprint: null,
      };
    }

    // Hosted `/qr?e=…` vault: pack full inner DataTemplateConfig JSON into AES-256-GCM
    // AND attach an ECDSA P-256 outer anti-tamper signature.
    const signer = input.signer ?? (await getOrCreateSigner());
    const innerJson = JSON.stringify({
      kind: "template-v1",
      config: {
        ...config,
        sealed: true,
        signerFingerprint: signer.fingerprint,
        ...(expiresAtSec > 0 ? { expiresAtSec } : {}),
      },
    });
    const eToken = await encryptWithPassphrase(innerJson, cleanPass, {
      hint: passphraseHint,
      expiresAtSec,
      iterations,
    });
    const sig = await createSignatureProof(eToken, {
      signer,
      expiresAtSec,
    });
    const hostedUrl = `${baseOrigin}${DATA_TEMPLATE_PATH}?${ENCRYPTED_QUERY_PARAM}=${eToken}&${SIGNATURE_QUERY_PARAM}=${sig.sgToken}`;
    const bytes = utf8Length(hostedUrl);
    if (bytes > MAX_QR_PAYLOAD_BYTES) {
      throw new QrUserError(
        `Encrypted Data Template link is ${bytes.toLocaleString()} bytes, over the ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte QR limit.`,
      );
    }
    return {
      payload: hostedUrl,
      hostedUrl,
      bytes,
      securityLabel: "AES-256-GCM + PBKDF2 Vault + ECDSA P-256 Seal",
      signerFingerprint: signer.fingerprint,
    };
  }

  // 2. Direct Raw Content without passphrase encryption.
  if (encodingMode === "raw") {
    const bytes = utf8Length(rawPayload);
    return {
      payload: rawPayload,
      hostedUrl: null,
      bytes,
      securityLabel: "Direct Raw Protocol",
      signerFingerprint: null,
    };
  }

  // 3. Zero-Knowledge Fragment-Key AES-256-GCM (`?e=…&sg=…#k=…`)
  if (securityMode === "auto-aes") {
    const signer = input.signer ?? (await getOrCreateSigner());
    const innerJson = JSON.stringify({
      kind: "template-v1",
      config: {
        ...config,
        sealed: true,
        signerFingerprint: signer.fingerprint,
        ...(expiresAtSec > 0 ? { expiresAtSec } : {}),
      },
    });
    const { eToken, kToken } = await encryptWithFragmentKey(innerJson, {
      expiresAtSec,
    });
    const sig = await createSignatureProof(eToken, {
      signer,
      expiresAtSec,
    });
    const hostedUrl = `${baseOrigin}${DATA_TEMPLATE_PATH}?${ENCRYPTED_QUERY_PARAM}=${eToken}&${SIGNATURE_QUERY_PARAM}=${sig.sgToken}#${FRAGMENT_KEY_PARAM}=${kToken}`;
    const bytes = utf8Length(hostedUrl);
    if (bytes > MAX_QR_PAYLOAD_BYTES) {
      throw new QrUserError(
        `Encrypted Data Template link is ${bytes.toLocaleString()} bytes, over the ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte QR limit.`,
      );
    }
    return {
      payload: hostedUrl,
      hostedUrl,
      bytes,
      securityLabel: "Zero-Knowledge AES-256-GCM + ECDSA P-256 Seal",
      signerFingerprint: signer.fingerprint,
    };
  }

  // 4. Signed Anti-Tamper (`?d=…&sg=…`) — Default ON!
  if (securityMode === "signed") {
    const signer = input.signer ?? (await getOrCreateSigner());
    const baseEncoded = buildDataTemplateUrl(
      {
        ...config,
        sealed: true,
        signerFingerprint: signer.fingerprint,
        ...(expiresAtSec > 0 ? { expiresAtSec } : {}),
      },
      baseOrigin,
    );
    const sig = await createSignatureProof(baseEncoded.token, {
      signer,
      expiresAtSec,
    });
    const hostedUrl = `${baseOrigin}${DATA_TEMPLATE_PATH}?${DATA_TEMPLATE_PARAM}=${baseEncoded.token}&${SIGNATURE_QUERY_PARAM}=${sig.sgToken}${
      baseEncoded.secretToken
        ? `#${DATA_TEMPLATE_SECRET_PARAM}=${baseEncoded.secretToken}`
        : ""
    }`;
    const bytes = utf8Length(hostedUrl);
    if (bytes > MAX_QR_PAYLOAD_BYTES) {
      throw new QrUserError(
        `Signed Data Template link is ${bytes.toLocaleString()} bytes, over the ${MAX_QR_PAYLOAD_BYTES.toLocaleString()}-byte QR limit. Shorten the content or switch to Standard Unsigned.`,
      );
    }
    return {
      payload: hostedUrl,
      hostedUrl,
      bytes,
      securityLabel: "ECDSA P-256 Anti-Tamper Signed",
      signerFingerprint: signer.fingerprint,
    };
  }

  // 5. Standard Unsigned Data Template Link (`?d=…`)
  const unsigned = buildDataTemplateUrl(
    {
      ...config,
      ...(expiresAtSec > 0 ? { expiresAtSec } : {}),
    },
    baseOrigin,
  );
  return {
    payload: unsigned.url,
    hostedUrl: unsigned.url,
    bytes: unsigned.bytes,
    securityLabel: "Standard Data Template Link",
    signerFingerprint: null,
  };
}

export type QrSecuritySyncCheck = {
  kind:
    | "none"
    | "signed-candidate"
    | "encrypted-passphrase"
    | "encrypted-fragment"
    | "tampered"
    | "expired";
  headline: string;
  detail: string;
  signerFingerprint: string | null;
  hint: string;
  issuedAtSec: number | null;
  expiresAtSec: number | null;
  pinnedSignerMatch: boolean;
};

/**
 * Synchronous structural & anti-strip security check (0 ms, runs inside
 * `inspectPayload` in the QR Scanner before async Web Crypto completes).
 */
export function inspectQrPayloadSecuritySync(
  rawPayload: string,
  explicitHash?: string | null,
  nowSec = Math.floor(Date.now() / 1000),
): QrSecuritySyncCheck {
  const trimmed = rawPayload.trim();
  const pinnedSet = new Set(loadPinnedSigners().map((p) => p.fingerprint));

  // Direct offline `QKE1.…` encrypted payload
  if (trimmed.startsWith(DIRECT_ENCRYPTED_PREFIX)) {
    const info = inspectEncryptedEnvelope(trimmed, nowSec);
    if (!info) {
      return {
        kind: "tampered",
        headline: "Tamper Alert — Corrupted Encrypted QR",
        detail:
          "This QR claims to be a QKE1 AES-256-GCM encrypted vault, but its cryptographic envelope is malformed or truncated.",
        signerFingerprint: null,
        hint: "",
        issuedAtSec: null,
        expiresAtSec: null,
        pinnedSignerMatch: false,
      };
    }
    if (info.expired) {
      return {
        kind: "expired",
        headline: "Expired Encrypted QR Code",
        detail: `This encrypted QR code passed its embedded expiry timestamp (${new Date((info.expiresAtSec ?? 0) * 1000).toLocaleString()}).`,
        signerFingerprint: null,
        hint: info.hint,
        issuedAtSec: info.issuedAtSec,
        expiresAtSec: info.expiresAtSec,
        pinnedSignerMatch: false,
      };
    }
    return {
      kind: "encrypted-passphrase",
      headline: "Encrypted QR Vault (AES-256-GCM)",
      detail:
        "Protected with AES-256-GCM + PBKDF2-SHA256 authenticated encryption. Enter the passphrase to decrypt and verify integrity.",
      signerFingerprint: null,
      hint: info.hint,
      issuedAtSec: info.issuedAtSec,
      expiresAtSec: info.expiresAtSec,
      pinnedSignerMatch: false,
    };
  }

  // Hosted `/qr?…` URLs
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/qr")) {
    try {
      const parsed = new URL(trimmed, DEFAULT_PUBLIC_ORIGIN);
      const pathClean = parsed.pathname.replace(/\/+$/, "");
      if (pathClean === DATA_TEMPLATE_PATH) {
        const eParam = parsed.searchParams.get(ENCRYPTED_QUERY_PARAM);
        const dParam = parsed.searchParams.get(DATA_TEMPLATE_PARAM);
        const sgParam = parsed.searchParams.get(SIGNATURE_QUERY_PARAM);
        const effectiveHash = explicitHash || parsed.hash || "";

        if (eParam) {
          const info = inspectEncryptedEnvelope(eParam, nowSec);
          if (!info) {
            return {
              kind: "tampered",
              headline: "Tamper Alert — Corrupted Encrypted QR Link",
              detail:
                "The ?e= AES-256-GCM encrypted envelope in this URL was modified or truncated.",
              signerFingerprint: null,
              hint: "",
              issuedAtSec: null,
              expiresAtSec: null,
              pinnedSignerMatch: false,
            };
          }
          const sigMeta = sgParam ? parseSignatureProof(sgParam) : null;
          if (sgParam && !sigMeta) {
            return {
              kind: "tampered",
              headline: "Tamper Alert — Corrupted Digital Signature",
              detail:
                "The &sg= ECDSA P-256 signature attached to this encrypted QR link is malformed.",
              signerFingerprint: null,
              hint: info.hint,
              issuedAtSec: info.issuedAtSec,
              expiresAtSec: info.expiresAtSec,
              pinnedSignerMatch: false,
            };
          }
          if (info.expired) {
            return {
              kind: "expired",
              headline: "Expired Encrypted QR Link",
              detail: `This QR link expired on ${new Date((info.expiresAtSec ?? 0) * 1000).toLocaleString()}.`,
              signerFingerprint: sigMeta?.signerFingerprint ?? null,
              hint: info.hint,
              issuedAtSec: info.issuedAtSec,
              expiresAtSec: info.expiresAtSec,
              pinnedSignerMatch: Boolean(
                sigMeta && pinnedSet.has(sigMeta.signerFingerprint),
              ),
            };
          }
          if (info.mode === "fragment-key") {
            const hasKey = effectiveHash.includes(`${FRAGMENT_KEY_PARAM}=`);
            if (!hasKey) {
              return {
                kind: "tampered",
                headline: "Missing #k= Decryption Key Fragment",
                detail:
                  "This zero-knowledge AES-256-GCM QR link is missing its #k= decryption key fragment.",
                signerFingerprint: sigMeta?.signerFingerprint ?? null,
                hint: "",
                issuedAtSec: info.issuedAtSec,
                expiresAtSec: info.expiresAtSec,
                pinnedSignerMatch: false,
              };
            }
            return {
              kind: "encrypted-fragment",
              headline: "AES-256-GCM Encrypted Link (Auto-Unlock)",
              detail:
                "Payload is encrypted with AES-256-GCM using a zero-knowledge URL-fragment key.",
              signerFingerprint: sigMeta?.signerFingerprint ?? null,
              hint: "",
              issuedAtSec: info.issuedAtSec,
              expiresAtSec: info.expiresAtSec,
              pinnedSignerMatch: Boolean(
                sigMeta && pinnedSet.has(sigMeta.signerFingerprint),
              ),
            };
          }
          return {
            kind: "encrypted-passphrase",
            headline: "AES-256-GCM Password-Locked QR Link",
            detail:
              "This QR link is locked with AES-256-GCM + PBKDF2-SHA256 encryption. Enter the passphrase to unlock.",
            signerFingerprint: sigMeta?.signerFingerprint ?? null,
            hint: info.hint,
            issuedAtSec: info.issuedAtSec,
            expiresAtSec: info.expiresAtSec,
            pinnedSignerMatch: Boolean(
              sigMeta && pinnedSet.has(sigMeta.signerFingerprint),
            ),
          };
        }

        if (dParam) {
          const decoded = decodeDataTemplate(trimmed, effectiveHash);
          if (!decoded.ok) {
            return {
              kind: "tampered",
              headline: "Tamper Alert — Corrupted Data Template",
              detail: decoded.message,
              signerFingerprint: null,
              hint: "",
              issuedAtSec: null,
              expiresAtSec: null,
              pinnedSignerMatch: false,
            };
          }
          const { sealed, signerFingerprint, expiresAtSec } = decoded.config;
          if (sealed && !sgParam) {
            return {
              kind: "tampered",
              headline: "Tamper Alert — Digital Signature Stripped",
              detail:
                "This QR Data Template was sealed with an ECDSA P-256 signature, but its &sg= signature proof was removed!",
              signerFingerprint: signerFingerprint ?? null,
              hint: "",
              issuedAtSec: null,
              expiresAtSec: expiresAtSec ?? null,
              pinnedSignerMatch: false,
            };
          }
          if (sgParam) {
            const sigMeta = parseSignatureProof(sgParam);
            if (!sigMeta) {
              return {
                kind: "tampered",
                headline: "Tamper Alert — Malformed Digital Signature",
                detail:
                  "The &sg= ECDSA P-256 signature attached to this QR link is truncated or altered.",
                signerFingerprint: signerFingerprint ?? null,
                hint: "",
                issuedAtSec: null,
                expiresAtSec: expiresAtSec ?? null,
                pinnedSignerMatch: false,
              };
            }
            if (
              signerFingerprint &&
              sigMeta.signerFingerprint !== signerFingerprint
            ) {
              return {
                kind: "tampered",
                headline: "Tamper Alert — Signer Key Mismatch",
                detail: `Embedded signer (${signerFingerprint}) does not match attached signature key (${sigMeta.signerFingerprint}).`,
                signerFingerprint: sigMeta.signerFingerprint,
                hint: "",
                issuedAtSec: sigMeta.issuedAtSec,
                expiresAtSec: sigMeta.expiresAtSec || null,
                pinnedSignerMatch: false,
              };
            }
            const effectiveExp = expiresAtSec ?? (sigMeta.expiresAtSec || 0);
            if (effectiveExp > 0 && nowSec > effectiveExp) {
              return {
                kind: "expired",
                headline: "Expired Signed QR Code",
                detail: `This QR code expired on ${new Date(effectiveExp * 1000).toLocaleString()}.`,
                signerFingerprint: sigMeta.signerFingerprint,
                hint: "",
                issuedAtSec: sigMeta.issuedAtSec,
                expiresAtSec: effectiveExp,
                pinnedSignerMatch: pinnedSet.has(sigMeta.signerFingerprint),
              };
            }
            return {
              kind: "signed-candidate",
              headline: "Signed Data Template (ECDSA P-256)",
              detail: `Carries ECDSA P-256 signature from ${sigMeta.signerFingerprint}.`,
              signerFingerprint: sigMeta.signerFingerprint,
              hint: "",
              issuedAtSec: sigMeta.issuedAtSec,
              expiresAtSec: effectiveExp || null,
              pinnedSignerMatch: pinnedSet.has(sigMeta.signerFingerprint),
            };
          }
          if (expiresAtSec && nowSec > expiresAtSec) {
            return {
              kind: "expired",
              headline: "Expired QR Code",
              detail: `This QR code expired on ${new Date(expiresAtSec * 1000).toLocaleString()}.`,
              signerFingerprint: null,
              hint: "",
              issuedAtSec: null,
              expiresAtSec,
              pinnedSignerMatch: false,
            };
          }
        }
      }
    } catch {
      /* ignore non-URL */
    }
  }

  return {
    kind: "none",
    headline: "",
    detail: "",
    signerFingerprint: null,
    hint: "",
    issuedAtSec: null,
    expiresAtSec: null,
    pinnedSignerMatch: false,
  };
}

export type VerifiedQrResolution =
  | {
      state: "ready";
      securityStatus: "verified" | "encrypted-verified" | "unsigned";
      algorithm: string;
      signerFingerprint: string | null;
      issuedAtSec: number | null;
      expiresAtSec: number | null;
      model: DataTemplateModel;
      config: DataTemplateConfig;
    }
  | {
      state: "decrypted-raw";
      securityStatus: "encrypted-verified";
      algorithm: string;
      plaintext: string;
      issuedAtSec: number | null;
      expiresAtSec: number | null;
    }
  | {
      state: "locked";
      hint: string;
      signerFingerprint: string | null;
      issuedAtSec: number | null;
      expiresAtSec: number | null;
      errorMessage?: string;
    }
  | {
      state: "tampered" | "expired" | "empty" | "invalid";
      headline: string;
      message: string;
      signerFingerprint: string | null;
    };

/**
 * Full async Web Crypto verification + decryption resolver for `/qr` and
 * the QR Code Scanner (`ECDSA P-256` + `AES-256-GCM`).
 */
export async function verifyAndResolveQrPayload(
  rawInput: string | null | undefined,
  options: {
    explicitHash?: string | null;
    passphrase?: string;
    nowSec?: number;
  } = {},
): Promise<VerifiedQrResolution> {
  const trimmed = (rawInput ?? "").trim();
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  if (!trimmed) {
    return {
      state: "empty",
      headline: "QUICKKIT QR Data Card",
      message: "No QR data template was found in this link.",
      signerFingerprint: null,
    };
  }

  // 1. Offline `QKE1.…` passphrase-encrypted QR payload
  if (trimmed.startsWith(DIRECT_ENCRYPTED_PREFIX)) {
    const info = inspectEncryptedEnvelope(trimmed, nowSec);
    if (!info) {
      return {
        state: "tampered",
        headline: "CRITICAL TAMPER ALERT — Encrypted QR Corrupted",
        message:
          "The QKE1 AES-256-GCM encrypted envelope was altered or truncated and cannot be authenticated.",
        signerFingerprint: null,
      };
    }
    if (info.expired) {
      return {
        state: "expired",
        headline: "QR Code Expired",
        message: `This encrypted QR code expired on ${new Date((info.expiresAtSec ?? 0) * 1000).toLocaleString()}.`,
        signerFingerprint: null,
      };
    }
    if (!options.passphrase?.trim()) {
      return {
        state: "locked",
        hint: info.hint,
        signerFingerprint: null,
        issuedAtSec: info.issuedAtSec,
        expiresAtSec: info.expiresAtSec,
      };
    }
    const dec = await decryptWithPassphrase(
      trimmed,
      options.passphrase,
      nowSec,
    );
    if (!dec.ok) {
      if (dec.reason === "expired") {
        return {
          state: "expired",
          headline: "QR Code Expired",
          message: dec.message,
          signerFingerprint: null,
        };
      }
      return {
        state: "locked",
        hint: info.hint,
        signerFingerprint: null,
        issuedAtSec: info.issuedAtSec,
        expiresAtSec: info.expiresAtSec,
        errorMessage: dec.message,
      };
    }
    return {
      state: "decrypted-raw",
      securityStatus: "encrypted-verified",
      algorithm: "AES-256-GCM + PBKDF2-SHA256 (210k)",
      plaintext: dec.plaintext,
      issuedAtSec: dec.issuedAtSec,
      expiresAtSec: dec.expiresAtSec,
    };
  }

  // 2. Hosted `/qr?…` URLs
  let parsed: URL;
  try {
    parsed = new URL(trimmed, DEFAULT_PUBLIC_ORIGIN);
  } catch {
    return {
      state: "invalid",
      headline: "Invalid QR Link",
      message: "This QR link could not be parsed.",
      signerFingerprint: null,
    };
  }

  const effectiveHash = options.explicitHash || parsed.hash || "";
  const eToken = parsed.searchParams.get(ENCRYPTED_QUERY_PARAM);
  const dToken = parsed.searchParams.get(DATA_TEMPLATE_PARAM);
  const sgToken = parsed.searchParams.get(SIGNATURE_QUERY_PARAM);

  // 2A. Encrypted `/qr?e=…` link (either Auto-Key `#k=` or Passphrase Vault)
  if (eToken) {
    let verifiedSigner: string | null = null;
    if (sgToken) {
      const sigCheck = await verifySignatureProof(eToken, sgToken, nowSec);
      if (!sigCheck.valid) {
        return {
          state: "tampered",
          headline: "CRITICAL TAMPER ALERT — Digital Signature Invalid",
          message:
            sigCheck.reason ??
            "The ECDSA P-256 signature on this encrypted QR link failed verification — data was modified after creation.",
          signerFingerprint: sigCheck.signerFingerprint,
        };
      }
      verifiedSigner = sigCheck.signerFingerprint;
      if (sigCheck.expired) {
        return {
          state: "expired",
          headline: "QR Code Expired",
          message: sigCheck.reason ?? "This signed QR link has expired.",
          signerFingerprint: verifiedSigner,
        };
      }
    }

    const info = inspectEncryptedEnvelope(eToken, nowSec);
    if (!info) {
      return {
        state: "tampered",
        headline: "CRITICAL TAMPER ALERT — Encrypted Envelope Altered",
        message:
          "The AES-256-GCM encrypted payload in this link is malformed or tampered with.",
        signerFingerprint: verifiedSigner,
      };
    }
    if (info.expired) {
      return {
        state: "expired",
        headline: "QR Code Expired",
        message: `This encrypted QR link expired on ${new Date((info.expiresAtSec ?? 0) * 1000).toLocaleString()}.`,
        signerFingerprint: verifiedSigner,
      };
    }

    if (info.mode === "fragment-key") {
      const dec = await decryptWithFragmentKey(eToken, effectiveHash, nowSec);
      if (!dec.ok) {
        return {
          state: dec.reason === "expired" ? "expired" : "tampered",
          headline:
            dec.reason === "expired"
              ? "QR Code Expired"
              : "CRITICAL TAMPER ALERT — AES-256-GCM Seal Broken",
          message: dec.message,
          signerFingerprint: verifiedSigner,
        };
      }
      return hydrateDecryptedTemplateJson(
        dec.plaintext,
        verifiedSigner
          ? "AES-256-GCM Zero-Knowledge + ECDSA P-256"
          : "AES-256-GCM Zero-Knowledge",
        verifiedSigner,
        dec.issuedAtSec,
        dec.expiresAtSec,
      );
    }

    // Passphrase-protected `/qr?e=…`
    if (!options.passphrase?.trim()) {
      return {
        state: "locked",
        hint: info.hint,
        signerFingerprint: verifiedSigner,
        issuedAtSec: info.issuedAtSec,
        expiresAtSec: info.expiresAtSec,
      };
    }
    const dec = await decryptWithPassphrase(eToken, options.passphrase, nowSec);
    if (!dec.ok) {
      if (dec.reason === "expired") {
        return {
          state: "expired",
          headline: "QR Code Expired",
          message: dec.message,
          signerFingerprint: verifiedSigner,
        };
      }
      return {
        state: "locked",
        hint: info.hint,
        signerFingerprint: verifiedSigner,
        issuedAtSec: info.issuedAtSec,
        expiresAtSec: info.expiresAtSec,
        errorMessage: dec.message,
      };
    }
    return hydrateDecryptedTemplateJson(
      dec.plaintext,
      verifiedSigner
        ? "AES-256-GCM + PBKDF2-SHA256 + ECDSA P-256"
        : "AES-256-GCM + PBKDF2-SHA256",
      verifiedSigner,
      dec.issuedAtSec,
      dec.expiresAtSec,
    );
  }

  // 2B. Standard or Signed `/qr?d=…` link
  if (dToken) {
    const decoded = decodeDataTemplate(trimmed, effectiveHash);
    if (!decoded.ok) {
      return {
        state: "tampered",
        headline: "QR Data Card Corrupted or Tampered",
        message: decoded.message,
        signerFingerprint: null,
      };
    }

    const { sealed, signerFingerprint, expiresAtSec } = decoded.config;
    if (sealed && !sgToken) {
      return {
        state: "tampered",
        headline: "CRITICAL TAMPER ALERT — Security Signature Stripped",
        message:
          "This QR Data Card was sealed with an ECDSA P-256 anti-tamper signature, but the signature parameter (&sg=) was removed.",
        signerFingerprint: signerFingerprint ?? null,
      };
    }

    if (sgToken) {
      const sigCheck = await verifySignatureProof(dToken, sgToken, nowSec);
      if (!sigCheck.valid) {
        return {
          state: "tampered",
          headline: "CRITICAL TAMPER ALERT — QR Data Was Modified!",
          message:
            sigCheck.reason ??
            "ECDSA P-256 digital signature verification failed. At least one character of this QR code's data was altered after creation.",
          signerFingerprint:
            sigCheck.signerFingerprint ?? signerFingerprint ?? null,
        };
      }
      if (
        signerFingerprint &&
        sigCheck.signerFingerprint !== signerFingerprint
      ) {
        return {
          state: "tampered",
          headline: "CRITICAL TAMPER ALERT — Signer Key Replaced!",
          message:
            "The attached signature does not belong to the creator key embedded inside the QR payload.",
          signerFingerprint: sigCheck.signerFingerprint,
        };
      }
      const effectiveExp = expiresAtSec ?? sigCheck.expiresAtSec ?? null;
      if (sigCheck.expired || (effectiveExp && nowSec > effectiveExp)) {
        return {
          state: "expired",
          headline: "QR Code Expired",
          message:
            sigCheck.reason ??
            `This QR code expired on ${new Date((effectiveExp ?? 0) * 1000).toLocaleString()}.`,
          signerFingerprint: sigCheck.signerFingerprint,
        };
      }
      return {
        state: "ready",
        securityStatus: "verified",
        algorithm: "ECDSA P-256 + SHA-256",
        signerFingerprint: sigCheck.signerFingerprint,
        issuedAtSec: sigCheck.issuedAtSec,
        expiresAtSec: effectiveExp,
        model: decoded.model,
        config: decoded.config,
      };
    }

    if (expiresAtSec && nowSec > expiresAtSec) {
      return {
        state: "expired",
        headline: "QR Code Expired",
        message: `This QR code expired on ${new Date(expiresAtSec * 1000).toLocaleString()}.`,
        signerFingerprint: null,
      };
    }

    return {
      state: "ready",
      securityStatus: "unsigned",
      algorithm: "Unsealed Data Template",
      signerFingerprint: null,
      issuedAtSec: null,
      expiresAtSec: expiresAtSec ?? null,
      model: decoded.model,
      config: decoded.config,
    };
  }

  return {
    state: "empty",
    headline: "QUICKKIT QR Data Card",
    message: "No QR data template was found in this link.",
    signerFingerprint: null,
  };
}

function hydrateDecryptedTemplateJson(
  plaintext: string,
  algorithm: string,
  verifiedSigner: string | null,
  issuedAtSec: number | null,
  expiresAtSec: number | null,
): VerifiedQrResolution {
  try {
    const parsed = JSON.parse(plaintext) as {
      kind?: string;
      config?: DataTemplateConfig;
    };
    if (parsed?.kind === "template-v1" && parsed.config) {
      const model = buildDataTemplateModel(parsed.config, {
        allowMissingWifiPassword: true,
      });
      return {
        state: "ready",
        securityStatus: "encrypted-verified",
        algorithm,
        signerFingerprint:
          verifiedSigner ?? parsed.config.signerFingerprint ?? null,
        issuedAtSec,
        expiresAtSec,
        model,
        config: parsed.config,
      };
    }
  } catch {
    /* Fall through to raw decrypted text */
  }
  return {
    state: "decrypted-raw",
    securityStatus: "encrypted-verified",
    algorithm,
    plaintext,
    issuedAtSec,
    expiresAtSec,
  };
}
