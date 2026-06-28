# §4.3 — The Golden Chain, in order and beyond the Gospels

[← Docs index](../../INDEX.md)

**Date:** 2026-06-27
**Spec section:** Feature Design Spec §4 (the commentary layer), third pass
**Branch:** `v1.14-golden-chain`
**Status:** 📝 design — three independently-shippable phases. Phase 1 is all-PD and
Gospels-only (no data files change at all); Phase 2 is a UI restatement + a label model;
Phase 3 ingests a new public-domain source and is the only phase that touches
`public/data/` and the manifest.

---

## 0. The reframe

The §4.2 commentary layer (shipped v1.5.0) already does most of what people imagine
when they ask for "the Church Fathers on this verse." The **Catena Aurea** *is* the
*Catena Aurea* — literally the **Golden Chain**, St. Thomas Aquinas's verse-by-verse
chain of patristic quotations, in the Oxford/Newman 1841–45 translation — and it already
ships, sealed in the manifest, for all four Gospels (3,736 verse keys, ~72k comment
blocks). **Haydock** (the 1883 Bishop's commentary) already ships for the whole 73-book
canon. Both render in the `CommentarySheet`; both are public domain.

So this is not a "build the Fathers" project. It is three smaller, honest improvements
to a chain that already exists:

1. **Order it.** The Catena ships in **source order** — the order Aquinas chained the
   quotations, which is neither chronological nor alphabetical. A reader who wants "what
   the *earliest* Fathers said first" cannot get it. **Phase 1** sorts the chain
   **chronologically (earliest Father first)** at render time, using a hand-curated
   death/floruit year per Father. All-PD, Gospels-only, **zero data-file changes**.

2. **Keep Haydock in its own lane.** Haydock is one 19th-century compiler's notes, not a
   Father. It must **never** interleave into the patristic chain. It already lives in its
   own tab; **Phase 2** makes that separation explicit and durable as the chain grows
   beyond the Gospels, and settles the tab-label model.

3. **Extend the chain beyond the Gospels.** The Catena covers only the Gospels. **Phase
   3** ingests a vetted **public-domain, verse-keyed** patristic source (ANF/NPNF re-keyed
   to Scripture) for Genesis, the Psalms, the Epistles, and the rest — reusing the exact
   on-disk `{ "ch:v": [{ father, text }] }` shape so the `CommentarySheet` renders it
   **unchanged**.

**Rejected, restated so it stays rejected (carried from §4.2 and §13):** no inline
interleaving of commentary into the sacred page; no AI summaries, paraphrase, or
"what this means" generation — the chronological order is a *hand-curated scholarly
table*, and every word of every Father is the source's verbatim public-domain text. No
red-letter, no images, no motion, no accounts.

---

## 1. Decisions (resolved with the product owner)

| # | Decision | Choice |
|---|----------|--------|
| G1 | Sort at **build** (reorder JSON on disk) or at **render** | **Render.** A pure sort in `commentary.ts`, applied by `CommentarySheet` after grouping. `public/data/` stays in source order → **the manifest is untouched, no reseal, no `sw.js` cache bump** for Phase 1, and re-dating a Father is a code+test change, not a data rebuild. |
| G2 | Sort key | **Death year** by default; **floruit midpoint** for anonymous authors (`circa`); **composition era** for pseudonymous works (`circa`) — never the namesake's death year. From the researched table (§3.2). |
| G3 | Tie-break | Stable ascending **alphabetical by `id`** (`byYear || a.id.localeCompare(b.id)`). |
| G4 | Undatable authors | A flagged **"undated" group placed *after* all dated Fathers**, alphabetical by id — **never** silently defaulted to year 0 (that would falsely front-load them as "earliest"). |
| G5 | Where gloss / anonymous-source blocks go in the sorted pane | **Out of the patristic chain.** Render the chronological Father chain first, then a labeled divider, then the Glossa Ordinaria / named-source blocks in source order — mirroring the existing chip-row separation. |
| H1 | Haydock vs. the Fathers | **Separate tabs, never merged** (already true in §4.2; Phase 2 makes it binding and label-correct beyond the Gospels). |
| H2 | The patristic tab's label | **"Church Fathers"** is the durable label; the **per-book source credit** names the actual source (the *Catena Aurea*, Newman ed., on the Gospels; the patristic database elsewhere). See §5.2 — flagged as an open question. |
| P1 | Phase-3 source | **HistoricalChristianFaith/Commentaries-Database** — ANF/NPNF (Schaff–Wace, PD by age) re-keyed to Scripture verses; per-author `metadata.toml` carries `default_year` (death year). |
| P2 | The copyright hazard | The DB **also** carries some still-copyright excerpts under a fair-use notice. A **three-gate public-domain filter** (§6.3) drops every one before bundling; the harness proves nothing copyrighted survives. |
| P3 | Phase-3 on-disk shape | **Identical** to the Catena: `public/data/commentary/patristic/{slug}.json`, `{ "ch:v": [{ father, text }] }`. The `CommentarySheet`, `normalizeFather`, `groupCatena`, `fathersOf`, and the Phase-1 sort all work **unchanged**. |
| P4 | Phase-3 versification | Remap the source's (AV/KJV) keys onto the bundle's Vulgate/Douay grid, reusing `build-haydock.mjs`'s `remapPsalmKey`/`hebrewSpanToVulgate` for the Psalms and `build-catena.mjs`'s in-grid clamp/drop pattern for the rest. |
| P5 | Golden snapshots | **Unaffected by any phase.** The golden years (`scripts/golden/{2024..2027}.json`) pin the computed calendar + Mass-reading resolution, not commentary. New commentary data adds manifest entries only. |

---

## 2. What ships, per phase

- **Phase 1 (the chain, in order):** a `year` (+ optional `circa`) on every Father; a pure
  `sortChronological(blocks)` + `yearOf(id)` in `commentary.ts`; the Catena pane renders
  earliest-Father-first; the chip row follows chronological order; an optional "c. 375"
  date sits inside the existing gold attribution label. **No data, no manifest, no
  service-worker change.** Shippable as `v1.14.0` on its own.

- **Phase 2 (the Haydock lane):** the tab model is made explicit — **"Church Fathers"**
  and **"Haydock"** are separate, never-interleaved tabs; the patristic source credit is
  per-book; Haydock keeps the gold dot. Mostly a restatement + a small label refactor.
  Ships with Phase 1 or Phase 3.

- **Phase 3 (beyond the Gospels):** `scripts/build-patristic.mjs`, a `patristic` pin in
  `pins.mjs`, a three-gate PD filter, the new `public/data/commentary/patristic/` corpus,
  a manifest reseal, new harness fixtures, and the FATHERS[]/year-table growth needed to
  keep the §16 coverage bars green for the new books. Ships as its own release.

---

## PHASE 1 — Chronological ordering of the chain

All public domain. Gospels-only. **No file under `public/data/` changes** — the sort is
pure code over data the manifest already seals. Shippable alone.

### 3. The year table (`src/lib/commentary.ts`)

#### 3.1 Data shape

Extend `FatherDef` and `Father` with an integer sort key and a `circa` display flag, and
add a parallel map for the **runtime-generated** `pseudo-*` ids that `normalizeFather`
mints but that are *not* literals in `FATHERS[]`:

```ts
interface FatherDef { id: string; name: string; aliases: string[]; year: number; circa?: boolean; }
export interface Father { id: string; name: string; isDoctor: boolean; year: number; circa?: boolean; }

// Runtime pseudo-* ids (Opus Imperfectum, the Hiberno-Latin Mark Expositio, …) and a
// base-Father fallback. Keyed by the id normalizeFather emits, dated by COMPOSITION era.
const PSEUDO_YEARS: Record<string, number> = { /* §3.3 */ };
const PSEUDO_CIRCA = true;                 // every pseudonymous date is an estimate

// null → the undated bucket (G4). Looks up FATHERS[], then PSEUDO_YEARS, then a
// `pseudo-<base>` → base-death-year+1 rule, else null.
export function yearOf(id: string): number | null;
export function circaOf(id: string): boolean;

// Pure, tested. Sorts a verse's grouped blocks earliest-Father-first; keeps gloss/source
// out of the chain (G5); stable tie-break (G3); applied AFTER groupCatena (see §4).
export function sortChronological(blocks: CatenaBlock[]): CatenaBlock[];
```

`year` is **death year** unless flagged `circa`. The relative order — not the exact
integer — is what matters; where a source gives a range, the centre/later value is used.

#### 3.2 The 45 declared ids (from the verified research table)

Set each `year` (and `circa` where noted) on the existing `FATHERS[]` entries:

| year | id | basis / flag |
|---|---|---|
| 215 | `clement-of-alexandria` | d. c. 215 · `circa` |
| 254 | `origen` | d. c. 253/254 · `circa` |
| 258 | `cyprian` | martyred 258 |
| 265 | `dionysius-of-alexandria` | d. c. 264/265 · `circa` |
| 311 | `methodius` | martyred c. 311 · `circa` |
| 339 | `eusebius` | d. c. 339/340 · `circa` |
| 367 | `hilary` | d. 367/368 |
| 373 | `athanasius` | d. 373 |
| 375 | `ambrosiaster` | anonymous Pauline commentator, fl. 366–384 · `circa` · NOT St. Ambrose |
| 378 | `titus-of-bostra` | d. before 378 |
| 379 | `basil` | d. 379 |
| 390 | `gregory-nazianzen` | d. c. 389/390 · `circa` (tie 390 → before `nemesius`) |
| 390 | `nemesius` | fl. c. 390, death unrecorded · `circa` |
| 394 | `gregory-of-nyssa` | d. after 394 (NOT a Doctor) |
| 397 | `ambrose` | d. 397 |
| 398 | `didymus` | Didymus the Blind, d. 398 |
| 403 | `epiphanius` | d. 403 |
| 407 | `chrysostom` | d. 407 |
| 420 | `jerome` | d. 420 |
| 425 | `severianus` | Severian of Gabala, "d. after 408" · **flag**, value soft 408–430 |
| 430 | `augustine` | d. 430 |
| 435 | `cassian` | John Cassian, d. c. 435 · `circa` |
| 444 | `cyril` | Cyril of Alexandria, d. 444 |
| 446 | `theodotus` | assumed Theodotus of Ancyra · **flag** · 6 blocks · `circa` |
| 450 | `isidore-pelusium` | d. c. 450 · `circa` (tie 450 → before `peter-chrysologus`) · NOT a Doctor |
| 450 | `peter-chrysologus` | d. c. 450 · `circa` |
| 461 | `leo` | Leo the Great, d. 461 |
| 465 | `maximus` | **BIG FLAG** — assumed Maximus of Turin (~465); if Maximus the **Confessor**, 662 (a 200-yr move). Default Turin; editor must confirm. `circa` |
| 471 | `gennadius` | assumed Gennadius I of Constantinople · **flag** · 1 block |
| 500 | `pseudo-dionysius` | composition era c. 485–500 · `circa` · never a Doctor |
| 604 | `gregory-the-great` | d. 604 |
| 636 | `isidore-of-seville` | d. 636 (the Doctor) |
| 735 | `bede` | d. 735 |
| 749 | `john-damascene` | d. c. 749 · `circa` |
| 804 | `alcuin` | d. 804 |
| 853 | `haymo` | Haymo of Halberstadt, d. 853 · **flag** (reattributed to Haymo of Auxerre, fl. ~855) |
| 856 | `rabanus` | Rabanus Maurus, d. 856 |
| 865 | `paschasius` | Paschasius Radbertus, d. c. 865 · `circa` |
| 893 | `photius` | d. c. 893 · `circa` |
| 908 | `remigius` | Remigius of Auxerre, d. c. 908 · `circa` |
| 1089 | `lanfranc` | d. 1089 |
| 1107 | `theophylact` | d. after 1107 |
| 1116 | `petrus-alfonsus` | Petrus Alfonsi, d. after 1116 |
| 1117 | `anselm` | **flag** — in this Catena, Anselm of **Laon** (d. 1117), the *Glosae super Iohannem*, not Canterbury (d. 1109); 8-yr swing, negligible |
| 1890 | `newman` | the editor of this edition; never a per-verse label → never actually sorts. In `DOCTOR_IDS` only; give it a `year` for completeness. |

#### 3.3 The runtime `pseudo-*` ids — `PSEUDO_YEARS` (dated by composition era)

These are the highest-volume labels in the whole corpus and are **not** in `FATHERS[]`;
`normalizeFather` mints them. Phase 1 is wrong if it ignores them. Date by **composition
era**, never the namesake (rule G2):

| year | runtime id | what it is | basis |
|---|---|---|---|
| 430 | `pseudo-chrysostom` | *Opus Imperfectum in Matthaeum* (anon. 5th-c.) | composed c. 400–450 · `circa` · **largest single label** (~2,880 blocks) |
| 675 | `pseudo-jerome` | Hiberno-Latin *Expositio sec. Marcum* | composed c. 650–700 · `circa` · ~1,519 blocks (mostly Mark) |
| 530 | `pseudo-augustine` | mixed pseudo-Augustinian sermons | `circa` · ~194 blocks (or base+1, §3.4) |
| 400 | `pseudo-origen` | pseudo-Origen homilies | `circa` · ~81 blocks (or base+1) |
| 450 | `pseudo-basil` | pseudo-Basil | `circa` · ~19 blocks (or base+1) |
| 450 | `pseudo-athanasius` | pseudo-Athanasius | `circa` · ~2 blocks (or base+1) |

`pseudo-dionysius` (500) is already a literal `FATHERS[]` entry (§3.2), so it is dated
there, not here.

#### 3.4 `yearOf(id)` resolution order

1. A literal `FATHERS[]` entry → its `year`.
2. A key in `PSEUDO_YEARS` → that value (always `circa`).
3. A generated `pseudo-<base>` whose `<base>` is a known Father and which is **not** in
   `PSEUDO_YEARS` → **base Father's death year + 1** (so the pseudo block sits just after
   its genuine namesake), `circa`. *(Override with a documented era whenever one exists —
   as `pseudo-chrysostom`/`pseudo-jerome` already do via `PSEUDO_YEARS`.)*
