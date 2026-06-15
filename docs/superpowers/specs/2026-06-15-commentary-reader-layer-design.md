# §4.2 — The Commentary Reader Layer (Haydock + Catena Aurea)

**Date:** 2026-06-15
**Spec section:** Feature Design Spec §4.2 (the gold dot and the bottom sheet)
**Branch:** `v1.5-formation`
**Status:** ✅ implemented in v1.5.0 — see `CHANGELOG.md` and the CLAUDE.md "formation release" record. Normalizer hardened post-design (full corpus coverage, Isidore-of-Pelusium / Dionysius-of-Alexandria identity fixes, Newman in the Doctors set); verified live in a browser (gold dots + zero layout shift, desktop panel / mobile sheet, tabs, chips, Doctors-only).

This is the **UI layer** for the commentary feature. The data pipeline already
shipped (commit `386cf2b`, "v1.5 C2"): per-book JSON lives under
`public/data/commentary/{haydock,catena}/`, sealed in the manifest. This work adds
the Reader integration: gold dots, a Commentary action, a commentary sheet/panel,
and the Settings section. **No new data files; the sealed manifest is untouched.**

§5 (the CCC citation index) and the rest of §2.2 are explicitly **out of scope** —
separate PRs.

---

## 1. What ships

- A small **gold dot** after a verse number when that verse has **Haydock** commentary.
- A **Commentary** action in the existing verse action bar when *any* source has a note.
- A **CommentarySheet**: a bottom sheet on phones, a right-docked side panel on
  desktop (≥640px), with **Haydock** and **Catena Aurea** tabs.
- On the Catena tab: **per-Father filter chips**, a **Doctors only** toggle, and a
  **Glossa Ordinaria** chip set apart from the Fathers.
- A full **Commentary** settings section (spec §2.2 item 7): master toggle, two
  per-source toggles, and a Doctors-only default — all default-on except
  Doctors-only (default off).

**Rejected by the spec, restated here so it stays rejected:** no inline interleaving
of commentary into the sacred page. Scripture stays Scripture; study is one tap away.

---

## 2. Decisions (resolved with the product owner)

| # | Decision | Choice |
|---|----------|--------|
| B1 | When to load the heavy Catena file (6–10 MB/Gospel) | **Lazy** — only when a sheet first opens. The Commentary action shows on *all* Gospel verses (Catena covers ~99%); the ~1% with no note get an honest empty state. |
| B2 | Vulgate Psalm versification | **Document as a v1 limitation.** Lookups use displayed `chapter:verse`; correct for DRC (default) and CPDV; Vulgate Psalm numbering may offset a few dots. Mapping deferred. |
| C1 | Is the gold dot interactive | **Indicator-only** (for now). Commentary opens via the action bar. |
| D1 | Desktop layout | **Responsive** — bottom sheet on phones, right side-panel on desktop. |
| E1 | Doctors-of-the-Church set | **Approved list + John Henry Newman** (see §6). |
| E2 | "Gloss" entries | **Own chip, clearly marked not a Father** (Glossa Ordinaria). |
| E3 | Pseudo-X attributions | **Distinct chips, never Doctors.** Includes **Pseudo-Dionysius** (all `Dionys*` labels → Pseudo-Dionysius the Areopagite). |
| E4 | Unrecognized long-tail labels | **Graceful fallback** to a cleaned chip; test guards the top-15. |
| F1 | What per-source toggles gate | **The whole source** (off ⇒ no dots/tab/text for it), with a sub-label under the Haydock switch noting it removes the dots. |
| X1 | PR scope | **§4.2 alone.** §5 (CCC) is a later PR. |

---

## 3. Data shape (already on disk — for reference)

```
public/data/commentary/haydock/{slug}.json        # 73 books, full canon, ≤ ~1 MB each
  { "3:16": [ { "src": "Challoner", "text": "…" }, … ], … }      # src may be ""

public/data/commentary/catena/{gospel}.json        # matthew/mark/luke/john only, 4.8–9.9 MB
  { "5:3": [ { "father": "Chrysostom", "text": "…" }, … ], … }   # father may be "" (continuation)
```

