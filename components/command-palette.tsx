"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Clock,
  CornerDownLeft,
  Heart,
  Layers,
  Search,
  X,
} from "lucide-react";
import type { CategoryMeta } from "@/lib/catalog";
import type { ClientTool } from "@/lib/client-tool";
import { EXAMPLE_SEARCHES, rankTools } from "@/lib/tool-search";
import { useRecentSearches, rememberSearch } from "@/lib/use-recent-searches";
import { useRecentTools } from "@/lib/use-recent-tools";
import { useHydrated } from "@/lib/use-hydrated";
import ToolIcon from "@/components/tool-icon";

type Entry = {
  id: string;
  kind: "tool" | "page" | "recent";
  label: string;
  hint?: string;
  href?: string;
  query?: string;
  icon?: React.ReactNode;
};

/**
 * Global command palette (Ctrl/⌘ K) for every public page.
 *
 * On the two pages that already mount an inline search box (`/` and
 * `/tools`) this component stays out of the shortcut's way — the inline
 * input keeps focus behaviour there. Everywhere else (tool pages, category
 * pages, info pages) the palette is the search: find a tool or jump to a
 * section without hunting for a search field.
 *
 * Accessibility: labelled dialog, combobox semantics on the input, option
 * list with `aria-activedescendant`, Escape closes, focus is restored to
 * whatever opened it, and focus is trapped inside the dialog while open.
 */
