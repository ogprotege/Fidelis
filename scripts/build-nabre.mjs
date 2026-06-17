#!/usr/bin/env node
/**
 * NAB/NABRE PDF → import JSON (a user's own licensed copy, for the §2.2 import).
 *
 * This script is PARSING LOGIC ONLY — it contains no scripture text. It reads a
 * PDF you supply, extracts it with `pdftotext`, and writes a scrollmapper-style
 * JSON you load via Translations → Import. The output stays on your machine and
 * is gitignored (nabre.local.json) — it is never bundled or committed, exactly
 * like the app's "import a licensed copy you own" design.
 *
 * Usage:
 *   node scripts/build-nabre.mjs "/path/to/your/NAB.pdf" [out.json]
 *   (or set NABRE_PDF=/path/to.pdf)
 *
 * Inline verse numbers in flowing prose are split with the monotonic heuristic:
 * within a chapter, a bare number that equals the *next expected* verse is a
 * marker; any other number is body text. Book/chapter detection is heading-based.
 * PDFs vary — inspect the printed per-book verse counts and tune if a book is off.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// Ordered canon with the modern (NAB) names and the app slugs. Names are matched
// case-insensitively as standalone heading lines.
const BOOKS = [
  ["genesis", ["Genesis"]], ["exodus", ["Exodus"]], ["leviticus", ["Leviticus"]],
  ["numbers", ["Numbers"]], ["deuteronomy", ["Deuteronomy"]], ["joshua", ["Joshua"]],
  ["judges", ["Judges"]], ["ruth", ["Ruth"]], ["1-samuel", ["1 Samuel", "First Samuel"]],
  ["2-samuel", ["2 Samuel", "Second Samuel"]], ["1-kings", ["1 Kings", "First Kings"]],
  ["2-kings", ["2 Kings", "Second Kings"]], ["1-chronicles", ["1 Chronicles", "First Chronicles"]],
  ["2-chronicles", ["2 Chronicles", "Second Chronicles"]], ["ezra", ["Ezra"]],
  ["nehemiah", ["Nehemiah"]], ["tobit", ["Tobit"]], ["judith", ["Judith"]],
  ["esther", ["Esther"]], ["1-maccabees", ["1 Maccabees", "First Maccabees"]],
  ["2-maccabees", ["2 Maccabees", "Second Maccabees"]], ["job", ["Job"]], ["psalms", ["Psalms", "Psalm"]],
  ["proverbs", ["Proverbs"]], ["ecclesiastes", ["Ecclesiastes"]],
  ["song-of-songs", ["Song of Songs", "Song of Solomon", "Canticle of Canticles"]],
  ["wisdom", ["Wisdom", "Wisdom of Solomon"]], ["sirach", ["Sirach", "Ecclesiasticus"]],
  ["isaiah", ["Isaiah"]], ["jeremiah", ["Jeremiah"]], ["lamentations", ["Lamentations"]],
  ["baruch", ["Baruch"]], ["ezekiel", ["Ezekiel"]], ["daniel", ["Daniel"]], ["hosea", ["Hosea"]],
  ["joel", ["Joel"]], ["amos", ["Amos"]], ["obadiah", ["Obadiah"]], ["jonah", ["Jonah"]],
  ["micah", ["Micah"]], ["nahum", ["Nahum"]], ["habakkuk", ["Habakkuk"]], ["zephaniah", ["Zephaniah"]],
  ["haggai", ["Haggai"]], ["zechariah", ["Zechariah"]], ["malachi", ["Malachi"]],
  ["matthew", ["Matthew", "The Gospel According to Matthew"]],
  ["mark", ["Mark", "The Gospel According to Mark"]],
  ["luke", ["Luke", "The Gospel According to Luke"]],
  ["john", ["John", "The Gospel According to John"]],
  ["acts", ["Acts", "Acts of the Apostles"]], ["romans", ["Romans"]],
  ["1-corinthians", ["1 Corinthians", "First Corinthians"]], ["2-corinthians", ["2 Corinthians", "Second Corinthians"]],
  ["galatians", ["Galatians"]], ["ephesians", ["Ephesians"]], ["philippians", ["Philippians"]],
  ["colossians", ["Colossians"]], ["1-thessalonians", ["1 Thessalonians", "First Thessalonians"]],
  ["2-thessalonians", ["2 Thessalonians", "Second Thessalonians"]], ["1-timothy", ["1 Timothy", "First Timothy"]],
  ["2-timothy", ["2 Timothy", "Second Timothy"]], ["titus", ["Titus"]], ["philemon", ["Philemon"]],
  ["hebrews", ["Hebrews"]], ["james", ["James"]], ["1-peter", ["1 Peter", "First Peter"]],
  ["2-peter", ["2 Peter", "Second Peter"]], ["1-john", ["1 John", "First John"]],
  ["2-john", ["2 John", "Second John"]], ["3-john", ["3 John", "Third John"]], ["jude", ["Jude"]],
  ["revelation", ["Revelation", "Revelation to John", "Apocalypse"]]
];

const HEADING = new Map();
for (const [slug, names] of BOOKS) for (const n of names) HEADING.set(n.toLowerCase(), slug);

const pdf = process.argv[2] || process.env.NABRE_PDF;
const out = process.argv[3] || "nabre.local.json";
if (!pdf) {
  console.error('Usage: node scripts/build-nabre.mjs "/path/to/NAB.pdf" [out.json]   (or set NABRE_PDF=)');
  process.exit(1);
}

console.error(`Extracting ${pdf} with pdftotext…`);
let raw;
try {
  raw = execFileSync("pdftotext", ["-q", "-nopgbrk", pdf, "-"], { maxBuffer: 1 << 30 }).toString("utf8");
} catch (e) {
  console.error("pdftotext failed (is it installed? `brew install poppler`):", e.message);
  process.exit(1);
}

// Normalize whitespace into a token stream, dropping page artifacts.
const lines = raw.split(/\r?\n/);
const books = [];
let cur = null; // { slug, chapters: [ [verse,...] ] }
let chap = -1;
let expVerse = 1; // next expected verse number in this chapter
let buf = [];

const pushVerse = () => {
  if (cur && chap >= 0 && expVerse > 1) {
    const arr = (cur.chapters[chap] ??= []);
    arr[expVerse - 2] = buf.join(" ").replace(/\s+/g, " ").trim();
  }
  buf = [];
};

const startBook = (slug) => {
  pushVerse();
  if (cur) books.push(cur);
  cur = { slug, chapters: [] };
  chap = -1;
  expVerse = 1;
};

for (const line of lines) {
  const t = line.trim();
  if (!t) continue;
  // A standalone book heading?
  const headSlug = HEADING.get(t.toLowerCase());
  if (headSlug) { startBook(headSlug); continue; }
  if (!cur) continue; // skip front matter before the first book
  // A "Chapter N" heading?
  const chm = t.match(/^(?:chapter|psalm)\s+(\d+)$/i);
  if (chm) { pushVerse(); chap = parseInt(chm[1], 10) - 1; expVerse = 1; continue; }
  if (chap < 0) {
    // No explicit chapter heading yet: a lone "1" opens chapter 1.
    if (/^1$/.test(t)) { chap = 0; expVerse = 1; continue; }
  }
  // Tokenize the line and split on the next-expected verse number (monotonic).
  for (const tok of t.split(/\s+/)) {
    if (/^\d{1,3}$/.test(tok) && parseInt(tok, 10) === expVerse && chap >= 0) {
      pushVerse();
      expVerse++;
    } else {
      buf.push(tok);
    }
  }
}
pushVerse();
if (cur) books.push(cur);

// Emit scrollmapper-style JSON (the importer's normalizer reads name+chapters).
const outBooks = books
  .filter((b) => b.chapters.length)
  .map((b) => ({
    name: b.slug,
    chapters: b.chapters.map((vs, ci) => ({
      chapter: ci + 1,
      verses: (vs ?? []).map((text, vi) => ({ verse: vi + 1, text: text ?? "" }))
    }))
  }));

writeFileSync(out, JSON.stringify({ books: outBooks }, null, 0));

// Structural report only (counts — never the text).
console.error(`\nParsed ${outBooks.length}/73 books → ${out}`);
for (const b of outBooks.slice(0, 5)) {
  const verses = b.chapters.reduce((n, c) => n + c.verses.filter((v) => v.text).length, 0);
  console.error(`  ${b.name}: ${b.chapters.length} chapters, ${verses} non-empty verses`);
}
console.error("\nReview the counts against a printed edition, then on the Translations page");
console.error("choose NABRE → Import and select this file. It stays on your device only.");
