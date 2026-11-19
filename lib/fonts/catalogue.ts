import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import catalogueJson from "./data/catalogue.json";
import importReportJson from "./data/import-report.json";
import licensesJson from "./data/licenses.json";
import type {
  FontCatalogue,
  FontFacet,
  FontLicenseIndexEntry,
  FontListPage,
  FontListQuery,
  FontRecord,
  FontSort,
  RejectedFont,
} from "./types";
import { matchesQuery, normalizeQuery } from "./search";
import { OVERRIDES_FILE, readJsonFile } from "./store";
import { readUsage } from "./usage";

export type FontAdminStatus = "approved" | "pending" | "rejected";

export type FontOverride = {
  status?: FontAdminStatus;
  family?: string;
  category?: string;
  tags?: string[];
  note?: string;
  updatedAt?: string;
};

export type FontOverridesFile = {
  updatedAt: string | null;
  fonts: Record<string, FontOverride>;
};

const EMPTY_OVERRIDES: FontOverridesFile = { updatedAt: null, fonts: {} };

/**
 * The generated catalogue is asserted against the build script's schema.
 * A missing field here is a build error rather than silently undefined data.
 */
export const catalogue = catalogueJson as unknown as FontCatalogue;

export type ValidationReportFamily = {
  family: string;
  slug: string;
  status: "verified" | "rejected";
  score?: number;
  errors: string[];
  warnings: string[];
  coverage?: Record<
    string,
    { required: number; present: number; percent: number }
  >;
  conjuncts?: { text: string; singleGlyph: boolean; ok: boolean }[];
  nukta?: { text: string; ok: boolean; decomposedOk?: boolean }[];
  matras?: { text: string; ok: boolean }[];
  latin?: { required: number; present: number; percent: number };
  files?: {
    path: string;
    weight: number | null;
    bytes: number;
    glyphs: number;
  }[];
};

export type ValidationReport = {
  generatedAt: string;
  verifier: {
    engine: string;
    fontTools: string;
    sampleText: string;
    checks: string[];
  };
  families: Record<string, ValidationReportFamily>;
  totals: {
    discovered: number;
    verified: number;
    rejected: number;
    scannedFiles: number;
    fontFamiliesWithDevanagari: number;
  };
};

export type ImportReport = {
  generatedAt: string;
  summary: FontCatalogue["stats"];
  imported: {
    family: string;
    slug: string;
    files: number;
    bytes: number;
    verified: boolean;
    score: number;
  }[];
  rejected: RejectedFont[];
};

export type LicenseIndex = {
  generatedAt: string;
  licenses: FontLicenseIndexEntry[];
};

