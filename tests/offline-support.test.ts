import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Offline / PWA support.
 *
 * These assertions exist mostly to protect the *exclusions*. Caching a page is
 * easy; not caching an administrator's dashboard, a POST endpoint or a
 * per-visitor response is the part that has to be enforced forever.
 */
const sw = readFileSync("public/sw.js", "utf8");

/** Pull the guard function out and exercise it against URLs. */
function loadIsCacheable(): (pathname: string, origin?: string) => boolean {
  const body = sw.slice(
    sw.indexOf("function isCacheableRequest"),
    sw.indexOf("/** Responses that must never enter a cache"),
  );
  const factory = new Function(
    "self",
    `${body}; return isCacheableRequest;`,
  ) as (s: unknown) => (request: unknown, url: URL) => boolean;
  const fn = factory({ location: { origin: "https://quickkit.example" } });
  return (pathname: string, origin = "https://quickkit.example") =>
    fn({ method: "GET" }, new URL(pathname, origin));
}

describe("service worker cache allowlist", () => {
  const isCacheable = loadIsCacheable();

  it("never caches API routes", () => {
    for (const path of [
      "/api/feedback",
      "/api/tool-feedback",
      "/api/product-lookup",
      "/api/contact",
      "/api/visitor-stats",
      "/api/error-report",
      "/api/word-to-pdf",
      "/api/admin/overview",
      "/api/admin/auth/login",
    ]) {
      expect(isCacheable(path), path).toBe(false);
    }
  });

  it("never caches the admin area or auth callbacks", () => {
    for (const path of [
      "/admin",
      "/admin/login",
      "/admin/analytics",
      "/admin/(protected)",
      "/auth/callback",
    ]) {
      expect(isCacheable(path), path).toBe(false);
    }
  });

  it("never caches cross-origin requests", () => {
    expect(isCacheable("/", "https://supabase.co")).toBe(false);
    expect(isCacheable("/", "https://pagead2.googlesyndication.com")).toBe(
      false,
    );
  });

  it("only caches immutable build output under /_next/", () => {
    expect(isCacheable("/_next/static/chunks/main-abc123.js")).toBe(true);
    expect(isCacheable("/_next/image")).toBe(false);
    expect(isCacheable("/_next/data/abc.json")).toBe(false);
  });

  it("allows the public pages it advertises", () => {
    for (const path of ["/", "/tools", "/about", "/privacy", "/offline"]) {
      expect(isCacheable(path), path).toBe(true);
    }
  });

  it("never caches a non-GET request", () => {
    const body = sw.slice(
      sw.indexOf("function isCacheableRequest"),
      sw.indexOf("/** Responses that must never enter a cache"),
    );
    const factory = new Function(
      "self",
      `${body}; return isCacheableRequest;`,
    ) as (s: unknown) => (request: unknown, url: URL) => boolean;
    const fn = factory({ location: { origin: "https://quickkit.example" } });
    expect(
      fn({ method: "POST" }, new URL("/", "https://quickkit.example")),
    ).toBe(false);
  });
});

describe("service worker response safety", () => {
  it("refuses no-store and private responses", () => {
    expect(sw).toMatch(/no-store\|private/u);
  });

  it("refuses opaque responses", () => {
    expect(sw).toMatch(/opaque/u);
  });

  it("falls back to a dedicated offline page", () => {
    expect(sw).toMatch(/caches\.match\("\/offline"\)/u);
  });

  it("uses network-first for navigations so content is never stale by default", () => {
    expect(sw).toMatch(/if \(request\.mode === "navigate"\)/u);
    expect(sw).toMatch(/const response = await fetch\(request\)/u);
  });

  it("invalidates old caches on activate", () => {
    expect(sw).toMatch(/caches\.delete\(name\)/u);
    expect(sw).toMatch(/CACHE_VERSION/u);
  });
});

describe("offline surface", () => {
  it("ships an offline page", () => {
    expect(existsSync("app/offline/page.tsx")).toBe(true);
  });

  it("ships a web manifest", () => {
    expect(existsSync("app/manifest.ts")).toBe(true);
  });

  it("registers the worker only in production", () => {
    const indicator = readFileSync("components/offline-indicator.tsx", "utf8");
    // A worker in development would serve stale unhashed chunks.
    expect(indicator).toMatch(/process\.env\.NODE_ENV !== "production"/u);
    expect(indicator).toMatch(/serviceWorker\.register\("\/sw\.js"/u);
  });

  it("shows the banner from real connectivity, not a guess", () => {
    const indicator = readFileSync("components/offline-indicator.tsx", "utf8");
    expect(indicator).toMatch(/navigator\.onLine/u);
    expect(indicator).toMatch(/addEventListener\("online"/u);
    expect(indicator).toMatch(/addEventListener\("offline"/u);
  });

  it("does not claim that every page works offline", () => {
    const indicator = readFileSync("components/offline-indicator.tsx", "utf8");
    // Normalise whitespace first: Prettier wraps this copy across lines, so a
    // literal match would break on formatting rather than on wording.
    const flat = indicator.replaceAll(/\s+/gu, " ");
    // The wording must stay qualified — pages already opened "may" still work,
    // and only tools that have already LOADED keep running, because they are
    // local. Neither statement promises anything that was never cached.
    expect(flat).toMatch(/already opened may still/u);
    expect(flat).toMatch(/any tool that has loaded keeps running/u);
    expect(flat).not.toMatch(/every (page|tool) works offline/iu);
    // And it must not promise offline support for a page that was never visited.
    expect(flat).not.toMatch(/all pages (are|work) available offline/iu);
  });
});
