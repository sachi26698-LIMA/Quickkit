import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compareSizes,
  formatHtml,
  initializeHtmlMinifier,
  formatXml,
  minifyCss,
  minifyHtml,
  minifyJavaScript,
} from "../lib/tools/developer-code";
import {
  base64ToBytes,
  bytesToBase64,
  generateUuidBatch,
  hashBytes,
  hashText,
  MAX_HASH_FILE_BYTES,
  type HashAlgorithm,
} from "../lib/tools/developer-data";
import { analyzeRegex } from "../lib/tools/regex";
import { decodeUrl, encodeUrl } from "../lib/tools/developer-data";
import { locateJsonError } from "../lib/tools/json";

const unicodeText = "नमस्ते, 世界 🌍";

beforeAll(async () => {
  const asset = await readFile(
    new URL(
      "../node_modules/minify-html-wasm/dist/web/index_bg.wasm",
      import.meta.url,
    ),
  );
  const wasm = new Uint8Array(asset.byteLength);
  wasm.set(asset);
  await initializeHtmlMinifier(wasm);
});

describe("HTML formatter and minifier", () => {
  it("formats nested markup with readable indentation", async () => {
    const output = await formatHtml(
      "<main><h1>Hello 世界</h1><p>Local tools</p></main>",
    );
    expect(output).toContain("<main>\n  <h1>Hello 世界</h1>");
    expect(output).toContain("</main>");
  });
  it("honors four-space and tab indentation", async () => {
    const source =
      "<main><section><h1>Hi</h1><p>Local tools format this nested markup without sending it to a server.</p></section></main>";
    const four = await formatHtml(source, { indent: 4 });
    const tabs = await formatHtml(source, { indent: "\t" });
    expect(four).toContain("\n    <section>");
    expect(tabs).toContain("\n\t<section>");
  });
  it("minifies markup but does not minify or execute embedded JavaScript", async () => {
    const marker = "__quickkit_unexecuted_html_script__";
    const source = `<main>\n  <p>Hello 世界</p>\n  <script>globalThis.${marker} = true;</script>\n</main>`;
    const output = await minifyHtml(source);
    expect(output).toContain(`globalThis.${marker} = true;`);
    expect(output.length).toBeLessThan(source.length);
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined();
  });
  it("rejects empty formatter input and enforces the text limit", async () => {
    await expect(formatHtml("  ")).rejects.toThrow("Enter html first");
    await expect(minifyHtml("x".repeat(1_000_001))).rejects.toThrow(
      "too large",
    );
  });
  it("can minify a comment-only document to an empty result", async () => {
    await expect(minifyHtml("<!-- removable -->")).resolves.toBe("");
  });
  it("reports true UTF-8 byte differences for Unicode", () => {
    const stats = compareSizes("🌍", "x");
    expect(stats.beforeBytes).toBe(4);
    expect(stats.afterBytes).toBe(1);
    expect(stats.savedPercent).toBe(75);
  });
});

describe("CSS minifier", () => {
  it("removes safe whitespace and comments while retaining license comments", () => {
    const result = minifyCss(
      "/*! license */ /* ordinary */ .card { color: #ffffff; margin: 0px 0px 16px 0px; }",
    );
    expect(result).toContain("/*! license */");
    expect(result).not.toContain("ordinary");
    expect(result).toContain(".card{color:#fff");
    expect(result.length).toBeLessThan(90);
  });
  it("accepts a comment-only stylesheet whose minified output is empty", () => {
    expect(minifyCss("/* removable */")).toBe("");
  });
  it("preserves Unicode string values and CSS syntax", () => {
    const result = minifyCss('.label { content: "世界 🌍"; }');
    expect(result).toContain('content:"世界 🌍"');
  });
  it("rejects empty, invalid and large stylesheets", () => {
    expect(() => minifyCss(" ")).toThrow("Enter css first");
    expect(() => minifyCss(".broken { color: red")).toThrow();
    expect(() => minifyCss("x".repeat(1_000_001))).toThrow("too large");
  });
  it("handles a large valid stylesheet", () => {
    const source = ".card{color:#ffffff;margin:0px 0px 16px 0px}\n".repeat(
      10_000,
    );
    const result = minifyCss(source);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(source.length);
  });
});

