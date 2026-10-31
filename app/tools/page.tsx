import type { Metadata } from "next";
import { LayoutGrid, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
        className="relative overflow-hidden border-b border-line-soft"
        aria-labelledby="tools-title"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #fbfaff 55%, #f8f6ff 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(42% 55% at 88% 0%, rgba(167,139,250,0.22), transparent 70%), radial-gradient(36% 48% at 4% 90%, rgba(217,255,242,0.7), transparent 72%)",
          }}
        />
        <div className="relative container py-12 sm:py-16">
          <Badge>
            <LayoutGrid
              className="size-3.5 text-brand-500"
              aria-hidden="true"
            />
            Tool directory
          </Badge>
          <h1
            id="tools-title"
            className="mt-4 max-w-3xl text-[2rem] leading-[1.06] font-extrabold tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.4rem]"
          >
            All six tools.{" "}
            <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 bg-clip-text text-transparent">
              One clean kit.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">
            Everything QUICKKIT offers, in one place. Search by name or filter
            by category — each tool opens on its own page and works without an
            account.
          </p>

          <ul className="mt-8 grid max-w-md grid-cols-3 gap-2.5">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="rounded-2xl border border-line bg-white/80 px-3 py-3.5 text-center shadow-[0_1px_2px_rgb(23_27_46_/_0.03)] backdrop-blur"
              >
                <span className="block text-xl font-extrabold tracking-tight text-brand-700">
                  {stat.value}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-muted">
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
          description="Six tools, three categories. Search works while you type."
        />
      </section>

      <section
        className="container pb-16 sm:pb-20"
        aria-labelledby="tools-note"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-card border border-line bg-white p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-mint-ink">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="tools-note" className="text-base font-bold text-ink">
                Private by default
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Tool inputs are processed in your browser and are never uploaded
                by QUICKKIT.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-card border border-line bg-white p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavender-100 text-brand-700">
              <Search className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                A new tool every phase
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                QUICKKIT grows deliberately: each addition is tested for
                accuracy, accessibility and mobile use before it ships.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
