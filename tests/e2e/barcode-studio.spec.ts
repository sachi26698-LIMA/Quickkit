import { test, expect } from "@playwright/test";

/**
 * Barcode Studio in a real browser.
 *
 * These assertions need layout (offscreen overflow, tap-target size, a genuine
 * PNG download), so they only run under Playwright: `npm run test:e2e`.
 */
test("renders a scannable preview and validates the data live", async ({
  page,
}) => {
  await page.goto("/tools/barcode-generator");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Barcode/i,
  );
  await expect(page.getByRole("tab", { name: /Generator/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const preview = page.getByRole("img", { name: /barcode encoding/i });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("src", /^data:image\/svg\+xml/);
  const natural = await preview.evaluate((node) => {
    const image = node as HTMLImageElement;
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(natural.width).toBeGreaterThan(200);
  expect(natural.height).toBeGreaterThan(60);

  // A wrong check digit must not be quietly corrected.
  await page.getByRole("radio", { name: /EAN-13/ }).click();
  const data = page.getByLabel("Barcode data");
  await data.fill("5901234123457");
  await expect(page.getByText(/modules/)).toBeVisible();
  await data.fill("5901234123458");
  await expect(page.getByRole("alert")).toContainText("should be 7");
  await expect(
    page.locator("#bc-panel-generate").getByRole("button", { name: /^PNG$/ }),
  ).toBeDisabled();

  await data.fill("590123412345");
  await expect(page.getByText(/Check digit 7 was calculated/)).toBeVisible();
});

test("downloads a real PNG built from the same bars as the preview", async ({
  page,
}) => {
  await page.goto("/tools/barcode-generator");
  await page.getByLabel("Barcode data").fill("QUICKKIT-2026");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .locator("#bc-panel-generate")
      .getByRole("button", { name: /^PNG$/ })
      .click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^quickkit-barcode-code128-quickkit-2026\.png$/,
  );
});

test("switches to the scanner without opening the camera", async ({ page }) => {
  await page.goto("/tools/barcode-generator");
  await page.getByRole("tab", { name: /Scanner/ }).click();
  await expect(
    page.getByRole("button", { name: /Start camera/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/camera stays off until you press Start/i),
  ).toBeVisible();
  // No permission prompt may appear before the button is pressed.
  const streams = await page.evaluate(
    () => document.querySelectorAll("video").length,
  );
  expect(streams).toBe(1);
});

test("loads a bulk CSV and reports every row", async ({ page }) => {
  await page.goto("/tools/barcode-generator");
  await page.getByRole("tab", { name: /Bulk/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "labels.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data,label\n590123412345,Shelf\n590123412345,Repeat\n59012341234,Short\n",
    ),
  });
  await expect(page.getByText(/rows ready|ready/i).first()).toBeVisible();
  const rows = page.locator(".bc-table tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toHaveClass(/duplicate/);
  await expect(rows.nth(2)).toHaveClass(/invalid/);
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("never overflows horizontally and keeps tap targets usable", async ({
    page,
  }) => {
    await page.goto("/tools/barcode-generator");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const png = page
      .locator("#bc-panel-generate")
      .getByRole("button", { name: /^PNG$/ });
    const box = await png.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(38);
    expect(box!.width).toBeGreaterThanOrEqual(120);
  });
});
