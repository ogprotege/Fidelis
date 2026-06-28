/**
 * Daily Mass readings resolver — maps a calendar date to the Roman lectionary
 * day codes and reading citations, following the cycles:
 *   Sundays: Year A / B / C (year C when the civil year ending the liturgical
 *            year is divisible by 3)
 *   Weekdays of Ordinary Time: Year I (odd civil years) / Year II (even)
 *
 * Citation data: public/data/lectionary.json, derived from the public-domain
 * tables of jayarathina/Tamil-Catholic-Lectionary (see scripts/build-lectionary.mjs).
 */
import {
  CalendarRegion,
  adventStart,
  currentRegion,
  easterDate,
  epiphanyDate,
  liturgicalDay
} from "./liturgical";
import { Book } from "./canon";

export interface LectionaryRow {
  /** 1 first reading · 2 responsorial psalm · 3 second reading · 6 gospel
   *  (fractional values are options/parts, e.g. the Easter Vigil's 1.01–1.07) */
  t: number;
  /** canonical book slug */
  b: string;
  /** verse spans [chapter, fromVerse, toVerse]; toVerse 999 = end of chapter.
   *  Psalms are cited in modern numbering (chapters Hebrew, verses
   *  English-style with superscriptions unnumbered) — convert with
   *  hebrewSpanToVulgate() before loading text from the bundled texts. */
  s: [number, number, number][];
  /** true when the source citation had sub-verse detail we cannot split */
  partial?: boolean;
}

export type LectionaryData = Record<string, LectionaryRow[]>;

export interface DayReadings {
  /** the lectionary day code(s) the readings came from */
  code: string;
  rows: LectionaryRow[];
  /** Heading shown over the primary set when a secondary set exists
   *  (e.g. "Proper of the Memorial", "Mass of the Lord's Supper (evening)"). */
  primaryLabel?: string;
  /** An alternative set of readings for the same day: the ferial cycle
   *  behind a memorial's prescribed propers (P1-6), or the Chrism Mass on
   *  Holy Thursday morning (P2-7). */
  secondary?: { label: string; code: string; rows: LectionaryRow[] };
}

