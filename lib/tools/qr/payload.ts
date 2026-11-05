/**
 * QR content types: field schemas, validation and payload builders.
 *
 * Every builder is a pure string function, so the exact bytes that end up in
 * the symbol can be unit-tested and decoded back in tests.
 * Nothing here touches the network, and no user content is ever eval'd.
 */
import { QrUserError, type QrContentTypeId } from "./types";

export type QrFieldInputType =
  | "text"
  | "textarea"
  | "url"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "time"
  | "datetime-local"
  | "select"
  | "checkbox"
  | "password";

export type QrField = {
  key: string;
  label: string;
  type: QrFieldInputType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** maxLength in characters for the input itself. */
  max?: number;
  defaultValue?: string | boolean;
  half?: boolean;
  /** Secrets are never written to history, presets or share links. */
  sensitive?: boolean;
};

export type QrValues = Record<string, string | boolean>;

/* ------------------------------------------------------------------ helpers */

// Accepts multi-label domains (hello@mail.example.com) but not empty or
// consecutive-dot labels. Purely additive over the original single-dot rule.
const EMAIL_RE = /^[^\s@,;"]+@([^\s@,;".]+\.)+[a-z]{2,63}$/i;
const PHONE_RE = /^\+?[0-9][0-9 ()\-./]{2,22}$/;
const PACKAGE_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/i;
const USERNAME_RE = /^[A-Za-z0-9._-]{1,80}$/;

export function isHttpUrl(raw: string) {
  try {
    const url = new URL(raw);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * Accept what a person typed as a link and make it safe to encode.
 * Rejects every scheme that could execute or leak (javascript:, data:, …).
 */
export function normalizeUrl(raw: string, field = "url"): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new QrUserError("Enter a web address.", field);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed))
    throw new QrUserError(
      "Only http:// and https:// links can be encoded — other schemes can run code or leak data.",
      field,
    );
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new QrUserError("That web address could not be read.", field);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new QrUserError(
      "Only http:// and https:// links can be encoded.",
      field,
    );
  if (url.username || url.password)
    throw new QrUserError(
      "Remove the username and password from the link — never put credentials in a QR code.",
      field,
    );
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    throw new QrUserError(
      "This points at your own machine, which nobody else can open. Enter a public address.",
      field,
    );
  if (!url.hostname.includes(".") && !/^[0-9.]+$/.test(url.hostname))
    throw new QrUserError(
      "Add a full domain (for example example.com), not just a name.",
      field,
    );
  return url.toString().replace(/\/$/, "") === `${url.origin}/`
    ? url.origin + (url.pathname === "/" ? "" : url.pathname)
    : url.toString();
}

export function requireValue(values: QrValues, key: string, label: string) {
  const raw = String(values[key] ?? "").trim();
  if (!raw) throw new QrUserError(`${label} is required.`, key);
  return raw;
}

export function value(values: QrValues, key: string) {
  const raw = values[key];
  return typeof raw === "string" ? raw.trim() : "";
}

export function flag(values: QrValues, key: string) {
  return values[key] === true || values[key] === "true";
}

export function requireEmail(values: QrValues, key: string, label: string) {
  const raw = value(values, key);
  if (!raw) throw new QrUserError(`${label} is required.`, key);
  if (!EMAIL_RE.test(raw))
    throw new QrUserError(
      `Enter a valid email address (${raw.slice(0, 40)}).`,
      key,
    );
  return raw;
}

export function optionalEmail(values: QrValues, key: string, label: string) {
  const raw = value(values, key);
  if (!raw) return "";
  if (!EMAIL_RE.test(raw))
    throw new QrUserError(`${label} is not a valid email.`, key);
  return raw;
}

/** Keep only the characters a tel: URI may carry. */
export function normalizePhone(
  raw: string,
  key: string,
  label = "Phone number",
) {
  const trimmed = raw.trim();
  if (!trimmed) throw new QrUserError(`${label} is required.`, key);
  if (!PHONE_RE.test(trimmed))
    throw new QrUserError(
      `Use digits, spaces and +, - ( ) only, 3–23 characters — for example +91 98765 43210.`,
      key,
    );
  const digits = trimmed.replace(/[^\d+]/g, "");
  const bare = digits.replace(/\+/g, "");
  if (bare.length < 3 || bare.length > 15)
    throw new QrUserError(
      "A phone number needs 3–15 digits (country code included for + numbers).",
      key,
    );
  return trimmed.startsWith("+") ? `+${bare}` : bare;
}

function phoneOrEmpty(raw: string, key: string, label: string) {
  if (!raw.trim()) return "";
  return normalizePhone(raw, key, label);
}

const enc = (text: string) => encodeURIComponent(text);

/* ------------------------------------------------------------- text escaping */

/** ISO 18004 / WPA escaping for the WIFI: payload. */
export function escapeWifi(text: string) {
  return text.replace(/([\\;,:"])/g, "\\$1");
}

/** vCard 3.0 TEXT escaping. */
export function escapeVCard(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a vCalendar line at 75 octets (CRLF + one space), as RFC 5545 asks. */
export function foldLine(line: string, limit = 75) {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= limit) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let budget = limit;
  for (const char of line) {
    const size = bytes.encode(char).length;
    if (currentBytes + size > budget) {
      parts.push(current);
      current = char;
      currentBytes = size;
      budget = limit - 1; // continuation lines start with a space
    } else {
      current += char;
      currentBytes += size;
    }
  }
  if (current) parts.push(current);
  return parts.join("\r\n ");
}

const crlf = (lines: string[]) =>
  lines.filter((line) => line !== null && line !== undefined).join("\r\n");

function pushField(
  lines: string[],
  property: string,
  raw: string,
  params = "",
  multiline = false,
) {
  const text = raw.trim();
  if (!text) return;
  const escaped = multiline
    ? text
        .replace(/\r\n|\r/g, "\n")
        .split("\n")
        .map((part) => escapeVCard(part))
        .join("\\n")
    : escapeVCard(text);
  lines.push(foldLine(`${property}${params}:${escaped}`));
}

/* ------------------------------------------------------------- ical helpers */

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function splitDateTime(raw: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      raw.trim(),
    );
  if (!match)
    throw new QrUserError(
      "Use a date and time picker value, for example 2026-05-01T18:30.",
      "start",
    );
  const [, y, m, d, hh, mm, ss] = match;
  return {
    y,
    m,
    d,
    hh,
    mm,
    ss: ss ?? "00",
    ms: Date.UTC(+y, +m - 1, +d, +hh, +mm, +(ss ?? 0)),
  };
}

function isRealDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function icalDate(raw: string, key: string, label: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) throw new QrUserError(`${label} must be a calendar date.`, key);
  const [, y, m, d] = match.map(Number);
  if (!isRealDate(y, m, d))
    throw new QrUserError(`${label} is not a real date (${raw}).`, key);
  // Padded: an unpadded month or day would produce a 7-character VALUE=DATE.
  return `${y}${pad(m)}${pad(d)}`;
}

/** RFC 5545 stamp, used for DTSTAMP and shareable IDs. */
export function icalStamp(date = new Date()) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/* ------------------------------------------------------------- field schemas */

const URL_FIELDS: QrField[] = [
  {
    key: "url",
    label: "Web address",
    type: "text",
    required: true,
    placeholder: "example.com/pricing?src=qr",
    help: "http:// or https:// only. The link is never opened or fetched by QUICKKIT.",
    max: 2000,
  },
];

const TEXT_FIELDS: QrField[] = [
  {
    key: "text",
    label: "Text to encode",
    type: "textarea",
    required: true,
    placeholder: "Anything you want the scanner to read…",
    max: 2500,
  },
];

const EMAIL_FIELDS: QrField[] = [
  {
    key: "to",
    label: "Recipient",
    type: "email",
    required: true,
    placeholder: "name@example.com",
    half: true,
  },
  {
    key: "cc",
    label: "Copy (optional)",
    type: "text",
    placeholder: "boss@example.com",
    half: true,
    max: 300,
  },
  {
    key: "subject",
    label: "Subject",
    type: "text",
    placeholder: "Welcome!",
    max: 300,
    half: true,
  },
  {
    key: "body",
    label: "Message",
    type: "textarea",
    placeholder: "Hi there…",
    max: 1200,
  },
];

const PHONE_FIELDS: QrField[] = [
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
    required: true,
    placeholder: "+91 98765 43210",
    help: "Include the country code so the number works for travellers.",
    max: 24,
  },
];

