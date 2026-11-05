/**
 * Phase E — static Smart Link landing page.
 *
 * Proves the downloadable HTML is real, self-contained and safe: user text is
 * escaped (no script injection), links are http(s)-only, the page has no
 * external requests or JavaScript, and validation refuses an empty or broken
 * config rather than emitting a half-built page.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANDING,
  MAX_LANDING_LINKS,
  buildLandingHtml,
  escapeHtml,
  sanitizeLandingConfig,
  validateLanding,
} from "@/lib/tools/qr/landing";

const valid = {
  title: "Cafe Aroma",
  bio: "Coffee & cakes in Ahmedabad",
  accent: "#d6598f",
  links: [
    { label: "Menu", url: "https://example.com/menu" },
    { label: "Instagram", url: "instagram.com/cafearoma" },
  ],
};

describe("landing page HTML", () => {
  it("builds a self-contained page with the title, bio and links", () => {
    const html = buildLandingHtml(valid);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Cafe Aroma");
    expect(html).toContain("Coffee &amp; cakes in Ahmedabad");
    expect(html).toContain('href="https://example.com/menu"');
    // Bare domain is normalized to https.
    expect(html).toContain('href="https://instagram.com/cafearoma"');
    expect(html).toContain('rel="noopener noreferrer"');
    // Self-contained: no external resources, no scripts.
    expect(html).not.toContain("<script");
    expect(html).not.toContain("http://www.w3.org"); // no external SVG/ns fetch
    expect(html).not.toMatch(/<link[^>]+href=/); // no external stylesheet
    expect(html).not.toMatch(/src\s*=/); // no external images/scripts
  });

  it("escapes hostile text so it cannot inject markup", () => {
    const html = buildLandingHtml({
      ...valid,
      title: '<script>alert("x")</script>',
      links: [
        { label: '"><img src=x onerror=alert(1)>', url: "https://example.com" },
      ],
    });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;&gt;&lt;img");
  });

  it("refuses dangerous URL schemes", () => {
    expect(() =>
      buildLandingHtml({
        ...valid,
        links: [{ label: "Evil", url: "javascript:alert(1)" }],
      }),
    ).toThrow(/http/);
    expect(() =>
      buildLandingHtml({
        ...valid,
        links: [{ label: "Evil", url: "data:text/html,hi" }],
      }),
    ).toThrow();
  });

  it("uses the chosen accent colour", () => {
    const html = buildLandingHtml({ ...valid, accent: "#3b1b4f" });
    expect(html).toContain("--accent: #3b1b4f");
  });
});

describe("landing validation", () => {
  it("requires a title and at least one link", () => {
    expect(validateLanding({ ...valid, title: "  " }).ok).toBe(false);
    expect(validateLanding({ ...valid, links: [] }).ok).toBe(false);
    expect(
      validateLanding({ ...valid, links: [{ label: "", url: "" }] }).ok,
    ).toBe(false);
    expect(validateLanding(valid).ok).toBe(true);
  });

  it("reports a missing label and an invalid URL precisely", () => {
    const result = validateLanding({
      ...valid,
      links: [
        { label: "", url: "https://example.com" },
        { label: "Bad", url: "not a url at all" },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /needs a label/.test(e))).toBe(true);
  });

  it("caps the link count at eight", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `Link ${i}`,
      url: `https://example.com/${i}`,
    }));
    const config = sanitizeLandingConfig({ ...valid, links: many });
    expect(config.links).toHaveLength(MAX_LANDING_LINKS);
    const html = buildLandingHtml({ ...valid, links: many });
    expect(html.match(/class="link"/g)).toHaveLength(MAX_LANDING_LINKS);
  });

  it("sanitizes lengths and falls back for a bad accent", () => {
    const config = sanitizeLandingConfig({
      title: "x".repeat(200),
      bio: "y".repeat(400),
      accent: "not-a-color",
      links: [{ label: "z".repeat(100), url: "https://example.com" }],
    });
    expect(config.title.length).toBeLessThanOrEqual(80);
    expect(config.bio.length).toBeLessThanOrEqual(200);
    expect(config.accent).toBe(DEFAULT_LANDING.accent);
    expect(config.links[0].label.length).toBeLessThanOrEqual(60);
  });

  it("escapeHtml covers the five special characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
