/**
 * Sparse native-widget overlay for the constrained individual-church proper.
 *
 * The bundled native snapshot contains only sourced base profiles. This
 * envelope carries the few civil days whose visible result changes after the
 * user's title, dedication, or principal-patron solemnity is composed. Native
 * code must validate every envelope field and fail closed on an affected date.
 */
import {
  DEFAULT_LECTIONARY_PACK_ID,
  EMPTY_INDIVIDUAL_CHURCH_PROPER,
  EXACT_CALENDAR_CATALOG_FROM,
  EXACT_CALENDAR_CATALOG_THROUGH,
  NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR,
  calendarProfile,
  individualChurchCalendarLayer,
  lectionaryPackFingerprint,
  normalizeCalendarProfile,
  normalizeIndividualChurchProper,
  normalizeLectionaryPackId,
  type CalendarProfileId,
  type IndividualChurchProper,
  type LectionaryPackId
} from "./calendarProfile";
import { getBook } from "./canon";
import {
  READING_LABELS,
  formatLectionaryCitation,
  loadLectionary,
  resolveReadings,
  type DayReadings,
  type LectionaryRow
} from "./lectionary";
import { COLOR_HEX, liturgicalDay, type LiturgicalDay } from "./liturgical";
import { loadQuotes, quoteOfTheDay, type DailyQuote } from "./quotes";
import { parseLocalISODate } from "./dateKey";

export const LOCAL_WIDGET_OVERLAY_SCHEMA_VERSION = 1 as const;
export const LOCAL_WIDGET_OVERLAY_MAX_DAYS = 24 as const;
export const LOCAL_WIDGET_OVERLAY_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface LocalWidgetReading {
  label: string;
  cite: string;
}

export interface LocalWidgetReadingOption {
  label: string;
  readings: LocalWidgetReading[];
}

export interface LocalWidgetOverlayDay {
  season: string;
  seasonLabel: string;
  colorHex: string;
  celebration: string;
  celebrationId: string | null;
  formularyId: string | null;
  transferredFrom?: string;
  readings: LocalWidgetReading[];
  readingOptions?: LocalWidgetReadingOption[];
  formularyOptions?: {
    id: string;
    label: string;
    colorHex: string;
    lectionaryReference: string;
  }[];
  formularyState?: DayReadings["formularyState"];
  unavailableFormularies?: DayReadings["unavailableFormularies"];
  /** Fully resolved so replacing a base day never drops an unchanged quote. */
  quote: { text: string; author: string } | null;
}

export interface LocalWidgetCalendarOverlay {
  schemaVersion: typeof LOCAL_WIDGET_OVERLAY_SCHEMA_VERSION;
  generatedAt: string;
  expiresAt: string;
  window: { from: string; through: string };
  exactCatalogWindow: { from: string; through: string };
  baseProfileId: CalendarProfileId;
  baseProfileFingerprint: string;
  lectionaryPackId: LectionaryPackId;
  lectionaryPackFingerprint: string;
  localLayer: {
    id: "local.individual-church";
    version: "1";
    fingerprint: string;
    authority: "User-supplied on this device";
    provenance: string;
  };
  days: Record<string, LocalWidgetOverlayDay>;
}

const isoLocal = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function readingCitations(rows: readonly LectionaryRow[]): LocalWidgetReading[] {
  const groups = rows.reduce<Record<number, LectionaryRow[]>>((result, row) => {
    (result[Math.floor(row.t)] ??= []).push(row);
    return result;
  }, {});
  return Object.entries(groups).flatMap(([group, groupedRows]) => {
    const row = groupedRows[0];
    const book = getBook(row.b);
    return book
      ? [{
          label: READING_LABELS[Number(group)] ?? "Reading",
          cite: formatLectionaryCitation(row, book)
        }]
      : [];
  });
}

function readingOptions(readings: DayReadings): LocalWidgetReadingOption[] {
  return [
    ...(readings.secondary
      ? [{
          label: readings.secondary.label,
          readings: readingCitations(readings.secondary.rows)
        }]
      : []),
    ...(readings.massAlternatives ?? []).map((option) => ({
      label: option.label,
      readings: readingCitations(option.rows)
    })),
    ...(readings.memorialFormularies ?? []).map((option) => ({
      label: `Memorial Formulary: ${option.label}`,
      readings: readingCitations(option.rows)
    })),
    ...(readings.optionalMemorials ?? []).map((option) => ({
      label: `Optional Memorial: ${option.label}`,
      readings: readingCitations(option.rows)
    }))
  ];
}

