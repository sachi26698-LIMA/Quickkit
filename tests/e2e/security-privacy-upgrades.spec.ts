import { expect, test } from "@playwright/test";

test("HMAC produces and downloads a real local digest", async ({ page }) => {
  await page.goto("/tools/hmac-generator-verifier");
  const workspace = page.getByRole("group", {
    name: "Security tool workspace",
  });
  await workspace.getByLabel("Message (UTF-8, may be empty)").fill("hello");
  await workspace
    .getByLabel("Secret key (16–4096 bytes)")
    .fill("this-is-a-long-key");
  await workspace.getByRole("button", { name: "Process locally" }).click();
  await expect(workspace.getByLabel("Result")).toHaveValue(/^[a-f0-9]{64}$/);
  const pending = page.waitForEvent("download");
  await workspace.getByRole("button", { name: "Download result" }).click();
  expect((await pending).suggestedFilename()).toBe("quickkit-result.txt");
  await workspace.getByRole("button", { name: "Reset" }).click();
  await expect(workspace.getByLabel("Result")).toHaveValue("");
});

test("URL review works on a narrow viewport without a network check", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tools/url-safety-review");
  const workspace = page.getByRole("group", {
    name: "Security tool workspace",
  });
  await workspace
    .getByLabel("Input")
    .fill("http://user:secret@127.0.0.1/?token=hidden");
  await workspace.getByRole("button", { name: "Process locally" }).click();
  await expect(workspace.getByLabel("Result")).toHaveValue(
    /HTTP does not encrypt/,
  );
  expect(await workspace.getByLabel("Result").inputValue()).not.toContain(
    "secret",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("RSA generation keeps the private key hidden until explicitly revealed", async ({
  page,
}) => {
  await page.goto("/tools/rsa-cryptography");
  const workspace = page.getByRole("group", { name: "RSA workspace" });
  await workspace.getByRole("button", { name: "Process locally" }).click();
  await expect(workspace.getByLabel("Public JWK")).toHaveValue(/"kty": "RSA"/, {
    timeout: 30000,
  });
  await expect(workspace.getByLabel("Private JWK — keep secret")).toHaveCount(
    0,
  );
  await workspace.getByLabel("Reveal the unencrypted private JWK").check();
  await expect(workspace.getByLabel("Private JWK — keep secret")).toHaveValue(
    /"d":/,
  );
  await workspace.getByRole("button", { name: "Reset" }).click();
  await expect(workspace.getByLabel("Private JWK — keep secret")).toHaveCount(
    0,
  );
});

test("RS256 signing uses dedicated keys and verifies in Node", async ({
  page,
}) => {
  const { createPublicKey, verify } = await import("node:crypto");
  await page.goto("/tools/advanced-cryptography?operation=rsa-cryptography");
  const workspace = page.getByRole("group", { name: "RSA workspace" });
  await workspace.getByLabel("Operation").selectOption("generate-sign");
  await workspace.getByRole("button", { name: "Process locally" }).click();
  await expect(workspace.getByLabel("Public JWK")).toHaveValue(/"kty": "RSA"/, {
    timeout: 30000,
  });
  const publicJwk = JSON.parse(
    await workspace.getByLabel("Public JWK").inputValue(),
  );
  await workspace.getByLabel("Reveal the unencrypted private JWK").check();
  const privateJwk = await workspace
    .getByLabel("Private JWK — keep secret")
    .inputValue();
  await workspace.getByLabel("Operation").selectOption("sign");
  await expect(workspace.getByLabel("Private RSA JWK (JSON)")).toHaveAttribute(
    "type",
    "password",
  );
  await workspace.getByLabel("Private RSA JWK (JSON)").fill(privateJwk);
  await workspace.getByLabel("Message (UTF-8)").fill("Browser signing test");
  await workspace.getByRole("button", { name: "Process locally" }).click();
  await expect(workspace.getByLabel("Result")).toHaveValue(/^[0-9a-f]{512}$/);
  const signature = Buffer.from(
    await workspace.getByLabel("Result").inputValue(),
    "hex",
  );
  expect(
    verify(
      "sha256",
      Buffer.from("Browser signing test"),
      createPublicKey({ key: publicJwk, format: "jwk" }),
      signature,
    ),
  ).toBe(true);
});

test("DNS batch requires fresh consent, produces a report and downloads it", async ({
  page,
}) => {
  const seen: string[] = [];
  await page.route("https://cloudflare-dns.com/dns-query**", async (route) => {
    seen.push(new URL(route.request().url()).searchParams.get("name")!);
    await route.fulfill({
      status: 200,
      contentType: "application/dns-json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        Status: 0,
        Answer: [{ type: 1, TTL: 60, data: "203.0.113.10" }],
      }),
    });
  });
  await page.goto("/tools/dns-email-security?operation=dns-lookup");
  const w = page.getByRole("group", { name: "DNS lookup workspace" });
  await w.getByRole("checkbox", { name: /I agree/ }).check();
  await w.getByRole("checkbox", { name: /Batch DNS/ }).check();
  await w
    .getByLabel("Public domain names (one per line)")
    .fill("example.com\nexample.org");
  await w.getByRole("button", { name: "Look up DNS" }).click();
  await expect(w.getByRole("alert")).toContainText("Confirm");
  expect(seen).toEqual([]);
  await w.getByRole("checkbox", { name: /I agree to send each/ }).check();
  await w.getByRole("button", { name: "Look up DNS" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/2 sequential queries/);
  expect(seen).toEqual(["example.com", "example.org"]);
  const download = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download result" }).click();
  expect((await download).suggestedFilename()).toBe("quickkit-dns.txt");
});

test("offline URL batch reviews separate entries and exports without exposing query secrets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tools/url-network-privacy?operation=url-safety-review");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByRole("checkbox", { name: /Review up to 25 URLs/ }).check();
  await w
    .getByLabel("URLs (one per line)", { exact: true })
    .fill(
      "http://user:private@example.com/?token=secret\nnot a URL\nhttps://example.org/",
    );
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(page.url()).origin)
      externalRequests.push(request.url());
  });
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/3 entries/);
  const report = await w.getByLabel("Result").inputValue();
  expect(report).toContain("URL 2\nUnable to review");
  expect(report).not.toContain("private");
  expect(report).not.toContain("secret");
  expect(externalRequests).toEqual([]);
  const download = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download result" }).click();
  expect((await download).suggestedFilename()).toBe("quickkit-result.txt");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await w.getByRole("button", { name: "Reset" }).click();
  await expect(w.getByLabel("Result")).toHaveValue("");
});

