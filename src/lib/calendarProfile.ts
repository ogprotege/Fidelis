/**
 * Versioned calendar-pack catalog for the Ordinary Form of the Roman Rite.
 *
 * Profiles are composed from ordered, authoritative packs. Calendar
 * jurisdiction, lectionary edition, and displayed Bible translation remain
 * separate settings. Only the General Roman and United States packs are
 * verified here. Every other jurisdiction receives an explicit General Roman
 * fallback receipt.
 */

export const CALENDAR_PROFILE_SCHEMA_VERSION = 1 as const;
/** Full-year exact catalog/golden support; earlier dates are partial history. */
export const EXACT_CALENDAR_CATALOG_FROM = "2024-01-01" as const;
export const EXACT_CALENDAR_CATALOG_THROUGH = "2031-12-31" as const;
/**
 * Release-pinned native snapshot epoch. Keeping this explicit makes the
 * containing app and both widget processes generate the same seven-year
 * window even after a New Year rollover. The verification harness requires a
 * deliberate annual bump and regeneration before a new build can pass.
 */
export const NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR = 2026 as const;

/** Annual official-ordo cross-checks present in this release's source catalog. */
export const OFFICIAL_ORDO_VERIFIED_FROM = "2026-01-01" as const;
export const OFFICIAL_ORDO_VERIFIED_THROUGH = "2026-12-31" as const;

export function hasExactCalendarCatalogForDate(date: Date): boolean {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return key >= EXACT_CALENDAR_CATALOG_FROM && key <= EXACT_CALENDAR_CATALOG_THROUGH;
}

export function hasOfficialOrdoVerificationForDate(date: Date): boolean {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return key >= OFFICIAL_ORDO_VERIFIED_FROM && key <= OFFICIAL_ORDO_VERIFIED_THROUGH;
}

export type CalendarPrecedence = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** Complete Table of Liturgical Days (GNLYC 59), lower number wins. */
export const CALENDAR_PRECEDENCE = {
  paschalTriduum: 1,
  primaryTemporalDays: 2,
  generalSolemnity: 3,
  properSolemnity: 4,
  feastOfTheLord: 5,
  ordinarySunday: 6,
  generalFeast: 7,
  properFeast: 8,
  privilegedWeekday: 9,
  generalMemorial: 10,
  properMemorial: 11,
  optionalMemorial: 12,
  feria: 13
} as const satisfies Record<string, CalendarPrecedence>;

export function compareCalendarPrecedence(
  left: CalendarPrecedence,
  right: CalendarPrecedence
): -1 | 0 | 1 {
  return left === right ? 0 : left < right ? -1 : 1;
}

export type CalendarPackScope =
  | "general"
  | "territorial"
  | "subterritorial"
  | "diocesan"
  | "religious-family"
  | "individual-church";

export type CalendarApprovalStatus = "promulgated" | "approved-particular" | "user-supplied";
/** User-facing liturgical type. Precedence is carried separately below. */
export type CalendarRank =
  | "Solemnity"
  | "Feast"
  | "Memorial"
  | "Commemoration"
  | "Day of Prayer"
  | "Sunday"
  | "Sacred Triduum"
  | "Feria";
export type CalendarColor = "green" | "violet" | "white" | "red" | "rose" | "black";
export type CalendarTransferPolicy =
  | "next-free-day"
  | "previous-free-day"
  | "saturday-before-holy-week"
  | "none";

export interface CalendarSourceLocus {
  title: string;
  authority: string;
  url: string;
  locator: string;
}

/** A permitted Mass choice attached to an observed calendar day. */
export interface CalendarFormularyOption {
  id: string;
  label: string;
  color: CalendarColor;
  /** Official lectionary numbers; the source corpus may not carry these rows. */
  lectionaryReference: string;
}

/** Typed rules used by both the web engine and native snapshot generator. */
export type CalendarDateRule =
  | { kind: "fixed"; month: number; day: number }
  | { kind: "fixed-next-day-if-sunday"; month: number; day: number }
  | { kind: "easter-offset"; days: number }
  | { kind: "sunday-between"; month: number; fromDay: number; throughDay: number }
  | { kind: "advent-offset"; days: number }
  | { kind: "nth-weekday"; month: number; weekday: number; occurrence: number }
  | {
      kind: "profile-date";
      name: "epiphany" | "ascension" | "corpus-christi" | "baptism" | "holy-family";
    };

export interface CalendarCelebrationRule {
  /** Stable identity across translations, profiles, and date relocations. */
  id: string;
  /** Stable key consumed by a separately selected LectionaryPack. */
  formularyId: string | null;
  name: string;
  rank: CalendarRank;
  color: CalendarColor;
  precedence: CalendarPrecedence;
  dateRule: CalendarDateRule;
  /** Civil-date applicability of this exact promulgated rule. */
  effectiveFrom?: string;
  effectiveThrough?: string;
  /** Earlier promulgated form of the same stable celebration identity. */
  historicalVariants?: readonly CalendarCelebrationVariant[];
  formularyOptions?: readonly CalendarFormularyOption[];
  optional?: boolean;
  /** Explicit tie-break supplied by a decree for celebrations of equal class. */
  occurrencePriority?: number;
  /** Solemnities normally transfer; exceptional commemorations do not. */
  transferPolicy?: CalendarTransferPolicy;
}

export interface CalendarCelebrationVariant {
  effectiveFrom?: string;
  effectiveThrough?: string;
  /** Historical relocations retain identity while changing civil date. */
  dateRule?: CalendarDateRule;
  formularyOptions?: readonly CalendarFormularyOption[];
  formularyId?: string | null;
  name?: string;
  rank?: CalendarRank;
  color?: CalendarColor;
  precedence?: CalendarPrecedence;
  optional?: boolean;
  occurrencePriority?: number;
  transferPolicy?: CalendarTransferPolicy;
}

/** Recurring alternatives whose dates depend on the resolved temporal cycle. */
export interface CalendarTemporalAlternativeRule {
  id: string;
  formularyId: string | null;
  name: string;
  rank: CalendarRank;
  color: CalendarColor;
  precedence: CalendarPrecedence;
  trigger: { kind: "ordinary-time-saturday" };
  optional: true;
  formularyOptions?: readonly CalendarFormularyOption[];
}

export interface CalendarProfileRules {
  epiphany: "january-6" | "sunday-january-2-8";
  ascension: "thursday" | "sunday";
  corpusChristi: "thursday" | "sunday";
}

export interface CalendarPack {
  schemaVersion: typeof CALENDAR_PROFILE_SCHEMA_VERSION;
  id: string;
  version: string;
  title: string;
  scope: CalendarPackScope;
  authority: string;
  approvalStatus: CalendarApprovalStatus;
  effectiveFrom: string;
  effectiveThrough?: string;
  /** Later profile layers replace earlier rules with the same stable id. */
  celebrations: readonly CalendarCelebrationRule[];
  temporalAlternatives: readonly CalendarTemporalAlternativeRule[];
  ruleOverrides: Partial<CalendarProfileRules>;
  /** Hash of canonicalCatalogInput, used to invalidate native snapshots. */
  contentHash: `sha256:${string}`;
  canonicalCatalogInput: string;
  sourceLoci: readonly CalendarSourceLocus[];
}

export interface LectionaryPack {
  schemaVersion: typeof CALENDAR_PROFILE_SCHEMA_VERSION;
  id: LectionaryPackId;
  version: string;
  title: string;
  authority: string;
  formularyNamespace: string;
  /** Built citation table selected by the resolver. */
  dataPath: string;
  /** SHA-256 of the manifest-sealed citation table consumed by this pack. */
  contentHash: `sha256:${string}`;
  /** Accurate provenance for the bundled table, distinct from official ordo sources. */
  corpusProvenance: string;
  sourceLoci: readonly CalendarSourceLocus[];
}

export type LectionaryPackId = "roman.ordinary.derived-citation-table";

export type CalendarProfileId =
  | "roman.general"
  | "roman.us.ascension-sunday"
  | "roman.us.ascension-thursday";

/** Accepted only at migration and engine boundaries. Never persist these. */
export type LegacyCalendarRegion = "universal" | "usa";
export type CalendarSelection = CalendarProfileId | LegacyCalendarRegion;

export interface CalendarProfile {
  schemaVersion: typeof CALENDAR_PROFILE_SCHEMA_VERSION;
  id: CalendarProfileId;
  label: string;
  shortLabel: string;
  rite: "roman-ordinary";
  countryCode?: "US";
  jurisdictionLabel: string;
  /** Ordered composition, from General through the narrowest local layer. */
  packs: readonly CalendarPack[];
  /** Derived compatibility view; never the source of composition. */
  packIds: readonly string[];
  rules: CalendarProfileRules;
  fingerprint: string;
  /** Date on which the cited authority set was last checked. */
  sourceCheckedAt: string;
}

