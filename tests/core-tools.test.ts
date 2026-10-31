import { describe, it, expect } from "vitest";
import { countText, convertCase } from "../lib/tools/text";
import { processJson } from "../lib/tools/json";
import {
  generatePassword,
  defaultPasswordOptions,
} from "../lib/tools/password";
describe("word counter", () => {
  it("handles empty and whitespace", () => {
    expect(countText("").words).toBe(0);
    expect(countText(" \n ").paragraphs).toBe(0);
  });
  it("counts a normal passage", () => {
    expect(countText("Hello world.\n\nAnother paragraph!")).toEqual({
      words: 4,
      characters: 32,
      withoutSpaces: 28,
      sentences: 2,
      paragraphs: 2,
      readingSeconds: 2,
    });
  });
  it("handles Unicode code points", () =>
    expect(countText("Hi 😀").characters).toBe(4));
  it("handles one million characters", () =>
    expect(countText("word ".repeat(200000)).words).toBe(200000));
});
describe("case converter", () => {
  it("preserves newlines", () =>
    expect(convertCase("Hi\nWorld", "UPPERCASE")).toBe("HI\nWORLD"));
  it("supports lowercase", () =>
    expect(convertCase("HELLO", "lowercase")).toBe("hello"));
  it("supports title case", () =>
    expect(convertCase("hello WORLD", "Title Case")).toBe("Hello World"));
  it("supports sentence case", () =>
    expect(convertCase("hELLO. WORLD!\nNEXT", "Sentence case")).toBe(
      "Hello. World!\nNext",
    ));
  it("handles empty", () => expect(convertCase("", "Title Case")).toBe(""));
});
describe("JSON processing", () => {
  it("formats Unicode", () =>
    expect(processJson('{"name":"नमस्ते"}', "format")).toBe(
      '{\n  "name": "नमस्ते"\n}',
    ));
  it("minifies", () =>
    expect(processJson(' { "x": 2 } ', "minify")).toBe('{"x":2}'));
  it("validates primitives", () =>
    expect(processJson("null", "validate")).toBe("null"));
  it("rejects blank, invalid and oversized input", () => {
    for (const input of ["", "{bad}", "x".repeat(1000001)])
      expect(() => processJson(input, "format")).toThrow();
  });
  it("does not execute code", () =>
    expect(() => processJson("(()=>42)()", "validate")).toThrow());
});
describe("password generation", () => {
  it("uses exact length and all sets", () => {
    for (let i = 0; i < 30; i++) {
      const p = generatePassword(defaultPasswordOptions);
      expect(p).toHaveLength(20);
      for (const pattern of [
        /[A-Z]/,
        /[a-z]/,
        /[0-9]/,
        /[!@#$%^&*()\-_=+\[\]{};:,.?]/,
      ])
        expect(p).toMatch(pattern);
    }
  });
  it("excludes ambiguous characters", () =>
    expect(
      generatePassword({
        ...defaultPasswordOptions,
        excludeAmbiguous: true,
        length: 64,
      }),
    ).not.toMatch(/[Il1O0o|]/));
  it("supports one set", () =>
    expect(
      generatePassword({
        ...defaultPasswordOptions,
        uppercase: false,
        lowercase: false,
        symbols: false,
      }),
    ).toMatch(/^\d{20}$/));
  it("rejects empty sets", () =>
    expect(() =>
      generatePassword({
        ...defaultPasswordOptions,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      }),
    ).toThrow("Select at least"));
  it("rejects invalid lengths", () => {
    for (const length of [7, 65, NaN, 8.5])
      expect(() =>
        generatePassword({ ...defaultPasswordOptions, length }),
      ).toThrow();
  });
});
it("rejects excessively nested JSON safely", () =>
  expect(() =>
    processJson("[".repeat(129) + "0" + "]".repeat(129), "format"),
  ).toThrow("128 levels"));
it("treats braces and escaped quotes within JSON strings as text", () =>
  expect(processJson(JSON.stringify({ value: '[[["{{{' }), "minify")).toBe(
    JSON.stringify({ value: '[[["{{{' }),
  ));
it("handles a large valid JSON array", () =>
  expect(
    JSON.parse(processJson(JSON.stringify(Array(100000).fill("😀")), "minify")),
  ).toHaveLength(100000));
