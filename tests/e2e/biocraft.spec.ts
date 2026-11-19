import { expect, test } from "@playwright/test";

/**
 * Browser-level proof for the BioCraft Hindi font studio.
 *
 * These assertions read the rendered page: computed font families, real text
 * advances measured inside Chromium/WebKit, the actual WOFF2 requests, layout
 * at mobile widths and a downloaded poster PNG. They complement the Skia-based
 * unit suite; neither relies on font names alone.
 */

const SAMPLE = "नमस्ते भारत, ज़िंदगी खूबसूरत है।";

async function renderedWidth(
  page: import("@playwright/test").Page,
  text: string,
  fontFamily: string,
) {
  return page.evaluate(
    ({ text, fontFamily }) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return 0;
      context.font = `400 48px ${fontFamily}`;
      return context.measureText(text).width;
    },
    { text, fontFamily },
  );
}

test.describe("BioCraft Hindi font library", () => {
  test("loads real Devanagari files and applies the family after loading", async ({
    page,
  }) => {
    const fontRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/fonts/hindi/"))
        fontRequests.push(request.url());
    });

    await page.goto("/biocraft/fonts");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "हिंदी",
    );

    const firstCard = page.locator("[data-font-card]").first();
    await expect(firstCard).toBeVisible();
    const preview = firstCard.locator("[data-font-loaded]").first();
    await expect(preview).toHaveAttribute("data-font-loaded", "true", {
      timeout: 15_000,
    });
    const family = await preview.evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
    expect(family).toContain("BioCraft Hindi");

    const slug = await preview.getAttribute("data-font-slug");
    expect(
      fontRequests.some((url) => url.includes(`/fonts/hindi/${slug}/`)),
    ).toBe(true);

    // The font genuinely changes metrics instead of merely changing a label.
    const withFont = await renderedWidth(page, SAMPLE, family);
    const fallback = await renderedWidth(page, SAMPLE, "sans-serif");
    expect(withFont).toBeGreaterThan(0);
    expect(Math.abs(withFont - fallback)).toBeGreaterThan(0.5);

    // Lazy loading: a page of 12 cards must not fetch all 62 families.
    expect(fontRequests.length).toBeLessThan(30);
  });

  test("renders the user's own mixed Hindi/English preview text", async ({
    page,
  }) => {
    await page.goto("/biocraft/fonts");
    const editor = page.getByLabel("Your Hindi preview text");
    await editor.fill("BioCraft 2026 — नमस्ते दुनिया, क्ष त्र ज्ञ श्र");
    const firstPreview = page
      .locator("[data-font-card]")
      .first()
      .locator("[data-font-loaded]")
      .first();
    await expect(firstPreview).toHaveAttribute("data-font-loaded", "true");
    await expect(firstPreview).toContainText("क्ष त्र ज्ञ श्र");
    await expect(firstPreview).toContainText("BioCraft 2026");
    // The card is visibly painted (not a zero-width or hidden element).
    const box = await firstPreview.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(20);
  });

  test("searches in Hindi, filters, paginates and remembers favourites", async ({
    page,
  }) => {
    await page.goto("/biocraft/fonts");
    const cards = page.locator("[data-font-card]");
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(5);

    const search = page.getByLabel("Search Hindi fonts");
    await search.fill("पोस्टर");
    await expect
      .poll(async () => cards.count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
    await expect(page.locator(".bc-filter-note")).toContainText("families");

    await search.fill("");
    await page.getByRole("button", { name: /Load more families/i }).click();
    await expect
      .poll(async () => cards.count(), { timeout: 10_000 })
      .toBeGreaterThan(initialCount);

    await cards
      .first()
      .getByRole("button", { name: /favourites/i })
      .click();
    await page.getByRole("button", { name: /Favourites \(1\)/ }).click();
    await expect(cards).toHaveCount(1);
    await expect(page.locator(".bc-empty")).toHaveCount(0);
  });

  test("compares two families with the same text", async ({ page }) => {
    await page.goto("/biocraft/fonts");
    const cards = page.locator("[data-font-card]");
    await cards
      .nth(0)
      .getByRole("button", { name: /Compare/i })
      .click();
    await cards
      .nth(1)
      .getByRole("button", { name: /Compare/i })
      .click();
    const compare = page.getByRole("region", { name: "Font comparison" });
    await expect(compare).toBeVisible();
    await expect(compare.locator(".bc-compare-cell")).toHaveCount(2);
    const widths = await compare
      .locator(".bc-compare-cell [data-font-loaded]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          family: getComputedStyle(element).fontFamily,
          width: (element as HTMLElement).getBoundingClientRect().width,
        })),
      );
    expect(widths.length).toBe(2);
    expect(widths[0].family).not.toBe(widths[1].family);
  });
});

