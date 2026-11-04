import { describe, expect, it } from "vitest";
import { normalizeRotation } from "../lib/tools/image-convert-runner";

describe("normalizeRotation", () => {
  it("passes a clean quarter turn through untouched", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(270)).toBe(270);
  });

  it("wraps a full turn back to zero", () => {
    // The UI increments by 90 forever; 360 must land on 0, not on an angle
    // pdf-lib has to interpret.
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(720)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
  });

  it("snaps an off-grid angle to the nearest quarter turn", () => {
    expect(normalizeRotation(10)).toBe(0);
    expect(normalizeRotation(44)).toBe(0);
    expect(normalizeRotation(46)).toBe(90);
    expect(normalizeRotation(130)).toBe(90);
    expect(normalizeRotation(136)).toBe(180);
    expect(normalizeRotation(224)).toBe(180);
    expect(normalizeRotation(226)).toBe(270);
    expect(normalizeRotation(314)).toBe(270);
    expect(normalizeRotation(316)).toBe(0);
  });

  it("treats negative angles as clockwise equivalents", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(-180)).toBe(180);
    expect(normalizeRotation(-270)).toBe(90);
    expect(normalizeRotation(-360)).toBe(0);
  });

  it("never returns a non-quarter-turn value for junk input", () => {
    // A blank settings field or a corrupt queue entry must not produce an
    // angle pdf-lib would place sideways.
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])
      expect(normalizeRotation(value)).toBe(0);
  });

  it("always returns one of the four supported angles", () => {
    for (let degrees = -720; degrees <= 720; degrees += 7) {
      expect([0, 90, 180, 270]).toContain(normalizeRotation(degrees));
    }
  });
});

describe("runPdfStudio load failures", () => {
  it("blames a corrupt file on corruption, not on a password it does not have", async () => {
    // Regression: the catch around PDFDocument.load used to report every
    // failure as "Password-protected PDFs are not supported yet", so a user
    // with a merely corrupt or truncated PDF was told to remove a password
    // that was never there. pdf-lib throws MissingPDFHeaderError for garbage
    // bytes and EncryptedPDFError only for real encryption, so the two are
    // distinguishable.
    const { runPdfStudio } = await import("../lib/tools/image-convert-runner");
    const { defaultPdfStudioSettings, buildPageList } =
      await import("../lib/tools/pdf-studio");

    const file = new File(
      [new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])],
      "junk.pdf",
      {
        type: "application/pdf",
      },
    );
    const sources = [{ name: "junk.pdf", pages: 1, bytes: 8 }];

    await expect(
      runPdfStudio({
        files: [file],
        pages: buildPageList(sources),
        action: "merge",
        settings: defaultPdfStudioSettings(),
        sources,
      }),
    ).rejects.toThrow(/corrupt or truncated/i);

    await expect(
      runPdfStudio({
        files: [file],
        pages: buildPageList(sources),
        action: "merge",
        settings: defaultPdfStudioSettings(),
        sources,
      }),
    ).rejects.not.toThrow(/password/i);
  });
});
