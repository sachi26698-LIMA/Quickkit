/**
 * Content recognition for decoded payloads.
 *
 * Every function here is a *parser*, not a classifier: it reads the payload
 * against the published format for that content type and reports what it
 * actually found. When the grammar does not match, the payload falls through to
 * `unknown` and is shown verbatim — a scanner that labels a random string as a
 * "Wi-Fi network" is a liability, not a feature.
 */
import {
  decodeDataTemplate,
  inspectQrPayloadSecuritySync,
  isQuickkitDataTemplateUrl,
  isQuickkitEncryptedTemplateUrl,
} from "../qr/data-template";
import {
  DIRECT_ENCRYPTED_PREFIX,
  inspectEncryptedEnvelope,
} from "../qr/crypto-security";
import { encodeShareConfig } from "../qr/share";
import { defaultDesign } from "../qr/style";
import type { QrContentTypeId } from "../qr/types";

export type ContentTypeId =
  | "url"
  | "text"
  | "email"
  | "phone"
  | "sms"
  | "whatsapp"
  | "wifi"
  | "vcard"
  | "mecard"
  | "geo"
  | "event"
  | "social"
  | "app"
  | "payment"
  | "crypto"
  | "product"
  | "unknown";

export type Field = { label: string; value: string; sensitive?: boolean };

export type ActionId =
  | "copy"
  | "open-url"
  | "copy-email"
  | "compose-email"
  | "copy-phone"
  | "dial"
  | "copy-sms"
  | "copy-wifi"
  | "copy-address"
  | "open-maps"
  | "copy-event"
  | "copy-contact"
  | "copy-payment";

export type Action = {
  id: ActionId;
  label: string;
  /** Absolute destination, only for actions that navigate. */
  href?: string;
};

export type Recognition = {
  type: ContentTypeId;
  /** Human label for the content type badge. */
  label: string;
  /** Short, single-line summary for lists and exports. */
  summary: string;
  /** The one value "copy" should put on the clipboard by default. */
  primary: string;
  fields: Field[];
  actions: Action[];
  /** True when a field holds a secret that should not be stored casually. */
  sensitive: boolean;
};

const LABELS: Record<ContentTypeId, string> = {
  url: "Website URL",
  text: "Plain text",
  email: "Email address",
  phone: "Phone number",
  sms: "SMS message",
  whatsapp: "WhatsApp link",
  wifi: "Wi-Fi credentials",
  vcard: "Contact card",
  mecard: "Contact card (MECARD)",
  geo: "Geographic location",
  event: "Calendar event",
  social: "Social media profile",
  app: "App download link",
  payment: "Payment request",
  crypto: "Cryptocurrency address",
  product: "Product identifier",
  unknown: "Unrecognised payload",
};

/** Trim a value and never return undefined — the UI always has something. */
const clean = (value: string | null | undefined) => (value ?? "").trim();

/**
 * Unescape a WIFI/MECARD field. Those grammars escape `\ ; , : "` with a
 * backslash, so a password containing a semicolon round-trips correctly.
 */
