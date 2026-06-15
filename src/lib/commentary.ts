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
}

const FATHERS: FatherDef[] = [
  { id: "gregory-nazianzen", name: "Gregory Nazianzen", aliases: ["gregory nazianzen", "gregory naz", "greg naz"] },
  { id: "gregory-of-nyssa", name: "Gregory of Nyssa", aliases: ["gregory of nyssa", "gregory nyss", "greg nyss"] },
  { id: "gregory-the-great", name: "Gregory the Great", aliases: ["gregory", "greg"] },
  { id: "peter-chrysologus", name: "Peter Chrysologus", aliases: ["chrysologus", "chrysolog", "chrysol"] },
  { id: "chrysostom", name: "Chrysostom", aliases: ["chrysostom", "chrysost", "chrys", "chyrs"] },
  { id: "augustine", name: "Augustine", aliases: ["augustine", "august", "aug"] },
  // Ambrosiaster — the conventional name for an anonymous 4th-c. commentator on
  // the Pauline epistles, NOT St. Ambrose and not a Doctor. Listed before Ambrose
  // so the "ambros" startsWith never absorbs it. (Labels whose head is "Ambrose"
  // with "Ambrosiaster" in the citation apparatus still resolve to Ambrose.)
  { id: "ambrosiaster", name: "Ambrosiaster", aliases: ["ambrosiaster"] },
  { id: "ambrose", name: "Ambrose", aliases: ["ambrose", "ambros"] },
  { id: "jerome", name: "Jerome", aliases: ["jerome", "hieronymus", "hieron"] },
  { id: "john-damascene", name: "John Damascene", aliases: ["john damascene", "john of damascus", "damascene", "damascen", "damasc", "damas"] },
  { id: "athanasius", name: "Athanasius", aliases: ["athanasius", "athanas"] },
  { id: "basil", name: "Basil", aliases: ["basil"] },
  { id: "hilary", name: "Hilary", aliases: ["hilary", "hilar", "hil"] },
  // Cyril of Alexandria in the Gospel Catena (a Doctor; Cyril of Jerusalem is too).
  { id: "cyril", name: "Cyril", aliases: ["cyril"] },
  { id: "isidore-of-seville", name: "Isidore of Seville", aliases: ["isidore of seville", "isidorus hispalensis", "isid hisp", "isidore hisp", "isidorus hisp"] },
  // Bare "Isidore" in the Gospel Catena is Isidore of Pelusium — NOT a Doctor.
  { id: "isidore-pelusium", name: "Isidore of Pelusium", aliases: ["isidore of pelusium", "isidore pelus", "isidore", "isidor", "isid"] },
  { id: "leo", name: "Leo the Great", aliases: ["leo"] },
  { id: "bede", name: "Bede", aliases: ["bede", "beda"] },
  { id: "theophylact", name: "Theophylact", aliases: ["theophylact", "theophyl", "theophyact", "theopehyl", "theoph"] },
  { id: "origen", name: "Origen", aliases: ["origen", "origin"] },
  { id: "remigius", name: "Remigius", aliases: ["remigius", "remig"] },
  { id: "rabanus", name: "Rabanus Maurus", aliases: ["rabanus", "raban"] },
  { id: "alcuin", name: "Alcuin", aliases: ["alcuin"] },
  { id: "eusebius", name: "Eusebius", aliases: ["eusebius", "euseb"] },
  { id: "maximus", name: "Maximus", aliases: ["maximus", "maxim", "max"] },
  { id: "haymo", name: "Haymo", aliases: ["haymo", "haimo"] },
  { id: "titus-of-bostra", name: "Titus of Bostra", aliases: ["titus of bostra", "titus", "tit bost", "tit bos", "tit"] },
  { id: "didymus", name: "Didymus", aliases: ["didymus"] },
  { id: "severianus", name: "Severianus", aliases: ["severianus", "severian"] },
  { id: "epiphanius", name: "Epiphanius", aliases: ["epiphanius", "epiphan"] },
  { id: "cyprian", name: "Cyprian", aliases: ["cyprian"] },
  { id: "theodotus", name: "Theodotus", aliases: ["theodotus", "theodot", "theod"] },
  { id: "clement-of-alexandria", name: "Clement of Alexandria", aliases: ["clement of alexandria", "clement", "clem alex", "clem"] },
  // Dionysius of Alexandria — a real Father, distinct from the Areopagite below.
  { id: "dionysius-of-alexandria", name: "Dionysius of Alexandria", aliases: ["dionysius of alexandria", "dionysius alex", "dion alex", "dionysius al", "dion al"] },
  { id: "cassian", name: "John Cassian", aliases: ["cassian"] },
  { id: "nemesius", name: "Nemesius", aliases: ["nemesius"] },
  { id: "gennadius", name: "Gennadius", aliases: ["gennadius"] },
  { id: "paschasius", name: "Paschasius", aliases: ["paschasius"] },
  { id: "lanfranc", name: "Lanfranc", aliases: ["lanfranc"] },
  { id: "petrus-alfonsus", name: "Petrus Alfonsus", aliases: ["petrus alfonsus", "petrus alphonsus", "petrus alf"] },
  { id: "methodius", name: "Methodius", aliases: ["methodius"] },
  { id: "photius", name: "Photius", aliases: ["photius"] },
  { id: "anselm", name: "Anselm", aliases: ["anselm"] },
  // Every other "Dionys…" is the Pseudo-Dionysian corpus (Celestial Hierarchy,
  // Divine Names). Last, so "dion alex" above wins for Dionysius of Alexandria.
  { id: "pseudo-dionysius", name: "Pseudo-Dionysius", aliases: ["dionysius", "dionys"] }
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
      const father: Father = { id: nf.id!, name: nf.name!, isDoctor: nf.isDoctor! };
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
