# The Collapsing Masthead (v1.16.0 "upon the candlestick") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the phone navigation from a fixed bottom tab bar to a collapsing top masthead (gold brand row scrolls away, slim tab row pins), give the Reader a two-row pinned "folio line," collapse the Mass page's two control rows into one, and ship it as v1.16.0.

**Architecture:** The collapse is pure document flow — no JS, no animation. On phones the header's boxes dissolve (`display: contents` on `.header`/`.header-inner`), so the brand link and the `<nav class="nav tabbar">` become direct rows of the `.app` flex column: the brand row sits in normal flow and scrolls off; the tab row is `position: sticky; top: env(safe-area-inset-top)` and pins (its containing block is the full-height `.app`, so the sticky escapes the old header bounds — this is the load-bearing trick; a sticky row nested inside a header-sized box could never outlive its parent). A fixed, `aria-hidden` **status strip** (`height: env(safe-area-inset-top)`, `--bg-1`) always paints under the iOS status bar. Desktop ≥640px CSS is byte-for-byte untouched.

**Tech Stack:** React 18 + TypeScript + Vite, plain CSS custom properties (`src/styles.css`), the two existing test harnesses (source-shape guards in `scripts/test-data.ts`).

**Spec:** `docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md` (owner-approved). Read it before starting.

## Global Constraints

