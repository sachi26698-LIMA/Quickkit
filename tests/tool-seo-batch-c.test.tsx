// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOOL_SEO_CONTENT, TOOL_SEO_METADATA } from "../lib/tool-seo-content";
import {
  formatXml,
  minifyCss,
  minifyJavaScript,
} from "../lib/tools/developer-code";
import {
  bytesToBase64,
  encodeUrl,
  hashText,
} from "../lib/tools/developer-data";
import { processJson } from "../lib/tools/json";
import {
  defaultPasswordOptions,
  passwordEntropy,
  passwordPoolSize,
} from "../lib/tools/password";
import { analyzeText, convertCase, countText } from "../lib/tools/text";

const ROUTES = {
  "merge-pdf": () => import("../app/tools/merge-pdf/page"),
  "split-pdf": () => import("../app/tools/split-pdf/page"),
  "compress-pdf": () => import("../app/tools/compress-pdf/page"),
  "pdf-to-image": () => import("../app/tools/pdf-to-image/page"),
  "images-to-pdf": () => import("../app/tools/images-to-pdf/page"),
  "pdf-lock-unlock": () => import("../app/tools/pdf-lock-unlock/page"),
  "pdf-studio": () => import("../app/tools/pdf-studio/page"),
  "pdf-to-word": () => import("../app/tools/pdf-to-word/page"),
  "word-to-pdf": () => import("../app/tools/word-to-pdf/page"),
  "image-compressor": () => import("../app/tools/image-compressor/page"),
  "image-resizer": () => import("../app/tools/image-resizer/page"),
  "image-cropper": () => import("../app/tools/image-cropper/page"),
  "image-to-image": () => import("../app/tools/image-to-image/page"),
  "qr-generator": () => import("../app/tools/qr-generator/page"),
  "qr-code-scanner": () => import("../app/tools/qr-code-scanner/page"),
  "password-generator": () => import("../app/tools/password-generator/page"),
  "json-formatter": () => import("../app/tools/json-formatter/page"),
  "json-validator": () => import("../app/tools/json-validator/page"),
  "xml-formatter": () => import("../app/tools/xml-formatter/page"),
  "html-formatter": () => import("../app/tools/html-formatter/page"),
  "css-minifier": () => import("../app/tools/css-minifier/page"),
  "javascript-minifier": () => import("../app/tools/javascript-minifier/page"),
  "base64-encoder-decoder": () =>
    import("../app/tools/base64-encoder-decoder/page"),
  "url-encoder-decoder": () => import("../app/tools/url-encoder-decoder/page"),
  "uuid-generator": () => import("../app/tools/uuid-generator/page"),
  "hash-generator": () => import("../app/tools/hash-generator/page"),
  "regex-tester": () => import("../app/tools/regex-tester/page"),
  "word-counter": () => import("../app/tools/word-counter/page"),
  "case-converter": () => import("../app/tools/case-converter/page"),
  "image-to-text": () => import("../app/tools/image-to-text/page"),
} as const;

