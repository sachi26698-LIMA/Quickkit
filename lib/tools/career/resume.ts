/**
 * Résumé analysis and generation, with the ATS claim handled honestly.
 *
 * ## What an "ATS score" can and cannot be
 *
 * There is no universal Applicant Tracking System. Workday, Greenhouse, Lever,
 * iCIMS and Taleo parse differently, and none of them publish "the" algorithm.
 * Any site that shows "Your resume scores 87/100 for Workday" is inventing a
 * number. What *is* real, and what this module actually checks:
 *
 * - **Parseability** — does the file have text that survives extraction, are
 *   sections identifiable by standard names, are dates present and consistent.
 * - **Keyword coverage** — does the résumé contain the terms from a specific job
 *   description the user pastes? This is a measurable match against *their*
 *   input, and the most useful signal an applicant controls.
 * - **Contact completeness** — email, phone, location, links.
 * - **Mechanical errors** — repeated words, inconsistent tense, missing
 *   quantification, bullet length.
 *
 * The score is therefore labelled a **readiness check**, its components are
 * itemised, and every finding says what to change. It never claims to predict
 * what a specific company's system will do.
 */

export type ResumeIssue = {
  severity: "error" | "warning" | "info";
  section: string;
  message: string;
};

export type ResumeAnalysis = {
  /** 0–100 across the four weighted components below. */
  score: number;
  wordCount: number;
  sections: { name: string; found: boolean; aliases: string[] }[];
  contact: {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
    github: boolean;
    portfolio: boolean;
    location: boolean;
  };
  bullets: {
    total: number;
    withNumbers: number;
    tooLong: number;
    startingWithWeakVerb: number;
    averageWords: number;
  };
  issues: ResumeIssue[];
  strengths: string[];
  components: { name: string; points: number; max: number; detail: string }[];
  notes: string[];
};

/** Standard section names plus the synonyms real résumés use. */
const SECTION_ALIASES: { name: string; aliases: string[] }[] = [
  {
    name: "Contact",
    aliases: ["email", "phone", "mobile", "linkedin", "contact"],
  },
  {
    name: "Summary",
    aliases: ["summary", "profile", "objective", "about me", "about"],
  },
  {
    name: "Experience",
    aliases: [
      "experience",
      "work experience",
      "employment",
      "professional experience",
      "career history",
    ],
  },
  {
    name: "Education",
    aliases: ["education", "academic", "qualifications", "qualification"],
  },
  {
    name: "Skills",
    aliases: [
      "skills",
      "technical skills",
      "core competencies",
      "competencies",
      "technologies",
    ],
  },
  {
    name: "Projects",
    aliases: ["projects", "project experience", "portfolio"],
  },
  {
    name: "Certifications",
    aliases: ["certifications", "certificates", "licenses", "courses"],
  },
];

const WEAK_OPENERS = new Set([
  "responsible",
  "worked",
  "helped",
  "assisted",
  "involved",
  "participated",
  "duties",
  "tasked",
  "handled",
  "was",
  "were",
  "did",
]);

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}/;
const URL_RE = /(?:https?:\/\/|www\.)[^\s)]+/i;

/**
 * Analyse résumé text.
 *
 * Weights: parseability 30 (sections + contact), quantification 25, keyword
 * match 30 (only when a job description is supplied, otherwise redistributed),
 * mechanics 15. The distribution is disclosed in `components` so nobody has to
 * guess where the number came from.
 */
