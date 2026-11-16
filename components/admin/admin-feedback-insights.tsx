"use client";

import { Star } from "lucide-react";
import styles from "./admin.module.css";
import type { SubmissionRow } from "@/lib/supabase/admin-data";
import { TOOL_FEEDBACK_RATING_LABELS } from "@/lib/tool-feedback";

/**
 * Five stars with the first `rating` filled. Read as "N out of 5 stars";
 * pass `decorative` where the exact number is already written beside it.
 */
export function AdminStars({
  rating,
  size = 14,
  decorative = false,
}: {
  rating: number;
  size?: number;
  decorative?: boolean;
}) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={styles["admin-stars"]}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `${value} out of 5 stars` })}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          aria-hidden="true"
          data-filled={index < value}
          fill={index < value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export function ratingLabel(rating: number) {
  return TOOL_FEEDBACK_RATING_LABELS[Math.round(rating) - 1] ?? "";
}

export type RatingSummary = {
  count: number;
  average: number | null;
  /** Index 0 = one star … index 4 = five stars. */
  distribution: number[];
  low: number;
  tools: { slug: string; name: string; count: number; average: number }[];
};

export function summarizeRatings(rows: SubmissionRow[]): RatingSummary {
  const distribution = [0, 0, 0, 0, 0];
  const perTool = new Map<
    string,
    { slug: string; name: string; count: number; total: number }
  >();
  let total = 0;
  let count = 0;
  for (const row of rows) {
    if (row.source !== "rating" || typeof row.rating !== "number") continue;
    const rating = Math.round(row.rating);
    if (rating < 1 || rating > 5) continue;
    distribution[rating - 1] += 1;
    total += rating;
    count += 1;
    const slug = row.tool_slug ?? "";
    const entry = perTool.get(slug) ?? {
      slug,
      name: row.tool_name ?? slug,
      count: 0,
      total: 0,
    };
    entry.count += 1;
    entry.total += rating;
    perTool.set(slug, entry);
  }
  return {
    count,
    average: count ? total / count : null,
    distribution,
    low: distribution[0] + distribution[1],
    tools: [...perTool.values()]
      .map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        count: entry.count,
        average: entry.total / entry.count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/** Rating breakdown and per-tool averages shown above the feedback table. */
export function AdminFeedbackInsights({
  summary,
  activeTool,
  onSelectTool,
  activeRating,
  onSelectRating,
}: {
  summary: RatingSummary;
  activeTool: string;
  onSelectTool: (slug: string) => void;
  activeRating: string;
  onSelectRating: (rating: string) => void;
}) {
  if (!summary.count) return null;
  const visibleTools = summary.tools.slice(0, 6);
  return (
    <div className={styles["admin-feedback-insights"]}>
      <section
        className={styles["admin-feedback-card"]}
        aria-labelledby="admin-rating-breakdown"
      >
        <header>
          <h3 id="admin-rating-breakdown">Rating breakdown</h3>
          <p>
            <strong>{summary.average?.toFixed(1)}</strong>
            <AdminStars rating={summary.average ?? 0} size={15} decorative />
            <span>
              from {summary.count.toLocaleString()}{" "}
              {summary.count === 1 ? "rating" : "ratings"}
            </span>
          </p>
        </header>
        <ul className={styles["admin-rating-bars"]}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const amount = summary.distribution[stars - 1];
            const share = Math.round((amount / summary.count) * 100);
            const active = activeRating === String(stars);
            return (
              <li key={stars}>
                <button
                  type="button"
                  aria-pressed={active}
                  data-active={active}
                  aria-label={`${stars}-star ratings: ${amount.toLocaleString()} (${share}%). Show only these.`}
                  onClick={() => onSelectRating(active ? "all" : String(stars))}
                >
                  <span className={styles["admin-rating-bars-label"]}>
                    {stars} <Star size={12} fill="currentColor" aria-hidden />
                  </span>
                  <span
                    className={styles["admin-rating-bars-track"]}
                    aria-hidden="true"
                  >
                    <span
                      data-tone={
                        stars >= 4 ? "good" : stars === 3 ? "mid" : "low"
                      }
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className={styles["admin-rating-bars-count"]}>
                    {amount.toLocaleString()}
                    <small>{share}%</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section
        className={styles["admin-feedback-card"]}
        aria-labelledby="admin-rating-tools"
      >
        <header>
          <h3 id="admin-rating-tools">Ratings by tool</h3>
          <p>
            <span>
              {summary.tools.length === 1
                ? "1 tool rated"
                : `${summary.tools.length} tools rated`}
              {summary.tools.length > visibleTools.length
                ? ` · showing the ${visibleTools.length} most rated`
                : ""}
            </span>
          </p>
        </header>
        <ul className={styles["admin-tool-ratings"]}>
          {visibleTools.map((tool) => {
            const active = activeTool === tool.slug;
            return (
              <li key={tool.slug}>
                <button
                  type="button"
                  aria-pressed={active}
                  data-active={active}
                  aria-label={`${tool.name}: ${tool.average.toFixed(1)} out of 5 from ${tool.count.toLocaleString()} ${tool.count === 1 ? "rating" : "ratings"}. Show only this tool.`}
                  onClick={() => onSelectTool(active ? "all" : tool.slug)}
                >
                  <span className={styles["admin-tool-ratings-name"]}>
                    {tool.name}
                  </span>
                  <AdminStars rating={tool.average} size={13} decorative />
                  <strong data-tone={tool.average < 3 ? "low" : undefined}>
                    {tool.average.toFixed(1)}
                  </strong>
                  <small>
                    {tool.count.toLocaleString()}{" "}
                    {tool.count === 1 ? "rating" : "ratings"}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