4. Otherwise (`pseudo-anon`, any future unmatched author) → **`null`** → the undated
   bucket (G4). **Never** `0`.

### 4. Where the sort happens

`groupCatena` already folds the Catena's "It goes on" connectives into the **preceding**
Father's block, so after grouping each block is exactly one contiguous attribution. The
sort therefore runs **on the grouped blocks, after `groupCatena`** — this is the
correctness invariant: sorting raw notes would tear a continuation away from its Father.

`sortChronological(blocks)`:
1. Partition into **Father blocks** (`kind === "father"`) and **non-Father blocks**
   (`gloss`, `source`).
2. Sort the Father blocks by `yearOf(block.father.id)`, `null` → a sentinel that sorts
   **last**; tie-break stable-alphabetical by `id` (G3). It is a **stable** sort, so a
   Father who appears twice in the chain keeps the two comments in their original
   relative order, now adjacent.
3. Return `[...sortedFathers, ...nonFathers]` — Fathers chronological, then the
   gloss/source blocks in their original source order (G5). The undated Fathers sit at
   the tail of the Father group, before the divider.

`CommentarySheet` applies it in the existing `useMemo` pipeline:

```tsx
const grouped = useMemo(() => groupCatena(catena ?? []), [catena]);
const blocks  = useMemo(() => sortChronological(grouped), [grouped]);   // NEW
const fatherChips = useMemo(() => fathersOf(blocks), [blocks]);         // now chronological
```

