"use client";

import { useEffect, useState } from "react";
import {
  setVisitorAnalyticsConsent,
  visitorAnalyticsAllowed,
} from "@/components/visitor-tracking";

/**
 * The opt-in switch for the anonymous visitor counter.
 *
 * It used to sit in the footer of every page. It lives here instead: the
 * control is only meaningful next to the explanation of what it stores, and a
 * per-visit button in the footer of a 42-tool site is noise.
 */
export default function AnalyticsConsent() {
  const [allowed, setAllowed] = useState(false);
  const [doNotTrack, setDoNotTrack] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setAllowed(visitorAnalyticsAllowed());
      setDoNotTrack(navigator.doNotTrack === "1");
      setReady(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("quickkit-analytics-consent", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("quickkit-analytics-consent", sync);
    };
  }, []);
  return (
    <div className="analytics-consent">
      <div className="analytics-consent-copy">
        <strong>Anonymous visitor statistics</strong>
        <p>
          Optional and off by default. When it is on, this browser sends a
          random ID and the seconds this tab was visible. No files, no URLs, no
          page history. Do Not Track is always respected.
        </p>
      </div>
      <button
        type="button"
        className={
          allowed
            ? "analytics-consent-button is-on"
            : "analytics-consent-button"
        }
        aria-pressed={allowed}
        disabled={!ready || doNotTrack}
        onClick={() => setVisitorAnalyticsConsent(!allowed)}
      >
        {doNotTrack
          ? "Blocked by Do Not Track"
          : allowed
            ? "Turn off anonymous visitor statistics"
            : "Allow anonymous visitor statistics"}
      </button>
    </div>
  );
}
