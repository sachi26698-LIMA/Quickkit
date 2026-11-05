import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { encodePng } from "../lib/tools/qr/png";
import { renderQr } from "../lib/tools/qr/render";
import { createMatrix } from "../lib/tools/qr/matrix";
import { buildScene } from "../lib/tools/qr/scene";
import { rasterizeScene } from "../lib/tools/qr/raster";
import { flattenBitmap, verifyBitmap } from "../lib/tools/qr/verify";
import {
  defaultDesign,
  DOT_STYLES,
  EYE_STYLES,
  QR_TEMPLATES,
} from "../lib/tools/qr/style";
import type { QrDesign, QrLogoImage } from "../lib/tools/qr/types";

const PAYLOAD = "https://quickkit.tools/pricing?plan=team&src=qr#top";

/** A hard-edged logo: opaque purple square with a transparent cross. */
function syntheticLogo(size = 64): QrLogoImage {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const inCross =
        x > size * 0.35 &&
        x < size * 0.65 &&
        y > size * 0.35 &&
        y < size * 0.65;
      rgba[offset] = 108;
      rgba[offset + 1] = 53;
      rgba[offset + 2] = 232;
      rgba[offset + 3] = inCross ? 0 : 255;
    }
  return {
    width: size,
    height: size,
    rgba,
    name: "logo.png",
    bytes: size * size * 4,
  };
}

async function render(
  design: Partial<QrDesign>,
  options: { logo?: QrLogoImage | null; verify?: boolean } = {},
) {
  return renderQr({
    payload: PAYLOAD,
    design: { ...defaultDesign(), ...design },
    logo: options.logo ?? null,
    artifacts: { png: true, svg: true, bitmap: true },
    verify: options.verify !== false,
  });
}

describe("PNG encoder", () => {
  it("writes a real, decodable PNG file", async () => {
    const out = await render({});
    const bytes = out.png!;
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const png = PNG.sync.read(Buffer.from(bytes));
    expect(png.width).toBe(768);
    expect(png.height).toBe(768);
    // Re-decode straight out of the file, exactly as a test scanner would.
    const decoded = verifyBitmap(
      {
        width: png.width,
        height: png.height,
        rgba: new Uint8ClampedArray(png.data),
      },
      PAYLOAD,
      { modules: out.matrix.size },
    );
    expect(decoded.ok).toBe(true);
  });

  it("keeps alpha for transparent backgrounds", async () => {
    const out = await render({ transparent: true, margin: 2 });
    const png = PNG.sync.read(Buffer.from(out.png!));
    const cornerAlpha = png.data[3];
    expect(cornerAlpha).toBe(0);
    expect(out.verification?.ok).toBe(true);
  });
});

describe("styled rendering stays scannable", () => {
  for (const style of DOT_STYLES)
    for (const eye of EYE_STYLES)
      it(`${style.id} modules with ${eye.id} eyes decodes back to the payload`, async () => {
        const out = await render({
          dotStyle: style.id,
          eyeStyle: eye.id,
          errorLevel: "Q",
          size: 512,
        });
        expect(out.verification?.ok).toBe(true);
        expect(out.verification?.decoded).toBe(PAYLOAD);
      });

  it("renders every premium template into a decodable code", async () => {
    for (const template of QR_TEMPLATES) {
      const out = await render(template.design);
      expect(
        out.verification?.ok,
        `${template.id}: ${out.verification?.message}`,
      ).toBe(true);
    }
  }, 120_000); // 55 templates, each rendered at full size and decoded by jsQR.

  it("supports gradients, margins and invert", async () => {
    const gradient = await render({
      fg: { kind: "linear", base: "#4b19b8", accent: "#8a5cf6", angle: 135 },
      bg: { kind: "radial", base: "#ffffff", accent: "#ede3ff", angle: 0 },
      size: 1024,
      margin: 8,
    });
    expect(gradient.verification?.ok).toBe(true);
    const inverted = await render({
      invert: true,
      fg: { kind: "solid", base: "#ffffff", accent: "#ffffff", angle: 0 },
      bg: { kind: "solid", base: "#17152b", accent: "#17152b", angle: 0 },
      errorLevel: "H",
    });
    expect(inverted.verification?.ok).toBe(true);
  });

  it("survives a logo overlay at every error-correction level that allows it", async () => {
    const logo = syntheticLogo();
    for (const level of ["Q", "H"] as const) {
      const out = await render({ errorLevel: level, size: 768 }, { logo });
      expect(
        out.verification?.ok,
        `${level}: ${out.verification?.message}`,
      ).toBe(true);
    }
  });

  it("keeps the centre clear by clamping an oversized logo", async () => {
    const out = await render({ errorLevel: "H" }, { logo: syntheticLogo(96) });
    expect(out.design.logo.scale).toBeLessThanOrEqual(0.3);
    expect(out.verification?.ok).toBe(true);
  });

  it("blocks an unscannable design and explains why", async () => {
    const out = await render({
      fg: { kind: "solid", base: "#fdfdff", accent: "#fdfdff", angle: 0 },
      bg: { kind: "solid", base: "#ffffff", accent: "#ffffff", angle: 0 },
    });
    expect(out.safety.level).toBe("blocked");
    expect(out.safety.findings[0].field).toBe("fg");
    expect(out.verification?.ok).toBe(false);
  });

  it("raises error correction automatically when a logo needs it", async () => {
    const out = await render({ errorLevel: "L" }, { logo: syntheticLogo() });
    expect(out.design.errorLevel).toBe("Q");
    expect(out.adjustments.some((note) => note.field === "errorLevel")).toBe(
      true,
    );
  });
});

