// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Icon3D, {
  CategoryIcon3D,
  ToolIcon3D,
  categoryArt,
  categoryTone,
  toolArt,
  toolTone,
} from "../components/icon-3d";
import { categoryMeta, tools, type ToolCategory } from "../lib/catalog";

afterEach(cleanup);

describe("3D icon system", () => {
  it("gives every catalog tool its own drawn glyph", () => {
    const missing = tools.filter((t) => !toolArt[t.slug]).map((t) => t.slug);
    expect(missing).toEqual([]);
    // The icon is a drawing plus a palette: `toolIconStyle` gives every tool its
    // own accent (tests/tool-theme.test.tsx pins that), so two tools sharing a
    // drawing still render as two different icons. The 56 shipped tools each own
    // a bespoke drawing; the launched HR / SEO / Career tools draw from their
    // category's three shapes — a people mark, a chart and a briefcase — which
    // stay recognisable at 24px where a seventh bespoke curve would not.
    const BESPOKE = 56;
    const CATEGORY_SHAPES = 3;
    const glyphs = tools.map((t) => toolArt[t.slug]);
    const distinct = new Set(glyphs);
    expect(distinct.size).toBe(BESPOKE + CATEGORY_SHAPES);
    const families = ["people", "chart", "briefcase"];
    for (const tool of tools) {
      if (
        tool.category === "HR & Payroll" ||
        tool.category === "SEO & Website Growth" ||
        tool.category === "Career & Jobs"
      ) {
        expect(families, `${tool.slug} draws a family shape`).toContain(
          toolArt[tool.slug],
        );
      } else {
        // Nothing outside the launched categories may borrow a family shape.
        expect(families, `${tool.slug} keeps its own drawing`).not.toContain(
          toolArt[tool.slug],
        );
      }
    }
  });

  it("gives every category a distinct glyph", () => {
    const glyphs = categoryMeta.map((c) => categoryArt[c.icon]);
    expect(new Set(glyphs).size).toBe(categoryMeta.length);
  });

  it("gives each category its own tone and Developer Tools distinct accents", () => {
    const tones = categoryMeta.map((c) => categoryTone(c.name));
    expect(new Set(tones).size).toBe(categoryMeta.length);
    const developerTools = tools.filter(
      (tool) => tool.category === "Developer Tools",
    );
    const developerTones = developerTools.map((tool) => toolTone(tool));
    expect(new Set(developerTones).size).toBe(developerTools.length);
    for (const tool of tools.filter(
      (item) => item.category !== "Developer Tools",
    )) {
      expect(toolTone(tool)).toBe(categoryTone(tool.category as ToolCategory));
    }
  });

  it("renders decorative, hidden icons with unique gradient ids", () => {
    const { container } = render(
      <>
        <CategoryIcon3D meta={categoryMeta[0]} />
        <ToolIcon3D tool={tools[0]} />
        <ToolIcon3D tool={tools[0]} />
      </>,
    );
    const icons = container.querySelectorAll(".i3d");
    expect(icons).toHaveLength(3);
    icons.forEach((el) => expect(el).toHaveAttribute("aria-hidden", "true"));
    const ids = [...container.querySelectorAll("[id]")].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("derives animation timing from the name, so SSR and client agree", () => {
    const a = render(<Icon3D name="pdf" tone="violet" />).container;
    const timing = (el: HTMLElement) => {
      const s = el.querySelector<HTMLElement>(".i3d")!.style;
      return `${s.getPropertyValue("--i-dur")}/${s.getPropertyValue("--i-delay")}`;
    };
    const first = timing(a);
    cleanup();
    const b = render(<Icon3D name="pdf" tone="violet" />).container;
    expect(timing(b)).toBe(first);
  });
});
