#!/usr/bin/env node
/**
 * Emits public/data/history/<MM-DD>.json from scripts/history.corpus.json and
 * re-seals the data manifest (feature: the memory of the just; standing rule:
 * nothing under public/data is hand-edited).
 *
 * Provenance gate (the §3.3 analog for this layer): every event MUST cite at
 * least one public-domain source. Text is drawn from those works, never
 * AI-paraphrased (design spec §13). `verified` counts drafts vs checked
 * entries (the §3.4 ledger). Multiple events may share a date (different
 * years); they are grouped and sorted by year, oldest first.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = ["id", "day", "title", "shortBlurb"];

const raw = JSON.parse(await readFile(join(ROOT, "scripts", "history.corpus.json"), "utf8"));
const events = raw.events;
if (!Array.isArray(events) || events.length === 0) throw new Error("corpus has no events");

const ids = new Set();
let verified = 0;
const byDay = new Map();
for (const e of events) {
  for (const f of REQUIRED) {
    if (typeof e[f] !== "string" || !e[f].trim()) {
      throw new Error(`event ${e.id ?? "?"}: missing field ${f}`);
    }
  }
  if (ids.has(e.id)) throw new Error(`duplicate event id ${e.id}`);
  ids.add(e.id);
  if (!/^\d{2}-\d{2}$/.test(e.day)) throw new Error(`event ${e.id}: day must be "MM-DD"`);
  if (typeof e.year !== "number" || !Number.isInteger(e.year)) {
    throw new Error(`event ${e.id}: year must be an integer`);
  }
  if (!Array.isArray(e.body) || e.body.length === 0 || e.body.some((p) => !p.trim())) {
    throw new Error(`event ${e.id}: body must be a non-empty array of paragraphs`);
  }
  if (
    !Array.isArray(e.sources) ||
    !e.sources.some((src) => src && (src.license === "public-domain" || src.license === "church-official"))
  ) {
    throw new Error(
      `event ${e.id}: needs at least one source licensed "public-domain" or "church-official" (spec §13 — sourced, not paraphrased)`
    );
  }
  if (typeof e.verified !== "boolean") throw new Error(`event ${e.id}: verified must be a boolean`);
  if (e.verified) verified++;
  if (!byDay.has(e.day)) byDay.set(e.day, []);
  byDay.get(e.day).push(e);
}

// Same-event duplicate gate (audit FID-CONTENT-001): two records sharing a day
// AND a year are almost always the same event twice under different ids — the
// v1.20.0 research merge slipped six such pairs past the id gate above. A
// genuinely distinct same-day-same-year pair must be named here to pass, so a
// reviewer decides, never the merge.
const DISTINCT_SAME_DAY_YEAR = new Set([
  // "MM-DD|year|id-a|id-b" with the two ids sorted alphabetically.
]);
const byDayYear = new Map();
for (const e of events) {
  const k = `${e.day}|${e.year}`;
  if (!byDayYear.has(k)) byDayYear.set(k, []);
  byDayYear.get(k).push(e);
}
for (const [k, list] of byDayYear) {
  if (list.length < 2) continue;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const pair = `${k}|${[list[i].id, list[j].id].sort().join("|")}`;
      if (!DISTINCT_SAME_DAY_YEAR.has(pair)) {
        throw new Error(
          `same-day-same-year duplicate candidates on ${k}: "${list[i].id}" (${list[i].title}) ` +
            `vs "${list[j].id}" (${list[j].title}) — merge them, or allowlist "${pair}" in ` +
            `DISTINCT_SAME_DAY_YEAR if they are genuinely distinct events`
        );
      }
    }
  }
}

const dir = join(ROOT, "public", "data", "history");
await rm(dir, { recursive: true, force: true }); // drop stale dates removed from the corpus
await mkdir(dir, { recursive: true });
for (const [day, list] of byDay) {
  list.sort((a, b) => a.year - b.year); // oldest first
  await writeFile(join(dir, `${day}.json`), JSON.stringify({ day, events: list }));
}

console.log(
  `wrote ${byDay.size} history date file(s) to ${dir}: ${events.length} events ` +
    `(${verified} verified, ${events.length - verified} drafts pending verification per spec §3.4)`
);

// Re-seal the integrity manifest — the new files now live under public/data.
const { writeManifest } = await import("./build-manifest.mjs");
await writeManifest(ROOT);