const fixed = (
  id: string,
  month: number,
  day: number,
  name: string,
  rank: CalendarRank,
  color: CalendarColor,
  options: {
    optional?: boolean;
    precedence?: CalendarPrecedence;
    formularyId?: string | null;
    transferPolicy?: CalendarTransferPolicy;
    occurrencePriority?: number;
    effectiveFrom?: string;
    effectiveThrough?: string;
    historicalVariants?: readonly CalendarCelebrationVariant[];
  } = {}
): CalendarCelebrationRule => ({
  id,
  formularyId: options.formularyId === undefined ? id : options.formularyId,
  name,
  rank,
  color,
  precedence:
    options.precedence ??
    (options.optional
      ? CALENDAR_PRECEDENCE.optionalMemorial
      : rank === "Solemnity"
        ? CALENDAR_PRECEDENCE.generalSolemnity
        : rank === "Feast"
          ? CALENDAR_PRECEDENCE.generalFeast
          : rank === "Memorial"
            ? CALENDAR_PRECEDENCE.generalMemorial
            : CALENDAR_PRECEDENCE.feria),
  dateRule: { kind: "fixed", month, day },
  ...(options.effectiveFrom ? { effectiveFrom: options.effectiveFrom } : {}),
  ...(options.effectiveThrough ? { effectiveThrough: options.effectiveThrough } : {}),
  ...(options.historicalVariants ? { historicalVariants: options.historicalVariants } : {}),
  ...(options.optional ? { optional: true } : {}),
  ...(options.occurrencePriority ? { occurrencePriority: options.occurrencePriority } : {}),
  ...(options.transferPolicy ? { transferPolicy: options.transferPolicy } : {})
});

const movable = (
  id: string,
  dateRule: CalendarDateRule,
  name: string,
  rank: CalendarRank,
  color: CalendarColor,
  precedence: CalendarPrecedence,
  optional = false,
  occurrencePriority = 0
): CalendarCelebrationRule => ({
  id,
  formularyId: id,
  name,
  rank,
  color,
  precedence,
  dateRule,
  ...(optional ? { optional: true } : {}),
  ...(occurrencePriority ? { occurrencePriority } : {})
});

/**
 * Current General Roman fixed calendar, transcribed from the Holy See's
 * calendar and inscription decrees and cross-checked against the USCCB 2026
 * ordo. Optional memorials remain typed as lawful alternatives.
 */