function unescapeField(value: string): string {
  return value.replace(/\\([\\;,:"])/g, "$1");
}

/** Split `KEY:value;` pairs, honouring backslash escapes. */
function parseSemicolonFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let key = "";
  let value = "";
  let readingKey = true;
  let escaped = false;
  for (const character of body) {
    if (escaped) {
      if (readingKey) key += character;
      else value += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      if (readingKey) key += character;
      else value += character;
      continue;
    }
    if (character === ":" && readingKey) {
      readingKey = false;
      continue;
    }
    if (character === ";" && !readingKey) {
      const trimmed = key.trim().toUpperCase();
      if (trimmed && !(trimmed in fields))
        fields[trimmed] = unescapeField(value);
      key = "";
      value = "";
      readingKey = true;
      continue;
    }
    if (readingKey) key += character;
    else value += character;
  }
  const trimmed = key.trim().toUpperCase();
  if (trimmed && !readingKey && !(trimmed in fields))
    fields[trimmed] = unescapeField(value);
  return fields;
}

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const SOCIAL_HOSTS: Record<string, string> = {
  "twitter.com": "X (Twitter)",
  "x.com": "X (Twitter)",
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "tiktok.com": "TikTok",
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "github.com": "GitHub",
  "threads.net": "Threads",
  "pinterest.com": "Pinterest",
  "reddit.com": "Reddit",
  "snapchat.com": "Snapchat",
  "telegram.me": "Telegram",
  "t.me": "Telegram",
  "discord.gg": "Discord",
};
const APP_HOSTS: Record<string, string> = {
  "play.google.com": "Google Play",
  "apps.apple.com": "Apple App Store",
  "itunes.apple.com": "Apple App Store",
  "appgallery.huawei.com": "Huawei AppGallery",
  "f-droid.org": "F-Droid",
  "microsoft.com": "Microsoft Store",
};

function hostOf(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.hostname.toLocaleLowerCase();
  } catch {
    return null;
  }
}

/** Match `host` or any subdomain of it exactly — never a lookalike suffix. */
function matchesHost(host: string, candidate: string) {
  return host === candidate || host.endsWith(`.${candidate}`);
}

const CRYPTO_PREFIXES: { scheme: string; label: string; pattern: RegExp }[] = [
  {
    scheme: "bitcoin",
    label: "Bitcoin",
    pattern:
      /^(?:bitcoin:)?(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  },
  {
    scheme: "ethereum",
    label: "Ethereum",
    pattern: /^(?:ethereum:)?0x[a-fA-F0-9]{40}$/,
  },
  {
    scheme: "litecoin",
    label: "Litecoin",
    pattern: /^(?:litecoin:)?[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
  },
  {
    scheme: "dogecoin",
    label: "Dogecoin",
    pattern: /^(?:dogecoin:)?D{1}[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/,
  },
];

function recognizeCrypto(payload: string): Recognition | null {
  const [beforeQuery] = payload.split("?");
  for (const entry of CRYPTO_PREFIXES) {
    if (!entry.pattern.test(beforeQuery.trim())) continue;
    const address = beforeQuery.replace(/^[a-z]+:/i, "");
    const params = new URLSearchParams(payload.split("?")[1] ?? "");
    const fields: Field[] = [
      { label: "Currency", value: entry.label },
      { label: "Address", value: address },
    ];
    const amount = params.get("amount") ?? params.get("value");
    if (amount) fields.push({ label: "Amount", value: amount });
    const message = params.get("message") ?? params.get("label");
    if (message) fields.push({ label: "Label", value: message });
    return {
      type: "crypto",
      label: LABELS.crypto,
      summary: `${
        amount ? `${amount} ` : ""
      }${entry.label} to ${address.slice(0, 10)}…`,
      primary: address,
      fields,
      actions: [
        { id: "copy", label: "Copy address" },
        { id: "copy-payment", label: "Copy payment URI" },
      ],
      sensitive: false,
    };
  }
  return null;
}

function recognizePayment(payload: string): Recognition | null {
  if (/^upi:\/\//i.test(payload)) {
    const params = new URLSearchParams(payload.replace(/^upi:\/\/pay\?/i, ""));
    const payee = clean(params.get("pa"));
    if (!payee) return null;
    const fields: Field[] = [{ label: "Payee address (VPA)", value: payee }];
    const name = clean(params.get("pn"));
    if (name) fields.push({ label: "Payee name", value: name });
    const amount = clean(params.get("am"));
    if (amount) fields.push({ label: "Amount", value: amount });
    const currency = clean(params.get("cu"));
    if (currency) fields.push({ label: "Currency", value: currency });
    const note = clean(params.get("tn"));
    if (note) fields.push({ label: "Note", value: note });
    const reference = clean(params.get("tr"));
    if (reference) fields.push({ label: "Reference", value: reference });
    return {
      type: "payment",
      label: LABELS.payment,
      summary: `${amount ? `${currency || ""} ${amount} to ` : "Payment to "}${name || payee}`,
      primary: payload,
      fields,
      actions: [
        { id: "copy-payment", label: "Copy payment request" },
        { id: "copy", label: "Copy payee address" },
      ],
      sensitive: false,
    };
  }
  if (/^solana:/i.test(payload))
    return {
      type: "crypto",
      label: LABELS.crypto,
      summary: "Solana payment request",
      primary: payload.replace(/^solana:/i, "").split("?")[0],
      fields: [
        { label: "Currency", value: "Solana" },
        {
          label: "Address",
          value: payload.replace(/^solana:/i, "").split("?")[0],
        },
      ],
      actions: [{ id: "copy", label: "Copy address" }],
      sensitive: false,
    };
  return null;
}

function recognizeWifi(payload: string): Recognition | null {
  if (!/^WIFI:/i.test(payload)) return null;
  const fields = parseSemicolonFields(payload.slice(5));
  const ssid = fields.S;
  if (!ssid) return null;
  const security = (fields.T || "nopass").toUpperCase();
  const hidden = /^(true|1|yes)$/i.test(fields.H || "");
  // Order follows how a person reads the network: name, whether it is hidden,
  // then the security type. Leading with the SSID keeps the first line of the
  // card useful even when the record is later shown redacted.
  const details: Field[] = [{ label: "Network name (SSID)", value: ssid }];
  if (hidden) details.push({ label: "Hidden network", value: "Yes" });
  details.push({
    label: "Security",
    value: security === "NOPASS" ? "Open (no password)" : security,
  });
  if (fields.P)
    details.push({ label: "Password", value: fields.P, sensitive: true });
  if (fields.I) details.push({ label: "Identity", value: fields.I });
  if (fields.A) details.push({ label: "Anonymous identity", value: fields.A });
  return {
    type: "wifi",
    label: LABELS.wifi,
    summary: `${ssid} · ${security === "NOPASS" ? "open network" : security}`,
    primary: ssid,
    fields: details,
    actions: [
      { id: "copy-wifi", label: "Copy Wi-Fi details" },
      { id: "copy", label: "Copy network name" },
    ],
    sensitive: Boolean(fields.P),
  };
}

function recognizeVcard(payload: string): Recognition | null {
  const mecard = /^MECARD:/i.test(payload);
  const vcard = /^BEGIN:VCARD/i.test(payload);
  if (!mecard && !vcard) return null;

  const fields: Field[] = [];
  let name = "";
  let organisation = "";
  let title = "";

  if (mecard) {
    const body = parseSemicolonFields(payload.replace(/^MECARD:/i, ""));
    // MECARD's N field is "Last,First" (RFC-style), so reverse it for display.
    const parts = (body.N || "").split(/[;,]/).map(clean).filter(Boolean);
    name = parts.length === 2 ? `${parts[1]} ${parts[0]}` : parts.join(" ");
    name = name.replace(/\s+/g, " ").trim();
    if (name) fields.push({ label: "Name", value: name });
    if (body.TEL) {
      const phones = body.TEL.split(",").map(clean).filter(Boolean);
      for (const phone of phones) fields.push({ label: "Phone", value: phone });
    }
    if (body.EMAIL) {
      for (const email of body.EMAIL.split(",").map(clean).filter(Boolean))
        fields.push({ label: "Email", value: email });
    }
    if (body.ADR)
      fields.push({ label: "Address", value: body.ADR.replace(/;/g, ", ") });
    if (body.ORG) {
      organisation = body.ORG;
      fields.push({ label: "Organisation", value: organisation });
    }
    if (body.URL) fields.push({ label: "Website", value: body.URL });
    if (body.NOTE) fields.push({ label: "Note", value: body.NOTE });
  } else {
    // Unfold RFC 2426 line continuations, then read NAME:VALUE lines.
    const lines = payload
      .replace(/\r\n[ \t]/g, "")
      .replace(/\r/g, "\n")
      .split("\n");
    const seen = new Map<string, number>();
    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator <= 0) continue;
      const rawKey = line.slice(0, separator);
      const value = clean(line.slice(separator + 1));
      if (!value) continue;
      const keyParts = rawKey.split(";");
      const key = keyParts[0].toUpperCase();
      const params = keyParts.slice(1).join(";").toUpperCase();
      const typeMatch = /TYPE=([^;]+)/.exec(params);
      const kind = typeMatch
        ? typeMatch[1].toLowerCase().replace(/"/g, "")
        : "";
      const index = (seen.get(key) ?? 0) + 1;
      seen.set(key, index);
      switch (key) {
        case "FN": {
          name = value;
          // N usually arrives first. Do not add a second "Name" row that merely
          // repeats the first — the panel keys rows by label and value.
          const existing = fields.findIndex((field) => field.label === "Name");
          if (existing >= 0) fields[existing] = { label: "Name", value };
          else fields.unshift({ label: "Name", value });
          break;
        }
        case "N": {
          const parts = value.split(";").map(clean);
          const formatted = [parts[1], parts[0]].filter(Boolean).join(" ");
          if (!name && formatted) {
            name = formatted;
            fields.unshift({ label: "Name", value: formatted });
          }
          break;
        }
        case "ORG":
          organisation = value.replace(/;/g, ", ");
          fields.push({ label: "Organisation", value: organisation });
          break;
        case "TITLE":
          title = value;
          fields.push({ label: "Title", value });
          break;
        case "TEL":
          fields.push({
            label: kind ? `Phone (${kind})` : `Phone ${index}`,
            value,
          });
          break;
        case "EMAIL":
          fields.push({ label: kind ? `Email (${kind})` : "Email", value });
          break;
        case "URL":
          fields.push({ label: "Website", value });
          break;
        case "ADR":
          fields.push({
            label: "Address",
            value: value.split(";").map(clean).filter(Boolean).join(", "),
          });
          break;
        case "NOTE":
          fields.push({ label: "Note", value });
          break;
        case "BDAY":
          fields.push({ label: "Birthday", value });
          break;
        default:
          break;
      }
    }
    if (!fields.some((field) => field.label === "Name")) {
      const fallback = fields.find((field) => field.label === "Organisation");
      if (fallback) name = fallback.value;
    }
  }

  if (!fields.length) return null;
  const summaryParts = [
    name,
    organisation !== name ? organisation : "",
    title,
  ].filter(Boolean);
  return {
    type: vcard ? "vcard" : "mecard",
    // MECARD and vCard are told apart by name: a MECARD is a collapsed
    // one-line card, and saying so is the difference between "your phone read
    // this as a contact" and "this is a vCard 3.0 payload".
    label: mecard ? LABELS.mecard : LABELS.vcard,
    summary: summaryParts.join(" · ") || "Contact card",
    primary: name || payload,
    fields,
    actions: [
      { id: "copy-contact", label: "Copy contact text" },
      { id: "copy", label: "Copy name" },
    ],
    sensitive: false,
  };
}

function recognizeEvent(payload: string): Recognition | null {
  if (!/BEGIN:VEVENT/i.test(payload)) return null;
  const get = (key: string) => {
    const match = new RegExp(`^${key}[^:\\r\\n]*:(.+)$`, "im").exec(payload);
    return match
      ? clean(match[1].replace(/\\,/g, ",").replace(/\\n/gi, " "))
      : "";
  };
  const fields: Field[] = [];
  const summary = get("SUMMARY");
  if (summary) fields.push({ label: "Title", value: summary });
  const start = get("DTSTART");
  if (start) fields.push({ label: "Starts", value: formatIcalDate(start) });
  const end = get("DTEND") || get("DTEND;VALUE=DATE");
  if (end) fields.push({ label: "Ends", value: formatIcalDate(end) });
  const location = get("LOCATION");
  if (location) fields.push({ label: "Location", value: location });
  const description = get("DESCRIPTION");
  if (description) fields.push({ label: "Description", value: description });
  if (!fields.length) return null;
  return {
    type: "event",
    label: LABELS.event,
    summary: summary
      ? `${summary}${start ? ` · ${formatIcalDate(start)}` : ""}`
      : "Calendar event",
    primary: payload,
    fields,
    actions: [{ id: "copy-event", label: "Copy event (.ics)" }],
    sensitive: false,
  };
}

/** 20261104T140000Z → "4 Nov 2026, 14:00 UTC" (never a locale-guess). */
export function formatIcalDate(raw: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(
    raw.trim(),
  );
  if (!match) return raw;
  const [, year, month, day, hour, minute, , utc] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour ?? 0),
      Number(minute ?? 0),
    ),
  );
  if (Number.isNaN(date.getTime())) return raw;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: hour ? "2-digit" : undefined,
    minute: hour ? "2-digit" : undefined,
    timeZone: "UTC",
  }).format(date);
  return hour ? `${formatted}${utc ? " UTC" : ""}` : formatted;
}

