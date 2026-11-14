import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./helpers/tool-test";
import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { readFile } from "node:fs/promises";

import {
  createImageHeavyPdf,
  createUncompressedTextPdf,
} from "../tools/pdf-compress-fixtures";
import {
  createSignedLikePdf,
  createXfaLikePdf,
  pageMarkerText,
} from "../tools/pdf-merge-fixtures";

type FixtureFile = { buffer: Buffer; mimeType: string; name: string };

let encryptedImagePdf: FixtureFile;
let imagePdf: FixtureFile;
let largeImagePdf: FixtureFile;
let signedPdf: FixtureFile;
let textPdf: FixtureFile;
let xfaPdf: FixtureFile;

function fixture(bytes: Uint8Array, name: string): FixtureFile {
  return { buffer: Buffer.from(bytes), mimeType: "application/pdf", name };
}

async function encryptPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  doc.encrypt({
    ownerPassword: "owner horse",
    permissions: { printing: "highResolution" },
    userPassword: "correct horse",
  });
  return doc.save({ useObjectStreams: false });
}

test.beforeAll(async () => {
  const imageBytes = await createImageHeavyPdf({
    height: 192,
    pages: 2,
    rotateSecondPage: true,
    title: "Photo booklet",
    width: 256,
  });
  imagePdf = fixture(imageBytes, "Photo booklet.pdf");
  encryptedImagePdf = fixture(
    await encryptPdf(await createImageHeavyPdf({ pages: 1, seed: 987654321 })),
    "Secret photos.pdf",
  );
  textPdf = fixture(await createUncompressedTextPdf(8), "Text report.pdf");
  largeImagePdf = fixture(
    await createImageHeavyPdf({
      height: 900,
      pages: 1,
      seed: 424242,
      width: 1200,
    }),
    "Large scan.pdf",
  );
  signedPdf = fixture(await createSignedLikePdf(), "Signed.pdf");
  xfaPdf = fixture(await createXfaLikePdf(), "Dynamic form.pdf");
});

async function expectNoAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      description: violation.description,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

function readStoredZipEntries(zip: Buffer) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entries: { data: Buffer; name: string }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({
      data: zip.subarray(dataStart, dataStart + size),
      name: zip.toString("utf8", nameStart, nameStart + nameLength),
    });
    offset = dataStart + size;
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50);
  return entries;
}

