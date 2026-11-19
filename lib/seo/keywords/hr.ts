import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * HR & payroll cluster.
 *
 * Every phrasing is constrained by what the tool actually computes:
 *
 * - The salary tools apply the FY 2025-26 Indian slabs, the ₹15,000 PF wage
 *   ceiling and the ₹21,000 ESI gross limit, so a keyword may say "India" but
 *   none may claim a country other than India.
 * - `pf-calculator` and `esi-calculator` reuse the payroll engine's own headers,
 *   so "on 15000 basic" is true and "on 21000 gross" is true for ESI; neither
 *   claims an employer filing.
 * - The document tools assemble text from the facts entered. No keyword claims
 *   legal validity, e-signature or auto-filing.
 * - `income-tax-calculator` says "new regime vs old regime" because it computes
 *   both. It does not claim to file the return.
 *
 * The `india` group is present and substantial because this category is
 * genuinely searched with Indian statutory vocabulary (CTC, in-hand, PF, ESI,
 * gratuity, professional tax) — that is not invented localisation.
 */
export const hrKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "salary-calculator-india",
    primary: "salary calculator india",
    secondary: [
      "ctc to in hand salary",
      "monthly take home calculator",
      "salary breakup pf esi professional tax",
      "new regime vs old regime tax",
      "in hand salary for 12 lakh ctc",
    ],
    groups: {
      alternativeName: ["ctc calculator", "take home pay calculator"],
      synonym: [
        "convert ctc to monthly salary",
        "salary structure breakup calculator",
        "net salary from annual package",
      ],
      action: [
        "calculate in hand salary from ctc",
        "work out monthly salary after deductions",
        "split ctc into basic hra and allowances",
      ],
      longTail: [
        "how much in hand for 1200000 ctc",
        "monthly take home for 25 lakh package",
        "ctc breakup with employer pf and gratuity",
        "annual package to monthly credit calculator",
      ],
      problem: [
        "why is my in hand salary less than ctc",
        "salary offered in ctc but paid much less",
        "understanding deductions in payslip",
      ],
      question: [
        "how is in hand salary calculated from ctc",
        "what is the difference between ctc and take home",
        "does ctc include employer pf contribution",
      ],
      qualifier: [
        "free salary calculator india",
        "ctc calculator without login",
        "browser based salary calculator",
      ],
      india: [
        "ctc se in hand salary",
        "salary kitna milega 12 lakh package",
        "payslip deductions explained india",
      ],
    },
  },
  {
    slug: "in-hand-salary-calculator",
    primary: "reverse salary calculator",
    secondary: [
      "reverse ctc from take home",
      "net to gross salary calculator",
      "target monthly in hand",
      "salary to ask in interview",
      "take home to ctc reverse",
    ],
    groups: {
      alternativeName: ["net to gross calculator", "reverse ctc tool"],
      synonym: [
        "ctc needed for a given take home",
        "work back from net salary",
        "gross salary for a target net",
      ],
      action: [
        "find ctc for 100000 monthly in hand",
        "calculate package needed for a target salary",
        "reverse calculate ctc from monthly credit",
      ],
      longTail: [
        "what ctc gives 1 lakh in hand per month",
        "ctc required for 80000 take home",
        "annual package needed for 75000 monthly salary",
        "reverse salary calculation through tax slabs",
      ],
      problem: [
        "recruiter asks expected ctc unsure what to say",
        "want a fixed monthly credit after tax",
        "knowing net income before accepting offer",
      ],
      question: [
        "what ctc gives a given in hand salary",
        "how do i reverse calculate ctc from net",
        "is reverse salary calculation linear",
      ],
      qualifier: [
        "free reverse salary calculator",
        "ctc from take home without signup",
        "browser salary reverse tool",
      ],
      india: [
        "kitna ctc chahiye 1 lakh in hand ke liye",
        "expected ctc kaise batau",
        "net salary se ctc nikalna",
      ],
    },
  },
  {
    slug: "income-tax-calculator",
    primary: "income tax calculator",
    secondary: [
      "new regime vs old regime calculator",
      "income tax slab calculator india",
      "section 87a rebate calculator",
      "standard deduction 75000",
      "tax on 12 lakh salary",
    ],
    groups: {
      alternativeName: ["income tax estimator", "tax liability calculator"],
      synonym: [
        "slab wise tax calculation",
        "annual tax on salary income",
        "tax payable after deductions",
      ],
      action: [
        "compare new and old tax regime",
        "calculate tax on salary under both regimes",
        "apply standard deduction and 87a rebate",
      ],
      longTail: [
        "how much tax on 15 lakh salary new regime",
        "tax on 12 lakh income after rebate",
        "old regime tax with 80c and home loan",
        "which tax regime is better for 20 lakh",
      ],
      problem: [
        "not sure which tax regime to choose",
        "tax deducted seems higher than expected",
        "rebate not applied to my income",
      ],
      question: [
        "is income up to 12 lakh really tax free",
        "how does the 87a rebate work",
        "is standard deduction available in both regimes",
      ],
      qualifier: [
        "free income tax calculator india",
        "tax calculator both regimes",
        "browser income tax estimator",
      ],
      india: [
        "new tax regime mein kitna tax lagega",
        "income tax slab 2025 26 india",
        "salary tax calculation ay 2025 26",
      ],
    },
  },
  {
    slug: "pf-calculator",
    primary: "pf calculator",
    secondary: [
      "epf contribution calculator",
      "provident fund on 15000 basic",
      "employee and employer pf split",
      "epf monthly and annual contribution",
      "pf deduction from salary",
    ],
    groups: {
      alternativeName: ["epf calculator", "provident fund calculator"],
      synonym: [
        "12 percent pf contribution on basic",
        "employer pf share calculation",
        "pf wages and contribution split",
      ],
      action: [
        "calculate pf on basic salary",
        "split employee and employer pf",
        "check annual pf accumulation",
      ],
      longTail: [
        "pf contribution on 15000 basic salary",
        "how much pf is deducted from 50000 salary",
        "employer pf 12 percent of basic calculation",
        "annual epf contribution for one year",
      ],
      problem: [
        "payslip pf amount does not match my calculation",
        "not sure if pf applies to my full basic",
        "employer pf lower than expected",
      ],
      question: [
        "is pf calculated on basic or gross",
        "what is the pf wage ceiling",
        "does employer pf come out of my ctc",
      ],
      qualifier: [
        "free pf calculator india",
        "epf calculator no signup",
        "browser pf contribution tool",
      ],
      india: [
        "pf kitna katega salary se",
        "epf contribution kaise calculate kare",
        "basic pe pf calculation india",
      ],
    },
  },
  {
    slug: "esi-calculator",
    primary: "esi calculator",
    secondary: [
      "esi contribution calculator",
      "esi on 21000 gross salary",
      "employee and employer esi share",
      "esi eligibility and ceiling",
      "esi deduction from salary",
    ],
    groups: {
      alternativeName: ["esic calculator", "esi contribution tool"],
      synonym: [
        "0.75 percent employee esi contribution",
        "3.25 percent employer esi contribution",
        "esi wage ceiling check",
      ],
      action: [
        "calculate esi on monthly gross",
        "check whether esi applies to a salary",
        "split employee and employer esi",
      ],
      longTail: [
        "esi contribution on 18000 gross salary",
        "is esi applicable on 25000 salary",
        "annual esi contribution for employee and employer",
        "esi deduction amount for 15000 salary",
      ],
      problem: [
        "not sure why esi stopped appearing in payslip",
        "esi deducted at current salary is unexpected",
        "confused between pf and esi thresholds",
      ],
      question: [
        "what is the esi salary ceiling",
        "is esi on gross or basic salary",
        "does esi stop automatically above the ceiling",
      ],
      qualifier: [
        "free esi calculator india",
        "esic contribution calculator online",
        "browser esi deduction tool",
      ],
      india: [
        "esi kitna katega",
        "esi salary limit kitni hai",
        "esic contribution calculation india",
      ],
    },
  },
  {
    slug: "gratuity-calculator",
    primary: "gratuity calculator",
    secondary: [
      "gratuity under payment of gratuity act",
      "15 26 gratuity formula",
      "gratuity for 5 years service",
      "gratuity exemption 20 lakh",
      "gratuity on last drawn basic",
    ],
    groups: {
      alternativeName: ["gratuity estimator", "gratuity amount calculator"],
      synonym: [
        "15 by 26 of basic per year",
        "final settlement gratuity amount",
        "gratuity payable on resignation",
      ],
      action: [
        "calculate gratuity from basic and years",
        "check gratuity eligibility after five years",
        "estimate gratuity in a full and final",
      ],
      longTail: [
        "gratuity for 10 years service at 30000 basic",
        "how much gratuity after 5 years 7 months",
        "gratuity calculation with da included",
        "gratuity above 20 lakh is taxable",
      ],
      problem: [
        "employer gratuity figure looks too low",
        "not sure how partial years are rounded",
        "confused whether da counts for gratuity",
      ],
      question: [
        "how is gratuity calculated in india",
        "are part years rounded up for gratuity",
        "is gratuity part of ctc",
      ],
      qualifier: [
        "free gratuity calculator india",
        "gratuity calculator no login",
        "browser gratuity estimator",
      ],
      india: [
        "gratuity kitni milegi",
        "gratuity calculation formula india",
        "gratuity payment act calculation",
      ],
    },
  },
  {
    slug: "full-and-final-settlement",
    primary: "full and final settlement calculator",
    secondary: [
      "fnf settlement calculation",
      "final salary after resignation",
      "leave encashment in final settlement",
      "notice recovery in fnf",
      "full and final settlement breakdown",
    ],
    groups: {
      alternativeName: ["fnf calculator", "final settlement estimator"],
      synonym: [
        "amount payable on last working day",
        "resignation settlement calculation",
        "final dues after leaving a job",
      ],
      action: [
        "calculate final settlement after resignation",
        "work out prorated final month salary",
        "add leave encashment to final dues",
      ],
      longTail: [
        "how much will i get in fnf after resigning",
        "final settlement with pending leave and gratuity",
        "notice period recovery in full and final",
        "fnf calculation for 60 day notice shortfall",
      ],
      problem: [
        "fnf amount from employer seems short",
        "not sure what should be included in fnf",
        "salary held back after resignation",
      ],
      question: [
        "what is included in full and final settlement",
        "can an employer deduct a notice shortfall from fnf",
        "is gratuity part of full and final settlement",
      ],
      qualifier: [
        "free fnf calculator",
        "full and final calculator no signup",
        "browser settlement estimator",
      ],
      india: [
        "fnf kitna milega",
        "resignation ke baad final settlement",
        "full and final settlement india rules",
      ],
    },
  },
  {
    slug: "leave-encashment-calculator",
    primary: "leave encashment calculator",
    secondary: [
      "earned leave encashment value",
      "leave balance cash value",
      "carry forward leave limit",
      "encashment on resignation",
      "unused leave payout",
    ],
    groups: {
      alternativeName: ["leave payout calculator", "el encashment tool"],
      synonym: [
        "cash value of accrued leave",
        "paid leave balance conversion",
        "encash earned leave at basic",
      ],
      action: [
        "calculate encashment from leave balance",
        "check leave lapsing beyond the cap",
        "value unused leave at resignation",
      ],
      longTail: [
        "how much is 30 days leave encashment worth",
        "leave encashment on basic salary calculation",
        "carry forward limit and lapsed leave",
        "leave encashment in full and final settlement",
      ],
      problem: [
        "huge leave balance but small payout",
        "leave silently lapsed at year end",
        "not sure if encashment is taxable",
      ],
      question: [
        "how is leave encashment calculated",
        "is leave encashment taxable on resignation",
        "can an employer cap carry forward leave",
      ],
      qualifier: [
        "free leave encashment calculator",
        "el encashment calculator india",
        "browser leave payout tool",
      ],
      india: [
        "leave encashment kaise calculate hota hai",
        "el balance ka paisa kitna",
        "chhutti ke paise india",
      ],
    },
  },
  {
    slug: "attendance-calculator",
    primary: "attendance calculator",
    secondary: [
      "attendance percentage from present days",
      "payable days from attendance",
      "loss of pay calculation",
      "present only percentage payroll",
      "half day and late mark handling",
    ],
    groups: {
      alternativeName: ["attendance percentage tool", "lop calculator"],
      synonym: [
        "present days out of working days",
        "attendance to payable days conversion",
        "salary deduction for absence",
      ],
      action: [
        "calculate attendance percentage",
        "work out loss of pay from absences",
        "convert attendance into payable days",
      ],
      longTail: [
        "attendance percentage for 22 of 26 days",
        "lop deduction for 3 absent days",
        "payable days after 2 half days",
        "attendance register percentage calculation",
      ],
      problem: [
        "payroll and register disagree on attendance",
        "lop deducted but leave was approved",
        "half days rounded away in payroll",
      ],
      question: [
        "how is attendance percentage calculated",
        "does paid leave count in attendance",
        "how is loss of pay calculated from salary",
      ],
      qualifier: [
        "free attendance calculator",
        "lop calculator india",
        "browser attendance tool",
      ],
      india: [
        "attendance percentage kaise nikale",
        "salary cut for leave india",
        "present days se salary calculation",
      ],
    },
  },
  {
    slug: "overtime-calculator",
    primary: "overtime calculator",
    secondary: [
      "overtime pay from ordinary rate",
      "factories act overtime rate",
      "double the ordinary rate overtime",
      "48 hour week compliance",
      "ot hours to pay conversion",
    ],
    groups: {
      alternativeName: ["ot calculator", "overtime pay estimator"],
      synonym: [
        "hourly rate with overtime multiplier",
        "extra hours payment calculation",
        "shift overtime wages",
      ],
      action: [
        "calculate overtime pay from monthly wage",
        "check overtime against the weekly limit",
        "apply an overtime multiplier",
      ],
      longTail: [
        "overtime for 20 hours in a month at 25000 salary",
        "ordinary hourly rate from monthly wage",
        "overtime at twice the ordinary rate example",
        "weekly hours exceeding 48 hours rules",
      ],
      problem: [
        "overtime paid less than the legal minimum",
        "not sure what the ordinary rate is",
        "weekly hours exceeding the limit",
      ],
      question: [
        "how is overtime calculated in india",
        "is overtime double the ordinary rate",
        "what is the maximum weekly working hours",
      ],
      qualifier: [
        "free overtime calculator india",
        "ot pay calculator online",
        "browser overtime estimator",
      ],
      india: [
        "overtime ka paisa kaise calculate kare",
        "extra duty ke paise",
        "factories act overtime india",
      ],
    },
  },
  {
    slug: "shift-hours-calculator",
    primary: "shift hours calculator",
    secondary: [
      "working hours between two times",
      "night shift duration calculator",
      "break deduction from shift",
      "spanning midnight shift hours",
      "shift length in hours and minutes",
    ],
    groups: {
      alternativeName: ["shift duration tool", "hours calculator"],
      synonym: [
        "time between clock in and clock out",
        "shift length calculation with breaks",
        "elapsed hours across a night shift",
      ],
      action: [
        "calculate hours worked in a shift",
        "deduct unpaid break time",
        "measure a shift that crosses midnight",
      ],
      longTail: [
        "night shift from 10pm to 6am hours",
        "shift hours minus 45 minute break",
        "total hours for a 12 hour shift with breaks",
        "working hours across midnight calculation",
      ],
      problem: [
        "night shift hours counted wrong",
        "break time not deducted from hours",
        "roster and timesheet disagree",
      ],
      question: [
        "how do i calculate hours across midnight",
        "should breaks be deducted from shift hours",
        "how many hours is a standard shift",
      ],
      qualifier: [
        "free shift hours calculator",
        "working hours calculator no login",
        "browser shift duration tool",
      ],
      india: [
        "shift ke ghante kaise nikale",
        "night shift hours calculation",
        "duty hours india calculator",
      ],
    },
  },
  {
    slug: "salary-slip-generator",
    primary: "salary slip generator",
    secondary: [
      "payslip format with pf and esi",
      "printable monthly pay slip",
      "earnings and deductions breakdown",
      "gross to net pay slip",
      "employer cost on payslip",
    ],
    groups: {
      alternativeName: ["payslip maker", "pay slip creator"],
      synonym: [
        "monthly salary statement",
        "wage slip for the month",
        "salary certificate with deductions",
      ],
      action: [
        "create a salary slip for an employee",
        "fill earnings and deductions into a payslip",
        "print a monthly pay statement",
      ],
      longTail: [
        "payslip with basic hra pf and professional tax",
        "salary slip for one month template",
        "payslip showing employer pf contribution",
        "printable payslip without payroll software",
      ],
      problem: [
        "no payslip from employer for a month",
        "need a salary proof for a loan",
        "payslip figures do not total correctly",
      ],
      question: [
        "what should a salary slip contain",
        "is a self generated payslip valid",
        "what is the difference between gross and net on a payslip",
      ],
      qualifier: [
        "free salary slip generator",
        "payslip maker without signup",
        "browser payslip tool",
      ],
      india: [
        "salary slip kaise banaye",
        "payslip format india",
        "salary certificate banane ka tarika",
      ],
    },
  },
  {
    slug: "offer-letter-generator",
    primary: "offer letter generator",
    secondary: [
      "employment offer letter format",
      "offer letter with ctc and joining date",
      "conditional offer letter template",
      "offer validity and acceptance",
      "appointment letter draft",
    ],
    groups: {
      alternativeName: ["offer letter maker", "appointment letter tool"],
      synonym: [
        "letter offering a job",
        "employment offer document",
        "formal offer of appointment",
      ],
      action: [
        "draft an offer letter with designation and ctc",
        "add a joining date and acceptance clause",
        "set an offer expiry date",
      ],
      longTail: [
        "offer letter format with salary and joining date",
        "offer letter including probation and notice period",
        "offer letter with condition of background verification",
        "standard offer letter for a small company",
      ],
      problem: [
        "no template for a small team hiring",
        "offer letter missing key clauses",
        "unsure what an offer letter must state",
      ],
      question: [
        "what must an offer letter contain",
        "is an offer letter legally binding",
        "should ctc be stated in the offer letter",
      ],
      qualifier: [
        "free offer letter generator",
        "offer letter template no signup",
        "browser offer letter builder",
      ],
      india: [
        "offer letter format india",
        "appointment letter kaise likhe",
        "job offer letter in english india",
      ],
    },
  },
  {
    slug: "experience-letter-generator",
    primary: "experience letter generator",
    secondary: [
      "experience certificate format",
      "employment certificate with dates",
      "work experience letter template",
      "relieving and experience letter",
      "service certificate for employee",
    ],
    groups: {
      alternativeName: ["experience certificate maker", "service letter tool"],
      synonym: [
        "letter confirming employment tenure",
        "certificate of work experience",
        "employment history letter",
      ],
      action: [
        "generate an experience letter from employee record",
        "state designation and period of service",
        "write a work experience certificate",
      ],
      longTail: [
        "experience letter format with designation and dates",
        "experience certificate after resignation",
        "work experience letter for visa application",
        "experience letter without performance claims",
      ],
      problem: [
        "employer not issuing an experience letter",
        "experience letter lacks key details",
        "need a service certificate quickly",
      ],
      question: [
        "what should an experience letter say",
        "what is the difference between experience and relieving letter",
        "is an experience letter mandatory",
      ],
      qualifier: [
        "free experience letter format",
        "experience certificate generator online",
        "browser experience letter tool",
      ],
      india: [
        "experience letter kaise banaye",
        "experience certificate format india",
        "naukri ka experience letter",
      ],
    },
  },
  {
    slug: "relieving-letter-generator",
    primary: "relieving letter generator",
    secondary: [
      "relieving letter format",
      "last working day confirmation letter",
      "relieving after notice period",
      "relieving letter with settlement",
      "no dues confirmation letter",
    ],
    groups: {
      alternativeName: ["relieving letter maker", "lwd confirmation tool"],
      synonym: [
        "letter confirming release from employment",
        "acceptance of resignation with relieving date",
        "employment release document",
      ],
      action: [
        "draft a relieving letter with the last working day",
        "confirm that dues are settled",
        "issue a relieving letter after resignation",
      ],
      longTail: [
        "relieving letter format with last working day",
        "relieving letter when notice period is bought out",
        "relieving and experience letter together",
        "relieving letter after absconding rules",
      ],
      problem: [
        "new employer asking for a relieving letter",
        "previous employer delaying the letter",
        "notice served but no relieving issued",
      ],
      question: [
        "what is a relieving letter",
        "is a relieving letter required to join a new company",
        "can an employer withhold a relieving letter",
      ],
      qualifier: [
        "free relieving letter format",
        "relieving letter generator online",
        "browser relieving letter tool",
      ],
      india: [
        "relieving letter kaise milega",
        "relieving letter format india",
        "resignation ke baad relieving letter",
      ],
    },
  },
  {
    slug: "warning-letter-generator",
    primary: "warning letter generator",
    secondary: [
      "employee warning letter format",
      "written warning for misconduct",
      "warning letter with response deadline",
      "show cause notice to employee",
      "disciplinary warning letter",
    ],
    groups: {
      alternativeName: ["warning letter maker", "show cause template"],
      synonym: [
        "formal written warning to an employee",
        "letter recording a policy breach",
        "notice of unsatisfactory conduct",
      ],
      action: [
        "draft a warning letter citing the incident",
        "record the policy clause that was breached",
        "set a response deadline in a warning",
      ],
      longTail: [
        "warning letter format with incident description",
        "first written warning for absenteeism",
        "warning letter citing company policy clause",
        "warning letter with seven day response window",
      ],
      problem: [
        "no consistent warning letter format",
        "warning issued without due process",
        "need a record of repeated tardiness",
      ],
      question: [
        "what should a warning letter include",
        "does a warning letter need a response deadline",
        "can a warning letter be challenged",
      ],
      qualifier: [
        "free warning letter format",
        "warning letter generator india",
        "browser warning letter tool",
      ],
      india: [
        "warning letter kaise likhe",
        "employee ko warning letter format",
        "employer warning letter india",
      ],
    },
  },
  {
    slug: "appreciation-letter-generator",
    primary: "appreciation letter generator",
    secondary: [
      "appreciation letter for employee",
      "recognition letter with specific impact",
      "thank you letter to a colleague",
      "commendation letter format",
      "spot recognition note",
    ],
    groups: {
      alternativeName: ["recognition letter maker", "commendation letter tool"],
      synonym: [
        "letter praising a specific contribution",
        "note of thanks for work delivered",
        "formal appreciation for effort",
      ],
      action: [
        "write an appreciation letter naming the contribution",
        "recognise an employee for a specific outcome",
        "draft a thank you note after a project",
      ],
      longTail: [
        "appreciation letter format with specific achievement",
        "thank you letter after completing a project",
        "recognition letter for going beyond scope",
        "appreciation email to a team member india",
      ],
      problem: [
        "praise sounds generic and rehearsed",
        "recognition not recorded anywhere",
        "unsure how specific an appreciation should be",
      ],
      question: [
        "how do i write an appreciation letter",
        "should an appreciation letter mention a metric",
        "is an appreciation letter part of the personnel file",
      ],
      qualifier: [
        "free appreciation letter format",
        "appreciation letter generator online",
        "browser recognition letter tool",
      ],
      india: [
        "appreciation letter kaise likhe",
        "employee ko shabashi letter",
        "thank you letter format india",
      ],
    },
  },
  {
    slug: "increment-letter-generator",
    primary: "increment letter generator",
    secondary: [
      "salary increment letter format",
      "hike letter with revised ctc",
      "promotion cum increment letter",
      "effective date of revision",
      "annual revision letter to employee",
    ],
    groups: {
      alternativeName: ["hike letter maker", "revision letter tool"],
      synonym: [
        "letter communicating a revised salary",
        "confirmation of a compensation change",
        "salary revision advice",
      ],
      action: [
        "draft an increment letter with the revised ctc",
        "state the effective date of a hike",
        "issue a promotion cum increment letter",
      ],
      longTail: [
        "increment letter format with old and new ctc",
        "hike letter with effective date of revision",
        "promotion letter with revised designation and salary",
        "annual increment communication letter",
      ],
      problem: [
        "hike announced verbally with nothing in writing",
        "increment letter missing the revised figure",
        "unclear from which month the hike applies",
      ],
      question: [
        "what should an increment letter state",
        "is an increment letter the same as a revised offer",
        "does an increment letter need an effective date",
      ],
      qualifier: [
        "free increment letter format",
        "hike letter generator online",
        "browser increment letter tool",
      ],
      india: [
        "increment letter kaise likhe",
        "salary hike letter format india",
        "appraisal ke baad increment letter",
      ],
    },
  },
  {
    slug: "termination-letter-generator",
    primary: "termination letter generator",
    secondary: [
      "termination letter format india",
      "termination with notice or pay in lieu",
      "letter citing the termination clause",
      "last working day on termination",
      "termination settlement letter",
    ],
    groups: {
      alternativeName: ["termination letter maker", "dismissal letter tool"],
      synonym: [
        "letter ending an employment contract",
        "notice of termination of service",
        "formal termination of appointment",
      ],
      action: [
        "draft a termination letter citing the clause",
        "state the effective and last working dates",
        "record notice or pay in lieu in a termination",
      ],
      longTail: [
        "termination letter format with clause reference",
        "termination with one month notice india",
        "termination letter with full and final settlement",
        "termination during probation letter format",
      ],
      problem: [
        "termination communicated without a written record",
        "unsure which clause to cite",
        "settlement and last working date unclear",
      ],
      question: [
        "what should a termination letter include",
        "is pay in lieu of notice allowed in india",
        "does a termination letter need legal review",
      ],
      qualifier: [
        "free termination letter format",
        "termination letter generator india",
        "browser termination letter tool",
      ],
      india: [
        "termination letter kaise likhe",
        "naukri se nikalne ka letter",
        "termination letter format india",
      ],
    },
  },
  {
    slug: "internship-certificate-generator",
    primary: "internship certificate generator",
    secondary: [
      "internship certificate format",
      "completion certificate for intern",
      "internship letter with project details",
      "training certificate for student",
      "internship certificate for college",
    ],
    groups: {
      alternativeName: [
        "internship certificate maker",
        "training certificate tool",
      ],
      synonym: [
        "certificate confirming an internship",
        "letter recording internship period",
        "internship completion document",
      ],
      action: [
        "create an internship certificate",
        "state project and duration on a certificate",
        "issue a training completion letter",
      ],
      longTail: [
        "internship certificate format with project title",
        "internship completion certificate for college submission",
        "summer internship certificate from company",
        "internship certificate with duration and role",
      ],
      problem: [
        "college requires a certificate format",
        "internship done but no document issued",
        "certificate lacks project details",
      ],
      question: [
        "what should an internship certificate contain",
        "is an internship certificate the same as an experience letter",
        "does an internship certificate need a seal",
      ],
      qualifier: [
        "free internship certificate format",
        "internship certificate generator online",
        "browser internship certificate tool",
      ],
      india: [
        "internship certificate kaise banaye",
        "internship certificate format india",
        "college ke liye internship certificate",
      ],
    },
  },
  {
    slug: "job-description-generator",
    primary: "job description generator",
    secondary: [
      "jd format with responsibilities",
      "must have versus nice to have",
      "job description with salary range",
      "role scope and reporting line",
      "hiring brief for a role",
    ],
    groups: {
      alternativeName: ["jd maker", "job posting draft tool"],
      synonym: [
        "structured role description",
        "hiring brief for a vacancy",
        "role and responsibility document",
      ],
      action: [
        "build a job description from responsibilities",
        "separate must have from nice to have",
        "add a salary range to a jd",
      ],
      longTail: [
        "job description format with responsibilities and requirements",
        "jd for a small team with salary range",
        "job description with reporting structure",
        "how to write a jd without a long must have list",
      ],
      problem: [
        "must have list so long nobody applies",
        "jd written by committee reads generic",
        "salary missing from every posting",
      ],
      question: [
        "what sections does a job description need",
        "should a job description include a salary range",
        "how long should a must have list be",
      ],
      qualifier: [
        "free jd generator",
        "job description template no signup",
        "browser jd builder",
      ],
      india: [
        "job description kaise likhe",
        "jd format india",
        "hiring ke liye jd kaise banaye",
      ],
    },
  },
  {
    slug: "kpi-sheet-generator",
    primary: "kpi sheet generator",
    secondary: [
      "kpi template with weights",
      "measurable targets per metric",
      "kpi review period setup",
      "weighted scorecard for a role",
      "objective and target table",
    ],
    groups: {
      alternativeName: ["kpi sheet maker", "scorecard template tool"],
      synonym: [
        "weighted metric sheet for a role",
        "performance target table",
        "kpi and target document",
      ],
      action: [
        "build a kpi sheet with weights summing to 100",
        "set a measurable target for each metric",
        "define a review period per metric",
      ],
      longTail: [
        "kpi sheet format with weights for a role",
        "kpi targets that add up to one hundred percent",
        "quarterly kpi review template",
        "how to write measurable kpi targets",
      ],
      problem: [
        "kpi weights do not add up to a hundred",
        "targets too vague to score",
        "scorecard nobody can measure",
      ],
      question: [
        "how many kpis should a role have",
        "should kpi weights sum to 100",
        "what makes a kpi measurable",
      ],
      qualifier: [
        "free kpi sheet template",
        "kpi generator no signup",
        "browser kpi builder",
      ],
      india: [
        "kpi sheet kaise banaye",
        "kpi format india",
        "appraisal ke liye kpi",
      ],
    },
  },
  {
    slug: "interview-plan-generator",
    primary: "interview plan generator",
    secondary: [
      "structured interview question set",
      "competency based interview guide",
      "interview scorecard for hiring",
      "technical interview question bank",
      "panel interview plan",
    ],
    groups: {
      alternativeName: ["interview guide maker", "question set builder"],
      synonym: [
        "interview structure for a role",
        "question bank by competency",
        "hiring interview script",
      ],
      action: [
        "generate interview questions for a role",
        "build a competency question set",
        "plan an interview panel sequence",
      ],
      longTail: [
        "interview questions for a support role",
        "structured interview plan with competencies",
        "competency questions with what good looks like",
        "panel interview plan for a small company",
      ],
      problem: [
        "every interviewer asks something different",
        "no record of what a good answer looks like",
        "interviews not comparable across candidates",
      ],
      question: [
        "what is a structured interview",
        "how many questions should an interview have",
        "should interviews use a scorecard",
      ],
      qualifier: [
        "free interview question generator",
        "interview plan template no signup",
        "browser interview planner",
      ],
      india: [
        "interview questions kaise banaye",
        "hiring interview plan india",
        "interview guide format",
      ],
    },
  },
  {
    slug: "probation-period-calculator",
    primary: "probation period calculator",
    secondary: [
      "probation end date calculator",
      "probation confirmation date",
      "probation extension calculation",
      "probation period in offer letter",
      "confirmation due date from joining",
    ],
    groups: {
      alternativeName: [
        "probation end date tool",
        "confirmation date calculator",
      ],
      synonym: [
        "date probation completes",
        "end of probationary appointment",
        "when confirmation is due",
      ],
      action: [
        "calculate the probation end date",
        "check the confirmation date after extension",
        "work out confirmation from a joining date",
      ],
      longTail: [
        "probation end date for 6 months from july",
        "confirmation date after 90 day probation",
        "probation extension by three months calculation",
        "probation period end date with weekends",
      ],
      problem: [
        "confirmation long overdue but unrecorded",
        "probation extended without a new date",
        "offer letter probation length ambiguous",
      ],
      question: [
        "how long can probation be in india",
        "does probation include weekends",
        "what happens after probation is not confirmed",
      ],
      qualifier: [
        "free probation calculator",
        "probation end date tool online",
        "browser confirmation date calculator",
      ],
      india: [
        "probation period kitna hota hai",
        "confirmation date kaise nikale",
        "probation india rules",
      ],
    },
  },
  {
    slug: "statutory-leave-calculator",
    primary: "statutory leave calculator",
    secondary: [
      "annual leave on factories act basis",
      "one day per 20 days worked",
      "shops and establishments leave",
      "earned leave entitlement calculation",
      "statutory annual leave india",
    ],
    groups: {
      alternativeName: ["el entitlement calculator", "annual leave calculator"],
      synonym: [
        "leave accrued per days worked",
        "statutory earned leave entitlement",
        "annual leave days for a year",
      ],
      action: [
        "calculate earned leave for days worked",
        "adjust the divisor for a state act",
        "work out annual leave entitlement",
      ],
      longTail: [
        "earned leave for 260 days worked",
        "annual leave under factories act india",
        "shops and establishments leave entitlement",
        "el entitlement for part of a year",
      ],
      problem: [
        "employer leave policy below statutory minimum",
        "not sure which state act applies",
        "leave accrued differs from entitlement",
      ],
      question: [
        "how many annual leave days is an employee entitled to",
        "is annual leave one day per twenty days worked",
        "do state acts change leave entitlement",
      ],
      qualifier: [
        "free statutory leave calculator",
        "annual leave entitlement tool india",
        "browser leave calculator",
      ],
      india: [
        "annual leave kitni milti hai",
        "earned leave calculation india",
        "chhutti ka hisaab india",
      ],
    },
  },
  {
    slug: "working-days-calculator",
    primary: "working days calculator",
    secondary: [
      "business days between two dates",
      "weekdays only between two dates",
      "bank holidays in a period",
      "add business days to a date",
      "working days in a month",
    ],
    groups: {
      alternativeName: ["business day counter", "weekday calculator"],
      synonym: [
        "count of weekdays in a range",
        "days actually worked in a month",
        "elapsed working days",
      ],
      action: [
        "count working days between two dates",
        "skip weekends and listed holidays",
        "add business days to a start date",
      ],
      longTail: [
        "working days in october 2026 india",
        "business days between two dates excluding holidays",
        "add 30 business days from today",
        "net working days after weekends and festivals",
      ],
      problem: [
        "confusing calendar days with working days",
        "deadline counted across festival holidays",
        "payroll working days differ from the calendar",
      ],
      question: [
        "how many working days are there in a month",
        "do bank holidays count as working days",
        "does a business day count include saturday",
      ],
      qualifier: [
        "free working days calculator",
        "business days calculator no signup",
        "browser weekday counter",
      ],
      india: [
        "working days kaise count kare",
        "month mein kitne working days",
        "holidays ke saath working days india",
      ],
    },
  },
];
