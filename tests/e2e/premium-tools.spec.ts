import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";

async function pngFixture(page: Page, width = 1600, height = 900) {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#6657e8");
      gradient.addColorStop(1, "#2f9e6e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      return c.toDataURL("image/png").split(",")[1];
    },
    [width, height] as const,
  );
  return {
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

test("word counter premium: sample, goal, density and download", async ({
  page,
}) => {
  await page.goto("/tools/word-counter");
  await page.getByRole("button", { name: "Try sample text" }).click();
  const text = await page.getByLabel("Your text", { exact: true }).inputValue();
  expect(text).toContain("Great writing");
  await page.getByLabel("Word goal (optional)").fill("10");
  await expect(page.getByText("Goal reached")).toBeVisible();
  await expect(page.locator(".density-list li").first()).toBeVisible();
  await expect(
    page.getByText("Speaking time · 150 wpm", { exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("quickkit-text.txt");
  expect(await readFile((await download.path())!, "utf8")).toBe(text);
});

test("case converter premium: developer styles update live and swap works", async ({
  page,
}) => {
  await page.goto("/tools/case-converter");
  await page.getByLabel("Original text").fill("hello brave world");
  await page.getByRole("button", { name: "camelCase", exact: true }).click();
  await expect(page.getByLabel("Converted text")).toHaveValue(
    "helloBraveWorld",
  );
  // Live re-conversion while typing with a style selected.
  await page.getByLabel("Original text").fill("another fine day");
  await expect(page.getByLabel("Converted text")).toHaveValue("anotherFineDay");
  await page.getByRole("button", { name: "snake_case", exact: true }).click();
  await expect(page.getByLabel("Converted text")).toHaveValue(
    "another_fine_day",
  );
  await page.getByRole("button", { name: "Use output as input" }).click();
  await expect(page.getByLabel("Original text")).toHaveValue(
    "another_fine_day",
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  expect((await pending).suggestedFilename()).toBe(
    "quickkit-converted-text.txt",
  );
});

test("JSON premium: indent, sort keys, located errors, file open and download", async ({
  page,
}) => {
  await page.goto("/tools/json-formatter");
  await page.getByLabel("Indent").selectOption("4");
  await page.getByLabel("Sort keys A–Z").check();
  await page.getByLabel("JSON input").fill('{"b":1,"a":{"d":2,"c":3}}');
  await page.getByRole("button", { name: "Format JSON", exact: true }).click();
  await expect(page.getByLabel("JSON result")).toHaveValue(
    '{\n    "a": {\n        "c": 3,\n        "d": 2\n    },\n    "b": 1\n}',
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .json" }).click();
  expect((await pending).suggestedFilename()).toBe("quickkit.json");

  await page.getByLabel("JSON input").fill('{\n  "a": 1,\n}');
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".status.error")).toContainText("Invalid JSON");
  await expect(page.locator(".error-excerpt")).toContainText("^");

  await page.getByLabel("Open a JSON file").setInputFiles({
    name: "data.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"fromFile":true}'),
  });
  await expect(page.getByLabel("JSON input")).toHaveValue('{"fromFile":true}');
});

test("password premium: strength meter, history and hide toggle", async ({
  page,
}) => {
  await page.goto("/tools/password-generator");
  await expect(page.getByText("bits of entropy")).toBeVisible();
  await page.getByLabel("Password length in characters").fill("8");
  await expect(page.locator(".strength-head")).not.toContainText("Excellent");
  await page.getByLabel("Password length in characters").fill("64");
  await expect(page.locator(".strength-head")).toContainText("Excellent");
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expect(page.getByText("Recent (this session only)")).toBeVisible();
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(page.locator(".password-output")).toHaveClass(/masked/);
});

test("QR premium: sizes decode, SVG downloads, low contrast is blocked", async ({
  page,
}) => {
  await page.goto("/tools/qr-generator");
  await page.getByLabel("Text or URL").fill("https://example.com/premium");
  await page.getByLabel("PNG size").selectOption("256");
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.getByAltText("Generated QR code preview")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PNG", exact: true }).click();
  const download = await pending;
  const png = PNG.sync.read(await readFile((await download.path())!));
  expect(png.width).toBe(256);
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe("https://example.com/premium");

  const svgPending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svgDownload = await svgPending;
  expect(svgDownload.suggestedFilename()).toBe("quickkit-qr-code.svg");
  expect(await readFile((await svgDownload.path())!, "utf8")).toContain("<svg");

  await page.getByLabel("Code color").fill("#eeeeee");
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.locator(".status.error")).toContainText("contrast");
});

test("image premium: input and drop both load, and compression downloads a real file", async ({
  page,
}) => {
  await page.goto("/tools/image-compressor");
  const fixture = await pngFixture(page);
  // Load through the picker; the drop zone feeds the same validation path.
  await page.getByLabel("Add images", { exact: true }).setInputFiles(fixture);
  await expect(page.locator(".compressor-item")).toHaveCount(1);
  await expect(page.locator(".compressor-stats")).toContainText("1600 × 900");
  await page
    .getByLabel("Output format", { exact: true })
    .selectOption("image/png");
  await page
    .getByRole("button", { name: "Compress 1 image", exact: true })
    .click();
  await expect(page.locator(".compressor-status-done")).toHaveCount(1);
  // Dimensions stay identical unless a target-size run decides to downscale.
  await expect(page.locator(".compressor-stats")).toContainText("unchanged");
  const pending = page.waitForEvent("download");
  await page.locator(".compressor-download").click();
  const download = await pending;
  const data = await readFile((await download.path())!);
  expect(PNG.sync.read(data).width).toBe(1600);

  // Real drag-and-drop onto the drop zone loads the file too.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#6657e8";
    ctx.fillRect(0, 0, 120, 80);
    const blob = await new Promise<Blob>((resolve) =>
      c.toBlob((b) => resolve(b!), "image/png"),
    );
    const file = new File([blob], "dropped.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document.querySelector(".compressor-drop")!.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  });
  await expect(page.locator(".compressor-item")).toHaveCount(1);
  await expect(page.locator(".compressor-item")).toContainText("dropped.png");
});

// Phase 3: accessibility must hold in interactive states, not only on first paint.
test("interactive states stay WCAG 2.2 AA clean (axe)", async ({ page }) => {
  const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
  async function expectClean(label: string) {
    const result = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(
      result.violations.map((v) => `${label}: ${v.id}`),
      label,
    ).toEqual([]);
  }

  await page.goto("/tools/word-counter");
  await page.getByRole("button", { name: "Try sample text" }).click();
  await page.getByLabel("Word goal (optional)").fill("40");
  await expectClean("word filled + density");

  await page.goto("/tools/json-formatter");
  await page.getByLabel("JSON input").fill('{\n  "a": 1,\n}');
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".error-excerpt")).toBeVisible();
  await expectClean("json error state");

  await page.goto("/tools/password-generator");
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expectClean("password generated + history");

  await page.goto("/tools/qr-generator");
  await page.getByLabel("Text or URL").fill("https://example.com/a11y");
  await page
    .getByRole("button", { name: "Generate QR code", exact: true })
    .click();
  await expect(page.getByAltText("Generated QR code preview")).toBeVisible();
  await expectClean("qr result state");

  await page.goto("/tools/image-compressor");
  await page
    .getByLabel("Add images", { exact: true })
    .setInputFiles(await pngFixture(page, 320, 240));
  await page
    .getByRole("button", { name: "Compress 1 image", exact: true })
    .click();
  await expect(page.locator(".compressor-status-done")).toHaveCount(1);
  await expectClean("image compressed state");
});

// Phase 3: the core task of each family must be completable by keyboard alone,
// with a visible focus indicator at every stop.
test("keyboard-only journey: generate a password without a mouse", async ({
  page,
}) => {
  await page.goto("/tools/password-generator");
  await page.getByLabel("Password length", { exact: true }).focus();
  // Tab from the slider through the options to the Generate button,
  // checking every stop has a visible focus treatment.
  let reachedGenerate = false;
  for (let i = 0; i < 12 && !reachedGenerate; i++) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim(),
        visible:
          (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px") ||
          cs.boxShadow !== "none" ||
          el.tagName === "INPUT",
      };
    });
    expect(state.visible, `focus indicator at stop: ${state.text}`).toBe(true);
    if (state.text.includes("Generate password")) reachedGenerate = true;
  }
  expect(reachedGenerate).toBe(true);
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Generated password", { exact: true }),
  ).not.toHaveValue("");
});