- Keys are `"chapter:verse"` strings; source ranges are already broadcast to each verse.
- **Slugs equal the app's book slugs** (the DRC bundle dir names — `1-samuel`,
  `1-kings`, …). Every real book has a Haydock file. The textless appendix books
  (`laodiceans`, `3-esdras`, `4-esdras`, `prayer-of-manasseh`, `psalm-151`) have no
  Haydock file → the loader must treat a 404 as "no commentary," never an error.
- Catena `father` labels are noisy: canonical names (`Chrysostom`), citation forms
  (`Chrys., Hom. in Matt., 56`), Gloss variants (`Gloss. interlin.`), continuations
  (`It goes on`, `There follows`, `""`). Normalization (§6) is the heart of this work.

---

## 4. Data access — `loadCommentary`

Add to `src/lib/data.ts`, mirroring `loadBook`'s promise-deduped `memCache`:

```ts
export type CommentaryNote = { src?: string; father?: string; text: string };
export type CommentaryBook = Record<string, CommentaryNote[]>;   // "ch:v" → notes

// corpus: "haydock" | "catena". Resolves to {} on 404 (appendix books / non-Gospels).
export function loadCommentary(corpus: string, book: string): Promise<CommentaryBook>;
```

- Keyed `"${corpus}/${book}"` in a dedicated cache map (or reuse the pattern). Failed
  fetches delete the key so a retry can succeed; **a 404 resolves to `{}`** (not a throw).
- URL: `${import.meta.env.BASE_URL}data/commentary/${corpus}/${book}.json`.
- The service worker caches the file on fetch like any other `/data/` asset; no
  manifest verification is required on load (matching `loadBook`).

**Load timing (B1):**
- **Haydock** for the open book loads in a `useEffect` keyed on `bookSlug`, *after*
  first paint — it drives the dots and is small (≤ ~1 MB).
- **Catena** is **not** loaded on book open. It loads the first time the user opens a
  CommentarySheet on a Gospel verse, then is cached for the session.

---

## 5. Reader integration (`src/pages/Reader.tsx`)

### 5.1 The gold dot (Haydock-only)
- The Reader holds the loaded Haydock book in state; `haydockHas(v)` = key `"${chapter}:${v}"` exists.
- In `renderVerses()`, when `settings.commentaryEnabled && settings.commentaryHaydock
  && haydockHas(v)` **and** verse numbers are shown, render a dot anchored to the
  verse number. (If verse numbers are hidden, there is no number to mark → no dot.)
- **Zero layout shift** is the hard requirement. The dot is **absolutely positioned**
  and anchored to a `position: relative` verse number, sitting inside the `.vnum`'s
  existing `margin-right` gutter:

```tsx
<sup className="vnum">{v}{showDot && <span className="cmt-dot" aria-hidden="true" />}</sup>
```
```css
.vnum { position: relative; }
.cmt-dot {
  position: absolute; right: -0.18em; top: 0;
  width: 0.30em; height: 0.30em; border-radius: 50%;
  background: var(--gold);
}
```
Because the dot is out of flow, its presence/absence **and** its late (post-async)
arrival never reflow verse text. Offsets tuned during implementation; verified
visually with a real run (the node harness cannot measure layout).

Gold is correct here: the dot is an **apparatus/honor mark** under the two-accent
rule ("gold honors"), the same family as `.note-mark`/`.bm-mark`. It is decorative
and `aria-hidden`; discoverability for screen readers is the labeled action button.

### 5.2 The Commentary action
- In the verse action bar (the `.verse-actions` block), add a **Commentary** button
  (existing `<Icon name="commentary" />`) between **Copy** and **Close**.
- Shown when `settings.commentaryEnabled` **and** union presence:
  `(commentaryHaydock && haydockHas(v)) || (commentaryCatena && isGospel(book))`.
  Gospel presence is assumed available (Catena ~99%) without loading Catena first.
- Clicking sets `commentaryFor: VerseRef | null`, which mounts the sheet.

### 5.3 `isGospel`
A small constant set `{ matthew, mark, luke, john }` in `src/lib/commentary.ts`,
since Catena exists only for the four Gospels.

