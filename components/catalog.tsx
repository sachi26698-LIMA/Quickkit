"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code,
  Files,
  LayoutGrid,
  MonitorSmartphone,
  QrCode,
  Rocket,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Type,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { categories, filterTools, tools, type Category } from "@/lib/catalog";
import ToolIcon from "@/components/tool-icon";
import { useHydrated } from "@/lib/use-hydrated";

type ToolCategory = Exclude<Category, "All tools">;

const categoryInfo: Record<
  ToolCategory,
  { title: string; blurb: string; tint: string; Icon: LucideIcon }
> = {
  "PDF Tools": {
    title: "PDF Tools",
    blurb: "Merge and manage your PDF files with ease.",
    tint: "tint-pdf",
    Icon: Files,
  },
  Text: {
    title: "Text & Writing",
    blurb: "Count, convert and polish your words.",
    tint: "tint-text",
    Icon: Type,
  },
  "Image & QR": {
    title: "Images & QR Codes",
    blurb: "Compress images and create QR codes.",
    tint: "tint-media",
    Icon: QrCode,
  },
  Developer: {
    title: "Developer Tools",
    blurb: "Format, validate and tidy your data.",
    tint: "tint-dev",
    Icon: Code,
  },
  Security: {
    title: "Security & Privacy",
    blurb: "Strong passwords, generated on your device.",
    tint: "tint-security",
    Icon: ShieldCheck,
  },
};
const categoryOrder: ToolCategory[] = [
  "PDF Tools",
  "Text",
  "Image & QR",
  "Developer",
  "Security",
];
const popularSlugs = [
  "merge-pdf",
  "image-compressor",
  "qr-generator",
  "word-counter",
];
const featuredTools: { slug: string; blurb: string }[] = [
  { slug: "merge-pdf", blurb: "Combine multiple PDF files into one." },
  {
    slug: "image-compressor",
    blurb: "Shrink image file size right in your browser.",
  },
  {
    slug: "qr-generator",
    blurb: "Create QR codes from links or text in seconds.",
  },
  {
    slug: "word-counter",
    blurb: "Count words, characters and reading time.",
  },
];
const highlights: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Zap, title: `${tools.length} handy tools`, text: "All in one place" },
  {
    Icon: ShieldCheck,
    title: "Privacy first",
    text: "Your data stays on your device",
  },
  {
    Icon: Rocket,
    title: "Fast & reliable",
    text: "Instant results, no sign-up",
  },
  {
    Icon: MonitorSmartphone,
    title: "Works everywhere",
    text: "Desktop, tablet and mobile",
  },
];

const toolBySlug = (slug: string) => tools.find((t) => t.slug === slug)!;
const toolCount = (category: ToolCategory) =>
  tools.filter((t) => t.category === category).length;
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

export default function Catalog({
  intro,
  art,
}: {
  intro: React.ReactNode;
  art: React.ReactNode;
}) {
  const ready = useHydrated();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All tools");
  const [panelOpen, setPanelOpen] = useState(false);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /mac/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const results = filterTools(query, category);
  const searching = query.trim().length > 0;

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

  const pickCategory = (next: Category) => {
    setCategory(next);
    scrollToId("tools");
  };
  const viewAllTools = (e: React.MouseEvent) => {
    e.preventDefault();
    setQuery("");
    setCategory("All tools");
    setPanelOpen(false);
    scrollToId("tools");
  };

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          {intro}
          <div
            className="search-area"
            ref={searchAreaRef}
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
                setPanelOpen(false);
                scrollToId("tools");
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
                      searchAreaRef.current?.querySelector<HTMLAnchorElement>(
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
              <div className="search-panel" id="search-panel">
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
                              <span>{categoryInfo[tool.category].title}</span>
                            </span>
                            <ArrowUpRight size={17} aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {results.length > 5 ? (
                      <button
                        type="button"
                        className="search-panel-footer"
                        onClick={() => {
                          setPanelOpen(false);
                          scrollToId("tools");
                        }}
                      >
                        See all {results.length} results{" "}
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="search-panel-empty">
                    No tools match “{query.trim()}”. Try “PDF”, “QR” or “JSON”.
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <div className="popular-row">
            <span className="popular-label">Popular:</span>
            {popularSlugs.map((slug) => {
              const tool = toolBySlug(slug);
              return (
                <Link
                  key={slug}
                  className="popular-chip"
                  href={`/tools/${tool.slug}`}
                >
                  {tool.name}
                </Link>
              );
            })}
          </div>
          <div className="hero-actions">
            <Link className="primary" href="#tools">
              Explore All Tools <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="secondary" href="#categories">
              <LayoutGrid size={16} aria-hidden="true" /> Browse Categories
            </Link>
          </div>
          <div className="hero-benefits">
            <span>
              <Check size={14} aria-hidden="true" /> Free to use
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> No sign-up
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> On your device
            </span>
          </div>
        </div>
        {art}
      </section>

      <section className="trust-strip" aria-label="QUICKKIT highlights">
        {highlights.map(({ Icon, title, text }) => (
          <div className="trust-item" key={title}>
            <span className="trust-icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section
        id="categories"
        className="home-section"
        aria-labelledby="categories-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">BROWSE THE TOOLKIT</span>
            <h2 id="categories-title">Explore by Category</h2>
            <p>
              Find the right tool for your task, all organized in one place.
            </p>
          </div>
          <a href="#tools" className="section-link" onClick={viewAllTools}>
            View all tools <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="category-grid">
          {categoryOrder.map((item) => {
            const info = categoryInfo[item];
            const count = toolCount(item);
            return (
              <Link
                key={item}
                href="#tools"
                className={`category-card ${info.tint}`}
                onClick={(e) => {
                  e.preventDefault();
                  pickCategory(item);
                }}
              >
                <span className="category-card-top">
                  <span className="category-icon">
                    <info.Icon size={26} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span className="category-arrow">
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </span>
                <h3>{info.title}</h3>
                <p>{info.blurb}</p>
                <span className="category-count">
                  {count} {count === 1 ? "TOOL" : "TOOLS"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HANDPICKED FOR YOU</span>
            <h2 id="featured-title">Featured Tools</h2>
            <p>Our most useful tools, ready for everyday tasks.</p>
          </div>
          <a href="#tools" className="section-link" onClick={viewAllTools}>
            View All Tools <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="featured-grid">
          {featuredTools.map(({ slug, blurb }) => {
            const tool = toolBySlug(slug);
            return (
              <Link
                key={slug}
                className="featured-card"
                href={`/tools/${tool.slug}`}
              >
                <ToolIcon icon={tool.icon} color={tool.color} />
                <span className="featured-arrow">
                  <ArrowUpRight size={15} aria-hidden="true" />
                </span>
                <h3>{tool.name}</h3>
                <p>{blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        id="tools"
        className="catalog home-section"
        aria-labelledby="tools-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
            <h2 id="tools-title">All tools</h2>
            <p>Find the right tool. Get on with your day.</p>
          </div>
          <span className="catalog-count">
            {tools.length} tools. One handy place.
          </span>
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
        <div className="tool-grid">
          {results.map((tool) => (
            <Link
              href={`/tools/${tool.slug}`}
              className="tool-card"
              key={tool.slug}
            >
              <div className="card-top">
                <ToolIcon icon={tool.icon} color={tool.color} />
                <span className="category-label">
                  {categoryInfo[tool.category].title}
                </span>
              </div>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <div className="card-footer">
                <span>Open tool</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
        {!results.length && (
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
      </section>
    </>
  );
}
