/**
 * HR document generation — salary slips, letters and registers.
 *
 * Every generator here is a **template engine over facts the user supplies**.
 * Nothing is invented: a letter that says "we were impressed by your work on
 * project X" only does so because the user typed project X. Where a template
 * needs a fact it does not have, it emits a visible `[placeholder]` rather than
 * plausible-sounding filler, so an unsigned letter can never go out containing
 * something nobody wrote.
 *
 * Documents are produced as plain text or HTML built here, then handed to the
 * shared download helper. Nothing is transmitted or stored.
 */

/** A visible placeholder the author must replace before sending. */
export const slot = (label: string): string => `[${label}]`;

export type LetterField = { label: string; value: string };

/** Replace `{{key}}` tokens; unresolved tokens stay visible as [key]. */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    return value && value.trim() ? value.trim() : slot(key);
  });
}

/** List every unresolved placeholder in a rendered document. */
export function unresolvedSlots(text: string): string[] {
  return [
    ...new Set([...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Salary slip
// ─────────────────────────────────────────────────────────────────────────────

export type PayslipInput = {
  employeeName: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  companyName: string;
  companyAddress?: string;
  payPeriod: string; // "March 2026"
  dateOfJoining?: string;
  bankAccountMasked?: string;
  pan?: string;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  employerContributions?: { label: string; amount: number }[];
  /** Days in the month, present days and LOP days for the summary block. */
  workingDays?: number;
  paidDays?: number;
  lopDays?: number;
  currency?: string;
};

export type PayslipResult = {
  html: string;
  text: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
  issues: { severity: "error" | "warning"; message: string }[];
  /** Sum check: earnings − deductions must equal net pay. */
  balanced: boolean;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt = (value: number, currency: string): string =>
  `${currency}${Math.round(value * 100) / 100 > 0 ? (Math.round(value * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;

/**
 * Build a printable payslip.
 *
 * The arithmetic is checked, not assumed: the totals are summed from the rows
 * the user enters, and `balanced` reports whether earnings − deductions equals
 * the net pay the slip states — which is always true by construction, so the
 * check instead flags the real problems: a slip with no earnings rows, a
 * deduction larger than gross, or a negative net.
 */
export function buildPayslip(input: PayslipInput): PayslipResult {
  const currency = input.currency ?? "₹";
  const issues: PayslipResult["issues"] = [];

  const grossEarnings = input.earnings.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const totalDeductions = input.deductions.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const netPay = grossEarnings - totalDeductions;
  const employerContributions = input.employerContributions ?? [];
  const employerCost =
    grossEarnings +
    employerContributions.reduce((sum, row) => sum + row.amount, 0);

  if (input.earnings.length === 0) {
    issues.push({
      severity: "error",
      message: "Add at least one earnings row.",
    });
  }
  // A deduction the employee cannot read is the defect most often raised in
  // labour inspections, so an unlabelled line is an error rather than a
  // formatting nicety. The amount is still deducted — the point is that the
  // slip must explain it before it is issued.
  const unlabelled = [
    ...input.earnings
      .filter((row) => !row.label.trim() && row.amount !== 0)
      .map(() => "earning"),
    ...input.deductions
      .filter((row) => !row.label.trim() && row.amount !== 0)
      .map(() => "deduction"),
  ];
  if (unlabelled.length > 0) {
    issues.push({
      severity: "error",
      message: `Name every ${unlabelled.join(" and ")} line. A wage slip must state what each deduction is for.`,
    });
  }
  if (netPay < 0) {
    issues.push({
      severity: "error",
      message:
        "Deductions exceed earnings. The slip would show negative pay, which is not valid.",
    });
  }
  if (totalDeductions === 0) {
    issues.push({
      severity: "warning",
      message:
        "No deductions. If PF applies, a 12%-of-basic employee contribution is usually required — check before issuing.",
    });
  }
  if (!input.employeeName.trim()) {
    issues.push({
      severity: "error",
      message: "Employee name is required on a payslip.",
    });
  }
  if (!input.companyName.trim()) {
    issues.push({
      severity: "error",
      message: "Company name is required on a payslip.",
    });
  }

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Payslip — ${escapeHtml(input.employeeName)} — ${escapeHtml(input.payPeriod)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 32px; color: #14161a; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #d8dbe0; border-radius: 10px; padding: 28px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #5b616b; font-size: 12px; margin: 0; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px 22px; margin: 20px 0; font-size: 13px; }
  .meta div strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e6e8ec; }
  th { background: #f6f7f9; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #4b5563; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; border-top: 2px solid #14161a; border-bottom: none; }
  .net { margin-top: 20px; padding: 14px 16px; background: #f6f7f9; border-radius: 8px; display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  @media print { body { padding: 0; } .sheet { border: none; } }
</style></head><body>
<div class="sheet">
  <h1>${escapeHtml(input.companyName)}</h1>
  ${input.companyAddress ? `<p class="muted">${escapeHtml(input.companyAddress)}</p>` : ""}
  <p class="muted">Payslip for ${escapeHtml(input.payPeriod)}</p>
  <div class="meta">
    <div><strong>Employee</strong>${escapeHtml(input.employeeName)}</div>
    ${input.employeeId ? `<div><strong>Employee ID</strong>${escapeHtml(input.employeeId)}</div>` : ""}
    ${input.designation ? `<div><strong>Designation</strong>${escapeHtml(input.designation)}</div>` : ""}
    ${input.department ? `<div><strong>Department</strong>${escapeHtml(input.department)}</div>` : ""}
    ${input.dateOfJoining ? `<div><strong>Date of joining</strong>${escapeHtml(input.dateOfJoining)}</div>` : ""}
    ${input.pan ? `<div><strong>PAN</strong>${escapeHtml(input.pan)}</div>` : ""}
    ${input.bankAccountMasked ? `<div><strong>Bank account</strong>${escapeHtml(input.bankAccountMasked)}</div>` : ""}
    ${input.workingDays !== undefined ? `<div><strong>Working days</strong>${input.workingDays}</div>` : ""}
    ${input.paidDays !== undefined ? `<div><strong>Paid days</strong>${input.paidDays}</div>` : ""}
    ${input.lopDays !== undefined ? `<div><strong>Loss of pay</strong>${input.lopDays}</div>` : ""}
  </div>
  <div class="cols">
    <table><thead><tr><th>Earnings</th><th class="num">Amount</th></tr></thead>
      <tbody>${input.earnings.map((row) => rowHtml(row, currency)).join("")}</tbody>
      <tfoot><tr><td>Gross earnings</td><td class="num">${escapeHtml(fmt(grossEarnings, currency))}</td></tr></tfoot>
    </table>
    <table><thead><tr><th>Deductions</th><th class="num">Amount</th></tr></thead>
      <tbody>${input.deductions.map((row) => rowHtml(row, currency)).join("") || `<tr><td>None</td><td class="num">${escapeHtml(fmt(0, currency))}</td></tr>`}</tbody>
      <tfoot><tr><td>Total deductions</td><td class="num">${escapeHtml(fmt(totalDeductions, currency))}</td></tr></tfoot>
    </table>
  </div>
  ${
    employerContributions.length > 0
      ? `<table><thead><tr><th>Employer contributions (not deducted from pay)</th><th class="num">Amount</th></tr></thead>
        <tbody>${employerContributions.map((row) => rowHtml(row, currency)).join("")}</tbody></table>`
      : ""
  }
  <div class="net"><span>Net pay</span><span>${escapeHtml(fmt(netPay, currency))}</span></div>
  <p class="muted" style="margin-top:18px">This is a system-generated payslip. Figures are as entered by the employer. QUICKKIT processed this document in your browser and did not store or transmit it.</p>
</div>
</body></html>`;

  const textLines = [
    `${input.companyName}${input.companyAddress ? ` — ${input.companyAddress}` : ""}`,
    `Payslip for ${input.payPeriod}`,
    "",
    `Employee: ${input.employeeName}`,
    input.employeeId ? `Employee ID: ${input.employeeId}` : "",
    input.designation ? `Designation: ${input.designation}` : "",
    input.department ? `Department: ${input.department}` : "",
    input.dateOfJoining ? `Date of joining: ${input.dateOfJoining}` : "",
    input.pan ? `PAN: ${input.pan}` : "",
    "",
    "EARNINGS",
    ...input.earnings.map(
      (row) => `  ${row.label}: ${fmt(row.amount, currency)}`,
    ),
    `  Gross earnings: ${fmt(grossEarnings, currency)}`,
    "",
    "DEDUCTIONS",
    ...(input.deductions.length > 0
      ? input.deductions.map(
          (row) => `  ${row.label}: ${fmt(row.amount, currency)}`,
        )
      : ["  None"]),
    `  Total deductions: ${fmt(totalDeductions, currency)}`,
    "",
    ...(employerContributions.length > 0
      ? [
          "EMPLOYER CONTRIBUTIONS (not deducted from pay)",
          ...employerContributions.map(
            (row) => `  ${row.label}: ${fmt(row.amount, currency)}`,
          ),
          "",
        ]
      : []),
    `NET PAY: ${fmt(netPay, currency)}`,
    "",
    "Generated in the browser. Not stored or transmitted.",
  ].filter((line) => line !== "");

  return {
    html,
    text: textLines.join("\n"),
    grossEarnings,
    totalDeductions,
    netPay,
    employerCost,
    issues,
    balanced: Math.abs(grossEarnings - totalDeductions - netPay) < 0.01,
  };
}

function rowHtml(
  row: { label: string; amount: number },
  currency: string,
): string {
  return `<tr><td>${escapeHtml(row.label)}</td><td class="num">${escapeHtml(fmt(row.amount, currency))}</td></tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letters
// ─────────────────────────────────────────────────────────────────────────────

export type LetterKind =
  | "offer"
  | "experience"
  | "relieving"
  | "warning"
  | "appreciation"
  | "increment"
  | "termination"
  | "internship";

export const LETTER_META: Record<
  LetterKind,
  {
    name: string;
    description: string;
    needsCompanySeal: boolean;
    caution?: string;
  }
> = {
  offer: {
    name: "Offer letter",
    description:
      "Offer of employment with designation, compensation, joining date and conditions. A conditional offer states its conditions explicitly.",
    needsCompanySeal: true,
    caution:
      "An offer is a legal document. Have your employment counsel review the terms before issuing — this template gives structure and required fields, not legal wording.",
  },
  experience: {
    name: "Experience letter",
    description:
      "Confirms the dates, designation and responsibilities you actually held. Never states performance opinions.",
    needsCompanySeal: true,
    caution:
      "Only state facts that are on record. An experience letter is relied on by future employers and by courts.",
  },
  relieving: {
    name: "Relieving letter",
    description:
      "States that the employee has been relieved of duties and the last working day, usually issued after full and final settlement.",
    needsCompanySeal: true,
    caution:
      "Issue only after the exit formalities that your policy requires are actually complete.",
  },
  warning: {
    name: "Warning letter",
    description:
      "Records a specific conduct or performance issue, the standard breached, the improvement expected and the deadline.",
    needsCompanySeal: false,
    caution:
      "Disciplinary documents carry legal weight. Most jurisdictions and Indian state Shops Acts require due process — an opportunity to respond — before a warning becomes a penalty.",
  },
  appreciation: {
    name: "Appreciation letter",
    description:
      "Recognises a specific contribution with enough detail to be meaningful.",
    needsCompanySeal: false,
  },
  increment: {
    name: "Increment letter",
    description:
      "States the revised compensation, the effective date and the new CTC, with the components that changed.",
    needsCompanySeal: true,
    caution:
      "Check that the revised structure still meets PF/ESI/gratuity obligations and any minimum-wage requirement in your state.",
  },
  termination: {
    name: "Termination letter",
    description:
      "Ends employment stating the clause relied on, the effective date and the notice or pay in lieu.",
    needsCompanySeal: true,
    caution:
      "Termination carries the highest legal risk of any HR letter. Nothing here substitutes for counsel, and several Indian states require specific process for certain categories of worker.",
  },
  internship: {
    name: "Internship certificate",
    description:
      "Confirms the internship period, the work performed and the learning outcomes.",
    needsCompanySeal: true,
  },
};

export type LetterInput = {
  kind: LetterKind;
  companyName: string;
  companyAddress?: string;
  employeeName: string;
  designation: string;
  date: string;
  /** Free-text facts, keyed by the letter's own fields. */
  fields: Record<string, string>;
  signatoryName: string;
  signatoryDesignation: string;
  referenceNumber?: string;
};

/**
 * Render a letter from a template whose statements are all fact slots.
 *
 * Length and tone vary by kind because a warning letter and an appreciation
 * letter are not the same document with different adjectives. Each template
 * states the fields it needs; anything the user leaves blank appears as a
 * visible placeholder.
 */
export function buildLetter(input: LetterInput): {
  text: string;
  html: string;
  missingFields: string[];
  cautions: string[];
} {
  const greeting =
    input.fields.salutation?.trim() || `Dear ${input.employeeName},`;
  const date = input.date?.trim() || slot("date");
  const ref = input.referenceNumber?.trim() || slot("reference number");

  const header = [
    input.companyName || slot("company name"),
    input.companyAddress ?? "",
    "",
    `Ref: ${ref}`,
    `Date: ${date}`,
    "",
    `To: ${input.employeeName || slot("employee name")}`,
    `Designation: ${input.designation || slot("designation")}`,
    "",
    `Subject: ${LETTER_META[input.kind].name} — ${input.designation || slot("designation")}`,
    "",
    greeting,
    "",
  ]
    .filter((line, index) => line !== "" || index < 6)
    .join("\n");

  const f = input.fields;
  const bodies: Record<LetterKind, string[]> = {
    offer: [
      `We are pleased to offer you the position of ${f.role || slot("role")} at ${input.companyName || slot("company name")}, reporting to ${f.reportingTo || slot("reporting manager")}.`,
      `Your annual cost to company will be ${f.ctc || slot("annual CTC")}, payable monthly in accordance with the salary structure attached as Annexure A.`,
      `Your date of joining will be ${f.joiningDate || slot("joining date")} at ${f.location || slot("work location")}.`,
      `This offer is subject to the following conditions: ${f.conditions || slot("conditions (e.g. reference check, documents verification)")}.`,
      `Your employment will be governed by ${f.contractRef || slot("appointment letter / company policy reference")}, which contains the confidentiality, intellectual-property, notice-period and code-of-conduct terms.`,
      `This offer remains valid until ${f.validUntil || slot("offer validity date")}. To accept, sign and return the duplicate copy of this letter.`,
    ],
    experience: [
      `This is to certify that ${input.employeeName || slot("employee name")} was employed with ${input.companyName || slot("company name")} from ${f.startDate || slot("date of joining")} to ${f.endDate || slot("last working day")}.`,
      `During this period, they held the designation of ${input.designation || slot("designation")} in the ${f.department || slot("department")} department.`,
      `Their responsibilities included: ${f.responsibilities || slot("key responsibilities actually held")}.`,
      `This certificate is issued at their request and reflects the organisation's records. It makes no statement about performance.`,
    ],
    relieving: [
      `This is to confirm that ${input.employeeName || slot("employee name")} has been relieved of all duties as ${input.designation || slot("designation")} at ${input.companyName || slot("company name")}.`,
      `Their last working day was ${f.lastWorkingDay || slot("last working day")}.`,
      `Full and final settlement for the amount of ${f.fnfAmount || slot("full and final amount")} has been processed on ${f.fnfDate || slot("settlement date")}.`,
      `All company property, documents and access credentials have been returned.`,
      `We wish them success in future endeavours.`,
    ],
    warning: [
      `This letter records a formal warning regarding ${f.issue || slot("specific issue")}.`,
      `The specific incident occurred on ${f.incidentDate || slot("date of incident")} and is described as follows: ${f.description || slot("factual description of what happened")}.`,
      `This conduct conflicts with ${f.policyRef || slot("policy clause or code of conduct section")} of our ${f.policyName || slot("policy name")}.`,
      `You are required to improve ${f.improvement || slot("the specific behaviour to change")} by ${f.deadline || slot("deadline")}.`,
      `Failure to improve may result in further action up to and including termination, in accordance with company policy and applicable law.`,
      `You may respond to this warning in writing by ${f.responseDeadline || slot("response deadline")}.`,
    ],
    appreciation: [
      `On behalf of ${input.companyName || slot("company name")}, I want to acknowledge ${f.contribution || slot("the specific contribution")}.`,
      `This work took place during ${f.period || slot("time period")} and mattered because ${f.impact || slot("the concrete impact")}.`,
      `Thank you for ${f.quality || slot("what the person did well")}. It sets a good standard for the team.`,
    ],
    increment: [
      `Following your ${f.reviewCycle || slot("review cycle")} review, we are pleased to confirm a revision to your compensation effective ${f.effectiveDate || slot("effective date")}.`,
      `Your annual cost to company increases from ${f.previousCtc || slot("previous CTC")} to ${f.revisedCtc || slot("revised CTC")}, an increase of ${f.increase || slot("increase amount and percentage")}.`,
      `The revised salary structure is set out in Annexure A. Monthly contributions to ${f.statutoryComponents || slot("PF / ESI / PT as applicable")} will be recalculated on the revised structure.`,
      `All other terms of your employment remain unchanged.`,
    ],
    termination: [
      `This letter confirms the termination of your employment as ${input.designation || slot("designation")} with ${input.companyName || slot("company name")}, effective ${f.effectiveDate || slot("effective date")}.`,
      `This action is taken under ${f.clauseRef || slot("contract clause relied on")}.`,
      `Your last working day will be ${f.lastWorkingDay || slot("last working day")}. You will receive ${f.noticePay || slot("notice period or pay in lieu")} in accordance with your contract.`,
      `Full and final settlement, including ${f.settlementItems || slot("settlement items")}, will be processed by ${f.settlementDate || slot("settlement date")}.`,
      `You are reminded of your continuing obligations under the confidentiality and intellectual-property clauses of your appointment letter.`,
    ],
    internship: [
      `This is to certify that ${input.employeeName || slot("intern name")} completed an internship with ${input.companyName || slot("company name")} from ${f.startDate || slot("start date")} to ${f.endDate || slot("end date")}.`,
      `They worked with the ${f.department || slot("department")} team on ${f.project || slot("project or area")}.`,
      `Their work involved ${f.responsibilities || slot("specific tasks")}, and the outcomes included ${f.outcomes || slot("what was delivered")}.`,
      `This certificate is issued at their request for the purpose of ${f.purpose || slot("purpose (e.g. academic credit, job application)")}.`,
    ],
  };

  const footer = [
    "",
    `Sincerely,`,
    "",
    input.signatoryName || slot("signatory name"),
    input.signatoryDesignation || slot("signatory designation"),
    input.companyName || slot("company name"),
    LETTER_META[input.kind].needsCompanySeal
      ? "(Company seal)"
      : "(No company seal required)",
    "",
    `Acknowledged by ${input.employeeName || slot("employee name")}: ${slot("signature")}  Date: ${slot("date of acknowledgement")}`,
  ];

  const body = bodies[input.kind];
  const text = [header, ...body.map((line) => `${line}\n`), ...footer].join(
    "\n",
  );
  const missingFields = unresolvedSlots(text);
  const cautions = LETTER_META[input.kind].caution
    ? [LETTER_META[input.kind].caution!]
    : [];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(LETTER_META[input.kind].name)} — ${escapeHtml(input.employeeName)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: ui-serif, Georgia, "Times New Roman", serif; margin: 0; padding: 40px 24px; background: #fff; color: #14161a; }
  .sheet { max-width: 720px; margin: 0 auto; line-height: 1.65; font-size: 15px; }
  .head { border-bottom: 1px solid #d8dbe0; padding-bottom: 14px; margin-bottom: 22px; }
  .head h1 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 17px; margin: 0; letter-spacing: -.01em; }
  .head p { margin: 2px 0 0; font-size: 12px; color: #5b616b; font-family: ui-sans-serif, system-ui, sans-serif; }
  .subject { font-weight: 700; margin: 22px 0; }
  p { margin: 0 0 13px; }
  .sign { margin-top: 36px; }
  .placeholder { background: #fef3c7; padding: 0 2px; border-radius: 2px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="sheet">
  <div class="head">
    <h1>${escapeHtml(input.companyName || slot("company name"))}</h1>
    ${input.companyAddress ? `<p>${escapeHtml(input.companyAddress)}</p>` : ""}
    <p>Ref: ${escapeHtml(ref)} &nbsp;·&nbsp; Date: ${escapeHtml(date)}</p>
  </div>
  <p>To<br>${escapeHtml(input.employeeName || slot("employee name"))}<br>${escapeHtml(input.designation || slot("designation"))}</p>
  <p class="subject">${escapeHtml(LETTER_META[input.kind].name)}</p>
  <p>${escapeHtml(greeting)}</p>
  ${body.map((line) => `<p>${highlightSlots(escapeHtml(line))}</p>`).join("\n  ")}
  <div class="sign">
    <p>Sincerely,</p>
    <p>${escapeHtml(input.signatoryName || slot("signatory name"))}<br>
    ${escapeHtml(input.signatoryDesignation || slot("signatory designation"))}<br>
    ${escapeHtml(input.companyName || slot("company name"))}</p>
    <p>${escapeHtml(LETTER_META[input.kind].needsCompanySeal ? "(Company seal)" : "(No company seal required)")}</p>
  </div>
  <p style="margin-top:32px;font-size:13px;color:#5b616b">Acknowledged by ${escapeHtml(input.employeeName || slot("employee name"))}: ${slot("signature")} &nbsp; Date: ${slot("date")}</p>
  <p style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;color:#6b7280;margin-top:26px">Generated locally in your browser. Not stored or transmitted. Review by your legal or HR counsel is recommended before issue.</p>
</div>
</body></html>`;

  return { text, html, missingFields, cautions };
}

const highlightSlots = (html: string): string =>
  html.replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based people-document generators
// ─────────────────────────────────────────────────────────────────────────────

export type JdInput = {
  role: string;
  seniority: "intern" | "junior" | "mid" | "senior" | "lead";
  department?: string;
  location?: string;
  workMode?: "onsite" | "hybrid" | "remote";
  responsibilities: string[];
  mustHave: string[];
  niceToHave: string[];
  /** Set when the employer is willing to state a range. */
  salaryRange?: string;
};

/**
 * Assemble a job description from the employer's own lists.
 *
 * The tool does not invent responsibilities or requirements — those are the two
 * things that make a JD legally meaningful and practically useful. It orders
 * them by seniority expectation and adds the sections a JD is expected to have
 * (scope, requirements, what the process looks like), flagging gaps.
 */
export function buildJobDescription(input: JdInput): {
  text: string;
  issues: string[];
  wordCount: number;
} {
  const issues: string[] = [];
  const responsibilities = input.responsibilities
    .map((item) => item.trim())
    .filter(Boolean);
  const mustHave = input.mustHave.map((item) => item.trim()).filter(Boolean);
  const niceToHave = input.niceToHave
    .map((item) => item.trim())
    .filter(Boolean);

  if (!input.role.trim())
    issues.push("Add the role title — it is what candidates search for.");
  if (responsibilities.length < 3) {
    issues.push(
      "Fewer than three responsibilities. A JD that only lists requirements reads as a wish list, not a job.",
    );
  }
  if (mustHave.length > 10) {
    issues.push(
      `${mustHave.length} must-have requirements. Long lists measurably reduce applications from qualified people, who assume they will not check every box.`,
    );
  }
  if (!input.salaryRange) {
    issues.push(
      "No salary range. If you can publish one, do — it is the single most-requested item in candidate surveys, and leaving it out costs applications. If you cannot, that is a decision, not an omission.",
    );
  }
  if (
    mustHave.some((item) => /\b(10\+|15\+) years\b/i.test(item)) &&
    input.seniority !== "lead"
  ) {
    issues.push(
      "A decade-plus experience requirement in a non-lead role often excludes strong candidates unnecessarily.",
    );
  }

  const seniorityLabel = {
    intern: "Intern",
    junior: "Junior",
    mid: "Mid-level",
    senior: "Senior",
    lead: "Lead",
  }[input.seniority];

  const modeLine =
    input.workMode === "remote"
      ? "Fully remote"
      : input.workMode === "hybrid"
        ? "Hybrid — some days on site each week"
        : input.workMode === "onsite"
          ? "On site"
          : "";

  const sections = [
    `${input.role || slot("role title")}${input.department ? ` — ${input.department}` : ""}`,
    `${seniorityLabel}${input.location ? ` · ${input.location}` : ""}${modeLine ? ` · ${modeLine}` : ""}`,
    "",
    "ABOUT THE ROLE",
    `We are hiring a ${input.role || slot("role title")}${input.department ? ` for our ${input.department} team` : ""}. This section should say, in two or three sentences, what the person will own and why the role exists now. ${slot("two sentences on the team, the problem, and why this role")}`,
    "",
    "WHAT YOU WILL DO",
    ...(responsibilities.length > 0
      ? responsibilities.map((item) => `• ${item}`)
      : [`• ${slot("responsibility")}`]),
    "",
    "WHAT WE REQUIRE",
    ...(mustHave.length > 0
      ? mustHave.map((item) => `• ${item}`)
      : [`• ${slot("must-have requirement")}`]),
    ...(niceToHave.length > 0
      ? ["", "NICE TO HAVE", ...niceToHave.map((item) => `• ${item}`)]
      : []),
    "",
    input.salaryRange
      ? `COMPENSATION\n${input.salaryRange}`
      : "COMPENSATION\n" +
        slot("salary range, or a sentence explaining how it is set"),
    "",
    "HOW TO APPLY",
    `${slot("what to send")} to ${slot("contact or application link")}. We review applications within ${slot("timeframe")} and tell every applicant the outcome.`,
    "",
    `${input.role || slot("company")} is an equal-opportunity employer. We assess candidates on the requirements above.`,
  ];

  const text = sections.join("\n");
  return { text, issues, wordCount: text.split(/\s+/).filter(Boolean).length };
}

export type KpiInput = {
  role: string;
  focus:
    "sales" | "support" | "engineering" | "marketing" | "operations" | "hr";
  period: "monthly" | "quarterly" | "annual";
  /** Metrics the manager already knows they care about. */
  metrics: { name: string; target: string; weight: number }[];
};

/**
 * Structure a KPI sheet from the metrics the manager supplies.
 *
 * It does not propose targets. A target without local data is a guess, and a
 * guessed target becomes an unfair performance review. What it does is enforce
 * that weights sum to 100, that each metric has a measurable target, and that
 * fewer than six metrics are used — the usual cause of an unmanageable scorecard.
 */
export function buildKpiSheet(input: KpiInput): {
  text: string;
  totalWeight: number;
  issues: string[];
} {
  const issues: string[] = [];
  const rows = input.metrics.filter((metric) => metric.name.trim());
  const totalWeight = rows.reduce(
    (sum, row) => sum + (Number(row.weight) || 0),
    0,
  );

  if (rows.length === 0) issues.push("Add at least one metric.");
  if (rows.length > 6) {
    issues.push(
      `${rows.length} metrics is a lot to track honestly. Six or fewer keeps the review focused.`,
    );
  }
  if (Math.round(totalWeight) !== 100) {
    issues.push(`Weights sum to ${Math.round(totalWeight)}%, not 100%.`);
  }
  for (const row of rows) {
    if (!row.target.trim()) {
      issues.push(
        `"${row.name}" has no target. A metric without a target cannot be reviewed.`,
      );
    }
  }

  const periodLabel = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
  }[input.period];

  const text = [
    `${periodLabel} KPI sheet — ${input.role || slot("role")}`,
    `Review period: ${slot("start date")} to ${slot("end date")}`,
    "",
    "| Metric | Target | Weight | How it is measured |",
    "| --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.name} | ${row.target || slot("target")} | ${row.weight || 0}% | ${slot("data source and formula")} |`,
    ),
    `| **Total** | | **${Math.round(totalWeight)}%** | |`,
    "",
    "HOW THIS IS REVIEWED",
    `• Progress is discussed ${input.period === "monthly" ? "monthly" : input.period === "quarterly" ? "quarterly" : "annually"} against the targets above.`,
    "• Targets are reviewed when the underlying conditions change materially — a target set against a market that moved is not a fair measure.",
    `• Anything outside this sheet is out of scope for the formal review. Extra work is recognised separately.`,
    "",
    `Employee: ${slot("name")}   Manager: ${slot("name")}   Date: ${slot("date")}`,
    "",
    "Measurement notes:",
    ...rows.map(
      (row) => `• ${row.name}: ${slot(`data source for ${row.name}`)}`,
    ),
  ].join("\n");

  return { text, totalWeight, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interview question bank — deterministic, by competency
// ─────────────────────────────────────────────────────────────────────────────

export const INTERVIEW_BANK: Record<string, string[]> = {
  "problem solving": [
    "Describe a problem you solved that had more than one plausible answer. How did you choose?",
    "Tell me about a decision you made with incomplete information. What did you do to reduce the risk?",
    "What is the hardest bug or failure you have personally diagnosed? Walk me through how you found it.",
  ],
  collaboration: [
    "Tell me about a disagreement with a colleague that you did not resolve. What happened next?",
    "Describe a time you had to rely on someone who was not delivering. What did you do?",
    "What is the most useful feedback you have received? What did you change?",
  ],
  ownership: [
    "Describe something you shipped end to end. What did you decide without asking?",
    "Tell me about a commitment you missed. What did you do when you realised?",
    "What is something in your last role that you fixed before anyone asked?",
  ],
  communication: [
    "Explain something technical you know well to someone who is not technical.",
    "Tell me about a time you had to deliver bad news. How did you frame it?",
    "How do you write a status update that a busy person will actually read?",
  ],
  "learning agility": [
    "What have you learned in the last six months that changed how you work?",
    "Describe a time you were wrong about something important. How did you find out?",
    "What would you need to learn to do this role well, and how would you learn it?",
  ],
  leadership: [
    "How do you decide what your team should not work on?",
    "Tell me about someone you mentored. What specifically did you do?",
    "Describe a time you had to hold a standard when it was unpopular.",
  ],
};

export type InterviewPlan = {
  questions: { competency: string; question: string; lookingFor: string }[];
  issues: string[];
};

/**
 * Build an interview plan from competencies, and say what each question is
 * actually testing.
 *
 * Fixed bank, no generation: a question whose expected answer nobody defined is
 * how interviews become vibes. Each row carries `lookingFor`, which the
 * interviewer must fill in for their own context.
 */
export function buildInterviewPlan(input: {
  role: string;
  competencies: string[];
  questionsPerCompetency?: number;
}): InterviewPlan {
  const per = Math.min(3, Math.max(1, input.questionsPerCompetency ?? 2));
  const issues: string[] = [];
  const questions: InterviewPlan["questions"] = [];

  for (const competency of input.competencies) {
    const bank = INTERVIEW_BANK[competency.toLowerCase()] ?? [];
    if (bank.length === 0) {
      issues.push(
        `No question bank for "${competency}". Available: ${Object.keys(INTERVIEW_BANK).join(", ")}.`,
      );
      continue;
    }
    for (const question of bank.slice(0, per)) {
      questions.push({
        competency,
        question,
        lookingFor: `What a strong answer shows: ${slot(`evidence of ${competency} for a ${input.role || "this role"}`)} — define this before the interview, not after.`,
      });
    }
  }

  if (input.competencies.length === 0)
    issues.push("Select at least one competency.");
  if (input.competencies.length > 4) {
    issues.push(
      "More than four competencies in one interview makes scoring inconsistent.",
    );
  }

  return { questions, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Holidays and policy helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Annual leave entitlement under the Factories Act basis: one day of leave for
 * every 20 days worked. Most state Shops & Establishments Acts follow a similar
 * formula with different constants, so the constant is an input.
 */
export function statutoryLeave(input: {
  daysWorked: number;
  daysPer: number;
}): { entitled: number; notes: string[] } {
  const daysPer = Math.max(1, input.daysPer);
  return {
    entitled: Math.floor(Math.max(0, input.daysWorked) / daysPer),
    notes: [
      "The Factories Act basis is one day for every 20 days worked. State Shops & Establishments Acts set their own formulas and caps — check the Act that applies to your establishment.",
      "Company policy may be more generous; the statutory figure is a floor, not a target.",
    ],
  };
}

/** Push a date by a number of working days, skipping weekends and holidays. */
export function addBusinessDays(input: {
  from: string;
  days: number;
  holidays?: string[];
}): { date: string; skipped: string[] } {
  const start = new Date(input.from);
  if (Number.isNaN(start.getTime())) return { date: "", skipped: [] };
  const holidays = new Set(input.holidays ?? []);
  const skipped: string[] = [];
  let remaining = Math.abs(Math.trunc(input.days));
  const direction = input.days >= 0 ? 1 : -1;
  const cursor = new Date(start);
  let guard = 0;
  while (remaining > 0 && guard < 4000) {
    guard++;
    cursor.setDate(cursor.getDate() + direction);
    const iso = cursor.toISOString().slice(0, 10);
    if (cursor.getDay() === 0 || cursor.getDay() === 6 || holidays.has(iso)) {
      skipped.push(iso);
      continue;
    }
    remaining--;
  }
  return { date: cursor.toISOString().slice(0, 10), skipped };
}

/** Probation end date, with extension handled explicitly. */
export function probationEnd(input: {
  joiningDate: string;
  probationMonths: number;
  extensionMonths?: number;
}): { endDate: string; extendedDate: string | null; notes: string[] } {
  const start = new Date(input.joiningDate);
  if (Number.isNaN(start.getTime()))
    return { endDate: "", extendedDate: null, notes: [] };
  const end = new Date(start);
  end.setMonth(end.getMonth() + Math.max(0, input.probationMonths));
  end.setDate(end.getDate() - 1);
  const notes = [
    "Probation length is a contract term, not a statutory constant. Some state rules limit it — check the applicable Shops Act.",
    "Confirming or extending probation in writing before it expires matters: in some jurisdictions silence can be read as confirmation.",
  ];
  let extended: string | null = null;
  if (input.extensionMonths && input.extensionMonths > 0) {
    const ext = new Date(end);
    ext.setMonth(ext.getMonth() + input.extensionMonths);
    extended = ext.toISOString().slice(0, 10);
  }
  return {
    endDate: end.toISOString().slice(0, 10),
    extendedDate: extended,
    notes,
  };
}
