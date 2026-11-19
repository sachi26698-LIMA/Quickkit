/**
 * On-page SEO analysis, computed from text the user pastes.
 *
 * ## The honesty constraint that shapes this file
 *
 * QUICKKIT cannot see Google's index, your rankings, your backlinks, your
 * traffic or your competitors' volumes. Anything claiming to would be invented.
 * So this module analyses **only what it is given** — title, description,
 * headings, body copy, links, images — and reports mechanical, checkable facts:
 * lengths, pixel widths, keyword occurrences, ratios, duplicates.
 *
 * Every number produced here is reproducible by hand from the input, which is
 * the test of a real analyser rather than a scoring gimmick. Where an industry
 * "ideal" is a convention rather than a rule (the 60-character title), the
 * finding says so instead of asserting a ranking effect.
 */

/** Average glyph width used to estimate rendered width in a result font. */
const APPROX_CHAR_WIDTH = 0.52;

/**
 * Approximate SERP pixel width. Google truncates on rendered width, not
 * characters, so a string of narrow letters fits where wide letters do not.
 * The estimate uses average character width per weight class, which tracks the
 * real cut-off closely for Latin text but is an estimate, and is labelled so.
 */
export function pixelWidth(text: string): number {
  let units = 0;
  for (const char of text) {
    if (/[iljI.,'!:;|\s]/.test(char)) units += 0.32;
    else if (/[mwMW]/.test(char)) units += 0.92;
    else if (/[A-Z]/.test(char)) units += 0.68;
    else if (/[0-9]/.test(char)) units += 0.56;
    else units += APPROX_CHAR_WIDTH;
  }
  return Math.round(units * 16); // ≈16px at the rendered size
}

export type LengthCheck = {
  value: number;
  min: number;
  max: number;
  status: "short" | "ok" | "long";
  label: string;
};

const check = (
  value: number,
  min: number,
  max: number,
  label: string,
): LengthCheck => ({
  value,
  min,
  max,
  label,
  status: value < min ? "short" : value > max ? "long" : "ok",
});

/** Character-count checks against the conventional (not ranking) targets. */
export function titleLength(text: string): LengthCheck {
  return check(text.trim().length, 30, 60, "Title characters");
}

export function descriptionLength(text: string): LengthCheck {
  return check(text.trim().length, 120, 160, "Description characters");
}

/** Pixel-width checks against Google's ~580px / ~920px display limits. */
export function titlePixels(text: string): LengthCheck {
  return check(pixelWidth(text), 200, 580, "Title pixels (≈580px limit)");
}

export function descriptionPixels(text: string): LengthCheck {
  return check(pixelWidth(text), 400, 920, "Description pixels (≈920px limit)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword analysis
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(
  "a an and are as at be been but by for from had has have he her his i if in into is it its me my no not of on or our out she so than that the their them then there these they this to too us was we were what when where which who will with you your".split(
    " ",
  ),
);

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type KeywordStat = {
  term: string;
  count: number;
  /** Occurrences ÷ total words, as a percentage. */
  density: number;
  inTitle: boolean;
  inDescription: boolean;
  inHeadings: boolean;
  inFirstParagraph: boolean;
  inUrl: boolean;
};

export type ContentAnalysisInput = {
  title?: string;
  description?: string;
  headings?: string;
  body: string;
  keyword: string;
  /** Slugs of internal links found, for link checks. */
  url?: string;
};

/**
 * Occurrences of a keyword and its positions across the page.
 *
 * Counts the phrase as a **substring of the normalised word stream** so multi
 * word keywords work, and reports the same count for its position in the
 * title, description, headings and first 100 words. Density is occurrences as a
 * share of total words — shown, never graded as "good" or "bad", because there
 * is no defensible universal threshold.
 */
export function keywordStat(input: ContentAnalysisInput): KeywordStat {
  const term = input.keyword.trim().toLowerCase();
  const bodyWords = words(input.body);
  const termWords = words(term);
  let count = 0;

  if (termWords.length > 0) {
    for (let i = 0; i <= bodyWords.length - termWords.length; i++) {
      let matched = true;
      for (let j = 0; j < termWords.length; j++) {
        if (bodyWords[i + j] !== termWords[j]) {
          matched = false;
          break;
        }
      }
      if (matched) count++;
    }
  }

  const first = bodyWords.slice(0, 100).join(" ");
  const headingWords = words(input.headings ?? "").join(" ");
  const normalisedTerm = termWords.join(" ");

  return {
    term,
    count,
    density: bodyWords.length > 0 ? (count / bodyWords.length) * 100 : 0,
    inTitle:
      term.length > 0 && (input.title ?? "").toLowerCase().includes(term),
    inDescription:
      term.length > 0 && (input.description ?? "").toLowerCase().includes(term),
    inHeadings:
      normalisedTerm.length > 0 && headingWords.includes(normalisedTerm),
    inFirstParagraph:
      normalisedTerm.length > 0 && first.includes(normalisedTerm),
    inUrl:
      normalisedTerm.length > 0 &&
      (input.url ?? "")
        .toLowerCase()
        .replace(/[-/]+/g, " ")
        .includes(normalisedTerm),
  };
}

export type NgramEntry = { phrase: string; count: number; per1000: number };

/**
 * Repeated 2–3 word phrases, excluding stop-word-only shingles.
 *
 * This is the mechanical detector for accidental keyword stuffing and for
 * repeated boilerplate — not a "keyword idea" generator, which would need real
 * search data.
 */
export function repeatedPhrases(
  body: string,
  options: { size?: 2 | 3; limit?: number } = {},
): NgramEntry[] {
  const size = options.size ?? 2;
  const limit = options.limit ?? 12;
  const list = words(body);
  const counts = new Map<string, number>();

  for (let i = 0; i <= list.length - size; i++) {
    const slice = list.slice(i, i + size);
    // A phrase made only of stop words is grammar, not a keyword.
    if (slice.every((word) => STOP_WORDS.has(word))) continue;
    const phrase = slice.join(" ");
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  const total = Math.max(1, list.length);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([phrase, count]) => ({
      phrase,
      count,
      per1000: Math.round((count / total) * 1000 * 10) / 10,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Readability
// ─────────────────────────────────────────────────────────────────────────────

export type ReadabilityResult = {
  words: number;
  sentences: number;
  syllables: number;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  /** Flesch Reading Ease, 0–100 (higher is easier). Validated for English. */
  fleschReadingEase: number;
  /** US grade level from the same inputs. */
  fleschKincaidGrade: number;
  label: string;
  notes: string[];
};

function syllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length <= 3) return 1;
  const trimmed = clean
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * Flesch Reading Ease and Flesch–Kincaid grade.
 *
 * Both formulas are for English. Applying them to Hindi, Gujarati or Tamil
 * produces meaningless scores because syllable structure and sentence
 * boundaries differ, so the result says so when non-Latin script dominates
 * instead of returning a confident number.
 */
export function readability(text: string): ReadabilityResult {
  const list = words(text);
  const sentences = Math.max(
    1,
    (text.match(/[.!?]+(?:\s|$)/g) ?? []).length || (list.length > 0 ? 1 : 0),
  );
  const syllableCount = list.reduce((sum, word) => sum + syllables(word), 0);
  const asl = list.length / sentences;
  const asw = list.length > 0 ? syllableCount / list.length : 0;
  const flesch = 206.835 - 1.015 * asl - 84.6 * asw;
  const grade = 0.39 * asl + 11.8 * asw - 15.59;

  const notes: string[] = [];
  const nonLatin = (text.match(/[^\u0000-\u024f\s\d\p{P}]/gu) ?? []).length;
  if (list.length > 0 && nonLatin > list.length * 0.3) {
    notes.push(
      "Most of this text is not in Latin script. Flesch formulas are calibrated for English and these scores should be ignored for it.",
    );
  }
  if (list.length < 30) {
    notes.push(
      "Fewer than 30 words: readability scores are unstable at this length.",
    );
  }

  const ease = Math.max(0, Math.min(100, flesch));
  const label =
    ease >= 80
      ? "Very easy (grade 5–6)"
      : ease >= 70
        ? "Easy (grade 7)"
        : ease >= 60
          ? "Plain (grade 8–9)"
          : ease >= 50
            ? "Fairly difficult (grade 10–12)"
            : ease >= 30
              ? "Difficult (university)"
              : "Very difficult (graduate)";

  return {
    words: list.length,
    sentences,
    syllables: syllableCount,
    averageSentenceLength: Math.round(asl * 10) / 10,
    averageSyllablesPerWord: Math.round(asw * 100) / 100,
    fleschReadingEase: Math.round(ease * 10) / 10,
    fleschKincaidGrade: Math.round(Math.max(0, grade) * 10) / 10,
    label,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate / near-duplicate detection
// ─────────────────────────────────────────────────────────────────────────────

export type Similarity = {
  /** Jaccard similarity of 3-word shingles, 0–1. */
  score: number;
  sharedPhrases: string[];
  verdict: "distinct" | "overlapping" | "near-duplicate";
};

const shinglesOf = (text: string): Set<string> => {
  const list = words(text);
  const set = new Set<string>();
  for (let i = 0; i <= list.length - 3; i++) {
    set.add(list.slice(i, i + 3).join(" "));
  }
  return set;
};

/**
 * Compare two pages for near-duplicate body copy.
 *
 * Uses Jaccard similarity over 3-word shingles — the standard cheap detector for
 * "same page with the city name swapped", which is the exact doorway-page
 * pattern search guidelines penalise. It compares only the two texts the user
 * supplies; it does not crawl, and it never claims a page is or is not
 * duplicated in Google's index.
 */
export function similarity(a: string, b: string): Similarity {
  const first = shinglesOf(a);
  const second = shinglesOf(b);
  if (first.size === 0 || second.size === 0) {
    return { score: 0, sharedPhrases: [], verdict: "distinct" };
  }
  let intersection = 0;
  for (const shingle of first) if (second.has(shingle)) intersection++;
  const union = first.size + second.size - intersection;
  const score = union > 0 ? intersection / union : 0;
  const sharedPhrases = [...first].filter((s) => second.has(s)).slice(0, 8);
  return {
    score: Math.round(score * 1000) / 1000,
    sharedPhrases,
    verdict:
      score >= 0.7
        ? "near-duplicate"
        : score >= 0.35
          ? "overlapping"
          : "distinct",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cannibalisation: two of your own pages targeting one query
// ─────────────────────────────────────────────────────────────────────────────

export type PageTarget = {
  url: string;
  title: string;
  keyword: string;
  /** Optional body excerpt, used to break near-ties. */
  excerpt?: string;
};

export type CannibalisationFinding = {
  keyword: string;
  pages: string[];
  severity: "high" | "medium";
  reason: string;
};

/**
 * Find keywords two of your own pages target with the same intent.
 *
 * The rule is mechanical and explainable: the same normalised keyword in two
 * pages' targeted keywords is a conflict; if the titles are also near-duplicate
 * it is high severity. It analyses the list you paste — your real Search Console
 * data stays with you, and the tool does not pretend to know your impressions.
 */
export function cannibalisation(pages: PageTarget[]): CannibalisationFinding[] {
  const byKeyword = new Map<string, PageTarget[]>();
  for (const page of pages) {
    const key = words(page.keyword).join(" ");
    if (!key) continue;
    const list = byKeyword.get(key) ?? [];
    list.push(page);
    byKeyword.set(key, list);
  }

  const findings: CannibalisationFinding[] = [];
  for (const [keyword, group] of byKeyword) {
    if (group.length < 2) continue;
    let worst = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const s = similarity(group[i].title, group[j].title);
        worst = Math.max(worst, s.score);
      }
    }
    findings.push({
      keyword,
      pages: group.map((page) => page.url),
      severity: worst >= 0.4 ? "high" : "medium",
      reason:
        worst >= 0.4
          ? `${group.length} pages target "${keyword}" and their titles are near-duplicate, so neither clearly owns the query.`
          : `${group.length} pages target "${keyword}". Consolidate or differentiate the intent.`,
    });
  }
  return findings.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// On-page structure extraction
// ─────────────────────────────────────────────────────────────────────────────

export type PageStructure = {
  headings: { level: number; text: string }[];
  h1Count: number;
  headingSkips: string[];
  links: { href: string; text: string; external: boolean; nofollow: boolean }[];
  images: { src: string; alt: string }[];
  imagesMissingAlt: number;
  wordCount: number;
  issues: { severity: "error" | "warning" | "info"; message: string }[];
};

const stripTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decode = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

/**
 * Parse the HTML the user pastes and check its on-page structure.
 *
 * Deliberately regex-based rather than a DOM parse: it runs on the main thread
 * over arbitrary pasted markup, and building a full DOM for a 500 KB document
 * to answer "how many H1s are there" is the wrong trade. The checks are the ones
 * that are objectively wrong regardless of opinion: multiple H1s, skipped
 * heading levels, images without alt text, empty anchors.
 */
export function analyseStructure(html: string): PageStructure {
  const headings: PageStructure["headings"] = [];
  const issues: PageStructure["issues"] = [];

  const headingRe = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    const text = decode(stripTags(match[2]));
    headings.push({ level: Number(match[1]), text });
  }
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      severity: "error",
      message: "No H1 found. Every page needs one H1 stating its topic.",
    });
  } else if (h1Count > 1) {
    issues.push({
      severity: "error",
      message: `${h1Count} H1 elements found. One H1 per page keeps the outline unambiguous.`,
    });
  }

  const headingSkips: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level - headings[i - 1].level > 1) {
      headingSkips.push(
        `H${headings[i - 1].level} → H${headings[i].level} at "${headings[i].text.slice(0, 60)}"`,
      );
    }
  }
  if (headingSkips.length > 0) {
    issues.push({
      severity: "warning",
      message: `${headingSkips.length} skipped heading level${headingSkips.length === 1 ? "" : "s"}; this breaks the document outline for screen-reader navigation.`,
    });
  }

  const links: PageStructure["links"] = [];
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  while ((match = linkRe.exec(html)) !== null) {
    const attrs = match[1];
    const href = /href\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    const text = decode(stripTags(match[2]));
    const nofollow = /rel\s*=\s*["'][^"']*nofollow/i.test(attrs);
    links.push({ href, text, external: /^https?:\/\//i.test(href), nofollow });
  }
  const emptyAnchors = links.filter((link) => !link.text.trim() && link.href);
  if (emptyAnchors.length > 0) {
    issues.push({
      severity: "warning",
      message: `${emptyAnchors.length} link${emptyAnchors.length === 1 ? "" : "s"} have no anchor text. Screen readers announce the URL instead of a description.`,
    });
  }

  const images: PageStructure["images"] = [];
  const imageRe = /<img\b([^>]*)>/gi;
  while ((match = imageRe.exec(html)) !== null) {
    const attrs = match[1];
    const src = /src\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    const altMatch = /alt\s*=\s*["']([^"']*)["']/i.exec(attrs);
    images.push({
      src,
      alt: altMatch ? decode(altMatch[1]) : "",
      ...(altMatch ? {} : {}),
    });
    if (!altMatch) {
      images[images.length - 1].alt = "";
    }
  }
  const imagesMissingAlt = [...html.matchAll(/<img\b([^>]*)>/gi)].filter(
    (m) => !/\balt\s*=/i.test(m[1]),
  ).length;
  if (imagesMissingAlt > 0) {
    issues.push({
      severity: "error",
      message: `${imagesMissingAlt} image${imagesMissingAlt === 1 ? "" : "s"} missing an alt attribute. Decorative images need alt="" explicitly.`,
    });
  }

  const wordCount = words(stripTags(html)).length;
  if (wordCount > 0 && wordCount < 300) {
    issues.push({
      severity: "info",
      message: `About ${wordCount} words of visible text. Short pages are fine when the job is short; they are thin when the query needs depth.`,
    });
  }

  return {
    headings,
    h1Count,
    headingSkips,
    links,
    images,
    imagesMissingAlt,
    wordCount,
    issues,
  };
}

/** Strip HTML to plain text for analysis or export. */
export const toPlainText = stripTags;
