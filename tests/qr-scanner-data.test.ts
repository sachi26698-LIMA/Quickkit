/**
 * Settings, history and export.
 *
 * These three modules are where "boring" bugs hide: a settings blob that can be
 * tampered with, a history that quietly stores a Wi-Fi password, a CSV that
 * lets a decoded payload execute as a spreadsheet formula.
 */
import { describe, expect, it } from "vitest";
import {
  cameraConstraints,
  decodeProfileFor,
  defaultSettings,
  duplicateWindowMs,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  SETTINGS_KEY,
} from "../lib/tools/qr-scanner/settings";
import {
  clearHistory,
  filterHistory,
  historyTypes,
  HISTORY_KEY,
  loadHistory,
  MAX_HISTORY,
  prepareRecord,
  saveHistory,
} from "../lib/tools/qr-scanner/history";
import {
  csvField,
  exportFilename,
  rowsFromHistory,
  safeFilename,
  toCsv,
  toJson,
  toTxt,
  type ExportRow,
} from "../lib/tools/qr-scanner/export";

/** A minimal, honest in-memory Storage stand-in. */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    get size() {
      return map.size;
    },
    raw: () => map,
  };
}

describe("scanner settings", () => {
  it("uses defaults when nothing is stored", () => {
    expect(loadSettings(memoryStorage())).toEqual(defaultSettings);
  });

  it("survives corrupt stored JSON", () => {
    expect(loadSettings(memoryStorage({ [SETTINGS_KEY]: "{oops" }))).toEqual(
      defaultSettings,
    );
  });

  it("clamps a tampered auto-clear timer into range", () => {
    const settings = sanitizeSettings({ autoClearSeconds: 100000 });
    expect(settings.autoClearSeconds).toBe(120);
    expect(sanitizeSettings({ autoClearSeconds: -5 }).autoClearSeconds).toBe(0);
    expect(sanitizeSettings({ autoClearSeconds: "abc" }).autoClearSeconds).toBe(
      defaultSettings.autoClearSeconds,
    );
  });

  it("replaces unknown enum values instead of trusting them", () => {
    const settings = sanitizeSettings({
      cameraResolution: "9000",
      preprocessing: "magic",
      sensitivity: "extreme",
      defaultMode: "telepathy",
    });
    expect(settings.cameraResolution).toBe("auto");
    expect(settings.preprocessing).toBe("light");
    expect(settings.sensitivity).toBe("balanced");
    expect(settings.defaultMode).toBe("camera");
  });

  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const next = { ...defaultSettings, continuous: true, autoClearSeconds: 30 };
    expect(saveSettings(storage, next)).toBe(true);
    expect(loadSettings(storage)).toEqual(next);
  });

  it("reports failure instead of throwing when storage is unwritable", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(saveSettings(broken, defaultSettings)).toBe(false);
  });

  it("maps preprocessing choices to real decode settings", () => {
    expect(
      decodeProfileFor({ ...defaultSettings, preprocessing: "off" }),
    ).toEqual({
      profile: "image",
      contrast: 1,
      sharpen: 0,
    });
    expect(
      decodeProfileFor({ ...defaultSettings, preprocessing: "strong" }).sharpen,
    ).toBeGreaterThan(1);
  });

  it("asks for a real camera resolution and never an impossible one", () => {
    const constraints = cameraConstraints("720");
    expect(constraints.height).toEqual({ ideal: 720 });
    const auto = cameraConstraints("auto", "device-1");
    expect(auto.deviceId).toEqual({ exact: "device-1" });
    expect(auto.facingMode).toBeUndefined();
  });

  it("widens the duplicate window as sensitivity loosens", () => {
    expect(duplicateWindowMs("aggressive")).toBeLessThan(
      duplicateWindowMs("balanced"),
    );
    expect(duplicateWindowMs("balanced")).toBeLessThan(
      duplicateWindowMs("strict"),
    );
  });
});

