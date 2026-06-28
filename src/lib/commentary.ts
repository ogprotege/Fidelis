/** The commentary layer's pure logic (spec §4.2). No React, no fetch — the Reader
 *  and the CommentarySheet read it, the harness (test-data.ts §16) asserts it.
 *
 *  The Catena Aurea's `father` field is the hard part: clean names ("Chrysostom")
 *  sit beside citation forms ("Chrys., Hom. in Matt., 56"), pseudonymous authors
 *  ("Pseudo-Chrysostom"), transcription typos ("Theophyact", "Origin", "Psuedo-"),
 *  the Glossa Ordinaria ("Gloss. interlin."), genuine minor sources ("A Greek
 *  expositor", councils, Josephus), and — most numerous — the source's connective
 *  tissue ("It goes on", "There follows", whole lemma sentences) that introduces
 *  the next passage inside one Father's exposition. normalizeFather() canonicalises
 *  every one of the 1,198 distinct labels so the per-Father chips and the
 *  Doctors-only filter stay clean and honest; groupCatena() folds the connectives
 *  back into the Father they belong to.
 *
 *  Identity notes (worship-facing accuracy):
 *   - bare "Gregory" is Gregory the Great (a Doctor); "Gregory Nyss." is not.
 *   - "Isidore" in the Gospel Catena is Isidore of Pelusium (NOT a Doctor); only an
 *     explicit "Isid. Hisp." / "Isidore of Seville" is the Doctor.
 *   - "Cyril" is read as Cyril of Alexandria (a Doctor; the other Cyril is too).
 *   - every "Dionys…" is the Pseudo-Dionysian corpus EXCEPT "Dion. alex"
 *     (Dionysius of Alexandria, a distinct Father, not a Doctor).
 *   - Pseudo-* authors and the Glossa are never Doctors. */

/** The four Gospels — the whole of the Catena's coverage. */
export const GOSPELS: ReadonlySet<string> = new Set(["matthew", "mark", "luke", "john"]);

export interface Father {
  id: string;
  name: string;
  isDoctor: boolean;
  /** Death year (or estimate; see `circa`) for the chronological chain (§4.3). */
  year: number;
  /** True when `year` is an estimate (anonymous floruit, "martyred c.", a soft
   *  range, or a pseudonymous composition era): the UI renders "c. 407". */
  circa?: boolean;
}

/** A normalised attribution label. Flat-optional (not a discriminated union) so
 *  both the harness and the UI can read any field without narrowing. */
export interface NormalizedLabel {
  kind: "father" | "gloss" | "source" | "continuation";
  id?: string;
  name?: string;
  isDoctor?: boolean;
}

/** One rendered block of Catena commentary: a Father (or the Gloss, or an
 *  anonymous source) and the text of their comment, with any connectives merged. */
export interface CatenaBlock {
  kind: "father" | "gloss" | "source";
  father: Father | null;
  name: string;
  isDoctor: boolean;
  text: string;
}

// ── The canonical Fathers ────────────────────────────────────────────────────
// Ordered: ambiguous prefixes resolve top-down (gregory naz/nyss before bare
// gregory; chrysologus before chrysostom; isidore-of-seville before bare isidore;
// dionysius-of-alexandria before the Areopagite), so a startsWith match never
// shadows a more specific name. Aliases are matched against a period-folded,
// lower-cased head; transcription typos are listed explicitly.
interface FatherDef {
  id: string;
  name: string;
  aliases: string[];
  /** Sort key for the chronological chain (§4.3 Phase 1): death year by default;
   *  floruit midpoint or composition era where `circa`. Relative order — not the
   *  exact integer — is what matters. From the verified research table (§3.2). */
  year: number;
  circa?: boolean;
}

