"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  GitCompareArrows,
  Heart,
  X,
} from "lucide-react";
import { LazyFontPreview } from "./font-preview-line";
import type { FontRecord } from "@/lib/fonts/types";

export default function FontCard({
  font,
  text,
  weight,
  size,
  favorite,
  comparing,
  onFavorite,
  onCompare,
  onUse,
  onDownload,
}: {
  font: FontRecord;
  text: string;
  weight: number;
  size?: number;
  favorite: boolean;
  comparing: boolean;
  onFavorite: () => void;
  onCompare: () => void;
  onUse?: () => void;
  onDownload: () => void;
}) {
  return (
    <article
      className="bc-font-card"
      data-font-card={font.slug}
      aria-label={`${font.family} font`}
    >
      <div className="bc-card-head">
        <div>
          <div className="bc-family">
            <Link href={`/biocraft/fonts/${font.slug}`}>{font.family}</Link>
          </div>
          <div className="bc-card-sub">
            <span className="bc-tag">{font.category}</span>
            <span className="bc-verified" title="Verified with HarfBuzz">
              <CheckCircle2 size={10} /> Devanagari verified
            </span>
            {font.variable ? (
              <span className="bc-tag accent">variable</span>
            ) : null}
          </div>
        </div>
        <div className="bc-card-actions">
          <button
            type="button"
            className="bc-icon-button"
            aria-pressed={favorite}
            aria-label={
              favorite
                ? `Remove ${font.family} from favourites`
                : `Add ${font.family} to favourites`
            }
            onClick={onFavorite}
          >
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="bc-icon-button"
            aria-pressed={comparing}
            aria-label={`Compare ${font.family}`}
            onClick={onCompare}
          >
            {comparing ? <X size={16} /> : <GitCompareArrows size={16} />}
          </button>
        </div>
      </div>

      <LazyFontPreview
        font={font}
        text={text}
        weight={weight}
        size={size}
        className="bc-preview"
      />

      <div className="bc-card-foot">
        <div className="meta">
          <span>
            {font.weightRange[0]}–{font.weightRange[1]}
          </span>
          <span>{font.styleTags.slice(0, 2).join(" · ")}</span>
          <span>
            {font.verification.conjunctSingleGlyph}/
            {font.verification.conjunctTotal} conjuncts
          </span>
        </div>
        <div className="bc-card-links">
          {onUse ? (
            <button type="button" onClick={onUse}>
              Use
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDownload}
            disabled={!font.license.downloadAllowed}
            title={
              font.license.downloadAllowed
                ? `Download ${font.primaryFile.path.split("/").pop()}`
                : "This licence does not permit redistribution"
            }
          >
            <Download size={13} /> WOFF2
          </button>
          <Link href={`/biocraft/fonts/${font.slug}`}>Specimen</Link>
        </div>
      </div>
    </article>
  );
}
