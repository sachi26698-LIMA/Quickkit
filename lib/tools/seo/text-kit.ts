/**
 * SEO copy generation from facts the user supplies.
 *
 * ## Why these templates are formulaic on purpose
 *
 * Every "meta description generator" on the internet writes the same sentence
 * with your noun inserted, and Google ignores those pages for the same reason a
 * reader does. The honest version of this tool is narrower: it gives you the
 * *shapes* that work and the click-relevant facts, then gets out of the way. All
 * numbers — prices, counts, speeds, dates — come from the user, because a
 * generated "free, fast, 100% accurate" is a claim the site owner has to defend,
 * not the generator.
 *
 * Output is labelled "draft" throughout.
 */

export type Suggestion = { text: string; length: number; note: string };

const tidy = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1");

/**
 * Title candidates for a page, each built from the user's primary keyword plus
 * one concrete differentiator. Deduplicated and length-listed but never
 * truncated, because a truncated title is the site's problem to solve, not the
 * generator's to hide.
 */
export function titleSuggestions(input: {
  keyword: string;
  brand?: string;
  differentiator?:
    "free" | "fast" | "local" | "detailed" | "no-signup" | "none";
  year?: number;
  modifier?: "how-to" | "best" | "vs" | "guide" | "none";
}): Suggestion[] {
  const keyword = tidy(input.keyword) || "[primary keyword]";
  const brand = input.brand?.trim();
  const withBrand = (text: string) => (brand ? `${text} | ${brand}` : text);

  const differentiators: Record<string, string> = {
    free: "Free",
    fast: "Fast",
    local: "In Your Browser",
    detailed: "Step by Step",
    "no-signup": "No Sign-Up",
    none: "",
  };
  const differentiator = differentiators[input.differentiator ?? "none"];

  const modifiers: Record<string, (value: string) => string> = {
    "how-to": (value) => `How to ${value}`,
    best: (value) => `Best ${value}`,
    vs: (value) => `${value}: Compared`,
    guide: (value) => `${value}: A Practical Guide`,
    none: (value) => value,
  };
  const lead = modifiers[input.modifier ?? "none"](keyword);

  const year = input.year ? ` (${input.year})` : "";
  const candidates = [
    differentiator ? `${lead} — ${differentiator}${year}` : `${lead}${year}`,
    differentiator && brand ? `${lead} | ${differentiator} ${brand}` : "",
    `${lead}${year}${brand && !differentiator ? ` | ${brand}` : ""}`,
    differentiator ? `${differentiator} ${keyword}${year}` : "",
    brand ? `${keyword} — ${brand}` : "",
  ];

  return [...new Set(candidates.filter(Boolean).map(withBrand))]
    .filter((text, index, list) => list.indexOf(text) === index)
    .map((text) => ({
      text,
      length: text.length,
      note:
        text.length > 60
          ? "Over 60 characters: Google may truncate it in the snippet. Still valid as a title tag."
          : text.length < 30
            ? "Under 30 characters: leaves room unused. A little more specific detail helps click-through."
            : "Within the usual 30–60 character window.",
    }));
}

/**
 * Meta description drafts.
 *
 * Each variant leads with the user's benefit statement and then names the
 * mechanism, because descriptions that restate the title add nothing. The verb
 * determines what the reader expects to happen next.
 */
