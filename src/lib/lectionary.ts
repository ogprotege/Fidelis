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
  Celebration,
  adventStart,
  currentCalendarProfile,
  easterDate,
  epiphanyDate,
  liturgicalDay
} from "./liturgical";
import {
  CALENDAR_PRECEDENCE,
  DEFAULT_LECTIONARY_PACK_ID,
  EMPTY_INDIVIDUAL_CHURCH_PROPER,
  lectionaryPack,
  normalizeLectionaryPackId,
  type CalendarColor,
  type CalendarSelection,
  type IndividualChurchProper,
  type LectionaryPackId
} from "./calendarProfile";
import { Book } from "./canon";
import { getSettings } from "./storage";

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
  /** Lawful optional memorial formularies offered after the ferial readings. */
  optionalMemorials?: { label: string; code: string; rows: LectionaryRow[] }[];
  /** Obligatory memorial formularies that the source table carries but does
   *  not mark as prescribed in place of the weekday cycle. */
  memorialFormularies?: { label: string; code: string; rows: LectionaryRow[] }[];
  /** Other complete Masses assigned to the same civil day. */
  massAlternatives?: { label: string; code: string; rows: LectionaryRow[] }[];
  /** Permitted formularies whose reading tables are identified but not bundled. */
  formularyOptions?: {
    id: string;
    label: string;
    color: CalendarColor;
    lectionaryReference: string;
  }[];
  /** Explicit receipt when the selected local calendar governs with a feast
   *  or solemnity whose proper is not present in the selected lectionary pack.
   *  `rows` then contain the seasonal fallback and must not be represented as
   *  the local celebration's proper readings. */
  formularyState?: MissingLocalFormularyState;
  /** Calendar choices with no mapped table in this derived corpus. */
  unavailableFormularies?: MissingFormularyState[];
}

export interface MissingLocalFormularyState {
  kind: "missing-local-formulary";
  celebrationId: string;
  celebrationName: string;
  formularyId: string | null;
  calendarPackId: string;
  fallback: "seasonal-readings";
  lectionaryPackId: LectionaryPackId;
}

export interface MissingFormularyState {
  kind: "unavailable-formulary";
  celebrationId: string;
  celebrationName: string;
  formularyId: string | null;
  calendarPackId: string;
  lectionaryPackId: LectionaryPackId;
}

