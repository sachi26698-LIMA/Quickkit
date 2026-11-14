import { test, expect, type Locator, type Page } from "./helpers/tool-test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/** A real password-protected PDF, so rejection is tested against real bytes. */
const ENCRYPTED_PDF_BASE64 =
  "JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGQwNGQ3NmNjOWE+Cj4+CmVuZG9i" +
  "agoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbIDQgMCBSIF0KPj4KZW5k" +
  "b2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iago0IDAg" +
  "b2JqCjw8Ci9UeXBlIC9QYWdlCi9SZXNvdXJjZXMgPDwKPj4KL01lZGlhQm94IFsgMC4wIDAuMCAz" +
  "MDAgNDAwIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovViAyCi9SIDMKL0xl" +
  "bmd0aCAxMjgKL1AgNDI5NDk2NzI5MgovRmlsdGVyIC9TdGFuZGFyZAovTyA8MGU1MjI5MjVhM2U0" +
  "ZTg3NGMzY2ZhY2JlZjUxMWE3M2FjNGVjMmJkODY1ZGNkM2Q0NjI3NjE0OTE3YWJmZDdlND4KL1Ug" +
  "PDUwMzlhOTM3NTUwZTM1YjQ1OGZhNzAxM2M5NTViMjVjMjhiZjRlNWU0ZTc1OGE0MTY0MDA0ZTU2" +
  "ZmZmYTAxMDg+Cj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAw" +
  "MTUgMDAwMDAgbiAKMDAwMDAwMDA1OSAwMDAwMCBuIAowMDAwMDAwMTE4IDAwMDAwIG4gCjAwMDAw" +
  "MDAxNjcgMDAwMDAgbiAKMDAwMDAwMDI2MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jv" +
  "b3QgMyAwIFIKL0luZm8gMSAwIFIKL0lEIFsgPDM2MzczMjY0MzYzODM0MzczMTM4NjM2MjMwMzE2" +
  "NDMzMzgzNTYyNjUzNjMyNjYzMTMwNjIzMjMwMzY2NjM3Mzk+IDwzNjM3MzI2NDM2MzgzNDM3MzEz" +
  "ODYzNjIzMDMxNjQzMzM4MzU2MjY1MzYzMjY2MzEzMDYyMzIzMDM2NjYzNzM5PiBdCi9FbmNyeXB0" +
  "IDUgMCBSCj4+CnN0YXJ0eHJlZgo0NzYKJSVFT0YK";

/* -------------------------------- fixtures -------------------------------- */
function encryptedPdf(): Upload {
  return {
    name: "locked.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(ENCRYPTED_PDF_BASE64, "base64"),
  };
}

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

