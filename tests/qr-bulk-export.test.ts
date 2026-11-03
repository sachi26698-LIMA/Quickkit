// @vitest-environment jsdom
/**
 * Bulk pipeline, export helpers, local storage and share links.
 * Everything here is the code the UI calls; nothing is mocked except the
 * browser-only APIs jsdom lacks (File text, canvas).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BULK_LIMITS,
  BULK_TEMPLATE,
  buildRowPayload,
  findDuplicates,
  guessMapping,
  parseCsv,
  parseCsvFile,
  valuesFromRow,
} from "@/lib/tools/qr/bulk";
import { contentTypeDef } from "@/lib/tools/qr/payload";
import {
  DEFAULT_PDF_OPTIONS,
  PAPER_SIZES,
  createQrPdf,
  csvCell,
  csvDocument,
  csvRow,
  pdfBlob,
  pngBlob,
  qrFilename,
  safeFilenamePart,
  svgBlob,
} from "@/lib/tools/qr/export";
import type { QrHistoryEntry } from "@/lib/tools/qr/storage";
import { defaultDesign } from "@/lib/tools/qr/style";
import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY,
  MAX_PRESETS,
  PRESET_STORAGE_KEY,
  clearHistory,
  deletePreset,
  formatWhen,
  loadHistory,
  loadHistoryMode,
  loadPresets,
  purgeAllLocalData,
  recordHistory,
  removeHistory,
  sanitizeValues,
  saveHistoryMode,
  savePreset,
} from "@/lib/tools/qr/storage";
import {
  MAX_SHARE_CHARS,
  decodeShareConfig,
  encodeShareConfig,
  readShareHash,
  shareUrlFor,
} from "@/lib/tools/qr/share";
import { renderQr } from "@/lib/tools/qr/render";
import { createZip } from "@/lib/tools/zip";
import { unzipSync } from "fflate";

const URL_FIELDS = contentTypeDef("url").fields;

/* ------------------------------------------------------------------ CSV input */