const GENERAL_CELEBRATIONS: readonly CalendarCelebrationRule[] = [
  movable("grc.epiphany", { kind: "profile-date", name: "epiphany" }, "The Epiphany of the Lord", "Solemnity", "white", 2),
  movable("grc.ash-wednesday", { kind: "easter-offset", days: -46 }, "Ash Wednesday", "Feria", "violet", 2),
  movable("grc.palm-sunday", { kind: "easter-offset", days: -7 }, "Palm Sunday of the Passion of the Lord", "Sunday", "red", 2),
  movable("grc.holy-thursday", { kind: "easter-offset", days: -3 }, "Holy Thursday — Mass of the Lord's Supper", "Sacred Triduum", "white", 1),
  movable("grc.good-friday", { kind: "easter-offset", days: -2 }, "Good Friday of the Passion of the Lord", "Sacred Triduum", "red", 1),
  movable("grc.holy-saturday", { kind: "easter-offset", days: -1 }, "Holy Saturday", "Sacred Triduum", "white", 1),
  movable("grc.easter-sunday", { kind: "easter-offset", days: 0 }, "Easter Sunday of the Resurrection of the Lord", "Solemnity", "white", 1),
  movable("grc.divine-mercy-sunday", { kind: "easter-offset", days: 7 }, "Divine Mercy Sunday (Second Sunday of Easter)", "Sunday", "white", 2),
  movable("grc.ascension", { kind: "profile-date", name: "ascension" }, "The Ascension of the Lord", "Solemnity", "white", 2),
  movable("grc.pentecost", { kind: "easter-offset", days: 49 }, "Pentecost Sunday", "Solemnity", "red", 2),
  {
    ...movable("grc.mary-mother-church", { kind: "easter-offset", days: 50 }, "Mary, Mother of the Church", "Memorial", "white", 10, false, 1),
    effectiveFrom: "2018-02-11"
  },
  movable("grc.trinity", { kind: "easter-offset", days: 56 }, "The Most Holy Trinity", "Solemnity", "white", 3),
  movable("grc.corpus-christi", { kind: "profile-date", name: "corpus-christi" }, "The Most Holy Body and Blood of Christ (Corpus Christi)", "Solemnity", "white", 3),
  movable("grc.sacred-heart", { kind: "easter-offset", days: 68 }, "The Most Sacred Heart of Jesus", "Solemnity", "white", 3, false, 1),
  movable("grc.immaculate-heart", { kind: "easter-offset", days: 69 }, "The Immaculate Heart of the Blessed Virgin Mary", "Memorial", "white", 10),
  movable("grc.christ-king", { kind: "advent-offset", days: -7 }, "Our Lord Jesus Christ, King of the Universe", "Solemnity", "white", 3),
  movable("grc.holy-family", { kind: "profile-date", name: "holy-family" }, "The Holy Family of Jesus, Mary and Joseph", "Feast", "white", 5),
  movable("grc.baptism-lord", { kind: "profile-date", name: "baptism" }, "The Baptism of the Lord", "Feast", "white", 5),

  fixed("grc.fixed.01-01", 1, 1, "Mary, the Holy Mother of God", "Solemnity", "white"),
  fixed("grc.fixed.01-02", 1, 2, "Sts. Basil the Great and Gregory Nazianzen, Doctors", "Memorial", "white"),
  fixed("grc.most-holy-name-jesus", 1, 3, "The Most Holy Name of Jesus", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2002-01-01"
  }),
  fixed("grc.raymond-penyafort", 1, 7, "St. Raymond of Penyafort, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.hilary", 1, 13, "St. Hilary, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.anthony-abbot", 1, 17, "St. Anthony, Abbot", "Memorial", "white"),
  fixed("grc.fabian", 1, 20, "St. Fabian, Pope and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.sebastian", 1, 20, "St. Sebastian, Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.01-21", 1, 21, "St. Agnes, Virgin and Martyr", "Memorial", "red"),
  fixed("grc.vincent", 1, 22, "St. Vincent, Deacon and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.francis-de-sales", 1, 24, "St. Francis de Sales, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.01-25", 1, 25, "The Conversion of St. Paul, Apostle", "Feast", "white"),
  fixed("grc.fixed.01-26", 1, 26, "Sts. Timothy and Titus, Bishops", "Memorial", "white"),
  fixed("grc.angela-merici", 1, 27, "St. Angela Merici, Virgin", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.01-28", 1, 28, "St. Thomas Aquinas, Priest and Doctor", "Memorial", "white"),
  fixed("grc.fixed.01-31", 1, 31, "St. John Bosco, Priest", "Memorial", "white"),

  fixed("grc.fixed.02-02", 2, 2, "The Presentation of the Lord (Candlemas)", "Feast", "white", { precedence: 5 }),
  fixed("grc.blaise", 2, 3, "St. Blaise, Bishop and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.ansgar", 2, 3, "St. Ansgar, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.agatha", 2, 5, "St. Agatha, Virgin and Martyr", "Memorial", "red"),
  fixed("grc.paul-miki", 2, 6, "St. Paul Miki and Companions, Martyrs", "Memorial", "red"),
  fixed("grc.jerome-emiliani", 2, 8, "St. Jerome Emiliani", "Memorial", "white", { optional: true }),
  fixed("grc.josephine-bakhita", 2, 8, "St. Josephine Bakhita, Virgin", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2002-01-01"
  }),
  fixed("grc.scholastica", 2, 10, "St. Scholastica, Virgin", "Memorial", "white"),
  fixed("grc.fixed.02-11", 2, 11, "Our Lady of Lourdes", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.02-14", 2, 14, "Sts. Cyril and Methodius", "Memorial", "white"),
  fixed("grc.servite-founders", 2, 17, "The Seven Holy Founders of the Servite Order", "Memorial", "white", { optional: true }),
  fixed("grc.peter-damian", 2, 21, "St. Peter Damian, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.02-22", 2, 22, "The Chair of St. Peter, Apostle", "Feast", "white"),
  fixed("grc.polycarp", 2, 23, "St. Polycarp, Bishop and Martyr", "Memorial", "red"),
  fixed("grc.fixed.02-27", 2, 27, "St. Gregory of Narek, Abbot and Doctor", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2021-01-25"
  }),

  fixed("grc.casimir", 3, 4, "St. Casimir", "Memorial", "white", { optional: true }),
  fixed("grc.perpetua-felicity", 3, 7, "Sts. Perpetua and Felicity, Martyrs", "Memorial", "red"),
  fixed("grc.john-of-god", 3, 8, "St. John of God, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.frances-of-rome", 3, 9, "St. Frances of Rome, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.03-17", 3, 17, "St. Patrick, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.cyril-jerusalem", 3, 18, "St. Cyril of Jerusalem, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.03-19", 3, 19, "St. Joseph, Spouse of the Blessed Virgin Mary", "Solemnity", "white", { transferPolicy: "saturday-before-holy-week" }),
  fixed("grc.turibius", 3, 23, "St. Turibius of Mogrovejo, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.03-25", 3, 25, "The Annunciation of the Lord", "Solemnity", "white"),

  fixed("grc.francis-paola", 4, 2, "St. Francis of Paola, Hermit", "Memorial", "white", { optional: true }),
  fixed("grc.isidore-seville", 4, 4, "St. Isidore, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.vincent-ferrer", 4, 5, "St. Vincent Ferrer, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.john-baptist-de-la-salle", 4, 7, "St. John Baptist de la Salle, Priest", "Memorial", "white"),
  fixed("grc.stanislaus", 4, 11, "St. Stanislaus, Bishop and Martyr", "Memorial", "red"),
  fixed("grc.martin-i", 4, 13, "St. Martin I, Pope and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.anselm", 4, 21, "St. Anselm, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.george", 4, 23, "St. George, Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.adalbert", 4, 23, "St. Adalbert, Bishop and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fidelis-sigmaringen", 4, 24, "St. Fidelis of Sigmaringen, Priest and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.04-25", 4, 25, "St. Mark, Evangelist", "Feast", "red"),
  fixed("grc.peter-chanel", 4, 28, "St. Peter Chanel, Priest and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.louis-de-montfort", 4, 28, "St. Louis Grignion de Montfort, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.04-29", 4, 29, "St. Catherine of Siena, Virgin and Doctor", "Memorial", "white"),
  fixed("grc.pius-v", 4, 30, "St. Pius V, Pope", "Memorial", "white", { optional: true }),

  fixed("grc.fixed.05-01", 5, 1, "St. Joseph the Worker", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.05-02", 5, 2, "St. Athanasius, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.05-03", 5, 3, "Sts. Philip and James, Apostles", "Feast", "red"),
  fixed("grc.fixed.05-10", 5, 10, "St. John of Ávila, Priest and Doctor", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2021-01-25"
  }),
  fixed("grc.nereus-achilleus", 5, 12, "Sts. Nereus and Achilleus, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.pancras", 5, 12, "St. Pancras, Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.05-13", 5, 13, "Our Lady of Fatima", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2002-01-01"
  }),
  fixed("grc.fixed.05-14", 5, 14, "St. Matthias, Apostle", "Feast", "red"),
  fixed("grc.john-i", 5, 18, "St. John I, Pope and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.bernardine-siena", 5, 20, "St. Bernardine of Siena, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.christopher-magallanes", 5, 21, "St. Christopher Magallanes, Priest, and Companions, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.rita-cascia", 5, 22, "St. Rita of Cascia, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.bede", 5, 25, "St. Bede the Venerable, Priest and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.gregory-vii", 5, 25, "St. Gregory VII, Pope", "Memorial", "white", { optional: true }),
  fixed("grc.mary-magdalene-de-pazzi", 5, 25, "St. Mary Magdalene de' Pazzi, Virgin", "Memorial", "white", { optional: true }),
  fixed("grc.philip-neri", 5, 26, "St. Philip Neri, Priest", "Memorial", "white"),
  fixed("grc.augustine-canterbury", 5, 27, "St. Augustine of Canterbury, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.05-29", 5, 29, "St. Paul VI, Pope", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2019-01-25"
  }),
  fixed("grc.fixed.05-31", 5, 31, "The Visitation of the Blessed Virgin Mary", "Feast", "white"),

  fixed("grc.justin", 6, 1, "St. Justin, Martyr", "Memorial", "red"),
  fixed("grc.marcellinus-peter", 6, 2, "Sts. Marcellinus and Peter, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.charles-lwanga", 6, 3, "St. Charles Lwanga and Companions, Martyrs", "Memorial", "red"),
  fixed("grc.fixed.06-05", 6, 5, "St. Boniface, Bishop and Martyr", "Memorial", "red"),
  fixed("grc.norbert", 6, 6, "St. Norbert, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.ephrem", 6, 9, "St. Ephrem, Deacon and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.06-11", 6, 11, "St. Barnabas, Apostle", "Memorial", "red"),
  fixed("grc.fixed.06-13", 6, 13, "St. Anthony of Padua, Priest and Doctor", "Memorial", "white"),
  fixed("grc.romuald", 6, 19, "St. Romuald, Abbot", "Memorial", "white", { optional: true }),
  fixed("grc.aloysius-gonzaga", 6, 21, "St. Aloysius Gonzaga, Religious", "Memorial", "white"),
  fixed("grc.paulinus-nola", 6, 22, "St. Paulinus of Nola, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.fisher-more", 6, 22, "Sts. John Fisher, Bishop, and Thomas More, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.06-24", 6, 24, "The Nativity of St. John the Baptist", "Solemnity", "white", { transferPolicy: "previous-free-day" }),
  fixed("grc.cyril-alexandria", 6, 27, "St. Cyril of Alexandria, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.06-28", 6, 28, "St. Irenaeus, Bishop, Martyr and Doctor", "Memorial", "red", {
    effectiveFrom: "2022-01-21",
    historicalVariants: [{
      effectiveThrough: "2022-01-20",
      name: "St. Irenaeus, Bishop and Martyr"
    }]
  }),
  fixed("grc.fixed.06-29", 6, 29, "Sts. Peter and Paul, Apostles", "Solemnity", "red"),
  fixed("grc.first-martyrs-rome", 6, 30, "The First Martyrs of the Holy Roman Church", "Memorial", "red", { optional: true }),

  fixed("grc.fixed.07-03", 7, 3, "St. Thomas, Apostle", "Feast", "red"),
  fixed("grc.st-elizabeth-portugal", 7, 4, "St. Elizabeth of Portugal", "Memorial", "white", { optional: true }),
  fixed("grc.anthony-mary-zaccaria", 7, 5, "St. Anthony Mary Zaccaria, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.maria-goretti", 7, 6, "St. Maria Goretti, Virgin and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.augustine-zhao-rong", 7, 9, "St. Augustine Zhao Rong, Priest, and Companions, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.07-11", 7, 11, "St. Benedict, Abbot", "Memorial", "white"),
  fixed("grc.henry", 7, 13, "St. Henry", "Memorial", "white", { optional: true }),
  fixed("grc.st-camillus", 7, 14, "St. Camillus de Lellis, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.07-15", 7, 15, "St. Bonaventure, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.07-16", 7, 16, "Our Lady of Mount Carmel", "Memorial", "white", { optional: true }),
  fixed("grc.apollinaris", 7, 20, "St. Apollinaris, Bishop and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.lawrence-brindisi", 7, 21, "St. Lawrence of Brindisi, Priest and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.07-22", 7, 22, "St. Mary Magdalene", "Feast", "white", {
    effectiveFrom: "2016-06-03",
    historicalVariants: [{
      effectiveThrough: "2016-06-02",
      rank: "Memorial",
      precedence: CALENDAR_PRECEDENCE.generalMemorial
    }]
  }),
  fixed("grc.bridget", 7, 23, "St. Bridget, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.sharbel", 7, 24, "St. Sharbel Makhlūf, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.07-25", 7, 25, "St. James, Apostle", "Feast", "red"),
  fixed("grc.fixed.07-26", 7, 26, "Sts. Joachim and Anne, Parents of the BVM", "Memorial", "white"),
  fixed("grc.fixed.07-29", 7, 29, "Sts. Martha, Mary and Lazarus", "Memorial", "white", {
    effectiveFrom: "2021-01-26",
    historicalVariants: [{
      effectiveThrough: "2021-01-25",
      name: "St. Martha"
    }]
  }),
  fixed("grc.peter-chrysologus", 7, 30, "St. Peter Chrysologus, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.07-31", 7, 31, "St. Ignatius of Loyola, Priest", "Memorial", "white"),

  fixed("grc.fixed.08-01", 8, 1, "St. Alphonsus Liguori, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.eusebius-vercelli", 8, 2, "St. Eusebius of Vercelli, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.peter-julian-eymard", 8, 2, "St. Peter Julian Eymard, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.08-04", 8, 4, "St. John Vianney, Priest", "Memorial", "white"),
  fixed("grc.mary-major", 8, 5, "The Dedication of the Basilica of St. Mary Major", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.08-06", 8, 6, "The Transfiguration of the Lord", "Feast", "white", { precedence: 5 }),
  fixed("grc.sixtus-ii", 8, 7, "St. Sixtus II, Pope, and Companions, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.cajetan", 8, 7, "St. Cajetan, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.08-08", 8, 8, "St. Dominic, Priest", "Memorial", "white"),
  fixed("grc.teresa-benedicta", 8, 9, "St. Teresa Benedicta of the Cross, Virgin and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.08-10", 8, 10, "St. Lawrence, Deacon and Martyr", "Feast", "red"),
  fixed("grc.fixed.08-11", 8, 11, "St. Clare, Virgin", "Memorial", "white"),
  fixed("grc.jane-frances-de-chantal", 8, 12, "St. Jane Frances de Chantal, Religious", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2002-01-01",
    historicalVariants: [{
      effectiveThrough: "2001-12-31",
      dateRule: { kind: "fixed", month: 12, day: 12 }
    }]
  }),
  fixed("grc.pontian-hippolytus", 8, 13, "Sts. Pontian, Pope, and Hippolytus, Priest, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.08-14", 8, 14, "St. Maximilian Kolbe, Priest and Martyr", "Memorial", "red"),
  fixed("grc.fixed.08-15", 8, 15, "The Assumption of the Blessed Virgin Mary", "Solemnity", "white"),
  fixed("grc.stephen-hungary", 8, 16, "St. Stephen of Hungary", "Memorial", "white", { optional: true }),
  fixed("grc.john-eudes", 8, 19, "St. John Eudes, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.bernard", 8, 20, "St. Bernard, Abbot and Doctor", "Memorial", "white"),
  fixed("grc.pius-x", 8, 21, "St. Pius X, Pope", "Memorial", "white"),
  fixed("grc.fixed.08-22", 8, 22, "The Queenship of the Blessed Virgin Mary", "Memorial", "white"),
  fixed("grc.rose-lima", 8, 23, "St. Rose of Lima, Virgin", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.08-24", 8, 24, "St. Bartholomew, Apostle", "Feast", "red"),
  fixed("grc.louis", 8, 25, "St. Louis", "Memorial", "white", { optional: true }),
  fixed("grc.joseph-calasanz", 8, 25, "St. Joseph Calasanz, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.08-27", 8, 27, "St. Monica", "Memorial", "white"),
  fixed("grc.fixed.08-28", 8, 28, "St. Augustine, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.08-29", 8, 29, "The Passion of St. John the Baptist", "Memorial", "red"),

  fixed("grc.gregory-great", 9, 3, "St. Gregory the Great, Pope and Doctor", "Memorial", "white"),
  fixed("grc.fixed.09-05", 9, 5, "St. Teresa of Calcutta, Virgin", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2024-12-24"
  }),
  fixed("grc.fixed.09-08", 9, 8, "The Nativity of the Blessed Virgin Mary", "Feast", "white"),
  fixed("grc.st-peter-claver", 9, 9, "St. Peter Claver, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.holy-name-mary", 9, 12, "The Most Holy Name of Mary", "Memorial", "white", { optional: true }),
  fixed("grc.john-chrysostom", 9, 13, "St. John Chrysostom, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.09-14", 9, 14, "The Exaltation of the Holy Cross", "Feast", "red", { precedence: 5 }),
  fixed("grc.fixed.09-15", 9, 15, "Our Lady of Sorrows", "Memorial", "white"),
  fixed("grc.cornelius-cyprian", 9, 16, "Sts. Cornelius, Pope, and Cyprian, Bishop, Martyrs", "Memorial", "red"),
  fixed("grc.robert-bellarmine", 9, 17, "St. Robert Bellarmine, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.09-17", 9, 17, "St. Hildegard of Bingen, Virgin and Doctor", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2021-01-25"
  }),
  fixed("grc.januarius", 9, 19, "St. Januarius, Bishop and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.korean-martyrs", 9, 20, "Sts. Andrew Kim Tae-gŏn, Paul Chŏng Ha-sang, and Companions, Martyrs", "Memorial", "red"),
  fixed("grc.fixed.09-21", 9, 21, "St. Matthew, Apostle and Evangelist", "Feast", "red"),
  fixed("grc.fixed.09-23", 9, 23, "St. Pius of Pietrelcina (Padre Pio), Priest", "Memorial", "white", {
    effectiveFrom: "2002-06-16"
  }),
  fixed("grc.cosmas-damian", 9, 26, "Sts. Cosmas and Damian, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.vincent-de-paul", 9, 27, "St. Vincent de Paul, Priest", "Memorial", "white"),
  fixed("grc.wenceslaus", 9, 28, "St. Wenceslaus, Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.lawrence-ruiz", 9, 28, "St. Lawrence Ruiz and Companions, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.09-29", 9, 29, "Sts. Michael, Gabriel and Raphael, Archangels", "Feast", "white"),
  fixed("grc.fixed.09-30", 9, 30, "St. Jerome, Priest and Doctor", "Memorial", "white"),

  fixed("grc.fixed.10-01", 10, 1, "St. Thérèse of the Child Jesus, Virgin and Doctor", "Memorial", "white"),
  fixed("grc.fixed.10-02", 10, 2, "The Holy Guardian Angels", "Memorial", "white"),
  fixed("grc.fixed.10-04", 10, 4, "St. Francis of Assisi", "Memorial", "white"),
  fixed("grc.fixed.10-05", 10, 5, "St. Faustina Kowalska, Virgin", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2020-05-18"
  }),
  fixed("grc.bruno", 10, 6, "St. Bruno, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.10-07", 10, 7, "Our Lady of the Rosary", "Memorial", "white"),
  fixed("grc.denis", 10, 9, "St. Denis, Bishop, and Companions, Martyrs", "Memorial", "red", { optional: true }),
  fixed("grc.john-leonardi", 10, 9, "St. John Leonardi, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.10-09", 10, 9, "St. John Henry Newman, Priest and Doctor", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2025-11-09"
  }),
  fixed("grc.fixed.10-11", 10, 11, "St. John XXIII, Pope", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2014-05-29"
  }),
  fixed("grc.callistus", 10, 14, "St. Callistus I, Pope and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.10-15", 10, 15, "St. Teresa of Jesus (Ávila), Virgin and Doctor", "Memorial", "white"),
  fixed("grc.hedwig", 10, 16, "St. Hedwig, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.margaret-mary", 10, 16, "St. Margaret Mary Alacoque, Virgin", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.10-17", 10, 17, "St. Ignatius of Antioch, Bishop and Martyr", "Memorial", "red"),
  fixed("grc.fixed.10-18", 10, 18, "St. Luke, Evangelist", "Feast", "red"),
  fixed("grc.st-paul-cross", 10, 19, "St. Paul of the Cross, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.10-22", 10, 22, "St. John Paul II, Pope", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2014-05-29"
  }),
  fixed("grc.john-capistrano", 10, 23, "St. John of Capistrano, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.anthony-mary-claret", 10, 24, "St. Anthony Mary Claret, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.10-28", 10, 28, "Sts. Simon and Jude, Apostles", "Feast", "red"),

  fixed("grc.fixed.11-01", 11, 1, "All Saints", "Solemnity", "white"),
  {
    ...fixed("grc.fixed.11-02", 11, 2, "The Commemoration of All the Faithful Departed (All Souls)", "Commemoration", "violet", {
      precedence: CALENDAR_PRECEDENCE.generalSolemnity,
      transferPolicy: "none"
    }),
    formularyOptions: [{
      id: "grc.all-souls.masses-for-dead",
      label: "Readings from the Masses for the Dead",
      color: "violet",
      lectionaryReference: "1011–1016"
    }]
  },
  fixed("grc.martin-de-porres", 11, 3, "St. Martin de Porres, Religious", "Memorial", "white", { optional: true }),
  fixed("grc.charles-borromeo", 11, 4, "St. Charles Borromeo, Bishop", "Memorial", "white"),
  fixed("grc.fixed.11-09", 11, 9, "The Dedication of the Lateran Basilica", "Feast", "white", { precedence: 5 }),
  fixed("grc.leo-great", 11, 10, "St. Leo the Great, Pope and Doctor", "Memorial", "white"),
  fixed("grc.fixed.11-11", 11, 11, "St. Martin of Tours, Bishop", "Memorial", "white"),
  fixed("grc.josaphat", 11, 12, "St. Josaphat, Bishop and Martyr", "Memorial", "red"),
  fixed("grc.albert-great", 11, 15, "St. Albert the Great, Bishop and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.margaret-scotland", 11, 16, "St. Margaret of Scotland", "Memorial", "white", { optional: true }),
  fixed("grc.gertrude", 11, 16, "St. Gertrude, Virgin", "Memorial", "white", { optional: true }),
  fixed("grc.elizabeth-hungary", 11, 17, "St. Elizabeth of Hungary, Religious", "Memorial", "white"),
  fixed("grc.dedication-peter-paul", 11, 18, "The Dedication of the Basilicas of Sts. Peter and Paul, Apostles", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.11-21", 11, 21, "The Presentation of the Blessed Virgin Mary", "Memorial", "white"),
  fixed("grc.fixed.11-22", 11, 22, "St. Cecilia, Virgin and Martyr", "Memorial", "red"),
  fixed("grc.clement-i", 11, 23, "St. Clement I, Pope and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.columban", 11, 23, "St. Columban, Abbot", "Memorial", "white", { optional: true }),
  fixed("grc.andrew-dung-lac", 11, 24, "St. Andrew Dũng-Lạc, Priest, and Companions, Martyrs", "Memorial", "red"),
  fixed("grc.catherine-alexandria", 11, 25, "St. Catherine of Alexandria, Virgin and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.fixed.11-30", 11, 30, "St. Andrew, Apostle", "Feast", "red"),

  fixed("grc.francis-xavier", 12, 3, "St. Francis Xavier, Priest", "Memorial", "white"),
  fixed("grc.john-damascene", 12, 4, "St. John Damascene, Priest and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.nicholas", 12, 6, "St. Nicholas, Bishop", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.12-07", 12, 7, "St. Ambrose, Bishop and Doctor", "Memorial", "white"),
  fixed("grc.fixed.12-08", 12, 8, "The Immaculate Conception of the Blessed Virgin Mary", "Solemnity", "white"),
  fixed("grc.juan-diego", 12, 9, "St. Juan Diego Cuauhtlatoatzin", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2002-07-31"
  }),
  fixed("grc.fixed.12-10", 12, 10, "Our Lady of Loreto", "Memorial", "white", {
    optional: true,
    effectiveFrom: "2019-10-07"
  }),
  fixed("grc.damasus-i", 12, 11, "St. Damasus I, Pope", "Memorial", "white", { optional: true }),
  fixed("grc.our-lady-guadalupe", 12, 12, "Our Lady of Guadalupe", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.12-13", 12, 13, "St. Lucy, Virgin and Martyr", "Memorial", "red"),
  fixed("grc.fixed.12-14", 12, 14, "St. John of the Cross, Priest and Doctor", "Memorial", "white"),
  fixed("grc.peter-canisius", 12, 21, "St. Peter Canisius, Priest and Doctor", "Memorial", "white", { optional: true }),
  fixed("grc.john-kanty", 12, 23, "St. John of Kanty, Priest", "Memorial", "white", { optional: true }),
  fixed("grc.fixed.12-25", 12, 25, "The Nativity of the Lord (Christmas)", "Solemnity", "white", { precedence: 2 }),
  fixed("grc.fixed.12-26", 12, 26, "St. Stephen, the First Martyr", "Feast", "red"),
  fixed("grc.fixed.12-27", 12, 27, "St. John, Apostle and Evangelist", "Feast", "white"),
  fixed("grc.fixed.12-28", 12, 28, "The Holy Innocents, Martyrs", "Feast", "red"),
  fixed("grc.thomas-becket", 12, 29, "St. Thomas Becket, Bishop and Martyr", "Memorial", "red", { optional: true }),
  fixed("grc.sylvester-i", 12, 31, "St. Sylvester I, Pope", "Memorial", "white", { optional: true })
];

const proper = (
  id: string,
  month: number,
  day: number,
  name: string,
  rank: CalendarRank,
  color: CalendarColor,
  optional = false
): CalendarCelebrationRule => ({
  ...fixed(id, month, day, name, rank, color, {
    optional,
    precedence: optional
      ? CALENDAR_PRECEDENCE.optionalMemorial
      : rank === "Solemnity"
        ? CALENDAR_PRECEDENCE.properSolemnity
        : rank === "Feast"
          ? CALENDAR_PRECEDENCE.properFeast
          : CALENDAR_PRECEDENCE.properMemorial
  })
});

/** Complete U.S. proper table published in the official 2026 calendar. */
const UNITED_STATES_CELEBRATIONS: readonly CalendarCelebrationRule[] = [
  proper("us.seton", 1, 4, "St. Elizabeth Ann Seton, Religious", "Memorial", "white"),
  proper("us.neumann", 1, 5, "St. John Neumann, Bishop", "Memorial", "white"),
  proper("us.andre-bessette", 1, 6, "St. André Bessette, Religious", "Memorial", "white", true),
  {
    ...proper(
      "us.prayer-unborn",
      1,
      22,
      "Day of Prayer for the Legal Protection of Unborn Children",
      "Day of Prayer",
      "violet"
    ),
    formularyId: null,
    dateRule: { kind: "fixed-next-day-if-sunday", month: 1, day: 22 },
    formularyOptions: [
      {
        id: "us.prayer-unborn.human-life",
        label: "Mass for Giving Thanks to God for the Gift of Human Life",
        color: "white",
        lectionaryReference: "947A–947E"
      },
      {
        id: "us.prayer-unborn.peace-justice",
        label: "Mass for the Preservation of Peace and Justice",
        color: "violet",
        lectionaryReference: "887–891"
      }
    ]
  },
  proper("grc.vincent", 1, 23, "St. Vincent, Deacon and Martyr", "Memorial", "red", true),
  proper("us.marianne-cope", 1, 23, "St. Marianne Cope, Virgin", "Memorial", "white", true),
  {
    ...proper(
      "grc.jane-frances-de-chantal",
      8,
      12,
      "St. Jane Frances de Chantal, Religious",
      "Memorial",
      "white",
      true
    ),
    effectiveFrom: "2002-01-01",
    historicalVariants: [
      {
        effectiveFrom: "1989-01-01",
        effectiveThrough: "2001-12-31",
        dateRule: { kind: "fixed", month: 8, day: 18 }
      },
      {
        effectiveThrough: "1988-12-31",
        dateRule: { kind: "fixed", month: 12, day: 12 }
      }
    ]
  },
  proper("us.katharine-drexel", 3, 3, "St. Katharine Drexel, Virgin", "Memorial", "white", true),
  proper("us.damien", 5, 10, "St. Damien de Veuster, Priest", "Memorial", "white", true),
  proper("us.isidore", 5, 15, "St. Isidore", "Memorial", "white", true),
  proper("us.junipero-serra", 7, 1, "St. Junípero Serra, Priest", "Memorial", "white", true),
  {
    ...proper("us.independence-day", 7, 4, "Independence Day", "Feria", "white", true),
    formularyOptions: [
      {
        id: "us.independence-day.country",
        label: "Mass for the Country or a City",
        color: "white",
        lectionaryReference: "882–886"
      },
      {
        id: "us.independence-day.peace-justice",
        label: "Mass for the Preservation of Peace and Justice",
        color: "violet",
        lectionaryReference: "887–891"
      }
    ]
  },
  proper("grc.st-elizabeth-portugal", 7, 5, "St. Elizabeth of Portugal", "Memorial", "white", true),
  proper("us.kateri", 7, 14, "St. Kateri Tekakwitha, Virgin", "Memorial", "white"),
  proper("grc.st-camillus", 7, 18, "St. Camillus de Lellis, Priest", "Memorial", "white", true),
  proper("grc.st-peter-claver", 9, 9, "St. Peter Claver, Priest", "Memorial", "white"),
  proper("us.seelos", 10, 5, "Blessed Francis Xavier Seelos, Priest", "Memorial", "white", true),
  proper("us.durocher", 10, 6, "Blessed Marie Rose Durocher, Virgin", "Memorial", "white", true),
  proper("us.brebeuf-jogues", 10, 19, "Sts. John de Brébeuf and Isaac Jogues, Priests, and Companions, Martyrs", "Memorial", "red"),
  proper("grc.st-paul-cross", 10, 20, "St. Paul of the Cross, Priest", "Memorial", "white", true),
  proper("us.cabrini", 11, 13, "St. Frances Xavier Cabrini, Virgin", "Memorial", "white"),
  proper("us.duchesne", 11, 18, "St. Rose Philippine Duchesne, Virgin", "Memorial", "white", true),
  proper("us.miguel-pro", 11, 23, "Blessed Miguel Agustín Pro, Priest and Martyr", "Memorial", "red", true),
  {
    ...proper("us.thanksgiving", 11, 1, "Thanksgiving Day", "Feria", "white", true),
    formularyId: null,
    dateRule: { kind: "nth-weekday", month: 11, weekday: 4, occurrence: 4 },
    formularyOptions: [{
      id: "us.thanksgiving.thanks",
      label: "Mass for Giving Thanks to God",
      color: "white",
      lectionaryReference: "943–947"
    }]
  },
  {
    ...proper(
      "grc.fixed.12-08",
      12,
      8,
      "The Immaculate Conception of the Blessed Virgin Mary",
      "Solemnity",
      "white"
    ),
    precedence: CALENDAR_PRECEDENCE.generalSolemnity
  },
  proper("grc.our-lady-guadalupe", 12, 12, "Our Lady of Guadalupe", "Feast", "white")
];

const GENERAL_TEMPORAL_ALTERNATIVES: readonly CalendarTemporalAlternativeRule[] = [
  {
    id: "grc.saturday-bvm",
    formularyId: "grc.saturday-bvm",
    name: "Saturday Memorial of the Blessed Virgin Mary",
    rank: "Memorial",
    color: "white",
    precedence: CALENDAR_PRECEDENCE.optionalMemorial,
    trigger: { kind: "ordinary-time-saturday" },
    optional: true,
    formularyOptions: [
      {
        id: "grc.saturday-bvm.common",
        label: "Common of the Blessed Virgin Mary",
        color: "white",
        lectionaryReference: "Common of the Blessed Virgin Mary"
      },
      {
        id: "grc.saturday-bvm.votive",
        label: "Votive Mass of the Blessed Virgin Mary",
        color: "white",
        lectionaryReference: "Votive Masses of the Blessed Virgin Mary"
      },
      {
        id: "grc.saturday-bvm.collection",
        label: "Collection of Masses of the Blessed Virgin Mary",
        color: "white",
        lectionaryReference: "Collection of Masses of the Blessed Virgin Mary"
      }
    ]
  }
];

const GENERAL_SOURCES: readonly CalendarSourceLocus[] = [
  {
    title: "Mysterii Paschalis",
    authority: "Pope Paul VI",
    url: "https://www.vatican.va/content/paul-vi/en/motu_proprio/documents/hf_p-vi_motu-proprio_19690214_mysterii-paschalis.html",
    locator: "General norms and General Roman Calendar"
  },
  {
    title: "Documents of the Dicastery for Divine Worship",
    authority: "Holy See",
    url: "https://www.vatican.va/content/romancuria/en/dicasteri/dicastero-culto-divino-e-disciplina-sacramenti/documenti.html",
    locator: "General Roman Calendar inscription-decree index through 2025"
  },
  {
    title: "Decree on the Inscription of Saint John Henry Newman",
    authority: "Dicastery for Divine Worship and the Discipline of the Sacraments",
    url: "https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2026/02/03/260203a.html",
    locator: "decree, nos. 32-33; 9 October optional memorial"
  },
  {
    title: "Liturgical Calendar for the Dioceses of the United States of America 2026",
    authority: "USCCB Secretariat of Divine Worship",
    url: "https://www.usccb.org/resources/2026cal.pdf",
    locator: "pp. 5-48 and Proper of Saints index, pp. 52-58"
  }
];

const USA_SOURCES: readonly CalendarSourceLocus[] = [
  {
    title: "Complementary Norms: Canon 1246 §2, Ascension transfer",
    authority: "United States Conference of Catholic Bishops",
    url: "https://www.usccb.org/node/48367",
    locator: "province vote requirement and decree effective 8 September 1999"
  },
  {
    title: "Liturgical Calendar for the Dioceses of the United States of America 2026",
    authority: "USCCB Secretariat of Divine Worship",
    url: "https://www.usccb.org/resources/2026cal.pdf",
    locator: "notes 1-6 and U.S. proper table, pp. 6-10"
  },
  {
    title: "January 22: Day of Prayer for the Legal Protection of Unborn Children",
    authority: "United States Conference of Catholic Bishops",
    url: "https://www.usccb.org/january-22",
    locator: "GIRM 373 observance and permitted white or violet Masses"
  },
  {
    title: "Proper Calendar for the Dioceses of the United States of America",
    authority: "USCCB",
    url: "https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/proper-calendar",
    locator: "national proper calendar"
  }
];

interface CalendarPackCanonicalFields {
  id: string;
  version: string;
  title: string;
  scope: CalendarPackScope;
  authority: string;
  approvalStatus: CalendarApprovalStatus;
  effectiveFrom: string;
  effectiveThrough?: string;
  ruleOverrides: Partial<CalendarProfileRules>;
  celebrations: readonly CalendarCelebrationRule[];
  temporalAlternatives: readonly CalendarTemporalAlternativeRule[];
  sourceLoci: readonly CalendarSourceLocus[];
}

/** Every datum that can change a pack's meaning participates in its digest. */
const canonicalInput = (fields: CalendarPackCanonicalFields) => JSON.stringify({
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  ...fields
});

const GENERAL_CANONICAL = canonicalInput({
  id: "roman.general.pack",
  version: "2026.02",
  title: "General Roman Calendar",
  scope: "general",
  authority: "Holy See",
  approvalStatus: "promulgated",
  effectiveFrom: "1970-01-01",
  ruleOverrides: { epiphany: "january-6", ascension: "thursday", corpusChristi: "thursday" },
  celebrations: GENERAL_CELEBRATIONS,
  temporalAlternatives: GENERAL_TEMPORAL_ALTERNATIVES,
  sourceLoci: GENERAL_SOURCES
});
const USA_CANONICAL = canonicalInput({
  id: "roman.us.pack",
  version: "2026.1",
  title: "Proper Calendar for the Dioceses of the United States of America",
  scope: "territorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1970-01-01",
  ruleOverrides: {
    epiphany: "sunday-january-2-8",
    corpusChristi: "sunday"
  },
  celebrations: UNITED_STATES_CELEBRATIONS,
  temporalAlternatives: [],
  sourceLoci: USA_SOURCES
});
const USA_SUNDAY_CANONICAL = canonicalInput({
  id: "roman.us.ascension-sunday.pack",
  version: "2026.1",
  title: "United States Ascension-Sunday Provinces",
  scope: "subterritorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1999-09-08",
  ruleOverrides: { ascension: "sunday" },
  celebrations: [],
  temporalAlternatives: [],
  sourceLoci: USA_SOURCES
});
const USA_THURSDAY_CANONICAL = canonicalInput({
  id: "roman.us.ascension-thursday.pack",
  version: "2026.1",
  title: "United States Ascension-Thursday Provinces",
  scope: "subterritorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1999-09-08",
  ruleOverrides: { ascension: "thursday" },
  celebrations: [],
  temporalAlternatives: [],
  sourceLoci: USA_SOURCES
});

export const GENERAL_ROMAN_PACK: CalendarPack = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  id: "roman.general.pack",
  version: "2026.02",
  title: "General Roman Calendar",
  scope: "general",
  authority: "Holy See",
  approvalStatus: "promulgated",
  effectiveFrom: "1970-01-01",
  celebrations: GENERAL_CELEBRATIONS,
  temporalAlternatives: GENERAL_TEMPORAL_ALTERNATIVES,
  ruleOverrides: { epiphany: "january-6", ascension: "thursday", corpusChristi: "thursday" },
  contentHash: "sha256:07cfa5d519b7a345a6bff4d141300486fcb32a777d465ff77ea9367f5e516d4e",
  canonicalCatalogInput: GENERAL_CANONICAL,
  sourceLoci: GENERAL_SOURCES
};

