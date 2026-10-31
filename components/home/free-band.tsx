import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

const perks = ["No ads", "No sign-up", "Local processing", "Free to use"];

/** Honest counterpart to a pricing ribbon: the toolkit is free, not "Pro". */
export function FreeBand() {
  return (
    <section className="container pb-16 sm:pb-20" aria-labelledby="free-title">
      <div className="relative overflow-hidden rounded-panel border border-lavender-200 bg-white p-6 shadow-soft sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 120% at 8% 0%, rgba(241,236,255,0.95), transparent 65%), radial-gradient(45% 110% at 96% 100%, rgba(217,255,242,0.85), transparent 65%)",
          }}
        />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <IconTile tone="brand" size="lg" className="hidden sm:grid">
              <Sparkles strokeWidth={1.8} />
            </IconTile>
            <div>
              <h2
                id="free-title"
                className="text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl"
              >
                Everything here is free.{" "}
                <span className="text-brand-600">Always.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                No account, no ads and no upsell — just the tools, running on
                your device.
              </p>
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-ink-soft">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <Check
                  className="size-4 text-mint-deep"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                {perk}
              </li>
            ))}
          </ul>

          <ButtonLink href="/tools" className="w-full shrink-0 sm:w-auto">
            Browse all tools
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export default FreeBand;
