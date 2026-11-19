"use client";

import { useState } from "react";
import {
  LETTER_META,
  buildLetter,
  buildPayslip,
  type LetterKind,
} from "@/lib/tools/hr/documents";
import { downloadText } from "@/lib/tools/download";
import {
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  DocumentPreview,
  ResultPanel,
  Stat,
  StatRow,
  formatInput,
  parseAmount,
} from "@/components/tools/launch/ui";

type Mode = "payslip" | LetterKind;

/**
 * Document studio: salary slips and the HR letters an Indian HR desk issues.
 *
 * The letters share one state object because they share field names; each kind
 * declares which of its facts it needs and the template only reads those. Any
 * fact left blank stays visible as `[a placeholder]` in the output, and the
 * sidebar lists every unresolved placeholder so nothing goes out half-written.
 */
export default function DocumentStudio({ mode }: { mode: Mode }) {
  if (mode === "payslip") return <PayslipBuilder />;
  // Keyed by kind so switching letter type starts a clean draft and clears the
  // copy status — a state reset on prop change, done without an effect.
  return <LetterBuilder key={mode} kind={mode} />;
}

// ─────────────────────────────────────────────────────────────────────────────

type EarningRow = { label: string; amount: string };

function PayslipBuilder() {
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [pan, setPan] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [workingDays, setWorkingDays] = useState("26");
  const [paidDays, setPaidDays] = useState("26");
  const [lopDays, setLopDays] = useState("0");

  const [earnings, setEarnings] = useState<EarningRow[]>([
    { label: "Basic salary", amount: "24000" },
    { label: "House rent allowance", amount: "9600" },
    { label: "Special allowance", amount: "15000" },
  ]);
  const [deductionRows, setDeductionRows] = useState<EarningRow[]>([
    { label: "Employee PF", amount: "1800" },
    { label: "Professional tax", amount: "200" },
  ]);

  const [preview, setPreview] = useState(false);

  const earningsRows = earnings
    .map((row) => ({
      label: row.label.trim(),
      amount: parseAmount(row.amount) ?? 0,
    }))
    .filter((row) => row.label && row.amount !== 0);
  const deductionList = deductionRows
    .map((row) => ({
      label: row.label.trim(),
      amount: parseAmount(row.amount) ?? 0,
    }))
    .filter((row) => row.label && row.amount !== 0);

  const result = buildPayslip({
    employeeName,
    employeeId,
    designation,
    department,
    companyName,
    companyAddress,
    payPeriod,
    dateOfJoining,
    bankAccountMasked: bankAccount,
    pan,
    earnings: earningsRows,
    deductions: deductionList,
    workingDays: Number(workingDays) || undefined,
    paidDays: Number(paidDays) || undefined,
    lopDays: Number(lopDays) || 0,
  });

  const ready =
    earningsRows.length > 0 &&
    companyName.trim().length > 0 &&
    employeeName.trim().length > 0 &&
    result.netPay >= 0;

  const updateRow = (
    list: EarningRow[],
    setter: (rows: EarningRow[]) => void,
    index: number,
    key: keyof EarningRow,
    value: string,
  ) => {
    const next = list.map((row, position) =>
      position === index ? { ...row, [key]: value } : row,
    );
    setter(next);
  };

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Employer and pay period</h2>
        <p className="qw-section-note">
          Only the fields you fill in appear on the slip. The employer&rsquo;s
          name, the employee&rsquo;s name and at least one earning are required
          — everything else can be left blank rather than filled with invented
          detail.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Company name"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Acme Manufacturing Pvt Ltd"
            error={!companyName.trim() ? "Required on a payslip." : undefined}
          />
          <Field
            label="Company address"
            value={companyAddress}
            onChange={setCompanyAddress}
          />
          <Field
            label="Employee name"
            value={employeeName}
            onChange={setEmployeeName}
            error={!employeeName.trim() ? "Required on a payslip." : undefined}
          />
          <Field
            label="Employee ID"
            value={employeeId}
            onChange={setEmployeeId}
          />
          <Field
            label="Designation"
            value={designation}
            onChange={setDesignation}
          />
          <Field
            label="Department"
            value={department}
            onChange={setDepartment}
          />
          <Field
            label="Pay period"
            value={payPeriod}
            onChange={setPayPeriod}
            placeholder="March 2026"
          />
          <Field
            label="Date of joining"
            value={dateOfJoining}
            onChange={setDateOfJoining}
            placeholder="2024-06-01"
          />
          <Field
            label="PAN"
            value={pan}
            onChange={setPan}
            hint="Optional. Masked values are safer on shared devices."
          />
          <Field
            label="Bank account (masked)"
            value={bankAccount}
            onChange={setBankAccount}
            placeholder="XXXX XXXX 4821"
          />
        </FieldGrid>
      </div>

      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Days</h2>
        <FieldGrid columns={3}>
          <Field
            label="Working days"
            value={workingDays}
            onChange={setWorkingDays}
            inputMode="numeric"
          />
          <Field
            label="Paid days"
            value={paidDays}
            onChange={setPaidDays}
            inputMode="numeric"
          />
          <Field
            label="Loss-of-pay days"
            value={lopDays}
            onChange={setLopDays}
            inputMode="numeric"
          />
        </FieldGrid>
      </div>

      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Earnings and deductions</h2>
        <p className="qw-section-note">
          Add each component exactly as your payroll system names it. A row with
          no label or a zero amount is skipped rather than printed as an empty
          line.
        </p>
        <RowEditor
          title="Earnings"
          rows={earnings}
          onUpdate={(index, key, value) =>
            updateRow(earnings, setEarnings, index, key, value)
          }
          onAdd={() => setEarnings([...earnings, { label: "", amount: "" }])}
          onRemove={(index) =>
            setEarnings(earnings.filter((_, position) => position !== index))
          }
        />
        <div style={{ height: 18 }} />
        <RowEditor
          title="Deductions"
          rows={deductionRows}
          onUpdate={(index, key, value) =>
            updateRow(deductionRows, setDeductionRows, index, key, value)
          }
          onAdd={() =>
            setDeductionRows([...deductionRows, { label: "", amount: "" }])
          }
          onRemove={(index) =>
            setDeductionRows(
              deductionRows.filter((_, position) => position !== index),
            )
          }
        />
      </div>

      {!ready ? (
        <EmptyState>
          Add a company name, an employee name and at least one earning with a
          non-zero amount. The slip is not generated until those exist, so an
          incomplete document cannot be downloaded by accident.
        </EmptyState>
      ) : (
        <ResultPanel
          title="Salary slip"
          show
          text={result.text}
          filename={`payslip-${(employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}`}
          document={{
            title: "Salary slip",
            subtitle: [
              companyName.trim(),
              employeeName.trim(),
              payPeriod.trim(),
            ]
              .filter(Boolean)
              .join(" · "),
            body: result.text,
          }}
          onReset={() => {
            setPreview(false);
            setEarnings([{ label: "Basic salary", amount: "24000" }]);
          }}
        >
          <StatRow>
            <Stat
              label="Gross earnings"
              value={`₹${formatInput(result.grossEarnings)}`}
              emphasis
            />
            <Stat
              label="Total deductions"
              value={`₹${formatInput(result.totalDeductions)}`}
            />
            <Stat
              label="Net pay"
              value={`₹${formatInput(result.netPay)}`}
              detail="Gross minus deductions"
            />
            <Stat
              label="Employer cost"
              value={`₹${formatInput(result.employerCost)}`}
              detail="Gross plus employer contributions"
            />
          </StatRow>

          {result.issues.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.issues.map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <div
            className="qw-actions"
            style={{ borderTop: "none", paddingTop: 0 }}
          >
            <button
              type="button"
              className="secondary"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Hide preview" : "Preview the printed slip"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                downloadText(
                  result.html,
                  `payslip-${(employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}.html`,
                  "text/html;charset=utf-8",
                )
              }
            >
              Download printable HTML
            </button>
          </div>

          {preview ? (
            <iframe
              title="Payslip preview"
              srcDoc={result.html}
              style={{
                width: "100%",
                height: 520,
                border: "1px solid #ece7f5",
                borderRadius: 11,
                marginTop: 14,
                background: "#fff",
              }}
              sandbox=""
            />
          ) : null}

          <Disclosure summary="What a payslip must contain">
            <p>
              The Code on Wages (2019) requires every employer to issue a wage
              slip. The commonly required particulars are: the employer&rsquo;s
              name and address, the employee&rsquo;s name and identifier, the
              wage period, the gross and net wages with the components itemised,
              and the deductions with their purpose.
            </p>
            <p>
              A slip showing a deduction with no explanation is the defect most
              often raised in labour inspections. Naming each deduction is not
              cosmetic.
            </p>
          </Disclosure>
        </ResultPanel>
      )}
    </>
  );
}

