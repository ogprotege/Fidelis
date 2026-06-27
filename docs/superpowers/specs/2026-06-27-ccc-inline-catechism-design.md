# §5 (continued) — The Inline Catechism Sheet (Trent bundled · CCC importable)

[← Docs index](../../INDEX.md)

**Date:** 2026-06-27
**Spec section:** Feature Design Spec §5 (Scripture-to-Magisterium links) — the *text*
tier the v1.9.0 index layer deliberately deferred
**Branch:** TBD (proposed: `v1.14-inline-catechism`)
**Status:** 🟡 **Design — decisions proposed, awaiting sign-off.** Builds on the shipped §5
citation index (v1.9.0, "the deposit"). No code yet.

The v1.9.0 §5 layer taught a verse to say *where the Catechism reads it* — a quiet purple
row **Catechism ¶219 · ¶444 · ¶458** in the verse action bar, each number a link **out** to
vatican.va. That was the honest limit of what we could ship: the *index* is fact and may be
bundled; the *paragraph text* is © LEV/USCCB and may not. The redirect was the price.

This spec buys the text tier back **without crossing the copyright line** — an **inline
catechism sheet** with the same clarity as `CommentarySheet`, on a precedence chain:

> **bundled Trent (default) → imported personal CCC (supersedes) → "read on vatican.va"
> (fallback) → a future licensed CCC bundle.**

The public-domain **Catechism of the Council of Trent** (the Roman Catechism, 1566) is ours
to bundle and show inline today. The modern CCC text arrives only the way NABRE does — a copy
the owner imports on-device — and, when present, supersedes Trent inline. The vatican.va
links never go away; they become the fallback *inside* the sheet, not a forced jump out of it.

---

## 1. The bright line (copyright) — stated first, on purpose

Three different things, and only the first two are ever ours to ship:

| | What | May we bundle it? |
|---|---|---|
| ✅ **The Roman Catechism (Trent)** | Donovan 1829 / McHugh-Callan 1923 English prose of the 1566 catechism | **Yes — public domain.** Donovan 1829 is PD **worldwide** (pre-1931, author long dead); McHugh-Callan 1923 entered the **U.S.** public domain 1 Jan 2019. We build it from a pinned PD transcription, seal it in `manifest.json`, and render it inline. |
| ✅ **The §5 citation index** | verse → CCC ¶ numbers, and ¶ → vatican.va URL | **Yes — fact, already shipped.** `public/data/ccc/{index,url}.json` stay exactly as built in v1.9.0. They give verse-level precision Trent structurally cannot (see §4). |
| ❌ **The modern CCC paragraph text** | the prose of ¶1–2865 | **No — © Libreria Editrice Vaticana / USCCB.** Never committed, never bundled, never in `dist/`. It reaches a device **only** by the owner importing a copy they own (§6), exactly as RSV-2CE/NABRE do. A real distribution license is a separate, future track (P3). |

- This is **not** on the §13 refusal list and is **not** AI/paraphrase — Trent is verbatim
  public-domain text; the modern CCC is the user's own licensed copy. Both are the deposit
  presented unaltered, the same ethic as the bundled Bibles.
- The redistribution refusal for the modern CCC is documented precedent (the Holy See/APSA has
  refused and enforced full-text redistribution, including free + offline). The supersede tier
  is **personal use on one device**, never a Fidelis distribution of the text.

---

## 2. The precedence chain (the heart of this design)

When a reader taps the Catechism action on a cited verse, the inline sheet resolves its
**primary content** top-down:

| Tier | Condition | Primary content shown inline | The vatican.va affordance |
|---|---|---|---|
| **1 · Supersede** | The owner has imported a modern CCC (`loadCCCText()` non-empty) **and** this verse has cited ¶ in `index.json` | The **real CCC ¶ text** for each cited paragraph (verse-precise, because the index supplies the exact ¶ numbers) | kept, quiet, per-¶ ("read ¶N on vatican.va") |
| **2 · Default** | No import present (the shipped state) | The **bundled Trent**, browsable by Part/section (§4) — opened to a derived section if the optional Trent-citation map has one for the verse, else the Trent table of contents with an honest "arranged by topic, not by verse" note | kept: the precise `Catechism ¶…` link row from the §5 index lives **inside** the sheet |
| **3 · Fallback** | Always available in tiers 1 & 2 | — | the `¶…` links (the v1.9.0 behavior), now a row in the sheet rather than a forced redirect |
| **4 · Future** | A real CCC distribution license is obtained (P3) | The CCC ¶ text bundled directly (same render path as tier 1, sourced from a sealed data file instead of IndexedDB) | becomes optional |

