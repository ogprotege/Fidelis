# FIDELIS — COMMENTARY SOURCES SURVEY

*For: maintainers understanding the commentary data sources and vetting decisions.*  · [← Docs index](../INDEX.md)

**Subject:** Public-domain digitizations of (a) the **Haydock** annotated Douay-Rheims
commentary and (b) the **Catena Aurea** of St. Thomas Aquinas (Newman/Oxford English
translation, 1841–1845), as candidate data sources for the **v1.5 "Formation"** commentary
layer (Feature Design Spec §4).
**Date:** June 14, 2026
**Author:** Claude, for Wilson Warren
**Companion documents:** `docs/review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md` §4
(the commentary layer); `docs/review/Fidelis_Code_Review_V1_2026-06-11.md` P1-10 (the
source-pinning + manifest discipline this survey is held to).

> **Status: research only.** No data has been downloaded into the repository and no code
> has changed. This document is a decision aid for the brainstorming/spec phase of v1.5.
> Final license confirmation for any chosen source remains a human responsibility before
> ingestion (see §6).

---

## 0. WHAT §4 AND P1-10 REQUIRE OF A SOURCE

From spec §4 and the existing pipeline discipline, a usable source must be:

1. **Verse-keyed**, or mechanically convertible to per-verse keys — the target is
   `public/data/commentary/<source>/<book>.json` shaped `{ "3:16": [ { … } ] }`. Running
   prose and raw page-scans cost a transcription/segmentation project; structured markup
   (USFM, OSIS, ThML) does not.
2. **Pinnable by commit hash, or by stable URL + checksum** (P1-10). A live CMS that can
   re-render silently is the moving target P1-10 exists to forbid. The existing
   `scripts/pins.mjs` pins `{repo, commit}` SHAs (scrollmapper, jayarathina) and caches by
   pin; a git source slots directly into that mechanism.
3. **Coverage:** for Haydock, whole-Bible **including the deuterocanon** (the Catholic
   front-door); for the Catena, **all four Gospels** is sufficient and acceptable per §4.1
   ("Gospels only, and that is fine").
4. **License-clean for redistribution in an offline, potentially commercial app.** The
   underlying 1811–1859 Haydock notes and 1841–1845 Newman Catena are public domain by age;
   the live risk is a **modern transcription/markup copyright** asserted over a specific
   digital edition (the "transcription-copyright trap," §6).

---

## 1. METHOD AND ITS LIMITS

The landscape was swept by a 71-agent workflow: a multi-modal discovery pass (GitHub/SWORD,
transcription websites, archive scans/CCEL, per text), then a per-candidate evaluation that
**fetched** each source and inspected the named sample chapters, then an **adversarial
verification** pass that independently re-checked each source's license, pinnability, and one
sample-quality claim. 43 raw candidates reduced to **31 unique** (14 Haydock, 17 Catena).
Sample chapters per the brief: **Genesis 1, Psalm 50 (the Miserere, Douay/Vulgate numbering),
John 3** for Haydock; **Matthew 5 (the Beatitudes)** for the Catena.

**Honest limits of this survey:**

- A few sources **could not be fetched** from the tooling (StudyLight and BibleSupport return
  403 / refuse connections; HathiTrust's page-images aren't text-retrievable). Where a source
  is marked *not directly retrieved*, its quality was inferred from byte-identical mirrors and
  is flagged as such — not asserted.
- **Source independence is overstated by raw count.** The 14 Haydock entries collapse to
  **~2 transcription lineages** (the "1859 Dunigan / Todd Easton" web lineage, and the
  "1883 Dunigan / USFM" lineage) plus page-scans; the 17 Catena entries collapse to **~2
  translation lineages** (the single Oxford "Library of the Fathers" English rendering, now
  re-expressed as OSIS and as CCEL ThML) plus the original Oxford page-scans. "Two sources
  that agree" is weak evidence when both descend from the same OCR — genuine cross-checks must
  pair a transcription against an independent **page-scan**.
- License is the **softest axis** everywhere and the one most prone to change; §6 lists the
  traps and §7 the human confirmation step.

---

## 2. HEADLINE RECOMMENDATIONS

| Text | Recommended source | Form | Pinning | License basis |
|---|---|---|---|---|
| **Haydock** | **`cmahte/ENG-B-Haydock1883-pd-PSFM`** (GitHub) | USFM/PSFM, verse-keyed | git commit `0332c84` (+ per-file blob SHA-256) | PD by age (no competing transcriber claim) |
| **Catena Aurea** | **`Isidore-Guild/catena`** (GitHub OSIS `catena.xml`) | OSIS XML, verse-keyed, 4 Gospels | git commit `aebb0f6` (+ file SHA-256) | **CC0-1.0** in repo + PD by age |