const FATHERS: FatherDef[] = [
  { id: "gregory-nazianzen", name: "Gregory Nazianzen", aliases: ["gregory nazianzen", "gregory naz", "greg naz"], year: 390, circa: true },
  { id: "gregory-of-nyssa", name: "Gregory of Nyssa", aliases: ["gregory of nyssa", "gregory nyss", "greg nyss"], year: 394 },
  { id: "gregory-the-great", name: "Gregory the Great", aliases: ["gregory", "greg"], year: 604 },
  { id: "peter-chrysologus", name: "Peter Chrysologus", aliases: ["chrysologus", "chrysolog", "chrysol"], year: 450, circa: true },
  { id: "chrysostom", name: "Chrysostom", aliases: ["chrysostom", "chrysost", "chrys", "chyrs"], year: 407 },
  { id: "augustine", name: "Augustine", aliases: ["augustine", "august", "aug"], year: 430 },
  // Ambrosiaster — the conventional name for an anonymous 4th-c. commentator on
  // the Pauline epistles, NOT St. Ambrose and not a Doctor. Listed before Ambrose
  // so the "ambros" startsWith never absorbs it. (Labels whose head is "Ambrose"
  // with "Ambrosiaster" in the citation apparatus still resolve to Ambrose.)
  { id: "ambrosiaster", name: "Ambrosiaster", aliases: ["ambrosiaster"], year: 375, circa: true },
  { id: "ambrose", name: "Ambrose", aliases: ["ambrose", "ambros"], year: 397 },
  { id: "jerome", name: "Jerome", aliases: ["jerome", "hieronymus", "hieron"], year: 420 },
  { id: "john-damascene", name: "John Damascene", aliases: ["john damascene", "john of damascus", "damascene", "damascen", "damasc", "damas"], year: 749, circa: true },
  { id: "athanasius", name: "Athanasius", aliases: ["athanasius", "athanas"], year: 373 },
  { id: "basil", name: "Basil", aliases: ["basil"], year: 379 },
  { id: "hilary", name: "Hilary", aliases: ["hilary", "hilar", "hil"], year: 367 },
  // Cyril of Alexandria in the Gospel Catena (a Doctor; Cyril of Jerusalem is too).
  { id: "cyril", name: "Cyril", aliases: ["cyril"], year: 444 },
  { id: "isidore-of-seville", name: "Isidore of Seville", aliases: ["isidore of seville", "isidorus hispalensis", "isid hisp", "isidore hisp", "isidorus hisp"], year: 636 },
  // Bare "Isidore" in the Gospel Catena is Isidore of Pelusium — NOT a Doctor.
  { id: "isidore-pelusium", name: "Isidore of Pelusium", aliases: ["isidore of pelusium", "isidore pelus", "isidore", "isidor", "isid"], year: 450, circa: true },
  { id: "leo", name: "Leo the Great", aliases: ["leo"], year: 461 },
  { id: "bede", name: "Bede", aliases: ["bede", "beda"], year: 735 },
  { id: "theophylact", name: "Theophylact", aliases: ["theophylact", "theophyl", "theophyact", "theopehyl", "theoph"], year: 1107 },
  { id: "origen", name: "Origen", aliases: ["origen", "origin"], year: 254, circa: true },
  { id: "remigius", name: "Remigius", aliases: ["remigius", "remig"], year: 908, circa: true },
  { id: "rabanus", name: "Rabanus Maurus", aliases: ["rabanus", "raban"], year: 856 },
  { id: "alcuin", name: "Alcuin", aliases: ["alcuin"], year: 804 },
  { id: "eusebius", name: "Eusebius", aliases: ["eusebius", "euseb"], year: 339, circa: true },
  // BIG FLAG (§17): assumed Maximus of Turin (~465). If this is Maximus the
  // Confessor it is 662 — a ~200-year move on ~65 blocks. Default Turin; to flip,
  // change this single line to `year: 662`. See the open question.
  { id: "maximus", name: "Maximus", aliases: ["maximus", "maxim", "max"], year: 465, circa: true },
  { id: "haymo", name: "Haymo", aliases: ["haymo", "haimo"], year: 853 },
  { id: "titus-of-bostra", name: "Titus of Bostra", aliases: ["titus of bostra", "titus", "tit bost", "tit bos", "tit"], year: 378 },
  { id: "didymus", name: "Didymus", aliases: ["didymus"], year: 398 },
  { id: "severianus", name: "Severianus", aliases: ["severianus", "severian"], year: 425 },
  { id: "epiphanius", name: "Epiphanius", aliases: ["epiphanius", "epiphan"], year: 403 },
  { id: "cyprian", name: "Cyprian", aliases: ["cyprian"], year: 258 },
  { id: "theodotus", name: "Theodotus", aliases: ["theodotus", "theodot", "theod"], year: 446, circa: true },
  { id: "clement-of-alexandria", name: "Clement of Alexandria", aliases: ["clement of alexandria", "clement", "clem alex", "clem"], year: 215, circa: true },
  // Dionysius of Alexandria — a real Father, distinct from the Areopagite below.
  { id: "dionysius-of-alexandria", name: "Dionysius of Alexandria", aliases: ["dionysius of alexandria", "dionysius alex", "dion alex", "dionysius al", "dion al"], year: 265, circa: true },
  { id: "cassian", name: "John Cassian", aliases: ["cassian"], year: 435, circa: true },
  { id: "nemesius", name: "Nemesius", aliases: ["nemesius"], year: 390, circa: true },
  { id: "gennadius", name: "Gennadius", aliases: ["gennadius"], year: 471 },
  { id: "paschasius", name: "Paschasius", aliases: ["paschasius"], year: 865, circa: true },
  { id: "lanfranc", name: "Lanfranc", aliases: ["lanfranc"], year: 1089 },
  { id: "petrus-alfonsus", name: "Petrus Alfonsus", aliases: ["petrus alfonsus", "petrus alphonsus", "petrus alf"], year: 1116 },
  { id: "methodius", name: "Methodius", aliases: ["methodius"], year: 311, circa: true },
  { id: "photius", name: "Photius", aliases: ["photius"], year: 893, circa: true },
  { id: "anselm", name: "Anselm", aliases: ["anselm"], year: 1117 },
  // Every other "Dionys…" is the Pseudo-Dionysian corpus (Celestial Hierarchy,
  // Divine Names), composition era c. 485–500. Last, so "dion alex" above wins for
  // Dionysius of Alexandria.
  { id: "pseudo-dionysius", name: "Pseudo-Dionysius", aliases: ["dionysius", "dionys"], year: 500, circa: true }
];

