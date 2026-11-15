import { expect, test } from "@playwright/test";
import { enableMotionForGeometryTest } from "./helpers/hero-motion";

const sceneSelector = '[class*="_scene"]';
const laptopSelector = '[class*="_laptop"] img';
const tilesSelector = '[class*="_tile"]';

for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`reference hero stays contained and hydrates at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const html = await (await request.get("/")).text();
    expect(html).toMatch(
      /<img[^>]+src="\/hero-laptop-reference\.webp"[^>]+width="1438"[^>]+height="920"/,
    );
    const errors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" ||
        /hydrat|server rendered html|didn't match/i.test(message.text())
      )
        errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator("#tool-search")).toBeEnabled();
    const scene = page.locator(sceneSelector),
      laptop = page.locator(laptopSelector),
      screen = page.getByRole("group", { name: "QUICKKIT laptop preview" });
    await expect(scene.locator(tilesSelector)).toHaveCount(12);
    await expect(screen.getByText("QUICKKIT", { exact: true })).toBeVisible();
    await expect(
      screen.getByText("Small tasks.", { exact: false }),
    ).toHaveCount(0);
    await expect(screen.locator('[class*="_screenLogo"]')).toBeVisible();
    await expect(screen.getByText("No feedback yet")).toBeVisible();
    await expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search any tool...",
    );
    await expect(
      screen.getByRole("link", { name: "Explore All Tools" }),
    ).toHaveCount(0);
    const chart = screen.locator("[data-visitor-chart]");
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute("data-revealed", "false");
    await expect(chart.locator("[data-metric-value]")).toHaveCount(3);
    await expect(chart.locator("[data-metric-label]")).toHaveText(["", "", ""]);
    await expect(
      page
        .locator(".hero-copy")
        .getByRole("button", { name: "Share feedback" }),
    ).toHaveCount(0);
    await enableMotionForGeometryTest(page, width);
    await expect
      .poll(() =>
        laptop.evaluate(
          (element) =>
            getComputedStyle(element.parentElement!).animationPlayState,
        ),
      )
      .toBe("running");
    const initial = await laptop.evaluate(
      (element) => getComputedStyle(element.parentElement!).transform,
    );
    for (let i = 0; i < 8; i++) {
      const layout = await page.evaluate(
        ({ sceneSelector, laptopSelector, tilesSelector }) => {
          const rect = (selector: string) =>
            document.querySelector(selector)!.getBoundingClientRect();
          const scene = rect(sceneSelector),
            laptop = rect(laptopSelector),
            search = rect(".hero-search-zone"),
            copy = rect(".hero-copy"),
            category = rect("#categories"),
            hero = rect(".hero");
          const image = document.querySelector(
            laptopSelector,
          ) as HTMLImageElement;
          return {
            noOverflow:
              document.documentElement.scrollWidth ===
              document.documentElement.clientWidth,
            contained:
              laptop.left >= scene.left &&
              laptop.right <= scene.right &&
              laptop.top >= scene.top &&
              laptop.bottom <= scene.bottom,
            iconsContained: [...document.querySelectorAll(tilesSelector)].every(
              (e) => {
                const a = e.getBoundingClientRect();
                return (
                  a.left >= scene.left &&
                  a.right <= scene.right &&
                  a.top >= scene.top &&
                  a.bottom <= scene.bottom
                );
              },
            ),
            separated:
              search.bottom <= scene.top &&
              scene.bottom <= copy.top &&
              hero.bottom < category.top,
            dimensions: [image.naturalWidth, image.naturalHeight],
            objectFit: getComputedStyle(image).objectFit,
            clip: getComputedStyle(
              document.querySelector('[class*="_screenLayer"]')!,
            ).clipPath.startsWith("polygon("),
          };
        },
        { sceneSelector, laptopSelector, tilesSelector },
      );
      expect(layout, `layout at sample ${i}`).toEqual({
        noOverflow: true,
        contained: true,
        iconsContained: true,
        separated: true,
        dimensions: [1438, 920],
        objectFit: "contain",
        clip: true,
      });
      await page.waitForTimeout(300);
    }
    expect(
      await laptop.evaluate(
        (element) => getComputedStyle(element.parentElement!).transform,
      ),
    ).not.toBe(initial);
    expect(errors).toEqual([]);
  });
}

test("reduced motion disables laptop, screen and icon animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const selector of [
    '[class*="_laptop"]',
    '[class*="_miniMain"]',
    tilesSelector,
    '[class*="_groundShadow"]',
    '[class*="_contactShadow"]',
  ]) {
    expect(
      await page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
  }
});
for (const width of [390, 1440]) {
  test(`miniature and main searches and actions work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const screen = page.getByRole("group", { name: "QUICKKIT laptop preview" });
    await screen.getByRole("searchbox").fill("qr code");
    await screen.getByRole("link", { name: "QR Code Generator" }).click();
    await expect(page).toHaveURL(/\/tools\/qr-generator$/);
    await page.goto("/");
    await screen.getByRole("searchbox").fill("merge pdf");
    await screen.getByRole("searchbox").press("Enter");
    await expect(page).toHaveURL(/\/tools\?q=merge(\+|%20)pdf/);
    await page.goto("/");
    await expect(page.locator("#tool-search")).toBeEnabled();
    await page.locator("#tool-search").fill("qr code");
    await page
      .locator(".search-result")
      .filter({ hasText: "QR Code Generator" })
      .click();
    await expect(page).toHaveURL(/\/tools\/qr-generator$/);
    await page.goto("/");
    await page
      .locator(".hero-actions")
      .getByRole("link", { name: "Explore All Tools" })
      .click();
    await expect(page).toHaveURL(/\/tools$/);
    await page.goto("/");
    await expect(
      page
        .locator(".hero-actions")
        .getByRole("link", { name: "Browse Categories" }),
    ).toHaveCount(0);
    const categories = page.locator("#categories");
    await expect(
      categories.getByRole("link", { name: "View all tools" }),
    ).toHaveCount(0);
    await categories.scrollIntoViewIfNeeded();
    await expect(
      categories.getByRole("heading", { name: "Explore by Category" }),
    ).toBeVisible();
    await expect(
      categories.getByRole("link", { name: /PDF Tools/ }),
    ).toBeVisible();
  });
}

