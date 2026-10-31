import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark: a rounded-square gradient tile with the QUICKKIT "Q" glyph.
 * Purely decorative — the accessible name comes from the surrounding link.
 */
export function LogoMark({
  className,
  gradientId = "quickkit-mark",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn("size-10 shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="6"
          y1="2"
          x2="42"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A78BFA" />
          <stop offset="0.55" stopColor="#6C57E8" />
          <stop offset="1" stopColor="#5540C8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="13"
        stroke="white"
        strokeOpacity="0.22"
      />
      <circle cx="22.5" cy="22.5" r="9" stroke="white" strokeWidth="4.4" />
      <path
        d="M29 30.5 33.5 35"
        stroke="white"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
    </svg>
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
  gradientId,
  href = "/",
}: {
  className?: string;
  gradientId?: string;
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
      <LogoMark gradientId={gradientId} className="size-9 sm:size-10" />
      <Wordmark />
    </Link>
  );
}
