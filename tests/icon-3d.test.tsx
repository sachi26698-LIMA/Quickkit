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
  it("gives every catalog tool its own bespoke glyph", () => {
    const missing = tools.filter((t) => !toolArt[t.slug]).map((t) => t.slug);
    expect(missing).toEqual([]);
    const glyphs = tools.map((t) => toolArt[t.slug]);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("gives every category a distinct glyph", () => {
    const glyphs = categoryMeta.map((c) => categoryArt[c.icon]);
    expect(new Set(glyphs).size).toBe(categoryMeta.length);
  });

  it("gives each category its own tone and tools inherit it", () => {
    const tones = categoryMeta.map((c) => categoryTone(c.name));
    expect(new Set(tones).size).toBe(categoryMeta.length);
    for (const t of tools) {
      expect(toolTone(t)).toBe(categoryTone(t.category as ToolCategory));
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
