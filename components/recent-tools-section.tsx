"use client";

import Link from "next/link";
import { Clock, History } from "lucide-react";
import type { ClientTool } from "@/lib/client-tool";
import { useRecentTools } from "@/lib/use-recent-tools";
import { useHydrated } from "@/lib/use-hydrated";
import ToolIcon from "@/components/tool-icon";

/**
 * "Recently used" row on the homepage. Reads only this browser's local
 * storage (see `use-recent-tools`), renders nothing until hydration and
 * nothing at all when the visitor has no history — no server tracking, no
 * invented popularity numbers.
 */
export default function RecentToolsSection({ tools }: { tools: ClientTool[] }) {
  const ready = useHydrated();
  const recentSlugs = useRecentTools();
  if (!ready || !recentSlugs.length) return null;
  const recent = recentSlugs
    .map((slug) => tools.find((tool) => tool.slug === slug))
    .filter((tool): tool is ClientTool => Boolean(tool));
  if (!recent.length) return null;
  return (
    <section className="recent-tools" aria-label="Recently used tools">
      <span className="recent-tools-label">
        <History size={14} aria-hidden="true" />
        Recently used
      </span>
      {recent.map((tool) => (
        <Link
          key={tool.slug}
          className="recent-tool-chip"
          href={`/tools/${tool.slug}`}
          prefetch={false}
        >
          <ToolIcon icon={tool.icon} color={tool.color} />
          {tool.name}
        </Link>
      ))}
      <Link className="text-link" href="/saved" rel="nofollow">
        <Clock size={13} aria-hidden="true" /> Saved tools
      </Link>
    </section>
  );
}