const SMS_FIELDS: QrField[] = [
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
    required: true,
    placeholder: "+1 555 010 9876",
    half: true,
    max: 24,
  },
  {
    key: "message",
    label: "Pre-filled message",
    type: "textarea",
    placeholder: "Hi! I'm scanning your QR code.",
    max: 900,
  },
];

const WHATSAPP_FIELDS: QrField[] = [
  {
    key: "phone",
    label: "WhatsApp number",
    type: "tel",
    required: true,
    placeholder: "+91 98765 43210",
    half: true,
    max: 24,
    help: "Digits only after the +, no spaces when dialling.",
  },
  {
    key: "message",
    label: "Pre-filled message",
    type: "textarea",
    placeholder: "Hello from your QR code!",
    max: 900,
  },
];

const WIFI_FIELDS: QrField[] = [
  {
    key: "ssid",
    label: "Network name (SSID)",
    type: "text",
    required: true,
    placeholder: "Café Wi-Fi",
    max: 120,
    half: true,
  },
  {
    key: "password",
    label: "Password",
    type: "password",
    placeholder: "network password",
    max: 120,
    sensitive: true,
    half: true,
  },
  {
    key: "encryption",
    label: "Security",
    type: "select",
    defaultValue: "WPA",
    options: [
      { value: "WPA", label: "WPA / WPA2 / WPA3 (most networks)" },
      { value: "WEP", label: "WEP (legacy)" },
      { value: "nopass", label: "Open network (no password)" },
    ],
    half: true,
  },
  {
    key: "hidden",
    label: "Hidden network",
    type: "checkbox",
    defaultValue: false,
    half: true,
  },
  {
    key: "eap",
    label: "Enterprise authentication (optional)",
    type: "select",
    defaultValue: "",
    options: [
      { value: "", label: "None — personal network" },
      { value: "tls", label: "EAP-TLS" },
      { value: "ttls", label: "PEAP / EAP-TTLS" },
      { value: "pwd", label: "EAP-PWD" },
    ],
    help: "Only add this for company or campus networks that ask for a username.",
    half: true,
  },
  {
    key: "identity",
    label: "Username (enterprise only)",
    type: "text",
    placeholder: "student01",
    half: true,
    max: 80,
  },
];

const VCARD_FIELDS: QrField[] = [
  {
    key: "firstName",
    label: "First name",
    type: "text",
    required: true,
    half: true,
    max: 80,
  },
  { key: "lastName", label: "Last name", type: "text", half: true, max: 80 },
  { key: "org", label: "Company", type: "text", half: true, max: 120 },
  { key: "title", label: "Job title", type: "text", half: true, max: 120 },
  { key: "mobile", label: "Mobile", type: "tel", half: true, max: 24 },
  { key: "workPhone", label: "Work phone", type: "tel", half: true, max: 24 },
  { key: "email", label: "Email", type: "email", half: true, max: 120 },
  {
    key: "website",
    label: "Website",
    type: "text",
    placeholder: "example.com",
    half: true,
    max: 300,
  },
  {
    key: "street",
    label: "Street address",
    type: "text",
    half: true,
    max: 160,
  },
  { key: "city", label: "City", type: "text", half: true, max: 80 },
  { key: "region", label: "State / region", type: "text", half: true, max: 80 },
  { key: "postal", label: "Postcode", type: "text", half: true, max: 20 },
  { key: "country", label: "Country", type: "text", half: true, max: 60 },
  { key: "note", label: "Note", type: "textarea", max: 400 },
];

const LOCATION_FIELDS: QrField[] = [
  {
    key: "latitude",
    label: "Latitude",
    type: "text",
    required: true,
    placeholder: "19.0760",
    half: true,
    max: 16,
  },
  {
    key: "longitude",
    label: "Longitude",
    type: "text",
    required: true,
    placeholder: "72.8777",
    half: true,
    max: 16,
  },
  {
    key: "format",
    label: "Link style",
    type: "select",
    defaultValue: "geo",
    options: [
      { value: "geo", label: "geo: URI — opens the phone's maps app" },
      { value: "maps", label: "Google Maps link — always opens a browser" },
      { value: "mapsapp", label: "Google Maps app link (maps.google.com/?q=)" },
    ],
    half: true,
  },
  {
    key: "label",
    label: "Place name (optional)",
    type: "text",
    placeholder: "Rooftop café, Bandra",
    half: true,
    max: 120,
  },
  {
    key: "zoom",
    label: "Zoom level",
    type: "number",
    defaultValue: "16",
    half: true,
    max: 3,
  },
];

