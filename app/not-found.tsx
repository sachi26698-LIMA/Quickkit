import Link from "next/link";
import { BrandSymbol } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <section className="container empty">
      <span className="brand-mark empty-brand-mark" aria-hidden="true">
        <BrandSymbol width={72} height={72} />
      </span>
      <span className="eyebrow">404 · Not found</span>
      <h1>This one isn’t in the kit.</h1>
      <p>Head back to explore the tool catalog.</p>
      <Link href="/" prefetch={false} className="primary">
        Back to QUICKKIT
      </Link>
    </section>
  );
}

/**
 * A 404 must not present itself as the homepage. Without its own metadata this
 * route inherits the root layout's default title and description verbatim, so
 * the error page advertised the exact title and description of `/` — two
 * different URLs claiming to be the same page. `noindex` is already set by the
 * build; the unique copy is what stops the duplicate.
 */
export const metadata = {
  title: "Page not found",
  description:
    "This page is not part of the QUICKKIT toolkit. Use the search or the full tool list to find the PDF, image, QR, text, developer, calculator or security tool you need.",
  robots: { index: false, follow: true },
};