const ORIGIN = "https://quickkit.online";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("Phase 3 Batch C — 30 tool pages", () => {
  it("has unique, intent-focused metadata and verified reference content for every route", () => {
    const slugs = Object.keys(ROUTES) as (keyof typeof ROUTES)[];
    expect(slugs).toHaveLength(30);
    expect(Object.keys(TOOL_SEO_CONTENT).sort()).toEqual([...slugs].sort());

    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const slug of slugs) {
      const entry = TOOL_SEO_CONTENT[slug];
      expect(entry.referenceHeading, `${slug} reference heading`).toBeTruthy();
      expect(entry.referenceIntro, `${slug} reference intro`).toBeTruthy();
      expect(entry.specs.length, `${slug} specs`).toBeGreaterThanOrEqual(4);
      expect(entry.examples.length, `${slug} examples`).toBeGreaterThanOrEqual(
        3,
      );
      expect(new Set(entry.specs.map(({ label }) => label)).size).toBe(
        entry.specs.length,
      );
      expect(new Set(entry.examples.map(({ scenario }) => scenario)).size).toBe(
        entry.examples.length,
      );
      for (const example of entry.examples) {
        expect(example.input.trim(), `${slug} example input`).not.toBe("");
        expect(example.output.trim(), `${slug} example output`).not.toBe("");
      }

      if (slug in TOOL_SEO_METADATA) {
        const meta = TOOL_SEO_METADATA[slug];
        const title = `${meta.title} | QUICKKIT`;
        expect(title.length, `${slug} title length`).toBeGreaterThanOrEqual(50);
        expect(title.length, `${slug} title length`).toBeLessThanOrEqual(60);
        expect(
          meta.description.length,
          `${slug} description length`,
        ).toBeGreaterThanOrEqual(145);
        expect(
          meta.description.length,
          `${slug} description length`,
        ).toBeLessThanOrEqual(160);
        titles.add(title);
        descriptions.add(meta.description);
      }
    }
    expect(titles.size).toBe(15);
    expect(descriptions.size).toBe(15);
  });

  it("checks representative reference examples against the shipped engines", async () => {
    const jsonExample = TOOL_SEO_CONTENT["json-formatter"].examples[0];
    expect(
      processJson(
        '{"roles":["admin","editor"],"active":true,"user":"Asha"}',
        "format",
        { indent: 2, sortKeys: true },
      ),
    ).toBe(jsonExample.output);

    const cssExample = TOOL_SEO_CONTENT["css-minifier"].examples[0];
    const cssInput =
      "/* Hero card */\n.hero {\n  padding: 16px 24px 16px 24px;\n  color: #ffffff;\n}";
    expect(minifyCss(cssInput)).toBe(
      ".hero{padding:16px 24px 16px 24px;color:#fff}",
    );
    expect(new TextEncoder().encode(cssInput)).toHaveLength(75);
    expect(cssExample.output).toContain("75 → 45 bytes (40% smaller)");

    const jsExample = TOOL_SEO_CONTENT["javascript-minifier"].examples[0];
    const jsInput =
      "function totalWithTax(price, rate) {\n  const tax = price * rate;\n  return price + tax;\n}";
    expect(await minifyJavaScript(jsInput)).toBe(
      "function totalWithTax(t,n){return t+t*n}",
    );
    expect(new TextEncoder().encode(jsInput)).toHaveLength(88);
    expect(jsExample.output).toContain("88 → 40 bytes (54.5% smaller)");

    expect(
      formatXml(
        '<?xml version="1.0"?><note><to>Riya</to><body>Ship v2</body></note>',
        { indent: 2 },
      ),
    ).toBe(TOOL_SEO_CONTENT["xml-formatter"].examples[0].output);
    expect(
      bytesToBase64(new TextEncoder().encode("QUICKKIT — local tools")),
    ).toBe(TOOL_SEO_CONTENT["base64-encoder-decoder"].examples[0].output);
    expect(
      encodeUrl("plan=pro&redirect=https://example.com/a b", "component"),
    ).toBe(TOOL_SEO_CONTENT["url-encoder-decoder"].examples[0].output);
    expect(
      encodeUrl(
        "https://example.com/docs/my guide?lang=हिन्दी#top",
        "full-url",
      ),
    ).toBe(TOOL_SEO_CONTENT["url-encoder-decoder"].examples[1].output);
    expect(await hashText("quickkit", "SHA-256")).toBe(
      TOOL_SEO_CONTENT["hash-generator"].examples[0].output,
    );

    const text =
      "Clear documentation saves engineering hours. Clear examples prevent support tickets.";
    const counts = countText(text);
    const insights = analyzeText(text);
    expect(counts).toMatchObject({
      words: 10,
      characters: 84,
      sentences: 2,
      readingSeconds: 3,
    });
    expect(insights.speakingSeconds).toBe(4);
    expect(insights.topWords[0]).toMatchObject({
      word: "clear",
      count: 2,
      percent: 20,
    });

    expect(convertCase("user_profile-avatar URL", "camelCase")).toBe(
      "userProfileAvatarUrl",
    );
    expect(convertCase("UserProfileAvatarUrl", "kebab-case")).toBe(
      "user-profile-avatar-url",
    );
    expect(convertCase("OrderCheckoutTotal", "snake_case")).toBe(
      "order_checkout_total",
    );

    const allPools = { ...defaultPasswordOptions, length: 20 };
    const noAmbiguous = {
      ...defaultPasswordOptions,
      length: 16,
      symbols: false,
      excludeAmbiguous: true,
    };
    expect(passwordPoolSize(allPools)).toBe(85);
    expect(passwordEntropy(allPools)).toBe(128);
    expect(passwordPoolSize(noAmbiguous)).toBe(56);
    expect(passwordEntropy(noAmbiguous)).toBe(93);
  });

  it("renders 30 routes with one H1, no skipped heading levels, 4+ steps and FAQs, and matching FAQ JSON-LD", async () => {
    vi.stubEnv("SITE_URL", ORIGIN);
    if (!window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }
    const renderedTitles = new Set<string>();
    const renderedDescriptions = new Set<string>();
    for (const [slug, load] of Object.entries(ROUTES)) {
      vi.resetModules();
      const { default: Page, metadata } = await load();
      const rendered = render(<Page />);
      const { container } = rendered;

      const title = metadata.title as string;
      const description = metadata.description as string;
      expect(title, `${slug} metadata title`).toBeTruthy();
      expect(description, `${slug} metadata description`).toBeTruthy();
      expect(metadata.alternates?.canonical, `${slug} canonical`).toBe(
        `${ORIGIN}/tools/${slug}`,
      );
      const brandedTitle = `${title} | QUICKKIT`;
      expect(
        brandedTitle.length,
        `${slug} title length`,
      ).toBeGreaterThanOrEqual(50);
      expect(brandedTitle.length, `${slug} title length`).toBeLessThanOrEqual(
        60,
      );
      expect(renderedTitles.has(brandedTitle), `${slug} duplicate title`).toBe(
        false,
      );
      renderedTitles.add(brandedTitle);
      expect(
        renderedDescriptions.has(description),
        `${slug} duplicate description`,
      ).toBe(false);
      renderedDescriptions.add(description);
      expect(
        description.length,
        `${slug} description length`,
      ).toBeGreaterThanOrEqual(145);
      expect(
        description.length,
        `${slug} description length`,
      ).toBeLessThanOrEqual(160);

      const headings = [
        ...container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ].map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent?.trim().replace(/\s+/g, " ") ?? "",
      }));
      expect(
        headings.filter(({ level }) => level === 1),
        `${slug} H1 count`,
      ).toHaveLength(1);
      expect(headings[0]?.level, `${slug} first heading level`).toBe(1);
      for (let index = 1; index < headings.length; index += 1) {
        expect(
          headings[index].level - headings[index - 1].level,
          `${slug} skipped heading level ${headings[index - 1].text} -> ${headings[index].text}`,
        ).toBeLessThanOrEqual(1);
      }

      const visibleFaqs = [
        ...container.querySelectorAll(
          ".tool-guidance > section:last-child details > summary",
        ),
      ].map((summary) => summary.textContent?.trim());
      expect(visibleFaqs.length, `${slug} visible FAQs`).toBeGreaterThanOrEqual(
        4,
      );
      expect(new Set(visibleFaqs).size, `${slug} duplicate FAQ questions`).toBe(
        visibleFaqs.length,
      );
      const faqAnswers = container.querySelectorAll(
        ".tool-guidance > section:last-child details > p",
      );
      expect(faqAnswers.length, `${slug} FAQ answers`).toBe(visibleFaqs.length);
      for (const answer of faqAnswers)
        expect(answer.textContent?.trim().length).toBeGreaterThan(40);
      const blocks = [
        ...container.querySelectorAll('script[type="application/ld+json"]'),
      ].flatMap((node) => {
        const parsed = JSON.parse(node.textContent || "{}");
        return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
      });
      const faqPage = blocks.find((block) => block["@type"] === "FAQPage");
      expect(faqPage, `${slug} FAQPage`).toBeDefined();
      const structuredQuestions = (
        faqPage.mainEntity as { name: string }[]
      ).map(({ name }) => name);
      expect(structuredQuestions, `${slug} FAQ parity`).toEqual(visibleFaqs);

      if (slug !== "word-to-pdf") {
        const stepsHeading = container.querySelector(".tool-guidance h2");
        expect(stepsHeading, `${slug} visible steps`).not.toBeNull();
        const steps = stepsHeading?.parentElement?.querySelectorAll("ol > li");
        expect(steps?.length, `${slug} step count`).toBeGreaterThanOrEqual(4);
      } else {
        const steps = container.querySelectorAll(".tool-guidance ol > li");
        expect(steps.length, "word-to-pdf step count").toBeGreaterThanOrEqual(
          4,
        );
      }
      rendered.unmount();
    }
    expect(renderedTitles.size).toBe(30);
    expect(renderedDescriptions.size).toBe(30);
  }, 30_000);
});
