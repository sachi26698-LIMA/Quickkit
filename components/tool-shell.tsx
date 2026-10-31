import Link from "next/link";
import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import { getTool, tools, type Tool } from "@/lib/catalog";
import { ToolCard } from "@/components/tools/tool-card";
import ToolIcon from "@/components/tools/tool-icon";

export type ToolContent = {
  steps: string[];
  faqs: { q: string; a: string }[];
};

/** Three related tools, preferring the same category. */
function relatedTools(tool: Tool) {
  const sameCategory = tools.filter(
    (candidate) =>
      candidate.slug !== tool.slug && candidate.category === tool.category,
  );
  const others = tools.filter(
    (candidate) =>
      candidate.slug !== tool.slug && candidate.category !== tool.category,
  );
  return [...sameCategory, ...others].slice(0, 3);
}

export default function ToolShell({
  slug,
  children,
  content,
}: {
  slug: string;
  children: React.ReactNode;
  content: ToolContent;
}) {
  const tool = getTool(slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  const related = relatedTools(tool);

  return (
    <div
      className="min-h-full"
      style={{
        background:
          "linear-gradient(180deg, #f8f6ff 0%, #fcfbff 18%, #ffffff 34%)",
      }}
    >
      <div className="container max-w-[1120px] py-6 sm:py-10">
        <nav
          aria-label="Breadcrumb"
          className="flex min-h-8 flex-wrap items-center gap-1.5 text-[0.8125rem] font-medium text-muted"
        >
          <Link href="/" className="transition-colors hover:text-brand-700">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <Link
            href="/tools"
            className="transition-colors hover:text-brand-700"
          >
            Tools
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span aria-current="page" className="font-semibold text-ink-soft">
            {tool.name}
          </span>
        </nav>

        <header className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:gap-5 sm:py-10">
          <ToolIcon icon={tool.icon} color={tool.color} size="xl" />
          <div className="min-w-0">
            <span className="eyebrow">{tool.category} · free browser tool</span>
            <h1 className="mt-2 text-[2rem] leading-[1.08] font-extrabold tracking-[-0.04em] text-ink sm:text-[2.75rem]">
              {tool.name}
            </h1>
            <p className="t-body mt-2.5 max-w-2xl text-[0.9375rem] sm:text-base">
              {tool.summary}
            </p>
          </div>
        </header>

        {children}

        <p className="mx-auto mt-6 mb-10 flex max-w-2xl items-center justify-center gap-2 rounded-2xl border border-mint-200 bg-mint-soft px-4 py-3 text-center text-[0.8125rem] leading-relaxed font-medium text-mint-ink sm:text-sm">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Processed on your device. QUICKKIT does not upload or save tool
          inputs.
        </p>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section className="rounded-panel border border-line bg-white p-5 shadow-soft sm:p-8">
            <span className="eyebrow">A quick walkthrough</span>
            <h2 className="t-h3 mt-3">How to use it</h2>
            <ol className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-muted">
              {content.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-lavender-100 text-[0.75rem] font-bold text-brand-700"
                  >
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-panel border border-line bg-white p-5 shadow-soft sm:p-8">
            <span className="eyebrow">Good to know</span>
            <h2 className="t-h3 mt-3">A few useful answers</h2>
            <div className="mt-3 divide-y divide-line-soft">
              {content.faqs.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-[0.9375rem] font-semibold text-ink">
                    {q}
                    <ChevronRight
                      className="size-4 shrink-0 text-brand-600 transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-muted">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-14" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Keep going</span>
              <h2 id="related-title" className="t-h3 mt-2 sm:text-[1.6rem]">
                Related tools
              </h2>
            </div>
            <Link href="/tools" className="text-link">
              All tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {related.map((candidate) => (
              <ToolCard key={candidate.slug} tool={candidate} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
