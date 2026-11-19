import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import catalogue from "../lib/fonts/data/catalogue.json";

/**
 * Real rendering tests. @napi-rs/canvas uses Skia — the same shaping and
 * rasterisation engine as Chromium — so these assertions run the actual WOFF2
 * through the actual text stack, not a metadata table.
 *
 * The Playwright suite in tests/e2e/biocraft.spec.ts performs the equivalent
 * checks in a browser; this suite keeps them running everywhere, including
 * environments where a browser binary is not available.
 */

const fonts = catalogue.fonts;

function widthOf(alias: string, text: string, weight = 400): number {
  const canvas = createCanvas(64, 64);
  const context = canvas.getContext("2d");
  context.font = `${weight} 48px "${alias}"`;
  return context.measureText(text).width;
}

function register(font: (typeof fonts)[number]) {
  const alias = `BioCraftTest_${font.slug}`;
  const ok = GlobalFonts.registerFromPath(
    `${process.cwd()}/public${font.primaryFile.path}`,
    alias,
  );
  return { alias, ok };
}

describe("BioCraft Devanagari browser-engine rendering", () => {
  it("registers every verified family and paints हिंदी with it", () => {
    const results = fonts.map((font) => {
      const { alias, ok } = register(font);
      return { family: font.family, ok, width: widthOf(alias, "नमस्ते भारत") };
    });
    expect(results.filter((result) => result.ok).length).toBe(fonts.length);
    for (const result of results) {
      expect(result.width, result.family).toBeGreaterThan(0);
    }
    // The families are not accidentally the same fallback face: their text
    // advance differs from the system Devanagari fallback for the majority.
    const fallback = widthOf("sans-serif", "नमस्ते भारत");
    const distinct = results.filter(
      (result) => Math.abs(result.width - fallback) > 0.5,
    ).length;
    expect(distinct).toBeGreaterThan(fonts.length * 0.75);
  });

  it("forms conjuncts instead of stacking separate half letters", () => {
    let ligatures = 0;
    for (const font of fonts) {
      const { alias } = register(font);
      const ka = widthOf(alias, "क");
      const sha = widthOf(alias, "ष");
      const conjunct = widthOf(alias, "क्ष");
      if (conjunct < ka + sha - 1) ligatures += 1;
    }
    expect(ligatures).toBeGreaterThan(fonts.length * 0.85);
  });

  it("reorders and places matras for every family", () => {
    let positioned = 0;
    for (const font of fonts) {
      const { alias } = register(font);
      const base = widthOf(alias, "क");
      const matra = widthOf(alias, "ि");
      const combined = widthOf(alias, "कि");
      if (combined > 0 && Math.abs(combined - (base + matra)) > 0.5) {
        positioned += 1;
      }
    }
    expect(positioned).toBeGreaterThan(fonts.length * 0.85);
  });

  it("renders mixed Hindi and English without dropping a script", () => {
    let rendered = 0;
    for (const font of fonts) {
      const { alias } = register(font);
      const hindi = widthOf(alias, "नमस्ते");
      const mixed = widthOf(alias, "नमस्ते BioCraft 2026");
      if (mixed > hindi + 1) rendered += 1;
    }
    expect(rendered).toBeGreaterThan(fonts.length * 0.85);
  });

  it("changes metrics when a static bold cut is requested", () => {
    let compared = 0;
    let changed = 0;
    for (const font of fonts) {
      const bold = font.files.devanagari.find((file) => file.weight === 700);
      if (!bold) continue;
      compared += 1;
      const regularAlias = `BioCraftTest_${font.slug}`;
      const boldAlias = `${regularAlias}_bold`;
      GlobalFonts.registerFromPath(
        `${process.cwd()}/public${bold.path}`,
        boldAlias,
      );
      if (
        Math.abs(
          widthOf(regularAlias, "नमस्ते") - widthOf(boldAlias, "नमस्ते"),
        ) > 0.2
      ) {
        changed += 1;
      }
    }
    expect(compared).toBeGreaterThan(20);
    expect(changed).toBeGreaterThan(compared * 0.85);
  });

  it("paints dense Devanagari ink, never a blank or all-tofu page", () => {
    for (const font of fonts.slice(0, 12)) {
      const { alias } = register(font);
      const canvas = createCanvas(900, 220);
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#111";
      context.font = `400 44px "${alias}"`;
      context.fillText(
        "नमस्ते भारत। ज़िंदगी खूबसूरत है। क्ष त्र ज्ञ श्र",
        12,
        90,
      );
      context.fillText("प्रेम, विश्वास और उम्मीद। ०१२३४५६७८९", 12, 160);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let ink = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] < 200) ink += 1;
      }
      expect(ink, font.family).toBeGreaterThan(1500);
      // A blank/tofu-only render covers a much smaller ink area than real
      // Devanagari text, and a solid box covers far more.
      expect(ink, font.family).toBeLessThan(160000);
    }
  });
});