---

## 6. Catena normalization (`src/lib/commentary.ts`, pure & tested)

This module is pure (no React, no fetch) so it is unit-testable in the harness.

```ts
export type Father = { id: string; name: string; isDoctor: boolean };
export type CatenaBlock = { father: Father | null; kind: "father" | "gloss" | "source"; text: string };

export const GOSPELS: ReadonlySet<string>;          // matthew/mark/luke/john
export function normalizeFather(raw: string): NormalizedLabel;  // father | gloss | continuation | source
export function groupCatena(notes: CommentaryNote[]): CatenaBlock[];  // merges continuations
export function fathersOf(blocks: CatenaBlock[]): Father[];     // distinct, in first-appearance order
export function isDoctor(id: string): boolean;
```

### 6.1 Classification algorithm
For each raw `father` label, in order:
1. **Empty / continuation** → fold into the previous block as another paragraph.
   Cues (case-insensitive, no recognized name token present): leading lowercase, or
   phrases like *it/there/then goes on*, *follows*, *he adds*, *what/it follows*,
   *wherefore…*, *as it is said*, *what say you*.
2. **`Pseudo-…`** → a distinct pseudo-Father id (never a Doctor):
   `Pseudo-Chrysostom`, `Pseudo-Jerome`, `Pseudo-Augustine`, `Pseudo-Origen`,
   `Pseudo-Dionysius`. **All `Dionys*` labels** (`Dionys.`, `Dionysius ar`,
   `Dionys., de Divin. Nom.`, …) → **Pseudo-Dionysius** (the Areopagite), *not*
   Dionysius of Alexandria.
3. **`Gloss…`** → `kind: "gloss"`, name **"Glossa Ordinaria"**, not a Father, not a Doctor.
4. **Canonical Father** by leading-token / abbreviation match (longest match first so
   the Gregorys disambiguate): `Greg. Naz*`/`Gregory Naz*` → Gregory Nazianzen;
   `Greg. Nyss*`/`Gregory (of) Nyssa` → Gregory of Nyssa; bare `Greg*`/`Gregory` →
   **Gregory the Great**; `Chrys*` → Chrysostom; `Aug*` → Augustine; `Hieron*`/`Jerome` →
   Jerome; `Ambros*` → Ambrose; `Theophyl*` → Theophylact; `Bede` → Bede; `Origen` →
   Origen; `Cyril*` → Cyril; `Hilary` → Hilary; `Remig*` → Remigius; `Raban*` →
   Rabanus Maurus; `Alcuin` → Alcuin; `Basil` → Basil; `Euseb*` → Eusebius;
   `Athanas*` → Athanasius; `Isidore` → Isidore; `Maxim*` → Maximus; `Chrysolog*` →
   Peter Chrysologus; `Damasc*`/`John of Damascus` → John Damascene; `Leo` → Leo;
   `Haymo` → Haymo; `Titus` → Titus of Bostra; `Didymus` → Didymus; `Severian*` → Severianus.
5. **Fallback** → `kind: "source"`, name = the cleaned label (trimmed to its first
   clause). Never raw noise; never a Doctor.

### 6.2 The Doctors of the Church set
**Doctors (`isDoctor` true):** Chrysostom, Augustine, Jerome, Ambrose, Gregory the
Great, Basil, Athanasius, Gregory Nazianzen, Hilary, Cyril, Bede, Isidore, Peter
Chrysologus, John Damascene, Leo, **John Henry Newman**.

**Not Doctors:** Theophylact, Origen, Remigius, Rabanus Maurus, Alcuin, Eusebius,
Gregory of Nyssa, Maximus, Haymo, Titus of Bostra, Didymus, Severianus, the
Glossa Ordinaria, and every Pseudo-* (including Pseudo-Dionysius).

Newman does **not** appear as a per-verse Father label (he is the *editor* of this
Catena edition). He is in the set for correctness/future-proofing, and is honored in
the Catena tab's source credit (§7.2). Bare "Gregory" → Gregory the Great (a Doctor);
"Cyril" is treated as a Doctor (both Cyrils are).

