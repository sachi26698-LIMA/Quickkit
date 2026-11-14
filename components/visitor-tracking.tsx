"use client";

import { useEffect, useState } from "react";

const preference = "quickkit-analytics-consent";
const consentEvent = "quickkit-analytics-consent";

/** Read the stored choice. Do Not Track always wins. */
export function visitorAnalyticsAllowed(): boolean {
  try {
    return (
      localStorage.getItem(preference) === "yes" && navigator.doNotTrack !== "1"
    );
  } catch {
    return false;
  }
}

/** Record a choice and let every mounted listener react. */
export function setVisitorAnalyticsConsent(allowed: boolean) {
  try {
    localStorage.setItem(preference, allowed ? "yes" : "no");
    if (!allowed) {
      localStorage.removeItem("quickkit-visitor-id");
      sessionStorage.removeItem("quickkit-visit-id");
      sessionStorage.removeItem("quickkit-visit-ms");
    }
  } catch {
    /* Storage blocked: nothing is recorded and nothing is sent. */
  }
  window.dispatchEvent(new Event(consentEvent));
}

/** Backwards-compatible helper: opt in. */
export function allowVisitorAnalytics() {
  setVisitorAnalyticsConsent(true);
}

/**
 * Headless counter. It renders nothing and only ever sends a request when the
 * visitor has switched anonymous statistics on — the switch lives on
 * /cookies (`<AnalyticsConsent />`), not in the footer.
 */
export default function VisitorTracking() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => {
      setEnabled(visitorAnalyticsAllowed());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(consentEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(consentEvent, sync);
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let visitorId: string, sessionId: string, activeMs: number;
    try {
      visitorId =
        localStorage.getItem("quickkit-visitor-id") || crypto.randomUUID();
      localStorage.setItem("quickkit-visitor-id", visitorId);
      const started = Number(sessionStorage.getItem("quickkit-visit-start"));
      if (!started || Date.now() - started > 86400000) {
        sessionStorage.setItem("quickkit-visit-start", String(Date.now()));
        sessionStorage.removeItem("quickkit-visit-id");
        sessionStorage.removeItem("quickkit-visit-ms");
      }
      sessionId =
        sessionStorage.getItem("quickkit-visit-id") || crypto.randomUUID();
      sessionStorage.setItem("quickkit-visit-id", sessionId);
      activeMs = Number(sessionStorage.getItem("quickkit-visit-ms")) || 0;
    } catch {
      return;
    }
    let previous = performance.now(),
      visible = document.visibilityState === "visible";
    const accrue = () => {
      const now = performance.now();
      if (visible) activeMs += Math.max(0, Math.min(now - previous, 30000));
      previous = now;
      try {
        sessionStorage.setItem(
          "quickkit-visit-ms",
          String(Math.floor(activeMs)),
        );
      } catch {
        /* No persistent duration. */
      }
    };
    const send = () => {
      accrue();
      void fetch("/api/visitor-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          sessionId,
          activeMs: Math.floor(activeMs),
        }),
        keepalive: true,
      }).catch(() => {});
    };
    if (visible) send();
    const interval = setInterval(() => {
      if (visible) send();
    }, 20000);
    const visibility = () => {
      if (visible) send();
      else accrue();
      visible = document.visibilityState === "visible";
      if (visible) send();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", send);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", send);
    };
  }, [enabled]);
  return null;
}
