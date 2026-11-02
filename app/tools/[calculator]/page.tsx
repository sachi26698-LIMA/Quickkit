import { notFound } from "next/navigation";
import ToolShell from "@/components/tool-shell";
import Calculator from "@/components/tools/calculator";
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
      <Calculator kind={calculator} />
    </ToolShell>
  );
}
