/**
 * Shelf-life guidance, kept separate from decoding on purpose.
 *
 * A brand's lot code and a brand's shelf life are different facts with different
 * evidence. The values below are general category guidance — the kind of figure
 * a manufacturer prints as "best before 36 months after manufacture" — and are
 * labelled as guidance everywhere they are used. The printed date always
 * outranks them.
 *
 * PAO (the open-jar symbol) is the one figure here with a legal definition: EU
 * Cosmetics Regulation 1223/2009, Annex VIII.
 */
import type { ProductCategory, ShelfLife } from "@/lib/tools/batch-code/types";

const GUIDANCE_SOURCE =
  "General category guidance (unopened) — not a manufacturer statement; the printed date always wins";

export const CATEGORY_SHELF_LIFE: Record<ProductCategory, ShelfLife> = {
  skincare: {
    months: 36,
    note: "Unopened serums and creams commonly carry a 30–36 month shelf life; water-based products are usually the shorter end. Preservatives fade once opened — use the PAO.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  haircare: {
    months: 36,
    note: "Shampoos and conditioners commonly carry 30–36 months unopened; the printed date is what matters.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  makeup: {
    months: 24,
    note: "Powders and pencils usually keep longer than liquids. Mascara and liquid foundation are PAO-limited, not shelf-life-limited.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  fragrance: {
    months: 60,
    note: "Unopened fragrance is commonly given 3–5 years; light and heat shorten it. Oxidation after opening is not reversible.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  bodycare: {
    months: 36,
    note: "Lotions and body creams commonly carry 30–36 months unopened.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  "personal-care": {
    months: 36,
    note: "Soaps, deodorants and similar products commonly carry 30–36 months unopened.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  "sun-care": {
    months: 30,
    note: "Sunscreen is the one category where the SPF itself degrades: treat the printed date, and 12 months after opening, as hard limits.",
    source: GUIDANCE_SOURCE,
    confidence: "guidance",
  },
  other: {
    months: null,
    note: "No defensible generic shelf life for this category, so none is estimated.",
    source: "No applicable guidance",
    confidence: "none",
  },
};

export const PAO_GUIDANCE: { months: number; label: string; note: string }[] = [
  { months: 3, label: "3M", note: "Use within 3 months of opening." },
  { months: 6, label: "6M", note: "Use within 6 months of opening." },
  { months: 9, label: "9M", note: "Use within 9 months of opening." },
  { months: 12, label: "12M", note: "Use within 12 months of opening." },
  { months: 18, label: "18M", note: "Use within 18 months of opening." },
  { months: 24, label: "24M", note: "Use within 24 months of opening." },
  { months: 36, label: "36M", note: "Use within 36 months of opening." },
];

export const PAO_SOURCE =
  "EU Cosmetics Regulation 1223/2009, Annex VIII — the open-jar symbol states the period after opening";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  skincare: "Skincare",
  haircare: "Haircare",
  makeup: "Makeup",
  fragrance: "Fragrance",
  bodycare: "Body care",
  "personal-care": "Personal care",
  "sun-care": "Sun care",
  other: "Other",
};
