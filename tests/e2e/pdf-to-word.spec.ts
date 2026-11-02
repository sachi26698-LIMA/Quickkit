import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

import { createEncryptedPdf } from "../tools/pdf-merge-fixtures";
import {
  createReportPdf,
  createScannedTextPdf,
} from "../tools/pdf-to-word-fixtures";

type FixtureFile = { buffer: Buffer; mimeType: string; name: string };

let reportPdf: FixtureFile;
let scannedPdf: FixtureFile;
let encryptedPdf: FixtureFile;
const notAPdf: FixtureFile = {
  buffer: Buffer.from("this is plain text pretending to be a pdf"),
  mimeType: "application/pdf",
  name: "NotAPdf.pdf",
};

test.beforeAll(async () => {
  reportPdf = {
    buffer: Buffer.from(await createReportPdf()),
    mimeType: "application/pdf",
    name: "Report.pdf",
  };
  scannedPdf = {
    buffer: Buffer.from(await createScannedTextPdf()),
    mimeType: "application/pdf",
    name: "Scanned.pdf",
  };
  encryptedPdf = {
    buffer: Buffer.from(await createEncryptedPdf()),
    mimeType: "application/pdf",
    name: "Secret.pdf",
  };
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

/** Visible text of a DOCX exactly as a word processor would join runs. */
function docxText(bytes: Uint8Array): {
  text: string;
  xml: string;
  keys: string[];
} {
  const zip = unzipSync(bytes);
  const xml = strFromU8(zip["word/document.xml"]);
  const text = xml
    .split(/<\/w:p>|<\/w:tc>/)
    .map((para) =>
      [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ");
  return { text, xml, keys: Object.keys(zip) };
}

const row = (page: Page, name: string) =>
  page.locator(".p2w-row").filter({ hasText: name });

test("inspects queued files honestly before converting", async ({ page }) => {
  await page.goto("/tools/pdf-to-word");
  await page
    .getByLabel("Browse PDFs")
    .setInputFiles([reportPdf, scannedPdf, encryptedPdf, notAPdf]);

  await expect(page.locator(".p2w-row")).toHaveCount(4);
  await expect(row(page, "Report.pdf")).toContainText("2 page(s)", {
    timeout: 30000,
  });
  await expect(row(page, "Report.pdf")).toContainText("Ready");
  await expect(row(page, "Scanned.pdf")).toContainText("Scanned (image-only)");
  await expect(row(page, "Secret.pdf")).toContainText("Failed");
  await expect(row(page, "Secret.pdf")).toContainText("password-protected");
  await expect(row(page, "NotAPdf.pdf")).toContainText("not a PDF");
  await expect(page.locator(".p2w-notice")).toContainText("look scanned");
  await expectNoAxeViolations(page);

  // Retrying a password-protected file fails again with the same reason —
  // it is never marked successful.
  await page.getByRole("button", { name: "Retry Secret.pdf" }).click();
  await expect(row(page, "Secret.pdf")).toContainText("password-protected", {
    timeout: 30000,
  });

  await page.getByRole("button", { name: "Remove NotAPdf.pdf" }).click();
  await expect(page.locator(".p2w-row")).toHaveCount(3);
});

test("converts a text PDF to a genuine DOCX in clean mode", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/tools/pdf-to-word");
  const requestsAfterLoad: { method: string; url: string }[] = [];
  page.on("request", (request) => {
    requestsAfterLoad.push({ method: request.method(), url: request.url() });
  });

  await page.getByLabel("Browse PDFs").setInputFiles([reportPdf]);
  await expect(row(page, "Report.pdf")).toContainText("Ready", {
    timeout: 30000,
  });
  // Clean Editable is the default mode.
  await expect(
    page.getByRole("radio", { name: /Clean Editable/ }),
  ).toBeChecked();

  await page.getByRole("button", { name: /Convert/ }).click();
  await expect(row(page, "Report.pdf")).toContainText("Done", {
    timeout: 60000,
  });
  await expect(row(page, "Report.pdf")).toContainText("1 table(s), 1 image(s)");

  const pendingDownload = page.waitForEvent("download");
  await page.locator('a[download="Report.docx"]').first().click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("Report.docx");
  const path = await download.path();
  const bytes = new Uint8Array(await readFile(path));

  // A real OOXML package (ZIP), never a renamed PDF.
  expect(bytes[0]).toBe(0x50);
  expect(bytes[1]).toBe(0x4b);
  const { text, xml, keys } = docxText(bytes);
  expect(keys).toContain("[Content_Types].xml");
  expect(keys).toContain("word/document.xml");
  expect(text).toContain("Quarterly Report");
  expect(xml).toContain("Heading1");
  expect(text).toContain("fulfilment speed");
  expect(xml).toContain("<w:tbl>");
  expect(text).toContain("48200");
  expect(text).toContain("Revenue up twelve percent");
  expect(text).toContain("Next Steps");
  expect(keys.some((k) => k.startsWith("word/media/"))).toBe(true);

  // Everything stayed on the device: only same-origin GETs after load.
  const base = new URL(page.url()).origin;
  expect(requestsAfterLoad.every((r) => r.method === "GET")).toBe(true);
  expect(requestsAfterLoad.every((r) => r.url.startsWith(base))).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test("keeps original page size with a section per page in layout mode", async ({
  page,
}) => {
  await page.goto("/tools/pdf-to-word");
  await page.getByLabel("Browse PDFs").setInputFiles([reportPdf]);
  await expect(row(page, "Report.pdf")).toContainText("Ready", {
    timeout: 30000,
  });
  await page
    .locator(".p2w-mode-card")
    .filter({ hasText: "Original Layout" })
    .click();
  await expect(
    page.getByRole("radio", { name: /Original Layout/ }),
  ).toBeChecked();

  await page.getByRole("button", { name: /Convert/ }).click();
  await expect(row(page, "Report.pdf")).toContainText("Done", {
    timeout: 60000,
  });

  const pendingDownload = page.waitForEvent("download");
  await page.locator('a[download="Report.docx"]').first().click();
  const download = await pendingDownload;
  const bytes = new Uint8Array(await readFile(await download.path()));
  const { text, xml } = docxText(bytes);
  expect((xml.match(/<w:sectPr/g) ?? []).length).toBe(2);
  expect(xml).toContain('w:w="12240"');
  expect(xml).toContain('w:h="15840"');
  expect(text).toContain("Quarterly Report");
});

test("reads a scanned PDF with on-device OCR", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "OCR e2e runs on Chromium");
  test.setTimeout(300000);

  await page.goto("/tools/pdf-to-word");
  await page.getByLabel("Browse PDFs").setInputFiles([scannedPdf]);
  await expect(row(page, "Scanned.pdf")).toContainText("Scanned (image-only)", {
    timeout: 30000,
  });

  // Without OCR the tool says plainly that scanned pages were skipped.
  await page.getByRole("button", { name: /Convert/ }).click();
  await expect(row(page, "Scanned.pdf")).toContainText("Done", {
    timeout: 60000,
  });
  await expect(row(page, "Scanned.pdf")).toContainText("enable OCR");

  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByLabel("Browse PDFs").setInputFiles([scannedPdf]);
  await expect(row(page, "Scanned.pdf")).toContainText("Ready", {
    timeout: 30000,
  });
  await page.getByRole("checkbox", { name: /Use OCR/ }).check();
  await page.getByRole("button", { name: /Convert/ }).click();
  await expect(row(page, "Scanned.pdf")).toContainText("Done", {
    timeout: 240000,
  });
  await expect(row(page, "Scanned.pdf")).toContainText("read with OCR");

  const pendingDownload = page.waitForEvent("download");
  await page.locator('a[download="Scanned.docx"]').first().click();
  const download = await pendingDownload;
  const bytes = new Uint8Array(await readFile(await download.path()));
  const { text } = docxText(bytes);
  expect(text).toContain("WORLD");
  expect(text).toContain("123");
});

test("downloads the batch as a ZIP with a report", async ({ page }) => {
  await page.goto("/tools/pdf-to-word");
  await page.getByLabel("Browse PDFs").setInputFiles([reportPdf]);
  await expect(page.locator(".p2w-row")).toHaveCount(1);
  await page.getByLabel("Browse PDFs").setInputFiles([reportPdf]);
  await expect(page.locator(".p2w-row")).toHaveCount(2);
  await expect(
    page.locator(".p2w-chip").filter({ hasText: "Ready" }),
  ).toHaveCount(2, {
    timeout: 30000,
  });

  await page.getByRole("button", { name: /Convert/ }).click();
  await expect(
    page.locator(".p2w-chip").filter({ hasText: "Done" }),
  ).toHaveCount(2, {
    timeout: 120000,
  });

  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("quickkit-word-documents.zip");
  const zip = unzipSync(new Uint8Array(await readFile(await download.path())));
  const names = Object.keys(zip);
  expect(names).toContain("Report.docx");
  expect(names).toContain("Report (2).docx");
  expect(names).toContain("batch-report.txt");
  expect(strFromU8(zip["batch-report.txt"])).toContain("Converted: 2");
});
