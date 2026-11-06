import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const screenshots = path.resolve("test-results/developer-tools");

async function capture(page: Page, name: string) {
  await mkdir(screenshots, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll<HTMLElement>(
      "textarea, pre",
    )) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }
  });
  await page.screenshot({
    path: path.join(screenshots, `${name}.png`),
    animations: "disabled",
  });
}

test.describe("the eleven Developer Tools", () => {
  test("routes render, pass accessibility checks and fit desktop and mobile", async ({
    page,
  }) => {
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
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    for (const [slug, name] of routes) {
      await page.setViewportSize({ width: 1440, height: 1200 });
      const response = await page.goto(`/tools/${slug}`, {
        waitUntil: "networkidle",
      });
      expect(response?.status(), slug).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible();
      expect(await page.title(), slug).toContain(name);

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
    }
    expect(pageErrors).toEqual([]);
  });

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

  test("JSON Formatter adds safe syntax/tree views and a working reset", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto("/tools/json-formatter");
    await page
      .getByLabel("JSON input", { exact: true })
      .fill('{"hello":"世界","ready":true}');
    await page
      .getByRole("button", { name: "Format JSON", exact: true })
      .click();
    await expect(page.getByLabel("JSON result", { exact: true })).toHaveValue(
      '{\n  "hello": "世界",\n  "ready": true\n}',
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
        '{\n  "hello": "世界",\n  "ready": true\n}',
      );
    }
    await capture(page, "json-formatter");
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
    await capture(page, "html-formatter");
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
    await capture(page, "javascript-minifier");
  });

  test("Base64 round-trips Unicode, copies text and downloads exact binary bytes", async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto("/tools/base64-encoder-decoder");
    const text = "नमस्ते 🌍";
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

    await page.getByRole("button", { name: "Decode", exact: true }).click();
    await page.getByLabel("Base64 input", { exact: true }).fill(encoded);
    await page
      .getByRole("button", { name: "Decode Base64", exact: true })
      .click();
    await expect(
      page.getByLabel("Decoded UTF-8 output", { exact: true }),
    ).toHaveValue(text);

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
    await capture(page, "url-encoder-decoder");
  });

  test("UUID generator creates unique valid v4 batches", async ({ page }) => {
    await page.goto("/tools/uuid-generator");
    await page.getByLabel("UUID quantity", { exact: true }).fill("4");
    await page
      .getByRole("button", { name: "Generate UUIDs", exact: true })
      .click();
    const values = (
      await page.getByLabel("Generated UUIDs", { exact: true }).inputValue()
    ).split("\n");
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
    await capture(page, "xml-formatter");
    await page.getByRole("button", { name: "Minify XML", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "XML output" }),
    ).toContainText("<root><a>નમસ્તે</a><b>世界</b></root>");
    await page
      .getByLabel("XML input", { exact: true })
      .fill('<!DOCTYPE root [<!ENTITY x "unsafe">]><root>&x;</root>');
    await page.getByRole("button", { name: "Format XML", exact: true }).click();
    await expect(page.locator(".devtool-message.error")).toContainText(
      "DOCTYPE declarations",
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
