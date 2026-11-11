// ─────────────────────────────────────────────────────────────────────────────
// AdSense configuration: the one place ad ids and placement names are defined.
//
// Two rules keep this file honest, and both are enforced by tests
// (tests/ad-placements.test.ts):
//
//   1. An ad slot id may only be listed here *after* it has been created in the
//      AdSense dashboard. A made-up id renders an empty slot and logs an
//      AdSense error in every visitor's console, so the registry stays exactly
//      as long as the account does. One unit can be used by any number of
//      placements — that is normal AdSense usage, not duplication.
//   2. Placement names are typed, so two slots on one page can never share an
//      identity. Each `<AdUnit>` writes its placement onto the DOM, which makes
//      a duplicate visible in a test instead of silently doubling ad requests.
// ─────────────────────────────────────────────────────────────────────────────

/** Publisher id. Also in the loader URL (app/layout.tsx) and public/ads.txt. */
export const ADSENSE_CLIENT = "ca-pub-1478767466279341";

/**
 * Ad units that exist in the AdSense account right now.
 *
 * `display` — the site's single responsive display unit. Every placement reuses
 * it until further units are created in AdSense; adding a key before the unit
 * exists would break the page, so do that only with the real id in hand.
 */
export const AD_SLOTS = {
  display: "1553253144",
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;

/** The unit used when a placement does not name one explicitly. */
export const DEFAULT_AD_SLOT: AdSlotName = "display";

/**
 * Formats a slot can ask for. All three are responsive: `auto` lets AdSense
 * pick a size per viewport, `horizontal` requests the leaderboard/banner family
 * and `rectangle` the medium/large rectangle family.
 */
export type AdFormat = "auto" | "horizontal" | "rectangle";

/**
 * AdSense has no fixed per-page unit cap any more, but a page should never be
 * more advertising than content. Three is the ceiling this site uses, and a
 * test asserts no route exceeds it.
 */
export const MAX_ADS_PER_PAGE = 3;

/**
 * Every placement name used anywhere in the app. They double as DOM markers
 * (`data-ad-placement`) and must be distinct within a page.
 *
 * Kept as a runtime list as well as a type so a test can prove that every
 * `placement="…"` in the source is declared here, and that no name is left
 * unused after a page changes.
 */
export const AD_PLACEMENTS = [
  // Homepage: below the hero, between the two content sections, page end.
  "home-after-hero",
  "home-mid-content",
  "home-bottom",
  // Tool pages (all 42): after the introduction, after the how-to/FAQ block,
  // and at the end of the page — never inside the workspace or beside controls.
  "tool-after-intro",
  "tool-after-faq",
  "tool-bottom",
  // Index and listing pages.
  "tools-index-bottom",
  "category-bottom",
  // Editorial pages.
  "help-after-guides",
  "help-bottom",
  "legal-article-end",
  "about-end",
  "faq-end",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/**
 * Routes that deliberately carry no advertising, with the reason. A page must
 * appear here to be exempt; silence is not an exclusion, so the coverage test
 * fails when a new page is added without a decision.
 */
export const AD_EXCLUDED_ROUTES: Record<string, string> = {
  "/contact":
    "Built around a message form. Ads next to a Send button invite mis-clicks and the page has almost no editorial content to support a unit.",
  "/sitemap":
    "A pure navigation index of links. There is no content for an ad to sit beside, and it would put advertising between the reader and the page they came to find.",
  "/saved":
    "Not indexable (noindex) and renders the visitor's own browser-local favourites — an empty shell to a crawler, so there is nothing to advertise against.",
  "/qr":
    "Not indexable (noindex) and renders user-encoded QR data cards (payments, contacts, Wi-Fi, events) where advertising beside action buttons would invite mis-clicks.",
  "/category/ai-tools":
    "Not indexable (noindex) and has no published tools yet — an empty Coming Soon placeholder page must not load advertising.",
};

/** APIs, drafts and error shells are never ad surfaces. */
const NEVER_ADVERTISED_PREFIXES = ["/api/", "/_next/", "/_"];

/**
 * Whether AdSense is enabled for this build/runtime.
 * Defaults to true unless ADS_ENABLED=false or NEXT_PUBLIC_ADS_ENABLED=false.
 */
export function isAdsEnabled(): boolean {
  return (
    process.env.ADS_ENABLED !== "false" &&
    process.env.NEXT_PUBLIC_ADS_ENABLED !== "false"
  );
}

/**
 * Whether a path is allowed to carry ads. Used by the route-coverage test and
 * by the root AdSense loader so excluded routes never load adsbygoogle.js.
 */
export function isAdEligible(path: string): boolean {
  if (!path) return false;
  const clean =
    path === "/" ? "/" : path.split("?")[0].split("#")[0].replace(/\/+$/, "");
  if (NEVER_ADVERTISED_PREFIXES.some((prefix) => clean.startsWith(prefix))) {
    return false;
  }
  return !(clean in AD_EXCLUDED_ROUTES);
}
