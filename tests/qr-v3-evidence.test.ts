/**
 * V3 integration evidence: every content type and a representative template
 * from each category must render into a PNG that an independent decoder reads
 * back to the exact payload. Run with QR_EVIDENCE=1 to also emit the actual PNG
 * files + a JSON report into docs/qr-studio-v3/evidence/ for owner review.
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

  it("writes the evidence report", () => {
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
    expect(report.length).toBe(
      QR_CONTENT_TYPES.length + TEMPLATE_CATEGORIES.length,
    );
  });
});
