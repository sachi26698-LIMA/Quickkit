"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Pauses the idle float / glint of 3D icons that are scrolled out of view
 * (`data-paused="true"` → `animation-play-state: paused` in globals.css), so a
 * long page such as All Tools only animates what is actually on screen.
 *
 * Renders nothing and adds no layout. It re-scans after each route change and,
 * for icons that appear later (search / filter results), after scroll, click
 * or input. Icons it has not met yet simply keep floating, so nothing breaks
 * without it. It deliberately avoids a `MutationObserver` on the document:
 * one on `body` made Next fall back to a full page load on category links.
 */
export default function IconMotionGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).dataset.paused = entry.isIntersecting
            ? "false"
            : "true";
        }
      },
      { rootMargin: "120px 0px" },
    );
    const scan = () => {
      document.querySelectorAll(".i3d").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };

    let frame = 0;
    let timer = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    };
    const onInteract = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scan, 250);
    };

    timer = window.setTimeout(scan, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onInteract, true);
    document.addEventListener("input", onInteract, true);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onInteract, true);
      document.removeEventListener("input", onInteract, true);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
