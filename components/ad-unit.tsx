"use client";

import { useEffect, useRef } from "react";
import {
  AD_SLOTS,
  ADSENSE_CLIENT,
  DEFAULT_AD_SLOT,
  type AdFormat,
  type AdPlacement,
  type AdSlotName,
} from "@/lib/ads";

/**
 * One responsive AdSense slot.
 *
 * Nothing here loads AdSense: the loader is document-wide and lives in
 * `app/layout.tsx`, so a page can hold many units without a second script. Each
 * unit only registers itself with the queue the loader drains, exactly once.
 *
 * The rules this component exists to keep:
 *   - it is never mounted inside a tool workspace, so no ad sits beside
 *     Convert / Download / Reset / Upload or any other control the visitor is
 *     aiming at (see components/tool-shell.tsx for where its slots go);
 *   - `placement` distinguishes units on the page and is written to the DOM, so
 *     a duplicated ad is visible to a test rather than a second silent request;
 *   - the container reserves height in CSS per format and breakpoint, so an ad
 *     arriving late cannot shift the content the reader is already looking at;
 *   - with approval still pending Google serves nothing and the slot stays an
 *     empty, labelled, reserved box — never a fake or grey "advertisement"
 *     graphic, and never a prompt to click.
 */
declare global {
  interface Window {
    /** The queue the AdSense loader drains; pushing {} asks it to fill a slot. */
    adsbygoogle?: Array<Record<string, never>>;
  }
}

export default function AdUnit({
  placement,
  format = "auto",
  slot = DEFAULT_AD_SLOT,
  label = "Advertisement",
  className = "",
}: {
  /** Unique within the page. Two units may not share a placement. */
  placement: AdPlacement;
  /** Responsive shape requested from AdSense. */
  format?: AdFormat;
  /** Named unit from the registry in lib/ads.ts. Defaults to the one real unit. */
  slot?: AdSlotName;
  /** Visible label. Keep the neutral default; it is not an invitation to click. */
  label?: string;
  className?: string;
}) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const disabled =
    process.env.ADS_ENABLED === "false" ||
    process.env.NEXT_PUBLIC_ADS_ENABLED === "false";

  useEffect(() => {
    if (disabled) return;
    // React may mount twice (StrictMode, Fast Refresh) and the App Router may
    // swap pages; a second push on the same <ins> logs an AdSense error, so each
    // mounted element pushes exactly once. An element AdSense has already
    // touched carries `data-adsbygoogle-status`, which makes that check survive
    // a remount of the same DOM node.
    if (pushed.current) return;
    const ins = insRef.current;
    if (!ins || ins.getAttribute("data-adsbygoogle-status")) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocker, offline, or not yet approved: the slot simply stays empty.
    }
  }, [disabled]);

  if (disabled) return null;

  return (
    <aside
      className={`ad-slot ${className}`.trim()}
      aria-label={`${label} — ${placement}`}
      data-ad-placement={placement}
      data-ad-format={format}
    >
      <span className="ad-slot-label">{label}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS[slot]}
        data-ad-format={format}
        data-full-width-responsive="true"
        data-ad-placement={placement}
      />
    </aside>
  );
}

// Re-exported so existing imports (`import AdUnit, { AD_CLIENT }`) keep working.
export const AD_CLIENT = ADSENSE_CLIENT;
export const AD_SLOT = AD_SLOTS[DEFAULT_AD_SLOT];
