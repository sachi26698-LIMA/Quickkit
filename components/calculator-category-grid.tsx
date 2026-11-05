"use client";
import { useState } from "react";
import ToolCard from "@/components/tool-card";
import type { Tool } from "@/lib/catalog";
export default function CalculatorCategoryGrid({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const groups: Record<string, string[]> = {
    financial: [
      "discount-calculator",
      "gst-calculator",
      "emi-calculator",
      "loan-calculator",
    ],
    everyday: [
      "percentage-calculator",
      "bmi-calculator",
      "age-calculator",
      "date-difference-calculator",
    ],
    conversion: [
      "scientific-calculator",
      "unit-converter",
      "temperature-converter",
      "time-converter",
    ],
  };
  const found = tools.filter(
    (t) =>
      (group === "all" || groups[group]?.includes(t.slug)) &&
      `${t.name} ${t.description} ${t.keywords}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div>
      <h2 className="sr-only">Browse calculators</h2>
      <div className="advanced-options">
        <label>
          Search calculators
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or purpose"
          />
        </label>
        <label>
          Calculator type
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All calculators</option>
            <option value="everyday">Everyday &amp; health</option>
            <option value="financial">Money &amp; finance</option>
            <option value="conversion">Scientific &amp; conversion</option>
          </select>
        </label>
      </div>
      <p aria-live="polite">
        Showing {found.length} of {tools.length} calculators
      </p>
      {found.length ? (
        <div className="tool-grid category-tools">
          {found.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        <p>No matching calculators. Try a different search or filter.</p>
      )}
    </div>
  );
}
