import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  commit,
  confidenceMap,
  createEditor,
  findMatches,
  highlightSegments,
  redo,
  replaceAll,
  replaceOne,
  textStats,
  undo,
  uncertainLines,
} from "@/lib/tools/image-to-text/editor";
import type { OcrPage } from "@/lib/tools/image-to-text/types";

const options = { matchCase: false, wholeWord: false };

describe("undo and redo", () => {
  it("commits, undoes and redoes", () => {
    let state = createEditor("hello");
    state = commit(state, "hello world");
    expect(canUndo(state)).toBe(true);
    state = undo(state);
    expect(state.text).toBe("hello");
    expect(canRedo(state)).toBe(true);
    state = redo(state);
    expect(state.text).toBe("hello world");
  });
  it("ignores no-op commits", () => {
    const state = createEditor("same");
    expect(commit(state, "same")).toBe(state);
  });
  it("does nothing at the ends of history", () => {
    const state = createEditor("only");
    expect(undo(state)).toBe(state);
    expect(redo(state)).toBe(state);
  });
  it("caps the history depth", () => {
    let state = createEditor("0");
    for (let index = 1; index <= MAX_HISTORY + 20; index += 1)
      state = commit(state, `v${index}`);
    expect(state.past.length).toBe(MAX_HISTORY);
  });
  it("drops the redo stack after a fresh edit", () => {
    let state = createEditor("a");
    state = commit(state, "b");
    state = undo(state);
    state = commit(state, "c");
    expect(canRedo(state)).toBe(false);
    expect(state.text).toBe("c");
  });
});

describe("find and replace", () => {
  const text = "The cat sat. The CAT ran. Concatenate the cats.";
  it("finds case-insensitively by default", () => {
    expect(findMatches(text, "cat", options)).toHaveLength(4);
  });
  it("respects match case", () => {
    expect(
      findMatches(text, "CAT", { matchCase: true, wholeWord: false }),
    ).toHaveLength(1);
  });
  it("matches whole words only when asked", () => {
    const whole = findMatches(text, "cat", {
      matchCase: false,
      wholeWord: true,
    });
    expect(whole).toHaveLength(2);
  });
  it("returns nothing for an empty query", () => {
    expect(findMatches(text, "   ", options)).toEqual([]);
  });
  it("treats regex characters literally", () => {
    expect(findMatches("a.b", ".", options)).toHaveLength(1);
    expect(findMatches("axb", ".", options)).toHaveLength(0);
  });
  it("replaces every match", () => {
    const result = replaceAll(text, "cat", "dog", options);
    expect(result.replaced).toBe(4);
    expect(result.text).toContain("The dog sat.");
  });
  it("replaces one match from a position", () => {
    const result = replaceOne(text, "cat", "dog", 0, options);
    expect(result.replaced).toBe(1);
    expect(result.text.startsWith("The dog sat.")).toBe(true);
  });
  it("preserves Unicode when replacing", () => {
    const result = replaceAll("નમસ્તે ગુજરાત", "ગુજરાત", "भारत", options);
    expect(result.text).toBe("નમસ્તે भारत");
  });
});

describe("confidence highlighting", () => {
  const confidences = new Map([
    ["clear", 95],
    ["blurry", 20],
  ]);
  it("highlights uncertain words plus one neighbour", () => {
    const segments = highlightSegments("clear blurry text", confidences, 60);
    expect(segments.some((segment) => segment.uncertain)).toBe(true);
    const joined = segments.map((segment) => segment.text).join("");
    expect(joined).toBe("clear blurry text");
  });
  it("returns one segment when nothing is uncertain", () => {
    const segments = highlightSegments("clear text", confidences, 60);
    expect(segments).toHaveLength(1);
    expect(segments[0].uncertain).toBe(false);
  });
  it("handles empty text", () => {
    expect(highlightSegments("", confidences, 60)).toEqual([]);
  });
});

describe("page helpers", () => {
  const page: OcrPage = {
    id: "s:1",
    sourceId: "s",
    sourceName: "scan.png",
    page: 1,
    pageCount: 1,
    width: 100,
    height: 100,
    lines: [
      {
        text: "Good line",
        confidence: 95,
        bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
        height: 20,
        words: [
          {
            text: "Good",
            confidence: 96,
            bbox: { x0: 0, y0: 0, x1: 40, y1: 20 },
          },
          {
            text: "line",
            confidence: 94,
            bbox: { x0: 45, y0: 0, x1: 100, y1: 20 },
          },
        ],
        paragraph: 1,
        block: 0,
      },
      {
        text: "Bad lıne",
        confidence: 30,
        bbox: { x0: 0, y0: 24, x1: 100, y1: 44 },
        height: 20,
        words: [
          {
            text: "Bad",
            confidence: 25,
            bbox: { x0: 0, y0: 24, x1: 40, y1: 44 },
          },
          {
            text: "lıne",
            confidence: 35,
            bbox: { x0: 45, y0: 24, x1: 100, y1: 44 },
          },
        ],
        paragraph: 1,
        block: 0,
      },
    ],
    text: "Good line\nBad lıne",
    confidence: 70,
    durationMs: 10,
    lowConfidenceShare: 0.5,
    languages: ["eng"],
    rtl: false,
    warnings: [],
  };
  it("maps words to their worst confidence", () => {
    const map = confidenceMap(page);
    expect(map.get("good")).toBe(96);
    expect(map.get("bad")).toBe(25);
  });
  it("lists uncertain lines", () => {
    expect(uncertainLines(page, 60).map((line) => line.text)).toEqual([
      "Bad lıne",
    ]);
  });
  it("counts characters, words and lines", () => {
    expect(textStats("one two\nthree")).toEqual({
      characters: 13,
      words: 3,
      lines: 2,
    });
    expect(textStats("")).toEqual({ characters: 0, words: 0, lines: 0 });
  });
});