/** The Doctors of the Church present in (or editing) the Catena. Newman edited
 *  this very edition and is a Doctor, though he never appears as a per-verse
 *  label. Bare Isidore (Pelusium) and Gregory of Nyssa are NOT Doctors; the
 *  Pseudo-* authors and the Glossa never are. */
const DOCTOR_IDS: ReadonlySet<string> = new Set([
  "chrysostom", "augustine", "jerome", "ambrose", "gregory-the-great",
  "gregory-nazianzen", "basil", "athanasius", "hilary", "cyril", "bede",
  "isidore-of-seville", "peter-chrysologus", "john-damascene", "leo", "newman"
]);

export function isDoctor(id: string): boolean {
  return DOCTOR_IDS.has(id);
}

// ── Chronological ordering (§4.3 Phase 1) ────────────────────────────────────
// The Catena ships in Aquinas's source order; the reader wants earliest-Father-
// first. yearOf / circaOf / sortChronological are pure and tested (test-data.ts
// §16b). public/data is untouched — this is a render-time sort.

const FATHER_YEAR = new Map(FATHERS.map((f) => [f.id, f.year]));
const FATHER_CIRCA = new Map(FATHERS.map((f) => [f.id, f.circa === true]));

/** Every declared Father id — the §16b "no Father lacks a year" guard reads this. */
export const FATHER_IDS: readonly string[] = FATHERS.map((f) => f.id);

/** Runtime pseudo-* ids that normalizeFather mints but that are NOT literals in
 *  FATHERS[]. Dated by COMPOSITION era, never the namesake's death year (G2).
 *  Keyed by the EXACT id normalizeFather emits — note `pseudo-athan` (from the
 *  abbreviated "Pseudo-Athan." label, since "athan" misses the athanasius alias),
 *  not `pseudo-athanasius`. pseudo-dionysius is a FATHERS[] literal (500), dated
 *  there, not here. */
const PSEUDO_YEARS: Record<string, number> = {
  "pseudo-chrysostom": 430, // Opus Imperfectum in Matthaeum, anon. 5th-c. (~2,886 blocks)
  "pseudo-jerome": 675,     // Hiberno-Latin Expositio sec. Marcum, c. 650–700 (~1,519)
  "pseudo-augustine": 530,  // mixed pseudo-Augustinian sermons (~194)
  "pseudo-origen": 400,     // pseudo-Origen homilies (~81)
  "pseudo-basil": 450,      // pseudo-Basil (~19)
  "pseudo-athan": 450       // "Pseudo-Athan." — Vigilius of Thapsus material (~2)
};