export const UNITED_STATES_PACK: CalendarPack = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  id: "roman.us.pack",
  version: "2026.1",
  title: "Proper Calendar for the Dioceses of the United States of America",
  scope: "territorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1970-01-01",
  celebrations: UNITED_STATES_CELEBRATIONS,
  temporalAlternatives: [],
  ruleOverrides: {
    epiphany: "sunday-january-2-8",
    corpusChristi: "sunday"
  },
  contentHash: "sha256:15b44bda7b1180ac996bfb8a0704378a9791036a1d387055c8a9477498395ef7",
  canonicalCatalogInput: USA_CANONICAL,
  sourceLoci: USA_SOURCES
};

export const UNITED_STATES_ASCENSION_SUNDAY_PACK: CalendarPack = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  id: "roman.us.ascension-sunday.pack",
  version: "2026.1",
  title: "United States Ascension-Sunday Provinces",
  scope: "subterritorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1999-09-08",
  celebrations: [],
  temporalAlternatives: [],
  ruleOverrides: { ascension: "sunday" },
  contentHash: "sha256:88299b27261647d01d3e00a3ef11ab3f473f8b75798aed9e0cbf23220511f78d",
  canonicalCatalogInput: USA_SUNDAY_CANONICAL,
  sourceLoci: USA_SOURCES
};

