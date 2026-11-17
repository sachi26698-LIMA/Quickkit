import SkeletonPage, {
  SkeletonBlock,
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonText,
} from "@/components/skeletons";

/**
 * The shape of every tool page: breadcrumb, icon + title + lede, the workspace
 * itself, the local-processing note, the two-column "walkthrough / good to
 * know" block and the related-tool grid.
 *
 * It matches components/tool-shell.tsx, which is what all 42 tool pages and the
 * consolidated security workspaces render through, so one file covers them all
 * while still looking like the page it is standing in for.
 */
export default function ToolLoading() {
  return (
    <SkeletonPage label="Loading this tool">
      <SkeletonPageHeader />
      <div aria-hidden="true" className="skeleton-tool-title">
        <SkeletonBlock width="4rem" height="4rem" radius="14px" />
        <span className="skeleton-tool-title-copy">
          <SkeletonBlock
            width="min(20rem, 60%)"
            height="2.1rem"
            radius="10px"
          />
          <SkeletonText lines={2} width="min(42rem, 100%)" />
        </span>
      </div>
      {/* The workspace card. Tall enough to cover the drop zone / editor the
          real tool shows, so the page does not jump when it arrives. */}
      <SkeletonBlock
        height="clamp(18rem, 52vh, 34rem)"
        radius="var(--radius)"
      />
      <SkeletonBlock
        width="min(28rem, 80%)"
        height="1rem"
        radius="6px"
        style={{ marginTop: "1.25rem" }}
      />
      <div aria-hidden="true" className="skeleton-guidance">
        <span>
          <SkeletonBlock width="9rem" height="0.8rem" radius="5px" />
          <SkeletonBlock width="min(16rem, 80%)" height="1.5rem" radius="8px" />
          <SkeletonText lines={4} />
        </span>
        <span>
          <SkeletonBlock width="8rem" height="0.8rem" radius="5px" />
          <SkeletonBlock width="min(15rem, 80%)" height="1.5rem" radius="8px" />
          <SkeletonText lines={4} />
        </span>
      </div>
      <SkeletonBlock width="12rem" height="1.5rem" radius="8px" />
      <SkeletonCardGrid count={4} minColumn="15rem" cardHeight="5.5rem" />
    </SkeletonPage>
  );
}
