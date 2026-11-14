// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CategoryGrid from "../components/category-grid";
import {
  categoryMeta,
  filterTools,
  tools,
  toolsByCategory,
} from "../lib/catalog";
import { securityToolDefinitions } from "../lib/tools/security/catalog";

describe("category catalog snapshot", () => {
  it("counts unique published routes consistently across the category and explorer", () => {
    const category = toolsByCategory("Security & Privacy");
    expect(securityToolDefinitions).toHaveLength(57);
    expect(category).toHaveLength(9);
    expect(category.map((t) => t.slug)).toEqual(
      filterTools("", "Security & Privacy").map((t) => t.slug),
    );
    expect(category.map((t) => t.slug)).toEqual(
      expect.arrayContaining([
        "password-generator",
        "hash-generator",
        "advanced-cryptography",
      ]),
    );
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
    for (const meta of categoryMeta)
      expect(filterTools("", meta.name)).toEqual(toolsByCategory(meta.name));
  });
  it("hydrates the exact server-provided category snapshot without recomputing it", async () => {
    const cards = categoryMeta.map((meta) => ({
      meta,
      count: toolsByCategory(meta.name).length,
    }));
    const container = document.createElement("div");
    container.innerHTML = renderToString(<CategoryGrid cards={cards} />);
    document.body.appendChild(container);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <CategoryGrid cards={cards} />, {
        onRecoverableError: (e) => errors.push(e),
      });
    });
    expect(errors).toEqual([]);
    const card = container.querySelector(
      'a[href="/category/security-privacy"]',
    );
    expect(card?.querySelector(".category-count")?.textContent).toBe("9 tools");
    await act(async () => root!.unmount());
    container.remove();
  });
});
