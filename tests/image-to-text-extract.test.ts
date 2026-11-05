import { describe, expect, it } from "vitest";
import {
  buildPage,
  combineDocument,
  extractFields,
  extractPage,
  fieldsToText,
  isHeading,
  joinHyphenation,
  medianHeight,
  resolveSmartMode,
  tableToText,
  toFormattedText,
  toLayoutText,
  toPlainText,
  DEFAULT_EXTRACTION,
} from "@/lib/tools/image-to-text/extract";
import {
  detectLanguages,
  detectScripts,
  detectionQuality,
  describeDetection,
  languageTag,
} from "@/lib/tools/image-to-text/language";
import type {
  ExtractionMode,
  OcrLine,
  OcrPage,
} from "@/lib/tools/image-to-text/types";

function line(
  text: string,
  options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    confidence?: number;
    paragraph?: number;
  } = {},
): OcrLine {
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  const width = options.width ?? 300;
  const height = options.height ?? 16;
  const confidence = options.confidence ?? 95;
  return {
    text,
    confidence,
    bbox: { x0: x, y0: y, x1: x + width, y1: y + height },
    height,
    words: text.split(/\s+/).map((word, index, all) => ({
      text: word,
      confidence,
      bbox: {
        x0: x + (index * width) / all.length,
        y0: y,
        x1: x + ((index + 1) * width) / all.length,
        y1: y + height,
      },
    })),
    paragraph: options.paragraph ?? 1,
    block: 0,
  };
}

function page(lines: OcrLine[], overrides: Partial<OcrPage> = {}): OcrPage {
  return buildPage({
    id: "s:1",
    sourceId: "s",
    sourceName: "scan.png",
    page: 1,
    pageCount: 1,
    width: 800,
    height: 1000,
    lines,
    text: lines.map((l) => l.text).join("\n"),
    languages: ["eng"],
    ...overrides,
  });
}

const invoice = [
  line("ACME TRADERS", { y: 10, width: 220, height: 30 }),
  line("Invoice No: 4471", { y: 60, width: 240 }),
  line("Date: 12/03/2026", { y: 84, width: 220 }),
  line("Customer: Riya Patel", { y: 108, width: 260 }),
  line("GSTIN: 24ABCDE1234F1Z5", { y: 132, width: 280 }),
  line("Item", { y: 200, x: 20, width: 120 }),
  line("Qty", { y: 200, x: 400, width: 60 }),
  line("Amount", { y: 200, x: 600, width: 90 }),
  line("Notebook", { y: 230, x: 20, width: 150 }),
  line("2", { y: 230, x: 400, width: 20 }),
  line("120.00", { y: 230, x: 600, width: 80 }),
  line("Pen", { y: 260, x: 20, width: 60 }),
  line("5", { y: 260, x: 400, width: 20 }),
  line("50.00", { y: 260, x: 600, width: 70 }),
  line("Total: 170.00", { y: 300, x: 500, width: 180 }),
];

const prose = [
  line("The quick brown fox jumps over the lazy dog.", { y: 10, width: 620 }),
  line("It was a bright cold day in April, and the clocks were", {
    y: 34,
    width: 660,
  }),
  line("striking thirteen.", { y: 58, width: 220 }),
  line("", { y: 80 }),
  line("Second paragraph starts here with its own sentence.", {
    y: 100,
    width: 640,
  }),
];

describe("text builders", () => {
  it("joins hyphenated line breaks in plain text", () => {
    expect(joinHyphenation("inter-\nnational")).toBe("international");
    expect(joinHyphenation("well-\nKnown")).toBe("well-\nKnown");
  });
  it("keeps layout line breaks and paragraph gaps", () => {
    const text = toLayoutText(prose);
    expect(text.split("\n").length).toBeGreaterThan(3);
    expect(text).toContain("Second paragraph");
  });
  it("produces clean paragraphs for plain text", () => {
    const text = toPlainText(prose, { ...DEFAULT_EXTRACTION, mode: "plain" });
    expect(text).toContain("The quick brown fox jumps over the lazy dog.");
  });
  it("marks headings and bullets in formatted mode", () => {
    const lines = [
      line("REPORT TITLE", { y: 0, width: 300, height: 34 }),
      line("Body text in a normal size that runs on.", { y: 60, width: 500 }),
      line("- first bullet", { y: 84, width: 200 }),
    ];
    const formatted = toFormattedText(lines, DEFAULT_EXTRACTION);
    expect(formatted.text).toContain("## REPORT TITLE");
    expect(formatted.text).toContain("- first bullet");
    expect(formatted.headings).toEqual(["REPORT TITLE"]);
  });
});

