# CLAUDE.md — Fidelis

[← Docs index](docs/INDEX.md)

Catholic Bible app (DRB, CPDV, Clementine Vulgate) with liturgical calendar and
daily Mass readings. Companion documents:
`docs/review/Fidelis_Code_Review_V1_2026-06-11.md` (the repair manual — every
P0/P1/P2 item plus hygiene B.1/B.2/B.4 done as of v1.1.0 and §B.3, CI, closed in
v1.2.1 — the manual is fully implemented), `docs/review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md`
(the growth plan; its §1–§2 identity layer shipped in v1.3.0, the identity release;
its §6 card 4 / §6.1 / §7 devotional layer in v1.4.0, the daily soul; the §4
commentary layer in v1.5.0; the §8.3 share card in v1.8.0; §8.1/§8.2 Reader & Search
refinements in v1.8.1; §3.4 quote verification in v1.8.3; the buildable half of §9
in v1.8.4; the §5 CCC citation index in v1.9.0; an iOS crispness pass (safe areas,
touch feel, the gold-contrast split, CCC discoverability) in v1.10.0; NABRE as the U.S.
Mass-readings default (import-only; never bundled) in v1.11.0; a navigation & IA pass
(scroll restoration, in-page SectionNav jump bars, native-Back handling, focus) in v1.12.0;
visual-regression fixes (readable selects, chip section-bar, liturgical-outline selections) in
v1.12.1; USFM/OSIS import + a NAB-PDF converter in v1.12.2; a documentation reconciliation
in v1.12.3; the USCCB calendar + NABRE readings made the defaults in v1.13.0; and the iOS
Mass/Quote widget sources + a macOS CI in v1.13.1; and the iOS-shell fixes (a reference-counted
scroll-lock, the startup font preloader, the scripted Widget Extension target), the Chi-Rho native
app icon, and the four-face Scripture lineup in v1.13.2; and the §5 inline-Catechism text tier (the
bundled public-domain Trent, McHugh-Callan 1923, plus import-your-own modern CCC on-device), the §4.3
Catena chronological reorder with the "Church Fathers" lane, the §3 no-repeat-per-year quote rotation,
and dark-mode home-screen widgets in v1.14.0 — all recorded below), and `CHANGELOG.md`
(release history; bump `package.json` version and add a CHANGELOG entry together).

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

## Architecture

How Fidelis is built now. The release-by-release narrative — and the exact wording of every
rule named below — lives in [docs/history/RELEASES.md](docs/history/RELEASES.md).

**The map.** A Vite + React + TypeScript single-page app (HashRouter), wrapped in a Capacitor
native shell for iOS and Android. `src/lib/` is the pure, testable core (engines + logic, no
React); `src/components/` and `src/pages/` are the UI; `scripts/` is the build/data pipeline and
the two test harnesses; `public/data/` is the generated, manifest-sealed corpus (never hand-edited);
`src/styles.css` holds the design tokens; `ios/` and `android/` are the committed native shells.

**The liturgical engines** (`src/lib/liturgical.ts`, `src/lib/lectionary.ts`) are pure and
region-aware, and read the region **lazily** from settings (`currentRegion()`), so they stay
testable with an explicit region param. `liturgicalDay(date, region)` resolves the governing
celebration through a numeric precedence table (Triduum → Christmas/Sundays → Solemnities → Feasts →
Memorials → Ferias) with a whole-year transfer pass for impeded solemnities, cached per
`region:year`. `resolveReadings(data, date, region)` (wrapped by `readingsForDate`) resolves the
Mass readings — promoting an obligatory memorial's proper formulary over the ferial cycle, handling
the Easter Vigil ladder and the dual Holy Thursday Masses — and `displayReadings()` lays them out in
ordered, labeled sections. The lectionary numbers psalms in the modern (Hebrew) grid; the bundle is
Vulgate, so `hebrewSpanToVulgate()` maps every psalm span (per-psalm title offsets, the join/split
cases) onto the bundle's verses. `src/lib/votd.ts` is the independent Verse-of-the-Day cycle:
`dayOfYear()` is pure calendar-component math and the selection formula is `(dayOfYear + year) mod
count` (Gregorian, device tz), matched bit-for-bit by the native widgets. `src/lib/quotes.ts`
(`quoteOfTheDay()`) is the parallel Quote-of-the-Day selector.