const EVENT_FIELDS: QrField[] = [
  {
    key: "title",
    label: "Event title",
    type: "text",
    required: true,
    placeholder: "Design review",
    max: 140,
  },
  {
    key: "startDate",
    label: "Starts",
    type: "datetime-local",
    required: true,
    half: true,
  },
  { key: "endDate", label: "Ends", type: "datetime-local", half: true },
  {
    key: "allDay",
    label: "All-day event",
    type: "checkbox",
    defaultValue: false,
    half: true,
  },
  { key: "date", label: "Date (all-day)", type: "date", half: true },
  {
    key: "endDateAllDay",
    label: "Last day (all-day)",
    type: "date",
    half: true,
  },
  {
    key: "location",
    label: "Location",
    type: "text",
    placeholder: "Room 4 / Meet link",
    max: 200,
    half: true,
  },
  { key: "description", label: "Description", type: "textarea", max: 600 },
  {
    key: "timezone",
    label: "Time handling",
    type: "select",
    defaultValue: "local",
    options: [
      { value: "local", label: "Use the scanner's local time (floating)" },
      { value: "utc", label: "Pin to UTC — exact minute everywhere" },
    ],
    help: "QUICKKIT has no browser time-zone database, so a named zone (Asia/Kolkata) is not embedded.",
    half: true,
  },
];

const SOCIAL_FIELDS: QrField[] = [
  {
    key: "platform",
    label: "Platform",
    type: "select",
    defaultValue: "instagram",
    options: [
      { value: "instagram", label: "Instagram" },
      { value: "x", label: "X (Twitter)" },
      { value: "facebook", label: "Facebook" },
      { value: "linkedin", label: "LinkedIn profile" },
      { value: "linkedinCompany", label: "LinkedIn company page" },
      { value: "youtube", label: "YouTube" },
      { value: "tiktok", label: "TikTok" },
      { value: "snapchat", label: "Snapchat" },
      { value: "threads", label: "Threads" },
      { value: "pinterest", label: "Pinterest" },
      { value: "github", label: "GitHub" },
      { value: "telegram", label: "Telegram" },
      { value: "whatsapp", label: "WhatsApp chat" },
      { value: "custom", label: "Any other profile URL" },
    ],
    half: true,
  },
  {
    key: "username",
    label: "Username or page name",
    type: "text",
    required: true,
    placeholder: "quickkit.tools",
    help: "No @ sign needed. A full URL is used exactly as typed.",
    half: true,
    max: 120,
  },
];

const APP_FIELDS: QrField[] = [
  {
    key: "store",
    label: "Store",
    type: "select",
    defaultValue: "ios",
    options: [
      { value: "ios", label: "App Store (Apple)" },
      { value: "android", label: "Google Play" },
      { value: "amazon", label: "Amazon Appstore" },
      { value: "custom", label: "Other store / smart link" },
    ],
    half: true,
  },
  {
    key: "appId",
    label: "Apple App ID",
    type: "text",
    placeholder: "6440000000",
    help: "The number from your App Store URL (…/app/id6440000000).",
    half: true,
    max: 40,
  },
  {
    key: "packageName",
    label: "Android package name",
    type: "text",
    placeholder: "com.example.app",
    half: true,
    max: 120,
  },
  {
    key: "url",
    label: "Store or landing-page URL",
    type: "text",
    placeholder: "https://quickkit.page.link/app",
    help: "Used when a code must serve every platform. One code, one destination.",
    max: 500,
  },
];

/* --------------------------------------------- V3 destination-link fields */

/** Shared single-URL field used by the destination-link content types. */
function linkField(
  key: string,
  label: string,
  placeholder: string,
  help: string,
): QrField {
  return {
    key,
    label,
    type: "text",
    required: true,
    placeholder,
    help,
    max: 2000,
  };
}

const INSTAGRAM_FIELDS: QrField[] = [
  {
    key: "username",
    label: "Instagram username",
    type: "text",
    required: true,
    placeholder: "quickkit.tools",
    help: "No @ needed. A full instagram.com profile URL is used exactly as typed.",
    max: 120,
  },
];

const FACEBOOK_FIELDS: QrField[] = [
  {
    key: "page",
    label: "Facebook page name or URL",
    type: "text",
    required: true,
    placeholder: "quickkit.tools",
    help: "The page name from facebook.com/yourpage, or paste the full page URL.",
    max: 200,
  },
];

const YOUTUBE_FIELDS: QrField[] = [
  {
    key: "channel",
    label: "YouTube handle or channel URL",
    type: "text",
    required: true,
    placeholder: "@quickkit",
    help: "A @handle, a UC… channel ID, or a full youtube.com channel URL.",
    max: 200,
  },
];

const SPOTIFY_FIELDS: QrField[] = [
  linkField(
    "url",
    "Spotify or music link",
    "https://open.spotify.com/playlist/…",
    "Paste a Spotify link (track, album, playlist, artist, episode or show) or any https music page. The link is never opened by QUICKKIT.",
  ),
];

const GMAPS_FIELDS: QrField[] = [
  {
    key: "mode",
    label: "How to locate it",
    type: "select",
    defaultValue: "place",
    options: [
      { value: "place", label: "Place name or address" },
      { value: "coords", label: "Latitude / longitude" },
      { value: "url", label: "Paste a Google Maps link" },
    ],
    half: true,
  },
  {
    key: "place",
    label: "Place name or address",
    type: "text",
    placeholder: "Café Aurora, Bandra, Mumbai",
    half: true,
    max: 300,
  },
  {
    key: "latitude",
    label: "Latitude",
    type: "text",
    placeholder: "19.0760",
    half: true,
    max: 16,
  },
  {
    key: "longitude",
    label: "Longitude",
    type: "text",
    placeholder: "72.8777",
    half: true,
    max: 16,
  },
  {
    key: "url",
    label: "Google Maps link",
    type: "text",
    placeholder: "https://maps.app.goo.gl/…",
    help: "A google.com/maps, maps.app.goo.gl or goo.gl/maps link. Never fetched.",
    max: 2000,
  },
];

const GREVIEW_FIELDS: QrField[] = [
  {
    key: "placeId",
    label: "Google Place ID",
    type: "text",
    placeholder: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    help: "From the Google Place ID finder, or your Business Profile. Builds a write-a-review link.",
    half: true,
    max: 200,
  },
  {
    key: "url",
    label: "…or paste a review link",
    type: "text",
    placeholder: "https://g.page/your-business/review",
    help: "A g.page/…/review or search.google.com/local/writereview link. Used if no Place ID is given.",
    max: 2000,
  },
];

const BUSINESS_FIELDS: QrField[] = [
  {
    key: "company",
    label: "Business name",
    type: "text",
    required: true,
    placeholder: "Aurora Café",
    half: true,
    max: 120,
  },
  {
    key: "contactName",
    label: "Contact person",
    type: "text",
    placeholder: "Ada Lovelace",
    half: true,
    max: 120,
  },
  {
    key: "title",
    label: "Job title",
    type: "text",
    placeholder: "Owner",
    half: true,
    max: 120,
  },
  {
    key: "website",
    label: "Website",
    type: "text",
    required: true,
    placeholder: "auroracafe.com",
    half: true,
    max: 300,
  },
  { key: "phone", label: "Phone", type: "tel", half: true, max: 24 },
  { key: "email", label: "Email", type: "email", half: true, max: 120 },
  {
    key: "street",
    label: "Street address",
    type: "text",
    half: true,
    max: 160,
  },
  { key: "city", label: "City", type: "text", half: true, max: 80 },
  { key: "region", label: "State / region", type: "text", half: true, max: 80 },
  { key: "postal", label: "Postcode", type: "text", half: true, max: 20 },
  { key: "country", label: "Country", type: "text", half: true, max: 60 },
];

