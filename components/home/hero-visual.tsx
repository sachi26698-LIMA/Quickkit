import {
  ArrowUpRight,
  Braces,
  CaseSensitive,
  Check,
  ImageIcon,
  KeyRound,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function FloatTile({
  className,
  tone,
  delay,
  children,
  label,
}: {
  className?: string;
  tone: string;
  delay: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{ animationDelay: delay }}
      className={cn(
        "absolute grid animate-float place-items-center rounded-[1.15rem] border border-white/90 shadow-tile sm:rounded-[1.35rem]",
        "after:pointer-events-none after:absolute after:inset-x-1.5 after:top-1 after:h-1/3 after:rounded-full after:bg-white/45 after:blur-[2px]",
        tone,
        className,
      )}
      title={label}
    >
      {children}
    </span>
  );
}

const previewRows = [
  {
    icon: Type,
    label: "Word Counter",
    tone: "from-[#f4efff] to-[#e3d8ff]",
    ink: "text-accent-purple-ink",
  },
  {
    icon: Braces,
    label: "JSON Formatter",
    tone: "from-[#eff5ff] to-[#dbe7ff]",
    ink: "text-accent-blue-ink",
  },
  {
    icon: QrCode,
    label: "QR Generator",
    tone: "from-[#f0fff9] to-[#d3f7e8]",
    ink: "text-accent-mint-ink",
  },
];

/**
 * Decorative hero illustration: layered glass window, orbit rings and floating
 * tool tiles. Built from CSS + Lucide so it stays crisp at any size and ships
 * no image payload. Everything here is aria-hidden.
 */
