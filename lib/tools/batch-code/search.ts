import { BRANDS } from "@/lib/tools/batch-code/brands";
import type {
  BrandRecord,
  ProductCategory,
} from "@/lib/tools/batch-code/types";
import { CATEGORY_LABELS } from "@/lib/tools/batch-code/shelf-life";

/** Lowercase, strip diacritics and punctuation so "L'Oréal" === "loreal". */
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`.,]/g, "")
    .replace(/[^a-z0-9&+]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function haystack(brand: BrandRecord) {
  return normalize([brand.name, ...brand.aliases, brand.parentGroup].join(" "));
}

function score(brand: BrandRecord, query: string) {
  const name = normalize(brand.name);
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  const aliasHit = brand.aliases.some((alias) => normalize(alias) === query);
  if (aliasHit) return 70;
  if (name.split(" ").some((token) => token.startsWith(query))) return 60;
  const aliasPrefix = brand.aliases.some((alias) =>
    normalize(alias).startsWith(query),
  );
  if (aliasPrefix) return 50;
  if (haystack(brand).includes(query)) return 30;
  return 0;
}

export type SearchOptions = {
  category?: ProductCategory | "all";
  limit?: number;
};

/** Ranked prefix/substring search over names, aliases and parent groups. */
export function searchBrands(query: string, options: SearchOptions = {}) {
  const category = options.category ?? "all";
  const limit = options.limit ?? 8;
  const pool =
    category === "all"
      ? BRANDS
      : BRANDS.filter((brand) => brand.categories.includes(category));
  const normalized = normalize(query);
  if (!normalized) return pool.slice(0, limit);
  const tokens = normalized.split(" ");
  return pool
    .map((brand) => {
      const base = score(brand, normalized);
      if (base > 0) return { brand, score: base };
      // Every token must appear, so "la roche" still finds "La Roche-Posay".
      const hay = haystack(brand);
      const allTokens = tokens.every((token) => hay.includes(token));
      return { brand, score: allTokens ? 20 : 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.brand.name.localeCompare(b.brand.name, "en"),
    )
    .slice(0, limit)
    .map((entry) => entry.brand);
}

export function findBrandByName(query: string) {
  const normalized = normalize(query);
  if (!normalized) return null;
  return BRANDS.find((brand) => normalize(brand.name) === normalized) ?? null;
}

export function brandsByLetter() {
  const groups = new Map<string, BrandRecord[]>();
  for (const brand of BRANDS) {
    const letter = normalize(brand.name).charAt(0).toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    groups.set(key, [...(groups.get(key) ?? []), brand]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map(([letter, brands]) => ({
      letter,
      brands: brands.sort((a, b) => a.name.localeCompare(b.name, "en")),
    }));
}

export const BRAND_CATEGORIES: {
  id: ProductCategory | "all";
  label: string;
  count: number;
}[] = [
  { id: "all", label: "All categories", count: BRANDS.length },
  ...(Object.keys(CATEGORY_LABELS) as ProductCategory[])
    .map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
      count: BRANDS.filter((brand) => brand.categories.includes(id)).length,
    }))
    .filter((entry) => entry.count > 0),
];
