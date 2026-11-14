import ConsolidatedWorkspace from "@/components/tools/security/consolidated-workspace";
import {
  securityGroupBySlug,
  securityGroups,
} from "@/lib/tools/security/consolidation";
import { notFound } from "next/navigation";
import ToolShell from "@/components/tool-shell";
import Calculator from "@/components/tools/calculator";
import GSTInvoice from "@/components/tools/phase9-v2-gst";
import PercentageAdvanced from "@/components/tools/phase9-v2-percentage";
import DiscountAdvanced from "@/components/tools/phase9-v2-discount";
import OfferComparison from "@/components/tools/phase9-v2-offers";
import Profit from "@/components/tools/phase9-profit";
import BMIComparison from "@/components/tools/phase9-bmi-comparison";
import Dates from "@/components/tools/phase9-dates";
import Loans from "@/components/tools/phase9-loans";
import VariableLoan from "@/components/tools/phase9-v2-variable-loan";
import Converters from "@/components/tools/phase9-converters";
import Scientific from "@/components/tools/phase9-scientific";
import TimeAdvanced from "@/components/tools/phase9-v2-time";
import TimeZones from "@/components/tools/phase9-timezones";
import CalendarTime from "@/components/tools/phase9-v2-calendar-time";
import { pageMetadata } from "@/lib/seo";
import { calculatorInfo } from "@/lib/calculator-info";

export function generateStaticParams() {
  return [
    ...Object.keys(calculatorInfo),
    ...securityGroups
      .filter(
        (tool) =>
          tool.slug !== "password-generator" && tool.slug !== "hash-generator",
      )
      .map((tool) => tool.slug),
  ].map((calculator) => ({ calculator }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ calculator: string }>;
}) {
  const { calculator } = await params;
  const security = securityGroupBySlug(calculator);
  if (security)
    return pageMetadata(
      security.name,
      security.description,
      `/tools/${calculator}`,
    );
  const info = calculatorInfo[calculator];
  return info
    ? pageMetadata(info.seoTitle, info.description, `/tools/${calculator}`)
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ calculator: string }>;
}) {
  const { calculator } = await params;
  const security = securityGroupBySlug(calculator);
  if (security)
    return (
      <ToolShell
        slug={calculator}
        privacyNotice={
          security.slug === "dns-email-security"
            ? "Optional DNS queries send your domain and IP address to Cloudflare after your consent."
            : security.slug === "url-network-privacy"
              ? "The optional public IP lookup contacts ipify after your consent; other operations are local."
              : undefined
        }
        content={{
          steps: [
            "Choose an operation tab.",
            "Enter the requested input and process it locally, or explicitly consent to an optional external lookup.",
            "Review, copy or download the result; switching tabs clears the current workspace.",
          ],
          faqs: [
            {
              q: "Where is my input processed?",
              a:
                security.slug === "dns-email-security"
                  ? "Local reviews stay in the browser. An optional DNS query sends its domain and your IP to Cloudflare after consent."
                  : security.slug === "url-network-privacy"
                    ? "Local reviews stay in the browser. The optional IP lookup contacts ipify after consent."
                    : "Processing happens in your browser. Copying and downloading create local copies; protect them as appropriate.",
            },
            {
              q: "Are there limitations?",
              a: "Read the guidance in each operation. Reviews do not guarantee safety, legal compliance or live server security.",
            },
          ],
        }}
      >
        <ConsolidatedWorkspace slug={security.slug} />
      </ToolShell>
    );
  const info = calculatorInfo[calculator];
  if (!info) notFound();
  const referenceSection = (
    <section
      className="workspace advanced-workspace"
      aria-labelledby={`${calculator}-formulas-heading`}
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">FORMULAS &amp; EXAMPLES</span>
          <h2 id={`${calculator}-formulas-heading`}>{info.formulasHeading}</h2>
          <p>{info.formulasIntro}</p>
        </div>
      </div>
      <div className="advanced-options">
        <div className="advanced-item">
          <h3>{info.formulaBlockTitle}</h3>
          <ul>
            {info.formulas.map((formula) => (
              <li key={formula.label}>
                <strong>{formula.label}:</strong>{" "}
                <code>{formula.expression}</code>
                {formula.note ? ` — ${formula.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="advanced-item">
          <h3>{info.examplesBlockTitle}</h3>
          <ul>
            {info.examples.map((example) => (
              <li key={example.scenario}>
                <strong>{example.scenario}:</strong> {example.calculation}{" "}
                &rarr; <strong>{example.result}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {info.disclaimer ? (
        <p className="calculator-disclaimer">{info.disclaimer}</p>
      ) : null}
    </section>
  );
  return (
    <ToolShell
      slug={calculator}
      headingDescription={info.intro}
      stepsHeading={`How to use the ${info.name}`}
      faqsHeading={`${info.name} FAQs`}
      relatedHeading="Related calculators"
      referenceSection={referenceSection}
      content={{ steps: info.steps, faqs: info.faqs }}
    >
      {["age-calculator", "date-difference-calculator"].includes(calculator) ? (
        <Dates kind={calculator} heading={info.workspaceHeading} />
      ) : ["emi-calculator", "loan-calculator"].includes(calculator) ? (
        <>
          <Loans kind={calculator} heading={info.workspaceHeading} />
          <VariableLoan kind={calculator} />
        </>
      ) : [
          "unit-converter",
          "temperature-converter",
          "time-converter",
        ].includes(calculator) ? (
        <>
          <Converters kind={calculator} heading={info.workspaceHeading} />
          {calculator === "time-converter" && (
            <>
              <TimeAdvanced />
              <CalendarTime />
              <TimeZones />
            </>
          )}
        </>
      ) : calculator === "scientific-calculator" ? (
        <Scientific heading={info.workspaceHeading} />
      ) : (
        <>
          <Calculator kind={calculator} heading={info.workspaceHeading} />
          {calculator === "bmi-calculator" && <BMIComparison />}
          {calculator === "gst-calculator" && <GSTInvoice />}
          {calculator === "percentage-calculator" && <PercentageAdvanced />}
          {calculator === "discount-calculator" && (
            <>
              <DiscountAdvanced />
              <OfferComparison />
              <Profit />
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}
