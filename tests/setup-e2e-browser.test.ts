import { describe, expect, it } from "vitest";
import { chromiumBinDirectory } from "../scripts/setup-e2e-browser.mjs";

describe("network-restricted Playwright Chromium setup", () => {
  it("resolves the binary archive directory from the package's exported entry point", () => {
    expect(
      chromiumBinDirectory(
        "/workspace/node_modules/@sparticuz/chromium/build/index.js",
      ),
    ).toBe("/workspace/node_modules/@sparticuz/chromium/bin");
  });
});