/** Hash used only to tie a pagination cursor to the query it was issued for. */
function queryKey(
  query: Required<Pick<FontListQuery, "q" | "category" | "tag" | "sort">>,
): string {
  const value = `${query.q}|${query.category}|${query.tag}|${query.sort}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function encodeCursor(offset: number, key: string): string {
  return Buffer.from(JSON.stringify([offset, key]), "utf8").toString(
    "base64url",
  );
}

export function decodeCursor(
  cursor: string | null | undefined,
  key: string,
): { offset: number } | { error: "invalid" | "stale" } {
  if (!cursor) return { offset: 0 };
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (!Array.isArray(parsed) || typeof parsed[0] !== "number") {
      return { error: "invalid" };
    }
    if (parsed[1] !== key) return { error: "stale" };
    return { offset: Math.max(0, Math.floor(parsed[0])) };
  } catch {
    return { error: "invalid" };
  }
}

export async function readOverrides(): Promise<FontOverridesFile> {
  return readJsonFile<FontOverridesFile>(OVERRIDES_FILE, EMPTY_OVERRIDES);
}

function applyOverride(
  record: FontRecord,
  override: FontOverride | undefined,
): FontRecord {
  if (!override) return record;
  const next: FontRecord = { ...record };
  if (override.family?.trim()) next.family = override.family.trim();
  if (override.category && override.category !== record.category) {
    next.category = override.category;
    next.categorySlug = override.category.toLowerCase().replace(/\s+/g, "-");
    next.tags = [...new Set([override.category, ...record.styleTags])];
  }
  if (override.tags?.length) {
    next.styleTags = [...override.tags];
    next.tags = [...new Set([next.category, ...override.tags])];
  }
  return next;
}

function isPubliclyVisible(override: FontOverride | undefined): boolean {
  return !override?.status || override.status === "approved";
}

export async function listFonts(
  query: FontListQuery = {},
): Promise<FontListPage> {
  const q = normalizeQuery(query.q ?? "");
  const category = (query.category ?? "").trim();
  const tag = (query.tag ?? "").trim();
  const sort: FontSort = query.sort ?? "name";
  const limit = Math.min(48, Math.max(1, Math.floor(query.limit ?? 12)));
  const key = queryKey({ q, category, tag, sort });
  const decoded = decodeCursor(query.cursor, key);
  if ("error" in decoded) {
    throw new FontCursorError(decoded.error);
  }

  const overrides = await readOverrides();
  const usage = await readUsage();
  const merged = catalogue.fonts
    .map((record) => applyOverride(record, overrides.fonts[record.slug]))
    .filter((record) => isPubliclyVisible(overrides.fonts[record.slug]))
    .filter((record) => {
      if (category && record.category !== category) return false;
      if (category === "Variable" && !record.variable) return false;
      if (tag && !record.styleTags.includes(tag) && record.category !== tag) {
        return false;
      }
      return true;
    });

  const filtered = q
    ? merged.filter((record) =>
        matchesQuery(
          {
            family: record.family,
            tags: record.styleTags,
            category: record.category,
            description: record.description,
            source: `${record.source.provider} ${record.source.distributor}`,
          },
          q,
        ),
      )
    : merged;

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.family.localeCompare(a.family);
      case "recent":
        return (
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
          a.family.localeCompare(b.family)
        );
      case "weight":
        return (
          a.weightRange[0] - b.weightRange[0] ||
          a.family.localeCompare(b.family)
        );
      case "popular":
        return (
          (usage.fonts[b.slug] ?? 0) - (usage.fonts[a.slug] ?? 0) ||
          (b.featuredRank >= 0 ? 1 : 0) - (a.featuredRank >= 0 ? 1 : 0) ||
          a.featuredRank - b.featuredRank ||
          a.family.localeCompare(b.family)
        );
      case "name":
      default:
        return a.family.localeCompare(b.family);
    }
  });

  const offset = decoded.offset;
  const items = sorted.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  return {
    items,
    nextCursor:
      nextOffset < sorted.length ? encodeCursor(nextOffset, key) : null,
    total: sorted.length,
    query: { q, category, tag, sort, limit },
  };
}

export class FontCursorError extends Error {
  constructor(public readonly reason: "invalid" | "stale") {
    super(
      reason === "stale"
        ? "This font page cursor belongs to a different search. Start from the first page."
        : "Invalid font page cursor.",
    );
    this.name = "FontCursorError";
  }
}

export async function getFont(slug: string): Promise<FontRecord | null> {
  const overrides = await readOverrides();
  const record = catalogue.fonts.find((font) => font.slug === slug);
  if (!record || !isPubliclyVisible(overrides.fonts[slug])) return null;
  return applyOverride(record, overrides.fonts[slug]);
}

export function getFontUnfiltered(slug: string): FontRecord | null {
  return catalogue.fonts.find((font) => font.slug === slug) ?? null;
}

export async function featuredFonts(limit = 6): Promise<FontRecord[]> {
  const overrides = await readOverrides();
  return catalogue.fonts
    .filter(
      (font) => font.featured && isPubliclyVisible(overrides.fonts[font.slug]),
    )
    .sort((a, b) => a.featuredRank - b.featuredRank)
    .slice(0, limit)
    .map((font) => applyOverride(font, overrides.fonts[font.slug]));
}

export type FontFilterFacets = {
  categories: FontFacet[];
  tags: FontFacet[];
  total: number;
  stats: FontCatalogue["stats"];
};

export async function fontFacets(): Promise<FontFilterFacets> {
  const overrides = await readOverrides();
  const visible = catalogue.fonts.filter((font) =>
    isPubliclyVisible(overrides.fonts[font.slug]),
  );
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const font of visible) {
    categories.set(font.category, (categories.get(font.category) ?? 0) + 1);
    for (const tag of font.styleTags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  const sortFacet = (a: FontFacet, b: FontFacet) =>
    b.count - a.count || a.name.localeCompare(b.name);
  return {
    categories: [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortFacet),
    tags: [...tags.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortFacet),
    total: visible.length,
    stats: { ...catalogue.stats, verified: visible.length },
  };
}

export function sampleText(): string {
  return catalogue.sampleText;
}

export async function readValidationReport(): Promise<ValidationReport> {
  try {
    const file = path.join(
      process.cwd(),
      "lib",
      "fonts",
      "data",
      "verification.json",
    );
    return JSON.parse(await readFile(file, "utf8")) as ValidationReport;
  } catch {
    return {
      generatedAt: "",
      verifier: {
        engine: "unavailable",
        fontTools: "unavailable",
        sampleText: catalogue.sampleText,
        checks: [],
      },
      families: {},
      totals: {
        discovered: 0,
        verified: 0,
        rejected: 0,
        scannedFiles: 0,
        fontFamiliesWithDevanagari: 0,
      },
    };
  }
}

export function readImportReport(): ImportReport {
  return importReportJson as unknown as ImportReport;
}

export function readLicenses(): LicenseIndex {
  return licensesJson as unknown as LicenseIndex;
}

export type DuplicateGroup = {
  kind: "family" | "binary";
  key: string;
  fonts: { slug: string; family: string }[];
};

/** Conservative duplicate detection: identical normalised family names or
 * identical concatenated file hashes. Visually similar siblings such as
 * "Tiro Devanagari Hindi" and "Tiro Devanagari Marathi" are NOT duplicates. */
export function detectDuplicates(): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const byFamily = new Map<string, FontRecord[]>();
  const byHash = new Map<string, FontRecord[]>();
  for (const font of catalogue.fonts) {
    const familyKey = font.family.toLowerCase().replace(/\s+/g, " ").trim();
    byFamily.set(familyKey, [...(byFamily.get(familyKey) ?? []), font]);
    byHash.set(font.filesSha256, [
      ...(byHash.get(font.filesSha256) ?? []),
      font,
    ]);
  }
  for (const [key, fonts] of byFamily) {
    if (fonts.length > 1) {
      groups.push({
        kind: "family",
        key,
        fonts: fonts.map((font) => ({ slug: font.slug, family: font.family })),
      });
    }
  }
  for (const [key, fonts] of byHash) {
    if (fonts.length > 1) {
      groups.push({
        kind: "binary",
        key,
        fonts: fonts.map((font) => ({ slug: font.slug, family: font.family })),
      });
    }
  }
  return groups;
}

export function fontFileForWeight(
  font: FontRecord,
  weight: number,
): { devanagari: FontRecord["primaryFile"]; latin: FontRecord["latinFile"] } {
  const variable = font.files.devanagari.find((file) => file.weight === null);
  if (variable) {
    return {
      devanagari: variable,
      latin:
        font.files.latin.find((file) => file.weight === null) ?? font.latinFile,
    };
  }
  const available = font.files.devanagari
    .map((file) => file.weight)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const closest = available.length
    ? available.reduce((best, candidate) =>
        Math.abs(candidate - weight) < Math.abs(best - weight)
          ? candidate
          : best,
      )
    : 400;
  const devanagari =
    font.files.devanagari.find((file) => file.weight === closest) ??
    font.primaryFile;
  const latin =
    font.files.latin.find((file) => file.weight === closest) ?? font.latinFile;
  return { devanagari, latin };
}

export function clampWeight(font: FontRecord, weight: number): number {
  const [min, max] = font.weightRange;
  if (!Number.isFinite(weight)) return 400;
  return Math.min(max, Math.max(min, Math.round(weight)));
}
