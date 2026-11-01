export const MAX_QR_BYTES = 2000;
export const MAX_BATCH_ITEMS = 50;

export type QrErrorLevel = "L" | "M" | "Q" | "H";
export type QrFillStyle = "solid" | "gradient";
export type QrDotStyle = "square" | "rounded" | "dots" | "diamond";
export type QrCornerStyle = "square" | "rounded" | "circle";
export type QrFrameStyle = "none" | "outline" | "caption" | "poster";
export type QrSocialPlatform =
  "youtube" | "instagram" | "facebook" | "linkedin" | "x" | "other";
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
  | "upi"
  | "social"
  | "app"
  | "business"
  | "product";
export type QrMode = "single" | "batch";
export type QrOptions = {
  /** Legacy square preset size; width and height support custom canvases. */
  size: number;
  width: number;
  height: number;
  margin: number;
  errorLevel: QrErrorLevel;
  fillStyle: QrFillStyle;
  foreground: string;
  gradientEnd: string;
  background: string;
  transparentBackground: boolean;
  eyeColor: string;
  dotStyle: QrDotStyle;
  cornerStyle: QrCornerStyle;
  logoScale: number;
  logoX: number;
  logoY: number;
  logoPadding: number;
  logoBackground: string;
  logoPlate: boolean;
  frameStyle: QrFrameStyle;
  frameCaption: string;
  frameColor: string;
  frameTextColor: string;
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
  eventTimezone: string;
  locationMapUrl: string;
  upiId: string;
  upiName: string;
  upiAmount: string;
  upiNote: string;
  socialPlatform: QrSocialPlatform;
  socialUrl: string;
  appName: string;
  appPlatform: "universal" | "ios" | "android";
  appUrl: string;
  businessName: string;
  businessDescription: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  businessStreet: string;
  businessCity: string;
  businessRegion: string;
  businessPostalCode: string;
  businessCountry: string;
  productName: string;
  productSku: string;
  productPrice: string;
  productUrl: string;
  productDescription: string;
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
  eventTimezone: "",
  locationMapUrl: "",
  upiId: "",
  upiName: "",
  upiAmount: "",
  upiNote: "",
  socialPlatform: "instagram",
  socialUrl: "",
  appName: "",
  appPlatform: "universal",
  appUrl: "",
  businessName: "",
  businessDescription: "",
  businessPhone: "",
  businessEmail: "",
  businessWebsite: "",
  businessStreet: "",
  businessCity: "",
  businessRegion: "",
  businessPostalCode: "",
  businessCountry: "",
  productName: "",
  productSku: "",
  productPrice: "",
  productUrl: "",
  productDescription: "",
};

export const QR_FILL_STYLES: QrFillStyle[] = ["solid", "gradient"];
export const QR_DOT_STYLES: QrDotStyle[] = [
  "square",
  "rounded",
  "dots",
  "diamond",
];
export const QR_CORNER_STYLES: QrCornerStyle[] = [
  "square",
  "rounded",
  "circle",
];
export const QR_FRAME_STYLES: QrFrameStyle[] = [
  "none",
  "outline",
  "caption",
  "poster",
];

export const defaultQrOptions: QrOptions = {
  size: 768,
  width: 768,
  height: 768,
  margin: 4,
  errorLevel: "M",
  fillStyle: "solid",
  foreground: "#171b2e",
  gradientEnd: "#6657e8",
  background: "#ffffff",
  transparentBackground: false,
  eyeColor: "#171b2e",
  dotStyle: "square",
  cornerStyle: "square",
  logoScale: 0.18,
  logoX: 0.5,
  logoY: 0.5,
  logoPadding: 0.16,
  logoBackground: "#ffffff",
  logoPlate: true,
  frameStyle: "none",
  frameCaption: "SCAN ME",
  frameColor: "#ffffff",
  frameTextColor: "#171b2e",
};
export const QR_SIZES = [256, 512, 768, 1024] as const;
export const QR_MARGINS = [2, 4, 6, 8] as const;
export const QR_ERROR_LEVELS: QrErrorLevel[] = ["L", "M", "Q", "H"];

