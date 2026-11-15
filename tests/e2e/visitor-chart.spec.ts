import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`10-second pointer hold reveals real API values for exactly 10 seconds at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.route("**/api/visitor-stats", (route) =>
      route.fulfill({
        json: {
          available: true,
          online: 27,
          visitors: 1362,
          averageSeconds: 156,
          since: "2026-11-13",
        },
      }),
    );
    await page.goto("/");
    const graph = page.locator("[data-visitor-chart]");
    await expect(graph).toContainText("Hold 10s");
    await expect(graph.locator("[data-metric-label]")).toHaveText(["", "", ""]);
    await page
      .locator("[data-laptop-body]")
      .evaluate((el) => el.getAnimations().forEach((a) => a.pause()));
    await graph.scrollIntoViewIfNeeded();
    await page.clock.install({ time: new Date() });
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const bounds = await graph.boundingBox();
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      bounds!.y + bounds!.height / 2,
    );
    await page.mouse.down();
    await expect(graph).toHaveAttribute("data-holding", "true");
    await page.clock.fastForward(9999);
    await expect(graph).toHaveAttribute("data-revealed", "false");
    await page.clock.fastForward(1);
    await expect(graph).toHaveAttribute("data-revealed", "true");
    await expect(graph.locator("[data-metric-label]")).toHaveText([
      "Online",
      "Visitors",
      "Avg. stay",
    ]);
    await expect(graph.locator('[data-metric-value="0"]')).toHaveText("27");
    await expect(graph.locator('[data-metric-value="1"]')).toHaveText("1,362");
    await expect(graph.locator('[data-metric-value="2"]')).toHaveText("2m 36s");
    await page.mouse.up();
    await page.clock.fastForward(9999);
    await expect(graph).toHaveAttribute("data-revealed", "true");
    await page.clock.fastForward(1);
    await expect(graph).toHaveAttribute("data-revealed", "false");
    await expect(graph.locator('[data-metric-value="0"]')).toHaveText("");
    await expect(graph.locator("[data-metric-label]")).toHaveText(["", "", ""]);
  });
}

test("early release, movement, cancellation, blur and keyboard hold", async ({
  page,
}) => {
  await page.route("**/api/visitor-stats", (route) =>
    route.fulfill({
      json: {
        available: true,
        online: 0,
        visitors: 0,
        averageSeconds: 0,
        since: "2026-11-13",
      },
    }),
  );
  await page.goto("/");
  const graph = page.locator("[data-visitor-chart]");
  await expect(graph).toContainText("Hold 10s");
  await page.clock.install({ time: new Date() });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await graph.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(9000);
  await page.keyboard.up("Space");
  await page.clock.fastForward(2000);
  await expect(graph).toHaveAttribute("data-revealed", "false");
  await page
    .locator("[data-laptop-body]")
    .evaluate((el) => el.getAnimations().forEach((a) => a.pause()));
  await graph.scrollIntoViewIfNeeded();
  const bounds = await graph.boundingBox();
  const x = bounds!.x + bounds!.width / 2,
    y = bounds!.y + bounds!.height / 2;
  for (const event of ["pointercancel", "lostpointercapture", "focusout"]) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(graph).toHaveAttribute("data-holding", "true");
    await graph.dispatchEvent(event);
    await page.mouse.up();
    await page.clock.fastForward(10000);
    await expect(graph).toHaveAttribute("data-revealed", "false");
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(graph).toHaveAttribute("data-holding", "true");
  await page.mouse.move(x + 20, y);
  await page.clock.fastForward(10000);
  await expect(graph).toHaveAttribute("data-revealed", "false");
  await page.mouse.up();
  await graph.focus();
  await page.keyboard.down("Enter");
  await page.clock.fastForward(10000);
  await page.keyboard.up("Enter");
  await expect(graph).toHaveAttribute("data-revealed", "true");
  await expect(graph.locator('[data-metric-value="0"]')).toHaveText("0");
});

test("API failure shows unavailable, not fabricated or stale values", async ({
  page,
}) => {
  await page.route("**/api/visitor-stats", (route) =>
    route.fulfill({ status: 503, json: { available: false } }),
  );
  await page.goto("/");
  const graph = page.locator("[data-visitor-chart]");
  await expect(graph).toContainText("Live stats unavailable");
  await page.clock.install({ time: new Date() });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await graph.focus();
  await page.keyboard.down("Space");
  await page.clock.fastForward(11000);
  await page.keyboard.up("Space");
  await expect(graph).toHaveAttribute("data-revealed", "false");
});

test("tracking is opt-in, sends no page/file data, and stops on opt-out", async ({
  page,
}) => {
  const posts: Record<string, unknown>[] = [];
  await page.route("**/api/visitor-stats", async (route) => {
    if (route.request().method() === "POST") {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ status: 204 });
    } else
      await route.fulfill({
        json: {
          available: true,
          online: 0,
          visitors: 0,
          averageSeconds: 0,
          since: "2026-11-13",
        },
      });
  });
  // The consent switch lives on the Cookie Policy page, not in the footer.
  await page.goto("/cookies");
  await page.clock.install({ time: new Date() });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.fastForward(40000);
  expect(posts).toHaveLength(0);
  await page
    .getByRole("button", { name: "Allow anonymous visitor statistics" })
    .click();
  await expect.poll(() => posts.length).toBe(1);
  expect(Object.keys(posts[0]).sort()).toEqual([
    "activeMs",
    "sessionId",
    "visitorId",
  ]);
  await page.clock.fastForward(20000);
  await expect.poll(() => posts.length).toBe(2);
  await page
    .getByRole("button", { name: "Turn off anonymous visitor statistics" })
    .click();
  await page.clock.fastForward(40000);
  expect(posts).toHaveLength(2);
  expect(
    await page.evaluate(() => localStorage.getItem("quickkit-visitor-id")),
  ).toBeNull();
});

test("Do Not Track blocks participation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1" });
    localStorage.setItem("quickkit-analytics-consent", "yes");
  });
  let posts = 0;
  await page.route("**/api/visitor-stats", async (route) => {
    if (route.request().method() === "POST") posts++;
    await route.fulfill({ status: 503, json: { available: false } });
  });
  await page.goto("/");
  await expect(page.locator("#tool-search")).toBeEnabled();
  await page.clock.install({ time: new Date() });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.clock.fastForward(40000);
  expect(posts).toBe(0);
});

test("real database shares consenting browser counts across contexts and deduplicates reloads", async ({
  browser,
  request,
}) => {
  const before = await (await request.get("/api/visitor-stats")).json();
  test.skip(
    !before.available,
    "Persistent analytics database not configured for this run",
  );
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("quickkit-analytics-consent", "yes"),
  );
  const page = await context.newPage();
  const heartbeat = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/visitor-stats") && r.request().method() === "POST",
  );
  await page.goto("/");
  expect((await heartbeat).status()).toBe(204);
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/visitor-stats")).json()).visitors,
    )
    .toBe(before.visitors + 1);
  const again = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/visitor-stats") && r.request().method() === "POST",
  );
  await page.reload();
  expect((await again).status()).toBe(204);
  const observer = await browser.newContext();
  const otherPage = await observer.newPage();
  await otherPage.goto("/");
  const values = await otherPage.evaluate(async () =>
    (await fetch("/api/visitor-stats")).json(),
  );
  expect(values.visitors).toBe(before.visitors + 1);
  expect(values.online).toBeGreaterThanOrEqual(1);
  await context.close();
  await observer.close();
});

test("analytics API rejects cross-origin, malformed and oversized writes", async ({
  request,
  baseURL,
}) => {
  expect(
    (
      await request.post("/api/visitor-stats", {
        headers: { Origin: "https://unrelated.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/visitor-stats", {
        headers: { Origin: "not a URL" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/visitor-stats", {
        headers: { Origin: baseURL! },
        data: { visitorId: "invalid" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/visitor-stats", {
        headers: { Origin: baseURL! },
        data: "a".repeat(513),
      })
    ).status(),
  ).toBe(413);
});

test("mobile touchscreen long-press reveals values without opening a context menu", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/visitor-stats", (route) =>
    route.fulfill({
      json: {
        available: true,
        online: 3,
        visitors: 19,
        averageSeconds: 42,
        since: "2026-11-13",
      },
    }),
  );
  await page.goto("/");
  const graph = page.locator("[data-visitor-chart]");
  await expect(graph).toContainText("Hold 10s");
  await page.clock.install({ time: new Date() });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const box = await graph.boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }],
  });
  await expect(graph).toHaveAttribute("data-holding", "true");
  await page.clock.fastForward(10000);
  await expect(graph).toHaveAttribute("data-revealed", "true");
  await expect(graph.locator('[data-metric-value="0"]')).toHaveText("3");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.clock.fastForward(10000);
  await expect(graph).toHaveAttribute("data-revealed", "false");
  expect(errors).toEqual([]);
  await context.close();
});
