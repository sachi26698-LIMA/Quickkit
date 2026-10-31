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

export type ToolExplorerProps = {
  /** Anchor target used by header/hero links. */
  anchorId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Show the "View all tools" shortcut used on the homepage. */
  showDirectoryLink?: boolean;
  className?: string;
};

/**
 * Premium search + category discovery surface.
 * Search filters live while typing, category chips narrow the results, and an
 * explicit empty state restores the full catalog.
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
    const target = resultsRef.current;
    if (!target) return;
    target.scrollIntoView({
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
      className={cn("scroll-mt-24", className)}
    >
      <form
        role="search"
        aria-label="Search QUICKKIT tools"
        className="group/search flex items-center gap-2 rounded-2xl border border-line bg-white p-1.5 pl-4 shadow-soft transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100 sm:gap-3 sm:rounded-[1.25rem] sm:p-2 sm:pl-5"
        onSubmit={(event) => {
          event.preventDefault();
          scrollToResults();
        }}
      >
        <Search
          aria-hidden="true"
          className="size-5 shrink-0 text-brand-600"
          strokeWidth={2}
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
          placeholder="Search for a tool… (e.g. JSON, image, QR, text)"
          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-0 disabled:opacity-100 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-lavender-50 hover:text-brand-700"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="submit"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-button transition hover:bg-brand-700 sm:min-h-11 sm:px-6"
        >
          <span className="sr-only sm:not-sr-only">Search</span>
          <Search className="size-4 sm:hidden" aria-hidden="true" />
          <ArrowRight className="hidden size-4 sm:block" aria-hidden="true" />
        </button>
      </form>

      <div
        role="group"
        aria-label="Filter tools by category"
        className="mt-3 flex [scrollbar-width:none] gap-1.5 overflow-x-auto rounded-2xl border border-line bg-white/80 p-1.5 shadow-soft backdrop-blur sm:mt-4 sm:gap-2 [&::-webkit-scrollbar]:hidden"
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
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold whitespace-nowrap transition sm:min-h-11 sm:flex-1 sm:justify-center sm:text-sm",
                active
                  ? "bg-lavender-100 text-brand-700 shadow-[inset_0_0_0_1px_var(--color-lavender-200)]"
                  : "text-muted hover:bg-lavender-50 hover:text-brand-700",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4",
                  active ? "text-brand-600" : "text-muted",
                )}
                strokeWidth={1.9}
              />
              {item}
            </button>
          );
        })}
      </div>

      <SectionHeading
        id={`${anchorId}-heading`}
        eyebrow={eyebrow}
        title={title}
        description={description}
        className="mt-9 sm:mt-11"
        action={
          showDirectoryLink ? (
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
            >
              View all tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />

      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-[13px] font-medium text-muted"
      >
        {results.length === tools.length
          ? `${tools.length} tools, all free to use`
          : `${results.length} of ${tools.length} tools`}
      </p>

      <div
        ref={resultsRef}
        className="mt-4 grid scroll-mt-24 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {results.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-2 rounded-panel border border-dashed border-lavender-300 bg-lavender-50/70 px-5 py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-tile">
            <Search className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-ink">No tools found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Try a different word, or clear the search to see the whole toolkit
            again.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-button transition hover:bg-brand-700"
          >
            Clear search &amp; filters
          </button>
        </div>
      ) : null}

      {isFiltered && results.length > 0 ? (
        <p className="mt-4 text-xs text-muted">
          Filtering by{" "}
          <span className="font-semibold text-ink-soft">{category}</span>
          {query.trim() ? (
            <>
              {" "}
              and{" "}
              <span className="font-semibold text-ink-soft">
                “{query.trim()}”
              </span>
            </>
          ) : null}
          .{" "}
          <button
            type="button"
            onClick={clearAll}
            className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-500"
          >
            Reset
          </button>
        </p>
      ) : null}
    </section>
  );
}

export default ToolExplorer;
