import { BOOKS, getBook, bookDisplayName, NT_GROUPS } from "./canon";

/** A reading plan: a list of chapter references and a divisor (spec §7). */
export interface ReadingPlan {
  id: string;
  name: string;
  chapters: string[];       // ["genesis/1", ...] ordered
  perDay: number;
  startedAt: number;
  completedThrough: number; // index into chapters
}

export interface PlanPreset {
  id: string;
  name: string;
  build: () => { chapters: string[]; perDay: number };
}

/** A chapter is "long" (a Tuesday-ruiner) at or above this verse count. */
export const LONG_VERSES = 80;
const CANON_PER_DAY = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chapters of the given books, flattened in canonical order. */
export function chaptersForBooks(slugs: string[]): string[] {
  const set = new Set(slugs);
  const out: string[] = [];
  for (const b of BOOKS) {
    if (!set.has(b.slug)) continue;
    for (let c = 1; c <= b.chapters; c++) out.push(`${b.slug}/${c}`);
  }
  return out;
}

/** Verse count of a "slug/ch" reference from the real canon metadata. */
export function versesOf(ref: string): number {
  const [slug, c] = ref.split("/");
  return getBook(slug)?.verses[Number(c) - 1] ?? 0;
}

export function paceForDays(total: number, days: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, days)));
}

export function targetDateToPerDay(total: number, startMs: number, targetMs: number): number {
  const days = Math.max(1, Math.ceil((targetMs - startMs) / DAY_MS));
  return paceForDays(total, days);
}

export function todayPortion(plan: ReadingPlan): string[] {
  return plan.chapters.slice(plan.completedThrough, plan.completedThrough + plan.perDay);
}

export function markPortionRead(plan: ReadingPlan): ReadingPlan {
  return {
    ...plan,
    completedThrough: Math.min(plan.completedThrough + plan.perDay, plan.chapters.length)
  };
}

export function planDay(plan: ReadingPlan): number {
  return Math.floor(plan.completedThrough / plan.perDay) + 1;
}

export function planTotalDays(plan: ReadingPlan): number {
  return Math.ceil(plan.chapters.length / plan.perDay);
}

export function isComplete(plan: ReadingPlan): boolean {
  return plan.completedThrough >= plan.chapters.length;
}

/** "Genesis 3–4 · Psalms 7" — consecutive same-book chapters collapse to a range. */
export function formatPortion(portion: string[], translation: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < portion.length) {
    const [slug, chStr] = portion[i].split("/");
    const startCh = Number(chStr);
    let j = i;
    while (
      j + 1 < portion.length &&
      portion[j + 1].split("/")[0] === slug &&
      Number(portion[j + 1].split("/")[1]) === Number(portion[j].split("/")[1]) + 1
    ) {
      j++;
    }
    const book = getBook(slug);
    const name = book ? bookDisplayName(book, translation) : slug;
    const endCh = Number(portion[j].split("/")[1]);
    parts.push(endCh > startCh ? `${name} ${startCh}–${endCh}` : `${name} ${startCh}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

/** Distribute b uniformly through a (Bresenham), keeping each stream's order. */
function interleaveEven(a: string[], b: string[]): string[] {
  const total = a.length + b.length;
  const out: string[] = [];
  let ai = 0, bi = 0, acc = 0;
  for (let i = 0; i < total; i++) {
    acc += b.length;
    if (acc >= total && bi < b.length) {
      acc -= total;
      out.push(b[bi++]);
    } else if (ai < a.length) {
      out.push(a[ai++]);
    } else if (bi < b.length) {
      out.push(b[bi++]);
    }
  }
  return out;
}

/** Ensure no day (chunk of perDay) holds two long chapters; move the extra to a
 *  long-free day, swapping in a short chapter. Deterministic. */
function declusterLong(seq: string[], perDay: number): string[] {
  const out = seq.slice();
  const long = (i: number) => versesOf(out[i]) >= LONG_VERSES;
  const nDays = Math.ceil(out.length / perDay);
  const end = (d: number) => Math.min((d + 1) * perDay, out.length);
  const dayLongCount = (d: number) => {
    let n = 0;
    for (let k = d * perDay; k < end(d); k++) if (long(k)) n++;
    return n;
  };
  for (let d = 0; d < nDays; d++) {
    while (dayLongCount(d) > 1) {
      let from = -1;
      for (let k = d * perDay; k < end(d); k++) if (long(k)) from = k; // the last long
      let to = -1;
      for (let e = 0; e < nDays && to < 0; e++) {
        if (e === d || dayLongCount(e) > 0) continue;
        for (let k = e * perDay; k < end(e); k++) if (!long(k)) { to = k; break; }
      }
      if (to < 0) break;
      const tmp = out[from]; out[from] = out[to]; out[to] = tmp;
    }
  }
  return out;
}

/** The Whole Canon, weighted: psalms spread through the year, long chapters never
 *  paired, so Psalm 118 gets a near-solo day. A permutation of the 73-book canon. */
export function weightedCanon(): string[] {
  const rest: string[] = [];
  const pss: string[] = [];
  for (const b of BOOKS) {
    if (b.appendix) continue;
    for (let c = 1; c <= b.chapters; c++) {
      const ref = `${b.slug}/${c}`;
      (b.slug === "psalms" ? pss : rest).push(ref);
    }
  }
  return declusterLong(interleaveEven(rest, pss), CANON_PER_DAY);
}

const GOSPEL_SLUGS = ["matthew", "mark", "luke", "john"];

export const PRESETS: PlanPreset[] = [
  {
    id: "gospels",
    name: "The Four Gospels in 90 Days",
    build: () => {
      const chapters = chaptersForBooks(GOSPEL_SLUGS);
      return { chapters, perDay: paceForDays(chapters.length, 90) };
    }
  },
  {
    id: "deuterocanon",
    name: "The Deuterocanon in 30 Days",
    build: () => {
      const chapters = chaptersForBooks(BOOKS.filter((b) => b.deutero).map((b) => b.slug));
      return { chapters, perDay: paceForDays(chapters.length, 30) };
    }
  },
  {
    id: "psalter",
    name: "The Psalter in a Month",
    build: () => {
      const chapters = chaptersForBooks(["psalms"]);
      return { chapters, perDay: paceForDays(chapters.length, 30) };
    }
  },
  {
    id: "nt",
    name: "The New Testament in a Year",
    build: () => {
      const chapters = chaptersForBooks(
        BOOKS.filter((b) => NT_GROUPS.includes(b.group)).map((b) => b.slug)
      );
      return { chapters, perDay: paceForDays(chapters.length, 365) };
    }
  },
  {
    id: "canon",
    name: "The Whole Canon in a Year",
    build: () => ({ chapters: weightedCanon(), perDay: CANON_PER_DAY })
  }
];
