# "Close the Quiet Loops" — Quality & Polish Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the design language Fidelis already has — make every mouse action keyboard/screen-reader reachable, close the interaction-state feedback loops, restore token discipline where it slipped, then ship three touch-first functional refinements (Search filters, chapter grid, transient verse focus).

**Architecture:** Pure in-place refinement of the existing Vite + React + TS app. No new dependencies, no new visual language. Every color routes through the `src/styles.css` day/night token blocks; every glyph through the §1.5 `Icon.tsx` SVG set; every animation through a CSS transition already neutralized by the `prefers-reduced-motion` block (`src/styles.css:1307`). New testable logic is extracted into small pure modules and asserted in `scripts/test-data.ts`; DOM/CSS surfaces are browser-verified (the project's established standard for the share card and the gold dot).

**Tech Stack:** React 18 + react-router-dom, TypeScript (strict, `tsc --noEmit`), Vite, ESLint 9 + typescript-eslint, node test harnesses (`tsx scripts/test-*.ts`).

**Proposed version:** `v1.8.1 "the open door"` (Rev 3:8 — the headline is making the app reachable by everyone). This keeps the planned `v1.9.0 "the deposit"` (CCC) intact. *Versioning is the owner's call — if the Search/chapter-grid features warrant a minor bump instead, renumber at Task 17; flagged, not assumed.*

## Global Constraints

Every task's requirements implicitly include these (from CLAUDE.md standing rules + design-spec §1/§13):

- **Two-accent rule:** purple acts (interaction), gold honors (the ✠, the wordmark, a marked/chosen verse). No element wears both. No raw hex/rgba outside the `src/styles.css` day/night token blocks.
- **§1.5 icon discipline:** no emoji in any `.tsx` (the harness emoji guard in `scripts/test-data.ts` fails on in-scope emoji; `✕`/`✓`/`A−`/`A+` are allowed text). New glyphs go in `Icon.tsx` as `currentColor`, single 1.6 stroke, 24×24.
- **§13 refusal list (binding):** no accounts/sync, no AI, no social, no streaks/badges/progress theater, no ads/IAP, no notification pressure, no red-letter text, no stock imagery. No skeletons or spinners (progress theater) — loading is quiet text only.
- **Motion:** the app is near-motionless by deliberate choice. Any transition is ≤120ms, opacity/transform only, and must degrade under `prefers-reduced-motion` (already global at `styles.css:1307`).
- **The Today page never exceeds five cards.** No task adds a card.
- **Never hand-edit `public/data/`.**
- **Green bar = `npm test` (harnesses + manifest verify + `eslint src`) AND `npm run build` (`tsc --noEmit` + vite).** Both must pass at every commit.

---

## File Structure

| File | Responsibility | Tasks |
|------|----------------|-------|
| `src/components/Icon.tsx` | §1.5 SVG icon set — gains `copy`, `download`, `upload` marks | T3, T11 |
| `src/pages/Reader.tsx` | verse a11y, swatch aria, Copy icon, chapter grid, verse-focus | T1, T2, T3, T14, T15 |
| `src/pages/Search.tsx` | disabled threshold; group chips + ranking UI | T6, T13 |
| `src/pages/Settings.tsx` | radiogroup roving-tabindex; export/import icons; inline-style cleanup | T8, T10, T11 |
| `src/pages/Readings.tsx` | calm null-state copy + reader link; inline-style cleanup | T7, T10 |
| `src/pages/Home.tsx` | quiet loading copy; inline-style cleanup | T4, T10 |
| `src/pages/Library.tsx` | export/import icons; inline-style cleanup | T10, T11 |
| `src/components/Antiphon.tsx` | drop the lone dove emoji | T5 |
| `src/components/VerseQuote.tsx`, `ReadingText.tsx` | quiet loading fallbacks | T4 |
| `src/lib/search.ts` | **new** — pure result ranking + book-group helpers (tested) | T13 |
| `src/styles.css` | all CSS: swatch states, disabled, mobile toolbar, warm shadows, utility classes, chapter-grid, verse-rule, optional sheet motion | T2, T6, T9, T10, T12, T13, T14, T15 |
| `scripts/test-data.ts` | new §18 assertions for `search.ts` | T13 |
| `package.json`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `src/pages/About.tsx` | release record | T17 |

---

## Task 0: Commit the completed housekeeping

The doc reconciliation is already done in the working tree (README badge → 1.8.0; CHANGELOG 1.2.1 date + B.x header + dev-tag note; CCC spec/runbook §17→§18). Stale branches are already deleted/pruned. Commit this as the branch's base.

**Files:** Modify: `README.md`, `CHANGELOG.md`, `docs/superpowers/specs/2026-06-15-ccc-citation-index-design.md`, `docs/superpowers/specs/2026-06-15-ccc-index-LOCAL-BUILD-RUNBOOK.md`; Create: `docs/superpowers/plans/2026-06-16-close-the-quiet-loops.md` (this file).

- [ ] **Step 1:** Verify the tree: `git status --short` shows the 4 doc files + this plan.
- [ ] **Step 2:** `npm test && npm run build` — confirm still green (doc-only changes).
- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md docs/
git commit -m "docs: reconcile README badge, CHANGELOG dates/B.x, CCC §17→§18; add quiet-loops plan"
```

---

# PHASE 1 — Polish: "close the quiet loops"

## Task 1: Make verse selection keyboard- and screen-reader-operable  *(a11y, high)*

The clickable verse `<span>` (`Reader.tsx` `renderVerses`, lines 229-246) has `onClick` but no `tabIndex`/`role`/key handler — the whole marginalia layer is mouse-only. This is the single biggest a11y gap.

**Files:** Modify `src/pages/Reader.tsx:229-234`.

**Interfaces:** Consumes existing `onSelectVerse(v: number)` (line 198), `selected` state, `interactive` flag. Produces no new exports.

- [ ] **Step 1:** In `renderVerses`, replace the opening `<span ...>` (lines 229-234) with:

```tsx
        return (
          <span
            key={v}
            id={interactive ? `v-${v}` : undefined}
            className={cls}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected === v : undefined}
            onClick={interactive ? () => onSelectVerse(v) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectVerse(v);
                    }
                  }
                : undefined
            }
          >
