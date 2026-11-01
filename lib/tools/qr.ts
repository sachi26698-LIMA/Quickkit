export const MAX_QR_BYTES = 2000;
export const MAX_BATCH_ITEMS = 50;

export type QrErrorLevel = "L" | "M" | "Q" | "H";
export type QrFillStyle = "solid" | "gradient";
export type QrDotStyle = "square" | "rounded" | "dots";
export type QrCornerStyle = "square" | "rounded" | "circle";
export type QrContentType =
  | "text"
  | "url"
  | "wifi"
  | "phone"
  | "email"
  | "sms"
  | "vcard"
  | "whatsapp"
  | "location"
  | "event"
  | "upi";
export type QrMode = "single" | "batch";
export type QrOptions = {
  size: number;
  margin: number;
  errorLevel: QrErrorLevel;
  fillStyle: QrFillStyle;
  foreground: string;
  gradientEnd: string;
  background: string;
  dotStyle: QrDotStyle;
  cornerStyle: QrCornerStyle;
  logoScale: number;
};

export type QrFormValues = {
  text: string;
  url: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: "WPA" | "WEP" | "nopass";
  wifiHidden: boolean;
  phone: string;
  emailAddress: string;
  emailSubject: string;
  emailBody: string;
  smsNumber: string;
  smsMessage: string;
  firstName: string;
  lastName: string;
  contactOrganization: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  contactStreet: string;
  contactCity: string;
  contactRegion: string;
  contactPostalCode: string;
  contactCountry: string;
  whatsappNumber: string;
  whatsappMessage: string;
  latitude: string;
  longitude: string;
  locationLabel: string;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  eventLocation: string;
  eventDescription: string;
  upiId: string;
  upiName: string;
  upiAmount: string;
  upiNote: string;
};

export const defaultQrFormValues: QrFormValues = {
  text: "",
  url: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiSecurity: "WPA",
  wifiHidden: false,
  phone: "",
  emailAddress: "",
  emailSubject: "",
  emailBody: "",
  smsNumber: "",
  smsMessage: "",
  firstName: "",
  lastName: "",
  contactOrganization: "",
  contactTitle: "",
  contactPhone: "",
  contactEmail: "",
  contactWebsite: "",
  contactStreet: "",
  contactCity: "",
  contactRegion: "",
  contactPostalCode: "",
  contactCountry: "",
  whatsappNumber: "",
  whatsappMessage: "",
  latitude: "",
  longitude: "",
  locationLabel: "",
  eventTitle: "",
  eventStart: "",
  eventEnd: "",
  eventLocation: "",
  eventDescription: "",
  upiId: "",
  upiName: "",
  upiAmount: "",
  upiNote: "",
};

export const QR_FILL_STYLES: QrFillStyle[] = ["solid", "gradient"];
export const QR_DOT_STYLES: QrDotStyle[] = ["square", "rounded", "dots"];
export const QR_CORNER_STYLES: QrCornerStyle[] = [
  "square",
  "rounded",
  "circle",
];

export const defaultQrOptions: QrOptions = {
  size: 768,
  margin: 4,
  errorLevel: "M",
  fillStyle: "solid",
  foreground: "#171b2e",
  gradientEnd: "#6657e8",
  background: "#ffffff",
  dotStyle: "square",
  cornerStyle: "square",
  logoScale: 0.18,
};
export const QR_SIZES = [256, 512, 768, 1024] as const;
export const QR_MARGINS = [2, 4, 6, 8] as const;
export const QR_ERROR_LEVELS: QrErrorLevel[] = ["L", "M", "Q", "H"];

export const QR_CONTENT_TYPES: {
  value: QrContentType;
  label: string;
  hint: string;
}[] = [
  { value: "text", label: "Text", hint: "Plain text or a message" },
  { value: "url", label: "Website", hint: "A link to open when scanned" },
  { value: "wifi", label: "Wi-Fi", hint: "Join a wireless network" },
  { value: "phone", label: "Phone", hint: "Call a number" },
  { value: "email", label: "Email", hint: "Compose a prefilled email" },
  { value: "sms", label: "SMS", hint: "Start a text message" },
  { value: "vcard", label: "Contact", hint: "Save a vCard contact" },
  { value: "whatsapp", label: "WhatsApp", hint: "Open a WhatsApp chat" },
  { value: "location", label: "Location", hint: "Open coordinates on a map" },
  { value: "event", label: "Event", hint: "Add a calendar event" },
  {
    value: "upi",
    label: "UPI payment",
    hint: "Create a compatible UPI intent",
  },
];

