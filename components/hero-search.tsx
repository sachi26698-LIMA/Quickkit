"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clock, Search, X } from "lucide-react";
import type { ClientTool } from "@/lib/client-tool";
import ToolIcon from "@/components/tool-icon";
import { useHydrated } from "@/lib/use-hydrated";
import { EXAMPLE_SEARCHES, rankTools } from "@/lib/tool-search";
import {
  clearRecentSearches,
  rememberSearch,
  useRecentSearches,
} from "@/lib/use-recent-searches";

/**
 * Homepage hero search: live suggestions link straight to tools; submitting
 * opens the full toolkit at /tools with the query applied.
 *
 * Built on the ARIA combobox pattern — `aria-activedescendant` drives a
 * full ArrowUp/ArrowDown traversal of the result list — and, while the box
 * is empty, offers example queries plus this browser's recent searches.
 */
export default function HeroSearch({ tools }: { tools: ClientTool[] }) {
  const ready = useHydrated();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const recentSearches = useRecentSearches();
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /mac/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const searching = query.trim().length > 0;
  const results = searching ? rankTools(tools, query) : [];
  const seeded = !searching && recentSearches.length > 0;

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

  const goToResults = (q = query) => {
    const trimmed = q.trim();
    if (trimmed) rememberSearch(trimmed);
    setPanelOpen(false);
    setActive(-1);
    router.push(trimmed ? `/tools?q=${encodeURIComponent(trimmed)}` : "/tools");
  };

  const openTool = (slug: string) => {
    if (query.trim()) rememberSearch(query);
    setPanelOpen(false);
    setActive(-1);
    router.push(`/tools/${slug}`);
  };

  const total = results.length;
  const move = (delta: number) => {
    if (!total) return;
    setActive((index) => {
      const next = index + delta;
      if (next < 0) return total - 1;
      if (next >= total) return 0;
      return next;
    });
  };

  return (
    <div
      className="search-area"
      ref={areaRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPanelOpen(false);
          setActive(-1);
        }
      }}
    >
      <form
        className="search-wrap"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && results[active]) {
            openTool(results[active].slug);
          } else {
            goToResults();
          }
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
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls="hero-search-panel"
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 && results[active]
              ? `hero-search-option-${active}`
              : undefined
          }
          placeholder="Search tools (e.g. PDF merge, QR code, JSON…)"
          value={query}
          aria-keyshortcuts="Control+K Meta+K"
          onFocus={() => {
            setPanelOpen(true);
            setActive(-1);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setPanelOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setPanelOpen(false);
              setActive(-1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!panelOpen) setPanelOpen(true);
              move(1);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActive(-1);
              inputRef.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        ) : (
          <span className="kbd-hint" aria-hidden="true">
            <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
            <kbd>K</kbd>
          </span>
        )}
      </form>
      {panelOpen && searching ? (
        <div className="search-panel" id="hero-search-panel">
          {total ? (
            <>
              <p className="search-panel-count" aria-hidden="true">
                {total} {total === 1 ? "tool" : "tools"} match
              </p>
              <ul
                className="search-results"
                role="listbox"
                aria-label="Tool suggestions"
              >
                {results.slice(0, 5).map((tool, index) => (
                  <li
                    key={tool.slug}
                    id={`hero-search-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "is-active" : undefined}
                  >
                    <Link
                      className="search-result"
                      href={`/tools/${tool.slug}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => {
                        if (query.trim()) rememberSearch(query);
                        setPanelOpen(false);
                      }}
                    >
                      <ToolIcon icon={tool.icon} color={tool.color} />
                      <span className="search-result-text">
                        <strong>{tool.name}</strong>
                        <span>{tool.category}</span>
                      </span>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="search-panel-footer"
                onClick={() => goToResults()}
              >
                {total > 5 ? `See all ${total} results` : "Open in All Tools"}{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </>
          ) : (
            <p className="search-panel-empty">
              No tools match “{query.trim()}” yet — try “PDF”, “QR” or “JSON”,
              or browse the full toolkit.
            </p>
          )}
        </div>
      ) : panelOpen && !searching ? (
        <div className="search-panel" id="hero-search-panel">
          <div className="search-seed">
            <span className="search-seed-label">
              Try a search
              {seeded ? (
                <button
                  type="button"
                  className="search-seed-clear"
                  onClick={() => clearRecentSearches()}
                >
                  Clear recent
                </button>
              ) : null}
            </span>
            <div className="search-seed-chips">
              {(seeded
                ? recentSearches.map((term) => ({ term, recent: true }))
                : EXAMPLE_SEARCHES.map((term) => ({ term, recent: false }))
              ).map(({ term, recent }) => (
                <button
                  key={term}
                  type="button"
                  className="search-seed-chip"
                  onClick={() => {
                    setQuery(term);
                    setActive(-1);
                    inputRef.current?.focus();
                  }}
                >
                  {recent ? (
                    <Clock size={13} aria-hidden="true" />
                  ) : (
                    <Search size={13} aria-hidden="true" />
                  )}
                  {term}
                </button>
              ))}
            </div>
            {seeded ? (
              <div className="search-seed-chips">
                {EXAMPLE_SEARCHES.filter(
                  (term) =>
                    !recentSearches.some(
                      (recent) => recent.toLocaleLowerCase() === term,
                    ),
                )
                  .slice(0, 2)
                  .map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="search-seed-chip"
                      onClick={() => {
                        setQuery(term);
                        setActive(-1);
                        inputRef.current?.focus();
                      }}
                    >
                      <Search size={13} aria-hidden="true" />
                      {term}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <p className="sr-only" role="status">
        {searching ? `${results.length} tools found` : ""}
      </p>
    </div>
  );
}
