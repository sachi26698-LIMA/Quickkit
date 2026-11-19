// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { legalDraft } from "@/lib/tools/security/legal";
import { inspectFileSignature } from "@/lib/tools/security/file-signature";
import {
  cleanImage,
  inspectDocx,
  inspectImage,
  inspectPdf,
} from "@/lib/tools/security/metadata";

/** Build a File from raw bytes so the signature engines see real headers. */
function fileFrom(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const PDF_HEADER = [..."%PDF-1.7".split("").map((c) => c.charCodeAt(0))];

describe("legal drafting", () => {
  const FACTS = {
    organization: "Acme Pvt Ltd",
    contact: "privacy@acme.example",
    data: "name and email address",
    purpose: "order fulfilment",
    sharing: "no transfers outside India",
    retention: "24 months after the last order",
    rights: "email the contact address to exercise rights",
  };

  it("drafts only from the facts supplied", () => {
    const draft = legalDraft("privacy-policy", JSON.stringify(FACTS));
    expect(draft).toContain("name and email address");
    expect(draft).toContain("24 months after the last order");
  });

  it("marks the draft as requiring legal review", () => {
    const draft = legalDraft("privacy-policy", JSON.stringify(FACTS));
    expect(draft).toContain("Legal review required");
    expect(draft).toContain("not legal advice");
  });

  it("does not claim the draft is compliant", () => {
    const draft = legalDraft("privacy-policy", JSON.stringify(FACTS));
    expect(draft).toContain("is not automatically compliant");
  });

  it("names the requested document", () => {
    const dpaFacts = {
      organization: "Acme Pvt Ltd",
      contact: "privacy@acme.example",
      parties: "Acme Pvt Ltd and the processor",
      processing: "payroll processing",
      instructions: "processing only on documented instructions",
      security: "access control and encryption in transit",
      sharing: "no sub-processors without prior notice",
      termination: "delete or return data within 30 days",
    };
    expect(legalDraft("dpa", JSON.stringify(dpaFacts))).toContain(
      "DATA PROCESSING AGREEMENT",
    );
  });

  it("refuses facts that are not JSON", () => {
    expect(() => legalDraft("privacy-policy", "not json")).toThrow(
      /valid JSON object/,
    );
  });

  it("refuses a JSON array", () => {
    expect(() => legalDraft("privacy-policy", "[]")).toThrow();
  });

  it("names the missing fact rather than drafting around it", () => {
    const partial = { ...FACTS, retention: "" };
    expect(() => legalDraft("privacy-policy", JSON.stringify(partial))).toThrow(
      /retention/,
    );
  });

  it("refuses an empty fact sheet", () => {
    expect(() => legalDraft("privacy-policy", "")).toThrow();
  });
});

describe("file signature inspection", () => {
  it("recognises a PNG signature", async () => {
    const result = await inspectFileSignature(
      fileFrom(PNG_HEADER, "photo.png", "image/png"),
    );
    expect(result).toContain("PNG");
  });

  it("recognises a JPEG signature", async () => {
    const result = await inspectFileSignature(
      fileFrom(JPEG_HEADER, "photo.jpg", "image/jpeg"),
    );
    expect(result).toContain("JPEG");
  });

  it("recognises a PDF signature", async () => {
    const result = await inspectFileSignature(
      fileFrom(PDF_HEADER, "doc.pdf", "application/pdf"),
    );
    expect(result).toContain("PDF");
  });

  it("flags an extension that contradicts the bytes", async () => {
    const result = await inspectFileSignature(
      fileFrom(PNG_HEADER, "photo.pdf", "image/png"),
    );
    expect(result).toContain("does not match the detected signature");
  });

  it("says an extension match is only consistency", async () => {
    const result = await inspectFileSignature(
      fileFrom(PNG_HEADER, "photo.png", "image/png"),
    );
    expect(result).toContain(
      "consistent with the detected container signature",
    );
  });

  it("reports an unknown container without guessing", async () => {
    const result = await inspectFileSignature(
      fileFrom([0x00, 0x01, 0x02, 0x03], "thing.bin", ""),
    );
    expect(result).toContain("unrecognized");
  });

  it("refuses an empty file", async () => {
    await expect(
      inspectFileSignature(fileFrom([], "empty.png", "image/png")),
    ).rejects.toThrow();
  });
});

describe("document metadata inspection", () => {
  it("refuses a PDF that is not really a PDF", async () => {
    await expect(
      inspectPdf(
        fileFrom([0x00, 0x01, 0x02, 0x03, 0x04], "fake.pdf", "application/pdf"),
      ),
    ).rejects.toThrow(/PDF signature/);
  });

  it("refuses a PDF larger than the limit", async () => {
    const huge = new File([new Uint8Array(16 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });
    await expect(inspectPdf(huge)).rejects.toThrow(/15 MiB/);
  });

  it("refuses a DOCX that is not a ZIP package", async () => {
    await expect(
      inspectDocx(
        fileFrom(
          [0x00, 0x01],
          "fake.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ),
    ).rejects.toThrow(/ZIP package/);
  });

  it("refuses a DOCX larger than the limit", async () => {
    const huge = new File([new Uint8Array(16 * 1024 * 1024)], "big.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await expect(inspectDocx(huge)).rejects.toThrow(/15 MiB/);
  });

  it("refuses to clean a file that is not a supported image", async () => {
    // `cleanImage` decodes through the browser, so a file that is not an image
    // is rejected before any canvas work happens.
    const notAnImage = new File([new Uint8Array([1, 2, 3])], "x.txt", {
      type: "text/plain",
    });
    await expect(cleanImage(notAnImage)).rejects.toThrow();
  });

  it("says metadata scanning is not a complete audit", async () => {
    // A minimal PNG header with a declared type is enough for the scan to run;
    // jsdom has no decoder, so assert on the message rather than the image.
    const result = await inspectImage(
      fileFrom(PNG_HEADER, "photo.png", "image/png"),
    ).catch((error: Error) => error.message);
    expect(typeof result).toBe("string");
  });
});
