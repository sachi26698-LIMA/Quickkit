/**
 * Attendance, overtime, leave and shift arithmetic.
 *
 * Pure functions again — the point is that a leave balance or an overtime
 * payout is checkable by hand, so these are the most-tested part of the HR
 * category rather than the most-decorated.
 *
 * ## Overtime: why the multipliers are inputs, not constants
 *
 * The Factories Act sets a 9-hour day / 48-hour week and requires overtime at
 * **twice** the ordinary rate. The Code on Wages (2019) uses a **derived** rate:
 * the ordinary rate of wages is total remuneration ÷ (hours actually worked in
 * the month), and overtime is twice that. Neither is "1.5×". Many private
 * employers simply pay 1.5× as a policy choice, which is lawful only if it is
 * at least the statutory minimum in the establishments the Act covers.
 *
 * So the multiplier is an explicit input with the statutory position stated in
 * the UI, and the result reports the daily/hourly basis it used. The tool never
 * quietly assumes a multiplier and calls the answer "correct" — it shows the
 * arithmetic so a payroll team can defend or correct it.
 */

export type OvertimeBasis = "hourly" | "daily";

export type OvertimeInput = {
  /** Monthly gross (or basic+DA, depending on company policy — stated in UI). */
  monthlyWage: number;
  /** Contracted working days in the month. */
  workingDays: number;
  /** Contracted hours per day. */
  hoursPerDay: number;
  /** Overtime hours actually worked in the month. */
  overtimeHours: number;
  /** Multiplier applied to the ordinary rate (2 = Factories Act). */
  multiplier: number;
};

export type OvertimeResult = {
  hourlyRate: number;
  dailyRate: number;
  overtimeRate: number;
  overtimePay: number;
  normalPay: number;
  totalPay: number;
  /** Hours beyond the 48-hour statutory week implied by the inputs. */
  weeklyHours: number;
  exceedsWeeklyLimit: boolean;
  /** Overtime hours beyond the 50-hour quarterly cap, if it applies. */
  notes: string[];
};

/**
 * Overtime pay on a monthly-wage basis.
 *
 * Hourly rate = monthly wage ÷ (working days × hours per day). This is the
 * divisor most Indian payroll systems use and is the one the code's "hours
 * actually worked" formula reduces to for a normal month.
 */