describe("headings", () => {
  it("treats clearly taller short lines as headings", () => {
    const median = medianHeight(prose);
    expect(isHeading(line("CHAPTER ONE", { height: 34 }), median)).toBe(true);
    expect(isHeading(line("ordinary body line", { height: 16 }), median)).toBe(
      false,
    );
    expect(
      isHeading(
        line(
          "a very long heading-like line that is actually a sentence, ending with a comma,",
          {
            height: 30,
            width: 700,
          },
        ),
        median,
      ),
    ).toBe(false);
  });
});

describe("fields and tables", () => {
  it("extracts colon key/value pairs", () => {
    const fields = extractFields(invoice, 40);
    const labels = fields.map((field) => field.label);
    expect(labels).toContain("Invoice No");
    expect(labels).toContain("Date");
    expect(fields.find((f) => f.label === "Date")?.value).toBe("12/03/2026");
  });
  it("renders a table as aligned text with a divider", () => {
    const extraction = extractPage(page(invoice), { mode: "table" });
    expect(extraction.tables.length).toBeGreaterThan(0);
    expect(extraction.text).toContain("Notebook");
    expect(extraction.text).toContain("----");
  });
  it("formats fields as label: value lines", () => {
    const fields = extractFields(invoice, 40);
    expect(fieldsToText(fields)).toContain("Invoice No: 4471");
  });
  it("serialises a table with headers", () => {
    const text = tableToText({
      index: 0,
      headers: ["a", "b"],
      rows: [["1", "2"]],
      confidence: 90,
    });
    expect(text.split("\n")[0]).toBe("a  b");
    expect(text.split("\n")[1]).toBe("-  -");
    expect(text.split("\n")[2]).toBe("1  2");
  });
});

describe("extraction modes", () => {
  it("resolves smart mode to table extraction for invoices/tables", () => {
    const extraction = extractPage(page(invoice), { mode: "smart" });
    expect(extraction.resolvedMode).toBe("table");
    expect(extraction.rationale).toMatch(/table/i);
  });
  it("resolves smart mode to structured data for form-like pages", () => {
    const form = [
      line("Name: Riya Patel", { y: 0, width: 220 }),
      line("Date: 01/02/2026", { y: 20, width: 200 }),
      line("Address: 12 MG Road", { y: 40, width: 240 }),
      line("Phone: 9876543210", { y: 60, width: 220 }),
    ];
    const decision = resolveSmartMode(
      form,
      [],
      extractFields(form, 40),
      medianHeight(form),
    );
    expect(decision.mode).toBe("structured");
    expect(decision.rationale).toMatch(/label\/value/i);
  });
  it("resolves smart mode to formatted text when headings exist", () => {
    const lines = [
      line("SECTION ONE", { y: 0, width: 240, height: 32 }),
      line(
        "Some body copy that is long enough to look like a paragraph of real text.",
        { y: 40, width: 600 },
      ),
      line("SECTION TWO", { y: 70, width: 240, height: 32 }),
      line("More body copy follows here for the second section of the page.", {
        y: 110,
        width: 600,
      }),
    ];
    const decision = resolveSmartMode(lines, [], [], medianHeight(lines));
    expect(decision.mode).toBe("formatted");
  });
  it("resolves smart mode to plain text for short simple content", () => {
    const lines = [line("Hello", { y: 0, width: 100 })];
    expect(resolveSmartMode(lines, [], [], medianHeight(lines)).mode).toBe(
      "plain",
    );
  });
  it("keeps every supported mode working on a page with no lines", () => {
    const modes: ExtractionMode[] = [
      "plain",
      "layout",
      "formatted",
      "table",
      "structured",
      "smart",
    ];
    for (const mode of modes) {
      const extraction = extractPage(page([]), { mode });
      expect(extraction.text).toBe("");
      expect(extraction.tables).toEqual([]);
    }
  });
  it("flags low-confidence lines against the threshold", () => {
    const lines = [
      line("clear", { confidence: 95 }),
      line("blurry", { y: 20, confidence: 25 }),
    ];
    const extraction = extractPage(page(lines), {
      mode: "plain",
      confidenceThreshold: 60,
    });
    expect(extraction.lowConfidenceLines).toEqual([1]);
  });
});

