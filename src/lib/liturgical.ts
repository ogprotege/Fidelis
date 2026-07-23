/**
 * Ordinary-Form Roman calendar engine.
 *
 * Calendar data comes from the ordered CalendarPacks in calendarProfile.ts.
 * This module supplies Gregorian date arithmetic, the temporal cycle, all
 * thirteen precedence classes, occurrence, alternatives, and cross-year
 * transfers. Lower precedence numbers win (GNLYC 59).
 */

import { getSettings } from "./storage";
import {
  CALENDAR_PRECEDENCE,
  calendarCelebrationRules,
  calendarProfile,
  calendarProfileRulesForDate,
  calendarTemporalAlternativeRules,
  individualChurchCelebrationRules,
  individualChurchProperFingerprint,
  normalizeCalendarProfile,
  type CalendarColor,
  type CalendarDateRule,
  type CalendarFormularyOption,
  type CalendarPrecedence,
  type CalendarProfileId,
  type CalendarRank,
  type CalendarSelection,
  type CalendarTransferPolicy,
  type IndividualChurchProper
} from "./calendarProfile";

/** @deprecated Migration-only alias for pre-v1.24 callers and tests. */
export type CalendarRegion = CalendarSelection;
export type { CalendarProfileId } from "./calendarProfile";

/** Read lazily so the calendar and lectionary engines always agree. */
export function currentCalendarProfile(): CalendarProfileId {
  return getSettings().calendarProfile;
}

/** @deprecated Use currentCalendarProfile; retained for migration compatibility. */
export const currentRegion = currentCalendarProfile;

export type LiturgicalColor = CalendarColor;
export type Rank = CalendarRank;

/** Return the active liturgical accent or the brand-default sentinel. */
export function accentFor(
  followLiturgicalYear: boolean,
  color: LiturgicalColor
): LiturgicalColor | null {
  return followLiturgicalYear ? color : null;
}

export type Season =
  | "Advent"
  | "Christmastide"
  | "Ordinary Time"
  | "Lent"
  | "Sacred Triduum"
  | "Eastertide";

export interface Celebration {
  /** Stable pack identity; display names and dates may change independently. */
  id: string;
  /** Stable key used by a separately selected LectionaryPack. */
  formularyId: string | null;
  packId: string;
  name: string;
  rank: Rank;
  color?: LiturgicalColor;
  precedence: CalendarPrecedence;
  transferredFrom?: string;
  optional?: boolean;
  formularyOptions?: readonly CalendarFormularyOption[];
}

export interface SuppressedCelebration extends Celebration {
  suppressionReason:
    | "temporal-precedence"
    | "celebration-precedence"
    | "memorial-collision"
    | "transferred";
  transferredTo?: string;
}

export interface LiturgicalDay {
  date: Date;
  profileId: CalendarProfileId;
  /** Base, officially sourced profile fingerprint. */
  profileFingerprint: string;
  /** Base profile plus the versioned user-supplied individual-church layer. */
  resolvedCalendarFingerprint: string;
  season: Season;
  seasonLabel: string;
  week: number;
  color: LiturgicalColor;
  celebrations: Celebration[];
  alternatives: Celebration[];
  suppressed: SuppressedCelebration[];
}

const DAY = 86_400_000;

