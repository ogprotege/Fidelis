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

/* ── CCC text intake (the modern Catechism, a copy the owner imports) ──────── */

/** The normalized shape of a parsed `fidelis-ccc-1` import. Contains the owner's
 *  own licensed text only — never bundled, stored only on their device. */
export interface CccTextDoc {
  edition: string;
  language: string;
  paragraphs: Record<string, string>;
}

/** Intake hygiene only (NOT content derivation): strip the footnote apparatus a
 *  hand- or converter-prepared file may carry — Unicode superscript digit runs
 *  (⁰¹²³⁴-⁹) and bracketed footnote refs like [45] — then collapse whitespace.
 *  The prose itself is untouched. */
function cleanCccText(s: string): string {
  return s
    .replace(/[⁰¹²³⁴-⁹]+/g, "")
    .replace(/\s*\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* The St. Charles Borromeo (scborromeo.org) Catechism export — a freely available
 * dump of the modern CCC. The full text lives in `page_nodes`, keyed by TOC section;
 * within each section every Catechism paragraph is opened by a `{ type:"ref-ccc",
 * ref_number }` marker, followed by the `text` (and inline `ref-anchor` scripture
 * citations) that make up its body. We carry only the minimal shape we read. */
interface ScbElement {
  type?: string;
  text?: string;
  ref_number?: number;
  attrs?: { heavy_header?: boolean; [k: string]: unknown };
}
interface ScbParagraph {
  elements?: ScbElement[];
  attrs?: { indent?: boolean; [k: string]: unknown };
}
interface ScbPageNode {
  paragraphs?: ScbParagraph[];
}

/** A heading string folded for table-of-contents matching. */
function normHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Is a ref-ccc-less paragraph an unambiguous section HEADING (to drop)? The export
 * splits a single numbered ¶ across several layout paragraphs and inserts section
 * titles between numbered ¶ — and the title carries no reliable flag of its own.
 * We therefore drop ONLY titles we can recognize without risk: an all-caps line, a
 * roman-numeral / Part / Section / Chapter / Article header, or an exact
 * table-of-contents title. Mixed-case sub-headings ("The covenant with Noah") are
 * deliberately NOT guessed at — a wrong guess deletes real prose (a split sentence,
 * a short maxim, a scripture quotation), which is far worse than a cosmetic title
 * left in place. Callers also require the next paragraph to open a new ¶, so a
 * mid-sentence fragment can never be mistaken for a heading.
 */
function isStructuralHeading(text: string, tocTitles: Set<string>): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[A-Z]/.test(t) && !/[a-z]/.test(t) && t.replace(/[^A-Za-z]/g, "").length >= 2) return true; // ALL CAPS
  if (/^[IVXLCDM]+\.\s/.test(t)) return true; // "III. …"
  if (/^(Part|Section|Chapter|Article|Paragraph)\b/.test(t)) return true;
  return tocTitles.has(normHeading(t));
}

/**
 * Convert a Borromeo `page_nodes` map into a flat `{ "¶": "text" }` map — the same
 * shape the bare-flat-map intake already normalizes. PARSING ONLY: every word comes
 * from the supplied file. A `ref-ccc` opens a paragraph; subsequent `text` /
 * `ref-anchor` body appends to it; footnote `ref` markers are dropped (their
 * apparatus is stripped downstream anyway). Paragraphs with no `ref-ccc` are the
 * tricky case: a `heavy_header` title, or a structural heading that titles the next
 * numbered ¶, closes the open ¶ and is dropped; everything else (block quotes,
 * prose split across layout paragraphs) is a continuation and is appended with a
 * separating space so sentences don't run together.
 */