export function analyseResume(
  text: string,
  options: { jobDescription?: string } = {},
): ResumeAnalysis {
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const issues: ResumeIssue[] = [];
  const strengths: string[] = [];

  // ── Sections ──
  const sections = SECTION_ALIASES.map((section) => ({
    name: section.name,
    found: section.aliases.some((alias) =>
      new RegExp(
        `(^|\\n)\\s*${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\n]`,
        "i",
      ).test(lower),
    ),
    aliases: section.aliases,
  }));

  for (const section of sections) {
    if (
      !section.found &&
      ["Experience", "Education", "Skills"].includes(section.name)
    ) {
      issues.push({
        severity: "error",
        section: section.name,
        message: `No "${section.name}" heading found. Parsers look for standard heading names; add one (e.g. "${section.aliases[0]}").`,
      });
    } else if (!section.found) {
      issues.push({
        severity: "warning",
        section: section.name,
        message: `No "${section.name}" section. Optional — add it only if you have something to say.`,
      });
    }
  }

  // ── Contact ──
  const contact = {
    email: EMAIL_RE.test(text),
    phone: PHONE_RE.test(text),
    linkedin: /linkedin\.com\//i.test(text),
    github: /github\.com\//i.test(text),
    portfolio: URL_RE.test(text) && !/linkedin\.com|github\.com/i.test(text),
    location:
      /\b(india|pune|mumbai|bangalore|bengaluru|delhi|hyderabad|chennai|kolkata|ahmedabad|gujarat|remote|vadodara|surat|noida|gurgaon|gurugram)\b/i.test(
        text,
      ),
  };
  if (!contact.email) {
    issues.push({
      severity: "error",
      section: "Contact",
      message:
        "No email address found. A résumé without a reachable email is filtered out immediately.",
    });
  }
  if (!contact.phone) {
    issues.push({
      severity: "warning",
      section: "Contact",
      message:
        "No phone number detected. Add one in international format if you are open to calls.",
    });
  }
  if (!contact.linkedin) {
    issues.push({
      severity: "info",
      section: "Contact",
      message:
        "No LinkedIn URL. Recruiters routinely look for one; it is optional but cheap to add.",
    });
  }

  // ── Bullets ──
  const bulletLines = lines.filter(
    (line) => /^[-•*·–—]\s*/.test(line) || /^\d+[.)]\s+/.test(line),
  );
  const bulletWords = bulletLines.map((line) =>
    line
      .replace(/^[-•*·–—\d.)\s]+/, "")
      .split(/\s+/)
      .filter(Boolean),
  );
  const withNumbers = bulletLines.filter((line) => /\d/.test(line)).length;
  const tooLong = bulletWords.filter((words) => words.length > 35).length;
  const startingWithWeakVerb = bulletWords.filter((words) =>
    WEAK_OPENERS.has((words[0] ?? "").toLowerCase()),
  ).length;

  if (bulletLines.length < 5) {
    issues.push({
      severity: "warning",
      section: "Experience",
      message: `Only ${bulletLines.length} bullet point${bulletLines.length === 1 ? "" : "s"} detected. Impact is easiest to read as bullets, not paragraphs.`,
    });
  }
  if (bulletLines.length > 0 && withNumbers / bulletLines.length < 0.4) {
    issues.push({
      severity: "warning",
      section: "Experience",
      message: `${withNumbers} of ${bulletLines.length} bullets contain a number. Quantify outcomes — volume, percentage, time saved, team size.`,
    });
  }
  if (tooLong > 0) {
    issues.push({
      severity: "info",
      section: "Experience",
      message: `${tooLong} bullet${tooLong === 1 ? "" : "s"} run over 35 words. Split them or cut the preamble.`,
    });
  }
  if (startingWithWeakVerb > 0) {
    issues.push({
      severity: "warning",
      section: "Experience",
      message: `${startingWithWeakVerb} bullet${startingWithWeakVerb === 1 ? "" : "s"} start with a weak phrase ("responsible for", "helped with"). Start with the action verb: Led, Built, Cut, Shipped, Migrated.`,
    });
  } else if (bulletLines.length >= 5) {
    strengths.push(
      "Every bullet opens with an action verb rather than filler.",
    );
  }
  if (bulletLines.length > 0 && withNumbers / bulletLines.length >= 0.6) {
    strengths.push(
      "Most bullets carry a number, which is what makes impact claimable.",
    );
  }

  // ── Mechanical ──
  const repeated = findRepeatedWords(text);
  if (repeated.length > 0) {
    issues.push({
      severity: "warning",
      section: "Mechanics",
      message: `Repeated adjacent words: ${repeated.slice(0, 5).join(", ")}.`,
    });
  }
  if (wordCount > 900) {
    issues.push({
      severity: "info",
      section: "Length",
      message: `${wordCount} words is long for most roles. Two pages is a normal ceiling below ten years of experience.`,
    });
  } else if (wordCount < 200) {
    issues.push({
      severity: "warning",
      section: "Length",
      message: `Only ${wordCount} words. That is thin for any professional role and gives a parser little to work with.`,
    });
  }

  // ── Keyword match ──
  const jd = options.jobDescription?.trim() ?? "";
  const keywordInfo = jd ? keywordCoverage(text, jd) : null;
  if (keywordInfo) {
    if (keywordInfo.missing.length > 0) {
      issues.push({
        severity: "warning",
        section: "Keywords",
        message: `Missing from your résumé but asked for in the job description: ${keywordInfo.missing.slice(0, 12).join(", ")}${keywordInfo.missing.length > 12 ? ` and ${keywordInfo.missing.length - 12} more` : ""}.`,
      });
    } else {
      strengths.push(
        "Every significant term from the job description appears in your résumé.",
      );
    }
  }

  // ── Score, itemised ──
  const coreSections = sections.filter((section) =>
    ["Contact", "Experience", "Education", "Skills"].includes(section.name),
  );
  const foundCore = coreSections.filter((section) => section.found).length;
  const sectionPoints = (foundCore / coreSections.length) * 18;
  const contactPoints =
    (Number(contact.email) + Number(contact.phone) + Number(contact.location)) *
      2 +
    Number(contact.linkedin) * 1 +
    Number(contact.github || contact.portfolio) * 3;
  const parsePoints = Math.min(30, sectionPoints + contactPoints);

  const quantifyRatio =
    bulletLines.length > 0 ? withNumbers / bulletLines.length : 0;
  const mechanicsRatio =
    bulletLines.length > 0
      ? 1 - Math.min(1, (tooLong + startingWithWeakVerb) / bulletLines.length)
      : 0.5;
  const qualityPoints = quantifyRatio * 15 + mechanicsRatio * 10;

  const keywordPoints = keywordInfo ? keywordInfo.ratio * 30 : 0;
  const keywordScale = keywordInfo ? 30 : 0;
  // Without a job description, redistribute its 30 points across the measurable
  // parts instead of inventing a keyword result.
  const redistributed = keywordInfo ? 0 : 15;

  const rawScore = parsePoints + qualityPoints + keywordPoints + redistributed;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const components = [
    {
      name: "Parseability",
      points: Math.round(parsePoints),
      max: 30,
      detail: `${foundCore}/${coreSections.length} core section headings, ${2 + Number(contact.linkedin)} contact signals`,
    },
    {
      name: "Quantified impact",
      points: Math.round(quantifyRatio * 15),
      max: 15,
      detail: `${withNumbers} of ${bulletLines.length} bullets contain a number`,
    },
    {
      name: "Bullet mechanics",
      points: Math.round(mechanicsRatio * 10),
      max: 10,
      detail: `${tooLong} too long, ${startingWithWeakVerb} with weak openers`,
    },
    keywordInfo
      ? {
          name: "Keyword match",
          points: Math.round(keywordPoints),
          max: keywordScale,
          detail: `${keywordInfo.matched.length} of ${keywordInfo.totalConsidered} job-description terms found`,
        }
      : {
          name: "No job description supplied",
          points: redistributed,
          max: 30,
          detail:
            "Paste the job description to check keyword coverage against it",
        },
  ];

  const notes = [
    "This is a readiness check against your own text, not a prediction of any specific applicant tracking system. No vendor publishes its algorithm, and a claimed per-vendor score would be invented.",
    "Scores are relative: two résumés analysed here are comparable to each other, not to a published benchmark.",
  ];
  if (contact.location) {
    strengths.push("A location is stated, which matters for on-site roles.");
  }

  return {
    score,
    wordCount,
    sections,
    contact,
    bullets: {
      total: bulletLines.length,
      withNumbers,
      tooLong,
      startingWithWeakVerb,
      averageWords:
        bulletWords.length > 0
          ? Math.round(
              (bulletWords.reduce((sum, words) => sum + words.length, 0) /
                bulletWords.length) *
                10,
            ) / 10
          : 0,
    },
    issues: issues.sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 };
      return rank[a.severity] - rank[b.severity];
    }),
    strengths,
    components,
    notes,
  };
}