**Verse precision is honest at every tier.** Tier 1 is verse-precise because the citation
index hands the sheet the exact ¶ numbers and the import supplies their text. Tier 3 is
verse-precise for the same reason (the links are per-¶). **Tier 2 (Trent) is *topical*, not
verse-keyed** — and the design says so out loud, because no public-domain verse→Trent index
exists (§4). That is the one place we trade precision for "no forced redirect," and the §5 ¶
link row stays in the sheet so the precise pointer is never lost.

---

## 3. What ships (by phase — see §13)

- **P1** — `public/data/trent/trent.json` (PD Roman Catechism, browsable by Part/section),
  built + sealed; a new **`CCCSheet`** (Sheet `variant="panel"`) that renders Trent inline;
  the verse action bar's Catechism **link row becomes a Catechism action** that opens the
  sheet; the §5 ¶ links move *into* the sheet as the fallback row. The purple gutter mark
  (`.ccc-mark`) stays.
- **P2** — the modern-CCC **import path**: the `fidelis-ccc-1` paragraph JSON format
  (§6), a new IndexedDB store, `loadCCCText()`, the Translations/Magisterium import slot, the
  Mac-side `scripts/build-ccc-text.mjs` converter, and the **supersede** render branch.
- **P3 (future)** — if a CCC distribution license is secured, bundle the ¶ text behind the
  same render path. Out of scope here beyond leaving the seam.

**Restated so it stays rejected:** no inline interleaving of catechism text into the sacred
page (study is one tap away, per §4.2); no page mark beyond the existing quiet purple dot; no
streaks/social/AI; the modern CCC text is never bundled (P3 license excepted).

---

## 4. The Trent access model — browsable-by-section, not verse-keyed (decided)

**There is no public-domain, machine-readable verse → Trent-section index, and there cannot
be a native one** — the Roman Catechism is organized by **Part I Creed (12 Articles) → Part II
Sacraments (7) → Part III Decalogue (10 Commandments) → Part IV Lord's Prayer (petitions)**,
not by Bible book/verse. It carries inline Scripture citations (section → verse) and a topical
index, but nothing that maps verse → section. This is a structural fact about the work, not a
gap more searching fills.

**Therefore Trent ships as a browsable catechism, and the existing §5 verse index keeps the
verse-level precision Trent lacks:**

