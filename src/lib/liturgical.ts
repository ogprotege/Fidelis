/**
 * Liturgical calendar engine (General Roman Calendar, ordinary form dates).
 * Computes the season, its color, and major celebrations for any date.
 * Movable feasts derive from the Easter computus (Meeus/Jones/Butcher).
 */

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
}

export interface LiturgicalDay {
  date: Date;
  season: Season;
  /** e.g. "Third Sunday of Advent", "Friday of the 4th Week of Lent" */
  seasonLabel: string;
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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

/** Sunday after Jan 6 (Baptism of the Lord; ends Christmastide). */
function baptismOfTheLord(year: number): Date {
  const epiphany = ymd(year, 1, 6);
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
const FIXED: { m: number; d: number; name: string; rank: Rank; color?: LiturgicalColor }[] = [
  { m: 1, d: 1, name: "Mary, the Holy Mother of God", rank: "Solemnity", color: "white" },
  { m: 1, d: 6, name: "The Epiphany of the Lord (traditional date)", rank: "Solemnity", color: "white" },
  { m: 1, d: 2, name: "Sts. Basil the Great and Gregory Nazianzen, Doctors", rank: "Memorial", color: "white" },
  { m: 1, d: 21, name: "St. Agnes, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 1, d: 25, name: "The Conversion of St. Paul, Apostle", rank: "Feast", color: "white" },
  { m: 1, d: 28, name: "St. Thomas Aquinas, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 1, d: 31, name: "St. John Bosco, Priest", rank: "Memorial", color: "white" },
  { m: 2, d: 2, name: "The Presentation of the Lord (Candlemas)", rank: "Feast", color: "white" },
  { m: 2, d: 11, name: "Our Lady of Lourdes", rank: "Memorial", color: "white" },
  { m: 2, d: 14, name: "Sts. Cyril and Methodius", rank: "Memorial", color: "white" },
  { m: 2, d: 22, name: "The Chair of St. Peter, Apostle", rank: "Feast", color: "white" },
  { m: 3, d: 17, name: "St. Patrick, Bishop", rank: "Memorial", color: "white" },
  { m: 3, d: 19, name: "St. Joseph, Spouse of the Blessed Virgin Mary", rank: "Solemnity", color: "white" },
  { m: 3, d: 25, name: "The Annunciation of the Lord", rank: "Solemnity", color: "white" },
  { m: 4, d: 25, name: "St. Mark, Evangelist", rank: "Feast", color: "red" },
  { m: 4, d: 29, name: "St. Catherine of Siena, Virgin and Doctor", rank: "Memorial", color: "white" },
  { m: 5, d: 1, name: "St. Joseph the Worker", rank: "Memorial", color: "white" },
  { m: 5, d: 3, name: "Sts. Philip and James, Apostles", rank: "Feast", color: "red" },
  { m: 5, d: 13, name: "Our Lady of Fatima", rank: "Memorial", color: "white" },
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
  { m: 7, d: 16, name: "Our Lady of Mount Carmel", rank: "Memorial", color: "white" },
  { m: 7, d: 22, name: "St. Mary Magdalene", rank: "Feast", color: "white" },
  { m: 7, d: 25, name: "St. James, Apostle", rank: "Feast", color: "red" },
  { m: 7, d: 26, name: "Sts. Joachim and Anne, Parents of the BVM", rank: "Memorial", color: "white" },
  { m: 7, d: 29, name: "Sts. Martha, Mary and Lazarus", rank: "Memorial", color: "white" },
  { m: 7, d: 31, name: "St. Ignatius of Loyola, Priest", rank: "Memorial", color: "white" },
  { m: 8, d: 1, name: "St. Alphonsus Liguori, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 8, d: 4, name: "St. John Vianney, Priest", rank: "Memorial", color: "white" },
  { m: 8, d: 6, name: "The Transfiguration of the Lord", rank: "Feast", color: "white" },
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
  { m: 9, d: 14, name: "The Exaltation of the Holy Cross", rank: "Feast", color: "red" },
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
  { m: 10, d: 22, name: "St. John Paul II, Pope", rank: "Memorial", color: "white" },
  { m: 10, d: 28, name: "Sts. Simon and Jude, Apostles", rank: "Feast", color: "red" },
  { m: 11, d: 1, name: "All Saints", rank: "Solemnity", color: "white" },
  { m: 11, d: 2, name: "The Commemoration of All the Faithful Departed (All Souls)", rank: "Solemnity", color: "violet" },
  { m: 11, d: 9, name: "The Dedication of the Lateran Basilica", rank: "Feast", color: "white" },
  { m: 11, d: 11, name: "St. Martin of Tours, Bishop", rank: "Memorial", color: "white" },
  { m: 11, d: 21, name: "The Presentation of the Blessed Virgin Mary", rank: "Memorial", color: "white" },
  { m: 11, d: 22, name: "St. Cecilia, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 11, d: 30, name: "St. Andrew, Apostle", rank: "Feast", color: "red" },
  { m: 12, d: 7, name: "St. Ambrose, Bishop and Doctor", rank: "Memorial", color: "white" },
  { m: 12, d: 8, name: "The Immaculate Conception of the Blessed Virgin Mary", rank: "Solemnity", color: "white" },
  { m: 12, d: 12, name: "Our Lady of Guadalupe", rank: "Feast", color: "white" },
  { m: 12, d: 13, name: "St. Lucy, Virgin and Martyr", rank: "Memorial", color: "red" },
  { m: 12, d: 14, name: "St. John of the Cross, Priest and Doctor", rank: "Memorial", color: "white" },
  { m: 12, d: 25, name: "The Nativity of the Lord (Christmas)", rank: "Solemnity", color: "white" },
  { m: 12, d: 26, name: "St. Stephen, the First Martyr", rank: "Feast", color: "red" },
  { m: 12, d: 27, name: "St. John, Apostle and Evangelist", rank: "Feast", color: "white" },
  { m: 12, d: 28, name: "The Holy Innocents, Martyrs", rank: "Feast", color: "red" }
];

function movableCelebrations(date: Date): Celebration[] {
  const year = date.getFullYear();
  const easter = easterDate(year);
  const fromEaster = daysBetween(easter, date);
  const out: Celebration[] = [];

  const movables: [number, string, Rank, LiturgicalColor][] = [
    [-46, "Ash Wednesday", "Feria", "violet"],
    [-7, "Palm Sunday of the Passion of the Lord", "Sunday", "red"],
    [-3, "Holy Thursday — Mass of the Lord's Supper", "Solemnity", "white"],
    [-2, "Good Friday of the Passion of the Lord", "Solemnity", "red"],
    [-1, "Holy Saturday", "Solemnity", "violet"],
    [0, "Easter Sunday of the Resurrection of the Lord", "Solemnity", "white"],
    [7, "Divine Mercy Sunday (Second Sunday of Easter)", "Solemnity", "white"],
    [39, "The Ascension of the Lord", "Solemnity", "white"],
    [49, "Pentecost Sunday", "Solemnity", "red"],
    [50, "Mary, Mother of the Church", "Memorial", "white"],
    [56, "The Most Holy Trinity", "Solemnity", "white"],
    [60, "The Most Holy Body and Blood of Christ (Corpus Christi)", "Solemnity", "white"],
    [68, "The Most Sacred Heart of Jesus", "Solemnity", "white"],
    [69, "The Immaculate Heart of the Blessed Virgin Mary", "Memorial", "white"]
  ];
  for (const [offset, name, rank, color] of movables) {
    if (fromEaster === offset) out.push({ name, rank, color });
  }

  // Christ the King: the Sunday before the First Sunday of Advent.
  if (sameDay(date, addDays(adventStart(year), -7))) {
    out.push({ name: "Our Lord Jesus Christ, King of the Universe", rank: "Solemnity", color: "white" });
  }
  // Holy Family: Sunday within the Christmas octave (or Dec 30 if none).
  const christmas = ymd(year, 12, 25);
  const holyFamily = (() => {
    for (let i = 1; i <= 6; i++) {
      const d = addDays(christmas, i);
      if (d.getDay() === 0) return d;
    }
    return ymd(year, 12, 30);
  })();
  if (sameDay(date, holyFamily)) {
    out.push({ name: "The Holy Family of Jesus, Mary and Joseph", rank: "Feast", color: "white" });
  }
  if (sameDay(date, baptismOfTheLord(year))) {
    out.push({ name: "The Baptism of the Lord", rank: "Feast", color: "white" });
  }
  return out;
}

export function liturgicalDay(date: Date = new Date()): LiturgicalDay {
  const year = date.getFullYear();
  const easter = easterDate(year);
  const ashWednesday = addDays(easter, -46);
  const holyThursday = addDays(easter, -3);
  const pentecost = addDays(easter, 49);
  const advent1 = adventStart(year);
  const christmas = ymd(year, 12, 25);
  const baptism = baptismOfTheLord(year);
  const dow = date.getDay();
  const weekday = WEEKDAYS[dow];

  let season: Season;
  let seasonLabel: string;
  let color: LiturgicalColor;

  if (daysBetween(advent1, date) >= 0 && daysBetween(date, christmas) > 0) {
    season = "Advent";
    const week = Math.floor(daysBetween(advent1, date) / 7) + 1;
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
      // Ordinary Time I: counted from the Baptism of the Lord (week 1).
      week = Math.floor(daysBetween(baptism, date) / 7) + 1;
    } else {
      // Ordinary Time II: counted backwards from Christ the King (week 34).
      const christKing = addDays(advent1, -7);
      week = 34 - Math.floor(daysBetween(date, addDays(christKing, 6)) / 7);
    }
    week = Math.min(Math.max(week, 1), 34);
    seasonLabel =
      dow === 0
        ? `${ORDINALS[week - 1]} Sunday in Ordinary Time`
        : `${weekday} of the ${ORDINALS[week - 1]} Week in Ordinary Time`;
    color = "green";
  }

  const celebrations: Celebration[] = [
    ...FIXED.filter((f) => f.m === date.getMonth() + 1 && f.d === date.getDate()).map(
      ({ name, rank, color: c }) => ({ name, rank, color: c })
    ),
    ...movableCelebrations(date)
  ];

  // A solemnity or feast usually takes its own color.
  const rankOrder: Rank[] = ["Solemnity", "Feast", "Sunday", "Memorial", "Feria"];
  celebrations.sort((a, c) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(c.rank));
  const top = celebrations[0];
  if (top?.color && (top.rank === "Solemnity" || top.rank === "Feast")) {
    color = top.color;
  }

  return { date, season, seasonLabel, color, celebrations };
}

export const COLOR_HEX: Record<LiturgicalColor, string> = {
  green: "#2e7d32",
  violet: "#5e35b1",
  white: "#c9a227",
  red: "#c62828",
  rose: "#d81b60",
  black: "#424242"
};