export function validateQr(text: string) {
  if (!text.trim())
    throw new Error("Enter text or a URL to generate a QR code.");
  if (qrByteLength(text) > MAX_QR_BYTES)
    throw new Error(
      `Keep QR content within ${MAX_QR_BYTES.toLocaleString()} UTF-8 bytes. Shorter content is easier to scan.`,
    );
  return text;
}

export function qrByteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

function required(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`Enter ${label}.`);
  return result;
}

function normalizePhone(value: string, label: string) {
  const trimmed = required(value, label);
  if (!/^[+\d().\s-]+$/.test(trimmed))
    throw new Error(
      `${label[0].toUpperCase()}${label.slice(1)} can contain digits, spaces, +, parentheses or hyphens only.`,
    );
  const number = trimmed.replace(/[().\s-]/g, "");
  if (!/^\+?\d+$/.test(number))
    throw new Error(
      `${label[0].toUpperCase()}${label.slice(1)} must use a single + at most, before the digits.`,
    );
  const digits = number.replace(/\D/g, "");
  if (digits.length < 5 || digits.length > 15)
    throw new Error(
      `${label[0].toUpperCase()}${label.slice(1)} must contain 5–15 digits.`,
    );
  return number;
}

function validateEmail(value: string, label = "a valid email address") {
  const email = required(value, label);
  const [local, domain, ...extra] = email.split("@");
  const labels = domain?.split(".") ?? [];
  const validLocal =
    Boolean(local) &&
    local.length <= 64 &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..") &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local);
  const validDomain =
    Boolean(domain) &&
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (part) =>
        part.length > 0 &&
        part.length <= 63 &&
        /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(part),
    );
  if (email.length > 254 || extra.length > 0 || !validLocal || !validDomain)
    throw new Error(`Enter ${label}.`);
  return email;
}

