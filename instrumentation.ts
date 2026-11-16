/**
 * Next.js calls this for every error thrown while the server renders a page or
 * runs a route handler. When the owner switched error monitoring on, a
 * scrubbed summary is stored in the site's own database: the error type and
 * message, Next.js's digest, and the route pattern (for example
 * `/tools/[slug]`), never the visited URL, query string, headers or cookies.
 */
export async function onRequestError(
  error: unknown,
  _request: unknown,
  context: { routePath?: string; routeType?: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const [{ sanitizeErrorForMonitoring }, { storeErrorEvent }] =
      await Promise.all([
        import("@/lib/monitoring/error-reporter"),
        import("@/lib/monitoring/error-store"),
      ]);
    const route =
      typeof context?.routePath === "string" ? context.routePath : "";
    const kind =
      typeof context?.routeType === "string" ? context.routeType : "request";
    const event = sanitizeErrorForMonitoring(
      error,
      `server:${kind} ${route}`.trim(),
    );
    await storeErrorEvent(event);
  } catch {
    /* Monitoring must never turn one failure into two. */
  }
}
