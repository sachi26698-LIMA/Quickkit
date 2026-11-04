import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import createModule from "@neslinesli93/qpdf-wasm";
import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  PDFStream,
  StandardFonts,
  decodePDFRawStream,
  degrees,
} from "@cantoo/pdf-lib";

import {
  createQpdfRunner,
  inspectPdfSecurity,
  lockPdfBytes,
  unlockPdfBytes,
  verifyPdfPassword,
  type QpdfRunner,
} from "@/lib/tools/pdf/security-engine";
import {
  ALL_ALLOWED_PERMISSIONS,
  DEFAULT_PDF_PERMISSIONS,
  type PdfLockSettings,
} from "@/lib/tools/pdf/security-logic";
import { createSignedLikePdf } from "./tools/pdf-merge-fixtures";

let runner: QpdfRunner;

const wasmPath = fileURLToPath(
  new URL(
    "../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
    import.meta.url,
  ),
);

beforeAll(async () => {
  runner = await createQpdfRunner({
    factory: createModule as unknown as Parameters<
      typeof createQpdfRunner
    >[0]["factory"],
    locateFile: () => wasmPath,
  });
});

async function createPdf(
  pages = 2,
  title = "Security fixture",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle(title);
  doc.setAuthor("QUICKKIT Tests");
  doc.setSubject("Lock & unlock");
  doc.setKeywords(["pdf", "security", "test"]);
  doc.setCreator("Fixture Creator");
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([300 + index * 10, 400 + index * 5]);
    if (index % 2 === 1) page.setRotation(degrees(90));
    page.drawText(`PAGE-MARKER-${index + 1}`, {
      font,
      size: 14,
      x: 24,
      y: 350,
    });
  }
  return doc.save({ useObjectStreams: false });
}

async function asyncContentHash(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const hash = createHash("sha256");
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams: PDFStream[] = [];
    if (contents instanceof PDFArray) {
      for (let i = 0; i < contents.size(); i += 1) {
        const stream = doc.context.lookup(contents.get(i), PDFStream);
        if (stream) streams.push(stream);
      }
    } else if (contents instanceof PDFStream) {
      streams.push(contents);
    }
    for (const stream of streams) {
      const decoded =
        stream instanceof PDFRawStream
          ? decodePDFRawStream(stream).decode()
          : stream.getContents();
      hash.update(decoded);
    }
  }
  return hash.digest("hex");
}

const settings: PdfLockSettings = {
  algorithm: "AES-256",
  confirmPassword: "open-password-123",
  openPassword: "open-password-123",
  ownerPassword: "owner-password-456",
  ownerConfirmPassword: "owner-password-456",
  permissions: { ...DEFAULT_PDF_PERMISSIONS },
};

