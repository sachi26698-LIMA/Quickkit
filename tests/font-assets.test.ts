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
 * `public/fonts/` is shared between the browser PDF exporter and the BioCraft
 * font library. The exporter's copy step owns one subdirectory; if it ever
 * cleans the whole tree again it deletes the committed WOFF2 faces and every
 * BioCraft specimen page fails to load its font. This suite pins that boundary.
 */
const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "copy-font-assets.mjs");
const PUBLIC_FONTS = path.join(ROOT, "public", "fonts");
const EXPORT_DIR = path.join(PUBLIC_FONTS, "export");

/** The sentinel stands in for the committed BioCraft font library. */
const SENTINEL_DIR = path.join(PUBLIC_FONTS, "hindi", "__font-assets-test__");
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
  const hindi = path.join(PUBLIC_FONTS, "hindi");
  if (existsSync(hindi) && readdirSync(hindi).length === 0)
    rmSync(hindi, { recursive: true });
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
      expect(["export", "hindi"]).toContain(entry);
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
