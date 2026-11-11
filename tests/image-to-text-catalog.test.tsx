// @vitest-environment jsdom
/**
 * Integration checks for the Image to Text (OCR) tool as a catalogue citizen:
 * it must be discoverable, properly filed, linked from category and sitemap,
 * carry real SEO copy, and render the shared shell sections like every other
 * tool. Nothing here tests OCR accuracy — that runs the real engine against
 * real fixtures in tests/image-to-text-accuracy.test.ts, and the browser-level
 * flows live in tests/e2e/image-to-text.spec.ts.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  categoryMeta,
  filterTools,
  relatedTools,
  toolBySlug,
  toolCategoriesOf,
  tools,
  toolsByCategory,
} from "@/lib/catalog";
import Page, { metadata } from "../app/tools/image-to-text/page";

const SLUG = "image-to-text";

afterEach(cleanup);

describe("catalogue entry", () => {
  it("exists exactly once with a real description and keywords", () => {
    expect(tools.filter((tool) => tool.slug === SLUG)).toHaveLength(1);
    const tool = toolBySlug(SLUG)!;
    expect(tool.name).toBe("Image to Text (OCR)");
    expect(tool.description.length).toBeGreaterThan(60);
    expect(tool.keywords.split(" ").length).toBeGreaterThan(20);
    expect(tool.icon).toBe("ocr");
    expect(tool.color).toBe("rose");
  });

  it("is filed under Text & Writing and nothing else", () => {
    const tool = toolBySlug(SLUG)!;
    expect(toolCategoriesOf(tool)).toEqual(["Text & Writing"]);
    expect(toolsByCategory("Text & Writing").map((t) => t.slug)).toContain(
      SLUG,
    );
    expect(toolsByCategory("Image Tools").map((t) => t.slug)).not.toContain(
      SLUG,
    );
  });

  it("keeps the catalogue counts self-consistent", () => {
    // Adding another tool must not require editing this file: assert that this
    // tool is counted once and that the category tallies add up to the whole.
    expect(tools.filter((tool) => tool.slug === SLUG)).toHaveLength(1);
    expect(tools.length).toBeGreaterThanOrEqual(29);
    const sum = categoryMeta.reduce(
      (total, category) => total + toolsByCategory(category.name).length,
      0,
    );
    expect(sum).toBe(tools.length);
  });

  it("is reachable by every realistic search phrase", () => {
    for (const query of [
      "ocr",
      "image to text",
      "text from image",
      "scan",
      "receipt",
      "handwriting",
      "gujarati",
      "tamil",
      "table extraction",
      "screenshot",
    ]) {
      expect(
        filterTools(query, "All tools").map((tool) => tool.slug),
        `"${query}" finds the OCR tool`,
      ).toContain(SLUG);
      expect(
        filterTools(query, "Text & Writing").map((tool) => tool.slug),
        `"${query}" finds it inside its category`,
      ).toContain(SLUG);
    }
  });

  it("does not hijack searches for other tools by naming their formats", () => {
    // The tool can export JSON and CSV, but listing those words as keywords made
    // "json" return two tools and broke the global search spec. Discovery
    // phrases must stay, output formats must not be borrowed as keywords.
    for (const query of ["json", "csv", "docx"]) {
      const slugs = filterTools(query, "All tools").map((tool) => tool.slug);
      expect(slugs, `"${query}" belongs to another tool`).not.toContain(SLUG);
    }
    // ...while its own vocabulary still works.
    for (const query of ["ocr", "extract", "handwriting"]) {
      expect(filterTools(query, "All tools").map((t) => t.slug)).toContain(
        SLUG,
      );
    }
  });

  it("suggests its own category first, then fills with relevant OCR/document neighbours", () => {
    const related = relatedTools(toolBySlug(SLUG)!);
    expect(related).toHaveLength(6);
    expect(related.map((tool) => tool.slug)).not.toContain(SLUG);
    // Starts inside the tool's own category.
    expect(related[0].category).toBe("Text & Writing");
    expect(related[1].category).toBe("Text & Writing");
    for (const tool of related) expect(toolBySlug(tool.slug)).toBeDefined();
  });
});

describe("SEO", () => {
  it("has an honest title, description and canonical path", () => {
    const title = String(metadata.title);
    expect(title).toMatch(/Image to Text \(OCR\)/);
    expect(title.length).toBeLessThanOrEqual(75);
    const description = String(metadata.description);
    expect(description.length).toBeGreaterThan(120);
    expect(description.length).toBeLessThanOrEqual(340);
    expect(description).toMatch(/uploaded|local|browser/i);
  });
});

describe("page structure", () => {
  it("renders the shared shell: breadcrumb, steps, FAQ and related tools", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Image to Text (OCR)" }),
    ).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Extract text from images and scanned PDFs",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Image-to-text and OCR questions" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "More tools for working with documents",
      }),
    ).toBeTruthy();
    // The FAQ must answer the questions people actually ask, and it must be
    // visible content, not only JSON-LD.
    expect(
      screen.getByText("Are my images or PDFs uploaded anywhere?"),
    ).toBeTruthy();
    expect(
      screen.getByText("Which languages are actually supported?"),
    ).toBeTruthy();
  });

  it("ships structured data for the page without deprecated HowTo", () => {
    const { container } = render(<Page />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.innerHTML);
    const types = data["@graph"].map(
      (node: { "@type": string }) => node["@type"],
    );
    expect(types).toEqual(["WebApplication", "FAQPage"]);
    expect(types).not.toContain("HowTo");
    expect(data["@graph"][1].mainEntity.length).toBeGreaterThanOrEqual(6);
  });
});
