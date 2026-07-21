#!/usr/bin/env node
/**
 * Validate + merge scripts/history-draft-MM.json fragments into history.corpus.json.
 * Coverage report: assigned days vs events on disk. Never rewrites existing events.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");

const REQUIRED = ["id", "day", "title", "shortBlurb"];
const ASSIGNED = {
  "01": [4,7,10,11,12,14,15,16,18,19,20,21,23,27,29,30,31],
  "02": [1,3,5,6,8,9,10,12,13,15,16,17,18,19,21,26,28,29],
  "03": [1,2,3,4,5,8,9,10,11,14,15,16,17,19,20,22,23,26,29,30],
  "04": [1,3,4,5,6,7,9,10,14,15,16,17,20,21,23,25,26,28,30],
  "05": [2,5,9,10,11,12,14,17,19,21,24,26,27,28,30,31],
  "06": [1,2,4,6,10,11,12,17,18,20,23,24,25,27,28,30],
  "07": [2,3,5,7,8,10,11,12,19,20,22,24,26,27],
  "08": [1,3,4,5,7,8,9,11,12,13,14,16,17,18,19,20,21,22,23,30,31],
  "09": [1,5,6,7,9,10,11,13,15,16,18,21,22,23,24,25,26,28,29],
  "10": [1,2,4,5,6,8,9,10,14,17,18,19,20,21,22,23,24,25,26,27,29,30],
  "11": [4,6,7,8,9,12,13,14,15,17,19,20,22,24,25,26,28,29],
  "12": [1,3,5,9,12,14,15,16,17,18,19,21,22,23,24,26,28,30,31],
};

function normTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(st|saint|the|of|and|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
}

function validateEvent(e, label) {
  for (const f of REQUIRED) {
    if (typeof e[f] !== "string" || !e[f].trim()) throw new Error(`${label}: missing ${f}`);
  }
  if (!/^\d{2}-\d{2}$/.test(e.day)) throw new Error(`${label}: bad day`);
  if (typeof e.year !== "number" || !Number.isInteger(e.year)) throw new Error(`${label}: bad year`);
  if (!Array.isArray(e.body) || e.body.length === 0 || e.body.some((p) => !p.trim())) throw new Error(`${label}: bad body`);
  if (!e.shortBlurb.endsWith("…") && !e.shortBlurb.endsWith("...")) throw new Error(`${label}: shortBlurb must end with …`);
  if (!Array.isArray(e.sources) || !e.sources.some((s) => s && (s.license === "public-domain" || s.license === "church-official"))) {
    throw new Error(`${label}: needs public-domain or church-official source`);
  }
  if (typeof e.verified !== "boolean") throw new Error(`${label}: verified must be boolean`);
}

const corpus = JSON.parse(await readFile(join(SCRIPTS, "history.corpus.json"), "utf8"));
const existingIds = new Set(corpus.events.map((e) => e.id));
const existingNorms = new Map(corpus.events.map((e) => [normTitle(e.title), e.id]));

const files = (await readdir(SCRIPTS)).filter((f) => /^history-draft-\d{2}\.json$/.test(f)).sort();
const allNew = [];
const coverage = {};

for (const f of files) {
  const mm = f.match(/(\d{2})/)[1];
  const raw = JSON.parse(await readFile(join(SCRIPTS, f), "utf8"));
  const events = Array.isArray(raw) ? raw : raw.events;
  if (!Array.isArray(events)) throw new Error(`${f}: expected array or {events}`);
  const days = new Set();
  for (const e of events) {
    validateEvent(e, `${f}:${e.id ?? "?"}`);
    if (!e.day.startsWith(mm + "-")) throw new Error(`${f}:${e.id}: day ${e.day} not in month ${mm}`);
    if (existingIds.has(e.id) || allNew.some((x) => x.id === e.id)) throw new Error(`duplicate id ${e.id}`);
    const n = normTitle(e.title);
    if (existingNorms.has(n) || allNew.some((x) => normTitle(x.title) === n)) {
      throw new Error(`title collision for "${e.title}" (${e.id})`);
    }
    // Prefer curly ellipsis
    if (e.shortBlurb.endsWith("...")) e.shortBlurb = e.shortBlurb.slice(0, -3) + "…";
    days.add(Number(e.day.slice(3)));
    allNew.push(e);
  }
  const assigned = ASSIGNED[mm] || [];
  const missing = assigned.filter((d) => !days.has(d));
  const extra = [...days].filter((d) => !assigned.includes(d));
  coverage[mm] = { file: f, count: events.length, assigned: assigned.length, missing, extra };
}

console.log("=== Coverage report ===");
let leftovers = 0;
for (const [mm, c] of Object.entries(coverage)) {
  leftovers += c.missing.length;
  console.log(
    `${mm}: ${c.count}/${c.assigned} events; missing=[${c.missing.join(",")}] extra=[${c.extra.join(",")}]`
  );
}
const draftMonths = new Set(Object.keys(coverage));
for (const mm of Object.keys(ASSIGNED)) {
  if (!draftMonths.has(mm)) {
    leftovers += ASSIGNED[mm].length;
    console.log(`${mm}: NO FRAGMENT FILE — missing all ${ASSIGNED[mm].length} days: [${ASSIGNED[mm].join(",")}]`);
  }
}
console.log(`Total leftover assigned days: ${leftovers}`);
console.log(`New events ready to merge: ${allNew.length}`);

const doMerge = process.argv.includes("--merge");
if (!doMerge) {
  console.log("(dry run — pass --merge to append into history.corpus.json)");
  process.exit(leftovers === 0 && allNew.length > 0 ? 0 : leftovers > 0 ? 2 : 0);
}

if (leftovers > 0) {
  console.error("Refusing merge with leftover days. Fill fragments first.");
  process.exit(1);
}

corpus.events.push(...allNew);
corpus.note =
  "Hand-edited source corpus for the Today in Church History layer (feature: the memory of the just). Build with `npm run history` — never hand-edit public/data/history. Every entry cites at least one public-domain source; text is drawn from those works, NOT AI-paraphrased. `verified` is false until checked against the named edition (the §3.4 ledger convention). The original 177 entries were proof-read on 2026-07-19; the full-year expansion entries (v1.23.0) start verified:false pending the per-month fact-check pass. Multiple events may share a `day` (different years); the build groups and sorts them by year.";
await writeFile(join(SCRIPTS, "history.corpus.json"), JSON.stringify(corpus, null, 2) + "\n");
console.log(`Merged ${allNew.length} events. Corpus now ${corpus.events.length} events, ${new Set(corpus.events.map((e) => e.day)).size} days.`);
