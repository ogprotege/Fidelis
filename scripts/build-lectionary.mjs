#!/usr/bin/env node
/**
 * Builds public/data/lectionary.json from the Roman lectionary citation tables
 * of jayarathina/Tamil-Catholic-Lectionary (Unlicense / public domain).
 *
 * The source stores, for every liturgical day code (e.g. "OW10-4Thu 2" =
 * Thursday of the 10th week of Ordinary Time, weekday Year II), the readings
 * as bible citations with Tamil book abbreviations. Citations are
 * language-neutral once the book abbreviation is mapped, so we convert them to
 * canonical book slugs + verse spans usable with any translation in the app.
 *
 * Usage: node scripts/build-lectionary.mjs [path-to-readings__list.sql]
 *        (downloads from GitHub if no path given and no .cache copy exists)
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_URL =
  "https://raw.githubusercontent.com/jayarathina/Tamil-Catholic-Lectionary/master/MySQL/liturgy_lectionary_table_readings__list.sql";

// Tamil abbreviation -> canonical book slug. Order does not matter; matching
// is longest-prefix-first.
const TAMIL_BOOKS = {
  "தொநூ": "genesis",
  "விப": "exodus",
  "லேவி": "leviticus",
  "எண்": "numbers",
  "இச": "deuteronomy",
  "யோசு": "joshua",
  "நீத": "judges",
  "ரூத்": "ruth",
  "1சாமு": "1-samuel",
  "2சாமு": "2-samuel",
  "1அர": "1-kings",
  "2அர": "2-kings",
  "1குறி": "1-chronicles",
  "2குறி": "2-chronicles",
  "எஸ்ரா": "ezra",
  "நெகே": "nehemiah",
  "தோபி": "tobit",
  "யூதி": "judith",
  "எஸ்": "esther",
  "1மக்": "1-maccabees",
  "2மக்": "2-maccabees",
  "யோபு": "job",
  "திபா": "psalms",
  "நீமொ": "proverbs",
  "சஉ": "ecclesiastes",
  "இபா": "song-of-songs",
  "சாஞா": "wisdom",
  "சீஞா": "sirach",
  "எசா": "isaiah",
  "எரே": "jeremiah",
  "புல": "lamentations",
  "பாரூ": "baruch",
  "எசே": "ezekiel",
  "தானி": "daniel",
  "இணை": "deuteronomy",
  "ஓசே": "hosea",
  "யோவே": "joel",
  "ஆமோ": "amos",
  "ஒப": "obadiah",
  "யோனா": "jonah",
  "மீக்": "micah",
  "நாகூ": "nahum",
  "அப": "habakkuk",
  "செப்": "zephaniah",
  "ஆகா": "haggai",
  "செக்": "zechariah",
  "மலா": "malachi",
  "மத்": "matthew",
  "மாற்": "mark",
  "லூக்": "luke",
  "1யோவா": "1-john",
  "2யோவா": "2-john",
  "3யோவா": "3-john",
  "யோவா": "john",
  "திப": "acts",
  "உரோ": "romans",
  "1கொரி": "1-corinthians",
  "2கொரி": "2-corinthians",
  "கலா": "galatians",
  "எபே": "ephesians",
  "பிலி": "philippians",
  "கொலோ": "colossians",
  "1தெச": "1-thessalonians",
  "2தெச": "2-thessalonians",
  "1திமொ": "1-timothy",
  "2திமொ": "2-timothy",
  "தீத்": "titus",
  "பில": "philemon",
  "எபி": "hebrews",
  "யாக்": "james",
  "1பேது": "1-peter",
  "2பேது": "2-peter",
  "யூதா": "jude",
  "திவெ": "revelation"
};
const ABBREVS = Object.keys(TAMIL_BOOKS).sort((a, b) => b.length - a.length);

async function loadSql() {
  const argPath = process.argv[2];
  if (argPath) return readFile(argPath, "utf8");
  const cached = join(ROOT, ".cache", "readings__list.sql");
  try {
    await access(cached);
    return readFile(cached, "utf8");
  } catch {
    console.log(`downloading ${SRC_URL}`);
    const res = await fetch(SRC_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    await mkdir(join(ROOT, ".cache"), { recursive: true });
    await writeFile(cached, text);
    return text;
  }
}

/**
 * Parse one citation like "2குறி5:6-8,9b-10,13-6:2" into
 * { b: slug, s: [[ch, v1, v2], ...] }. v2 = 999 means "to end of chapter".
 * Letter suffixes (9b, 17de) and "காண்க" (= cf.) markers are dropped; they
 * subdivide verses, which our verse-granular texts cannot split.
 */
