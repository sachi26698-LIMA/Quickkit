import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`premium homepage preserves discovery on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Free online tools for PDFs, images, text and code",
    );
    await expect(
      page.getByText("YOUR EVERYDAY DIGITAL TOOLKIT", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".category-card")).toHaveCount(8);
    await expect(page.locator(".why-card")).toHaveCount(4);

    const chipColours = await page
      .locator(".popular-chip")
      .evaluateAll((chips) =>
        chips.map((chip) => getComputedStyle(chip).color),
      );
    expect(new Set(chipColours).size).toBe(5);
    const featureColours = await page
      .locator(".why-icon")
      .evaluateAll((icons) =>
        icons.map((icon) => getComputedStyle(icon).color),
      );
    expect(new Set(featureColours).size).toBe(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const laptopScreen = page.getByRole("group", {
      name: "QUICKKIT laptop preview",
    });
    await expect(laptopScreen).toBeVisible();
    expect(
      await laptopScreen.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--screen-accent").trim(),
      ),
    ).toBe("#6d28d9");
    const barColours = await laptopScreen
      .locator('[data-visitor-chart] [class*="_bar"]')
      .evaluateAll((bars) =>
        bars.map((bar) => getComputedStyle(bar).backgroundImage),
      );
    expect(barColours).toHaveLength(3);
    expect(new Set(barColours).size).toBe(3);
    await expect(
      laptopScreen.getByRole("button", { name: "Share feedback" }),
    ).toHaveCSS("color", "rgb(255, 255, 255)");

    const search = page.getByRole("searchbox", {
      name: "Search tools",
      exact: true,
    });
    await expect(search).toBeEnabled();
    await search.fill("compress");
    await expect(page.locator(".search-panel")).toBeVisible();
    await expect(
      page
        .locator(".search-panel")
        .getByRole("link", { name: /Image Compressor/ }),
    ).toHaveAttribute("href", "/tools/image-compressor");
    await search.press("Escape");
    await expect(page.locator(".search-panel")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Explore All Tools", exact: true }),
    ).toHaveAttribute("href", "/tools");
  });
}

test("homepage remains readable without motion or gradient text", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/");
  const headingAccent = page.locator("h1 span");
  await expect(headingAccent).toBeVisible();
  expect(
    await headingAccent.evaluate((el) => getComputedStyle(el).color),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await page
    .getByRole("heading", { name: "Why QUICKKIT?", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.locator(".why-card").first()).toBeVisible();
});
