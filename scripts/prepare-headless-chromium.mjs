#!/usr/bin/env node
/**
 * Prepare a headless Chromium for Playwright when the normal browser download
 * is unavailable (restricted egress, CI images without the Playwright/Google
 * CDNs).
 *
 * It does not install anything: install `@sparticuz/chromium` yourself first,
 * from a registry you are allowed to use:
 *
 *   npm install --no-save @sparticuz/chromium@153.0.0
 *   node scripts/prepare-headless-chromium.mjs
 *   # then copy the two values it prints and run:
 *   npx playwright test --project=chromium
 *
 * How it works: that npm package ships a Brotli-compressed Chromium build plus
 * an Amazon Linux 2023 library bundle (`libnspr4`, `libnss3`, `libnssutil3`).
 * On a Debian-family image those are the only missing shared libraries, so the
 * script extracts both and prints `LD_LIBRARY_PATH`.
 *
 * This is a local/CI verification fallback, not a product dependency: nothing in
 * the app imports it and it adds nothing to the runtime bundle.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { brotliDecompressSync } from "node:zlib";

const require = createRequire(import.meta.url);
const OUT = join(tmpdir(), "quickkit-chromium");

function fail(message) {
  console.error(`prepare-headless-chromium: ${message}`);
  process.exit(1);
}

let packageRoot;
try {
  // The package does not export ./package.json, so resolve its entry point and
  // walk up one directory (build/index.js -> package root).
  packageRoot = dirname(dirname(require.resolve("@sparticuz/chromium")));
} catch {
  fail("install it first: npm install --no-save @sparticuz/chromium@153.0.0");
}

const bin = join(packageRoot, "bin");
// The package is ESM; Node's require(esm) returns a namespace object.
const loaded = require(join(packageRoot, "build/index.js"));
const chromium = loaded.default ?? loaded;

mkdirSync(OUT, { recursive: true });

const tarPath = join(OUT, "al2023.tar");
writeFileSync(
  tarPath,
  brotliDecompressSync(readFileSync(join(bin, "al2023.tar.br"))),
);
execFileSync("tar", ["-xf", tarPath, "-C", OUT], { stdio: "inherit" });

const executable = await chromium.executablePath();
const libPath = join(OUT, "lib");

console.log(`\nChromium:  ${executable}`);
console.log(`Libraries: ${libPath}\n`);
console.log("Use them with:");
console.log(
  `  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=${executable} LD_LIBRARY_PATH=${libPath} npx playwright test --project=chromium`,
);
