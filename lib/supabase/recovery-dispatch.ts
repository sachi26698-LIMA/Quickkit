import "server-only";
import { after } from "next/server";

/**
 * Generate the PKCE verifier and response cookie in the request, but defer the
 * actual provider call until after the response. The SDK sees the same result
 * for all addresses. Dispatch is best effort; delivery is never implied.
 */
export function recoveryDispatchFetch(eligible: boolean): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    if (
      !url.pathname.endsWith("/auth/v1/recover") ||
      method.toUpperCase() !== "POST"
    )
      return fetch(input, init);
    const savedInput = input instanceof Request ? input.clone() : input;
    after(async () => {
      if (!eligible) return;
      try {
        await fetch(savedInput, {
          ...init,
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        // Best effort. Never expose provider errors or log request contents.
      }
    });
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
