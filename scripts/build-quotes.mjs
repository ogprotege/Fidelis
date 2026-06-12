#!/usr/bin/env node
/**
 * Emits public/data/quotes.json from scripts/quotes.corpus.json and re-seals
 * the data manifest (design spec §3; standing rule: nothing under public/data
 * is hand-edited).
 *
 * Validates the corpus schema and enforces the spec's red list (§3.3):
 * authors whose works/translations are not public domain are refused at
 * build time, regardless of how shareable the line is.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEASONS = new Set(["advent", "christmastide", "lent", "eastertide"]);
const REQUIRED = ["id", "text", "author", "work", "locus", "sourceEdition"];

// Spec §3.3 red list. "Francis" alone (the pope) is red; Francis of Assisi,
// de Sales, and Xavier are green — hence the anchored pope patterns.
const RED_LIST = [
  /fulton\s+sheen/i,
  /escriv/i,
  /padre\s+pio|pietrelcina/i,
  /john\s+paul/i,
  /benedict\s+xvi|ratzinger/i,
  /^(pope\s+)?francis$/i,
  /bergoglio/i
];

const raw = JSON.parse(await readFile(join(ROOT, "scripts", "quotes.corpus.json"), "utf8"));
const quotes = raw.quotes;
if (!Array.isArray(quotes) || quotes.length === 0) throw new Error("corpus has no quotes");

const ids = new Set();
let verified = 0;
for (const q of quotes) {
  for (const f of REQUIRED) {
    if (typeof q[f] !== "string" || !q[f].trim()) {
      throw new Error(`quote ${q.id ?? "?"}: missing field ${f}`);
    }
  }
  if (ids.has(q.id)) throw new Error(`duplicate quote id ${q.id}`);
  ids.add(q.id);
  if (q.feast !== null && !/^\d{2}-\d{2}$/.test(q.feast)) {
    throw new Error(`quote ${q.id}: feast must be "MM-DD" or null`);
  }
  if (q.season !== null && !SEASONS.has(q.season)) {
    throw new Error(`quote ${q.id}: unknown season ${q.season}`);
  }
  for (const re of RED_LIST) {
    if (re.test(q.author.replace(/^st\.?\s+|^pope\s+st\.?\s+/i, "").trim()) || re.test(q.author)) {
      throw new Error(`quote ${q.id}: author "${q.author}" is on the red list (spec §3.3)`);
    }
  }
  if (q.verified === true) verified++;
}

const out = join(ROOT, "public", "data", "quotes.json");
await writeFile(out, JSON.stringify({ quotes }));
console.log(
  `wrote ${out}: ${quotes.length} quotes (${verified} verified, ${quotes.length - verified} drafts pending verification per spec §3.4)`
);

// Re-seal the integrity manifest — quotes.json now lives under public/data.
const { writeManifest } = await import("./build-manifest.mjs");
await writeManifest(ROOT);