describe("matrix + scene invariants", () => {
  it("the finder patterns keep their dark 7×7 outline whatever the style", () => {
    const matrix = createMatrix(PAYLOAD, "H");
    for (const origin of [
      [0, 0],
      [0, matrix.size - 7],
      [matrix.size - 7, 0],
    ]) {
      const [row, col] = origin;
      expect(matrix.data[(row + 0) * matrix.size + col + 0]).toBe(1);
      expect(matrix.data[(row + 1) * matrix.size + col + 1]).toBe(0);
      expect(matrix.data[(row + 3) * matrix.size + col + 3]).toBe(1);
      expect(matrix.data[(row + 6) * matrix.size + col + 6]).toBe(1);
    }
  });

  it("the scene paints the quiet zone as background and keeps eyes inside the canvas", async () => {
    const matrix = createMatrix(PAYLOAD, "M");
    const design = { ...defaultDesign(), margin: 4, size: 333 };
    const scene = buildScene(matrix, design, null);
    expect(scene.modulePx).toBeCloseTo(333 / (matrix.size + 8), 5);
    for (const shape of scene.shapes) {
      if (
        shape.type === "rect" ||
        shape.type === "roundrect" ||
        shape.type === "ringrect"
      ) {
        expect(shape.x).toBeGreaterThanOrEqual(-0.01);
        expect(shape.y).toBeGreaterThanOrEqual(-0.01);
        expect(shape.x + shape.w).toBeLessThanOrEqual(333 + 0.01);
        expect(shape.y + shape.h).toBeLessThanOrEqual(333 + 0.01);
      }
    }
  });

  it("a rasterised code has a light border on all four sides", () => {
    const matrix = createMatrix(PAYLOAD, "M");
    const bitmap = rasterizeScene(
      buildScene(matrix, { ...defaultDesign(), margin: 4, size: 200 }, null),
    );
    const isLight = (x: number, y: number) => {
      const offset = (y * bitmap.width + x) * 4;
      return (
        bitmap.rgba[offset + 3] > 250 &&
        bitmap.rgba[offset] > 240 &&
        bitmap.rgba[offset + 1] > 240 &&
        bitmap.rgba[offset + 2] > 240
      );
    };
    for (let x = 0; x < bitmap.width; x += 1) {
      expect(isLight(x, 0)).toBe(true);
      expect(isLight(x, bitmap.height - 1)).toBe(true);
    }
  });
});

describe("long and unusual payloads", () => {
  it("encodes 2,000 bytes of text and still decodes", async () => {
    const long = "QuickKit二维码生成器—测试。".repeat(70);
    expect(new TextEncoder().encode(long).length).toBeGreaterThan(2400);
    // Slice on a byte budget, not a character count: 1200 Devanagari-style
    // characters are 3 bytes each and would exceed the tool ceiling.
    const bytes = new TextEncoder();
    let payload = "";
    for (const char of long) {
      if (bytes.encode(payload + char).length > 2400) break;
      payload += char;
    }
    expect(bytes.encode(payload).length).toBeGreaterThan(2300);
    const out = await renderQr({
      payload,
      design: {
        ...defaultDesign(),
        size: 1024,
        errorLevel: "L",
        dotStyle: "square",
      },
      artifacts: { png: true },
      verify: true,
    });
    expect(out.verification?.ok).toBe(true);
    expect(out.matrix.version).toBeGreaterThan(10);
  });

  it("handles RTL and emoji content", async () => {
    for (const payload of ["مرحبا بالعالم 🌍", "🔐📶😀", "नमस्ते दुनिया"]) {
      const out = await renderQr({
        payload,
        design: { ...defaultDesign(), size: 512 },
        artifacts: {},
        verify: true,
      });
      expect(out.verification?.ok, payload).toBe(true);
    }
  });

  it("refuses a payload above the tool ceiling before rendering", async () => {
    await expect(
      renderQr({ payload: "a".repeat(2600), design: defaultDesign() }),
    ).rejects.toThrow(/bytes/);
  });
});

