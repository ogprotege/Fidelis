# Changelog

All notable changes to Fidelis. Format follows [Keep a Changelog](https://keepachangelog.com/);
versioning is semantic. The liturgical engines, the bundled texts, and the harnesses are the
product — changes to any of them are release-worthy.

## [1.13.2] — 2026-06-24 — the unbound page

iOS-shell fixes and two small additions found while exercising the Capacitor app in the Simulator.
No change to the liturgical engines, the bundled texts, or the harnesses.

### Added

- **The native app icon is the Chi-Rho** (gold ☧ with Alpha/Omega on the dark field), on iOS and
  Android. iOS `AppIcon` is a 1024×1024 opaque icon; the Android adaptive icon uses the Chi-Rho inset
  in the foreground with a dark (`#222222`) background, and the legacy mipmaps are edge-to-edge.
- **A clearly distinct Scripture-face lineup** (`src/lib/typography.ts`, `styles.css`): **Garamond**
  (bundled, light), **Georgia** (sturdy, large x-height — added by request), **Times New Roman**
  (classic), and **Sans-serif**. The old "System serif" option resolved to Iowan Old Style, which on
  iOS looks almost identical to EB Garamond, so switching appeared to do nothing; it's replaced with
  faces that each look obviously different. (An older saved "serif" choice still maps to the system
  serif until changed.)

### Fixed

- **The Reader (and every page) could become permanently unscrollable in the iOS WKWebView.** The
  bottom-sheet body-lock (`src/components/Sheet.tsx`) saved and restored `document.body`'s inline
  styles per-instance. When two sheets were open at once — the Reader renders the Commentary, Share,
  and chapter-picker sheets independently — the second captured the already-locked `position: fixed`
  state and, on closing out of order, restored it with no sheet open, collapsing the document to the
  viewport so it could not scroll (reproduced on device: `pos=fixed, scrollHeight==innerHeight`). The
  lock is now a shared, reference-counted module (`src/lib/scrollLock.ts`): the body is frozen once on
  the first sheet and restored to its true pre-lock state only when the last sheet closes, so no
  open/close order can strand it. Verified with real touch scrolling in the Simulator.
- **The Scripture face picker did nothing on iOS — "Garamond" and "System serif" rendered
  identically.** iOS WebKit under the `capacitor://` scheme does not reliably fire the lazy download
  of a CSS `@font-face`, so the bundled EB Garamond never loaded and fell back to `Iowan Old Style`,
  which is exactly what the system-serif option already resolves to. `src/lib/fontLoader.ts` now
  forces the face to load at startup via the Font Loading API (which does work in that WebView);
  `font-display: swap` then repaints. Verified on device (rendered widths now differ across all three
  faces). A no-op on the web, where the font already loaded.
- **The iOS home-screen widgets never appeared** — the WidgetKit Swift sources and JSON existed, but
  there was no Widget Extension target in the Xcode project, so nothing was built or installed.
  `scripts/add-ios-widget-target.rb` (idempotent, uses the `xcodeproj` gem) adds the
  `FidelisWidgetExtension` app-extension target, compiles `FidelisWidget.swift` +
  `CalendarWidgets.swift`, bundles `votd.json` + `calendar.json` and `Info.plist`
  (`com.apple.widgetkit-extension`), and embeds the `.appex` in the App target. All three widgets
  (Verse of the Day, Today at Mass, Quote of the Day) build and embed and support the small, medium,
  and large families. This automates the previously manual `docs/IOS.md` §5 step.

## [1.13.1] — 2026-06-23 — the second lampstand

Bring the iOS home-screen widgets to parity with Android, prove the native iOS shell builds in
CI, and reconcile the version strings and docs across the repo. No web app behavior change.

### Added

- **iOS Mass + Quote widgets (WidgetKit source)** — `ios/WidgetExtension/CalendarWidgets.swift`
  adds `MassWidget` ("Today at Mass") and `QuoteWidget` ("Quote of the Day"), the iOS counterparts
  of the Android `CalendarWidget`/`QuoteWidget`. They read the same bundled `calendar.json`
  (produced by `scripts/build-calendar-widget.ts`, now USCCB-region), keyed by a Gregorian +
  device-time-zone ISO date so iOS, Android, and the web app never disagree. `FidelisWidget.swift`'s
  `@main` bundle registers all three widgets. The one remaining step is the GUI-only Widget
  Extension target creation in Xcode (`docs/IOS.md` §5) — it cannot be scripted from the repo.
- **macOS CI** — `.github/workflows/ios.yml` builds the iOS **App** target for the simulator
  (unsigned, no secrets) on `macos-latest`, after `npm ci && npm run build && npx cap sync ios`.
  It selects the newest installed Xcode so the toolchain can read Capacitor 8.4.x's binary
  framework (built with Swift 6.2; an older Xcode fails with misleading "no member" errors).

### Changed

- **Capacitor 8.4.0 → 8.4.1** (`@capacitor/core`, `/ios`, `/android`, `/cli`; latest stable), and
  re-synced — `ios/App/CapApp-SPM/Package.swift` now pins `capacitor-swift-pm` `8.4.1`.
- **Version strings reconciled** to `1.13.1` across `package.json`, the README badge,
  `android/app/build.gradle` (`versionName`/`versionCode`), and the iOS `MARKETING_VERSION`
  (these native strings had lagged at `1.12.3`). `CLAUDE.md` now records v1.13.0 and v1.13.1.

## [1.13.0] — 2026-06-23 — the proper of the day, by default

Align Fidelis with the **USCCB by default** — the U.S. (USCCB) liturgical calendar *and* the NABRE
U.S.-lectionary translation for the Daily Mass Readings — so the calendar, the readings, and the
home-screen widgets are consistent and on-target out of the box. The legal posture is unchanged and
binding: the NABRE is © Confraternity of Christian Doctrine (USCCB) and is **never bundled or
committed** — this changes only *defaults*. Until the owner imports a licensed copy (Translations →
Import, USFM/OSIS/JSON), the readings gracefully fall back to the bundled Douay-Rheims with an
in-line pointer to import, exactly as before. Either default can be switched back in Settings →
Calendar (Region → Universal; Mass readings → Match region / DRB / …).

### Changed

- **`src/lib/storage.ts`** — the `calendarRegion` setting now defaults to `"usa"` (the USCCB
  calendar: Epiphany on the Sunday of Jan 2–8, Ascension on the Seventh Sunday of Easter, and the
  U.S. proper memorials — Seton, Neumann, Kateri, Claver, Brébeuf/Jogues, Cabrini, Guadalupe). The
  `massTranslation` setting now defaults to `"nabre"` (was `""` = match region), so the Daily
  Readings open in the NABRE preference. `massTranslationFor()` is unchanged (an explicit choice
  still wins; `""` still means match region); the §20 harness assertions and golden snapshots
  (which pin both regions explicitly) hold.
- **`scripts/build-calendar-widget.ts`** — the pre-resolved native widget data now uses the U.S.
  (USCCB) region so the home-screen "Today at Mass" widget never disagrees with the app about the
  day's celebration, color, or reading citations. Regenerated `calendar.json` for both the iOS and
  Android bundles (`npm run calendar-widget`).
- **`src/pages/Settings.tsx`** — the Calendar → Mass readings catechesis states that the NABRE is
  the default and that **Match region** is the alternative that follows the calendar region, plus
  the Douay-Rheims fallback note.

## [1.12.3] — 2026-06-17 — the faithful record

Documentation reconciliation — no app behavior change. The README, `CLAUDE.md`, and this file were
brought into line with the current feature set after the v1.10–v1.12 run.

### Changed

- **README** — version badge → 1.12.3; the import section notes USFM/OSIS and the `build-nabre`
  converter; the Today-page card order corrected (Today in the Church now leads); the Identity &
  design section documents the navigation/IA work (scroll restoration, in-page section jump bars,
  native-Back handling, focus management, the liturgical-outline selected state); the Architecture
  table lists the new navigation and import modules; `npm run build-nabre` added to Development.
- **`CLAUDE.md`** — added the v1.12.1 / v1.12.2 / v1.12.3 records and updated the companion-docs
  summary line.

### Added

- First **git tags** and a detailed **GitHub release** for the v1.10–v1.12 work.

## [1.12.2] — 2026-06-17 — bring your own

Make importing a translation you own (e.g. the NABRE for the U.S. Mass) actually practical.
The text is never bundled or committed — these are format parsers; you supply the file and it
is stored only on your device (IndexedDB), exactly as the §2.2 import has always worked.

### Added

- **USFM and OSIS import** (`src/lib/import-formats.ts`, pure + tested §22): the Translations
  importer now accepts standard structured Bible formats (`.usfm`/`.sfm`, `.osis`/`.xml`) in
  addition to scrollmapper-style JSON, with a thorough USFM-code / OSIS-id / book-name → app-slug
  resolver. A structured source drops in with one click.
- **A NAB/NABRE PDF converter** (`scripts/build-nabre.mjs`, `npm run build-nabre`): point it at a
  PDF you own and it emits a `nabre.local.json` (gitignored) you load via Translations → Import.
  Inline verse numbers are split with the monotonic-verse heuristic; book/chapter detection is
  heading-based. PDFs are messy — review the per-book counts it prints; a structured source parses
  cleaner.

### Notes

- No scripture text lives in the repo or in these scripts. The converter's output and any imported
  translation stay on the user's device and are gitignored (`*.local.json`), consistent with the
  app's "copyrighted texts are never bundled" design.

## [1.12.1] — 2026-06-17 — readable again

Visual regressions and polish reported after v1.12.0.

### Fixed

- **Unreadable selects** — the Settings selects (Region, Mass readings) had no background, so on
  the Night theme it was off-white text on the system-white control (white-on-white). All native
  selects now carry the token background and border, readable on both themes.
- **Stale-cache symptoms** — bumped the service-worker shell cache (`v3`→`v4`) so an installed/PWA
  copy fetches the current build instead of serving old assets (the cause of "quotes don't load"
  and "only Small/Medium size work" — both work in current code).

### Changed

- **The in-page section bar is now clean rounded chips** (was a cramped row of bare text links).
- **Selected states wear the liturgical color as an outline** — the day's accent (green in Ordinary
  Time, violet in Advent/Lent, rose on Gaudete/Laetare, gold for white feasts) rings the selected
  pill/chip/tab/version-card, with the purple/gold identity intact and readable text.

