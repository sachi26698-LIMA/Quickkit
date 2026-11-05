/**
 * Shareable configuration.
 *
 * The whole design plus the (non-secret) form values are packed into the URL
 * fragment — after the `#`, so it is never sent to a server, never logged in
 * access logs on our side, and never sent in a Referer header. The person you
 * send it to can still read the content, and the UI says so out loud.
 */
import { base64UrlFromBytes, bytesFromBase64Url } from "./png";
import {
  contentTypeDef,
  isKnownContentType,
  sensitiveKeysFor,
} from "./payload";
import { clampDesign, defaultDesign, readFill } from "./style";
import { QrUserError, type QrContentTypeId, type QrDesign } from "./types";

export const SHARE_PARAM = "c";
/** Browsers cope with far more, but a link this long is not shareable. */
export const MAX_SHARE_CHARS = 2200;

export type SharedQrConfig = {
  typeId: QrContentTypeId;
  values: Record<string, string | boolean>;
  design: QrDesign;
};

const compactDesign = (design: QrDesign) => ({
  f: design.fg,
  b: design.bg,
  d: design.dotStyle,
  e: design.eyeStyle,
  s: design.dotScale,
  c: design.cornerRadius,
  m: design.margin,
  z: design.size,
  t: design.transparent ? 1 : 0,
  l: design.errorLevel,
  o: design.boost ? 1 : 0,
  v: design.invert ? 1 : 0,
  g: design.logo,
  fr: design.frame,
  ef: design.eyeFrame,
  eb: design.eyeBall,
});

export function encodeShareConfig(config: SharedQrConfig) {
  const def = contentTypeDef(config.typeId);
  const blocked = new Set(sensitiveKeysFor(config.typeId));
  const payload = {
    v: 1,
    t: config.typeId,
    f: Object.fromEntries(
      def.fields
        .filter((field) => !blocked.has(field.key))
        .map((field) => [
          field.key,
          config.values[field.key] === true
            ? "1"
            : String(config.values[field.key] ?? ""),
        ]),
    ),
    d: compactDesign(config.design),
  };
  const json = JSON.stringify(payload);
  const encoded = base64UrlFromBytes(new TextEncoder().encode(json));
  if (encoded.length > MAX_SHARE_CHARS)
    throw new QrUserError(
      `This configuration is too big to share as a link (${encoded.length.toLocaleString()} characters, limit ${MAX_SHARE_CHARS.toLocaleString()}). Save it as a preset instead.`,
    );
  return encoded;
}

export type ShareParse =
  | { ok: true; config: SharedQrConfig; dropped: string[] }
  | { ok: false; message: string };

/** Tolerant decode: unknown fields are dropped and reported, never trusted. */
export function decodeShareConfig(raw: string | null): ShareParse {
  if (!raw) return { ok: false, message: "No configuration in this link." };
  let parsed: Record<string, unknown>;
  try {
    const json = new TextDecoder().decode(bytesFromBase64Url(raw));
    const candidate = JSON.parse(json) as unknown;
    if (!candidate || typeof candidate !== "object") throw new Error("shape");
    parsed = candidate as Record<string, unknown>;
  } catch {
    return { ok: false, message: "This link's QR settings could not be read." };
  }
  const typeId = String(parsed.t ?? "");
  if (!isKnownContentType(typeId))
    return { ok: false, message: "This link was made for a different tool." };
  const def = contentTypeDef(typeId as QrContentTypeId);
  const blocked = new Set(sensitiveKeysFor(typeId as QrContentTypeId));
  const dropped: string[] = [];
  const values: Record<string, string | boolean> = {};
  const incoming = (parsed.f ?? {}) as Record<string, unknown>;
  for (const field of def.fields) {
    if (blocked.has(field.key)) {
      if (incoming[field.key]) dropped.push(field.label);
      continue;
    }
    const value = incoming[field.key];
    if (value === undefined) {
      values[field.key] = field.type === "checkbox" ? false : "";
      continue;
    }
    if (field.type === "checkbox")
      values[field.key] = value === "1" || value === true;
    else if (typeof value === "string" || typeof value === "number")
      values[field.key] = String(value);
    else dropped.push(field.label);
  }
  const design = (parsed.d ?? {}) as Record<string, unknown>;
  const { design: clamped, adjustments } = clampDesign(
    {
      fg: readFill(design.f, defaultDesign().fg),
      bg: readFill(design.b, defaultDesign().bg),
      dotStyle: design.d as QrDesign["dotStyle"],
      eyeStyle: design.e as QrDesign["eyeStyle"],
      dotScale: Number(design.s),
      cornerRadius: Number(design.c),
      margin: Number(design.m),
      size: Number(design.z),
      transparent: design.t === 1,
      errorLevel: design.l as QrDesign["errorLevel"],
      boost: design.o === 1,
      invert: design.v === 1,
      logo: (design.g ?? {}) as QrDesign["logo"],
      frame: design.fr as QrDesign["frame"],
      eyeFrame: design.ef as QrDesign["eyeFrame"],
      eyeBall: design.eb as QrDesign["eyeBall"],
    },
    { hasLogo: false },
  );
  return {
    ok: true,
    config: { typeId: typeId as QrContentTypeId, values, design: clamped },
    dropped: [
      ...dropped,
      ...adjustments.map((adjustment) => adjustment.message),
    ],
  };
}

export function readShareHash(hash: string) {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean) return null;
  const params = new URLSearchParams(
    clean.startsWith("?") ? clean.slice(1) : clean,
  );
  return params.get(SHARE_PARAM);
}

export function shareUrlFor(config: SharedQrConfig, path: string) {
  const encoded = encodeShareConfig(config);
  return `${window.location.origin}${path}#${SHARE_PARAM}=${encoded}`;
}
