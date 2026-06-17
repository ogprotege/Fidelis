/**
 * Importers for a user's own licensed translation file (e.g. a NABRE they own).
 * Pure format parsers — they contain NO scripture text; the user supplies the
 * file at runtime and the parsed text is stored only on their device (IndexedDB),
 * never bundled or committed. Three formats: scrollmapper-style JSON, USFM, OSIS.
 *
 * Each parser returns ImportedBook[] normalized to the app's shape:
 *   { name, chapters[ci][vi] = verse text }  (1-indexed refs, 0-indexed arrays)
 */
import { BOOKS } from "./canon";

export interface ImportedBook {
  /** Raw book id/name from the file; resolveBookSlug maps it to an app slug. */
  name: string;
  chapters: string[][];
}

/* ── book-id resolution ─────────────────────────────────────────────────── */

const USFM_TO_SLUG: Record<string, string> = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers", DEU: "deuteronomy",
  JOS: "joshua", JDG: "judges", RUT: "ruth", "1SA": "1-samuel", "2SA": "2-samuel",
  "1KI": "1-kings", "2KI": "2-kings", "1CH": "1-chronicles", "2CH": "2-chronicles",
  EZR: "ezra", NEH: "nehemiah", TOB: "tobit", JDT: "judith", EST: "esther", ESG: "esther",
  JOB: "job", PSA: "psalms", PRO: "proverbs", ECC: "ecclesiastes", SNG: "song-of-songs",
  WIS: "wisdom", SIR: "sirach", ISA: "isaiah", JER: "jeremiah", LAM: "lamentations",
  BAR: "baruch", EZK: "ezekiel", DAN: "daniel", HOS: "hosea", JOL: "joel", AMO: "amos",
  OBA: "obadiah", JON: "jonah", MIC: "micah", NAM: "nahum", HAB: "habakkuk", ZEP: "zephaniah",
  HAG: "haggai", ZEC: "zechariah", MAL: "malachi", "1MA": "1-maccabees", "2MA": "2-maccabees",
  MAT: "matthew", MRK: "mark", LUK: "luke", JHN: "john", ACT: "acts", ROM: "romans",
  "1CO": "1-corinthians", "2CO": "2-corinthians", GAL: "galatians", EPH: "ephesians",
  PHP: "philippians", COL: "colossians", "1TH": "1-thessalonians", "2TH": "2-thessalonians",
  "1TI": "1-timothy", "2TI": "2-timothy", TIT: "titus", PHM: "philemon", HEB: "hebrews",
  JAS: "james", "1PE": "1-peter", "2PE": "2-peter", "1JN": "1-john", "2JN": "2-john",
  "3JN": "3-john", JUD: "jude", REV: "revelation", MAN: "prayer-of-manasseh", LAO: "laodiceans"
};

