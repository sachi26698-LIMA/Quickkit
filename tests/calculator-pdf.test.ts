import { describe, it, expect } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import { calculatorPdf } from "../lib/tools/calculator-pdf";
describe("calculator PDF", () => {
  it("creates a readable paginated PDF", async () => {
    const bytes = await calculatorPdf(
      "Discount calculation",
      Array.from({ length: 100 }, (_, i) => `Line ${i + 1}: INR 1200.65`),
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF");
  });
  it("rejects unsupported characters and excessively long fields", async () => {
    await expect(calculatorPdf("Test", ["₹100"])).rejects.toThrow(
      /unsupported/,
    );
    await expect(calculatorPdf("Test", ["x".repeat(1000)])).rejects.toThrow(
      /too long/,
    );
  });
});