describe("JavaScript minifier", () => {
  it("minifies parsed JavaScript without executing it", async () => {
    const marker = "__quickkit_user_javascript_ran__";
    const source = `globalThis.${marker} = true; function add(longName) { return longName + 1; }`;
    const result = await minifyJavaScript(source);
    expect(result).toContain("globalThis");
    expect(result.length).toBeLessThan(source.length);
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined();
  });
  it("accepts comment-only input that minifies to an empty file", async () => {
    await expect(minifyJavaScript("// removable comment")).resolves.toBe("");
  });
  it("accepts Unicode, comments and valid special syntax", async () => {
    const result = await minifyJavaScript(
      `// comment\nconst title = "世界 🌍"; export { title };`,
    );
    expect(result).toContain("世界 🌍");
  });
  it("rejects empty, malformed and oversized source", async () => {
    await expect(minifyJavaScript(" ")).rejects.toThrow(
      "Enter javascript first",
    );
    await expect(minifyJavaScript("function ( {")).rejects.toThrow();
    await expect(minifyJavaScript("x".repeat(1_000_001))).rejects.toThrow(
      "too large",
    );
  });
});

describe("XML formatter", () => {
  it("formats elements and preserves attributes and Unicode text", () => {
    const result = formatXml(
      `<root><tool id="one">${unicodeText}</tool><enabled>true</enabled></root>`,
    );
    expect(result).toContain('<root>\n  <tool id="one">नमस्ते, 世界 🌍</tool>');
    expect(result).toContain("<enabled>true</enabled>");
  });
  it("compacts layout-only whitespace but preserves mixed and xml:space text", () => {
    expect(
      formatXml("<root>\n  <a/>\n  <b/>\n</root>", { compact: true }),
    ).toBe("<root><a/><b/></root>");
    expect(formatXml("<root><a/> <b/></root>", { compact: true })).toBe(
      "<root><a/> <b/></root>",
    );
    expect(
      formatXml('<root xml:space="preserve">  <a/> </root>', { compact: true }),
    ).toContain("  <a/> ");
  });
  it("rejects malformed XML, empty input, DTD and external-entity declarations", () => {
    expect(() => formatXml("")).toThrow("Enter xml first");
    expect(() => formatXml("<root><item></root>")).toThrow();
    expect(() => formatXml("<root>\n  <item></root>")).toThrow(
      "line 2, column",
    );
    expect(() =>
      formatXml('<!DOCTYPE root [<!ENTITY x "unsafe">]><root>&x;</root>'),
    ).toThrow("DOCTYPE declarations");
  });
  it("accepts a sizable nested document within the depth limit", () => {
    const source = `<root>${"<item>世界</item>".repeat(5_000)}</root>`;
    expect(formatXml(source, { compact: true }).match(/<item>/gu)).toHaveLength(
      5_000,
    );
  });
});

describe("Base64 encoder and decoder", () => {
  it("round-trips UTF-8 Unicode and whitespace-wrapped Base64", () => {
    const encoded = bytesToBase64(new TextEncoder().encode(unicodeText));
    expect(new TextDecoder().decode(base64ToBytes(encoded))).toBe(unicodeText);
    expect(
      new TextDecoder().decode(
        base64ToBytes(` ${encoded.slice(0, 4)}\n${encoded.slice(4)} `),
      ),
    ).toBe(unicodeText);
  });
  it("round-trips binary values including zero and 255", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes]);
  });
  it("rejects empty data, invalid alphabet, malformed padding and excessive input", () => {
    for (const invalid of ["", "%%%", "Zg=", "A", "===="]) {
      expect(() => base64ToBytes(invalid), invalid).toThrow();
    }
    expect(() => base64ToBytes("A".repeat(14_000_001))).toThrow("too large");
  });
});

describe("URL encoder and decoder", () => {
  it("encodes query components including reserved characters and Unicode", () => {
    const input = "hello world&lang=नमस्ते?#";
    const encoded = encodeUrl(input, "component");
    expect(encoded).toContain("%26");
    expect(encoded).toContain("%3D");
    expect(decodeUrl(encoded, "component")).toBe(input);
  });
  it("encodes a full URL without escaping its separators", () => {
    const input = "https://example.com/search?q=hello world&lang=ગુજરાતી";
    const encoded = encodeUrl(input, "full-url");
    expect(encoded).toContain("https://example.com/search?q=");
    expect(encoded).toContain("&lang=");
    expect(decodeUrl(encoded, "full-url")).toBe(input);
  });
  it("rejects empty, malformed escapes and oversized URLs", () => {
    expect(() => encodeUrl("")).toThrow();
    expect(() => decodeUrl("%")).toThrow("Invalid percent-encoding");
    expect(() => encodeUrl("x".repeat(1_000_001))).toThrow("too large");
  });
});

