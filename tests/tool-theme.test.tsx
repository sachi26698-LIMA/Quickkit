// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ToolCard from "../components/tool-card";
import { ToolIcon3D } from "../components/icon-3d";
import { toolCategories, tools } from "../lib/catalog";
import {
  toolIconStyle,
  toolSurfaceStyle,
  toolTheme,
  toolThemes,
  toolThemeStyle,
} from "../lib/tool-theme";

afterEach(cleanup);

function luminance(channels: number[]) {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("individual tool colour identities", () => {
  it("explicitly covers the entire catalog with unique primary accents", () => {
    expect(Object.keys(toolThemes).sort()).toEqual(
      tools.map((tool) => tool.slug).sort(),
    );
    expect(new Set(tools.map((tool) => toolThemes[tool.slug].rgb)).size).toBe(
      tools.length,
    );
  });

  it("keeps accent text AA-readable on white and tinted card backgrounds", () => {
    for (const theme of Object.values(toolThemes)) {
      expect(theme.rgb).toMatch(/^\d+ \d+ \d+$/);
      expect(theme.rgb2).toMatch(/^\d+ \d+ \d+$/);
      expect(theme.deep).toMatch(/^#[0-9a-f]{6}$/);
      const dark = theme.deep
        .slice(1)
        .match(/../g)!
        .map((channel) => parseInt(channel, 16));
      // Strongest card wash is 22% primary over the white glass surface.
      const tinted = theme.rgb
        .split(" ")
        .map(Number)
        .map((channel) => channel * 0.22 + 255 * 0.78);
      for (const background of [[255, 255, 255], tinted]) {
        const contrast =
          (luminance(background) + 0.05) / (luminance(dark) + 0.05);
        expect(
          contrast,
          `Text contrast for ${theme.deep}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("uses the same palette for workspace, glass surface and icon tokens", () => {
    for (const tool of tools) {
      const theme = toolTheme(tool.slug, tool.category);
      expect(toolThemeStyle(theme)).toMatchObject({
        "--t-rgb": theme.rgb,
        "--t2-rgb": theme.rgb2,
        "--t-deep": theme.deep,
      });
      expect(toolSurfaceStyle(theme)).toMatchObject({
        "--c-rgb": theme.rgb,
        "--c2-rgb": theme.rgb2,
        "--c-deep": theme.deep,
      });
      expect(toolIconStyle(theme)).toMatchObject({
        "--c-rgb": theme.rgb,
        "--i-mid": `rgb(${theme.rgb})`,
        "--i-deep": theme.deep,
        "--i-glow": theme.rgb,
      });
    }
  });

  it("renders per-tool palettes directly on every card and standalone icon", () => {
    const { container } = render(
      <>
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
        <ToolIcon3D tool={tools[0]} className="standalone-icon" />
      </>,
    );
    for (const tool of tools) {
      const card = container.querySelector<HTMLElement>(
        `article[data-tool="${tool.slug}"]`,
      )!;
      const icon = card.querySelector<HTMLElement>(".i3d")!;
      const theme = toolThemes[tool.slug];
      expect(card.style.getPropertyValue("--c-rgb")).toBe(theme.rgb);
      expect(icon.style.getPropertyValue("--c-rgb")).toBe(theme.rgb);
      expect(icon.style.getPropertyValue("--i-mid")).toBe(`rgb(${theme.rgb})`);
      expect(card.querySelector(".card-link")).toHaveAttribute(
        "href",
        `/tools/${tool.slug}`,
      );
      expect(card.querySelector(".card-link button")).toBeNull();
      expect(card.querySelector(".favorite-button")).not.toBeNull();
    }
    expect(
      container
        .querySelector<HTMLElement>(".standalone-icon")!
        .style.getPropertyValue("--c-rgb"),
    ).toBe(toolThemes[tools[0].slug].rgb);
  });

  it("falls back to a usable category palette for future tools", () => {
    for (const category of toolCategories) {
      expect(toolTheme("future-tool", category)).toEqual(
        expect.objectContaining({
          rgb: expect.any(String),
          rgb2: expect.any(String),
          deep: expect.any(String),
        }),
      );
    }
  });
});
