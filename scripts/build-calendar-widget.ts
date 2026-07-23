/**
 * Build the atomic native calendar snapshot.
 *
 * The native widgets do not reimplement the Roman-calendar, lectionary, or
 * quote engines. This generator resolves every supported profile from the
 * previous civil year through five future years. Native code selects the
 * profile named in app-to-widget shared settings and must reject an expired,
 * corrupt, schema-mismatched, or fingerprint-mismatched snapshot.
 *
 * Usage:
 *   npx tsx scripts/build-calendar-widget.ts
 *   npx tsx scripts/build-calendar-widget.ts --verify
 *
 * Normal generation records the real generation time and atomically replaces
 * both native copies. Verification reuses the committed generation timestamp,
 * regenerates in memory, and requires each copy to be byte-identical.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LectionaryData,
  READING_LABELS,
  formatLectionaryCitation,
  resolveReadings,
  type DayReadings
} from "../src/lib/lectionary";
import { COLOR_HEX, liturgicalDay } from "../src/lib/liturgical";
import {
  CALENDAR_PROFILE_SCHEMA_VERSION,
  DEFAULT_CALENDAR_PROFILE_ID,
  DEFAULT_LECTIONARY_PACK_FINGERPRINT,
  DEFAULT_LECTIONARY_PACK_ID,
  EMPTY_INDIVIDUAL_CHURCH_PROPER,
  EXACT_CALENDAR_CATALOG_FROM,
  EXACT_CALENDAR_CATALOG_THROUGH,
  NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR,
  SUPPORTED_CALENDAR_PROFILES,
  US_LECTIONARY_PACK,
  type CalendarProfileId
} from "../src/lib/calendarProfile";
import { getBook } from "../src/lib/canon";
import { DailyQuote, quoteOfTheDay } from "../src/lib/quotes";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERIFY = process.argv.includes("--verify");
const unknownArgs = process.argv.slice(2).filter((arg) => arg !== "--verify");
if (unknownArgs.length) throw new Error(`unknown argument(s): ${unknownArgs.join(", ")}`);

const dests = [
  join(ROOT, "ios", "WidgetExtension", "calendar.json"),
  join(ROOT, "android", "app", "src", "main", "res", "raw", "calendar.json")
];

const lect: LectionaryData = JSON.parse(
  readFileSync(join(ROOT, "public/data/lectionary.json"), "utf8")
);
const quotes: DailyQuote[] = JSON.parse(
  readFileSync(join(ROOT, "public/data/quotes.json"), "utf8")
).quotes;

interface WidgetReading {
  label: string;
  cite: string;
}

interface WidgetReadingOption {
  label: string;
  readings: WidgetReading[];
}

interface WidgetCalendarEntry {
  season: string;
  seasonLabel: string;
  colorHex: string;
  celebration: string;
  celebrationId: string | null;
  formularyId: string | null;
  readings: WidgetReading[];
  readingOptions?: WidgetReadingOption[];
  formularyOptions?: { id: string; label: string; colorHex: string; lectionaryReference: string }[];
  formularyState?: DayReadings["formularyState"];
  unavailableFormularies?: DayReadings["unavailableFormularies"];
  alternatives?: { id: string; name: string; rank: string; colorHex: string }[];
  quote: { text: string; author: string } | null;
}

interface WidgetProfileSnapshot {
  id: CalendarProfileId;
  label: string;
  fingerprint: string;
  sourceCheckedAt: string;
  days: Record<string, WidgetCalendarEntry>;
}

interface WidgetCalendarSnapshot {
  schemaVersion: typeof CALENDAR_PROFILE_SCHEMA_VERSION;
  generatedAt: string;
  expiresAt: string;
  window: { from: string; through: string };
  exactCatalogWindow: { from: string; through: string };
  lectionaryPack: {
    id: typeof DEFAULT_LECTIONARY_PACK_ID;
    version: string;
    fingerprint: typeof DEFAULT_LECTIONARY_PACK_FINGERPRINT;
  };
  defaultProfileId: CalendarProfileId;
  profiles: Record<CalendarProfileId, WidgetProfileSnapshot>;
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function widgetReadings(rows: LectionaryData[string]): WidgetReading[] {
  const groups = rows.reduce<Record<number, typeof rows>>((acc, row) => {
    (acc[Math.floor(row.t)] ??= []).push(row);
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([group, rows]) => {
      const row = rows[0];
      const book = getBook(row.b);
      if (!book) return null;
      return {
        label: READING_LABELS[Number(group)] ?? "Reading",
        cite: formatLectionaryCitation(row, book)
      };
    })
    .filter((value): value is WidgetReading => value !== null);
}

function readingsFor(
  date: Date,
  profileId: CalendarProfileId
): {
  readings: WidgetReading[];
  readingOptions: WidgetReadingOption[];
  formularyOptions: NonNullable<WidgetCalendarEntry["formularyOptions"]>;
  formularyState?: DayReadings["formularyState"];
  unavailableFormularies?: DayReadings["unavailableFormularies"];
} {
  const resolved = resolveReadings(
    lect,
    date,
    profileId,
    DEFAULT_LECTIONARY_PACK_ID,
    EMPTY_INDIVIDUAL_CHURCH_PROPER
  );
  if (!resolved) return { readings: [], readingOptions: [], formularyOptions: [] };
  return {
    readings: widgetReadings(resolved.rows),
    readingOptions: [
      ...(resolved.secondary
        ? [{
            label: resolved.secondary.label,
            readings: widgetReadings(resolved.secondary.rows)
          }]
        : []),
      ...(resolved.massAlternatives ?? []).map((option) => ({
        label: option.label,
        readings: widgetReadings(option.rows)
      })),
      ...(resolved.memorialFormularies ?? []).map((option) => ({
        label: `Memorial Formulary: ${option.label}`,
        readings: widgetReadings(option.rows)
      })),
      ...(resolved.optionalMemorials ?? []).map((option) => ({
        label: `Optional Memorial: ${option.label}`,
        readings: widgetReadings(option.rows)
      }))
    ],
    formularyOptions: (resolved.formularyOptions ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      colorHex: COLOR_HEX[option.color],
      lectionaryReference: option.lectionaryReference
    })),
    ...(resolved.formularyState ? { formularyState: resolved.formularyState } : {}),
    ...(resolved.unavailableFormularies?.length
      ? { unavailableFormularies: resolved.unavailableFormularies }
      : {})
  };
}

function existingSnapshot(): WidgetCalendarSnapshot | null {
  if (!existsSync(dests[0])) return null;
  try {
    const parsed = JSON.parse(readFileSync(dests[0], "utf8")) as WidgetCalendarSnapshot;
    return parsed.schemaVersion === CALENDAR_PROFILE_SCHEMA_VERSION && parsed.window ? parsed : null;
  } catch {
    return null;
  }
}

const prior = existingSnapshot();
if (VERIFY && !prior) {
  throw new Error("calendar widget snapshot is missing or uses the legacy schema; run npm run calendar-widget");
}

// The epoch is compiled into the web app as well as this generator. That keeps
// an already-installed app's sparse local overlay compatible with its bundled
// base snapshot after New Year. CI deliberately turns red when the civil year
// changes, forcing the release owner to bump the epoch and regenerate both.
const buildYear = NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR;
const currentYear = new Date().getFullYear();
if (buildYear !== currentYear) {
  throw new Error(
    `native widget snapshot epoch ${buildYear} is stale for ${currentYear}; update NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR and run npm run widgets`
  );
}
const start = new Date(buildYear - 1, 0, 1);
const end = new Date(buildYear + 5, 11, 31);
const generatedAt = VERIFY && prior ? prior.generatedAt : new Date().toISOString();
const expiresAt = new Date(Date.UTC(buildYear + 6, 0, 1)).toISOString();

const profiles = {} as Record<CalendarProfileId, WidgetProfileSnapshot>;
let totalReadings = 0;
let totalQuotes = 0;
for (const profile of SUPPORTED_CALENDAR_PROFILES) {
  const days: Record<string, WidgetCalendarEntry> = {};
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const lit = liturgicalDay(date, profile.id, EMPTY_INDIVIDUAL_CHURCH_PROPER);
    const resolvedReadings = readingsFor(date, profile.id);
    const readings = resolvedReadings.readings;
    const quote = quoteOfTheDay(
      quotes,
      date,
      (candidate) => liturgicalDay(candidate, profile.id, EMPTY_INDIVIDUAL_CHURCH_PROPER),
      profile.id
    );
    if (readings.length) totalReadings++;
    if (quote) totalQuotes++;
    const governing = lit.celebrations[0];
    days[isoLocal(date)] = {
      season: lit.season,
      seasonLabel: lit.seasonLabel,
      colorHex: COLOR_HEX[lit.color],
      celebration: governing?.name ?? "",
      celebrationId: governing?.id ?? null,
      formularyId: governing?.formularyId ?? null,
      readings,
      ...(resolvedReadings.readingOptions.length
        ? { readingOptions: resolvedReadings.readingOptions }
        : {}),
      ...(resolvedReadings.formularyOptions.length
        ? { formularyOptions: resolvedReadings.formularyOptions }
        : {}),
      ...(resolvedReadings.formularyState
        ? { formularyState: resolvedReadings.formularyState }
        : {}),
      ...(resolvedReadings.unavailableFormularies?.length
        ? { unavailableFormularies: resolvedReadings.unavailableFormularies }
        : {}),
      ...(lit.alternatives.length
        ? {
            alternatives: lit.alternatives.map((alternative) => ({
              id: alternative.id,
              name: alternative.name,
              rank: alternative.rank,
              colorHex: COLOR_HEX[alternative.color ?? lit.color]
            }))
          }
        : {}),
      quote: quote ? { text: quote.text, author: quote.author } : null
    };
  }
  profiles[profile.id] = {
    id: profile.id,
    label: profile.label,
    fingerprint: profile.fingerprint,
    sourceCheckedAt: profile.sourceCheckedAt,
    days
  };
}

const snapshot: WidgetCalendarSnapshot = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  generatedAt,
  expiresAt,
  window: { from: isoLocal(start), through: isoLocal(end) },
  exactCatalogWindow: {
    from: EXACT_CALENDAR_CATALOG_FROM,
    through: EXACT_CALENDAR_CATALOG_THROUGH
  },
  lectionaryPack: {
    id: DEFAULT_LECTIONARY_PACK_ID,
    version: US_LECTIONARY_PACK.version,
    fingerprint: DEFAULT_LECTIONARY_PACK_FINGERPRINT
  },
  defaultProfileId: DEFAULT_CALENDAR_PROFILE_ID,
  profiles
};
const json = JSON.stringify(snapshot);

if (VERIFY) {
  const mismatches = dests.filter(
    (dest) => !existsSync(dest) || readFileSync(dest, "utf8") !== json
  );
  if (mismatches.length) {
    throw new Error(
      `calendar widget snapshot is stale: ${mismatches
        .map((dest) => dest.slice(ROOT.length + 1))
        .join(", ")}; run npm run calendar-widget`
    );
  }
  console.log(`verified ${dests.length} byte-identical calendar widget snapshots`);
} else {
  for (const dest of dests) {
    mkdirSync(dirname(dest), { recursive: true });
    const temporary = `${dest}.tmp-${process.pid}`;
    writeFileSync(temporary, json);
    renameSync(temporary, dest);
    console.log(`wrote ${dest}`);
  }
}

const dayCount = Object.keys(profiles[DEFAULT_CALENDAR_PROFILE_ID].days).length;
console.log(
  `${SUPPORTED_CALENDAR_PROFILES.length} profiles × ${dayCount} days (${isoLocal(start)} … ${isoLocal(end)}): ${totalReadings} with readings, ${totalQuotes} with a quote`
);
