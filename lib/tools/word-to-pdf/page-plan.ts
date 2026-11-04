import type { Settings } from "./settings";
export const PAGE_OVERRIDE_KEYS = [
  "paper",
  "landscape",
  "width",
  "height",
  "margins",
  "top",
  "right",
  "bottom",
  "left",
  "backgroundEnabled",
  "backgroundColor",
  "header",
  "footer",
  "font",
  "fontSize",
  "color",
  "align",
  "numbering",
  "position",
  "numberStyle",
  "numberFormat",
  "watermarkText",
  "watermarkColor",
  "watermarkSize",
  "watermarkOpacity",
  "watermarkAngle",
  "imageWatermarkEnabled",
  "imageWatermarkWidth",
  "imageWatermarkOpacity",
] as const;
export type PageOverrides = Partial<
  Pick<Settings, (typeof PAGE_OVERRIDE_KEYS)[number]>
>;
export type VisualPage = {
  id: string;
  source: number | null;
  rotation: number;
  section: string;
  overrides: PageOverrides;
};
export type VisualPlan = { sourceCount: number; pages: VisualPage[] };
export function validatePlan(value: unknown): VisualPlan | null {
  if (value === null) return null;
  if (
    !value ||
    typeof value !== "object" ||
    !("sourceCount" in value) ||
    !("pages" in value)
  )
    throw new Error("Invalid visual page plan.");
  const plan = value as VisualPlan;
  if (
    !Number.isInteger(plan.sourceCount) ||
    plan.sourceCount < 1 ||
    plan.sourceCount > 100 ||
    !Array.isArray(plan.pages) ||
    !plan.pages.length ||
    plan.pages.length > 100
  )
    throw new Error(
      "Keep 1–100 output pages. Large-document support is not stress-certified.",
    );
  const ids = new Set<string>();
  for (const p of plan.pages) {
    if (
      !p ||
      typeof p !== "object" ||
      typeof p.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(p.id) ||
      ids.has(p.id)
    )
      throw new Error("Visual pages need unique valid identifiers.");
    ids.add(p.id);
    if (
      p.source !== null &&
      (!Number.isInteger(p.source) ||
        p.source < 0 ||
        p.source >= plan.sourceCount)
    )
      throw new Error("Visual page refers to an unavailable source page.");
    if (
      ![0, 90, 180, 270].includes(p.rotation) ||
      typeof p.section !== "string" ||
      !p.section.trim() ||
      p.section.length > 40 ||
      /[^\x20-\x7e]/.test(p.section)
    )
      throw new Error(
        "Invalid page rotation or section (use up to 40 basic Latin characters).",
      );
    if (
      !p.overrides ||
      typeof p.overrides !== "object" ||
      Array.isArray(p.overrides) ||
      Object.keys(p.overrides).some(
        (k) => !(PAGE_OVERRIDE_KEYS as readonly string[]).includes(k),
      )
    )
      throw new Error("Unsupported per-page settings.");
  }
  return plan;
}
export function initialPlan(
  sourceCount: number,
  indices: number[],
): VisualPlan {
  const result = {
    sourceCount,
    pages: indices.map((i) => ({
      id: `source-${i + 1}`,
      source: i,
      rotation: 0,
      section: "Main",
      overrides: {},
    })),
  };
  validatePlan(result);
  return result;
}
function checked(plan: VisualPlan): VisualPlan {
  validatePlan(plan);
  return plan;
}
export function movePages(
  plan: VisualPlan,
  ids: string[],
  before: string | null,
): VisualPlan {
  const selected = new Set(ids);
  if (before && selected.has(before)) return plan;
  const moved = plan.pages.filter((p) => selected.has(p.id)),
    rest = plan.pages.filter((p) => !selected.has(p.id));
  const target = before ? rest.findIndex((p) => p.id === before) : rest.length;
  if (target < 0 || !moved.length)
    throw new Error("Select existing pages to move.");
  const section = before ? rest[target].section : moved[0].section;
  return checked({
    ...plan,
    pages: [
      ...rest.slice(0, target),
      ...moved.map((p) => ({ ...p, section })),
      ...rest.slice(target),
    ],
  });
}
export function deletePages(plan: VisualPlan, ids: string[]): VisualPlan {
  const set = new Set(ids);
  return checked({ ...plan, pages: plan.pages.filter((p) => !set.has(p.id)) });
}
export function rotatePages(plan: VisualPlan, ids: string[]): VisualPlan {
  const set = new Set(ids);
  return checked({
    ...plan,
    pages: plan.pages.map((p) =>
      set.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
    ),
  });
}
export function duplicatePages(
  plan: VisualPlan,
  ids: string[],
  makeId: () => string = () => crypto.randomUUID(),
): VisualPlan {
  const set = new Set(ids);
  return checked({
    ...plan,
    pages: plan.pages.flatMap((p) =>
      set.has(p.id)
        ? [p, { ...p, id: makeId(), overrides: { ...p.overrides } }]
        : [p],
    ),
  });
}
export function insertBlank(
  plan: VisualPlan,
  after: string | null,
  makeId: () => string = () => crypto.randomUUID(),
): VisualPlan {
  const at = after
    ? plan.pages.findIndex((p) => p.id === after) + 1
    : plan.pages.length;
  const page: VisualPage = {
    id: makeId(),
    source: null,
    rotation: 0,
    section: plan.pages[Math.max(0, at - 1)]?.section || "Main",
    overrides: {},
  };
  return checked({
    ...plan,
    pages: [...plan.pages.slice(0, at), page, ...plan.pages.slice(at)],
  });
}
export function moveSection(
  plan: VisualPlan,
  ids: string[],
  section: string,
): VisualPlan {
  if (/[^\x20-\x7e]/.test(section))
    throw new Error("Use basic Latin section labels.");
  section = section.trim();
  const set = new Set(ids),
    selected = plan.pages
      .filter((p) => set.has(p.id))
      .map((p) => ({ ...p, section }));
  if (!selected.length)
    throw new Error("Select pages to move between editor sections.");
  const rest = plan.pages.filter((p) => !set.has(p.id));
  let at = rest.length;
  for (let i = rest.length - 1; i >= 0; i--)
    if (rest[i].section === section) {
      at = i + 1;
      break;
    }
  return checked({
    ...plan,
    pages: [...rest.slice(0, at), ...selected, ...rest.slice(at)],
  });
}
export function patchPages(
  plan: VisualPlan,
  ids: string[],
  patch: PageOverrides,
): VisualPlan {
  const set = new Set(ids);
  return checked({
    ...plan,
    pages: plan.pages.map((p) =>
      set.has(p.id) ? { ...p, overrides: { ...p.overrides, ...patch } } : p,
    ),
  });
}
