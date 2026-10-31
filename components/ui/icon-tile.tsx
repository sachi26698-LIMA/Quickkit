import { cn } from "@/lib/utils";

export type TileTone =
  "purple" | "blue" | "mint" | "peach" | "blush" | "brand" | "neutral";

export type TileSize = "xs" | "sm" | "md" | "lg" | "xl";

const tones: Record<TileTone, string> = {
  purple:
    "bg-gradient-to-br from-[#f4efff] to-[#e4d9ff] text-accent-purple-ink ring-1 ring-white/70",
  blue: "bg-gradient-to-br from-[#eff5ff] to-[#dce8ff] text-accent-blue-ink ring-1 ring-white/70",
  mint: "bg-gradient-to-br from-[#f0fff9] to-[#d4f8e9] text-accent-mint-ink ring-1 ring-white/70",
  peach:
    "bg-gradient-to-br from-[#fff6ee] to-[#ffe4cd] text-accent-peach-ink ring-1 ring-white/70",
  blush:
    "bg-gradient-to-br from-[#fff2f7] to-[#ffdcea] text-blush-ink ring-1 ring-white/70",
  brand:
    "bg-gradient-to-br from-brand-400 via-brand-600 to-brand-700 text-white ring-1 ring-white/25",
  neutral: "border border-line bg-white text-muted",
};

const sizes: Record<TileSize, string> = {
  xs: "size-8 rounded-[0.6rem] [&_svg]:size-3.5",
  sm: "size-10 rounded-xl [&_svg]:size-[1.1rem]",
  md: "size-12 rounded-2xl [&_svg]:size-5",
  lg: "size-14 rounded-[1.15rem] [&_svg]:size-6",
  xl: "size-16 rounded-[1.3rem] [&_svg]:size-7",
};

/** Decorative rounded icon tile with a soft pastel gradient and inner light. */
export function IconTile({
  tone = "brand",
  size = "md",
  className,
  children,
}: {
  tone?: TileTone;
  size?: TileSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center shadow-tile after:pointer-events-none after:absolute after:inset-x-1 after:top-0.5 after:h-1/3 after:rounded-full after:bg-white/40 after:blur-[2px]",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
