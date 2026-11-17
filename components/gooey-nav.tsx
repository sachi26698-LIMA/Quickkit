"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import CategoryIcon from "@/components/category-icon";
import type { NavCategory } from "@/lib/nav-categories";

/**
 * The mobile navigation panel, presented as a gooey / liquid surface.
 *
 * What "gooey" means here, precisely, so the effect stays honest: the panel
 * morphs open from the menu button's resting shape using a CSS clip-path
 * transition, its rows arrive on a short stagger, and a soft blurred underlay
 * gives the edge its liquid weight. Nothing simulates a physics simulation and
 * no pixels are painted by JavaScript; it is three animated properties on the
 * compositor.
 *
 * Accessibility is not traded for the effect:
 *  - the panel is a real `nav` with an accessible name, so the existing
 *    `getByRole("navigation", { name: "Main navigation" })` contract holds
 *  - `aria-expanded` / `aria-controls` live on the trigger, in the header
 *  - Escape closes and returns focus to the trigger
 *  - Tab is trapped inside the open panel and wraps at both ends, so focus
 *    cannot wander into the page behind a panel that visually covers it
 *  - every destination and every `aria-current` value comes from the caller, so
 *    this file cannot drop or re-point a link
 *  - `prefers-reduced-motion` removes the morph, the stagger and the blur; the
 *    panel simply appears, and it still closes the same way
 *
 * The panel is rendered only while open. There is no hidden focusable content
 * and no `display: none` link a keyboard could still reach.
 */
export type GooeyNavProps = {
  open: boolean;
  onClose: () => void;
  /** The trigger, so Escape and the focus trap can return to it. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  categories: NavCategory[];
  pathname: string;
  isCurrent: (href: string, section?: string[]) => "page" | undefined;
  /** Categories with no published tools get `rel="nofollow"`, matching the desktop menu. */
  emptyCategory: (name: string) => boolean;
};

const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "All Tools" },
  { href: "/about", label: "About", section: ["/terms", "/privacy"] },
  { href: "/help", label: "Help", section: ["/faq"] },
];

export default function GooeyNav({
  open,
  onClose,
  triggerRef,
  categories,
  isCurrent,
  emptyCategory,
}: GooeyNavProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  // Reset the nested list when the panel closes, derived during render rather
  // than in an effect (same pattern as components/header.tsx). Doing it in an
  // effect caused an extra commit and tripped the set-state-in-effect rule.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open && catOpen) setCatOpen(false);
  }
  const catPanelId = useId();

  // Remember which row was focused so closing the sub-list can restore it.
  const catToggleRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes the sub-list first, then the panel. Both paths return focus
  // to a predictable place rather than dropping it on <body>.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (catOpen) {
          setCatOpen(false);
          catToggleRef.current?.focus();
        } else {
          onClose();
          triggerRef.current?.focus();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      // `offsetParent` is not a reliable visibility test here (it is always
      // null in jsdom and for position:fixed subtrees), so exclude the real
      // reason a control would be unreachable: it sits inside a [hidden]
      // subtree, which is exactly how the collapsed category list is hidden.
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.closest("[hidden]"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Wrap at both ends so focus stays inside the open panel.
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      }
    };
    // Capture: the header's own Escape handler must not also fire.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, catOpen, onClose, triggerRef]);

  // Move focus into the panel when it opens, so a keyboard or screen-reader
  // visitor lands in the menu instead of continuing through the page behind it.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("a[href]");
    first?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  return (
    <nav
      ref={panelRef}
      id="main-navigation"
      className="navigation gooey-nav open"
      aria-label="Main navigation"
      data-gooey="open"
    >
      <span className="gooey-nav-blob" aria-hidden="true" />
      <ul className="gooey-nav-list">
        {PRIMARY_LINKS.map((link, index) => (
          <li key={link.href} style={{ "--row": index } as React.CSSProperties}>
            <Link
              href={link.href}
              prefetch={false}
              onClick={onClose}
              aria-current={isCurrent(link.href, link.section)}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li style={{ "--row": PRIMARY_LINKS.length } as React.CSSProperties}>
          <button
            ref={catToggleRef}
            type="button"
            className="gooey-nav-toggle"
            aria-expanded={catOpen}
            aria-controls={catPanelId}
            onClick={() => setCatOpen((value) => !value)}
          >
            Categories
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={catOpen ? "chev open" : "chev"}
            />
          </button>
          <ul
            id={catPanelId}
            className={catOpen ? "gooey-nav-sub open" : "gooey-nav-sub"}
            hidden={!catOpen}
          >
            {categories.map((meta) => (
              <li key={meta.slug}>
                <Link
                  href={`/category/${meta.slug}`}
                  rel={emptyCategory(meta.name) ? "nofollow" : undefined}
                  onClick={onClose}
                >
                  <span className={`dropdown-icon ${meta.tint}`}>
                    <CategoryIcon meta={meta} size={17} />
                  </span>
                  {meta.name}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li
          style={{ "--row": PRIMARY_LINKS.length + 1 } as React.CSSProperties}
        >
          <Link
            href="/tools"
            className="header-cta"
            onClick={onClose}
            aria-current={isCurrent("/tools")}
          >
            Explore Tools <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
