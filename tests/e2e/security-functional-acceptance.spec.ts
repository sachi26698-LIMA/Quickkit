import { expect, test } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import "reflect-metadata";
import {
  X509CertificateGenerator,
  SubjectAlternativeNameExtension,
} from "@peculiar/x509";

// Each case opens its actual route and exercises processing, not just route availability.
const cases: [string, RegExp, boolean][] = [
  ["password-strength-checker", /Heuristic score/, true],
  ["passphrase-generator", /[a-z]+(?:-[a-z]+){3}/, false],
  ["password-entropy-calculator", /bits, assuming independent uniform/, false],
  ["password-policy-generator", /Password policy draft/, false],
  ["secure-random-string-generator", /^[A-Za-z0-9]+$/, true],
  ["encryption-key-generator", /^[a-f0-9]{64}$/, false],
  ["base64url-converter", /^SGVsbG8sIHdvcmxkIQ$/, true],
  ["api-key-format-validator", /Format matches/, true],
  ["api-request-header-analyzer", /Authorization is present/, true],
  ["bearer-token-formatter", /Authorization: Bearer example-token/, true],
  ["sensitive-information-detector", /Potential email addresses: 1/, true],
  ["personal-information-masker", /\[EMAIL\]/, true],
  ["security-headers-analyzer", /no site was contacted/, true],
  ["csp-generator", /Content-Security-Policy: default-src/, false],
  ["csp-analyzer", /default-src is present/, true],
  ["cookie-security-analyzer", /Secure present; HttpOnly present/, true],
  ["hsts-checker", /HSTS max-age: 31536000/, true],
  ["permissions-policy-generator", /Permissions-Policy:/, false],
  ["referrer-policy-generator", /Referrer-Policy:/, false],
  ["x-frame-options-checker", /SAMEORIGIN permits/, true],
  ["robots-security-review", /not access control/, true],
  ["browser-privacy-checker", /Secure context:/, false],
  ["browser-permission-checker", /No access was requested/, false],
  ["third-party-cookie-information", /cannot reliably determine/, false],
  ["tracking-protection-guide", /Tracking protection checklist/, false],
  ["fingerprinting-education", /does not collect/, false],
  ["privacy-settings-checklist", /Browser privacy checklist/, false],
  ["privacy-policy-generator", /Legal review required/, true],
  ["cookie-policy-generator", /Legal review required/, true],
  ["gdpr-checklist", /NOT A COMPLIANCE DETERMINATION/, false],
  ["data-retention-policy-generator", /Legal review required/, true],
  ["consent-notice-generator", /Legal review required/, true],
  ["data-processing-agreement-generator", /Legal review required/, true],
  ["email-header-analyzer", /can be forged/, true],
  ["spf-record-checker", /All mechanism: -all/, true],
  ["dkim-configuration-checker", /Public key tag: present/, true],
  ["dmarc-record-checker", /DMARC policy: reject/, true],
  ["website-privacy-config-review", /no site was contacted/, true],
  [
    "url-safety-review",
    /not a reputation check, phishing detector or live connection/i,
    true,
  ],
];
for (const [slug, expected, example] of cases) {
  test(`actual processing and reset: ${slug}`, async ({ page }) => {
    await page.goto(`/tools/${slug}`);
    const workspace = page.getByRole("group", {
      name: "Security tool workspace",
    });
    if (example)
      await workspace.getByRole("button", { name: "Load example" }).click();
    await workspace.getByRole("button", { name: "Process locally" }).click();
    await expect(workspace.getByLabel("Result")).toHaveValue(expected);
    await workspace.getByRole("button", { name: "Reset" }).click();
    await expect(workspace.getByLabel("Result")).toHaveValue("");
    if (example) {
      await workspace.getByRole("button", { name: "Process locally" }).click();
      if (slug === "hsts-checker") {
        await expect(workspace.getByLabel("Result")).toHaveValue(
          /missing or invalid max-age/,
        );
      } else {
        await expect(workspace.getByRole("alert")).toBeVisible();
        await expect(workspace.getByLabel("Result")).toHaveValue("");
      }
    }
  });
}