const OSIS_TO_SLUG: Record<string, string> = {
  Gen: "genesis", Exod: "exodus", Lev: "leviticus", Num: "numbers", Deut: "deuteronomy",
  Josh: "joshua", Judg: "judges", Ruth: "ruth", "1Sam": "1-samuel", "2Sam": "2-samuel",
  "1Kgs": "1-kings", "2Kgs": "2-kings", "1Chr": "1-chronicles", "2Chr": "2-chronicles",
  Ezra: "ezra", Neh: "nehemiah", Tob: "tobit", Jdt: "judith", Esth: "esther", AddEsth: "esther",
  Job: "job", Ps: "psalms", Prov: "proverbs", Eccl: "ecclesiastes", Song: "song-of-songs",
  Wis: "wisdom", Sir: "sirach", Isa: "isaiah", Jer: "jeremiah", Lam: "lamentations",
  Bar: "baruch", Ezek: "ezekiel", Dan: "daniel", Hos: "hosea", Joel: "joel", Amos: "amos",
  Obad: "obadiah", Jonah: "jonah", Mic: "micah", Nah: "nahum", Hab: "habakkuk", Zeph: "zephaniah",
  Hag: "haggai", Zech: "zechariah", Mal: "malachi", "1Macc": "1-maccabees", "2Macc": "2-maccabees",
  Matt: "matthew", Mark: "mark", Luke: "luke", John: "john", Acts: "acts", Rom: "romans",
  "1Cor": "1-corinthians", "2Cor": "2-corinthians", Gal: "galatians", Eph: "ephesians",
  Phil: "philippians", Col: "colossians", "1Thess": "1-thessalonians", "2Thess": "2-thessalonians",
  "1Tim": "1-timothy", "2Tim": "2-timothy", Titus: "titus", Phlm: "philemon", Heb: "hebrews",
  Jas: "james", "1Pet": "1-peter", "2Pet": "2-peter", "1John": "1-john", "2John": "2-john",
  "3John": "3-john", Jude: "jude", Rev: "revelation", PrMan: "prayer-of-manasseh", EpLao: "laodiceans"
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const NAME_TO_SLUG = new Map<string, string>();
for (const bk of BOOKS) {
  for (const alias of [bk.name, bk.douay, bk.slug, bk.abbrev]) NAME_TO_SLUG.set(norm(alias), bk.slug);
}
for (const k in OSIS_TO_SLUG) NAME_TO_SLUG.set(norm(k), OSIS_TO_SLUG[k]);

/** Resolve a USFM code / OSIS id / book name to an app slug, or undefined. */
export function resolveBookSlug(raw: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (USFM_TO_SLUG[trimmed.toUpperCase()]) return USFM_TO_SLUG[trimmed.toUpperCase()];
  if (OSIS_TO_SLUG[trimmed]) return OSIS_TO_SLUG[trimmed];
  const n = norm(trimmed);
  return NAME_TO_SLUG.get(n);
}

/* ── format detection + dispatch ────────────────────────────────────────── */

export type ImportFormat = "json" | "usfm" | "osis";

export function detectFormat(filename: string, text: string): ImportFormat {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "usfm" || ext === "sfm") return "usfm";
  if (ext === "osis" || ext === "xml") return "osis";
  if (ext === "json") return "json";
  // sniff by content
  const head = text.slice(0, 400);
  if (/^\s*[[{]/.test(head)) return "json";
  if (/\\id\s+\w/.test(head) || /\\c\s+\d/.test(text.slice(0, 4000))) return "usfm";
  if (/<osis\b/i.test(head) || /osisID=/.test(head)) return "osis";
  return "json";
}

/** Parse any supported translation file into normalized books. */
export function parseImport(filename: string, text: string): ImportedBook[] {
  switch (detectFormat(filename, text)) {
    case "usfm": return parseUsfm(text);
    case "osis": return parseOsis(text);
    default: return parseJson(text);
  }
}

/* ── JSON (scrollmapper shape) ──────────────────────────────────────────── */

function parseJson(text: string): ImportedBook[] {
  const json = JSON.parse(text);
  const books = Array.isArray(json) ? json : json.books;
  if (!Array.isArray(books)) throw new Error("Unrecognized JSON shape");
  return books.map((b: { name: string; chapters?: { verses?: { text?: string }[] }[] }) => ({
    name: b.name,
    chapters: (b.chapters ?? []).map((ch) => (ch.verses ?? []).map((v) => (v.text ?? "").trim()))
  }));
}

/* ── USFM ───────────────────────────────────────────────────────────────── */

/** Strip footnotes / cross-refs / character markers, leaving plain verse text. */
function cleanUsfm(s: string): string {
  return s
    .replace(/\\f\b[\s\S]*?\\f\*/g, "")
    .replace(/\\x\b[\s\S]*?\\x\*/g, "")
    .replace(/\\\+?\w+\*/g, " ")
    .replace(/\\\+?\w+\s?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseUsfm(text: string): ImportedBook[] {
  const out: ImportedBook[] = [];
  let cur: ImportedBook | null = null;
  let chap = -1;
  let verseNo = -1;
  let buf = "";
  const setVerse = () => {
    if (cur && chap >= 0 && verseNo >= 1) {
      (cur.chapters[chap] ??= [])[verseNo - 1] = cleanUsfm(buf);
    }
    buf = "";
    verseNo = -1;
  };
  for (const line of text.split(/\r?\n/)) {
    const idm = line.match(/^\\id\s+(\S+)/);
    if (idm) {
      setVerse();
      if (cur) out.push(cur);
      cur = { name: idm[1], chapters: [] };
      chap = -1;
      continue;
    }
    const cm = line.match(/^\\c\s+(\d+)/);
    if (cm) {
      setVerse();
      chap = parseInt(cm[1], 10) - 1;
      continue;
    }
    if (/\\v\s+\d+/.test(line)) {
      // one or more verses on this line: "\v 1 text \v 2 text"
      const parts = line.split(/\\v\s+/).slice(1);
      setVerse();
      for (const p of parts) {
        const m = p.match(/^(\d+)\s*([\s\S]*)$/);
        if (!m) continue;
        if (verseNo >= 1 && cur && chap >= 0) (cur.chapters[chap] ??= [])[verseNo - 1] = cleanUsfm(buf);
        verseNo = parseInt(m[1], 10);
        buf = m[2];
      }
      continue;
    }
    // a continuation line (\p, \q, plain) belongs to the open verse
    if (verseNo >= 1) {
      const t = line.replace(/^\\\+?\w+\*?\s?/, "");
      if (t.trim()) buf += " " + t;
    }
  }
  setVerse();
  if (cur) out.push(cur);
  return out;
}

/* ── OSIS (regex-based so it runs in node tests and the browser alike) ────── */

function parseOsis(text: string): ImportedBook[] {
  const byBook = new Map<string, string[][]>();
  // Every verse marker, container or milestone: <verse ... osisID="Bk.C.V" ...>
  const re = /<verse\b[^>]*\bosisID="([^"]+)"[^>]*>/g;
  const markers: { id: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) markers.push({ id: m[1], start: m.index, end: re.lastIndex });
  for (let i = 0; i < markers.length; i++) {
    const sliceEnd = i + 1 < markers.length ? markers[i + 1].start : text.length;
    // text from after this verse's open tag to the next verse marker, cut at a
    // closing </verse> / chapter / div boundary, then tags stripped.
    const slice = text
      .slice(markers[i].end, sliceEnd)
      .split(/<\/verse>/)[0]
      .split(/<\/?chapter\b/)[0]
      .split(/<\/div\b/)[0];
    const plain = slice
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // osisID may be a range "Gen.1.1 Gen.1.2"; take the first ref.
    const ref = markers[i].id.split(/\s+/)[0].split(".");
    if (ref.length < 3) continue;
    const book = ref[0];
    const ch = parseInt(ref[1], 10);
    const vs = parseInt(ref[2], 10);
    if (!book || !ch || !vs) continue;
    const chapters = byBook.get(book) ?? [];
    (chapters[ch - 1] ??= [])[vs - 1] = plain;
    byBook.set(book, chapters);
  }
  return [...byBook.entries()].map(([name, chapters]) => ({ name, chapters }));
}
