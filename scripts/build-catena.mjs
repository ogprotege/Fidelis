#!/usr/bin/env node
/**
 * Builds the Catena Aurea commentary layer (spec §4.1) into per-Gospel JSON
 * under public/data/commentary/catena/<gospel>.json, DE-DUPLICATED (format 2):
 * each pericope's patristic chain is stored ONCE with the grid verse keys it
 * covers —
 *
 *   { "format": 2, "blocks": [ { "keys": ["5:1","5:2"],
 *     "entries": [ { "father": "Chrysostom", "text": "..." }, ... ] }, ... ] }
 *
 * — and expandCatenaSpans() (src/lib/commentary.ts) re-broadcasts it at load
 * time into the spec §4.1 per-verse map the Reader consumes. The legacy files
 * copied every chain into every verse of its span, ~5-10× the necessary bytes
 * (matthew.json was ~10 MB in the shipped app binary).
 *
 * Source: Isidore-Guild/catena (OSIS catena.xml) — the Oxford "Library of the
 * Fathers" English translation of St. Thomas Aquinas's Catena Aurea (Newman ed.,
 * 1842), released CC0 / public domain. Pinned by commit in scripts/pins.mjs
 * (P1-10); the cache is keyed by the pin. Four Gospels only (acceptable per §4.1).
 *
 * Each <div annotateRef="Matt.5.1-Matt.5.3"> is a patristic chain on a pericope.
 * The Gospel lemma (the <p osisID> with <hi type="italic">) is dropped — Fidelis
 * already serves DRB/CPDV/Vulgate verse text; the Catena's Oxford rendering must
 * never substitute into the Reader grid.
 *
 * Usage: node scripts/build-catena.mjs [--cache-dir <dir>]
 *
 * See docs/review/Commentary_Sources_Survey.md for the source decision.
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PINS } from "./pins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIN = PINS.catena; // pinned commit, never a moving branch (P1-10)
const FILE = "catena.xml";

const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");

const OSIS_BOOK = { Matt: "matthew", Mark: "mark", Luke: "luke", John: "john" };

// --- pure parser (asserted by fixture in scripts/test-data.ts §14) ---

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Strip OSIS markup to plain text: drop editor <note>s, unwrap <reference>/<hi>. */
function cleanCatenaText(s) {
  return decodeEntities(
    s
      .replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, " ") // editor footnotes are apparatus, not the Father
      .replace(/<reference\b[^>]*>([\s\S]*?)<\/reference>/g, "$1") // keep the visible ref text
      .replace(/<hi\b[^>]*\/>/g, " ") // empty <hi/>
      .replace(/<hi\b[^>]*>([\s\S]*?)<\/hi>/g, "$1") // unwrap italic/bold runs
      .replace(/<[^>]+>/g, " ") // any other tag
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse the OSIS catena.xml into per-Gospel PERICOPE blocks, in document order:
 *   { matthew: [ { ch, v1, v2, entries: [{father,text}] } ], mark, luke, john }
 * A no-bold <p> continues the previous Father's comment; the <p osisID> lemma is
 * skipped. The chain is stored once per pericope — the per-verse broadcast is a
 * LOAD-TIME operation now (expandCatenaSpans in src/lib/commentary.ts), never a
 * storage one.
 */
export function parseCatenaOsis(xml) {
  const out = { matthew: [], mark: [], luke: [], john: [] };
  const divRe = /<div\s+annotateRef="([^"]+)"\s+annotateType="commentary"[^>]*>([\s\S]*?)<\/div>/g;
  let d;
  while ((d = divRe.exec(xml))) {
    const ref = d[1], body = d[2];
    const [a, b] = ref.split("-");
    const ap = a.split(".");
    const bp = (b || a).split(".");
    const slug = OSIS_BOOK[ap[0]];
    if (!slug) continue; // not a Gospel
    const ch = +ap[1], v1 = +ap[2], v2 = +bp[2];
    const entries = [];
    const pRe = /<p(\s[^>]*)?>([\s\S]*?)<\/p>/g;
    let p;
    while ((p = pRe.exec(body))) {
      const attrs = p[1] || "";
      if (/\bosisID=/.test(attrs)) continue; // the Gospel lemma — never a comment
      const inner = p[2];
      const boldM = inner.match(/^\s*<hi type="bold">([\s\S]*?)<\/hi>/);
      if (boldM) {
        const father = cleanCatenaText(boldM[1]).replace(/:\s*$/, "").trim();
        const text = cleanCatenaText(inner.slice(boldM[0].length));
        if (text) entries.push({ father, text });
      } else {
        const text = cleanCatenaText(inner);
        if (!text) continue;
        if (entries.length) entries[entries.length - 1].text = `${entries[entries.length - 1].text} ${text}`.trim();
        else entries.push({ father: "", text });
      }
    }
    if (!entries.length) continue;
    out[slug].push({ ch, v1, v2, entries });
  }
  return out;
}

