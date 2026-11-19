import { describe, expect, it } from "vitest";
import {
  analyseResume,
  compareResumes,
  generateSummary,
  improveBullet,
  improveBullets,
  keywordCoverage,
} from "@/lib/tools/career/resume";
import {
  availabilityStatement,
  buildCoverLetter,
  buildFollowUp,
  buildInterviewPrep,
  buildLinkedInAbout,
  buildStarAnswer,
} from "@/lib/tools/career/letters";

/** A résumé with enough structure for the analyser to find its sections. */
const RESUME = `Ravi Kumar
ravi@example.com | +91 98765 43210 | Bengaluru
linkedin.com/in/ravikumar

Summary
Backend engineer with 6 years building payment services.

Experience
Acme Pvt Ltd — Senior Engineer, 2022 to 2026
- Cut checkout latency from 900ms to 210ms by replacing N+1 queries
- Led the migration of 40 services to Kubernetes
- Owned the on-call rota for the payments platform

Skills
Go, PostgreSQL, Kubernetes, AWS, Terraform

Education
B.E. Computer Science, 2016
`;

describe("analyseResume", () => {
  it("scores between 0 and 100", () => {
    const result = analyseResume(RESUME);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("finds the sections a résumé normally has", () => {
    const result = analyseResume(RESUME);
    const found = result.sections.filter((section) => section.found);
    expect(found.length).toBeGreaterThan(2);
  });

  it("finds the contact details", () => {
    const result = analyseResume(RESUME);
    expect(result.contact.email).toBe(true);
    expect(result.contact.phone).toBe(true);
    expect(result.contact.linkedin).toBe(true);
  });

  it("counts the bullets and how many carry a number", () => {
    const result = analyseResume(RESUME);
    expect(result.bullets.total).toBeGreaterThan(0);
    expect(result.bullets.withNumbers).toBeGreaterThan(0);
  });

  it("scores a strong résumé above a weak one", () => {
    const weak = "I am a hard worker. I am passionate. I am a team player.";
    expect(analyseResume(RESUME).score).toBeGreaterThan(
      analyseResume(weak).score,
    );
  });

  it("does not crash on an empty résumé", () => {
    const result = analyseResume("");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.wordCount).toBe(0);
  });

  it("reports issues rather than hiding them", () => {
    const result = analyseResume("Just one line of text.");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("uses the job description when one is given", () => {
    const withJd = analyseResume(RESUME, {
      jobDescription: "Go Kubernetes Terraform PostgreSQL",
    });
    expect(withJd.score).toBeGreaterThanOrEqual(0);
  });
});

describe("keywordCoverage", () => {
  it("finds the terms the résumé already uses", () => {
    const result = keywordCoverage(
      "Experienced with Go and Kubernetes and PostgreSQL.",
      "We need Go, Kubernetes and PostgreSQL experience.",
    );
    expect(result.matched).toContain("kubernetes");
    expect(result.matched).toContain("postgresql");
    expect(result.ratio).toBeGreaterThan(0.5);
  });

  it("lists the terms the résumé is missing", () => {
    const result = keywordCoverage(
      "Experienced with Go.",
      "We need Go and Terraform and Kubernetes.",
    );
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing).toContain("kubernetes");
  });

  it("keeps a single-mention skill written with an internal capital", () => {
    const result = keywordCoverage(
      "I use PostgreSQL daily.",
      "The team needs PostgreSQL experience.",
    );
    expect(result.totalConsidered).toBeGreaterThan(0);
    expect(result.matched).toContain("postgresql");
  });

  it("keeps a single-mention named technology", () => {
    const result = keywordCoverage(
      "I write React every day.",
      "The team needs React and Docker.",
    );
    expect(result.matched).toContain("react");
    expect(result.missing).toContain("docker");
  });

  it("ignores the noise words in a posting", () => {
    const result = keywordCoverage("Go developer", "the and for with our");
    expect(result.totalConsidered).toBe(0);
  });

  it("does not treat a lowercase English word as a skill", () => {
    const result = keywordCoverage("A developer", "We need someone to go fast");
    expect(result.matched).not.toContain("go");
    expect(result.missing).not.toContain("go");
  });

  it("never reports a ratio outside 0–1", () => {
    const result = keywordCoverage("Go", "Go Kubernetes Terraform");
    expect(result.ratio).toBeGreaterThanOrEqual(0);
    expect(result.ratio).toBeLessThanOrEqual(1);
  });

  it("sorts the terms by how often the posting mentions them", () => {
    const result = keywordCoverage(
      "Go Kubernetes",
      "Go Go Go Kubernetes Terraform",
    );
    expect(result.important[0].term).toBe("go");
    expect(result.important[0].mentions).toBeGreaterThanOrEqual(
      result.important[result.important.length - 1].mentions,
    );
  });
});

describe("improveBullet", () => {
  it("replaces a weak opener with an action verb", () => {
    const result = improveBullet("Responsible for managing deployments");
    expect(result.improved.length).toBeGreaterThan(0);
    expect(result.improved.toLowerCase()).not.toContain("responsible for");
  });

  it("never invents a number that was not there", () => {
    const result = improveBullet("Helped the team ship faster");
    expect(result.improved).not.toMatch(/\d+%|\d+ ?x|\$\d/);
    expect(result.needsFromYou.length).toBeGreaterThan(0);
  });

  it("keeps a number that was already there", () => {
    const result = improveBullet("Reduced latency by 40% across the fleet");
    expect(result.improved).toContain("40%");
  });

  it("says what the writer still has to supply", () => {
    const result = improveBullet("Improved application performance");
    expect(result.needsFromYou.length).toBeGreaterThan(0);
  });

  it("handles an empty bullet without throwing", () => {
    const result = improveBullet("");
    expect(result.improved).toBe("");
  });

  it("improves a list of bullets", () => {
    const results = improveBullets([
      "Responsible for deployments",
      "Reduced latency by 40%",
      "",
    ]);
    expect(results.length).toBe(2);
  });
});

describe("generateSummary", () => {
  const input = {
    role: "Backend Engineer",
    years: 6,
    skills: ["Go", "PostgreSQL", "Kubernetes"],
    achievement: "Cut checkout latency from 900ms to 210ms",
  };

  it("produces one draft per length", () => {
    expect(generateSummary(input).length).toBe(3);
  });

  it("uses only the facts supplied", () => {
    const drafts = generateSummary(input);
    for (const draft of drafts) {
      expect(draft).toContain("Backend Engineer");
      expect(draft).toContain("Go");
      expect(draft).toContain("Cut checkout latency from 900ms to 210ms");
    }
  });

  it("does not claim the candidate is passionate or results-driven", () => {
    for (const draft of generateSummary(input)) {
      expect(draft.toLowerCase()).not.toContain("passionate");
      expect(draft.toLowerCase()).not.toContain("results-driven");
    }
  });

  it("does not invent a degree or an employer", () => {
    for (const draft of generateSummary(input)) {
      expect(draft).not.toMatch(/\b(university|college|b\.?e\.?c|m\.?tech)\b/i);
      expect(draft).not.toMatch(/\bat [A-Z][a-z]+ Ltd\b/);
    }
  });

  it("still produces a draft when no achievement is given", () => {
    const drafts = generateSummary({ ...input, achievement: undefined });
    expect(drafts.length).toBe(3);
  });
});

describe("compareResumes", () => {
  it("scores both versions and names the better one", () => {
    const result = compareResumes(RESUME, "I am a hard worker.");
    expect(result.a.score).toBeGreaterThan(result.b.score);
    // scoreDelta is signed in favour of version B, so a stronger A is negative.
    expect(result.scoreDelta).toBe(result.b.score - result.a.score);
    expect(result.scoreDelta).toBeLessThan(0);
  });

  it("reports what changed between the two", () => {
    const result = compareResumes(RESUME, "Backend engineer with Go.");
    expect(result.onlyInA.length + result.onlyInB.length).toBeGreaterThan(0);
  });

  it("marks the better side on every row", () => {
    const result = compareResumes(RESUME, "I am a hard worker.");
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(["a", "b", "tie"]).toContain(row.better);
    }
  });
});

describe("letters", () => {
  it("builds a cover letter from the facts given", () => {
    const result = buildCoverLetter({
      candidateName: "Ravi Kumar",
      role: "Backend Engineer",
      company: "Acme",
      hiringManager: "Priya",
      whyCompany: "Acme keeps its payments platform in-house.",
      achievement: "Cut checkout latency from 900ms to 210ms",
      skills: ["Go", "PostgreSQL"],
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("Backend Engineer");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("never invents an achievement in a cover letter", () => {
    const result = buildCoverLetter({
      candidateName: "Ravi Kumar",
      role: "Backend Engineer",
      company: "Acme",
      hiringManager: "Priya",
      whyCompany: "Acme keeps its payments platform in-house.",
      achievement: "Cut checkout latency from 900ms to 210ms",
      skills: ["Go"],
    });
    expect(result.text).not.toMatch(/\d+ ?%/);
    expect(result.text).toContain("900ms");
  });

  it("marks the facts the candidate still has to supply", () => {
    const result = buildCoverLetter({
      candidateName: "Ravi Kumar",
      role: "Backend Engineer",
      company: "Acme",
      whyCompany: "",
      achievement: "",
      skills: [],
    });
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.text).toContain("[");
  });

  it("builds a follow-up message", () => {
    const result = buildFollowUp({
      kind: "no-response",
      candidateName: "Ravi Kumar",
      company: "Acme",
      role: "Backend Engineer",
      daysSince: 10,
    });
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it("builds a STAR answer from the four parts given", () => {
    const result = buildStarAnswer({
      situation: "Checkout was timing out at peak.",
      task: "I owned the fix.",
      action: "I replaced the N+1 queries with a batched load.",
      result: "Latency fell from 900ms to 210ms.",
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("900ms");
  });

  it("builds a LinkedIn About section", () => {
    const result = buildLinkedInAbout({
      role: "Backend Engineer",
      years: 6,
      focus: ["payment systems", "reliability"],
      achievement: "Cut checkout latency from 900ms to 210ms",
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("Backend Engineer");
  });

  it("reports what the candidate still has to supply", () => {
    const result = buildLinkedInAbout({
      role: "Backend Engineer",
      years: 6,
      focus: [],
    });
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("builds an interview prep plan", () => {
    const result = buildInterviewPrep({
      role: "Backend Engineer",
      company: "Acme",
      stage: "technical",
      weakAreas: ["system design"],
    });
    expect(result.plan.length).toBeGreaterThan(0);
    for (const section of result.plan) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it("builds an availability statement", () => {
    const result = availabilityStatement({
      noticeDays: 30,
      servingOrBuyout: "notice",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("30 days");
  });

  it("says so plainly when the candidate can start immediately", () => {
    expect(
      availabilityStatement({ noticeDays: 0, servingOrBuyout: "immediate" }),
    ).toBe("I am available to start immediately.");
  });
});
