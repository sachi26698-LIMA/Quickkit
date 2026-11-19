import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectFontBuffer } from "../lib/fonts/inspect";

function file(path: string) {
  return readFileSync(`${process.cwd()}${path}`);
}

describe("admin font pre-flight inspection", () => {
  it("passes a real verified Devanagari WOFF2", () => {
    const report = inspectFontBuffer(
      file("/public/fonts/hindi/noto-sans-devanagari/devanagari.woff2"),
      "NotoSansDevanagari.woff2",
    );
    expect(report.status).not.toBe("fail");
    expect(report.family).toBe("Noto Sans Devanagari");
    expect(report.checks.devanagariCoverage).toBeGreaterThanOrEqual(99);
    expect(report.checks.conjunctsSingleGlyph).toBeGreaterThan(3);
    expect(report.checks.numeralsRendered).toBe(10);
    expect(report.checks.matrasRendered).toBe(8);
    expect(report.variableAxes.wght).toBeTruthy();
    expect(report.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.bytes).toBeGreaterThan(1000);
  });

  it("rejects a Latin-only font with an explicit Devanagari coverage error", () => {
    const report = inspectFontBuffer(
      file("/app/fonts/geist-latin-variable.woff2"),
      "Geist.woff2",
    );
    expect(report.status).toBe("fail");
    expect(
      report.issues.some((issue) => issue.code === "devanagari_coverage"),
    ).toBe(true);
    expect(report.checks.devanagariCoverage).toBeLessThan(10);
  });

  it("rejects a non-font payload instead of trusting the extension", () => {
    const report = inspectFontBuffer(Buffer.from("not a font"), "fake.woff2");
    expect(report.status).toBe("fail");
    expect(report.issues[0].code).toBe("decode_failed");
    expect(report.glyphCount).toBe(0);
  });

  it("suggests a safe publish slug", () => {
    const report = inspectFontBuffer(
      file("/public/fonts/hindi/kalam/devanagari-400.woff2"),
      "Kalam.woff2",
    );
    expect(report.suggestedTheme.slug).toMatch(/^[a-z0-9-]+$/);
    expect(report.suggestedTheme.slug.length).toBeLessThanOrEqual(64);
  });
});