const PRODUCT_FIELDS: QrField[] = [
  linkField(
    "url",
    "Product or shopping link",
    "https://store.example.com/product/123",
    "The product page on your shop or a marketplace (Amazon, Flipkart, Etsy…). Anyone who scans opens this exact page.",
  ),
];

const BOOKING_FIELDS: QrField[] = [
  linkField(
    "url",
    "Appointment booking link",
    "https://calendly.com/your-name/consult",
    "Your Calendly, Cal.com, clinic or salon booking page. The scanner opens it to pick a slot.",
  ),
];

const TICKET_FIELDS: QrField[] = [
  linkField(
    "url",
    "Event or ticket link",
    "https://tickets.example.com/event/launch-night",
    "The event page or ticket checkout (Eventbrite, BookMyShow, your own site).",
  ),
];

const DOCUMENT_FIELDS: QrField[] = [
  linkField(
    "url",
    "PDF or document link",
    "https://example.com/menu.pdf",
    "A publicly hosted PDF, menu, brochure or document URL. QUICKKIT does not upload or fetch the file — encode a link you already host.",
  ),
];

const GALLERY_FIELDS: QrField[] = [
  linkField(
    "url",
    "Image gallery link",
    "https://photos.example.com/wedding-album",
    "A hosted gallery or album (Google Photos, iCloud, your portfolio). The scanner opens the album.",
  ),
];

const VIDEO_FIELDS: QrField[] = [
  linkField(
    "url",
    "Video link",
    "https://youtu.be/… or https://example.com/demo.mp4",
    "A YouTube, Vimeo or direct .mp4/.webm video URL. The scanner opens the video.",
  ),
];

const SOCIALS_FIELDS: QrField[] = [
  linkField(
    "url",
    "Your links page URL",
    "https://linktr.ee/yourname",
    "One code for all your socials: point it at a link-in-bio page (Linktree, Beacons, your own site). Static QR — see the Multi-link landing type to generate a page you can host.",
  ),
];

const LANDING_FIELDS: QrField[] = [
  linkField(
    "url",
    "Hosted landing-page URL",
    "https://yourdomain.com/links",
    "The address where your multi-link page is hosted. Generate the page itself with the landing-page builder, host it anywhere, then encode its URL here. Static QR — no QUICKKIT server, no scan tracking.",
  ),
];

/* ------------------------------------------------------------------ builders */

const SOCIAL_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  x: (h) => `https://x.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}/`,
  linkedinCompany: (h) => `https://www.linkedin.com/company/${h}/`,
  youtube: (h) =>
    /^UC[-\w]{20,}$/.test(h)
      ? `https://www.youtube.com/channel/${h}`
      : `https://www.youtube.com/@${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}/`,
  github: (h) => `https://github.com/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  whatsapp: (h) => `https://wa.me/${h.replace(/\D/g, "")}`,
};

function buildUrl(v: QrValues) {
  return normalizeUrl(requireValue(v, "url", "Web address"));
}

function buildText(v: QrValues) {
  const text = String(v.text ?? "").replace(/\r\n?/g, "\n");
  if (!text.trim()) throw new QrUserError("Type something to encode.", "text");
  if (text.length > 2500)
    throw new QrUserError("Plain text is limited to 2,500 characters.", "text");
  return text;
}