function RowEditor({
  title,
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  title: string;
  rows: EarningRow[];
  onUpdate: (index: number, key: keyof EarningRow, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <h3
        className="qw-section-title"
        style={{ fontSize: 12, marginBottom: 10 }}
      >
        {title}
      </h3>
      <div style={{ display: "grid", gap: 9 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            style={{ display: "flex", gap: 9, alignItems: "flex-end" }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <label className="qw-sr-only" htmlFor={`${title}-label-${index}`}>
                {title} label {index + 1}
              </label>
              <input
                id={`${title}-label-${index}`}
                className="qw-input"
                value={row.label}
                placeholder="Component name"
                onChange={(event) =>
                  onUpdate(index, "label", event.target.value)
                }
              />
            </div>
            <div style={{ flex: "0 1 150px", minWidth: 110 }}>
              <label
                className="qw-sr-only"
                htmlFor={`${title}-amount-${index}`}
              >
                {title} amount {index + 1}
              </label>
              <input
                id={`${title}-amount-${index}`}
                className="qw-input"
                value={row.amount}
                placeholder="0"
                inputMode="decimal"
                onChange={(event) =>
                  onUpdate(index, "amount", event.target.value)
                }
              />
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${row.label || `row ${index + 1}`}`}
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
        onClick={onAdd}
      >
        Add {title.toLowerCase()} row
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const LETTER_FIELDS: Record<
  LetterKind,
  { key: string; label: string; hint?: string }[]
> = {
  offer: [
    { key: "role", label: "Role title" },
    {
      key: "ctc",
      label: "Annual CTC",
      hint: "State the total and attach the structure.",
    },
    { key: "joiningDate", label: "Joining date", hint: "YYYY-MM-DD." },
    { key: "location", label: "Work location" },
    { key: "reportingTo", label: "Reporting to" },
    {
      key: "conditions",
      label: "Conditions",
      hint: "Reference check, document verification, medical — whatever actually applies.",
    },
    {
      key: "contractRef",
      label: "Governing document",
      hint: "Appointment letter or policy the employment is subject to.",
    },
    { key: "validUntil", label: "Offer valid until" },
  ],
  experience: [
    { key: "startDate", label: "Start date" },
    { key: "endDate", label: "Last working day" },
    { key: "department", label: "Department" },
    {
      key: "responsibilities",
      label: "Responsibilities held",
      hint: "Only what was actually done.",
    },
  ],
  relieving: [
    { key: "lastWorkingDay", label: "Last working day" },
    { key: "fnfAmount", label: "Full and final amount" },
    { key: "fnfDate", label: "Settlement processed on" },
  ],
  warning: [
    { key: "issue", label: "Issue in one line" },
    { key: "incidentDate", label: "Date of incident" },
    {
      key: "description",
      label: "Factual description",
      hint: "What happened, without characterisations.",
    },
    { key: "policyName", label: "Policy name" },
    { key: "policyRef", label: "Policy clause" },
    { key: "improvement", label: "Improvement required" },
    { key: "deadline", label: "Improvement deadline" },
    {
      key: "responseDeadline",
      label: "Response deadline",
      hint: "Due process: the employee must be able to respond.",
    },
  ],
  appreciation: [
    { key: "contribution", label: "What they did" },
    { key: "period", label: "Time period" },
    { key: "impact", label: "Why it mattered" },
    { key: "quality", label: "What was done well" },
  ],
  increment: [
    { key: "reviewCycle", label: "Review cycle" },
    { key: "effectiveDate", label: "Effective date" },
    { key: "previousCtc", label: "Previous CTC" },
    { key: "revisedCtc", label: "Revised CTC" },
    { key: "increase", label: "Increase" },
    { key: "statutoryComponents", label: "Statutory components affected" },
  ],
  termination: [
    { key: "effectiveDate", label: "Effective date" },
    { key: "clauseRef", label: "Contract clause relied on" },
    { key: "lastWorkingDay", label: "Last working day" },
    { key: "noticePay", label: "Notice or pay in lieu" },
    { key: "settlementItems", label: "Settlement items" },
    { key: "settlementDate", label: "Settlement date" },
  ],
  internship: [
    { key: "startDate", label: "Start date" },
    { key: "endDate", label: "End date" },
    { key: "department", label: "Department" },
    { key: "project", label: "Project or area" },
    { key: "responsibilities", label: "Tasks performed" },
    { key: "outcomes", label: "What was delivered" },
    { key: "purpose", label: "Purpose of the certificate" },
  ],
};

function LetterBuilder({ kind }: { kind: LetterKind }) {
  const meta = LETTER_META[kind];
  const fields = LETTER_FIELDS[kind];

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");

  const result = buildLetter({
    kind,
    companyName,
    companyAddress,
    employeeName,
    designation,
    date,
    referenceNumber,
    signatoryName,
    signatoryDesignation,
    fields: values,
  });

  const ready = companyName.trim() && employeeName.trim() && designation.trim();

  const fileBase = `${kind}-letter-${(employeeName || "employee")
    .replace(/\s+/g, "-")
    .toLowerCase()}`;

  // The same content is offered three ways: shown as a document, saved as a
  // Word file, and saved as a PDF. The export carries exactly what is on
  // screen, so a letter that is reviewed here is the letter that is issued.
  const letterDocument = {
    title: meta.name,
    subtitle: [
      referenceNumber.trim() ? `Ref: ${referenceNumber.trim()}` : "",
      date.trim(),
    ]
      .filter(Boolean)
      .join(" · "),
    body: result.text,
    footer: meta.caution,
  };

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Parties and reference</h2>
        <p className="qw-section-note">
          The letter is assembled only from what you enter here. Anything you
          leave blank appears in the output as a highlighted placeholder, and
          the list below tells you how many remain — so nothing is silently
          invented.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Company name"
            value={companyName}
            onChange={setCompanyName}
          />
          <Field
            label="Company address"
            value={companyAddress}
            onChange={setCompanyAddress}
          />
          <Field
            label="Employee name"
            value={employeeName}
            onChange={setEmployeeName}
          />
          <Field
            label="Designation"
            value={designation}
            onChange={setDesignation}
          />
          <Field
            label="Letter date"
            value={date}
            onChange={setDate}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Reference number"
            value={referenceNumber}
            onChange={setReferenceNumber}
            placeholder="HR/2026/041"
          />
          <Field
            label="Signatory name"
            value={signatoryName}
            onChange={setSignatoryName}
          />
          <Field
            label="Signatory designation"
            value={signatoryDesignation}
            onChange={setSignatoryDesignation}
          />
        </FieldGrid>
      </div>

      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">{meta.name} particulars</h2>
        <p className="qw-section-note">{meta.description}</p>
        <FieldGrid columns={2}>
          {fields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={values[field.key] ?? ""}
              onChange={(value) => setValues({ ...values, [field.key]: value })}
              hint={field.hint}
              multiline={
                field.key === "description" || field.key === "responsibilities"
              }
            />
          ))}
        </FieldGrid>
      </div>

      {!ready ? (
        <EmptyState>
          Add a company name, an employee name and a designation. The letter is
          not rendered until those identify who it is from and who it is for.
        </EmptyState>
      ) : (
        <ResultPanel
          title={meta.name}
          show
          text={result.text}
          filename={fileBase}
          document={letterDocument}
          onReset={() => setValues({})}
        >
          <StatRow>
            <Stat
              label="Placeholders remaining"
              value={String(result.missingFields.length)}
              detail={
                result.missingFields.length === 0
                  ? "Ready to review"
                  : "Fill these before issuing"
              }
              emphasis
            />
            <Stat
              label="Letter type"
              value={meta.name}
              detail={
                meta.needsCompanySeal
                  ? "Company seal recommended"
                  : "No seal required"
              }
            />
            <Stat
              label="Cautions"
              value={String(result.cautions.length)}
              detail="Legal review points listed below"
            />
          </StatRow>

          {result.cautions.length > 0 ? (
            <Notice tone="warning">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {result.cautions.map((caution) => (
                  <li key={caution}>{caution}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          {result.missingFields.length > 0 ? (
            <Notice tone="warning">
              Still needed: {result.missingFields.join(", ")}. Each appears as a
              highlighted placeholder in the draft.
            </Notice>
          ) : null}

          <DocumentPreview {...letterDocument} />

          <Disclosure summary="Letter as plain text">
            <div className="qw-mono" aria-label="Letter draft">
              {result.text}
            </div>
          </Disclosure>

          <span className="qw-action-status" role="status" aria-live="polite">
            {copied}
          </span>

          <div
            className="qw-actions"
            style={{ borderTop: "none", paddingTop: 0 }}
          >
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  if (!navigator.clipboard?.writeText) throw new Error();
                  await navigator.clipboard.writeText(result.text);
                  setCopied("Copied.");
                } catch {
                  setCopied("Copy unavailable — select the text above.");
                }
              }}
            >
              Copy text
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                downloadText(
                  result.html,
                  `${fileBase}.html`,
                  "text/html;charset=utf-8",
                )
              }
            >
              Download printable HTML
            </button>
          </div>
        </ResultPanel>
      )}
    </>
  );
}

export { LETTER_META };
