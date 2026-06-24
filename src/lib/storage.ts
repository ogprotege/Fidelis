/** Local persistence for settings, bookmarks, highlights, notes, and reading position. */

import {
  DEFAULT_FONT_SIZE,
  DEFAULT_SCRIPTURE_FONT,
  ScriptureFont,
  isScriptureFont
} from "./typography";
import { DEFAULT_THEME, ThemeChoice, isThemeChoice } from "./theme";
import type { ReadingState } from "./reading";
import type { ReadingPlan } from "./plans";

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
  fontSize: number; // px — one of the §1.4 presets, or any value the Reader stepper lands on
  /** Scripture reading face (spec §1.4): Garamond, Georgia, Times New Roman, or Sans-serif. */
  scriptureFont: ScriptureFont;
  /** Appearance (spec §2.2): System follows the OS; Day/Night pin the palette. */
  theme: ThemeChoice;
  showVerseNumbers: boolean;
  calendarRegion: CalendarRegion;
  /** Tint the act accent (--purple) with the day's liturgical color (spec §1.3). */
  followLiturgicalYear: boolean;
  /** Show the §6.1 reading-time indulgence line in the Reader. */
  showIndulgence: boolean;
  /** Commentary layer (spec §4.2 / §2.2 item 7). The master switch — off hides
   *  the gold dots and the Commentary action entirely (the bare page). */
  commentaryEnabled: boolean;
  /** Include Haydock — drives the gold dots and the Haydock tab. Off also hides
   *  the dots (they mark Haydock notes). */
  commentaryHaydock: boolean;
  /** Include the Catena Aurea — the Catena tab and the Gospel Commentary action. */
  commentaryCatena: boolean;
  /** Seed the Catena tab's Doctors-only filter on (default off). */
  commentaryDoctorsOnly: boolean;
  /** Magisterium layer (spec §5): show the CCC paragraph links in the verse
   *  actions. Off ⇒ no CCC row anywhere. Links open vatican.va. */
  cccLinksEnabled: boolean;
  /** Preferred translation for the Mass / Daily-Readings surfaces. Defaults to
   *  the NABRE — the translation of the U.S. lectionary — so the Daily Readings
   *  prefer it out of the box. "" = auto (match the calendar region: the NABRE
   *  for the USA region, otherwise the general reading translation). The NABRE is
   *  import-only (it is under copyright and never bundled), so when it is the
   *  preference but not yet imported the readings fall back to a bundled
   *  public-domain text (the Douay-Rheims). */
  massTranslation: string;
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
  const settings: Settings = {
    translation: "drc",
    parallel: null,
    fontSize: DEFAULT_FONT_SIZE,
    scriptureFont: DEFAULT_SCRIPTURE_FONT,
    theme: DEFAULT_THEME,
    showVerseNumbers: true,
    // Default to the U.S. (USCCB) calendar so the liturgical day and the Daily
    // Readings stay consistent with the NABRE U.S. lectionary default below
    // (Epiphany on the Sunday of Jan 2–8, Ascension on the Seventh Sunday of
    // Easter, and the U.S. proper memorials). A user can switch to Universal in
    // Settings → Calendar.
    calendarRegion: "usa",
    followLiturgicalYear: true,
    showIndulgence: true,
    commentaryEnabled: true,
    commentaryHaydock: true,
    commentaryCatena: true,
    commentaryDoctorsOnly: false,
    cccLinksEnabled: true,
    // The Daily Readings default to the NABRE — the translation of the U.S.
    // lectionary. It is under copyright and never bundled, so until the user
    // imports a licensed copy the readings fall back to the bundled Douay-Rheims
    // (ReadingText handles the fallback and shows the import pointer).
    massTranslation: "nabre",
    ...read<Partial<Settings>>("settings", {})
  };
  // The light theme was renamed "parchment" → "day" (spec §1.1). Map a stored
  // legacy choice forward so an existing user keeps their light/dark selection.
  if ((settings.theme as string) === "parchment") settings.theme = "day";
  // Guard the stored theme against corruption or a pre-§2.2 build's vocabulary
  // so an unknown value can never strand the app on an undefined palette. A
  // genuine prior "day"/"night" survives; anything else falls back to System.
  if (!isThemeChoice(settings.theme)) settings.theme = DEFAULT_THEME;
  // Guard a stored font against corruption or a future build's vocabulary so an
  // unknown value can never strand the reader on an undefined face (spec §1.4).
  if (!isScriptureFont(settings.scriptureFont)) settings.scriptureFont = DEFAULT_SCRIPTURE_FONT;
  return settings;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write("settings", next);
  return next;
}

/** The translation the Mass / Daily-Readings surfaces should use. An explicit
 *  `massTranslation` wins; otherwise it is the NABRE for the USA region (the
 *  translation of the U.S. lectionary) and the general reading translation
 *  elsewhere. Pure — the caller handles the import-not-present fallback. */
export function massTranslationFor(s: Settings): string {
  if (s.massTranslation) return s.massTranslation;
  return s.calendarRegion === "usa" ? "nabre" : s.translation;
}

/** Which bundled translations the user has explicitly saved for offline
 *  reading (spec §2.2 Data). The service-worker data cache is the real source
 *  of truth for offline availability; this is the lightweight UI record of
 *  which downloads the user has run, so the Settings cards can show a ✓. */
export function getOfflineTranslations(): string[] {
  return read<string[]>("offline", []);
}

export function markOfflineTranslation(id: string): void {
  const set = new Set(getOfflineTranslations());
  set.add(id);
  write("offline", [...set]);
}

export function getLastRead(): LastRead | null {
  return read<LastRead | null>("lastRead", null);
}

export function saveLastRead(pos: LastRead): void {
  write("lastRead", pos);
}

/** The §6.1 reading-time accumulator state (frequently mutated; kept out of
 *  Settings, like LastRead). */
export function getReading(): ReadingState | null {
  return read<ReadingState | null>("reading", null);
}

export function saveReading(state: ReadingState): void {
  write("reading", state);
}

export function getPlans(): ReadingPlan[] {
  return read<ReadingPlan[]>("plans", []);
}

function planId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function addPlan(p: Omit<ReadingPlan, "id" | "startedAt" | "completedThrough">): ReadingPlan {
  const plan: ReadingPlan = { ...p, id: planId(), startedAt: Date.now(), completedThrough: 0 };
  const list = getPlans();
  list.unshift(plan);
  write("plans", list);
  return plan;
}

export function updatePlan(plan: ReadingPlan): void {
  const list = getPlans();
  const i = list.findIndex((x) => x.id === plan.id);
  if (i >= 0) {
    list[i] = plan;
    write("plans", list);
  }
}

export function deletePlan(id: string): void {
  write("plans", getPlans().filter((x) => x.id !== id));
}

/** The plan surfaced everywhere: the most-recently-started incomplete one. */
export function activePlan(): ReadingPlan | null {
  const open = getPlans().filter((p) => p.completedThrough < p.chapters.length);
  if (!open.length) return null;
  return open.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
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
