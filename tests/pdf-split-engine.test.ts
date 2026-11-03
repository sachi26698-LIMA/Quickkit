import { PDFDocument, PDFPageLeaf } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";

import { splitPdfBytes } from "@/lib/tools/pdf/merge-engine";
import { PDF_SPLIT_LIMITS } from "@/lib/tools/pdf/split-pdf-logic";
import {
  allStreamText,
  createEncryptedPdf,
  createFormPdf,
  createLinkedPdf,
  createSignedLikePdf,
  createSimplePdf,
  createXfaLikePdf,
  pageMarkerText,
} from "./tools/pdf-merge-fixtures";

const yieldControl = async () => undefined;

describe("PDF split engine", () => {
  it("creates independently validated outputs in source order", async () => {
    const source = await createSimplePdf(
      ["SPLIT-1", "SPLIT-2", "SPLIT-3", "SPLIT-4", "SPLIT-5"],
      { size: [612, 792] },
    );

    const result = await splitPdfBytes(
      source,
      "Source.pdf",
      [
        { pageIndices: [0, 2], title: "First selection" },
        { pageIndices: [1], title: "Second selection" },
        { pageIndices: [3, 4], title: "Final pages" },
      ],
      { yieldControl },
    );

    expect(result.outputs.map((output) => output.pageCount)).toEqual([2, 1, 2]);
    expect(await pageMarkerText(result.outputs[0].bytes)).toEqual([
      expect.stringContaining("SPLIT-1"),
      expect.stringContaining("SPLIT-3"),
    ]);
    expect(await pageMarkerText(result.outputs[1].bytes)).toEqual([
      expect.stringContaining("SPLIT-2"),
    ]);
    expect(await pageMarkerText(result.outputs[2].bytes)).toEqual([
      expect.stringContaining("SPLIT-4"),
      expect.stringContaining("SPLIT-5"),
    ]);

    const first = await PDFDocument.load(result.outputs[0].bytes);
    expect(first.getTitle()).toBe("First selection");
    expect(first.getCreator()).toBe("QUICKKIT PDF Splitter");
    expect(first.getPages().map((page) => page.getSize())).toEqual([
      { height: 792, width: 612 },
      { height: 792, width: 612 },
    ]);
    expect(first.getPages().map((page) => page.getRotation().angle)).toEqual([
      0, 0,
    ]);
    const second = await PDFDocument.load(result.outputs[1].bytes);
    expect(second.getPage(0).getRotation().angle).toBe(90);
  });

  it("prunes unselected page content and repairs only in-output destinations", async () => {
    const source = await createLinkedPdf();
    const result = await splitPdfBytes(
      source,
      "Linked.pdf",
      [{ pageIndices: [0, 2], title: "Linked selection" }],
      { yieldControl },
    );

    const output = result.outputs[0].bytes;
    const doc = await PDFDocument.load(output, { updateMetadata: false });
    const leaves = doc.context
      .enumerateIndirectObjects()
      .filter(([, object]) => object instanceof PDFPageLeaf);
    expect(leaves).toHaveLength(2);
    expect(await allStreamText(output)).not.toContain("LINK-OMITTED-SECRET");
    expect(result.removedDestinations).toBeGreaterThanOrEqual(1);
    expect(result.removedLinkAnnotations).toBeGreaterThanOrEqual(1);
  });

  it("flattens a supported form and leaves no AcroForm in the split output", async () => {
    const source = await createFormPdf();
    const result = await splitPdfBytes(
      source,
      "Form.pdf",
      [{ pageIndices: [0], title: "Flattened form" }],
      { yieldControl },
    );

    const reopened = await PDFDocument.load(result.outputs[0].bytes, {
      updateMetadata: false,
    });
    expect(reopened.catalog.AcroForm()).toBeUndefined();
    expect(await allStreamText(result.outputs[0].bytes)).toContain(
      "FORM-VALUE-KEEP",
    );
    expect(result.notices).toContain(
      "Interactive form fields were flattened to static page content in the split PDFs.",
    );
  });

  it("accepts an open password and returns unencrypted split outputs", async () => {
    const source = await createEncryptedPdf();
    await expect(
      splitPdfBytes(
        source,
        "Secret.pdf",
        [{ pageIndices: [0], title: "Locked" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({ code: "password_required" });

    const result = await splitPdfBytes(
      source,
      "Secret.pdf",
      [
        { pageIndices: [0], title: "First secret page" },
        { pageIndices: [1], title: "Second secret page" },
      ],
      { password: "correct horse", yieldControl },
    );

    for (const output of result.outputs) {
      const reopened = await PDFDocument.load(output.bytes);
      expect(reopened.isEncrypted).toBe(false);
    }
    expect(await pageMarkerText(result.outputs[0].bytes)).toEqual([
      expect.stringContaining("ENCRYPTED-SELECTED"),
    ]);
    expect(await pageMarkerText(result.outputs[1].bytes)).toEqual([
      expect.stringContaining("ENCRYPTED-SECOND"),
    ]);
    expect(result.notices).toContain(
      "The source open password is not re-applied; split PDFs are unencrypted.",
    );
  });

  it("blocks signed-like and XFA-like PDFs with actionable split errors", async () => {
    await expect(
      splitPdfBytes(
        await createSignedLikePdf(),
        "Signed.pdf",
        [{ pageIndices: [0], title: "Signed" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({
      code: "signed_pdf",
      message: expect.stringContaining("Splitting is blocked"),
    });

    await expect(
      splitPdfBytes(
        await createXfaLikePdf(),
        "XFA.pdf",
        [{ pageIndices: [0], title: "XFA" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({
      code: "unsupported_xfa",
      message: expect.stringContaining("cannot be split safely"),
    });
  });

  it("rejects corrupt, oversized and invalid split selections explicitly", async () => {
    await expect(
      splitPdfBytes(
        new TextEncoder().encode("not a pdf"),
        "Broken.pdf",
        [{ pageIndices: [0], title: "Broken" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({ code: "invalid_pdf" });

    await expect(
      splitPdfBytes(
        new Uint8Array(PDF_SPLIT_LIMITS.maxSourceBytes + 1),
        "Large.pdf",
        [{ pageIndices: [0], title: "Large" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({ code: "file_too_large" });

    const source = await createSimplePdf(["ONLY-1", "ONLY-2"]);
    await expect(
      splitPdfBytes(
        source,
        "Two pages.pdf",
        [{ pageIndices: [0, 0], title: "Duplicate" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({ code: "duplicate_page_selection" });
    await expect(
      splitPdfBytes(
        source,
        "Two pages.pdf",
        [{ pageIndices: [2], title: "Outside" }],
        { yieldControl },
      ),
    ).rejects.toMatchObject({ code: "invalid_page_range" });
  });
});