describe("combineDocument", () => {
  it("adds page headers when requested", () => {
    const text = combineDocument(
      [
        { title: "page 1", text: "one" },
        { title: "page 2", text: "two" },
      ],
      true,
    );
    expect(text).toContain("--- page 1 ---");
    expect(text).toContain("--- page 2 ---");
  });
  it("omits headers when not requested", () => {
    expect(
      combineDocument(
        [
          { title: "a", text: "one" },
          { title: "b", text: "two" },
        ],
        false,
      ),
    ).toBe("one\ntwo");
  });
});

describe("language detection", () => {
  it("detects English from Latin text", () => {
    const [top] = detectScripts(
      "The quick brown fox jumps over the lazy dog and runs away.",
    );
    expect(top.code).toBe("eng");
    expect(top.confidence).toBeGreaterThan(0.8);
  });
  it("detects Gujarati", () => {
    const [top] = detectScripts("ગુજરાતી ભાષામાં લખાયેલો લખાણ અહીં છે.");
    expect(top.code).toBe("guj");
  });
  it("detects Tamil and Telugu and Bengali and Urdu", () => {
    expect(detectScripts("தமிழ் மொழியில் எழுதப்பட்ட உரை")[0].code).toBe("tam");
    expect(detectScripts("తెలుగు భాషలో రాసిన వచనం")[0].code).toBe("tel");
    expect(detectScripts("বাংলা ভাষায় লেখা একটি বাক্য")[0].code).toBe("ben");
    expect(detectScripts("اردو زبان میں لکھا ہوا متن")[0].code).toBe("urd");
  });
  it("separates Hindi and Marathi inside Devanagari using markers", () => {
    const hindi = detectLanguages(
      "यह पुस्तक बहुत अच्छी है और इसमें ज्ञान है। यह हिंदी में लिखी गई है। और यह सरल है।",
    );
    expect(hindi[0].code).toBe("hin");
    const marathi = detectLanguages(
      "ही पुस्तक खूप चांगली आहे आणि त्यात ज्ञान आहे. हे मराठीत लिहिलेले आहे आणि सोपे आहे.",
    );
    expect(marathi[0].code).toBe("mar");
  });
  it("reports a mixed-script page with both scripts", () => {
    const detections = detectLanguages(
      "Invoice number 4471 / બિલ નંબર ૪૪૭૧ / total 170.00 rupees",
    );
    expect(detections.map((d) => d.code)).toEqual(
      expect.arrayContaining(["eng", "guj"]),
    );
  });
  it("returns nothing for empty or numeric text", () => {
    expect(detectLanguages("")).toEqual([]);
    expect(detectLanguages("12345 67890")).toEqual([]);
  });
  it("describes detections and tags honestly", () => {
    expect(languageTag(["hin", "eng"])).toBe("hi+en");
    expect(detectionQuality(0.8)).toBe("strong");
    expect(detectionQuality(0.5)).toBe("likely");
    expect(detectionQuality(0.2)).toBe("weak");
    expect(describeDetection([])).toBe("No script detected yet");
    expect(describeDetection([{ code: "eng", confidence: 0.9 }])).toContain(
      "English",
    );
  });
  it("marks Urdu pages as right-to-left", () => {
    const rtlPage = buildPage({
      id: "u:1",
      sourceId: "u",
      sourceName: "urdu.png",
      page: 1,
      pageCount: 1,
      width: 800,
      height: 1000,
      lines: [line("اردو زبان میں لکھا ہوا متن")],
      text: "اردو زبان میں لکھا ہوا متن",
      languages: ["urd"],
    });
    expect(rtlPage.rtl).toBe(true);
  });
});
