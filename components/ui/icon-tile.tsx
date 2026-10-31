import { cn } from "@/lib/utils";

export type TileTone =
  "purple" | "blue" | "mint" | "peach" | "brand" | "neutral";
export type TileSize = "sm" | "md" | "lg";

const tones: Record<TileTone, string> = {
  purple: "bg-accent-purple-soft text-accent-purple-ink",
  blue: "bg-accent-blue-soft text-accent-blue-ink",
  mint: "bg-accent-mint-soft text-accent-mint-ink",
  peach: "bg-accent-peach-soft text-accent-peach-ink",
  brand: "bg-lavender-100 text-brand-700",
  neutral: "border border-line bg-white text-muted",
};

const sizes: Record<TileSize, string> = {
  sm: "size-9 rounded-xl [&_svg]:size-4",
  md: "size-12 rounded-2xl [&_svg]:size-5",
  lg: "size-14 rounded-2xl [&_svg]:size-6",
};

/** Decorative rounded icon tile used across cards, headers and callouts. */
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
        "grid shrink-0 place-items-center shadow-tile",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
