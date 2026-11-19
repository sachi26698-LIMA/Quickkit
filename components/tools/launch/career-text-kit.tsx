"use client";

import { useState } from "react";
import {
  actionVerbs,
  availabilityStatement,
  buildBullet,
  buildCoverLetter,
  buildFollowUp,
  buildInterviewPrep,
  buildLinkedInAbout,
  buildStarAnswer,
} from "@/lib/tools/career/letters";
import { noticeEndDate, totalExperience } from "@/lib/tools/career/salary";
import { addBusinessDays } from "@/lib/tools/hr/documents";
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

type Mode =
  | "cover-letter-generator"
  | "follow-up-generator"
  | "star-answer-builder"
  | "linkedin-about-generator"
  | "interview-prep-plan"
  | "availability-statement"
  | "experience-calculator"
  | "notice-period-calculator";

export default function CareerTextKit({ mode }: { mode: Mode }) {
  switch (mode) {
    case "follow-up-generator":
      return <FollowUpTool />;
    case "star-answer-builder":
      return <StarTool />;
    case "linkedin-about-generator":
      return <LinkedInTool />;
    case "interview-prep-plan":
      return <InterviewPrepTool />;
    case "availability-statement":
      return <AvailabilityTool />;
    case "experience-calculator":
      return <ExperienceTool />;
    case "notice-period-calculator":
      return <NoticeTool />;
    default:
      return <CoverLetterTool />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function CoverLetterTool() {
  const [candidateName, setCandidateName] = useState("");
  const [candidateContact, setCandidateContact] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [whyCompany, setWhyCompany] = useState("");
  const [achievement, setAchievement] = useState("");
  const [skills, setSkills] = useState("");
  const [source, setSource] = useState("");
  const [years, setYears] = useState("");
  const [tone, setTone] = useState("direct");

  const result = buildCoverLetter({
    candidateName,
    candidateContact,
    role,
    company,
    hiringManager,
    whyCompany,
    achievement,
    skills: skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    source,
    years: parseNumber(years) ?? undefined,
    tone: tone as "direct",
  });

  const ready = role.trim() && company.trim();

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">The application</h2>
        <p className="qw-section-note">
          The structure is the tool&apos;s contribution; the claims are yours.
          Where a fact is missing — especially why this company — a placeholder
          appears instead of a sentence that sounds plausible and means nothing.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Your name"
            value={candidateName}
            onChange={setCandidateName}
          />
          <Field
            label="Contact line"
            value={candidateContact}
            onChange={setCandidateContact}
            placeholder="email · phone · city"
          />
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Backend Engineer"
          />
          <Field
            label="Company"
            value={company}
            onChange={setCompany}
            placeholder="Acme"
          />
          <Field
            label="Hiring manager (if known)"
            value={hiringManager}
            onChange={setHiringManager}
          />
          <Field
            label="How you found it"
            value={source}
            onChange={setSource}
            placeholder="a referral from Priya"
          />
          <Field
            label="Years of experience"
            value={years}
            onChange={setYears}
            inputMode="numeric"
          />
          <SelectField
            label="Tone"
            value={tone}
            onChange={setTone}
            options={[
              { value: "direct", label: "Direct" },
              { value: "warm", label: "Warm" },
            ]}
          />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="Why this company specifically"
            value={whyCompany}
            onChange={setWhyCompany}
            multiline
            rows={3}
            hint="The one sentence only you can write. If you cannot fill this in, the application is not ready."
          />
          <Field
            label="Your strongest relevant achievement"
            value={achievement}
            onChange={setAchievement}
            multiline
            rows={3}
            placeholder="Reduced checkout API latency from 900ms to 210ms by replacing N+1 queries"
          />
          <Field
            label="Relevant skills (comma separated)"
            value={skills}
            onChange={setSkills}
            placeholder="Python, PostgreSQL, AWS"
          />
        </div>
      </div>

      {!ready ? (
        <EmptyState>Add the role and company to draft the letter.</EmptyState>
      ) : (
        <ResultPanel
          title="Cover letter draft"
          show
          text={result.text}
          filename="cover-letter"
        >
          <StatRow>
            <Stat
              label="Words"
              value={String(result.wordCount)}
              detail="One page is about 300"
              emphasis
            />
            <Stat
              label="Placeholders"
              value={String(result.missing.length)}
              detail={
                result.missing.length === 0 ? "Ready" : "Fill before sending"
              }
            />
          </StatRow>
          {result.missing.length > 0 ? (
            <Notice tone="warning">
              Still needed: {result.missing.join(", ")}.
            </Notice>
          ) : null}
          <div className="qw-mono" aria-label="Cover letter draft">
            {result.text}
          </div>
          <Notice tone="info">{result.notes[0]}</Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FollowUpTool() {
  const [kind, setKind] = useState("after-interview");
  const [candidateName, setCandidateName] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [detail, setDetail] = useState("");
  const [daysSince, setDaysSince] = useState("7");

  const result = buildFollowUp({
    kind: kind as "after-interview",
    candidateName,
    interviewerName,
    company,
    role,
    detail,
    daysSince: parseNumber(daysSince) ?? 7,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Which follow-up</h2>
        <p className="qw-section-note">
          Three situations, three different messages. The no-response version
          stays brief and non-accusatory — it is designed to be easy to answer.
        </p>
        <FieldGrid columns={2}>
          <SelectField
            label="Situation"
            value={kind}
            onChange={setKind}
            options={[
              { value: "after-interview", label: "After an interview" },
              { value: "no-response", label: "No response to an application" },
              { value: "after-final", label: "After a final round" },
            ]}
          />
          <Field
            label="Your name"
            value={candidateName}
            onChange={setCandidateName}
          />
          <Field
            label="Interviewer or team"
            value={interviewerName}
            onChange={setInterviewerName}
            placeholder="Hiring Team if unknown"
          />
          <Field label="Company" value={company} onChange={setCompany} />
          <Field label="Role" value={role} onChange={setRole} />
          <Field
            label="Days since applying"
            value={daysSince}
            onChange={setDaysSince}
            inputMode="numeric"
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="The specific detail worth referencing"
            value={detail}
            onChange={setDetail}
            multiline
            rows={3}
            placeholder="We discussed the migration to Postgres and I have since read the approach you described"
          />
        </div>
      </div>

      <ResultPanel
        title="Message draft"
        show
        text={`Subject: ${result.subject}\n\n${result.body}`}
        filename="follow-up"
      >
        <div className="qw-mono">
          <strong>Subject:</strong> {result.subject}
          {"\n\n"}
          {result.body}
        </div>
        <Notice tone="info">
          Send one follow-up, then stop. A second unanswered message rarely
          helps and often costs you the role.
        </Notice>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StarTool() {
  const [competency, setCompetency] = useState("");
  const [situation, setSituation] = useState("");
  const [task, setTask] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");

  const built = buildStarAnswer({
    competency,
    situation,
    task,
    action,
    result,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">One story</h2>
        <p className="qw-section-note">
          The prompt structure is the tool&apos;s job; the content is yours.
          Each slot is a question you cannot answer with an adjective — which is
          the point of STAR.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Competency (optional)"
            value={competency}
            onChange={setCompetency}
            placeholder="Ownership"
          />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="Situation — where you were, what was happening"
            value={situation}
            onChange={setSituation}
            multiline
            rows={3}
          />
          <Field
            label="Task — what you were responsible for"
            value={task}
            onChange={setTask}
            multiline
            rows={3}
          />
          <Field
            label="Action — what you did, in order, first person"
            value={action}
            onChange={setAction}
            multiline
            rows={4}
          />
          <Field
            label="Result — what changed, with a number"
            value={result}
            onChange={setResult}
            multiline
            rows={3}
          />
        </div>
      </div>

      <ResultPanel
        title="STAR answer"
        show
        text={built.text}
        filename="star-answer"
      >
        <StatRow>
          <Stat
            label="Words"
            value={String(built.wordCount)}
            detail="About 90 seconds spoken"
            emphasis
          />
          <Stat label="Issues" value={String(built.issues.length)} />
        </StatRow>
        {built.issues.length > 0 ? (
          <Notice tone="warning">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {built.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </Notice>
        ) : (
          <Notice tone="success">
            All four blocks are present and the result is quantified.
          </Notice>
        )}
        <div className="qw-mono">{built.text}</div>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LinkedInTool() {
  const [role, setRole] = useState("");
  const [years, setYears] = useState("5");
  const [focus, setFocus] = useState("");
  const [achievement, setAchievement] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [contact, setContact] = useState("");

  const result = buildLinkedInAbout({
    role,
    years: parseNumber(years) ?? 0,
    focus: focus
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    achievement,
    lookingFor,
    contact,
  });

  const verbs = actionVerbs("generic");

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">About-section inputs</h2>
        <FieldGrid columns={2}>
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Backend Engineer"
          />
          <Field
            label="Years"
            value={years}
            onChange={setYears}
            inputMode="numeric"
          />
          <Field
            label="Areas of focus (comma separated)"
            value={focus}
            onChange={setFocus}
            placeholder="distributed systems, payments"
          />
          <Field
            label="Contact"
            value={contact}
            onChange={setContact}
            placeholder="email or profile link"
          />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="One concrete thing you delivered"
            value={achievement}
            onChange={setAchievement}
            multiline
            rows={3}
          />
          <Field
            label="What you are looking for next"
            value={lookingFor}
            onChange={setLookingFor}
            multiline
            rows={3}
          />
        </div>
      </div>

      {!role.trim() ? (
        <EmptyState>Enter your role to draft the About section.</EmptyState>
      ) : (
        <ResultPanel
          title="LinkedIn About draft"
          show
          text={result.text}
          filename="linkedin-about"
        >
          {result.missing.length > 0 ? (
            <Notice tone="warning">
              Still needed: {result.missing.join(", ")}.
            </Notice>
          ) : null}
          <div className="qw-mono">{result.text}</div>
          <Disclosure summary="Strong action verbs for bullets">
            <div className="qw-chip-row">
              {verbs.map((verb) => (
                <span key={verb} className="qw-chip">
                  {verb}
                </span>
              ))}
            </div>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InterviewPrepTool() {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("technical");
  const [weakAreas, setWeakAreas] = useState("");

  const result = buildInterviewPrep({
    role,
    company,
    stage: stage as "technical",
    weakAreas: weakAreas
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">The interview</h2>
        <FieldGrid columns={2}>
          <Field label="Role" value={role} onChange={setRole} />
          <Field label="Company" value={company} onChange={setCompany} />
          <Field label="Stage" value={stage} onChange={setStage} />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <FieldGrid columns={1}>
            <SelectField
              label="Interview stage"
              value={stage}
              onChange={setStage}
              options={[
                { value: "screening", label: "Recruiter screening" },
                { value: "technical", label: "Technical" },
                { value: "manager", label: "Hiring manager" },
                { value: "final", label: "Final round" },
              ]}
            />
            <Field
              label="Areas you feel least confident about (one per line)"
              value={weakAreas}
              onChange={setWeakAreas}
              multiline
              rows={4}
              placeholder={
                "System design trade-offs\nExplaining a failure honestly"
              }
            />
          </FieldGrid>
        </div>
      </div>

      <ResultPanel
        title="Preparation plan"
        show
        text={result.plan
          .map(
            (section) =>
              `${section.heading}\n${section.items.map((item) => `  • ${item}`).join("\n")}`,
          )
          .join("\n\n")}
        filename="interview-prep"
      >
        {result.plan.map((section) => (
          <div key={section.heading} style={{ marginTop: 14 }}>
            <p className="qw-label" style={{ marginBottom: 6 }}>
              {section.heading}
            </p>
            <ul className="qw-prose" style={{ margin: 0 }}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <Notice tone="info">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Notice>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AvailabilityTool() {
  const [noticeDays, setNoticeDays] = useState("90");
  const [mode, setMode] = useState("notice");
  const [negotiable, setNegotiable] = useState(false);

  const statement = availabilityStatement({
    noticeDays: parseNumber(noticeDays) ?? 0,
    servingOrBuyout: mode as "notice",
    negotiable,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Your actual terms</h2>
        <p className="qw-section-note">
          A one-line statement, generated from your real notice period. Stating
          &quot;immediate&quot; on a 90-day notice costs everyone time.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Notice period (days)"
            value={noticeDays}
            onChange={setNoticeDays}
            inputMode="numeric"
          />
          <SelectField
            label="How you would leave"
            value={mode}
            onChange={setMode}
            options={[
              { value: "notice", label: "Serve the full notice" },
              { value: "buyout", label: "Buy out the notice" },
              { value: "immediate", label: "Available immediately" },
            ]}
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <SelectField
            label="Is the notice negotiable?"
            value={negotiable ? "yes" : "no"}
            onChange={(value) => setNegotiable(value === "yes")}
            options={[
              { value: "no", label: "No — the notice period is fixed" },
              { value: "yes", label: "Yes — open to discussion" },
            ]}
          />
        </div>
      </div>

      <ResultPanel
        title="Availability statement"
        show
        text={statement}
        filename="availability-statement"
      >
        <div className="qw-mono">{statement}</div>
        <Notice tone="info">
          Only say you can buy out your notice if your contract allows it and
          you have the money set aside. A buyout you cannot complete is worse
          than an honest start date.
        </Notice>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ExperienceTool() {
  const [periods, setPeriods] = useState([
    { start: "", end: "" },
    { start: "", end: "" },
  ]);

  const valid = periods.filter((period) => period.start);
  const result = valid.length > 0 ? totalExperience(valid) : null;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Employment periods</h2>
        <p className="qw-section-note">
          Overlapping roles are merged so concurrent consulting work is not
          double counted. Gaps of two months or more are listed separately.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {periods.map((period, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`start-${index}`}>
                  Start {index + 1}
                </label>
                <input
                  id={`start-${index}`}
                  className="qw-input"
                  value={period.start}
                  placeholder="Start (YYYY-MM-DD)"
                  onChange={(event) =>
                    setPeriods(
                      periods.map((item, position) =>
                        position === index
                          ? { ...item, start: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`end-${index}`}>
                  End {index + 1}
                </label>
                <input
                  id={`end-${index}`}
                  className="qw-input"
                  value={period.end}
                  placeholder="End (blank = present)"
                  onChange={(event) =>
                    setPeriods(
                      periods.map((item, position) =>
                        position === index
                          ? { ...item, end: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="secondary"
                aria-label={`Remove period ${index + 1}`}
                onClick={() =>
                  setPeriods(
                    periods.filter((_, position) => position !== index),
                  )
                }
                disabled={periods.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={() => setPeriods([...periods, { start: "", end: "" }])}
        >
          Add role
        </button>
      </div>

      {!result ? (
        <EmptyState>Add a start date for at least one role.</EmptyState>
      ) : (
        <ResultPanel
          title="Total experience"
          show
          text={[
            `Total: ${result.formatted} (${result.months} months)`,
            "",
            ...(result.gaps.length > 0
              ? [
                  "Gaps:",
                  ...result.gaps.map(
                    (gap) =>
                      `  ${gap.from} to ${gap.to} (${gap.months} months)`,
                  ),
                ]
              : ["No employment gaps of two months or more."]),
          ].join("\n")}
          filename="total-experience"
        >
          <StatRow>
            <Stat
              label="Total experience"
              value={result.formatted}
              detail={`${result.months} months`}
              emphasis
            />
            <Stat
              label="Gaps"
              value={String(result.gaps.length)}
              detail="Two months or more"
            />
          </StatRow>
          {result.gaps.length > 0 ? (
            <BreakdownTable
              caption="Employment gaps"
              head={["Period", "Months"]}
              rows={result.gaps.map((gap) => ({
                label: `${gap.from} → ${gap.to}`,
                value: String(gap.months),
              }))}
            />
          ) : (
            <Notice tone="success">
              No gaps of two months or more between the roles entered.
            </Notice>
          )}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NoticeTool() {
  const [resignationDate, setResignationDate] = useState("");
  const [noticeDays, setNoticeDays] = useState("60");
  const [holidays, setHolidays] = useState("");

  const result = noticeEndDate({
    resignationDate,
    noticeDays: parseNumber(noticeDays) ?? 0,
    holidays: holidays
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  });

  const ready = Boolean(result.lastWorkingDay);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Notice period</h2>
        <p className="qw-section-note">
          Counts business days, skipping weekends and any holidays you list.
          State law and your contract decide whether weekends count — the option
          is there because both arrangements exist in practice.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Resignation date"
            value={resignationDate}
            onChange={setResignationDate}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Notice period (business days)"
            value={noticeDays}
            onChange={setNoticeDays}
            inputMode="numeric"
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Declared holidays (one per line)"
            value={holidays}
            onChange={setHolidays}
            multiline
            rows={4}
          />
        </div>
      </div>

      {!ready ? (
        <EmptyState>
          Enter a valid resignation date to compute the last working day.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Last working day"
          show
          text={[
            `Last working day: ${result.lastWorkingDay}`,
            `Business days counted: ${result.businessDays}`,
            `Calendar days elapsed: ${result.calendarDays}`,
            result.skippedHolidays.length > 0
              ? `Holidays skipped: ${result.skippedHolidays.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n")}
          filename="notice-period"
        >
          <StatRow>
            <Stat
              label="Last working day"
              value={result.lastWorkingDay}
              emphasis
            />
            <Stat label="Business days" value={String(result.businessDays)} />
            <Stat
              label="Calendar days"
              value={String(result.calendarDays)}
              detail="Including weekends"
            />
            <Stat
              label="Holidays skipped"
              value={String(result.skippedHolidays.length)}
            />
          </StatRow>
          <Notice tone="info">
            Confirm the date with your employer before relying on it.
            Publication of the last working day in writing is what makes it
            enforceable, not a calculation.
          </Notice>
          <Disclosure summary="A business-days helper is available separately">
            <p>
              Use the working-days date calculator to add any number of business
              days to any date — useful for SLA deadlines, probation
              confirmations and joining dates, not just notice periods.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

export { addBusinessDays, buildBullet };
