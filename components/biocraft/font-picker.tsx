"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { fetchFontPage } from "@/lib/fonts/client-api";
import type { FontRecord } from "@/lib/fonts/types";

/**
 * Searchable family picker. It fetches 48 families when first opened and
 * queries the server for anything else, so the studio never ships the whole
 * catalogue into the browser bundle.
 */
export default function FontPicker({
  selected,
  initialFonts,
  onChange,
}: {
  selected: FontRecord | null;
  initialFonts: FontRecord[];
  onChange: (font: FontRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FontRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const page = await fetchFontPage(
          { q: query, limit: query ? 24 : 48, sort: "name" },
          controller.signal,
        );
        setOptions(page.items);
      } catch {
        // Ignore aborted or transient requests; the current options stay.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (
        container.current &&
        !container.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bc-picker" ref={container}>
      <button
        type="button"
        className="bc-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="family">
            {selected?.family ?? "Choose a Hindi font"}
          </span>
          <span className="sub">
            {selected
              ? `${selected.category} · ${selected.weightRange[0]}–${selected.weightRange[1]}`
              : "Search all verified families"}
          </span>
        </span>
        <ChevronDown size={16} color="var(--bc-ink-faint)" />
      </button>
      {open ? (
        <div className="bc-picker-pop" role="listbox" aria-label="Hindi fonts">
          <label className="bc-search" style={{ height: 36 }}>
            <Search size={14} color="var(--bc-ink-faint)" aria-hidden="true" />
            <input
              className="bc-picker-search"
              style={{ border: 0, margin: 0, padding: 0 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search families…"
              autoFocus
            />
          </label>
          {loading ? (
            <div className="bc-loading">
              <Loader2 size={15} className="spin" /> Loading families
            </div>
          ) : null}
          {(options.length ? options : initialFonts).map((font) => (
            <button
              key={font.slug}
              type="button"
              role="option"
              aria-selected={selected?.slug === font.slug}
              className="bc-picker-option"
              onClick={() => {
                onChange(font);
                setOpen(false);
                setQuery("");
              }}
            >
              <span>
                <strong style={{ fontWeight: 600 }}>{font.family}</strong>
                <span
                  className="sub"
                  style={{ display: "block", marginTop: 2 }}
                >
                  {font.category} · {font.styleTags.slice(0, 2).join(" · ")}
                </span>
              </span>
              {selected?.slug === font.slug ? <Check size={14} /> : null}
            </button>
          ))}
          {!loading && !options.length && !initialFonts.length ? (
            <div className="bc-loading">No family matches that search.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