## [1.12.0] — 2026-06-17 — the straight paths

A navigation & information-architecture pass so every screen is "a single readable, navigable
page" and movement is seamless forward and backward — no endless scrolling, no broken state in
any combination of nav moves. "Make straight the paths" (Mark 1:3). Driven by a verified nav
audit (29 findings) and an adversarial review (6 fixes folded in). Spec:
`docs/superpowers/specs/2026-06-17-navigation-ia-design.md`.

### Added

- **One scroll authority** (`src/components/ScrollManager.tsx`, pure logic + tests in
  `src/lib/scroll.ts`): a fresh navigation lands at the top, **Back/Forward restores your place**
  (per history entry, with a bounded retry for async-growing pages that stops the moment you
  scroll), and a navigation targeting a verse (`?v=`) or anchor (`#id`) is left to its owner.
  `history.scrollRestoration` is set to `manual`.
- **In-page section jump bars** (`src/components/SectionNav.tsx`): a sticky bar of purple anchor
  links on the long pages — **Daily Readings** (Reading I · Psalm · … · Gospel), **Settings** (the
  nine sections), **About**, and **The Books** (Old/New Testament · Appendix) — so a long page is
  navigable by tapping a header, not by scrolling forever. A shared `--anchor-offset` clears the
  sticky header.
- **Native hardware Back that behaves** (`@capacitor/app` + a small overlay stack,
  `src/lib/overlays.ts`): on Android, Back closes the topmost open sheet/popover first, then goes
  back in history, then exits at the root — never stranding you or exiting with a sheet open.
- **A skip-to-content link** and **focus-to-content on route change** (WCAG 2.4.3), so keyboard and
  screen-reader users land in the new page; the More popover now moves focus into its menu.

### Changed

- **Search survives Back.** The query, translation, and filter are reflected in the URL, so
  returning from a result restores your search instead of a blank page.
- **Clearer titles & orientation:** Today is titled **"Today"** with the date as a subtitle; the
  Reader gains a **"← All books"** breadcrumb; the Daily-Readings null state offers a real "Open the
  Reader →" button; the day-stepper uses `replace` so browsing days doesn't flood the Back stack.
- **Heading hygiene:** Translations version names are `h2` (no `h1→h3` skip); the brand link no
  longer claims `aria-current` (only the Today tab does); About's copy says "Catechism" to match
  the Reader.

### Fixed

- Adversarial-review fixes: a target (`?v=`/`#hash`) now owns its scroll on Back/Forward (no
  fight with the verse-focus glide); the restore loop stops when you scroll or the page settles
  (no jank, no spin on short pages); the route-change focus no longer steals focus from an
  autofocused box or an in-place filter/day-step; the Search filter chip no longer jumps to the
  top; the offset map is bounded for the long-lived native shell; and the section-bar offset was
  corrected to the real header height (browser-measured) so jumped-to headings aren't clipped.

### Notes

- New dependency: `@capacitor/app@^8` (native back-button handling; native-guarded, a no-op on web).
- Deferred (recorded in the spec): scroll-spy "current section" highlight; padding the Reader when
  the verse-action bar is open; a sticky "Start" in the plan creator; encoding the Reader's selected
  verse in the URL. `npm test` and `npm run build` are green.

## [1.11.0] — 2026-06-17 — the proper of the day

The Daily Readings default to the **NABRE** — the translation of the U.S. lectionary — when the
calendar region is the United States, so the in-app readings match what is proclaimed at Mass in
the USA. The legal posture is unchanged: the NABRE is © Confraternity of Christian Doctrine and is
**never bundled**; this release builds only the *mechanism* that prefers it, and the user imports
their own licensed copy on the existing (on-device) Translations import.

### Added

- **A Mass-readings translation preference.** `massTranslationFor()` (`src/lib/storage.ts`, pure
  and tested) resolves the readings translation: an explicit choice wins, otherwise the NABRE for
  the USA region and the general reading translation elsewhere. New `massTranslation` setting
  (default "" = auto; merge-safe).
- **Settings → Calendar → Mass readings**: a select to pin the default (Match region / DRB / CPDV /
  Vulgate / NABRE / RSV-2CE).
- **A discreet USCCB link** to the official U.S. daily readings in the Readings footer.

### Changed

- **The Daily Readings screen defaults to the Mass translation** (NABRE for the USA region) and its
  toolbar now lists bundled + imported translations, plus NABRE with an "(import)" hint when it
  hasn't been imported yet. Swaps are per-visit.

### Fixed

- **Graceful fallback** when an import-only translation (e.g. NABRE) is the preference but hasn't
  been imported: the reading renders the bundled **Douay-Rheims** so it stays readable offline, with
  a one-line pointer to import the licensed copy; the citation link and `lang` follow the text shown
  (previously a non-imported translation surfaced a bare "not bundled" error).

### Notes

- No NABRE (or any copyrighted) text is committed. The import flow stores a user's own licensed copy
  in the browser (IndexedDB) only. `test-data.ts` §20 covers the preference logic; `npm test` and
  `npm run build` are green.

## [1.10.0] — 2026-06-17 — made plain

An iOS crispness pass: the app now sits correctly in the iPhone's frame and feels native to
the touch — safe-area edges, tap feedback, comfortable targets, legible gold — without changing
the devotional identity. "Write the vision, and make it plain upon tables, that he may run that
readeth it" (Habakkuk 2:2). Driven by a six-dimension iOS audit and an adversarial review,
filtered through the two-accent rule and the §13 refusals.

### Added

