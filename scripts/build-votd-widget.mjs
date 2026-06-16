#!/usr/bin/env node
/**
 * Generates the Verse of the Day cycle with pre-resolved Douay-Rheims text for
 * the native widgets — ios/WidgetExtension/votd.json (WidgetKit) and
 * android/app/src/main/res/raw/votd.json (App Widget). The entry order and
 * selection algorithm must match src/lib/votd.ts.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Book display names (Douay style, matching what the app shows for DRC).
const NAMES = JSON.parse(
  await readFile(join(ROOT, "src", "generated", "bookMeta.json"), "utf8")
);
const DOUAY = {
  "1-samuel": "1 Kings", "2-samuel": "2 Kings", "1-kings": "3 Kings", "2-kings": "4 Kings",
  "1-chronicles": "1 Paralipomenon", "2-chronicles": "2 Paralipomenon",
  "song-of-songs": "Canticle of Canticles", "sirach": "Ecclesiasticus",
  "isaiah": "Isaias", "jeremiah": "Jeremias", "ezekiel": "Ezechiel", "hosea": "Osee",
  "obadiah": "Abdias", "jonah": "Jonas", "micah": "Micheas", "habakkuk": "Habacuc",
  "zephaniah": "Sophonias", "haggai": "Aggeus", "zechariah": "Zacharias",
  "malachi": "Malachias", "1-maccabees": "1 Machabees", "2-maccabees": "2 Machabees",
  "revelation": "Apocalypse", "joshua": "Josue", "tobit": "Tobias", "ezra": "1 Esdras",
  "nehemiah": "2 Esdras", "acts": "Acts of the Apostles"
};
function bookName(slug) {
  if (DOUAY[slug]) return DOUAY[slug];
  return slug
    .split("-")
    .map((w) => (/^\d+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

const votdTs = await readFile(join(ROOT, "src", "lib", "votd.ts"), "utf8");
const refs = [...votdTs.matchAll(/r\("([a-z0-9-]+)", (\d+), (\d+)(?:, (\d+))?\)/g)].map(
  (m) => ({
    book: m[1],
    chapter: parseInt(m[2], 10),
    verse: parseInt(m[3], 10),
    endVerse: m[4] ? parseInt(m[4], 10) : undefined
  })
);
if (!refs.length) throw new Error("no VotD refs found in votd.ts");

const out = [];
const cache = new Map();
for (const ref of refs) {
  let data = cache.get(ref.book);
  if (!data) {
    data = JSON.parse(
      await readFile(join(ROOT, "public", "data", "drc", `${ref.book}.json`), "utf8")
    );
    cache.set(ref.book, data);
  }
  const ch = data.chapters[ref.chapter - 1];
  const last = Math.min(ref.endVerse ?? ref.verse, ch.length);
  const text = ch.slice(ref.verse - 1, last).join(" ");
  const range = ref.endVerse ? `${ref.verse}–${ref.endVerse}` : `${ref.verse}`;
  out.push({
    reference: `${bookName(ref.book)} ${ref.chapter}:${range}`,
    text
  });
}

void NAMES;
const json = JSON.stringify(out, null, 1);
const dests = [
  join(ROOT, "ios", "WidgetExtension", "votd.json"),
  join(ROOT, "android", "app", "src", "main", "res", "raw", "votd.json")
];
for (const dest of dests) {
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, json);
  console.log(`wrote ${dest} (${out.length} entries)`);
}
