"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  GitCompareArrows,
  Heart,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import FontCard from "./font-card";
import FontPreviewLine from "./font-preview-line";
import {
  fetchFontPage,
  fetchFontsBySlug,
  type FontListResponse,
} from "@/lib/fonts/client-api";
import {
  mergeFontsById,
  rememberFont,
  rememberPreviewText,
  rememberSelectedFont,
  toggleFavorite,
  trackFontUse,
} from "@/lib/fonts/preferences";
import {
  useFavoriteSlugs,
  useRecentSlugs,
  useStoredPreviewText,
} from "@/lib/fonts/use-font-preferences";
import type { FontRecord, FontSort } from "@/lib/fonts/types";

const PAGE_SIZE = 12;

export default function FontLibrary({
  initial,
  sampleText,
}: {
  initial: FontListResponse;
  sampleText: string;
}) {
  const [items, setItems] = useState<FontRecord[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [total, setTotal] = useState(initial.total);
  const [facets, setFacets] = useState(initial.facets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(initial.query?.q ?? "");
  const [debounced, setDebounced] = useState(initial.query?.q ?? "");
  const [category, setCategory] = useState(initial.query?.category ?? "");
  const [tag, setTag] = useState(initial.query?.tag ?? "");
  const [sort, setSort] = useState<FontSort>(initial.query?.sort ?? "name");

  const storedPreviewText = useStoredPreviewText(sampleText);
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const previewText = previewDraft ?? storedPreviewText;
  const [size, setSize] = useState(38);
  const [weight, setWeight] = useState(400);

  const favorites = useFavoriteSlugs();
  const recentSlugs = useRecentSlugs();
  const recentKey = recentSlugs.slice(0, 4).join(",");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [recent, setRecent] = useState<FontRecord[]>([]);
  const [compare, setCompare] = useState<FontRecord[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!recentKey) return;
    const controller = new AbortController();
    void fetchFontsBySlug(recentKey.split(","), controller.signal).then(
      (fonts) => {
        if (!controller.signal.aborted) setRecent(fonts);
      },
    );
    return () => controller.abort();
  }, [recentKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  const favoritesKey = favorites.join(",");
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (favoritesOnly) {
          const fonts = favorites.length
            ? await fetchFontsBySlug(favorites, controller.signal)
            : [];
          setItems(fonts);
          setTotal(fonts.length);
          setCursor(null);
        } else {
          const page = await fetchFontPage(
            {
              q: debounced,
              category,
              tag,
              sort,
              limit: PAGE_SIZE,
            },
            controller.signal,
          );
          setItems(page.items);
          setCursor(page.nextCursor);
          setTotal(page.total);
          if (page.facets) {
            setFacets({
              categories: page.facets.categories,
              tags: page.facets.tags,
              total: page.facets.total,
            });
          }
        }
      } catch (cause) {
        if ((cause as Error).name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "The font index could not be read.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
    // favouritesOnly intentionally keeps the list stable while the visitor
    // toggles hearts; the favourite-only list refreshes through favoritesKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, category, tag, sort, favoritesOnly, favoritesKey]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await fetchFontPage({
        q: debounced,
        category,
        tag,
        sort,
        cursor,
        limit: PAGE_SIZE,
        // Facets are not needed for later pages.
      });
      setItems((current) => mergeFontsById(current, page.items));
      setCursor(page.nextCursor);
      setTotal(page.total);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load more fonts.",
      );
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, debounced, category, tag, sort]);

  const onFavorite = (font: FontRecord) => {
    const next = toggleFavorite(font.slug);
    setAnnouncement(
      next.includes(font.slug)
        ? `${font.family} added to favourites`
        : `${font.family} removed from favourites`,
    );
  };

  const onCompare = (font: FontRecord) => {
    setCompare((current) => {
      if (current.some((entry) => entry.slug === font.slug)) {
        return current.filter((entry) => entry.slug !== font.slug);
      }
      if (current.length >= 3) {
        setAnnouncement("Compare shows three fonts at a time.");
        return current;
      }
      setCompareOpen(true);
      return [...current, font];
    });
  };

  const onUse = (font: FontRecord) => {
    rememberSelectedFont(font.slug);
    rememberFont(font.slug);
    trackFontUse(font.slug, "library");
    setAnnouncement(`${font.family} is now the selected Hindi font.`);
  };

  const download = (font: FontRecord) => {
    if (!font.license.downloadAllowed) return;
    const link = document.createElement("a");
    link.href = font.primaryFile.path;
    link.download = `${font.slug}-devanagari.woff2`;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    trackFontUse(font.slug, "download");
  };

  const resetFilters = () => {
    setQuery("");
    setDebounced("");
    setCategory("");
    setTag("");
    setSort("name");
    setFavoritesOnly(false);
  };

  const activeFilters =
    Number(Boolean(debounced)) +
    Number(Boolean(category)) +
    Number(Boolean(tag)) +
    Number(favoritesOnly);

  return (
    <>
      <section className="bc-toolbar" aria-label="Font filters">
        <div className="bc-search-row">
          <label className="bc-search">
            <Search size={16} color="var(--bc-ink-faint)" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search families, styles or Hindi keywords — जैसे पोस्टर, किताब"
              aria-label="Search Hindi fonts"
              autoComplete="off"
            />
          </label>
          <select
            className="bc-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as FontSort)}
            aria-label="Sort fonts"
          >
            <option value="name">A → Z</option>
            <option value="name-desc">Z → A</option>
            <option value="recent">Recently added</option>
            <option value="popular">Popular</option>
            <option value="weight">Lightest first</option>
          </select>
          <button
            type="button"
            className={`bc-button secondary small ${favoritesOnly ? "is-active" : ""}`}
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
            style={
              favoritesOnly
                ? { background: "var(--bc-rose-soft)", borderColor: "#f3b8cd" }
                : undefined
            }
          >
            <Heart
              size={14}
              fill={favoritesOnly ? "currentColor" : "none"}
              color={favoritesOnly ? "var(--bc-rose)" : undefined}
            />
            Favourites{favorites.length ? ` (${favorites.length})` : ""}
          </button>
          <button
            type="button"
            className="bc-button secondary small"
            onClick={() => {
              setCompareOpen(true);
            }}
            disabled={!compare.length}
          >
            <GitCompareArrows size={14} /> Compare
            {compare.length ? ` (${compare.length})` : ""}
          </button>
        </div>

        <div className="bc-chips" role="group" aria-label="Font categories">
          <button
            type="button"
            className="bc-chip"
            aria-pressed={!category}
            onClick={() => {
              setCategory("");
              setTag("");
            }}
          >
            All <span className="count">{facets?.total ?? total}</span>
          </button>
          {(facets?.categories ?? []).map((facet) => (
            <button
              key={facet.name}
              type="button"
              className="bc-chip"
              aria-pressed={category === facet.name}
              onClick={() =>
                setCategory(category === facet.name ? "" : facet.name)
              }
            >
              {facet.name} <span className="count">{facet.count}</span>
            </button>
          ))}
        </div>

        <div className="bc-chips" role="group" aria-label="Font styles">
          {(facets?.tags ?? []).slice(0, 16).map((facet) => (
            <button
              key={facet.name}
              type="button"
              className="bc-chip"
              aria-pressed={tag === facet.name}
              onClick={() => setTag(tag === facet.name ? "" : facet.name)}
            >
              {facet.name} <span className="count">{facet.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="bc-card bc-editor"
        aria-label="Live Hindi preview editor"
      >
        <div className="bc-field">
          <label htmlFor="bc-preview-text">Your Hindi preview text</label>
          <textarea
            id="bc-preview-text"
            className="bc-textarea"
            value={previewText}
            rows={2}
            maxLength={280}
            onChange={(event) => {
              setPreviewDraft(event.target.value);
              rememberPreviewText(event.target.value);
            }}
            placeholder="अपना टेक्स्ट यहाँ लिखें…"
            lang="hi"
          />
          <span className="bc-hint">
            Every card renders this exact text with its own WOFF2 file. English
            and Hindi can be mixed in one line.
          </span>
        </div>
        <div className="bc-controls-inline">
          <div className="bc-field">
            <label htmlFor="bc-size">Preview size · {size}px</label>
            <input
              id="bc-size"
              className="bc-range"
              type="range"
              min={22}
              max={64}
              step={1}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </div>
          <div className="bc-field">
            <label htmlFor="bc-weight">Weight</label>
            <select
              id="bc-weight"
              className="bc-select"
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            >
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="bc-button secondary small"
            onClick={() => {
              setPreviewDraft(sampleText);
              rememberPreviewText("");
              setSize(38);
              setWeight(400);
            }}
            title="Reset the preview"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </section>

      {recent.length ? (
        <section className="bc-section" style={{ marginTop: 18 }}>
          <div className="bc-section-head">
            <div>
              <h2 style={{ fontSize: 16 }}>Recently opened</h2>
            </div>
            {recent.map((font) => (
              <span key={font.slug} className="bc-tag">
                {font.family}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="bc-filter-note">
        <span aria-live="polite">
          {loading && !items.length ? (
            <Loader2 size={13} className="spin" aria-hidden="true" />
          ) : null}
          Showing {items.length} of {total} families
          {activeFilters
            ? ` · ${activeFilters} filter${activeFilters === 1 ? "" : "s"} active`
            : ""}
        </span>
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="bc-verified">
            <ShieldCheck size={11} /> verified with HarfBuzz
          </span>
          {activeFilters ? (
            <button
              type="button"
              className="bc-button ghost small"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          ) : null}
        </span>
      </div>

      {error ? (
        <div className="bc-card bc-empty" role="alert">
          <X size={22} />
          <h3>The font index stopped responding</h3>
          <p>{error}</p>
          <button
            type="button"
            className="bc-button secondary"
            onClick={resetFilters}
          >
            Try the full library again
          </button>
        </div>
      ) : items.length ? (
        <div className="bc-grid">
          {items.map((font) => (
            <FontCard
              key={font.slug}
              font={font}
              text={previewText || sampleText}
              weight={weight}
              size={size}
              favorite={favoritesSet.has(font.slug)}
              comparing={compare.some((entry) => entry.slug === font.slug)}
              onFavorite={() => onFavorite(font)}
              onCompare={() => onCompare(font)}
              onUse={() => onUse(font)}
              onDownload={() => download(font)}
            />
          ))}
        </div>
      ) : (
        <div className="bc-card bc-empty">
          <Sparkles size={24} />
          <h3>
            {favoritesOnly
              ? "No favourites yet"
              : loading
                ? "Reading the font index…"
                : "No family matches that search"}
          </h3>
          <p>
            {favoritesOnly
              ? "Tap the heart on any font card and it will wait for you here."
              : "Try a category chip, a Hindi keyword such as पोस्टर or सुलेख, or clear the filters."}
          </p>
          <button
            type="button"
            className="bc-button secondary"
            onClick={resetFilters}
          >
            Reset the library
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
        {cursor ? (
          <button
            type="button"
            className="bc-button"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? <Loader2 size={15} className="spin" /> : null}
            Load more families
          </button>
        ) : items.length ? (
          <Link className="bc-button secondary" href="/biocraft/studio">
            Take one into the studio <ArrowRight size={15} />
          </Link>
        ) : null}
      </div>

      {compareOpen && compare.length ? (
        <div className="bc-compare" role="region" aria-label="Font comparison">
          <div className="bc-compare-head">
            <strong>Compare · {previewText || sampleText}</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="bc-hint">
                Up to 3 families, same text and weight
              </span>
              <button
                type="button"
                className="bc-icon-button"
                onClick={() => {
                  setCompare([]);
                  setCompareOpen(false);
                }}
                aria-label="Close comparison"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="bc-compare-grid">
            {compare.map((font) => (
              <div className="bc-compare-cell" key={font.slug}>
                <div className="name">
                  <span>{font.family}</span>
                  <button
                    type="button"
                    className="bc-icon-button"
                    style={{ width: 24, height: 24 }}
                    onClick={() => onCompare(font)}
                    aria-label={`Remove ${font.family} from comparison`}
                  >
                    <X size={12} />
                  </button>
                </div>
                <FontPreviewLine
                  font={font}
                  text={previewText || sampleText}
                  weight={weight}
                  size={Math.max(20, Math.min(30, size * 0.7))}
                  className="sample"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p aria-live="polite" className="bc-hint" style={{ marginTop: 18 }}>
        {announcement}
      </p>
    </>
  );
}
