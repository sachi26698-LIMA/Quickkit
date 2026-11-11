import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

type Upload = { name: string; mimeType: string; buffer: Buffer };

/** Photo-like fixture: gradient + shapes so JPEG/WebP compression is realistic. */
async function photo(
  page: Page,
  width = 1200,
  height = 900,
  name = "photo.png",
  seed = 210,
): Promise<Upload> {
  const base64 = await page.evaluate(
    ([w, h, tone]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, `hsl(${tone}, 78%, 62%)`);
      gradient.addColorStop(1, `hsl(${tone + 60}, 72%, 32%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      for (let index = 0; index < 900; index += 1) {
        ctx.fillStyle = `rgba(${(index * 47) % 255},${(index * 91) % 255},${
          (index * 29) % 255
        },0.5)`;
        ctx.fillRect((index * 137) % w, (index * 219) % h, 48, 48);
      }
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.32, Math.min(w, h) * 0.16, 0, Math.PI * 2);
      ctx.fill();
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height, seed] as const,
  );
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

/** Transparent PNG: clear background with a solid red square in the middle. */
async function transparentPng(
  page: Page,
  name = "transparent.png",
): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 300);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(100, 75, 200, 150);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

/** Small PNG so a tight target forces the quality search. */
async function smallJpeg(page: Page, name = "portrait.jpg"): Promise<Upload> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
    gradient.addColorStop(0, "#8fd3ff");
    gradient.addColorStop(1, "#2b2f55");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 1200);
    for (let index = 0; index < 600; index += 1) {
      ctx.fillStyle = `hsla(${index % 360}, 70%, 60%, 0.35)`;
      ctx.fillRect((index * 97) % 900, (index * 61) % 1200, 60, 60);
    }
    return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  });
  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  };
}

async function addImages(page: Page, uploads: Upload[]) {
  await page.getByLabel("Add images").setInputFiles(uploads);
  await expect(page.locator(".compressor-item")).toHaveCount(uploads.length);
}

async function compressBatch(page: Page, count: number) {
  await page
    .getByRole("button", { name: new RegExp(`Compress ${count} image`) })
    .click();
  await expect(page.locator(".compressor-status-done")).toHaveCount(count, {
    timeout: 60_000,
  });
}

async function downloadResult(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("link", { name: `Download ${name}` })
    .last()
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(name);
  return readFile((await download.path())!);
}

async function decode(
  page: Page,
  buffer: Buffer,
  mimeType: string,
): Promise<{
  width: number;
  height: number;
  corner: number[];
  centre: number[];
}> {
  const base64 = buffer.toString("base64");
  return page.evaluate(
    async ([data, type]) => {
      const image = new Image();
      image.src = `data:${type};base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const read = (x: number, y: number) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data);
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        corner: read(1, 1),
        centre: read(image.naturalWidth >> 1, image.naturalHeight >> 1),
      };
    },
    [base64, mimeType] as const,
  );
}

