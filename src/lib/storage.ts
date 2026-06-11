/** Local persistence for settings, bookmarks, highlights, notes, and reading position. */

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface Bookmark extends VerseRef {
  translation: string;
  createdAt: number;
}

export type HighlightColor = "gold" | "rose" | "sky" | "olive";

export interface Highlight extends VerseRef {
  color: HighlightColor;
  createdAt: number;
}

export interface Note extends VerseRef {
  text: string;
  updatedAt: number;
}

export interface LastRead {
  translation: string;
  book: string;
  chapter: number;
}

export interface Settings {
  translation: string;
  parallel: string | null;
  fontSize: number; // px
  theme: "parchment" | "night";
  showVerseNumbers: boolean;
}

const PREFIX = "fidelis:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

export const refKey = (r: VerseRef) => `${r.book}/${r.chapter}/${r.verse}`;

export function getSettings(): Settings {
  return {
    translation: "drc",
    parallel: null,
    fontSize: 19,
    theme: "parchment",
    showVerseNumbers: true,
    ...read<Partial<Settings>>("settings", {})
  };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write("settings", next);
  return next;
}

export function getLastRead(): LastRead | null {
  return read<LastRead | null>("lastRead", null);
}

export function saveLastRead(pos: LastRead): void {
  write("lastRead", pos);
}

export function getBookmarks(): Bookmark[] {
  return read<Bookmark[]>("bookmarks", []);
}

export function toggleBookmark(bm: Omit<Bookmark, "createdAt">): boolean {
  const list = getBookmarks();
  const i = list.findIndex((x) => refKey(x) === refKey(bm));
  if (i >= 0) {
    list.splice(i, 1);
    write("bookmarks", list);
    return false;
  }
  list.unshift({ ...bm, createdAt: Date.now() });
  write("bookmarks", list);
  return true;
}

export function getHighlights(): Highlight[] {
  return read<Highlight[]>("highlights", []);
}

export function setHighlight(ref: VerseRef, color: HighlightColor | null): void {
  const list = getHighlights().filter((x) => refKey(x) !== refKey(ref));
  if (color) list.unshift({ ...ref, color, createdAt: Date.now() });
  write("highlights", list);
}

export function getNotes(): Note[] {
  return read<Note[]>("notes", []);
}

export function setNote(ref: VerseRef, text: string): void {
  const list = getNotes().filter((x) => refKey(x) !== refKey(ref));
  if (text.trim()) list.unshift({ ...ref, text, updatedAt: Date.now() });
  write("notes", list);
}

export function getNote(ref: VerseRef): Note | undefined {
  return getNotes().find((x) => refKey(x) === refKey(ref));
}
