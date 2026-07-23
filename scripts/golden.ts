/**
 * Golden-year snapshot builder (review §B.2): one record per day capturing
 * the full computed calendar and lectionary resolution. Shared by the
 * generator (build-golden.ts) and the harness diff (test-data.ts), so a
 * mismatch always means the ENGINES changed, never the encoding.
 */
import { liturgicalDay } from "../src/lib/liturgical";
import type { CalendarSelection } from "../src/lib/calendarProfile";
import { LectionaryData, dayCodeCandidates, resolveReadings } from "../src/lib/lectionary";
import { EMPTY_INDIVIDUAL_CHURCH_PROPER } from "../src/lib/calendarProfile";

export interface GoldenDay {
  /** ISO date */
  d: string;
  season: string;
  label: string;
  week: number;
  color: string;
  /** "Rank: Name", with "(transferred from YYYY-MM-DD)" when applicable */
  cel: string[];
  /** Lawful non-governing calendar choices, with stable IDs. */
  alternatives?: string[];
  /** Occurrence/transfer receipts retained for audit. */
  suppressed?: string[];
  /** ordered candidate day-code groups */
  groups: string[][];
  /** resolved primary reading code (null if no gospel resolves) */
  reading: string | null;
  /** "label :: code" when an alternative set is offered */
  second?: string;
  /** Other complete Mass formularies assigned to the civil day. */
  masses?: string[];
  /** Permitted formularies identified by official lectionary locus. */
  formularies?: string[];
}

const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;

export function goldenDay(date: Date, region: CalendarSelection, lect: LectionaryData): GoldenDay {
  const lit = liturgicalDay(date, region, EMPTY_INDIVIDUAL_CHURCH_PROPER);
  const resolved = resolveReadings(
    lect,
    date,
    region,
    undefined,
    EMPTY_INDIVIDUAL_CHURCH_PROPER
  );
  const day: GoldenDay = {
    d: iso(date),
    season: lit.season,
    label: lit.seasonLabel,
    week: lit.week,
    color: lit.color,
    cel: lit.celebrations.map(
      (c) => `${c.rank}: ${c.name}${c.transferredFrom ? ` (transferred from ${c.transferredFrom})` : ""}`
    ),
    groups: dayCodeCandidates(
      date,
      region,
      undefined,
      EMPTY_INDIVIDUAL_CHURCH_PROPER
    ),
    reading: resolved?.code ?? null
  };
  if (resolved?.secondary) day.second = `${resolved.secondary.label} :: ${resolved.secondary.code}`;
  if (lit.alternatives.length) {
    day.alternatives = lit.alternatives.map(
      (item) => `${item.id} :: ${item.rank} :: ${item.name}`
    );
  }
  if (lit.suppressed.length) {
    day.suppressed = lit.suppressed.map(
      (item) => `${item.id} :: ${item.suppressionReason}${item.transferredTo ? ` :: ${item.transferredTo}` : ""}`
    );
  }
  if (resolved?.massAlternatives?.length) {
    day.masses = resolved.massAlternatives.map((option) => `${option.label} :: ${option.code}`);
  }
  if (resolved?.formularyOptions?.length) {
    day.formularies = resolved.formularyOptions.map(
      (option) => `${option.label} :: ${option.color} :: ${option.lectionaryReference}`
    );
  }
  return day;
}

export function goldenYear(year: number, region: CalendarSelection, lect: LectionaryData): GoldenDay[] {
  const out: GoldenDay[] = [];
  for (let date = new Date(year, 0, 1); date.getFullYear() === year; date = new Date(year, date.getMonth(), date.getDate() + 1)) {
    out.push(goldenDay(date, region, lect));
  }
  return out;
}

export const GOLDEN_YEARS = [
  2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031
] as const;
/** Full General snapshot plus the exact deltas of both verified U.S. profiles. */
export const GOLDEN_REGIONS = [
  "roman.general",
  "roman.us.ascension-sunday",
  "roman.us.ascension-thursday"
] as const;
