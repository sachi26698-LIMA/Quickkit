import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const screenshots = path.resolve("test-results/developer-tools");

async function capture(page: Page, name: string) {
  await mkdir(screenshots, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      );
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    for (const element of document.querySelectorAll<HTMLElement>(
      "textarea, pre",
    )) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }
  });
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({
    path: path.join(screenshots, `${name}.png`),
    animations: "disabled",
    fullPage: true,
  });
}

async function readOutputText(output: Locator): Promise<string> {
  return output.evaluate((element) => {
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    ) {
      return element.value;
    }
    if (element.querySelector(".devtool-output-placeholder")) return "";
    return element.textContent ?? "";
  });
}

async function expectCopyAndDownload(
  page: Page,
  output: Locator,
  downloadLabel: string,
  filename: string,
) {
  const text = await readOutputText(output);
  expect(text.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(
    page.getByText("Copied to clipboard.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: downloadLabel, exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(filename);
  expect(await readFile((await download.path())!)).toEqual(Buffer.from(text));
}

test.describe("the eleven Developer Tools", () => {
  const routes = [
    ["json-formatter", "JSON Formatter"],
    ["json-validator", "JSON Validator"],
    ["html-formatter", "HTML Formatter"],
    ["css-minifier", "CSS Minifier"],
    ["javascript-minifier", "JavaScript Minifier"],
    ["base64-encoder-decoder", "Base64 Encoder / Decoder"],
    ["url-encoder-decoder", "URL Encoder / Decoder"],
    ["uuid-generator", "UUID Generator"],
    ["regex-tester", "Regex Tester"],
    ["hash-generator", "Hash Generator"],
    ["xml-formatter", "XML Formatter"],
  ] as const;

  for (const [slug, name] of routes) {
    test(`${slug} renders, passes accessibility checks and fits desktop and mobile`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") pageErrors.push(message.text());
      });

      await page.setViewportSize({ width: 1440, height: 1200 });
      const response = await page.goto(`/tools/${slug}`, {
        // The page's visible heading assertion and Axe scan provide the
        // readiness checks; waiting for network idle is unnecessary here.
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), slug).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible();
      expect(await page.title(), slug).toContain(
        slug === "base64-encoder-decoder"
          ? "Base64 Encoder & Decoder"
          : slug === "url-encoder-decoder"
            ? "URL Encoder & Decoder"
            : name,
      );

      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations, `${slug} accessibility`).toEqual([]);

      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
        `${slug} mobile horizontal overflow`,
      ).toBeLessThanOrEqual(0);
      await expect(
        page.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible();
      expect(pageErrors, slug).toEqual([]);
    });
  }

  test("Developer Tools category count, search and route links stay in sync", async ({
    page,
  }) => {
    await page.goto("/tools?category=developer-tools", {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("status")).toHaveText("11 tools found");
    const toolLinks = await page
      .locator(".tool-card .card-link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(toolLinks).toHaveLength(11);
    expect(new Set(toolLinks).size).toBe(11);
    for (const href of toolLinks) {
      expect(href).toMatch(/^\/tools\//u);
      const response = await page.request.get(
        new URL(href!, page.url()).toString(),
      );
      expect(response.status(), href ?? "missing href").toBe(200);
    }
    await page
      .getByRole("searchbox", { name: "Search tools" })
      .fill("XML Formatter");
    await expect(page.getByRole("status")).toHaveText("1 tools found");
    await expect(
      page.getByRole("link", { name: "XML Formatter", exact: true }),
    ).toHaveAttribute("href", "/tools/xml-formatter");
    await page
      .getByRole("link", { name: "XML Formatter", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tools\/xml-formatter$/u);
  });

  test("tool search supports its keyboard shortcut and favorites persist accessibly", async ({
    page,
  }) => {
    await page.goto("/tools?category=developer-tools", {
      waitUntil: "networkidle",
    });
    const search = page.getByRole("searchbox", { name: "Search tools" });
    await expect(search).toBeEnabled();
    await page.keyboard.press("Control+k");
    await expect(search).toBeFocused();
    await search.fill("XML Formatter");
    await expect(page.getByRole("status")).toHaveText("1 tools found");
    await page.keyboard.press("Escape");
    await expect(search).toHaveValue("");

    const save = page.getByRole("button", { name: "Save XML Formatter" });
    await save.focus();
    await expect(save).toBeFocused();
    await page.keyboard.press("Space");
    const remove = page.getByRole("button", {
      name: "Remove XML Formatter from saved tools",
    });
    await expect(remove).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Saved tools (1)" }).click();
    await expect(page).toHaveURL(/\/saved$/u);
    await expect(
      page.getByRole("link", { name: "XML Formatter", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Remove XML Formatter from saved tools",
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "No saved tools yet" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("quickkit:saved-tools")),
    ).toBe("[]");
  });

  test("JSON tool actions and output views work with keyboard-only activation", async ({
    page,
  }) => {
    await page.goto("/tools/json-formatter");
    await page
      .getByLabel("JSON input", { exact: true })
      .fill('{"keyboard":true}');
    const format = page.getByRole("button", {
      name: "Format JSON",
      exact: true,
    });
    await format.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("JSON result", { exact: true })).toHaveValue(
      '{\n  "keyboard": true\n}',
    );
    const syntax = page.getByRole("button", { name: "Syntax", exact: true });
    await syntax.focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("textbox", { name: "JSON syntax-highlighted output" }),
    ).toContainText('"keyboard"');
  });

  test("Developer Tool motion becomes static when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tools/html-formatter");
    const motionStyles = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const spinner = document.createElement("span");
      spinner.className = "devtool-processing-spinner";
      workspace?.append(spinner);
      const spinnerAnimation = getComputedStyle(spinner).animationName;
      spinner.remove();
      const editor = document.querySelector(".devtool-editor");
      return {
        spinnerAnimation,
        editorTransition: editor
          ? getComputedStyle(editor).transitionDuration
          : "",
        iconAnimation: getComputedStyle(
          document.querySelector(".tool-title .i3d-body")!,
        ).animationName,
      };
    });
    expect(motionStyles.spinnerAnimation).toBe("none");
    expect(
      Number.parseFloat(motionStyles.editorTransition),
    ).toBeLessThanOrEqual(0.00001);
    expect(motionStyles.iconAnimation).toBe("none");
  });

  test("JSON Formatter adds safe syntax/tree views and a working reset", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto("/tools/json-formatter");
    await page
      .getByLabel("JSON input", { exact: true })
      .fill('{"hello":"world","ready":true}');
    await page
      .getByRole("button", { name: "Format JSON", exact: true })
      .click();
    await expect(page.getByLabel("JSON result", { exact: true })).toHaveValue(
      '{\n  "hello": "world",\n  "ready": true\n}',
    );
    await page.getByRole("button", { name: "Syntax", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "JSON syntax-highlighted output" }),
    ).toContainText('"hello"');
    await page.getByRole("button", { name: "Tree", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "JSON tree view" }),
    ).toContainText("Object · 2 keys");
    await page.getByRole("button", { name: "Code", exact: true }).click();

    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy", exact: true }).click();
      await expect(page.getByText("Copied to clipboard.")).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        '{\n  "hello": "world",\n  "ready": true\n}',
      );
    }
    await capture(page, "json-formatter");
    await page
      .getByLabel("JSON input", { exact: true })
      .fill('{"greeting":"नमस्ते 🌍"}');
    await page
      .getByRole("button", { name: "Format JSON", exact: true })
      .click();
    await expect(page.getByLabel("JSON result", { exact: true })).toHaveValue(
      '{\n  "greeting": "नमस्ते 🌍"\n}',
    );
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByLabel("JSON input", { exact: true })).toHaveValue(
      "",
    );
    await expect(page.getByLabel("JSON result", { exact: true })).toHaveValue(
      "",
    );
  });

  test("JSON Validator reports errors and downloads a valid local result", async ({
    page,
  }) => {
    await page.goto("/tools/json-validator");
    await page
      .getByLabel("JSON input", { exact: true })
      .fill('{"name":"QUICKKIT","ok":true}');
    await page
      .getByRole("button", { name: "Validate JSON", exact: true })
      .click();
    await expect(page.locator(".devtool-message")).toContainText("Valid JSON");
    await expect(
      page.getByLabel("Validation result", { exact: true }),
    ).toHaveValue('{\n  "name": "QUICKKIT",\n  "ok": true\n}');
    await capture(page, "json-validator");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download JSON", exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("quickkit-validated.json");
    const downloaded = await readFile((await download.path())!);
    expect(downloaded.toString("utf8")).toContain("QUICKKIT");

    await page.getByLabel("JSON input", { exact: true }).fill('{"bad": }');
    await page
      .getByRole("button", { name: "Validate JSON", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "Invalid JSON",
    );
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByLabel("JSON input", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      page.getByLabel("Validation result", { exact: true }),
    ).toHaveValue("");
    await page
      .getByRole("button", { name: "Validate JSON", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "Enter JSON first",
    );

    await page.getByLabel("JSON input", { exact: true }).fill('{"ok":true}');
    await page
      .getByRole("button", { name: "Validate JSON", exact: true })
      .click();
    await expect(
      page.getByLabel("Validation result", { exact: true }),
    ).not.toHaveValue("");
    await page.getByLabel("Open JSON file", { exact: true }).setInputFiles({
      name: "over-limit.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(1_000_001, 0x20),
    });
    await expect(page.locator(".devtool-message.error")).toContainText(
      "too large",
    );
    await expect(
      page.getByLabel("Validation result", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Download JSON", exact: true }),
    ).toBeDisabled();
  });

  test("HTML formatting and minification leave script text inert", async ({
    page,
  }) => {
    await page.goto("/tools/html-formatter");
    const marker = "__quickkit_html_code_was_not_executed__";
    await page
      .getByLabel("HTML input", { exact: true })
      .fill(
        `<main><h1>Hello 世界</h1><script>globalThis.${marker}=true;</script></main>`,
      );
    await page
      .getByRole("button", { name: "Format HTML", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "HTML output" }),
    ).toContainText("Hello 世界");
    await expect
      .poll(() =>
        page.evaluate(
          (key) => (window as unknown as Record<string, unknown>)[key],
          marker,
        ),
      )
      .toBeUndefined();
    await page
      .getByRole("button", { name: "Minify HTML", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "HTML output" }),
    ).toContainText(`globalThis.${marker}=true`);
    await expect(page.getByText("Original UTF-8 size")).toBeVisible();
    await page
      .getByLabel("HTML input", { exact: true })
      .fill("<main><h1>Hello world</h1></main>");
    await page
      .getByRole("button", { name: "Format HTML", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "HTML output" }),
    ).toContainText("Hello world");
    await capture(page, "html-formatter");
    await page.getByLabel("HTML input", { exact: true }).fill("<main><");
    await page
      .getByRole("button", { name: "Format HTML", exact: true })
      .click();
    await expect(page.locator(".devtool-message.success")).toContainText(
      "HTML formatted locally",
    );
  });

  test("CSS and JavaScript minifiers transform source without executing it", async ({
    page,
  }) => {
    await page.goto("/tools/css-minifier");
    await page
      .getByLabel("CSS input", { exact: true })
      .fill("/* note */ .card { color: #ffffff; margin: 0px; }");
    await page.getByRole("button", { name: "Minify CSS", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "CSS minified output" }),
    ).toContainText(".card{color:#fff");
    await capture(page, "css-minifier");
    await page
      .getByLabel("CSS input", { exact: true })
      .fill(".broken { color: red");
    await page.getByRole("button", { name: "Minify CSS", exact: true }).click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "line 1, column 9",
    );

    await page.goto("/tools/javascript-minifier");
    const marker = "__quickkit_js_code_was_not_executed__";
    await page
      .getByLabel("JavaScript input", { exact: true })
      .fill(
        `globalThis.${marker}=true; function greet(name) { return name + "!"; }`,
      );
    await page
      .getByRole("button", { name: "Minify JavaScript", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "JavaScript minified output" }),
    ).toContainText("greet");
    expect(
      await page.evaluate(
        (key) => (window as unknown as Record<string, unknown>)[key],
        marker,
      ),
    ).toBeUndefined();
    await page
      .getByLabel("JavaScript input", { exact: true })
      .fill("function greet(name) { return name; }");
    await page
      .getByRole("button", { name: "Minify JavaScript", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "JavaScript minified output" }),
    ).toContainText("greet");
    await capture(page, "javascript-minifier");
    await page
      .getByLabel("JavaScript input", { exact: true })
      .fill("function (");
    await page
      .getByRole("button", { name: "Minify JavaScript", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      /line 1, column \d+/u,
    );
  });

  test("Base64 round-trips Unicode, copies text and downloads exact binary bytes", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto("/tools/base64-encoder-decoder");
    const text = "Hello, world!";
    const encoded = Buffer.from(text, "utf8").toString("base64");
    await page.getByLabel("Text or Base64 input", { exact: true }).fill(text);
    await page
      .getByRole("button", { name: "Encode Base64", exact: true })
      .click();
    await expect(page.getByLabel("Base64 output", { exact: true })).toHaveValue(
      encoded,
    );
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy", exact: true }).click();
      await expect(page.getByText("Copied to clipboard.")).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        encoded,
      );
    }
    await capture(page, "base64-encoder-decoder");

    const unicodeText = "नमस्ते 🌍";
    const unicodeEncoded = Buffer.from(unicodeText, "utf8").toString("base64");
    await page
      .getByLabel("Text or Base64 input", { exact: true })
      .fill(unicodeText);
    await page
      .getByRole("button", { name: "Encode Base64", exact: true })
      .click();
    await expect(page.getByLabel("Base64 output", { exact: true })).toHaveValue(
      unicodeEncoded,
    );

    await page.getByRole("button", { name: "Decode", exact: true }).click();
    await page.getByLabel("Base64 input", { exact: true }).fill(unicodeEncoded);
    await page
      .getByRole("button", { name: "Decode Base64", exact: true })
      .click();
    await expect(
      page.getByLabel("Decoded UTF-8 output", { exact: true }),
    ).toHaveValue(unicodeText);

    await page
      .getByRole("button", { name: "Binary file", exact: true })
      .click();
    await page.getByLabel("Base64 input", { exact: true }).fill("AP8=");
    await page
      .getByRole("button", { name: "Decode Base64", exact: true })
      .click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Download decoded file", exact: true })
        .click(),
    ]);
    expect([...(await readFile((await download.path())!))]).toEqual([0, 255]);

    await page.getByRole("button", { name: "UTF-8 text", exact: true }).click();
    await page.getByLabel("Base64 input", { exact: true }).fill("//4=");
    await page
      .getByRole("button", { name: "Decode Base64", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toBeVisible();
    await expect(
      page.getByLabel("Decoded UTF-8 output", { exact: true }),
    ).toHaveValue("");
    await page.getByLabel("Base64 input", { exact: true }).fill("%%%");
    await page
      .getByRole("button", { name: "Decode Base64", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "Invalid Base64",
    );
  });

  test("URL component and full-URL modes preserve their different semantics", async ({
    page,
  }) => {
    await page.goto("/tools/url-encoder-decoder");
    const value = "https://example.com/?q=hello world&lang=ગુજરાતી";
    await page.getByLabel("URL or query value", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Encode URL", exact: true }).click();
    await expect(
      page.getByLabel("Encoded URL output", { exact: true }),
    ).toHaveValue(encodeURIComponent(value));
    await page.getByRole("button", { name: "Full URL", exact: true }).click();
    await page.getByLabel("URL or query value", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Encode URL", exact: true }).click();
    await expect(
      page.getByLabel("Encoded URL output", { exact: true }),
    ).toHaveValue(encodeURI(value));
    const screenshotValue = "https://example.com/?q=hello world";
    await page
      .getByLabel("URL or query value", { exact: true })
      .fill(screenshotValue);
    await page.getByRole("button", { name: "Encode URL", exact: true }).click();
    await expect(
      page.getByLabel("Encoded URL output", { exact: true }),
    ).toHaveValue(encodeURI(screenshotValue));
    await capture(page, "url-encoder-decoder");
    await page.getByRole("button", { name: "Decode", exact: true }).click();
    await page
      .getByLabel("Encoded URL or component", { exact: true })
      .fill("%A");
    await page.getByRole("button", { name: "Decode URL", exact: true }).click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "Invalid percent-encoding",
    );
  });

  test("UUID generator creates unique valid v4 batches", async ({ page }) => {
    await page.goto("/tools/uuid-generator");
    await page.getByLabel("UUID quantity", { exact: true }).fill("4");
    await page
      .getByRole("button", { name: "Generate UUIDs", exact: true })
      .click();
    const generated = page.getByLabel("Generated UUIDs", { exact: true });
    await expect(generated).not.toHaveValue("");
    const values = (await generated.inputValue()).split("\n");
    expect(values).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
    for (const value of values) {
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
    }
    await capture(page, "uuid-generator");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByLabel("UUID quantity", { exact: true })).toHaveValue(
      "10",
    );
    await page.getByLabel("UUID quantity", { exact: true }).fill("0");
    await page
      .getByRole("button", { name: "Generate UUIDs", exact: true })
      .click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "Choose a whole number",
    );
    await expect(
      page.getByLabel("Generated UUIDs", { exact: true }),
    ).toHaveValue("");
  });

  test("Regex Tester matches safely and caps oversized replacement previews", async ({
    page,
  }) => {
    await page.goto("/tools/regex-tester");
    await page
      .getByLabel("Regular expression", { exact: true })
      .fill("(?<word>hello)");
    await page.getByLabel("Test text", { exact: true }).fill("Hello hello!");
    await page.getByLabel("Replacement", { exact: true }).fill("$<word>!");
    await expect(page.locator(".devtool-message")).toContainText(
      "2 matches found",
      {
        timeout: 10_000,
      },
    );
    await expect(
      page.getByLabel("Replacement preview", { exact: true }),
    ).toHaveValue("Hello! hello!!");
    await expect(page.locator(".devtool-regex-highlights mark")).toHaveCount(2);
    await capture(page, "regex-tester");

    await page.getByLabel("Regular expression", { exact: true }).fill("(?=.)");
    await page
      .getByLabel("Test text", { exact: true })
      .fill("x".repeat(20_000));
    await page
      .getByLabel("Replacement", { exact: true })
      .fill("z".repeat(10_000));
    await expect(page.locator(".devtool-message.warning")).toContainText(
      "replacement preview is limited",
      { timeout: 10_000 },
    );
    await expect(
      page.getByRole("button", { name: "Copy", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Download replacement", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Regular expression", { exact: true }).fill("[");
    await expect(page.locator(".devtool-message.error")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByLabel("Replacement preview", { exact: true }),
    ).toHaveValue("");
  });

  test("Hash Generator matches a known digest and hashes local files in chunks", async ({
    page,
  }) => {
    await page.goto("/tools/hash-generator");
    await page.getByLabel("Text to hash", { exact: true }).fill("abc");
    await page
      .getByRole("button", { name: "Generate hash", exact: true })
      .click();
    const expected =
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    await expect(page.getByLabel("SHA-256 hash", { exact: true })).toHaveValue(
      expected,
    );
    await capture(page, "hash-generator");

    await page.getByLabel("Input source", { exact: true }).selectOption("file");
    await page
      .getByLabel("Choose a file to hash", { exact: true })
      .setInputFiles({
        name: "empty.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.alloc(0),
      });
    await page
      .getByRole("button", { name: "Generate hash", exact: true })
      .click();
    await expect(page.getByLabel("SHA-256 hash", { exact: true })).toHaveValue(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  test("XML Formatter preserves Unicode, compacts layout and rejects DTD", async ({
    page,
  }) => {
    await page.goto("/tools/xml-formatter");
    await page
      .getByLabel("XML input", { exact: true })
      .fill("<root><a>નમસ્તે</a><b>世界</b></root>");
    await page.getByRole("button", { name: "Format XML", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "XML output" }),
    ).toContainText("નમસ્તે");
    await page.getByRole("button", { name: "Minify XML", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "XML output" }),
    ).toContainText("<root><a>નમસ્તે</a><b>世界</b></root>");
    await page
      .getByLabel("XML input", { exact: true })
      .fill("<root><name>Quickkit</name><ready>true</ready></root>");
    await page.getByRole("button", { name: "Format XML", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "XML output" }),
    ).toContainText("Quickkit");
    await capture(page, "xml-formatter");
    await page
      .getByLabel("XML input", { exact: true })
      .fill('<!DOCTYPE root [<!ENTITY x "unsafe">]><root>&x;</root>');
    await page.getByRole("button", { name: "Format XML", exact: true }).click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "DOCTYPE declarations",
    );
    await page
      .getByLabel("XML input", { exact: true })
      .fill("<root>\n  <item></root>");
    await page.getByRole("button", { name: "Format XML", exact: true }).click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "line 2, column",
    );
  });

  test("every Developer Tool copies its current result and downloads matching bytes", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const runTool = async (
      slug: string,
      outputLabel: string,
      downloadLabel: string,
      filename: string,
      prepare: () => Promise<unknown>,
    ) => {
      await page.goto(`/tools/${slug}`);
      await prepare();
      const output = page.getByLabel(outputLabel, { exact: true });
      await expect.poll(() => readOutputText(output)).not.toBe("");
      await expectCopyAndDownload(page, output, downloadLabel, filename);
    };

    await runTool(
      "json-formatter",
      "JSON result",
      "Download .json",
      "quickkit.json",
      async () => {
        await page.getByLabel("JSON input", { exact: true }).fill('{"a":"🌍"}');
        await page
          .getByRole("button", { name: "Format JSON", exact: true })
          .click();
      },
    );
    await runTool(
      "json-validator",
      "Validation result",
      "Download JSON",
      "quickkit-validated.json",
      async () => {
        await page.getByLabel("JSON input", { exact: true }).fill('{"a":"🌍"}');
        await page
          .getByRole("button", { name: "Validate JSON", exact: true })
          .click();
      },
    );
    await runTool(
      "html-formatter",
      "HTML output",
      "Download .html",
      "quickkit.html",
      async () => {
        await page
          .getByLabel("HTML input", { exact: true })
          .fill("<main><p>🌍</p></main>");
        await page
          .getByRole("button", { name: "Format HTML", exact: true })
          .click();
      },
    );
    await runTool(
      "css-minifier",
      "CSS minified output",
      "Download .css",
      "quickkit.min.css",
      async () => {
        await page
          .getByLabel("CSS input", { exact: true })
          .fill(".card { color: red; }");
        await page
          .getByRole("button", { name: "Minify CSS", exact: true })
          .click();
      },
    );
    await runTool(
      "javascript-minifier",
      "JavaScript minified output",
      "Download .js",
      "quickkit.min.js",
      async () => {
        await page
          .getByLabel("JavaScript input", { exact: true })
          .fill("function add(a, b) { return a + b; }");
        await page
          .getByRole("button", { name: "Minify JavaScript", exact: true })
          .click();
      },
    );
    await runTool(
      "base64-encoder-decoder",
      "Base64 output",
      "Download Base64",
      "quickkit.base64.txt",
      async () => {
        await page
          .getByLabel("Text or Base64 input", { exact: true })
          .fill("🌍");
        await page
          .getByRole("button", { name: "Encode Base64", exact: true })
          .click();
      },
    );
    await runTool(
      "url-encoder-decoder",
      "Encoded URL output",
      "Download result",
      "quickkit-url.txt",
      async () => {
        await page
          .getByLabel("URL or query value", { exact: true })
          .fill("hello 🌍");
        await page
          .getByRole("button", { name: "Encode URL", exact: true })
          .click();
      },
    );
    await runTool(
      "uuid-generator",
      "Generated UUIDs",
      "Download UUIDs",
      "quickkit-uuids.txt",
      async () => {
        await page.getByLabel("UUID quantity", { exact: true }).fill("1");
        await page
          .getByRole("button", { name: "Generate UUIDs", exact: true })
          .click();
      },
    );
    await runTool(
      "regex-tester",
      "Replacement preview",
      "Download replacement",
      "quickkit-regex-replacement.txt",
      async () => {
        await page.getByLabel("Regular expression", { exact: true }).fill("a");
        await page.getByLabel("Test text", { exact: true }).fill("a b a");
        await page.getByLabel("Replacement", { exact: true }).fill("x");
        await expect(page.locator(".devtool-message")).toContainText(
          "2 matches found",
          {
            timeout: 10_000,
          },
        );
      },
    );
    await runTool(
      "hash-generator",
      "SHA-256 hash",
      "Download hash",
      "quickkit-sha256-hash.txt",
      async () => {
        await page.getByLabel("Text to hash", { exact: true }).fill("abc");
        await page
          .getByRole("button", { name: "Generate hash", exact: true })
          .click();
      },
    );
    await runTool(
      "xml-formatter",
      "XML output",
      "Download .xml",
      "quickkit.xml",
      async () => {
        await page
          .getByLabel("XML input", { exact: true })
          .fill("<root><item>🌍</item></root>");
        await page
          .getByRole("button", { name: "Format XML", exact: true })
          .click();
      },
    );
  });

  test("private input is not posted or persisted, and malicious markup stays inert", async ({
    page,
  }) => {
    const marker = "__private_quickkit_input_marker__";
    const requests: string[] = [];
    page.on("request", (request) => {
      const body = request.postData() ?? "";
      if (
        request.method() !== "GET" ||
        request.url().includes(marker) ||
        body.includes(marker)
      ) {
        requests.push(`${request.method()} ${request.url()} ${body}`);
      }
    });
    await page.goto("/tools/html-formatter");
    await page
      .getByLabel("HTML input", { exact: true })
      .fill(
        `<main><script>globalThis.${marker}=true</script><p>${marker}</p></main>`,
      );
    await page
      .getByRole("button", { name: "Format HTML", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "HTML output" }),
    ).toContainText(marker);
    expect(
      await page.evaluate(
        (key) => (window as unknown as Record<string, unknown>)[key],
        marker,
      ),
    ).toBeUndefined();
    expect(
      await page.evaluate((key) => localStorage.getItem(key), marker),
    ).toBeNull();
    expect(requests).toEqual([]);
  });
});
