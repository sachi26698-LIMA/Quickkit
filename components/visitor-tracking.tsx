"use client";

import { useEffect, useState } from "react";

const preference = "quickkit-analytics-consent";
export function allowVisitorAnalytics() {
  try {
    localStorage.setItem(preference, "yes");
    window.dispatchEvent(new Event("quickkit-analytics-consent"));
  } catch {
    /* Storage blocked: do not track. */
  }
}
export default function VisitorTracking() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => {
      try {
        setEnabled(
          localStorage.getItem(preference) === "yes" &&
            navigator.doNotTrack !== "1",
        );
      } catch {
        setEnabled(false);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("quickkit-analytics-consent", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("quickkit-analytics-consent", sync);
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
  return (
    <div
      className="container"
      style={{
        paddingBlock: "0.75rem",
        fontSize: "0.8rem",
        textAlign: "center",
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!enabled) {
            allowVisitorAnalytics();
            return;
          }
          try {
            localStorage.setItem(preference, "no");
            localStorage.removeItem("quickkit-visitor-id");
            sessionStorage.removeItem("quickkit-visit-id");
            sessionStorage.removeItem("quickkit-visit-ms");
          } catch {
            /* Storage blocked. */
          }
          window.dispatchEvent(new Event("quickkit-analytics-consent"));
        }}
      >
        {enabled
          ? "Turn off anonymous visitor statistics"
          : "Allow anonymous visitor statistics"}
      </button>
      <span>
        {" "}
        · Optional, no files or URLs collected. Do Not Track is respected.
      </span>
    </div>
  );
}
