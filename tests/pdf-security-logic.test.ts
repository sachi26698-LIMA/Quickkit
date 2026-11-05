import { describe, expect, it } from "vitest";

import {
  ALL_ALLOWED_PERMISSIONS,
  DEFAULT_PDF_PERMISSIONS,
  PDF_SECURITY_LIMITS,
  assessPasswordStrength,
  buildZipFilename,
  defaultOutputName,
  makeUniqueOutputNames,
  permissionArgs,
  permissionsFromFlags,
  permissionsMatch,
  validateExistingPassword,
  validateLockSettings,
  validateNewPassword,
  validatePdfSecurityCandidate,
  type PdfLockSettings,
} from "@/lib/tools/pdf/security-logic";

const baseSettings: PdfLockSettings = {
  algorithm: "AES-256",
  confirmPassword: "correct horse battery",
  openPassword: "correct horse battery",
  permissions: { ...DEFAULT_PDF_PERMISSIONS },
};

describe("PDF security password validation", () => {
  it("requires a matching open password of at least 8 characters", () => {
    expect(
      validateLockSettings({
        ...baseSettings,
        openPassword: "short",
        confirmPassword: "short",
      }).ok,
    ).toBe(false);
    expect(
      validateLockSettings({ ...baseSettings, confirmPassword: "different" })
        .message,
    ).toMatch(/do not match/);
    expect(validateLockSettings(baseSettings).ok).toBe(true);
  });

  it("accepts Unicode and special characters for AES-256 up to 127 bytes", () => {
    const password = "pässwörd-🔐-!@#$%^&*()_+";
    expect(validateNewPassword(password, "AES-256").ok).toBe(true);
    expect(validateNewPassword("π".repeat(64), "AES-256").ok).toBe(false); // 128 bytes
    expect(validateNewPassword("π".repeat(63), "AES-256").ok).toBe(true); // 126 bytes
  });

  it("restricts AES-128 compatibility passwords to printable ASCII and 32 bytes", () => {
    expect(validateNewPassword("AsciiPass123!", "AES-128").ok).toBe(true);
    expect(validateNewPassword("pässwörd", "AES-128").ok).toBe(false);
    expect(validateNewPassword("a".repeat(33), "AES-128").ok).toBe(false);
  });

  it("rejects control characters and lone surrogates", () => {
    expect(validateNewPassword("password\u0000", "AES-256").ok).toBe(false);
    expect(validateNewPassword("password\ud800", "AES-256").ok).toBe(false);
  });

  it("requires a separate owner password when one is supplied", () => {
    expect(
      validateLockSettings({
        ...baseSettings,
        ownerPassword: baseSettings.openPassword,
        ownerConfirmPassword: baseSettings.openPassword,
      }).message,
    ).toMatch(/different/);
    expect(
      validateLockSettings({
        ...baseSettings,
        ownerPassword: "owner password",
        ownerConfirmPassword: "mismatch",
      }).message,
    ).toMatch(/do not match/);
    expect(
      validateLockSettings({
        ...baseSettings,
        ownerPassword: "owner password",
        ownerConfirmPassword: "owner password",
      }).ok,
    ).toBe(true);
  });

  it("validates existing unlock passwords without imposing new-password rules", () => {
    expect(validateExistingPassword("x").ok).toBe(true);
    expect(validateExistingPassword("").ok).toBe(false);
    expect(validateExistingPassword("π".repeat(64)).ok).toBe(false);
  });
});

describe("PDF security permissions", () => {
  it("maps permission switches to QPDF flags", () => {
    const args = permissionArgs(DEFAULT_PDF_PERMISSIONS);
    expect(args).toContain("--print=none");
    expect(args).toContain("--extract=n");
    expect(args).toContain("--form=y");
    expect(args).toContain("--accessibility=y");
    const high = permissionArgs({ ...ALL_ALLOWED_PERMISSIONS });
    expect(high).toContain("--print=full");
    expect(high).toContain("--modify=all");
    expect(high).toContain("--extract=y");
  });

  it("round-trips standard /P permission bits", () => {
    // QPDF writes reserved high bits; the lower 12 bits carry the switches.
    const flags = -3100;
    const decoded = permissionsFromFlags(flags);
    expect(decoded.printing).toBe(true);
    expect(decoded.highResolutionPrinting).toBe(false);
    expect(decoded.annotating).toBe(true);
    expect(decoded.fillingForms).toBe(true);
    expect(decoded.contentAccessibility).toBe(true);
    expect(decoded.copying).toBe(false);
    expect(decoded.modifying).toBe(false);
    expect(permissionsMatch(decoded, decoded)).toBe(true);
  });

  it("ignores high-resolution printing when printing is disabled", () => {
    const expected = {
      ...DEFAULT_PDF_PERMISSIONS,
      printing: false,
      highResolutionPrinting: true,
    };
    const actual = {
      ...DEFAULT_PDF_PERMISSIONS,
      printing: false,
      highResolutionPrinting: false,
    };
    expect(permissionsMatch(expected, actual)).toBe(true);
  });
});

describe("PDF security strength meter and file helpers", () => {
  it("scores empty, weak and strong passwords conservatively", () => {
    expect(assessPasswordStrength("").score).toBe(0);
    expect(assessPasswordStrength("password").score).toBeLessThanOrEqual(1);
    expect(
      assessPasswordStrength("G7!xQ2#vL9@pR4sT").score,
    ).toBeGreaterThanOrEqual(3);
  });

  it("validates file candidates against local safety limits", () => {
    expect(
      validatePdfSecurityCandidate({ name: "a.pdf", size: 10 }, 0, 0),
    ).toBeNull();
    expect(
      validatePdfSecurityCandidate({ name: "a.txt", size: 10 }, 0, 0)?.code,
    ).toBe("invalid_pdf");
    expect(
      validatePdfSecurityCandidate({ name: "a.pdf", size: 0 }, 0, 0)?.code,
    ).toBe("invalid_pdf");
    expect(
      validatePdfSecurityCandidate(
        { name: "a.pdf", size: PDF_SECURITY_LIMITS.maxFileBytes + 1 },
        0,
        0,
      )?.code,
    ).toBe("file_too_large");
    expect(
      validatePdfSecurityCandidate(
        { name: "a.pdf", size: 10 },
        PDF_SECURITY_LIMITS.maxFiles,
        0,
      )?.code,
    ).toBe("too_many_files");
  });

  it("builds suffixed output names and unique ZIP entry names", () => {
    expect(defaultOutputName("Report.pdf", "lock")).toBe("Report-locked.pdf");
    expect(defaultOutputName("Report.pdf", "unlock")).toBe(
      "Report-unlocked.pdf",
    );
    expect(makeUniqueOutputNames(["a.pdf", "a.pdf", "A.pdf"])).toEqual([
      "a.pdf",
      "a-2.pdf",
      "A-3.pdf",
    ]);
    expect(buildZipFilename("lock")).toBe("quickkit-locked-pdfs.zip");
    expect(buildZipFilename("unlock")).toBe("quickkit-unlocked-pdfs.zip");
  });
});
