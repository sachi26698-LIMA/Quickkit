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
        "inline-flex items-center gap-2 rounded-pill border border-lavender-200 bg-white/85 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-brand-700 uppercase shadow-[0_1px_2px_rgb(23_27_46_/_0.04)] backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}
