# Release narrative — the faithful record

*For: anyone tracing how Fidelis grew, release by release.*

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
Related: [CHANGELOG](../../CHANGELOG.md) · [CLAUDE.md](../../CLAUDE.md)
