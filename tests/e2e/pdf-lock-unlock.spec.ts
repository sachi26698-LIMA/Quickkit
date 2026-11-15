import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./helpers/tool-test";
import { PDFDocument, StandardFonts, PDFName, PDFDict } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import createModule from "@neslinesli93/qpdf-wasm";
import { unzipSync } from "fflate";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const wasmPath = fileURLToPath(
  new URL(
    "../../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
    import.meta.url,
  ),
);
const screenshotDir = fileURLToPath(
  new URL("../../test-results/evidence/pdf-lock-unlock", import.meta.url),
);

let plainPdf: Buffer;
let secondPdf: Buffer;
let encryptedPdf: Buffer;
const OPEN_PASSWORD = "E2e-Open-Password-123!";
const OWNER_PASSWORD = "E2e-Owner-Password-456!";
const FIXTURE_PASSWORD = "Fixture-Open-789!";

async function createFixture(
  pages: number,
  title: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle(title);
  doc.setAuthor("E2E Author");
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([320 + index * 8, 440]);
    page.drawText(`E2E-PAGE-${index + 1}`, { font, size: 14, x: 24, y: 380 });
  }
  return doc.save({ useObjectStreams: false });
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
  plainPdf = Buffer.from(await createFixture(2, "E2E Lock Fixture"));
  secondPdf = Buffer.from(await createFixture(1, "Second Fixture"));
  const qpdf = await createModule({ locateFile: () => wasmPath });
  const fs = qpdf.FS as unknown as {
    readFile(path: string): Uint8Array;
    writeFile(path: string, data: Uint8Array): void;
  };
  fs.writeFile("/input.pdf", new Uint8Array(plainPdf));
  const code = qpdf.callMain([
    "--encrypt",
    FIXTURE_PASSWORD,
    "Fixture-Owner-000!",
    "256",
    "--print=none",
    "--modify=none",
    "--extract=n",
    "--form=y",
    "--accessibility=y",
    "--annotate=n",
    "--assemble=n",
    "--modify-other=n",
    "--",
    "/input.pdf",
    "/output.pdf",
  ]);
  if (code !== 0)
    throw new Error(`Fixture encryption failed with code ${code}`);
  encryptedPdf = Buffer.from(fs.readFile("/output.pdf"));
});

async function expectNoAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

function trackPrivacy(page: Page, secrets: string[], origin: string) {
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) externalRequests.push(request.url());
  });
  return {
    assertClean() {
      expect(externalRequests).toEqual([]);
      expect(consoleErrors).toEqual([]);
      for (const secret of secrets) {
        expect(
          consoleMessages.some((message) => message.includes(secret)),
        ).toBe(false);
      }
    },
  };
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.addStyleTag({
    content: 'header, [class*="actionBar"] { position: static !important; }',
  });
  await page.screenshot({ path: `${screenshotDir}/${name}`, fullPage: true });
}

async function downloadBuffer(
  page: Page,
  trigger: () => Promise<void>,
): Promise<Buffer> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    trigger(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("Download path unavailable");
  return readFile(path);
}

