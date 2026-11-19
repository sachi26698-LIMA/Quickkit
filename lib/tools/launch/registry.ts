/**
 * Category launch plans — the four new categories and every tool in them.
 *
 * ## Why this file exists instead of 50 more page directories
 *
 * Each existing QUICKKIT tool has its own route directory, its own `ToolShell`
 * call and its own `TOOL_SEO_METADATA` entry. That is fine at nine tools and
 * untenable at fifty: the copy, the H1, the canonical, the JSON-LD, the
 * breadcrumbs and the metadata would each be re-typed fifty times, and the
 * audit's whole job is finding exactly the drift that produces.
 *
 * So a new tool is declared **once**, here, with the facts that are genuinely
 * per-tool (name, keyword, description, slots, FAQ, reference section). The
 * route shell, metadata, schema, breadcrumbs, related links and privacy notice
 * are derived from that declaration by `tool-workspace-route.tsx`. There is no
 * second place for the H1 to drift to, because there is only one place the H1
 * is written.
 *
 * ## Honesty rules encoded in the type
 *
 * - `status` is `"live"` only when the component behind it is implemented and
 *   its engine has unit tests. A planned tool is `"planned"` and is not routed.
 * - `external` is present only when the tool actually calls something outside
 *   the tab. Every tool here is browser-local, so no entry has it.
 * - `jurisdiction` is set on anything whose arithmetic depends on Indian law, so
 *   the page can state which law and that it is not advice.
 */

export type LaunchCategorySlug =
  "hr-payroll" | "seo-growth" | "career-jobs" | "business-ops";

export type Subgroup = { slug: string; name: string; description: string };

export type LaunchCategory = {
  /** Catalogue category name — must match `categoryMeta` exactly. */
  name: string;
  slug: LaunchCategorySlug;
  /** Landing-page H1. */
  h1: string;
  /** One-sentence promise used on cards and in the header menu. */
  blurb: string;
  /** Landing-page introduction (rendered as real paragraphs, not filler). */
  intro: string[];
  /** SEO record for `/category/<slug>`. */
  seo: CategorySeo;
  subgroups: Subgroup[];
};

export type CategorySeo = {
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  researchId: string;
  alternativeTitles: [string, string];
  alternativeDescription: string;
  internalLinks: string[];
};

/**
 * A single tool declaration.
 *
 * `slots` are rendered by `components/tools/launch/` and are the only place a
 * tool's inputs are defined. `faqs` and `reference` carry the on-page teaching
 * content the SEO audit requires.
 */
export type LaunchTool = {
  slug: string;
  name: string;
  categoryName: string;
  subgroup: string;
  /** Which shared workspace renders it. */
  workspace: WorkspaceId;
  /** Mode inside that workspace. */
  mode: string;
  status: "live" | "planned";
  description: string;
  keywords: string;
  /** The H1. Also stored in the SEO record and compared by the audit. */
  h1: string;
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  researchId: string;
  alternativeTitles: [string, string];
  alternativeDescription: string;
  internalLinks: string[];
  /** Steps shown in the "how to use" block. */
  steps: string[];
  faqs: { q: string; a: string }[];
  /** Reference material: formulas, conventions, or the exact rules applied. */
  reference: { title: string; body: string }[];
  /** Set when the tool applies a specific national law. */
  jurisdiction?: string;
  /** Set when the tool is an estimate or a draft rather than a fact. */
  caveat?: string;
};