export type QrDesignPreset = {
  id: string;
  label: string;
  description: string;
  options: Partial<QrOptions>;
};

export const QR_DESIGN_PRESETS: QrDesignPreset[] = [
  {
    id: "classic",
    label: "Classic ink",
    description: "Crisp, timeless contrast",
    options: {
      fillStyle: "solid",
      foreground: "#171b2e",
      eyeColor: "#171b2e",
      background: "#ffffff",
      dotStyle: "square",
      cornerStyle: "square",
      frameStyle: "none",
    },
  },
  {
    id: "lavender",
    label: "Lavender studio",
    description: "Soft purple gradient, rounded dots",
    options: {
      fillStyle: "gradient",
      foreground: "#433187",
      gradientEnd: "#6657e8",
      eyeColor: "#433187",
      background: "#ffffff",
      dotStyle: "rounded",
      cornerStyle: "rounded",
      frameStyle: "caption",
      frameCaption: "SCAN ME",
      frameColor: "#f4f0ff",
      frameTextColor: "#433187",
    },
  },
  {
    id: "botanical",
    label: "Botanical",
    description: "Forest green with a fresh light canvas",
    options: {
      fillStyle: "solid",
      foreground: "#174b3a",
      eyeColor: "#174b3a",
      background: "#f0faf4",
      dotStyle: "dots",
      cornerStyle: "circle",
      frameStyle: "outline",
      frameColor: "#d7f0e2",
      frameTextColor: "#174b3a",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blue and sea-glass",
    options: {
      fillStyle: "gradient",
      foreground: "#12365a",
      gradientEnd: "#267b91",
      eyeColor: "#12365a",
      background: "#eff9fb",
      dotStyle: "diamond",
      cornerStyle: "rounded",
      frameStyle: "poster",
      frameCaption: "EXPLORE",
      frameColor: "#e3f4f7",
      frameTextColor: "#12365a",
    },
  },
  {
    id: "sunset",
    label: "Warm terracotta",
    description: "Warm, editorial and print-friendly",
    options: {
      fillStyle: "gradient",
      foreground: "#73331e",
      gradientEnd: "#9d4431",
      eyeColor: "#73331e",
      background: "#fff7ed",
      dotStyle: "rounded",
      cornerStyle: "circle",
      frameStyle: "caption",
      frameCaption: "DISCOVER",
      frameColor: "#fff0df",
      frameTextColor: "#73331e",
    },
  },
];

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
  {
    value: "social",
    label: "Social profile",
    hint: "Share YouTube, Instagram & more",
  },
  { value: "app", label: "App download", hint: "Link an app or smart URL" },
  {
    value: "business",
    label: "Business info",
    hint: "Share a complete business card",
  },
  {
    value: "product",
    label: "Product info",
    hint: "Share product details and link",
  },
];

export type QrTemplate = {
  id: string;
  label: string;
  description: string;
  contentType: QrContentType;
  presetId: string;
  frameCaption: string;
};

