"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pointer-tracked tilt for the category cards, delegated from one container.
 *
 * The grid itself is a server component: only this wrapper ships JavaScript, so
 * the card markup, the catalogue data and the 3D icons stay out of the
 * homepage's client bundle. Touch devices never tilt (the handler ignores
 * non-mouse pointers) and reduced-motion users are skipped entirely.
 */
export default function TiltGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = (target: EventTarget | null) =>
      target instanceof Element
        ? (target.closest<HTMLAnchorElement>(
            ".category-card",
          ) as HTMLAnchorElement | null)
        : null;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const el = card(event.target);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      el.style.setProperty(
        "--rx",
        `${(((event.clientY - rect.top) / rect.height - 0.5) * -7).toFixed(2)}deg`,
      );
      el.style.setProperty(
        "--ry",
        `${(((event.clientX - rect.left) / rect.width - 0.5) * 9).toFixed(2)}deg`,
      );
      el.style.setProperty(
        "--gx",
        `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`,
      );
      el.style.setProperty(
        "--gy",
        `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
      );
    };
    const leave = (event: PointerEvent) => {
      const el = card(event.target);
      if (!el) return;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    grid.addEventListener("pointermove", move, { passive: true });
    grid.addEventListener("pointerout", leave, { passive: true });
    return () => {
      grid.removeEventListener("pointermove", move);
      grid.removeEventListener("pointerout", leave);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
