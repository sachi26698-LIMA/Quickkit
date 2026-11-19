"use client";

import { useState } from "react";
import {
  analyseResume,
  compareResumes,
  improveBullets,
  keywordCoverage,
  generateSummary,
} from "@/lib/tools/career/resume";
import {
  BreakdownTable,
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
  parseNumber,
} from "@/components/tools/launch/ui";
import DocumentInput from "@/components/tools/launch/document-input";

type Mode =
  | "resume-ats-checker"
  | "resume-keyword-matcher"
  | "resume-bullet-improver"
  | "resume-summary-generator"
  | "resume-comparison";

export default function ResumeStudio({ mode }: { mode: Mode }) {
  switch (mode) {
    case "resume-keyword-matcher":
      return <KeywordMatcher />;
    case "resume-bullet-improver":
      return <BulletImprover />;
    case "resume-summary-generator":
      return <SummaryGenerator />;
    case "resume-comparison":
      return <ResumeComparison />;
    default:
      return <AtsChecker />;
  }
}

const SEVERITY_TONE = { error: "bad", warning: "warn", info: "ok" } as const;

// ─────────────────────────────────────────────────────────────────────────────

function AtsChecker() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const ready = resume.trim().split(/\s+/).filter(Boolean).length >= 40;
  const result = ready ? analyseResume(resume, { jobDescription }) : null;

  const tone = result
    ? result.score >= 75
      ? "ok"
      : result.score >= 50
        ? "warn"
        : "bad"
    : "ok";

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Your résumé</h2>
        <p className="qw-section-note">
          Drop in your PDF or Word résumé, or paste the text. Adding the job
          description you are targeting makes the check far more useful, because
          keyword coverage is then measured against the actual posting rather
          than a guess.
        </p>
        <FieldGrid columns={1}>
          <DocumentInput
            label="Résumé text"
            value={resume}
            onChange={setResume}
            rows={14}
            placeholder="Or paste your résumé as plain text. Use 'paste as plain text' in your editor so formatting does not come across."
          />
          <Field
            label="Job description (recommended)"
            value={jobDescription}
            onChange={setJobDescription}
            multiline
            rows={8}
            placeholder="Paste the full posting. The analyser extracts the terms it emphasises and checks whether they appear in your résumé."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Add at least 40 words of résumé text — drop in a PDF or Word file, or
          paste it. Nothing is uploaded: the file is read in this tab and the
          analysis runs here too.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Résumé readiness"
          show
          text={[
            `Readiness score: ${result.score}/100`,
            `Words: ${result.wordCount}`,
            `Bullets: ${result.bullets.total} (${result.bullets.withNumbers} quantified)`,
            "",
            "Components:",
            ...result.components.map(
              (component) =>
                `  ${component.name}: ${component.points}/${component.max} — ${component.detail}`,
            ),
            "",
            "Issues:",
            ...result.issues.map(
              (issue) =>
                `[${issue.severity}] ${issue.section}: ${issue.message}`,
            ),
            "",
            "Strengths:",
            ...result.strengths.map((strength) => `  ${strength}`),
            "",
            ...result.notes,
          ].join("\n")}
          filename="resume-readiness"
          csvRows={[
            ["Severity", "Section", "Finding"],
            ...result.issues.map((issue) => [
              issue.severity,
              issue.section,
              issue.message,
            ]),
          ]}
        >
          <StatRow>
            <Stat
              label="Readiness score"
              value={`${result.score}/100`}
              detail="Itemised below, not a vendor prediction"
              emphasis
            />
            <Stat
              label="Words"
              value={String(result.wordCount)}
              detail="Below ten years, two pages is normal"
            />
            <Stat
              label="Bullets"
              value={String(result.bullets.total)}
              detail={`${result.bullets.withNumbers} quantified`}
            />
            <Stat
              label="Findings"
              value={String(result.issues.length)}
              detail={`${result.issues.filter((i) => i.severity === "error").length} blocking`}
            />
          </StatRow>

          <div className="qw-meter" data-tone={tone}>
            <div
              className="qw-meter-fill"
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="qw-hint">
            This is a readiness check against your own text, not a prediction of
            any applicant tracking system. No vendor publishes its algorithm, so
            a vendor-specific score would be invented.
          </p>

          <BreakdownTable
            caption="How the score is built"
            head={["Component", "Points"]}
            rows={result.components.map((component) => ({
              label: `${component.name} — ${component.detail}`,
              value: `${component.points}/${component.max}`,
            }))}
            total={{ label: "Total", value: `${result.score}/100` }}
          />

          <div className="qw-chip-row">
            {result.sections.map((section) => (
              <span
                key={section.name}
                className="qw-chip"
                data-tone={section.found ? "ok" : "warn"}
              >
                {section.found ? "✓" : "✕"} {section.name}
              </span>
            ))}
          </div>

          {result.issues.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <p className="qw-label">Findings, most serious first</p>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {result.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="qw-notice"
                    data-tone={
                      issue.severity === "error"
                        ? "error"
                        : issue.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    <span
                      className="qw-chip"
                      data-tone={SEVERITY_TONE[issue.severity]}
                      style={{ flexShrink: 0 }}
                    >
                      {issue.section}
                    </span>
                    <div>{issue.message}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Notice tone="success">
              No structural problems found. Check the keyword match below.
            </Notice>
          )}

          {result.strengths.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <p className="qw-label">What is already working</p>
              <ul className="qw-prose" style={{ marginTop: 6 }}>
                {result.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Disclosure summary="What this check does and does not know">
            <p>
              It checks the things that are objectively measurable from text:
              whether standard section headings exist, whether contact details
              are present, whether bullets carry numbers, whether they open with
              action verbs, and whether the terms a job description emphasises
              actually appear.
            </p>
            <p>
              It cannot know how any specific applicant tracking system will
              parse your file, because none of them publish their parsing rules.
              It also cannot see layout, which is why a PDF with columns and
              graphics can parse badly despite scoring well here — submit a
              plain single-column document when you can.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function KeywordMatcher() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const ready = resume.trim().length > 0 && jobDescription.trim().length > 50;
  const result = ready ? keywordCoverage(resume, jobDescription) : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Résumé and target job</h2>
        <p className="qw-section-note">
          The analyser extracts terms the posting emphasises — those mentioned
          more than once, or written as named skills — and checks each against
          your résumé. Matching is case-insensitive on word boundaries.
        </p>
        <FieldGrid columns={1}>
          <DocumentInput
            label="Résumé text"
            value={resume}
            onChange={setResume}
            rows={12}
          />
          <Field
            label="Job description"
            value={jobDescription}
            onChange={setJobDescription}
            multiline
            rows={10}
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Paste both your résumé and the job description to measure coverage.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Keyword coverage"
          show
          text={[
            `Coverage: ${(result.ratio * 100).toFixed(0)}% (${result.matched.length} of ${result.totalConsidered} terms)`,
            "",
            "Matched:",
            ...result.matched.map((term) => `  ✓ ${term}`),
            "",
            "Missing:",
            ...result.missing.map((term) => `  ✕ ${term}`),
          ].join("\n")}
          filename="keyword-coverage"
          csvRows={[
            ["Term", "Present", "Mentions in posting"],
            ...result.important.map((item) => [
              item.term,
              item.present ? "yes" : "no",
              item.mentions,
            ]),
          ]}
        >
          <StatRow>
            <Stat
              label="Coverage"
              value={`${(result.ratio * 100).toFixed(0)}%`}
              detail={`${result.matched.length} of ${result.totalConsidered}`}
              emphasis
            />
            <Stat label="Matched" value={String(result.matched.length)} />
            <Stat label="Missing" value={String(result.missing.length)} />
          </StatRow>

          <div
            className="qw-meter"
            data-tone={
              result.ratio >= 0.7 ? "ok" : result.ratio >= 0.5 ? "warn" : "bad"
            }
          >
            <div
              className="qw-meter-fill"
              style={{ width: `${result.ratio * 100}%` }}
            />
          </div>

          {result.missing.length > 0 ? (
            <Notice tone="warning">
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                Missing from your résumé
              </p>
              <div className="qw-chip-row" style={{ margin: 0 }}>
                {result.missing.map((term) => (
                  <span key={term} className="qw-chip" data-tone="warn">
                    {term}
                  </span>
                ))}
              </div>
              <p className="qw-hint" style={{ marginTop: 8, marginBottom: 0 }}>
                Only add a term if you can genuinely claim it. A keyword you
                cannot defend in an interview is worse than a gap.
              </p>
            </Notice>
          ) : (
            <Notice tone="success">
              Every emphasised term in the posting appears in your résumé.
            </Notice>
          )}

          <BreakdownTable
            caption="Every term considered, with how often the posting mentions it"
            head={["Term", "In posting"]}
            rows={result.important.map((item) => ({
              label: `${item.present ? "✓" : "✕"} ${item.term}`,
              value: `${item.mentions}×`,
              tone: item.present ? "neutral" : "deduction",
            }))}
          />

          <Disclosure summary={"How “important” is decided"}>
            <p>
              A term counts as emphasised if the posting mentions it more than
              once, or if it is written as a named skill — it contains a digit,
              plus, hash or dot, or it is capitalised mid-sentence (which is how
              Java, Kubernetes or Node.js appear).
            </p>
            <p>
              Stop words and pure numbers are dropped. The forty most emphasised
              terms are checked; a whole-posting term dump would be noise rather
              than signal.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BulletImprover() {
  const [bullets, setBullets] = useState("");

  const lines = bullets.split(/\r?\n/).filter((line) => line.trim());
  const suggestions = lines.length > 0 ? improveBullets(lines) : [];

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Your bullets</h2>
        <p className="qw-section-note">
          One bullet per line. The rewriter replaces weak openers with action
          verbs and strips filler. It cannot invent a metric, so where a number
          is missing it adds a visible prompt instead of making one up.
        </p>
        <Field
          label="Bullet points"
          value={bullets}
          onChange={setBullets}
          multiline
          rows={10}
          placeholder={
            "Responsible for managing the deployment pipeline\nHelped with various customer onboarding tasks"
          }
        />
      </div>

      {suggestions.length === 0 ? (
        <EmptyState>Add one bullet per line to rewrite them.</EmptyState>
      ) : (
        <ResultPanel
          title="Rewritten bullets"
          show
          text={suggestions
            .map(
              (item, index) =>
                `${index + 1}. ${item.improved}\n   Changes: ${item.changes.join(" ")}${item.needsFromYou.length > 0 ? `\n   Needs from you: ${item.needsFromYou.join(" ")}` : ""}`,
            )
            .join("\n\n")}
          filename="rewritten-bullets"
          csvRows={[
            ["Original", "Improved", "Still needed"],
            ...suggestions.map((item) => [
              item.original,
              item.improved,
              item.needsFromYou.join(" "),
            ]),
          ]}
        >
          <StatRow>
            <Stat label="Bullets" value={String(suggestions.length)} emphasis />
            <Stat
              label="Need a metric"
              value={String(
                suggestions.filter((item) => item.needsFromYou.length > 0)
                  .length,
              )}
              detail="The tool will not invent one"
            />
          </StatRow>

          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {suggestions.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: 14,
                  border: "1px solid #ece7f5",
                  borderRadius: 11,
                  background: "#fff",
                }}
              >
                <p
                  className="qw-hint"
                  style={{ margin: "0 0 4px", textDecoration: "line-through" }}
                >
                  {item.original}
                </p>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 13.5,
                    fontWeight: 550,
                    color: "#352a45",
                  }}
                >
                  {item.improved}
                </p>
                <ul
                  className="qw-prose"
                  style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}
                >
                  {item.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
                {item.needsFromYou.length > 0 ? (
                  <p
                    className="qw-hint"
                    style={{ margin: "8px 0 0", color: "#8a5a13" }}
                  >
                    <strong>Needs from you:</strong>{" "}
                    {item.needsFromYou.join(" ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <Notice tone="info">
            A résumé bullet that says &quot;increased revenue by 30%&quot; when
            you cannot show the working is a liability. Every metric has to come
            from you — that is why these drafts leave the number blank rather
            than filling it in.
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SummaryGenerator() {
  const [role, setRole] = useState("");
  const [years, setYears] = useState("5");
  const [skills, setSkills] = useState("");
  const [achievement, setAchievement] = useState("");
  const [tone, setTone] = useState("standard");

  const result = generateSummary({
    role,
    years: parseNumber(years) ?? 0,
    skills: skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    achievement,
    tone: tone as "standard",
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Your facts</h2>
        <p className="qw-section-note">
          Three lengths, built from what you enter. Words like
          &quot;passionate&quot; and &quot;results-driven&quot; are excluded
          deliberately — they carry no information and recruiters discount them.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Backend Engineer"
          />
          <Field
            label="Years of experience"
            value={years}
            onChange={setYears}
            inputMode="numeric"
          />
          <Field
            label="Skills (comma separated)"
            value={skills}
            onChange={setSkills}
            placeholder="Python, PostgreSQL, AWS"
          />
          <SelectField
            label="Length"
            value={tone}
            onChange={setTone}
            options={[
              { value: "concise", label: "Concise — one sentence" },
              { value: "standard", label: "Standard — two sentences" },
              { value: "senior", label: "Senior — three sentences" },
            ]}
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="One concrete achievement"
            value={achievement}
            onChange={setAchievement}
            multiline
            rows={3}
            placeholder="Cut checkout API latency from 900ms to 210ms by replacing N+1 queries"
            hint="Include a number if you have one. This is the only sentence a recruiter reads twice."
          />
        </div>
      </div>

      {!role.trim() ? (
        <EmptyState>Enter a role title to draft summaries.</EmptyState>
      ) : (
        <ResultPanel
          title="Summary drafts"
          show
          text={result.join("\n\n")}
          filename="resume-summary"
        >
          <div style={{ display: "grid", gap: 10 }}>
            {result.map((line, index) => (
              <div
                key={index}
                style={{
                  padding: "12px 14px",
                  border: "1px solid #ece7f5",
                  borderRadius: 11,
                  background: index === 0 ? "#f7f4fe" : "#fff",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: "#352a45",
                  }}
                >
                  {line}
                </p>
                <p className="qw-hint" style={{ margin: "6px 0 0" }}>
                  {line.split(/\s+/).length} words ·{" "}
                  {index === 0 ? "Selected length" : "Alternative"}
                </p>
              </div>
            ))}
          </div>
          {!achievement.trim() ? (
            <Notice tone="warning">
              No achievement supplied, so the drafts have no proof line. A
              summary without one is a job title with adjectives around it.
            </Notice>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ResumeComparison() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const ready =
    a.trim().split(/\s+/).length >= 30 && b.trim().split(/\s+/).length >= 30;
  const result = ready ? compareResumes(a, b, { jobDescription }) : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Two versions</h2>
        <p className="qw-section-note">
          Compares versions on the same measurable axes and shows what changed.
          Useful for the real question — is B actually better than A — without
          pretending either has an absolute grade.
        </p>
        <FieldGrid columns={1}>
          <DocumentInput
            label="Version A (current)"
            value={a}
            onChange={setA}
            rows={10}
          />
          <DocumentInput
            label="Version B (candidate)"
            value={b}
            onChange={setB}
            rows={10}
          />
          <Field
            label="Job description (optional)"
            value={jobDescription}
            onChange={setJobDescription}
            multiline
            rows={6}
            hint="Both versions are scored against the same posting."
          />
        </FieldGrid>
      </div>

      {!result ? (
        <EmptyState>
          Add both versions, at least 30 words each — drop in the documents or
          paste the text.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Comparison"
          show
          text={[
            `Score: A ${result.a.score}, B ${result.b.score} (${result.scoreDelta >= 0 ? "+" : ""}${result.scoreDelta} for B)`,
            "",
            ...result.rows.map(
              (row) =>
                `${row.metric}: A ${row.a} · B ${row.b} — ${row.better === "tie" ? "tie" : `better: ${row.better.toUpperCase()}`}`,
            ),
            "",
            `Only in A: ${result.onlyInA.join(", ") || "—"}`,
            `Only in B: ${result.onlyInB.join(", ") || "—"}`,
          ].join("\n")}
          filename="resume-comparison"
          csvRows={[
            ["Metric", "Version A", "Version B", "Better"],
            ...result.rows.map((row) => [
              row.metric,
              String(row.a),
              String(row.b),
              row.better,
            ]),
          ]}
        >
          <StatRow>
            <Stat
              label="Score change"
              value={`${result.scoreDelta >= 0 ? "+" : ""}${result.scoreDelta}`}
              detail={`A ${result.a.score} → B ${result.b.score}`}
              emphasis
            />
            <Stat
              label="Version A"
              value={String(result.a.score)}
              detail={`${result.a.wordCount} words`}
            />
            <Stat
              label="Version B"
              value={String(result.b.score)}
              detail={`${result.b.wordCount} words`}
            />
          </StatRow>

          <BreakdownTable
            caption="Metric by metric"
            head={["Metric", "Better"]}
            rows={result.rows.map((row) => ({
              label: `${row.metric}: A ${row.a} · B ${row.b}`,
              value:
                row.better === "tie" ? "tie" : row.better === "a" ? "A" : "B",
            }))}
          />

          <Notice tone="info">
            Read the deltas, not just the total. A higher score with fewer
            quantified bullets usually means content was cut rather than
            improved.
          </Notice>

          <div className="qw-split" style={{ marginTop: 14 }}>
            <div>
              <p className="qw-label">Words only in version A</p>
              <div className="qw-chip-row">
                {result.onlyInA.length > 0 ? (
                  result.onlyInA.map((token) => (
                    <span key={token} className="qw-chip">
                      {token}
                    </span>
                  ))
                ) : (
                  <span className="qw-hint">None</span>
                )}
              </div>
            </div>
            <div>
              <p className="qw-label">Words only in version B</p>
              <div className="qw-chip-row">
                {result.onlyInB.length > 0 ? (
                  result.onlyInB.map((token) => (
                    <span key={token} className="qw-chip">
                      {token}
                    </span>
                  ))
                ) : (
                  <span className="qw-hint">None</span>
                )}
              </div>
            </div>
          </div>
        </ResultPanel>
      )}
    </>
  );
}