export const QR_TEMPLATES: QrTemplate[] = [
  {
    id: "business-card",
    label: "Business card",
    description: "Share a polished contact",
    contentType: "business",
    presetId: "classic",
    frameCaption: "GET IN TOUCH",
  },
  {
    id: "restaurant-menu",
    label: "Restaurant menu",
    description: "Link to your current menu",
    contentType: "url",
    presetId: "botanical",
    frameCaption: "VIEW OUR MENU",
  },
  {
    id: "wifi-card",
    label: "Wi-Fi card",
    description: "Let guests join in one scan",
    contentType: "wifi",
    presetId: "ocean",
    frameCaption: "CONNECT TO WI-FI",
  },
  {
    id: "payment-stand",
    label: "Payment stand",
    description: "Create a UPI payment intent",
    contentType: "upi",
    presetId: "botanical",
    frameCaption: "PAY HERE",
  },
  {
    id: "product-packaging",
    label: "Product packaging",
    description: "Share product details and link",
    contentType: "product",
    presetId: "sunset",
    frameCaption: "MEET YOUR PRODUCT",
  },
  {
    id: "social-profile",
    label: "Social profile",
    description: "Grow your profile audience",
    contentType: "social",
    presetId: "lavender",
    frameCaption: "FOLLOW ALONG",
  },
  {
    id: "event-invitation",
    label: "Event invitation",
    description: "Share event details and time",
    contentType: "event",
    presetId: "lavender",
    frameCaption: "YOU ARE INVITED",
  },
  {
    id: "customer-review",
    label: "Customer reviews",
    description: "Link to your review page",
    contentType: "url",
    presetId: "sunset",
    frameCaption: "LEAVE A REVIEW",
  },
  {
    id: "contact-card",
    label: "Contact card",
    description: "Share a vCard contact",
    contentType: "vcard",
    presetId: "classic",
    frameCaption: "SAVE MY CONTACT",
  },
  {
    id: "marketing-poster",
    label: "Marketing poster",
    description: "Make a clear call to action",
    contentType: "url",
    presetId: "ocean",
    frameCaption: "SCAN TO DISCOVER",
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

function parseLocalDateTime(value: string, label: string) {
  const input = required(value, label);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    input,
  );
  if (!match) throw new Error(`Enter a valid ${label}.`);
  const [, y, mo, d, h, mi, s = "0"] = match;
  const fields = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s),
  };
  const check = new Date(
    Date.UTC(
      fields.year,
      fields.month - 1,
      fields.day,
      fields.hour,
      fields.minute,
      fields.second,
    ),
  );
  if (
    check.getUTCFullYear() !== fields.year ||
    check.getUTCMonth() + 1 !== fields.month ||
    check.getUTCDate() !== fields.day ||
    fields.hour > 23 ||
    fields.minute > 59 ||
    fields.second > 59
  )
    throw new Error(`Enter a valid ${label}.`);
  return fields;
}

function zonedLocalDateTimeToUtc(
  value: string,
  timeZone: string,
  label: string,
) {
  const fields = parseLocalDateTime(value, label);
  const zone =
    timeZone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatter.format(new Date());
  } catch {
    throw new Error("Enter a valid IANA time zone, such as Asia/Kolkata.");
  }
  const target = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  );
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const difference = target - represented;
    candidate += difference;
    if (difference === 0) break;
  }
  const finalParts = Object.fromEntries(
    formatter
      .formatToParts(new Date(candidate))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  if (
    finalParts.year !== fields.year ||
    finalParts.month !== fields.month ||
    finalParts.day !== fields.day ||
    finalParts.hour !== fields.hour ||
    finalParts.minute !== fields.minute
  )
    throw new Error(
      `That ${label} does not exist in ${zone} because of a daylight-saving time change. Choose another time.`,
    );
  return { date: new Date(candidate), timeZone: zone };
}

function toIcsUtcTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function normalizedHttpUrl(value: string, label: string) {
  const input = required(value, label);
  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error(`Enter a valid ${label}, such as https://example.com.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error(`Use an http or https ${label}.`);
  if (!url.hostname.includes(".") && url.hostname !== "localhost")
    throw new Error(`Enter a complete ${label}, such as example.com.`);
  return url;
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
      if (qrByteLength(ssid) > 32)
        throw new Error("Wi-Fi network names can be up to 32 UTF-8 bytes.");
      if (!["WPA", "WEP", "nopass"].includes(values.wifiSecurity))
        throw new Error("Choose WPA/WPA2/WPA3, WEP or an open network.");
      if (values.wifiSecurity !== "nopass" && !values.wifiPassword)
        throw new Error("Enter the Wi-Fi password or choose an open network.");
      if (values.wifiSecurity === "WPA") {
        const validPassphrase =
          values.wifiPassword.length >= 8 && values.wifiPassword.length <= 63;
        const validHexPsk = /^[0-9a-f]{64}$/i.test(values.wifiPassword);
        if (!validPassphrase && !validHexPsk)
          throw new Error(
            "WPA, WPA2 and WPA3 passphrases must be 8–63 characters or a 64-digit hexadecimal key.",
          );
      }
      if (
        (values.wifiSecurity === "WEP" &&
          ![5, 13].includes(values.wifiPassword.length) &&
          ![10, 26].includes(values.wifiPassword.length)) ||
        (values.wifiSecurity === "WEP" &&
          [10, 26].includes(values.wifiPassword.length) &&
          !/^[0-9a-f]+$/i.test(values.wifiPassword))
      )
        throw new Error(
          "WEP keys must be 5 or 13 characters, or 10 or 26 hexadecimal digits.",
        );
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
      if (values.locationMapUrl.trim()) {
        payload = normalizedHttpUrl(
          values.locationMapUrl,
          "map URL",
        ).toString();
      } else {
        const coordinates = `${lat},${lng}`;
        const label = values.locationLabel.trim();
        payload = `geo:${coordinates}${label ? `?q=${coordinates}(${encodeURIComponent(label)})` : ""}`;
      }
      break;
    }
    case "event": {
      const title = required(values.eventTitle, "an event title");
      const start = zonedLocalDateTimeToUtc(
        values.eventStart,
        values.eventTimezone,
        "a start date and time",
      );
      const end = zonedLocalDateTimeToUtc(
        values.eventEnd,
        values.eventTimezone,
        "an end date and time",
      );
      if (end.date.getTime() <= start.date.getTime())
        throw new Error("The event end must be after the start.");
      const timestamp = toIcsUtcTimestamp(new Date());
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//QUICKKIT//QR Calendar Event 1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${eventUid(
          title,
          toIcsUtcTimestamp(start.date),
          toIcsUtcTimestamp(end.date),
        )}`,
        `DTSTAMP:${timestamp}`,
        `X-WR-TIMEZONE:${start.timeZone}`,
        `DTSTART:${toIcsUtcTimestamp(start.date)}`,
        `DTEND:${toIcsUtcTimestamp(end.date)}`,
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
    case "social": {
      const url = normalizedHttpUrl(values.socialUrl, "social profile URL");
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const platformHosts: Record<QrSocialPlatform, string[]> = {
        youtube: ["youtube.com", "youtu.be"],
        instagram: ["instagram.com"],
        facebook: ["facebook.com", "fb.com"],
        linkedin: ["linkedin.com"],
        x: ["x.com", "twitter.com"],
        other: [],
      };
      const allowed = platformHosts[values.socialPlatform];
      if (!allowed)
        throw new Error(
          "Choose YouTube, Instagram, Facebook, LinkedIn, X or another profile.",
        );
      if (
        allowed.length &&
        !allowed.some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        )
      )
        throw new Error(
          `Choose a ${values.socialPlatform === "x" ? "X" : values.socialPlatform} profile URL from its official domain.`,
        );
      payload = url.toString();
      break;
    }
    case "app": {
      const url = normalizedHttpUrl(values.appUrl, "app download URL");
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (!["universal", "ios", "android"].includes(values.appPlatform))
        throw new Error(
          "Choose a universal link, Apple App Store or Google Play.",
        );
      if (
        values.appPlatform === "ios" &&
        !["apps.apple.com", "itunes.apple.com"].some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        )
      )
        throw new Error(
          "Use an Apple App Store URL or choose a universal app link.",
        );
      if (
        values.appPlatform === "android" &&
        host !== "play.google.com" &&
        !host.endsWith(".play.google.com")
      )
        throw new Error(
          "Use a Google Play URL or choose a universal app link.",
        );
      payload = url.toString();
      break;
    }
    case "business": {
      const name = required(values.businessName, "a business name");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(name)};;;;`,
        `FN:${escapeVCard(name)}`,
        `ORG:${escapeVCard(name)}`,
      ];
      if (values.businessPhone.trim())
        lines.push(
          `TEL;TYPE=WORK,VOICE:${escapeVCard(normalizePhone(values.businessPhone, "a business phone number"))}`,
        );
      if (values.businessEmail.trim())
        lines.push(
          `EMAIL;TYPE=WORK:${escapeVCard(validateEmail(values.businessEmail, "a valid business email address"))}`,
        );
      if (values.businessWebsite.trim())
        lines.push(
          `URL:${escapeVCard(normalizedHttpUrl(values.businessWebsite, "business website").toString())}`,
        );
      const address = [
        "",
        "",
        values.businessStreet.trim(),
        values.businessCity.trim(),
        values.businessRegion.trim(),
        values.businessPostalCode.trim(),
        values.businessCountry.trim(),
      ];
      if (address.some(Boolean))
        lines.push(`ADR;TYPE=WORK:${address.map(escapeVCard).join(";")}`);
      if (values.businessDescription.trim())
        lines.push(`NOTE:${escapeVCard(values.businessDescription.trim())}`);
      lines.push("END:VCARD");
      payload = lines.join("\r\n");
      break;
    }
    case "product": {
      const name = required(values.productName, "a product name");
      const lines = [`PRODUCT: ${name.replace(/[\r\n]+/g, " ").trim()}`];
      if (values.productSku.trim())
        lines.push(`SKU: ${values.productSku.trim().replace(/[\r\n]+/g, " ")}`);
      if (values.productPrice.trim())
        lines.push(
          `Price: ${values.productPrice.trim().replace(/[\r\n]+/g, " ")}`,
        );
      if (values.productDescription.trim())
        lines.push(
          `Description: ${values.productDescription.trim().replace(/[\r\n]+/g, " ")}`,
        );
      if (values.productUrl.trim())
        lines.push(
          `More information: ${normalizedHttpUrl(values.productUrl, "product URL").toString()}`,
        );
      payload = lines.join("\n");
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
    contrastRatio(options.eyeColor, options.background),
    options.fillStyle === "gradient"
      ? contrastRatio(options.gradientEnd, options.background)
      : 21,
  );
}

export function validateQrOptions(options: QrOptions) {
  if (!QR_SIZES.includes(options.size as (typeof QR_SIZES)[number]))
    throw new Error("Choose a supported preset size.");
  if (
    !Number.isInteger(options.width) ||
    options.width < 128 ||
    options.width > 4096 ||
    !Number.isInteger(options.height) ||
    options.height < 128 ||
    options.height > 4096
  )
    throw new Error(
      "QR width and height must be whole pixels from 128 to 4,096.",
    );
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
  if (!QR_FRAME_STYLES.includes(options.frameStyle))
    throw new Error("Choose a supported QR frame style.");
  if (
    ![
      options.foreground,
      options.gradientEnd,
      options.background,
      options.eyeColor,
      options.logoBackground,
      options.frameColor,
      options.frameTextColor,
    ].every((color) => typeof color === "string" && hexToRgb(color))
  )
    throw new Error("Choose valid QR colors.");
  if (
    typeof options.transparentBackground !== "boolean" ||
    typeof options.logoPlate !== "boolean"
  )
    throw new Error("Choose valid transparency and logo-plate settings.");
  if (
    !Number.isFinite(options.logoScale) ||
    options.logoScale < 0.12 ||
    options.logoScale > 0.22
  )
    throw new Error("Keep a logo between 12% and 22% of the QR image.");
  if (
    !Number.isFinite(options.logoX) ||
    !Number.isFinite(options.logoY) ||
    options.logoX < 0.4 ||
    options.logoX > 0.6 ||
    options.logoY < 0.4 ||
    options.logoY > 0.6
  )
    throw new Error("Keep logo positioning within the safe center area.");
  if (
    !Number.isFinite(options.logoPadding) ||
    options.logoPadding < 0 ||
    options.logoPadding > 0.35
  )
    throw new Error("Logo padding must be between 0% and 35%.");
  if (options.frameCaption.length > 40)
    throw new Error("Keep a frame caption under 40 characters.");
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
  logoScale,
  frameContrast,
}: {
  contrast: number;
  modulePixels: number;
  quietZone: number;
  errorLevel: QrErrorLevel;
  hasLogo: boolean;
  decodeVerified: boolean | null;
  logoScale?: number;
  frameContrast?: number;
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
  if (hasLogo && logoScale !== undefined && logoScale > 0.18)
    guidance.push(
      "The logo covers more of the QR than recommended; reduce its size before printing.",
    );
  if (frameContrast !== undefined && frameContrast < 4.5)
    guidance.push(
      "Increase caption contrast so the frame text is easy to read.",
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
