/**
 * Phase I — brand palette presets.
 *
 * Locks in the retune: the six quick presets are drawn from the exact brand
 * colours and every one clears the "strong" contrast bar (4.5:1), so applying a
 * preset never triggers a contrast adjustment. The brand-swatch row may use
 * adventurous tints, but must never fall below the blocked floor.
 */
import { describe, expect, it } from "vitest";
import {
  BRAND_COLORS,
  BRAND_SWATCHES,
  PRESET_SWATCHES,
} from "@/lib/tools/qr/palette";
import { GOOD_CONTRAST, contrastRatio } from "@/lib/tools/qr/colour";

const brandHexes = new Set<string>([...Object.values(BRAND_COLORS), "#ffffff"]);

describe("brand palette presets (Phase I)", () => {
  it("keeps exactly six quick presets", () => {
    expect(PRESET_SWATCHES).toHaveLength(6);
  });

  it("every quick preset clears the strong-contrast bar (no warning)", () => {
    for (const swatch of PRESET_SWATCHES) {
      expect(
        contrastRatio(swatch.fg, swatch.bg),
        `${swatch.name} contrast`,
      ).toBeGreaterThanOrEqual(GOOD_CONTRAST);
    }
  });

  it("every quick preset uses only exact brand colours (or white)", () => {
    for (const swatch of PRESET_SWATCHES) {
      expect(brandHexes.has(swatch.fg), `${swatch.name} fg`).toBe(true);
      expect(brandHexes.has(swatch.bg), `${swatch.name} bg`).toBe(true);
    }
  });

  it("the presets collectively use all five brand colours", () => {
    const used = new Set(PRESET_SWATCHES.flatMap((s) => [s.fg, s.bg]));
    for (const colour of Object.values(BRAND_COLORS)) {
      expect(used.has(colour), colour).toBe(true);
    }
  });

  it("brand-row swatches never fall below the blocked floor", () => {
    for (const swatch of BRAND_SWATCHES) {
      expect(
        contrastRatio(swatch.fg, swatch.bg),
        `${swatch.name} contrast`,
      ).toBeGreaterThan(1.4);
    }
  });
});
