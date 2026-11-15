/**
 * Derive the browser-visible request origin behind a trusted reverse proxy.
 * Next's request.url can contain the internal bind host (for example,
 * 0.0.0.0) rather than the host the browser used. Vercel and the local Next
 * server provide the original host/protocol in forwarded headers; a regular
 * Host header is the fallback for direct requests.
 */
export function getRequestOrigin(request: {
  url: string;
  headers: Headers;
}): string | null {
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return null;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (!host) return requestUrl.origin;

  // A comma-separated forwarding chain is ambiguous here; fail closed rather
  // than guessing which intermediary supplied the browser-visible authority.
  if (host.includes(",")) return null;

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
  if (!/^https?$/i.test(protocol) || /[,\s]/.test(protocol)) return null;

  try {
    const parsed = new URL(`${protocol.toLowerCase()}://${host}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function hasSameOrigin(request: {
  url: string;
  headers: Headers;
}): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === getRequestOrigin(request);
  } catch {
    return false;
  }
}
