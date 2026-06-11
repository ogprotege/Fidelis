#!/usr/bin/env node
/**
 * Downloads public-domain Catholic bible texts from scrollmapper/bible_databases
 * and splits them into per-book JSON chunks under public/data/<translation>/.
 *
 * Texts are written verbatim (whitespace-trimmed only) — no editorial changes.
 *
 * Usage: node scripts/build-data.mjs [--cache-dir <dir>]
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE =
  "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json";

const cacheArg = process.argv.indexOf("--cache-dir");
const CACHE = cacheArg !== -1 ? process.argv[cacheArg + 1] : join(ROOT, ".cache");

// translation id -> scrollmapper file name
const SOURCES = {
  drc: "DRC",
  cpdv: "CPDV",
  vulgate: "VulgClementine"
};

// Source book name -> canonical slug (canonical Vulgate order, 73 books + appendix)
const SLUGS = {
  "Genesis": "genesis",
  "Exodus": "exodus",
  "Leviticus": "leviticus",
  "Numbers": "numbers",
  "Deuteronomy": "deuteronomy",
  "Joshua": "joshua",
  "Judges": "judges",
  "Ruth": "ruth",
  "I Samuel": "1-samuel",
  "II Samuel": "2-samuel",
  "I Kings": "1-kings",
  "II Kings": "2-kings",
  "I Chronicles": "1-chronicles",
  "II Chronicles": "2-chronicles",
  "Ezra": "ezra",
  "Nehemiah": "nehemiah",
  "Tobit": "tobit",
  "Judith": "judith",
  "Esther": "esther",
  "Job": "job",
  "Psalms": "psalms",
  "Proverbs": "proverbs",
  "Ecclesiastes": "ecclesiastes",
  "Song of Solomon": "song-of-songs",
  "Wisdom": "wisdom",
  "Sirach": "sirach",
  "Isaiah": "isaiah",
  "Jeremiah": "jeremiah",
  "Lamentations": "lamentations",
  "Baruch": "baruch",
  "Ezekiel": "ezekiel",
  "Daniel": "daniel",
  "Hosea": "hosea",
  "Joel": "joel",
  "Amos": "amos",
  "Obadiah": "obadiah",
  "Jonah": "jonah",
  "Micah": "micah",
  "Nahum": "nahum",
  "Habakkuk": "habakkuk",
  "Zephaniah": "zephaniah",
  "Haggai": "haggai",
  "Zechariah": "zechariah",
  "Malachi": "malachi",
  "I Maccabees": "1-maccabees",
  "II Maccabees": "2-maccabees",
  "Matthew": "matthew",
  "Mark": "mark",
  "Luke": "luke",
  "John": "john",
  "Acts": "acts",
  "Romans": "romans",
  "I Corinthians": "1-corinthians",
  "II Corinthians": "2-corinthians",
  "Galatians": "galatians",
  "Ephesians": "ephesians",
  "Philippians": "philippians",
  "Colossians": "colossians",
  "I Thessalonians": "1-thessalonians",
  "II Thessalonians": "2-thessalonians",
  "I Timothy": "1-timothy",
  "II Timothy": "2-timothy",
  "Titus": "titus",
  "Philemon": "philemon",
  "Hebrews": "hebrews",
  "James": "james",
  "I Peter": "1-peter",
  "II Peter": "2-peter",
  "I John": "1-john",
  "II John": "2-john",
  "III John": "3-john",
  "Jude": "jude",
  "Revelation of John": "revelation",
  "Prayer of Manasses": "prayer-of-manasseh",
  "I Esdras": "3-esdras",
  "II Esdras": "4-esdras",
  "Additional Psalm": "psalm-151",
  "Laodiceans": "laodiceans"
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchSource(file) {
  const cached = join(CACHE, `${file}.json`);
  if (await exists(cached)) {
    console.log(`  using cached ${cached}`);
    return JSON.parse(await readFile(cached, "utf8"));
  }
  const url = `${BASE}/${file}.json`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return JSON.parse(text);
}

const meta = {}; // slug -> { chapters, verses: number[] } (max across translations)

for (const [id, file] of Object.entries(SOURCES)) {
  console.log(`Building ${id} (${file})...`);
  const src = await fetchSource(file);
  const outDir = join(ROOT, "public", "data", id);
  await mkdir(outDir, { recursive: true });

  const books = [];
  for (const book of src.books) {
    const slug = SLUGS[book.name];
    if (!slug) throw new Error(`Unknown book name: ${book.name}`);
    const chapters = book.chapters.map((ch, ci) => {
      const verses = ch.verses.map((v, vi) => {
        if (v.verse !== vi + 1)
          throw new Error(`Non-sequential verse ${book.name} ${ci + 1}:${v.verse}`);
        return v.text.replace(/\s+/g, " ").trim();
      });
      if (ch.chapter !== ci + 1)
        throw new Error(`Non-sequential chapter ${book.name} ${ch.chapter}`);
      return verses;
    });
    await writeFile(
      join(outDir, `${slug}.json`),
      JSON.stringify({ translation: id, book: slug, chapters })
    );
    books.push(slug);

    const m = meta[slug] ?? { chapters: 0, verses: [] };
    m.chapters = Math.max(m.chapters, chapters.length);
    chapters.forEach((vs, i) => {
      m.verses[i] = Math.max(m.verses[i] ?? 0, vs.length);
    });
    meta[slug] = m;
  }
  await writeFile(join(outDir, "index.json"), JSON.stringify({ books }));
  console.log(`  wrote ${books.length} books`);
}

const genDir = join(ROOT, "src", "generated");
await mkdir(genDir, { recursive: true });
await writeFile(join(genDir, "bookMeta.json"), JSON.stringify(meta, null, 1));
console.log(`Wrote src/generated/bookMeta.json (${Object.keys(meta).length} books)`);
