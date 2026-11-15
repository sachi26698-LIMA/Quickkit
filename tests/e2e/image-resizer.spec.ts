import { test, expect, type Page } from "./helpers/tool-test";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";

type Upload = { name: string; mimeType: string; buffer: Buffer };

async function pngFixture(
  page: Page,
  width: number,
  height: number,
  name: string,
  hue = 210,
): Promise<Upload> {
  const base64 = await page.evaluate(
    ([w, h, tone]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, `hsl(${tone}, 78%, 62%)`);
      gradient.addColorStop(1, `hsl(${tone + 60}, 72%, 38%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.3, h * 0.2);
      ctx.fillStyle = "rgba(17, 24, 39, 0.55)";
      ctx.fillRect(w * 0.55, h * 0.6, w * 0.3, h * 0.25);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height, hue] as const,
  );
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

async function decodeDimensions(page: Page, buffer: Buffer, mimeType: string) {
  const base64 = buffer.toString("base64");
  return page.evaluate(
    async ([data, type]) => {
      const image = new Image();
      image.src = `data:${type};base64,${data}`;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    },
    [base64, mimeType] as const,
  );
}

function zipEntries(buffer: Buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);
  const eocd = buffer.length - 22;
  expect(buffer.readUInt32LE(eocd)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: { name: string; data: Buffer; method: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtra;
    entries.push({ name, method, data: buffer.subarray(start, start + size) });
    offset += 46 + nameLength;
  }
  return entries;
}

test.describe("image resizer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-resizer");
  });

  test("validates inputs and resizes with a locked aspect ratio", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /Resize images/ }),
    ).toBeDisabled();

    const input = page.getByLabel("Add images");
    await input.setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.locator(".resizer-alert")).toContainText(
      "JPEG, PNG or WebP",
    );

    await input.setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("broken bytes"),
    });
    await expect(page.locator(".resizer-alert")).toContainText("decoded");

    await input.setInputFiles(await pngFixture(page, 640, 480, "source.png"));
    await expect(page.locator(".resizer-notice")).toContainText(
      "1 image added",
    );
    await expect(page.locator(".resizer-summary")).toHaveText("640 × 480 px");
    await expect(page.getByLabel("Width (px)")).toHaveValue("640");
    await expect(page.getByLabel("Height (px)")).toHaveValue("480");

    await page.getByLabel("Width (px)").fill("320");
    await expect(page.getByLabel("Height (px)")).toHaveValue("240");
    await expect(page.locator(".resizer-summary")).toHaveText("320 × 240 px");

    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(
      page.getByAltText("Resized preview of source.png"),
    ).toBeVisible();
    await expect(page.locator(".resizer-status-done")).toHaveText(/Done/);
    await expect(page.locator(".resizer-stats")).toContainText("320 × 240 px");

    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download source-320x240.png" })
      .click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("source-320x240.png");
    const output = PNG.sync.read(await readFile((await download.path())!));
    expect(output.width).toBe(320);
    expect(output.height).toBe(240);
    expect(output.data[0]).toBeGreaterThanOrEqual(0);
  });

  test("percentage scaling and social presets with crop or fit", async ({
    page,
  }) => {
    await page
      .getByLabel("Add images")
      .setInputFiles(await pngFixture(page, 640, 480, "carousel.png"));
    await page.getByRole("radio", { name: /Percentage/ }).check();
    await page.getByLabel("Scale percentage").fill("50");
    await expect(page.locator(".resizer-summary")).toHaveText("320 × 240 px");

    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    await page.getByRole("radio", { name: /Presets/ }).check();
    await page.getByRole("radio", { name: /Instagram portrait/ }).check();
    await expect(page.locator(".resizer-summary")).toHaveText(
      "1,080 × 1,350 px",
    );
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download carousel-1080x1350.png" })
      .click();
    const download = await pending;
    const buffer = await readFile((await download.path())!);
    const output = PNG.sync.read(buffer);
    expect(output.width).toBe(1080);
    expect(output.height).toBe(1350);

    await page.getByRole("radio", { name: "Fit inside" }).check();
    await expect(page.locator(".resizer-summary")).toHaveText("1,080 × 810 px");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const fitPending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download carousel-1080x810.png" })
      .click();
    const fitDownload = await fitPending;
    const fitOutput = PNG.sync.read(
      await readFile((await fitDownload.path())!),
    );
    expect(fitOutput.width).toBe(1080);
    expect(fitOutput.height).toBe(810);
  });

  test("unlocked dimensions, JPEG conversion and background flattening", async ({
    page,
  }) => {
    await page
      .getByLabel("Add images")
      .setInputFiles(await pngFixture(page, 500, 500, "avatar.png", 12));
    await page.getByRole("button", { name: "Unlock aspect ratio" }).click();
    await page.getByLabel("Width (px)").fill("300");
    await page.getByLabel("Height (px)").fill("180");
    await expect(page.locator(".resizer-summary")).toHaveText("300 × 180 px");

    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.getByLabel(/^Quality/).fill("55");
    await page.getByLabel("Background").fill("#ff0000");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download avatar-300x180.jpg" })
      .click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("avatar-300x180.jpg");
    const buffer = await readFile((await download.path())!);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
    expect(await decodeDimensions(page, buffer, "image/jpeg")).toEqual({
      width: 300,
      height: 180,
    });
  });

  test("batch resizing, per-file downloads and a real ZIP archive", async ({
    page,
  }) => {
    const input = page.getByLabel("Add images");
    await input.setInputFiles([
      await pngFixture(page, 640, 480, "first.png", 200),
      await pngFixture(page, 400, 300, "second.png", 320),
    ]);
    await expect(page.locator(".resizer-item")).toHaveCount(2);
    await page.getByLabel("Width (px)").fill("320");
    await page.getByLabel("Output format").selectOption("image/webp");
    await page.getByLabel(/^Quality/).fill("70");
    await page.getByRole("button", { name: /Resize 2 images/ }).click();
    await expect(page.locator(".resizer-status-done")).toHaveCount(2);
    await expect(page.locator(".resizer-notice")).toContainText(
      "2 images processed locally",
    );

    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ZIP \(2\)/ }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("quickkit-resized-images.zip");
    const buffer = await readFile((await download.path())!);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const entries = zipEntries(buffer);
    expect(entries.map((entry) => entry.name).sort()).toEqual([
      "first-320x240.webp",
      "second-320x240.webp",
    ]);
    for (const entry of entries) {
      expect(entry.method).toBe(0);
      expect(entry.data.subarray(0, 4).toString()).toBe("RIFF");
      expect(entry.data.subarray(8, 12).toString()).toBe("WEBP");
      expect(await decodeDimensions(page, entry.data, "image/webp")).toEqual({
        width: 320,
        height: 240,
      });
    }
  });

  test("remove, reset and stale-result invalidation", async ({ page }) => {
    const input = page.getByLabel("Add images");
    await input.setInputFiles([
      await pngFixture(page, 320, 240, "keep.png"),
      await pngFixture(page, 320, 240, "drop.png", 90),
    ]);
    await page.getByRole("button", { name: "Remove drop.png" }).click();
    await expect(page.locator(".resizer-item")).toHaveCount(1);
    await expect(
      page.getByAltText("Original preview of keep.png"),
    ).toBeVisible();

    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download keep-320x240.png" }),
    ).toBeVisible();

    await page.getByLabel("Width (px)").fill("160");
    await expect(
      page.getByRole("link", { name: "Download keep-320x240.png" }),
    ).toHaveCount(0);
    await expect(page.locator(".resizer-status-ready")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download ZIP/ }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator(".resizer-item")).toHaveCount(0);
    await expect(page.getByAltText(/preview of/)).toHaveCount(0);
    await expect(page.getByLabel("Width (px)")).toHaveValue("1920");
    await expect(page.getByLabel("Height (px)")).toHaveValue("1080");
    await expect(
      page.getByRole("button", { name: /Resize images/ }),
    ).toBeDisabled();
  });

  test("rejects invalid target dimensions without touching the queue", async ({
    page,
  }) => {
    await page
      .getByLabel("Add images")
      .setInputFiles(await pngFixture(page, 640, 480, "guard.png"));
    await page.getByLabel("Width (px)").fill("9000");
    await expect(page.locator(".resizer-plan-error")).toContainText("8,192");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-alert")).toContainText("8,192");
    await expect(page.locator(".resizer-status-ready")).toBeVisible();
    await expect(page.locator(".resizer-status-done")).toHaveCount(0);
  });
});
