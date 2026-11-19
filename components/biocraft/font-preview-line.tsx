"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType } from "react";
import { useFontFace } from "@/lib/fonts/use-font-face";
import type { FontRecord } from "@/lib/fonts/types";

/**
 * Renders real text in a real font file. `fontFamily` is applied only after
 * the WOFF2 has finished loading; the `data-font-loaded` attribute is what
 * the browser tests assert against.
 */
export default function FontPreviewLine({
  font,
  text,
  weight = 400,
  size,
  as: Tag = "p",
  className = "",
  style,
}: {
  font: FontRecord;
  text: string;
  weight?: number;
  size?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const { status, family } = useFontFace(font, weight, text);
  return (
    <Tag
      className={`${className} ${status === "loading" ? "is-loading" : ""}`.trim()}
      data-font-slug={font.slug}
      data-font-status={status}
      data-font-loaded={status === "loaded" ? "true" : "false"}
      lang="hi"
      style={{
        ...style,
        fontFamily: family ?? undefined,
        fontWeight: weight,
        fontSize: size ? `${size}px` : undefined,
        letterSpacing: "normal",
      }}
    >
      {text}
    </Tag>
  );
}

/**
 * A card preview that does not request its font until it is close to the
 * viewport. The library can therefore show dozens of families while only the
 * visible WOFF2 files are fetched.
 */
export function LazyFontPreview({
  font,
  text,
  weight = 400,
  size,
  className = "",
  style,
}: {
  font: FontRecord;
  text: string;
  weight?: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? (
        <FontPreviewLine
          font={font}
          text={text}
          weight={weight}
          size={size}
          className="bc-preview-inner"
        />
      ) : (
        <span className="bc-preview-placeholder" aria-hidden="true">
          नमस्ते
        </span>
      )}
    </div>
  );
}
