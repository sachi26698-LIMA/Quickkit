/** Shared types for the QUICKKIT QR Code Generator. */

export type QrErrorLevel = "L" | "M" | "Q" | "H";

export type QrContentTypeId =
  | "url"
  | "payment"
  | "text"
  | "email"
  | "phone"
  | "sms"
  | "whatsapp"
  | "wifi"
  | "vcard"
  | "location"
  | "event"
  | "social"
  | "app"
  | "instagram"
  | "facebook"
  | "youtube"
  | "spotify"
  | "gmaps"
  | "greview"
  | "business"
  | "product"
  | "booking"
  | "ticket"
  | "document"
  | "gallery"
  | "video"
  | "socials"
  | "landing";

/** Whether the QR symbol encodes the hosted Data Template link or raw protocol text. */
export type QrEncodingMode = "template" | "raw";

/**
 * Cryptographic security mode applied to generated QR codes:
 * - `"signed"` (default): ECDSA P-256 anti-tamper digital signature (`&sg=…`).
 * - `"auto-aes"`: Zero-knowledge AES-256-GCM encrypted link (`?e=…#k=…`) + ECDSA seal.
 * - `"password-aes"`: Passphrase-locked AES-256-GCM + PBKDF2-SHA256 vault (`/qr?e=…` or `QKE1.…`).
 * - `"none"`: Unsigned standard link / raw payload.
 */
export type QrSecurityMode = "signed" | "auto-aes" | "password-aes" | "none";

/** Visual themes for the scanned QR Data Template page. */
export type QrDataTemplateThemeId =
  "plum" | "emerald" | "midnight" | "minimal" | "sunset" | "royal";

/** How a fill (foreground modules or the background) is painted. */
export type QrFillKind = "solid" | "linear" | "radial";
export type QrFill = {
  kind: QrFillKind;
  base: string;
  /** Second stop; ignored when `kind` is "solid". */
  accent: string;
  /** Degrees, only used by "linear". */
  angle: number;
};

export type QrDotStyle =
  "square" | "rounded" | "dots" | "classy" | "classy-rounded";
export type QrEyeStyle = "square" | "rounded" | "dots" | "classy" | "circle";
export type QrLogoShape = "square" | "rounded" | "circle";

/** Frame styles shipped with Design Studio V3. "custom" uses free text. */
export type QrFrameStyle =
  "none" | "scan" | "menu" | "follow" | "contact" | "visit" | "custom";

/**
 * A decorative frame drawn *outside* the symbol's quiet zone: a rounded border
 * plus a bottom banner carrying a label. Rendered in the shared scene so the
 * PNG, SVG and preview are identical and the decode gate verifies the framed
 * artwork. Text uses the built-in stroke font (no network font, no canvas).
 */
export type QrFrame = {
  style: QrFrameStyle;
  /** Banner label. Preset styles seed this; "custom" edits it freely. */
  text: string;
  /** Border + label colour (hex). */
  fg: string;
  /** Banner fill colour (hex). */
  bg: string;
};

export type QrLogoSettings = {
  /** Side length as a fraction of the code size (kept ≤ 0.30 for scannability). */
  scale: number;
  /** Offset from centre, as a fraction of the code size (−0.5 … 0.5). */
  offsetX: number;
  offsetY: number;
  /** Halo of background colour around the logo, in module units. */
  padding: number;
  shape: QrLogoShape;
  /** Paint the halo even when the background is transparent. */
  halo: boolean;
  /** Halo colour override (hex). null = use the field colour automatically. */
  bg: string | null;
};

/** Decoded logo pixels. Held in memory only — never written to storage. */
export type QrLogoImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  name: string;
  bytes: number;
};

export type QrDesign = {
  fg: QrFill;
  bg: QrFill;
  dotStyle: QrDotStyle;
  eyeStyle: QrEyeStyle;
  /** 0.55–1: how much of each module a dot covers. */
  dotScale: number;
  /** 0–0.5: corner radius for square-ish styles, in module units. */
  cornerRadius: number;
  /** Quiet zone in modules (QR spec recommends 4). */
  margin: number;
  /** Output edge length in pixels. */
  size: number;
  transparent: boolean;
  errorLevel: QrErrorLevel;
  /** Raise EC to the strongest level that costs no extra version. */
  boost: boolean;
  /** Flip dark/light. Useful for inverted codes; scanners tolerate it less. */
  invert: boolean;
  logo: QrLogoSettings;
  /** Decorative frame + label around the symbol (V3). */
  frame: QrFrame;
  /** Independent finder-ring colour override. null = use the module fill. */
  eyeFrame: QrFill | null;
  /** Independent finder-centre colour override. null = use the module fill. */
  eyeBall: QrFill | null;
};

/** Default banner text for each preset frame style. */
export const FRAME_PRESET_TEXT: Record<
  Exclude<QrFrameStyle, "none" | "custom">,
  string
> = {
  scan: "SCAN ME",
  menu: "SCAN FOR MENU",
  follow: "FOLLOW US",
  contact: "CONTACT US",
  visit: "VISIT WEBSITE",
};

/** A generated QR: the symbol itself plus everything needed to re-render it. */
export type QrPayload = {
  typeId: QrContentTypeId;
  value: Record<string, string | boolean>;
};

export type QrConfig = {
  typeId: QrContentTypeId;
  value: Record<string, string | boolean>;
  design: QrDesign;
};

export class QrUserError extends Error {
  /** Name of the field that rejected the input, when there is one. */
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "QrUserError";
    this.field = field;
  }
}

export const QR_SIZE_MIN = 128;
export const QR_SIZE_MAX = 2048;
export const QR_SIZES = [256, 512, 768, 1024, 2048] as const;
export const QR_MARGIN_MIN = 0;
export const QR_MARGIN_MAX = 16;
export const LOGO_SCALE_MIN = 0.08;
export const LOGO_SCALE_MAX = 0.3;