Because chips come from the already-sorted `blocks`, the chip row is chronological for
free; `fathersOf` itself is unchanged (still first-appearance order over whatever order it
is given). The filter logic (`visible`, `picked`, `doctorsOnly`) is untouched.

### 5. UI — what the reader sees (Phase 1)

- The Catena pane renders **earliest Father first**. The gloss/named-source blocks follow
  a quiet divider already present in the chip row (`cmt-chip-sep`); add the matching block
  divider before the first non-Father block, labeled e.g. *"Glossa & other sources."*
- The date renders **inside the existing gold attribution label** (`.cmt-attr`), e.g.
  `CHRYSOSTOM · c. 407`, using `circaOf(id)` to choose `c. 407` vs `407`. **Two-accent
  compliance:** the date is honor/apparatus text living inside an already-gold label — it
  adds **no** new accent and **no** purple; chips stay purple (interactive). No element
  wears both.
- No new setting. Chronological order is simply how the chain renders; there is no
  "sort by" control (that would be UI weight for a single correct answer, and the
  Today-page/§13 minimalism ethos applies to the sheet too).

### 6 (Phase 1). Tests (`scripts/test-data.ts` §16, extending the existing block)

Pure, importing from `src/lib/commentary.ts`:
1. **Every `FATHERS[]` id has a numeric `year`** — `yearOf(id)` is a finite number for all
   45 declared ids (guards against a new Father added without a date).
