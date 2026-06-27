/**
 * Pre-resolves the liturgical day — its season/color, the Mass-reading citations,
 * and the Quote of the Day — for a rolling window of dates, so the native
 * "Today at Mass" and "Quote of the Day" home-screen widgets can show the right
 * content WITHOUT porting the calendar/lectionary/quote engines to Swift/Java.
 *
 * It mirrors what src/pages/Home.tsx computes (resolveReadings + formatCitation +
 * READING_LABELS, liturgicalDay, quoteOfTheDay) — the single source of truth —
 * and emits the same JSON to both native widget bundles:
 *   ios/WidgetExtension/calendar.json
 *   android/app/src/main/res/raw/calendar.json   (lowercase: Android res/raw rule)
 *
 * Output is an object keyed by local ISO date (YYYY-MM-DD); the widget reads the
 * device's local date and looks up today's entry, falling back gracefully past
 * the window's end. Run: npx tsx scripts/build-calendar-widget.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LectionaryData,
  READING_LABELS,
  formatCitation,
  resolveReadings,
} from "../src/lib/lectionary";
import { COLOR_HEX, liturgicalDay } from "../src/lib/liturgical";
import { getBook, bookDisplayName } from "../src/lib/canon";
import { DailyQuote, quoteOfTheDay } from "../src/lib/quotes";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The U.S. (USCCB) calendar — matches the app's default calendar region
// (src/lib/storage.ts) so the home-screen "Today at Mass" widget never disagrees
// with the app about the day's celebration, color, or reading citations.
const REGION = "usa" as const;
const TRANSLATION = "drc"; // the bundled default the widgets read for book names

const lect: LectionaryData = JSON.parse(
  readFileSync(join(ROOT, "public/data/lectionary.json"), "utf8")
);
const quotes: DailyQuote[] = JSON.parse(
  readFileSync(join(ROOT, "public/data/quotes.json"), "utf8")
).quotes;

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** The Mass reading citations, grouped like the Today card (one row per slot). */
function readingsFor(date: Date): { label: string; cite: string }[] {
  const r = resolveReadings(lect, date, REGION);
  if (!r) return [];
  const groups = r.rows.reduce<Record<number, typeof r.rows>>((acc, row) => {
    (acc[Math.floor(row.t)] ??= []).push(row);
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([g, rows]) => {
      const row = rows[0];
      const book = getBook(row.b);
      if (!book) return null;
      return {
        label: READING_LABELS[Number(g)] ?? "Reading",
        cite: formatCitation(row, bookDisplayName(book, TRANSLATION)),
      };
    })
    .filter((x): x is { label: string; cite: string } => x !== null);
}

// Rolling window: Jan 1 of the build year through Dec 31 of next year (~2 liturgical
// years), so a phone that has not updated the app for many months still resolves.
const buildYear = new Date().getFullYear();
const start = new Date(buildYear, 0, 1);
const end = new Date(buildYear + 1, 11, 31);

const out: Record<string, unknown> = {};
let withReadings = 0;
let withQuote = 0;
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const date = new Date(d);
  const lit = liturgicalDay(date, REGION);
  const readings = readingsFor(date);
  const q = quoteOfTheDay(quotes, date, (dd) => liturgicalDay(dd, REGION), REGION);
  if (readings.length) withReadings++;
  if (q) withQuote++;
  out[isoLocal(date)] = {
    season: lit.season,
    seasonLabel: lit.seasonLabel,
    colorHex: COLOR_HEX[lit.color],
    celebration: lit.celebrations[0]?.name ?? "",
    readings,
    quote: q ? { text: q.text, author: q.author } : null,
  };
}

const json = JSON.stringify(out);
const dests = [
  join(ROOT, "ios", "WidgetExtension", "calendar.json"),
  join(ROOT, "android", "app", "src", "main", "res", "raw", "calendar.json"),
];
for (const dest of dests) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, json);
  console.log(`wrote ${dest}`);
}
const days = Object.keys(out).length;
console.log(
  `${days} days (${start.getFullYear()}-01-01 … ${end.getFullYear()}-12-31): ${withReadings} with readings, ${withQuote} with a quote`
);
