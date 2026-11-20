/**
 * Career document text generation: cover letters, follow-ups, LinkedIn
 * sections, and interview preparation.
 *
 * Same rule as everywhere else in this category: the sentences are assembled
 * from the candidate's own facts. The tool contributes structure, ordering and
 * the conventions that British/Indian professional writing follows — it does not
 * contribute claims about the candidate.
 *
 * Notably absent: any "AI-powered" framing. No language model is configured for
 * this site, so the honest description is "assembles a letter from your inputs",
 * which is exactly what the code does.
 */

export type CoverLetterInput = {
  candidateName: string;
  candidateContact?: string;
  role: string;
  company: string;
  hiringManager?: string;
  /** Why this company specifically — the sentence only a human can write. */
  whyCompany: string;
  /** The strongest relevant achievement, with a number if possible. */
  achievement: string;
  /** Two or three skills the job asks for that the candidate has. */
  skills: string[];
  /** How the candidate found the role, when it matters. */
  source?: string;
  years?: number;
  tone?: "direct" | "warm";
};

export type CoverLetterResult = {
  text: string;
  missing: string[];
  wordCount: number;
  notes: string[];
};

/**
 * Structure a one-page cover letter.
 *
 * Four paragraphs, which is the shape that survives being skimmed: what you are
 * applying for, the evidence, why this company, and the close. The evidence
 * paragraph uses the achievement the candidate supplies; if they have not
 * supplied one, the letter says so with a placeholder instead of padding it with
 * adjectives.
 */
export function buildCoverLetter(input: CoverLetterInput): CoverLetterResult {
  const missing: string[] = [];
  const need = (value: string, label: string): string => {
    if (!value.trim()) {
      missing.push(label);
      return `[${label}]`;
    }
    return value.trim().replace(/\s+$/, "");
  };

  const name = need(input.candidateName, "your name");
  const role = need(input.role, "target role");
  const company = need(input.company, "company name");
  const why = need(input.whyCompany, "why this company specifically");
  const achievement = need(
    input.achievement,
    "one quantified achievement from your experience",
  );
  const skills = input.skills.map((skill) => skill.trim()).filter(Boolean);
  const greeting = input.hiringManager?.trim()
    ? `Dear ${input.hiringManager.trim()},`
    : `Dear Hiring Manager,`;
  const years =
    input.years && input.years > 0
      ? `${input.years} year${input.years === 1 ? "" : "s"}`
      : "";
  const source = input.source?.trim();

  const skillPhrase =
    skills.length === 0
      ? "[the two or three skills the role asks for that you actually have]"
      : skills.length === 1
        ? skills[0]
        : `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`;

  if (skills.length === 0) missing.push("two or three relevant skills");

  const opener =
    input.tone === "warm"
      ? `I am writing to apply for the ${role} role at ${company}${source ? `, which I found through ${source}` : ""}.`
      : `I am applying for the ${role} role at ${company}${source ? ` (via ${source})` : ""}.`;

  const evidence =
    years.length > 0
      ? `I have ${years} of experience, most of it directly relevant to this role. ${achievement}`
      : `The most relevant thing I can show you is this: ${achievement}`;

  const fit = `The role asks for ${skillPhrase}, and that is where my day-to-day work sits. ${"[One sentence on how you used them — specific enough that a reader could ask a follow-up question.]"}`;

  const close =
    input.tone === "warm"
      ? `I would welcome the chance to talk about the role. Thank you for your time.`
      : `I would like to discuss how this maps to what you need. I am available at your convenience.`;

  const lines = [
    name,
    input.candidateContact?.trim() ?? "",
    "",
    greeting,
    "",
    opener,
    "",
    evidence,
    "",
    fit,
    "",
    `${why}`,
    "",
    close,
    "",
    "Sincerely,",
    name,
  ].filter((line, index) => line !== "" || index < 3);

  const text = lines.join("\n");
  const notes = [
    "Every sentence above is built from what you entered. Nothing about your experience is generated — that is deliberate, because an invented claim has to be defended in the interview.",
    missing.length === 0
      ? "All required facts are present."
      : "Placeholders remain. Replace each [bracketed] item before sending.",
  ];

  return {
    text,
    missing: [...new Set(missing)],
    wordCount: text.split(/\s+/).filter(Boolean).length,
    notes,
  };
}

