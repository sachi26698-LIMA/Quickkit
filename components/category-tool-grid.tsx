"use client";
import { useId, useState } from "react";
import ToolCard from "@/components/tool-card";
import type { ClientTool } from "@/lib/client-tool";
import {
  OTHER_GROUP_ID,
  filterCategoryTools,
  type CategoryFilter,
} from "@/lib/category-filters";

/**
 * The tool list of a category page, with a search box and a type picker above
 * it. Every category gets both; the cards themselves are the same ones used
 * everywhere else, each in its own tool colour.
 */
export default function CategoryToolGrid({
  tools,
  categoryName,
  tone,
  filter,
}: {
  /** Display projection — the same shared catalogue the palette ships. */
  tools: ClientTool[];
  /** Shown on each card, so a tool listed in a second category is labelled for this one. */
  categoryName: string;
  /** Category tone class suffix, e.g. "azure". */
  tone: string;
  filter: CategoryFilter;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const id = useId();
  const placed = new Set(filter.groups.flatMap((entry) => entry.slugs));
  // Only offer a type that has at least one tool on this page.
  const groups = filter.groups.filter((entry) =>
    tools.some((tool) => entry.slugs.includes(tool.slug)),
  );
  const hasOther =
    groups.length > 0 && tools.some((tool) => !placed.has(tool.slug));
  const found = filterCategoryTools(tools, filter, group, query);
  const filtering = group !== "all" || query.trim() !== "";
  return (
    <div className="category-browser">
      <h2 className="sr-only">Browse {filter.noun}</h2>
      <div className="advanced-options category-filters">
        <label htmlFor={`${id}-search`}>
          Search {filter.noun}
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or purpose"
            autoComplete="off"
          />
        </label>
        <label htmlFor={`${id}-type`}>
          {filter.typeLabel}
          <select
            id={`${id}-type`}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="all">All {filter.noun}</option>
            {groups.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
            {hasOther ? <option value={OTHER_GROUP_ID}>Other</option> : null}
          </select>
        </label>
      </div>
      <div className="category-filter-status-row">
        <p className="category-filter-status" aria-live="polite">
          Showing {found.length} of {tools.length} {filter.noun}
        </p>
        {/* Reset without waiting for an empty result — filters should never
            be a one-way door. */}
        {filtering && found.length > 0 ? (
          <button
            type="button"
            className="text-link category-filter-clear"
            onClick={() => {
              setQuery("");
              setGroup("all");
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>
      {found.length ? (
        <div className={`tool-grid category-tools cat-${tone}`}>
          {found.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} category={categoryName} />
          ))}
        </div>
      ) : (
        <div className="category-filter-empty">
          <p>No matching {filter.noun}. Try a different search or filter.</p>
          {filtering ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setQuery("");
                setGroup("all");
              }}
            >
              Show all {filter.noun}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