describe("UUID v4 generator", () => {
  it("generates valid v4 values and unique bulk batches", () => {
    const batch = generateUuidBatch(500);
    expect(batch).toHaveLength(500);
    expect(new Set(batch).size).toBe(500);
    for (const uuid of batch)
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
  });
  it("rejects zero, fractional, non-finite and excessive quantities", () => {
    for (const count of [
      0,
      -1,
      2_001,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => generateUuidBatch(count)).toThrow();
    }
  });
});

describe("Regex tester", () => {
  it("finds Unicode-safe matches, capture groups and replacement previews", () => {
    const result = analyzeRegex({
      pattern: "(?<word>世界):(\\d+)",
      flags: "g",
      sample: "世界:42 and 世界:7",
      replacement: "$<word>=$2",
    });
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].groups?.word).toBe("世界");
    expect(result.matches[0].captures).toEqual(["世界", "42"]);
    expect(result.replacement).toBe("世界=42 and 世界=7");
  });
  it("handles zero-width global matches without looping forever", () => {
    const result = analyzeRegex({
      pattern: "(?=b)",
      flags: "g",
      sample: "ab",
      replacement: "!",
    });
    expect(result.matches.map((match) => match.index)).toEqual([1]);
  });
  it("advances empty matches by code point only in Unicode mode", () => {
    const sample = "🌍";
    const withoutUnicode = analyzeRegex({
      pattern: "(?=.)",
      flags: "g",
      sample,
      replacement: "|",
    });
    const withUnicode = analyzeRegex({
      pattern: "(?=.)",
      flags: "gu",
      sample,
      replacement: "|",
    });
    expect(withoutUnicode.matches.map((match) => match.index)).toEqual([0, 1]);
    expect(withoutUnicode.replacement).toBe(sample.replace(/(?=.)/g, "|"));
    expect(withUnicode.matches.map((match) => match.index)).toEqual([0]);
    expect(withUnicode.replacement).toBe(sample.replace(/(?=.)/gu, "|"));
  });
  it("expands standard replacement tokens like String.replace", () => {
    const sample = "Hello world!";
    const replacement = "$$|$&|$`|$'|$<word>|$1";
    const result = analyzeRegex({
      pattern: "(?<word>world)",
      flags: "",
      sample,
      replacement,
    });
    expect(result.replacement).toBe(
      sample.replace(/(?<word>world)/u, replacement),
    );
  });
  it("bounds oversized replacement previews and reports match-list truncation accurately", () => {
    const oversized = analyzeRegex({
      pattern: "(?=.)",
      flags: "g",
      sample: "x".repeat(20_000),
      replacement: "z".repeat(10_000),
    });
    expect(oversized.replacement).toHaveLength(200_000);
    expect(oversized.replacementTruncated).toBe(true);

    const exactly500 = analyzeRegex({
      pattern: "x",
      flags: "g",
      sample: "x".repeat(500),
      replacement: "$&",
    });
    const over500 = analyzeRegex({
      pattern: "x",
      flags: "g",
      sample: "x".repeat(501),
      replacement: "$&",
    });
    expect(exactly500.truncated).toBe(false);
    expect(over500.truncated).toBe(true);
    expect(over500.matches).toHaveLength(500);
  });
  it("reports invalid syntax and enforces safe length caps", () => {
    expect(() =>
      analyzeRegex({ pattern: "[", flags: "", sample: "x", replacement: "" }),
    ).toThrow();
    expect(() =>
      analyzeRegex({
        pattern: "x".repeat(501),
        flags: "",
        sample: "x",
        replacement: "",
      }),
    ).toThrow("too long");
    expect(() =>
      analyzeRegex({
        pattern: ".",
        flags: "g",
        sample: "x".repeat(20_001),
        replacement: "",
      }),
    ).toThrow("too long");
    expect(() =>
      analyzeRegex({ pattern: ".", flags: "gg", sample: "x", replacement: "" }),
    ).toThrow("flag");
  });
});

