/**
 * §5 — the CCC citation index. Parses the "Index of Citations / Sacred Scripture"
 * appendix of the USCCB 2nd-Ed Catechism PDF into citation FACTS only
 * (verse -> CCC paragraph numbers) and emits public/data/ccc/index.json. The
 * paragraph TEXT is never read into the repo — only the index facts and (in
 * build-ccc-urls) the vatican.va URLs. See the design spec + LOCAL-BUILD-RUNBOOK.
 *
 * The PDF is the user's local copy (copyrighted, not committed). Point CCC_PDF at
 * it. Run: CCC_PDF="…/Catechism…_2nd-ED.pdf" tsx scripts/build-ccc.mjs
 *
 * Psalms: the CCC numbers Psalms in Hebrew/modern numbering; our bundles are
 * Vulgate. Every Psalm citation is mapped with the existing tested
 * hebrewSpanToVulgate() so "Ps 23:1" keys to "psalms 22:1".
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hebrewSpanToVulgate } from "../src/lib/lectionary.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PDF =
  process.env.CCC_PDF ||
  "/Users/biscuit/Desktop/Academic-Theological-Treatises/Magisterial Sources/Catechism/Catechism of the Catholic Church_2nd-ED.pdf";
const FIRST_PAGE = 709; // pdftotext page where "Sacred Scripture" / Genesis begins
const LAST_PAGE = 740; // Revelation ends here; "Professions of Faith" (non-Scripture) follows

const bookMeta = JSON.parse(readFileSync(join(ROOT, "src/generated/bookMeta.json"), "utf8"));

// CCC (Douay-ish NAB) book name -> app slug. Lowercased, punctuation-stripped keys.
const BOOKMAP = {
  genesis: "genesis", exodus: "exodus", leviticus: "leviticus", numbers: "numbers",
  deuteronomy: "deuteronomy", joshua: "joshua", judges: "judges", ruth: "ruth",
  "1 samuel": "1-samuel", "2 samuel": "2-samuel", "1 kings": "1-kings", "2 kings": "2-kings",
  "1 chronicles": "1-chronicles", "2 chronicles": "2-chronicles", ezra: "ezra", nehemiah: "nehemiah",
  tobit: "tobit", judith: "judith", esther: "esther",
  "1 maccabees": "1-maccabees", "2 maccabees": "2-maccabees",
  job: "job", psalms: "psalms", proverbs: "proverbs", ecclesiastes: "ecclesiastes",
  "song of solomon": "song-of-songs", "song of songs": "song-of-songs",
  wisdom: "wisdom", sirach: "sirach",
  isaiah: "isaiah", jeremiah: "jeremiah", lamentations: "lamentations", baruch: "baruch",
  ezechiel: "ezekiel", ezekiel: "ezekiel", daniel: "daniel",
  hosea: "hosea", joel: "joel", amos: "amos", obadiah: "obadiah", jonah: "jonah",
  micah: "micah", nahum: "nahum", habakkuk: "habakkuk", zephaniah: "zephaniah",
  haggai: "haggai", zachariah: "zechariah", zechariah: "zechariah", malachi: "malachi",
  matthew: "matthew", mark: "mark", luke: "luke", john: "john",
  "acts of the apostles": "acts", acts: "acts",
  romans: "romans", "1 corinthians": "1-corinthians", "2 corinthians": "2-corinthians",
  galatians: "galatians", ephesians: "ephesians", philippians: "philippians", colossians: "colossians",
  "1 thessalonians": "1-thessalonians", "2 thessalonians": "2-thessalonians",
  "1 timothy": "1-timothy", "2 timothy": "2-timothy", titus: "titus", philemon: "philemon",
  hebrews: "hebrews", james: "james", "1 peter": "1-peter", "2 peter": "2-peter",
  "1 john": "1-john", "2 john": "2-john", "3 john": "3-john", jude: "jude",
  revelation: "revelation", apocalypse: "revelation",
};
const SINGLE_CHAPTER = new Set(["obadiah", "philemon", "2-john", "3-john", "jude"]);

// ── extract the index, column by column, in reading order ───────────────────
let text = "";
for (let pg = FIRST_PAGE; pg <= LAST_PAGE; pg++) {
  for (const [x, w] of [[0, 212], [222, 212]]) {
    const col = execFileSync(
      "pdftotext",
      ["-layout", "-f", String(pg), "-l", String(pg), "-x", String(x), "-y", "0", "-W", String(w), "-H", "666", PDF, "-"],
      { maxBuffer: 64 * 1024 * 1024 }
    ).toString();
    text += col + "\n";
  }
}
const lines = text.split("\n");

// ── parse ───────────────────────────────────────────────────────────────────
const SKIP = /^(index of citations|sacred scripture|old testament|new testament|the arabic|number\(s\)|the citation has been|in the original)/i;
const index = {}; // "slug ch:v" -> Set<int>
const dropped = [];
let book = null;
let lastKeys = null; // verse keys the previous citation line populated (for continuations)

function parasFrom(s) {
  // tokens like "219", "444*", "2058," — strip * and commas, keep ints in [1,2865]
  const out = [];
  for (const tok of s.split(/[,\s]+/)) {
    const m = tok.match(/^(\d+)\*?$/);
    if (m) {
      const n = +m[1];
      if (n >= 1 && n <= 2865) out.push(n);
    }
  }
  return out;
}
function versesInChapter(slug, ch) {
  return bookMeta[slug]?.verses?.[ch - 1] ?? 0;
}
function keysForRef(slug, ref) {
  // ref forms: "ch:v", "ch:v-w" (same ch), "ch:v-ch2:w" (cross), "ch" or "ch-ch2"
  const single = SINGLE_CHAPTER.has(slug);
  let m;
  if ((m = ref.match(/^(\d+):(\d+)-(\d+):(\d+)$/))) {
    // cross-chapter range -> anchor on the start verse only
    return [`${slug} ${+m[1]}:${+m[2]}`];
  }
  if ((m = ref.match(/^(\d+):(\d+)-(\d+)$/))) {
    const ch = +m[1], a = +m[2], b = +m[3];
    const out = [];
    for (let v = a; v <= b; v++) out.push(`${slug} ${ch}:${v}`);
    return out;
  }
  if ((m = ref.match(/^(\d+):(\d+)$/))) {
    return [`${slug} ${+m[1]}:${+m[2]}`];
  }
  if (single && (m = ref.match(/^(\d+)-(\d+)$/))) {
    const out = [];
    for (let v = +m[1]; v <= +m[2]; v++) out.push(`${slug} 1:${v}`);
    return out;
  }
  if (single && (m = ref.match(/^(\d+)$/))) {
    return [`${slug} 1:${+m[1]}`];
  }
  if ((m = ref.match(/^(\d+)-(\d+)$/))) {
    // whole-chapter range -> anchor on first verse of first chapter
    return [`${slug} ${+m[1]}:1`];
  }
  if ((m = ref.match(/^(\d+)$/))) {
    // whole chapter -> first verse
    return [`${slug} ${+m[1]}:1`];
  }
  return null;
}
function mapPsalm(key) {
  // key "psalms ch:v" -> Vulgate via hebrewSpanToVulgate(ch, v, v)
  const m = key.match(/^psalms (\d+):(\d+)$/);
  if (!m) return key;
  const ch = +m[1], v = +m[2];
  try {
    const r = hebrewSpanToVulgate(ch, v, v)[0];
    return `psalms ${r[0]}:${r[1]}`;
  } catch {
    return key;
  }
}
function addKey(rawKey, paras) {
  let key = rawKey.startsWith("psalms ") ? mapPsalm(rawKey) : rawKey;
  // validate against the bundle grid
  const m = key.match(/^(\S+) (\d+):(\d+)$/);
  if (!m) { dropped.push(rawKey); return false; }
  const [, slug, chS, vS] = m;
  const ch = +chS, v = +vS;
  const vc = versesInChapter(slug, ch);
  if (!vc || ch < 1 || v < 1 || v > vc) { dropped.push(`${rawKey} -> ${key}`); return false; }
  (index[key] ??= new Set());
  for (const p of paras) index[key].add(p);
  return true;
}

for (const rawLine of lines) {
  const line = rawLine.replace(/\f/g, "").trimEnd();
  const t = line.trim();
  if (!t) continue;
  if (SKIP.test(t)) continue;
  if (/^\d{3}$/.test(t) && +t >= 680 && +t <= 760) continue; // page-number header
  // non-Scripture category reached -> stop
  if (/^(professions of faith|ecumenical councils|pontifical|ecclesiastical|liturgy|fathers|other)/i.test(t)) break;

  // book heading?
  const bn = t.toLowerCase().replace(/[.’']/g, "").replace(/\s+/g, " ").trim();
  if (BOOKMAP[bn]) { book = BOOKMAP[bn]; lastKeys = null; continue; }

  if (!book) continue;

  // citation line: starts with a ref token, then paras
  // ref: \d+:\d+(-\d+(:\d+)?)?  or (single-chapter) \d+(-\d+)?
  const cm = t.match(/^(\d+(?::\d+)?(?:-\d+(?::\d+)?)?)\s+(.*)$/);
  if (cm) {
    const ref = cm[1];
    const paras = parasFrom(cm[2]);
    if (!paras.length) { lastKeys = null; continue; }
    const keys = keysForRef(book, ref);
    if (!keys) { dropped.push(`${book} ${ref}`); lastKeys = null; continue; }
    const okKeys = [];
    for (const k of keys) if (addKey(k, paras)) okKeys.push(k.startsWith("psalms ") ? mapPsalm(k) : k);
    lastKeys = okKeys.length ? okKeys : null;
    continue;
  }

  // continuation line: only paragraph numbers, indented -> append to previous keys
  if (lastKeys && /^\s+/.test(line) && /^[\d,\s*]+$/.test(t)) {
    const paras = parasFrom(t);
    for (const k of lastKeys) if (index[k]) for (const p of paras) index[k].add(p);
    continue;
  }
  lastKeys = null;
}

// ── emit ──────────────────────────────────────────────────────────────────
const sortedKeys = Object.keys(index).sort();
const out = {};
let pairCount = 0;
for (const k of sortedKeys) {
  const arr = [...index[k]].sort((a, b) => a - b);
  out[k] = arr;
  pairCount += arr.length;
}
const dir = join(ROOT, "public", "data", "ccc");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "index.json"), JSON.stringify(out));
console.log(`index.json: ${sortedKeys.length} verse keys, ${pairCount} verse→¶ pairs`);
console.log(`dropped (unmappable): ${dropped.length}`);
if (dropped.length) console.log("  e.g.: " + dropped.slice(0, 12).join(" | "));
// quick anchor report
for (const a of ["john 3:16", "matthew 16:18", "genesis 1:1", "psalms 22:1", "romans 5:12"]) {
  console.log(`  anchor ${a}: ${out[a] ? out[a].join(",") : "(none)"}`);
}