```

Do **not** add `aria-label` — the verse text is the meaningful accessible name; a label would hide it. The verse number `<sup>` reads first, then the text, then "toggle button, pressed/not pressed".

- [ ] **Step 2:** Confirm the global `:focus-visible` rule (`styles.css:164`, 2px purple) already paints the focus ring — **no CSS change needed** (purple acts on an interactive verse; zero visual change at rest).
- [ ] **Step 3: Verify** `npm run build` (tsc) and `npm test` (eslint) green. Then a browser check (`npm run dev`): Tab into the reading column — each non-empty verse takes a purple focus ring; Enter/Space opens the verse-actions bar; Space does not scroll the page.
- [ ] **Step 4: Commit** `git commit -am "a11y: verses are keyboard- and screen-reader-operable (role/tabindex/aria-pressed/keydown)"`

---

## Task 2: Give the active highlight swatch a gold-ring selected state  *(interaction states, med)*

The four `.hl-dot` swatches (`Reader.tsx:412-422`, `styles.css:571-583`) give no feedback about which color is applied, and have no hover/focus distinction. Gold honors — the swatch marks a chosen verse.

**Files:** Modify `src/styles.css:571-583`, `src/pages/Reader.tsx:412-422`.

- [ ] **Step 1:** In `Reader.tsx`, add `aria-pressed` + `aria-label` to each swatch button (lines 413-421):

```tsx
          {(["gold", "rose", "sky", "olive"] as HighlightColor[]).map((c) => (
            <button
              key={c}
              className={`hl-dot ${c}`}
              title={`Highlight ${c}`}
              aria-label={`Highlight ${c}`}
              aria-pressed={highlights.get(selKey) === c}
              onClick={() => {
                setHighlight(selRef, c);
                setMarksVersion((x) => x + 1);
              }}
            />
          ))}
