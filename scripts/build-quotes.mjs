#!/usr/bin/env node
/**
 * Emits public/data/quotes.json from scripts/quotes.corpus.json and re-seals
 * the data manifest (design spec §3; standing rule: nothing under public/data
 * is hand-edited).
 *
 * Validates the corpus schema and applies the spec's red list (§3.3) as an
 * ADVISORY flag: authors whose works/translations are not public domain are
 * counted and reported, but kept, per the owner's directive for the closed
 * beta. Re-enable the hard fail before any public App Store release.
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
const flagged = [];
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
      flagged.push(q.id);
      break;
    }
  }
  if (q.verified === true) verified++;
}

if (flagged.length) {
  console.log(
    `note: ${flagged.length} quotes match the §3.3 red list (non-PD authors) — kept per owner ` +
    `directive for the closed beta; re-enable the hard fail before any public release.`
  );
}

const out = join(ROOT, "public", "data", "quotes.json");
await writeFile(out, JSON.stringify({ quotes }));
console.log(
  `wrote ${out}: ${quotes.length} quotes (${verified} verified, ${quotes.length - verified} drafts pending verification per spec §3.4)`
);

// Re-seal the integrity manifest — quotes.json now lives under public/data.
const { writeManifest } = await import("./build-manifest.mjs");
await writeManifest(ROOT);
