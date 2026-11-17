"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

/**
 * Offline banner + service-worker registration.
 *
 * Registration is deliberately production-only. In development Next serves
 * unhashed chunks that change on every edit, so a cache-first worker there
 * would hand back stale JavaScript and produce failures that look like app
 * bugs. `next start` (which CI and the E2E suite use) is a production build and
 * does register it.
 *
 * The banner reports the browser's real connectivity via `navigator.onLine` and
 * the online/offline events — it is not a guess, and it does not claim any page
 * works offline. The wording says only what is true: already-visited pages may
 * open, and tools that have already loaded keep working because processing
 * happens locally.
 */
export default function OfflineIndicator() {
  const [registered, setRegistered] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Connectivity is an external store, not component state: subscribe to the
  // browser's own online/offline events and read `navigator.onLine` as the
  // snapshot. The server snapshot is `false` (never claim offline while
  // rendering on the server), so the banner simply does not exist in the HTML.
  const offline = useSyncExternalStore(
    subscribeToConnectivity,
    getOfflineSnapshot,
    () => false,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;
    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;
        setRegistered(true);
        // A waiting worker means a new cache version is ready; take it so the
        // visitor is never served a stale shell after a deploy.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              installing.postMessage({ type: "quickkit:skip-waiting" });
            }
          });
        });
      } catch {
        /* Offline support is an enhancement; a failed registration must not
           surface as an application error. */
      }
    };
    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearCaches = async () => {
    setUpdating(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      registration?.active?.postMessage({ type: "quickkit:clear-caches" });
    } catch {
      /* ignore */
    } finally {
      window.setTimeout(() => setUpdating(false), 800);
    }
  };

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <CloudOff size={18} aria-hidden="true" />
      <p>
        <strong>You are offline.</strong> Pages you have already opened may
        still work, and any tool that has loaded keeps running on your device —
        files are never uploaded, so nothing is lost.
      </p>
      {registered ? (
        <button
          type="button"
          className="offline-banner-action"
          onClick={clearCaches}
          disabled={updating}
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={updating ? "spin" : undefined}
          />
          {updating ? "Clearing…" : "Clear saved pages"}
        </button>
      ) : null}
    </div>
  );
}

/** `navigator.onLine` is the browser's own view, kept current by these events. */
function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOfflineSnapshot(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
