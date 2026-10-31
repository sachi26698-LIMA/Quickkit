import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const perks = ["No ads", "No sign-up", "Local processing", "Free to start"];

/** Honest closing call to action — free toolkit, no fabricated pricing. */
export function CtaSection() {
  return (
    <section
      className="container pb-12 sm:pb-16 lg:pb-20"
      aria-labelledby="cta-title"
    >
      <div className="relative overflow-hidden rounded-panel border border-brand-200/70 shadow-card">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, #f4efff 0%, #ffffff 46%, #eafff7 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-grid-soft [mask-image:radial-gradient(70%_70%_at_70%_30%,black,transparent)] opacity-25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(179,240,221,0.8), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col gap-6 p-5 sm:p-9 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-11">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-pill border border-white bg-white/80 px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-brand-700 uppercase shadow-[0_2px_10px_rgb(73_52_145_/_0.08)]">
              <Sparkles
                className="size-3.5 text-brand-500"
                aria-hidden="true"
              />
              Free to start
            </span>
            <h2 id="cta-title" className="t-h2 mt-4">
              Useful tools.{" "}
              <span className="text-gradient-brand">Free to start.</span>
            </h2>
            <p className="t-body mt-3 text-[0.9375rem] sm:text-base">
              Every current tool is free, with no account and no ads. If we add
              paid features later, the tools you use today stay available.
            </p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <ul className="grid grid-cols-1 gap-x-5 gap-y-2 text-[0.8125rem] font-semibold text-ink-soft min-[380px]:grid-cols-2 sm:text-sm">
              {perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Check
                    className="size-4 text-mint-deep"
                    strokeWidth={2.8}
                    aria-hidden="true"
                  />
                  {perk}
                </li>
              ))}
            </ul>
            <ButtonLink href="/tools" size="lg" className="w-full sm:w-auto">
              Browse all tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaSection;
