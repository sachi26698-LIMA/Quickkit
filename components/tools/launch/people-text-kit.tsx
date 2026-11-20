"use client";

import { useState } from "react";
import {
  addBusinessDays,
  buildInterviewPlan,
  buildJobDescription,
  buildKpiSheet,
  probationEnd,
  statutoryLeave,
  INTERVIEW_BANK,
} from "@/lib/tools/hr/documents";
import {
  BreakdownTable,
  Disclosure,
  DocumentPreview,
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
  | "job-description"
  | "kpi-sheet"
  | "interview-plan"
  | "probation"
  | "business-days"
  | "statutory-leave";

export default function PeopleTextKit({ mode }: { mode: Mode }) {
  switch (mode) {
    case "kpi-sheet":
      return <KpiTool />;
    case "interview-plan":
      return <InterviewTool />;
    case "probation":
      return <ProbationTool />;
    case "business-days":
      return <BusinessDaysTool />;
    case "statutory-leave":
      return <StatutoryLeaveTool />;
    default:
      return <JobDescriptionTool />;
  }
}

const toLines = (raw: string): string[] =>
  raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────

function JobDescriptionTool() {
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("mid");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("onsite");
  const [responsibilities, setResponsibilities] = useState("");
  const [mustHave, setMustHave] = useState("");
  const [niceToHave, setNiceToHave] = useState("");
  const [salaryRange, setSalaryRange] = useState("");

  const result = buildJobDescription({
    role,
    seniority: seniority as "intern" | "junior" | "mid" | "senior" | "lead",
    department,
    location,
    workMode: workMode as "onsite" | "hybrid" | "remote",
    responsibilities: toLines(responsibilities),
    mustHave: toLines(mustHave),
    niceToHave: toLines(niceToHave),
    salaryRange: salaryRange.trim() || undefined,
  });

  const ready = role.trim().length > 0 && toLines(responsibilities).length > 0;

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Role and requirements</h2>
        <p className="qw-section-note">
          One item per line. The tool orders and frames what you write; it never
          invents a responsibility or a requirement, because those are the parts
          a candidate can hold you to.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Role title"
            value={role}
            onChange={setRole}
            placeholder="Backend Engineer"
          />
          <SelectField
            label="Seniority"
            value={seniority}
            onChange={setSeniority}
            options={[
              { value: "intern", label: "Intern" },
              { value: "junior", label: "Junior" },
              { value: "mid", label: "Mid-level" },
              { value: "senior", label: "Senior" },
              { value: "lead", label: "Lead" },
            ]}
          />
          <Field
            label="Department"
            value={department}
            onChange={setDepartment}
          />
          <Field label="Location" value={location} onChange={setLocation} />
          <SelectField
            label="Work mode"
            value={workMode}
            onChange={setWorkMode}
            options={[
              { value: "onsite", label: "On site" },
              { value: "hybrid", label: "Hybrid" },
              { value: "remote", label: "Fully remote" },
            ]}
          />
          <Field
            label="Salary range"
            value={salaryRange}
            onChange={setSalaryRange}
            placeholder="₹18–24 LPA"
            hint="If you can publish a range, do. It is the most requested detail and costs applications when omitted."
          />
        </FieldGrid>
      </div>

      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Lists</h2>
        <FieldGrid columns={1}>
          <Field
            label="Responsibilities (one per line)"
            value={responsibilities}
            onChange={setResponsibilities}
            multiline
            rows={6}
            placeholder={
              "Own the billing service end to end\nReview and improve the deployment pipeline\nMentor two junior engineers"
            }
          />
          <Field
            label="Must-have requirements (one per line)"
            value={mustHave}
            onChange={setMustHave}
            multiline
            rows={5}
            placeholder={
              "4+ years building production backends\nStrong SQL and schema design"
            }
            hint="Keep this list short. Long must-have lists measurably reduce applications from qualified candidates."
          />
          <Field
            label="Nice-to-have requirements (one per line)"
            value={niceToHave}
            onChange={setNiceToHave}
            multiline
            rows={4}
          />
        </FieldGrid>
      </div>

      {!ready ? (
        <EmptyState>
          Add a role title and at least one responsibility to generate the
          description.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Job description draft"
          show
          text={result.text}
          filename={`jd-${(role || "role").replace(/\s+/g, "-").toLowerCase()}`}
          document={{
            title: role.trim() || "Job description",
            subtitle:
              [department.trim(), location.trim()]
                .filter(Boolean)
                .join(" · ") || undefined,
            body: result.text,
            footer:
              "Draft for review. Confirm the company, role and location before publishing.",
          }}
        >
          <DocumentPreview
            title={role.trim() || "Job description"}
            subtitle={
              [department.trim(), location.trim()]
                .filter(Boolean)
                .join(" · ") || undefined
            }
            body={result.text}
          />

          <StatRow>
            <Stat
              label="Words"
              value={String(result.wordCount)}
              detail="Aim for 300–600"
              emphasis
            />
            <Stat
              label="Responsibilities"
              value={String(toLines(responsibilities).length)}
            />
            <Stat label="Must-haves" value={String(toLines(mustHave).length)} />
            <Stat
              label="Open issues"
              value={String(result.issues.length)}
              detail="Listed below"
            />
          </StatRow>

          {result.issues.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <div className="qw-mono" aria-label="Job description draft">
            {result.text}
          </div>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type MetricRow = { name: string; target: string; weight: string };

function KpiTool() {
  const [role, setRole] = useState("");
  const [focus, setFocus] = useState("engineering");
  const [period, setPeriod] = useState("quarterly");
  const [rows, setRows] = useState<MetricRow[]>([
    { name: "Deployment frequency", target: "", weight: "30" },
    { name: "Change failure rate", target: "", weight: "30" },
    { name: "On-call response time", target: "", weight: "40" },
  ]);

  const result = buildKpiSheet({
    role,
    focus: focus as
      "sales" | "support" | "engineering" | "marketing" | "operations" | "hr",
    period: period as "monthly" | "quarterly" | "annual",
    metrics: rows.map((row) => ({
      name: row.name,
      target: row.target,
      weight: parseNumber(row.weight) ?? 0,
    })),
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Role and period</h2>
        <FieldGrid columns={2}>
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Senior Backend Engineer"
          />
          <SelectField
            label="Function"
            value={focus}
            onChange={setFocus}
            options={[
              { value: "engineering", label: "Engineering" },
              { value: "sales", label: "Sales" },
              { value: "marketing", label: "Marketing" },
              { value: "support", label: "Support" },
              { value: "operations", label: "Operations" },
              { value: "hr", label: "HR" },
            ]}
          />
          <SelectField
            label="Review period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "annual", label: "Annual" },
            ]}
          />
        </FieldGrid>
      </div>

      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Metrics</h2>
        <p className="qw-section-note">
          Six metrics or fewer, weights summing to 100, and a measurable target
          for each. The tool will not propose targets — a target without local
          data is a guess that becomes an unfair review.
        </p>
        <div style={{ display: "grid", gap: 9 }}>
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`metric-${index}`}>
                  Metric {index + 1}
                </label>
                <input
                  id={`metric-${index}`}
                  className="qw-input"
                  value={row.name}
                  placeholder="Metric"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`target-${index}`}>
                  Target {index + 1}
                </label>
                <input
                  id={`target-${index}`}
                  className="qw-input"
                  value={row.target}
                  placeholder="Target, e.g. under 2 days"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, target: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div style={{ flex: "0 1 90px", minWidth: 80 }}>
                <label className="qw-sr-only" htmlFor={`weight-${index}`}>
                  Weight {index + 1}
                </label>
                <input
                  id={`weight-${index}`}
                  className="qw-input"
                  value={row.weight}
                  placeholder="%"
                  inputMode="numeric"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, weight: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="secondary"
                aria-label={`Remove metric ${index + 1}`}
                onClick={() =>
                  setRows(rows.filter((_, position) => position !== index))
                }
                disabled={rows.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 10 }}
          onClick={() =>
            setRows([...rows, { name: "", target: "", weight: "" }])
          }
        >
          Add metric
        </button>
      </div>

      <ResultPanel
        title="KPI sheet"
        show
        text={result.text}
        filename={`kpi-${(role || "role").replace(/\s+/g, "-").toLowerCase()}`}
        csvRows={[
          ["Metric", "Target", "Weight %"],
          ...rows.map((row) => [row.name, row.target, row.weight]),
        ]}
        document={{
          title: `${role.trim() || "Role"} — KPI sheet`,
          subtitle: [period, focus].filter(Boolean).join(" · ") || undefined,
          body: result.text,
          footer:
            "Weights must total 100% before this sheet is used for review.",
        }}
      >
        <DocumentPreview
          title={`${role.trim() || "Role"} — KPI sheet`}
          subtitle={[period, focus].filter(Boolean).join(" · ") || undefined}
          body={result.text}
        />

        <StatRow>
          <Stat
            label="Total weight"
            value={`${Math.round(result.totalWeight)}%`}
            detail={
              Math.round(result.totalWeight) === 100
                ? "Balanced"
                : "Must total 100%"
            }
            emphasis
          />
          <Stat
            label="Metrics"
            value={String(rows.length)}
            detail="Six or fewer is manageable"
          />
          <Stat
            label="Issues"
            value={String(result.issues.length)}
            detail="Listed below"
          />
        </StatRow>

        {result.issues.length > 0 ? (
          <Notice tone="warning">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </Notice>
        ) : null}

        <div className="qw-mono">{result.text}</div>
      </ResultPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InterviewTool() {
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState<string[]>([
    "problem solving",
    "ownership",
  ]);
  const [perCompetency, setPerCompetency] = useState("2");

  const result = buildInterviewPlan({
    role,
    competencies: selected,
    questionsPerCompetency: parseNumber(perCompetency) ?? 2,
  });

  const toggle = (competency: string) => {
    setSelected((current) =>
      current.includes(competency)
        ? current.filter((item) => item !== competency)
        : [...current, competency],
    );
  };

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Competencies to assess</h2>
        <p className="qw-section-note">
          Four or fewer. Each question comes with a prompt for what a strong
          answer shows — that is what the interviewer fills in before the
          interview, not after, because a question with no defined answer
          measures the interviewer&rsquo;s mood.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Role"
            value={role}
            onChange={setRole}
            placeholder="Product Manager"
          />
          <SelectField
            label="Questions per competency"
            value={perCompetency}
            onChange={setPerCompetency}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
          />
        </FieldGrid>
        <div className="qw-chip-row">
          {Object.keys(INTERVIEW_BANK).map((competency) => {
            const active = selected.includes(competency);
            return (
              <button
                key={competency}
                type="button"
                className="qw-chip"
                data-tone={active ? "ok" : undefined}
                aria-pressed={active}
                onClick={() => toggle(competency)}
              >
                {active ? "✓ " : ""}
                {competency}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <EmptyState>
          Select at least one competency to build the interview plan.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Interview plan"
          show
          text={result.questions
            .map(
              (item, index) =>
                `${index + 1}. [${item.competency}] ${item.question}\n   Looking for: ${item.lookingFor}`,
            )
            .join("\n\n")}
          filename="interview-plan"
          csvRows={[
            ["Competency", "Question", "What a strong answer shows"],
            ...result.questions.map((item) => [
              item.competency,
              item.question,
              item.lookingFor,
            ]),
          ]}
          document={{
            title: "Interview plan",
            subtitle: role.trim() || undefined,
            body: result.questions.map((item) => ({
              heading: item.competency,
              lines: [item.question, `Looking for: ${item.lookingFor}`],
            })),
            footer:
              "Questions are drawn from a fixed bank and are not tailored to the candidate's CV.",
          }}
        >
          <DocumentPreview
            title="Interview plan"
            subtitle={role.trim() || undefined}
            body={result.questions.map((item) => ({
              heading: item.competency,
              lines: [item.question, `Looking for: ${item.lookingFor}`],
            }))}
          />

          <StatRow>
            <Stat
              label="Questions"
              value={String(result.questions.length)}
              emphasis
            />
            <Stat label="Competencies" value={String(selected.length)} />
            <Stat
              label="Blocked"
              value={String(result.issues.length)}
              detail="Unbanked competencies"
            />
          </StatRow>

          {result.issues.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          {result.questions.map((item, index) => (
            <div
              key={`${item.competency}-${index}`}
              className="qw-workspace-panel"
              style={{ background: "#fbfafd" }}
            >
              <span className="qw-chip">{item.competency}</span>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 550,
                  margin: "9px 0 5px",
                  color: "#352a45",
                }}
              >
                {item.question}
              </p>
              <p className="qw-hint" style={{ margin: 0 }}>
                {item.lookingFor}
              </p>
            </div>
          ))}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ProbationTool() {
  const [joiningDate, setJoiningDate] = useState("");
  const [months, setMonths] = useState("6");
  const [extension, setExtension] = useState("0");

  const result = probationEnd({
    joiningDate,
    probationMonths: parseNumber(months) ?? 6,
    extensionMonths: parseNumber(extension) ?? 0,
  });

  const ready = Boolean(result.endDate);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Probation dates</h2>
        <FieldGrid columns={3}>
          <Field
            label="Joining date"
            value={joiningDate}
            onChange={setJoiningDate}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Probation months"
            value={months}
            onChange={setMonths}
            inputMode="numeric"
          />
          <Field
            label="Extension months"
            value={extension}
            onChange={setExtension}
            inputMode="numeric"
            hint="Leave 0 if no extension."
          />
        </FieldGrid>
      </div>

      {!ready ? (
        <EmptyState>
          Enter a joining date to compute the probation period.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Probation dates"
          show
          text={[
            `Probation ends: ${result.endDate}`,
            result.extendedDate ? `Extended to: ${result.extendedDate}` : "",
            "",
            ...result.notes,
          ]
            .filter(Boolean)
            .join("\n")}
          filename="probation-dates"
        >
          <StatRow>
            <Stat label="Probation ends" value={result.endDate} emphasis />
            {result.extendedDate ? (
              <Stat label="If extended" value={result.extendedDate} />
            ) : null}
            <Stat
              label="Months"
              value={String(parseNumber(months) ?? 6)}
              detail="Contract term"
            />
          </StatRow>
          <Notice tone="info">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BusinessDaysTool() {
  const [from, setFrom] = useState("");
  const [days, setDays] = useState("10");
  const [holidays, setHolidays] = useState("");

  const result = addBusinessDays({
    from,
    days: parseNumber(days) ?? 0,
    holidays: toLines(holidays),
  });

  const ready = Boolean(result.date);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Add working days to a date</h2>
        <p className="qw-section-note">
          Weekends are skipped. List any declared holidays, one date per line,
          and they are skipped too — which matters for notice periods and SLA
          deadlines.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Start date"
            value={from}
            onChange={setFrom}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Working days to add"
            value={days}
            onChange={setDays}
            inputMode="numeric"
            hint="Negative values count backwards."
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Declared holidays (one YYYY-MM-DD per line)"
            value={holidays}
            onChange={setHolidays}
            multiline
            rows={4}
          />
        </div>
      </div>

      {!ready ? (
        <EmptyState>Enter a valid start date to calculate.</EmptyState>
      ) : (
        <ResultPanel
          title="Resulting date"
          show
          text={[
            `Resulting date: ${result.date}`,
            `Skipped (weekends and holidays): ${result.skipped.length} days`,
          ].join("\n")}
          filename="business-days"
        >
          <StatRow>
            <Stat label="Resulting date" value={result.date} emphasis />
            <Stat
              label="Days skipped"
              value={String(result.skipped.length)}
              detail="Weekends and listed holidays"
            />
          </StatRow>
          {result.skipped.length > 0 ? (
            <Disclosure summary={`${result.skipped.length} dates skipped`}>
              <p className="qw-mono" style={{ margin: 0 }}>
                {result.skipped.join("\n")}
              </p>
            </Disclosure>
          ) : null}
        </ResultPanel>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatutoryLeaveTool() {
  const [daysWorked, setDaysWorked] = useState("240");
  const [daysPer, setDaysPer] = useState("20");

  const result = statutoryLeave({
    daysWorked: parseNumber(daysWorked) ?? 0,
    daysPer: parseNumber(daysPer) ?? 20,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Statutory leave entitlement</h2>
        <p className="qw-section-note">
          The Factories Act basis gives one day of leave for every 20 days
          worked. State Shops & Establishments Acts set their own formulas, so
          the divisor is an input.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Days worked in the year"
            value={daysWorked}
            onChange={setDaysWorked}
            inputMode="numeric"
          />
          <Field
            label="Days worked per leave day"
            value={daysPer}
            onChange={setDaysPer}
            inputMode="numeric"
            hint="20 under the Factories Act basis."
          />
        </FieldGrid>
      </div>

      <ResultPanel
        title="Entitlement"
        show
        text={[
          `Leave entitled: ${result.entitled} days`,
          "",
          ...result.notes,
        ].join("\n")}
        filename="statutory-leave"
      >
        <StatRow>
          <Stat
            label="Leave entitled"
            value={`${result.entitled} days`}
            emphasis
          />
          <Stat label="Days worked" value={daysWorked} />
          <Stat label="Divisor" value={daysPer} detail="Days per leave day" />
        </StatRow>
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

export { BreakdownTable };
