"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Search, X } from "lucide-react";
import { filterTools } from "@/lib/catalog";
import ToolIcon from "@/components/tool-icon";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Homepage hero search: live suggestions link straight to tools; submitting
 * opens the full toolkit at /tools with the query applied.
 */
export default function HeroSearch() {
  const ready = useHydrated();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /mac/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const searching = query.trim().length > 0;
  const results = searching ? filterTools(query, "All tools") : [];

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

  const goToResults = () => {
    setPanelOpen(false);
    router.push(
      searching ? `/tools?q=${encodeURIComponent(query.trim())}` : "/tools",
    );
  };

  return (
    <div
      className="search-area"
      ref={areaRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPanelOpen(false);
        }
      }}
    >
      <form
        className="search-wrap"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
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
          placeholder="Search tools (e.g. PDF merge, QR code, JSON…)"
          value={query}
          aria-keyshortcuts="Control+K Meta+K"
          onFocus={() => setPanelOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setPanelOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setPanelOpen(false);
            }
            if (e.key === "ArrowDown" && panelOpen && searching) {
              const first =
                areaRef.current?.querySelector<HTMLAnchorElement>(
                  ".search-result",
                );
              if (first) {
                e.preventDefault();
                first.focus();
              }
            }
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
        ) : (
          <span className="kbd-hint" aria-hidden="true">
            <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
            <kbd>K</kbd>
          </span>
        )}
      </form>
      {panelOpen && searching ? (
        <div className="search-panel">
          {results.length ? (
            <>
              <ul className="search-results">
                {results.slice(0, 5).map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      className="search-result"
                      href={`/tools/${tool.slug}`}
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
                onClick={goToResults}
              >
                {results.length > 5
                  ? `See all ${results.length} results`
                  : "Open in All Tools"}{" "}
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
      ) : null}
      <p className="sr-only" role="status">
        {searching ? `${results.length} tools found` : ""}
      </p>
    </div>
  );
}
