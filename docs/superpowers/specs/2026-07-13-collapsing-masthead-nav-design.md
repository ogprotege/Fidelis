# The Collapsing Masthead — top navigation & the simplicity pass (v1.16.0 "upon the candlestick")

**Date:** 2026-07-13 · **Status:** approved by owner (brainstorm, four sections) · **Target:** v1.16.0

> *Neither do men light a candle, and put it under a bushel, but upon a candlestick.* — Matthew 5:15
> The navigation leaves the bottom of the phone screen and takes its place at the top.

## 1. Why

Three owner motives, gathered in brainstorm:

1. **The bottom bar feels hidden and cramped** — five columns plus a More popover squeezed into a strip at the screen's foot.
2. **It covers reading space** — a fixed bar spends vertical room that belongs to Scripture, and the Reader independently stacks a brand header, a two-row toolbar, and an "← All books" line before verse 1.
3. **Aesthetics** — a bottom tab bar reads as a social app; a masthead over a section line reads as a missal. Fidelis is a book.

Wide viewports (≥640px) already present the navigation as a top header row; this design
decides the phone presentation, and takes the opportunity to close the audit of crowded
surfaces (Reader toolbar, Mass controls).

**Governing principle (owner-set):** *relocate the chrome; redesign a page only where a
control row is genuinely redundant.* Search taught this rule — its page layout does not
change at all.

## 2. The decision record

Chosen from mocked alternatives in the visual companion:

- **Navigation architecture: "The Collapsing Masthead"** (option C, over an auto-hiding single bar and an always-double-row "Missal"). At the top of any page: the gold brand row (`✠ Fidelis`) with the tab row beneath it. On scroll, the brand row folds away and only the slim tab row stays pinned.
- **Reader pinning: "tabs + folio line"** (option B, over tabs-only and a tabs-replacing running head). Two slim rows stay pinned while reading.
- **Mass page: one-row controls** (approved from before/after mockups).
- **Search: no page changes** (owner correction — the masthead is the only change).

## 3. Architecture

The collapse requires **no JavaScript and no animation** — it is document flow:

- **Brand row.** `Header.tsx` keeps its markup. On phones the brand row stops being sticky: it sits in normal flow and scrolls off the page. That is the "fold." Spec §10's "the app has no motion" remains true by construction; there is nothing to gate behind `prefers-reduced-motion`.
- **Tab row.** `TabBar` renders as its own full-width row beneath the brand (Today · Read · Search · Mass · More) and is `position: sticky`. Once the brand scrolls off, the tab row pins — the one slim bar while reading. Labels stay text (no icons added); the active tab keeps `--purple` (or the liturgical accent when `followLiturgicalYear` is on).
- **Status-bar backdrop strip.** A sticky element cannot grow `env(safe-area-inset-top)` padding only-when-pinned, so a small **fixed strip** — height `env(safe-area-inset-top)`, background `--bg-1`, `aria-hidden` — always paints under the iOS status bar, and the tab row pins at `top: env(safe-area-inset-top)`. On non-notched devices and desktop the strip is 0px tall. The strip also keeps the notch area filled during rubber-band overscroll. The brand row, now in normal flow, starts below the strip via its own `padding-top: env(safe-area-inset-top)` at rest — the strip merely guarantees the area stays painted after the brand scrolls away.
- **More.** Becomes a dropdown *below* the tab row on phones — the same component and behavior it already has on desktop (overlay registration for Android Back, Escape/outside-tap dismiss, focus return). The phone CSS that flipped the menu upward is deleted.
- **What is deleted.** The `@media (max-width: 640px)` bottom-bar block: `position: fixed` tabbar, the `z-index: 45` header escalation (the More popover no longer fights the verse-actions bar from the bottom), the footer's `3.25rem` bottom clearance, and the verse-actions `3.75rem` lift.
- **`--header-h`** re-derives per breakpoint to the *pinned* height: tab row + `env(safe-area-inset-top)` on phones; unchanged on desktop. Everything that hangs off it — `SectionNav` chip bars, the book-grid sticky header, `--anchor-offset` — follows automatically. Chrome heights stay in `rem`; the Dynamic Type bridge scales Scripture text only, so the calc stays static.
- **Desktop ≥640px: unchanged.** The breakpoint's meaning flips from "move nav to the bottom" to "stack brand over tabs" — at wide widths brand and tabs continue to share one row.
- **Touch targets.** The tab row is visually slim but every link keeps `min-height: 44px` (flex-centered), the same iOS-HIG rule the bottom bar follows today.

## 4. The Reader

Two slim pinned rows while reading:

