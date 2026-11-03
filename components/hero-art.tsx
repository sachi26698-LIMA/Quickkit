"use client";
/* Pre-optimized WebP asset with manual srcSet (76 KB / 34 KB), not a remote image. */
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";

/**
 * Premium 3D-render hero illustration: tilted laptop with the QUICKKIT
 * dashboard, flowing purple ribbons and floating tool tiles. Decorative
 * (the hero copy carries the meaning). Pointer parallax is pointer-fine
 * + motion-safe only.
 */
export default function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width - 0.5).toFixed(3);
    const py = ((e.clientY - rect.top) / rect.height - 0.5).toFixed(3);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--px", px);
      el.style.setProperty("--py", py);
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  };

  return (
    <div
      className="hero-art"
      aria-hidden="true"
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="hero-art-inner">
        <img
          src="/hero-illustration.webp"
          srcSet="/hero-illustration-sm.webp 800w, /hero-illustration.webp 1200w"
          sizes="(max-width: 860px) 94vw, (max-width: 1200px) 46vw, 600px"
          width={1200}
          height={896}
          alt=""
          draggable={false}
          fetchPriority="high"
          decoding="async"
        />
      </div>
    </div>
  );
}