for (const width of [390, 1440]) {
  test(`feedback can be submitted and persists only in this browser at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const screen = page.getByRole("group", { name: "QUICKKIT laptop preview" });
    const trigger = screen.getByRole("button", { name: "Share feedback" });
    await trigger.hover({ force: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Share your experience" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/saved only in this browser/)).toBeVisible();
    await dialog.getByRole("radio").nth(4).check();
    await dialog.getByLabel("Name (optional)").fill("Asha");
    await dialog.getByLabel("Your feedback").fill("Clear and easy to use.");
    await dialog.getByRole("button", { name: "Add feedback" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(screen.getByText("Asha")).toBeVisible();
    await expect(screen.getByText("Clear and easy to use.")).toBeVisible();
    await page.reload();
    await expect(screen.getByText("Asha")).toBeVisible();
    await expect(screen.getByText("Clear and easy to use.")).toBeVisible();
    await trigger.hover({ force: true });
    await trigger.click();
    await dialog.getByRole("radio").nth(3).check();
    await dialog.getByLabel("Your feedback").fill("A second entry.");
    await dialog.getByRole("button", { name: "Add feedback" }).click();
    await expect(screen.getByText("Anonymous")).toBeVisible();
    await expect(screen.getByText("A second entry.")).toBeVisible();
    await expect(screen.getByText("Asha")).toBeVisible();
    await trigger.hover({ force: true });
    await trigger.click();
    await expect(
      dialog.getByRole("region", { name: "Saved feedback" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /delete|remove/i }),
    ).toHaveCount(0);
    await expect(dialog.getByText("A second entry.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(screen.getByText("A second entry.")).toBeVisible();
    await expect(screen.getByText("Asha")).toBeVisible();
    await page.reload();
    await expect(screen.getByText("A second entry.")).toBeVisible();
    await expect(screen.getByText("Asha")).toBeVisible();
  });
}

test("feedback reports storage failure without pretending it was saved", async ({
  page,
}) => {
  // The laptop intentionally floats continuously; freeze motion for this
  // storage-failure interaction so Playwright can reliably click its control.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "quickkit-hero-feedback-v1") {
        throw new Error("Storage unavailable");
      }
      return originalSetItem.call(this, key, value);
    };
  });
  const screen = page.getByRole("group", { name: "QUICKKIT laptop preview" });
  await screen.getByRole("button", { name: "Share feedback" }).click();
  const dialog = page.getByRole("dialog", { name: "Share your experience" });
  await dialog.getByRole("radio").nth(2).check();
  await dialog.getByLabel("Your feedback").fill("Test feedback");
  await dialog.getByRole("button", { name: "Add feedback" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/Could not save feedback/);
  await expect(screen.getByText("No feedback yet")).toBeVisible();
});

test("only grounding shadows remain and pause offscreen", async ({ page }) => {
  await page.goto("/");
  const ground = page.locator('[class*="_groundShadow"]');
  await expect(page.locator('[class*="_backShadow"]')).toHaveCount(0);
  const contact = page.locator('[class*="_contactShadow"]');
  for (const shadow of [ground, contact]) {
    await expect
      .poll(() =>
        shadow.evaluate(
          (element) => getComputedStyle(element).animationPlayState,
        ),
      )
      .toBe("running");
    await expect(shadow).toBeVisible();
    const initial = await shadow.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    await page.waitForTimeout(900);
    expect(
      await shadow.evaluate((element) => getComputedStyle(element).transform),
    ).not.toBe(initial);
  }
  await page.locator("#categories").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      ground.evaluate(
        (element) => getComputedStyle(element).animationPlayState,
      ),
    )
    .toBe("paused");
  await expect
    .poll(() =>
      contact.evaluate(
        (element) => getComputedStyle(element).animationPlayState,
      ),
    )
    .toBe("paused");
});

test("screen styles are applied on server render before hydration", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 700, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/");
  const chart = page.locator("[data-visitor-chart]");
  const logo = page.locator('[class*="_screenLogo"]');
  await expect(chart).toContainText("Live stats unavailable");
  expect(
    await chart.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    ),
  ).toContain("linear-gradient");
  expect(
    await chart
      .locator('[class*="_plot"]')
      .first()
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("flex");
  expect(
    await logo.evaluate((element) => getComputedStyle(element).display),
  ).toBe("grid");
  await context.close();
});

for (const width of [390, 1440]) {
  test(`top search results stay above the laptop and remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const input = page.locator("#tool-search");
    await expect(input).toBeEnabled();
    await input.fill("pdf");
    const panel = page.locator(".search-panel");
    await expect(panel).toBeVisible();
    const position = await page.evaluate(() => {
      const panel = document
        .querySelector(".search-panel")!
        .getBoundingClientRect();
      const scene = document
        .querySelector('[class*="_scene"]')!
        .getBoundingClientRect();
      const result = document.querySelector(".search-result")!;
      const rect = result.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return {
        overlapsScene: panel.bottom > scene.top,
        resultReceivesPointer: !!hit && result.contains(hit),
      };
    });
    expect(position).toEqual({
      overlapsScene: true,
      resultReceivesPointer: true,
    });
    await input.press("Escape");
    await expect(panel).toHaveCount(0);
    await input.fill("qr code");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/tools\?q=qr(%20|\+)code/);
  });
}

