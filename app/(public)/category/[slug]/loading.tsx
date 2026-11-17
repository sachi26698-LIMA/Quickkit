import SkeletonPage, {
  SkeletonBlock,
  SkeletonCardGrid,
  SkeletonText,
} from "@/components/skeletons";

/**
 * A category page: breadcrumb, the tall tinted hero (icon, name, blurb, tool
 * count) and then the grid of that category's tools, followed by the
 * "about this category" copy and the other-categories strip.
 *
 * The hero reserves the same height the real `.category-hero` occupies, which
 * is the one block on this page whose height is not implied by its contents.
 */
export default function CategoryLoading() {
  return (
    <SkeletonPage label="Loading this category">
      <span aria-hidden="true" className="skeleton-breadcrumb">
        <SkeletonBlock width="3.2rem" height="0.7rem" radius="5px" />
        <SkeletonBlock width="3.8rem" height="0.7rem" radius="5px" />
        <SkeletonBlock width="6rem" height="0.7rem" radius="5px" />
      </span>
      <SkeletonBlock
        height="clamp(11rem, 24vh, 15rem)"
        radius="calc(var(--radius) + 8px)"
        style={{ margin: "1.25rem 0 2.5rem" }}
      />
      <SkeletonCardGrid count={9} minColumn="13rem" cardHeight="9.5rem" />
      <span
        aria-hidden="true"
        style={{ display: "block", margin: "3.5rem 0 2rem" }}
      >
        <SkeletonBlock
          width="14rem"
          height="1.6rem"
          radius="8px"
          style={{ marginBottom: "1rem" }}
        />
        <SkeletonText lines={3} width="min(48rem, 100%)" />
      </span>
      <SkeletonCardGrid count={8} minColumn="11rem" cardHeight="4.5rem" />
    </SkeletonPage>
  );
}