const cache = new Map<LectionaryPackId, Promise<LectionaryData>>();
export function loadLectionary(
  packId: LectionaryPackId = getSettings().lectionaryPackId
): Promise<LectionaryData> {
  const normalized = normalizeLectionaryPackId(packId);
  let request = cache.get(normalized);
  if (!request) {
    const pack = lectionaryPack(normalized);
    request = fetch(`${import.meta.env.BASE_URL}${pack.dataPath}`).then((r) => {
      if (!r.ok) throw new Error(`lectionary data: HTTP ${r.status}`);
      return r.json();
    });
    cache.set(normalized, request);
    // Never memoize a failure: a transient offline blip must not pin every
    // future readings load to the same rejection until a full reload.
    request.catch(() => {
      cache.delete(normalized);
    });
  }
  return request;
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

/**
 * Stable CalendarCelebrationRule.formularyId -> keys in the selected
 * lectionary corpus. Display names are intentionally absent from this map so
 * localization and copy edits cannot disconnect a celebration from readings.
 */
export const LECTIONARY_CODE_BY_FORMULARY_ID: Readonly<Record<string, string>> = {
  "grc.fixed.01-01": "Blessed Virgin Mary, the Mother of God",
  "grc.fixed.01-02": "Saints Basil the Great and Gregory Nazianzen, bishops and doctors",
  "grc.fixed.01-21": "Saint Agnes, virgin and martyr",
  "grc.vincent": "Saint Vincent, deacon and martyr",
  "grc.saturday-bvm": "_Mary",
  "grc.fixed.01-25": "The Conversion of Saint Paul, apostle",
  "grc.fixed.01-26": "Saints Timothy and Titus, bishops",
  "grc.fixed.01-28": "Saint Thomas Aquinas, priest and doctor",
  "grc.fixed.01-31": "Saint John Bosco, priest",
  "grc.fixed.02-02": "Presentation of the Lord",
  "grc.fixed.02-11": "Our Lady of Lourdes",
  "grc.fixed.02-14": "Saints Cyril, monk, and Methodius, bishop",
  "grc.fixed.02-22": "Chair of Saint Peter, apostle",
  "grc.fixed.03-17": "Saint Patrick, bishop",
  "grc.fixed.03-19": "Saint Joseph Husband of the Blessed Virgin Mary",
  "grc.fixed.03-25": "Annunciation of the Lord",
  "grc.fixed.04-25": "Saint Mark the Evangelist",
  "grc.fixed.04-29": "Saint Catherine of Siena, virgin and doctor of the Church",
  "grc.fixed.05-01": "Saint Joseph the Worker",
  "grc.fixed.05-02": "Saint Athanasius, bishop and doctor",
  "grc.fixed.05-03": "Saints Philip and James, Apostles",
  "grc.fixed.05-14": "Saint Matthias the Apostle",
  "grc.fixed.05-31": "Visitation of the Blessed Virgin Mary",
  "grc.fixed.06-05": "Saint Boniface, bishop and martyr",
  "grc.fixed.06-11": "Saint Barnabas the Apostle",
  "grc.fixed.06-13": "Saint Anthony of Padua, priest and doctor",
  "grc.fixed.06-24": "Birth of Saint John the Baptist",
  "grc.fixed.06-28": "Saint Irenaeus, bishop and martyr",
  "grc.fixed.06-29": "Saints Peter and Paul, Apostles",
  "grc.fixed.07-03": "Saint Thomas the Apostle",
  "grc.fixed.07-11": "Saint Benedict, abbot",
  "grc.fixed.07-16": "Our Lady of Mount Carmel",
  "grc.fixed.07-22": "Saint Mary Magdalene",
  "grc.fixed.07-25": "Saint James, apostle",
  "grc.fixed.07-26": "Saints Joachim and Anne",
  "grc.fixed.07-29": "Saints Martha, Mary and Lazarus",
  "grc.fixed.07-31": "Saint Ignatius of Loyola, priest",
  "grc.fixed.08-01": "Saint Alphonsus Maria de Liguori, bishop and doctor of the Church",
  "grc.fixed.08-04": "Saint Jean Vianney (the Curé of Ars), priest",
  "grc.fixed.08-06": "Transfiguration of the Lord",
  "grc.fixed.08-08": "Saint Dominic, priest",
  "grc.fixed.08-10": "Saint Lawrence, deacon and martyr",
  "grc.fixed.08-11": "Saint Clare, virgin",
  "grc.fixed.08-14": "Saint Maximilian Mary Kolbe, priest and martyr",
  "grc.fixed.08-15": "Assumption of the Blessed Virgin Mary",
  "grc.fixed.08-22": "Queenship of Blessed Virgin Mary",
  "grc.fixed.08-24": "Saint Bartholomew the Apostle",
  "grc.fixed.08-27": "Saint Monica",
  "grc.fixed.08-28": "Saint Augustine of Hippo, bishop and doctor of the Church",
  "grc.fixed.08-29": "The Beheading of Saint John the Baptist, martyr",
  "grc.fixed.09-08": "Birth of the Blessed Virgin Mary",
  "grc.fixed.09-14": "Exaltation of the Holy Cross",
  "grc.fixed.09-15": "Our Lady of Sorrows",
  "grc.fixed.09-21": "Saint Matthew the Evangelist, Apostle, Evangelist",
  "grc.fixed.09-29": "Saints Michael, Gabriel and Raphael, Archangels",
  "grc.fixed.09-30": "Saint Jerome, priest and doctor",
  "grc.fixed.10-01": "Saint Thérèse of the Child Jesus, virgin and doctor",
  "grc.fixed.10-02": "Guardian Angels",
  "grc.fixed.10-04": "Saint Francis of Assisi",
  "grc.fixed.10-07": "Our Lady of the Rosary",
  "grc.fixed.10-09": "OLM655bis-Newman",
  "grc.fixed.10-15": "Saint Teresa of Jesus, virgin and doctor",
  "grc.fixed.10-17": "Saint Ignatius of Antioch, bishop and martyr",
  "grc.fixed.10-18": "Saint Luke the Evangelist",
  "grc.fixed.10-28": "Saint Simon and Saint Jude, apostles",
  "grc.fixed.11-01": "All Saints",
  "grc.fixed.11-02": "All Souls",
  "grc.fixed.11-09": "Dedication of the Lateran basilica",
  "grc.fixed.11-11": "Saint Martin of Tours, bishop",
  "grc.fixed.11-21": "Presentation of the Blessed Virgin Mary",
  "grc.fixed.11-22": "Saint Cecilia",
  "grc.fixed.11-30": "Saint Andrew the Apostle",
  "grc.fixed.12-07": "Saint Ambrose, bishop and doctor",
  "grc.fixed.12-08": "Immaculate Conception of the Blessed Virgin Mary",
  "grc.fixed.12-13": "Saint Lucy of Syracuse, virgin and martyr",
  "grc.fixed.12-14": "Saint John of the Cross, priest and doctor",
  "grc.fixed.12-25": "Nativity of the Lord 4",
  "grc.fixed.12-26": "Saint Stephen, the first martyr",
  "grc.fixed.12-27": "Saint John the Apostle and evangelist",
  "grc.fixed.12-28": "Holy Innocents, martyrs",
  "grc.epiphany": "CW03-Epiphany",
  "grc.ascension": "EW07-Ascension",
  "grc.pentecost": "EW08-Pentecost",
  "grc.mary-mother-church": "OW00-MaryMotherofChurch",
  "grc.trinity": "OW00-Trinity",
  "grc.corpus-christi": "OW00-CorpusChristi",
  "grc.sacred-heart": "OW00-SacredHeart",
  "grc.immaculate-heart": "OW00-ImmaculateHeart",
  "grc.holy-family": "CW01-HolyFamily",
  "grc.baptism-lord": "CW04-Baptism",
  "grc.raymond-penyafort": "Saint Raymond of Penyafort, priest",
  "grc.hilary": "Saint Hilary of Poitiers, bishop and doctor",
  "grc.anthony-abbot": "Saint Anthony of Egypt, abbot",
  "grc.fabian": "Saint Fabian, pope and martyr",
  "grc.sebastian": "Saint Sebastian, martyr",
  "grc.francis-de-sales": "Saint Francis de Sales, bishop and doctor",
  "grc.angela-merici": "Saint Angela Merici, virgin",
  "grc.ansgar": "Saint Ansgar, bishop",
  "grc.blaise": "Saint Blase, bishop and martyr",
  "grc.agatha": "Saint Agatha, virgin and martyr",
  "grc.paul-miki": "Saints Paul Miki and companions, martyrs",
  "grc.jerome-emiliani": "Saint Jerome Emiliani, priest",
  "grc.scholastica": "Saint Scholastica, virgin",
  "grc.servite-founders": "Seven Holy Founders of the Servite Order",
  "grc.peter-damian": "Saint Peter Damian, bishop and doctor of the Church",
  "grc.polycarp": "Saint Polycarp, bishop and martyr",
  "grc.casimir": "Saint Casimir",
  "grc.perpetua-felicity": "Saints Perpetua and Felicity, martyrs",
  "grc.john-of-god": "Saint John of God, religious",
  "grc.frances-of-rome": "Saint Frances of Rome, religious",
  "grc.cyril-jerusalem": "Saint Cyril of Jerusalem, bishop and doctor",
  "grc.turibius": "Saint Turibius of Mogrovejo, bishop",
  "grc.francis-paola": "Saint Francis of Paola, hermit",
  "grc.isidore-seville": "Saint Isidore, bishop and doctor of the Church",
  "grc.vincent-ferrer": "Saint Vincent Ferrer, priest",
  "grc.john-baptist-de-la-salle": "Saint John Baptist de la Salle, priest",
  "grc.stanislaus": "Saint Stanislaus, bishop and martyr",
  "grc.martin-i": "Saint Martin I, pope and martyr",
  "grc.anselm": "Saint Anselm of Canterbury, bishop and doctor of the Church",
  "grc.george": "Saint George, martyr",
  "grc.fidelis-sigmaringen": "Saint Fidelis of Sigmaringen, priest and martyr",
  "grc.peter-chanel": "Saint Peter Chanel, priest and martyr",
  "grc.pius-v": "Saint Pius V, pope",
  "grc.nereus-achilleus": "Saints Nereus and Achilleus, martyrs",
  "grc.pancras": "Saint Pancras, martyr",
  "grc.john-i": "Saint John I, pope and martyr",
  "grc.bernardine-siena": "Saint Bernardine of Siena, priest",
  "grc.bede": "Saint Bede the Venerable, priest and doctor",
  "grc.gregory-vii": "Saint Gregory VII, pope",
  "grc.mary-magdalene-de-pazzi": "Saint Mary Magdalene de Pazzi, virgin",
  "grc.philip-neri": "Saint Philip Neri, priest",
  "grc.augustine-canterbury": "Saint Augustine (Austin) of Canterbury, bishop",
  "grc.fixed.05-29": "Saint Paul VI, pope",
  "grc.justin": "Saint Justin Martyr",
  "grc.marcellinus-peter": "Saints Marcellinus and Peter, martyrs",
  "grc.charles-lwanga": "Saints Charles Lwanga and companions, martyrs",
  "grc.norbert": "Saint Norbert, bishop",
  "grc.ephrem": "Saint Ephrem, deacon and doctor",
  "grc.romuald": "Saint Romuald, abbot",
  "grc.aloysius-gonzaga": "Saint Aloysius Gonzaga, religious",
  "grc.paulinus-nola": "Saint Paulinus of Nola, bishop",
  "grc.fisher-more": "Saints John Fisher, bishop and martyr and Thomas More, martyr",
  "grc.cyril-alexandria": "Saint Cyril of Alexandria, bishop and doctor",
  "grc.first-martyrs-rome": "First Martyrs of the Church of Rome",
  "grc.st-elizabeth-portugal": "Saint Elizabeth of Portugal",
  "grc.anthony-mary-zaccaria": "Saint Anthony Zaccaria, priest",
  "grc.maria-goretti": "Saint Maria Goretti, virgin and martyr",
  "grc.henry": "Saint Henry",
  "grc.st-camillus": "Saint Camillus de Lellis, priest",
  "grc.fixed.07-15": "Saint Bonaventure, bishop and doctor",
  "grc.lawrence-brindisi": "Saint Lawrence of Brindisi, priest and doctor",
  "grc.bridget": "Saint Birgitta, religious",
  "grc.peter-chrysologus": "Saint Peter Chrysologus, bishop and doctor",
  "grc.eusebius-vercelli": "Saint Eusebius of Vercelli, bishop",
  "grc.mary-major": "Dedication of the Basilica of Saint Mary Major",
  "grc.sixtus-ii": "Saint Sixtus II, pope, and companions, martyrs",
  "grc.cajetan": "Saint Cajetan, priest",
  "grc.jane-frances-de-chantal": "Saint Jane Frances de Chantal, religious",
  "grc.pontian-hippolytus": "Saints Pontian, pope, and Hippolytus, priest, martyrs",
  "grc.stephen-hungary": "Saint Stephen of Hungary",
  "grc.john-eudes": "Saint John Eudes, priest",
  "grc.bernard": "Saint Bernard of Clairvaux, abbot and doctor of the Church",
  "grc.pius-x": "Saint Pius X, pope",
  "grc.rose-lima": "Saint Rose of Lima, virgin",
  "grc.louis": "Saint Louis",
  "grc.joseph-calasanz": "Saint Joseph of Calasanz, priest",
  "grc.gregory-great": "Saint Gregory the Great, pope and doctor",
  "grc.fixed.09-05": "IN Saint Teresa of Calcutta, virgin",
  "grc.john-chrysostom": "Saint John Chrysostom, bishop and doctor",
  "grc.cornelius-cyprian": "Saints Cornelius, pope, and Cyprian, bishop, martyrs",
  "grc.robert-bellarmine": "Saint Robert Bellarmine, bishop and doctor",
  "grc.januarius": "Saint Januarius, bishop and martyr",
  "grc.cosmas-damian": "Saints Cosmas and Damian, martyrs",
  "grc.vincent-de-paul": "Saint Vincent de Paul, priest",
  "grc.wenceslaus": "Saint Wenceslaus, martyr",
  "grc.fixed.10-05": "Saint Maria Faustina Kowalska, virgin",
  "grc.bruno": "Saint Bruno, priest",
  "grc.denis": "Saint Denis and companions, martyrs",
  "grc.john-leonardi": "Saint John Leonardi, priest",
  "grc.callistus": "Saint Callistus I, pope and martyr",
  "grc.hedwig": "Saint Hedwig, religious",
  "grc.margaret-mary": "Saint Margaret Mary Alacoque, virgin",
  "grc.st-paul-cross": "Saint Paul of the Cross, priest",
  "grc.john-capistrano": "Saint John of Capistrano, priest",
  "grc.anthony-mary-claret": "Saint Anthony Mary Claret, bishop",
  "grc.martin-de-porres": "Saint Martin de Porres, religious",
  "grc.charles-borromeo": "Saint Charles Borromeo, bishop",
  "grc.leo-great": "Saint Leo the Great, pope and doctor",
  "grc.josaphat": "Saint Josaphat, bishop and martyr",
  "grc.albert-great": "Saint Albert the Great, bishop and doctor",
  "grc.margaret-scotland": "Saint Margaret of Scotland",
  "grc.gertrude": "Saint Gertrude the Great, virgin",
  "grc.elizabeth-hungary": "Saint Elizabeth of Hungary, religious",
  "grc.dedication-peter-paul": "Dedication of the basilicas of Saints Peter and Paul, Apostles",
  "grc.clement-i": "Saint Clement I, pope and martyr",
  "grc.columban": "Saint Columban, religious",
  "grc.francis-xavier": "Saint Francis Xavier, priest",
  "grc.john-damascene": "Saint John Damascene, priest and doctor",
  "grc.nicholas": "Saint Nicholas, bishop",
  "grc.damasus-i": "Saint Damasus I, pope",
  "grc.peter-canisius": "Saint Peter Canisius, priest and doctor",
  "grc.john-kanty": "Saint John of Kanty, priest",
  "grc.thomas-becket": "Saint Thomas Becket, bishop and martyr",
  "grc.sylvester-i": "Saint Sylvester I, pope",
  "us.brebeuf-jogues":
    "Saints Jean de Brébeuf, Isaac Jogues, priests and martyrs; and their companions, martyrs"
};

/**
 * Small, sourced supplements absent from the pinned community table. Newman
 * was inserted into the General Roman Calendar after that table's source
 * commit. The Holy See promulgated these exact citations as OLM 655bis on
 * 3 February 2026; no scripture text is copied here.
 */
export const LECTIONARY_SUPPLEMENTS: Readonly<LectionaryData> = {
  "OLM655bis-Newman": [
    { t: 1, b: "sirach", s: [[39, 8, 14]] },
    {
      t: 2,
      b: "psalms",
      s: [[40, 2, 2], [40, 4, 4], [40, 7, 10]],
      partial: true
    },
    { t: 6, b: "matthew", s: [[13, 47, 52]] }
  ]
};

/** Return the effective citation catalog without mutating the loaded corpus. */
export function lectionaryDataForPack(
  data: LectionaryData,
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID
): LectionaryData {
  return normalizeLectionaryPackId(packId) === DEFAULT_LECTIONARY_PACK_ID
    ? { ...data, ...LECTIONARY_SUPPLEMENTS }
    : data;
}

function formularyCode(
  formularyId: string | null,
  packId: LectionaryPackId
): string | undefined {
  if (!formularyId || normalizeLectionaryPackId(packId) !== DEFAULT_LECTIONARY_PACK_ID) {
    return undefined;
  }
  return LECTIONARY_CODE_BY_FORMULARY_ID[formularyId];
}

export interface MassSetDefinition {
  primaryCode: string;
  primaryLabel: string;
  alternatives: readonly {
    /** Existing source-table code that supplies either the complete Mass or
     *  the replacement reading identified by `replaceReadingType`. */
    code: string;
    label: string;
    /** A lawful option confined to one Sunday cycle. */
    cycle?: SundayCycle;
    /** Compose a complete Mass by replacing this reading type in the primary
     *  set with rows from `code`. */
    replaceReadingType?: 1 | 2 | 3 | 6;
    /** Stable derived identity when `code` is only a replacement-row source. */
    resultCode?: string;
  }[];
}

/** Multiple complete Masses lawfully assigned to one civil day. */
export const MASS_SETS_BY_CELEBRATION_ID: Readonly<Record<string, MassSetDefinition>> = {
  "grc.fixed.11-02": {
    primaryCode: "All Souls A",
    primaryLabel: "First selection for All Souls",
    alternatives: [
      { code: "All Souls B", label: "Second selection for All Souls" },
      { code: "All Souls C", label: "Third selection for All Souls" }
    ]
  },
  "grc.fixed.12-25": {
    primaryCode: "Nativity of the Lord 4",
    primaryLabel: "Mass during the Day",
    alternatives: [
      { code: "Nativity of the Lord 1", label: "Vigil Mass" },
      { code: "Nativity of the Lord 2", label: "Mass during the Night" },
      { code: "Nativity of the Lord 3", label: "Mass at Dawn" }
    ]
  },
  // The source corpus already carries both lawful Easter Gospel substitutes:
  // Luke 24:1-12 in the Year C Vigil row and Luke 24:13-35 on Easter Wednesday.
  // Reuse only those Gospel rows while retaining Easter Sunday's other readings.
  "grc.easter-sunday": {
    primaryCode: "EW01-0Sun",
    primaryLabel: "Mass during the Day",
    alternatives: [
      {
        code: "LW06-6Sat C",
        label: "Mass during the Day (Year C Gospel option)",
        cycle: "C",
        replaceReadingType: 6,
        resultCode: "EW01-0Sun C-Gospel"
      },
      {
        code: "EW01-3Wed",
        label: "Afternoon or evening Mass",
        replaceReadingType: 6,
        resultCode: "EW01-0Sun Afternoon-Evening"
      }
    ]
  },
  "grc.pentecost": {
    primaryCode: "EW08-Pentecost",
    primaryLabel: "Mass during the Day",
    alternatives: [{ code: "EW08-Pentecost - Vigil", label: "Vigil Mass" }]
  },
  "grc.fixed.06-24": {
    primaryCode: "Birth of Saint John the Baptist",
    primaryLabel: "Mass during the Day",
    alternatives: [{ code: "Birth of Saint John the Baptist - Vigil", label: "Vigil Mass" }]
  },
  "grc.fixed.06-29": {
    primaryCode: "Saints Peter and Paul, Apostles",
    primaryLabel: "Mass during the Day",
    alternatives: [{ code: "Saints Peter and Paul, Apostles - Vigil", label: "Vigil Mass" }]
  },
  "grc.fixed.08-15": {
    primaryCode: "Assumption of the Blessed Virgin Mary",
    primaryLabel: "Mass during the Day",
    alternatives: [{ code: "Assumption of the Blessed Virgin Mary - Vigil", label: "Vigil Mass" }]
  }
};

function canonicalLectionaryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalLectionaryValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalLectionaryValue(child)])
    );
  }
  return value;
}

