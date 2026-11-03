import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { open, readFile } from "node:fs/promises";

import {
  createEncryptedPdf,
  createSimplePdf,
  pageMarkerText,
} from "../tools/pdf-merge-fixtures";

type FixtureFile = { buffer: Buffer; mimeType: string; name: string };

let encryptedPdf: FixtureFile;
let fivePagePdf: FixtureFile;
let threePagePdf: FixtureFile;

test.beforeAll(async () => {
  fivePagePdf = {
    buffer: Buffer.from(
      await createSimplePdf([
        "SPLIT-1",
        "SPLIT-2",
        "SPLIT-3",
        "SPLIT-4",
        "SPLIT-5",
      ]),
    ),
    mimeType: "application/pdf",
    name: "Board pack.pdf",
  };
  threePagePdf = {
    buffer: Buffer.from(
      await createSimplePdf(["SHORT-1", "SHORT-2", "SHORT-3"]),
    ),
    mimeType: "application/pdf",
    name: "Short.pdf",
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

test("splits custom ranges locally and downloads validated PDFs and a ZIP", async ({
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

  await page.goto("/tools/split-pdf");
  await expect(
    page.getByText("Your PDF never leaves this browser."),
  ).toBeVisible();
  page.on("request", (request) => {
    interactionRequests.push({
      method: request.method(),
      postData: request.postData(),
      url: request.url(),
    });
  });

  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles(fivePagePdf);
  await expect(
    page.getByRole("heading", { name: "Board pack.pdf" }),
  ).toBeVisible();
  await expect(
    page.getByAltText("First page preview of Board pack.pdf"),
  ).toBeVisible();
  await expect(
    page.locator(".pdf-split-pages-panel .pdf-page-tile"),
  ).toHaveCount(5);
  await expect(page.getByText("Page 1 · Output 1")).toBeVisible();
  await expect(page.getByText("Page 5 · Output 2")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel("Output ranges").fill("1,3; 2; 5");
  await expect(
    page.getByText("Pages 4 are not included in any output", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Page 4 · Not included")).toBeVisible();
  await page.getByLabel("Output name").fill("Board pack");
  await page.getByLabel("ZIP name").fill("Board files");
  await expect(
    page.getByText("Ready to create 3 PDFs from 4 written pages."),
  ).toBeVisible();

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("heading", { name: "3 PDFs ready" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel split" })).toHaveCount(
    0,
  );
  await expect(
    page.getByAltText("First page preview of the first split PDF"),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  const pendingZip = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download ZIP (3 PDFs)" }).click();
  const zipDownload = await pendingZip;
  expect(zipDownload.suggestedFilename().replaceAll("_", " ")).toBe(
    "Board files.zip",
  );
  const zipBytes = await readFile((await zipDownload.path())!);
  const entries = readStoredZipEntries(zipBytes);
  expect(entries.map((entry) => entry.name)).toEqual([
    "Board pack-part-01-pages-1-3.pdf",
    "Board pack-part-02-page-2.pdf",
    "Board pack-part-03-page-5.pdf",
  ]);
  expect(await pageMarkerText(entries[0].data)).toEqual([
    expect.stringContaining("SPLIT-1"),
    expect.stringContaining("SPLIT-3"),
  ]);
  expect(await pageMarkerText(entries[1].data)).toEqual([
    expect.stringContaining("SPLIT-2"),
  ]);
  expect(await pageMarkerText(entries[2].data)).toEqual([
    expect.stringContaining("SPLIT-5"),
  ]);

  const pendingPdf = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download", exact: true })
    .first()
    .click();
  const pdfDownload = await pendingPdf;
  expect(pdfDownload.suggestedFilename()).toBe(
    "Board pack-part-01-pages-1-3.pdf",
  );
  const reopened = await PDFDocument.load(
    await readFile((await pdfDownload.path())!),
  );
  expect(reopened.getPageCount()).toBe(2);
  expect(reopened.getTitle()).toBe("Board pack — pages 1, 3");

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
  ).not.toContain("Board pack.pdf");

  await page.getByRole("button", { name: "Start a new split" }).click();
  await expect(
    page.getByRole("button", { name: "Choose PDF", exact: true }),
  ).toBeFocused();
});

test("surfaces unsupported, corrupt, oversized and invalid split plans clearly", async ({
  page,
}, testInfo) => {
  await page.goto("/tools/split-pdf");
  await page.evaluate((pdfBase64) => {
    const binary = atob(pdfBase64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["not a pdf"], "notes.txt", { type: "text/plain" }),
    );
    dataTransfer.items.add(
      new File([bytes], "Short.pdf", { type: "application/pdf" }),
    );
    document.querySelector(".pdf-dropzone")?.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }),
    );
  }, threePagePdf.buffer.toString("base64"));
  await expect(page.getByText("2 files were not added")).toBeVisible();
  await expect(
    page.getByText("“notes.txt” is not a PDF", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("works on one source PDF at a time", { exact: false }),
  ).toBeVisible();

  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    buffer: Buffer.from("%PDF-1.7 broken"),
    mimeType: "application/pdf",
    name: "Broken.pdf",
  });
  await expect(page.getByRole("heading", { name: "Broken.pdf" })).toBeVisible();
  await expect(
    page.getByText("could not be read as a PDF", { exact: false }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles(threePagePdf);
  await expect(page.getByRole("heading", { name: "Short.pdf" })).toBeVisible();
  const ranges = page.getByLabel("Output ranges");
  await ranges.fill("1,1; 2");
  await expect(page.locator("#pdf-split-plan-error")).toContainText(
    "Output 1: Page 1 is selected more than once",
  );
  await ranges.fill("9");
  await expect(page.locator("#pdf-split-plan-error")).toContainText(
    "outside this PDF’s 1–3 page range",
  );

  await page
    .locator(".pdf-split-mode-card")
    .filter({ hasText: "Extract pages" })
    .click();
  const pageTwo = page.getByRole("button", {
    name: "Exclude page 2 from extraction",
  });
  await expect(pageTwo).toBeVisible();
  await pageTwo.click();
  await expect(page.getByLabel("Pages to extract")).toHaveValue("1, 3");
  await page.getByRole("button", { name: "Separate PDF per page" }).click();
  await expect(
    page.getByText("Ready to create 2 PDFs from 2 written pages."),
  ).toBeVisible();

  const oversizedPath = testInfo.outputPath("Too large.pdf");
  const oversizedFile = await open(oversizedPath, "w");
  await oversizedFile.truncate(51 * 1024 * 1024);
  await oversizedFile.close();
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles(oversizedPath);
  await expect(
    page.getByText(
      "“Too large.pdf” is 51.0 MiB, above the 50.0 MiB per-file limit",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Short.pdf" })).toBeVisible();
});

test("unlocks an encrypted PDF, clears its password after splitting, and downloads unencrypted outputs", async ({
  page,
}) => {
  await page.goto("/tools/split-pdf");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles(encryptedPdf);
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
  await expect(page.getByLabel("Output ranges")).toHaveValue("1; 2");

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("link", { name: "Download ZIP (2 PDFs)" }),
  ).toBeVisible();
  await expect(
    page.getByText("password was cleared after the completed split", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Open password for Secret.pdf")).toHaveValue("");

  const pendingZip = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download ZIP (2 PDFs)" }).click();
  const zipDownload = await pendingZip;
  const entries = readStoredZipEntries(
    await readFile((await zipDownload.path())!),
  );
  expect(entries).toHaveLength(2);
  for (const entry of entries) {
    const reopened = await PDFDocument.load(entry.data);
    expect(reopened.isEncrypted).toBe(false);
    expect(reopened.getPageCount()).toBe(1);
  }
});

test("complete mobile workflow splits every N pages with the sticky action", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/tools/split-pdf");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles(fivePagePdf);
  await expect(
    page.getByAltText("First page preview of Board pack.pdf"),
  ).toBeVisible();
  await page
    .locator(".pdf-split-mode-card")
    .filter({ hasText: "Every N pages" })
    .click();
  await page.getByLabel("Pages per PDF").fill("2");
  await expect(
    page.getByText("Ready to create 3 PDFs from 5 written pages."),
  ).toBeVisible();
  await expect(page.getByText("Page 5 · Output 3")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".pdf-mobile-action")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.locator(".pdf-mobile-action .primary").click();
  await expect(
    page.getByRole("link", { name: "Download ZIP (3 PDFs)" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancels a large local split and leaves the source and plan unchanged", async ({
  page,
}) => {
  const labels = Array.from({ length: 999 }, (_, index) => `BULK-${index + 1}`);
  const bulkPdf: FixtureFile = {
    buffer: Buffer.from(await createSimplePdf(labels)),
    mimeType: "application/pdf",
    name: "Bulk.pdf",
  };
  await page.goto("/tools/split-pdf");
  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles(bulkPdf);
  await expect(page.getByRole("heading", { name: "Bulk.pdf" })).toBeVisible();
  await expect(page.getByLabel("Output ranges")).toHaveValue("1-500; 501-999");

  await page.locator(".pdf-output-panel .primary").click();
  await expect(
    page.getByRole("progressbar", { name: "PDF split progress" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel split" }).click();
  await expect(
    page.getByText(
      "Split cancelled. Your source PDF, page plan and original file are unchanged.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bulk.pdf" })).toBeVisible();
  await expect(page.getByLabel("Output ranges")).toHaveValue("1-500; 501-999");
  await expect(page.getByRole("link", { name: /Download ZIP/ })).toHaveCount(0);
});
