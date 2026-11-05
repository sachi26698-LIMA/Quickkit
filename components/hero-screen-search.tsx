"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { filterTools } from "@/lib/catalog";
import styles from "./hero-scene-orbit.module.css";

/** Uses the same catalogue matching as the main hero search. */
export default function HeroScreenSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searching = query.trim().length > 0;
  const results = searching ? filterTools(query, "All tools") : [];

  return (
    <div
      className={styles.miniSearchArea}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <form
        action="/tools"
        method="get"
        className={styles.miniSearch}
        role="search"
      >
        <Search aria-hidden="true" />
        <input
          type="search"
          name="q"
          placeholder="Search any tool..."
          aria-label="Search tools in laptop preview"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </form>
      {open && searching && (
        <div className={styles.miniResults}>
          {results.length ? (
            <ul>
              {results.slice(0, 3).map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No matching tools</p>
          )}
        </div>
      )}
      <span className="sr-only" role="status">
        {searching ? `${results.length} tools found` : ""}
      </span>
    </div>
  );
}