export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[16rem] select-none min-[380px]:max-w-[18rem] sm:max-w-[27rem] lg:max-w-[34rem]"
    >
      {/* Soft light field */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] blur-2xl sm:-inset-10"
        style={{
          background:
            "radial-gradient(58% 58% at 68% 28%, rgba(139,120,243,0.42), transparent 70%), radial-gradient(52% 52% at 22% 78%, rgba(179,240,221,0.75), transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 animate-drift rounded-[3rem] opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(40% 40% at 20% 20%, rgba(255,214,232,0.55), transparent 70%)",
        }}
      />

      <div className="relative aspect-[5/4.5]">
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-6 -z-10 rounded-[2.5rem] bg-grid-soft [mask-image:radial-gradient(65%_65%_at_50%_50%,black,transparent)] opacity-40" />

        {/* Orbit rings */}
        <div className="absolute inset-x-[2%] top-[14%] h-[58%] -rotate-[15deg] rounded-[50%] border border-white/90 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_20px_40px_-30px_rgba(73,52,145,0.5)]" />
        <div className="absolute inset-x-[14%] top-[23%] h-[42%] rotate-[13deg] rounded-[50%] border border-lavender-200/90" />

        {/* Floating tool tiles */}
        <FloatTile
          className="top-[2%] left-[1%] size-11 text-accent-purple-ink sm:size-14"
          tone="bg-gradient-to-br from-[#faf7ff] to-[#e6dcff]"
          delay="0s"
          label="Text tools"
        >
          <Type className="size-4 sm:size-6" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[1%] right-[6%] size-10 text-accent-blue-ink sm:size-13"
          tone="bg-gradient-to-br from-[#f7fbff] to-[#dbe8ff]"
          delay="0.9s"
          label="Developer tools"
        >
          <Braces className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[44%] left-[-1%] size-10 text-accent-mint-ink sm:size-12"
          tone="bg-gradient-to-br from-[#f5fffb] to-[#d1f7e7]"
          delay="1.7s"
          label="QR tools"
        >
          <QrCode className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[40%] right-[-1%] size-11 text-accent-peach-ink sm:size-13"
          tone="bg-gradient-to-br from-[#fffaf5] to-[#ffe2c9]"
          delay="2.4s"
          label="Password tools"
        >
          <KeyRound className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="bottom-[4%] left-[8%] hidden size-11 text-accent-peach-ink sm:grid sm:size-12"
          tone="bg-gradient-to-br from-[#fffaf5] to-[#ffe6d2]"
          delay="1.2s"
          label="Image tools"
        >
          <ImageIcon className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="right-[10%] bottom-[1%] hidden size-10 text-[#9c3a63] sm:grid sm:size-12"
          tone="bg-gradient-to-br from-[#fff8fb] to-[#ffdfec]"
          delay="2s"
          label="Case tools"
        >
          <CaseSensitive className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>

        {/* Main glass window */}
        <div className="absolute top-1/2 left-1/2 w-[82%] -translate-x-1/2 -translate-y-[52%] -rotate-[3.5deg] sm:w-[78%]">
          <div className="rounded-[1.4rem] border border-white/90 bg-white/70 p-1.5 shadow-float ring-1 ring-lavender-200/80 backdrop-blur-md sm:rounded-[1.8rem] sm:p-2">
            <div className="overflow-hidden rounded-[1.05rem] border border-line-soft bg-gradient-to-br from-white via-white to-lavender-50 sm:rounded-[1.4rem]">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 border-b border-line-soft bg-white/70 px-3 py-2 sm:px-4 sm:py-2.5">
                <span className="size-1.5 rounded-full bg-brand-200" />
                <span className="size-1.5 rounded-full bg-mint-200" />
                <span className="size-1.5 rounded-full bg-lavender-300" />
                <span className="mx-auto rounded-pill bg-lavender-50 px-2 py-0.5 text-[8px] font-bold tracking-[0.1em] text-muted uppercase sm:text-[9px]">
                  quickkit
                </span>
              </div>

              <div className="px-3 pt-3 pb-3.5 sm:px-5 sm:pt-4 sm:pb-5">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <LogoMark
                    gradientId="quickkit-mark-hero"
                    className="size-8 rounded-[0.6rem] sm:size-11 sm:rounded-[0.9rem]"
                  />
                  <div className="min-w-0">
                    <p className="text-[0.9rem] leading-none font-extrabold tracking-[-0.04em] text-ink sm:text-xl">
                      QUICK<span className="text-brand-600">KIT</span>
                    </p>
                    <p className="mt-1 hidden text-[8px] font-bold tracking-[0.14em] whitespace-nowrap text-muted uppercase min-[360px]:block sm:text-[9px]">
                      Handy tools · zero hassle
                    </p>
                  </div>
                  <span className="ml-auto flex items-center gap-1 rounded-pill border border-mint-200 bg-mint-soft px-1.5 py-0.5 text-[7px] font-bold text-mint-ink sm:px-2 sm:py-1 sm:text-[9px]">
                    <ShieldCheck
                      className="size-2.5 sm:size-3"
                      strokeWidth={2.4}
                    />
                    Local
                  </span>
                </div>

                {/* Mini search */}
                <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 shadow-[0_1px_2px_rgb(20_23_42_/_0.04)] sm:mt-4 sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2">
                  <Search
                    className="size-3 text-brand-500 sm:size-3.5"
                    strokeWidth={2.4}
                  />
                  <span className="text-[8px] text-muted sm:text-[10px]">
                    Search for a tool…
                  </span>
                  <span className="ml-auto rounded-md bg-lavender-100 px-1 py-0.5 text-[7px] font-bold text-brand-700 sm:text-[8px]">
                    ↵
                  </span>
                </div>

                {/* Mini tool rows */}
                <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
                  {previewRows.map(({ icon: Icon, label, tone, ink }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/90 px-1.5 py-1 sm:gap-2.5 sm:rounded-xl sm:px-2 sm:py-1.5"
                    >
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-md bg-gradient-to-br sm:size-6 sm:rounded-lg",
                          tone,
                          ink,
                        )}
                      >
                        <Icon
                          className="size-2.5 sm:size-3"
                          strokeWidth={2.1}
                        />
                      </span>
                      <span className="text-[8px] font-semibold text-ink sm:text-[10px]">
                        {label}
                      </span>
                      <ArrowUpRight className="ml-auto size-2.5 text-brand-400 sm:size-3" />
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center gap-1 text-[7px] font-semibold text-muted sm:mt-3 sm:text-[9px]">
                  <Check
                    className="size-2.5 text-mint-deep sm:size-3"
                    strokeWidth={3}
                  />
                  Free · No sign-up · Processed on your device
                </div>
              </div>
            </div>
          </div>
          {/* Base plate for depth */}
          <div className="mx-auto h-2 w-[88%] rounded-b-2xl bg-gradient-to-b from-lavender-200 to-brand-300/50 shadow-[0_24px_30px_-24px_rgba(73,52,145,0.7)] sm:h-3" />
        </div>

        {/* Floating chips */}
        <span
          className="absolute top-[30%] right-[-4%] hidden animate-float items-center gap-1 rounded-pill border border-white bg-white/95 px-2.5 py-1 text-[9px] font-bold text-ink shadow-tile sm:flex sm:text-[10px]"
          style={{ animationDelay: "1.4s" }}
        >
          <Sparkles className="size-2.5 text-brand-500" />6 free tools
        </span>
        <span
          className="absolute bottom-[16%] left-[-3%] hidden animate-float items-center gap-1 rounded-pill border border-mint-200 bg-mint-soft px-2.5 py-1 text-[9px] font-bold text-mint-ink shadow-tile sm:flex sm:text-[10px]"
          style={{ animationDelay: "0.6s" }}
        >
          <ShieldCheck className="size-2.5" />0 uploads
        </span>
      </div>
    </div>
  );
}

export default HeroVisual;
