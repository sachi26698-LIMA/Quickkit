import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getPublicCatalog: vi.fn() }));
vi.mock("@/lib/supabase/public-catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/public-catalog")>()),
  getPublicCatalog: mocks.getPublicCatalog,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("public XML sitemap eligibility", () => {
  it("omits non-indexable and non-canonical tool routes", async () => {
    vi.stubEnv("SITE_URL", "https://quickkit.example");
    vi.stubEnv("LAUNCH_APPROVED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.resetModules();
    const { mergePublicCatalog } =
      await import("@/lib/supabase/public-catalog");
    const catalog = mergePublicCatalog([], []);
    mocks.getPublicCatalog.mockResolvedValue({
      ...catalog,
      tools: catalog.tools.map((tool) => ({
        ...tool,
        isIndexable: tool.slug !== "word-counter",
        canonicalPath: tool.slug === "merge-pdf" ? "/tools/pdf-studio" : null,
      })),
    });
    const { default: sitemap } = await import("../app/sitemap");
    const urls = (await sitemap()).map((item) => item.url);

    expect(urls).not.toContain("https://quickkit.example/tools/word-counter");
    expect(urls).not.toContain("https://quickkit.example/tools/merge-pdf");
    expect(urls).toContain("https://quickkit.example/tools/pdf-studio");
    expect(urls).toContain("https://quickkit.example/category/text-writing");
  });
});