test("twelve colourful glass icons animate independently and pause offscreen", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(tilesSelector);
  await expect(tiles).toHaveCount(12);
  await expect(tiles.locator('[class*="_glassFace"]')).toHaveCount(12);
  await expect(tiles.locator(".i3d")).toHaveCount(12);
  await expect(tiles.locator(".i3d-base")).toHaveCount(12);
  await expect(tiles.locator(".i3d-glyph")).toHaveCount(12);
  await expect(tiles.locator(".i3d-shine")).toHaveCount(12);
  const iconSizes = await tiles
    .locator(".i3d")
    .evaluateAll((icons) =>
      icons.map((icon) => icon.getBoundingClientRect().width),
    );
  expect(iconSizes.every((size) => size >= 24)).toBe(true);
  await expect
    .poll(() =>
      tiles
        .first()
        .evaluate((element) =>
          getComputedStyle(element).animationPlayState.split(",")[0].trim(),
        ),
    )
    .toBe("running");
  const appearance = await tiles.evaluateAll((elements) =>
    elements.map((element) => {
      const face = element.querySelector('[class*="_glassFace"]')!;
      return {
        tint: getComputedStyle(element)
          .getPropertyValue("--glass-light")
          .trim(),
        backdrop: getComputedStyle(face).backdropFilter,
        faceBackground: getComputedStyle(face).backgroundImage,
        depth: getComputedStyle(element).transformStyle,
        transform: getComputedStyle(element).transform,
      };
    }),
  );
  expect(new Set(appearance.map((item) => item.tint)).size).toBe(12);
  for (const icon of appearance) {
    expect(icon.backdrop).toContain("blur");
    expect(icon.faceBackground).toContain("linear-gradient");
    expect(icon.depth).toBe("preserve-3d");
  }
  await page.waitForTimeout(900);
  const later = await tiles.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  );
  expect(
    later.every((transform, i) => transform !== appearance[i].transform),
  ).toBe(true);
  const travel = await tiles.evaluateAll(async (elements) =>
    Promise.all(
      elements.map(async (element) => {
        const animation = element.getAnimations()[0];
        const timing = animation.effect!.getTiming();
        const duration = Number(timing.duration);
        animation.pause();
        await animation.ready;
        const points = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map(
          (fraction) => {
            animation.currentTime =
              Number(timing.delay) + duration * (1 + fraction);
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              z: Number(getComputedStyle(element).zIndex),
            };
          },
        );
        animation.play();
        const xs = points.map((point) => point.x),
          ys = points.map((point) => point.y);
        return {
          x: Math.max(...xs) - Math.min(...xs),
          y: Math.max(...ys) - Math.min(...ys),
          behind: points.some((point) => point.z < 2),
          ahead: points.some((point) => point.z > 2),
        };
      }),
    ),
  );
  const sceneWidth = (await page.locator(sceneSelector).boundingBox())!.width;
  for (const path of travel) {
    expect(path.x).toBeGreaterThan(sceneWidth * 0.004);
    expect(path.y).toBeGreaterThan(sceneWidth * 0.01);
    expect(path.ahead).toBe(true);
  }
  expect(travel.some((path) => path.behind)).toBe(true);
  await page.locator("#categories").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      tiles
        .first()
        .evaluate((element) =>
          getComputedStyle(element).animationPlayState.split(",")[0].trim(),
        ),
    )
    .toBe("paused");
});

