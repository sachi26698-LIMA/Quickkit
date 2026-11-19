import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Career & jobs cluster.
 *
 * The claim that matters most here is the ATS one: no applicant tracking system
 * publishes its algorithm, so none of these phrasings says "your score at
 * Workday" or "guaranteed shortlist". `resume-ats-checker` measures things that
 * are actually observable in the text — section headings, contact details,
 * quantified bullets, keyword coverage against a pasted job description — and
 * its keywords say exactly that.
 *
 * - No keyword claims a job, an interview or a recruiter's decision.
 * - No keyword claims a live salary benchmark; QUICKKIT has no salary data feed
 *   and the offer tools are arithmetic on figures the user enters.
 * - The letter and answer tools assemble text from entered facts, so nothing
 *   says "AI writer".
 * - `notice-period-calculator` counts business days, so "business days" is used
 *   rather than "calendar days".
 *
 * The `india` group is substantial: CTC, in-hand and notice-period vocabulary
 * is genuinely how this category is searched in India.
 */
export const careerKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "resume-ats-checker",
    primary: "resume ats checker",
    secondary: [
      "ats resume score india",
      "resume readiness check",
      "resume for job description match",
      "ats friendly resume format",
      "resume parseability check",
    ],
    groups: {
      alternativeName: ["cv checker", "resume review tool"],
      synonym: [
        "how well a résumé parses",
        "résumé structure review",
        "check a cv against a role",
      ],
      action: [
        "check a résumé for ats readability",
        "score a résumé against a job description",
        "find blocking issues in a cv",
      ],
      longTail: [
        "ats check against a specific job description",
        "why my résumé gets no callbacks",
        "résumé sections an ats can parse",
        "quantified bullets in a résumé check",
      ],
      problem: [
        "applications sent but no responses",
        "résumé rejected before a human reads it",
        "not sure why a cv is being filtered",
      ],
      question: [
        "what is an ats resume check",
        "can a website know my ats score",
        "what makes a résumé ats friendly",
      ],
      qualifier: [
        "free ats resume checker",
        "cv check no signup",
        "browser résumé review",
      ],
      india: [
        "resume ats check kaise kare",
        "naukri ke liye resume check",
        "cv ats score india",
      ],
    },
  },
  {
    slug: "resume-keyword-matcher",
    primary: "resume keyword matcher",
    secondary: [
      "job description keyword match",
      "resume skills gap analysis",
      "ats keyword optimization",
      "tailor resume to job",
      "missing keywords resume",
    ],
    groups: {
      alternativeName: ["keyword comparison tool", "cv match checker"],
      synonym: [
        "how much of a posting a résumé covers",
        "term coverage between cv and jd",
        "skill keywords missing from a résumé",
      ],
      action: [
        "compare a résumé against a job description",
        "find keywords missing from a cv",
        "tailor a résumé to a posting",
      ],
      longTail: [
        "keywords a résumé is missing for a role",
        "how to tailor a résumé to one posting",
        "coverage percentage between cv and jd",
        "skills named in a job description but not a cv",
      ],
      problem: [
        "same résumé sent to every job",
        "not sure which skills a posting emphasises",
        "cv looks relevant but is never shortlisted",
      ],
      question: [
        "how many keywords should a résumé contain",
        "should i copy the job description wording",
        "what if i am missing a required skill",
      ],
      qualifier: [
        "free resume keyword matcher",
        "cv keyword tool no signup",
        "browser keyword match",
      ],
      india: [
        "resume keyword match kaise kare",
        "jd ke hisaab se resume",
        "cv keywords india",
      ],
    },
  },
  {
    slug: "resume-bullet-improver",
    primary: "resume bullet improver",
    secondary: [
      "action verbs for resume",
      "responsible for resume fix",
      "quantify resume achievements",
      "cv bullet points rewrite",
      "resume impact statements",
    ],
    groups: {
      alternativeName: ["bullet rewriter", "cv line improver"],
      synonym: [
        "rewrite a résumé line with a verb",
        "turn duties into achievements",
        "sharpen cv bullet points",
      ],
      action: [
        "rewrite résumé bullets with action verbs",
        "find bullets without a number",
        "replace responsible for phrasing",
      ],
      longTail: [
        "rewrite responsible for bullets on a resume",
        "how to add numbers to résumé bullets",
        "action verb alternatives for managed",
        "résumé bullet length that reads well",
      ],
      problem: [
        "bullets describe duties not outcomes",
        "every line starts with the same verb",
        "no numbers available to quantify work",
      ],
      question: [
        "should every résumé bullet have a number",
        "how long should a résumé bullet be",
        "what verbs work best on a cv",
      ],
      qualifier: [
        "free resume bullet improver",
        "cv rewriter no signup",
        "browser bullet tool",
      ],
      india: [
        "resume bullet kaise improve kare",
        "cv mein achievement kaise likhe",
      ],
    },
  },
  {
    slug: "resume-summary-generator",
    primary: "resume summary generator",
    secondary: [
      "professional summary for resume",
      "resume profile statement",
      "summary for fresher resume",
      "career objective generator",
      "resume introduction paragraph",
    ],
    groups: {
      alternativeName: ["profile summary tool", "résumé intro writer"],
      synonym: [
        "opening paragraph for a cv",
        "career objective draft",
        "personal statement for a résumé",
      ],
      action: [
        "generate a professional summary",
        "write a résumé opening paragraph",
        "draft a career objective",
      ],
      longTail: [
        "professional summary for an experienced candidate",
        "résumé summary for a fresher with no experience",
        "two sentence summary at the top of a cv",
        "summary that names one achievement",
      ],
      problem: [
        "summary reads like a job description",
        "no idea what to write at the top of a cv",
        "profile full of words like passionate",
      ],
      question: [
        "do i need a summary on my résumé",
        "how long should a professional summary be",
        "what should a fresher write in a summary",
      ],
      qualifier: [
        "free resume summary generator",
        "profile statement tool no signup",
        "browser summary builder",
      ],
      india: ["resume summary kaise likhe", "cv profile india"],
    },
  },
  {
    slug: "resume-comparison",
    primary: "resume comparison",
    secondary: [
      "compare two resumes",
      "cv version comparison",
      "resume improvement measure",
      "resume score difference",
      "which resume is better",
    ],
    groups: {
      alternativeName: ["cv comparison tool", "résumé diff checker"],
      synonym: [
        "two versions of a résumé side by side",
        "what changed between two cvs",
        "version comparison for a résumé",
      ],
      action: [
        "compare two résumé versions",
        "find what changed between cvs",
        "measure whether a rewrite improved",
      ],
      longTail: [
        "compare an old and new résumé for the same role",
        "did my résumé rewrite actually improve",
        "which of two cv versions is stronger",
        "words added and removed between two drafts",
      ],
      problem: [
        "a rewrite feels better but is not",
        "cutting to two pages lost content",
        "two versions of a cv and no clear winner",
      ],
      question: [
        "how do i know if my résumé improved",
        "can i compare two résumés",
        "what should change between cv versions",
      ],
      qualifier: [
        "free resume comparison tool",
        "cv diff no signup",
        "browser résumé compare",
      ],
      india: ["do resume compare kaise kare", "resume version india"],
    },
  },
  {
    slug: "salary-converter",
    primary: "salary converter",
    secondary: [
      "annual to hourly calculator",
      "monthly to annual salary",
      "per day rate conversion",
      "salary per hour india",
      "ctc conversion tool",
    ],
    groups: {
      alternativeName: ["pay period converter", "wage converter"],
      synonym: [
        "convert a monthly figure to annual",
        "hourly rate from an annual salary",
        "salary expressed per day",
      ],
      action: [
        "convert a salary between periods",
        "turn an annual figure into hourly",
        "work out a daily rate from monthly pay",
      ],
      longTail: [
        "annual salary to hourly with forty hour week",
        "monthly salary to annual ctc",
        "daily rate from an annual package",
        "hours per year for an hourly rate",
      ],
      problem: [
        "offers quoted in different periods",
        "hourly figure differs from what was expected",
        "not sure what a fair daily rate is",
      ],
      question: [
        "how many hours are in a working year",
        "is a monthly salary divided by twenty two a day rate",
        "how do i compare a day rate with a salary",
      ],
      qualifier: [
        "free salary converter",
        "pay period calculator no signup",
        "browser salary conversion",
      ],
      india: [
        "salary convert kaise kare",
        "monthly se annual salary",
        "per day rate india",
      ],
    },
  },
  {
    slug: "contractor-rate-calculator",
    primary: "contractor rate calculator",
    secondary: [
      "day rate to salary india",
      "freelance rate calculation",
      "contractor vs employee pay",
      "consulting day rate",
      "billed days per year",
    ],
    groups: {
      alternativeName: ["day rate calculator", "freelance rate tool"],
      synonym: [
        "consulting rate equivalent to a salary",
        "contract rate from an annual package",
        "freelance day rate from a ctc",
      ],
      action: [
        "calculate an equivalent contractor day rate",
        "compare a day rate with a salaried ctc",
        "work out billed days in a year",
      ],
      longTail: [
        "day rate equivalent to a 20 lakh salary",
        "how many days a contractor bills per year",
        "contractor rate including benefits and leave",
        "consulting day rate for an indian market",
      ],
      problem: [
        "day rate sounds high but the year is short",
        "not sure what loading to add",
        "contracting pays less than expected",
      ],
      question: [
        "how do i set a consulting day rate",
        "should a day rate include tax",
        "how many billable days are realistic",
      ],
      qualifier: [
        "free contractor rate calculator",
        "freelance rate tool no signup",
        "browser day rate calculator",
      ],
      india: [
        "contract rate kaise nikale",
        "freelance day rate india",
        "consulting charges india",
      ],
    },
  },
  {
    slug: "offer-comparison-calculator",
    primary: "offer comparison calculator",
    secondary: [
      "salary hike after tax india",
      "ctc comparison take home",
      "job switch salary calculator",
      "increment take home difference",
      "negotiation salary calculator",
    ],
    groups: {
      alternativeName: ["offer comparator", "hike calculator"],
      synonym: [
        "two offers compared after deductions",
        "what a hike means in hand",
        "take home difference between two ctcs",
      ],
      action: [
        "compare two job offers after tax",
        "calculate take home on a new ctc",
        "work out a hike in hand money",
      ],
      longTail: [
        "thirty percent hike after tax in india",
        "two offers with different ctc compared",
        "how much of a hike is actually in hand",
        "offer comparison including pf and professional tax",
      ],
      problem: [
        "hike looks large but in hand barely moves",
        "two offers, unsure which pays more monthly",
        "negotiating without knowing the take home",
      ],
      question: [
        "is a thirty percent hike really thirty percent",
        "how much of a raise survives tax",
        "should i compare offers on ctc or in hand",
      ],
      qualifier: [
        "free offer comparison calculator",
        "hike calculator no signup",
        "browser offer comparison",
      ],
      india: [
        "offer compare kaise kare",
        "hike ke baad in hand kitna",
        "job switch salary india",
      ],
    },
  },
  {
    slug: "total-compensation-calculator",
    primary: "total compensation calculator",
    secondary: [
      "ctc breakdown with bonus",
      "joining bonus clawback",
      "equity annualised compensation",
      "year one total compensation",
      "package comparison offer",
    ],
    groups: {
      alternativeName: ["compensation builder", "package calculator"],
      synonym: [
        "everything an offer is worth in a year",
        "fixed plus variable plus equity",
        "annual value of a package",
      ],
      action: [
        "add up total compensation from components",
        "separate year one from steady state",
        "work out a joining bonus clawback",
      ],
      longTail: [
        "year one versus second year compensation",
        "joining bonus clawback if i leave early",
        "annualised value of a four year equity grant",
        "variable pay prorated in the first year",
      ],
      problem: [
        "offer quoted with a one off bonus",
        "variable pay rarely pays out in full",
        "equity counted as cash in the headline",
      ],
      question: [
        "what counts as total compensation",
        "is a joining bonus part of ctc",
        "how should equity be valued in an offer",
      ],
      qualifier: [
        "free total compensation calculator",
        "package calculator no signup",
        "browser compensation tool",
      ],
      india: [
        "total compensation kaise nikale",
        "package breakup india offer",
        "joining bonus india",
      ],
    },
  },
  {
    slug: "equity-vesting-calculator",
    primary: "equity vesting calculator",
    secondary: [
      "esop value calculator",
      "rsu vesting schedule",
      "stock option spread",
      "cliff vesting india",
      "startup equity worth",
    ],
    groups: {
      alternativeName: ["esop calculator", "vesting schedule tool"],
      synonym: [
        "value of a stock grant over time",
        "how much equity has vested",
        "option spread at a fair market value",
      ],
      action: [
        "calculate the value of vested esops",
        "work out a vesting schedule with a cliff",
        "check whether options are underwater",
      ],
      longTail: [
        "esop value after two years of a four year grant",
        "cliff vesting for twelve months india",
        "what happens to unvested options on resignation",
        "option spread when strike equals fmv",
      ],
      problem: [
        "equity offered but the value is unclear",
        "not sure what a cliff means in practice",
        "options worth nothing at current fmv",
      ],
      question: [
        "what is the difference between rsus and esops",
        "what happens to unvested equity if i quit",
        "is equity value real money",
      ],
      qualifier: [
        "free esop calculator",
        "vesting calculator no signup",
        "browser equity tool",
      ],
      india: [
        "esop value kaise nikale",
        "startup equity india",
        "stock options india tax note",
      ],
    },
  },
  {
    slug: "relocation-calculator",
    primary: "relocation calculator",
    secondary: [
      "cost of living salary comparison india",
      "city salary adjustment",
      "relocation salary break even",
      "moving city job salary",
      "purchasing power comparison",
    ],
    groups: {
      alternativeName: ["cost of living tool", "city comparison calculator"],
      synonym: [
        "what an offer is worth in another city",
        "real pay after a move",
        "break even salary for relocation",
      ],
      action: [
        "compare two salaries across cities",
        "work out a break even ctc for a move",
        "adjust an offer for cost of living",
      ],
      longTail: [
        "break even salary moving to a costlier city",
        "is a move worth it after higher rent",
        "cost index for a relocation decision",
        "offer in a new city compared with current pay",
      ],
      problem: [
        "offer higher but rent eats the difference",
        "not sure if a relocation is a raise",
        "cost of living data is unreliable",
      ],
      question: [
        "how do i compare salaries across cities",
        "what is a realistic cost index",
        "should a relocation allowance count as income",
      ],
      qualifier: [
        "free relocation calculator",
        "cost of living tool no signup",
        "browser city comparison",
      ],
      india: [
        "city change salary compare",
        "relocation ke baad salary",
        "rent ke saath salary india",
      ],
    },
  },
  {
    slug: "marginal-tax-rate",
    primary: "marginal tax rate calculator",
    secondary: [
      "average vs marginal tax rate",
      "tax on bonus india",
      "next rupee tax rate",
      "increment after tax",
      "slab rate calculator",
    ],
    groups: {
      alternativeName: ["marginal rate tool", "next rupee calculator"],
      synonym: [
        "tax on the last part of income",
        "rate applied to extra income",
        "how much of a bonus is taxed",
      ],
      action: [
        "calculate the marginal rate on a raise",
        "compare marginal with average tax",
        "work out take home on a bonus",
      ],
      longTail: [
        "marginal rate at twelve lakh income",
        "how much tax on a one lakh bonus",
        "why average rate is lower than marginal",
        "tax on an increment at the next slab",
      ],
      problem: [
        "raise feels smaller than the number",
        "bonus taxed far more than expected",
        "not sure if earning more could reduce income",
      ],
      question: [
        "what is a marginal tax rate",
        "can earning more leave me with less",
        "is a bonus taxed differently from salary",
      ],
      qualifier: [
        "free marginal tax calculator",
        "next rupee tax tool no signup",
        "browser marginal rate check",
      ],
      india: [
        "marginal tax rate kya hai",
        "bonus pe tax india",
        "increment ke baad tax",
      ],
    },
  },
  {
    slug: "notice-buyout-calculator",
    primary: "notice buyout calculator",
    secondary: [
      "notice period recovery salary",
      "early resignation cost india",
      "notice pay calculation",
      "buyout notice period",
      "short notice deduction",
    ],
    groups: {
      alternativeName: ["notice recovery tool", "buyout cost calculator"],
      synonym: [
        "cost of leaving before notice ends",
        "amount an employer can recover",
        "notice shortfall calculation",
      ],
      action: [
        "calculate a notice period buyout",
        "work out recovery for unserved notice",
        "check stress on basic versus gross",
      ],
      longTail: [
        "buyout cost for thirty days shortfall",
        "notice recovery on basic plus da",
        "how much to pay for an early exit",
        "will a new employer reimburse a buyout",
      ],
      problem: [
        "new offer requires an early joining date",
        "recovery amount higher than expected",
        "unclear whether recovery is on basic or gross",
      ],
      question: [
        "how is notice buyout calculated",
        "can an employer deduct a notice shortfall",
        "what is the difference between buyout and garden leave",
      ],
      qualifier: [
        "free notice buyout calculator",
        "buyout cost tool no signup",
        "browser notice recovery",
      ],
      india: [
        "notice period buyout kaise nikale",
        "notice pay india",
        "early resignation cost",
      ],
    },
  },
  {
    slug: "notice-period-calculator",
    primary: "notice period calculator",
    secondary: [
      "last working day calculator",
      "resignation date notice period",
      "60 day notice calculation",
      "notice period business days",
      "relieving date india",
    ],
    groups: {
      alternativeName: ["lwd calculator", "notice end date tool"],
      synonym: [
        "date the notice period finishes",
        "last day after resigning",
        "notice end date from a resignation",
      ],
      action: [
        "calculate the last working day",
        "count notice in business days",
        "work out a relieving date",
      ],
      longTail: [
        "last working day for a sixty day notice",
        "notice period from a resignation in november",
        "relieving date with holidays in the period",
        "does the resignation day count as day one",
      ],
      problem: [
        "not sure when the last working day falls",
        "holidays in the notice period not counted",
        "joining date depends on a relieving date",
      ],
      question: [
        "how is a notice period calculated",
        "are notice days calendar days or working days",
        "does the resignation date count as day one",
      ],
      qualifier: [
        "free notice period calculator",
        "last working day tool no signup",
        "browser notice date calculator",
      ],
      india: [
        "notice period kaise nikale",
        "resignation ke baad last day",
        "notice period india rules",
      ],
    },
  },
  {
    slug: "experience-calculator",
    primary: "experience calculator",
    secondary: [
      "total work experience calculation",
      "years of experience from dates",
      "employment gap calculator",
      "overlapping jobs experience",
      "resume total experience",
    ],
    groups: {
      alternativeName: ["experience adder", "tenure calculator"],
      synonym: [
        "how many years of work experience",
        "elapsed service from dates",
        "merged tenure across roles",
      ],
      action: [
        "add up total work experience",
        "merge overlapping job dates",
        "find gaps in an employment history",
      ],
      longTail: [
        "total experience from four jobs with gaps",
        "how to count experience when roles overlap",
        "employment gap of six months in a cv",
        "years and months from a list of dates",
      ],
      problem: [
        "total experience quoted differently everywhere",
        "overlapping roles double counted",
        "not sure how to explain a career gap",
      ],
      question: [
        "how is total work experience calculated",
        "should overlapping jobs count twice",
        "does a career gap matter on a résumé",
      ],
      qualifier: [
        "free experience calculator",
        "tenure calculator no signup",
        "browser experience adder",
      ],
      india: [
        "total experience kaise nikale",
        "naukri mein experience",
        "service period india",
      ],
    },
  },
  {
    slug: "cover-letter-generator",
    primary: "cover letter generator",
    secondary: [
      "cover letter format india",
      "job application letter template",
      "cover letter with achievement",
      "why this company cover letter",
      "application letter for job",
    ],
    groups: {
      alternativeName: ["application letter tool", "covering letter maker"],
      synonym: [
        "letter sent with a résumé",
        "application note for a role",
        "covering email for a cv",
      ],
      action: [
        "draft a cover letter for a role",
        "add a specific reason for applying",
        "write an application letter",
      ],
      longTail: [
        "cover letter for a career change",
        "cover letter for a fresher in india",
        "cover letter that explains a gap",
        "short cover letter for a linkedin application",
      ],
      problem: [
        "every cover letter reads the same",
        "not sure what to say beyond the résumé",
        "applying without any reason for the company",
      ],
      question: [
        "are cover letters still read",
        "how long should a cover letter be",
        "should a cover letter repeat the résumé",
      ],
      qualifier: [
        "free cover letter generator",
        "application letter tool no signup",
        "browser cover letter builder",
      ],
      india: [
        "cover letter kaise likhe",
        "job application letter india",
        "covering letter format hindi english",
      ],
    },
  },
  {
    slug: "follow-up-generator",
    primary: "follow up email generator",
    secondary: [
      "thank you email after interview",
      "job application follow up",
      "no response follow up email",
      "post interview message template",
      "recruiter follow up",
    ],
    groups: {
      alternativeName: ["follow up message builder", "thank you note tool"],
      synonym: [
        "message after an interview",
        "note chasing an application",
        "reply request to a recruiter",
      ],
      action: [
        "write a follow up after an interview",
        "draft a thank you note to an interviewer",
        "chase an application politely",
      ],
      longTail: [
        "thank you email the morning after an interview",
        "follow up when a recruiter goes silent",
        "how many times to follow up on an application",
        "message after a final round with no answer",
      ],
      problem: [
        "no response after an interview",
        "unsure whether following up looks desperate",
        "not sure what to add beyond thanks",
      ],
      question: [
        "should i follow up after an interview",
        "how soon should a follow up be sent",
        "can a follow up change the outcome",
      ],
      qualifier: [
        "free follow up email generator",
        "interview thank you tool no signup",
        "browser follow up writer",
      ],
      india: [
        "interview ke baad mail kaise kare",
        "follow up email india",
        "recruiter ko message",
      ],
    },
  },
  {
    slug: "star-answer-builder",
    primary: "star answer builder",
    secondary: [
      "star method interview answers",
      "behavioural interview preparation",
      "situation task action result",
      "competency answer structure",
      "interview story builder",
    ],
    groups: {
      alternativeName: ["star method tool", "behavioural answer builder"],
      synonym: [
        "structured answer to a behavioural question",
        "situation action result framework",
        "competency question preparation",
      ],
      action: [
        "structure a star answer",
        "prepare a behavioural story",
        "check an answer for a missing result",
      ],
      longTail: [
        "star answer for a conflict question",
        "how long a behavioural interview answer should be",
        "story with a measurable result for an interview",
        "answer that says i rather than we",
      ],
      problem: [
        "answers ramble without a result",
        "every story turns into a team credit",
        "no numbers to prove impact",
      ],
      question: [
        "what is the star method",
        "how long should a star answer be",
        "can i reuse one story for several questions",
      ],
      qualifier: [
        "free star answer builder",
        "behavioural prep tool no signup",
        "browser interview story tool",
      ],
      india: [
        "star method interview answer",
        "behavioural round ki taiyari",
        "interview answer kaise banaye",
      ],
    },
  },
  {
    slug: "linkedin-about-generator",
    primary: "linkedin about generator",
    secondary: [
      "linkedin summary examples",
      "linkedin profile about section",
      "linkedin headline for job search",
      "professional bio generator",
      "linkedin optimization india",
    ],
    groups: {
      alternativeName: ["linkedin summary tool", "profile bio builder"],
      synonym: [
        "text for the about section",
        "short professional bio",
        "profile summary for a job search",
      ],
      action: [
        "draft a linkedin about section",
        "write a professional bio",
        "improve a linkedin headline",
      ],
      longTail: [
        "linkedin about section for a developer",
        "professional bio for a career change",
        "linkedin summary that mentions one achievement",
        "about section that a recruiter can skim",
      ],
      problem: [
        "about section is an empty paragraph",
        "profile reads like a résumé copy",
        "not sure how to say i am looking",
      ],
      question: [
        "what should a linkedin about section say",
        "does the about section affect search",
        "how long should a linkedin summary be",
      ],
      qualifier: [
        "free linkedin about generator",
        "profile bio tool no signup",
        "browser linkedin writer",
      ],
      india: [
        "linkedin about kaise likhe",
        "linkedin profile india",
        "professional bio hindi english",
      ],
    },
  },
  {
    slug: "interview-prep-plan",
    primary: "interview preparation plan",
    secondary: [
      "interview questions to ask employer",
      "technical interview preparation",
      "final round interview tips",
      "company research before interview",
      "interview checklist job seeker",
    ],
    groups: {
      alternativeName: ["interview prep tool", "interview checklist"],
      synonym: [
        "preparation plan for an interview",
        "what to research before an interview",
        "questions worth asking an employer",
      ],
      action: [
        "build an interview preparation plan",
        "prepare questions to ask an interviewer",
        "research a company before a round",
      ],
      longTail: [
        "preparation plan for a technical round",
        "questions to ask in a final round",
        "what to research before a screening call",
        "interview checklist for a career change",
      ],
      problem: [
        "walking into a round unprepared",
        "no questions when asked",
        "unsure what each stage evaluates",
      ],
      question: [
        "how should i prepare for an interview",
        "what questions should i ask an employer",
        "does the final round differ from a technical round",
      ],
      qualifier: [
        "free interview prep plan",
        "interview checklist no signup",
        "browser interview plan builder",
      ],
      india: [
        "interview ki taiyari kaise kare",
        "interview questions to ask india",
        "final round interview tips",
      ],
    },
  },
  {
    slug: "availability-statement",
    primary: "availability statement",
    secondary: [
      "notice period in resume",
      "immediate joiner statement",
      "availability for job application",
      "buyout notice clause",
      "joining date commitment",
    ],
    groups: {
      alternativeName: ["availability sentence", "notice statement tool"],
      synonym: [
        "line stating when i can join",
        "joining availability sentence",
        "notice period wording for an application",
      ],
      action: [
        "write an availability statement",
        "state a notice period in an application",
        "describe a buyout option accurately",
      ],
      longTail: [
        "how to state a ninety day notice period",
        "availability line for a cover letter",
        "immediate joiner statement with a short notice",
        "notice period wording when a buyout is possible",
      ],
      problem: [
        "said immediate when notice was ninety days",
        "unsure how to phrase a buyout offer",
        "recruiter keeps asking about joining date",
      ],
      question: [
        "how do i state my notice period",
        "should i offer a buyout if i am not sure",
        "where does an availability statement go",
      ],
      qualifier: [
        "free availability statement tool",
        "notice period wording no signup",
        "browser availability sentence",
      ],
      india: [
        "notice period kaise bataye",
        "immediate joiner india",
        "joining date kaise likhe",
      ],
    },
  },
];
