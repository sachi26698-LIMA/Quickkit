import PageHero from "@/components/page-hero";
import SavedList from "@/components/saved-list";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Saved Tools — your QUICKKIT favourites",
  "Tools you've saved with the heart icon, stored locally in this browser for quick access.",
  "/saved",
);

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