function recognizeGeo(payload: string): Recognition | null {
  const match = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(payload);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const query = /[?&]q=([^&]+)/.exec(payload)?.[1];
  const fields: Field[] = [
    { label: "Latitude", value: String(latitude) },
    { label: "Longitude", value: String(longitude) },
  ];
  if (query) fields.push({ label: "Label", value: decodeURIComponent(query) });
  return {
    type: "geo",
    label: LABELS.geo,
    summary: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    primary: `${latitude},${longitude}`,
    fields,
    actions: [
      { id: "copy-address", label: "Copy coordinates" },
      {
        id: "open-maps",
        label: "Open in OpenStreetMap",
        href: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
      },
    ],
    sensitive: false,
  };
}

function recognizeEmail(payload: string): Recognition | null {
  const mailto = /^mailto:([^?]+)(?:\?(.*))?$/i.exec(payload);
  const plain = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload);
  if (!mailto && !plain) return null;
  const address = mailto ? decodeURIComponent(mailto[1]) : payload;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return null;
  const params = new URLSearchParams(mailto?.[2] ?? "");
  const subject = params.get("subject");
  const body = params.get("body");
  const fields: Field[] = [{ label: "Address", value: address }];
  if (subject) fields.push({ label: "Subject", value: subject });
  if (body) fields.push({ label: "Message", value: body });
  const href = `mailto:${encodeURIComponent(address)}${
    subject ? `?subject=${encodeURIComponent(subject)}` : ""
  }`;
  return {
    type: "email",
    label: LABELS.email,
    summary: subject ? `${address} · ${subject}` : address,
    primary: address,
    fields,
    actions: [
      { id: "copy-email", label: "Copy email address" },
      { id: "compose-email", label: "Compose in mail app", href },
    ],
    sensitive: false,
  };
}

