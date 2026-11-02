export const calculatorInfo: Record<
  string,
  {
    name: string;
    description: string;
    steps: string[];
    faqs: { q: string; a: string }[];
  }
> = {
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
