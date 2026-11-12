import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const routes = [
  "/",
  "/tools",
  "/saved",
  "/contact",
  "/help",
  "/sitemap",
  "/category/pdf-tools",
  "/category/calculators",
  "/category/ai-tools",
  "/tools/word-counter",
  "/tools/case-converter",
  "/tools/json-formatter",
  "/tools/url-encoder-decoder",
  "/tools/password-generator",
  "/tools/qr-generator",
  "/tools/image-compressor",
  "/tools/image-resizer",
  "/tools/image-cropper",
  "/tools/image-to-image",
  "/tools/images-to-pdf",
  "/tools/pdf-to-image",
  "/tools/pdf-studio",
  "/tools/merge-pdf",
  "/tools/split-pdf",
  "/tools/compress-pdf",
  "/tools/pdf-to-word",
  "/about",
  "/privacy",
  "/terms",
  "/cookies",
  "/disclaimer",
  "/faq",
  "/copyright",
  "/accessibility",
  "/security",
  "/file-handling",
  "/intellectual-property",
];
for (const route of routes) {
  test(`accessible and error-free ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    // Trigger scroll-reveal animations and let them finish so axe audits the
    // steady-state page users read, not a mid-fade frame.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page
      .waitForFunction(
        () => !document.querySelector(".reveal-init:not(.is-visible)"),
        undefined,
        { timeout: 5000 },
      )
      .catch(() => {});
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1366, 1440])
    test(`no overflow ${route} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
}
for (const route of [
  "/tools/base64-encoder-decoder",
  "/tools/hash-generator",
  "/tools/json-formatter",
  "/tools/json-validator",
  "/tools/url-encoder-decoder",
])
  test(`reference examples wrap without clipping ${route}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    const clippedItems = await page
      .locator(".advanced-workspace .advanced-item li")
      .evaluateAll((items) =>
        items
          .filter((item) => item.scrollWidth > item.clientWidth)
          .map((item) => item.textContent?.trim().slice(0, 80)),
      );
    expect(clippedItems).toEqual([]);
  });

test("Word to PDF advertising labels meet WCAG AA contrast", async ({
  page,
}) => {
  await page.goto("/tools/word-to-pdf");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("mobile navigation opens, closes on Escape and navigates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
});
test("all page links resolve; metadata and headers are present", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.{30,}/,
    );
    for (const href of await page
      .locator("a[href]")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!))) {
      if (
        href.startsWith("#") ||
        href.includes("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:")
      )
        continue;
      if (!seen.has(href)) {
        expect((await request.get(href)).status(), href).toBe(200);
        seen.add(href);
      }
    }
  }
  const response = await request.get("/");
  expect(response.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "<loc>",
  );
  expect((await request.get("/missing-tool")).status()).toBe(404);
  expect(
    (await request.get("/opengraph-image")).headers()["content-type"],
  ).toContain("image/png");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
});
test("no tool input is transmitted by interactions", async ({ page }) => {
  await page.goto("/tools/qr-generator");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") requests.push(r.url());
    expect(r.url()).not.toContain("secret-test-payload");
  });
  await page
    .getByLabel(/Web address/)
    .fill("https://secret-test-payload.example");
  await expect(
    page.getByRole("img", { name: /Live QR code preview/ }),
  ).toBeVisible();
  // Typing alone re-renders, and exporting stays inside the page.
  const pending = page.waitForEvent("download");
  await page
    .locator("#qr-export")
    .getByRole("button", { name: /^PNG/ })
    .click();
  await pending;
  expect(requests).toEqual([]);
});
