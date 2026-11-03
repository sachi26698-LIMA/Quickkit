import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/** Quadrant fixture: TL red, TR green, BL blue, BR yellow. */
async function quadrants(
  page: Page,
  width = 800,
  height = 600,
): Promise<Upload> {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const halfW = w / 2;
      const halfH = h / 2;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, halfW, halfH);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(halfW, 0, halfW, halfH);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(0, halfH, halfW, halfH);
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(halfW, halfH, halfW, halfH);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height] as const,
  );
  return {
    name: "quadrants.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Transparent PNG with a solid centre square. */
async function transparent(page: Page): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 200, 200);
    ctx.fillStyle = "#123456";
    ctx.fillRect(50, 50, 100, 100);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "alpha.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

function pixelAt(png: PNG, x: number, y: number) {
  const index = (png.width * y + x) * 4;
  return {
    r: png.data[index],
    g: png.data[index + 1],
    b: png.data[index + 2],
    a: png.data[index + 3],
  };
}

const near = (value: number, expected: number, tolerance = 24) =>
  Math.abs(value - expected) <= tolerance;

async function downloadPng(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: `Download ${name}` }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(name);
  return PNG.sync.read(await readFile((await download.path())!));
}

async function addImage(page: Page, upload: Upload) {
  await page.getByLabel("Add images").setInputFiles(upload);
  await expect(page.locator(".resizer-item")).toHaveCount(1);
}

async function setExactSize(page: Page, width: number, height: number) {
  await page.getByRole("tab", { name: /Resize/ }).click();
  const unlock = page.getByRole("button", { name: "Unlock aspect ratio" });
  if (await unlock.count()) await unlock.click();
  await page.getByLabel("Width (px)").fill(String(width));
  await page.getByLabel("Height (px)").fill(String(height));
  await expect(page.locator(".resizer-summary")).toHaveText(
    `${width.toLocaleString("en-US")} × ${height.toLocaleString("en-US")} px`,
  );
}