/** Newman's death year — the editor of this Catena edition; never a per-verse
 *  label, so it never actually sorts, but dated for completeness (§3.2). */
const NEWMAN_YEAR = 1890;

/** The Father's sort year. `null` → the undated bucket (G4), never `0`. Order:
 *  (1) the editor Newman; (2) a literal FATHERS[] entry → its year; (3) a
 *  PSEUDO_YEARS key → that era; (4) a generated `pseudo-<base>` whose <base> is a
 *  known Father → base death year + 1 (sits just after its genuine namesake);
 *  else `null`. */
export function yearOf(id: string): number | null {
  if (id === "newman") return NEWMAN_YEAR;
  const y = FATHER_YEAR.get(id);
  if (y !== undefined) return y;
  if (id in PSEUDO_YEARS) return PSEUDO_YEARS[id];
  if (id.startsWith("pseudo-")) {
    const baseYear = FATHER_YEAR.get(id.slice("pseudo-".length));
    if (baseYear !== undefined) return baseYear + 1;
  }
  return null;
}

/** Whether yearOf(id) is an estimate (renders "c. NNN" not "NNN"). Every
 *  pseudonymous date is an estimate. */
export function circaOf(id: string): boolean {
  const c = FATHER_CIRCA.get(id);
  if (c !== undefined) return c;
  if (id in PSEUDO_YEARS || id.startsWith("pseudo-")) return true;
  return false;
}

/** Year an undated Father sorts to: after every dated one (G4). 9999 > any real
 *  death year (the latest is Newman, 1890). */
const UNDATED_YEAR = 9999;

/** Order a verse's GROUPED blocks earliest-Father-first (§4.3 Phase 1). MUST run
 *  after groupCatena — sorting raw notes would tear a continuation from its
 *  Father. Father blocks sort by yearOf (undated → last); the stable tie-break is
 *  ascending alphabetical by id (G3), so a Father quoted twice keeps the two
 *  comments adjacent in their original order. Gloss/source blocks leave the chain
 *  and trail in source order (G5). */
export function sortChronological(blocks: CatenaBlock[]): CatenaBlock[] {
  const fathers = blocks.filter((b) => b.kind === "father");
  const others = blocks.filter((b) => b.kind !== "father");
  const sorted = [...fathers].sort((a, b) => {
    const ya = a.father ? yearOf(a.father.id) ?? UNDATED_YEAR : UNDATED_YEAR;
    const yb = b.father ? yearOf(b.father.id) ?? UNDATED_YEAR : UNDATED_YEAR;
    if (ya !== yb) return ya - yb;
    return (a.father?.id ?? "").localeCompare(b.father?.id ?? "");
  });
  return [...sorted, ...others];
}

// A connective the Catena uses to introduce the next passage within a Father's
// exposition: short cues ("It goes on", "Idem", "He adds"), exegetical adverbs
// ("Mystically", "Accordingly"), and — once a real name fails to match — any
// running-prose lemma fragment. These continue the previous block, never a chip.
const CONTINUATION_CUE =
  /^(idem|it goes on|it follows|it is added|it is said|it then|it proceeds|there follows|there go|then$|then |then goes|wherefore|whence|for (there|it|so|which|in|this|the same|to)|he (adds|goes on|continues|says|saith|asks|answers|proceeds|subjoins|concludes|observes|interposes|shows|argues|replies|rejoins|inquires|objects|intimates)|what (follows|say you|then)|as (it follows|it is said|follows)|hence|moreover|again|but |and |so |to which|of which|nor |after|lastly|or |or,|or else|whereupon|on which|in like manner|where |thus|behold|now |yet |this |these |mystically|allegorically|morally|figuratively|literally|spiritually|accordingly|otherwise|similarly|read |when )/;

/** Normalise a raw Catena `father` label into a Father, the Glossa, an anonymous
 *  source, or a continuation of the previous block. */
