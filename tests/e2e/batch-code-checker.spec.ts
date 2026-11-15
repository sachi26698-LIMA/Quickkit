import { test, expect, type Page } from "@playwright/test";

/**
 * Batch Code Checker in a real browser.
 *
 * These assertions need layout (real overflow, real tap-target boxes) and a
 * hydrated form, so they only run under Playwright. They drive the same engine
 * the unit tests cover; nothing here invents a decoder.
 */
async function pickBrand(page: Page, name: string) {
  const combo = page.getByRole("combobox", { name: "Brand" }).first();
  await combo.fill(name);
  await page.getByRole("option", { name: new RegExp(`^${name}`) }).click();
}

async function submit(page: Page) {
  await page.getByRole("button", { name: /CHECK BATCH CODE/i }).click();
}

test("refuses an opaque lot number and explains why instead of guessing", async ({
  page,
}) => {
  await page.goto("/tools/batch-code-checker");
  await pickBrand(page, "Nivea");
  await page.getByLabel(/Batch \/ lot code/i).fill("28H300");
  await submit(page);

  const result = page.getByRole("status");
  await expect(result).toContainText("NOT DECODABLE");
  await expect(result).toContainText(/No reliable decoder/i);
  await expect(
    page.getByText(/Why this code cannot be decoded/i),
  ).toBeVisible();
  await expect(page.getByText(/No governing date/i)).toBeVisible();
});

test("decodes a GS1 element string and lists every date field", async ({
  page,
}) => {
  await page.goto("/tools/batch-code-checker");
  await pickBrand(page, "CeraVe");
  await page
    .getByLabel(/Batch \/ lot code/i)
    .fill("(01)09501101530003(11)260101(15)260630(17)270101(10)LOT-7");
  await submit(page);

  const result = page.getByRole("status");
  await expect(result).toContainText("VERIFIED");
  await expect(result).toContainText(/GS1 element string/i);
  await expect(
    page.getByRole("heading", { name: /Date fields carried by the code/i }),
  ).toBeVisible();
  await expect(page.getByText("AI 11", { exact: true })).toBeVisible();
  await expect(page.getByText("AI 15", { exact: true })).toBeVisible();
  await expect(page.getByText("AI 17", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 Jan 2027/).first()).toBeVisible();
  await expect(page.getByText(/printed date/i).first()).toBeVisible();
});

test("decodes a GS1 Digital Link URI and says the link is not opened", async ({
  page,
}) => {
  await page.goto("/tools/batch-code-checker");
  await pickBrand(page, "Nivea");
  await page
    .getByLabel(/Batch \/ lot code/i)
    .fill("https://id.gs1.org/01/09501101530003/17/251231/10/AB-12");
  await submit(page);

  const result = page.getByRole("status");
  await expect(result).toContainText("VERIFIED");
  await expect(result).toContainText(/GS1 Digital Link/i);
  await expect(page.getByText(/the link itself was not opened/i)).toBeVisible();
});

test("preselects the brand named in a shared link", async ({ page }) => {
  await page.goto("/tools/batch-code-checker?brand=cerave");
  await expect(
    page.getByRole("combobox", { name: "Brand" }).first(),
  ).toHaveValue(/CeraVe/i);
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("never overflows horizontally and keeps the primary controls tappable", async ({
    page,
  }) => {
    await page.goto("/tools/batch-code-checker");
    await pickBrand(page, "Nivea");
    await page.getByLabel(/Batch \/ lot code/i).fill("28H300");
    await submit(page);
    await expect(page.getByRole("status")).toContainText("NOT DECODABLE");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const submitButton = page.getByRole("button", {
      name: /CHECK BATCH CODE/i,
    });
    const box = await submitButton.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(38);
    expect(box!.width).toBeGreaterThanOrEqual(120);

    const resultBox = await page.getByRole("status").boundingBox();
    expect(resultBox!.width).toBeLessThanOrEqual(360);
  });
});
