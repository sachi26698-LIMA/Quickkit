"use client";

import { useEffect, useRef } from "react";

/**
 * One responsive display ad, wired to the AdSense loader that already lives in
 * `app/layout.tsx`. Nothing here loads a script: the loader is document-wide,
 * so this component only registers the unit with it.
 *
 * Placement rules this exists to enforce:
 *   - it is only ever mounted outside a tool workspace, so no ad sits beside
 *     Convert / Download / Reset controls (AdSense policy, and simple fairness
 *     to the person using the tool);
 *   - the container reserves height in CSS, so an ad arriving late cannot shift
 *     the content the reader is already looking at;
 *   - with approval still pending, Google serves nothing and the slot stays an
 *     empty, labelled container — never a fake or grey "advertisement" graphic.
 */
const AD_CLIENT = "ca-pub-1478767466279341";
const AD_SLOT = "1553253144";

declare global {
  interface Window {
    /** The queue the AdSense loader drains; pushing {} asks it to fill a slot. */
    adsbygoogle?: Array<Record<string, never>>;
  }
}

export default function AdUnit({
  label = "Advertisement",
  className = "",
}: {
  /** Visible label above the slot; "Advertisement" is the neutral default. */
  label?: string;
  className?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    // React may mount twice under StrictMode; a second push on the same <ins>
    // would log an AdSense error, so each mount pushes exactly once.
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocker, offline, or not yet approved: the slot simply stays empty.
    }
  }, []);

  return (
    <aside className={`ad-slot ${className}`.trim()} aria-label={label}>
      <span className="ad-slot-label">{label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

export { AD_CLIENT, AD_SLOT };
