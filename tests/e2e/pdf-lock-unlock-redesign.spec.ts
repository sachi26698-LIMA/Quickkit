import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import createModule from "@neslinesli93/qpdf-wasm";
import { unzipSync } from "fflate";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const wasmPath = fileURLToPath(
  new URL(
    "../../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
    import.meta.url,
  ),
);

let plainPdf: Buffer;
let secondPdf: Buffer;
let encryptedPdf: Buffer;
let batchPdf: Buffer;
const SHARED_PASSWORD = "Redesign-Shared-123!";
const FIXTURE_PASSWORD = "Redesign-Fixture-789!";

async function createFixture(
  pages: number,
  title: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle(title);
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([320, 440]);
    page.drawText(`${title} ${index + 1}`, { font, size: 12, x: 24, y: 380 });
  }
  return doc.save({ useObjectStreams: false });
}

test.beforeAll(async () => {
  plainPdf = Buffer.from(await createFixture(2, "Redesign A"));
  secondPdf = Buffer.from(await createFixture(1, "Redesign B"));
  batchPdf = Buffer.from(await createFixture(100, "Batch Redesign"));
  const qpdf = await createModule({ locateFile: () => wasmPath });
  const fs = qpdf.FS as unknown as {
    readFile(path: string): Uint8Array;
    writeFile(path: string, data: Uint8Array): void;
  };
  fs.writeFile("/input.pdf", new Uint8Array(plainPdf));
  const code = qpdf.callMain([
    "--encrypt",
    FIXTURE_PASSWORD,
    "Redesign-Owner-000!",
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
  if (code !== 0) throw new Error(`Fixture encryption failed: ${code}`);
  encryptedPdf = Buffer.from(fs.readFile("/output.pdf"));
});

async function openDetails(page: Page, id: string) {
  const details = page.locator(`#${id}`);
  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await details.locator("summary").click();
  }
}

async function upload(page: Page, files: { buffer: Buffer; name: string }[]) {
  await page.getByLabel("Choose PDFs", { exact: true }).setInputFiles(
    files.map((file) => ({
      buffer: file.buffer,
      mimeType: "application/pdf",
      name: file.name,
    })),
  );
  await expect(page.locator("ol[aria-label='PDF file queue'] li")).toHaveCount(
    files.length,
  );
}

async function fillSharedLock(page: Page, password = SHARED_PASSWORD) {
  await page.locator("#lock-open-password").fill(password);
  await page.locator("#lock-confirm-password").fill(password);
}

async function downloadBuffer(page: Page, trigger: () => Promise<void>) {
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
  const pages = pdf.numPages;
  await task.destroy();
  return { pages, permissions };
}

test("advanced permissions accordion controls presets and individual toggles", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/tools/pdf-lock-unlock");
  await openDetails(page, "advanced-permissions");
  const preset = page.locator("#permission-preset");
  await expect(preset).toHaveValue("restricted");

  const boxes = page.locator("#advanced-permissions input[type='checkbox']");
  await boxes.nth(0).check(); // Printing
  await expect(boxes.nth(1)).toBeEnabled(); // High-resolution printing
  await boxes.nth(1).check();
  await boxes.nth(2).check(); // Copy
  await expect(preset).toHaveValue("custom");

  await preset.selectOption("print-only");
  await expect(boxes.nth(0)).toBeChecked();
  await expect(boxes.nth(2)).not.toBeChecked();

  await upload(page, [{ buffer: plainPdf, name: "Permissions.pdf" }]);
  await fillSharedLock(page);
  await page.getByRole("button", { name: /Lock 1 PDF/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toBeVisible({ timeout: 90_000 });

  const locked = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download PDF" }).click();
  });
  const reader = await pdfjsInspect(locked, SHARED_PASSWORD);
  expect(reader.permissions?.has(4)).toBe(true); // printing allowed by preset
  expect(reader.permissions?.has(16)).toBe(false); // copying still restricted
});

test("individual lock passwords and per-file output renaming survive ZIP export", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto("/tools/pdf-lock-unlock");
  await upload(page, [
    { buffer: plainPdf, name: "Individual A.pdf" },
    { buffer: secondPdf, name: "Individual B.pdf" },
  ]);
  await openDetails(page, "advanced-passwords");
  await page.getByRole("radio", { name: "Individual passwords" }).check();

  const rows = page.locator("ol[aria-label='PDF file queue'] li");
  const passwords = ["Individual-A-123!", "Individual-B-456!"];
  const outputs = ["Renamed A.pdf", "Renamed B.pdf"];
  for (let index = 0; index < 2; index += 1) {
    const row = rows.nth(index);
    await row
      .getByRole("checkbox", { name: /Use a custom open password/ })
      .check();
    await row
      .getByLabel("Custom open password", { exact: true })
      .fill(passwords[index]);
    await row
      .getByLabel("Confirm custom password", { exact: true })
      .fill(passwords[index]);
    await row.getByText("Rename output").click();
    await row.getByLabel("Output filename").fill(outputs[index]);
  }

  await page.getByRole("button", { name: /Lock 2 PDFs/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toHaveCount(2, { timeout: 120_000 });

  const zip = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download all as ZIP" }).click();
  });
  const entries = unzipSync(new Uint8Array(zip));
  expect(Object.keys(entries).sort()).toEqual([...outputs].sort());
  for (let index = 0; index < 2; index += 1) {
    const reader = await pdfjsInspect(
      Buffer.from(entries[outputs[index]]),
      passwords[index],
    );
    expect(reader.pages).toBeGreaterThanOrEqual(1);
  }
});

