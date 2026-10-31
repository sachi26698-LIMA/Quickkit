import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";
async function pngFixture(page: Page) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext("2d")!;
    for (let y = 20; y < 480; y += 8)
      for (let x = 20; x < 640; x += 8) {
        ctx.fillStyle = `rgb(${x % 255},${y % 255},${(x + y) % 255})`;
        ctx.fillRect(x, y, 8, 8);
      }
    return c.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "source.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}
test("QR validates input, produces decodable PNG and resets", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("Enter text");
  await page.getByLabel("Text or URL").fill("😀".repeat(501));
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("2,000");
  const text = "https://example.com/hello?text=नमस्ते";
  await page.getByLabel("Text or URL").fill(text);
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.getByAltText("Generated QR code preview")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PNG", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("quickkit-qr-code.png");
  const png = PNG.sync.read(await readFile((await download.path())!));
  expect(png.width).toBe(768);
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(text);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByAltText("Generated QR code preview")).toHaveCount(0);
});
test("image validates empty, unsupported, oversized and corrupt inputs", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  await page
    .getByRole("button", { name: "Compress image", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("Choose an image");
  for (const file of [
    { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("test") },
    {
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(16 * 1024 * 1024),
    },
  ]) {
    await page
      .getByLabel("Choose an image", { exact: true })
      .setInputFiles(file);
    await expect(page.locator(".status.error")).toBeVisible();
  }
  await page.getByLabel("Choose an image", { exact: true }).setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken"),
  });
  await expect(page.locator(".status.error")).toContainText("decoded");
  await expect(page.getByAltText("Original image preview")).toHaveCount(0);
});
test("image compression downloads real WebP, JPEG and PNG without resizing", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  await page
    .getByLabel("Choose an image", { exact: true })
    .setInputFiles(await pngFixture(page));
  for (const [format, extension] of [
    ["image/webp", "webp"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
  ]) {
    await page
      .getByLabel("Output format", { exact: true })
      .selectOption(format);
    await page
      .getByRole("button", { name: "Compress image", exact: true })
      .click();
    await expect(page.getByAltText("Compressed image preview")).toBeVisible();
    await expect(
      page.getByText("640 × 480 pixels · unchanged", { exact: false }),
    ).toBeVisible();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download image", exact: true })
      .click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(
      `quickkit-compressed.${extension}`,
    );
    const data = await readFile((await download.path())!);
    expect(data.length).toBeGreaterThan(100);
    const pixel = await page
      .getByAltText("Compressed image preview")
      .evaluate(async (el) => {
        const image = el as HTMLImageElement;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });
    if (format === "image/jpeg") expect(pixel).toEqual([255, 255, 255, 255]);
    else expect(pixel[3]).toBe(0);
    if (format === "image/png") expect(PNG.sync.read(data).width).toBe(640);
    if (format === "image/webp")
      expect(data.subarray(8, 12).toString()).toBe("WEBP");
  }
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByAltText("Original image preview")).toHaveCount(0);
  await expect(page.getByAltText("Compressed image preview")).toHaveCount(0);
});

test("JPEG and WebP inputs pass preflight and preserve pixel dimensions", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  for (const mimeType of ["image/jpeg", "image/webp"]) {
    const bytes = await page.evaluate((type) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#6657e8";
      ctx.fillRect(0, 0, 320, 240);
      return c.toDataURL(type).split(",")[1];
    }, mimeType);
    await page.getByLabel("Choose an image", { exact: true }).setInputFiles({
      name: mimeType === "image/jpeg" ? "sample.jpg" : "sample.webp",
      mimeType,
      buffer: Buffer.from(bytes, "base64"),
    });
    await expect(page.getByAltText("Original image preview")).toBeVisible();
    await page
      .getByRole("button", { name: "Compress image", exact: true })
      .click();
    await expect(page.getByAltText("Compressed image preview")).toBeVisible();
    await expect(
      page.getByText("320 × 240 pixels · unchanged", { exact: false }),
    ).toBeVisible();
  }
});

test("oversized decoded dimensions are rejected before original preview allocation", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(100000, 16);
  bytes.writeUInt32BE(100000, 20);
  await page.getByLabel("Choose an image", { exact: true }).setInputFiles({
    name: "too-many-pixels.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await expect(page.locator(".status.error")).toContainText("24 megapixels");
  await expect(page.getByAltText("Original image preview")).toHaveCount(0);
});

test("image reset releases all object URLs and discards a pending encode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const urls = new Set<string>();
    Object.defineProperty(window, "quickkitTestUrls", { value: urls });
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    URL.createObjectURL = (object) => {
      const url = create(object);
      urls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      revoke(url);
    };
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      encode.call(
        this,
        (blob) => setTimeout(() => callback(blob), 120),
        type,
        quality,
      );
    };
  });
  await page.goto("/tools/image-compressor");
  await page
    .getByLabel("Choose an image", { exact: true })
    .setInputFiles(await pngFixture(page));
  await expect(page.getByAltText("Original image preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Compress image", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(250);
  await expect(
    page.getByRole("link", { name: "Download image", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByAltText("Original image preview")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { quickkitTestUrls: Set<string> })
          .quickkitTestUrls.size,
    ),
  ).toBe(0);
});
