export type CalculatorFormula = {
  label: string;
  expression: string;
  note?: string;
};

export type CalculatorExample = {
  scenario: string;
  calculation: string;
  result: string;
};

export type CalculatorInfoEntry = {
  name: string;
  seoTitle: string;
  description: string;
  intro: string;
  workspaceHeading: string;
  formulasHeading: string;
  formulasIntro: string;
  formulaBlockTitle: string;
  formulas: CalculatorFormula[];
  examplesBlockTitle: string;
  examples: CalculatorExample[];
  disclaimer?: string;
  steps: string[];
  faqs: { q: string; a: string }[];
};

export const calculatorInfo: Record<string, CalculatorInfoEntry> = {
  "percentage-calculator": {
    name: "Percentage Calculator",
    seoTitle: "Percentage Calculator — Change & Reverse Math",
    description:
      "Calculate X% of Y, percentage increase or decrease, percentage difference and reverse percentages with step-by-step formulas and multi-step comparisons.",
    intro:
      "Solve six everyday percentage problems — share of a number, ratio as a percent, percentage increase or decrease, symmetric percentage difference, reverse pre-change value and chained percentage steps — locally in your browser.",
    workspaceHeading: "Calculate percentages and changes",
    formulasHeading: "Percentage formulas & worked examples",
    formulasIntro:
      "Every mode shows the exact arithmetic used on your inputs before rounding display values to at most four decimal places.",
    formulaBlockTitle: "Core percentage formulas",
    formulas: [
      {
        label: "Percentage of a number",
        expression: "(P ÷ 100) × Value",
        note: "finds P% of a base amount",
      },
      {
        label: "Value as % of reference",
        expression: "(Part ÷ Reference) × 100",
        note: "reference cannot be 0",
      },
      {
        label: "Increase / decrease",
        expression: "Value × (1 ± Rate ÷ 100)",
        note: "chained steps multiply sequentially",
      },
      {
        label: "Symmetric % difference",
        expression: "|A − B| ÷ ((|A| + |B|) ÷ 2) × 100",
        note: "order-independent comparison of two values",
      },
      {
        label: "Reverse percentage",
        expression: "Final ÷ (1 + Rate ÷ 100)",
        note: "use a negative rate (e.g. −20) for a decrease",
      },
    ],
    examplesBlockTitle: "Worked percentage examples",
    examples: [
      {
        scenario: "18% of 2,500",
        calculation: "18 ÷ 100 × 2,500",
        result: "450",
      },
      {
        scenario: "Increase 1,200 by 15%",
        calculation: "1,200 × (1 + 15 ÷ 100)",
        result: "1,380",
      },
      {
        scenario: "Percentage difference between 80 and 100",
        calculation: "|80 − 100| ÷ 90 × 100",
        result: "22.2222%",
      },
      {
        scenario: "Original amount before +18% gave 1,180",
        calculation: "1,180 ÷ 1.18",
        result: "1,000",
      },
      {
        scenario: "Chained +20% then −10% on 1,000",
        calculation: "1,000 × 1.20 × 0.90",
        result: "1,080 (+8% net)",
      },
    ],
    steps: [
      "Select one of the six calculation modes in the main workspace, or use Compare & build changes below for multi-step sequences.",
      "Enter both numeric inputs (up to ±1 trillion); the live result and substituted formula update immediately as you type.",
      "For reverse-percentage problems, enter a signed change rate such as +18 for an addition or −20 for a markdown.",
      "Save results to session history or export multi-step breakdowns as CSV or PDF before closing the tab.",
    ],
    faqs: [
      {
        q: "What is the difference between percentage change and percentage difference?",
        a: "Percentage change measures directional movement from a specific starting value: (New − Old) ÷ |Old| × 100, so going from 80 to 100 is +25%, while 100 to 80 is −20%. Percentage difference compares two peers without treating either as the baseline by dividing |A − B| by the average of |A| and |B|, giving 22.2222% for 80 and 100 in either order.",
      },
      {
        q: "Why does a 20% increase followed by a 20% decrease not return to the original number?",
        a: "The second percentage applies to the updated amount rather than the starting value. Starting at 1,000, a 20% increase gives 1,200, and a 20% decrease on 1,200 subtracts 240 to leave 960 — a net 4% reduction (1.20 × 0.80 = 0.96).",
      },
      {
        q: "How do I find the original number before a percentage increase or discount?",
        a: "Choose Reverse a percentage change and enter the final amount plus the signed rate. Divide by (1 + rate ÷ 100): for 1,180 after +18%, 1,180 ÷ 1.18 = 1,000; for 800 after a 20% markdown (−20%), 800 ÷ 0.80 = 1,000. A −100% change cannot be reversed because all starting information was wiped out to zero.",
      },
      {
        q: "How are very small or very large percentage results formatted?",
        a: "Standard values round to at most four decimal places for readability while keeping full IEEE-754 floating-point precision internally. Nonzero magnitudes below 0.0001 or at least 10^15 switch automatically to scientific notation with seven significant digits.",
      },
    ],
  },

  "bmi-calculator": {
    name: "BMI Calculator",
    seoTitle: "BMI Calculator — Metric, Imperial & Weight Range",
    description:
      "Calculate Body Mass Index (BMI) in metric (kg/cm) or imperial (lb/in) units, view adult WHO weight ranges for your height and compare entries locally.",
    intro:
      "Calculate Body Mass Index from metric centimetres and kilograms or imperial inches and pounds, with age-gated adult WHO screening categories, healthy-weight range estimates and multi-person comparison.",
    workspaceHeading: "Calculate Body Mass Index (BMI)",
    formulasHeading: "BMI formulas, adult thresholds & worked examples",
    formulasIntro:
      "Imperial inputs are converted using exact international definitions (1 inch = 0.0254 m; 1 pound = 0.45359237 kg) before dividing mass by height squared.",
    formulaBlockTitle: "BMI & adult range equations",
    formulas: [
      {
        label: "Metric BMI",
        expression: "Weight (kg) ÷ (Height (cm) ÷ 100)²",
        note: "equivalent to kg ÷ m²",
      },
      {
        label: "Imperial conversion",
        expression: "(Weight (lb) × 0.45359237) ÷ (Height (in) × 0.0254)²",
        note: "approx. 703 × lb ÷ in²",
      },
      {
        label: "Adult (20+) healthy weight span",
        expression: "18.5 × m²  to  24.9 × m²",
        note: "converted back to lb in imperial mode",
      },
      {
        label: "Adult WHO screening bands",
        expression: "<18.5 Underweight · 18.5–24.9 Healthy · 25–29.9 Overweight · ≥30 Obesity",
        note: "suppressed unless age 20+ is confirmed",
      },
    ],
    examplesBlockTitle: "Worked BMI examples",
    examples: [
      {
        scenario: "Metric adult (170 cm, 65 kg, age 20+)",
        calculation: "65 ÷ 1.70² = 22.4913",
        result: "22.4913 · Healthy weight (range 53.465–71.961 kg)",
      },
      {
        scenario: "Imperial adult (68 in, 154 lb, age 20+)",
        calculation: "69.8532 kg ÷ (1.7272 m)² = 23.4154",
        result: "23.4154 · Healthy weight (range 121.6722–163.7642 lb)",
      },
      {
        scenario: "Under 20 years or age unspecified",
        calculation: "Computes numeric kg ÷ m² only",
        result: "Adult WHO labels withheld; use pediatric growth charts",
      },
    ],
    disclaimer:
      "Medical disclaimer: BMI is a general population screening ratio, not a clinical diagnosis. It does not measure body-fat distribution, muscle mass, bone density, pregnancy or age- and ethnicity-specific risk thresholds. Always consult a qualified healthcare professional.",
    steps: [
      "Keep metric units (cm and kg) or tick Use imperial units to enter height in total inches and weight in pounds.",
      "Enter your height and weight, then select your age group so adult WHO categories appear only when age 20 or older is confirmed.",
      "Optionally open Target BMI or Compare previous weight to inspect mathematical weight differences at the same height.",
      "Use Compare BMI calculations below to evaluate two to five independent entries side by side or export a summary.",
    ],
    faqs: [
      {
        q: "Why are BMI categories hidden until I select 20 years or older?",
        a: "Fixed cutoffs such as 18.5, 25 and 30 apply only to adults aged 20 and above. For children and adolescents under 20, healthy body mass changes substantially with age and sex, so clinicians use age- and sex-specific BMI-for-age percentile growth charts rather than adult thresholds.",
      },
      {
        q: "How do I enter feet and inches in imperial mode?",
        a: "Convert feet to total inches first (multiply feet by 12 and add remaining inches — for example, 5 ft 8 in is 68 inches), then enter total inches and weight in pounds. Internally the calculator multiplies inches by 0.0254 m and pounds by 0.45359237 kg for exact SI parity.",
      },
      {
        q: "What are the limitations of BMI as a health indicator?",
        a: "BMI divides total body weight by height squared without distinguishing lean muscle from adipose tissue or accounting for waist circumference. Strength athletes often score above 25 with low body fat, while older adults or certain ethnic groups may face metabolic risk below 25. Treat BMI strictly as an initial screening number alongside medical advice.",
      },
      {
        q: "Are my height and weight measurements stored or sent anywhere?",
        a: "No. Every calculation runs in your browser tab's memory. Optional session history stays in page state only until you clear it or close the tab, and nothing is transmitted to QUICKKIT servers.",
      },
    ],
  },

  "discount-calculator": {
    name: "Discount Calculator",
    seoTitle: "Discount Calculator — Stacked Deals, Tax & Margin",
    description:
      "Calculate single or sequential stacked discounts, post-discount sales tax, reverse original price, Buy X Get Y offers, and profit margin vs markup.",
    intro:
      "Compute sale prices after single or stacked percentage markdowns, apply post-discount tax in INR, USD, EUR or GBP, reverse-calculate list prices, compare Buy X Get Y bundles, and check gross margin versus markup.",
    workspaceHeading: "Calculate discounts, savings and tax",
    formulasHeading: "Discount, bundle & profit margin formulas",
    formulasIntro:
      "Stacked discounts compound multiplicatively on the remaining balance rather than adding their percentages together, and sales tax is applied after markdowns.",
    formulaBlockTitle: "Pricing & margin equations",
    formulas: [
      {
        label: "Sequential discounts",
        expression: "Discounted = Original × (1 − d₁÷100) × (1 − d₂÷100) …",
        note: "each rate applies to the running subtotal",
      },
      {
        label: "Post-discount tax & total",
        expression: "Total = Discounted × (1 + Tax÷100)",
        note: "Savings = Original − Discounted",
      },
      {
        label: "Reverse list price",
        expression: "Original = Discounted ÷ ((1 − d₁÷100) × (1 − d₂÷100) …)",
        note: "recovers pre-discount price when discount < 100%",
      },
      {
        label: "Buy X, get Y free",
        expression: "Free = ⌊Qty ÷ (X + Y)⌋ × Y + max(0, (Qty mod (X + Y)) − X)",
        note: "paid units = Qty − Free",
      },
      {
        label: "Margin vs markup",
        expression: "Margin = (Sale − Cost) ÷ Sale × 100 · Markup = (Sale − Cost) ÷ Cost × 100",
        note: "calculated on pre-tax proceeds",
      },
    ],
    examplesBlockTitle: "Worked retail & pricing examples",
    examples: [
      {
        scenario: "₹2,000 with stacked 20% + 10% off, plus 18% tax",
        calculation: "₹2,000 × 0.80 × 0.90 = ₹1,440.00 + ₹259.20 tax",
        result: "₹1,699.20 final (₹560.00 pre-tax discount, 28% effective off)",
      },
      {
        scenario: "Buy 2, Get 1 Free on 3 items at ₹500 + 12% tax",
        calculation: "2 paid (₹1,000.00), 1 free (₹500.00 saved) + ₹120.00 tax",
        result: "₹1,120.00 total",
      },
      {
        scenario: "Cost ₹800 sold at ₹1,000 before tax",
        calculation: "Profit ₹200 → 200 ÷ 1,000 margin; 200 ÷ 800 markup",
        result: "20% gross margin · 25% markup",
      },
    ],
    disclaimer:
      "Pricing note: Estimates perform pure arithmetic without currency conversion, payment gateway fees, shipping charges or jurisdiction-specific rounding rules.",
    steps: [
      "Enter the list price, one or more comma-separated discount percentages (such as 20, 10), and an optional post-discount tax percentage.",
      "Tick Reverse mode if you know the discounted pre-tax sale price and want to recover the original list price.",
      "Use Buy X, get Y free and Compare discount offers below to evaluate bundle promotions or competing coupon rates side by side.",
      "Use Profit, margin & markup to verify unit profitability, and export any breakdown as CSV or a printable discount PDF.",
    ],
    faqs: [
      {
        q: "Why do stacked 20% and 10% discounts equal 28% off instead of 30%?",
        a: "Retailers apply extra coupon discounts to the already-reduced subtotal, not the original tag price. Taking 20% off ₹2,000 leaves ₹1,600, and taking 10% off ₹1,600 subtracts ₹160 to reach ₹1,440 — a combined reduction of ₹560, or 28% (1 − 0.80 × 0.90 = 0.28).",
      },
      {
        q: "How does Buy X, get Y free handle incomplete item groups?",
        a: "Each complete group of (X + Y) items charges for X items and gives Y free. If you take extra items that do not fill a full group, you pay for up to the first X items in that remainder and any additional items beyond X up to Y are free, matching standard equal-price basket rules.",
      },
      {
        q: "What is the difference between profit margin and markup?",
        a: "Both use the same profit (Selling price − Cost), but margin divides profit by the selling price while markup divides profit by the cost price. Buying an item for ₹800 and selling it for ₹1,000 earns ₹200, which is a 20% profit margin (200 ÷ 1,000) and a 25% markup (200 ÷ 800).",
      },
      {
        q: "Does changing the currency symbol convert exchange rates?",
        a: "No. Selecting INR (₹), USD ($), EUR (€) or GBP (£) formats money displays and PDF/CSV exports in your chosen currency symbol without fetching live exchange rates or altering your numbers.",
      },
    ],
  },

  "gst-calculator": {
    name: "GST Calculator",
    seoTitle: "GST Calculator — Add or Remove CGST, SGST & IGST",
    description:
      "Add or remove Indian GST at 5%, 12%, 18%, 28% or custom rates, split intra-state CGST/SGST vs inter-state IGST, and build multi-item GST estimates.",
    intro:
      "Add GST to a net taxable value or extract inclusive GST from an MRP/gross total, view the equal intra-state CGST + SGST split alongside inter-state IGST, and prepare multi-line itemised GST estimates.",
    workspaceHeading: "Add or remove Indian GST",
    formulasHeading: "GST calculation formulas & worked examples",
    formulasIntro:
      "Exclusive mode adds tax on top of the taxable value; inclusive mode divides by (1 + Rate ÷ 100) so you never over-subtract GST by taking a flat percentage of the gross total.",
    formulaBlockTitle: "Exclusive, inclusive & split formulas",
    formulas: [
      {
        label: "GST-exclusive (add GST)",
        expression: "GST = Taxable × (Rate ÷ 100) · Total = Taxable + GST",
        note: "net price to gross invoice amount",
      },
      {
        label: "GST-inclusive (remove GST)",
        expression: "Taxable = Gross ÷ (1 + Rate ÷ 100) · GST = Gross − Taxable",
        note: "equivalent to Gross × Rate ÷ (100 + Rate)",
      },
      {
        label: "Intra-state vs inter-state split",
        expression: "CGST = GST ÷ 2, SGST = GST ÷ 2  (or  IGST = GST)",
        note: "mutually exclusive by place of supply",
      },
      {
        label: "Multi-item line taxable",
        expression: "AfterDiscount = Qty × UnitPrice × (1 − Discount ÷ 100)",
        note: "then exclusive or inclusive GST per line rate",
      },
    ],
    examplesBlockTitle: "Worked Indian GST examples",
    examples: [
      {
        scenario: "Add 18% GST to ₹10,000 (exclusive)",
        calculation: "Taxable ₹10,000.00 + ₹1,800.00 GST",
        result: "₹11,800.00 total (CGST ₹900.00 + SGST ₹900.00, or IGST ₹1,800.00)",
      },
      {
        scenario: "Extract 18% GST from ₹11,800 MRP (inclusive)",
        calculation: "₹11,800 ÷ 1.18 = ₹10,000.00 taxable",
        result: "₹1,800.00 GST extracted (not 18% of 11,800 = ₹2,124)",
      },
      {
        scenario: "Invoice line: 2 units × ₹1,500, 10% discount, 18% exclusive GST",
        calculation: "Gross ₹3,000.00 − ₹300.00 discount = ₹2,700.00 taxable + ₹486.00 GST",
        result: "₹3,186.00 line total",
      },
    ],
    disclaimer:
      "Tax disclaimer: This tool provides mathematical GST estimates only and is not tax, accounting or legal advice. HSN/SAC slab classification, cess, input-tax credit, reverse charge and place-of-supply rules depend on your specific transaction — verify with a qualified tax professional.",
    steps: [
      "Enter the rupee amount and the applicable GST percentage (such as 5%, 12%, 18%, 28%, 3% or 0.25%).",
      "Leave Amount includes GST unchecked to add GST onto a taxable base, or tick it to back-calculate taxable value from a GST-inclusive total.",
      "Read the net taxable amount, total GST, 50/50 intra-state CGST + SGST split and inter-state IGST alternative in the result card.",
      "Use Multi-item GST estimate below to combine up to 100 items with per-line quantities, discounts and GST slabs, then export CSV or PDF.",
    ],
    faqs: [
      {
        q: "Why can't I remove 18% GST from a gross bill by subtracting 18% of the total?",
        a: "In a GST-inclusive price, the gross total already equals 118% of the underlying taxable value (at an 18% slab). Taking 18% directly off ₹11,800 would subtract ₹2,124 instead of the true ₹1,800 tax. Dividing ₹11,800 by 1.18 recovers the exact ₹10,000.00 taxable base and ₹1,800.00 GST.",
      },
      {
        q: "When do CGST and SGST apply instead of IGST?",
        a: "Under Indian GST rules, intra-state supplies (where supplier location and place of supply are in the same state or union territory) generally split the GST rate equally into Central GST (CGST) and State/UT GST (SGST/UTGST). Inter-state supplies charge the full rate as Integrated GST (IGST) instead — the two regimes are alternatives, never added together.",
      },
      {
        q: "How are trade discounts handled in the multi-item GST estimator?",
        a: "Each line multiplies Quantity × Unit price to get gross line value, deducts the line discount percentage first, and then applies or extracts that item's GST rate on the discounted amount before summing all lines.",
      },
      {
        q: "Does this calculator validate GSTINs or file tax invoices?",
        a: "No. It is an offline browser calculation aid for checking taxable values and tax splits; it does not connect to the GST portal, validate GSTIN numbers, compute compensation cess, or issue statutory e-invoices.",
      },
    ],
  },

  "age-calculator": {
    name: "Age Calculator",
    seoTitle: "Age Calculator — Exact Years, Months & Days",
    description:
      "Calculate exact chronological age in years, months, weeks and days on any past or future date, check leap-day birthdays and count down to your next one.",
    intro:
      "Find exact calendar age in years, completed months and remaining days on any past, present or future date, along with total days lived, birth weekday, next-birthday countdown, decade milestones and two-person age gaps.",
    workspaceHeading: "Calculate exact chronological age",
    formulasHeading: "Calendar age rules & worked examples",
    formulasIntro:
      "Age is computed using pure UTC calendar dates (YYYY-MM-DD) without time-of-day or time-zone drift, clamping month shifts to the actual length of each calendar month.",
    formulaBlockTitle: "How calendar age is counted",
    formulas: [
      {
        label: "Completed months",
        expression: "m = (Year₂ − Year₁) × 12 + (Month₂ − Month₁), minus 1 if addMonths(Birth, m) > Target",
        note: "Years = ⌊m ÷ 12⌋, Months = m mod 12",
      },
      {
        label: "Remaining days",
        expression: "Remainder = Target − addMonths(Birth, m)",
        note: "addMonths clamps day 31 to 28/29/30 in shorter months",
      },
      {
        label: "Total elapsed days & weeks",
        expression: "Days = (Target − Birth) ÷ 86,400,000 ms · Weeks = Days ÷ 7",
        note: "exact Gregorian leap-year day count",
      },
      {
        label: "Leap-day birthday rule",
        expression: "Feb 29 → Feb 29 in leap years; Feb 28 in non-leap years",
        note: "used for previous/next birthday countdown",
      },
    ],
    examplesBlockTitle: "Worked age examples",
    examples: [
      {
        scenario: "Born 1996-05-15, age on 2026-11-10",
        calculation: "365 completed months + (2026-11-10 − 2026-10-15)",
        result: "30 years, 5 months, 26 days (11,136 total days; next birthday in 186 days)",
      },
      {
        scenario: "Leap-day birth 2000-02-29, age on 2025-02-28",
        calculation: "Feb 29 clamps to Feb 28 in common year 2025 (300 months)",
        result: "25 years, 0 months, 0 days (9,131 total days)",
      },
    ],
    disclaimer:
      "Calendar note: Legal age-of-majority or exam/recruitment eligibility cutoffs in some jurisdictions treat a February 29 birthday as March 1 or count inclusive of the cutoff date — always check the official rule for statutory filings.",
    steps: [
      "Enter the Date of birth and the Age on date (any calendar date between years 0001 and 9999).",
      "Review the exact years, months and days alongside total days, weeks, completed months, birth weekday and days until the next birthday.",
      "Open Compare another person to compute the exact chronological age gap between two birth dates.",
      "Copy the result, save snapshots to session history, or download age-calculation.csv for your records.",
    ],
    faqs: [
      {
        q: "How does the calculator handle months with 28, 29, 30 and 31 days?",
        a: "Instead of dividing total days by an approximate 30.44-day average, the calculator advances whole calendar months from the birth date (clamping the day to the last day of shorter months when needed) and counts the exact remaining days to the target date.",
      },
      {
        q: "How are February 29 leap-year birthdays observed in non-leap years?",
        a: "In a non-leap year, month clamping maps February 29 to February 28, so someone born on 2000-02-29 reaches 25 years, 0 months, 0 days on 2025-02-28. If an institution specifies March 1 for non-leap years, check your age on March 1 as well.",
      },
      {
        q: "Can I check my exact age on a future exam, retirement or eligibility cutoff date?",
        a: "Yes. Set Age on date to any future cutoff date (for example an admission, civil-service exam or pension eligibility date) to verify exact completed years, months and days on that specific day.",
      },
      {
        q: "Do local time zones or daylight-saving transitions affect the day count?",
        a: "No. Both dates are parsed as pure UTC midnight calendar dates (YYYY-MM-DD), preventing daylight-saving clock shifts from adding or losing a day.",
      },
    ],
  },

  "date-difference-calculator": {
    name: "Date Difference Calculator",
    seoTitle: "Date Difference Calculator — Calendar & Work Days",
    description:
      "Count exact calendar days, weeks, months and years or Monday–Friday business days between two dates, exclude custom holidays, or add/subtract durations.",
    intro:
      "Measure exact calendar years, months, weeks and days or Monday–Friday business days between two dates, optionally include the end date, exclude custom holiday lists, and add or subtract calendar durations.",
    workspaceHeading: "Count calendar and business days",
    formulasHeading: "Date difference & business-day rules",
    formulasIntro:
      "By default the interval counts [Start, End) — the same convention used for hotel nights and elapsed days — while ticking Include end date adds +1 day to cover both boundary dates.",
    formulaBlockTitle: "Interval & date-shift equations",
    formulas: [
      {
        label: "Calendar day span",
        expression: "Days = (End − Start) ÷ 86,400,000 ms + (Inclusive ? 1 : 0)",
        note: "Weeks = Days ÷ 7",
      },
      {
        label: "Monday–Friday business days",
        expression: "⌊Days ÷ 7⌋ × 5 + weekday remainder − unique weekday holidays in span",
        note: "weekend holidays are never double-subtracted",
      },
      {
        label: "Calendar month / year shift",
        expression: "shiftCalendar(Start, ±N, unit) clamps day to month end",
        note: "e.g. Jan 31 + 1 month = Feb 28 (or Feb 29 in leap years)",
      },
    ],
    examplesBlockTitle: "Worked date-span examples",
    examples: [
      {
        scenario: "2026-03-01 to 2026-03-31 (end excluded, 1 weekday holiday 2026-03-04)",
        calculation: "30 calendar days · 21 weekdays − 1 holiday",
        result: "0 years, 0 months, 30 days · 20 business days",
      },
      {
        scenario: "2026-03-01 to 2026-03-31 (Include end date checked)",
        calculation: "Full March calendar month (31 days)",
        result: "0 years, 1 month, 0 days · 22 business days",
      },
      {
        scenario: "Add 1 calendar month to 2026-01-31",
        calculation: "2026 is a common year, so February has 28 days",
        result: "2026-02-28",
      },
    ],
    steps: [
      "Pick a Start date and End date (End date on or after Start date) to calculate years, months, days, weeks and Monday–Friday business days.",
      "Tick Include end date when both the first and last calendar dates count as full days (for example leave requests or billing periods).",
      "Open Holiday exclusions and paste comma- or line-separated YYYY-MM-DD holiday dates to deduct weekday holidays from the business-day total.",
      "Enter a positive or negative whole number under Add or subtract duration to shift the start date by days, weeks, calendar months or years.",
    ],
    faqs: [
      {
        q: "Should I leave Include end date unchecked or checked?",
        a: "Leave it unchecked when measuring elapsed time or nights between dates (2026-03-01 to 2026-03-02 = 1 day). Check Include end date when counting inclusive calendar days such as vacation allowances, notice periods or full-month spans (2026-03-01 to 2026-03-31 inclusive = 31 days).",
      },
      {
        q: "Are public holidays automatically excluded from business days?",
        a: "No country holiday calendar is preloaded because public holidays vary by state, employer and year. Business days exclude Saturdays and Sundays automatically, and you can paste any YYYY-MM-DD holiday dates under Holiday exclusions — duplicate dates or holidays falling on a weekend are ignored safely so they never double-deduct.",
      },
      {
        q: "What happens when I add 1 calendar month to the 31st of a month?",
        a: "Calendar month and year shifts preserve the day number when possible and clamp to the final valid day of shorter target months. Adding 1 month to 2026-01-31 yields 2026-02-28 (or 2028-02-29 in a leap year).",
      },
      {
        q: "What date range does the calculator support?",
        a: "Proleptic Gregorian calendar dates from 0001-01-01 through 9999-12-31, with day shifts up to ±3,650,000 days as long as the resulting date stays within years 0001–9999.",
      },
    ],
  },

  "emi-calculator": {
    name: "EMI Calculator",
    seoTitle: "EMI Calculator — Monthly EMI, Interest & Schedule",
    description:
      "Calculate monthly loan EMI, total interest payable and payoff months with extra prepayments, variable-rate changes and downloadable repayment schedules.",
    intro:
      "Estimate fixed reducing-balance monthly EMIs for home, car, education or personal loans, test recurring monthly or one-time prepayments, model variable-rate resets, and export month-by-month repayment schedules.",
    workspaceHeading: "Calculate monthly loan EMI",
    formulasHeading: "Reducing-balance EMI formula & worked examples",
    formulasIntro:
      "Monthly interest is charged only on the remaining unpaid principal at Rate ÷ 12% per month; extra monthly or one-time prepayments directly reduce principal and shorten payoff tenure.",
    formulaBlockTitle: "EMI & amortization formulas",
    formulas: [
      {
        label: "Monthly periodic rate",
        expression: "r = AnnualRate ÷ (12 × 100)",
        note: "if r = 0, EMI = Principal ÷ n",
      },
      {
        label: "Fixed monthly EMI",
        expression: "EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)",
        note: "computed via −expm1(−n × log1p(r)) for numerical stability",
      },
      {
        label: "Monthly schedule step",
        expression: "Interestₘ = Balanceₘ₋₁ × r · Principalₘ = Paymentₘ − Interestₘ",
        note: "extra monthly or one-time prepayment adds to Principalₘ",
      },
    ],
    examplesBlockTitle: "Worked EMI & prepayment examples",
    examples: [
      {
        scenario: "₹10,00,000 loan at 8.5% p.a. for 120 months (10 years)",
        calculation: "r = 0.085 ÷ 12, n = 120 reducing-balance months",
        result: "₹12,398.57 / month EMI · ₹4,87,828.27 total interest · ₹14,87,828.27 total",
      },
      {
        scenario: "Same ₹10,00,000 loan + ₹2,000 extra payment every month",
        calculation: "₹14,398.57 paid monthly toward interest + principal",
        result: "Paid off in 96 months (2 years early) · ₹1,06,446.83 interest saved",
      },
    ],
    disclaimer:
      "Financial disclaimer: Results are mathematical reducing-balance estimates, not a bank sanction or lender quote. Processing fees, insurance, GST on fees, broken-period interest, moratoriums and day-count conventions are excluded.",
    steps: [
      "Enter the loan Principal (₹), Annual interest rate (%) and Tenure in months (or tick Tenure in years).",
      "Optionally add an Extra payment per month or open One-time prepayment to see exact months shaved off and interest saved.",
      "Click Add comparison scenario to stack up to five loan structures, or use Variable rate & payment frequency below to model future rate resets.",
      "Inspect the yearly and monthly amortization tables and export the full repayment schedule as CSV or PDF.",
    ],
    faqs: [
      {
        q: "What is the difference between a reducing-balance rate and a flat interest rate?",
        a: "This EMI calculator uses the standard bank reducing-balance method, where each month's interest applies only to the remaining unpaid principal. A flat-rate quote charges interest on the entire original principal for every year of the loan, making a flat rate roughly 1.7× to 1.9× more expensive than the same nominal reducing-balance rate.",
      },
      {
        q: "How do extra monthly or one-time prepayments affect my loan?",
        a: "After covering that month's accrued interest, 100% of any extra monthly or lump-sum prepayment goes directly toward reducing your outstanding principal. Keeping the base scheduled EMI unchanged causes future monthly interest charges to drop faster and pays off the loan in fewer months.",
      },
      {
        q: "How do I simulate a floating-rate home loan rate hike or cut?",
        a: "Scroll to Variable rate & payment frequency and enter period:rate pairs such as 13:8.75, 25:9.25. At each specified payment period, the calculator re-amortizes the remaining balance over the remaining scheduled periods at the new annual rate.",
      },
      {
        q: "Why might my bank's exact EMI differ by a few rupees?",
        a: "Lenders may round the monthly EMI to the nearest rupee, charge broken-period interest between disbursement date and the first instalment cycle date, or use actual/365 daily interest accrual instead of equal 1/12th monthly intervals.",
      },
    ],
  },

  "loan-calculator": {
    name: "Loan Calculator",
    seoTitle: "Loan Calculator — Payments, Scenarios & Schedule",
    description:
      "Estimate fixed or variable loan payments, compare multiple loan scenarios, check debt-to-income affordability, and export full amortization schedules.",
    intro:
      "Compare loan structures across tenures and rates, estimate financed principal after down payment, check monthly debt-to-income affordability budgets, model quarterly or annual payment frequencies, and export full schedules.",
    workspaceHeading: "Calculate loan payments and amortization",
    formulasHeading: "Loan payment, affordability & reset formulas",
    formulasIntro:
      "Supports monthly fixed amortization, multi-scenario side-by-side comparison, gross-income debt-ratio budgeting, and variable-rate loans with monthly, quarterly or annual payments.",
    formulaBlockTitle: "Amortization & affordability equations",
    formulas: [
      {
        label: "Financed principal",
        expression: "Principal = PurchasePrice − DownPayment",
        note: "0 ≤ DownPayment < PurchasePrice",
      },
      {
        label: "Periodic payment (k payments/year)",
        expression: "Payment = P × r ÷ (1 − (1 + r)⁻ⁿ),  where r = Rate ÷ (100 × k)",
        note: "k = 12 monthly, 4 quarterly, 1 annual",
      },
      {
        label: "Debt-to-income payment budget",
        expression: "Budget = max(0, GrossMonthlyIncome × (MaxRatio ÷ 100) − ExistingDebt)",
        note: "MaxLoan = Budget ÷ PaymentPerUnitPrincipal",
      },
      {
        label: "Variable-rate reset",
        expression: "Re-computes Payment over remaining periods (N − p + 1) at each rate change",
        note: "entered as period:annualRate pairs",
      },
    ],
    examplesBlockTitle: "Worked loan & affordability examples",
    examples: [
      {
        scenario: "₹50,00,000 fixed loan at 9% p.a. for 20 years (240 months)",
        calculation: "r = 0.09 ÷ 12 = 0.0075, n = 240 months",
        result: "₹44,986.30 / month · ₹57,96,711.47 total interest · ₹1,07,96,711.47 total",
      },
      {
        scenario: "Affordability at ₹1,20,000 income, ₹15,000 existing debt, 36% cap",
        calculation: "(₹1,20,000 × 0.36) − ₹15,000 = ₹43,200 − ₹15,000",
        result: "₹28,200 / month available loan payment budget",
      },
      {
        scenario: "₹20,00,000 60-month variable loan: 8.5% initially, 9.25% at month 25",
        calculation: "Months 1–24 at 8.5%, re-amortized over 36 remaining months at 9.25%",
        result: "₹41,033.06 initial payment → ₹41,486.29 from month 25 · ₹4,78,299.92 total interest",
      },
    ],
    disclaimer:
      "Financial disclaimer: Loan, down-payment and debt-ratio figures are educational estimates and not credit approval or financial advice. Origination fees, property taxes, insurance, prepayment penalties and living expenses are not included.",
    steps: [
      "Enter Principal, Annual interest rate and Tenure (months or years), then click Add comparison scenario to compare up to five rate/tenure options.",
      "Open Down payment & affordability estimate to compute financed principal or maximum affordable loan size from your chosen debt-to-income ratio.",
      "Use Variable rate & payment frequency below to test monthly, quarterly or annual schedules and scheduled rate changes (e.g. 25:9.25).",
      "Review yearly rollups or the full period-by-period amortization schedule, and download CSV or PDF copies locally.",
    ],
    faqs: [
      {
        q: "How should I choose between a shorter loan tenure and a lower monthly payment?",
        a: "Extending tenure lowers the required monthly payment but keeps principal outstanding longer, significantly increasing total interest. Use Add comparison scenario to compare both tenures side by side — or take the longer tenure for cash-flow safety if your lender permits penalty-free monthly prepayments.",
      },
      {
        q: "How does the debt-to-income (DTI) affordability estimator work?",
        a: "It multiplies your gross monthly income by your chosen maximum debt ratio (36% by default), subtracts existing monthly debt obligations, and divides the remaining monthly budget by the payment per ₹1 of loan at your selected interest rate and tenure. It does not account for taxes, household expenses or lender-specific FOIR rules.",
      },
      {
        q: "Can I model quarterly or annual loan repayments instead of monthly?",
        a: "Yes. In the Variable rate & payment frequency section, switch Payment frequency to Quarterly (tenure multiple of 3 months) or Annual (tenure multiple of 12 months) to generate a period-by-period schedule.",
      },
      {
        q: "Are zero-interest (0% APR) loans supported?",
        a: "Yes. Entering an annual interest rate of 0% divides the principal evenly across the scheduled periods (Principal ÷ Periods) with ₹0 interest.",
      },
    ],
  },

  "scientific-calculator": {
    name: "Scientific Calculator",
    seoTitle: "Scientific Calculator — Trig, Logs, Powers & nCr",
    description:
      "Evaluate scientific expressions with sin, cos, tan in degrees or radians, logarithms, powers, factorials, nCr/nPr, pi/e constants and memory registers.",
    intro:
      "Evaluate compound mathematical expressions with a safe recursive-descent parser (no JavaScript eval): trigonometric and hyperbolic functions, logarithms, right-associative exponents, factorials, combinations/permutations, constants and memory.",
    workspaceHeading: "Evaluate scientific expressions",
    formulasHeading: "Operator precedence, syntax & worked examples",
    formulasIntro:
      "Expressions are parsed up to 500 characters and 100 nesting levels using explicit multiplication and standard mathematical operator precedence.",
    formulaBlockTitle: "Supported syntax & precedence rules",
    formulas: [
      {
        label: "Precedence (highest → lowest)",
        expression: "() & functions → n! → a^b (right-assoc.) → unary +/− → * / → + −",
        note: "e.g. 2^3^2 = 2^(3^2) = 512; −3^2 = −(3^2) = −9",
      },
      {
        label: "Trig & inverse trig",
        expression: "sin(x), cos(x), tan(x), asin(x), acos(x), atan(x)",
        note: "uses Degrees or Radians selector; rejects undefined tan(90°)",
      },
      {
        label: "Logs, roots & constants",
        expression: "log(x) [base 10], ln(x) [base e], sqrt(x), abs(x), pi, e, ans",
        note: "hyperbolic sinh, cosh, tanh, asinh, acosh, atanh also included",
      },
      {
        label: "Factorials & combinatorics",
        expression: "n!  ·  nCr(n, r) = n! ÷ (r!(n − r)!)  ·  nPr(n, r) = n! ÷ (n − r)!",
        note: "integers 0 ≤ r ≤ n ≤ 170",
      },
    ],
    examplesBlockTitle: "Worked scientific examples",
    examples: [
      {
        scenario: "Trigonometry in Degrees mode",
        calculation: "sin(30) + cos(60) = 0.5 + 0.5",
        result: "1",
      },
      {
        scenario: "Combinations and powers",
        calculation: "nCr(10, 3) * 2^3 = 120 × 8",
        result: "960",
      },
      {
        scenario: "Factorials and base-10 / natural logs",
        calculation: "5! + log(1000) + ln(e^2) = 120 + 3 + 2",
        result: "125",
      },
    ],
    steps: [
      "Type a mathematical expression using explicit multiplication (such as 2 * pi * 5) or click the scientific keypad buttons.",
      "Choose Degrees or Radians for trigonometric and inverse-trigonometric functions, and pick 4 to 15 significant digits of display precision.",
      "Open More functions for hyperbolic functions, abs(), nCr(n,r), nPr(n,r) and the previous-answer token ans.",
      "Press Enter or Evaluate (=) to commit the result to Ans and history, use MS/M+/MR/MC for memory, or export expression history to CSV.",
    ],
    faqs: [
      {
        q: "Why does typing 2pi or 3(4+5) show an unexpected-token message?",
        a: "To prevent ambiguity between multi-letter function names and variables, the parser requires explicit multiplication with * — write 2 * pi or 3 * (4 + 5). All functions also require parentheses around their arguments, such as sin(30) or sqrt(16).",
      },
      {
        q: "What is the difference between log(x) and ln(x) in this calculator?",
        a: "log(x) computes the common base-10 logarithm (so log(1000) = 3), while ln(x) computes the natural logarithm base e ≈ 2.718281828 (so ln(e^2) = 2).",
      },
      {
        q: "Why are factorials and nCr/nPr capped at 170?",
        a: "Standard IEEE-754 double-precision floating-point numbers top out around 1.7977 × 10^308. Because 170! ≈ 7.26 × 10^306 fits cleanly while 171! overflows to Infinity, capping integer factorials and combinatorics at 170 guarantees finite, accurate results.",
      },
      {
        q: "Does this calculator execute JavaScript eval() on my input?",
        a: "Never. Expressions are tokenised and evaluated by a dedicated recursive-descent math parser that accepts only numbers, mathematical operators, constants (pi, e, ans) and whitelisted math functions.",
      },
    ],
  },

  "unit-converter": {
    name: "Unit Converter",
    seoTitle: "Unit Converter — Length, Weight, Area & Volume",
    description:
      "Convert metric and imperial units across 17 categories including length, mass, area, volume, speed, data storage, pressure, energy and fuel consumption.",
    intro:
      "Convert values across 17 measurement categories — Length, Mass, Area, Volume, Speed, Acceleration, Time, Data storage, Energy, Pressure, Power, Frequency, Force, Torque, Density, Angle and Fuel consumption (plus Temperature) — with unit search, instant swap and multi-unit tables.",
    workspaceHeading: "Convert measurement units",
    formulasHeading: "Unit conversion factors & worked examples",
    formulasIntro:
      "Linear categories convert through exact SI base-unit ratios; fuel consumption uses reciprocal relations between distance-per-volume (mpg) and volume-per-distance (L/100 km).",
    formulaBlockTitle: "Exact reference conversion formulas",
    formulas: [
      {
        label: "Linear SI ratio",
        expression: "Result = Value × (Factor_from ÷ Factor_to)",
        note: "e.g. 1 Mile = 1,609.344 m; 1 Pound = 0.45359237 kg; 1 Acre = 4,046.8564224 m²",
      },
      {
        label: "Decimal vs binary data",
        expression: "1 GB = 10⁹ B (1,000 MB)  ·  1 GiB = 2³⁰ B = 1,073,741,824 B (1,024 MiB)",
        note: "both SI decimal and IEC binary prefixes included",
      },
      {
        label: "US vs Imperial volume",
        expression: "1 US gallon = 3.785411784 L  ·  1 Imperial gallon = 4.54609 L",
        note: "Imperial gallon is ~20.095% larger",
      },
      {
        label: "Reciprocal fuel economy",
        expression: "L/100 km = 235.214583 ÷ US mpg  =  282.480936 ÷ Imperial mpg",
        note: "requires a positive fuel value > 0",
      },
    ],
    examplesBlockTitle: "Worked unit conversion examples",
    examples: [
      {
        scenario: "5 Miles to Kilometres (Length)",
        calculation: "5 × 1,609.344 m ÷ 1,000 m",
        result: "8.04672 Kilometres",
      },
      {
        scenario: "1 Gibibyte (GiB) to decimal Megabytes (MB)",
        calculation: "1,073,741,824 bytes ÷ 1,000,000 bytes",
        result: "1,073.741824 Megabytes (vs 1 GB = 1,000 MB)",
      },
      {
        scenario: "30 US mpg to L/100 km (Fuel consumption)",
        calculation: "235.214583 ÷ 30",
        result: "7.8404861 L/100 km",
      },
    ],
    steps: [
      "Pick one of the 17 measurement categories (or filter categories and unit names using the search boxes).",
      "Enter the numeric value and select your From and To units; click Swap units to reverse the conversion instantly.",
      "Open Advanced conversion settings to adjust display precision (4 to 15 significant digits) or tick Show all target units for a full category table.",
      "Save frequently used conversions to session history or export your saved conversions to CSV.",
    ],
    faqs: [
      {
        q: "What is the difference between Megabytes (MB/GB) and Mebibytes (MiB/GiB)?",
        a: "Storage manufacturers and SI standards use decimal powers of 1,000 (1 MB = 1,000,000 bytes; 1 GB = 1,000,000,000 bytes), whereas operating systems and memory specs often use IEC binary powers of 1,024 (1 MiB = 1,048,576 bytes; 1 GiB = 1,073,741,824 bytes). That is why a 1 TB (10^12 B) drive reports about 931.32 GiB.",
      },
      {
        q: "Why does converting mpg to L/100 km get smaller as mpg gets larger?",
        a: "Miles per gallon measures distance travelled per unit of fuel (higher is more efficient), while litres per 100 kilometres measures fuel consumed over a fixed distance (lower is more efficient). Because they are mathematical reciprocals, doubling mpg halves L/100 km.",
      },
      {
        q: "How do US gallons and UK Imperial gallons differ?",
        a: "One US liquid gallon is defined as 231 cubic inches (exactly 3.785411784 litres), while one UK Imperial gallon is defined as exactly 4.54609 litres — making an Imperial gallon roughly 1.20095 US gallons.",
      },
      {
        q: "Why are Month and Year in the Time category fixed at 30 and 365 days?",
        a: "Pure unit conversion requires constant SI second factors (1 Month = 2,592,000 s; 1 Year = 31,536,000 s). When you need real calendar month lengths and leap years between two dates, use the Date Difference Calculator or Time Converter's calendar duration section.",
      },
    ],
  },

  "temperature-converter": {
    name: "Temperature Converter",
    seoTitle: "Temperature Converter — °C, °F, Kelvin & Rankine",
    description:
      "Convert temperatures between Celsius (°C), Fahrenheit (°F), Kelvin (K) and Rankine (°R) with exact formulas, comparison diffs and absolute-zero checks.",
    intro:
      "Convert temperatures accurately across Celsius, Fahrenheit, Kelvin and Rankine with physical absolute-zero validation, adjustable significant digits, all-scale reference tables and two-temperature difference comparison.",
    workspaceHeading: "Convert temperature scales",
    formulasHeading: "Temperature conversion formulas & worked examples",
    formulasIntro:
      "Every scale converts through Kelvin so offsets as well as degree sizes are handled accurately, and temperatures below physical absolute zero (0 K) are rejected.",
    formulaBlockTitle: "Exact scale formulas & absolute zero",
    formulas: [
      {
        label: "Celsius ↔ Fahrenheit",
        expression: "°F = (°C × 9 ÷ 5) + 32   ·   °C = (°F − 32) × 5 ÷ 9",
        note: "scales cross at −40 °C = −40 °F",
      },
      {
        label: "Celsius ↔ Kelvin",
        expression: "K = °C + 273.15   ·   °C = K − 273.15",
        note: "1 °C step equals 1 K step",
      },
      {
        label: "Kelvin ↔ Rankine",
        expression: "°R = K × 9 ÷ 5   ·   K = °R × 5 ÷ 9",
        note: "°R = °F + 459.67",
      },
      {
        label: "Physical lower bounds",
        expression: "0 K  =  0 °R  =  −273.15 °C  =  −459.67 °F",
        note: "inputs below absolute zero return a clear validation message",
      },
    ],
    examplesBlockTitle: "Worked temperature examples",
    examples: [
      {
        scenario: "Boiling point of water at 1 atm (100 °C)",
        calculation: "(100 × 9 ÷ 5) + 32 = 212 °F · 100 + 273.15 = 373.15 K",
        result: "212 °F · 373.15 K · 671.67 °R",
      },
      {
        scenario: "Normal human body reference (98.6 °F)",
        calculation: "(98.6 − 32) × 5 ÷ 9 = 66.6 × 5 ÷ 9",
        result: "37 °C · 310.15 K",
      },
      {
        scenario: "Standard lab reference (25 °C)",
        calculation: "25 + 273.15 = 298.15 K · 298.15 × 9 ÷ 5 = 536.67 °R",
        result: "77 °F · 298.15 K · 536.67 °R",
      },
      {
        scenario: "Equal-reading crossover (−40 °C)",
        calculation: "(−40 × 9 ÷ 5) + 32 = −72 + 32",
        result: "−40 °F (233.15 K)",
      },
    ],
    steps: [
      "Enter a temperature value and pick your From and To scales from Celsius, Fahrenheit, Kelvin or Rankine.",
      "Click Swap units to flip source and destination scales, or tick Show all target units under Advanced conversion settings to see all four scales at once.",
      "Open Compare another temperature to compute the exact °C / K temperature difference between two readings recorded in different units.",
      "Adjust significant digits (4 to 15) and save or export conversion rows to CSV if needed.",
    ],
    faqs: [
      {
        q: "Why does the calculator reject −300 °C or −500 °F?",
        a: "Zero Kelvin (0 K = −273.15 °C = −459.67 °F = 0 °R) is absolute zero, the thermodynamic floor of physical temperature. Values below those thresholds represent impossible states on standard temperature scales, so the tool flags them instead of returning a misleading negative Kelvin figure.",
      },
      {
        q: "Why is a 10 °C temperature change equal to 18 °F instead of 50 °F?",
        a: "Converting a specific temperature reading includes the +32 offset (°F = °C × 9/5 + 32), so 10 °C is 50 °F. When comparing a temperature difference (ΔT), the +32 offsets cancel out and only the 9/5 scale ratio applies: a 10 °C rise equals a 10 K rise and an 18 °F rise. Use Compare another temperature to compute ΔT directly.",
      },
      {
        q: "What is the Rankine (°R) temperature scale used for?",
        a: "Rankine is an absolute thermodynamic temperature scale like Kelvin, starting at 0 °R = absolute zero, but using Fahrenheit-sized degree increments (1 °R = 1 °F = 5/9 K). It appears in aerospace, combustion and US engineering thermodynamics.",
      },
      {
        q: "At what temperature do Celsius and Fahrenheit read the exact same number?",
        a: "Setting °C = (°C × 9/5) + 32 gives −4/5 × °C = 32, or −40. Thus −40 °C equals −40 °F (233.15 K).",
      },
    ],
  },

  "time-converter": {
    name: "Time Converter",
    seoTitle: "Time Converter — Durations, Work Hours & Zones",
    description:
      "Convert time durations, shift local calendar dates, measure scheduled working hours between timestamps, and plan meetings across global IANA time zones.",
    intro:
      "Convert durations from milliseconds to years, add or subtract exact calendar months and years without fixed-day drift, measure scheduled business working hours between two local timestamps, and convert meeting times across global IANA time zones.",
    workspaceHeading: "Convert time durations",
    formulasHeading: "Duration, working-hours & time-zone rules",
    formulasIntro:
      "Combines fixed SI duration ratios with calendar-aware date shifting, custom weekly working-hour overlap math, and daylight-saving-aware IANA time-zone resolution.",
    formulaBlockTitle: "How each time tool calculates",
    formulas: [
      {
        label: "Fixed duration units",
        expression: "1 min = 60 s · 1 hr = 3,600 s · 1 day = 86,400 s · 1 wk = 604,800 s",
        note: "duration Month = 30 d (720 hr); duration Year = 365 d (8,760 hr)",
      },
      {
        label: "Scheduled working hours",
        expression: "∑ max(0, min(End, ShiftEnd_d) − max(Start, ShiftStart_d))",
        note: "summed across selected working weekdays over up to 10 years",
      },
      {
        label: "Calendar duration shift",
        expression: "shiftCalendar(Date, ±N, days|weeks|months|years) keeping HH:MM",
        note: "clamps month-end dates and rejects nonexistent DST gap times",
      },
      {
        label: "IANA time-zone planner",
        expression: "Local Civil Time (Source Zone) → UTC Instant → Target Zones (1–10)",
        note: "detects DST spring-forward gaps & fall-back repeated hours (1900–2099)",
      },
    ],
    examplesBlockTitle: "Worked duration & time-zone examples",
    examples: [
      {
        scenario: "Convert 2.5 Days to Hours (duration converter)",
        calculation: "2.5 × 86,400 s ÷ 3,600 s",
        result: "60 Hours (3,600 Minutes)",
      },
      {
        scenario: "Working hours: Mon 2026-11-09 14:00 to Wed 2026-11-11 11:30 (Mon–Fri, 09:00–17:00)",
        calculation: "3.0 hr (Mon) + 8.0 hr (Tue) + 2.5 hr (Wed)",
        result: "13.50 working hours (out of 45.50 elapsed hours)",
      },
      {
        scenario: "Meeting at 2026-11-10 15:00 in Asia/Kolkata",
        calculation: "Resolves to UTC 2026-11-10T09:30:00.000Z",
        result: "09:30 GMT in Europe/London · 04:30 GMT-5 in America/New_York",
      },
    ],
    steps: [
      "Use the top converter to translate fixed durations between milliseconds, seconds, minutes, hours, days, weeks, 30-day months and 365-day years.",
      "Use Timestamp & working hours to measure both total elapsed time and scheduled work-shift hours between two local timestamps.",
      "Use Add calendar durations when adding months or years should respect real 28/29/30/31-day calendar months while keeping the local clock time.",
      "Use Compare time zones to convert a meeting time from one source IANA zone (e.g. Asia/Kolkata) into up to 10 destination zones with CSV export.",
    ],
    faqs: [
      {
        q: "When should I use the top duration converter versus Add calendar durations?",
        a: "Use the top converter for fixed-elapsed-second math where 1 month = 30 days (720 hours) and 1 year = 365 days (8,760 hours). Use Add calendar durations whenever you want civil calendar rules — for instance, adding 1 calendar month to 2026-01-31 10:30 to get 2026-02-28 10:30.",
      },
      {
        q: "How does the meeting planner handle daylight-saving time (DST) clock changes?",
        a: "It resolves civil times against your browser's IANA time-zone database for the exact date chosen (years 1900–2099). If you pick a local clock time skipped during a spring-forward jump, it alerts you that the time does not exist; if a clock hour repeats during a fall-back transition, you can choose the earlier or later occurrence.",
      },
      {
        q: "How are working hours calculated across multiple days and weekends?",
        a: "For each calendar day between your start and end timestamps, the tool checks whether that weekday is ticked in your schedule and adds only the overlap between [Start, End] and that day's [Workday starts, Workday ends] window — up to a maximum span of ten years.",
      },
      {
        q: "What format should I enter for time zones in the meeting planner?",
        a: "Use standard IANA Region/City identifiers such as Asia/Kolkata, Europe/London, America/New_York, America/Los_Angeles, Asia/Tokyo or Australia/Sydney, separated by commas (up to 10 destination zones).",
      },
    ],
  },
};