2. **Every `pseudo-*` id that appears in the built corpus is dated** — walk
   `public/data/commentary/catena/*.json`, run `normalizeFather` on every label, and assert
   each emitted `kind:"father"` id has `yearOf(id) !== null` **or** is an explicitly listed
   undated id. This is the guard that a new unmatched author can never silently sort to 0.
3. **`sortChronological` orders correctly** — a hand-built block list
   (Origen 254, Chrysostom 407, Augustine 430, Gregory-the-Great 604) comes back in that
   order; `pseudo-chrysostom` (430) sorts to the 5th-century slot, **not** at 407.
4. **Tie-break** — `gregory-nazianzen` precedes `nemesius` (both 390);
   `isidore-pelusium` precedes `peter-chrysologus` (both 450).
5. **Continuations survive the sort** — `sortChronological(groupCatena([...]))` on a chain
   with an "It goes on" continuation keeps the merged text intact (block count unchanged,
   the merged Father's `\n\n`-joined text preserved).
6. **Lane separation** — given Father + Gloss + source blocks, the output is all Fathers
   (chronological) **then** the gloss and source blocks (source order); no gloss/source
   block appears among the Fathers.
7. **Undated tail** — a synthetic `pseudo-anon` block sorts **after** every dated Father.

Then `npm test` + `npm run build` green; a manual `run`/`verify` to confirm the pane reads
earliest-first and the `c. NNN` dates render in gold with zero layout shift.

---

## PHASE 2 — Haydock stays in its own lane

Haydock is **one 19th-century compiler**, not a Father; it must never sit inside the
patristic chain. The §4.2 sheet already separates them into two tabs — Phase 2 makes that
binding, names the tabs correctly for a world where the chain extends past the Gospels,
and keeps the gold dot meaning Haydock.

### 7. The tab model

`CommentarySheet` shows up to two tabs; **they never interleave**:

- **"Church Fathers"** — the patristic chain (the *Catena Aurea* on the Gospels, the
  Phase-3 corpus elsewhere). Chronological (Phase 1). Chips + Doctors-only filter.
- **"Haydock"** — the Haydock notes, each prefixed by its `src` (Challoner, Calmet,
  Witham…) as a gold small-caps label. Unchanged from §4.2.

Today the tab is literally labeled **"Catena Aurea."** That label is honest only for the
four Gospels — the Phase-3 corpus on Genesis or Romans is **not** the *Catena Aurea*.
Phase 2 therefore renames the patristic tab to the durable **"Church Fathers"** and moves
the specific attribution into the per-pane **credit line**:

- On a Gospel: *"The Catena Aurea · the Newman edition."* (unchanged credit).
- On a non-Gospel (Phase 3 present): the patristic-database credit (§8.4).

The two-accent rule holds: tabs and chips are **purple** (interactive); attribution labels
and the source credit are **gold** (honor).

### 8 (Phase 2). What does *not* change

- The **gold dot stays Haydock-only.** It is the verse-number honor mark for "Haydock has
  a note here"; Haydock already covers the whole canon, so the dot is present on nearly
  every non-Gospel verse without any Phase-3 work, and we add no second mark color (which
  would breach the two-accent rule).
- The settings keys are kept verbatim (no migration): `commentaryCatena` continues to gate
  the patristic tab — it is now read as *"the Church Fathers source toggle,"* with its
  Settings sub-label reworded ("Catena Aurea on the Gospels; the Church Fathers
  elsewhere"). `commentaryDoctorsOnly` still seeds the filter.
- `Sheet variant="panel"`, focus trap, Escape/backdrop dismiss, scroll-lock, no motion —
  all inherited, untouched.

---

## PHASE 3 — Extend the chain beyond the Gospels

The only phase that writes to `public/data/` and reseals the manifest. Its own release,
its own tests.

### 9. Source & pin

`HistoricalChristianFaith/Commentaries-Database` re-keys the public-domain ANF/NPNF
(Schaff–Wace) translations to Scripture verses, with a per-author `metadata.toml` carrying
`default_year` (the author's death year). Add a pin (`pins.mjs`), keyed by **commit**,
never a branch:

```js
// pins.mjs (P1-10): patristic chain beyond the Gospels (§4.3 Phase 3).
// ANF/NPNF (Schaff–Wace), public domain by age, re-keyed to Scripture verses.
patristic: { repo: "HistoricalChristianFaith/Commentaries-Database", commit: "<PINNED-SHA>" }
```

### 10. The builder `scripts/build-patristic.mjs`

Mirrors `build-catena.mjs`'s structure (cache by pin, pure parser asserted by a fixture,
in-grid clamp/drop, manifest reseal at the end). It emits a **new corpus** alongside
`catena/` and `haydock/`:

```
public/data/commentary/patristic/{slug}.json
  { "1:1": [ { "father": "Augustine", "text": "…" }, … ], … }   # IDENTICAL shape to catena
```

Steps:
1. **Fetch & cache** the DB at the pinned commit (`.cache/patristic-<sha12>/…`).
2. **Parse** each author's verse-keyed excerpts into `{ slug: { "ch:v": [{father,text}] } }`.
   The `father` label is the source's author name — fed straight into the existing
   `normalizeFather` (so its noise tolerance and identity rules already apply; new author
   names extend `FATHERS[]`, §11).
3. **PD filter** (§10.3) — drop every excerpt that is not provably public domain.
4. **Versification remap** onto the bundle's Vulgate/Douay grid (§10.4).
5. **In-grid clamp/drop** exactly as `build-catena.mjs`: any key outside the DRC book's
   chapter/verse shape is dropped (with a logged sample), never emitted.
6. **Skip the Gospels** — they are the Catena's lane; the patristic corpus is the *rest*
   of the canon, so the two never double-cover a verse.
7. **`sortKeys`** + write per-book JSON, then `await writeManifest(ROOT)`.

#### 10.3 The three-gate public-domain filter (P2 — the load-bearing safety)

The DB intermixes some **still-copyright** excerpts under a fair-use notice. None may be
bundled. The build drops an excerpt unless it clears **all three** gates:

1. **Author age gate** — the author's `default_year` (death year) is **≤ `THIS_YEAR −
   96`** (comfortably past life-plus-70 and the US 95-year rule). An author with no death
   year, or a death year inside the window, is dropped wholesale.
2. **Edition gate** — the excerpt's source edition is an allowlisted PD translation
   (the ANF / NPNF series 1 & 2, Schaff–Wace, all pre-1900). Any excerpt whose `source`
   field is absent or not on the allowlist is dropped.
3. **Flag gate** — any excerpt carrying the DB's copyright / fair-use marker (the
   `copyright`/`fairuse` field or notice the survey identified) is dropped regardless of
   the first two gates.

The builder logs counts: kept, dropped-by-age, dropped-by-edition, dropped-by-flag. A
non-zero "kept with no edition" count is a **build error**, not a warning.

#### 10.4 Versification

The source is AV/KJV-versified; the bundle is Vulgate/Douay. Reuse the existing maps:
- **Psalms** (the big one): `build-haydock.mjs`'s `remapPsalmKey` via
  `hebrewSpanToVulgate` (the renumbered second-halves 115/147; the joined 9/113 already
  align). Import the same helper.
- **Other known offsets** (e.g. the Malachi / 3-4 Kings / Sirach boundaries): a small
  explicit per-book map in the spirit of `build-catena.mjs`'s `remapGospelKey`, asserted
  by incipit in the harness.
- Everything else: identity, then the in-grid clamp drops anything that still doesn't land.

### 11. Normaliser & year-table growth

The new corpus introduces author names the Gospel Catena never used (e.g. Tertullian,
Irenaeus, Ephrem, Theodoret, Caesarius of Arles). Each must either:
- gain a `FATHERS[]` entry (with `year`, aliases, `isDoctor`, `circa?`) — preferred for any
  author appearing more than a handful of times; or
- fall to the graceful `source` / undated bucket — acceptable only for genuinely minor or
  one-off sources.

The DB's `metadata.toml` `default_year` is the **seed** for each new Father's `year` (cross-
checked the way the Phase-1 table was). The §16 **corpus-wide guards already in the harness**
(`≥93% of entries resolve to a Father`; `the "source" fallback hides no real Father`) are
**re-run over the patristic corpus too** — so Phase 3 is not "done" until those bars hold
for the new books, which is the forcing function for the table growth.

### 12. Manifest, service worker, golden

- **Manifest:** `build-patristic.mjs` ends with `writeManifest(ROOT)`. The new files get
  SHA-256 entries + a `bundles.commentary` byte bump; the new `patristic` pin lands in
  `manifest.sources`. `npm run verify-data` and the harness re-walk it.
- **Service worker:** these are **new** files, not changed bytes of existing ones, so per
  the `pins.mjs` rule **no `DATA_CACHE` bump is required** (new files miss the cache and
  fetch fresh; `manifest.json` is network-first).
- **Golden snapshots:** **unaffected** — they pin the calendar + Mass-reading resolution,
  not commentary. State this in the PR so no one re-blesses needlessly.

### 13. Loading & gating (Phase 3 UI)

- The patristic book loads **lazily**, on first sheet-open, via
  `loadCommentary("patristic", book)` — the existing memoized loader already takes the
  corpus name and resolves a 404 to `{}`, so a book with no patristic file is silently
  empty. **No `data.ts` change.**
- **Action-bar gating:** today the Gospel action shows because Catena coverage is ~99% and
  assumed. Beyond the Gospels, patristic coverage is **sparse**, so we cannot assume.
  Add a static, code-level `PATRISTIC_BOOKS: ReadonlySet<string>` (the books Phase 3
  ships) and gate the action as
  `commentaryEnabled && ((commentaryHaydock && haydockHas(v)) || (commentaryCatena && (isGospel || PATRISTIC_BOOKS.has(book))))`.
  Coarse (book-level), matching the existing Gospel pattern; the sheet shows the real note
  or the honest "No commentary on this verse" empty state. In practice Haydock's
  whole-canon coverage already lights the action on almost every non-Gospel verse, so this
  set is a backstop for the rare Haydock-less verse.
- The `isGospel` check that currently gates the "Catena Aurea" credit becomes the
  switch between the two credit strings (§8); everything else in `CommentarySheet` is
  unchanged because the data shape is identical.

### 14 (Phase 3). Tests

- **New parser fixture** (`test-data.ts` §14-style): the patristic parser keys by
  `ch:verse`, decodes entities, and — critically — **drops a fixture excerpt that carries
  the copyright flag / a too-recent author / a non-allowlisted edition** while keeping a
  clean PD one. This is the regression guard for the §10.3 filter.
- **New data assertion** (§15-style): every patristic key lands on a real DRC coordinate
  (the in-grid invariant); the corpus covers the expected non-Gospel books and **excludes**
  the four Gospels (no double coverage); entries are `{ father, text }`.
- **PD-only proof:** assert **no** bundled excerpt's author has a death year inside the
  copyright window and **no** flagged excerpt survived — read straight from the built JSON.
- **Normaliser coverage** (§16): the new author labels resolve to Fathers (extend the
  top-N list and re-assert the ≥93% / no-leak corpus bars over `catena/` **and**
  `patristic/`), and every emitted `pseudo-*`/Father id has a non-null `yearOf` or is
  explicitly bucketed (the Phase-1 guard, now over the larger corpus).

---

## 15. Binding-rules compliance (all phases)

- **Never hand-edit `public/data/`.** Phase 1 writes nothing there. Phase 3 writes only via
  `build-patristic.mjs`; the manifest reseals automatically.
- **Two-accent rule.** Chips/tabs = purple (act); attribution labels, dates, source
  credit, the gold dot = gold (honor). No element wears both. The "c. NNN" date lives
  inside the existing gold `.cmt-attr` label.
- **§13 refusal list.** No accounts, no cloud, **no AI** — the chronological order is a
  hand-curated scholarly table and every comment is the source's verbatim PD text (no
  summary/paraphrase); no social, no streaks, no ads, no notifications, no red-letter.
- **Copyright.** Every phase is public domain by construction; Phase 3's three-gate filter
  + harness proof is the guarantee, mirroring the project's "copyrighted texts are never
  bundled" rule.
- **Tests/CI.** Each phase adds its own assertions; `lint → npm test → npm run build → npm
  run check-docs` stays green (this spec is linked from `docs/superpowers/INDEX.md` so the
  orphan check passes); golden years untouched.

## 16. Files touched, per phase

| Phase | File | Change |
|------|------|--------|
| 1 | `src/lib/commentary.ts` | `+ year`/`circa?` on `FatherDef`/`Father`; the §3.2 dates; `PSEUDO_YEARS`; `yearOf`/`circaOf`; `sortChronological` |
| 1 | `src/components/CommentarySheet.tsx` | `sortChronological` in the `useMemo` pipeline; date in `.cmt-attr`; the "Glossa & other sources" block divider |
| 1 | `src/styles.css` | the date label + block-divider styling (gold, no new accent) |
| 1 | `scripts/test-data.ts` | §16 additions (year coverage, sort, tie-break, lane, undated tail) |
| 2 | `src/components/CommentarySheet.tsx` | tab label "Catena Aurea" → "Church Fathers"; per-book credit string |
| 2 | `src/pages/Settings.tsx` | reword the `commentaryCatena` sub-label |
| 3 | `scripts/pins.mjs` | `+ patristic` pin |
| 3 | `scripts/build-patristic.mjs` | **new** — parser, three-gate PD filter, versification remap, manifest reseal |
| 3 | `src/lib/commentary.ts` | `+ PATRISTIC_BOOKS`; new `FATHERS[]` entries + years for the beyond-Gospels authors |
| 3 | `src/pages/Reader.tsx` | action-bar gating `|| PATRISTIC_BOOKS.has(book)`; Gospel/non-Gospel credit switch |
| 3 | `public/data/commentary/patristic/*.json`, `public/data/manifest.json` | **generated** by the builder — never hand-edited |
| 3 | `scripts/test-data.ts` | new parser fixture + PD-filter proof + §15/§16 coverage over `patristic/` |
| all | `CHANGELOG.md`, `package.json`, `CLAUDE.md`, `docs/superpowers/INDEX.md` | version bump, ledger line, index link |

## 17. Known limitations / deferred

- **`maximus` (Turin 465 vs. Confessor 662)** is the single highest-risk date — a ~200-year
  swing on 54 blocks. The default is Turin; the editor should spot-check the actual Catena
  passages before Phase 1 ships. (Lower-risk flags: `theodotus`, `gennadius`, `severianus`,
  `anselm`, the pseudonymous composition dates — all noted `circa`.)
- **Phase-3 PD edge cases** — an author who is PD by age but whose *specific translation*
  is still in copyright is caught by the edition gate, but the DB's edition metadata must
  be confirmed complete before the first real build; an excerpt with no edition field is
  treated as a build error (§10.3), not silently kept.
- **Per-Father *era* filter chips** (a "by century" filter) — still out of scope; the
  chronological order makes era visible without adding a control.
- **In-app PDF/EPUB ingestion of commentary** — not a path; all phases are git-pinned
  upstream sources built on the Mac, consistent with the rest of the data pipeline.