- **No engine, data, or golden changes.** Never run `npm run golden`; a golden diff = you broke something (spec §8).
- **Never hand-edit `public/data/`** (CLAUDE.md standing rule 1). `public/sw.js` is NOT under `public/data/` and is hand-maintained — editing it is correct.
- **Today page untouched** — five cards, same order (standing rule 2).
- **Two-accent rule:** purple acts, gold honors. The brand stays gold; active tabs stay `--purple`. No element wears both.
- **No new animation or motion anywhere**; nothing to gate behind `prefers-reduced-motion`.
- **Touch targets:** every tab-row link keeps `min-height: 44px`, flex-centered (iOS HIG).
- **Search page: zero page-level changes** (owner correction in spec §2). Do not touch `src/pages/Search.tsx`.
- **Desktop ≥640px: visually unchanged.** The base (desktop) CSS rules for `.header`, `.header-inner`, `.nav`, `.more-menu` are not edited except where a rule was phone-only.
- **No emoji glyphs in `.tsx`** — the harness forbids rendering `⚑ ✎ ☾ ☀ ⧉ ✠ ✕ ✓`. (`‹`, `›`, `∥`, `−`, `▾`-as-SVG are fine; use inline SVG carets, not `▾` text, to match TabBar's existing pattern.)
- **Version:** v1.16.0 "upon the candlestick" (Matthew 5:15). `package.json` 1.16.0; sw `SHELL_CACHE` v5→v6; iOS `MARKETING_VERSION` 1.16.0 (all four build configurations); Android `versionName` "1.16.0" / `versionCode` 11600.
- Work on branch `release/v1.16.0`; commit at the end of every task; `npm test` and `npm run build` must be green before each commit.

## File Structure

| File | Responsibility in this release |
|---|---|
| `src/styles.css` | All layout changes: status strip, phone masthead block (replaces the bottom-bar block at lines ~1376–1446), folio-line styles, one-row Mass styles, clearance deletions |
| `src/App.tsx` | Mounts the status strip (one line) |
| `src/components/Header.tsx` | Brand link gets `className="brand-link"`; doc comment updated |
| `src/components/TabBar.tsx` | Doc comment updated only — **no code changes** (overlay/Escape/outside-tap behavior already correct for a dropdown) |
| `src/pages/Reader.tsx` | Toolbar → folio line; chapter picker extended to all books; "Aa" type-menu sheet; crumb retired |
| `src/pages/Readings.tsx` | Two control rows → one |
| `scripts/test-data.ts` | §11 acceptance checks rewritten (they assert the OLD bottom bar and would go red); new §26/§27/§28 source-shape guards |
| `public/sw.js`, `package.json`, `ios/App/App.xcodeproj/project.pbxproj`, `android/app/build.gradle`, `CHANGELOG.md`, `CLAUDE.md`, `docs/history/RELEASES.md` | Release mechanics (Task 5) |

**Untouched by design:** `src/lib/**` (all engines), `scripts/golden/**`, `public/data/**`, `src/pages/Search.tsx`, `src/pages/Home.tsx`, `src/components/{Sheet,ScrollManager,SectionNav}.tsx`, widgets, `capacitor.config.ts`.

---

### Task 1: The collapsing masthead — phone top navigation + status strip + harness guards

The phone bottom bar becomes the collapsing masthead. TDD here means **source-shape guards first**: rewrite the three §11 checks that pin the old bottom bar, add the new §26 guards, watch them fail, then implement.

**Files:**
- Modify: `scripts/test-data.ts` (§11 block ~lines 1125–1143; new §26 block after §25, before the final summary lines ~2511–2512)
- Modify: `src/App.tsx:168-169` (mount strip)
- Modify: `src/components/Header.tsx` (brand-link class + comment)
- Modify: `src/components/TabBar.tsx` (comment only)
- Modify: `src/styles.css` (tokens, base additions, phone block replacement, clearances)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: phone `--header-h` = `calc(2.75rem + env(safe-area-inset-top))` (Tasks 2–3 sticky elements anchor to it); CSS classes `.status-strip`, `.brand-link`; the sticky `.tabbar` at `z-index: 30`, strip at `z-index: 29`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b release/v1.16.0
```

- [ ] **Step 2: Rewrite the three stale §11 checks (the old-bar acceptance)**

In `scripts/test-data.ts`, find the §11 block (search for `"acceptance: the bar pins to the bottom edge`). Replace these three checks:

```ts
  check("acceptance: header cannot wrap at phone width — .header-inner flex-wrap: nowrap",
    /\.header-inner\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
  check("acceptance: the bar pins to the bottom edge — .tabbar position: fixed; bottom: 0",
    /\.tabbar\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*0/.test(css));
```

with:

```ts
  check("acceptance: the masthead dissolves on phones — .header-inner display: contents (v1.16.0)",
    /\.header-inner\s*\{[^}]*display:\s*contents/.test(css));
  check("acceptance: the tab row pins to the top — .tabbar position: sticky; top: env(safe-area-inset-top)",
    /\.tabbar\s*\{[^}]*position:\s*sticky[^}]*top:\s*env\(safe-area-inset-top\)/.test(css));
```

and replace:

```ts
  // Acceptance: the bar respects the iOS home-indicator inset.
  check("acceptance: bar respects iOS safe-area inset — env(safe-area-inset-bottom) on .tabbar",
    /\.tabbar\s*\{[^}]*env\(safe-area-inset-bottom\)/.test(css));
```

with:

```ts
  // Acceptance: the tab row clears the rounded corners in landscape (spec §6).
  check("acceptance: the tab row respects the landscape safe-areas — env(safe-area-inset-left/right)",
    /\.tabbar\s*\{[^}]*env\(safe-area-inset-right\)[^}]*env\(safe-area-inset-left\)/.test(css));
```

(The two `active tab is purple` checks and everything else in §11 stay as they are.)

- [ ] **Step 3: Add the new §26 guard block**

In `scripts/test-data.ts`, immediately before the final two lines (`console.log(`\n${failures ? …`)` / `process.exitCode = …`), add:

```ts
// ── 26. v1.16.0 "upon the candlestick" — the collapsing masthead (design spec
//        docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md §3, §8).
//        Source-shape guards in the §25 manner: none of these has a runtime
//        surface the harness can drive, so each pins the load-bearing token of
//        the layout; a silent revert to the bottom bar goes red here.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const tab = readFileSync(join(ROOT, "src/components/TabBar.tsx"), "utf8");
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");

  // A sticky row cannot grow env() padding only-when-pinned, so a FIXED strip
  // paints the notch area at all times (spec §3) — and App mounts it decoratively.
  check("masthead: the status strip paints the notch (height: env(safe-area-inset-top))",
    /\.status-strip\s*\{[^}]*height:\s*env\(safe-area-inset-top\)/.test(css));
  check("masthead: App mounts the strip aria-hidden",
    /className="status-strip"\s+aria-hidden="true"/.test(app));

  // The bottom bar and everything that existed to clear it are gone (spec §3).
  check("masthead: the bottom tab bar is gone (no .tabbar position: fixed)",
    !/\.tabbar\s*\{[^}]*position:\s*fixed/.test(css));
  check("masthead: the fixed-bar clearances are gone (no 3.25rem footer / 3.75rem verse-actions lift)",
    !css.includes("3.25rem") && !css.includes("3.75rem"));
  check("masthead: the header no longer escalates over the verse-actions bar (no z-index: 45)",
    !css.includes("z-index: 45"));

  // The More dropdown still closes under Android Back / Escape (spec §6).
  check("masthead: the More menu still registers with the overlay-back stack",
    tab.includes("pushOverlay("));

  // Everything sticky hangs off --header-h; on phones it must equal the pinned
  // tab row (44px links = 2.75rem) plus the notch inset (spec §3).
  check("masthead: --header-h re-derives to the pinned tab row on phones",
    css.includes("--header-h: calc(2.75rem + env(safe-area-inset-top))"));
}
```

- [ ] **Step 4: Run the harness — the new checks must FAIL**

Run: `npm test`
Expected: FAIL — the §11 rewrites and every §26 check except "More menu still registers" and "no z-index 45"… actually `z-index: 45` exists today, so that fails too. Confirm the failures are exactly the new/rewritten checks, nothing else.

- [ ] **Step 5: Mount the status strip in App.tsx**

In `src/App.tsx`, after `<ScrollManager />` (line 168) and before `<Header />`, add:

```tsx
      {/* v1.16.0: fixed status-bar backdrop (spec §3) — keeps the notch area
          painted after the brand row scrolls away and during rubber-band
          overscroll. Zero-height off-notch and on desktop. Decorative. */}
      <div className="status-strip" aria-hidden="true" />
```

- [ ] **Step 6: Give the brand link its class in Header.tsx**

Replace the whole of `src/components/Header.tsx` with:

```tsx
import { Link } from "react-router-dom";
import Icon from "./Icon";
import TabBar from "./TabBar";

// Spec §2.1 / §2.2 and the v1.16.0 collapsing masthead: the header is the brand
// and the five-tab navigation, nothing more. On wide viewports the two share one
// sticky row. On phones the header's boxes dissolve (display: contents in
// styles.css), so the gold brand row sits in normal flow and scrolls off the
// page while <TabBar> pins below the status bar as its own slim sticky row.

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand-link" aria-label="Fidelis — home">
          <span className="brand">
            <span className="cross"><Icon name="cross" /></span> Fidelis <small>Catholic Bible</small>
          </span>
        </Link>
        <TabBar />
      </div>
    </header>
  );
}
```

(The only code change is `style={{ textDecoration: "none" }}` → `className="brand-link"`; the CSS in Step 8 carries the `text-decoration: none`.)

- [ ] **Step 7: Update TabBar.tsx's doc comment (comment only — no code)**

In `src/components/TabBar.tsx`, replace the paragraph of the doc comment that reads

```
 * One component, two presentations driven entirely by CSS (no router changes):
 * the header row on wide viewports, a bottom tab bar pinned to the screen edge
 * on phones (`.tabbar` in styles.css). "More" is a popover over the four
 * secondary destinations — Library, Translations, Settings, About — not a route
 * of its own, so the URL space is unchanged. The popover drops down under the
 * header link on desktop and rises above the bottom bar on phones.
```

with

```
 * One component, two presentations driven entirely by CSS (no router changes):
 * the header row on wide viewports; on phones its own full-width sticky row
 * beneath the brand — the collapsing masthead (v1.16.0): the brand scrolls
 * away, this row pins below the status bar (`.tabbar` in styles.css). "More"
 * is a popover over the four secondary destinations — Library, Translations,
 * Settings, About — not a route of its own, so the URL space is unchanged.
 * The popover drops down under the More button at every width.
```

- [ ] **Step 8: The styles.css surgery**

Six edits, in file order:

**(8a)** In BOTH theme token blocks, delete the now-unused `--shadow-tabbar` lines (day block line ~131, night block line ~162):

```css
  --shadow-tabbar: 0 -1px 3px rgba(38, 36, 31, 0.08), 0 -8px 24px -12px rgba(38, 36, 31, 0.18);
```
```css
  --shadow-tabbar: 0 -1px 3px rgba(0, 0, 0, 0.4), 0 -8px 24px -12px rgba(0, 0, 0, 0.5);
```

**(8b)** After the `.header-inner` rule (~line 303), add the strip and brand-link base rules:

```css
/* v1.16.0: the status-bar backdrop strip (spec §3). A sticky row cannot grow
   env() padding only-when-pinned, so this fixed strip always paints the notch
   area in --bg-1 — over scrolled page content and the section bars, under the
   pinned tab row (z 30). Height 0 (invisible) off-notch and on desktop; it also
   keeps the notch filled during rubber-band overscroll. Decorative — App.tsx
   mounts it aria-hidden. */
.status-strip {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: var(--bg-1);
  z-index: 29;
}
/* The brand link (Header.tsx) — the wordmark never underlines. */
.brand-link { text-decoration: none; }
```

**(8c)** Update the tab-bar section comment (~lines 333–338). Replace:

```css
/* ── Tab bar (spec §2.1) ─────────────────────────────────────────────────────
   <TabBar> wears the .nav look on wide viewports — Today · Read · Search · Mass
   · More as the header row. The bottom-bar layout for phones lives in the media
   query at the foot of this file (CSS-only swap, no router changes). "More" is a
   popover over Library/Translations/Settings/About — a dropdown here, rising
   above the bar on phones — not a route, so the URL space is unchanged. */
```

with:

```css
/* ── Tab bar (spec §2.1, v1.16.0 masthead) ───────────────────────────────────
   <TabBar> wears the .nav look on wide viewports — Today · Read · Search · Mass
   · More as the header row. The phone layout — its own slim sticky row beneath
   the brand, the collapsing masthead — lives in the media query at the foot of
   this file (CSS-only swap, no router changes). "More" is a popover over
   Library/Translations/Settings/About — a dropdown below the row at every
   width — not a route, so the URL space is unchanged. */
```

**(8d)** In the `.verse-actions` rule (~line 903), change `bottom: 1.2rem;` to:

```css
  /* v1.16.0: no bar left to clear — just the home indicator (spec §4). */
  bottom: calc(1.2rem + env(safe-area-inset-bottom));
```

**(8e)** In the `.footer` rule (~line 1341), change `padding: 1.2rem 1rem 2rem;` to:

```css
  /* v1.16.0: normal bottom padding again (no fixed bar), plus the home-indicator inset. */
  padding: 1.2rem 1rem calc(2rem + env(safe-area-inset-bottom));
```

**(8f)** Replace the ENTIRE phone media block (from the `/* ── Tab bar on phones (spec §2.1) …` comment ~line 1376 through its closing `}` ~line 1446 — the block containing `.tabbar { position: fixed; … }`) with:

```css
/* ── The collapsing masthead on phones (v1.16.0, spec §3) ────────────────────
   The header's boxes dissolve (display: contents), so the brand row and the
   tab row lay out as rows of the .app column: the gold brand row sits in
   normal flow and scrolls off the page — the "fold" is pure document flow, no
   JS, no animation — while the slim tab row pins below the status bar. The
   fixed .status-strip (base rules above) keeps the notch painted once the
   brand has scrolled away. The old bottom bar, its z-index: 45 header
   escalation, and the footer/verse-actions clearances are gone with it. */
@media (max-width: 640px) {
  .header,
  .header-inner { display: contents; }

  /* The brand row: full-width, normal flow, scrolls away. Its own safe-area
     padding starts it below the notch at rest; after that the strip owns the
     notch area (spec §3). */
  .brand-link {
    display: block;
    background: var(--bg-1);
    padding: calc(0.55rem + env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
             0.35rem max(1rem, env(safe-area-inset-left));
  }
  .brand { font-size: 1.2rem; }
  .brand small { display: none; }

  /* The tab row: the one slim pinned bar. Sticky against .app (the header's
     boxes are gone), pinned below the status bar. Visually slim, but every
     link keeps a 44px flex-centered touch box (iOS HIG, spec §3); the side
     insets clear the rounded corners in landscape (spec §6). */
  .tabbar {
    position: sticky;
    top: env(safe-area-inset-top);
    z-index: 30;
    margin-left: 0;
    gap: 0;
    flex-wrap: nowrap;
    background: var(--bg-1);
    border-bottom: var(--hairline) solid var(--border);
    box-shadow: var(--shadow);
    padding: 0 max(0.25rem, env(safe-area-inset-right)) 0 max(0.25rem, env(safe-area-inset-left));
  }
  .tabbar > a,
  .tabbar .more { flex: 1 1 0; }
  .tabbar > a,
  .tabbar .more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    text-align: center;
    width: 100%;
    padding: 0.4rem 0.2rem;
    border-radius: 0.5rem;
  }
  /* More keeps the desktop dropdown (base .more-menu rules): it falls BELOW the
     pinned row now, at the opposite end of the screen from the verse-actions
     bar, so the old z-index fight is simply gone (spec §3). */

  /* The pinned chrome is now just the tab row (44px links = 2.75rem) plus the
     notch. Everything that hangs off --header-h — the SectionNav chip bars,
     the Reader toolbar, --anchor-offset — re-anchors automatically (spec §3). */
  :root { --header-h: calc(2.75rem + env(safe-area-inset-top)); }
}
```

- [ ] **Step 9: Run the harness and the build**

Run: `npm test`
Expected: PASS (all checks; the §26 block prints its lines green).
Run: `npm run build`
Expected: clean tsc + Vite build.

- [ ] **Step 10: Commit**

```bash
git add scripts/test-data.ts src/App.tsx src/components/Header.tsx src/components/TabBar.tsx src/styles.css
git commit -m "feat: the collapsing masthead — phone nav moves to a top sticky tab row (v1.16.0 §3)"
```

---

### Task 2: The Reader folio line — `Book Ch ▾ · DRB ▾ · Aa`

Replaces the Reader's two-row toolbar and "← All books" crumb with one slim folio line: a book+chapter button (opens the chapter picker, now extended with the full book list), the translation select, and an "Aa" button opening a type-options Sheet (A−/A+, Scripture face, parallel view). The h1's chapter number keeps opening the same picker.

**Files:**
- Modify: `src/pages/Reader.tsx`
- Modify: `src/styles.css` (folio styles; delete `.reader-crumb` and `.toolbar-right` rules and the old `.reader-toolbar` phone tweaks)
- Modify: `scripts/test-data.ts` (new §27 block)

**Interfaces:**
- Consumes: `--header-h` (Task 1) for the sticky anchor — the existing `.reader-toolbar { top: var(--header-h) }` rule survives untouched (§25c guard depends on it).
- Produces: CSS classes `.folio-pick`, `.folio-name`, `.folio-caret`, `.folio-trans`, `.folio-type`, `.picker-books-title`, `.picker-books`, `.picker-book`, `.type-size`, `.type-size-px`, `.type-group`. Reuses `SCRIPTURE_FONTS` (`src/lib/typography.ts`) and the `Sheet` primitive.

- [ ] **Step 1: Add the §27 guard block (failing first)**

In `scripts/test-data.ts`, after the §26 block and before the final summary lines, add:

```ts
// ── 27. v1.16.0 — the Reader folio line (spec §4): Book Ch ▾ · translation ▾ · Aa.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const reader = readFileSync(join(ROOT, "src/pages/Reader.tsx"), "utf8");

  // The compound control names itself to screen readers (spec §7).
  check("folio: the book+chapter control is labelled 'choose book and chapter'",
    reader.includes("choose book and chapter"));
  // The type menu gathers the set-and-forget controls under one spoken name.
  check("folio: the type menu opens as 'Text options'",
    reader.includes("Text options"));
  // The picker sheet reaches every book, so the crumb could retire.
  check("folio: the picker sheet lists the books (picker-book buttons)",
    reader.includes("picker-book"));
  check("folio: the '← All books' crumb is retired",
    !reader.includes("reader-crumb") && !css.includes(".reader-crumb"));
}
```

- [ ] **Step 2: Run the harness — §27 must FAIL**

Run: `npm test`
Expected: FAIL on all four §27 checks (`"choose book and chapter"` etc. not yet in Reader.tsx; `.reader-crumb` still present).

- [ ] **Step 3: Rewrite the Reader's toolbar, picker, and state**

In `src/pages/Reader.tsx`:

**(3a)** Change the imports: add `SCRIPTURE_FONTS` to the typography import (line 27):

```tsx
import { SCRIPTURE_FONTS, clampFontSize } from "../lib/typography";
```

**(3b)** Replace the picker state (line 65) `const [chapterPickerOpen, setChapterPickerOpen] = useState(false);` with:

```tsx
  // v1.16.0 folio line (spec §4): the extended book+chapter picker and the
  // "Aa" type menu. pickBook is the book the picker grid is showing — it
  // resets to the open book each time the picker opens.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickBook, setPickBook] = useState(bookSlug);
  const [typeOpen, setTypeOpen] = useState(false);
```

**(3c)** In the navigation-reset effect (~line 158), replace `setChapterPickerOpen(false);` with:

```tsx
    setPickerOpen(false);
    setTypeOpen(false);
```

**(3d)** After the `const go = …` line (~246), add the picker's derived values:

```tsx
  // The picker grid's book: the open book uses the loaded text's real chapter
  // count; any other book falls back to the canon maximum (P1-8 clamps after
  // navigation, exactly as the old toolbar selects did).
  const pickBookDef = getBook(pickBook) ?? book;
  const pickChapters = pickBook === bookSlug ? chapterCount : pickBookDef.chapters;
  const openPicker = () => {
    setPickBook(bookSlug);
    setPickerOpen(true);
  };
```

**(3e)** Replace the whole `<div className="reader-toolbar">…</div>` block (lines ~324–390) with the folio line:

```tsx
      <div className="reader-toolbar">
        <button
          type="button"
          className="folio-pick"
          aria-haspopup="dialog"
          aria-label={`${displayName} chapter ${chapter} — choose book and chapter`}
          onClick={openPicker}
        >
          <span className="folio-name" lang={langAttr(translation)}>
            {displayName} {chapter}
          </span>
          <svg
            className="icon folio-caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <select
          className="folio-trans"
          value={translation}
          onChange={(e) => go(e.target.value, bookSlug, Math.min(chapter, getBook(bookSlug)!.chapters))}
          title="Translation"
          aria-label="Translation"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev} {t.bundled ? "" : "(import required)"}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-btn folio-type"
          aria-haspopup="dialog"
          aria-label="Text options"
          title="Text options"
          onClick={() => setTypeOpen(true)}
        >
          Aa
        </button>
      </div>
```

**(3f)** Delete the crumb (lines ~392–394):

```tsx
      <p className="reader-crumb">
        <Link to="/read">← All books</Link>
      </p>
```

`Link` stays imported (still used by the error notice and chapter-nav).

**(3g)** The h1's chapter button (~line 403) now opens the extended picker — change `onClick={() => setChapterPickerOpen(true)}` to `onClick={openPicker}`.

**(3h)** Replace the whole `{chapterPickerOpen && ( <Sheet …chapter grid… </Sheet> )}` block at the end (~lines 628–650) with the extended picker AND the type menu:

```tsx
      {pickerOpen && (
        <Sheet titleId="passage-pick-title" onClose={() => setPickerOpen(false)}>
          <h2 id="passage-pick-title" className="chapter-grid-title" lang={langAttr(translation)}>
            {bookDisplayName(pickBookDef, translation)} — chapters
          </h2>
          <div className="chapter-grid">
            {Array.from({ length: pickChapters }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                type="button"
                className={
                  pickBook === bookSlug && c === chapter ? "chapter-cell current" : "chapter-cell"
                }
                aria-current={pickBook === bookSlug && c === chapter ? "true" : undefined}
                onClick={() => {
                  setPickerOpen(false);
                  void go(translation, pickBook, c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <h3 className="picker-books-title">Books</h3>
          <div className="picker-books">
            {BOOKS.map((b) => (
              <button
                key={b.slug}
                type="button"
                className={b.slug === pickBook ? "picker-book current" : "picker-book"}
                aria-pressed={b.slug === pickBook}
                onClick={() => setPickBook(b.slug)}
              >
                {bookDisplayName(b, translation)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {typeOpen && (
        <Sheet titleId="type-title" onClose={() => setTypeOpen(false)}>
          <h2 id="type-title" className="chapter-grid-title">Text options</h2>
          <div className="setting-row">
            <span className="setting-label">Text size</span>
            <span className="type-size">
              <button
                className="icon-btn"
                onClick={() => update({ fontSize: clampFontSize(fontSize - 1), followSystemTextSize: false })}
                aria-label="Smaller text"
              >
                A−
              </button>
              <span className="muted sans type-size-px">{fontSize}px</span>
              <button
                className="icon-btn"
                onClick={() => update({ fontSize: clampFontSize(fontSize + 1), followSystemTextSize: false })}
                aria-label="Larger text"
              >
                A+
              </button>
            </span>
          </div>
          <div className="type-group">
            <div className="setting-label">Scripture face</div>
            <div className="pill-row" role="group" aria-label="Scripture font">
              {SCRIPTURE_FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`pill ${settings.scriptureFont === f.id ? "active" : ""}`}
                  aria-pressed={settings.scriptureFont === f.id}
                  style={{ fontFamily: `var(${f.cssVar})` }}
                  onClick={() => update({ scriptureFont: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <span className="setting-label">Parallel translation</span>
            <select
              value={parallel ?? ""}
              onChange={(e) => update({ parallel: e.target.value || null })}
              aria-label="Parallel translation"
            >
              <option value="">No parallel</option>
              {TRANSLATIONS.filter((t) => t.id !== translation).map((t) => (
                <option key={t.id} value={t.id}>
                  ∥ {t.abbrev}
                </option>
              ))}
            </select>
          </div>
        </Sheet>
      )}
```

(The type menu's controls are verbatim the ones removed from the toolbar; the face pills mirror Settings §4's pill row, so the two surfaces can't drift stylistically.)

- [ ] **Step 4: The folio CSS**

In `src/styles.css`:

**(4a)** Update the `.reader-toolbar` base rule (keep `position: sticky` and `top: var(--header-h)` EXACTLY — harness §25c pins them). Replace the rule body (~lines 598–611) with:

```css
/* v1.16.0 the folio line (spec §4): Book Chapter ▾ · translation ▾ · Aa — one
   slim row pinned under the tab row. The set-and-forget controls (size, face,
   parallel) moved into the Aa type menu, so the book being read outranks them. */
.reader-toolbar {
  position: sticky;
  top: var(--header-h); /* under the pinned chrome incl. the notch safe-area inset */
  z-index: 20;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  align-items: center;
  background: var(--bg-0);
  padding: 0.3rem 0;
  border-bottom: var(--hairline) solid var(--border);
  font-family: var(--sans);
  font-size: 0.9rem;
}
```

**(4b)** Replace the old `.reader-toolbar select`, `.toolbar-right`, and the `@media (max-width: 640px) { .reader-toolbar … }` tweak block (~lines 612–626) with:

```css
.reader-toolbar select { max-width: 8.5rem; font-size: 0.9rem; padding: 0.35rem 0.5rem; }
/* The folio's book+chapter control — the page you are on, so it acts. */
.folio-pick {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  min-height: 44px;
  background: none;
  border: none;
  padding: 0 0.2rem;
  font: inherit;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}
.folio-pick .folio-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (hover: hover) { .folio-pick:hover { color: var(--purple); } }
.folio-pick:active { color: var(--purple); }
.folio-caret { color: var(--text-muted); flex-shrink: 0; }
/* Aa sits at the row's end; the serif face makes it read as a type specimen. */
.folio-type { margin-left: auto; font-family: var(--serif); }
```

**(4c)** Delete the `.reader-crumb` rules (~lines 662–668):

```css
/* Orientation breadcrumb back to the book list — purple acts. */
.reader-crumb {
  font-family: var(--sans);
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}
.reader-crumb a { color: var(--purple); }
```

**(4d)** After the `.chapter-cell.current` rule (~line 661), add the picker-books and type-menu styles:

```css
/* v1.16.0: the picker sheet's book list (spec §4) — one tap re-targets the
   chapter grid; gold marks the shown book, as on the chapter cells. */
.picker-books-title {
  margin: 1.1rem 0 0.4rem;
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: var(--text-muted);
}
.picker-books { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.picker-book {
  background: var(--bg-1);
  border: var(--hairline) solid var(--border);
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  cursor: pointer;
}
@media (hover: hover) { .picker-book:hover { border-color: var(--purple); } }
.picker-book:active { background: var(--bg-2); }
.picker-book:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.picker-book.current { border-color: var(--gold); color: var(--gold-text); font-weight: 600; }
/* The Aa type menu's rows. */
.type-size { display: inline-flex; align-items: center; gap: 0.5rem; }
.type-size-px { min-width: 2.6rem; text-align: center; font-variant-numeric: tabular-nums; }
.type-group { margin-top: 0.8rem; }
```

- [ ] **Step 5: Run the harness and the build**

Run: `npm test`
Expected: PASS — §27 green, §25c ("Reader toolbar sticks below the header") still green.
Run: `npm run build`
Expected: clean. (If tsc flags the now-unused `Link` import in Reader.tsx it is NOT unused — it remains in the error notice and chapter-nav; a genuine unused-import error means a step above was misapplied.)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Reader.tsx src/styles.css scripts/test-data.ts
git commit -m "feat: the Reader folio line — book+chapter picker, translation chip, Aa type menu (v1.16.0 §4)"
```

---

### Task 3: One-row Mass controls — `‹ · July 13, 2026 ▾ · › [Today] … NABRE ▾`

The Readings toolbar's two rows become one: day-steppers, a date facade over a transparent native date input, a "Today" chip only when the shown date is off-today, and the translation select right-aligned.

**Files:**
- Modify: `src/pages/Readings.tsx` (toolbar block, lines ~104–133; one derived const)
- Modify: `src/styles.css` (the `.readings-toolbar` rules, ~lines 1107–1119)
- Modify: `scripts/test-data.ts` (new §28 block)

**Interfaces:**
- Consumes: nothing from Tasks 1–2 (the page just sits under the masthead).
- Produces: CSS classes `.date-pick`, `.date-pick-input`, `.date-pick-label`. Uses the existing `useToday()` value (already imported) for the off-today test.

- [ ] **Step 1: Add the §28 guard block (failing first)**

After §27 in `scripts/test-data.ts`, before the final summary lines, add:

```ts
// ── 28. v1.16.0 — one-row Mass controls (spec §5): ‹ · date ▾ · › [Today] … NABRE ▾.
console.log("");
{
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  const readings = readFileSync(join(ROOT, "src/pages/Readings.tsx"), "utf8");

  check("mass: the day-steppers carry spoken names (Previous/Next day)",
    readings.includes('aria-label="Previous day"') && readings.includes('aria-label="Next day"'));
  // The visible date text is a facade; the REAL control is a transparent native
  // date input stretched over it, labelled for assistive tech (spec §5/§7).
  check("mass: the date facade fronts a native input labelled 'Choose date'",
    readings.includes('aria-label="Choose date"') &&
      /\.date-pick-input\s*\{[^}]*opacity:\s*0/.test(css));
  check("mass: the Today chip appears only when the shown date is off-today",
    readings.includes("!isToday &&"));
  check("mass: the controls hold one row (.readings-toolbar flex-wrap: nowrap)",
    /\.readings-toolbar\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
}
```

- [ ] **Step 2: Run the harness — §28 must FAIL**

Run: `npm test`
Expected: FAIL on all four §28 checks.

- [ ] **Step 3: Rewrite the Readings toolbar**

In `src/pages/Readings.tsx`:

**(3a)** After `const lit = liturgicalDay(date, region);` (~line 52), add:

```tsx
  // v1.16.0 (spec §5): the Today chip shows only when the visible date is not
  // today; compare by calendar day, not instant.
  const isToday = toISO(date) === toISO(today);
```

**(3b)** Replace the whole `<div className="readings-toolbar sans">…</div>` block (lines ~104–133) with:

```tsx
      <div className="readings-toolbar sans">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous day" title="Previous day">
          ‹
        </button>
        <span className="date-pick">
          <input
            type="date"
            className="date-pick-input"
            value={toISO(date)}
            onChange={(e) => e.target.value && setParams({ date: e.target.value }, { replace: true })}
            aria-label="Choose date"
          />
          <span className="date-pick-label" aria-hidden="true">
            {date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </span>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next day" title="Next day">
          ›
        </button>
        {!isToday && (
          <button className="chip" onClick={() => go(today)}>
            Today
          </button>
        )}
        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          title="Reading translation"
          aria-label="Reading translation"
        >
          {TRANSLATIONS.filter((t) => t.bundled || imported.has(t.id) || t.id === "nabre").map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev}
              {!t.bundled && !imported.has(t.id) ? " (import)" : ""}
            </option>
          ))}
        </select>
      </div>
```

(DOM order inside `.date-pick` matters: the input comes FIRST so the absolutely-positioned input paints and taps above the label, and so the CSS `:focus-visible ~ .date-pick-label` focus ring can reach the label. `go(today)` replaces `go(new Date())` — same day, sourced from the live `useToday()`.)

- [ ] **Step 4: The one-row CSS**

In `src/styles.css`, replace the two `.readings-toolbar` rules (~lines 1107–1119):

```css
.readings-toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.readings-toolbar input[type="date"], .readings-toolbar select {
  padding: 0.4rem 0.6rem;
  border: var(--hairline) solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg-1);
  font-size: 0.9rem;
}
```

with:

```css
/* v1.16.0 one-row Mass controls (spec §5): ‹ · date ▾ · › [Today] … NABRE ▾.
   Same functions, half the chrome; the day card moves up. The visible date is
   a facade — the real control is a transparent native date input stretched
   over it, so a tap opens the platform picker and assistive tech reads one
   labelled control ("Choose date"). */
.readings-toolbar {
  display: flex;
  gap: 0.4rem;
  flex-wrap: nowrap;
  align-items: center;
}
.readings-toolbar select { margin-left: auto; font-size: 0.9rem; max-width: 8rem; }
.readings-toolbar .icon-btn { min-width: 44px; font-size: 1.15rem; line-height: 1; padding: 0.3rem 0.6rem; }
.date-pick { position: relative; display: inline-flex; align-items: center; min-height: 44px; min-width: 0; }
.date-pick-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}
.date-pick-input:focus-visible ~ .date-pick-label {
  outline: 2px solid var(--purple);
  outline-offset: 2px;
  border-radius: 2px;
}
.date-pick-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
}
```

- [ ] **Step 5: Run the harness and the build**

Run: `npm test`
Expected: PASS (§28 green; nothing else moved).
Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Readings.tsx src/styles.css scripts/test-data.ts
git commit -m "feat: one-row Mass controls — date facade, off-today chip, right-aligned translation (v1.16.0 §5)"
```

