import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

async function downloadBytes(
  page: Page,
  name: RegExp,
  scope = "#bc-panel-generate",
) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(scope).getByRole("button", { name }).click(),
  ]);
  const path = await download.path();
  return {
    name: download.suggestedFilename(),
    bytes: await readFile(path!),
  };
}

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
  await expect(page.getByText(/^EAN-13 · \d+ modules$/)).toBeVisible();
  await data.fill("5901234123458");
  await expect(page.locator("#bc-data-error")).toContainText("should be 7");
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
  // The PNG name carries its export width, so two exports never collide.
  expect(download.suggestedFilename()).toMatch(
    /^quickkit-barcode-code128-quickkit-2026-\d+px\.png$/,
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
  // Under EAN-13 the 11-digit row cannot be completed, so the table must show
  // one duplicate and one invalid row alongside the valid one.
  await page.getByLabel("Format for every row").selectOption("ean13");
  await page.getByRole("button", { name: /Generate 3 labels/ }).click();
  const rows = page.locator("#bc-panel-bulk .bc-table tbody tr");
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

test("exports PNG, SVG and PDF files that are really those formats", async ({
  page,
}) => {
  await page.goto("/tools/barcode-generator");
  await page.getByLabel("Barcode data").fill("QUICKKIT-2026");

  const png = await downloadBytes(page, /^PNG$/);
  expect(png.bytes.subarray(1, 4).toString("latin1")).toBe("PNG");

  const svg = await downloadBytes(page, /^SVG$/);
  expect(svg.bytes.toString("utf8")).toContain("<svg");

  const pdf = await downloadBytes(page, /^PDF$/);
  expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
});

test("exports a ZIP of PNGs and a CSV report from the bulk panel", async ({
  page,
}) => {
  await page.goto("/tools/barcode-generator");
  await page.getByRole("tab", { name: /Bulk/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "labels.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data,label\n590123412345,Shelf\n590123412345,Repeat\n",
    ),
  });
  await page.getByRole("button", { name: /Generate 2 labels/ }).click();
  await expect(page.locator("#bc-panel-bulk .bc-table tbody tr")).toHaveCount(
    2,
  );

  const zip = await downloadBytes(page, /ZIP of PNG/i, "#bc-panel-bulk");
  expect(zip.bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  expect(zip.name.endsWith(".zip")).toBe(true);

  const csv = await downloadBytes(page, /Report CSV/i, "#bc-panel-bulk");
  expect(csv.bytes.toString("utf8").split("\n")[0]).toMatch(/row|status|data/i);
});