test.describe("image resizer editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-resizer");
  });

  test("rotates 90°, 180° and 270° and flips the exported pixels", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page));
    await setExactSize(page, 800, 600);
    await page.getByLabel("Output format").selectOption("image/png");

    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: "90°", exact: true }).click();
    await expect(page.locator(".resizer-stats")).toContainText("600 × 800 px");
    await page.getByRole("tab", { name: /Resize/ }).click();
    await page.getByRole("button", { name: "Match edited size" }).click();
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    const rotated = await downloadPng(page, "quadrants-600x800.png");
    expect(rotated.width).toBe(600);
    expect(rotated.height).toBe(800);
    // 90° clockwise: bottom-left (blue) becomes top-left, top-left (red) top-right.
    expect(pixelAt(rotated, 40, 40)).toEqual(
      expect.objectContaining({ r: expect.any(Number) }),
    );
    const topLeft = pixelAt(rotated, 40, 40);
    expect(near(topLeft.b, 255) && near(topLeft.r, 0)).toBe(true);
    const topRight = pixelAt(rotated, 560, 40);
    expect(near(topRight.r, 255) && near(topRight.g, 0)).toBe(true);
    const bottomLeft = pixelAt(rotated, 40, 760);
    expect(near(bottomLeft.r, 255) && near(bottomLeft.g, 255)).toBe(true);
    const bottomRight = pixelAt(rotated, 560, 760);
    expect(near(bottomRight.g, 255) && near(bottomRight.r, 0)).toBe(true);

    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: "180°", exact: true }).click();
    await page.getByRole("tab", { name: /Resize/ }).click();
    await page.getByRole("button", { name: "Match edited size" }).click();
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const flipped = await downloadPng(page, "quadrants-800x600.png");
    // 180°: bottom-right (yellow) moves to top-left.
    expect(near(pixelAt(flipped, 40, 40).r, 255)).toBe(true);
    expect(near(pixelAt(flipped, 40, 40).g, 255)).toBe(true);

    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: "Flip horizontally" }).click();
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const mirrored = await downloadPng(page, "quadrants-800x600.png");
    // 180° + horizontal flip: bottom-left blue moves to top-left.
    expect(near(pixelAt(mirrored, 40, 40).b, 255)).toBe(true);
  });

  test("crops with a fixed ratio and exports only the crop", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page));
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: "Crop on preview" }).click();
    await page.getByLabel("Crop aspect ratio").selectOption("1:1");
    await expect(page.locator("#resizer-crop-width")).toHaveValue("600");
    await expect(page.locator("#resizer-crop-height")).toHaveValue("600");
    await expect(page.locator("#resizer-crop-x")).toHaveValue("100");
    await expect(page.locator(".resizer-crop-box")).toBeVisible();

    // Drag the crop box 300 px to the right, then switch to a free crop.
    const box = page.locator(".resizer-crop-box");
    const start = await box.boundingBox();
    const stage = await page.locator(".resizer-preview-stage").boundingBox();
    expect(start && stage).toBeTruthy();
    await page.mouse.move(
      start!.x + start!.width / 2,
      start!.y + start!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      start!.x + start!.width / 2 + (stage!.width / 800) * 150,
      start!.y + start!.height / 2,
      { steps: 6 },
    );
    await page.mouse.up();
    const movedX = Number(await page.locator("#resizer-crop-x").inputValue());
    expect(movedX).toBeGreaterThan(100);

    // Keyboard nudging keeps the crop inside the image.
    await box.focus();
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    const nudgedX = Number(await page.locator("#resizer-crop-x").inputValue());
    expect(nudgedX).toBeGreaterThanOrEqual(movedX);

    await page.getByLabel("Crop aspect ratio").selectOption("free");
    await page.locator("#resizer-crop-x").fill("400");
    await page.locator("#resizer-crop-y").fill("0");
    await page.locator("#resizer-crop-width").fill("400");
    await page.locator("#resizer-crop-height").fill("600");
    await page.getByRole("button", { name: "Close crop tool" }).click();
    await setExactSize(page, 400, 600);
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    const cropped = await downloadPng(page, "quadrants-400x600.png");
    expect(cropped.width).toBe(400);
    // Right half: green on top, yellow underneath, no red or blue.
    const top = pixelAt(cropped, 200, 60);
    expect(near(top.g, 255) && near(top.r, 0)).toBe(true);
    const bottom = pixelAt(cropped, 200, 540);
    expect(near(bottom.r, 255) && near(bottom.g, 255)).toBe(true);
  });

  test("applies grayscale, brightness and contrast to the output", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page));
    await setExactSize(page, 200, 200);
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByRole("button", { name: "Grayscale", exact: true }).click();
    await page.getByLabel("Brightness").fill("60");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    const grey = await downloadPng(page, "quadrants-200x200.png");
    const pixel = pixelAt(grey, 50, 50);
    expect(Math.abs(pixel.r - pixel.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(pixel.g - pixel.b)).toBeLessThanOrEqual(1);
    expect(pixel.r).toBeLessThan(45);
    expect(pixel.r).toBeGreaterThan(15);

    // Undo brightness and grayscale, then confirm the colour returns.
    await page.getByRole("button", { name: /^Undo/ }).click();
    await page.getByRole("button", { name: /^Undo/ }).click();
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const colour = await downloadPng(page, "quadrants-200x200.png");
    const red = pixelAt(colour, 50, 50);
    expect(red.r).toBeGreaterThan(red.g + 40);
  });

  test("undo and redo step through edits and reset clears them", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page));
    await page.getByRole("tab", { name: /Edit/ }).click();
    const undo = page.getByRole("button", { name: /^Undo/ });
    const redo = page.getByRole("button", { name: /^Redo/ });
    await expect(undo).toBeDisabled();
    await page.getByRole("button", { name: "90°", exact: true }).click();
    await expect(undo).toBeEnabled();
    await page.getByRole("button", { name: "Sepia" }).click();
    await expect(page.locator(".resizer-stats")).toContainText("sepia");
    await undo.click();
    await undo.click();
    await expect(page.locator(".resizer-stats")).toContainText("untouched");
    await expect(undo).toBeDisabled();
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(page.locator(".resizer-stats")).toContainText("90°");
    await page.getByRole("button", { name: "Reset edits" }).click();
    await expect(page.locator(".resizer-stats")).toContainText("untouched");

    // Keyboard shortcut redo after an undo.
    await page.getByRole("button", { name: "45°" }).count();
    await page.getByRole("button", { name: "Flip vertically" }).click();
    await undo.click();
    await page.keyboard.press("Control+Shift+Z");
    await expect(page.locator(".resizer-stats")).toContainText("flipped V");
  });

  test("longest side, shortest side and print size drive the output", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page));
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("radio", { name: /Longest side/ }).check();
    await page.getByLabel("Longest side (px)").fill("400");
    await expect(page.locator(".resizer-summary")).toHaveText("400 × 300 px");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const longest = await downloadPng(page, "quadrants-400x300.png");
    expect([longest.width, longest.height]).toEqual([400, 300]);

    await page.getByRole("radio", { name: /Shortest side/ }).check();
    await page.getByLabel("Shortest side (px)").fill("150");
    await expect(page.locator(".resizer-summary")).toHaveText("200 × 150 px");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const shortest = await downloadPng(page, "quadrants-200x150.png");
    expect([shortest.width, shortest.height]).toEqual([200, 150]);

    await page.getByText(/DPI & print size/).click();
    await page.getByLabel("DPI (print resolution)").fill("300");
    await page.getByLabel("Print width (cm)").fill("2.54");
    await page.getByLabel("Print height (cm)").fill("2.54");
    await page
      .getByRole("button", { name: "Use print size as pixels" })
      .click();
    await expect(page.locator(".resizer-summary")).toHaveText("300 × 300 px");
    await expect(page.locator(".resizer-notice")).toContainText("300 DPI");
  });

  test("per-image overrides, suffix naming and ZIP entries", async ({
    page,
  }) => {
    const input = page.getByLabel("Add images");
    await input.setInputFiles([
      await quadrants(page, 400, 300),
      await quadrants(page, 200, 200),
    ]);
    await expect(page.locator(".resizer-item")).toHaveCount(2);
    await setExactSize(page, 200, 200);

    await page
      .getByRole("button", { name: /Custom settings for quadrants.png/ })
      .first()
      .click();
    await page
      .getByLabel(/Custom size and format/)
      .first()
      .check();
    await page.getByLabel("Custom width (px)").fill("100");
    await page
      .getByRole("button", { name: "Custom settings for quadrants.png" })
      .nth(1)
      .click();
    await page
      .getByLabel(/Custom size and format/)
      .nth(1)
      .check();
    await page.getByLabel("Suffix for this image").nth(1).fill("square");

    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 2 images/ }).click();
    await expect(page.locator(".resizer-status-done")).toHaveCount(2);

    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ZIP \(2\)/ }).click();
    const download = await pending;
    const buffer = await readFile((await download.path())!);
    const text = buffer.toString("latin1");
    expect(text).toContain("quadrants-100x75.png");
    expect(text).toContain("quadrants-square-200x200.png");
  });

  test("split and side-by-side comparisons appear after processing", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page, 400, 300));
    await page.getByLabel("Output format").selectOption("image/png");
    await expect(page.getByRole("button", { name: /Split/ })).toBeDisabled();
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();

    await page.getByRole("button", { name: /Split/ }).click();
    await expect(page.locator(".resizer-split-stage")).toBeVisible();
    await expect(page.locator(".resizer-split-label")).toHaveCount(2);
    await page.getByLabel("Comparison position").fill("25");
    await expect(page.locator(".resizer-split-top")).toHaveCSS(
      "clip-path",
      /inset\(0px 0px 0px 25%\)/,
    );
    await page.getByRole("button", { name: /Side by side/ }).click();
    await expect(page.locator(".resizer-compare figure")).toHaveCount(2);
    await expect(page.locator(".resizer-compare")).toContainText("Original");
    await expect(page.locator(".resizer-compare")).toContainText("Result");
    await page.getByRole("button", { name: "Single", exact: true }).click();
    await expect(page.locator(".resizer-compare")).toHaveCount(0);
  });

  test("zoom controls and fit-to-screen change the preview scale", async ({
    page,
  }) => {
    await addImage(page, await quadrants(page, 300, 300));
    const image = page.locator(".resizer-main-image");
    await expect(page.locator(".resizer-zoom-value")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.locator(".resizer-zoom-value")).toHaveText("125%");
    await expect(image).toHaveCSS("width", /px/);
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Fit to screen" }).click();
    await expect(page.locator(".resizer-zoom-value")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.locator(".resizer-zoom-value")).toHaveText("75%");
  });

  test("transparency survives WebP but flattens for JPEG", async ({ page }) => {
    await addImage(page, await transparent(page));
    await setExactSize(page, 200, 200);
    await page.getByLabel("Quality").fill("90");

    await page.getByLabel("Output format").selectOption("image/webp");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download alpha-200x200.webp" })
      .click();
    const webp = await readFile((await (await pending).path())!);
    expect(webp.subarray(0, 4).toString()).toBe("RIFF");
    const hasAlpha = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/webp;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(5, 5, 1, 1).data[3];
    }, webp.toString("base64"));
    expect(hasAlpha).toBe(0);

    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.getByLabel("Background").fill("#ff0000");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const jpegPending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download alpha-200x200.jpg" })
      .click();
    const jpeg = await readFile((await (await jpegPending).path())!);
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
    const cornerColour = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      return Array.from(ctx.getImageData(2, 2, 1, 1).data);
    }, jpeg.toString("base64"));
    expect(cornerColour[0]).toBeGreaterThan(230);
    expect(cornerColour[1]).toBeLessThan(40);
  });

  test("metadata panel reports EXIF and outputs are stripped", async ({
    page,
  }) => {
    // Build a JPEG carrying an EXIF APP1 block with an orientation tag.
    const exifBase64 = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(0, 0, 120, 80);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const binary = atob(dataUrl.split(",")[1]);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
      // TIFF header + one orientation entry.
      const tiff = new Uint8Array(26);
      tiff[0] = 0x49;
      tiff[1] = 0x49;
      const view = new DataView(tiff.buffer);
      view.setUint16(2, 42, true);
      view.setUint32(4, 8, true);
      view.setUint16(8, 1, true);
      view.setUint16(10, 0x0112, true);
      view.setUint16(12, 3, true);
      view.setUint32(14, 1, true);
      view.setUint16(18, 6, true);
      const payload = new Uint8Array(6 + tiff.length);
      payload.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0);
      payload.set(tiff, 6);
      const length = payload.length + 2;
      const merged = new Uint8Array(bytes.length + payload.length + 4);
      merged.set(bytes.subarray(0, 2), 0);
      merged.set([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff], 2);
      merged.set(payload, 6);
      merged.set(bytes.subarray(2), 6 + payload.length);
      let binaryString = "";
      for (const byte of merged) binaryString += String.fromCharCode(byte);
      return btoa(binaryString);
    });

    await page.getByLabel("Add images").setInputFiles({
      name: "exif-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(exifBase64, "base64"),
    });
    await expect(page.locator(".resizer-item")).toHaveCount(1);
    await page.getByText(/Metadata & privacy/).click();
    const panel = page.locator(".resizer-metadata-body");
    await expect(panel).toContainText("EXIF metadata present");
    await expect(panel).toContainText("stripped automatically");
    await expect(panel).toContainText("Auto-rotate using EXIF orientation");

    await setExactSize(page, 120, 80);
    await page.getByLabel("Output format").selectOption("image/png");
    await page.getByRole("button", { name: /Resize 1 image/ }).click();
    await expect(page.locator(".resizer-status-done")).toBeVisible();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download exif-photo-120x80.png" })
      .click();
    const output = await readFile((await (await pending).path())!);
    expect(output.includes(Buffer.from("Exif"))).toBe(false);
  });

  test("custom presets can be saved, used and deleted", async ({ page }) => {
    await addImage(page, await quadrants(page, 400, 300));
    await page.getByRole("radio", { name: /Presets/ }).check();
    await page.getByRole("button", { name: "+ Save current size" }).click();
    await expect(page.locator(".resizer-notice")).toContainText(
      "Preset 400 × 300",
    );
    const custom = page.getByRole("radio", { name: /400 × 300/ });
    await expect(custom).toBeChecked();
    await expect(page.locator(".resizer-summary")).toHaveText("400 × 300 px");
    await page.getByRole("button", { name: /Delete preset/ }).click();
    await expect(page.getByRole("radio", { name: /400 × 300/ })).toHaveCount(0);
  });

  test("replacing a file keeps the queue and resets its crop", async ({
    page,
  }) => {
    const input = page.getByLabel("Add images");
    await input.setInputFiles(await quadrants(page, 400, 300));
    await page.getByRole("tab", { name: /Edit/ }).click();
    await page.getByLabel("Crop aspect ratio").selectOption("1:1");
    await expect(page.locator("#resizer-crop-width")).toHaveValue("300");

    const replacement = await quadrants(page, 200, 100);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Replace quadrants.png" }).click();
    (await chooser).setFiles(replacement);
    await expect(page.locator(".resizer-notice")).toContainText("replaced");
    await expect(page.locator(".resizer-item")).toHaveCount(1);
    await expect(page.locator(".resizer-item-body span").first()).toContainText(
      "200 × 100 px",
    );
    await expect(page.locator("#resizer-crop-width")).toHaveValue("200");
  });
});

test("populated editor stays WCAG 2.2 AA clean", async ({ page }) => {
  await page.goto("/tools/image-resizer");
  await addImage(page, await quadrants(page, 640, 480));
  await page.getByRole("tab", { name: /Edit/ }).click();
  await page.getByLabel("Crop aspect ratio").selectOption("1:1");
  await page.getByRole("button", { name: /Crop on preview/ }).click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