function buildEmail(v: QrValues) {
  const to = requireEmail(v, "to", "Recipient");
  const cc = optionalEmail(v, "cc", "Copy address");
  const subject = value(v, "subject");
  const body = String(v.body ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const params: string[] = [];
  if (cc) params.push(`cc=${enc(cc)}`);
  if (subject) params.push(`subject=${enc(subject)}`);
  if (body) params.push(`body=${enc(body)}`);
  return `mailto:${to}${params.length ? `?${params.join("&")}` : ""}`;
}

function buildPhone(v: QrValues) {
  return `tel:${normalizePhone(requireValue(v, "phone", "Phone number"), "phone")}`;
}

function buildSms(v: QrValues) {
  const phone = normalizePhone(
    requireValue(v, "phone", "Phone number"),
    "phone",
  );
  const message = String(v.message ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  // SMSTO: is the payload Android, iOS and most scanners agree on.
  return `SMSTO:${phone}:${message}`;
}

function buildWhatsapp(v: QrValues) {
  const raw = requireValue(v, "phone", "WhatsApp number");
  const phone = normalizePhone(raw, "phone", "WhatsApp number").replace(
    /[^\d]/g,
    "",
  );
  if (phone.length < 8)
    throw new QrUserError(
      "WhatsApp needs the full international number, e.g. 919876543210.",
      "phone",
    );
  const message = String(v.message ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  return `https://wa.me/${phone}${message ? `?text=${enc(message)}` : ""}`;
}

function buildWifi(v: QrValues) {
  const ssid = requireValue(v, "ssid", "Network name (SSID)");
  const encryption = value(v, "encryption") || "WPA";
  const password = value(v, "password");
  const eap = value(v, "eap");
  const identity = value(v, "identity");
  if (encryption !== "nopass" && !eap && !password)
    throw new QrUserError(
      "A WPA/WEP network needs its password, or choose “Open network”.",
      "password",
    );
  if (eap && !identity)
    throw new QrUserError(
      "Enterprise networks also need the username.",
      "identity",
    );
  if (password.length > 120)
    throw new QrUserError(
      "Wi‑Fi passwords longer than 120 characters are not supported.",
      "password",
    );
  const parts = [`T:${encryption}`];
  if (eap) parts.push(`E:${eap}`);
  if (identity) parts.push(`I:${escapeWifi(identity)}`);
  parts.push(`S:${escapeWifi(ssid)}`);
  parts.push(`P:${escapeWifi(encryption === "nopass" ? "" : password)}`);
  if (flag(v, "hidden")) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

function buildVcard(v: QrValues) {
  const firstName = requireValue(v, "firstName", "First name");
  const lastName = value(v, "lastName");
  const mobile = phoneOrEmpty(value(v, "mobile"), "mobile", "Mobile");
  const workPhone = phoneOrEmpty(
    value(v, "workPhone"),
    "workPhone",
    "Work phone",
  );
  const email = optionalEmail(v, "email", "Email");
  const website = value(v, "website");
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(
    foldLine(
      `N:${[escapeVCard(lastName), escapeVCard(firstName), "", "", ""].join(";")}`,
    ),
  );
  pushField(lines, "FN", `${firstName}${lastName ? ` ${lastName}` : ""}`);
  pushField(lines, "ORG", value(v, "org"));
  pushField(lines, "TITLE", value(v, "title"));
  if (mobile) lines.push(`TEL;TYPE=CELL,VOICE:${mobile}`);
  if (workPhone) lines.push(`TEL;TYPE=WORK,VOICE:${workPhone}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(email)}`);
  if (website) pushField(lines, "URL", normalizeUrl(website, "website"));
  const street = value(v, "street");
  const city = value(v, "city");
  const region = value(v, "region");
  const postal = value(v, "postal");
  const country = value(v, "country");
  if (street || city || region || postal || country)
    lines.push(
      `ADR;TYPE=WORK:;;${[street, city, region, postal, country]
        .map((part) => escapeVCard(part))
        .join(";")}`,
    );
  pushField(lines, "NOTE", String(v.note ?? ""), "", true);
  lines.push("END:VCARD");
  if (!mobile && !workPhone && !email && !website)
    throw new QrUserError(
      "Add at least one way to reach this person — a phone, email or website.",
      "mobile",
    );
  return crlf(lines);
}

function numberField(
  raw: string,
  key: string,
  label: string,
  min: number,
  max: number,
) {
  const text = raw.trim();
  if (!text) throw new QrUserError(`${label} is required.`, key);
  const num = Number(text);
  if (!Number.isFinite(num))
    throw new QrUserError(`${label} must be a number (${text}).`, key);
  if (num < min || num > max)
    throw new QrUserError(`${label} must be between ${min} and ${max}.`, key);
  return num;
}

function buildLocation(v: QrValues) {
  const lat = numberField(
    value(v, "latitude"),
    "latitude",
    "Latitude",
    -90,
    90,
  );
  const lng = numberField(
    value(v, "longitude"),
    "longitude",
    "Longitude",
    -180,
    180,
  );
  const label = value(v, "label");
  const format = value(v, "format") || "geo";
  const rawZoom = value(v, "zoom");
  const zoom = rawZoom
    ? Math.round(numberField(rawZoom, "zoom", "Zoom level", 3, 21))
    : null;
  const coord = `${lat.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")},${lng
    .toFixed(6)
    .replace(/0+$/, "")
    .replace(/\.$/, "")}`;
  if (format === "maps") {
    const query = label || coord;
    const url = new URL("https://maps.google.com/");
    url.searchParams.set("q", query);
    if (zoom) url.searchParams.set("z", String(zoom));
    return url.toString();
  }
  if (format === "mapsapp") {
    const url = new URL("https://maps.apple/");
    url.searchParams.set("ll", coord);
    if (label) url.searchParams.set("address", label);
    if (zoom) url.searchParams.set("z", String(zoom));
    return url.toString();
  }
  const params: string[] = [];
  if (label) params.push(`q=${enc(`${label}@${coord}`)}`);
  else if (zoom) params.push(`z=${zoom}`);
  return `geo:${coord}${params.length ? `?${params.join("&")}` : ""}`;
}

function buildEvent(v: QrValues) {
  const title = requireValue(v, "title", "Event title");
  const allDay = flag(v, "allDay");
  const useUtc = value(v, "timezone") === "utc";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QUICKKIT//QR Code Generator//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
  ];
  const stamp = icalStamp();
  lines.push(
    `UID:quickkit-${stamp}-${Math.random().toString(36).slice(2, 10)}@quickkit`,
  );
  lines.push(`DTSTAMP:${stamp}`);
  if (allDay) {
    const start = icalDate(
      requireValue(v, "date", "Date"),
      "date",
      "Start date",
    );
    const endRaw = value(v, "endDateAllDay");
    let end = start;
    if (endRaw) {
      const candidate = icalDate(endRaw, "endDateAllDay", "End date");
      if (candidate <= start)
        throw new QrUserError(
          "The last day must be after the first day.",
          "endDateAllDay",
        );
      end = candidate;
    }
    // iCal DTEND is exclusive, so add a day to make the last day inclusive.
    const exclusiveDate = new Date(
      Date.UTC(
        Number(end.slice(0, 4)),
        Number(end.slice(4, 6)) - 1,
        Number(end.slice(6, 8)) + 1,
      ),
    );
    const exclusive = `${exclusiveDate.getUTCFullYear()}${pad(
      exclusiveDate.getUTCMonth() + 1,
    )}${pad(exclusiveDate.getUTCDate())}`;
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    // DTEND is always exclusive, including a one-day event (end === start).
    lines.push(`DTEND;VALUE=DATE:${exclusive}`);
  } else {
    const start = splitDateTime(requireValue(v, "startDate", "Starts"));
    const endRaw = value(v, "endDate");
    let endParts = start;
    let endMs = start.ms + 60 * 60 * 1000; // default: one hour
    if (endRaw) {
      const end = splitDateTime(endRaw);
      if (end.ms <= start.ms)
        throw new QrUserError("The event must end after it starts.", "endDate");
      endParts = end;
      endMs = end.ms;
    }
    // "floating" keeps the wall-clock text as typed; "utc" converts it, which
    // also handles rolling past midnight when the default hour is added.
    const utc = (date: Date) =>
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
        date.getUTCHours(),
      )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
    const wall = (parts: {
      y: string;
      m: string;
      d: string;
      hh: string;
      mm: string;
      ss: string;
    }) => `${parts.y}${parts.m}${parts.d}T${parts.hh}${parts.mm}${parts.ss}`;
    const endDate = new Date(endMs);
    const endWall = endRaw
      ? wall(endParts)
      : wall({
          ...start,
          y: String(endDate.getUTCFullYear()),
          m: pad(endDate.getUTCMonth() + 1),
          d: pad(endDate.getUTCDate()),
          hh: pad(endDate.getUTCHours()),
          mm: pad(endDate.getUTCMinutes()),
          ss: "00",
        });
    lines.push(`DTSTART:${useUtc ? utc(new Date(start.ms)) : wall(start)}`);
    lines.push(`DTEND:${useUtc ? utc(endDate) : endWall}`);
  }
  pushField(lines, "SUMMARY", title);
  pushField(lines, "LOCATION", value(v, "location"));
  pushField(lines, "DESCRIPTION", String(v.description ?? ""), "", true);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return crlf(lines);
}

function buildSocial(v: QrValues) {
  const platform = value(v, "platform") || "instagram";
  const raw = requireValue(v, "username", "Username or page name");
  if (isHttpUrl(raw) || /^https?:\/\//i.test(raw))
    return normalizeUrl(raw, "username");
  // Accept what people actually paste: "@ada", "in/adasw", a URL with a query.
  const handle = raw
    .replace(/^@+/, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[?#].*$/, "")
    .trim();
  const leaf =
    platform === "linkedin"
      ? handle.replace(/^in\//i, "")
      : platform === "linkedinCompany"
        ? handle.replace(/^company\//i, "")
        : platform === "facebook"
          ? ((handle.match(/\/(?:id|profile)\.php\?id=(\w+)/) ?? [
              null,
              handle.split("/").filter(Boolean).pop(),
            ])[1] ?? handle)
          : handle;
  if (platform === "whatsapp") {
    const digits = leaf.replace(/\D/g, "");
    if (digits.length < 8)
      throw new QrUserError(
        "WhatsApp chat needs a full number with country code.",
        "username",
      );
    return `https://wa.me/${digits}`;
  }
  if (platform === "custom")
    throw new QrUserError(
      "For “Any other profile URL” paste the full https:// address.",
      "username",
    );
  if (
    platform === "facebook" ||
    platform === "linkedin" ||
    platform === "linkedinCompany"
  ) {
    if (!/^[A-Za-z0-9._-]{2,80}$/.test(leaf))
      throw new QrUserError(
        "That page name contains characters the site does not allow.",
        "username",
      );
  } else if (!USERNAME_RE.test(leaf)) {
    throw new QrUserError(
      "Usernames use letters, numbers, dots, dashes and underscores (max 80).",
      "username",
    );
  }
  if (platform === "telegram" && leaf.length < 5)
    throw new QrUserError(
      "Telegram usernames are at least 5 characters.",
      "username",
    );
  const builder = SOCIAL_URLS[platform];
  if (!builder) throw new QrUserError("Choose a platform.", "platform");
  return builder(leaf);
}

function buildApp(v: QrValues) {
  const store = value(v, "store") || "ios";
  const custom = value(v, "url");
  if (store === "custom") return normalizeUrl(custom || "", "url");
  if (store === "ios") {
    const raw = requireValue(v, "appId", "Apple App ID");
    const idMatch = /(?:id)?(\d{6,12})\b/.exec(raw.replace(/,/g, ""));
    if (!idMatch)
      throw new QrUserError(
        "The Apple App ID is the number in your App Store link, e.g. 6440000000.",
        "appId",
      );
    if (isHttpUrl(raw)) {
      const url = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`);
      const fromPath = /(?:^|\/)id?(\d{6,12})(?:$|[/?#])/i.exec(url.pathname);
      if (fromPath) return `https://apps.apple.com/app/id${fromPath[1]}`;
    }
    return `https://apps.apple.com/app/id${idMatch[1]}`;
  }
  const pkgSource =
    store === "amazon"
      ? value(v, "packageName")
      : requireValue(v, "packageName", "Package name");
  const customUrl = value(v, "url");
  if (isHttpUrl(customUrl) && !pkgSource) return normalizeUrl(customUrl, "url");
  if (!PACKAGE_RE.test(pkgSource))
    throw new QrUserError(
      "A package name looks like com.company.app — copy it from the store URL.",
      "packageName",
    );
  const host =
    store === "amazon"
      ? "https://www.amazon.com/gp/redirect.html"
      : "https://play.google.com/store/apps/details";
  if (store === "amazon") return `amzn://apps/android?p=${enc(pkgSource)}`;
  return `${host}?id=${enc(pkgSource)}`;
}

/* ------------------------------------------------------- V3 link builders */

function buildInstagram(v: QrValues) {
  return buildSocial({ platform: "instagram", username: v.username });
}

function buildFacebook(v: QrValues) {
  return buildSocial({ platform: "facebook", username: v.page });
}

function buildYoutube(v: QrValues) {
  return buildSocial({ platform: "youtube", username: v.channel });
}

function buildSpotify(v: QrValues) {
  const url = normalizeUrl(requireValue(v, "url", "Music link"));
  try {
    const parsed = new URL(url);
    if (/(^|\.)open\.spotify\.com$/i.test(parsed.hostname)) {
      // Spotify paths look like /playlist/ID, /intl-de/track/ID, /user/…/playlist/ID.
      const path = parsed.pathname.replace(/^\/intl-[a-z]{2}\//i, "/");
      if (!/^\/(track|album|playlist|artist|episode|show|user)\//i.test(path))
        throw new QrUserError(
          "That Spotify link should point to a track, album, playlist, artist, episode or show.",
          "url",
        );
    }
  } catch (error) {
    if (error instanceof QrUserError) throw error;
  }
  return url;
}

function buildGmaps(v: QrValues) {
  const mode = value(v, "mode") || "place";
  if (mode === "url") {
    const url = normalizeUrl(requireValue(v, "url", "Google Maps link"));
    const host = new URL(url).hostname.toLowerCase();
    const ok =
      /(^|\.)google\.[a-z.]{2,}$/i.test(host) ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com";
    if (!ok)
      throw new QrUserError(
        "Use a Google Maps link (google.com/maps, maps.app.goo.gl or goo.gl/maps).",
        "url",
      );
    return url;
  }
  if (mode === "coords") {
    const lat = Number(value(v, "latitude"));
    const lng = Number(value(v, "longitude"));
    if (!value(v, "latitude") || !value(v, "longitude"))
      throw new QrUserError("Enter both latitude and longitude.", "latitude");
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      throw new QrUserError("Latitude must be between -90 and 90.", "latitude");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      throw new QrUserError(
        "Longitude must be between -180 and 180.",
        "longitude",
      );
    return `https://www.google.com/maps/search/?api=1&query=${enc(`${lat},${lng}`)}`;
  }
  const place = requireValue(v, "place", "Place name or address");
  return `https://www.google.com/maps/search/?api=1&query=${enc(place)}`;
}

function buildGreview(v: QrValues) {
  const placeId = value(v, "placeId");
  const rawUrl = value(v, "url");
  if (placeId) {
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId))
      throw new QrUserError(
        "A Google Place ID looks like ChIJ… — letters, numbers, dashes and underscores.",
        "placeId",
      );
    return `https://search.google.com/local/writereview?placeid=${enc(placeId)}`;
  }
  if (rawUrl) {
    const url = normalizeUrl(rawUrl, "url");
    const host = new URL(url).hostname.toLowerCase();
    const ok =
      host === "g.page" ||
      host === "search.google.com" ||
      /(^|\.)google\.[a-z.]{2,}$/i.test(host);
    if (!ok)
      throw new QrUserError(
        "Use a Google review link (g.page/…/review or search.google.com/local/writereview).",
        "url",
      );
    return url;
  }
  throw new QrUserError(
    "Enter a Google Place ID or paste a review link.",
    "placeId",
  );
}

function buildBusiness(v: QrValues) {
  const company = requireValue(v, "company", "Business name");
  const website = normalizeUrl(
    requireValue(v, "website", "Website"),
    "website",
  );
  const contactName = value(v, "contactName");
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  if (contactName) {
    const parts = contactName.split(/\s+/);
    const first = parts.shift() ?? "";
    const last = parts.join(" ");
    lines.push(foldLine(`N:${escapeVCard(last)};${escapeVCard(first)};;;`));
    lines.push(foldLine(`FN:${escapeVCard(contactName)}`));
  } else {
    lines.push(foldLine(`N:${escapeVCard(company)};;;;`));
    lines.push(foldLine(`FN:${escapeVCard(company)}`));
  }
  pushField(lines, "ORG", company);
  pushField(lines, "TITLE", value(v, "title"));
  lines.push(foldLine(`URL:${website}`));
  const phone = phoneOrEmpty(value(v, "phone"), "phone", "Phone");
  if (phone) lines.push(foldLine(`TEL;TYPE=WORK,VOICE:${phone}`));
  const email = optionalEmail(v, "email", "Email");
  if (email) lines.push(foldLine(`EMAIL;TYPE=WORK:${email}`));
  const street = value(v, "street");
  const city = value(v, "city");
  const region = value(v, "region");
  const postal = value(v, "postal");
  const country = value(v, "country");
  if (street || city || region || postal || country)
    lines.push(
      foldLine(
        `ADR;TYPE=WORK:;;${escapeVCard(street)};${escapeVCard(city)};${escapeVCard(region)};${escapeVCard(postal)};${escapeVCard(country)}`,
      ),
    );
  lines.push("END:VCARD");
  return crlf(lines);
}

/** Destination-link types all encode one validated https URL. */
function buildDestinationLink(v: QrValues) {
  return normalizeUrl(requireValue(v, "url", "Link"));
}

/* ------------------------------------------------------------------ registry */

export type QrContentTypeDef = {
  id: QrContentTypeId;
  label: string;
  blurb: string;
  icon: string;
  fields: QrField[];
  build: (values: QrValues) => string;
  /** Payload is long/dense — the tool nudges the print size up. */
  dense?: boolean;
};

export const QR_CONTENT_TYPES: QrContentTypeDef[] = [
  {
    id: "url",
    label: "Website URL",
    blurb: "Open a link, landing page or QR menu.",
    icon: "link",
    fields: URL_FIELDS,
    build: buildUrl,
  },
  {
    id: "text",
    label: "Plain text",
    blurb: "Any message, up to 2,500 characters.",
    icon: "text",
    fields: TEXT_FIELDS,
    build: buildText,
  },
  {
    id: "email",
    label: "Email",
    blurb: "Pre-filled subject and message.",
    icon: "mail",
    fields: EMAIL_FIELDS,
    build: buildEmail,
  },
  {
    id: "phone",
    label: "Phone number",
    blurb: "Tap to call, with country code.",
    icon: "phone",
    fields: PHONE_FIELDS,
    build: buildPhone,
  },
  {
    id: "sms",
    label: "SMS",
    blurb: "Open a text message ready to send.",
    icon: "message",
    fields: SMS_FIELDS,
    build: buildSms,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    blurb: "Start a chat with a pre-filled line.",
    icon: "whatsapp",
    fields: WHATSAPP_FIELDS,
    build: buildWhatsapp,
  },
  {
    id: "wifi",
    label: "Wi‑Fi",
    blurb: "Join a network without typing the password.",
    icon: "wifi",
    fields: WIFI_FIELDS,
    build: buildWifi,
    dense: true,
  },
  {
    id: "vcard",
    label: "vCard contact",
    blurb: "Save a full contact card to the phone book.",
    icon: "contact",
    fields: VCARD_FIELDS,
    build: buildVcard,
    dense: true,
  },
  {
    id: "location",
    label: "Location",
    blurb: "geo: links and map pins.",
    icon: "map-pin",
    fields: LOCATION_FIELDS,
    build: buildLocation,
  },
  {
    id: "event",
    label: "Calendar event",
    blurb: "Add an event to any calendar app.",
    icon: "calendar",
    fields: EVENT_FIELDS,
    build: buildEvent,
    dense: true,
  },
  {
    id: "social",
    label: "Social profile",
    blurb: "Instagram, X, LinkedIn, YouTube and more.",
    icon: "share",
    fields: SOCIAL_FIELDS,
    build: buildSocial,
  },
  {
    id: "app",
    label: "App download",
    blurb: "App Store, Google Play or your own link.",
    icon: "app",
    fields: APP_FIELDS,
    build: buildApp,
  },
  {
    id: "instagram",
    label: "Instagram profile",
    blurb: "Open an Instagram profile from a handle or URL.",
    icon: "instagram",
    fields: INSTAGRAM_FIELDS,
    build: buildInstagram,
  },
  {
    id: "facebook",
    label: "Facebook page",
    blurb: "Open a Facebook page by name or link.",
    icon: "facebook",
    fields: FACEBOOK_FIELDS,
    build: buildFacebook,
  },
  {
    id: "youtube",
    label: "YouTube channel",
    blurb: "A @handle, channel ID or channel URL.",
    icon: "youtube",
    fields: YOUTUBE_FIELDS,
    build: buildYoutube,
  },
  {
    id: "spotify",
    label: "Spotify / music",
    blurb: "A track, album, playlist or any music link.",
    icon: "music",
    fields: SPOTIFY_FIELDS,
    build: buildSpotify,
  },
  {
    id: "gmaps",
    label: "Google Maps location",
    blurb: "A place, address, coordinates or Maps link.",
    icon: "map-pin",
    fields: GMAPS_FIELDS,
    build: buildGmaps,
  },
  {
    id: "greview",
    label: "Google Review link",
    blurb: "Send customers straight to write a review.",
    icon: "star",
    fields: GREVIEW_FIELDS,
    build: buildGreview,
  },
  {
    id: "business",
    label: "Business website + contact",
    blurb: "A contact card with your site, phone and address.",
    icon: "briefcase",
    fields: BUSINESS_FIELDS,
    build: buildBusiness,
    dense: true,
  },
  {
    id: "product",
    label: "Product / shopping link",
    blurb: "Open a product page on any store.",
    icon: "shopping-bag",
    fields: PRODUCT_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "booking",
    label: "Appointment booking",
    blurb: "Open a Calendly, Cal.com or booking page.",
    icon: "calendar-check",
    fields: BOOKING_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "ticket",
    label: "Event / ticket link",
    blurb: "Open an event page or ticket checkout.",
    icon: "ticket",
    fields: TICKET_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "document",
    label: "PDF / document link",
    blurb: "Open a hosted PDF, menu or brochure.",
    icon: "file-text",
    fields: DOCUMENT_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "gallery",
    label: "Image gallery link",
    blurb: "Open a hosted photo album or gallery.",
    icon: "images",
    fields: GALLERY_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "video",
    label: "Video link",
    blurb: "Open a YouTube, Vimeo or direct video.",
    icon: "video",
    fields: VIDEO_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "socials",
    label: "Multi-social links",
    blurb: "One code for your link-in-bio page.",
    icon: "share",
    fields: SOCIALS_FIELDS,
    build: buildDestinationLink,
  },
  {
    id: "landing",
    label: "Multi-link landing page",
    blurb: "Encode the URL of a landing page you host.",
    icon: "layout",
    fields: LANDING_FIELDS,
    build: buildDestinationLink,
  },
];

export const contentTypeDef = (id: QrContentTypeId): QrContentTypeDef =>
  QR_CONTENT_TYPES.find((type) => type.id === id) ?? QR_CONTENT_TYPES[0];

export function defaultValuesFor(id: QrContentTypeId): QrValues {
  const values: QrValues = {};
  for (const field of contentTypeDef(id).fields)
    values[field.key] =
      field.defaultValue ?? (field.type === "checkbox" ? false : "");
  return values;
}

export function isKnownContentType(id: string): id is QrContentTypeId {
  return QR_CONTENT_TYPES.some((type) => type.id === id);
}

/**
 * A working sample per content type, used by the "Try sample" affordance so a
 * first-time user sees a real, decodable code for whichever type is selected.
 * Every entry builds a valid payload (covered by the payload unit tests).
 */
export const QR_SAMPLE_VALUES: Record<QrContentTypeId, QrValues> = {
  url: { url: "https://quickkit.tools/?src=qr-example" },
  text: { text: "Hello from QUICKKIT — scan me!" },
  email: {
    to: "hello@quickkit.tools",
    subject: "Hi from a QR code",
    body: "I scanned your code and wanted to say hello.",
  },
  phone: { phone: "+91 98765 43210" },
  sms: { phone: "+91 98765 43210", message: "Hi! I scanned your QR code." },
  whatsapp: {
    phone: "+91 98765 43210",
    message: "Hello from your QR code!",
  },
  wifi: { ssid: "Café Aurora Wi-Fi", password: "", encryption: "nopass" },
  vcard: {
    firstName: "Ada",
    lastName: "Lovelace",
    org: "Quickkit",
    title: "Engineer",
    mobile: "+91 98765 43210",
    email: "ada@quickkit.tools",
    website: "quickkit.tools",
  },
  location: { latitude: "19.0760", longitude: "72.8777", format: "maps" },
  event: {
    title: "Quickkit launch party",
    startDate: "2026-12-01T18:30",
    endDate: "2026-12-01T21:00",
    location: "Rooftop, Bandra",
    timezone: "local",
  },
  social: { platform: "instagram", username: "quickkit.tools" },
  app: { store: "android", packageName: "com.quickkit.app" },
  instagram: { username: "quickkit.tools" },
  facebook: { page: "quickkit.tools" },
  youtube: { channel: "@quickkit" },
  spotify: { url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
  gmaps: { mode: "place", place: "Gateway of India, Mumbai" },
  greview: { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" },
  business: {
    company: "Aurora Café",
    contactName: "Ada Lovelace",
    title: "Owner",
    website: "auroracafe.example.com",
    phone: "+91 98765 43210",
    email: "hello@auroracafe.example.com",
    city: "Mumbai",
    country: "India",
  },
  product: { url: "https://store.example.com/product/aurora-mug" },
  booking: { url: "https://calendly.com/quickkit/consult" },
  ticket: { url: "https://tickets.example.com/event/launch-night" },
  document: { url: "https://quickkit.tools/menu.pdf" },
  gallery: { url: "https://photos.example.com/aurora-album" },
  video: { url: "https://youtu.be/dQw4w9WgXcQ" },
  socials: { url: "https://linktr.ee/quickkit" },
  landing: { url: "https://quickkit.tools/links" },
};

/** Sample values for a type, merged over its defaults so every field exists. */
export function sampleValuesFor(id: QrContentTypeId): QrValues {
  return { ...defaultValuesFor(id), ...QR_SAMPLE_VALUES[id] };
}

/** Build + validate the payload for a content type. Throws QrUserError. */
export function buildPayload(id: QrContentTypeId, values: QrValues): string {
  const def = contentTypeDef(id);
  const payload = def.build(values);
  if (!payload) throw new QrUserError("Fill in the fields to create a code.");
  return payload;
}

/** Which fields hold secrets — used to keep them out of history and links. */
export function sensitiveKeysFor(id: QrContentTypeId) {
  return contentTypeDef(id)
    .fields.filter((field) => field.sensitive)
    .map((field) => field.key);
}

export function sensitiveFields(id: QrContentTypeId) {
  return contentTypeDef(id).fields.filter((field) => field.sensitive);
}

/**
 * Replace secret values with dots for on-screen display. The payload handed to
 * the encoder is never masked — only what the "exact content" panel shows, so
 * a shoulder-surfer (or a screenshot) cannot read a Wi-Fi password.
 */
/** Split on `sep`, treating `\\x` as one escaped unit so separators inside values survive. */
function splitUnescaped(text: string, sep: string) {
  const parts: string[] = [];
  let current = "";
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\\" && index + 1 < text.length) {
      current += ch + text[index + 1];
      index += 1;
      continue;
    }
    if (ch === sep) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * Hide a `WIFI:` tag's value by structure rather than by string matching: the
 * encoder escapes `; : , " \` inside the password, so the raw secret is not a
 * substring of the payload and a plain replace would miss it entirely.
 */
function maskWifiTag(payload: string, tag: string, dots: string) {
  const prefix = payload.startsWith("WIFI:") ? "WIFI:" : "";
  const body = prefix ? payload.slice(prefix.length) : payload;
  let touched = false;
  const parts = splitUnescaped(body, ";").map((part) => {
    if (!part.startsWith(`${tag}:`)) return part;
    const value = part.slice(tag.length + 1);
    if (!value) return part;
    touched = true;
    return `${tag}:${dots}`;
  });
  const masked = parts.join(";");
  return touched ? `${prefix}${masked}` : payload;
}

export function redactForDisplay(
  payload: string,
  id: QrContentTypeId,
  values: QrValues,
) {
  let shown = payload;
  for (const key of sensitiveKeysFor(id)) {
    const secret = String(values[key] ?? "");
    if (id === "wifi") {
      shown = maskWifiTag(
        shown,
        "P",
        "•".repeat(Math.min(12, Math.max(6, secret.length))),
      );
      continue;
    }
    if (secret.length > 2)
      shown = shown.split(secret).join("•".repeat(Math.min(12, secret.length)));
  }
  return shown;
}