export function overtime(input: OvertimeInput): OvertimeResult {
  const days = Math.max(1, input.workingDays);
  const hours = Math.min(24, Math.max(1, input.hoursPerDay));
  const monthlyWage = Math.max(0, input.monthlyWage);
  const otHours = Math.max(0, input.overtimeHours);
  const multiplier = Math.max(1, input.multiplier);

  const hourlyRate = monthlyWage / (days * hours);
  const dailyRate = monthlyWage / days;
  const overtimeRate = hourlyRate * multiplier;
  const overtimePay = overtimeRate * otHours;
  const normalPay = monthlyWage;
  const weeklyHours = hours * (days / (365 / 12 / 7)); // working days → week
  // A month averages ~4.345 weeks; a 6-day week at 8 hours is 48 hours.
  const weeklyHoursFromSchedule = hours * Math.min(7, Math.round(days / 4.345));

  const notes: string[] = [];
  if (weeklyHoursFromSchedule > 48) {
    notes.push(
      `A schedule of ${hours} hours × ${Math.min(7, Math.round(days / 4.345))} days is ${weeklyHoursFromSchedule} hours a week, above the 48-hour weekly limit in the Factories Act and Code on Wages.`,
    );
  }
  if (multiplier < 2) {
    notes.push(
      "The Factories Act requires overtime at twice the ordinary rate, and the Code on Wages derives the ordinary rate from hours actually worked. A multiplier below 2 is only lawful where a state rule or a genuinely more favourable contract allows it — check yours before relying on this figure.",
    );
  }
  if (otHours > 50) {
    notes.push(
      "Overtime is capped at 50 hours in a quarter in most states; 50+ hours in one month needs a state exemption.",
    );
  }

  return {
    hourlyRate,
    dailyRate,
    overtimeRate,
    overtimePay,
    normalPay,
    totalPay: normalPay + overtimePay,
    weeklyHours: Math.round(weeklyHours * 10) / 10,
    exceedsWeeklyLimit: weeklyHoursFromSchedule > 48,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance percentage
// ─────────────────────────────────────────────────────────────────────────────

export type AttendanceInput = {
  workingDays: number;
  presentDays: number;
  paidLeaveDays?: number;
  /** Half days count as 0.5 by default. */
  halfDays?: number;
  absentDays?: number;
  holidays?: number;
  /** Deduct late marks beyond this many per month. */
  lateMarks?: number;
  lateMarksAllowed?: number;
  /** Each excess late mark converts to this many day-fractions. */
  latePenaltyDays?: number;
};

export type AttendanceResult = {
  /** Present + paid leave + half days, over the working days. */
  attendancePercent: number;
  payableDays: number;
  lopDays: number;
  /** Present ÷ payable base, excluding paid leave. */
  rawPresentPercent: number;
  latePenaltyDays: number;
  breakdown: { label: string; days: number }[];
  notes: string[];
};

/**
 * Attendance percentage and loss-of-pay days.
 *
 * Two percentages matter and employers conflate them:
 *
 * - **Attendance %** — days the employee was available (present + paid leave +
 *   half days) over working days. This is what an HR dashboard means.
 * - **Present %** — days actually worked over the same base. This is what a
 *   payroll deduction must use.
 *
 * Returning both prevents the classic error of paying full salary for a month
 * where 4 of 22 days were unpaid absence because "attendance was 82%".
 */
export function attendance(input: AttendanceInput): AttendanceResult {
  const workingDays = Math.max(0, input.workingDays);
  const present = Math.max(0, input.presentDays);
  const paidLeave = Math.max(0, input.paidLeaveDays ?? 0);
  const halfDays = Math.max(0, input.halfDays ?? 0);
  const absent = Math.max(0, input.absentDays ?? 0);
  const holidays = Math.max(0, input.holidays ?? 0);

  const lateMarks = Math.max(0, input.lateMarks ?? 0);
  const allowed = Math.max(0, input.lateMarksAllowed ?? 3);
  const penaltyPerMark = Math.max(0, input.latePenaltyDays ?? 0.5);
  const latePenaltyDays = Math.max(0, lateMarks - allowed) * penaltyPerMark;

  const halfDayValue = halfDays * 0.5;
  const payableDays = Math.max(
    0,
    present + paidLeave + halfDayValue - latePenaltyDays,
  );
  const lopDays = Math.max(0, workingDays - payableDays);
  const base = workingDays > 0 ? workingDays : 1;

  const notes: string[] = [];
  if (holidays > 0) {
    notes.push(
      `${holidays} declared holiday${holidays === 1 ? "" : "s"} are paid and are not counted as working days here; enter only working days in the denominator.`,
    );
  }
  if (present + absent + paidLeave + halfDays > workingDays) {
    notes.push(
      "Present, absent, half and leave days add up to more than the working days. Check the month's declared working days.",
    );
  }

  return {
    attendancePercent: (payableDays / base) * 100,
    payableDays,
    lopDays,
    rawPresentPercent: (present / base) * 100,
    latePenaltyDays,
    breakdown: [
      { label: "Present", days: present },
      { label: "Paid leave", days: paidLeave },
      { label: "Half days (as 0.5 each)", days: halfDayValue },
      { label: "Late-mark penalty", days: -latePenaltyDays },
      { label: "Absent", days: absent },
      { label: "Declared holidays", days: holidays },
    ],
    notes,
  };
}

/** Salary deduction for loss-of-pay days, on a chosen day-rate basis. */
export function lossOfPayDeduction(input: {
  monthlyWage: number;
  workingDays: number;
  lopDays: number;
}): { dayRate: number; deduction: number; netPayable: number } {
  const days = Math.max(1, input.workingDays);
  const dayRate = Math.max(0, input.monthlyWage) / days;
  const deduction = dayRate * Math.max(0, input.lopDays);
  return {
    dayRate,
    deduction,
    netPayable: Math.max(0, input.monthlyWage - deduction),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Leave balance
// ─────────────────────────────────────────────────────────────────────────────

export type LeaveAccrualInput = {
  /** Annual entitlement under the company policy or the state Shops Act. */
  annualEntitlement: number;
  /** Accrual method: monthly 1/12 of entitlement, or a fixed yearly credit. */
  method: "monthly" | "annual";
  monthsElapsed: number;
  /** Leave already taken this year. */
  taken: number;
  /** Opening balance carried from last year. */
  openingBalance?: number;
  /** Maximum carry-forward the policy allows. */
  maxCarryForward?: number;
  /** Whether unused leave is encashed at year end. */
  encashable?: boolean;
};

export type LeaveAccrualResult = {
  accrued: number;
  available: number;
  balance: number;
  /** Projected balance if no further leave is taken. */
  projectedYearEnd: number;
  carryForwardAfterCap: number;
  forfeited: number;
  encashmentValueDays: number;
  notes: string[];
};

/**
 * Leave balance under the two common accrual methods.
 *
 * India has no single national annual-leave entitlement: the Factories Act gives
 * one day per 20 days worked, most state Shops & Establishments Acts set 12–21
 * days, and company policy often exceeds both. The entitlement is therefore an
 * input, and the result states which method produced the number.
 */
export function leaveBalance(input: LeaveAccrualInput): LeaveAccrualResult {
  const entitlement = Math.max(0, input.annualEntitlement);
  const months = Math.min(12, Math.max(0, input.monthsElapsed));
  const accrued =
    input.method === "monthly"
      ? (entitlement / 12) * months
      : months >= 12
        ? entitlement
        : 0;
  const opening = Math.max(0, input.openingBalance ?? 0);
  const taken = Math.max(0, input.taken);
  const available = accrued + opening;
  const balance = available - taken;
  const projectedYearEnd = entitlement + opening - taken;

  const cap = Math.max(0, input.maxCarryForward ?? 0);
  const carryForwardAfterCap = Math.min(cap, Math.max(0, projectedYearEnd));
  const forfeited = Math.max(0, projectedYearEnd - carryForwardAfterCap);

  const notes: string[] = [];
  if (input.method === "annual" && months < 12) {
    notes.push(
      "Annual credit: the full entitlement lands at the start of the year, so accrued is shown as 0 until 12 months have elapsed.",
    );
  }
  if (forfeited > 0) {
    notes.push(
      `${Math.round(forfeited * 10) / 10} days exceed the carry-forward cap and lapse unless the policy allows encashment.`,
    );
  }
  if (!input.encashable) {
    notes.push(
      "Unused leave has no cash value under this policy; encashment value is shown as 0 rather than a made-up figure.",
    );
  }

  return {
    accrued: Math.round(accrued * 100) / 100,
    available: Math.round(available * 100) / 100,
    balance: Math.round(balance * 100) / 100,
    projectedYearEnd: Math.round(projectedYearEnd * 100) / 100,
    carryForwardAfterCap: Math.round(carryForwardAfterCap * 100) / 100,
    forfeited: Math.round(forfeited * 100) / 100,
    encashmentValueDays: input.encashable ? Math.max(0, projectedYearEnd) : 0,
    notes,
  };
}

/** Leave encashment at the basic+DA day rate, with the 30-day cap option. */
export function leaveEncashment(input: {
  monthlyBasicDa: number;
  workingDays: number;
  days: number;
  /** Some policies cap encashment at 30 days per year. */
  capAt30?: boolean;
}): { daysEncashed: number; dayRate: number; amount: number } {
  const days = Math.max(
    0,
    input.capAt30 ? Math.min(30, input.days) : input.days,
  );
  const dayRate =
    Math.max(0, input.monthlyBasicDa) / Math.max(1, input.workingDays);
  return { daysEncashed: days, dayRate, amount: days * dayRate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shifts and rosters
// ─────────────────────────────────────────────────────────────────────────────

export type Shift = {
  name: string;
  start: string; // "09:00"
  end: string; // "18:00"
  breakMinutes: number;
};

/** Minutes since midnight for an "HH:MM" string, or null when invalid. */
export function parseTime(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Paid duration of a shift, handling overnight shifts (e.g. 22:00–06:00) by
 * adding 24 hours when the end time is earlier than the start.
 */
export function shiftDuration(shift: Shift): number {
  const start = parseTime(shift.start);
  const end = parseTime(shift.end);
  if (start === null || end === null) return 0;
  let minutes = end - start;
  if (minutes <= 0) minutes += 24 * 60;
  return Math.max(0, minutes - Math.max(0, shift.breakMinutes));
}

/** Weekly hours for a rotation of shifts. */
export function weeklyHours(shifts: Shift[], daysPerWeek: number): number {
  if (shifts.length === 0) return 0;
  const total = shifts.reduce((sum, shift) => sum + shiftDuration(shift), 0);
  return (total / shifts.length / 60) * Math.min(7, Math.max(1, daysPerWeek));
}
