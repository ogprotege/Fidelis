/**
 * Quote of the Day (design spec §3) — a curated corpus of quotations from the
 * Fathers, Doctors, and saints, every one carrying its full source locus and
 * public-domain translation credit.
 *
 * Selection is deterministic per (date, region) but no longer a fixed cycle:
 * each calendar year is assigned a fresh, seeded random permutation, so a quote
 * NEVER repeats within the same calendar year (the corpus is larger than 366)
 * and the order differs year to year. Feast days still speak first, and the
 * liturgical seasons still draw their own quotes — those picks are removed from
 * that year's random pool so nothing shows twice. Because it stays a pure
 * function of (date, region, corpus), the home-screen widgets — which read the
 * pre-resolved calendar.json built from this same function — match bit for bit.
 *
 * Resolution order, computed once per calendar year (spec §3.2, revised):
 *   1. Sanctoral — on a day whose calendar actually celebrates an author we
 *      quote (matched by feast date + name), that author speaks.
 *   2. Seasonal — Advent, Christmastide, Lent, Eastertide draw season-tagged
 *      quotes on their days.
 *   3. Random — every remaining day takes the next entry of a seeded shuffle of
 *      all still-unused quotes. No repeats within the calendar year.
 */
import { LiturgicalDay, Season, CalendarRegion } from "./liturgical";
import { dayOfYear } from "./votd";

export interface DailyQuote {
  id: string;
  text: string;
  author: string;
  authorTitle: string;
  work: string;
  locus: string;
  sourceEdition: string;
  feast: string | null; // "MM-DD"
  season: "advent" | "christmastide" | "lent" | "eastertide" | null;
  tags: string[];
  /** Checked against a printed copy of the named edition (spec §3.4). */
  verified?: boolean;
}

let cache: Promise<DailyQuote[]> | null = null;
export function loadQuotes(): Promise<DailyQuote[]> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/quotes.json`).then(async (r) => {
    if (!r.ok) throw new Error(`quotes data: HTTP ${r.status}`);
    return (await r.json()).quotes as DailyQuote[];
  });
  return cache;
}

const SEASON_POOL: Partial<Record<Season, DailyQuote["season"]>> = {
  Advent: "advent",
  Christmastide: "christmastide",
  Lent: "lent",
  Eastertide: "eastertide"
};

/** Does any of the day's celebrations name this author? Matched on the
 *  author's distinctive tokens so "St. Augustine of Hippo" meets
 *  "St. Augustine, Bishop and Doctor" but not "St. Augustine of Canterbury"
 *  (the feast date already disambiguates those). */
function celebratesAuthor(author: string, lit: LiturgicalDay): boolean {
  const STOP = new Set([
    "st", "saint", "pope", "the", "of", "and", "de", "la", "great", "venerable", "attributed"
  ]);
  const tokens = author
    .toLowerCase()
    .replace(/[().,]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  return lit.celebrations.some((c) => {
    const name = c.name.toLowerCase();
    return tokens.some((t) => name.includes(t));
  });
}

// ── Deterministic helpers for the per-year assignment ───────────────────────

/** mulberry32 — a tiny deterministic PRNG. Same seed → same sequence on every
 *  platform, so the web app and the widget build agree bit for bit. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInYear(y: number): number {
  return isLeapYear(y) ? 366 : 365;
}
/** Local-time Date for the n-th day (1-based) of `year`. */
function dateOfYearDay(year: number, n: number): Date {
  return new Date(year, 0, n);
}
function mmddOf(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The whole year's day→quote-index assignment: sanctoral, then seasonal, then a
 * seeded random fill of the remainder. Every index is used at most once, so no
 * quote repeats within the calendar year — provided the corpus has at least as
 * many entries as the year has days (the corpus does; if it ever shrinks below
 * that, the random fill wraps and only then can a quote recur in-year).
 *
 * `assign[d]` is the quote index for day-of-year `d + 1` (1-based).
 */
export function buildYearAssignment(
  quotes: DailyQuote[],
  year: number,
  litFor: (d: Date) => LiturgicalDay
): number[] {
  const days = daysInYear(year);
  const assign: number[] = new Array(days).fill(-1);
  const used = new Set<number>();
  const rng = mulberry32(Math.imul(year, 2654435761));

  const lits: LiturgicalDay[] = [];
  const mmdds: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = dateOfYearDay(year, i + 1);
    lits.push(litFor(date));
    mmdds.push(mmddOf(date));
  }

  // 1. Sanctoral — the feast's own author, only when the calendar observes it.
  for (let i = 0; i < days; i++) {
    const cands: number[] = [];
    for (let q = 0; q < quotes.length; q++) {
      if (used.has(q)) continue;
      if (quotes[q].feast === mmdds[i] && celebratesAuthor(quotes[q].author, lits[i])) cands.push(q);
    }
    if (cands.length) {
      const pick = cands[Math.floor(rng() * cands.length)];
      assign[i] = pick;
      used.add(pick);
    }
  }

  // 2. Seasonal pool — season-tagged quotes on their season's days.
  for (let i = 0; i < days; i++) {
    if (assign[i] !== -1) continue;
    const pool = SEASON_POOL[lits[i].season];
    if (!pool) continue;
    const cands: number[] = [];
    for (let q = 0; q < quotes.length; q++) {
      if (!used.has(q) && quotes[q].season === pool) cands.push(q);
    }
    if (cands.length) {
      const pick = cands[Math.floor(rng() * cands.length)];
      assign[i] = pick;
      used.add(pick);
    }
  }

  // 3. Random fill — a seeded Fisher–Yates over the still-unused indices.
  const remaining: number[] = [];
  for (let q = 0; q < quotes.length; q++) if (!used.has(q)) remaining.push(q);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = remaining[i];
    remaining[i] = remaining[j];
    remaining[j] = t;
  }
  let r = 0;
  for (let i = 0; i < days; i++) {
    if (assign[i] === -1) assign[i] = remaining.length ? remaining[r++ % remaining.length] : 0;
  }
  return assign;
}

// Per-(region, year, corpus-size) cache — the assignment is pure, so this just
// avoids rebuilding the 365-day plan on every render.
const yearCache = new Map<string, number[]>();

/**
 * The quote for `date`, deterministic per (date, region). `litFor` supplies the
 * liturgical day for any date of the year (inject the engine, e.g.
 * `(d) => liturgicalDay(d, region)`); `region` only keys the per-year cache.
 */
export function quoteOfTheDay(
  quotes: DailyQuote[],
  date: Date,
  litFor: (d: Date) => LiturgicalDay,
  region: CalendarRegion
): DailyQuote | null {
  if (!quotes.length) return null;
  const year = date.getFullYear();
  const key = `${region}:${year}:${quotes.length}`;
  let assign = yearCache.get(key);
  if (!assign) {
    assign = buildYearAssignment(quotes, year, litFor);
    yearCache.set(key, assign);
  }
  const i = (dayOfYear(date) - 1) % assign.length;
  return quotes[assign[i]] ?? null;
}
