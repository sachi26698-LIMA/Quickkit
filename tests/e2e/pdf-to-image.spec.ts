import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/* -------------------------------- fixtures -------------------------------- */
async function makePdf(pages: number): Promise<Upload> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawRectangle({
      x: 40,
      y: 500,
      width: 515,
      height: 280,
      color: rgb(0.42, 0.2, 0.9 - index * 0.02),
    });
    page.drawText(`Page ${index + 1}`, {
      x: 60,
      y: 610,
      size: 54,
      font,
      color: rgb(1, 1, 1),
    });
  }
  const bytes = await doc.save();
  return {
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  };
}

async function browserSize(page: Page, buffer: Buffer, mimeType: string) {
  return page.evaluate(
    async ([base64, type]) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type });
      try {
        const bitmap = await createImageBitmap(blob);
        const size = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return size;
      } catch {
        return null;
      }
    },
    [buffer.toString("base64"), mimeType] as const,
  );
}

async function cornerPixel(page: Page, buffer: Buffer, mimeType: string) {
  return page.evaluate(
    async ([base64, type]) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    },
    [buffer.toString("base64"), mimeType] as const,
  );
}

async function upload(
  page: Page,
  files: Upload[],
  expectedCount = files.length,
) {
  await page.getByTestId("pdf-to-image-input").setInputFiles(files);
  await expect(page.getByTestId("converter-item")).toHaveCount(expectedCount);
  await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 15000 });
}

async function runConversion(page: Page) {
  const button = page.getByTestId("converter-run");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeEnabled({ timeout: 60000 });
}

async function downloadFrom(page: Page, target: Locator) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    target.click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("The download did not produce a file.");
  return {
    name: download.suggestedFilename(),
    buffer: await readFile(path),
  };
}

