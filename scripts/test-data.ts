/** Data harness. Run: npx tsx scripts/test-data.ts */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  dayCodeCandidates,
  displayReadings,
  formatCitation,
  hebrewSpanToVulgate
} from "../src/lib/lectionary";
import { dayOfYear } from "../src/lib/votd";

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
console.log(`lectionary.json: ${keys.size} day codes, ${Object.values(lect).reduce((a, r) => a + r.length, 0)} rows`);
const partial = Object.values(lect).flat().filter((r) => r.partial).length;
console.log(`rows flagged partial: ${partial}`);

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
console.log(`NAMED targets checked: ${vals.length}, missing: ${missing}`);

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
    console.log(`${year} (${region}): days without resolvable gospel: ${fails.length}`);
    for (const f of fails.slice(0, 12)) console.log(`   ${f}`);
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

// 4. Holy Thursday + Ash Wednesday codes present?
for (const k of ["LW06-4Thu", "LW06-4Thu A", "LW00-3Wed", "LW00-4Thu", "LW00-5Fri", "LW00-6Sat"]) {
  console.log(`key "${k}": ${keys.has(k) ? "present" : "MISSING"}`);
}

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
  console.log(`  ${t}: ${bad} invalid refs`);
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
check("two 40-hex upstream pins declared in scripts/pins.mjs", declaredPins.length === 2, `${declaredPins.length}`);
const buildDataSrc = readFileSync(join(ROOT, "scripts/build-data.mjs"), "utf8");
const buildLectSrc = readFileSync(join(ROOT, "scripts/build-lectionary.mjs"), "utf8");
const pinnedFetch =
  !buildDataSrc.includes("/master/") &&
  !buildLectSrc.includes("/master/") &&
  buildDataSrc.includes("PINS.") &&
  buildLectSrc.includes("PINS.");
check(
  "build scripts fetch only the pinned commits",
  pinnedFetch,
  pinnedFetch ? "" : "a build script still fetches a moving branch"
);
const manifestPins = [manifest.sources?.scrollmapper?.commit, manifest.sources?.lectionary?.commit];
check(
  "manifest records the declared source pins",
  manifestPins.every((c) => typeof c === "string" && declaredPins.includes(c)),
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

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : "all checks passed"}`);
process.exitCode = failures ? 1 : 0;