---

### Task 4: Visual verification — the eight screens, phone and desktop

No code. Drive the real build in a browser and eyeball the spec's §8 list. **Trap from the submission session:** `npm run preview` launched from a stray cwd serves a DIFFERENT project on :4173 — always `cd /Users/biscuit/Fidelis/app` first and confirm the served title says "Fidelis".

- [ ] **Step 1: Build and serve**

```bash
cd /Users/biscuit/Fidelis/app && npm run build && npm run preview
```

Expected: preview at `http://localhost:4173/`. Verify: `curl -s http://localhost:4173/ | grep -o "<title>[^<]*"` → `<title>Fidelis — Catholic Bible`.

- [ ] **Step 2: Phone-width pass (browser window or device emulation at 428×926)**

Use the session's browser tooling (claude-in-chrome / superpowers-chrome) or a manual window. Check each; screenshot each state for the PR:

1. **Today** — brand row on top, tab row beneath; five cards; NO bottom bar. Scroll down: brand scrolls away, tab row pins below the status-bar area; scroll to top: brand returns.
2. **More** — tap More: menu drops BELOW the tab row, right-aligned; Escape/outside tap closes; route change closes.
3. **Read (book list)** — SectionNav chips stick just under the pinned tab row while scrolling (no gap, no overlap).
4. **Reader** (`#/read/drc/john/1`) — folio line `John 1 ▾ · DRB ▾ · Aa` pins under the tab row; no "← All books" crumb; tap "John 1" → sheet with chapter grid + Books list; pick "Genesis" → grid re-targets; pick a chapter → navigates. Tap Aa → Text options sheet: A−/A+ change the text live, face pills re-skin live, parallel select splits the view. Select a verse: the actions bar floats just above the bottom edge (no dead 3.75rem lift).
5. **Mass** — ONE control row: `‹ · <date> ▾ · ›` + right-aligned translation select; tap the date text → native date picker opens; step a day → a "Today" chip appears; tap it → returns to today and the chip disappears.
6. **Search** — page content identical to before (heading, helper, input row, chips); only the masthead above it changed.
7. **Night mode** (Settings → Appearance → Night) — brand row, tab row, and strip all paint `--bg-1` night; no white flash bands.
8. **Footer** — the motto sits at content end with normal padding (no tall dead zone).

