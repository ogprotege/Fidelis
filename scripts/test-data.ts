/** Data harness. Run: npx tsx scripts/test-data.ts */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dayCodeCandidates, formatCitation, hebrewSpanToVulgate } from "../src/lib/lectionary";

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

// 3. Easter Vigil rows (LW06-6Sat) — expect t=1.01..1.07 options + epistle + gospel
console.log("\nEaster Vigil (LW06-6Sat / + A):");
for (const k of ["LW06-6Sat", "LW06-6Sat A"]) {
  const rows = lect[k];
  if (rows) console.log(`  ${k}: t values = ${rows.map((r) => r.t).join(", ")}`);
}

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

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : "all checks passed"}`);
process.exitCode = failures ? 1 : 0;
