/**
 * Redirect / source destination resolution for decoded QR payloads.
 *
 * Parses any decoded QR payload alongside its content recognition and static
 * security inspection to produce a safe, clickable destination URI when one
 * exists — web URLs, WhatsApp/social/app links, UPI payment URIs, email,
 * phone, SMS, map coordinates, contact websites, or URLs embedded inside plain
 * text — while strictly refusing executable schemes (`javascript:`, `data:`,
 * `file:`, `vbscript:`, etc.) and blocking high-risk phishing/credential URLs.
 */
import { recognize, type Recognition } from "./content";
import { inspectPayload, type Inspection } from "./security";

const ALLOWED_SCHEMES = new Set([
  "https:",
  "http:",
  "mailto:",
  "tel:",
  "sms:",
  "upi:",
  "bitcoin:",
  "ethereum:",
  "litecoin:",
  "dogecoin:",
  "solana:",
]);

export type RedirectTarget = {
  /** Validated destination URI safe to place in an anchor `href` (when not blocked). */
  href: string;
  /** Human-readable destination line displayed to the user. */
  displayUrl: string;
  /** Label for the redirect line row. */
  lineLabel: string;
  /** Label for the primary redirect CTA button. */
  actionLabel: string;
  /** True when clicking should open a new browser tab (`http:` / `https:`). */
  opensInNewTab: boolean;
  /** True when static security inspection flagged the destination as high risk. */
  blocked: boolean;
  /** Explanation shown when `blocked` is true. */
  blockedReason: string | null;
  /** Parsed hostname for web destinations, if applicable. */
  host: string | null;
  /** Uppercase scheme badge (e.g. "HTTPS", "UPI", "MAILTO"). */
  schemeLabel: string;
};

function schemeOf(uri: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(uri.trim());
  return match ? `${match[1].toLocaleLowerCase()}:` : null;
}

/** Return a normalised http(s) URL only when safe and not high-risk. */
export function safeWebHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^https?:\/\/[^\s]+$/i.test(trimmed)) return null;
  const check = inspectPayload(trimmed, "url");
  if (!check.url || check.level === "high") return null;
  return check.url;
}

function extractEmbeddedUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"'`]+/i.exec(text);
  if (!match) return null;
  // Strip trailing sentence punctuation that commonly wraps URLs in prose.
  const cleaned = match[0].replace(/[),.;!?\]}>]+$/g, "");
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function buildSmsHref(
  payload: string,
  recognition: Recognition,
): string | null {
  const number =
    recognition.fields.find((field) => field.label === "Number")?.value ?? "";
  const message =
    recognition.fields.find((field) => field.label === "Message")?.value ?? "";
  const cleanedNumber = number.replace(/[^\d+]/g, "");
  if (!cleanedNumber) return null;
  if (/^sms:/i.test(payload.trim())) {
    return `sms:${cleanedNumber}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
  }
  return `sms:${cleanedNumber}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
}

/**
 * Resolve the primary redirect/source target for a decoded QR payload.
 * Returns `null` when the payload has no navigable destination (for example,
 * Wi-Fi credentials, a calendar event, a product barcode, or plain prose with
 * no embedded URL) or uses a dangerous executable scheme.
 */
export function resolveRedirectTarget(
  payload: string,
  givenRecognition?: Recognition,
  givenInspection?: Inspection,
): RedirectTarget | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  const recognition = givenRecognition ?? recognize(payload);
  const inspection =
    givenInspection ?? inspectPayload(payload, recognition.type);

  // 1. Direct web URLs (Website URL, Social, App store, WhatsApp).
  if (inspection.url) {
    const scheme = schemeOf(inspection.url);
    if (!scheme || !ALLOWED_SCHEMES.has(scheme)) return null;
    const actionFromContent = recognition.actions.find(
      (action) => action.id === "open-url",
    )?.label;
    const actionLabel =
      actionFromContent ??
      (recognition.type === "whatsapp"
        ? "Open WhatsApp link"
        : recognition.type === "social"
          ? "Open profile"
          : recognition.type === "app"
            ? "Open store page"
            : "Open source link");
    const blocked = inspection.level === "high";
    return {
      href: inspection.url,
      displayUrl: inspection.url,
      lineLabel: "Redirect link",
      actionLabel,
      opensInNewTab: true,
      blocked,
      blockedReason: blocked
        ? "Opening is blocked while this address is flagged as high risk."
        : null,
      host: inspection.host,
      schemeLabel: scheme.replace(":", "").toUpperCase(),
    };
  }

  // Reject any payload already flagged high risk (e.g. javascript:, data:, file:).
  if (inspection.level === "high") return null;

  // 2. Recognised actions that carry a navigable href (mailto:, tel:, OpenStreetMap).
  const actionWithHref = recognition.actions.find((action) =>
    Boolean(action.href),
  );
  if (actionWithHref?.href) {
    const scheme = schemeOf(actionWithHref.href);
    if (scheme && ALLOWED_SCHEMES.has(scheme)) {
      const isWeb = scheme === "http:" || scheme === "https:";
      return {
        href: actionWithHref.href,
        displayUrl:
          recognition.type === "geo"
            ? actionWithHref.href
            : trimmed || actionWithHref.href,
        lineLabel:
          recognition.type === "geo"
            ? "Map redirect link"
            : recognition.type === "email"
              ? "Email redirect"
              : recognition.type === "phone"
                ? "Phone redirect"
                : "Redirect link",
        actionLabel: actionWithHref.label,
        opensInNewTab: isWeb,
        blocked: false,
        blockedReason: null,
        host: isWeb ? new URL(actionWithHref.href).hostname : null,
        schemeLabel: scheme.replace(":", "").toUpperCase(),
      };
    }
  }

  // 3. SMS payloads (`sms:` or `SMSTO:`).
  if (recognition.type === "sms") {
    const smsHref = buildSmsHref(payload, recognition);
    if (smsHref) {
      return {
        href: smsHref,
        displayUrl: smsHref,
        lineLabel: "SMS redirect",
        actionLabel: "Open in SMS app",
        opensInNewTab: false,
        blocked: false,
        blockedReason: null,
        host: null,
        schemeLabel: "SMS",
      };
    }
  }

  // 4. UPI payment requests (`upi://pay?...`).
  if (recognition.type === "payment" && /^upi:\/\//i.test(trimmed)) {
    return {
      href: trimmed,
      displayUrl: trimmed,
      lineLabel: "UPI payment link",
      actionLabel: "Open in UPI app",
      opensInNewTab: false,
      blocked: false,
      blockedReason: null,
      host: null,
      schemeLabel: "UPI",
    };
  }

  // 5. Cryptocurrency URI with an explicit scheme (`bitcoin:...`, `ethereum:...`, `solana:...`).
  if (recognition.type === "crypto") {
    const scheme = schemeOf(trimmed);
    if (scheme && ALLOWED_SCHEMES.has(scheme)) {
      return {
        href: trimmed,
        displayUrl: trimmed,
        lineLabel: "Wallet redirect URI",
        actionLabel: "Open in wallet app",
        opensInNewTab: false,
        blocked: false,
        blockedReason: null,
        host: null,
        schemeLabel: scheme.replace(":", "").toUpperCase(),
      };
    }
  }

  // 6. Contact cards (vCard / MECARD): prefer Website URL, then Email, then Phone.
  if (recognition.type === "vcard" || recognition.type === "mecard") {
    const website = recognition.fields.find(
      (field) => field.label === "Website",
    )?.value;
    if (website) {
      const candidate = /^https?:\/\//i.test(website.trim())
        ? website.trim()
        : `https://${website.trim()}`;
      const webCheck = inspectPayload(candidate, "url");
      if (webCheck.url) {
        const blocked = webCheck.level === "high";
        return {
          href: webCheck.url,
          displayUrl: webCheck.url,
          lineLabel: "Contact website",
          actionLabel: "Visit website",
          opensInNewTab: true,
          blocked,
          blockedReason: blocked
            ? "Opening is blocked while this address is flagged as high risk."
            : null,
          host: webCheck.host,
          schemeLabel: (webCheck.scheme ?? "https:")
            .replace(":", "")
            .toUpperCase(),
        };
      }
    }
    const email = recognition.fields.find((field) =>
      field.label.startsWith("Email"),
    )?.value;
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      const href = `mailto:${encodeURIComponent(email.trim())}`;
      return {
        href,
        displayUrl: href,
        lineLabel: "Contact email",
        actionLabel: "Compose email",
        opensInNewTab: false,
        blocked: false,
        blockedReason: null,
        host: null,
        schemeLabel: "MAILTO",
      };
    }
    const phone = recognition.fields.find((field) =>
      field.label.startsWith("Phone"),
    )?.value;
    if (phone && phone.replace(/\D/g, "").length >= 7) {
      const href = `tel:${phone.trim().replace(/\s+/g, "")}`;
      return {
        href,
        displayUrl: href,
        lineLabel: "Contact phone",
        actionLabel: "Call contact",
        opensInNewTab: false,
        blocked: false,
        blockedReason: null,
        host: null,
        schemeLabel: "TEL",
      };
    }
  }

  // 7. Plain text containing an embedded http(s) link.
  if (recognition.type === "text") {
    const embedded = extractEmbeddedUrl(trimmed);
    if (embedded) {
      const webCheck = inspectPayload(embedded, "url");
      if (webCheck.url) {
        const blocked = webCheck.level === "high";
        return {
          href: webCheck.url,
          displayUrl: webCheck.url,
          lineLabel: "Detected source link",
          actionLabel: "Open detected link",
          opensInNewTab: true,
          blocked,
          blockedReason: blocked
            ? "Opening is blocked while this address is flagged as high risk."
            : null,
          host: webCheck.host,
          schemeLabel: (webCheck.scheme ?? "https:")
            .replace(":", "")
            .toUpperCase(),
        };
      }
    }
  }

  return null;
}
