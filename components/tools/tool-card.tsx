import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ToolIcon from "@/components/tools/tool-icon";
import type { Tool } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Premium discovery card: pastel icon tile, category chip, title, description
 * and a hover affordance. `.tool-card` is a stable hook used by the test suite.
 */
export function ToolCard({
  tool,
  className,
}: {
  tool: Tool;
  className?: string;
}) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        "tool-card group relative flex flex-col overflow-hidden rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card focus-visible:-translate-y-1 focus-visible:border-brand-300 focus-visible:shadow-card sm:p-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-lavender-50 via-white to-mint-soft/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <ToolIcon
          icon={tool.icon}
          color={tool.color}
          size="lg"
          className="transition-transform duration-300 group-hover:scale-105"
        />
        <span className="rounded-pill border border-line bg-white/80 px-2.5 py-1 text-[0.75rem] font-bold tracking-wide text-muted uppercase">
          {tool.category}
        </span>
      </div>

      <h3 className="relative mt-4 text-[1.0625rem] leading-snug font-bold tracking-[-0.02em] text-ink transition-colors group-hover:text-brand-700 sm:text-lg">
        {tool.name}
      </h3>
      <p className="relative mt-1.5 text-[0.875rem] leading-relaxed text-muted sm:line-clamp-2 sm:text-[0.9375rem]">
        {tool.description}
      </p>

      <div className="relative mt-auto flex items-center justify-between pt-4 sm:pt-5">
        <span className="text-[0.8125rem] font-bold text-brand-700">
          Open tool
        </span>
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full border border-line bg-white text-brand-700 shadow-[0_1px_2px_rgb(20_23_42_/_0.04)] transition duration-300 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white"
        >
          <ArrowUpRight className="size-4" strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  );
}

export default ToolCard;