async function pdfjsInspect(bytes: Buffer, password?: string) {
  const task = getDocument({
    data: new Uint8Array(bytes),
    password,
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  const permissions = await pdf.getPermissions();
  const metadata = await pdf.getMetadata();
  const pages = pdf.numPages;
  await task.destroy();
  return { metadata, pages, permissions };
}

test("is registered, discoverable and accessible", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/tools/pdf-lock-unlock");
  await expect(
    page.getByRole("heading", { name: "PDF Lock & Unlock", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Lock PDF", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tab", { name: "Unlock PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Your PDFs never leave this browser/),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto("/tools");
  await page.locator("#tool-search").fill("lock unlock");
  await expect(
    page.getByRole("link", { name: /PDF Lock & Unlock/ }),
  ).toBeVisible();

  await page.goto("/category/pdf-tools");
  await expect(
    page.getByRole("link", { name: /PDF Lock & Unlock/ }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "PDF Lock & Unlock" }),
  ).toBeVisible();
});

test("locks a PDF with AES-256, verifies the download and clears passwords", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const privacy = trackPrivacy(
    page,
    [OPEN_PASSWORD, OWNER_PASSWORD],
    new URL(test.info().project.use.baseURL!).origin,
  );
  await page.goto("/tools/pdf-lock-unlock");
  await capture(page, "01-empty-desktop.png");

  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles({
    buffer: plainPdf,
    mimeType: "application/pdf",
    name: "E2E Lock Fixture.pdf",
  });
  await expect(page.locator("ol[aria-label='PDF file queue'] li")).toHaveCount(
    1,
  );
  await expect(page.getByText("Not encrypted")).toBeVisible();

  await page.locator("#lock-open-password").fill(OPEN_PASSWORD);
  await expect(page.getByText(/Password strength:/)).toBeVisible();
  await page.locator("#lock-confirm-password").fill(OPEN_PASSWORD);
  await page
    .getByRole("checkbox", { name: /Set a separate permissions password/ })
    .check();
  await page.locator("#lock-owner-password").fill(OWNER_PASSWORD);
  await page.locator("#lock-owner-confirm-password").fill(OWNER_PASSWORD);
  await expect(page.locator("#lock-algorithm")).toHaveValue("AES-256");
  await capture(page, "02-lock-settings-desktop.png");

  await page.getByRole("button", { name: /Lock 1 PDF/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("AES-256 verified")).toBeVisible();
  await expect(page.locator("#lock-open-password")).toHaveValue("");
  await expect(page.locator("#lock-confirm-password")).toHaveValue("");
  await expect(page.locator("#lock-owner-password")).toHaveValue("");
  await expect(page.locator("#lock-owner-confirm-password")).toHaveValue("");
  await capture(page, "03-lock-result-desktop.png");

  const locked = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download PDF" }).click();
  });
  const probe = await PDFDocument.load(locked, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  expect(probe.isEncrypted).toBe(true);
  const encryptRef = probe.context.trailerInfo.Encrypt;
  expect(encryptRef).toBeDefined();
  const encryptDict = probe.context.lookup(encryptRef!, PDFDict);
  if (!encryptDict) throw new Error("Missing encryption dictionary");
  expect(encryptDict.get(PDFName.of("V"))!.toString()).toBe("5");
  expect(encryptDict.get(PDFName.of("R"))!.toString()).toBe("6");

  // Independent reader verification with PDF.js.
  const reader = await pdfjsInspect(locked, OPEN_PASSWORD);
  expect(reader.pages).toBe(2);
  expect(reader.permissions?.has(256)).toBe(true); // fill forms
  expect(reader.permissions?.has(512)).toBe(true); // accessibility
  expect(reader.permissions?.has(4)).toBe(false); // printing
  expect(reader.permissions?.has(16)).toBe(false); // copying
  expect((reader.metadata.info as { Title?: string }).Title).toBe(
    "E2E Lock Fixture",
  );
  await expect(pdfjsInspect(locked)).rejects.toThrow();

  await expect(page.getByText(/Download started/)).toBeVisible();
  privacy.assertClean();
});

test("rejects a wrong unlock password, then unlocks with the correct one", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const privacy = trackPrivacy(
    page,
    [FIXTURE_PASSWORD, "Wrong-Password-000!"],
    new URL(test.info().project.use.baseURL!).origin,
  );
  await page.goto("/tools/pdf-lock-unlock");
  await page.getByRole("tab", { name: "Unlock PDF", exact: true }).click();
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles({
    buffer: encryptedPdf,
    mimeType: "application/pdf",
    name: "Protected Fixture.pdf",
  });
  await expect(page.getByText("AES-256 encrypted")).toBeVisible();
  await page.getByRole("checkbox", { name: /I own these PDFs/ }).check();

  await page.locator("#unlock-common-password").fill("Wrong-Password-000!");
  await page.getByRole("button", { name: /Unlock 1 PDF/ }).click();
  await expect(
    page.getByText(/That password did not open this PDF/),
  ).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("#unlock-common-password")).toHaveValue("");

  await page.locator("#unlock-common-password").fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /Unlock 1 PDF/ }).click();
  await expect(
    page.getByText("Unlocked and verified", { exact: true }),
  ).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("Protection removed")).toBeVisible();
  await capture(page, "04-unlock-result-desktop.png");

  const unlocked = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download PDF" }).click();
  });
  const probe = await PDFDocument.load(unlocked, { updateMetadata: false });
  expect(probe.isEncrypted).toBe(false);
  expect(probe.getPageCount()).toBe(2);
  expect(probe.getTitle()).toBe("E2E Lock Fixture");
  const reader = await pdfjsInspect(unlocked);
  expect(reader.pages).toBe(2);
  privacy.assertClean();
});

test("batch-locks multiple PDFs and downloads a valid ZIP", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const privacy = trackPrivacy(
    page,
    [OPEN_PASSWORD],
    new URL(test.info().project.use.baseURL!).origin,
  );
  await page.goto("/tools/pdf-lock-unlock");
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles([
    { buffer: plainPdf, mimeType: "application/pdf", name: "Batch A.pdf" },
    { buffer: secondPdf, mimeType: "application/pdf", name: "Batch B.pdf" },
  ]);
  await expect(page.locator("ol[aria-label='PDF file queue'] li")).toHaveCount(
    2,
  );
  await page.locator("#lock-open-password").fill(OPEN_PASSWORD);
  await page.locator("#lock-confirm-password").fill(OPEN_PASSWORD);
  await page.getByRole("button", { name: /Lock 2 PDFs/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }).first(),
  ).toBeVisible({
    timeout: 120_000,
  });
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toHaveCount(2);

  const zip = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download all as ZIP" }).click();
  });
  const entries = unzipSync(new Uint8Array(zip));
  const names = Object.keys(entries);
  expect(names).toHaveLength(2);
  expect(names).toContain("Batch A-locked.pdf");
  expect(names).toContain("Batch B-locked.pdf");
  for (const name of names) {
    const probe = await PDFDocument.load(entries[name], {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    expect(probe.isEncrypted).toBe(true);
    const reader = await pdfjsInspect(
      Buffer.from(entries[name]),
      OPEN_PASSWORD,
    );
    expect(reader.pages).toBeGreaterThanOrEqual(1);
  }
  privacy.assertClean();
});

test("mobile layout remains usable and accessible", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/pdf-lock-unlock");
  await expect(
    page.getByRole("tab", { name: "Lock PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Unlock PDF", exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await capture(page, "05-empty-mobile.png");

  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles({
    buffer: plainPdf,
    mimeType: "application/pdf",
    name: "Mobile Fixture.pdf",
  });
  await page.locator("#lock-open-password").fill(OPEN_PASSWORD);
  await page.locator("#lock-confirm-password").fill(OPEN_PASSWORD);
  await capture(page, "06-lock-settings-mobile.png");
  await page.getByRole("button", { name: /Lock 1 PDF/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toBeVisible({
    timeout: 90_000,
  });
  await capture(page, "07-lock-result-mobile.png");
  await expectNoAxeViolations(page);
});
