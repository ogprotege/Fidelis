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
