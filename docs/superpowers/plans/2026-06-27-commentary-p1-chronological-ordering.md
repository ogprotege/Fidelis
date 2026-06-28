# The Golden Chain, in order (Commentary Phase 1) Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Render the Catena Aurea's per-verse patristic chain **earliest-Father-first** by sorting at render time over a hand-curated death/floruit year per Father — touching no file under `public/data/` and not the manifest.

**Architecture:** Pure code-and-test change. `src/lib/commentary.ts` gains a `year` (+ optional `circa`) on every declared Father, a `PSEUDO_YEARS` map for the runtime `pseudo-*` ids `normalizeFather` mints, and three pure functions (`yearOf`, `circaOf`, `sortChronological`). `CommentarySheet` applies `sortChronological` in its existing `useMemo` pipeline **after** `groupCatena`, so the chip row and the comment list both read chronological for free; the date renders inside the already-gold attribution label. All new logic is asserted in `scripts/test-data.ts`; the UI surface is verified by `npm run build` + a manual check.

**Tech Stack:** React 18 + TypeScript (strict, `tsc --noEmit`), Vite, the `tsx` Node assertion harnesses (`scripts/test-{liturgical,data}.ts`), ESLint 9. Node 22.

**Proposed version:** `v1.14.0 — "the chain in order"`. *(Phases 2 "the Haydock lane" and 3 "beyond the Gospels" from the same spec are separate future plans; this plan is Phase 1 only. Version name is the owner's call — renumber at Task 3 if desired; flagged, not assumed.)*

## Global Constraints

Every task implicitly carries these (CLAUDE.md standing rules + the spec's §1 Decisions):

- **Never hand-edit `public/data/`.** Phase 1 writes nothing there; the sort is pure code over data the manifest already seals. **No manifest reseal, no `sw.js` `DATA_CACHE` bump** (spec G1).
- **Two-accent rule — purple ACTS, gold HONORS; no element wears both.** The "c. NNN" date is honor/apparatus text living **inside** the already-gold `.cmt-attr` label: it adds no new accent and no purple. Chips/tabs stay purple (interactive).
- **§13 refusal list (binding):** no accounts/cloud, no AI summaries/paraphrase/chat — the chronological order is a hand-curated scholarly table and every comment is the source's verbatim public-domain text; no social, no streaks/badges, no ads/IAP, no notification pressure, no red-letter text.
- **§1.5 icon discipline:** no emoji in any `.tsx` (the harness emoji guard fails on in-scope emoji); the only added text glyph is the `·` separator and `&amp;` in a divider label — both allowed.
- **Copyrighted text never bundled.** Unaffected (no data change); the Catena is public domain by age.
- **The Today page never exceeds five cards.** Unaffected (no card touched).
- **Golden snapshots untouched.** They pin the calendar + Mass-reading resolution, not commentary (spec P5/§5) — do **not** run `npm run golden`.
- **Green bar = `npm test`** (`test-liturgical` → `test-data` → `build-manifest --verify` → `eslint src`) **AND `npm run build`** (`tsc --noEmit` + vite). Both pass at every commit.

---

## Task 0: Branch off `main`

**Files:** none (git only).

The repo branches before feature work (we are on `main`).

- [ ] **Step: Create the branch**

```bash
git checkout -b v1.14-golden-chain
```

- [ ] **Step: Confirm clean baseline** — `npm test && npm run build` both green before any change.

---

## Task 1: The year table + the pure chronological sort (`src/lib/commentary.ts`)

**Files:**
- Modify: `src/lib/commentary.ts` — `Father` interface (lines 27-31); `FatherDef` + `FATHERS[]` (lines 58-118); a new chronological block after `isDoctor` (after line 132); the `Father` construction in `groupCatena` (line 226).
- Modify (test): `scripts/test-data.ts` — extend the commentary import (line 39); add a `§16b` assertion block after the existing `§16` block (after line 1700).

**Interfaces:**
- **Consumes:** `CatenaBlock` (existing, lines 44-50), `normalizeFather` / `groupCatena` / `fathersOf` / `isDoctor` (existing).
- **Produces:**
  - `interface FatherDef { id: string; name: string; aliases: string[]; year: number; circa?: boolean; }`
  - `interface Father { id: string; name: string; isDoctor: boolean; year: number; circa?: boolean; }` (export, extended)
  - `export const FATHER_IDS: readonly string[]` — every declared Father id.
  - `export function yearOf(id: string): number | null` — death/era year; `null` → the undated bucket (G4), never `0`.
  - `export function circaOf(id: string): boolean` — whether `yearOf(id)` is an estimate (renders `c. NNN`).
  - `export function sortChronological(blocks: CatenaBlock[]): CatenaBlock[]` — Fathers earliest-first (stable, alphabetical tie-break by id), gloss/source trailing in source order.

- [ ] **Step: Write the failing test.** In `scripts/test-data.ts`, extend the commentary import on line 39 to:

```ts
import { normalizeFather, groupCatena, fathersOf, isDoctor, yearOf, circaOf, sortChronological, FATHER_IDS } from "../src/lib/commentary";
```

Then add this block immediately **after** the existing `§16` block closes (after line 1700, before the `§17` comment):

```ts
// §16b — chronological ordering of the Catena chain (§4.3 Phase 1). Pure, over
// src/lib/commentary.ts. public/data is untouched; this is a render-time sort.
console.log("");
{
  // 1. Every declared Father has a finite year (TS already requires `year`; this
  //    also catches a NaN or a yearOf-resolution regression). Newman is dated too.
  const undated = FATHER_IDS.filter((id) => !Number.isFinite(yearOf(id)));
  check("every declared Father resolves to a finite year", undated.length === 0, undated.join(", "));
  check("the editor Newman is dated (never sorts, but complete)", yearOf("newman") === 1890);

  // 2. The researched dates + circa flags the chain depends on (§3.2).
  check("yearOf: Origen 254 (circa), Chrysostom 407, Augustine 430, Gregory the Great 604",
    yearOf("origen") === 254 && circaOf("origen") === true &&
    yearOf("chrysostom") === 407 && circaOf("chrysostom") === false &&
    yearOf("augustine") === 430 && yearOf("gregory-the-great") === 604);
  check("yearOf: maximus defaults to Turin (465, circa) — flip to 662 is one line",
    yearOf("maximus") === 465 && circaOf("maximus") === true);

  // 3. Runtime pseudo-* ids dated by COMPOSITION era, not the namesake (§3.3, G2).
  check("pseudo-chrysostom (Opus Imperfectum) dated to its 5th-c. era, circa",
    yearOf("pseudo-chrysostom") === 430 && circaOf("pseudo-chrysostom") === true);
  check("pseudo-jerome (Hiberno-Latin Expositio) dated c. 675",
    yearOf("pseudo-jerome") === 675 && circaOf("pseudo-jerome") === true);
  check("pseudo-athan ('Pseudo-Athan.', Vigilius of Thapsus) is dated, not undated",
    yearOf("pseudo-athan") === 450);
  // base+1 fallback for an undocumented pseudo-<known father> (§3.4 step 3).
  check("yearOf: a generated pseudo-<base> falls to base death year + 1, circa",
    yearOf("pseudo-cyprian") === 259 && circaOf("pseudo-cyprian") === true);
  // a nameless / unknown pseudo → the undated bucket (G4), NEVER 0.
  check("yearOf: pseudo-anon and bare 'Pseudo.' (pseudo-pseudo) are undated, not 0",
    yearOf("pseudo-anon") === null && yearOf("pseudo-pseudo") === null);

  // 4. sortChronological orders earliest-Father-first (built via groupCatena so the
  //    blocks are real). Input is deliberately out of order.
  const chain = sortChronological(groupCatena([
    { father: "Augustine", text: "aug" },
    { father: "Gregory", text: "greg" },           // Gregory the Great, 604
    { father: "Origen", text: "ori" },
    { father: "Pseudo-Chrysostom", text: "ps-chrys" },
    { father: "Chrysostom", text: "chrys" }
  ]));
  check("sortChronological: Origen < Chrysostom < Augustine < pseudo-chrysostom < Gregory",
    chain.map((b) => b.father!.id).join(",") === "origen,chrysostom,augustine,pseudo-chrysostom,gregory-the-great",
    chain.map((b) => b.father!.id).join(","));
  // pseudo-chrysostom (430) sits in the 5th-c. slot, AFTER chrysostom (407) — never
  // beside its namesake at 407.
  const ids = chain.map((b) => b.father!.id);
  check("pseudo-chrysostom sorts to its composition era (after Chrysostom 407, not at it)",
    ids.indexOf("pseudo-chrysostom") > ids.indexOf("chrysostom"));

  // 5. Tie-break: equal years resolve stable-ascending-alphabetical by id (G3).
  const tie = sortChronological(groupCatena([
    { father: "Nemesius", text: "n" },             // 390
    { father: "Gregory Naz.", text: "gn" },        // 390
    { father: "Chrysologus", text: "pc" },         // Peter Chrysologus, 450 — the corpus
                                                    //  label is "Chrysologus"; "Peter
                                                    //  Chrysologus" misses matchFather's
                                                    //  prefix rule and becomes a source.
    { father: "Isidore", text: "ip" }              // Isidore of Pelusium, 450
  ]));
  check("tie-break: gregory-nazianzen<nemesius (390); isidore-pelusium<peter-chrysologus (450)",
    tie.map((b) => b.father!.id).join(",") === "gregory-nazianzen,nemesius,isidore-pelusium,peter-chrysologus",
    tie.map((b) => b.father!.id).join(","));

  // 6. Continuations survive the sort (sort runs on GROUPED blocks, §4).
  const cont = sortChronological(groupCatena([
    { father: "Chrysostom", text: "A" },
    { father: "It goes on", text: "B" },           // folds into Chrysostom
    { father: "Augustine", text: "C" }
  ]));
  check("continuations survive the sort (block count + merged text intact)",
    cont.length === 2 && cont[0].father!.id === "chrysostom" && cont[0].text === "A\n\nB" &&
    cont[1].father!.id === "augustine");

  // 7. Lane separation (G5): Fathers (chronological) first, then gloss/source in
  //    source order; no gloss/source block appears among the Fathers.
  const lane = sortChronological(groupCatena([
    { father: "Gloss", text: "g" },
    { father: "Augustine", text: "a" },
    { father: "A Greek expositor", text: "s" },
    { father: "Origen", text: "o" }
  ]));
  const firstNonFather = lane.findIndex((b) => b.kind !== "father");
  check("lane separation: all Fathers precede every gloss/source block",
    lane.slice(0, firstNonFather).every((b) => b.kind === "father") &&
    lane.slice(firstNonFather).every((b) => b.kind !== "father"));
  check("lane separation: Fathers chronological, gloss/source keep source order",
    lane.map((b) => b.kind === "father" ? b.father!.id : b.kind).join(",") === "origen,augustine,gloss,source");

  // 8. Undated tail: a synthetic undated Father sorts AFTER every dated one (G4).
  const tail = sortChronological(groupCatena([
    { father: "Pseudo.", text: "x" },              // → pseudo-pseudo, undated
    { father: "Augustine", text: "a" }
  ]));
  check("undated Father sorts after dated ones (never front-loaded as 'earliest')",
    tail.map((b) => b.father!.id).join(",") === "augustine,pseudo-pseudo");

  // 9. Corpus guard: every kind:'father' id in the built Catena is dated, or is an
  //    explicitly-listed undatable id — so a new unmatched author can never silently
  //    sort to 0 (G4). Read straight from public/data (manifest-sealed, not edited).
  const cdir = join(ROOT, "public/data/commentary/catena");
  const undatedInCorpus = new Set<string>();
  for (const fn of readdirSync(cdir)) {
    if (!fn.endsWith(".json")) continue;
    const bk: Record<string, { father?: string }[]> = JSON.parse(readFileSync(join(cdir, fn), "utf8"));
    for (const notes of Object.values(bk)) for (const n of notes) {
      const nf = normalizeFather(n.father ?? "");
      if (nf.kind === "father" && yearOf(nf.id!) === null) undatedInCorpus.add(nf.id!);
    }
  }
  // The only genuinely undatable label in the Gospel Catena is the nameless
  // "Pseudo." (→ pseudo-pseudo, 7 blocks); everything else must resolve to a year.
  const KNOWN_UNDATED = new Set(["pseudo-pseudo"]);
  const leaked = [...undatedInCorpus].filter((id) => !KNOWN_UNDATED.has(id));
  check("every Catena Father id in the corpus is dated (only the nameless 'Pseudo.' is undated)",
    leaked.length === 0, leaked.join(", "));
}
```

- [ ] **Step: Run it, expect FAIL.** Command: `npm test`. Expected: `test-liturgical` passes, then `test-data` **errors / fails** — `yearOf`, `circaOf`, `sortChronological`, and `FATHER_IDS` are not yet exported (the harness throws "yearOf is not a function" or the new checks print `FAIL`), so `npm test` exits non-zero before the manifest verify.

- [ ] **Step: Implement — extend the `Father` interface.** In `src/lib/commentary.ts`, replace the `Father` interface (lines 27-31):

```ts
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
```

- [ ] **Step: Implement — date every Father.** Replace the `FatherDef` interface + the `FATHERS[]` array (lines 58-118) with this exact block (death year by default; `circa: true` only where the §3.2 table flags an estimate):

```ts
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
```

- [ ] **Step: Implement — `yearOf` / `circaOf` / `sortChronological`.** Insert this block immediately **after** the `isDoctor` function (after line 132), before the `CONTINUATION_CUE` const:

```ts
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
```

- [ ] **Step: Implement — populate `year`/`circa` on the constructed Father.** In `groupCatena`, replace the Father-construction line (line 226):

```ts
      const father: Father = {
        id: nf.id!, name: nf.name!, isDoctor: nf.isDoctor!,
        year: yearOf(nf.id!) ?? UNDATED_YEAR, circa: circaOf(nf.id!)
      };
```

- [ ] **Step: Run, expect PASS.** Command: `npm test`. Expected: both harnesses pass (the new `§16b` checks all print `ok`), the manifest verify passes (no data changed), `eslint src` clean → exit 0.

- [ ] **Step: Type-check.** Command: `npm run build`. Expected: `tsc --noEmit` clean (the required `year` on `Father` is satisfied by `groupCatena`; nothing else constructs a `Father`) and vite build succeeds.

- [ ] **Step: Commit**

```bash
git add src/lib/commentary.ts scripts/test-data.ts
git commit -m "commentary: date every Father + pure sortChronological/yearOf/circaOf (§16b tests)"
```

---

## Task 2: Apply the sort at render time + the date label + the lane divider (`CommentarySheet.tsx`, `styles.css`)

No DOM test runner exists; correctness is `npm run build` (tsc + vite) + a described manual check (the project's established standard for sheet UI).

**Files:**
- Modify: `src/components/CommentarySheet.tsx` — imports (lines 1, 3); the `useMemo` pipeline (line 70); the `visible.map` render (lines 195-200).
- Modify: `src/styles.css` — add `.cmt-date` + `.cmt-divider` after `.cmt-attr.plain` (line 1611).

**Interfaces:** Consumes `sortChronological`, `yearOf`, `circaOf` (Task 1). Produces no new exports.

- [ ] **Step: Imports.** In `src/components/CommentarySheet.tsx`, change line 1 to add `Fragment`, and line 3 to pull the new helpers:

```tsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { CommentaryNote, loadCommentary } from "../lib/data";
import { fathersOf, groupCatena, sortChronological, yearOf, circaOf } from "../lib/commentary";
```

- [ ] **Step: Sort in the pipeline.** Replace the `blocks`/`fatherChips` memo pair (line 70-71) with a grouped → sorted → chips chain:

```tsx
  const grouped = useMemo(() => groupCatena(catena ?? []), [catena]);
  const blocks = useMemo(() => sortChronological(grouped), [grouped]);
  const fatherChips = useMemo(() => fathersOf(blocks), [blocks]);
```

(Chips now come from the already-sorted `blocks`, so the chip row is chronological for free; `fathersOf`, `visible`, `picked`, `doctorsOnly` are all untouched.)

- [ ] **Step: Date label + lane divider.** Replace the `visible.map(...)` render (lines 195-200) with:

```tsx
                visible.map((b, i) => {
                  const prev = visible[i - 1];
                  const startsOthers = b.kind !== "father" && (!prev || prev.kind === "father");
                  const y = b.kind === "father" && b.father ? yearOf(b.father.id) : null;
                  return (
                    <Fragment key={i}>
                      {startsOthers && (
                        <div className="cmt-divider" aria-hidden="true">Glossa &amp; other sources</div>
                      )}
                      <div className="cmt-block">
                        <div className={`cmt-attr ${b.kind !== "father" ? "plain" : ""}`}>
                          {b.name}
                          {y !== null && (
                            <span className="cmt-date">{` · ${circaOf(b.father!.id) ? "c. " : ""}${y}`}</span>
                          )}
                        </div>
                        <Paragraphs text={b.text} />
                      </div>
                    </Fragment>
                  );
                })
```

(The divider only renders when a gloss/source block first follows the Fathers; under Doctors-only or a chip filter that hides all non-Fathers there is nothing to divide, so it does not appear.)

- [ ] **Step: Styles.** In `src/styles.css`, immediately after `.cmt-attr.plain { … }` (line 1611) add:

```css
/* §4.3 Phase 1 — the chronological chain. The date is honor/apparatus text inside
   the already-gold .cmt-attr label: it inherits gold, adds no new accent, no
   purple. text-transform:none keeps "c." lowercase under the label's uppercasing. */
.cmt-date { text-transform: none; font-weight: 400; opacity: 0.8; }
/* The quiet "Glossa & other sources" lane divider (G5) — neutral structural text,
   not an accent. */
.cmt-divider {
  font-family: var(--sans);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-top: var(--hairline) solid var(--border);
  padding-top: 0.7rem;
  margin: 0.4rem 0 0.9rem;
}
```

- [ ] **Step: Type-check + harness.** Command: `npm test && npm run build`. Expected: both green (no data, no new exports beyond Task 1; the emoji guard is unaffected — `·` and `&amp;` are allowed).

- [ ] **Step: Manual check.** `npm run dev`, open a Gospel verse's Commentary sheet (e.g. `/read/drc/john/3?v=16` → open commentary on a verse with many Fathers such as Matthew 5:3). Confirm: comments read **earliest Father first** (Origen/Chrysostom before Aquinas-era voices); the chip row is in the same order; each Father attribution shows `· c. 407` / `· 430` in gold inside the existing label (no purple, no layout shift); the Glossa/source blocks sit **after** the Fathers under a quiet "Glossa & other sources" divider; the Doctors-only toggle and per-Father chips still filter correctly.

- [ ] **Step: Commit**

```bash
git add src/components/CommentarySheet.tsx src/styles.css
git commit -m "commentary: render the Catena chain chronologically with a gold c.NNN date + lane divider (§4.3 Phase 1)"
```

---

## Task 3: Cut the release (v1.14.0)

**Files:** Modify `package.json` (+ `package-lock.json` via `npm version`); `CHANGELOG.md`; `CLAUDE.md` (release ledger + the intro narrative); `docs/history/RELEASES.md` (the detail section). **Do NOT edit `docs/superpowers/INDEX.md`** — the orchestrator adds the index link to avoid a concurrent-edit race. **Do NOT bump `sw.js` `DATA_CACHE`** (no data changed, spec G1). **Do NOT run `npm run golden`** (commentary does not touch the snapshots).

- [ ] **Step: Bump the version** (updates `package.json` + lockfile, no git tag/commit):

```bash
npm version 1.14.0 --no-git-tag-version
```

Expected: prints `v1.14.0`; both files now read `1.14.0`.

- [ ] **Step: CHANGELOG entry.** Add above the `## [1.13.3]` section, dated 2026-06-27:

```markdown
## [1.14.0] — 2026-06-27 — the chain in order

The Catena Aurea — Aquinas's Golden Chain — has always shipped in his own source
order, which is neither chronological nor alphabetical. Now the per-verse patristic
chain renders **earliest Father first**, from Origen and Chrysostom down to the
medieval voices, using a hand-curated death/floruit year per Father. Pure render-time
sort: no text changed, no data file touched, no manifest reseal. (Spec §4.3 Phase 1;
Phases 2–3 — the Haydock lane and the chain beyond the Gospels — follow separately.)

### Added

- **A death/floruit year (+ a `circa` estimate flag) on every Catena Father**, and a
  `PSEUDO_YEARS` map dating the runtime pseudonymous labels — the Opus Imperfectum
  (`pseudo-chrysostom`, the largest single voice), the Hiberno-Latin Mark *Expositio*
  (`pseudo-jerome`), and the rest — by their **composition era**, never the namesake.
- **A pure, tested `sortChronological`** (`src/lib/commentary.ts`): Fathers earliest
  first, a stable alphabetical tie-break, undatable voices in a bucket *after* the
  dated chain (never falsely front-loaded), and the Glossa / named sources kept out
  of the patristic chain entirely.
- **The date in the attribution label** — `CHRYSOSTOM · c. 407` — rendered inside the
  existing gold label (honor, no new accent); the per-Father chip row follows the same
  chronological order for free.

### Changed

- The Commentary sheet's Catena pane now reads chronologically, with a quiet
  "Glossa & other sources" divider between the Fathers and the gloss/source blocks.

No change to the bundled texts, the liturgical engines, the manifest, the golden-year
snapshots, or the service-worker data cache — this is a render-time ordering only.
```

- [ ] **Step: CLAUDE.md.** Add a ledger line at the top of the "Release ledger" list:

```markdown
- **v1.14.0 — the chain in order** — the Catena Aurea's per-verse chain renders earliest-Father-first via a hand-curated death/floruit year per Father (a pure render-time sort; no data, manifest, or sw change). → [detail](docs/history/RELEASES.md#the-chain-in-order--catena-chronological-ordering-v1140)
```

And append `; the Catena Aurea Gospel chain reordered earliest-Father-first by a hand-curated year-per-Father in v1.14.0` to the long intro paragraph's release list (after the v1.13.2 clause), matching the existing voice.

- [ ] **Step: RELEASES.md.** Add a detail section to `docs/history/RELEASES.md` headed exactly `## The chain in order — Catena chronological ordering (v1.14.0)` (so the CLAUDE.md anchor `#the-chain-in-order--catena-chronological-ordering-v1140` resolves), mirroring an existing per-release block: the §4.3 Phase-1 decisions (render not build → manifest untouched; death-year sort with circa estimates; `PSEUDO_YEARS` by composition era; the undated bucket; the `maximus` Turin-vs-Confessor flag defaulting to 465), and the files touched (`commentary.ts`, `CommentarySheet.tsx`, `styles.css`, `test-data.ts §16b`).

- [ ] **Step: Final verify.** Command: `npm test && npm run build && npm run check-docs`. Expected: all green (`check-docs` confirms the new RELEASES.md anchor + this plan's `../../INDEX.md` link resolve; the parent will have linked this plan from `INDEX.md`).

- [ ] **Step: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md CLAUDE.md docs/history/RELEASES.md
git commit -m "v1.14.0 'the chain in order' — Catena chronological ordering (§4.3 Phase 1)"
```

- [ ] **Step:** Stop and ask the owner before pushing / opening a PR (repo policy: commit/push only when asked). Surface the `maximus` open question (below) for confirmation at this point.

---

## Self-Review

**Spec coverage (§4.3 Phase 1):** the year + `circa` on every Father (§3.1/§3.2) and the `PSEUDO_YEARS` runtime map (§3.3) → Task 1; `yearOf` resolution order incl. the base+1 fallback and the `null`-not-`0` undated bucket (§3.4, G4) → Task 1; `sortChronological` over *grouped* blocks with the alphabetical tie-break (G3) and lane separation (G5) → Task 1; the render-time application after `groupCatena`, the chronological chips, the gold `c. NNN` date, and the "Glossa & other sources" divider (§4/§5) → Task 2; all seven spec tests (§6 Phase 1) plus the corpus-wide undated guard → the `§16b` block in Task 1. No "sort by" control is added (§5 — single correct answer). G1 honored end-to-end: no `public/data/`, manifest, golden, or sw change → Task 3 notes.

**Placeholders:** none. Every `FATHERS[]` entry carries its year inline; `PSEUDO_YEARS` keys are the **actual emitted ids** verified against the built corpus (`pseudo-athan`, not `pseudo-athanasius`; the nameless `pseudo-pseudo` is the sole undated id, allow-listed). Every test's expected output string was computed by hand against the year table.

**Type consistency:** `Father` gains a required `year: number` + optional `circa?`; the only construction site is `groupCatena`, updated in the same task; `CommentarySheet` only reads `Father`, so its reads are unaffected. `FATHER_IDS`, `yearOf`, `circaOf`, `sortChronological` are exported from `commentary.ts` and consumed by exactly their declared signatures in `test-data.ts` and `CommentarySheet.tsx`.

**Constraint check:** no Today card touched; no `public/data/` edit; the date is gold-inside-gold (no element wears two accents); no emoji added; no AI/summary (a hand-curated table + verbatim PD text); golden snapshots and the sw data cache left alone.