Two caveats ride on the Haydock pick and are the **one product decision** this survey hands
back to you:

- **Edition: 1883, not 1859.** The cleanest, most pinnable, structurally-keyed Haydock is the
  **1883** Dunigan printing (USFM). The **1859** edition you named survives best as the
  git-pinnable but HTML-scrape-only **`johnblood/haydock`** GitLab repo. The two are different
  printings of the same Haydock corpus; notes were revised between printings. If facsimile
  fidelity to **1859 specifically** is a requirement, the recommendation flips to johnblood
  (§3.4). If "the best-engineered Haydock" is the goal, cmahte 1883 wins decisively (§3.3).
- The cmahte transcription is **lightly normalized** (expanded abbreviations, Greek
  transliterated to Latin letters with accents dropped) — fine for display, **not** a
  byte-faithful facsimile. About must say so rather than claim "verified against page scans."

For the Catena, the recommendation is firm and low-regret: an OSIS edition pinned by commit
beats every alternative on the top-weighted axis (pinnability) while matching the cleanest
alternative (CCEL) on transcription quality. A near-equal second OSIS repo (`lemtom/catena`,
the CrossWire SWORD module source) exists as a fallback (§4.3).

---

## 3. PART A — HAYDOCK

### 3.1 The landscape, honestly

Every web Haydock traces to **one of two transcription lineages**, plus independent
page-scans:

- **Lineage I — "1859 Dunigan / Todd Easton" (HTML, verse-keyed by `Ver. N`).** The Todd
  Easton transcription of the 1859 Dunigan printing, distributed via BibleSupport and
  re-hosted on **johnblood.gitlab.io**, **ecatholic2000**, **haydockcommentary.com**,
  **StudyLight (hcc)**, **BibleHub**, and an **e-Sword** module. This is the **1859** edition
  the brief names. Clean transcription; murky license (no source in the chain states an
  affirmative PD/CC grant — see §6).
- **Lineage II — "1883 Dunigan / USFM" (`cmahte/ENG-B-Haydock1883-pd-PSFM`).** An independent
  transcription of the **1883** printing into USFM, with explicit `\fr CH:VERSE` keys. Single
  GitHub repo, whole-Bible incl. deuterocanon, structurally the cleanest.
- **Page-scans (Internet Archive, HathiTrust):** several full-Bible Haydock scans; OCR only,
  high parse risk; valuable as the **independent verification witness** against either
  transcription, not as a build base.

### 3.2 Candidate matrix (Haydock)

Quality columns are the three sample chapters: **Gen 1 / Ps 50 (Miserere) / John 3.**