**The data pipeline.** Never hand-edit `public/data/` — it regenerates only from `scripts/`.
`scripts/build-data.mjs` builds the three **bundled** texts (Douay-Rheims `drc`, CPDV `cpdv`,
Clementine Vulgate `vulgate`) from upstream commits pinned in `scripts/pins.mjs`;
`scripts/build-manifest.mjs` then seals `public/data/manifest.json` (SHA-256 per file + a root hash +
the source pins), and `npm run verify-data` / the harness re-walk it. **Copyrighted texts are never
bundled** (`src/lib/translations.ts` `bundled: false` for NABRE and RSV-2CE) — the owner imports a
licensed copy on-device (IndexedDB; USFM/OSIS/JSON parsers in `src/lib/import-formats.ts`), and the
Reader falls back to the bundled Douay-Rheims when an import-only translation is absent.

**The identity system** lives in the day/night token blocks of `src/styles.css`; nothing outside
them carries a raw hex. The **two-accent rule** is binding — **purple acts, gold honors**: `--purple`
is every interactive/structural accent, `--gold` is the sacred marks (the ✠, quote-marks, the
selected-verse rule), and no element wears both. The **Today page never exceeds five cards**.
`src/App.tsx` is the single writer of `<html data-theme>` / `<html data-font>` / `<html data-accent>`
(the `index.html` pre-paint script sets theme + font before React mounts, so there is no flash;
`viewport-fit=cover` makes the `env(safe-area-inset-*)` insets resolve). `resolveTheme()`
(`src/lib/theme.ts`) maps System/Day/Night; `data-font` selects the `--scripture` face from the four
options in `src/lib/typography.ts` (`garamond|georgia|times|sans`); and `accentFor()`
(`src/lib/liturgical.ts`, the pure gate) remaps `--purple` to the governing day's liturgical color
when `followLiturgicalYear` is on — only `--purple` moves, `--gold` and `--purple-strong` hold.
`src/SettingsContext.tsx` (`useSettings()`/`update()`) is the live React source of truth;
`update()` writes localStorage synchronously, so the lazy `getSettings()` the engines call always
sees the latest value.

**The UI primitives.** `src/components/Sheet.tsx` is the one dialog primitive (`role="dialog"`,
focus trap + return, Escape/backdrop dismiss; `variant="panel"` docks right ≥640px) — it powers the
commentary, share, chapter-picker, rosary, and indulgence sheets, registering itself with the
reference-counted body scroll-lock (`src/lib/scrollLock.ts`) and the overlay-back stack
(`src/lib/overlays.ts`). `src/components/ScrollManager.tsx` (mounted once, pure logic in
`src/lib/scroll.ts`) is the sole scroll authority: `decideScroll` precedence is **target → skip;
REPLACE → skip; POP → restore; PUSH → top**, with `history.scrollRestoration = "manual"`.
`src/components/TabBar.tsx` is the five-tab nav (Today/Read/Search/Mass + a More **popover**, not a
route); `src/components/Icon.tsx` is the ten-mark `currentColor` icon set (no emoji glyphs — the
harness forbids them in `.tsx`); `src/components/SectionNav.tsx` is the in-page jump bar
(`scrollIntoView`, no URL change). `src/lib/passage.ts` (`passageText(data, ch, v, end?)`) is the
one verse-text extractor shared by the Reader, the quote card, and the rosary sheet so they can never
drift.

**The commentary + CCC layers** are facts-only and lazy. `src/lib/data.ts` memoizes
`loadCommentary()` and `loadCCC()`; the **Haydock** (whole canon) and **Catena Aurea** (four
Gospels) notes are built from pinned sources (`scripts/build-haydock.mjs` / `build-catena.mjs`) into
`public/data/commentary/`, with the pure attribution logic (`normalizeFather`/`groupCatena`/
`fathersOf`/`isDoctor`) in `src/lib/commentary.ts`. A Haydock note gives a verse a **gold dot**; the
§5 CCC index (`scripts/build-ccc.mjs` → `public/data/ccc/{index,url}.json`; `isCited()`/lookups in
`src/lib/ccc.ts`) gives a cited verse a fixed-**purple** mark and a verse→¶ link row out to
vatican.va. The Catechism text — like NABRE — is **never bundled**; only the citation numbers and the
official URLs ship.

