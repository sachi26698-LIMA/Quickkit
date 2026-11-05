/**
 * QUICKKIT brand palette + the colour presets shown in the Design card.
 *
 * Phase I retuned the six quick presets so every one is drawn from the exact
 * brand colours and clears the "strong" contrast bar (GOOD_CONTRAST, 4.5:1) —
 * applying a preset never produces a contrast warning. Rose Pink and Coral are
 * mid-tones that cannot reach 4.5:1 on a light field, so they are paired with
 * Midnight (light-on-dark) where they scan cleanly; the four plum/midnight
 * presets stay dark-on-light for the premium light theme. The brand-swatch row
 * (added in Phase D) is kept alongside for tinted and gradient variations.
 */

/** The five official brand colours (lowercase hex). */
export const BRAND_COLORS = {
  deepPlum: "#3b1b4f",
  rosePink: "#d6598f",
  coral: "#ff6b6b",
  midnight: "#1a0f2e",
  softBlush: "#f4d7d4",
} as const;

export type PaletteSwatch = {
  name: string;
  fg: string;
  bg: string;
  /** Optional second stop — turns the foreground into a linear gradient. */
  accent?: string;
};

/**
 * Six quick presets. Every fg/bg is an exact brand colour (or white), and every
 * pair is >= 4.5:1 so the safety audit reports "strong" with no adjustment.
 */
export const PRESET_SWATCHES: PaletteSwatch[] = [
  { name: "Deep Plum", fg: "#3b1b4f", bg: "#ffffff" }, // 14.43:1
  { name: "Midnight", fg: "#1a0f2e", bg: "#ffffff" }, // 18.23:1
  { name: "Plum on blush", fg: "#3b1b4f", bg: "#f4d7d4" }, // 10.66:1
  { name: "Midnight on blush", fg: "#1a0f2e", bg: "#f4d7d4" }, // 13.47:1
  { name: "Rose on midnight", fg: "#d6598f", bg: "#1a0f2e" }, // 4.94:1
  { name: "Coral on midnight", fg: "#ff6b6b", bg: "#1a0f2e" }, // 6.57:1
];

/** Brand-tinted and gradient variations (Phase D). */
export const BRAND_SWATCHES: PaletteSwatch[] = [
  { name: "Deep Plum", fg: "#3b1b4f", bg: "#ffffff" },
  { name: "Rose on blush", fg: "#d6598f", bg: "#fdf3f6" },
  { name: "Coral on cream", fg: "#ff6b6b", bg: "#fff7f2" },
  { name: "Midnight", fg: "#1a0f2e", bg: "#f4d7d4" },
  { name: "Plum → rose", fg: "#3b1b4f", bg: "#ffffff", accent: "#d6598f" },
];
