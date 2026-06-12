/**
 * Quote of the Day (design spec §3) — a curated corpus of quotations from the
 * Fathers, Doctors, and saints, every one carrying its full source locus and
 * public-domain translation credit. Selection is deterministic: every user
 * sees the same quote on the same day, and the cycle never shifts beneath
 * them (the VOTD philosophy extended).
 *
 * Resolution order (spec §3.2):
 *   1. Sanctoral match — on an author's feast, when the day's calendar
 *      actually celebrates them, that author speaks.
 *   2. Seasonal pool — Advent, Christmastide, Lent, and Eastertide draw from
 *      season-tagged quotes.
 *   3. General cycle — the same index arithmetic as the VOTD, over the
 *      season-untagged remainder.
 */
import { LiturgicalDay, Season } from "./liturgical";
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

export function quoteOfTheDay(
  quotes: DailyQuote[],
  date: Date,
  lit: LiturgicalDay
): DailyQuote | null {
  if (!quotes.length) return null;
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const idx = dayOfYear(date) + date.getFullYear();

  // 1. sanctoral: the feast's own author speaks, but only when the resolved
  //    calendar actually observes the celebration (a transferred or suppressed
  //    feast does not trigger its quote).
  const sanctoral = quotes.filter((q) => q.feast === mmdd && celebratesAuthor(q.author, lit));
  if (sanctoral.length) return sanctoral[idx % sanctoral.length];

  // 2. seasonal pool
  const pool = SEASON_POOL[lit.season];
  if (pool) {
    const seasonal = quotes.filter((q) => q.season === pool);
    if (seasonal.length) return seasonal[idx % seasonal.length];
  }

  // 3. general cycle over the season-untagged remainder
  const general = quotes.filter((q) => q.season === null);
  return general.length ? general[idx % general.length] : quotes[idx % quotes.length];
}
