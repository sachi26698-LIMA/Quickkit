"use client";
import { useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/lib/use-hydrated";
import { ArrowUpRight } from "lucide-react";
import {
  Search,
  X,
  Type,
  CaseSensitive,
  Braces,
  KeyRound,
  QrCode,
  ImageIcon,
  Scaling,
  Crop,
  SlidersHorizontal,
} from "lucide-react";
import { categories, filterTools, tools, type Category } from "@/lib/catalog";
const icons = {
  text: Type,
  case: CaseSensitive,
  code: Braces,
  key: KeyRound,
  qr: QrCode,
  image: ImageIcon,
  resize: Scaling,
  crop: Crop,
};
export default function Catalog() {
  const ready = useHydrated();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All tools");
  const results = filterTools(query, category);
  return (
    <>
      <form
        className="search-wrap"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById("tools")?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
          });
        }}
      >
        <Search size={21} aria-hidden="true" />
        <label className="sr-only" htmlFor="tool-search">
          Search tools
        </label>
        <input
          disabled={!ready}
          id="tool-search"
          type="search"
          placeholder="What can we help you with?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
        />
        {query ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <X size={18} />
          </button>
        ) : null}
        <button className="primary search-submit" type="submit">
          Search <Search size={15} />
        </button>
      </form>
      <section id="tools" className="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
            <h2 id="catalog-title">Explore the toolkit</h2>
            <p>Find the right tool. Get on with your day.</p>
          </div>
          <span className="catalog-count">
            {tools.length} tools. One handy place.
          </span>
        </div>
        <div className="filter-row">
          <div className="filters" aria-label="Filter tools by category">
            {categories.map((item) => (
              <button
                key={item}
                aria-pressed={category === item}
                className={category === item ? "chip active" : "chip"}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <SlidersHorizontal
            size={18}
            aria-hidden="true"
            className="filter-decoration"
          />
        </div>
        <p className="sr-only" role="status">
          {results.length} tools found
        </p>
        <div className="tool-grid">
          {results.map((tool) => {
            const Icon = icons[tool.icon];
            return (
              <Link
                href={`/tools/${tool.slug}`}
                className="tool-card"
                key={tool.slug}
              >
                <div className="card-top">
                  <span className={`tool-icon ${tool.color}`}>
                    <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span className="category-label">{tool.category}</span>
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <div className="card-footer">
                  <span>Open tool</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
        {!results.length && (
          <div className="empty">
            <Search size={30} aria-hidden="true" />
            <h3>No tools found</h3>
            <p>Try another search or explore the full collection.</p>
            <button
              className="primary"
              onClick={() => {
                setQuery("");
                setCategory("All tools");
              }}
            >
              Clear search & filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
