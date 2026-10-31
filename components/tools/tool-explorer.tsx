"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  ImageIcon,
  LayoutGrid,
  Search,
  ShieldCheck,
  Type,
  X,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ToolCard } from "@/components/tools/tool-card";
import { categories, filterTools, tools, type Category } from "@/lib/catalog";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const categoryIcons = {
  "All tools": LayoutGrid,
  Text: Type,
  Developer: Code2,
  Security: ShieldCheck,
  "Image & QR": ImageIcon,
} as const;

const categoryCounts: Record<Category, number> = categories.reduce(
  (counts, category) => ({
    ...counts,
    [category]:
      category === "All tools"
        ? tools.length
        : tools.filter((tool) => tool.category === category).length,
  }),
  {} as Record<Category, number>,
);

export type ToolExplorerProps = {
  anchorId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  showDirectoryLink?: boolean;
  className?: string;
};

/**
 * Premium discovery surface: an elevated search panel with category tiles,
 * live filtering and a refined results grid.
 */
export function ToolExplorer({
  anchorId = "tools",
  eyebrow = "Find your tool",
  title = "Everyday favorites",
  description = "Six focused tools for the small stuff that slows down your day.",
  showDirectoryLink = false,
  className,
}: ToolExplorerProps) {
  const ready = useHydrated();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All tools");
  const resultsRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => filterTools(query, category),
    [query, category],
  );
  const isFiltered = query.trim().length > 0 || category !== "All tools";

  function clearAll() {
    setQuery("");
    setCategory("All tools");
  }

  function scrollToResults() {
    resultsRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return (
    <section
      id={anchorId}
      aria-labelledby={`${anchorId}-heading`}
      className={cn("scroll-mt-28", className)}
    >
      {/* Search + category panel */}
      <div className="relative rounded-[1.6rem] border border-white bg-white/85 p-2.5 shadow-float ring-1 ring-lavender-200/80 backdrop-blur-xl sm:rounded-panel sm:p-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <form
          role="search"
          aria-label="Search QUICKKIT tools"
          className="flex items-center gap-2 rounded-[1.15rem] border border-line bg-canvas-soft py-1.5 pr-1.5 pl-3.5 transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100 sm:gap-3 sm:rounded-2xl sm:py-2 sm:pr-2 sm:pl-5"
          onSubmit={(event) => {
            event.preventDefault();
            scrollToResults();
          }}
        >
          <Search
            aria-hidden="true"
            className="size-5 shrink-0 text-brand-600"
            strokeWidth={2.2}
          />
          <label htmlFor={`${anchorId}-search`} className="sr-only">
            Search tools
          </label>
          <input
            id={`${anchorId}-search`}
            type="search"
            autoComplete="off"
            disabled={!ready}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Search for a tool… (e.g. JSON, image, QR)"
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-base text-ink outline-none placeholder:text-muted focus-visible:ring-0 disabled:opacity-100 sm:text-[0.9375rem] [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-lavender-100 hover:text-brand-700"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-3.5 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 sm:px-6"
          >
            <span className="sr-only sm:not-sr-only">Search</span>
            <Search className="size-4 sm:hidden" aria-hidden="true" />
            <ArrowRight className="hidden size-4 sm:block" aria-hidden="true" />
          </button>
        </form>

        <div
          role="group"
          aria-label="Filter tools by category"
          className="mt-2 grid grid-cols-2 gap-1.5 min-[380px]:grid-cols-3 sm:mt-2.5 lg:grid-cols-5"
        >
          {categories.map((item) => {
            const Icon = categoryIcons[item];
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item)}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 text-left text-[0.75rem] font-bold transition duration-200 min-[380px]:text-[0.8125rem] sm:justify-center sm:gap-2 sm:px-3 sm:text-sm",
                  active
                    ? "border-brand-200 bg-gradient-to-br from-lavender-100 to-lavender-200/70 text-brand-700 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.9)]"
                    : "border-transparent text-ink-soft hover:border-line hover:bg-lavender-50",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-brand-600" : "text-muted",
                  )}
                  strokeWidth={2}
                />
                <span className="min-w-0 truncate">{item}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-auto hidden text-[0.75rem] font-bold sm:inline",
                    active ? "text-brand-600" : "text-muted",
                  )}
                >
                  {categoryCounts[item]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionHeading
        id={`${anchorId}-heading`}
        eyebrow={eyebrow}
        title={title}
        description={description}
        className="mt-8 sm:mt-11"
        action={
          showDirectoryLink ? (
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-bold text-brand-700 shadow-[0_1px_2px_rgb(20_23_42_/_0.04)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-lavender-50"
            >
              View all tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />

      <div className="mt-4 flex items-center gap-2">
        <p
          role="status"
          aria-live="polite"
          className="text-[0.8125rem] font-semibold text-muted"
        >
          {results.length === tools.length
            ? `${tools.length} tools, all free to use`
            : `${results.length} of ${tools.length} tools`}
        </p>
        {isFiltered ? (
          <>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[0.8125rem] font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-500"
            >
              Reset filters
            </button>
          </>
        ) : null}
      </div>

      <div
        ref={resultsRef}
        className="mt-4 grid scroll-mt-28 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
      >
        {results.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-2 rounded-panel border border-dashed border-lavender-300 bg-lavender-50/80 px-5 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-tile">
            <Search className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">No tools found</h3>
          <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-muted">
            Try a different word, or clear the search to see the whole toolkit
            again.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-6 text-[0.9375rem] font-bold text-white shadow-button transition hover:-translate-y-0.5"
          >
            Clear search &amp; filters
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default ToolExplorer;