describe("CSV parsing", () => {
  it("handles quotes, doubled quotes, newlines and a BOM", () => {
    const table = parseCsv(
      '\uFEFFname,url\n"One, two","https://a.example/x"\n"Say ""hi""",y\n',
    );
    expect(table.headers).toEqual(["name", "url"]);
    expect(table.rows).toEqual([
      ["One, two", "https://a.example/x"],
      ['Say "hi"', "y"],
    ]);
    expect(table.delimiter).toBe(",");
    expect(table.notes).toEqual([]);
  });

  it("detects semicolons, tabs and pipes", () => {
    expect(parseCsv("a;b\n1;2").delimiter).toBe(";");
    expect(parseCsv("a\tb\n1\t2").delimiter).toBe("\t");
    expect(parseCsv("a|b\n1|2").delimiter).toBe("|");
  });

  it("keeps CRLF, skips blank lines and names untitled headers", () => {
    const table = parseCsv("a,,c\r\n1,2,3\r\n\r\n4,5,6\r\n");
    expect(table.rows).toEqual([
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
    expect(table.headers[1]).toBe("Column 2");
  });

  it("truncates at the row limit and says so", () => {
    const text = `url\n${Array.from({ length: 12 }, (_, i) => `https://e.example/${i}`).join("\n")}`;
    const table = parseCsv(text, { maxRows: 5 });
    expect(table.rows).toHaveLength(5);
    expect(table.rows[4][0]).toBe("https://e.example/4");
    expect(table.truncated).toBe(true);
    expect(parseCsv(text).truncated).toBe(false);
    expect(parseCsv(text).rows).toHaveLength(12);
  });

  it("clips over-wide rows and over-long cells", () => {
    const wide = `a,${Array.from({ length: 32 }, (_, i) => `c${i}`).join(",")}\n${Array.from({ length: 32 }, (_, i) => `${i}`).join(",")}`;
    const table = parseCsv(wide);
    expect(table.rows[0]).toHaveLength(BULK_LIMITS.maxColumns);
    expect(table.notes.join()).toContain("columns, only the first");
    const long = `url\n${"x".repeat(BULK_LIMITS.maxCellChars + 500)}\n`;
    expect(parseCsv(long).rows[0][0]).toHaveLength(
      BULK_LIMITS.maxCellChars + 1,
    );
  });

  it("reads a File and rejects an oversized or header-only import", async () => {
    const good = new File([BULK_TEMPLATE], "rows.csv", { type: "text/csv" });
    const table = await parseCsvFile(good);
    expect(table.rows).toHaveLength(3);
    const huge = new File(
      ["a,b\n" + "x".repeat(BULK_LIMITS.maxFileBytes)],
      "big.csv",
    );
    await expect(parseCsvFile(huge)).rejects.toThrow(/MB/);
    const headerOnly = new File(["url\n"], "empty.csv");
    await expect(parseCsvFile(headerOnly)).rejects.toThrow(/header row/);
  });
});

describe("column mapping and row payloads", () => {
  it("guesses a column for each field by header name", () => {
    expect(guessMapping(["Link", "Notes"], URL_FIELDS).url).toBe(0);
    expect(guessMapping(["web address (paste)"], URL_FIELDS).url).toBe(0);
    // Two unrelated headers, one field: nothing to safely guess from.
    expect(guessMapping(["nothing here", "other"], URL_FIELDS).url).toBe(-1);
    // A single-column file is mapped positionally.
    expect(guessMapping(["nothing here"], URL_FIELDS).url).toBe(0);
  });

  it("falls back to the shared Content-tab values for unmapped fields", () => {
    const values = valuesFromRow(
      contentTypeDef("whatsapp").fields,
      { phone: 0 },
      ["+91 98765 43210"],
      { message: "Shared line for the whole batch" },
    );
    expect(values.phone).toBe("+91 98765 43210");
    expect(values.message).toBe("Shared line for the whole batch");
  });

  it("builds one payload per row and labels it from the file", () => {
    const outcome = buildRowPayload(
      "url",
      { url: 1 },
      ["Home", "quickkit.tools"],
      "M",
    );
    expect(outcome).toMatchObject({
      ok: true,
      payload: "https://quickkit.tools/",
      label: "Home",
    });
  });

  it("reports the failing field for a bad row instead of guessing", () => {
    const bad = buildRowPayload("url", { url: 0 }, ["not a url at all!!"], "M");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toMatch(/web address/i);
      expect(bad.field).toBe("url");
    }
    const empty = buildRowPayload("url", { url: 0 }, [""], "M");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toMatch(/required/i);
  });

  it("refuses a row whose payload is over the QR limit", () => {
    const outcome = buildRowPayload(
      "url",
      { url: 0 },
      [`https://e.example/${"y".repeat(2400)}`],
      "M",
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toMatch(/too large|over the/);
  });

  it("flags duplicate rows without dropping them", () => {
    expect(findDuplicates(["a", "b", "a", null, "b", "c"])).toEqual([2, 4]);
  });
});

/* --------------------------------------------------------------------- export */

describe("file naming", () => {
  it("keeps names meaningful, flat and short", () => {
    expect(
      qrFilename({
        label: "Pricing page",
        typeId: "url",
        ext: "png",
        size: 768,
      }),
    ).toBe("quickkit-qr-url-pricing-page-768px.png");
    expect(
      qrFilename({ label: 'two/paths\\..|<>:"?', typeId: "wifi", ext: "pdf" }),
    ).toBe("quickkit-qr-wifi-two-paths.pdf");
    expect(qrFilename({ label: "", typeId: "text", ext: "svg" })).toBe(
      "quickkit-qr-text-code.svg",
    );
    expect(safeFilenamePart("x".repeat(200), 42).length).toBeLessThanOrEqual(
      42,
    );
    expect(safeFilenamePart("   ")).toBe("code");
    expect(safeFilenamePart("naïve café")).toBe("naive-cafe");
  });

  it("wraps bytes in the right blob types", () => {
    expect(pngBlob(new Uint8Array([1, 2, 3])).type).toBe("image/png");
    expect(svgBlob("<svg/>").type).toBe("image/svg+xml;charset=utf-8");
    expect(pdfBlob(new Uint8Array([1])).type).toBe("application/pdf");
  });
});

describe("CSV report", () => {
  it("quotes what a spreadsheet would otherwise eat", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b\nc")).toBe('"a,b\nc"');
    expect(csvCell(true)).toBe("true");
    expect(csvRow(["row", 1, "=cmd"])).toBe("row,1,'=cmd");
    const injection = csvCell('\t=HYPERLINK("http://evil")');
    expect(injection).toBe('"' + '\'\t=HYPERLINK(""http://evil"")' + '"');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvDocument([["a"], ["b"]])).toBe("a\r\nb\r\n");
  });
});

