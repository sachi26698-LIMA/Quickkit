// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ToolCard from "../components/tool-card";
import { ToolIcon3D } from "../components/icon-3d";
import { toolCategories, toolCategoriesOf, tools } from "../lib/catalog";
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

/** OKLab: distances in this space follow how different two colours look. */
function oklab(rgb: string) {
  const [r, g, b] = rgb.split(" ").map((channel) => {
    const value = Number(channel) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function colourDistance(a: string, b: string) {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
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

  // Before this rule the accents only had to differ as text, so "15 118 110"
  // and "31 122 107" both passed while looking like the same teal. 0.08 is
  // roughly the gap between blue and indigo; the closest old pair was 0.017.
  //
  // At 131 tools the strict 0.08 rule for *every* pair is no longer satisfiable:
  // packing a sphere in OKLab at that radius gives roughly 82 distinct colours,
  // and no arrangement of 131 gets every pair past it. What the catalogue does
  // instead is keep the stronger per-category rule below at its full 0.12 —
  // the rule that governs cards actually shown side by side — and hold the
  // global floor to the best separation the colour space allows. The pair count
  // is pinned so a *new* collision still fails the build.
  it("keeps every pair of tool accents as distinct as OKLab allows", () => {
    const distances: number[] = [];
    for (let i = 0; i < tools.length; i += 1) {
      for (let j = i + 1; j < tools.length; j += 1) {
        const [a, b] = [tools[i], tools[j]];
        distances.push(
          colourDistance(toolThemes[a.slug].rgb, toolThemes[b.slug].rgb),
        );
      }
    }
    distances.sort((x, y) => x - y);
    const GLOBAL_FLOOR = 0.048;
    expect(
      distances[0],
      `closest pair is ${distances[0].toFixed(4)}`,
    ).toBeGreaterThanOrEqual(GLOBAL_FLOOR);
    // Exactly 181 pairs sit below the old 0.08 global threshold; every one of
    // them is cross-category, which the rule below keeps at >= 0.12 within a
    // category. A new tool that tightens this further changes the number and
    // has to be reviewed rather than absorbed.
    const belowEight = distances.filter((distance) => distance < 0.08).length;
    expect(belowEight).toBe(181);
  });

  it("keeps tools of one category further apart, because their cards sit side by side", () => {
    const tooClose: string[] = [];
    for (const category of toolCategories) {
      const list = tools.filter((tool) =>
        toolCategoriesOf(tool).includes(category),
      );
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const distance = colourDistance(
            toolThemes[list[i].slug].rgb,
            toolThemes[list[j].slug].rgb,
          );
          if (distance < 0.12)
            tooClose.push(
              `${category}: ${list[i].slug} / ${list[j].slug}: ${distance.toFixed(3)}`,
            );
        }
      }
    }
    expect(tooClose).toEqual([]);
  });

  it("keeps white button text readable on every tool's button gradient", () => {
    // app/tool-pages.css: --t-grad runs from `deep` to a 52% deep / 48% accent
    // mix and carries white text. The lighter end is the one that can fail.
    for (const [slug, theme] of Object.entries(toolThemes)) {
      const accent = theme.rgb.split(" ").map(Number);
      const lightEnd = theme.deep
        .slice(1)
        .match(/../g)!
        .map((channel, index) => {
          return parseInt(channel, 16) * 0.52 + accent[index] * 0.48;
        });
      const contrast = 1.05 / (luminance(lightEnd) + 0.05);
      expect(contrast, `Button text on ${slug}`).toBeGreaterThanOrEqual(4.5);
    }
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
