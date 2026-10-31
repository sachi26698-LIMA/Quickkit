import { cn } from "@/lib/utils";

/** Small uppercase pill used for hero labels and section eyebrows. */
export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-lavender-200 bg-white/90 px-3.5 py-2 text-[0.6875rem] font-bold tracking-[0.14em] text-brand-700 uppercase shadow-[0_2px_10px_rgb(73_52_145_/_0.08)] backdrop-blur sm:text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}