test("request header analysis reports framing risks without revealing credentials", async ({
  page,
}) => {
  await page.goto(
    "/tools/api-credential-tools?operation=api-request-header-analyzer",
  );
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w
    .getByLabel("Request headers")
    .fill(
      "Authorization: Basic private-token\nContent-Length: 12\nTransfer-Encoding: chunked\nX-API-Key: secret-key",
    );
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /Both Transfer-Encoding and Content-Length/,
  );
  const report = await w.getByLabel("Result").inputValue();
  expect(report).toContain("Basic credentials");
  expect(report).not.toContain("private-token");
  expect(report).not.toContain("secret-key");
});

test("password repetition and digest-length findings are processed locally", async ({
  page,
}) => {
  await page.goto(
    "/tools/password-generator?operation=password-strength-checker",
  );
  let w = page.getByRole("group", { name: "Security tool workspace" });
  const secret = "long-pattern-long-pattern-long-pattern-!";
  await w.getByLabel("Password to assess").fill(secret);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/repeated segments/);
  expect(await w.getByLabel("Result").inputValue()).not.toContain(secret);
  await page.goto("/tools/hash-generator?operation=hash-comparison");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("First hexadecimal digest").fill("aabb");
  await w.getByLabel(/Second hexadecimal digest/).fill("aa");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /First digest: 2 bytes. Second digest: 1 bytes/,
  );
});