// --- build orchestration ---

const exists = (p) => access(p).then(() => true, () => false);

async function fetchCatena() {
  const cached = join(CACHE, `catena-${PIN.commit.slice(0, 12)}.xml`);
  if (await exists(cached)) return readFile(cached, "utf8");
  const url = `https://raw.githubusercontent.com/${PIN.repo}/${PIN.commit}/${FILE}`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return text;
}

/**
 * Map a Catena (AV/KJV-versified) Gospel key onto our Vulgate/Douay grid. The two
 * editions differ in exactly two Gospel chapters (verified against the lemmas):
 *   - Mark 9: the Douay chapter starts one verse later (AV 9:1 = Douay 8:39), so
 *     AV N → Douay N-1, and AV 9:1 → Mark 8:39.
 *   - Matt 17: Douay merges AV 17:14-15 into 17:14, so AV N → N (N≤14) else N-1.
 * There is no lectionary helper for Gospel versification (the lectionary cites
 * Vulgate Gospels directly), so this minimal explicit map is asserted by incipit
 * in scripts/test-data.ts.
 */
function remapGospelKey(slug, ch, v) {
  if (slug === "mark" && ch === 9) return v === 1 ? [8, 39] : [9, v - 1];
  if (slug === "matthew" && ch === 17) return [17, v <= 14 ? v : v - 1];
  return [ch, v];
}

async function main() {
  const xml = await fetchCatena();
  // Commentary divs are flat (only <p> inside); a nested <div> would truncate the
  // non-greedy block match. Guard against it by inspecting each captured body.
  let nested = 0;
  for (const m of xml.matchAll(/<div\s+annotateRef="[^"]+"\s+annotateType="commentary"[^>]*>([\s\S]*?)<\/div>/g)) {
    if (m[1].includes("<div")) nested++;
  }
  if (nested) console.warn(`  WARNING: ${nested} commentary block(s) contain a nested <div> — block regex may truncate them`);
  const parsed = parseCatenaOsis(xml);
  const outDir = join(ROOT, "public", "data", "commentary", "catena");
  await mkdir(outDir, { recursive: true });
  let totalBlocks = 0, totalStored = 0, dropped = 0;
  const uniqueKeys = new Set();
  const droppedSamples = [];
  for (const slug of Object.keys(parsed)) {
    const drc = JSON.parse(readFileSync(join(ROOT, "public", "data", "drc", `${slug}.json`), "utf8"));
    const blocks = [];
    for (const { ch, v1, v2, entries } of parsed[slug]) {
      // Each source verse of the span remaps onto our grid independently (the
      // Mark 9 boundary crosses a chapter; the Matt 17:14-15 merge collapses two
      // source verses onto one key — the Set keeps the key list unique).
      const keys = new Set();
      for (let v = v1; v <= v2; v++) {
        const [ck, vk] = remapGospelKey(slug, ch, v);
        const inGrid = ck >= 1 && ck <= drc.chapters.length && vk >= 1 && vk <= (drc.chapters[ck - 1]?.length ?? 0);
        if (!inGrid) {
          dropped++;
          if (droppedSamples.length < 12) droppedSamples.push(`${slug} ${ch}:${v}`);
          continue;
        }
        keys.add(`${ck}:${vk}`);
      }
      if (!keys.size) continue;
      blocks.push({ keys: [...keys], entries });
      totalBlocks++;
      totalStored += entries.length;
      for (const k of keys) uniqueKeys.add(`${slug} ${k}`);
    }
    await writeFile(join(outDir, `${slug}.json`), JSON.stringify({ format: 2, blocks }));
  }
  console.log(
    `Catena: 4 Gospels, ${totalBlocks} pericope blocks, ${totalStored} stored comment-segments, ` +
    `${uniqueKeys.size} verse-keys covered (format 2 — chains stored once, expanded at load).`
  );
  if (dropped) console.log(`  WARNING: ${dropped} out-of-grid keys dropped: ${droppedSamples.join(", ")}${dropped > 12 ? " …" : ""}`);

  const { writeManifest } = await import("./build-manifest.mjs");
  await writeManifest(ROOT);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) await main();
