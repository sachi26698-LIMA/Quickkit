import { describe, expect, it } from "vitest";
import { renderQr } from "@/lib/tools/qr/render";
import { createMatrix } from "@/lib/tools/qr/matrix";
import { buildScene } from "@/lib/tools/qr/scene";
import { rasterizeScene } from "@/lib/tools/qr/raster";
import { clampDesign, defaultDesign } from "@/lib/tools/qr/style";
import { QR_TEMPLATES } from "@/lib/tools/qr/templates";
import type { QrDesign } from "@/lib/tools/qr/types";
import {
  resampleBilinear,
  verifyBitmap,
  wholeModuleWidths,
} from "@/lib/tools/qr/verify";
import recorded from "./fixtures/qr-small-export-payloads.json";

/**
 * Signed QR payloads carry a fresh signature, so every code is a different
 * symbol. At the 256 px export size about one in seventy of them was reported
 * "Not scannable — export is blocked" although nothing was wrong with it: the
 * modules come out 3 and 4 px wide in turn and the reader lost its lock. The
 * payloads in the fixture are real ones that hit this. They are fixed strings,
 * so the symbols — and this test — are the same on every run.
 */
function designFor(look: string): QrDesign {
  const base = { ...defaultDesign(), size: 256 };
  if (look === "default") return base;
  const template = QR_TEMPLATES.find((entry) => entry.id === "glass");
  if (!template) throw new Error("The Clear Badge template is missing.");
  return { ...base, ...template.design, size: 256 } as QrDesign;
}

function rasterFor(payload: string, design: QrDesign) {
  const clamped = clampDesign(design, { hasLogo: false }).design;
  const matrix = createMatrix(payload, "M", { boost: false });
  const scene = buildScene(matrix, clamped, null);
  return {
    bitmap: rasterizeScene(scene),
    totalModules: Math.round(scene.size / scene.modulePx),
  };
}

describe("small QR exports — independent verification", () => {
  it("has recorded payloads for both content types and both looks", () => {
    expect(recorded.length).toBeGreaterThanOrEqual(5);
    expect(new Set(recorded.map((entry) => entry.content))).toEqual(
      new Set(["url", "wifi"]),
    );
    expect(new Set(recorded.map((entry) => entry.look))).toEqual(
      new Set(["clear-badge", "default"]),
    );
  });

  it.each(recorded.map((entry, index) => [index, entry] as const))(
    "verifies recorded signed payload #%i at 256 px",
    async (_index, entry) => {
      const output = await renderQr({
        payload: entry.payload,
        design: designFor(entry.look),
        artifacts: {},
        verify: true,
      });
      const verification = output.verification;
      expect(verification?.ok).toBe(true);
      expect(verification?.decoded).toBe(entry.payload);
      // These symbols are the ones the ordinary frames miss, so the match has
      // to come from a whole-pixel frame, and the report has to say so.
      expect(verification?.attempts.at(-1)).toMatch(
        /^\d+px whole-pixel( hard)?: matched$/,
      );
      expect(verification?.message).toContain("read at");
    },
  );

  it("still refuses a recorded symbol when the expected content differs", () => {
    const entry = recorded[0];
    const { bitmap, totalModules } = rasterFor(
      entry.payload,
      designFor(entry.look),
    );
    const verdict = verifyBitmap(bitmap, `${entry.payload}x`, { totalModules });
    expect(verdict.ok).toBe(false);
    expect(verdict.decoded).toBe(entry.payload);
    expect(verdict.message).toMatch(/decoded something different/);
  });

  it("still refuses a recorded symbol whose finder corner is wiped out", () => {
    const entry = recorded[0];
    const { bitmap, totalModules } = rasterFor(
      entry.payload,
      designFor(entry.look),
    );
    const span = Math.round((bitmap.width / totalModules) * 12);
    for (let y = 0; y < span; y += 1)
      for (let x = 0; x < span; x += 1) {
        const offset = (y * bitmap.width + x) * 4;
        bitmap.rgba[offset] = 255;
        bitmap.rgba[offset + 1] = 255;
        bitmap.rgba[offset + 2] = 255;
        bitmap.rgba[offset + 3] = 255;
      }
    const verdict = verifyBitmap(bitmap, entry.payload, { totalModules });
    expect(verdict.ok).toBe(false);
    expect(verdict.decoded).toBeNull();
    expect(
      verdict.attempts.some((attempt) => attempt.includes("whole-pixel")),
    ).toBe(true);
    expect(
      verdict.attempts.every((attempt) => attempt.endsWith("no lock")),
    ).toBe(true);
  });

  it("still refuses a recorded symbol drawn with almost no contrast", () => {
    const entry = recorded[0];
    const design: QrDesign = {
      ...defaultDesign(),
      size: 256,
      fg: { kind: "solid", base: "#f4f4f4", accent: "#f4f4f4", angle: 135 },
    };
    // Straight to the rasteriser: the studio would correct these colours
    // before drawing, and the point here is what the reader makes of them.
    const matrix = createMatrix(entry.payload, "M", { boost: false });
    const scene = buildScene(matrix, design, null);
    const verdict = verifyBitmap(rasterizeScene(scene), entry.payload, {
      totalModules: Math.round(scene.size / scene.modulePx),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.decoded).toBeNull();
  });
});

describe("wholeModuleWidths", () => {
  it("offers the nearest whole-pixel frames around a fractional module size", () => {
    // 256 px across 73 modules is 3.5 px per module.
    expect(wholeModuleWidths(256, 73)).toEqual([219, 292, 365]);
    // 256 px across 69 modules is 3.7 px per module.
    expect(wholeModuleWidths(256, 69)).toEqual([207, 276, 345]);
  });

  it("skips the frame below when it would leave under 3 px per module", () => {
    // 2.8 px per module: 2 px is unreadable, so only larger frames are tried.
    expect(wholeModuleWidths(204, 73)).toEqual([219, 292]);
  });

  it("offers nothing when modules are already whole, tiny or large", () => {
    expect(wholeModuleWidths(292, 73)).toEqual([]);
    expect(wholeModuleWidths(146, 73)).toEqual([]);
    expect(wholeModuleWidths(768, 73)).toEqual([]);
    expect(wholeModuleWidths(256, 0)).toEqual([]);
  });
});

describe("resampleBilinear", () => {
  it("enlarges to the exact width and keeps flat areas flat", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let index = 0; index < 16; index += 1) {
      const dark = index % 4 < 2;
      rgba[index * 4] = dark ? 0 : 255;
      rgba[index * 4 + 1] = dark ? 0 : 255;
      rgba[index * 4 + 2] = dark ? 0 : 255;
      rgba[index * 4 + 3] = 255;
    }
    const out = resampleBilinear({ width: 4, height: 4, rgba }, 16);
    expect(out.width).toBe(16);
    expect(out.height).toBe(16);
    expect(out.rgba[0]).toBe(0); // far left stays dark
    expect(out.rgba[15 * 4]).toBe(255); // far right stays light
    const row = Array.from({ length: 16 }, (_, x) => out.rgba[x * 4]);
    expect([...row].sort((a, b) => a - b)).toEqual(row); // dark to light, no ringing
  });
});
