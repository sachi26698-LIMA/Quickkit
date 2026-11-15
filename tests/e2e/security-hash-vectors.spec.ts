import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

for (const algorithm of [
  "MD5",
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
] as const) {
  test(`${algorithm} hashes Unicode text and file bytes against Node`, async ({
    page,
  }) => {
    await page.goto("/tools/hash-generator");
    await page.getByLabel("Hash algorithm").selectOption(algorithm);
    const bytes = Buffer.from("Security test 🔐\n");
    const digest = createHash(algorithm.replace("-", "").toLowerCase())
      .update(bytes)
      .digest("hex");
    await page.getByLabel("Text to hash").fill(bytes.toString());
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByLabel(`${algorithm} hash`)).toHaveValue(digest);
    if (algorithm === "MD5" || algorithm === "SHA-1")
      await expect(
        page.getByText(/legacy digest is not recommended/),
      ).toBeVisible();
    await page.getByLabel("Input source").selectOption("file");
    await page.getByLabel("Choose a file to hash").setInputFiles({
      name: "vector.txt",
      mimeType: "text/plain",
      buffer: bytes,
    });
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByLabel(`${algorithm} hash`)).toHaveValue(digest);
  });
}
