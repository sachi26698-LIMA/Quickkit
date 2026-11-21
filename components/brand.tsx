import Link from "next/link";
import { BrandSymbol, BrandWordmark } from "@/components/brand-logo";

/**
 * Site brand lockup used in the header and footer.
 *
 * The official QUICKKIT identity (docs/BRAND_GUIDELINES.md) is the orbital
 * symbol plus the QUICKKIT wordmark. When an operator has customised the site
 * name in Admin settings, the text name is rendered beside the symbol instead
 * of the baked-in wordmark — the identity adapts without breaking the link.
 */
export default function Brand({ name = "QUICKKIT" }: { name?: string }) {
  const official = name === "QUICKKIT";
  return (
    <Link
      href="/"
      prefetch={false}
      className="brand"
      aria-label={`${name} home`}
    >
      <span className="brand-mark" aria-hidden="true">
        <BrandSymbol />
      </span>
      {official ? (
        <BrandWordmark className="brand-wordmark" />
      ) : (
        <span>{name}</span>
      )}
    </Link>
  );
}