**The native shells** wrap the same web bundle (offline by construction; the whole `dist/` ships in
the app). `capacitor.config.ts` pins `appId: app.fidelis.bible` and `ios.contentInset: "never"` (the
CSS safe-area insets are the single source of truth). The home-screen widgets read a **pre-resolved**
JSON — `scripts/build-votd-widget.mjs` + `scripts/build-calendar-widget.ts` emit `votd.json` and
`calendar.json` to **both** `ios/WidgetExtension/` and `android/.../res/raw/` (no engine is ported;
the same `(dayOfYear + year) mod count` formula keeps iOS/Android/web in lockstep). iOS draws three
WidgetKit widgets (`ios/WidgetExtension/*.swift`; the extension target is added idempotently by
`scripts/add-ios-widget-target.rb`); Android draws the matching App Widgets
(`android/.../VotdWidget.java`, `CalendarWidget.java`, `QuoteWidget.java`).

**The quality model.** Two harnesses assert everything (no print-only checks): `scripts/test-liturgical.ts`
(computus, precedence, region acceptance) and `scripts/test-data.ts` (reading resolution, the parsers,
the pure helpers, a both-region gospel sweep, and the manifest re-walk). Golden-year snapshots in
`scripts/golden/{2024..2027}.json` pin the full computed calendar + readings per day for both regions,
so any engine change that silently moves a feast is a red `npm test` — re-bless deliberately with
`npm run golden` and review the diff. `.github/workflows/ci.yml` runs lint → `npm test` → `npm run
build` → `npm run check-docs` on every push and PR (so a dead doc link fails the build too);
`.github/workflows/ios.yml` builds the iOS App + widget target on macOS.

## Release ledger

One line per release. The unabridged narrative is
[docs/history/RELEASES.md](docs/history/RELEASES.md); the changelog is [CHANGELOG.md](CHANGELOG.md).

