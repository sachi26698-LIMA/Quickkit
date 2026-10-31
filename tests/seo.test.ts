import { describe, it, expect, vi, afterEach } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("production SEO configuration", () => {
  it("does not invent an origin", async () => {
    vi.stubEnv("SITE_URL", "");
    vi.resetModules();
    const { pageMetadata, siteOrigin } = await import("../lib/seo");
    expect(siteOrigin).toBeUndefined();
    expect(
      pageMetadata("Title", "Description", "/about").alternates,
    ).toBeUndefined();
  });
  it("emits canonicals for an owner-configured HTTPS origin", async () => {
    vi.stubEnv("SITE_URL", "https://test.example");
    vi.resetModules();
    const { pageMetadata } = await import("../lib/seo");
    expect(
      pageMetadata("Title", "Description", "/about").alternates?.canonical,
    ).toBe("https://test.example/about");
  });
  it.each([
    "http://test.example",
    "https://user:secret@test.example",
    "https://test.example/path",
  ])("rejects invalid production origin %s", async (value) => {
    vi.stubEnv("SITE_URL", value);
    vi.resetModules();
    await expect(import("../lib/seo")).rejects.toThrow("HTTPS origin");
  });
});