function escapeWifi(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[;,:\"]/g, (character) => `\\${character}`);
}

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsTimestamp(value: string, label: string) {
  const input = required(value, label);
  const date = new Date(input);
  if (!Number.isFinite(date.getTime()))
    throw new Error(`Enter a valid ${label}.`);
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function eventUid(title: string, start: string, end: string) {
  const bytes = new TextEncoder().encode(JSON.stringify([title, start, end]));
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `quickkit-${(hash >>> 0).toString(16)}@quickkit.local`;
}

/** Build the standard, scanner-friendly payload for the selected QR content type. */
export function buildQrPayload(type: QrContentType, values: QrFormValues) {
  let payload: string;
  switch (type) {
    case "text":
      payload = validateQr(values.text);
      break;
    case "url": {
      const input = required(values.url, "a website URL");
      let url: URL;
      try {
        url = new URL(input.includes("://") ? input : `https://${input}`);
      } catch {
        throw new Error(
          "Enter a valid website address, such as https://example.com.",
        );
      }
      if (url.protocol !== "http:" && url.protocol !== "https:")
        throw new Error("Use an http or https website address.");
      if (!url.hostname.includes(".") && url.hostname !== "localhost")
        throw new Error(
          "Enter a complete website address, such as example.com.",
        );
      payload = url.toString();
      break;
    }
    case "wifi": {
      const ssid = required(values.wifiSsid, "the Wi-Fi network name (SSID)");
      if (values.wifiSecurity !== "nopass" && !values.wifiPassword)
        throw new Error("Enter the Wi-Fi password or choose an open network.");
      payload = `WIFI:T:${values.wifiSecurity};S:${escapeWifi(ssid)};P:${escapeWifi(values.wifiSecurity === "nopass" ? "" : values.wifiPassword)};${values.wifiHidden ? "H:true;" : ""};`;
      break;
    }
    case "phone":
      payload = `tel:${normalizePhone(values.phone, "a phone number")}`;
      break;
    case "email": {
      const address = validateEmail(values.emailAddress);
      const params = new URLSearchParams();
      if (values.emailSubject.trim())
        params.set("subject", values.emailSubject.trim());
      if (values.emailBody.trim()) params.set("body", values.emailBody.trim());
      const query = params.toString();
      const uriAddress = encodeURIComponent(address).replace(/%40/i, "@");
      payload = `mailto:${uriAddress}${query ? `?${query}` : ""}`;
      break;
    }
    case "sms": {
      const number = normalizePhone(values.smsNumber, "a phone number");
      payload = `SMSTO:${number}:${values.smsMessage}`;
      break;
    }
    case "vcard": {
      const first = values.firstName.trim();
      const last = values.lastName.trim();
      if (!first && !last)
        throw new Error("Enter at least a first or last name.");
      const fullName = [first, last].filter(Boolean).join(" ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
        `FN:${escapeVCard(fullName)}`,
      ];
      if (values.contactOrganization.trim())
        lines.push(`ORG:${escapeVCard(values.contactOrganization.trim())}`);
      if (values.contactTitle.trim())
        lines.push(`TITLE:${escapeVCard(values.contactTitle.trim())}`);
      if (values.contactPhone.trim())
        lines.push(
          `TEL;TYPE=CELL:${escapeVCard(normalizePhone(values.contactPhone, "a contact phone number"))}`,
        );
      if (values.contactEmail.trim())
        lines.push(
          `EMAIL:${escapeVCard(validateEmail(values.contactEmail, "a valid contact email address"))}`,
        );
      if (values.contactWebsite.trim()) {
        const website = values.contactWebsite.trim();
        let url: URL;
        try {
          url = new URL(
            website.includes("://") ? website : `https://${website}`,
          );
        } catch {
          throw new Error("Enter a valid contact website address.");
        }
        if (url.protocol !== "http:" && url.protocol !== "https:")
          throw new Error("Use an http or https contact website address.");
        lines.push(`URL:${escapeVCard(url.toString())}`);
      }
      const address = [
        "",
        "",
        values.contactStreet.trim(),
        values.contactCity.trim(),
        values.contactRegion.trim(),
        values.contactPostalCode.trim(),
        values.contactCountry.trim(),
      ];
      if (address.some(Boolean))
        lines.push(`ADR;TYPE=WORK:${address.map(escapeVCard).join(";")}`);
      lines.push("END:VCARD");
      payload = lines.join("\r\n");
      break;
    }
    case "whatsapp": {
      const number = normalizePhone(values.whatsappNumber, "a WhatsApp number");
      const digits = number.replace(/\D/g, "");
      if (digits.length < 7)
        throw new Error(
          "Use an international WhatsApp number with 7–15 digits.",
        );
      payload = `https://wa.me/${digits}${values.whatsappMessage.trim() ? `?text=${encodeURIComponent(values.whatsappMessage.trim())}` : ""}`;
      break;
    }
    case "location": {
      const lat = Number(required(values.latitude, "a latitude"));
      const lng = Number(required(values.longitude, "a longitude"));
      if (!Number.isFinite(lat) || lat < -90 || lat > 90)
        throw new Error("Latitude must be between −90 and 90.");
      if (!Number.isFinite(lng) || lng < -180 || lng > 180)
        throw new Error("Longitude must be between −180 and 180.");
      const coordinates = `${lat},${lng}`;
      const label = values.locationLabel.trim();
      payload = `geo:${coordinates}${label ? `?q=${coordinates}(${encodeURIComponent(label)})` : ""}`;
      break;
    }
    case "event": {
      const title = required(values.eventTitle, "an event title");
      const start = toIcsTimestamp(values.eventStart, "a start date and time");
      const end = toIcsTimestamp(values.eventEnd, "an end date and time");
      if (
        new Date(values.eventEnd).getTime() <=
        new Date(values.eventStart).getTime()
      )
        throw new Error("The event end must be after the start.");
      const timestamp = toIcsTimestamp(
        new Date().toISOString(),
        "event creation timestamp",
      );
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//QUICKKIT//QR Calendar Event 1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${eventUid(title, start, end)}`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${icsEscape(title)}`,
      ];
      if (values.eventLocation.trim())
        lines.push(`LOCATION:${icsEscape(values.eventLocation.trim())}`);
      if (values.eventDescription.trim())
        lines.push(`DESCRIPTION:${icsEscape(values.eventDescription.trim())}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      payload = lines.join("\r\n");
      break;
    }
    case "upi": {
      const id = required(values.upiId, "a UPI ID");
      if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(id))
        throw new Error("Enter a UPI ID in the format name@bank.");
      const params = new URLSearchParams({ pa: id, cu: "INR" });
      if (values.upiName.trim()) params.set("pn", values.upiName.trim());
      if (values.upiAmount.trim()) {
        const amount = Number(values.upiAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000)
          throw new Error(
            "Enter a payment amount greater than ₹0 and no more than ₹10 crore.",
          );
        params.set("am", amount.toFixed(2));
      }
      if (values.upiNote.trim()) params.set("tn", values.upiNote.trim());
      payload = `upi://pay?${params.toString()}`;
      break;
    }
    default: {
      const unreachable: never = type;
      throw new Error(`Unsupported QR content type: ${unreachable}`);
    }
  }
  return validateQr(payload);
}

function hexToRgb(hex: string) {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 0;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function qrContrast(options: QrOptions) {
  return Math.min(
    contrastRatio(options.foreground, options.background),
    options.fillStyle === "gradient"
      ? contrastRatio(options.gradientEnd, options.background)
      : 21,
  );
}

export function validateQrOptions(options: QrOptions) {
  if (!QR_SIZES.includes(options.size as (typeof QR_SIZES)[number]))
    throw new Error("Choose a supported QR size.");
  if (!QR_MARGINS.includes(options.margin as (typeof QR_MARGINS)[number]))
    throw new Error("Choose a supported quiet-zone margin.");
  if (!QR_ERROR_LEVELS.includes(options.errorLevel))
    throw new Error("Choose a supported error-correction level.");
  if (!QR_FILL_STYLES.includes(options.fillStyle))
    throw new Error("Choose a supported code fill style.");
  if (!QR_DOT_STYLES.includes(options.dotStyle))
    throw new Error("Choose a supported QR dot style.");
  if (!QR_CORNER_STYLES.includes(options.cornerStyle))
    throw new Error("Choose a supported finder corner style.");
  if (
    !hexToRgb(options.foreground) ||
    !hexToRgb(options.gradientEnd) ||
    !hexToRgb(options.background)
  )
    throw new Error("Choose valid QR colors.");
  if (
    !Number.isFinite(options.logoScale) ||
    options.logoScale < 0.12 ||
    options.logoScale > 0.22
  )
    throw new Error("Keep a logo between 12% and 22% of the QR image.");
  if (qrContrast(options) < 3)
    throw new Error(
      "Those colors are too close together for scanners. Keep both ends of a gradient darker than a light background, with at least 3:1 contrast.",
    );
  return options;
}

export type BatchQrItem = { filename: string; content: string };

/** Parse newline-separated content. A line may be `filename | QR content`. */
export function parseBatchQrInput(input: string): BatchQrItem[] {
  const lines = input.split(/\r?\n/).map((line, index) => ({ line, index }));
  const populated = lines.filter(({ line }) => line.trim());
  if (!populated.length) throw new Error("Add at least one line to the batch.");
  if (populated.length > MAX_BATCH_ITEMS)
    throw new Error(`A batch can contain up to ${MAX_BATCH_ITEMS} QR codes.`);
  const used = new Set<string>();
  return populated.map(({ line, index }, itemIndex) => {
    const separator = line.indexOf(" | ");
    const hasName = separator >= 0;
    const rawName = hasName ? line.slice(0, separator).trim() : "";
    const content = (hasName ? line.slice(separator + 3) : line).trim();
    if (!content) throw new Error(`Line ${index + 1} is missing QR content.`);
    validateQr(content);
    let filename = sanitizeQrFilename(
      rawName || `qr-${String(itemIndex + 1).padStart(2, "0")}`,
    );
    const base = filename;
    let suffix = 2;
    while (used.has(`${filename}.png`.toLowerCase()))
      filename = `${base}-${suffix++}`;
    used.add(`${filename}.png`.toLowerCase());
    return { filename, content };
  });
}

/** Produce a safe, extension-free filename for a QR download. */
export function sanitizeQrFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/\.(?:png|svg|pdf|zip)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80)
    .replace(/[. -]+$/g, "");
  const safe = cleaned || "quickkit-qr-code";
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe)
    ? `qr-${safe}`
    : safe;
}

export function qrReadabilityGuidance({
  contrast,
  modulePixels,
  quietZone,
  errorLevel,
  hasLogo,
  decodeVerified,
}: {
  contrast: number;
  modulePixels: number;
  quietZone: number;
  errorLevel: QrErrorLevel;
  hasLogo: boolean;
  decodeVerified: boolean | null;
}) {
  const guidance: string[] = [];
  if (contrast < 4.5)
    guidance.push("Use stronger dark-on-light contrast when possible.");
  if (modulePixels < 3)
    guidance.push(
      "Choose a larger output size or shorter content for larger modules.",
    );
  if (quietZone < 4)
    guidance.push("A 4-module quiet zone improves camera recognition.");
  if (hasLogo && errorLevel !== "H")
    guidance.push(
      "High error correction (H) is recommended when using a logo.",
    );
  if (hasLogo && !decodeVerified)
    guidance.push(
      "The local scan check could not confirm this logo version; reduce the logo or remove it before printing.",
    );
  if (!guidance.length && decodeVerified)
    return "Strong contrast and a local scan check passed.";
  if (!guidance.length)
    return "Good contrast and module size for most screens and prints.";
  return guidance.join(" ");
}
