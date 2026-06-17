/** Data harness. Run: npx tsx scripts/test-data.ts */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  dayCodeCandidates,
  displayReadings,
  formatCitation,
  hebrewSpanToVulgate,
  resolveReadings
} from "../src/lib/lectionary";
import { liturgicalDay } from "../src/lib/liturgical";
import { DailyQuote, quoteOfTheDay } from "../src/lib/quotes";
import { dayOfYear } from "../src/lib/votd";
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
import { normalizeFather, groupCatena, fathersOf, isDoctor } from "../src/lib/commentary";
import { getSettings } from "../src/lib/storage";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_SCRIPTURE_FONT,
  FONT_SIZE_PRESETS,
  SCRIPTURE_FONTS,
  isScriptureFont
} from "../src/lib/typography";
import { THEME_OPTIONS, isThemeChoice, resolveTheme } from "../src/lib/theme";
import { formatBytes } from "../src/lib/format";
import { GOLDEN_REGIONS, GOLDEN_YEARS, goldenYear } from "./golden";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

import { fileURLToPath } from "node:url";
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const lect: Record<string, { t: number; b: string; s: [number, number, number][]; partial?: boolean }[]> =
  JSON.parse(readFileSync(join(ROOT, "public/data/lectionary.json"), "utf8"));
const keys = new Set(Object.keys(lect));
const totalRows = Object.values(lect).reduce((a, r) => a + r.length, 0);
const partial = Object.values(lect).flat().filter((r) => r.partial).length;
// Pinned shape of the committed lectionary data: changes only when the
// pipeline regenerates it deliberately (then update these together).
check("lectionary.json carries 1140 day codes", keys.size === 1140, `${keys.size}`);
check("lectionary.json carries 3013 rows", totalRows === 3013, `${totalRows}`);
check("566 rows flagged partial (P2-4)", partial === 566, `${partial}`);

// 1. NAMED map coverage — every value must exist as a key (plain or with cycle suffix)
const src = readFileSync(join(ROOT, "src/lib/lectionary.ts"), "utf8");
const namedVals = [...src.matchAll(/:\s*\n?\s*"([^"]+)"(?:,|\n)/g)]
  .map((m) => m[1])
  .filter((v) => !v.includes('"'));
