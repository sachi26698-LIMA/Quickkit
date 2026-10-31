import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
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
    <footer className="relative border-t border-line bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent"
      />

      <div className="container grid gap-8 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-[1.35fr_1.25fr_0.85fr]">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <Logo gradientId="quickkit-mark-footer" />
          <p className="t-body mt-4 max-w-xs text-[0.9375rem]">
            Handy tools. Zero hassle. A little help for the things you do every
            day — right in your browser.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-mint-200 bg-mint-soft px-3 py-1.5 text-[0.75rem] font-bold text-mint-ink">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Local by design
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-lavender-200 bg-lavender-50 px-3 py-1.5 text-[0.75rem] font-bold text-brand-700">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Free to use
            </span>
          </div>
        </div>

        <nav aria-labelledby="footer-tools" className="min-w-0">
          <h2
            id="footer-tools"
            className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase"
          >
            The toolkit
          </h2>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="flex min-h-10 items-center text-[0.9375rem] font-medium text-muted transition-colors hover:text-brand-700"
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
            className="text-[0.6875rem] font-bold tracking-[0.16em] text-muted uppercase"
          >
            QUICKKIT
          </h2>
          <ul className="mt-4 grid gap-1">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-10 items-center gap-1 text-[0.9375rem] font-medium text-muted transition-colors hover:text-brand-700"
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
        <div className="container flex flex-col gap-2 py-6 text-[0.8125rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} QUICKKIT — Small tasks. Quick
            solutions.
          </span>
          <span>No accounts. No uploads. No tracking analytics.</span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
