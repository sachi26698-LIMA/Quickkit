import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// The root layout self-hosts Geist through `next/font/local`, which needs Next's
// compiler to become callable. Stubbing it lets the metadata object be imported
// and asserted directly, which is the thing under test here.
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-geist", className: "font-geist" }),
}));

const { metadata } = await import("../app/layout");

/**
 * Search Console ownership is a one-string contract: the token must match what
 * Google issued, it must be emitted from the root layout (so it survives edits
 * to the homepage), and adding it must not disturb the AdSense wiring.
 */
const TOKEN = "Ws39VaIkLt8aOvlE5k6mABJfBxFOHuyzIU4bgERImCY";

describe("Google Search Console verification", () => {
  it("publishes the exact token Google issued", () => {
    expect(metadata.verification).toEqual({ google: TOKEN });
    // A single character wrong here silently un-verifies the property, so the
    // shape is pinned too: 43 characters, letters and digits only.
    expect(TOKEN).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("lives in the root layout, not on one page", () => {
    // Root-layout metadata is emitted on every route, which is what keeps the
    // property verified however the homepage is restructured later.
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain(`const GOOGLE_SITE_VERIFICATION = "${TOKEN}"`);

    const home = readFileSync("app/page.tsx", "utf8");
    expect(home).not.toContain(TOKEN);
  });

  it("leaves the AdSense code untouched", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    // One loader, still keyed to the same publisher, still in the head.
    expect(layout.split("adsbygoogle.js?client=")).toHaveLength(2);
    expect(layout).toContain("client=ca-pub-1478767466279341");
    // And the AdSense meta tag that was already being served.
    expect(metadata.other).toMatchObject({
      "google-adsense-account": "ca-pub-1478767466279341",
    });
  });
});
