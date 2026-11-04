import { describe, expect, it } from "vitest";
import * as QRCode from "qrcode";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import {
  BYTE_CAPACITY,
  fitQr,
  MAX_QR_PAYLOAD_BYTES,
  moduleCount,
  utf8Length,
} from "../lib/tools/qr/capacity";

describe("QR capacity table", () => {
  it("covers all 40 versions with four levels each", () => {
    expect(BYTE_CAPACITY).toHaveLength(40);
    for (const row of BYTE_CAPACITY) {
      expect(row).toHaveLength(4);
      // L ≥ M ≥ Q ≥ H, and monotonically increasing across versions.
      expect(row[0]).toBeGreaterThanOrEqual(row[1]);
      expect(row[1]).toBeGreaterThanOrEqual(row[2]);
      expect(row[2]).toBeGreaterThanOrEqual(row[3]);
    }
    for (let level = 0; level < 4; level += 1)
      for (let version = 1; version < 40; version += 1)
        expect(BYTE_CAPACITY[version][level]).toBeGreaterThan(
          BYTE_CAPACITY[version - 1][level],
        );
  });

  it("matches the encoder exactly at every version and level", () => {
    // 'aaaa…' is lowercase, so the encoder must use byte mode: the only mode
    // this table describes.
    const levels: QRCodeErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
    for (let version = 1; version <= 40; version += 1)
      for (const [levelIndex, level] of levels.entries()) {
        const capacity = BYTE_CAPACITY[version - 1][levelIndex];
        expect(() =>
          QRCode.create("a".repeat(capacity), {
            version,
            errorCorrectionLevel: level,
          }),
        ).not.toThrow();
        expect(() =>
          QRCode.create("a".repeat(capacity + 1), {
            version,
            errorCorrectionLevel: level,
          }),
        ).toThrow();
      }
  });

  it("reports module counts", () => {
    expect(moduleCount(1)).toBe(21);
    expect(moduleCount(40)).toBe(177);
  });
});

describe("fitQr", () => {
  it("picks the smallest version that fits", () => {
    const fit = fitQr(utf8Length("https://example.com"), "M");
    expect(fit.ok).toBe(true);
    if (fit.ok) {
      expect(fit.version).toBeLessThanOrEqual(4);
      expect(fit.modules).toBe(moduleCount(fit.version));
    }
  });

  it("suggests a free error-correction boost when the version has room", () => {
    const fit = fitQr(10, "M");
    expect(fit.ok && fit.boostTo).toBe("Q"); // H needs 7 bytes max at V1
    const tight = fitQr(BYTE_CAPACITY[0][1], "M"); // exactly V1-M
    expect(tight.ok && tight.boostTo).toBe("M");
  });

  it("refuses empty content and content over the tool ceiling", () => {
    expect(fitQr(0, "M")).toMatchObject({ ok: false, reason: "empty" });
    const big = fitQr(MAX_QR_PAYLOAD_BYTES + 500, "M");
    expect(big).toMatchObject({ ok: false, reason: "too-long" });
    if (!big.ok) expect(big.need).toBe(500);
  });

  it("counts UTF-8 bytes, not characters", () => {
    expect(utf8Length("नमस्ते")).toBe(18);
    expect(utf8Length("😀")).toBe(4);
    expect(utf8Length("ascii")).toBe(5);
  });
});