test("AES-GCM file upload, download and authenticated round trip", async ({
  page,
}) => {
  await page.goto("/tools/file-encryption");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  const bytes = Buffer.from("hello private file\n\u2603");
  await w
    .getByLabel("Choose a file (up to 25 MiB)")
    .setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: bytes });
  await w.getByLabel("Encryption password").fill("a secure test password");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/Encryption succeeded/);
  const pending = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download file" }).click();
  const encrypted = await pending;
  expect(encrypted.suggestedFilename()).toBe("note.txt.qkenc");
  const ciphertext = await readFile((await encrypted.path())!);
  expect(ciphertext.subarray(0, 6).toString()).toBe("QKENC1");
  expect(ciphertext.includes(bytes)).toBe(false);
  await w.getByLabel("Operation").selectOption("decode");
  await w.getByLabel("Choose a file (up to 25 MiB)").setInputFiles({
    name: "note.txt.qkenc",
    mimeType: "application/octet-stream",
    buffer: ciphertext,
  });
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/Decryption succeeded/);
  const out = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download file" }).click();
  expect(await readFile((await (await out).path())!)).toEqual(bytes);
  await w.getByLabel("Encryption password").fill("wrong password");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByRole("alert")).toContainText(
    /incorrect password or corrupted/,
  );
  await expect(w.getByRole("button", { name: "Download file" })).toHaveCount(0);
});

test("batch file checksums, manifest verification and download use real bytes", async ({
  page,
}) => {
  await page.goto("/tools/hash-generator");
  await page.getByLabel("Input source").selectOption("file");
  const a = Buffer.from("abc"),
    b = Buffer.from("different");
  await page.getByLabel("Choose a file to hash").setInputFiles([
    { name: "a.txt", mimeType: "text/plain", buffer: a },
    { name: "b.txt", mimeType: "text/plain", buffer: b },
  ]);
  const digest = (data: Buffer) =>
    createHash("sha256").update(data).digest("hex");
  await page.getByLabel(/Expected checksums/).fill(
    JSON.stringify([
      { name: "a.txt", digest: digest(a) },
      { name: "b.txt", digest: digest(b) },
    ]),
  );
  await page.getByRole("button", { name: "Generate hash" }).click();
  const result = page.getByLabel("SHA-256 hash");
  await expect(result).toHaveValue(/\[MATCH\]/);
  const report = await result.inputValue();
  expect(report).toContain(digest(a));
  expect(report).toContain(digest(b));
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download hash" }).click();
  expect(await readFile((await (await downloading).path())!, "utf8")).toBe(
    report,
  );
});

test("metadata upload, limited PDF cleaning and actual download", async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.setAuthor("Private Author");
  const source = Buffer.from(await pdf.save());
  await page.goto("/tools/pdf-metadata-viewer");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Choose a local file").setInputFiles({
    name: "input.pdf",
    mimeType: "application/pdf",
    buffer: source,
  });
  await w.getByLabel(/Remove document Info/).check();
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /BEFORE[\s\S]*Private Author[\s\S]*AFTER/,
  );
  const pending = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download file" }).click();
  const cleaned = await PDFDocument.load(
    await readFile((await (await pending).path())!),
    { updateMetadata: false },
  );
  expect(cleaned.getAuthor()).toBeUndefined();
  expect(cleaned.getPageCount()).toBe(1);
});