export type WorkspaceId =
  | "salary-workspace"
  | "attendance-workspace"
  | "document-studio"
  | "people-text-kit"
  | "page-analyzer"
  | "serp-preview"
  | "schema-builder"
  | "technical-seo"
  | "content-kit"
  | "resume-studio"
  | "career-text-kit"
  | "job-search-kit";

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export const launchCategories: LaunchCategory[] = [
  {
    name: "HR & Payroll",
    slug: "hr-payroll",
    h1: "HR & Payroll Tools",
    blurb:
      "Salary, PF, ESI, TDS, gratuity and attrition arithmetic that shows its working — plus the letters and registers an HR desk actually issues.",
    intro: [
      "Most payroll calculators on the web return one number and hide the formula. These tools return the arithmetic: each figure carries the rate, ceiling or slab it came from, so a result can be checked by hand and defended in a payroll review.",
      "The money tools implement the statutory rules that are stable and public — the ₹15,000 EPF wage ceiling and 12% contribution, the ₹21,000 ESI ceiling, state professional-tax bands, the section 87A rebate and both income-tax regimes, and gratuity under the Payment of Gratuity Act. Where a rule depends on facts the tool does not collect — HRA exemption from rent paid, 80C proofs, surcharge — the result says so instead of guessing.",
      "The document tools generate salary slips, offer letters, experience letters and policy sheets from the facts you enter. Nothing is invented: any statement the template needs appears as a visible placeholder until you supply it, so a document can never leave with a claim nobody wrote.",
    ],
    seo: {
      title: "HR & Payroll Tools — Salary, PF & Letters",
      description:
        "Salary-to-take-home in India with PF, ESI, professional tax and income tax shown line by line, plus gratuity, attendance, leave and HR letters — all local.",
      primaryKeyword: "hr and payroll tools",
      secondaryKeywords: [
        "indian salary calculator tools",
        "pf esi professional tax calculator",
        "hr letters and formats",
        "attendance and leave calculator",
        "gratuity and full and final settlement",
      ],
      researchId: "hr-payroll-hub",
      alternativeTitles: [
        "Payroll Calculators & HR Documents for India",
        "Salary, PF, Gratuity and HR Letter Tools",
      ],
      alternativeDescription:
        "Work out take-home pay, PF, ESI, professional tax and gratuity with every rate disclosed, then generate the letters and registers that support them.",
      internalLinks: [
        "/category/career-jobs",
        "/tools/salary-calculator-india",
        "/tools/gratuity-calculator",
      ],
    },
    subgroups: [
      {
        slug: "salary",
        name: "Salary & Take-Home",
        description:
          "CTC to monthly take-home, reverse calculation from a target net, and the comparison of two offers after tax.",
      },
      {
        slug: "statutory",
        name: "PF, ESI & Gratuity",
        description:
          "Contribution arithmetic on the statutory ceilings, gratuity under the Payment of Gratuity Act, and the full-and-final settlement.",
      },
      {
        slug: "attendance",
        name: "Attendance & Leave",
        description:
          "Attendance percentage, loss of pay, overtime under the Factories Act basis, leave accrual and encashment.",
      },
      {
        slug: "documents",
        name: "HR Documents",
        description:
          "Salary slips, offer, experience, relieving, warning and increment letters generated from the facts you enter.",
      },
      {
        slug: "people-ops",
        name: "Hiring & People Ops",
        description:
          "Job descriptions, KPI sheets, interview plans, probation and notice-date arithmetic for the hiring side of the desk.",
      },
    ],
  },

  {
    name: "SEO & Website Growth",
    slug: "seo-growth",
    h1: "SEO & Website Growth Tools",
    blurb:
      "Analyse the page you paste, generate the markup that validates, and audit your own copy — with no invented rankings, volumes or authority scores.",
    intro: [
      "QUICKKIT cannot see Google's index. It does not know your rankings, your backlinks, your traffic, your domain authority, or what anyone else's keyword difficulty is — and any tool claiming otherwise without a data connection is inventing numbers. So these tools are built around what a browser can honestly compute.",
      "That turns out to be most of the useful mechanical work: rendered pixel width of a title against Google's truncation, keyword counts and density in your own text, repeated-phrase detection, readability, near-duplicate comparison between two of your pages, cannibalisation between your own URLs, heading and alt-text structure, JSON-LD that a validator will accept, and robots.txt and sitemap.xml with their real failure modes flagged.",
      "What is deliberately absent: search volume, difficulty scores, backlink counts, and any predicted rank. Those need a paid data provider. The tool pages say which data they use and where it comes from, and the directory marks the deferred tools so the gap is visible rather than papered over with a plausible-looking dashboard.",
    ],
    seo: {
      title: "SEO Tools — SERP Preview, Schema & Page Audit",
      description:
        "Check title pixel width and SERP truncation, audit on-page keywords and readability, build valid JSON-LD, robots.txt and sitemaps — computed honestly, locally.",
      primaryKeyword: "seo tools",
      secondaryKeywords: [
        "serp preview and title length checker",
        "meta description generator",
        "json-ld structured data generator",
        "robots txt and sitemap generator",
        "on-page seo audit tool",
      ],
      researchId: "seo-growth-hub",
      alternativeTitles: [
        "Free SEO Analysis & Schema Tools",
        "On-Page SEO, Schema and Robots Tools",
      ],
      alternativeDescription:
        "Measure what a browser can actually measure: title pixels, keyword use, readability, duplicate copy, structured data validity and crawl directives.",
      internalLinks: [
        "/category/developer-tools",
        "/category/text-writing",
        "/tools/serp-preview",
      ],
    },
    subgroups: [
      {
        slug: "on-page",
        name: "On-Page Analysis",
        description:
          "SERP preview with pixel truncation, keyword density and placement, readability, and a structural audit of pasted HTML.",
      },
      {
        slug: "structured-data",
        name: "Structured Data",
        description:
          "Build and validate JSON-LD for organizations, articles, products, FAQs, local businesses, jobs and breadcrumbs.",
      },
      {
        slug: "technical",
        name: "Technical SEO",
        description:
          "robots.txt, sitemap.xml, canonical conflicts, hreflang cluster checks and redirect-chain analysis.",
      },
      {
        slug: "content",
        name: "Content & Copy",
        description:
          "Title and description drafting, content briefs, heading variants, alt text and internal-link suggestions.",
      },
      {
        slug: "duplication",
        name: "Duplication & Overlap",
        description:
          "Near-duplicate detection between two of your pages and keyword cannibalisation across your own URL list.",
      },
    ],
  },

  {
    name: "Career & Jobs",
    slug: "career-jobs",
    h1: "Career & Jobs Tools",
    blurb:
      "Résumé and ATS readiness checks against your own job description, salary maths after tax, and the letters and answers to send next.",
    intro: [
      'An applicant tracking system does not publish its algorithm, so no site can give you a real "Workday score". What a tool can do honestly is check the things that are measurably wrong or measurably missing: whether a parser will find your sections, whether your bullets carry numbers, whether the terms in a specific job description actually appear in your résumé, and whether the file has the contact details a recruiter needs.',
      "That is what these do. Paste a job description and the analyser measures coverage against that text — a real comparison with your own input, not a made-up benchmark. The score is itemised across parseability, quantified impact, bullet mechanics and keyword match, so you can see which line moved it.",
      "The salary side reuses the same Indian payroll engine as the HR category, so a take-home figure here and a take-home figure there cannot disagree. The letters, follow-ups and interview plans are assembled from facts you supply, and any fact you have not supplied stays visible as a placeholder rather than being invented.",
    ],
    seo: {
      title: "Career Tools — Resume Check, Salary & Letters",
      description:
        "Check resume readiness against a real job description, compare offers after Indian tax, plan notice periods and write the follow-ups — all processed locally.",
      primaryKeyword: "career tools",
      secondaryKeywords: [
        "resume ats check against job description",
        "salary comparison after tax india",
        "cover letter and follow up generator",
        "notice period and buyout calculator",
        "interview preparation checklist",
      ],
      researchId: "career-jobs-hub",
      alternativeTitles: [
        "Job Search Tools — Resume, Salary, Letters",
        "Resume Analysis and Salary Calculators",
      ],
      alternativeDescription:
        "Measure your resume against the job you want, work out what an offer is worth after tax, and generate the letters you need next.",
      internalLinks: [
        "/category/hr-payroll",
        "/category/text-writing",
        "/tools/resume-ats-checker",
      ],
    },
    subgroups: [
      {
        slug: "resume",
        name: "Résumé & ATS",
        description:
          "Readiness scoring, keyword coverage against a job description, bullet rewriting and a two-version comparison.",
      },
      {
        slug: "salary",
        name: "Salary & Offers",
        description:
          "Period conversion, offer comparison after tax, notice buyout, equity vesting and relocation-adjusted comparison.",
      },
      {
        slug: "application",
        name: "Applications & Letters",
        description:
          "Cover letters, follow-ups, LinkedIn sections, STAR answers, availability statements and interview plans.",
      },
      {
        slug: "timeline",
        name: "Timelines & Record",
        description:
          "Total experience from date ranges, notice end dates, probation dates and job-search trackers.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────────────────

export const launchTools: LaunchTool[] = [
  // ──────────────────────────────────────────────── HR & Payroll · Salary
  {
    slug: "salary-calculator-india",
    name: "Salary Calculator (India)",
    categoryName: "HR & Payroll",
    subgroup: "salary",
    workspace: "salary-workspace",
    mode: "ctc-to-net",
    status: "live",
    description:
      "Turn an annual CTC into a monthly take-home, with employer PF, the gratuity provision, employee PF, ESI, professional tax and income tax shown line by line.",
    keywords:
      "salary calculator india ctc to take home in hand monthly salary pf esi professional tax income tax new regime old regime 12 lakh",
    h1: "Salary Calculator (India)",
    seoTitle: "Salary Calculator India — CTC to Take-Home Pay",
    seoDescription:
      "Convert CTC to monthly take-home in India, with employer PF, gratuity, employee PF, ESI, professional tax and income tax shown line by line at exact rates.",
    primaryKeyword: "salary calculator india",
    secondaryKeywords: [
      "ctc to in hand salary",
      "monthly take home calculator",
      "salary breakup pf esi professional tax",
      "new regime vs old regime tax",
      "in hand salary for 12 lakh ctc",
    ],
    researchId: "hr-salary-ctc",
    alternativeTitles: [
      "CTC to In-Hand Salary Calculator",
      "Take-Home Pay Calculator for India",
    ],
    alternativeDescription:
      "Enter a CTC and see where every rupee goes: employer contributions, gratuity, PF, ESI, professional tax and income tax, with the rate used for each deduction.",
    internalLinks: [
      "/tools/in-hand-salary-calculator",
      "/tools/income-tax-calculator",
      "/tools/pf-calculator",
    ],
    steps: [
      "Enter the annual CTC and the basic share of gross — 40% is the common structure and the default.",
      "Choose the tax regime. The new regime is the default for salaried taxpayers; the old regime allows the deductions you enter.",
      "Pick the professional-tax state, because the Indian regimes differ and several states levy nothing.",
      "Read the breakdown: monthly take-home, the annual split, and each statutory deduction with the rate behind it.",
      "Copy or download the breakdown. Nothing is uploaded and nothing is stored.",
    ],
    faqs: [
      {
        q: "Why is my take-home much lower than the CTC?",
        a: "CTC includes money that is never paid monthly. The employer's PF contribution (12% of PF wages), the employer's ESI share where it applies, and a gratuity provision of 4.81% of basic are all part of what a company budgets but not part of what reaches your bank account. On a ₹12 lakh CTC the gap is typically ₹1.2–1.5 lakh a year before tax is even considered.",
      },
      {
        q: "Is PF calculated on full basic or on ₹15,000?",
        a: "The EPF Act lets an employer restrict PF wages to the ₹15,000 monthly statutory ceiling, and most do. That is the default here. If your employer contributes on full basic, switch the option off and the tool computes 12% of your actual basic instead, which reduces take-home slightly and increases your retirement balance.",
      },
      {
        q: "Which tax regime should I choose?",
        a: "The new regime is the default: a ₹75,000 standard deduction and wider slabs, but no Chapter VI-A deductions. The old regime keeps the ₹50,000 standard deduction and allows 80C, 80D, HRA and home-loan interest. The crossover depends on the size of your provable deductions, so compute both by entering a figure and switching the regime rather than relying on a rule of thumb.",
      },
      {
        q: "Does this include HRA exemption or 80C?",
        a: "Under the new regime, no — those deductions are not allowed and the result says so. Under the old regime you can enter a total for the deductions you can prove. HRA exemption specifically depends on rent paid, basic plus DA, and whether you live in a metro city; this tool does not ask for rent, so it cannot compute the exemption for you.",
      },
      {
        q: "Is this a payslip or a tax filing?",
        a: "No. It is an estimate for planning, built from published statutory rates. Real payroll depends on your company's structure, your proofs, perquisites, any state labour-welfare deductions and surcharge at high incomes. Use it to understand the shape of your pay, not to file a return.",
      },
    ],
    reference: [
      {
        title: "The decomposition this tool uses",
        body: "CTC = gross salary + employer PF + employer ESI + gratuity provision. Take-home = gross − employee PF − employee ESI − professional tax − income tax. Employer contributions are part of CTC by definition but never reach the employee, which is why take-home is always lower than the headline figure suggests.",
      },
      {
        title: "Statutory rates applied",
        body: "EPF: 12% employee and 12% employer on PF wages, capped at ₹15,000 a month. ESI: 0.75% employee and 3.25% employer, applicable only while monthly gross is at or below ₹21,000. Gratuity provision: 15/26 ÷ 12 = 4.81% of basic. Professional tax: state-specific bands, with several states levying nothing at all.",
      },
      {
        title: "Income tax",
        body: "New regime, FY 2025-26: nil to ₹4 lakh, then 5%, 10%, 15%, 20%, 25% and 30% bands, a ₹75,000 standard deduction and the section 87A rebate fully offsetting tax up to ₹12,00,000 of taxable income. Old regime: ₹2.5 lakh exemption, 5%/20%/30% bands, ₹50,000 standard deduction and a ₹5 lakh rebate limit. Health and education cess of 4% applies to both. Surcharge and marginal relief are not modelled.",
      },
    ],
    jurisdiction:
      "India — Income-tax Act, EPF Act, ESI Act and state professional-tax Acts",
    caveat:
      "An estimate from published statutory rates, not a payslip, a tax return or legal advice. Your employer's actual structure, proofs and perquisites change the outcome.",
  },
  {
    slug: "in-hand-salary-calculator",
    name: "In-Hand Salary Calculator",
    categoryName: "HR & Payroll",
    subgroup: "salary",
    workspace: "salary-workspace",
    mode: "net-to-gross",
    status: "live",
    description:
      "Start from the monthly take-home you need and work backwards to the CTC that delivers it, solving through the tax slabs and the PF ceiling rather than inverting a formula.",
    keywords:
      "in hand salary calculator reverse ctc from take home net to gross salary target monthly in hand negotiate offer",
    h1: "In-Hand Salary Calculator",
    seoTitle: "Reverse Salary Calculator — Net to CTC",
    seoDescription:
      "Work backwards from a monthly take-home to the CTC that delivers it. The reverse solve runs through the tax slabs, PF ceiling and ESI, not an inverted formula.",
    primaryKeyword: "reverse salary calculator",
    secondaryKeywords: [
      "reverse ctc from take home",
      "net to gross salary calculator",
      "target monthly in hand",
      "salary to ask in interview",
      "take home to ctc reverse",
    ],
    researchId: "hr-salary-net-to-gross",
    alternativeTitles: [
      "Target Take-Home to CTC Calculator",
      "CTC Required for a Given In-Hand Salary",
    ],
    alternativeDescription:
      "Enter the monthly take-home you want and see the CTC required, computed through the slab boundaries and PF and ESI thresholds that make it non-linear.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/offer-comparison-calculator",
      "/tools/income-tax-calculator",
    ],
    steps: [
      "Enter the monthly take-home you are targeting, after tax and deductions.",
      "Set the same structure options as the forward calculator: basic share, PF basis, tax regime and professional-tax state.",
      "Read the required CTC and the full breakdown at that level.",
      "Use it in a negotiation: state the take-home you need and quote the CTC that produces it rather than a round number.",
    ],
    faqs: [
      {
        q: "Why can't I just divide my take-home by 0.7?",
        a: "Because the relationship is not linear. Income tax is progressive, so each extra rupee is taxed at a different rate; PF stops growing once basic passes the ₹15,000 ceiling; ESI switches off entirely above ₹21,000 of monthly gross. A single multiplier is wrong in every band, which is why this tool solves numerically instead.",
      },
      {
        q: "How accurate is the reverse calculation?",
        a: "The solve iterates until the computed take-home matches your target to within a rupee, then returns that CTC. Accuracy is therefore limited by the model rather than the search: it assumes the standard structure described on the salary calculator page, including a 40% basic share and PF limited to the statutory ceiling.",
      },
      {
        q: "Should I negotiate on CTC or take-home?",
        a: "Say both. Quoting a take-home figure shows you have done the arithmetic and prevents a structure change — a higher basic, a smaller special allowance — from quietly reducing what you expected. The CTC that produces that take-home is the number to put in writing.",
      },
    ],
    reference: [
      {
        title: "How the solve works",
        body: "Take-home is monotonic in CTC but not linear, so the tool bisects over a bracket from zero to ₹10 crore, evaluating the full forward calculation at each midpoint. Sixty iterations converge well below one rupee of error. The returned breakdown is the forward calculation at the solved CTC, so the two tools can never disagree.",
      },
      {
        title: "What the target should include",
        body: "Enter the amount you need in your account each month, after PF, professional tax and income tax. Do not subtract rent or living costs — this is a gross-to-net question, not a budget.",
      },
    ],
    jurisdiction: "India",
    caveat:
      "An estimate on the same model as the salary calculator, and limited by the same assumptions about structure.",
  },
  {
    slug: "income-tax-calculator",
    name: "Income Tax Calculator",
    categoryName: "HR & Payroll",
    subgroup: "salary",
    workspace: "salary-workspace",
    mode: "income-tax",
    status: "live",
    description:
      "Salary income tax under both regimes, with the slab bands, the section 87A rebate and cess itemised so you can see which band each rupee fell into.",
    keywords:
      "income tax calculator india new regime old regime 87a rebate standard deduction slabs salaried fy 2025-26 cess",
    h1: "Income Tax Calculator",
    seoTitle: "Income Tax Calculator — New vs Old Regime",
    seoDescription:
      "Compare income tax under both Indian regimes: slab bands, standard deduction, the section 87A rebate and cess, each shown separately rather than as one total.",
    primaryKeyword: "income tax calculator",
    secondaryKeywords: [
      "new regime vs old regime calculator",
      "income tax slab calculator india",
      "section 87a rebate calculator",
      "standard deduction 75000",
      "tax on 12 lakh salary",
    ],
    researchId: "hr-income-tax",
    alternativeTitles: [
      "New vs Old Tax Regime Calculator",
      "Salaried Income Tax Calculator India",
    ],
    alternativeDescription:
      "See the tax on your salary broken into bands under both regimes, including the rebate that makes income up to ₹12 lakh taxable at nil under the new regime.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/in-hand-salary-calculator",
      "/tools/offer-comparison-calculator",
      "/tools/marginal-tax-rate",
    ],
    steps: [
      "Enter the annual salary income — for a salaried person this is gross salary, not CTC.",
      "Choose the regime. Enter provable deductions for the old regime and any employer NPS contribution, which is allowed in both.",
      "Read the band table: each slab the income fell into, the rate, and the tax on that slice.",
      "Compare the two regimes before choosing what to declare to your employer.",
    ],
    faqs: [
      {
        q: "Is income up to ₹12 lakh really tax-free?",
        a: "Under the new regime for FY 2025-26, the section 87A rebate offsets the entire liability when taxable income is at or below ₹12,00,000. Because the standard deduction is ₹75,000, a salaried person with gross salary up to about ₹12.75 lakh can have nil tax. Above that the rebate disappears rather than tapering, so enter a figure just above the limit to see the step.",
      },
      {
        q: "Why does the tool show a different number from my payslip?",
        a: "A payslip deducts TDS monthly on an estimate that includes declared investments, perquisites and sometimes a projected variable payout. This tool computes the annual liability from the income you enter and nothing else. They converge at year end if the declarations hold.",
      },
      {
        q: "Does it handle surcharge?",
        a: "No, and it says so in the result. Surcharge applies above ₹50 lakh of taxable income and marginal relief smooths the step; both need more inputs than a quick estimator collects. Under ₹50 lakh the omission changes nothing.",
      },
      {
        q: "Which deductions survive in the new regime?",
        a: "Employer NPS contribution under section 80CCD(2), capped at 14% of basic in the new regime, is the significant one, and this tool models it. Most others — 80C, 80D, HRA and home-loan interest on a self-occupied property — are not allowed, and the result says which were ignored.",
      },
    ],
    reference: [
      {
        title: "New regime slabs, FY 2025-26",
        body: "₹0–4,00,000 nil; 4,00,001–8,00,000 at 5%; 8,00,001–12,00,000 at 10%; 12,00,001–16,00,000 at 15%; 16,00,001–20,00,000 at 20%; 20,00,001–24,00,000 at 25%; above ₹24,00,000 at 30%. Standard deduction ₹75,000. The section 87A rebate offsets the full liability where taxable income does not exceed ₹12,00,000.",
      },
      {
        title: "Old regime slabs, individual below 60",
        body: "₹0–2,50,000 nil; 2,50,001–5,00,000 at 5%; 5,00,001–10,00,000 at 20%; above ₹10,00,000 at 30%. Standard deduction ₹50,000. Section 87A rebate where taxable income does not exceed ₹5,00,000.",
      },
      {
        title: "What is added and what is missing",
        body: "Health and education cess at 4% is added in both regimes. Surcharge (10% above ₹50 lakh, rising with income) and marginal relief are not modelled, and the result states this every time it runs.",
      },
    ],
    jurisdiction: "India — Income-tax Act, FY 2025-26 rates",
    caveat:
      "Rates are the FY 2025-26 published figures and change with each budget. Confirm against the current Finance Act before filing.",
  },
  // ──────────────────────────────────────────────── HR & Payroll · Statutory
  {
    slug: "pf-calculator",
    name: "PF Calculator",
    categoryName: "HR & Payroll",
    subgroup: "statutory",
    workspace: "salary-workspace",
    mode: "ctc-to-net",
    status: "live",
    description:
      "Employee and employer provident-fund contributions on the ₹15,000 statutory ceiling or on full basic, with the annual and monthly split and what the employer share covers.",
    keywords:
      "pf calculator epf employee provident fund 12% contribution 15000 wage ceiling employer share pension epf eps monthly annual",
    h1: "PF Calculator",
    seoTitle: "EPF Calculator — 12% of Basic and ₹15,000 Ceiling",
    seoDescription:
      "Work out employee and employer provident fund contributions on the ₹15,000 statutory wage ceiling or full basic, with a monthly and annual split for each side.",
    primaryKeyword: "pf calculator",
    secondaryKeywords: [
      "epf contribution calculator",
      "provident fund on 15000 basic",
      "employee and employer pf split",
      "epf monthly and annual contribution",
      "pf deduction from salary",
    ],
    researchId: "hr-pf",
    alternativeTitles: [
      "EPF Contribution Calculator",
      "Provident Fund Calculator for India",
    ],
    alternativeDescription:
      "Enter basic salary and see the 12% employee and employer PF contributions, capped at the statutory ceiling where applicable, with the monthly and annual totals.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/esi-calculator",
      "/tools/gratuity-calculator",
    ],
    steps: [
      "Enter the annual CTC, which the tool decomposes into gross, basic and allowances.",
      "Choose whether PF is limited to the ₹15,000 monthly statutory wage ceiling — the standard arrangement.",
      "Read the employee and employer contributions, monthly and annually.",
      "Check the note on what the employer share funds, because not all of it reaches your PF account.",
    ],
    faqs: [
      {
        q: "Why is the employer's 12% not all in my PF account?",
        a: "Of the employer's 12%, 8.33% goes to the Employees' Pension Scheme (subject to the ₹15,000 wage ceiling) and the remainder, 3.67%, to your EPF account. The employee's full 12% goes to EPF. That means the EPF corpus grows more slowly than twice the employee contribution, which surprises most people the first time they check.",
      },
      {
        q: "Should PF be calculated on ₹15,000 or on my actual basic?",
        a: "The Act allows an employer to restrict PF wages to ₹15,000 a month, and most do because it lowers the employer's cost. Contributing on full basic is permitted and increases both the employee's contribution and the retirement corpus. This tool supports both, and states which it used.",
      },
      {
        q: "Can I contribute more than 12%?",
        a: "Yes, through the Voluntary Provident Fund. The employee can contribute up to 100% of basic, while the employer remains liable only for its own 12%. VPF contributions attract the same tax treatment as EPF, subject to the aggregate contribution limits introduced for high salaries.",
      },
      {
        q: "Is the interest taxable?",
        a: "Interest on EPF is generally exempt, but since FY 2021-22 interest on an employee's own contributions above ₹2.5 lakh a year is taxable (₹5 lakh where the employer does not contribute). The threshold applies cumulatively across all employers, which catches people who switch jobs.",
      },
    ],
    reference: [
      {
        title: "The statutory figures",
        body: "EPF wage ceiling: ₹15,000 a month. Contribution: 12% of PF wages from the employee and 12% from the employer. The employer's contribution is split 8.33% to the Employees' Pension Scheme and the balance to EPF. For establishments with fewer than 20 employees and certain categories, the rate can be 10%.",
      },
      {
        title: "What PF wages include",
        body: "Basic wages plus dearness allowance and retaining allowance, but excluding bonuses, commission, HRA, overtime and other allowances. Companies that structure a low basic to reduce PF are within the letter of the rule but the practice is contentious, and several court decisions have held that allowances which are in substance part of basic wages should be included.",
      },
      {
        title: "Interest",
        body: "The rate is set annually by the Central Board of Trustees; recent rates have been in the 8.1–8.25% range. Contributions earn interest from the month they are credited, and the trust is required to credit interest for the year by a set date.",
      },
    ],
    jurisdiction:
      "India — Employees' Provident Funds and Miscellaneous Provisions Act, 1952",
    caveat:
      "Contribution arithmetic only. Your employer's wage structure, the applicable rate for your establishment and any exemptions change the actual figures.",
  },
  {
    slug: "esi-calculator",
    name: "ESI Calculator",
    categoryName: "HR & Payroll",
    subgroup: "statutory",
    workspace: "salary-workspace",
    mode: "ctc-to-net",
    status: "live",
    description:
      "Employee and employer ESI contributions at 0.75% and 3.25%, showing clearly that the scheme applies only while monthly gross is at or below the ₹21,000 ceiling.",
    keywords:
      "esi calculator esic employee state insurance 0.75 3.25 wage ceiling 21000 monthly gross eligibility contribution",
    h1: "ESI Calculator",
    seoTitle: "ESI Calculator — 0.75% and 3.25% up to ₹21,000",
    seoDescription:
      "Calculate employee ESI at 0.75% and employer ESI at 3.25% of gross wages, with the ₹21,000 monthly ceiling applied and the eligibility cut-off explained.",
    primaryKeyword: "esi calculator",
    secondaryKeywords: [
      "esi contribution calculator",
      "esi on 21000 gross salary",
      "employee and employer esi share",
      "esi eligibility and ceiling",
      "esi deduction from salary",
    ],
    researchId: "hr-esi",
    alternativeTitles: [
      "ESIC Contribution Calculator",
      "Employee State Insurance Calculator",
    ],
    alternativeDescription:
      "See the employee and employer ESI shares on a monthly gross wage, and whether the ₹21,000 ceiling puts the employee in or out of the scheme.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/pf-calculator",
      "/tools/in-hand-salary-calculator",
    ],
    steps: [
      "Enter the annual CTC. The tool derives monthly gross, which is the ESI wage.",
      "Keep ESI enabled to see the contributions where the wage is within the ceiling.",
      "Read whether ESI applies at all — above ₹21,000 monthly gross the scheme does not cover the employee.",
      "Check both shares: 0.75% is deducted from the employee, 3.25% is an employer cost.",
    ],
    faqs: [
      {
        q: "What is the ESI wage ceiling?",
        a: "₹21,000 of monthly gross wages. An employee whose gross exceeds that is outside the scheme. For a person with a disability the ceiling is ₹25,000. The test is applied at the start of a contribution period, and there are rules about continuing coverage when wages rise mid-period.",
      },
      {
        q: "Why is there nothing deducted for ESI on my payslip?",
        a: "Because your monthly gross is above ₹21,000, so the scheme does not cover you. ESI is designed for lower-wage employees; most salaried professionals above ₹2.5 lakh a year never see it. The tool says explicitly when this is the reason, rather than showing a silent zero.",
      },
      {
        q: "What does ESI actually cover?",
        a: "Medical benefit for the employee and dependants, sickness benefit at about 70% of average daily wages for a limited period, maternity benefit, disablement benefit and dependants' benefit. The medical benefit is the one most employees actually use.",
      },
      {
        q: "Is the employer's 3.25% part of CTC?",
        a: "Yes, in the standard CTC structure — which is why take-home is lower than gross. It is a cost the employer bears and not money the employee receives. The breakdown shows it separately so it is not confused with a deduction.",
      },
    ],
    reference: [
      {
        title: "The rates and ceiling",
        body: "Employee contribution: 0.75% of gross wages. Employer contribution: 3.25%. Wage ceiling: ₹21,000 a month of gross (₹25,000 for employees with a disability). ESI applies to establishments with ten or more employees, with some state variation.",
      },
      {
        title: "Contribution periods",
        body: "ESI operates in six-month contribution periods, April to September and October to March. Coverage is determined at the start of a period: if an employee is within the ceiling then, they stay covered until the period ends even if their wages rise. The reverse also applies, which is why the ceiling is not a simple month-by-month test.",
      },
    ],
    jurisdiction: "India — Employees' State Insurance Act, 1948",
    caveat:
      "Contribution arithmetic only. The contribution-period rules mean actual coverage can differ from a simple month-by-month comparison.",
  },
  {
    slug: "gratuity-calculator",
    name: "Gratuity Calculator",
    categoryName: "HR & Payroll",
    subgroup: "statutory",
    workspace: "attendance-workspace",
    mode: "gratuity",
    status: "live",
    description:
      "Gratuity under the Payment of Gratuity Act: 15/26 of last drawn basic plus DA for each completed year, with the six-month rounding rule and the ₹20 lakh ceiling applied.",
    keywords:
      "gratuity calculator payment of gratuity act 15/26 last drawn basic da five years completed years ceiling 20 lakh resignation retirement",
    h1: "Gratuity Calculator",
    seoTitle: "Gratuity Calculator — 15/26 of Basic + DA",
    seoDescription:
      "Calculate gratuity under the Payment of Gratuity Act: 15/26 of last drawn basic plus DA per completed year, with six-month rounding and the ₹20 lakh cap.",
    primaryKeyword: "gratuity calculator",
    secondaryKeywords: [
      "gratuity under payment of gratuity act",
      "15 26 gratuity formula",
      "gratuity for 5 years service",
      "gratuity exemption 20 lakh",
      "gratuity on last drawn basic",
    ],
    researchId: "hr-gratuity",
    alternativeTitles: [
      "Gratuity Under the Payment of Gratuity Act",
      "Gratuity and Exemption Calculator",
    ],
    alternativeDescription:
      "Enter last drawn basic plus DA and years of service to see gratuity, the years actually counted, and whether the statutory ceiling applies.",
    internalLinks: [
      "/tools/full-and-final-settlement",
      "/tools/leave-encashment-calculator",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter the last drawn monthly basic plus dearness allowance — not the gross salary.",
      "Enter completed years of service. Add any extra months in the final year separately.",
      "Read the gratuity, the years actually counted after rounding, and whether eligibility applies.",
      "Check the ceiling note if the computed amount crosses ₹20 lakh.",
    ],
    faqs: [
      {
        q: "How is the 15/26 formula derived?",
        a: "Fifteen days of wages for every completed year, where a month is treated as 26 working days. So gratuity = 15 days ÷ 26 days × monthly basic + DA × completed years. The 26 reflects the six-day working week assumed by the Act, not the 30 days of a calendar month — using 30 produces the classic overestimate.",
      },
      {
        q: "Does a part-year count?",
        a: "Yes, if it is more than six months. A service of 7 years and 8 months counts as 8 years; 7 years and 5 months counts as 7. This rounding is in the Act and is genuinely applied, so it is worth checking rather than dropping the fraction.",
      },
      {
        q: "What happens with less than five years of service?",
        a: "Gratuity is not payable. The Act requires five completed years of continuous service, with exceptions for death or disablement, where the requirement does not apply and a different calculation is used. This tool states plainly when you are not eligible rather than showing a small number.",
      },
      {
        q: "Is gratuity taxable?",
        a: "Gratuity received by a government employee is fully exempt. For others covered by the Act it is exempt up to ₹20 lakh, which is the ceiling applied here. Anything above is taxable as salary income. There are separate rules for employees not covered by the Act.",
      },
    ],
    reference: [
      {
        title: "The formula",
        body: "Gratuity = 15 ÷ 26 × last drawn monthly basic + DA × completed years of service, with a part of a year over six months counted as a full year. For monthly-rated employees the wage base is basic plus dearness allowance only — not gross salary, and not allowances.",
      },
      {
        title: "Continuous service",
        body: "Five years of continuous service are required. Continuous service is broken by unauthorised absence but not by approved leave, and a year counts as continuous when the employee has worked at least 240 days (or 190 in a seasonal establishment). Service before a break may be counted if the break was not a termination.",
      },
      {
        title: "Payment and interest",
        body: "Gratuity must be paid within 30 days of it becoming due, whether on superannuation, resignation or death. Beyond that the employer is liable to pay simple interest at the rate notified by the central government. Gratuity is not part of the monthly salary and cannot be withheld to recover a disputed amount without due process.",
      },
    ],
    jurisdiction: "India — Payment of Gratuity Act, 1972",
    caveat:
      "The statutory formula for employees covered by the Act. A contractual scheme or an establishment outside the Act can use a different basis.",
  },
  {
    slug: "full-and-final-settlement",
    name: "Full and Final Settlement",
    categoryName: "HR & Payroll",
    subgroup: "statutory",
    workspace: "attendance-workspace",
    mode: "full-and-final",
    status: "live",
    description:
      "Everything owed on the last working day — prorated salary, leave encashment, gratuity and bonus — minus notice recovery, with each line itemised.",
    keywords:
      "full and final settlement calculator fnf settlement leaving job salary prorated leave encashment gratuity notice recovery exit dues",
    h1: "Full and Final Settlement",
    seoTitle: "Full and Final Settlement Calculator",
    seoDescription:
      "Calculate a full and final settlement: prorated salary, leave encashment, gratuity where eligible, bonus and notice recovery, itemised line by line.",
    primaryKeyword: "full and final settlement calculator",
    secondaryKeywords: [
      "fnf settlement calculation",
      "final salary after resignation",
      "leave encashment in final settlement",
      "notice recovery in fnf",
      "full and final settlement breakdown",
    ],
    researchId: "hr-full-and-final",
    alternativeTitles: [
      "FNF Settlement Calculator",
      "Exit Dues Calculator for India",
    ],
    alternativeDescription:
      "Work out what is owed when someone leaves: prorated final salary, leave encashment, gratuity if eligible, bonus owed, and what a notice shortfall recovers.",
    internalLinks: [
      "/tools/gratuity-calculator",
      "/tools/leave-encashment-calculator",
      "/tools/notice-buyout-calculator",
    ],
    steps: [
      "Enter the monthly gross and the monthly basic plus DA. The two differ and are used for different components.",
      "Enter days worked in the final month and how many days that month has.",
      "Add the leave balance, bonus owed and years of service so gratuity eligibility can be checked.",
      "Enter the notice shortfall — days required minus days served — and read the net settlement.",
    ],
    faqs: [
      {
        q: "Why is leave encashment calculated on basic and not gross?",
        a: "Because most policies and several state rules define encashment at the basic plus DA day rate. Using gross overstates the amount by the value of the allowances. If your policy encashes at gross, enter a basic plus DA figure equal to gross and the result will match — the tool does not hide which base it used.",
      },
      {
        q: "Can an employer deduct notice pay from the final settlement?",
        a: "Only if the appointment letter or standing order provides for it, and only for the shortfall actually not served. A unilateral deduction with no contractual basis is recoverable by the employee. This tool computes the arithmetic and states the contractual condition; it does not decide whether the deduction is lawful.",
      },
      {
        q: "When must the settlement be paid?",
        a: "The Code on Wages and state Shops Acts require payment within a defined period — commonly two working days of removal or resignation under the Code, with state rules often allowing longer for other separations. Gratuity has its own 30-day rule. This tool does not compute deadlines because they vary by state and by the reason for separation.",
      },
      {
        q: "Is the settlement taxable?",
        a: "Each component is treated differently. Salary and leave encashment are taxable as salary, with a limited exemption for encashment on retirement. Gratuity is exempt up to ₹20 lakh where the Act applies. The total figure is not what you receive.",
      },
    ],
    reference: [
      {
        title: "The components",
        body: "Earnings: prorated salary for days worked, leave encashment on the basic plus DA day rate, gratuity where five or more years are completed, and any bonus or incentive owed. Deductions: notice-period recovery for days not served, and any other amount the contract allows, such as a loan balance.",
      },
      {
        title: "Day-rate bases",
        body: "Prorated salary uses monthly gross ÷ days in the month. Leave encashment and notice recovery typically use monthly basic plus DA ÷ 30. The difference matters: on a ₹60,000 gross with ₹28,000 basic, the two day rates differ by more than half.",
      },
    ],
    jurisdiction: "India",
    caveat:
      "Arithmetic on the figures you enter. Whether a deduction is permitted, and when the settlement is due, depends on your contract and your state's rules — neither is decided here.",
  },
  {
    slug: "leave-encashment-calculator",
    name: "Leave Encashment Calculator",
    categoryName: "HR & Payroll",
    subgroup: "statutory",
    workspace: "attendance-workspace",
    mode: "leave",
    status: "live",
    description:
      "Leave balance under monthly or annual accrual, the carry-forward cap and what lapses, plus the encashment value at the basic plus DA day rate.",
    keywords:
      "leave encashment calculator earned leave balance accrual carry forward cap lapse encashment value basic da day rate annual leave",
    h1: "Leave Encashment Calculator",
    seoTitle: "Leave Encashment Calculator — Balance",
    seoDescription:
      "Work out leave accrued under monthly or annual credit, what remains after leave taken, what lapses against the carry-forward cap, and the encashment value.",
    primaryKeyword: "leave encashment calculator",
    secondaryKeywords: [
      "earned leave encashment value",
      "leave balance cash value",
      "carry forward leave limit",
      "encashment on resignation",
      "unused leave payout",
    ],
    researchId: "hr-leave",
    alternativeTitles: [
      "Leave Balance and Encashment Calculator",
      "Earned Leave Accrual Calculator",
    ],
    alternativeDescription:
      "See how much leave has accrued, what is available after leave taken, what lapses beyond the carry-forward limit, and the cash value if the policy permits it.",
    internalLinks: [
      "/tools/full-and-final-settlement",
      "/tools/attendance-calculator",
      "/tools/statutory-leave-calculator",
    ],
    steps: [
      "Enter the annual entitlement from your policy or the applicable state Act.",
      "Choose how it accrues — monthly at one twelfth, or a single credit at the start of the year.",
      "Enter months elapsed, leave taken and any opening balance carried in.",
      "Set the carry-forward cap, then read what lapses and the encashment value if the policy allows it.",
    ],
    faqs: [
      {
        q: "Why does the tool not know my annual leave entitlement?",
        a: "Because there is no single national figure. The Factories Act gives one day per 20 days worked, state Shops and Establishments Acts set their own formulas (commonly 12 to 21 days), and company policy often exceeds both. Guessing would produce a wrong number with false confidence, so it is an input.",
      },
      {
        q: "What is the difference between monthly and annual accrual?",
        a: "Monthly accrual credits one twelfth of the entitlement each month, so leave builds gradually and someone joining in October has only a quarter of the year's entitlement. Annual credit gives the full amount at the start, which is more generous but means nothing accrues if the employee leaves early.",
      },
      {
        q: "Is leave encashment taxable?",
        a: "Encashment on resignation or termination is taxable as salary. On retirement, the exemption is the lower of the statutory amount notified, the actual amount received, the cash equivalent of leave earned (capped at 30 days per completed year) and the last drawn salary. This tool computes the cash value only, not the tax treatment.",
      },
      {
        q: "What happens to leave above the carry-forward cap?",
        a: "It lapses unless the policy allows encashment. Many companies allow encashment of the excess in a specific window, which is why the two are modelled separately. The result shows both the capped carry-forward and the forfeited amount rather than silently dropping the difference.",
      },
    ],
    reference: [
      {
        title: "Accrual methods",
        body: "Monthly: entitlement ÷ 12 × months elapsed. Annual: the full entitlement once twelve months have elapsed. Opening balance is added to accrued leave to give availability; leave taken is subtracted to give the balance.",
      },
      {
        title: "Encashment value",
        body: "Leave encashment is usually computed at the basic plus DA day rate — monthly basic plus DA ÷ 30 — for each encashable day. Some policies cap encashment at 30 days a year. Whether unused leave is encashable at all is a policy term, and the tool models a policy that does not permit it rather than assuming a cash value.",
      },
    ],
    jurisdiction: "India — varies by state Act and company policy",
    caveat:
      "The entitlement is yours to supply; this tool does not know your policy or your state's Act. Tax treatment of encashment is not modelled.",
  },
  {
    slug: "attendance-calculator",
    name: "Attendance Calculator",
    categoryName: "HR & Payroll",
    subgroup: "attendance",
    workspace: "attendance-workspace",
    mode: "attendance",
    status: "live",
    description:
      "Attendance percentage, present-only percentage, payable days and the loss-of-pay deduction, keeping the two percentages that payroll must not confuse apart.",
    keywords:
      "attendance percentage calculator working days present absent paid leave half day loss of pay lop salary deduction hr",
    h1: "Attendance Calculator",
    seoTitle: "Attendance Calculator — Percentage & LOP",
    seoDescription:
      "Calculate attendance percentage, the present-only percentage payroll must use, payable days and the loss-of-pay deduction, with half days and late marks.",
    primaryKeyword: "attendance calculator",
    secondaryKeywords: [
      "attendance percentage from present days",
      "payable days from attendance",
      "loss of pay calculation",
      "present only percentage payroll",
      "half day and late mark handling",
    ],
    researchId: "hr-attendance",
    alternativeTitles: [
      "Attendance and Loss-of-Pay Calculator",
      "Payable Days Calculator",
    ],
    alternativeDescription:
      "Enter present, leave, half and absent days to get attendance percentage, payable days and the salary deduction for unpaid absence.",
    internalLinks: [
      "/tools/overtime-calculator",
      "/tools/salary-calculator-india",
      "/tools/leave-encashment-calculator",
    ],
    steps: [
      "Enter the working days for the month — typically 22 to 26 — excluding declared holidays.",
      "Record present, paid leave, half days and unpaid absence as they appear in the register.",
      "Add the monthly wage if you want the loss-of-pay deduction in rupees, not just days.",
      "Read both percentages: attendance counts paid leave as available, present-only does not.",
    ],
    faqs: [
      {
        q: "Why are there two percentages?",
        a: "Because they answer different questions. Attendance percentage — present plus paid leave plus half days — is what an HR dashboard reports. Present-only percentage is what payroll must use, because paid leave is paid and unpaid absence is not. Paying full salary on 82% attendance when 4 of 22 days were unpaid absence is the classic payroll error this separation prevents.",
      },
      {
        q: "Should declared holidays be in the working days count?",
        a: "No. A declared holiday is paid and should not dilute the percentage. Enter only working days in the denominator and record holidays separately; the tool notes the count you entered so the arithmetic stays auditable.",
      },
      {
        q: "How are half days treated?",
        a: "Each half day counts as 0.5 payable days, which is the standard treatment. Some organisations treat two half days as one full absence for disciplinary purposes but pay for the half day worked — that is a policy decision, and this tool models the payment side.",
      },
      {
        q: "What about late marks?",
        a: "Many policies convert late marks beyond a monthly allowance into a half-day deduction. The engine supports that conversion, and the tool reports the penalty days separately so a disputed deduction can be traced to the rule that produced it.",
      },
    ],
    reference: [
      {
        title: "The formulas",
        body: "Attendance % = (present + paid leave + half days × 0.5 − late-mark penalty days) ÷ working days × 100. Present-only % = present ÷ working days × 100. Payable days = present + paid leave + half-day value − late-mark penalty. Loss of pay days = working days − payable days.",
      },
      {
        title: "The deduction",
        body: "Loss-of-pay deduction = monthly wage ÷ working days × loss-of-pay days. Some employers divide by 30 (calendar days) instead, which produces a smaller daily rate and therefore a smaller deduction for the same absence. Which divisor is correct depends on the contract and the state Shops Act.",
      },
    ],
    jurisdiction: "India",
    caveat:
      "Arithmetic on the register you enter. Whether the divisor is working days or 30 calendar days is a contract and state-law question, not a default this tool can assume.",
  },
  {
    slug: "overtime-calculator",
    name: "Overtime Calculator",
    categoryName: "HR & Payroll",
    subgroup: "attendance",
    workspace: "attendance-workspace",
    mode: "overtime",
    status: "live",
    description:
      "Overtime pay on the ordinary hourly rate with the multiplier as an explicit choice, because the statutory position is twice the ordinary rate under the Factories Act, not one and a half.",
    keywords:
      "overtime calculator india factories act double rate ordinary hourly wage multiplier 2x code on wages 48 hour week overtime pay",
    h1: "Overtime Calculator",
    seoTitle: "Overtime Calculator — Ordinary Hourly Rate",
    seoDescription:
      "Calculate overtime pay from the ordinary hourly rate with the multiplier shown, including the Factories Act rule of twice the ordinary rate and a 48-hour week.",
    primaryKeyword: "overtime calculator",
    secondaryKeywords: [
      "overtime pay from ordinary rate",
      "factories act overtime rate",
      "double the ordinary rate overtime",
      "48 hour week compliance",
      "ot hours to pay conversion",
    ],
    researchId: "hr-overtime",
    alternativeTitles: [
      "Overtime Pay Calculator India",
      "Hourly Rate and Overtime Calculator",
    ],
    alternativeDescription:
      "Enter the monthly wage, working days and overtime hours to see the ordinary hourly rate, the overtime rate at your multiplier, and the weekly-hours check.",
    internalLinks: [
      "/tools/attendance-calculator",
      "/tools/salary-calculator-india",
      "/tools/shift-hours-calculator",
    ],
    steps: [
      "Enter the monthly wage that overtime is computed on — gross or basic plus DA, depending on your policy.",
      "Set the contracted working days and hours per day so the ordinary hourly rate is explicit.",
      "Enter overtime hours and choose the multiplier, with the statutory default at twice the ordinary rate.",
      "Read the overtime pay, the weekly-hours check and any warning about the multiplier or quarterly cap.",
    ],
    faqs: [
      {
        q: "Is overtime 1.5x or 2x in India?",
        a: "The Factories Act requires twice the ordinary rate of wages. The Code on Wages derives the ordinary rate from total remuneration divided by hours actually worked, and overtime is twice that. Many private employers pay 1.5x as policy; that is lawful only where it is at least the statutory minimum for the establishment, or where the contract is genuinely more favourable overall. The tool does not hide this behind a default.",
      },
      {
        q: "How is the ordinary hourly rate calculated?",
        a: "Monthly wage ÷ (working days × hours per day). The Code on Wages instead divides total remuneration by hours actually worked in the month, which means a month with more overtime slightly lowers the base rate. The effect is small but real, and the tool states which basis it used.",
      },
      {
        q: "Is there a cap on overtime?",
        a: "Yes. The Factories Act limits a worker to 60 hours in any week including overtime, and total overtime in a quarter is capped (commonly 50 hours, with state variations). Beyond that an exemption is required. The tool flags a month with more than 50 overtime hours.",
      },
      {
        q: "Does overtime apply to all employees?",
        a: "No. The Factories Act covers workers in factories. The Code on Wages and the Shops and Establishments Acts extend overtime provisions to other categories, but supervisory and managerial employees are commonly excluded. Whether you are covered depends on your role and your state's Act, and this calculator does not decide it.",
      },
    ],
    reference: [
      {
        title: "The arithmetic",
        body: "Ordinary hourly rate = monthly wage ÷ (working days × hours per day). Overtime rate = ordinary rate × multiplier. Overtime pay = overtime rate × overtime hours. Total payable = monthly wage + overtime pay.",
      },
      {
        title: "Statutory basis",
        body: "Factories Act, 1948: overtime at twice the ordinary rate, maximum 60 hours a week including overtime, and quarterly caps. Code on Wages, 2019: the ordinary rate is derived from total remuneration divided by hours actually worked, and overtime is twice that. The Factories Act allows a spread-over but not more than 10.5 hours a day including overtime in most states.",
      },
    ],
    jurisdiction: "India — Factories Act 1948 and Code on Wages 2019",
    caveat:
      "The multiplier is your choice and the tool states the statutory position rather than enforcing it. Coverage of overtime provisions depends on your role, establishment and state.",
  },
  {
    slug: "shift-hours-calculator",
    name: "Shift Hours Calculator",
    categoryName: "HR & Payroll",
    subgroup: "attendance",
    workspace: "attendance-workspace",
    mode: "shift",
    status: "live",
    description:
      "Paid hours in a shift after break, overnight shifts crossing midnight, and the weekly total checked against the 48-hour statutory limit.",
    keywords:
      "shift hours calculator overnight shift duration night shift payroll weekly hours 48 hour limit break deduction",
    h1: "Shift Hours Calculator",
    seoTitle: "Shift Hours Calculator — Overnight and Weekly",
    seoDescription:
      "Calculate paid shift hours after breaks, including overnight shifts that cross midnight, and check the weekly total against the 48-hour statutory limit.",
    primaryKeyword: "shift hours calculator",
    secondaryKeywords: [
      "working hours between two times",
      "night shift duration calculator",
      "break deduction from shift",
      "spanning midnight shift hours",
      "shift length in hours and minutes",
    ],
    researchId: "hr-shift",
    alternativeTitles: [
      "Shift Duration and Weekly Hours Calculator",
      "Night Shift Hours Calculator",
    ],
    alternativeDescription:
      "Enter start and end times and an unpaid break to get paid hours per shift and the weekly total, with overnight shifts handled.",
    internalLinks: [
      "/tools/overtime-calculator",
      "/tools/attendance-calculator",
      "/tools/working-days-calculator",
    ],
    steps: [
      "Enter the start and end times in 24-hour format. If the end is earlier than the start, the shift is treated as overnight.",
      "Enter the unpaid break in minutes so paid hours exclude it.",
      "Set the days per week and read the weekly total against the 48-hour limit.",
    ],
    faqs: [
      {
        q: "How are overnight shifts handled?",
        a: "If the end time is earlier than the start time, 24 hours are added before the subtraction. A 22:00 to 06:00 shift therefore computes as 8 hours, not a negative 16. This is the one case where naive time subtraction fails, and it is the case night-shift payroll most often gets wrong.",
      },
      {
        q: "Is the break paid or unpaid?",
        a: "Whatever the contract says — the tool lets you enter it as unpaid, which is the common arrangement. A paid lunch break is unusual but does exist in some organisations, and setting the break to zero models it correctly.",
      },
      {
        q: "What is the 48-hour weekly limit?",
        a: "The Factories Act sets a 48-hour week and a 9-hour day, with a maximum spread-over that varies by state. The tool flags a schedule that exceeds 48 hours so the overtime rules can be applied rather than discovered in an inspection.",
      },
      {
        q: "Does night work attract extra pay?",
        a: "Some states require a night-shift allowance and the Code on Occupational Safety, Health and Working Conditions introduces provisions on night work, including a rest period. A specific percentage is set by state rules, not by a universal national figure, so this tool does not compute an allowance.",
      },
    ],
    reference: [
      {
        title: "The calculation",
        body: "Paid minutes = end − start, adding 24 hours if end is earlier than start, then subtracting the unpaid break. Paid hours = paid minutes ÷ 60. Weekly hours = paid hours per day × days per week.",
      },
      {
        title: "The statutory limits",
        body: "Factories Act: 9 hours a day and 48 hours a week for an adult worker, with overtime allowed up to 60 hours a week including overtime. The Code on Occupational Safety, Health and Working Conditions, 2020 restates the 8-hour day and 48-hour week with a 15-minute interval every five hours.",
      },
    ],
    jurisdiction:
      "India — Factories Act 1948 and state Shops and Establishments Acts",
    caveat:
      "Duration arithmetic only. Night-shift allowances and rest rules vary by state and are not computed here.",
  },
  // ──────────────────────────────────────────────── HR & Payroll · Documents
  {
    slug: "salary-slip-generator",
    name: "Salary Slip Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "payslip",
    status: "live",
    description:
      "Generate a printable payslip from earnings and deductions you enter, with gross, total deductions, net pay and employer cost summed and checked.",
    keywords:
      "salary slip generator payslip format india printable earnings deductions net pay code on wages wage slip employer",
    h1: "Salary Slip Generator",
    seoTitle: "Salary Slip Generator — Printable Payslip",
    seoDescription:
      "Create a printable salary slip from your own earnings and deductions: gross, deductions, net pay and employer cost, with warnings if the figures do not balance.",
    primaryKeyword: "salary slip generator",
    secondaryKeywords: [
      "payslip format with pf and esi",
      "printable monthly pay slip",
      "earnings and deductions breakdown",
      "gross to net pay slip",
      "employer cost on payslip",
    ],
    researchId: "hr-payslip",
    alternativeTitles: [
      "Payslip Generator and Calculator",
      "Printable Wage Slip Maker",
    ],
    alternativeDescription:
      "Add each earning and deduction to build a payslip you can print or download, with the totals checked and each deduction named.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/pf-calculator",
      "/tools/offer-letter-generator",
    ],
    steps: [
      "Enter the employer and employee details. Only the fields you fill appear on the slip.",
      "Add each earning and deduction as your payroll system names it; blank or zero rows are skipped.",
      "Enter the working, paid and loss-of-pay days for the month.",
      "Preview the printed slip, then copy the text or download the printable HTML.",
    ],
    faqs: [
      {
        q: "What must a payslip contain?",
        a: "The Code on Wages requires every employer to issue a wage slip. The commonly required particulars are the employer's name and address, the employee's name and identifier, the wage period, the gross and net wages with the components itemised, and the deductions with their purpose. A deduction with no explanation is the defect most often raised in inspection.",
      },
      {
        q: "Is my data uploaded?",
        a: "No. The slip is assembled in this tab from the values in the form. Nothing is sent to a server, nothing is stored, and reloading the page clears everything. That is deliberate — a payslip contains salary and bank details that should not be on someone else's machine.",
      },
      {
        q: "Does it compute PF and professional tax for me?",
        a: "No, and that is a deliberate boundary. Those depend on the wage structure, the state and the employer's PF basis, and a slip that silently computed them would be wrong for most users. Use the PF and salary calculators to work out the amounts, then enter them here as the deduction rows.",
      },
      {
        q: "Can I use this for a batch of employees?",
        a: "No. This builds one slip at a time. A batch needs a payroll system, because each slip must be checked against that employee's structure, leave and statutory position — a bulk generator that skips those checks is how payroll errors happen.",
      },
    ],
    reference: [
      {
        title: "The arithmetic on the slip",
        body: "Gross earnings = sum of earning rows. Total deductions = sum of deduction rows. Net pay = gross − deductions. Employer cost = gross + employer contributions, which are shown separately because they are not deducted from pay.",
      },
      {
        title: "Why the totals are checked",
        body: "The tool flags a slip with no earnings, deductions exceeding earnings, or a negative net, because each of those is invalid rather than merely unusual. It also warns when no deductions exist at all, since PF at 12% of basic is normally required.",
      },
    ],
    jurisdiction: "India — Code on Wages 2019 wage-slip particulars",
    caveat:
      "A document generator, not a payroll system. It does not compute statutory deductions, verify employee records, or constitute evidence of payment.",
  },
  {
    slug: "offer-letter-generator",
    name: "Offer Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "offer",
    status: "live",
    description:
      "An offer letter with designation, compensation, joining date, conditions and validity, built only from facts you supply — every gap stays a visible placeholder.",
    keywords:
      "offer letter generator india format employment offer ctc joining date conditions appointment letter template hr",
    h1: "Offer Letter Generator",
    seoTitle: "Offer Letter Generator — Employment Offer Format",
    seoDescription:
      "Draft an employment offer letter with designation, CTC, joining date, conditions and validity. Any blank stays a visible placeholder, never invented text.",
    primaryKeyword: "offer letter generator",
    secondaryKeywords: [
      "employment offer letter format",
      "offer letter with ctc and joining date",
      "conditional offer letter template",
      "offer validity and acceptance",
      "appointment letter draft",
    ],
    researchId: "hr-offer-letter",
    alternativeTitles: [
      "Employment Offer Letter Maker",
      "Appointment Offer Generator",
    ],
    alternativeDescription:
      "Build an offer letter from your own details, with the conditions and validity date stated explicitly and no invented claims about the candidate.",
    internalLinks: [
      "/tools/experience-letter-generator",
      "/tools/increment-letter-generator",
      "/tools/salary-slip-generator",
    ],
    steps: [
      "Enter the company, the candidate and the signatory.",
      "Fill in the role, CTC, joining date, location, conditions and validity date.",
      "Check the placeholder count — anything still bracketed must be filled before issue.",
      "Copy the text or download the printable HTML, then have your counsel review the terms.",
    ],
    faqs: [
      {
        q: "Is this legally sufficient as an offer?",
        a: "No, and it does not claim to be. It provides structure and the fields an offer needs — role, compensation, start date, conditions, validity and the governing document. The actual terms, especially notice, confidentiality, intellectual property and non-compete, belong in an appointment letter drafted or reviewed by an employment lawyer.",
      },
      {
        q: "Why are there placeholders in the output?",
        a: "Because the alternative is worse. A template that fills gaps with plausible-sounding text produces a letter containing statements nobody wrote and nobody checked — about conditions, compensation or reporting lines. Leaving a visible [placeholder] makes the gap impossible to miss.",
      },
      {
        q: "Should the offer state a salary range or an exact figure?",
        a: "An offer is a commitment, so it states the exact CTC and the structure. A range in an offer letter creates ambiguity about what was accepted. Publish the range in the job description instead, where it helps candidates self-select.",
      },
      {
        q: "What conditions are normally included?",
        a: "Common ones are a satisfactory reference check, verification of documents and qualifications, a medical fitness check where the role requires it, and the right to withdraw if any condition is not met. Only include conditions you will actually apply — an unenforced condition weakens the ones you do enforce.",
      },
    ],
    reference: [
      {
        title: "What an offer letter needs",
        body: "The employer's identity, the candidate's name, the role and reporting line, the annual CTC and its structure (usually in an annexure), the joining date and work location, any conditions, the validity of the offer, and the document that will govern the employment. The acceptance mechanism — a signed duplicate — should be stated.",
      },
      {
        title: "What it should not contain",
        body: "Statements about the candidate's qualities, promises about future increments or promotions that are not policy, contradictory terms, or conditions that cannot be verified. An offer letter is read by lawyers when things go wrong; every sentence in it should be one the employer can stand behind.",
      },
    ],
    jurisdiction: "India — general employment contracting",
    caveat:
      "A drafting aid, not legal advice. Have your employment counsel review the terms before issuing, particularly the restrictive covenants.",
  },
  {
    slug: "experience-letter-generator",
    name: "Experience Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "experience",
    status: "live",
    description:
      "An experience certificate stating the dates, designation, department and responsibilities on record, with no performance claims added.",
    keywords:
      "experience letter generator india format experience certificate relieving letter employment certificate work experience hr",
    h1: "Experience Letter Generator",
    seoTitle: "Experience Letter Generator — Job Certificate",
    seoDescription:
      "Generate an experience certificate with the dates, designation, department and duties actually held. Only entered facts appear — no performance claim is added.",
    primaryKeyword: "experience letter generator",
    secondaryKeywords: [
      "experience certificate format",
      "employment certificate with dates",
      "work experience letter template",
      "relieving and experience letter",
      "service certificate for employee",
    ],
    researchId: "hr-experience-letter",
    alternativeTitles: [
      "Employment Certificate Generator",
      "Work Experience Letter Maker",
    ],
    alternativeDescription:
      "Produce an experience certificate from the employee's own record, stating dates and responsibilities without adding opinions about their performance.",
    internalLinks: [
      "/tools/offer-letter-generator",
      "/tools/relieving-letter-generator",
      "/tools/salary-slip-generator",
      "/tools/internship-certificate-generator",
    ],
    steps: [
      "Enter the company, employee and signatory details.",
      "Add the start date, last working day, department and the responsibilities actually held.",
      "Read the draft, confirming every statement is one your records support.",
      "Copy or download the printable version for signature and seal.",
    ],
    faqs: [
      {
        q: "Why does the letter make no statement about performance?",
        a: "Because an experience letter is relied on by future employers and, in disputes, by courts. A performance opinion in it creates a representation the company must substantiate, and it exposes the issuer to claims if the opinion is disputed. Stating facts — dates, designation, responsibilities — is defensible and is all a future employer needs to verify.",
      },
      {
        q: "Is an experience letter mandatory?",
        a: "There is no single national statute that mandates one, but many state Shops and Establishments Acts require that a service certificate be issued on termination, and it is standard practice. Withholding it to pressure an employee over a dispute is a common complaint and rarely defensible.",
      },
      {
        q: "What is the difference from a relieving letter?",
        a: "An experience letter certifies what the person did; a relieving letter confirms they have been released from duty and the date. They are often issued together but serve different purposes, and some employers accept one without the other.",
      },
      {
        q: "Can I state a reason for leaving?",
        a: "It is better not to, unless the employee asks and the reason is a matter of record. Reasons invite dispute and add nothing a future employer can verify. The template omits a reason field deliberately.",
      },
    ],
    reference: [
      {
        title: "What belongs in it",
        body: "Employee name, the dates of employment, the designation held, and the department. Responsibilities may be listed where they are on record and relevant. The signature of an authorised signatory and the company seal make it verifiable.",
      },
      {
        title: "What does not belong in it",
        body: "Performance ratings, opinions about conduct, reasons for departure, future employment prospects, or salary details — the last belongs in a salary certificate issued separately for credit or visa purposes. Adding any of these creates an unnecessary representation.",
      },
    ],
    jurisdiction:
      "India — state Shops and Establishments Acts and general practice",
    caveat:
      "A drafting aid. State only what your records support; an experience letter is treated as evidence if employment is later disputed.",
  },
  {
    slug: "relieving-letter-generator",
    name: "Relieving Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "relieving",
    status: "live",
    description:
      "A relieving letter confirming the last working day, that duties were handed over, and the full and final settlement that has been processed.",
    keywords:
      "relieving letter generator india format last working day full and final settlement exit clearance resignation acceptance",
    h1: "Relieving Letter Generator",
    seoTitle: "Relieving Letter Generator — Exit Confirmation",
    seoDescription:
      "Generate a relieving letter stating the last working day, handover of duties and the full and final settlement processed, from the exit facts you supply.",
    primaryKeyword: "relieving letter generator",
    secondaryKeywords: [
      "relieving letter format",
      "last working day confirmation letter",
      "relieving after notice period",
      "relieving letter with settlement",
      "no dues confirmation letter",
    ],
    researchId: "hr-relieving-letter",
    alternativeTitles: [
      "Exit Confirmation Letter Generator",
      "Relieving Certificate Maker",
    ],
    alternativeDescription:
      "Produce a relieving letter confirming the last working day and the settlement processed, with only the facts you enter and no opinions added.",
    internalLinks: [
      "/tools/experience-letter-generator",
      "/tools/full-and-final-settlement",
      "/tools/notice-period-calculator",
    ],
    steps: [
      "Enter the company, employee and signatory details.",
      "Add the last working day, the full and final amount and the date it was processed.",
      "Confirm the company property and access-return statement is accurate before issuing.",
      "Copy or download the printable version.",
    ],
    faqs: [
      {
        q: "Should a relieving letter wait for the full and final settlement?",
        a: "That is the usual practice, and the letter states the settlement amount and date. Withholding the letter indefinitely over a disputed amount is a different matter — it affects the employee's ability to take another job and is often treated as coercion. If there is a genuine dispute, issue the letter with the status stated.",
      },
      {
        q: "What if the employee did not serve the full notice?",
        a: "The letter records what happened: the last working day and the settlement that accounts for the shortfall. It does not need to editorialise. The notice recovery belongs in the settlement statement, not in the relieving letter.",
      },
      {
        q: "Is a relieving letter legally required?",
        a: "No national statute mandates it, but it is expected by most employers before joining and is effectively a condition of employment in practice. Refusing to issue one without a lawful reason is a significant action against the employee.",
      },
    ],
    reference: [
      {
        title: "What belongs in it",
        body: "Confirmation that duties have been relinquished, the last working day, a statement that the full and final settlement has been processed (with the amount and date), and confirmation that company property and access have been returned. Signed by an authorised signatory, with the seal.",
      },
    ],
    jurisdiction: "India — general employment practice",
    caveat:
      "Issue only when the exit formalities your policy requires are actually complete. The letter is a representation that they are.",
  },
  {
    slug: "warning-letter-generator",
    name: "Warning Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "warning",
    status: "live",
    description:
      "A warning letter that records the specific incident, the policy breached, the improvement expected and a response deadline — the due-process elements a warning needs.",
    keywords:
      "warning letter generator india format employee misconduct performance warning show cause notice hr disciplinary due process",
    h1: "Warning Letter Generator",
    seoTitle: "Warning Letter Generator — Employee Misconduct",
    seoDescription:
      "Draft a warning letter recording the incident, the policy clause breached, the improvement required and a response deadline, so due process is on the record.",
    primaryKeyword: "warning letter generator",
    secondaryKeywords: [
      "employee warning letter format",
      "written warning for misconduct",
      "warning letter with response deadline",
      "show cause notice to employee",
      "disciplinary warning letter",
    ],
    researchId: "hr-warning-letter",
    alternativeTitles: [
      "Employee Warning Letter Maker",
      "Show Cause Notice Generator",
    ],
    alternativeDescription:
      "Produce a warning letter with the incident, the policy breached, the improvement expected and a deadline for the employee's response.",
    internalLinks: [
      "/tools/termination-letter-generator",
      "/tools/experience-letter-generator",
      "/tools/job-description-generator",
    ],
    steps: [
      "Describe the issue in one neutral line and enter the date of the incident.",
      "Write a factual description — what happened, not what it says about the person.",
      "Name the policy and clause that was breached.",
      "State the improvement required and set both an improvement deadline and a response deadline.",
    ],
    faqs: [
      {
        q: "Why does the letter include a response deadline?",
        a: "Because an opportunity to respond is what separates a warning from a penalty. Several state Shops and Establishments Acts and the principles of natural justice require that an employee be heard before disciplinary action. A warning issued without it is vulnerable when challenged, and the deadline makes the opportunity explicit.",
      },
      {
        q: "Should a warning describe the person or the behaviour?",
        a: 'The behaviour. "Failed to submit three reports by the agreed deadline" is defensible; "is careless and unreliable" is an opinion that is hard to substantiate and reads as hostility. The template\'s description field is labelled as factual for that reason.',
      },
      {
        q: "How many warnings before termination?",
        a: "There is no universal number. Your policy should state the progression, and many use a verbal warning, a written warning and a final warning before termination for performance matters. Misconduct involving violence, theft or harassment is usually treated separately and can justify immediate action after a proper enquiry.",
      },
      {
        q: "Should the employee sign it?",
        a: "Their acknowledgement of receipt, not agreement, is what matters. Record the acknowledgement on a copy; refusal to sign should be witnessed and noted. An unsigned letter that was delivered is still a warning.",
      },
    ],
    reference: [
      {
        title: "The elements due process requires",
        body: "A specific factual allegation with a date, the rule or standard breached, a genuine opportunity to respond with a deadline, a stated expectation for improvement and a timeframe, and the consequence of non-improvement. Each of these is a field in the template rather than an implied assumption.",
      },
      {
        title: "Why the specificity matters",
        body: "A warning that cannot be tied to a date and an act cannot be relied on later. If the matter escalates to an enquiry, the letter is the first document examined, and vagueness in it undermines everything that follows — including a later termination that may be justified on the facts.",
      },
    ],
    jurisdiction:
      "India — state Shops and Establishments Acts and principles of natural justice",
    caveat:
      "A drafting aid, not legal advice. Disciplinary documents carry legal weight; obtain advice before issuing, especially where termination is possible.",
  },
  {
    slug: "appreciation-letter-generator",
    name: "Appreciation Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "appreciation",
    status: "live",
    description:
      "A recognition letter that names the specific contribution, the period and the concrete impact, rather than generic praise.",
    keywords:
      "appreciation letter generator india format recognition letter employee award commendation specific contribution hr",
    h1: "Appreciation Letter Generator",
    seoTitle: "Appreciation Letter Generator — Recognition",
    seoDescription:
      "Write an appreciation letter naming the specific contribution, the period and the concrete impact, instead of the generic praise that reads as boilerplate.",
    primaryKeyword: "appreciation letter generator",
    secondaryKeywords: [
      "appreciation letter for employee",
      "recognition letter with specific impact",
      "thank you letter to a colleague",
      "commendation letter format",
      "spot recognition note",
    ],
    researchId: "hr-appreciation-letter",
    alternativeTitles: [
      "Employee Recognition Letter Maker",
      "Commendation Letter Generator",
    ],
    alternativeDescription:
      "Produce a recognition letter built around one specific contribution and its impact, with the details that make praise believable.",
    internalLinks: [
      "/tools/increment-letter-generator",
      "/tools/experience-letter-generator",
      "/tools/warning-letter-generator",
    ],
    steps: [
      "Describe the specific contribution — what was done, not how good the person is.",
      "Add the period it happened in.",
      "State the concrete impact, because that is what makes recognition credible.",
      "Copy or download the letter for signature.",
    ],
    faqs: [
      {
        q: "Why does this refuse to write generic praise?",
        a: 'Because generic praise does not work. "Great job, keep it up" is indistinguishable from a form letter and is discounted accordingly. Naming the specific act and its impact is what makes recognition land, and it is the only part of the letter a recipient can actually verify.',
      },
      {
        q: "Should an appreciation letter be in the personnel file?",
        a: "Yes, alongside warnings. A file that contains only problems gives a distorted record if performance is later disputed, and the positive documentation is evidence too.",
      },
      {
        q: "Can this replace a monetary award?",
        a: "No, and it should not be presented as one. Recognition and compensation are separate; a letter offered instead of a promised bonus reads as a substitute and does more harm than no letter at all.",
      },
    ],
    reference: [
      {
        title: "The three components that make it credible",
        body: "A specific act (what was done), a period (when), and a concrete impact (why it mattered). Without the third, the letter reads as a formality. With all three, it is a document the recipient can keep and cite.",
      },
    ],
    jurisdiction: "India — general HR practice",
    caveat:
      "A drafting aid. Add the specific facts — the template supplies structure only.",
  },
  {
    slug: "increment-letter-generator",
    name: "Increment Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "increment",
    status: "live",
    description:
      "An increment letter stating the previous and revised CTC, the effective date and the statutory components that are recalculated.",
    keywords:
      "increment letter generator india format salary revision letter appraisal hike letter revised ctc effective date pf recalculation",
    h1: "Increment Letter Generator",
    seoTitle: "Increment Letter Generator — Salary Revision",
    seoDescription:
      "Generate an increment letter with the previous and revised CTC, the effective date and the statutory components recalculated on the new structure.",
    primaryKeyword: "increment letter generator",
    secondaryKeywords: [
      "salary increment letter format",
      "hike letter with revised ctc",
      "promotion cum increment letter",
      "effective date of revision",
      "annual revision letter to employee",
    ],
    researchId: "hr-increment-letter",
    alternativeTitles: [
      "Salary Revision Letter Maker",
      "Appraisal Outcome Letter Generator",
    ],
    alternativeDescription:
      "Produce an increment letter showing the old and new CTC, the effective date and the effect on PF, ESI and professional tax.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/appreciation-letter-generator",
      "/tools/pf-calculator",
    ],
    steps: [
      "Enter the review cycle and the effective date.",
      "Add the previous and revised CTC and the increase in both amount and percentage.",
      "State which statutory components are recalculated — PF and professional tax change when basic changes.",
      "Copy or download the letter.",
    ],
    faqs: [
      {
        q: "Why does the letter mention PF and professional tax?",
        a: "Because an increment changes the basic, and PF is a percentage of basic up to the ceiling, while professional tax is banded by monthly gross. An employee whose basic crosses ₹15,000 will see PF stop increasing with basic, and one whose gross crosses a professional-tax band will see a larger deduction. Stating this avoids a confused payroll query the next month.",
      },
      {
        q: "Should the percentage be on CTC or on gross?",
        a: "State both, and say which basis the percentage uses. A 10% increase on CTC is a smaller increase on gross when the basic share is low, and confusing the two is a common source of dispute at appraisal time.",
      },
      {
        q: "Does the letter need to restate the whole structure?",
        a: "Reference an annexure with the revised structure rather than embedding it, unless the structure is short. The letter records the decision; the annexure records the arithmetic, and they should be consistent.",
      },
    ],
    reference: [
      {
        title: "What it records",
        body: "The review cycle, the effective date, the previous CTC, the revised CTC, the increase in amount and percentage, and which statutory deductions are recalculated. All other terms of employment remain as they were, which the letter should say explicitly.",
      },
    ],
    jurisdiction: "India — general HR practice and statutory contributions",
    caveat:
      "A drafting aid. Check the revised structure still meets PF, ESI, gratuity and any applicable minimum-wage obligations before issuing.",
  },
  {
    slug: "termination-letter-generator",
    name: "Termination Letter Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "termination",
    status: "live",
    description:
      "A termination letter stating the clause relied on, the effective date, notice or pay in lieu and the settlement terms, with explicit legal-review warnings.",
    keywords:
      "termination letter generator india format employment termination notice pay in lieu settlement clause contractual discharge hr",
    h1: "Termination Letter Generator",
    seoTitle: "Termination Letter Generator — Employment End",
    seoDescription:
      "Draft a termination letter stating the clause relied on, the effective and last working dates, notice or pay in lieu and the settlement, with gaps flagged.",
    primaryKeyword: "termination letter generator",
    secondaryKeywords: [
      "termination letter format india",
      "termination with notice or pay in lieu",
      "letter citing the termination clause",
      "last working day on termination",
      "termination settlement letter",
    ],
    researchId: "hr-termination-letter",
    alternativeTitles: [
      "Employment Termination Letter Maker",
      "Discharge Letter Generator",
    ],
    alternativeDescription:
      "Produce a termination letter that states its contractual basis, the dates and the settlement, with the points your counsel must review listed explicitly.",
    internalLinks: [
      "/tools/warning-letter-generator",
      "/tools/full-and-final-settlement",
      "/tools/relieving-letter-generator",
    ],
    steps: [
      "Enter the clause of the contract being relied on — without one the letter is unsupported.",
      "State the effective date and the last working day.",
      "Record the notice given or the pay in lieu, and the settlement terms and date.",
      "Have counsel review before issuing; the tool flags the risk but does not assess your case.",
    ],
    faqs: [
      {
        q: "Is a termination letter the same as a dismissal?",
        a: "Termination ends the employment under a contractual right, often with notice or pay in lieu. Dismissal usually follows a disciplinary finding and carries stronger procedural expectations. The two have different legal consequences, and using a termination letter to achieve what is in substance a dismissal for misconduct does not change how it will be assessed.",
      },
      {
        q: "What process does Indian law require?",
        a: 'It depends on the establishment and the worker\'s category. The Industrial Disputes Act requires a valid reason and, for retrenchment, notice, compensation and procedure; the Shops and Establishments Acts set notice periods; the Code on Industrial Relations restates and consolidates these. "At-will" employment is not the Indian model for most workers, which is why the clause relied on matters.',
      },
      {
        q: "Can an employer terminate without notice?",
        a: "Only where the contract permits it, typically for cause, and usually after an enquiry. Otherwise notice or salary in lieu is owed. The letter records whichever applies — it does not make an unlawful absence of notice lawful.",
      },
      {
        q: "Should the reason be stated?",
        a: "If the termination is for cause, yes — with reference to the documented process that established it. An unexplained termination is harder to defend than one tied to a record. If the matter is genuinely performance-related and documented, say so; if it is a redundancy, say that and state the compensation.",
      },
    ],
    reference: [
      {
        title: "The elements",
        body: "The contractual clause relied on, the effective date, the last working day, notice given or pay in lieu of notice, the full and final settlement terms and date, and a reminder of continuing confidentiality and intellectual-property obligations. Plus the continuing obligations of the employer, including the relieving letter on completion of exit formalities.",
      },
    ],
    jurisdiction:
      "India — Industrial Disputes Act, state Shops and Establishments Acts, Code on Industrial Relations",
    caveat:
      "Termination carries the highest legal risk of any HR letter. Nothing here substitutes for counsel, and several Indian states and categories of worker require a specific process before employment can end.",
  },
  {
    slug: "internship-certificate-generator",
    name: "Internship Certificate Generator",
    categoryName: "HR & Payroll",
    subgroup: "documents",
    workspace: "document-studio",
    mode: "internship",
    status: "live",
    description:
      "An internship certificate confirming the period, the work performed and the outcomes delivered, for academic credit or a job application.",
    keywords:
      "internship certificate generator india format completion certificate intern letter academic credit work experience",
    h1: "Internship Certificate Generator",
    seoTitle: "Internship Certificate Generator — Completion",
    seoDescription:
      "Generate an internship certificate confirming the period, department, project and outcomes delivered, for academic credit or a job application.",
    primaryKeyword: "internship certificate generator",
    secondaryKeywords: [
      "internship certificate format",
      "completion certificate for intern",
      "internship letter with project details",
      "training certificate for student",
      "internship certificate for college",
    ],
    researchId: "hr-internship-certificate",
    alternativeTitles: [
      "Internship Completion Certificate Maker",
      "Intern Certificate Generator",
    ],
    alternativeDescription:
      "Produce an internship certificate with the dates, project, tasks and outcomes, and the purpose for which it is issued, from facts you enter.",
    internalLinks: [
      "/tools/experience-letter-generator",
      "/tools/offer-letter-generator",
      "/tools/resume-ats-checker",
    ],
    steps: [
      "Enter the intern's name and the internship period.",
      "Add the department, the project and the tasks performed.",
      "State the outcomes delivered and the purpose of the certificate.",
      "Copy or download the printable version for signature and seal.",
    ],
    faqs: [
      {
        q: "Should the certificate state outcomes or just attendance?",
        a: "Outcomes. A certificate that only confirms the intern showed up adds nothing for an academic supervisor or a future employer. Naming the project and what was delivered is what makes it useful, and it also makes the organisation think about whether the internship was designed well.",
      },
      {
        q: "Is an internship governed by labour law?",
        a: 'It depends. A genuine internship as part of a course is treated differently from an arrangement that is in substance employment, and several enforcement actions have addressed organisations using "intern" labels to pay below minimum wage. If the intern does productive work under direction for a long period, legal advice is worth taking.',
      },
      {
        q: "Does an intern receive a stipend?",
        a: "Optional and not stated in this certificate. Some states have rules on stipends for certain categories, and course requirements often specify one. The certificate does not mention money, which is deliberate — it is an experience record, not a payment record.",
      },
    ],
    reference: [
      {
        title: "What belongs in it",
        body: "The intern's name, the organisation, the exact period, the department and project, the tasks performed and the outcomes delivered, and the purpose for which the certificate is issued. Signed by the supervisor or HR and sealed by the organisation.",
      },
    ],
    jurisdiction:
      "India — general practice; course requirements usually specify the format",
    caveat:
      "A drafting aid. Check your institution's required format before issuing for academic credit.",
  },
  // ──────────────────────────────────────────────── HR & Payroll · People ops
  {
    slug: "job-description-generator",
    name: "Job Description Generator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "job-description",
    status: "live",
    description:
      "Assemble a job description from your own responsibility and requirement lists, with the sections a JD needs and flags for the choices that cost applications.",
    keywords:
      "job description generator india format responsibilities requirements jd template hiring salary range must have",
    h1: "Job Description Generator",
    seoTitle: "Job Description Generator — Hiring JD Format",
    seoDescription:
      "Build a job description from your own responsibilities and requirements, with the sections a JD needs and flags for long must-have lists and no salary range.",
    primaryKeyword: "job description generator",
    secondaryKeywords: [
      "jd format with responsibilities",
      "must have versus nice to have",
      "job description with salary range",
      "role scope and reporting line",
      "hiring brief for a role",
    ],
    researchId: "hr-job-description",
    alternativeTitles: [
      "Job Description Template Builder",
      "Hiring Manager JD and Role Scope Drafter",
    ],
    alternativeDescription:
      "Turn your responsibility and requirement lists into a structured job description, with a warning when the must-have list is long enough to deter applicants.",
    internalLinks: [
      "/tools/interview-plan-generator",
      "/tools/kpi-sheet-generator",
      "/tools/job-posting-schema-generator",
    ],
    steps: [
      "Enter the role title, seniority, location and work mode.",
      "List responsibilities and requirements one per line, keeping must-have and nice-to-have separate.",
      "Add a salary range if you can publish one.",
      "Read the draft and the flags, then copy or download it.",
    ],
    faqs: [
      {
        q: "Why does the tool warn about long must-have lists?",
        a: "Because long requirement lists reduce applications from qualified people. Candidates who do not match every item tend to self-select out, and research on job postings consistently finds that women and other under-represented groups apply only when they meet nearly all listed requirements. Ten must-haves where four would do is a filter against your own pipeline.",
      },
      {
        q: "Should I publish a salary range?",
        a: "If you can, yes. It is the most-requested item in candidate surveys, it filters out mismatched expectations before anyone spends an hour interviewing, and several jurisdictions now require it. If you cannot publish one, the tool says that is a decision rather than silently omitting it.",
      },
      {
        q: "Why is there a placeholder for the team's context?",
        a: "Because the two or three sentences describing why the role exists and what the team is working on cannot be generated. They are the part of a JD that candidates actually read, and filling them with generic copy is worse than leaving a visible prompt.",
      },
      {
        q: "Does it write the job description for me?",
        a: "It structures and orders the content you supply and adds the sections a JD is expected to have. It does not invent responsibilities or requirements, because those are the parts a candidate can hold you to and an employment tribunal can test.",
      },
    ],
    reference: [
      {
        title: "The sections a JD needs",
        body: "Role title and seniority, location and work mode, what the role owns and why it exists, the responsibilities, the must-have requirements, the nice-to-haves kept genuinely separate, the compensation range where publishable, and how to apply with a stated response timeframe.",
      },
      {
        title: "Why must-have and nice-to-have must be separate",
        body: "Mixing them produces a list where candidates cannot tell what is genuinely required, so they assume everything is and do not apply. Keeping them separate is the single highest-leverage change to a job posting.",
      },
    ],
    jurisdiction: "India — general hiring practice",
    caveat:
      "The requirements are yours; the tool supplies structure. Review for discriminatory criteria, which are unlawful under the Equal Remuneration Act and the Code on Wages.",
  },
  {
    slug: "kpi-sheet-generator",
    name: "KPI Sheet Generator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "kpi-sheet",
    status: "live",
    description:
      "Structure a KPI sheet from the metrics you choose, enforcing weights that sum to 100 and a measurable target for each, without inventing the targets.",
    keywords:
      "kpi sheet generator india format performance metrics weights targets employee appraisal scorecard review period",
    h1: "KPI Sheet Generator",
    seoTitle: "KPI Sheet Generator — Metrics, Weights, Targets",
    seoDescription:
      "Build a KPI sheet from your own metrics: weights that sum to 100, a measurable target for each and a review period, with the tool flagging what will not work.",
    primaryKeyword: "kpi sheet generator",
    secondaryKeywords: [
      "kpi template with weights",
      "measurable targets per metric",
      "kpi review period setup",
      "weighted scorecard for a role",
      "objective and target table",
    ],
    researchId: "hr-kpi-sheet",
    alternativeTitles: [
      "KPI Scorecard Builder",
      "Performance Metrics Sheet Generator",
    ],
    alternativeDescription:
      "Turn your metrics into a weighted KPI sheet, with each target and weight checked and the measurement source left for you to define.",
    internalLinks: [
      "/tools/job-description-generator",
      "/tools/interview-plan-generator",
      "/tools/statutory-leave-calculator",
    ],
    steps: [
      "Enter the role and the review period.",
      "Add each metric with its target and its weight; the tool checks that the weights sum to 100.",
      "Keep to six metrics or fewer, which is what can be tracked honestly.",
      "Copy or download the sheet, and fill in the measurement source for each metric.",
    ],
    faqs: [
      {
        q: "Why does the tool not suggest targets?",
        a: "Because a target without local data is a guess, and a guessed target becomes an unfair review. What a reasonable deployment frequency or support resolution time is depends on your stack, your team size and your history. The tool enforces that every metric has a target; it refuses to make one up.",
      },
      {
        q: "Why six metrics or fewer?",
        a: "Because attention is finite and a scorecard with fifteen metrics is not a priority statement, it is a list. Six weighted metrics force the manager to decide what matters, which is the actual value of choosing KPIs.",
      },
      {
        q: "What if the weights do not sum to 100?",
        a: "The sheet is mathematically inconsistent and the overall score means nothing. The tool flags it explicitly rather than silently normalising, because a silent normalisation hides the error from the person being reviewed.",
      },
      {
        q: "Should the measurement source be defined up front?",
        a: "Yes, and the template leaves a placeholder for it. A metric whose data source is decided after the period ends is a metric that will be measured in whichever way suits the outcome.",
      },
    ],
    reference: [
      {
        title: "What makes a KPI workable",
        body: "A name that states the behaviour, a target with a number and a comparison, a weight that reflects its importance, and a defined data source and formula. Every one of these is a field in the template, and each missing one is a question the review will not be able to answer.",
      },
    ],
    jurisdiction: "India — general performance-management practice",
    caveat:
      "Targets are yours to set from your own data. The tool checks weights and presence of targets, not whether the targets are achievable.",
  },
  {
    slug: "interview-plan-generator",
    name: "Interview Plan Generator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "interview-plan",
    status: "live",
    description:
      "Build a structured interview from competencies, with a fixed question bank and a prompt for what a strong answer shows in your specific context.",
    keywords:
      "interview plan generator india structured interview questions competencies scorecard hiring panel question bank",
    h1: "Interview Plan Generator",
    seoTitle: "Interview Plan Generator — Structured Questions",
    seoDescription:
      "Compose a structured interview from competencies, with questions drawn from a fixed bank and a prompt for what a strong answer shows in your role.",
    primaryKeyword: "interview plan generator",
    secondaryKeywords: [
      "structured interview question set",
      "competency based interview guide",
      "interview scorecard for hiring",
      "technical interview question bank",
      "panel interview plan",
    ],
    researchId: "hr-interview-plan",
    alternativeTitles: [
      "Structured Interview Builder",
      "Competency Interview Generator",
    ],
    alternativeDescription:
      "Choose the competencies and get a question set with a definition prompt for each, so the panel agrees on what a good answer looks like before the interview.",
    internalLinks: [
      "/tools/job-description-generator",
      "/tools/kpi-sheet-generator",
      "/tools/star-answer-builder",
    ],
    steps: [
      "Enter the role and choose up to four competencies.",
      "Set how many questions per competency — one or two is usually enough for a 45-minute interview.",
      "Read what each question is testing and fill in the prompt for your own context.",
      "Copy the plan or download the CSV for the interview panel.",
    ],
    faqs: [
      {
        q: "Why is there a prompt for what a strong answer shows?",
        a: "Because an interview question without a defined success criterion measures the interviewer's mood. Deciding before the interview what evidence would count as a good answer is what makes a structured interview more predictive than an unstructured conversation.",
      },
      {
        q: "Why only four competencies?",
        a: "Because scoring more than four in a single interview is inconsistent — the panel cannot hold that many dimensions in mind while listening. If a role needs more, split the assessment across interviews rather than cramming them into one.",
      },
      {
        q: "Are these questions original?",
        a: "They are drawn from a fixed bank written for this tool rather than generated. That means they are the same for every user, which is a feature: a structured interview is supposed to be consistent, and generating a different question each time defeats the purpose.",
      },
      {
        q: "Should every candidate get the same questions?",
        a: "Yes, for a given role and stage. Consistency is what makes scores comparable, and it is also the strongest defence against allegations of bias in hiring. The tool makes that easy by producing a fixed plan you can reuse.",
      },
    ],
    reference: [
      {
        title: "Why structure improves interviews",
        body: "Structured interviews, where every candidate for a role gets the same questions scored against defined criteria, are consistently found to be more predictive than unstructured conversations. The gain comes from consistency and from defining evidence in advance, not from better questions.",
      },
      {
        title: "The competencies covered",
        body: "Problem solving, collaboration, ownership, communication, learning agility and leadership. Each has three questions, and each question tests a specific behaviour rather than an opinion about the candidate.",
      },
    ],
    jurisdiction: "India — general hiring practice",
    caveat:
      "Define the success criteria before the interview. Asking about protected characteristics or family plans is unlawful and unnecessary; the bank contains none.",
  },
  {
    slug: "probation-period-calculator",
    name: "Probation Period Calculator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "probation",
    status: "live",
    description:
      "Probation end date from a joining date, extended where a policy allows, with the confirmation-in-writing caution stated.",
    keywords:
      "probation period calculator india joining date confirmation end date extension appointment letter employment",
    h1: "Probation Period Calculator",
    seoTitle: "Probation Period Calculator — Confirmation Date",
    seoDescription:
      "Calculate when probation ends from a joining date, model an extension, and see why confirming or extending in writing before the date matters.",
    primaryKeyword: "probation period calculator",
    secondaryKeywords: [
      "probation end date calculator",
      "probation confirmation date",
      "probation extension calculation",
      "probation period in offer letter",
      "confirmation due date from joining",
    ],
    researchId: "hr-probation",
    alternativeTitles: [
      "Probation End Date Calculator",
      "Confirmation Date Calculator",
    ],
    alternativeDescription:
      "Enter a joining date and probation length to get the end date, an extended date where applicable, and the practice around written confirmation.",
    internalLinks: [
      "/tools/offer-letter-generator",
      "/tools/working-days-calculator",
      "/tools/notice-period-calculator",
    ],
    steps: [
      "Enter the joining date and the probation period in months.",
      "Add an extension in months if the policy allows one.",
      "Read the probation end date and the extended date.",
      "Confirm or extend in writing before the end date — the note explains why.",
    ],
    faqs: [
      {
        q: "Is the probation period fixed by law?",
        a: "Not generally. Probation length is a contract term, though some state Shops and Establishments Acts limit it — often to three or six months — and certain categories of worker have specific rules. The tool treats it as a contract term and says so.",
      },
      {
        q: "What happens if probation is not confirmed in writing?",
        a: "In some jurisdictions, silence can be read as confirmation, and in practice a probationer who continues working past the end date is often treated as confirmed. That is why the tool notes that written confirmation or extension before the date matters — an unintended deemed confirmation is hard to reverse.",
      },
      {
        q: "Can probation be extended more than once?",
        a: "The contract usually states whether and how often. Repeated extensions with no change in performance are difficult to defend if the employment later ends, because they suggest the process was not genuine.",
      },
      {
        q: "Are notice periods different during probation?",
        a: "Usually shorter — commonly 15 days to one month against a longer period after confirmation. Check the appointment letter rather than assuming, and use the notice calculator with the probation rate.",
      },
    ],
    reference: [
      {
        title: "The date arithmetic",
        body: "The probation end date is the joining date plus the probation months, minus one day. An extension adds months to that end date. Anniversaries that fall on the 29th, 30th or 31st are handled by the underlying date arithmetic.",
      },
      {
        title: "What the law actually says",
        body: "There is no national statutory probation period for most private-sector employees. State Shops and Establishments Acts may cap it, and the Industrial Employment (Standing Orders) Act governs it in covered establishments. Company policy is the usual source.",
      },
    ],
    jurisdiction: "India — contract terms, with state Act limits",
    caveat:
      "Date arithmetic on the terms you enter. Whether probation can be extended, and the effect of not confirming in writing, depends on your contract and your state.",
  },
  {
    slug: "statutory-leave-calculator",
    name: "Statutory Leave Calculator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "statutory-leave",
    status: "live",
    description:
      "Leave entitlement on the Factories Act basis — one day for every 20 days worked — with the divisor adjustable for state variations.",
    keywords:
      "statutory leave calculator india factories act annual leave earned leave 20 days entitlement shops establishments act",
    h1: "Statutory Leave Calculator",
    seoTitle: "Statutory Leave Calculator — Factories Act Basis",
    seoDescription:
      "Work out statutory annual leave on the Factories Act basis: a day per 20 days worked, with the divisor adjustable for your state's shops and establishments act.",
    primaryKeyword: "statutory leave calculator",
    secondaryKeywords: [
      "annual leave on factories act basis",
      "one day per 20 days worked",
      "shops and establishments leave",
      "earned leave entitlement calculation",
      "statutory annual leave india",
    ],
    researchId: "hr-statutory-leave",
    alternativeTitles: [
      "Annual Leave Entitlement Calculator",
      "Factories Act Leave Calculator",
    ],
    alternativeDescription:
      "Enter the days worked in the year to see statutory leave entitlement, with the divisor exposed so a different state formula can be applied.",
    internalLinks: [
      "/tools/leave-encashment-calculator",
      "/tools/attendance-calculator",
      "/tools/working-days-calculator",
    ],
    steps: [
      "Enter the days worked in the leave year.",
      "Keep the divisor at 20 for the Factories Act basis, or change it to your state Act's figure.",
      "Read the entitlement. Treat it as a floor, not a target — company policy is often more generous.",
    ],
    faqs: [
      {
        q: "Why is the divisor an input rather than fixed?",
        a: "Because the Factories Act uses 20, but state Shops and Establishments Acts use their own formulas and several set different constants or caps. Hard-coding 20 would produce a confidently wrong answer for a large share of employers.",
      },
      {
        q: "Is this the same as earned leave?",
        a: "Earned leave and annual leave are different names for a similar entitlement in different Acts. The Factories Act calls it annual leave with wages; state Acts use earned leave. The arithmetic here follows the Factories Act formula, which is the most commonly cited one.",
      },
      {
        q: "Does the entitlement carry forward?",
        a: "The Factories Act allows accumulation up to 30 days for an adult. State Acts differ. Use the leave encashment calculator to model a carry-forward cap and what lapses.",
      },
    ],
    reference: [
      {
        title: "The Factories Act basis",
        body: "One day of leave with wages for every 20 days worked, and leave must be applied for at least 15 days in advance except in an emergency. Accumulation is permitted up to 30 days for an adult worker. The leave year and the qualifying threshold for a child worker differ.",
      },
      {
        title: "Why company policy usually exceeds it",
        body: "Most employers offer 18 to 24 days of annual leave, above the statutory minimum in the states that follow the 20-day formula. The statutory figure is a floor. Offering it exactly is lawful and is not competitive.",
      },
    ],
    jurisdiction:
      "India — Factories Act 1948 and state Shops and Establishments Acts",
    caveat:
      "The Factories Act formula. Confirm the formula in the Act that covers your establishment before relying on the figure.",
  },
  {
    slug: "working-days-calculator",
    name: "Working Days Calculator",
    categoryName: "HR & Payroll",
    subgroup: "people-ops",
    workspace: "people-text-kit",
    mode: "business-days",
    status: "live",
    description:
      "Add or subtract working days from a date, skipping weekends and any declared holidays, for notice periods, deadlines and joining dates.",
    keywords:
      "working days calculator india business days add subtract holidays weekends deadline notice period date",
    h1: "Working Days Calculator",
    seoTitle: "Working Days Calculator — Weekends & Holidays",
    seoDescription:
      "Add or subtract business days from a date, skipping weekends and any holidays you list. Every skipped date is shown, so the result is auditable.",
    primaryKeyword: "working days calculator",
    secondaryKeywords: [
      "business days between two dates",
      "weekdays only between two dates",
      "bank holidays in a period",
      "add business days to a date",
      "working days in a month",
    ],
    researchId: "hr-working-days",
    alternativeTitles: [
      "Business Days Date Calculator",
      "Working Day Add/Subtract Tool",
    ],
    alternativeDescription:
      "Move a date forward or back by a number of working days, with weekends and your own declared holidays skipped and every skipped date listed.",
    internalLinks: [
      "/tools/notice-period-calculator",
      "/tools/probation-period-calculator",
      "/tools/attendance-calculator",
    ],
    steps: [
      "Enter the start date.",
      "Enter how many working days to add, or a negative number to count backwards.",
      "List any public holidays in the period, one date per line, so they are skipped too.",
      "Read the resulting date and check the list of skipped dates.",
    ],
    faqs: [
      {
        q: "Does it use a fixed public holiday calendar?",
        a: "No, because public holidays differ by state, by establishment and by year, and a built-in calendar would be wrong for most users. You list the dates that apply to you, and the tool shows exactly which dates it skipped so the result can be checked.",
      },
      {
        q: "What counts as a working day?",
        a: "Monday to Friday, excluding the holidays you list. If your establishment works Saturdays, add those dates as negative holidays — it is a workaround, but it produces the right count and the skipped list makes it visible.",
      },
      {
        q: "Does it handle negative numbers?",
        a: 'Yes. A negative value counts backwards, which is what you need for "five working days before the deadline" questions. Weekends and holidays are skipped in both directions.',
      },
    ],
    reference: [
      {
        title: "How the count works",
        body: "The tool steps one day at a time from the start date, skipping any Saturday, Sunday or listed holiday, until the requested number of working days has elapsed. The result is the date on which that count completes, and every skipped date is returned so the arithmetic is verifiable.",
      },
    ],
    caveat:
      "Weekends are Monday to Friday only. Adjust with holiday entries if your establishment works a different pattern.",
  },
  // ──────────────────────────────────────────────── SEO · On-page
  {
    slug: "serp-preview",
    name: "SERP Preview",
    categoryName: "SEO & Website Growth",
    subgroup: "on-page",
    workspace: "page-analyzer",
    mode: "serp-preview",
    status: "live",
    description:
      "Preview how a title and description will look in search results, with both character count and estimated pixel width against Google's truncation.",
    keywords:
      "serp preview google snippet title length checker pixel width meta description truncation 580px 920px search result",
    h1: "SERP Preview",
    seoTitle: "SERP Preview — Title Pixel Width & Truncation",
    seoDescription:
      "Preview the search snippet and see where Google truncates: character count and estimated pixel width against the 580px title and 920px description budgets.",
    primaryKeyword: "serp preview",
    secondaryKeywords: [
      "title tag pixel width checker",
      "meta description truncation preview",
      "google snippet preview",
      "pixel width versus character count",
      "serp title length estimate",
    ],
    researchId: "seo-serp-preview",
    alternativeTitles: [
      "Search Result Preview — Pixels and Characters",
      "Google Snippet Preview and Truncation Check",
    ],
    alternativeDescription:
      "Enter a title and description to see the rendered snippet, the character count and the estimated pixel width, with the truncation point marked.",
    internalLinks: [
      "/tools/meta-description-generator",
      "/tools/title-generator",
      "/tools/on-page-audit",
    ],
    steps: [
      "Enter the page title and the meta description.",
      "Add the brand suffix if it is appended to titles, so the preview shows what Google will render.",
      "Entire rows of the preview that exceed the pixel budget are marked, because width is what Google truncates on.",
      "Adjust the wording and watch both the character count and the pixel estimate move.",
    ],
    faqs: [
      {
        q: "Why does the tool measure pixels instead of characters?",
        a: "Because Google truncates on rendered pixel width, not character count. A title of 60 narrow letters like i and l fits comfortably, while 55 wide letters like m and w does not. Character counts are a rough proxy that fails exactly at the margin where you are deciding whether to cut.",
      },
      {
        q: "Are the pixel estimates exact?",
        a: "No. The tool sums per-glyph average widths for the font Google uses, which tracks the real cut-off closely but is not a measurement in Google's actual rendering. Treat the boundary as soft and leave a margin rather than shaving the last few pixels.",
      },
      {
        q: "Does the preview show what mobile results look like?",
        a: "No. Mobile results truncate earlier and the layout differs. The limits used here are the desktop ones, which is the more forgiving case — a title that fits here may still truncate on a phone.",
      },
      {
        q: "Will the title I write definitely be the one shown?",
        a: "Not always. Google rewrites titles it considers unhelpful, sometimes pulling from the H1 or the page content. A clear, specific title that matches the page is less likely to be rewritten, which is the best control available.",
      },
    ],
    reference: [
      {
        title: "The display limits",
        body: "Google renders titles at about 600 pixels and truncates descriptions at about 960 pixels, with some variation by device and query. In practical terms that is roughly 55 to 60 characters for a title and 155 to 160 for a description in average Latin text, but the pixel width is the real constraint.",
      },
      {
        title: "How the estimate works",
        body: "Each glyph is assigned a width class — narrow for i, l and punctuation, wide for m and w, average otherwise — and the widths are summed at the rendered size. The estimate is labelled as an estimate everywhere it appears, because presenting it as exact would be a false precision.",
      },
    ],
  },
  {
    slug: "keyword-density-checker",
    name: "Keyword Density Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "on-page",
    workspace: "page-analyzer",
    mode: "keyword-analysis",
    status: "live",
    description:
      "Keyword occurrences, density and placement across title, description, headings, first paragraph and URL — plus repeated phrases that signal accidental stuffing.",
    keywords:
      "keyword density checker seo on page keyword frequency placement title heading first paragraph repeated phrases stuffing analysis",
    h1: "Keyword Density Checker",
    seoTitle: "Keyword Density Checker — Count, Ratio, Placement",
    seoDescription:
      "Count keyword occurrences and density in your own page text, check placement in the title, headings and opening paragraph, and find repeated phrases to cut.",
    primaryKeyword: "keyword density checker",
    secondaryKeywords: [
      "keyword placement in title and headings",
      "keyword occurrences in page text",
      "first paragraph keyword check",
      "repeated phrase finder",
      "keyword use without stuffing",
    ],
    researchId: "seo-keyword-density",
    alternativeTitles: [
      "Keyword Frequency and Placement Checker",
      "On-Page Keyword Analyzer",
    ],
    alternativeDescription:
      "Paste page text and a target keyword to see how often it appears, where it appears, and which phrases you have repeated by accident.",
    internalLinks: [
      "/tools/serp-preview",
      "/tools/readability-checker",
      "/tools/on-page-audit",
    ],
    steps: [
      "Enter the target keyword or phrase.",
      "Optionally add the title, description, headings and URL so placement can be checked.",
      "Paste the page body text — the visible text, not the HTML.",
      "Read the count, the density and the placement chips, then check the repeated two-word phrases for accidental repetition.",
    ],
    faqs: [
      {
        q: "What is the ideal keyword density?",
        a: "There is no defensible universal figure, and any site quoting one is repeating folklore. Google has not published a target, and the concept is largely obsolete because modern ranking uses semantic understanding rather than counting. The number is shown so you can compare your own pages and spot accidental repetition, not as a target.",
      },
      {
        q: "Does the tool fetch my page?",
        a: "No. A browser cannot read another site's HTML without CORS permission, and pretending to scan a page would be a false claim. You paste the text, and the analysis is of exactly that text.",
      },
      {
        q: "Why does it show repeated phrases as well?",
        a: "Because repeated two- and three-word sequences are the mechanical signature of accidental stuffing and of boilerplate that has crept into the body. They are objectively countable, unlike density, so they are the more useful signal of the two.",
      },
      {
        q: "Should I put the keyword in the first 100 words?",
        a: "It usually happens naturally when the page answers the question the keyword represents. Forcing it into the first sentence is how pages end up starting with an awkward definition. The placement chip tells you where you stand; it is not an instruction.",
      },
    ],
    reference: [
      {
        title: "What the numbers mean",
        body: "Occurrences counts exact phrase matches as a substring of the normalised word stream, so multi-word keywords work. Density is occurrences divided by total words, as a percentage. Placement checks whether the phrase appears in the title, description, headings, first 100 words and URL.",
      },
      {
        title: "Repeated phrases",
        body: "Two- and three-word sequences are counted, excluding sequences made entirely of stop words because those are grammar rather than keywords. A phrase appearing far more often than its share of the text suggests either emphasis or accident — the tool shows the per-1000-words rate so you can judge.",
      },
    ],
  },
  {
    slug: "readability-checker",
    name: "Readability Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "on-page",
    workspace: "page-analyzer",
    mode: "readability",
    status: "live",
    description:
      "Flesch Reading Ease and Flesch–Kincaid grade with sentence and syllable detail, and an explicit warning when the text is not in English.",
    keywords:
      "readability checker flesch reading ease kincaid grade level sentence length syllables english content score",
    h1: "Readability Checker",
    seoTitle: "Readability Checker — Flesch Reading Ease",
    seoDescription:
      "Score text with Flesch Reading Ease and the Flesch–Kincaid grade, see sentence and syllable detail, and get a warning when the scores do not fit the language.",
    primaryKeyword: "readability checker",
    secondaryKeywords: [
      "flesch reading ease score",
      "flesch kincaid grade level",
      "sentence length analysis",
      "hard to read paragraph finder",
      "readability for web copy",
    ],
    researchId: "seo-readability",
    alternativeTitles: [
      "Flesch Reading Ease Calculator",
      "Text Readability Scorer",
    ],
    alternativeDescription:
      "Paste your copy to get a Flesch Reading Ease score, a US grade level, and the sentence and syllable averages those scores are built from.",
    internalLinks: [
      "/tools/keyword-density-checker",
      "/tools/on-page-audit",
      "/tools/word-counter",
    ],
    steps: [
      "Paste the copy you want to check.",
      "Read the reading ease, the grade level and the label.",
      "Check the average sentence length — long sentences are the usual cause of a low score.",
      "Rewrite the worst paragraphs and paste again; the score is meant to find them, not to be maximised.",
    ],
    faqs: [
      {
        q: "What is a good readability score?",
        a: "For general web copy, 60 to 70 on Flesch Reading Ease is plain English and is a reasonable target. Below 50 is difficult and above 80 is very simple. Neither extreme is automatically wrong — a technical reference for specialists should score low, and a form should score high.",
      },
      {
        q: "Does readability affect rankings?",
        a: "Not directly as a scoring factor. It matters because it affects whether people read and engage, which indirectly affects outcomes, and because clear writing reaches more people. Treat it as a writing quality measure rather than an SEO lever.",
      },
      {
        q: "Why does the tool warn about non-English text?",
        a: "Because both formulas count syllables using English phonetics and sentence boundaries using Latin punctuation. Applied to Hindi, Gujarati or Tamil, the numbers are meaningless, and a tool that returns them without a warning is misleading. The warning appears when non-Latin characters dominate.",
      },
      {
        q: "How are syllables counted?",
        a: "By grouping vowel clusters and handling common English suffixes, which is the standard approximation. It is accurate for most words and wrong for some, which is why the score is presented as an indicator rather than a precise measure.",
      },
    ],
    reference: [
      {
        title: "Flesch Reading Ease",
        body: "206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words). Higher is easier. 60–70 is plain English, 30–50 is difficult, and below 30 is graduate level.",
      },
      {
        title: "Flesch–Kincaid grade",
        body: "0.39 × (words ÷ sentences) + 11.8 × (syllables ÷ words) − 15.59. It estimates the US school year needed to understand the text. Both formulas penalise long sentences and long words, and neither understands meaning.",
      },
    ],
    caveat:
      "Both formulas are calibrated for English. Scores for other languages are not meaningful, and the tool says so rather than returning a confident number.",
  },
  {
    slug: "on-page-audit",
    name: "On-Page Audit",
    categoryName: "SEO & Website Growth",
    subgroup: "on-page",
    workspace: "page-analyzer",
    mode: "structure-audit",
    status: "live",
    description:
      "Audit pasted HTML for multiple H1s, skipped heading levels, missing alt attributes, empty anchors and thin visible text.",
    keywords:
      "on page audit heading structure h1 alt text accessibility seo html checker document outline screen reader",
    h1: "On-Page Audit",
    seoTitle: "On Page Audit — Headings, Alt Text, Structure",
    seoDescription:
      "Audit pasted page HTML for multiple H1s, skipped heading levels, images without alt attributes, links without anchor text and thin visible content.",
    primaryKeyword: "on page audit",
    secondaryKeywords: [
      "heading structure checker",
      "h1 and h2 order analysis",
      "alt attribute audit",
      "pasted html page analysis",
      "landmark elements check",
    ],
    researchId: "seo-on-page-audit",
    alternativeTitles: [
      "Heading Structure and Alt Text Auditor",
      "HTML Structure Checker",
    ],
    alternativeDescription:
      "Paste page HTML to check the heading outline, alt attributes and anchor text, with each finding tied to the element responsible.",
    internalLinks: [
      "/tools/serp-preview",
      "/tools/keyword-density-checker",
      "/tools/json-ld-validator",
    ],
    steps: [
      "Paste the page source of a page you control.",
      "Read the heading outline and check there is exactly one H1.",
      "Fix any skipped heading levels, missing alt attributes or empty anchors.",
      "Re-paste after fixing to confirm the outline is clean.",
    ],
    faqs: [
      {
        q: "Why does multiple H1 count as an error rather than a warning?",
        a: "Because it makes the document outline ambiguous for screen readers and for any consumer that uses headings for navigation. HTML5 technically permits multiple H1s in sectioning elements, but in practice almost every multiple-H1 page is a template mistake, and the accessibility cost is real.",
      },
      {
        q: "Does heading structure affect rankings?",
        a: "Indirectly. Headings help consumers understand the page and help assistive technology navigate it, which is a genuine accessibility requirement. Chasing an exact H2 keyword ratio does nothing; getting the outline right is worth doing for its own sake.",
      },
      {
        q: "Why is alt text listed as an error?",
        a: 'A missing alt attribute means a screen reader announces the file name or nothing at all, which fails accessibility guidance. A decorative image needs alt="" explicitly, not an omitted attribute — the difference is meaningful and the check distinguishes them.',
      },
      {
        q: "Can it audit a live URL?",
        a: "No. Fetching another site's HTML from a browser requires CORS permission the site does not grant, and a server-side fetch would make this a crawler rather than a browser tool. Paste the source — you can get it with View Source or curl.",
      },
    ],
    reference: [
      {
        title: "What is checked",
        body: "Heading count and levels, skipped levels in the outline, images with no alt attribute, anchors with no text, and the visible word count. Each finding names the element it applies to rather than reporting an aggregate score.",
      },
      {
        title: "Why the checks are objective",
        body: "Multiple H1s, skipped levels, missing alt attributes and empty anchors are wrong regardless of SEO opinion — they break the document outline or assistive technology. The tool restricts itself to those and does not invent a score from stylistic preferences.",
      },
    ],
  },
  {
    slug: "duplicate-content-checker",
    name: "Duplicate Content Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "duplication",
    workspace: "page-analyzer",
    mode: "duplicate-check",
    status: "live",
    description:
      "Compare two pages for near-duplicate copy using three-word overlap, the pattern that catches doorway pages before they are published.",
    keywords:
      "duplicate content checker near duplicate detection jaccard similarity doorway pages shingle comparison two pages seo",
    h1: "Duplicate Content Checker",
    seoTitle: "Duplicate Content Checker — Near-Duplicate Pages",
    seoDescription:
      "Compare two pages for near-duplicate copy using three-word overlap, with a clear verdict on whether they can stand as separate pages or should be consolidated.",
    primaryKeyword: "duplicate content checker",
    secondaryKeywords: [
      "compare two pages for similarity",
      "near duplicate copy detection",
      "text similarity percentage",
      "shared sentences between two drafts",
      "duplicate before publishing",
    ],
    researchId: "seo-duplicate-content",
    alternativeTitles: [
      "Near-Duplicate Page Comparison",
      "Content Similarity Checker",
    ],
    alternativeDescription:
      "Paste two versions of a page to see how much of their wording overlaps, with a verdict on whether publishing both is safe.",
    internalLinks: [
      "/tools/keyword-cannibalisation-checker",
      "/tools/on-page-audit",
      "/tools/content-brief-generator",
    ],
    steps: [
      "Paste version A — the page you already have.",
      "Paste version B — the new page, or the same page with the city name swapped.",
      "Read the similarity percentage and the verdict.",
      "If the verdict is near-duplicate, merge the pages or differentiate them genuinely rather than publishing both.",
    ],
    faqs: [
      {
        q: "What counts as too similar?",
        a: "Above 70% three-word overlap the pages are near-duplicates and publishing both is the doorway-page pattern that search guidelines treat as spam. Between 35% and 70% is a judgement call about intent, which the tool cannot see and says so.",
      },
      {
        q: "Is this the same as Google's duplicate detection?",
        a: "No. Google compares much more than wording — boilerplate, structure, navigation and context — and does not publish its method. This checker measures three-word sequence overlap, which is a reproducible and useful proxy for the most common cause: templated pages with one variable changed.",
      },
      {
        q: "Is duplicated content a penalty?",
        a: "Usually not a penalty but a filtering problem: when two pages are near-identical, one is chosen and the other is ignored, so the effort spent on the second is wasted. The penalty case is specifically the doorway pattern, where many near-identical pages exist to capture variants of a query.",
      },
      {
        q: "Should service pages for different cities be separate pages?",
        a: "Only if the content genuinely differs — different staff, different regulations, different local evidence. If the only change is the city name, one page with a clear service area serves users better and avoids the doorway pattern.",
      },
    ],
    reference: [
      {
        title: "How the score is computed",
        body: "Each text is reduced to its three-word sequences, and the Jaccard index is the number of shared sequences divided by the total in either text. Below 35% is distinct, above 70% is near-duplicate, and between is overlapping.",
      },
    ],
  },
  {
    slug: "keyword-cannibalisation-checker",
    name: "Keyword Cannibalisation Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "duplication",
    workspace: "page-analyzer",
    mode: "cannibalisation",
    status: "live",
    description:
      "Find pages on your own site that target the same keyword, ranked by severity with the near-duplicate titles that make it worst.",
    keywords:
      "keyword cannibalisation checker seo same keyword two pages internal competition consolidation duplicate targeting",
    h1: "Keyword Cannibalisation Checker",
    seoTitle: "Keyword Cannibalisation Checker — Same Query",
    seoDescription:
      "Identify pages on your own site targeting the same keyword, with severity based on how similar their titles are, so you can consolidate before both pages lose.",
    primaryKeyword: "keyword cannibalisation checker",
    secondaryKeywords: [
      "two pages targeting one keyword",
      "url list overlap analysis",
      "cannibalisation across own pages",
      "internal competition between pages",
      "consolidate competing urls",
    ],
    researchId: "seo-cannibalisation",
    alternativeTitles: [
      "Keyword Cannibalization Detector",
      "Internal Keyword Conflict Checker",
    ],
    alternativeDescription:
      "Paste your page list with their target keywords to find the queries where two of your own pages compete and neither clearly wins.",
    internalLinks: [
      "/tools/duplicate-content-checker",
      "/tools/internal-link-suggestions",
      "/tools/topic-cluster-builder",
    ],
    steps: [
      "List each page as url | target keyword | title.",
      "Press the check button.",
      "Read the conflicts, highest severity first.",
      "For each one, decide whether to consolidate the pages or differentiate their intent.",
    ],
    faqs: [
      {
        q: "How do I know which page should win?",
        a: "Usually the one that answers the query best and has the most internal links. The tool identifies the conflict; the decision needs your knowledge of intent and the pages' actual performance, which the tool cannot see because it has no access to your Search Console data.",
      },
      {
        q: "Does the tool know my rankings?",
        a: "No. It compares the list you paste. Impressions, positions and clicks live in Search Console, which you can export and read alongside this — but the tool will not invent them.",
      },
      {
        q: "Is cannibalisation always bad?",
        a: "Not always. Two pages can target the same phrase with genuinely different intent, such as a guide and a tool. It becomes a problem when neither page clearly satisfies the query, so search engines alternate between them and neither accumulates the signals to rank.",
      },
      {
        q: "How is severity decided?",
        a: "Two pages targeting the same keyword is a medium-severity conflict. If their titles are also near-duplicate, it is high, because there is little to distinguish them beyond the wording and it is very likely one is simply being ignored.",
      },
    ],
    reference: [
      {
        title: "How conflicts are detected",
        body: "Target keywords are normalised to their word sequence and grouped. Any group with more than one page is a conflict. Title similarity is then computed on three-word overlap; a score of 0.4 or more raises the conflict to high severity.",
      },
    ],
  },
  // ──────────────────────────────────────────────── SEO · Structured data
  {
    slug: "organization-schema-generator",
    name: "Organization Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "organization-schema",
    status: "live",
    description:
      "Generate valid Organization JSON-LD with the required properties checked and every field optional until you supply it.",
    keywords:
      "organization schema generator json-ld structured data schema.org company markup knowledge panel logo sameas",
    h1: "Organization Schema Generator",
    seoTitle: "Organization Schema Generator — Valid JSON-LD",
    seoDescription:
      "Build Organization JSON-LD with name, URL, logo, contact and social profiles, validated for the required properties before you paste it into your page.",
    primaryKeyword: "organization schema generator",
    secondaryKeywords: [
      "organization json ld markup",
      "logo and social profiles markup",
      "company structured data",
      "sameas entity links",
      "organization schema for a small business",
    ],
    researchId: "seo-organization-schema",
    alternativeTitles: [
      "Organization JSON-LD Builder",
      "Company Structured Data Generator",
    ],
    alternativeDescription:
      "Produce schema.org Organization markup with the required fields validated, so the block pastes into a page without a missing-property error.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/local-business-schema-generator",
      "/tools/breadcrumb-schema-generator",
      "/tools/product-schema-generator",
    ],
    steps: [
      "Enter the organization name and the website URL — both are required and are checked.",
      "Add the logo, contact details and social profiles. Only the fields you fill appear in the output.",
      "Read any errors; the markup must have zero before publishing.",
      "Copy the block into a script tag and validate it with Google's tools.",
    ],
    faqs: [
      {
        q: "Will Organization markup produce a rich result?",
        a: "No. Organization markup is used for entity understanding and can contribute to a knowledge panel, but it never produces a visual rich snippet in search results. It is worth doing because entity signals help, not because you will see a change in appearance.",
      },
      {
        q: "Do all the fields need to be filled?",
        a: "No. Only name and URL are required, and the tool omits empty optional fields rather than emitting them as empty strings, which is what makes JSON-LD invalid. The validation runs on your actual values, not a template.",
      },
      {
        q: "What should go in sameAs?",
        a: "Full URLs to profiles that represent the same organization — LinkedIn, X, Facebook, a Wikipedia page. They must be absolute URLs to real pages; a relative path or a made-up profile is ignored or worse.",
      },
      {
        q: "Should I use this or LocalBusiness?",
        a: "Both, in separate blocks, if you have a physical location. Organization describes the entity; LocalBusiness adds location and opening hours. This tool emits Organization alone.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "name and url. Everything else — logo, description, email, telephone, sameAs and address — is recommended rather than required. The validator here reports a missing required property as an error and a missing recommended one as no finding at all, because emitting noise about optional fields is not useful.",
      },
    ],
  },
  {
    slug: "article-schema-generator",
    name: "Article Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "article-schema",
    status: "live",
    description:
      "Article JSON-LD with headline, author, publisher and ISO dates, validated for the properties that actually make a block invalid.",
    keywords:
      "article schema generator json-ld blog post structured data headline author publisher datepublished datemodified",
    h1: "Article Schema Generator",
    seoTitle: "Article Schema Generator — Blog Post JSON-LD",
    seoDescription:
      "Generate Article JSON-LD with a headline, author, publisher and ISO 8601 dates, validated for length and required properties before you publish.",
    primaryKeyword: "article schema generator",
    secondaryKeywords: [
      "article json ld markup",
      "author and published date markup",
      "blogposting structured data",
      "headline and image fields",
      "article schema for a blog",
    ],
    researchId: "seo-article-schema",
    alternativeTitles: [
      "Article JSON-LD Builder",
      "Blog Post Schema Generator",
    ],
    alternativeDescription:
      "Produce Article markup with the headline, author and dates required, and a warning when the date format or headline length will fail validation.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/organization-schema-generator",
      "/tools/breadcrumb-schema-generator",
    ],
    steps: [
      "Enter the headline and the page URL.",
      "Add the author and publisher names — a missing author is an error for Article.",
      "Enter the published and modified dates in ISO 8601 form.",
      "Copy the block and validate it before publishing.",
    ],
    faqs: [
      {
        q: "Should dateModified change on every page load?",
        a: "No. A modified date that changes on every request is ignored as unreliable, and it is a common bug in content management systems. Set it when the content actually changes, and leave it alone otherwise.",
      },
      {
        q: "Does Article markup create a rich result?",
        a: "It can, in the form of a headline with an image and a date, but eligibility depends on the content type, the site and Google's discretion. The markup is the necessary condition, not a guarantee.",
      },
      {
        q: "What is the headline length limit?",
        a: "schema.org guidance is about 110 characters. The tool warns above that rather than truncating, because truncating a headline in schema markup creates a mismatch with what is displayed on the page.",
      },
      {
        q: "Is Article or NewsArticle the right type?",
        a: "Article is the general type and is safe for blog posts and guides. NewsArticle is for news organisations and carries stricter requirements. When in doubt, Article.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "headline, image, datePublished and author are required by Google's guidance for Article rich results, with publisher recommended. The builder reports a missing headline, author or a non-ISO date as an error because each of those independently invalidates the block for rich results.",
      },
    ],
  },
  {
    slug: "faq-schema-generator",
    name: "FAQ Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "faq-schema",
    status: "live",
    description:
      "FAQPage JSON-LD from question-and-answer pairs, with a reminder that the questions must actually be visible on the page.",
    keywords:
      "faq schema generator json-ld faqpage structured data questions answers rich results markup",
    h1: "FAQ Schema Generator",
    seoTitle: "FAQ Schema Generator — FAQPage JSON-LD",
    seoDescription:
      "Build FAQPage JSON-LD from your question and answer pairs, with warnings for answers too short to be useful and a structural check run on every entry.",
    primaryKeyword: "faq schema generator",
    secondaryKeywords: [
      "faqpage json ld markup",
      "question and answer structured data",
      "faq schema answer length",
      "faq markup for a help page",
      "accordion faq structured data",
    ],
    researchId: "seo-faq-schema",
    alternativeTitles: [
      "FAQPage JSON-LD Builder",
      "Question and Answer Schema Generator",
    ],
    alternativeDescription:
      "Turn your FAQ into valid FAQPage markup, with each answer checked for length and every empty entry omitted before you publish it.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/article-schema-generator",
      "/tools/organization-schema-generator",
    ],
    steps: [
      "Add each question and its answer.",
      "Remove any row you are not actually showing on the page.",
      "Check the warnings — a very short answer is unlikely to be useful even if it is valid.",
      "Copy the block into the page and validate it.",
    ],
    faqs: [
      {
        q: "Can I mark up questions that are not visible on the page?",
        a: "No. FAQ markup must match content a reader can see. Marking up hidden questions violates search guidelines and can result in a manual action against structured data, which is a slow and irritating penalty to recover from.",
      },
      {
        q: "Do FAQ rich results still appear?",
        a: "Less than they used to. Google restricted FAQ-rich-result display to authoritative government and health sites, so most sites will not see the visual result. The markup remains valid and helps entity understanding, but do not add it expecting a snippet.",
      },
      {
        q: "How long should an answer be?",
        a: "Long enough to answer the question completely — usually two to four sentences. The tool warns below 20 characters, which is a heuristic for obviously incomplete answers rather than a rule.",
      },
      {
        q: "Should the FAQ on the page be accordion or plain text?",
        a: "Either works, because the markup describes the content not the widget. Accordions are fine as long as the text is in the HTML rather than loaded only on click.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "Each Question needs a name and an acceptedAnswer with text. The builder omits rows where either is empty rather than emitting an invalid entry, and reports an error when no valid pair remains.",
      },
    ],
  },
  {
    slug: "product-schema-generator",
    name: "Product Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "product-schema",
    status: "live",
    description:
      "Product JSON-LD with offers, price, currency and availability — and no rating field, because an invented aggregate rating is a policy violation.",
    keywords:
      "product schema generator json-ld offer price currency availability structured data ecommerce rich results rating",
    h1: "Product Schema Generator",
    seoTitle: "Product Schema Generator — Offer JSON-LD",
    seoDescription:
      "Generate Product JSON-LD with a valid Offer: price, ISO currency and availability. Ratings are deliberately excluded unless you have real reviews to count.",
    primaryKeyword: "product schema generator",
    secondaryKeywords: [
      "product json ld with offer",
      "price and currency markup",
      "availability structured data",
      "product markup for a store",
      "offer price valid from",
    ],
    researchId: "seo-product-schema",
    alternativeTitles: [
      "Product JSON-LD Builder",
      "Ecommerce Schema Generator",
    ],
    alternativeDescription:
      "Produce Product markup with a complete Offer, validated for currency format and a positive price before you publish the page.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/organization-schema-generator",
      "/tools/job-posting-schema-generator",
    ],
    steps: [
      "Enter the product name and the page URL.",
      "Add the price and the three-letter currency code.",
      "Set the availability — in stock, out of stock or pre-order.",
      "Copy the block and validate it with Google's Rich Results Test.",
    ],
    faqs: [
      {
        q: "Why is there no rating field?",
        a: "Because an aggregate rating requires a real review count, and the builder does not offer a field that would let you publish a rating you have not collected. Markup for invented reviews is a policy violation that Google treats as spam, and it is also dishonest to buyers.",
      },
      {
        q: "Does the price in the markup need to match the page?",
        a: "Yes. Google requires the offer price in the markup to match the visible price, and mismatches are a common cause of structured-data penalties. Update the markup whenever the price changes — a feed is better than hand-editing for a large catalogue.",
      },
      {
        q: "What currency code should I use?",
        a: "The ISO 4217 three-letter code — INR, USD, EUR, GBP. Writing the symbol or the word rupees makes the block invalid, and the builder rejects anything that is not exactly three letters.",
      },
      {
        q: "Is availability required?",
        a: "It is strongly recommended, and a missing availability is more likely to be rejected than any other single property. The builder defaults to in stock and emits the full schema.org URL.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "name and offers, where the offer has a price and a priceCurrency. image and description are strongly recommended. The builder reports a non-numeric currency, a zero price or an invalid rating as errors.",
      },
    ],
  },
  {
    slug: "local-business-schema-generator",
    name: "Local Business Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "local-business-schema",
    status: "live",
    description:
      "LocalBusiness JSON-LD with a postal address, opening hours and coordinates, requiring the city and country that make local markup valid.",
    keywords:
      "local business schema generator json-ld postal address opening hours geo coordinates storefront seo local",
    h1: "Local Business Schema Generator",
    seoTitle: "Local Business Schema Generator — Address & Hours",
    seoDescription:
      "Generate LocalBusiness JSON-LD with a postal address, opening hours and coordinates, requiring the city and country that a local entity needs to be valid.",
    primaryKeyword: "local business schema generator",
    secondaryKeywords: [
      "localbusiness json ld markup",
      "address and opening hours markup",
      "nap consistency structured data",
      "localbusiness subtype choice",
      "store location markup",
    ],
    researchId: "seo-local-business-schema",
    alternativeTitles: [
      "LocalBusiness JSON-LD Builder",
      "Storefront Schema Generator",
    ],
    alternativeDescription:
      "Produce LocalBusiness markup with a complete address and opening hours, validated for the fields Google requires before you publish.",
    internalLinks: [
      "/tools/organization-schema-generator",
      "/tools/json-ld-validator",
      "/tools/breadcrumb-schema-generator",
    ],
    steps: [
      "Enter the business name, website and a telephone number.",
      "Add the full postal address — city and country are required.",
      "Add coordinates and opening hours if you have them.",
      "Copy the block and validate it; check the address matches your Google Business Profile exactly.",
    ],
    faqs: [
      {
        q: "Does this replace a Google Business Profile?",
        a: "No. LocalBusiness markup is a machine-readable description of an entity; the Business Profile is the record that drives Maps and the local pack. They complement each other, and the address and hours should match exactly.",
      },
      {
        q: "Should the address be the same on every page?",
        a: "Yes, and the same as the Business Profile and any directories. Inconsistent name, address and phone across the web is the most common local SEO problem, and markup that disagrees with the profile makes it worse.",
      },
      {
        q: "What if there is no storefront?",
        a: "A service-area business should still have a LocalBusiness entity if it serves a defined area, but should not publish a street address it does not operate from. Use the city and region and omit the street address.",
      },
      {
        q: "Does it help rankings?",
        a: "It helps entity understanding and can produce a knowledge-panel presence. It does not directly improve local pack ranking, which depends mostly on relevance, distance and prominence.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "name and address, where the address needs addressLocality (city) and addressCountry. The builder reports a missing city or country as an error because local markup without a location cannot be interpreted.",
      },
    ],
  },
  {
    slug: "job-posting-schema-generator",
    name: "Job Posting Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "job-posting-schema",
    status: "live",
    description:
      "JobPosting JSON-LD with the organization, location, salary and full description that Google requires — the most heavily validated rich-result type.",
    keywords:
      "job posting schema generator json-ld jobposting structured data hiring organization salary google jobs rich results",
    h1: "Job Posting Schema Generator",
    seoTitle: "Job Posting Schema Generator — JobPosting JSON-LD",
    seoDescription:
      "Generate JobPosting JSON-LD with the hiring organization, location, salary range and full description Google requires, validated before you publish.",
    primaryKeyword: "job posting schema generator",
    secondaryKeywords: [
      "jobposting json ld markup",
      "hiring organization and salary markup",
      "valid through date for a job",
      "base salary structured data",
      "job listing structured data",
    ],
    researchId: "seo-job-posting-schema",
    alternativeTitles: [
      "JobPosting JSON-LD Builder",
      "Google Jobs Schema Generator",
    ],
    alternativeDescription:
      "Produce JobPosting markup with the fields Google validates most strictly, with each missing requirement reported rather than silently omitted.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/organization-schema-generator",
      "/tools/job-description-generator",
    ],
    steps: [
      "Enter the job title, hiring organization and the location.",
      "Add the posting and expiry dates in ISO 8601 form.",
      "Paste the full description — Google requires the actual text, not a summary.",
      "Add a salary range if you can publish one, then copy and validate the block.",
    ],
    faqs: [
      {
        q: "Why does the description need to be complete?",
        a: "Because Google's guidelines require the full job description in the markup, not a summary or a link. A truncated description is the most common reason a posting is not eligible for the jobs experience, and it is checked here as an error rather than a warning.",
      },
      {
        q: "What happens when validThrough passes?",
        a: "The posting silently disappears from job search results. It does not error, which is why expired postings linger on company career pages without anyone noticing the traffic stopped. Set the date accurately and remove the markup when the role closes.",
      },
      {
        q: "Is a salary required?",
        a: "Not strictly, but it is strongly recommended and improves both eligibility and click-through. Several jurisdictions now require a range in the listing itself, so the markup should match the visible posting.",
      },
      {
        q: "Can I use this for an internship?",
        a: "Yes, with employmentType set to INTERN. Internships are eligible for the jobs experience and are treated like any other posting, provided the location and organization are stated.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "title, description, datePosted, hiringOrganization and jobLocation are required. The builder reports a description under 50 characters, a missing organization name, a missing city and a non-ISO date as errors, because each independently makes the posting ineligible.",
      },
    ],
  },
  {
    slug: "breadcrumb-schema-generator",
    name: "Breadcrumb Schema Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "breadcrumb-schema",
    status: "live",
    description:
      "BreadcrumbList JSON-LD from an ordered path, with absolute URLs enforced and a minimum of two items.",
    keywords:
      "breadcrumb schema generator json-ld breadcrumblist structured data navigation path seo sitelinks",
    h1: "Breadcrumb Schema Generator",
    seoTitle: "Breadcrumb Schema Generator — JSON-LD Trail",
    seoDescription:
      "Build BreadcrumbList JSON-LD from an ordered path, with absolute URLs enforced and a check that the trail has at least two levels to describe.",
    primaryKeyword: "breadcrumb schema generator",
    secondaryKeywords: [
      "breadcrumblist json ld markup",
      "breadcrumb position and item markup",
      "absolute url breadcrumb check",
      "breadcrumb trail structured data",
      "navigation path markup",
    ],
    researchId: "seo-breadcrumb-schema",
    alternativeTitles: [
      "BreadcrumbList JSON-LD Builder",
      "Navigation Schema Generator",
    ],
    alternativeDescription:
      "Turn a breadcrumb trail into valid BreadcrumbList markup, with each level's URL checked for being absolute and ordered correctly.",
    internalLinks: [
      "/tools/json-ld-validator",
      "/tools/organization-schema-generator",
      "/tools/article-schema-generator",
    ],
    steps: [
      "Add each level of the path in order, starting from the root.",
      "Give every level an absolute URL.",
      "Copy the generated block into the page that displays the breadcrumb.",
      "Validate it, and check it matches the visible breadcrumb exactly.",
    ],
    faqs: [
      {
        q: "Does breadcrumb markup change the search result?",
        a: "It can replace the URL line in a result with a breadcrumb trail, which is a small but real improvement in click-through. Eligibility is Google's decision, but the markup is low-risk and cheap.",
      },
      {
        q: "Can the last item have no URL?",
        a: "The current page is conventionally included with its own URL. Google accepts a final item without a URL, but including it is simpler and avoids ambiguity. The builder requires a URL on every level.",
      },
      {
        q: "Should the markup match the visible breadcrumb?",
        a: "Yes. Markup that describes a trail the user cannot see is a guidelines violation. If the page shows a breadcrumb, the markup should describe the same path in the same order.",
      },
      {
        q: "Do I need this if I have BreadcrumbList in my CMS?",
        a: "No. One valid block per page is enough, and duplicate blocks describing the same trail add nothing. Check what your CMS already emits before adding another.",
      },
    ],
    reference: [
      {
        title: "Required properties",
        body: "itemListElement, an ordered list of ListItem entries each with a position and a name, and an item URL for each level. The builder reports fewer than two items or a relative URL as an error.",
      },
    ],
  },
  {
    slug: "json-ld-validator",
    name: "JSON-LD Validator",
    categoryName: "SEO & Website Growth",
    subgroup: "structured-data",
    workspace: "schema-builder",
    mode: "json-ld-validator",
    status: "live",
    description:
      "Check pasted JSON-LD for valid syntax, an @type and a schema.org @context, with the exact parse error when it fails.",
    keywords:
      "json-ld validator structured data checker schema.org json syntax @type @context debug markup error",
    h1: "JSON-LD Validator",
    seoTitle: "JSON-LD Validator — Check Structured Data",
    seoDescription:
      "Validate pasted JSON-LD for syntax, an @type and a schema.org @context, with the exact parse error reported rather than a generic failure message.",
    primaryKeyword: "json-ld validator",
    secondaryKeywords: [
      "structured data parse checker",
      "json ld type and field check",
      "syntax error in json ld",
      "schema markup before publishing",
      "paste and validate json ld",
    ],
    researchId: "seo-json-ld-validator",
    alternativeTitles: ["Structured Data Validator", "Schema Markup Checker"],
    alternativeDescription:
      "Paste a JSON-LD block to find out whether it parses, whether it declares an @type, and what exactly is wrong with it when it does not.",
    internalLinks: [
      "/tools/organization-schema-generator",
      "/tools/article-schema-generator",
      "/tools/faq-schema-generator",
    ],
    steps: [
      "Paste the JSON-LD block you want to check.",
      "Press validate.",
      "Read the parse error if there is one — trailing commas and unquoted keys are the usual cause.",
      "Fix and paste again, then confirm with Google's own validator before shipping.",
    ],
    faqs: [
      {
        q: "Does a valid JSON-LD block guarantee a rich result?",
        a: "No. Syntax validity is necessary but not sufficient. Rich results depend on the content, the type, the site's standing and Google's policy, none of which a syntax check can assess. The tool says so rather than implying a pass means a snippet.",
      },
      {
        q: "What is the most common JSON-LD error?",
        a: "A trailing comma after the last property, usually introduced by hand-editing a generated block. The parser reports the exact position, which is usually enough to spot it.",
      },
      {
        q: "Why does it warn about the @context?",
        a: "Without the schema.org context, consumers cannot interpret the vocabulary, and a different context URL points at a vocabulary you probably did not intend. It is a warning rather than an error because some consumers are forgiving, but the schema.org context is what interoperates.",
      },
      {
        q: "Can it check a block inside a script tag?",
        a: "Paste only the JSON content, not the surrounding script element. The parser expects JSON, not HTML.",
      },
    ],
    reference: [
      {
        title: "What is checked",
        body: "Whether the text parses as JSON, whether it is an object or an array of objects, whether each item has an @type string, and whether the @context is the schema.org URL. Structural validity only — no content-quality or eligibility judgement.",
      },
    ],
  },
  // ──────────────────────────────────────────────── SEO · Technical
  {
    slug: "robots-txt-generator",
    name: "robots.txt Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "robots-txt-generator",
    status: "live",
    description:
      "Build robots.txt and have it validated in the same pass, with the failure modes that cost the most traffic flagged as errors.",
    keywords:
      "robots txt generator validator disallow allow user agent sitemap crawl delay googlebot seo",
    h1: "robots.txt Generator",
    seoTitle: "robots.txt Generator — With Validation",
    seoDescription:
      "Generate robots.txt rules and have the result validated, catching Disallow: / with no Allow, blocked CSS and JavaScript, and non-absolute sitemap URLs.",
    primaryKeyword: "robots.txt generator",
    secondaryKeywords: [
      "robots txt disallow rules",
      "crawl directive syntax checker",
      "user agent and sitemap lines",
      "robots txt before deploy",
      "block a directory from crawlers",
    ],
    researchId: "seo-robots-txt",
    alternativeTitles: [
      "robots.txt Builder and Checker",
      "Crawl Directive Generator",
    ],
    alternativeDescription:
      "Compose robots.txt rules with immediate validation of the mistakes that block a whole site or break rendering, before you deploy.",
    internalLinks: [
      "/tools/robots-txt-validator",
      "/tools/sitemap-generator",
      "/tools/sitemap-validator",
    ],
    steps: [
      "Choose the user agent, or keep it at all crawlers.",
      "List paths to disallow, one per line.",
      "Add the absolute sitemap URL.",
      "Read the validation — a Disallow: / with no Allow, or a blocked CSS file, is reported as an error.",
    ],
    faqs: [
      {
        q: "Does robots.txt remove a page from Google?",
        a: "No. It prevents crawling, not indexing. A blocked URL can still appear in results if it is linked elsewhere, because Google cannot read the page to know you wanted it gone. To remove a page, use a noindex tag and let it be crawled, or a removal request in Search Console.",
      },
      {
        q: "Why is blocking CSS and JavaScript an error here?",
        a: "Because Google renders pages with them. A blocked stylesheet makes the crawl see a broken layout, which affects how the page is assessed. Older guidance recommended blocking them, and that advice is wrong now.",
      },
      {
        q: "Do Allow rules override Disallow?",
        a: "On crawlers that implement the longest-match rule, yes — the more specific pattern wins. An Allow for a path inside a blocked directory is the standard technique, and the validator notes it rather than forbidding it.",
      },
      {
        q: "Should I use Crawl-delay?",
        a: "Googlebot ignores it. Other crawlers honour it. If you need to slow Google down, the crawl-rate setting in Search Console is the supported way. The tool notes this when a Googlebot group is given a delay.",
      },
    ],
    reference: [
      {
        title: "The grammar",
        body: "User-agent lines begin a group; Allow and Disallow lines follow. Only * and $ have special meaning in paths. Sitemap is a global directive and takes an absolute URL. Crawl-delay is respected by some crawlers and ignored by Googlebot.",
      },
      {
        title: "Common failure modes checked",
        body: "Disallow: / with no Allow (blocks everything), blocked CSS or JavaScript (breaks rendering), non-absolute sitemap URLs (ignored), unsupported wildcard characters (treated literally), and a crawl-delay set on Googlebot (ignored).",
      },
    ],
  },
  {
    slug: "robots-txt-validator",
    name: "robots.txt Validator",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "robots-validator",
    status: "live",
    description:
      "Parse a robots.txt file into groups and report the directives that will be ignored, including rules set before any User-agent line.",
    keywords:
      "robots txt validator parser check directives ignored user agent rules seo debug syntax",
    h1: "robots.txt Validator",
    seoTitle: "robots.txt Validator — Parse and Check Rules",
    seoDescription:
      "Parse a robots.txt file into its groups and find the directives that will be ignored: unknown keys, rules before a user-agent line and invalid crawl delays.",
    primaryKeyword: "robots.txt validator",
    secondaryKeywords: [
      "robots txt parse check",
      "ignored lines in robots file",
      "crawl rule debugging",
      "user agent group grouping",
      "robots file before publishing",
    ],
    researchId: "seo-robots-validator",
    alternativeTitles: [
      "robots.txt Parser and Checker",
      "Crawl Rule Debugger for Disallow Lines",
    ],
    alternativeDescription:
      "Paste a robots.txt file to see how it parses, which lines a crawler would ignore and which rule would block a URL you need.",
    internalLinks: [
      "/tools/robots-txt-generator",
      "/tools/sitemap-validator",
      "/tools/canonical-checker",
    ],
    steps: [
      "Paste the robots.txt file.",
      "Read the group count and the sitemap directives found.",
      "Check the issues — a rule before any user-agent line is silently ignored by crawlers.",
      "Fix the file and paste again.",
    ],
    faqs: [
      {
        q: "Why are rules before a user-agent line ignored?",
        a: "Because the format is group-based: a rule belongs to the user-agent group that precedes it. A stray Allow or Disallow at the top of the file is not attached to any group and has no effect, which is a subtle bug because the file looks correct.",
      },
      {
        q: "What does an empty Disallow mean?",
        a: "Allow everything. Disallow with no path is valid but pointless, and the parser notes it as informational rather than an error.",
      },
      {
        q: "Can there be multiple user-agent lines in one group?",
        a: "Yes, consecutive user-agent lines apply the same rules to each. The parser handles that and lists them together.",
      },
      {
        q: "Does the order of rules matter?",
        a: "For crawlers implementing longest-match, no — the most specific pattern wins regardless of order. For older crawlers using first-match, it does. Writing the most specific rules first is the safer habit.",
      },
    ],
    reference: [
      {
        title: "How the parse works",
        body: "Comments are stripped, each line is split on the first colon, and user-agent lines start a new group while consecutive ones extend the current group. Unknown keys are reported as warnings, rules outside a group as errors.",
      },
    ],
  },
  {
    slug: "sitemap-generator",
    name: "Sitemap Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "sitemap-generator",
    status: "live",
    description:
      "Build sitemap.xml from a URL list with lastmod, validating absolute URLs, the 50,000 limit, duplicates and the 50 MB cap.",
    keywords:
      "sitemap generator xml urlset lastmod changefreq priority seo 50000 urls 50mb absolute urls",
    h1: "Sitemap Generator",
    seoTitle: "Sitemap Generator — Valid sitemap.xml",
    seoDescription:
      "Build a sitemap.xml from your URL list with lastmod dates, validated for absolute URLs, the 50,000-URL limit, duplicate entries and the 50 MB file cap.",
    primaryKeyword: "sitemap generator",
    secondaryKeywords: [
      "xml sitemap builder",
      "sitemap with lastmod dates",
      "urlset and url entry syntax",
      "fifty thousand url limit",
      "sitemap before upload",
    ],
    researchId: "seo-sitemap",
    alternativeTitles: [
      "XML Sitemap Builder with Lastmod Dates",
      "Sitemap.xml Generator and Validator",
    ],
    alternativeDescription:
      "Turn a list of URLs into a valid sitemap, with lastmod dates and every structural problem reported before you upload the file.",
    internalLinks: [
      "/tools/sitemap-validator",
      "/tools/robots-txt-generator",
      "/tools/canonical-checker",
    ],
    steps: [
      "Paste your absolute URLs, one per line.",
      "Add a lastmod date if you know when the content changed.",
      "Read the validation — a relative URL or a duplicate is flagged.",
      "Download the XML and upload it, then submit it in Search Console.",
    ],
    faqs: [
      {
        q: "Do changefreq and priority matter?",
        a: "Google ignores both. They are valid XML and other engines still read them, so including them does no harm, but they are not a ranking lever and spending time on priority values is wasted effort. lastmod is the one Google uses.",
      },
      {
        q: "What should lastmod be?",
        a: "The date the content actually changed in a meaningful way. A lastmod that updates on every request is ignored as unreliable, which is a common CMS bug. If you cannot maintain it accurately, omit it rather than faking it.",
      },
      {
        q: "Does a sitemap guarantee indexing?",
        a: "No. It is a discovery hint. A URL in a sitemap can still be excluded, and a URL missing from one can still be indexed if it is linked. The sitemap helps crawlers find pages; it does not decide what gets indexed.",
      },
      {
        q: "What about pages that should not be indexed?",
        a: "Leave them out. A sitemap full of redirects, 404s and noindexed pages wastes crawl budget and sends mixed signals. The sitemap should contain canonical URLs that should be indexed, and nothing else.",
      },
    ],
    reference: [
      {
        title: "The format",
        body: "urlset with the sitemap 0.9 namespace, one url element per page, each with a loc containing an absolute URL. lastmod in ISO 8601, changefreq one of always, hourly, daily, weekly, monthly, yearly or never, and priority between 0.0 and 1.0.",
      },
      {
        title: "The limits",
        body: "50,000 URLs and 50 MB uncompressed per file. Beyond that a sitemap index is required, listing child sitemaps. Every URL in a file should be on the same host; a sitemap covering multiple hosts should be an index.",
      },
    ],
  },
  {
    slug: "sitemap-validator",
    name: "Sitemap Validator",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "sitemap-validator",
    status: "live",
    description:
      "Parse sitemap XML and check the namespace, URL validity, duplicates and the 50,000 limit, distinguishing a urlset from an index.",
    keywords:
      "sitemap validator xml checker urlset sitemapindex namespace absolute urls duplicates seo debug",
    h1: "Sitemap Validator",
    seoTitle: "Sitemap Validator — Check sitemap.xml",
    seoDescription:
      "Validate sitemap XML: the schema namespace, absolute URLs, duplicate entries, the 50,000-URL limit and whether the file is a urlset or a sitemap index.",
    primaryKeyword: "sitemap validator",
    secondaryKeywords: [
      "sitemap schema namespace check",
      "sitemap absolute url requirement",
      "duplicate url entries in a sitemap",
      "urlset versus sitemap index",
      "sitemap before submission",
    ],
    researchId: "seo-sitemap-validator",
    alternativeTitles: [
      "XML Sitemap Checker for 50,000-URL Limits",
      "Sitemap.xml Validation Tool",
    ],
    alternativeDescription:
      "Paste a sitemap to find out whether it is valid, what it contains, and which entries a crawler would silently ignore when indexing it.",
    internalLinks: [
      "/tools/sitemap-generator",
      "/tools/robots-txt-validator",
      "/tools/canonical-checker",
    ],
    steps: [
      "Paste the sitemap XML.",
      "Read the URL count and whether the file is an index.",
      "Check the errors — a missing namespace makes the whole file invalid.",
      "Fix and re-validate, then submit in Search Console.",
    ],
    faqs: [
      {
        q: "Why does a missing namespace invalidate the file?",
        a: "The urlset element must declare the sitemap 0.9 namespace, otherwise a parser cannot tell which vocabulary the elements belong to and the file is not a sitemap. It is a single attribute and its absence is a common hand-editing mistake.",
      },
      {
        q: "What is the difference between a urlset and an index?",
        a: "A urlset lists page URLs. A sitemapindex lists other sitemap files, used when a site has more than 50,000 URLs or wants to split by content type. The validator reports which it found.",
      },
      {
        q: "Can I validate a sitemap by URL?",
        a: "Not here — that would require a server-side fetch. Download the file and paste its contents, or use Search Console, which validates the submitted file directly.",
      },
      {
        q: "How many errors matter?",
        a: "Any error that makes the file invalid stops the whole sitemap being read. Duplicate URLs and cross-host entries are warnings that weaken it but do not invalidate it. Fix errors first.",
      },
    ],
    reference: [
      {
        title: "What is checked",
        body: "The presence of urlset or sitemapindex, the schema namespace declaration, the URL count against the 50,000 limit, absolute URL format, duplicates and, for an index, the child sitemap entries.",
      },
    ],
  },
  {
    slug: "canonical-checker",
    name: "Canonical Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "canonical-checker",
    status: "live",
    description:
      "Compare a page URL with its declared canonical and flag the conflicts that actually de-index pages: relative canonicals, host mismatches and path differences.",
    keywords:
      "canonical checker url tag self referencing host mismatch relative canonical seo duplicate consolidation",
    h1: "Canonical Checker",
    seoTitle: "Canonical Checker — Tag and URL Conflicts",
    seoDescription:
      "Compare a page URL with its canonical tag and see the conflicts that matter: relative or non-absolute canonicals, host mismatches and path differences.",
    primaryKeyword: "canonical checker",
    secondaryKeywords: [
      "rel canonical self reference check",
      "canonical url mismatch",
      "duplicate url in the index",
      "canonical versus redirect",
      "one canonical per page",
    ],
    researchId: "seo-canonical",
    alternativeTitles: [
      "Canonical Tag and URL Checker",
      "Rel Canonical Validator",
    ],
    alternativeDescription:
      "Check whether a page's canonical tag points at itself correctly, and what a mismatch with the live URL will cost you in the search index.",
    internalLinks: [
      "/tools/sitemap-generator",
      "/tools/hreflang-checker",
      "/tools/redirect-checker",
    ],
    steps: [
      "Enter the URL the page is actually served at, including any query string.",
      "Enter the canonical the page declares.",
      "Read the conflicts; a different host is an error because it tells crawlers the page is a duplicate of another site.",
      "Fix the tag and check again.",
    ],
    faqs: [
      {
        q: "What makes a canonical wrong?",
        a: "Three things: a relative URL, which resolves inconsistently; a different host, which cross-canonicalises to another site; and a path that does not match the page when the page is not a genuine duplicate. The first two are errors in almost every case.",
      },
      {
        q: "Should the canonical be self-referencing?",
        a: "Yes, on every indexable page. A self-referencing canonical protects against duplicates introduced by tracking parameters, www variants and case differences in URLs. Omitting it is the more common mistake than having the wrong one.",
      },
      {
        q: "Does a canonical guarantee the page is not indexed?",
        a: "No. It is a hint. If the signals disagree, Google may choose a different canonical or index both. For a permanent move, a 301 redirect is stronger and should be used instead.",
      },
      {
        q: "Can I have more than one canonical tag?",
        a: "No. Multiple canonical tags conflict and are ignored. If a CMS emits one and a template adds another, neither works.",
      },
    ],
    reference: [
      {
        title: "What is compared",
        body: "The scheme, the host with and without www, and the path with trailing slashes normalised. Query strings on the page but not on the canonical are reported as informational, because dropping tracking parameters is the correct use of a canonical.",
      },
    ],
  },
  {
    slug: "hreflang-checker",
    name: "Hreflang Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "hreflang-checker",
    status: "live",
    description:
      "Check an hreflang cluster for reciprocity, self-reference, valid language tags and a sane x-default — a cluster missing any of those is ignored entirely.",
    keywords:
      "hreflang checker validator reciprocal self reference x-default language region tag international seo cluster",
    h1: "Hreflang Checker",
    seoTitle: "Hreflang Checker — Cluster and Tag Validation",
    seoDescription:
      "Validate an hreflang cluster for reciprocity, self-reference, valid ISO tags and an x-default. One missing requirement voids the whole cluster.",
    primaryKeyword: "hreflang checker",
    secondaryKeywords: [
      "hreflang reciprocity check",
      "x default and self reference",
      "iso language and region tags",
      "multi language cluster validation",
      "hreflang annotations across pages",
    ],
    researchId: "seo-hreflang",
    alternativeTitles: [
      "Hreflang Cluster Validator",
      "International Targeting Checker",
    ],
    alternativeDescription:
      "Check that every tag in a language cluster references every other, including itself and a default, before the cluster is ignored entirely.",
    internalLinks: [
      "/tools/canonical-checker",
      "/tools/sitemap-validator",
      "/tools/redirect-checker",
    ],
    steps: [
      "Enter this page's URL — it must appear in the cluster.",
      "List each language-region tag with its absolute URL.",
      "Add an x-default entry for the page to serve when no language matches.",
      "Read the errors; a missing self-reference voids the entire cluster.",
    ],
    faqs: [
      {
        q: "Why must a page reference itself?",
        a: "Because hreflang is a set of mutual assertions. Each page must declare all versions including itself, and if the links are not reciprocal across the whole cluster, Google discards it entirely rather than partially applying it. That makes self-reference non-optional.",
      },
      {
        q: "What is x-default for?",
        a: "It names the page to serve when no language or region matches the user — commonly a language selector or the primary market version. Without it, an unmatched user may be sent to an arbitrary version. It is recommended rather than strictly required, which is why the tool warns rather than errors.",
      },
      {
        q: "Should I use en-GB or just en?",
        a: "en is language-only and means all English speakers; en-GB targets the United Kingdom specifically. Use a region only when the content genuinely differs between regions — prices, regulations, spelling. Adding regions that serve identical content creates duplicates for no benefit.",
      },
      {
        q: "Does hreflang help rankings?",
        a: "It does not improve ranking within a language. It ensures the right version is served to the right user, which improves click-through and experience, and it reduces the chance of the wrong language version outranking in the wrong market.",
      },
    ],
    reference: [
      {
        title: "The requirements",
        body: "Every page in the cluster references every other, including itself. Values are an ISO 639-1 language tag, optionally with an ISO 3166-1 region, or x-default. Each language-region pair maps to exactly one URL, and every URL must be absolute.",
      },
    ],
  },
  {
    slug: "redirect-checker",
    name: "Redirect Checker",
    categoryName: "SEO & Website Growth",
    subgroup: "technical",
    workspace: "technical-seo",
    mode: "redirect-checker",
    status: "live",
    description:
      "Resolve redirect chains from a rule list, catching loops, multi-hop chains and 302s standing in for permanent 301s.",
    keywords:
      "redirect checker chain loop 301 302 multi hop seo crawl budget temporary permanent redirect analysis",
    h1: "Redirect Checker",
    seoTitle: "Redirect Checker — Chains, Loops and Status Codes",
    seoDescription:
      "Resolve redirect chains from your rule list: catch loops that break the site, multi-hop chains that waste crawl budget, and 302s that should be 301s.",
    primaryKeyword: "redirect checker",
    secondaryKeywords: [
      "redirect chain and loop check",
      "301 versus 302 status",
      "redirect rule order",
      "permanent redirect for a moved page",
      "redirect map review",
    ],
    researchId: "seo-redirects",
    alternativeTitles: [
      "Redirect Chain and Loop Checker",
      "301 and 302 Status Code Analyzer",
    ],
    alternativeDescription:
      "Paste your redirect rules to see every resolved chain, any loop, and which redirects should be permanent but are currently not.",
    internalLinks: [
      "/tools/canonical-checker",
      "/tools/sitemap-validator",
      "/tools/robots-txt-generator",
    ],
    steps: [
      "Enter one rule per line as from | to | status.",
      "Read the resolved chains and the longest hop count.",
      "Fix any loop immediately — a loop breaks the URL for every visitor.",
      "Flatten multi-hop chains so each redirect points at the final destination.",
    ],
    faqs: [
      {
        q: "Why is a redirect chain a problem?",
        a: "Each hop is a round trip and a small dilution of signal. A chain of four redirects means a crawler does four fetches to reach a page it could have reached in one, and browsers get slower for real users. Flattening chains is a cheap, real improvement.",
      },
      {
        q: "When is a 302 correct?",
        a: "For genuinely temporary moves — a maintenance page, an A/B test, a seasonal campaign. It tells crawlers to keep the original URL indexed. Using it for a permanent move is a mistake because the ranking signals stay with the old URL.",
      },
      {
        q: "How long should a redirect be kept?",
        a: "Effectively permanently for a permanent move. Google treats a 301 as a signal that can be made permanent after a period, and removing it later leaves the old URL broken. Keep the rules in place as long as anyone might use the old link.",
      },
      {
        q: "Can this test live URLs?",
        a: "No. It resolves the rules you provide. Testing live redirects requires making HTTP requests, which a browser cannot do for arbitrary origins. Use curl or a server-side tool for live checks.",
      },
    ],
    reference: [
      {
        title: "What is resolved",
        body: "Each from URL is followed through the rule map, recording each hop until a URL has no outgoing rule or a visited URL repeats. A repeat is a loop; more than one hop is a chain; a 302 is flagged as informational and worth reviewing.",
      },
    ],
  },
  // ──────────────────────────────────────────────── SEO · Content
  {
    slug: "title-generator",
    name: "Title Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "title-generator",
    status: "live",
    description:
      "Draft page titles from your keyword plus one concrete differentiator, with length checks — no invented superlatives and no keyword stuffing.",
    keywords:
      "title generator seo page title tag drafts keyword differentiator length 60 characters meta title",
    h1: "Title Generator",
    seoTitle: "Title Generator — Page Title Tag Drafts",
    seoDescription:
      "Draft page titles from your keyword and a differentiator you choose, each with a character count and a note on whether it fits the display window.",
    primaryKeyword: "title generator",
    secondaryKeywords: [
      "seo title within pixel budget",
      "title tag draft variants",
      "keyword forward title",
      "title length before truncation",
      "page title ideas for a post",
    ],
    researchId: "seo-title-generator",
    alternativeTitles: [
      "Page Title Tag Draft Generator",
      "SEO Title Builder with Pixel Fitting",
    ],
    alternativeDescription:
      "Generate title variants from your keyword and a real differentiator, with lengths listed so you can choose one that will not truncate.",
    internalLinks: [
      "/tools/serp-preview",
      "/tools/meta-description-generator",
      "/tools/headline-generator",
    ],
    steps: [
      "Enter the primary keyword the page targets.",
      "Add the brand if titles carry a suffix.",
      "Choose a differentiator that is genuinely true of the page.",
      "Pick a draft and check it in the SERP preview before publishing.",
    ],
    faqs: [
      {
        q: "Why is there no guarantee these titles will rank?",
        a: "Because no title generator can promise that. Title text affects click-through and gives the page a clear topic, but ranking depends on the content, the site and the query. The tool's job is to produce drafts that fit the display and make a claim the page can keep.",
      },
      {
        q: "Should the title include the brand?",
        a: "On most pages, yes, at the end. It helps recognition in results and it is what Google appends anyway when it rewrites a title. On the homepage, brand first is conventional.",
      },
      {
        q: "How long should a title be?",
        a: "30 to 60 characters is the usual window. Shorter leaves room unused; longer will often be truncated. Use the SERP preview to check the pixel width, because that is what truncates.",
      },
      {
        q: "Are superlatives like best or ultimate a good idea?",
        a: "Only if the page supports them. A page titled best that is not a comparison is a credibility problem, and describing everything as ultimate means nothing. The generator offers modifiers you can choose rather than applying them by default.",
      },
    ],
    reference: [
      {
        title: "What the generator does and does not do",
        body: "It assembles a title from your keyword, an optional modifier (how to, best, guide), an optional differentiator (free, fast, no sign-up) and an optional year. It does not invent a claim about the page, because the page has to keep it.",
      },
    ],
  },
  {
    slug: "meta-description-generator",
    name: "Meta Description Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "meta-description-generator",
    status: "live",
    description:
      "Draft meta descriptions from the benefit you supply, with the mechanism and a call to action, each measured against the display window.",
    keywords:
      "meta description generator seo snippet drafts benefit mechanism call to action 160 characters length",
    h1: "Meta Description Generator",
    seoTitle: "Meta Description Generator — Snippet Drafts",
    seoDescription:
      "Turn a benefit, a mechanism and a call to action into meta description drafts, each measured against the roughly 160-character display window.",
    primaryKeyword: "meta description generator",
    secondaryKeywords: [
      "meta description within snippet budget",
      "description draft variants",
      "call to action in a description",
      "description before truncation",
      "snippet copy for a page",
    ],
    researchId: "seo-meta-description",
    alternativeTitles: [
      "Meta Description Draft Builder",
      "SERP Snippet Generator",
    ],
    alternativeDescription:
      "Draft descriptions that state the benefit and the mechanism, with each variant's length checked against what Google displays.",
    internalLinks: [
      "/tools/serp-preview",
      "/tools/title-generator",
      "/tools/content-brief-generator",
    ],
    steps: [
      "Enter the keyword the page targets.",
      "Write the benefit — what the reader actually gets.",
      "Add the mechanism, meaning how the page delivers it, and a differentiator.",
      "Choose a call to action and pick the draft that fits 120 to 160 characters.",
    ],
    faqs: [
      {
        q: "Do meta descriptions affect rankings?",
        a: "Not directly — they are not a ranking factor. They affect click-through, which affects how many people see the page, and a description that reads well is worth writing for that reason alone. A weak description is a missed opportunity rather than a penalty.",
      },
      {
        q: "Why do I need to supply the benefit?",
        a: "Because only you know what the page delivers. A generator that writes the benefit for you produces a generic sentence indistinguishable from every competitor's, which is exactly the kind of description readers skip.",
      },
      {
        q: "What if Google rewrites my description?",
        a: "It often does, especially when the description does not match the query. There is no way to prevent it, but a specific description that states the benefit is less likely to be replaced with extracted text you do not control.",
      },
      {
        q: "Should every page have a unique description?",
        a: "Yes. Duplicate descriptions across pages are a common template bug, and they give you no control over the snippet for any of those pages.",
      },
    ],
    reference: [
      {
        title: "The structure used",
        body: "Benefit first, then the mechanism, then an optional differentiator, then a call to action appropriate to the page — try, calculate, download, compare or learn. Three variants are produced and each is measured against 120 to 160 characters.",
      },
    ],
  },
  {
    slug: "content-brief-generator",
    name: "Content Brief Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "content-brief",
    status: "live",
    description:
      "Turn a topic and a search intent into an outline with the questions a reader at that stage will have and the evidence to gather first.",
    keywords:
      "content brief generator seo outline search intent reader questions evidence structure article plan",
    h1: "Content Brief Generator",
    seoTitle: "Content Brief Generator — Outline and Intent",
    seoDescription:
      "Build a content brief from a topic and its search intent: an outline, the questions a reader will have, and the evidence to gather before writing.",
    primaryKeyword: "content brief generator",
    secondaryKeywords: [
      "brief with headings and questions",
      "writer instructions for a post",
      "topic coverage checklist",
      "outline before drafting",
      "brief with internal link targets",
    ],
    researchId: "seo-content-brief",
    alternativeTitles: [
      "SEO Content Outline Builder",
      "Article Brief Generator",
    ],
    alternativeDescription:
      "Produce a brief with an intent-matched outline, the reader's likely questions and a list of evidence to collect before writing.",
    internalLinks: [
      "/tools/headline-generator",
      "/tools/meta-description-generator",
      "/tools/topic-cluster-builder",
    ],
    steps: [
      "Enter the topic and the search intent — learning, choosing, doing or finding.",
      "Name the audience specifically; everyone is not an audience.",
      "Add the facts you already have, which become the evidence list.",
      "Use the outline as a plan, not a template to fill with filler.",
    ],
    faqs: [
      {
        q: "Where do the reader questions come from?",
        a: "From a taxonomy of what people ask at each stage of a decision, applied to your topic. They are not real People Also Ask data — that requires a live search source, and claiming otherwise would be a fabrication. They are still the questions a reader genuinely has.",
      },
      {
        q: "Is the target word count a ranking factor?",
        a: "No. There is no word count that ranks. The number is a planning estimate of how much space the outline needs, and padding to reach it makes the page worse. The brief says to cut rather than pad.",
      },
      {
        q: "Why does the brief ask for evidence before writing?",
        a: "Because the most common failure in content is stating a figure nobody sourced, which then has to be corrected or defended. Listing what to verify first is the cheapest quality intervention available.",
      },
      {
        q: "Should I follow the outline exactly?",
        a: "No. It is a starting structure based on intent. If the topic genuinely needs a different shape, change it — the value is in deciding the structure before writing rather than discovering it halfway through.",
      },
    ],
    reference: [
      {
        title: "Intent shapes the outline",
        body: "Informational: define, explain, worked example, mistakes, limits. Commercial: options, comparison on real axes, total cost, who each suits, what to check. Transactional: what you get, how to do it, cost and limits, data handling, proof. Navigational: what this is, where to find things, common problems.",
      },
    ],
  },
  {
    slug: "headline-generator",
    name: "Headline Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "headline-generator",
    status: "live",
    description:
      "Headline variants by angle — how-to, comparison, explainer, data or mistakes — each promising only what the page can support.",
    keywords:
      "headline generator article title ideas angle how to comparison explainer mistakes content marketing",
    h1: "Headline Generator",
    seoTitle: "Headline Generator — Article Headline Variants",
    seoDescription:
      "Generate headline variants from five angles — how-to, comparison, explainer, data and mistakes — each written to claim only what the article can support.",
    primaryKeyword: "headline generator",
    secondaryKeywords: [
      "headline by angle",
      "title variants by intent",
      "headline that the article can prove",
      "h1 options for a post",
      "headline click versus accuracy",
    ],
    researchId: "seo-headline",
    alternativeTitles: [
      "Article Headline Builder",
      "Content Headline Generator",
    ],
    alternativeDescription:
      "Draft headlines by angle, with each variant kept to a claim the article can actually prove rather than a promise it cannot.",
    internalLinks: [
      "/tools/title-generator",
      "/tools/content-brief-generator",
      "/tools/meta-description-generator",
      "/tools/alt-text-generator",
    ],
    steps: [
      "Enter the subject of the article.",
      "Choose the angle that matches what the piece actually does.",
      "Pick a variant and check it still describes the finished article.",
    ],
    faqs: [
      {
        q: "What makes a headline clickable without being clickbait?",
        a: "Specificity. A headline that names the thing, the situation and the outcome is more compelling than one that promises excitement. Clickbait works once and costs trust, and a headline the article does not deliver is the fastest way to lose a reader.",
      },
      {
        q: "Which angle performs best?",
        a: "The one that matches intent. Someone searching how to wants a how-to headline; someone comparing wants a comparison. The angle should be determined by what the article does, not by which template feels punchier.",
      },
      {
        q: "Should I use numbers in headlines?",
        a: "When they are true and meaningful — five mistakes, three steps. A number that is padded to a round figure is obvious and weakens the headline. The generator does not insert numbers because it does not know your content.",
      },
    ],
    reference: [
      {
        title: "The angles",
        body: "How-to for procedural intent, comparison for choosing, explainer for understanding, data for evidence-led pieces, and mistakes for readers who already know the basics and want to avoid error. Each angle produces three variants.",
      },
    ],
  },
  {
    slug: "alt-text-generator",
    name: "Alt Text Generator",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "alt-text-generator",
    status: "live",
    description:
      "Alt text that fits the image's role — informational, functional, chart or decorative — including telling you when the correct answer is an empty alt.",
    keywords:
      "alt text generator image accessibility seo decorative functional chart empty alt attribute description",
    h1: "Alt Text Generator",
    seoTitle: "Alt Text Generator — Accessible Descriptions",
    seoDescription:
      "Generate alt text that matches the image's role, and find out when the right answer is an empty alt attribute rather than a written description.",
    primaryKeyword: "alt text generator",
    secondaryKeywords: [
      "accessible image description",
      "decorative image empty alt",
      "functional image alt text",
      "alt attribute by image role",
      "image description for screen readers",
    ],
    researchId: "seo-alt-text",
    alternativeTitles: [
      "Image Alt Attribute Helper",
      "Accessible Alt Text Generator",
    ],
    alternativeDescription:
      "Work out what an image's alt text should say based on what the image is for, including the cases where it should say nothing at all.",
    internalLinks: [
      "/tools/on-page-audit",
      "/tools/title-generator",
      "/tools/serp-preview",
    ],
    steps: [
      "Describe what the image shows.",
      "Choose its role: informational, functional, chart or decorative.",
      "Add the key detail the reader needs.",
      "Copy the value, including an empty alt where that is correct.",
    ],
    faqs: [
      {
        q: "When should alt text be empty?",
        a: "When the image is purely decorative — a divider, a background flourish, a stock photo with no informational content. An empty alt attribute tells a screen reader to skip it, which is the correct behaviour. Filling it with words makes the reader listen to noise.",
      },
      {
        q: "Does alt text help SEO?",
        a: "It helps image search and accessibility, which is the honest framing. Alt text is not a place to stuff keywords; an image described as a blue widget when it is a chart is worse than useless to a screen-reader user and reads as manipulation to a reviewer.",
      },
      {
        q: "Should I start with image of?",
        a: "No. A screen reader already announces that it is an image, so image of adds nothing. Go straight to the content: A bar chart showing… rather than Image of a bar chart showing….",
      },
      {
        q: "What about an image that is also a link?",
        a: "Describe the destination or action, not the picture. A magnifier icon that opens search needs alt text of Search, not magnifying glass.",
      },
    ],
    reference: [
      {
        title: "The four roles",
        body: "Informational: describe the content. Functional: describe the destination or action. Chart: state the finding and the range, not the title. Decorative: an empty alt attribute, explicitly, so assistive technology skips it.",
      },
    ],
  },
  {
    slug: "internal-link-suggestions",
    name: "Internal Link Suggestions",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "internal-link-suggestions",
    status: "live",
    description:
      "Find internal linking gaps: pages whose target keyword appears in another page's text but is not linked, with a suggested anchor.",
    keywords:
      "internal link suggestions internal linking seo anchor text page gaps site structure navigation",
    h1: "Internal Link Suggestions",
    seoTitle: "Internal Link Suggestions — Gaps and Anchors",
    seoDescription:
      "Find pages whose target keyword appears in another page's text without a link, with the exact anchor to use. A mechanical rule you can verify, not a score.",
    primaryKeyword: "internal link suggestions",
    secondaryKeywords: [
      "anchor text for an internal link",
      "pages that should link to each other",
      "orphan paragraph linking",
      "contextual link opportunities",
      "internal linking without a crawler",
    ],
    researchId: "seo-internal-links",
    alternativeTitles: ["Internal Linking Gap Finder", "Anchor Text Suggester"],
    alternativeDescription:
      "Identify pages that mention another page's topic but do not link to it, with the anchor text worth using for each of those pages.",
    internalLinks: [
      "/tools/topic-cluster-builder",
      "/tools/keyword-cannibalisation-checker",
      "/tools/on-page-audit",
    ],
    steps: [
      "List your pages as url | keyword | excerpt | existing links.",
      "Run the suggestion.",
      "Review each suggestion — a mention is not always the right linking opportunity.",
      "Add the links to the source pages and re-run to confirm the gap closed.",
    ],
    faqs: [
      {
        q: "How is a suggestion decided?",
        a: "A link is suggested when another page's target keyword appears in this page's excerpt and this page does not already link to it. That is a mechanical rule you can check against the page, which is what makes it trustworthy rather than an opaque score.",
      },
      {
        q: "How many internal links should a page have?",
        a: "There is no correct number. Enough that a reader can follow the trail to related content, few enough that each one means something. Pages built as link lists dilute every link, including the important ones.",
      },
      {
        q: "Does this estimate link equity?",
        a: "No. Doing that requires a full crawl and a link-graph model, which a browser cannot do. Nothing here claims to know how much authority a page passes — it finds gaps in your own link graph.",
      },
      {
        q: "Should anchor text be the keyword exactly?",
        a: "Descriptive anchor text is better for both users and crawlers, and the keyword is usually the most descriptive option. Varying it across mentions reads more naturally than repeating one phrase, and over-optimised anchors are a recognised manipulation signal.",
      },
    ],
    reference: [
      {
        title: "The rule",
        body: "For each ordered pair of pages, a suggestion is produced when the target page's keyword appears in the source page's excerpt, the source does not already link to the target, and the two are different pages. The anchor is the target's keyword.",
      },
    ],
  },
  {
    slug: "topic-cluster-builder",
    name: "Topic Cluster Builder",
    categoryName: "SEO & Website Growth",
    subgroup: "content",
    workspace: "content-kit",
    mode: "topic-clusters",
    status: "live",
    description:
      "Group pages sharing significant keywords into clusters and find the orphan pages nothing links to.",
    keywords:
      "topic cluster builder pillar page orphan pages internal links site architecture seo content groups",
    h1: "Topic Cluster Builder",
    seoTitle: "Topic Cluster Builder — Pillars and Orphans",
    seoDescription:
      "Group pages that share significant keywords into clusters and list the orphan pages nothing links to, so internal architecture problems are visible.",
    primaryKeyword: "topic cluster builder",
    secondaryKeywords: [
      "shared keyword grouping",
      "pillar and supporting pages",
      "orphan page detection",
      "cluster by keyword overlap",
      "content hub structure",
    ],
    researchId: "seo-topic-clusters",
    alternativeTitles: [
      "Content Cluster Builder",
      "Orphan Page Finder for Site Structure",
    ],
    alternativeDescription:
      "Find which of your pages belong together by shared keywords, and which pages on the site nothing else links to at all today.",
    internalLinks: [
      "/tools/internal-link-suggestions",
      "/tools/keyword-cannibalisation-checker",
      "/tools/content-brief-generator",
    ],
    steps: [
      "List each page as url | keyword | links, where links are the pages it points at.",
      "Build the clusters.",
      "Read the orphan list first — those are pages that will struggle to be found.",
      "Add internal links from the clusters to the orphans and re-run.",
    ],
    faqs: [
      {
        q: "What is an orphan page?",
        a: "A page nothing on your site links to. It is usually reachable only from the sitemap, which means crawlers find it rarely and visitors almost never. The fix is a contextual internal link from a relevant page, which is the single highest-value change for an orphan.",
      },
      {
        q: "How are clusters formed?",
        a: "Pages are grouped when their target keywords share a significant word, and are listed with the shared terms so the grouping can be checked. It is keyword overlap, not semantic clustering, and the shared terms make the difference visible.",
      },
      {
        q: "Do clusters improve rankings?",
        a: "A clear internal link structure helps crawlers and readers reach relevant content, which is worth doing. Treating clusters as a ranking formula is not supported by anything Google has published.",
      },
      {
        q: "What if a page legitimately has no links in?",
        a: "That is rarely legitimate. Even a legal page or a landing page reached from ads should be linked from somewhere, if only the footer. A true orphan is nearly always an oversight.",
      },
    ],
    reference: [
      {
        title: "The clustering rule",
        body: "Two pages are grouped when their target keywords share a token longer than three characters, excluding stop words. The most-connected page in each group is treated as the pillar. Inbound links are counted across the list you paste, so a page nothing links to is reported as an orphan.",
      },
    ],
  },
  // ──────────────────────────────────────────────── Career · Résumé
  {
    slug: "resume-ats-checker",
    name: "Résumé ATS Checker",
    categoryName: "Career & Jobs",
    subgroup: "resume",
    workspace: "resume-studio",
    mode: "resume-ats-checker",
    status: "live",
    description:
      "Score résumé readiness across parseability, quantified impact, bullet mechanics and keyword match, with every finding itemised — not a fabricated per-vendor score.",
    keywords:
      "resume ats checker india ats score job description parseability quantified bullets contact sections readiness keyword match",
    h1: "Résumé ATS Checker",
    seoTitle: "Résumé ATS Checker — Readiness Score, Itemised",
    seoDescription:
      "Check résumé readiness across parseability, quantified impact, bullet mechanics and keyword match against a job ad. An itemised check, not a vendor score.",
    primaryKeyword: "resume ats checker",
    secondaryKeywords: [
      "ats resume score india",
      "resume readiness check",
      "resume for job description match",
      "ats friendly resume format",
      "resume parseability check",
    ],
    researchId: "career-ats-check",
    alternativeTitles: [
      "Résumé Readiness Check Against a Job Description",
      "ATS Parseability and Keyword Checker",
    ],
    alternativeDescription:
      "Paste your résumé and the job description to see how parseable the sections are, how many bullets carry numbers, and which emphasised terms you are missing.",
    internalLinks: [
      "/tools/resume-keyword-matcher",
      "/tools/resume-bullet-improver",
      "/tools/cover-letter-generator",
      "/tools/resume-comparison",
    ],
    steps: [
      "Paste the plain text of your résumé. Copy as plain text from your editor to avoid formatting artefacts.",
      "Paste the job description you are targeting — the check is far more useful with it.",
      "Read the score components rather than the total, because the total is just their sum.",
      "Fix the blocking findings first, starting with a missing email or a missing experience heading.",
    ],
    faqs: [
      {
        q: "Is this the score Workday or Taleo will give me?",
        a: "No, and no site can give you that. Applicant tracking systems do not publish their algorithms and they differ from each other. What this checks is measurably true of your text: whether standard section headings exist, whether contact details are findable, whether bullets carry numbers and whether the terms from the job description appear.",
      },
      {
        q: "What is the most important thing to fix first?",
        a: "Blocking findings — no email address, no experience or skills heading. Those are the things that cause a parse to fail outright. After that, quantified bullets matter most, because it is the difference between claiming impact and demonstrating it.",
      },
      {
        q: "Does my PDF parse the same way as plain text?",
        a: "Not necessarily. A text-based PDF usually extracts cleanly; one built from images does not extract at all. Multi-column layouts and text in graphics can scramble the reading order. When you can, submit a single-column document, and use plain-text export to check what a parser will probably see.",
      },
      {
        q: "Should I mirror the job description's wording?",
        a: "Only where it is accurate. Using the posting's terminology for skills you genuinely have helps a match. Inserting a term you cannot defend in interview is worse than leaving the gap, because it is discovered at exactly the moment you are trying to make a good impression.",
      },
    ],
    reference: [
      {
        title: "How the score is built",
        body: "Parseability 30 points (four core section headings plus contact signals), quantified impact 15, bullet mechanics 10, and keyword match 30 when a job description is supplied. Without a description, half of the keyword weight is redistributed rather than invented, and the result says so.",
      },
      {
        title: "What the checks are",
        body: "Standard section headings present; email, phone and location findable; bullets present, quantified and not over-length; weak openers such as responsible for replaced; repeated adjacent words caught; and the job description's emphasised terms matched.",
      },
    ],
    caveat:
      "A readiness check against your own text, not a prediction of any specific applicant tracking system. It also cannot see layout, which affects parsing as much as wording.",
  },
  {
    slug: "resume-keyword-matcher",
    name: "Résumé Keyword Matcher",
    categoryName: "Career & Jobs",
    subgroup: "resume",
    workspace: "resume-studio",
    mode: "resume-keyword-matcher",
    status: "live",
    description:
      "Extract the terms a job description emphasises and check each against your résumé, with the mention count shown for every term.",
    keywords:
      "resume keyword matcher job description terms coverage skills match ats missing keywords application tailoring",
    h1: "Résumé Keyword Matcher",
    seoTitle: "Résumé Keyword Matcher — Job Description Coverage",
    seoDescription:
      "Extract the terms a job description emphasises and see which appear in your résumé, with how often the posting mentions each one so you can judge what matters.",
    primaryKeyword: "resume keyword matcher",
    secondaryKeywords: [
      "job description keyword match",
      "resume skills gap analysis",
      "ats keyword optimization",
      "tailor resume to job",
      "missing keywords resume",
    ],
    researchId: "career-keyword-match",
    alternativeTitles: [
      "Job Description Keyword Coverage Checker",
      "Résumé Skills Match Tool",
    ],
    alternativeDescription:
      "Compare your résumé against a specific posting to see which emphasised terms you already cover and which ones are missing.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/cover-letter-generator",
      "/tools/resume-bullet-improver",
    ],
    steps: [
      "Paste your résumé text.",
      "Paste the full job description.",
      "Read the coverage percentage and the missing terms.",
      "Add only the missing terms you can genuinely claim, and leave the rest as a gap you can speak to.",
    ],
    faqs: [
      {
        q: "How are important terms chosen?",
        a: "A term counts as emphasised if the posting mentions it more than once, or if it is written as a named skill — containing a digit, plus, hash or dot, or capitalised mid-sentence. That is how Java, Kubernetes and Node.js distinguish themselves from ordinary words. Stop words and bare numbers are dropped.",
      },
      {
        q: "What coverage should I aim for?",
        a: "There is no threshold that guarantees anything. Above roughly 70% you are clearly addressing the posting; below 50% suggests you are sending a generic résumé. The number is a prompt to check, not a target to game by inserting words.",
      },
      {
        q: "Should I include every missing keyword?",
        a: "No. Only those you can genuinely claim. A résumé that claims Kubernetes experience and cannot answer a basic question about it in the interview is worse than one that honestly omits it — the gap is survivable, the discovery is not.",
      },
      {
        q: "Why does it mention how often the posting repeats a term?",
        a: "Because repetition shows emphasis. A skill mentioned four times is central to the role; one mentioned once in passing is not. The mention count lets you prioritise which gaps actually matter for this application.",
      },
    ],
    reference: [
      {
        title: "How matching works",
        body: "The posting is tokenised, stop words and pure numbers are removed, and the remaining terms are ranked by mention count. Up to forty of the most emphasised are checked against your résumé using case-insensitive substring matching on word boundaries.",
      },
    ],
    caveat:
      "A match against the specific text you paste. It does not know what the employer actually wants, and a term that appears does not mean it is impressive.",
  },
  {
    slug: "resume-bullet-improver",
    name: "Résumé Bullet Improver",
    categoryName: "Career & Jobs",
    subgroup: "resume",
    workspace: "resume-studio",
    mode: "resume-bullet-improver",
    status: "live",
    description:
      "Rewrite résumé bullets with rule-based changes — weak openers replaced, filler stripped — and a visible prompt where a metric is missing.",
    keywords:
      "resume bullet improver action verbs weak openers responsible for quantified achievements rewrite bullets cv",
    h1: "Résumé Bullet Improver",
    seoTitle: "Résumé Bullet Improver — Action Verbs and Metrics",
    seoDescription:
      "Rewrite bullets with action verbs and less filler, and see where a metric is missing — the tool will not invent a number you must defend in an interview.",
    primaryKeyword: "resume bullet improver",
    secondaryKeywords: [
      "action verbs for resume",
      "responsible for resume fix",
      "quantify resume achievements",
      "cv bullet points rewrite",
      "resume impact statements",
    ],
    researchId: "career-bullet-improver",
    alternativeTitles: [
      "Action Verb Bullet Rewriter",
      "CV Bullet Point Improver",
    ],
    alternativeDescription:
      "Paste your bullets to replace weak openers with action verbs and see which ones still need a number to be credible to a reader.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/star-answer-builder",
      "/tools/resume-summary-generator",
    ],
    steps: [
      "Paste one bullet per line.",
      "Read the rewritten version and the list of changes made.",
      "Where the tool says a metric is needed, add the real number yourself.",
      "Check the result reads as something you would say out loud.",
    ],
    faqs: [
      {
        q: "Why does it not add a number for me?",
        a: "Because an invented metric is a claim you have to defend. A bullet saying increased revenue by 30% that you cannot substantiate falls apart in the first interview question, and if it is discovered after hiring it is grounds for withdrawal. The prompt tells you what is missing; you supply the fact.",
      },
      {
        q: "What counts as a weak opener?",
        a: "Phrases like responsible for, helped with, worked on and participated in. They describe proximity to work rather than what you did. Starting with the action verb — Led, Built, Cut, Shipped — puts your contribution first.",
      },
      {
        q: "How long should a bullet be?",
        a: "One to two lines, under about 30 words. Beyond that it becomes a paragraph, and readers skim past paragraphs on a résumé. Split it or cut the preamble.",
      },
      {
        q: "Should every bullet have a number?",
        a: "No. Aim for most of them, but some work is genuinely not quantifiable and inventing a figure to fit a template is worse than describing the outcome plainly. The tool flags the absence; it does not require one.",
      },
    ],
    reference: [
      {
        title: "The rules applied",
        body: "A weak opener is replaced with an action verb appropriate to it; filler words such as various, several and successfully are removed; in order to becomes to; double spaces are collapsed; the first letter is capitalised and a trailing full stop is dropped. Where the result contains no digit, a metric prompt is added.",
      },
    ],
    caveat:
      "Rule-based rewriting only. Review each suggestion — the verb chosen may not match what you actually did.",
  },
  {
    slug: "resume-summary-generator",
    name: "Résumé Summary Generator",
    categoryName: "Career & Jobs",
    subgroup: "resume",
    workspace: "resume-studio",
    mode: "resume-summary-generator",
    status: "live",
    description:
      "Professional summary drafts at three lengths from your role, experience and one achievement — with hollow adjectives deliberately excluded.",
    keywords:
      "resume summary generator professional profile objective statement resume india fresher experienced achievement",
    h1: "Résumé Summary Generator",
    seoTitle: "Résumé Summary Generator — Profile Drafts",
    seoDescription:
      "Draft a professional summary at three lengths from your role, years and one achievement, with hollow adjectives like passionate and results-driven left out.",
    primaryKeyword: "resume summary generator",
    secondaryKeywords: [
      "professional summary for resume",
      "resume profile statement",
      "summary for fresher resume",
      "career objective generator",
      "resume introduction paragraph",
    ],
    researchId: "career-summary",
    alternativeTitles: [
      "Professional Summary Draft Builder",
      "Resume Profile Statement Generator",
    ],
    alternativeDescription:
      "Turn your role, experience and one achievement into a summary draft, in whichever length suits the space you have on the page.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/linkedin-about-generator",
      "/tools/resume-bullet-improver",
    ],
    steps: [
      "Enter your role and years of experience.",
      "Add your skills and one concrete achievement with a number if you have one.",
      "Choose the length that fits your résumé.",
      "Pick the draft closest to how you would describe yourself, then edit it to sound like you.",
    ],
    faqs: [
      {
        q: "Why are words like passionate and results-driven missing?",
        a: "Because they carry no information and recruiters discount them. Passionate is unverifiable and appears on most résumés; results-driven describes everyone who has ever held a job. A specific achievement says more in one clause than a paragraph of adjectives.",
      },
      {
        q: "Do I even need a summary?",
        a: "It helps when you are changing fields, returning after a break, or your most relevant experience is not the most recent. If your experience section already makes your fit obvious, a summary can be omitted — a weak summary is worse than none.",
      },
      {
        q: "How long should it be?",
        a: "Two to three sentences. It sits at the top where attention is highest, and a wall of text there is counterproductive. The three lengths here correspond to a tight one-liner, a standard two-sentence version and a senior three-sentence version.",
      },
      {
        q: "Will this work for a fresher?",
        a: "Yes, with the years set to zero. The draft then leads with the role and skills rather than experience, which is the right shape for someone entering the market. The achievement slot matters more, not less, when there is no work history — a project with a measurable outcome fills it.",
      },
    ],
    reference: [
      {
        title: "The three shapes",
        body: "Concise: role, skills and achievement in one sentence. Standard: role, experience and skills, the achievement, and what you are looking for. Senior: the same with a closing clause about owning delivery and explaining trade-offs. All are assembled from your inputs; none of the claims are generated.",
      },
    ],
  },
  {
    slug: "resume-comparison",
    name: "Résumé Comparison",
    categoryName: "Career & Jobs",
    subgroup: "resume",
    workspace: "resume-studio",
    mode: "resume-comparison",
    status: "live",
    description:
      "Compare two versions of a résumé on the same measurable axes, with the score delta and the words that changed.",
    keywords:
      "resume comparison two versions cv diff score change quantified bullets word differences job application",
    h1: "Résumé Comparison",
    seoTitle: "Résumé Comparison — Two Versions Compared",
    seoDescription:
      "Compare two résumé versions metric by metric: readiness score, quantified bullets, weak openers, errors and word count, plus the words only one version uses.",
    primaryKeyword: "resume comparison",
    secondaryKeywords: [
      "compare two resumes",
      "cv version comparison",
      "resume improvement measure",
      "resume score difference",
      "which resume is better",
    ],
    researchId: "career-resume-comparison",
    alternativeTitles: [
      "Two-Version Résumé Comparer",
      "CV Diff and Score Comparison",
    ],
    alternativeDescription:
      "Paste both versions to see which one is stronger on each measurable axis and exactly which wording was gained or lost between them.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/resume-keyword-matcher",
      "/tools/resume-bullet-improver",
    ],
    steps: [
      "Paste version A and version B.",
      "Optionally add a job description so both are scored against the same posting.",
      "Read the metric-by-metric comparison rather than only the total.",
      "Check the words unique to each version to see what was actually lost or gained.",
    ],
    faqs: [
      {
        q: "What if the newer version scores lower?",
        a: "It happens, and it is worth understanding rather than ignoring. Cutting content to fit two pages often reduces quantified bullets, which lowers the score. The comparison shows which metric moved, so you can decide whether the cut was worth it — sometimes it is.",
      },
      {
        q: "Do both versions need the job description?",
        a: "The same one, yes. Scoring two versions against different postings produces a comparison that means nothing, so the tool applies one description to both.",
      },
      {
        q: "Can I compare a résumé against a friend's?",
        a: "Technically yes, but the comparison is not meaningful — scores are relative to each document's own structure, not a benchmark across people. Use it for versions of your own résumé.",
      },
      {
        q: "What do the unique words tell me?",
        a: "Which specific terms one version has that the other does not, excluding short and common words. It is a fast way to spot an accidental loss — a keyword that was there and is now gone.",
      },
    ],
    reference: [
      {
        title: "What is compared",
        body: "Readiness score, count of quantified bullets, weak openers, error count and word count, each with which version is better. Plus the distinctive words unique to each version, so a lost keyword is visible.",
      },
    ],
  },
  // ──────────────────────────────────────────────── Career · Salary
  {
    slug: "salary-converter",
    name: "Salary Converter",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "salary-converter",
    status: "live",
    description:
      "Convert a salary between hourly, daily, monthly and annual with the working-hours assumption stated rather than hidden.",
    keywords:
      "salary converter hourly daily monthly annual rate conversion ctc per hour per day per month per year",
    h1: "Salary Converter",
    seoTitle: "Salary Converter — Hourly, Daily, Monthly, Annual",
    seoDescription:
      "Convert a salary between hourly, daily, monthly and annual rates, with the working-hours divisor shown so the hourly figure does not hide an assumption.",
    primaryKeyword: "salary converter",
    secondaryKeywords: [
      "annual to hourly calculator",
      "monthly to annual salary",
      "per day rate conversion",
      "salary per hour india",
      "ctc conversion tool",
    ],
    researchId: "career-salary-converter",
    alternativeTitles: [
      "Salary Period Conversion Calculator",
      "Hourly to Annual Salary Converter",
    ],
    alternativeDescription:
      "Convert any salary period into the other three, with the hours per week and weeks per year used in the arithmetic made explicit.",
    internalLinks: [
      "/tools/contractor-rate-calculator",
      "/tools/offer-comparison-calculator",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter the amount and the period it is quoted in.",
      "Set the hours per week and weeks per year — 40 and 52 for a standard salaried role.",
      "Read all four equivalents and the hours per year the hourly rate is based on.",
      "For a contractor comparison, lower the weeks per year to account for unpaid leave and bench time.",
    ],
    faqs: [
      {
        q: "Why is the hourly figure different from what I expected?",
        a: "Because it depends on the divisor, and different organisations use different ones. A month is 160 hours at 40 hours a week for four weeks, or 173.3 hours if you use the true average of 4.33 weeks. This tool shows the hours per year it used so the number can be checked rather than guessed at.",
      },
      {
        q: "Is a monthly salary divided by 22 the daily rate?",
        a: "Not exactly. It is the rate if the month has 22 working days, which varies. Dividing annual by 260 working days gives a stable figure. The tool uses annual ÷ (5 × weeks per year) for the daily rate, which is consistent across months.",
      },
      {
        q: "How should I compare a day rate with a salary?",
        a: "Convert both to annual on the days actually billed versus the days actually paid, not on the same number of days. Use the contractor rate calculator for that — a contractor bills far fewer days, so the day rate needs to be higher to be equivalent.",
      },
      {
        q: "Does this account for taxes?",
        a: "No. It is a period conversion of gross figures. For take-home use the salary calculator, which applies Indian statutory deductions and income tax.",
      },
    ],
    reference: [
      {
        title: "The divisors",
        body: "Annual = hourly × hours per week × weeks per year, or daily × 5 × weeks per year, or monthly × 12. Hourly = annual ÷ (hours per week × weeks per year). Daily = annual ÷ (5 × weeks per year). Monthly = annual ÷ 12.",
      },
    ],
  },
  {
    slug: "contractor-rate-calculator",
    name: "Contractor Rate Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "contractor-rate-calculator",
    status: "live",
    description:
      "The contractor day rate that matches a salaried CTC, accounting for billed days and the benefits an employer would otherwise fund.",
    keywords:
      "contractor rate calculator india day rate freelance salary equivalent billed days loading benefits comparison",
    h1: "Contractor Rate Calculator",
    seoTitle: "Contractor Rate Calculator — Salary Equivalent",
    seoDescription:
      "Work out the day rate a contractor needs to match a salaried CTC, accounting for the far fewer days actually billed and the benefits an employer would fund.",
    primaryKeyword: "contractor rate calculator",
    secondaryKeywords: [
      "day rate to salary india",
      "freelance rate calculation",
      "contractor vs employee pay",
      "consulting day rate",
      "billed days per year",
    ],
    researchId: "career-contractor-rate",
    alternativeTitles: [
      "Day Rate and Salary Equivalent Calculator",
      "Freelance Rate Calculator",
    ],
    alternativeDescription:
      "Enter a CTC to see the salaried day value and the contracting day rate required to match it after billed days and overheads.",
    internalLinks: [
      "/tools/salary-converter",
      "/tools/total-compensation-calculator",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter the annual CTC you want to match.",
      "Set the paid days per year — 260 is a standard five-day year.",
      "Set the days you would actually bill, allowing for leave, holidays and gaps between engagements.",
      "Adjust the loading to reflect what you must fund yourself, then read the day rate.",
    ],
    faqs: [
      {
        q: "Why is the contractor day rate so much higher than the salaried day value?",
        a: "Two reasons. First, you bill fewer days: about 220 rather than 260, because leave and bench time are unpaid. Second, the rate has to cover what the employer funded — PF, gratuity, insurance, equipment, and the administrative overhead. Both effects compound, which is why the multiplier looks large.",
      },
      {
        q: "What loading should I use?",
        a: "Twenty per cent is a common starting point for benefits and equipment, but it depends on what you actually need to fund. If you are not covered by anyone else's health insurance, or you need your own laptop and software, it should be higher. The tool states this is your input, not a market figure.",
      },
      {
        q: "Should I add tax to the day rate?",
        a: "The rate is pre-tax. As a contractor you are responsible for your own tax and GST registration if your turnover crosses the threshold. The calculator does not model tax because the treatment depends on how you are set up — sole proprietorship, partnership or company.",
      },
      {
        q: "Is this a market rate?",
        a: "No. It is arithmetic on the figures you enter. QUICKKIT has no consulting rate data and will not invent one. Treat the result as the floor for a conversation: the number below which contracting makes you worse off than the salary.",
      },
    ],
    reference: [
      {
        title: "The arithmetic",
        body: "Salaried day value = CTC ÷ paid days. Target annual = CTC × (1 + loading). Contractor day rate = target annual ÷ billed days. The difference between the day value and the day rate is the cost of being self-employed.",
      },
    ],
    caveat:
      "Arithmetic on your own inputs, not a market rate. Tax, GST and the cost of unpaid time off are not modelled.",
  },
  {
    slug: "offer-comparison-calculator",
    name: "Offer Comparison Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "offer-comparison-calculator",
    status: "live",
    description:
      "Compare two CTCs after Indian income tax and see how much of the raise actually reaches your bank account.",
    keywords:
      "offer comparison calculator india ctc after tax take home hike percentage salary negotiation new job switch",
    h1: "Offer Comparison Calculator",
    seoTitle: "Offer Comparison Calculator — After Tax",
    seoDescription:
      "Compare two offers after income tax, PF and professional tax, and see what share of the raise survives. A 30% hike is rarely a 30% take-home increase.",
    primaryKeyword: "offer comparison calculator",
    secondaryKeywords: [
      "salary hike after tax india",
      "ctc comparison take home",
      "job switch salary calculator",
      "increment take home difference",
      "negotiation salary calculator",
    ],
    researchId: "career-offer-comparison",
    alternativeTitles: [
      "Two-Offer Comparison After Tax",
      "Salary Hike Take-Home Calculator",
    ],
    alternativeDescription:
      "Enter both CTCs to see the take-home difference, the effective tax rate at each level, and how much of the raise you actually keep.",
    internalLinks: [
      "/tools/salary-calculator-india",
      "/tools/relocation-calculator",
      "/tools/total-compensation-calculator",
    ],
    steps: [
      "Enter your current CTC and the offered CTC.",
      "Choose the tax regime and the professional-tax state that apply.",
      "Add provable deductions if you are on the old regime.",
      "Read the take-home increase and the share of the raise that survives tax.",
    ],
    faqs: [
      {
        q: "Why is the take-home increase smaller than the hike percentage?",
        a: "Because income tax is progressive. At a higher salary, more of the raise falls into a higher slab, and PF and professional tax also rise. The retained share shows exactly how much of the increase reaches your account, which is the number that matters when you are deciding whether a move is worth it.",
      },
      {
        q: "Does this include the joining bonus?",
        a: "No. Only cash CTC. A joining bonus is a one-off and often subject to a clawback, so including it in the recurring comparison would overstate the offer. Use the total compensation calculator for the full package, including one-offs.",
      },
      {
        q: "What about ESOPs?",
        a: "Not included, because they are not cash and their value depends on a future event. Compare the cash components here and value the equity separately — then decide how much you are willing to weigh paper value against cash.",
      },
      {
        q: "Should I use the new or old regime?",
        a: "Use whichever you will actually file under. If you have large provable deductions such as home-loan interest and 80C investments, the old regime can win; otherwise the new regime usually does. Compute both to see, but do not assume the old regime is better just because it has more deductions.",
      },
    ],
    reference: [
      {
        title: "What is compared",
        body: "For each CTC, the full forward breakdown: gross, employee PF, ESI where applicable, professional tax, income tax and annual take-home. The difference in take-home is then expressed both in rupees and as a share of the CTC increase.",
      },
    ],
    jurisdiction: "India",
    caveat:
      "Cash components only, on the standard structure. Equity, clawbacks and allowances you fold into the CTC change the outcome.",
  },
  {
    slug: "total-compensation-calculator",
    name: "Total Compensation Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "total-compensation-calculator",
    status: "live",
    description:
      "Year-one cash, steady-state and equity-inclusive totals, with a joining bonus's clawback and a variable payout's pro-rating stated.",
    keywords:
      "total compensation calculator ctc joining bonus clawback variable equity relocation year one steady state package",
    h1: "Total Compensation Calculator",
    seoTitle: "Total Compensation Calculator — Year One vs Later",
    seoDescription:
      "Add up fixed CTC, variable bonus, equity and one-off payments, and see the difference between year-one cash and the steady-state annual figure.",
    primaryKeyword: "total compensation calculator",
    secondaryKeywords: [
      "ctc breakdown with bonus",
      "joining bonus clawback",
      "equity annualised compensation",
      "year one total compensation",
      "package comparison offer",
    ],
    researchId: "career-total-compensation",
    alternativeTitles: [
      "Compensation Package Calculator",
      "Year One vs Steady State Calculator",
    ],
    alternativeDescription:
      "Enter each component of an offer to see what you get in year one and what recurs afterwards, with the caveats on each part.",
    internalLinks: [
      "/tools/offer-comparison-calculator",
      "/tools/equity-vesting-calculator",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter the fixed CTC.",
      "Add a joining bonus and its clawback period.",
      "Set the variable percentage and the annualised equity value.",
      "Read year-one cash, year-one total and steady state — the three numbers an offer actually represents.",
    ],
    faqs: [
      {
        q: "Why distinguish year one from steady state?",
        a: "Because they differ substantially and offers are often quoted in whichever is more flattering. A joining bonus inflates year one and then disappears. Variable pay is often pro-rated in the first year. Year two is the number you will actually live on.",
      },
      {
        q: "What does clawback mean in practice?",
        a: "If you leave within the stated period, you repay some or all of the joining bonus. It is usually pro-rated by months remaining. That makes the bonus a loan with an employment condition rather than income, and it is the detail candidates most often miss.",
      },
      {
        q: "How should I value equity?",
        a: "As a separate, conditional benefit. The calculator annualises the spread so you can see its implied annual worth, but the money is not yours until a sale or buyback. Weigh it according to your tolerance for that risk, not as equivalent to cash.",
      },
      {
        q: "Should relocation be counted as income?",
        a: "No. It reimburses a cost you would not otherwise have, so it is neither salary nor a benefit you keep. It is listed as a one-off so the total is complete, but it should not influence a salary comparison.",
      },
    ],
    reference: [
      {
        title: "The three totals",
        body: "Year-one cash = fixed CTC + variable + joining bonus + relocation. Year-one total adds annualised equity paper value. Steady state = fixed CTC + variable + annualised equity, which is what recurs from year two.",
      },
    ],
    caveat:
      "Equity is shown at paper value and variable pay assumes full payout. Both are conditional on things outside your control.",
  },
  {
    slug: "equity-vesting-calculator",
    name: "Equity Vesting Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "equity-vesting-calculator",
    status: "live",
    description:
      "Value an ESOP or RSU grant with the cliff, the vesting schedule and the vested spread at a chosen month — and flag it when the options are underwater.",
    keywords:
      "equity vesting calculator esop rsu grant cliff strike price fmv spread schedule startup india",
    h1: "Equity Vesting Calculator",
    seoTitle: "Equity Vesting Calculator — ESOP and RSU Value",
    seoDescription:
      "Value an equity grant with its cliff and vesting schedule, see what has vested at any month, and find out when options are underwater and worth nothing today.",
    primaryKeyword: "equity vesting calculator",
    secondaryKeywords: [
      "esop value calculator",
      "rsu vesting schedule",
      "stock option spread",
      "cliff vesting india",
      "startup equity worth",
    ],
    researchId: "career-equity",
    alternativeTitles: [
      "ESOP and RSU Valuation Calculator",
      "Stock Grant Vesting Calculator",
    ],
    alternativeDescription:
      "Enter the grant, strike and fair market value to see the total spread, the annual vesting schedule and what has vested so far.",
    internalLinks: [
      "/tools/total-compensation-calculator",
      "/tools/offer-comparison-calculator",
      "/tools/salary-converter",
    ],
    steps: [
      "Enter the number of units, the strike price and the current fair market value.",
      "Set the vesting period and the cliff — 12 months is standard for a four-year grant.",
      "Enter how many months have elapsed to see what is vested.",
      "Read the underwater warning if the strike is at or above the current value.",
    ],
    faqs: [
      {
        q: "What is the difference between options and RSUs?",
        a: "Options give you the right to buy shares at the strike price, so their value is the difference between market value and strike. RSUs are shares given outright, so there is no strike to pay. Model an RSU by setting the strike to zero, which makes the spread equal the full value.",
      },
      {
        q: "What does underwater mean?",
        a: "The strike price is at or above the current fair market value, so exercising the option would cost more than the shares are worth. The options are worth zero today, though they may recover if the company grows. The calculator flags this rather than showing a misleading small number.",
      },
      {
        q: "Is this value real money?",
        a: "No. It is a paper gain at the stated fair market value, before tax, and for a private company there may be no buyer for years. The valuation may also be a figure set for tax purposes rather than one anyone would pay. Treat it as a conditional benefit, not cash.",
      },
      {
        q: "What is a cliff?",
        a: "A minimum period before anything vests — commonly twelve months. Leave before the cliff and the entire grant is forfeited. It is why joining for six months on a four-year grant leaves you with nothing, which is the most consequential detail of an equity offer.",
      },
    ],
    reference: [
      {
        title: "How vesting is computed",
        body: "Nothing vests before the cliff month. After the cliff, the unvested remainder vests evenly over the months between the cliff and the end of the total vesting period. The value per unit is the spread — fair market value minus strike — so RSUs with a zero strike are valued at full market value.",
      },
    ],
    caveat:
      "Paper value, pre-tax, at the stated fair market value. Tax treatment differs for options and RSUs and depends on when and how you sell.",
  },
  {
    slug: "relocation-calculator",
    name: "Relocation Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "relocation-calculator",
    status: "live",
    description:
      "Compare an offer in a new city using a cost index you supply, with the break-even CTC that preserves your current purchasing power.",
    keywords:
      "relocation calculator cost of living city comparison salary india break even ctc purchasing power move job",
    h1: "Relocation Calculator",
    seoTitle: "Relocation Calculator — Cost-Adjusted Offer",
    seoDescription:
      "Compare an offer in a new city against your current pay using a cost index you set, with the break-even CTC that preserves your current purchasing power.",
    primaryKeyword: "relocation calculator",
    secondaryKeywords: [
      "cost of living salary comparison india",
      "city salary adjustment",
      "relocation salary break even",
      "moving city job salary",
      "purchasing power comparison",
    ],
    researchId: "career-relocation",
    alternativeTitles: [
      "Cost-of-Living Offer Comparator",
      "City Relocation Salary Calculator",
    ],
    alternativeDescription:
      "Enter both offers and a cost index for the new city to see whether the move improves or reduces your real pay after the change.",
    internalLinks: [
      "/tools/offer-comparison-calculator",
      "/tools/salary-calculator-india",
      "/tools/total-compensation-calculator",
    ],
    steps: [
      "Enter your current CTC and the offered CTC.",
      "Set your current city's index to 100.",
      "Estimate the new city's index from your own rent, transport and food costs relative to today.",
      "Read the break-even CTC — below it, the move is a pay cut in real terms.",
    ],
    faqs: [
      {
        q: "Why doesn't the tool know the cost index for Indian cities?",
        a: "Because there is no authoritative public index at the granularity people ask for, and inventing one would be misleading. Two people moving to the same city can have very different cost profiles depending on housing, commuting and lifestyle. Using your own estimate makes the answer relevant to you.",
      },
      {
        q: "How do I set the index?",
        a: "Start with rent, because it dominates. If a comparable flat is 30% more, that alone suggests an index around 115 to 125 depending on your other costs. Then check transport, school fees and food. An index of 120 means the city is 20% more expensive for you.",
      },
      {
        q: "Should I include the relocation allowance?",
        a: "No. A relocation allowance reimburses moving costs and is a one-off. Including it would flatter the comparison. Consider it separately as covering the cost of the move, not as income.",
      },
      {
        q: "What is the break-even CTC?",
        a: "The offer that leaves you with the same purchasing power you have today under the index you entered. Below it, the move reduces your real income even if the nominal number is higher — which is the situation this calculator exists to expose.",
      },
    ],
    reference: [
      {
        title: "The arithmetic",
        body: "Relative cost = new index ÷ current index. Real increase = offered ÷ relative cost − current. Break-even CTC = current × relative cost. All of it depends on the index you supply, which is why the index is an input.",
      },
    ],
    caveat:
      "The cost index is yours, not a published figure. QUICKKIT has no city cost database and does not invent one.",
  },
  {
    slug: "marginal-tax-rate",
    name: "Marginal Tax Rate Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "marginal-tax-rate",
    status: "live",
    description:
      "The tax on your next ₹10,000, versus your average rate — the number that answers what a bonus is actually worth.",
    keywords:
      "marginal tax rate calculator india average rate bonus tax slab next rupee new regime old regime",
    h1: "Marginal Tax Rate Calculator",
    seoTitle: "Marginal Tax Rate Calculator — Next Rupee Tax",
    seoDescription:
      "See the marginal rate on your next ₹10,000 of income against your average rate, so you can work out what a bonus or increment is actually worth after tax.",
    primaryKeyword: "marginal tax rate calculator",
    secondaryKeywords: [
      "average vs marginal tax rate",
      "tax on bonus india",
      "next rupee tax rate",
      "increment after tax",
      "slab rate calculator",
    ],
    researchId: "career-marginal-rate",
    alternativeTitles: [
      "Average vs Marginal Tax Rate Calculator",
      "Bonus Tax Worth Calculator",
    ],
    alternativeDescription:
      "Enter your salary to see how much of the next increment you keep, and how that compares with your overall tax rate for the year.",
    internalLinks: [
      "/tools/income-tax-calculator",
      "/tools/offer-comparison-calculator",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter your annual gross salary.",
      "Choose the regime you will file under.",
      "Add deductions if you are on the old regime.",
      "Compare the marginal rate with the average — the gap is why a raise feels smaller than it is.",
    ],
    faqs: [
      {
        q: "Why is my marginal rate higher than my average rate?",
        a: "Because income tax is progressive. Your average rate is total tax divided by total income, blending all the slabs. The marginal rate applies to the last rupee, which falls in your highest slab. A raise is taxed entirely at the marginal rate, which is why it never feels proportionate.",
      },
      {
        q: "Does this mean I could earn less by earning more?",
        a: "Only at the section 87A rebate boundary, where the rebate disappears entirely rather than tapering. Just above ₹12 lakh of taxable income under the new regime there is a step where a small increase triggers the full liability. Everywhere else, earning more always leaves you with more.",
      },
      {
        q: "Is a bonus taxed differently?",
        a: "No, it is taxed as part of your total income at your marginal rate. TDS in the bonus month may look high because it is calculated on a higher projected annual income, but the annual liability is what matters. A payment that looks heavily taxed often corrects when you file.",
      },
      {
        q: "How much of a ₹10,000 raise do I keep?",
        a: "Whatever is left after the marginal rate and cess. The calculator shows this directly, which is more useful than the percentage alone when you are deciding whether extra responsibility is worth a modest rise.",
      },
    ],
    reference: [
      {
        title: "How it is computed",
        body: "The annual tax is computed at your gross and again at gross plus ₹10,000, using the same regime and deductions. The difference divided by ₹10,000 is the marginal rate, including the 4% cess. The average rate is total tax divided by total gross.",
      },
    ],
    jurisdiction: "India",
    caveat:
      "Modelled on the same tax engine as the income tax calculator, with the same omission of surcharge and marginal relief.",
  },
  {
    slug: "notice-buyout-calculator",
    name: "Notice Buyout Calculator",
    categoryName: "Career & Jobs",
    subgroup: "salary",
    workspace: "job-search-kit",
    mode: "notice-buyout-calculator",
    status: "live",
    description:
      "The cost of leaving before your notice period completes, on the basic-plus-DA basis most contracts use rather than full gross.",
    keywords:
      "notice buyout calculator india notice period recovery salary basic da resignation early exit cost",
    h1: "Notice Buyout Calculator",
    seoTitle: "Notice Buyout Calculator — Early Exit Cost",
    seoDescription:
      "Work out what a short notice period costs: the per-day recovery on the basis your contract uses, the salary earned for days served, and the net effect.",
    primaryKeyword: "notice buyout calculator",
    secondaryKeywords: [
      "notice period recovery salary",
      "early resignation cost india",
      "notice pay calculation",
      "buyout notice period",
      "short notice deduction",
    ],
    researchId: "career-notice-buyout",
    alternativeTitles: [
      "Early Exit Notice Cost Calculator",
      "Notice Recovery Calculator",
    ],
    alternativeDescription:
      "Calculate the recovery for an unserved notice period and what you still earn for the days you did serve before you left the role.",
    internalLinks: [
      "/tools/notice-period-calculator",
      "/tools/full-and-final-settlement",
      "/tools/salary-calculator-india",
    ],
    steps: [
      "Enter the monthly gross and the monthly basic plus DA. They are used for different things.",
      "Set the notice period and the days you will serve.",
      "Choose the recovery basis — basic plus DA is the usual contractual one.",
      "Read the recovery amount, what you keep, and the net effect before you resign.",
    ],
    faqs: [
      {
        q: "Is recovery on gross or basic?",
        a: "Usually basic plus DA, which is why it is the default. Some contracts use gross, which makes the recovery considerably larger. Check your appointment letter rather than assuming — the difference on a ₹60,000 gross with ₹28,000 basic is more than double.",
      },
      {
        q: "Can my employer deduct this without my agreement?",
        a: "Only if the contract provides for it and it is limited to the actual shortfall. A unilateral deduction with no contractual basis is recoverable. The calculator does the arithmetic; whether a deduction is lawful is a separate question that depends on your contract.",
      },
      {
        q: "Will my new employer reimburse a buyout?",
        a: "Sometimes, and it is always contractual. Get the commitment in writing before you resign, because it is rarely offered afterwards. The calculator shows you the amount to ask for.",
      },
      {
        q: "What is the difference between a buyout and garden leave?",
        a: "A buyout means you pay for notice you do not serve. Garden leave means you are paid but not required to work for the notice period. They are different arrangements with different tax and legal consequences, and employers usually prefer one for their own reasons.",
      },
    ],
    reference: [
      {
        title: "The arithmetic",
        body: "Recovery per day = monthly basic plus DA (or gross, if chosen) ÷ working days. Recovery = per day × shortfall days. Earned for days served = monthly gross ÷ working days × days served. Net effect = earned − recovery.",
      },
    ],
    caveat:
      "Arithmetic only. Whether a buyout is recoverable at all depends on your contract, which this tool does not read.",
  },
  {
    slug: "notice-period-calculator",
    name: "Notice Period Calculator",
    categoryName: "Career & Jobs",
    subgroup: "timeline",
    workspace: "career-text-kit",
    mode: "notice-period-calculator",
    status: "live",
    description:
      "Last working day from a resignation date, counting business days and skipping weekends and holidays you declare.",
    keywords:
      "notice period calculator india last working day resignation date business days holidays 30 60 90 days",
    h1: "Notice Period Calculator",
    seoTitle: "Notice Period Calculator — Last Working Day",
    seoDescription:
      "Calculate the last working day from a resignation date and notice period, counting business days and skipping weekends and any holidays you list.",
    primaryKeyword: "notice period calculator",
    secondaryKeywords: [
      "last working day calculator",
      "resignation date notice period",
      "60 day notice calculation",
      "notice period business days",
      "relieving date india",
    ],
    researchId: "career-notice-period",
    alternativeTitles: [
      "Last Working Day Calculator",
      "Resignation Notice Date Calculator",
    ],
    alternativeDescription:
      "Work out the last working day from a resignation date, with weekends and your own declared holidays skipped in the count.",
    internalLinks: [
      "/tools/notice-buyout-calculator",
      "/tools/working-days-calculator",
      "/tools/full-and-final-settlement",
      "/tools/experience-calculator",
    ],
    steps: [
      "Enter the resignation date.",
      "Enter the notice period in business days.",
      "List any holidays in the period.",
      "Read the last working day and confirm it in writing with your employer.",
    ],
    faqs: [
      {
        q: "Should the count be calendar days or business days?",
        a: "It depends on your contract. Many state calendar days, which is shorter in practice; some count working days. This tool counts business days, skipping weekends and your declared holidays, because that matches how most Indian employers compute it — but check the letter.",
      },
      {
        q: "Does the resignation date count as day one?",
        a: "Usually not — the notice runs from the day after resignation. The tool starts counting from the following day, which is the common convention.",
      },
      {
        q: "What if I resign before a declared holiday period?",
        a: "Holidays inside the notice period are skipped if you list them, which pushes the last working day later. That is why declaring them matters: an unlisted holiday can silently shorten the notice and create a shortfall you did not intend.",
      },
      {
        q: "Is the calculated date binding?",
        a: "No. The date only becomes binding when it is recorded in writing, usually in the resignation acceptance. The calculation helps you propose a date; the acceptance is what makes it real.",
      },
    ],
    reference: [
      {
        title: "How the date is computed",
        body: "Starting from the day after the resignation date, each day is checked: weekends and listed holidays are skipped, and every other day counts toward the notice. The date on which the count completes is the last working day.",
      },
    ],
  },
  {
    slug: "experience-calculator",
    name: "Experience Calculator",
    categoryName: "Career & Jobs",
    subgroup: "timeline",
    workspace: "career-text-kit",
    mode: "experience-calculator",
    status: "live",
    description:
      "Total experience from employment date ranges, merging overlapping roles so concurrent work is not double counted, with gaps listed.",
    keywords:
      "experience calculator total years months employment history dates overlapping roles gaps resume india",
    h1: "Experience Calculator",
    seoTitle: "Experience Calculator — Total Years from Dates",
    seoDescription:
      "Add up total experience from employment date ranges, with overlapping roles merged so concurrent work is not double counted, and gaps over two months listed.",
    primaryKeyword: "experience calculator",
    secondaryKeywords: [
      "total work experience calculation",
      "years of experience from dates",
      "employment gap calculator",
      "overlapping jobs experience",
      "resume total experience",
    ],
    researchId: "career-experience",
    alternativeTitles: [
      "Work Experience Duration Calculator",
      "Total Years of Service Calculator",
    ],
    alternativeDescription:
      "Enter each role's dates to get total experience, with concurrent roles merged so nothing is double counted and gaps surfaced.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/notice-period-calculator",
      "/tools/working-days-calculator",
    ],
    steps: [
      "Enter each role's start date, and end date or leave it blank for the current role.",
      "Read the merged total — overlapping roles count once.",
      "Check the gaps of two months or more, which you may need to explain.",
      "Use the formatted total on your résumé rather than rounding up.",
    ],
    faqs: [
      {
        q: "Why does it merge overlapping roles?",
        a: "Because you cannot have two full-time jobs at once, and adding them would overstate your experience. Merging gives the calendar span of your career rather than the sum of months worked. For genuine part-time or concurrent consulting, the merged figure is still the honest one.",
      },
      {
        q: "Should I round up to the next year on my résumé?",
        a: "No. A recruiter checks dates and an inflated figure is a credibility problem at the exact moment you want to be trusted. State the real figure — 4 years 7 months can honestly be written as 4 years, or as 4.5 if the format allows.",
      },
      {
        q: "Do gaps matter?",
        a: "Less than people fear, but they do come up. The tool lists gaps of two months or more so they are not a surprise in the interview. A rehearsed honest answer is worth far more than hiding the gap.",
      },
      {
        q: "How are partial months handled?",
        a: "Each range counts inclusive of both its start and end month, which is the convention recruiters use. That avoids losing a month per role and keeps the total comparable to what an employer would compute.",
      },
    ],
    reference: [
      {
        title: "How it is computed",
        body: "Each date range becomes inclusive start and end months. Ranges are sorted and merged where they overlap or touch, and the merged spans are summed. Gaps are the spans between consecutive merged ranges, counted exclusive of the boundary months.",
      },
    ],
  },
  // ──────────────────────────────────────────────── Career · Application
  {
    slug: "cover-letter-generator",
    name: "Cover Letter Generator",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "cover-letter-generator",
    status: "live",
    description:
      "A four-paragraph cover letter built from your own facts, with a visible placeholder where the one thing only you can write is missing.",
    keywords:
      "cover letter generator india format job application letter why this company achievement skills professional",
    h1: "Cover Letter Generator",
    seoTitle: "Cover Letter Generator — Four-Paragraph Format",
    seoDescription:
      "Draft a cover letter from your role, achievement and reason for applying, with every claim yours and a placeholder where the specific motivation is missing.",
    primaryKeyword: "cover letter generator",
    secondaryKeywords: [
      "cover letter format india",
      "job application letter template",
      "cover letter with achievement",
      "why this company cover letter",
      "application letter for job",
    ],
    researchId: "career-cover-letter",
    alternativeTitles: [
      "Job Application Letter Builder",
      "Cover Letter Draft Generator",
    ],
    alternativeDescription:
      "Assemble a one-page cover letter from your own details, with the structure and the gaps that need your own words visible.",
    internalLinks: [
      "/tools/resume-ats-checker",
      "/tools/follow-up-generator",
      "/tools/availability-statement",
    ],
    steps: [
      "Enter your name, contact line and the role and company.",
      "Write why this company specifically — the one sentence only you can write.",
      "Add your strongest relevant achievement, with a number if you have one.",
      "List the skills the posting asks for that you genuinely have, then copy the draft.",
    ],
    faqs: [
      {
        q: "Why is the why-this-company sentence left to me?",
        a: "Because a generated reason is indistinguishable from the one sent to the other sixty companies that candidate applied to, and hiring managers recognise it immediately. If you cannot fill it in, that is useful information — the application may not be worth sending yet.",
      },
      {
        q: "Are cover letters still read?",
        a: "Sometimes, and selectively. They matter most when there is a specific reason for the move, a gap to explain, or a referral. A generic one is skimmed and forgotten; a specific one can be decisive. That is why the tool refuses to write the generic part for you.",
      },
      {
        q: "How long should it be?",
        a: "One page, four paragraphs, about 250 to 350 words. The structure here is application, evidence, fit and close, which survives being skimmed because each paragraph does one job.",
      },
      {
        q: "Should I repeat my résumé in the letter?",
        a: "No. The letter should add the context the résumé cannot: why this role, why now, and the one achievement most relevant to this posting. Restating the résumé wastes the reader's time and yours.",
      },
    ],
    reference: [
      {
        title: "The four paragraphs",
        body: "What you are applying for and how you found it; the evidence — your most relevant achievement with a number; why this company and how your skills fit what they asked for; and a close that proposes a conversation. Anything left blank appears as a visible placeholder.",
      },
    ],
  },
  {
    slug: "follow-up-generator",
    name: "Follow-Up Message Generator",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "follow-up-generator",
    status: "live",
    description:
      "Follow-up messages for after an interview, after a final round, or after silence — each designed to be easy to answer.",
    keywords:
      "follow up email after interview generator job application no response thank you message recruiter",
    h1: "Follow-Up Message Generator",
    seoTitle: "Follow Up Email Generator — After Interview",
    seoDescription:
      "Draft a follow-up after an interview, a final round or silence on an application, each written to be brief and easy for a busy person to answer.",
    primaryKeyword: "follow up email generator",
    secondaryKeywords: [
      "thank you email after interview",
      "job application follow up",
      "no response follow up email",
      "post interview message template",
      "recruiter follow up",
    ],
    researchId: "career-follow-up",
    alternativeTitles: [
      "Interview Thank-You Message Builder",
      "Application Follow-Up Generator",
    ],
    alternativeDescription:
      "Produce a short, specific follow-up for the situation you are in, with the one detail that makes it recognisably yours to the reader.",
    internalLinks: [
      "/tools/cover-letter-generator",
      "/tools/interview-prep-plan",
      "/tools/star-answer-builder",
    ],
    steps: [
      "Choose the situation — after an interview, after a final round, or no response.",
      "Add the interviewer's name, the company and the role.",
      "Include one specific detail from the conversation.",
      "Copy the draft and send it once.",
    ],
    faqs: [
      {
        q: "How soon should I follow up?",
        a: "Within 24 hours after an interview, while the conversation is fresh. For silence on an application, about a week after the stated timeline has passed — or two weeks if no timeline was given. Following up sooner reads as anxious.",
      },
      {
        q: "How many times should I follow up?",
        a: "Once. A second unanswered message rarely helps and often damages your standing. If there is no reply, treat it as an answer and move on. The tool says this explicitly because over-following-up is a common mistake.",
      },
      {
        q: "Should I add something new or just repeat my thanks?",
        a: "Add something, however small — a thought on a problem discussed, a relevant piece of work. A message that only says thank you is polite but adds nothing to their decision.",
      },
      {
        q: "Can a follow-up change the outcome?",
        a: "Occasionally, at the margin, when a decision is close. Mostly it confirms interest and leaves a good final impression. Do it because it is correct, not because you expect it to reverse a rejection.",
      },
    ],
    reference: [
      {
        title: "The three situations",
        body: "After an interview: thank, add one specific thing, ask about next steps. After a final round: thank, restate interest, confirm availability. No response: brief, non-accusatory, easy to answer with one line.",
      },
    ],
  },
  {
    slug: "star-answer-builder",
    name: "STAR Answer Builder",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "star-answer-builder",
    status: "live",
    description:
      "Structure a behavioural interview answer, with checks for a missing metric, a short action block and an answer that says we instead of I.",
    keywords:
      "star answer builder interview behavioural questions situation task action result competency preparation",
    h1: "STAR Answer Builder",
    seoTitle: "STAR Answer Builder — Behavioural Interview Prep",
    seoDescription:
      "Structure a behavioural answer into situation, task, action and result, with checks for a missing metric, a thin action block and a team-only story.",
    primaryKeyword: "star answer builder",
    secondaryKeywords: [
      "star method interview answers",
      "behavioural interview preparation",
      "situation task action result",
      "competency answer structure",
      "interview story builder",
    ],
    researchId: "career-star",
    alternativeTitles: [
      "Behavioural Answer Structurer",
      "STAR Method Practice Tool",
    ],
    alternativeDescription:
      "Turn one experience into a structured answer, with the gaps a strong answer cannot have flagged for you before the interview.",
    internalLinks: [
      "/tools/interview-prep-plan",
      "/tools/follow-up-generator",
      "/tools/resume-bullet-improver",
    ],
    steps: [
      "Describe the situation in two sentences.",
      "State your specific task, not the team's.",
      "Write the action in first person, in order.",
      "Add the result with a number, then re-read it aloud — it should take about 90 seconds.",
    ],
    faqs: [
      {
        q: "Why does it flag the word we?",
        a: "Because the interview is assessing you. An answer where the team did everything tells the interviewer nothing about what you would do in the role. State your part specifically and credit the team separately — that reads as both competent and honest.",
      },
      {
        q: "How long should a STAR answer be?",
        a: "About 90 seconds. The situation and task take twenty, the action takes forty, and the result takes thirty. Answers that spend two minutes on the situation never reach the part that matters.",
      },
      {
        q: "Does the result have to be a number?",
        a: "Preferably, even approximately — and say it is approximate. Time saved, volume handled, error rate reduced, team size. Without any quantification, the answer is a description of activity rather than evidence of impact.",
      },
      {
        q: "Should I use the same story for different questions?",
        a: "You can, if it genuinely answers both — some stories show ownership and collaboration at once. Reusing one story for every question is obvious and suggests a thin set of experiences. Two or three well-prepared stories cover most competency questions.",
      },
    ],
    reference: [
      {
        title: "The checks",
        body: "All four blocks present, the action block at least twelve words, the result containing a number, and the action not dominated by we or the team. Each finding names the block it applies to.",
      },
    ],
  },
  {
    slug: "linkedin-about-generator",
    name: "LinkedIn About Generator",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "linkedin-about-generator",
    status: "live",
    description:
      "A LinkedIn About section in four short paragraphs from your role, focus and one achievement, with placeholders where proof is missing.",
    keywords:
      "linkedin about generator summary section profile india professional headline achievement job search",
    h1: "LinkedIn About Generator",
    seoTitle: "LinkedIn About Generator — Profile Summary",
    seoDescription:
      "Draft a LinkedIn About section from your role, focus areas and one achievement, with placeholders for the proof and the direction that only you can supply.",
    primaryKeyword: "linkedin about generator",
    secondaryKeywords: [
      "linkedin summary examples",
      "linkedin profile about section",
      "linkedin headline for job search",
      "professional bio generator",
      "linkedin optimization india",
    ],
    researchId: "career-linkedin",
    alternativeTitles: [
      "LinkedIn Summary Draft Builder",
      "Professional Bio Generator",
    ],
    alternativeDescription:
      "Produce an About section with your role, focus areas and one proof point, structured so a recruiter can skim it in ten seconds.",
    internalLinks: [
      "/tools/resume-summary-generator",
      "/tools/cover-letter-generator",
      "/tools/resume-ats-checker",
    ],
    steps: [
      "Enter your role and years of experience.",
      "List two or three areas of focus.",
      "Add one concrete achievement — this is the sentence recruiters read twice.",
      "State what you are looking for next, then copy the draft.",
    ],
    faqs: [
      {
        q: "Why does the achievement matter more than the rest?",
        a: "Because it is the only sentence that distinguishes you from the thousands of profiles with the same job title. A role and a skills list are a template; a specific outcome with a number is evidence.",
      },
      {
        q: "Should I say I am looking for opportunities?",
        a: "Yes, and be specific about what kind. Being precise about the role, the problem space or a constraint filters out the wrong conversations before they start. Open to opportunities tells a recruiter nothing.",
      },
      {
        q: "Does the About section affect search on LinkedIn?",
        a: "It contributes to how you appear in LinkedIn's own search, along with your headline and skills. That is a reason to use the words your target roles use — but writing for a person still matters more than writing for the search box.",
      },
      {
        q: "How long should it be?",
        a: "Three or four short paragraphs. LinkedIn truncates after roughly three lines before the see more link, so the first sentence has to earn the click.",
      },
    ],
    reference: [
      {
        title: "The structure",
        body: "Paragraph one: role, experience and focus areas. Paragraph two: one achievement. Paragraph three: what you are looking for. Paragraph four: how to reach you. Missing proof or direction appears as a visible placeholder.",
      },
    ],
  },
  {
    slug: "interview-prep-plan",
    name: "Interview Prep Plan",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "interview-prep-plan",
    status: "live",
    description:
      "A preparation plan by interview stage — the research to do, the stories to rehearse and the questions worth asking.",
    keywords:
      "interview preparation plan india screening technical manager final round questions to ask research company",
    h1: "Interview Prep Plan",
    seoTitle: "Interview Preparation Plan — By Stage",
    seoDescription:
      "Build a preparation plan for a screening, technical, manager or final interview: what to research, what to rehearse and which questions are worth asking.",
    primaryKeyword: "interview preparation plan",
    secondaryKeywords: [
      "interview questions to ask employer",
      "technical interview preparation",
      "final round interview tips",
      "company research before interview",
      "interview checklist job seeker",
    ],
    researchId: "career-interview-prep",
    alternativeTitles: [
      "Interview Preparation Checklist",
      "Stage-by-Stage Interview Plan",
    ],
    alternativeDescription:
      "Get a focused plan for the specific interview stage you are facing, rather than an undifferentiated list of fifty questions.",
    internalLinks: [
      "/tools/star-answer-builder",
      "/tools/interview-plan-generator",
      "/tools/follow-up-generator",
    ],
    steps: [
      "Enter the role, the company and the interview stage.",
      "Add the areas you feel least confident about.",
      "Work through the research and rehearsal items.",
      "Prepare two or three questions from the ask-them list and use them.",
    ],
    faqs: [
      {
        q: "Why is the plan different by stage?",
        a: "Because a recruiter screening and a hiring manager deciding are assessing different things. Screening is about fit, logistics and money; technical is about capability; a manager round is about how you work with people; a final round is about whether you are certain. One generic plan ignores all of that.",
      },
      {
        q: "How many questions should I prepare to ask?",
        a: "Two or three, chosen for that stage. Asking nothing suggests indifference; asking twelve uses time the interviewer wanted to spend assessing you.",
      },
      {
        q: "What is the best question to ask?",
        a: '"What would make you not hire me, and is there anything I can address now?" It is direct, it gives you a chance to correct a misimpression, and the answer tells you what they actually care about. It is in the list.',
      },
      {
        q: "Should I rehearse answers word for word?",
        a: "Memorise the structure and the key facts, not a script. A rehearsed monologue sounds rehearsed and cannot adapt to the follow-up. Two or three stories you know well beat twenty half-remembered ones.",
      },
    ],
    reference: [
      {
        title: "What is in each plan",
        body: "Research on the company — what it sells, a recent change, one question that proves you read past the homepage. Stage-specific preparation. A list of questions worth asking. Plus, where you named weak areas, one honest example and one thing you are doing about each.",
      },
    ],
  },
  {
    slug: "availability-statement",
    name: "Availability Statement",
    categoryName: "Career & Jobs",
    subgroup: "application",
    workspace: "career-text-kit",
    mode: "availability-statement",
    status: "live",
    description:
      "A one-line availability statement generated from your real notice terms, including buyout, so it is accurate before you send it.",
    keywords:
      "availability statement job application notice period immediate joiner buyout sentence resume cover letter",
    h1: "Availability Statement",
    seoTitle: "Availability Statement — Notice Period Sentence",
    seoDescription:
      "Generate an accurate availability sentence from your real notice period, including buyout options, so you do not promise a start date you cannot actually meet.",
    primaryKeyword: "availability statement",
    secondaryKeywords: [
      "notice period in resume",
      "immediate joiner statement",
      "availability for job application",
      "buyout notice clause",
      "joining date commitment",
    ],
    researchId: "career-availability",
    alternativeTitles: [
      "Notice Period Statement Generator",
      "Joining Availability Sentence",
    ],
    alternativeDescription:
      "Turn your actual notice terms into one accurate sentence for an application or for a recruiter conversation about joining the role.",
    internalLinks: [
      "/tools/notice-period-calculator",
      "/tools/notice-buyout-calculator",
      "/tools/cover-letter-generator",
    ],
    steps: [
      "Enter your notice period in days.",
      "Choose whether you will serve it, buy it out or are available immediately.",
      "Say whether the period is negotiable.",
      "Copy the sentence into your application.",
    ],
    faqs: [
      {
        q: "Why does this matter so much?",
        a: "Because saying immediate when you have a 90-day notice wastes the recruiter's time and damages your credibility when it emerges. Recruiters deal with this constantly and will ask. Stating the real position accurately, including a buyout if it is genuinely available, is more attractive than an implausible claim.",
      },
      {
        q: "Should I offer a buyout if I am not sure I can?",
        a: "No. A buyout requires your current employer's agreement and the money to fund it. Promising one you cannot complete is worse than an honest start date, because the offer may already have been made on that basis.",
      },
      {
        q: "Where does the statement go?",
        a: "At the end of a cover letter, in the header of a résumé if space allows, or in the first recruiter conversation. The sentence works in all three.",
      },
    ],
    reference: [
      {
        title: "The three forms",
        body: "Immediate: available to start immediately. Serving notice: the notice length, whether it is negotiable, and that it will be served in full. Buyout: the notice length, that it can be bought out, and the roughly calculated joining window — subject to the current employer releasing you.",
      },
    ],
  },
];

// Planned tools are listed so the directory can be honest about what is not
// built yet, but they are never routed, never indexed and never counted as live.
export const plannedTools: LaunchTool[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────────────────────

/** Every declaration in a category, in declaration order. */
export function launchToolsByCategory(
  categorySlug: LaunchCategorySlug,
): LaunchTool[] {
  const category = launchCategories.find(
    (entry) => entry.slug === categorySlug,
  );
  if (!category) return [];
  return launchTools.filter((tool) => tool.categoryName === category.name);
}

/** Look a tool up by slug. Returns `undefined` for anything not routed. */
export function launchToolBySlug(slug: string): LaunchTool | undefined {
  return launchTools.find((tool) => tool.slug === slug);
}

/** The category a tool belongs to, resolved through its `categoryName`. */
export function launchCategoryForTool(
  tool: LaunchTool,
): LaunchCategory | undefined {
  return launchCategories.find(
    (category) => category.name === tool.categoryName,
  );
}

/** Every live slug, used by `generateStaticParams`. */
export const launchToolSlugs: string[] = launchTools
  .filter((tool) => tool.status === "live")
  .map((tool) => tool.slug);