let cache: Promise<LectionaryData> | null = null;
export function loadLectionary(): Promise<LectionaryData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/lectionary.json`).then((r) => {
    if (!r.ok) throw new Error(`lectionary data: HTTP ${r.status}`);
    return r.json();
  });
  return cache;
}

export type SundayCycle = "A" | "B" | "C";

export function sundayCycle(date: Date): SundayCycle {
  const y = date.getFullYear();
  const litYearEnd = date >= adventStart(y) ? y + 1 : y;
  return (["C", "A", "B"] as const)[litYearEnd % 3];
}

/** Weekday lectionary cycle: Year I in odd civil years, Year II in even.
 *  Keying on the CIVIL year (not the liturgical year, which rolls at Advent) is
 *  valid only because the `wd` suffix is appended exclusively to Ordinary Time
 *  codes, and Ordinary Time never crosses the late-December Advent boundary —
 *  so its civil-year parity always matches the liturgical year. Do not reuse
 *  weekdayCycle for an Advent/Christmas weekday without revisiting this. */
export function weekdayCycle(date: Date): "1" | "2" {
  return date.getFullYear() % 2 === 1 ? "1" : "2";
}

const DAY_CODE = ["0Sun", "1Mon", "2Tue", "3Wed", "4Thu", "5Fri", "6Sat"];

/** Our liturgical engine's celebration names -> lectionary dayIDs. */
const NAMED: Record<string, string> = {
  "Mary, the Holy Mother of God": "Blessed Virgin Mary, the Mother of God",
  "Sts. Basil the Great and Gregory Nazianzen, Doctors":
    "Saints Basil the Great and Gregory Nazianzen, bishops and doctors",
  "St. Agnes, Virgin and Martyr": "Saint Agnes, virgin and martyr",
  "The Conversion of St. Paul, Apostle": "The Conversion of Saint Paul, apostle",
  "Sts. Timothy and Titus, Bishops": "Saints Timothy and Titus, bishops",
  "St. Thomas Aquinas, Priest and Doctor": "Saint Thomas Aquinas, priest and doctor",
  "St. John Bosco, Priest": "Saint John Bosco, priest",
  "The Presentation of the Lord (Candlemas)": "Presentation of the Lord",
  "Our Lady of Lourdes": "Our Lady of Lourdes",
  "Sts. Cyril and Methodius": "Saints Cyril, monk, and Methodius, bishop",
  "The Chair of St. Peter, Apostle": "Chair of Saint Peter, apostle",
  "St. Patrick, Bishop": "Saint Patrick, bishop",
  "St. Joseph, Spouse of the Blessed Virgin Mary":
    "Saint Joseph Husband of the Blessed Virgin Mary",
  "The Annunciation of the Lord": "Annunciation of the Lord",
  "St. Mark, Evangelist": "Saint Mark the Evangelist",
  "St. Catherine of Siena, Virgin and Doctor":
    "Saint Catherine of Siena, virgin and doctor of the Church",
  "St. Athanasius, Bishop and Doctor": "Saint Athanasius, bishop and doctor",
  "St. Joseph the Worker": "Saint Joseph the Worker",
  "Sts. Philip and James, Apostles": "Saints Philip and James, Apostles",
  "St. Matthias, Apostle": "Saint Matthias the Apostle",
  "The Visitation of the Blessed Virgin Mary": "Visitation of the Blessed Virgin Mary",
  "St. Boniface, Bishop and Martyr": "Saint Boniface, bishop and martyr",
  "St. Barnabas, Apostle": "Saint Barnabas the Apostle",
  "St. Anthony of Padua, Priest and Doctor": "Saint Anthony of Padua, priest and doctor",
  "The Nativity of St. John the Baptist": "Birth of Saint John the Baptist",
  "St. Irenaeus, Bishop, Martyr and Doctor": "Saint Irenaeus, bishop and martyr",
  "Sts. Peter and Paul, Apostles": "Saints Peter and Paul, Apostles",
  "St. Thomas, Apostle": "Saint Thomas the Apostle",
  "St. Benedict, Abbot": "Saint Benedict, abbot",
  "Our Lady of Mount Carmel": "Our Lady of Mount Carmel",
  "St. Mary Magdalene": "Saint Mary Magdalene",
  "St. James, Apostle": "Saint James, apostle",
  "Sts. Joachim and Anne, Parents of the BVM": "Saints Joachim and Anne",
  "Sts. Martha, Mary and Lazarus": "Saints Martha, Mary and Lazarus",
  "St. Ignatius of Loyola, Priest": "Saint Ignatius of Loyola, priest",
  "St. Alphonsus Liguori, Bishop and Doctor":
    "Saint Alphonsus Maria de Liguori, bishop and doctor of the Church",
  "St. John Vianney, Priest": "Saint Jean Vianney (the Curé of Ars), priest",
  "The Transfiguration of the Lord": "Transfiguration of the Lord",
  "St. Dominic, Priest": "Saint Dominic, priest",
  "St. Lawrence, Deacon and Martyr": "Saint Lawrence, deacon and martyr",
  "St. Clare, Virgin": "Saint Clare, virgin",
  "St. Maximilian Kolbe, Priest and Martyr": "Saint Maximilian Mary Kolbe, priest and martyr",
  "The Assumption of the Blessed Virgin Mary": "Assumption of the Blessed Virgin Mary",
  "The Queenship of the Blessed Virgin Mary": "Queenship of Blessed Virgin Mary",
  "St. Bartholomew, Apostle": "Saint Bartholomew the Apostle",
  "St. Monica": "Saint Monica",
  "St. Augustine, Bishop and Doctor": "Saint Augustine of Hippo, bishop and doctor of the Church",
  "The Passion of St. John the Baptist": "The Beheading of Saint John the Baptist, martyr",
  "The Nativity of the Blessed Virgin Mary": "Birth of the Blessed Virgin Mary",
  "The Exaltation of the Holy Cross": "Exaltation of the Holy Cross",
  "Our Lady of Sorrows": "Our Lady of Sorrows",
  "St. Matthew, Apostle and Evangelist": "Saint Matthew the Evangelist, Apostle, Evangelist",
  "Sts. Michael, Gabriel and Raphael, Archangels":
    "Saints Michael, Gabriel and Raphael, Archangels",
  "St. Jerome, Priest and Doctor": "Saint Jerome, priest and doctor",
  "St. Thérèse of the Child Jesus, Virgin and Doctor":
    "Saint Thérèse of the Child Jesus, virgin and doctor",
  "The Holy Guardian Angels": "Guardian Angels",
  "St. Francis of Assisi": "Saint Francis of Assisi",
  "Our Lady of the Rosary": "Our Lady of the Rosary",
  "St. Teresa of Jesus (Ávila), Virgin and Doctor": "Saint Teresa of Jesus, virgin and doctor",
  "St. Ignatius of Antioch, Bishop and Martyr": "Saint Ignatius of Antioch, bishop and martyr",
  "St. Luke, Evangelist": "Saint Luke the Evangelist",
  "Sts. John de Brébeuf and Isaac Jogues, Priests, and Companions, Martyrs":
    "Saints Jean de Brébeuf, Isaac Jogues, priests and martyrs; and their companions, martyrs",
  "Sts. Simon and Jude, Apostles": "Saint Simon and Saint Jude, apostles",
  "All Saints": "All Saints",
  "The Commemoration of All the Faithful Departed (All Souls)": "All Souls",
  "The Dedication of the Lateran Basilica": "Dedication of the Lateran basilica",
  "St. Martin of Tours, Bishop": "Saint Martin of Tours, bishop",
  "The Presentation of the Blessed Virgin Mary": "Presentation of the Blessed Virgin Mary",
  "St. Cecilia, Virgin and Martyr": "Saint Cecilia",
  "St. Andrew, Apostle": "Saint Andrew the Apostle",
  "The Immaculate Conception of the Blessed Virgin Mary":
    "Immaculate Conception of the Blessed Virgin Mary",
  "St. Lucy, Virgin and Martyr": "Saint Lucy of Syracuse, virgin and martyr",
  "St. John of the Cross, Priest and Doctor": "Saint John of the Cross, priest and doctor",
  "St. Ambrose, Bishop and Doctor": "Saint Ambrose, bishop and doctor",
  "The Nativity of the Lord (Christmas)": "Nativity of the Lord 4",
  "St. Stephen, the First Martyr": "Saint Stephen, the first martyr",
  "St. John, Apostle and Evangelist": "Saint John the Apostle and evangelist",
  "The Holy Innocents, Martyrs": "Holy Innocents, martyrs",
  // movable (the Epiphany and Ascension dates depend on the calendar region)
  "The Epiphany of the Lord": "CW03-Epiphany",
  "The Ascension of the Lord": "EW07-Ascension",
  "Pentecost Sunday": "EW08-Pentecost",
  "Mary, Mother of the Church": "OW00-MaryMotherofChurch",
  "The Most Holy Trinity": "OW00-Trinity",
  "The Most Holy Body and Blood of Christ (Corpus Christi)": "OW00-CorpusChristi",
  "The Most Sacred Heart of Jesus": "OW00-SacredHeart",
  "The Immaculate Heart of the Blessed Virgin Mary": "OW00-ImmaculateHeart",
  "The Holy Family of Jesus, Mary and Joseph": "CW01-HolyFamily",
  "The Baptism of the Lord": "CW04-Baptism"
};

const ww = (n: number) => String(n).padStart(2, "0");

export interface CandidateGroup {
  codes: string[];
  /** proper = governing solemnity/feast Mass · seasonal = the ferial cycle
   *  · memorial = an observed memorial's own formulary */
  kind: "proper" | "seasonal" | "memorial";
  /** celebration name for sanctoral groups */
  name?: string;
  /** optional memorial: its formulary stays behind the ferial readings */
  optional?: boolean;
}

/**
 * Ordered candidate groups of day codes for a date, tagged with provenance.
 * Within one group the codes complement each other (e.g. "OW10-4Thu 2"
 * supplies the Year II first reading and psalm, "OW10-4Thu" the gospel
 * shared by both years).
 */
export function dayCodeGroups(
  date: Date,
  region: CalendarRegion = currentRegion()
): CandidateGroup[] {
  const lit = liturgicalDay(date, region);
  const dow = date.getDay();
  const cyc = sundayCycle(date);
  const wd = weekdayCycle(date);
  const groups: CandidateGroup[] = [];
  const seasonal = (...lists: string[][]) => {
    for (const codes of lists) groups.push({ codes, kind: "seasonal" });
  };

  // The calendar engine resolves precedence, transfer and suppression, so
  // lit.celebrations holds only what is observed today, the governing
  // celebration first. Day codes are a consequence of that resolution, not
  // a parallel reimplementation of it: a governing solemnity or feast brings
  // its proper Mass, the seasonal cycle follows as fallback, and memorial
  // formularies trail the ferial readings (resolveReadings promotes the
  // marked, prescribed ones — see below).
  const governing = lit.celebrations[0];
  if (governing && (governing.rank === "Solemnity" || governing.rank === "Feast")) {
    const id = NAMED[governing.name];
    if (id) groups.push({ codes: [`${id} ${cyc}`, id], kind: "proper", name: governing.name });
  }

  const day = DAY_CODE[dow];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  switch (lit.season) {
    case "Advent":
      if (m === 12 && d >= 17 && d <= 24 && dow !== 0) {
        seasonal([`AW05-Dec${d}`]);
      } else if (dow === 0) {
        seasonal([`AW${ww(lit.week)}-0Sun ${cyc}`, `AW${ww(lit.week)}-0Sun`]);
      } else {
        seasonal([`AW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Christmastide": {
      if (m === 12) {
        if (d === 25)
          seasonal(
            ["Nativity of the Lord 4"],
            ["Nativity of the Lord 2"],
            ["Nativity of the Lord 1"]
          );
        else if (d >= 29) seasonal([`CW01-Dec${d}`]);
        // Dec 26–28 are covered by the named feast map above
      } else {
        // Epiphany is region-movable (Jan 6, or USA the Sunday of Jan 2–8);
        // "CW03-DayN" weekday readings count from it wherever it falls.
        const epiphany = epiphanyDate(y, region);
        const n = Math.round((date.getTime() - epiphany.getTime()) / 86_400_000);
        if (n === 0) seasonal(["CW03-Epiphany"]);
        else if (dow === 0 && n < 0) seasonal(["CW02-0Sun"]);
        else if (n < 0) seasonal([`CW02-Jan${d}`]);
        else seasonal([`CW03-Day${n}`, `CW02-Jan${d}`]);
      }
      break;
    }
    case "Lent":
      if (dow === 0) {
        seasonal([`LW${ww(lit.week)}-0Sun ${cyc}`, `LW${ww(lit.week)}-0Sun`]);
      } else {
        seasonal([`LW${ww(lit.week)}-${day} ${cyc}`, `LW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Sacred Triduum": {
      const easter = easterDate(y);
      const off = 3 - Math.round((easter.getTime() - date.getTime()) / 86_400_000); // 0 Thu,1 Fri,2 Sat
      const code = ["LW06-4Thu", "LW06-5Fri", "LW06-6Sat"][off];
      seasonal([`${code} ${cyc}`, code]);
      break;
    }
    case "Eastertide":
      if (dow === 0) {
        seasonal([`EW${ww(lit.week)}-0Sun ${cyc}`, `EW${ww(lit.week)}-0Sun`]);
      } else {
        seasonal([`EW${ww(lit.week)}-${day} ${cyc}`, `EW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Ordinary Time":
      if (dow === 0) {
        seasonal([`OW${ww(lit.week)}-0Sun ${cyc}`, `OW${ww(lit.week)}-0Sun`]);
      } else {
        seasonal([`OW${ww(lit.week)}-${day} ${wd}`, `OW${ww(lit.week)}-${day}`]);
      }
      break;
  }

  // After the ferial cycle, offer proper readings of observed memorials as a
  // fallback (suppressed memorials never reach this point).
  for (const c of lit.celebrations) {
    if (c.rank !== "Memorial") continue;
    const id = NAMED[c.name];
    if (id)
      groups.push({
        codes: [`${id} ${cyc}`, id],
        kind: "memorial",
        name: c.name,
        optional: c.optional
      });
  }
  // Sanity net: the Baptism of the Lord is computed as a celebration; if some
  // edge date produced nothing, fall back to nearest OT week 1 weekday.
  if (!groups.length) seasonal([`OW01-${day} ${wd}`, `OW01-${day}`]);
  return groups;
}

/** The candidate groups as bare code lists (provenance dropped). */
export function dayCodeCandidates(
  date: Date,
  region: CalendarRegion = currentRegion()
): string[][] {
  return dayCodeGroups(date, region).map((g) => g.codes);
}

function mergeGroup(data: LectionaryData, codes: string[]): { code: string; rows: LectionaryRow[] } {
  const rows: LectionaryRow[] = [];
  const seen = new Set<number>();
  const used: string[] = [];
  for (const code of codes) {
    const found = data[code];
    if (!found?.length) continue;
    const adding = found.filter((r) => !seen.has(Math.floor(r.t)));
    // Only codes that contribute rows belong in the displayed "code" label.
    if (adding.length) used.push(code);
    rows.push(...adding);
    for (const r of found) seen.add(Math.floor(r.t));
  }
  rows.sort((a, b) => a.t - b.t);
  return { code: used.join(" + "), rows };
}

/** Resolve the Mass readings for a date. */
/**
 * The source tables mark prescribed memorial propers with a thousandths
 * suffix on t (Barnabas 1.001, Guardian Angels 6.001, Martha 6.101/6.201,
 * Mary Mother of the Church 1.109/6.009): the celebration's own formulary
 * is appointed for the day, not merely suggested from the commons.
 */
const hasProperMarker = (r: LectionaryRow) => Math.round(r.t * 1000) % 10 !== 0;

/** Resolve the Mass readings for a date against loaded lectionary data. */
export function resolveReadings(
  data: LectionaryData,
  date: Date,
  region: CalendarRegion = currentRegion()
): DayReadings | null {
  const merged = dayCodeGroups(date, region).map((g) => ({
    group: g,
    ...mergeGroup(data, g.codes)
  }));
  const withGospel = merged.filter((m) => m.rows.some((r) => Math.floor(r.t) === 6));
  const best = withGospel[0];
  if (!best) return null;

  // A proper gospel without its own first reading is supplemented by the
  // ferial readings of the day.
  const supplement = (target: { rows: LectionaryRow[] }) => {
    if (target.rows.some((r) => Math.floor(r.t) === 1)) return;
    const ferial = merged.find(
      (mm) => mm.rows !== target.rows && mm.rows.some((r) => Math.floor(r.t) === 1)
    );
    if (ferial) {
      target.rows.push(...ferial.rows.filter((r) => Math.floor(r.t) !== 6));
      target.rows.sort((a, b) => a.t - b.t);
    }
  };

  // P1-6: an observed OBLIGATORY memorial whose formulary carries the proper
  // marker has prescribed readings — it takes the day, with the ferial cycle
  // offered alongside. Optional memorials (e.g. St. Joseph the Worker) and
  // unmarked memorial readings stay behind the ferial (correct praxis), and
  // a governing solemnity or feast is never displaced.
  if (best.group.kind !== "proper") {
    const memorial = withGospel.find(
      (m) => m.group.kind === "memorial" && !m.group.optional && m.rows.some(hasProperMarker)
    );
    if (memorial && memorial !== best) {
      supplement(memorial);
      return {
        code: memorial.code,
        rows: memorial.rows,
        primaryLabel: "Proper of the Memorial",
        secondary: { label: "Ferial readings of the day", code: best.code, rows: best.rows }
      };
    }
  }
  supplement(best);

  // P2-7: Holy Thursday carries two Masses — the evening Mass of the Lord's
  // Supper governs the day; the morning Chrism Mass is offered alongside.
  if (best.group.codes.includes("LW06-4Thu") && data["LW06-4Thu~Chrism"]?.length) {
    return {
      code: best.code,
      rows: best.rows,
      primaryLabel: "Mass of the Lord's Supper (evening)",
      secondary: {
        label: "Chrism Mass (morning)",
        code: "LW06-4Thu~Chrism",
        rows: data["LW06-4Thu~Chrism"]
      }
    };
  }
  return { code: best.code, rows: best.rows };
}

export async function readingsForDate(date: Date): Promise<DayReadings | null> {
  return resolveReadings(await loadLectionary(), date);
}

/**
 * Verses the bundled Vulgate-versified text spends on each psalm's
 * superscription before the body begins (0, +1 or +2), indexed by the modern
 * (lectionary) psalm number: bundle verse = cited verse + offset. Anchored at
 * the head of the psalm — where the Vulgate also splits or joins verses
 * mid-psalm (sub-verse drift the shared grid cannot express), early verses
 * stay exact and late ones may sit one slot off. Split/joined psalms
 * (9/10, 114/115, 116, 147) carry 0 here and are handled in code.
 */
// prettier-ignore
const PSALM_TITLE_VERSES = [0,
  0, 0, 1, 1, 1, 1, 1, 1, 0, 0, //   1-10
  1, 1, 0, 0, 0, 0, 0, 1, 1, 1, //  11-20
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, //  21-30
  1, 0, 0, 1, 0, 1, 0, 1, 1, 1, //  31-40
  1, 1, 0, 1, 1, 1, 1, 1, 1, 0, //  41-50
  2, 2, 0, 2, 1, 1, 1, 1, 1, 2, //  51-60
  1, 1, 1, 1, 1, 0, 1, 1, 1, 1, //  61-70
  0, 1, 0, 0, 1, 1, 1, 0, 0, 1, //  71-80
  1, 0, 1, 1, 1, 0, 0, 1, 1, 0, //  81-90
  0, 1, 0, 0, 0, 0, 0, 0, 0, 1, //  91-100
  0, 1, 0, 0, 0, 0, 0, 1, 1, 0, // 101-110
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 111-120
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 121-130
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 131-140
  0, 1, 0, 0, 0, 1, 0, 0, 0, 0  // 141-150
];

/**
 * Psalms where the shared grid splits or joins English verses mid-psalm, so a
 * flat title offset cannot track the whole psalm. `after: [pivot, offset]` —
 * verses >= pivot use this offset instead of the title offset. `wide` — an
 * English verse whose text spans two slots, so a span ending there reaches
 * one slot further.
 */
const IRREGULAR: Record<number, { after?: [number, number]; wide?: number }> = {
  2: { wide: 12 }, // Vulg 2:12-13 = Ps 2:12 (tail split)
  4: { wide: 8 }, // Vulg 4:9-10 = Ps 4:8 (tail split)
  43: { wide: 4 }, // Vulg 42:4-5 = Ps 43:4 in DRC (the harp clause is slot 5, which also opens v5; better whole than halved)
  44: { after: [22, 0] }, // Vulg 43:22 = Ps 44:21-22
  53: { after: [2, 1], wide: 1 }, // Vulg 52:1-2 = title + Ps 53:1
  56: { after: [11, 0] }, // Vulg 55:11 = Ps 56:10-11
  72: { after: [2, 0] }, // Vulg 71:2 = Ps 72:1-2
  100: { after: [2, 0] }, // Vulg 99:2 = Ps 100:1-2
  109: { after: [2, 0] }, // Vulg 108:2-3 = Ps 109:1-3 (drift), exact from v4
  126: { wide: 6 }, // Vulg 125:6-7 = Ps 126:6 in DRC/CPDV (tail split)
  146: { after: [2, 0] } // Vulg 145:2 = Ps 146:1-2
};

/**
 * Modern (lectionary) psalm citation span -> span(s) in the bundled
 * Vulgate-versified text, as [chapter, fromVerse, toVerse][]. The lectionary
 * counts verses English-style (superscriptions unnumbered); the bundles are
 * Vulgate-versified, with split chapters renumbered from 1. toVerse 999
 * (= end of the cited psalm) is preserved or resolved as the split requires.
 *
 * NOTE: this maps MODERN psalm numbers only. The Verse of the Day (votd.ts)
 * already stores Vulgate numbers and must NOT be routed through here.
 */
export function hebrewSpanToVulgate(ch: number, v1: number, v2: number): [number, number, number][] {
  // Joined: two modern psalms share one Vulgate chapter.
  if (ch === 9) return [[9, v1 + 1, v2 === 999 ? 21 : v2 + 1]]; // Vulg 9:1 title, 9:2-21 = Ps 9
  if (ch === 10) return [[9, v1 + 21, v2 === 999 ? 999 : v2 + 21]]; // Vulg 9:22-39 = Ps 10
  if (ch === 114) return [[113, v1, v2 === 999 ? 8 : v2]]; // Vulg 113:1-8 = Ps 114
  if (ch === 115) return [[113, v1 + 8, v2 === 999 ? 999 : v2 + 8]]; // Vulg 113:9-26 = Ps 115
  // Split: one modern psalm spans two Vulgate chapters (renumbered from 1).
  if (ch === 116 || ch === 147) {
    const cut = ch === 116 ? 9 : 11; // verses of the first Vulgate chapter
    const lo = ch === 116 ? 114 : 146;
    const out: [number, number, number][] = [];
    if (v1 <= cut) out.push([lo, v1, v2 !== 999 && v2 <= cut ? v2 : cut]);
    if (v2 === 999 || v2 > cut) out.push([lo + 1, Math.max(v1 - cut, 1), v2 === 999 ? 999 : v2 - cut]);
    return out;
  }
  const vulg = ch <= 8 || ch >= 148 ? ch : ch - 1;
  const off = PSALM_TITLE_VERSES[ch] ?? 0;
  const irr = IRREGULAR[ch];
  const at = (v: number) => v + (irr?.after && v >= irr.after[0] ? irr.after[1] : off);
  if (v2 === 999) return [[vulg, at(v1), 999]];
  return [[vulg, at(v1), at(v2) + (irr?.wide === v2 ? 1 : 0)]];
}

export const READING_LABELS: Record<number, string> = {
  1: "First Reading",
  2: "Responsorial Psalm",
  3: "Second Reading",
  6: "Gospel"
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface LabeledReading {
  label: string;
  row: LectionaryRow;
}

/** Decompose a row's t: integer reading type, then hundredths read as
 *  position (tens digit) and variant (units digit) — e.g. 1.21 -> type 1,
 *  position 2, variant 1 (the shorter form of position 2). */
function tParts(r: LectionaryRow): { g: number; pos: number; variant: number } {
  const g = Math.floor(r.t);
  const u = Math.round((r.t - g) * 100);
  return { g, pos: Math.floor(u / 10), variant: u % 10 };
}

/**
 * Lay out a day's readings for display: ordered sections of labeled rows.
 *
 * The Easter Vigil (LW06-6Sat) is the special case (P1-7): its 1.x rows are
 * the Liturgy-of-the-Word ladder (1.1–1.7 = Reading I–VII, 1.8 = Epistle),
 * each 2.x psalm interleaves after its reading, and the Gospel closes the
 * sequence. Elsewhere rows group by reading type; within a group an x.N1 row
 * of the same book is the shorter form of its x.N primary ("or, shorter
 * form"), and the remaining rows are genuine options.
 */
export function displayReadings(reading: DayReadings): LabeledReading[][] {
  const rows = [...reading.rows].sort((a, b) => a.t - b.t);

  if (reading.code.includes("LW06-6Sat")) {
    const sections: LabeledReading[][] = [];
    for (let p = 1; p <= 8; p++) {
      const sec: LabeledReading[] = [];
      rows
        .filter((r) => tParts(r).g === 1 && tParts(r).pos === p)
        .forEach((r, i) =>
          sec.push({
            label:
              i === 0 ? (p === 8 ? "Epistle" : `Reading ${ROMAN[p - 1]}`) : "or (shorter form)",
            row: r
          })
        );
      rows
        .filter((r) => tParts(r).g === 2 && tParts(r).pos === p)
        .forEach((r, i) => sec.push({ label: i === 0 ? "Responsorial Psalm" : "or", row: r }));
      if (sec.length) sections.push(sec);
    }
    const gospels = rows.filter((r) => tParts(r).g === 6);
    if (gospels.length) {
      sections.push(
        gospels.map((r, i) => ({ label: i === 0 ? "Gospel" : "or (alternative form)", row: r }))
      );
    }
    // Safety net: any row the ladder did not claim still renders.
    const claimed = new Set(sections.flat().map((x) => x.row));
    const rest = rows.filter((r) => !claimed.has(r));
    if (rest.length) {
      sections.push(
        rest.map((r) => ({ label: READING_LABELS[Math.floor(r.t)] ?? "Reading", row: r }))
      );
    }
    return sections;
  }

  const sections: LabeledReading[][] = [];
  for (const g of [...new Set(rows.map((r) => Math.floor(r.t)))].sort((a, b) => a - b)) {
    const list = rows.filter((r) => Math.floor(r.t) === g);
    const isShorterForm = (r: LectionaryRow) => {
      const { pos, variant } = tParts(r);
      return (
        variant !== 0 &&
        pos > 0 &&
        list.some((p) => p.b === r.b && tParts(p).pos === pos && tParts(p).variant === 0)
      );
    };
    const main = READING_LABELS[g] ?? "Reading";
    const primaries = list.filter((r) => !isShorterForm(r)).length;
    const sec: LabeledReading[] = [];
    let opt = 0;
    for (const r of list) {
      if (isShorterForm(r)) {
        sec.push({ label: "or (shorter form)", row: r });
      } else {
        sec.push({
          label:
            opt === 0
              ? main
              : primaries > 2
                ? `${main} — option ${opt + 1}`
                : "or (alternative form)",
          row: r
        });
        opt++;
      }
    }
    sections.push(sec);
  }
  return sections;
}

/** Human citation like "1 Kings 18:41-46" or "Psalm 51(50):3-4,5-6". Psalms
 *  show the modern chapter with the Vulgate chapter in parentheses (when they
 *  differ), and the Vulgate-grid verse numbers that match the rendered text. */
export function formatCitation(row: LectionaryRow, bookName: string): string {
  const isPsalm = row.b === "psalms";
  const groups: { label: string; ranges: [number, number][] }[] = [];
  const push = (label: string, v1: number, v2: number) => {
    const g = groups[groups.length - 1];
    if (g?.label === label) {
      const last = g.ranges[g.ranges.length - 1];
      // grid joins can land consecutive stanzas on overlapping slots
      if (v1 <= last[1]) {
        last[0] = Math.min(last[0], v1);
        last[1] = Math.max(last[1], v2);
      } else {
        g.ranges.push([v1, v2]);
      }
    } else {
      groups.push({ label, ranges: [[v1, v2]] });
    }
  };
  for (const [ch, v1, v2] of row.s) {
    if (isPsalm) {
      for (const [vc, mv1, mv2] of hebrewSpanToVulgate(ch, v1, v2)) {
        push(vc === ch ? `${ch}` : `${ch}(${vc})`, mv1, mv2);
      }
    } else {
      push(`${ch}`, v1, v2);
    }
  }
  const parts = groups.map(
    ({ label, ranges }) =>
      `${label}:${ranges
        .map(([a, b]) => (b === 999 ? `${a}ff` : a === b ? `${a}` : `${a}-${b}`))
        .join(",")}`
  );
  return `${bookName} ${parts.join("; ")}`;
}

/** The citation for a Mass reading, always in the MODERN book name
 *  ("2 Kings 4:8-11", never the Douay "4 Kings" or the Latin "Liber IV Regum").
 *  The Roman lectionary is promulgated and universally referenced in modern
 *  form, so a reading's reference label must not inherit the reader's chosen
 *  Bible naming — even when the text itself is rendered from the bundled
 *  Douay-Rheims. (The Bible Reader and book picker stay translation-aware; only
 *  the lectionary citation is pinned to the modern name.) */
export function formatLectionaryCitation(row: LectionaryRow, book: Book): string {
  return formatCitation(row, book.name);
}
