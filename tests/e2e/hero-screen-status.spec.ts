import { expect, test } from "@playwright/test";

test("device-local date, weekday and clock update together across midnight", async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 1200 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-11-13T18:29:58Z") });
  await page.clock.pauseAt(new Date("2026-11-13T18:29:59Z"));
  await page.goto("/");
  const bar = page.locator("[data-laptop-status]");
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-device-date]")).toHaveText("13 Nov 2026");
  await expect(bar.locator("[data-device-weekday]")).toHaveText("Friday");
  await expect(bar.locator("[data-device-time]")).toHaveText("23:59:59");
  await expect(bar.locator("[data-device-time]").locator("..")).toHaveAttribute(
    "title",
    /Device time · Asia\/(Kolkata|Calcutta)/,
  );
  await page.clock.runFor(3000);
  await expect(bar.locator("[data-device-date]")).toHaveText("14 Nov 2026");
  await expect(bar.locator("[data-device-weekday]")).toHaveText("Saturday");
  await expect(bar.locator("[data-device-time]")).toHaveText("00:00:02");
  expect(errors).toEqual([]);
  await context.close();
});

test("reads browser battery percentage and responds to charge/level events", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const battery = Object.assign(new EventTarget(), {
      level: 0.73,
      charging: false,
    });
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: () => Promise.resolve(battery),
    });
    (
      window as Window & {
        changeBattery?: (level: number, charging: boolean) => void;
      }
    ).changeBattery = (level, charging) => {
      battery.level = level;
      battery.charging = charging;
      battery.dispatchEvent(new Event("levelchange"));
      battery.dispatchEvent(new Event("chargingchange"));
    };
  });
  await page.goto("/");
  const battery = page.locator("[data-device-battery]");
  await expect(battery).toHaveText("73%");
  await expect(battery).toHaveAttribute(
    "aria-label",
    "73% battery, not charging",
  );
  await page.evaluate(() =>
    (
      window as Window & {
        changeBattery?: (level: number, charging: boolean) => void;
      }
    ).changeBattery?.(0.18, true),
  );
  await expect(battery).toHaveText("18%");
  await expect(battery).toHaveAttribute("data-device-battery", "charging");
  await expect(battery).toHaveAttribute("data-low", "true");
});

for (const mode of ["unsupported", "blocked", "invalid"] as const) {
  test(`${mode} battery API shows a dash instead of an invented percentage`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "getBattery", {
        configurable: true,
        value:
          mode === "unsupported"
            ? undefined
            : mode === "blocked"
              ? () => Promise.reject(new Error("Blocked"))
              : () =>
                  Promise.resolve(
                    Object.assign(new EventTarget(), {
                      level: 4,
                      charging: false,
                    }),
                  ),
      });
    }, mode);
    await page.goto("/");
    const battery = page.locator("[data-device-battery]");
    await expect(battery).toHaveText("—");
    await expect(battery).toHaveAttribute("data-device-battery", "unavailable");
    await expect(battery).toHaveAttribute(
      "aria-label",
      "Battery status unavailable in this browser",
    );
    await expect(battery).not.toContainText("%");
  });
}

for (const width of [320, 390, 1440]) {
  test(`glass status bar stays inside the laptop screen and below feedback at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-device-time]")).toContainText(
      /\d{2}:\d{2}:\d{2}/,
    );
    const layout = await page.evaluate(() => {
      const bar = document.querySelector("[data-laptop-status]")!;
      const feedback = document.querySelector<HTMLElement>(
        '[aria-label="User Feedback"]',
      )!;
      const rect = bar.getBoundingClientRect();
      const plane = bar.parentElement!.getBoundingClientRect();
      return {
        contained:
          rect.left >= plane.left &&
          rect.right <= plane.right &&
          rect.bottom <= plane.bottom,
        // Both offsets are in screenPlane coordinates; perspective makes
        // viewport bounding rectangles overlap for separate rows.
        belowFeedback:
          (bar as HTMLElement).offsetTop >=
          feedback.offsetTop + feedback.offsetHeight,
        noOverflow: document.documentElement.scrollWidth <= innerWidth,
        glass: getComputedStyle(bar).backdropFilter,
      };
    });
    expect(layout).toEqual({
      contained: true,
      belowFeedback: true,
      noOverflow: true,
      glass: "blur(7px)",
    });
  });
}
