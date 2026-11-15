import { describe, expect, it } from "vitest";
import { inspectFileSignature } from "../lib/tools/security/file-signature";
describe("bounded file signature review", () => {
  it("identifies genuine magic bytes and reports spoofed extension and MIME", async () => {
    const report = await inspectFileSignature(
      new File(["%PDF-1.7\ncontent"], "photo.png", { type: "image/png" }),
    );
    expect(report).toContain("Signature: PDF");
    expect(report).toContain("does not match");
    expect(report).toContain("differs from the detected type");
    expect(report).toContain("does not establish file safety");
  });
  it("treats a ZIP signature as a container, not proof of a DOCX", async () => {
    const report = await inspectFileSignature(
      new File([new Uint8Array([0x50, 0x4b, 3, 4])], "sample.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    expect(report).toContain("ZIP container");
    expect(report).toContain("does not prove a valid DOCX");
  });
  it("handles unknown and empty files without a fake clean verdict", async () => {
    expect(
      await inspectFileSignature(new File(["some text"], "hello.txt")),
    ).toContain("unrecognized");
    await expect(
      inspectFileSignature(new File([], "empty.txt")),
    ).rejects.toThrow("non-empty");
  });
});
