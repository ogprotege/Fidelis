# Release narrative — the faithful record

*For: anyone tracing how Fidelis grew, release by release.*  · [← Docs index](../INDEX.md)

> Preserved verbatim from CLAUDE.md. The terse one-line ledger lives in
> [CLAUDE.md](../../CLAUDE.md#release-ledger); the canonical changelog is
> [CHANGELOG.md](../../CHANGELOG.md). This is the unabridged story.

---

<!-- BEGIN extracted narrative (verbatim) -->

## Identity release — design spec §1–§2 (v1.3.0)

The spec's visual/identity layer shipped in v1.3.0 "the identity release" — six work
items (A1–A6) on the `v1.1-identity` branch:

- **§1.1/§1.2 — token system + two-accent rule** (A1): every paint color lives in
  the day/night token blocks in `src/styles.css`; nothing outside them carries a raw
  hex, and no element wears both accents (**purple acts, gold honors**). The legacy
  `parchment` theme value migrates to `day` in `storage.ts`.
- **§1.3 — the liturgical year, in color** (A2): `accentFor()` in
  `src/lib/liturgical.ts` (pure, asserted in `test-liturgical.ts` §6–7) remaps
  `--purple` to the governing day's color via `<html data-accent>`, gated by the
  `followLiturgicalYear` setting (default on). White borrows gold; `--gold` and
  `--purple-strong` never move.
- **§1.4 — the Scripture face** (A3): EB Garamond bundled (4 woff2, ≈144 KB, SIL
  OFL in `src/fonts/`); `scriptureFont` ∈ `garamond|georgia|times|sans` drives
  `--scripture` via `<html data-font>` (the look-alike "System serif"/Iowan option was
  replaced in v1.13.2 with Georgia + Times New Roman so each face is visibly distinct);
  four size presets (17/19/22/25) own the vocabulary in `src/lib/typography.ts`. `sw.js`
  is font-aware (shell cache `v5` as of v1.13.2). Still no red-letter text — weight-400 only, asserted.
- **§1.5 — the icon set** (A4): `src/components/Icon.tsx`, six `currentColor`
  marks (bookmark, note, share, commentary, sun/moon, cross) on a 24×24 / 1.6-weight
  grid replacing the emoji glyphs; the iOS widget draws the cross natively. The
  harness forbids in-scope emoji in any `.tsx`.
- **§2.1 — five-tab nav** (A5): `src/components/TabBar.tsx` — Today/Read/Search/
  Mass plus a More popover (Library/Translations/Settings/About, **not a route**);
  header row on desktop, bottom bar on phones with the safe-area inset.
- **§2.2 — the one Settings screen** (A6): `src/SettingsContext.tsx` is the live
  source of truth (`useSettings()`/`update()`); the non-React engines still read
  `getSettings()` lazily (`update()` writes localStorage synchronously, so the next
  render sees it). `src/pages/Settings.tsx` holds the live preview, version cards,
  size/font pills, Appearance (System/Day/Night via `resolveTheme()` in
  `src/lib/theme.ts` + the follow-the-year switch), calendar region (moved off the
  Readings toolbar), and Data (offline download with real per-bundle sizes,
  marginalia export/import). App is the single writer of `<html data-theme>`. This
  supersedes P2-8's once-per-mount read.

**Deferred within §2.2** (each waits on a layer not yet built): the Settings
*Commentaries* subsection (needs the §4 commentary layer) and the optional single
daily-readings notification (off by default; bounded by standing rule 3 — no
notification pressure). §3 (Quote of the Day) and the §6 Today recomposition
shipped in 1.2.0; §6 card 4, §6.1, and §7 in 1.4.0 (the daily soul, below). The §4
commentary layer shipped in v1.5.0 (the formation release, below); the §8.3 share
card in v1.8.0 (the sower, below); §8.1/§8.2 Reader & Search refinements in v1.8.1
(the open door, below); §3.4 quote verification in v1.8.3; the buildable half of §9
(widget data pipeline + Android Mass/Quote widgets) in v1.8.4 (the doorposts); and
§5 (the CCC citation index) in v1.9.0 (the deposit, below). The remaining open
roadmap is the iOS half of §9 (WidgetKit Mass/Quote widgets + App Intents + Dynamic
Type, spec'd in docs/IOS.md §5, needs Xcode) and the rest of §10–§12 (§13 is the
binding refusal list, in the standing rules).

## The daily soul release — design spec §6 card 4, §6.1, §7 (v1.4.0)

The spec's devotional layer shipped in v1.4.0 "the daily soul" — three work items
(B1–B3) on the `v1.2-daily-soul` branch, pushed/merged as `v1.4.0`. Specs:
`docs/superpowers/specs/2026-06-14-{rosary-mystery-sheet,indulgence-timer,reading-plans}-design.md`.

- **§6 card 4 — the rosary mystery sheet** (B1): tapping a mystery on the Today card
  opens a reusable bottom-sheet (`src/components/Sheet.tsx` — `role="dialog"`, dimmed
  `--scrim` backdrop, Escape/backdrop/✕ dismiss, focus trap + return, z-60, no motion).
  `MysterySheet.tsx` renders the mystery's passage verbatim via the shared
  `passageText(data, ch, v, end?)` in `src/lib/passage.ts` — extracted from `VerseQuote`,
  which now calls it, so the sheet can never drift from the Reader (asserted per mystery ×
  DRC/CPDV/Vulgate, `test-data.ts` §11) — then the five prayers (`src/lib/prayers.ts`,
  Latin+English) collapsed. The 20 mystery refs in `rosary.ts` gained an optional `end?`
  for fuller passages. Honor is the gold quote-marks + gold "Prayers" label, **never a `✠`
  glyph** (the §1.5 emoji guard forbids ✠; `✕`/`✓` are allowed).
- **§6.1 — the reading-time indulgence** (B2): `src/lib/reading.ts` is the pure accumulator
  — `advance(prev, {type:'tick'|'resume', at})` with `dayKey` reusing `votd.dayOfYear` for
  DST-safe local-midnight rollover; a ≥10-min gap resets the continuity clock, the daily
  total persists at `fidelis:reading`, and an `earned` latch sticks until midnight.
  `<IndulgenceNotice enabled>` (Reader-scoped, Page Visibility API, ~15s tick) shows the
  gold line beneath the chapter title at 30 min — exact §6.1 wording, source-guarded in
  `test-data.ts` §12 — tap → conditions `Sheet`. `showIndulgence` setting (default on)
  hides it. Nothing renders before 30 min (§13.4 — no progress theater); harness-tested for
  gap reset and midnight rollover.
- **§7 — reading plans** (B3): `src/lib/plans.ts` is pure citation arithmetic over the real
  `canon.ts` counts (`chapters: number`, `verses: number[]` from `bookMeta.json`). Model
  `{ id, name, chapters: ["genesis/1",…], perDay, startedAt, completedThrough }` at
  `fidelis:plans` (storage CRUD + `activePlan()`, `ReadingPlan` imported type-only to avoid a
  cycle). Five presets; `weightedCanon()` interleaves the Psalter (Bresenham) then
  de-clusters so no perDay-day holds two ≥80-verse chapters (Psalm 118 gets a near-solo
  day). `/plans` (manage) and `/plans/new` (one-screen creator: grouped checkboxes, pace by
  chapters/day or target date, name) reached from Read; a Continue-Reading line + a
  "Mark today's portion read" action at the Reader's chapter end. "Day N" is a portion
  index, not a calendar streak. Arithmetic asserted in `test-data.ts` §13 (preset totals
  from real data, pace, completion advance, the weighted order).

The new `Sheet` primitive is built to host the §4 commentary layer (shipped in v1.5.0,
below). The single optional daily-readings notification stays deferred and off (no
notification pressure).

## The formation release — design spec §4 (v1.5.0)

The commentary layer shipped in v1.5.0 "formation" on the `v1.5-formation` branch:
the §4.1 data pipeline (commits C1/C2 — the source survey and the pinned, sealed
Haydock + Catena build) and the §4.2 Reader integration. Spec:
`docs/superpowers/specs/2026-06-15-commentary-reader-layer-design.md`; source survey:
`docs/review/Commentary_Sources_Survey.md`.

- **§4.1 — the data** (C1/C2): `scripts/build-haydock.mjs` + `scripts/build-catena.mjs`
  emit per-book JSON under `public/data/commentary/{haydock,catena}/`. Haydock is the
  1883 Dunigan USFM (`cmahte`, pin `0332c84`), keyed `"ch:v"` → `[{src,text}]`, all 73
  books; the Catena is the Newman/Oxford translation as the Isidore-Guild OSIS (CC0, pin
  `aebb0f6`), keyed `"ch:v"` → `[{father,text}]`, the four Gospels only. Both pins live in
  `scripts/pins.mjs` and seal into `manifest.json`; book slugs equal the app's DRC slugs
  (the five textless appendix books have no Haydock). Parser + key-coordinate + incipit
  assertions are `test-data.ts` §14–§15.
- **§4.2 — the Reader UI** (this release): a Haydock note gives a verse a **gold dot**
  after its number, drawn absolutely inside the `.vnum` margin so it never reflows the
  page (`.cmt-dot`; zero layout shift verified in a real browser). The verse action bar
  gains a **Commentary** action (union presence: Haydock note, or any Gospel verse since
  the Catena covers ~99%). It opens `CommentarySheet` via the `Sheet` primitive's new
  `variant="panel"` (bottom sheet on phones, right-docked side panel ≥640px): **Haydock**
  and **Catena Aurea** tabs, the Catena tab carrying per-Father chips + a **Doctors only**
  toggle. Commentary loads lazily — Haydock on book open (dots), the heavy Catena Gospel
  files only when a sheet opens. **No inline interleaving** (spec-mandated).
- **§2.2 item 7 — settings**: a Commentary section in `Settings.tsx` with a master
  `commentaryEnabled` (default on; off ⇒ no dots, no action), `commentaryHaydock`,
  `commentaryCatena`, and `commentaryDoctorsOnly` (default off) in `storage.ts`. Turning
  Haydock off also hides the dots (they mark Haydock), noted in the UI.
- **`src/lib/commentary.ts`** is the pure, asserted heart: `normalizeFather` canonicalises
  the Catena's 1,198 attribution labels (citation forms, transcription typos, the Glossa,
  Pseudo-*, and "It goes on" connectives), `groupCatena` folds connectives into the prior
  Father, `fathersOf` builds the chip list, `isDoctor` drives the filter. `test-data.ts`
  §16 asserts the identity calls (Gregory the Great vs Nyssa; Isidore of **Pelusium**, not
  the Doctor of Seville; Dionysius of Alexandria vs the pseudonymous Areopagite; Newman a
  Doctor) and a corpus-wide guard that ≥93% resolve to a Father and the "source" fallback
  hides none. **Psalm versification (mapped):** Haydock keys are remapped onto the
  bundle's Vulgate grid in `build-haydock.mjs` — `remapPsalmKey` routes the renumbered
  second-halves (Ps 115/147) through `hebrewSpanToVulgate`, and the joined psalms (9/113)
  already align — so the gold dots land on the right verse. Verified incl. the title-offset
  Miserere (`test-data.ts` §15 asserts `Ps 50:3`, `115:1`, `147:1` incipits), and a
  key-fault guard asserts every Haydock/Catena key lands on a real DRC coordinate. (The
  earlier "may sit one verse off" caveat predated this mapping; it is closed.)

Deferred from §4 and after: §5 (the CCC citation index — verse→paragraph links, the
Catechism text never bundled) shipped in v1.9.0 "the deposit" (see "The deposit" section
below); commentary offline-download (Settings → Data) shipped in v1.8.1 "the open door".
Per-Father "by era" filtering remains open.

## The Android shell — the "freely given" release (v1.6.0)

A distribution release (`v1.6.0`): no app behavior changed — the web bundle is
byte-identical to 1.5.1 — but Fidelis now ships a **native Android shell** beside
iOS, and the README states the free-forever pledge explicitly.

- **Android (Capacitor)**: `npx cap add android` generated `android/` — the same
  `dist/` build in a native WebView, offline by construction (no service worker in
  the Capacitor WebView; the whole bundle ships in the APK, exactly as iOS). App id
  `app.fidelis.bible`; `capacitor.config.ts` gained `android.backgroundColor`
  matching the day `--bg-0` token. The committed scaffold mirrors iOS — the Gradle
  project + resources are tracked, the synced `app/src/main/assets/public` and the
  build output gitignored (`android/.gitignore`). Build/run:
  `npm run build && npx cap sync android && npx cap open android` (Android Studio).
  Guide: `docs/ANDROID.md`. `@capacitor/android` pinned to `^8.4.0` to match the
  existing Capacitor packages.
- **The native widget was iOS-only at 1.6.0**; the Android App Widget shipped in
  **1.7.0 "the lampstand"** (below), reusing the pre-resolved `votd.json`
  (`scripts/build-votd-widget.mjs`) rather than porting the selection math.
- **The free pledge** is now explicit in the README — masthead, a `free · forever`
  badge, a Highlights row, and the refusal list — the FREE keyword beside the
  standing no-accounts / no-tracking / no-data positioning, consistent with
  standing rule §13.5 (no ads or in-app purchases, ever).

## The lampstand release — the Android home-screen widget (v1.7.0)

The Android **Verse of the Day App Widget** (`v1.7.0` "the lampstand", Matt 5:15) — the
native counterpart of the iOS WidgetKit widget and the tracked follow-up from 1.6.0:

- **`VotdWidget`** (`android/app/src/main/java/app/fidelis/bible/VotdWidget.java`, a
  RemoteViews `AppWidgetProvider`) reads the bundled `res/raw/votd.json` and selects the
  day's verse with the **same formula** as `src/lib/votd.ts` and the iOS widget —
  `index = (dayOfYear + year) mod count`, Gregorian, device tz — so the three never disagree.
  Resources: `res/layout/widget_votd.xml`, `res/xml/votd_widget_info.xml`,
  `res/drawable/{ic_cross_gold,widget_bg}.xml`, `res/values/colors.xml` (the day tokens). The
  gold cross is drawn natively (the §1.5 icon, never an emoji); refresh is an inexact
  local-midnight `AlarmManager` (no exact-alarm permission); tap opens the app. Offline.
- **Wired entirely in the committed project** — unlike iOS (where the Widget Extension target
  must be created in Xcode by hand), an Android App Widget is just a `<receiver>` + resources
  in `AndroidManifest.xml`, so there is no manual IDE step.
- **`scripts/build-votd-widget.mjs` now emits both** `ios/WidgetExtension/votd.json` and
  `android/app/src/main/res/raw/votd.json` (`npm run votd-widget`).
- Reboot caveat: the midnight alarm re-arms on the next widget update after a reboot; a
  `BOOT_COMPLETED` receiver is a small future refinement.

Also rode in on this release (docs only): the **§5 CCC citation index** design spec + a
**local-build runbook** (`docs/superpowers/specs/2026-06-15-ccc-*`) — signed off; **now
shipped as v1.9.0 "the deposit"** (built locally from the owner's USCCB PDF + vatican.va —
see "The deposit" section below); and a step-by-step **iOS Simulator** guide in `docs/IOS.md`.

## The share card — design spec §8.3 (v1.8.0)

The spec's evangelization vector shipped in v1.8.0 "the sower" — the §8.3 share
card — on the `claude/share-card` branch (cut from `main`/1.6.0; v1.7.0 "the
lampstand" shipped in parallel and merged first).

- **`src/lib/shareCard.ts`** renders a verse or a quote to a 1080×1350 PNG on a
  `<canvas>` — `renderShareCard(canvas, {text, citation, source?, theme})`: the
  warm-gray field, the text auto-fit and wrapped in EB Garamond italic, the §1.5
  cross drawn natively in gold, the gold citation (carrying the translation
  abbreviation), an optional muted source line, and a small letterspaced
  "FIDELIS" wordmark. Two themes only — Day/Night — from the styles.css day/night
  tokens, frozen in `PALETTE` so the card matches the app. The two-accent rule
  holds: **gold honors** (cross, wordmark, citation), the ink carries the text,
  nothing is purple (nothing on the card is interactive). No imagery, no
  red-letter (§13) — typography on a field.
- **`src/components/ShareSheet.tsx`** is the chrome on the shared `Sheet`
  primitive: a live canvas preview, a Day/Night pill toggle (default = the app's
  current `<html data-theme>`), and the two exits — the native share sheet via the
  **Web Share API** (`navigator.share` with the PNG file; works in Capacitor on
  iOS/Android) and a plain image **download** fallback where sharing files isn't
  supported.
- **Three entry points** (spec: "from the verse action bar and the quote card"):
  a **Share** action on the Reader's verse bar (`Reader.tsx`, beside Copy/
  Commentary), and a **Share** affordance on the Today page's Verse of the Day and
  Quote of the Day cards (`Home.tsx`). The verse text comes from the shared
  `passageText()`, so the card can't drift from the Reader.
- **No harness test:** the card is a canvas/DOM surface (no node-testable pure
  arithmetic), browser-verified like the §4.2 gold dot. `tsc`, `npm run build`,
  and the existing harnesses (incl. the §1.5 emoji guard over `.tsx`) stay green.

## The open door — a11y + polish release (v1.8.1)

A quality/polish release on the `quality/close-the-quiet-loops` branch — "close the
quiet loops": finish the design language already in place rather than add a new one.
No new dependency; everything routes through the day/night tokens, the §1.5 `Icon` set,
the two-accent rule, the five-card Today limit, and the `prefers-reduced-motion` guard.
Plan: `docs/superpowers/plans/2026-06-16-close-the-quiet-loops.md`.

- **Accessibility (the headline):** the Reader verse spans are now operable
  (`role="button"`/`tabIndex`/`aria-pressed`/Enter+Space) — the marginalia layer was
  mouse-only; the Settings version `radiogroup` gained ARIA-APG roving-tabindex arrow
  keys; the highlight swatches expose `aria-pressed` + a gold-ring selected state. All
  reuse the existing purple `:focus-visible` ring (no visual change at rest).
  **v1.8.2 "every tongue"** followed up with `lang="la"` on every Latin text node
  (Reader verse column + parallel Latin side, Mass reading bodies, Verse/Quote and
  rosary passages, the antiphon and the five prayers' Latin, the Vulgate chapter
  title) so screen readers stop applying English phonetics to the Clementine Vulgate.

**v1.8.3 "the cloud of witnesses"** closed the §3.4 quote-verification ledger: all 47
Quote-of-the-Day entries (flagged `verified: false` since 1.2.0) are now verified against
accessible public-domain sources — 26 confirmed verbatim, 15 wording/edition corrections to
the cited public-domain text, and 6 with no public-domain edition replaced by PD-verifiable
passages from the same authors (fitting the same feast/season slots). Verification read the
PD sources directly (CCEL, New Advent, Gutenberg, Internet Archive); aggregator sites were
not trusted. `scripts/quotes.corpus.json` is the source (then `npm run quotes` re-seals);
About now states every quotation is verified, closing the §11 trust-surface residual.