export function descriptionSuggestions(input: {
  keyword: string;
  benefit: string;
  mechanism?: string;
  differentiator?: string;
  callToAction?: "try" | "calculate" | "download" | "compare" | "learn";
}): Suggestion[] {
  const keyword = tidy(input.keyword) || "[primary keyword]";
  const benefit = tidy(input.benefit) || "[the specific thing the reader gets]";
  const mechanism = input.mechanism ? tidy(input.mechanism) : "";
  const differentiator = input.differentiator ? tidy(input.differentiator) : "";
  const cta = {
    try: "Try it free.",
    calculate: "Calculate it now.",
    download: "Download the result.",
    compare: "Compare the options.",
    learn: "Here is how it works.",
  }[input.callToAction ?? "try"];

  const candidates = [
    `${benefit}. ${mechanism ? `${mechanism}. ` : ""}${differentiator ? `${differentiator}. ` : ""}${cta}`,
    `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)}: ${benefit.toLowerCase().replace(/\.$/, "")}. ${mechanism ? `${mechanism}. ` : ""}${cta}`,
    `${benefit}${differentiator ? ` — ${differentiator.toLowerCase()}` : ""}. ${cta}`,
  ];

  return [...new Set(candidates.map(tidy))].map((text) => ({
    text,
    length: text.length,
    note:
      text.length > 160
        ? "Longer than 160 characters. Google truncates around here; the extra text is still read, but not shown."
        : text.length < 120
          ? "Shorter than 120 characters. You are leaving description space unused."
          : "Within the 120–160 character window.",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Content briefs and outlines
// ─────────────────────────────────────────────────────────────────────────────

export type ContentBrief = {
  markdown: string;
  sections: number;
  issues: string[];
};

/**
 * Turn a keyword and intent into an outline with the questions a reader
 * actually has.
 *
 * The questions come from a small, honest taxonomy of search intent — what to
 * check, how it works, what it costs, what goes wrong — applied to the topic
 * the user typed. It does not claim these are real "People Also Ask" results,
 * because that needs live SERP data. The UI says "questions a reader at this
 * stage will have", which is what the output really is.
 */
export function buildContentBrief(input: {
  topic: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  audience: string;
  /** Facts the writer already has. */
  knownPoints?: string[];
  targetWords?: number;
}): ContentBrief {
  const topic = tidy(input.topic) || "[topic]";
  const audience = tidy(input.audience) || "[who this is for]";
  const issues: string[] = [];
  const words = input.targetWords ?? 1200;

  if (!input.topic.trim()) issues.push("Add the topic the page is about.");
  if (!input.audience.trim()) {
    issues.push(
      'Name the reader. "Everyone" is not an audience and produces copy nobody recognises.',
    );
  }
  if (words < 400) {
    issues.push(
      "Under 400 words is rarely enough to answer a real question completely.",
    );
  }

  const intentShape = {
    informational: [
      "Define the thing in the first paragraph, in plain words",
      "Explain how it works, step by step",
      "Worked example with real numbers",
      "Common mistakes and what they cost",
      "When this does not apply",
    ],
    commercial: [
      "What the options actually are",
      "Comparison table on axes the reader cares about",
      "Total cost, not headline price",
      "Who each option suits, and who it does not",
      "What to check before committing",
    ],
    transactional: [
      "What the reader gets, stated plainly",
      "How to do it, numbered",
      "What it costs, including limits",
      "What happens to their data",
      "Proof it works, without invented testimonials",
    ],
    navigational: [
      "What this page or product is",
      "Where to find each thing",
      "Common problems and fixes",
      "Related pages",
    ],
  }[input.intent];

  const readerQuestions: Record<string, string[]> = {
    informational: [
      `Is ${topic} the same as the thing I already know?`,
      `What does it cost or save?`,
      `What is the catch?`,
      `How long does it take?`,
    ],
    commercial: [
      `Which ${topic} is best for my situation?`,
      `What is the real total cost?`,
      `What do I lose by choosing the cheaper option?`,
      `How hard is it to switch later?`,
    ],
    transactional: [
      `Will this work for my case?`,
      `Is my data safe?`,
      `What are the limits?`,
      `What if it does not work?`,
    ],
    navigational: [
      `Where do I start?`,
      `What are the requirements?`,
      `Who do I contact?`,
    ],
  };

  const known =
    input.knownPoints?.map((point) => point.trim()).filter(Boolean) ?? [];

  const markdown = [
    `# Content brief: ${topic}`,
    "",
    `**Audience** — ${audience}`,
    `**Search intent** — ${input.intent}`,
    `**Target length** — about ${words} words`,
    "",
    "## Working title",
    `${topic} — what it is, what it costs, and how to do it`,
    "",
    "## Meta description",
    `Everything you need to know about ${topic.toLowerCase()}, from ${audience.toLowerCase()}: how it works, what it costs, and what to watch for.`,
    "",
    "## Outline",
    ...intentShape.map((section, index) => `${index + 1}. **${section}**`),
    "",
    "## Questions the reader will have",
    ...readerQuestions[input.intent].map((question) => `- ${question}`),
    "",
    "## Evidence to gather before writing",
    ...(known.length > 0
      ? known.map((point) => `- ${point}`)
      : [
          "- [The specific numbers, limits or timelines you will state, with their source]",
          "- [The one thing competitors get wrong that you can correct]",
          "- [A worked example you can verify yourself]",
        ]),
    "",
    "## Do not",
    "- Do not state a figure you cannot source.",
    "- Do not promise a ranking outcome.",
    "- Do not pad to hit the word count; cut instead.",
  ].join("\n");

  return { markdown, sections: intentShape.length, issues };
}

/** Headline variants that make a claim the page can actually support. */
export function headlineSuggestions(input: {
  subject: string;
  angle: "how-to" | "comparison" | "explainer" | "data" | "mistake";
}): Suggestion[] {
  const subject = tidy(input.subject) || "[subject]";
  const templates: Record<typeof input.angle, string[]> = {
    "how-to": [
      `How to ${subject} (step by step)`,
      `${subject}: a working method`,
      `Doing ${subject} properly`,
    ],
    comparison: [
      `${subject}: which one actually fits`,
      `${subject} compared on the numbers`,
      `Choosing between ${subject}`,
    ],
    explainer: [
      `What ${subject} really means`,
      `${subject}, explained without the jargon`,
      `How ${subject} works`,
    ],
    data: [
      `What the numbers say about ${subject}`,
      `${subject} in numbers`,
      `Measuring ${subject}`,
    ],
    mistake: [
      `Five mistakes in ${subject}`,
      `Where ${subject} usually goes wrong`,
      `${subject}: the part people skip`,
    ],
  };
  return templates[input.angle].map((text) => ({
    text,
    length: text.length,
    note: "Claims nothing the page has to prove beyond what you write.",
  }));
}

/**
 * Alt text from image context.
 *
 * The rule enforced: alt text describes the image for someone who cannot see it.
 * If the image is decorative, the correct output is `alt=""` — and the tool says
 * so rather than inventing a description.
 */
export function altText(input: {
  subject: string;
  context?: "decorative" | "informational" | "functional" | "chart";
  detail?: string;
}): { value: string; note: string } {
  if (input.context === "decorative") {
    return {
      value: "",
      note: 'Decorative image: use an empty alt attribute (alt="") so screen readers skip it. Adding words is worse than nothing.',
    };
  }
  const subject = tidy(input.subject) || "[what the image shows]";
  const detail = input.detail?.trim();
  if (input.context === "functional") {
    return {
      value: `${subject}${detail ? ` — ${detail}` : ""}`,
      note: "Functional image (a link or button): describe the destination or action, not the picture.",
    };
  }
  if (input.context === "chart") {
    return {
      value: `${subject}${detail ? `, ${detail}` : ""}. [State the trend and the range in words, not just the title.]`,
      note: "For a chart, the alt text should convey the finding, since a screen-reader user cannot see the shape.",
    };
  }
  return {
    value: `${subject}${detail ? `, ${detail}` : ""}`,
    note: 'Describe what someone needs from the image. Skip "image of" and "picture of".',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal linking and topic clusters
// ─────────────────────────────────────────────────────────────────────────────

export type LinkSuggestion = {
  from: string;
  to: string;
  anchor: string;
  reason: string;
};

/**
 * Suggest internal links from pages' target keywords.
 *
 * A link is suggested when page B's keyword appears in page A's text but A does
 * not already link to B — a mechanical, checkable rule. Anchors come from B's
 * keyword, which is usually better than "click here" and is what the rule can
 * justify. Nothing about authority or PageRank flow is claimed.
 */
export function suggestInternalLinks(
  pages: { url: string; keyword: string; text?: string; links?: string[] }[],
): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = [];
  for (const from of pages) {
    const body = (from.text ?? "").toLowerCase();
    const existing = new Set(
      (from.links ?? []).map((link) => link.replace(/\/$/, "")),
    );
    for (const to of pages) {
      if (to.url === from.url) continue;
      if (existing.has(to.url.replace(/\/$/, ""))) continue;
      const keyword = to.keyword.trim().toLowerCase();
      if (!keyword) continue;
      if (!body.includes(keyword)) continue;
      suggestions.push({
        from: from.url,
        to: to.url,
        anchor: to.keyword,
        reason: `"${to.keyword}" already appears in ${from.url} but is not linked.`,
      });
    }
  }
  return suggestions.slice(0, 60);
}

/** Cluster pages around a pillar by shared keywords, and find orphans. */
export function buildTopicClusters(
  pages: { url: string; keyword: string; links?: string[] }[],
): {
  clusters: { pillar: string; members: string[]; shared: string[] }[];
  orphans: string[];
} {
  const tokenSets = pages.map((page) => ({
    url: page.url,
    keyword: page.keyword,
    tokens: new Set(
      page.keyword
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 3),
    ),
  }));

  const clusters: { pillar: string; members: string[]; shared: string[] }[] =
    [];
  const used = new Set<string>();

  for (const candidate of tokenSets) {
    if (used.has(candidate.url)) continue;
    const members = tokenSets.filter(
      (other) =>
        other.url !== candidate.url &&
        [...candidate.tokens].some((token) => other.tokens.has(token)),
    );
    if (members.length === 0) continue;
    used.add(candidate.url);
    members.forEach((member) => used.add(member.url));
    const shared = [...candidate.tokens].filter((token) =>
      members.some((member) => member.tokens.has(token)),
    );
    clusters.push({
      pillar: candidate.url,
      members: members.map((member) => member.url),
      shared,
    });
  }

  const inbound = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.links ?? []) {
      inbound.set(
        link.replace(/\/$/, ""),
        (inbound.get(link.replace(/\/$/, "")) ?? 0) + 1,
      );
    }
  }
  const orphans = pages
    .filter((page) => !inbound.has(page.url.replace(/\/$/, "")))
    .map((page) => page.url);

  return { clusters: clusters.slice(0, 20), orphans };
}
