/** Trap-year harness for the liturgical engine. Run: npx tsx scripts/test-liturgical.ts */
import {
  CalendarRegion,
  accentFor,
  adventStart,
  baptismOfTheLord,
  calendarDateForRule,
  easterDate,
  epiphanyDate,
  liturgicalDay,
  resolveCalendarOccurrence
} from "../src/lib/liturgical";
import { dayCodeCandidates } from "../src/lib/lectionary";
import {
  CALENDAR_PRECEDENCE,
  CALENDAR_PACKS,
  GENERAL_ROMAN_PACK,
  US_ECCLESIASTICAL_PROVINCES,
  UNITED_STATES_PACK,
  calendarCelebrationRules,
  calendarProfile,
  compareCalendarPrecedence,
  individualChurchProperDateConflicts,
  normalizeIndividualChurchProper,
  normalizeCalendarProfile,
  profileForJurisdiction,
  validateIndividualChurchProper,
  type CalendarPrecedence
} from "../src/lib/calendarProfile";
import { readFileSync } from "node:fs";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;

let failures = 0;
const expect = (label: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

// 1. Easter computus against the known table
console.log("== Easter computus ==");
const EASTER: [number, string][] = [
  [2008, "2008-03-23"], [2011, "2011-04-24"], [2016, "2016-03-27"],
  [2024, "2024-03-31"], [2025, "2025-04-20"], [2026, "2026-04-05"],
  [2027, "2027-03-28"], [2030, "2030-04-21"], [2038, "2038-04-25"],
  [2049, "2049-04-18"], [2100, "2100-03-28"]
];
for (const [y, want] of EASTER) {
  expect(`Easter ${y} = ${want}`, iso(easterDate(y)) === want);
}

// 1b. First Sunday of Advent against the known table (each is a Sunday).
const ADVENT: [number, string][] = [
  [2023, "2023-12-03"], [2024, "2024-12-01"], [2025, "2025-11-30"],
  [2026, "2026-11-29"], [2027, "2027-11-28"]
];
for (const [y, want] of ADVENT) {
  expect(`Advent 1 ${y} = ${want} (Sunday)`, iso(adventStart(y)) === want && adventStart(y).getDay() === 0);
}

// (The former trap-day and day-code print dumps are superseded by the
//  golden-year snapshots in scripts/golden/, diffed by test-data.ts.)

// 4. P0-1/P0-2 acceptance.
const names = (x: Date) => liturgicalDay(x).celebrations.map((c) => c.name);
const has = (x: Date, frag: string) => names(x).some((n) => n.includes(frag));
const cand = (x: Date) => JSON.stringify(dayCodeCandidates(x));

console.log("\n== P0-1/P0-2 acceptance ==");
expect("Good Friday 2016 is red", liturgicalDay(d(2016, 3, 25)).color === "red");
expect("Annunciation absent on 2016-03-25", !has(d(2016, 3, 25), "Annunciation"));
expect("Annunciation present on 2016-04-04", has(d(2016, 4, 4), "Annunciation"));
expect("Annunciation absent on 2024-03-25", !has(d(2024, 3, 25), "Annunciation"));
expect("Monday of Holy Week 2024 is violet", liturgicalDay(d(2024, 3, 25)).color === "violet");
expect("Annunciation present on 2024-04-08", has(d(2024, 4, 8), "Annunciation"));
expect("Immaculate Conception absent on 2024-12-08", !has(d(2024, 12, 8), "Immaculate Conception"));
expect("2024-12-08 (2nd Sunday of Advent) is violet", liturgicalDay(d(2024, 12, 8)).color === "violet");
expect("Immaculate Conception present on 2024-12-09", has(d(2024, 12, 9), "Immaculate Conception"));
expect("First Sunday of Advent 2025 is violet", liturgicalDay(d(2025, 11, 30)).color === "violet");
expect("St. Andrew suppressed on 2025-11-30", !has(d(2025, 11, 30), "Andrew"));
expect("Ash Wednesday 2024 stands alone", names(d(2024, 2, 14)).join("|") === "Ash Wednesday");
expect("Christ the King 2026 shows no St. Cecilia", !has(d(2026, 11, 22), "Cecilia"));
// Universal-calendar case (Ascension on Thursday May 14 suppresses St. Matthias).
// The default region is now the USA, where Ascension transfers to Sunday and
// Matthias keeps May 14 — asserted explicitly in the region block below — so this
// universal assertion must name its region rather than rely on the default.
expect(
  "St. Matthias suppressed on Ascension 2026 (universal)",
  !liturgicalDay(d(2026, 5, 14), "universal").celebrations.some((c) => c.name.includes("Matthias"))
);
expect("Gaudete 2025: St. John of the Cross yields", !has(d(2025, 12, 14), "John of the Cross"));
// P0-2: day codes follow the resolved governing celebration
expect("Good Friday 2016 readings are the Passion", cand(d(2016, 3, 25)).startsWith('[["LW06-5Fri'));
expect("No Annunciation readings on 2024-03-25", !cand(d(2024, 3, 25)).includes("Annunciation"));
expect("Annunciation readings on 2024-04-08", cand(d(2024, 4, 8)).startsWith('[["Annunciation'));
expect("Immaculate Conception readings on 2024-12-09", cand(d(2024, 12, 9)).startsWith('[["Immaculate Conception'));
expect("Advent Sunday readings on 2024-12-08", cand(d(2024, 12, 8)).startsWith('[["AW02-0Sun'));
// two colliding obligatory memorials are both demoted to optional for the
// year (CDW Prot. 2671/98/L): the feria keeps the day
expect(
  "Immaculate Heart + St. Anthony 2026-06-13: both demoted, green feria",
  names(d(2026, 6, 13)).length === 0 && liturgicalDay(d(2026, 6, 13)).color === "green"
);
expect(
  "Immaculate Heart + St. Irenaeus 2025-06-28: both demoted",
  names(d(2025, 6, 28)).length === 0
);
// regression guards: resolved days that were already right must stay right
expect("Christmas Day 2022 lists the Nativity", has(d(2022, 12, 25), "Nativity of the Lord"));
// Christmas on a Sunday: Holy Family falls back to Dec 30 — a branch the
// 2024–2027 golden window never exercises (next occurrence 2033).
expect("Holy Family transferred to Dec 30 2022 (Christmas on Sunday)", has(d(2022, 12, 30), "Holy Family"));
expect("Dec 30 2022 readings are Holy Family", cand(d(2022, 12, 30)).startsWith('[["CW01-HolyFamily'));
expect("Holy Family absent from Dec 26 2022 (no octave Sunday)", !has(d(2022, 12, 26), "Holy Family"));
expect("All Souls governs Sunday 2025-11-02", has(d(2025, 11, 2), "All Souls"));
expect("Pentecost 2026 proper readings first", cand(d(2026, 5, 24)).startsWith('[["EW08-Pentecost'));
expect("St. Barnabas memorial listed on 2026-06-11", has(d(2026, 6, 11), "Barnabas"));
// (candidate ORDER only — resolveReadings promotes marked, obligatory
// memorial propers at the data layer; see test-data.ts section 3b)
expect("Candidates keep the ferial group before memorials", cand(d(2026, 6, 11)).startsWith('[["OW10-4Thu'));

// 5. P1-5 acceptance — calendar region (Universal / United States)
const namesR = (x: Date, r: CalendarRegion) => liturgicalDay(x, r).celebrations.map((c) => c.name);
const hasR = (x: Date, r: CalendarRegion, frag: string) => namesR(x, r).some((n) => n.includes(frag));
const allCalendarItems = (x: Date, r: CalendarRegion) => {
  const day = liturgicalDay(x, r);
  return [...day.celebrations, ...day.alternatives, ...day.suppressed];
};
const hasCalendarId = (x: Date, r: CalendarRegion, id: string) =>
  allCalendarItems(x, r).some((item) => item.id === id);
const candR = (x: Date, r: CalendarRegion) => JSON.stringify(dayCodeCandidates(x, r));

console.log("\n== P1-5 acceptance (calendar region) ==");
// Epiphany: USA Sunday of Jan 2–8; universal Jan 6, name without "(traditional date)"
expect("USA Epiphany 2026 on Sunday Jan 4", iso(epiphanyDate(2026, "usa")) === "2026-01-04");
expect("Universal Epiphany 2026 stays Jan 6", iso(epiphanyDate(2026, "universal")) === "2026-01-06");
expect("Epiphany celebrated Jan 4 2026 (USA)", hasR(d(2026, 1, 4), "usa", "Epiphany"));
expect("Epiphany readings Jan 4 2026 (USA)", candR(d(2026, 1, 4), "usa").startsWith('[["CW03-Epiphany'));
expect("No Epiphany on Jan 6 2026 (USA)", !hasR(d(2026, 1, 6), "usa", "Epiphany"));
expect(
  "Jan 6 2026 (USA) is the Tuesday after Epiphany",
  candR(d(2026, 1, 6), "usa").startsWith('[["CW03-Day2')
);
expect("Epiphany on Jan 6 2026 (universal)", hasR(d(2026, 1, 6), "universal", "Epiphany"));
expect(
  "Epiphany readings Jan 6 2026 (universal)",
  candR(d(2026, 1, 6), "universal").startsWith('[["CW03-Epiphany')
);
expect(
  "Epiphany label carries no '(traditional date)'",
  namesR(d(2026, 1, 6), "universal")[0] === "The Epiphany of the Lord"
);
expect(
  "2nd Sunday after Christmas readings Jan 4 2026 (universal)",
  candR(d(2026, 1, 4), "universal").startsWith('[["CW02-0Sun')
);
// Epiphany on Jan 7/8 pushes the Baptism to Monday (USA)
expect("USA Epiphany 2024 on Sunday Jan 7", iso(epiphanyDate(2024, "usa")) === "2024-01-07");
expect("USA Baptism 2024 on Monday Jan 8", iso(baptismOfTheLord(2024, "usa")) === "2024-01-08");
expect("Baptism readings Mon Jan 8 2024 (USA)", candR(d(2024, 1, 8), "usa").startsWith('[["CW04-Baptism'));
expect("USA Epiphany 2023 on Sunday Jan 8", iso(epiphanyDate(2023, "usa")) === "2023-01-08");
expect("USA Baptism 2023 on Monday Jan 9", iso(baptismOfTheLord(2023, "usa")) === "2023-01-09");
expect("Universal Baptism 2024 stays Sunday Jan 7", iso(baptismOfTheLord(2024, "universal")) === "2024-01-07");
expect(
  "Jan 9 2024 (USA) is Tuesday of OT week 1",
  liturgicalDay(d(2024, 1, 9), "usa").seasonLabel === "Tuesday of the First Week in Ordinary Time"
);
expect(
  "Jan 14 2024 (USA) is the Second Sunday in OT",
  liturgicalDay(d(2024, 1, 14), "usa").seasonLabel === "Second Sunday in Ordinary Time"
);
expect("Jan 14 2024 (USA) readings OW02-0Sun", candR(d(2024, 1, 14), "usa").startsWith('[["OW02-0Sun'));
// Ascension: USA Seventh Sunday of Easter
expect("Ascension absent Thu May 14 2026 (USA)", !hasR(d(2026, 5, 14), "usa", "Ascension"));
expect("St. Matthias keeps May 14 2026 (USA)", hasR(d(2026, 5, 14), "usa", "Matthias"));
expect("Ascension on Sunday May 17 2026 (USA)", hasR(d(2026, 5, 17), "usa", "Ascension"));
expect(
  "Ascension readings May 17 2026 (USA)",
  candR(d(2026, 5, 17), "usa").startsWith('[["EW07-Ascension')
);
expect(
  "7th Sunday of Easter readings May 17 2026 (universal)",
  candR(d(2026, 5, 17), "universal").startsWith('[["EW07-0Sun')
);
expect("Ascension on Thursday May 14 2026 (universal)", hasR(d(2026, 5, 14), "universal", "Ascension"));
// USA proper days: the Feast of Guadalupe and all six obligatory memorials
expect("St. Elizabeth Ann Seton Jan 4 2025 (USA)", hasR(d(2025, 1, 4), "usa", "Seton"));
expect("Seton suppressed by Epiphany Jan 4 2026 (USA)", !hasR(d(2026, 1, 4), "usa", "Seton"));
expect("St. John Neumann Jan 5 2026 (USA)", hasR(d(2026, 1, 5), "usa", "Neumann"));
expect("St. Kateri Tekakwitha Jul 14 2026 (USA)", hasR(d(2026, 7, 14), "usa", "Kateri"));
expect("No Kateri in the universal calendar", !hasR(d(2026, 7, 14), "universal", "Kateri"));
// v1.19.0 — St. Bonaventure (universal memorial, Doctor) was missing from the
// sanctoral table, so Jul 15 resolved as a plain green feria (the "no Saint" bug).
expect(
  "St. Bonaventure Jul 15 2026 is a white memorial in both regions",
  hasR(d(2026, 7, 15), "usa", "Bonaventure") &&
    hasR(d(2026, 7, 15), "universal", "Bonaventure") &&
    liturgicalDay(d(2026, 7, 15), "usa").color === "white"
);
expect("St. Peter Claver Sep 9 2026 (USA)", hasR(d(2026, 9, 9), "usa", "Claver"));
expect(
  "Sts. Brébeuf and Jogues Oct 19 2026 (USA), red",
  hasR(d(2026, 10, 19), "usa", "Brébeuf") && liturgicalDay(d(2026, 10, 19), "usa").color === "red"
);
expect(
  "Brébeuf/Jogues propers offered behind the ferial (USA)",
  candR(d(2026, 10, 19), "usa").startsWith('[["OW') && candR(d(2026, 10, 19), "usa").includes("Brébeuf")
);
expect("St. Frances Xavier Cabrini Nov 13 2026 (USA)", hasR(d(2026, 11, 13), "usa", "Cabrini"));
expect(
  "Claver remains a General optional memorial and is upgraded by the U.S. proper",
  liturgicalDay(d(2026, 9, 9), "universal").alternatives.some(
    (item) => item.name.includes("Claver") && item.optional
  ) &&
    liturgicalDay(d(2026, 9, 9), "usa").celebrations.some(
      (item) => item.name.includes("Claver") && !item.optional
    )
);
expect("Our Lady of Guadalupe Feast Dec 12 2025 (USA)", hasR(d(2025, 12, 12), "usa", "Guadalupe"));
expect(
  "Dec 12 2025 General remains an Advent feria with Guadalupe as a lawful alternative",
  !hasR(d(2025, 12, 12), "universal", "Guadalupe") &&
    liturgicalDay(d(2025, 12, 12), "universal").color === "violet" &&
    liturgicalDay(d(2025, 12, 12), "universal").alternatives.some((item) =>
      item.name.includes("Guadalupe")
    )
);

// Decree-specific occurrence rules that a generic forward-only transfer loses.
expect(
  "St. Joseph impeded by Holy Week in 2008 is anticipated on Saturday March 15",
  has(d(2008, 3, 15), "St. Joseph") && !has(d(2008, 3, 19), "St. Joseph")
);
expect(
  "Sacred Heart prevails June 24 2022 and the Nativity of John is anticipated June 23",
  has(d(2022, 6, 23), "Nativity of St. John") &&
    has(d(2022, 6, 24), "Sacred Heart") &&
    !has(d(2022, 6, 24), "Nativity of St. John") &&
    has(d(2022, 6, 25), "Immaculate Heart")
);
const maryMother2020 = liturgicalDay(d(2020, 6, 1), "roman.general");
expect(
  "Mary, Mother of the Church prevails over a concurrent memorial after the 2018 decree",
  maryMother2020.celebrations.some((item) => item.id === "grc.mary-mother-church") &&
    !maryMother2020.celebrations.some((item) => item.id === "grc.justin") &&
    maryMother2020.suppressed.some((item) => item.id === "grc.justin")
);

console.log("\n== promulgation boundaries and historical forms ==");
expect(
  "Mary Mother of the Church is absent before 2018 and present after its decree",
  !hasCalendarId(d(2017, 6, 5), "roman.general", "grc.mary-mother-church") &&
    hasCalendarId(d(2018, 5, 21), "roman.general", "grc.mary-mother-church")
);
expect(
  "Mary Magdalene changes from Memorial through 2015 to Feast from 2016",
  liturgicalDay(d(2015, 7, 22), "roman.general").celebrations.some(
    (item) => item.id === "grc.fixed.07-22" && item.rank === "Memorial"
  ) && liturgicalDay(d(2016, 7, 22), "roman.general").celebrations.some(
    (item) => item.id === "grc.fixed.07-22" && item.rank === "Feast"
  )
);
for (const [id, before, after] of [
  ["grc.fixed.05-29", d(2018, 5, 29), d(2019, 5, 29)],
  ["grc.fixed.10-05", d(2019, 10, 5), d(2020, 10, 5)],
  ["grc.fixed.10-11", d(2013, 10, 11), d(2014, 10, 11)],
  ["grc.fixed.10-22", d(2013, 10, 22), d(2014, 10, 22)],
  ["grc.fixed.12-10", d(2018, 12, 10), d(2019, 12, 10)],
  ["grc.fixed.02-27", d(2020, 2, 27), d(2021, 2, 27)],
  ["grc.fixed.05-10", d(2020, 5, 10), d(2021, 5, 10)],
  ["grc.fixed.09-17", d(2020, 9, 17), d(2021, 9, 17)]
] as const) {
  expect(
    `${id} is absent before and present after its Holy See inscription`,
    !hasCalendarId(before, "roman.general", id) && hasCalendarId(after, "roman.general", id)
  );
}
expect(
  "29 July retains St. Martha through 2020 and gains Mary and Lazarus in 2021",
  liturgicalDay(d(2020, 7, 29), "roman.general").celebrations.some(
    (item) => item.id === "grc.fixed.07-29" && item.name === "St. Martha"
  ) && liturgicalDay(d(2021, 7, 29), "roman.general").celebrations.some(
    (item) => item.id === "grc.fixed.07-29" && item.name.includes("Martha, Mary and Lazarus")
  )
);
expect(
  "Irenaeus gains the Doctor title only from the 2022 decree",
  allCalendarItems(d(2021, 6, 28), "roman.general").some(
    (item) => item.id === "grc.fixed.06-28" && !item.name.includes("Doctor")
  ) && allCalendarItems(d(2022, 6, 28), "roman.general").some(
    (item) => item.id === "grc.fixed.06-28" && item.name.includes("Doctor")
  )
);
expect(
  "Jane Frances de Chantal keeps one identity across General and U.S. historical relocations",
  hasCalendarId(d(2001, 12, 12), "roman.general", "grc.jane-frances-de-chantal") &&
    !hasCalendarId(d(2001, 8, 12), "roman.general", "grc.jane-frances-de-chantal") &&
    hasCalendarId(d(2001, 8, 18), "roman.us.ascension-sunday", "grc.jane-frances-de-chantal") &&
    !hasCalendarId(d(2001, 12, 12), "roman.us.ascension-sunday", "grc.jane-frances-de-chantal") &&
    hasCalendarId(d(2002, 8, 12), "roman.general", "grc.jane-frances-de-chantal")
);

console.log("\n== temporal display types and lawful alternatives ==");
const holySaturday2026 = liturgicalDay(d(2026, 4, 4), "roman.general");
expect(
  "Holy Saturday is white Sacred Triduum and exposes no Isidore alternative",
  holySaturday2026.color === "white" &&
    holySaturday2026.celebrations[0]?.rank === "Sacred Triduum" &&
    !holySaturday2026.alternatives.some((item) => item.id === "grc.isidore-seville")
);
expect(
  "Good Friday, Divine Mercy, and All Souls display their actual liturgical types",
  liturgicalDay(d(2026, 4, 3), "roman.general").celebrations[0]?.rank === "Sacred Triduum" &&
    liturgicalDay(d(2026, 4, 12), "roman.general").celebrations[0]?.rank === "Sunday" &&
    liturgicalDay(d(2025, 11, 2), "roman.general").celebrations[0]?.rank === "Commemoration" &&
    liturgicalDay(d(2025, 11, 2), "roman.general").celebrations[0]?.precedence ===
      CALENDAR_PRECEDENCE.generalSolemnity
);
expect(
  "All Souls keeps its proper readings on both Sunday and weekday occurrences",
  candR(d(2025, 11, 2), "roman.general").startsWith('[["All Souls') &&
    candR(d(2026, 11, 2), "roman.general").startsWith('[["All Souls')
);
expect(
  "a Sunday never exposes an impeded optional memorial",
  !liturgicalDay(d(2017, 5, 21), "roman.general").alternatives.some(
    (item) => item.id === "grc.christopher-magallanes"
  )
);
const may25 = liturgicalDay(d(2026, 5, 25), "roman.us.ascension-sunday");
expect(
  "a mandatory governor suppresses every weaker optional memorial with a receipt",
  may25.celebrations.some((item) => item.id === "grc.mary-mother-church") &&
    may25.alternatives.length === 0 &&
    ["grc.bede", "grc.gregory-vii", "grc.mary-magdalene-de-pazzi"].every((id) =>
      may25.suppressed.some(
        (item) => item.id === id && item.suppressionReason === "celebration-precedence"
      )
    )
);
for (const [date, id] of [
  [d(2026, 3, 7), "grc.perpetua-felicity"],
  [d(2026, 12, 21), "grc.peter-canisius"]
] as const) {
  expect(
    `${id} is typed as a commemoration on a privileged weekday`,
    liturgicalDay(date, "roman.general").alternatives.some(
      (item) => item.id === id && item.rank === "Commemoration" && item.optional
    )
  );
}
expect(
  "a Lenten St. Patrick commemoration does not offer full memorial readings",
  liturgicalDay(d(2026, 3, 17), "roman.general").alternatives.some(
    (item) => item.id === "grc.fixed.03-17" && item.rank === "Commemoration"
  ) && !candR(d(2026, 3, 17), "roman.general").includes("Saint Patrick")
);
expect(
  "an unimpeded optional memorial remains available with its formulary",
  liturgicalDay(d(2026, 2, 11), "roman.general").alternatives.some(
    (item) => item.id === "grc.fixed.02-11" && item.rank === "Memorial"
  ) && candR(d(2026, 2, 11), "roman.general").includes("Our Lady of Lourdes")
);
expect(
  "Vincent has one stable identity on General 22 January and the U.S. 23 January",
  hasCalendarId(d(2026, 1, 22), "roman.general", "grc.vincent") &&
    !hasCalendarId(d(2026, 1, 22), "roman.us.ascension-sunday", "grc.vincent") &&
    hasCalendarId(d(2026, 1, 23), "roman.us.ascension-sunday", "grc.vincent") &&
    candR(d(2026, 1, 23), "roman.us.ascension-sunday").includes("Saint Vincent")
);

console.log("\n== v1 calendar profiles and full precedence table ==");
expect(
  "legacy universal migrates to General Roman",
  normalizeCalendarProfile("universal") === "roman.general"
);
expect(
  "legacy usa migrates without changing its Sunday-Ascension behavior",
  normalizeCalendarProfile("usa") === "roman.us.ascension-sunday" &&
    iso(epiphanyDate(2026, "usa")) === iso(epiphanyDate(2026, "roman.us.ascension-sunday"))
);
expect(
  "the five named U.S. provinces keep Ascension Thursday",
  hasR(d(2026, 5, 14), "roman.us.ascension-thursday", "Ascension") &&
    !hasR(d(2026, 5, 17), "roman.us.ascension-thursday", "Ascension")
);
expect(
  "U.S. Corpus Christi is Sunday while General Roman remains Thursday",
  hasR(d(2026, 6, 7), "roman.us.ascension-sunday", "Corpus Christi") &&
    hasR(d(2026, 6, 4), "roman.general", "Corpus Christi")
);
expect(
  "the current General pack includes the 2024 Teresa of Calcutta inscription",
  !liturgicalDay(d(2024, 9, 5), "roman.general").alternatives.some(
    (item) => item.name.includes("Teresa of Calcutta")
  ) && liturgicalDay(d(2025, 9, 5), "roman.general").alternatives.some(
    (item) => item.name.includes("Teresa of Calcutta") && item.optional
  )
);
expect(
  "the current General pack includes the 2025 John Henry Newman inscription",
  !liturgicalDay(d(2025, 10, 9), "roman.general").alternatives.some(
    (item) => item.name.includes("John Henry Newman")
  ) && liturgicalDay(d(2026, 10, 9), "roman.general").alternatives.some(
    (item) => item.name.includes("John Henry Newman") && item.optional
  )
);
expect(
  "profiles are composed from ordered General, territorial, and subterritorial layers",
  calendarProfile("roman.general").packs.map((pack) => pack.id).join("|") ===
    "roman.general.pack" &&
    calendarProfile("roman.us.ascension-sunday").packs.map((pack) => pack.id).join("|") ===
      "roman.general.pack|roman.us.pack|roman.us.ascension-sunday.pack" &&
    calendarProfile("roman.us.ascension-thursday").packs.map((pack) => pack.id).join("|") ===
      "roman.general.pack|roman.us.pack|roman.us.ascension-thursday.pack"
);
expect(
  "pack metadata carries the typed General calendar and complete U.S. proper table",
  GENERAL_ROMAN_PACK.celebrations.length === 238 &&
    UNITED_STATES_PACK.celebrations.length === 26 &&
    CALENDAR_PACKS.every((pack) =>
      pack.celebrations.every((item) => item.dateRule.kind.length > 0 && item.id.length > 0) &&
      new Set(pack.celebrations.map((item) => item.id)).size === pack.celebrations.length
    )
);
expect(
  "last-pack-wins composition relocates the same stable U.S. celebration IDs",
  calendarCelebrationRules("roman.general").find((item) => item.id === "grc.st-camillus")
    ?.dateRule.kind === "fixed" &&
    calendarCelebrationRules("roman.us.ascension-sunday").find(
      (item) => item.id === "grc.st-camillus"
    )?.packId === "roman.us.pack"
);
expect(
  "typed fourth-Thursday and Sunday-contingency rules resolve without templates",
  iso(
    calendarDateForRule(
      2026,
      { kind: "nth-weekday", month: 11, weekday: 4, occurrence: 4 },
      "roman.us.ascension-sunday"
    )
  ) === "2026-11-26" &&
    iso(
      calendarDateForRule(
        2023,
        { kind: "fixed-next-day-if-sunday", month: 1, day: 22 },
        "roman.us.ascension-sunday"
      )
    ) === "2023-01-23"
);
expect(
  "the January 22 U.S. day of prayer moves from Sunday and preserves both official Mass choices",
  liturgicalDay(d(2026, 1, 22), "roman.us.ascension-sunday").celebrations[0]
    ?.formularyOptions?.map((option) => `${option.color}:${option.lectionaryReference}`).join("|") ===
      "white:947A–947E|violet:887–891" &&
    liturgicalDay(d(2023, 1, 23), "roman.us.ascension-sunday").celebrations[0]?.id ===
      "us.prayer-unborn"
);
expect(
  "an unimpeded Ordinary-Time Saturday offers the BVM memorial without suppressing civil choices",
  liturgicalDay(d(2026, 2, 7), "roman.general").alternatives.some(
    (item) => item.id === "grc.saturday-bvm" && item.formularyOptions?.length === 3
  ) &&
    ["grc.saturday-bvm", "us.independence-day"].every((id) =>
      liturgicalDay(d(2026, 7, 4), "roman.us.ascension-sunday").alternatives.some(
        (item) => item.id === id
      )
    )
);
expect(
  "U.S. Thanksgiving keeps its typed fourth-Thursday formulary receipt",
  liturgicalDay(d(2026, 11, 26), "roman.us.ascension-sunday").alternatives.some(
    (item) =>
      item.id === "us.thanksgiving" &&
      item.formularyOptions?.[0]?.lectionaryReference === "943–947"
  )
);
expect(
  "Ascension-Sunday rules apply only after the official 1999 effective date",
  hasR(d(1998, 5, 21), "roman.us.ascension-sunday", "Ascension") &&
    !hasR(d(1998, 5, 24), "roman.us.ascension-sunday", "Ascension") &&
    !hasR(d(2000, 6, 1), "roman.us.ascension-sunday", "Ascension") &&
    hasR(d(2000, 6, 4), "roman.us.ascension-sunday", "Ascension")
);
expect(
  "unsupported jurisdictions return an explicit General Roman fallback receipt",
  profileForJurisdiction("GB").profile.id === "roman.general" &&
    profileForJurisdiction("GB").exact === false &&
    profileForJurisdiction("GB").notice?.includes("No verified local pack") === true
);
expect(
  "a U.S. selection without a province never claims exact Ascension jurisdiction",
  profileForJurisdiction("US", "").exact === false &&
    profileForJurisdiction("US", "").notice?.includes("province") === true
);
expect(
  "manual province selection resolves the official Ascension exception exactly",
  profileForJurisdiction("US", "Boston").profile.id === "roman.us.ascension-thursday" &&
    profileForJurisdiction("US", "Seattle").profile.id === "roman.us.ascension-sunday" &&
    US_ECCLESIASTICAL_PROVINCES.includes("Las Vegas")
);
expect(
  "individual-church propers accept only constrained title, dedication, and patron dates",
  validateIndividualChurchProper({
    churchTitle: "St. Joseph",
    titleDate: { month: 3, day: 19 },
    titleColor: "white",
    dedicationAnniversary: { month: 5, day: 1 },
    principalPatronTitle: "St. Thomas Aquinas",
    principalPatronDate: { month: 1, day: 28 },
    principalPatronColor: "white"
  }) &&
    !validateIndividualChurchProper({
      ...normalizeIndividualChurchProper({}),
      dedicationAnniversary: { month: 2, day: 31 }
    }) &&
    !validateIndividualChurchProper({
      ...normalizeIndividualChurchProper({}),
      rank: "Solemnity"
    })
);
const duplicateLocalDates = {
  churchTitle: "St. Joseph",
  titleDate: { month: 3, day: 19 },
  titleColor: "white" as const,
  dedicationAnniversary: { month: 3, day: 19 },
  principalPatronTitle: "St. Joseph",
  principalPatronDate: { month: 3, day: 19 },
  principalPatronColor: "white" as const
};
expect(
  "pairwise and all-three individual-church duplicate dates are rejected",
  !validateIndividualChurchProper(duplicateLocalDates) &&
    !validateIndividualChurchProper({
      ...duplicateLocalDates,
      principalPatronDate: { month: 5, day: 1 }
    }) &&
    individualChurchProperDateConflicts(duplicateLocalDates).length === 2
);
const normalizedCorruptProper = normalizeIndividualChurchProper(duplicateLocalDates);
expect(
  "a corrupt persisted local proper fails closed to one governor per date",
  normalizedCorruptProper.titleDate?.month === 3 &&
    normalizedCorruptProper.dedicationAnniversary === null &&
    normalizedCorruptProper.principalPatronDate === null &&
    validateIndividualChurchProper(normalizedCorruptProper)
);
const localProper = normalizeIndividualChurchProper({
  churchTitle: "St. Mary Magdalene",
  titleDate: { month: 7, day: 20 },
  titleColor: "white",
  dedicationAnniversary: { month: 10, day: 18 },
  principalPatronTitle: "St. Thomas Aquinas",
  principalPatronDate: { month: 2, day: 10 },
  principalPatronColor: "white"
});
const localTitleDay = liturgicalDay(d(2026, 7, 20), "roman.general", localProper);
expect(
  "a complete individual-church title is generated as a class-4 solemnity with no invented formulary",
  localTitleDay.celebrations.some(
    (item) =>
      item.id === "local.individual-church.title" &&
      item.precedence === CALENDAR_PRECEDENCE.properSolemnity &&
      item.formularyId === null
  )
);
const leapProper = normalizeIndividualChurchProper({
  churchTitle: "Leap Day Chapel",
  titleDate: { month: 2, day: 29 },
  titleColor: "white"
});
expect(
  "a 29 February local proper occurs only in leap years and never rolls to 1 March",
  liturgicalDay(d(2028, 2, 29), "roman.general", leapProper).celebrations.some(
    (item) => item.id === "local.individual-church.title"
  ) &&
    !liturgicalDay(d(2027, 3, 1), "roman.general", leapProper).celebrations.some(
      (item) => item.id === "local.individual-church.title"
    )
);

const precedenceValues = Object.values(CALENDAR_PRECEDENCE) as CalendarPrecedence[];
let precedencePairsCorrect = true;
for (const left of precedenceValues) {
  for (const right of precedenceValues) {
    const want = left === right ? 0 : left < right ? -1 : 1;
    const rankFor = (precedence: CalendarPrecedence) =>
      precedence === CALENDAR_PRECEDENCE.generalMemorial ||
      precedence === CALENDAR_PRECEDENCE.properMemorial ||
      precedence === CALENDAR_PRECEDENCE.optionalMemorial
        ? "Memorial" as const
        : "Solemnity" as const;
    const candidates = [
      {
        id: "left",
        formularyId: null,
        packId: "test",
        name: "Left",
        rank: rankFor(left),
        precedence: left,
        ...(left === CALENDAR_PRECEDENCE.optionalMemorial ? { optional: true } : {})
      },
      {
        id: "right",
        formularyId: null,
        packId: "test",
        name: "Right",
        rank: rankFor(right),
        precedence: right,
        ...(right === CALENDAR_PRECEDENCE.optionalMemorial ? { optional: true } : {})
      }
    ];
    const resolution = resolveCalendarOccurrence(candidates);
    const selected = [...resolution.observed, ...resolution.alternatives]
      .map((item) => item.id)
      .sort();
    const expected = left === right
      ? ["left", "right"]
      : [left < right ? "left" : "right"];
    if (
      compareCalendarPrecedence(left, right) !== want ||
      JSON.stringify(selected) !== JSON.stringify(expected)
    ) {
      precedencePairsCorrect = false;
    }
  }
}
expect(
  "all 169 precedence pairs resolve through the production occurrence authority",
  precedenceValues.length === 13 && precedencePairsCorrect
);
const collision = liturgicalDay(d(2026, 6, 13), "roman.us.ascension-sunday");
expect(
  "an obligatory-memorial collision preserves both lawful alternatives and its reason",
  collision.alternatives.length >= 2 &&
    collision.suppressed.filter((item) => item.suppressionReason === "memorial-collision").length >= 2
);
const transferred = liturgicalDay(d(2024, 3, 25), "roman.general");
expect(
  "a transferred solemnity records its source and target instead of disappearing",
  transferred.suppressed.some(
    (item) => item.id === "grc.fixed.03-25" && item.transferredTo === "2024-04-08"
  )
);
const crossYearProper = normalizeIndividualChurchProper({
  churchTitle: "Holy Family Church",
  titleDate: { month: 12, day: 25 },
  titleColor: "white",
  dedicationAnniversary: { month: 12, day: 30 },
  principalPatronTitle: "St. Sylvester",
  principalPatronDate: { month: 12, day: 31 },
  principalPatronColor: "white"
});
const crossYearSource = liturgicalDay(d(2024, 12, 25), "roman.general", crossYearProper);
const crossYearTarget = liturgicalDay(d(2025, 1, 2), "roman.general", crossYearProper);
expect(
  "a crowded individual-church solemnity transfer crosses New Year with reciprocal receipts",
  crossYearSource.suppressed.some(
    (item) =>
      item.id === "local.individual-church.title" && item.transferredTo === "2025-01-02"
  ) &&
    crossYearTarget.celebrations.some(
      (item) =>
        item.id === "local.individual-church.title" && item.transferredFrom === "2024-12-25"
    )
);
expect(
  "stable celebration and formulary IDs survive legacy/profile selection aliases",
  liturgicalDay(d(2026, 1, 4), "usa").celebrations[0]?.id ===
    liturgicalDay(d(2026, 1, 4), "roman.us.ascension-sunday").celebrations[0]?.id
);

// 6. §1.3 acceptance — "Follow the liturgical year" accent.
// The accent is a pure gate over the governing day's color: on ⇒ the color
// names <html data-accent>, off ⇒ null (no attribute, brand purple stays).
// The white→gold and rose hues live in CSS and are asserted in section 7.
console.log("\n== §1.3 liturgical accent ==");
// The two named acceptance days, in both regions (rose/white are region-agnostic).
for (const r of ["universal", "usa"] as CalendarRegion[]) {
  expect(
    `Gaudete Sunday 2026-12-13 yields a rose accent (${r})`,
    accentFor(true, liturgicalDay(d(2026, 12, 13), r).color) === "rose"
  );
  expect(
    `Easter 2026-04-05 yields the white accent — gold-for-white (${r})`,
    accentFor(true, liturgicalDay(d(2026, 4, 5), r).color) === "white"
  );
}
// The on/off gate itself: off ⇒ null for every color, so the brand purple
// (asserted in section 7) is what shows year-round when the setting is off.
expect("accentFor passes the day's color through when following", accentFor(true, "rose") === "rose");
expect("accentFor passes white through (CSS maps it to gold)", accentFor(true, "white") === "white");
expect("accentFor is null when not following — Gaudete", accentFor(false, "rose") === null);
expect("accentFor is null when not following — Easter/white", accentFor(false, "white") === null);
expect("accentFor is null when not following — green feria", accentFor(false, "green") === null);
expect(
  "Setting OFF on Easter ⇒ no accent (brand purple)",
  accentFor(false, liturgicalDay(d(2026, 4, 5)).color) === null
);

// 7. §1.3 acceptance — the hex table is transcribed onto --purple in CSS.
// The accent recolors ONLY --purple (the "act" accent); --gold and the brand
// masthead never move. Each color is a day-default rule plus a night override.
// White borrows the §1.1 gold token. Absent data-accent (setting off), --purple
// keeps its brand value, so the app is brand purple year-round.
console.log("\n== §1.3 accent hex table (styles.css) ==");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
// Body of the first CSS rule whose selector matches exactly (a negative
// lookbehind keeps a bare [data-accent="x"] query from matching the tail of a
// compound [data-theme="night"][data-accent="x"] selector).
const purpleOf = (selector: string): string | null => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp("(?<!\\])" + esc + "\\s*\\{([^}]*)\\}"));
  if (!rule) return null;
  const decl = rule[1].match(/--purple:\s*(#[0-9A-Fa-f]{3,8})/);
  return decl ? decl[1].toUpperCase() : null;
};
// night / day pairs, exactly as the §1.3 table reads them — recalibrated in
// v1.17.1 (audit FID-A11Y-004) so every value clears 4.5:1 on ALL THREE
// surfaces of its theme, the raised bg-2 included; the data harness §32
// computes the actual ratios from these tokens.
const ACCENT_HEX: Record<string, [string, string]> = {
  green: ["#5CA86E", "#377046"], // day deepened from #3E7C4F (4.12:1 on bg-2)
  violet: ["#A98EDC", "#5B3A8E"], // = brand purple (Advent & Lent)
  white: ["#D4B254", "#7C621C"], // gold stands for white — the AA-legible gold-text
                                 // hue in Day, since on a white feast this carries
                                 // real link text (night gold already clears AA)
  red: ["#E07A89", "#A32638"], // night lifted from #D45A6A (3.56:1 on bg-2)
  rose: ["#D98BA6", "#A34767"], // Gaudete & Laetare — day deepened for AA on bg-2
  black: ["#97979F", "#4A4A50"] // night lifted from #8E8E96 (4.21:1 on bg-2)
};
for (const [accent, [night, day]] of Object.entries(ACCENT_HEX)) {
  expect(
    `[data-accent="${accent}"] sets --purple to ${day} (day)`,
    purpleOf(`[data-accent="${accent}"]`) === day.toUpperCase()
  );
  expect(
    `[data-theme="night"][data-accent="${accent}"] sets --purple to ${night} (night)`,
    purpleOf(`[data-theme="night"][data-accent="${accent}"]`) === night.toUpperCase()
  );
}
// gold-for-white: the white accent borrows the gold hue, but the AA-legible
// gold-text value in Day (#7C621C, since here it carries link text) and the gold
// value in Night (#D4B254, where gold already clears AA and gold-text == gold).
expect("white accent borrows the gold-text day hex #7C621C", purpleOf('[data-accent="white"]') === "#7C621C");
expect(
  "white accent borrows the gold night hex #D4B254",
  purpleOf('[data-theme="night"][data-accent="white"]') === "#D4B254"
);
// setting OFF ⇒ no data-accent ⇒ the brand --purple shows year-round. (The night
// brand purple lifted #9B7BD4 → #A98EDC in v1.17.1 for AA on the bg-2 surfaces;
// the night violet accent above moves with it, staying "= brand purple".)
expect("base day --purple is brand purple #5B3A8E (off ⇒ brand)", purpleOf('[data-theme="day"]') === "#5B3A8E");
expect("base night --purple is brand purple #A98EDC (off ⇒ brand)", purpleOf('[data-theme="night"]') === "#A98EDC");
// The day-mode override has equal specificity to the base [data-theme="day"]
// block, so it wins only because it comes later in the file. Guard the order:
// a reorder would silently drop the day-mode accent (night wins by specificity).
expect(
  "day-default [data-accent] rules follow the base --purple (day cascade wins)",
  css.indexOf('[data-accent="') > css.indexOf("--purple: #5B3A8E")
);

if (failures) {
  console.error(`\n${failures} acceptance check(s) failed`);
  process.exit(1);
}
console.log("\nAll acceptance checks passed");