// crude but effective: extract the NAMED object literal values
const namedBlock = src.slice(src.indexOf("const NAMED"), src.indexOf("const ww"));
const vals = [...namedBlock.matchAll(/:\s*(?:\n\s*)?"([^"]+)"/g)].map((m) => m[1]);
let missing = 0;
for (const v of vals) {
  const ok = keys.has(v) || keys.has(`${v} A`) || keys.has(`${v} B`) || keys.has(`${v} C`);
  if (!ok) {
    console.log(`NAMED target missing from data: "${v}"`);
    missing++;
  }
}
check(`every NAMED target exists in lectionary.json (${vals.length} checked)`, missing === 0, `${missing} missing`);

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
    let fails: string[] = [];
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
  "St. Agnes (no prescribed propers) keeps the ferial, no secondary set",
  agnes.code.startsWith("OW02-3Wed") && !agnes.secondary,
  agnes.code
);
const natJtB = res(2026, 6, 24)!;
check(
  "A governing solemnity is untouched (Nativity of John the Baptist)",
  natJtB.code.startsWith("Birth of Saint John the Baptist") && !natJtB.secondary,
  natJtB.code
);
const josephWorker = res(2026, 5, 1)!;
check(
  "St. Joseph the Worker (optional memorial) never displaces the Easter ferial",
  josephWorker.code.startsWith("EW04-5Fri") && !josephWorker.secondary,
  josephWorker.code
);
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
check("four 40-hex upstream pins declared in scripts/pins.mjs", declaredPins.length === 4, `${declaredPins.length}`);
const buildSrcs = ["build-data", "build-lectionary", "build-haydock", "build-catena"].map((s) =>
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
  manifest.sources?.catena?.commit
];
check(
  "manifest records the declared source pins",
  manifestPins.length === 4 && manifestPins.every((c) => typeof c === "string" && declaredPins.includes(c)),
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
//     lectionary resolution for 2024–2027, both regions, must match the
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

  const RED = [/sheen/i, /escriv/i, /pietrelcina|padre pio/i, /john paul/i, /benedict xvi/i];
  const red = quotes.filter((q) => RED.some((re) => re.test(q.author)));
  check("no red-list author in the corpus (spec §3.3)", red.length === 0, red.map((q) => q.id).join(", "));

  const every = ["advent", "christmastide", "lent", "eastertide"].filter(
    (s) => !quotes.some((q) => q.season === s)
  );
  check("each seasonal pool is non-empty", every.length === 0, every.join(", "));

  // Tier 1 — sanctoral: Augustine speaks on August 28.
  const aug = new Date(2026, 7, 28);
  const q1 = quoteOfTheDay(quotes, aug, liturgicalDay(aug, "universal"));
  check(
    "Aug 28: the sanctoral tier serves Augustine",
    q1?.author.includes("Augustine") === true && q1?.feast === "08-28",
    q1?.id ?? "null"
  );
  // Tier 2 — seasonal: a Lent feria draws from the Lent pool.
  const lent = new Date(2026, 2, 5); // Thursday of the 2nd week of Lent
  const q2 = quoteOfTheDay(quotes, lent, liturgicalDay(lent, "universal"));
  check("Lent feria draws from the Lent pool", q2?.season === "lent", q2?.id ?? "null");
  // Tier 3 — general: an OT feria draws from the season-untagged remainder.
  const ot = new Date(2026, 5, 16); // Tuesday of the 11th week in OT
  const q3 = quoteOfTheDay(quotes, ot, liturgicalDay(ot, "universal"));
  check("OT feria draws from the general cycle", q3 !== null && q3.season === null, q3?.id ?? "null");
  // Determinism + totality: every day of 2026 resolves, twice identically.
  let nulls = 0;
  let nondet = 0;
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d = new Date(2026, d.getMonth(), d.getDate() + 1)) {
    const lit = liturgicalDay(d, "universal");
    const a = quoteOfTheDay(quotes, d, lit);
    const b = quoteOfTheDay(quotes, d, lit);
    if (!a) nulls++;
    if (a?.id !== b?.id) nondet++;
  }
  check("a quote resolves for every day of 2026", nulls === 0, `${nulls} null`);
  check("quote selection is deterministic", nondet === 0, `${nondet} differ`);
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
  check("--scripture mapped for all three faces",
    /\[data-font="garamond"\]/.test(css) &&
      /\[data-font="serif"\]/.test(css) &&
      /\[data-font="sans"\]/.test(css));
  check("reading text uses var(--scripture)", /\.verses\s*\{[^}]*var\(--scripture\)/.test(css));

  check("four size presets, 17/19/22/25 (spec §1.4)",
    JSON.stringify(FONT_SIZE_PRESETS.map((p) => p.px)) === "[17,19,22,25]");
  check("exactly three faces: garamond/serif/sans",
    JSON.stringify(SCRIPTURE_FONTS.map((f) => f.id)) === '["garamond","serif","sans"]');
  check("default face is Garamond", DEFAULT_SCRIPTURE_FONT === "garamond");
  check("default size 19 is itself a preset", FONT_SIZE_PRESETS.some((p) => p.px === DEFAULT_FONT_SIZE));
  check("isScriptureFont guards the vocabulary",
    isScriptureFont("garamond") && !isScriptureFont("comic-sans") && !isScriptureFont(undefined));

  const s = getSettings();
  check("getSettings() defaults scriptureFont to garamond", s.scriptureFont === "garamond");
  check("getSettings() defaults fontSize to a preset", FONT_SIZE_PRESETS.some((p) => p.px === s.fontSize));
}

