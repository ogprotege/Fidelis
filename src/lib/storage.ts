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

/** Liturgical calendar region: the GRC as such, or with the U.S. transfers
 *  (Epiphany to the Sunday of Jan 2–8, Ascension to the Seventh Sunday of
 *  Easter) and the U.S. proper memorials. */
export type CalendarRegion = "universal" | "usa";

export interface Settings {
  translation: string;
  parallel: string | null;
  fontSize: number; // px
  theme: "parchment" | "night";
  showVerseNumbers: boolean;
  calendarRegion: CalendarRegion;
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
    calendarRegion: "universal",
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

/** Everything a user creates in the app, as a backup document (P2-6). */
export interface MarginaliaExport {
  app: "fidelis";
  version: 1;
  exportedAt: string;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  notes: Note[];
}

export function exportMarginalia(): MarginaliaExport {
  return {
    app: "fidelis",
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: getBookmarks(),
    highlights: getHighlights(),
    notes: getNotes()
  };
}

const isRef = (x: unknown): x is VerseRef =>
  !!x &&
  typeof (x as VerseRef).book === "string" &&
  Number.isInteger((x as VerseRef).chapter) &&
  Number.isInteger((x as VerseRef).verse);

/**
 * Merge a Fidelis library export into local storage. On a same-verse
 * conflict the NEWER entry wins (by its own timestamp), so restoring an old
 * backup can never silently destroy a fresher local note. Returns how many
 * valid entries the file contributed. Throws on files that are not a
 * Fidelis export at all.
 */
export function importMarginalia(raw: string): {
  bookmarks: number;
  highlights: number;
  notes: number;
} {
  let d: Partial<MarginaliaExport>;
  try {
    d = JSON.parse(raw) as Partial<MarginaliaExport>;
  } catch {
    throw new Error("Not a Fidelis library export.");
  }
  if (
    d.app !== "fidelis" ||
    !Array.isArray(d.bookmarks) ||
    !Array.isArray(d.highlights) ||
    !Array.isArray(d.notes)
  ) {
    throw new Error("Not a Fidelis library export.");
  }
  const merge = <T extends VerseRef>(
    current: T[],
    incoming: T[],
    ts: (x: T) => number
  ): T[] => {
    const byKey = new Map(current.map((c) => [refKey(c), c]));
    for (const inc of incoming) {
      const k = refKey(inc);
      const cur = byKey.get(k);
      byKey.set(k, !cur || ts(inc) >= ts(cur) ? inc : cur);
    }
    return [...byKey.values()];
  };
  const bookmarks = d.bookmarks
    .filter(isRef)
    .filter((b) => typeof (b as Bookmark).translation === "string")
    .map((b) => ({ ...(b as Bookmark), createdAt: Number((b as Bookmark).createdAt) || Date.now() }));
  const colors: HighlightColor[] = ["gold", "rose", "sky", "olive"];
  const highlights = d.highlights
    .filter(isRef)
    .filter((h) => colors.includes((h as Highlight).color))
    .map((h) => ({ ...(h as Highlight), createdAt: Number((h as Highlight).createdAt) || Date.now() }));
  const notes = d.notes
    .filter(isRef)
    .filter((n) => typeof (n as Note).text === "string" && (n as Note).text.trim().length > 0)
    .map((n) => ({ ...(n as Note), updatedAt: Number((n as Note).updatedAt) || Date.now() }));
  write("bookmarks", merge(getBookmarks(), bookmarks, (b) => b.createdAt));
  write("highlights", merge(getHighlights(), highlights, (h) => h.createdAt));
  write("notes", merge(getNotes(), notes, (n) => n.updatedAt));
  return { bookmarks: bookmarks.length, highlights: highlights.length, notes: notes.length };
}
