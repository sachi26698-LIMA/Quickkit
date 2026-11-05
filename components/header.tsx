"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Heart, Menu, Search, X } from "lucide-react";
import Brand from "@/components/brand";
import CategoryIcon from "@/components/category-icon";
import { categoryMeta } from "@/lib/catalog";
import { useFavorites } from "@/lib/use-favorites";

export default function Header() {
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
        <Brand />
        <nav
          id="main-navigation"
          className={open ? "navigation open" : "navigation"}
          aria-label="Main navigation"
        >
          <Link href="/" onClick={closeAll} aria-current={current("/")}>
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
              onClick={() => setCatOpen(!catOpen)}
            >
              Categories{" "}
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={catOpen ? "chev open" : "chev"}
              />
            </button>
            {catOpen ? (
              <div className="dropdown-panel">
                <ul>
                  {categoryMeta.map((meta) => (
                    <li key={meta.slug}>
                      <Link
                        className="dropdown-item"
                        href={`/category/${meta.slug}`}
                        onClick={closeAll}
                      >
                        <span className={`dropdown-icon ${meta.tint}`}>
                          <CategoryIcon meta={meta} size={17} />
                        </span>
                        {meta.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  className="dropdown-footer"
                  href="/#categories"
                  onClick={closeAll}
                >
                  Browse categories <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            ) : null}
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
