"use client";

import { useEffect, useState } from "react";
import {
  containsLatin,
  fontFamilyName,
  loadFont,
  type FontLoadState,
} from "./loader";
import type { FontRecord } from "./types";

/**
 * Loads a family/weight on demand and returns a font-family value only once
 * the @font-face is really usable. Until then the preview uses the page font,
 * so a visitor never sees a "font label" that renders with a fallback.
 */
export function useFontFace(
  font: FontRecord,
  weight: number,
  text: string,
): { status: FontLoadState; family: string | null } {
  const key = `${font.slug}:${weight}:${containsLatin(text) ? "latin" : "deva"}`;
  const [result, setResult] = useState<{ key: string; status: FontLoadState }>({
    key: "",
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    void loadFont(font, weight, { latin: containsLatin(text) }).then((ok) => {
      if (!active) return;
      setResult({ key, status: ok ? "loaded" : "error" });
    });
    return () => {
      active = false;
    };
  }, [font, weight, text, key]);

  const status: FontLoadState = result.key === key ? result.status : "loading";
  return {
    status,
    family: status === "loaded" ? `"${fontFamilyName(font.slug)}"` : null,
  };
}