/**
 * Follow-up message after an interview or a silent application.
 *
 * Three templates with different subtexts: after an interview (restate, add
 * something, ask about next steps), after no response (brief, non-accusatory,
 * easy to answer), and after a final round (gratitude plus availability).
 */
export function buildFollowUp(input: {
  kind: "after-interview" | "no-response" | "after-final";
  candidateName: string;
  interviewerName?: string;
  company: string;
  role: string;
  /** The specific detail worth referencing. */
  detail?: string;
  daysSince: number;
}): { subject: string; body: string } {
  const interviewer = input.interviewerName?.trim() || "Hiring Team";
  const detail = input.detail?.trim();
  const name = input.candidateName.trim() || "[your name]";
  const role = input.role.trim() || "[role]";
  const company = input.company.trim() || "[company]";

  if (input.kind === "no-response") {
    return {
      subject: `Following up: ${role} application`,
      body: [
        `Dear ${interviewer},`,
        "",
        `I applied for the ${role} role at ${company} ${input.daysSince} days ago and wanted to check whether my application is still under consideration.`,
        "",
        detail
          ? `Since applying I have ${detail} — sharing in case it is useful to the panel.`
          : `If the role has closed or moved on, a one-line reply is enough and I will not follow up again.`,
        "",
        `Thank you,`,
        name,
      ].join("\n"),
    };
  }

  if (input.kind === "after-final") {
    return {
      subject: `Thank you — ${role} final round`,
      body: [
        `Dear ${interviewer},`,
        "",
        `Thank you for the final conversation about the ${role} role at ${company}. ${detail ? `${detail}` : "The discussion confirmed what I would find interesting about the work, and I would be glad to take it on."}`,
        "",
        `Please let me know if anything further is useful before your decision. I remain available on short notice.`,
        "",
        `Best regards,`,
        name,
      ].join("\n"),
    };
  }

  return {
    subject: `Thank you — ${role} interview`,
    body: [
      `Dear ${interviewer},`,
      "",
      `Thank you for the conversation about the ${role} role at ${company}. ${detail ? `${detail}` : "[Add the one specific thing you discussed that you would want to be remembered for.]"}`,
      "",
      `I would be glad to go further if it is useful — and I would appreciate hearing what the next step looks like and when you expect to decide.`,
      "",
      `Best regards,`,
      name,
    ].join("\n"),
  };
}

/**
 * STAR answers, assembled from the candidate's own situation.
 *
 * The prompt structure is the tool's contribution; the content is theirs. Each
 * slot is a question the candidate cannot answer with adjectives, which is the
 * point of STAR in the first place.
 */
export function buildStarAnswer(input: {
  situation: string;
  task: string;
  action: string;
  result: string;
  competency?: string;
}): { text: string; issues: string[]; wordCount: number } {
  const issues: string[] = [];
  const parts: [string, string][] = [
    ["Situation", input.situation],
    ["Task", input.task],
    ["Action", input.action],
    ["Result", input.result],
  ];

  for (const [label, value] of parts) {
    if (!value.trim()) issues.push(`${label} is empty.`);
  }
  if (input.action.trim() && input.action.split(/\s+/).length < 12) {
    issues.push(
      "The Action block is short. This is the part interviewers want: what you specifically did.",
    );
  }
  if (input.result.trim() && !/\d/.test(input.result)) {
    issues.push(
      "The Result has no number. Quantify it — percentage, time, money, count — even approximately, and say it is approximate.",
    );
  }
  if (input.action.trim() && /\b(we|the team)\b/i.test(input.action)) {
    issues.push(
      `The Action says "we" or "the team". Interviewers are assessing you; state your part and mention the team's separately.`,
    );
  }

  const text = [
    input.competency ? `Competency: ${input.competency}` : "",
    "",
    `SITUATION — ${input.situation.trim() || "[where you were, what was happening, two sentences maximum]"}`,
    "",
    `TASK — ${input.task.trim() || "[what you specifically were responsible for]"}`,
    "",
    `ACTION — ${input.action.trim() || "[what you did, in order, first person]"}`,
    "",
    `RESULT — ${input.result.trim() || "[what changed, with a number]"}`,
    "",
    "Delivery: about 90 seconds. Lead with the result if the interviewer looks impatient, then earn it with the action.",
  ]
    .filter((line, index) => line !== "" || index > 0)
    .join("\n");

  return { text, issues, wordCount: text.split(/\s+/).filter(Boolean).length };
}

