import SkeletonPage, {
  SkeletonBlock,
  SkeletonText,
} from "@/components/skeletons";

/**
 * Fallback for every public route that does not define its own `loading.tsx`:
 * the homepage, the legal/information pages (about, privacy, terms, …), help,
 * FAQ, contact and the account screens.
 *
 * Next gives one loading slot per segment, so this lives at the route-group
 * root and is inherited by all of them. Routes with a distinct layout —
 * /tools, /category/[slug], the tool pages and /guides — each override it with
 * a skeleton shaped like that page.
 *
 * Deliberately generic in *shape* but not in *metrics*: it uses the same
 * container, the same heading block and the same paragraph rhythm those pages
 * actually use, so the swap is still layout-shift free.
 *
 * The homepage inherits this one. Giving it a bespoke skeleton would mean
 * moving `app/(public)/page.tsx` into its own segment, which three source
 * audits read by that exact path (google-verification, ad-placements,
 * catalog-counts). That trade is not worth breaking those audits for, and it is
 * recorded as a limitation in the report.
 */
export default function PublicLoading() {
  return (
    <SkeletonPage label="Loading this page">
      <span aria-hidden="true">
        <SkeletonBlock
          width="min(24rem, 80%)"
          height="2.4rem"
          radius="10px"
          style={{ margin: "1.5rem 0 1rem" }}
        />
        <SkeletonText lines={2} width="min(42rem, 100%)" />
        {[0, 1, 2].map((section) => (
          <span key={section} style={{ display: "block", marginTop: "2.5rem" }}>
            <SkeletonBlock
              width="min(16rem, 70%)"
              height="1.4rem"
              radius="8px"
              style={{ marginBottom: "0.85rem" }}
            />
            <SkeletonText lines={3} width="min(50rem, 100%)" />
          </span>
        ))}
      </span>
    </SkeletonPage>
  );
}
