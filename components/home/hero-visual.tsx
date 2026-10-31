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
}: {
  className?: string;
  tone: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{ animationDelay: delay }}
      className={cn(
        "absolute grid animate-float place-items-center rounded-[1.1rem] border border-white/90 shadow-tile sm:rounded-[1.3rem]",
        "before:pointer-events-none before:absolute before:inset-x-1.5 before:top-1 before:h-1/3 before:rounded-full before:bg-white/50 before:blur-[2px]",
        tone,
        className,
      )}
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
 * Hero illustration: a layered glass "toolkit window" grounded on a soft plate,
 * framed by orbit rings, a dot grid and six floating tool tiles.
 * Built from CSS + Lucide so it stays sharp at every size and ships no image
 * payload. Decorative only — aria-hidden.
 */
export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[16.5rem] select-none min-[380px]:max-w-[18.5rem] sm:max-w-[27rem] lg:max-w-[33rem]"
    >
      {/* Ambient light field */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[3rem] blur-2xl sm:-inset-8"
        style={{
          background:
            "radial-gradient(58% 56% at 66% 30%, rgba(139,120,243,0.40), transparent 70%), radial-gradient(52% 52% at 20% 80%, rgba(179,240,221,0.7), transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 animate-drift rounded-[3rem] opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(38% 38% at 18% 16%, rgba(255,214,232,0.55), transparent 70%)",
        }}
      />

      <div className="relative aspect-[5/4.6]">
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-4 -z-10 rounded-[2.5rem] bg-grid-soft [mask-image:radial-gradient(62%_62%_at_50%_52%,black,transparent)] opacity-40" />

        {/* Orbit rings */}
        <div className="absolute inset-x-[3%] top-[16%] h-[56%] -rotate-[14deg] rounded-[50%] border border-white/90 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_50px_-38px_rgba(73,52,145,0.6)]" />
        <div className="absolute inset-x-[15%] top-[25%] h-[40%] rotate-[12deg] rounded-[50%] border border-lavender-200/90" />

        {/* Floating tool tiles — balanced 2 left / 3 right framing */}
        <FloatTile
          className="top-[3%] left-[2%] size-11 text-accent-purple-ink sm:size-14"
          tone="bg-gradient-to-br from-[#faf7ff] to-[#e4d8ff]"
          delay="0s"
        >
          <Type className="size-4 sm:size-6" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[1%] right-[8%] size-10 text-accent-blue-ink sm:size-[3.25rem]"
          tone="bg-gradient-to-br from-[#f7fbff] to-[#d8e6ff]"
          delay="0.9s"
        >
          <Braces className="size-4 sm:size-[1.35rem]" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[46%] left-[-1%] size-10 text-accent-mint-ink sm:size-12"
          tone="bg-gradient-to-br from-[#f5fffb] to-[#cff7e6]"
          delay="1.7s"
        >
          <QrCode className="size-4 sm:size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="top-[38%] right-[-1%] size-11 text-accent-peach-ink sm:size-[3.25rem]"
          tone="bg-gradient-to-br from-[#fffaf5] to-[#ffe0c5]"
          delay="2.4s"
        >
          <KeyRound className="size-4 sm:size-[1.35rem]" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="bottom-[6%] left-[9%] hidden text-accent-peach-ink sm:grid sm:size-12"
          tone="bg-gradient-to-br from-[#fffaf5] to-[#ffe6d2]"
          delay="1.2s"
        >
          <ImageIcon className="size-5" strokeWidth={1.9} />
        </FloatTile>
        <FloatTile
          className="right-[11%] bottom-[2%] hidden text-blush-ink sm:grid sm:size-12"
          tone="bg-gradient-to-br from-[#fff8fb] to-[#ffdceb]"
          delay="2s"
        >
          <CaseSensitive className="size-5" strokeWidth={1.9} />
        </FloatTile>

        {/* Ground shadow */}
        <div className="absolute bottom-[7%] left-1/2 h-5 w-[62%] -translate-x-1/2 rounded-[50%] bg-brand-800/15 blur-xl sm:h-7" />

        {/* Main glass window */}
        <div className="absolute top-1/2 left-1/2 w-[84%] -translate-x-1/2 -translate-y-[51%] -rotate-[3deg] sm:w-[80%]">
          <div className="rounded-[1.35rem] border border-white/95 bg-white/70 p-1.5 shadow-float ring-1 ring-lavender-200/80 backdrop-blur-md sm:rounded-[1.75rem] sm:p-2">
            <div className="overflow-hidden rounded-[1.05rem] border border-line-soft bg-gradient-to-br from-white via-white to-lavender-50 sm:rounded-[1.35rem]">
              {/* Window chrome */}
              <div className="relative flex items-center gap-1.5 border-b border-line-soft bg-white/75 px-3 py-2 sm:px-4 sm:py-2.5">
                <span className="size-1.5 rounded-full bg-[#ffc9d2]" />
                <span className="size-1.5 rounded-full bg-[#ffe6bf]" />
                <span className="size-1.5 rounded-full bg-mint-200" />
                <span className="mx-auto rounded-pill bg-lavender-50 px-2 py-0.5 text-[8px] font-bold tracking-[0.1em] text-muted uppercase sm:text-[9px]">
                  quickkit
                </span>
              </div>

              <div className="relative px-3 pt-3 pb-3.5 sm:px-5 sm:pt-4 sm:pb-5">
                {/* glass sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent" />

                <div className="relative flex items-center gap-2 sm:gap-2.5">
                  <LogoMark className="size-8 rounded-[0.7rem] sm:size-11 sm:rounded-[0.95rem]" />
                  <div className="min-w-0">
                    <p className="text-[0.9rem] leading-none font-extrabold tracking-[-0.04em] text-ink sm:text-xl">
                      QUICK<span className="text-brand-600">KIT</span>
                    </p>
                    <p className="mt-1 hidden text-[8px] font-bold tracking-[0.14em] whitespace-nowrap text-muted uppercase min-[360px]:block sm:text-[9px]">
                      Handy tools · zero hassle
                    </p>
                  </div>
                  <span className="ml-auto flex shrink-0 items-center gap-1 rounded-pill border border-mint-200 bg-mint-soft px-1.5 py-0.5 text-[7px] font-bold text-mint-ink sm:px-2 sm:py-1 sm:text-[9px]">
                    <ShieldCheck
                      className="size-2.5 sm:size-3"
                      strokeWidth={2.4}
                    />
                    Local
                  </span>
                </div>

                {/* Mini search */}
                <div className="relative mt-3 flex items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 shadow-[0_1px_2px_rgb(20_23_42_/_0.04)] sm:mt-4 sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2">
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
                <div className="relative mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
                  {previewRows.map(({ icon: Icon, label, tone, ink }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/95 px-1.5 py-1 sm:gap-2.5 sm:rounded-xl sm:px-2 sm:py-1.5"
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

                <div className="relative mt-2.5 flex items-center gap-1 text-[7px] font-semibold text-muted sm:mt-3 sm:text-[9px]">
                  <Check
                    className="size-2.5 text-mint-deep sm:size-3"
                    strokeWidth={3}
                  />
                  Free · No sign-up · Processed on your device
                </div>
              </div>
            </div>
          </div>
          {/* Base plate */}
          <div className="mx-auto h-2 w-[88%] rounded-b-2xl bg-gradient-to-b from-lavender-200 to-brand-300/50 sm:h-2.5" />
        </div>

        {/* Edge chips (desktop/tablet only) */}
        <span
          className="absolute top-[26%] right-[-2%] hidden animate-float items-center gap-1 rounded-pill border border-white bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-tile sm:flex"
          style={{ animationDelay: "1.4s" }}
        >
          <Sparkles className="size-3 text-brand-500" />6 free tools
        </span>
        <span
          className="absolute bottom-[22%] left-[-2%] hidden animate-float items-center gap-1 rounded-pill border border-mint-200 bg-mint-soft px-2.5 py-1 text-[10px] font-bold text-mint-ink shadow-tile sm:flex"
          style={{ animationDelay: "0.6s" }}
        >
          <ShieldCheck className="size-3" />0 uploads
        </span>
      </div>
    </div>
  );
}

export default HeroVisual;
