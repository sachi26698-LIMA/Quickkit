// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import CategoryPage from "../app/(public)/category/[slug]/page";
import CategoryToolGrid from "../components/category-tool-grid";
import { categoryMeta, toolsByCategory, type Tool } from "../lib/catalog";
import {
  OTHER_GROUP_ID,
  categoryFilterFor,
  categoryFilters,
  filterCategoryTools,
} from "../lib/category-filters";

afterEach(cleanup);

const withTools = categoryMeta.filter(
  (meta) => toolsByCategory(meta.name).length > 0,
);

function renderGrid(slug: string) {
  const meta = categoryMeta.find((entry) => entry.slug === slug)!;
  const tools = toolsByCategory(meta.name);
  const filter = categoryFilterFor(meta.slug, meta.name);
  const view = render(
    <CategoryToolGrid
      tools={tools}
      categoryName={meta.name}
      tone="violet"
      filter={filter}
    />,
  );
  return { ...view, meta, tools, filter };
}

const shownSlugs = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("article[data-tool]")].map(
    (card) => card.dataset.tool,
  );

describe("category type lists", () => {
  it("has a list for every category that has tools", () => {
    expect(withTools.length).toBeGreaterThanOrEqual(7);
    for (const meta of withTools) {
      expect(categoryFilters[meta.slug], meta.slug).toBeDefined();
    }
  });

  it("places every tool of a category in exactly one type", () => {
    for (const meta of withTools) {
      const filter = categoryFilters[meta.slug];
      const placed = filter.groups.flatMap((group) => group.slugs);
      expect([...placed].sort(), meta.slug).toEqual(
        toolsByCategory(meta.name)
          .map((tool) => tool.slug)
          .sort(),
      );
      expect(new Set(placed).size, meta.slug).toBe(placed.length);
    }
  });

  it("keeps type ids unique and clear of the built-in options", () => {
    for (const [slug, filter] of Object.entries(categoryFilters)) {
      const ids = filter.groups.map((group) => group.id);
      expect(new Set(ids).size, slug).toBe(ids.length);
      expect(ids, slug).not.toContain("all");
      expect(ids, slug).not.toContain(OTHER_GROUP_ID);
      for (const group of filter.groups) {
        expect(group.slugs.length, `${slug}/${group.id}`).toBeGreaterThan(0);
        expect(group.label.trim(), `${slug}/${group.id}`).not.toBe("");
      }
    }
  });

  it("keeps the calculator types the site already had", () => {
    const filter = categoryFilters.calculators;
    expect(filter.typeLabel).toBe("Calculator type");
    expect(filter.noun).toBe("calculators");
    expect(
      filter.groups.find((group) => group.id === "financial")!.slugs,
    ).toEqual([
      "discount-calculator",
      "gst-calculator",
      "emi-calculator",
      "loan-calculator",
    ]);
  });
});

describe("filterCategoryTools", () => {
  const tool = (slug: string, name: string, keywords = "") =>
    ({ slug, name, description: `${name} description`, keywords }) as const;
  const list = [
    tool("a", "Alpha", "first"),
    tool("b", "Beta"),
    tool("c", "Gamma"),
  ];
  const filter = {
    noun: "tools",
    typeLabel: "Type",
    groups: [{ id: "one", label: "One", slugs: ["a", "b"] }],
  };

  it("returns everything for the default options", () => {
    expect(filterCategoryTools(list, filter, "all", "")).toEqual(list);
    expect(filterCategoryTools(list, filter, "all", "   ")).toEqual(list);
  });

  it("filters by type and keeps the given order", () => {
    expect(
      filterCategoryTools(list, filter, "one", "").map((entry) => entry.slug),
    ).toEqual(["a", "b"]);
  });

  it("collects tools that are in no type under Other", () => {
    expect(
      filterCategoryTools(list, filter, OTHER_GROUP_ID, "").map(
        (entry) => entry.slug,
      ),
    ).toEqual(["c"]);
  });

  it("searches name, description and keywords without caring about case", () => {
    const slugs = (query: string) =>
      filterCategoryTools(list, filter, "all", query).map(
        (entry) => entry.slug,
      );
    expect(slugs("BETA")).toEqual(["b"]);
    expect(slugs("  first ")).toEqual(["a"]);
    expect(slugs("description")).toEqual(["a", "b", "c"]);
    expect(slugs("nothing like this")).toEqual([]);
  });

  it("applies type and search together", () => {
    expect(filterCategoryTools(list, filter, "one", "gamma")).toEqual([]);
  });

  it("shows nothing for a type that does not exist", () => {
    expect(filterCategoryTools(list, filter, "missing", "")).toEqual([]);
  });
});

