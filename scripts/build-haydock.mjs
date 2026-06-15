#!/usr/bin/env node
/**
 * Builds the Haydock commentary layer (spec §4.1) into per-book verse-keyed JSON
 * under public/data/commentary/haydock/<slug>.json, shaped exactly as the spec:
 *
 *   { "3:16": [ { "src": "Witham", "text": "..." }, ... ], ... }
 *
 * Source: cmahte/ENG-B-Haydock1883-pd-PSFM (USFM/PSFM transcription of the 1883
 * Dunigan "Haydock's Catholic Family Bible"), public domain by age. Pinned by
 * commit in scripts/pins.mjs (P1-10); the per-file cache is keyed by the pin so
 * a stale download can never shadow it. The underlying text is verse-keyed via
 * \f + \fr CH:VERSE \ft ... \f* footnote markers, so no OCR or HTML scraping.
 *
 * Usage: node scripts/build-haydock.mjs [--cache-dir <dir>]
 *
 * See docs/review/Commentary_Sources_Survey.md for the source decision and the
 * itemized cleanup this parser performs.
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { PINS } from "./pins.mjs";
import { hebrewSpanToVulgate } from "../src/lib/lectionary.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIN = PINS.haydock; // pinned commit, never a moving branch (P1-10)

const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");

// USFM file number · USFM book code · our canon.ts slug. The 73-book canon only:
// 00-FRT (front matter), 48-INT (NT intro) and 77-BAK (CPDV2009 back matter) are
// excluded; numbering skips slots 47 and 63 upstream (no books missing).
const BOOKS = [
  ["01", "GEN", "genesis"], ["02", "EXO", "exodus"], ["03", "LEV", "leviticus"],
  ["04", "NUM", "numbers"], ["05", "DEU", "deuteronomy"], ["06", "JOS", "joshua"],
  ["07", "JDG", "judges"], ["08", "RUT", "ruth"], ["09", "1SA", "1-samuel"],
  ["10", "2SA", "2-samuel"], ["11", "1KI", "1-kings"], ["12", "2KI", "2-kings"],
  ["13", "1CH", "1-chronicles"], ["14", "2CH", "2-chronicles"], ["15", "EZR", "ezra"],
  ["16", "NEH", "nehemiah"], ["17", "TOB", "tobit"], ["18", "JDT", "judith"],
  ["19", "EST", "esther"], ["20", "JOB", "job"], ["21", "PSA", "psalms"],
  ["22", "PRO", "proverbs"], ["23", "ECC", "ecclesiastes"], ["24", "SNG", "song-of-songs"],
  ["25", "WIS", "wisdom"], ["26", "SIR", "sirach"], ["27", "ISA", "isaiah"],
  ["28", "JER", "jeremiah"], ["29", "LAM", "lamentations"], ["30", "BAR", "baruch"],
  ["31", "EZK", "ezekiel"], ["32", "DAN", "daniel"], ["33", "HOS", "hosea"],
  ["34", "JOL", "joel"], ["35", "AMO", "amos"], ["36", "OBA", "obadiah"],
  ["37", "JON", "jonah"], ["38", "MIC", "micah"], ["39", "NAM", "nahum"],
  ["40", "HAB", "habakkuk"], ["41", "ZEP", "zephaniah"], ["42", "HAG", "haggai"],
  ["43", "ZEC", "zechariah"], ["44", "MAL", "malachi"], ["45", "1MA", "1-maccabees"],
  ["46", "2MA", "2-maccabees"], ["49", "MAT", "matthew"], ["50", "MRK", "mark"],
  ["51", "LUK", "luke"], ["52", "JHN", "john"], ["53", "ACT", "acts"],
  ["54", "ROM", "romans"], ["55", "1CO", "1-corinthians"], ["56", "2CO", "2-corinthians"],
  ["57", "GAL", "galatians"], ["58", "EPH", "ephesians"], ["59", "PHP", "philippians"],
  ["60", "COL", "colossians"], ["61", "1TH", "1-thessalonians"], ["62", "2TH", "2-thessalonians"],
  ["64", "1TI", "1-timothy"], ["65", "2TI", "2-timothy"], ["66", "TIT", "titus"],
  ["67", "PHM", "philemon"], ["68", "HEB", "hebrews"], ["69", "JAM", "james"],
  ["70", "1PE", "1-peter"], ["71", "2PE", "2-peter"], ["72", "1JN", "1-john"],
  ["73", "2JN", "2-john"], ["74", "3JN", "3-john"], ["75", "JUD", "jude"],
  ["76", "REV", "revelation"]
];

// --- pure parser (asserted by fixture in scripts/test-data.ts §14) ---

/** Strip residual SFM sub-markers (\fk \fqa \fq …) and collapse whitespace. */
function cleanNoteText(s) {
  return s
    .replace(/\\\+?[a-z]+\*?/gi, " ") // \fk \fqa \fq* and nested \+nd…\+nd* styles
    .replace(/\[or \d+\.\]\s*/g, "") // transcriber's alternate-verse marker, made redundant by the remap onto our grid
    .replace(/\s+/g, " ")
    .trim();
}

/** Peel trailing parenthetical attributions: "...text (Calmet)" -> {src:"Calmet", text:"...text"}. */
function extractAttribution(seg) {
  let text = seg.trim();
  const srcs = [];
  let m;
  while ((m = text.match(/\s*\(([^()]+)\)\s*$/))) {
    srcs.unshift(m[1].trim());
    text = text.slice(0, m.index).trim();
  }
  return { src: srcs.join("; "), text };
}

