/** Trap-year harness for the liturgical engine. Run: npx tsx scripts/test-liturgical.ts */
import {
  CalendarRegion,
  accentFor,
  adventStart,
  baptismOfTheLord,
  easterDate,
  epiphanyDate,
  liturgicalDay
} from "../src/lib/liturgical";
import { dayCodeCandidates } from "../src/lib/lectionary";
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
expect("St. Matthias suppressed on Ascension 2026", !has(d(2026, 5, 14), "Matthias"));
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
expect("No Claver in the universal calendar", !hasR(d(2026, 9, 9), "universal", "Claver"));
expect("Our Lady of Guadalupe Feast Dec 12 2025 (USA)", hasR(d(2025, 12, 12), "usa", "Guadalupe"));
expect(
  "Dec 12 2025 (universal) stays a violet Advent feria",
  !hasR(d(2025, 12, 12), "universal", "Guadalupe") &&
    liturgicalDay(d(2025, 12, 12), "universal").color === "violet"
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
// night / day pairs, exactly as the §1.3 table reads them.
const ACCENT_HEX: Record<string, [string, string]> = {
  green: ["#5CA86E", "#3E7C4F"],
  violet: ["#9B7BD4", "#5B3A8E"], // = brand purple (Advent & Lent)
  white: ["#D4B254", "#A8862C"], // gold stands for white
  red: ["#D45A6A", "#A32638"],
  rose: ["#D98BA6", "#C76A8A"], // Gaudete & Laetare
  black: ["#8E8E96", "#4A4A50"]
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
// gold-for-white: the white accent must reuse the §1.1 --gold token values.
expect("white accent borrows the gold day hex #A8862C", purpleOf('[data-accent="white"]') === "#A8862C");
expect(
  "white accent borrows the gold night hex #D4B254",
  purpleOf('[data-theme="night"][data-accent="white"]') === "#D4B254"
);
// setting OFF ⇒ no data-accent ⇒ the brand --purple shows year-round.
expect("base day --purple is brand purple #5B3A8E (off ⇒ brand)", purpleOf('[data-theme="day"]') === "#5B3A8E");
expect("base night --purple is brand purple #9B7BD4 (off ⇒ brand)", purpleOf('[data-theme="night"]') === "#9B7BD4");
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