/** Canonical input for the code-backed portion of the installed citation pack.
 * Native snapshot invalidation must change when a stable-ID mapping, bundled
 * supplement, or complete-Mass composition changes, even if the raw generated
 * citation table itself is byte-identical. */
export function lectionaryResolverCatalogInput(): string {
  return JSON.stringify(canonicalLectionaryValue({
    formularyCodes: LECTIONARY_CODE_BY_FORMULARY_ID,
    massSets: MASS_SETS_BY_CELEBRATION_ID,
    supplements: LECTIONARY_SUPPLEMENTS
  }));
}

/** Resolve a celebration without consulting its mutable display name. */
export function celebrationFormularyCodes(
  celebration: Pick<Celebration, "formularyId">,
  cycle: SundayCycle,
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID
): string[] | null {
  const code = formularyCode(celebration.formularyId, packId);
  if (celebration.formularyId === "grc.fixed.11-02" && code) return [`${code} A`];
  return code ? [`${code} ${cycle}`, code] : null;
}

export function missingLocalFormularyStateForCelebration(
  celebration: Celebration,
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID
): MissingLocalFormularyState | undefined {
  if (
    celebration.precedence > CALENDAR_PRECEDENCE.properFeast ||
    celebration.packId === "roman.general.pack" ||
    formularyCode(celebration.formularyId, packId) !== undefined
  ) {
    return undefined;
  }
  return {
    kind: "missing-local-formulary",
    celebrationId: celebration.id,
    celebrationName: celebration.name,
    formularyId: celebration.formularyId,
    calendarPackId: celebration.packId,
    fallback: "seasonal-readings",
    lectionaryPackId: normalizeLectionaryPackId(packId)
  };
}

