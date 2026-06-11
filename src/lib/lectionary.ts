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
import { adventStart, easterDate, liturgicalDay } from "./liturgical";

export interface LectionaryRow {
  /** 1 first reading · 2 responsorial psalm · 3 second reading · 6 gospel
   *  (fractional values are options/parts, e.g. the Easter Vigil's 1.01–1.07) */
  t: number;
  /** canonical book slug */
  b: string;
  /** verse spans [chapter, fromVerse, toVerse]; toVerse 999 = end of chapter.
   *  Psalm chapters are cited in modern (Hebrew) numbering — convert with
   *  hebrewToVulgatePsalm() before loading text from the bundled texts. */
  s: [number, number, number][];
  /** true when the source citation had sub-verse detail we cannot split */
  partial?: boolean;
}

export type LectionaryData = Record<string, LectionaryRow[]>;

export interface DayReadings {
  /** the lectionary day code(s) the readings came from */
  code: string;
  rows: LectionaryRow[];
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

/** Weekday lectionary cycle: Year I in odd civil years, Year II in even. */
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
  // movable
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

/**
 * Ordered candidate groups of day codes for a date. Within one group the
 * codes complement each other (e.g. "OW10-4Thu 2" supplies the Year II first
 * reading and psalm, "OW10-4Thu" the gospel shared by both years).
 */
export function dayCodeCandidates(date: Date): string[][] {
  const lit = liturgicalDay(date);
  const dow = date.getDay();
  const cyc = sundayCycle(date);
  const wd = weekdayCycle(date);
  const groups: string[][] = [];

  // Feasts of the Lord, which (unlike saints' feasts) replace a Sunday of
  // Ordinary Time or Christmastide when they fall on one.
  const FEASTS_OF_THE_LORD = new Set([
    "The Presentation of the Lord (Candlemas)",
    "The Transfiguration of the Lord",
    "The Exaltation of the Holy Cross",
    "The Dedication of the Lateran Basilica",
    "The Commemoration of All the Faithful Departed (All Souls)",
    "The Baptism of the Lord",
    "The Holy Family of Jesus, Mary and Joseph"
  ]);
  // Celebrations that *are* particular Sundays.
  const SUNDAY_CELEBRATIONS = new Set(["Pentecost Sunday", "The Ascension of the Lord"]);

  // Proper of a solemnity or feast takes precedence over the ferial cycle;
  // memorials normally keep the weekday readings (their propers come after).
  // On Sundays, precedence narrows: the privileged Sundays of Advent, Lent
  // and Eastertide yield to nothing here, and other Sundays yield only to
  // solemnities and feasts of the Lord.
  const named = (ranks: string[]) => {
    for (const c of lit.celebrations) {
      if (!ranks.includes(c.rank)) continue;
      if (dow === 0 && !SUNDAY_CELEBRATIONS.has(c.name)) {
        if (lit.season === "Advent" || lit.season === "Lent" || lit.season === "Eastertide")
          continue;
        if (c.rank !== "Solemnity" && !FEASTS_OF_THE_LORD.has(c.name)) continue;
      }
      const id = NAMED[c.name];
      if (id) groups.push([`${id} ${cyc}`, id]);
    }
  };
  named(["Solemnity", "Feast"]);

  const day = DAY_CODE[dow];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  switch (lit.season) {
    case "Advent":
      if (m === 12 && d >= 17 && d <= 24 && dow !== 0) {
        groups.push([`AW05-Dec${d}`]);
      } else if (dow === 0) {
        groups.push([`AW${ww(lit.week)}-0Sun ${cyc}`, `AW${ww(lit.week)}-0Sun`]);
      } else {
        groups.push([`AW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Christmastide": {
      if (m === 12) {
        if (d === 25)
          groups.push(
            ["Nativity of the Lord 4"],
            ["Nativity of the Lord 2"],
            ["Nativity of the Lord 1"]
          );
        else if (d >= 29) groups.push([`CW01-Dec${d}`]);
        // Dec 26–28 are covered by the named feast map above
      } else {
        const epiphany = new Date(y, 0, 6);
        if (d === 6) groups.push(["CW03-Epiphany"]);
        else if (dow === 0 && date < epiphany) groups.push(["CW02-0Sun"]);
        else if (date < epiphany) groups.push([`CW02-Jan${d}`]);
        else {
          const n = Math.round((date.getTime() - epiphany.getTime()) / 86_400_000);
          groups.push([`CW03-Day${n}`, `CW02-Jan${d}`]);
        }
      }
      break;
    }
    case "Lent":
      if (dow === 0) {
        groups.push([`LW${ww(lit.week)}-0Sun ${cyc}`, `LW${ww(lit.week)}-0Sun`]);
      } else {
        groups.push([`LW${ww(lit.week)}-${day} ${cyc}`, `LW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Sacred Triduum": {
      const easter = easterDate(y);
      const off = 3 - Math.round((easter.getTime() - date.getTime()) / 86_400_000); // 0 Thu,1 Fri,2 Sat
      const code = ["LW06-4Thu", "LW06-5Fri", "LW06-6Sat"][off];
      groups.push([`${code} ${cyc}`, code]);
      break;
    }
    case "Eastertide":
      if (dow === 0) {
        groups.push([`EW${ww(lit.week)}-0Sun ${cyc}`, `EW${ww(lit.week)}-0Sun`]);
      } else {
        groups.push([`EW${ww(lit.week)}-${day} ${cyc}`, `EW${ww(lit.week)}-${day}`]);
      }
      break;
    case "Ordinary Time":
      if (dow === 0) {
        groups.push([`OW${ww(lit.week)}-0Sun ${cyc}`, `OW${ww(lit.week)}-0Sun`]);
      } else {
        groups.push([`OW${ww(lit.week)}-${day} ${wd}`, `OW${ww(lit.week)}-${day}`]);
      }
      break;
  }

  // After the ferial cycle, offer proper readings of memorials as a fallback.
  named(["Memorial"]);
  // Sanity net: the Baptism of the Lord is computed as a celebration; if some
  // edge date produced nothing, fall back to nearest OT week 1 weekday.
  if (!groups.length) groups.push([`OW01-${day} ${wd}`, `OW01-${day}`]);
  return groups;
}

function mergeGroup(data: LectionaryData, codes: string[]): { code: string; rows: LectionaryRow[] } {
  const rows: LectionaryRow[] = [];
  const seen = new Set<number>();
  const used: string[] = [];
  for (const code of codes) {
    const found = data[code];
    if (!found?.length) continue;
    used.push(code);
    const adding = found.filter((r) => !seen.has(Math.floor(r.t)));
    rows.push(...adding);
    for (const r of found) seen.add(Math.floor(r.t));
  }
  rows.sort((a, b) => a.t - b.t);
  return { code: used.join(" + "), rows };
}

/** Resolve the Mass readings for a date. */
export async function readingsForDate(date: Date): Promise<DayReadings | null> {
  const data = await loadLectionary();
  const groups = dayCodeCandidates(date);
  const merged = groups.map((g) => mergeGroup(data, g));

  const best = merged.find((m) => m.rows.some((r) => Math.floor(r.t) === 6));
  if (!best) return null;

  // A proper gospel without its own first reading (e.g. some memorials)
  // is supplemented by the ferial readings of the day.
  if (!best.rows.some((r) => Math.floor(r.t) === 1)) {
    const ferial = merged.find(
      (mm) => mm !== best && mm.rows.some((r) => Math.floor(r.t) === 1)
    );
    if (ferial) {
      best.rows.push(...ferial.rows.filter((r) => Math.floor(r.t) !== 6));
      best.rows.sort((a, b) => a.t - b.t);
    }
  }
  return best;
}

/** Modern (Hebrew) psalm number -> Vulgate/Septuagint chapter in our texts. */
export function hebrewToVulgatePsalm(n: number): number {
  if (n <= 8 || n >= 148) return n;
  if (n === 9 || n === 10) return 9;
  if (n === 114 || n === 115) return 113;
  if (n === 116) return 114;
  if (n === 147) return 146;
  return n - 1;
}

export const READING_LABELS: Record<number, string> = {
  1: "First Reading",
  2: "Responsorial Psalm",
  3: "Second Reading",
  6: "Gospel"
};

/** Human citation like "1 Kings 18:41-46" or "Psalm 65(64):9-12". */
export function formatCitation(row: LectionaryRow, bookName: string): string {
  const isPsalm = row.b === "psalms";
  const parts: string[] = [];
  let curCh = 0;
  for (const [ch, v1, v2] of row.s) {
    const vv = v2 === 999 ? `${v1}ff` : v1 === v2 ? `${v1}` : `${v1}-${v2}`;
    if (ch !== curCh) {
      const chLabel = isPsalm ? `${ch}(${hebrewToVulgatePsalm(ch)})` : `${ch}`;
      parts.push(`${chLabel}:${vv}`);
      curCh = ch;
    } else {
      parts[parts.length - 1] += `,${vv}`;
    }
  }
  return `${bookName} ${parts.join("; ")}`;
}
