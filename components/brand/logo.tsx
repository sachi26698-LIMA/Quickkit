import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark: a rounded-square tile with the QUICKKIT gradient and a "Q" glyph.
 *
 * The gradient is painted with CSS (not an SVG <defs> reference) so the mark
 * can never fall back to a black fill and so any number of instances can render
 * on a page without id collisions. Purely decorative — the accessible name comes
 * from the surrounding link.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.95rem] shadow-[0_6px_14px_-6px_rgb(90_72_214_/_0.7)]",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(140deg, #B9A6FF 0%, #8B78F3 26%, #6C5CE8 58%, #5240CE 100%)",
      }}
    >
      {/* Top light catch + bottom shade for a subtle 3D read */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-white/25 blur-[3px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/25 ring-inset"
      />
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="relative size-[62%]"
        fill="none"
      >
        <circle cx="11" cy="11" r="5.4" stroke="white" strokeWidth="2.7" />
        <path
          d="M14.9 14.9 18 18"
          stroke="white"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[1.32rem] leading-none font-extrabold tracking-[-0.04em] text-ink sm:text-[1.42rem]",
        className,
      )}
      aria-hidden="true"
    >
      QUICK<span className="text-brand-600">KIT</span>
    </span>
  );
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="QUICKKIT home"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-xl transition-opacity hover:opacity-90",
        className,
      )}
    >
      <LogoMark className="size-9 sm:size-10" />
      <Wordmark />
    </Link>
  );
}
