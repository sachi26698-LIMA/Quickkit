import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { open, readFile } from "node:fs/promises";

import {
  createEncryptedPdf,
  createLinkedPdf,
  createSimplePdf,
  pageMarkerText,
} from "../tools/pdf-merge-fixtures";

type FixtureFile = { buffer: Buffer; mimeType: string; name: string };

let alphaPdf: FixtureFile;
let betaPdf: FixtureFile;
let encryptedPdf: FixtureFile;
let linkedPdf: FixtureFile;

test.beforeAll(async () => {
  alphaPdf = {
    buffer: Buffer.from(
      await createSimplePdf(["ALPHA-1", "ALPHA-2", "ALPHA-3"]),
    ),
    mimeType: "application/pdf",
    name: "Alpha.pdf",
  };
  betaPdf = {
    buffer: Buffer.from(await createSimplePdf(["BETA-1", "BETA-2"])),
    mimeType: "application/pdf",
    name: "Beta.pdf",
  };
  encryptedPdf = {
    buffer: Buffer.from(await createEncryptedPdf()),
    mimeType: "application/pdf",
    name: "Secret.pdf",
  };
  linkedPdf = {
    buffer: Buffer.from(await createLinkedPdf()),
    mimeType: "application/pdf",
    name: "Linked.pdf",
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

test("merges reordered selected pages locally and downloads a validated PDF", async ({
  page,
}) => {
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

  await page.goto("/tools/merge-pdf");
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
    .setInputFiles([alphaPdf, linkedPdf]);
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  await expect(
    page.getByAltText("First page preview of Alpha.pdf"),
  ).toBeVisible();
  await expect(
    page.getByAltText("First page preview of Linked.pdf"),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  const linkedEntry = page
    .locator(".pdf-entry")
    .filter({ hasText: "Linked.pdf" });
  await linkedEntry.getByRole("button", { name: "Move Linked.pdf up" }).click();
  await expect(page.locator(".pdf-entry h4").first()).toHaveText("Linked.pdf");

  await linkedEntry.getByLabel("Custom pages", { exact: true }).check();
  await linkedEntry.getByLabel("Page range", { exact: true }).fill("1,3");
  const alphaEntry = page
    .locator(".pdf-entry")
    .filter({ hasText: "Alpha.pdf" });
  await alphaEntry.getByLabel("Custom pages", { exact: true }).check();
  await alphaEntry.getByLabel("Page range", { exact: true }).fill("2");

  await page.getByLabel("Download file name").fill("Combined report");
  await page.getByLabel("PDF document title").fill("Combined local report");
  await expect(
    page.getByText("Ready to merge 3 selected pages into Combined report.pdf."),
  ).toBeVisible();

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("heading", { name: "Combined report.pdf" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel merge" })).toHaveCount(
    0,
  );
  await expect(
    page.getByAltText("First page preview of the merged PDF"),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download merged PDF" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename().replaceAll("_", " ")).toBe(
    "Combined report.pdf",
  );
  const outputBytes = await readFile((await download.path())!);
  const reopened = await PDFDocument.load(outputBytes);
  expect(reopened.getPageCount()).toBe(3);
  expect(reopened.getTitle()).toBe("Combined local report");
  expect(await pageMarkerText(outputBytes)).toEqual([
    expect.stringContaining("LINK-SELECTED-1"),
    expect.stringContaining("LINK-SELECTED-3"),
    expect.stringContaining("ALPHA-2"),
  ]);

  expect(consoleErrors).toEqual([]);
  expect(
    interactionRequests.every(
      (request) => request.method === "GET" && !request.postData,
    ),
  ).toBe(true);
  expect(
    interactionRequests.every((request) => {
      if (request.url.startsWith("blob:") || request.url.startsWith("data:"))
        return true;
      return new URL(request.url).origin === new URL(page.url()).origin;
    }),
  ).toBe(true);
  expect(
    interactionRequests.map((request) => request.url).join(" "),
  ).not.toContain("Linked.pdf");
});

test("surfaces unsupported, corrupt, oversized and duplicate selections without skipping", async ({
  page,
}, testInfo) => {
  await page.goto("/tools/merge-pdf");
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles([
    {
      buffer: Buffer.from("not a pdf"),
      mimeType: "text/plain",
      name: "notes.txt",
    },
    {
      buffer: Buffer.from("%PDF-1.7 broken"),
      mimeType: "application/pdf",
      name: "Broken.pdf",
    },
    alphaPdf,
    alphaPdf,
  ]);

  await expect(page.getByText("1 file was not added")).toBeVisible();
  await expect(
    page.getByText("“notes.txt” is not a PDF", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".pdf-entry")).toHaveCount(3);
  await expect(
    page.getByText("could not be read as a PDF", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/Same content as #2/)).toBeVisible();
  await expectNoAxeViolations(page);

  const readyAlpha = page.locator(".pdf-entry").nth(1);
  await readyAlpha.getByLabel("Custom pages", { exact: true }).check();
  const range = readyAlpha.getByLabel("Page range", { exact: true });
  await range.fill("1,1");
  await expect(readyAlpha.getByRole("alert")).toContainText(
    "selected more than once",
  );
  await range.fill("9");
  await expect(readyAlpha.getByRole("alert")).toContainText(
    "outside this PDF’s 1–3 page range",
  );

  const oversizedPath = testInfo.outputPath("Too large.pdf");
  const oversizedFile = await open(oversizedPath, "w");
  await oversizedFile.truncate(51 * 1024 * 1024);
  await oversizedFile.close();
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles(oversizedPath);
  await expect(
    page.getByText(
      "“Too large.pdf” is 51.0 MiB, above the 50.0 MiB per-file limit",
      { exact: false },
    ),
  ).toBeVisible();
});

test("unlocks an encrypted PDF, clears its password after a successful merge, and downloads unencrypted", async ({
  page,
}) => {
  await page.goto("/tools/merge-pdf");
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([encryptedPdf, betaPdf]);
  await expect(page.getByText("Password needed")).toBeVisible();
  await expectNoAxeViolations(page);

  const password = page.getByLabel("Open password for Secret.pdf");
  await password.fill("wrong password");
  await page.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(
    page.getByText("That password did not open this PDF", { exact: false }),
  ).toBeVisible();
  await expect(password).toHaveValue("");

  await password.fill("correct horse");
  await page.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(
    page.getByAltText("First page preview of Secret.pdf"),
  ).toBeVisible();
  await expect(
    page.getByText("Unlocked locally · output will not be encrypted"),
  ).toBeVisible();

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("link", { name: "Download merged PDF" }),
  ).toBeVisible();
  await expect(
    page.getByText("password was cleared after the completed merge", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Open password for Secret.pdf")).toHaveValue("");

  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download merged PDF" }).click();
  const download = await pendingDownload;
  const reopened = await PDFDocument.load(
    await readFile((await download.path())!),
  );
  expect(reopened.isEncrypted).toBe(false);
  expect(reopened.getPageCount()).toBe(4);
});

test("complete mobile workflow supports buttons, visual page picker and download", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/tools/merge-pdf");
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([alphaPdf, betaPdf]);
  await expect(
    page.getByAltText("First page preview of Alpha.pdf"),
  ).toBeVisible();
  await expect(
    page.getByAltText("First page preview of Beta.pdf"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Move Alpha.pdf down" }).click();
  await expect(page.locator(".pdf-entry h4").first()).toHaveText("Beta.pdf");

  const betaEntry = page.locator(".pdf-entry").filter({ hasText: "Beta.pdf" });
  await betaEntry
    .getByRole("button", { name: "Choose pages visually" })
    .click();
  const betaPageOne = betaEntry.getByRole("button", {
    name: "Exclude page 1 of Beta.pdf",
  });
  await expect(betaPageOne).toBeVisible();
  await betaPageOne.click();
  await expect(betaEntry.getByText("1 of 2 pages · 2")).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".pdf-mobile-action")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.locator(".pdf-mobile-action .primary").click();
  await expect(
    page.getByRole("link", { name: "Download merged PDF" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancels a large local merge and leaves the queue unchanged", async ({
  page,
}) => {
  const manyLabels = Array.from(
    { length: 999 },
    (_, index) => `BULK-${index + 1}`,
  );
  const bulkPdf: FixtureFile = {
    buffer: Buffer.from(await createSimplePdf(manyLabels)),
    mimeType: "application/pdf",
    name: "Bulk.pdf",
  };
  await page.goto("/tools/merge-pdf");
  await page
    .getByLabel("Choose PDFs", { exact: true })
    .setInputFiles([bulkPdf, betaPdf]);
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  const betaEntry = page.locator(".pdf-entry").filter({ hasText: "Beta.pdf" });
  await betaEntry.getByLabel("Custom pages", { exact: true }).check();
  await betaEntry.getByLabel("Page range", { exact: true }).fill("1");

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("progressbar", { name: "PDF merge progress" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel merge" }).click();
  await expect(
    page.getByText(
      "Merge cancelled. Your queue, page selections and original files are unchanged.",
    ),
  ).toBeVisible();
  await expect(page.locator(".pdf-entry")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Download merged PDF" }),
  ).toHaveCount(0);
});
