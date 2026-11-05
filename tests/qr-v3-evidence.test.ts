/**
 * V3 integration evidence: every content type, a representative template from
 * each category, and the new framed / eye-colour / logo designs must render
 * into a PNG that an independent decoder reads back to the exact payload. Run
 * with QR_EVIDENCE=1 to also emit the actual PNG files + a JSON report into
 * docs/qr-studio-v3/evidence/ for owner review.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  QR_CONTENT_TYPES,
  buildPayload,
  sampleValuesFor,
} from "@/lib/tools/qr/payload";
import {
  QR_TEMPLATE_LIBRARY,
  TEMPLATE_CATEGORIES,
} from "@/lib/tools/qr/templates";
import { renderQr } from "@/lib/tools/qr/render";
import { defaultDesign } from "@/lib/tools/qr/style";
import type { QrDesign, QrLogoImage } from "@/lib/tools/qr/types";

const EMIT = process.env.QR_EVIDENCE === "1";
const DIR = join(process.cwd(), "docs/qr-studio-v3/evidence");
const report: Record<string, unknown>[] = [];

function emit(
  name: string,
  png: Uint8Array | null,
  meta: Record<string, unknown>,
) {
  report.push({ name, ...meta });
  if (EMIT && png) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(join(DIR, `${name}.png`), png);
  }
}

/** A small plum square logo with a transparent cross, for overlay evidence. */
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
      rgba[offset] = 59;
      rgba[offset + 1] = 27;
      rgba[offset + 2] = 79;
      rgba[offset + 3] = inCross ? 0 : 255;
    }
  return {
    width: size,
    height: size,
    rgba,
    name: "logo.png",
    bytes: rgba.length,
  };
}

const frame = (style: string, text = "") => ({
  style,
  text,
  fg: "#3b1b4f",
  bg: "#f4d7d4",
});

/** New V3 design combinations, each decode-verified. */
const FRAMED_EVIDENCE: {
  name: string;
  design: Partial<QrDesign>;
  logo?: QrLogoImage;
}[] = [
  { name: "frame-scan", design: { frame: frame("scan") as never } },
  { name: "frame-menu", design: { frame: frame("menu") as never } },
  { name: "frame-follow", design: { frame: frame("follow") as never } },
  {
    name: "frame-custom",
    design: { frame: frame("custom", "ORDER ONLINE") as never },
  },
  {
    name: "eye-colours",
    design: {
      eyeFrame: { kind: "solid", base: "#d6598f", accent: "#d6598f", angle: 0 },
      eyeBall: { kind: "solid", base: "#3b1b4f", accent: "#3b1b4f", angle: 0 },
    },
  },
  {
    name: "frame-logo",
    design: {
      frame: frame("visit") as never,
      errorLevel: "H",
      logo: { ...defaultDesign().logo, scale: 0.16, bg: "#ffffff" },
    },
    logo: syntheticLogo(),
  },
];

describe("V3 content types render and decode", () => {
  for (const type of QR_CONTENT_TYPES) {
    it(`${type.id} decodes back to its payload`, async () => {
      const payload = buildPayload(type.id, sampleValuesFor(type.id));
      const out = await renderQr({
        payload,
        design: { ...defaultDesign(), size: 384 },
        artifacts: { png: true },
        verify: true,
      });
      expect(
        out.verification?.ok,
        `${type.id}: ${out.verification?.message}`,
      ).toBe(true);
      expect(out.verification?.decoded).toBe(payload);
      emit(`content-${type.id}`, out.png, {
        kind: "content",
        typeId: type.id,
        bytes: out.bytes,
        version: out.matrix.version,
        decoded: out.verification?.decoded,
      });
    }, 30_000);
  }
});

describe("V3 templates render and decode (one per category)", () => {
  for (const category of TEMPLATE_CATEGORIES) {
    const template = QR_TEMPLATE_LIBRARY.find(
      (t) => t.category === category.id,
    )!;
    it(`${category.id}: ${template.name} decodes`, async () => {
      const payload = "https://quickkit.tools/?src=template-evidence";
      const out = await renderQr({
        payload,
        design: { ...defaultDesign(), ...template.design, size: 384 },
        artifacts: { png: true },
        verify: true,
      });
      expect(
        out.verification?.ok,
        `${template.id}: ${out.verification?.message}`,
      ).toBe(true);
      emit(`template-${template.id}`, out.png, {
        kind: "template",
        templateId: template.id,
        category: category.id,
        decoded: out.verification?.decoded,
      });
    }, 30_000);
  }
});

describe("V3 framed / eye-colour / logo designs render and decode", () => {
  for (const item of FRAMED_EVIDENCE) {
    it(`${item.name} decodes`, async () => {
      const payload = "https://quickkit.tools/?src=design-evidence";
      const out = await renderQr({
        payload,
        design: { ...defaultDesign(), ...item.design, size: 512 },
        logo: item.logo ?? null,
        artifacts: { png: true },
        verify: true,
      });
      expect(
        out.verification?.ok,
        `${item.name}: ${out.verification?.message}`,
      ).toBe(true);
      expect(out.verification?.decoded).toBe(payload);
      emit(`design-${item.name}`, out.png, {
        kind: "design",
        decoded: out.verification?.decoded,
      });
    }, 30_000);
  }
});

describe("V3 evidence report", () => {
  it("writes the evidence report", () => {
    const expected =
      QR_CONTENT_TYPES.length +
      TEMPLATE_CATEGORIES.length +
      FRAMED_EVIDENCE.length;
    if (EMIT) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(
        join(DIR, "report.json"),
        JSON.stringify(
          { generated: new Date().toISOString(), count: report.length, report },
          null,
          2,
        ),
      );
    }
    expect(report.length).toBe(expected);
  });
});
