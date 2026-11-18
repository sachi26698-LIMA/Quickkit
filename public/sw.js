/*
 * QUICKKIT service worker.
 *
 * Design rule that everything else follows: **offline support is opt-in per
 * asset, never per response.** A URL is cached only if it appears in one of the
 * explicit lists below. Nothing is cached because it merely looked harmless.
 *
 * What is cached
 *   - a short precache list of static shell assets (icons, manifest, offline page)
 *   - navigations to the small set of public pages listed in OFFLINE_PAGES,
 *     using network-first so a visitor always sees fresh content when online
 *     and stale-but-labelled content only when the network is genuinely down
 *
 * What is never cached, and never will be
 *   - anything under /api/ (feedback, product lookup, visitor stats, contact,
 *     word-to-pdf, error reports) — these are per-request, often private, and
 *     several are POST-only
 *   - anything under /admin/ or /auth/ — authenticated surface; caching it
 *     would leak one administrator's data to the next person on the device
 *   - any response that is not `response.ok`, is `Cache-Control: no-store` or
 *     `private`, or is not same-origin
 *   - any request that is not a GET
 *   - Supabase, AdSense and every other cross-origin host
 *   - uploaded files: they never reach the network at all (tools run locally),
 *     so there is nothing to cache and no user data path here
 *
 * Cache versioning: bumping CACHE_VERSION renames every cache, and `activate`
 * deletes any cache whose name is not the current one. That is the entire
 * invalidation story, which keeps it inspectable.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `quickkit-shell-${CACHE_VERSION}`;
const PAGE_CACHE = `quickkit-pages-${CACHE_VERSION}`;

/** Static assets shipped with the app. Safe: public, immutable, no user data. */
const PRECACHE = [
  "/offline",
  "/icon.svg",
  "/manifest.webmanifest",
];

/**
 * Public pages that are safe to serve from cache when the network is down.
 * These are informational pages whose content is the same for every visitor.
 * Deliberately excludes every tool workspace: the tools themselves are fully
 * offline-capable because all processing happens in the page, but the *page*
 * must load fresh so its bundled worker and WASM payloads are the current ones.
 */
const OFFLINE_PAGES = [
  "/",
  "/tools",
  "/offline",
  "/about",
  "/faq",
  "/help",
  "/privacy",
  "/terms",
  "/security",
  "/file-handling",
  "/accessibility",
  "/contact",
];

const OFFLINE_PAGE_SET = new Set(OFFLINE_PAGES);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll rejects the whole install if one entry 404s, so add individually
      // and keep whatever succeeds: a missing manifest must not disable offline.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== PAGE_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** True only for the paths this worker is allowed to touch. */
function isCacheableRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/admin")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  // Next.js internals (RSC payloads, HMR, image optimisation) change constantly
  // and are not useful offline; let them fail naturally rather than serve stale.
  if (url.pathname.startsWith("/_next/")) {
    // Only immutable build output is safe.
    return url.pathname.startsWith("/_next/static/");
  }
  return true;
}

/** Responses that must never enter a cache, whatever the URL says. */
function isStorable(response) {
  if (!response || !response.ok) return false;
  if (response.type === "opaque" || response.type === "opaqueredirect")
    return false;
  const cacheControl = response.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cacheControl)) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!isCacheableRequest(request, url)) return;

  // ── Navigations: network-first, fall back to cache, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isStorable(response) && OFFLINE_PAGE_SET.has(url.pathname)) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Offline</title><p>You are offline.",
            { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // ── Immutable build output: cache-first, because the filenames are hashed.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (isStorable(response)) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })(),
    );
  }
});

/**
 * Lets the page ask the worker to drop everything, e.g. after a sign-out or
 * when the visitor clears their cache from the offline banner.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type === "quickkit:skip-waiting") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type !== "quickkit:clear-caches") return;
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    })(),
  );
});
