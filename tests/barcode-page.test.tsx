import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { metadata } from "@/app/tools/barcode-generator/page";
import { routeSourceFiles } from "@/app/sitemap";
import {
  filterTools,
  relatedTools,
  toolBySlug,
  toolCategoriesOf,
  tools,
  toolsByCategory,
} from "@/lib/catalog";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
import { toolTheme } from "@/lib/tool-theme";
import { toolArt, toolTone } from "@/components/icon-3d";

const ROOT = process.cwd();
const STUDIO = ["use-barcode-studio.ts", "index.tsx", "format-panel.tsx", "customize-panel.tsx", "preview-panel.tsx", "bulk-panel.tsx", "scanner-panel.tsx", "reference.tsx"] as const;

function studioSource(file: string) {
  return readFileSync(join(ROOT, "components/tools/barcode-studio", file), "utf8");
}

describe("barcode generator route metadata", () => {
  it("has a unique, descriptive title and a snippet-sized description", () => {
    const title = String(metadata.title);
    const description = String(metadata.description);
    expect(title).toBe("Barcode Generator — Code 128, EAN-13 & GS1");
    expect(title.length + " | QUICKKIT".length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThan(90);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("Code 128");
    expect(description).toContain("validation");
    const titles = tools.map((tool) => tool.name);
    expect(titles.filter((name) => name === "Barcode Generator")).toHaveLength(1);
  });

  it("declares the canonical path and social cards through the shared helper", () => {
    const source = readFileSync(join(ROOT, "app/tools/barcode-generator/page.tsx"), "utf8");
    expect(source).toContain('"/tools/barcode-generator"');
    expect(source).toContain("pageMetadata(");
    expect(metadata.openGraph?.title).toContain("QUICKKIT");
    const openGraph = metadata.openGraph as Record<string, unknown>;
    const twitter = metadata.twitter as Record<string, unknown>;
    expect(openGraph.type).toBe("website");
    expect(openGraph.siteName).toBe("QUICKKIT");
    expect(twitter.card).toBe("summary_large_image");
  });

  it("mounts the studio through the shared tool shell", () => {
    const source = readFileSync(join(ROOT, "app/tools/barcode-generator/page.tsx"), "utf8");
    expect(source).toContain("<ToolShell");
    expect(source).toContain("<BarcodeStudio />");
    expect(source).toContain("<BarcodeReference />");
    expect(source).toContain("referenceSection=");
    expect(source).toContain("slug=\"barcode-generator\"");
  });
});

describe("catalog integration", () => {
  const tool = toolBySlug("barcode-generator");

  it("is a QR & Barcode tool with its own copy and keywords", () => {
    expect(tool).toBeDefined();
    expect(tool!.category).toBe("QR & Barcode");
    expect(toolCategoriesOf(tool!)).toEqual(["QR & Barcode"]);
    expect(tool!.icon).toBe("barcode");
    expect(tool!.description.length).toBeLessThanOrEqual(240);
    expect(tool!.keywords).toContain("gs1-128");
    expect(tool!.keywords).toContain("itf-14");
    expect(tool!.keywords).toContain("ean13");
    expect(tool!.keywords).not.toMatch(/https?:/);
  });

  it("appears in the category listing next to the QR tools", () => {
    const slugs = toolsByCategory("QR & Barcode").map((entry) => entry.slug);
    expect(slugs).toContain("barcode-generator");
    expect(slugs).toContain("qr-generator");
    expect(slugs).toContain("qr-code-scanner");
    expect(slugs[0]).toBe("qr-generator");
  });

  it("is findable by what people actually type", () => {
    expect(filterTools("barcode", "All tools").map((entry) => entry.slug)).toContain(
      "barcode-generator",
    );
    expect(filterTools("ean", "QR & Barcode")[0].slug).toBe("barcode-generator");
    expect(filterTools("gs1", "All tools")[0].slug).toBe("barcode-generator");
  });

  it("links to and from the QR tools", () => {
    const own = relatedTools(toolBySlug("barcode-generator")!).map((entry) => entry.slug);
    expect(own).toContain("qr-generator");
    expect(own).toContain("qr-code-scanner");
    expect(own.length).toBeGreaterThanOrEqual(4);
    expect(relatedTools(toolBySlug("qr-generator")!).map((entry) => entry.slug)).toContain(
      "barcode-generator",
    );
    expect(
      relatedTools(toolBySlug("qr-code-scanner")!).map((entry) => entry.slug),
    ).toContain("barcode-generator");
    for (const slug of own) expect(toolBySlug(slug)).toBeDefined();
  });

  it("is listed in the sitemap source map with its engine files", () => {
    const files = routeSourceFiles("/tools/barcode-generator");
    expect(files).toContain("app/tools/barcode-generator/page.tsx");
    expect(files).toContain("lib/tools/barcode");
    expect(files).toContain("components/tools/barcode-studio");
    for (const file of files) expect(existsSync(join(ROOT, file))).toBe(true);
  });
});

describe("visual identity", () => {
  it("gives the tool a glyph and a tone of its own", () => {
    expect(toolArt["barcode-generator"]).toBe("barcode");
    expect(toolTone({ slug: "barcode-generator", category: "QR & Barcode" })).toBe("crimson");
  });

  it("stays inside the QR family's red theme with a warm shift", () => {
    const theme = toolTheme("barcode-generator", "QR & Barcode");
    const qr = toolTheme("qr-generator", "QR & Barcode");
    expect(theme.rgb).not.toBe(qr.rgb);
    expect(theme.deep).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.deep).not.toBe(qr.deep);
  });
});