function ymd(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(left: Date, right: Date): number {
  const leftMidnight = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime();
  const rightMidnight = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
  return Math.round((rightMidnight - leftMidnight) / DAY);
}

/** Anonymous Gregorian computus (Meeus/Jones/Butcher). */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

/** First Sunday of Advent: the Sunday between Nov. 27 and Dec. 3. */
export function adventStart(year: number): Date {
  const christmas = ymd(year, 12, 25);
  const weekday = christmas.getDay();
  return addDays(christmas, -(weekday === 0 ? 7 : weekday) - 21);
}

/** Epiphany: Jan. 6, or the Sunday from Jan. 2 through Jan. 8. */
export function epiphanyDate(
  year: number,
  region: CalendarSelection = currentCalendarProfile()
): Date {
  if (calendarProfileRulesForDate(region, ymd(year, 1, 6)).epiphany === "sunday-january-2-8") {
    const january2 = ymd(year, 1, 2);
    const weekday = january2.getDay();
    return addDays(january2, weekday === 0 ? 0 : 7 - weekday);
  }
  return ymd(year, 1, 6);
}

/** Baptism is Sunday after Jan. 6, or Monday after a U.S. Jan. 7/8 Epiphany. */
export function baptismOfTheLord(
  year: number,
  region: CalendarSelection = currentCalendarProfile()
): Date {
  const epiphany = epiphanyDate(year, region);
  if (
    calendarProfileRulesForDate(region, epiphany).epiphany === "sunday-january-2-8" &&
    epiphany.getDate() >= 7
  ) {
    return addDays(epiphany, 1);
  }
  const weekday = epiphany.getDay();
  return addDays(epiphany, weekday === 0 ? 7 : 7 - weekday);
}

function holyFamilyDate(year: number): Date {
  const christmas = ymd(year, 12, 25);
  for (let offset = 1; offset <= 6; offset++) {
    const candidate = addDays(christmas, offset);
    if (candidate.getDay() === 0) return candidate;
  }
  return ymd(year, 12, 30);
}

/** Resolve every typed CalendarDateRule through one Gregorian authority. */
export function calendarDateForRule(
  year: number,
  rule: CalendarDateRule,
  region: CalendarSelection
): Date {
  switch (rule.kind) {
    case "fixed":
      return ymd(year, rule.month, rule.day);
    case "fixed-next-day-if-sunday": {
      const date = ymd(year, rule.month, rule.day);
      return date.getDay() === 0 ? addDays(date, 1) : date;
    }
    case "easter-offset":
      return addDays(easterDate(year), rule.days);
    case "sunday-between": {
      const start = ymd(year, rule.month, rule.fromDay);
      const weekday = start.getDay();
      const date = addDays(start, weekday === 0 ? 0 : 7 - weekday);
      if (date.getDate() > rule.throughDay) {
        throw new Error(`calendar rule has no Sunday in ${rule.month}/${rule.fromDay}-${rule.throughDay}`);
      }
      return date;
    }
    case "advent-offset":
      return addDays(adventStart(year), rule.days);
    case "nth-weekday": {
      const first = ymd(year, rule.month, 1);
      const offset = (rule.weekday - first.getDay() + 7) % 7;
      return addDays(first, offset + (rule.occurrence - 1) * 7);
    }
    case "profile-date": {
      const easter = easterDate(year);
      switch (rule.name) {
        case "epiphany":
          return epiphanyDate(year, region);
        case "ascension":
          return addDays(
            easter,
            calendarProfileRulesForDate(region, addDays(easter, 39)).ascension === "sunday"
              ? 42
              : 39
          );
        case "corpus-christi":
          return addDays(
            easter,
            calendarProfileRulesForDate(region, addDays(easter, 60)).corpusChristi === "sunday"
              ? 63
              : 60
          );
        case "baptism":
          return baptismOfTheLord(year, region);
        case "holy-family":
          return holyFamilyDate(year);
      }
    }
  }
}

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
  "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
  "Twenty-First", "Twenty-Second", "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth",
  "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth", "Twenty-Ninth", "Thirtieth",
  "Thirty-First", "Thirty-Second", "Thirty-Third", "Thirty-Fourth"
];

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

interface CelebrationDef extends Celebration {
  transferPolicy: CalendarTransferPolicy;
  occurrencePriority: number;
}