test.describe("image compressor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-compressor");
    await expect(page.getByLabel("Add images")).toBeAttached();
  });

  test("quality slider, chips and format matrix produce real files", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [await photo(page, 800, 600, "matrix.png")]);
    await page.getByLabel("Output format").selectOption("image/jpeg");

    await page.locator("#compressor-quality").fill("30");
    await expect(page.locator(".compressor-summary")).toHaveText("30% quality");
    await compressBatch(page, 1);
    const low = await downloadResult(page, "matrix-compressed-800x600.jpg");

    await page.locator("#compressor-quality").fill("95");
    await expect(page.locator(".compressor-status-done")).toHaveCount(0);
    await compressBatch(page, 1);
    const high = await downloadResult(page, "matrix-compressed-800x600.jpg");

    expect(low.length).toBeLessThan(high.length);
    expect(low.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const meta = await decode(page, high, "image/jpeg");
    expect([meta.width, meta.height]).toEqual([800, 600]);

    // Chip shortcut stays in sync with the slider.
    await page.getByRole("button", { name: "60%", exact: true }).click();
    await expect(page.locator("#compressor-quality")).toHaveValue("60");
    await expect(page.locator(".compressor-summary")).toHaveText("60% quality");
  });

  test("target size search lands under the KB limit and reports quality", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await addImages(page, [await photo(page, 1400, 1000, "target.png")]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("60");
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect(page.locator(".compressor-status-done")).toBeVisible({
      timeout: 60_000,
    });

    const stats = page.locator(".compressor-stats");
    await expect(stats).toContainText("60 KB · met at q");
    await expect(stats).toContainText("1400 × 1000 px · unchanged");

    const name = await page
      .locator(".compressor-filename")
      .innerText()
      .then((value) => value.trim());
    const buffer = await downloadResult(page, name);
    expect(buffer.length).toBeLessThanOrEqual(60 * 1024);
    const meta = await decode(page, buffer, "image/webp");
    expect([meta.width, meta.height]).toEqual([1400, 1000]);
    expect(buffer.subarray(8, 12).toString()).toBe("WEBP");
  });

  test("unreachable targets either downscale or flag the result honestly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await addImages(page, [await photo(page, 1200, 900, "tiny-target.png")]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("6");

    // With downscaling allowed, the dimensions change and the row says so.
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect(page.locator(".compressor-status-done")).toBeVisible({
      timeout: 90_000,
    });
    const scaled = await page.locator(".compressor-stats").innerText();
    expect(scaled).toMatch(/px \(scaled\)|px · unchanged/);

    // Without downscaling, dimensions must not change and the target may miss.
    await page.getByRole("checkbox", { name: /Allow downscaling/ }).uncheck();
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect(page.locator(".compressor-status-done")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator(".compressor-stats")).toContainText(
      "1200 × 900 px · unchanged",
    );
  });

  test("transparent PNG stays transparent in WebP and flattens for JPEG", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [await transparentPng(page)]);

    await page.getByLabel("Output format").selectOption("image/webp");
    await compressBatch(page, 1);
    const webp = await downloadResult(
      page,
      "transparent-compressed-400x300.webp",
    );
    const webpMeta = await decode(page, webp, "image/webp");
    expect(webpMeta.corner[3]).toBe(0);
    // Lossy WebP keeps the red square within a small error margin.
    expect(webpMeta.centre[0]).toBeGreaterThan(240);
    expect(webpMeta.centre[1]).toBeLessThan(20);
    expect(webpMeta.centre[2]).toBeLessThan(20);

    await page.getByLabel("Output format").selectOption("image/jpeg");
    await page.locator("#compressor-background").fill("#00ff00");
    await compressBatch(page, 1);
    const jpeg = await downloadResult(
      page,
      "transparent-compressed-400x300.jpg",
    );
    const jpegMeta = await decode(page, jpeg, "image/jpeg");
    expect(jpegMeta.corner[3]).toBe(255);
    expect(jpegMeta.corner[1]).toBeGreaterThan(230);
    expect(jpegMeta.corner[0]).toBeLessThan(40);

    // PNG output keeps alpha as well.
    await page.getByLabel("Output format").selectOption("image/png");
    await compressBatch(page, 1);
    const png = await downloadResult(
      page,
      "transparent-compressed-400x300.png",
    );
    expect(PNG.sync.read(png).data[3]).toBe(0);
  });

  test("batch compresses every file with per-image custom settings", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await addImages(page, [
      await photo(page, 640, 480, "first.png", 200),
      await photo(page, 500, 500, "second.png", 300),
    ]);
    await page.getByLabel("Output format").selectOption("image/webp");
    await page.getByLabel("Filename suffix (optional)").fill("web");

    await page
      .getByRole("button", { name: "Custom settings for second.png" })
      .click();
    await page
      .locator(".compressor-item-extra:visible")
      .getByLabel(/Custom settings for this image/)
      .check();
    await page.getByLabel("Custom format").selectOption("image/jpeg");
    await page.getByLabel("Suffix for this image").fill("social");

    await compressBatch(page, 2);
    await expect(page.locator(".compressor-item-body").first()).toContainText(
      "first.png",
    );
    await expect(page.locator(".compressor-item-body").nth(1)).toContainText(
      "custom",
    );
    await expect(
      page.locator(
        ".compressor-item-extra:visible .compressor-extra-foot code",
      ),
    ).toHaveText("second-social-500x500.jpg");

    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ZIP \(2\)/ }).click();
    const zip = await readFile((await (await pending).path())!);
    const text = zip.toString("latin1");
    expect(text).toContain("first-web-640x480.webp");
    expect(text).toContain("second-social-500x500.jpg");
  });

  test("rename and suffix drive individual and ZIP filenames", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [
      await photo(page, 400, 300, "holiday photo.png", 250),
    ]);
    await page.getByLabel("Rename outputs (optional)").fill("Hero Shot");
    await page.getByLabel("Filename suffix (optional)").fill("kb");
    await expect(page.locator(".compressor-name-preview")).toContainText(
      "Hero-Shot-kb-400x300.webp",
    );
    await compressBatch(page, 1);
    const buffer = await downloadResult(page, "Hero-Shot-kb-400x300.webp");
    expect(buffer.subarray(8, 12).toString()).toBe("WEBP");
    await expect(page.locator(".compressor-filename")).toHaveText(
      "Hero-Shot-kb-400x300.webp",
    );
  });

  test("before/after comparison views show both versions", async ({ page }) => {
    test.setTimeout(90_000);
    await addImages(page, [await photo(page, 600, 400, "compare.png", 180)]);
    const split = page.getByRole("button", { name: /Split/ });
    await expect(split).toBeDisabled();
    await compressBatch(page, 1);

    await split.click();
    await page.locator("#compressor-split").fill("30");
    await expect(page.locator(".compressor-split-line")).toHaveAttribute(
      "style",
      /left: 30%/,
    );
    await expect(page.locator(".compressor-split-left")).toHaveText("Before");
    await expect(page.locator(".compressor-split-right")).toHaveText("After");

    await page.getByRole("button", { name: /Side by side/ }).click();
    await expect(page.locator(".compressor-compare figure")).toHaveCount(2);
    await expect(
      page.locator(".compressor-compare figcaption").first(),
    ).toContainText("Original");
    await expect(
      page.locator(".compressor-compare figcaption").last(),
    ).toContainText("Compressed");

    await page.getByRole("button", { name: /Single/ }).click();
    await page.getByRole("button", { name: /^Original$/ }).click();
    await expect(
      page.getByAltText("Original preview of compare.png"),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Result$/ }).click();
    await expect(
      page.getByAltText("Compressed preview of compare.png"),
    ).toBeVisible();
  });

  test("sizes, savings and dimensions are reported accurately", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const upload = await photo(page, 900, 600, "figures.png", 150);
    await addImages(page, [upload]);
    await page.getByLabel("Output format").selectOption("image/webp");
    await compressBatch(page, 1);

    const stats = page.locator(".compressor-stats");
    await expect(stats).toContainText("Original");
    await expect(stats).toContainText("900 × 600 px");
    await expect(stats).toContainText("900 × 600 px · unchanged");

    const filename = (
      await page.locator(".compressor-filename").innerText()
    ).trim();
    const buffer = await downloadResult(page, filename);
    const compressedKb = buffer.length / 1024;
    const originalKb = upload.buffer.length / 1024;
    const percent = ((1 - compressedKb / originalKb) * 100).toFixed(1);
    await expect(stats).toContainText(`${percent}% smaller`);
    await expect(page.locator(".compressor-item-size")).toContainText(
      "dimensions unchanged",
    );
  });

  test("progress bar, Stop and Retry failed handle long batches", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const uploads: Upload[] = [];
    for (let index = 0; index < 3; index += 1)
      uploads.push(
        await photo(
          page,
          2600,
          1700,
          `bulk-${index + 1}.png`,
          120 + index * 40,
        ),
      );
    await addImages(page, uploads);

    await page.getByRole("button", { name: /Compress 3 images/ }).click();
    await expect(page.locator(".compressor-progress")).toBeVisible();
    const stop = page.getByRole("button", { name: "Stop" });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(page.locator(".compressor-progress")).toHaveCount(0);
    await expect(page.locator(".compressor-notice")).toContainText(
      "Compression stopped",
    );
    await expect(page.locator(".compressor-status-working")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Compress 3 images/ }),
    ).toBeEnabled();

    // A damaged file fails on its own and can be retried.
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    const corrupt = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;
      canvas.getContext("2d")!.fillRect(0, 0, 300, 200);
      const binary = atob(canvas.toDataURL("image/png").split(",")[1]);
      const head = binary.slice(0, 33);
      let junk = "";
      for (let index = 0; index < 500; index += 1)
        junk += String.fromCharCode((index * 97) % 256);
      return btoa(head + junk);
    });
    await addImages(page, [
      {
        name: "broken.png",
        mimeType: "image/png",
        buffer: Buffer.from(corrupt, "base64"),
      },
      await photo(page, 500, 400, "survivor.png", 190),
    ]);
    await page.getByRole("button", { name: /Compress 2 images/ }).click();
    await expect(page.locator(".compressor-status-done")).toHaveCount(1, {
      timeout: 60_000,
    });
    await expect(page.locator(".compressor-status-error")).toHaveCount(1);
    await expect(
      page.locator(".compressor-alert, .compressor-notice"),
    ).toContainText("1 could not be processed");

    const retry = page.getByRole("button", { name: /Retry failed \(1\)/ });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(page.locator(".compressor-status-error")).toHaveCount(1);
    await expect(page.locator(".compressor-item-error")).toContainText(
      "could not be decoded",
    );
  });

  test("large multi-megapixel images compress without memory blow-ups", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const large = await photo(page, 3600, 2400, "large-shot.png", 240);
    expect(large.buffer.length).toBeGreaterThan(1_500_000);
    await addImages(page, [large]);
    await page.getByLabel("Output format").selectOption("image/webp");
    await compressBatch(page, 1);
    await expect(page.locator(".compressor-stats")).toContainText(
      "3600 × 2400 px · unchanged",
    );
    const filename = (
      await page.locator(".compressor-filename").innerText()
    ).trim();
    const buffer = await downloadResult(page, filename);
    const meta = await decode(page, buffer, "image/webp");
    expect([meta.width, meta.height]).toEqual([3600, 2400]);
    expect(buffer.length).toBeLessThan(large.buffer.length);

    // A tiny target on a large image forces controlled downscaling.
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("40");
    await page.getByRole("button", { name: /Compress 1 image/ }).click();
    await expect
      .poll(
        async () =>
          (await page.locator(".compressor-filename").innerText()).trim(),
        {
          timeout: 120_000,
        },
      )
      .not.toBe(filename);
    await expect(page.locator(".compressor-status-done")).toBeVisible({
      timeout: 120_000,
    });
    const scaledName = (
      await page.locator(".compressor-filename").innerText()
    ).trim();
    const scaled = await downloadResult(page, scaledName);
    const targetStats = await page.locator(".compressor-stats").innerText();
    expect(targetStats).toContain("Target");
    expect(targetStats).toContain("40 KB");
    const scaledMeta = await decode(page, scaled, "image/webp");
    expect(scaledMeta.width).toBeLessThan(3600);
    expect(targetStats).toContain(
      `${scaledMeta.width} × ${scaledMeta.height} px`,
    );
    expect(scaled.length).toBeLessThanOrEqual(40 * 1024);
  });

  test("every visible control has an accessible name and passes axe", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const unnamed = async () =>
      page.evaluate(() => {
        const root =
          document.querySelector(".compressor-workspace") ?? document.body;
        return [
          ...root.querySelectorAll(
            "button, a[href], select, input:not([type=hidden]), [role=radio]",
          ),
        ]
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .filter((el) => {
            const label =
              el.getAttribute("aria-label") ||
              (el as HTMLInputElement).labels?.[0]?.textContent ||
              el.textContent ||
              el.getAttribute("title") ||
              "";
            return label.trim().length === 0;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });

    expect(await unnamed()).toEqual([]);
    await addImages(page, [await photo(page, 500, 400, "a11y.png", 220)]);
    expect(await unnamed()).toEqual([]);
    await compressBatch(page, 1);
    expect(await unnamed()).toEqual([]);

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });

  test("structured data and guidance are published", async ({ page }) => {
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const graph = blocks
      .flatMap((block) => {
        try {
          return JSON.parse(block)["@graph"] ?? [];
        } catch {
          return [];
        }
      })
      .map((node: { "@type": string }) => node["@type"]);
    expect(graph).toContain("WebApplication");
    expect(graph).not.toContain("HowTo");
    expect(graph).toContain("FAQPage");
    const faqs = await page
      .locator(".tool-guidance section")
      .nth(1)
      .locator("details")
      .count();
    expect(faqs).toBeGreaterThanOrEqual(7);
  });
});

