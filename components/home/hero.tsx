import {
  ArrowRight,
  LayoutGrid,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroVisual } from "@/components/home/hero-visual";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { tools } from "@/lib/catalog";

const benefits = [
  {
    icon: LayoutGrid,
    label: `${tools.length} focused tools`,
    short: `${tools.length} tools`,
    sub: "One clean kit",
  },
  {
    icon: ShieldCheck,
    label: "Free to use",
    short: "Free",
    sub: "No account needed",
  },
  {
    icon: LockKeyhole,
    label: "Local processing",
    short: "Local",
    sub: "Nothing uploaded",
  },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pb-14 sm:pb-20 lg:pb-24"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #fbf9ff 42%, #f6f2ff 100%)",
      }}
    >
      {/* Ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(46% 44% at 84% 2%, rgba(167,139,250,0.32), transparent 70%), radial-gradient(40% 38% at 4% 18%, rgba(217,255,242,0.8), transparent 72%), radial-gradient(46% 40% at 50% 100%, rgba(231,220,255,0.85), transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-grid-soft [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-30"
      />

      <div className="container grid items-center gap-8 pt-8 pb-2 sm:gap-10 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-4 lg:pt-16">
        <div className="text-center sm:text-left">
          <Badge>
            <Sparkles className="size-3.5 text-brand-500" aria-hidden="true" />
            Your everyday toolkit
          </Badge>

          <h1 id="hero-title" className="t-display mt-5 text-ink sm:mt-6">
            Small tasks.
            <br />
            <span className="text-gradient-brand">Quick solutions.</span>
          </h1>

          <p className="t-lead mx-auto mt-5 max-w-xl text-[1rem] sm:mx-0 sm:mt-6 sm:text-[1.0625rem]">
            Handy tools for the things you do every day. No clutter, no
            complicated setup — just pick a tool and get it done.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <ButtonLink href="#tools" size="lg" className="w-full sm:w-auto">
              Explore tools
              <ArrowRight className="size-[1.05rem]" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href="/tools"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <LayoutGrid
                className="size-4 text-brand-600"
                aria-hidden="true"
              />
              View all tools
            </ButtonLink>
          </div>

          <ul className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            {benefits.map(({ icon: Icon, label, short, sub }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-xl border border-white bg-white/70 px-2.5 py-2 text-left shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] backdrop-blur sm:flex-col sm:items-start sm:gap-1.5 sm:rounded-2xl sm:px-4 sm:py-3"
              >
                <Icon
                  className="size-4 shrink-0 text-brand-500"
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[0.75rem] leading-tight font-bold text-ink sm:hidden">
                    {short}
                  </span>
                  <span className="hidden text-[0.8125rem] leading-tight font-bold text-ink sm:block sm:text-sm">
                    {label}
                  </span>
                  <span className="hidden text-[0.8125rem] leading-tight text-muted sm:mt-0.5 sm:block">
                    {sub}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:pl-4">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

export default Hero;