function celebrationDefs(
  year: number,
  region: CalendarSelection,
  individualChurchProper: IndividualChurchProper
): [Date, CelebrationDef][] {
  const rules = [
    // Compose the catalog without a representative-date sentinel. A pack may
    // lawfully become effective on any civil day, so filtering the whole year
    // through 1 July could discard a valid later occurrence. Each candidate is
    // checked against its pack's effective interval after its actual date is
    // computed below.
    ...calendarCelebrationRules(region),
    ...individualChurchCelebrationRules(individualChurchProper)
  ];
  return rules.flatMap((rule) => {
    const dateFor = (dateRule: CalendarDateRule) =>
      calendarDateForRule(year, dateRule, region);
    const occursOnIntendedFixedDate = (date: Date, dateRule: CalendarDateRule) =>
      dateRule.kind !== "fixed" ||
      (date.getMonth() + 1 === dateRule.month && date.getDate() === dateRule.day);
    const occurrenceFor = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const applies = (candidate: { effectiveFrom?: string; effectiveThrough?: string }) =>
      (occurrence: string) =>
        (!candidate.effectiveFrom || occurrence >= candidate.effectiveFrom) &&
        (!candidate.effectiveThrough || occurrence <= candidate.effectiveThrough);
    let activeRule = rule;
    let activeDate = dateFor(rule.dateRule);
    const activeOccurrence = occurrenceFor(activeDate);
    if (
      "packEffectiveFrom" in rule &&
      (activeOccurrence < rule.packEffectiveFrom ||
        (rule.packEffectiveThrough !== undefined && activeOccurrence > rule.packEffectiveThrough))
    ) {
      return [];
    }
    if (!applies(rule)(occurrenceFor(activeDate))) {
      const historical = rule.historicalVariants?.find((variant) => {
        const variantDate = dateFor(variant.dateRule ?? rule.dateRule);
        return applies(variant)(occurrenceFor(variantDate));
      });
      if (!historical) return [];
      activeRule = { ...rule, ...historical };
      activeDate = dateFor(historical.dateRule ?? rule.dateRule);
    }
    if (!occursOnIntendedFixedDate(activeDate, activeRule.dateRule)) return [];
    return [[activeDate, {
      id: activeRule.id,
      formularyId: activeRule.formularyId,
      packId: activeRule.packId,
      name: activeRule.name,
      rank: activeRule.rank,
      color: activeRule.color,
      precedence: activeRule.precedence,
      ...(activeRule.optional ? { optional: true } : {}),
      ...(activeRule.formularyOptions ? { formularyOptions: activeRule.formularyOptions } : {}),
      transferPolicy: activeRule.transferPolicy ??
        (activeRule.rank === "Solemnity" ? "next-free-day" : "none"),
      occurrencePriority: activeRule.occurrencePriority ?? 0
    }] as [Date, CelebrationDef]];
  });
}

/** Precedence carried by the temporal day before sanctoral occurrence. */
function temporalPrecedence(date: Date): CalendarPrecedence {
  const year = date.getFullYear();
  const easterOffset = daysBetween(easterDate(year), date);
  if (easterOffset >= -2 && easterOffset <= 0) return CALENDAR_PRECEDENCE.paschalTriduum;
  if (
    easterOffset === -46 ||
    (easterOffset >= -7 && easterOffset <= -3) ||
    (easterOffset >= 1 && easterOffset <= 7) ||
    easterOffset === 49
  ) {
    return CALENDAR_PRECEDENCE.primaryTemporalDays;
  }
  const weekday = date.getDay();
  if (weekday === 0) {
    const advent1 = adventStart(year);
    const christmas = ymd(year, 12, 25);
    const adventSunday = daysBetween(advent1, date) >= 0 && daysBetween(date, christmas) > 0;
    const lentSunday = easterOffset > -46 && easterOffset < 0;
    const easterSunday = easterOffset > 0 && easterOffset < 49;
    return adventSunday || lentSunday || easterSunday
      ? CALENDAR_PRECEDENCE.primaryTemporalDays
      : CALENDAR_PRECEDENCE.ordinarySunday;
  }
  if (easterOffset >= -45 && easterOffset <= -8) {
    return CALENDAR_PRECEDENCE.privilegedWeekday;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 12 && ((day >= 17 && day <= 24) || day >= 26)) {
    return CALENDAR_PRECEDENCE.privilegedWeekday;
  }
  return CALENDAR_PRECEDENCE.feria;
}

const isoKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return ymd(year, month, day);
};

export interface CalendarDayResolution {
  observed: Celebration[];
  alternatives: Celebration[];
  suppressed: SuppressedCelebration[];
}

const stripDefinition = ({
  transferPolicy: _transferPolicy,
  occurrencePriority: _occurrencePriority,
  ...celebration
}: CelebrationDef): Celebration => celebration;