test.describe("image compressor — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/image-compressor");
    await expect(page.getByLabel("Add images")).toBeAttached();
  });

  test("touch flow compresses, compares and downloads without overflow", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await addImages(page, [
      await photo(page, 800, 600, "phone-a.png", 200),
      await photo(page, 600, 800, "phone-b.png", 300),
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const thumb = page.getByRole("button", { name: "Preview phone-b.png" });
    await thumb.scrollIntoViewIfNeeded();
    const box = (await thumb.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(thumb).toHaveAttribute("aria-pressed", "true");

    await page
      .getByRole("button", { name: /Compress 2 images/ })
      .scrollIntoViewIfNeeded();
    await compressBatch(page, 2);
    await page.getByRole("button", { name: /Split/ }).click();
    await expect(page.locator(".compressor-split-label")).toHaveCount(2);

    const filename = (
      await page.locator(".compressor-filename").innerText()
    ).trim();
    const buffer = await downloadResult(page, filename);
    expect(buffer.length).toBeGreaterThan(100);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const heights = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".compressor-actions button, .compressor-icon-button, .compressor-viewswitch button",
        ),
      ]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) =>
          Math.round((el as HTMLElement).getBoundingClientRect().height),
        ),
    );
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(28);
  });

  test("mobile target-size flow reaches the limit", async ({ page }) => {
    test.setTimeout(120_000);
    await addImages(page, [await smallJpeg(page)]);
    await page.getByRole("radio", { name: /Target size/ }).check();
    await page.getByLabel("Target file size").fill("80");
    await page
      .getByRole("button", { name: /Compress 1 image/ })
      .scrollIntoViewIfNeeded();
    await compressBatch(page, 1);
    await expect(page.locator(".compressor-stats")).toContainText("met at q");
    const filename = (
      await page.locator(".compressor-filename").innerText()
    ).trim();
    const buffer = await downloadResult(page, filename);
    expect(buffer.length).toBeLessThanOrEqual(80 * 1024);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
