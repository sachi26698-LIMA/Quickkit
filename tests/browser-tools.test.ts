import { describe, it, expect } from "vitest";
import { validateQr } from "../lib/tools/qr";
import { validateImage, formatBytes } from "../lib/tools/image";
describe("QR input", () => {
  it("accepts plain text and opaque URL-like content", () =>
    expect(validateQr("https://example.com")).toBe("https://example.com"));
  it("rejects empty content", () => expect(() => validateQr("  ")).toThrow());
  it("counts UTF-8 bytes", () =>
    expect(() => validateQr("😀".repeat(501))).toThrow("2,000"));
});
describe("image validation", () => {
  it("accepts supported formats", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(() => validateImage({ type, size: 100 })).not.toThrow();
  });
  it("rejects incorrect and empty files", () => {
    for (const file of [
      { type: "text/plain", size: 100 },
      { type: "image/png", size: 0 },
      { type: "image/jpeg", size: 16 * 1024 * 1024 },
    ])
      expect(() => validateImage(file)).toThrow();
  });
  it("formats sizes", () => {
    expect(formatBytes(100)).toBe("100 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});
