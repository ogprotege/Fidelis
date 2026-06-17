# Fidelis — Navigation & Information-Architecture redesign

**Date:** 2026-06-17 · **Status:** design approved (owner), ready for planning
**Driver:** owner intent — "a single readable and navigable page with links to other pages
through clearly discernable titles and headers", navigation "seamless … forward and backwards"
that "doesn't have any issues within any combination of navigation moves."

Grounded in a verified navigation audit (29 confirmed findings of 36; see the session record).
Nothing here changes the app's identity: the two-accent rule (**purple acts, gold honors**, incl.
`--gold-text`), tokens-only, the §13 refusal list, the five-card Today limit, EB Garamond, the §1.5
Icon set, and `prefers-reduced-motion` all hold. Router stays `HashRouter`; the five-tab bar +
"More" popover stay the top-level nav; the `Sheet` primitive stays the modal.

## Goals (and the findings each closes)

1. **Forward/back is seamless** — every navigation lands at the right scroll position; Back restores
   your place; no nav combination strands you. (#4, #5, #6, #7, #11, #17, #18, #29)
2. **No endless-scroll pages** — long pages become navigable via an in-page section jump-bar.
   (#1, #12, #13, #14; anchors #10, #23)
3. **Native back behaves** — the Android hardware Back (and any history Back) closes an open
   overlay instead of exiting the app or sliding the page out underneath it. (#2, #3, #15)
4. **Clear titles, headers, and onward links** — one header hierarchy, every page titled, onward
   navigation always discernable. (#16, #20, #21, #22, #25, #28)
5. **Accessible navigation** — focus moves to content on route change; a skip link; popover focus.
   (#8, #9, #19, #24)

## Architecture — shared units (each small, single-purpose, testable where logic exists)

### A. Scroll & history authority — `ScrollManager` (new, mounted once in `App.tsx`)
- `src/main.tsx`: set `window.history.scrollRestoration = "manual"` so the browser stops fighting us.
- `src/lib/scroll.ts` (pure, **tested**): a tiny module that owns a `Map<historyKey, scrollY>` and the
  decision logic — `decideScroll(navType, hasAnchor)` → `"restore" | "top" | "skip"`:
  - `POP` → `restore` (use the saved offset for `location.key`, default 0).
  - `PUSH`/`REPLACE` with **no** `?v=`/`#hash` → `top`.
  - any nav **with** a `?v=` or `#hash` → `skip` (the Reader verse-focus / anchor handler owns it).
- `src/components/ScrollManager.tsx`: uses `useLocation()` + `useNavigationType()`; saves `scrollY`
  per `location.key` on a throttled scroll listener and just before each navigation; on location change
  applies `decideScroll`. Restoration runs in a `useLayoutEffect` + one `requestAnimationFrame`, with a
  short **bounded retry** (e.g. up to ~500ms / a few rAFs) because async pages (Reader, Readings) grow
  taller after data loads — retry until the target offset is reachable or the budget elapses. Honors
  `prefers-reduced-motion` (instant; never animates restoration).
- **Reader** (`Reader.tsx:156`): remove the unconditional `window.scrollTo(0,0)`; the manager owns the
  default, and the existing `?v=` effect still wins when present (it is a `skip` case for the manager).
- **Readings** day-stepper (`Readings.tsx`): `setParams(..., { replace: true })` for Previous/Next/Today
  and the date input, so day-browsing doesn't flood the Back stack (#11).

### B. Anchor system (new, shared) — enables SectionNav + in-app fragment links
- One CSS token `--anchor-offset` (≈ sticky-header height + a little) in `styles.css`; apply
  `scroll-margin-top: var(--anchor-offset)` to anchorable headings/sections (`.testament-title`,
  `.card`, `.reading-group`, the version cards, the settings sections). Fixes header-occluded anchors
  and near-top `?v=` (#23).
- A small hash handler (in `ScrollManager` or a sibling): after a route renders, if `location.hash`,
  `document.getElementById(hash)?.scrollIntoView()` (reduced-motion-aware). Fixes `/translations#rsv2ce`
  (#10) and powers SectionNav.

### C. `SectionNav` primitive (new) — `src/components/SectionNav.tsx`
- Props: `sections: { id: string; label: string }[]`. Renders a sticky (just under the header) rail of
  **purple anchor links** to each section id; horizontally scrollable on phones; an optional trailing
  "Top" link. Click → smooth (reduced-motion-aware) scroll to the section honoring `--anchor-offset`.
- Purple acts (links); no gold. Reduced-motion safe. Sticky `top: var(--anchor-offset-base)`; z-index
  below the header, above content. (Scroll-spy "current section" highlight is **out of scope** v1 —
  keep it a clean jump bar; revisit later.)
- Applied to: **Daily Readings** (Reading I · Psalm · … · Gospel · the secondary set), **Settings**
  (the 9 card sections), **About** (Canon · Texts · Embed · Privacy · Sources · Integrity), **The Books**
  (Old Testament · New Testament · Appendix). Each target gets a stable `id`.

### D. Overlay back — `OverlayStack` + `@capacitor/app` (new)
- `src/lib/overlays.ts` + a tiny context/registry: any open overlay (every `Sheet`, the More popover)
  registers `{ id, close }` on mount and unregisters on close, newest last.
- `Sheet.tsx` self-registers (one `useEffect`), so all five sheets (commentary, chapter-grid, share,
  mystery, conditions) are covered automatically; `TabBar` registers the More popover.
- `App.tsx`: one `@capacitor/app` (`^8.x`) `backButton` listener (native only, guarded by
  `Capacitor.isNativePlatform()`): **if** the overlay stack is non-empty → close the topmost, stop;
  **else if** `window.history.length > 1` (not at the app root) → `window.history.back()`; **else** →
  `App.exitApp()`. This fixes the Android "exit app while a sheet/popover is open" bug (#3) and the
  "page slides out under the sheet" case (#2, #15).
- **Scope note:** iOS edge-swipe-back is not enabled by Capacitor's default WKWebView config, so we do
  **not** route overlays through history (fragile, double-pop risk); the native listener + the existing
  ✕/backdrop/Escape dismissals are sufficient. Body-lock already releases on unmount (audit-confirmed).

### E. Focus & skip (new, in `App.tsx` + `Header`)
- Give `<main>` `id="main"` + `tabIndex={-1}`; on route change (`useEffect` on `location.key`) move focus
  to the route's main heading (or `<main>`) after paint — **unless** the URL has a `?v=` (then the Reader
  owns focus → the targeted verse) (#8, #24).
- A visually-hidden-until-focused **skip link** (`.skip-link`) as the first focusable element →
  `href="#main"` (#9).
- `TabBar` More popover: focus the first menu item on open (mirrors `Sheet`'s initial focus); Escape
  already returns focus (#19).

### F. Headers / titles / links / orientation (per-page, consistency)
- **Header ladder (documented + applied):** Tier 1 page-section divider = `.testament-title` (gold
  underline) for true top-level dividers; Tier 2 = group label (`.group-title`, muted small-caps);
  Tier 3 = card label (`.card h2`, gold small-caps). Stop using `.testament-title` for lectionary
  reading labels (those stay `.reading-label`). (#20)
- **Reader** gains a small purple "← The Holy Bible" / "Books" context link near `.chapter-title`
  (the Scripture chapter heading stays the sacred face); gives orientation + onward nav (#16).
- **Home**: `h1.page-title` becomes **"Today"** (echoes the active tab) with the date demoted to
  `.subtitle` (#28).
- **Readings** null-state + USCCB escape promoted from inline words to a `.continue-cta` button (#25).
- **Translations**: each version heading becomes an `h2` in the gold small-caps section vocabulary
  (fix the `h1→h3` level skip) (#21).
- **Brand link** drops its duplicate `aria-current` on `/` so only the Today tab is current (#22).
- Low-scroll-occlusion polish: pad the Reader content when the verse-action bar is open so chapter-nav /
  "Mark portion read" aren't hidden (#26); sticky "Start" in PlanCreator (#27).

### G. URL-reflected transient state (closes the "Back wipes my work" cases)
- **Search**: reflect `q`, `t` (translation), `g` (group filter) as search params; on mount, hydrate from
  them and auto-run. Then Back into Search re-runs and the ScrollManager restores position (#17).
- **Reader selection**: on selecting a verse, set `?v=` (replace); Back/Forward restores the selection +
  scroll (#29). (Lower priority; behind Search.)

## Phasing (each phase ends green: `npm test` + `npm run build`)

1. **Scroll & history foundation** — A (ScrollManager + scroll.ts tests) + B (anchor token/handler) +
   Reader opt-out + Readings `replace`.
2. **SectionNav** — C: the primitive + ids + apply to the four long pages.
3. **Overlay back & focus** — D (`@capacitor/app` + OverlayStack) + E (focus/skip/popover).
4. **Consistency & orientation** — F (headers, Reader breadcrumb, Home title, null-states, Translations,
   brand) + the small occlusion fixes.
5. **URL state** — G (Search params; Reader `?v=` selection).

## Testing
- **Unit (harness):** `src/lib/scroll.ts` `decideScroll` truth table (POP→restore, PUSH/REPLACE→top,
  anchor/`?v=`→skip); overlay-stack ordering (push/pop/topmost). Added to `scripts/test-data.ts`.
- **Type/build:** `tsc` + Vite green each phase; emoji guard over `.tsx` stays green.
- **Browser eyeball (chrome MCP):** the headline nav combinations from the audit — Search→result→Back
  (place kept), long-page→link→Back (place kept), Settings deep-scroll→About (lands at top), the
  SectionNav jump bars, and (where possible) overlay-Back behavior.
- **Device (Xcode/Android, owner):** the `@capacitor/app` back cascade on a real Android build.

## Out of scope / deferred
- Scroll-spy "current section" highlight in SectionNav.
- History-routing overlays (only needed if iOS edge-swipe is later enabled).
- Virtualizing the Search results list (perf, separate concern).
- Replacing the router or the tab-bar/Sheet patterns (explicitly preserved).

## New dependency
- `@capacitor/app@^8.x` (native back-button handling). One plugin, native-guarded, no-op on web.
