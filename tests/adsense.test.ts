import { readFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { isAdsEnabled } from "../lib/ads";

it("keeps the AdSense loader off unless explicitly enabled", () => {
  vi.stubEnv("ADS_ENABLED", "");
  vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "");
  expect(isAdsEnabled()).toBe(false);

  vi.stubEnv("ADS_ENABLED", "true");
  expect(isAdsEnabled()).toBe(true);

  vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "false");
  expect(isAdsEnabled()).toBe(false);
  vi.unstubAllEnvs();
});

/**
 * AdSense needs two files to agree: the client id in the site-wide script and
 * the publisher id in /ads.txt. A typo in either is rejected in the AdSense
 * console without any visible error on the site, so they are checked here.
 */
it("publishes an ads.txt authorising the site's AdSense client", async () => {
  const layout = await readFile("app/layout.tsx", "utf8");
  const client = layout.match(/ca-(pub-\d+)/)?.[1];
  expect(client, "app/layout.tsx must load the AdSense script").toBeTruthy();

  const ads = await readFile("public/ads.txt", "utf8");
  expect(ads).toBe(`google.com, ${client}, DIRECT, f08c47fec0942fa0\n`);
});

it("keeps /ads.txt crawlable while the site itself is not indexable", async () => {
  const robots = await readFile("app/robots.ts", "utf8");
  expect(robots).toContain('allow: "/ads.txt"');
});
