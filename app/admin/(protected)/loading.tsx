import {
  SkeletonBlock,
  SkeletonCardGrid,
  SkeletonText,
} from "@/components/skeletons";

/**
 * Admin pages render inside AdminShell, which supplies the sidebar and the
 * page frame, so this skeleton deliberately does not repeat them — it fills the
 * content region only. That keeps the shell (and its navigation) mounted while
 * a data-heavy admin page resolves, which is the whole point of a loading
 * boundary here: the admin can still move around.
 *
 * Shape: a title bar, the metric-tile row the dashboard and analytics pages
 * both open with, then a wide table/chart block.
 */
export default function AdminLoading() {
  return (
    <div className="skeleton-page" style={{ padding: "0 0 3rem" }}>
      <span className="sr-only" role="status" aria-live="polite">
        Loading this admin page…
      </span>
      <div aria-hidden="true">
        <SkeletonBlock
          width="min(18rem, 70%)"
          height="1.9rem"
          radius="9px"
          style={{ marginBottom: "0.7rem" }}
        />
        <SkeletonText lines={1} width="min(32rem, 100%)" />
        <div style={{ margin: "1.75rem 0 2rem" }}>
          <SkeletonCardGrid count={4} minColumn="12rem" cardHeight="7rem" />
        </div>
        <SkeletonBlock
          height="clamp(16rem, 46vh, 30rem)"
          radius="var(--radius)"
        />
        <div style={{ marginTop: "2rem" }}>
          <SkeletonCardGrid count={2} minColumn="18rem" cardHeight="11rem" />
        </div>
      </div>
    </div>
  );
}