- **CCC citations are discoverable before you tap.** A verse cited in the Catechism now wears a
  quiet purple underline beneath its verse number — the universal link affordance, in a new
  **fixed** `--ccc-mark` brand purple that never follows the liturgical accent (so it can never
  turn gold and collide with the gold Haydock commentary dot). Driven by the tested `isCited()`
  (`src/lib/ccc.ts`; `scripts/test-data.ts` §19), shown whenever CCC links are enabled. The
  action-bar row is relabeled **Catechism** (was "CCC").
- **A `--gold-text` token** for gold used as running text — the small-caps section labels, the
  Father attributions, the motto: `#8A6D1F` in Day (≈4.6:1, clears WCAG AA), while the gold
  **marks** (the ✠, the verse/quote-of-the-day quote marks, the selected-verse rule, the
  note/bookmark marks, the commentary dot) keep the exact luminous `#A8862C`. Night gold already
  clears AA, so `--gold-text` equals `--gold` there. The white/rose liturgical link-accents are
  deepened for AA in Day too.
- **Native status bar** (`@capacitor/status-bar`): on iOS the clock/battery glyphs now follow the
  theme — light on the Night field, dark on Day (iOS ignores the `theme-color` meta). `App.tsx`,
  native-guarded, no-op on the web.
- **A device-pixel hairline** (`--hairline`; 0.5px on Retina): structural separators are a crisp
  single device-pixel line on @2x/@3x iPhones instead of the soft 2–3px line a CSS 1px paints.
- **The iOS sheet idiom**: a grabber handle on the bottom sheet (phones), momentum scrolling, and
  scroll containment so a flick can't chain to the page behind.

### Changed

- **On a phone, Today leads with "Today in the Church"** (liturgical season + today's Mass
  readings) right under the date; Verse and Quote of the Day follow. Still exactly five cards.
- **The Scripture size presets render in `rem`** so the reading text scales with the iOS
  text-size / browser-zoom setting instead of being pinned to device pixels.
- **The deep-linked (`?v=`) verse** lands with a smooth (reduced-motion-safe) scroll and a
  transient gold wash, reading as a scripture-focus rather than a selection.

### Fixed (iOS)

- **Safe areas now actually apply.** Added `viewport-fit=cover` — without it every
  `env(safe-area-inset-*)` resolved to 0, so the tab bar, verse-action bar, sheets, and footer
  never cleared the notch / home indicator. Paired with a top inset on the header, left/right
  insets on the tab bar and page gutters, and `ios.contentInset: "never"` so the CSS insets are
  the single source of truth (no doubled inset).
- **Native touch feel.** Removed the grey iOS tap-flash (`-webkit-tap-highlight-color`), added
  `touch-action: manipulation` (no ~300ms delay), real `:active` press feedback + a 0.98
  press-scale, and guarded `:hover` behind `@media (hover: hover)` so a tint can't stick after a tap.
- **Comfortable 44pt targets**: the verse-action buttons, the Catechism ¶ links, the highlight
  swatches (hit area expanded without enlarging the swatch or overlapping its neighbours), and the
  A−/A+ steppers.
- **Dynamic Type & layout**: `dvh` for the app shell and sheets (no clipping behind iOS chrome),
  `-webkit-text-size-adjust: 100%`, tabular verse numbers (no margin shimmer), the note textarea at
  16px (no focus auto-zoom), and the two devotional list line-heights raised to the 1.5 body floor.
- **Sheets** pin the body with `position: fixed` so the page behind can't rubber-band on iOS
  (restored on close).

### Notes

- The gold-contrast change revisits the documented "keep the luminous gold" tradeoff for outdoor
  iPhone legibility, by **splitting mark-gold from text-gold** rather than darkening the brand hex —
  an explicit owner decision. Accent-hex and prayers-label test assertions were updated for the split.
- After `npx cap sync ios`, verify the safe-area insets and the Night status bar on a notched
  simulator. The remaining iOS roadmap is the WidgetKit / App-Intents Xcode session (docs/IOS.md §5).
- `npm test` (harness + manifest) and `npm run build` are green.

## [1.9.0] — 2026-06-16 — the deposit

Design-spec §5 — the CCC citation index ("Scripture-to-Magisterium" links). Where the
Catechism cites a verse, the verse actions show a quiet purple `CCC ¶…` row linking to
that paragraph on vatican.va. "Guard the good deposit" (2 Timothy 1:14). **Facts only:**
the citation numbers and the public URLs ship; the Catechism text is never bundled.

### Added