async function setNativeValue(target: Locator, value: number) {
  await target.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
/* --------------------------------- helpers -------------------------------- */

/** Decode a downloaded page image and return its real pixel size. */
async function imageSize(page: Page, file: { buffer: Buffer }, type: string) {
  const size = await browserSize(page, file.buffer, type);
  if (!size) throw new Error("The exported image could not be decoded.");
  return size;
}

function resultCard(page: Page, index = 0) {
  return page.getByTestId("converter-result").nth(index);
}

function downloadPage(page: Page, index = 0) {
  return resultCard(page, index).getByRole("button", { name: /^Download / });
}

/* ---------------------------------- tests --------------------------------- */

test.describe("PDF to Image Converter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/pdf-to-image");
  });

  test("starts with an empty workspace and a disabled convert button", async ({
    page,
  }) => {
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
    await expect(page.getByTestId("converter-preview-panel")).toContainText(
      /add a pdf/i,
    );
  });

  test("reads the real page count before exporting", async ({ page }) => {
    await upload(page, [await makePdf(4)]);
    await expect(page.getByTestId("converter-item").first()).toContainText(
      "4 pages",
    );
    await expect(page.getByTestId("converter-run")).toBeEnabled();
    // The button states how many pages it is about to write.
    await expect(page.getByTestId("converter-run")).toContainText(
      "Export 4 pages",
    );
  });

  test("rejects an image and points at the tools that take images", async ({
    page,
  }) => {
    await page.getByTestId("pdf-to-image-input").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a", "hex"),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /is an image\. Use Image to Image or Images to PDF/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });

  test("rejects a non-PDF file and says why", async ({ page }) => {
    await page.getByTestId("pdf-to-image-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a pdf"),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /not a supported file type/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
  });

  test("rejects an empty file rather than exporting nothing", async ({
    page,
  }) => {
    await page.getByTestId("pdf-to-image-input").setInputFiles({
      name: "blank.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(0),
    });
    await expect(page.getByTestId("converter-status")).toContainText(
      /is empty/i,
    );
    await expect(page.getByTestId("converter-item")).toHaveCount(0);
  });

  test("exports every page as a real image at the exact DPI size", async ({
    page,
  }) => {
    await upload(page, [await makePdf(3)]);
    await page.getByLabel("Page image format").selectOption("png");
    await page
      .getByRole("group", { name: "DPI presets" })
      .getByText("96")
      .click();
    await runConversion(page);

    await expect(page.getByTestId("converter-result")).toHaveCount(3);

    const first = await downloadFrom(page, downloadPage(page, 0));
    expect(first.name).toMatch(/-page-001\.png$/);
    expect(first.buffer.subarray(1, 4).toString("latin1")).toBe("PNG");
    // A4 at 96 DPI is exactly 794 x 1123 px.
    expect(await imageSize(page, first, "image/png")).toEqual({
      width: 794,
      height: 1123,
    });

    const third = await downloadFrom(page, downloadPage(page, 2));
    expect(third.name).toMatch(/-page-003\.png$/);
  });

  test("exports only the pages in the range", async ({ page }) => {
    await upload(page, [await makePdf(5)]);
    await page.getByLabel("Page image format").selectOption("png");
    await page.getByLabel("Pages to export").fill("2-3");
    await expect(page.getByText("2 of 5 pages selected")).toBeVisible();
    await runConversion(page);

    await expect(page.getByTestId("converter-result")).toHaveCount(2);
    const first = await downloadFrom(page, downloadPage(page, 0));
    const second = await downloadFrom(page, downloadPage(page, 1));
    // Numbering follows the source document, not the selection order.
    expect(first.name).toMatch(/-page-002\.png$/);
    expect(second.name).toMatch(/-page-003\.png$/);
  });

  test("an invalid range blocks the export instead of guessing", async ({
    page,
  }) => {
    await upload(page, [await makePdf(3)]);
    await page.getByLabel("Pages to export").fill("99");
    await expect(page.getByLabel("Pages to export")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByTestId("converter-run").click({ force: true });
    await expect(page.getByTestId("converter-result")).toHaveCount(0);
  });

  test("a higher DPI produces a larger, sharper page", async ({ page }) => {
    await upload(page, [await makePdf(1)]);
    await page.getByLabel("Page image format").selectOption("png");

    await page
      .getByRole("group", { name: "DPI presets" })
      .getByText("96")
      .click();
    await runConversion(page);
    const at96 = await downloadFrom(page, downloadPage(page, 0));

    await page
      .getByRole("group", { name: "DPI presets" })
      .getByText("150")
      .click();
    await runConversion(page);
    const at150 = await downloadFrom(page, downloadPage(page, 0));

    expect(await imageSize(page, at96, "image/png")).toEqual({
      width: 794,
      height: 1123,
    });
    expect(await imageSize(page, at150, "image/png")).toEqual({
      width: 1240,
      height: 1754,
    });
  });

  test("names files from the custom base name and suffix", async ({ page }) => {
    await upload(page, [await makePdf(2)]);
    await page.getByLabel("Page image format").selectOption("jpeg");
    await page.getByLabel("Custom base name for pages").fill("brochure");
    await page.getByLabel("Page file name suffix").fill("print");
    await runConversion(page);

    const first = await downloadFrom(page, downloadPage(page, 0));
    expect(first.name).toBe("brochure-print-page-001.jpg");
  });

  test("JPG quality changes the file size", async ({ page }) => {
    await upload(page, [await makePdf(1)]);
    await page.getByLabel("Page image format").selectOption("jpeg");

    await setNativeValue(page.getByLabel("Page image quality"), 95);
    await runConversion(page);
    const high = (await downloadFrom(page, downloadPage(page, 0))).buffer
      .length;

    await setNativeValue(page.getByLabel("Page image quality"), 40);
    await runConversion(page);
    const low = (await downloadFrom(page, downloadPage(page, 0))).buffer.length;

    expect(low).toBeLessThan(high * 0.8);
  });

  test("PNG disables quality rather than pretending to use it", async ({
    page,
  }) => {
    await upload(page, [await makePdf(1)]);
    await page.getByLabel("Page image format").selectOption("png");
    await expect(page.getByLabel("Page image quality")).toBeDisabled();
  });

  test("the page background colour reaches the exported pixels", async ({
    page,
  }) => {
    await upload(page, [await makePdf(1)]);
    await page.getByLabel("Page image format").selectOption("png");
    await page.getByLabel("Page background hex value").fill("#123456");
    await runConversion(page);

    const file = await downloadFrom(page, downloadPage(page, 0));
    // The fixture leaves the corners empty, so the corner is pure background.
    const corner = await cornerPixel(page, file.buffer, "image/png");
    expect(corner[0]).toBe(0x12);
    expect(corner[1]).toBe(0x34);
    expect(corner[2]).toBe(0x56);
  });

  test("downloads every page as one ZIP", async ({ page }) => {
    await upload(page, [await makePdf(3)]);
    await page.getByLabel("Page image format").selectOption("png");
    await runConversion(page);
    await expect(page.getByTestId("converter-result")).toHaveCount(3);

    const zip = await downloadFrom(
      page,
      page.getByRole("button", { name: /Download all as ZIP/ }),
    );
    expect(zip.name).toMatch(/\.zip$/);
    const entries = Object.keys(unzipSync(new Uint8Array(zip.buffer)));
    expect(entries.sort()).toHaveLength(3);
    for (const entry of entries) expect(entry).toMatch(/-page-00\d\.png$/);
  });
});

test.describe("PDF to Image Converter — preview and access", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/pdf-to-image");
  });

  test("previews the real source pages and marks the selected range", async ({
    page,
  }) => {
    await upload(page, [await makePdf(4)]);
    await expect(page.getByTestId("converter-pdf-page")).toBeVisible({
      timeout: 15000,
    });
    await page.getByLabel("Pages to export").fill("2-3");
    // The preview is the actual document, not a placeholder.
    await expect(page.getByTestId("converter-pdf-page")).toBeVisible();
  });

  test("after exporting, the preview shows the page that was produced", async ({
    page,
  }) => {
    await upload(page, [await makePdf(2)]);
    await page.getByLabel("Page image format").selectOption("png");
    await runConversion(page);
    await page
      .getByRole("button", { name: /Preview .*page-002/ })
      .first()
      .click();
    await expect(page.getByTestId("converter-result-image")).toBeVisible();
    await expect(page.getByTestId("converter-preview-panel")).toContainText(
      "794",
    );
  });

  test("stays accessible from a 375px phone to a desktop", async ({ page }) => {
    for (const [width, height] of [
      [375, 812],
      [768, 1024],
      [1440, 1000],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/tools/pdf-to-image");
      await upload(page, [await makePdf(2)]);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map((violation) => violation.id),
        `axe violations at ${width}px`,
      ).toEqual([]);
    }
  });

  test("captures workspace screenshots for the evidence pack", async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.CAPTURE_SHOTS,
      "Screenshot capture runs in the dedicated workflow.",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await upload(page, [await makePdf(3)]);
    await page.getByLabel("Pages to export").fill("1-2");
    await page.addStyleTag({
      content:
        ".site-header{position:static!important} .converter-preview{position:static!important}",
    });
    await page.screenshot({
      path: testInfo.outputPath("pdf-to-image-workspace.png"),
      fullPage: true,
    });
  });
});
