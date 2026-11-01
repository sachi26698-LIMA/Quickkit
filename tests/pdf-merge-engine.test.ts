import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFPageLeaf,
  PDFRef,
} from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";

import { inspectPdfBytes, mergePdfBytes } from "@/lib/tools/pdf/merge-engine";
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

describe("PDF merge engine", () => {
  it("merges selected pages in order and preserves size and rotation", async () => {
    const first = await createSimplePdf(["ALPHA-1", "ALPHA-2", "ALPHA-3"], {
      size: [612, 792],
    });
    const second = await createSimplePdf(["BETA-1", "BETA-2"], {
      size: [595, 842],
    });

    const result = await mergePdfBytes(
      [
        { bytes: first, id: "a", name: "Alpha.pdf", pageIndices: [0, 2] },
        { bytes: second, id: "b", name: "Beta.pdf", pageIndices: [1] },
      ],
      {
        createBookmarks: false,
        title: "Combined report",
        yieldControl: async () => undefined,
      },
    );

    expect(result.pageCount).toBe(3);
    expect(await pageMarkerText(result.bytes)).toEqual([
      expect.stringContaining("ALPHA-1"),
      expect.stringContaining("ALPHA-3"),
      expect.stringContaining("BETA-2"),
    ]);

    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getTitle()).toBe("Combined report");
    expect(reopened.getPages().map((page) => page.getSize())).toEqual([
      { height: 792, width: 612 },
      { height: 792, width: 612 },
      { height: 842, width: 595 },
    ]);
    expect(reopened.getPages().map((page) => page.getRotation().angle)).toEqual(
      [0, 0, 90],
    );
  });

  it("repairs a selected destination, removes an omitted destination and prunes omitted contents", async () => {
    const linked = await createLinkedPdf();
    const other = await createSimplePdf(["OTHER-1"]);

    const result = await mergePdfBytes(
      [
        {
          bytes: linked,
          id: "linked",
          name: "Linked.pdf",
          pageIndices: [0, 2],
        },
        { bytes: other, id: "other", name: "Other.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: false,
        title: "Linked output",
        yieldControl: async () => undefined,
      },
    );

    const doc = await PDFDocument.load(result.bytes, { updateMetadata: false });
    const leaves = doc.context
      .enumerateIndirectObjects()
      .filter(([, object]) => object instanceof PDFPageLeaf);
    expect(leaves).toHaveLength(3);
    expect(await allStreamText(result.bytes)).not.toContain(
      "LINK-OMITTED-SECRET",
    );
    expect(await allStreamText(linked)).toContain("LINK-OMITTED-SECRET");
    expect(result.removedDestinations).toBeGreaterThanOrEqual(1);
    expect(result.removedLinkAnnotations).toBeGreaterThanOrEqual(1);

    const firstAnnots = doc.getPage(0).node.Annots()!;
    const destinations: string[] = [];
    for (let index = 0; index < firstAnnots.size(); index += 1) {
      const annot = doc.context.lookup(firstAnnots.get(index));
      if (!(annot instanceof PDFDict)) continue;
      const dest = doc.context.lookup(annot.get(PDFName.of("Dest")));
      if (dest instanceof PDFArray && dest.get(0) instanceof PDFRef)
        destinations.push(dest.get(0).toString());
    }
    expect(destinations).toEqual([doc.getPage(1).ref.toString()]);
  });

  it("flattens supported form appearances and leaves no form in the output", async () => {
    const form = await createFormPdf();
    const other = await createSimplePdf(["STATIC-1"]);

    const result = await mergePdfBytes(
      [
        { bytes: form, id: "form", name: "Form.pdf", pageIndices: [0] },
        { bytes: other, id: "other", name: "Static.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: false,
        title: "Flattened",
        yieldControl: async () => undefined,
      },
    );

    const reopened = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(reopened.catalog.AcroForm()).toBeUndefined();
    expect(await allStreamText(result.bytes)).toContain("FORM-VALUE-KEEP");
  });

  it("blocks a hidden form widget instead of flattening it", async () => {
    const form = await createFormPdf({ hiddenWidget: true });
    const other = await createSimplePdf(["STATIC-1"]);

    await expect(
      mergePdfBytes(
        [
          {
            bytes: form,
            id: "form",
            name: "Hidden form.pdf",
            pageIndices: [0],
          },
          { bytes: other, id: "other", name: "Static.pdf", pageIndices: [0] },
        ],
        {
          createBookmarks: false,
          title: "Blocked",
          yieldControl: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "unsupported_form" });
  });

  it("regenerates a missing form appearance only when the value survives flattening", async () => {
    const form = await createFormPdf({ missingAppearance: true });
    const other = await createSimplePdf(["STATIC-1"]);

    const result = await mergePdfBytes(
      [
        {
          bytes: form,
          id: "form",
          name: "Missing appearance.pdf",
          pageIndices: [0],
        },
        { bytes: other, id: "other", name: "Static.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: false,
        title: "Regenerated appearance",
        yieldControl: async () => undefined,
      },
    );

    const reopened = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(reopened.catalog.AcroForm()).toBeUndefined();
    expect(await allStreamText(result.bytes)).toContain("FORM-VALUE-KEEP");
  });

  it("requires and accepts an open password without returning an encrypted output", async () => {
    const encrypted = await createEncryptedPdf();
    await expect(
      inspectPdfBytes(encrypted, undefined, "encrypted"),
    ).rejects.toMatchObject({
      code: "password_required",
      entryId: "encrypted",
    });
    await expect(
      inspectPdfBytes(encrypted, "wrong", "encrypted"),
    ).rejects.toMatchObject({
      code: "password_invalid",
    });

    const inspection = await inspectPdfBytes(encrypted, "correct horse");
    expect(inspection).toMatchObject({ encrypted: true, pageCount: 2 });

    const other = await createSimplePdf(["PLAIN-1"]);
    const result = await mergePdfBytes(
      [
        {
          bytes: encrypted,
          id: "encrypted",
          name: "Secret.pdf",
          pageIndices: [0],
          password: "correct horse",
        },
        { bytes: other, id: "other", name: "Plain.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: false,
        title: "Decrypted merge",
        yieldControl: async () => undefined,
      },
    );
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.isEncrypted).toBe(false);
    expect(await pageMarkerText(result.bytes)).toEqual([
      expect.stringContaining("ENCRYPTED-SELECTED"),
      expect.stringContaining("PLAIN-1"),
    ]);
  });

  it("adds and validates one generated bookmark per source", async () => {
    const first = await createSimplePdf(["FIRST-1", "FIRST-2"]);
    const second = await createSimplePdf(["SECOND-1"]);
    const result = await mergePdfBytes(
      [
        { bytes: first, id: "a", name: "First report.pdf", pageIndices: [1] },
        { bytes: second, id: "b", name: "Second_file.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: true,
        title: "Bookmarks",
        yieldControl: async () => undefined,
      },
    );

    expect(result.bookmarkTitles).toEqual(["First report", "Second file"]);
    const doc = await PDFDocument.load(result.bytes, { updateMetadata: false });
    const root = doc.context.lookup(doc.catalog.get(PDFName.of("Outlines")));
    expect(root).toBeInstanceOf(PDFDict);
    expect(doc.catalog.get(PDFName.of("PageMode"))?.toString()).toContain(
      "UseOutlines",
    );
  });

  it("allows the same file as two explicit entries", async () => {
    const pdf = await createSimplePdf(["REPEAT-1"]);
    const result = await mergePdfBytes(
      [
        { bytes: pdf, id: "one", name: "Repeat.pdf", pageIndices: [0] },
        { bytes: pdf, id: "two", name: "Repeat.pdf", pageIndices: [0] },
      ],
      {
        createBookmarks: true,
        title: "Repeated",
        yieldControl: async () => undefined,
      },
    );
    expect(result.pageCount).toBe(2);
    expect(result.bookmarkTitles).toEqual(["Repeat", "Repeat (2)"]);
  });

  it("blocks corrupt input, XFA-like forms and signed-like fields", async () => {
    await expect(
      inspectPdfBytes(new TextEncoder().encode("%PDF-1.7 broken")),
    ).rejects.toMatchObject({
      code: "corrupt_or_unsupported",
    });

    const xfa = await createXfaLikePdf();
    const signed = await createSignedLikePdf();
    const other = await createSimplePdf(["OTHER-1"]);

    await expect(
      mergePdfBytes(
        [
          { bytes: xfa, id: "xfa", name: "XFA.pdf", pageIndices: [0] },
          { bytes: other, id: "other", name: "Other.pdf", pageIndices: [0] },
        ],
        {
          createBookmarks: false,
          title: "XFA",
          yieldControl: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "unsupported_xfa" });

    await expect(
      mergePdfBytes(
        [
          { bytes: signed, id: "signed", name: "Signed.pdf", pageIndices: [0] },
          { bytes: other, id: "other2", name: "Other.pdf", pageIndices: [0] },
        ],
        {
          createBookmarks: false,
          title: "Signed",
          yieldControl: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "signed_pdf" });
  });

  it("rejects duplicate and out-of-range page indices explicitly", async () => {
    const pdf = await createSimplePdf(["ONE", "TWO"]);
    await expect(
      mergePdfBytes(
        [
          { bytes: pdf, id: "a", name: "A.pdf", pageIndices: [0, 0] },
          { bytes: pdf, id: "b", name: "B.pdf", pageIndices: [1] },
        ],
        {
          createBookmarks: false,
          title: "Bad",
          yieldControl: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "duplicate_page_selection" });

    await expect(
      mergePdfBytes(
        [
          { bytes: pdf, id: "a", name: "A.pdf", pageIndices: [9] },
          { bytes: pdf, id: "b", name: "B.pdf", pageIndices: [1] },
        ],
        {
          createBookmarks: false,
          title: "Bad",
          yieldControl: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "invalid_page_range" });
  });
});
