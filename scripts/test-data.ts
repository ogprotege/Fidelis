/** Data harness. Run: npx tsx scripts/test-data.ts */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dayCodeCandidates } from "../src/lib/lectionary";

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
for (const year of [2024, 2025, 2026]) {
  let fails: string[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    const r = mergeHasGospel(dayCodeCandidates(new Date(d)));
    if (!r.ok) fails.push(`${d.toISOString().slice(0, 10)} -> ${r.code}`);
    d.setDate(d.getDate() + 1);
  }
  console.log(`${year}: days without resolvable gospel: ${fails.length}`);
  for (const f of fails.slice(0, 12)) console.log(`   ${f}`);
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

// 5. Psalm verse-offset proof: Ash Wednesday responsorial (Hebrew Ps 51)
const aw = lect["LW00-3Wed"] ?? [];
const ps = aw.find((r) => Math.floor(r.t) === 2);
console.log(`\nAsh Wednesday psalm row: ${JSON.stringify(ps)}`);
const drcPs = JSON.parse(readFileSync(join(ROOT, "public/data/drc/psalms.json"), "utf8"));
if (ps) {
  const vulgCh = 50; // Hebrew 51 -> Vulgate 50
  const chap: string[] = drcPs.chapters[vulgCh - 1];
  console.log(`DRC Psalm 50(51) has ${chap.length} verses.`);
  console.log(`  v1: ${chap[0]}`);
  console.log(`  v2: ${chap[1]}`);
  console.log(`  v3: ${chap[2]}`);
  const cited = ps.s[0];
  console.log(`Lectionary cites Hebrew ${ps.s.map((s) => `51:${s[1]}-${s[2]}`).join(", ")}`);
  console.log(`App will render Vulgate 50:${cited[1]}-${cited[2]} -> starts with: "${chap[cited[1] - 1]?.slice(0, 60)}"`);
  console.log(`Correct first verse of the responsorial ("Have mercy...") is DRC 50:3: "${chap[2]?.slice(0, 60)}"`);
}

// 6. Hebrew 116 / 147 split damage: rows citing those chapters with high verses
let v116 = 0, v147 = 0, v10 = 0;
for (const rows of Object.values(lect)) {
  for (const r of rows) {
    if (r.b !== "psalms") continue;
    for (const [ch, v1, v2] of r.s) {
      if (ch === 116 && (v1 > 9 || (v2 !== 999 && v2 > 9))) v116++;
      if (ch === 147 && (v1 >= 12 || (v2 !== 999 && v2 >= 12))) v147++;
      if (ch === 10) v10++;
    }
  }
}
console.log(`\npsalm-split damage: Ps116 spans past Vulgate 114's end: ${v116}; Ps147:12+ spans: ${v147}; Ps10 rows: ${v10}`);

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

// 8. Text sanity: empty verses across bundles
for (const t of ["drc", "cpdv", "vulgate"]) {
  const idx = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/index.json`), "utf8"));
  let books = 0, verses = 0, empty = 0;
  for (const slug of idx.books) {
    const data = JSON.parse(readFileSync(join(ROOT, `public/data/${t}/${slug}.json`), "utf8"));
    books++;
    for (const ch of data.chapters) for (const v of ch) { verses++; if (!v || !v.trim()) empty++; }
  }
  console.log(`${t}: ${books} books, ${verses} verses, ${empty} empty`);
}
