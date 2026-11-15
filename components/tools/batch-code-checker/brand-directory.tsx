"use client";
/**
 * A–Z brand directory with a live filter.
 *
 * The counts in the header come from the records themselves, so the page cannot
 * claim coverage it does not have. Every brand is listed with its parent group
 * and the truthful decoder status.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { BRANDS, brandCoverage } from "@/lib/tools/batch-code/brands";
import {
  BRAND_CATEGORIES,
  normalize,
  searchBrands,
} from "@/lib/tools/batch-code/search";
import type { ProductCategory } from "@/lib/tools/batch-code/types";
import styles from "./checker.module.css";

export default function BrandDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const coverage = useMemo(() => brandCoverage(), []);

  const groups = useMemo(() => {
    const matches = searchBrands(query, { category, limit: BRANDS.length });
    const byLetter = new Map<string, typeof matches>();
    for (const brand of matches) {
      const letter = normalize(brand.name).charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      byLetter.set(key, [...(byLetter.get(key) ?? []), brand]);
    }
    return [...byLetter.entries()]
      .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
      .map(([letter, brands]) => ({
        letter,
        brands: brands.sort((a, b) => a.name.localeCompare(b.name, "en")),
      }));
  }, [query, category]);

  return (
    <section
      className={styles.directory}
      aria-labelledby="brand-directory-heading"
    >
      <div className={styles.directoryHead}>
        <h2 id="brand-directory-heading">Brand directory</h2>
        <span className={styles.formHint}>
          {coverage.total} records · {coverage.verified} brand-specific decoders
          verified · {coverage.pattern} pattern-only · {coverage.none}{" "}
          documented as undecodable
        </span>
      </div>
      <p className={styles.formHint}>
        Every brand below has a record that states its decoder status, the code
        pattern it uses as far as public documentation allows, its limitation,
        and the shelf-life guidance this site is willing to apply. A brand is
        never listed with a decoder it does not have.
      </p>

      <div className={styles.filters}>
        <label className={styles.field} style={{ flex: "1 1 260px" }}>
          <span className={styles.srOnly}>Filter brands</span>
          <input
            className={styles.input}
            type="search"
            placeholder={`Filter ${BRANDS.length} brands by name or alias`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {BRAND_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={styles.chip}
            aria-pressed={category === entry.id}
            onClick={() => setCategory(entry.id)}
          >
            {entry.label} ({entry.count})
          </button>
        ))}
      </div>

      <nav className={styles.letters} aria-label="Jump to a letter">
        {groups.map((group) => (
          <a
            key={group.letter}
            className={styles.letterLink}
            href={`#brands-${group.letter}`}
          >
            {group.letter}
          </a>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className={styles.empty}>
          No record matches that filter. Nothing is generated to fill the gap —
          an unknown brand is exactly what the checker refuses to guess about.
        </p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <div
              key={group.letter}
              id={`brands-${group.letter}`}
              className={styles.group}
            >
              <h3>{group.letter}</h3>
              <ul className={styles.brandList}>
                {group.brands.map((brand) => (
                  <li key={brand.slug}>
                    <Link
                      href={`/tools/batch-code-checker/brand/${brand.slug}`}
                    >
                      {brand.name}
                    </Link>
                    <small>{brand.parentGroup} · no decoder</small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
