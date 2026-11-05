/**
 * Provision a real Chromium for the Phase J Playwright E2E in network-restricted
 * environments (where `npx playwright install` cannot reach the Playwright CDN).
 *
 * It pulls @sparticuz/chromium from the npm registry (a real Chromium build plus
 * the shared libraries it needs), extracts the binary to /tmp/chromium and the
 * libraries to /tmp/al2023, then prints the environment variables to run the
 * suite with. Nothing here is added to package.json.
 *
 * Usage:
 *   node scripts/setup-e2e-browser.mjs
 *   # then export the printed lines (or eval them) and run:
 *   npx playwright test tests/e2e/qr-studio-v3.spec.ts tests/e2e/qr-studio-v3-visual.spec.ts --project=chromium
 *
 * In an unrestricted environment you can skip this script entirely and use
 * `npx playwright install chromium` instead.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

try {
  require.resolve("@sparticuz/chromium");
} catch {
  console.log("Installing @sparticuz/chromium from the npm registry…");
  execSync("npm install --no-save --ignore-scripts @sparticuz/chromium", {
    stdio: "inherit",
  });
}

const chromium = require("@sparticuz/chromium").default;
const { inflate } = require("@sparticuz/chromium");
const bin = path.join(
  path.dirname(require.resolve("@sparticuz/chromium/package.json")),
  "bin",
);

const executable = await chromium.executablePath();
for (const archive of ["al2023.tar.br", "fonts.tar.br", "swiftshader.tar.br"]) {
  await inflate(path.join(bin, archive));
}

console.log("\n# Export these before running Playwright:");
console.log(`export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=${executable}`);
console.log(`export LD_LIBRARY_PATH=/tmp/al2023/lib:$LD_LIBRARY_PATH`);
console.log(`export FONTCONFIG_PATH=/tmp/fonts`);
console.log("\n# Then:");
console.log(
  "# npx playwright test tests/e2e/qr-studio-v3.spec.ts tests/e2e/qr-studio-v3-visual.spec.ts --project=chromium",
);
