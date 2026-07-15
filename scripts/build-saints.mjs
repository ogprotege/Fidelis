#!/usr/bin/env node
/**
 * Emits public/data/saints/<MM-DD>.json from scripts/saints.corpus.json and
 * re-seals the data manifest (feature: the memory of the just; standing rule:
 * nothing under public/data is hand-edited).
 *
 * Provenance gate (the §3.3 analog for this layer): every entry MUST cite at
 * least one public-domain source. Text is drawn from those works, never
 * AI-paraphrased (design spec §13). `verified` counts drafts vs checked
 * entries (the §3.4 ledger — the corpus is the ledger). One file per calendar
 * date, so the Saint-of-the-Day chip and page fetch only the day they need.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = ["id", "day", "name", "title", "rank", "shortBlurb", "knownFor"];

const raw = JSON.parse(await readFile(join(ROOT, "scripts", "saints.corpus.json"), "utf8"));
const saints = raw.saints;
if (!Array.isArray(saints) || saints.length === 0) throw new Error("corpus has no saints");

const ids = new Set();
let verified = 0;
const byDay = new Map();
for (const s of saints) {
  for (const f of REQUIRED) {
    if (typeof s[f] !== "string" || !s[f].trim()) {
      throw new Error(`saint ${s.id ?? "?"}: missing field ${f}`);
    }
  }
  if (ids.has(s.id)) throw new Error(`duplicate saint id ${s.id}`);
  ids.add(s.id);
  if (!/^\d{2}-\d{2}$/.test(s.day)) throw new Error(`saint ${s.id}: day must be "MM-DD"`);
  if (!Array.isArray(s.biography) || s.biography.length === 0 || s.biography.some((p) => !p.trim())) {
    throw new Error(`saint ${s.id}: biography must be a non-empty array of paragraphs`);
  }
  // The provenance gate — every entry stands on a public-domain source, OR, for
  // a saint too modern to have one, an official Church source (vatican.va),
  // drawn faithfully and labelled honestly (spec §13 — sourced, never fabricated).
  if (
    !Array.isArray(s.sources) ||
    !s.sources.some((src) => src && (src.license === "public-domain" || src.license === "church-official"))
  ) {
    throw new Error(
      `saint ${s.id}: needs at least one source licensed "public-domain" or "church-official" (spec §13 — sourced, not paraphrased)`
    );
  }
  if (typeof s.verified !== "boolean") throw new Error(`saint ${s.id}: verified must be a boolean`);
  if (s.verified) verified++;
  if (!byDay.has(s.day)) byDay.set(s.day, []);
  byDay.get(s.day).push(s);
}

const dir = join(ROOT, "public", "data", "saints");
await rm(dir, { recursive: true, force: true }); // drop stale dates removed from the corpus
await mkdir(dir, { recursive: true });
for (const [day, list] of byDay) {
  await writeFile(join(dir, `${day}.json`), JSON.stringify({ day, saints: list }));
}

console.log(
  `wrote ${byDay.size} saint date file(s) to ${dir}: ${saints.length} saints ` +
    `(${verified} verified, ${saints.length - verified} drafts pending verification per spec §3.4)`
);

// Re-seal the integrity manifest — the new files now live under public/data.
const { writeManifest } = await import("./build-manifest.mjs");
await writeManifest(ROOT);