describe("CategoryToolGrid", () => {
  it.each(withTools.map((meta) => [meta.slug]))(
    "gives %s a search box, a type picker and a count",
    (slug) => {
      const { container, tools, filter } = renderGrid(slug);
      expect(
        screen.getByLabelText(`Search ${filter.noun}`),
      ).toBeInTheDocument();
      const select = screen.getByLabelText(
        filter.typeLabel,
      ) as HTMLSelectElement;
      expect([...select.options].map((option) => option.value)).toEqual([
        "all",
        ...filter.groups.map((group) => group.id),
      ]);
      expect(
        screen.getByText(
          `Showing ${tools.length} of ${tools.length} ${filter.noun}`,
        ),
      ).toBeInTheDocument();
      expect(shownSlugs(container)).toEqual(tools.map((tool) => tool.slug));

      // Every type shows exactly its own tools.
      for (const group of filter.groups) {
        fireEvent.change(select, { target: { value: group.id } });
        expect([...shownSlugs(container)].sort()).toEqual(
          [...group.slugs].sort(),
        );
        expect(
          screen.getByText(
            `Showing ${group.slugs.length} of ${tools.length} ${filter.noun}`,
          ),
        ).toBeInTheDocument();
      }
    },
  );

  it("searches inside the chosen type", () => {
    const { container } = renderGrid("calculators");
    fireEvent.change(screen.getByLabelText("Calculator type"), {
      target: { value: "financial" },
    });
    fireEvent.change(screen.getByLabelText("Search calculators"), {
      target: { value: "gst" },
    });
    expect(shownSlugs(container)).toEqual(["gst-calculator"]);
    expect(screen.getByText("Showing 1 of 12 calculators")).toBeInTheDocument();
  });

  it("finds a PDF tool by typing part of its name", () => {
    const { container } = renderGrid("pdf-tools");
    fireEvent.change(screen.getByLabelText("Search PDF tools"), {
      target: { value: "merge" },
    });
    expect(shownSlugs(container)).toContain("merge-pdf");
    expect(shownSlugs(container)).not.toContain("pdf-lock-unlock");
  });

  it("explains an empty result and can show everything again", () => {
    const { container, tools } = renderGrid("image-tools");
    fireEvent.change(screen.getByLabelText("Search image tools"), {
      target: { value: "zzzz-no-such-tool" },
    });
    expect(shownSlugs(container)).toEqual([]);
    expect(
      screen.getByText(
        "No matching image tools. Try a different search or filter.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Show all image tools" }),
    );
    expect(shownSlugs(container)).toHaveLength(tools.length);
    expect(
      (screen.getByLabelText("Search image tools") as HTMLInputElement).value,
    ).toBe("");
  });

  it("labels a shared tool with the category being viewed", () => {
    const { container } = renderGrid("security-privacy");
    const card = container.querySelector<HTMLElement>(
      'article[data-tool="hash-generator"]',
    )!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("Security & Privacy");
    expect(card.textContent).not.toContain("Developer Tools");
  });

  it("offers Other only when a tool is not in any type", () => {
    const meta = categoryMeta.find((entry) => entry.slug === "image-tools")!;
    const tools = toolsByCategory(meta.name);
    const filter = categoryFilterFor(meta.slug, meta.name);
    const trimmed = {
      ...filter,
      groups: [
        { ...filter.groups[0], slugs: filter.groups[0].slugs.slice(0, 1) },
      ],
    };
    const { container } = render(
      <CategoryToolGrid
        tools={tools as Tool[]}
        categoryName={meta.name}
        tone="coral"
        filter={trimmed}
      />,
    );
    const select = screen.getByLabelText(filter.typeLabel) as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toContain(
      OTHER_GROUP_ID,
    );
    fireEvent.change(select, { target: { value: OTHER_GROUP_ID } });
    expect(shownSlugs(container)).toHaveLength(tools.length - 1);
    // Nothing is lost: "All" still lists every tool.
    fireEvent.change(select, { target: { value: "all" } });
    expect(shownSlugs(container)).toHaveLength(tools.length);
  });

  it("still lists every tool when a category has no types defined", () => {
    const meta = categoryMeta.find((entry) => entry.slug === "pdf-tools")!;
    const tools = toolsByCategory(meta.name);
    const { container } = render(
      <CategoryToolGrid
        tools={tools}
        categoryName={meta.name}
        tone="violet"
        filter={categoryFilterFor("brand-new-category", "Brand new")}
      />,
    );
    expect(shownSlugs(container)).toHaveLength(tools.length);
    expect(screen.getByLabelText("Search tools")).toBeInTheDocument();
    const select = screen.getByLabelText("Brand new type") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["all"]);
  });
});

describe("category pages", () => {
  it.each(withTools.map((meta) => [meta.slug]))(
    "/category/%s shows the search box and the type picker",
    async (slug) => {
      const meta = categoryMeta.find((entry) => entry.slug === slug)!;
      const filter = categoryFilters[slug];
      const { container } = render(
        await CategoryPage({ params: Promise.resolve({ slug }) }),
      );
      expect(
        screen.getByLabelText(`Search ${filter.noun}`),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(filter.typeLabel)).toBeInTheDocument();
      expect(shownSlugs(container)).toEqual(
        toolsByCategory(meta.name).map((tool) => tool.slug),
      );
    },
  );

  it("keeps the coming-soon notice, without a filter, for an empty category", async () => {
    const empty = categoryMeta.find(
      (meta) => toolsByCategory(meta.name).length === 0,
    );
    if (!empty) return;
    const { container } = render(
      await CategoryPage({ params: Promise.resolve({ slug: empty.slug }) }),
    );
    expect(container.querySelector(".coming-soon")).not.toBeNull();
    expect(container.querySelector(".category-filters")).toBeNull();
  });
});