/** Shared occurrence authority used by the year engine and exhaustive tests. */
function resolveOccurrenceDefinitions(
  candidates: readonly CelebrationDef[],
  temporal: CalendarPrecedence,
  carriedSuppressed: readonly SuppressedCelebration[] = []
): CalendarDayResolution {
  const list = [...candidates].sort(
    (left, right) =>
      left.precedence - right.precedence ||
      right.occurrencePriority - left.occurrencePriority ||
      left.id.localeCompare(right.id)
  );
  if (!list.length) return { observed: [], alternatives: [], suppressed: [...carriedSuppressed] };
  const best = list[0].precedence;
  const suppressed = [...carriedSuppressed];
  if (best > temporal) {
    const alternatives = temporal === CALENDAR_PRECEDENCE.privilegedWeekday
      ? list
          .filter((definition) => definition.rank === "Memorial")
          .map((definition) => ({
            ...stripDefinition(definition),
            rank: "Commemoration" as const,
            precedence: CALENDAR_PRECEDENCE.optionalMemorial,
            optional: true
          }))
      : [];
    suppressed.push(
      ...list.map((definition) => ({
        ...stripDefinition(definition),
        suppressionReason: "temporal-precedence" as const
      }))
    );
    return { observed: [], alternatives, suppressed };
  }
  if (best === CALENDAR_PRECEDENCE.optionalMemorial) {
    return {
      observed: [],
      alternatives: list.filter((definition) => definition.optional).map(stripDefinition),
      suppressed
    };
  }
  const sameClass = list.filter((definition) => definition.precedence === best);
  const bestOccurrencePriority = Math.max(
    ...sameClass.map((definition) => definition.occurrencePriority)
  );
  const winners = sameClass.filter(
    (definition) => definition.occurrencePriority === bestOccurrencePriority
  );
  if (
    (best === CALENDAR_PRECEDENCE.generalMemorial ||
      best === CALENDAR_PRECEDENCE.properMemorial) &&
    winners.length > 1
  ) {
    const alternatives = winners.map((definition) => ({
      ...stripDefinition(definition),
      precedence: CALENDAR_PRECEDENCE.optionalMemorial,
      optional: true
    }));
    suppressed.push(
      ...winners.map((definition) => ({
        ...stripDefinition(definition),
        suppressionReason: "memorial-collision" as const
      }))
    );
    return { observed: [], alternatives, suppressed };
  }
  const winnerSet = new Set(winners);
  suppressed.push(
    ...list
      .filter((definition) => !winnerSet.has(definition))
      .map((definition) => ({
        ...stripDefinition(definition),
        suppressionReason: "celebration-precedence" as const
      }))
  );
  return {
    observed: winners.map(stripDefinition),
    alternatives: [],
    suppressed
  };
}

export interface CalendarOccurrenceCandidate extends Celebration {
  occurrencePriority?: number;
}

/** Public pure seam for validating arbitrary precedence collisions. */
export function resolveCalendarOccurrence(
  candidates: readonly CalendarOccurrenceCandidate[],
  temporal: CalendarPrecedence = CALENDAR_PRECEDENCE.feria
): CalendarDayResolution {
  return resolveOccurrenceDefinitions(
    candidates.map((candidate) => ({
      ...candidate,
      transferPolicy: "none",
      occurrencePriority: candidate.occurrencePriority ?? 0
    })),
    temporal
  );
}

const yearCache = new Map<string, Map<string, CalendarDayResolution>>();

