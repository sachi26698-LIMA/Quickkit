"use client";

import type { FontFile, FontRecord } from "./types";

/**
 * On-demand Devanagari font loader.
 *
 * Nothing here creates a stylesheet or downloads every family. A family is
 * registered with the CSS Font Loading API only when a card becomes visible,
 * a visitor opens the specimen editor, or a generator needs it. The browser
 * then caches the WOFF2 like any other static asset (immutable, 1 year).
 *
 * `unicode-range` is declared per subset so a Latin glyph caused by mixed
 * Hindi/English text fetches the small Latin file instead of missing from the
 * Devanagari build.
 */

const PREFIX = "BioCraft Hindi ";

const UNICODE_RANGE = {
  devanagari:
    "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09",
  latin:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
} as const;

export function fontFamilyName(slug: string): string {
  return `${PREFIX}${slug}`;
}

export type FontLoadState = "idle" | "loading" | "loaded" | "error";

const pending = new Map<string, Promise<boolean>>();
const registered = new Set<string>();
const states = new Map<string, FontLoadState>();
const listeners = new Set<(slug: string, state: FontLoadState) => void>();

function notify(slug: string, state: FontLoadState) {
  states.set(slug, state);
  for (const listener of listeners) listener(slug, state);
}

export function subscribeFontState(
  listener: (slug: string, state: FontLoadState) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function fontLoadState(slug: string): FontLoadState {
  return states.get(slug) ?? "idle";
}

function pickDevanagariFile(font: FontRecord, weight: number): FontFile {
  const variable = font.files.devanagari.find((file) => file.weight === null);
  if (variable) return variable;
  const candidates = font.files.devanagari.filter(
    (file) => typeof file.weight === "number",
  );
  if (!candidates.length) return font.primaryFile;
  const closest = candidates.reduce((best, candidate) =>
    Math.abs((candidate.weight ?? 400) - weight) <
    Math.abs((best.weight ?? 400) - weight)
      ? candidate
      : best,
  );
  return closest;
}

function pickLatinFile(font: FontRecord, weight: number): FontFile | null {
  if (!font.files.latin.length) return null;
  const variable = font.files.latin.find((file) => file.weight === null);
  if (variable) return variable;
  const candidates = font.files.latin;
  return candidates.reduce((best, candidate) =>
    Math.abs((candidate.weight ?? 400) - weight) <
    Math.abs((best.weight ?? 400) - weight)
      ? candidate
      : best,
  );
}

function weightDescriptor(font: FontRecord, file: FontFile): string {
  if (file.weight === null) {
    const range = font.variable?.wght;
    if (range) return `${range.min} ${range.max}`;
    return "100 900";
  }
  return String(file.weight);
}

function registerFace(
  family: string,
  file: FontFile,
  weight: string,
): FontFace | null {
  const key = `${family}|${file.path}|${weight}`;
  if (registered.has(key)) return null;
  if (typeof FontFace === "undefined") return null;
  const face = new FontFace(family, `url("${file.path}")`, {
    weight,
    style: file.style || "normal",
    display: "swap",
    unicodeRange: UNICODE_RANGE[file.subset],
  });
  document.fonts.add(face);
  registered.add(key);
  return face;
}

/**
 * Loads one family at one weight. Repeated calls share the same promise; a
 * failed network request is retried on the next call instead of being cached
 * as a permanent failure.
 */
export function loadFont(
  font: FontRecord,
  weight = 400,
  options: { latin?: boolean } = {},
): Promise<boolean> {
  const clamped = Math.min(
    font.weightRange[1],
    Math.max(font.weightRange[0], Math.round(weight || 400)),
  );
  const cacheKey = `${font.slug}:${clamped}:${options.latin ? "latin" : "deva"}`;
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  if (typeof document === "undefined") return Promise.resolve(false);

  const family = fontFamilyName(font.slug);
  const devanagariFile = pickDevanagariFile(font, clamped);
  const latinFile = options.latin ? pickLatinFile(font, clamped) : null;
  const weightValue = weightDescriptor(font, devanagariFile);

  notify(font.slug, "loading");
  const devanagariFace = registerFace(family, devanagariFile, weightValue);
  if (latinFile) {
    // Latin is registered with its unicode-range but never preloaded: it
    // downloads only if a Latin character is actually painted.
    registerFace(family, latinFile, weightDescriptor(font, latinFile));
  }

  const promise = (
    devanagariFace
      ? devanagariFace.load()
      : document.fonts.load(`400 16px "${family}"`, "नमस्ते")
  )
    .then(() => {
      notify(font.slug, "loaded");
      return true;
    })
    .catch(() => {
      pending.delete(cacheKey);
      notify(font.slug, "error");
      return false;
    });

  pending.set(cacheKey, promise);
  return promise;
}

/** Loads the family only once the element is actually near the viewport. */
export function observeFontCard(
  element: Element,
  font: FontRecord,
  weight: number,
  options: { latin?: boolean } = {},
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    void loadFont(font, weight, options);
    return () => undefined;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadFont(font, weight, options);
      }
    },
    { rootMargin: "240px 0px" },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

export function containsLatin(text: string): boolean {
  return /[A-Za-z0-9]/.test(text);
}