function visibleCalendarSignature(day: LiturgicalDay): string {
  return JSON.stringify({
    season: day.season,
    seasonLabel: day.seasonLabel,
    color: day.color,
    celebrations: day.celebrations.map((item) => ({
      id: item.id,
      name: item.name,
      rank: item.rank,
      color: item.color,
      transferredFrom: item.transferredFrom
    })),
    alternatives: day.alternatives.map((item) => item.id)
  });
}

function quoteFor(
  quotes: DailyQuote[],
  date: Date,
  profileId: CalendarProfileId,
  proper: IndividualChurchProper
): DailyQuote | null {
  return quoteOfTheDay(
    quotes,
    date,
    (candidate) => liturgicalDay(candidate, profileId, proper),
    profileId
  );
}

export interface BuildLocalWidgetOverlayOptions {
  profileId: CalendarProfileId;
  lectionaryPackId?: LectionaryPackId;
  individualChurchProper: IndividualChurchProper;
  now?: Date;
}

/** Pure-data seam used by the runtime builder and regression harness. */
export function buildLocalWidgetCalendarOverlayFromData(
  options: BuildLocalWidgetOverlayOptions,
  lectionary: Record<string, LectionaryRow[]>,
  quotes: DailyQuote[]
): LocalWidgetCalendarOverlay {
  const now = options.now ? new Date(options.now) : new Date();
  const profileId = normalizeCalendarProfile(options.profileId);
  const lectionaryPackId = normalizeLectionaryPackId(
    options.lectionaryPackId ?? DEFAULT_LECTIONARY_PACK_ID
  );
  const proper = normalizeIndividualChurchProper(options.individualChurchProper);
  const layer = individualChurchCalendarLayer(proper);
  const profile = calendarProfile(profileId);
  // Match the release-pinned base snapshot, not the runtime civil year. An
  // installed build can therefore cross New Year and regenerate settings
  // without producing an overlay that native correctly rejects as belonging
  // to a different base window.
  const start = new Date(NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR - 1, 0, 1);
  const end = new Date(NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR + 5, 11, 31);
  const expiresAt = new Date(Date.UTC(NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR + 6, 0, 1));
  // Never persist an envelope that native must reject even after the device
  // clock is corrected. This can happen when a user opens Fidelis while the
  // manual clock is beyond the release-pinned snapshot expiry. App.tsx retries
  // the same unchanged settings on foreground/visibility activation.
  if (!Number.isFinite(now.getTime()) || now.getTime() >= expiresAt.getTime()) {
    throw new Error("device clock is outside the bundled widget snapshot window");
  }
  const days: Record<string, LocalWidgetOverlayDay> = {};

  if (layer.celebrations.length) {
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor);
      const baseDay = liturgicalDay(date, profileId, EMPTY_INDIVIDUAL_CHURCH_PROPER);
      const localDay = liturgicalDay(date, profileId, proper);
      if (visibleCalendarSignature(baseDay) === visibleCalendarSignature(localDay)) continue;

      const resolved = resolveReadings(
        lectionary,
        date,
        profileId,
        lectionaryPackId,
        proper
      );
      const governing = localDay.celebrations[0];
      const optionsForDay = resolved ? readingOptions(resolved) : [];
      const localQuote = quoteFor(quotes, date, profileId, proper);
      days[isoLocal(date)] = {
        season: localDay.season,
        seasonLabel: localDay.seasonLabel,
        colorHex: COLOR_HEX[localDay.color],
        celebration: governing?.name ?? "",
        celebrationId: governing?.id ?? null,
        formularyId: governing?.formularyId ?? null,
        ...(governing?.transferredFrom ? { transferredFrom: governing.transferredFrom } : {}),
        readings: resolved ? readingCitations(resolved.rows) : [],
        ...(optionsForDay.length ? { readingOptions: optionsForDay } : {}),
        ...(resolved?.formularyOptions?.length
          ? {
              formularyOptions: resolved.formularyOptions.map((option) => ({
                id: option.id,
                label: option.label,
                colorHex: COLOR_HEX[option.color],
                lectionaryReference: option.lectionaryReference
              }))
            }
          : {}),
        ...(resolved?.formularyState ? { formularyState: resolved.formularyState } : {}),
        ...(resolved?.unavailableFormularies?.length
          ? { unavailableFormularies: resolved.unavailableFormularies }
          : {}),
        quote: localQuote ? { text: localQuote.text, author: localQuote.author } : null
      };
    }
  }

  if (Object.keys(days).length > LOCAL_WIDGET_OVERLAY_MAX_DAYS) {
    throw new Error("individual-church widget overlay exceeded its fail-closed sparse bound");
  }

  return {
    schemaVersion: LOCAL_WIDGET_OVERLAY_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    window: { from: isoLocal(start), through: isoLocal(end) },
    exactCatalogWindow: {
      from: EXACT_CALENDAR_CATALOG_FROM,
      through: EXACT_CALENDAR_CATALOG_THROUGH
    },
    baseProfileId: profileId,
    baseProfileFingerprint: profile.fingerprint,
    lectionaryPackId,
    lectionaryPackFingerprint: lectionaryPackFingerprint(lectionaryPackId),
    localLayer: {
      id: layer.id,
      version: layer.version,
      fingerprint: layer.fingerprint,
      authority: layer.authority,
      provenance: layer.provenance
    },
    days
  };
}

