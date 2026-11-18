"use client";

import { useEffect } from "react";

/**
 * Keeps deliberate same-page anchor links animated now that the document's
 * default `scroll-behavior` is `auto`.
 *
 * Why this exists: a global `html { scroll-behavior: smooth }` also animated
 * Next.js's own scroll reset on every route change, which made the page being
 * LEFT visibly glide to the top before the destination rendered. The stylesheet
 * now defaults to `auto` and this component turns smoothing back on for the
 * one case where animation is wanted — a click on a `#hash` link that points at
 * something already on the current page.
 *
 * It is intentionally narrow:
 *  - only plain left-clicks without modifier keys (no new-tab / new-window)
 *  - only when the target element exists in this document, so a link such as
 *    `/#categories` followed from /about is a normal route change
 *  - the attribute is removed again straight away, so the temporary smooth
 *    behaviour can never apply to the next navigation
 *
 * `prefers-reduced-motion` still wins: globals.css re-forces `auto` with
 * `!important` inside that media query.
 *
 * Per the CSSOM spec, changing `scroll-behavior` and immediately scrolling in
 * the same task applies the new value, because the smooth-scroll behaviour is
 * resolved when the scroll operation starts rather than on the next frame.
 */
export default function SmoothAnchor() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = (event.target as Element | null)?.closest?.(
        'a[href*="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // A hash that points at another document is a route change, not a scroll.
      if (url.pathname !== window.location.pathname) return;
      if (url.search !== window.location.search) return;

      const id = decodeURIComponent(url.hash.slice(1));
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      const root = document.documentElement;
      root.setAttribute("data-smooth-scroll", "");
      try {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } finally {
        // Clearing on the next frame is enough: the scroll operation has
        // already captured `smooth` by then, so the reset that a later
        // navigation performs is instant again.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            root.removeAttribute("data-smooth-scroll");
          });
        });
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
