import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Calculator cluster.
 *
 * This is the one cluster where Indian intent is genuinely strong: GST is an
 * India-specific tax with CGST/SGST/IGST mechanics, and the EMI tool's natural
 * audience quotes amounts in rupees. Those phrasings are accurate here.
 *
 * The calculators are deliberately separated from each other even where the
 * maths overlaps — `percentage-calculator` owns generic percentages while
 * `discount-calculator` owns price-and-offer language, so "percent off" belongs
 * to the discount tool and not both.
 */
export const calculatorsKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "percentage-calculator",
    primary: "percentage calculator",
    secondary: [
      "percentage increase calculator",
      "what is x percent of y",
      "percentage difference calculator",
      "reverse percentage calculator",
      "marks percentage calculator",
    ],
    groups: {
      alternativeName: ["percent calculator", "percentage finder"],
      synonym: [
        "work out a percentage of a number",
        "find the percent change between two numbers",
        "calculate what percent one number is of another",
      ],
      action: [
        "calculate a percentage increase or decrease",
        "find the original value before a percentage was applied",
        "work out exam marks as a percentage",
      ],
      longTail: [
        "calculate percentage increase between two numbers",
        "find the original amount before a percentage increase",
        "work out what percentage 45 is of 180",
      ],
      problem: [
        "need the percentage change between two figures",
        "know the final value and the percent but not the original",
      ],
      question: [
        "how to calculate percentage",
        "how do i work out percentage increase",
        "what is the formula for percentage difference",
      ],
      qualifier: [
        "percentage calculator online free",
        "percent calculator with formula",
      ],
      india: [
        "percentage kaise nikale",
        "marks ka percentage kaise nikale",
        "percentage nikalne ka tarika",
      ],
    },
    audience: "Students checking marks; anyone comparing two figures",
  },
  {
    slug: "bmi-calculator",
    primary: "bmi calculator",
    secondary: [
      "bmi chart for adults",
      "bmi calculator in kg and cm",
      "healthy weight range calculator",
      "bmi calculator in feet and inches",
      "what is a normal bmi",
    ],
    groups: {
      alternativeName: ["body mass index calculator", "bmi checker"],
      synonym: [
        "check my body mass index",
        "work out bmi from height and weight",
        "find the healthy weight for my height",
      ],
      action: [
        "calculate bmi in kilograms and centimetres",
        "calculate bmi using feet and inches",
        "see the healthy weight range for a height",
      ],
      longTail: [
        "calculate bmi in kg and cm for an adult",
        "find the healthy weight range for my height in feet",
        "work out bmi using imperial measurements",
      ],
      problem: [
        "know the height and weight but not whether the ratio is healthy",
        "not sure which bmi category the result falls into",
      ],
      question: [
        "how is bmi calculated",
        "what is a healthy bmi",
        "is bmi accurate for everyone",
      ],
      qualifier: [
        "bmi calculator online free",
        "free bmi calculator metric and imperial",
      ],
      india: ["bmi kaise nikale", "bmi chart in kg"],
    },
    audience:
      "People checking a screening indicator for themselves, with its limits stated",
  },
  {
    slug: "discount-calculator",
    primary: "discount calculator",
    secondary: [
      "percent off calculator",
      "sale price calculator",
      "stacked discount calculator",
      "discount and gst calculator",
      "compare two offers",
    ],
    groups: {
      alternativeName: [
        "discount finder",
        "sale price finder",
        "off calculator",
      ],
      synonym: [
        "work out a sale price",
        "find how much money a discount saves",
        "calculate the price after a percentage off",
      ],
      action: [
        "calculate the final price after a discount",
        "stack two or more sequential discounts",
        "compare which of two offers saves more",
      ],
      longTail: [
        "calculate the real discount when two offers stack",
        "work out the sale price after 30 percent off",
        "compare buy one get one against a flat discount",
      ],
      problem: [
        "two offers are hard to compare without working both out",
        "the second discount applies to the already discounted price",
      ],
      question: [
        "how to calculate a discount",
        "how do i work out 30 percent off",
        "do stacked discounts add up",
      ],
      qualifier: [
        "discount calculator online free",
        "percent off calculator free",
      ],
      india: ["discount kaise nikale", "sale price kaise calculate kare"],
    },
    audience: "Shoppers comparing offers during a sale",
  },
  {
    slug: "gst-calculator",
    primary: "gst calculator",
    secondary: [
      "gst inclusive and exclusive calculator",
      "cgst sgst calculator",
      "igst calculator",
      "reverse gst calculation",
      "gst calculator india",
    ],
    groups: {
      alternativeName: [
        "gst calculator india",
        "goods and services tax calculator",
      ],
      synonym: [
        "add gst to an amount",
        "remove gst from a gross amount",
        "split gst into cgst and sgst",
      ],
      action: [
        "add 18 percent gst to a base price",
        "extract gst from a tax-inclusive total",
        "split gst for an intra-state or inter-state supply",
      ],
      longTail: [
        "calculate cgst and sgst separately for an intra-state invoice",
        "find the base price from a gst inclusive amount",
        "check an invoice line for the correct gst amount",
      ],
      problem: [
        "invoice total already includes gst and the base price is needed",
        "unsure whether the supply should be cgst sgst or igst",
      ],
      question: [
        "how to calculate gst",
        "how do i remove gst from a total",
        "what is the difference between cgst sgst and igst",
      ],
      qualifier: [
        "gst calculator online free",
        "free gst calculator for invoices",
      ],
      india: [
        "gst kaise nikale",
        "gst calculation formula in hindi",
        "cgst sgst kaise nikale",
      ],
    },
    audience:
      "Indian freelancers, shopkeepers and accountants checking invoices",
  },
  {
    slug: "age-calculator",
    primary: "age calculator",
    secondary: [
      "how old am i",
      "age calculator by date of birth",
      "age in days calculator",
      "age as on date calculator",
      "birthday countdown",
    ],
    groups: {
      alternativeName: ["date of birth calculator", "age finder"],
      synonym: [
        "work out exact age from a birth date",
        "find how many days old someone is",
        "calculate age in years months and days",
      ],
      action: [
        "calculate exact age from a date of birth",
        "find age as on a specific date",
        "count down to the next birthday",
      ],
      longTail: [
        "calculate exact age in years months and days",
        "find how many days old i am today",
        "work out age as on a future date for a form",
      ],
      problem: [
        "a form needs age as on a cutoff date, not today",
        "need exact age including months and days",
      ],
      question: [
        "how is age calculated",
        "how many days old am i",
        "how do i calculate age on a specific date",
      ],
      qualifier: [
        "age calculator online free",
        "free date of birth age calculator",
      ],
      india: ["umar kaise nikale", "age kaise calculate kare"],
    },
    audience: "People filling forms with an age-as-on-date cutoff",
  },
  {
    slug: "date-difference-calculator",
    primary: "date difference calculator",
    secondary: [
      "days between two dates",
      "business days calculator",
      "add days to date",
      "date calculator online",
      "working days excluding weekends",
    ],
    groups: {
      alternativeName: [
        "date calculator",
        "days calculator",
        "date span calculator",
      ],
      synonym: [
        "count days from one date to another",
        "find how many weeks between dates",
        "work out a date a number of days from now",
      ],
      action: [
        "count calendar days between two dates",
        "count business days excluding weekends",
        "add or subtract days weeks and months from a date",
      ],
      longTail: [
        "count business days between two dates excluding weekends",
        "work out the date 90 days from today",
        "count days including or excluding the end date",
      ],
      problem: [
        "a deadline is stated in working days, not calendar days",
        "need a date exactly six weeks from now",
      ],
      question: [
        "how many days between two dates",
        "how do i add 30 days to a date",
        "how are business days counted",
      ],
      qualifier: [
        "date difference calculator online free",
        "days between dates free",
      ],
      india: ["do dates ke beech kitne din", "date kaise calculate kare"],
    },
    audience: "People working to deadlines, notice periods and SLAs",
  },
  {
    slug: "emi-calculator",
    primary: "emi calculator",
    secondary: [
      "home loan emi calculator",
      "car loan emi calculator",
      "personal loan emi india",
      "loan amortization schedule",
      "emi formula in rupees",
    ],
    groups: {
      alternativeName: ["loan emi calculator", "instalment calculator"],
      synonym: [
        "work out the monthly instalment on a loan",
        "calculate loan interest and principal split",
        "find the monthly payment for a loan amount",
      ],
      action: [
        "calculate the emi on a home loan",
        "see the month by month amortisation schedule",
        "work out total interest over the loan tenure",
      ],
      longTail: [
        "calculate home loan emi with total interest payable",
        "see how much of each emi goes to interest",
        "work out personal loan emi at a given interest rate",
      ],
      problem: [
        "need to know the monthly outflow before committing to a loan",
        "want the total interest cost, not just the emi",
      ],
      question: [
        "how is emi calculated",
        "what is the emi formula",
        "how much interest will i pay over the loan",
      ],
      qualifier: [
        "emi calculator online free",
        "free emi calculator with schedule",
      ],
      india: [
        "emi kaise nikale",
        "home loan emi kaise calculate kare",
        "byaj kaise nikale",
      ],
    },
    audience: "Borrowers comparing loan offers before signing",
  },
  {
    slug: "loan-calculator",
    primary: "loan calculator",
    secondary: [
      "loan repayment calculator",
      "loan affordability calculator",
      "variable interest rate loan",
      "prepayment effect on loan",
      "loan tenure calculator",
    ],
    groups: {
      alternativeName: ["repayment calculator", "borrowing calculator"],
      synonym: [
        "model a loan repayment schedule",
        "compare two loan scenarios",
        "see what happens if the rate changes",
      ],
      action: [
        "compare two loan scenarios side by side",
        "model the effect of a prepayment",
        "see how a rate change moves the instalment",
      ],
      longTail: [
        "compare a 15 year and a 20 year loan repayment",
        "model how a variable rate step changes the instalment",
        "see how much a lump sum prepayment saves in interest",
      ],
      problem: [
        "the loan rate is variable and the instalment may change",
        "unsure what loan size is affordable monthly",
      ],
      question: [
        "how do i compare two loans",
        "how does prepayment affect a loan",
        "what loan amount can i afford",
      ],
      qualifier: [
        "loan calculator online free",
        "free repayment calculator with schedule",
      ],
      india: [
        "loan repayment kaise calculate kare",
        "prepayment karne se kitna bachega",
      ],
    },
    audience: "Borrowers modelling scenarios, especially variable rates",
  },
  {
    slug: "scientific-calculator",
    primary: "scientific calculator",
    secondary: [
      "scientific calculator online free",
      "trigonometry calculator degrees",
      "log calculator",
      "permutation combination calculator",
      "calculator with fractions and powers",
    ],
    groups: {
      alternativeName: ["engineering calculator", "advanced calculator"],
      synonym: [
        "calculator with sin cos and tan",
        "calculate logs and powers",
        "work out permutations and combinations",
      ],
      action: [
        "evaluate an expression with trigonometry in degrees",
        "calculate a factorial or a permutation",
        "use memory and constants in a calculation",
      ],
      longTail: [
        "evaluate a trigonometry expression in degrees not radians",
        "calculate permutation and combination values",
        "use a scientific calculator with memory and constants",
      ],
      problem: [
        "no scientific calculator available and a phone one is not enough",
        "need trigonometry in degrees while the tool defaults to radians",
      ],
      question: [
        "how do i use a scientific calculator",
        "how do i calculate ncr and npr",
        "how do i switch between degrees and radians",
      ],
      qualifier: [
        "scientific calculator online",
        "free online scientific calculator",
      ],
      india: ["scientific calculator online use kaise kare"],
    },
    audience: "Students and engineers without a physical calculator",
  },
  {
    slug: "unit-converter",
    primary: "unit converter",
    secondary: [
      "length converter",
      "kg to lbs converter",
      "square feet to square metres",
      "data size converter",
      "unit conversion table",
    ],
    groups: {
      alternativeName: ["measurement converter", "unit conversion tool"],
      synonym: [
        "convert one unit into another",
        "change units of measurement",
        "translate metric into imperial",
      ],
      action: [
        "convert kilograms to pounds",
        "convert square feet to square metres",
        "convert between data sizes like mb and gb",
      ],
      longTail: [
        "convert square feet to square metres for a property",
        "convert kg to lbs and back with the exact factor",
        "convert data sizes between mb gb and tb",
      ],
      problem: [
        "property measurements are quoted in a unit i do not use",
        "need the exact conversion factor, not a rounded one",
      ],
      question: [
        "how many square feet in a square metre",
        "how do i convert kg to lbs",
        "how many mb in a gb",
      ],
      qualifier: ["unit converter online free", "free measurement converter"],
      india: [
        "square feet to square meter kaise convert kare",
        "kg to lbs kaise convert kare",
      ],
    },
    audience: "People comparing measurements across two unit systems",
  },
  {
    slug: "temperature-converter",
    primary: "temperature converter",
    secondary: [
      "celsius to fahrenheit",
      "fahrenheit to celsius formula",
      "kelvin to celsius converter",
      "body temperature conversion",
      "oven temperature conversion",
    ],
    groups: {
      alternativeName: ["temp converter", "degree converter"],
      synonym: [
        "convert degrees between scales",
        "change celsius into fahrenheit",
        "switch a temperature to kelvin",
      ],
      action: [
        "convert 180 celsius to fahrenheit for an oven",
        "convert a body temperature between scales",
        "convert kelvin to celsius",
      ],
      longTail: [
        "convert oven temperatures between celsius and fahrenheit",
        "convert body temperature from fahrenheit to celsius",
        "convert a temperature and reject impossible values below absolute zero",
      ],
      problem: [
        "a recipe is in fahrenheit and the oven is in celsius",
        "a thermometer reading needs converting for a form",
      ],
      question: [
        "how do i convert celsius to fahrenheit",
        "what is the fahrenheit to celsius formula",
        "what is absolute zero in celsius",
      ],
      qualifier: [
        "temperature converter online free",
        "celsius to fahrenheit converter free",
      ],
      india: ["celsius ko fahrenheit me kaise badle"],
    },
    audience: "Cooks, travellers and patients reading a foreign thermometer",
  },
  {
    slug: "time-converter",
    primary: "time converter",
    secondary: [
      "hours to minutes converter",
      "add time calculator",
      "work hours calculator with break",
      "time zone converter",
      "duration calculator",
    ],
    groups: {
      alternativeName: ["time calculator", "duration converter"],
      synonym: [
        "convert hours into minutes",
        "add two durations together",
        "work out elapsed time between two clock times",
      ],
      action: [
        "total working hours across a break",
        "add or subtract a duration from a date and time",
        "convert a duration between hours minutes and seconds",
      ],
      longTail: [
        "calculate total working hours minus an unpaid break",
        "add 2 hours 45 minutes to a start time",
        "translate a duration into another time zone",
      ],
      problem: [
        "timesheet needs total hours with a break deducted",
        "a meeting was announced in another time zone",
      ],
      question: [
        "how do i calculate hours worked",
        "how do i add time durations",
        "how do i convert time zones",
      ],
      qualifier: ["time converter online free", "work hours calculator free"],
      india: ["kitne ghante hue", "working hours kaise calculate kare"],
    },
    audience: "People doing timesheets, shifts and cross-time-zone scheduling",
  },
];