describe("scan history", () => {
  const record = (
    overrides: Partial<Parameters<typeof prepareRecord>[0]> = {},
  ) =>
    prepareRecord({
      type: "url",
      payload: "https://example.com",
      summary: "https://example.com",
      sensitive: false,
      sourceName: "code.png",
      status: "decoded",
      count: 1,
      storeSensitive: false,
      ...overrides,
    });

  it("stores an ordinary payload", () => {
    const entry = record();
    expect(entry.payload).toBe("https://example.com");
    expect(entry.redacted).toBe(false);
  });

  it("withholds a Wi-Fi password unless the user opts in", () => {
    const withheld = record({
      type: "wifi",
      payload: "WIFI:S:Home;T:WPA;P:hunter2;;",
      summary: "Home · WPA",
      sensitive: true,
    });
    expect(withheld.payload).toBeNull();
    expect(withheld.redacted).toBe(true);
    expect(withheld.summary).toContain("withheld");
    expect(JSON.stringify(withheld)).not.toContain("hunter2");
    // The network name is not a secret, so the entry stays recognisable and
    // searchable instead of becoming one of twenty identical "withheld" rows.
    expect(withheld.summary).toContain("Home");

    const kept = record({
      type: "wifi",
      payload: "WIFI:S:Home;T:WPA;P:hunter2;;",
      summary: "Home · WPA",
      sensitive: true,
      storeSensitive: true,
    });
    expect(kept.payload).toContain("WIFI:");
  });

  it("round-trips and caps the list", () => {
    const storage = memoryStorage();
    const entries = Array.from({ length: MAX_HISTORY + 25 }, () => record());
    expect(saveHistory(storage, entries)).toBe(true);
    expect(loadHistory(storage)).toHaveLength(MAX_HISTORY);
  });

  it("drops malformed records rather than rendering garbage", () => {
    const storage = memoryStorage({
      [HISTORY_KEY]: JSON.stringify([
        { id: "a", at: 1, type: "url", summary: "ok", status: "decoded" },
        { nope: true },
        null,
        "string",
      ]),
    });
    const loaded = loadHistory(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("a");
  });

  it("survives non-array and corrupt storage", () => {
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: "{}" }))).toEqual([]);
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: "[[[" }))).toEqual([]);
  });

  it("clears everything on request", () => {
    const storage = memoryStorage();
    saveHistory(storage, [record()]);
    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
  });

  it("filters by type, date range, query and sort order", () => {
    const entries = [
      record({ at: 1_000, type: "url", summary: "https://a.example" }),
      record({ at: 2_000, type: "wifi", summary: "Home network" }),
      record({
        at: 3_000,
        type: "url",
        summary: "https://b.example",
        sourceName: "shop.png",
      }),
    ];
    expect(filterHistory(entries, { type: "wifi" })).toHaveLength(1);
    expect(filterHistory(entries, { query: "shop" })).toHaveLength(1);
    expect(filterHistory(entries, { from: 2_000, to: 3_000 })).toHaveLength(1);
    expect(filterHistory(entries, {}, "newest")[0].at).toBe(3_000);
    expect(filterHistory(entries, {}, "oldest")[0].at).toBe(1_000);
    expect(historyTypes(entries).sort()).toEqual(["url", "wifi"]);
  });

  it("never matches a redacted payload through search", () => {
    const withheld = record({
      type: "wifi",
      payload: "WIFI:S:Home;T:WPA;P:hunter2;;",
      summary: "withheld",
      sensitive: true,
    });
    expect(filterHistory([withheld], { query: "hunter2" })).toHaveLength(0);
  });
});

describe("export formatting", () => {
  const rows: ExportRow[] = [
    {
      payload: "https://example.com/a,b",
      type: "url",
      typeLabel: "Website URL",
      sourceName: "shot one.png",
      scannedAt: Date.UTC(2026, 10, 4, 12, 0, 0),
      status: "decoded",
      count: 1,
      summary: "https://example.com/a,b",
    },
  ];
  const allOptions = {
    exportTimestamps: true,
    exportTypes: true,
    exportFilenames: true,
    exportStatus: true,
  };

  it("quotes commas, quotes and newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
    expect(csvField("plain")).toBe("plain");
  });

  it("defuses spreadsheet formula injection", () => {
    // The apostrophe defuses the formula; the field still needs quoting because
    // the payload itself contains double quotes.
    expect(csvField('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(csvField("+1234")).toBe("'+1234");
    expect(csvField("-1")).toBe("'-1");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("writes CSV with a BOM, CRLF endings and the requested columns", () => {
    const csv = toCsv(rows, allOptions);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain("Content type");
    expect(csv).toContain("Source");
    expect(csv).toContain("2026-11-04T12:00:00.000Z");
  });

  it("omits optional columns when they are switched off", () => {
    const csv = toCsv(rows, {
      exportTimestamps: false,
      exportTypes: false,
      exportFilenames: false,
      exportStatus: false,
    });
    const header = csv.replace("\ufeff", "").split("\r\n")[0];
    expect(header).toBe("Content,Summary");
  });

  it("produces valid JSON that round-trips", () => {
    const parsed = JSON.parse(toJson(rows, allOptions));
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].content).toBe("https://example.com/a,b");
    expect(parsed.results[0].typeLabel).toBe("Website URL");
  });

  it("produces readable text with one block per result", () => {
    const text = toTxt(rows, allOptions);
    expect(text).toContain("#1");
    expect(text).toContain("Type: Website URL");
    expect(text).toContain("https://example.com/a,b");
  });

  it("handles an empty export without producing broken files", () => {
    expect(JSON.parse(toJson([], allOptions)).count).toBe(0);
    expect(toTxt([], allOptions)).toContain("(no results)");
    expect(toCsv([], allOptions).split("\r\n").filter(Boolean)).toHaveLength(1);
  });

  it("converts history into export rows, marking withheld content", () => {
    const entries = [
      prepareRecord({
        type: "wifi",
        payload: "WIFI:S:Home;T:WPA;P:secret;;",
        summary: "Home",
        sensitive: true,
        sourceName: "wifi.png",
        status: "decoded",
        count: 1,
        storeSensitive: false,
      }),
    ];
    const converted = rowsFromHistory(entries);
    expect(converted[0].payload).toContain("withheld");
    expect(JSON.stringify(converted)).not.toContain("secret");
  });

  it("builds safe file names", () => {
    expect(safeFilename("../../etc/passwd")).not.toContain("..");
    expect(safeFilename("my code (1).png")).toBe("my-code-1");
    expect(safeFilename("")).toBe("qr-scan");
    expect(exportFilename("results", "csv")).toMatch(
      /^quickkit-qr-results-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(exportFilename("result", "txt", "shot one")).toBe(
      "shot-one-result.txt",
    );
  });
});
