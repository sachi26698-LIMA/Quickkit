"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Search, SlidersHorizontal, X } from "lucide-react";
import {
  categories as staticCategories,
  metaBySlug,
  type Category,
  type CategoryMeta,
} from "@/lib/catalog";
import type { ClientTool } from "@/lib/client-tool";
import ToolCard from "@/components/tool-card";
import { operationForSearch } from "@/lib/tools/security/consolidation";
import { useHydrated } from "@/lib/use-hydrated";
import { rankTools } from "@/lib/tool-search";
import { rememberSearch } from "@/lib/use-recent-searches";

export function resolveExplorerCategory(
  value: string | null | undefined,
  catalog: CategoryMeta[] = staticCategories.slice(1).flatMap((name) => {
    const meta = metaBySlug(
      String(name)
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
    return meta ? [meta] : [];
  }),
): Category {
  if (!value) return "All tools";
  const bySlug = catalog.find((category) => category.slug === value);
  if (bySlug) return bySlug.name;
  return (staticCategories as readonly string[]).includes(value)
    ? (value as Category)
    : "All tools";
}

type SortOrder = "relevance" | "az" | "category";

/** Shared state shape owned by the URL host (or the standalone fallback). */
type ExplorerState = {
  query: string;
  category: string;
  sort: SortOrder;
  setQuery: (value: string) => void;
  setCategory: (value: string) => void;
  setSort: (value: SortOrder) => void;
  clear: () => void;
};

function ToolExplorerContent({
  tools,
  categoryMeta,
  state,
}: {
  tools: ClientTool[];
  categoryMeta: CategoryMeta[];
  state: ExplorerState;
}) {
  const ready = useHydrated();
  const { query, category, sort, setQuery, setCategory, setSort, clear } =
    state;
  const inputRef = useRef<HTMLInputElement>(null);
  const availableCategories = [
    "All tools",
    ...categoryMeta.map((meta) => meta.name),
  ];

  const needle = query.trim().toLocaleLowerCase();
  const matches = tools.filter(
    (tool) =>
      (category === "All tools" ||
        tool.category === category ||
        ("categories" in tool &&
          Array.isArray(tool.categories) &&
          (tool.categories as readonly string[]).includes(category))) &&
      (!needle ||
        `${tool.name} ${tool.description} ${tool.keywords} ${tool.category}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  // Same name-first ordering as the hero box and the command palette, so
  // "pdf" ranks PDF Merger above a tool that merely mentions PDFs.
  const results = needle
    ? rankTools(matches, needle)
    : sort === "az"
      ? [...matches].sort((a, b) => a.name.localeCompare(b.name))
      : sort === "category"
        ? [...matches].sort(
            (a, b) =>
              a.category.localeCompare(b.category) ||
              a.name.localeCompare(b.name),
          )
        : matches;
  const filtersActive = query.trim().length > 0 || category !== "All tools";
  const categoryEmpty =
    category !== "All tools" &&
    !tools.some(
      (tool) =>
        tool.category === category ||
        ("categories" in tool &&
          Array.isArray(tool.categories) &&
          (tool.categories as readonly string[]).includes(category)),
    );

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
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) rememberSearch(query);
          }}
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
            aria-describedby="explorer-count"
            placeholder="Search tools (e.g. PDF merge, QR code, JSON…)"
            value={query}
            aria-keyshortcuts="Control+K Meta+K"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter" && query.trim()) rememberSearch(query);
            }}
          />
          {query ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          ) : null}
        </form>
      </div>

      <div className="filter-row">
        <div className="filters" aria-label="Filter tools by category">
          {availableCategories.map((item) => (
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

      <div className="explorer-meta">
        {/* One live region per page: the exact "N tools found" phrasing the
            screen-reader announcement and the e2e suite both rely on. */}
        <p className="explorer-count" id="explorer-count" role="status">
          <strong>{results.length}</strong> tools found
        </p>
        <div className="explorer-meta-actions">
          <label className="explorer-sort">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
            >
              <option value="relevance">Relevance</option>
              <option value="az">Name A–Z</option>
              <option value="category">Category</option>
            </select>
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="secondary explorer-clear"
              onClick={clear}
            >
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <h2 className="sr-only">Browse tools</h2>

      {results.length ? (
        <div className="tool-grid">
          {results.map((tool) => {
            const operation = operationForSearch(tool.slug, query);
            return (
              <ToolCard
                key={tool.slug}
                tool={tool}
                href={
                  operation
                    ? `/tools/${tool.slug}?operation=${encodeURIComponent(operation)}`
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : categoryEmpty ? (
        <div className="empty coming-soon">
          <Clock size={32} aria-hidden="true" />
          <h3>{category} are coming soon</h3>
          <p>
            We’re building this part of the toolkit. Meanwhile, explore the{" "}
            {tools.length} tools that are ready today.
          </p>
          <button className="primary" onClick={clear}>
            Browse all tools
          </button>
          <p className="empty-alt">
            or visit the{" "}
            <Link
              href={`/category/${categoryMeta.find((meta) => meta.name === category)?.slug ?? ""}`}
            >
              {category} page
            </Link>
          </p>
        </div>
      ) : (
        <div className="empty">
          <Search size={30} aria-hidden="true" />
          <h3>No tools found</h3>
          <p>
            Try a shorter query like “PDF” or “QR”, or clear the filters to see
            the full collection.
          </p>
          <button className="primary" onClick={clear}>
            Clear search & filters
          </button>
        </div>
      )}
    </>
  );
}

/** Stateful shell used by the Suspense fallback (server render, no router). */
function StandaloneExplorer({
  initialQuery,
  initialCategory,
  tools,
  categoryMeta,
}: {
  initialQuery?: string;
  initialCategory?: Category;
  tools: ClientTool[];
  categoryMeta: CategoryMeta[];
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState<string>(
    initialCategory ?? "All tools",
  );
  const [sort, setSort] = useState<SortOrder>("relevance");
  return (
    <ToolExplorerContent
      tools={tools}
      categoryMeta={categoryMeta}
      state={{
        query,
        category,
        sort,
        setQuery,
        setCategory,
        setSort,
        clear: () => {
          setQuery("");
          setCategory("All tools");
          setSort("relevance");
        },
      }}
    />
  );
}

/**
 * URL is the source of truth for `?q=` and `?category=` so filters survive
 * refresh and sharing. Typing updates the URL with `replaceState` (no server
 * round-trip, no history spam); category changes and clears use `pushState`
 * so Back returns to the previous filter. Inbound URL changes — including
 * back/forward — are adopted through a last-written guard, which stops a
 * slow replace from overwriting newer keystrokes.
 */
function ToolExplorerWithUrlParams({
  initialQuery,
  initialCategory,
  tools,
  categoryMeta,
}: {
  initialQuery?: string;
  initialCategory?: Category;
  tools: ClientTool[];
  categoryMeta: CategoryMeta[];
}) {
  const searchParams = useSearchParams();
  const qParam = searchParams?.get("q") ?? initialQuery ?? "";
  const catParam = searchParams?.get("category");
  const [query, setQueryState] = useState(qParam);
  const [category, setCategoryState] = useState<string>(() =>
    catParam !== null && catParam !== undefined
      ? resolveExplorerCategory(catParam, categoryMeta)
      : (initialCategory ?? "All tools"),
  );
  const [sort, setSort] = useState<SortOrder>("relevance");
  const lastWritten = useRef<{ q: string; cat: string }>({
    q: qParam,
    cat: category,
  });
  const debounceRef = useRef<number | undefined>(undefined);

  // Adopt inbound URL changes (back/forward, link navigation).
  useEffect(() => {
    if (lastWritten.current.q !== qParam) {
      lastWritten.current.q = qParam;
      setQueryState(qParam);
    }
    const nextCategory =
      catParam !== null && catParam !== undefined
        ? resolveExplorerCategory(catParam, categoryMeta)
        : "All tools";
    if (lastWritten.current.cat !== nextCategory) {
      lastWritten.current.cat = nextCategory;
      setCategoryState(nextCategory);
    }
  }, [qParam, catParam, categoryMeta]);

  const writeUrl = (nextQuery: string, nextCategory: string, push: boolean) => {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextCategory && nextCategory !== "All tools") {
      const meta = categoryMeta.find((item) => item.name === nextCategory);
      if (meta) params.set("category", meta.slug);
    }
    const qs = params.toString();
    const url = qs ? `/tools?${qs}` : "/tools";
    lastWritten.current = { q: trimmed, cat: nextCategory };
    if (push) {
      window.history.pushState(window.history.state, "", url);
    } else {
      window.history.replaceState(window.history.state, "", url);
    }
  };

  const setQuery = (value: string) => {
    setQueryState(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      writeUrl(value, category, false);
    }, 300);
  };

  const setCategory = (value: string) => {
    setCategoryState(value);
    window.clearTimeout(debounceRef.current);
    writeUrl(query, value, true);
  };

  const clear = () => {
    window.clearTimeout(debounceRef.current);
    setQueryState("");
    setCategoryState("All tools");
    setSort("relevance");
    writeUrl("", "All tools", true);
  };

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  return (
    <ToolExplorerContent
      tools={tools}
      categoryMeta={categoryMeta}
      state={{
        query,
        category,
        sort,
        setQuery,
        setCategory,
        setSort,
        clear,
      }}
    />
  );
}

/**
 * The All Tools explorer: search + category filters + saveable tool cards.
 *
 * Pre-renders the complete catalogue statically (`○`) via its Suspense
 * fallback while still hydrating `?q=` and `?category=` query parameters on
 * the client when visitors navigate from HeroSearch or filtered links.
 */
export default function ToolExplorer({
  initialQuery = "",
  initialCategory = "All tools",
  tools,
  categoryMeta,
}: {
  initialQuery?: string;
  initialCategory?: Category;
  tools: ClientTool[];
  categoryMeta: CategoryMeta[];
}) {
  return (
    <Suspense
      fallback={
        <StandaloneExplorer
          initialQuery={initialQuery}
          initialCategory={initialCategory}
          tools={tools}
          categoryMeta={categoryMeta}
        />
      }
    >
      <ToolExplorerWithUrlParams
        initialQuery={initialQuery}
        initialCategory={initialCategory}
        tools={tools}
        categoryMeta={categoryMeta}
      />
    </Suspense>
  );
}