/** Resolve occurrence and transfers in a three-civil-year window. */
function resolveYear(
  year: number,
  region: CalendarSelection,
  individualChurchProper: IndividualChurchProper
): Map<string, CalendarDayResolution> {
  const profile = calendarProfile(region);
  const cacheKey = `${profile.fingerprint}:${individualChurchProperFingerprint(individualChurchProper)}:${year}`;
  const cached = yearCache.get(cacheKey);
  if (cached) return cached;

  const candidates = new Map<string, CelebrationDef[]>();
  const addDef = (date: Date, definition: CelebrationDef) => {
    const key = isoKey(date);
    const list = candidates.get(key);
    if (list) list.push(definition);
    else candidates.set(key, [definition]);
  };
  for (let sourceYear = year - 1; sourceYear <= year + 1; sourceYear++) {
    for (const [date, definition] of celebrationDefs(
      sourceYear,
      profile.id,
      individualChurchProper
    )) {
      addDef(date, definition);
    }
  }

  const carriedSuppressed = new Map<string, SuppressedCelebration[]>();
  const suppress = (
    key: string,
    celebration: CelebrationDef,
    suppressionReason: SuppressedCelebration["suppressionReason"],
    transferredTo?: string
  ) => {
    const {
      transferPolicy: _transferPolicy,
      occurrencePriority: _occurrencePriority,
      ...publicCelebration
    } = celebration;
    const item: SuppressedCelebration = {
      ...publicCelebration,
      suppressionReason,
      ...(transferredTo ? { transferredTo } : {})
    };
    const list = carriedSuppressed.get(key);
    if (list) list.push(item);
    else carriedSuppressed.set(key, [item]);
  };

  const scanStart = ymd(year - 1, 1, 1);
  const scanEnd = ymd(year + 1, 12, 31);
  for (let date = scanStart; date <= scanEnd; date = addDays(date, 1)) {
    const list = candidates.get(isoKey(date));
    if (!list) continue;
    list.sort(
      (left, right) =>
        left.precedence - right.precedence ||
        right.occurrencePriority - left.occurrencePriority ||
        left.id.localeCompare(right.id)
    );
    const temporal = temporalPrecedence(date);
    let governorSeen = false;
    for (const definition of [...list]) {
      if (definition.precedence < CALENDAR_PRECEDENCE.generalSolemnity) {
        governorSeen = true;
        continue;
      }
      if (
        definition.rank !== "Solemnity" ||
        definition.precedence > CALENDAR_PRECEDENCE.properSolemnity ||
        definition.transferPolicy === "none"
      ) {
        continue;
      }
      if (temporal < definition.precedence || governorSeen) {
        list.splice(list.indexOf(definition), 1);
        const easter = easterDate(date.getFullYear());
        const easterOffset = daysBetween(easter, date);
        const anticipatesHolyWeek =
          definition.transferPolicy === "saturday-before-holy-week" &&
          easterOffset >= -7 && easterOffset <= -1;
        const backwards = definition.transferPolicy === "previous-free-day" ||
          anticipatesHolyWeek;
        let target = anticipatesHolyWeek
          ? addDays(easter, -8)
          : addDays(date, backwards ? -1 : 1);
        for (let offset = 0; offset < 366; offset++) {
          const occupied = (candidates.get(isoKey(target)) ?? []).some(
            (candidate) => candidate.precedence <= CALENDAR_PRECEDENCE.properFeast
          );
          if (temporalPrecedence(target) > CALENDAR_PRECEDENCE.properFeast && !occupied) break;
          target = addDays(target, backwards ? -1 : 1);
        }
        suppress(isoKey(date), definition, "transferred", isoKey(target));
        addDef(target, { ...definition, transferredFrom: isoKey(date) });
      } else {
        governorSeen = true;
      }
    }
  }

  const resolved = new Map<string, CalendarDayResolution>();
  for (const [key, list] of candidates) {
    if (!list.length) continue;
    const temporal = temporalPrecedence(fromKey(key));
    resolved.set(
      key,
      resolveOccurrenceDefinitions(list, temporal, carriedSuppressed.get(key) ?? [])
    );
  }
  for (const [key, suppressed] of carriedSuppressed) {
    if (!resolved.has(key)) resolved.set(key, { observed: [], alternatives: [], suppressed });
  }
  yearCache.set(cacheKey, resolved);
  return resolved;
}

export function calendarResolution(
  date: Date,
  region: CalendarSelection = currentCalendarProfile(),
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): CalendarDayResolution {
  return (
    resolveYear(date.getFullYear(), region, individualChurchProper).get(isoKey(date)) ?? {
      observed: [],
      alternatives: [],
      suppressed: []
    }
  );
}

