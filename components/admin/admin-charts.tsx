"use client";

import { useId, useMemo, useState } from "react";
import styles from "./admin.module.css";

const DONUT_PALETTE = [
  "#F04F9B", // Rose Pink
  "#7828D8", // Primary Violet
  "#35C6D0", // Cyan
  "#159D9A", // Teal
  "#FF6B6B", // Coral
  "#9B5CF6", // Soft Violet
  "#C084FC", // Orchid
  "#A599BC", // Lavender Slate
];

export type DonutDatum = {
  slug: string;
  name: string;
  count: number;
};

export function CategoryDonutChart({
  data,
  total,
}: {
  data: DonutDatum[];
  total: number;
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const slices = useMemo(() => {
    const sum = data.reduce((acc, item) => acc + item.count, 0);
    const denom = sum > 0 ? sum : 1;
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const gap = data.filter((item) => item.count > 0).length > 1 ? 3 : 0;

    return data.reduce<
      Array<
        DonutDatum & {
          color: string;
          pct: number;
          circumference: number;
          visibleLength: number;
          dashOffset: number;
          nextOffset: number;
        }
      >
    >((acc, item, index) => {
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0;
      const share = sum > 0 ? item.count / denom : 0;
      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
      const rawLength = share * circumference;
      const visibleLength = Math.max(0, rawLength - gap);
      const dashOffset = -prevOffset;
      acc.push({
        ...item,
        color:
          item.count === 0
            ? "#D7CFE6"
            : DONUT_PALETTE[index % DONUT_PALETTE.length],
        pct,
        circumference,
        visibleLength,
        dashOffset,
        nextOffset: prevOffset + rawLength,
      });
      return acc;
    }, []);
  }, [data, total]);

  const activeSlice = activeSlug
    ? (slices.find((slice) => slice.slug === activeSlug) ?? null)
    : null;

  return (
    <div className={styles["admin-donut-layout"]}>
      <div className={styles["admin-donut-visual"]}>
        <svg
          viewBox="0 0 160 160"
          className={styles["admin-donut-svg"]}
          role="img"
          aria-label={`Tool distribution across ${data.length} categories totaling ${total} tools`}
        >
          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            className={styles["admin-donut-track"]}
            strokeWidth="20"
          />
          <g transform="rotate(-90 80 80)">
            {slices
              .filter((slice) => slice.visibleLength > 0)
              .map((slice) => {
                const isActive = activeSlug === slice.slug;
                const isDimmed = activeSlug !== null && !isActive;
                return (
                  <circle
                    key={slice.slug}
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isActive ? 23 : 20}
                    strokeDasharray={`${slice.visibleLength} ${slice.circumference}`}
                    strokeDashoffset={slice.dashOffset}
                    strokeLinecap="butt"
                    opacity={isDimmed ? 0.38 : 1}
                    className={styles["admin-donut-slice"]}
                    onMouseEnter={() => setActiveSlug(slice.slug)}
                    onMouseLeave={() => setActiveSlug(null)}
                  />
                );
              })}
          </g>
        </svg>
        <div className={styles["admin-donut-center"]} aria-live="polite">
          <strong>{activeSlice ? `${activeSlice.pct}%` : "100%"}</strong>
          <span>
            {activeSlice
              ? `${activeSlice.count} tools`
              : `${total.toLocaleString()} total`}
          </span>
          {activeSlice ? (
            <small title={activeSlice.name}>{activeSlice.name}</small>
          ) : null}
        </div>
      </div>
      <ul className={styles["admin-donut-legend"]}>
        {slices.map((slice) => {
          const isActive = activeSlug === slice.slug;
          return (
            <li key={slice.slug}>
              <button
                type="button"
                className={`${styles["admin-donut-legend-row"]} ${isActive ? styles["admin-donut-legend-row--active"] : ""}`}
                onMouseEnter={() => setActiveSlug(slice.slug)}
                onMouseLeave={() => setActiveSlug(null)}
                onFocus={() => setActiveSlug(slice.slug)}
                onBlur={() => setActiveSlug(null)}
              >
                <span
                  className={styles["admin-donut-dot"]}
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <span className={styles["admin-donut-name"]}>{slice.name}</span>
                <strong className={styles["admin-donut-count"]}>
                  {slice.count}
                </strong>
                <span className={styles["admin-donut-pct"]}>{slice.pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type TrendPoint = {
  date: string;
  value: number;
  secondaryValue?: number;
};

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const date = new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
  );
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    d += ` C ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${midX.toFixed(1)} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return d;
}

export function OperationalTrendChart({
  points,
  primaryLabel,
  secondaryLabel,
  ariaLabel,
}: {
  points: TrendPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  ariaLabel: string;
}) {
  const gradientId = useId();
  const secondaryGradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 560;
  const height = 192;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = useMemo(() => {
    const raw = points.reduce(
      (max, pt) => Math.max(max, pt.value, pt.secondaryValue ?? 0),
      0,
    );
    if (raw <= 4) return 4;
    return Math.ceil(raw / 4) * 4;
  }, [points]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(maxVal * ratio),
    y: padTop + plotH - ratio * plotH,
  }));

  const primaryCoords = points.map((pt, index) => ({
    x:
      points.length > 1
        ? padLeft + (index / (points.length - 1)) * plotW
        : padLeft + plotW / 2,
    y: padTop + plotH - (pt.value / maxVal) * plotH,
    pt,
  }));

  const hasSecondary = Boolean(
    secondaryLabel && points.some((pt) => pt.secondaryValue !== undefined),
  );
  const secondaryCoords = hasSecondary
    ? points.map((pt, index) => ({
        x:
          points.length > 1
            ? padLeft + (index / (points.length - 1)) * plotW
            : padLeft + plotW / 2,
        y: padTop + plotH - ((pt.secondaryValue ?? 0) / maxVal) * plotH,
        pt,
      }))
    : [];

  const primaryLine = buildSmoothPath(primaryCoords);
  const primaryArea = primaryCoords.length
    ? `${primaryLine} L ${primaryCoords[primaryCoords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${primaryCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
    : "";

  const secondaryLine = hasSecondary ? buildSmoothPath(secondaryCoords) : "";
  const secondaryArea =
    hasSecondary && secondaryCoords.length
      ? `${secondaryLine} L ${secondaryCoords[secondaryCoords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${secondaryCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  const xLabelStride = Math.max(1, Math.ceil(points.length / 7));
  const activePoint =
    hoveredIndex !== null ? (primaryCoords[hoveredIndex] ?? null) : null;

  return (
    <div className={styles["admin-trend-wrap"]}>
      <div className={styles["admin-trend-legend-row"]}>
        <span className={styles["admin-trend-legend-item"]}>
          <i style={{ backgroundColor: "#7828D8" }} aria-hidden="true" />
          {primaryLabel}
        </span>
        {hasSecondary && secondaryLabel ? (
          <span className={styles["admin-trend-legend-item"]}>
            <i style={{ backgroundColor: "#F04F9B" }} aria-hidden="true" />
            {secondaryLabel}
          </span>
        ) : null}
        {activePoint ? (
          <span className={styles["admin-trend-readout"]} aria-live="polite">
            <strong>{formatShortDate(activePoint.pt.date)}</strong>:{" "}
            {activePoint.pt.value} {primaryLabel.toLowerCase()}
            {hasSecondary && secondaryLabel
              ? ` · ${activePoint.pt.secondaryValue ?? 0} ${secondaryLabel.toLowerCase()}`
              : ""}
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles["admin-trend-svg"]}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7828D8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7828D8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={secondaryGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F04F9B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#F04F9B" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={tick.y}
              y2={tick.y}
              className={styles["admin-chart-grid"]}
            />
            <text
              x={padLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className={styles["admin-chart-axis"]}
            >
              {tick.value}
            </text>
          </g>
        ))}
        {primaryArea ? (
          <path d={primaryArea} fill={`url(#${gradientId})`} />
        ) : null}
        {secondaryArea ? (
          <path d={secondaryArea} fill={`url(#${secondaryGradientId})`} />
        ) : null}
        {primaryLine ? (
          <path
            d={primaryLine}
            fill="none"
            stroke="#7828D8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}
        {secondaryLine ? (
          <path
            d={secondaryLine}
            fill="none"
            stroke="#F04F9B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
        ) : null}
        {primaryCoords.map((coord, index) => {
          const isHovered = hoveredIndex === index;
          const showLabel =
            index % xLabelStride === 0 || index === primaryCoords.length - 1;
          return (
            <g key={coord.pt.date}>
              {isHovered ? (
                <line
                  x1={coord.x}
                  x2={coord.x}
                  y1={padTop}
                  y2={padTop + plotH}
                  className={styles["admin-chart-guide"]}
                />
              ) : null}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isHovered ? 5 : 3.2}
                className={styles["admin-chart-dot-primary"]}
              />
              {hasSecondary && secondaryCoords[index] ? (
                <circle
                  cx={secondaryCoords[index].x}
                  cy={secondaryCoords[index].y}
                  r={isHovered ? 4.5 : 2.8}
                  className={styles["admin-chart-dot-secondary"]}
                />
              ) : null}
              <rect
                x={coord.x - plotW / Math.max(points.length * 2, 2)}
                y={padTop}
                width={plotW / Math.max(points.length, 1)}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatShortDate(coord.pt.date)}: ${coord.pt.value} ${primaryLabel}${hasSecondary && secondaryLabel ? `, ${coord.pt.secondaryValue ?? 0} ${secondaryLabel}` : ""}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              />
              {showLabel ? (
                <text
                  x={coord.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={styles["admin-chart-axis"]}
                >
                  {formatShortDate(coord.pt.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function EntityBarList({
  items,
}: {
  items: {
    label: string;
    subtitle?: string;
    count: number;
  }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className={styles["admin-bar-list"]}>
      {items.map((item, index) => {
        const pct = Math.max(8, Math.round((item.count / max) * 100));
        return (
          <div
            className={styles["admin-bar-row"]}
            key={`${item.label}-${index}`}
          >
            <div className={styles["admin-bar-label"]}>
              <span title={item.label}>{item.label}</span>
              {item.subtitle ? <small>{item.subtitle}</small> : null}
            </div>
            <div
              className={styles["admin-bar-track"]}
              role="img"
              aria-label={`${item.label}: ${item.count} recorded events`}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <strong className={styles["admin-bar-value"]}>
              {item.count.toLocaleString()}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
