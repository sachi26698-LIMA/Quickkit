import { describe, it, expect } from "vitest";
import { buildPayload } from "../lib/tools/qr/payload";
import { MAX_QR_PAYLOAD_BYTES, utf8Length } from "../lib/tools/qr/capacity";
import { validateImage, formatBytes } from "../lib/tools/image";
describe("QR input", () => {
  it("normalises a bare web address and passes text through untouched", () => {
    expect(buildPayload("url", { url: "example.com/pricing?src=qr" })).toBe(
      "https://example.com/pricing?src=qr",
    );
    expect(buildPayload("text", { text: "Hello 😀" })).toBe("Hello 😀");
  });
  it("rejects empty content", () =>
    expect(() => buildPayload("text", { text: "   " })).toThrow());
  it("counts UTF-8 bytes and refuses oversized payloads", () => {
    expect(utf8Length("abc")).toBe(3);
    expect(MAX_QR_PAYLOAD_BYTES).toBe(2500);
    expect(() => buildPayload("text", { text: "a".repeat(2501) })).toThrow(
      "2,500",
    );
  });
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