// ── 10. Iconography (spec §1.5): the six-piece inline SVG set replaces the
//        emoji glyphs in interactive UI. Guard that none creep back in, and
//        that the Icon component stays currentColor-driven and single-weight.
{
  // The five named glyphs (⚑ ✎ ☾/☀ ⧉ ✠); escaped so this guard file holds
  // none of them itself. Gear/dove and typographic affordances are out of scope.
  const FORBIDDEN: [string, string][] = [
    ["⚑", "bookmark flag"],
    ["✎", "pencil"],
    ["☾", "crescent moon"],
    ["☀", "sun"],
    ["⧉", "copy/share"],
    ["✠", "cross"]
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
//        · More — as the desktop header row and a phone bottom bar, by CSS only.
//        These lock the three acceptance criteria the build/type-check cannot see
//        (the fourth, a green build, is `npm run build`): the header cannot wrap
//        at phone widths, the active tab is purple, and the bar honors the iOS
//        safe-area inset.
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

  // "More" opens exactly Library, Translations, Settings, About — and nothing
  // routes there (it is a popover, not a route).
  const MORE = ["/library", "/translations", "/settings", "/about"];
  check("More opens exactly Library/Translations/Settings/About (spec §2.1)",
    MORE.every((to) => new RegExp(`["']${to}["']`).test(tabCode)), MORE.join(", "));

  // The header delegates to <TabBar>; the old seven-link inline nav is gone.
  check("Header renders <TabBar> in place of the inline nav (spec §2.1)",
    header.includes("<TabBar") && !/<nav className="nav">/.test(header));

  // Acceptance: the phone breakpoint pins the bar to the bottom edge and forces
  // the header onto one line so it cannot wrap at 390px.
  check("phone media query (max-width: 640px) exists (spec §2.1)",
    /@media\s*\(max-width:\s*640px\)/.test(css));
  check("acceptance: header cannot wrap at phone width — .header-inner flex-wrap: nowrap",
    /\.header-inner\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
  check("acceptance: the bar pins to the bottom edge — .tabbar position: fixed; bottom: 0",
    /\.tabbar\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*0/.test(css));

  // Acceptance: the active tab is purple (purple acts, §1.2) — for both the
  // NavLink tabs and the More button.
  check("acceptance: active tab is purple — .nav a.active uses var(--purple)",
    /\.nav a\.active\s*\{[^}]*color:\s*var\(--purple\)/.test(css));
  check("acceptance: active More button is purple — .more-btn.active uses var(--purple)",
    /\.more-btn\.active\s*\{[^}]*color:\s*var\(--purple\)/.test(css));

  // Acceptance: the bar respects the iOS home-indicator inset.
  check("acceptance: bar respects iOS safe-area inset — env(safe-area-inset-bottom) on .tabbar",
    /\.tabbar\s*\{[^}]*env\(safe-area-inset-bottom\)/.test(css));
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
  check("Settings: the calendar region select (moved from Readings)",
    set.includes("calendarRegion") &&
      set.includes('value="universal"') &&
      set.includes('value="usa"'));
  check("Settings: Data offers per-bundle download with real sizes",
    set.includes("downloadBundle") && set.includes("formatBytes"));
  check("Settings: Data reuses the P2-6 export/import",
    set.includes("exportMarginalia") && set.includes("importMarginalia"));
  check("Settings: the manifest integrity line links to About",
    set.includes("rootHash") && /to="\/about"/.test(set));

  // Readings is left clean — the region select is gone (spec §2.2).
  const readings = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");
  check("Readings no longer renders the region select or writes settings",
    !readings.includes('value="usa"') && !readings.includes("saveSettings"));
  check("Readings reads the region live from the context",
    readings.includes("useSettings") && readings.includes("settings.calendarRegion"));

  // About carries the anchor the Data line points at.
  const about = readFileSync(join(ROOT, "src/pages/About.tsx"), "utf8");
  check("About marks the integrity line with id=\"integrity\"", about.includes('id="integrity"'));

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

// Standing rule 2: the Today page renders exactly five cards.
const homeSrc = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
check(
  "Today page renders exactly five cards (standing rule 2)",
  (homeSrc.match(/className="card"/g) || []).length === 5,
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
  /\.sheet-backdrop\s*\{[^}]*var\(--scrim\)/.test(sheetCss)
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
  check(
    "catena parser: Gospel comment keyed by 'ch:verse' with father attribution",
    C.matthew["5:1"]?.[0]?.father === "Pseudo-Chrysostom" &&
      C.matthew["5:1"][0].text === "Every man in his own trade rejoices, & so on."
  );
  check(
    "catena parser: entities decoded, <reference> unwrapped, <note> dropped",
    C.matthew["5:1"]?.[1]?.text.includes("to fulfil the prophecy of Esaias, [Isa 40:9]") &&
      !C.matthew["5:1"][1].text.includes("editor aside") &&
      !C.matthew["5:1"][1].text.includes("&amp;")
  );
  check(
    "catena parser: a no-bold <p> continues the previous father's comment",
    C.matthew["5:1"]?.length === 2 &&
      C.matthew["5:1"][1].text.includes("Or, He ascended into the mountain to shew the Church")
  );
  check(
    "catena parser: the <p osisID> lemma is never emitted as commentary",
    !C.matthew["5:1"].some((e) => /seeing the multitudes/.test(e.text))
  );
  check(
    "catena parser: a span broadcasts to every verse it covers",
    JSON.stringify(C.matthew["5:1"]) === JSON.stringify(C.matthew["5:2"])
  );
  check("catena parser: comment lands under the right Gospel", C.john["3:5"]?.[0]?.father === "Augustine");
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
      if (f.endsWith(".json")) out[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(dir, f), "utf8"));
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
    const bk: Record<string, { father?: string }[]> = JSON.parse(readFileSync(join(cdir, fn), "utf8"));
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

// §20 — the Mass-readings translation preference (src/lib/storage.ts). Pure: an
// explicit choice wins; otherwise the NABRE for the USA region (the U.S.
// lectionary text), and the general reading translation elsewhere.
{
  const { massTranslationFor } = await import("../src/lib/storage");
  const base = { translation: "drc", calendarRegion: "universal", massTranslation: "" } as unknown as Parameters<typeof massTranslationFor>[0];
  check("massTranslationFor: USA region (auto) → nabre", massTranslationFor({ ...base, calendarRegion: "usa" }) === "nabre");
  check("massTranslationFor: universal (auto) → the reading translation", massTranslationFor({ ...base, translation: "cpdv" }) === "cpdv");
  check("massTranslationFor: an explicit choice wins over the region", massTranslationFor({ ...base, calendarRegion: "usa", massTranslation: "drc" }) === "drc");
}

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : "all checks passed"}`);
process.exitCode = failures ? 1 : 0;