export function normalizeFather(raw: string): NormalizedLabel {
  if (!raw || !raw.trim()) return { kind: "continuation" };

  // Heal the recurring "Psuedo"/"Pseduo" transcription typos before anything else.
  const fixed = raw.replace(/^ps[ue]{2}do/i, "Pseudo");
  // The name lives before the first comma; the rest is citation apparatus.
  // Fold internal periods to spaces so "Greg. Naz." matches "gregory naz".
  const head = fixed.split(",")[0];
  const norm = head.toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();

  if (norm.startsWith("gloss")) return { kind: "gloss", name: "Glossa Ordinaria" };

  if (norm.startsWith("pseudo")) {
    const base = matchFather(norm.replace(/^pseudo[-\s]+/, ""));
    if (base && base.id.startsWith("pseudo-")) {
      return { kind: "father", id: base.id, name: base.name, isDoctor: false };
    }
    if (base) {
      return { kind: "father", id: `pseudo-${base.id}`, name: `Pseudo-${base.name}`, isDoctor: false };
    }
    const slug = norm.replace(/^pseudo[-\s]+/, "").replace(/\s+/g, "-") || "anon";
    return { kind: "father", id: `pseudo-${slug}`, name: titleCase(head.replace(/^Pseudo[-\s]+/i, "Pseudo-")), isDoctor: false };
  }

  const f = matchFather(norm);
  if (f) return { kind: "father", id: f.id, name: f.name, isDoctor: isDoctor(f.id) };

  // Unmatched: a council, an anonymous expositor, another named source, or — most
  // often — running prose the parser misread as an attribution (a continuation).
  const low = fixed.trim().toLowerCase();
  if (/\b(council|concil|gestis concil|conc\. eph|synod)\b/i.test(fixed)) {
    return { kind: "source", name: cleanSource(head) };
  }
  if (/^A [A-Z]/.test(head)) return { kind: "source", name: cleanSource(head) };
  if (CONTINUATION_CUE.test(low)) return { kind: "continuation" };
  if (looksLikeName(head)) return { kind: "source", name: cleanSource(head) };
  return { kind: "continuation" };
}

function matchFather(norm: string): FatherDef | null {
  if (!norm) return null;
  for (const f of FATHERS) {
    for (const a of f.aliases) {
      if (norm === a || norm.startsWith(a + " ") || norm.startsWith(a)) return f;
    }
  }
  return null;
}

// A short, fully-capitalised token (1–3 words) — a genuine but unrecognised
// proper name (Josephus, Faustus, Photius) — surfaces as a visible source chip
// rather than vanishing into a continuation.
function looksLikeName(head: string): boolean {
  const words = head.trim().split(/\s+/);
  return words.length >= 1 && words.length <= 3 && words.every((w) => /^[A-Z][A-Za-z.'’-]*$/.test(w));
}

function titleCase(s: string): string {
  return s.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanSource(head: string): string {
  const s = head.trim().replace(/\s+/g, " ");
  return s || "Source";
}

/** Walk a verse's Catena notes in source order, folding each continuation into
 *  the Father (or Gloss/source) block before it. Returns the rendered blocks. */
export function groupCatena(notes: { father?: string; text: string }[]): CatenaBlock[] {
  const blocks: CatenaBlock[] = [];
  for (const note of notes) {
    const nf = normalizeFather(note.father ?? "");
    const text = (note.text ?? "").trim();
    if (nf.kind === "continuation") {
      const cur = blocks[blocks.length - 1];
      if (cur) {
        if (text) cur.text = cur.text ? `${cur.text}\n\n${text}` : text;
      } else if (text) {
        blocks.push({ kind: "source", father: null, name: "", isDoctor: false, text });
      }
      continue;
    }
    if (nf.kind === "father") {
      const father: Father = {
        id: nf.id!, name: nf.name!, isDoctor: nf.isDoctor!,
        year: yearOf(nf.id!) ?? UNDATED_YEAR, circa: circaOf(nf.id!)
      };
      blocks.push({ kind: "father", father, name: father.name, isDoctor: father.isDoctor, text });
    } else if (nf.kind === "gloss") {
      blocks.push({ kind: "gloss", father: null, name: nf.name!, isDoctor: false, text });
    } else {
      blocks.push({ kind: "source", father: null, name: nf.name!, isDoctor: false, text });
    }
  }
  return blocks;
}

/** The distinct Fathers across a verse's blocks, in first-appearance order — the
 *  per-Father chip list. Excludes the Gloss and anonymous sources. */
export function fathersOf(blocks: CatenaBlock[]): Father[] {
  const seen = new Set<string>();
  const out: Father[] = [];
  for (const b of blocks) {
    if (b.kind === "father" && b.father && !seen.has(b.father.id)) {
      seen.add(b.father.id);
      out.push(b.father);
    }
  }
  return out;
}