export function liturgicalDay(
  date: Date = new Date(),
  region: CalendarSelection = currentCalendarProfile(),
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): LiturgicalDay {
  const profileId = normalizeCalendarProfile(region);
  const profile = calendarProfile(profileId);
  const year = date.getFullYear();
  const easter = easterDate(year);
  const ashWednesday = addDays(easter, -46);
  const holyThursday = addDays(easter, -3);
  const pentecost = addDays(easter, 49);
  const advent1 = adventStart(year);
  const christmas = ymd(year, 12, 25);
  const baptism = baptismOfTheLord(year, profileId);
  const weekdayNumber = date.getDay();
  const weekday = WEEKDAYS[weekdayNumber];

  let season: Season;
  let seasonLabel: string;
  let color: LiturgicalColor;
  let weekNumber = 0;

  if (daysBetween(advent1, date) >= 0 && daysBetween(date, christmas) > 0) {
    season = "Advent";
    const week = Math.floor(daysBetween(advent1, date) / 7) + 1;
    weekNumber = week;
    seasonLabel =
      weekdayNumber === 0
        ? `${ORDINALS[week - 1]} Sunday of Advent`
        : `${weekday} of the ${ORDINALS[week - 1]} Week of Advent`;
    color = weekdayNumber === 0 && week === 3 ? "rose" : "violet";
  } else if (daysBetween(date, christmas) <= 0 || daysBetween(date, baptism) >= 0) {
    season = "Christmastide";
    seasonLabel =
      date.getMonth() === 11
        ? daysBetween(christmas, date) === 0
          ? "Christmas Day"
          : `${ORDINALS[daysBetween(christmas, date)]} Day within the Octave of Christmas`
        : `${weekday} of Christmastide`;
    color = "white";
  } else if (daysBetween(ashWednesday, date) >= 0 && daysBetween(date, holyThursday) > 0) {
    season = "Lent";
    const firstSunday = addDays(ashWednesday, 4);
    const week = Math.floor(daysBetween(firstSunday, date) / 7) + 1;
    weekNumber = daysBetween(ashWednesday, date) < 4 ? 0 : week;
    if (daysBetween(ashWednesday, date) === 0) seasonLabel = "Ash Wednesday";
    else if (daysBetween(ashWednesday, date) < 4) seasonLabel = `${weekday} after Ash Wednesday`;
    else if (week === 6) seasonLabel = weekdayNumber === 0 ? "Palm Sunday" : `${weekday} of Holy Week`;
    else {
      seasonLabel =
        weekdayNumber === 0
          ? `${ORDINALS[week - 1]} Sunday of Lent`
          : `${weekday} of the ${ORDINALS[week - 1]} Week of Lent`;
    }
    color = weekdayNumber === 0 && week === 4 ? "rose" : "violet";
  } else if (daysBetween(holyThursday, date) >= 0 && daysBetween(date, easter) > 0) {
    season = "Sacred Triduum";
    seasonLabel =
      ["Holy Thursday", "Good Friday", "Holy Saturday"][daysBetween(holyThursday, date)] ?? weekday;
    color = daysBetween(date, easter) === 2 ? "red" : "violet";
  } else if (daysBetween(easter, date) >= 0 && daysBetween(date, pentecost) >= 0) {
    season = "Eastertide";
    const week = Math.floor(daysBetween(easter, date) / 7) + 1;
    weekNumber = week;
    if (daysBetween(easter, date) === 0) seasonLabel = "Easter Sunday";
    else if (daysBetween(date, pentecost) === 0) seasonLabel = "Pentecost Sunday";
    else if (daysBetween(easter, date) < 7) seasonLabel = `${weekday} within the Octave of Easter`;
    else {
      seasonLabel =
        weekdayNumber === 0
          ? `${ORDINALS[week - 1]} Sunday of Easter`
          : `${weekday} of the ${ORDINALS[week - 1]} Week of Easter`;
    }
    color = daysBetween(date, pentecost) === 0 ? "red" : "white";
  } else {
    season = "Ordinary Time";
    let week: number;
    if (daysBetween(date, ashWednesday) > 0) {
      const anchor = baptism.getDay() === 0 ? baptism : addDays(baptism, -1);
      week = Math.floor(daysBetween(anchor, date) / 7) + 1;
    } else {
      const christKing = addDays(advent1, -7);
      week = 34 - Math.floor(daysBetween(date, addDays(christKing, 6)) / 7);
    }
    week = Math.min(Math.max(week, 1), 34);
    weekNumber = week;
    seasonLabel =
      weekdayNumber === 0
        ? `${ORDINALS[week - 1]} Sunday in Ordinary Time`
        : `${weekday} of the ${ORDINALS[week - 1]} Week in Ordinary Time`;
    color = "green";
  }

  const resolution = calendarResolution(date, profileId, individualChurchProper);
  const celebrations = resolution.observed;
  const alternatives = [...resolution.alternatives];
  if (season === "Ordinary Time" && weekdayNumber === 6 && celebrations.length === 0) {
    for (const rule of calendarTemporalAlternativeRules(profileId, date)) {
      if (rule.trigger.kind !== "ordinary-time-saturday") continue;
      alternatives.push({
        id: rule.id,
        formularyId: rule.formularyId,
        packId: rule.packId,
        name: rule.name,
        rank: rule.rank,
        color: rule.color,
        precedence: rule.precedence,
        optional: true,
        ...(rule.formularyOptions ? { formularyOptions: rule.formularyOptions } : {})
      });
    }
  }
  const governing = celebrations[0];
  if (governing?.color) color = governing.color;

  return {
    date,
    profileId,
    profileFingerprint: profile.fingerprint,
    resolvedCalendarFingerprint:
      `${profile.fingerprint}+${individualChurchProperFingerprint(individualChurchProper)}`,
    season,
    seasonLabel,
    week: weekNumber,
    color,
    celebrations,
    alternatives,
    suppressed: resolution.suppressed
  };
}

export const COLOR_HEX: Record<LiturgicalColor, string> = {
  green: "#2e7d32",
  violet: "#5e35b1",
  white: "#c9a227",
  red: "#c62828",
  rose: "#d81b60",
  black: "#424242"
};
