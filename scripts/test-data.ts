/** Data harness. Run: npx tsx scripts/test-data.ts */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  LECTIONARY_CODE_BY_FORMULARY_ID,
  celebrationFormularyCodes,
  dayCodeCandidates,
  displayReadings,
  formatCitation,
  formatLectionaryCitation,
  hebrewSpanToVulgate,
  lectionaryDataForPack,
  lectionaryResolverCatalogInput,
  missingLocalFormularyStateForCelebration,
  resolveReadings,
  LectionaryRow
} from "../src/lib/lectionary";
import { easterDate, liturgicalDay } from "../src/lib/liturgical";
import { DailyQuote, quoteOfTheDay } from "../src/lib/quotes";
import { dayOfYear } from "../src/lib/votd";
import { parseLocalISODate } from "../src/lib/dateKey";
import { MYSTERY_SETS } from "../src/lib/rosary";
import { passageText } from "../src/lib/passage";
import { PRAYERS } from "../src/lib/prayers";
import { advance, dayKey, GAP_MS, HALF_HOUR_MS } from "../src/lib/reading";
import {
  PRESETS,
  chaptersForBooks,
  todayPortion,
  markPortionRead,
  planDay,
  planTotalDays,
  isComplete,
  paceForDays,
  targetDateToPerDay,
  formatPortion,
  versesOf,
  LONG_VERSES,
  ReadingPlan
} from "../src/lib/plans";
import { BOOKS, getBook, bookIndex, bookDisplayName } from "../src/lib/canon";
import { parseReference } from "../src/lib/refparse";
import { getTranslation, DEFAULT_TRANSLATION } from "../src/lib/translations";
import { parseHaydockSfm } from "./build-haydock.mjs";
import { parseCatenaOsis } from "./build-catena.mjs";
import {
  IOS_APP_BUNDLE_ID,
  IOS_WIDGET_BUNDLE_ID,
  REQUIRED_IOS_APP_GROUP,
  assertIosReleaseContract
} from "./ios-release-contract";
import type { IosReleaseContract } from "./ios-release-contract";
import { normalizeFather, groupCatena, fathersOf, isDoctor, yearOf, circaOf, sortChronological, FATHER_IDS, expandCatenaSpans, isCatenaSpanDoc } from "../src/lib/commentary";
import { getSettings } from "../src/lib/storage";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_SCRIPTURE_FONT,
  FONT_SIZE_PRESETS,
  SCRIPTURE_FONTS,
  contentTokenToPx,
  isScriptureFont
} from "../src/lib/typography";
import { THEME_OPTIONS, isThemeChoice, resolveTheme } from "../src/lib/theme";
import { formatBytes } from "../src/lib/format";
import { GOLDEN_REGIONS, GOLDEN_YEARS, goldenYear } from "./golden";
import {
  CALENDAR_PROFILE_SCHEMA_VERSION,
  CALENDAR_PACKS,
  DEFAULT_CALENDAR_PROFILE_ID,
  DEFAULT_LECTIONARY_PACK_FINGERPRINT,
  DEFAULT_LECTIONARY_PACK_ID,
  EXACT_CALENDAR_CATALOG_FROM,
  EXACT_CALENDAR_CATALOG_THROUGH,
  GENERAL_ROMAN_PACK,
  NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR,
  SUPPORTED_CALENDAR_PROFILES,
  SUPPORTED_LECTIONARY_PACKS,
  UNITED_STATES_PACK,
  calendarProfile,
  individualChurchProperFingerprint,
  normalizeIndividualChurchProper
} from "../src/lib/calendarProfile";
import {
  WIDGET_LINK_DEDUPE_MS,
  acceptWidgetLinkDelivery,
  appHistoryIndex,
  canDiscardDuplicateWidgetEntry,
  canConsumeAppHistory,
  isDuplicateWidgetLinkDelivery,
  isSameWidgetTarget,
  widgetLinkDestination,
  widgetLinkHistoryMode,
  claimStartupLaunchUrl,
  createWidgetStartupGate,
  widgetLinkStartupActivations,
  widgetLinkTarget,
  widgetReturnContractFromHistoryState,
  widgetReturnNavigationState
} from "../src/lib/widgetLinks";
import {
  widgetPinConfirmationMessage,
  widgetPinRequestMessage
} from "../src/lib/widgetPin";
import {
  LOCAL_WIDGET_OVERLAY_MAX_DAYS,
  buildLocalWidgetCalendarOverlayFromData,
  validateLocalWidgetCalendarOverlay
} from "../src/lib/widgetCalendarOverlay";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

import { fileURLToPath } from "node:url";
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const GARRIGOU_AUTHOR = "Fr. Reginald Garrigou-Lagrange, O.P.";
const lect: Record<string, { t: number; b: string; s: [number, number, number][]; partial?: boolean }[]> =
  JSON.parse(readFileSync(join(ROOT, "public/data/lectionary.json"), "utf8"));
const keys = new Set(Object.keys(lect));
const effectiveLect = lectionaryDataForPack(lect);
const effectiveKeys = new Set(Object.keys(effectiveLect));
const totalRows = Object.values(lect).reduce((a, r) => a + r.length, 0);
const partial = Object.values(lect).flat().filter((r) => r.partial).length;
// Pinned shape of the committed lectionary data: changes only when the
// pipeline regenerates it deliberately (then update these together).
check("lectionary.json carries 1140 day codes", keys.size === 1140, `${keys.size}`);
check("lectionary.json carries 3013 rows", totalRows === 3013, `${totalRows}`);
check("566 rows flagged partial (P2-4)", partial === 566, `${partial}`);

// 1. Stable formulary map coverage. Display names never act as resolver keys.
const mappedFormularies = Object.entries(LECTIONARY_CODE_BY_FORMULARY_ID);
let missing = 0;
for (const [formularyId, code] of mappedFormularies) {
  const ok =
    effectiveKeys.has(code) ||
    effectiveKeys.has(`${code} A`) ||
    effectiveKeys.has(`${code} B`) ||
    effectiveKeys.has(`${code} C`);
  if (!ok) {
    console.log(`Stable formulary target missing from data: ${formularyId} -> "${code}"`);
    missing++;
  }
}
check(
  `every stable formulary target exists in the effective derived table (${mappedFormularies.length} checked)`,
  missing === 0,
  `${missing} missing`
);
const calendarFormularyIds = new Set(
  CALENDAR_PACKS.flatMap((pack) => [
    ...pack.celebrations,
    ...pack.temporalAlternatives
  ])
    .map((celebration) => celebration.formularyId)
    .filter((id): id is string => id !== null)
);
check(
  "every lectionary mapping is keyed by a declared stable calendar formulary ID",
  mappedFormularies.every(([formularyId]) => calendarFormularyIds.has(formularyId))
);
const annunciation = liturgicalDay(new Date(2026, 2, 25), "universal").celebrations[0]!;
const renamedAnnunciation = { ...annunciation, name: "Localized celebration name" };
check(
  "renaming a celebration cannot disconnect its stable formulary",
  JSON.stringify(celebrationFormularyCodes(annunciation, "A")) ===
    JSON.stringify(celebrationFormularyCodes(renamedAnnunciation, "A")) &&
    celebrationFormularyCodes(renamedAnnunciation, "A")?.[1] === "Annunciation of the Lord"
);
check(
  "a null local feast formulary produces the typed missing-formulary state",
  missingLocalFormularyStateForCelebration({
    ...annunciation,
    id: "local.test.patron",
    formularyId: null,
    packId: "local.test.pack",
    name: "Principal Patron",
    rank: "Feast"
  })?.kind === "missing-local-formulary"
);
const strictLeapDay = parseLocalISODate("2024-02-29");
check(
  "route dates accept a real leap day without UTC conversion",
  strictLeapDay?.getFullYear() === 2024 &&
    strictLeapDay.getMonth() === 1 &&
    strictLeapDay.getDate() === 29
);
check(
  "route dates reject impossible, normalized, and non-padded input",
  parseLocalISODate("2026-02-29") === null &&
    parseLocalISODate("2026-02-30") === null &&
    parseLocalISODate("2026-13-01") === null &&
    parseLocalISODate("2026-2-03") === null
);

// 2. Full-sweep: every day of 2024, 2025, 2026 must resolve to a gospel
function mergeHasGospel(groups: string[][]): { ok: boolean; code: string } {
  for (const g of groups) {
    const rows = g.flatMap((c) => lect[c] ?? []);
    if (rows.some((r) => Math.floor(r.t) === 6)) return { ok: true, code: g.join("+") };
  }
  return { ok: false, code: groups.map((g) => g.join("+")).join(" / ") };
}
for (const region of ["universal", "usa"] as const) {
  for (const year of [2024, 2025, 2026]) {
    const fails: string[] = [];
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      const r = mergeHasGospel(dayCodeCandidates(new Date(d), region));
      if (!r.ok) fails.push(`${d.toISOString().slice(0, 10)} -> ${r.code}`);
      d.setDate(d.getDate() + 1);
    }
    check(
      `${year} (${region}): every day resolves to a gospel`,
      fails.length === 0,
      fails.slice(0, 3).join("; ")
    );
  }
}

// 3. Easter Vigil display ladder (P1-7): Reading I..VII / Epistle / Gospel
//    with each psalm interleaved after its reading, shorter forms marked.
const vigil = {
  code: "LW06-6Sat A + LW06-6Sat",
  rows: [...(lect["LW06-6Sat A"] ?? []), ...(lect["LW06-6Sat"] ?? [])]
};
const vigilLabels = displayReadings(vigil).map((sec) => sec.map((x) => x.label));
const vigilFlat = vigilLabels.flat();
check(
  "Easter Vigil renders the nine-section ladder",
  vigilLabels.length === 9,
  `sections: ${vigilLabels.length} (${vigilLabels.map((s) => s.length).join(",")})`
);
const VIGIL_EXPECT = [
  "Reading I", "or (shorter form)", "Responsorial Psalm", "or",
  "Reading II", "or (shorter form)", "Responsorial Psalm",
  "Reading III", "Responsorial Psalm",
  "Reading IV", "Responsorial Psalm",
  "Reading V", "Responsorial Psalm",
  "Reading VI", "Responsorial Psalm",
  "Reading VII", "Responsorial Psalm", "or",
  "Epistle", "Responsorial Psalm",
  "Gospel"
];
check(
  "Easter Vigil labels read I..VII / Epistle / Gospel with interleaved psalms",
  JSON.stringify(vigilFlat) === JSON.stringify(VIGIL_EXPECT),
  `got ${JSON.stringify(vigilFlat)}`
);
check(
  "Easter Vigil display drops no row",
  vigilFlat.length === vigil.rows.length,
  `${vigilFlat.length} labels vs ${vigil.rows.length} rows`
);
for (const cyc of ["A", "B", "C"]) {
  const v = { code: `LW06-6Sat ${cyc} + LW06-6Sat`, rows: [...(lect[`LW06-6Sat ${cyc}`] ?? []), ...(lect["LW06-6Sat"] ?? [])] };
  const flat = displayReadings(v).flat();
  check(
    `Easter Vigil year ${cyc} ends with a single Gospel`,
    flat[flat.length - 1].label === "Gospel" && flat.filter((x) => x.label === "Gospel").length === 1
  );
}

// 3a. General display labels: long/short forms and genuine options
const palm = {
  code: "LW06-0Sun A + LW06-0Sun",
  rows: [...(lect["LW06-0Sun A"] ?? []), ...(lect["LW06-0Sun"] ?? [])]
};
const palmGospels = displayReadings(palm)
  .flat()
  .filter((x) => Math.floor(x.row.t) === 6)
  .map((x) => x.label);
check(
  'Palm Sunday A short Passion reads "or (shorter form)"',
  JSON.stringify(palmGospels) === JSON.stringify(["Gospel", "or (shorter form)"]),
  `got ${JSON.stringify(palmGospels)}`
);
const lent1 = {
  code: "LW01-0Sun A + LW01-0Sun",
  rows: [...(lect["LW01-0Sun A"] ?? []), ...(lect["LW01-0Sun"] ?? [])]
};
const lent1Second = displayReadings(lent1)
  .flat()
  .filter((x) => Math.floor(x.row.t) === 3)
  .map((x) => x.label);
check(
  '1st Sunday of Lent A short second reading reads "or (shorter form)"',
  JSON.stringify(lent1Second) === JSON.stringify(["Second Reading", "or (shorter form)"]),
  `got ${JSON.stringify(lent1Second)}`
);
// 3b. Memorial propers (P1-6): the source's thousandths marker promotes the
//     memorial's prescribed formulary; unmarked memorials stay behind the
//     ferial, and governing feasts/solemnities are untouched.
console.log("");
const res = (y: number, m: number, d: number) =>
  resolveReadings(lect, new Date(y, m - 1, d), "universal");
const barnabas = res(2026, 6, 11)!;
check(
  "St. Barnabas propers take Jun 11 2026",
  barnabas.code.startsWith("Saint Barnabas the Apostle"),
  barnabas.code
);
check(
  "Barnabas primary carries the marked proper first reading (Acts 11, t=1.001)",
  barnabas.rows.some((r) => r.b === "acts" && Math.abs(r.t - 1.001) < 1e-9),
  barnabas.rows.map((r) => `${r.t} ${r.b}`).join(" | ")
);
check(
  "Barnabas ferial readings offered alongside",
  barnabas.secondary?.code.startsWith("OW10-4Thu") === true,
  barnabas.secondary?.code ?? "no secondary"
);
const beheading = res(2026, 8, 29)!;
check(
  "Passion of John the Baptist propers Aug 29 2026 (marked gospel)",
  beheading.code.startsWith("The Beheading of Saint John the Baptist") &&
    beheading.rows.some((r) => r.b === "mark" && Math.abs(r.t - 6.001) < 1e-9),
  beheading.code
);
const angels = res(2026, 10, 2)!;
check("Guardian Angels propers Oct 2 2026", angels.code.startsWith("Guardian Angels"), angels.code);
const mmcRes = res(2026, 5, 25)!;
check(
  "Mary, Mother of the Church propers on the Monday after Pentecost 2026",
  mmcRes.code.startsWith("OW00-MaryMotherofChurch") && !!mmcRes.secondary,
  mmcRes.code
);
const timtit = res(2026, 1, 26)!;
check(
  "Sts. Timothy and Titus propers Jan 26 2026 (marked first-reading options)",
  timtit.code.startsWith("Saints Timothy and Titus"),
  timtit.code
);
const sorrows = res(2026, 9, 15)!;
check(
  "Our Lady of Sorrows propers Sep 15 2026 with both gospel options",
  sorrows.code.startsWith("Our Lady of Sorrows") &&
    displayReadings(sorrows).flat().filter((x) => Math.floor(x.row.t) === 6).length === 2,
  sorrows.code
);
const agnes = res(2026, 1, 21)!;
check(
  "St. Agnes keeps the ferial primary and exposes the unmarked memorial formulary",
  agnes.code.startsWith("OW02-3Wed") &&
    !agnes.secondary &&
    agnes.memorialFormularies?.some((option) => option.label.includes("Agnes")) === true,
  agnes.code
);
const natJtB = res(2026, 6, 24)!;
check(
  "A governing solemnity is untouched (Nativity of John the Baptist)",
  natJtB.code.startsWith("Birth of Saint John the Baptist") && !natJtB.secondary,
  natJtB.code
);
const guadalupe = resolveReadings(lect, new Date(2026, 11, 12), "usa")!;
check(
  "an unmapped governing local feast returns an explicit seasonal-fallback receipt",
  guadalupe.formularyState?.kind === "missing-local-formulary" &&
    guadalupe.formularyState.celebrationId === "grc.our-lady-guadalupe" &&
    guadalupe.formularyState.formularyId === "grc.our-lady-guadalupe" &&
    guadalupe.formularyState.calendarPackId === "roman.us.pack" &&
    guadalupe.formularyState.fallback === "seasonal-readings" &&
    guadalupe.code.startsWith("AW02-6Sat"),
  `${guadalupe.code}; ${JSON.stringify(guadalupe.formularyState)}`
);
const josephWorker = res(2026, 5, 1)!;
check(
  "St. Joseph the Worker (optional memorial) never displaces the Easter ferial",
  josephWorker.code.startsWith("EW04-5Fri") && !josephWorker.secondary,
  josephWorker.code
);
const lourdes = res(2026, 2, 11)!;
check(
  "an ordinary-feria optional memorial exposes its selectable formulary",
  lourdes.code.startsWith("OW05-3Wed") &&
    lourdes.optionalMemorials?.some((option) => option.label.includes("Lourdes")) === true,
  `${lourdes.code}; ${JSON.stringify(lourdes.optionalMemorials?.map((option) => option.label))}`
);
const hilary = res(2026, 1, 13)!;
check(
  "an unmarked General memorial exposes its selectable formulary",
  hilary.code.startsWith("OW01-2Tue") &&
    hilary.optionalMemorials?.some((option) => option.label.includes("Hilary")) === true
);
const blaise = res(2026, 2, 3)!;
check(
  "St. Blaise uses the corpus-backed Blase formulary instead of reporting it absent",
  blaise.optionalMemorials?.some(
    (option) => option.label.includes("Blaise") && option.code.includes("Saint Blase")
  ) === true &&
    !blaise.unavailableFormularies?.some((item) => item.celebrationId === "grc.blaise"),
  `${JSON.stringify(blaise.optionalMemorials?.map((option) => option.code))}; ${JSON.stringify(
    blaise.unavailableFormularies
  )}`
);
const firstMartyrs = res(2026, 6, 30)!;
check(
  "the First Martyrs use their corpus-backed formulary instead of reporting it absent",
  firstMartyrs.optionalMemorials?.some(
    (option) => option.label.includes("First Martyrs") &&
      option.code.includes("First Martyrs of the Church of Rome")
  ) === true &&
    !firstMartyrs.unavailableFormularies?.some(
      (item) => item.celebrationId === "grc.first-martyrs-rome"
    ),
  `${JSON.stringify(
    firstMartyrs.optionalMemorials?.map((option) => option.code)
  )}; ${JSON.stringify(firstMartyrs.unavailableFormularies)}`
);
const bridget = res(2026, 7, 23)!;
check(
  "St. Bridget uses the corpus-backed Birgitta formulary instead of reporting it absent",
  bridget.optionalMemorials?.some(
    (option) => option.label.includes("Bridget") && option.code.includes("Saint Birgitta")
  ) === true &&
    !bridget.unavailableFormularies?.some((item) => item.celebrationId === "grc.bridget"),
  `${JSON.stringify(bridget.optionalMemorials?.map((option) => option.code))}; ${JSON.stringify(
    bridget.unavailableFormularies
  )}`
);
const holyNameJesus = res(2026, 1, 3)!;
check(
  "an absent General optional formulary stays explicit instead of name-guessed",
  !holyNameJesus.optionalMemorials?.some((option) => option.label.includes("Holy Name")) &&
    holyNameJesus.unavailableFormularies?.some(
      (item) =>
        item.celebrationId === "grc.most-holy-name-jesus" &&
        item.formularyId === "grc.most-holy-name-jesus" &&
        item.calendarPackId === "roman.general.pack"
    ) === true,
  JSON.stringify(holyNameJesus.unavailableFormularies)
);
const newman = res(2026, 10, 9)!;
const newmanOption = newman.optionalMemorials?.find((option) => option.label.includes("Newman"));
check(
  "the effective table includes the Holy See's 2026 Newman supplement",
  newmanOption?.code === "OLM655bis-Newman" &&
    newmanOption.rows.some((row) => row.b === "sirach") &&
    newmanOption.rows.some((row) => row.b === "matthew")
);
const saturdayBvm = res(2026, 2, 7)!;
check(
  "an unimpeded Ordinary-Time Saturday exposes the BVM memorial and all three permitted formularies",
  saturdayBvm.optionalMemorials?.some((option) => option.label.includes("Blessed Virgin Mary")) === true &&
    saturdayBvm.formularyOptions?.length === 3
);
const prayerForLife = resolveReadings(lect, new Date(2026, 0, 22), "usa")!;
check(
  "the U.S. January 22 observance exposes both official white and violet Mass choices",
  prayerForLife.primaryLabel === "Weekday readings" &&
    prayerForLife.formularyOptions?.map((option) => `${option.color}:${option.lectionaryReference}`).join("|") ===
      "white:947A–947E|violet:887–891" &&
    !prayerForLife.formularyState
);
const patrickCommemoration = res(2026, 3, 17)!;
check(
  "a privileged-weekday commemoration retains only the Lenten readings",
  patrickCommemoration.code.startsWith("LW04-2Tue") &&
    !patrickCommemoration.optionalMemorials?.some((option) => option.label.includes("Patrick")),
  `${patrickCommemoration.code}; ${JSON.stringify(patrickCommemoration.optionalMemorials)}`
);
for (const year of [2025, 2026]) {
  const allSouls = resolveReadings(lect, new Date(year, 10, 2), "roman.general")!;
  check(
    `All Souls ${year} exposes all three lawful selections independent of Sunday cycle`,
    allSouls.code === "All Souls A" &&
      allSouls.massAlternatives?.map((option) => option.code).join("|") ===
        "All Souls B|All Souls C",
    `${allSouls.code}; ${allSouls.massAlternatives?.map((option) => option.code).join("|")}`
  );
}
const christmas = res(2026, 12, 25)!;
const isCompleteMass = (rows: LectionaryRow[]) =>
  [1, 2, 3, 6].every((type) => rows.some((row) => Math.floor(row.t) === type));
check(
  "Christmas exposes Vigil, Night, Dawn, and Day Masses",
  christmas.code === "Nativity of the Lord 4" &&
    christmas.primaryLabel === "Mass during the Day" &&
    isCompleteMass(christmas.rows) &&
    christmas.massAlternatives
      ?.map((option) => `${option.label}:${option.code}`)
      .join("|") ===
      "Vigil Mass:Nativity of the Lord 1|Mass during the Night:Nativity of the Lord 2|Mass at Dawn:Nativity of the Lord 3" &&
    christmas.massAlternatives.every((option) => isCompleteMass(option.rows)),
  `${christmas.code}; ${JSON.stringify(
    christmas.massAlternatives?.map((option) => ({
      label: option.label,
      code: option.code,
      types: [...new Set(option.rows.map((row) => Math.floor(row.t)))]
    }))
  )}`
);
for (const year of [2026, 2027, 2028]) {
  const cycle = year === 2026 ? "A" : year === 2027 ? "B" : "C";
  const easter = resolveReadings(lect, easterDate(year), "roman.us.ascension-sunday")!;
  const yearCGospel = easter.massAlternatives?.find((option) =>
    option.label.includes("Year C Gospel")
  );
  const afternoon = easter.massAlternatives?.find(
    (option) => option.label === "Afternoon or evening Mass"
  );
  const nonGospel = (rows: LectionaryRow[]) =>
    rows.filter((row) => Math.floor(row.t) !== 6);
  check(
    `Easter Sunday ${year} exposes every lawful ${cycle}-cycle Mass form`,
    easter.code === "EW01-0Sun" &&
      easter.primaryLabel === "Mass during the Day" &&
      isCompleteMass(easter.rows) &&
      easter.rows.some(
        (row) =>
          Math.floor(row.t) === 6 &&
          row.b === "john" &&
          JSON.stringify(row.s) === JSON.stringify([[20, 1, 9]])
      ) &&
      afternoon?.code === "EW01-0Sun Afternoon-Evening" &&
      isCompleteMass(afternoon.rows) &&
      JSON.stringify(nonGospel(afternoon.rows)) === JSON.stringify(nonGospel(easter.rows)) &&
      afternoon.rows.some(
        (row) =>
          Math.floor(row.t) === 6 &&
          row.b === "luke" &&
          JSON.stringify(row.s) === JSON.stringify([[24, 13, 35]])
      ) &&
      (cycle === "C"
        ? yearCGospel?.code === "EW01-0Sun C-Gospel" &&
          isCompleteMass(yearCGospel.rows) &&
          JSON.stringify(nonGospel(yearCGospel.rows)) === JSON.stringify(nonGospel(easter.rows)) &&
          yearCGospel.rows.some(
            (row) =>
              Math.floor(row.t) === 6 &&
              row.b === "luke" &&
              JSON.stringify(row.s) === JSON.stringify([[24, 1, 12]])
          ) &&
          easter.massAlternatives?.length === 2
        : yearCGospel === undefined && easter.massAlternatives?.length === 1),
    JSON.stringify(
      easter.massAlternatives?.map((option) => ({
        label: option.label,
        code: option.code,
        gospel: option.rows.filter((row) => Math.floor(row.t) === 6)
      }))
    )
  );
}
const pentecost = res(2026, 5, 24)!;
check(
  "Pentecost exposes its Vigil alongside Mass during the Day",
  pentecost.primaryLabel === "Mass during the Day" &&
    pentecost.massAlternatives?.some((option) => option.label === "Vigil Mass") === true
);
for (const [month, day, celebration] of [
  [6, 24, "Nativity of St. John the Baptist"],
  [6, 29, "Sts. Peter and Paul"],
  [8, 15, "Assumption"]
] as const) {
  const resolved = res(2026, month, day)!;
  check(
    `${celebration} exposes its Vigil Mass`,
    resolved.primaryLabel === "Mass during the Day" &&
      resolved.massAlternatives?.some((option) => option.label === "Vigil Mass") === true
  );
}
const immaculateHeart = res(2024, 6, 8)!;
check(
  "Immaculate Heart propers on its Saturday (clear year 2024)",
  immaculateHeart.code.startsWith("OW00-ImmaculateHeart") && !!immaculateHeart.secondary,
  immaculateHeart.code
);
const heartCollision = res(2026, 6, 13)!;
check(
  "Immaculate Heart collision year 2026: demoted, ferial keeps the day",
  heartCollision.code.startsWith("OW10-6Sat") && !heartCollision.secondary,
  heartCollision.code
);
check(
  "memorial promotion labels the proper set",
  barnabas.primaryLabel === "Proper of the Memorial",
  barnabas.primaryLabel ?? "no label"
);

// 3c. Holy Thursday Chrism Mass (P2-7) and the partial flag (P2-4)
const chrism = res(2026, 4, 2)!;
check(
  "Holy Thursday offers the Chrism Mass alongside the Lord's Supper",
  chrism.secondary?.code === "LW06-4Thu~Chrism" &&
    chrism.primaryLabel === "Mass of the Lord's Supper (evening)" &&
    chrism.secondary.rows.some((r) => Math.floor(r.t) === 6),
  chrism.code
);
const goodFriday = res(2026, 4, 3)!;
check("Good Friday carries a single set", !goodFriday.secondary, goodFriday.code);
check(
  "partial flag covers letter-suffix citations (P2-4)",
  partial >= 500 &&
    (lect["Saint Barnabas the Apostle"] ?? []).some(
      (r) => Math.floor(r.t) === 1 && r.partial === true
    ),
  `${partial} rows flagged`
);

const mmc = { code: "OW00-MaryMotherofChurch", rows: lect["OW00-MaryMotherofChurch"] ?? [] };
const mmcFirst = displayReadings(mmc)
  .flat()
  .filter((x) => Math.floor(x.row.t) === 1)
  .map((x) => x.label);
check(
  "Mary Mother of Church first-reading options stay genuine alternatives",
  JSON.stringify(mmcFirst) === JSON.stringify(["First Reading", "or (alternative form)"]),
  `got ${JSON.stringify(mmcFirst)}`
);

// 4. Holy Thursday + Ash Wednesday codes present? (No "LW06-4Thu A" —
//    Holy Thursday carries no cycle variants; mergeGroup tolerates that.)
const REQUIRED_KEYS = ["LW06-4Thu", "LW06-4Thu~Chrism", "LW00-3Wed", "LW00-4Thu", "LW00-5Fri", "LW00-6Sat"];
const absentKeys = REQUIRED_KEYS.filter((k) => !keys.has(k));
check(
  "Holy Week and Ash Wednesday day codes all present",
  absentKeys.length === 0,
  absentKeys.join(", ")
);

// 5. Psalm span mapping: responsorial incipits (lectionary citation -> DRC text)
//    Expectations are the well-known first lines of each responsorial, independent
//    of the mapping implementation.
const drcPs = JSON.parse(readFileSync(join(ROOT, "public/data/drc/psalms.json"), "utf8"));
type Span = [number, number, number];
function firstRendered(spans: Span[]): string {
  const [ch, v1] = hebrewSpanToVulgate(...spans[0])[0];
  return drcPs.chapters[ch - 1]?.[v1 - 1] ?? "";
}
function psalmRow(code: string): { t: number; b: string; s: Span[] } | undefined {
  return (lect[code] ?? []).find((r) => Math.floor(r.t) === 2);
}
console.log("");
const aw = psalmRow("LW00-3Wed")!;
check(
  'Ash Wednesday responsorial begins "Have mercy on me, O God" (DRC 50:3)',
  firstRendered(aw.s).startsWith("Have mercy on me, O God"),
  `got "${firstRendered(aw.s).slice(0, 50)}"`
);
const ht = psalmRow("LW06-4Thu")!;
check(
  'Holy Thursday responsorial begins "What shall I render to the Lord" (DRC 115:3)',
  firstRendered(ht.s).startsWith("What shall I render to the Lord"),
  `got "${firstRendered(ht.s).slice(0, 50)}"`
);
const incipits: [string, Span, string][] = [
  // [label, lectionary span, expected DRC opening]
  ["Ps 147:12 (2nd Sun after Christmas)", [147, 12, 13], "Praise the Lord, O Jerusalem"],
  ["Ps 116:10 (2nd Sun of Lent B)", [116, 10, 10], "I have believed"],
  ["Ps 116:1 (untitled, no shift)", [116, 1, 2], "I have loved"],
  ["Ps 147:1 (Sat of 1st wk of Advent)", [147, 1, 2], "Alleluia. Praise ye the Lord, because psalm is good"],
  ["Ps 10:1 (joined into Vulgate 9)", [10, 1, 2], "Why, O Lord, hast thou retired afar off"],
  ["Ps 9:1 (title shift in Vulgate 9)", [9, 1, 2], "I will give praise to thee, O Lord"],
  ["Ps 114:1 (joined into Vulgate 113)", [114, 1, 2], "When Israel went out of Egypt"],
  ["Ps 115:1 (joined into Vulgate 113)", [115, 1, 2], "Not to us, O Lord, not to us"],
  // DRC merges short titles into v1 for these; the mapped verse is correct and
  // simply begins with the inline title.
  ["Ps 23:1 (title merged into v1)", [23, 1, 3], "A psalm for David. The Lord ruleth me"],
  ["Ps 22:1 (one-verse title)", [22, 1, 2], "O God my God"],
  ["Ps 130:1 (title merged into v1)", [130, 1, 2], "A gradual canticle. Out of the depths"],
  ["Ps 137:1 (Super flumina)", [137, 1, 2], "Upon the rivers of Babylon"],
  ["Ps 19:1 (Caeli enarrant)", [19, 1, 2], "The heavens shew forth the glory of God"],
  ["Ps 95:1 (Venite exultemus)", [95, 1, 2], "Come let us praise the Lord with joy"],
  // mid-psalm joins: the title shift collapses back to zero at the join
  ["Ps 100:1 (joined head)", [100, 1, 2], "Sing joyfully to God"],
  ["Ps 100:5 (after the join)", [100, 5, 5], "For the Lord is sweet"],
  ["Ps 72:1 (Epiphany psalm, joined head)", [72, 1, 2], "Give to the king thy judgment"],
  ["Ps 44:23 (after mid-psalm join)", [44, 23, 23], "Arise, why sleepest thou, O Lord"],
  ["Ps 56:13 (after mid-psalm join)", [56, 13, 13], "Because thou hast delivered my soul from death"],
  ["Ps 146:1 (joined head)", [146, 1, 2], "Praise the Lord, O my soul"]
];
for (const [label, span, want] of incipits) {
  const got = firstRendered([span]);
  check(`${label} -> "${want}"`, got.startsWith(want), `got "${got.slice(0, 50)}"`);
}

// 6. Exhaustive bounds: every mapped span of every psalm row must land inside its
//    bundle chapter. In particular nothing may run past Vulgate Psalm 114's end.
let oob = 0;
let past114 = 0;
const oobSamples: string[] = [];
for (const [code, rows] of Object.entries(lect)) {
  for (const r of rows) {
    if (r.b !== "psalms") continue;
    for (const span of r.s) {
      for (const [ch, v1, v2] of hebrewSpanToVulgate(...span)) {
        const chap: string[] | undefined = drcPs.chapters[ch - 1];
        const last = v2 === 999 ? chap?.length ?? 0 : v2;
        if (!chap || v1 < 1 || v1 > last || last > chap.length) {
          oob++;
          if (ch === 114) past114++;
          if (oobSamples.length < 8)
            oobSamples.push(`${code}: ${JSON.stringify(span)} -> [${ch}, ${v1}, ${v2}]`);
        }
      }
    }
  }
}
check("zero psalm spans run past the end of Vulgate Psalm 114", past114 === 0, `${past114} spans`);
check("zero mapped psalm spans out of bounds anywhere", oob === 0, `${oob} spans`);
for (const s of oobSamples) console.log(`   ${s}`);

// 6a. Translations distribute text differently across the shared grid in places;
//     every cited span must render at least one non-empty verse in every
//     translation (mirroring ReadingText's empty-skip + one-slot-back fallback).
const allPs: [string, string[][]][] = ["drc", "cpdv", "vulgate"].map((t) => [
  t,
  JSON.parse(readFileSync(join(ROOT, `public/data/${t}/psalms.json`), "utf8")).chapters
]);
let silent = 0;
const silentSamples: string[] = [];
for (const [code, rows] of Object.entries(lect)) {
  for (const r of rows) {
    if (r.b !== "psalms") continue;
    for (const span of r.s) {
      const spans = hebrewSpanToVulgate(...span);
      for (const [t, chapters] of allPs) {
        const slots = (mapped: Span[]) =>
          mapped.flatMap(([ch, v1, v2]) => {
            const chap = chapters[ch - 1] ?? [];
            const last = Math.min(v2 === 999 ? chap.length : v2, chap.length);
            const got: string[] = [];
            for (let v = Math.min(v1, chap.length); v <= last; v++) got.push(chap[v - 1] ?? "");
            return got;
          });
        let got = slots(spans);
        if (got.length && got.every((x) => !x.trim()) && spans[0][1] > 1) {
          got = slots([[spans[0][0], spans[0][1] - 1, spans[0][2]]]);
        }
        if (!got.some((x) => x.trim())) {
          silent++;
          if (silentSamples.length < 5)
            silentSamples.push(`${code} (${t}): ${JSON.stringify(span)} -> ${JSON.stringify(spans)}`);
        }
      }
    }
  }
}
check("every cited span renders text in all translations", silent === 0, `${silent}`);
for (const s of silentSamples) console.log(`   ${s}`);

// 6c. Ps 126:6 spans two slots in DRC/CPDV ("...carrying their sheaves" is slot 7)
check(
  "Ps 126:6 maps to Vulgate 125:6-7 (final line of the responsorial)",
  JSON.stringify(hebrewSpanToVulgate(126, 6, 6)) === "[[125,6,7]]",
  `got ${JSON.stringify(hebrewSpanToVulgate(126, 6, 6))}`
);

// 6d. Ps 43:4 spans two slots in DRC (the harp clause is slot 5); cited at the Easter Vigil
check(
  "Ps 43:4 maps to Vulgate 42:4-5 (Introibo + harp clause)",
  JSON.stringify(hebrewSpanToVulgate(43, 4, 4)) === "[[42,4,5]]",
  `got ${JSON.stringify(hebrewSpanToVulgate(43, 4, 4))}`
);

// 6e. Citation cosmetics: overlapping stanzas across a grid join merge instead of
//     repeating a verse, and the Vulgate parenthetical drops when numbers agree.
const thu2 = (lect["OW02-4Thu 2"] ?? []).find((r) => Math.floor(r.t) === 2)!;
check(
  "Ps 56 citation merges the joined verse: Psalms 56(55):2-3,9-10,11-12",
  formatCitation(thu2, "Psalms") === "Psalms 56(55):2-3,9-10,11-12",
  `got "${formatCitation(thu2, "Psalms")}"`
);
check(
  "Psalms 148 cites without a redundant parenthetical",
  formatCitation({ t: 2, b: "psalms", s: [[148, 1, 2]] }, "Psalms") === "Psalms 148:1-2",
  `got "${formatCitation({ t: 2, b: "psalms", s: [[148, 1, 2]] }, "Psalms")}"`
);

