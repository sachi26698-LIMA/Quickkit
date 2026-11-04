import { describe, expect, it } from "vitest";
import {
  detectColumns,
  detectTables,
  flattenLines,
  groupRows,
  looksTabular,
  lowConfidenceLines,
  lowConfidenceShare,
  meanConfidence,
  readingOrder,
} from "@/lib/tools/image-to-text/geometry";
import type { OcrLine } from "@/lib/tools/image-to-text/types";

function line(
  text: string,
  x: number,
  y: number,
  width: number,
  height = 16,
  confidence = 95,
): OcrLine {
  const words = text.split(/\s+/).map((word, index, all) => ({
    text: word,
    confidence,
    bbox: {
      x0: x + (index * width) / all.length,
      y0: y,
      x1: x + ((index + 1) * width) / all.length,
      y1: y + height,
    },
  }));
  return {
    text,
    confidence,
    bbox: { x0: x, y0: y, x1: x + width, y1: y + height },
    height,
    words,
    paragraph: 1,
    block: 0,
  };
}

describe("flattenLines", () => {
  it("walks blocks -> paragraphs -> lines and keeps word data", () => {
    const lines = flattenLines([
      {
        paragraphs: [
          {
            lines: [
              {
                text: "Hello world",
                confidence: 91,
                bbox: { x0: 0, y0: 0, x1: 120, y1: 20 },
                words: [
                  {
                    text: "Hello",
                    confidence: 95,
                    bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
                  },
                  {
                    text: "world",
                    confidence: 87,
                    bbox: { x0: 55, y0: 0, x1: 120, y1: 20 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Hello world");
    expect(lines[0].height).toBe(20);
    expect(lines[0].words.map((word) => word.text)).toEqual(["Hello", "world"]);
    expect(lines[0].confidence).toBe(91);
  });

  it("drops empty lines and tolerates missing fields", () => {
    const lines = flattenLines([
      { paragraphs: [{ lines: [{ text: "   " }, { text: null }] }] },
      { paragraphs: null },
    ]);
    expect(lines).toEqual([]);
  });

  it("derives line confidence from words when the engine omits it", () => {
    const [only] = flattenLines([
      {
        paragraphs: [
          {
            lines: [
              {
                text: "a b",
                words: [
                  {
                    text: "a",
                    confidence: 80,
                    bbox: { x0: 0, y0: 0, x1: 5, y1: 10 },
                  },
                  {
                    text: "b",
                    confidence: 60,
                    bbox: { x0: 6, y0: 0, x1: 12, y1: 10 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    expect(only.confidence).toBe(70);
  });
});

describe("confidence statistics", () => {
  const lines = [
    line("clear text here", 0, 0, 200, 16, 96),
    line("mıddle", 0, 20, 80, 16, 55),
    line("worse stıll", 0, 40, 90, 16, 30),
  ];
  it("weights mean confidence by word count", () => {
    const mean = meanConfidence(lines);
    expect(mean).toBeGreaterThan(55);
    expect(mean).toBeLessThan(96);
  });
  it("reports the share of low-confidence words", () => {
    expect(lowConfidenceShare(lines, 60)).toBeGreaterThan(0);
    expect(lowConfidenceShare([], 60)).toBe(0);
  });
  it("lists line indexes below the threshold", () => {
    expect(lowConfidenceLines(lines, 60)).toEqual([1, 2]);
    expect(lowConfidenceLines(lines, 10)).toEqual([]);
  });
});

describe("columns and reading order", () => {
  const left = [
    line("left column first", 20, 10, 200),
    line("left column second", 20, 40, 210),
    line("left column third", 20, 70, 190),
  ];
  const right = [
    line("right column first", 420, 12, 210),
    line("right column second", 420, 44, 200),
  ];
  it("finds the gutter between two columns", () => {
    const columns = detectColumns([...left, ...right], 800);
    expect(columns).toHaveLength(2);
    expect(columns[0].lines).toHaveLength(3);
    expect(columns[1].lines).toHaveLength(2);
  });
  it("reads column by column instead of row by row", () => {
    const order = readingOrder([...right, ...left], 800).map((l) => l.text);
    expect(order.slice(0, 3)).toEqual([
      "left column first",
      "left column second",
      "left column third",
    ]);
  });
  it("keeps a single column for ordinary text", () => {
    const single = detectColumns(left, 800);
    expect(single).toHaveLength(1);
  });
  it("reverses column order for right-to-left scripts", () => {
    const order = readingOrder([...left, ...right], 800, true).map(
      (l) => l.text,
    );
    expect(order[0]).toBe("right column first");
  });
  it("handles an empty page", () => {
    expect(detectColumns([], 800)).toHaveLength(1);
    expect(readingOrder([], 800)).toEqual([]);
  });
});

describe("tables", () => {
  const rows = [
    line("Item", 20, 10, 120, 16, 92),
    line("Qty", 300, 10, 60, 16, 92),
    line("Price", 480, 10, 80, 16, 92),
    line("Notebook", 20, 40, 150),
    line("2", 300, 40, 20),
    line("120.00", 480, 40, 70),
    line("Pen", 20, 70, 80),
    line("5", 300, 70, 20),
    line("50.00", 480, 70, 60),
    line("Total", 300, 100, 60),
    line("170.00", 480, 100, 70),
    line("Thank you for your purchase", 20, 140, 420),
  ];
  it("groups lines into rows by vertical position", () => {
    const grouped = groupRows(rows);
    expect(grouped.length).toBeGreaterThanOrEqual(5);
    expect(grouped[0].map((l) => l.text)).toEqual(["Item", "Qty", "Price"]);
  });
  it("detects a table with a header row and body rows", () => {
    const [table] = detectTables(rows);
    expect(table).toBeDefined();
    expect(table.headers).toEqual(["Item", "Qty", "Price"]);
    expect(table.rows).toContainEqual(["Notebook", "2", "120.00"]);
    expect(table.confidence).toBeGreaterThan(0);
  });
  it("returns nothing for flowing prose", () => {
    const prose = [
      line("This is an ordinary paragraph of text that wraps", 20, 10, 700),
      line("across several lines without any tabular structure", 20, 34, 700),
      line("and ends here.", 20, 58, 200),
    ];
    expect(detectTables(prose)).toEqual([]);
    expect(looksTabular(prose)).toBe(false);
  });
  it("ignores blocks of only two rows", () => {
    expect(
      detectTables([
        line("a", 0, 0, 50),
        line("b", 100, 0, 50),
        line("c", 0, 20, 50),
        line("d", 100, 20, 50),
      ]),
    ).toEqual([]);
  });
});
