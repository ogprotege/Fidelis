/**
 * Spec §5 — the CCC citation index, the pure (tested) heart of the Reader's
 * "Scripture-to-Magisterium" links. The facts live in public/data/ccc/index.json
 * (verse → CCC paragraph numbers) and url.json (paragraph → vatican.va page),
 * loaded by loadCCC() in data.ts. No Catechism text is ever bundled — only the
 * citation facts and the public URLs.
 *
 * Index keys are the app's "<slug> <chapter>:<verse>" form (Vulgate-versified for
 * Psalms, mapped at build time via hebrewSpanToVulgate). Caveat: a verse a
 * translation leaves grid-empty simply has no citation row.
 */

export type CCCIndex = Record<string, number[]>;
export type CCCUrls = Record<string, string>;

/** The index key for a verse — mirrors scripts/build-ccc.mjs. */
export function cccKey(book: string, chapter: number, verse: number): string {
  return `${book} ${chapter}:${verse}`;
}

/** The CCC paragraphs that cite a verse, in ascending order, or [] if none. */
export function cccParagraphs(
  index: CCCIndex,
  book: string,
  chapter: number,
  verse: number
): number[] {
  return index[cccKey(book, chapter, verse)] ?? [];
}

/** Whether a verse is cited at all in the Catechism — drives the quiet at-rest
 *  marker the Reader paints in the verse-number gutter so a reader can see a
 *  citation exists before tapping (spec §5; cheap, called per rendered verse). */
export function isCited(
  index: CCCIndex,
  book: string,
  chapter: number,
  verse: number
): boolean {
  return (index[cccKey(book, chapter, verse)]?.length ?? 0) > 0;
}

/** Soft cap (spec §4.2/§5): show the first few, collapse the rest behind "+N more". */
export const CCC_SOFT_CAP = 8;

export function capParagraphs(
  paras: number[],
  cap = CCC_SOFT_CAP
): { shown: number[]; more: number } {
  if (paras.length <= cap) return { shown: paras, more: 0 };
  return { shown: paras.slice(0, cap), more: paras.length - cap };
}
