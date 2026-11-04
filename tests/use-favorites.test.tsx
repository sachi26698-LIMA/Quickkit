// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  FAVORITES_KEY,
  SLUG_MIGRATIONS,
  useFavorites,
} from "@/lib/use-favorites";

/** Render the real hook and return what it read out of storage. */
function readSaved(seed: unknown): string[] {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(seed));
  let captured: string[] = [];
  function Probe() {
    captured = useFavorites().saved;
    return null;
  }
  render(<Probe />);
  return captured;
}

describe("saved-tool slug migration", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("rewrites the retired image-converter slug to image-to-image", () => {
    expect(readSaved(["image-converter"])).toEqual(["image-to-image"]);
  });

  it("leaves current slugs untouched", () => {
    expect(readSaved(["merge-pdf", "pdf-studio"])).toEqual([
      "merge-pdf",
      "pdf-studio",
    ]);
  });

  it("migrates in place and preserves the rest of the list and its order", () => {
    expect(readSaved(["merge-pdf", "image-converter", "pdf-studio"])).toEqual([
      "merge-pdf",
      "image-to-image",
      "pdf-studio",
    ]);
  });

  it("de-duplicates when both the old and the new slug were saved", () => {
    expect(readSaved(["image-converter", "image-to-image"])).toEqual([
      "image-to-image",
    ]);
  });

  it("survives malformed storage instead of throwing", () => {
    window.localStorage.setItem(FAVORITES_KEY, "{not json");
    let captured: string[] = ["unset"];
    function Probe() {
      captured = useFavorites().saved;
      return null;
    }
    render(<Probe />);
    expect(captured).toEqual([]);
  });

  it("drops non-string entries rather than migrating them", () => {
    expect(readSaved(["image-converter", 42, null, "merge-pdf"])).toEqual([
      "image-to-image",
      "merge-pdf",
    ]);
  });

  it("maps every retired slug to a slug that actually exists in the catalogue", async () => {
    const { tools } = await import("@/lib/catalog");
    // Widened to string: the migration table's values are plain strings.
    const live = new Set<string>(tools.map((tool) => tool.slug));
    for (const [oldSlug, newSlug] of Object.entries(SLUG_MIGRATIONS)) {
      expect(live.has(newSlug), `${oldSlug} -> ${newSlug}`).toBe(true);
      // The retired slug must be gone from the catalogue, otherwise the
      // migration would be rewriting a slug that still resolves on its own.
      expect(live.has(oldSlug), `${oldSlug} still in catalogue`).toBe(false);
    }
  });
});