for (const width of [390, 1440]) {
  test(`all twelve icons zig-zag around the perimeter without crossing the display at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("#tool-search")).toBeEnabled();
    await expect(page.locator('[class*="_backShadow"]')).toHaveCount(0);
    await enableMotionForGeometryTest(page, width);
    const paths = await page.evaluate(async () => {
      const animations = document.getAnimations();
      animations.forEach((animation) => animation.pause());
      await Promise.all(animations.map((animation) => animation.ready));
      const scene = document
        .querySelector("[data-hero-style]")!
        .getBoundingClientRect();
      const screen = document
        .querySelector("[data-laptop-body] img")!
        .getBoundingClientRect();
      return [...document.querySelectorAll('[class*="_tile"]')]
        .filter((tile) =>
          getComputedStyle(tile).animationName.includes("sideZigzag"),
        )
        .map((tile) => {
          const animation = tile.getAnimations()[0];
          const timing = animation.effect!.getTiming();
          const points = Array.from({ length: 9 }, (_, index) => {
            animation.currentTime =
              Number(timing.delay) + Number(timing.duration) * (1 + index / 8);
            const rect = tile.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              z: Number(getComputedStyle(tile).zIndex),
            };
          });
          const directions = points
            .slice(1)
            .map((point, index) => Math.sign(point.y - points[index].y));
          return {
            width:
              Math.max(...points.map((p) => p.x)) -
              Math.min(...points.map((p) => p.x)),
            sceneWidth: scene.width,
            reversals: directions
              .slice(1)
              .filter((direction, index) => direction !== directions[index])
              .length,
            crossesDisplay: points.some(
              (p) =>
                p.x > screen.left + screen.width * 0.3 &&
                p.x < screen.left + screen.width * 0.85 &&
                p.y > screen.top + screen.height * 0.12 &&
                p.y < screen.top + screen.height * 0.7,
            ),
            foreground: points.every((p) => p.z > 2),
            pointerEvents: getComputedStyle(tile).pointerEvents,
          };
        });
    });
    expect(paths).toHaveLength(12);
    for (const path of paths) {
      expect(path.width).toBeGreaterThan(path.sceneWidth * 0.008);
      expect(path.width).toBeLessThan(path.sceneWidth * 0.05);
      expect(path.reversals).toBeGreaterThanOrEqual(4);
      expect(path.crossesDisplay).toBe(false);

      expect(path.pointerEvents).toBe("none");
    }
  });
}

for (const width of [390, 1440]) {
  test(`laptop glass panel opens the complete rating form with read-only reviews at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const panel = page.locator(
      '[data-laptop-feedback-style="aurora-glass-v7"]',
    );
    await expect(panel).toBeVisible();
    const glass = await panel.evaluate((el) => ({
      background: getComputedStyle(el).backgroundImage,
      blur: getComputedStyle(el).backdropFilter,
      heading: parseFloat(
        getComputedStyle(el.querySelector("strong")!).fontSize,
      ),
    }));
    expect(glass.background).toContain("radial-gradient");
    expect(glass.blur).toContain("blur(8px)");
    expect(glass.heading).toBeGreaterThan(4);
    const button = panel.getByRole("button", { name: "Share feedback" });
    await button.hover({ force: true });
    await button.click();
    const modal = page.getByRole("dialog", { name: "Share your experience" });
    await expect(modal).toBeVisible();
    await modal.getByLabel("Name (optional)").fill("Riya");
    await modal
      .getByLabel("About", { exact: true })
      .selectOption("image-resizer");
    await modal.getByRole("radio").nth(4).check();
    await modal.getByRole("checkbox", { name: "Beautiful design" }).check();
    await modal
      .getByLabel("Your feedback")
      .fill("Love the colourful new glass design.");
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const result = await new AxeBuilder({ page })
      .include("dialog[open]")
      .analyze();
    expect(
      result.violations.filter(
        (item) => item.impact === "serious" || item.impact === "critical",
      ),
    ).toEqual([]);
    await modal
      .getByRole("button", { name: "Add feedback", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("quickkit-hero-feedback-v1")!),
    );
    expect(saved[0]).toMatchObject({
      name: "Riya",
      rating: 5,
      tool: "image-resizer",
      tags: ["Beautiful design"],
      message: "Love the colourful new glass design.",
    });
    await expect(panel.getByText("Riya", { exact: true })).toBeVisible();
    await button.hover({ force: true });
    await button.click();
    await expect(
      modal.getByRole("button", { name: /delete|remove/i }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(panel.getByText("Riya", { exact: true })).toBeVisible();
  });
}