// 6b. Citation formatting shows the mapped (Vulgate-grid) verses next to both numbers
check(
  "Ash Wednesday citation reads Psalms 51(50):3-4,5-6,12-13,14,17",
  formatCitation(aw, "Psalms") === "Psalms 51(50):3-4,5-6,12-13,14,17",
  `got "${formatCitation(aw, "Psalms")}"`
);
check(
  "Holy Thursday citation reads Psalms 116(115):3-4,6-7,8-9",
  formatCitation(ht, "Psalms") === "Psalms 116(115):3-4,6-7,8-9",
  `got "${formatCitation(ht, "Psalms")}"`
);

// 7. VOTD refs valid in all three translations
const votdSrc = readFileSync(join(ROOT, "src/lib/votd.ts"), "utf8");
const refs = [...votdSrc.matchAll(/r\("([a-z0-9-]+)", (\d+), (\d+)(?:, (\d+))?\)/g)].map((m) => ({
  book: m[1], ch: +m[2], v1: +m[3], v2: m[4] ? +m[4] : +m[3]
}));
console.log(`\nVOTD cycle: ${refs.length} entries`);
check("VOTD cycle carries 172 entries", refs.length === 172, `${refs.length}`);
for (const t of ["drc", "cpdv", "vulgate"]) {
  let bad = 0;
  for (const r of refs) {
    try {
      const data = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/${r.book}.json`), "utf8"));
      const ch = data.chapters[r.ch - 1];
      if (!ch || !ch[r.v1 - 1] || !ch[r.v2 - 1]) {
        console.log(`  ${t}: out of range ${r.book} ${r.ch}:${r.v1}-${r.v2} (chapter has ${ch?.length ?? 0})`);
        bad++;
      }
    } catch {
      console.log(`  ${t}: missing book ${r.book}`);
      bad++;
    }
  }
  check(`every VOTD ref lands on text in ${t}`, bad === 0, `${bad} invalid`);
}

// 7a. VOTD day-of-year (P1-9): pure calendar-component math, in lockstep
//     with the iOS widget's Calendar.ordinality selection.
console.log("");
const noMsMath = !votdSrc.includes("86_400_000");
check(
  "votd.ts no longer does millisecond day arithmetic",
  noMsMath,
  noMsMath ? "" : "found 86_400_000 in src/lib/votd.ts"
);
let ordinalBad = 0;
for (const y of [2023, 2024, 2025, 2026, 2027, 2028, 2100]) {
  let n = 0;
  const d = new Date(y, 0, 1);
  while (d.getFullYear() === y) {
    n++;
    if (dayOfYear(d) !== n) {
      ordinalBad++;
      if (ordinalBad <= 3)
        console.log(`   ordinal mismatch ${d.toDateString()}: got ${dayOfYear(d)}, want ${n}`);
    }
    d.setDate(d.getDate() + 1);
  }
}
check(
  "dayOfYear matches the calendar ordinal for every day of 7 trap years (incl. 2024/2028 leap, 2100 non-leap)",
  ordinalBad === 0,
  `${ordinalBad} mismatches`
);
const swiftWidget = readFileSync(join(ROOT, "ios/WidgetExtension/FidelisWidget.swift"), "utf8");
const swiftOrdinality =
  swiftWidget.includes("ordinality(of: .day, in: .year") &&
  swiftWidget.includes("Calendar(identifier: .gregorian)") &&
  !swiftWidget.includes("Calendar.current");
check(
  "Swift widget selects by Gregorian Calendar.ordinality",
  swiftOrdinality,
  swiftOrdinality ? "" : "ordinality call or Gregorian calendar pin missing from FidelisWidget.swift"
);
const formulasAgree =
  swiftWidget.includes("(dayOfYear + year) % cycle.count") &&
  votdSrc.includes("(dayOfYear(date) + date.getFullYear()) % VOTD_CYCLE.length");
check(
  "web and Swift index formulas agree",
  formulasAgree,
  formulasAgree ? "" : "index formula drifted between votd.ts and FidelisWidget.swift"
);
const votdJson = JSON.parse(readFileSync(join(ROOT, "ios/WidgetExtension/votd.json"), "utf8"));
check(
  "votd.json cycle length matches votd.ts",
  votdJson.length === refs.length,
  `${votdJson.length} vs ${refs.length}`
);
check(
  "votd.json first entry is John 3:16 (cycle order in sync)",
  votdJson[0]?.reference === "John 3:16",
  `got "${votdJson[0]?.reference}"`
);
const androidVotd = readFileSync(join(ROOT, "android/app/src/main/res/raw/votd.json"), "utf8");
check(
  "Android widget votd.json is byte-identical to the iOS one (both widgets read one cycle)",
  androidVotd === readFileSync(join(ROOT, "ios/WidgetExtension/votd.json"), "utf8"),
  "android res/raw/votd.json differs from ios/WidgetExtension/votd.json — re-run npm run votd-widget"
);
const javaWidget = readFileSync(
  join(ROOT, "android/app/src/main/java/app/fidelis/bible/VotdWidget.java"),
  "utf8"
);
const javaFormulaAgrees =
  javaWidget.includes("dayOfYear + year") &&
  javaWidget.includes("GregorianCalendar") &&
  javaWidget.includes("Calendar.DAY_OF_YEAR");
check(
  "Android widget selects by the same Gregorian (dayOfYear + year) formula",
  javaFormulaAgrees,
  javaFormulaAgrees ? "" : "selection formula or Gregorian calendar pin missing from VotdWidget.java"
);
check(
  "native VOTD decode failures show an explicit update state, never a plausible John 8:12 fallback",
  swiftWidget.includes("FidelisWidgetContract.updateMessage") &&
    swiftWidget.includes("requiresUpdate: true") &&
    javaWidget.includes("R.string.widget_update_required") &&
    javaWidget.includes("boolean available = false") &&
    !swiftWidget.includes("John 8:12") &&
    !javaWidget.includes("John 8:12")
);

// 7b. Atomic, versioned native calendar snapshot. It covers the preceding year
//     through five future years for every selectable profile. Native readers
//     fail closed on schema, fingerprint, expiry, or day lookup errors.
{
  const iosCalRaw = readFileSync(join(ROOT, "ios/WidgetExtension/calendar.json"), "utf8");
  const iosCalendar = JSON.parse(iosCalRaw) as {
    schemaVersion: number;
    generatedAt: string;
    expiresAt: string;
    window: { from: string; through: string };
    exactCatalogWindow: { from: string; through: string };
    lectionaryPack: { id: string; version: string; fingerprint: string };
    defaultProfileId: string;
    profiles: Record<
      string,
      {
        id: string;
        fingerprint: string;
        days: Record<string, { quote?: { author?: string } | null }>;
      }
    >;
  };
  const defaultDays = iosCalendar.profiles[iosCalendar.defaultProfileId]?.days ?? {};
  const calKeys = Object.keys(defaultDays);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const farHorizon = new Date(now.getFullYear() + 5, 11, 31);
  const missing = [iso(now), iso(farHorizon)].filter((k) => !calKeys.includes(k));
  check(
    "widget calendar snapshot schema and default profile are current",
    iosCalendar.schemaVersion === CALENDAR_PROFILE_SCHEMA_VERSION &&
      iosCalendar.defaultProfileId === DEFAULT_CALENDAR_PROFILE_ID &&
      iosCalendar.lectionaryPack?.id === DEFAULT_LECTIONARY_PACK_ID &&
      iosCalendar.lectionaryPack?.fingerprint === DEFAULT_LECTIONARY_PACK_FINGERPRINT &&
      iosCalendar.exactCatalogWindow?.from === EXACT_CALENDAR_CATALOG_FROM &&
      iosCalendar.exactCatalogWindow?.through === EXACT_CALENDAR_CATALOG_THROUGH
  );
  check(
    "native widget snapshot epoch is deliberately pinned to the current release year",
    NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR === new Date().getFullYear(),
    `snapshot epoch ${NATIVE_WIDGET_SNAPSHOT_BUILD_YEAR}; current year ${new Date().getFullYear()}`
  );
  check(
    "widget calendar snapshot covers today through the end of the fifth future year",
    missing.length === 0,
    missing.length
      ? `missing ${missing.join(", ")} (window ${calKeys[0]}…${calKeys[calKeys.length - 1]}) — run npm run widgets and commit`
      : ""
  );
  check(
    "widget calendar snapshot carries a valid generation time and future expiry",
    Number.isFinite(Date.parse(iosCalendar.generatedAt)) &&
      Date.parse(iosCalendar.expiresAt) > farHorizon.getTime()
  );
  check(
    "every supported profile is present with the exact engine fingerprint and full window",
    SUPPORTED_CALENDAR_PROFILES.every((profile) => {
      const native = iosCalendar.profiles[profile.id];
      return (
        native?.id === profile.id &&
        native.fingerprint === profile.fingerprint &&
        Object.keys(native.days).length === calKeys.length &&
        native.days[calKeys[0]] !== undefined &&
        native.days[calKeys[calKeys.length - 1]] !== undefined
      );
    })
  );
  const androidCalRaw = readFileSync(
    join(ROOT, "android/app/src/main/res/raw/calendar.json"),
    "utf8"
  );
  check(
    "Android widget calendar.json is byte-identical to the iOS one (both read one resolution)",
    androidCalRaw === iosCalRaw,
    "android res/raw/calendar.json differs from ios/WidgetExtension/calendar.json — re-run npm run calendar-widget"
  );
  check(
    "every native-widget appearance carries Fr. Garrigou-Lagrange's exact attribution",
    Object.values(iosCalendar.profiles)
      .flatMap((profile) => Object.values(profile.days))
      .flatMap((entry) => entry.quote?.author ?? [])
      .filter((author) => author.includes("Garrigou-Lagrange"))
      .every((author) => author === GARRIGOU_AUTHOR),
    "incorrect Garrigou-Lagrange attribution — re-run npm run calendar-widget"
  );
  for (const pack of CALENDAR_PACKS) {
    const semanticPack = Object.fromEntries(
      Object.entries(pack).filter(
        ([key]) => key !== "contentHash" && key !== "canonicalCatalogInput"
      )
    );
    check(
      `${pack.id} canonical catalog contains every live semantic field exactly`,
      isDeepStrictEqual(JSON.parse(pack.canonicalCatalogInput), semanticPack)
    );
    check(
      `${pack.id} canonical catalog hash matches its fingerprint input`,
      `sha256:${createHash("sha256").update(pack.canonicalCatalogInput).digest("hex")}` ===
        pack.contentHash
    );
    check(
      `${pack.id} has authoritative source loci`,
      pack.sourceLoci.length > 0 &&
        pack.sourceLoci.every(
          (source) =>
            source.url.startsWith("https://") &&
            source.authority.length > 0 &&
            source.locator.length > 0
        )
    );
  }
  for (const pack of SUPPORTED_LECTIONARY_PACKS) {
    const raw = readFileSync(join(ROOT, "public", pack.dataPath));
    const semanticPack = Object.fromEntries(
      Object.entries(pack).filter(
        ([key]) => key !== "contentHash" && key !== "canonicalCatalogInput"
      )
    );
    check(
      `${pack.id} canonical catalog contains every live semantic field exactly`,
      isDeepStrictEqual(JSON.parse(pack.canonicalCatalogInput), semanticPack)
    );
    check(
      `${pack.id} citation-table hash matches its manifest-sealed generated data`,
      `sha256:${createHash("sha256").update(raw).digest("hex")}` === pack.citationTableHash
    );
    check(
      `${pack.id} resolver-catalog hash covers stable mappings, supplements, and Mass sets`,
      `sha256:${createHash("sha256").update(lectionaryResolverCatalogInput()).digest("hex")}` ===
        pack.resolverCatalogHash
    );
    check(
      `${pack.id} effective-pack hash matches its complete fingerprint input`,
      `sha256:${createHash("sha256").update(pack.canonicalCatalogInput).digest("hex")}` ===
        pack.contentHash
    );
  }
  check(
    "calendar packs carry executable typed date rules instead of metadata-only labels",
    GENERAL_ROMAN_PACK.celebrations.length === 238 &&
      UNITED_STATES_PACK.celebrations.length === 26 &&
      CALENDAR_PACKS.every((pack) =>
        pack.celebrations.every(
          (celebration) => celebration.id.length > 0 && celebration.dateRule.kind.length > 0
        ) && new Set(pack.celebrations.map((celebration) => celebration.id)).size ===
          pack.celebrations.length
      )
  );
  check(
    "the 2026 Newman inscription cites its direct Holy See decree",
    GENERAL_ROMAN_PACK.sourceLoci.some(
      (source) => source.url ===
        "https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2026/02/03/260203a.html"
    )
  );
  check(
    "calendar profiles are ordered pack compositions with unique fingerprints",
    SUPPORTED_CALENDAR_PROFILES.every(
      (profile) =>
        profile.packs.length === profile.packIds.length &&
        profile.packs.every((pack, index) => pack.id === profile.packIds[index])
    ) &&
      new Set(SUPPORTED_CALENDAR_PROFILES.map((profile) => profile.fingerprint)).size ===
        SUPPORTED_CALENDAR_PROFILES.length
  );
}

// 7c. The native individual-church overlay is sparse, atomic, and tied to the
// exact selected base profile, local proper, and lectionary content.
{
  const now = new Date("2026-07-23T12:00:00.000Z");
  const proper = normalizeIndividualChurchProper({
    churchTitle: "St. Test Church",
    titleDate: { month: 7, day: 23 },
    titleColor: "white",
    dedicationAnniversary: { month: 10, day: 18 },
    principalPatronTitle: "St. Thomas Aquinas",
    principalPatronDate: { month: 1, day: 28 },
    principalPatronColor: "white"
  });
  const overlay = buildLocalWidgetCalendarOverlayFromData(
    {
      profileId: "roman.general",
      lectionaryPackId: DEFAULT_LECTIONARY_PACK_ID,
      individualChurchProper: proper,
      now
    },
    lect,
    []
  );
  const expected = {
    profileId: "roman.general" as const,
    baseProfileFingerprint: calendarProfile("roman.general").fingerprint,
    localProperFingerprint: overlay.localLayer.fingerprint,
    lectionaryPackId: DEFAULT_LECTIONARY_PACK_ID,
    window: overlay.window,
    now
  };
  const overlayDays = Object.values(overlay.days);
  check(
    "individual-church widget overlay stays sparse across the seven-year native window",
    overlayDays.length > 0 && overlayDays.length <= LOCAL_WIDGET_OVERLAY_MAX_DAYS
  );
  check(
    "individual-church overlay days carry explicit missing-proper receipts",
    overlayDays.every(
      (day) =>
        day.celebration.length > 0 &&
        day.formularyState?.kind === "missing-local-formulary" &&
        Object.prototype.hasOwnProperty.call(day, "quote")
    )
  );
  check(
    "individual-church overlay validates only for its selected profile, proper, and lectionary fingerprint",
    validateLocalWidgetCalendarOverlay(overlay, expected) &&
      !validateLocalWidgetCalendarOverlay(overlay, {
        ...expected,
        localProperFingerprint: `${overlay.localLayer.fingerprint}-stale`
      }) &&
      !validateLocalWidgetCalendarOverlay(
        { ...overlay, lectionaryPackId: "roman.unsupported" },
        expected
      ) &&
      !validateLocalWidgetCalendarOverlay(
        {
          ...overlay,
          lectionaryPackFingerprint:
            "roman.ordinary.derived-citation-table@tamil-catholic-lectionary-c6c9d79+fidelis-supplement-2026.1:sha256:stale"
        },
        expected
      ) &&
      !validateLocalWidgetCalendarOverlay(
        (({ lectionaryPackFingerprint: _stale, ...legacyOverlay }) => legacyOverlay)(overlay),
        expected
      )
  );
  check(
    "future-generated and expired local overlays fail closed",
    !validateLocalWidgetCalendarOverlay(
      { ...overlay, generatedAt: "2026-07-23T12:06:00.001Z" },
      expected
    ) &&
      !validateLocalWidgetCalendarOverlay(
        { ...overlay, expiresAt: "2026-07-23T11:59:59.000Z" },
        expected
      )
  );
  let rejectedFarFutureClock = false;
  try {
    buildLocalWidgetCalendarOverlayFromData(
      {
        profileId: "roman.general",
        lectionaryPackId: DEFAULT_LECTIONARY_PACK_ID,
        individualChurchProper: proper,
        now: new Date("2033-07-23T12:00:00.000Z")
      },
      lect,
      []
    );
  } catch (error) {
    rejectedFarFutureClock =
      error instanceof Error && error.message.includes("outside the bundled widget snapshot window");
  }
  const correctedClockOverlay = buildLocalWidgetCalendarOverlayFromData(
    {
      profileId: "roman.general",
      lectionaryPackId: DEFAULT_LECTIONARY_PACK_ID,
      individualChurchProper: proper,
      now
    },
    lect,
    []
  );
  check(
    "far-future clock data is refused and unchanged settings rebuild after correction",
    rejectedFarFutureClock && validateLocalWidgetCalendarOverlay(correctedClockOverlay, expected)
  );
  const rolloverOverlay = buildLocalWidgetCalendarOverlayFromData(
    {
      profileId: "roman.general",
      lectionaryPackId: DEFAULT_LECTIONARY_PACK_ID,
      individualChurchProper: proper,
      now: new Date("2027-01-02T12:00:00.000Z")
    },
    lect,
    []
  );
  check(
    "New Year settings sync preserves the bundled native snapshot window",
    rolloverOverlay.window.from === overlay.window.from &&
      rolloverOverlay.window.through === overlay.window.through &&
      validateLocalWidgetCalendarOverlay(rolloverOverlay, {
        ...expected,
        window: overlay.window,
        now: new Date("2027-01-02T12:00:00.000Z")
      })
  );
}

// 8. Empty-slot audit (P1-4): data-report.txt must stay in sync with the
//    bundles, no canonical chapter may be fully empty, and every scattered
//    empty slot must be listed in the report.
console.log("");
const report = readFileSync(join(ROOT, "data-report.txt"), "utf8");
const PLACEHOLDERS = new Set(["prayer-of-manasseh", "3-esdras", "4-esdras", "psalm-151", "laodiceans"]);
const isEmpty = (s: string | undefined) => !s || !s.trim();
const bundles: Record<string, Record<string, string[][]>> = {};
for (const t of ["drc", "cpdv", "vulgate"]) {
  const idx = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/index.json`), "utf8"));
  bundles[t] = {};
  for (const slug of idx.books) {
    bundles[t][slug] = JSON.parse(
      readFileSync(join(ROOT, `public/data/${t}/${slug}.json`), "utf8")
    ).chapters;
  }
}
for (const [t, books] of Object.entries(bundles)) {
  let verses = 0;
  let empties = 0;
  const fullEmptyCanonical: string[] = [];
  for (const [slug, chs] of Object.entries(books)) {
    chs.forEach((ch, ci) => {
      let chEmpty = 0;
      for (const v of ch) {
        verses++;
        if (isEmpty(v)) {
          empties++;
          chEmpty++;
        }
      }
      if (ch.length && chEmpty === ch.length && !PLACEHOLDERS.has(slug))
        fullEmptyCanonical.push(`${slug} ${ci + 1}`);
    });
  }
  console.log(`${t}: ${Object.keys(books).length} books, ${verses} verses, ${empties} empty`);
  const m = report.match(new RegExp(`^${t}\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)$`, "m"));
  check(
    `data-report.txt summary in sync for ${t}`,
    !!m &&
      +m[1] === Object.keys(books).length &&
      +m[2] === verses &&
      +m[3] === verses - empties &&
      +m[4] === empties,
    m ? `report ${m[2]}v/${m[4]}e vs data ${verses}v/${empties}e` : "summary line missing"
  );
  check(
    `no fully-empty canonical chapter in ${t}`,
    fullEmptyCanonical.length === 0,
    fullEmptyCanonical.slice(0, 5).join(", ")
  );
}
const reportSlots = new Set(
  [...report.matchAll(/^([a-z0-9-]+) (\d+):(\d+)\s+empty in /gm)].map(
    (m) => `${m[1]} ${m[2]}:${m[3]}`
  )
);
const dataSlots = new Set<string>();
for (const books of Object.values(bundles)) {
  for (const [slug, chs] of Object.entries(books)) {
    if (PLACEHOLDERS.has(slug)) continue;
    chs.forEach((ch, ci) =>
      ch.forEach((v, vi) => {
        if (isEmpty(v)) dataSlots.add(`${slug} ${ci + 1}:${vi + 1}`);
      })
    );
  }
}
const missingFromReport = [...dataSlots].filter((s) => !reportSlots.has(s));
const staleInReport = [...reportSlots].filter((s) => !dataSlots.has(s));
check(
  "every scattered empty slot is listed in data-report.txt",
  missingFromReport.length === 0,
  missingFromReport.slice(0, 5).join(", ")
);
check(
  "data-report.txt lists no stale scattered slots",
  staleInReport.length === 0,
  staleInReport.slice(0, 5).join(", ")
);

// 9. Every lectionary span must render at least one non-empty verse in every
//    bundled translation, for every book — the all-books generalization of 6a,
//    mirroring ReadingText's empty-skip + one-slot-back fallback.
let silentAll = 0;
const silentAllSamples: string[] = [];
for (const [code, rows] of Object.entries(lect)) {
  for (const r of rows) {
    for (const span of r.s) {
      const spans: Span[] = r.b === "psalms" ? hebrewSpanToVulgate(...span) : [span];
      for (const t of ["drc", "cpdv", "vulgate"]) {
        const chapters = bundles[t][r.b];
        const slots = (mapped: Span[]) =>
          mapped.flatMap(([ch, v1, v2]) => {
            const chap = chapters?.[ch - 1] ?? [];
            const last = Math.min(v2 === 999 ? chap.length : v2, chap.length);
            const got: string[] = [];
            for (let v = Math.min(v1, chap.length); v <= last; v++) got.push(chap[v - 1] ?? "");
            return got;
          });
        let got = slots(spans);
        if (got.length && got.every((x) => !x.trim()) && spans[0][1] > 1) {
          got = slots([[spans[0][0], spans[0][1] - 1, spans[0][2]]]);
        }
        if (!got.some((x) => x.trim())) {
          silentAll++;
          if (silentAllSamples.length < 8)
            silentAllSamples.push(`${code} (${t}): ${r.b} ${JSON.stringify(span)}`);
        }
      }
    }
  }
}
check(
  "every lectionary span renders text in all translations (all books)",
  silentAll === 0,
  `${silentAll}`
);
for (const s of silentAllSamples) console.log(`   ${s}`);

// 10. Integrity manifest (P1-10): every file under public/data must hash to
//     its manifest entry — verified here independently of the generator.
console.log("");
const manifest = JSON.parse(readFileSync(join(ROOT, "public/data/manifest.json"), "utf8"));
const dataFiles: string[] = [];
const walkData = (rel: string) => {
  for (const e of readdirSync(join(ROOT, "public/data", rel), { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue; // mirror build-manifest's junk filter
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walkData(r);
    else if (r !== "manifest.json") dataFiles.push(r);
  }
};
walkData("");
dataFiles.sort();
const actualHash = new Map<string, string>();
for (const rel of dataFiles) {
  actualHash.set(
    rel,
    createHash("sha256").update(readFileSync(join(ROOT, "public/data", rel))).digest("hex")
  );
}
const hashProblems: string[] = [];
for (const rel of dataFiles) {
  if (!(rel in manifest.files)) hashProblems.push(`unmanifested: ${rel}`);
  else if (manifest.files[rel] !== actualHash.get(rel)) hashProblems.push(`mismatch: ${rel}`);
}
const staleEntries = Object.keys(manifest.files).filter((p) => !actualHash.has(p));
check(
  "every data file hashes to its manifest entry",
  hashProblems.length === 0,
  hashProblems.slice(0, 5).join(", ")
);
check(
  "manifest lists no files absent from public/data",
  staleEntries.length === 0,
  staleEntries.slice(0, 5).join(", ")
);
check(
  "manifest file count matches the data set",
  manifest.fileCount === dataFiles.length,
  `${manifest.fileCount} vs ${dataFiles.length}`
);
const rootRecomputed = createHash("sha256")
  .update(dataFiles.map((p) => `${p} ${actualHash.get(p)}`).join("\n"), "utf8")
  .digest("hex");
check(
  "manifest root hash matches an independent recomputation",
  manifest.rootHash === rootRecomputed,
  manifest.rootHash === rootRecomputed ? "" : `${manifest.rootHash.slice(0, 12)} vs ${rootRecomputed.slice(0, 12)}`
);
// Source pins: both build scripts must fetch pinned commits, never a branch.
const pinsSrc = readFileSync(join(ROOT, "scripts/pins.mjs"), "utf8");
const declaredPins = [...pinsSrc.matchAll(/commit:\s*"([0-9a-f]{40})"/g)].map((m) => m[1]);
check("five 40-hex upstream pins declared in scripts/pins.mjs", declaredPins.length === 5, `${declaredPins.length}`);
const buildSrcs = ["build-data", "build-lectionary", "build-haydock", "build-catena", "build-trent"].map((s) =>
  readFileSync(join(ROOT, `scripts/${s}.mjs`), "utf8")
);
const pinnedFetch = buildSrcs.every((s) => !s.includes("/master/") && s.includes("PINS."));
check(
  "build scripts fetch only the pinned commits",
  pinnedFetch,
  pinnedFetch ? "" : "a build script still fetches a moving branch"
);
const manifestPins = [
  manifest.sources?.scrollmapper?.commit,
  manifest.sources?.lectionary?.commit,
  manifest.sources?.haydock?.commit,
  manifest.sources?.catena?.commit,
  manifest.sources?.trent?.commit
];
check(
  "manifest records the declared source pins",
  manifestPins.length === 5 && manifestPins.every((c) => typeof c === "string" && declaredPins.includes(c)),
  `manifest: ${manifestPins.map((c) => String(c).slice(0, 7)).join(", ")}`
);
const dotfileEntries = Object.keys(manifest.files).filter((p) =>
  p.split("/").some((seg) => seg.startsWith("."))
);
check(
  "manifest seals no dotfiles (walkers cannot drift on junk files)",
  dotfileEntries.length === 0,
  dotfileEntries.slice(0, 3).join(", ")
);

// 11. Golden-year snapshots (review §B.2): the full computed calendar and
//     lectionary resolution for 2024–2031, every supported profile, must match the
//     committed snapshots byte-for-byte. A deliberate engine change is
//     re-blessed with `npm run golden` and reviewed in the diff.
console.log("");
for (const year of GOLDEN_YEARS) {
  let committed: Record<string, unknown[]>;
  try {
    committed = JSON.parse(readFileSync(join(ROOT, `scripts/golden/${year}.json`), "utf8"));
  } catch {
    check(`golden snapshot file exists for ${year}`, false, "run npm run golden");
    continue;
  }
  for (const region of GOLDEN_REGIONS) {
    const fresh = goldenYear(year, region, lect);
    const old = (committed[region] ?? []) as unknown[];
    const diffs: string[] = [];
    for (let i = 0; i < Math.max(fresh.length, old.length) && diffs.length < 4; i++) {
      if (JSON.stringify(old[i]) !== JSON.stringify(fresh[i])) {
        diffs.push((fresh[i] as { d?: string })?.d ?? (old[i] as { d?: string })?.d ?? `#${i}`);
      }
    }
    check(
      `golden ${year} (${region}) matches the committed snapshot`,
      diffs.length === 0 && fresh.length === old.length,
      diffs.length ? `first drift: ${diffs.join(", ")}` : `${fresh.length} vs ${old.length} days`
    );
  }
}

// Quote of the Day (spec §3): corpus↔emitted sync, schema, red list, and
// deterministic resolution through all three tiers.
console.log("");
{
  const corpus = JSON.parse(readFileSync(join(ROOT, "scripts/quotes.corpus.json"), "utf8"));
  const emittedRaw = readFileSync(join(ROOT, "public/data/quotes.json"), "utf8");
  const quotes: DailyQuote[] = JSON.parse(emittedRaw).quotes;

  check(
    "quotes.json is the emitted corpus (run npm run quotes after editing the source)",
    emittedRaw === JSON.stringify({ quotes: corpus.quotes }),
    `${quotes.length} quotes`
  );
  check("quote corpus has at least 40 entries", quotes.length >= 40, `${quotes.length}`);

  const REQUIRED = ["id", "text", "author", "work", "locus", "sourceEdition"] as const;
  const SEASONS = new Set(["advent", "christmastide", "lent", "eastertide"]);
  let schemaBad = 0;
  for (const q of quotes) {
    if (REQUIRED.some((f) => typeof q[f] !== "string" || !q[f].trim())) schemaBad++;
    else if (q.feast !== null && !/^\d{2}-\d{2}$/.test(q.feast)) schemaBad++;
    else if (q.season !== null && !SEASONS.has(q.season)) schemaBad++;
  }
  check("every quote satisfies the spec §3.1 schema", schemaBad === 0, `${schemaBad} bad`);

  const garrigou = quotes.filter((q) => q.id.startsWith("garrigou-"));
  check(
    "Garrigou-Lagrange is identified as a Dominican priest, never a cardinal",
    garrigou.length === 9 &&
      garrigou.every(
        (q) =>
          q.author === GARRIGOU_AUTHOR &&
          q.authorTitle === "Dominican Priest and Theologian"
      ),
    `${garrigou.length} entries; authors: ${[...new Set(garrigou.map((q) => q.author))].join(", ")}`
  );

  // The build's §3.3 red list is a HARD failure since v1.14.2: build-quotes.mjs
  // throws on any non-PD-author match unless ALLOW_RED_LIST=1 is set — the
  // explicit closed-beta escape hatch. What the rotation needs here is a corpus
  // larger than a year, so a quote can never repeat within one calendar year.
  check(
    "corpus larger than a calendar year (no in-year repeat possible)",
    quotes.length >= 366,
    `${quotes.length}`
  );

  const every = ["advent", "christmastide", "lent", "eastertide"].filter(
    (s) => !quotes.some((q) => q.season === s)
  );
  check("each seasonal pool is non-empty", every.length === 0, every.join(", "));

  const litUni = (d: Date) => liturgicalDay(d, "universal");

  // Tier 1 — sanctoral: Augustine speaks on his feast, August 28.
  const aug = new Date(2026, 7, 28);
  const q1 = quoteOfTheDay(quotes, aug, litUni, "universal");
  check(
    "Aug 28: the sanctoral tier serves Augustine",
    q1?.author.includes("Augustine") === true && q1?.feast === "08-28",
    q1?.id ?? "null"
  );
  // Tier 2 — seasonal: an early-Lent feria draws from the Lent pool.
  const lent = new Date(2026, 2, 5); // Thursday of the 2nd week of Lent
  const q2 = quoteOfTheDay(quotes, lent, litUni, "universal");
  check("Lent feria draws from the Lent pool", q2?.season === "lent", q2?.id ?? "null");

  // Tier 3 — the headline guarantee: no quote repeats within a calendar year.
  const ids2026: string[] = [];
  let nulls = 0;
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d = new Date(2026, d.getMonth(), d.getDate() + 1)) {
    const q = quoteOfTheDay(quotes, d, litUni, "universal");
    if (q) ids2026.push(q.id);
    else nulls++;
  }
  check("a quote resolves for every day of 2026", nulls === 0, `${nulls} null`);
  check(
    "no quote repeats within calendar year 2026",
    new Set(ids2026).size === ids2026.length,
    `${ids2026.length - new Set(ids2026).size} repeats across ${ids2026.length} days`
  );

  // Determinism: the same (date, region) always resolves to the same quote.
  let nondet = 0;
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d = new Date(2026, d.getMonth(), d.getDate() + 1)) {
    if (quoteOfTheDay(quotes, d, litUni, "universal")?.id !== quoteOfTheDay(quotes, d, litUni, "universal")?.id) {
      nondet++;
    }
  }
  check("quote selection is deterministic", nondet === 0, `${nondet} differ`);

  // The order reshuffles year to year — not a fixed cycle.
  let sameAcrossYears = 0;
  for (let m = 0; m < 12; m++) {
    const a = quoteOfTheDay(quotes, new Date(2026, m, 15), litUni, "universal")?.id;
    const b = quoteOfTheDay(quotes, new Date(2027, m, 15), litUni, "universal")?.id;
    if (a === b) sameAcrossYears++;
  }
  check("the rotation reshuffles year to year", sameAcrossYears < 12, `${sameAcrossYears}/12 mid-month dates identical`);
}

// ── 9. Typography (spec §1.4): bundled Scripture face + size presets ─────────
{
  const fontsDir = join(ROOT, "src/fonts");
  const FILES = [
    "eb-garamond-latin-400-normal.woff2",
    "eb-garamond-latin-400-italic.woff2",
    "eb-garamond-latin-ext-400-normal.woff2",
    "eb-garamond-latin-ext-400-italic.woff2"
  ];
  let bad = 0;
  let total = 0;
  for (const f of FILES) {
    let buf: Buffer | null = null;
    try {
      buf = readFileSync(join(fontsDir, f));
    } catch {
      // missing
    }
    // A genuine woff2 begins with the "wOF2" signature; guard against an empty
    // or LFS-pointer placeholder slipping in.
    const ok = !!buf && buf.length > 1000 && buf.toString("latin1", 0, 4) === "wOF2";
    if (!ok) {
      console.log(`bad/missing font: ${f}`);
      bad++;
    }
    if (buf) total += buf.length;
  }
  check(`all four EB Garamond woff2 present and valid (${Math.round(total / 1024)} KB)`, bad === 0, `${bad} bad`);
  check("only weight-400 faces bundled — no red/bold weights (spec §1.4, §13.7)",
    !FILES.some((f) => /-(?:500|600|700|800|bold)-/.test(f)));

  let ofl = "";
  try {
    ofl = readFileSync(join(fontsDir, "OFL.txt"), "utf8");
  } catch {
    // missing
  }
  check("SIL OFL committed for EB Garamond (spec §1.4)",
    /SIL OPEN FONT LICENSE/i.test(ofl) && /EB Garamond/i.test(ofl));

  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const faces = (css.match(/@font-face/g) ?? []).length;
  check("styles.css @font-face references all four woff2 files",
    FILES.every((f) => css.includes(f)) && faces >= 4, `${faces} faces`);
  check("EB Garamond declared with font-display: swap",
    /font-family:\s*"EB Garamond"[\s\S]*?font-display:\s*swap/.test(css));
  check("latin unicode-range present (covers æ U+00E6, œ U+0152–0153)", css.includes("U+0152-0153"));
  check("latin-ext unicode-range present", css.includes("U+0100-02BA"));
  check("--scripture mapped for all four faces",
    /\[data-font="garamond"\]/.test(css) &&
      /\[data-font="georgia"\]/.test(css) &&
      /\[data-font="times"\]/.test(css) &&
      /\[data-font="sans"\]/.test(css));
  check("reading text uses var(--scripture)", /\.verses\s*\{[^}]*var\(--scripture\)/.test(css));

  check("four size presets, 17/19/22/25 (spec §1.4)",
    JSON.stringify(FONT_SIZE_PRESETS.map((p) => p.px)) === "[17,19,22,25]");
  check("four faces: garamond/georgia/times/sans",
    JSON.stringify(SCRIPTURE_FONTS.map((f) => f.id)) === '["garamond","georgia","times","sans"]');
  check("default face is Garamond", DEFAULT_SCRIPTURE_FONT === "garamond");
  check("default size 19 is itself a preset", FONT_SIZE_PRESETS.some((p) => p.px === DEFAULT_FONT_SIZE));
  check("isScriptureFont guards the vocabulary",
    isScriptureFont("garamond") && !isScriptureFont("comic-sans") && !isScriptureFont(undefined));

  const s = getSettings();
  check("getSettings() defaults scriptureFont to garamond", s.scriptureFont === "garamond");
  check("getSettings() defaults fontSize to a preset", FONT_SIZE_PRESETS.some((p) => p.px === s.fontSize));

  // Dynamic Type (spec §9): the native shell's content-size tokens map onto the
  // reading presets. iOS's default category ("l") must land on the app's default,
  // every token must resolve to a real preset/clamp value, and accessibility sizes
  // collapse to the largest reading size.
  check("contentTokenToPx: device default 'l' → 19 (the app default)",
    contentTokenToPx("l") === DEFAULT_FONT_SIZE);
  check("contentTokenToPx: spans the presets xs..xxl → 17/17/19/19/22/25",
    JSON.stringify(["xs", "s", "m", "l", "xl", "xxl"].map(contentTokenToPx)) === "[17,17,19,19,22,25]");
  check("contentTokenToPx: accessibility 'ax' and 'xxxl' → largest reading size (28)",
    contentTokenToPx("ax") === 28 && contentTokenToPx("xxxl") === 28);
  check("contentTokenToPx: an unknown token falls back to the default",
    contentTokenToPx("bogus") === DEFAULT_FONT_SIZE);
}

