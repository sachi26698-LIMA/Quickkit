import { notFound } from "next/navigation";
import ToolShell from "@/components/tool-shell";
import Calculator from "@/components/tools/calculator";
import GSTInvoice from "@/components/tools/phase9-v2-gst";
import PercentageAdvanced from "@/components/tools/phase9-v2-percentage";
import DiscountAdvanced from "@/components/tools/phase9-v2-discount";
import OfferComparison from "@/components/tools/phase9-v2-offers";
import Dates from "@/components/tools/phase9-dates";
import Loans from "@/components/tools/phase9-loans";
import VariableLoan from "@/components/tools/phase9-v2-variable-loan";
import Converters from "@/components/tools/phase9-converters";
import Scientific from "@/components/tools/phase9-scientific";
import TimeAdvanced from "@/components/tools/phase9-v2-time";
import CalendarTime from "@/components/tools/phase9-v2-calendar-time";
import { pageMetadata } from "@/lib/seo";
import { calculatorInfo } from "@/lib/calculator-info";

export function generateStaticParams() {
  return Object.keys(calculatorInfo).map((calculator) => ({ calculator }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ calculator: string }>;
}) {
  const { calculator } = await params;
  const info = calculatorInfo[calculator];
  return info
    ? pageMetadata(info.name, info.description, `/tools/${calculator}`)
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ calculator: string }>;
}) {
  const { calculator } = await params;
  const info = calculatorInfo[calculator];
  if (!info) notFound();
  return (
    <ToolShell
      slug={calculator}
      content={{ steps: info.steps, faqs: info.faqs }}
    >
      {["age-calculator", "date-difference-calculator"].includes(calculator) ? (
        <Dates kind={calculator} />
      ) : ["emi-calculator", "loan-calculator"].includes(calculator) ? (
        <>
          <Loans kind={calculator} />
          <VariableLoan kind={calculator} />
        </>
      ) : [
          "unit-converter",
          "temperature-converter",
          "time-converter",
        ].includes(calculator) ? (
        <>
          <Converters kind={calculator} />
          {calculator === "time-converter" && (
            <>
              <TimeAdvanced />
              <CalendarTime />
            </>
          )}
        </>
      ) : calculator === "scientific-calculator" ? (
        <Scientific />
      ) : (
        <>
          <Calculator kind={calculator} />
          {calculator === "gst-calculator" && <GSTInvoice />}
          {calculator === "percentage-calculator" && <PercentageAdvanced />}
          {calculator === "discount-calculator" && (
            <>
              <DiscountAdvanced />
              <OfferComparison />
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}
