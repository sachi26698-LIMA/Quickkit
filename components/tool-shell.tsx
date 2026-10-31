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
          "linear-gradient(180deg, #f8f6ff 0%, #ffffff 26%, #ffffff 100%)",
      }}
    >
      <div className="container max-w-[1080px] py-6 sm:py-8">
        <nav
          aria-label="Breadcrumb"
          className="flex min-h-8 flex-wrap items-center gap-1.5 text-xs text-muted"
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
          <span aria-current="page" className="font-medium text-ink-soft">
            {tool.name}
          </span>
        </nav>

        <header className="flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:gap-5 sm:py-9">
          <ToolIcon icon={tool.icon} color={tool.color} size="lg" />
          <div className="min-w-0">
            <span className="eyebrow">{tool.category} · free browser tool</span>
            <h1 className="mt-2 text-[1.9rem] leading-tight font-extrabold tracking-[-0.035em] text-ink sm:text-4xl">
              {tool.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
              {tool.summary}
            </p>
          </div>
        </header>

        {children}

        <p className="mx-auto mt-5 mb-8 flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-mint-200 bg-mint-soft px-4 py-2.5 text-center text-xs leading-relaxed text-mint-ink">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Processed on your device. QUICKKIT does not upload or save tool
          inputs.
        </p>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <section className="rounded-panel border border-line bg-white p-5 shadow-soft sm:p-7">
            <span className="eyebrow">A quick walkthrough</span>
            <h2 className="mt-3 text-xl font-extrabold tracking-[-0.02em]">
              How to use it
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              {content.steps.map((step) => (
                <li key={step} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lavender-100 text-[11px] font-bold text-brand-700"
                  >
                    {content.steps.indexOf(step) + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-panel border border-line bg-white p-5 shadow-soft sm:p-7">
            <span className="eyebrow">Good to know</span>
            <h2 className="mt-3 text-xl font-extrabold tracking-[-0.02em]">
              A few useful answers
            </h2>
            <div className="mt-3 divide-y divide-line-soft">
              {content.faqs.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-ink">
                    {q}
                    <ChevronRight
                      className="size-4 shrink-0 text-brand-600 transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-12" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Keep going</span>
              <h2
                id="related-title"
                className="mt-2 text-xl font-extrabold tracking-[-0.02em] sm:text-2xl"
              >
                Related tools
              </h2>
            </div>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
            >
              All tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((candidate) => (
              <ToolCard key={candidate.slug} tool={candidate} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
