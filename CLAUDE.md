# CLAUDE.md — Fidelis

Catholic Bible app (DRB, CPDV, Clementine Vulgate) with liturgical calendar and
daily Mass readings. Companion documents:
`docs/review/Fidelis_Code_Review_V1_2026-06-11.md` (the repair manual — every
P0/P1/P2 item plus hygiene B.1/B.2/B.4 done as of v1.1.0 and §B.3, CI, closed in
v1.2.1 — the manual is fully implemented), `docs/review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md`
(the growth plan; its §1–§2 identity layer shipped in v1.3.0, the identity release,
and its §6 card 4 / §6.1 / §7 devotional layer in v1.4.0, the daily soul — both
recorded below), and `CHANGELOG.md` (release history; bump `package.json` version
and add a CHANGELOG entry together).

## Commands

```sh
npm test           # both harnesses (all hard assertions, exit 1 on any failure) + manifest verify
npm run build      # type-check (tsc) + Vite build
npm run golden     # re-bless golden-year snapshots after a DELIBERATE engine change; review the diff
npm run verify-data
```

Harnesses assert everything (review §B.1 — no print-only expectations remain). Golden-year
snapshots (§B.2) in `scripts/golden/{2024..2027}.json` pin the full computed calendar, day
codes, and reading resolution per day for both regions; `test-data.ts` diffs them, so any
engine change that silently moves a feast is a red `npm test`. §B.3 (CI) is closed:
`.github/workflows/ci.yml` runs `npm ci`, `npm test`, and `npm run build` on Node 22 for
every push and pull request, so a red harness or a type error fails the build.

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
  OFL in `src/fonts/`); `scriptureFont` ∈ `garamond|serif|sans` drives `--scripture`
  via `<html data-font>`; four size presets (17/19/22/25) own the vocabulary in
  `src/lib/typography.ts`. `sw.js` is font-aware (shell cache `v3`). Still no
  red-letter text — weight-400 only, asserted.
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
commentary layer shipped in v1.5.0 (the formation release, below). §5 (the CCC
citation index) and §8–§12 remain the open roadmap (§13 is the binding refusal
list, in the standing rules).

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
  hides none. **Versification caveat:** commentary keys are Douay/DRC coordinates; under
  Vulgate Psalm numbering a few Psalm dots may sit one verse off (documented, unmapped).

Deferred from §4 and after: §5 (the CCC citation index — verse→paragraph links, the
Catechism text never bundled) is the next PR; commentary offline-download (Settings →
Data) and per-Father "by era" filtering remain open.

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
**local-build runbook** (`docs/superpowers/specs/2026-06-15-ccc-*`) — signed off, built
locally (the cloud sandbox 403-blocks vatican.va and can't read the Catechism PDF), shipping
later as **v1.8.0 "the deposit"**; and a step-by-step **iOS Simulator** guide in `docs/IOS.md`.

## Review items — all fixed in v1.1.0 (details below are the record)

### P0 — worship-facing accuracy (all fixed)

- **P0-1:** Fixed (3993dc9) — rank engine with precedence and transfer in `src/lib/liturgical.ts`.
- **P0-2:** Fixed (3993dc9) — day codes derive from the calendar engine's resolved governing celebration.
- **P0-3:** Fixed — `hebrewSpanToVulgate()` in `src/lib/lectionary.ts` maps lectionary psalm spans (modern chapters, English-style verses) onto the Vulgate-versified bundle grid: per-psalm title offsets, the 9/10, 113/114-115, 114-115/116 and 146-147/147 split cases, and nine mid-psalm join/split irregulars. Verse alignment is asserted by incipit in `scripts/test-data.ts`.

### P1 — correctness and integrity (all fixed)

- **P1-4:** Fixed — grid-empty verse slots are skipped in Reader (both columns), Search, and VerseQuote; fully-empty chapters (the five appendix books, textless in the source corpus in every bundle) show an honest notice. `scripts/build-report.mjs` (run by `npm run data` / `npm run report`) emits the committed `data-report.txt` audit: 1,438 appendix placeholder slots + 17 scattered slots; report↔data sync asserted in `scripts/test-data.ts`. About/BookList/README copy corrected (Clementine appendix attribution, grid honesty). The audit surfaced 3 DRC corpus defects (printed 3 Kings 17:11, Prov 30:19, Bar 6:7 absent outright; their slots hold misfiled verses) — documented in the report and About; correcting the corpus itself folds into P1-10.
- **P1-5:** Fixed — `calendarRegion` setting (`universal` | `usa`, default universal) in `storage.ts`, read lazily by both engines (`currentRegion()`); explicit region params keep them testable. USA: Epiphany on the Sunday of Jan 2–8 (`epiphanyDate`), Baptism to Monday when Epiphany lands Jan 7–8 (OT week 1 then anchors on the Epiphany Sunday), Ascension on the Seventh Sunday of Easter, the Guadalupe Feast, and all six USA obligatory memorials (Seton, Neumann, Kateri, Claver, Brébeuf/Jogues, Cabrini). Epiphany left `FIXED` for `movableDefs` and the label dropped "(traditional date)" (closes P2-5); Guadalupe moved to `USA_FIXED` (was over-ranked universally). Region select on the Readings toolbar; About documents the transfers incl. the five Thursday-Ascension provinces. 30+ acceptance checks in `test-liturgical.ts`; the gospel sweep in `test-data.ts` runs both regions.
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

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds five cards.** A new feature earns a line inside an existing card or lives on another tab.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
