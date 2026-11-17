import SkeletonPage, {
  SkeletonBlock,
  SkeletonText,
} from "@/components/skeletons";

/**
 * Long-form guide pages (guides/barcode). Guides are prose, not workspaces, so
 * the skeleton is a wide title, a lede and a run of article blocks rather than
 * a card grid.
 */
export default function GuidesLoading() {
  return (
    <SkeletonPage label="Loading this guide">
      <span aria-hidden="true" className="skeleton-breadcrumb">
        <SkeletonBlock width="3.2rem" height="0.7rem" radius="5px" />
        <SkeletonBlock width="3.8rem" height="0.7rem" radius="5px" />
        <SkeletonBlock width="6.5rem" height="0.7rem" radius="5px" />
      </span>
      <SkeletonBlock
        width="min(30rem, 85%)"
        height="2.4rem"
        radius="10px"
        style={{ margin: "1.25rem 0 1rem" }}
      />
      <SkeletonText lines={2} width="min(44rem, 100%)" />
      {[0, 1, 2].map((section) => (
        <span
          key={section}
          aria-hidden="true"
          style={{ display: "block", marginTop: "2.75rem" }}
        >
          <SkeletonBlock
            width="min(18rem, 70%)"
            height="1.5rem"
            radius="8px"
            style={{ marginBottom: "0.9rem" }}
          />
          <SkeletonText lines={4} width="min(52rem, 100%)" />
        </span>
      ))}
    </SkeletonPage>
  );
}
