"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import ToolIcon from "@/components/tools/tool-icon";
import { tools } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const navLink =
  "inline-flex min-h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition-colors";
const navLinkIdle = "text-ink-soft hover:bg-lavender-50 hover:text-brand-700";
const navLinkActive = "bg-lavender-100 text-brand-700";

export function SiteHeader() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsTriggerRef = useRef<HTMLButtonElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toolsActive = pathname.startsWith("/tools");

  // Close the desktop dropdown on outside click.
  useEffect(() => {
    if (!toolsOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !menuWrapRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [toolsOpen]);

  return (
    <header
      className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur-xl"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (toolsOpen) {
          setToolsOpen(false);
          toolsTriggerRef.current?.focus();
        }
        if (mobileOpen) {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <div className="container flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
        <Logo />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-0.5 md:flex"
        >
          <Link
            href="/"
            onClick={() => setToolsOpen(false)}
            className={cn(
              navLink,
              pathname === "/" ? navLinkActive : navLinkIdle,
            )}
          >
            Home
          </Link>

          <div ref={menuWrapRef}>
            <button
              ref={toolsTriggerRef}
              type="button"
              aria-expanded={toolsOpen}
              aria-controls="tools-menu"
              onClick={() => setToolsOpen((open) => !open)}
              className={cn(
                navLink,
                "gap-1.5 pr-2.5",
                toolsActive || toolsOpen ? navLinkActive : navLinkIdle,
              )}
            >
              Tools
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform duration-200",
                  toolsOpen && "rotate-180",
                )}
              />
            </button>
          </div>

          <Link
            href="/about"
            onClick={() => setToolsOpen(false)}
            className={cn(
              navLink,
              pathname === "/about" ? navLinkActive : navLinkIdle,
            )}
          >
            Our approach
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/tools"
            aria-label="Search all tools"
            className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-brand-200 hover:bg-lavender-50 hover:text-brand-700"
          >
            <Search className="size-[18px]" aria-hidden="true" />
          </Link>
          <ButtonLink href="/tools" size="sm" className="gap-1.5">
            Explore tools
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-xl border border-line bg-white text-ink shadow-[0_1px_2px_rgb(23_27_46_/_0.04)] md:hidden"
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {toolsOpen ? (
        <div className="absolute inset-x-0 top-full z-50 hidden px-6 md:block">
          <div
            ref={panelRef}
            id="tools-menu"
            className="mx-auto mt-3 max-w-[38rem] rounded-panel border border-line bg-white p-2 shadow-lift"
          >
            <p className="px-3 pt-2 pb-2 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">
              The toolkit · {tools.length} tools
            </p>
            <div className="grid gap-0.5 sm:grid-cols-2">
              {tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={() => setToolsOpen(false)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-lavender-50"
                >
                  <ToolIcon icon={tool.icon} color={tool.color} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      {tool.name}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {tool.category}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-line-soft px-3 pt-2.5 pb-1">
              <span className="text-[11px] text-muted">
                Free · No sign-up · Local processing
              </span>
              <Link
                href="/tools"
                onClick={() => setToolsOpen(false)}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Browse all tools
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          className="border-t border-line bg-white md:hidden"
        >
          <nav
            aria-label="Main navigation"
            className="container flex flex-col gap-1 py-4"
          >
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-lavender-50"
            >
              Home
            </Link>
            <p className="flex items-center gap-2 px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">
              <Sparkles
                className="size-3.5 text-brand-500"
                aria-hidden="true"
              />
              The toolkit
            </p>
            <div className="grid gap-0.5">
              {tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 hover:bg-lavender-50"
                >
                  <ToolIcon icon={tool.icon} color={tool.color} size="sm" />
                  <span className="text-sm font-semibold text-ink">
                    {tool.name}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/tools"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-lavender-50"
            >
              Browse all tools
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-lavender-50"
            >
              Our approach
            </Link>
            <ButtonLink
              href="/tools"
              onClick={() => setMobileOpen(false)}
              className="mt-2"
            >
              Explore tools
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default SiteHeader;