function recognizePhone(payload: string): Recognition | null {
  const tel = /^tel:(\+?[0-9().\-\s]{5,})$/i.exec(payload);
  const plain = /^\+?[0-9][0-9().\-\s]{4,20}$/.test(payload);
  if (!tel && !plain) return null;
  const number = clean(tel ? tel[1] : payload);
  const digits = number.replace(/\D/g, "");
  // A phone number carries structure: an international prefix, separators, or
  // enough digits to be one. A bare 7–14 digit run is far more likely a product
  // barcode or an account number, so it is left to recogniseProduct.
  const structured = /^\+/.test(number) || /[\s().\-]/.test(number);
  if (digits.length < 7) return null;
  if (
    !structured &&
    (digits.length < 9 || [8, 12, 13, 14].includes(digits.length))
  )
    return null;
  return {
    type: "phone",
    label: LABELS.phone,
    summary: number,
    primary: number,
    fields: [{ label: "Number", value: number }],
    actions: [
      { id: "copy-phone", label: "Copy phone number" },
      {
        id: "dial",
        label: "Open dialler",
        href: `tel:${number.replace(/\s/g, "")}`,
      },
    ],
    sensitive: false,
  };
}

function recognizeSms(payload: string): Recognition | null {
  const sms = /^sms:(\+?[0-9().\-\s]*)(?:\?(?:body|subject)=([^&]*))?/i.exec(
    payload,
  );
  const smsto = /^SMSTO:([^:]+):(.*)$/i.exec(payload);
  if (!sms && !smsto) return null;
  const number = clean(sms ? sms[1] : smsto![1]);
  const body = sms ? decodeURIComponent(sms[2] ?? "") : clean(smsto![2]);
  if (!number.replace(/\D/g, "")) return null;
  const fields: Field[] = [{ label: "Number", value: number }];
  if (body) fields.push({ label: "Message", value: body });
  return {
    type: "sms",
    label: LABELS.sms,
    summary: body ? `SMS to ${number}: ${body}` : `SMS to ${number}`,
    primary: body || number,
    fields,
    actions: [
      { id: "copy-sms", label: "Copy message" },
      { id: "copy-phone", label: "Copy phone number" },
    ],
    sensitive: false,
  };
}