test.describe("BioCraft specimen & licence", () => {
  test("renders the glyph sheet and offers a licensed WOFF2 download", async ({
    page,
  }) => {
    await page.goto("/biocraft/fonts/tiro-devanagari-hindi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Tiro Devanagari Hindi",
    );
    const specimen = page.locator(".bc-specimen-large");
    await expect(specimen).toHaveAttribute("data-font-loaded", "true");
    await expect(page.getByText("Glyph test sheet")).toBeVisible();
    await expect(page.getByText("क्ष")).toBeVisible();
    const download = page.locator(".bc-download-row a").first();
    await expect(download).toHaveAttribute("download", "");
    await expect(download).toHaveAttribute("href", /\.woff2$/);
  });
});

test.describe("BioCraft studio tools", () => {
  test("switches font families and measures a real text change", async ({
    page,
  }) => {
    await page.goto("/biocraft/studio");
    const output = page.locator(".bc-output[data-font-loaded]");
    await expect(output).toHaveAttribute("data-font-loaded", "true");
    const text = (await output.textContent())?.trim() ?? SAMPLE;
    const beforeFamily = await output.evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
    const beforeWidth = await renderedWidth(page, text, beforeFamily);

    await page.locator(".bc-picker-trigger").click();
    const listbox = page.getByRole("listbox", { name: "Hindi fonts" });
    await expect(listbox).toBeVisible();
    await listbox.getByRole("option").nth(1).click();

    const outputAfter = page.locator(".bc-output[data-font-loaded]");
    await expect
      .poll(() =>
        outputAfter.evaluate((element) => getComputedStyle(element).fontFamily),
      )
      .not.toBe(beforeFamily);
    const afterFamily = await outputAfter.evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
    expect(afterFamily).toContain("BioCraft Hindi");
    const afterWidth = await renderedWidth(page, text, afterFamily);
    expect(Math.abs(afterWidth - beforeWidth)).toBeGreaterThan(0.5);
  });

  test("generates Hindi bios, shayari, quotes, captions, usernames and styles", async ({
    page,
  }) => {
    await page.goto("/biocraft/studio");
    const output = page.locator(".bc-output[data-font-loaded]");

    await page.getByLabel("Your name").fill("सचिन");
    await page.getByRole("button", { name: /Generate bios/i }).click();
    await expect(output).toContainText("सचिन");

    await page.getByRole("tab", { name: /Shayari/i }).click();
    await expect(output).toContainText(/।|,/);

    await page.getByRole("tab", { name: /Quotes/i }).click();
    await page.getByRole("tab", { name: /Captions/i }).click();
    await expect(output).toContainText("#");

    await page.getByRole("tab", { name: /Usernames/i }).click();
    await page.getByLabel("Name or word").fill("sachin");
    await page.getByRole("button", { name: /Generate handles/i }).click();
    await expect(output).toContainText(/[a-z0-9._]{4,30}/);

    await page.getByRole("tab", { name: /Stylish text/i }).click();
    await expect(page.getByText("Bold", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: /Bio library/i }).click();
    await expect(page.getByText("Ready-made bio library")).toBeVisible();
  });

  test("downloads a real poster PNG painted with the chosen font", async ({
    page,
  }) => {
    await page.goto("/biocraft/poster");
    await page
      .getByLabel("Poster text")
      .fill("नमस्ते भारत\nज़िंदगी खूबसूरत है।");
    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.getByRole("button", { name: /Download PNG/i }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect(png.length).toBeGreaterThan(8_000);
    // PNG signature + IHDR width/height (1080 × 1350 portrait preset).
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1350);
  });
});

test.describe("BioCraft mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the library readable without horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/biocraft/fonts");
    await expect(page.locator("[data-font-card]").first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const columns = await page
      .locator(".bc-grid")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(" ").length).toBe(1);
    await expect(page.getByLabel("Your Hindi preview text")).toBeVisible();
  });
});

test.describe("BioCraft admin protection", () => {
  test("redirects font admin routes to the login page", async ({ page }) => {
    await page.goto("/admin/fonts");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