| Source | Lineage / edition | Format & structure | Coverage | Gen1 / Ps50 / Jn3 | License | Pinnable? |
|---|---|---|---|---|---|---|
| **cmahte/ENG-B-Haydock1883-pd-PSFM** (GitHub) | II — **1883** | USFM, **verse-keyed** | Whole Bible **+ deuterocanon**, 27-bk NT | clean / clean / clean | PD by age; **no LICENSE file** | **✓ git commit + blob SHA** |
| **johnblood/haydock** (GitLab + Pages) | I — **1859** | HTML, verse-keyed (`Ver. N`), opaque `idNNN.html` | Whole Bible **+ deuterocanon** | clean / clean / clean | **No license stated** (transcriber) | **✓ git commit** (scrape repo, not Pages) |
| **TheHaydockBible** (IA, 73 EPUB) | scan-derived text | EPUB, verse-keyed (`Ver. N`) | Whole Bible **+ deuterocanon** | clean / clean / clean | PD (age); IA item, no rights field | URL + checksum |
| **ecatholic2000** | I — 1859 | HTML `.shtml`, verse-keyed | Whole Bible + deuterocanon | clean / clean / clean | **"Wildfire Fellowship… all rights reserved"** | URL + checksum (CMS) |
| **haydockcommentary.com** | I — 1859 | HTML `/book-ch`, verse-keyed | Whole Bible + deuterocanon | clean / clean / clean | unclear (live site); a GitLab repo exists | unstable (site); repo pinnable |
| **StudyLight (hcc)** | I — 1859 | CMS HTML | Whole Bible (per index) | *not fetched* (403) → clean/minor/minor on mirrors | **site copyright + ToS** | **✗ unstable, bot-blocked** |
| **BibleHub (haydock)** | I — 1859 | CMS HTML | **Protestant 66-bk — NO deuterocanon (fatal)** | clean / clean / clean | "Used by Permission" (BibleSupport) | unstable |
| **e-Sword "Haydock v0.2"** (BibleSupport) | I — 1859 | `.exe`→`.cmti` SQLite | unverified (v0.2 WIP) | *not fetched* → minor on mirrors | **permission-only**, "Used by Permission" | **✗ none** (binary, host down) |
| **IA: douay-rheims…haydock-commentary-complete** | page-scan | JP2 + Tesseract OCR | Whole Bible + deuterocanon (likely **abridged**, 1,795 lvs) | minor-ocr ×3 | unclear (IA, no rights field) | URL + checksum |
| **IA: haydocks-bible** (Hall Family Bible) | page-scan | djvu.txt / hOCR | Whole Bible + deuterocanon | clean / minor / minor-ocr | PD (age) | URL + checksum |
| **IA: haydock-catholic-bible-comment…3948** | page-scan | OCR (~3,545 pp folio) | Whole Bible + deuterocanon | clean / partial / clean | PD (age) | URL + checksum |
| **HathiTrust nyp.33433017068051** | page-scan | page-images | Whole Bible | **heavy-ocr ×3** | PD (age) | URL (no text layer) |
| **catholicbible.online** (Baronius) | — | — | **NON-MATCH** (Challoner notes, not Haydock) | n/a | restrictive | n/a |
| **drbo.org** | — | — | **NON-MATCH** (Challoner footnotes, not Haydock) | n/a | "all rights reserved" | n/a |

### 3.3 Recommended: `cmahte/ENG-B-Haydock1883-pd-PSFM`

**Why it wins.** It is the only Haydock source that is simultaneously (a) **commit-pinnable
with reproducible per-file SHA-256** — verified live: repo HEAD
`0332c84aedf35638a0d87b0185cc01eb14a65492` (default branch **`master`**, 3 commits, last push
2022, effectively frozen), with recomputed SHA-256 Genesis
`c0c52a25…`, Psalms `816fe45f…`, John `c19c7eed…`, front-matter `87df19ee…`; (b) **genuinely
verse-keyed** — every note is `\f … \fr CH:VERSE \ft … \f*`, no prose-to-verse re-association
heuristics (410 notes in John, 788 in Genesis, 2,060 in Psalms); (c) **whole-Bible incl. the
full deuterocanon** (Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees), 76 files; (d)
**clean** transcription with intact commentator attributions (Haydock / Calmet / Worthington /
Witham, `---`-separated). All three sample chapters verified present and clean; Gen 1:1 was
re-confirmed verbatim in-repo by the adversarial pass; **Ps 50 sits at the correct Douay
number** with the Miserere title at v1–2 and "Have mercy" at v3 (matches our Vulgate grid).

**The honest weaknesses** (all manageable, none disqualifying):

- **Edition is 1883, not 1859** (§3.4) — a real divergence to decide, not paper over.
- **License is PD-by-age only.** There is **no `LICENSE` file, no SPDX, no PD dedication** —
  GitHub's license API returns `null`. The `-pd-`/`[pd]` slug is the transcriber's BibleCorps
  naming convention, *not* a legal grant; the only "Copyright, 1884" string is the historical
  print copyright, and the transcriber asserts nothing modern. Defensible for an 1883 work
  whose author died 1849, but About must **state the basis (age)** rather than imply a license.
- **Lightly normalized, not facsimile** (abbreviations expanded, Greek transliterated) — say so.
- **Back-matter glitch:** file `77-BAK` is tagged `CPDV2009`/`\id OTH`, not `DRC1750` — exclude
  or separately label it so the manifest/About don't mis-attribute it.
- Single maintainer / single repo — mitigated exactly by pinning the commit and committing the
  generated JSON (we become our own mirror).

### 3.4 The 1859-vs-1883 decision (your call)

If **1859 fidelity is required**, the build base becomes **`johnblood/haydock`**
(`gitlab.com/johnblood/haydock`, commit `184c10385ba90f7127fc1c0ec69b93656db1fdb0`, branch
`master`). It was fully retrieved and **verified**: whole-Bible incl. deuterocanon, clean on
all three samples, **correct Douay Psalm numbering** ("Psalm l. (Miserere.)"), and — crucially
— **pinnable to a git commit** (build against the repo's `public/idNNN.html` at the SHA, *not*
the mutable Pages site). Its costs relative to cmahte:

- **HTML scrape with opaque filenames.** Pages are `idNNN.html` with no book/chapter in the
  URL; you must scrape the OT/NT table-of-contents pages to build an `id → (book, chapter)`
  map before parsing — the main parse cost.
- **Legacy `iso-8859-1`** markup → entity/encoding normalization; verse text and notes share a
  page and must be split.
- **License is *more* ambiguous, not less:** no license file and **no terms statement at all**
  — so also **no affirmative reuse grant**. Reuse rests purely on the 1859 source being
  PD-by-age. (Avoid the other 1859 mirrors as a base: ecatholic2000 asserts "all rights
  reserved," StudyLight/BibleHub carry "Used by Permission," and **BibleHub drops the
  deuterocanon entirely** — a fatal Catholic-canon gap.)

**Recommendation:** lead with **cmahte 1883 USFM** for the engineering and pinning advantages,
record the edition explicitly in About and `data-report`, and keep **johnblood 1859** as the
**independent cross-check witness** for spot-verification. Choose johnblood as the base *only*
if you specifically want the 1859 text shipped. Either way, **pin one edition and name it.**

### 3.5 Haydock cleanup, itemized

For the **cmahte 1883 USFM** path:

1. **SFM footnote tokenizer**, split each `\f … \f*` on its `\fr CH:VERSE` key. **Tolerate
   both spacings** — Genesis emits `\fr 1:1 \ft` (space), John/Psalms emit `\fr 3:5\ft` (no
   space). A naive splitter silently drops half the notes on whichever form it didn't expect.
2. **Chapter-0 sentinels:** book-intro notes are keyed `\fr 0:0`, chapter-intro `\fr 0:N`.
   Bucket them as book/chapter-level intro notes — do **not** key them onto a real verse 0.
3. **Verse-range refs:** notes key to spans like `\fr 1:8-9`. Pick an attachment policy
   (first-verse vs every-verse-in-range) and apply it consistently; handle the indefinite
   "Ver. 2-5." / "etc." style. **JSON value must be an ordered list per verse-key**, since two
   notes can land on one verse.
4. **Strip inline scripture markup** (cross-ref `*`, nested `\fqa`) from verse text before
   storing; the DRC body is otherwise clean.
5. **Book-code map:** eBible 3-letter codes (`GEN`, `PSA`, `JHN`, `SIR`…) → `canon.ts` slugs;
   filename slots **47 and 63 are intentionally skipped** (no missing books) — a naive
   "gap = missing" check would false-alarm.
6. **Exclude/relabel `77-BAK`** (CPDV2009/`\id OTH`) so the DRC bundle isn't mis-tagged.
7. **Deuterocanon versification:** align keys to our existing **Clementine/Vulgate** grid (not
   a Hebrew/modern grid). Psalm numbering is already Vulgate-native — assert it.
8. **Disclosure:** note in About that the transcription is *normalized, not facsimile*.
9. **Spot-verify** a handful of notes (Gen 1:1, Ps 50:3, John 3:5) against an 1859/1883 **page
   scan** (use one of the IA items in §3.2) and record the result; confirm the 1883-vs-1859
   difference is immaterial for the shipped notes.
10. **OCR fixes: none** — this is machine-parseable SFM, not a scan. (The decisive advantage
    over the HTML/scan alternatives.)

For the **johnblood 1859** path, replace items 1–6 with: build the `id → book/chapter` index
from the TOC pages; per-page `Ver. N` regex; `iso-8859-1` entity normalization; verse-text vs
note separation. Items 7–9 still apply; OCR fixes remain unnecessary (it is a transcription,
not a scan).

### 3.6 Haydock pinning plan (P1-10)

1. Add to `scripts/pins.mjs`: `haydock: { repo: "cmahte/ENG-B-Haydock1883-pd-PSFM", commit:
   "0332c84aedf35638a0d87b0185cc01eb14a65492" }` — pin the **commit**, never `master`.
2. New `scripts/build-commentary.mjs` (sibling to `build-data.mjs`) fetches each `.sfm` raw at
   the pinned commit (`raw.githubusercontent.com/…/<COMMIT>/<file>`), **caches keyed by the
   commit SHA** (same stale-cache guard as `build-data.mjs`), tokenizes to per-book verse-keyed
   JSON under `public/data/commentary/haydock/<book>.json`, and excludes/relabels `77-BAK`.
