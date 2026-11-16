import { sanitizeErrorForMonitoring } from "./error-reporter";

const reported = new WeakSet<object>();
let sent = 0;

/**
 * Tells the site's own server that an error screen was shown.
 *
 * Sends the error type, an optional scrubbed message, Next.js's opaque digest
 * and the page path without its query string. Never sends tool input, files,
 * cookies or the stack. The server stores it only when the owner switched
 * error monitoring on. At most five reports leave one page load, and the same
 * error object is reported once. Never throws.
 */
export function reportClientError(
  error: unknown,
  scope: string,
  options: { includeMessage?: boolean } = {},
): void {
  try {
    if (typeof window === "undefined" || typeof fetch !== "function") return;
    if (error && typeof error === "object") {
      if (reported.has(error)) return;
      reported.add(error);
    }
    if (sent >= 5) return;
    sent += 1;
    const event = sanitizeErrorForMonitoring(error, scope);
    void fetch("/api/error-report", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: event.scope,
        name: event.name,
        ...(options.includeMessage === false ? {} : { message: event.message }),
        ...(event.digest ? { digest: event.digest } : {}),
        path: window.location.pathname.slice(0, 80),
      }),
    }).catch(() => undefined);
  } catch {
    /* Reporting must never break the error screen. */
  }
}

/** Test hook: forget what this page load already reported. */
export function resetClientErrorReports(): void {
  sent = 0;
}
