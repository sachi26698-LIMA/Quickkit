import { expect, test } from "@playwright/test";
import { tools } from "../../lib/catalog";

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
    await expect(scene.locator(tilesSelector)).toHaveCount(7);
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
    const chart = screen.locator('[class*="_catalogReport"]');
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute("aria-hidden", "true");
    await expect(chart).toHaveText("");
    const bars = chart.locator('[class*="_chartBar"]');
    await expect(bars).toHaveCount(3);
    const counts = ["PDF Tools", "Image Tools", "QR & Barcode"].map(
      (category) => tools.filter((tool) => tool.category === category).length,
    );
    for (let i = 0; i < counts.length; i++) {
      const height = await bars
        .nth(i)
        .evaluate((element) =>
          parseFloat((element as HTMLElement).style.height),
        );
      expect(height).toBeCloseTo((counts[i] / Math.max(...counts)) * 100);
    }
    await expect(
      page
        .locator(".hero-copy")
        .getByRole("button", { name: "Share feedback" }),
    ).toHaveCount(0);
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
          const apart = (a: DOMRect, b: DOMRect) =>
            a.right <= b.left ||
            a.left >= b.right ||
            a.bottom <= b.top ||
            a.top >= b.bottom;
          return {
            noOverflow:
              document.documentElement.scrollWidth ===
              document.documentElement.clientWidth,
            contained:
              laptop.left >= scene.left &&
              laptop.right <= scene.right &&
              laptop.top >= scene.top &&
              laptop.bottom <= scene.bottom,
            iconsOutside: [...document.querySelectorAll(tilesSelector)].every(
              (e) => {
                const a = e.getBoundingClientRect();
                return (
                  a.left >= scene.left &&
                  a.right <= scene.right &&
                  a.top >= scene.top &&
                  a.bottom <= scene.bottom &&
                  apart(a, laptop)
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
        iconsOutside: true,
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
    '[class*="_backShadow"]',
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
    await dialog.getByRole("button", { name: "Delete feedback 1" }).click();
    await expect(dialog.getByText("A second entry.")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(screen.getByText("A second entry.")).toHaveCount(0);
    await expect(screen.getByText("Asha")).toBeVisible();
    await page.reload();
    await expect(screen.getByText("A second entry.")).toHaveCount(0);
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
  await dialog.getByLabel("Your feedback").fill("Test feedback");
  await dialog.getByRole("button", { name: "Add feedback" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/Could not save feedback/);
  await expect(screen.getByText("No feedback yet")).toBeVisible();
});

test("both shadows animate with the laptop and pause offscreen", async ({
  page,
}) => {
  await page.goto("/");
  const ground = page.locator('[class*="_groundShadow"]');
  const back = page.locator('[class*="_backShadow"]');
  const contact = page.locator('[class*="_contactShadow"]');
  for (const shadow of [ground, contact, back]) {
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
      back.evaluate((element) => getComputedStyle(element).animationPlayState),
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
  const chart = page.locator('[class*="_catalogReport"]');
  const logo = page.locator('[class*="_screenLogo"]');
  await expect(chart).toHaveText("");
  expect(
    await chart.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    ),
  ).toContain("linear-gradient");
  expect(
    await chart
      .locator('[class*="_chart"]')
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

test("seven colourful glass icons animate independently and pause offscreen", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(tilesSelector);
  await expect(tiles).toHaveCount(7);
  await expect(tiles.locator('[class*="_glassFace"]')).toHaveCount(7);
  await expect
    .poll(() =>
      tiles
        .first()
        .evaluate((element) => getComputedStyle(element).animationPlayState),
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
  expect(new Set(appearance.map((item) => item.tint)).size).toBe(7);
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
  const travel = await tiles.evaluateAll((elements) =>
    elements.map((element) => {
      const animation = element.getAnimations()[0];
      const duration = Number(animation.effect!.getTiming().duration);
      animation.pause();
      const points = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map(
        (fraction) => {
          animation.currentTime = duration * fraction;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        },
      );
      animation.play();
      const xs = points.map((point) => point.x),
        ys = points.map((point) => point.y);
      return {
        x: Math.max(...xs) - Math.min(...xs),
        y: Math.max(...ys) - Math.min(...ys),
      };
    }),
  );
  const sceneWidth = (await page.locator(sceneSelector).boundingBox())!.width;
  for (const path of travel) {
    expect(path.x).toBeGreaterThan(sceneWidth * 0.004);
    expect(path.y).toBeGreaterThan(sceneWidth * 0.01);
  }
  await page.locator("#categories").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      tiles
        .first()
        .evaluate((element) => getComputedStyle(element).animationPlayState),
    )
    .toBe("paused");
});
