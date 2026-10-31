import {
  Braces,
  CaseSensitive,
  ImageIcon,
  KeyRound,
  QrCode,
  Sparkles,
  Type,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function FloatTile({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{ animationDelay: delay }}
      className={cn(
        "absolute grid size-12 place-items-center rounded-2xl border border-white/90 shadow-tile ring-1 ring-lavender-200/70 backdrop-blur-sm sm:size-14",
        "animate-float",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Decorative hero illustration composed from CSS and Lucide icons — no image
 * payload, no fake controls. Everything here is aria-hidden.
 */
export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[420px] select-none sm:max-w-[520px] lg:max-w-[540px]"
    >
      <div
        className="pointer-events-none absolute inset-2 -z-10 rounded-[3rem] blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 66% 30%, rgba(167,139,250,0.45), transparent 70%), radial-gradient(55% 55% at 24% 78%, rgba(217,255,242,0.95), transparent 72%)",
        }}
      />

      <div className="relative aspect-[5/4]">
        {/* Soft orbit rings */}
        <div className="absolute inset-x-[4%] top-[17%] h-[56%] -rotate-[16deg] rounded-[50%] border border-white/80 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />
        <div className="absolute inset-x-[15%] top-[25%] h-[40%] rotate-[12deg] rounded-[50%] border border-lavender-200/80" />

        {/* Toolkit window */}
        <div className="absolute top-1/2 left-1/2 w-[74%] -translate-x-1/2 -translate-y-[52%] -rotate-[4deg]">
          <div className="rounded-[1.5rem] border border-white/90 bg-white/80 p-2 shadow-lift ring-1 ring-lavender-200/70 backdrop-blur">
            <div className="overflow-hidden rounded-[1.1rem] border border-line-soft bg-gradient-to-br from-white via-lavender-50 to-lavender-100">
              <div className="flex items-center gap-1.5 border-b border-line-soft/80 px-3.5 py-2.5">
                <span className="size-1.5 rounded-full bg-brand-200" />
                <span className="size-1.5 rounded-full bg-mint-200" />
                <span className="size-1.5 rounded-full bg-lavender-300" />
                <span className="ml-auto text-[9px] font-semibold tracking-[0.12em] text-muted uppercase">
                  quickkit
                </span>
              </div>

              <div className="px-5 pt-4 pb-5 text-center">
                <LogoMark
                  gradientId="quickkit-mark-hero"
                  className="mx-auto size-11 sm:size-12"
                />
                <p className="mt-3 text-xl font-extrabold tracking-[-0.045em] text-ink sm:text-2xl">
                  QUICK<span className="text-brand-600">KIT</span>
                </p>
                <p className="mt-1 text-[9px] font-bold tracking-[0.18em] text-muted uppercase sm:text-[10px]">
                  Handy tools. Zero hassle.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {["Text", "Developer", "Security", "Image & QR"].map(
                    (label) => (
                      <span
                        key={label}
                        className="rounded-pill border border-line bg-white/90 px-2.5 py-1 text-[9px] font-semibold text-muted sm:text-[10px]"
                      >
                        {label}
                      </span>
                    ),
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white/90 px-3 py-2 text-[10px] font-semibold text-ink-soft shadow-[0_1px_2px_rgb(23_27_46_/_0.04)] sm:text-[11px]">
                  <Sparkles
                    className="size-3.5 text-brand-500"
                    aria-hidden="true"
                  />
                  6 tools · free · on your device
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-1 h-2.5 w-[86%] rounded-b-2xl bg-gradient-to-b from-lavender-200 to-brand-300/60 shadow-[0_18px_24px_-18px_rgba(72,52,140,0.55)]" />
        </div>

        {/* Floating tool tiles */}
        <FloatTile
          className="top-[4%] left-[2%] bg-white text-accent-purple-ink"
          delay="0s"
        >
          <Type className="size-5" strokeWidth={1.8} />
        </FloatTile>
        <FloatTile
          className="top-0 right-[6%] bg-white text-accent-blue-ink"
          delay="0.8s"
        >
          <Braces className="size-5" strokeWidth={1.8} />
        </FloatTile>
        <FloatTile
          className="top-[42%] left-0 bg-white text-accent-mint-ink"
          delay="1.6s"
        >
          <QrCode className="size-5" strokeWidth={1.8} />
        </FloatTile>
        <FloatTile
          className="top-[38%] right-0 bg-white text-accent-peach-ink"
          delay="2.4s"
        >
          <KeyRound className="size-5" strokeWidth={1.8} />
        </FloatTile>
        <FloatTile
          className="bottom-[2%] left-[10%] bg-white text-accent-purple-ink"
          delay="1.2s"
        >
          <ImageIcon className="size-5" strokeWidth={1.8} />
        </FloatTile>
        <FloatTile
          className="right-[8%] bottom-[6%] bg-white text-accent-blue-ink"
          delay="2s"
        >
          <CaseSensitive className="size-5" strokeWidth={1.8} />
        </FloatTile>
      </div>
    </div>
  );
}

export default HeroVisual;
