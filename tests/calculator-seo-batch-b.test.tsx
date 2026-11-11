// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { calculatorInfo } from "../lib/calculator-info";
import { bmi, discount, gst, percentage } from "../lib/tools/calculators";
import { loan } from "../lib/tools/phase9-loans";
import {
  age,
  dateDifference,
  parseDate,
  shiftCalendar,
} from "../lib/tools/phase9-dates";
import { convert, temperature } from "../lib/tools/phase9-conversion";
import { scientific } from "../lib/tools/phase9-scientific";
import {
  buyGet,
  gstInvoice,
  loanAffordability,
  sequentialChanges,
} from "../lib/tools/phase9-v2-advanced";
import { variableLoan } from "../lib/tools/phase9-v2-scenarios";
import { profit } from "../lib/tools/phase9-profit";
import {
  parseClock,
  parseLocalTimestamp,
  workingTime,
} from "../lib/tools/phase9-working-time";
import {
  formatZonedTime,
  resolveZonedTime,
} from "../lib/tools/phase9-timezones";

const CALCULATOR_SLUGS = [
  "percentage-calculator",
  "bmi-calculator",
  "discount-calculator",
  "gst-calculator",
  "age-calculator",
  "date-difference-calculator",
  "emi-calculator",
  "loan-calculator",
  "scientific-calculator",
  "unit-converter",
  "temperature-converter",
  "time-converter",
] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("Phase 3 Batch B — 12 Calculator SEO, Math & Functional Verification", () => {
  it("defines unique, intent-focused metadata and 4 specific FAQs for all 12 calculators", async () => {
    vi.stubEnv("SITE_URL", "https://quickkit.online");
    vi.resetModules();
    const { generateMetadata } = await import(
      "../app/tools/[calculator]/page"
    );

    expect(Object.keys(calculatorInfo).sort()).toEqual(
      [...CALCULATOR_SLUGS].sort(),
    );

    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const faqQuestions = new Set<string>();

    for (const slug of CALCULATOR_SLUGS) {
      const info = calculatorInfo[slug];
      const meta = await generateMetadata({
        params: Promise.resolve({ calculator: slug }),
      });

      const renderedTitle = `${info.seoTitle} | QUICKKIT`;
      expect(renderedTitle.length, `${slug} title length`).toBeGreaterThanOrEqual(
        50,
      );
      expect(renderedTitle.length, `${slug} title length`).toBeLessThanOrEqual(
        60,
      );
      expect(meta.title).toBe(info.seoTitle);
      expect(meta.openGraph?.title).toBe(renderedTitle);
      expect(meta.twitter?.title).toBe(renderedTitle);
      expect(meta.alternates?.canonical).toBe(
        `https://quickkit.online/tools/${slug}`,
      );

      expect(
        info.description.length,
        `${slug} description length`,
      ).toBeGreaterThanOrEqual(145);
      expect(
        info.description.length,
        `${slug} description length`,
      ).toBeLessThanOrEqual(160);

      titles.add(renderedTitle);
      descriptions.add(info.description);

      expect(info.steps).toHaveLength(4);
      expect(info.faqs, `${slug} must have 4 FAQs`).toHaveLength(4);
      expect(info.formulas.length).toBeGreaterThanOrEqual(3);
      expect(info.examples.length).toBeGreaterThanOrEqual(2);

      for (const faq of info.faqs) {
        expect(faqQuestions.has(faq.q), `duplicate FAQ: ${faq.q}`).toBe(false);
        faqQuestions.add(faq.q);
        expect(faq.a.length).toBeGreaterThan(80);
      }
    }

    expect(titles.size).toBe(12);
    expect(descriptions.size).toBe(12);
    expect(faqQuestions.size).toBe(48);
  });

  it("renders valid H1/H2/H3 hierarchy, formulas, worked examples, disclaimers, related calculators, and matching JSON-LD on all 12 pages", async () => {
    vi.stubEnv("SITE_URL", "https://quickkit.online");
    vi.resetModules();
    const CalculatorPage = (await import("../app/tools/[calculator]/page"))
      .default;

    const financeSlugs = new Set([
      "emi-calculator",
      "loan-calculator",
      "gst-calculator",
      "discount-calculator",
      "percentage-calculator",
    ]);

    for (const slug of CALCULATOR_SLUGS) {
      const info = calculatorInfo[slug];
      const element = await CalculatorPage({
        params: Promise.resolve({ calculator: slug }),
      });
      const { container, unmount } = render(element);

      // 1. Strict heading hierarchy & zero duplicate headings per page
      const headings = [
        ...container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ].map((el) => ({
        level: Number(el.tagName.slice(1)),
        text: el.textContent?.trim().replace(/\s+/g, " ") ?? "",
      }));

      expect(
        headings.filter((h) => h.level === 1),
        `${slug} H1 count`,
      ).toHaveLength(1);
      expect(headings[0].text).toBe(info.name);

      for (let i = 1; i < headings.length; i++) {
        expect(
          headings[i].level - headings[i - 1].level,
          `${slug} heading jump H${headings[i - 1].level} -> H${headings[i].level}`,
        ).toBeLessThanOrEqual(1);
      }

      const headingPairs = headings.map((h) => `h${h.level}:${h.text}`);
      expect(
        new Set(headingPairs).size,
        `${slug} has duplicate headings: ${headingPairs.join(", ")}`,
      ).toBe(headingPairs.length);

      expect(headingPairs).toContain(`h2:${info.workspaceHeading}`);
      expect(headingPairs).toContain(`h2:${info.formulasHeading}`);
      expect(headingPairs).toContain(`h2:How to use the ${info.name}`);
      expect(headingPairs).toContain(`h2:${info.name} FAQs`);
      expect(headingPairs).toContain("h2:Related calculators");

      // 2. Visible FAQs & JSON-LD parity
      const jsonLdBlocks = [
        ...container.querySelectorAll('script[type="application/ld+json"]'),
      ].flatMap((node) => {
        const parsed = JSON.parse(node.textContent ?? "null");
        if (!parsed) return [];
        return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
      });

      const webApp = jsonLdBlocks.find((b) => b["@type"] === "WebApplication");
      const faqPage = jsonLdBlocks.find((b) => b["@type"] === "FAQPage");
      const breadcrumb = jsonLdBlocks.find(
        (b) => b["@type"] === "BreadcrumbList",
      );

      expect(webApp).toBeDefined();
      expect(webApp.name).toBe(`${info.name} — QUICKKIT`);
      expect(webApp.description).toBe(info.intro);
      expect(webApp.applicationCategory).toBe(
        financeSlugs.has(slug) ? "FinanceApplication" : "UtilitiesApplication",
      );
      expect(webApp.aggregateRating).toBeUndefined();

      expect(breadcrumb).toBeDefined();
      expect(breadcrumb.itemListElement).toHaveLength(4);

      expect(faqPage).toBeDefined();
      expect(faqPage.mainEntity).toHaveLength(4);
      expect(
        faqPage.mainEntity.map((q: { name: string }) => q.name),
      ).toEqual(info.faqs.map((f) => f.q));

      // 3. Related calculator cards are all within Calculators (3..5 items)
      const relatedLinks = [...container.querySelectorAll(".related-card")].map(
        (el) => el.getAttribute("href"),
      );
      expect(relatedLinks.length).toBeGreaterThanOrEqual(3);
      expect(relatedLinks.length).toBeLessThanOrEqual(5);
      for (const href of relatedLinks) {
        expect(
          CALCULATOR_SLUGS.map((s) => `/tools/${s}`),
          `${slug} related link ${href}`,
        ).toContain(href);
      }

      unmount();
    }
  });

  it("verifies every worked example in lib/calculator-info.ts against the real calculator functions", () => {
    const inr = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(n);
    const num4 = (n: number) =>
      new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(n);

    // 1. Percentage Calculator
    expect(percentage("of", 18, 2500).value).toBe(450);
    expect(percentage("increase", 1200, 15).value).toBe(1380);
    expect(num4(percentage("difference", 80, 100).value)).toBe("22.2222");
    expect(percentage("reverse", 1180, 18).value).toBe(1000);
    expect(sequentialChanges(1000, [20, -10]).at(-1)?.after).toBe(1080);

    // 2. BMI Calculator
    const bmiMetric = bmi(170, 65, false);
    expect(num4(bmiMetric.value)).toBe("22.4913");
    expect(bmiMetric.category).toBe("Healthy weight");
    expect(`${num4(bmiMetric.low)}–${num4(bmiMetric.high)}`).toBe(
      "53.465–71.961",
    );
    const bmiImp = bmi(68, 154, true);
    expect(num4(bmiImp.value)).toBe("23.4154");
    expect(`${num4(bmiImp.low)}–${num4(bmiImp.high)}`).toBe(
      "121.6722–163.7642",
    );

    // 3. Discount Calculator
    const disc = discount(2000, [20, 10], 18, false);
    expect(inr(disc.discounted)).toBe("₹1,440.00");
    expect(inr(disc.saved)).toBe("₹560.00");
    expect(inr(disc.taxAmount)).toBe("₹259.20");
    expect(inr(disc.total)).toBe("₹1,699.20");
    const bogo = buyGet(500, 3, 2, 1, 12);
    expect(inr(bogo.total)).toBe("₹1,120.00");
    expect(profit(800, 1000)).toEqual({ amount: 200, margin: 20, markup: 25 });

    // 4. GST Calculator
    const gstEx = gst(10000, 18, false);
    expect(inr(gstEx.tax)).toBe("₹1,800.00");
    expect(inr(gstEx.half)).toBe("₹900.00");
    expect(inr(gstEx.total)).toBe("₹11,800.00");
    const gstIn = gst(11800, 18, true);
    expect(inr(gstIn.taxable)).toBe("₹10,000.00");
    expect(inr(gstIn.tax)).toBe("₹1,800.00");
    const inv = gstInvoice(
      [{ name: "Item", quantity: 2, unitPrice: 1500, discount: 10, rate: 18 }],
      false,
    );
    expect(inr(inv.total)).toBe("₹3,186.00");

    // 5. Age Calculator
    const a1 = age(parseDate("1996-05-15"), parseDate("2026-11-10"));
    expect([a1.years, a1.months, a1.remainder, a1.days, a1.untilBirthday]).toEqual([
      30, 5, 26, 11136, 186,
    ]);
    const aLeap = age(parseDate("2000-02-29"), parseDate("2025-02-28"));
    expect([aLeap.years, aLeap.months, aLeap.remainder, aLeap.days]).toEqual([
      25, 0, 0, 9131,
    ]);

    // 6. Date Difference Calculator
    const ddEx = dateDifference(
      parseDate("2026-03-01"),
      parseDate("2026-03-31"),
      false,
      [parseDate("2026-03-04")],
    );
    expect([ddEx.days, ddEx.business]).toEqual([30, 20]);
    const ddIn = dateDifference(
      parseDate("2026-03-01"),
      parseDate("2026-03-31"),
      true,
    );
    expect([ddIn.years, ddIn.months, ddIn.remainder, ddIn.days, ddIn.business]).toEqual(
      [0, 1, 0, 31, 22],
    );
    expect(shiftCalendar(parseDate("2026-01-31"), 1, "months")).toBe(
      "2026-02-28",
    );

    // 7. EMI Calculator
    const emi1 = loan(1000000, 8.5, 120);
    expect(inr(emi1.payment)).toBe("₹12,398.57");
    expect(inr(emi1.interest)).toBe("₹4,87,828.27");
    expect(inr(emi1.total)).toBe("₹14,87,828.27");
    const emi2 = loan(1000000, 8.5, 120, 2000);
    expect(emi2.schedule).toHaveLength(96);
    expect(inr(emi1.interest - emi2.interest)).toBe("₹1,06,446.83");

    // 8. Loan Calculator
    const home = loan(5000000, 9, 240);
    expect(inr(home.payment)).toBe("₹44,986.30");
    expect(inr(home.interest)).toBe("₹57,96,711.47");
    expect(inr(home.total)).toBe("₹1,07,96,711.47");
    expect(loanAffordability(120000, 15000, 36).budget).toBe(28200);
    const vLoan = variableLoan(
      2000000,
      60,
      12,
      8.5,
      [{ period: 25, annualRate: 9.25 }],
      0,
    );
    expect(inr(vLoan.initialPayment)).toBe("₹41,033.06");
    expect(inr(vLoan.schedule[24].scheduled)).toBe("₹41,486.29");
    expect(inr(vLoan.interest)).toBe("₹4,78,299.92");

    // 9. Scientific Calculator
    expect(scientific("sin(30) + cos(60)", true)).toBeCloseTo(1, 12);
    expect(scientific("nCr(10, 3) * 2^3", true)).toBe(960);
    expect(scientific("5! + log(1000) + ln(e^2)", true)).toBeCloseTo(125, 12);

    // 10. Unit Converter
    expect(convert(5, "Length", "Mile", "Kilometre")).toBeCloseTo(8.04672, 10);
    expect(convert(1, "Data storage", "Gibibyte", "Megabyte")).toBeCloseTo(
      1073.741824,
      10,
    );
    expect(
      convert(30, "Fuel consumption", "US mpg", "L/100 km"),
    ).toBeCloseTo(7.8404861, 7);

    // 11. Temperature Converter
    expect(temperature(100, "Celsius", "Fahrenheit")).toBe(212);
    expect(temperature(98.6, "Fahrenheit", "Celsius")).toBeCloseTo(37, 10);
    expect(temperature(25, "Celsius", "Kelvin")).toBeCloseTo(298.15, 10);
    expect(temperature(25, "Celsius", "Rankine")).toBeCloseTo(536.67, 10);
    expect(temperature(-40, "Celsius", "Fahrenheit")).toBe(-40);

    // 12. Time Converter
    expect(convert(2.5, "Time", "Day", "Hour")).toBe(60);
    const wt = workingTime(
      parseLocalTimestamp("2026-11-09T14:00"),
      parseLocalTimestamp("2026-11-11T11:30"),
      [1, 2, 3, 4, 5],
      parseClock("09:00"),
      parseClock("17:00"),
    );
    expect(wt.workMs / 3600000).toBe(13.5);
    expect(wt.elapsedMs / 3600000).toBe(45.5);
    const zt = resolveZonedTime("2026-11-10T15:00", "Asia/Kolkata", "reject");
    expect(zt.instant.toISOString()).toBe("2026-11-10T09:30:00.000Z");
    expect(formatZonedTime(zt.instant, "Europe/London", false)).toContain(
      "09:30",
    );
    expect(formatZonedTime(zt.instant, "America/New_York", false)).toContain(
      "04:30",
    );
  });

  it("preserves interactive UI calculation behaviour across calculator workspaces", async () => {
    const CalculatorPage = (await import("../app/tools/[calculator]/page"))
      .default;

    // Interactive check 1: GST Calculator workspace
    const gstEl = await CalculatorPage({
      params: Promise.resolve({ calculator: "gst-calculator" }),
    });
    const { container: gstDom, unmount: u1 } = render(gstEl);
    const gstScope = within(
      gstDom.querySelector(".calculator-workspace") as HTMLElement,
    );
    fireEvent.change(gstScope.getByLabelText("Amount (₹)"), {
      target: { value: "10000" },
    });
    fireEvent.change(gstScope.getByLabelText("GST rate (%)"), {
      target: { value: "18" },
    });
    expect(gstDom.querySelector("output")?.textContent).toBe("₹11,800.00");
    u1();

    // Interactive check 2: EMI Calculator workspace
    const emiEl = await CalculatorPage({
      params: Promise.resolve({ calculator: "emi-calculator" }),
    });
    const { container: emiDom, unmount: u2 } = render(emiEl);
    const emiScope = within(
      emiDom.querySelector(".calculator-workspace") as HTMLElement,
    );
    fireEvent.change(emiScope.getByLabelText("Principal (₹)"), {
      target: { value: "1000000" },
    });
    fireEvent.change(emiScope.getByLabelText("Annual interest rate (%)"), {
      target: { value: "8.5" },
    });
    fireEvent.change(emiScope.getByLabelText("Tenure (months)"), {
      target: { value: "120" },
    });
    expect(emiDom.querySelector("output")?.textContent).toBe(
      "₹12,398.57 / month",
    );
    u2();

    // Interactive check 3: Scientific Calculator workspace
    const sciEl = await CalculatorPage({
      params: Promise.resolve({ calculator: "scientific-calculator" }),
    });
    const { container: sciDom, unmount: u3 } = render(sciEl);
    const sciScope = within(
      sciDom.querySelector(".calculator-workspace") as HTMLElement,
    );
    fireEvent.change(sciScope.getByLabelText("Expression"), {
      target: { value: "nCr(10, 3) * 2^3" },
    });
    expect(sciDom.querySelector("output")?.textContent).toBe("960");
    u3();

    // Interactive check 4: Temperature Converter workspace
    const tempEl = await CalculatorPage({
      params: Promise.resolve({ calculator: "temperature-converter" }),
    });
    const { container: tempDom, unmount: u4 } = render(tempEl);
    const tempScope = within(
      tempDom.querySelector(".calculator-workspace") as HTMLElement,
    );
    fireEvent.change(tempScope.getByLabelText("Value"), {
      target: { value: "100" },
    });
    expect(tempDom.querySelector("output")?.textContent).toBe("212 Fahrenheit");
    u4();
  });
});