1. **The inline sheet's Tier-2 default = browse Trent by structure.** The sheet opens to a
   compact table of contents (Creed / Sacraments / Commandments / Lord's Prayer → sub-sections)
   and renders the selected section's PD text. This is the "no forced vatican.va redirect" win,
   with text we may legally bundle.
2. **The §5 verse index stays the verse-level entry point** (`index.json` + `url.json`,
   unchanged). So a cited verse still surfaces its precise ¶ numbers (the Tier-3 link row in
   the sheet), and — once a modern CCC is imported — those numbers resolve to real ¶ text
   (Tier 1).
3. **Optional, clearly-derived enrichment (stretch — P1 if cheap, else P3):** harvest Trent's
   *own* inline Scripture citations from the pinned transcription to build a **coarse, derived**
   `verse → Trent-section` map, so a verse can pre-open the relevant Trent section. It is
   approximate (depends on the transcription's footnote fidelity) and must be labeled **"Trent
   cites this verse,"** never presented as authoritative coverage. **Do not block P1 on it.**

### 4.1 Trent data shape — `public/data/trent/trent.json` (sealed)

A single PD document, structured by Part → section, loaded once and memoized like the
commentary files. **No verse keys** (that is the point of §4):

```jsonc
{
  "edition": "Catechism of the Council of Trent (Donovan, 1829)",
  "source": "en.wikisource.org/wiki/The_Catechism_of_the_Council_of_Trent",
  "license": "public-domain",
  "parts": [
    {
      "id": "creed",
      "title": "Part I — The Creed",
      "sections": [
        { "id": "creed-art-01", "title": "Article I — \"I believe in God…\"", "html": "<p>…</p>" }
      ]
    }
    // … Sacraments, Commandments, Lord's Prayer
  ]
}
```

- `html` is **sanitized, structural HTML only** (paragraphs, emphasis) — produced at build
  time from the pinned wikitext, never raw upstream markup at runtime. Plain prose is also
  acceptable; the renderer treats `html` as trusted-because-build-sealed.
- Size budget: the full Roman Catechism in English is well under a Bible book — a single file
  (~1–2 MB) loaded lazily on first sheet open. No per-section splitting needed.
- **Optional** `public/data/trent/refs.json` (the §4.3 derived map, if built): `{ "<slug>
  <ch>:<v>": ["creed-art-01", …] }`, the only thing that is verse-keyed, and explicitly
  labeled derived/approximate.

### 4.2 Build pipeline — `scripts/build-trent.mjs` (new, committed)

Mirrors `build-haydock.mjs`/`build-catena.mjs`: pin an upstream PD tree, fetch deterministically,
emit sealed JSON, never hand-edit `public/data/`.

```
npm run trent        # node scripts/build-trent.mjs → public/data/trent/trent.json
npm run manifest     # re-seal manifest.json (SHA-256 per file + root)
```

1. **Pin** both Trent translations in `scripts/pins.mjs` by a fixed **revision/oldid** per page
   (a moving title is forbidden, like every other pin). We bundle **two editions** — Donovan
   1829 as the **default**, McHugh-Callan 1923 as a **switchable** option (see the decision note
   below) — so `trent.json` carries both, keyed by edition, and a setting selects which renders:
   ```js
   trent: {
     // Both bundled; Donovan is the default, McHugh-Callan the switchable modern-English option.
     donovan: {
       // Catechism of the Council of Trent, J. Donovan 1829 (PD worldwide).
       source: "en.wikisource.org/wiki/The_Catechism_of_the_Council_of_Trent",
       revisions: { /* "Part_1:_Article_9": 1234567, … */ }
     },
     mchughCallan: {
       // McHugh & Callan 1923 (PD in the U.S.; see geo caveat). Pin a clean PD-in-US transcription.
       source: "archive.org/details/… (1923 ed.) or a clean PD transcription",
       revisions: { /* pinned per section */ }
     }
   }
   ```
2. **Fetch** raw wikitext per pinned section via the MediaWiki API (`action=raw` /
   `?action=parse`), the same "fetch a pinned upstream tree" pattern as `scrollmapper`.
3. **Clean** wikitext → structural HTML/prose (strip wiki tables of contents, navigation,
   `[[…]]` link chrome, references), collapse whitespace.
4. **Emit** `public/data/trent/trent.json`; `npm run manifest` reseals; `npm run verify-data`
   and the harness hash-walk then cover it exactly like the texts and commentary.
5. **(Optional P1 stretch)** also emit `refs.json` by scanning the cleaned text for inline
   Scripture references (reuse `parseReference`), keying each to its enclosing section id.

> **Decision (owner, 2026-06-27): ship BOTH — Donovan 1829 as the default, McHugh-Callan 1923
> as a switchable option** so a reader who finds the 1829 prose archaic can flip to modern
> English. Donovan 1829 is PD **worldwide** (safe to bundle and distribute anywhere). McHugh-Callan
> 1923 is PD in the **U.S.** since 2019 but, in life+70 jurisdictions, stays under copyright until
> the translators' terms elapse (McHugh d.1950, Callan d.1962 → ~2033). **Important:** "switchable,
> not default" does **not** reduce exposure — if McHugh-Callan ships *in the bundle*, it is
> distributed to every region regardless of which edition is shown. So the McHugh-Callan exposure is
> a real (if modest) residual; pick a mitigation in §15.1. Avoid the cin.org / James Akin HTML
> entirely (it bolts on a 1996 transcription copyright).

---

## 5. The §5 citation index — unchanged

`public/data/ccc/index.json` (verse → ¶, Psalms Vulgate-mapped) and `url.json` (¶ →
vatican.va) **stay byte-for-byte as shipped in v1.9.0**, sealed in the manifest. `src/lib/ccc.ts`
(`cccKey`, `cccParagraphs`, `isCited`, `capParagraphs`) is reused as-is — it is what feeds the
Tier-3 link row and (in Tier 1) hands the sheet the exact ¶ numbers whose text the import
resolves. The purple gutter mark `.ccc-mark` and `cccCited(v)` in the Reader are unchanged.

---

## 6. The modern-CCC import path (P2)

The CCC text is **not a Bible** (no book/chapter/verse), so it cannot ride
`parseImport`/`resolveBookSlug`/`loadBook`. It gets its own format, parser, IndexedDB store,
and Mac-side converter — built to **share `url.json`'s key space** so the sheet can do
`paragraphs[n] ?? url[n]` with zero transformation.

### 6.1 The import file format — `fidelis-ccc-1`

A header + a flat **paragraph-number → text** map. Keys are the canonical CCC paragraph numbers
as strings, `"1".."2865"` — identical to `url.json` keys.

```jsonc
{
  "format": "fidelis-ccc-1",
  "edition": "Catechism of the Catholic Church, 2nd Edition (USCCB)",
  "language": "en",
  "paragraphs": {
    "1": "God, infinitely perfect and blessed in himself, in a plan of sheer goodness …",
    "1817": "Hope is the theological virtue by which we desire the kingdom of heaven …",
    "2865": "By the final \"Amen,\" we express our \"fiat\" concerning the seven petitions: …"
  }
}
```

**Rules:**
- `format` (required): discriminator `"fidelis-ccc-1"` — lets the parser validate before
  storing and reject a mis-dropped Bible file with a clear message.
- `edition` (required): free-text label shown in the sheet's source credit and the import row
  ("Imported on this device · CCC 2nd Ed.") — honest provenance, like the translations badge.
- `language` (optional, default `"en"`): for a future non-English import; sets the sheet's `lang`.
- `paragraphs` (required): string-integer keys `"1".."2865"` → plain-text UTF-8 prose.
  **Coverage need not be complete** — any missing ¶ falls through to the vatican.va link
  (Tier 3). In-paragraph lists are joined into the one string they belong to.

**Parser tolerance** (mirror `parseJson`'s leniency): also accept a **bare flat map** `{ "1":
"…" }` and a `{ "ccc": { … } }` wrapper, normalizing all three to `{ edition, language,
paragraphs }`. **Reject** anything whose keys are not integers in `[1, 2865]`.

### 6.2 Intake parser — `parseCccText` (pure, no text)

A new pure parser, in `src/lib/import-formats.ts` (or a sibling `src/lib/import-ccc.ts`),
contains **no Catechism text**:

```ts
export function parseCccText(filename: string, text: string):
  { edition: string; language: string; paragraphs: Record<string, string> };
```

- Validates the three tolerant shapes of §6.1; throws a friendly error on a Bible file or
  non-integer/out-of-range keys.
- Returns the normalized map; the Translations page stores it (§6.4). Unit-testable in the
  harness with **synthetic fixtures only** (never real CCC text — §11).

### 6.3 Storage — IndexedDB `fidelis-imported`, `DB_VERSION 1 → 2`

Reuse the existing imported-text DB. Bump `DB_VERSION` 1→2 and add an object store `ccc`;
`onupgradeneeded` must **create `ccc` without dropping `books`** (the NABRE/RSV-2CE imports).
The whole paragraph map is stored under one key (`"text"`) as `{ edition, language, paragraphs }`
— it is ~2–3 MB loaded once (like `loadCCC` already loads the whole index), so no per-¶ records.

```ts
// data.ts — sibling of idbPut/idbGet for books, but the ccc store, one key "text".
export async function idbPutCcc(doc: CCCText): Promise<void>;
export async function idbGetCcc(): Promise<CCCText | null>;
export async function idbClearCcc(): Promise<void>;   // "Remove imported Catechism"
```

### 6.4 The import slot (Translations / Magisterium)

A Catechism import row alongside the translation cards (or in the Magisterium settings
section), wired exactly like `Translations.onFile`:

- File input `accept=".json,application/json"`; on file, `parseCccText(name, await file.text())`
  → `idbPutCcc(doc)` → "Imported the Catechism on this device. Stored only here."
- A **Remove** affordance → `idbClearCcc()` (mirrors `idbClearTranslation`).
- Honest copy: the modern CCC text is copyrighted and never bundled; importing a copy you own
  is the personal-use **supersede** tier.

### 6.5 The Mac-side converter — `scripts/build-ccc-text.mjs` (local-only, never commits text)

A local-only sibling of `build-nabre.mjs`/`build-ccc.mjs`. **Contains no Catechism text**;
reads the owner's owned file, writes `ccc.local.json` (already covered by `.gitignore`
`*.local.json`), prints structural counts only. Add `"build-ccc-text": "node
scripts/build-ccc-text.mjs"` to `package.json`.

**CLI:**
```sh
# EPUB (recommended — cleanest footnote handling):
ebook-convert "/path/to/ccc.epub" ccc.txt --enable-heuristics --txt-output-formatting plain
node scripts/build-ccc-text.mjs ccc.txt

# PDF (fallback — needs the body-column crop):
node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf" [ccc.local.json]
#   or:  CCC_TEXT_PDF="/path/to.pdf" node scripts/build-ccc-text.mjs
```
*(Poppler `pdftotext` is present at `/opt/homebrew/bin/pdftotext`; Calibre is not — the EPUB
path needs `brew install --cask calibre` first.)*

**Extraction (PDF):** `pdftotext -layout`, **cropping to the body column** to drop the marginal
cross-reference numbers (`-x/-W`) and the page-foot footnote band (`-H`), exactly the region-crop
technique `build-ccc.mjs` already uses for the two-column index. The page span is Parts One–Four
(¶1 → ¶2865, before the Index of Citations appendix `build-ccc.mjs` consumes). **EPUB needs no
crop** — `ebook-convert` resolves footnote anchors, so the `.txt` is far cleaner.

**Splitting (the monotonic ¶ walker)** — identical in spirit to `build-nabre.mjs`'s verse
splitter, lifted to a single 1→2865 sequence:
- Maintain `expectedPara` (from 1) and a buffer. A line **beginning with the integer equal to
  `expectedPara`** closes the previous ¶, opens the new one, increments `expectedPara`. Any
  other line appends to the open ¶.
- Because the key is monotonic, stray marginal numbers and in-paragraph enumerations (`a)`,
  `1°`, the Decalogue list, the seven petitions) are **not** equal to `expectedPara` and stay
  body text — the same robustness as the verse splitter. **The CCC has no per-number
  sub-letters; ¶ are pure integers 1–2865.**
- **Normalize out** (the CCC's apparatus): the leading marginal ¶ number (the split key, not
  body); glued footnote-reference digit runs ("life.45") — *the hard PDF case, flagged*; marginal
  cross-ref numbers (cropped away); the page-foot footnote block (cropped away); running heads /
  part banners / page numbers; inter-paragraph section/article headings and the bare "IN BRIEF"
  header (assign inter-¶ lines to the *current* open ¶, trim trailing heading lines); line-break
  hyphenation; collapse whitespace. (Keep the numbered **"IN BRIEF"** summary ¶ — they are real.)

**Output:** `{ format: "fidelis-ccc-1", edition, language: "en", paragraphs }` to `ccc.local.json`
(compact `JSON.stringify(…, null, 0)`, like `build-nabre.mjs`).

**Validation (counts only, no copyrighted oracle, never dumps body):**
1. **Cited-¶ coverage** — load the committed `public/data/ccc/url.json`; assert every ¶ that is
   a key there is present in `paragraphs` (the shipped citation facts as the completeness
   oracle). Print `cited ¶ present: N/N` or name the missing.
2. **One-section count + incipit** — Part Four "Christian Prayer" ¶2558–2865 is the last block,
   so `2865 − 2558 + 1 = 308` ¶ must be present and contiguous; print the count and the first
   ~60 chars of ¶1/¶1817/¶2558/¶2865 to eyeball — the same anchor report `build-ccc.mjs` prints.

A failed coverage check or a wrong section count = stop and re-tune the crop box, exactly
`build-nabre.mjs`'s "review the printed counts" gate. (A `…-LOCAL-BUILD-RUNBOOK.md` companion,
like the §5 index one, captures the crop-tuning recipe.)

---

## 7. Data access — `src/lib/data.ts`

Two memoized loaders, mirroring `loadCommentary`/`loadCCC`:

```ts
export interface TrentDoc { edition: string; parts: { id: string; title: string;
  sections: { id: string; title: string; html: string }[] }[]; refs?: Record<string, string[]>; }
export interface CCCText { edition: string; language: string; paragraphs: Record<string, string>; }

/** Bundled PD Roman Catechism (Trent). 404 → null (layer not built). Memoized once. */
export function loadTrent(): Promise<TrentDoc | null>;

/** The owner's imported modern CCC from IndexedDB (ccc store, key "text"), or null.
 *  Memoized, but the cache MUST be cleared on import/remove so a fresh import is seen. */
export function loadCCCText(): Promise<CCCText | null>;
```

- `loadTrent()` fetches `${BASE_URL}data/trent/trent.json` once (404 → `null`), like `loadCCC`.
- `loadCCCText()` reads `idbGetCcc()`; the memo is invalidated by `idbPutCcc`/`idbClearCcc`
  (clear the module-level promise) so the supersede tier flips live after an import — the same
  discipline as `getSettings()` seeing the latest write.

---

## 8. The sheet — `src/components/CCCSheet.tsx` (new), via `Sheet` `variant="panel"`

A sibling of `CommentarySheet`, mounted by the Reader as
`<Sheet variant="panel" titleId="ccc-title" onClose={…}>`. It inherits **all** dialog behavior
from `Sheet.tsx` unchanged — `role="dialog"`/`aria-modal`, focus trap + return,
Escape/backdrop/✕ dismiss, the reference-counted body scroll-lock (`lib/scrollLock`), the
overlay-back stack (`lib/overlays`), no motion, safe-area insets, and the desktop right-dock at
≥640px. **No change to `Sheet.tsx` is required** (the `panel` variant already exists for §4.2).

### 8.1 Props & render precedence

```ts
interface Props {
  book: string; chapter: number; verse: number;
  refLabel: string;                 // "John 3:16" — the heading
  titleId: string;                  // "ccc-title"
  paras: number[];                  // cccParagraphs(index, book, chapter, verse)
  urls: Record<string, string>;     // ccc.url — the Tier-3 links
}
```

The sheet loads `loadCCCText()` and `loadTrent()` on open and chooses **primary content** with
a pure resolver in a new tested module `src/lib/catechism.ts`:

```ts
export type CatechismTier = "imported" | "trent" | "links";
export function pickTier(args: { imported: boolean; hasParas: boolean; trent: boolean }): CatechismTier;
// imported && hasParas → "imported"; else trent → "trent"; else "links"
```

- **Tier 1 "imported"** — for each `n` in `paras`, render a `¶{n}` label (purple, interactive
  family) + `cccText.paragraphs[String(n)]`; if a given ¶ has no imported text, show its
  vatican.va link inline instead. A muted credit line: *"Catechism of the Catholic Church ·
  imported on this device."*
- **Tier 2 "trent"** — render the Trent browser: a compact Part/section TOC (the four Parts as
  expandable groups) + the selected section's `html`. Open state = the derived `refs` section
  for the verse if present (labeled *"Trent cites this verse"*), else the TOC root with an
  honest note: *"The Roman Catechism is arranged by the Creed, Sacraments, Commandments, and
  Lord's Prayer rather than by verse — browse below."* Muted credit: *"Catechism of the Council
  of Trent · Donovan, 1829 · public domain."*
- **Tier 3 "links" footer (always shown when `paras.length`)** — the v1.9.0 ¶ row, now living
  inside the sheet: `Read on vatican.va: ¶219 · ¶444 …`, each an `<a target="_blank"
  rel="noopener noreferrer">`, soft-capped at `CCC_SOFT_CAP` with a "+N more" expander
  (`capParagraphs`). This is the fallback affordance in **every** tier, so the precise pointer
  is never lost even when Trent (topical) is the primary content.

### 8.2 The two-accent rule (binding)

- The catechism is **reference/action**, not a sacred honor mark — so every interactive and
  structural element here is **purple** (`--purple`), exactly as §5 decided ("no honor mark
  here — this is an action, not a sacrament"). The gutter mark stays the fixed-purple
  `.ccc-mark`; the ¶ links are purple; the Trent TOC buttons/tabs are purple.
- **Gold appears nowhere** in this sheet. (Source-credit lines are *muted text*, not gold —
  unlike `CommentarySheet`'s gold Catena credit, which honors the Fathers; the Catechism credit
  is plain provenance.) No element wears both accents.

---

## 9. Reader integration — `src/pages/Reader.tsx`

The v1.9.0 action-bar **link row becomes an action that opens the sheet** (the "no forced
redirect" win); the gutter mark and `loadCCC()` wiring stay.

- Replace the inline `.ccc-row` block (Reader lines ~545–569) with a **Catechism action
  button** in `.verse-actions`, shown iff `settings.cccLinksEnabled && cccParas.length > 0`:
  ```tsx
  {cccParas.length > 0 && (
    <button className="icon-btn" onClick={() => setCccFor(selRef.verse)}>
      <Icon name="ccc" /> Catechism
    </button>
  )}
  ```
  (Reuse an existing reference icon; the icon set forbids emoji glyphs — `src/components/Icon.tsx`.)
- Mount the sheet next to the commentary sheet:
  ```tsx
  {cccFor != null && (
    <Sheet variant="panel" titleId="ccc-title" onClose={() => setCccFor(null)}>
      <CCCSheet book={bookSlug} chapter={chapter} verse={cccFor}
        refLabel={`${displayName} ${chapter}:${cccFor}`} titleId="ccc-title"
        paras={cccParagraphs(ccc!.index, bookSlug, chapter, cccFor)} urls={ccc!.url} />
    </Sheet>
  )}
  ```
- `loadCCC()` (index + url) loads once when `cccLinksEnabled`, exactly as today. `loadTrent()`
  and `loadCCCText()` load **inside the sheet on first open** (lazy, like Catena), so a reader
  who never taps Catechism pays nothing.

---

## 10. Settings — the existing "Magisterium" section, copy updated

No new top-level setting is required; the existing **`cccLinksEnabled`** (default on, the §5
"Magisterium" section) is the master gate — off ⇒ no mark, no action, no sheet. Update only the
copy to reflect the inline sheet:

- Row label stays **"Catechism cross-references."** Sub-label changes from *"Links open
  vatican.va."* to: *"Show the Catechism on a cited verse — the bundled Roman Catechism (Trent),
  or your own imported copy of the modern Catechism. Links to vatican.va remain available."*
- **P2** adds an **import row** in this section (or on Translations): *"Import the modern
  Catechism (a copy you own)"* with the file slot (§6.4) and a Remove control, plus the honest
  note that the modern text is never bundled.

The five-card rule and the two-accent rule both hold; Today is untouched.

---

## 11. Licensing guardrails baked into the design

- **Trent is PD → bundled** (Donovan 1829 worldwide; the pin is fixed by oldid for
  reproducibility). Built only from a no-added-copyright transcription; cin.org/Akin avoided.
- **The modern CCC text is NEVER bundled** without a license. It reaches a device only via the
  owner's personal import (P2) — `*.local.json`, gitignored, IndexedDB-only, never committed,
  never in `dist/` — identical to the NABRE/RSV-2CE pattern and the v1.9.0 bright line. A real
  distribution license is the separate P3 track.
- **The converter and the harness never read or emit copyrighted text into the repo.** Tests
  use synthetic fixtures; the converter prints counts only.

---

## 12. Accessibility (§10)

- `Sheet` already traps focus and returns it on close — inherited by `CCCSheet`.
- The gutter mark is decorative (`aria-hidden`); discoverability is the labeled Catechism
  `<button>`, not the dot.
- Trent TOC items and tier tabs are real `<button>`s; the vatican.va links are real `<a>`
  with `rel="noopener noreferrer"` (announce the new tab).
- Purple-on-bg uses the existing AA `--purple` token; no motion (`prefers-reduced-motion`
  honored by construction).
- An imported non-English CCC sets the sheet's `lang` from `paragraphs`' `language`.

---

## 13. Phasing

- **P1 — Trent bundled + inline sheet.** `scripts/build-trent.mjs` + `pins.mjs` entry +
  `public/data/trent/trent.json` (sealed) + `loadTrent()` + `CCCSheet` (Tier-2 + Tier-3) + the
  Reader action + the Settings copy. Ship the topical Trent browser with the vatican.va links
  inside it; *no import yet.* (Optional: the derived `refs.json` if cheap.)
- **P2 — personal-CCC import + supersede.** `fidelis-ccc-1` format, `parseCccText`, IndexedDB
  `DB_VERSION 1→2` + `ccc` store, `loadCCCText()`, the import slot, the converter
  `scripts/build-ccc-text.mjs` + runbook, and the Tier-1 supersede render branch.
- **P3 (future) — licensed CCC bundle.** If a CCC distribution license is obtained, bundle the
  ¶ text behind the same Tier-1 render path (sourced from a sealed data file instead of
  IndexedDB). Leave the seam; do not build now.

---

## 14. Test plan (`scripts/test-data.ts`, a new section after §19)

Hard assertions, no print-only checks. **No copyrighted text in any fixture.**

1. **Trent shape** — `public/data/trent/trent.json` loads; the four Parts (creed, sacraments,
   commandments, lords-prayer) are present; every section has a non-empty `title` and `html`;
   section ids are unique. *(P1)*
2. **Trent is bundled + sealed** — `manifest.json` lists `trent/trent.json` (and `refs.json` if
   built) and they pass the hash-walk.
3. **`pickTier` precedence** — the pure resolver returns `"imported"`/`"trent"`/`"links"` across
   all branches (imported+paras, imported+no-paras, no-import+trent, no-import+no-trent).
4. **`parseCccText` (synthetic only)** — accepts the header, bare-map, and `{ccc:{…}}` shapes,
   all normalizing to `{ edition, language, paragraphs }`; **rejects** non-integer keys, keys
   outside `[1,2865]`, and a Bible-shaped JSON; the parser holds no embedded text. *(P2)*
5. **Key-space match** — a synthetic `fidelis-ccc-1` map's keys are the same string-integer
   space as `url.json` (so `paragraphs[n] ?? url[n]` is valid). *(P2)*
6. **§5 index untouched** — the existing §5 assertions (shape, keys resolve, Psalm mapping,
   anchors, URL well-formedness, manifest) still pass; `index.json`/`url.json` bytes unchanged.

Then `npm test` + `npm run build` + `npm run check-docs` green, and a **manual run**
(`/verify`) to confirm: the Catechism action opens the inline sheet; Trent browses by Part with
the vatican.va links present (Tier 2); after a synthetic local import, a cited verse shows ¶
text inline (Tier 1); desktop panel / phone sheet split; zero regression on the §5 mark.

---

## 15. Open questions (for sign-off)

1. **Trent translations (§4.2) — DECIDED (owner, 2026-06-27): ship both, Donovan 1829 default +
   McHugh-Callan 1923 switchable, BOTH BUNDLED (mitigation "a" — accept the modest residual
   worldwide-PD exposure on McHugh-Callan until ~2033; it is already US-PD, a 1923 religious text,
   negligible enforcement likelihood).** Both editions seal into `trent.json`; a setting picks
   which renders. No open sub-question remains here.
2. **Derived verse→Trent map (§4.3).** Build the approximate `refs.json` ("Trent cites this
   verse") in **P1**, or defer to P3? It improves verse relevance but is best-effort and adds
   build surface. *(Confirmed structural fact: no PD authoritative verse→Trent index exists, so
   any such map is derived/approximate — never presented as authoritative.)*
3. **Import slot placement (§6.4).** Catechism import on the **Translations** page (next to the
   Bible cards) or in the **Magisterium** Settings section? The CCC is not a translation, which
   argues for Magisterium; the existing import plumbing lives on Translations.
4. **Setting granularity (§10).** Reuse the single `cccLinksEnabled` master (recommended, no
   migration), or split a separate `cccInlineSheet` toggle so a user could keep links-only
   behavior? Recommendation: reuse the one master.
5. **Release framing.** Its own minor (proposed **v1.14.0**); name TBD (the Trent/CCC "twin
   catechisms" theme) — trivial to rename, like every prior release.

---

## 16. Known limitations / deferred

- **Trent is topical, not verse-keyed** (§4) — the one honest precision trade; the §5 ¶ link
  row inside the sheet preserves verse precision, and the modern-CCC import (Tier 1) restores
  full verse-precise text.
- **Footnote-digit gluing** in a PDF source (§6.5) is the genuinely hard normalization case;
  EPUB is recommended for the import. Flagged in the converter, in the project's honesty ethos.
- **Modern CCC coverage need not be complete** — a missing ¶ falls through to its vatican.va
  link; the empty state is normal.
- **P3 licensed bundle** — left as a seam, not built.
- **Conciliar / other-Magisterium text** — out of scope, the later tier the Magisterium section
  already anticipates.
