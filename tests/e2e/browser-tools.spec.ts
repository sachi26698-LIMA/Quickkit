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
  await page
    .getByRole("button", { name: "Compress image", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("decoded");
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
