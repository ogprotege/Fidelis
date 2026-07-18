# UI polish pass (v1.22.1) — design

2026-07-18 · scope: the audit's six UX findings, fixed inside the existing design
system. Approach: one polish PR, each item harness-pinned (the v1.18.3 "faithful in
little" pattern). **Not** in scope: the NABRE-default question (a deliberate product
decision, deferred), IA surgery (Reading Plans placement, Settings restructuring),
any visual redesign.

## Constraints (binding, all harness-enforced today)

- Design tokens only; the two-accent rule (purple acts, gold honors); no new raw hex.
- The Today page stays at six cards. No new routes. No emoji in `.tsx`.
- `Sheet.tsx` remains the only dialog primitive. No behavior change to any switch or
  setting — this pass is presentation and copy, except item 1's render hoisting.
- Each item lands with a harness source-shape guard (house convention), red-first
  where a guard can be written before the fix.

## Item 1 — Mass fallback notice: once per page, not per reading

**Problem.** `ReadingText.tsx:137-144` renders the "U.S. lectionary uses the NABRE…"
fallback notice independently for every reading. A first-run U.S. user (default
`massTranslation: "nabre"`) sees the identical copyright notice three times on one
page — the app's headline worship surface leads with repetition and legalese.

**Fix.** `ReadingText` gains an optional prop `showFallbackNotice` (default `true`,
so other call sites are untouched); the notice renders only when the prop is set.
`src/pages/Readings.tsx` passes `showFallbackNotice={si === 0}` only within the
primary ladder, so the notice appears exactly once per page, above the first
reading; the secondary ladder (e.g. the Holy Thursday Chrism Mass) never shows it.
Copy stays factual but drops the doubled "import" phrasing to one
sentence: "The U.S. lectionary uses the NABRE, which is under copyright — showing
the Douay-Rheims. [Import your licensed NABRE →] to read it here." (Same facts, same
link, one breath.)

**Errors/edge.** If the first reading fails to load for another reason, the notice
does not move; acceptable — it explains the translation, not the failure.

**Tests.** Harness: `Readings.tsx` passes the prop exactly once per `displayReadings`
section list (source-shape); `ReadingText` renders the notice behind the prop.
e2e (existing today.spec) keeps passing.

## Item 2 — Lectionary codes off the worship surface

**Problem.** `Readings.tsx:283-290` prints the raw lectionary code
(`LW06-4Thu~Chrism`) in a `<code>` tag — developer data on a prayer surface.

**Fix.** Delete the code fragment (and its secondary-Mass twin) from the footnote;
keep the provenance text (psalm numbering note, USCCB link). Codes stay in
`public/data/lectionary.json` and the engines for debugging.

**Tests.** Harness: the footnote keeps `bible.usccb.org` and the psalm-numbering
sentence, and no longer contains `readings.code` rendered in `<code>`.

## Item 3 — Manifest hash out of Settings

**Problem.** `Settings.tsx:717-722` shows "Texts verified at build · manifest
`a1b2c3d4e5f6`" — a hash prefix that means nothing to a non-technical reader.

**Fix.** The line becomes "Texts verified at build · About & sources →". The
`manifest` load stays — the offline cache-truth check (Saved/Repair) probes against
it; only the `rootHash` interpolation goes. The honesty claim is untouched — only
the hex goes.

**Tests.** Harness: the line keeps "Texts verified at build" and the About link, and
no longer interpolates `rootHash`.

## Item 4 — Reading plans: one explanatory line

**Problem.** `BookList.tsx:51-53` is a bare "Reading plans →" link — the only entry
point to a complete feature, and it says nothing about what plans are.

**Fix.** The link gains a muted tail in the same paragraph: "Reading plans →" then
`<span className="muted small sans"> — the whole canon, the New Testament, or the
Gospels, at your pace</span>`. Same spot, same `.plans-link` styling, no new chrome,
no new card.

**Tests.** Harness: the plans link keeps `/plans` and gains the explainer string.

## Item 5 — Settings dependent switches visually nested

**Problem.** The Commentary → Haydock/Catena → Doctors-only switch chain
(`Settings.tsx` Magisterium area) reads flat: subordinate controls look like
siblings, so the section scans as a control panel.

**Fix.** Purely visual nesting: a `.switch-nested` class (margin-inline-start +
hairline guide, token colors only) applied to controls whose enabled state depends
on a parent switch. No behavior, disable logic, or copy changes; existing §32
hit-slop and disabled-focus guards keep passing.

**Tests.** Harness: the dependent controls carry the class; the stylesheet defines
it with token references only (no hex).

## Item 6 — Small correctness fixes

- `lang="la"` on the footer motto (`App.tsx:283`, "Verbum Domini manet in æternum.")
  and on the rosary card's Latin name (`Home.tsx`, "Mysteria …") so screen readers
  voice them as Latin.
- `.readings-toolbar select` (`styles.css:1339`) drops `max-width: 8rem` inside the
  ≥640px block — "NABRE (import only)" stops truncating on desktop while phones keep
  the compact cap.

**Tests.** Harness: both `lang="la"` attributes pinned; the stylesheet carries the
≥640px override.

## Verification

`npm test` (harnesses + manifest + eslint), `npm run build`, `npm run check-docs`,
`npm run e2e` (16/16), plus a visual spot-check of the Mass page (fallback notice
once), Read tab (plans line), Settings (nesting), and the desktop toolbar select via
the committed screenshot harness pattern. Release prep: `package.json` + lock →
1.22.1, CHANGELOG entry, CLAUDE.md ledger line, README badge; no engine/golden/sw
change, no widget regeneration.