// ── 10. Iconography (spec §1.5): the inline SVG set replaces the emoji glyphs in
//        interactive UI. Guard that none creep back in, and that the Icon
//        component stays currentColor-driven and single-weight.
{
  // The named glyphs the Icon set retired (⚑ ✎ ☾/☀ ⧉ ✠ ✕ ✓); held here so a
  // *rendered* one anywhere under src/**.tsx is caught. Gear/dove and other
  // typographic affordances are out of scope.
  const FORBIDDEN: [string, string][] = [
    ["⚑", "bookmark flag"],
    ["✎", "pencil"],
    ["☾", "crescent moon"],
    ["☀", "sun"],
    ["⧉", "copy/share"],
    ["✠", "cross"],
    ["✕", "close (x)"],
    ["✓", "check mark"]
  ];
  // Every .tsx under src/ (App.tsx and any future nesting included), with block
  // comments stripped first — so Icon.tsx's doc-comment, which names the glyphs
  // it supersedes, is exempt, while a *rendered* glyph anywhere (Icon.tsx too)
  // is still caught.
  const offenders: string[] = [];
  const tsxFiles = readdirSync(join(ROOT, "src"), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".tsx"));
  for (const f of tsxFiles) {
    const code = readFileSync(join(ROOT, "src", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [glyph, label] of FORBIDDEN) {
      if (code.includes(glyph)) offenders.push(`src/${f}: ${label}`);
    }
  }
  check("no emoji glyphs remain in interactive UI (spec §1.5)", offenders.length === 0,
    offenders.join("; "));

  // The native iOS widget is the home-screen parallel of the web Verse-of-the-Day
  // surfaces — the one most exposed to the system emoji font §1.5 set out to
  // retire. It must draw the cross natively (CrossIcon), not Text("✠"); keep it
  // in lockstep, as P1-9 keeps the VOTD selection in lockstep.
  let swift = "";
  try {
    swift = readFileSync(join(ROOT, "ios/WidgetExtension/FidelisWidget.swift"), "utf8");
  } catch {
    // widget source absent
  }
  const swiftGlyph = FORBIDDEN.find(([g]) => swift.includes(g));
  check("native iOS widget draws the cross natively, no emoji glyph (spec §1.5)",
    swift.length > 0 && !swiftGlyph, swiftGlyph ? swiftGlyph[1] : "");

  let icon = "";
  try {
    icon = readFileSync(join(ROOT, "src/components/Icon.tsx"), "utf8");
  } catch {
    // not yet created
  }
  check("Icon component exists", icon.length > 0);
  check("Icon strokes with currentColor so accent mode colors it (acceptance §1.5)",
    icon.includes('stroke="currentColor"'));
  const widths = new Set([...icon.matchAll(/strokeWidth=\{?["']?([\d.]+)/g)].map((m) => m[1]));
  check("Icon draws in a single stroke weight (spec §1.5)", widths.size === 1, [...widths].join("/"));
  const NAMES = ["bookmark", "note", "share", "commentary", "sun", "moon", "cross"];
  check("Icon defines the six-piece set, incl. commentary for §4",
    NAMES.every((n) => new RegExp(`["']${n}["']`).test(icon)), NAMES.join(", "));
}

// ── 11. Tab bar (spec §2.1): five-tab navigation — Today · Read · Search · Mass
//        · More — as the desktop header row and, on phones, the collapsing
//        masthead (v1.16.0): the brand row in normal flow, the tab row its own
//        sticky top bar — by CSS only. These lock the acceptance criteria the
//        build/type-check cannot see (the last, a green build, is `npm run
//        build`): the header dissolves at phone widths, the tab row pins to the
//        top, the active tab is purple, and the row honors the landscape
//        safe-areas.
{
  let tab = "";
  try {
    tab = readFileSync(join(ROOT, "src/components/TabBar.tsx"), "utf8");
  } catch {
    // not yet created
  }
  // Strip comments so the doc-comment's own "Today · Read · Search · Mass · More"
  // line can't satisfy the order/label checks — they must hit the real JSX.
  const tabCode = tab.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const header = readFileSync(join(ROOT, "src/components/Header.tsx"), "utf8");

  check("TabBar component exists", tab.length > 0);

  // The five primary entries, in spec order, on the existing routes (no router
  // changes): Today (/), Read (/read), Search (/search), Mass (/readings), More.
  const PRIMARY: [string, string][] = [
    ["/", "Today"],
    ["/read", "Read"],
    ["/search", "Search"],
    ["/readings", "Mass"]
  ];
  check("TabBar renders the four primary tabs on their routes (spec §2.1)",
    PRIMARY.every(([to, label]) =>
      new RegExp(`to=["']${to}["'][^>]*>\\s*${label}`).test(tabCode)), PRIMARY.map((p) => p[1]).join(" · "));
  // Anchor each label to its JSX text node (">label"), not a raw substring —
  // identifiers like onMoreRoute/MORE would otherwise place "More" first.
  check("TabBar's primary tabs are in spec order (Today·Read·Search·Mass·More)",
    ["Today", "Read", "Search", "Mass", "More"]
      .map((l) => tabCode.search(new RegExp(`>\\s*${l}`)))
      .every((i, n, a) => i >= 0 && (n === 0 || i > a[n - 1])));

  // "More" exposes each secondary destination, including the native widget
  // gallery. More itself remains a popover, not a route.
  const MORE = ["/library", "/widgets", "/translations", "/settings", "/about"];
  check("More opens Library/Widgets/Translations/Settings/About (spec §2.1)",
    MORE.every((to) => new RegExp(`["']${to}["']`).test(tabCode)), MORE.join(", "));

  // The header delegates to <TabBar>; the old seven-link inline nav is gone.
  check("Header renders <TabBar> in place of the inline nav (spec §2.1)",
    header.includes("<TabBar") && !/<nav className="nav">/.test(header));

  // Acceptance: the phone breakpoint dissolves the header's boxes (display:
  // contents) so the tab row can pin to the top as its own sticky row.
  check("phone media query (max-width: 640px) exists (spec §2.1)",
    /@media\s*\(max-width:\s*640px\)/.test(css));
  check("acceptance: the masthead dissolves on phones — .header/.header-inner display: contents (v1.16.0)",
    /\.header,\s*\.header-inner\s*\{\s*display:\s*contents/.test(css));
  check("acceptance: the tab row pins to the top — .tabbar position: sticky; top: env(safe-area-inset-top)",
    /\.tabbar\s*\{[^}]*position:\s*sticky[^}]*top:\s*env\(safe-area-inset-top\)/.test(css));

  // Acceptance: the active tab is purple (purple acts, §1.2) — for both the
  // NavLink tabs and the More button.
  check("acceptance: active tab is purple — .nav a.active uses var(--purple)",
    /\.nav a\.active\s*\{[^}]*color:\s*var\(--purple\)/.test(css));
  check("acceptance: active More button is purple — .more-btn.active uses var(--purple)",
    /\.more-btn\.active\s*\{[^}]*color:\s*var\(--purple\)/.test(css));

  // Acceptance: the tab row clears the rounded corners in landscape (spec §6).
  check("acceptance: the tab row respects the landscape safe-areas — env(safe-area-inset-left/right)",
    /\.tabbar\s*\{[^}]*env\(safe-area-inset-right\)[^}]*env\(safe-area-inset-left\)/.test(css));
}

// ── 12. The one Settings screen (spec §2.2): live preview + SettingsContext,
//        the folded Appearance/Calendar controls, version cards, and the Data
//        section's real per-bundle sizes. Pure helpers are asserted directly;
//        the wiring is asserted against source, in the §2.1 manner.
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");

  // Appearance resolution (System → the OS preference), pure and DOM-free.
  check("resolveTheme: System follows the OS — dark→night, light→day (spec §2.2)",
    resolveTheme("system", true) === "night" && resolveTheme("system", false) === "day");
  check("resolveTheme: Day/Night pin the palette regardless of the OS",
    resolveTheme("day", true) === "day" && resolveTheme("night", false) === "night");
  check("THEME_OPTIONS are System/Day/Night in order",
    JSON.stringify(THEME_OPTIONS.map((o) => o.id)) === '["system","day","night"]');
  check("isThemeChoice guards the vocabulary",
    isThemeChoice("system") && isThemeChoice("day") && !isThemeChoice("parchment") && !isThemeChoice(undefined));
  check("getSettings() defaults theme to System (spec §2.2)", getSettings().theme === "system");

  // Download sizes are human-readable and real.
  check("formatBytes renders MB/KB/B",
    formatBytes(5_026_728) === "4.8 MB" && formatBytes(2048) === "2 KB" && formatBytes(500) === "500 B");

  // The manifest now seals real per-bundle sizes (spec §2.2 / P1-10 extended).
  const m22 = JSON.parse(readFileSync(join(ROOT, "public/data/manifest.json"), "utf8"));
  const bundleIds = ["drc", "cpdv", "vulgate"];
  check("manifest seals per-bundle file counts and byte sizes",
    !!m22.bundles &&
      bundleIds.every((id) => m22.bundles[id]?.files === 79 && m22.bundles[id]?.bytes > 1_000_000),
    bundleIds.map((id) => `${id} ${m22.bundles?.[id] ? formatBytes(m22.bundles[id].bytes) : "?"}`).join(", "));

  // SettingsContext is the live source of truth (spec §2.2 engineering note).
  const ctx = readFileSync(join(ROOT, "src/SettingsContext.tsx"), "utf8");
  check("SettingsContext exposes provider + read/update hooks",
    /export function SettingsProvider/.test(ctx) &&
      /export function useSettings/.test(ctx) &&
      /export function useUpdateSettings/.test(ctx));
  const main = readFileSync(join(ROOT, "src/main.tsx"), "utf8");
  check("the app is wrapped in <SettingsProvider>", /<SettingsProvider>/.test(main));

  // App drives the RESOLVED palette; "system" itself never reaches CSS.
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  check("App resolves theme through resolveTheme and consumes the context",
    app.includes("resolveTheme") && app.includes("useSettings"));
  check('styles.css carries no [data-theme="system"] rule (system resolves to day/night)',
    !/\[data-theme="system"\]/.test(css));

  // The control cluster has folded out of the header (spec §2.1/§2.2).
  const header = readFileSync(join(ROOT, "src/components/Header.tsx"), "utf8");
  check("header folds away the day/night + liturgical-year controls",
    header.includes("<TabBar") && !header.includes("onToggleTheme") && !header.includes("accent-dot"));
  check("App renders <Header /> with no control props", /<Header\s*\/>/.test(app));

  // The embeddable widget's theme is honored by App (the single writer of
  // <html data-theme>), so App's own theme effect can no longer clobber it.
  const widget = readFileSync(join(ROOT, "src/pages/WidgetVotd.tsx"), "utf8");
  check("App is the single data-theme writer and honors the widget ?theme",
    app.includes('get("theme")') && app.includes("widgetMode") && !widget.includes("dataset.theme"));

  // The Settings screen itself.
  const set = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  check("Settings: live preview is Genesis 1:1–2 in the current translation",
    /loadBook\(settings\.translation,\s*"genesis"\)/.test(set) && set.includes("Scripture preview"));
  check("Settings: preview/Reader respond live through the context",
    set.includes("useSettings") && set.includes("useUpdateSettings"));
  check("Settings: horizontally scrolling Bible-version cards",
    set.includes("version-cards") && set.includes('role="radiogroup"'));
  check("Settings: RSV-2CE/NABRE lock + import link to /translations",
    set.includes("lock-badge") && /\/translations#\$\{t\.id\}/.test(set));
  check("Settings: text-size and font pills",
    set.includes("FONT_SIZE_PRESETS") && set.includes("SCRIPTURE_FONTS"));
  check("Settings: Appearance is System/Day/Night + the follow-the-year switch",
    set.includes("THEME_OPTIONS") && /role="switch"/.test(set) && set.includes("followLiturgicalYear"));
  check("Settings: the follow-the-year catechesis line (spec §2.2)",
    set.includes("violet in Advent, rose on Gaudete"));
  check("Settings: manual country, province, and diocese controls remain fail-closed",
    set.includes("calendarCountryCode") &&
      set.includes("US_ECCLESIASTICAL_PROVINCES") &&
      set.includes("calendarDiocese") &&
      set.includes("will not claim a"));
  check("Settings: calendar, lectionary, and displayed Mass Bible are independent controls",
    set.includes("settings.calendarProfile") &&
      set.includes("SUPPORTED_LECTIONARY_PACKS") &&
      set.includes("settings.lectionaryPackId") &&
      set.includes("settings.massTranslation") &&
      set.includes("Displayed Mass Bible"));
  check("Settings: the constrained individual-church proper has title, dedication, and patron controls",
    set.includes("individualChurchProper") &&
      set.includes("Title celebration") &&
      set.includes("Dedication anniversary") &&
      set.includes("Principal patron celebration"));
  check("Settings: local-proper dates reject duplicates and permit a leap-day selection",
    set.includes("individualChurchProperDateConflicts") &&
      set.includes("blockedDates") &&
      set.includes("[31, 29, 31"));
  check("Settings: Data offers per-bundle download with real sizes",
    set.includes("downloadBundle") && set.includes("formatBytes"));
  check("Settings: Data reuses the P2-6 export/import",
    set.includes("exportMarginalia") && set.includes("importMarginalia"));
  check("Settings: the manifest integrity line links to About",
    set.includes("Texts verified at build") && /to="\/about"/.test(set));

  // Readings is left clean — the region select is gone (spec §2.2).
  const readings = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");
  check("Readings no longer renders the region select or writes settings",
    !readings.includes('value="usa"') && !readings.includes("saveSettings"));
  check("Readings reads the region live from the context",
    readings.includes("useSettings") && readings.includes("settings.calendarProfile"));
  check("Readings labels a missing local proper without misrepresenting the fallback",
    readings.includes('formularyState?.kind === "missing-local-formulary"') &&
      readings.includes("not presented as the celebration&apos;s proper readings"));
  const home = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  check("Today and Readings distinguish commemorations from optional memorials",
    home.includes('c.rank === "Commemoration"') &&
      readings.includes('c.rank === "Commemoration"') &&
      home.includes("permitted commemoration") &&
      readings.includes("permitted commemoration"));

  // About carries the anchor the Data line points at.
  const about = readFileSync(join(ROOT, "src/pages/About.tsx"), "utf8");
  check("About marks the integrity line with id=\"integrity\"", about.includes('id="integrity"'));
  check(
    "About identifies the installed lectionary as a derived Roman citation pack",
    about.includes("bundled derived Roman citation pack") && !about.includes("bundled U.S. pack")
  );

  // No-flash boot: index.html resolves theme + face before paint.
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  check("index.html pre-paint script resolves theme (prefers-color-scheme) + font",
    html.includes("prefers-color-scheme") && /dataset\.theme/.test(html) && /dataset\.font/.test(html));

  // The chosen version-card is outlined in purple (purple acts, §1.2); the
  // switch fills purple when on.
  check("acceptance: selected version-card is outlined purple — .version-card.active uses var(--purple)",
    /\.version-card\.active\s*\{[^}]*var\(--purple\)/.test(css));
  check("acceptance: the follow-the-year switch fills purple when on",
    /\.switch\[aria-checked="true"\]\s*\{[^}]*var\(--purple-strong\)/.test(css));
}

// 11. Rosary mystery sheets (v1.2 B1). Every mystery's meditation passage must
//     resolve to real text in every bundled translation, and passageText must
//     equal the Reader's own verse filter (so the sheet can't drift). The five
//     traditional prayers must be present and complete. Today stays five cards.
console.log("");
const allMysteries = Object.values(MYSTERY_SETS).flatMap((s) => s.mysteries);
check("the four mystery sets hold 20 mysteries", allMysteries.length === 20, `${allMysteries.length}`);

for (const t of ["drc", "cpdv", "vulgate"]) {
  let bad = 0;
  let drift = 0;
  for (const m of allMysteries) {
    const [book, chapter, start] = m.ref;
    try {
      const data = JSON.parse(
        readFileSync(join(ROOT, `public/data/${t}/${book}.json`), "utf8")
      );
      const got = passageText(data, chapter, start, m.end);
      if (!got.trim()) {
        console.log(`  ${t}: empty passage — ${m.title} (${book} ${chapter}:${start})`);
        bad++;
      }
      // Independent recompute of the Reader's own grid-empty filter.
      const ch: string[] = data.chapters[chapter - 1] ?? [];
      const last = Math.min(m.end ?? start, ch.length);
      const reader = ch.slice(start - 1, last).filter((s) => s && s.trim()).join(" ");
      if (got !== reader) {
        console.log(`  ${t}: passage drift — ${m.title}`);
        drift++;
      }
    } catch {
      console.log(`  ${t}: missing book ${book} — ${m.title}`);
      bad++;
    }
  }
  check(`every mystery passage lands on text in ${t}`, bad === 0, `${bad} invalid`);
  check(`passageText matches the Reader filter in ${t}`, drift === 0, `${drift} drift`);
}

check(
  "five rosary prayers carry Latin and English",
  PRAYERS.length === 5 && PRAYERS.every((p) => p.la.trim() && p.en.trim()),
  `${PRAYERS.length}`
);
check(
  "each rosary prayer closes with Amen (Latin and English)",
  PRAYERS.every((p) => /Amen\.?$/.test(p.la.trim()) && /Amen\.?$/.test(p.en.trim()))
);

// Standing rule 2: the Today page renders exactly six cards (raised from five
// in v1.18.0 "the memory of the just"; in v1.19.0 the history card became the
// Saint-led "Today in the Church" card and the Mass card became "Today at Mass").
const homeSrc = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
check(
  "Today page renders exactly six cards (standing rule 2)",
  (homeSrc.match(/className="card"/g) || []).length === 6,
  `${(homeSrc.match(/className="card"/g) || []).length} cards`
);

// Two-accent rule on the new sheet: close acts in purple, label honors in gold.
const sheetCss = readFileSync(join(ROOT, "src/styles.css"), "utf8");
check(
  "sheet close button acts in purple (two-accent §1.2)",
  /\.sheet-close\s*\{[^}]*var\(--purple\)/.test(sheetCss)
);
check(
  // --gold-text is gold (the AA-legible text variant); both honor in gold.
  "sheet prayers label honors in gold (two-accent §1.2)",
  /\.mystery-sheet-prayers-label\s*\{[^}]*var\(--gold(-text)?\)/.test(sheetCss)
);
check(
  "modal backdrop uses the --scrim token, no raw color",
  /\.sheet-backdrop\.open\s*\{[^}]*var\(--scrim\)/.test(sheetCss)
);

// 12. The reading-time indulgence accumulator (v1.2 B2, spec §6.1). Pure; driven
//     by injected timestamps. Gap reset and local-midnight rollover are the
//     acceptance criteria.
console.log("");
{
  const MIN = 60 * 1000;
  const t0 = new Date(2026, 5, 14, 9, 0, 0).getTime(); // Jun 14 2026 09:00 local

  // Accumulation: six 5-min ticks credit 30 minutes and earn the indulgence.
  let s = advance(null, { type: "resume", at: t0 });
  for (let k = 1; k <= 6; k++) s = advance(s, { type: "tick", at: t0 + k * 5 * MIN });
  check("reading: six 5-min ticks accumulate 30 minutes", s.ms === 30 * MIN, `${s.ms / MIN}min`);
  check("reading: 30 minutes earns the indulgence", s.earned === true);

  // Gap reset: a tick a full 10 min after the last resets the continuity clock.
  let g = advance(null, { type: "resume", at: t0 });
  g = advance(g, { type: "tick", at: t0 + 5 * MIN });
  g = advance(g, { type: "tick", at: t0 + 5 * MIN + GAP_MS });
  check("reading: a >=10-min gap resets the continuity clock", g.ms === 0, `${g.ms / MIN}min`);
  check("reading: a pre-earn gap leaves earned false", g.earned === false);

  // Earned latches through a same-day gap reset.
  const after = advance(s, { type: "tick", at: t0 + 6 * 5 * MIN + GAP_MS + MIN });
  check("reading: earned latches through a same-day gap reset", after.earned === true && after.ms === 0);

  // resume re-baselines without crediting time.
  let r = advance(null, { type: "resume", at: t0 });
  r = advance(r, { type: "tick", at: t0 + 3 * MIN });
  r = advance(r, { type: "resume", at: t0 + 9 * MIN });
  check("reading: resume re-baselines without crediting", r.ms === 3 * MIN, `${r.ms / MIN}min`);

  // Local-midnight rollover resets ms AND earned.
  const late = new Date(2026, 5, 14, 23, 50, 0).getTime();
  const next = new Date(2026, 5, 15, 0, 5, 0).getTime();
  let d = advance(null, { type: "resume", at: late });
  d = advance(d, { type: "tick", at: late + 2 * MIN });
  d = { ...d, earned: true }; // force earned to prove the rollover clears it
  const rolled = advance(d, { type: "tick", at: next });
  check("reading: local-midnight rollover resets ms and earned",
    rolled.ms === 0 && rolled.earned === false, `ms=${rolled.ms} earned=${rolled.earned}`);

  // dayKey is local, not UTC.
  check("reading: dayKey changes across local midnight",
    dayKey(new Date(2026, 5, 14, 23, 59, 0).getTime()) !== dayKey(new Date(2026, 5, 15, 0, 1, 0).getTime()));
  check("reading: dayKey is stable within a local day",
    dayKey(new Date(2026, 5, 14, 1, 0, 0).getTime()) === dayKey(new Date(2026, 5, 14, 22, 0, 0).getTime()));

  // Purity guard: the module injects time, never reads the clock itself.
  const readingSrc = readFileSync(join(ROOT, "src/lib/reading.ts"), "utf8");
  check("reading.ts has no Date.now()/argless new Date() (pure)",
    !/Date\.now\(/.test(readingSrc) && !/new Date\(\s*\)/.test(readingSrc));

  check("reading: HALF_HOUR_MS and GAP_MS are 30 and 10 minutes",
    HALF_HOUR_MS === 30 * MIN && GAP_MS === 10 * MIN);

  // The rendered line must match the spec's §6.1 wording exactly ("the Church's,
  // not ours") — guard against silent drift. Whitespace-tolerant for the JSX wrap.
  const noticeSrc = readFileSync(join(ROOT, "src/components/IndulgenceNotice.tsx"), "utf8");
  check("indulgence line text matches the spec §6.1 wording exactly",
    /You have read for half an hour\.\s+The Church grants a plenary indulgence for this,\s+under the usual conditions \(Ench\. Ind\., conc\. 30\)\./.test(noticeSrc));
}

// 13. Reading plans (v1.2 B3, spec §7). Pure citation arithmetic over the real
//     canon counts: preset totals, pace, completion advance, and the weighted
//     Whole-Canon order (no two long chapters in a day; psalms spread).
console.log("");
{
  // Canon counts come from the real bundled data (parity with the corpus).
  for (const [slug, t] of [["genesis", "drc"], ["psalms", "drc"], ["matthew", "drc"], ["revelation", "drc"]] as const) {
    const real = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/${slug}.json`), "utf8")).chapters.length;
    check(`canon chapter count for ${slug} matches the real data`, getBook(slug)!.chapters === real, `${getBook(slug)!.chapters} vs ${real}`);
  }
  check("psalms 118 is 176 verses (Vulgate numbering)", getBook("psalms")!.verses[117] === 176, `${getBook("psalms")!.verses[117]}`);

  // Preset totals equal the summed real chapter counts.
  const sumChapters = (slugs: string[]) => slugs.reduce((n, s) => n + getBook(s)!.chapters, 0);
  const byId = Object.fromEntries(PRESETS.map((p) => [p.id, p.build()]));
  check("Gospels preset = 89 chapters", byId.gospels.chapters.length === 89, `${byId.gospels.chapters.length}`);
  check("Psalter preset = 150 chapters", byId.psalter.chapters.length === 150, `${byId.psalter.chapters.length}`);
  check("Gospels preset pace = 1/day (89 in 90 days)", byId.gospels.perDay === 1, `${byId.gospels.perDay}`);
  check("Psalter preset pace = 5/day (150 in 30 days)", byId.psalter.perDay === 5, `${byId.psalter.perDay}`);
  check("NT preset total matches summed NT chapter counts",
    byId.nt.chapters.length === sumChapters(BOOKS.filter((b) => ["Gospels", "Acts of the Apostles", "Pauline Epistles", "Catholic Epistles", "Apocalypse"].includes(b.group)).map((b) => b.slug)),
    `${byId.nt.chapters.length}`);
  check("Deuterocanon preset total matches summed deutero chapter counts",
    byId.deuterocanon.chapters.length === sumChapters(BOOKS.filter((b) => b.deutero).map((b) => b.slug)),
    `${byId.deuterocanon.chapters.length}`);

  // Whole Canon: permutation of the full 73-book canon; weighting invariants.
  const canonRefs = chaptersForBooks(BOOKS.filter((b) => !b.appendix).map((b) => b.slug));
  const wc = byId.canon.chapters;
  check("Whole Canon length = full canon chapter count", wc.length === canonRefs.length, `${wc.length} vs ${canonRefs.length}`);
  check("Whole Canon is a permutation of the canon (no loss/dup)",
    JSON.stringify([...wc].sort()) === JSON.stringify([...canonRefs].sort()));
  let twoLongDays = 0;
  let ps118DayVerses = 0;
  for (let i = 0; i < wc.length; i += byId.canon.perDay) {
    const day = wc.slice(i, i + byId.canon.perDay);
    if (day.filter((r) => versesOf(r) >= LONG_VERSES).length > 1) twoLongDays++;
    if (day.includes("psalms/118")) ps118DayVerses = day.reduce((n, r) => n + versesOf(r), 0);
  }
  check("Whole Canon: no day pairs two long chapters", twoLongDays === 0, `${twoLongDays} bad days`);
  check("Whole Canon: Psalm 118's day is near-solo (one long chapter)", ps118DayVerses > 0 && ps118DayVerses < 176 + 3 * LONG_VERSES, `${ps118DayVerses} verses`);
  let gap = 0, maxGap = 0;
  for (const r of wc) { if (r.startsWith("psalms/")) gap = 0; else { gap++; maxGap = Math.max(maxGap, gap); } }
  check("Whole Canon: psalms are spread through the year (bounded gaps)", maxGap <= 20, `max gap ${maxGap}`);

  // Completion advance.
  const plan: ReadingPlan = { id: "t", name: "t", chapters: ["a/1", "a/2", "a/3", "a/4", "a/5"], perDay: 2, startedAt: 0, completedThrough: 0 };
  check("todayPortion is the next perDay chapters", JSON.stringify(todayPortion(plan)) === JSON.stringify(["a/1", "a/2"]));
  const p1 = markPortionRead(plan);
  check("markPortionRead advances by perDay", p1.completedThrough === 2);
  check("planDay reflects the portion index", planDay(p1) === 2 && planDay(plan) === 1);
  check("planTotalDays = ceil(len/perDay)", planTotalDays(plan) === 3);
  const p2 = markPortionRead(markPortionRead(p1)); // 2 -> 4 -> 5 (clamped)
  check("markPortionRead clamps at the end and completes", p2.completedThrough === 5 && isComplete(p2));
  check("todayPortion is empty when complete", todayPortion(p2).length === 0);

  // Pace helpers.
  check("paceForDays(150,30)=5 and paceForDays(89,90)=1", paceForDays(150, 30) === 5 && paceForDays(89, 90) === 1);
  check("targetDateToPerDay spans the date range", targetDateToPerDay(60, 0, 30 * 24 * 60 * 60 * 1000) === 2);

  // formatPortion range collapsing.
  check("formatPortion collapses a same-book run", formatPortion(["genesis/3", "genesis/4"], "drc") === "Genesis 3–4");
  check("formatPortion joins mixed books with a middot", formatPortion(["genesis/3", "psalms/7"], "drc") === "Genesis 3 · Psalms 7");
}

// 14. Commentary parsers (spec §4.1): the Haydock SFM and Catena OSIS parsers
//     are pinned by fixture so a future re-pin or parser change that drops or
//     mis-keys a note turns the harness red. Pure functions, no network.
console.log("");
{
  // -- Haydock SFM footnote parser (fixtures are verbatim 3 John / Genesis forms) --
  const hfix = [
    "\\id 3JN ENG",
    "\\c 1",
    "\\v 1 The ancient to the dearly beloved Gaius.",
    "\\f + \\fr 1:4\\ft No greater grace. That is, nothing that gives me greater joy and satisfaction. (Challoner)\\f*",
    "\\f + \\fr 1:9-10\\ft Diotrephes....doth not receive us, nor those we recommend. (Witham) --- It seemeth, saith Ven. Bede, that he was an arch heretic. (Ven. Bede)\\f*",
    "\\f + \\fr 2:1\\ft proud sect master---upomneso, an obscure word. (Ven. Bede)\\f*",
    "\\f + \\fr 1:1 \\ft Year of the World 1, Year before Christ 4004.\\f*",
    "\\f + \\fr 0:0\\ft Book introduction, not keyed to a verse.\\f*"
  ].join("\n");
  const H = parseHaydockSfm(hfix);
  check(
    "haydock parser: single-attribution note keyed by 'ch:verse'",
    JSON.stringify(H["1:4"]) ===
      JSON.stringify([
        { src: "Challoner", text: "No greater grace. That is, nothing that gives me greater joy and satisfaction." }
      ])
  );
  check(
    "haydock parser: ' --- ' splits commentator segments, trailing (author) -> src",
    H["1:9"]?.length === 2 && H["1:9"][0].src === "Witham" && H["1:9"][1].src === "Ven. Bede"
  );
  check(
    "haydock parser: a verse-range note broadcasts to every verse in the span",
    JSON.stringify(H["1:9"]) === JSON.stringify(H["1:10"])
  );
  check(
    "haydock parser: bare '---' (no surrounding spaces) is not a segment boundary",
    H["2:1"]?.length === 1 && H["2:1"][0].text.includes("master---upomneso")
  );
  check(
    "haydock parser: tolerates the '\\fr N:N \\ft' space variant (Genesis form)",
    H["1:1"]?.some((e) => e.text === "Year of the World 1, Year before Christ 4004.")
  );
  check("haydock parser: chapter/verse-0 intro sentinels are skipped", !("0:0" in H));

  // -- Catena OSIS parser (fixture mirrors the Matt 5 / John 3 block shape) --
  const cfix =
    '<osis><osisText><div type="bookGroup">' +
    '<div annotateRef="Matt.5.1-Matt.5.2" annotateType="commentary" type="section">' +
    '<p osisID="Matt.5.1 Matt.5.2"><hi type="italic">Ver. 1. And seeing the multitudes, He went up.</hi></p>' +
    '<p><hi type="bold">Pseudo-Chrysostom:</hi> Every man in his own trade rejoices, &amp; so on.</p>' +
    '<p><hi type="bold">Chrysostom:</hi> He ascended a mountain, to fulfil the prophecy of Esaias, [<reference osisRef="Isa.40.9">Isa 40:9</reference>]<note type="x-footnote">editor aside</note></p>' +
    "<p>Or, He ascended into the mountain to shew the Church.</p>" +
    "</div>" +
    '<div annotateRef="John.3.5" annotateType="commentary" type="section">' +
    '<p osisID="John.3.5"><hi type="italic">Ver. 5. lemma</hi></p>' +
    '<p><hi type="bold">Augustine:</hi> Born of water and the Spirit.</p>' +
    "</div></div></osisText></osis>";
  const C = parseCatenaOsis(cfix);
  const mBlock = C.matthew[0];
  check(
    "catena parser: one pericope block per annotateRef div, span + father attribution",
    C.matthew.length === 1 &&
      mBlock?.ch === 5 && mBlock?.v1 === 1 && mBlock?.v2 === 2 &&
      mBlock?.entries[0]?.father === "Pseudo-Chrysostom" &&
      mBlock?.entries[0]?.text === "Every man in his own trade rejoices, & so on."
  );
  check(
    "catena parser: entities decoded, <reference> unwrapped, <note> dropped",
    mBlock?.entries[1]?.text.includes("to fulfil the prophecy of Esaias, [Isa 40:9]") &&
      !mBlock.entries[1].text.includes("editor aside") &&
      !mBlock.entries[1].text.includes("&amp;")
  );
  check(
    "catena parser: a no-bold <p> continues the previous father's comment",
    mBlock?.entries.length === 2 &&
      mBlock.entries[1].text.includes("Or, He ascended into the mountain to shew the Church")
  );
  check(
    "catena parser: the <p osisID> lemma is never emitted as commentary",
    !mBlock.entries.some((e: { text: string }) => /seeing the multitudes/.test(e.text))
  );
  check(
    "catena parser: comment lands under the right Gospel",
    C.john.length === 1 && C.john[0].entries[0]?.father === "Augustine"
  );

  // -- format-2 expansion (the load-time broadcast that replaced the stored one) --
  const spanDoc = {
    format: 2 as const,
    blocks: [
      { keys: ["5:1", "5:2"], entries: mBlock.entries },
      // A second pericope re-covering 5:2 with one identical entry: the
      // collision rule must keep a verse's identical comment single.
      { keys: ["5:2"], entries: [mBlock.entries[0], { father: "Bede", text: "distinct" }] }
    ]
  };
  check("isCatenaSpanDoc: recognises format 2 and rejects the legacy per-verse map",
    isCatenaSpanDoc(spanDoc) && !isCatenaSpanDoc({ "5:1": [] }) && !isCatenaSpanDoc(null));
  const expanded = expandCatenaSpans(spanDoc);
  check(
    "expandCatenaSpans: a span broadcasts to every verse it covers",
    JSON.stringify(expanded["5:1"]) === JSON.stringify(mBlock.entries)
  );
  check(
    "expandCatenaSpans: an identical comment never lands twice on one verse; distinct ones append",
    expanded["5:2"]?.length === 3 &&
      expanded["5:2"].filter((e) => e.father === "Pseudo-Chrysostom").length === 1 &&
      expanded["5:2"][2]?.father === "Bede"
  );
}

// 15. Commentary data (spec §4.1): every committed Haydock/Catena key lands on a
//     real coordinate in OUR DRC grid (Vulgate Psalm numbering, Douay slugs), and
//     the incipit of five sampled notes per source is pinned against the
//     page-scan-verified source text. Manifest sync is covered by §10's walk.
console.log("");
{
  const drcGrid = (slug: string): string[][] =>
    JSON.parse(readFileSync(join(ROOT, `public/data/drc/${slug}.json`), "utf8")).chapters;
  const readLayer = (sub: string) => {
    const dir = join(ROOT, "public/data/commentary", sub);
    const out: Record<string, Record<string, { src?: string; father?: string; text: string }[]>> = {};
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
      // The Catena ships de-duplicated (format 2); assert on the same expanded
      // per-verse map the app consumes (loadCommentary does this expansion too).
      out[f.replace(/\.json$/, "")] = isCatenaSpanDoc(doc) ? expandCatenaSpans(doc) : doc;
    }
    return out;
  };
  const haydock = readLayer("haydock");
  const catena = readLayer("catena");

  const keyFaults: string[] = [];
  const countKeys = (data: typeof haydock) => {
    let n = 0;
    for (const [slug, book] of Object.entries(data)) {
      const grid = drcGrid(slug);
      for (const key of Object.keys(book)) {
        n++;
        const [ch, v] = key.split(":").map(Number);
        const ok = ch >= 1 && ch <= grid.length && v >= 1 && v <= (grid[ch - 1]?.length ?? 0);
        if (!ok) keyFaults.push(`${slug} ${key}`);
      }
    }
    return n;
  };
  const haydockKeys = countKeys(haydock);
  const catenaKeys = countKeys(catena);
  check("every Haydock & Catena key lands on a real DRC coordinate", keyFaults.length === 0, keyFaults.slice(0, 6).join(", "));
  check(
    "Haydock covers the whole canon, densely keyed",
    Object.keys(haydock).length === 73 && haydockKeys > 20000,
    `${Object.keys(haydock).length} books, ${haydockKeys} keys`
  );
  check(
    "Catena covers exactly the four Gospels",
    JSON.stringify(Object.keys(catena).sort()) === JSON.stringify(["john", "luke", "mark", "matthew"]) && catenaKeys > 3000,
    `${Object.keys(catena).length} books, ${catenaKeys} keys`
  );
  check(
    "committed Catena files are the de-duplicated format 2 (chains stored once per pericope)",
    ["matthew", "mark", "luke", "john"].every((s) =>
      isCatenaSpanDoc(JSON.parse(readFileSync(join(ROOT, `public/data/commentary/catena/${s}.json`), "utf8")))
    )
  );

  // Spec §4.1 shape: Haydock entries are {src,text}; Catena entries are {father,text}.
  const sampleH = haydock["genesis"]["1:1"][0];
  check("Haydock entries are { src, text }", typeof sampleH.text === "string" && "src" in sampleH);
  const sampleC = catena["matthew"]["5:3"][0];
  check("Catena entries are { father, text }", typeof sampleC.text === "string" && "father" in sampleC);

  // Five incipit spot-checks per source (verified against the page-scan-backed source).
  const hHas = (slug: string, key: string, sub: string) => (haydock[slug]?.[key] ?? []).some((e) => e.text.includes(sub));
  check("Haydock incipit · Gen 1:1 'the Book of the Generation'", hHas("genesis", "1:1", "the Book of the Generation, or Genesis"));
  check("Haydock incipit · Ps 50:3 Miserere 'Hebrew chasdec'", hHas("psalms", "50:3", "the purport of the Hebrew chasdec"));
  check("Haydock incipit · John 3:5 'giving baptism to infants'", hHas("john", "3:5", "giving baptism to infants"));
  check("Haydock incipit · Ps 115:1 (remapped from authentic-Douay 115:10)", hHas("psalms", "115:1", "Alleluia is not in Hebrew"));
  check("Haydock incipit · Ps 147:1 (remapped from authentic-Douay 147:12)", hHas("psalms", "147:1", "This word is not in Hebrew"));

  const cHas = (slug: string, key: string, sub: string) => (catena[slug]?.[key] ?? []).some((e) => (e.text || "").includes(sub));
  const cFather = (slug: string, key: string, f: string) => (catena[slug]?.[key] ?? []).some((e) => e.father === f);
  check("Catena incipit · Matt 5:3 Pseudo-Chrysostom on the Beatitudes", cFather("matthew", "5:3", "Pseudo-Chrysostom") && cHas("matthew", "5:3", "poor in spirit"));
  check("Catena incipit · Mark 9:1 Transfiguration (AV→Douay −1 remap)", cHas("mark", "9:1", "glory of the resurrection"));
  check("Catena incipit · Mark 8:39 carries AV Mark 9:1 after the boundary remap", (catena["mark"]["8:39"] ?? []).length > 0);
  check("Catena incipit · Matt 17:14 lunatic-boy block after the 17:14–15 merge", (catena["matthew"]["17:14"] ?? []).length > 0);
  check("Catena incipit · John 3:5 Chrysostom on being born of water", cFather("john", "3:5", "Chrysostom") && cHas("john", "3:5", "water"));

  // Sacred-page guard: the Catena's Gospel lemma must never leak into a comment.
  check(
    "Catena drops the Gospel lemma ('Ver. N.' headers never enter comments)",
    !catena["matthew"]["5:3"].some((e) => /^Ver\.? \d/.test(e.text))
  );
}

// 16. Commentary UI layer (spec §4.2): the pure Catena father-normalisation that
//     drives the per-Father chips, the Doctors-only filter, and the grouping that
//     folds the source's "It goes on" connectives back into a Father's block.
console.log("");
{
  const F = (raw: string) => normalizeFather(raw);

  // The top-15 raw Catena labels by corpus frequency (pinned; from §15's data).
  // Every one must resolve to a Father, never the graceful "source" fallback.
  const TOP15 = [
    "Chrysostom", "Augustine", "Theophylact", "Bede", "Jerome", "Origen",
    "Ambrose", "Gregory", "Cyril", "Pseudo-Chrysostom", "Hilary", "Remigius",
    "Pseudo-Jerome", "Rabanus", "Alcuin"
  ];
  check(
    "every top-15 Catena label normalises to a Father (no fallback)",
    TOP15.every((l) => F(l).kind === "father"),
    TOP15.filter((l) => F(l).kind !== "father").join(", ") || "all father"
  );

  // Doctors of the Church, both ways — the Doctors-only filter rests on this.
  const DOCTORS = ["Chrysostom","Augustine","Jerome","Ambrose","Gregory","Basil","Athanasius","Bede","Hilary","Cyril","Leo"];
  const NON_DOCTORS = ["Theophylact","Origen","Remigius","Rabanus","Alcuin","Eusebius","Gregory of Nyssa","Maximus","Titus of Bostra","Didymus","Isidore"];
  check(
    "Doctors of the Church flagged isDoctor=true",
    DOCTORS.every((l) => F(l).kind === "father" && F(l).isDoctor === true),
    DOCTORS.filter((l) => !(F(l).kind === "father" && F(l).isDoctor)).join(", ") || "all doctors"
  );
  check(
    "non-Doctor Fathers flagged isDoctor=false",
    NON_DOCTORS.every((l) => F(l).kind === "father" && F(l).isDoctor === false),
    NON_DOCTORS.filter((l) => !(F(l).kind === "father" && F(l).isDoctor === false)).join(", ") || "all non-doctors"
  );

  // Newman edited this Catena edition and is a Doctor; he is never a per-verse label.
  check("John Henry Newman is in the Doctors set", isDoctor("newman") === true);

  // The ambiguous Gregory disambiguates by label; citation forms match by prefix.
  check("bare 'Gregory' is Gregory the Great (Doctor)", F("Gregory").id === "gregory-the-great" && F("Gregory").isDoctor === true);
  check("'Gregory of Nyssa' is distinct, not a Doctor", F("Gregory of Nyssa").id === "gregory-of-nyssa" && F("Gregory of Nyssa").isDoctor === false);
  check("'Gregory Naz.' is Gregory Nazianzen (Doctor)", F("Gregory Naz.").id === "gregory-nazianzen" && F("Gregory Naz.").isDoctor === true);
  check("citation 'Chrys., Hom. in Matt., 56' → Chrysostom", F("Chrys., Hom. in Matt., 56").id === "chrysostom");
  check("citation 'Aug., Serm. 351, 8' → Augustine", F("Aug., Serm. 351, 8").id === "augustine");

  // Word-boundary matching: an alias that is merely a PREFIX of a different
  // name must never match — over-matching would mis-attribute a Father and,
  // worse, could wrongly flag one a Doctor (corrupting the Doctors-only filter).
  check(
    "'Leontius' never resolves to Leo the Great",
    !(F("Leontius").kind === "father" && F("Leontius").id === "leo")
  );
  check(
    "'Basilides' never resolves to Basil",
    !(F("Basilides").kind === "father" && F("Basilides").id === "basil")
  );
  check(
    "'Maximilian' never resolves to Maximus",
    !(F("Maximilian").kind === "father" && F("Maximilian").id === "maximus")
  );
  check(
    "abbreviation with punctuation still matches at the boundary ('Aug.' → Augustine)",
    F("Aug.").id === "augustine"
  );

  // Pseudonymous authors stay distinct and are never Doctors.
  check(
    "'Pseudo-Chrysostom' is distinct from Chrysostom, not a Doctor",
    F("Pseudo-Chrysostom").id === "pseudo-chrysostom" && F("Pseudo-Chrysostom").isDoctor === false
  );
  check(
    "every Dionysius label → Pseudo-Dionysius (not a Doctor)",
    ["Dionysius ar", "Dionys.", "Dionys., de Divin., Nom. i", "Pseudo-Dionysius, Dion. De Cael. Hierarch. 4"]
      .every((l) => F(l).id === "pseudo-dionysius" && F(l).isDoctor === false)
  );

  // Gloss is the Glossa Ordinaria: a source, clearly not a Father.
  check(
    "'Gloss' variants → Glossa Ordinaria, not a Father",
    ["Gloss", "Gloss. interlin.", "Gloss., non occ.", "Gloss. ord."]
      .every((l) => F(l).kind === "gloss" && F(l).name === "Glossa Ordinaria")
  );

  // The connective phrases (and the empty label) are continuations, not chips.
  check(
    "connective phrases and '' are continuations",
    ["", "It goes on", "There follows", "Wherefore it goes on", "He adds", "What follows"]
      .every((l) => F(l).kind === "continuation")
  );

  // groupCatena folds a continuation back into the preceding Father's block.
  const g1 = groupCatena([
    { father: "Chrysostom", text: "A" },
    { father: "", text: "B" },
    { father: "It goes on", text: "C" },
    { father: "Augustine", text: "D" }
  ]);
  check(
    "groupCatena merges continuations into the prior Father's block",
    g1.length === 2 &&
      g1[0].father?.id === "chrysostom" &&
      g1[0].text.includes("A") && g1[0].text.includes("B") && g1[0].text.includes("C") &&
      g1[1].father?.id === "augustine" && g1[1].text === "D"
  );
  // Pin the exact inter-segment separator (a blank line) — it is the paragraph
  // break the reader sees between a Father's quoted passages in CommentarySheet.
  check("groupCatena joins a Father's merged segments with a blank line", g1[0].text === "A\n\nB\n\nC");

  // fathersOf is the distinct, in-order chip list — no Gloss, no duplicates.
  const g2 = groupCatena([
    { father: "Augustine", text: "1" },
    { father: "Chrysostom", text: "2" },
    { father: "Augustine", text: "3" },
    { father: "Gloss", text: "4" }
  ]);
  check(
    "fathersOf returns distinct Fathers in first-appearance order, excluding Gloss",
    JSON.stringify(fathersOf(g2).map((f) => f.id)) === JSON.stringify(["augustine", "chrysostom"])
  );

  // Identity disambiguations that matter for the Doctors-only filter:
  check("'Isidore' is Isidore of Pelusium — NOT a Doctor", F("Isidore").id === "isidore-pelusium" && F("Isidore").isDoctor === false);
  check("'Isid. Hisp.' is Isidore of Seville — a Doctor", F("Isid. Hisp. Orig. 8. 4").id === "isidore-of-seville" && F("Isid. Hisp. Orig. 8. 4").isDoctor === true);
  check("'Dion. alex' is Dionysius of Alexandria (a Father, not the Areopagite, not a Doctor)",
    F("Dion. alex").id === "dionysius-of-alexandria" && F("Dion. alex").isDoctor === false && F("Dionysius ar").id === "pseudo-dionysius");
  check("'Clem. alex' is Clement of Alexandria", F("Clem. alex").id === "clement-of-alexandria");
  check("'Ambrosiaster' is the anonymous Pauline commentator — NOT St. Ambrose, not a Doctor",
    F("Ambrosiaster Comm. in 1 Cor 12, 3").id === "ambrosiaster" &&
    F("Ambrosiaster Comm. in 1 Cor 12, 3").isDoctor === false &&
    F("Ambrose, Ambrosiaster, in Luc. 3. 30").id === "ambrose");

  // Transcription typos in the pinned corpus heal to the right Father.
  check("typo 'Origin, in Matt.' → Origen", F("Origin, in Matt., XV, 7").id === "origen");
  check("typo 'Psuedo-Chrys.' → Pseudo-Chrysostom", F("Psuedo-Chrys., Vict. Ant. e Cat. in Marc.").id === "pseudo-chrysostom");
  check("typo 'Theophyact' → Theophylact", F("Theophyact").id === "theophylact");
  check("abbrev 'Hil.' → Hilary (Doctor), 'Max' → Maximus, 'Tit. bos' → Titus of Bostra",
    F("Hil.").id === "hilary" && F("Hil.").isDoctor === true && F("Max").id === "maximus" && F("Tit. bos").id === "titus-of-bostra");

  // Genuine non-person sources stay 'source'; a lemma sentence is a continuation.
  check("'A Greek expositor' and a council are sources, not Fathers",
    F("A Greek expositor").kind === "source" && F("Second Council of Constantinople, Concil. Con. ii. Collat. 8").kind === "source");
  check("a lemma-sentence label is a continuation, not a chip",
    F("Thus we find Jesus partook of a banquet at Bethany").kind === "continuation");

  // Corpus-wide guard (pinned data): classify EVERY Catena label and prove the
  // graceful "source" fallback hides no real Father, and coverage stays high.
  const cdir = join(ROOT, "public/data/commentary/catena");
  const labelCounts: Record<string, number> = {};
  for (const fn of readdirSync(cdir)) {
    if (!fn.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(join(cdir, fn), "utf8"));
    const bk: Record<string, { father?: string }[]> = isCatenaSpanDoc(doc) ? expandCatenaSpans(doc) : doc;
    for (const notes of Object.values(bk)) for (const n of notes) labelCounts[n.father ?? ""] = (labelCounts[n.father ?? ""] ?? 0) + 1;
  }
  const sourceOk = (l: string) => ["A Greek expositor", "Josephus", "Faustus"].includes(l) || /council|concil/i.test(l);
  let fatherEntries = 0, totalEntries = 0;
  const leaked: string[] = [];
  for (const [lbl, c] of Object.entries(labelCounts)) {
    totalEntries += c;
    const k = normalizeFather(lbl).kind;
    if (k === "father") fatherEntries += c;
    if (k === "source" && !sourceOk(lbl)) leaked.push(lbl);
  }
  check("Catena normaliser: ≥93% of all entries resolve to a Father", fatherEntries / totalEntries >= 0.93, `${((100 * fatherEntries) / totalEntries).toFixed(2)}% of ${totalEntries}`);
  check("Catena normaliser: the 'source' fallback hides no real Father (only anonymous/council sources)", leaked.length === 0, leaked.slice(0, 6).join(" | "));
}

// §16b — chronological ordering of the Catena chain (§4.3 Phase 1). Pure, over
// src/lib/commentary.ts. public/data is untouched; this is a render-time sort.
console.log("");
{
  // 1. Every declared Father has a finite year (TS already requires `year`; this
  //    also catches a NaN or a yearOf-resolution regression). Newman is dated too.
  const undated = FATHER_IDS.filter((id) => !Number.isFinite(yearOf(id)));
  check("every declared Father resolves to a finite year", undated.length === 0, undated.join(", "));
  check("the editor Newman is dated (never sorts, but complete)", yearOf("newman") === 1890);

  // 2. The researched dates + circa flags the chain depends on (§3.2).
  check("yearOf: Origen 254 (circa), Chrysostom 407, Augustine 430, Gregory the Great 604",
    yearOf("origen") === 254 && circaOf("origen") === true &&
    yearOf("chrysostom") === 407 && circaOf("chrysostom") === false &&
    yearOf("augustine") === 430 && yearOf("gregory-the-great") === 604);
  check("yearOf: maximus defaults to Turin (465, circa) — flip to 662 is one line",
    yearOf("maximus") === 465 && circaOf("maximus") === true);

  // 3. Runtime pseudo-* ids dated by COMPOSITION era, not the namesake (§3.3, G2).
  check("pseudo-chrysostom (Opus Imperfectum) dated to its 5th-c. era, circa",
    yearOf("pseudo-chrysostom") === 430 && circaOf("pseudo-chrysostom") === true);
  check("pseudo-jerome (Hiberno-Latin Expositio) dated c. 675",
    yearOf("pseudo-jerome") === 675 && circaOf("pseudo-jerome") === true);
  check("pseudo-athan ('Pseudo-Athan.', Vigilius of Thapsus) is dated, not undated",
    yearOf("pseudo-athan") === 450);
  // base+1 fallback for an undocumented pseudo-<known father> (§3.4 step 3).
  check("yearOf: a generated pseudo-<base> falls to base death year + 1, circa",
    yearOf("pseudo-cyprian") === 259 && circaOf("pseudo-cyprian") === true);
  // a nameless / unknown pseudo → the undated bucket (G4), NEVER 0.
  check("yearOf: pseudo-anon and bare 'Pseudo.' (pseudo-pseudo) are undated, not 0",
    yearOf("pseudo-anon") === null && yearOf("pseudo-pseudo") === null);

  // 4. sortChronological orders earliest-Father-first (built via groupCatena so the
  //    blocks are real). Input is deliberately out of order.
  const chain = sortChronological(groupCatena([
    { father: "Augustine", text: "aug" },
    { father: "Gregory", text: "greg" },           // Gregory the Great, 604
    { father: "Origen", text: "ori" },
    { father: "Pseudo-Chrysostom", text: "ps-chrys" },
    { father: "Chrysostom", text: "chrys" }
  ]));
  check("sortChronological: Origen < Chrysostom < Augustine < pseudo-chrysostom < Gregory",
    chain.map((b) => b.father!.id).join(",") === "origen,chrysostom,augustine,pseudo-chrysostom,gregory-the-great",
    chain.map((b) => b.father!.id).join(","));
  // pseudo-chrysostom (430) sits in the 5th-c. slot, AFTER chrysostom (407) — never
  // beside its namesake at 407.
  const ids = chain.map((b) => b.father!.id);
  check("pseudo-chrysostom sorts to its composition era (after Chrysostom 407, not at it)",
    ids.indexOf("pseudo-chrysostom") > ids.indexOf("chrysostom"));

  // 5. Tie-break: equal years resolve stable-ascending-alphabetical by id (G3).
  const tie = sortChronological(groupCatena([
    { father: "Nemesius", text: "n" },             // 390
    { father: "Gregory Naz.", text: "gn" },        // 390
    { father: "Chrysologus", text: "pc" },         // Peter Chrysologus, 450 — the corpus
                                                    //  label is "Chrysologus"; "Peter
                                                    //  Chrysologus" misses matchFather's
                                                    //  prefix rule and becomes a source.
    { father: "Isidore", text: "ip" }              // Isidore of Pelusium, 450
  ]));
  check("tie-break: gregory-nazianzen<nemesius (390); isidore-pelusium<peter-chrysologus (450)",
    tie.map((b) => b.father!.id).join(",") === "gregory-nazianzen,nemesius,isidore-pelusium,peter-chrysologus",
    tie.map((b) => b.father!.id).join(","));

  // 6. Continuations survive the sort (sort runs on GROUPED blocks, §4).
  const cont = sortChronological(groupCatena([
    { father: "Chrysostom", text: "A" },
    { father: "It goes on", text: "B" },           // folds into Chrysostom
    { father: "Augustine", text: "C" }
  ]));
  check("continuations survive the sort (block count + merged text intact)",
    cont.length === 2 && cont[0].father!.id === "chrysostom" && cont[0].text === "A\n\nB" &&
    cont[1].father!.id === "augustine");

  // 7. Lane separation (G5): Fathers (chronological) first, then gloss/source in
  //    source order; no gloss/source block appears among the Fathers.
  const lane = sortChronological(groupCatena([
    { father: "Gloss", text: "g" },
    { father: "Augustine", text: "a" },
    { father: "A Greek expositor", text: "s" },
    { father: "Origen", text: "o" }
  ]));
  const firstNonFather = lane.findIndex((b) => b.kind !== "father");
  check("lane separation: all Fathers precede every gloss/source block",
    lane.slice(0, firstNonFather).every((b) => b.kind === "father") &&
    lane.slice(firstNonFather).every((b) => b.kind !== "father"));
  check("lane separation: Fathers chronological, gloss/source keep source order",
    lane.map((b) => b.kind === "father" ? b.father!.id : b.kind).join(",") === "origen,augustine,gloss,source");

  // 8. Undated tail: a synthetic undated Father sorts AFTER every dated one (G4).
  const tail = sortChronological(groupCatena([
    { father: "Pseudo.", text: "x" },              // → pseudo-pseudo, undated
    { father: "Augustine", text: "a" }
  ]));
  check("undated Father sorts after dated ones (never front-loaded as 'earliest')",
    tail.map((b) => b.father!.id).join(",") === "augustine,pseudo-pseudo");

  // 9. Corpus guard: every kind:'father' id in the built Catena is dated, or is an
  //    explicitly-listed undatable id — so a new unmatched author can never silently
  //    sort to 0 (G4). Read straight from public/data (manifest-sealed, not edited).
  const cdir = join(ROOT, "public/data/commentary/catena");
  const undatedInCorpus = new Set<string>();
  for (const fn of readdirSync(cdir)) {
    if (!fn.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(join(cdir, fn), "utf8"));
    const bk: Record<string, { father?: string }[]> = isCatenaSpanDoc(doc) ? expandCatenaSpans(doc) : doc;
    for (const notes of Object.values(bk)) for (const n of notes) {
      const nf = normalizeFather(n.father ?? "");
      if (nf.kind === "father" && yearOf(nf.id!) === null) undatedInCorpus.add(nf.id!);
    }
  }
  // The only genuinely undatable label in the Gospel Catena is the nameless
  // "Pseudo." (→ pseudo-pseudo, 7 blocks); everything else must resolve to a year.
  const KNOWN_UNDATED = new Set(["pseudo-pseudo"]);
  const leaked2 = [...undatedInCorpus].filter((id) => !KNOWN_UNDATED.has(id));
  check("every Catena Father id in the corpus is dated (only the nameless 'Pseudo.' is undated)",
    leaked2.length === 0, leaked2.join(", "));
}

// §17 — reference parser (Search "jump to verse") and the canon/translation
// display helpers. Pure input-handling that ships to users with no other guard.
{
  const ref = (s: string) => {
    const r = parseReference(s);
    return r ? `${r.book.slug}/${r.chapter ?? "-"}/${r.verse ?? "-"}` : null;
  };
  check("parseReference: 'John 3:16' → john 3:16", ref("John 3:16") === "john/3/16");
  check("parseReference: '1 Cor 13' → 1-corinthians 13, no verse", ref("1 Cor 13") === "1-corinthians/13/-");
  check("parseReference: roman numeral 'II Timothy 2' → 2-timothy 2", ref("II Timothy 2") === "2-timothy/2/-");
  check("parseReference: 'ps 22' → psalms 22 (extra alias)", ref("ps 22") === "psalms/22/-");
  check("parseReference: '.' separator 'Mt 5.3' → matthew 5:3", ref("Mt 5.3") === "matthew/5/3");
  check("parseReference: ',' separator 'apoc 21,4' → revelation 21:4", ref("apoc 21,4") === "revelation/21/4");
  check("parseReference: the docstring's own 'Apocalypsis 21,4' resolves (Latin title)", ref("Apocalypsis 21,4") === "revelation/21/4");
  check("parseReference: over-range chapter clamps to the book's count ('Genesis 999' → 50)", ref("Genesis 999") === "genesis/50/-");
  check("parseReference: a non-book string → null", parseReference("zzz") === null);

  const rev = getBook("revelation")!;
  check("bookDisplayName: vulgate → Latin title", bookDisplayName(rev, "vulgate") === rev.latin);
  check("bookDisplayName: drc/cpdv → Douay name", bookDisplayName(rev, "drc") === rev.douay && bookDisplayName(rev, "cpdv") === rev.douay);
  check("bookDisplayName: other translations → common name", bookDisplayName(rev, "rsv2ce") === rev.name);
  check("bookIndex: genesis is first, an unknown slug is -1", bookIndex("genesis") === 0 && bookIndex("nope") === -1);

  check("getTranslation: bundled flag is honest (drc bundled, rsv2ce not)",
    getTranslation("drc")?.bundled === true && getTranslation("rsv2ce")?.bundled === false);
  check("getTranslation: unknown id → undefined; DEFAULT_TRANSLATION is drc",
    getTranslation("zzz") === undefined && DEFAULT_TRANSLATION === "drc");

  // The Biblia Platense (Straubinger): Spanish, IMPORT-ONLY — its U.S. term has
  // not clearly expired, so like the NABRE it is never bundled (standing rule).
  const { langAttr, languageLabel } = await import("../src/lib/translations");
  const stb = getTranslation("straubinger");
  check("straubinger: listed, Spanish, and NEVER bundled",
    stb?.language === "es" && stb?.bundled === false && !!stb?.copyright);
  check("langAttr: es for straubinger, la for vulgate, none for English",
    langAttr("straubinger") === "es" && langAttr("vulgate") === "la" &&
    langAttr("drc") === undefined && langAttr("nabre") === undefined);
  check("languageLabel covers all three languages",
    languageLabel(stb!) === "Español" && languageLabel(getTranslation("vulgate")!) === "Latin" &&
    languageLabel(getTranslation("drc")!) === "English");
}

// §18 — Search group filters (src/lib/search.ts). Pure book-group membership
// that ships to users behind the Search filter chips, with no other guard.
{
  const { inFilter, bookGroupKind } = await import("../src/lib/search");
  check("bookGroupKind: genesis is OT", bookGroupKind("genesis") === "ot", bookGroupKind("genesis"));
  check("bookGroupKind: romans is NT", bookGroupKind("romans") === "nt", bookGroupKind("romans"));
  check("bookGroupKind: a Gospel counts as NT", bookGroupKind("matthew") === "nt", bookGroupKind("matthew"));
  check(
    "inFilter: 'gospels' keeps John, drops Romans and Genesis",
    inFilter("john", "gospels") && !inFilter("romans", "gospels") && !inFilter("genesis", "gospels")
  );
  check("inFilter: 'all' keeps everything", inFilter("genesis", "all") && inFilter("revelation", "all"));
  check(
    "inFilter: ot/nt partition is clean",
    inFilter("genesis", "ot") &&
      !inFilter("genesis", "nt") &&
      inFilter("romans", "nt") &&
      !inFilter("romans", "ot")
  );
}

// §19 — the CCC citation index (src/lib/ccc.ts + public/data/ccc). FACTS ONLY:
// verse → CCC ¶ numbers, ¶ → vatican.va URL. The Catechism text is never bundled.
// Anchors pinned from the USCCB 2nd-Ed Index of Citations (verified against the PDF).
{
  const { cccKey, cccParagraphs, capParagraphs, isCited } = await import("../src/lib/ccc");
  const ci = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/index.json"), "utf8")) as Record<string, number[]>;
  const cu = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/url.json"), "utf8")) as Record<string, string>;
  const meta = JSON.parse(readFileSync(join(ROOT, "src/generated/bookMeta.json"), "utf8")) as Record<string, { verses: number[] }>;
  const man = JSON.parse(readFileSync(join(ROOT, "public/data/manifest.json"), "utf8")) as { files: Record<string, string> };
  const keys = Object.keys(ci);

  check("CCC index is substantial", keys.length > 3000, `${keys.length} verse keys`);

  let badVal = 0;
  for (const k of keys) {
    const a = ci[k];
    if (!Array.isArray(a) || a.length === 0) { badVal++; continue; }
    for (let i = 0; i < a.length; i++) {
      if (!Number.isInteger(a[i]) || a[i] < 1 || a[i] > 2865) badVal++;
      if (i > 0 && a[i] <= a[i - 1]) badVal++; // strictly increasing ⇒ sorted + deduped
    }
  }
  check("CCC index values are non-empty, sorted, deduped, ¶∈[1,2865]", badVal === 0, `${badVal} bad`);

  let dangling = 0;
  const danglers: string[] = [];
  for (const k of keys) {
    const m = k.match(/^(\S+) (\d+):(\d+)$/);
    if (!m) { dangling++; continue; }
    const vc = meta[m[1]]?.verses?.[+m[2] - 1];
    if (!vc || +m[3] < 1 || +m[3] > vc) { dangling++; if (danglers.length < 8) danglers.push(k); }
  }
  check("every CCC index key resolves to a real verse (no danglers)", dangling === 0, `${dangling}: ${danglers.join(", ")}`);

  // Psalm mapping: the CCC's Hebrew Ps 22:1 ("My God, my God", ¶603) → Vulgate 21:2.
  check("CCC Psalms are Vulgate-keyed (Heb 22:1 → psalms 21:2, ¶603)", (ci["psalms 21:2"] ?? []).includes(603), (ci["psalms 21:2"] ?? []).join(","));

  // famous anchors, verified against the PDF
  check("CCC anchor john 3:16 ⊇ {219,444,458}", [219, 444, 458].every((p) => (ci["john 3:16"] ?? []).includes(p)), (ci["john 3:16"] ?? []).join(","));
  check("CCC anchor genesis 1:1 ⊇ {268,279,290}", [268, 279, 290].every((p) => (ci["genesis 1:1"] ?? []).includes(p)), (ci["genesis 1:1"] ?? []).join(","));
  check("CCC anchor matthew 16:18 ⊇ {552,881}", [552, 881].every((p) => (ci["matthew 16:18"] ?? []).includes(p)), (ci["matthew 16:18"] ?? []).join(","));

  // url.json covers every ¶ used; all official vatican.va links
  const used = new Set<string>();
  for (const a of Object.values(ci)) for (const p of a) used.add(String(p));
  const missingUrl = [...used].filter((p) => !cu[p]);
  check("url.json covers every ¶ used in the index", missingUrl.length === 0, `${missingUrl.length} missing`);
  check("every CCC url is an https://www.vatican.va/ ENG0015 link", Object.values(cu).every((u) => typeof u === "string" && u.startsWith("https://www.vatican.va/archive/ENG0015/")));

  // ccc.ts pure helpers
  check("cccKey builds '<slug> ch:v'", cccKey("john", 3, 16) === "john 3:16");
  check("cccParagraphs reads the index", cccParagraphs(ci, "john", 3, 16).includes(444));
  // isCited drives the Reader's at-rest "cited in the Catechism" marker: true for
  // a cited verse (john 3:16), false for an uncited one (genesis 1:2 is not cited).
  check("isCited: john 3:16 is cited", isCited(ci, "john", 3, 16) === true);
  check("isCited: a non-existent coordinate is false", isCited(ci, "john", 999, 999) === false);
  const cap = capParagraphs([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  check("capParagraphs caps at 8 with a remainder", cap.shown.length === 8 && cap.more === 2);

  check("ccc/index.json + ccc/url.json are sealed in the manifest", !!man.files["ccc/index.json"] && !!man.files["ccc/url.json"]);
}

// §20 — jurisdiction, lectionary edition, and displayed Mass text are three
// independently persisted settings. A legacy "match region" value resolves
// once during migration so existing users keep the text they saw.
{
  const { getSettings: readSettings, massTranslationFor } = await import("../src/lib/storage");
  const base = { translation: "drc", calendarProfile: "roman.general", massTranslation: "" } as unknown as Parameters<typeof massTranslationFor>[0];
  check("massTranslationFor: jurisdiction cannot silently change displayed text",
    massTranslationFor({ ...base, calendarProfile: "roman.us.ascension-sunday", translation: "cpdv" }) === "cpdv" &&
      massTranslationFor({ ...base, calendarProfile: "roman.general", translation: "cpdv" }) === "cpdv");
  check("massTranslationFor: an explicit displayed-text choice wins",
    massTranslationFor({ ...base, calendarProfile: "roman.us.ascension-thursday", massTranslation: "drc" }) === "drc");
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let storedSettings: unknown = { calendarRegion: "universal", translation: "cpdv", massTranslation: "" };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === "fidelis:settings" ? JSON.stringify(storedSettings) : null,
      setItem: () => {},
      removeItem: () => {}
    }
  });
  try {
    const migrated = readSettings();
    check(
      "getSettings migrates legacy universal to roman.general without retaining two sources",
      migrated.calendarProfile === "roman.general" &&
        migrated.calendarCountryCode === "" &&
        migrated.massTranslation === "cpdv" &&
        migrated.lectionaryPackId === DEFAULT_LECTIONARY_PACK_ID &&
        !("calendarRegion" in migrated)
    );
    storedSettings = {
      calendarRegion: "usa",
      translation: "cpdv",
      massTranslation: "",
      calendarDiocese: "  Diocese of Example  "
    };
    const migratedUs = readSettings();
    check(
      "legacy U.S. match-region text resolves once while manual jurisdiction fields remain separate",
      migratedUs.calendarProfile === "roman.us.ascension-sunday" &&
        migratedUs.calendarCountryCode === "US" &&
        migratedUs.massTranslation === "nabre" &&
        migratedUs.calendarDiocese === "Diocese of Example"
    );
    storedSettings = {
      individualChurchProper: {
        churchTitle: "  St. Joseph  ",
        titleDate: { month: 3, day: 19 },
        titleColor: "violet",
        dedicationAnniversary: { month: 2, day: 31 },
        principalPatronTitle: "  St. Thomas Aquinas  ",
        principalPatronDate: { month: 1, day: 28 },
        principalPatronColor: "red",
        rank: "user-controlled"
      }
    };
    const sanitizedProper = readSettings().individualChurchProper;
    check(
      "individual-church proper storage strips rank injection and invalid dates",
      sanitizedProper.churchTitle === "St. Joseph" &&
        sanitizedProper.titleColor === "white" &&
        sanitizedProper.dedicationAnniversary === null &&
        sanitizedProper.principalPatronTitle === "St. Thomas Aquinas" &&
        sanitizedProper.principalPatronColor === "red" &&
        !("rank" in sanitizedProper)
    );
    storedSettings = null;
    check(
      "getSettings rejects a non-object settings payload without crashing",
      readSettings().calendarProfile === DEFAULT_CALENDAR_PROFILE_ID &&
        readSettings().lectionaryPackId === DEFAULT_LECTIONARY_PACK_ID
    );
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, "localStorage", previousStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
  check(
    "the supported lectionary catalog is explicit and not derived from a calendar profile",
    SUPPORTED_LECTIONARY_PACKS.length === 1 &&
      SUPPORTED_LECTIONARY_PACKS[0].id === DEFAULT_LECTIONARY_PACK_ID &&
      !SUPPORTED_CALENDAR_PROFILES.some((profile) => "lectionaryPackId" in profile)
  );
}

// §21 — navigation scroll authority + the overlay back-stack (nav/IA redesign).
{
  const {
    decideScroll,
    hasScrollTarget,
    rememberScrollOffset,
    scrollEntryKey,
    scrollRouteKey
  } = await import("../src/lib/scroll");
  // A target (?v=/#hash) owns its own scroll — checked first, so Back to a verse
  // glides to it instead of fighting a restore.
  check("decideScroll: a target → skip (any nav type)", decideScroll("PUSH", true) === "skip" && decideScroll("POP", true) === "skip" && decideScroll("REPLACE", true) === "skip");
  // REPLACE is an in-place update (day-stepper, search filter) → leave scroll be.
  check("decideScroll: REPLACE without a target → skip", decideScroll("REPLACE", false) === "skip");
  // POP (Back/Forward) restores the saved place; a genuine new PUSH goes to top.
  check("decideScroll: POP without a target → restore", decideScroll("POP", false) === "restore");
  check("decideScroll: PUSH without a target → top", decideScroll("PUSH", false) === "top");
  check("hasScrollTarget: ?v= verse is a target", hasScrollTarget("?v=16", "") === true);
  check("hasScrollTarget: #anchor is a target", hasScrollTarget("", "#rsv2ce") === true);
  check("hasScrollTarget: plain location is not", hasScrollTarget("?date=2026-06-17", "") === false && hasScrollTarget("", "") === false);
  check("scrollEntryKey: external HashRouter entries do not collide on 'default'",
    scrollEntryKey({ key: "default", pathname: "/about", search: "", hash: "" }) !==
      scrollEntryKey({ key: "default", pathname: "/widget/votd", search: "", hash: "" }) &&
      scrollEntryKey({ key: "abc", pathname: "/about", search: "", hash: "" }) === "entry:abc" &&
      scrollRouteKey({ pathname: "/about", search: "", hash: "" }) === "route:/about");
  const boundedOffsets = new Map<string, number>();
  for (let index = 0; index < 80; index++) {
    rememberScrollOffset(boundedOffsets, `entry:${index}`, index, 50);
    rememberScrollOffset(boundedOffsets, `route:/${index}`, index, 50);
  }
  check("scroll offsets remain bounded when each navigation stores entry and route keys",
    boundedOffsets.size === 50 &&
      boundedOffsets.get("entry:79") === 79 &&
      boundedOffsets.get("route:/79") === 79);

  const { pushOverlay, closeTopOverlay, dismissAllOverlays, isTopOverlay, overlayCount, removeOverlay } = await import("../src/lib/overlays");
  const closed: string[] = [];
  let aId = 0;
  let bId = 0;
  aId = pushOverlay(() => {
    closed.push("a");
    removeOverlay(aId); // model the component cleanup after its close callback
  });
  bId = pushOverlay(() => {
    closed.push("b");
    removeOverlay(bId);
  });
  check("overlay stack: count tracks opens", overlayCount() === 2);
  check("overlay stack: closeTop closes the newest first", closeTopOverlay() === true && closed.join() === "b");
  check("overlay stack: closeTop then closes the next", closeTopOverlay() === true && closed.join() === "b,a");
  check("overlay stack: closeTop on empty is a no-op", closeTopOverlay() === false && overlayCount() === 0);

  // An animating top overlay retains ownership of Back until React cleanup.
  // A rapid second press must be consumed without re-running the closer or
  // reaching the route/overlay underneath it.
  let underneathCalls = 0;
  const underneath = pushOverlay(() => { underneathCalls += 1; });
  let closingCalls = 0;
  const closing = pushOverlay(() => { closingCalls += 1; });
  check("overlay stack: first Back starts the top close", closeTopOverlay() === true && closingCalls === 1);
  check("overlay stack: rapid second Back is consumed during exit",
    closeTopOverlay() === true && closingCalls === 1 && underneathCalls === 0 && overlayCount() === 2);
  removeOverlay(closing);
  removeOverlay(underneath);

  let first = 0;
  let second = 0;
  first = pushOverlay(() => {
    closed.push("c");
    removeOverlay(first);
  });
  second = pushOverlay(() => {
    closed.push("d");
    removeOverlay(second);
  });
  check("overlay stack: only the newest overlay is top", !isTopOverlay(first) && isTopOverlay(second));
  check("overlay stack: dismissAll closes every overlay newest first",
    dismissAllOverlays() === 2 && closed.slice(-2).join() === "d,c" && overlayCount() === 0);
  removeOverlay(999); // removing an absent id is harmless
}

// §22 — the structured translation-import parsers (src/lib/import-formats.ts).
// Synthetic placeholder text only; the importer parses a user's own licensed file.
{
  const { resolveBookSlug, detectFormat, parseImport } = await import("../src/lib/import-formats");
  check("resolveBookSlug: USFM codes", resolveBookSlug("GEN") === "genesis" && resolveBookSlug("1CO") === "1-corinthians" && resolveBookSlug("REV") === "revelation");
  check("resolveBookSlug: OSIS ids", resolveBookSlug("Gen") === "genesis" && resolveBookSlug("1Cor") === "1-corinthians" && resolveBookSlug("Song") === "song-of-songs");
  check("resolveBookSlug: names + Douay", resolveBookSlug("Sirach") === "sirach" && resolveBookSlug("Apocalypse") === "revelation" && resolveBookSlug("1 Samuel") === "1-samuel");
  check("resolveBookSlug: unknown → undefined", resolveBookSlug("Nonsense") === undefined);

  check("detectFormat: by extension + sniff", detectFormat("x.usfm", "") === "usfm" && detectFormat("x.xml", "") === "osis" && detectFormat("x.json", "") === "json" && detectFormat("x.txt", "\\id GEN\n\\c 1") === "usfm");

  const usfm = "\\id GEN\n\\c 1\n\\v 1 alpha alpha\n\\v 2 beta\n\\c 2\n\\v 1 gamma\n";
  const u = parseImport("t.usfm", usfm);
  check("parseImport USFM: book + chapters + verses", u.length === 1 && resolveBookSlug(u[0].name) === "genesis" && u[0].chapters[0][0] === "alpha alpha" && u[0].chapters[0][1] === "beta" && u[0].chapters[1][0] === "gamma");

  const osis = '<osis><osisText><div type="book" osisID="John"><chapter osisID="John.1"><verse osisID="John.1.1">delta</verse><verse osisID="John.1.2">epsilon</verse></chapter></div></osisText></osis>';
  const o = parseImport("t.xml", osis);
  check("parseImport OSIS: verses by osisID", o.length === 1 && resolveBookSlug(o[0].name) === "john" && o[0].chapters[0][0] === "delta" && o[0].chapters[0][1] === "epsilon");

  const json = '{"books":[{"name":"Mark","chapters":[{"verses":[{"text":"zeta"},{"text":"eta"}]}]}]}';
  const j = parseImport("t.json", json);
  check("parseImport JSON (scrollmapper): verses", j.length === 1 && resolveBookSlug(j[0].name) === "mark" && j[0].chapters[0][0] === "zeta" && j[0].chapters[0][1] === "eta");

  // -- roman-numeral ordinals + traditional aliases (the SWORD/scrollmapper family) --
  check("resolveBookSlug: roman ordinals ('I Samuel', 'III John')",
    resolveBookSlug("I Samuel") === "1-samuel" && resolveBookSlug("II Maccabees") === "2-maccabees" &&
    resolveBookSlug("III John") === "3-john" && resolveBookSlug("I Corinthians") === "1-corinthians");
  check("resolveBookSlug: 'Song of Solomon' / 'Revelation of John' / 'Prayer of Manasses'",
    resolveBookSlug("Song of Solomon") === "song-of-songs" &&
    resolveBookSlug("Revelation of John") === "revelation" &&
    resolveBookSlug("Prayer of Manasses") === "prayer-of-manasseh");

  // -- textless-placeholder guard (an empty aliased book must never overwrite a real one) --
  const { importedBookHasText } = await import("../src/lib/import-formats");
  check("importedBookHasText: text → true, empty placeholder → false",
    importedBookHasText({ name: "Ezra", chapters: [["x"]] }) === true &&
    importedBookHasText({ name: "I Esdras", chapters: [["", ""], [""]] }) === false);
}

// §22b — the Straubinger (Biblia Platense) versification normalizer: the four
// verified Hebrew-numbered chapters move onto the Vulgate grid at import time
// (coordinate moves only — the text is never altered). Signatures make the
// remap idempotent and inert on any differently-shaped file.
console.log("");
{
  const { normalizeImport } = await import("../src/lib/import-formats");
  const fill = (n: number, tail = 0) =>
    [...Array.from({ length: n }, (_, i) => `v${i + 1}`), ...Array.from({ length: tail }, () => "")];

  // exodus 8: 28 filled + 4 empty → text moves to slots 5..32 (ES 8:1 = Vulg 8:5).
  const ex = { name: "Exodus", chapters: [...Array.from({ length: 7 }, () => ["x"]), fill(28, 4)] };
  const exN = normalizeImport("straubinger", [ex])[0];
  check("straubinger remap: Exodus 8 shifts +4 (ES 8:1 → Vulg 8:5; 8:1-4 empty)",
    exN.chapters[7][4] === "v1" && exN.chapters[7][31] === "v28" &&
    exN.chapters[7].slice(0, 4).every((v: string) => v === ""));

  // numbers 13: 33 + 1 → +1. psalms 10: 7 + 1 → +1.
  const nu = normalizeImport("straubinger", [{ name: "Numbers", chapters: [...Array.from({ length: 12 }, () => ["x"]), fill(33, 1)] }])[0];
  check("straubinger remap: Numbers 13 shifts +1", nu.chapters[12][1] === "v1" && nu.chapters[12][33] === "v33" && nu.chapters[12][0] === "");
  const ps = normalizeImport("straubinger", [{ name: "Psalms", chapters: [...Array.from({ length: 9 }, () => ["x"]), fill(7, 1)] }])[0];
  check("straubinger remap: Psalm 10 shifts +1", ps.chapters[9][1] === "v1" && ps.chapters[9][7] === "v7" && ps.chapters[9][0] === "");

  // mark: ES 9:1 fills the empty Vulg 8:39; ch9 shifts −1; 9:49 left empty.
  const mk = {
    name: "Mark",
    chapters: [...Array.from({ length: 7 }, () => ["x"]), fill(38, 1), fill(49)]
  };
  const mkN = normalizeImport("straubinger", [mk])[0];
  check("straubinger remap: Mark 8:39 receives ES 9:1; ch 9 shifts −1",
    mkN.chapters[7][38] === "v1" && mkN.chapters[8][0] === "v2" &&
    mkN.chapters[8][47] === "v49" && mkN.chapters[8][48] === "");

  // Idempotence + guards: a second pass is a no-op; a non-matching signature
  // (already-normalized or differently-prepared file) is untouched; other
  // translation ids pass through byte-identical.
  const again = normalizeImport("straubinger", [exN, nu, ps, mkN]);
  check("straubinger remap is idempotent (second pass is a no-op)",
    JSON.stringify(again.map((b) => b.chapters)) === JSON.stringify([exN, nu, ps, mkN].map((b) => b.chapters)));
  const other = { name: "Exodus", chapters: [...Array.from({ length: 7 }, () => ["x"]), fill(32)] };
  check("straubinger remap: a full (already-Vulgate) Exodus 8 is untouched",
    JSON.stringify(normalizeImport("straubinger", [other])[0].chapters) === JSON.stringify(other.chapters));
  check("normalizeImport: other translations pass through unchanged",
    JSON.stringify(normalizeImport("nabre", [ex])[0].chapters) === JSON.stringify(ex.chapters));
}

// §21 — the inline catechism (CCC P1): pure tier/edition logic (src/lib/catechism.ts),
// the bundled PD Trent corpus (public/data/trent/trent.json), and the trentEdition
// setting. The modern CCC text is NEVER bundled — only the PD Roman Catechism is.
console.log("");
{
  const { pickTier, pickEdition, isTrentEdition, DEFAULT_TRENT_EDITION, TRENT_EDITIONS } =
    await import("../src/lib/catechism");

  // pickTier precedence: imported+paras → imported; else trent → trent; else links.
  check("pickTier: imported copy with cited ¶ supersedes",
    pickTier({ imported: true, hasParas: true, trent: true }) === "imported");
  check("pickTier: imported but no cited ¶ falls to Trent",
    pickTier({ imported: true, hasParas: false, trent: true }) === "trent");
  check("pickTier: no import, Trent present → trent",
    pickTier({ imported: false, hasParas: true, trent: true }) === "trent");
  check("pickTier: nothing bundled/imported → links",
    pickTier({ imported: false, hasParas: true, trent: false }) === "links");

  // edition vocabulary — only the bundled McHugh-Callan ships today.
  check("TRENT_EDITIONS lists the bundled McHugh-Callan edition",
    TRENT_EDITIONS.map((e) => e.id).join(",") === "mchughCallan");
  check("default Trent edition is McHugh-Callan", DEFAULT_TRENT_EDITION === "mchughCallan");
  check("isTrentEdition guards the vocabulary",
    isTrentEdition("mchughCallan") && isTrentEdition("donovan") && !isTrentEdition("kjv") && !isTrentEdition(null));

  // pickEdition picks the preferred edition, else falls back to the default
  const fakeFile = {
    editions: {
      mchughCallan: { edition: "M", source: "s", license: "public-domain-US", parts: [] }
    }
  } as unknown as Awaited<ReturnType<typeof import("../src/lib/data").loadTrent>>;
  check("pickEdition returns the preferred edition", pickEdition(fakeFile!, "mchughCallan")?.edition === "M");
  check("pickEdition falls back to the default for an absent edition",
    pickEdition(fakeFile!, "donovan")?.edition === "M");

  // The bundled Trent corpus is shaped, complete, and sealed.
  const trent = JSON.parse(readFileSync(join(ROOT, "public/data/trent/trent.json"), "utf8")) as {
    editions: Record<string, { edition: string; license: string; parts: { id: string; title: string; sections: { id: string; title: string; html: string }[] }[] }>;
  };
  const EXPECT_PARTS = ["creed", "sacraments", "commandments", "lords-prayer"];
  for (const id of ["mchughCallan"]) {
    const ed = trent.editions[id];
    check(`Trent ${id} edition is present with a label`, !!ed && ed.edition.length > 0, ed?.edition ?? "missing");
    if (!ed) continue;
    check(`Trent ${id} has the four Parts in order`,
      ed.parts.map((p) => p.id).join(",") === EXPECT_PARTS.join(","), ed.parts.map((p) => p.id).join(","));
    const secIds = ed.parts.flatMap((p) => p.sections.map((s) => s.id));
    check(`Trent ${id} section ids are unique`, new Set(secIds).size === secIds.length, `${secIds.length} ids`);
    let bad = 0;
    for (const p of ed.parts) for (const s of p.sections) if (!s.title?.trim() || !s.html?.trim()) bad++;
    check(`Trent ${id} every section has a non-empty title + html`, bad === 0, `${bad} empty`);
    check(`Trent ${id} is public domain`, ed.license.startsWith("public-domain"), ed.license);
    check(`Trent ${id} ships no verse keys (browsable-by-section, design §4)`,
      ed.parts.every((p) => p.sections.every((s) => !/^\d+:\d+$/.test(s.id))));
    check(`Trent ${id} html is paragraphs-only structural markup (h4/p)`,
      ed.parts.every((p) => p.sections.every((s) => !/<(?!\/?(?:h4|p)\b)[a-z]/i.test(s.html))));
  }

  // Sealed in the manifest + the §5 index is byte-for-byte untouched.
  const tman = JSON.parse(readFileSync(join(ROOT, "public/data/manifest.json"), "utf8")) as { files: Record<string, string> };
  check("trent/trent.json is sealed in the manifest", !!tman.files["trent/trent.json"]);
  check("§5 index + url remain sealed (unchanged by P1)",
    !!tman.files["ccc/index.json"] && !!tman.files["ccc/url.json"]);

  // The Trent-edition setting defaults to McHugh-Callan and is a valid id.
  {
    const { getSettings } = await import("../src/lib/storage");
    const s = getSettings();
    check("getSettings() defaults trentEdition to mchughCallan", s.trentEdition === "mchughCallan", String(s.trentEdition));
    check("Settings.trentEdition is a valid edition id", isTrentEdition(s.trentEdition));
  }
}

// §21b — the inline catechism sheet + Reader integration (two-accent + no redirect).
{
  // Two-accent (§8.2): the sheet ACTS in purple and carries NO gold anywhere.
  const cccSheetSrc = readFileSync(join(ROOT, "src/components/CCCSheet.tsx"), "utf8");
  check("CCCSheet renders no gold honor (purple acts; credit is muted)",
    !/--gold/.test(cccSheetSrc) && !cccSheetSrc.includes("✠"));
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  check("the Trent TOC button acts in purple", /\.ccc-toc-sec\s*\{[^}]*var\(--purple\)/.test(css));
  check("the Trent credit + sub-headings are muted provenance, not gold",
    /\.ccc-toc-part-title\s*\{[^}]*var\(--text-muted\)/.test(css) && /\.ccc-credit\b/.test(css));

  // The Reader exposes the Catechism as a sheet action, not a forced redirect.
  const readerSrc = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");
  check("Reader opens CCCSheet (no inline ccc-row links)",
    readerSrc.includes("<CCCSheet") && !readerSrc.includes('className="ccc-row"'));
  check("Reader keeps the purple gutter mark + loadCCC", readerSrc.includes("ccc-mark") && readerSrc.includes("loadCCC"));
}

// §22 — the personal-CCC import path (CCC P2). Synthetic fixtures ONLY — never real
// Catechism text. The parser is pure; it normalizes three shapes, validates the
// 1–2865 integer key space (shared with url.json), and strips footnote apparatus.
console.log("");
{
  const { parseCccText } = await import("../src/lib/import-formats");
  const cu = JSON.parse(readFileSync(join(ROOT, "public/data/ccc/url.json"), "utf8")) as Record<string, string>;

  // (a) the header shape normalizes to { edition, language, paragraphs }
  const header = JSON.stringify({ format: "fidelis-ccc-1", edition: "Synthetic Ed.", language: "en", paragraphs: { "1": "alpha", "1817": "beta" } });
  const h = parseCccText("ccc.json", header);
  check("parseCccText: header shape → edition/language/paragraphs", h.edition === "Synthetic Ed." && h.language === "en" && h.paragraphs["1"] === "alpha" && h.paragraphs["1817"] === "beta");

  // (b) a bare flat map is accepted, edition defaulted
  const bare = parseCccText("ccc.json", JSON.stringify({ "1": "gamma" }));
  check("parseCccText: bare flat map accepted", bare.paragraphs["1"] === "gamma" && bare.language === "en" && bare.edition.length > 0);

  // (c) the { ccc: { … } } wrapper is accepted
  const wrapped = parseCccText("ccc.json", JSON.stringify({ ccc: { edition: "Wrapped", paragraphs: { "2865": "omega" } } }));
  check("parseCccText: { ccc: {…} } wrapper accepted", wrapped.paragraphs["2865"] === "omega" && wrapped.edition === "Wrapped");

  // (d) output is a pure function of input — the parser holds no embedded text
  const one = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "5": "only-this" } }));
  check("parseCccText: output keys/values come only from input (no injection)", Object.keys(one.paragraphs).join() === "5" && one.paragraphs["5"] === "only-this");

  // (e) footnote apparatus is stripped: superscript digit runs + [n] refs
  const dirty = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "1": "Hope is the virtue⁴⁵ by which we desire.[12]" } }));
  check("parseCccText: strips footnote superscripts + [n] refs", dirty.paragraphs["1"] === "Hope is the virtue by which we desire.");

  // (f) rejections — non-integer key, out-of-range, and a Bible-shaped file
  let threwAbc = false; try { parseCccText("x.json", JSON.stringify({ "abc": "x" })); } catch { threwAbc = true; }
  check("parseCccText: rejects a non-integer key", threwAbc);
  let threwRange = false; try { parseCccText("x.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "3000": "x" } })); } catch { threwRange = true; }
  check("parseCccText: rejects a ¶ outside [1,2865]", threwRange);
  let threwBible = false; try { parseCccText("x.json", JSON.stringify({ books: [{ name: "Mark", chapters: [] }] })); } catch { threwBible = true; }
  check("parseCccText: rejects a Bible-shaped JSON", threwBible);

  // (g) the key space is url.json's: 219/444 are cited by john 3:16, so present in url.json
  const ks = parseCccText("ccc.json", JSON.stringify({ format: "fidelis-ccc-1", paragraphs: { "219": "x", "444": "y" } }));
  check("parseCccText: keys share url.json's string-integer key space", Object.keys(ks.paragraphs).every((k) => /^\d+$/.test(k) && k in cu));

  // (h) the St. Charles Borromeo (scborromeo.org) export shape — page_nodes keyed by
  // TOC section, each ¶ opened by a `ref-ccc` marker — is recognized and converted
  // in-app (the owner imports it on iOS; no desktop converter runs). Synthetic fixture.
  const scb = JSON.stringify({
    meta: { version: "0.0.2", attribution: ["Libreria Editrice Vaticana", "St. Charles Borromeo Catholic Church"] },
    toc_link_tree: [],
    toc_nodes: { "h1": { text: "The Profession of Faith" } }, // a real TOC title, matched to drop its inline copy
    ccc_refs: { bible: {}, other: {} },
    page_nodes: {
      "toc-2": { id: "toc-2", paragraphs: [
        { elements: [{ type: "ref-ccc", ref_number: 1817 }, { type: "text", text: "Hope is the virtue", attrs: { i: true } }], attrs: {} },
        // a between-paragraph heading (heavy_header, no ref-ccc) must NOT glue onto ¶1817
        { elements: [{ type: "text", text: "Our Father who art in heaven", attrs: { heavy_header: true } }], attrs: {} },
        { elements: [{ type: "ref-ccc", ref_number: 2865 }, { type: "text", text: "omega", attrs: {} }], attrs: {} }
      ] },
      // page_nodes order is not numeric; the converter must order by ¶, not key order
      "toc-1": { id: "toc-1", paragraphs: [
        { elements: [{ type: "text", text: "PROLOGUE", attrs: { b: true, heavy_header: true } }], attrs: {} },
        // a ¶ that spans TWO source paragraphs (a continuation, no new ref-ccc) — the
        // bodies must be joined WITH a space, not run together ("…faith!"The Church)
        { elements: [{ type: "ref-ccc", ref_number: 1 }, { type: "text", text: "God, infinitely perfect.", attrs: {} }, { type: "ref", number: 7 }], attrs: {} },
        { elements: [{ type: "text", text: "He calls man to seek him.", attrs: {} }], attrs: {} },
        // inline scripture citation = ref-anchor + its trailing text; both kept, the footnote `ref` dropped
        { elements: [{ type: "ref-ccc", ref_number: 2 }, { type: "text", text: "alpha ", attrs: {} }, { type: "ref-anchor", link: "x", attrs: {} }, { type: "text", text: "beta.", attrs: {} }], attrs: {} }
      ], footnotes: {} },
      // heading handling — drop ONLY unambiguous structural titles; never guess at a
      // mixed-case line (a wrong guess deletes real prose split across paragraphs).
      "toc-3": { id: "toc-3", paragraphs: [
        { elements: [{ type: "ref-ccc", ref_number: 100 }, { type: "text", text: "The first sentence." }], attrs: {} },
        // an ALL-CAPS / roman-numeral section title before the next ¶ → dropped, not glued onto ¶100
        { elements: [{ type: "text", text: "II. THE STAGES OF REVELATION" }], attrs: {} },
        { elements: [{ type: "ref-ccc", ref_number: 101 }, { type: "text", text: "Body of one hundred one." }], attrs: {} },
        // a mid-sentence prose fragment (split for layout) — must be KEPT, never dropped
        { elements: [{ type: "text", text: "and the sentence continues here" }], attrs: {} },
        { elements: [{ type: "ref-ccc", ref_number: 102 }, { type: "text", text: "Body of one oh two." }], attrs: {} },
        // a mixed-case title that IS in the TOC → dropped by the toc-match path
        { elements: [{ type: "text", text: "The Profession of Faith" }], attrs: {} },
        // finding [5]: a heading sharing the elements array BEFORE a ref-ccc must not glue
        { elements: [{ type: "text", text: "ARTICLE 4", attrs: { heavy_header: true } }, { type: "ref-ccc", ref_number: 103 }, { type: "text", text: "Body of one oh three." }], attrs: {} }
      ] }
    }
  });
  const sc = parseCccText("ccc.json", scb);
  check("parseCccText: Borromeo page_nodes export → every ref-ccc ¶ extracted",
    Object.keys(sc.paragraphs).length === 8 && sc.paragraphs["1817"] === "Hope is the virtue" && sc.paragraphs["2865"] === "omega");
  check("parseCccText: Borromeo multi-paragraph ¶ joined with a space (no run-on)",
    sc.paragraphs["1"] === "God, infinitely perfect. He calls man to seek him.");
  check("parseCccText: Borromeo inline ref-anchor text kept, footnote `ref` dropped", sc.paragraphs["2"] === "alpha beta.");
  check("parseCccText: Borromeo heavy_header heading does not glue onto the previous ¶", sc.paragraphs["1817"] === "Hope is the virtue" && !/Our Father/.test(sc.paragraphs["1817"]));
  check("parseCccText: Borromeo structural (all-caps/roman) heading dropped, not glued",
    sc.paragraphs["100"] === "The first sentence.");
  check("parseCccText: Borromeo mid-sentence prose fragment KEPT (no false heading drop)",
    sc.paragraphs["101"] === "Body of one hundred one. and the sentence continues here");
  check("parseCccText: Borromeo TOC-matched heading dropped, not glued",
    sc.paragraphs["102"] === "Body of one oh two.");
  check("parseCccText: Borromeo heading before a ref-ccc in the same paragraph not glued",
    sc.paragraphs["103"] === "Body of one oh three.");

  // CCC-text storage (data.ts). IndexedDB cannot run under tsx, so these guard the
  // upgrade discipline by SOURCE: DB v3 (v2 added the ccc store; v1.18.0's v3 the
  // meta store), each store created WITHOUT dropping the others, and loadCCCText's
  // memo invalidated on write.
  const ds = readFileSync(join(ROOT, "src/lib/data.ts"), "utf8");
  check("data.ts bumps DB_VERSION to 3", /DB_VERSION\s*=\s*3\b/.test(ds));
  check("data.ts creates the meta store (the active-version markers)",
    /createObjectStore\(\s*META_STORE\s*\)/.test(ds));
  check("data.ts creates the ccc object store", /createObjectStore\(\s*CCC_STORE\s*\)/.test(ds));
  check("data.ts still creates the books store (upgrade preserves imports)", /createObjectStore\(\s*STORE\s*\)/.test(ds));
  check("data.ts exports loadCCCText + idbPutCcc/idbGetCcc/idbClearCcc",
    /export function loadCCCText/.test(ds) && /export async function idbPutCcc/.test(ds) && /export async function idbGetCcc/.test(ds) && /export async function idbClearCcc/.test(ds));
  check("loadCCCText invalidates its memo on import/remove", (ds.match(/cccTextPromise\s*=\s*null/g) || []).length >= 2);

  // The CCCSheet Tier-1 supersede wiring + two-accent (purple acts, no gold).
  const sheet = readFileSync(join(ROOT, "src/components/CCCSheet.tsx"), "utf8");
  check("CCCSheet wires loadCCCText (Tier-1 supersede)", /loadCCCText/.test(sheet));
  check("CCCSheet renders the imported ¶ text branch", /tier === "imported"/.test(sheet) && /ccc-para-num/.test(sheet));
  const cssP2 = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  check("CCC imported ¶ number acts in purple (two-accent)", /\.ccc-para-num\s*\{[^}]*var\(--purple\)/.test(cssP2));
  check("CCC imported block carries no gold honor mark",
    !/\.ccc-para[^{]*\{[^}]*var\(--gold\)/.test(cssP2) && !/\.ccc-credit\s*\{[^}]*var\(--gold\)/.test(cssP2));

  // The Settings Magisterium import slot exists and stores on-device only.
  const setSrc = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  check("Settings imports the modern Catechism on-device (parse → idbPutCcc)",
    setSrc.includes("parseCccText") && setSrc.includes("idbPutCcc") && setSrc.includes("Import the modern Catechism"));
}

// §23 — Mass lectionary citations use MODERN book names regardless of the reading
// translation. The Roman lectionary is published in modern form ("2 Kings 4:8-11"),
// so the Douay name the bundled DRB carries ("4 Kings") must not surface on the Mass
// card or the Readings page even when the text shown is Douay.
console.log("");
{
  const shunammite: LectionaryRow = { t: 1, b: "2-kings", s: [[4, 8, 11], [4, 14, 16]] };
  const book = getBook("2-kings")!;
  check("formatLectionaryCitation: modern name (13th Sun OT-A first reading)",
    formatLectionaryCitation(shunammite, book) === "2 Kings 4:8-11,14-16");
  check("formatLectionaryCitation: never the Douay '4 Kings'",
    !formatLectionaryCitation(shunammite, book).includes("4 Kings"));
  // it must agree with formatCitation when handed the modern name explicitly
  check("formatLectionaryCitation: == formatCitation(row, book.name)",
    formatLectionaryCitation(shunammite, book) === formatCitation(shunammite, book.name));
  // the Mass surfaces are wired to it (so the selected Bible's naming no longer leaks in)
  const homeSrc = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  check("Home Mass list cites via formatLectionaryCitation (not bookDisplayName)",
    homeSrc.includes("formatLectionaryCitation"));
  const rtSrc = readFileSync(join(ROOT, "src/components/ReadingText.tsx"), "utf8");
  check("ReadingText cites via formatLectionaryCitation (modern names)",
    rtSrc.includes("formatLectionaryCitation"));
  // the native widget pipeline is the third Mass-citation surface — it must use the
  // modern name too, or the home-screen "Today at Mass" widget would contradict the app.
  const calBuilder = readFileSync(join(ROOT, "scripts/build-calendar-widget.ts"), "utf8");
  check("widget builder cites via formatLectionaryCitation (not bookDisplayName/translation)",
    calBuilder.includes("formatLectionaryCitation") && !calBuilder.includes("bookDisplayName"));
  check("widget builder emits every supported profile with schema/expiry metadata",
    calBuilder.includes("SUPPORTED_CALENDAR_PROFILES") &&
      calBuilder.includes("schemaVersion") &&
      calBuilder.includes("expiresAt") &&
      calBuilder.includes("profile.fingerprint"));
  check("widget builder has a strict no-write byte-verification mode",
    calBuilder.includes('process.argv.includes("--verify")') &&
      calBuilder.includes("calendar widget snapshot is stale"));
  check("widget builder emits its expiry boundary in canonical UTC",
    calBuilder.includes("new Date(Date.UTC(buildYear + 6, 0, 1)).toISOString()") &&
      !calBuilder.includes("new Date(buildYear + 6, 0, 1).toISOString()"));
  // and the committed, generated widget data must carry no Douay-only book names
  for (const rel of ["ios/WidgetExtension/calendar.json", "android/app/src/main/res/raw/calendar.json"]) {
    const cal = readFileSync(join(ROOT, rel), "utf8");
    check(`${rel} carries modern lectionary book names (no Douay-only)`,
      !/\b[34] Kings\b/.test(cal) && !/Paralipomenon/.test(cal) && !/Canticle of Canticles/.test(cal));
  }
}

// §24 — the in-app SaveImage Capacitor plugin must be REGISTERED with the bridge.
// Capacitor only auto-registers plugins listed in capacitor.config.json's
// packageClassList (derived from npm plugin packages); a loose class in the App
// target is never registered, so registerPlugin("SaveImage") silently falls back to
// a no-op and the share card's "Save image" can never even request Photos access
// (the app never appears under Settings → Privacy → Photos). The fix is a
// CAPBridgeViewController subclass that registers it in capacitorDidLoad(). These
// guards lock that wiring in so the Save-to-Photos path can never regress.
console.log("");
{
  const storyboard = readFileSync(join(ROOT, "ios/App/App/Base.lproj/Main.storyboard"), "utf8");
  check("Main.storyboard root VC is the MainViewController subclass (not bare CAPBridgeViewController)",
    /customClass="MainViewController"/.test(storyboard));
  const mvc = readFileSync(join(ROOT, "ios/App/App/MainViewController.swift"), "utf8");
  check("MainViewController subclasses CAPBridgeViewController",
    /class\s+MainViewController\s*:\s*CAPBridgeViewController/.test(mvc));
  check("MainViewController registers SaveImagePlugin in capacitorDidLoad()",
    /capacitorDidLoad/.test(mvc) &&
      /makeFidelisPlugins\(\)[\s\S]*SaveImagePlugin\(\)/.test(mvc) &&
      /makeFidelisPlugins\(\)\.forEach[\s\S]*registerPluginInstance\(plugin\)/.test(mvc));
  check("MainViewController bridges an explicit iOS edge-back gesture into HashRouter history",
    mvc.includes("UIScreenEdgePanGestureRecognizer") &&
      mvc.includes("fidelis-native-edge-back") &&
      mvc.includes("allowsBackForwardNavigationGestures = false") &&
      mvc.includes("evaluateJavaScript"));
  // the subclass must be compiled into the App target (reproducibly, via the script)
  const cfg = readFileSync(join(ROOT, "scripts/configure-ios-app-target.rb"), "utf8");
  check("configure-ios-app-target.rb wires MainViewController.swift into App sources",
    cfg.includes("MainViewController.swift"));
  // and the permission that makes the save actually grantable must be present
  const plist = readFileSync(join(ROOT, "ios/App/App/Info.plist"), "utf8");
  check("Info.plist declares NSPhotoLibraryAddUsageDescription (add-only Photos permission)",
    plist.includes("NSPhotoLibraryAddUsageDescription"));
  const plugin = readFileSync(join(ROOT, "ios/App/App/SaveImagePlugin.swift"), "utf8");
  check("SaveImagePlugin writes via UIImageWriteToSavedPhotosAlbum (triggers the add-only prompt)",
    plugin.includes("UIImageWriteToSavedPhotosAlbum"));
}

// §25 — source-shape guards for UI fixes (v1.14.2 a–c, v1.15.1 d). None of these
// has a runtime surface the harness can drive, so each pins the load-bearing token
// of the fix in the source; a silent revert goes red here.
console.log("");
{
  // (a) Sheet pins the body in a LAYOUT effect — "useLayoutEffect(() => {" — so
  // its cleanup (unlockScroll) runs in React's mutation phase, BEFORE
  // ScrollManager positions the new page. Reverting to a passive useEffect would
  // scroll the destination page to the departed page's offset.
  const sheetSrc = readFileSync(join(ROOT, "src/components/Sheet.tsx"), "utf8");
  check("Sheet locks scroll in a layout effect (useLayoutEffect)",
    sheetSrc.includes("useLayoutEffect(() =>"));
  // …and its focus-trap selector excludes disabled controls — the file reads
  // 'button:not([disabled]), [href], input:not([disabled]), …'. A disabled
  // first/last element can never hold focus, so Tab would escape the sheet.
  check("Sheet focus trap excludes disabled controls (:not([disabled]))",
    sheetSrc.includes("button:not([disabled])") && sheetSrc.includes("input:not([disabled])"));

  // (b) ScrollManager must not record offsets while a sheet pins the body:
  // window.scrollY reads 0 under the lock, so Back would restore to top. The
  // recorder path reads "if (isScrollLocked()) return;" before the map write.
  const smSrc = readFileSync(join(ROOT, "src/components/ScrollManager.tsx"), "utf8");
  check("ScrollManager imports isScrollLocked from lib/scrollLock",
    /import\s*\{[^}]*\bisScrollLocked\b[^}]*\}\s*from\s*"\.\.\/lib\/scrollLock"/.test(smSrc));
  check("ScrollManager recorder ignores pinned-body scrolls",
    smSrc.includes("if (isScrollLocked()) return;"));

  // (b2) resetScrollLock self-heals a STRANDED lock (v1.20.1): an iOS WKWebView can
  // tear a sheet down without running its cleanup (a native share/permission dialog
  // or a background/foreground mid-teardown), leaving `position: fixed` pinned and
  // the whole app seemingly unable to navigate until a restart. A real logic test:
  // simulate the leak (two locks, one unlock), then heal.
  {
    const savedDoc = (globalThis as { document?: unknown }).document;
    const savedWin = (globalThis as { window?: unknown }).window;
    (globalThis as { document?: unknown }).document = { body: { style: {} as Record<string, string> } };
    (globalThis as { window?: unknown }).window = { scrollY: 7, scrollTo: () => {} };
    const sl = await import("../src/lib/scrollLock");
    sl.lockScroll();
    sl.lockScroll();
    sl.unlockScroll();
    const leaked = sl.isScrollLocked();
    sl.resetScrollLock();
    check("resetScrollLock releases a stranded body lock (v1.20.1)",
      leaked === true && sl.isScrollLocked() === false);
    sl.resetScrollLock();
    check("resetScrollLock is idempotent (a second call is a no-op)",
      sl.isScrollLocked() === false);
    (globalThis as { document?: unknown }).document = savedDoc;
    (globalThis as { window?: unknown }).window = savedWin;
  }
  // (b3) App wires the self-heal (wired in v1.20.1; widened below): on every
  // route change it releases a pinned body when NO sheet is actually mounted
  // (the .sheet-backdrop DOM check keeps it from ever unlocking a legitimately
  // open sheet). The route-change heal skips scroll restoration — ScrollManager
  // already positioned the new page, so restoring the departed page's stale
  // offset would yank it.
  const appSrc2 = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  check("App self-heals a stranded scroll lock on route change (v1.20.1)",
    /import\s*\{[^}]*\bhealStrandedScrollLock\b[^}]*\}\s*from\s*"\.\/lib\/scrollLock"/.test(appSrc2) &&
      appSrc2.includes("healStrandedScrollLock({ restoreScroll: false })"));
  // …and the heal fires on MORE than route changes: every pointerdown (the next
  // touch anywhere unpins, even a same-tab tap that changes no route) and the
  // native foreground-resume signal (appStateChange — WKWebView's
  // visibilitychange is not guaranteed across every resume path).
  check("App heals on every pointerdown and on native foreground resume",
    appSrc2.includes('"pointerdown"') && appSrc2.includes('"appStateChange"'));

  // (b4) resetScrollLock must clear a pin even when the COUNTER says nothing is
  // locked: an interrupted teardown can strand `position: fixed` with the count
  // already back at 0 (or a foreign inline pin the module never counted), a
  // state the count-only early-return could never heal — the field report's
  // "only a force-quit fixes it". The body itself is the ground truth.
  {
    const savedDoc = (globalThis as { document?: unknown }).document;
    const savedWin = (globalThis as { window?: unknown }).window;
    const body = { style: { overflow: "hidden", position: "fixed", top: "-123px", width: "100%" } as Record<string, string> };
    (globalThis as { document?: unknown }).document = { body };
    (globalThis as { window?: unknown }).window = { scrollY: 0, scrollTo: () => {} };
    const sl = await import("../src/lib/scrollLock");
    sl.resetScrollLock();
    check("resetScrollLock clears a count-0 stranded pin (body is ground truth)",
      body.style.position === "" && body.style.top === "" && !sl.isScrollLocked());
    (globalThis as { document?: unknown }).document = savedDoc;
    (globalThis as { window?: unknown }).window = savedWin;
  }

  // (b5) the route-change heal must NOT restore the departed page's stale
  // scroll offset (ScrollManager already placed the new page); the default
  // sheet-close path still restores it.
  {
    const savedDoc = (globalThis as { document?: unknown }).document;
    const savedWin = (globalThis as { window?: unknown }).window;
    const body = { style: {} as Record<string, string> };
    let scrollCalls = 0;
    (globalThis as { document?: unknown }).document = { body };
    (globalThis as { window?: unknown }).window = { scrollY: 7, scrollTo: () => { scrollCalls += 1; } };
    const sl = await import("../src/lib/scrollLock");
    sl.lockScroll();
    sl.resetScrollLock({ restoreScroll: false });
    check("resetScrollLock({ restoreScroll: false }) unpins without touching scroll",
      !sl.isScrollLocked() && !body.style.position && scrollCalls === 0);
    sl.lockScroll();
    sl.resetScrollLock();
    check("resetScrollLock() restores scroll by default (the sheet-close path)",
      scrollCalls === 1);
    (globalThis as { document?: unknown }).document = savedDoc;
    (globalThis as { window?: unknown }).window = savedWin;
  }

  // (b6) healStrandedScrollLock is the one predicate every heal trigger shares:
  // it unpins a stranded body, NEVER unlocks a legitimately-open sheet, and
  // heals the count-0 pin as well.
  {
    const savedDoc = (globalThis as { document?: unknown }).document;
    const savedWin = (globalThis as { window?: unknown }).window;
    const body = { style: {} as Record<string, string> };
    let backdrop: unknown = null;
    (globalThis as { document?: unknown }).document = {
      body,
      querySelector: (sel: string) => (sel === ".sheet-backdrop" ? backdrop : null)
    };
    (globalThis as { window?: unknown }).window = { scrollY: 3, scrollTo: () => {} };
    const sl = await import("../src/lib/scrollLock");
    const ov = await import("../src/lib/overlays");
    const heal = sl.healStrandedScrollLock as (() => boolean) | undefined;
    sl.lockScroll();
    check("heal releases a stranded lock when no sheet is mounted",
      typeof heal === "function" && heal() === true && !sl.isScrollLocked() && !body.style.position);
    sl.lockScroll();
    backdrop = {};
    const liveOverlay = ov.pushOverlay(() => {}); // a legitimately-open sheet registers one
    check("heal NEVER unlocks a legitimately-open sheet",
      typeof heal === "function" && heal() === false && sl.isScrollLocked() && body.style.position === "fixed");
    ov.removeOverlay(liveOverlay);
    backdrop = null;
    sl.resetScrollLock();
    body.style.position = "fixed"; // a pin the counter never saw
    check("heal clears a count-0 stranded pin",
      typeof heal === "function" && heal() === true && body.style.position === "");
    // The post-widget-entry freeze class: a backdrop left behind with NO
    // overlay registered (an interrupted teardown) defeated the old guard
    // forever — pinned body + zombie backdrop = navigations clipped out of
    // view until force-quit. The heal must remove the zombie and unpin.
    sl.lockScroll();
    let zombieRemoved = false;
    backdrop = { remove: () => { zombieRemoved = true; } };
    check("heal removes a zombie backdrop (no overlay registered) and unpins",
      typeof heal === "function" && heal() === true && zombieRemoved &&
        !sl.isScrollLocked() && body.style.position === "");
    (globalThis as { document?: unknown }).document = savedDoc;
    (globalThis as { window?: unknown }).window = savedWin;
  }

  // (c) the sticky Reader toolbar sits UNDER the notch-safe header —
  // ".reader-toolbar { … top: var(--header-h); … }" — a raw `top: 0` would
  // slide it beneath the fixed header on iOS (the notch safe-area inset).
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  check("Reader toolbar sticks below the header (top: var(--header-h))",
    /\.reader-toolbar\s*\{[^}]*top:\s*var\(--header-h\)/.test(css));

  // (d) v1.15.1: VerseQuote (the Today VOTD card, the rosary passage) falls back
  // to the bundled Douay-Rheims when the selected reader translation is
  // import-only and absent on-device — 'loadBook("drc", book)' in the catch —
  // instead of leaving a bare em-dash on the front page. And the lang attribute
  // must describe the text actually shown ("langAttr(shownTranslation)"), not
  // the requested translation, or a fallen-back Spanish card reads lang="es".
  const vqSrc = readFileSync(join(ROOT, "src/components/VerseQuote.tsx"), "utf8");
  check("VerseQuote falls back to the bundled Douay-Rheims on load failure",
    vqSrc.includes('loadBook("drc", book)'));
  check("VerseQuote lang attribute follows the translation actually shown",
    vqSrc.includes("langAttr(shownTranslation)"));
}

// ── 26. v1.16.0 "upon the candlestick" — the collapsing masthead (design spec
//        docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md §3, §8).
//        Source-shape guards in the §25 manner: none of these has a runtime
//        surface the harness can drive, so each pins the load-bearing token of
//        the layout; a silent revert to the bottom bar goes red here.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const tab = readFileSync(join(ROOT, "src/components/TabBar.tsx"), "utf8");
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");

  // A sticky row cannot grow env() padding only-when-pinned, so a FIXED strip
  // paints the notch area at all times (spec §3) — and App mounts it decoratively.
  check("masthead: the status strip paints the notch (height: env(safe-area-inset-top))",
    /\.status-strip\s*\{[^}]*height:\s*env\(safe-area-inset-top\)/.test(css));
  check("masthead: App mounts the strip aria-hidden",
    /className="status-strip"\s+aria-hidden="true"/.test(app));

  // The bottom bar and everything that existed to clear it are gone (spec §3).
  check("masthead: the bottom tab bar is gone (no .tabbar position: fixed)",
    !/\.tabbar\s*\{[^}]*position:\s*fixed/.test(css));
  check("masthead: the fixed-bar clearances are gone (no 3.25rem footer / 3.75rem verse-actions lift)",
    !css.includes("3.25rem") && !css.includes("3.75rem"));
  check("masthead: the header no longer escalates over the verse-actions bar (no z-index: 45)",
    !css.includes("z-index: 45"));

  // The More dropdown still closes under Android Back / Escape (spec §6).
  check("masthead: the More menu still registers with the overlay-back stack",
    tab.includes("pushOverlay("));

  // Everything sticky hangs off --header-h; on phones it must equal the pinned
  // tab row (44px links = 2.75rem) plus the notch inset (spec §3).
  check("masthead: --header-h re-derives to the pinned tab row on phones",
    css.includes("--header-h: calc(2.75rem + env(safe-area-inset-top))"));
}

// ── 27. v1.16.0 — the Reader folio line (spec §4): Book Ch ▾ · translation ▾ · Aa.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const reader = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");

  // The compound control names itself to screen readers (spec §7).
  check("folio: the book+chapter control is labelled 'choose book and chapter'",
    reader.includes("choose book and chapter"));
  // The type menu gathers the set-and-forget controls under one spoken name.
  check("folio: the type menu opens as 'Text options'",
    reader.includes("Text options"));
  // The picker sheet reaches every book, so the crumb could retire.
  check("folio: the picker sheet lists the books (picker-book buttons)",
    reader.includes("picker-book"));
  check("folio: the '← All books' crumb is retired",
    !reader.includes("reader-crumb") && !css.includes(".reader-crumb"));
}

// ── 28. v1.16.0 — one-row Mass controls (spec §5): ‹ · date ▾ · › [Today] … NABRE ▾.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const readings = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");

  check("mass: the day-steppers carry spoken names (Previous/Next day)",
    readings.includes('aria-label="Previous day"') && readings.includes('aria-label="Next day"'));
  // The visible date text is a facade; the REAL control is a transparent native
  // date input stretched over it, labelled for assistive tech (spec §5/§7).
  check("mass: the date facade fronts a native input labelled 'Choose date'",
    readings.includes('aria-label="Choose date"') &&
      /\.date-pick-input\s*\{[^}]*opacity:\s*0/.test(css));
  check("mass: the Today chip appears only when the shown date is off-today",
    readings.includes("!isToday &&"));
  check("mass: the controls hold one row (.readings-toolbar flex-wrap: nowrap)",
    /\.readings-toolbar\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
}

// ── 29. v1.16.2 "a just weight" — the Search group collector (audit FID-FUNC-001).
// Real logic tests: counts are EXACT over every match, lists are bounded per
// group, and — the load-bearing case — a section's list keeps filling after
// the "All" list is full, so New Testament can never read 0 just because the
// Old Testament filled the display cap first.
console.log("");
{
  const { groupsOf, emptyGroupedHits, addHit, snapshotGroupedHits } = await import(
    "../src/lib/search"
  );

  check("groupsOf: genesis → all+ot", groupsOf("genesis").join(",") === "all,ot");
  check("groupsOf: matthew → all+nt+gospels", groupsOf("matthew").join(",") === "all,nt,gospels");
  check("groupsOf: romans → all+nt", groupsOf("romans").join(",") === "all,nt");

  const acc = emptyGroupedHits();
  const hit = (book: string, n: number) => ({ book, chapter: 1, verse: n, text: `v${n}` });
  const CAP = 2;
  const g1 = hit("genesis", 1);
  const m1 = hit("matthew", 2);
  const r1 = hit("romans", 3);
  addHit(acc, g1, CAP);
  addHit(acc, m1, CAP);
  addHit(acc, r1, CAP); // arrives AFTER "all" hit its cap
  check(
    "collector: exact counts across groups (all 3 / ot 1 / nt 2 / gospels 1)",
    acc.counts.all === 3 && acc.counts.ot === 1 && acc.counts.nt === 2 && acc.counts.gospels === 1
  );
  check(
    "collector: a section list keeps filling after 'all' is full (romans in nt)",
    acc.lists.all.length === CAP && acc.lists.nt.length === 2 && acc.lists.nt[1] === r1
  );
  addHit(acc, hit("genesis", 4), CAP);
  addHit(acc, hit("genesis", 5), CAP);
  check(
    "collector: counts keep tallying past the cap; lists stay bounded",
    acc.counts.all === 5 &&
      acc.counts.ot === 3 &&
      acc.lists.all.length === CAP &&
      acc.lists.ot.length === CAP
  );
  check(
    "collector: canon order preserved; hit objects shared across lists",
    acc.lists.all[0] === g1 && acc.lists.gospels[0] === acc.lists.all[1]
  );
  const snap = snapshotGroupedHits(acc);
  check(
    "collector: snapshot has fresh references but the same hits (React streaming)",
    snap !== acc &&
      snap.lists !== acc.lists &&
      snap.lists.nt !== acc.lists.nt &&
      snap.lists.nt[0] === acc.lists.nt[0] &&
      snap.counts.all === acc.counts.all
  );
}

// ── 30. v1.16.2 "a just weight" — source-shape guards for the correctness batch
// (audit FID-FUNC-001/002/003/004/007): the fixes below are UI wiring the pure
// harnesses can't reach, so pin their shape in the source.
console.log("");
{
  const search = readFileSync(join(ROOT, "src/pages/Search.tsx"), "utf8");
  const reader = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");
  const library = readFileSync(join(ROOT, "src/pages/Library.tsx"), "utf8");
  const verseQuote = readFileSync(join(ROOT, "src/components/VerseQuote.tsx"), "utf8");
  const home = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  const mystery = readFileSync(join(ROOT, "src/components/MysterySheet.tsx"), "utf8");
  const planCreator = readFileSync(join(ROOT, "src/pages/PlanCreator.tsx"), "utf8");

  // FID-FUNC-001: the scan never breaks early, chips read the exact tallies,
  // and a failed sweep never presents its partial counts as truth.
  check("search: the book scan has no early break (counts need the full sweep)",
    !/\bbreak\b/.test(search) && search.includes("addHit(acc,"));
  check("search: chips read the exact counts", search.includes("results.counts[c.key]"));
  check("search: chips and the empty-section notice are gated on !error",
    (search.match(/!progress && !error && results\.counts\.all > 0/g) || []).length >= 2);
  // FID-FUNC-002: persistence waits for the loaded text and verifies its identity.
  check("reader: persistence is gated on the loaded book's identity",
    reader.includes("data.translation !== translation || data.book !== bookSlug"));
  check("reader: saveLastRead is called exactly once (inside the gated effect)",
    (reader.match(/saveLastRead\(/g) || []).length === 1);
  // FID-FUNC-003: a bookmark opens the translation it was saved in.
  check("library: bookmark links carry bm.translation",
    library.includes("refLink(bm.book, bm.chapter, bm.verse, bm.translation ?? translation)"));
  // FID-FUNC-004: the quote reports what it rendered; citations/links follow it.
  check("verse-quote: both resolution paths report the shown translation",
    (verseQuote.match(/onShownTranslation\?\.\(/g) || []).length >= 2);
  check("home: the VOTD citation follows the shown translation, never fed back",
    home.includes("onShownTranslation={setVotdShown}") && !home.includes("translation={votdShown}"));
  check("mystery sheet: the cite and link follow the shown translation",
    mystery.includes("onShownTranslation={setShown}"));
  // FID-FUNC-007: a past target date is rejected, not clamped into a one-day plan.
  check("plan creator: the date input floors at tomorrow and errors inline",
    planCreator.includes("min={tomorrowISO()}") &&
      planCreator.includes('role="alert"') &&
      planCreator.includes("setDateError("));
}

// ── 31. v1.17.0 "nothing hidden" — the docked phone action bar, honest Today
// Mass states, and the semantic a11y batch (audit FID-UX-001, FID-FUNC-006,
// FID-A11Y-001/002/003). All UI wiring — no new pure logic exists to test, so
// these are source-shape guards in the §25 manner. The forbidden fixed-
// clearance strings stay pinned by §26.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const reader = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");
  const home = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  const readings = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");
  const library = readFileSync(join(ROOT, "src/pages/Library.tsx"), "utf8");
  const vq = readFileSync(join(ROOT, "src/components/VerseQuote.tsx"), "utf8");

  // FID-UX-001: the phone bar docks full-bleed; the desktop pill survives.
  const phoneBar = css.match(
    /@media \(max-width: 640px\)\s*\{[^@]*?\.verse-actions\s*\{([^}]*)\}/
  );
  check("docked bar: the phone override docks it (left/right/bottom 0, no transform, grid)",
    !!phoneBar &&
      ["left: 0", "right: 0", "bottom: 0", "transform: none", "display: grid"].every((s) =>
        phoneBar![1].includes(s)
      ));
  check("docked bar: the desktop pill is untouched (base rule keeps left: 50%)",
    /\.verse-actions\s*\{[^}]*left:\s*50%/.test(css));
  check("docked bar: the Reader measures the bar's live height into --verse-actions-h",
    reader.includes("ResizeObserver") && reader.includes('setProperty("--verse-actions-h"'));
  check("docked bar: the measurement cleans up on close (fallback returns to 0)",
    reader.includes('removeProperty("--verse-actions-h")'));
  check("docked bar: the page reserves the bar's height on phones",
    /\.reader-page\s*\{[^}]*padding-bottom:\s*var\(--verse-actions-h/.test(css));
  check("docked bar: focus scrolls clear of the bar (.verse scroll-margin-bottom)",
    /scroll-margin-bottom:\s*calc\(var\(--verse-actions-h/.test(css));
  check("docked bar: selecting scrolls the verse clear (bounded, reduced-motion aware)",
    reader.includes("window.scrollBy(") &&
      (reader.match(/prefers-reduced-motion/g) || []).length >= 2);
  check("docked bar: the bar is a named group",
    reader.includes('aria-label="Verse actions"'));
  check("docked bar: Bookmark speaks pressed state; Note speaks its disclosure",
    reader.includes("aria-pressed={bookmarks.has(selKey)}") &&
      reader.includes("aria-expanded={noteOpen}"));

  // FID-FUNC-006: the Today Mass list is three-state with a real retry.
  check("today mass: a standalone effect with a failed state and a retry counter",
    home.includes("massRetry") && home.includes("setMassFailed(true)"));
  check("today mass: a resolved-null day settles as failed too (no eternal skeleton)",
    (home.match(/setMassFailed\(true\)/g) || []).length >= 2);
  check("today mass: the skeleton reserves the list's approximate height",
    home.includes('className="mass-skeleton"'));

  // FID-A11Y-001: the chip is decorative; the color is spoken.
  check("liturgical color: the sr-only utility uses the clip pattern",
    /\.sr-only\s*\{[^}]*clip-path:\s*inset\(50%\)/.test(css));
  check("liturgical color: both pages hide the chip and speak the name",
    [home, readings].every(
      (s) => s.includes("Liturgical color: {lit.color}") && s.includes('className="sr-only"')
    ));

  // FID-A11Y-002: Library is an honest segmented group.
  check("library: a labelled group of aria-pressed views",
    library.includes('aria-label="Library view"') &&
      library.includes("aria-pressed={tab === t}"));

  // FID-A11Y-003: restrained polite status at the async boundaries only.
  check("live regions: Reader loading/error speak politely",
    (reader.match(/role="status"/g) || []).length >= 2);
  check("live regions: Readings loading/notice speak politely",
    (readings.match(/role="status"/g) || []).length >= 2);
  check("live regions: both Today failure notices speak politely",
    (home.match(/role="status"/g) || []).length >= 2);
  check("verse quote: the bare em dash is gone; failure and the gap speak plainly",
    !vq.includes(">—<") &&
      vq.includes("couldn&rsquo;t be loaded") &&
      vq.includes("not numbered in this translation"));
}

// ── 32. v1.17.1 "touch and see" — day/night text contrast (audit FID-A11Y-004)
// and the 44px touch targets (FID-UX-002). The contrast half is REAL LOGIC: the
// token values are parsed out of styles.css and pushed through the WCAG 2.x
// relative-luminance math, so any token drift that drops a text-on-surface pair
// below AA (4.5:1) goes red here — on EVERY surface (bg-0/1/2), both themes,
// including the six liturgical accent overrides that carry link text when
// "follow the liturgical year" is on. The touch-target half is source-shape in
// the §25 manner (the geometry itself is verified in a browser per release).
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");

  // WCAG 2.x: sRGB channel → linear, relative luminance, contrast ratio.
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (hex: string) =>
    0.2126 * lin(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * lin(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * lin(parseInt(hex.slice(5, 7), 16));
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // The first CSS block introduced by exactly this selector (the negative
  // lookbehind keeps a bare [data-accent="x"] from matching the tail of the
  // compound night selector, as in the liturgical harness §1.3), and one
  // custom property's hex inside it.
  const tokenOf = (selector: string, name: string): string => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp("(?<!\\])" + esc + "\\s*\\{([^}]*)\\}"));
    const decl = rule?.[1].match(new RegExp("--" + name + ":\\s*(#[0-9A-Fa-f]{6})"));
    return decl ? decl[1] : "";
  };

  for (const theme of ["day", "night"] as const) {
    const base = `[data-theme="${theme}"]`;
    const night = theme === "night" ? '[data-theme="night"]' : "";
    const surfaces = ["bg-0", "bg-1", "bg-2"].map((b) => tokenOf(base, b));
    check(`§32 ${theme}: the three surface tokens parse`, surfaces.every(Boolean));

    // Every token that colors RUNNING TEXT (the mark tokens --gold and
    // --ccc-mark are non-text and stay out of this table by design).
    const textTokens: Record<string, string> = {
      "--text": tokenOf(base, "text"),
      "--text-muted": tokenOf(base, "text-muted"),
      "--gold-text": tokenOf(base, "gold-text"),
      "--purple (brand)": tokenOf(base, "purple")
    };
    for (const accent of ["green", "violet", "white", "red", "rose", "black"]) {
      textTokens[`--purple (${accent} accent)`] = tokenOf(`${night}[data-accent="${accent}"]`, "purple");
    }
    for (const [name, hex] of Object.entries(textTokens)) {
      const worst = Math.min(...surfaces.map((bg) => contrast(hex, bg)));
      check(
        `§32 ${theme} ${name} ${hex} ≥ 4.5:1 on every surface (worst ${worst.toFixed(2)})`,
        !!hex && worst >= 4.5
      );
    }

    // Text on filled controls and the translation badges — their own pairs.
    const onAccent = contrast(tokenOf(base, "on-accent"), tokenOf(base, "purple-strong"));
    check(`§32 ${theme} --on-accent on --purple-strong ≥ 4.5:1 (${onAccent.toFixed(2)})`, onAccent >= 4.5);
    const badge = contrast(tokenOf(base, "badge-pd-text"), tokenOf(base, "badge-pd-bg"));
    check(`§32 ${theme} PD badge text on its badge ≥ 4.5:1 (${badge.toFixed(2)})`, badge >= 4.5);
  }

  // Native widget labels are only 10pt/sp, so they must keep the normal-text
  // 4.5:1 threshold too. Parse Android's actual resources and SwiftUI's actual
  // RGB literals; a comment that merely says "accessible" is not evidence.
  const androidColors = readFileSync(
    join(ROOT, "android/app/src/main/res/values/colors.xml"),
    "utf8"
  );
  const androidColor = (name: string) =>
    androidColors.match(new RegExp(`<color name="${name}">(#[0-9A-Fa-f]{6})</color>`))?.[1] ?? "";
  for (const theme of ["day", "night"] as const) {
    const background = androidColor(`fidelis_${theme}_parchment`);
    const label = androidColor(`fidelis_${theme}_gold_text`);
    const ratio = background && label ? contrast(label, background) : 0;
    check(
      `§32 Android ${theme} 10sp gold label ≥ 4.5:1 (${ratio.toFixed(2)})`,
      ratio >= 4.5
    );
  }

  const swiftWidgets = [
    readFileSync(join(ROOT, "ios/WidgetExtension/FidelisWidget.swift"), "utf8"),
    readFileSync(join(ROOT, "ios/WidgetExtension/CalendarWidgets.swift"), "utf8")
  ].join("\n");
  const rgbHex = (red: string, green: string, blue: string) =>
    `#${[red, green, blue]
      .map((component) => Math.round(Number(component) * 255).toString(16).padStart(2, "0"))
      .join("")}`;
  const swiftPairs = (
    property: "parchment" | "goldText"
  ): Array<{ night: string; day: string }> => {
    const capitalized = property[0].toUpperCase() + property.slice(1);
    const matcher = new RegExp(
      `(?:${property}|k${capitalized}): Color \\{ dark \\? Color\\(red: ([0-9.]+), green: ([0-9.]+), blue: ([0-9.]+)\\) : Color\\(red: ([0-9.]+), green: ([0-9.]+), blue: ([0-9.]+)\\) \\}`,
      "g"
    );
    return [...swiftWidgets.matchAll(matcher)].map((match) => ({
      night: rgbHex(match[1], match[2], match[3]),
      day: rgbHex(match[4], match[5], match[6])
    }));
  };
  const swiftBackgrounds = swiftPairs("parchment");
  const swiftLabels = swiftPairs("goldText");
  check(
    "§32 iOS parses all three widget gold-label/background palettes",
    swiftBackgrounds.length === 3 && swiftLabels.length === 3
  );
  for (let index = 0; index < Math.min(swiftBackgrounds.length, swiftLabels.length); index++) {
    for (const theme of ["day", "night"] as const) {
      const ratio = contrast(swiftLabels[index][theme], swiftBackgrounds[index][theme]);
      check(
        `§32 iOS widget ${index + 1} ${theme} 10pt gold label ≥ 4.5:1 (${ratio.toFixed(2)})`,
        ratio >= 4.5
      );
    }
  }

  // FID-A11Y-004, the other half: a link inside prose is underlined by default —
  // on some liturgical days the accent link sits at ~1:1 against the muted copy
  // around it (the Mass import line measured 1.07:1), so color alone cannot mark
  // the link (WCAG 1.4.1).
  check("§32 prose links underline by default (p a, li a, .notice a)",
    /p a,\s*li a,\s*\.notice a\s*\{\s*text-decoration:\s*underline/.test(css));

  // FID-UX-002 source shape: every audited under-44px control family carries a
  // pseudo-element hit slop (or real height) that lifts its tap target to ≥44px
  // without inflating the visible chrome. The wrap-gap widenings are load-bearing
  // too: they are what keeps adjacent rows' slop from overlapping.
  check("§32 hit slop: search/mass chips (.chip::after, ±0.6rem)",
    /\.chip::after\s*\{[^}]*inset:\s*-0\.6rem 0/.test(css));
  check("§32 hit slop: SectionNav chips (±0.5rem, inside the rail's padding)",
    /\.section-nav-link::after\s*\{[^}]*inset:\s*-0\.5rem 0/.test(css));
  check("§32 hit slop: book chips — grid and picker (±0.4rem)",
    /\.book-grid a::after,\s*\.picker-book::after\s*\{[^}]*inset:\s*-0\.4rem 0/.test(css));
  check("§32 hit slop: Settings pills (±0.3rem)",
    /\.pill::after\s*\{[^}]*inset:\s*-0\.3rem 0/.test(css));
  check("§32 hit slop: Settings switch (::before — ::after is the knob)",
    /\.switch::before\s*\{[^}]*inset:\s*-0\.65rem -1px/.test(css));
  check("§32 hit slop: Today card Share (asymmetric, inside the card's own padding)",
    /\.card-share::after\s*\{[^}]*inset:\s*-0\.7rem 0 -1\.1rem/.test(css));
  check("§32 hit slop: Library Remove/Delete (±0.9rem)",
    /\.lib-item \.actions button::after\s*\{[^}]*inset:\s*-0\.9rem -0\.2rem/.test(css));
  check("§32 hit slop: Commentary tabs (±0.4rem)",
    /\.cmt-tab::after\s*\{[^}]*inset:\s*-0\.4rem 0/.test(css));
  check("§32 hit height: rosary mystery rows grow to ≥44px via real padding",
    /\.rosary-list \.rosary-mystery\s*\{[^}]*padding:\s*0\.65rem 0/.test(css));
  check("§32 hit slop: the wrap gaps that keep adjacent rows' slop from overlapping",
    ["gap: 1.2rem 0.4rem", "gap: 0.8rem 0.4rem", "gap: 0.7rem 0.5rem"].every((s) => css.includes(s)));
}

// ── 35. v1.18.0 "the memory of the just" — Saint of the Day + Today in Church
// History (§33/§34 below belong to the parallel "new wineskins"/"prove all
// things" releases; this section runs first in file order but is numbered 35 so
// their numbers and check labels stay intact). Real logic tests for the pure
// helpers (dayKey, saintForCelebration) and the emitted corpora, plus
// source-shape guards for the six-card change, the saint chip, the History
// card's four states, and the routes.
console.log("");
{
  const { dayKey: sanctoralKey } = await import("../src/lib/dateKey");
  const { saintForCelebration } = await import("../src/lib/saints");

  // dayKey: local-calendar "MM-DD" (Jan 5 → 01-05, Dec 25 → 12-25).
  check("memory: dayKey pads to MM-DD",
    sanctoralKey(new Date(2026, 0, 5)) === "01-05" && sanctoralKey(new Date(2026, 11, 25)) === "12-25",
    `${sanctoralKey(new Date(2026, 0, 5))}, ${sanctoralKey(new Date(2026, 11, 25))}`);

  // saintForCelebration against the real emitted 07-14 file (today's St. Kateri).
  const kateriDay = JSON.parse(readFileSync(join(ROOT, "public/data/saints/07-14.json"), "utf8"));
  check("memory: 07-14 seals St. Kateri as a public-domain-sourced draft",
    kateriDay.day === "07-14" &&
      kateriDay.saints[0].id === "kateri-tekakwitha" &&
      kateriDay.saints[0].sources.some((s: { license: string }) => s.license === "public-domain"));
  check("memory: saintForCelebration matches the engine's celebration name by token",
    saintForCelebration(kateriDay.saints, ["St. Kateri Tekakwitha, Virgin"])?.id === "kateri-tekakwitha");
  check("memory: saintForCelebration returns null when no celebration matches",
    saintForCelebration(kateriDay.saints, ["Saint Nobody of Nowhere"]) === null);

  // History: 07-14 holds multiple events, grouped and sorted oldest-first (the
  // build sorts by year ascending; the exact count grows as the corpus does).
  const hist0714 = JSON.parse(readFileSync(join(ROOT, "public/data/history/07-14.json"), "utf8"));
  check("memory: 07-14 history groups multiple events sorted oldest-first",
    hist0714.events.length >= 2 &&
      hist0714.events.every(
        (e: { year: number }, i: number) => i === 0 || hist0714.events[i - 1].year <= e.year
      ));

  // Every emitted entry, both corpora, carries a PD source and a verified flag
  // (the build gate; re-checked here on the sealed output).
  const saintFiles = readdirSync(join(ROOT, "public/data/saints"));
  const histFiles = readdirSync(join(ROOT, "public/data/history"));
  const allSaints = saintFiles.flatMap(
    (f) => JSON.parse(readFileSync(join(ROOT, "public/data/saints", f), "utf8")).saints
  );
  const allEvents = histFiles.flatMap(
    (f) => JSON.parse(readFileSync(join(ROOT, "public/data/history", f), "utf8")).events
  );
  // The provenance gate (v1.20.0): every entry stands on a public-domain source,
  // OR — for a figure too modern to have one — an official Church source
  // (vatican.va), drawn faithfully and labelled honestly (§13, sourced not made up).
  const isSourced = (srcs: { license: string }[]) =>
    srcs.some((src) => src.license === "public-domain" || src.license === "church-official");
  check("memory: every saint is sourced (public-domain or church-official) and has a verified flag",
    allSaints.length > 0 &&
      allSaints.every(
        (s: { sources: { license: string }[]; verified: unknown }) =>
          isSourced(s.sources) && typeof s.verified === "boolean"
      ));
  check("memory: every history event is sourced (public-domain or church-official) and has a verified flag",
    allEvents.length > 0 &&
      allEvents.every(
        (e: { sources: { license: string }[]; verified: unknown }) =>
          isSourced(e.sources) && typeof e.verified === "boolean"
      ));
  // v1.20.0: a Saint of the Day for EVERY calendar date (all 366 incl. Feb 29).
  const allDates: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    for (let dd = 1; dd <= dim; dd++)
      allDates.push(`${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  }
  const saintDays = new Set(allSaints.map((x: { day: string }) => x.day));
  const missingSaintDays = allDates.filter((d) => !saintDays.has(d));
  check("memory: a Saint of the Day exists for every calendar date (365/366)",
    missingSaintDays.length === 0,
    missingSaintDays.length ? `missing ${missingSaintDays.length}: ${missingSaintDays.slice(0, 8).join(", ")}…` : `${allSaints.length} saints`);
  // v1.23.0 — the chronicle matches the saints' full-year coverage: every
  // calendar date (incl. Feb 29) has at least one Church-history event.
  const historyDays = new Set(allEvents.map((x: { day: string }) => x.day));
  const missingHistoryDays = allDates.filter((d) => !historyDays.has(d));
  check("memory: a Church-history event exists for every calendar date (365/366)",
    missingHistoryDays.length === 0,
    missingHistoryDays.length
      ? `missing ${missingHistoryDays.length}: ${missingHistoryDays.slice(0, 8).join(", ")}…`
      : `${allEvents.length} events / ${historyDays.size} days`);
  // v1.23.1 — About must not out-claim the corpora. v1.23.0 shipped a blanket
  // "every entry has been proof-read against its named edition" covering BOTH
  // memory layers, while all 366 saints were still verified:false and every
  // Saint page rendered "(draft — pending verification)" underneath. The claim
  // and the flags are now coupled: while any saint is unverified, About says so
  // and may not make the blanket claim. Flip the saints to verified and this
  // turns red, which is the reminder to rewrite the paragraph.
  const aboutSrc = readFileSync(join(ROOT, "src/pages/About.tsx"), "utf8").replace(/\s+/g, " ");
  const saintsAllVerified = allSaints.every((s: { verified: boolean }) => s.verified === true);
  check("memory: About's proof-read claim matches the saints' verified flags",
    saintsAllVerified
      ? !aboutSrc.includes("sourced drafts awaiting that pass")
      : aboutSrc.includes("sourced drafts awaiting that pass") &&
        !aboutSrc.includes("every entry has been proof-read"),
    saintsAllVerified
      ? "all saints verified — drop the drafts caveat from About"
      : "saints are drafts — About must say so and not claim a blanket proof-read");

  const saintIds = allSaints.map((x: { id: string }) => x.id);
  const eventIds = allEvents.map((x: { id: string }) => x.id);
  check("memory: saint and event ids are unique across the corpus",
    new Set(saintIds).size === saintIds.length && new Set(eventIds).size === eventIds.length);

  // v1.21.1 corpus-integrity gates — the duplicate audit's ungated classes, now
  // gated: (a) exactly ONE saint per day (the card renders saints[0], so a
  // silent second entry would shadow); (b) no two saints normalize to the same
  // person name (the accidental-double class — intentional double feasts like
  // St. Joseph 03-19/05-01 carry distinct names and pass); (c) no two history
  // events normalize to the same title (a reworded re-entry on another date
  // would slip past the day+year gate); (d) corpus↔emitted sync — editing a
  // corpus without re-running the build goes red here, as quotes already does.
  const saintsCorpus: { id: string; day: string; name: string }[] = JSON.parse(
    readFileSync(join(ROOT, "scripts/saints.corpus.json"), "utf8")).saints;
  const eventsCorpus: { id: string; day: string; title: string }[] = JSON.parse(
    readFileSync(join(ROOT, "scripts/history.corpus.json"), "utf8")).events;
  const normPerson = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\b(st|saint|sts|blessed|bl|our|lady|of|the|and|ven)\b/g, "")
      .replace(/\s+/g, " ").trim();
  const dayCounts = new Map<string, number>();
  for (const s of saintsCorpus) dayCounts.set(s.day, (dayCounts.get(s.day) ?? 0) + 1);
  check("memory: exactly one saint per day (saints[0] is the rendered one)",
    dayCounts.size === 366 && [...dayCounts.values()].every((n) => n === 1));
  const personNames = saintsCorpus.map((s) => normPerson(s.name));
  check("memory: no two saints normalize to the same person name",
    new Set(personNames).size === personNames.length);
  const eventTitles = eventsCorpus.map((e) => normPerson(e.title));
  check("memory: no two history events normalize to the same title",
    new Set(eventTitles).size === eventTitles.length);
  check("memory: every shortBlurb keeps the trailing-ellipsis convention (share text depends on it)",
    [...allSaints, ...allEvents].every(
      (x: { shortBlurb?: string }) => typeof x.shortBlurb === "string" && x.shortBlurb.trimEnd().endsWith("…")
    ));
  {
    const byDay = <T extends { day: string }>(list: T[]) => {
      const m = new Map<string, T[]>();
      for (const x of list) m.set(x.day, [...(m.get(x.day) ?? []), x]);
      return m;
    };
    // Per-id deep compare, order-free (the build sorts a day's events by year).
    const sameEntries = (emitted: { id: string }[], corpus: { id: string }[]) => {
      if (emitted.length !== corpus.length) return false;
      const byId = new Map(corpus.map((x) => [x.id, JSON.stringify(x)]));
      return emitted.every((x) => byId.get(x.id) === JSON.stringify(x));
    };
    let badDays = 0;
    const checkSync = (kind: "saints" | "history", corpusByDay: Map<string, { id: string }[]>, key: "saints" | "events") => {
      for (const [day, list] of corpusByDay) {
        let emitted;
        try {
          emitted = JSON.parse(readFileSync(join(ROOT, `public/data/${kind}/${day}.json`), "utf8"));
        } catch {
          badDays++;
          continue;
        }
        if (!sameEntries(emitted[key], list)) badDays++;
      }
    };
    const saintsByDay = byDay(saintsCorpus);
    const eventsByDay = byDay(eventsCorpus);
    checkSync("saints", saintsByDay, "saints");
    checkSync("history", eventsByDay, "events");
    const staleFiles =
      saintFiles.filter((f) => !saintsByDay.has(f.replace(".json", ""))).length +
      histFiles.filter((f) => !eventsByDay.has(f.replace(".json", ""))).length;
    check("memory: emitted saints/history are the corpora (run npm run saints/history after editing)",
      badDays === 0 && staleFiles === 0,
      `${badDays} mismatched days, ${staleFiles} stale files`);
  }

  // Source-shape guards for the UI wiring. v1.19.0 reworked the history card into
  // the Saint-led "Today in the Church" card (Mass card → "Today at Mass").
  const home = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  const dataLib = readFileSync(join(ROOT, "src/lib/data.ts"), "utf8");
  check("memory: the 'Today in the Church' card leads with the Saint of the Day",
    home.includes("Today in the Church") && home.includes("Saint of the Day"));
  check("memory: the Mass card is now titled 'Today at Mass' (no title clash)",
    home.includes("Today at Mass"));
  check("memory: the card keeps the 'In Church History' section with all four states",
    home.includes("In Church History") &&
      ["loading", "ready", "empty", "failed"].every((s) => home.includes(`historyState === "${s}"`)));
  check("memory: the Saint of the Day is decoupled from the sanctoral engine (any day with a life shows)",
    home.includes("lit.celebrations.map((c) => c.name)") && home.includes("saintDay.saints[0]"));
  check("memory: the Saint lead renders a monogram medallion and links to the life",
    home.includes("saint-medallion") && home.includes("monogram(") && home.includes("Read the life"));
  check("memory: the memorial name in the Mass card still links to the Saint of the Day",
    home.includes("saintForCelebration(saintDay.saints, [c.name])") &&
      home.includes("`/saint/${dayToday}/${s.id}`"));

  // v1.21.1 same-subject de-dup: the card's history lead must never restate the
  // Saint of the Day shown directly above it. Real logic tests on the pure
  // helper, then the shape guard that the card uses it.
  const { leadHistoryEvent } = await import("../src/lib/history");
  const mkEv = (id: string, title: string, year: number) =>
    ({ id, day: "07-17", year, title, shortBlurb: "", body: [], sources: [], verified: false });
  const compiegne = mkEv("a", "The Carmelites of Compiègne go to the guillotine", 1794);
  const scillitan = mkEv("b", "The Scillitan Martyrs", 180);
  check("memory: leadHistoryEvent leads with the other subject when the day's saint owns an event",
    leadHistoryEvent([compiegne, scillitan], "The Martyrs of Compiègne")?.id === "b");
  check("memory: leadHistoryEvent falls back to the day's event when every event is the saint's subject",
    leadHistoryEvent([compiegne], "The Martyrs of Compiègne")?.id === "a");
  check("memory: leadHistoryEvent keeps list order (oldest-first) when no saint is named",
    leadHistoryEvent([scillitan, compiegne], null)?.id === "b" &&
      leadHistoryEvent([scillitan, compiegne], undefined)?.id === "b");
  check("memory: leadHistoryEvent returns null for an empty day",
    leadHistoryEvent([], "Anyone") === null);
  check("memory: the card's history lead is de-duplicated against the saint (leadHistoryEvent)",
    home.includes("leadHistoryEvent(history.events, cardSaint?.name)"));
  check("memory: loadSaints and loadHistory are memoized, retry-after-rejection loaders",
    dataLib.includes("export function loadSaints(") && dataLib.includes("export function loadHistory("));
  check("memory: the /saint and /history detail routes are declared",
    app.includes('path="/saint/:day"') &&
      app.includes('path="/saint/:day/:id"') &&
      app.includes('path="/history/:day"'));
}

// ── 33. v1.18.0 "new wineskins" — the atomic Bible import (audit FID-DATA-001,
// FID-FUNC-009), honest local persistence (FID-STOR-001), and cache-truth
// offline state (FID-FUNC-008). The staging/swap logic is a PURE module
// (src/lib/importPlan.ts) driven here through a fake store, so the audit's
// acceptance criteria — an injected mid-import write failure leaves the prior
// corpus untouched; a smaller re-import retains no stale books — are REAL
// LOGIC tests. The UI wiring is pinned by §25-style shape guards below.
console.log("");
{
  const {
    MAX_IMPORT_BYTES,
    checkImportSize,
    keyFor,
    parseKey,
    validateCorpus,
    planImport,
    executeImportPlan,
    describeStorageError
  } = await import("../src/lib/importPlan");
  type BookData = import("../src/lib/data").BookData;
  type ImportStorePlan = import("../src/lib/importPlan").ImportPlan;

  // The key grammar: generation 0 IS the legacy key shape, so every existing
  // install is already "at gen 0" — migration by construction, no data moves.
  check("§33 keyFor gen 0 is the legacy key shape", keyFor("nabre", 0, "john") === "nabre/john");
  check("§33 keyFor gen 3 is the staged namespace", keyFor("nabre", 3, "john") === "nabre@3/john");
  const pk0 = parseKey("nabre/john");
  check("§33 parseKey reads a legacy key as gen 0",
    pk0.translation === "nabre" && pk0.gen === 0 && pk0.book === "john");
  const pk12 = parseKey("rsv2ce@12/1-corinthians");
  check("§33 parseKey round-trips a staged key (hyphenated slug intact)",
    pk12.translation === "rsv2ce" && pk12.gen === 12 && pk12.book === "1-corinthians");
  check("§33 key round-trip is exact for both shapes",
    keyFor(pk0.translation, pk0.gen, pk0.book) === "nabre/john" &&
      keyFor(pk12.translation, pk12.gen, pk12.book) === "rsv2ce@12/1-corinthians");

  // The size bound rejects BEFORE any read/parse; the message names the bound.
  check("§33 size gate passes a corpus-sized file", checkImportSize(MAX_IMPORT_BYTES) === null);
  const oversize = checkImportSize(MAX_IMPORT_BYTES + 1);
  check("§33 size gate rejects an oversized file, naming the 64 MB bound",
    !!oversize && oversize.includes("64 MB"));

  // validateCorpus: the whole normalized corpus is validated before ANY write.
  const mkBook = (name: string, text = "In the beginning God created heaven, and earth.") => ({
    name,
    chapters: [[text]]
  });
  const validated = validateCorpus("nabre", [mkBook("Genesis"), mkBook("I Esdras", " ")]);
  check("§33 validateCorpus resolves names and skips textless placeholders (alias-clobber guard)",
    validated.length === 1 && validated[0].slug === "genesis" &&
      validated[0].data.translation === "nabre" && validated[0].data.book === "genesis" &&
      validated[0].data.chapters[0][0].startsWith("In the beginning"));
  let emptyErr = "";
  try {
    validateCorpus("nabre", []);
  } catch (e) {
    emptyErr = e instanceof Error ? e.message : String(e);
  }
  check("§33 validateCorpus rejects an empty corpus with a named error",
    emptyErr.includes("No recognizable books"));
  let shapeErr = "";
  try {
    validateCorpus("nabre", [
      { name: "Genesis", chapters: [[{ bad: true } as unknown as string]] }
    ]);
  } catch (e) {
    shapeErr = e instanceof Error ? e.message : String(e);
  }
  check("§33 validateCorpus rejects a malformed book, naming it", shapeErr.includes("Genesis"));

  // planImport — FID-FUNC-009's core: EVERY old key of the translation becomes
  // obsolete (legacy gen, orphaned staging gens), other translations untouched.
  const existing = ["nabre/genesis", "nabre/john", "nabre@2/matthew", "cpdv/psalms"];
  const john = validateCorpus("nabre", [mkBook("John")]);
  const plan = planImport("nabre", 0, existing, john);
  check("§33 plan stages ABOVE every existing gen (orphans included)", plan.gen === 3);
  check("§33 plan writes carry the staged namespace",
    plan.writes.length === 1 && plan.writes[0].key === "nabre@3/john");
  check("§33 plan obsoletes every old key of the translation — stale books leave (FID-FUNC-009)",
    [...plan.obsoleteKeys].sort().join(",") === "nabre/genesis,nabre/john,nabre@2/matthew");
  check("§33 plan never touches another translation's corpus",
    plan.obsoleteKeys.every((k) => !k.startsWith("cpdv/")));

  // executeImportPlan against a fake store — the FID-DATA-001 acceptance run.
  const mkStore = (failAtPut = Infinity) => {
    const map = new Map<string, BookData>();
    const meta = new Map<string, number>();
    let armed = failAtPut;
    let puts = 0;
    return {
      map,
      meta,
      disarm: () => {
        armed = Infinity;
      },
      put: async (k: string, v: BookData) => {
        if (++puts > armed) throw new DOMException("write refused", "QuotaExceededError");
        map.set(k, v);
      },
      setActive: async (t: string, g: number) => {
        meta.set(t, g);
      },
      deleteKeys: async (ks: string[]) => {
        for (const k of ks) map.delete(k);
      }
    };
  };
  const seed = (store: ReturnType<typeof mkStore>) => {
    store.map.set("nabre/genesis", { translation: "nabre", book: "genesis", chapters: [["old"]] });
    store.map.set("nabre/john", { translation: "nabre", book: "john", chapters: [["old"]] });
    store.map.set("nabre@2/matthew", { translation: "nabre", book: "matthew", chapters: [["orphan"]] });
    store.map.set("cpdv/psalms", { translation: "cpdv", book: "psalms", chapters: [["other"]] });
  };
  const visible = (store: ReturnType<typeof mkStore>, t: string) => {
    const gen = store.meta.get(t) ?? 0;
    return [...store.map.keys()]
      .filter((k) => {
        const p = parseKey(k);
        return p.translation === t && p.gen === gen;
      })
      .sort();
  };

  // Success path: writes → flip → sweep; the visible corpus is the new one.
  const ok = mkStore();
  seed(ok);
  const wrote = await executeImportPlan(plan, ok);
  check("§33 swap: the marker flips only after every write (returns the count)",
    wrote === 1 && ok.meta.get("nabre") === 3);
  check("§33 swap: the new corpus is visible, stale books are gone",
    visible(ok, "nabre").join(",") === "nabre@3/john" && !ok.map.has("nabre/genesis"));
  check("§33 swap: the other translation is untouched", ok.map.has("cpdv/psalms"));

  // Failure path: the SECOND write fails mid-import → the marker never flips
  // and the prior corpus is untouched (the audit's acceptance, as real logic).
  const two = validateCorpus("nabre", [mkBook("John"), mkBook("Mark")]);
  const plan2 = planImport("nabre", 0, existing, two);
  const failing = mkStore(1);
  seed(failing);
  let failErr: unknown = null;
  try {
    await executeImportPlan(plan2, failing);
  } catch (e) {
    failErr = e;
  }
  check("§33 injected mid-import write failure rejects", failErr !== null);
  check("§33 …the marker never flipped (prior gen still active)",
    failing.meta.get("nabre") === undefined);
  check("§33 …the prior corpus is byte-for-byte untouched (FID-DATA-001)",
    visible(failing, "nabre").join(",") === "nabre/genesis,nabre/john" &&
      failing.map.get("nabre/genesis")?.chapters[0][0] === "old");
  // …and the next successful import (the quota freed) sweeps the crash's orphans.
  failing.disarm();
  const retryPlan = planImport("nabre", 0, [...failing.map.keys()], john);
  await executeImportPlan(retryPlan, failing);
  check("§33 the next import sweeps a crashed import's orphans",
    [...failing.map.keys()].filter((k) => k.startsWith("nabre")).join(",") ===
      `nabre@${retryPlan.gen}/john`);

  // Quota errors name the cause and the recovery.
  const quotaMsg = describeStorageError(new DOMException("x", "QuotaExceededError"));
  check("§33 quota error names the cause (storage is full)", /storage is full/i.test(quotaMsg));
  check("§33 quota error names a recovery path", /free up|remove/i.test(quotaMsg));
  check("§33 other errors pass their message through",
    describeStorageError(new Error("boom")).includes("boom"));
  void (0 as unknown as ImportStorePlan);

  // FID-STOR-001 — localStorage write failures surface exactly once (deduped).
  const storage = await import("../src/lib/storage");
  const realLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let fired = 0;
  const unsub = storage.subscribeStorageWarning(() => fired++);
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("full", "QuotaExceededError");
        },
        removeItem: () => {}
      }
    });
    check("§33 storage: no warning before any failure", storage.isStorageWarned() === false);
    storage.saveLastRead({ translation: "drc", book: "john", chapter: 1 });
    storage.saveLastRead({ translation: "drc", book: "john", chapter: 2 });
    check("§33 storage: a failed write raises the warning", storage.isStorageWarned() === true);
    check("§33 storage: the warning is deduplicated (one signal for two failures)", fired === 1);
  } finally {
    unsub();
    if (realLocalStorage) Object.defineProperty(globalThis, "localStorage", realLocalStorage);
  }

  // ── Shape guards (§25 manner) for the UI wiring the pure module can't see ──
  const translations = readFileSync(join(ROOT, "src/pages/Translations.tsx"), "utf8");
  const dataSrc = readFileSync(join(ROOT, "src/lib/data.ts"), "utf8");
  const swSrc = readFileSync(join(ROOT, "public/sw.js"), "utf8");
  const settingsSrc = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  const appSrc = readFileSync(join(ROOT, "src/App.tsx"), "utf8");

  check("§33 import UI: the size gate runs BEFORE the file is read",
    translations.includes("checkImportSize(file.size)") &&
      translations.indexOf("checkImportSize(file.size)") < translations.indexOf("file.text()"));
  check("§33 import UI: parsing runs in a Worker (main-thread fallback kept)",
    translations.includes('new URL("../lib/import.worker.ts", import.meta.url)') &&
      translations.includes('typeof Worker === "undefined"'));
  check("§33 import UI: the write path is the staged swap, never bare idbPut",
    translations.includes("stageAndSwapImport(") && !translations.includes("idbPut("));
  check("§33 import UI: failures speak through describeStorageError",
    translations.includes("describeStorageError("));

  // The page-side cache probe and the service worker must name the SAME cache.
  const dataCacheInData = dataSrc.match(/DATA_CACHE = "([^"]+)"/)?.[1];
  const dataCacheInSw = swSrc.match(/DATA_CACHE = "([^"]+)"/)?.[1];
  check("§33 offline probe: data.ts and sw.js agree on the data-cache name",
    !!dataCacheInData && dataCacheInData === dataCacheInSw);
  check("§33 offline probe: mutable quotes refresh network-first with cache fallback",
      swSrc.includes('url.pathname.endsWith("/data/quotes.json")') &&
      swSrc.includes("if (isNetworkFirst)") &&
      swSrc.includes('fetch(event.request, { cache: "no-cache" })') &&
      swSrc.includes("await cache.put(event.request, res.clone())") &&
      swSrc.includes("const hit = await cache.match(event.request)"));
  check("§33 offline probe: Settings shows Saved only from cache truth (verifyOfflineBundle)",
    settingsSrc.includes("verifyOfflineBundle(") && settingsSrc.includes("Repair"));
  check("§33 storage banner: App mounts the deduped warning with Export as recovery",
    appSrc.includes("subscribeStorageWarning") &&
      appSrc.includes("isStorageWarned") &&
      appSrc.includes('to="/settings#data"'));
}

// ── 34. v1.18.1 "prove all things" — the perf & browser-test batch (audit
// FID-PERF-002/003, FID-QUAL-001). Route-splitting and the fetch window are UI
// wiring (shape guards, §25 manner); the committed Playwright suite guards the
// BROWSER behaviors the pure harnesses can't reach, so this section pins that
// the suite exists, is runnable (script + deps + config), and rides CI.
console.log("");
{
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  const search = readFileSync(join(ROOT, "src/pages/Search.tsx"), "utf8");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");

  // FID-PERF-002: the five secondary surfaces (and the plan creator) load
  // lazily; the worship-critical path (Today, Reader, Search, Mass, the book
  // list) stays eager — no chunking framework, just React.lazy.
  for (const page of ["Settings", "Library", "Widgets", "Translations", "Plans", "PlanCreator", "About"]) {
    check(`§34 route split: ${page} is a lazy route`,
      app.includes(`lazy(() => import("./pages/${page}"))`) &&
        !app.includes(`import ${page} from "./pages/${page}"`));
  }
  for (const page of ["Home", "Reader", "Search", "Readings", "BookList", "WidgetVotd"]) {
    check(`§34 route split: ${page} stays eager (critical path)`,
      app.includes(`import ${page} from "./pages/${page}"`));
  }
  check("§34 route split: a quiet Suspense fallback wraps the routes",
    app.includes("<Suspense") && app.includes("fallback"));

  // FID-PERF-003: the cold search pipelines its 78 book fetches through a
  // small prefetch window while still PROCESSING strictly in canon order (the
  // §29/§30 guarantees — exact counts, no early break — hold unchanged).
  check("§34 search: a bounded prefetch window rides ahead of the scan",
    /SEARCH_PREFETCH\s*=\s*\d/.test(search) && search.includes("SEARCH_PREFETCH"));
  check("§34 search: prefetch rejections are pre-handled (no unhandled rejections)",
    search.includes(".catch(() => {})"));

  // FID-QUAL-001: the committed browser suite — specs, config, script, deps, CI.
  const specs = ["today", "reader", "search", "library", "navigation-widget", "import", "offline", "axe"];
  for (const s of specs) {
    check(`§34 suite: e2e/${s}.spec.ts exists`, existsSync(join(ROOT, `e2e/${s}.spec.ts`)));
  }
  check("§34 suite: playwright.config.ts serves the built app (vite preview)",
    existsSync(join(ROOT, "playwright.config.ts")) &&
      readFileSync(join(ROOT, "playwright.config.ts"), "utf8").includes("preview"));
  check("§34 suite: npm run e2e is wired", (pkg.scripts.e2e ?? "").includes("playwright test"));
  check("§34 suite: @playwright/test and @axe-core/playwright are devDependencies",
    !!pkg.devDependencies["@playwright/test"] && !!pkg.devDependencies["@axe-core/playwright"]);
  check("§34 suite: CI runs the browser suite", ci.includes("playwright"));
}

// ── 36. v1.18.3 "faithful in little" — the P3 polish sweep (audit FID-FUNC-010/
// 011, FID-UX-003/004/005, FID-PERF-004, FID-NATIVE-002, FID-SEC-001/002). These
// are UI / native-shell / host-config fixes the pure engines can't reach, so this
// section is shape guards (§25 manner) plus one real computation: the CSP hash
// drift gate, which recomputes the pre-paint script's sha256 and pins it to the
// value shipped in public/_headers.
console.log("");
{
  const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
  const widgetVotd = read("src/pages/WidgetVotd.tsx");
  const reader = read("src/pages/Reader.tsx");
  const search = read("src/pages/Search.tsx");
  const css = read("src/styles.css");
  const app = read("src/App.tsx");
  const tabBar = read("src/components/TabBar.tsx");
  const home = read("src/pages/Home.tsx");
  const settings = read("src/pages/Settings.tsx");
  const about = read("src/pages/About.tsx");
  const widgetsPage = read("src/pages/Widgets.tsx");
  const html = read("index.html");
  const headers = read("public/_headers");

  // FID-FUNC-010: a long-lived VOTD embed rolls at midnight via useToday().
  check("§36 FUNC-010: WidgetVotd drives verseOfTheDay from useToday()",
    /import \{ useToday \}/.test(widgetVotd) && widgetVotd.includes("verseOfTheDay(today)"));

  // FID-FUNC-011: a parallel-pane load failure raises a quiet notice instead of a
  // silent single-column fallback.
  check("§36 FUNC-011: Reader records the parallel-load error and speaks it",
    reader.includes("parallelError") &&
      reader.includes("setParallelError(e instanceof Error") &&
      reader.includes("{parallelError && parallel"));

  // FID-UX-003: Copy reports BOTH success and failure near the action surface.
  check("§36 UX-003: Reader flashes a copy status for both outcomes",
    reader.includes('flashCopyStatus("copied")') &&
      reader.includes('flashCopyStatus("failed")') &&
      reader.includes('className="va-status"'));
  check("§36 UX-003: the copy-status region collapses when idle (:empty)",
    css.includes(".va-status") && css.includes(".va-status:empty"));

  // FID-UX-004: the small-phone card gutter — clamp the min track to the column.
  check("§36 UX-004: .widget-grid clamps its min track to the column width",
    css.includes("minmax(min(300px, 100%), 1fr)"));

  // FID-UX-005: Search autofocuses only in a keyboard/desktop context.
  check("§36 UX-005: Search gates autoFocus on a fine-pointer + hover query",
    search.includes("autoFocus={autoFocusSearch}") &&
      search.includes("(hover: hover) and (pointer: fine)"));

  // FID-NATIVE-002 (web): App routes the fidelis:// widget deep links, on both a
  // cold launch (getLaunchUrl) and a tap while running (appUrlOpen).
  check("§36 NATIVE-002 (web): App handles appUrlOpen AND the cold-launch URL",
    app.includes('addListener("appUrlOpen"') && app.includes("getLaunchUrl"));
  const massTarget = widgetLinkTarget("fidelis://mass");
  const verseTarget = widgetLinkTarget("fidelis://verse");
  const quoteTarget = widgetLinkTarget("fidelis://quote");
  const todayTarget = widgetLinkTarget("fidelis://today");
  check("§36 NATIVE-002 (web): fidelis://mass → Mass readings; verse/quote → their Today cards; today → Today",
    !!massTarget && widgetLinkDestination(massTarget) === "/readings" &&
      !!verseTarget && widgetLinkDestination(verseTarget) === "/#votd" &&
      !!quoteTarget && widgetLinkDestination(quoteTarget) === "/#qotd" &&
      !!todayTarget && widgetLinkDestination(todayTarget) === "/");
  check("§36 NATIVE-002 (web): malformed and foreign links are refused",
    widgetLinkTarget("https://example.com/verse") === null &&
      widgetLinkTarget("fidelis://unknown") === null);
  check("§36 NATIVE-002 (web): cold replaces, warm pushes, repeat target only focuses",
    widgetLinkHistoryMode("cold", false) === "replace" &&
      widgetLinkHistoryMode("warm", false) === "push" &&
      widgetLinkHistoryMode("warm", true) === "focus" &&
      !!verseTarget &&
        isSameWidgetTarget({ pathname: "/", search: "", hash: "#votd" }, verseTarget));
  check("§36 NATIVE-002 (web): native edge-Back consumes only router-owned history",
    canConsumeAppHistory({ idx: 1 }) &&
      canConsumeAppHistory({ idx: 9 }) &&
      !canConsumeAppHistory({ idx: 0 }) &&
      !canConsumeAppHistory({ idx: -1 }) &&
      !canConsumeAppHistory({ idx: 1.5 }) &&
      !canConsumeAppHistory({}) &&
      !canConsumeAppHistory(null) &&
      app.includes('Capacitor.getPlatform() !== "ios"') &&
      app.includes("canConsumeAppHistory(window.history.state)") &&
      app.includes("consumeNativeWidgetReturn()") &&
      app.includes("callerDestination: locationDestination(locationRef.current)") &&
      app.includes("currentDestination !== expected.widgetDestination"));
  const returnContract = {
    version: 1 as const,
    widgetDestination: "/readings",
    callerDestination: "/library",
    callerHistoryIndex: 0
  };
  const returnHistoryState = {
    idx: 1,
    usr: widgetReturnNavigationState(returnContract)
  };
  check("§36 NATIVE-002 (web): warm widget return is versioned in router history state",
    appHistoryIndex(returnHistoryState) === 1 &&
      widgetReturnContractFromHistoryState(returnHistoryState)?.callerDestination === "/library" &&
      widgetReturnContractFromHistoryState({ idx: 1, usr: {} }) === null &&
      widgetReturnContractFromHistoryState({
        idx: 1,
        usr: { fidelisWidgetReturn: { ...returnContract, callerHistoryIndex: -1 } }
      }) === null &&
      app.includes("state: widgetReturnNavigationState(returnContract)"));
  check("§36 NATIVE-002 (web): a same-hash duplicate is discarded only above its recorded caller",
    canDiscardDuplicateWidgetEntry(returnHistoryState, returnContract, "/readings") &&
      canDiscardDuplicateWidgetEntry({ ...returnHistoryState, idx: 2 }, returnContract, "/readings") &&
      !canDiscardDuplicateWidgetEntry({ ...returnHistoryState, idx: 0 }, returnContract, "/readings") &&
      !canDiscardDuplicateWidgetEntry(returnHistoryState, returnContract, "/") &&
      app.includes("canDiscardDuplicateWidgetEntry(window.history.state, expected") &&
      app.includes("verifyReturn(discardAttempts + 1)"));
  check("§36 NATIVE-002 (web): a dated Mass screen differs from the widget's today target",
    !!massTarget &&
      !isSameWidgetTarget(
        { pathname: "/readings", search: "?date=2026-12-25", hash: "" },
        massTarget
      ));
  // ---- The widget-entry navigation freeze (v1.18.3 → v1.24.0) ----
  // iOS latches the launch URL in ApplicationDelegateProxy.lastURL and Android
  // in Bridge.intentUri; neither is ever cleared, so getLaunchUrl() answers with
  // the same widget URL for the whole process. The listener effect used to
  // depend on `openWidgetLink` → `navigate`, whose identity react-router
  // re-creates on every pathname change, so every tab tap re-read that latch,
  // re-classified it as a fresh COLD activation and replace-navigated the user
  // back to the widget's destination: the app opened from a widget could not be
  // navigated at all. Both halves of the repair are pinned here.
  const startupGate = createWidgetStartupGate();
  check("§36 widget freeze: the OS launch URL is claimable exactly once per process",
    claimStartupLaunchUrl(startupGate, "fidelis://verse") === "fidelis://verse" &&
      claimStartupLaunchUrl(startupGate, "fidelis://verse") === null &&
      claimStartupLaunchUrl(startupGate, "fidelis://mass") === null);
  const emptyGate = createWidgetStartupGate();
  check("§36 widget freeze: an icon launch claims its empty latch and stays empty",
    claimStartupLaunchUrl(emptyGate, undefined) === null &&
      claimStartupLaunchUrl(emptyGate, "fidelis://verse") === null);
  // A re-read yields null, and a null launch URL with no buffered warm taps
  // produces NO activation at all — the replay is structurally impossible.
  const replayGate = createWidgetStartupGate();
  claimStartupLaunchUrl(replayGate, "fidelis://verse");
  check("§36 widget freeze: a re-read of the latch produces no activation to replay",
    widgetLinkStartupActivations(claimStartupLaunchUrl(replayGate, "fidelis://verse"), []).length === 0);
  // The listener effect must mount ONCE. A dependency array that names the
  // handler (or `navigate`) re-runs it on every route change and re-opens the
  // freeze, so the shape is pinned: dispatch through the ref, deps empty.
  check("§36 widget freeze: the native widget listener effect mounts once and dispatches through a ref",
    app.includes("openWidgetLinkRef.current(event.url, \"warm\")") &&
      app.includes("openWidgetLinkRef.current(activation.url, activation.source)") &&
      app.includes("claimStartupLaunchUrl(gate, launchUrl)") &&
      !app.includes("}, [openWidgetLink]);"));
  // ---- The widget-sync effect must key on content, not object identity ----
  // getSettings() rebuilds individualChurchProper on every read and
  // saveSettings() spreads that fresh read, so an unrelated settings write (a
  // theme flip) used to hand back an identical-but-new object and re-run the
  // native widget sync: its appStateChange listener dropped and re-added, the
  // debounce restarted, the whole multi-year local calendar overlay rebuilt.
  // The canonical fingerprint is the stable key that repair depends on.
  const properReadA = normalizeIndividualChurchProper({
    title: "Saint Mary of the Angels",
    titleDate: { month: 8, day: 2 },
    dedicationAnniversary: { month: 10, day: 17 }
  });
  const properReadB = normalizeIndividualChurchProper({
    title: "Saint Mary of the Angels",
    titleDate: { month: 8, day: 2 },
    dedicationAnniversary: { month: 10, day: 17 }
  });
  check("§36 widget sync: two reads of one stored proper are separate objects with one fingerprint",
    properReadA !== properReadB &&
      individualChurchProperFingerprint(properReadA) ===
        individualChurchProperFingerprint(properReadB));
  check("§36 widget sync: a genuine change to the proper does move the fingerprint",
    individualChurchProperFingerprint(properReadA) !==
      individualChurchProperFingerprint(
        normalizeIndividualChurchProper({
          title: "Saint Mary of the Angels",
          titleDate: { month: 8, day: 5 },
          dedicationAnniversary: { month: 10, day: 17 }
        })
      ));
  check("§36 widget sync: App keys the native sync on the fingerprint-memoised proper",
    app.includes("individualChurchProperFingerprint(") &&
      app.includes("const individualChurchProper = useMemo(") &&
      !app.includes("settings.individualChurchProper,\n    settings.lectionaryPackId"));
  const bufferedCold = widgetLinkStartupActivations(null, ["fidelis://verse"]);
  check("§36 NATIVE-002 (web): a first buffered URL becomes cold when getLaunchUrl is empty",
    bufferedCold.length === 1 &&
      bufferedCold[0].url === "fidelis://verse" &&
      bufferedCold[0].source === "cold");
  const launchAndDuplicate = widgetLinkStartupActivations(
    "fidelis://mass",
    ["fidelis://mass"]
  );
  check("§36 NATIVE-002 (web): an authoritative launch URL stays cold and its buffered duplicate stays warm",
    launchAndDuplicate.length === 2 &&
      launchAndDuplicate[0].url === "fidelis://mass" &&
      launchAndDuplicate[0].source === "cold" &&
      launchAndDuplicate[1].url === "fidelis://mass" &&
      launchAndDuplicate[1].source === "warm");
  check("§36 NATIVE-002 (web): cold/warm duplicate delivery is accepted once per activation window",
    !!verseTarget &&
      isDuplicateWidgetLinkDelivery(
        { destination: "/#votd", receivedAt: 1000 },
        verseTarget,
        1000 + WIDGET_LINK_DEDUPE_MS
      ) &&
      !isDuplicateWidgetLinkDelivery(
        { destination: "/#votd", receivedAt: 1000 },
        verseTarget,
        1001 + WIDGET_LINK_DEDUPE_MS
      ) &&
      !!quoteTarget &&
      !isDuplicateWidgetLinkDelivery(
        { destination: "/#votd", receivedAt: 1000 },
        quoteTarget,
        1001
      ));
  const concurrentDeliveries = new Map();
  check("§36 NATIVE-002 (web): destination-scoped dedupe preserves distinct concurrent intents",
    !!massTarget && !!verseTarget &&
      acceptWidgetLinkDelivery(concurrentDeliveries, massTarget, 1000) &&
      acceptWidgetLinkDelivery(concurrentDeliveries, verseTarget, 1001) &&
      !acceptWidgetLinkDelivery(concurrentDeliveries, massTarget, 1002));
  const widgetDismissIndex = app.indexOf("const dismissed = dismissAllOverlays();");
  const widgetCleanupDelayIndex = app.indexOf(
    "const timer = window.setTimeout(() => {",
    widgetDismissIndex
  );
  const widgetHealIndex = app.indexOf(
    "healStrandedScrollLock({ restoreScroll: false })",
    widgetCleanupDelayIndex
  );
  check("§36 NATIVE-002 (web): the verse/quote cards carry the deep-link anchors, and widget entry heals a stranded lock first",
    home.includes('id="votd"') &&
      home.includes('id="qotd"') &&
      home.includes("tabIndex={-1}") &&
      app.includes("dismissAllOverlays()") &&
      app.includes("widgetNavigationQueue.current = widgetNavigationQueue.current") &&
      widgetDismissIndex >= 0 &&
      widgetDismissIndex < widgetCleanupDelayIndex &&
      widgetCleanupDelayIndex < widgetHealIndex &&
      app.includes("healStrandedScrollLock({ restoreScroll: false })") &&
      app.includes("widgetLinkDestination(target)"));
  check("§36 NATIVE-002 (web): Escape closes only the topmost More overlay",
    tabBar.includes("isTopOverlay(overlayId)") &&
      tabBar.includes("e.stopImmediatePropagation()"));
  const promptRequested = widgetPinRequestMessage({
    requested: true,
    reason: "supported",
    token: "request-1"
  });
  check("§36 Android pin truth: a requested prompt never claims installation",
    promptRequested.includes("confirmation prompt") &&
      promptRequested.includes("only after you approve") &&
      !promptRequested.includes("was added"));
  check("§36 Android pin truth: only the positive callback claims installation",
    widgetPinConfirmationMessage("verse") ===
      "Verse of the Day was added to your Home Screen.");
  check("§36 Android pin truth: unsupported API and launcher states stay distinct",
    widgetPinRequestMessage({ requested: false, reason: "android_version" })
      .includes("Android version") &&
      widgetPinRequestMessage({ requested: false, reason: "launcher_or_profile" })
        .includes("launcher or device profile"));
  check("§36 widget configuration counts refresh after returning from the Home Screen",
    widgetsPage.includes('addListener("appStateChange"') &&
      widgetsPage.includes('document.addEventListener("visibilitychange"') &&
      widgetsPage.includes("if (isActive) refresh()"));
  check("§36 native widget settings retry after a corrected manual clock",
    app.includes('document.addEventListener("visibilitychange", onVisible)') &&
      app.includes('CapApp.addListener("appStateChange", ({ isActive })') &&
      app.includes("if (isActive) scheduleSync()"));

  // ── Native shells (source-shape guards; the iOS/Android CI builds prove them) ──
  const calSwift = read("ios/WidgetExtension/CalendarWidgets.swift");
  const votdSwift = read("ios/WidgetExtension/FidelisWidget.swift");
  const widgetContractsSwift = read("ios/WidgetExtension/WidgetContracts.swift");
  const infoPlist = read("ios/App/App/Info.plist");
  const calData = read("android/app/src/main/java/app/fidelis/bible/CalendarData.java");
  const calJava = read("android/app/src/main/java/app/fidelis/bible/CalendarWidget.java");
  const votdJava = read("android/app/src/main/java/app/fidelis/bible/VotdWidget.java");
  const quoteJava = read("android/app/src/main/java/app/fidelis/bible/QuoteWidget.java");
  const manifest = read("android/app/src/main/AndroidManifest.xml");

  // FID-PERF-004: memoize the widgets' calendar.json decode.
  check("§36 PERF-004 (iOS): CalendarWidgets memoizes the calendar decode",
    calSwift.includes("calendarCache") &&
      !calSwift.includes("case invalid"));

  // ── v1.24.2: a missing App Group must not blank the calendar widgets ────────
  // v1.24.0 made loadCalendar() refuse outright without the App Group. The
  // entitlement had never actually shipped (see §39), so that check was always
  // false on device and the Mass and Quote widgets showed "Open Fidelis to
  // update" forever, while Verse of the Day — which reads votd.json and never
  // consults the group — kept working. The rule is now per DAY, not per widget:
  // with no known jurisdiction the snapshot's default profile stands in, and a
  // day is served only where every supported profile resolves it identically.
  const gospelIntentSwift = read("ios/App/App/TodaysGospelIntent.swift");
  check("§36 the calendar widgets no longer refuse outright without the App Group",
    !calSwift.includes("guard WidgetSharedSettings.isAvailable else { return nil }") &&
      !gospelIntentSwift.includes("WidgetSharedSettings.isAvailable,"));
  check("§36 an unknown jurisdiction is carried, not guessed",
    widgetContractsSwift.includes("jurisdictionIsKnown: requestedProfile != nil") &&
      widgetContractsSwift.includes("func speaksFor(") &&
      widgetContractsSwift.includes("if jurisdictionIsKnown { return true }"));
  check("§36 both widget surfaces and Siri consult the unanimity gate",
    calSwift.includes("calendar.speaksFor(key, on: surface)") &&
      calSwift.includes("on: .mass") &&
      calSwift.includes("on: .quote") &&
      widgetContractsSwift.includes("calendar.speaksFor(dayKey, on: .mass)"));
  check("§36 a snapshot with no unanimity table stays fail-closed, never blank-fails",
    widgetContractsSwift.includes("decodeIfPresent(") &&
      widgetContractsSwift.includes("unanimity?.mass ?? []"));

  // The table is data, so prove the DATA, not just the source shape: recompute
  // it from the emitted profiles and require an exact match. A hand-edited or
  // stale table would otherwise let the widgets speak for a day whose answer
  // genuinely depends on the jurisdiction.
  const calSnapshot36 = JSON.parse(
    readFileSync(join(ROOT, "ios/WidgetExtension/calendar.json"), "utf8")
  ) as {
    unanimity?: { mass: string[]; quote: string[] };
    profiles: Record<string, { days: Record<string, Record<string, unknown>> }>;
  };
  const recomputeUnanimous36 = (
    signature: (day: Record<string, unknown>) => string
  ): string[] => {
    const ids = Object.keys(calSnapshot36.profiles);
    const [first, ...rest] = ids;
    return Object.keys(calSnapshot36.profiles[first].days)
      .sort()
      .filter((key) => {
        const expected = signature(calSnapshot36.profiles[first].days[key]);
        return rest.every((id) => {
          const day = calSnapshot36.profiles[id].days[key];
          return day !== undefined && signature(day) === expected;
        });
      });
  };
  const massSig36 = (d: Record<string, unknown>) =>
    JSON.stringify([d.celebration, d.seasonLabel, d.readings, d.formularyState ?? null]);
  const quoteSig36 = (d: Record<string, unknown>) => JSON.stringify(d.quote ?? null);
  check("§36 the emitted unanimity table matches a fresh recomputation",
    Boolean(calSnapshot36.unanimity) &&
      JSON.stringify(calSnapshot36.unanimity?.mass) ===
        JSON.stringify(recomputeUnanimous36(massSig36)) &&
      JSON.stringify(calSnapshot36.unanimity?.quote) ===
        JSON.stringify(recomputeUnanimous36(quoteSig36)));
  check("§36 the unanimity table covers most of the window on both surfaces",
    (calSnapshot36.unanimity?.mass.length ?? 0) >=
      Object.keys(calSnapshot36.profiles["roman.general"].days).length * 0.9 &&
      (calSnapshot36.unanimity?.quote.length ?? 0) > 0);
  const calBuilderSrc36 = read("scripts/build-calendar-widget.ts");
  check("§36 the calendar builder emits the unanimity table it documents",
    calBuilderSrc36.includes("unanimity: { mass: unanimousDays(massSignature)") &&
      calBuilderSrc36.includes("entry.formularyState ?? null"));
  check("§36 PERF-004 (Android): CalendarData memoizes; both widgets delegate",
    calData.includes("SoftReference") &&
      calJava.includes("CalendarData.load(context)") &&
      quoteJava.includes("CalendarData.load(context)"));
  const widgetAppearanceJava = read(
    "android/app/src/main/java/app/fidelis/bible/WidgetAppearance.java"
  );
  check("§36 Android System appearance retains day/night resource aliases",
    widgetAppearanceJava.includes("usesSystemResources(appearance)") &&
      widgetAppearanceJava.includes("return;") &&
      !manifest.includes("android.intent.action.CONFIGURATION_CHANGED"));

  // FID-NATIVE-002 (iOS): every widget carries a widgetURL; the scheme is registered.
  check("§36 NATIVE-002 (iOS): the three widgets carry widgetURL(fidelis://…)",
    widgetContractsSwift.includes('URL(string: "fidelis://\\(rawValue)")') &&
      votdSwift.includes("widgetURL(FidelisWidgetDescriptor.verse.destinationURL)") &&
      calSwift.includes("widgetURL(FidelisWidgetDescriptor.mass.destinationURL)") &&
      calSwift.includes("widgetURL(FidelisWidgetDescriptor.quote.destinationURL)"));
  const javaFingerprint = (constant: string): string | null => {
    const assignment = calData.match(
      new RegExp(`private static final String ${constant}\\s*=([\\s\\S]*?);`)
    )?.[1];
    return assignment
      ? [...assignment.matchAll(/"([^"]*)"/g)].map((match) => match[1]).join("")
      : null;
  };
  const javaFingerprintConstants: Record<string, string> = {
    "roman.general": "GENERAL_PROFILE_FINGERPRINT",
    "roman.us.ascension-sunday": "US_ASCENSION_SUNDAY_PROFILE_FINGERPRINT",
    "roman.us.ascension-thursday": "US_ASCENSION_THURSDAY_PROFILE_FINGERPRINT"
  };
  check("§36 native calendars bind the selected derived lectionary fingerprint exactly",
    widgetContractsSwift.includes(DEFAULT_LECTIONARY_PACK_FINGERPRINT) &&
      widgetContractsSwift.includes("lectionaryPack.fingerprint") &&
      javaFingerprint("LECTIONARY_PACK_FINGERPRINT") ===
        DEFAULT_LECTIONARY_PACK_FINGERPRINT &&
      calData.includes("isSupportedLectionaryPack(WidgetSharedSettings.lectionaryPack(context))"));
  check("§36 calendar fingerprints match the Swift and Android fail-closed constants exactly",
    SUPPORTED_CALENDAR_PROFILES.every((profile) =>
      widgetContractsSwift.includes(`"${profile.id}":`) &&
      widgetContractsSwift.includes(`"${profile.fingerprint}"`) &&
      javaFingerprint(javaFingerprintConstants[profile.id]) === profile.fingerprint
    ));
  check("§36 NATIVE-002 (iOS): Info.plist registers the fidelis URL scheme",
    infoPlist.includes("CFBundleURLTypes") && infoPlist.includes("<string>fidelis</string>"));

  // FID-NATIVE-002 (Android): the scheme is filtered; each widget opens its own part.
  check("§36 NATIVE-002 (Android): MainActivity filters the fidelis scheme",
    manifest.includes('android:scheme="fidelis"'));
  check("§36 NATIVE-002 (Android): the Mass widget opens fidelis://mass",
    calJava.includes('Uri.parse("fidelis://mass")'));
  check("§36 NATIVE-002 (Android): the Verse and Quote widgets open their own cards",
    votdJava.includes('Uri.parse("fidelis://verse")') &&
      quoteJava.includes('Uri.parse("fidelis://quote")'));

  // ── Security (FID-SEC-001 wording, FID-SEC-002 Report-Only CSP) ───────────────
  check("§36 SEC-001: Settings names the build-time seal", settings.includes("verified at build"));
  check("§36 SEC-001: About names the build-time seal, not a runtime check",
    about.includes("Verified at build") && about.includes("build-time seal"));

  check("§36 SEC-002: public/_headers ships a Report-Only CSP",
    headers.includes("Content-Security-Policy-Report-Only"));
  const preScript = /<script>([\s\S]*?)<\/script>/.exec(html);
  const preHash = preScript
    ? "sha256-" + createHash("sha256").update(preScript[1], "utf8").digest("base64")
    : "";
  check("§36 SEC-002: the CSP pins the EXACT pre-paint script hash (drift gate)",
    !!preScript && headers.includes(`'${preHash}'`),
    preHash ? `expected ${preHash} in _headers` : "no inline <script> in index.html");
  // The hash above is computed from SOURCE index.html, but the browser loads the
  // BUILT dist/index.html. Vite passes the attribute-less pre-paint <script>
  // through verbatim, so they agree — pin that: when a build exists, assert the
  // dist script is byte-identical to source, so a future HTML transform that
  // diverged them (silently invalidating the shipped hash, and breaking the
  // deferred enforcing-<meta> migration) turns red instead of sailing through.
  // Skipped on a bare `npm test` with no dist (existsSync guard) — never a false red.
  const distIndexPath = join(ROOT, "dist/index.html");
  if (existsSync(distIndexPath)) {
    const distScript = /<script>([\s\S]*?)<\/script>/.exec(readFileSync(distIndexPath, "utf8"));
    check("§36 SEC-002: the built dist pre-paint script matches source (CSP hash stays valid)",
      !!distScript && !!preScript && distScript[1] === preScript[1]);
  }
  check("§36 SEC-002: docs/SECURITY.md documents the CSP + integrity model",
    existsSync(join(ROOT, "docs/SECURITY.md")));
}

// ── 37. v1.21.0 "that nothing be lost" — the storage shadow (audit FID-STOR-002).
// A refused localStorage write must not lose the value: it lives on in a session
// shadow that reads prefer (so the UI stays consistent), saveSettings merges
// over (so a later change can't revert an earlier one), Export includes (so the
// banner's recovery is real), and the next successful write re-persists. Plus
// the read-path shape guards (a corrupt key degrades to empty, never crashes a
// render) and the import result honestly reporting a failed persist.
console.log("");
{
  const storage = await import("../src/lib/storage");
  // §33 above may have left its throwing stub installed (Node has no real
  // localStorage to restore to) — install our own Map-backed stub with a
  // failure toggle, and put back whatever we found when done.
  const prevLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  let failing = true;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        if (failing) throw new DOMException("full", "QuotaExceededError");
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k)
    }
  });
  try {
    const bm = { translation: "drc", book: "john", chapter: 3, verse: 16 };
    check("§37 shadow: a refused bookmark still reports added", storage.toggleBookmark(bm) === true);
    check("§37 shadow: the refused bookmark survives the session (reads prefer the shadow)",
      storage.getBookmarks().some((b) => storage.refKey(b) === storage.refKey(bm)));
    const first = storage.saveSettings({ theme: "night" });
    const second = storage.saveSettings({ fontSize: 22 });
    check("§37 shadow: consecutive refused settings writes preserve BOTH changes",
      first.theme === "night" && second.theme === "night" && second.fontSize === 22);
    storage.setNote({ book: "john", chapter: 3, verse: 16 }, "kept");
    storage.setHighlight({ book: "john", chapter: 3, verse: 16 }, "gold");
    check("§37 shadow: a refused highlight survives the session too",
      storage.getHighlights().some((h) => h.verse === 16 && h.color === "gold"));
    const exported = storage.exportMarginalia();
    check("§37 shadow: Export contains the refused marginalia (the recovery is real)",
      exported.bookmarks.some((b) => b.book === "john" && b.verse === 16) &&
        exported.notes.some((n) => n.text === "kept") &&
        exported.highlights.some((h) => h.color === "gold"));
    const file = JSON.stringify({
      app: "fidelis",
      version: 1,
      exportedAt: "x",
      bookmarks: [{ translation: "drc", book: "mark", chapter: 1, verse: 1, createdAt: 5 }],
      highlights: [],
      notes: []
    });
    const imported = storage.importMarginalia(file);
    check("§37 shadow: import reports its counts AND that nothing persisted",
      imported.bookmarks === 1 && imported.persisted === false);
    // The quota clears: the next successful write re-persists every stranded key.
    failing = false;
    storage.saveSettings({});
    check("§37 shadow: a successful write flushes every stranded key to storage",
      !!store.get("fidelis:bookmarks") &&
        JSON.parse(store.get("fidelis:settings") ?? "{}").theme === "night" &&
        JSON.parse(store.get("fidelis:settings") ?? "{}").fontSize === 22);
    store.set("fidelis:bookmarks", "[]");
    check("§37 shadow: drained after the flush — reads follow real storage again",
      storage.getBookmarks().length === 0);
    // Read-path shape guards: a corrupt or foreign-typed value parses cleanly
    // and then must degrade to empty — one bad `plans` key blanked Today.
    store.set("fidelis:plans", "{}");
    let planCrash = false;
    let active: unknown = "unset";
    try {
      active = storage.activePlan();
    } catch {
      planCrash = true;
    }
    check("§37 read guard: a corrupt plans key degrades to [] and cannot crash activePlan()",
      !planCrash && active === null && storage.getPlans().length === 0);
    store.set("fidelis:bookmarks", "5");
    check("§37 read guard: a non-array bookmarks key degrades to []",
      Array.isArray(storage.getBookmarks()) && storage.getBookmarks().length === 0);
    store.set("fidelis:lastRead", JSON.stringify({ nonsense: true }));
    check("§37 read guard: a shapeless lastRead degrades to null (Home cannot crash)",
      storage.getLastRead() === null);
  } finally {
    if (prevLocalStorage) Object.defineProperty(globalThis, "localStorage", prevLocalStorage);
  }

  // The banner speaks the SHADOW contract: changes are kept for the session
  // (not "may be lost" while the app is open) and Export is the real recovery.
  const appSrcShadow = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  check("§37 banner: the copy names session retention (kept for this session)",
    appSrcShadow.includes("kept for this session"));

  // ── Honest loader failure (audit sweep): loadSaints/loadHistory must
  // distinguish genuine absence ("no entry" — cached null, the calm state)
  // from a transport/HTTP failure (REJECT, so Home's failed state and the
  // detail pages' connection notices are reachable, instead of the false
  // "being gathered" line on an offline blip). Absence has THREE host shapes:
  // a real 404 (a static host without rewrites); a 200 that serves the HTML
  // app shell for a file that isn't there (any SPA-fallback host — the dev
  // server, `vite preview`, the static PWA host); and, on the Capacitor
  // native shells, a fetch REJECTION — the bundled corpus is served from
  // disk and the asset handler fails the URL scheme task for a file that
  // isn't there (no HTTP status at all). Treating only 404 as absence made
  // a covered saint beside an uncovered history day (July 19) read a false
  // "couldn't be loaded"; on iOS the false notice survived v1.22.2 until
  // the rejection shape joined the contract (v1.22.4). Shape guards, §25
  // manner — data.ts can't be imported under tsx (import.meta.env).
  const dataSrcShadow = readFileSync(join(ROOT, "src/lib/data.ts"), "utf8");
  check("§37 loaders: fetchDayJson treats a 404 as absence and rethrows HTTP failures",
    /async function fetchDayJson[\s\S]*?status === 404[\s\S]*?return null;[\s\S]*?if \(!r\.ok\) throw new Error/.test(dataSrcShadow));
  check("§37 loaders: fetchDayJson treats the SPA-fallback HTML shell as absence, not a failure",
    /async function fetchDayJson[\s\S]*?JSON\.parse[\s\S]*?\/\^\\s\*<\/\.test\(body\)[\s\S]*?return null;/.test(dataSrcShadow));
  check("§37 loaders: fetchDayJson treats a fetch rejection as absence on the native shells ONLY (the bundle is the truth there)",
    /async function fetchDayJson[\s\S]*?catch \(err\)[\s\S]*?Capacitor\.isNativePlatform\(\)[\s\S]*?return null;[\s\S]*?throw err;/.test(dataSrcShadow) &&
    dataSrcShadow.includes('import { Capacitor } from "@capacitor/core";'));
  check("§37 loaders: loadSaints and loadHistory route through fetchDayJson and rethrow after dropping the key",
    /export function loadSaints[\s\S]*?fetchDayJson<SaintDay>[\s\S]*?saintsCache\.delete\(day\);[\s\S]*?throw err;/.test(dataSrcShadow) &&
    /export function loadHistory[\s\S]*?fetchDayJson<HistoryDay>[\s\S]*?historyCache\.delete\(day\);[\s\S]*?throw err;/.test(dataSrcShadow));
  const settingsSrcShadow = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  check("§37 loaders: Settings never offers the offline download on native (the whole corpus ships inside the app)",
    settingsSrcShadow.includes("Capacitor.isNativePlatform()") && settingsSrcShadow.includes("On this device"));
  const homeSrcShadow = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  check("§37 loaders: Home tracks the saint failure and silences the calm line on it",
    homeSrcShadow.includes("saintFailed") && homeSrcShadow.includes("!saintFailed"));
  const saintPageSrc = readFileSync(join(ROOT, "src/pages/Saint.tsx"), "utf8");
  const historyPageSrc = readFileSync(join(ROOT, "src/pages/History.tsx"), "utf8");
  check("§37 loaders: the Saint page has a failed state distinct from not-in-collection",
    saintPageSrc.includes('"failed"') && saintPageSrc.includes("return with your connection"));
  check("§37 loaders: the History page has a failed state distinct from no-entry",
    historyPageSrc.includes('"failed"') && historyPageSrc.includes("return with your connection"));
}

// ── 38. v1.21.0 "that nothing be lost" — corpus integrity (audit FID-CONTENT-001
// + the verification sweep): one authoritative record per event (the v1.20.0
// merge slipped six same-day-same-year duplicates past the id gate), events
// keyed to the date they HAPPENED (not their feast), saint ranks that agree
// with the General Roman Calendar and the engine, and the builder gate that
// keeps all of it true.
console.log("");
{
  const historyCorpus = JSON.parse(
    readFileSync(join(ROOT, "scripts/history.corpus.json"), "utf8")
  ) as { events: { id: string; day: string; year: number; title: string }[] };
  const byDayYear = new Map<string, string[]>();
  for (const e of historyCorpus.events) {
    const k = `${e.day}|${e.year}`;
    byDayYear.set(k, [...(byDayYear.get(k) ?? []), e.id]);
  }
  const collisions = [...byDayYear.entries()].filter(([, ids]) => ids.length > 1);
  check("§38 history: no two events share a day AND a year (the six duplicate pairs are merged)",
    collisions.length === 0,
    collisions.map(([k, ids]) => `${k}: ${ids.join(" / ")}`).join("; "));
  const removedDupIds = [
    "first-council-of-nicaea",
    "death-of-gregory-vii",
    "capture-of-jerusalem-first-crusade",
    "death-of-st-francis",
    "battle-of-lepanto",
    "definition-immaculate-conception-1854"
  ];
  check("§38 history: the six duplicate record ids are gone (curated ids kept)",
    removedDupIds.every((id) => !historyCorpus.events.some((e) => e.id === id)) &&
      ["council-of-nicaea-opens", "gregory-vii-dies-canossa", "jerusalem-taken-first-crusade",
        "assisi-francis-dies", "lepanto", "definition-immaculate-conception"]
        .every((id) => historyCorpus.events.some((e) => e.id === id)));
  const dayOf = (id: string) => historyCorpus.events.find((e) => e.id === id)?.day;
  check("§38 history: events are keyed to the date they happened, not their feast",
    dayOf("death-of-john-chrysostom-407") === "09-14" &&
      dayOf("martyrdom-of-cyprian-258") === "09-14" &&
      dayOf("founding-of-the-mercedarians-1218") === "08-10" &&
      dayOf("edict-of-milan") === "06-13");
  const historyBuilder = readFileSync(join(ROOT, "scripts/build-history.mjs"), "utf8");
  check("§38 history: the builder gates same-day-same-year duplicate candidates",
    historyBuilder.includes("same-day-same-year") && historyBuilder.includes("DISTINCT_SAME_DAY_YEAR"));

  const saintsCorpus = JSON.parse(
    readFileSync(join(ROOT, "scripts/saints.corpus.json"), "utf8")
  ) as { saints: { id: string; rank: string }[] };
  const rankOf = (id: string) => saintsCorpus.saints.find((s) => s.id === id)?.rank;
  check("§38 saints: St. Francis of Assisi is a Memorial (GRC), matching the engine",
    rankOf("francis-of-assisi") === "Memorial");
  check("§38 saints: St. David of Wales carries the corpus's non-GRC rank (Commemoration)",
    rankOf("david-of-wales") === "Commemoration");
  check("§38 engine: St. Patrick is an optional memorial (GRC memoria ad libitum)",
    GENERAL_ROMAN_PACK.celebrations.some(
      (celebration) =>
        celebration.name === "St. Patrick, Bishop" &&
        celebration.rank === "Memorial" &&
        celebration.optional === true
    ));

  // ── Privacy honesty under OS backup (audit FID-PRIV-001, Option B: disclose).
  // The configuration allows OS backups (android:allowBackup, no iOS exclusion),
  // so the promise must match the configuration: PRIVACY.md — the App-Store-
  // linked policy — discloses device backups, the absolute claims are gone, and
  // "sends nothing" stays pointed at Fidelis (true) instead of the device.
  const androidManifest = readFileSync(
    join(ROOT, "android/app/src/main/AndroidManifest.xml"), "utf8");
  const privacyDoc = readFileSync(join(ROOT, "PRIVACY.md"), "utf8");
  if (/android:allowBackup="true"/.test(androidManifest)) {
    check("§38 privacy: with Android backup enabled, PRIVACY.md discloses device backups",
      privacyDoc.includes("## Device backups"));
    check("§38 privacy: the absolute deletion claim is gone (backups can outlive the app)",
      !privacyDoc.includes("Deleting the app deletes all of it."));
    check("§38 privacy: 'never transmitted' is qualified — by Fidelis, not by the device",
      !privacyDoc.includes("never transmitted anywhere.") &&
        privacyDoc.includes("never transmitted anywhere by Fidelis"));
  }
  const aboutSrc38 = readFileSync(join(ROOT, "src/pages/About.tsx"), "utf8");
  const settingsSrc38 = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  const translationsSrc38 = readFileSync(join(ROOT, "src/pages/Translations.tsx"), "utf8");
  const readme38 = readFileSync(join(ROOT, "README.md"), "utf8");
  const appStore38 = readFileSync(join(ROOT, "docs/guides/APP_STORE.md"), "utf8");
  const librarySrc38 = readFileSync(join(ROOT, "src/pages/Library.tsx"), "utf8");
  check("§38 privacy: no surface claims data can never leave the device (backups may carry it)",
    !aboutSrc38.includes("live only in your browser") &&
      !settingsSrc38.includes("live only in this browser") &&
      !settingsSrc38.includes("stored only on this device") &&
      !librarySrc38.includes("lives only in this browser") &&
      !translationsSrc38.includes("never leaves your device") &&
      !translationsSrc38.includes("Stored only on this device") &&
      !readme38.includes("never leaves the device") &&
      !readme38.includes("stored only in your browser") &&
      !appStore38.includes("never leaves your device"));
  check("§38 privacy: docs/SECURITY.md points the no-data claim at Fidelis, not the device",
    !readFileSync(join(ROOT, "docs/SECURITY.md"), "utf8")
      .replace(/\s+/g, " ")
      .includes("no user data leaves the device"));
}

// ── 39. v1.22.1 — the UI polish batch (audit UX findings): worship surfaces drop
// their developer artifacts, the NABRE fallback notice shows once per page, plans
// get an explainer, dependent Settings switches nest visually, and two Latin
// fragments speak as Latin.
console.log("");
{
  const rtSrc = readFileSync(join(ROOT, "src/components/ReadingText.tsx"), "utf8");
  const rdSrc = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");
  const stSrc = readFileSync(join(ROOT, "src/pages/Settings.tsx"), "utf8");
  const blSrc = readFileSync(join(ROOT, "src/pages/BookList.tsx"), "utf8");
  const appSrc39 = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  const homeSrc39 = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
  const cssSrc39 = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const appStoreSrc39 = readFileSync(join(ROOT, "docs/guides/APP_STORE.md"), "utf8");
  const iosPackageSrc39 = readFileSync(
    join(ROOT, "ios/App/CapApp-SPM/Package.swift"),
    "utf8"
  );
  const testFlightScriptSrc39 = readFileSync(
    join(ROOT, "scripts/ios-testflight.sh"),
    "utf8"
  );
  const testFlightDispatchSrc39 = readFileSync(
    join(ROOT, "scripts/ios-testflight-dispatch.sh"),
    "utf8"
  );
  const iosExportVerifierSrc39 = readFileSync(
    join(ROOT, "scripts/verify-ios-export.ts"),
    "utf8"
  );
  const packageVersion39 = (JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8")
  ) as { version: string }).version;

  const releaseContract39 = (
    appGroups: unknown[] = [REQUIRED_IOS_APP_GROUP],
    widgetGroups: unknown[] = [REQUIRED_IOS_APP_GROUP]
  ): IosReleaseContract => ({
    expectedVersion: packageVersion39,
    expectedBuild: "999",
    app: {
      bundleIdentifier: IOS_APP_BUNDLE_ID,
      version: packageVersion39,
      build: "999",
      entitlements: { "com.apple.security.application-groups": appGroups }
    },
    widget: {
      bundleIdentifier: IOS_WIDGET_BUNDLE_ID,
      version: packageVersion39,
      build: "999",
      entitlements: { "com.apple.security.application-groups": widgetGroups }
    }
  });
  const releaseContractRejects39 = (contract: IosReleaseContract): boolean => {
    try {
      assertIosReleaseContract(contract);
      return false;
    } catch {
      return true;
    }
  };
  /** The non-fatal App Group findings; empty when both targets carry it. */
  const releaseContractWarnings39 = (contract: IosReleaseContract): string[] => {
    try {
      return assertIosReleaseContract(contract);
    } catch {
      return [];
    }
  };
  const validReleaseContract39 = releaseContract39();
  let validReleaseContractAccepted39 = true;
  try {
    assertIosReleaseContract(validReleaseContract39);
  } catch {
    validReleaseContractAccepted39 = false;
  }
  const suffixOnlyContract39 = releaseContract39(
    [`${REQUIRED_IOS_APP_GROUP}.staging`]
  );
  const missingWidgetGroupContract39 = releaseContract39(
    [REQUIRED_IOS_APP_GROUP],
    []
  );
  const mismatchedVersionContract39 = releaseContract39();
  mismatchedVersionContract39.widget.version = "0.0.0";
  const mismatchedBuildContract39 = releaseContract39();
  mismatchedBuildContract39.app.build = "998";
  const mismatchedBundleContract39 = releaseContract39();
  mismatchedBundleContract39.widget.bundleIdentifier = `${IOS_WIDGET_BUNDLE_ID}.staging`;

  const releaseDispatchRuns39 = (() => {
    const workDir = mkdtempSync(join(tmpdir(), "fidelis-ios-dispatch-"));
    try {
      const fakeNpx = join(workDir, "npx");
      const fakeXcrun = join(workDir, "xcrun");
      const fakeIpa = join(workDir, "App.ipa");
      const fakeKey = join(workDir, "AuthKey_test-key.p8");
      const logPath = join(workDir, "dispatch.log");
      writeFileSync(fakeNpx, `#!/usr/bin/env bash
printf 'verify\\n' >> "$IOS_RELEASE_TEST_LOG"
exit "\${FAKE_VERIFY_EXIT:-0}"
`);
      writeFileSync(fakeXcrun, `#!/usr/bin/env bash
if [ "\${2:-}" = "--validate-app" ]; then
  printf 'validate\\n' >> "$IOS_RELEASE_TEST_LOG"
  exit "\${FAKE_VALIDATE_EXIT:-0}"
fi
if [ "\${2:-}" = "--upload-app" ]; then
  printf 'upload\\n' >> "$IOS_RELEASE_TEST_LOG"
  exit "\${FAKE_UPLOAD_EXIT:-0}"
fi
exit 99
`);
      chmodSync(fakeNpx, 0o755);
      chmodSync(fakeXcrun, 0o755);
      writeFileSync(fakeIpa, "mock ipa");
      writeFileSync(fakeKey, "mock private key");

      const run = (
        verifyExit: number,
        validateExit: number,
        appStoreKeysDir = join(workDir, "keys")
      ) => {
        writeFileSync(logPath, "");
        const result = spawnSync(
          "bash",
          [
            join(ROOT, "scripts/ios-testflight-dispatch.sh"),
            fakeIpa,
            packageVersion39,
            "999"
          ],
          {
            cwd: ROOT,
            encoding: "utf8",
            env: {
              ...process.env,
              NPM_BIN: fakeNpx,
              XCRUN_BIN: fakeXcrun,
              IOS_RELEASE_TEST_LOG: logPath,
              FAKE_VERIFY_EXIT: String(verifyExit),
              FAKE_VALIDATE_EXIT: String(validateExit),
              FAKE_UPLOAD_EXIT: "0",
              ASC_KEY_ID: "test-key",
              ASC_ISSUER_ID: "test-issuer",
              ASC_KEY_PATH: fakeKey,
              APPSTORE_KEYS_DIR: appStoreKeysDir
            }
          }
        );
        const keyDestination = join(appStoreKeysDir, "AuthKey_test-key.p8");
        return {
          status: result.status,
          log: readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean),
          output: `${result.stdout}${result.stderr}`.trim(),
          keyMode: existsSync(keyDestination)
            ? statSync(keyDestination).mode & 0o777
            : null
        };
      };

      return {
        verifyFailure: run(7, 0),
        validationFailure: run(0, 8),
        success: run(0, 0),
        sameFileKeySuccess: run(0, 0, workDir)
      };
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  })();

  check("§39 ReadingText gates the fallback notice behind showFallbackNotice",
    rtSrc.includes("showFallbackNotice") &&
      /fellBackFrom\s*&&\s*showFallbackNotice\s*&&/.test(rtSrc));
  check("§39 the fallback notice renders once per page (first reading of the primary ladder)",
    rdSrc.includes("showFallbackNotice={si === 0 && i === 0}"));
  check("§39 the Mass footnote drops the raw lectionary code, keeps the USCCB link",
    !rdSrc.includes("Lectionary day:") && !rdSrc.includes("readings.code") &&
      rdSrc.includes("bible.usccb.org"));
  check("§39 calendar copy separates annual ordo evidence from engine projections",
    rdSrc.includes("annual official-ordo cross-check") &&
      rdSrc.includes("current-law") &&
      rdSrc.includes("not presented as a complete official yearly ordo") &&
      !rdSrc.includes("exact sourced and golden-verified"));
  check("§39 Settings drops the manifest hash, keeps verified-at-build and the About link",
    !stSrc.includes("rootHash") && stSrc.includes("Texts verified at build") &&
      stSrc.includes("/about"));
  check("§39 the Read tab explains reading plans in one line",
    blSrc.includes('to="/plans"') && blSrc.includes("at your pace"));
  const commentarySection = stSrc.match(
    /<section className="card" id="commentary">([\s\S]*?)<\/section>/
  )?.[1] ?? "";
  check("§39 the three dependent commentary switches nest visually",
    (commentarySection.match(/setting-row nested/g) ?? []).length === 3);
  check("§39 the nested rule uses tokens only (no raw hex)",
    /\.setting-row\.nested\s*\{[^}]*var\(--/.test(cssSrc39) &&
      !/\.setting-row\.nested\s*\{[^}]*#[0-9a-fA-F]{3,8}/.test(cssSrc39));
  check("§39 the footer motto and the rosary Latin name speak Latin",
    appSrc39.includes('className="motto" lang="la"') &&
      /lang="la"[^>]*>\(\{rosary\.latin\}\)/.test(homeSrc39));
  check("§39 the Mass toolbar select keeps its full label at ≥640px",
    cssSrc39.includes(".readings-toolbar select { max-width: none; }"));
  check("§39 the select override lives inside a ≥640px media block",
    /@media \(min-width: 640px\)\s*\{\s*\.readings-toolbar select/.test(cssSrc39));
  check("§39 App Store and TestFlight metadata follow the package version",
    appStoreSrc39.includes(`## Version\n\n\`\`\`\n${packageVersion39}\n\`\`\``) &&
      appStoreSrc39.includes(`What's New (${packageVersion39})`));
  check("§39 the committed Capacitor package preserves the app's iOS 15 floor",
    iosPackageSrc39.includes("platforms: [.iOS(.v15)]") &&
      !iosPackageSrc39.includes("platforms: [.iOS(.v17)]"));
  check("§39 the TestFlight sync restores the release-pinned Capacitor package",
    /npx cap sync ios[\s\S]*git (?:checkout --|restore) ios\/App\/CapApp-SPM\/Package\.swift/.test(
      testFlightScriptSrc39
    ) &&
      !testFlightScriptSrc39.includes("2>/dev/null || true") &&
      testFlightScriptSrc39.includes("could not restore the release-pinned") &&
      testFlightScriptSrc39.includes("platforms: [.iOS(.v15)]"));
  // v1.24.2: the archive must DECLARE its entitlements, or export re-signs from
  // nothing and the App Group is dropped — which is how every build up to 304
  // shipped widgets that could not read the app's calendar selection. Nested
  // code signs before its container, and both must come before the export.
  check("§39 the archive declares its entitlements before export",
    testFlightScriptSrc39.includes("codesign --force --sign - --generate-entitlement-der") &&
      testFlightScriptSrc39.includes(
        "--entitlements ios/WidgetExtension/WidgetExtension.entitlements"
      ) &&
      testFlightScriptSrc39.includes("--entitlements ios/App/App/App.entitlements") &&
      testFlightScriptSrc39.indexOf("WidgetExtension.entitlements") <
        testFlightScriptSrc39.indexOf("--entitlements ios/App/App/App.entitlements") &&
      testFlightScriptSrc39.indexOf("--entitlements ios/App/App/App.entitlements") <
        testFlightScriptSrc39.indexOf("xcodebuild -exportArchive"));
  check("§39 the pipeline can verify a signing change without spending a build",
    testFlightScriptSrc39.includes("FIDELIS_VERIFY_ONLY") &&
      testFlightScriptSrc39.includes("ios-testflight-dispatch.sh --verify-only"));
  // v1.24.2: the App Group is ENFORCED again, because it is finally
  // enforceable. v1.24.1 downgraded it to a warning since the pipeline archived
  // unsigned — the archive declared no entitlements, export re-signed from that,
  // and no build ever carried the group (293 and 304 included), so failing
  // closed blocked every release while protecting nothing that had ever worked.
  // ios-testflight.sh step [2b/6] now ad-hoc signs the archive with each
  // target's entitlements before export, proved against a real export. A build
  // that loses the group is one whose widgets cannot read the app's calendar
  // selection — exactly the v1.24.0 regression — so it must not ship.
  check("§39 signed iOS contracts accept the exact shared App Group",
    validReleaseContractAccepted39 &&
      releaseContractWarnings39(validReleaseContract39).length === 0);
  check("§39 a substring-only App Group fails the release closed",
    releaseContractRejects39(suffixOnlyContract39));
  check("§39 a missing widget App Group fails the release closed",
    releaseContractRejects39(missingWidgetGroupContract39));
  check("§39 the App Group failure names the target that lost it",
    (() => {
      try {
        assertIosReleaseContract(missingWidgetGroupContract39);
        return false;
      } catch (error) {
        return (error as Error).message.startsWith("widget entitlements do not contain");
      }
    })());
  check("§39 signed iOS contracts reject app/widget version drift",
    releaseContractRejects39(mismatchedVersionContract39));
  check("§39 signed iOS contracts reject app/widget build drift",
    releaseContractRejects39(mismatchedBuildContract39));
  check("§39 signed iOS contracts reject bundle-identifier drift",
    releaseContractRejects39(mismatchedBundleContract39));
  check("§39 the signed-IPA verifier parses DER entitlements structurally",
    iosExportVerifierSrc39.includes('"--der"') &&
      iosExportVerifierSrc39.includes('"/usr/bin/derq"') &&
      iosExportVerifierSrc39.includes("assertIosReleaseContract"));
  check("§39 the release entry point delegates the irreversible dispatch pipeline",
    testFlightScriptSrc39.includes(
      'bash scripts/ios-testflight-dispatch.sh "$IPA" "$EXPECTED_VERSION" "$BUILD_NUMBER"'
    ) &&
      !testFlightScriptSrc39.includes("altool --upload-app"));
  check("§39 a failed signed-IPA verification prevents validation and upload",
    releaseDispatchRuns39.verifyFailure.status === 7 &&
      isDeepStrictEqual(releaseDispatchRuns39.verifyFailure.log, ["verify"]));
  const validationFailureStopsUpload39 =
    releaseDispatchRuns39.validationFailure.status === 8 &&
      isDeepStrictEqual(
        releaseDispatchRuns39.validationFailure.log,
        ["verify", "validate"]
      );
  check("§39 a failed App Store validation prevents upload",
    validationFailureStopsUpload39,
    validationFailureStopsUpload39
      ? ""
      : JSON.stringify(releaseDispatchRuns39.validationFailure));
  const successfulDispatchOrder39 =
    releaseDispatchRuns39.success.status === 0 &&
      isDeepStrictEqual(
        releaseDispatchRuns39.success.log,
        ["verify", "validate", "upload"]
      ) &&
      /verify-ios-export\.ts[\s\S]*altool --validate-app[\s\S]*altool --upload-app/.test(
        testFlightDispatchSrc39
      );
  check("§39 TestFlight dispatch orders verification, validation, then upload",
    successfulDispatchOrder39,
    successfulDispatchOrder39 ? "" : JSON.stringify(releaseDispatchRuns39.success));
  const sameFileKeyDispatch39 =
    releaseDispatchRuns39.sameFileKeySuccess.status === 0 &&
      releaseDispatchRuns39.sameFileKeySuccess.keyMode === 0o600 &&
      isDeepStrictEqual(
        releaseDispatchRuns39.sameFileKeySuccess.log,
        ["verify", "validate", "upload"]
      );
  check("§39 a key already in App Store Connect's directory does not abort dispatch",
    sameFileKeyDispatch39,
    sameFileKeyDispatch39
      ? ""
      : JSON.stringify(releaseDispatchRuns39.sameFileKeySuccess));
}

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : "all checks passed"}`);
process.exitCode = failures ? 1 : 0;