describe("PDF export", () => {
  it("writes a real multi-page PDF with each paper size", async () => {
    const rendered = await renderQr({
      payload: "https://quickkit.tools",
      design: { size: 256 },
      artifacts: { png: true },
    });
    const png = rendered.png!;
    for (const paper of Object.keys(
      PAPER_SIZES,
    ) as (keyof typeof PAPER_SIZES)[]) {
      const bytes = await createQrPdf(
        [
          { png, caption: "Front" },
          { png, caption: null },
        ],
        { ...DEFAULT_PDF_OPTIONS, paper },
      );
      const text = new TextDecoder().decode(bytes.slice(0, 512));
      expect(text).toContain("%PDF-1.");
      expect(bytes.length).toBeGreaterThan(1000);
      expect(new TextDecoder().decode(bytes.slice(-1024))).toContain("%%EOF");
    }
  }, 30_000);

  it("refuses an empty document", async () => {
    await expect(createQrPdf([], DEFAULT_PDF_OPTIONS)).rejects.toThrow(
      /nothing/,
    );
  });
});

describe("ZIP packaging", () => {
  it("stores every file and survives a CRC check", () => {
    const zip = createZip([
      { name: "one.png", data: new Uint8Array([137, 80, 78, 71]) },
      {
        name: "manifest.csv",
        data: new TextEncoder().encode("row,url\n1,x\n"),
      },
    ]);
    const at = (offset: number) =>
      String.fromCharCode(zip[offset], zip[offset + 1]);
    expect(at(0)).toBe("PK"); // local file header
    expect(at(zip.length - 22)).toBe("PK"); // end of central directory
    // Read it back with an independent ZIP implementation.
    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped).sort()).toEqual(["manifest.csv", "one.png"]);
    expect(new TextDecoder().decode(unzipped["manifest.csv"])).toBe(
      "row,url\n1,x\n",
    );
    expect(Array.from(unzipped["one.png"])).toEqual([137, 80, 78, 71]);
  });
});

/* ------------------------------------------------- local storage and sharing */

describe("presets and history", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const design = { ...defaultDesign(), dotStyle: "dots" as const };

  it("round-trips a preset and caps the list", () => {
    let list = loadPresets();
    expect(list).toEqual([]);
    for (let index = 0; index < MAX_PRESETS + 4; index += 1)
      list = savePreset(`Look ${index}`, design, list);
    expect(list).toHaveLength(MAX_PRESETS);
    const reloaded = loadPresets();
    expect(reloaded[0].name).toBe(`Look ${MAX_PRESETS + 3}`);
    expect(reloaded[0].design.dotStyle).toBe("dots");
    const [target] = reloaded;
    expect(deletePreset(target.id, reloaded)).toHaveLength(MAX_PRESETS - 1);
    expect(loadPresets()).toHaveLength(MAX_PRESETS - 1);
  });

  it("keeps secrets out of history and can store designs only", () => {
    const values = { ssid: "Studio", password: "hunter2", encryption: "WPA" };
    expect(sanitizeValues("wifi", values)).toEqual({
      ssid: "Studio",
      encryption: "WPA",
    });
    const history = recordHistory(
      {
        typeId: "wifi",
        label: "Studio",
        bytes: 40,
        version: 3,
        design,
        values,
      },
      "full",
      [],
    );
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY) ?? "";
    expect(stored).not.toContain("hunter2");
    expect(loadHistory()[0].values).toEqual({
      ssid: "Studio",
      encryption: "WPA",
    });
    const designOnly = recordHistory(
      {
        typeId: "url",
        label: "x",
        bytes: 10,
        version: 1,
        design,
        values: { url: "a" },
      },
      "designs",
      history,
    );
    expect(loadHistory()[0].values).toEqual({});
    expect(designOnly[0].mode).toBe("designs");
    saveHistoryMode("designs");
    expect(loadHistoryMode()).toBe("designs");
    const [first] = loadHistory();
    expect(removeHistory(first.id, loadHistory())).toHaveLength(1);
    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });

  it("replaces an identical recent entry rather than stacking it", () => {
    const entry = {
      typeId: "url" as const,
      label: "same",
      bytes: 5,
      version: 1,
      design,
      values: { url: "a" },
    };
    let history = recordHistory(entry, "full", []);
    history = recordHistory(entry, "full", history);
    history = recordHistory({ ...entry, label: "other" }, "full", history);
    expect(history).toHaveLength(2);
    expect(history.map((item) => item.label)).toEqual(["other", "same"]);
  });

  it("caps the history list and keeps the newest entries", () => {
    let history: QrHistoryEntry[] = [];
    for (let index = 0; index < MAX_HISTORY + 5; index += 1)
      history = recordHistory(
        {
          typeId: "url",
          label: `row ${index}`,
          bytes: 1,
          version: 1,
          design,
          values: { url: `https://e.example/${index}` },
        },
        "full",
        history,
      );
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].label).toBe(`row ${MAX_HISTORY + 4}`);
  });

  it("ignores a corrupt or hostile stored payload", () => {
    localStorage.setItem(PRESET_STORAGE_KEY, "not json");
    expect(loadPresets()).toEqual([]);
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          design: { size: 99999, margin: -5, logo: { scale: 9 } },
          values: { secret: 1 },
        },
      ]),
    );
    const [entry] = loadHistory();
    expect(entry.design.size).toBeLessThanOrEqual(2048);
    expect(entry.design.margin).toBeGreaterThanOrEqual(0);
    expect(entry.design.logo.scale).toBeLessThanOrEqual(0.3);
  });

  it("purges everything this tool stored", () => {
    savePreset("Keep", design, loadPresets());
    recordHistory(
      {
        typeId: "url",
        label: "x",
        bytes: 1,
        version: 1,
        design,
        values: { url: "a" },
      },
      "full",
      [],
    );
    purgeAllLocalData();
    expect(localStorage.getItem(PRESET_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
    expect(loadPresets()).toEqual([]);
  });

  it("describes time without a future timestamp", () => {
    expect(formatWhen(Date.now())).toBe("just now");
    expect(formatWhen(Date.now() - 5 * 60_000)).toContain("min");
    expect(formatWhen(Date.now() - 3 * 3_600_000)).toBe("3 h ago");
    expect(formatWhen(Date.now() - 9 * 86_400_000)).toMatch(/\d/);
    expect(formatWhen(Date.now() + 60_000)).toBe("just now");
  });
});

