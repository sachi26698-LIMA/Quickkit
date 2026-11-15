import { expect, test } from "@playwright/test";

test("metal holds for 30 seconds and softly fades for 10 seconds without a countdown", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  const laptop = page.locator("[data-finish-phase]");
  const controls = page.getByRole("group", { name: "Laptop colour rotation" });
  const screen = page.getByRole("group", { name: "QUICKKIT laptop preview" });
  const tint = laptop.locator('[class*="_tint"]');
  await expect(laptop).toHaveAttribute("data-finish-running", "true");
  await expect(controls).toHaveCSS("clip-path", "inset(50%)");
  const originalScreen = await screen.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  await expect(controls).not.toContainText("Image Compressor");
  await expect(laptop).toHaveCSS("--finish-from", "rgb(244 63 94)");
  await expect(laptop).toHaveAttribute("data-finish-phase", "holding");
  await expect(laptop).toHaveAttribute("data-finish-phase", "changing", {
    timeout: 35000,
  });
  await expect(controls.getByRole("timer")).toHaveCount(0);
  await expect(tint).toHaveCSS("animation-duration", "10s");
  await expect(tint).toHaveCSS("mix-blend-mode", "color");
  await expect(tint).toHaveCSS("opacity", "0.46");
  await expect(laptop.locator('[class*="_reflection"]')).toHaveCSS(
    "mix-blend-mode",
    "screen",
  );
  const pause = controls.getByRole("button", {
    name: "Pause laptop colour rotation",
  });
  await pause.focus();
  await pause.click();
  await expect(tint).toHaveCSS("animation-play-state", "paused");
  // Wait for the compositor to commit the pause before sampling the colour.
  await tint.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.ready),
    );
  });
  const pausedColour = await tint.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await page.waitForTimeout(1200);
  await expect(controls.getByRole("timer")).toHaveCount(0);
  await expect(tint).toHaveCSS("background-color", pausedColour);
  await controls
    .getByRole("button", { name: "Resume laptop colour rotation" })
    .click();
  await expect(laptop).toHaveAttribute("data-finish-phase", "holding", {
    timeout: 12000,
  });
  await expect(controls).not.toContainText("PDF Merger");
  await expect(laptop).toHaveCSS("--finish-from", "rgb(109 40 217)");
  await expect(tint).toHaveCSS("background-color", "rgb(109, 40, 217)");
  expect(
    await screen.evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toBe(originalScreen);
});

test("reduced-motion users get a manual colour control without automatic fades", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const laptop = page.locator("[data-finish-phase]");
  const controls = page.getByRole("group", { name: "Laptop colour rotation" });
  await expect(controls.getByRole("timer")).toHaveCount(0);
  await expect(laptop).toHaveAttribute("data-finish-running", "false");
  const nextColour = controls.getByRole("button", {
    name: "Next laptop colour",
  });
  await nextColour.focus();
  await nextColour.click();
  await expect(controls).not.toContainText("PDF Merger");
  await expect(laptop).toHaveCSS("--finish-from", "rgb(109 40 217)");
  await expect(laptop.locator('[class*="_tint"]')).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const width of [390, 1440]) {
  test(`refresh paints the complete initial finish without hydration or a second tint mask at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: "reduce",
      viewport: { width, height: 1100 },
    });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("hero-laptop-reference.webp"))
        requests.push(request.url());
    });
    await page.goto("/");
    const laptop = page.locator("[data-laptop-body]");
    const image = laptop.locator("img");
    const paint = laptop.locator("feFlood");
    await expect(paint).toHaveCSS("flood-color", "rgb(244, 63, 94)");
    await expect(paint).toHaveCSS("animation-name", "none");
    await expect(paint).toHaveCSS("mask-image", "none");
    await expect(image).toHaveAttribute("decoding", "sync");
    await expect(image).toHaveAttribute("loading", "eager");
    expect(await image.evaluate((el) => getComputedStyle(el).filter)).toContain(
      "#quickkit-laptop-metal",
    );
    await expect
      .poll(() =>
        image.evaluate(
          (el) =>
            (el as HTMLImageElement).complete &&
            (el as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    // With no JavaScript, colour must already be painted and stay unchanged:
    // there is no controller mount, reveal animation or delayed fill to await.
    const initial = await image.screenshot();
    await page.waitForTimeout(350);
    expect(await image.screenshot()).toEqual(initial);
    expect(requests).toHaveLength(1);
    await page.reload();
    await expect(paint).toHaveCSS("flood-color", "rgb(244, 63, 94)");
    await expect(laptop).toHaveAttribute("data-finish-phase", "holding");
    await context.close();
  });
}
