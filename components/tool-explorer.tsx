"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Search, SlidersHorizontal, X } from "lucide-react";
import {
  categories,
  filterTools,
  metaByCategory,
  metaBySlug,
  tools,
  toolsByCategory,
  type Category,
} from "@/lib/catalog";
import ToolCard from "@/components/tool-card";
import { useHydrated } from "@/lib/use-hydrated";

export function resolveExplorerCategory(
  value: string | null | undefined,
): Category {
  if (!value) return "All tools";
  const bySlug = metaBySlug(value);
  if (bySlug) return bySlug.name;
  return (categories as readonly string[]).includes(value)
    ? (value as Category)
    : "All tools";
}

function ToolExplorerContent({
  initialQuery = "",
  initialCategory = "All tools",
}: {
  initialQuery?: string;
  initialCategory?: Category;
}) {
  const ready = useHydrated();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category>(initialCategory);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = filterTools(query, category);
  const categoryEmpty =
    category !== "All tools" && toolsByCategory(category).length === 0;

  useEffect(() => {
    if (!ready) return;
    const focusFromHash = () => {
      if (window.location.hash === "#tool-search") {
        inputRef.current?.focus({ preventScroll: true });
      }
    };
    focusFromHash();
    window.addEventListener("hashchange", focusFromHash);
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", focusFromHash);
      window.removeEventListener("keydown", onKey);
    };
  }, [ready]);

  return (
    <>
      <div className="explorer-search">
        <form
          className="search-wrap"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <Search size={21} aria-hidden="true" />
          <label className="sr-only" htmlFor="tool-search">
            Search tools
          </label>
          <input
            ref={inputRef}
            disabled={!ready}
            id="tool-search"
            type="search"
            placeholder="Search tools (e.g. PDF merge, QR code, JSON…)"
            value={query}
            aria-keyshortcuts="Control+K Meta+K"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
          {query ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={18} />
            </button>
          ) : null}
        </form>
      </div>

      <div className="filter-row">
        <div className="filters" aria-label="Filter tools by category">
          {categories.map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              className={category === item ? "chip active" : "chip"}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <SlidersHorizontal
          size={18}
          aria-hidden="true"
          className="filter-decoration"
        />
      </div>

      <p className="sr-only" role="status">
        {results.length} tools found
      </p>

      <h2 className="sr-only">Browse tools</h2>

      {results.length ? (
        <div className="tool-grid">
          {results.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : categoryEmpty ? (
        <div className="empty coming-soon">
          <Clock size={32} aria-hidden="true" />
          <h3>{category} are coming soon</h3>
          <p>
            We’re building this part of the toolkit. Meanwhile, explore the{" "}
            {tools.length} tools that are ready today.
          </p>
          <button
            className="primary"
            onClick={() => {
              setQuery("");
              setCategory("All tools");
            }}
          >
            Browse all tools
          </button>
          <p className="empty-alt">
            or visit the{" "}
            <Link href={`/category/${metaByCategory(category).slug}`}>
              {category} page
            </Link>
          </p>
        </div>
      ) : (
        <div className="empty">
          <Search size={30} aria-hidden="true" />
          <h3>No tools found</h3>
          <p>Try another search or explore the full collection.</p>
          <button
            className="primary"
            onClick={() => {
              setQuery("");
              setCategory("All tools");
            }}
          >
            Clear search & filters
          </button>
        </div>
      )}
    </>
  );
}

function ToolExplorerWithUrlParams({
  initialQuery,
  initialCategory,
}: {
  initialQuery?: string;
  initialCategory?: Category;
}) {
  const searchParams = useSearchParams();
  const qParam = searchParams?.get("q");
  const catParam = searchParams?.get("category");
  const resolvedQuery =
    qParam !== null && qParam !== undefined ? qParam : (initialQuery ?? "");
  const resolvedCategory =
    catParam !== null && catParam !== undefined
      ? resolveExplorerCategory(catParam)
      : (initialCategory ?? "All tools");

  return (
    <ToolExplorerContent
      key={`${resolvedQuery}::${resolvedCategory}`}
      initialQuery={resolvedQuery}
      initialCategory={resolvedCategory}
    />
  );
}

/**
 * The All Tools explorer: search + category filters + saveable tool cards.
 *
 * Pre-renders the complete 42-tool catalog statically (`○`) via its Suspense
 * fallback while still hydrating `?q=` and `?category=` query parameters on the
 * client when visitors navigate from HeroSearch or filtered links.
 */
export default function ToolExplorer({
  initialQuery = "",
  initialCategory = "All tools",
}: {
  initialQuery?: string;
  initialCategory?: Category;
}) {
  return (
    <Suspense
      fallback={
        <ToolExplorerContent
          initialQuery={initialQuery}
          initialCategory={initialCategory}
        />
      }
    >
      <ToolExplorerWithUrlParams
        initialQuery={initialQuery}
        initialCategory={initialCategory}
      />
    </Suspense>
  );
}
