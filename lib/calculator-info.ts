export const calculatorInfo: Record<
  string,
  {
    name: string;
    description: string;
    steps: string[];
    faqs: { q: string; a: string }[];
  }
> = {
  "time-converter": {
    name: "Time Converter",
    description:
      "Convert durations and add or subtract them from a local date and time.",
    steps: [
      "Enter a duration and choose units. Optionally select a date and operation.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "How long are a month and year?",
        a: "For duration conversion a month is 30 days and a year is 365 days, not calendar periods. Date arithmetic uses elapsed time.",
      },
    ],
  },
  "temperature-converter": {
    name: "Temperature Converter",
    description:
      "Convert Celsius, Fahrenheit and Kelvin with absolute-zero validation.",
    steps: [
      "Enter a temperature and select source and destination units.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "Can a temperature be negative?",
        a: "Celsius and Fahrenheit can be negative, but physical temperatures cannot fall below absolute zero.",
      },
    ],
  },
  "unit-converter": {
    name: "Unit Converter",
    description: "Convert common units of length, mass, energy, data and more.",
    steps: [
      "Choose a category, value and units; use search and swap as needed.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "What is the fuel economy convention?",
        a: "US and imperial miles per gallon use different gallons and are reciprocal to litres per 100 kilometres.",
      },
    ],
  },
  "scientific-calculator": {
    name: "Scientific Calculator",
    description:
      "Evaluate scientific expressions with trigonometry, powers, constants and memory.",
    steps: [
      "Type an expression or use the keypad; choose degree or radian mode.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "How are expressions evaluated?",
        a: "A bounded mathematical parser evaluates the expression; JavaScript eval is not used. Functions require parentheses.",
      },
    ],
  },
  "loan-calculator": {
    name: "Loan Calculator",
    description:
      "Estimate loan payments, compare scenarios and review amortization.",
    steps: [
      "Enter loan details and add scenarios to compare.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "Are these lender quotes?",
        a: "No. These estimates assume a fixed rate and monthly compounding with no fees or taxes.",
      },
    ],
  },
  "emi-calculator": {
    name: "EMI Calculator",
    description:
      "Estimate monthly installments and see a complete repayment schedule.",
    steps: [
      "Enter principal, annual rate and tenure. Add an optional extra monthly payment.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "How is interest calculated?",
        a: "The estimate uses a fixed rate divided by 12, applied to the monthly outstanding balance. Fees, taxes and rate changes are excluded.",
      },
    ],
  },
  "date-difference-calculator": {
    name: "Date Difference Calculator",
    description:
      "Find calendar and business-day differences or add and subtract days.",
    steps: [
      "Choose a start and end date; optionally include the end date.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "Are holidays excluded from business days?",
        a: "Business days count Monday to Friday; add custom holiday dates to exclude them. No holiday calendar is loaded automatically.",
      },
    ],
  },
  "age-calculator": {
    name: "Age Calculator",
    description:
      "Calculate exact age on any date and count down to a birthday.",
    steps: [
      "Choose a date of birth and the date to calculate age on.",
      "Review the result and its assumptions.",
    ],
    faqs: [
      {
        q: "How are leap-day birthdays handled?",
        a: "A February 29 birthday is observed on February 28 in non-leap years. Dates are calculated as calendar dates without time zones.",
      },
    ],
  },
  "percentage-calculator": {
    name: "Percentage Calculator",
    description:
      "Calculate percentages, changes and reverse percentages with clear formulas.",
    steps: [
      "Choose a calculation.",
      "Enter both values to see the result and formula.",
      "Save calculations to the session history if needed.",
    ],
    faqs: [
      {
        q: "How is percentage difference calculated?",
        a: "The absolute difference is divided by the average of the absolute magnitudes, then multiplied by 100.",
      },
      {
        q: "What does reverse percentage mean?",
        a: "It finds the original amount before the specified percentage change. Use a negative change for a decrease.",
      },
    ],
  },
  "bmi-calculator": {
    name: "BMI Calculator",
    description:
      "Estimate body mass index and the healthy-weight range for your height.",
    steps: [
      "Choose metric or imperial units.",
      "Enter your height and weight.",
      "Review the result alongside the screening disclaimer.",
    ],
    faqs: [
      {
        q: "Is BMI a diagnosis?",
        a: "No. BMI is a screening measure, not a diagnosis. It does not distinguish fat from muscle and may not be appropriate for children, pregnant people, or all populations. Consult a clinician.",
      },
      {
        q: "How is BMI calculated?",
        a: "Weight in kilograms divided by height in metres squared. Adult categories use common WHO thresholds.",
      },
    ],
  },
  "discount-calculator": {
    name: "Discount Calculator",
    description:
      "Calculate sequential discounts, savings and tax, or find the original price.",
    steps: [
      "Enter a price and one or more comma-separated discounts.",
      "Optionally add tax after the discounts.",
      "Choose reverse mode to find the original price before discounts.",
    ],
    faqs: [
      {
        q: "How are multiple discounts applied?",
        a: "Sequentially: each discount applies to the remaining price, not the original price.",
      },
      {
        q: "What does reverse mode use?",
        a: "Enter the price after discounts but before tax. The calculator finds the original price.",
      },
    ],
  },
  "gst-calculator": {
    name: "GST Calculator",
    description:
      "Add or remove Indian GST and see the taxable amount and tax breakdown.",
    steps: [
      "Enter the amount and GST rate.",
      "Choose whether the amount includes GST.",
      "See the taxable amount, total and tax breakdown.",
    ],
    faqs: [
      {
        q: "When are CGST and SGST shown?",
        a: "For an intra-state supply, GST is generally split equally between CGST and SGST. IGST is shown as the alternative for an inter-state supply; they are not added together.",
      },
      {
        q: "Is this tax advice?",
        a: "No. Rates and treatment vary by transaction. Confirm the applicable rules with a tax professional.",
      },
    ],
  },
};