function parseCitation(raw) {
  let ref = raw.replace(/காண்க/g, "").replace(/\s+/g, "").split("~")[0].trim();
  let book = null;
  let mode = null;

  // Greek/deuterocanonical additions cited with their own numbering:
  // தானி(இ) = Daniel additions — "chapter 1" is the Prayer of Azariah/Benedicite
  // insert (Vulgate Dan 3:24ff, verse offset +23), 2 = Susanna (Dan 13),
  // 3 = Bel and the Dragon (Dan 14).
  if (ref.startsWith("தானி(இ)")) {
    book = "daniel";
    mode = "daniel-additions";
    ref = ref.slice("தானி(இ)".length);
  } else if (ref.startsWith("எஸ்(கி)")) {
    // Greek Esther C (Esther's prayer), letter-versed in the LXX; in the
    // Vulgate this is Esther 14. Mapped wholesale as a best effort.
    return { b: "esther", s: [[14, 1, 19]], partial: true };
  } else {
    for (const ab of ABBREVS) {
      if (ref.startsWith(ab)) {
        book = TAMIL_BOOKS[ab];
        ref = ref.slice(ab.length);
        break;
      }
    }
  }
  if (!book) return null;

  // "Mal 1:14b-2:1-2" — chapter-crossing range with a trailing end-verse
  const malStyle = ref.match(/^(\d+):(\d+)[a-z]*-(\d+):(\d+)[a-z]*-(\d+)[a-z]*(.*)$/);
  if (malStyle) {
    const [, c1, v1, c2, v2a, v2b, rest] = malStyle;
    ref = `${c1}:${v1}-${c2}:${v2a}` + (rest || "");
    // re-inject the range end as an extra segment on chapter c2
    ref += `,${v2a}-${v2b}`;
  }

  const spans = [];
  const SINGLE_CHAPTER = new Set(["obadiah", "philemon", "2-john", "3-john", "jude"]);
  let chapter = null;
  let ok = true;
  // Segments split by ; or , or . — each is "ch:vv", "v", "v-v", "v-ch:v", "ch:v-ch:v"
  for (const seg of ref.split(/[;,.]/)) {
    if (!seg) continue;
    if (/^[a-z]+$/.test(seg)) continue; // letter-only continuation like "4a,c"
    const m = seg.match(
      /^(?:(\d+):)?(\d+)[a-z]*(?:-(?:(\d+):)?(\d+)[a-z]*|-[a-z]+)?$/
    );
    if (!m) {
      ok = false;
      continue;
    }
    const [, chL, vL, chR, vR] = m;
    if (chL) chapter = parseInt(chL, 10);
    if (chapter === null) {
      if (SINGLE_CHAPTER.has(book)) chapter = 1;
      else {
        // lost chapter context (e.g. a preceding malformed segment) — bail out
        ok = false;
        continue;
      }
    }
    const v1 = parseInt(vL, 10);
    if (chR && parseInt(chR, 10) !== chapter) {
      // cross-chapter range: rest of this chapter, then start of the next
      const ch2 = parseInt(chR, 10);
      spans.push([chapter, v1, 999]);
      for (let c = chapter + 1; c < ch2; c++) spans.push([c, 1, 999]);
      spans.push([ch2, 1, parseInt(vR, 10)]);
      chapter = ch2;
    } else {
      spans.push([chapter, v1, vR ? parseInt(vR, 10) : v1]);
    }
  }
  if (!spans.length) return null;

  if (mode === "daniel-additions") {
    for (const span of spans) {
      if (span[0] === 1) {
        span[0] = 3;
        span[1] += 23;
        if (span[2] !== 999) span[2] += 23;
      } else if (span[0] === 2) span[0] = 13;
      else if (span[0] === 3) span[0] = 14;
    }
  }
  return { b: book, s: spans, ...(ok ? {} : { partial: true }) };
}

const sql = await loadSql();
const rowRe = /\('((?:[^'\\]|\\.)*)',\s*([\d.]+),\s*'((?:[^'\\]|\\.)*)'\)/g;
const days = {};
let total = 0;
let unparsed = 0;

for (const m of sql.matchAll(rowRe)) {
  const [, dayID, typeStr, rawRef] = m;
  const type = parseFloat(typeStr);
  // type groups: 0 procession, 1 first reading, 2 psalm, 3 second reading,
  // 4 sequence (Latin hymns, not scripture), 5 gospel acclamation, 6 gospel.
  // We keep the scripture readings: 1, 2, 3, 6.
  const group = Math.floor(type);
  if (group !== 1 && group !== 2 && group !== 3 && group !== 6) continue;
  const parsed = parseCitation(rawRef.replace(/\\'/g, "'"));
  total++;
  if (!parsed) {
    unparsed++;
    continue;
  }
  (days[dayID] ??= []).push({ t: type, ...parsed });
}

for (const list of Object.values(days)) list.sort((a, b) => a.t - b.t);

const out = join(ROOT, "public", "data", "lectionary.json");
await writeFile(out, JSON.stringify(days));
console.log(
  `wrote ${out}: ${Object.keys(days).length} day codes, ${total - unparsed}/${total} citations parsed`
);
if (unparsed) {
  console.log(`note: ${unparsed} citations skipped (non-standard format)`);
}