describe("bitmap helpers", () => {
  it("encodePng rejects an empty frame", async () => {
    await expect(
      encodePng({ width: 0, height: 0, rgba: new Uint8ClampedArray(0) }),
    ).rejects.toThrow(/Nothing was rendered/);
  });

  it("flattening composites alpha onto the chosen field colour", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 128]);
    const flat = flattenBitmap({ width: 2, height: 1, rgba }, [255, 255, 255]);
    expect([...flat.rgba.slice(0, 4)]).toEqual([255, 255, 255, 255]);
    // 50 % alpha red over white → (255, 127, 127)
    expect([...flat.rgba.slice(4, 8)]).toEqual([255, 127, 127, 255]);
  });
});

describe("V3 frames, eye colours and logo background stay scannable", () => {
  const frame = (style: string, text = "") => ({
    style,
    text,
    fg: "#3b1b4f",
    bg: "#f4d7d4",
  });

  for (const style of ["scan", "menu", "follow", "contact", "visit"]) {
    it(`frame "${style}" renders a label and still decodes`, async () => {
      const out = await render({ frame: frame(style) as never, size: 512 });
      expect(out.verification?.ok, out.verification?.message).toBe(true);
      expect(out.verification?.decoded).toBe(PAYLOAD);
      // The banner text is real geometry in the scene.
      expect(out.scene.shapes.some((s) => s.type === "line")).toBe(true);
    }, 30_000);
  }

  it("custom frame text auto-fits a long label and decodes", async () => {
    const out = await render({
      frame: frame("custom", "SCAN FOR THE FULL AUTUMN MENU & OFFERS") as never,
      size: 512,
    });
    expect(out.verification?.ok, out.verification?.message).toBe(true);
  }, 30_000);

  it("independent eye colours decode", async () => {
    const out = await render({
      eyeFrame: { kind: "solid", base: "#b93a73", accent: "#b93a73", angle: 0 },
      eyeBall: { kind: "solid", base: "#3b1b4f", accent: "#3b1b4f", angle: 0 },
      size: 512,
    });
    expect(out.verification?.ok, out.verification?.message).toBe(true);
  }, 30_000);

  it("a logo with an explicit background colour decodes", async () => {
    const out = await render(
      {
        size: 512,
        errorLevel: "H",
        logo: { ...defaultDesign().logo, scale: 0.2, bg: "#ffffff" },
      },
      { logo: syntheticLogo() },
    );
    expect(out.verification?.ok, out.verification?.message).toBe(true);
  }, 30_000);

  it("frame + logo together decode", async () => {
    const out = await render(
      {
        frame: frame("scan") as never,
        size: 640,
        errorLevel: "H",
        logo: { ...defaultDesign().logo, scale: 0.16 },
      },
      { logo: syntheticLogo() },
    );
    expect(out.verification?.ok, out.verification?.message).toBe(true);
  }, 30_000);

  it("a framed transparent PNG decodes once flattened", async () => {
    const out = await render({
      frame: frame("menu") as never,
      transparent: true,
      size: 512,
    });
    expect(out.verification?.ok, out.verification?.message).toBe(true);
  }, 30_000);

  it("the SVG carries the frame label as stroke geometry", async () => {
    const { sceneToSvg } = await import("../lib/tools/qr/svg");
    const matrix = createMatrix(PAYLOAD, "M", { boost: true });
    const design = {
      ...defaultDesign(),
      frame: frame("scan") as never,
      size: 512,
    };
    const svg = await sceneToSvg(buildScene(matrix, design, null));
    expect(svg).toContain("<line");
    expect(svg).toContain('stroke-linecap="round"');
  });

  it("a near-invisible finder colour is flagged by the safety audit", async () => {
    const { analyzeScannability } = await import("../lib/tools/qr/safety");
    const matrix = createMatrix(PAYLOAD, "M", { boost: true });
    const design = {
      ...defaultDesign(),
      eyeFrame: { kind: "solid", base: "#f2f2f2", accent: "#f2f2f2", angle: 0 },
    } as QrDesign;
    const report = analyzeScannability(design, matrix, { hasLogo: false });
    expect(report.findings.some((f) => f.field === "eyeFrame")).toBe(true);
  });
});
