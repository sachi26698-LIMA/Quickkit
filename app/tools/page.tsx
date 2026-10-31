import type { Metadata } from "next";
import { LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { ToolExplorer } from "@/components/tools/tool-explorer";
import { tools, toolCategories } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "All tools — the complete QUICKKIT catalog",
  "Browse every QUICKKIT tool: word counting, case conversion, JSON formatting, password generation, QR codes and image compression. Free, local and account-free.",
  "/tools",
);

const stats = [
  { value: `${tools.length}`, label: "Focused tools" },
  { value: `${toolCategories.length}`, label: "Categories" },
  { value: "0", label: "Uploads" },
];

export default function ToolsPage() {
  return (
    <>
      <section
        className="relative isolate overflow-hidden border-b border-line-soft"
        aria-labelledby="tools-title"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #fbf9ff 52%, #f6f2ff 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(42% 55% at 88% 0%, rgba(167,139,250,0.24), transparent 70%), radial-gradient(36% 48% at 4% 92%, rgba(217,255,242,0.75), transparent 72%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-grid-soft [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-25"
        />

        <div className="relative container py-14 sm:py-16 lg:py-20">
          <Badge>
            <LayoutGrid
              className="size-3.5 text-brand-500"
              aria-hidden="true"
            />
            Tool directory
          </Badge>
          <h1 id="tools-title" className="t-display mt-5 max-w-3xl">
            All six tools.{" "}
            <span className="text-gradient-brand">One clean kit.</span>
          </h1>
          <p className="t-lead mt-5 max-w-2xl text-[1rem] sm:text-[1.0625rem]">
            Everything QUICKKIT offers, in one place. Search by name or filter
            by category — each tool opens on its own page and works without an
            account.
          </p>

          <ul className="mt-8 grid max-w-lg grid-cols-3 gap-2.5 sm:gap-3">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="rounded-2xl border border-white bg-white/80 px-3 py-4 text-center shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] backdrop-blur"
              >
                <span className="block text-2xl font-extrabold tracking-tight text-brand-700">
                  {stat.value}
                </span>
                <span className="mt-1 block text-[0.75rem] font-medium text-muted sm:text-[0.8125rem]">
                  {stat.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container pt-10 pb-16 sm:pt-12 sm:pb-20">
        <ToolExplorer
          anchorId="tool-directory"
          eyebrow="Search & filter"
          title="Browse the toolkit"
          description="Six tools, four categories. Search works while you type."
        />
      </section>

      <section
        className="container pb-16 sm:pb-20"
        aria-label="About the toolkit"
      >
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="flex items-start gap-4 rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] sm:p-6">
            <IconTile tone="mint" size="md">
              <ShieldCheck strokeWidth={1.9} />
            </IconTile>
            <div>
              <h2 className="text-base font-bold text-ink sm:text-lg">
                Private by default
              </h2>
              <p className="t-body mt-1.5 text-[0.9375rem]">
                Tool inputs are processed in your browser and are never uploaded
                by QUICKKIT.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] sm:p-6">
            <IconTile tone="purple" size="md">
              <Sparkles strokeWidth={1.9} />
            </IconTile>
            <div>
              <h2 className="text-base font-bold text-ink sm:text-lg">
                Grows deliberately
              </h2>
              <p className="t-body mt-1.5 text-[0.9375rem]">
                Each addition is tested for accuracy, accessibility and mobile
                use before it ships — no placeholder tools.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
