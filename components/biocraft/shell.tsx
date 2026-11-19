"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/biocraft/fonts", label: "Font Library" },
  { href: "/biocraft/studio", label: "Preview & Bio Studio" },
  { href: "/biocraft/poster", label: "Poster Studio" },
  { href: "/biocraft/licenses", label: "Licensing" },
];

export default function BioCraftShellNav() {
  const pathname = usePathname();
  return (
    <nav className="bc-nav" aria-label="BioCraft">
      <div className="bc-nav-inner">
        <Link href="/biocraft" className="bc-wordmark">
          <span className="bc-mark" aria-hidden="true">
            क
          </span>
          <span>
            BioCraft
            <small>Hindi typography studio</small>
          </span>
        </Link>
        <div className="bc-nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