describe("shareable configuration", () => {
  const design = { ...defaultDesign(), margin: 6, errorLevel: "H" as const };

  it("round-trips content and design, but never a password", () => {
    const config = {
      typeId: "wifi" as const,
      values: { ssid: "Studio", password: "hunter2", encryption: "WPA" },
      design,
    };
    const encoded = encodeShareConfig(config);
    const parsed = decodeShareConfig(encoded);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.config.typeId).toBe("wifi");
      expect(parsed.config.values.ssid).toBe("Studio");
      expect(parsed.config.values.password).toBeUndefined();
      expect(parsed.config.design.margin).toBe(6);
    }
    expect(encoded).not.toContain("hunter2");
    // A hand-edit that re-adds the secret is reported and dropped, not trusted.
    const tampered = Buffer.from(
      JSON.stringify({
        v: 1,
        t: "wifi",
        f: { ssid: "Studio", password: "hunter2" },
        d: {},
      }),
      "utf8",
    ).toString("base64url");
    const after = decodeShareConfig(tampered);
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.config.values.password).toBeUndefined();
      expect(after.dropped).toContain("Password");
    }
  });

  it("survives a URL fragment and reports the size ceiling", () => {
    const url = shareUrlFor(
      { typeId: "text", values: { text: "hello" }, design },
      "/tools/qr-generator",
    );
    expect(url).toContain("/tools/qr-generator#c=");
    expect(readShareHash(url.slice(url.indexOf("#")))).toBe(
      decodeURIComponent(url.split("#c=")[1]),
    );
    expect(readShareHash("")).toBeNull();
    expect(readShareHash("#other=1")).toBeNull();
    const huge = {
      typeId: "text" as const,
      values: { text: "z".repeat(MAX_SHARE_CHARS * 4) },
      design,
    };
    expect(() => encodeShareConfig(huge)).toThrow(/too big to share|preset/);
  });

  it("refuses to trust garbage in the link", () => {
    expect(decodeShareConfig(null).ok).toBe(false);
    expect(decodeShareConfig("%%%not-base64%%%")).toMatchObject({ ok: false });
    expect(
      decodeShareConfig(
        Buffer.from(JSON.stringify({ v: 9, t: "nope" }), "utf8").toString(
          "base64url",
        ),
      ),
    ).toMatchObject({ ok: false, message: /different tool/ });
    const tampered = encodeShareConfig({
      typeId: "url",
      values: { url: "https://quickkit.tools" },
      design: { ...design, size: 999999, margin: -4 },
    });
    const parsed = decodeShareConfig(tampered);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.config.design.size).toBeLessThanOrEqual(2048);
      expect(parsed.config.design.margin).toBeGreaterThanOrEqual(0);
      expect(parsed.dropped.length).toBeGreaterThan(0);
    }
  });
});