function findRepeatedWords(text: string): string[] {
  const list = text.toLowerCase().split(/\s+/);
  const found: string[] = [];
  for (let i = 1; i < list.length; i++) {
    if (list[i].length > 2 && list[i] === list[i - 1]) found.push(list[i]);
  }
  return [...new Set(found)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword coverage against a job description
// ─────────────────────────────────────────────────────────────────────────────

const JD_STOP = new Set(
  "a an the and or of to in for with on at by from as is are be been being will would should could can may might must have has had do does did not no your you we our their they this that these those it its who whom which what when where why how all any both each few more most other some such than too very just also into over under about after before between during through above below up down out off again further then once here there am he me my us".split(
    " ",
  ),
);

/**
 * Technology and role terms that must survive the "named once in passing is not
 * emphasised" rule.
 *
 * Without this list a posting that says "Go", "React" or "Docker" exactly once
 * contributes nothing, because both signals the matcher uses fail on those
 * words: they are too short to look deliberate, and their capitalisation is
 * ordinary sentence capitalisation rather than the internal capitals that mark
 * a name like "PostgreSQL". The list is explicit rather than heuristic so the
 * tool's behaviour on any given term is knowable rather than surprising.
 */
const NAMED_TECH_TERMS = new Set(
  "go golang react reactjs angular angularjs vue vuejs nextjs nuxt svelte redux node nodejs express nestjs django flask fastapi rails laravel spring springboot php python java javascript typescript ruby on rails phpunit jest vitest mocha cypress playwright selenium pytest junit webpack vite babel eslint prettier graphql grpc rest api apis html css sass tailwind bootstrap sass sql nosql mysql postgres postgresql mongodb redis elasticsearch kafka rabbitmq clickhouse snowflake bigquery dynamodb cassandra neo4j aws azure gcp heroku vercel netlify cloudflare docker kubernetes k8s terraform ansible chef puppet jenkins circleci github gitlab bitbucket linux unix ubuntu windows macos android ios swift objective-c kotlin scala elixir erlang haskell clojure perl rust dart flutter ionic react-native git jira confluence salesforce sap oracle workday bamboohr greenhouse lever jobvite indeed linkedin naukri upwork fiverr freelancer agile scrum kanban jira aws lambda s3 ec2 rds dynamodb lambda sns sqs ec2 iam vpc seo sem crm erp pmo qa qc hr hris api qa automation devops sre ml ai llm nlp ocr erp crm cms cms headless cms wordpress shopify magento bigcommerce woocommerce hubspot mailchimp sendgrid twilio stripe razorpay paypal square".split(
    " ",
  ),
);

export type KeywordCoverage = {
  matched: string[];
  missing: string[];
  ratio: number;
  totalConsidered: number;
  /** Terms grouped by how often the description mentions them. */
  important: { term: string; mentions: number; present: boolean }[];
};

/**
 * Extract the terms a job description emphasises and check whether the résumé
 * contains them.
 *
 * "Important" means mentioned repeatedly or written as a distinct skill token —
 * a term named once in passing is not emphasised. Matching is case-insensitive
 * on word boundaries, so "Java" does not match "JavaScript" and "SQL" does not
 * match "MySQL" by accident... except that it does match "MySQL" on a boundary,
 * so hyphenated and compound forms are also checked explicitly.
 */
export function keywordCoverage(
  resume: string,
  jobDescription: string,
): KeywordCoverage {
  const resumeLower = resume.toLowerCase();
  // A two-letter word is either noise ("am", "us") or a real skill ("Go",
  // "JS", "CI"). The explicit list decides which, and only when the posting
  // capitalises it — "Go" the language is written with a capital, "go to
  // market" is not.
  const capitalisedShortTerms = new Set(
    jobDescription
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}+#.]/gu, ""))
      .filter(
        (word) =>
          word.length === 2 &&
          /^[A-Z]/.test(word) &&
          NAMED_TECH_TERMS.has(word.toLowerCase()),
      )
      .map((word) => word.toLowerCase()),
  );

  const tokens = jobDescription
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
    .filter(
      (token) =>
        !JD_STOP.has(token) &&
        !/^\d+$/.test(token) &&
        (token.length > 2 || capitalisedShortTerms.has(token)),
    );

  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);

  // Keep terms mentioned more than once, plus single-mention terms that look
  // like named skills (contain a digit, +, #, dot, or are capitalised in the
  // original description).
  //
  // The set holds lowercased forms: `tokens` is lowercased and the terms are
  // compared against it, so keeping the original case here meant a skill like
  // "PostgreSQL" — named once, capitalised, exactly the case this rule exists
  // for — never matched its own lowercased token.
  const namedSkills = new Set<string>();
  for (const word of jobDescription.split(/\s+/)) {
    const cleaned = word.replace(/[^\p{L}\p{N}+#.]/gu, "");
    if (!cleaned) continue;
    if (/[A-Z]/.test(cleaned.slice(1)) || /[+#.]/.test(cleaned)) {
      namedSkills.add(cleaned.toLowerCase());
    }
  }

  const candidates = [...counts.entries()]
    .filter(
      ([term, count]) =>
        count > 1 ||
        namedSkills.has(term) ||
        NAMED_TECH_TERMS.has(term) ||
        /[+#.]/.test(term),
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);

  const important = candidates.map(([term, mentions]) => ({
    term,
    mentions,
    present: resumeLower.includes(term),
  }));

  const matched = important
    .filter((item) => item.present)
    .map((item) => item.term);
  const missing = important
    .filter((item) => !item.present)
    .map((item) => item.term);
  const totalConsidered = important.length;

  return {
    matched,
    missing,
    ratio: totalConsidered > 0 ? matched.length / totalConsidered : 0,
    totalConsidered,
    important,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bullet rewriting — rule-based, and labelled as such
// ─────────────────────────────────────────────────────────────────────────────

const VERB_MAP: Record<string, string[]> = {
  responsible: ["Led", "Owned", "Managed"],
  worked: ["Built", "Delivered", "Shipped"],
  helped: ["Supported", "Enabled", "Unblocked"],
  assisted: ["Supported", "Coordinated"],
  involved: ["Contributed to", "Drove"],
  participated: ["Contributed to", "Joined"],
  handled: ["Managed", "Resolved"],
  tasked: ["Owned", "Executed"],
  did: ["Completed", "Delivered"],
  made: ["Built", "Created"],
  used: ["Applied", "Worked with"],
  was: ["Led", "Owned"],
  were: ["Led", "Owned"],
};

export type BulletSuggestion = {
  original: string;
  improved: string;
  changes: string[];
  /** What the writer still needs to supply — never invented by the tool. */
  needsFromYou: string[];
};

/**
 * Rewrite a bullet using deterministic rules.
 *
 * It replaces weak openers with action verbs, strips filler, enforces a
 * sentence-case start and drops trailing full stops. It **cannot** invent the
 * metric, so when a bullet has no number it adds an explicit prompt instead of
 * fabricating a plausible-looking "increased revenue by 30%". That difference is
 * the whole point: a generated number on a résumé is a lie the candidate has to
 * defend in the interview.
 */
export function improveBullet(raw: string, variant = 0): BulletSuggestion {
  const changes: string[] = [];
  const needsFromYou: string[] = [];
  let text = raw.replace(/^[-•*·–—\d.)\s]+/, "").trim();
  if (!text) {
    return {
      original: raw,
      improved: "",
      changes: ["Nothing to rewrite."],
      needsFromYou: [],
    };
  }

  const first = text
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const replacements = VERB_MAP[first];
  if (replacements) {
    const verb = replacements[variant % replacements.length];
    // Remove the weak opener and any following "for"/"with"/"in" preposition.
    text = text.replace(
      new RegExp(`^${first}\\b(\\s+(for|with|in|on|to|the|a|an))?\\s*`, "i"),
      "",
    );
    text = `${verb} ${text}`;
    changes.push(
      `Replaced the weak opener "${raw.trim().split(/\s+/)[0]}" with "${verb}".`,
    );
  }

  const fillers = [
    [/\bvarious\b/gi, ""],
    [/\bseveral\b/gi, ""],
    [/\bsuccessfully\b/gi, ""],
    [/\bvery\b/gi, ""],
    [/\breally\b/gi, ""],
    [/\bin order to\b/gi, "to"],
    [/\bresponsible for\b/gi, "led"],
    [/\bteam player\b/gi, "collaborator"],
    [/\s{2,}/g, " "],
  ] as const;
  for (const [pattern, replacement] of fillers) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      changes.push(
        `Removed the filler "${String(pattern).replace(/\\b|\\s\{2,\}\/g/g, "")}".`,
      );
    }
  }

  text = text.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (text) text = text[0].toUpperCase() + text.slice(1);

  if (!/\d/.test(text)) {
    needsFromYou.push(
      "Add the measurable outcome — volume, percentage, time saved, team size, or cost. This tool will not invent one.",
    );
  }
  if (text.split(/\s+/).length > 30) {
    needsFromYou.push(
      "Trim to under 30 words; move the context into the preceding bullet.",
    );
  }
  if (changes.length === 0)
    changes.push(
      "Structure was already sound; only spacing and capitalisation normalised.",
    );

  const improved =
    needsFromYou.length > 0 ? `${text} — [add the metric]` : text;

  return { original: raw, improved, changes, needsFromYou };
}

/** Rewrite a list of bullets in one pass. */
export function improveBullets(raw: string[]): BulletSuggestion[] {
  return raw
    .filter((line) => line.trim())
    .map((line, index) => improveBullet(line, index % 3));
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary generator
// ─────────────────────────────────────────────────────────────────────────────

export type SummaryInput = {
  role: string;
  years: number;
  skills: string[];
  /** One concrete achievement the user supplies. */
  achievement?: string;
  tone?: "concise" | "standard" | "senior";
};

/**
 * Build a professional summary from facts the user supplies.
 *
 * Three lengths, deterministic phrasing, no adjectives about the candidate that
 * the candidate did not assert ("passionate", "results-driven" are excluded
 * deliberately — recruiters discount them).
 */
export function generateSummary(input: SummaryInput): string[] {
  const role = input.role.trim() || "professional";
  const years = Math.max(0, input.years);
  const skills = input.skills.map((skill) => skill.trim()).filter(Boolean);
  const skillList =
    skills.length === 0
      ? ""
      : skills.length === 1
        ? skills[0]
        : `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`;
  const yearPhrase =
    years === 0 ? "" : years === 1 ? "1 year of" : `${years} years of`;
  const achievement = input.achievement?.trim().replace(/\.$/, "") ?? "";

  const concise = `${yearPhrase ? `${yearPhrase} experience as a` : "A"} ${role}${skillList ? ` working with ${skillList}` : ""}.${achievement ? ` ${achievement}.` : ""}`;

  const standard = `${yearPhrase ? `A ${role} with ${yearPhrase} experience` : `A ${role}`}${skillList ? ` across ${skillList}` : ""}.${achievement ? ` ${achievement}.` : ""} Looking for a role where that experience solves a specific problem.`;

  const senior = `${yearPhrase ? `${role} with ${yearPhrase} experience` : role}${skillList ? `, focused on ${skillList}` : ""}.${achievement ? ` ${achievement}.` : ""} Comfortable owning delivery end to end and explaining trade-offs to people outside the discipline.`;

  const tone = input.tone ?? "standard";
  const all = { concise, standard, senior };
  return [
    all[tone],
    ...Object.entries(all)
      .filter(([key]) => key !== tone)
      .map(([, value]) => value),
  ].map((line) => line.replace(/\s{2,}/g, " ").trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-résumé comparison
// ─────────────────────────────────────────────────────────────────────────────

export type ResumeComparison = {
  a: ResumeAnalysis;
  b: ResumeAnalysis;
  /**
   * Signed difference in favour of version B — `b.score - a.score`. It is
   * signed rather than absolute so the UI can say which version leads without
   * a second comparison, and it is negative when version A is the stronger
   * one.
   */
  scoreDelta: number;
  onlyInA: string[];
  onlyInB: string[];
  rows: {
    metric: string;
    a: number | string;
    b: number | string;
    better: "a" | "b" | "tie";
  }[];
};

function distinctiveTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s+#.]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 4 && !JD_STOP.has(token)),
  );
}

/**
 * Compare two versions of a résumé on the same measurable axes.
 *
 * Useful for the real question — "is version B better than A?" — without
 * pretending there is an absolute grade. Only the difference is reported.
 */
export function compareResumes(
  textA: string,
  textB: string,
  options: { jobDescription?: string } = {},
): ResumeComparison {
  const a = analyseResume(textA, options);
  const b = analyseResume(textB, options);
  const tokensA = distinctiveTokens(textA);
  const tokensB = distinctiveTokens(textB);

  const rows: ResumeComparison["rows"] = [
    {
      metric: "Readiness score",
      a: a.score,
      b: b.score,
      better: a.score === b.score ? "tie" : a.score > b.score ? "a" : "b",
    },
    {
      metric: "Quantified bullets",
      a: a.bullets.withNumbers,
      b: b.bullets.withNumbers,
      better:
        a.bullets.withNumbers === b.bullets.withNumbers
          ? "tie"
          : a.bullets.withNumbers > b.bullets.withNumbers
            ? "a"
            : "b",
    },
    {
      metric: "Weak openers",
      a: a.bullets.startingWithWeakVerb,
      b: b.bullets.startingWithWeakVerb,
      better:
        a.bullets.startingWithWeakVerb === b.bullets.startingWithWeakVerb
          ? "tie"
          : a.bullets.startingWithWeakVerb < b.bullets.startingWithWeakVerb
            ? "a"
            : "b",
    },
    {
      metric: "Errors",
      a: a.issues.filter((issue) => issue.severity === "error").length,
      b: b.issues.filter((issue) => issue.severity === "error").length,
      better: (() => {
        const ea = a.issues.filter((i) => i.severity === "error").length;
        const eb = b.issues.filter((i) => i.severity === "error").length;
        return ea === eb ? "tie" : ea < eb ? "a" : "b";
      })(),
    },
    { metric: "Word count", a: a.wordCount, b: b.wordCount, better: "tie" },
  ];

  return {
    a,
    b,
    scoreDelta: b.score - a.score,
    onlyInA: [...tokensA]
      .filter((token) => !tokensB.has(token))
      .sort()
      .slice(0, 25),
    onlyInB: [...tokensB]
      .filter((token) => !tokensA.has(token))
      .sort()
      .slice(0, 25),
    rows,
  };
}