function extractScborromeoParagraphs(
  pageNodes: Record<string, unknown>,
  tocNodes: unknown
): Record<string, string> {
  const tocTitles = new Set<string>();
  if (tocNodes && typeof tocNodes === "object") {
    for (const node of Object.values(tocNodes as Record<string, unknown>)) {
      const txt = (node as { text?: unknown } | null)?.text;
      if (typeof txt === "string" && txt.trim()) tocTitles.add(normHeading(txt));
    }
  }
  const out: Record<string, string> = {};
  // page_nodes are keyed "toc-N" in arbitrary order; walk them by N so a paragraph's
  // body can never be reordered. (Order WITHIN a node is the array order, authoritative.)
  const ids = Object.keys(pageNodes).sort(
    (a, b) => Number(/(\d+)$/.exec(a)?.[1] ?? 0) - Number(/(\d+)$/.exec(b)?.[1] ?? 0)
  );
  const textOf = (els: ScbElement[]) =>
    els.filter((e) => e && e.type === "text" && typeof e.text === "string").map((e) => e.text).join("");
  const opensParagraph = (els: ScbElement[] | undefined) =>
    Array.isArray(els) && els.some((e) => e && e.type === "ref-ccc");
  for (const id of ids) {
    const node = pageNodes[id] as ScbPageNode | null;
    if (!node || typeof node !== "object") continue;
    const paras = Array.isArray(node.paragraphs) ? node.paragraphs : [];
    let cur = ""; // the open ¶ key; ref-ccc never spans a node, so reset per node
    for (let i = 0; i < paras.length; i++) {
      const para = paras[i];
      const els = Array.isArray(para?.elements) ? para.elements : [];
      if (opensParagraph(els)) {
        // Opens (one or more) numbered ¶. Skip any heading text BEFORE the first
        // ref-ccc; append only the body that follows it.
        let started = false;
        for (const el of els) {
          if (!el || typeof el !== "object") continue;
          if (el.type === "ref-ccc") {
            cur = typeof el.ref_number === "number" ? String(el.ref_number) : "";
            if (cur && out[cur] === undefined) out[cur] = "";
            started = true;
          } else if (started && cur && el.type === "text" && typeof el.text === "string") {
            out[cur] += el.text;
          }
        }
        continue;
      }
      // A ref-ccc-less paragraph: heading (drop) or continuation (append).
      if (els.some((e) => e && e.type === "text" && e.attrs?.heavy_header === true)) {
        cur = ""; // a flagged heading closes the open ¶
        continue;
      }
      const indent = (para as ScbParagraph)?.attrs?.indent === true; // block quote — always content
      const text = textOf(els);
      if (
        !indent &&
        opensParagraph(paras[i + 1]?.elements) &&
        isStructuralHeading(text, tocTitles)
      ) {
        cur = ""; // a section title before the next numbered ¶ — drop it
        continue;
      }
      if (cur && text) {
        if (out[cur] && !/\s$/.test(out[cur])) out[cur] += " ";
        out[cur] += text;
      }
    }
  }
  return out;
}

/**
 * Parse a Catechism import (the modern CCC, the owner's own copy). Tolerant of
 * four shapes — the `fidelis-ccc-1` header `{ format, edition, language, paragraphs }`,
 * a `{ ccc: { … } }` wrapper, a bare flat map `{ "1": "…" }`, and the St. Charles
 * Borromeo `page_nodes` export (converted in-app, since the owner imports on iOS) —
 * all normalized to `{ edition, language, paragraphs }`. Keys must be integers in
 * [1, 2865] (url.json's key space), so a mis-dropped Bible file throws a friendly
 * error. Contains NO Catechism text: the output derives only from the supplied file.
 */
export function parseCccText(_filename: string, text: string): CccTextDoc {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Not a JSON file — expected a fidelis-ccc-1 Catechism file.");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Unrecognized Catechism file — expected a fidelis-ccc-1 paragraph map.");
  }
  const obj = json as Record<string, unknown>;

  let raw: Record<string, unknown> | undefined;
  let edition = "Catechism of the Catholic Church";
  let language = "en";

  if (obj.format === "fidelis-ccc-1" && obj.paragraphs && typeof obj.paragraphs === "object") {
    raw = obj.paragraphs as Record<string, unknown>;
    if (typeof obj.edition === "string") edition = obj.edition;
    if (typeof obj.language === "string") language = obj.language;
  } else if (obj.ccc && typeof obj.ccc === "object" && !Array.isArray(obj.ccc)) {
    const c = obj.ccc as Record<string, unknown>;
    raw = (c.paragraphs && typeof c.paragraphs === "object" ? c.paragraphs : c) as Record<string, unknown>;
    if (typeof c.edition === "string") edition = c.edition;
    if (typeof c.language === "string") language = c.language;
  } else if (obj.page_nodes && typeof obj.page_nodes === "object" && !Array.isArray(obj.page_nodes)) {
    // St. Charles Borromeo (scborromeo.org) export — convert page_nodes → flat ¶ map.
    raw = extractScborromeoParagraphs(obj.page_nodes as Record<string, unknown>, obj.toc_nodes);
  } else {
    raw = obj; // bare flat map
  }

  const paragraphs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "format" || k === "edition" || k === "language" || k === "paragraphs") continue;
    if (!/^\d+$/.test(k)) {
      throw new Error(`Not a Catechism file: "${k}" is not a paragraph number.`);
    }
    const n = Number(k);
    if (n < 1 || n > 2865) {
      throw new Error(`Paragraph ${n} is outside the Catechism range 1–2865.`);
    }
    if (typeof v !== "string") {
      throw new Error(`Paragraph ${k} is not text.`);
    }
    const cleaned = cleanCccText(v);
    if (cleaned) paragraphs[String(n)] = cleaned;
  }
  if (Object.keys(paragraphs).length === 0) {
    throw new Error("No Catechism paragraphs found — is this a fidelis-ccc-1 file?");
  }
  return { edition, language, paragraphs };
}