function recognizeWhatsapp(payload: string): Recognition | null {
  const match =
    /^https?:\/\/(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/([^\s?]+)(?:\?([^#]*))?/i.exec(
      payload,
    );
  if (!match) return null;
  const path = match[1];
  const params = new URLSearchParams(match[2] ?? "");
  const isChannel = /^channel\//i.test(path);
  const phone = isChannel ? "" : path.replace(/\D/g, "");
  const text = params.get("text") ?? "";
  const fields: Field[] = [];
  if (isChannel)
    fields.push({ label: "Channel", value: path.replace(/^channel\//i, "") });
  else if (phone) fields.push({ label: "Phone number", value: `+${phone}` });
  if (text) fields.push({ label: "Prefilled message", value: text });
  return {
    type: "whatsapp",
    label: LABELS.whatsapp,
    summary: isChannel
      ? `WhatsApp channel ${path.replace(/^channel\//i, "")}`
      : `WhatsApp ${phone ? `+${phone}` : "message"}`,
    primary: text || (phone ? `+${phone}` : payload),
    fields,
    actions: [
      { id: "copy", label: "Copy link" },
      { id: "open-url", label: "Open WhatsApp link", href: payload },
    ],
    sensitive: false,
  };
}

function recognizeSocial(host: string, payload: string): Recognition | null {
  const match = Object.keys(SOCIAL_HOSTS).find((candidate) =>
    matchesHost(host, candidate),
  );
  if (!match) return null;
  const network = SOCIAL_HOSTS[match];
  let handle = "";
  try {
    const url = new URL(payload);
    const segments = url.pathname.split("/").filter(Boolean);
    if (match === "youtu.be") handle = segments[0] ?? "";
    else if (match === "t.me") handle = segments[0] ?? "";
    else
      handle =
        segments.find(
          (segment) => !["in", "profile.php", "pages"].includes(segment),
        ) ?? "";
    if (match === "linkedin.com" && segments[0] === "in")
      handle = segments[1] ?? "";
  } catch {
    handle = "";
  }
  return {
    type: "social",
    label: LABELS.social,
    summary: handle ? `${network} · ${handle.replace(/^@/, "")}` : network,
    primary: payload,
    fields: [
      { label: "Network", value: network },
      ...(handle
        ? [{ label: "Profile", value: handle.replace(/^@/, "") }]
        : []),
      { label: "Link", value: payload },
    ],
    actions: [
      { id: "copy", label: "Copy profile link" },
      { id: "open-url", label: `Open on ${network}`, href: payload },
    ],
    sensitive: false,
  };
}

function recognizeApp(host: string, payload: string): Recognition | null {
  const match = Object.keys(APP_HOSTS).find((candidate) =>
    matchesHost(host, candidate),
  );
  if (!match) return null;
  const store = APP_HOSTS[match];
  let appId = "";
  try {
    const url = new URL(payload);
    appId =
      url.searchParams.get("id") ??
      url.pathname.split("/").filter(Boolean).pop() ??
      "";
  } catch {
    appId = "";
  }
  return {
    type: "app",
    label: LABELS.app,
    summary: appId ? `${store} · ${appId}` : store,
    primary: payload,
    fields: [
      { label: "Store", value: store },
      ...(appId ? [{ label: "App ID", value: appId }] : []),
      { label: "Link", value: payload },
    ],
    actions: [
      { id: "copy", label: "Copy store link" },
      { id: "open-url", label: `Open ${store}`, href: payload },
    ],
    sensitive: false,
  };
}

function recognizeEncryptedVault(payload: string): Recognition | null {
  if (!payload.startsWith(DIRECT_ENCRYPTED_PREFIX)) return null;
  const info = inspectEncryptedEnvelope(payload);
  const fields: Field[] = [
    {
      label: "Encryption",
      value: "AES-256-GCM + PBKDF2-HMAC-SHA256 (128-bit Auth Tag)",
    },
  ];
  if (info?.hint) fields.push({ label: "Passphrase hint", value: info.hint });
  if (info?.issuedAtSec) {
    fields.push({
      label: "Encrypted at",
      value: new Date(info.issuedAtSec * 1000).toUTCString(),
    });
  }
  if (info?.expiresAtSec) {
    fields.push({
      label: "Expires at",
      value: new Date(info.expiresAtSec * 1000).toUTCString(),
    });
  }
  return {
    type: "text",
    label: "Encrypted QR Vault (AES-256-GCM)",
    summary: info?.hint
      ? `AES-256-GCM Vault · Hint: ${info.hint}`
      : "AES-256-GCM Password-Locked QR Vault",
    primary: payload,
    fields,
    actions: [{ id: "copy", label: "Copy encrypted token" }],
    sensitive: true,
  };
}

function recognizeUrl(payload: string): Recognition | null {
  if (!URL_PATTERN.test(payload)) return null;
  if (isQuickkitEncryptedTemplateUrl(payload)) {
    const syncSec = inspectQrPayloadSecuritySync(payload);
    const isAutoKey = syncSec.kind === "encrypted-fragment";
    const fields: Field[] = [
      {
        label: "Encryption",
        value: isAutoKey
          ? "AES-256-GCM Zero-Knowledge (#k= URL Fragment Key)"
          : "AES-256-GCM + PBKDF2-HMAC-SHA256 Passphrase Vault",
      },
    ];
    if (syncSec.signerFingerprint) {
      fields.push({
        label: "ECDSA P-256 Signer",
        value: syncSec.signerFingerprint,
      });
    }
    if (syncSec.hint) {
      fields.push({ label: "Passphrase hint", value: syncSec.hint });
    }
    if (syncSec.expiresAtSec) {
      fields.push({
        label: "Expires at",
        value: new Date(syncSec.expiresAtSec * 1000).toUTCString(),
      });
    }
    fields.push({
      label: "Encrypted Link",
      value: payload,
      sensitive: isAutoKey,
    });
    return {
      type: "url",
      label: "Encrypted Data Template (AES-256-GCM)",
      summary: isAutoKey
        ? "Zero-Knowledge AES-256-GCM Data Card"
        : syncSec.hint
          ? `AES-256-GCM Locked Card · Hint: ${syncSec.hint}`
          : "AES-256-GCM Password-Locked Data Card",
      primary: payload,
      fields,
      actions: [
        { id: "copy", label: "Copy encrypted link" },
        {
          id: "open-url",
          label: isAutoKey ? "Open Data Template" : "Unlock Data Template",
          href: payload,
        },
      ],
      sensitive: true,
    };
  }
  if (isQuickkitDataTemplateUrl(payload)) {
    const decoded = decodeDataTemplate(payload);
    if (decoded.ok) {
      const { model } = decoded;
      const syncSec = inspectQrPayloadSecuritySync(payload);
      const summary = model.subheadline
        ? `${model.headline} · ${model.subheadline}`
        : model.headline;
      return {
        type: "url",
        label: `Data Template · ${model.badge}`,
        summary: summary.length > 90 ? `${summary.slice(0, 89)}…` : summary,
        primary: payload,
        fields: [
          ...model.fields.map((field) => ({
            label: field.label,
            value: field.value,
            ...(field.secret ? { sensitive: true } : {}),
          })),
          ...(syncSec.signerFingerprint
            ? [
                {
                  label: "Security Seal",
                  value: `ECDSA P-256 · ${syncSec.signerFingerprint}`,
                },
              ]
            : []),
          { label: "Template Link", value: payload },
        ],
        actions: [
          { id: "copy", label: "Copy template link" },
          { id: "open-url", label: "Open Data Template", href: payload },
        ],
        sensitive: model.fields.some((field) => Boolean(field.secret)),
      };
    }
  }
  const host = hostOf(payload);
  const social = host ? recognizeSocial(host, payload) : null;
  if (social) return social;
  const app = host ? recognizeApp(host, payload) : null;
  if (app) return app;
  let path = "";
  let protocol = "";
  let port = "";
  let query = "";
  let fragment = "";
  try {
    const url = new URL(payload);
    path = url.pathname === "/" ? "" : url.pathname;
    protocol = url.protocol.replace(":", "").toUpperCase();
    port = url.port;
    query = url.search ? url.search.slice(1) : "";
    fragment = url.hash ? url.hash.slice(1) : "";
  } catch {
    /* hostOf already validated it; nothing to add */
  }
  return {
    type: "url",
    label: LABELS.url,
    summary: payload.length > 90 ? `${payload.slice(0, 89)}…` : payload,
    primary: payload,
    fields: [
      ...(host ? [{ label: "Host", value: host }] : []),
      ...(port ? [{ label: "Port", value: port }] : []),
      ...(path ? [{ label: "Path", value: safeDecodeUri(path) }] : []),
      ...(query ? [{ label: "Query", value: safeDecodeUri(query) }] : []),
      ...(fragment
        ? [{ label: "Fragment", value: safeDecodeUri(fragment) }]
        : []),
      ...(protocol ? [{ label: "Scheme", value: protocol }] : []),
    ],
    // No "open" action here by design: opening is offered only after the
    // security panel has run and the user has explicitly confirmed.
    actions: [{ id: "copy", label: "Copy link" }],
    sensitive: false,
  };
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Uppercase alphanumeric payload that looks like a GTIN/EAN/UPC barcode. */
function recognizeProduct(payload: string): Recognition | null {
  if (!/^\d{8}$|^\d{12,14}$/.test(payload)) return null;
  const scheme =
    payload.length === 8
      ? "EAN-8"
      : payload.length === 12
        ? "UPC-A"
        : payload.length === 13
          ? "EAN-13"
          : "GTIN-14";
  let sum = 0;
  // Validate the GTIN check digit: the last digit is the check digit.
  const digits = payload.split("").map(Number);
  const check = digits.pop()!;
  digits.reverse().forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? 3 : 1);
  });
  const valid = (10 - (sum % 10)) % 10 === check;
  return {
    type: "product",
    label: LABELS.product,
    summary: `${scheme} ${payload}${valid ? "" : " (check digit does not match)"}`,
    primary: payload,
    fields: [
      { label: "Format", value: scheme },
      { label: "Value", value: payload },
      { label: "Check digit", value: valid ? "Valid" : "Invalid" },
    ],
    actions: [{ id: "copy", label: "Copy identifier" }],
    sensitive: false,
  };
}

/**
 * Recognise a decoded payload.
 *
 * Order matters: structured grammars are tried before generic ones so a vCard
 * containing a URL is reported as a contact, not a link.
 */
export function recognize(payload: string): Recognition {
  const text = payload;
  const trimmed = payload.trim();

  const recognisers: (() => Recognition | null)[] = [
    () => recognizeEncryptedVault(trimmed),
    () => recognizeWifi(trimmed),
    () => recognizeVcard(trimmed),
    () => recognizeEvent(trimmed),
    () => recognizeGeo(trimmed),
    () => recognizeWhatsapp(trimmed),
    () => recognizePayment(trimmed),
    () => recognizeCrypto(trimmed),
    () => recognizeSms(trimmed),
    () => recognizeEmail(trimmed),
    () => recognizePhone(trimmed),
    () => recognizeUrl(trimmed),
    () => recognizeProduct(trimmed),
  ];

  for (const attempt of recognisers) {
    try {
      const result = attempt();
      if (result) return result;
    } catch {
      // A malformed payload must fall through, never crash the results panel.
    }
  }

  // A URI with an unrecognised scheme is genuinely "unknown"; ordinary prose is
  // simply text. Conflating the two would either mislabel prose or overstate
  // what was recognised.
  const scheme = /^([a-z][a-z0-9+.-]{1,31}):/i.exec(trimmed);
  return {
    type: scheme ? "unknown" : "text",
    label: scheme ? LABELS.unknown : LABELS.text,
    summary:
      trimmed.length > 120
        ? `${trimmed.slice(0, 119)}…`
        : trimmed || "(empty payload)",
    primary: text,
    fields: [
      ...(scheme ? [{ label: "Scheme", value: scheme[1] }] : []),
      { label: "Length", value: `${text.length} characters` },
    ],
    actions: [{ id: "copy", label: "Copy content" }],
    sensitive: false,
  };
}

export const contentTypeLabel = (type: ContentTypeId) => LABELS[type];
export { LABELS as contentLabels };

/**
 * Build a zero-server `#c=…` QR Generator studio link from a scanned QR payload
 * so the user can re-style, sign, encrypt or print any scanned QR in one click.
 */
export function buildStudioCustomizeHref(
  payload: string,
  givenRecognition?: Recognition,
): string | null {
  const trimmed = payload.trim();
  if (!trimmed || trimmed.length > 1400) return null;
  const rec = givenRecognition ?? recognize(trimmed);
  if (rec.sensitive) return null;

  const findField = (label: string) =>
    rec.fields.find((f) => f.label === label)?.value ?? "";

  let typeId: QrContentTypeId = "text";
  let values: Record<string, string | boolean> = { text: trimmed };

  if (rec.type === "url" || rec.type === "social" || rec.type === "app") {
    typeId = "url";
    values = { url: trimmed };
  } else if (rec.type === "payment" && /^upi:\/\//i.test(trimmed)) {
    typeId = "payment";
    values = {
      method: "upi",
      payeeName: findField("Payee name") || "Merchant",
      upiId: findField("Payee address (VPA)"),
      amount: findField("Amount"),
      currency: findField("Currency") || "INR",
      note: findField("Note"),
    };
  } else if (rec.type === "email") {
    typeId = "email";
    values = {
      to: findField("To") || rec.primary,
      subject: findField("Subject"),
      body: findField("Body"),
    };
  } else if (rec.type === "phone") {
    typeId = "phone";
    values = { phone: rec.primary };
  } else if (rec.type === "sms") {
    typeId = "sms";
    values = {
      phone: findField("Number"),
      body: findField("Message"),
    };
  } else if (rec.type === "geo") {
    const lat = findField("Latitude");
    const lon = findField("Longitude");
    if (lat && lon) {
      typeId = "location";
      values = { latitude: lat, longitude: lon, label: findField("Query") };
    }
  }

  try {
    const encoded = encodeShareConfig({
      typeId,
      values,
      design: defaultDesign(),
    });
    return `/tools/qr-generator#c=${encoded}`;
  } catch {
    return null;
  }
}