---

## 7. The sheet (`src/components/Sheet.tsx` + new `CommentarySheet.tsx`)

### 7.1 Sheet gains a responsive variant (D1)
Add an optional prop; default preserves today's behavior so MysterySheet and
IndulgenceNotice are untouched:

```ts
interface Props { titleId: string; onClose: () => void; children: ReactNode;
                  variant?: "sheet" | "panel"; }   // default "sheet"
```
- `variant="sheet"` (default): unchanged bottom sheet.
- `variant="panel"`: bottom sheet below 640px; right-docked, full-height side panel
  at ≥640px (breakpoint matches the existing TabBar). All inherited behavior is
  unchanged — `role="dialog"`/`aria-modal`, focus trap + return, Escape/backdrop/✕
  dismiss, body scroll lock, **no motion**, safe-area insets.

### 7.2 CommentarySheet
Mounted by the Reader as `<Sheet variant="panel" titleId="cmt-title" onClose=…>`.
- Header `<h2 id="cmt-title">` = e.g. "John 3:16".
- **Tabs** (interactive → purple, per the two-accent rule): **Haydock** and
  **Catena Aurea**. The Catena tab appears only for Gospel books where the verse has a
  Catena note; the Haydock tab only when the verse has a Haydock note. **Default active
  tab: Haydock when it has a note for the verse, otherwise Catena.**
- **Haydock pane:** `groupCatena` is Catena-only; Haydock notes render directly —
  each note prefixed by its `src` as a **gold small-caps label** (Challoner, Calmet,
  Witham, …); notes with `src === ""` render without a label.
- **Catena pane:**
  - A one-line source credit (gold, honor): *"The Catena Aurea, the Newman edition."*
  - A **chip row**: one button per Father from `fathersOf(...)`, in first-appearance
    order, then a divider, then the **Glossa Ordinaria** chip (clearly set apart),
    then any fallback sources. Chips are `<button aria-pressed>`.
  - A **Doctors only** toggle (`role="switch"`), seeded from `commentaryDoctorsOnly`.
  - Blocks render in source order, each opening with the Father's name as a gold
    small-caps label; continuations already merged in as paragraphs.
  - **Filter rule:** a block is visible when
    `(!doctorsOnly || block.father?.isDoctor) && (selected.size === 0 || selected.has(block.father?.id))`.
    When Doctors-only is on, non-Doctor chips are hidden.
- **Loading:** Catena fetches on first open via `loadCommentary("catena", book)`; show
  a quiet inline loading line until resolved; if the verse has no Catena note, show an
  honest empty state on that tab.

The Catena text contains Latin phrases inline; we do not force `lang="la"` on mixed
English prose (the §10 Latin rule targets pure-Latin Vulgate nodes). No red-letter,
no images, no motion.

---

## 8. Settings — the §2.2 item-7 Commentary section

### 8.1 New settings (`src/lib/storage.ts`)
Add to the `Settings` interface and the defaults object (merge-safe via the existing
`...read("settings", {})`, so no migration):

```ts
commentaryEnabled: boolean;       // default true — master; off ⇒ no dots, no action (the bare page)
commentaryHaydock: boolean;       // default true — Haydock source on (drives dots + Haydock tab)
commentaryCatena: boolean;        // default true — Catena source on (Catena tab + Gospel action)
commentaryDoctorsOnly: boolean;   // default false — seeds the sheet's Catena Doctors-only toggle
```

`src/SettingsContext.tsx` needs only the type to flow through; the Reader reads them
via `useSettings()` (live). Type-only `Settings` import where needed.

### 8.2 Settings UI (`src/pages/Settings.tsx`)
A new **"Commentary"** section, using the existing `role="switch"` row pattern:
- **Show commentary** (`commentaryEnabled`) — master.
- **Haydock** (`commentaryHaydock`) — with a sub-label: *"Off also hides the gold
  commentary dots on the page."* (per F1, because dots are Haydock-only).
- **Catena Aurea** (`commentaryCatena`).
- **Doctors of the Church only** (`commentaryDoctorsOnly`) — *"Open the Catena filtered
  to Doctors of the Church."*

