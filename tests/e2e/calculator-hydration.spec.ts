import { expect, test, type Page } from "@playwright/test";

test.use({ timezoneId: "America/New_York" });

async function delayScriptsUntilRequested(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let scriptRequests = 0;
  await page.route(
    /\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/,
    async (route) => {
      scriptRequests += 1;
      await gate;
      await route.continue();
    },
  );
  return { release, scriptRequests: () => scriptRequests };
}

test("date inputs are protected until hydration and work afterward", async ({
  page,
}) => {
  const scripts = await delayScriptsUntilRequested(page);
  try {
    await page.goto("/tools/date-difference-calculator", {
      waitUntil: "domcontentloaded",
    });
    expect(scripts.scriptRequests()).toBeGreaterThan(0);
    const start = page.getByLabel("Start date", { exact: true });
    const end = page.getByLabel("End date", { exact: true });
    await expect(start).toBeDisabled();
    await expect(end).toBeDisabled();
    await expect(page.getByLabel("Include end date")).toBeDisabled();
    scripts.release();
    await expect(start).toBeEnabled();
    await expect(end).toBeEnabled();
    await start.fill("2024-02-28");
    await end.fill("2024-03-01");
    await expect(page.locator("output")).toContainText("2 days");
    await expect(start).toHaveValue("2024-02-28");
    await expect(end).toHaveValue("2024-03-01");
  } finally {
    scripts.release();
  }
});

test("working-time controls are protected until hydration and retain input", async ({
  page,
}) => {
  const scripts = await delayScriptsUntilRequested(page);
  try {
    await page.goto("/tools/time-converter", { waitUntil: "domcontentloaded" });
    expect(scripts.scriptRequests()).toBeGreaterThan(0);
    const box = page.getByRole("region", { name: "Timestamp & working hours" });
    const start = box.getByLabel("Start timestamp (local)");
    const end = box.getByLabel("End timestamp (local)");
    await expect(start).toBeDisabled();
    await expect(end).toBeDisabled();
    await expect(box.getByLabel("Tuesday")).toBeDisabled();
    scripts.release();
    await expect(start).toBeEnabled();
    await start.fill("2024-03-04T10:00");
    await end.fill("2024-03-06T12:00");
    await expect(box.getByText(/Working time: 0 days, 18 hours/)).toBeVisible();
    await expect(start).toHaveValue("2024-03-04T10:00");
    await expect(end).toHaveValue("2024-03-06T12:00");
  } finally {
    scripts.release();
  }
});

test("calendar arithmetic controls are protected until hydration", async ({
  page,
}) => {
  const scripts = await delayScriptsUntilRequested(page);
  try {
    await page.goto("/tools/time-converter", { waitUntil: "domcontentloaded" });
    expect(scripts.scriptRequests()).toBeGreaterThan(0);
    const box = page.getByRole("region", { name: "Add calendar durations" });
    const start = box.getByLabel("Starting local date and time");
    const duration = box.getByLabel("Calendar duration (negative to subtract)");
    await expect(start).toBeDisabled();
    await expect(duration).toBeDisabled();
    await expect(box.getByLabel("Calendar unit")).toBeDisabled();
    scripts.release();
    await expect(start).toBeEnabled();
    await start.fill("2024-01-31T10:30");
    await duration.fill("1");
    await expect(box.getByText("2024-02-29 10:30")).toBeVisible();
    await expect(start).toHaveValue("2024-01-31T10:30");
  } finally {
    scripts.release();
  }
});

test("age calculator controls are protected until hydration", async ({
  page,
}) => {
  const scripts = await delayScriptsUntilRequested(page);
  try {
    await page.goto("/tools/age-calculator", {
      waitUntil: "domcontentloaded",
    });
    expect(scripts.scriptRequests()).toBeGreaterThan(0);
    const birth = page.getByLabel("Date of birth", { exact: true });
    const asOf = page.getByLabel("Age on date", { exact: true });
    await expect(birth).toBeDisabled();
    await expect(asOf).toBeDisabled();
    await expect(page.getByLabel(/Show zodiac date range/)).toBeDisabled();
    scripts.release();
    await expect(birth).toBeEnabled();
    await birth.fill("2000-01-01");
    await asOf.fill("2024-01-01");
    await expect(page.locator("output")).toContainText("24 years");
    await expect(birth).toHaveValue("2000-01-01");
  } finally {
    scripts.release();
  }
});
