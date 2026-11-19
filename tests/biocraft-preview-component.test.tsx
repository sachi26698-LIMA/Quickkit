import "@testing-library/jest-dom/vitest";
// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import catalogueJson from "../lib/fonts/data/catalogue.json";
import type { FontRecord } from "../lib/fonts/types";

const catalogue = catalogueJson as unknown as { fonts: FontRecord[] };

const loadFont = vi.fn();

vi.mock("@/lib/fonts/loader", () => ({
  loadFont: (...args: unknown[]) => loadFont(...args),
  fontFamilyName: (slug: string) => `BioCraft Hindi ${slug}`,
  containsLatin: (text: string) => /[A-Za-z0-9]/.test(text),
}));

const font = catalogue.fonts.find((entry) => entry.slug === "kalam")!;

beforeEach(() => {
  loadFont.mockReset();
});

describe("FontPreviewLine", () => {
  it("applies the loaded family only after the file is ready", async () => {
    let resolve: (value: boolean) => void = () => undefined;
    loadFont.mockImplementation(
      () => new Promise<boolean>((done) => (resolve = done)),
    );
    const { default: FontPreviewLine } =
      await import("@/components/biocraft/font-preview-line");
    render(<FontPreviewLine font={font} text="नमस्ते भारत" />);
    const element = screen.getByText("नमस्ते भारत");
    expect(element).toHaveAttribute("data-font-loaded", "false");
    expect(element.style.fontFamily).toBe("");

    resolve(true);
    await waitFor(() =>
      expect(element).toHaveAttribute("data-font-loaded", "true"),
    );
    expect(element.style.fontFamily).toContain("BioCraft Hindi kalam");
    expect(element.getAttribute("lang")).toBe("hi");
    expect(loadFont).toHaveBeenCalledWith(
      font,
      400,
      expect.objectContaining({ latin: false }),
    );
  });

  it("keeps the fallback and exposes the error when loading fails", async () => {
    loadFont.mockResolvedValue(false);
    const { default: FontPreviewLine } =
      await import("@/components/biocraft/font-preview-line");
    render(<FontPreviewLine font={font} text="नमस्ते" />);
    const element = screen.getByText("नमस्ते");
    await waitFor(() =>
      expect(element).toHaveAttribute("data-font-status", "error"),
    );
    expect(element).toHaveAttribute("data-font-loaded", "false");
    expect(element.style.fontFamily).toBe("");
  });

  it("asks for the Latin subset when the preview is mixed", async () => {
    loadFont.mockResolvedValue(true);
    const { default: FontPreviewLine } =
      await import("@/components/biocraft/font-preview-line");
    render(<FontPreviewLine font={font} text="नमस्ते BioCraft" />);
    await waitFor(() =>
      expect(loadFont).toHaveBeenCalledWith(
        font,
        400,
        expect.objectContaining({ latin: true }),
      ),
    );
  });
});