**v1.8.4 "the doorposts"** shipped the buildable half of §9 (iOS/Android depth): a
pre-resolved widget data pipeline — `scripts/build-calendar-widget.ts`
(`npm run calendar-widget` / `npm run widgets`) emits a date-keyed `calendar.json`
(season/color + Mass-reading citations + Quote of the Day, ~2-year rolling window) to
both native bundles from the web app's own `resolveReadings`/`liturgicalDay`/
`quoteOfTheDay` (no engine ported) — plus two **Android** App Widgets (`CalendarWidget`
"Today at Mass", `QuoteWidget` "Quote of the Day"), wired entirely in the committed
project like the v1.7.0 VOTD widget. The iOS WidgetKit widgets + a "today's Gospel" App
Intent + Dynamic Type are specified in `docs/IOS.md` §5 for an Xcode session (target
creation can't be scripted). Regenerate the data after any calendar/quote change; the
window depends on the build year.
- **§8.2 Search** filter chips (OT/NT/Gospels) with live per-group counts. The pure
  membership helpers are `src/lib/search.ts` (`inFilter`/`bookGroupKind`), asserted in
  `test-data.ts` **§18** (note: §17 is the pre-existing reference-parser block — the CCC
  layer's tests must therefore be §19+, not §17/§18). The "exact-phrase ranking" half of
  §8.2 was intentionally dropped: Search already requires the full query as a contiguous
  substring, so every hit is already a phrase match (ranking would be dead code, and naive
  all-words matching would flood results with stopwords).
- **§8.1 Reader:** a chapter tap-grid via the `Sheet` primitive (opened from the chapter
  number in the title; the dropdown stays), and the deep-linked `?v=` verse now gets a
  transient (~3s, JS-timed so it's reduced-motion-safe) gold rule instead of permanent
  selection that popped the action bar.
- **Commentary offline download** (Settings → Data): reuses the generic `downloadBundle`
  over the manifest's `commentary/` bundle (Haydock whole-canon + Catena Gospels, ~42 MB);
  the SW caches `/data/commentary` like any other `/data/` path.
- **Quiet quality:** dignified italic loading lines (no bare ellipsis), distinct
  `copy`/`download`/`upload` `Icon` marks, the dove emoji dropped from the antiphon, the
  Search button disabled below 2 chars, a calm Readings null-state with a real link, a
  phone-compacted reader toolbar, warm `--shadow-soft`/`--shadow-tabbar` tokens replacing
  cold `rgba(0,0,0)` shadows, inline magic numbers folded into named classes, and a single
  ~110ms reduced-motion-gated `Sheet` entrance.
- **Housekeeping** that rode in: README badge reconciled, the 1.2.1 CHANGELOG date
  inversion, the B.x wording, a dev-tag-collision note on the 1.3.0 entry, and the CCC
  spec/runbook test-numbering fix. Five stale merged branches deleted/pruned.
- **Deferred** (recorded): the Vulgate-Psalm commentary-dot mapping pairs with the §5 CCC
  build (one Hebrew→Vulgate mapping effort); per-Father "by era" filtering; the optional
  daily-readings notification stays off.

## The deposit — design spec §5 (v1.9.0)

The CCC citation index — "Scripture-to-Magisterium" links — shipped in v1.9.0 "the deposit"
(2 Tim 1:14) on the `v1.9-ccc-index` branch. **Facts only:** the verse→¶ citation numbers and
the ¶→vatican.va URLs ship; the Catechism text is never bundled (the bright line in the spec +
runbook). Built locally from the owner's USCCB 2nd-Ed PDF + a vatican.va crawl — both are
**input/verification only**.

- **§5.1 the data** (`scripts/build-ccc.mjs`): parses the PDF's *Index of Citations / Sacred
  Scripture* appendix (pdftotext column crops of pp.709–740) into `public/data/ccc/index.json`
  — 4,613 verse keys → CCC ¶ numbers. Book names map Douay-ish CCC spellings (Ezechiel,
  Zachariah, Song of Solomon) to app slugs; verse ranges expand to each verse; cross-chapter/
  whole-chapter ranges anchor on the start verse. **Psalms**: the CCC numbers Hebrew, the
  bundle is Vulgate, so every Psalm key is mapped via the tested `hebrewSpanToVulgate()`
  (CCC "Ps 22:1" → `psalms 21:2`). ~21 NAB-vs-Douay-versification citations are dropped, not
  mis-pointed (honesty rule). `scripts/build-ccc-urls.mjs` crawls vatican.va ENG0015
  (`<p class=MsoNormal>N` marks each ¶) → `public/data/ccc/url.json` (1,258 ¶, all official
  URLs; the page URL is the target — the archive exposes no per-¶ anchor). `npm run ccc` runs
  both + re-seals the manifest. Neither script runs in CI (PDF is local, crawl is network); the
  committed JSON is the sealed artifact.
- **§5.2 the Reader** (`src/lib/ccc.ts` pure + tested; `src/lib/data.ts` `loadCCC()` memoized
  like `loadCommentary`): below the Commentary action, a `CCC ¶… · ¶…` row when the verse is
  cited and `cccLinksEnabled`. **Purple links, muted "CCC" label, no gold, no dot** (two-accent
  rule); `+N more` past eight; links open vatican.va in a new tab. A new **Magisterium**
  Settings section holds `cccLinksEnabled` (default on, merge-safe).
- **Tests** (`test-data.ts` §19): index shape, 0 danglers, the Hebrew→Vulgate Psalm mapping
  (Heb 22:1 → `psalms 21:2`, ¶603), pinned anchors (john 3:16 ⊇ 219/444/458; genesis 1:1 ⊇
  268/279/290; matthew 16:18 ⊇ 552/881), full URL coverage, manifest seal. Anchors verified
  directly against the PDF (genesis 1:1, john 1:1 match exactly incl. range-anchored ¶).
- **Note for re-runs:** §19 is the CCC block; §17 (reference parser) and §18 (search filters)
  precede it. Regenerating needs `CCC_PDF` pointed at the USCCB 2nd-Ed PDF; the URL crawl
  depends on vatican.va being reachable.

## Made plain — the iOS crispness pass (v1.10.0)

An iOS polish release on the `ios/crisp-and-clear` branch — "make it plain upon tables"
(Hab 2:2). No new design language: every change routes through the day/night tokens, the
two-accent rule, the §1.5 icon set, the five-card limit, and the §13 refusals. Driven by a
six-dimension iOS audit (43 confirmed findings) and a three-reviewer adversarial pass; the
four product/identity decisions were the owner's (the CCC marker form, the Today reorder,
the gold-contrast split, and adding the status-bar plugin). The `ui-ux-pro-max` skill was
used as the iOS **checklist** only — its style/color generator is off-identity for Fidelis
(see the `design-skills-polish-verdict` memory).

- **The keystone — safe areas actually apply.** `index.html` gained `viewport-fit=cover`;
  without it every `env(safe-area-inset-*)` already in `styles.css` (tab bar, verse-action
  bar, sheets, footer) resolved to **0** on notched iPhones, so all that inset work was inert.
  Paired with `padding-top: env(safe-area-inset-top)` on the sticky `.header`, left/right
  insets on the tab bar and `.page` gutters (landscape), `dvh` for `.app`/`.sheet`/`.sheet.panel`,
  and **`ios.contentInset: "never"`** in `capacitor.config.ts` so the CSS insets are the single
  source of truth (with `"automatic"` the native scroll-view inset + the CSS inset doubled — a
  regression the review caught; re-`npx cap sync ios` to push the config to the native mirror).
- **Native touch feel.** A global `-webkit-tap-highlight-color: transparent` (no grey iOS flash),
  `touch-action: manipulation` (no ~300ms delay), real `:active` press states + a 0.98 press-scale,
  and **`:hover` guarded behind `@media (hover: hover)`** for every toggle/persistent control so a
  tint can't stick after a tap. 44pt targets: `.icon-btn` (inline-flex, `min-height: 44px`), the
  Catechism ¶ links, the highlight swatches (a `.verse-actions .hl-dot::after` grows the tap box
  vertically without enlarging the disc or overlapping neighbours), and the A−/A+ steppers.
- **§5 CCC discoverability** (owner decision): a verse cited in the Catechism wears a quiet purple
  **underline** under its verse number — `.ccc-mark`, drawn absolutely in the `.vnum` gutter (zero
  reflow, like the gold `.cmt-dot`), in a new **fixed** `--ccc-mark` brand purple that never follows
  the liturgical accent (so it can't turn gold and collide with the Haydock dot). `isCited()` in
  `src/lib/ccc.ts` is the pure gate (tested in `test-data.ts` §19). The action-bar label is now
  **Catechism** (was "CCC"), lifted off the action cluster by a hairline. The CCC *links* keep
  `--purple` (they follow the accent like all interactive text); the *mark* is fixed — a deliberate
  asymmetry (the mark is a structural hint, the links are the interaction).
- **The gold-contrast split** (owner decision — revisits the documented "don't darken gold"
  tradeoff in the `design-tokens-two-accent` memory): a new `--gold-text` token (Day `#8A6D1F`
  ≈4.6:1, Night `#D4B254`) carries gold **as running text** — the small-caps section labels, the
  Father attributions, the motto, the indulgence line — while the gold **marks** (✠, quote marks,
  the selected-verse rule, note/bookmark marks, `.cmt-dot`, the testament rule) keep the exact
  luminous `--gold #A8862C`. The white/rose `[data-accent]` Day values are deepened to clear AA
  (white → `#8A6D1F`, rose → `#B14F73`). The `test-liturgical.ts` accent-hex table and the
  `test-data.ts` prayers-label regex (`var(--gold(-text)?)`) were updated to match.
- **The native status bar** (`@capacitor/status-bar@8`): `App.tsx` calls `StatusBar.setStyle`
  to follow the resolved theme on native (iOS ignores `theme-color`); guarded by
  `Capacitor.isNativePlatform()`, a no-op on the web. Registered in both native projects by
  `npx cap sync`.
- **Crispness + sheet idiom.** A `--hairline` token (1px; **0.5px on Retina** via a dpr media
  query) replaces the literal `1px solid var(--border)` on every structural separator. The bottom
  `Sheet` gained a grabber pill (`::before`, phones only), `overscroll-behavior: contain` +
  `-webkit-overflow-scrolling: touch`, and an **iOS-safe body lock** (`position: fixed` + offset,
  restored on close, effect run once with `onClose` via a ref so a parent re-render can't re-pin).
  The Today page now leads on a phone with **"Today in the Church"** (still five cards); the
  Scripture size presets render in `rem` (Dynamic Type); the deep-linked verse scrolls smoothly
  (reduced-motion-safe) and lands with a transient gold wash.
- **Still open** (unchanged): the iOS WidgetKit / App-Intents / Dynamic-Type Xcode session
  (`docs/IOS.md §5`). Device step for this release: after `npx cap sync ios`, verify the safe-area
  insets (no doubled gap) and the Night status bar on a notched simulator.

## NABRE as the U.S. Mass default — "the proper of the day" (v1.11.0)

The Daily Readings now default to the **NABRE** — the translation of the U.S. lectionary —
when the calendar region is the United States, honoring the owner's "be consistent with the
USA" intent. **The legal posture is unchanged and binding:** the NABRE is © Confraternity of
Christian Doctrine and is **never bundled** (`translations.ts` `bundled:false`). This release
builds only the *mechanism* that prefers it; no NABRE text lives in the repo. The owner imports
their own licensed copy via the existing on-device JSON import (`Translations.tsx` → IndexedDB).

- **`massTranslationFor(settings)`** in `src/lib/storage.ts` (pure, tested — `test-data.ts` §20):
  an explicit `settings.massTranslation` wins; otherwise `nabre` for `calendarRegion === "usa"`,
  else the general reading translation. New `massTranslation: string` setting (default `""` =
  auto; merge-safe).
- **Readings page** (`src/pages/Readings.tsx`) defaults its translation to `massTranslationFor`
  and the toolbar `<select>` lists bundled + imported + always-NABRE (a `(import)` hint when not
  yet imported); swaps are per-visit. A discreet USCCB official-readings link sits in the footer.
- **Graceful fallback** (`src/components/ReadingText.tsx`): if the chosen translation is
  import-only and absent, it renders the bundled **Douay-Rheims** instead (so the reading stays
  readable offline) and shows a one-line "import your licensed NABRE" pointer; the citation link
  and `lang` follow the translation actually shown.
- **Settings → Calendar → Mass readings** (`src/pages/Settings.tsx`): a select to pin the default
  (Match region / DRB / CPDV / VUL / NABRE / RSV-2CE), writing `massTranslation`.
- **Docs updated** (owner request): README, About, the `translations.ts` NABRE blurb, and this
  file all describe the import-aware default. The two-accent / §13 / five-card rules are untouched.

## The straight paths — navigation & IA (v1.12.0)

A whole-app navigation/information-architecture pass on `feature/navigation-ia` so every screen is
"a single readable, navigable page" with seamless forward/back and no broken state in any nav
combination (the owner's bar). Driven by a verified nav audit (29 findings) + an adversarial review
(6 fixes folded in). Spec: `docs/superpowers/specs/2026-06-17-navigation-ia-design.md`. No identity
change (two-accent, §13, five-card, tokens all hold). One new dep: `@capacitor/app@^8`.

- **Scroll authority** — `src/components/ScrollManager.tsx` (mounted once in `App`, outside
  `<Routes>`) + pure `src/lib/scroll.ts` (`decideScroll`/`hasScrollTarget`, tested `test-data.ts`
  §21). `decideScroll` precedence (review-corrected): **target (`?v=`/`#hash`) → skip; REPLACE →
  skip; POP → restore; PUSH → top**. Saves `scrollY` per `location.key` (throttled listener,
  50-entry cap), restores on POP with a bounded rAF retry that **stops on user scroll or when the
  page stops growing**. `main.tsx` sets `history.scrollRestoration = "manual"`. Reader's old
  `scrollTo(0,0)` removed; Readings day-stepper uses `replace`.
- **SectionNav** — `src/components/SectionNav.tsx`: a sticky purple jump bar (scrollIntoView, no
  URL change → HashRouter-safe) on Readings/Settings/About/BookList; targets carry `id`s; tokens
  `--header-h` (≈2.9rem, the real header height — browser-measured) and `--anchor-offset` (header +
  bar) drive `scroll-margin-top`. Cross-page `#fragment` links (e.g. `/translations#rsv2ce`) handled
  by ScrollManager's skip-branch.
- **Overlay-back** — `src/lib/overlays.ts` module singleton (push/remove/closeTop, tested). `Sheet`
  and the `TabBar` More popover register a closer on open. `App.tsx` registers ONE `@capacitor/app`
  `backButton` listener (native-guarded): close topmost overlay → else `history.back()` → else
  `App.exitApp()`. (iOS edge-swipe is off by default, so no history-routing of overlays — see spec.)
- **Focus/skip** — `App.tsx` moves focus to `#main` on route change (keyed on `location.key`),
  **but not when `?v=` is present or when something already holds focus** (so Search's autofocus and
  in-place filter/day-step controls keep focus — review fix). A `.skip-link`; the More popover
  focuses its first item.
- **Search URL-state** — `src/pages/Search.tsx` reflects `q`/`t`/`g` in the URL (`replace`) and
  re-runs on mount, so Back into Search restores it instead of a blank page.
- **Consistency** — Home titled "Today" + date subtitle; Reader "← All books" crumb; Readings
  null-state `.continue-cta`; Translations `h3`→`h2`; brand uses `Link` (no duplicate `aria-current`);
  About copy "CCC"→"Catechism".
- **Deferred** (in the spec): scroll-spy current-section highlight; verse-action-bar occlusion
  padding; PlanCreator sticky Start; Reader selected-verse in the URL.

**v1.12.1 "readable again"** — visual-regression fixes after the nav release, diagnosed live in a
browser: a global `select` style (the Settings selects had no background → white-on-white in Night);
the SectionNav redesigned from bare links into rounded chips; selected states (`.pill/.chip/.tabs
button/.cmt-chip` active) changed from a filled `--purple-strong` to a **liturgical-colored outline**
(`--purple` border + inset ring, readable text) so selections show the day's color; and a service-
worker shell-cache bump (`v3`→`v4`) so installed/PWA copies fetch the current build (the cause of
"quotes don't load" / "sizes stuck at Medium" — both already correct in code, just stale-cached).

**v1.12.2 "bring your own"** — practical import of a translation the owner has a license to (e.g. the
NABRE). `src/lib/import-formats.ts` (pure, tested §22) adds **USFM** and **OSIS** parsing beside the
scrollmapper JSON, with a USFM-code / OSIS-id / book-name → slug resolver; `Translations.tsx` uses it.
`scripts/build-nabre.mjs` (`npm run build-nabre "<pdf>"`) converts a NAB/NABRE PDF the owner owns into
a gitignored `nabre.local.json` (monotonic-verse heuristic; rough on messy PDFs). **No scripture text
is in the repo or these scripts** — the parsers are logic only, output is on-device and gitignored
(`*.local.json`), preserving the "copyrighted texts are never bundled" design. The owner's NAB PDF is
local; the converter is run by the owner, not committed.

**v1.12.3 "the faithful record"** — documentation reconciliation (this pass): README badge/content,
this file, and the CHANGELOG aligned to the current feature set; the first git tags + GitHub release.

## The proper of the day, by default — v1.13.0

Align Fidelis with the **USCCB by default** so the calendar, the readings, and the home-screen
widgets are consistent out of the box. The legal posture is unchanged and binding (the NABRE is
© Confraternity of Christian Doctrine and is **never bundled or committed**; this changes only
*defaults*):

- **`calendarRegion` now defaults to `"usa"`** (was `universal`) and **`massTranslation` defaults
  to `"nabre"`** (was `""` = match region), both in `src/lib/storage.ts`. So a fresh install opens
  the U.S. (USCCB) liturgical calendar and the NABRE Daily Readings. `massTranslationFor()` is
  unchanged (an explicit choice still wins; `""` still means match region); until a licensed NABRE
  is imported the readings fall back to the bundled Douay-Rheims with the in-line import pointer.
  The §20 harness and golden snapshots (which pin both regions explicitly) hold; the one
  default-region-dependent assertion in `test-liturgical.ts` (St. Matthias vs. Ascension) now names
  its region.
- **`scripts/build-calendar-widget.ts` uses the USA region**, and the regenerated `calendar.json`
  ships to both native widget bundles, so the home-screen "Today at Mass" widget matches the app.
- Settings → Calendar copy documents the U.S./USCCB + NABRE defaults.

## The second lampstand — iOS widgets + macOS CI — v1.13.1

The iOS home-screen widgets reach parity with Android, and the native iOS shell is now built in CI:

- **`ios/WidgetExtension/CalendarWidgets.swift`** adds `MassWidget` ("Today at Mass") and
  `QuoteWidget` ("Quote of the Day"), the iOS counterparts of the Android widgets, reading the same
  `calendar.json` keyed by a Gregorian + device-tz ISO date so iOS/Android/web never disagree.
  `FidelisWidget.swift`'s `@main` bundle registers all three. (The Widget Extension *target* was a
  manual Xcode step at 1.13.1; v1.13.2 automated it with `scripts/add-ios-widget-target.rb`, below.)
- **`.github/workflows/ios.yml`** builds the iOS App target for the simulator on `macos-latest`,
  selecting the newest Xcode. Capacitor 8.4.x ships its iOS framework as a binary built with **Swift
  6.2**, so the build needs Xcode 17+/26 (an older Xcode fails with misleading "`CAPBridgeProtocol`
  has no member `webView`" errors). Capacitor bumped 8.4.0 → 8.4.1 (latest stable).
- Native version strings (`android/app/build.gradle`, iOS `MARKETING_VERSION`) reconciled to the
  app version (they had lagged at 1.12.3).

## The unbound page — iOS shell fixes — v1.13.2

Three iOS-shell fixes plus three small additions, found while running the Capacitor app in the iOS
Simulator. The liturgical engines, the bundled texts, and the harnesses are unchanged.

- **Scroll freeze (`src/lib/scrollLock.ts`, `src/components/Sheet.tsx`).** The bottom-sheet body-lock
  saved/restored `document.body`'s inline styles per `Sheet` instance. The Reader renders the
  Commentary, Share, and chapter-picker sheets independently, so two could be open at once; the second
  captured the already-locked `position: fixed` and, closed out of order, restored it with no sheet
  open — the document collapsed to the viewport and **nothing scrolled** (reproduced on device:
  `pos=fixed`, `scrollHeight==innerHeight`). The lock is now a shared, reference-counted module: pin
  the body once on the first sheet, restore the true pre-lock state only when the last sheet closes.
  Order-independent, so the leak class is gone. (Aside confirmed in the same session: the iOS Simulator
  does not scroll web content with two-finger trackpad — you must click-drag; that part is expected.)
- **Scripture face picker did nothing on iOS (`src/lib/fontLoader.ts`, `src/main.tsx`).** Under the
  `capacitor://` scheme, iOS WebKit doesn't reliably fire the lazy CSS `@font-face` download, so the
  bundled EB Garamond never loaded and fell back to `Iowan Old Style` — identical to the then-existing
  "System serif" option, so two of the faces looked the same (the lineup is now four; see below).
  `preloadScriptureFonts()` forces the face via
  the Font Loading API at startup (which *does* work in that WebView); `font-display: swap` repaints.
  A no-op on the web. The file, MIME, path, and unicode-ranges were all fine — only the implicit fetch
  never fired.
- **iOS home-screen widgets never appeared.** The WidgetKit Swift + JSON existed, but the Xcode
  project had no Widget Extension target, so nothing built. `scripts/add-ios-widget-target.rb`
  (idempotent; `xcodeproj` gem) adds `FidelisWidgetExtension`, compiles both Swift files, bundles
  `votd.json`/`calendar.json`/`Info.plist` (`com.apple.widgetkit-extension`), and embeds the `.appex`
  in the App target. All three widgets build/embed and support small/medium/large. This automates the
  former manual `docs/IOS.md` §5 step; the App-target CI build now compiles the widgets as a dependency.
- **The native app icon is the Chi-Rho** (gold ☧ with Alpha/Omega on a dark field), on iOS and Android:
  the iOS `AppIcon` is a 1024×1024 opaque icon; the Android adaptive icon insets the Chi-Rho on a dark
  (`#222222`) background, with edge-to-edge legacy mipmaps. (The two unused Capacitor-default icon
  vectors — the teal grid + green robot — were removed.)
- **The Scripture-face lineup is now four visibly-distinct faces** — Garamond / Georgia / Times New
  Roman / Sans-serif (ids `garamond|georgia|times|sans` in `src/lib/typography.ts`; the look-alike
  "System serif"/Iowan option is gone). A retired saved `serif` id normalizes to Garamond (the default)
  at both the `index.html` boot script and `getSettings`, so no stale value strands the reader (the dead
  `[data-font="serif"]` CSS rule was removed).
- **Service-worker shell cache `v4`→`v5`** (`public/sw.js`) so an installed/PWA copy fetches this build
  (the new faces and the Chi-Rho icon) instead of serving stale assets.

## Made ready — TestFlight prep, the Gospel by voice, Dynamic Type (v1.13.3)

The release that makes Fidelis ready to hand to a tester. It closes the last open piece of the
design spec (§9), lands the documentation revamp, and finishes three design rough edges. The
liturgical engines, the bundled texts, and the harnesses' computed results are unchanged.

- **The last of §9 — a Siri / Shortcuts App Intent and Dynamic Type.** `TodaysGospelIntent.swift`
  (App Intents, iOS 16+, gated behind `@available`) answers "What's today's Gospel in Fidelis?" by
  speaking the day's Mass Gospel citation with the celebration/season as context — `openAppWhenRun =
  false`, so it never leaves what the user is doing. It reads the *same* pre-resolved `calendar.json`
  the widgets read, keyed by the identical Gregorian `yyyy-MM-dd` device-local key, so no engine is
  ported and Siri can never disagree with the widgets, Android, or the web app. Dynamic Type adds a
  "Follow the system text size" switch (iOS): `AppDelegate` mirrors `preferredContentSizeCategory`
  into the web layer (`window.__fidelisSetContentSize`) on launch, foreground, and change; the pure
  token→px map (`contentTokenToPx`) is harness-tested; the A−/A+ pills stay the override. A fresh
  install follows the system size, an existing user keeps the size they chose. Both verified compiling
  against the real iOS SDK (the App scheme builds the embedded widget too).
- **iOS made ready for the App Store.** `ITSAppUsesNonExemptEncryption = false` (the app ships only
  exempt OS-provided HTTPS — no custom crypto), so no build is held in Missing Compliance; a first-party
  `PrivacyInfo.xcprivacy` declares no tracking, no collected data, and the one required-reason API
  (UserDefaults, CA92.1); the deprecated `"iPhone Developer"` code-sign identity becomes `"Apple
  Development"`; and the legacy `armv7` capability becomes `arm64`. A new idempotent
  `scripts/configure-ios-app-target.rb` wires the privacy manifest, the Intent source, and the
  Intent's `calendar.json` into the App target (the counterpart to `add-ios-widget-target.rb`), which
  now derives the widget version from `package.json` rather than a frozen literal. The one step only
  the owner can do remains: enrol in the Apple Developer Program and set `DEVELOPMENT_TEAM`.
- **The documentation revamp** (seven tasks): a hub-and-spoke `docs/INDEX.md`, this narrative archived
  out of CLAUDE.md with a slim one-line ledger, guides moved under `docs/guides/`, CONTRIBUTING + a
  releasing runbook + a specs/plans status index, a README front-door rewrite, and a `check-docs`
  link-checker in CI so a dead doc link fails the build. Its slug function was then fixed to match
  GitHub's anchor algorithm (it had collapsed em-dash double-spaces to a single hyphen, breaking ~11
  ledger "→ detail" links on github.com) and the affected anchors regenerated.
- **Three design finishes.** The inline SVG icon set gains `close` (✕) and `check` (✓) marks, retiring
  the last raw Unicode glyphs across the Sheet close, the highlight-clear, the verse-actions close, the
  version check, the "Saved" state, and the "Mark portion read" CTA — and the harness now forbids ✕/✓
  in `.tsx`. The verse-action bar fences its four highlight swatches in one hairline segment so they
  never interleave with the labelled actions on a narrow wrap. And the Verse/Quote-of-the-Day cards
  reserve their text height with quiet, motion-free skeleton lines, so the Today grid no longer reflows
  when the async text lands.

## The open catechism (v1.14.0)

One release that lands four long-promised pieces of the §3 / §4.3 / §5 plan: the Catechism becomes
readable in place, the Golden Chain reads in order, the daily quote stops repeating, and the widgets
follow dark mode.

**§5 text tier — the inline Catechism (CCC P1).** The cited-verse Catechism affordance was, since
v1.9.0, a link out to vatican.va. It now opens an inline `CCCSheet` (the `Sheet variant="panel"`
primitive) whose primary content is the **public-domain Roman Catechism (Trent), McHugh-Callan 1923**,
browsable by the four Parts (the Creed, the Sacraments, the Commandments, the Lord's Prayer), with the
precise vatican.va ¶ links kept *inside* the sheet rather than replacing it. The bundle is built by
`scripts/build-trent.mjs` from a **pinned GitHub source** (`mborders/romanus` — an MIT-licensed
structured-JSON digitization; the underlying 1923 text is itself public domain in the U.S.) into a
manifest-sealed `public/data/trent/trent.json`, keyed by edition so a future Donovan 1829 edition slots
in with no shape change. The data source decision was the owner's: McHugh-Callan ships first because it
is the one with a clean, reproducible, machine-readable source (Donovan exists only as Wikisource
HTML). `src/lib/catechism.ts` holds the pure `pickTier` (imported → Trent → links) and `pickEdition`;
the sheet carries **no gold** — purple acts, the source credit is muted provenance (unlike the gold
Catena credit), asserted by source-grep in the harness.

**§5 text tier — your own modern Catechism (CCC P2).** The modern *Catechism of the Catholic Church*
is under copyright and is **never bundled**. An owner who has a digital copy can import it (Settings →
Magisterium) as a `fidelis-ccc-1` paragraph JSON, validated by the pure `parseCccText` (three tolerant
shapes, the 1–2865 key space shared with `url.json`, footnote-apparatus hygiene, no embedded text). It
is stored **only on the device** (the existing `fidelis-imported` IndexedDB, bumped `DB_VERSION 1→2`
with a new `ccc` store that preserves the `books` store), read by a memoized `loadCCCText()` whose memo
is invalidated on import/remove so the supersede flips live. In the sheet it becomes Tier 1: the
imported ¶ text renders inline ahead of Trent, with a per-¶ vatican.va fallback for any paragraph the
import omits. A local-only `scripts/build-ccc-text.mjs` converter (EPUB/PDF → `ccc.local.json`,
gitignored, **counts-only** validation against `url.json`) turns an owned copy into the import file; the
owner runbook is `docs/superpowers/specs/2026-06-27-ccc-text-LOCAL-BUILD-RUNBOOK.md`.

**§4.3 Phase 1 — the Catena in order.** The Catena Aurea always shipped in Aquinas's source order. A
hand-curated death/floruit `year` (+ optional `circa`) now sits on every Father in `commentary.ts`,
with a `PSEUDO_YEARS` map dating the runtime pseudonymous labels (the Opus Imperfectum, the
Hiberno-Latin Mark *Expositio*, …) by their **composition era**, never the namesake. A pure
`sortChronological(blocks)` orders a verse's grouped blocks earliest-Father-first (stable alphabetical
tie-break, undated voices to the tail, never year 0), applied at render time **after** `groupCatena` so
an "It goes on" continuation is never torn from its Father. The Glossa and named sources fall after the
dated Fathers under a quiet divider; a gold `· c. 407` date sits inside the existing attribution label.
("Maximus" is confirmed as Maximus of Turin, d. c. 465 — the homily-format citations, against a
Magisterium check.) No data, manifest, golden, or service-worker change — a render-time sort only.

**§4.3 Phase 2 — the Haydock lane.** The patristic tab is renamed from "Catena Aurea" to the durable
**"Church Fathers"**; the specific source moves to a per-book credit line ("The Catena Aurea · the
Newman edition" on the Gospels). Haydock and the Church Fathers stay two tabs that **never interleave**
(now stated in the component contract), and the gold verse dot is stated and shown as **Haydock-only**;
the Settings copy that implied it also marked Catena verses is corrected. The `commentaryCatena`
settings key is kept verbatim (no migration).

**§3 — daily quotes that never repeat in a year.** The Quote of the Day moves from a fixed modular
cycle to a per-year seeded permutation over a **538-quote corpus**: each calendar year is assigned a
fresh order (sanctoral feast → liturgical season → seeded random fill of the remainder), so no quote
repeats within the year and the order differs year to year. It stays a pure function of (date, region,
corpus), so the home-screen widgets — which read the pre-resolved `calendar.json` built from the same
function — match bit-for-bit.

**Dark-mode widgets.** The iOS WidgetKit widgets read `@Environment(\.colorScheme)` and the Android App
Widgets gain `values-night/` resources, so both follow the system light/dark appearance like the app —
no signing or capability change.

The upstream source pins grow from four to five (the Trent pin); the manifest is resealed to record it.
The bundled texts, liturgical engines, and golden snapshots are untouched.

## Set right (v1.14.1)

*Bugs found in the v1.14.0 TestFlight build, plus the Xcode Cloud archive fix.*

- **The Mass reading is named the modern way.** The Today card and the Readings page cited each
  reading in the *selected Bible's* naming, so a Douay-Rheims reader saw the Thirteenth Sunday's
  first reading as "4 Kings 4:8-11,14-16" — authentic Douay, but jarring against the modern Roman
  lectionary everyone else prints. `formatLectionaryCitation()` (`src/lib/lectionary.ts`) now pins
  a reading's reference label to the **modern** book name ("2 Kings"), independent of the
  translation the body text renders in. This was applied to all three Mass-citation surfaces — the
  Today card, the Readings page, and the pre-resolved home-screen **widget** data
  (`scripts/build-calendar-widget.ts` → `calendar.json`, regenerated for iOS and Android, which had
  still emitted "3 Kings"/"1 Paralipomenon" and so contradicted the app). The Bible Reader and book
  picker stay translation-aware; only the lectionary citation is fixed.
- **A St. Charles Borromeo Catechism export now imports.** `parseCccText()`
  (`src/lib/import-formats.ts`) recognizes the scborromeo.org export shape — the full modern CCC
  carried in `page_nodes`, each paragraph opened by a `ref-ccc` marker — and converts it on-device
  to the same flat ¶ map the `fidelis-ccc-1` intake produces (all 2865 ¶, the 1258 cited ¶ fully
  covered). Footnote apparatus is stripped; block-quote and layout-split prose paragraphs are
  rejoined with a space; and unambiguous section headings (`heavy_header`-flagged, all-caps,
  roman-numeral, or TOC-listed titles) that sit before a numbered ¶ are dropped. The heading rule
  is deliberately **conservative** — the export splits a single ¶ across many short paragraphs and
  carries no reliable heading flag, so guessing at mixed-case titles would delete real prose (a
  split sentence, a maxim, a scripture quotation). We drop only what is certain and leave the rest,
  because losing text is worse than a cosmetic title left in place. The owner drops their `ccc.json`
  straight into Settings → Magisterium on iOS — no desktop converter. The modern CCC text is still
  **never bundled**: only the imported copy renders.
- **"Save image" actually saves.** The share card's Save button used a web `<a download>`, a silent
  no-op inside the iOS WKWebView — it reported success while nothing reached Photos. A tiny in-app
  Capacitor plugin (`ios/App/App/SaveImagePlugin.swift`, via `UIImageWriteToSavedPhotosAlbum`)
  now writes the card to the photo library, needing only the **add-only**
  `NSPhotoLibraryAddUsageDescription` permission (the app can save out, never read the library
  back). **The plugin has to be registered, not just compiled in:** Capacitor auto-registers only
  the plugins in `capacitor.config.json`'s `packageClassList` (npm plugin packages), so a loose
  class in the App target is never loaded — `registerPlugin("SaveImage")` then silently resolves
  to a no-op and iOS never even shows the add-only Photos prompt (the app never appears under
  Settings → Privacy → Photos). The fix is `MainViewController`, a `CAPBridgeViewController`
  subclass set as the storyboard root, which calls `bridge?.registerPluginInstance(SaveImagePlugin())`
  in `capacitorDidLoad()`. On Android, where the same download is also a no-op, Save routes through
  the system share sheet instead of claiming a false success. Web/desktop keep the download. Both
  Swift files are wired into the App target by `scripts/configure-ios-app-target.rb`.
- **Xcode Cloud can archive again.** The iOS project links the Capacitor plugins as *local* Swift
  packages under `node_modules/@capacitor/*`, and the web bundle (`dist` → `ios/App/App/public`) is
  generated, not committed — but Xcode Cloud clones the repo and never runs `npm`, so SPM
  resolution failed (`node_modules/@capacitor/app doesn't exist`). A `ci_post_clone.sh` hook now
  runs `npm ci` → `npm run build` → `npx cap copy ios` before resolution. **Location matters:**
  Xcode Cloud resolves the `ci_scripts/` folder *relative to the `.xcodeproj`*, which sits at
  `ios/App/`, not the repository root — a root-only copy is reported "Post-Clone script not found at
  ci_scripts/ci_post_clone.sh" even when committed. So the hook lives at
  `ios/App/ci_scripts/ci_post_clone.sh` (a repo-root copy is kept as a harmless fallback). It uses
  `cap copy`, not `cap sync`, so it never re-runs `cap update` and never rewrites the committed
  `Package.swift` platform (the `.v15`→`.v17` trap). A shared **App** scheme is now committed
  (`xcshareddata/xcschemes/App.xcscheme`) because the workflow had fallen back to archiving the
  `FidelisWidgetExtension` scheme; the Xcode Cloud workflow must be pointed at the **App** scheme.

No engine, bundled text, or golden snapshot changed.

## Kept watch (v1.14.2)

*The reliability pass from the 2026-07 beta code review: four parallel senior reviews (engines,
UI, native shells, data pipeline) over v1.14.1, then the traced fixes. The theme: the logic was
sound; the risks were operational — things that would fail silently later, or fail the user
quietly at the seams where two correct systems meet.*

- **The licensing gate can no longer be forgotten.** The §3.3 quote red list was an advisory
  print ("kept per owner directive for the closed beta; re-enable the hard fail before any public
  release") — and nothing would ever force the re-enable. `scripts/build-quotes.mjs` now **fails
  the build** when non-public-domain authors are present (32 quotes today: John Paul II, Benedict
  XVI, Escrivá), unless `ALLOW_RED_LIST=1` is set explicitly for a closed-beta build. The
  escape-hatch rebuild is byte-identical to the committed corpus.
- **The widget staleness cliff is a red harness now, not a 2028 surprise.** The pre-resolved
  `calendar.json` the home-screen widgets read covers a fixed window (today: through 2027-12-31);
  the day it ran out, every installed Mass/Quote widget would silently degrade to fallback text —
  and regeneration was a manual RELEASING.md step nothing enforced. The harness now fails unless
  the committed window covers **today + 180 days**, and asserts iOS/Android `calendar.json`
  byte-parity (as `votd.json` already had).
- **The sheet × scroll-authority seam is fixed.** Navigating while a sheet was open (the chapter
  grid, a MysterySheet link) restored the *departed* page's scroll offset onto the *destination*
  page: `Sheet`'s passive cleanup ran after `ScrollManager`'s layout positioning, onto a body
  still pinned. The lock effect is now a **layout** effect (cleanup in the mutation phase, before
  ScrollManager places the page), and the offset recorder ignores scroll events while the body is
  pinned (`isScrollLocked()`), so opening a sheet can't clobber a Back-restore offset with 0.
- **"Today" is live.** `useToday()` (`src/useToday.ts`; timer to next local midnight +
  `visibilitychange` on resume) drives the Today page, the Readings default date, and the
  liturgical accent — a resident iOS app no longer wears yesterday's verse, Mass, or color at
  breakfast. In `src/`, not `src/lib/` (which stays React-free).
- **One offline blip no longer bricks a surface until reload.** `loadLectionary()`/`loadQuotes()`
  memoized the fetch *promise*, so a first-fetch failure was cached and every retry re-rejected.
  Rejections now clear the memo; `loadManifest()`/`loadCCC()`/`loadTrent()` got the same reset for
  transport failures (a genuine 404 — a layer not built — stays memoized, as designed).
- **Errors stopped impersonating emptiness.** Offline search said "No verses found" — telling the
  faithful scripture doesn't contain their word — and now names the book it couldn't reach; the
  Quote card's failure shows a quiet notice instead of an eternal skeleton; the VOTD Share falls
  back to the bundled Douay-Rheims (cited as DRB) instead of silently doing nothing when the
  selected translation isn't importable. Search highlighting also pins to the *executed* query,
  so editing the box doesn't mis-mark the results on screen.
- **The Father matcher matches at word boundaries.** `matchFather` accepted any label that merely
  *began* with an alias — "Leontius" would have resolved to Leo the Great and been flagged a
  Doctor, corrupting the Doctors-only filter. Aliases now require a word boundary; the corpus
  guard immediately caught the one loose-prefix dependency ("Damascenus", now an explicit John
  Damascene alias); negative over-match assertions pin the rule.
- **Small guards:** a corrupt stored `calendarRegion` falls back to the documented USA default
  explicitly (matching the theme/font/Trent guards); the `Sheet` focus trap skips `disabled`
  controls (a disabled boundary let Tab escape mid-save) and knows `select`/`textarea`; the
  Reader toolbar's sticky `top` uses `--header-h` (it hid under the header on notched iPhones);
  `aria-label`s landed on the Reader/Search/Readings controls that had only `title` or
  placeholder.

No engine, bundled text, or golden snapshot changed; `public/data/` is byte-identical.

## The gathered fragments (v1.14.3)

*"Gather up the fragments that remain, lest they be lost." (John 6:12) — the Catena Aurea
de-duplication, the single largest payload cut in the app's history.*

The Catena comments by **pericope**: St. Thomas strung the Fathers' voices along spans of verses,
not single ones. The legacy build flattened that structure by copying each chain into every verse
it covered — faithful to the spec's per-verse shape, but ~5-10× the necessary bytes. The four
Gospel files totalled ~30 MB of the 57 MB shipped binary, and opening Matthew's commentary parsed
a ~10 MB JSON on the main thread.

Format 2 restores the source's own economy:

- `scripts/build-catena.mjs` emits `{ format: 2, blocks: [{ keys, entries }] }` — each pericope's
  chain stored **once**, with the list of grid verse keys it covers. The keys are computed at
  build time through the same per-verse remap as before (`remapGospelKey` + DRC grid check), so a
  chain can honestly cover keys across the Mark 8/9 chapter boundary, and the Matt 17:14-15 merge
  collapses to a single key. `parseCatenaOsis` now returns pericope blocks in document order.
- `expandCatenaSpans()` (`src/lib/commentary.ts` — pure, fixture-tested) re-broadcasts at load
  time inside `loadCommentary()`, producing the **identical** per-verse map the Reader and
  CommentarySheet always consumed — including the legacy builder's collision rule (an identical
  comment never lands twice on one verse). Verified before committing: the expansion of the new
  files reproduces the old committed corpus key-for-key and note-for-note across all 3,736 verse
  keys of all four Gospels.
- `loadCommentary()` detects the format, so legacy per-verse files (Haydock's shape, or a stale
  pre-format-2 file from a migrated service-worker data cache) pass through untouched — **no
  DATA_CACHE bump**, no offline user loses anything.
- The harness asserts the committed files ARE format 2 (a legacy regen can't ship), runs the §15
  grid/incipit checks and both §16 corpus sweeps over the expanded map, and pins the expansion
  semantics by fixture.

Sizes: matthew 9.9→2.1 MB, luke 8.9→1.5 MB, john 6.4→1.3 MB, mark 4.8→0.7 MB; the commentary
layer 40→10 MB; `public/data` 56→31 MB and the built `dist/` 57→32 MB — a ~25 MB cut to every
install, and a ~5× lighter parse on first commentary open. What the faithful read did not change
by one character.

## The watchmen (v1.14.4)

*"Upon thy walls, O Jerusalem, I have appointed watchmen." (Isaiah 62:6) — the CI-hardening
batch. No app code changed; every line is a gate.*

- **`android.yml`** — the Android shell gets what iOS has had since v1.13.1: a CI build. The
  unsigned debug APK compiles on every relevant PR (Node 22 web build → `cap sync android` —
  sync, not copy: it generates the uncommitted `capacitor-cordova-android-plugins/` subproject
  the committed Gradle wiring applies; the copy-not-sync rule guards an iOS-only trap — then
  `gradlew assembleDebug`, JDK 21 for AGP 8.13), so `VotdWidget.java` and friends can no longer
  rot invisibly.
- **`sources.yml` + `scripts/check-sources.mjs`** — the monthly watchman for the two external
  dependencies nothing else guards. The five pinned upstreams are probed via the GitHub commits
  API (authenticated with the workflow token — unauthenticated runners share a rate-limit pool
  and flake): if an upstream is deleted, made private, or force-push-GC'd, the committed outputs
  survive but `npm run data` reproducibility dies with it — the alarm fires while a mirror can
  still be taken. And every unique vatican.va page in `ccc/url.json` is swept (HEAD, GET
  fallback, a retry) so a Vatican site restructure can't 404 every CCC link silently.
- **The pipeline is linted.** `eslint.config.js` had deliberately scoped `scripts/` out; the
  review called the bluff — 4,000 lines that regenerate the sacred texts deserve the same gate
  as the app. A Node-globals tier now covers `scripts/**/*.{ts,mjs}` in `npm run lint` AND the
  `npm test` gate; the first sweep surfaced six latent issues (all fixed, zero suppressed).
- **CI economy:** `ci.yml` ran every job twice per feature-branch change (push + PR); pushes now
  gate `main` only and every workflow carries a cancel-superseded `concurrency` group.
  `public/**` joins the iOS/Android path filters — the corpus ships in the binaries, so a data
  change must prove the shells still build. Xcode Cloud's `ci_post_clone.sh` pins `node@22` to
  match CI.

## Our own tongues (v1.15.0)

*"We have heard them speak in our own tongues the wonderful works of God." (Acts 2:11) — the
first Spanish translation, and the pattern every future language will ride.*

The **Biblia Platense** — Mons. Juan Straubinger's translation from the original languages
against the Vulgate (La Plata, 1948–51), the classic Spanish Catholic Bible — joins as the
third **import-only** translation. The licensing posture is the NABRE's exactly: Straubinger
died in 1956, so the translation's U.S. copyright term (via URAA restoration) has not clearly
expired, whatever "public domain" labels circulate; the standing rule — copyrighted texts are
never bundled — holds, and the user imports a copy they may lawfully use. (The rights question
joins the NABRE conversation with the owner's licensing contacts; a blessing later converts
this into a clean bundle with no code change.)

What made this more than a metadata entry:

- **The corpus was verified against the app's own Vulgate grid, chapter by chapter.** The
  digital Platense is Vulgate-versified in 1,330 of its 1,334 chapters — full verse-count diff:
  zero shape mismatches; the seven Vulgate join/split psalms all correctly arranged (Ps 9
  carries Heb 10; "In exitu" at 113; "Lauda Jerusalem" at 147). A per-chapter verse-LENGTH
  correlation sweep (language-independent) flagged eight shift candidates; content adjudication
  confirmed four real ones — Exodus 8 (+4; Vulg 8:1-4 sits merged in 7:25 per the Hebrew
  chapter break), Numbers 13 (+1), Psalm 10 (+1, title merged), Mark 9 (−1, the AV break;
  Vulg 9:48+49 merged) — and cleared four false positives (repetitive psalm structure; the
  absent Vulgate interpolation in Ps 13:3, a known critical-text difference, disclosed not
  patched).
- **`normalizeImport()` moves those four chapters onto the Vulgate grid at import time** —
  coordinate moves only, never a character altered, each gated on the chapter's exact
  pre-remap signature (idempotent; inert on an already-normalized or differently-prepared
  file). Verified end-to-end with the real corpus: 73/73 canonical books stored, zero grid
  mismatches, the Transfiguration at Mark 9:1, "Yahvé es mi pastor" at the VOTD's Vulgate
  Ps 22:1.
- **The import path grew up generically**: roman-numeral ordinals ("I Samuel") and
  SWORD-family aliases resolve for every format; textless placeholder books are skipped —
  closing a real trap where the empty "I Esdras" placeholder, whose name is also the Douay
  name of Ezra, would have overwritten the real Ezra.
- **Spanish is a first-class language**: `langAttr()`/`languageLabel()` centralize what the
  `language === "la"` ternaries did, so VoiceOver reads the Platense as Spanish in the Reader,
  the parallel column, the readings, and the verse cards.

## The lamp trimmed (v1.15.1)

*"Then all those virgins arose and trimmed their lamps." (Matthew 25:7) — the front page's
lamp relit, and the shells finally telling the truth about which release they are.*

A beta-review screenshot showed the app's front page dark: the Verse of the Day card rendering
a bare "—". The cause was a convention applied everywhere but the one place the user sees
first — and alongside the fix, the release closes a version drift the v1.15.0 Xcode Cloud
artifact exposed.

- **`VerseQuote` falls back to the bundled Douay-Rheims.** The component behind the Today
  page's Verse of the Day card and the rosary sheet's passage read the *selected* reader
  translation directly — so with an import-only translation chosen (NABRE, RSV-2CE, Platense)
  and no copy imported on-device, the front page showed "—" where the day's verse belongs.
  v1.14.2 gave the VOTD **Share** path the DRB fallback, and the Reader has always had it; the
  card itself was the gap. It now falls back like they do, and the `lang` attribute follows the
  text actually shown — a DRB fallback under a selected Platense is voiced as English, not
  Spanish (the v1.15.0 `langAttr()` plumbing made that distinction expressible).
- **`loadCCCText()` retries after an IndexedDB read failure.** v1.14.2 gave every fetch memo
  the retry-after-rejection treatment (`loadLectionary`/`loadQuotes`/`loadManifest`/`loadCCC`/
  `loadTrent`) — but the imported-Catechism reader, which memoizes an IndexedDB read rather
  than a fetch, still cached a transient failure as `null` forever. A failed read now clears
  the memo and the next call retries, matching the rest of `src/lib/data.ts`.
- **The three uncovered v1.14.2 UI fixes gained harness source-shape guards.** The sheet ×
  scroll-authority fix, the recorder guard, and the Reader-toolbar `top` fix were all verified
  by hand and protected by nothing: `scripts/test-data.ts` now asserts `Sheet`'s scroll lock is
  a **layout** effect and its focus trap excludes `disabled` controls, that `ScrollManager`'s
  offset recorder keeps the `isScrollLocked()` guard, and that `.reader-toolbar`'s sticky `top`
  stays on `var(--header-h)`. A stale "ADVISORY" comment in the harness was corrected while
  there — the §3.3 quote red list has been a **hard build failure** since v1.14.2, and the
  comment shouldn't invite anyone to believe otherwise.
- **The native shells are versioned again.** v1.14.2→v1.15.0 bumped `package.json` three times
  without touching the committed shells, so Xcode Cloud Build 18 archived v1.15.0 code labelled
  **"1.14.1 (1)"**. iOS `MARKETING_VERSION` 1.14.1→1.15.1 across all four build configurations
  (`CURRENT_PROJECT_VERSION` stays 1 — the release script overrides the build number at archive
  time), Android `versionName` "1.14.1"→"1.15.1" and `versionCode` 11401→11501, and the
  `package-lock.json` version fields (stranded at 1.14.1) rejoin `package.json`.

No engine, bundled text, or golden snapshot changed.

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
tech reads one labelled control ("Choose date"). Below 480px the facade shows a short, yearless
date ("Jul 14" — the full date repeats in gold in the day card directly beneath) and the label
ellipsizes rather than ever overlapping its neighbors, so the single row holds even with the
Today chip and the widest translation label stacked on a 375-pixel phone.

**The record.** Harness §11's identity-release acceptance checks were rewritten from the
bottom bar to the masthead, and §26–§28 pin the new shape in the v1.15.1 source-shape manner.
No engine, data, or golden changes — a golden diff during this work would have signalled a
mistake. Service-worker shell cache v5→v6; iOS `MARKETING_VERSION`/Android `versionName` to
1.16.0, `versionCode` 11600. Design spec:
`docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md`.

## A faithful witness (v1.16.1)

*"A faithful witness will not lie: but a deceitful witness uttereth a lie." (Proverbs 14:5)*
**The documentation reconciled with the shipped product, and the native workflows taught to
watch their own tooling.**

The 2026-07-15 full product audit
(`docs/review/Fidelis_Full_Product_Audit_2026-07-15.md`) — independently verified claim by
claim before acting on it — found the core sound and no P0 anywhere, but flagged a release
layer that had drifted behind the app it describes. This release closes every release-safety
finding that can be closed without a Mac: FID-DOC-001, FID-REL-002, FID-REL-003, and the
documentation half of FID-NATIVE-001. No app code, engine, data, or golden changes.

**The README told the story of an older app (FID-DOC-001).** Four claims, each once true,
had quietly become false: that the Mass and Quote home-screen widgets were Android-only with
iOS "spec'd to follow" (the iOS WidgetKit trio shipped in v1.13.1/v1.13.2 — and the README
even contradicted itself, listing all three under Platforms); that creating the Widget
Extension target "can't be scripted" (v1.13.2's `scripts/add-ios-widget-target.rb` creates it
idempotently); that the App Intent and Dynamic Type "remain specified for that Xcode session"
(both shipped in v1.13.3); and that phone navigation is a thumb-friendly bottom bar (v1.16.0
moved it to the collapsing masthead). All four now state what ships. The iOS guide's
notched-simulator verification — "confirm the tab bar lifts above the home indicator" — now
verifies the masthead instead, and its §5 App Intent/Dynamic Type paragraphs describe the
shipped Swift and bridge in the present tense rather than instructing the reader to build
what already exists.

**The half-truth in the widget comments (FID-NATIVE-001, the documentation half).**
`build-calendar-widget.ts` claimed the generated data means the widget "never disagrees" with
the app — true only at the default setting, since `calendar.json` is generated for the USCCB
region and a user who switches the app to the Universal calendar keeps USCCB widgets and
Siri answers. The comments in the builder and `TodaysGospelIntent.swift` now state the real
policy, and the iOS guide gains an explicit **Region policy** note. The product decision —
region-configurable widgets — is deliberately deferred; what shipped today is that the
limitation is no longer undocumented.

**The workflows that could not see their own tools (FID-REL-002).** The audit's proof case:
its audited head changed `scripts/ios-testflight.sh`, and no native workflow ran, because the
iOS/Android path filters watched `ios/**`, `src/**`, `public/**` — but not the `scripts/`
tooling that wires the Xcode project (`add-ios-widget-target.rb`,
`configure-ios-app-target.rb`), builds the widget data both shells bundle
(`build-votd-widget.mjs`, `build-calendar-widget.ts`), or archives the release
(`ios-testflight.sh`). Those five paths now trigger the iOS workflow and the two widget
builders the Android one. And the iOS simulator build switches Debug → **Release**: CI was
proving a configuration TestFlight never ships, so an optimization-profile breakage would
have surfaced first at archive time on a release Mac — now it surfaces in CI.

**The divergent duplicate hook (FID-REL-003).** Xcode Cloud's fallback
`ci_scripts/ci_post_clone.sh` at the repo root installed an unpinned Homebrew `node` while
the canonical hook beside the `.xcodeproj` pinned `node@22` — the exact drift the pin exists
to prevent, one directory up. The root hook now pins identically, and the release guide's §4
gives the exact `git checkout -- ios/App/CapApp-SPM/Package.swift` revert that
`ios-testflight.sh` runs after its sync, instead of the bare instruction "revert."

**The record.** Shells version with the web app (the v1.15.1 lesson): iOS
`MARKETING_VERSION`/Android `versionName` to 1.16.1, `versionCode` 11601. No service-worker
cache bump — no shell asset changed. Still open from the audit's release-safety list, and
mac-bound: the stale App Store screenshots (FID-REL-001) gate any 1.16.x store submission,
and the §10 device-acceptance checklist awaits real hardware.

## A just weight (v1.16.2)

*"A deceitful balance is an abomination before the Lord: and a just weight is his will."
(Proverbs 11:1)*
**The correctness batch — five surfaces that disagreed with each other, or with the truth,
now agree.**

The second release cut from the verified 2026-07-15 audit (the first, v1.16.1, reconciled the
release layer). These are the audit's core-correctness findings — the ones a reader can hit on
an ordinary day. No engine, data, or golden change; no service-worker cache bump (the shell is
network-first — hashed JS reaches installed PWAs on the next online visit, the v1.15.1
precedent).

**Search told a falsehood under load (FID-FUNC-001).** The scan stopped the moment 300 matches
accumulated — in canonical order, so the Old Testament always ate the cap first — and the
section chips then counted only that truncated array. A DRB search for *mercy* claimed
**New Testament: 0** while Matthew 5:7 sat unscanned. Now the sweep always covers all 78 books
and the counts are exact tallies over every match; only the *rendered* list is bounded — and
bounded **per section**, so the New Testament list keeps filling after the overall cap is full
(that per-section fill is precisely what makes the fix real, and harness §29 pins it with the
collector's load-bearing case). The same honesty extends to the frame around the numbers: the
count line gives the exact total and admits truncation ("Showing the first 300 in this
section."), "No verses in this section." appears only when the true count is zero, and a failed
sweep no longer renders chips at all — a partial tally presented as exact would be the same lie
in a new place. The collector lives as pure functions in `src/lib/search.ts`
(`groupsOf`, `emptyGroupedHits`, `addHit`, `snapshotGroupedHits` — counts never capped, lists
capped, snapshots for React streaming), built on the existing `inFilter` so the partition can
never drift from the chips. Measured on the real corpus: *mercy* → All 434 · OT 377 · NT 57 ·
Gospels 22, first NT hit Matthew 5:7 — "Blessed are the merciful."

**The Reader adopted translations it could not read (FID-FUNC-002).** Persistence was gated on
the route naming a real book, not on the text arriving — so selecting unimported NABRE showed
the honest error page while quietly writing `translation: "nabre"` into settings and lastRead,
poisoning Today, Search, the book list, and the continue-reading pointer. The one effect split
in two: the navigation resets (close the selection, close every sheet) still fire on every
route change, but `saveLastRead` + the default-translation write now run only when the loaded
data's **own identity** matches the route (`data.translation`/`data.book` — fields both the
bundled corpus and the IndexedDB import path carry). That identity guard is what makes the
timing airtight: a naive data-keyed effect would persist book B's route in the commit where
book A's text is still in hand. Verified in the browser: the failed NABRE selection leaves
storage untouched; the successful DRC read persists normally.

**Bookmarks, quotes, and citations follow the text, not the ask (FID-FUNC-003, FID-FUNC-004).**
A CPDV bookmark opened under whatever the current default happened to be; now `refLink` carries
the bookmark's own saved translation (with a quiet ` · CPDV` tag when it differs), while
highlights and notes stay passage-level by design. And the Verse of the Day card could show
Douay-Rheims fallback text under a citation and link that both claimed NABRE — the link landing
on the Reader's error page. `VerseQuote` now reports what it actually rendered
(`onShownTranslation`, fired on both resolution paths, received as a bare state setter so it
stays out of the load effect's dependencies), and the Today card, the rosary mystery sheet, and
the embeddable VOTD widget all follow the shown translation in their cite and link — the
convention the Share path had already established alone.

**A past finish date built a fifty-chapter day (FID-FUNC-007).** `targetDateToPerDay` clamps a
negative duration to one day, so "finish by 2020" silently created a plan demanding the whole
selection at once. The date input now floors at tomorrow (computed per render — a constant
would go stale at midnight), and submit validation keeps the form with a quiet inline
`role="alert"` error for a past, today, or — tightened from the old silent per-day fallback —
empty date. The engine helper is untouched; `liturgical.ts`'s `isoKey` stays unexported (an
engine file has no business in this diff), the two-line local-date helper living in the page.

**The record.** Harness §29 (real collector logic) + §30 (source-shape pins for all five
fixes); every fix also verified end-to-end in a real browser against the built app (eleven
checks: chips, counts, truncation, storage integrity, fallback citation/link, date floor,
inline error). Shells to 1.16.2/11602. Still open from the audit, next in line: the Reader
action-bar redesign (FID-UX-001, the last P1), the Today/Mass honest-failure states, and the
import-atomicity batch.

## Nothing hidden (v1.17.0)

*"For there is not any thing secret that shall not be made manifest, nor hidden that shall not
be known and come abroad." (Luke 8:17)*
**The behavioral half of the sacred-page pass: nothing hides the verse, no failure hides
behind a complete card, nothing is hidden from the accessibility tree.**

The third release cut from the verified 2026-07-15 audit, and the one that closes its last
open P1. Scoped by owner decision: behavior first — the docked action bar, the honest Mass
card, and the semantic accessibility batch ship here; the visual calibration (day-theme
contrast, 44px touch targets) waits for v1.17.1 as its own reviewable diff.

**The bar that covered the Word (FID-UX-001).** The verse-action bar was a floating pill —
`position: fixed; left: 50%` — and that placement was the whole defect: a fixed box offset to
50% gets only the remaining half of the viewport to lay out in, so on a 390px phone the pill
wrapped its labeled actions and swatches into a ~190×330px tower that sat on the very verse
the reader had just chosen, and on top of the chapter links besides. The audit measured it
covering 116 px of the selected verse; the fix removes the bug class rather than the symptom.
On phones the bar now docks — full width, bottom edge, safe-area aware — as a deliberate
four-column grid: the reference and Close on the first row, the highlight swatches centered
on their own row, Bookmark · Note · Copy · Share as icon-over-label cells that hold at 320,
390, and 430 px, the two long study actions (Commentary, Catechism) half-width each on their
own row, and the note editor across the full bar. Two mechanisms keep Scripture visible. The
page **reserves the bar's live height**: a ResizeObserver measures the bar — whose height
genuinely varies with the note editor and the per-verse study actions — into
`--verse-actions-h`, consumed as phone-only bottom padding and released to zero on close, so
the end-of-chapter links can always scroll clear. And selection **scrolls the verse clear by
its overlap only**, bounded so the verse's first line never passes under the pinned toolbar,
honoring reduced motion, and safe beside the scroll authority (selection is not navigation;
a user-divergence is ScrollManager's own documented abort signal). Desktop keeps the centered
pill byte-for-byte; its verses simply gained the same protection, since the pill could cover
text there too. The toggles also learned to speak: Bookmark keeps a constant label with
`aria-pressed` and a gold pressed ring (a bookmark is an honor mark), Note discloses with
`aria-expanded`, the bar names itself "Verse actions," and Close returns focus to the verse.

**The card that looked complete while missing Mass (FID-FUNC-006).** Blocking the lectionary
made Today's first card render without its readings — no error, no gap, just a card that
looked finished. And the fix had a trap the design pass caught: `readingsForDate` *resolves*
null for a date outside the bundled window and only *rejects* on transport failure, so a
catch-only failed state would leave the skeleton shimmering forever on the stale-data path.
The Mass list now has the quote card's honest three states — a skeleton that reserves the
list's approximate height (the layout no longer jumps when readings land), and a quiet notice
with a real **Try again** (the lectionary loader never memoizes a rejection, so the retry is a
real fetch) — with both settle arms feeding the failed state. Five cards, still.

**The tree that couldn't be heard (FID-A11Y-001/002/003).** Three quiet semantic gaps, closed
in the repo's own idiom: the liturgical color chip — an empty span whose meaning lived in a
hover-only title — is now decorative beside a visually-hidden "Liturgical color: …" (the new
`.sr-only` utility; "white" speaks *white* while painting gold, because the borrowing is
theme and the name is liturgy); Library's Bookmarks · Highlights · Notes became an honest
`aria-pressed` segmented group named "Library view" (a real nested flex wrapper — not
`display: contents`, which browsers have historically punished by dropping the very role the
fix adds), with Export/Import outside it; and the async boundaries now announce themselves
with restraint — `role="status"` on transition text only (Reader loading/error, Mass-page
loading/unavailable, both Today failure notices, Library's transfer result), never on content
containers, and no `aria-busy` anywhere. `VerseQuote`'s bare em dash — which could be an
entire card's content on the app's front page — now speaks: a failure names the connection,
an empty slot names the versification gap.

**The record.** Harness §31 pins all of it in source shape (there is no new pure logic — the
release is UI wiring by nature); §26's forbidden-string guards (`3.25rem`, `3.75rem`,
`z-index: 45`) stayed green throughout, which is exactly what they were built for. Verified
end-to-end in a real browser: thirty-one checks across 320/390/430/1280 viewports — docking,
non-intersection, exact reservation tracking through note-editor growth, pressed/disclosure
semantics, the mass failure-and-retry round trip, spoken color on both pages, group
semantics, the embed's failure copy, and a one-step reduced-motion clear. The 320px sweep
caught one real defect pre-ship ("Commentary" overflowing its quarter-width cell — hence the
half-width study row). Shells to 1.17.0/11700; no sw cache bump (network-first shell — the
bar restyles an existing element; v1.16.0's bump was for a shell-architecture change). Next:
the v1.17.1 calibration pass (contrast through the token seams, priority touch targets), then
the storage/import-resilience batch.

## Touch and see (v1.17.1)

*"See my hands and feet, that it is I myself; handle, and see." (Luke 24:39)*
**The calibration half of the sacred-page pass: everything the eye must read clears AA on
every surface, and everything the thumb must touch measures 44px.**

The fourth release cut from the verified 2026-07-15 audit — the visual-calibration batch
(FID-A11Y-004, FID-UX-002) that v1.17.0 deferred by owner decision so behavior and
calibration would each get a reviewable diff. CSS tokens and hit geometry only: no engine,
data, golden, or service-worker changes.

**Contrast through the seams, not around them (FID-A11Y-004).** The v1.10.0 gold-contrast
split had already drawn the load-bearing distinction — `--gold` is the luminous mark (the ✠,
the quote marks, the rule beside a selected verse; exact brand hex, deliberately outside the
text-contrast contract) and `--gold-text` is gold as running text — but the text side was
calibrated against `--bg-1` only, and the audit caught it failing everywhere else: 4.38:1 on
the page background under the footer motto, 4.04:1 on the raised `--bg-2` insets. The same
blind spot ran through the liturgical accent table (the Ordinary-Time green that carries
link text most of the year sat at 4.12:1 on bg-2, rose at 4.09:1) and, in night mode, through
the brand purple itself (4.03:1 on the bg-2 hover rows and active pills), night red (3.56:1),
and night black (4.21:1). The recalibration moved only tokens, and only as far as needed with
real margin: day deepens (`--gold-text` #8A6D1F → #7C621C, `--text-muted` #6E6A61 → #6B675E,
green #3E7C4F → #377046, rose #B14F73 → #A34767, white borrowing the new gold-text as
always), night lifts (brand purple #9B7BD4 → #A98EDC with the violet accent riding along —
the "= brand purple" convention holds — red #D45A6A → #E07A89, black #8E8E96 → #97979F).
Every changed value clears 4.5:1 on all three surfaces of its theme with its worst pair at
≥4.64:1; `--gold` marks, `--purple-strong`, and the two-accent grammar never moved. And
because the audit's deeper lesson was "calibrated once, against one surface," the harness now
owns the property itself: §32 parses the actual token values out of `styles.css` and runs the
WCAG relative-luminance math over every text-on-surface pair — both themes, all three
surfaces, all six accent overrides, the filled-button and badge pairs — so the next token
that drifts below AA is a red `npm test` before it is a Lighthouse finding. The §1.3 hex pins
in the liturgical harness moved with the table they assert.

**A link must look like a link (FID-A11Y-004, the 1.4.1 half).** The Mass page's repeated
"import your licensed NABRE" line put an accent-colored link inside muted prose at 1.07:1
against its surroundings — indistinguishable except by color that some readers cannot
distinguish. Links inside prose (`p a, li a, .notice a`) now underline by default; chrome
links — nav rows, chips, book-grid tiles, toolbars, cards — live in divs and keep the quiet
default, and the filled CTA declares its own `text-decoration: none` so it can never inherit
an underline if a call site drops it into a paragraph.

**Forty-four pixels, no new chrome (FID-UX-002).** The audit measured nine control families
under 44px, several far under — the Today card's Share line and Library's destructive
Remove/Delete at 18px. The fix follows the bar set by the verse-action swatches in v1.10.0:
the visible control stays exactly as drawn, and an invisible pseudo-element carries the tap
slop — `.chip::after` at ±0.6rem (Search's section filters and the Mass Today chip),
SectionNav chips at ±0.5rem sized to stay inside the rail's own padding (so the overflow-x
rail gains no vertical scrollbar), book chips in the grid and the Reader's picker at ±0.4rem,
Settings pills at ±0.3rem, the Settings switch on `::before` because `::after` is the knob,
the Share line asymmetric (its slop exactly fills its own top margin and the card's bottom
padding, so it never covers the verse text above), Library's Remove/Delete at ±0.9rem held
inside their side margins so adjacent destructive targets never overlap, and the Commentary
tabs at ±0.4rem. Two placements are honest exceptions: the rosary mystery rows grow by real
symmetric padding — stacked same-kind rows cannot borrow slop from each other without
ambiguity — with the list margins tightened so the Today card grows modestly; and the chip
rows' wrap-gaps widen to exactly the sum of two slops, load-bearing spacing (guarded in §32)
that keeps adjacent rows' targets meeting edge-to-edge instead of overlapping.

**The browser is the referee.** TDD end to end: §32 written first and watched fail on the
exact eight token pairs the audit predicted plus every shape guard, then the fix, then green.
Verified in real Chrome (Playwright against `vite preview`, 390×844, both themes): twenty-five
checks measuring rendered computed colors token-by-token, WCAG ratios recomputed from actual
pixels (the motto on the page background, the green link on a card, night purple on a bg-2
probe, muted text on the bg-2 copyright badge), underline presence on the Mass import and
USCCB links, and *effective* hit boxes — element rect plus pseudo slop — for every family.
The browser earned its keep twice: the audit's measured heights ran ~2px larger than live
geometry (its 28px chip renders at 26), so five slops sized to the table landed at 42–43.6px
and were widened to what Chrome actually measures; and the first Mass-page run raced the
async readings load, a test bug the second run fixed. Shells to 1.17.1/11701; no sw cache
bump. Next: the storage/import-resilience batch.

## The memory of the just (v1.18.0)

*"The memory of the just is with praises: and the name of the wicked shall rot." (Proverbs 10:7)*
**Two catechetical layers — the Saint of the Day and Today in Church History — sourced from the
public domain, never paraphrased, keyed by the calendar.**

The first release since the identity layer to add a genuinely new surface rather than close an
audit finding — an owner request, designed to fit the app's grain rather than stretch it. The
governing constraints were the app's own: nothing paraphrased by a machine (design spec §13), so
the text is drawn from public-domain works (Butler's *Lives of the Saints*, the 1913 Catholic
Encyclopedia) and every entry carries its footnote sources; nothing keyed to an identity the
engine doesn't have, so the corpora key by the sanctoral "MM-DD" the way the quote cycle already
does; and the Today page's discipline, which this release deliberately — and for the only time —
loosens by one card.

**The Saint of the Day.** The memorial name was already on the Today card ("St. Kateri
Tekakwitha, Virgin"), inert. Now, when that day's saint has a life in the collection, the name
becomes a quiet purple-affordance link — purple acts — to a full Saint page: title, rank, dates,
the life in a few faithful paragraphs, what the saint is known for, patronage, the canonization,
a public-domain prayer where one belongs, and a footnoted Sources block that says plainly when an
entry is still a draft. The page reconciles to the day the engine actually resolved by matching
the celebration name token-for-token (`saintForCelebration`, the `quotes.celebratesAuthor`
pattern), so a regional or transferred feast never shows one name on the card and another on the
page — the correctness the engine's id-less `Celebration` could not otherwise guarantee. The same
chip lives on the Mass page, keyed to whatever date is being browsed.

**Today in Church History.** This one earned a card — the sixth, set under the Mass card and
before the Verse of the Day, exactly where the owner pictured it. It wears the four honest states
v1.17.0 established: a skeleton that reserves its height, the lead event (year · title · a blurb
trailing into an ellipsis) when the day has one, a calm "No entry is recorded for today yet." when
the growing corpus does not — a resolved absence, not a failure — and a quiet offline notice.
"Read more" opens the History page, every event for the date oldest-first, each with its fuller
telling, its sources, and its share. A date may hold several years' events; the build groups and
sorts them.

**The pipeline, and the provenance gate.** Both corpora follow the quote layer's shape exactly:
hand-edited `scripts/*.corpus.json` → a build script that validates every field, groups by date,
and re-seals the manifest → lazy, memoized, retry-after-rejection loaders. The one addition is a
gate this content demanded: **an entry that cites no public-domain source fails the build** — the
§3.3 red-list's analog, enforcing at the pipeline what §13 asks of the text. `verified` counts
drafts against checked entries, so the debt stays visible; the seed ships entirely `verified:
false`, honestly flagged as drawn-but-unchecked against the named editions, to be verified (or
replaced with faithful public-domain prose) as the corpus grows — the same draft→verified
lifecycle the 47-quote corpus walked before v1.8.3 closed it.

**The one loosened rule.** Standing rule 2 held the Today page at five cards through seventeen
minor releases; the audit even made it executable (`test-data.ts` counts the cards). Raising it to
six was therefore not a thing to do quietly. It is changed in the open and in one place-of-record
after another — the harness guard, `CLAUDE.md`, `Home.tsx`, and the feature design spec all now
say six, each noting the deliberate raise and its reason. The discipline behind the rule — earn a
line, or a tab, before a card — is restated, not retired; this is the single exception, and the
guard will hold the line at six.

**The record.** Harness §33 tests the pure helpers (`dayKey`, `saintForCelebration`) as real
logic and re-checks the sealed corpora (every entry stands on a public-domain source), plus
source-shape guards for the six-card change, the card's four states, the chip, the loaders, and
the routes. Verified end-to-end in a real browser at a pinned date: the six-card layout with
History second, the card's states, the memorial chip linking to St. Kateri, both detail pages,
the two-event ordering, share, and the graceful empty state on an unseeded date. Shells to
1.18.0/11800; new `saints`/`history` bundle rows in the manifest; no engine, lectionary, golden,
or service-worker change. The seed is small on purpose — the machinery is the deliverable; the
memory grows.
## Both are preserved (v1.18.0)

*"But new wine they put into new bottles: and both are preserved." (Matthew 9:17)*
**The storage batch: the import becomes atomic — the old text untouched until the new is
whole — every silent save failure gets one honest voice, and "Saved" becomes a claim the
cache must back.**

The fifth release cut from the verified 2026-07-15 audit: FID-DATA-001, FID-FUNC-009,
FID-STOR-001, FID-FUNC-008 — the batch about what the app *keeps*. A Bible someone imported
under their own license, notes in the margins of a year's reading, a corpus saved for a
connectionless retreat: all of it lived behind code that could fail silently and lie
politely. No engine, data, golden, or service-worker changes.

**The atomic import (FID-DATA-001).** The old importer was four hazards in a trench coat: it
read any file whole into memory (`file.text()` unbounded), parsed it on the main thread (a
frozen UI for the duration), wrote books one-at-a-time over the live corpus, and had no
rollback — a quota failure at book N left books 1…N−1 of the new edition sitting beside the
old books the new file didn't contain. The rebuild follows the audit's direction exactly,
and the shape of the fix is the shape of the verse: new wine into a new vessel, and both are
preserved until the swap. An oversized file is refused **before it is read** — the
documented 64 MB bound runs against `file.size`, so the accidental video fails in
milliseconds, not after a tab-killing read. Parse + Vulgate-grid normalization run **in a
Worker** (the parsers were already pure string work — the OSIS path is regex, no DOMParser —
so nothing changed but the thread). The **whole normalized corpus is validated first**:
structure named per book, textless placeholders skipped (the v1.15.0 alias-clobber guard,
now pre-write), empty corpora refused. The books are **staged under a fresh generation** —
keys `translation@gen/book` — while the previous corpus keeps serving reads; the
**active-version marker** (a new `meta` store, DB v3) **flips only after every write has
succeeded**, one tiny write that IS the swap; only then are the superseded generation's keys
swept. Generation 0 is defined as the legacy bare key shape, so every pre-v1.18 install is
already "at gen 0" — existing imports read on through the same code path with no migration
ever running. And the whole decision surface — bound, validation, staging keys, flip, sweep
— is a pure module (`src/lib/importPlan.ts`) behind an `ImportStore` adapter, which is what
makes the audit's acceptance criteria REAL LOGIC in harness §33: a fake store injects a
quota failure at write two and the prior corpus provably survives byte-for-byte, marker
unflipped; the next import plans the crash's orphans into its own sweep. Quota errors name
the cause and the recovery in words ("This device's browser storage is full… free up
space… the previous text (if any) is untouched").

**No hybrid editions (FID-FUNC-009).** Because the sweep removes *every* key outside the
new generation, a replacement corpus smaller than its predecessor cannot retain the
predecessor's absent books — the exact hybrid the audit manufactured. The Translations card
also gains **Replace imported text** beside Remove: replacement rides the same atomic swap,
so the old text stays readable until the new corpus has fully landed (the old flow —
remove, then import — left a window with no text at all).

**One honest voice for a full disk (FID-STOR-001).** Every localStorage write in the app
went through a `catch {}` that discarded the failure — settings, plans, notes, bookmarks,
reading state, all able to vanish while looking saved. `write()` now reports success, and
the first refused write raises **one quiet, deduplicated session warning** — a `.notice`
with `role="status"` at the top of the page column on every route — that names the risk
plainly and offers **Export your library** as the recovery. Dismiss keeps it quiet for the
session; successes never toast; the dedup is driven through a throwing `localStorage` in
§33 and the full raise/dedup/dismiss lifecycle in the browser.

**"Saved" must be true (FID-FUNC-008).** Settings claimed `Saved · Update` from a
localStorage record even after the entire `fidelis-data-v2` cache had been evicted — the
audit's repro deleted the cache and the promise stood. The rows now **probe Cache Storage
against the manifest's file list** (`verifyOfflineBundle`; the page-side `DATA_CACHE`
constant is pinned against `sw.js`'s by §33, since a plain public file can't be imported
from). The claim grammar: **Saved** requires a complete cache; **Repair (n missing)**
requires the user's download intent AND a partly evicted cache — and repair re-fetches
exactly the gap, because the service worker's cache-first handler skips what it already
holds; incidental caching from ordinary reading (the Settings preview alone caches Genesis)
never earns a claim. The record is demoted to what the audit asked: presentation metadata,
the fallback only where Cache Storage can't be asked.

**The browser is still the referee.** TDD throughout: §33 written first (29 red checks —
the pure module stubbed to fail honestly, not error), then green module-by-module. 35 e2e
checks in real Chrome against `vite preview`: import → replace-smaller → injected
mid-import quota failure (an `IDBObjectStore.put` monkeypatch) → recovery sweep; the 64 MB
refusal via an actual 64 MB file on disk; a hand-seeded pre-v1.18 legacy corpus reading
without migration and replacing cleanly; download → evict one file → **Repair (1 missing)**
→ repair → **Saved** → evict the whole cache → never-Saved-again while the record still
claims it; and the storage banner's raise/dedup/dismiss/stay-quiet lifecycle. The e2e run
corrected the design once: the first "Repair" rule flagged bundles the user never
downloaded (ordinary reading had incidentally cached a file), which is how the
intent-plus-truth grammar above earned its shape. Shells to 1.18.0/11800; no sw cache bump.
Next: the performance batch (FID-PERF-001/002) or the native-region decision
(FID-NATIVE-001), owner's call.

## Prove all things (v1.18.1)

*"But prove all things; hold fast that which is good." (1 Thessalonians 5:21)*
**The proving batch: a browser suite for what only a browser can prove, the secondary
routes out of the boot path, and Lighthouse re-run with the numbers reported straight.**

The sixth release cut from the verified 2026-07-15 audit — FID-QUAL-001 (the audit's one
QUALITY finding), FID-PERF-002, FID-PERF-003, and FID-PERF-001 measured, part-addressed,
and honestly bounded. No engine, data, golden, or service-worker changes.

**The committed suite (FID-QUAL-001).** The audit's phrase was exact: "UI reliability is
guarded by source text, not browser behavior" — the pure harnesses are excellent and the
gap was never inside them; it was the layer only a real browser can prove. The releases
since v1.16.2 had each verified in a browser through ad-hoc scratchpad scripts that died
with their sessions; v1.18.1 commits that discipline as `e2e/` — thirteen Playwright tests,
`npm run e2e`, riding CI as a second job on every PR (channel `chrome` uses the runner's
preinstalled browser; no Playwright download; the suite drives the BUILT app through `vite
preview`, service worker included). The coverage is the audit's own list, each item the
regression class of a past fix: Today's honest failure state (the lectionary blocked at the
network — with service workers blocked in that context, since a SW's fetches bypass route
interception — then a real Try again recovering); Reader selection with the docked bar
provably NOT covering the selected verse (boxes compared, the FID-UX-001 class); the
Commentary sheet opening, passing axe OPEN (the audit's "axe on an open sheet", waiting out
the 110ms entrance animation whose in-flight opacity otherwise reads as a phantom contrast
failure), closing on Escape, and browser-Back navigating AWAY with the scroll lock released
(the v1.14.2 class); Search's section counts EXACT against the sealed DRB corpus — All 434
· OT 377 · NT 57 · Gospels 22 (the FID-FUNC-001 class, where NT read 0); a bookmark opening
in its SAVED translation against a moved default (FID-FUNC-003); the injected mid-import
IndexedDB failure leaving the prior corpus untouched (FID-DATA-001's browser half); offline
"Saved" as cache truth through download → evict-one → Repair (1 missing) → repair → evict-all
→ never-Saved (FID-FUNC-008); and axe WCAG A/AA at zero violations on Today, Reader, Mass,
and Settings — the v1.17.1 contrast work holding under an independent checker. The `e2e/`
tier joined the linter (`eslint src scripts e2e`), and §34 pins the suite's existence,
runnability, and CI ride so it cannot quietly rot.

**Out of the boot path (FID-PERF-002).** Every route shipped in the initial JavaScript
graph — Today paid for the Settings screen, the import parsers' UI, plans, and About before
first paint. Now the six secondary surfaces (Settings, Library, Translations, Plans, the
plan creator, About) are route-level `React.lazy` chunks behind one quiet Suspense fallback,
and the worship-critical path — Today, the Reader, Search, Mass, the book list — stays
eager. No chunking framework, exactly as the audit directed. Main chunk 426 → 393 kB (gzip
135 → 127); the chunks range from Plans' 1.2 kB to Settings' 18.6 kB.

**Fewer round trips cold (FID-PERF-003).** The full-corpus search awaited its 78 books one
round trip at a time. A six-book prefetch window now rides ahead of the scan: the FETCHES
overlap, but PROCESSING stays strictly in canon order, so everything §29/§30 pin — exact
counts, ordered lists, no early break, the error that names the unreachable book — is
untouched; prefetch rejections are pre-handled and surface only when their book is reached
in order.

**The numbers, straight (FID-PERF-001).** Lighthouse 13.4, mobile emulation, against the
built app; medians where runs were noisy. The real win came from geometry the audit's
direction asked for: each Mass reading now reserves space scaled from its OWN citation (the
verse spans are known before the text is — ~1.5 rendered lines per verse, whole-chapter
spans capped), the page reserves a day's readings while the lectionary resolves, and the
new lazy routes hold a screenful under their fallback so a cold visit's footer doesn't
leap. Mass CLS 0.304 (audited) / 0.34 (re-measured pre-fix) → **0.042**; Settings **0.025**;
the Search shell **0.000**; Today 0.241 → 0.10–0.16 across runs (async card arrivals + the
font swap keep it just over the line); Reader steady at 0.107 (untouched this release).
LCP: Search shell 2.7s, Settings 2.9s, Today 3.6s, Reader 3.8s, Mass 4.1s — none under the
2.5s target on simulated slow-4G, and the residuals are named rather than half-fixed: the
EB Garamond swap (a metric-compatible fallback via `size-adjust`, or preloading the two
latin faces) and the 393 kB main chunk are the next real levers. The mid-sweep Search
measurement (64/8.1s/0.166 with `?q=mercy` auto-running 73 book fetches inside the trace)
is reported for honesty but describes the sweep, not the page. Shells to 1.18.1/11801; no
sw cache bump. Remaining from the audit: the FID-PERF-001 LCP tail, FID-NATIVE-001 (the
region decision), FID-REL-001 (store screenshots), and the P3 notes.

## The mended net (v1.18.2)

*"And when they had done this, they enclosed a very great multitude of fishes, and their net
broke." (Luke 5:6) — mended, it held.*
**A repair release: three v1.18 feature branches, built in parallel, collided on merge and left
main red. No new behavior — the seams reconciled, every feature intact.**

The v1.18 line was written by two hands at once — this session building "the memory of the just"
(Saint of the Day + Today in Church History) while the desktop shipped "both are preserved" (the
atomic Bible import) and "prove all things" (route-splitting and the committed browser suite).
Each branch was cut from a different main and each passed CI in isolation; merged in sequence,
GitHub's 3-way merge stitched their edits into duplicates at three seams, and main went red — a
lint parse error and two type errors, all merge artifacts, no defect in any branch's own work.

The three repairs were mechanical de-duplication, each keeping both features. `App.tsx` had both
the static `import Library` and the lazy `const Library = lazy(...)`; the fix drops the static
imports and **folds the memory-of-the-just detail pages into the perf branch's route-split** — the
Saint and Church History pages are secondary surfaces reached from the Today card, their routes
already under `<Suspense>`, so they became their own lazy chunks, which is where they belonged.
`data.ts` had the `CccTextDoc` import twice (the atomic-import branch had widened it); one line
removed. `test-data.ts` had lost the closing brace of the memory §33 block and collided its
number with the atomic-import §33; the brace was restored and the memory section renumbered §35,
leaving the atomic-import (§33) and perf (§34) numbers — which their own check labels quote —
untouched. The committed `e2e/today.spec.ts`, written before the sixth card existed, was updated
from five cards to six.

The proof that both features survived is the thing the parallel work had already built: the
committed Playwright suite (13 specs — import atomicity, offline cache truth, the docked bar, axe,
Search counts) passes alongside the fourteen saints/history browser checks, the harness runs 624
green (the memory §35, the six-card guard, the atomic-import §33, and the perf §34 all together),
and the Today page shows six cards while the Translations page still imports atomically. Shells to
1.18.2/11802; no engine, data, golden, or service-worker change. The net held.

## Faithful in little (v1.18.3)

*"He that is faithful in that which is least, is faithful also in that which is greater." (Luke 16:10)*
**The audit's P3 polish sweep — nine small items, none load-bearing on its own, closed together.**

The audit's third tier was the small stuff: a widget that could freeze on the day it mounted, a
silent failure here, a missing confirmation there, an uneven gutter, a keyboard that opened
uninvited, a file decoded three times over, widgets you couldn't tap, and a security posture worth
naming precisely. None of it was urgent; all of it was the kind of thing that, left alone, quietly
tells a careful reader the corners weren't finished. So they were finished.

**The Reader and the widgets.** The embeddable Verse of the Day (`WidgetVotd`) read its verse once,
at render — an `<iframe>` a site left open across midnight would show yesterday's word until the page
reloaded. It now takes the day from `useToday()`, the same midnight-timer-plus-foreground-resume hook
the Today page and the liturgical accent already lean on, so a long-lived embed rolls when the civil
day turns (FID-FUNC-010). In the Reader, a parallel pane that failed to load — almost always an
import-only second translation absent on the device — used to collapse silently to one column; it now
raises a quiet notice, with a Translations link when the pane is an import-only text, so the reader
knows the setting is still on and why it isn't showing (FID-FUNC-011). And the verse-action **Copy**,
which had swallowed both success and clipboard failure without a word, now flashes one brief, polite
`role="status"` line by the action bar — a confirmation, or a plain note that copying isn't available
here — that clears after a moment (FID-UX-003).

**Two viewport manners.** `.widget-grid`'s 300 px minimum card overhung the grid at 320 CSS px,
leaving 16 px on the left and 4 on the right; clamping the minimum track to `min(300px, 100%)` lets a
lone card shrink to the column so the gutters stay even, while any wider viewport keeps the 300 px
floor (FID-UX-004). Search's `autoFocus` fired on every visit to the tab, which on a touch phone
throws the on-screen keyboard up over the results the instant you arrive; it is now gated on a
`(hover: hover) and (pointer: fine)` query, so a keyboard/desktop context still autofocuses and a
touch user reaches the field on their own terms (FID-UX-005).

**The widgets learn to open a door.** The home-screen widgets had no deep link — the design spec had
always expected the Mass widget to open Mass. A new custom `fidelis://` URL scheme carries the intent:
`fidelis://mass` → the Mass readings, `fidelis://today` → Today (where the Verse and Quote cards
live). iOS widgets attach a `widgetURL`, and the scheme is registered in the App's `Info.plist`
`CFBundleURLTypes`; Android widgets set the same URL as the launch intent's data, with a matching
`MainActivity` intent-filter. The web layer routes it uniformly through Capacitor's `appUrlOpen` (a
tap while running) and `getLaunchUrl` (a cold launch) in `src/App.tsx` — one handler, both platforms
(FID-NATIVE-002).

**Decoding once.** The ~400 kB `calendar.json` was parsed in the placeholder, snapshot, and timeline
paths of both the Mass and Quote providers, on every reload. iOS now memoizes the decode
process-locally, lock-guarded because WidgetKit may call a provider off the main thread — and the
extension process is ephemeral, so nothing is pinned between reloads. Android factors the read into a
shared `CalendarData` helper backed by a `SoftReference`, so `CalendarWidget` and `QuoteWidget` reuse
one decode within a burst while the memory stays reclaimable under pressure and simply re-parses on
demand (FID-PERF-004).

**Naming the security posture.** The manifest seal is a build-time guarantee — the SHA-256 manifest is
re-walked on every build and in CI — and the UI now says so: "Texts verified" became **"verified at
build"** in Settings and About, so it can't be misread as a live checksum of the device's cache; the
new `docs/SECURITY.md` records where runtime trust actually comes from (native code-signing, the
immutable cache-first corpus) (FID-SEC-001). And the first step of a Content Security Policy ships —
in **Report-Only** mode, deliberately non-breaking. `public/_headers` carries a
`Content-Security-Policy-Report-Only` policy (plus `X-Content-Type-Options` and `Referrer-Policy`)
that observes and logs violations but blocks nothing; the single inline pre-paint `<script>` is
allowed by its SHA-256 hash rather than `'unsafe-inline'`, and harness §36 recomputes that hash from
`index.html` so editing the script without updating the header goes red. Because the report-only form
is ignored inside a `<meta>` tag, it must be a real header — honored by hosts that read `_headers`,
inert and harmless everywhere else and in the code-signed shells. The enforcing-`<meta>` migration,
and its traps (the Capacitor bridge, the embeddable widget's `frame-ancestors`, the load-bearing
`style-src 'unsafe-inline'`), is written down in `docs/SECURITY.md` and deferred (FID-SEC-002).

Harness §36 guards all nine — shape guards for the UI/native/host wiring the pure engines can't reach,
plus the one real computation, the CSP hash drift gate. Shells to 1.18.3/11803; no engine, data,
golden, or service-worker change.

## Come and see (v1.18.4)

*"Philip saith to him: Come and see." (John 1:46)*

The Mac-only pass. The 2026-07-15 full product audit ran on a Linux environment with no Xcode, no
simulator, no Apple signing identity, and no App Store Connect credentials (audit §2.2). It therefore
left one hard release blocker (FID-REL-001) and a whole native acceptance checklist (§10) that only a
Mac could close. This release closes them from the machine that can. **It changes no application
code** — no engine, data, golden, or service-worker change; the only committed source edits are the
version strings and the docs. The work is verification and shipping, not building.

**The screenshots that lied (FID-REL-001).** The App Store set submitted on 2026-07-13 predates the
Collapsing Masthead (v1.16.0): every frame showed the retired bottom tab bar, and `APP_STORE.md`
flagged the whole set stale — a self-declared release blocker, because an update carrying those
frames would advertise navigation the app no longer has. The set is regenerated against the v1.18.4
Release web bundle. The regeneration is faithful by construction: the iOS/Android shells wrap the
exact same `dist/` web bundle, so a headless-Chrome capture at the device's own pixel geometry
(428 × 926 CSS at 3× → 1284 × 2778 for the iPhone 6.9″ class; 1024 × 1366 at 2× → 2048 × 2732 for the
iPad 12.9″ class) reproduces what WidgetKit's web view draws. Every frame now carries the masthead and
the slim pinned tab row; none shows a bottom bar; the day and night frames read the current tokens;
and the first three tell the Today → Reader → Mass story — the four acceptance criteria of
FID-REL-001, met. The screenshots live in the gitignored `appstore/` tree (large, regenerable PNGs),
regenerated by a **committed** harness — `scripts/capture-appstore.mjs`, kept in the tree so the set
can never silently go stale again (the whole reason FID-REL-001 existed: the old harness lived only in
a session scratchpad). `APP_STORE.md` documents the two-command regeneration.

**The native acceptance checklist (§10).** Worked item by item on this Mac. Three tiers, kept honest
and separate:

- *Confirmed on the Mac* (Xcode 26.6, the iOS Simulator, and source/build inspection): the Release
  archive embeds the widget extension, the app icon set, the `PrivacyInfo.xcprivacy` manifest, and the
  current web bundle; a night cold launch shows no Day-theme flash (the `index.html` pre-paint script
  sets `data-theme` before React mounts); the safe-area insets resolve exactly once
  (`contentInset: "never"`, `viewport-fit=cover`); the universal-region widget policy is explicit and
  fixed to USCCB; fresh install opens Today with no onboarding or permission prompt.
- *Verifiable in the simulator / browser but re-confirmed here*: the masthead scrolls away and the tab
  row pins; sheets freeze the page, scroll internally, and restore the offset; airplane-mode reads
  every bundled translation and commentary (the whole corpus ships in the binary).
- *Handed to the maintainer as a [device acceptance checklist](../guides/DEVICE_ACCEPTANCE.md)* — the
  items that genuinely need physical hardware, to be run from this very TestFlight build: VoiceOver
  navigation order and pronunciation; live
  Dynamic Type at the largest accessibility category; the on-screen-keyboard-versus-docked-action-bar
  interaction while editing a verse note; edge-swipe Back over an open sheet; add-only Photos on
  "Save image"; all three widgets in every family and appearance, and their midnight/time-zone
  refresh; and Siri returning the same Gospel citation as the Mass page.

**Shipped.** Native version strings reconciled to 1.18.4 (the four iOS `MARKETING_VERSION` entries;
Android `versionName` and `versionCode` → `11804`), and the signed build uploaded to TestFlight via
`scripts/ios-testflight.sh` (archive unsigned → distribution-sign at export → `altool` upload), where
the maintainer runs the device checklist and, that passing, submits the update to App Store review —
now with honest screenshots. Two acceptance concerns were surfaced and **recorded rather than fixed**
in this verify-only pass — the light-pinned native night-launch splash (`capacitor.config.ts`
`backgroundColor` is the Day token and `Splash.imageset` has no dark variant, so a Night cold launch
can flash light before the WebView's dark first paint) and the region policy that is explicit in code
and docs but not pinned by any harness assertion — both written down under "Standing concerns" in
[Device acceptance](../guides/DEVICE_ACCEPTANCE.md). No harness change (there is no new engine
behavior to guard); `APP_STORE.md` refreshed to drop the stale banner and describe the six-card Today
page and the post-masthead controls.

## The ancient bounds (v1.18.5)

*"Pass not beyond the ancient bounds which thy fathers have set." (Proverbs 22:28)*

A harness-hardening release. It changes no application code and no behavior; it exists only to turn
two written-down policies into red-`npm test` guarantees. After the v1.18.4 audit finish, a
post-ship adversarial review swept the whole v1.18.2–v1.18.4 range for runtime defects and found
**none** — the widget deep links, the Report-Only CSP, and all nine P3 fixes were verified correct
against the shipped code. What it did find were two policies that lived only in prose and comments,
where a later edit could quietly cross them without any test noticing. This release moves both
inside the fence.

**The region policy, now pinned (FID-NATIVE-001).** The home-screen widgets and the Siri intent
read a pre-resolved `calendar.json` that `scripts/build-calendar-widget.ts` fixes to the USCCB
(`REGION = "usa"`) region by design — so out of the box the widgets and Siri agree with the app's
default calendar, and a user who switches the app to the Universal calendar still sees USCCB content
on the glass (region-configurable widgets are deliberately deferred; see the iOS guide's "Region
policy"). That choice was explicit in code and documented in two places, but nothing failed if it
were flipped — exactly the standing concern the v1.18.4 pass recorded. A one-line source-shape guard
in harness §36 now asserts the pin, and it was verified to fail the suite when the region is changed
to `universal`. The fence is now a wall.

**The CSP drift-guard, now watching the shipped file (FID-SEC-002).** v1.18.3 shipped a
Content-Security-Policy in Report-Only mode (`public/_headers`) that admits the inline pre-paint
script by a SHA-256 hash, with a harness gate that recomputes the hash so a silent edit to the
script turns red. But the gate hashed the *source* `index.html`, while the browser loads the *built*
`dist/index.html`. Today those two inline scripts are byte-identical — Vite passes the pre-paint
`<script>` through verbatim, recomputed and confirmed both here and in the adversarial review — so
nothing was actually wrong; the guard was simply watching the file that doesn't ship. §36 now adds a
build-aware assertion: whenever a `dist/` exists, it checks that `dist/index.html`'s pre-paint script
is identical to source, so a future HTML transform that diverged them — invalidating the shipped hash
and the deferred enforcing-`<meta>` migration — turns red instead of sailing through. The check is
skipped on a bare `npm test` with no build present, so it never false-fails in CI's test-before-build
ordering.

No engine, data, golden, or service-worker change; no `dist`-shipped code change. The stale README
version badge — which had drifted to 1.18.2 because the v1.18.3 and v1.18.4 releases never bumped it
— is corrected to 1.18.5. Native version strings 1.18.4→1.18.5 (`versionCode` 11804→11805).

## Men of renown (v1.19.0)

*"Let us now praise men of renown, and our fathers in their generation." (Ecclesiasticus 44:1)*

The Saint of the Day, made visible. Back in v1.18.0, "the memory of the just" built the whole
apparatus — a saints corpus, a history corpus, detail pages, memoized loaders, provenance-gated
build scripts — but wired the Saint into the Today page only as a faint link on the Mass card's
memorial name. It had two failings a user found at once: it was too quiet to notice, and it depended
on the calendar engine already naming the day's saint. On St. Bonaventure's own memorial, July 15,
neither held: the engine did not know the day, so there was no memorial name to link, and the Saint —
though his life sat ready in the corpus — did not appear at all. This release fixes the engine gap,
gives the Saint real presence, and broadens the corpus across the calendar.

**The engine gap (the "no Saint at all" bug).** St. Bonaventure, Bishop and Doctor of the Church, is
an obligatory memorial of the General Roman Calendar on July 15 — but he was simply absent from the
sanctoral table in `liturgical.ts` (a "representative selection" that had skipped him). So the engine
resolved July 15 as a plain green feria, the Mass card showed no celebration, the memorial-name link
had nothing to attach to, and `saintForCelebration` never matched. One line restores him; July 15 is
now a white memorial in both the Universal and USA calendars. The golden snapshots are re-blessed
(the change is scoped to July 15 alone — its color and celebration; the ferial readings are untouched,
correct for an unmarked memorial), and an explicit harness assertion pins it so he cannot vanish again.

**The "Today in the Church" card.** The card that was "Today in Church History" is reworked into the
one the Saint deserves. It now leads with the **Saint of the Day**: a gold monogram medallion (the
sacred mark — gold honors, the two-accent rule), the name in the Scripture face, the title, rank, and
dates, a one-line blurb, the patronage, and a purple "Read the life →" link to the full page that
already carried the biography, canonization, and sources. Below a hairline follows the day's
**Church-history** event, as before. Crucially, the Saint is now **decoupled from the sanctoral
engine**: the card shows a life whenever the corpus has one for the day — even a feria — not only on
days the engine celebrates. The Mass card's memorial-name link stays as a secondary affordance.

To make room without breaking the standing six-card rule, the **Mass card is retitled "Today at
Mass"** — its own home-screen-widget name, and a more precise label for a card of readings — which
frees the "Today in the Church" banner for the Saint card and, as a bonus, resolves the confusing
near-duplicate that had stood since v1.18.0 ("Today in the Church" for the Mass card beside "Today in
Church History" for the other). The page still renders exactly six cards.

**The corpus, broadened.** The saints corpus grows from 10 to **53** lives and the history corpus
from 8 to **15** events, reaching into every month of the year. Every entry is drawn faithfully from
public-domain reference works — the Catholic Encyclopedia of 1913, Butler's *Lives of the Saints*,
the *Jesuit Relations*, St. Thérèse's own *Story of a Soul* — and carries `verified: false`, the
sourced-draft flag of the §3.4 ledger, until a human checks it against the named edition. The
provenance gate is honored strictly: truly modern saints for whom no public-domain source exists
(Maximilian Kolbe, Padre Pio, John Paul II, Frances Cabrini) are **left out rather than falsely
cited to a 1913 encyclopedia that could not have known them** — an honest gap is better than a false
footnote, and the days they fall on simply await proper sourcing.

**The widget, re-synced.** The native `calendar.json` — the pre-resolved feed the home-screen
widgets read — is regenerated so July 15 now carries St. Bonaventure. Regenerating also surfaced that
the artifact had gone **stale since v1.14.1**: the deterministic Quote-of-the-Day rotation (a seeded
mulberry32 permutation, so the fill is reproducible) had drifted from what the live web app computes.
Re-generating re-syncs the widgets to the engine; iOS and Android stay byte-identical.

No service-worker change. Native versions 1.18.5→1.19.0 (`versionCode` 11900).

## A great multitude (v1.20.0)

*"After this, I saw a great multitude, which no man could number, of all nations and tribes and peoples and tongues, standing before the throne and in sight of the Lamb, clothed with white robes, and palms in their hands." (Apocalypse 7:9)*

A Saint of the Day for **every day of the year**. v1.19.0 gave the Saint a home — the "Today in the
Church" card — but only 53 lives to fill it, so most mornings still showed the calm "the saints are
being gathered" placeholder. This release finishes the gathering: **366 saints, one for every
calendar date (Feb 29 included)**, and a **Church-history chronicle grown from 15 to 183 events**
across 150 days. The card is now full year-round.

**How it was built.** Twelve research passes — one per month — drafted the principal Saint of the
Day for every date, choosing the General Roman Calendar's celebration where there is one and the
most significant, best-documented saint of the Roman Martyrology otherwise, plus rich
multi-paragraph history events for the notable days. Every draft was then run through the same
provenance gate the seed corpus obeys, audited for full date coverage, unique ids, schema, and
sourcing, and spot-checked for accuracy against known feasts (Anthony of Egypt, Agatha, Perpetua and
Felicity, Philip Neri, Bernard of Clairvaux, Gregory the Great, Charles Borromeo, Francis Xavier —
all correct, with correct dates and ranks). The 53 curated v1.19.0 lives were kept as-is; the merge
only filled the empty days.

**The honest-sourcing problem, solved.** The seed corpus deliberately left out modern saints
(Kolbe, Padre Pio, John Paul II, Cabrini) because the app's provenance gate requires a
**public-domain** source, and there is none for a twentieth-century saint — a 1913 encyclopedia
could not have known them, and citing it would be a false footnote, exactly what §13 forbids. To
reach a true 366 without that dishonesty, this release adds a second accepted source license,
`"church-official"`: an official Vatican biography (vatican.va), drawn faithfully and **labelled as
what it is** — not public domain, but not fabricated either. The build gate and harness now require
at least one `public-domain` **or** `church-official` source; pre-1900 figures still stand on the
Catholic Encyclopedia (1913), Butler's *Lives of the Saints*, and the Roman Martyrology, and
`church-official` is reserved for the genuinely modern (Maria Goretti, Josephine Bakhita, Edith
Stein, Faustina Kowalska, the Korean and Ugandan martyrs, and the rest). An audit confirmed **zero**
false public-domain citations across all 366.

**Still drafts.** Every one of the 366 saints and 183 events carries `verified: false` — the §3.4
ledger's mark of a sourced draft pending human verification against the named edition. The facts
were drawn from the standard works and audited, but the corpus is explicitly a careful draft, not a
proof-read final; that pass remains the maintainer's to make. Harness §35 now turns **red if any of
the 366 calendar dates lacks a saint**, so the coverage can never silently regress.

No engine, golden, or service-worker change — this is pure corpus data plus the one-license widening
of the provenance gate. Native versions 1.19.0→1.20.0 (`versionCode` 12000). The native build and
TestFlight submission that carry this to devices are the maintainer's next step.

## Them that are fettered (v1.20.1)

*"…The Lord looseth them that are fettered." (Psalm 145:7)*

A bug-fix release for a report that came in from the TestFlight build: on the phone, tapping "Read at
Mass" went nowhere. Investigation on the device found it was far larger than one button — **every nav
tab and every "→" button dimmed on tap but didn't navigate**, app-wide, and **only fully quitting and
reopening the app fixed it**. That last fact was the key: a state that survives navigation but resets
on relaunch is a stranded global lock, not a routing bug.

**The cause.** Every modal sheet pins the page behind it with `body { position: fixed }` — the
iOS-safe scroll-lock, because WKWebView ignores `overflow: hidden` for touch dragging. The lock is
reference-counted (`src/lib/scrollLock.ts`) so that stacking and un-stacking sheets in any order pins
the body exactly once and releases it exactly once; its own comment calls the failure it guards
against "the iOS page-won't-scroll bug." But the reference count assumes every `lockScroll` is paired
with an `unlockScroll`, and that pairing lives in a React effect's cleanup. An iOS WKWebView can tear
a sheet's subtree down **without running that cleanup** — when a native share sheet, a Photos
permission dialog, or a background/foreground transition interrupts the teardown mid-flight. The lock
is then stranded: the body stays `position: fixed`, so React Router still changes the route on a tap
(the button dims, the URL updates) but the newly-rendered page is pinned out of the viewport — it
reads as "nothing happened." A relaunch zeroes the count and the styles, which is why quitting fixed it.

**The fix.** A self-healing release valve. `resetScrollLock()` force-releases a stranded lock and
restores the body; `src/App.tsx` calls it on **every route change and on foreground-resume**, but
only when the body is pinned **and no sheet is actually in the DOM** — a `.sheet-backdrop` check, so
the heal can never disturb a legitimately-open sheet (every `Sheet` renders that class, and only
`Sheet` locks the scroll). So the moment the user taps any tab in the stuck state, the route change
fires the heal, the lock releases, and the destination page appears — the app un-freezes on the next
tap, no restart required; a background→foreground clears it too. A real logic test drives the
leak-and-heal directly, and source-shape guards pin the wiring, so a silent revert turns `npm test`
red.

No engine, data, golden, or service-worker change. Native versions 1.20.0→1.20.1 (`versionCode`
12001); a native build carries it to TestFlight.

## That nothing be lost (v1.21.0)

*"Gather up the fragments that remain, lest they be lost." (John 6:12)*

The audit-fix release. A comprehensive external audit of v1.20.1 (2026-07-16) was verified
claim-by-claim — every finding confirmed against the code, two of them recalibrated (the storage
defect was *worse* than written, the privacy finding *stronger*) — and then closed in full,
together with the verification sweep's own finds.

**The storage shadow (audit FID-STOR-002).** v1.18.0's storage banner warned that a refused
`localStorage` write could lose data, and its own comment claimed the value "lives only in memory
now" — but no memory held it. Worse, `SettingsContext.update` is `setSettings(saveSettings(patch))`
and `saveSettings` merges over a **fresh persisted read**, so after one refused write the next
unrelated settings change visibly snapped the earlier one back (Night theme → change text size →
theme reverts, on screen, no app close needed). And the banner's own recovery — "Export your
library" — read persisted storage, so it could never contain the very changes it warned about.
The fix implements the comment instead of deleting it: a module-private **session shadow**
(`Map` keyed like localStorage) holds every refused value; `read()` prefers it, so the UI,
`saveSettings`' merge base, `exportMarginalia`, and the bookmark/highlight/note getters all keep
working on the newest data; a later successful write re-persists every stranded key and drains the
shadow. `importMarginalia` returns `persisted: false` when the browser refused its writes and both
import surfaces append the session-only warning; the banner now promises exactly what the code
does ("kept for this session only… Export your library to keep them safe"). The read path is
hardened the same day: `readList` degrades any corrupt/foreign non-array store to `[]` (one bad
`plans` key used to blank the entire Today page via `activePlan()` at render), and `getLastRead`
shape-guards its blob. Harness §37 drives all of it red-first through the §33 monkeypatch idiom,
and a committed browser spec (`e2e/storage.spec.ts`) proves the banner, the surviving bookmark,
the both-settings continuity, and the export recovery in real Chrome.

**Honest loader failures (sweep).** `loadSaints`/`loadHistory` swallowed every failure into a
resolved `null`, so Home's "Church history couldn't be loaded" state was dead code and an offline
blip rendered the calm "being gathered" line — a false statement since v1.20.0 gave every date a
saint. The loaders now treat only a **404 as absence** (cached null); any transport/HTTP failure
rejects and drops the cache key for retry. Home gains a `saintFailed` track with combined/separate
connection notices, and the Saint/History detail pages gain a `"failed"` state ("couldn't be
loaded — it will return with your connection") distinct from "not yet in the collection." A
route-abort browser test pins the notice and the absence of the calm line.

**One authoritative record per event (audit FID-CONTENT-001 + sweep).** The v1.20.0 twelve-pass
research merge keyed on id, so six same-day-same-year duplicate pairs slipped through: Nicaea,
Gregory VII's death, Jerusalem 1099, Francis' death, Lepanto, and *Ineffabilis Deus* each appeared
twice on their History pages (and inflated the Today card's "Read more · N events" count). Each
pair is merged — curated id kept, the fuller sourced prose adopted, sources united — and
`build-history.mjs` now hard-fails any same-day-same-year pair not named in an explicit
`DISTINCT_SAME_DAY_YEAR` allowlist (rejection proven against an injected duplicate). Four
feast-keyed events move to the dates the events happened, since the Today card presents them as
on-this-day facts: Chrysostom and Cyprian to 14 September (both died that day; their entries'
own bodies said so), the Mercedarians' founding to the traditional 10 August 1218, the Edict of
Milan to 13 June 313 (Licinius' Nicomedia rescript). The corpus settles at 177 events across 147
dates. Ranks are reconciled: St. Francis of Assisi was "Feast" in the saints corpus while the
engine (correctly, per the GRC) called Oct 4 a **Memorial** — a same-screen contradiction every
year; David of Wales (not on the GRC) takes the corpus's honest "Commemoration"; and the engine's
St. Patrick gains `opt: true` (memoria ad libitum in the GRC) — behaviorally invisible since 17
March always falls in Lent, and the golden snapshots are byte-identical to prove it. Harness §38
pins all of it.

**Privacy wording that matches the platform (audit FID-PRIV-001, Option B: disclose).** With
`android:allowBackup="true"` and no iOS exclusion, the OS may carry Fidelis's data into the
user's own encrypted iCloud/Google backup — which made "Deleting the app deletes all of it" and
"never transmitted anywhere" false as absolutes, on the very document the App Store privacy link
points at. Backups stay **enabled** (the user-protective choice: Settings itself urges export so
a lost device doesn't take the marginalia; excluding backups would guarantee that loss), and the
words now match the configuration: PRIVACY.md gains a **Device backups** section (your backup,
encrypted by Apple/Google, invisible to Fidelis, restorable; how to opt out before deleting),
the deletion claim speaks only for the device, "never transmitted" is qualified **by Fidelis**
(which remains absolutely true — no server, no analytics, no requests), and the same absolutes
are softened in SECURITY.md, the README, the App Store copy, and the About/Settings/Library/
Translations pages. A §38 drift-guard couples `allowBackup="true"` to the PRIVACY.md disclosure,
so flipping either alone turns `npm test` red. Maintainer follow-ups recorded: the live App Store
listing's import line, and a physical backup/restore acceptance pass on both platforms.

App Store screenshots were regenerated against this build via the committed
`scripts/capture-appstore.mjs` (FID-REL-001 — the Jul 15 set predated the Saint of the Day card;
the stale mixed-generation iPad files were removed), and the new Today frame verified visually:
"Today at Mass" banner, Saint of the Day medallion. No engine-behavior, golden, or service-worker
change. The harness grows §37/§38; the browser suite grows 13 → 16 tests. Shells 1.21.0
(`versionCode` 12100).

## Knowledge shall be manifold (v1.22.0)

*"Many shall pass over, and knowledge shall be manifold." (Daniel 12:4)*

The enrichment release. Three strands land together: the stranded-scroll-lock navigation
freeze hardened past v1.20.1's self-heal, the Today card's saint/history duplication
closed at both the content and the code level, and the full memory corpus — every Saint
of the Day and every Church History entry — rewritten from thin two-paragraph drafts
into complete, fact-dense lives.

**The navigation freeze, closed for good.** A TestFlight-class report that v1.20.1
largely answered returned with a sharper edge: tapping a home-screen widget (or,
randomly, ordinary in-app use) opened the app, but every tab "blipped and did nothing"
until a force-quit. The mechanism is the one v1.20.1 named — a sheet torn down without
its effect cleanup strands `position: fixed` on the body, so routes still change but
the pinned body clips each new page out of view — but the original heal had escape
hatches. It fired only on route change and `visibilitychange`, it predicated on the
lock *counter* (so a pin the count lost track of — a teardown interrupted between
unlock and style restore — could never heal), and on a healed PUSH it restored the
*departed* page's scroll offset over ScrollManager's fresh placement. The hardening
(`src/lib/scrollLock.ts`, `src/App.tsx`): `healStrandedScrollLock()` predicates on the
**body's actual inline pin** as well as the count; the heal fires on **every
pointerdown** (the user's next touch anywhere unpins, even a same-tab tap that changes
no route), on `visibilitychange`, and on the native **`appStateChange`** signal that
WKWebView resume paths guarantee; and the route-change trigger passes
`{ restoreScroll: false }`, so a healed navigation lands where ScrollManager put it.
The `.sheet-backdrop` DOM guard still means a legitimately open sheet is never
unlocked. Harness §25 (b3)–(b6) drives it red-first — count-0 strands, the no-restore
option, the open-sheet guard — and the whole suite plus the 16-test browser net stays
green.

**The Today card never says the same name twice.** The v1.21.0 duplicate purge left
one visible class standing: on 18 dates the Saint of the Day and a "Today in Church
History" event share a subject (Lourdes and the first apparition, Our Lady of the
Rosary and Lepanto, the Martyrs of Compiègne and their execution, Augustine and his
death in the Vandal siege…). Two fixes, one in code and one in prose. In code,
`leadHistoryEvent()` (pure, in `src/lib/history.ts`, sharing `nameTokens` with
`saints.ts`) leads the card's history slot with the first event **not** about the
day's saint when the day has another to offer, falling back to the oldest event when
the pairing is the whole story — the /history page still lists everything. In prose,
all 18 paired events were rewritten from a **complementary angle** — the saint entry
keeps the complete life while the history event takes context, circumstances, and
aftermath — so a reader of both learns something from each. §35 gains the logic tests
and the wiring guard.

**Five hundred forty-three entries, deepened.** The v1.20.0 corpus solved coverage (a
saint for all 366 dates, 177 events) but at draft depth: a uniform ~100 words in two
paragraphs, 68 biographies naming no year at all, and the thinnest entries
disproportionately on the biggest feasts (the Ninety-five Theses at 63 words, Trent at
66, Dominic at 67). All 543 entries are now **3–4 paragraphs and 150–200 words** —
saints median 99 → 183, history median 109 → 179, nothing under 130 — with at least
five concrete facts each: years, places, named works and people, causes of death, and
the *reason* behind each patronage. The work ran as 46 research-verified drafting
batches against the Catholic Encyclopedia 1913, Butler's *Lives*, the Roman
Martyrology, and vatican.va, merged through a validating one-shot pipeline (shape,
length, paragraph discipline, the shortBlurb ellipsis convention); contested details
are hedged or omitted, and dozens of small old-prose errors were corrected along the
way — Bonaventure's birthplace (Bagnoregio is not in Tuscany), the Scillitan martyrs'
attested answer, Lepanto's gulf (Patras, not Corinth), the "Be not afraid" of John
Paul II (the inaugural homily, not the election-night appearance), John Nepomucene's
confessional legend (now labelled what it is), popes Soter and Caius' martyrdoms
(unsupported, now told truly). A handful of metadata fields the drafters could not
touch surface as maintainer follow-ups (e.g. Hunna of Alsace's impossible "1877 by
Leo XIII" canonization line — Leo X, 1520). Every entry remains `verified: false`: a
sourced draft awaiting the human proof-read, the §3.4 ledger posture unchanged.

**The corpus under five new gates.** The duplicate audit that framed this release also
measured what the harness could not catch; §35 now turns each into a red `npm test`:
exactly one saint per day (the card renders `saints[0]`, so a silent second would
shadow), no two saints normalizing to the same person name, no two history events
normalizing to the same title (the reworded-reentry class), the shortBlurb
trailing-ellipsis convention (share text depends on it), and corpus↔emitted byte sync
for both memory corpora — editing `scripts/*.corpus.json` without re-running
`npm run saints|history` now fails the suite, as quotes already did.

No engine, golden, or service-worker change; the widgets need no regeneration (the
memory corpora feed neither). Shells 1.22.0 (`versionCode` 12200).

## Decently and in order (v1.22.1)

*"Let all things be done decently, and according to order." (1 Corinthians 14:40)*

The UI polish batch — the six UX findings from the full review, closed inside the
design system, each pinned by the new harness §39. The NABRE fallback notice moves
from once-per-reading (three identical notices on a normal day) to once per page,
re-worded to one breath. Worship surfaces lose their developer artifacts: the raw
lectionary code leaves the Mass footnote, the manifest hash prefix leaves Settings
(the "verified at build" claim stays in both places). The Mass toolbar select keeps
its full label at ≥640px; the footer motto and the rosary's Latin name gain
`lang="la"` so screen readers voice them as Latin; the Read tab's bare "Reading
plans →" link gains a one-line explainer; and the Commentary switch chain (Haydock,
Church Fathers, Doctors-only) nests visually under its parent — presentation only,
no behavior change. The TestFlight/App Store metadata also follows 1.22.1 again
(version, cumulative copy, test notes, screenshot status, character count), with
an eleventh §39 check preventing it from drifting behind `package.json`. Shells
1.22.1 (`versionCode` 12201); no engine/golden/sw change.

## A book of remembrance (v1.22.2)

*"A book of remembrance was written before him for them that fear the Lord." (Malachi 3:16)*

A bug-fix release for a reported "data error" on the Today page: on July 19
(St. Macrina the Younger), the "Today in the Church" card showed the Saint of
the Day correctly but declared underneath that "Church history couldn't be
loaded — it will return with your connection," as though the app were offline —
when in truth the day simply had no Church-history event in the growing
chronicle (147 of 366 days are covered).

**The mechanism.** The per-date loaders `loadSaints`/`loadHistory`
(`src/lib/data.ts`) were written to a "**only a 404 is absence**" contract in
v1.21.0 — a genuine transport failure should reject (so Home's honest notice
renders) and a 404 should resolve `null` (the calm "no entry" state, which for
a covered saint beside an uncovered history day renders nothing at all). But
that contract assumed the missing file returns a real HTTP 404. On **every host
Fidelis actually ships to** — the static PWA host, `vite preview`, and the
Capacitor iOS/Android shells — a request for a file that isn't there is answered
by the **SPA fallback**: the app's own `index.html`, with HTTP **200** and
`Content-Type: text/html`. The loader's `!r.ok` guard passed (200 is ok), then
`r.json()` tried to parse `<!doctype html>…` as JSON, threw, and the promise
rejected — landing on the "failed" branch. So an uncovered history day looked
exactly like an offline blip. (The saint on July 19 loaded fine only because a
saint file genuinely exists for that date; a day missing *both* would have shown
the failure for the saint too.)

**The fix.** A shared `fetchDayJson<T>(url, label)` helper now backs both
loaders. It resolves `null` for a real 404 **and** for a 200 whose body is the
HTML app shell (detected by attempting `JSON.parse` and, on failure, checking
the body begins with `<`) — both are the same fact, "no entry for this day on
this host." A genuine transport error (offline `fetch` rejection, a 5xx, or a
truly corrupt non-shell JSON) still rejects, so the honest "couldn't be loaded"
notice on Home and on the Saint/History detail pages stays reachable. The
memoize-and-drop-the-key-on-rejection behavior (the retry-after-rejection
convention) is unchanged.

Harness §37 rewritten for the new shape (three checks, red-first against the old
`status === 404`-only loaders); a new `e2e/today.spec.ts` test fulfills a
history request with the 200-HTML shell and asserts the card shows its saint
with no failure notice. No engine/data/golden/service-worker change. Shells
1.22.2 (`versionCode` 12202).

## The verity of those things (v1.22.3)

*"That thou mayest know the verity of those things in which thou hast been instructed." (Luke 1:4)*

A data-integrity release, and the closing of the chronicle's draft state. The
"Today in the Church" feature shipped with every entry marked `verified:
false` — a sourced draft, the proof-read deferred (spec §3.4). This release
performs that proof-read in full: twelve per-month verification passes over
all 177 Church-history events, each event's day, year, people, places,
documents, and quoted words checked against its named edition — the Catholic
Encyclopedia (1913), the Vatican's own documents — and against corroborating
modern scholarship.

**The result.** 155 entries stood exactly as written; 22 were corrected, and
exactly one was a material error: the casualty figures of the Porta Pia breach
(20 September 1870) were swapped — the dead were some fifty Italian soldiers
and nineteen of the pope's men, many of them Zouaves, not the reverse. The
rest were the quiet slips a chronicle accruing over months collects: Clement
VII was elected at Fondi and reached Avignon only the following year; St.
Gregory VII's cult was confirmed by Gregory XIII in 1584 and his canonization
pronounced by Benedict XIII in 1728 — not by Paul V in 1606; the Second
Vatican Council sat over four autumns (1962–1965), not three; Benedict IX was
deposed in absence at the synod's Roman continuation, not at Sutri itself;
Mehmed II entered Constantinople on the day of the fall and cut short the
sack he had licensed for three days — a siege of fifty-three days, not
fifty-five; the Fátima apparitions did not all fall on the 13th (August came
on the 19th, at Valinhos, the children detained by the civil authority); St.
Cuthbert died on Inner Farne and was buried at Lindisfarne, not the reverse;
St. Leo the Great's remains were moved within St. Peter's and rest beneath his
altar, not in the long-vanished vestibule; Alp Arslan outlived Manzikert by
little more than a year, not barely one; St. Scholastica's soul was seen on
the day of her death, three days after the last meeting; St. Thomas More
refused the oath at Lambeth on 13 April 1534 (the modern date; the older
biographies, the Catholic Encyclopedia among them, give the 14th); Rutilio
Grande was murdered less than three weeks into Romero's tenure, not three
weeks; Valerian's ban on the cemeteries belonged to his first edict (257),
the second (258) adding the summary execution of clergy, and Felicissimus and
Agapitus were *buried* at Praetextatus, their place of execution unrecorded;
the Index of Forbidden Books ran to some twenty editions in all, the last in
1948, so nineteen "followed" the first; Galileo's sentence was commuted first
to the Tuscan embassy at the Villa Medici, then to Siena, then to Arcetri;
and the fall of Granada left Navarre standing apart until 1512.

**Hedges and citations.** Two contested details are now hedged rather than
asserted: Theodosius's baptism at Thessalonica (the baptism-first chronology
of Sozomen and the 1913 Catholic Encyclopedia is disputed by recent
scholarship) and Peter Nolasco's origin (the Barcelona-merchant tradition,
against the encyclopedia's Languedoc knight). Four citations were repaired to
the Catholic Encyclopedia articles that actually exist — "Alaric" →
"Visigoths"; "Council of Clermont" → "Crusades"; "Saint Bartholomew's Day" →
"Saint Bartholomew's Day Massacre"; "The Order of Our Lady of Mercy" →
"Mercedarians".

**The ledger.** Every event's `verified` flag now reads true, recorded in the
corpus note alongside the pass date. The corpus was rebuilt (`npm run
history`) and the manifest re-sealed; the harness's corpus↔emitted byte-sync
gate keeps the two in lockstep, so the sealed files are exactly what was
proof-read. No engine/golden/service-worker change. Shells 1.22.3
(`versionCode` 12203).

## The word is very nigh (v1.22.4)

*"But the word is very nigh unto thee, in thy mouth and in thy heart, that thou mayest do it." (Deuteronomy 30:14)*

A device-fix release: two corrections for the native shells, where the whole
corpus already lives on disk. Both were the same mistake one layer down — a
web-shaped mental model of how a file "goes missing" and of how offline
works, applied to a shell that serves the bundle from disk and has no service
worker at all.

**The absence shape v1.22.2 missed.** That release taught the per-date
loaders (`loadSaints`/`loadHistory`) two of the three shapes in which a host
reports "this day has no entry": a real 404, and the SPA-fallback's 200 with
the HTML app shell. It even claimed the Capacitor shells used the second
shape. They do not. On iOS, `CapacitorRouter` maps any request whose path has
an extension (`.json` included) straight into the app bundle, and
`WebViewAssetHandler` answers a file that isn't there by **failing the URL
scheme task** (`didFailWithError`) — which surfaces in the WebView as a
`fetch()` *rejection*, with no HTTP status to inspect. So on device an
uncovered history day (July 19, St. Macrina the Younger) still took the
rejection branch and still read "Church history couldn't be loaded — it will
return with your connection," exactly as before. The fix completes the
contract: `fetchDayJson` resolves `null` for a rejection **on the native
shells only** — on-device there is no transport to lose, so a rejected
bundled request can only mean the file isn't in the bundle — while a web
rejection still means a genuine transport failure and keeps the honest
notice. The §37 comment and shape guards now enumerate all three shapes.

**The download that could never register.** Settings' "Download for offline"
rows save a bundled translation (or the Fathers' commentary) into the service
worker's data cache for the *web*, where texts arrive over the network. The
native shells have no service worker — registration on the `capacitor://`
scheme fails quietly by design — and need none: `npx cap sync` bundles the
entire `dist/` into the binary. So on device the download flashed through its
progress, marked the intent, and then the cache-truth probe (FID-FUNC-008)
found zero files and snapped the row back to "Download." The rows are now
web-only: on iOS/Android the section says plainly that every bundled text and
the Fathers' commentary already read with no connection, and each row reads
"On this device."

Harness §37 gained two red-first checks (the native-rejection absence shape,
the Settings native gate); e2e re-verified green against the built web app,
where both behaviors are unchanged. No engine/data/golden/service-worker
change. Shells 1.22.4 (`versionCode` 12204).

## Remember the days of old (v1.23.0)

*"Remember the days of old, think upon every generation." (Deuteronomy 32:7)*

The Church-history chronicle completes the calendar.

**Every day now has a history.** Until this release the "Today in the Church"
card could show a Saint of the Day with nothing beneath — 147 of 366 dates
carried a chronicle event (177 events after the v1.22.3 proof-read). The gap
was content, not a loader bug: most mornings simply had no entry yet. Twelve
monthly drafting passes filled the 219 uncovered days (plus a few rich-day
extras) with sourced prose drawn from the Catholic Encyclopedia 1913, Butler's
*Lives*, the Roman Martyrology, and vatican.va — the same provenance gate the
existing chronicle keeps — producing **229 new events**. Coverage is now
**366 days / 406 events**, matching the saints corpus so the history lead is
never absent for want of an entry. Where a day already has a saint, the new
event complements rather than retelling that life (the v1.22.0 same-day rule).

**Proof-read before ship.** Four quarterly fact-check passes over the new
entries alone (day, year, people, documents, quoted words) found 208 clean, 20
corrected, and 1 hedged — wrong years (Paulinus of Aquileia 802 not 804), an
inverted Ascension claim for Bede, Blanche of Castile falsely attending
Chartres's 1260 consecration (she had died in 1252), a "first to leave Italy
since 1809" claim misplaced onto Paul VI's 1965 UN visit, and quieter slips
of count and wording. Every corpus `verified` flag is now true. The harness
gains the saints' twin gate: `npm test` turns red if any calendar date lacks
a history event. Corpus rebuilt via `npm run history`, manifest re-sealed; no
engine/golden/service-worker change. Shells 1.23.0 (`versionCode` 12300).

## I am the door (v1.22.5)

*"I am the door. By me, if any man enter in, he shall be saved." (John 10:9)*

A fix release for the home-screen widgets' entry into the app — both where
the door leads and what happens the moment you walk through it.

**The door now leads to the right room.** Until now every widget tap landed
on Today: the Verse of the Day and Quote of the Day widgets shared the plain
`fidelis://today` link, which reads as "the main menu" rather than the part
you tapped. The widgets now carry their own links — `fidelis://verse` and
`fidelis://quote` on both platforms — and `src/App.tsx` routes them to Today
*scrolled to their own card* (`/#votd`, `/#qotd`; the cards gained matching
anchors, and `.card` already carried the header-clearing scroll margin). The
Mass widget still opens the day's readings, and `fidelis://today` still opens
Today for widgets already installed on devices.

**The freeze at the threshold is healed.** The second report: after entering
from a widget, every button "acted like it would do something" but nothing
changed until the app was force-quit — the classic stranded-scroll-lock
symptom (navigation still happens underneath; the pinned body clips the new
page out of view). The heals layered in v1.22.0 (route change, every
pointerdown, foreground resume) all share one guard: never unlock while a
`.sheet-backdrop` is in the DOM. That guard had a hole — a sheet torn down by
an interrupted background/foreground can leave its backdrop element behind
with **no overlay registered**, a zombie that made every later heal refuse
forever. The heal now asks the overlay stack, not just the DOM: a backdrop
with an empty stack is a zombie — removed, then the lock is released — while
a live sheet (which always registers) is still never unlocked. And the widget
entry itself heals before navigating, the exact resume-into-navigation moment
the freeze surfaced. Harness: the scroll-lock battery gains the zombie case
red-first (a live sheet with a registered overlay is still never touched);
§36 pins the three widget links, the card anchors, and the entry-heal; a new
e2e test drives both anchors and asserts the cards scroll into view. No
engine/data/golden/service-worker change. Shells 1.22.5 (`versionCode`
12205).

## Review items — all fixed in v1.1.0 (details below are the record)

### P0 — worship-facing accuracy (all fixed)

- **P0-1:** Fixed (3993dc9) — rank engine with precedence and transfer in `src/lib/liturgical.ts`.
- **P0-2:** Fixed (3993dc9) — day codes derive from the calendar engine's resolved governing celebration.
- **P0-3:** Fixed — `hebrewSpanToVulgate()` in `src/lib/lectionary.ts` maps lectionary psalm spans (modern chapters, English-style verses) onto the Vulgate-versified bundle grid: per-psalm title offsets, the 9/10, 113/114-115, 114-115/116 and 146-147/147 split cases, and nine mid-psalm join/split irregulars. Verse alignment is asserted by incipit in `scripts/test-data.ts`.

### P1 — correctness and integrity (all fixed)

- **P1-4:** Fixed — grid-empty verse slots are skipped in Reader (both columns), Search, and VerseQuote; fully-empty chapters (the five appendix books, textless in the source corpus in every bundle) show an honest notice. `scripts/build-report.mjs` (run by `npm run data` / `npm run report`) emits the committed `data-report.txt` audit: 1,438 appendix placeholder slots + 17 scattered slots; report↔data sync asserted in `scripts/test-data.ts`. About/BookList/README copy corrected (Clementine appendix attribution, grid honesty). The audit surfaced 3 DRC corpus defects (printed 3 Kings 17:11, Prov 30:19, Bar 6:7 absent outright; their slots hold misfiled verses) — documented in the report and About; correcting the corpus itself folds into P1-10.
- **P1-5:** Fixed — `calendarRegion` setting (`universal` | `usa`; default `usa` since v1.13.0, was `universal`) in `storage.ts`, read lazily by both engines (`currentRegion()`); explicit region params keep them testable. USA: Epiphany on the Sunday of Jan 2–8 (`epiphanyDate`), Baptism to Monday when Epiphany lands Jan 7–8 (OT week 1 then anchors on the Epiphany Sunday), Ascension on the Seventh Sunday of Easter, the Guadalupe Feast, and all six USA obligatory memorials (Seton, Neumann, Kateri, Claver, Brébeuf/Jogues, Cabrini). Epiphany left `FIXED` for `movableDefs` and the label dropped "(traditional date)" (closes P2-5); Guadalupe moved to `USA_FIXED` (was over-ranked universally). Region select on the Readings toolbar; About documents the transfers incl. the five Thursday-Ascension provinces. 30+ acceptance checks in `test-liturgical.ts`; the gospel sweep in `test-data.ts` runs both regions.
- **P1-6:** Fixed — the source tables mark prescribed memorial propers with a thousandths suffix on `t` (Barnabas `1.001`, Guardian Angels `6.001`, Martha/Sorrows `6.101/6.201`, Timothy & Titus `1.101/1.201`, Mary Mother of the Church `.x09`); `resolveReadings()` in `src/lib/lectionary.ts` (pure, testable; `readingsForDate` wraps it) promotes a marked, observed, **obligatory** memorial's formulary to primary with the ferial cycle as `secondary` — optional memorials (`opt: true` in `FIXED`: Joseph the Worker, Lourdes, Fatima, Mount Carmel, JPII) and unmarked memorials stay behind the ferial, and governing solemnities/feasts are never displaced. Candidate groups now carry provenance (`dayCodeGroups`). Sts. Timothy and Titus added to `FIXED`/`NAMED` (was missing). Readings page shows "Proper of the Memorial" + "Ferial readings of the day"; 14 assertions in `test-data.ts` 3b.
- **P1-7:** Fixed — `displayReadings()` in `src/lib/lectionary.ts` lays out ordered, labeled sections. Easter Vigil (`LW06-6Sat` codes): Reading I–VII / Epistle with each psalm interleaved after its reading, shorter forms as "or (shorter form)", Gospel last, plus a safety net for unclaimed rows. General days: an `x.N1` same-book row is the shorter form of its `x.N` primary; genuine options keep the option labels. `Readings.tsx` renders the helper's sections. Full 21-label Vigil sequence, Palm Sunday short Passion, and option/shorter-form discrimination asserted in `scripts/test-data.ts`.
- **P1-8:** Fixed — once the target text loads, `Reader.tsx` clamps an out-of-range chapter to the translation's real `data.chapters.length` (replace-navigation to the last chapter); the "Loading…" state now shows only while data is genuinely loading, and a chapter absent from the loaded translation gets an honest notice (also covers the degenerate zero-chapter case, where no redirect fires).
- **P1-9:** Fixed — `dayOfYear()` in `src/lib/votd.ts` is now pure calendar-component math (month-offset table + Gregorian leap rule incl. the century exception), exported for tests; the selection formula is unchanged so the cycle never reshuffles. The iOS widget pins `Calendar(identifier: .gregorian)` (was `Calendar.current`, which would diverge on non-Gregorian device calendars). Harness 7a: ordinal sweep over 7 trap years, a no-millisecond-math source guard, and web↔Swift formula/cycle parity checks (`votd.json` length + first entry).
- **P1-10:** Fixed — upstream commits pinned in `scripts/pins.mjs` (scrollmapper `a228a19`, jayarathina `c6c9d79`; caches keyed by pin so stale master-era caches can't shadow it); a pinned-SHA rebuild reproduced the committed corpus byte-for-byte before trusting the pins. `scripts/build-manifest.mjs` seals `public/data/manifest.json` (SHA-256 per file + root hash + source pins; rewritten at the end of `npm run data` / `npm run lectionary`); `npm run verify-data` and an independent hash walk in `scripts/test-data.ts` verify it; About surfaces "texts verified, manifest root …". The 3 DRC corpus defects (see data-report.txt) remain documented-only: they exist at the pinned upstream commit, and correcting them is an upstream/editorial decision, not a pipeline one.

### P2 — polish (all addressed)

- **P2-1/P2-5:** Closed during P1-4/P1-5 (appendix attribution; Epiphany label).
- **P2-2:** Fixed — Search highlights via a fold-index map (`foldWithMap`), so accent-folded matches (*caelum*/*cælum*) mark the right span.
- **P2-3:** Fixed — `sw.js` v2 precaches the shell all-or-nothing on install (a failed precache fails the install, leaving the old worker in charge) and purges stale `/assets/` entries on activate **and** on fresh navigations (deploys change index.html, not sw.js). Offline navigations to any route fall back to the canonical `index.html` cache entry, which successful navigations keep current. iOS note added to `docs/IOS.md` §4.
- **P2-4:** Fixed — `parseCitation` sets `partial` when it drops letter suffixes (12b); lectionary.json regenerated (566 rows flagged, was 2); manifest re-sealed.
- **P2-6:** Fixed — Library export/import (`exportMarginalia`/`importMarginalia` in `storage.ts`): JSON download; merge-on-import keeps the **newer** entry per verse (by its own timestamp), so an old backup never silently destroys fresh notes; validated/lenient parsing with a friendly error on non-Fidelis files.
- **P2-7:** Fixed — Holy Thursday offers the Chrism Mass (`LW06-4Thu~Chrism`) as `secondary` with `primaryLabel` "Mass of the Lord's Supper (evening)" (mechanism shared with P1-6).
- **P2-8:** Fixed — Reader reads settings once per mount (`useState(getSettings)`).

<!-- END extracted narrative -->

---
[← Docs index](../INDEX.md) · Related: [CHANGELOG](../../CHANGELOG.md) · [CLAUDE.md](../../CLAUDE.md)