const ACTION_VERBS: Record<string, string[]> = {
  engineering: [
    "Built",
    "Shipped",
    "Migrated",
    "Optimised",
    "Debugged",
    "Automated",
    "Refactored",
    "Scaled",
  ],
  product: [
    "Launched",
    "Defined",
    "Prioritised",
    "Validated",
    "Scoped",
    "Drove",
  ],
  sales: ["Closed", "Grew", "Exceeded", "Negotiated", "Prospected", "Retained"],
  marketing: ["Ran", "Grew", "Optimised", "Positioned", "Produced"],
  operations: [
    "Streamlined",
    "Reduced",
    "Coordinated",
    "Standardised",
    "Recovered",
  ],
  hr: ["Hired", "Designed", "Resolved", "Standardised", "Onboarded"],
  finance: ["Reconciled", "Modelled", "Cut", "Audited", "Forecast"],
  design: ["Designed", "Prototyped", "Tested", "Simplified", "Redesigned"],
  support: ["Resolved", "Reduced", "Documented", "Trained", "Escalated"],
  generic: ["Led", "Built", "Delivered", "Improved", "Reduced", "Launched"],
};

/** Strong action verbs by function — the ones that survive a skim. */
export function actionVerbs(area: string): string[] {
  return ACTION_VERBS[area.toLowerCase()] ?? ACTION_VERBS.generic;
}

/**
 * Achievement bank: converts a fact pattern into bullet phrasing.
 *
 * The candidate supplies action, object and outcome; the tool supplies the
 * verb and the order. No metric is generated.
 */
export function buildBullet(input: {
  verb?: string;
  action: string;
  object: string;
  outcome?: string;
  metric?: string;
}): { bullet: string; complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.action.trim()) missing.push("the action you took");
  if (!input.object.trim()) missing.push("what you acted on");
  if (!input.metric?.trim() && !input.outcome?.trim())
    missing.push("the outcome or metric");

  const verb = (input.verb?.trim() || "Led").replace(/\.$/, "");
  const object = input.object.trim() || "[what you worked on]";
  const action = input.action.trim() || "[what you did]";
  const tail = input.metric?.trim()
    ? `, ${input.outcome?.trim() || "resulting in"} ${input.metric.trim()}`
    : input.outcome?.trim()
      ? `, ${input.outcome.trim()}`
      : "";

  return {
    bullet: `${verb} ${action} ${object}${tail}`.replace(/\s+/g, " ").trim(),
    complete: missing.length === 0,
    missing,
  };
}

/** A LinkedIn About section from the candidate's own summary facts. */
export function buildLinkedInAbout(input: {
  role: string;
  years: number;
  focus: string[];
  achievement?: string;
  lookingFor?: string;
  contact?: string;
}): { text: string; missing: string[] } {
  const missing: string[] = [];
  const role = input.role.trim() || (missing.push("your role"), "[your role]");
  const focus = input.focus.map((item) => item.trim()).filter(Boolean);
  if (focus.length === 0) missing.push("two or three areas of focus");

  const paragraphs = [
    input.years > 0
      ? `${role} with ${input.years} year${input.years === 1 ? "" : "s"} of experience${focus.length ? ` across ${focus.slice(0, -1).join(", ")}${focus.length > 1 ? ` and ${focus[focus.length - 1]}` : focus[0]}` : ""}.`
      : `${role}${focus.length ? ` focused on ${focus.join(", ")}` : ""}.`,
    input.achievement?.trim() ||
      "[One concrete thing you delivered, with a number. This is the only sentence recruiters read twice.]",
    input.lookingFor?.trim() ||
      "[What you are looking for next — role type, problem space, or constraint. Being specific filters out the wrong conversations.]",
    input.contact?.trim() ? `Reach me at ${input.contact.trim()}.` : "",
  ].filter(Boolean);

  return {
    text: paragraphs.join("\n\n"),
    missing: [...new Set(missing)],
  };
}