export const UNITED_STATES_ASCENSION_THURSDAY_PACK: CalendarPack = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  id: "roman.us.ascension-thursday.pack",
  version: "2026.1",
  title: "United States Ascension-Thursday Provinces",
  scope: "subterritorial",
  authority: "United States Conference of Catholic Bishops",
  approvalStatus: "approved-particular",
  effectiveFrom: "1999-09-08",
  celebrations: [],
  temporalAlternatives: [],
  ruleOverrides: { ascension: "thursday" },
  contentHash: "sha256:82acb7ea84068f729a5fde6f4d44cbd7c72c300694643dea8fb5d57f4a372382",
  canonicalCatalogInput: USA_THURSDAY_CANONICAL,
  sourceLoci: USA_SOURCES
};

export const CALENDAR_PACKS: readonly CalendarPack[] = [
  GENERAL_ROMAN_PACK,
  UNITED_STATES_PACK,
  UNITED_STATES_ASCENSION_SUNDAY_PACK,
  UNITED_STATES_ASCENSION_THURSDAY_PACK
];

export const US_LECTIONARY_PACK: LectionaryPack = {
  schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
  id: "roman.ordinary.derived-citation-table",
  version: "tamil-catholic-lectionary-c6c9d79+fidelis-supplement-2026.1",
  title: "Roman Mass citation table (derived public-domain data)",
  authority: "Fidelis, derived from jayarathina/Tamil-Catholic-Lectionary",
  formularyNamespace: "fidelis.lectionary.roman-derived",
  dataPath: "data/lectionary.json",
  contentHash: "sha256:6f7cd44d64ab72780aab09b132e24eefa98732f8df1e3d93b3c1e68e82b65973",
  corpusProvenance:
    "Citation rows derive from the pinned Unlicense Tamil-Catholic-Lectionary table; they are not a licensed transcription of an official episcopal-conference Lectionary edition.",
  sourceLoci: [
    {
      title: "Tamil-Catholic-Lectionary citation tables",
      authority: "jayarathina/Tamil-Catholic-Lectionary contributors",
      url: "https://github.com/jayarathina/Tamil-Catholic-Lectionary/tree/c6c9d79d0f56721f6cc17fb8370d089f0dcd5fd2",
      locator: "MySQL/liturgy_lectionary_table_readings__list.sql at pinned commit c6c9d79"
    }
  ]
};

