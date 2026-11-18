import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The navigation root cause, locked down.
 *
 * Symptom: clicking an internal link animated the page being LEFT up to the
 * top before the destination rendered.
 *
 * Cause: `html { scroll-behavior: smooth }`. Next.js resets the document with a
 * bare `documentElement.scrollTop = 0` on each client navigation, and a direct
 * scrollTop assignment honours the CSS scroll-behavior of the scroller. So the
 * stylesheet — not the router — turned every route change into a smooth scroll.
 *
 * These assertions read the stylesheet so the global smooth behaviour cannot
 * silently come back, and so the deliberate in-page anchor opt-in keeps working.
 */
const globals = readFileSync("app/globals.css", "utf8");

function ruleBody(selector: string): string | undefined {
  // Match the first rule whose selector list contains the selector exactly.
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "u");
  return regex.exec(globals)?.[1];
}

describe("global scroll behaviour", () => {
  it("does not smooth-scroll the document globally", () => {
    const html = ruleBody("html");
    expect(html, "html rule must exist").toBeTruthy();
    expect(html).toMatch(/scroll-behavior:\s*auto/u);
    expect(html).not.toMatch(/scroll-behavior:\s*smooth/u);
  });

  it("keeps the sticky-header offset that is unrelated to animation", () => {
    expect(ruleBody("html")).toMatch(/scroll-padding-top:\s*96px/u);
  });

  it("opts smooth scrolling back in only for an explicit attribute", () => {
    expect(ruleBody("html[data-smooth-scroll]")).toMatch(
      /scroll-behavior:\s*smooth/u,
    );
  });

  it("lets prefers-reduced-motion beat the opt-in", () => {
    const reduced = globals.slice(globals.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(
      /html\[data-smooth-scroll\]\s*\{\s*scroll-behavior:\s*auto\s*!important/u,
    );
  });
});

describe("smooth anchor helper", () => {
  const source = readFileSync("components/smooth-anchor.tsx", "utf8");

  it("only intercepts same-page hash links", () => {
    // A link to /#categories followed from /about must stay a route change.
    expect(source).toMatch(/url\.pathname !== window\.location\.pathname/u);
    expect(source).toMatch(/url\.origin !== window\.location\.origin/u);
  });

  it("leaves modified clicks and non-primary buttons to the browser", () => {
    expect(source).toMatch(/event\.button !== 0/u);
    expect(source).toMatch(/event\.metaKey \|\| event\.ctrlKey/u);
  });

  it("removes the opt-in again so the next navigation stays instant", () => {
    expect(source).toMatch(/removeAttribute\("data-smooth-scroll"\)/u);
  });
});

describe("no route-transition animation wrapper", () => {
  it("has no app-level template.tsx (which would remount per navigation)", () => {
    // A template.tsx is the usual way a route transition animation is bolted on;
    // none exists, so there is no route-transition animation to remove.
    expect(existsSync("app/template.tsx")).toBe(false);
    expect(existsSync("app/(public)/template.tsx")).toBe(false);
  });
});
