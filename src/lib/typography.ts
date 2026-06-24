/** Scripture typography options (spec §1.4): the reading face and its size.
 *
 *  Three faces, no more — "three is a choice; ten is a chore." The chosen face
 *  drives the `--scripture` custom property (styles.css maps it from
 *  `<html data-font>`); the chosen size is written verbatim as a pixel value.
 *  Both the Settings pills and the Reader's A−/A+ stepper write the same
 *  `fontSize` setting, the stepper as a fine adjustment between presets. */

export type ScriptureFont = "garamond" | "georgia" | "times" | "sans";

export interface FontOption {
  id: ScriptureFont;
  label: string;
  /** The CSS custom property this face resolves to (see styles.css). */
  cssVar: string;
}

/** In selection order, chosen so each is visibly distinct (the old "System
 *  serif" resolved to Iowan Old Style, which looks almost identical to EB
 *  Garamond, so switching seemed to do nothing). EB Garamond is the default and
 *  the only bundled face — light and elegant; Georgia is sturdy with a large
 *  x-height; Times New Roman is the classic, sharper book serif; and Sans-serif
 *  is the platform's sans. The rest borrow the device's own fonts. */
export const SCRIPTURE_FONTS: readonly FontOption[] = [
  { id: "garamond", label: "Garamond", cssVar: "--garamond" },
  { id: "georgia", label: "Georgia", cssVar: "--georgia" },
  { id: "times", label: "Times New Roman", cssVar: "--times" },
  { id: "sans", label: "Sans-serif", cssVar: "--sans" }
];

export const DEFAULT_SCRIPTURE_FONT: ScriptureFont = "garamond";

export function isScriptureFont(x: unknown): x is ScriptureFont {
  return x === "garamond" || x === "georgia" || x === "times" || x === "sans";
}

export interface SizePreset {
  label: string;
  /** Reading text size in CSS pixels. */
  px: number;
}

/** Four presets, Catena-style. Medium (19) is the default. */
export const FONT_SIZE_PRESETS: readonly SizePreset[] = [
  { label: "Small", px: 17 },
  { label: "Medium", px: 19 },
  { label: "Large", px: 22 },
  { label: "X-Large", px: 25 }
];

export const DEFAULT_FONT_SIZE = 19;

/** Bounds for the Reader's fine-adjustment stepper. It ranges a little past
 *  the preset extremes on either side so "fine adjustment" stays meaningful. */
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 28;

export const clampFontSize = (px: number): number =>
  Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(px)));