export const SUPPORTED_LECTIONARY_PACKS: readonly LectionaryPack[] = [US_LECTIONARY_PACK];
export const DEFAULT_LECTIONARY_PACK_ID: LectionaryPackId = US_LECTIONARY_PACK.id;
export const DEFAULT_LECTIONARY_PACK_FINGERPRINT =
  `${US_LECTIONARY_PACK.id}@${US_LECTIONARY_PACK.version}:${US_LECTIONARY_PACK.contentHash}` as const;

export function isLectionaryPackId(value: unknown): value is LectionaryPackId {
  return SUPPORTED_LECTIONARY_PACKS.some((pack) => pack.id === value);
}

export function normalizeLectionaryPackId(value: unknown): LectionaryPackId {
  if (value === "roman.us.lectionary") return DEFAULT_LECTIONARY_PACK_ID;
  return isLectionaryPackId(value) ? value : DEFAULT_LECTIONARY_PACK_ID;
}

export function lectionaryPack(value: unknown): LectionaryPack {
  const id = normalizeLectionaryPackId(value);
  return SUPPORTED_LECTIONARY_PACKS.find((pack) => pack.id === id) ?? US_LECTIONARY_PACK;
}

const BASE_RULES: CalendarProfileRules = {
  epiphany: "january-6",
  ascension: "thursday",
  corpusChristi: "thursday"
};

