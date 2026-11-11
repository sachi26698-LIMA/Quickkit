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
  it("emits canonicals and QUICKKIT-branded social titles for an owner-configured HTTPS origin", async () => {
    vi.stubEnv("SITE_URL", "https://test.example");
    vi.resetModules();
    const { pageMetadata } = await import("../lib/seo");
    const subpage = pageMetadata("About Us", "Description", "/about");
    expect(subpage.alternates?.canonical).toBe("https://test.example/about");
    expect(subpage.openGraph?.title).toBe("About Us | QUICKKIT");
    expect(subpage.twitter?.title).toBe("About Us | QUICKKIT");

    const home = pageMetadata(
      "Free Online PDF, Image, QR, Code & Math Tools",
      "Description",
      "/",
    );
    expect(home.title).toEqual({
      absolute: "Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT",
    });
    expect(home.openGraph?.title).toBe(
      "Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT",
    );
    expect(home.twitter?.title).toBe(
      "Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT",
    );
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
