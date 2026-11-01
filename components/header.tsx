"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import Brand from "@/components/brand";

const links = [
  { href: "/", label: "Home", page: "/" },
  { href: "/#tools", label: "All tools", page: null },
  { href: "/#categories", label: "Categories", page: null },
  { href: "/about", label: "About", page: "/about" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  return (
    <header
      className="site-header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
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
          {links.map(({ href, label, page }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={page && pathname === page ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link onClick={close} href="/#tools" className="header-cta">
            Explore Tools <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            href="/#tool-search"
            className="header-search"
            aria-label="Search tools"
            onClick={close}
          >
            <Search size={19} aria-hidden="true" />
          </Link>
          <Link href="/#tools" className="header-cta">
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
