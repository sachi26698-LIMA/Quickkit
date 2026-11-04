import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Image to Text (OCR) — end-to-end.
 *
 * These tests drive the real workspace: real files are uploaded, the real
 * tesseract.js engine runs in the page (trained data comes from /ocr, which
 * `npm run prepare:ocr` copies), and the real exporters produce the download.
 * Nothing here is mocked, so a pass means OCR genuinely works in a browser.
 *
 * NOTE: this suite needs Chromium plus the ~63 MB of /ocr assets. Both are
 * available in CI (`npm run prebuild` copies the assets); the environment this
 * feature was authored in could not download a browser, so the suite is
 * written and lint-checked but has not been executed yet. See the QA report.
 */

const FIXTURES = path.join(__dirname, "..", "fixtures", "image-to-text");

/** Attach real fixture files to the tool's file input. */
async function upload(page: Page, names: string[]) {
  await page
    .getByLabel("Add images or scanned PDFs")
    .setInputFiles(names.map((name) => path.join(FIXTURES, name)));
}

async function startOcr(page: Page) {
  await page.getByRole("button", { name: "Start OCR" }).click();
}

const READ_TIMEOUT = 120_000;

test.describe("Image to Text (OCR)", () => {
  test("is listed in the catalogue, search and category pages", async ({
    page,
  }) => {
    await page.goto("/tools");
    await expect(
      page.getByRole("heading", { name: /Image to Text/i }).first(),
    ).toBeVisible();

    await page.goto("/tools?q=ocr");
    await expect(
      page.getByRole("link", { name: /Image to Text \(OCR\)/i }).first(),
    ).toBeVisible();

    await page.goto("/categories/text-writing");
    await expect(
      page.getByRole("link", { name: /Image to Text \(OCR\)/i }).first(),
    ).toBeVisible();
  });

  test("renders the tool shell, SEO copy and structured data", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-text");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Image to Text \(OCR\)/,
      }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Image to Text \(OCR\)/);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toMatch(/OCR/i);

    // FAQ copy is real content inside the shared tool shell.
    await expect(
      page.getByRole("heading", { name: /a few useful answers/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /how to use it/i }),
    ).toBeVisible();

    // JSON-LD declares the tool and its FAQ.
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const graph = jsonLd.join(" ");
    expect(graph).toContain("FAQPage");
    expect(graph).toContain("HowTo");

    // Privacy is stated on the page, not only in the marketing copy.
    await expect(page.getByText(/100% on-device/i).first()).toBeVisible();
  });

  test("reads printed English into an editable, copyable text box", async ({
    page,
  }) => {
    test.setTimeout(READ_TIMEOUT + 60_000);
    await page.goto("/tools/image-to-text");
    await upload(page, ["english-printed.png"]);

    await expect(page.getByText(/1 file in this batch/i)).toBeVisible();
    await startOcr(page);

    const editor = page.locator("#i2t-editor-text");
    await expect(editor).toBeVisible({ timeout: READ_TIMEOUT });
    await expect(editor).toHaveValue(/QUICKKIT/i, { timeout: READ_TIMEOUT });
    await expect(editor).toHaveValue(/4471/);
    await expect(editor).toHaveValue(/Ahmedabad/i);

    // The success note must state that nothing left the device.
    await expect(
      page.getByText(/Nothing was\s+uploaded or saved/i),
    ).toBeVisible();

    // Editing is genuinely editable.
    await editor.fill("Edited by the user");
    await expect(editor).toHaveValue("Edited by the user");
    // Undo restores what OCR produced.
    await editor.press("ControlOrMeta+z");
    await expect(editor).toHaveValue(/QUICKKIT/i);
  });

  test("preserves Hindi and Gujarati Unicode in the editor and TXT export", async ({
    page,
  }) => {
    test.setTimeout(READ_TIMEOUT * 2 + 60_000);
    await page.goto("/tools/image-to-text");

    // Select the two Indic languages through the language selector.
    await page.getByRole("button", { name: /Hindi|हिंदी/ }).click();
    await page.getByRole("button", { name: /Gujarati|ગુજરાતી/ }).click();

    await upload(page, ["hindi-printed.png", "gujarati-printed.png"]);
    await startOcr(page);

    const editor = page.locator("#i2t-editor-text");
    await expect(editor).toBeVisible({ timeout: READ_TIMEOUT });
    // First page: Devanagari must appear as Devanagari.
    await expect(editor).toHaveValue(/[\u0900-\u097F]{4,}/u, {
      timeout: READ_TIMEOUT,
    });

    // Switch to the second page and check Gujarati.
    await page.getByRole("tab", { name: /gujarati-printed/i }).click();
    await expect(editor).toHaveValue(/[\u0A80-\u0AFF]{4,}/u, {
      timeout: READ_TIMEOUT,
    });

    // TXT export round-trips the Unicode unchanged (UTF-8).
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /^TXT/ }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    const bytes = await readFile((await download.path())!);
    const text = bytes.toString("utf8");
    expect(text).toMatch(/[\u0900-\u097F]/u);
    expect(text).toMatch(/[\u0A80-\u0AFF]/u);
    expect(text).not.toContain("?");
  });

  test("extracts a table and exports it as CSV with real columns", async ({
    page,
  }) => {
    test.setTimeout(READ_TIMEOUT + 60_000);
    await page.goto("/tools/image-to-text");
    await expect(
      page.getByRole("heading", { name: /Extraction mode/i }),
    ).toBeVisible();
    await page.getByRole("radio", { name: /Table Extraction/i }).check();

    await upload(page, ["table-receipt.png"]);
    await startOcr(page);

    const editor = page.locator("#i2t-editor-text");
    await expect(editor).toBeVisible({ timeout: READ_TIMEOUT });
    await expect(editor).toHaveValue(/Notebook/, { timeout: READ_TIMEOUT });

    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /^CSV/ }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(/table-receipt.*\.csv$/);
    const csv = await readFile((await download.path())!, "utf8");
    const rows = csv.trim().split(/\r?\n/);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    // Columns are separated, not smashed into one cell.
    expect(rows.some((row) => row.includes(",") && /Notebook/.test(row))).toBe(
      true,
    );
    expect(csv).toMatch(/120/);
    expect(csv).toMatch(/240/);
  });

  test("handles a sideways photo via rotation controls", async ({ page }) => {
    test.setTimeout(READ_TIMEOUT + 60_000);
    await page.goto("/tools/image-to-text");
    await upload(page, ["rotated-90.png"]);

    // The fixture is turned clockwise, so three more 90° clicks bring it back
    // upright through the same control users get.
    const rotate = page.getByRole("button", {
      name: /Rotate rotated-90\.png 90 degrees/i,
    });
    await expect(rotate).toBeVisible();
    for (let turn = 0; turn < 3; turn += 1) await rotate.click();

    await startOcr(page);
    const editor = page.locator("#i2t-editor-text");
    await expect(editor).toHaveValue(/QUICKKIT/i, { timeout: READ_TIMEOUT });
  });

  test("reads a batch of images with per-file progress", async ({ page }) => {
    test.setTimeout(READ_TIMEOUT + 60_000);
    await page.goto("/tools/image-to-text");
    await upload(page, ["english-printed.png", "small-text.png"]);
    await expect(page.getByText(/2 files in this batch/i)).toBeVisible();

    await startOcr(page);
    await expect(
      page.getByRole("progressbar", { name: /Overall batch progress/i }),
    ).toBeVisible();
    await expect(page.getByText(/Read\s+2 pages on this device/i)).toBeVisible({
      timeout: READ_TIMEOUT,
    });

    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(2);
  });

  test("finds and replaces text in the editor", async ({ page }) => {
    test.setTimeout(READ_TIMEOUT + 60_000);
    await page.goto("/tools/image-to-text");
    await upload(page, ["english-printed.png"]);
    await startOcr(page);
    const editor = page.locator("#i2t-editor-text");
    await expect(editor).toHaveValue(/QUICKKIT/, { timeout: READ_TIMEOUT });

    await page.getByRole("button", { name: "Find and replace" }).click();
    await page.getByLabel("Find", { exact: true }).fill("QUICKKIT");
    await page.getByLabel("Replace with").fill("FASTKIT");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByRole("status").first()).toContainText(/Replaced/i);
    await expect(editor).toHaveValue(/FASTKIT/);
    await expect(editor).not.toHaveValue(/QUICKKIT/);
  });

  test("rejects unsupported files with an explicit message", async ({
    page,
  }) => {
    await page.goto("/tools/image-to-text");
    await page.getByLabel("Add images or scanned PDFs").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByRole("alert")).toContainText(
      /not an image or PDF this tool can read/i,
    );
  });

  test("never claims languages it cannot read", async ({ page }) => {
    await page.goto("/tools/image-to-text");
    const workspace = page.locator(".i2t-workspace");
    await expect(workspace).toBeVisible();
    // Exactly the eight shipped trained-data packs are advertised.
    for (const language of [
      "English",
      "Hindi",
      "Gujarati",
      "Marathi",
      "Bengali",
      "Tamil",
      "Telugu",
      "Urdu",
    ]) {
      await expect(
        workspace.getByText(new RegExp(`\\b${language}\\b`, "i")).first(),
      ).toBeVisible();
    }
    // ...and no language we do not ship.
    for (const unsupported of ["Japanese", "Korean", "Arabic", "Thai"]) {
      await expect(
        workspace.getByText(new RegExp(unsupported, "i")),
      ).toHaveCount(0);
    }
  });

  test("stays usable on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools/image-to-text");

    // Nothing may push the page sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // The upload control and the primary action stay reachable.
    await expect(page.getByLabel("Add images or scanned PDFs")).toBeVisible();
    await upload(page, ["small-text.png"]);
    const start = page.getByRole("button", { name: "Start OCR" });
    await expect(start).toBeInViewport();
    await expect(start).toBeEnabled();
  });
});