- **v1.14.1 — set right** — v1.14.0-TestFlight fixes: Mass readings cited in modern book names ("2 Kings", not the Douay "4 Kings") via `formatLectionaryCitation` across all three surfaces (Today card, Readings page, and the regenerated home-screen widget `calendar.json`); the St. Charles Borromeo `page_nodes`/`ref-ccc` Catechism export now imports on-device (all 2865 ¶, the 1258 cited ¶ covered, conservative heading drop that never deletes prose); the share card's "Save image" writes to Photos on iOS through a tiny in-app `SaveImagePlugin` (add-only photo permission) and routes through the share sheet on Android; and Xcode Cloud can archive again (`ci_scripts/ci_post_clone.sh` runs `npm ci`/build/`cap sync`, plus a committed shared **App** scheme). → [detail](docs/history/RELEASES.md#set-right-v1141)
- **v1.14.0 — the open catechism** — the §5 text tier (inline Catechism: bundled PD Roman Catechism/Trent McHugh-Callan 1923 from a pinned GitHub source, browsable in a no-gold `CCCSheet` with vatican.va links inside; plus import-your-own modern CCC on-device that supersedes Trent, with a local converter) + §4.3 (the Catena reordered earliest-Father-first and the patristic tab renamed "Church Fathers") + §3 (538-quote corpus, no-repeat-per-year rotation) + dark-mode home-screen widgets. Source pins 4→5. → [detail](docs/history/RELEASES.md#the-open-catechism-v1140)
- **v1.13.3 — made ready** — the §9 close: a Siri/Shortcuts App Intent ("today's Gospel") + Dynamic Type; TestFlight-readiness iOS fixes (encryption flag, privacy manifest, signing, scripted App-target config); the documentation revamp; three design finishes (icon glyphs retired, verse-actions grouped, skeleton loaders). → [detail](docs/history/RELEASES.md#made-ready--testflight-prep-the-gospel-by-voice-dynamic-type-v1133)
- **v1.13.2 — the unbound page** — iOS-shell fixes (reference-counted scroll-lock, startup font preloader, scripted Widget Extension target), the Chi-Rho native app icon, the four-face Scripture lineup, sw cache v4→v5. → [detail](docs/history/RELEASES.md#the-unbound-page--ios-shell-fixes--v1132)
- **v1.13.1 — the second lampstand** — iOS Mass/Quote WidgetKit widgets + macOS CI; Capacitor 8.4.1. → [detail](docs/history/RELEASES.md#the-second-lampstand--ios-widgets--macos-ci--v1131)
- **v1.13.0 — the proper of the day, by default** — USCCB calendar + NABRE readings made the defaults; calendar-widget regenerated for USA region. → [detail](docs/history/RELEASES.md#the-proper-of-the-day-by-default--v1130)
- **v1.12.3 — the faithful record** — documentation reconciliation; first git tags + GitHub release. → [detail](docs/history/RELEASES.md#the-straight-paths--navigation--ia-v1120)
- **v1.12.2 — bring your own** — USFM/OSIS import parsers + NAB-PDF converter. → [detail](docs/history/RELEASES.md#the-straight-paths--navigation--ia-v1120)
- **v1.12.1 — readable again** — visual-regression fixes (selects, SectionNav chips, liturgical-outline selections, sw cache v3→v4). → [detail](docs/history/RELEASES.md#the-straight-paths--navigation--ia-v1120)
- **v1.12.0 — the straight paths** — navigation & IA pass (scroll restoration, SectionNav jump bars, native-Back handling, focus, Search URL-state). → [detail](docs/history/RELEASES.md#the-straight-paths--navigation--ia-v1120)
- **v1.11.0 — the proper of the day** — NABRE as the U.S. Mass-readings default (import-only; never bundled). → [detail](docs/history/RELEASES.md#nabre-as-the-us-mass-default--the-proper-of-the-day-v1110)
- **v1.10.0 — made plain** — iOS crispness pass (safe areas, touch feel, gold-contrast split, CCC discoverability, status bar). → [detail](docs/history/RELEASES.md#made-plain--the-ios-crispness-pass-v1100)
- **v1.9.0 — the deposit** — CCC citation index (§5): verse→¶ links to the Catechism; Catechism text never bundled. → [detail](docs/history/RELEASES.md#the-deposit--design-spec-5-v190)
- **v1.8.4 — the doorposts** — pre-resolved widget data pipeline + Android Mass/Quote widgets (buildable half of §9). → [detail](docs/history/RELEASES.md#the-open-door--a11y--polish-release-v181)
- **v1.8.3 — the cloud of witnesses** — §3.4 quote verification ledger closed (all 47 entries). → [detail](docs/history/RELEASES.md#the-open-door--a11y--polish-release-v181)
- **v1.8.2 — every tongue** — `lang="la"` on every Latin text node for screen readers. → [detail](docs/history/RELEASES.md#the-open-door--a11y--polish-release-v181)
- **v1.8.1 — the open door** — a11y + polish (operable verse spans, ARIA nav, commentary offline download, quiet quality). → [detail](docs/history/RELEASES.md#the-open-door--a11y--polish-release-v181)
- **v1.8.0 — the sower** — share card (§8.3): 1080×1350 PNG canvas, Web Share API, three entry points. → [detail](docs/history/RELEASES.md#the-share-card--design-spec-83-v180)
- **v1.7.0 — the lampstand** — Android Verse of the Day home-screen widget. → [detail](docs/history/RELEASES.md#the-lampstand-release--the-android-home-screen-widget-v170)
- **v1.6.0 — freely given** — native Android shell (Capacitor); free-forever pledge in README. → [detail](docs/history/RELEASES.md#the-android-shell--the-freely-given-release-v160)
- **v1.5.0 — formation** — commentary layer (§4): Haydock + Catena Aurea, gold dots, Commentary Sheet panel. → [detail](docs/history/RELEASES.md#the-formation-release--design-spec-4-v150)
- **v1.4.0 — the daily soul** — rosary mystery sheet, reading-time indulgence, reading plans (§6/§6.1/§7). → [detail](docs/history/RELEASES.md#the-daily-soul-release--design-spec-6-card-4-61-7-v140)
- **v1.3.0 — the identity release** — token system, liturgical color, Scripture face, icon set, five-tab nav, Settings screen (§1–§2). → [detail](docs/history/RELEASES.md#identity-release--design-spec-12-v130)
- **v1.1.0 — all P0/P1/P2 fixed** — rank engine, day codes, psalm versification, empty slots, USA calendar, memorial propers, reading display, chapter clamp, VOTD ordinal, pinned upstream. → [detail](docs/history/RELEASES.md#review-items--all-fixed-in-v110-details-below-are-the-record)

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds five cards.** A new feature earns a line inside an existing card or lives on another tab.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