test("batch-compresses locally and downloads validated PDFs and a ZIP", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const interactionRequests: {
    method: string;
    postData: string | null;
    url: string;
  }[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/tools/compress-pdf");
  await expect(
    page.getByText("Your PDFs never leave this browser."),
  ).toBeVisible();
  page.on("request", (request) => {
    interactionRequests.push({
      method: request.method(),
      postData: request.postData(),
      url: request.url(),
    });
  });

  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([imagePdf, textPdf]);
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  await expect(
    page.getByAltText("First page preview of Photo booklet.pdf"),
  ).toBeVisible();
  await expect(
    page.getByAltText("First page preview of Text report.pdf"),
  ).toBeVisible();
  await expect(page.getByText(/2 pages · 612 × 792 pt/)).toBeVisible();
  await expectNoAxeViolations(page);

  await page
    .locator(".pdf-compress-preset-card")
    .filter({ hasText: "Maximum" })
    .click();
  await page.locator("#pdf-compress-quality").fill("42");
  await page.locator("#pdf-compress-max-dimension").fill("700");
  await expect(page.getByText("Custom", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Review quality-sensitive PDFs after compression."),
  ).toBeVisible();

  const entries = page.locator(".pdf-entry");
  await entries.nth(0).getByLabel("Output filename").fill("photo-small");
  await entries.nth(1).getByLabel("Output filename").fill("text-small");
  await page.getByLabel("ZIP filename").fill("smaller-files");

  await page.getByRole("button", { name: "Compress 2 PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: /Results ready/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/2 PDFs · .* → .* · .*% smaller/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);

  const resultList = page.locator(".pdf-compress-result-list");
  const pendingPdf = page.waitForEvent("download");
  await resultList
    .getByRole("link", { name: "Download photo-small.pdf" })
    .click();
  const pdfDownload = await pendingPdf;
  expect(pdfDownload.suggestedFilename()).toBe("photo-small.pdf");
  const compressedBytes = await readFile((await pdfDownload.path())!);
  expect(compressedBytes.byteLength).toBeLessThan(imagePdf.buffer.byteLength);
  const reopened = await PDFDocument.load(compressedBytes, {
    updateMetadata: false,
  });
  expect(reopened.getPageCount()).toBe(2);
  expect(reopened.getPage(0).getSize()).toEqual({ height: 792, width: 612 });
  expect(reopened.getPage(1).getSize()).toEqual({ height: 792, width: 612 });
  expect(reopened.getPage(1).getRotation()).toEqual(degrees(90));
  expect((await pageMarkerText(compressedBytes)).join("\n")).toContain(
    "IMAGE-PAGE-1",
  );

  const prepareZip = page.getByRole("button", { name: "Prepare ZIP" });
  if (await prepareZip.isVisible().catch(() => false)) {
    await prepareZip.click();
  }
  const zipLink = page.getByRole("link", { name: /Download ZIP/ });
  await expect(zipLink).toBeVisible();
  const pendingZip = page.waitForEvent("download");
  await zipLink.click();
  const zipDownload = await pendingZip;
  expect(zipDownload.suggestedFilename()).toBe("smaller-files.zip");
  const zipEntries = readStoredZipEntries(
    await readFile((await zipDownload.path())!),
  );
  expect(zipEntries.map((entry) => entry.name).sort()).toEqual([
    "photo-small.pdf",
    "text-small.pdf",
  ]);
  for (const entry of zipEntries) {
    const doc = await PDFDocument.load(entry.data, { updateMetadata: false });
    expect(doc.getPageCount()).toBeGreaterThan(0);
  }

  await resultList
    .locator("li")
    .filter({ hasText: "photo-small.pdf" })
    .getByRole("button", { name: "Compare" })
    .click();
  await expect(
    page.getByAltText("Original first page of Photo booklet.pdf"),
  ).toBeVisible();
  await expect(
    page.getByAltText("Compressed first page of Photo booklet.pdf"),
  ).toBeVisible({ timeout: 30_000 });
  await expectNoAxeViolations(page);

  expect(consoleErrors).toEqual([]);
  expect(
    interactionRequests.filter(
      (request) => request.method !== "GET" || request.postData,
    ),
  ).toEqual([]);
});

test("unlocks an encrypted PDF locally and downloads an unencrypted validated copy", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/tools/compress-pdf");
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles(encryptedImagePdf);

  const entry = page.locator(".pdf-entry").filter({
    hasText: "Secret photos.pdf",
  });
  const password = entry.getByLabel("PDF password");
  await expect(password).toBeVisible();
  await password.fill("wrong horse");
  await entry.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(
    entry.getByText("That password did not open this PDF", { exact: false }),
  ).toBeVisible();
  await expect(password).toHaveValue("");

  await password.fill("correct horse");
  await entry.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(
    page.getByAltText("First page preview of Secret photos.pdf"),
  ).toBeVisible({ timeout: 30_000 });
  await expect(entry.getByText("Password protected")).toBeVisible();

  await page.getByRole("button", { name: "Compress 1 PDF" }).click();
  await expect(
    page.getByRole("heading", { name: /Results ready/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText("Password cleared from this tab", { exact: false }),
  ).toBeVisible();

  const pendingDownload = page.waitForEvent("download");
  await page
    .locator(".pdf-compress-result-list")
    .getByRole("link", { name: /Download .*\.pdf/ })
    .click();
  const download = await pendingDownload;
  const bytes = await readFile((await download.path())!);
  expect(bytes.byteLength).toBeLessThan(encryptedImagePdf.buffer.byteLength);
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  expect(reopened.isEncrypted).toBe(false);
  expect(reopened.getPageCount()).toBe(1);
});

test("reports an unreachable target honestly and clears stale results when settings change", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/tools/compress-pdf");
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles(imagePdf);
  await expect(
    page.getByAltText("First page preview of Photo booklet.pdf"),
  ).toBeVisible();

  await page.getByLabel(/Target size per PDF/).check();
  await page.getByLabel("Target", { exact: true }).fill("1");
  await page.getByLabel("Target unit").selectOption("KiB");
  await expect(page.getByText("A target is not a guarantee.")).toBeVisible();

  await page.getByRole("button", { name: "Compress 1 PDF" }).click();
  await expect(
    page.getByRole("heading", { name: /Results ready/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Target not reached/).first()).toBeVisible();

  await page.locator("#pdf-compress-quality").fill("41");
  await expect(page.locator(".pdf-compress-results")).toHaveCount(0);
  await expect(page.locator(".pdf-entry")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Compress 1 PDF" }),
  ).toBeEnabled();
});

test("names corrupt and non-PDF files, marks duplicates and does not drop valid PDFs", async ({
  page,
}) => {
  await page.goto("/tools/compress-pdf");
  const corrupt: FixtureFile = {
    buffer: Buffer.from("%PDF-1.7\nthis is not a readable document"),
    mimeType: "application/pdf",
    name: "Broken.pdf",
  };
  const notes: FixtureFile = {
    buffer: Buffer.from("plain notes"),
    mimeType: "text/plain",
    name: "notes.txt",
  };

  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([imagePdf, corrupt, notes]);
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  await expect(page.getByText("1 file was not added")).toBeVisible();
  await expect(page.getByText(/notes\.txt: .* is not a PDF/)).toBeVisible();
  const broken = page.locator(".pdf-entry").filter({ hasText: "Broken.pdf" });
  await expect(broken.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Not included in this run")).toBeVisible();
  await expect(
    page.getByAltText("First page preview of Photo booklet.pdf"),
  ).toBeVisible();

  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles(imagePdf);
  await expect(page.locator(".pdf-entry")).toHaveCount(3);
  await expect(page.getByText("Duplicate of PDF 1")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compress 2 PDFs" }),
  ).toBeEnabled();
  await expectNoAxeViolations(page);
});

test("blocks signed and dynamic XFA PDFs instead of silently rewriting them", async ({
  page,
}) => {
  await page.goto("/tools/compress-pdf");
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([signedPdf, xfaPdf]);
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  await expect(
    page.getByText("digitally signed", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Dynamic XFA forms are not supported").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compress PDFs" }),
  ).toBeDisabled();
  await expectNoAxeViolations(page);
});

test("complete mobile workflow uses the sticky action without horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/tools/compress-pdf");
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles(imagePdf);
  await expect(
    page.getByAltText("First page preview of Photo booklet.pdf"),
  ).toBeVisible();
  await expect(page.locator(".pdf-mobile-action")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectNoAxeViolations(page);

  await page.locator(".pdf-mobile-action .primary").click();
  await expect(
    page.getByRole("heading", { name: /Results ready/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.locator(".pdf-compress-result-list").getByRole("link", {
      name: /Download .*\.pdf/,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("cancels a large batch and leaves unfinished PDFs ready to retry", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/tools/compress-pdf");
  const copies = [1, 2, 3].map((index) => ({
    ...largeImagePdf,
    name: `Large scan ${index}.pdf`,
  }));
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles(copies);
  await expect(page.locator(".pdf-entry")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Compress 3 PDFs" }),
  ).toBeEnabled({ timeout: 60_000 });

  const targetToggle = page.getByLabel(/Target size per PDF/);
  await targetToggle.focus();
  await page.keyboard.press("Space");
  await expect(targetToggle).toBeChecked();
  await page.getByLabel("Target", { exact: true }).fill("1");
  await page.getByLabel("Target unit").selectOption("KiB");
  await page.getByRole("button", { name: "Compress 3 PDFs" }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel compression" })
    .click({ force: true });

  await expect(page.getByText(/Compression cancelled/)).toBeVisible();
  await expect(page.locator(".pdf-entry")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /Compress \d+ PDFs/ }),
  ).toBeEnabled();
});
