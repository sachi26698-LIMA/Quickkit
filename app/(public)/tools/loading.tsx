import SkeletonPage, {
  SkeletonBlock,
  SkeletonCardGrid,
  SkeletonPageHeader,
} from "@/components/skeletons";

/**
 * /tools — the explorer: page heading, the search + filter bar, the result
 * count line and the tool-card grid. The search bar is a fixed 3.1rem in the
 * real page, so the placeholder reserves exactly that and the grid does not
 * shift when results replace it.
 */
export default function ToolsLoading() {
  return (
    <SkeletonPage label="Loading the tool library">
      <SkeletonPageHeader titleWidth="min(18rem, 60%)" subtitleLines={2} />
      {/* search + category filter row */}
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <SkeletonBlock
          width="100%"
          height="3.1rem"
          radius="var(--radius)"
          style={{ flex: "1 1 18rem" }}
        />
        <SkeletonBlock width="9.5rem" height="3.1rem" radius="var(--radius)" />
      </span>
      <SkeletonBlock
        width="7.5rem"
        height="0.85rem"
        radius="5px"
        style={{ marginBottom: "1rem" }}
      />
      <SkeletonCardGrid count={12} minColumn="13rem" cardHeight="9.5rem" />
    </SkeletonPage>
  );
}
