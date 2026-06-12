/**
 * Liturgical calendar engine (General Roman Calendar, ordinary form dates).
 * Computes the season, its color, and major celebrations for any date.
 * Movable feasts derive from the Easter computus (Meeus/Jones/Butcher).
 *
 * Occurrence is resolved by an abbreviated Table of Liturgical Days
 * (Universal Norms on the Liturgical Year and the Calendar, nn. 59–61),
 * expressed as a numeric precedence — lower wins:
 *   1  the Paschal Triduum
 *   2  Christmas, Epiphany, Ascension, Pentecost; Sundays of Advent, Lent
 *      and Easter; Ash Wednesday; Holy Week Mon–Thu; the Easter Octave
 *   3  solemnities of the General Calendar; All Souls
 *   5  feasts of the Lord
 *   6  Sundays of Christmastide and Ordinary Time
 *   7  feasts of the General Calendar
 *   9  privileged weekdays (Dec 17–24, the Christmas Octave, Lenten ferias)
 *   10 obligatory memorials
 *   13 ferias
 * An impeded solemnity transfers to the nearest following free day
 * (GNLYC 60); impeded feasts and memorials are omitted for the year.
 * Transfer is a whole-year operation, so the calendar is computed and
 * cached per year; liturgicalDay(date) reads the year map.
 */

import { CalendarRegion, getSettings } from "./storage";

export type { CalendarRegion };

/** The region every engine entry point defaults to — read lazily from the
 *  persisted setting so the calendar and lectionary engines always agree. */
export function currentRegion(): CalendarRegion {
  return getSettings().calendarRegion;
}

export type LiturgicalColor = "green" | "violet" | "white" | "red" | "rose" | "black";

export type Season =
  | "Advent"
  | "Christmastide"
  | "Ordinary Time"
  | "Lent"
  | "Sacred Triduum"
  | "Eastertide";

export type Rank = "Solemnity" | "Feast" | "Memorial" | "Sunday" | "Feria";

export interface Celebration {
  name: string;
  rank: Rank;
  color?: LiturgicalColor;
  /** Numeric rank in the Table of Liturgical Days (1 = highest; see header). */
  precedence?: number;
  /** ISO date of the nominal day, set when the celebration was transferred. */
  transferredFrom?: string;
  /** Optional memorial (memoria ad libitum) — its readings never displace
   *  the ferial cycle. */
  optional?: boolean;
}

export interface LiturgicalDay {
  date: Date;
  season: Season;
  /** e.g. "Third Sunday of Advent", "Friday of the 4th Week of Lent" */
  seasonLabel: string;
  /** Week within the season (0 = days after Ash Wednesday; OT weeks 1–34). */
  week: number;
  color: LiturgicalColor;
  celebrations: Celebration[];
}

const DAY = 86_400_000;

