import { BOOKS, Book } from "./canon";

/** Normalize a book name for lookup: lowercase, strip accents/punctuation, roman→arabic. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/^iii\b/, "3")
    .replace(/^ii\b/, "2")
    .replace(/^i\b/, "1")
    .replace(/^first\b/, "1")
    .replace(/^second\b/, "2")
    .replace(/^third\b/, "3")
    .replace(/^fourth\b/, "4")
    .replace(/[^a-z0-9]/g, "");
}

const NAME_INDEX = new Map<string, Book>();
for (const book of BOOKS) {
  const aliases = [book.name, book.douay, book.latin, book.abbrev, book.slug.replace(/-/g, " ")];
  // Latin titles like "Liber Genesis" / "Epistola ad Romanos" → also index trailing words
  const latinShort = book.latin.replace(/^(Liber|Epistola( Catholica)?|Evangelium secundum|Oratio|Actus|Lamentationes|Psalmus)\s+/i, "");
  aliases.push(latinShort, latinShort.replace(/^(I|II|III|IV)\s+ad\s+/i, "$1 "), latinShort.replace(/^ad\s+/i, ""));
  for (const a of aliases) {
    const k = norm(a);
    if (k && !NAME_INDEX.has(k)) NAME_INDEX.set(k, book);
  }
}
// A few common extras
const EXTRA: Record<string, string> = {
  jn: "john", mt: "matthew", mk: "mark", lk: "luke", ps: "psalms", psalm: "psalms",
  apoc: "revelation", rev: "revelation", canticles: "song-of-songs", songofsolomon: "song-of-songs",
  qoheleth: "ecclesiastes", apocalypse: "revelation", acts: "acts", sir: "sirach", wis: "wisdom",
  dt: "deuteronomy", gn: "genesis", ex: "exodus", lv: "leviticus", nm: "numbers"
};
for (const [k, slug] of Object.entries(EXTRA)) {
  const book = BOOKS.find((b) => b.slug === slug)!;
  if (!NAME_INDEX.has(k)) NAME_INDEX.set(k, book);
}

export interface ParsedRef {
  book: Book;
  chapter?: number;
  verse?: number;
}

/** Parse "John 3:16", "1 Cor 13", "Apocalypsis 21,4", "ps 22" … */
export function parseReference(input: string): ParsedRef | null {
  const m = input.trim().match(/^(.+?)\s*(?:(\d+)\s*(?:[:,.]\s*(\d+))?)?$/);
  if (!m) return null;
  const [, namePart, ch, vs] = m;
  const book = NAME_INDEX.get(norm(namePart));
  if (!book) return null;
  const chapter = ch ? Math.min(parseInt(ch, 10), book.chapters) : undefined;
  const verse = vs ? parseInt(vs, 10) : undefined;
  if (chapter !== undefined && chapter < 1) return null;
  return { book, chapter, verse };
}