test("HMAC matches an independent SHA-256 implementation and copies the actual tag", async ({
  page,
  context,
}) => {
  await page.goto("/tools/hmac-generator-verifier");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Message (UTF-8, may be empty)").fill("hello");
  await w.getByLabel("Secret key (16–4096 bytes)").fill("this-is-a-long-key");
  await w.getByRole("button", { name: "Process locally" }).click();
  const expected = createHmac("sha256", "this-is-a-long-key")
    .update("hello")
    .digest("hex");
  await expect(w.getByLabel("Result")).toHaveValue(expected);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await w.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(w.getByText("Copied to clipboard.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    expected,
  );
});

test("text encryption and decryption round trip", async ({ page }) => {
  await page.goto("/tools/text-encryption");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Input").fill("private text 雪");
  await w.getByLabel("Encryption password").fill("strong test passphrase");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/^UUtFTkMx/);
  const ciphertext = await w.getByLabel("Result").inputValue();
  await w.getByLabel("Operation").selectOption("decode");
  await w.getByLabel("Input").fill(ciphertext);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue("private text 雪");
  await w.getByLabel("Encryption password").fill("wrong");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByRole("alert")).toContainText(
    "incorrect password or corrupted",
  );
});

test("hash comparison and redaction process two inputs locally", async ({
  page,
}) => {
  await page.goto("/tools/hash-comparison");
  let w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("First hexadecimal digest").fill("deadbeef");
  await w.getByLabel("Second hexadecimal digest").fill("DEADBEEF");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/digests match/);
  await w.getByLabel("Second hexadecimal digest").fill("not-hex");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByRole("alert")).toContainText("hexadecimal");
  await page.goto("/tools/text-redaction");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Text to redact").fill("Alice and Alice");
  await w.getByLabel(/Exact phrase to redact/).fill("Alice");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue("[REDACTED] and [REDACTED]");
});

test("JWT generator and verifier sign real data and reject tampering and duplicate claims", async ({
  page,
}) => {
  const key = "a-secure-local-test-key-32-bytes!!";
  await page.goto("/tools/jwt-generator");
  let w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Claims JSON").fill('{"sub":"test","exp":2000000000}');
  await w.getByLabel(/Test signing key/).fill(key);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  const token = await w.getByLabel("Result").inputValue();
  await page.goto("/tools/jwt-decoder");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel(/JWT to decode/).fill(token);
  await w.getByLabel(/Verify signature with a supplied key/).check();
  await w.getByLabel(/Shared secret/).fill(key);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/SIGNATURE VALID/);
  const [head, , signature] = token.split(".");
  const altered = Buffer.from('{"sub":"attacker","exp":2000000000}').toString(
    "base64url",
  );
  await w.getByLabel(/JWT to decode/).fill(`${head}.${altered}.${signature}`);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/SIGNATURE INVALID/);
  const duplicate = Buffer.from('{"exp":2000000000,"exp":2000000001}').toString(
    "base64url",
  );
  await w.getByLabel(/JWT to decode/).fill(`${head}.${duplicate}.${signature}`);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByRole("alert")).toContainText("duplicate members");
});

test("offline certificate SAN comparison with generated certificate", async ({
  page,
}) => {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const cert = await X509CertificateGenerator.createSelfSigned({
    name: "CN=example.com",
    keys,
    signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
    extensions: [
      new SubjectAlternativeNameExtension([
        { type: "dns", value: "example.com" },
      ]),
    ],
  });
  await page.goto("/tools/certificate-inspector");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel(/Public PEM certificate/).fill(cert.toString("pem"));
  await w.getByLabel(/DNS hostname/).fill("example.com");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/matches a DNS SAN/);
  await expect(w.getByLabel("Result")).toHaveValue(
    /not certificate validation/,
  );
  await w
    .getByLabel(/Public PEM certificate/)
    .fill("-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByRole("alert")).toContainText("Do not paste private keys");
});

test("security.txt generates and validates without contacting a site", async ({
  page,
}) => {
  await page.goto("/tools/security-txt-generator");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByRole("button", { name: "Load example" }).click();
  await w.getByLabel(/Expiration date/).fill("2099-01-01");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /Contact: mailto:security@example.com/,
  );
  await w.getByLabel(/Review pasted security.txt/).check();
  await w
    .getByLabel("Input")
    .fill(
      "Contact: mailto:security@example.com\nExpires: 2099-02-29T00:00:00Z",
    );
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/valid supported RFC 3339/);
});

