import { describe, expect, it } from "vitest";
import {
  analyseStructure,
  cannibalisation,
  descriptionLength,
  keywordStat,
  readability,
  repeatedPhrases,
  similarity,
  titleLength,
  titlePixels,
  words,
} from "@/lib/tools/seo/analyze";

describe("title and description length", () => {
  it("reads a title inside the 30–60 character budget as fine", () => {
    expect(titleLength("A perfect title for search engines").status).toBe("ok");
  });

  it("warns on a title that is too short", () => {
    expect(titleLength("Hi").status).toBe("short");
  });

  it("warns on a title that is too long", () => {
    expect(titleLength("x".repeat(90)).status).toBe("long");
  });

  it("reads a description inside the budget as fine", () => {
    expect(descriptionLength("x".repeat(120)).status).toBe("ok");
  });

  it("measures the pixel width of a title", () => {
    const narrow = titlePixels("iiiii");
    const wide = titlePixels("WWWWW");
    expect(wide.value).toBeGreaterThan(narrow.value);
  });
});

describe("words", () => {
  it("splits on whitespace and punctuation, and lowercases", () => {
    expect(words("Hello, world! Again.")).toEqual(["hello", "world", "again"]);
  });

  it("returns nothing for empty text", () => {
    expect(words("   ")).toEqual([]);
  });
});

describe("keywordStat", () => {
  it("counts the phrase wherever it appears", () => {
    const result = keywordStat({
      body: "A quick brown fox. A quick brown dog. The quick end.",
      keyword: "quick brown",
    });
    expect(result.count).toBe(2);
  });

  it("is case-insensitive", () => {
    const result = keywordStat({
      body: "Invoice PDF and invoice pdf",
      keyword: "invoice pdf",
    });
    expect(result.count).toBe(2);
  });

  it("finds the keyword in the title", () => {
    const result = keywordStat({
      title: "Invoice PDF generator",
      body: "Some body text about other things.",
      keyword: "invoice pdf",
    });
    expect(result.inTitle).toBe(true);
  });

  it("reports a density without grading it", () => {
    const result = keywordStat({
      body: "invoice invoice invoice and some other words here",
      keyword: "invoice",
    });
    expect(result.density).toBeGreaterThan(0);
  });

  it("survives an empty body", () => {
    const result = keywordStat({ body: "", keyword: "anything" });
    expect(result.count).toBe(0);
  });
});

describe("repeatedPhrases", () => {
  it("finds a phrase used more than once", () => {
    const result = repeatedPhrases(
      "deploy the service then deploy the service again",
      { size: 2 },
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("finds nothing in text with no repeats", () => {
    const result = repeatedPhrases("every single word here is unique", {
      size: 2,
    });
    expect(result.length).toBe(0);
  });
});

describe("readability", () => {
  it("scores simple English as easier than dense English", () => {
    const simple = readability(
      "The cat sat on the mat. The dog ran. It was a good day. We had fun.",
    );
    const dense = readability(
      "Notwithstanding the aforementioned considerations pertaining to the establishment of comprehensive institutional frameworks, the implementation of multifaceted organizational methodologies necessitates unprecedented administrative sophistication.",
    );
    expect(simple.fleschReadingEase).toBeGreaterThan(dense.fleschReadingEase);
  });

  it("stays inside 0–100", () => {
    for (const text of ["", "Hello.", "x".repeat(500)]) {
      const result = readability(text);
      expect(result.fleschReadingEase).toBeGreaterThanOrEqual(0);
      expect(result.fleschReadingEase).toBeLessThanOrEqual(100);
    }
  });

  it("warns rather than scores when the text is not English", () => {
    const result = readability("यह एक परीक्षण वाक्य है जिसमें हिंदी शब्द हैं।");
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe("similarity", () => {
  it("rates identical text as a complete match", () => {
    const result = similarity(
      "the same sentence here in both",
      "the same sentence here in both",
    );
    expect(result.score).toBe(1);
    expect(result.verdict).toBe("near-duplicate");
  });

  it("rates different text as a weak match", () => {
    const result = similarity("apples and oranges", "quantum mechanics");
    expect(result.score).toBeLessThan(0.3);
    expect(result.verdict).toBe("distinct");
  });
});

describe("cannibalisation", () => {
  it("reports two pages competing for the same term", () => {
    const findings = cannibalisation([
      { url: "/a", title: "Invoice PDF tool", keyword: "invoice pdf" },
      { url: "/b", title: "Invoice PDF generator", keyword: "invoice pdf" },
    ]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].pages).toHaveLength(2);
  });

  it("reports nothing when each page targets its own term", () => {
    const findings = cannibalisation([
      { url: "/a", title: "Invoice PDF tool", keyword: "invoice pdf" },
      { url: "/b", title: "GST calculator", keyword: "gst calculator" },
    ]);
    expect(findings.length).toBe(0);
  });
});

describe("analyseStructure", () => {
  const html = `<!doctype html><html><head><title>Page</title></head><body>
    <h1>Main heading</h1>
    <p>Some text with a <a href="https://example.com">link</a>.</p>
    <img src="/a.png">
    <h3>Skipped from h1 to h3</h3>
  </body></html>`;

  it("finds one H1", () => {
    expect(analyseStructure(html).h1Count).toBe(1);
  });

  it("flags a skipped heading level", () => {
    const result = analyseStructure(html);
    expect(result.headingSkips.length).toBeGreaterThan(0);
  });

  it("counts an image with no alt text", () => {
    expect(analyseStructure(html).imagesMissingAlt).toBe(1);
  });

  it("reads an image that has alt text", () => {
    const result = analyseStructure('<img src="/a.png" alt="A description">');
    expect(result.imagesMissingAlt).toBe(0);
  });

  it("marks an absolute link as external", () => {
    const result = analyseStructure(html);
    expect(result.links.some((link) => link.external)).toBe(true);
  });

  it("finds nothing wrong with a clean page", () => {
    const clean = `<h1>Title</h1><p>Body</p><h2>Section</h2><img src="/a.png" alt="A">`;
    const result = analyseStructure(clean);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
      [],
    );
  });

  it("survives markup that is not valid HTML", () => {
    const result = analyseStructure("<h1>Unclosed <p>and broken");
    expect(Number.isFinite(result.wordCount)).toBe(true);
  });
});