function ymd(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function daysBetween(a: Date, b: Date): number {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((b0 - a0) / DAY);
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

/** First Sunday of Advent: the Sunday between Nov 27 and Dec 3. */
export function adventStart(year: number): Date {
  const christmas = ymd(year, 12, 25);
  const dow = christmas.getDay(); // 0 = Sunday
  const fourthSundayBefore = addDays(christmas, -(dow === 0 ? 7 : dow) - 21);
  return fourthSundayBefore;
}

/** Epiphany: Jan 6, or in the United States the Sunday between Jan 2 and 8. */
export function epiphanyDate(year: number, region: CalendarRegion = currentRegion()): Date {
  if (region === "usa") {
    const jan2 = ymd(year, 1, 2);
    const dow = jan2.getDay();
    return addDays(jan2, dow === 0 ? 0 : 7 - dow);
  }
  return ymd(year, 1, 6);
}

/**
 * The Baptism of the Lord (ends Christmastide): the Sunday after Jan 6 — but
 * in the United States, when Epiphany lands on Jan 7 or 8, the Monday
 * immediately following it.
 */
export function baptismOfTheLord(year: number, region: CalendarRegion = currentRegion()): Date {
  const epiphany = epiphanyDate(year, region);
  if (region === "usa" && epiphany.getDate() >= 7) return addDays(epiphany, 1);
  const dow = epiphany.getDay();
  return addDays(epiphany, dow === 0 ? 7 : 7 - dow);
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

// Fixed-date celebrations of the General Roman Calendar (month, day).
// A representative selection: all solemnities/feasts plus well-loved memorials.
// `p` overrides the default precedence of the rank (feasts of the Lord rank 5,
// and Christmas/Epiphany sit among the rank-2 privileged days).
// `opt` marks optional memorials (memoria ad libitum): kept at Memorial
// precedence for occurrence (pre-existing model), but their formularies are
// never promoted over the ferial readings (P1-6).
const FIXED: { m: number; d: number; name: string; rank: Rank; color?: LiturgicalColor; p?: number; opt?: boolean }[] = [
  { m: 1, d: 1, name: "Mary, the Holy Mother of God", rank: "Solemnity", color: "white" },
  // The Epiphany is region-movable and is added in movableDefs().
  { m: 1, d: 2, name: "Sts. Basil the Great and Gregory Nazianzen, Doctors", rank: "Memorial", color: "white" },
  { m: 1, d: 21, name: "St. Agnes, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 1, d: 25, name: "The Conversion of St. Paul, Apostle", rank: "Feast", color: "white" },
  { m: 1, d: 26, name: "Sts. Timothy and Titus, Bishops", rank: "Memorial", color: "white" },
  { m: 1, d: 28, name: "St. Thomas Aquinas, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 1, d: 31, name: "St. John Bosco, Priest", rank: "Memorial", color: "white" },
  { m: 2, d: 2, name: "The Presentation of the Lord (Candlemas)", rank: "Feast", color: "white", p: 5 },
  { m: 2, d: 11, name: "Our Lady of Lourdes", rank: "Memorial", color: "white", opt: true },
  { m: 2, d: 14, name: "Sts. Cyril and Methodius", rank: "Memorial", color: "white" },
  { m: 2, d: 22, name: "The Chair of St. Peter, Apostle", rank: "Feast", color: "white" },
  { m: 3, d: 17, name: "St. Patrick, Bishop", rank: "Memorial", color: "white" },
  { m: 3, d: 19, name: "St. Joseph, Spouse of the Blessed Virgin Mary", rank: "Solemnity", color: "white" },
  { m: 3, d: 25, name: "The Annunciation of the Lord", rank: "Solemnity", color: "white" },
  { m: 4, d: 25, name: "St. Mark, Evangelist", rank: "Feast", color: "red" },
  { m: 4, d: 29, name: "St. Catherine of Siena, Virgin and Doctor", rank: "Memorial", color: "white" },
  { m: 5, d: 1, name: "St. Joseph the Worker", rank: "Memorial", color: "white", opt: true },
  { m: 5, d: 3, name: "Sts. Philip and James, Apostles", rank: "Feast", color: "red" },
  { m: 5, d: 13, name: "Our Lady of Fatima", rank: "Memorial", color: "white", opt: true },
  { m: 5, d: 14, name: "St. Matthias, Apostle", rank: "Feast", color: "red" },
  { m: 5, d: 31, name: "The Visitation of the Blessed Virgin Mary", rank: "Feast", color: "white" },
  { m: 5, d: 2, name: "St. Athanasius, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 6, d: 5, name: "St. Boniface, Bishop and Martyr", rank: "Memorial", color: "red" },
  { m: 6, d: 11, name: "St. Barnabas, Apostle", rank: "Memorial", color: "red" },
  { m: 6, d: 13, name: "St. Anthony of Padua, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 6, d: 28, name: "St. Irenaeus, Bishop, Martyr and Doctor", rank: "Memorial", color: "red" },
  { m: 6, d: 24, name: "The Nativity of St. John the Baptist", rank: "Solemnity", color: "white" },
  { m: 6, d: 29, name: "Sts. Peter and Paul, Apostles", rank: "Solemnity", color: "red" },
  { m: 7, d: 3, name: "St. Thomas, Apostle", rank: "Feast", color: "red" },
  { m: 7, d: 11, name: "St. Benedict, Abbot", rank: "Memorial", color: "white" },
  { m: 7, d: 16, name: "Our Lady of Mount Carmel", rank: "Memorial", color: "white", opt: true },
  { m: 7, d: 22, name: "St. Mary Magdalene", rank: "Feast", color: "white" },
  { m: 7, d: 25, name: "St. James, Apostle", rank: "Feast", color: "red" },
  { m: 7, d: 26, name: "Sts. Joachim and Anne, Parents of the BVM", rank: "Memorial", color: "white" },
  { m: 7, d: 29, name: "Sts. Martha, Mary and Lazarus", rank: "Memorial", color: "white" },
  { m: 7, d: 31, name: "St. Ignatius of Loyola, Priest", rank: "Memorial", color: "white" },
  { m: 8, d: 1, name: "St. Alphonsus Liguori, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 8, d: 4, name: "St. John Vianney, Priest", rank: "Memorial", color: "white" },
  { m: 8, d: 6, name: "The Transfiguration of the Lord", rank: "Feast", color: "white", p: 5 },
  { m: 8, d: 8, name: "St. Dominic, Priest", rank: "Memorial", color: "white" },
  { m: 8, d: 10, name: "St. Lawrence, Deacon and Martyr", rank: "Feast", color: "red" },
  { m: 8, d: 11, name: "St. Clare, Virgin", rank: "Memorial", color: "white" },
  { m: 8, d: 14, name: "St. Maximilian Kolbe, Priest and Martyr", rank: "Memorial", color: "red" },
  { m: 8, d: 15, name: "The Assumption of the Blessed Virgin Mary", rank: "Solemnity", color: "white" },
  { m: 8, d: 22, name: "The Queenship of the Blessed Virgin Mary", rank: "Memorial", color: "white" },
  { m: 8, d: 24, name: "St. Bartholomew, Apostle", rank: "Feast", color: "red" },
  { m: 8, d: 27, name: "St. Monica", rank: "Memorial", color: "white" },
  { m: 8, d: 28, name: "St. Augustine, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 8, d: 29, name: "The Passion of St. John the Baptist", rank: "Memorial", color: "red" },
  { m: 9, d: 8, name: "The Nativity of the Blessed Virgin Mary", rank: "Feast", color: "white" },
  { m: 9, d: 14, name: "The Exaltation of the Holy Cross", rank: "Feast", color: "red", p: 5 },
  { m: 9, d: 15, name: "Our Lady of Sorrows", rank: "Memorial", color: "white" },
  { m: 9, d: 21, name: "St. Matthew, Apostle and Evangelist", rank: "Feast", color: "red" },
  { m: 9, d: 23, name: "St. Pius of Pietrelcina (Padre Pio), Priest", rank: "Memorial", color: "white" },
  { m: 9, d: 29, name: "Sts. Michael, Gabriel and Raphael, Archangels", rank: "Feast", color: "white" },
  { m: 9, d: 30, name: "St. Jerome, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 10, d: 1, name: "St. Thérèse of the Child Jesus, Virgin and Doctor", rank: "Memorial", color: "white" },
  { m: 10, d: 2, name: "The Holy Guardian Angels", rank: "Memorial", color: "white" },
  { m: 10, d: 4, name: "St. Francis of Assisi", rank: "Memorial", color: "white" },
  { m: 10, d: 7, name: "Our Lady of the Rosary", rank: "Memorial", color: "white" },
  { m: 10, d: 15, name: "St. Teresa of Jesus (Ávila), Virgin and Doctor", rank: "Memorial", color: "white" },
  { m: 10, d: 17, name: "St. Ignatius of Antioch, Bishop and Martyr", rank: "Memorial", color: "red" },
  { m: 10, d: 18, name: "St. Luke, Evangelist", rank: "Feast", color: "red" },
  { m: 10, d: 22, name: "St. John Paul II, Pope", rank: "Memorial", color: "white", opt: true },
  { m: 10, d: 28, name: "Sts. Simon and Jude, Apostles", rank: "Feast", color: "red" },
  { m: 11, d: 1, name: "All Saints", rank: "Solemnity", color: "white" },
  { m: 11, d: 2, name: "The Commemoration of All the Faithful Departed (All Souls)", rank: "Solemnity", color: "violet" },
  { m: 11, d: 9, name: "The Dedication of the Lateran Basilica", rank: "Feast", color: "white", p: 5 },
  { m: 11, d: 11, name: "St. Martin of Tours, Bishop", rank: "Memorial", color: "white" },
  { m: 11, d: 21, name: "The Presentation of the Blessed Virgin Mary", rank: "Memorial", color: "white" },
  { m: 11, d: 22, name: "St. Cecilia, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 11, d: 30, name: "St. Andrew, Apostle", rank: "Feast", color: "red" },
  { m: 12, d: 7, name: "St. Ambrose, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 12, d: 8, name: "The Immaculate Conception of the Blessed Virgin Mary", rank: "Solemnity", color: "white" },
  // Our Lady of Guadalupe is a Feast of the USA proper calendar (USA_FIXED);
  // in the General Calendar it is an optional memorial, outside this model.
  { m: 12, d: 13, name: "St. Lucy, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 12, d: 14, name: "St. John of the Cross, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 12, d: 25, name: "The Nativity of the Lord (Christmas)", rank: "Solemnity", color: "white", p: 2 },
  { m: 12, d: 26, name: "St. Stephen, the First Martyr", rank: "Feast", color: "red" },
  { m: 12, d: 27, name: "St. John, Apostle and Evangelist", rank: "Feast", color: "white" },
  { m: 12, d: 28, name: "The Holy Innocents, Martyrs", rank: "Feast", color: "red" }
];

// Proper calendar of the United States: its Feast and all six obligatory
// memorials (optional memorials and the Thanksgiving votive are outside the
// engine's model).
const USA_FIXED: typeof FIXED = [
  { m: 1, d: 4, name: "St. Elizabeth Ann Seton, Religious", rank: "Memorial", color: "white" },
  { m: 1, d: 5, name: "St. John Neumann, Bishop", rank: "Memorial", color: "white" },
  { m: 7, d: 14, name: "St. Kateri Tekakwitha, Virgin", rank: "Memorial", color: "white" },
  { m: 9, d: 9, name: "St. Peter Claver, Priest", rank: "Memorial", color: "white" },
  { m: 10, d: 19, name: "Sts. John de Brébeuf and Isaac Jogues, Priests, and Companions, Martyrs", rank: "Memorial", color: "red" },
  { m: 11, d: 13, name: "St. Frances Xavier Cabrini, Virgin", rank: "Memorial", color: "white" },
  { m: 12, d: 12, name: "Our Lady of Guadalupe", rank: "Feast", color: "white" }
];

const RANK_PRECEDENCE: Record<Rank, number> = {
  Solemnity: 3,
  Feast: 7,
  Memorial: 10,
  Sunday: 6,
  Feria: 13
};

interface CelebrationDef {
  name: string;
  rank: Rank;
  color?: LiturgicalColor;
  precedence: number;
  transferredFrom?: string;
  optional?: boolean;
}

/** The year's movable celebrations with their Table precedence. */
function movableDefs(year: number, region: CalendarRegion): [Date, CelebrationDef][] {
  const easter = easterDate(year);
  const out: [Date, CelebrationDef][] = [];
  const at = (date: Date, name: string, rank: Rank, color: LiturgicalColor, precedence: number) =>
    out.push([date, { name, rank, color, precedence }]);
  const e = (offset: number) => addDays(easter, offset);

  at(epiphanyDate(year, region), "The Epiphany of the Lord", "Solemnity", "white", 2);
  at(e(-46), "Ash Wednesday", "Feria", "violet", 2);
  at(e(-7), "Palm Sunday of the Passion of the Lord", "Sunday", "red", 2);
  at(e(-3), "Holy Thursday — Mass of the Lord's Supper", "Solemnity", "white", 1);
  at(e(-2), "Good Friday of the Passion of the Lord", "Solemnity", "red", 1);
  at(e(-1), "Holy Saturday", "Solemnity", "violet", 1);
  at(e(0), "Easter Sunday of the Resurrection of the Lord", "Solemnity", "white", 1);
  at(e(7), "Divine Mercy Sunday (Second Sunday of Easter)", "Solemnity", "white", 2);
  // USA: Ascension Thursday transfers to the Seventh Sunday of Easter.
  at(e(region === "usa" ? 42 : 39), "The Ascension of the Lord", "Solemnity", "white", 2);
  at(e(49), "Pentecost Sunday", "Solemnity", "red", 2);
  at(e(50), "Mary, Mother of the Church", "Memorial", "white", 10);
  at(e(56), "The Most Holy Trinity", "Solemnity", "white", 3);
  at(e(60), "The Most Holy Body and Blood of Christ (Corpus Christi)", "Solemnity", "white", 3);
  at(e(68), "The Most Sacred Heart of Jesus", "Solemnity", "white", 3);
  at(e(69), "The Immaculate Heart of the Blessed Virgin Mary", "Memorial", "white", 10);

  // Christ the King: the Sunday before the First Sunday of Advent.
  at(addDays(adventStart(year), -7), "Our Lord Jesus Christ, King of the Universe", "Solemnity", "white", 3);

  // Holy Family: Sunday within the Christmas octave (or Dec 30 if none).
  const christmas = ymd(year, 12, 25);
  let holyFamily = ymd(year, 12, 30);
  for (let i = 1; i <= 6; i++) {
    const d = addDays(christmas, i);
    if (d.getDay() === 0) {
      holyFamily = d;
      break;
    }
  }
  at(holyFamily, "The Holy Family of Jesus, Mary and Joseph", "Feast", "white", 5);
  at(baptismOfTheLord(year, region), "The Baptism of the Lord", "Feast", "white", 5);
  return out;
}

/**
 * Precedence of the temporal office a date carries of itself (its Sunday,
 * privileged day, or feria), independent of any celebration falling on it.
 */
function temporalPrecedence(date: Date): number {
  const year = date.getFullYear();
  const fe = daysBetween(easterDate(year), date);
  // The Triduum: Good Friday through Easter Sunday.
  if (fe >= -2 && fe <= 0) return 1;
  // Ash Wednesday; Palm Sunday and Holy Week Mon–Thu; the Easter Octave; Pentecost.
  if (fe === -46 || (fe >= -7 && fe <= -3) || (fe >= 1 && fe <= 7) || fe === 49) return 2;
  const dow = date.getDay();
  if (dow === 0) {
    const advent1 = adventStart(year);
    const christmas = ymd(year, 12, 25);
    const adventSunday = daysBetween(advent1, date) >= 0 && daysBetween(date, christmas) > 0;
    const lentSunday = fe > -46 && fe < 0;
    const easterSunday = fe > 0 && fe < 49;
    if (adventSunday || lentSunday || easterSunday) return 2;
    return 6; // Sundays of Christmastide and Ordinary Time
  }
  if (fe >= -45 && fe <= -8) return 9; // Lenten ferias
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && ((d >= 17 && d <= 24) || d >= 26)) return 9; // Dec 17–24, Christmas Octave
  return 13;
}

const isoKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return ymd(y, m, d);
};

const yearCache = new Map<string, Map<string, Celebration[]>>();

/**
 * Resolve the whole year's observed celebrations: occurrence (the highest
 * rank takes the day), transfer of impeded solemnities, and omission of
 * impeded feasts and memorials. Transfer is inherently a whole-year
 * operation, hence the per-year computation and cache (keyed by region,
 * since the regional transfers reshape the year).
 */
function resolveYear(year: number, region: CalendarRegion): Map<string, Celebration[]> {
  const cacheKey = `${region}:${year}`;
  const cached = yearCache.get(cacheKey);
  if (cached) return cached;

  // Candidates per day. Movables go in first so that within an equal
  // precedence the temporal cycle outranks the sanctoral (stable sort).
  const candidates = new Map<string, CelebrationDef[]>();
  const addDef = (date: Date, def: CelebrationDef) => {
    const key = isoKey(date);
    const list = candidates.get(key);
    if (list) list.push(def);
    else candidates.set(key, [def]);
  };
  for (const [date, def] of movableDefs(year, region)) addDef(date, def);
  const fixed = region === "usa" ? [...FIXED, ...USA_FIXED] : FIXED;
  for (const { m, d, name, rank, color, p, opt } of fixed) {
    addDef(ymd(year, m, d), {
      name,
      rank,
      color,
      precedence: p ?? RANK_PRECEDENCE[rank],
      ...(opt ? { optional: true } : {})
    });
  }

  // Transfer pass, in date order: a solemnity (rank 3) impeded by a rank-1/2
  // day or by a higher-placed solemnity moves to the nearest following day
  // free of anything ranked 8 or better (GNLYC 60). The codified modern
  // cases fall out of the forward scan: the Annunciation impeded by Holy
  // Week or the Easter Octave lands on the Monday after the Second Sunday
  // of Easter, the Immaculate Conception impeded by an Advent Sunday on
  // Dec 9. Transfers only ever move forward, so mutating the candidate map
  // while walking the year is safe.
  for (let date = ymd(year, 1, 1); date.getFullYear() === year; date = addDays(date, 1)) {
    const list = candidates.get(isoKey(date));
    if (!list) continue;
    list.sort((a, b) => a.precedence - b.precedence);
    const T = temporalPrecedence(date);
    let governorSeen = false;
    for (const def of [...list]) {
      if (def.precedence < 3) {
        governorSeen = true;
        continue;
      }
      if (def.precedence > 3) continue;
      if (T <= 2 || governorSeen) {
        list.splice(list.indexOf(def), 1);
        let target = addDays(date, 1);
        for (let i = 0; i < 366; i++) {
          const occupied = (candidates.get(isoKey(target)) ?? []).some((c) => c.precedence <= 8);
          if (temporalPrecedence(target) > 8 && !occupied) break;
          target = addDays(target, 1);
        }
        addDef(target, { ...def, transferredFrom: isoKey(date) });
      } else {
        governorSeen = true;
      }
    }
  }

  // Resolution pass: on each day the best precedence wins; celebrations it
  // beats — and any beaten by the temporal day itself — are omitted.
  const resolved = new Map<string, Celebration[]>();
  for (const [key, list] of candidates) {
    if (!list.length) continue;
    list.sort((a, b) => a.precedence - b.precedence);
    const best = list[0].precedence;
    if (best > temporalPrecedence(fromKey(key))) continue;
    const winners = list.filter((c) => c.precedence === best);
    // Two obligatory memorials can only collide when a movable one (the
    // Immaculate Heart, Mary Mother of the Church) lands on a fixed one;
    // the rubric (CDW Notification, Prot. 2671/98/L) demotes both to
    // optional for that year, so the feria keeps the day.
    if (best === RANK_PRECEDENCE.Memorial && winners.length > 1) continue;
    resolved.set(
      key,
      winners.map((c) => ({ ...c }))
    );
  }
  yearCache.set(cacheKey, resolved);
  return resolved;
}

export function liturgicalDay(
  date: Date = new Date(),
  region: CalendarRegion = currentRegion()
): LiturgicalDay {
  const year = date.getFullYear();
  const easter = easterDate(year);
  const ashWednesday = addDays(easter, -46);
  const holyThursday = addDays(easter, -3);
  const pentecost = addDays(easter, 49);
  const advent1 = adventStart(year);
  const christmas = ymd(year, 12, 25);
  const baptism = baptismOfTheLord(year, region);
  const dow = date.getDay();
  const weekday = WEEKDAYS[dow];

  let season: Season;
  let seasonLabel: string;
  let color: LiturgicalColor;
  let weekNum = 0;

  if (daysBetween(advent1, date) >= 0 && daysBetween(date, christmas) > 0) {
    season = "Advent";
    const week = Math.floor(daysBetween(advent1, date) / 7) + 1;
    weekNum = week;
    seasonLabel =
      dow === 0 ? `${ORDINALS[week - 1]} Sunday of Advent` : `${weekday} of the ${ORDINALS[week - 1]} Week of Advent`;
    color = dow === 0 && week === 3 ? "rose" : "violet";
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
    const lent1 = addDays(ashWednesday, 4); // First Sunday of Lent
    const week = Math.floor(daysBetween(lent1, date) / 7) + 1;
    weekNum = daysBetween(ashWednesday, date) < 4 ? 0 : week;
    if (daysBetween(ashWednesday, date) === 0) {
      seasonLabel = "Ash Wednesday";
    } else if (daysBetween(ashWednesday, date) < 4) {
      seasonLabel = `${weekday} after Ash Wednesday`;
    } else if (week === 6) {
      seasonLabel = dow === 0 ? "Palm Sunday" : `${weekday} of Holy Week`;
    } else {
      seasonLabel =
        dow === 0 ? `${ORDINALS[week - 1]} Sunday of Lent` : `${weekday} of the ${ORDINALS[week - 1]} Week of Lent`;
    }
    color = dow === 0 && week === 4 ? "rose" : "violet";
  } else if (daysBetween(holyThursday, date) >= 0 && daysBetween(date, easter) > 0) {
    season = "Sacred Triduum";
    seasonLabel = ["Holy Thursday", "Good Friday", "Holy Saturday"][daysBetween(holyThursday, date)] ?? weekday;
    color = daysBetween(date, easter) === 2 ? "red" : "violet";
  } else if (daysBetween(easter, date) >= 0 && daysBetween(date, pentecost) >= 0) {
    season = "Eastertide";
    const week = Math.floor(daysBetween(easter, date) / 7) + 1;
    weekNum = week;
    if (daysBetween(easter, date) === 0) seasonLabel = "Easter Sunday";
    else if (daysBetween(date, pentecost) === 0) seasonLabel = "Pentecost Sunday";
    else if (daysBetween(easter, date) < 7) seasonLabel = `${weekday} within the Octave of Easter`;
    else
      seasonLabel =
        dow === 0 ? `${ORDINALS[week - 1]} Sunday of Easter` : `${weekday} of the ${ORDINALS[week - 1]} Week of Easter`;
    color = daysBetween(date, pentecost) === 0 ? "red" : "white";
  } else {
    season = "Ordinary Time";
    let week: number;
    if (daysBetween(date, ashWednesday) > 0) {
      // Ordinary Time I: counted from the Baptism of the Lord (week 1). When
      // the Baptism falls on Monday (USA, Epiphany on Jan 7/8), the count
      // anchors on the Epiphany Sunday so the next Sunday is still the Second
      // Sunday in Ordinary Time.
      const anchor = baptism.getDay() === 0 ? baptism : addDays(baptism, -1);
      week = Math.floor(daysBetween(anchor, date) / 7) + 1;
    } else {
      // Ordinary Time II: counted backwards from Christ the King (week 34).
      const christKing = addDays(advent1, -7);
      week = 34 - Math.floor(daysBetween(date, addDays(christKing, 6)) / 7);
    }
    week = Math.min(Math.max(week, 1), 34);
    weekNum = week;
    seasonLabel =
      dow === 0
        ? `${ORDINALS[week - 1]} Sunday in Ordinary Time`
        : `${weekday} of the ${ORDINALS[week - 1]} Week in Ordinary Time`;
    color = "green";
  }

  // Only celebrations actually observed this day survive resolution; the
  // governing one comes first and, when it takes the day, takes its color.
  // Suppressed and transferred celebrations do not appear here at all.
  const celebrations = resolveYear(year, region).get(isoKey(date)) ?? [];
  const top = celebrations[0];
  if (top?.color) color = top.color;

  return { date, season, seasonLabel, week: weekNum, color, celebrations };
}

export const COLOR_HEX: Record<LiturgicalColor, string> = {
  green: "#2e7d32",
  violet: "#5e35b1",
  white: "#c9a227",
  red: "#c62828",
  rose: "#d81b60",
  black: "#424242"
};