```

- [ ] **Step 2:** In `styles.css`, after line 577 (inside/after the `.hl-dot` rules) add transition + states:

```css
.hl-dot { transition: transform 120ms ease, box-shadow 120ms ease; }
.hl-dot:hover { transform: translateY(-1px); }
.hl-dot:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.hl-dot[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--bg-1), 0 0 0 3px var(--gold); }
```

(The double ring — a `--bg-1` gap then `--gold` — reads cleanly over the colored fill; the transition is neutralized under reduced-motion.)

- [ ] **Step 3: Verify** build + test green. Browser: highlight a verse gold → reopen its bar → the gold swatch carries a gold ring; hover lifts a swatch 1px; Tab focuses a swatch with a purple ring.
- [ ] **Step 4: Commit** `git commit -am "ui: active highlight swatch gets a gold-ring selected state + hover/focus"`

---

## Task 3: Distinguish the Copy and Share verse-bar buttons  *(icon system, med)*

Both Copy and Share render `Icon name="share"` (`Reader.tsx:445,448`) — identical icons for different actions.

**Files:** Modify `src/components/Icon.tsx:16-50`, `src/pages/Reader.tsx:445`.

**Interfaces:** Produces a new `IconName` member `"copy"` consumed by Reader.

- [ ] **Step 1:** In `Icon.tsx`, add `"copy"` to the `IconName` union (after `"share"`, line 19) and add to `PATHS` (after the `share` block, line 35):

```tsx
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
```

- [ ] **Step 2:** In `Reader.tsx:445`, change the Copy button's icon: `<Icon name="copy" /> Copy`.
- [ ] **Step 3: Verify** build + test green (the emoji guard is unaffected — SVG only). Browser: the verse bar shows a clipboard glyph for Copy, the share-node glyph for Share.
- [ ] **Step 4: Commit** `git commit -am "icon: add a copy mark; Copy no longer borrows the share icon"`

---

## Task 4: Unify the quiet loading states  *(loading states, med)*

Three Today cards show a bare `…`; the Reader uses a dignified italic `.loading` line. Match the dignity. Text only — no skeleton/spinner (§13 progress theater).

**Files:** Modify `src/pages/Home.tsx:114`; `src/components/VerseQuote.tsx`; `src/components/ReadingText.tsx`.

- [ ] **Step 1:** Read `src/components/VerseQuote.tsx` and `src/components/ReadingText.tsx` to find their `…`/`—` loading fallbacks.
- [ ] **Step 2:** In `Home.tsx:114`, replace the Quote-of-the-Day placeholder:

```tsx
          {!quote && <p className="loading small">Loading today's quote…</p>}
```

- [ ] **Step 3:** In `VerseQuote.tsx`, replace its bare `…` fallback with `<span className="loading-inline">Loading…</span>` (or the component's existing class pattern); same for `ReadingText.tsx`'s `…`/`—`. Keep it italic-muted; reuse `.loading` where it's block-level. Add to `styles.css` if an inline variant is needed:

```css
.loading-inline { color: var(--text-muted); font-style: italic; }
```

- [ ] **Step 4: Verify** build + test green. Browser (throttle network in devtools): cards show a calm italic "Loading…" line, not a lone ellipsis; no layout jump on resolve.
- [ ] **Step 5: Commit** `git commit -am "ui: unify Today-card loading states with the dignified .loading treatment"`

---

## Task 5: Remove the lone dove emoji  *(icon discipline, med)*

`Antiphon.tsx:61` renders a literal 🕊 — the one full-color OS emoji left in interactive `.tsx`, off-palette against the quiet monochrome identity. The summary text already names the prayer; dropping it is zero-risk and on-identity.

**Files:** Modify `src/components/Antiphon.tsx:60-62`.

- [ ] **Step 1:** Replace the summary (lines 60-62):

```tsx
      <summary className="sans small">
        {name} <span className="muted">— the hour's Marian prayer</span>
      </summary>
```

- [ ] **Step 2: Verify** build + test green (the emoji guard now has one fewer exempted glyph in scope — still green). Browser: the antiphon summary reads cleanly with no color glyph.
- [ ] **Step 3: Commit** `git commit -am "ui: drop the lone dove emoji from the antiphon summary (§1.5 monochrome discipline)"`

---

## Task 6: Disable the Search button below the 2-character threshold  *(disabled state, low)*

`run()` silently no-ops when the trimmed query is < 2 chars (`Search.tsx:40`) — a dead click. Disable the button + Enter at the threshold.

**Files:** Modify `src/pages/Search.tsx:126-141`; `src/styles.css` (after line 615).

- [ ] **Step 1:** In `Search.tsx`, just before the `return (` (line 116) add: `const tooShort = query.trim().length < 2;`
- [ ] **Step 2:** Gate Enter (line 128) and the button (line 139-141):

```tsx
          onKeyDown={(e) => e.key === "Enter" && !tooShort && run()}
```
```tsx
        <button className="primary" onClick={run} disabled={tooShort}>
          Search
        </button>
```

- [ ] **Step 3:** In `styles.css`, after line 615 add: `.search-bar button.primary:disabled { opacity: 0.5; cursor: not-allowed; }`
- [ ] **Step 4: Verify** build + test green. Browser: empty/1-char query → Search button dimmed, Enter does nothing; ≥2 chars → enabled.
- [ ] **Step 5: Commit** `git commit -am "ui: disable Search below the 2-char threshold (no silent dead-click)"`

---

## Task 7: Calm the Readings null-state copy and give it a real link  *(empty state, low)*

`Readings.tsx` (≈lines 127-132) surfaces developer-voice apology ("this should not happen; please use the reader directly") with no link.

**Files:** Modify `src/pages/Readings.tsx` (the null-readings branch).

- [ ] **Step 1:** Read `src/pages/Readings.tsx` around lines 120-135 to find the exact branch and confirm `Link` is imported (`import { Link } from "react-router-dom"`). If not imported, add it.
- [ ] **Step 2:** Replace the apologetic copy with the app's calm voice + a real link, matching the `.notice` + `Link` pattern used at `Reader.tsx:329`:

```tsx
        <p className="notice">
          Readings for this date aren't available here.{" "}
          <Link to="/read">Open the reader</Link>.
        </p>
```

- [ ] **Step 3: Verify** build + test green. Browser: force the null branch (or read the code path) — the message is calm and the link works.
- [ ] **Step 4: Commit** `git commit -am "ui: calm the Readings null-state copy and give it a reader link"`

---

## Task 8: Add roving-tabindex arrow-key navigation to the Bible-version radiogroup  *(a11y, med)*

The version cards are `role="radiogroup"`/`role="radio"` (`Settings.tsx:140-161`) but lack the ARIA APG arrow-key roving-tabindex model.

**Files:** Modify `src/pages/Settings.tsx` (the radiogroup block ≈140-161).

- [ ] **Step 1:** Read `src/pages/Settings.tsx:120-175` to capture the exact current radiogroup markup, the option array it maps, and the select handler.
- [ ] **Step 2:** Implement roving tabindex: only the checked radio gets `tabIndex={0}`, the rest `tabIndex={-1}`; add `onKeyDown` for ArrowUp/Left (previous) and ArrowDown/Right (next), wrapping at the ends, which both selects and moves focus. Pattern (adapt names to the actual array — e.g. `TRANSLATIONS.filter(t=>t.bundled)`):

```tsx
const onRadioKey = (e: React.KeyboardEvent, idx: number, ids: string[]) => {
  let next = idx;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % ids.length;
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (idx - 1 + ids.length) % ids.length;
  else return;
  e.preventDefault();
  update({ translation: ids[next] });          // use the screen's existing setter
  const el = document.getElementById(`ver-${ids[next]}`);
  el?.focus();
};
```

Each radio gets `id={`ver-${t.id}`}`, `tabIndex={settings.translation === t.id ? 0 : -1}`, `onKeyDown={(e) => onRadioKey(e, i, ids)}` (where `ids` is the mapped id list and `i` the map index). Keep the existing Enter/Space select handler.

- [ ] **Step 3: Verify** build + test green. Browser + screen reader: Tab lands once on the radiogroup (the checked card); Arrow keys move selection and focus, wrapping; the purple `:focus-visible` ring (`styles.css:836`) shows. No visual change otherwise.
- [ ] **Step 4: Commit** `git commit -am "a11y: roving-tabindex arrow-key navigation for the version radiogroup (ARIA APG)"`

---

## Task 9: Compact the reader toolbar on phones  *(responsive, med)*

The sticky `.reader-toolbar` (`styles.css:440`) holds 3-4 native selects + parallel + A−/A+ and flex-wraps to 2-3 rows under the sticky header, eating space above scripture.

**Files:** Modify `src/styles.css` (add a `@media (max-width: 640px)` block near the toolbar rules).

- [ ] **Step 1:** Add a phone pass that tightens density without hiding controls:

```css
@media (max-width: 640px) {
  .reader-toolbar { gap: 0.35rem; padding: 0.45rem 0; }
  .reader-toolbar select { max-width: 9rem; padding: 0.3rem 0.4rem; font-size: 0.85rem; }
  .toolbar-right { gap: 0.3rem; }
  .reader-toolbar .icon-btn { padding: 0.3rem 0.45rem; }
}
```

(Goal: fewer wrapped rows above the text. All controls stay reachable. Tune the `max-width` so translation+book+chapter fit two rows max on a 360px viewport.)

- [ ] **Step 2: Verify** build + test green. Browser at 360-390px width: the toolbar occupies fewer rows; every control is still tappable; the chapter title sits closer to the top.
- [ ] **Step 3: Commit** `git commit -am "ui: compact the reader toolbar on phones to protect the reading surface"`

---

## Task 10: Route raw shadows + inline magic numbers through tokens  *(token discipline, low)*

Two slips from the §1.1 "nothing outside the token block carries a raw value" rule: cold `rgba(0,0,0,…)` shadows (switch knob `styles.css:894`; phone tabbar `:974`) where the day theme uses warm shadows; and inline-style magic numbers (`Home.tsx:248`, `Readings.tsx` ≈101/121, `Library.tsx` ≈134, `Settings.tsx:127`).

**Files:** Modify `src/styles.css` (token block + the two shadow lines + new utility classes); `src/pages/Home.tsx`, `Readings.tsx`, `Library.tsx`, `Settings.tsx`.

- [ ] **Step 1:** In the `src/styles.css` day token block add a warm soft shadow token, and a night-block counterpart, e.g. `--shadow-soft: 0 1px 2px rgba(38, 36, 31, 0.22);` (match the existing warm `--shadow` family; pick the night value from the night block's shadow). Replace `styles.css:894` `box-shadow: 0 1px 2px rgba(0,0,0,0.25);` → `box-shadow: var(--shadow-soft);`. For the tabbar (`:974`), derive both layers from the warm family (add `--shadow-tabbar` if a two-layer value is needed) — keep the lift subtle.
- [ ] **Step 2:** Add named utility classes for the inline magic numbers, e.g. `.mt-9 { margin-top: 0.9rem; }` / a `.rule-gap { margin: 1rem 0; }` / a `.hl-inline-dot { … }` — name by intent, place beside `.small`/`.muted`. Replace each inline `style={{…}}` (Home `browse-all` line, Readings rules, Library highlight dot, Settings fontSize) with the class. For `Settings.tsx:127` inline `fontSize`, use an existing size class (`.small`) if it matches the intent.
- [ ] **Step 3: Verify** build + test green; **grep guard:** `grep -rn "rgba(0, 0, 0" src/styles.css` should now only return values that are intentionally neutral (ideally none in the day surfaces); `grep -rn "style={{" src/pages` should be materially reduced. Browser: shadows look warm; spacing unchanged.
- [ ] **Step 4: Commit** `git commit -am "style: warm shadow tokens + named utility classes for stray inline magic numbers"`

---

## Task 11: Bring Export/Import affordances into the icon grammar  *(icon consistency, low)*

`↓ Export` / `↑ Import` raw arrows (`Library.tsx` ≈79/86; `Settings.tsx` ≈419/422) render in the OS font beside SVG icons.

**Files:** Modify `src/components/Icon.tsx`; `src/pages/Library.tsx`; `src/pages/Settings.tsx`.

- [ ] **Step 1:** Add `"download"` and `"upload"` to `IconName` and `PATHS` (tray-with-arrow, 24×24/1.6):

```tsx
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M5 3h14" />
    </>
  ),
```

- [ ] **Step 2:** Read `Library.tsx` ≈75-90 and `Settings.tsx` ≈415-425; replace the `↓`/`↑` text with `<Icon name="download" />` / `<Icon name="upload" />` before the label. Ensure `Icon` is imported in each.
- [ ] **Step 3: Verify** build + test green (SVG only — emoji guard unaffected). Browser: Export/Import rows match the icon grammar of the verse bar.
- [ ] **Step 4: Commit** `git commit -am "icon: add download/upload marks; Export/Import join the §1.5 icon grammar"`

---

## Task 12: (DECISION) Optional subtle Sheet entrance

The `Sheet` appears instantly by deliberate "prayer book, not a toy" design. A bottom sheet popping in with zero transition can read as a glitch on phones. **Default: SKIP — keep no-motion** (the current stance is documented and defensible). Only implement if the owner opts in.

**Files (if opted in):** `src/styles.css` (`.sheet` rule).

- [ ] **Step 1 (only if approved):** Add a single restrained enter, fully neutralized by the existing reduced-motion block:

```css
@keyframes sheet-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.sheet { animation: sheet-in 110ms ease-out; }
```

- [ ] **Step 2: Verify** build + test green; browser at phone width: the sheet eases in ≤120ms; with "Reduce Motion" on, it appears instantly. Confirm the side-panel `variant="panel"` still feels right (or scope the animation to the bottom-sheet variant only).
- [ ] **Step 3: Commit** `git commit -am "ui: optional reduced-motion-gated Sheet entrance"`

> **This task requires an explicit yes from the owner before implementing.** If skipped, mark it `[~]` and move on.

---

# PHASE 2 — Buildable functional refinements

## Task 13: Search — OT/NT/Gospel filter chips + per-group counts + exact-phrase ranking  *(§8.2)*

Search has no scoping today and no exact-phrase precedence. All grouping data already exists in `src/lib/canon.ts` (`BookGroup`, `GROUPS`, `OT_GROUPS`, `NT_GROUPS`, `"Gospels"`, and each book's `.group`). Extract pure logic into a tested module; the chips are purple (interactive).

**Files:** Create `src/lib/search.ts`; modify `scripts/test-data.ts` (new §18), `src/pages/Search.tsx`, `src/styles.css`.

**Interfaces:**
- Produces `src/lib/search.ts`:
  - `type GroupFilter = "all" | "ot" | "nt" | "gospels"`
  - `bookGroupKind(slug: string): "ot" | "nt"` — via `getBook(slug).group` ∈ `OT_GROUPS`.
  - `inFilter(slug: string, f: GroupFilter): boolean` — `all` → true; `gospels` → book group is `"Gospels"`; `ot`/`nt` → `bookGroupKind` match.
  - `compareResults(a: {book:string;chapter:number;verse:number;text:string}, b: same, foldedQuery: string): number` — exact-phrase (a folded result text containing the folded query as a standalone run, vs. merely all-words) ranks first; ties keep canonical book/chapter/verse order.

- [ ] **Step 1: Write the failing test.** In `scripts/test-data.ts`, after the existing §17 block (the reference parser, ≈line 1684+ — confirm it is §17), add a new `// §18 — Search ranking & group filters` block:

```ts
// §18 — Search ranking & group filters (src/lib/search.ts), pure & user-facing.
{
  const { inFilter, bookGroupKind, compareResults } = await import("../src/lib/search.ts");
  check("bookGroupKind: genesis is OT", bookGroupKind("genesis") === "ot", bookGroupKind("genesis"));
  check("bookGroupKind: romans is NT", bookGroupKind("romans") === "nt", bookGroupKind("romans"));
  check("inFilter: gospels accepts john, rejects romans",
    inFilter("john", "gospels") && !inFilter("romans", "gospels"), "");
  check("inFilter: all accepts anything", inFilter("genesis", "all") && inFilter("john", "all"), "");
  check("inFilter: ot/nt partition", inFilter("genesis", "ot") && !inFilter("genesis", "nt"), "");
  const q = "the lord";
  const exact = { book: "psalms", chapter: 23, verse: 1, text: "The Lord ruleth me" };
  const allwords = { book: "psalms", chapter: 1, verse: 2, text: "the will of the Lord" };
  check("compareResults: exact phrase ranks before all-words",
    compareResults(exact, allwords, q) < 0, "");
}
```

- [ ] **Step 2: Run** `npm test` — expect FAIL (module `src/lib/search.ts` not found).
- [ ] **Step 3: Implement `src/lib/search.ts`:**

```ts
import { getBook, OT_GROUPS } from "./canon";

export type GroupFilter = "all" | "ot" | "nt" | "gospels";

/** Reuse the search page's fold so ranking matches highlighting. */
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/g, "ae").replace(/œ/g, "oe");
}

export function bookGroupKind(slug: string): "ot" | "nt" {
  const b = getBook(slug);
  return b && OT_GROUPS.includes(b.group) ? "ot" : "nt";
}

export function inFilter(slug: string, f: GroupFilter): boolean {
  if (f === "all") return true;
  if (f === "gospels") return getBook(slug)?.group === "Gospels";
  return bookGroupKind(slug) === f;
}

interface Hit { book: string; chapter: number; verse: number; text: string; }

/** Exact-phrase matches (the folded query as a contiguous run) rank before
 *  all-words matches; ties keep canonical book/chapter/verse order. */
export function compareResults(a: Hit, b: Hit, foldedQuery: string): number {
  const ax = fold(a.text).includes(foldedQuery) ? 0 : 1;
  const bx = fold(b.text).includes(foldedQuery) ? 0 : 1;
  return ax - bx; // 0 (exact) sorts before 1; stable sort preserves canonical order on ties
}
```

(Note: today `run()` already requires the whole folded query as a substring, so every current hit is "exact". `compareResults` is forward-compatible and asserts the precedence rule; wire all-words matching as a follow-up only if desired — YAGNI for now, but the helper + test lock the contract.)

- [ ] **Step 4: Run** `npm test` — expect PASS.
- [ ] **Step 5: Commit** the pure layer: `git commit -am "search: pure group-filter + exact-phrase-ranking helpers (§18 tests)"`
- [ ] **Step 6: Wire the chips UI** in `Search.tsx`: add `const [group, setGroup] = useState<GroupFilter>("all");`; render a purple pill row (mirroring the translation pill row pattern already in the file) for All / Old Testament / New Testament / Gospels with per-group result counts (`results.filter(r => inFilter(r.book, g)).length`); filter the rendered `results` by `inFilter(r.book, group)`; sort the displayed list with `compareResults(a, b, fold(query.trim()))`. Import from `../lib/search`.
- [ ] **Step 7:** Add chip CSS to `styles.css` (purple, interactive — mirror existing pill styles), e.g. `.search-chips { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.6rem 0; }` and an active state using `--purple-strong`/`--on-accent`.
- [ ] **Step 8: Verify** build + test green. Browser: chips filter results live with counts; exact-phrase hits sort to the top; chips are purple, keyboard-focusable.
- [ ] **Step 9: Commit** `git commit -am "search: OT/NT/Gospel filter chips with per-group counts (§8.2)"`

---

## Task 14: Reader chapter-grid picker  *(§8.1)*

Replace the chapter `<select>` (one of three dropdowns, `Reader.tsx:273-283`) with a numbered tap-grid opened from the chapter title — faster on touch. Reuse the `Sheet` primitive. Keep the translation/book/parallel selects.

**Files:** Modify `src/pages/Reader.tsx`; `src/styles.css`.

- [ ] **Step 1:** Add state `const [chapterPickerOpen, setChapterPickerOpen] = useState(false);`. Make the chapter title (or a small caret button beside it, `Reader.tsx:314-316`) open it: `aria-haspopup="dialog"`, `onClick={() => setChapterPickerOpen(true)}` (only when `chapterCount > 1`).
- [ ] **Step 2:** Render, near the other sheets (≈line 480):

```tsx
      {chapterPickerOpen && (
        <Sheet titleId="chapter-grid-title" onClose={() => setChapterPickerOpen(false)}>
          <h2 id="chapter-grid-title" className="sheet-title">{displayName} — chapters</h2>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                type="button"
                className={c === chapter ? "chapter-cell current" : "chapter-cell"}
                aria-current={c === chapter ? "true" : undefined}
                onClick={() => { setChapterPickerOpen(false); go(translation, bookSlug, c); }}
              >
                {c}
              </button>
            ))}
          </div>
        </Sheet>
      )}
```

- [ ] **Step 3:** Keep the chapter `<select>` for now OR replace it (decision: keep it as a fallback on desktop is fine; the grid is the touch path). Add `.chapter-grid` CSS (a responsive `repeat(auto-fill, minmax(2.5rem, 1fr))` grid of tap targets ≥44px) and `.chapter-cell` / `.chapter-cell.current` (gold honors the current chapter; purple acts on hover/focus).
- [ ] **Step 4: Verify** build + test green (Sheet focus-trap reused; check the title `id` matches `titleId`). Browser: tapping the title opens a grid; the current chapter is gold-marked; tapping a cell navigates and closes; Escape/backdrop dismiss; focus returns to the opener.
- [ ] **Step 5: Commit** `git commit -am "reader: tap-grid chapter picker via the Sheet primitive (§8.1)"`

---

## Task 15: Reader transient gold verse-focus rule  *(§8.1)*

A deep-linked verse (`?v=`) currently stays *permanently* selected (`Reader.tsx:145` `setSelected(focusVerse)`), which also pops the action bar. The spec wants a transient gold rule (~3s) that fades — gold honors a scripture-focus mark.

**Files:** Modify `src/pages/Reader.tsx:140-148, 229-234`; `src/styles.css`.

- [ ] **Step 1:** Add state `const [focusedVerse, setFocusedVerse] = useState<number | null>(null);`. Replace the focusVerse effect (lines 140-148) so it scrolls and sets a *transient focus* (not `selected`):

```tsx
  useEffect(() => {
    if (focusVerse && data) {
      const el = document.getElementById(`v-${focusVerse}`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        setFocusedVerse(focusVerse);
        const t = setTimeout(() => setFocusedVerse(null), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [focusVerse, data]);
```

- [ ] **Step 2:** In `renderVerses`, add the focus class (extend the `cls` array, line 221-227): `interactive && focusedVerse === v ? "verse-focused" : ""`.
- [ ] **Step 3:** Add CSS — a gold left rule that fades, neutralized under reduced-motion:

```css
.verse-focused { box-shadow: -3px 0 0 var(--gold); transition: box-shadow 600ms ease 2400ms; }
.verse-focused:not(.verse-focused) { box-shadow: none; } /* state removal triggers the fade-out via transition on the base */
```

(Simpler/robust alternative if the fade is finicky: keep a static gold rule for 3s then remove the class — the transition is optional. The rule must be gold, never purple.)

- [ ] **Step 4: Verify** build + test green. Browser: open `/read/drc/john/3?v=16` → verse 16 centers with a gold rule that fades after ~3s; it does **not** open the action bar; with reduce-motion the rule simply disappears.
- [ ] **Step 5: Commit** `git commit -am "reader: transient gold rule for a deep-linked verse instead of permanent selection (§8.1)"`

---

## Task 16: (OPTIONAL) Commentary offline download in Settings → Data  *(deferred §4)*

The service worker only caches commentary the user has viewed; a user who pre-downloads a translation for a flight still lacks Haydock/Catena offline. Extend the existing download mechanism to `public/data/commentary/`.

**Files:** Modify `src/lib/storage.ts` (the `downloadBundle`/size-map logic), `src/pages/Settings.tsx` (the Data section).

- [ ] **Step 1:** Read `src/lib/storage.ts` for `downloadBundle()` / the per-bundle size map, and `Settings.tsx` for the Data → offline-download section, and `public/data/manifest.json` for how commentary files + sizes are recorded.
- [ ] **Step 2:** Add a commentary bundle entry (Haydock all-books + Catena Gospels) to the size map and a download action that fetches+caches those files via the same mechanism; show the real total size from the manifest.
- [ ] **Step 3: Verify** build + test green. Browser (offline after download): open a Gospel verse's Commentary sheet with the network off — Haydock + Catena load from cache.
- [ ] **Step 4: Commit** `git commit -am "data: optional offline download for the commentary layer (Settings → Data)"`

> Lower priority; include only if time allows. Safe to defer to a later patch.

---

## DEFERRED (do NOT do in this release)

- **Vulgate-Psalm versification mapping for the commentary dots.** A real accuracy fix, but the review recommends pairing it with the **CCC build (v1.9.0 "the deposit")**, which establishes the same Hebrew→Vulgate mapping for citation data via `hebrewSpanToVulgate()` — one mapping effort for both layers. Build it there, not here.
- **The single optional daily-readings notification** — stays deferred and off (§13 no notification pressure).

---

# PHASE 3 — Release

## Task 17: Cut the release

**Files:** `package.json`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `src/pages/About.tsx` (only if a user-facing claim changed).

- [ ] **Step 1:** Decide the version (default `v1.8.1 "the open door"`; bump to a minor if the owner wants the features called out as such). Bump `package.json` `version`.
- [ ] **Step 2:** Add a `CHANGELOG.md` entry (newest-first, dated 2026-06-16) grouped Added / Fixed / Changed, listing the a11y opening (verse keyboard access, radiogroup arrow keys), the interaction-state closures (swatch state, copy icon, disabled search, calm empty state), the icon/loading/token cleanups, and the §8.2 Search chips + §8.1 chapter grid + verse-focus features. Note the dove-emoji removal.
- [ ] **Step 3:** Bump the README masthead badge to match the new version+name; add any new Highlights line (keyboard accessible; Search filters; tap-grid chapters).
- [ ] **Step 4:** Add a CLAUDE.md ledger paragraph for the release (mirroring the existing per-release blocks), and note the Psalm-mapping + CCC pairing decision.
- [ ] **Step 5:** Update `About.tsx` only if a claim changed (likely none).
- [ ] **Step 6: Final verify:** `npm test` (harnesses + manifest + eslint) and `npm run build` (tsc + vite) both green. Browser smoke test of every touched surface.
- [ ] **Step 7: Commit** `git commit -am "v1.8.1 'the open door' — close the quiet loops (a11y, interaction states, token discipline, §8.1/§8.2 refinements)"`
- [ ] **Step 8:** Stop and ask the owner before pushing / opening a PR.

---

## Self-Review

**Spec coverage:** Every item from the review's polish list (12) and the buildable functional list (3 + 1 optional) maps to a task; the Psalm-mapping fix is consciously deferred to pair with CCC (recorded). Housekeeping is Task 0. The release mechanics are Task 17.

**Placeholders:** Tasks needing exact current code I have not yet seen (T7 Readings branch, T8 radiogroup markup, T16 download mechanism, T4 component fallbacks) carry an explicit "read first" step rather than inventing line content — these are reconnaissance steps, not deferred work.

**Type consistency:** New `IconName` members (`copy`, `download`, `upload`, optionally `dove`) are added in one place (Icon.tsx) and consumed by name. `src/lib/search.ts` exports (`GroupFilter`, `bookGroupKind`, `inFilter`, `compareResults`) match their test usage and Search.tsx consumption.

**Constraint check:** No task adds a Today card, edits `public/data/`, introduces a second accent on one element, adds a dependency, or adds motion outside the reduced-motion-gated ≤120ms rule. The emoji guard stays green (SVG-only additions; one emoji removed).