describe("SEO reference copy", () => {
  const entry = TOOL_SEO_CONTENT["barcode-generator"];

  it("documents the formats, limits and privacy precisely", () => {
    expect(entry).toBeDefined();
    expect(entry.specs.length).toBeGreaterThanOrEqual(6);
    const text = entry.specs.map((spec) => `${spec.label} ${spec.detail}`).join(" ");
    expect(text).toContain("Code 128");
    expect(text).toContain("GS1-128");
    expect(text).toContain("1,000 rows");
    expect(text).toContain("quiet zone");
    expect(text).toContain("MSI");
    for (const spec of entry.specs) {
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.detail.length).toBeGreaterThan(40);
    }
  });

  it("gives worked examples and a privacy note with no indexing claims", () => {
    expect(entry.examples).toHaveLength(3);
    for (const example of entry.examples) {
      expect(example.scenario.length).toBeGreaterThan(3);
      expect(example.output.length).toBeGreaterThan(20);
    }
    expect(entry.privacyNote).toMatch(/browser/);
    const blob = JSON.stringify(entry);
    expect(blob).not.toMatch(/indexed by Google|rank(ed|ing) #?1|guarantee/i);
  });
});

describe("studio structure", () => {
  it("keeps every class it uses defined in the shared stylesheets", () => {
    const css =
      readFileSync(join(ROOT, "app/tool-pages.css"), "utf8") +
      readFileSync(join(ROOT, "app/globals.css"), "utf8");
    const defined = new Set(css.match(/\.(bc-[a-z0-9-]+)/g)?.map((token) => token.slice(1)));
    const used = new Set<string>();
    for (const file of STUDIO) {
      const source = studioSource(file);
      for (const match of source.matchAll(/className=\{([^}]*)\}|className="([^"]*)"/g)) {
        for (const token of (match[1] ?? match[2] ?? "").match(/bc-[a-z0-9-]+/g) ?? [])
          used.add(token);
      }
    }
    expect(used.size).toBeGreaterThan(25);
    expect([...used].filter((token) => !defined.has(token))).toEqual([]);
  });

  it("exposes three modes as an accessible tab set", () => {
    const source = studioSource("index.tsx");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain("aria-selected={active}");
    expect(source).toContain("aria-controls={`bc-panel-");
    expect(source).toContain("ArrowRight");
    expect(source).toContain("ArrowLeft");
    expect(source).toContain("tabIndex={active ? 0 : -1}");
    expect(source).toContain("sr-only");
    expect(source).toContain('role="status"');
  });

  it("code-splits the scanner and the bulk exporter", () => {
    const source = studioSource("index.tsx");
    expect(source).toMatch(/dynamic\(\(\) => import\("\.\/scanner-panel"\)/);
    expect(source).toMatch(/dynamic\(\(\) => import\("\.\/bulk-panel"\)/);
    expect(source).toContain("Loading the local decoder");
  });

  it("labels every control and announces every error", () => {
    const format = studioSource("format-panel.tsx");
    expect(format).toContain('role="radiogroup"');
    expect(format).toContain("aria-checked=");
    expect(format).toContain("aria-invalid=");
    expect(format).toContain('role="alert"');
    expect(format).toContain("htmlFor=");
    const customize = studioSource("customize-panel.tsx");
    expect(customize).toContain("htmlFor=");
    expect(customize).toContain("aria-describedby=");
    expect(customize).toContain("aria-labelledby=");
    const scanner = studioSource("scanner-panel.tsx");
    expect(scanner).toContain('aria-live="polite"');
    expect(scanner).toContain('role="status"');
  });

  it("processes everything locally: no uploads, no network calls", () => {
    for (const file of STUDIO) {
      const source = studioSource(file);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("XMLHttpRequest");
      expect(source).not.toContain("sendBeacon");
      expect(source).not.toContain("supabase");
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
  });

  it("prints through a same-origin iframe instead of a popup", () => {
    const source = studioSource("use-barcode-studio.ts");
    expect(source).toContain("document.createElement(\"iframe\")");
    expect(source).toContain("contentWindow");
    expect(source).not.toContain("window.open(");
    expect(source).toContain("remove()");
  });

  it("keeps the exports and the preview on one render path", () => {
    const source = studioSource("use-barcode-studio.ts");
    expect(source).toMatch(/buildBarcode\(/);
    expect(source).toMatch(/buildLayout\(/);
    expect(source).toMatch(/layoutToSvg\(/);
    expect(source).toContain("verdict?.svg === svg");
  });
});
