import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import ToolIcon from "@/components/tools/tool-icon";
import { tools, toolCategories } from "@/lib/catalog";

/**
 * Decorative About-page composition: a glass "toolkit" card listing the real
 * categories, wrapped in a soft light field. Decorative only.
 */
export function AboutVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[21rem] sm:max-w-sm"
    >
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] blur-2xl"
        style={{
          background:
            "radial-gradient(55% 55% at 70% 20%, rgba(139,120,243,0.36), transparent 70%), radial-gradient(55% 55% at 20% 85%, rgba(179,240,221,0.75), transparent 72%)",
        }}
      />
      <div className="pointer-events-none absolute inset-2 -z-10 rounded-[2rem] bg-grid-soft [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] opacity-35" />

      <div className="relative rotate-[-2deg] rounded-[1.75rem] border border-white bg-white/85 p-5 shadow-float ring-1 ring-lavender-200/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <LogoMark gradientId="quickkit-mark-about" className="size-10" />
          <div>
            <p className="text-lg leading-none font-extrabold tracking-[-0.04em] text-ink">
              QUICK<span className="text-brand-600">KIT</span>
            </p>
            <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">
              Est. 2026 · Browser-first
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {toolCategories.map((category) => {
            const count = tools.filter(
              (tool) => tool.category === category,
            ).length;
            const first = tools.find((tool) => tool.category === category)!;
            return (
              <div
                key={category}
                className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-white px-3 py-2.5"
              >
                <ToolIcon icon={first.icon} color={first.color} size="xs" />
                <span className="text-[13px] font-semibold text-ink-soft">
                  {category}
                </span>
                <span className="ml-auto rounded-pill bg-lavender-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-soft px-3 py-2 text-[11px] font-bold text-mint-ink">
          <ShieldCheck className="size-3.5" />
          All processing happens in your browser
        </div>
      </div>

      <span className="absolute -top-3 -right-2 flex rotate-[4deg] items-center gap-1.5 rounded-pill border border-white bg-white px-3 py-1.5 text-[11px] font-bold text-brand-700 shadow-tile sm:-right-5">
        <Sparkles className="size-3.5 text-brand-500" />
        Built for everyday
      </span>
      <span className="absolute -bottom-3 -left-2 flex items-center gap-1.5 rounded-pill border border-mint-200 bg-white px-3 py-1.5 text-[11px] font-bold text-mint-ink shadow-tile sm:-left-5">
        <Check className="size-3.5" strokeWidth={3} />
        No account needed
      </span>
    </div>
  );
}

export default AboutVisual;
