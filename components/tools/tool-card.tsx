import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ToolIcon from "@/components/tools/tool-icon";
import type { Tool } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Reusable discovery card. The `.tool-card` hook is kept stable for the
 * browser suite that counts rendered results.
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
        "tool-card group relative flex items-start gap-3.5 rounded-card border border-line bg-white p-4 shadow-[0_1px_2px_rgb(23_27_46_/_0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card focus-visible:-translate-y-0.5 focus-visible:border-brand-300 focus-visible:shadow-card sm:p-5",
        className,
      )}
    >
      <ToolIcon icon={tool.icon} color={tool.color} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] leading-snug font-bold tracking-[-0.01em] text-ink transition-colors group-hover:text-brand-700">
          {tool.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
          {tool.description}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-lavender-50 text-brand-700 transition duration-200 group-hover:translate-x-0.5 group-hover:bg-lavender-100"
      >
        <ArrowRight className="size-4" strokeWidth={2} />
      </span>
    </Link>
  );
}

export default ToolCard;
