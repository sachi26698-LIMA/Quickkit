import { notFound } from "next/navigation";
import ToolShell from "@/components/tool-shell";
import Calculator from "@/components/tools/calculator";
import Dates from "@/components/tools/phase9-dates";
import Loans from "@/components/tools/phase9-loans";
import Converters from "@/components/tools/phase9-converters";
import Scientific from "@/components/tools/phase9-scientific";
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
        <Loans kind={calculator} />
      ) : [
          "unit-converter",
          "temperature-converter",
          "time-converter",
        ].includes(calculator) ? (
        <Converters kind={calculator} />
      ) : calculator === "scientific-calculator" ? (
        <Scientific />
      ) : (
        <Calculator kind={calculator} />
      )}
    </ToolShell>
  );
}