/** Resolve and serialize the complete sparse overlay in one immutable value. */
export async function buildLocalWidgetCalendarOverlay(
  options: BuildLocalWidgetOverlayOptions
): Promise<LocalWidgetCalendarOverlay> {
  const lectionaryPackId = normalizeLectionaryPackId(
    options.lectionaryPackId ?? DEFAULT_LECTIONARY_PACK_ID
  );
  const [lectionary, quotes] = await Promise.all([
    loadLectionary(lectionaryPackId),
    loadQuotes()
  ]);
  return buildLocalWidgetCalendarOverlayFromData(options, lectionary, quotes);
}

/** Web-side mirror of the native fail-closed envelope checks. */
export function validateLocalWidgetCalendarOverlay(
  value: unknown,
  expected: {
    profileId: CalendarProfileId;
    baseProfileFingerprint: string;
    localProperFingerprint: string;
    lectionaryPackId: LectionaryPackId;
    window?: { from: string; through: string };
    now?: Date;
  }
): value is LocalWidgetCalendarOverlay {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const overlay = value as Partial<LocalWidgetCalendarOverlay>;
  const now = (expected.now ?? new Date()).getTime();
  const generated = Date.parse(overlay.generatedAt ?? "");
  const expires = Date.parse(overlay.expiresAt ?? "");
  if (
    overlay.schemaVersion !== LOCAL_WIDGET_OVERLAY_SCHEMA_VERSION ||
    overlay.baseProfileId !== expected.profileId ||
    overlay.baseProfileFingerprint !== expected.baseProfileFingerprint ||
    overlay.localLayer?.id !== "local.individual-church" ||
    overlay.localLayer?.version !== "1" ||
    overlay.localLayer?.fingerprint !== expected.localProperFingerprint ||
    !overlay.localLayer?.authority ||
    !overlay.localLayer?.provenance ||
    overlay.lectionaryPackId !== expected.lectionaryPackId ||
    overlay.lectionaryPackFingerprint !== lectionaryPackFingerprint(expected.lectionaryPackId) ||
    !Number.isFinite(generated) ||
    !Number.isFinite(expires) ||
    generated > now + LOCAL_WIDGET_OVERLAY_CLOCK_SKEW_MS ||
    generated >= expires ||
    now >= expires ||
    !overlay.window ||
    !overlay.exactCatalogWindow ||
    typeof overlay.window.from !== "string" ||
    typeof overlay.window.through !== "string" ||
    parseLocalISODate(overlay.window.from) === null ||
    parseLocalISODate(overlay.window.through) === null ||
    overlay.window.from > overlay.window.through ||
    (expected.window !== undefined &&
      (overlay.window.from !== expected.window.from ||
        overlay.window.through !== expected.window.through)) ||
    overlay.exactCatalogWindow.from !== EXACT_CALENDAR_CATALOG_FROM ||
    overlay.exactCatalogWindow.through !== EXACT_CALENDAR_CATALOG_THROUGH ||
    !overlay.days ||
    typeof overlay.days !== "object" ||
    Object.keys(overlay.days).length > LOCAL_WIDGET_OVERLAY_MAX_DAYS
  ) {
    return false;
  }
  return Object.entries(overlay.days).every(([date, day]) =>
    parseLocalISODate(date) !== null &&
    date >= overlay.window!.from &&
    date <= overlay.window!.through &&
    !!day &&
    typeof day === "object" &&
    typeof day.season === "string" &&
    typeof day.seasonLabel === "string" &&
    typeof day.colorHex === "string" &&
    Array.isArray(day.readings) &&
    Object.prototype.hasOwnProperty.call(day, "quote") &&
    (day.quote === null ||
      (typeof day.quote === "object" &&
        typeof day.quote.text === "string" &&
        typeof day.quote.author === "string"))
  );
}
