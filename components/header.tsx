"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
export default function Header() {
  const [open, setOpen] = useState(false);
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
        <Link href="/" className="brand" aria-label="QUICKKIT home">
          <span className="brand-mark" aria-hidden="true">
            Q
          </span>
          <span>
            QUICK<span className="brand-purple">KIT</span>
          </span>
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
        <nav
          id="main-navigation"
          className={open ? "navigation open" : "navigation"}
          aria-label="Main navigation"
        >
          <Link onClick={() => setOpen(false)} href="/">
            Home
          </Link>
          <Link onClick={() => setOpen(false)} href="/#tools">
            The toolkit
          </Link>
          <Link onClick={() => setOpen(false)} href="/about">
            Our approach
          </Link>
          <Link
            onClick={() => setOpen(false)}
            href="/#tools"
            className="header-cta"
          >
            Explore tools <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
