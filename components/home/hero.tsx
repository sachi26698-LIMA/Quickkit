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
  { icon: LayoutGrid, label: `${tools.length} focused tools` },
  { icon: ShieldCheck, label: "Free to use" },
  { icon: LockKeyhole, label: "Processed on your device" },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #fbfaff 45%, #f8f6ff 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(48% 42% at 82% 4%, rgba(167,139,250,0.30), transparent 70%), radial-gradient(38% 40% at 6% 22%, rgba(217,255,242,0.75), transparent 72%), radial-gradient(40% 34% at 46% 96%, rgba(230,220,255,0.65), transparent 70%)",
        }}
      />

      <div className="container grid items-center gap-10 py-12 sm:py-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-6 lg:py-20">
        <div className="text-center lg:text-left">
          <Badge>
            <Sparkles className="size-3.5 text-brand-500" aria-hidden="true" />
            Your everyday toolkit
          </Badge>

          <h1
            id="hero-title"
            className="mt-5 text-[1.95rem] leading-[1.06] font-extrabold tracking-[-0.045em] text-ink sm:text-[3.4rem] sm:leading-[1.03] lg:text-[4.05rem]"
          >
            Small tasks.
            <br />
            <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 bg-clip-text text-transparent">
              Quick solutions.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base lg:mx-0">
            Handy tools for the things you do every day. No clutter, no
            complicated setup — just pick a tool and get it done.
          </p>

          <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="#tools" size="lg" className="w-full sm:w-auto">
              Explore tools
              <ArrowRight className="size-4" aria-hidden="true" />
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

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[13px] font-medium text-muted lg:justify-start">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon
                  className="size-4 text-brand-500"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

export default Hero;