interface ProfileSeed {
  id: CalendarProfileId;
  label: string;
  shortLabel: string;
  jurisdictionLabel: string;
  countryCode?: "US";
  packs: readonly CalendarPack[];
}

function composeProfile(seed: ProfileSeed): CalendarProfile {
  const rules = seed.packs.reduce<CalendarProfileRules>(
    (current, pack) => ({ ...current, ...pack.ruleOverrides }),
    BASE_RULES
  );
  return {
    schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
    id: seed.id,
    label: seed.label,
    shortLabel: seed.shortLabel,
    rite: "roman-ordinary",
    ...(seed.countryCode ? { countryCode: seed.countryCode } : {}),
    jurisdictionLabel: seed.jurisdictionLabel,
    packs: seed.packs,
    packIds: seed.packs.map((pack) => pack.id),
    rules,
    fingerprint: seed.packs.map((pack) => `${pack.id}@${pack.version}:${pack.contentHash}`).join("+"),
    sourceCheckedAt: "2026-07-23"
  };
}

const GENERAL_PROFILE = composeProfile({
  id: "roman.general",
  label: "General Roman Calendar",
  shortLabel: "General Roman",
  jurisdictionLabel: "General Roman Calendar (no verified local proper)",
  packs: [GENERAL_ROMAN_PACK]
});

const USA_SUNDAY_PROFILE = composeProfile({
  id: "roman.us.ascension-sunday",
  label: "United States, Ascension on Sunday",
  shortLabel: "United States",
  countryCode: "US",
  jurisdictionLabel: "United States, except five Ascension-Thursday provinces",
  packs: [GENERAL_ROMAN_PACK, UNITED_STATES_PACK, UNITED_STATES_ASCENSION_SUNDAY_PACK]
});

const USA_THURSDAY_PROFILE = composeProfile({
  id: "roman.us.ascension-thursday",
  label: "United States, Ascension on Thursday",
  shortLabel: "United States",
  countryCode: "US",
  jurisdictionLabel: "Boston, Hartford, New York, Omaha, or Philadelphia province",
  packs: [GENERAL_ROMAN_PACK, UNITED_STATES_PACK, UNITED_STATES_ASCENSION_THURSDAY_PACK]
});

export const SUPPORTED_CALENDAR_PROFILES: readonly CalendarProfile[] = [
  GENERAL_PROFILE,
  USA_SUNDAY_PROFILE,
  USA_THURSDAY_PROFILE
];

const PROFILES = new Map(SUPPORTED_CALENDAR_PROFILES.map((profile) => [profile.id, profile]));

export const DEFAULT_CALENDAR_PROFILE_ID: CalendarProfileId = "roman.us.ascension-sunday";

export function isCalendarProfileId(value: unknown): value is CalendarProfileId {
  return typeof value === "string" && PROFILES.has(value as CalendarProfileId);
}

/** Preserve the exact pre-v1.24 behavior while moving persistence to profiles. */
export function normalizeCalendarProfile(value: unknown): CalendarProfileId {
  if (value === "universal") return "roman.general";
  if (value === "usa") return "roman.us.ascension-sunday";
  return isCalendarProfileId(value) ? value : DEFAULT_CALENDAR_PROFILE_ID;
}

export function calendarProfile(value: CalendarSelection | unknown): CalendarProfile {
  return PROFILES.get(normalizeCalendarProfile(value)) ?? USA_SUNDAY_PROFILE;
}

const civilDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function packApplies(pack: CalendarPack, occurrence: string): boolean {
  return occurrence >= pack.effectiveFrom &&
    (pack.effectiveThrough === undefined || occurrence <= pack.effectiveThrough);
}

/** Resolve temporal jurisdiction rules using only packs effective on the date. */
export function calendarProfileRulesForDate(
  value: CalendarSelection | unknown,
  date: Date
): CalendarProfileRules {
  const occurrence = civilDateKey(date);
  return calendarProfile(value).packs.reduce<CalendarProfileRules>(
    (rules, pack) => packApplies(pack, occurrence)
      ? { ...rules, ...pack.ruleOverrides }
      : rules,
    BASE_RULES
  );
}

/** Compose celebration rules with last-pack-wins replacement by stable id. */
export function calendarCelebrationRules(
  value: CalendarSelection | unknown,
  occurrenceDate?: Date
): readonly (CalendarCelebrationRule & {
  packId: string;
  packEffectiveFrom: string;
  packEffectiveThrough?: string;
})[] {
  const composed = new Map<string, CalendarCelebrationRule & {
    packId: string;
    packEffectiveFrom: string;
    packEffectiveThrough?: string;
  }>();
  const occurrence = occurrenceDate ? civilDateKey(occurrenceDate) : null;
  for (const pack of calendarProfile(value).packs) {
    if (occurrence && !packApplies(pack, occurrence)) continue;
    for (const celebration of pack.celebrations) {
      composed.set(celebration.id, {
        ...celebration,
        packId: pack.id,
        packEffectiveFrom: pack.effectiveFrom,
        ...(pack.effectiveThrough ? { packEffectiveThrough: pack.effectiveThrough } : {})
      });
    }
  }
  return [...composed.values()];
}

/** Compose recurring temporal alternatives with stable-id replacement. */
export function calendarTemporalAlternativeRules(
  value: CalendarSelection | unknown,
  date?: Date
): readonly (CalendarTemporalAlternativeRule & { packId: string })[] {
  const composed = new Map<string, CalendarTemporalAlternativeRule & { packId: string }>();
  const occurrence = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : null;
  for (const pack of calendarProfile(value).packs) {
    if (
      occurrence &&
      (occurrence < pack.effectiveFrom ||
        (pack.effectiveThrough !== undefined && occurrence > pack.effectiveThrough))
    ) {
      continue;
    }
    for (const alternative of pack.temporalAlternatives) {
      composed.set(alternative.id, { ...alternative, packId: pack.id });
    }
  }
  return [...composed.values()];
}

export function isUnitedStatesProfile(value: CalendarSelection | unknown): boolean {
  return calendarProfile(value).countryCode === "US";
}

export const US_ASCENSION_THURSDAY_PROVINCES = [
  "Boston",
  "Hartford",
  "New York",
  "Omaha",
  "Philadelphia"
] as const;

/** Full Latin ecclesiastical-province selector; only the five named values alter Ascension. */
export const US_ECCLESIASTICAL_PROVINCES = [
  "Anchorage-Juneau", "Atlanta", "Baltimore", "Boston", "Chicago", "Cincinnati",
  "Denver", "Detroit", "Dubuque", "Galveston-Houston", "Hartford", "Indianapolis",
  "Kansas City in Kansas", "Las Vegas", "Los Angeles", "Louisville", "Miami", "Milwaukee", "Mobile",
  "New Orleans", "New York", "Newark", "Oklahoma City", "Omaha", "Philadelphia",
  "Portland in Oregon", "San Antonio", "San Francisco", "Santa Fe", "Seattle",
  "St. Louis", "St. Paul and Minneapolis", "Washington"
] as const;

const THURSDAY_PROVINCES = new Set(
  US_ASCENSION_THURSDAY_PROVINCES.map((province) => province.toLowerCase())
);

export interface CalendarProfileSelectionResult {
  profile: CalendarProfile;
  exact: boolean;
  notice: string | null;
}

/**
 * Resolve a manual country/province choice. The exact catalog currently
 * contains General Roman and U.S. territorial layers only. A diocese name is
 * retained by Settings for the user's reference but cannot fabricate a pack.
 */