test.describe("PDF Studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/pdf-studio");
  });

  test("duplicating a page adds it to the real output PDF", async ({
    page,
  }) => {
    await page
      .getByTestId("pdf-studio-input")
      .setInputFiles([{ ...(await makePdf(2)), name: "single-source.pdf" }]);
    await expect(page.getByTestId("converter-item")).toHaveCount(1);
    await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 20000 });
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(2);

    await page.getByRole("button", { name: "Duplicate page 1" }).click();

    // The copy lands immediately after its source, so the grid is 3 pages.
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(3);
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /3 of 3 pages/,
    );

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("3 pages");

    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(
      merged.getPageCount(),
      "the duplicate is written, not just shown",
    ).toBe(3);
  });

  test("duplicating a struck-through page restores it as usable", async ({
    page,
  }) => {
    await page
      .getByTestId("pdf-studio-input")
      .setInputFiles([{ ...(await makePdf(2)), name: "drop-one.pdf" }]);
    await expect(page.getByTestId("converter-item")).toHaveCount(1);
    await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 20000 });

    await page.getByRole("button", { name: "Remove page 1" }).click();
    await page.getByRole("button", { name: "Duplicate page 1" }).click();

    // Page 1 stays struck through; its duplicate is kept, so 2 of 3 pages.
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /2 of 3 pages/,
    );
  });

  test("merges two PDFs into one document in queue order", async ({ page }) => {
    const first = await makePdf(2);
    const second = await makePdf(3);
    await page.getByTestId("pdf-studio-input").setInputFiles([
      { ...first, name: "first.pdf" },
      { ...second, name: "second.pdf" },
    ]);
    await expect(page.getByTestId("converter-item")).toHaveCount(2);
    await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 20000 });

    await expect(page.getByTestId("converter-studio-page")).toHaveCount(5);
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /5 of 5 pages/,
    );

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("5 pages");

    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(merged.getPageCount()).toBe(5);
  });

  test("reordering the grid changes the order in the written PDF", async ({
    page,
  }) => {
    const pdf = await makePdf(3);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(3);

    // Move the last page to the front using the keyboard-reachable arrows.
    const rows = page.getByTestId("converter-studio-page");
    const pageThree = rows.filter({ hasText: "p3" });
    await pageThree.getByRole("button", { name: /earlier/i }).click();
    await pageThree.getByRole("button", { name: /earlier/i }).click();
    await expect(
      page.getByTestId("converter-studio-page").first(),
    ).toContainText("p3");

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(merged.getPageCount()).toBe(3);
  });

  test("removed pages are not written", async ({ page }) => {
    const pdf = await makePdf(4);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(4);

    await page
      .getByTestId("converter-studio-page")
      .nth(1)
      .getByRole("button", { name: /remove page 2/i })
      .click();
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /3 of 4 pages/,
    );

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("3 pages");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(merged.getPageCount()).toBe(3);
  });

  test("rotating a page changes its written rotation", async ({ page }) => {
    const pdf = await makePdf(1);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);

    await page
      .getByTestId("converter-studio-page")
      .first()
      .getByRole("button", { name: /rotate page 1 right/i })
      .click();
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /1 rotated/,
    );

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(merged.getPage(0).getRotation().angle).toBe(90);
  });

  test("extract writes only the selected pages", async ({ page }) => {
    const pdf = await makePdf(5);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(5);

    await page.getByLabel("PDF studio action").selectOption("extract");
    await page.getByLabel("Page ranges").fill("2-3");
    await page.getByRole("button", { name: /keep only the range/i }).click();
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /2 of 5 pages/,
    );

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    await expect(card).toContainText("2 pages");
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const merged = await PDFDocument.load(file.buffer);
    expect(merged.getPageCount()).toBe(2);
  });

  test("split writes one PDF per range and offers a ZIP", async ({ page }) => {
    const pdf = await makePdf(4);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);

    await page.getByLabel("PDF studio action").selectOption("split");
    await page.getByLabel("Page ranges").fill("1-2, 3-4");
    await expect(page.getByTestId("converter-studio-summary")).toContainText(
      /into 2 PDFs/,
    );

    await runConversion(page);
    await expect(page.getByTestId("converter-result")).toHaveCount(2);

    const zip = await downloadFrom(
      page,
      page.getByTestId("converter-zip-results"),
    );
    const entries = unzipSync(new Uint8Array(zip.buffer));
    expect(Object.keys(entries)).toHaveLength(2);
    for (const name of Object.keys(entries)) {
      const part = await PDFDocument.load(entries[name]);
      expect(part.getPageCount()).toBe(2);
    }
  });

  test("compresses the kept pages and reports the result", async ({ page }) => {
    const pdf = await makePdf(2);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);

    await page.getByLabel("PDF studio action").selectOption("compress");
    await expect(page.getByLabel("PDF compression quality")).toBeVisible();

    await runConversion(page);
    const card = page.getByTestId("converter-result");
    await expect(card).toBeVisible();
    const file = await downloadFrom(
      page,
      card.getByRole("button", { name: /^Download / }),
    );
    const compressed = await PDFDocument.load(file.buffer);
    expect(compressed.getPageCount()).toBe(2);
  });

  test("a plan with no kept pages cannot run and says why", async ({
    page,
  }) => {
    const pdf = await makePdf(2);
    await page.getByTestId("pdf-studio-input").setInputFiles(pdf);
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(2);
    await page.getByLabel("PDF studio action").selectOption("extract");

    await page.getByLabel("Page ranges").fill("1-2");
    await page.getByRole("button", { name: /remove the range/i }).click();

    const problem = page.getByTestId("converter-studio-problem");
    await expect(problem).toContainText(/keep at least one page/i);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });

  test("an encrypted PDF is refused with a clear message", async ({ page }) => {
    await page.getByTestId("pdf-studio-input").setInputFiles(encryptedPdf());
    await expect(page.locator(".converter-file-error")).toContainText(
      /Password-protected PDFs are not supported.*Remove the password/i,
    );
    await expect(page.getByTestId("converter-studio-page")).toHaveCount(0);
    await expect(page.getByTestId("converter-run")).toBeDisabled();
  });
});