test("cancellation stops a batch run, clears passwords and supports retry", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/tools/pdf-lock-unlock");
  await upload(
    page,
    Array.from({ length: 20 }, (_, index) => ({
      buffer: batchPdf,
      name: `Cancel Batch ${index + 1}.pdf`,
    })),
  );
  await fillSharedLock(page);

  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.getByRole("button", { name: /Lock 20 PDFs/ }).click();
  await page
    .getByRole("button", { name: "Cancel", exact: true })
    .click({ timeout: 15_000 });
  await expect(page.getByText(/Processing cancelled/)).toBeVisible();
  await expect(page.locator("#lock-open-password")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Retry failed" }),
  ).toBeVisible();
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  await page.getByRole("button", { name: "Retry failed" }).click();
  await fillSharedLock(page);
  await page.getByRole("button", { name: /^Lock \d+ PDFs?$/ }).click();
  await expect(
    page.getByText("Locked and verified", { exact: true }),
  ).toHaveCount(20, { timeout: 180_000 });
});

test("individual unlock passwords can be verified before processing", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/tools/pdf-lock-unlock");
  await page.getByRole("tab", { name: "Unlock PDF", exact: true }).click();
  await upload(page, [
    { buffer: encryptedPdf, name: "Protected Individual.pdf" },
  ]);
  await openDetails(page, "advanced-passwords");
  await page.getByRole("radio", { name: "Individual passwords" }).check();
  await page.getByRole("checkbox", { name: /I own these PDFs/ }).check();

  const row = page.locator("ol[aria-label='PDF file queue'] li").first();
  await row
    .getByLabel("Password for this PDF", { exact: true })
    .fill(FIXTURE_PASSWORD);
  await row.getByRole("button", { name: "Verify password" }).click();
  await expect(
    page.getByText("Password verified", { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: /Unlock 1 PDF/ }).click();
  await expect(
    page.getByText("Unlocked and verified", { exact: true }),
  ).toBeVisible({ timeout: 90_000 });
  const unlocked = await downloadBuffer(page, async () => {
    await page.getByRole("button", { name: "Download PDF" }).click();
  });
  const reader = await pdfjsInspect(unlocked);
  expect(reader.pages).toBe(2);
});

test("responsive layout holds at 360, 390, 430, 768, 1024 and 1440px", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const width of [360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/tools/pdf-lock-unlock");
    await upload(page, [{ buffer: plainPdf, name: `Responsive ${width}.pdf` }]);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);

    const settings = await page.locator("#pdf-security-settings").boundingBox();
    const advanced = await page.locator("#pdf-security-advanced").boundingBox();
    const uploadBox = await page.locator("#pdf-security-upload").boundingBox();
    const queue = await page.locator("#pdf-security-queue").boundingBox();
    const action = await page.locator("#pdf-security-action").boundingBox();
    expect(settings && advanced && uploadBox && queue && action).toBeTruthy();

    if (width < 900) {
      // Purpose-built mobile DOM order: password, advanced, upload, queue, action.
      const orderOk = await page.evaluate(() => {
        const ids = [
          "pdf-security-settings",
          "pdf-security-advanced",
          "pdf-security-upload",
          "pdf-security-queue",
          "pdf-security-action",
        ];
        const els = ids.map((id) => document.getElementById(id));
        return els.every(
          (el, index) =>
            el &&
            (index === 0 ||
              (els[index - 1]!.compareDocumentPosition(el) &
                Node.DOCUMENT_POSITION_FOLLOWING) !==
                0),
        );
      });
      expect(orderOk, `mobile section order at ${width}px`).toBe(true);
      expect(action!.height).toBeGreaterThanOrEqual(44);
      const tab = await page
        .getByRole("tab", { name: "Lock PDF", exact: true })
        .boundingBox();
      expect(tab!.height).toBeGreaterThanOrEqual(44);

      // At the end of the page the sticky action must not cover the queue.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const sticky = await page.locator("#pdf-security-action").boundingBox();
      const queueEnd = await page.locator("#pdf-security-queue").boundingBox();
      expect(sticky!.y + sticky!.height).toBeLessThanOrEqual(
        (await page.viewportSize())!.height + 1,
      );
      expect(queueEnd!.y + queueEnd!.height).toBeLessThanOrEqual(sticky!.y + 1);
    } else {
      // Balanced desktop columns: settings/advanced left, upload/queue/action right.
      expect(settings!.x).toBeLessThan(uploadBox!.x);
      expect(advanced!.x).toBeLessThan(queue!.x);
    }
  }
});
