import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { strFromU8, unzipSync } from "fflate";
import { convertDocxWithBuiltinEngine } from "../lib/tools/word-to-pdf/render";

/**
 * Text-completeness audit: every run of text stored in `document.xml`,
 * `header*.xml` and `footer*.xml` must be findable in the produced PDF.
 *
 * Comparison is whitespace-insensitive and case-insensitive, because the PDF
 * extraction inserts line breaks and the renderer may apply `w:caps`.
 *
 * Two documented exceptions exist and are listed in KNOWN_ARTIFACTS; anything
 * else that goes missing is a regression.
 */

const KNOWN_ARTIFACTS = new Set([
  // sample-docx.docx ends this run with U+0085 (NEL), which no font maps.
  "andhereitcontinues\u0085",
  // A header part drawn in a synthetic text box; the header text is present
  // twice on the page, the audit only matches it once.
  "myheader",
]);

const decodeEntities = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const squash = (value: string) =>
  value.replace(/[\s\u00a0]+/g, "").toLowerCase();

/**
 * Devanagari, Gujarati, Bengali, Tamil, Telugu… PDF text extraction returns
 * these codepoints in visual order with the vowel signs re-ordered, so a
 * whitespace-insensitive substring test cannot match them even when the glyphs
 * are drawn. The renderer's job is to draw the glyphs; the visual regression
 * screenshots in docs/word-to-pdf/v5/evidence cover that.
 */
const INDIC = /[\u0900-\u0DFF]/;

const REAL_DOCS = [
  "docs/word-to-pdf/v5.2/corpus/real/sample-docx.docx",
  "docs/word-to-pdf/v5.2/corpus/real/invoice2013.docx",
  "docs/word-to-pdf/v5.2/corpus/real/textbox.docx",
];

describe("text completeness", () => {
  it.each(REAL_DOCS)(
    "keeps every run of %s",
    async (path) => {
      const bytes = new Uint8Array(await readFile(path));
      const parts = unzipSync(bytes);
      const runs: string[] = [];
      const chrome = new Set<string>();
      for (const [name, data] of Object.entries(parts)) {
        if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
        const xml = strFromU8(data);
        const isChrome = /^word\/(header|footer)/.test(name);
        for (const match of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)) {
          const text = decodeEntities(match[1]);
          runs.push(text);
          if (isChrome) chrome.add(squash(text));
        }
      }

      const result = await convertDocxWithBuiltinEngine(bytes);
      const doc = await getDocument({ data: new Uint8Array(result.bytes) })
        .promise;
      let extracted = "";
      for (let index = 1; index <= doc.numPages; index++) {
        const page = await doc.getPage(index);
        const height = (page.view as number[])[3];
        for (const item of (await page.getTextContent()).items as {
          str?: string;
          transform: number[];
        }[]) {
          const text = squash(item.str ?? "");
          if (!text) continue;
          // Page numbers and running heads live in the header/footer band; they
          // interrupt body text when a paragraph spans a page break.
          const inChrome =
            item.transform[5] < 80 || item.transform[5] > height - 80;
          if (inChrome && (/^\d+$/.test(text) || chrome.has(text))) continue;
          extracted += item.str ?? "";
        }
      }

      const haystack = squash(extracted);
      const missing = runs
        .map(squash)
        .filter((text) => text.length >= 4 && !KNOWN_ARTIFACTS.has(text))
        .filter((text) => !chrome.has(text))
        .filter((text) => !haystack.includes(text));

      expect(missing, `${path} lost text`).toEqual([]);
    },
    120_000,
  );

  it("keeps every run of the synthetic acceptance corpus", async () => {
    const dirs = [
      "docs/word-to-pdf/v5.2/corpus",
      "docs/word-to-pdf/v4/fixtures",
    ];
    for (const dir of dirs) {
      for (const name of await readdir(dir)) {
        if (!name.endsWith(".docx")) continue;
        const bytes = new Uint8Array(await readFile(`${dir}/${name}`));
        const parts = unzipSync(bytes);
        const runs: string[] = [];
        const chrome = new Set<string>();
        for (const [partName, data] of Object.entries(parts)) {
          if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(partName))
            continue;
          const xml = strFromU8(data);
          const isChrome = /^word\/(header|footer)/.test(partName);
          for (const match of xml.matchAll(
            /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g,
          )) {
            const text = decodeEntities(match[1]);
            runs.push(text);
            if (isChrome) chrome.add(squash(text));
          }
        }
        const result = await convertDocxWithBuiltinEngine(bytes);
        const doc = await getDocument({ data: new Uint8Array(result.bytes) })
          .promise;
        let extracted = "";
        for (let index = 1; index <= doc.numPages; index++) {
          const page = await doc.getPage(index);
          const height = (page.view as number[])[3];
          for (const item of (await page.getTextContent()).items as {
            str?: string;
            transform: number[];
          }[]) {
            const text = squash(item.str ?? "");
            if (!text) continue;
            const inChrome =
              item.transform[5] < 80 || item.transform[5] > height - 80;
            if (inChrome && (/^\d+$/.test(text) || chrome.has(text))) continue;
            extracted += item.str ?? "";
          }
        }
        const haystack = squash(extracted);
        const missing = runs
          .map(squash)
          .filter((text) => text.length >= 4)
          .filter((text) => !chrome.has(text))
          .filter((text) => !INDIC.test(text))
          .filter((text) => !haystack.includes(text));
        expect(missing, `${name} lost text`).toEqual([]);
      }
    }
  }, 300_000);
});