- [ ] **Step 3: Desktop-width pass (≥1024px window)**

Header identical to v1.15.1: one sticky row, brand left + tabs right; More drops down; Reader shows the folio line (this page's redesign is deliberate at all widths); Mass shows the one row; everything readable.

- [ ] **Step 4: Record**

Save screenshots to the session scratchpad; note any deviation. **Do not improvise fixes to non-cosmetic deviations without re-running Task 1–3 harness gates.** If the tab row fails to pin on scroll at phone width, stop — that is the `display: contents` + sticky mechanism failing, the plan's one architectural bet; report it rather than patching around it.

- [ ] **Step 5: Stop the preview server** (Ctrl-C / kill the background task).

---

### Task 5: Release mechanics — v1.16.0 "upon the candlestick"

**Files:**
- Modify: `package.json` (version)
- Modify: `public/sw.js:6` (SHELL_CACHE)
- Modify: `ios/App/App.xcodeproj/project.pbxproj` (4× MARKETING_VERSION)
- Modify: `android/app/build.gradle:10-11` (versionCode/versionName)
- Modify: `CHANGELOG.md`, `CLAUDE.md`, `docs/history/RELEASES.md`

**Interfaces:** none — text and version metadata only.

- [ ] **Step 1: Bump the versions**

```bash
cd /Users/biscuit/Fidelis/app
sed -i '' 's/"version": "1.15.1"/"version": "1.16.0"/' package.json
sed -i '' 's/const SHELL_CACHE = "fidelis-shell-v5"/const SHELL_CACHE = "fidelis-shell-v6"/' public/sw.js
sed -i '' 's/MARKETING_VERSION = 1.15.1;/MARKETING_VERSION = 1.16.0;/g' ios/App/App.xcodeproj/project.pbxproj
sed -i '' 's/versionCode 11501/versionCode 11600/; s/versionName "1.15.1"/versionName "1.16.0"/' android/app/build.gradle
```

Verify: `grep -c "MARKETING_VERSION = 1.16.0" ios/App/App.xcodeproj/project.pbxproj` → `4`; `grep "SHELL_CACHE" public/sw.js` → v6; `grep versionName android/app/build.gradle` → "1.16.0". (`CURRENT_PROJECT_VERSION` stays 1 — the release pipeline overrides it at archive time, the v1.15.1 convention.)

- [ ] **Step 2: CHANGELOG entry**

Insert at the top of the release list in `CHANGELOG.md` (directly above `## [1.15.1] — 2026-07-05 — the lamp trimmed`):

```markdown
## [1.16.0] — 2026-07-14 — upon the candlestick

*"Neither do men light a candle, and put it under a bushel, but upon a candlestick, that it may
shine to all that are in the house." (Matthew 5:15)*

The navigation leaves the bottom of the phone screen and takes its place at the top — the
Collapsing Masthead — with the Reader and Mass pages each giving a row of chrome back to the
text. Design spec: `docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md`.
No engine, data, or golden changes.

### Changed

- **The Collapsing Masthead (spec §3).** On phones the five-tab bar no longer pins to the
  bottom edge. At the top of every page: the gold brand row with the tab row beneath it; on
  scroll the brand row folds away (normal document flow — no JavaScript, no animation) and the
  slim tab row stays pinned below the status bar. A fixed, `aria-hidden` backdrop strip
  (`height: env(safe-area-inset-top)`, `--bg-1`) keeps the notch painted after the brand
  scrolls off and during rubber-band overscroll. The More menu becomes the same drop-*down*
  it is on desktop; Android Back / Escape / outside-tap dismissal are unchanged. Deleted with
  the bottom bar: the header's `z-index: 45` escalation, the footer's `3.25rem` bottom
  clearance, and the verse-actions `3.75rem` lift (the bar now floats just above the home
  indicator). `--header-h` re-derives on phones to the pinned tab row; the SectionNav chip
  bars, the Reader toolbar, and `--anchor-offset` re-anchor automatically. Desktop ≥640px is
  visually unchanged. Every tab keeps its 44px touch box.
- **The Reader folio line (spec §4).** The brand header + two-row toolbar + "← All books"
  crumb above verse 1 become one slim pinned row: **`John 1 ▾ · DRB ▾ · Aa`**. The book+chapter
  control opens the chapter picker, now extended with the full book list (one tap re-targets
  the grid; the crumb is retired); the translation select keeps its one-tap switch; **Aa**
  gathers the set-and-forget controls (A−/A+ with the live px, the Scripture-face pills, the
  parallel-view select) into a "Text options" sheet. Gold dots, CCC marks, verse selection,
  the sheets, and the end-of-passage ‹ › chapter links are untouched.
- **One-row Mass controls (spec §5).** The two control rows become
  **`‹ · July 14, 2026 ▾ · ›`** — the date text is a facade over the real native date input
  (spoken as "Choose date"), a **Today** chip appears only when the shown date is off-today,
  and the translation select right-aligns. Same functions, half the chrome.
- **Search: no page changes** (owner correction) — it simply sits under the masthead.

### Added

- **Source-shape guards (§26–§28)** in the v1.15.1 convention: the sticky tab row and status
  strip must exist, the fixed bottom bar and its clearances must stay gone, the More menu must
  stay on the overlay-back stack, the folio picker/type menu keep their spoken names, and the
  Mass date facade keeps its labelled native input. The §11 identity-release acceptance checks
  are rewritten from the bottom bar to the masthead.

### Release mechanics

- Service-worker shell cache v5→v6 (app shell CSS/JS changed). iOS `MARKETING_VERSION` and
  Android `versionName` 1.15.1→1.16.0, `versionCode` 11501→11600 (shells version with the web
  app — the v1.15.1 lesson). App Store screenshots regenerate after this ships.
```

- [ ] **Step 3: RELEASES.md narrative**

In `docs/history/RELEASES.md`, insert after the end of the "## The lamp trimmed (v1.15.1)" section (immediately before `## Review items — all fixed in v1.1.0 …`):

```markdown
## Upon the candlestick (v1.16.0)

*"Neither do men light a candle, and put it under a bushel, but upon a candlestick." (Matthew 5:15)*
**The Collapsing Masthead — the navigation leaves the bottom of the phone screen.**

Three motives, gathered in the owner brainstorm: the bottom bar felt hidden and cramped (five
columns plus a More popover at the screen's foot); it spent vertical room that belongs to
Scripture — the Reader independently stacked a brand header, a two-row toolbar, and an
"← All books" line before verse 1; and a bottom tab bar reads as a social app, where a masthead
over a section line reads as a missal. Fidelis is a book. The governing principle, owner-set:
*relocate the chrome; redesign a page only where a control row is genuinely redundant* — Search
taught that rule, and its page did not change at all.

**The masthead.** At the top of every page: the gold brand row (`✠ Fidelis`) with the tab row
beneath it. On scroll the brand folds away and the slim tab row stays pinned. The collapse is
pure document flow — no JavaScript, no animation, nothing to gate behind
`prefers-reduced-motion`. The mechanism: on phones the header's boxes dissolve
(`display: contents` on `.header`/`.header-inner`), so the brand link and the nav lay out as
rows of the full-height `.app` column — the brand in normal flow scrolls off; the tab row,
`position: sticky; top: env(safe-area-inset-top)`, pins against `.app` (a sticky row nested in
a header-sized box could never outlive its parent — the dissolve is what frees it). A fixed,
`aria-hidden` **status strip** (`height: env(safe-area-inset-top)`, `--bg-1`, z 29) always
paints under the iOS status bar: a sticky element cannot grow env() padding only-when-pinned,
and the strip also keeps the notch filled during rubber-band overscroll. The More menu becomes
the drop-down it always was on desktop, now at the opposite end of the screen from the
verse-actions bar — so the old `z-index: 45` header escalation is deleted rather than
rebalanced, along with the footer's `3.25rem` clearance and the verse-actions `3.75rem` lift.
`--header-h` re-derives on phones to `calc(2.75rem + env(safe-area-inset-top))` — the pinned
tab row — and everything that hangs off it (SectionNav chip bars, the Reader toolbar,
`--anchor-offset`) follows automatically. Desktop ≥640px is visually unchanged; the
breakpoint's meaning flips from "move the nav to the bottom" to "stack brand over tabs." Every
tab link keeps a 44px flex-centered touch box.

**The Reader folio line.** Two slim pinned rows while reading: the tab row, then
**`John 1 ▾ · DRB ▾ · Aa`**. The book+chapter control opens the chapter-picker sheet, extended
with the full book list, so the "← All books" crumb retired; the translation select keeps its
one-tap switch; **Aa** gathers text size (A−/A+ with the live px), the Scripture-face pills
(mirroring the Settings row, so the two surfaces cannot drift), and the parallel-view select
into a "Text options" sheet — set-and-forget controls no longer outrank the book being read.
Unchanged: gold Haydock dots, purple CCC marks, verse selection and the sheets, the
end-of-passage chapter links; the verse-actions bar keeps its bottom-floating position but
drops to just above the home indicator, since there is no bar left to clear.

**One-row Mass controls.** `[← Previous] [date] [Today] / [Next →] [select]` became
**`‹ · July 14, 2026 ▾ · ›`** with a **Today** chip only when the shown date is off-today and
the translation select right-aligned. The visible date is a facade over a transparent native
`<input type="date">` stretched across it — a tap opens the platform date picker and assistive
tech reads one labelled control ("Choose date").

**The record.** Harness §11's identity-release acceptance checks were rewritten from the
bottom bar to the masthead, and §26–§28 pin the new shape in the v1.15.1 source-shape manner.
No engine, data, or golden changes — a golden diff during this work would have signalled a
mistake. Service-worker shell cache v5→v6; iOS `MARKETING_VERSION`/Android `versionName` to
1.16.0, `versionCode` 11600. Design spec:
`docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md`.
```

- [ ] **Step 4: CLAUDE.md ledger line**

In `CLAUDE.md`, add at the TOP of the "## Release ledger" list (above the v1.15.1 line):

```markdown
- **v1.16.0 — upon the candlestick** — the Collapsing Masthead: the phone nav leaves the bottom edge for a top masthead — the gold brand row scrolls away in normal flow (no JS, no animation) while the slim sticky tab row pins under a fixed status-bar backdrop strip, the More menu drops down as on desktop, and the bottom bar with its `z-index: 45` escalation and the footer/verse-actions clearances is deleted; the Reader gets the folio line (`John 1 ▾ · DRB ▾ · Aa` — the extended book+chapter picker retires the "← All books" crumb; Aa gathers size/face/parallel into a Text options sheet); the Mass page's two control rows become one (`‹ date ▾ ›`, a Today chip only off-today, right-aligned translation); Search untouched by design. `--header-h` re-derives per breakpoint; desktop ≥640px unchanged; no engine/data/golden changes; sw shell cache v5→v6; shells 1.16.0/11600. → [detail](docs/history/RELEASES.md#upon-the-candlestick-v1160)
```

Also update the CLAUDE.md architecture paragraph sentence about the tab bar: in **The UI primitives**, change

```
`src/components/TabBar.tsx` is the five-tab nav (Today/Read/Search/Mass + a More **popover**, not a route);
```

to

```
`src/components/TabBar.tsx` is the five-tab nav (Today/Read/Search/Mass + a More **popover**, not a route) — on phones a sticky top tab row under the scrolling brand masthead (v1.16.0), one row with the brand on desktop;
```

- [ ] **Step 5: Full gates**

```bash
npm test && npm run lint && npm run build && npm run check-docs
```

Expected: all green. `check-docs` proves the `#upon-the-candlestick-v1160` anchor resolves — if it fails, the RELEASES.md heading and the ledger link disagree; fix the anchor, not the checker.

- [ ] **Step 6: Commit**

```bash
git add package.json public/sw.js ios/App/App.xcodeproj/project.pbxproj android/app/build.gradle CHANGELOG.md CLAUDE.md docs/history/RELEASES.md
git commit -m "release: v1.16.0 \"upon the candlestick\" — versions, sw cache v6, changelog, ledger, narrative"
```

---

### Task 6: Finish the branch — PR

- [ ] **Step 1:** REQUIRED SUB-SKILL: use **superpowers:finishing-a-development-branch**. Default expectation (matches v1.15.x convention): push `release/v1.16.0` and open a PR to `main`.

- [ ] **Step 2:** The PR body must include the spec's **manual iOS-shell checklist** for the owner's on-device pass (spec §8):

```
Manual on-device checklist (iOS shell):
- [ ] Notch stays filled during rubber-band overscroll (the status strip)
- [ ] Keyboard open on Search: pinned rows scroll naturally with the visual viewport
- [ ] Landscape: tab row clears the rounded corners (safe-area left/right)
- [ ] Android Back closes the More dropdown before navigating
- [ ] VoiceOver order: brand → tabs → content; folio speaks "…— choose book and chapter";
      Aa speaks "Text options"; the Mass date speaks "Choose date"
After merge/ship: regenerate App Store screenshots (the capture harness, one command per
device class — recipe in memory app-store-submission.md).
```

---

## Self-review record (spec → task mapping)

- Spec §3 (masthead, strip, More, deletions, `--header-h`, desktop, touch targets) → Task 1. The one mechanism the spec left unnamed — how a sticky tab row escapes the header's box — is resolved as `display: contents`, which is also what makes "Header.tsx keeps its markup" literally true. Task 4 Step 4 flags this as the architectural bet to verify first.
- Spec §4 (folio line, extended picker, Aa menu, crumb retired, verse-actions drop, unchanged list) → Tasks 2 and 1(8d).
- Spec §5 (Mass one row, Search untouched, SectionNav auto, Today untouched, footer) → Tasks 3, 1(8e); Search/Today have no tasks by design.
- Spec §6 (landscape insets, overlay Back, scroll authority untouched, keyboard) → Task 1 CSS + §26 guard; no ScrollManager/Sheet edits anywhere in this plan.
- Spec §7 (aria-label Primary / aria-current stay via NavLink; spoken names; strip aria-hidden; tokens unchanged; no animation) → Tasks 1–3; guards §26–§28.
- Spec §8 (guards, visual verification, manual checklist, no goldens) → Tasks 1–4, 6.
- Spec §9 (version, sw bump, shells, screenshots-after) → Task 5, Task 6 note.
- Known pre-existing checks that would have broken silently: §11's three bottom-bar acceptance checks (rewritten in Task 1 Step 2); §25c reader-toolbar guard (deliberately preserved by Task 2 Step 4a).