describe("Hash generator", () => {
  const known: Record<HashAlgorithm, string> = {
    MD5: "900150983cd24fb0d6963f7d28e17f72",
    "SHA-1": "a9993e364706816aba3e25717850c26c9cd0d89d",
    "SHA-256":
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "SHA-384":
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
    "SHA-512":
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  };
  it.each(Object.entries(known) as [HashAlgorithm, string][])(
    "matches the %s known-answer vector",
    async (algorithm, expected) => {
      await expect(hashText("abc", algorithm)).resolves.toBe(expected);
    },
  );
  it("supports the empty message and UTF-8 text", async () => {
    await expect(hashText("", "SHA-256")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    await expect(hashText(unicodeText, "SHA-256")).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
  });
  it("streams large byte arrays in chunks and reports progress", async () => {
    const progress: number[] = [];
    const bytes = new TextEncoder().encode("ab".repeat(1_100_000));
    const result = await hashBytes(bytes, "SHA-256", (value) =>
      progress.push(value),
    );
    expect(result).toMatch(/^[a-f0-9]{64}$/u);
    expect(progress.at(-1)).toBe(100);
    expect(progress.length).toBeGreaterThan(1);
  });
  it("documents the upper file processing bound", () => {
    expect(MAX_HASH_FILE_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe("JSON parser error locations", () => {
  it("returns exact one-based line and column for malformed JSON", () => {
    const input = '{\n  "ok": true,\n  "missing" 2\n}';
    const spot = locateJsonError(input);
    expect(spot).not.toBeNull();
    expect(spot?.line).toBe(3);
    expect(spot?.column).toBeGreaterThan(1);
    expect(spot?.excerpt).toContain("^");
  });
  it("locates unexpected end of JSON at end of input", () => {
    const input = '{"items": [';
    expect(locateJsonError(input)?.position).toBe(input.length);
  });
});

describe("batch checksum reports", () => {
  it("hashes files sequentially and quotes unsafe filenames", async () => {
    const { hashFileBatch } = await import("../lib/tools/developer-data");
    const files = [new File(["abc"], "a.txt"), new File([""], "line\nb.txt")];
    const progress: number[] = [];
    const report = await hashFileBatch(files, "SHA-256", (n) =>
      progress.push(n),
    );
    expect(report).toContain(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(report).toContain(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(report).toContain('"line\\nb.txt"');
    expect(progress.at(-1)).toBe(100);
  });
  it("rejects empty and oversized batches", async () => {
    const { hashFileBatch } = await import("../lib/tools/developer-data");
    await expect(hashFileBatch([], "SHA-256")).rejects.toThrow("1 and 50");
    await expect(
      hashFileBatch(
        Array.from({ length: 51 }, () => new File([], "x")),
        "SHA-256",
      ),
    ).rejects.toThrow("1 and 50");
  });
});

it("compares a batch to a trusted manifest and reports possible duplicates and missing entries", async () => {
  const { hashFileBatch } = await import("../lib/tools/developer-data");
  const digest =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  const files = [
    new File(["abc"], "a.txt"),
    new File(["abc"], "b.txt"),
    new File(["other"], "c.txt"),
  ];
  const manifest = JSON.stringify([
    { name: "a.txt", digest },
    { name: "b.txt", digest: "0".repeat(64) },
    { name: "missing.txt", digest },
  ]);
  const result = await hashFileBatch(files, "SHA-256", undefined, manifest);
  expect(result).toContain('"a.txt" [MATCH]');
  expect(result).toContain('"b.txt" [MISMATCH]');
  expect(result).toContain('"c.txt" [NO REFERENCE]');
  expect(result).toContain("1 reference(s) without a selected file");
  expect(result).toContain('"a.txt", "b.txt"');
  await expect(
    hashFileBatch(
      files,
      "SHA-256",
      undefined,
      '[{"name":"a.txt","digest":"abcd"}]',
    ),
  ).rejects.toThrow("valid digest");
  await expect(
    hashFileBatch([files[0], files[0]], "SHA-256", undefined, manifest),
  ).rejects.toThrow("distinct");
  await expect(
    hashFileBatch(files, "SHA-256", undefined, "not json"),
  ).rejects.toThrow("JSON array");
});
