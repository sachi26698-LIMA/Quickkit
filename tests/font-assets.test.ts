import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The browser PDF exporter embeds two Noto faces that
 * `scripts/copy-font-assets.mjs` copies into `public/fonts/export/` at build
 * time. The copy step owns exactly that one subdirectory; if it ever cleaned
 * the whole tree it would delete any other font asset living under
 * `public/fonts/`. This suite pins that boundary.
 */
const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "copy-font-assets.mjs");
const PUBLIC_FONTS = path.join(ROOT, "public", "fonts");
const EXPORT_DIR = path.join(PUBLIC_FONTS, "export");

/** The sentinel stands in for any other font asset under public/fonts. */
const SENTINEL_DIR = path.join(PUBLIC_FONTS, "__font-assets-test__", "family");
const SENTINEL_FILE = path.join(SENTINEL_DIR, "devanagari.woff2");

const createdSentinelDirs: string[] = [];

function makeSentinel() {
  mkdirSync(SENTINEL_DIR, { recursive: true });
  writeFileSync(SENTINEL_FILE, "sentinel");
  createdSentinelDirs.push(SENTINEL_DIR);
}

afterAll(() => {
  // Leave public/fonts exactly as the build step would.
  for (const directory of createdSentinelDirs) {
    rmSync(directory, { force: true, recursive: true });
  }
  const sentinelRoot = path.join(PUBLIC_FONTS, "__font-assets-test__");
  if (existsSync(sentinelRoot)) rmSync(sentinelRoot, { recursive: true });
});

describe("the font asset copy step", () => {
  it("never deletes a sibling font directory it does not own", () => {
    makeSentinel();
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    expect(existsSync(SENTINEL_FILE)).toBe(true);
    expect(readFileSync(SENTINEL_FILE, "utf8")).toBe("sentinel");
  });

  it("copies the two Noto faces the PDF exporter embeds", () => {
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    expect(existsSync(path.join(EXPORT_DIR, "NotoSans-Regular.ttf"))).toBe(
      true,
    );
    expect(existsSync(path.join(EXPORT_DIR, "NotoSans-Bold.ttf"))).toBe(true);
  });

  it("ships the SIL OFL licence alongside the faces", () => {
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    expect(existsSync(path.join(EXPORT_DIR, "LICENSE.txt"))).toBe(true);
  });

  it("writes only inside its own subdirectory", () => {
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    const entries = readdirSync(PUBLIC_FONTS).sort();
    for (const entry of entries) {
      expect(["export", "__font-assets-test__"]).toContain(entry);
    }
  });

  it("points the exporter at the same path the copy step writes", () => {
    const source = readFileSync(
      path.join(ROOT, "lib", "tools", "launch", "export-document.ts"),
      "utf8",
    );
    const urls = [...source.matchAll(/"(\/fonts\/[^"]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const onDisk = path.join(ROOT, "public", url);
      expect(existsSync(onDisk), `${url} should exist in public/`).toBe(true);
    }
  });

  it("keeps public/fonts out of git so the copy stays generated", () => {
    const ignored = execFileSync(
      "git",
      ["check-ignore", "-v", "public/fonts/export/NotoSans-Regular.ttf"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(ignored).toContain(".gitignore");
  });
});
