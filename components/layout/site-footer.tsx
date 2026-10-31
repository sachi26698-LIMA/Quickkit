import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { tools } from "@/lib/catalog";

const companyLinks = [
  { href: "/tools", label: "All tools" },
  { href: "/about", label: "Our approach" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="container grid gap-10 py-12 sm:grid-cols-[1.1fr_0.9fr] sm:py-14 lg:grid-cols-[1.35fr_1.2fr_0.9fr] lg:gap-12">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <Logo gradientId="quickkit-mark-footer" />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Handy tools. Zero hassle. A little help for the things you do every
            day — right in your browser.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-pill border border-mint-200 bg-mint-soft px-3 py-1.5 text-[11px] font-semibold text-mint-ink">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Local by design
          </p>
        </div>

        <nav aria-labelledby="footer-tools" className="min-w-0">
          <h2
            id="footer-tools"
            className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase"
          >
            The toolkit
          </h2>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="flex min-h-9 items-center text-sm text-muted transition-colors hover:text-brand-700"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-company" className="min-w-0">
          <h2
            id="footer-company"
            className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase"
          >
            QUICKKIT
          </h2>
          <ul className="mt-3 grid gap-1">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-9 items-center gap-1 text-sm text-muted transition-colors hover:text-brand-700"
                >
                  {link.label}
                  {link.href === "/tools" ? (
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line-soft">
        <div className="container flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} QUICKKIT · Small tasks. Quick
            solutions.
          </span>
          <span>No accounts. No uploads. No tracking analytics.</span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