1. The tab row (above).
2. **The folio line:** `John 1 ▾ · DRB ▾ · Aa`
   - **"John 1 ▾"** opens the existing chapter-picker sheet, extended to include the book list — one tap reaches any book and chapter. The "← All books" line above the text is retired.
   - **"DRB ▾"** keeps the one-tap translation switch (bundled + imported, same options as today's select).
   - **"Aa"** opens a small type menu gathering the second toolbar row: text size (A−/A+), Scripture face, and the parallel-view select. Set-and-forget controls no longer outrank the book being read.

Replaced: brand header + two-row toolbar + "All books" link at top, tab bar at bottom.
New: two slim rows at top, nothing fixed at the bottom.

Unchanged in the Reader: gold Haydock dots, purple CCC marks, verse selection and the
sheets, chapter ‹ › buttons at the end of the passage (the frequent one-handed gesture
stays thumb-reachable). The **verse-actions bar** keeps its bottom-floating position but
drops to just above the home indicator, since there is no bar left to clear.

## 5. The other surfaces

- **Mass page (Readings).** The two control rows ([← Previous] [date] [Today] / [Next →] [translation select]) become one: **`‹ · July 13, 2026 ▾ · ›`** — the date text opens the native date picker, a **"Today"** chip appears only when the shown date is not today, and the translation select shrinks to a right-aligned chip (**`NABRE ▾`**). Same functions, half the chrome; the day card moves up.
- **Search.** No page-level changes (owner correction). Heading, helper sentence, input row, Search button, and result chips all stay exactly as built; the page simply sits under the masthead like every other.
- **Chip bars (`SectionNav`).** Behavior unchanged; they re-anchor to the new `--header-h` automatically. On the Reader they sit below the folio line.
- **Today page.** Untouched — five cards, same order (standing rule #2). It gains the strip of screen the bottom bar occupied.
- **Book list (Read tab).** No page-specific change: title, testament chips, "Reading plans →" all stay.
- **Footer.** The motto keeps its place at the end of scrolled content; its bottom padding shrinks to normal since no fixed bar remains.
- **Widget route** (`/widget/votd`) renders headerless today and is unaffected.

## 6. Edge cases

- **Notch & landscape:** the backdrop strip covers the status bar in overscroll; the tab row keeps `max(…, env(safe-area-inset-left/right))` padding for rounded corners in landscape.
- **Overlays & Back:** the More dropdown keeps its `pushOverlay` registration — Android Back closes it before navigating; Escape returns focus to the trigger.
- **Scroll authority:** `ScrollManager`/`decideScroll` untouched (target → skip; REPLACE → skip; POP → restore; PUSH → top). POP restores land content beneath the pinned rows via the re-derived `--anchor-offset`. The Sheet × scroll-lock interplay (v1.14.2) is unaffected; sticky rows hold still while the body is pinned.
- **Keyboard:** with the iOS keyboard open on Search, the pinned rows scroll naturally with the visual viewport; no special handling is added.

## 7. Accessibility

- The nav keeps `aria-label="Primary"` and `aria-current="page"` on the active tab; the skip-link still jumps focus to `#main` past both pinned rows.
- Spoken names for the new compound controls: the folio picker ("John chapter 1 — choose book and chapter"), the type menu ("Text options"), the Mass date control ("Choose date").
- The backdrop strip is decorative: `aria-hidden="true"`.
- Token pairs are unchanged, so WCAG AA contrast holds by construction; purple acts / gold honors is untouched (the brand stays gold; active tabs stay purple/accent).
- No animation added anywhere; `prefers-reduced-motion` remains honored by construction.

## 8. Testing

- **No engine, data, or golden changes.** `npm run golden` is not run; a golden diff during this work signals a mistake.
- **Harness source-shape guards** (the v1.15.1 convention, in `scripts/test-data.ts`): the sticky tab-row rule and the status-strip `env(safe-area-inset-top)` rule exist in `styles.css`; the old `position: fixed` bottom-bar rule is gone; the footer/verse-actions bottom-clearance calcs are gone; `TabBar.tsx` still registers its overlay for the More menu.
- **Visual verification:** re-run the CDP screenshot harness built for the App Store submission (428×926 @3×, headless Chrome against `npm run preview`) and eyeball the same eight screens before/after.
- **Manual iOS-shell checklist for the PR:** notch fill during overscroll; keyboard-open on Search; landscape safe-areas; Android Back closes the More dropdown first; VoiceOver order brand → tabs → content.
- `npm test` and `npm run build` green; CI unchanged.

## 9. Release mechanics

- Version **v1.16.0 — "upon the candlestick"** (Matthew 5:15). `package.json` + CHANGELOG entry together, ledger line in CLAUDE.md, narrative in docs/history/RELEASES.md — the standing release conventions.
- **Service-worker cache version bump** (app shell CSS/JS changed — same convention as v1.12.1 and v1.13.2).
- iOS `MARKETING_VERSION` / Android `versionName` → 1.16.0, `versionCode` → 11600 (the v1.15.1 lesson: shells version with the web app).
- App Store screenshots regenerate after this ships (the capture harness makes that one command).

## 10. Out of scope

- No changes to engines, data pipeline, goldens, widgets, or the Today page's five cards.
- No icons in the tab row, no new navigation destinations, no gesture navigation.
- Everything in design-spec §13 (the refusal list) stays refused.