- **The CCC citation index** (`public/data/ccc/index.json`, sealed in the manifest):
  4,613 verse keys → CCC paragraph numbers, parsed from the USCCB 2nd-Ed *Index of
  Citations* (`scripts/build-ccc.mjs`). Psalms are mapped from the Catechism's Hebrew
  numbering to the bundle's Vulgate numbering with the existing tested `hebrewSpanToVulgate()`
  (so the CCC's "Ps 22:1" keys to `psalms 21:2`). Verse ranges expand to each verse;
  unmappable citations (a handful of NAB-vs-Douay versification differences) are dropped, not
  mis-pointed.
- **¶ → vatican.va URLs** (`public/data/ccc/url.json`, `scripts/build-ccc-urls.mjs`): every
  cited paragraph (1,258 of them) resolved to its official ENG0015 page; all `https://www.vatican.va/…`.
- **Reader CCC row** (`src/lib/ccc.ts` — pure, tested): below the Commentary action, a
  `CCC ¶219 · ¶444 · …` row when the verse is cited and the setting is on. Links are
  **purple** (interaction), the "CCC" label muted — no gold, no page dot (two-accent rule).
  A `+N more` expander past the first eight. Loaded lazily and memoized like the commentary.
- **A new "Magisterium" Settings section** with `cccLinksEnabled` (default on; merge-safe in
  `storage.ts`). Off ⇒ no CCC row anywhere.

### Notes

- The PDF and vatican.va are **input and verification only** — neither the Catechism text nor
  any scraped prose is committed. `npm run ccc` regenerates the facts from a local Catechism
  PDF (`CCC_PDF=…`) + the Vatican crawl, then re-seals the manifest.
- `scripts/test-data.ts` §19 asserts the index shape, that every key resolves to a real verse
  (0 danglers), the Hebrew→Vulgate Psalm mapping (Heb 22:1 → `psalms 21:2`, ¶603), pinned
  famous anchors (john 3:16 ⊇ 219/444/458; genesis 1:1 ⊇ 268/279/290; matthew 16:18 ⊇
  552/881), full URL coverage, and the manifest seal. Anchors were verified directly against
  the PDF (genesis 1:1 and john 1:1 match exactly, incl. range-anchored paragraphs).
- `npm test` and `npm run build` green. The CCC row is a DOM surface, browser-verified.

## [1.8.4] — 2026-06-16 — the doorposts

Design-spec §9 (iOS/Android depth), the buildable half: a pre-resolved widget data
pipeline and two new **Android** home-screen widgets beside the Verse-of-the-Day one.
The iOS WidgetKit counterparts + App Intents + Dynamic Type are specified for an Xcode
session (they cannot be scripted from the repo). "Write them on the doorposts of your
house" (Deut 6:9).

### Added

- **`scripts/build-calendar-widget.ts`** (`npm run calendar-widget`, also `npm run
  widgets`): pre-resolves a rolling ~2-year window of the liturgical day — season/color,
  the Mass-reading citations, and the Quote of the Day — to `calendar.json` for both
  native bundles, from the *same* `resolveReadings()` / `liturgicalDay()` /
  `quoteOfTheDay()` the web app uses. No engine is ported; the widget keys by local ISO
  date. (730 days; falls back calmly past the window.)
- **Android "Today at Mass" widget** (`CalendarWidget`): the day's liturgical title and
  Mass-reading citations.
- **Android "Quote of the Day" widget** (`QuoteWidget`): the day's saying from the
  Fathers, Doctors, and saints.
- Both follow the v1.7.0 "lampstand" pattern — RemoteViews, the gold cross drawn natively
  (§1.5, never an emoji), the day-theme color tokens, an inexact local-midnight
  `AlarmManager`, tap-opens-the-app, fully offline — and are wired entirely in the
  committed project (`AndroidManifest.xml` receivers + `res/` resources), no IDE step.

### Docs

- **`docs/IOS.md` §5**: the runbook for the iOS Mass & Quote WidgetKit widgets, the
  "What's today's Gospel?" App Intent (Siri/Shortcuts), and Dynamic Type — all reading the
  same pre-resolved `calendar.json`, to wire in Xcode.

### Notes

- `npm test` and `npm run build` (incl. `tsc` over the new script) are green; the native
  widget code mirrors the verified VOTD widget and is device-verified. Regenerate the
  widget data after any calendar/lectionary/quote change with `npm run calendar-widget`
  (it depends on the build year's window).

## [1.8.3] — 2026-06-16 — the cloud of witnesses

Closes the design-spec §3.4 verification ledger: every Quote-of-the-Day entry is now
checked against an accessible public-domain source. The 47 launch quotes were flagged
`verified: false` since 1.2.0; all 47 are now `verified: true`.

### Changed — quote corpus (spec §3.4)

- **All 47 quotes verified against their public-domain sources.** 26 were confirmed
  verbatim; 15 had their wording or edition corrected to match the cited public-domain
  text (e.g. Augustine's *Confessions* to Pusey's actual rendering, Aquinas/Chrysostom/
  à Kempis/Ambrose/Damascene to the NPNF text, the Suscipe to Mullan's 1914 translation);
  and 6 whose cited editions did not actually exist in the public domain (Augustine
  *Sermons 256* & *293*, Basil's social homily, Leo *Sermon 39*, Bernard *Advent 5*,
  Bonaventure *Itinerarium*) were replaced with public-domain-verifiable passages by the
  same authors, fitting the same feast/season slots — or, for Bonaventure, the same
  passage in Thomas Davidson's genuinely public-domain 1887 translation.
- False public-domain-edition claims were corrected (several Fathers' works are **not** in
  NPNF/ANF; those now cite the Latin PL or the correct public-domain edition).

### Fixed

- **About** now states plainly that every quotation has been checked against its
  public-domain source (closing the §11 trust-surface residual), rather than describing
  the corpus as still being verified.

### Notes

- `npm run quotes` regenerated `public/data/quotes.json` and re-sealed the manifest; the
  corpus↔emitted sync, schema, red-list, seasonal-pool, and determinism checks in
  `npm test` all pass, and `npm run build` is green. Verification was done by reading the
  public-domain sources directly (CCEL, New Advent, Project Gutenberg, the Internet
  Archive); no aggregator sites were trusted as evidence.

## [1.8.2] — 2026-06-16 — every tongue

Continues the accessibility work of "the open door": Latin Scripture now carries
`lang="la"`, so screen readers stop applying English phonetics to the Vulgate.

### Fixed — accessibility

- **`lang="la"` on every Latin text node**: the Reader's verse column (and the Latin
  side of the parallel view), the daily-Mass reading bodies, the Verse-of-the-Day and
  Quote passages, the rosary mystery passages, the Marian antiphon's Latin lines, the
  five rosary prayers' Latin, and the Vulgate chapter title. A screen reader now
  pronounces the Clementine Vulgate as Latin instead of mis-reading it as English.

### Notes

- No visual change; `npm test` (incl. eslint + manifest verify) and `npm run build`
  stay green. A DOM/screen-reader surface, verified like the rest of the a11y layer.

## [1.8.1] — 2026-06-16 — the open door

A quality pass that finishes the design language already in place — "close the quiet
loops." The headline is accessibility: every action the mouse can reach is now reachable
by keyboard and screen reader. Plus two touch-first reader/search refinements and the
commentary offline-download. No new visual language; everything routes through the existing
day/night tokens, the §1.5 icon set, and the two-accent rule.

### Added

- **Search filter chips** (spec §8.2): Old Testament / New Testament / Gospels chips with
  live per-section counts over the result set; the active chip (purple) filters the list.
  Pure book-group membership lives in `src/lib/search.ts`, asserted in the harness (§18).
- **Chapter tap-grid** (spec §8.1): the chapter number in the Reader title opens a numbered
  grid via the `Sheet` primitive — faster on touch than the dropdown (which stays). The
  current chapter is marked gold; cells act purple on hover/focus.
- **Commentary offline download** (Settings → Data): a Commentary row (Haydock whole-canon
  + Catena on the Gospels) saves for offline reading, reusing the existing `downloadBundle`
  over the manifest's `commentary/` bundle.
- Three new `Icon` marks (`copy`, `download`, `upload`) so Copy and Export/Import stop
  borrowing the share glyph and join the §1.5 icon grammar.

### Fixed — accessibility

- **Verses are keyboard- and screen-reader-operable**: the verse spans gained
  `role="button"`, `tabIndex`, `aria-pressed`, and Enter/Space handling — the whole
  marginalia layer (bookmark/highlight/note/copy/share/commentary) was mouse-only.
- **The Bible-version radiogroup** gains ARIA-APG roving-tabindex arrow-key navigation
  (only the checked card is tabbable; arrows move selection + focus, wrapping).
- **The active highlight swatch** now shows a gold-ring selected state plus hover/focus and
  `aria-pressed`, so it's clear which color a verse carries.
- A **deep-linked verse** (`?v=`) gets a transient (~3s) gold rule instead of staying
  permanently selected and popping the action bar (spec §8.1); reduced-motion-safe.

### Changed — quiet quality

- Today-card loading uses a dignified italic line instead of a bare ellipsis.
- The **Search** button is disabled below two characters — no more silent dead-click.
- The **Readings** null-state reads in the app's calm voice with a real reader link
  (was developer-voice "this should not happen").
- Dropped the lone dove emoji from the antiphon summary (§1.5 monochrome discipline).
- The reader toolbar compacts on phones so it stops crowding the sacred text.
- The cold `rgba(0,0,0)` switch-knob and tab-bar shadows now route through warm
  `--shadow-soft` / `--shadow-tabbar` tokens; stray inline magic numbers folded into named
  classes (the §1.1 "no raw values outside the token block" rule).
- A single ~110ms Sheet entrance, fully neutralized by `prefers-reduced-motion`.

### Notes

- Housekeeping rode in: the README version badge, the 1.2.1 CHANGELOG date, the B.x wording,
  a dev-tag-collision note on the 1.3.0 entry, and the §5 CCC spec/runbook test-numbering
  (`§17` → `§18`, since `§17` already exists in `scripts/test-data.ts`).
- The DOM/canvas surfaces (chips, chapter grid, verse focus) are browser-verified like the
  share card and the gold dot; the pure search helpers are node-tested (§18). `npm test`
  (incl. the emoji guard and manifest verify) and `npm run build` stay green.
- Deferred: per-Father "by era" filtering, and the optional single daily-readings notification
  (still off — no notification pressure). (The Vulgate-Psalm commentary-dot mapping listed here
  in earlier drafts turned out to be already implemented in v1.5.0 — see that release's note.)

## [1.8.0] — 2026-06-16 — the sower

> *"Semen est verbum Dei."* — "The seed is the word of God." (Luke 8:11)

The share card (design spec §8.3) — the evangelization vector. Any verse, or the
Quote of the Day, renders to a 1080×1350 image: a warm-gray field, the text in EB
Garamond, the gold cross and a small "FIDELIS" wordmark, and the citation with its
translation abbreviation. Two styles only, Day and Night. The native share sheet
carries it out (the Web Share API, with a plain image download where sharing files
isn't supported). No imagery, no red-letter — typography on a field (standing rule
3 / §13). Scripture goes out; nothing comes back.

### Added

- **The share card.** A **Share** action on the Reader's verse bar, and a **Share**
  affordance on the Today page's Verse of the Day and Quote of the Day cards, open a
  sheet with a live preview, a Day/Night toggle, and share / save-image actions. The
  card is drawn on a `<canvas>` by `src/lib/shareCard.ts` (pure over its inputs and
  the bundled font); the sheet is `src/components/ShareSheet.tsx`, on the existing
  `Sheet` primitive.
- **The two-accent rule holds on the card.** Gold honors (the cross, the wordmark,
  the citation); the ink carries the text; nothing is purple, because nothing on the
  card is interactive. The cross is the §1.5 mark, drawn natively on the canvas —
  never an emoji.

### Notes

- The card is a visual surface — like the §4.2 commentary dot, it is verified in a
  real browser rather than the node harness; the liturgical engines and the bundled
  texts are unchanged.

## [1.7.0] — 2026-06-15 — the lampstand

> *"Neither do men light a candle and put it under a bushel, but upon a candlestick, that it may shine to all that are in the house."* (Matthew 5:15)

The Android **Verse of the Day home-screen widget** — the native counterpart of the iOS
WidgetKit widget, and the tracked follow-up from 1.6.0. The day's verse now shines on the
Android home screen, offline, agreeing exactly with the app and the iOS widget.

### Added

- **Android Verse-of-the-Day App Widget.** A native widget (`VotdWidget`, RemoteViews +
  resources under `android/app/src/main/res/`) reads the pre-resolved `res/raw/votd.json`
  and selects the day's verse with the same formula as the web app and the iOS widget —
  `index = (dayOfYear + year) mod count`, Gregorian, device time zone — so the three never
  disagree. It draws the gold cross natively (the §1.5 icon, never an emoji), matches the
  day-theme tokens (`--bg-0` / `--text` / `--text-muted` / `--gold`), refreshes at local
  midnight via an inexact `AlarmManager`, opens the app when tapped, and is fully offline.
  Unlike the iOS widget (which needs an Xcode target created by hand), this is wired
  entirely in the committed project — a receiver + resources in `AndroidManifest.xml`.
- `scripts/build-votd-widget.mjs` now emits the cycle to **both** native widgets
  (`ios/WidgetExtension/votd.json` and `android/app/src/main/res/raw/votd.json`).

### Docs

- The **§5 (CCC citation index) design spec** and a **local-build runbook** (a paste-and-run
  prompt + commands) under `docs/superpowers/specs/`. The spec is signed off; the build runs
  locally, where the Catechism PDF is readable and vatican.va is reachable (the cloud sandbox
  403-blocks both). §5 ships as a later release ("the deposit").
- `docs/IOS.md` gains a step-by-step **"Run it in the Simulator"** section (GUI + terminal
  routes); the iOS pipeline was re-verified (`npm run build && npx cap sync ios` clean,
  iOS 15.0+, Swift Package Manager).

## [1.6.0] — 2026-06-15 — freely given

> *"Gratis accepistis, gratis date."* — "Freely you have received; freely give." (Matthew 10:8)

A distribution release: Fidelis gains a native **Android** shell beside the iOS
one, and the app's oldest promise — that it costs nothing and never will — is
made explicit. No Scripture, liturgy, or app behavior changed; the web bundle is
byte-identical to 1.5.1.

### Added

- **Android (Capacitor).** A native Android shell (`android/`, scaffolded by
  `npx cap add android`) runs the same web build, offline by construction — the
  whole `dist/` ships inside the APK, exactly as on iOS, so no service worker is
  needed in the WebView. Application id `app.fidelis.bible`; the background uses
  the day `--bg-0` token. Build with
  `npm run build && npx cap sync android && npx cap open android`; full guide in
  [docs/ANDROID.md](docs/ANDROID.md). The committed `android/` mirrors the iOS
  convention: the Gradle project and resources are tracked; the synced web assets
  (`app/src/main/assets/public`) and the build output are gitignored.
- **The free pledge, in writing.** The README now states plainly that Fidelis is
  **free, forever** — no price, no ads, no in-app purchases, no subscription — in
  the masthead, a badge, the Highlights, and the refusal list, beside the existing
  no-accounts / no-tracking / no-data stance.

### Notes

- The native **home-screen widget remains iOS-only** (WidgetKit); a native Android
  App Widget is a tracked follow-up (the offline `votd.json` it would read already
  exists, so it would reuse the data rather than port the selection math).
- `@capacitor/android` was added at `^8.4.0`, matching the existing Capacitor
  packages.

## [1.5.1] — 2026-06-15 — the kept promise

A review-driven hardening pass over the whole project: the texts a reader
downloaded for offline use are kept across updates, a Father is attributed
rightly, and the codebase gains the linter it never had. No new features — every
change makes an existing promise more trustworthy.

### Fixed

- **Offline downloads survive a data-cache bump** (service worker): the v1→v2
  `DATA_CACHE` bump in 1.5.0 deleted every translation a user had downloaded for
  offline reading (Settings → Data). The activate handler now migrates a prior
  data cache forward before its stale-cache sweep, and `manifest.json` is served
  network-first, so a re-seal lands without a destructive bump. Web/PWA only; iOS
  was never affected (no service worker in the Capacitor webview).
- **Ambrosiaster is no longer mistaken for St. Ambrose** (commentary): the
  anonymous 4th-century Pauline commentator was bucketed under Ambrose — and
  flagged a Doctor of the Church — on six Matthew verses, because the matcher's
  prefix rule absorbed it via the "ambros" alias. He is now a distinct,
  non-Doctor Father; labels the Catena attributes to Ambrose proper are
  unchanged. Asserted in the harness (§16).
- **The Search reference parser resolves its own documented example**:
  "Apocalypsis 21,4" (the Latin title of Revelation) now jumps to the passage
  instead of returning nothing.

### Added

- **A linter** (the first one): ESLint 9 + typescript-eslint, type-aware and
  scoped to `src/`, enforcing what `tsc` cannot — React-hooks dependency
  correctness and no floating promises. `npm run lint`, folded into `npm test`
  and run in CI. It immediately surfaced ten unhandled promises (mostly
  react-router 7's now-promise-returning `navigate`), all fixed.
- **A reduced-motion guard**: the few remaining CSS transitions are neutralized
  under `prefers-reduced-motion: reduce`, so the app's no-motion ethos is
  enforced rather than incidental.
- **Harness coverage** for the reference parser, the canon/translation display
  helpers, the First Sunday of Advent (a trap-year table), and the Catena
  segment separator — closing the gaps the review found.

### Changed

- The iOS webview background and the Verse-of-the-Day widget's colors are aligned
  to the exact day-theme tokens (`--bg-0`, `--text`, `--gold`, and `--text-muted`
  for the citation), so the native surfaces match the app and stay inside the
  two-accent rule.
- Removed two unused (phantom) dependencies, `present` and `scripts`.
- Documentation: the README version/React badges and the Settings inventory are
  current; comments in `votd.ts` / `lectionary.ts` flag the Vulgate-vs-modern
  Psalm-numbering divergence so the two subsystems can't be conflated.

## [1.5.0] — 2026-06-15 — formation

The commentary layer — design-spec §4. Two public-domain monuments, **Haydock** (the
annotated Douay, the whole canon) and the **Catena Aurea** (St. Thomas Aquinas's chain
of the Fathers on the four Gospels, the Newman edition), built into the app beside the
sacred text — Catholic formation without a server, an account, or a word of machine
paraphrase. Scripture stays Scripture; study is one tap away.

### Added

- **The commentary data pipeline** (§4.1): `scripts/build-haydock.mjs` and
  `scripts/build-catena.mjs` parse the pinned upstream sources into per-book JSON under
  `public/data/commentary/{haydock,catena}/` — Haydock keyed `"ch:v"` → `{src,text}`
  across all 73 books; the Catena keyed `"ch:v"` → `{father,text}` for Matthew, Mark,
  Luke, and John. Both upstreams are fetched at commits pinned by hash and sealed into
  the SHA-256 manifest, exactly like the Scripture corpus; the harness pins key
  coordinates and five incipits per source against the page-scan-backed text.
- **The gold dot** (§4.2): in the Reader, a verse that carries a Haydock note gains one
  small gold dot after its number — the entire footprint on the sacred page. It is drawn
  absolutely inside the verse number's own margin, so it never moves a letter of
  Scripture, even as it arrives after the commentary loads (zero layout shift, verified
  in a real browser). A Settings switch turns the dots off for the bare page.
- **The commentary sheet** (§4.2): a verse's new **Commentary** action opens a study
  surface — a bottom sheet on phones, a right-docked side panel on desktop — with
  **Haydock** and **Catena Aurea** tabs. It reuses the §6 `Sheet` primitive, so it traps
  focus and returns it, dims a scrim, dismisses on Escape / backdrop / ✕, and never
  animates. The Catena tab carries per-Father **filter chips** and a **Doctors of the
  Church only** toggle — filter by Chrysostom, by Augustine, by the Doctors. No inline
  interleaving: the page is never doubled, the reading rhythm never broken.
- **The Father normaliser** (`src/lib/commentary.ts`, pure and asserted): the Catena's
  1,198 distinct attribution labels — clean names, citation forms ("Chrys., Hom. in
  Matt., 56"), transcription typos ("Theophyact", "Origin", "Psuedo-"), the Glossa, and
  the source's "It goes on" connectives — are canonicalised into clean per-Father chips,
  the connectives folded back into the Father they belong to. 93.9% of the corpus
  resolves to a named Father; a corpus-wide harness guard proves no real Father hides in
  the small "source" remainder (the Glossa Ordinaria, an anonymous Greek expositor, two
  councils, Josephus). The Doctors-only filter rests on a curated Doctors set with the
  identity calls the Gospel Catena demands: bare "Gregory" is Gregory the Great;
  "Isidore" is Isidore of Pelusium, **not** the Doctor of Seville; "Dion. alex" is
  Dionysius of Alexandria, **not** the Areopagite; every Pseudo-* stays distinct; and
  John Henry Newman — who edited this Catena — is named among the Doctors.
- **The Commentary settings section** (§2.2 item 7): a master switch (the dots and the
  action, default on), per-source Haydock and Catena switches, and a Doctors-only
  default — the commentary controls the spec asks for.

### Notes

- Commentary loads lazily per book: Haydock (≤1 MB) when the book opens, for the dots;
  the heavier Catena Gospel files only when a sheet first opens — the sacred page never
  waits on it.
- Haydock Psalm keys are remapped onto the bundle's Vulgate grid: `remapPsalmKey` in
  `build-haydock.mjs` routes the renumbered second-halves (Ps 115/147) through
  `hebrewSpanToVulgate`, the joined psalms (9/113) already align, and the title-offset cases
  hold (verified incl. the Miserere). Asserted in `test-data.ts` §15; the gold dots land on
  the right verse.

## [1.4.0] — 2026-06-14 — the daily soul

Design-spec §6 (card 4), §6.1, and §7 in one release: the app grows a quiet devotional life
around the text without ever raising its voice. Three work items (B1–B3); no streaks, no
badges, no reminders, no notification pressure — every acknowledgment is the Church's, not
ours.

### Added

- **The rosary mystery sheet** (B1, §6 card 4): each of the day's five mysteries is tappable,
  opening a reusable bottom-sheet (`Sheet`) over a dimmed backdrop — Escape, tap-outside, or
  close to dismiss, with focus managed and returned. The mystery's Scripture passage renders
  verbatim from the current translation through the new shared `passageText` helper — the same
  verse-range path the Reader uses, asserted per mystery × DRC/CPDV/Vulgate so the two can
  never disagree — and beneath it, collapsed, the five traditional prayers in Latin and English
  (`src/lib/prayers.ts`): Pater Noster, Ave Maria, Gloria Patri, the Fatima Prayer, the Salve
  Regina. The twenty mysteries now carry fuller meditation passages (the Annunciation,
  Luke 1:26–38; the Visitation with the Magnificat, Luke 1:39–56) rather than a single anchor
  verse. No audio, no beads, no motion — a prayer book.
- **The reading-time indulgence** (B2, §6.1): while you read in the Reader, continuous reading
  time accumulates (Page Visibility API; paused when the tab is hidden; the continuity clock
  resets after a ten-minute gap; the daily total in localStorage resets at local midnight). At
  half an hour, one small gold line appears beneath the chapter title — *"You have read for half
  an hour. The Church grants a plenary indulgence for this, under the usual conditions (Ench.
  Ind., conc. 30)."* — sticky until midnight; tapping it opens a sheet with the usual conditions.
  The accumulator (`src/lib/reading.ts`) is a pure, injected-time reducer reusing
  `votd.dayOfYear` for DST-safe rollover, harness-tested for the gap reset and the midnight
  rollover. A setting (`showIndulgence`, default on) hides it entirely.
- **Reading plans, citation-only** (B3, §7): a plan is a list of chapter references and a
  divisor, nothing more (`src/lib/plans.ts`, pure citation arithmetic over the real canon
  counts). Five presets — The Four Gospels in 90 Days, The Deuterocanon in 30 Days, The Psalter
  in a Month, The New Testament in a Year, and The Whole Canon in a Year (weighted, the Psalter
  woven through the year so Psalm 118 never shares a day with another long chapter). A
  one-screen creator (`/plans/new`: grouped book checkboxes, pace by chapters-per-day or a
  target date, a name) and a management page (`/plans`), reached from Read. Surfaces: one line
  in Continue Reading and a "Mark today's portion read" action at the chapter's end. "Day N" is
  a portion index, not a calendar streak.

### Changed

- `VerseQuote` renders through the shared `passageText` helper (no behavior change).
- The Today page still holds exactly five cards; the new surfaces are overlays and inline
  lines, never a sixth card.

### Deferred

- The single **optional daily-readings notification** (§6/§7) stays deferred and off —
  standing rule: no notification pressure.
- The Settings **Commentaries** subsection and the **§4 commentary layer** remain on the
  roadmap; the new `Sheet` primitive is built to host them. Editing a plan's books after
  creation is delete-and-recreate; the six Vulgate-appendix books stay outside the canon
  presets.

## [1.3.0] — 2026-06-14 — the identity release

Design-spec §1–§2: Fidelis takes on its visual identity and its navigation in one
release. The app already knew the day's liturgical color; now it wears it. Scripture
reads in a bundled printed-Bible face, the chrome speaks in two accents and one
hand-drawn icon set, the seven-link header becomes a five-tab bar, and every control
gathers into a single live Settings screen. Six work items (A1–A6); the Word is still
never printed in red.

> Historical note: while this work was in progress its six items were tagged in
> per-step increments (dev tags v1.4.0–v1.7.0); those tags were superseded by this
> single consolidated v1.3.0 release. The v1.4.0–v1.8.0 entries below are entirely
> unrelated, later shipped releases that reused those numbers.

### Added

- **The token system and the two-accent rule** (A1, §1.1–§1.2): every paint color now
  lives in the day/night token blocks in `src/styles.css` — nothing outside them
  carries a raw hex, and no element wears both accents. **Purple acts** (interaction);
  **gold honors** (the ✠, the wordmark, a bookmarked or annotated verse). The legacy
  `parchment` theme value migrates to `day` on load.
- **Follow the liturgical year** (A2, §1.3): a setting, default on, that tints the
  *act* accent (`--purple`) with the governing day's liturgical color. `accentFor()`
  in `src/lib/liturgical.ts` — pure and total — resolves the color; `App.tsx` writes
  it to `<html data-accent>`; CSS remaps `--purple` to the §1.3 hex pair for each
  color, a day-default rule plus a night override. White borrows the gold token —
  *gold stands for white* — so the great white feasts read in gold (rose on Gaudete
  and Laetare). The *honors* accent (`--gold`) and `--purple-strong` never move, so
  the two-accent grammar and the gold masthead are untouched. Gaudete 2026-12-13 →
  rose, Easter 2026-04-05 → gold-for-white, and the setting off → brand purple
  year-round are asserted in the engine harness, and the §1.3 hex table is checked
  against `src/styles.css` itself.
- **EB Garamond, bundled** (A3, §1.4, SIL OFL 1.1): four woff2 files (`latin` +
  `latin-ext`, regular + italic, weight 400), ≈144 KB under `src/fonts/` with their
  `OFL.txt` and a pinned-tarball provenance note — it renders the Vulgate's æ and œ
  ligatures the way the printed Douay does. `scriptureFont` ∈ `garamond | serif |
  sans` (default Garamond) drives a `--scripture` token via `<html data-font>` and
  applies to every Scripture surface (Reader, Mass readings, Verse of the Day). Four
  honest size presets — Small 17 · Medium 19 · Large 22 · X-Large 25 — with the
  Reader's A−/A+ stepper retained as a fine adjustment writing the same `fontSize`.
  The face/size vocabulary lives in `src/lib/typography.ts`; the harness asserts the
  woff2 signatures, the committed OFL, the `@font-face` wiring with both subsets'
  ranges and `swap`, the presets, and the Garamond-at-19 defaults.
- **A hand-drawn SVG icon set** (A4, §1.5): `src/components/Icon.tsx`, a six-piece set
  — bookmark, note, share, commentary, sun/moon, cross — drawn in a single 1.6 stroke
  weight on a 24×24 grid. Every icon strokes in `currentColor`, so the two-accent rule
  colors it for free: gold where it honors or marks state, the neutral color where it
  acts. It replaces the emoji glyphs across the interactive UI; the native iOS widget
  draws the cross as a SwiftUI `Path` tracing the same geometry, so the mark matches
  web and native. The harness forbids any rendered in-scope emoji in `.tsx`.
- **Five-tab navigation** (A5, §2.1): `src/components/TabBar.tsx` — Today · Read ·
  Search · Mass · More — rendering as the header row on wide viewports and a
  thumb-friendly bottom bar pinned to the bottom edge on phones (≥44px targets,
  honoring `env(safe-area-inset-bottom)`). **More** is a dismissable popover over the
  four secondary destinations (Library, Translations, Settings, About), **not a
  route**, with a correct disclosure contract (`aria-expanded`, `aria-controls` only
  while mounted, outside-click / Escape dismissal that returns focus to the trigger).
  The URL space is untouched.
- **The one Settings screen** (A6, §2.2): a single live `SettingsContext`
  (`src/SettingsContext.tsx`) replaces the scattered snapshot reads of `getSettings()`
  — `useSettings()` subscribes and `update()` persists and re-renders every consumer
  (the non-React engines keep reading `getSettings()` lazily; `update()` writes
  localStorage synchronously, so the next render sees the new value).
  `src/pages/Settings.tsx` pins a **live Scripture preview** (Genesis 1:1–2 in the
  current translation, font, and size, re-rendering as any control below is touched)
  above Bible-version cards (RSV-2CE / NABRE shown locked with an import link),
  text-size pills, font pills (each in its own face), **Appearance** (System / Day /
  Night + the follow-the-year switch and its one-line catechesis), **Calendar** region
  (moved here from the Readings toolbar), and **Data** (per-translation offline
  download with real sizes, marginalia export/import, and the manifest integrity line
  linking to About).
- **System theme** (§2.2, `src/lib/theme.ts`): theme is System / Day / Night, with a
  pure `resolveTheme()` (asserted in the harness) and a `prefers-color-scheme` listener
  so "System" tracks the OS live. A pre-paint boot script in `index.html` resolves the
  theme and face before the stylesheet paints, so a Night/System user never flashes
  Day. New installs default to **System**.
- **Real offline-download sizes**: `build-manifest.mjs` seals a per-bundle `{ files,
  bytes }` map (DRB 4.5 MB · CPDV 4.8 MB · VUL 4.0 MB) from the same file walk that
  hashes the corpus — never hand-entered — and `--verify` checks it. `downloadBundle()`
  warms the service-worker data cache and only earns a "Saved ✓" when every file
  actually fetched `res.ok`.

### Changed

- **The header folds to brand + five tabs** (`src/components/Header.tsx`): the inline
  seven-link nav and the day/night + liturgical-year control cluster are gone — the
  toggles now live in Settings (reachable via More → Settings).
- **Reader, Readings, Home, BookList, Search, Library** read settings live from the
  context; the Reader's A−/A+ stepper and the size pills write the same `fontSize`
  source of truth. The Readings toolbar loses its region select (now in Settings) and
  reads the region live. App is the single writer of `<html data-theme>`.
- **The service worker shell cache advances to `v3` and is font-aware**: fonts are
  referenced from CSS `url()` rather than `index.html`, so the all-or-nothing precache
  pulls the fonts each stylesheet names and the stale-asset purge keeps them — offline
  reading holds the chosen face instead of falling back to the system serif (preserves
  review P2-3).

### Kept refused

- **Red-letter text** (§1.4, §13.7): only weight-400 faces are bundled and no per-word
  color is set on Scripture, asserted in the harness.

### Fixed

- The embeddable Verse-of-the-Day widget honors `?theme=night` again: App is the single
  writer of `<html data-theme>` and applies the widget's own param (default day), so its
  palette is self-contained and no longer clobbered by the app's theme effect or leaked
  from the visitor's saved settings.
- The liturgical accent tint re-derives the moment the calendar region changes (a
  missing effect dependency had left it stale on region-divergent days).

### Deferred

- Within §2.2, the Settings **Commentaries** subsection waits on the §4 commentary
  layer, and the optional single daily-readings notification (off by default, bounded
  by the no-notification-pressure rule, §13) is not yet built. Design-spec §3–§13 remain
  the open roadmap — §3 (Quote of the Day) and the §6 Today recomposition already
  shipped in 1.2.0.

## [1.2.1] — 2026-06-12 — continuous integration

Closes the last open repair-manual item, §B.3: the harnesses now run in CI, not
just on a developer's machine.

### Added

- **GitHub Actions CI** (§B.3): `.github/workflows/ci.yml` runs `npm ci`, `npm test`,
  and `npm run build` on Node 22 for every push and pull request. One job; the only
  cache is `actions/setup-node`'s built-in npm cache. The harnesses' exit codes fail
  the build, so a silently moved feast, a broken manifest, or a type error is caught
  before it can reach a release — the same `npm test` that gates a local commit now
  gates the remote.

### Changed

- The repair manual (`docs/review/Fidelis_Code_Review_V1_2026-06-11.md`) is now fully
  implemented: every P0/P1/P2 item plus hygiene B.1/B.2/B.3/B.4.

## [1.2.0] — 2026-06-12 — quote of the day

Design-spec §3 and the Today-page recomposition of §6: the daily quote joins the daily
verse, and the page keeps its five-card covenant.

### Added

- **Quote of the Day** (spec §3): a curated corpus of the Fathers, Doctors, and saints —
  public-domain translations only (NPNF/ANF, Pusey, the Dominican Fathers' *Summa*,
  Taylor's *Story of a Soul*, Longfellow's St. Teresa bookmark, and the like), every
  entry carrying its full locus and translation credit. Selection is deterministic and
  liturgically aware (spec §3.2): the feast's own author speaks on their feast when the
  resolved calendar observes it (Augustine on Aug 28), Advent/Christmastide/Lent/
  Eastertide draw from seasonal pools, and ordinary days walk the general cycle with the
  VOTD's index arithmetic. Corpus source: `scripts/quotes.corpus.json`; emitted by
  `npm run quotes` (which re-seals the manifest); red-list authors (spec §3.3) are
  refused at build time. 47 launch entries, each flagged `verified: false` until checked
  against a printed copy per the §3.4 workflow — the harness reports the count both ways.
- **Marian antiphon line** (spec §6): the Today-in-the-Church card carries the hour's
  prayer — the Angelus ordinarily, Regina Caeli in Eastertide — expanding to the full
  text, Latin and English (traditional public-domain versions).
- Nine new data-harness checks: corpus↔emitted sync, schema, red list, seasonal-pool
  coverage, all three resolution tiers, full-year totality, determinism.

### Changed

- **Today page recomposed** (spec §6), still exactly five cards: Verse of the Day ·
  Quote of the Day · **Today in the Church** (the former Liturgical Day and Daily Mass
  Readings cards merged: season + color, cycles, celebrations, reading citations,
  antiphon) · The Holy Rosary · Continue Reading.

### Known issues

- The 47 launch quotes are drafts awaiting verification against printed editions
  (spec §3.4 — "nothing ships unverified" applies to the public release, and the
  verification ledger is honest in the data). §B.3 (CI) remains open.

## [1.1.0] — 2026-06-11 — the repair release

Implements the repair manual's defect list (`docs/review/Fidelis_Code_Review_V1_2026-06-11.md`):
every P0, P1, and P2 item, plus hygiene items B.1, B.2, and B.4 (the committed data
manifest). §B.3 — CI — remains open; see Known issues. Engine and data fixes landed with
harness assertions (UI-only fixes such as P1-8 sit outside the node harnesses' reach), and
adversarial-review findings are recorded in the commit messages.

### Fixed — worship-facing accuracy (P0)

- **Liturgical precedence and transfer engine** (P0-1): occurrence resolved by the Table
  of Liturgical Days; impeded solemnities transfer forward (Annunciation in Holy Week,
  Immaculate Conception on an Advent Sunday); impeded feasts and memorials are omitted;
  colliding obligatory memorials are demoted per CDW Prot. 2671/98/L. Whole-year
  computation, cached per region and year.
- **Day codes follow the resolved calendar** (P0-2): lectionary day codes derive from the
  engine's governing celebration — no parallel reimplementation of precedence; transferred
  feasts bring their readings with them.
- **Responsorial Psalms render the right verses** (P0-3): `hebrewSpanToVulgate()` maps
  lectionary psalm citations (modern chapter, English-style verses) onto the
  Vulgate-versified bundles span-by-span — per-psalm title offsets, the 9/10, 113/114–115,
  114–115/116, 146–147/147 split/join cases, and nine mid-psalm irregulars. Ash Wednesday
  begins at *Miserere mei*, not the psalm's superscription; Holy Thursday's psalm is the
  right half of Hebrew 116.

### Fixed — correctness and integrity (P1)

- **Grid-empty verses** (P1-4): slots the shared verse grid leaves empty are skipped in the
  Reader (both columns), Search, and verse quotes — never rendered as bare numbers. The
  five Vulgate-appendix books, which the source corpus carries textless in every bundle,
  show an honest notice; About/BookList/README state it plainly.
- **Calendar region** (P1-5): `Universal` / `United States` setting read by both engines.
  USA: Epiphany on the Sunday of Jan 2–8, Baptism of the Lord to Monday when Epiphany
  lands Jan 7–8 (with correct Ordinary Time week anchoring), Ascension on the Seventh
  Sunday of Easter, Our Lady of Guadalupe as a Feast, and all six USA obligatory
  memorials (Seton, Neumann, Kateri, Claver, Brébeuf/Jogues, Cabrini). The five
  Thursday-Ascension provinces are documented on About. Epiphany's label is now simply
  "The Epiphany of the Lord" (closes P2-5); Guadalupe no longer over-ranks the universal
  calendar.
- **Memorial proper readings** (P1-6): the dataset's thousandths marker identifies
  prescribed propers (Barnabas, Timothy & Titus, Martha, the Passion of John the Baptist,
  Our Lady of Sorrows, Guardian Angels, the Immaculate Heart, Mary Mother of the Church);
  an observed, obligatory memorial so marked takes the day as "Proper of the Memorial"
  with the ferial cycle offered alongside. Optional memorials (now flagged: Joseph the
  Worker, Lourdes, Fatima, Mount Carmel, John Paul II) and unmarked memorials stay behind
  the ferial. Sts. Timothy and Titus added to the calendar (was missing).
- **Easter Vigil labels** (P1-7): the Liturgy-of-the-Word ladder renders as Reading I–VII
  and Epistle with each responsorial interleaved, shorter forms marked
  "or (shorter form)", the Gospel last. The `x.N1` shorter-form convention is honored on
  ordinary days too (Palm Sunday's short Passion).
- **Reader chapter clamp** (P1-8): switching to a translation with fewer chapters clamps
  to its real chapter count instead of hanging on "Loading the sacred text…".
- **Verse-of-the-day DST parity** (P1-9): day-of-year is pure calendar-component math,
  matching the iOS widget's `Calendar.ordinality`; the widget pins the Gregorian calendar
  so non-Gregorian device settings cannot diverge. Web and widget now always agree.
- **Pipeline integrity** (P1-10): both upstreams pinned by commit hash
  (`scripts/pins.mjs`); a fresh rebuild from the pins reproduced the committed corpus
  byte-for-byte before the pins were trusted. `public/data/manifest.json` seals every
  data file with SHA-256 (238 files + root hash + source pins), verified by
  `npm run verify-data` and independently by the harness. About surfaces
  "Texts verified — manifest root …".

### Fixed — polish (P2)

- Search highlights accent-folded matches correctly (*caelum* marks *cælum*), including
  ligature boundaries (P2-2).
- Service worker v2: all-or-nothing shell precache on install, stale-asset purge on
  activate and on fresh navigations, offline navigations served from the precached shell
  (P2-3). `docs/IOS.md` notes service workers don't run in Capacitor — and why that costs
  nothing on iOS.
- Lectionary citations that subdivide verses ("12b") now carry the `partial` flag —
  566 rows show the "(approx.)" marker, up from 2 (P2-4).
- Library backup: JSON export and merging import of bookmarks, highlights, and notes;
  on a same-verse conflict the newer entry wins, so an old backup can never destroy a
  fresh note (P2-6).
- Holy Thursday offers the Chrism Mass (morning) alongside the Mass of the Lord's Supper
  (evening) (P2-7).
- Reader reads settings once per mount (P2-8).
- About/BookList/README appendix attribution corrected: Prayer of Manasses and 3–4 Esdras
  are the printed Clementine appendix; Psalm 151 and Laodiceans come down in the wider
  Vulgate manuscript tradition (P2-1).

### Added — testing and audit (B.1, B.2, B.4)

- `npm test`: both harnesses as pure assertion suites (181 checks — trap years, USA
  region, psalm incipits, Vigil labels, memorial propers, manifest, VOTD parity) plus the
  SHA-256 manifest verification; exit 1 on any failure.
- Golden-year snapshots (`scripts/golden/2024–2027.json`): the full computed calendar,
  day codes, and reading resolution for every day in both regions, diffed on every test
  run. `npm run golden` re-blesses after a deliberate engine change.
- `data-report.txt`: a committed audit of every empty verse slot — 1,438 appendix
  placeholder slots per translation, plus 17 scattered slots across the three bundles
  (12 DRC / 5 CPDV / 8 Vulgate, some shared), with cross-bundle samples for checking
  against printed editions.

### Known issues

- The sanctoral calendar is a representative selection: all solemnities and feasts, the
  well-loved and prescribed-proper memorials, and the USA proper days — not every
  obligatory memorial of the General Roman Calendar. Unmodeled memorials display as
  ferias.
- Three DRC corpus defects exist **at the pinned upstream commit** and are disclosed in
  `data-report.txt` and on About: the printed Douay 3 Kings 17:11, Proverbs 30:19, and
  Baruch 6:7 are absent from the bundle, their slots holding misfiled verses. Correcting
  them is an editorial/upstream decision, deliberately not a silent patch.
- CI (§B.3) is not yet wired; `npm test` is local-only.
- The "United States" region applies the majority Ascension transfer; the provinces of
  Boston, Hartford, New York, Omaha, and Philadelphia keep Thursday (documented on About).

## [1.0.0] — baseline

Initial application: three bundled public-domain translations (Douay-Rheims Challoner,
CPDV, Clementine Vulgate) split per book under `public/data/`; Reader with parallel view,
bookmarks/highlights/notes, accent-insensitive search; Today page (Verse of the Day,
Mass readings, liturgical day, Rosary, continue reading); daily Mass readings from the
Roman lectionary cycles; PWA shell; iOS app via Capacitor with a WidgetKit
Verse-of-the-Day widget.
