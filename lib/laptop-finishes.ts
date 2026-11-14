import type { CSSProperties } from "react";
import { tools } from "@/lib/catalog";
import { toolTheme } from "@/lib/tool-theme";

const firstSlugs = [
  "image-compressor",
  "merge-pdf",
  "images-to-pdf",
  "compress-pdf",
  "split-pdf",
  "qr-code-scanner",
];
const orderedTools = [
  ...firstSlugs.map((slug) => tools.find((tool) => tool.slug === slug)!),
  ...tools.filter((tool) => !firstSlugs.includes(tool.slug)),
];
export const LAPTOP_FINISHES = orderedTools.map((tool) => ({
  name: tool.name,
  rgb: toolTheme(tool.slug, tool.category).rgb,
  deep: toolTheme(tool.slug, tool.category).deep,
}));
export const LAPTOP_HOLD_MS = 30000;
export const LAPTOP_FADE_MS = 10000;
export const LAPTOP_CYCLE_MS = LAPTOP_HOLD_MS + LAPTOP_FADE_MS;

/** One deterministic initial palette for the server shell and client controls. */
export function laptopFinishStyle(
  index = 0,
  changing = false,
  running = false,
): CSSProperties {
  const current = LAPTOP_FINISHES[index];
  const next = LAPTOP_FINISHES[(index + 1) % LAPTOP_FINISHES.length];
  const active = changing ? next : current;
  return {
    "--finish-rgb": active.rgb,
    "--finish-deep": active.deep,
    "--finish-from": `rgb(${current.rgb})`,
    "--finish-to": `rgb(${next.rgb})`,
    "--finish-play-state": running ? "running" : "paused",
    "--finish-fade-duration": `${LAPTOP_FADE_MS}ms`,
  } as CSSProperties;
}