/**
 * Notice-period and availability phrasing for applications.
 *
 * Small thing, frequently got wrong: stating "immediate" when you have a
 * 90-day notice period wastes everyone's time. This generates the sentence from
 * the real terms, including buyout, so the statement is accurate.
 */
export function availabilityStatement(input: {
  noticeDays: number;
  servingOrBuyout: "notice" | "buyout" | "immediate";
  negotiable?: boolean;
}): string {
  if (input.servingOrBuyout === "immediate") {
    return "I am available to start immediately.";
  }
  if (input.servingOrBuyout === "buyout") {
    return `My notice period is ${input.noticeDays} days, which I can buy out, so I could join in around ${Math.max(1, Math.round(input.noticeDays / 30))} month${Math.round(input.noticeDays / 30) === 1 ? "" : "s"} subject to my current employer releasing me.`;
  }
  return `My notice period is ${input.noticeDays} days${input.negotiable ? ", which is negotiable" : ""}; I would serve it in full before joining.`;
}

/**
 * Interview preparation checklist, generated from the role and the facts given.
 *
 * Not "here are 50 questions" — a short, ordered plan with the research a
 * candidate actually needs to do and the questions they should ask.
 */
export function buildInterviewPrep(input: {
  role: string;
  company: string;
  stage: "screening" | "technical" | "manager" | "final";
  /** Topics the candidate is least confident about, from their own assessment. */
  weakAreas?: string[];
}): { plan: { heading: string; items: string[] }[]; notes: string[] } {
  const role = input.role.trim() || "the role";
  const company = input.company.trim() || "the company";

  const stageFocus: Record<typeof input.stage, string[]> = {
    screening: [
      "Prepare a 60-second version of your background that ends at why this role, not at your whole history.",
      "Be ready for the money question. Have a range and the total compensation number you would accept.",
      "Confirm the practical details: notice period, location, work authorisation, start date.",
    ],
    technical: [
      "Re-read the last three things you built and be able to explain one trade-off in each.",
      "Expect to be asked what you would do differently. Have a real answer prepared.",
      "Ask what the codebase or system looks like today before you ask about process.",
    ],
    manager: [
      "Prepare one example of a disagreement handled well and one of a failure owned.",
      "Know what you want from a manager, concretely enough to say it out loud.",
      "Ask how success is measured in the first 90 days.",
    ],
    final: [
      "Prepare questions that only someone serious would ask: about strategy, constraints, or the team's biggest open problem.",
      "Reconfirm compensation expectations and the start date so nothing is a surprise.",
      "Be ready to say yes or no within the timeline they state.",
    ],
  };

  const plan = [
    {
      heading: `Research ${company}`,
      items: [
        "What the company sells, to whom, and how it makes money.",
        "Something that changed in the last six months — a launch, a hire, a shift in positioning.",
        "One question that shows you read past the homepage.",
      ],
    },
    {
      heading: `Prepare for a ${input.stage} interview for ${role}`,
      items: stageFocus[input.stage],
    },
    {
      heading: "Ask them",
      items: [
        "What does the person in this role need to get right in the first 90 days?",
        "What has made previous people in this role struggle?",
        "How are decisions made when the team disagrees?",
        "What would make you not hire me — is there anything I can address now?",
      ],
    },
  ];

  if (input.weakAreas && input.weakAreas.length > 0) {
    plan.push({
      heading: "Your stated weak areas",
      items: input.weakAreas.map(
        (area) =>
          `${area}: prepare one honest example of that skill, and one thing you are doing to improve it. Do not pretend.`,
      ),
    });
  }

  return {
    plan,
    notes: [
      "This is a structure, not a question dump. Two rehearsed stories beat twenty half-remembered ones.",
      "Never claim an experience you do not have. Interviewers check, and a false claim is grounds for withdrawal at offer stage.",
    ],
  };
}
