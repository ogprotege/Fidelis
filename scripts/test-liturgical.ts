/** Trap-year harness for the liturgical engine. Run: npx tsx scripts/test-liturgical.ts */
import { easterDate, liturgicalDay, adventStart, baptismOfTheLord } from "../src/lib/liturgical";
import { dayCodeCandidates, sundayCycle, weekdayCycle } from "../src/lib/lectionary";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;

// 1. Easter computus against the known table
const EASTER: [number, string][] = [
  [2008, "2008-03-23"], [2011, "2011-04-24"], [2016, "2016-03-27"],
  [2024, "2024-03-31"], [2025, "2025-04-20"], [2026, "2026-04-05"],
  [2027, "2027-03-28"], [2030, "2030-04-21"], [2038, "2038-04-25"],
  [2049, "2049-04-18"], [2100, "2100-03-28"]
];
console.log("== Easter computus ==");
for (const [y, expect] of EASTER) {
  const got = iso(easterDate(y));
  console.log(`${y}: ${got} ${got === expect ? "OK" : `EXPECTED ${expect} *** FAIL ***`}`);
}

// 2. Trap days — print what the engine says
const CASES: [string, Date][] = [
  ["IC on Advent Sunday (real: 2nd Sun of Advent, violet; IC -> Dec 9)", d(2024, 12, 8)],
  ["Dec 9 2024 (real: Immaculate Conception, transferred)", d(2024, 12, 9)],
  ["Annunciation in Holy Week (real: Monday of Holy Week; Ann -> Apr 8)", d(2024, 3, 25)],
  ["Apr 8 2024 (real: Annunciation, transferred)", d(2024, 4, 8)],
  ["Annunciation on Good Friday 2016 (real: Good Friday; Ann -> Apr 4)", d(2016, 3, 25)],
  ["Ash Wednesday + Sts Cyril&Methodius (real: Ash Wed only)", d(2024, 2, 14)],
  ["St Andrew on 1st Sunday of Advent (real: Sunday wins, violet)", d(2025, 11, 30)],
  ["Christmas on Sunday -> Holy Family Dec 30", d(2022, 12, 30)],
  ["Dec 25 2022 (Sunday)", d(2022, 12, 25)],
  ["Epiphany Jan 6 2026 (US: transferred to Jan 4)", d(2026, 1, 6)],
  ["Jan 4 2026 (US Epiphany Sunday; universal: 2nd Sun after Christmas)", d(2026, 1, 4)],
  ["Baptism of the Lord 2026", baptismOfTheLord(2026)],
  ["Ascension Thursday 2026 (US: transferred to May 17)", d(2026, 5, 14)],
  ["Sacred Heart 2026", d(2026, 6, 12)],
  ["Today (Jun 11 2026, St Barnabas)", d(2026, 6, 11)],
  ["Christ the King 2026", d(2026, 11, 22)],
  ["All Souls on Sunday 2025", d(2025, 11, 2)],
  ["Gaudete 2025", d(2025, 12, 14)],
  ["Laetare 2026", d(2026, 3, 15)],
  ["Easter Vigil / Holy Saturday 2026", d(2026, 4, 4)],
  ["Dec 17 2025 (O Antiphon feria)", d(2025, 12, 17)],
  ["Mary Mother of the Church 2026 (Mon after Pentecost)", d(2026, 5, 25)]
];
console.log("\n== Liturgical day output ==");
for (const [label, date] of CASES) {
  const L = liturgicalDay(date);
  const cel = L.celebrations.map((c) => `${c.rank}:${c.name}`).join(" | ") || "—";
  console.log(`\n${label}\n  ${iso(date)} ${L.seasonLabel} [${L.season} wk${L.week}] color=${L.color}\n  celebrations: ${cel}`);
}

// 3. Lectionary day codes for the same traps
console.log("\n== Lectionary day-code candidates ==");
const RCASES: [string, Date][] = [
  ["IC on Advent Sunday 2024", d(2024, 12, 8)],
  ["Dec 9 2024", d(2024, 12, 9)],
  ["Annunciation in Holy Week 2024", d(2024, 3, 25)],
  ["Annunciation on Good Friday 2016", d(2016, 3, 25)],
  ["St Andrew on Advent Sunday 2025", d(2025, 11, 30)],
  ["Today Jun 11 2026", d(2026, 6, 11)],
  ["Easter Vigil 2026 (Apr 4)", d(2026, 4, 4)],
  ["Holy Thursday 2026 (Apr 2)", d(2026, 4, 2)],
  ["Pentecost 2026 (May 24)", d(2026, 5, 24)],
  ["Dec 17 2025", d(2025, 12, 17)],
  ["Jan 6 2026", d(2026, 1, 6)],
  ["Christmas 2026", d(2026, 12, 25)]
];
for (const [label, date] of RCASES) {
  console.log(
    `${label} [cyc ${sundayCycle(date)}/wd ${weekdayCycle(date)}]: ${JSON.stringify(dayCodeCandidates(date))}`
  );
}

// 4. P0-1/P0-2 acceptance — these assert; the script exits 1 on any failure.
let failures = 0;
const expect = (label: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};
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
expect("All Souls governs Sunday 2025-11-02", has(d(2025, 11, 2), "All Souls"));
expect("Pentecost 2026 proper readings first", cand(d(2026, 5, 24)).startsWith('[["EW08-Pentecost'));
expect("St. Barnabas memorial listed on 2026-06-11", has(d(2026, 6, 11), "Barnabas"));
expect("Ferial readings still first on memorial days", cand(d(2026, 6, 11)).startsWith('[["OW10-4Thu'));

if (failures) {
  console.error(`\n${failures} acceptance check(s) failed`);
  process.exit(1);
}
console.log("\nAll acceptance checks passed");