/** A Haydock footnote body -> ordered {src,text} segments split on ' --- '. */
function splitSegments(body) {
  return cleanNoteText(body)
    .split(/ +--- +/) // the spaced separator only; bare '---' stays in prose
    .map((p) => extractAttribution(p))
    .filter((e) => e.text);
}

/**
 * Parse one book's USFM into { "ch:verse": [{src,text}, ...] }. Footnotes are
 * collected at each chapter's end in the source, but every \fr carries its own
 * CH:VERSE, so position is irrelevant. Verse-range notes (\fr 16:8-9) broadcast
 * to every verse in the span; \fr 0:* book/chapter-intro sentinels are skipped.
 */
export function parseHaydockSfm(sfm) {
  const out = {};
  const re = /\\f\s+\+\s+\\fr\s+(\d+):(\d+)(?:-(\d+))?\s*\\ft\s+([\s\S]*?)\\f\*/g;
  let m;
  while ((m = re.exec(sfm))) {
    const ch = +m[1], v1 = +m[2], v2 = m[3] ? +m[3] : v1;
    if (ch === 0 || v1 === 0) continue;
    const segs = splitSegments(m[4]);
    if (!segs.length) continue;
    for (let v = v1; v <= v2; v++) {
      const key = `${ch}:${v}`;
      (out[key] ??= []).push(...segs.map((s) => ({ ...s })));
    }
  }
  return out;
}

// --- build orchestration ---

const exists = (p) => access(p).then(() => true, () => false);

async function fetchBook(num, code) {
  const fname = `${num}-${code}-ENG[B]DRC1750[pd].p.sfm`;
  const cached = join(CACHE, `haydock-${code}-${PIN.commit.slice(0, 12)}.sfm`);
  if (await exists(cached)) return readFile(cached, "utf8");
  const url = `https://raw.githubusercontent.com/${PIN.repo}/${PIN.commit}/${encodeURIComponent(fname)}`;
  console.log(`  downloading ${code}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return text;
}

/** Sort "ch:verse" keys numerically for deterministic, reviewable diffs. */
function sortKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort((a, b) => {
    const [ac, av] = a.split(":").map(Number);
    const [bc, bv] = b.split(":").map(Number);
    return ac - bc || av - bv;
  })) out[k] = obj[k];
  return out;
}

/**
 * Map a Haydock psalm key onto our Vulgate grid. cmahte-Haydock numbers the
 * renumbered Vulgate second-halves (Ps 115, 147) with the continuous verse
 * numbers it flags as "[or N.]" — the same numbers the Hebrew/modern citation
 * uses — so route them through the lectionary's psalm-split helper rather than
 * reinventing the offset. Joined psalms (9, 113) already match our grid.
 */
function remapPsalmKey(ch, v) {
  if (ch === 115) { const r = hebrewSpanToVulgate(116, v, v)[0]; return [r[0], r[1]]; } // 115:10→115:1
  if (ch === 147) { const r = hebrewSpanToVulgate(147, v, v)[0]; return [r[0], r[1]]; } // 147:12→147:1
  return [ch, v];
}

/** Append comments to a verse key, dropping any exact duplicate (a remap can
 *  collapse two source verses onto one grid verse). */
function addComments(book, key, comments) {
  const arr = (book[key] ??= []);
  for (const c of comments) {
    const s = JSON.stringify(c);
    if (!arr.some((x) => JSON.stringify(x) === s)) arr.push(c);
  }
}

async function main() {
  const outDir = join(ROOT, "public", "data", "commentary", "haydock");
  await mkdir(outDir, { recursive: true });
  let totalNotes = 0, totalKeys = 0, dropped = 0;
  const droppedSamples = [];
  for (const [num, code, slug] of BOOKS) {
    const sfm = await fetchBook(num, code);
    const parsed = parseHaydockSfm(sfm);
    // Validate every key lands on a real coordinate in OUR DRC grid (Douay
    // slugs, Vulgate Psalm numbering). Haydock is already Vulgate-versified, so
    // no remapping is needed; an out-of-grid key is a genuine alignment fault.
    const drc = JSON.parse(readFileSync(join(ROOT, "public", "data", "drc", `${slug}.json`), "utf8"));
    const book = {};
    for (const [key, notes] of Object.entries(parsed)) {
      let [ch, v] = key.split(":").map(Number);
      if (slug === "psalms") [ch, v] = remapPsalmKey(ch, v);
      const inGrid = ch >= 1 && ch <= drc.chapters.length && v >= 1 && v <= (drc.chapters[ch - 1]?.length ?? 0);
      if (!inGrid) {
        dropped++;
        if (droppedSamples.length < 12) droppedSamples.push(`${slug} ${key}`);
        continue;
      }
      addComments(book, `${ch}:${v}`, notes);
    }
    for (const k of Object.keys(book)) { totalKeys++; totalNotes += book[k].length; }
    await writeFile(join(outDir, `${slug}.json`), JSON.stringify(sortKeys(book)));
  }
  console.log(`Haydock: ${BOOKS.length} books, ${totalKeys} verse-keys, ${totalNotes} note-segments.`);
  if (dropped) console.log(`  WARNING: ${dropped} out-of-grid keys dropped: ${droppedSamples.join(", ")}${dropped > 12 ? " …" : ""}`);

  // Re-seal the integrity manifest over everything under public/data (P1-10).
  const { writeManifest } = await import("./build-manifest.mjs");
  await writeManifest(ROOT);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) await main();
