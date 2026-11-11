import PageHero from "@/components/page-hero";
import SavedList from "@/components/saved-list";
import { pageMetadata } from "@/lib/seo";

// Personal, per-browser state: excluded from the sitemap and served as
// crawlable `noindex, nofollow` so search engines read and honour the directive.
export const metadata = {
  ...pageMetadata(
    "Saved Tools — Bookmarked Favourites",
    "Tools bookmarked with the heart icon in QUICKKIT, stored privately in this browser's localStorage with no account required.",
    "/saved",
  ),
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className="home inner-page">
      <div className="container">
        <PageHero
          eyebrow="YOUR SHORTCUTS"
          title="Saved"
          titleAccent="Tools"
          lede="Your favourite tools, one tap away. This list lives only in this browser — nothing is uploaded or synced."
        />
        <SavedList />
      </div>
    </div>
  );
}
