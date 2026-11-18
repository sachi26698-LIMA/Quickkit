import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Route skeletons — and, more importantly, the boundaries that must NOT exist.
 *
 * A `loading.tsx` only helps a route that actually awaits work before it can
 * render. Every public route in this app is statically rendered (the build
 * marks them `○`), so their HTML is complete on arrival. Adding a boundary to a
 * static route did real damage: Next streamed the skeleton into the same
 * response as the finished page, so a visitor could see placeholders wrapped
 * around content that had already rendered, and the skeleton's `role="status"`
 * made `getByRole("status")` ambiguous in the browser suite.
 *
 * These assertions therefore protect both directions: the one boundary that
 * earns its place keeps working, and the removed ones cannot come back by
 * accident.
 */
const primitives = readFileSync("components/skeletons/index.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

/** Public routes are statically rendered — no loading boundary may be added. */
const STATIC_ROUTES_WITHOUT_BOUNDARY = [
  "app/(public)/loading.tsx",
  "app/(public)/tools/loading.tsx",
  "app/(public)/tools/[calculator]/loading.tsx",
  "app/(public)/category/[slug]/loading.tsx",
  "app/(public)/guides/loading.tsx",
];

/** The admin area is dynamic (`ƒ`) and genuinely awaits data. */
const DYNAMIC_ROUTE_WITH_BOUNDARY = "app/admin/(protected)/loading.tsx";

describe("loading boundaries match route rendering mode", () => {
  for (const path of STATIC_ROUTES_WITHOUT_BOUNDARY) {
    it(`does not wrap the static route ${path} in a skeleton`, () => {
      expect(existsSync(path), `${path} must not exist`).toBe(false);
    });
  }

  it("keeps a boundary on the dynamic admin routes", () => {
    expect(existsSync(DYNAMIC_ROUTE_WITH_BOUNDARY)).toBe(true);
    const source = readFileSync(DYNAMIC_ROUTE_WITH_BOUNDARY, "utf8");
    expect(source).toMatch(/@\/components\/skeletons/u);
  });

  it("adds no boundary anywhere else under app/ that serves a static page", () => {
    // Only the admin boundary is expected in the whole tree.
    const found = execSync("find app -name loading.tsx", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    expect(found).toEqual([DYNAMIC_ROUTE_WITH_BOUNDARY]);
  });
});

describe("skeleton accessibility", () => {
  it("exposes exactly one live region, not one per block", () => {
    // One `role="status"` in the shared wrapper. Individual blocks must not
    // announce themselves, or a screen reader reads a list of empty boxes.
    // Count rendered elements, not mentions in comments: strip block comments
    // first so a doc line that names the attribute cannot satisfy the test.
    const code = primitives.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
    const statusCount = (code.match(/role="status"/gu) ?? []).length;
    expect(statusCount).toBe(1);
  });

  it("does not put aria-live on the container as well as the status node", () => {
    // Container-level aria-live plus an inner role="status" double-announces.
    // Read the wrapper's own opening tag and assert it carries neither.
    const start = primitives.indexOf("container skeleton-page");
    expect(start).toBeGreaterThan(-1);
    const tagEnd = primitives.indexOf(">", start);
    const openingTag = primitives.slice(start, tagEnd);
    expect(openingTag).not.toMatch(/aria-live/u);
    expect(openingTag).not.toMatch(/role="status"/u);
  });

  it("hides the decorative shapes from the accessibility tree", () => {
    expect(primitives).toMatch(/aria-hidden="true"/u);
  });
});

describe("skeleton motion", () => {
  it("animates only the compositor, not layout properties", () => {
    const start = globals.indexOf("@keyframes skeleton-shimmer");
    expect(start).toBeGreaterThan(-1);
    const keyframes = globals.slice(start, start + 200);
    expect(keyframes).toMatch(/background-position/u);
    expect(keyframes).not.toMatch(/(width|height|top|left|margin):/u);
  });

  it("stops the shimmer for prefers-reduced-motion", () => {
    const regex =
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\.skeleton-block[\s\S]*?\}/u;
    const match = regex.exec(globals);
    expect(match, "reduced-motion block for skeletons must exist").toBeTruthy();
    expect(match![0]).toMatch(/animation:\s*none/u);
  });
});
