import type { CSSProperties, ReactNode } from "react";

/**
 * Shared skeleton primitives.
 *
 * Every route gets its own `loading.tsx` that composes these pieces into the
 * real page's shape. Keeping the shapes in one place means the shimmer timing,
 * the colour ramp and the screen-reader wording are decided once, while each
 * page still lays its skeleton out the way that page actually looks — a tool
 * page is not a legal page and neither is a card grid.
 *
 * Sizing note: these blocks are sized to match the content they stand in for,
 * so the swap is CLS-free. Anything whose real height is unpredictable (a
 * table, a paragraph of fixed line count) gets a height that matches the
 * minimum the real block settles at, which is why several of them are
 * expressed in `rem` rather than percentages.
 *
 * Accessibility note: the wrapper is `aria-busy` and exposes a polite status
 * message once, and the shapes themselves are `aria-hidden`, so a screen
 * reader hears "Loading…" rather than a list of meaningless boxes.
 */

type Common = { className?: string; style?: CSSProperties };

/** The shimmering bar/box everything else is built from. */
export function SkeletonBlock({
  width = "100%",
  height = "1rem",
  radius = "8px",
  className = "",
  style,
}: Common & {
  width?: string | number;
  height?: string | number;
  radius?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-block ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A run of text lines, the last one short like a real paragraph. */
export function SkeletonText({
  lines = 3,
  width = "100%",
  lineHeight = "0.85rem",
  gap = "0.55rem",
  className = "",
}: Common & {
  lines?: number;
  width?: string | number;
  lineHeight?: string;
  gap?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-text ${className}`.trim()}
      style={{ width, gap }}
    >
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock
          key={index}
          height={lineHeight}
          radius="6px"
          width={index === lines - 1 ? "62%" : "100%"}
        />
      ))}
    </span>
  );
}

/** Page heading: a title bar plus an optional subtitle run. */
export function SkeletonHeading({
  titleWidth = "min(22rem, 70%)",
  subtitleLines = 2,
  className = "",
}: Common & { titleWidth?: string; subtitleLines?: number }) {
  return (
    <span aria-hidden="true" className={`skeleton-heading ${className}`.trim()}>
      <SkeletonBlock width={titleWidth} height="2.1rem" radius="10px" />
      {subtitleLines > 0 ? (
        <SkeletonText lines={subtitleLines} width="min(46rem, 100%)" />
      ) : null}
    </span>
  );
}

/** The rounded card used by the category grid, tool cards and related links. */
export function SkeletonCard({
  height = "9.5rem",
  className = "",
}: Common & { height?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-card ${className}`.trim()}
      style={{ height }}
    />
  );
}

/**
 * A responsive card grid whose column count follows the real grids on the
 * site, so the skeleton occupies the same box the content will.
 */
export function SkeletonCardGrid({
  count = 8,
  minColumn = "13rem",
  cardHeight = "9.5rem",
  className = "",
}: Common & { count?: number; minColumn?: string; cardHeight?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-grid ${className}`.trim()}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${minColumn}, 100%), 1fr))`,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} height={cardHeight} />
      ))}
    </span>
  );
}

/**
 * The public chrome above a page's own content: breadcrumb, then the title
 * block. Mirrors `.container` + `.tool-title` so the heading lands in the same
 * place the real one will.
 */
export function SkeletonPageHeader({
  breadcrumb = true,
  titleWidth,
  subtitleLines = 2,
}: {
  breadcrumb?: boolean;
  titleWidth?: string;
  subtitleLines?: number;
}) {
  return (
    <div aria-hidden="true" className="skeleton-page-header">
      {breadcrumb ? (
        <span className="skeleton-breadcrumb">
          <SkeletonBlock width="3.2rem" height="0.7rem" radius="5px" />
          <SkeletonBlock width="3.8rem" height="0.7rem" radius="5px" />
          <SkeletonBlock width="5.5rem" height="0.7rem" radius="5px" />
        </span>
      ) : null}
      <SkeletonHeading titleWidth={titleWidth} subtitleLines={subtitleLines} />
    </div>
  );
}

/**
 * The whole-page wrapper. Renders the children inside a `container` and
 * announces itself once to assistive technology.
 */
export default function SkeletonPage({
  children,
  label = "Loading this page",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`container skeleton-page ${className}`.trim()}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">
        {label}…
      </span>
      {children}
    </div>
  );
}