export function profileForJurisdiction(
  countryCode: string | null,
  ecclesiasticalProvince?: string | null
): CalendarProfileSelectionResult {
  const country = countryCode?.trim().toUpperCase() ?? "";
  if (!country) return { profile: GENERAL_PROFILE, exact: true, notice: null };
  if (country !== "US") {
    return {
      profile: GENERAL_PROFILE,
      exact: false,
      notice: `No verified local pack is installed for ${country}. Fidelis is using the General Roman Calendar.`
    };
  }
  const province = ecclesiasticalProvince?.trim().toLowerCase() ?? "";
  const profile = THURSDAY_PROVINCES.has(province) ? USA_THURSDAY_PROFILE : USA_SUNDAY_PROFILE;
  if (!province) {
    return {
      profile,
      exact: false,
      notice:
        "Select an ecclesiastical province to verify the Ascension rule. Until then Fidelis uses the U.S. Sunday observance."
    };
  }
  const knownProvince = US_ECCLESIASTICAL_PROVINCES.some(
    (candidate) => candidate.toLowerCase() === province
  );
  return knownProvince
    ? { profile, exact: true, notice: null }
    : {
        profile,
        exact: false,
        notice:
          "That province is not in the verified selector. Fidelis is using the U.S. Sunday observance."
      };
}

export interface MonthDay {
  month: number;
  day: number;
}

export type IndividualChurchColor = "white" | "red";

/**
 * The only user-supplied proper Fidelis accepts. Rank and precedence are not
 * user-editable: each complete entry is a class-4 proper solemnity of one
 * individual church. A missing title or date remains an inert draft.
 */
export interface IndividualChurchProper {
  churchTitle: string;
  titleDate: MonthDay | null;
  titleColor: IndividualChurchColor;
  dedicationAnniversary: MonthDay | null;
  principalPatronTitle: string;
  principalPatronDate: MonthDay | null;
  principalPatronColor: IndividualChurchColor;
}

export const EMPTY_INDIVIDUAL_CHURCH_PROPER: IndividualChurchProper = Object.freeze({
  churchTitle: "",
  titleDate: null,
  titleColor: "white",
  dedicationAnniversary: null,
  principalPatronTitle: "",
  principalPatronDate: null,
  principalPatronColor: "white"
});

const monthDay = (value: unknown): MonthDay | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { month, day } = value as { month?: unknown; day?: unknown };
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  const numericMonth = month as number;
  const numericDay = day as number;
  // A 29 February proper exists only in leap years. The engine checks that a
  // fixed date survives Gregorian construction instead of rolling to 1 March.
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return numericMonth >= 1 && numericMonth <= 12 &&
    numericDay >= 1 && numericDay <= days[numericMonth - 1]
    ? { month: numericMonth, day: numericDay }
    : null;
};

const localColor = (value: unknown): IndividualChurchColor =>
  value === "red" ? "red" : "white";

const localTitle = (value: unknown): string =>
  typeof value === "string" ? value.trim().slice(0, 120) : "";

const normalizeIndividualChurchProperFields = (value: unknown): IndividualChurchProper => {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const legacyPatron = raw.principalPatron && typeof raw.principalPatron === "object"
    ? raw.principalPatron as Record<string, unknown>
    : null;
  return {
    churchTitle: localTitle(raw.churchTitle ?? raw.title),
    titleDate: monthDay(raw.titleDate),
    titleColor: localColor(raw.titleColor),
    dedicationAnniversary: monthDay(raw.dedicationAnniversary),
    principalPatronTitle: localTitle(raw.principalPatronTitle ?? legacyPatron?.title),
    principalPatronDate: monthDay(raw.principalPatronDate ?? legacyPatron),
    principalPatronColor: localColor(raw.principalPatronColor ?? legacyPatron?.color)
  };
};

const monthDayKey = (date: MonthDay): string => `${date.month}-${date.day}`;

/** Human-readable duplicate-date receipts for Settings and import validation. */
export function individualChurchProperDateConflicts(value: unknown): string[] {
  const proper = normalizeIndividualChurchProperFields(value);
  const slots = [
    ["title celebration", proper.titleDate],
    ["dedication anniversary", proper.dedicationAnniversary],
    ["principal patron celebration", proper.principalPatronDate]
  ] as const;
  const firstByDate = new Map<string, string>();
  const conflicts: string[] = [];
  for (const [label, date] of slots) {
    if (!date) continue;
    const key = monthDayKey(date);
    const first = firstByDate.get(key);
    if (first) conflicts.push(`${label} duplicates ${first}`);
    else firstByDate.set(key, label);
  }
  return conflicts;
}

/**
 * Migrate, bound, and validate the persisted on-device proper. Duplicate
 * governors fail closed with deterministic title, dedication, patron priority.
 */
export function normalizeIndividualChurchProper(value: unknown): IndividualChurchProper {
  const proper = normalizeIndividualChurchProperFields(value);
  const used = new Set<string>();
  const unique = (date: MonthDay | null): MonthDay | null => {
    if (!date) return null;
    const key = monthDayKey(date);
    if (used.has(key)) return null;
    used.add(key);
    return date;
  };
  return {
    ...proper,
    titleDate: unique(proper.titleDate),
    dedicationAnniversary: unique(proper.dedicationAnniversary),
    principalPatronDate: unique(proper.principalPatronDate)
  };
}

/** Narrow shape guard for on-device church propers; no arbitrary rank injection. */
export function validateIndividualChurchProper(value: unknown): value is IndividualChurchProper {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = new Set([
    "churchTitle",
    "titleDate",
    "titleColor",
    "dedicationAnniversary",
    "principalPatronTitle",
    "principalPatronDate",
    "principalPatronColor"
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  const candidate = value as IndividualChurchProper;
  const validDate = (date: MonthDay | null) => date === null || monthDay(date) !== null;
  return (
    typeof candidate.churchTitle === "string" && candidate.churchTitle.length <= 120 &&
    typeof candidate.principalPatronTitle === "string" &&
    candidate.principalPatronTitle.length <= 120 &&
    (candidate.titleColor === "white" || candidate.titleColor === "red") &&
    (candidate.principalPatronColor === "white" || candidate.principalPatronColor === "red") &&
    validDate(candidate.titleDate) &&
    validDate(candidate.dedicationAnniversary) &&
    validDate(candidate.principalPatronDate) &&
    individualChurchProperDateConflicts(candidate).length === 0
  );
}

const fnv1a32 = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/** Versioned content fingerprint for the constrained on-device calendar layer. */
export function individualChurchProperFingerprint(value: unknown): string {
  const canonical = JSON.stringify(normalizeIndividualChurchProper(value));
  return `local.individual-church@1:fnv1a32:${fnv1a32(canonical)}`;
}

export interface IndividualChurchCalendarLayer {
  schemaVersion: typeof CALENDAR_PROFILE_SCHEMA_VERSION;
  id: "local.individual-church";
  version: "1";
  scope: "individual-church";
  authority: "User-supplied on this device";
  approvalStatus: "user-supplied";
  fingerprint: string;
  provenance: string;
  celebrations: readonly (CalendarCelebrationRule & { packId: "local.individual-church" })[];
}

/** Explicit provenance envelope for the only user-composed calendar layer. */
export function individualChurchCalendarLayer(value: unknown): IndividualChurchCalendarLayer {
  return {
    schemaVersion: CALENDAR_PROFILE_SCHEMA_VERSION,
    id: "local.individual-church",
    version: "1",
    scope: "individual-church",
    authority: "User-supplied on this device",
    approvalStatus: "user-supplied",
    fingerprint: individualChurchProperFingerprint(value),
    provenance:
      "User-entered title, dedication anniversary, and principal patron only; no diocesan or territorial approval is implied.",
    celebrations: individualChurchCelebrationRules(value)
  };
}

/** Generate only the three class-4 solemnities permitted by liturgical law. */
export function individualChurchCelebrationRules(
  value: unknown
): readonly (CalendarCelebrationRule & { packId: "local.individual-church" })[] {
  const proper = normalizeIndividualChurchProper(value);
  const rules: (CalendarCelebrationRule & { packId: "local.individual-church" })[] = [];
  const add = (
    id: string,
    name: string,
    date: MonthDay,
    color: IndividualChurchColor
  ) => {
    rules.push({
      id,
      formularyId: null,
      packId: "local.individual-church",
      name,
      rank: "Solemnity",
      color,
      precedence: CALENDAR_PRECEDENCE.properSolemnity,
      dateRule: { kind: "fixed", ...date },
      transferPolicy: "next-free-day"
    });
  };
  if (proper.churchTitle && proper.titleDate) {
    add(
      "local.individual-church.title",
      `${proper.churchTitle}, Title of This Church`,
      proper.titleDate,
      proper.titleColor
    );
  }
  if (proper.dedicationAnniversary) {
    add(
      "local.individual-church.dedication",
      `Anniversary of the Dedication of ${proper.churchTitle || "This Church"}`,
      proper.dedicationAnniversary,
      "white"
    );
  }
  if (proper.principalPatronTitle && proper.principalPatronDate) {
    add(
      "local.individual-church.principal-patron",
      `${proper.principalPatronTitle}, Principal Patron of This Church`,
      proper.principalPatronDate,
      proper.principalPatronColor
    );
  }
  return rules;
}
