"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Heart, Menu, Search, X } from "lucide-react";
import Brand from "@/components/brand";
import CategoryIcon from "@/components/category-icon";
import {
  categoryMeta as defaultCategories,
  toolsByCategory,
  type CategoryMeta,
} from "@/lib/catalog";
import { useFavorites } from "@/lib/use-favorites";

/**
 * The header is a client component, so everything in its props is serialised
 * into the RSC payload of **every** page on the site.
 *
 * It used to receive the whole catalogue (`tools`) just to answer one question:
 * is this category empty, so its link should be `nofollow`? That shipped ~30 kB
 * of tool records to the browser on all 158 routes to render a dropdown. The
 * answer is now computed and passed as `emptyCategorySlugs`.
 *
 * When the prop is omitted the default is derived from the shipped static
 * catalogue — a module the header already imports and which is bundled anyway —
 * so a header rendered without the prop (component tests, any future standalone
 * usage) still gets the correct `nofollow` behaviour instead of silently
 * treating every category as populated.
 */
export default function Header({
  categories = defaultCategories,
  emptyCategorySlugs,
  siteName = "QUICKKIT",
}: {
  categories?: CategoryMeta[];
  /** Categories with no published tool — rendered `nofollow`. */
  emptyCategorySlugs?: string[];
  siteName?: string;
}) {
  const resolvedEmptyCategorySlugs =
    emptyCategorySlugs ??
    defaultCategories
      .filter((meta) => toolsByCategory(meta.name).length === 0)
      .map((meta) => meta.slug);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const pathname = usePathname();
  const { saved } = useFavorites();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpen(false);
    setCatOpen(false);
  };

  // Close menus whenever the route changes (derived-state pattern).
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
    setCatOpen(false);
  }

  useEffect(() => {
    if (!catOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [catOpen]);

  const onSearchClick = (e: React.MouseEvent) => {
    const el = document.getElementById("tool-search");
    if (el) {
      e.preventDefault();
      closeAll();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => el.focus({ preventScroll: true }), 350);
    }
  };

  /**
   * Active-state helper. `Page` is the route the nav item owns; `section`
   * additionally matches everything below it, so /about stays current on the
   * legal/information pages a visitor reaches from the About section.
   */
  const current = (page: string | null, section?: string[]) =>
    page &&
    (pathname === page ||
      (page === "/tools" && pathname.startsWith("/tools/")) ||
      section?.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      ))
      ? ("page" as const)
      : undefined;

  return (
    <header
      className="site-header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          closeAll();
          document.querySelector<HTMLButtonElement>(".menu-button")?.focus();
        }
      }}
    >
      <div className="container header-inner">
        <Brand name={siteName} />
        <nav
          id="main-navigation"
          className={open ? "navigation open" : "navigation"}
          aria-label="Main navigation"
        >
          <Link
            href="/"
            prefetch={false}
            onClick={closeAll}
            aria-current={current("/")}
          >
            Home
          </Link>
          <Link
            href="/tools"
            onClick={closeAll}
            aria-current={current("/tools")}
          >
            All Tools
          </Link>
          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="nav-dropdown-toggle"
              aria-expanded={catOpen}
              aria-haspopup="true"
              aria-controls="header-categories-panel"
              onClick={() => setCatOpen(!catOpen)}
            >
              Categories{" "}
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={catOpen ? "chev open" : "chev"}
              />
            </button>
            <div
              id="header-categories-panel"
              className="dropdown-panel"
              hidden={!catOpen}
            >
              <ul>
                {categories.map((meta) => {
                  const empty = resolvedEmptyCategorySlugs.includes(meta.slug);
                  return (
                    <li key={meta.slug}>
                      <Link
                        className="dropdown-item"
                        href={`/category/${meta.slug}`}
                        rel={empty ? "nofollow" : undefined}
                        onClick={closeAll}
                      >
                        <span className={`dropdown-icon ${meta.tint}`}>
                          <CategoryIcon meta={meta} size={17} />
                        </span>
                        {meta.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                className="dropdown-footer"
                href="/#categories"
                onClick={closeAll}
              >
                Browse categories <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <Link
            href="/about"
            onClick={closeAll}
            aria-current={current("/about", [
              "/terms",
              "/privacy",
              "/cookies",
              "/disclaimer",
              "/copyright",
              "/intellectual-property",
              "/security",
              "/accessibility",
              "/file-handling",
              "/contact",
            ])}
          >
            About
          </Link>
          <Link
            href="/help"
            onClick={closeAll}
            aria-current={current("/help", ["/faq"])}
          >
            Help
          </Link>
          <Link onClick={closeAll} href="/tools" className="header-cta">
            Explore Tools <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            href="/tools#tool-search"
            className="header-search"
            aria-label="Search tools"
            onClick={onSearchClick}
          >
            <Search size={19} aria-hidden="true" />
          </Link>
          <Link
            href="/saved"
            rel="nofollow"
            className="header-search header-saved"
            aria-label={`Saved tools${saved.length ? ` (${saved.length})` : ""}`}
          >
            <Heart
              size={19}
              aria-hidden="true"
              fill={saved.length ? "currentColor" : "none"}
            />
            {saved.length ? (
              <span className="saved-badge" aria-hidden="true">
                {saved.length}
              </span>
            ) : null}
          </Link>
          <Link href="/tools" className="header-cta">
            Explore Tools <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button
            className="menu-button secondary"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
