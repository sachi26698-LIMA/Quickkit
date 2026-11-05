// @vitest-environment jsdom
/**
 * V3 template library + custom-template persistence.
 *
 * Proves the gallery is real: 55 distinct designs across the eleven required
 * categories, search + category filtering, and a save/duplicate/delete
 * round-trip through localStorage that never touches presets or history.
 * (Decode verification of every template lives in qr-render.test.ts.)
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  QR_TEMPLATE_LIBRARY,
  TEMPLATE_CATEGORIES,
  categoryLabel,
  searchTemplates,
  templateById,
} from "@/lib/tools/qr/templates";
import {
  CUSTOM_TEMPLATE_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  deleteCustomTemplate,
  duplicateCustomTemplate,
  loadCustomTemplates,
  saveCustomTemplate,
} from "@/lib/tools/qr/storage";
import { defaultDesign } from "@/lib/tools/qr/style";

describe("template library", () => {
  it("ships at least 50 distinct templates", () => {
    expect(QR_TEMPLATE_LIBRARY.length).toBeGreaterThanOrEqual(50);
    const ids = new Set(QR_TEMPLATE_LIBRARY.map((t) => t.id));
    expect(ids.size).toBe(QR_TEMPLATE_LIBRARY.length);
  });

  it("covers all eleven required categories with several templates each", () => {
    expect(TEMPLATE_CATEGORIES.map((c) => c.id).sort()).toEqual(
      [
        "business",
        "restaurant",
        "social",
        "events",
        "marketing",
        "packaging",
        "personal",
        "education",
        "retail",
        "travel",
        "realestate",
      ].sort(),
    );
    for (const category of TEMPLATE_CATEGORIES) {
      const count = QR_TEMPLATE_LIBRARY.filter(
        (t) => t.category === category.id,
      ).length;
      expect(
        count,
        `${category.id} should have templates`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every template a design, a caption and print metadata", () => {
    for (const template of QR_TEMPLATE_LIBRARY) {
      expect(template.design.fg, template.id).toBeDefined();
      expect(template.design.bg, template.id).toBeDefined();
      expect(template.name.length).toBeGreaterThan(2);
      expect(template.blurb.length).toBeGreaterThan(4);
      expect(template.label, `${template.id} caption`).toBeTruthy();
      expect(template.printMm, `${template.id} print size`).toBeGreaterThan(0);
      expect(template.layout, `${template.id} layout`).toBeTruthy();
    }
  });

  it("keeps the original eight template names available", () => {
    for (const id of [
      "signature",
      "midnight",
      "editorial",
      "sunrise",
      "mint",
      "noir",
      "glass",
      "poster",
    ]) {
      expect(templateById(id), id).toBeDefined();
    }
  });
});

describe("template search and filtering", () => {
  it("filters by category", () => {
    const restaurant = searchTemplates(QR_TEMPLATE_LIBRARY, "", "restaurant");
    expect(restaurant.length).toBeGreaterThan(0);
    expect(restaurant.every((t) => t.category === "restaurant")).toBe(true);
  });

  it("matches name, blurb and category label case-insensitively", () => {
    expect(
      searchTemplates(QR_TEMPLATE_LIBRARY, "MIDNIGHT", "all").some(
        (t) => t.id === "midnight",
      ),
    ).toBe(true);
    expect(
      searchTemplates(QR_TEMPLATE_LIBRARY, "menu", "all").length,
    ).toBeGreaterThan(0);
    expect(
      searchTemplates(QR_TEMPLATE_LIBRARY, "real estate", "all").length,
    ).toBeGreaterThan(0);
  });

  it("combines a query with a category filter", () => {
    const result = searchTemplates(QR_TEMPLATE_LIBRARY, "plum", "business");
    expect(result.every((t) => t.category === "business")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns nothing for a nonsense query", () => {
    expect(
      searchTemplates(QR_TEMPLATE_LIBRARY, "zzzz-no-such-template", "all"),
    ).toHaveLength(0);
  });

  it("labels categories for people", () => {
    expect(categoryLabel("restaurant")).toBe("Restaurant & Cafe");
    expect(categoryLabel("realestate")).toBe("Real Estate");
  });
});

describe("custom template persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves, loads and deletes a custom template", () => {
    const design = { ...defaultDesign(), errorLevel: "H" as const };
    let templates = saveCustomTemplate(
      { name: "My café look", category: "restaurant", design, label: "Menu" },
      loadCustomTemplates(),
    );
    expect(templates).toHaveLength(1);
    expect(templates[0].custom).toBe(true);
    expect(templates[0].name).toBe("My café look");
    expect(templates[0].category).toBe("restaurant");
    expect(templates[0].label).toBe("Menu");

    const reloaded = loadCustomTemplates();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].design.errorLevel).toBe("H");

    templates = deleteCustomTemplate(templates[0].id, reloaded);
    expect(templates).toHaveLength(0);
    expect(loadCustomTemplates()).toHaveLength(0);
  });

  it("duplicates a built-in template into an editable custom copy", () => {
    const source = templateById("signature")!;
    const templates = duplicateCustomTemplate(source, loadCustomTemplates());
    expect(templates).toHaveLength(1);
    expect(templates[0].custom).toBe(true);
    expect(templates[0].id).not.toBe(source.id);
    expect(templates[0].name).toContain("copy");
    // The original built-in is untouched.
    expect(templateById("signature")!.custom).toBeUndefined();
  });

  it("never writes to the preset or history storage keys", () => {
    saveCustomTemplate(
      { name: "Look", category: "business", design: defaultDesign() },
      loadCustomTemplates(),
    );
    expect(window.localStorage.getItem(PRESET_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY),
    ).not.toBeNull();
  });

  it("only returns custom templates from the custom filter", () => {
    const saved = saveCustomTemplate(
      { name: "Mine", category: "personal", design: defaultDesign() },
      loadCustomTemplates(),
    );
    const all = [...QR_TEMPLATE_LIBRARY, ...saved];
    const custom = searchTemplates(all, "", "custom");
    expect(custom).toHaveLength(1);
    expect(custom[0].name).toBe("Mine");
  });
});