3. **Reproduce byte-for-byte before trusting the pin** (the P1-10 ritual): re-fetch at
   `0332c84`, confirm the recorded source SHA-256s match; record per-source SHA-256 in a
   sources block.
4. `npm run manifest` → `build-manifest.mjs` walks `public/data/commentary/haydock/`, seals a
   SHA-256 per generated file + a new `haydock` bundle (real sizes for the Settings offline
   download) + root hash. `npm run verify-data` and the independent hash-walk in
   `test-data.ts` must pass; add assertions (e.g. John has 410 notes; Ps 50:3 note present;
   deuterocanon non-empty), mirroring §11–§13.
5. Bump `DATA_CACHE` in `public/sw.js` so installed PWAs refetch; CHANGELOG + `package.json`
   bump together; surface "commentary verified, source pin cmahte@0332c84" in About.

---

## 4. PART B — CATENA AUREA

### 4.1 The landscape, honestly

The English Catena Aurea is **one translation** — the Oxford "Library of the Fathers" rendering
(J. H. Parker / Rivington, 1841–1845, under Newman's editorship). It survives today in three
expressions, all PD by age:

- **OSIS XML (born-digital, verse-keyed):** `Isidore-Guild/catena` and `lemtom/catena` (the
  CrossWire SWORD module source). **Git-pinnable, all four Gospels, structurally tagged Father
  attributions.** The strongest fit.
- **CCEL ThML and web mirrors:** clean text, but CCEL **claims copyright on its transcription**,
  splits the Gospels across separate works (Matthew = `catena1`, Mark = `catena2`, …), and is
  not git-pinnable. Use as a **cross-check witness**, never as a shipped artifact.
- **Oxford 1841–1845 page-scans (Internet Archive):** the **independent PD witness** for
  spot-verifying the error-prone Father attributions; OCR only, split across 6+ volume items,
  high parse risk.

### 4.2 Candidate matrix (Catena)

Quality column is the sample chapter **Matthew 5 (the Beatitudes).**

| Source | Form & structure | Coverage | Matt 5 quality | License | Pinnable? |
|---|---|---|---|---|---|
| **Isidore-Guild/catena** (GitHub OSIS) | OSIS `catena.xml`, **verse-keyed** (`annotateRef`/`osisID`), tagged Fathers | **All 4 Gospels** in one file | clean | **CC0-1.0 + PD** | **✓ commit `aebb0f6`, file SHA-256** |
| **lemtom/catena** (CrossWire SWORD source) | OSIS, verse-keyed, 821 sections | **All 4 Gospels** | clean | **PD** (`catena.conf` Public Domain) | **✓ git commit** |
| **CCEL — catena1…** | ThML XML, verse-keyed (`scripCom`/`scripRef`) | **Matthew only per URL** (Mark/Luke/John separate works) | clean | **CCEL transcription copyright; non-profit default** | ✗ CMS, no commit |
| **Catholic Primer / SaintsBooks PDFs** | PDF, 1 per Gospel, extractable | All 4 Gospels | clean | site copyright wrapper | URL + checksum |
| **ecatholic2000 (catena)** | HTML `.shtml`, verse-keyed | All 4 Gospels | clean | **"Wildfire Fellowship… all rights reserved"** | URL + checksum (CMS) |
| **aquinas.cc** | HTML, verse-keyed (wrong URL in candidate) | All 4 Gospels | clean | "© Aquinas Institute" engine | unstable |
| **HistoricalChristianFaith/Commentaries-Database** | TOML per author/verse | **NOT the Catena** — patristic+modern DB (incl. in-copyright authors) | clean | **NOASSERTION / fair-use notice** | git commit |
| **IA Oxford 1841–45 scans** (Vol I Matt pt I/II/III; Vol II Mark; Vol III Luke pt I/II; Vol IV John; "New Edition" reissue; combined set) | OCR (djvu/hOCR) | one Gospel/part **per item**; full set across 6+ items | minor→heavy-ocr | PD (age) | URL + checksum |

### 4.3 Recommended: `Isidore-Guild/catena` (OSIS), with `lemtom/catena` as equal fallback

**Why OSIS-via-GitHub wins on every weighted axis.**

- **Pinnability (top weight) — decisive.** `Isidore-Guild/catena` is a real git repo:
  HEAD `aebb0f6b2b313fd3732dab9b7f28714fbe967f40` (branch `master`, 2021-01-02), a single
  self-contained `catena.xml` verified at **6,648,505 bytes, SHA-256 `b5de1fbb…`**. It slots
  straight into `pins.mjs` `{repo, commit}`. CCEL, by contrast, has **no repo, no commit, no
  content hash** — a CMS that can recase/reformat silently; pinnable only by self-checksumming
  bytes you capture, which is exactly the moving target P1-10 forbids.
- **Coverage — outright.** All four Gospels complete in one file (Matt 28 / Mark 16 / Luke 24 /
  John 21). CCEL is Matthew-only per URL; matching four Gospels there means 3–4 separate
  works, each separately checksummed.
- **Structure — materially better.** Each block is
  `<div annotateRef="Matt.5.1-Matt.5.3" annotateType="commentary">` with an inner
  `<p osisID="Matt.5.1 Matt.5.2 Matt.5.3">`, and Father attributions are **structurally tagged**
  (`<hi type="bold">Pseudo-Chrysostom:</hi>`), not bare inline prose (CCEL leaves attribution
  splitting to regex/heuristic).
- **License — genuinely clean.** `catena.conf` declares `DistributionLicense: Public Domain`;
  the repo ships a **CC0-1.0** `LICENSE`; the single freshly-authored part (the John preface,
  missing from source copies) is explicitly released CC0 by the contributor. Safe to
  redistribute in an offline/commercial app. CCEL explicitly claims copyright on its
  transcription and defaults to non-profit/educational use.
- **Quality — a tie with CCEL** (both descend from the Oxford translation; isidore is in part
  compiled from the CCEL rawtext, then OSIS-tagged). Matt 5:1–3 retrieved verbatim, clean
  punctuation, intact source-citations ("Aug., de Cons. Evan., ii, 19:").

**`lemtom/catena`** is the equal-grade fallback: the **CrossWire SWORD "Catena" module** OSIS
source, verified complete on all four Gospels (821 verse-keyed sections, every chapter present),
`catena.conf` declares Public Domain, git-pinnable, verification clean with no corrections. The
two are OSIS expressions of the same translation; **`Isidore-Guild` is preferred** only because
its license story is the cleanest on record (explicit CC0 file + CC0 dedication on the one new
block) and its single-file `catena.xml` was checksum-verified in this survey. Confirm which of
the two is the cleaner upstream at ingestion time and pin that one.

**Runner-up as a witness only:** **CCEL** (`catena1` etc.) — very clean Oxford text, useful to
**spot-verify isidore's Matthew**, but do **not** redistribute its ThML markup; re-derive only
the PD text, and correct CCEL's mistaken "William Whiston, 1842" translator label.

### 4.4 Catena cleanup, itemized (OSIS path)

1. **Range keying (structural, required):** `osisID` is a **space-separated token list**
   (`"Matt.1.3 Matt.1.4 Matt.1.5 Matt.1.6!a"`), not a single verse. Key by **verse-range/span**,
   using the block-level `annotateRef="Matt.5.1-Matt.5.3"` as the canonical range and
   reconciling it against the inner `osisID` list. JSON value must be an **ordered list** of
   comment blocks per verse (two blocks can map to one verse).
2. **Sub-verse milestones:** handle the `!a`/`!b` suffixes (`Matt.1.6!a`). Fidelis's grid is
   whole-verse → fold up to the verse, but that makes the per-verse list ordering matter.
3. **Malformed tokens:** **19 tokens** carry a stray space (`"Matt. 1.7"`). Normalize
   `"Book. N.N" → "Book.N.N"` before tokenizing, and add a harness assertion that every token
   matches `/^[A-Za-z]+\.[0-9]+\.[0-9]+(![ab])?$/` (catches new ones on any re-pin). A strict
   parser silently drops these and loses those verses' comments.
4. **Separate the embedded Gospel lemma from commentary.** Each block opens with the Gospel
   verse text as `<p><hi type="italic">Ver. 1. And seeing the multitudes…</hi></p>`. Split it
   off and **drop it** — it is the Oxford rendering and must **never** be substituted into the
   Reader grid, which already serves pinned DRB/CPDV/Vulgate. Store it at most as a block heading.
5. **Attribution normalization:** the tagged label conflates Father + work-citation
   (`"Aug., de Cons. Evan., ii, 19:"`). Split into `{ father, sourceCitation }` on the first
   colon/comma; build a controlled Father vocabulary (Aug., Chrys., Pseudo-Chrys., Jerome,
   Hilary, Remig., Gloss…) and reconcile abbreviation variants. The **Doctors-only filter** of
   §4.2 keys off this normalized `father`; cross-reference against the Doctors already marked in
   `quotes.json` (`authorTitle` contains "Doctor").
6. **Attribution accuracy (worship-adjacent):** catenae are historically prone to misattribution
   (`Pseudo-` prefixes). Spot-verify a sample — at least the Beatitudes, the Johannine prologue,
   and several `Pseudo-` attributions — against the **Oxford 1841/1842 page-scans** on IA (§4.2).
7. **John-preface provenance:** flag the CC0 editor-supplied preface as distinct provenance, not
   as original 1842 Oxford text.
8. **Entity/encoding pass:** decode XML entities (`&amp;`, `&c.`) to clean UTF-8; assert no raw
   `&`/stray entity survives into JSON.
9. **Provenance copy for About:** "Catena Aurea of St. Thomas Aquinas, Oxford *Library of the
   Fathers* translation (Rivington, 1842), public domain, via the CC0 OSIS edition." Document
   the layer is **Gospels-only** (no OT/deuterocanon/Acts/Epistles/Apocalypse).
10. **Cross-check harness:** assert, per Gospel, that fixed verse-keys carry the expected Father
    attributions + a known snippet, so a silent re-pin drop turns the harness red.

### 4.5 Catena pinning plan (P1-10)

`pins.mjs`: `catena: { repo: "Isidore-Guild/catena", commit:
"aebb0f6b2b313fd3732dab9b7f28714fbe967f40" }`. Fetch `catena.xml` **at the commit** (not
`master`), **hard-fail** on any mismatch against the captured size/SHA-256
(`6,648,505` / `b5de1fbb…`), **vendor** the raw `catena.xml@aebb0f6` (committed or
release-archived, cache-keyed by commit) so builds survive GitHub being down, run the
deterministic OSIS→JSON pipeline to `public/data/commentary/catena/<gospel>.json`, re-seal the
manifest, record the pin in the sources block + About, bump `DATA_CACHE`, and add the
`test-data.ts` assertions. Update only by deliberate commit bump + word-by-word diff review.

---

## 5. CROSS-CUTTING CAVEATS

- **Transcription-copyright trap.** The texts are PD; specific transcriptions/markup may not be.
  **Do not** scrape **StudyLight**, **BibleHub**, **ecatholic2000** ("all rights reserved"), or
  redistribute **CCEL** ThML as a source of truth — pull from a PD/CC0-declared transcription
  (Isidore-Guild CC0 for Catena) or directly from scanned originals.
- **OCR unreliability.** Every page-scan/PDF (IA, HathiTrust, the documentacatholicaomnia/
  ntslibrary PDFs in §8) corrupts exactly the part that matters: drop-caps, headers, and the
  **Father-attribution rubrics** ("CHRYS.", "AUG.") that are the whole point of a catena. Scans
  are a verification witness, not a build base.
- **Versification.** Haydock follows **Douay/Vulgate** numbering — it lines up with our grid
  (Ps 50 = the Miserere, confirmed). The Catena is **Gospels-only**, so Hebrew/AV psalm-numbering
  never bites; Gospel chapter/verse numbering agrees across DRB/AV.
- **DRC corpus defects may orphan notes.** Our three known DRC printed-defect slots (3 Kings
  17:11, Prov 30:19, Bar 6:7 — see `data-report.txt`) could leave a Haydock note with no verse
  to attach to. The build must tolerate a note whose target verse is empty in our grid.
- **Source independence is ~½ the raw count** (§1). Treat the OSIS/CCEL Catena as *one* witness
  and the Oxford scans as the independent one; treat the johnblood-lineage Haydock as *one*
  witness and the IA scans as the independent one.

---

## 6. LICENSE — WHAT STILL NEEDS A HUMAN

Underlying texts are unambiguously PD by age (Haydock d. 1849; Newman/Parker Catena
1841–1845). The remaining confirmations, to be done before ingestion:

- **Catena → `Isidore-Guild/catena`:** confirm the repo's **CC0-1.0** `LICENSE` and
  `catena.conf` `Public Domain` line are present at the pinned commit (this survey saw them) —
  this is the **clean** case.
- **Haydock → `cmahte`:** accept **PD-by-age** as the basis and **state it explicitly** in
  About (there is no license file to cite). If an explicit grant is wanted, none exists in this
  lineage; the johnblood 1859 repo is no better licensed (no statement at all).
- **Avoid** the "Used by Permission" (BibleSupport/BibleHub/StudyLight) and "all rights
  reserved" (ecatholic2000, drbo) wrappers as *sources*; their underlying text is PD but the
  served editions carry claims.

---

## 7. PINNING SUMMARY (both texts)

| | Haydock (cmahte 1883) | Catena (Isidore-Guild) |
|---|---|---|
| `pins.mjs` entry | `cmahte/ENG-B-Haydock1883-pd-PSFM @ 0332c84` | `Isidore-Guild/catena @ aebb0f6` |
| Fetch | per-book `.sfm` raw at commit | single `catena.xml` at commit (size/SHA hard-checked) |
| Build script | `build-commentary.mjs` (SFM→JSON) | OSIS→JSON in same script |
| Output | `public/data/commentary/haydock/<book>.json` | `public/data/commentary/catena/<gospel>.json` |
| Manifest | new `haydock` bundle, sealed by `build-manifest.mjs` | new `catena` bundle, sealed |
| Harness | `test-data.ts` note-count + sample assertions | per-Gospel attribution + snippet assertions |
| Cache | bump `DATA_CACHE` in `sw.js` | same bump |
| About | "commentary verified, pin cmahte@0332c84" + edition/normalization note | "Oxford 1842, PD/CC0, pin Isidore-Guild@aebb0f6, Gospels-only" |

---

## 8. SOURCES CONSIDERED BUT NOT FULLY EVALUATED (gaps)

Flagged by the completeness-critic pass; worth a look before final ingestion, but none displaces
the two recommendations:

- **`lemtom/catena`** — the CrossWire SWORD "Catena" OSIS source; **evaluated and strong**
  (§4.3), the named fallback. Confirm whether it or `Isidore-Guild` is the cleaner upstream.
- **documentacatholicaomnia.eu** — full **English PDFs** of the Catena on all four Gospels
  **plus the Latin Opera Omnia** (lets you sanity-check translation drift). Confirmed live; PDF
  OCR parse risk. A good *Latin cross-reference*, not a build base.
- **Wikisource (en + de)** — **not probed**; a proofread Wikisource transcription would carry an
  explicit CC license and cleaner provenance than CCEL scraping. Check directly.
- **No confirmed Haydock SWORD module.** The Catena is packaged for SWORD; Haydock appears not to
  be in the official CrossWire repo (only the e-Sword `.cmti` and web mirrors). Stated as
  *checked, not found.*
- **STEPBible / Tyndale House open data** — checked, **not confirmed** to ship either text;
  its CC-BY licensing would have been the ideal carrier, so its apparent absence is itself a
  finding.
- **HistoricalChristianFaith/Commentaries-Database** — a per-verse **patristic** TOML database
  (69k files), **not** the Newman Catena, and it mixes in **in-copyright** modern authors
  (NOASSERTION license). Interesting for a *future* "Fathers on this verse" feature; **not** a
  Catena Aurea source.
- **sermonindex / ntslibrary** — additional Haydock(1859)/Catena(Matthew) mirrors; same lineages
  already covered, useful only as extra cross-check copies.

---

## 9. OPEN QUESTIONS FOR THE SPEC PHASE

1. **Haydock edition:** ship **1883 (cmahte USFM, best-engineered)** or **1859 (johnblood,
   the named edition, HTML-scrape)**? — §3.4. *Recommendation: 1883, with 1859 as the
   cross-check witness, unless 1859 fidelity is a hard requirement.*
2. **Bundle size & offline:** both layers are lazy-loaded and service-worker cached; confirm
   whether the **Haydock whole-Bible** bundle (large) ships in the iOS app bundle or downloads
   on demand (§4.1 of the spec estimates 8–15 MB total and calls bundling acceptable).
3. **Scope sequencing for v1.5:** Haydock and the Catena are independent data pipelines and the
   §5 CCC index is a third. Confirm whether v1.5 ships all three together or stages them
   (this survey covers only the two commentary corpora; the CCC index is a separate compilation).
4. **Attribution depth:** ship the Catena's Father labels as-is, or invest in the normalized
   `{father, sourceCitation}` split needed for the §4.2 **Doctors-only** filter at launch?

*Veritas in fontibus — the truth is in the sources, and the sources are now named.*

---
[← Docs index](../INDEX.md) · Related: [feature design spec](Fidelis_Feature_Design_Spec_V1_2026-06-11.md) · [code review](Fidelis_Code_Review_V1_2026-06-11.md)
