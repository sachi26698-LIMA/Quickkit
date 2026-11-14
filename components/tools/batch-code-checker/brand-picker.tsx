"use client";
/**
 * Brand combobox: a text field with a filtered listbox, arrow-key support and
 * an honest empty state. It searches the shipped records only — there is no
 * remote brand API, so "not in the list" means "no record exists here".
 */
import { useId, useMemo, useRef, useState } from "react";
import { BRAND_CATEGORIES, searchBrands } from "@/lib/tools/batch-code/search";
import type {
  BrandRecord,
  ProductCategory,
} from "@/lib/tools/batch-code/types";
import styles from "./checker.module.css";

export default function BrandPicker({
  brandSlug,
  brandName,
  category,
  onCategoryChange,
  onSelect,
  invalid = false,
  describedBy,
}: {
  brandSlug: string;
  brandName: string;
  category: ProductCategory | "all";
  onCategoryChange: (category: ProductCategory | "all") => void;
  onSelect: (brand: { slug: string; name: string } | null) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState(brandName);
  // The brand can also come from outside the input: a `?brand=` shared link
  // arrives one render after hydration, and clearing the brand resets it to
  // "". Track the last external name so those changes reach the field without
  // overwriting whatever the visitor is typing.
  const [externalName, setExternalName] = useState(brandName);
  if (brandName !== externalName) {
    setExternalName(brandName);
    setQuery(brandName);
  }
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | null>(null);

  const options = useMemo(
    () => searchBrands(query, { category, limit: 8 }),
    [query, category],
  );

  const choose = (brand: BrandRecord) => {
    setQuery(brand.name);
    onSelect({ slug: brand.slug, name: brand.name });
    setOpen(false);
  };

  const activeOption = options[Math.min(active, options.length - 1)];

  return (
    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor={inputId}>Brand</label>
        <div className={styles.comboWrap}>
          <input
            id={inputId}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && activeOption
                ? `${listId}-${activeOption.slug}`
                : undefined
            }
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            placeholder="Start typing, e.g. Nivea, L'Oréal, Minimalist"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(0);
              if (brandSlug) onSelect(null);
            }}
            onFocus={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current);
              setOpen(true);
            }}
            onBlur={() => {
              // Let a click on an option land before the list disappears.
              blurTimer.current = window.setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActive((index) => Math.min(index + 1, options.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && open && activeOption) {
                event.preventDefault();
                choose(activeOption);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {open ? (
            <ul
              className={styles.listbox}
              id={listId}
              role="listbox"
              aria-label="Brands"
            >
              {options.length === 0 ? (
                <li className={styles.noOption}>
                  No brand record matches “{query}”. Nothing is guessed: an
                  unknown brand cannot be checked. Try the A–Z directory below,
                  or another spelling.
                </li>
              ) : (
                options.map((brand, index) => (
                  <li
                    key={brand.slug}
                    id={`${listId}-${brand.slug}`}
                    role="option"
                    aria-selected={index === active}
                    className={styles.option}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(brand);
                    }}
                    onMouseEnter={() => setActive(index)}
                  >
                    {brand.name}
                    <small>
                      {brand.parentGroup} · {brand.categories.join(", ")} · no
                      decoder
                    </small>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <small>
          {brandSlug
            ? "Brand selected. Its record documents the decoder, or says why there is none."
            : "Pick a brand from the list; the checker will not invent a format for an unknown one."}
        </small>
      </div>

      <label className={styles.field}>
        Category filter
        <select
          className={styles.select}
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as ProductCategory | "all")
          }
        >
          {BRAND_CATEGORIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} ({entry.count})
            </option>
          ))}
        </select>
        <small>
          Narrows the suggestions; it never changes what a brand&apos;s code can
          reveal.
        </small>
      </label>
    </div>
  );
}