function unavailableFormulary(
  celebration: Celebration,
  packId: LectionaryPackId
): MissingFormularyState | undefined {
  const seasonalResolutionIds = new Set([
    "grc.ash-wednesday",
    "grc.palm-sunday",
    "grc.holy-thursday",
    "grc.good-friday",
    "grc.holy-saturday",
    "grc.easter-sunday",
    "grc.divine-mercy-sunday",
    "grc.christ-king"
  ]);
  // Typed formulary choices (national days of prayer/thanksgiving) already
  // carry their exact official references and are reported separately.
  if (
    seasonalResolutionIds.has(celebration.id) ||
    celebration.formularyOptions?.length ||
    formularyCode(celebration.formularyId, packId)
  ) {
    return undefined;
  }
  return {
    kind: "unavailable-formulary",
    celebrationId: celebration.id,
    celebrationName: celebration.name,
    formularyId: celebration.formularyId,
    calendarPackId: celebration.packId,
    lectionaryPackId: normalizeLectionaryPackId(packId)
  };
}

const ww = (n: number) => String(n).padStart(2, "0");

export interface CandidateGroup {
  codes: string[];
  /** proper = mapped formulary of a high-precedence governing day · seasonal = the ferial cycle
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
  region: CalendarSelection = currentCalendarProfile(),
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID,
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): CandidateGroup[] {
  const lit = liturgicalDay(date, region, individualChurchProper);
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
  // a parallel reimplementation of it: a mapped governing day above memorial rank brings
  // its proper Mass, the seasonal cycle follows as fallback, and memorial
  // formularies trail the ferial readings (resolveReadings promotes the
  // marked, prescribed ones — see below).
  const governing = lit.celebrations[0];
  if (governing && governing.precedence <= CALENDAR_PRECEDENCE.properFeast) {
    const codes = celebrationFormularyCodes(governing, cyc, packId);
    if (codes) groups.push({ codes, kind: "proper", name: governing.name });
    for (const option of MASS_SETS_BY_CELEBRATION_ID[governing.id]?.alternatives ?? []) {
      if (option.cycle && option.cycle !== cyc) continue;
      groups.push({ codes: [option.code], kind: "proper", name: option.label });
    }
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
        if (d === 25) {
          if (!governing) seasonal(["Nativity of the Lord 4"]);
        }
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

  // After the ferial cycle, offer both observed memorial propers and lawful
  // optional alternatives. The latter never govern automatically, but their
  // formularies must remain visible and selectable.
  for (const c of [...lit.celebrations, ...lit.alternatives]) {
    if (c.rank !== "Memorial") continue;
    const codes = celebrationFormularyCodes(c, cyc, packId);
    if (codes)
      groups.push({
        codes,
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
  region: CalendarSelection = currentCalendarProfile(),
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID,
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): string[][] {
  return dayCodeGroups(date, region, packId, individualChurchProper).map((g) => g.codes);
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

function missingLocalFormularyState(
  date: Date,
  region: CalendarSelection,
  packId: LectionaryPackId,
  individualChurchProper: IndividualChurchProper
): MissingLocalFormularyState | undefined {
  const governing = liturgicalDay(date, region, individualChurchProper).celebrations[0];
  return governing ? missingLocalFormularyStateForCelebration(governing, packId) : undefined;
}

/** Resolve the Mass readings for a date against loaded lectionary data. */
export function resolveReadings(
  data: LectionaryData,
  date: Date,
  region: CalendarSelection = currentCalendarProfile(),
  packId: LectionaryPackId = DEFAULT_LECTIONARY_PACK_ID,
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): DayReadings | null {
  const normalizedPackId = normalizeLectionaryPackId(packId);
  const effectiveData = lectionaryDataForPack(data, normalizedPackId);
  const lit = liturgicalDay(date, region, individualChurchProper);
  const governing = lit.celebrations[0];
  const formularyState = missingLocalFormularyState(
    date,
    region,
    normalizedPackId,
    individualChurchProper
  );
  const calendarChoices = [...lit.celebrations, ...lit.alternatives];
  const formularyOptions = [...new Map(
    calendarChoices
      .flatMap((celebration) => celebration.formularyOptions ?? [])
      .map((option) => [option.id, { ...option }])
  ).values()];
  const formularyOptionReceipt = formularyOptions.length ? { formularyOptions } : {};
  const unavailableFormularies = calendarChoices.flatMap((celebration) => {
    const unavailable = unavailableFormulary(celebration, normalizedPackId);
    return unavailable ? [unavailable] : [];
  });
  const unavailableReceipt = unavailableFormularies.length ? { unavailableFormularies } : {};
  const merged = dayCodeGroups(
    date,
    region,
    normalizedPackId,
    individualChurchProper
  ).map((g) => ({
    group: g,
    ...mergeGroup(effectiveData, g.codes)
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
  const optionalMemorials = withGospel
    .filter((candidate) => candidate.group.kind === "memorial" && candidate.group.optional)
    .map((candidate) => {
      supplement(candidate);
      return {
        label: candidate.group.name ?? "Optional Memorial",
        code: candidate.code,
        rows: candidate.rows
      };
    });
  const optionalReceipt = optionalMemorials.length ? { optionalMemorials } : {};
  const memorialFormularies = withGospel
    .filter((candidate) => candidate.group.kind === "memorial" && !candidate.group.optional)
    .map((candidate) => {
      supplement(candidate);
      return {
        label: candidate.group.name ?? "Memorial",
        code: candidate.code,
        rows: candidate.rows
      };
    });
  const memorialReceipt = memorialFormularies.length ? { memorialFormularies } : {};

  const massSet = governing ? MASS_SETS_BY_CELEBRATION_ID[governing.id] : undefined;
  if (massSet) {
    const primary = merged.find((candidate) => candidate.group.codes.includes(massSet.primaryCode));
    if (!primary) return null;
    const alternatives = massSet.alternatives
      .filter((option) => !option.cycle || option.cycle === sundayCycle(date))
      .flatMap((option) => {
        const candidate = merged.find((item) => item.group.codes.includes(option.code));
        if (!candidate?.rows.length) return [];
        if (!option.replaceReadingType) {
          return [{ label: option.label, code: candidate.code, rows: candidate.rows }];
        }
        const replacementRows = candidate.rows.filter(
          (row) => Math.floor(row.t) === option.replaceReadingType
        );
        if (!replacementRows.length) return [];
        const rows = [
          ...primary.rows.filter((row) => Math.floor(row.t) !== option.replaceReadingType),
          ...replacementRows
        ].sort((a, b) => a.t - b.t);
        return [{
          label: option.label,
          code: option.resultCode ?? `${massSet.primaryCode} ${option.label}`,
          rows
        }];
      });
    return {
      code: primary.code,
      rows: primary.rows,
      primaryLabel: massSet.primaryLabel,
      massAlternatives: alternatives,
      ...optionalReceipt,
      ...memorialReceipt,
      ...formularyOptionReceipt,
      ...unavailableReceipt,
      ...(formularyState ? { formularyState } : {})
    };
  }

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
        secondary: { label: "Ferial readings of the day", code: best.code, rows: best.rows },
        ...optionalReceipt,
        ...formularyOptionReceipt,
        ...unavailableReceipt,
        ...(formularyState ? { formularyState } : {})
      };
    }
  }
  supplement(best);

  // P2-7: Holy Thursday carries two Masses — the evening Mass of the Lord's
  // Supper governs the day; the morning Chrism Mass is offered alongside.
  if (best.group.codes.includes("LW06-4Thu") && effectiveData["LW06-4Thu~Chrism"]?.length) {
    return {
      code: best.code,
      rows: best.rows,
      primaryLabel: "Mass of the Lord's Supper (evening)",
      secondary: {
        label: "Chrism Mass (morning)",
        code: "LW06-4Thu~Chrism",
        rows: effectiveData["LW06-4Thu~Chrism"]
      },
      ...optionalReceipt,
      ...memorialReceipt,
      ...formularyOptionReceipt,
      ...unavailableReceipt,
      ...(formularyState ? { formularyState } : {})
    };
  }
  return {
    code: best.code,
    rows: best.rows,
    ...(formularyOptions.length ? { primaryLabel: "Weekday readings" } : {}),
    ...optionalReceipt,
    ...memorialReceipt,
    ...formularyOptionReceipt,
    ...unavailableReceipt,
    ...(formularyState ? { formularyState } : {})
  };
}

export async function readingsForDate(
  date: Date,
  region: CalendarSelection = currentCalendarProfile(),
  packId: LectionaryPackId = getSettings().lectionaryPackId,
  individualChurchProper: IndividualChurchProper = getSettings().individualChurchProper
): Promise<DayReadings | null> {
  return resolveReadings(
    await loadLectionary(packId),
    date,
    region,
    packId,
    individualChurchProper
  );
}

/** Explicit empty layer for build-time callers that must never read localStorage. */
export const NO_INDIVIDUAL_CHURCH_PROPER = EMPTY_INDIVIDUAL_CHURCH_PROPER;

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