test("image metadata, cleaning, file signature and DOCX properties handle uploads", async ({
  page,
}) => {
  const png = await readFile("tests/fixtures/image-to-text/blank.png");
  const input = { name: "blank.png", mimeType: "image/png", buffer: png };
  await page.goto("/tools/image-metadata-inspector");
  let w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Choose a local file").setInputFiles(input);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/Format: PNG/);
  await page.goto("/tools/image-metadata-remover");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Choose a local file").setInputFiles(input);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/BEFORE[\s\S]*AFTER/);
  const pending = page.waitForEvent("download");
  await w.getByRole("button", { name: "Download file" }).click();
  expect(
    (await readFile((await (await pending).path())!)).subarray(0, 8),
  ).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await page.goto("/tools/file-privacy-checker");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Choose a local file").setInputFiles(input);
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/Signature: PNG/);
  await expect(w.getByLabel("Result")).toHaveValue(
    /does not establish file safety/,
  );
  await page.goto("/tools/document-metadata-inspector");
  w = page.getByRole("group", { name: "Security tool workspace" });
  await w
    .getByLabel("Choose a local file")
    .setInputFiles("docs/word-to-pdf/v5.2/corpus/a-simple.docx");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(/Only common DOCX/);
});

test("DNS, DNSSEC and dual-stack IP require consent and process mocked responses", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://cloudflare-dns.com/**", (route) => {
    requests++;
    return route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "application/json",
      body: JSON.stringify({
        Status: 0,
        AD: true,
        Answer: [
          { name: "example.com", type: 1, TTL: 60, data: "203.0.113.1" },
        ],
      }),
    });
  });
  await page.route("https://api64.ipify.org/**", (route) => {
    requests++;
    return route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "application/json",
      body: '{"ip":"2001:db8::1"}',
    });
  });
  for (const slug of ["dns-lookup", "dnssec-status-checker"]) {
    await page.goto(`/tools/${slug}`);
    const w = page.getByRole("group", { name: "DNS lookup workspace" });
    await w.getByLabel("Public domain name").fill("example.com");
    await w.getByRole("button", { name: "Look up DNS" }).click();
    await expect(w.getByRole("alert")).toContainText("Confirm");
    const before = requests;
    await w.getByRole("checkbox", { name: /I agree/ }).check();
    await w.getByRole("button", { name: "Look up DNS" }).click();
    await expect(w.getByLabel("Result")).toHaveValue(
      /resolver reports successful DNSSEC validation/,
    );
    expect(requests).toBe(before + 1);
  }
  await page.goto("/tools/public-ip-information");
  const w = page.getByRole("group", { name: "Public IP lookup workspace" });
  await w.getByLabel("IP lookup mode").selectOption("any");
  await w.getByRole("button", { name: "Check public IP" }).click();
  await expect(w.getByRole("alert")).toContainText("Confirm");
  await w.getByRole("checkbox", { name: /I agree/ }).check();
  await w.getByRole("button", { name: "Check public IP" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /IPv6 observed by ipify: 2001:db8::1/,
  );
});

test("password policy checks selected requirements without exposing the sample", async ({
  page,
}) => {
  await page.goto("/tools/password-policy-generator");
  const w = page.getByRole("group", { name: "Security tool workspace" });
  await w.getByLabel("Require decimal digit").check();
  await w
    .getByLabel(/Optional password/)
    .fill("A private sample without digits");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /Missing selected requirements: decimal digit/,
  );
  await expect(w.getByLabel("Result")).not.toHaveValue(
    /A private sample without digits/,
  );
  await w
    .getByLabel(/Optional password/)
    .fill("A private sample with 3 digits");
  await w.getByRole("button", { name: "Process locally" }).click();
  await expect(w.getByLabel("Result")).toHaveValue(
    /Meets the selected composition requirements/,
  );
  await w.getByRole("button", { name: "Reset" }).click();
  await expect(w.getByLabel("Require decimal digit")).not.toBeChecked();
});