describe("PDF security engine (real QPDF WASM)", () => {
  it("inspects normal and encrypted PDFs without altering them", async () => {
    const plain = await createPdf(3);
    const inspection = await inspectPdfSecurity(plain, runner);
    expect(inspection.encrypted).toBe(false);
    expect(inspection.pageCount).toBe(3);
    expect(inspection.metadata.title).toBe("Security fixture");

    const locked = await lockPdfBytes(plain, runner, settings);
    const encryptedInspection = await inspectPdfSecurity(locked.bytes, runner);
    expect(encryptedInspection.encrypted).toBe(true);
    expect(encryptedInspection.encryption?.algorithm).toBe("AES-256");
    expect(encryptedInspection.pageCount).toBe(3);
  });

  it("locks with AES-256, verifies permissions and preserves content/metadata", async () => {
    const plain = await createPdf(2);
    const originalHash = await asyncContentHash(plain);
    const result = await lockPdfBytes(plain, runner, settings);
    expect(result.verification.encrypted).toBe(true);
    expect(result.verification.algorithm).toBe("AES-256");
    expect(result.verification.permissionsVerified).toBe(true);
    expect(result.verification.openPasswordVerified).toBe(true);
    expect(result.verification.geometryVerified).toBe(true);
    expect(result.verification.metadataVerified).toBe(true);
    expect(result.inspection.pageCount).toBe(2);
    expect(result.inspection.metadata.title).toBe("Security fixture");
    expect(result.inspection.metadata.author).toBe("QUICKKIT Tests");

    const unlocked = await unlockPdfBytes(result.bytes, runner, {
      authorized: true,
      password: settings.openPassword,
    });
    expect(unlocked.verification.encrypted).toBe(false);
    expect(await asyncContentHash(unlocked.bytes)).toBe(originalHash);
    expect(unlocked.inspection.metadata.title).toBe("Security fixture");
  });

  it("supports AES-128 compatibility mode and all-allowed permissions", async () => {
    const plain = await createPdf(1);
    const result = await lockPdfBytes(plain, runner, {
      ...settings,
      algorithm: "AES-128",
      openPassword: "AsciiPass123!",
      confirmPassword: "AsciiPass123!",
      ownerPassword: "OwnerPass456!",
      ownerConfirmPassword: "OwnerPass456!",
      permissions: { ...ALL_ALLOWED_PERMISSIONS },
    });
    expect(result.verification.algorithm).toBe("AES-128");
    expect(result.inspection.encryption?.algorithm).toBe("AES-128");
    expect(result.verification.permissionsVerified).toBe(true);
  });

  it("accepts Unicode and special-character passwords with AES-256", async () => {
    const plain = await createPdf(1);
    const password = "pässwörd-🔐-!@#$%^&*()_+";
    const result = await lockPdfBytes(plain, runner, {
      ...settings,
      openPassword: password,
      confirmPassword: password,
      ownerPassword: "owner-π-🔑",
      ownerConfirmPassword: "owner-π-🔑",
    });
    const verified = await verifyPdfPassword(result.bytes, runner, password);
    expect(verified.valid).toBe(true);
    const unlocked = await unlockPdfBytes(result.bytes, runner, {
      authorized: true,
      password,
    });
    expect(unlocked.verification.encrypted).toBe(false);
  });

  it("rejects incorrect passwords without damaging the original", async () => {
    const plain = await createPdf(1);
    const locked = await lockPdfBytes(plain, runner, settings);
    const originalHash = await asyncContentHash(plain);
    await expect(
      unlockPdfBytes(locked.bytes, runner, {
        authorized: true,
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({ code: "password_invalid" });
    await expect(
      verifyPdfPassword(locked.bytes, runner, "wrong-password"),
    ).rejects.toMatchObject({ code: "password_invalid" });
    // The locked file still opens with the correct password.
    const verified = await verifyPdfPassword(
      locked.bytes,
      runner,
      settings.openPassword,
    );
    expect(verified.valid).toBe(true);
    expect(await asyncContentHash(plain)).toBe(originalHash);
  });

  it("requires authorization and a password for encrypted PDFs", async () => {
    const plain = await createPdf(1);
    const locked = await lockPdfBytes(plain, runner, settings);
    await expect(
      unlockPdfBytes(locked.bytes, runner, {
        authorized: false,
        password: settings.openPassword,
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      unlockPdfBytes(locked.bytes, runner, { authorized: true }),
    ).rejects.toMatchObject({ code: "password_required" });
  });

  it("returns an unchanged copy for already-unencrypted PDFs", async () => {
    const plain = await createPdf(1);
    const result = await unlockPdfBytes(plain, runner, { authorized: true });
    expect(result.verification.encrypted).toBe(false);
    expect(result.bytes).toEqual(plain);
    expect(result.notices.join(" ")).toMatch(/already unencrypted/i);
  });

  it("re-locks an already encrypted PDF with its current password", async () => {
    const plain = await createPdf(1);
    const first = await lockPdfBytes(plain, runner, settings);
    const second = await lockPdfBytes(
      first.bytes,
      runner,
      {
        ...settings,
        openPassword: "new-open-password",
        confirmPassword: "new-open-password",
        ownerPassword: "new-owner-password",
        ownerConfirmPassword: "new-owner-password",
      },
      { currentPassword: settings.openPassword },
    );
    expect(second.verification.encrypted).toBe(true);
    await expect(
      verifyPdfPassword(second.bytes, runner, settings.openPassword),
    ).rejects.toMatchObject({ code: "password_invalid" });
    expect(
      (await verifyPdfPassword(second.bytes, runner, "new-open-password"))
        .valid,
    ).toBe(true);
  });

  it("blocks digitally signed PDFs", async () => {
    const signed = await createSignedLikePdf();
    await expect(lockPdfBytes(signed, runner, settings)).rejects.toMatchObject({
      code: "signed_pdf",
    });
    await expect(
      unlockPdfBytes(signed, runner, { authorized: true }),
    ).rejects.toMatchObject({ code: "signed_pdf" });
  });

  it("rejects empty and corrupted files", async () => {
    await expect(
      inspectPdfSecurity(new Uint8Array(0), runner),
    ).rejects.toMatchObject({ code: "invalid_pdf" });
    await expect(
      inspectPdfSecurity(new Uint8Array([1, 2, 3, 4]), runner),
    ).rejects.toMatchObject({ code: "invalid_pdf" });
    await expect(
      lockPdfBytes(new Uint8Array([1, 2, 3]), runner, settings),
    ).rejects.toMatchObject({ code: "invalid_pdf" });
  });

  it("handles a 1,000-page document without truncation", async () => {
    const plain = await createPdf(1000, "Large fixture");
    const result = await lockPdfBytes(plain, runner, settings);
    expect(result.inspection.pageCount).toBe(1000);
    expect(result.verification.pageCount).toBe(1000);
    const unlocked = await unlockPdfBytes(result.bytes, runner, {
      authorized: true,
      password: settings.openPassword,
    });
    expect(unlocked.inspection.pageCount).toBe(1000);
    expect(await asyncContentHash(unlocked.bytes)).toBe(
      await asyncContentHash(plain),
    );
  }, 120_000);

  it("validates lock settings before processing", async () => {
    const plain = await createPdf(1);
    await expect(
      lockPdfBytes(plain, runner, { ...settings, confirmPassword: "mismatch" }),
    ).rejects.toMatchObject({ code: "invalid_settings" });
    await expect(
      lockPdfBytes(plain, runner, {
        ...settings,
        algorithm: "AES-128",
        openPassword: "pässwörd",
        confirmPassword: "pässwörd",
      }),
    ).rejects.toMatchObject({ code: "invalid_settings" });
  });
});