export default function CommandPalette({
  tools,
  categories,
}: {
  tools: ClientTool[];
  categories: CategoryMeta[];
}) {
  const ready = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const recentSearches = useRecentSearches();
  const recentSlugs = useRecentTools();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // The inline hero/explorer search owns Ctrl/⌘ K on these routes.
  const inlineRoute =
    pathname === "/" || pathname === "/tools" ? pathname : null;

  useEffect(() => {
    if (!ready || inlineRoute) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, inlineRoute]);

  // Close when the route changes so a navigation never leaves it dangling.
  // Derived-state pattern (same as the header): adjust during render rather
  // than in an effect, so there is no extra committed frame with it open.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  useEffect(() => {
    if (!open) return;
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Let the portal paint before focusing.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      if (restoreRef.current?.isConnected) restoreRef.current.focus();
    };
  }, [open]);

  const recents = useMemo(
    () =>
      recentSlugs
        .map((slug) => tools.find((tool) => tool.slug === slug))
        .filter((tool): tool is ClientTool => Boolean(tool)),
    [recentSlugs, tools],
  );

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim();
    if (q) {
      const matches: Entry[] = rankTools(tools, q)
        .slice(0, 8)
        .map((tool) => ({
          id: `tool:${tool.slug}`,
          kind: "tool",
          label: tool.name,
          hint: tool.category,
          href: `/tools/${tool.slug}`,
          icon: <ToolIcon icon={tool.icon} color={tool.color} />,
        }));
      const pageOptions: Entry[] = [
        { id: "page:tools", kind: "page", label: "All tools", href: "/tools" },
        {
          id: "page:saved",
          kind: "page",
          label: "Saved tools",
          href: "/saved",
        },
        {
          id: "page:categories",
          kind: "page",
          label: "Categories",
          href: "/#categories",
        },
        { id: "page:help", kind: "page", label: "Help centre", href: "/help" },
        { id: "page:about", kind: "page", label: "About", href: "/about" },
      ];
      const pages = pageOptions
        .filter((page) =>
          page.label.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
        )
        .slice(0, 3);
      const catMatches: Entry[] = categories
        .filter((meta) =>
          meta.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
        )
        .slice(0, 2)
        .map((meta) => ({
          id: `cat:${meta.slug}`,
          kind: "page",
          label: meta.name,
          hint: "Category",
          href: `/category/${meta.slug}`,
          icon: <Layers size={16} aria-hidden="true" />,
        }));
      const recentMatch: Entry[] = recentSearches
        .filter((term) =>
          term.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
        )
        .slice(0, 2)
        .map((term) => ({
          id: `recent:${term}`,
          kind: "recent",
          label: term,
          hint: "Recent search",
          query: term,
          icon: <Clock size={16} aria-hidden="true" />,
        }));
      return [...matches, ...catMatches, ...pages, ...recentMatch];
    }
    const idle: Entry[] = [];
    for (const tool of recents.slice(0, 4)) {
      idle.push({
        id: `tool:${tool.slug}`,
        kind: "tool",
        label: tool.name,
        hint: `Recent · ${tool.category}`,
        href: `/tools/${tool.slug}`,
        icon: <ToolIcon icon={tool.icon} color={tool.color} />,
      });
    }
    for (const term of recentSearches.slice(0, 3)) {
      idle.push({
        id: `recent:${term}`,
        kind: "recent",
        label: term,
        hint: "Recent search",
        query: term,
        icon: <Clock size={16} aria-hidden="true" />,
      });
    }
    if (!idle.length) {
      for (const term of EXAMPLE_SEARCHES.slice(0, 3)) {
        idle.push({
          id: `example:${term}`,
          kind: "recent",
          label: term,
          hint: "Try a search",
          query: term,
          icon: <Search size={16} aria-hidden="true" />,
        });
      }
    }
    idle.push(
      { id: "page:tools", kind: "page", label: "All tools", href: "/tools" },
      {
        id: "page:saved",
        kind: "page",
        label: "Saved tools",
        href: "/saved",
        icon: <Heart size={16} aria-hidden="true" />,
      },
      {
        id: "page:categories",
        kind: "page",
        label: "Browse categories",
        href: "/#categories",
        icon: <Layers size={16} aria-hidden="true" />,
      },
    );
    return idle;
  }, [query, tools, recents, recentSearches, categories]);

  if (!ready || !open) return null;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (entry: Entry | undefined) => {
    if (!entry) {
      const q = query.trim();
      if (q) {
        rememberSearch(q);
        close();
        router.push(`/tools?q=${encodeURIComponent(q)}`);
      }
      return;
    }
    if (entry.query) {
      setQuery(entry.query);
      inputRef.current?.focus();
      return;
    }
    close();
    if (entry.href) router.push(entry.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (entries.length ? (index + 1) % entries.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        entries.length ? (index - 1 + entries.length) % entries.length : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(entries[active]);
      return;
    }
    if (event.key === "Tab") {
      // Keep focus inside the dialog: only the input and the footer link exist.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusables || !focusables.length) return;
      const list = [...focusables];
      const index = list.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      const next = event.shiftKey
        ? list[(index <= 0 ? list.length : index) - 1]
        : list[(index + 1) % list.length];
      next?.focus();
    }
  };

  const activeId = entries[active] ? `cmdk-option-${active}` : undefined;

  return createPortal(
    <div
      className="command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search QUICKKIT"
        ref={panelRef}
        onKeyDown={onKeyDown}
      >
        <div className="command-input-row">
          <Search size={19} aria-hidden="true" />
          <label className="sr-only" htmlFor="command-search">
            Search tools and pages
          </label>
          <input
            id="command-search"
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search tools and pages…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <kbd aria-hidden="true">Esc</kbd>
          <button
            type="button"
            className="icon-button command-close"
            aria-label="Close search"
            onClick={close}
          >
            <X size={17} />
          </button>
        </div>
        <ul
          id="command-results"
          className="command-results"
          role="listbox"
          aria-label="Search results"
        >
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              id={`cmdk-option-${index}`}
              role="option"
              aria-selected={index === active}
              className={
                index === active ? "command-option is-active" : "command-option"
              }
              onMouseMove={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(entry);
              }}
            >
              <span className="command-option-icon" aria-hidden="true">
                {entry.icon ?? <ArrowRight size={16} />}
              </span>
              <span className="command-option-text">
                <strong>{entry.label}</strong>
                {entry.hint ? <small>{entry.hint}</small> : null}
              </span>
              {entry.kind === "tool" ? (
                <ArrowRight size={15} aria-hidden="true" />
              ) : null}
            </li>
          ))}
          {!entries.length ? (
            <li className="command-empty" role="presentation">
              No match for “{query.trim()}”. Try “PDF”, “QR” or “JSON”.
            </li>
          ) : null}
        </ul>
        <div className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to navigate
          </span>
          <span>
            <CornerDownLeft size={13} aria-hidden="true" /> to open
          </span>
          <Link href="/tools" onClick={close} className="command-footer-link">
            Browse all tools
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
