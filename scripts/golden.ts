/**
 * Golden-year snapshot builder (review §B.2): one record per day capturing
 * the full computed calendar and lectionary resolution. Shared by the
 * generator (build-golden.ts) and the harness diff (test-data.ts), so a
 * mismatch always means the ENGINES changed, never the encoding.
 */
import { CalendarRegion, liturgicalDay } from "../src/lib/liturgical";
import { LectionaryData, dayCodeCandidates, resolveReadings } from "../src/lib/lectionary";

export interface GoldenDay {
  /** ISO date */
  d: string;
  season: string;
  label: string;
  week: number;
  color: string;
  /** "Rank: Name", with "(transferred from YYYY-MM-DD)" when applicable */
  cel: string[];
  /** ordered candidate day-code groups */
  groups: string[][];
  /** resolved primary reading code (null if no gospel resolves) */
  reading: string | null;
  /** "label :: code" when an alternative set is offered */
  second?: string;
}

const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;

export function goldenDay(date: Date, region: CalendarRegion, lect: LectionaryData): GoldenDay {
  const lit = liturgicalDay(date, region);
  const resolved = resolveReadings(lect, date, region);
  const day: GoldenDay = {
    d: iso(date),
    season: lit.season,
    label: lit.seasonLabel,
    week: lit.week,
    color: lit.color,
    cel: lit.celebrations.map(
      (c) => `${c.rank}: ${c.name}${c.transferredFrom ? ` (transferred from ${c.transferredFrom})` : ""}`
    ),
    groups: dayCodeCandidates(date, region),
    reading: resolved?.code ?? null
  };
  if (resolved?.secondary) day.second = `${resolved.secondary.label} :: ${resolved.secondary.code}`;
  return day;
}

export function goldenYear(year: number, region: CalendarRegion, lect: LectionaryData): GoldenDay[] {
  const out: GoldenDay[] = [];
  for (let date = new Date(year, 0, 1); date.getFullYear() === year; date = new Date(year, date.getMonth(), date.getDate() + 1)) {
    out.push(goldenDay(date, region, lect));
  }
  return out;
}

export const GOLDEN_YEARS = [2024, 2025, 2026, 2027] as const;
export const GOLDEN_REGIONS = ["universal", "usa"] as const;
