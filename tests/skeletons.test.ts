import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Route skeletons.
 *
 * Next gives one loading slot per segment, so the coverage that matters is:
 * every route group that would otherwise show nothing has a boundary, and the
 * pages whose layout differs meaningfully from the generic one override it.
 */
const globals = readFileSync("app/globals.css", "utf8");
const primitives = readFileSync("components/skeletons/index.tsx", "utf8");

const EXPECTED_BOUNDARIES = [
  "app/(public)/loading.tsx", // public fallback: home, legal, help, account
  "app/(public)/tools/loading.tsx", // the explorer/search results
  "app/(public)/tools/[calculator]/loading.tsx", // every tool workspace
  "app/(public)/category/[slug]/loading.tsx",
  "app/(public)/guides/loading.tsx",
  "app/admin/(protected)/loading.tsx",
];

describe("skeleton coverage", () => {
  for (const path of EXPECTED_BOUNDARIES) {
    it(`defines a loading boundary at ${path}`, () => {
      expect(existsSync(path), `${path} must exist`).toBe(true);
    });
  }

  it("composes every boundary from the shared primitives", () => {
    for (const path of EXPECTED_BOUNDARIES) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toMatch(/@\/components\/skeletons/u);
    }
  });

  it("keeps page-specific layouts rather than reusing one generic file", () => {
    const tool = readFileSync(
      "app/(public)/tools/[calculator]/loading.tsx",
      "utf8",
    );
    const explorer = readFileSync("app/(public)/tools/loading.tsx", "utf8");
    // The tool page reserves a workspace card and a guidance grid; the explorer
    // reserves a search row and a card grid. Different shapes, one primitives set.
    expect(tool).toMatch(/skeleton-guidance/u);
    expect(explorer).toMatch(/SkeletonCardGrid/u);
    expect(tool).not.toBe(explorer);
  });
});

describe("skeleton accessibility and motion", () => {
  it("marks the region busy and announces once to assistive tech", () => {
    expect(primitives).toMatch(/aria-busy="true"/u);
    expect(primitives).toMatch(/role="status"/u);
    expect(primitives).toMatch(/sr-only/u);
  });

  it("hides the decorative shapes from the accessibility tree", () => {
    expect(primitives).toMatch(/aria-hidden="true"/u);
  });

  it("uses a shimmer animation defined in the stylesheet", () => {
    expect(globals).toMatch(/@keyframes skeleton-shimmer/u);
    expect(globals).toMatch(/animation:\s*skeleton-shimmer/u);
  });

  it("animates only the compositor, not layout properties", () => {
    // background-position is a paint property; it cannot trigger reflow of the
    // page behind the skeleton, which is what would cost CLS.
    const keyframes = globals.slice(
      globals.indexOf("@keyframes skeleton-shimmer"),
      globals.indexOf("@keyframes skeleton-shimmer") + 200,
    );
    expect(keyframes).toMatch(/background-position/u);
    expect(keyframes).not.toMatch(/(width|height|top|left|margin):/u);
  });

  it("stops the shimmer for prefers-reduced-motion", () => {
    // Find the reduced-motion block that governs the skeleton selectors and
    // assert it turns the animation off. Matching on the rule body rather than
    // a character offset keeps this independent of formatting.
    const regex =
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\.skeleton-block[\s\S]*?\}/u;
    const match = regex.exec(globals);
    expect(match, "reduced-motion block for skeletons must exist").toBeTruthy();
    expect(match![0]).toMatch(/animation:\s*none/u);
  });
});

describe("skeleton sizing avoids layout shift", () => {
  it("reserves the workspace height with a clamp, not a percentage", () => {
    const tool = readFileSync(
      "app/(public)/tools/[calculator]/loading.tsx",
      "utf8",
    );
    expect(tool).toMatch(/height="clamp\(/u);
  });

  it("keeps the search row at the real 3.1rem height", () => {
    const explorer = readFileSync("app/(public)/tools/loading.tsx", "utf8");
    expect(explorer).toMatch(/3\.1rem/u);
  });
});
