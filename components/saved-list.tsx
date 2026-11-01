"use client";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { toolBySlug } from "@/lib/catalog";
import { useFavorites } from "@/lib/use-favorites";
import ToolCard from "@/components/tool-card";

export default function SavedList() {
  const { saved } = useFavorites();
  const savedTools = saved
    .map((slug) => toolBySlug(slug))
    .filter((t) => t !== undefined);

  if (!savedTools.length) {
    return (
      <div className="empty saved-empty">
        <Heart size={34} aria-hidden="true" />
        <h2>No saved tools yet</h2>
        <p>
          Tap the heart on any tool card and it will live here for quick access.
          Your saved list is stored only in this browser.
        </p>
        <Link className="primary" href="/tools">
          Explore All Tools <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }
  return (
    <div className="tool-grid">
      {savedTools.map((tool) => (
        <ToolCard key={tool.slug} tool={tool} />
      ))}
    </div>
  );
}