Gating semantics (F1, the whole source):
- dot for `v` ⟺ `commentaryEnabled && commentaryHaydock && haydockHas(v)`.
- action for `v` ⟺ `commentaryEnabled && ((commentaryHaydock && haydockHas(v)) || (commentaryCatena && isGospel(book)))`.
- Haydock tab ⟺ `commentaryHaydock` and the verse has a Haydock note.
- Catena tab ⟺ `commentaryCatena` and Gospel and the verse has a Catena note.

---

## 9. Accessibility (§10)

- Sheet already traps focus and returns it on close — VoiceOver-safe; inherited by the
  panel variant.
- The dot is decorative (`aria-hidden`); the verse still announces "verse N"; the
  Commentary affordance is a labeled `<button>`, not the dot.
- Father chips are real `<button aria-pressed>`; Doctors-only is `role="switch"`.
- No motion (inherited); `prefers-reduced-motion` honored by construction.
- Gold-on-dark uses the existing `--gold` token (`#D4B254` night), which already
  passes WCAG AA.

---

## 10. Test plan (`scripts/test-data.ts`, new section after the existing §14/§15)

Importing the pure helpers from `src/lib/commentary.ts` and reading the real data:
1. **Slug/file coverage sync** — every real DRC book (excluding the five textless
   appendix books) has a `haydock/{slug}.json`; the four Gospels have `catena/{slug}.json`.
2. **Father classification** — the **top-15** raw Catena labels by frequency all
   resolve to a **canonical Father** (no fallback), and `isDoctor` matches §6.2 both
   ways (Chrysostom/Augustine/Jerome/Ambrose/Gregory/Basil/Athanasius/Bede → Doctor;
   Origen/Theophylact/Remigius/Rabanus/Alcuin/Eusebius/Gloss → not).
3. **Pseudo + Dionysius** — `Pseudo-Chrysostom` → distinct, not a Doctor; every
   `Dionys*` label → `Pseudo-Dionysius`, not a Doctor.
4. **Gloss** — `Gloss*` labels → `kind: "gloss"`, name "Glossa Ordinaria", not a Father.
5. **Continuation merge** — `groupCatena` folds an empty-`father` note into the
   previous block (block count < note count when a continuation is present).
6. **Newman** — present in the Doctors set; `isDoctor("newman") === true`.

Then `npm test` and `npm run build` green, plus a manual run (`verify`/`run`) to
confirm **zero layout shift** from the dots and the desktop panel / phone sheet split.

---

## 11. Files touched

| File | Change |
|------|--------|
| `src/lib/data.ts` | `+ loadCommentary`, `CommentaryNote`/`CommentaryBook` types |
| `src/lib/commentary.ts` | **new** — `normalizeFather`, `groupCatena`, `fathersOf`, `isDoctor`, `GOSPELS`, Doctors set |
| `src/pages/Reader.tsx` | Haydock load effect, dot render, Commentary action, sheet mount |
| `src/components/Sheet.tsx` | `+ variant?: "sheet" | "panel"` |
| `src/components/CommentarySheet.tsx` | **new** — tabs, chips, Doctors-only, panes |
| `src/lib/storage.ts` | `+ 4` settings + defaults |
| `src/SettingsContext.tsx` | type flow only |
| `src/pages/Settings.tsx` | `+` Commentary section |
| `src/styles.css` | `.cmt-dot`, `.sheet` panel variant, CommentarySheet styles |
| `scripts/test-data.ts` | `+` commentary-UI assertions |
| `CHANGELOG.md`, `package.json` | version bump + entry |
| `CLAUDE.md` | record the §4.2 release |

---

## 12. Known limitations / deferred

- **Vulgate Psalm offsets** (B2) — documented, not mapped.
- **Offline download of commentary** (Settings → Data) — deferred; the SW still caches
  whatever the user views.
- **§5 CCC citation index** — separate PR.
- **Per-Father *era* filtering** (the spec's "by era" aside) — not in this pass; chips
  filter by Father and by Doctor status only.
