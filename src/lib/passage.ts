import { BookData } from "./data";

/**
 * The verbatim text of a verse range from a loaded book, exactly as the Reader
 * renders it: grid-empty slots (see data-report.txt, P1-4) are dropped, the
 * rest joined by a single space. `end` is inclusive and clamped to the chapter
 * length, so a translation with a shorter chapter renders to its last verse
 * rather than erroring. Single source of truth for VerseQuote, the rosary
 * mystery sheet, and the harness — so the sheet can never drift from the Reader.
 */
export function passageText(
  data: BookData,
  chapter: number,
  verse: number,
  end?: number
): string {
  const ch = data.chapters[chapter - 1] ?? [];
  const last = Math.min(end ?? verse, ch.length);
  return ch.slice(verse - 1, last).filter((s) => s && s.trim()).join(" ");
}
