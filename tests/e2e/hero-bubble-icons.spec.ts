import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1440]) {
  test(`all twelve icons chase locally, stay in bounds and return at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1500 });
    await page.goto("/");
    await expect(page.locator("#tool-search")).toBeEnabled();
    const icons = page.locator("[data-bubble-trigger]");
    await expect(icons).toHaveCount(12);
    await page
      .locator('[class*="_tile"]')
      .evaluateAll((els) =>
        els.forEach((el) => el.getAnimations().forEach((a) => a.pause())),
      );
    const sizes = await icons
      .locator(".i3d")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(1.3);
    for (let index = 0; index < 12; index++) {
      const icon = icons.nth(index);
      await icon.scrollIntoViewIfNeeded();
      const box = await icon.boundingBox();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(icon).toHaveAttribute("data-bubble-state", "playing");
      await expect(icon.locator(".i3d")).toHaveCount(1);
      await expect(page.locator("[data-bubble-overlay]")).toHaveCount(0);
      const samples = await icon
        .locator("[data-bubble-runner]")
        .evaluate(async (el) => {
          const animation = el.getAnimations()[0];
          animation.pause();
          await animation.ready;
          const points = [0, 0.12, 0.28, 0.45, 0.62, 0.8, 0.999].map(
            (phase) => {
              animation.currentTime = phase * 2400;
              const rect = el.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                right: rect.right,
                bottom: rect.bottom,
                opacity: getComputedStyle(el).opacity,
              };
            },
          );
          animation.currentTime = 2399;
          animation.play();
          return points;
        });
      for (const point of samples) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.right).toBeLessThanOrEqual(width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.bottom).toBeLessThanOrEqual(1500);
        expect(point.opacity).toBe("1");
      }
      expect(
        Math.max(...samples.map((p) => p.x)) -
          Math.min(...samples.map((p) => p.x)),
      ).toBeGreaterThan(3);
      expect(
        Math.max(...samples.map((p) => p.y)) -
          Math.min(...samples.map((p) => p.y)),
      ).toBeGreaterThan(3);
      expect(Math.abs(samples[0].x - samples.at(-1)!.x)).toBeLessThan(1);
      expect(Math.abs(samples[0].y - samples.at(-1)!.y)).toBeLessThan(1);
      await expect(icon).toHaveAttribute("data-bubble-state", "idle");
      await expect(icon).toBeVisible();
    }
    // The same icon can be tapped again; none are permanently dismissed.
    const firstBox = await icons.first().boundingBox();
    await page.mouse.click(
      firstBox!.x + firstBox!.width / 2,
      firstBox!.y + firstBox!.height / 2,
    );
    await expect(icons.first()).toHaveAttribute("data-bubble-state", "playing");
    await expect(icons.first()).toHaveAttribute("data-bubble-state", "idle");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("keyboard and reduced motion keep the same icon and focus in place", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#tool-search")).toBeEnabled();
  const icon = page.locator("[data-bubble-trigger]").first();
  await icon.focus();
  for (const key of ["Enter", "Space"]) {
    await page.keyboard.press(key);
    await expect(icon).toHaveAttribute("data-bubble-state", "playing");
    await expect(icon.locator("[data-bubble-runner]")).toHaveCSS(
      "transform",
      "none",
    );
    await expect(icon).toHaveAttribute("data-bubble-state", "idle");
    await expect(icon).toBeFocused();
    await expect(icon.locator(".i3d")).toBeVisible();
  }
});

test("real mobile touch returns the icon and leaves screen controls usable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#tool-search")).toBeEnabled();
  await page
    .locator('[class*="_tile"]')
    .evaluateAll((els) =>
      els.forEach((el) => el.getAnimations().forEach((a) => a.pause())),
    );
  const icon = page.locator("[data-bubble-trigger]").first();
  const box = await icon.boundingBox();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(icon).toHaveAttribute("data-bubble-state", "playing");
  await page
    .getByRole("searchbox", { name: "Search tools in laptop preview" })
    .fill("image");
  await expect(
    page
      .getByRole("group", { name: "QUICKKIT laptop preview" })
      .getByRole("link", { name: "Image Resizer", exact: true }),
  ).toBeVisible();
  await expect(icon).toHaveAttribute("data-bubble-state", "idle");
  await expect(icon.locator(".i3d")).toBeVisible();
  await context.close();
});
