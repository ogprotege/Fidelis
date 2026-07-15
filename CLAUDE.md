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
npm test           # both harnesses (all hard assertions, exit 1 on any failure) + manifest verify + lint
npm run build      # type-check (tsc) + Vite build
npm run e2e        # the committed browser suite (Playwright vs the BUILT app — run build first)
npm run golden     # re-bless golden-year snapshots after a DELIBERATE engine change; review the diff
npm run verify-data
```

Harnesses assert everything (review §B.1 — no print-only expectations remain). Golden-year
snapshots (§B.2) in `scripts/golden/{2024..2027}.json` pin the full computed calendar, day
codes, and reading resolution per day for both regions; `test-data.ts` diffs them, so any
engine change that silently moves a feast is a red `npm test`. §B.3 (CI) is closed:
`.github/workflows/ci.yml` runs `npm ci`, `npm test`, and `npm run build` on Node 22 for
every pull request and every push to main, so a red harness or a type error fails the build.

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
selected-verse rule), and no element wears both. The **Today page never exceeds six cards**
(raised from five in v1.18.0 for Today in Church History).
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
route) — on phones a sticky top tab row under the scrolling brand masthead (v1.16.0), one row with
the brand on desktop; `src/components/Icon.tsx` is the ten-mark `currentColor` icon set (no emoji
glyphs — the harness forbids them in `.tsx`); `src/components/SectionNav.tsx` is the in-page jump bar
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
build` → `npm run check-docs` on every PR and push to main (so a dead doc link fails the build too;
the lint covers `src` and the `scripts/` pipeline); `.github/workflows/ios.yml` builds the iOS App +
widget target on macOS and `.github/workflows/android.yml` the unsigned debug APK — both trigger on
`public/**` too, since the corpus ships in the binaries. `.github/workflows/sources.yml` probes the
five upstream pins and the vatican.va CCC pages monthly (`scripts/check-sources.mjs`).

## Release ledger

One line per release. The unabridged narrative is
[docs/history/RELEASES.md](docs/history/RELEASES.md); the changelog is [CHANGELOG.md](CHANGELOG.md).

- **v1.18.2 — the mended net** — a repair release, no new behavior: the three parallel v1.18 branches ("the memory of the just" saints/history, "both are preserved" atomic import, "prove all things" route-split + browser suite) collided on merge and left main red (a lint parse error + two `TS2440`/`TS2300` type errors — all 3-way-merge duplication, no branch defect). Three mechanical de-dupes, each keeping both features: `App.tsx` dropped the static route imports that duplicated the lazy consts and **folded the Saint/History detail pages into the perf route-split** (`const Saint/History = lazy(...)`, their routes already under `<Suspense>`); `data.ts` dropped a duplicated `CccTextDoc` import; `test-data.ts` regained the memory block's lost closing brace and renumbered it §35 (leaving the atomic-import §33 / perf §34 numbers, quoted in their own labels, intact); `e2e/today.spec.ts` updated five→six cards. Proven green: 624 harness checks (§35 memory + six-card guard + §33 wineskins + §34 perf together), both e2e suites (13 committed + 14 saints/history), build/lint/docs; shells 1.18.2/11802; no engine/data/golden/sw changes. → [detail](docs/history/RELEASES.md#the-mended-net-v1182)
- **v1.18.1 — prove all things** — the audit's perf & browser-test batch (FID-QUAL-001/PERF-002/PERF-003 closed; PERF-001 measured, part-addressed, honestly bounded): the **committed Playwright suite** — 13 tests in `e2e/`, `npm run e2e`, a second CI job on every PR (channel `chrome`, no browser download; drives the built app via `vite preview`) — covering the audit's list as regression classes (Today load/failure+retry with the SW blocked so route interception sees the lectionary, the docked bar provably not covering the selected verse, sheet open/axe-open/Escape/browser-Back-releases-the-scroll-lock, Search's exact DRB counts All 434 · OT 377 · NT 57 · Gospels 22, bookmark-opens-in-saved-translation, injected mid-import IDB failure leaving the corpus untouched, offline Saved honesty evict→Repair→never-lie, axe WCAG A/AA zero-violations on Today/Reader/Mass/Settings; the sheet's 110ms entrance is awaited or axe reads its in-flight opacity as phantom contrast); `e2e/` linted; §34 pins suite+script+deps+CI. **Route split** (FID-PERF-002): Settings/Library/Translations/Plans/PlanCreator/About are `React.lazy` chunks behind one Suspense fallback, worship path eager, main chunk 426→393 kB. **Search prefetch** (FID-PERF-003): a 6-book window overlaps fetches while processing stays canon-order (§29/§30 unchanged). **Geometry** (FID-PERF-001): each Mass reading reserves space scaled from its own citation's verse spans, the page reserves a day's readings, lazy fallbacks hold a screenful — Mass CLS 0.34→**0.042**, Settings 0.025, Search shell 0.000, Today 0.10–0.16, Reader 0.107; LCP 2.7–4.1s still over the 2.5s target on simulated slow-4G (residuals named: the Garamond swap + the main chunk). No engine/data/golden/sw changes; shells 1.18.1/11801. → [detail](docs/history/RELEASES.md#prove-all-things-v1181)
- **v1.18.0 — both are preserved** — the audit's storage & import resilience batch (FID-DATA-001/FUNC-009/STOR-001/FUNC-008): the Bible import becomes **atomic** — oversized files refused before read (64 MB documented bound on `file.size`), parse+normalize in a Worker (`import.worker.ts`; the parsers were already pure string work), the whole corpus validated pre-write, books staged under a fresh IndexedDB generation (`translation@gen/book`), the active-version marker (new `meta` store, DB v3) flipped only after every write, superseded keys swept after the flip — gen 0 IS the legacy key shape so existing installs migrate by construction; a mid-import failure provably leaves the prior corpus untouched and a smaller re-import retains no stale books (the decision surface is the pure `importPlan.ts` behind an `ImportStore` adapter, driven in harness §33 with injected failures); Translations gains **Replace imported text** (same swap — no textless window); localStorage `write()` failures raise **one deduplicated quiet warning** with Export as recovery (FID-STOR-001; successes never toast); Settings' offline **"Saved" is cache truth** — `verifyOfflineBundle` probes the data cache against the manifest (DATA_CACHE pinned to sw.js's by §33), Saved = complete, **Repair (n missing)** = intent + partial (repair re-fetches exactly the gap via the cache-first sw), incidental caching claims nothing, the record demoted to presentation. Harness §33 (29-red TDD start); 35 e2e checks in real Chrome (put-monkeypatch quota injection, real 64 MB file, legacy-corpus seed, evict-one/evict-all Saved honesty, banner lifecycle). No engine/data/golden/sw changes; shells 1.18.0/11800. → [detail](docs/history/RELEASES.md#both-are-preserved-v1180)
- **v1.17.1 — touch and see** — the audit's visual-calibration batch (FID-A11Y-004/FID-UX-002, the half v1.17.0 deferred): every text-carrying token now clears WCAG AA on **all three surfaces** of its theme (the raised bg-2 was the blind spot — everything had been calibrated against bg-1 only), moved through the existing seams alone — day deepens (`--gold-text` #8A6D1F→#7C621C, `--text-muted`→#6B675E, Ordinary-green accent #3E7C4F→#377046, rose→#A34767, white borrows the new gold-text), night lifts (brand `--purple` #9B7BD4→#A98EDC with the violet accent riding along, red→#E07A89, black→#97979F); `--gold` marks and `--purple-strong` never moved. Links inside prose (`p a, li a, .notice a`) underline by default (the Mass import link sat at 1.07:1 against muted copy — WCAG 1.4.1). The nine audited sub-44px control families tap at ≥44px with no new chrome: pseudo-element hit slop (chips ±0.6rem, SectionNav ±0.5rem inside the rail's padding, book/picker chips ±0.4rem, pills ±0.3rem, switch on `::before` since `::after` is the knob, Share asymmetric inside its own margin+card padding, Library Remove/Delete ±0.9rem, Commentary tabs ±0.4rem), real padding on the rosary rows, wrap-gaps widened to exactly two slops (load-bearing, guarded). Harness §32 parses the tokens and computes the WCAG ratios (contrast drift = red `npm test`) + shape guards; §1.3 hex pins moved with the table; 25 e2e checks in real Chrome at 390px (computed colors, pixel-derived ratios, effective hit boxes — the audit's heights ran ~2px large vs live geometry, slops sized to the browser's numbers). No engine/data/golden/sw changes; shells 1.17.1/11701. → [detail](docs/history/RELEASES.md#touch-and-see-v1171)
- **v1.17.0 — nothing hidden** — the behavioral half of the audit's sacred-page + a11y pass (FID-UX-001/FUNC-006/A11Y-001/002/003; contrast + touch targets deferred to v1.17.1): the phone verse-action bar — a `left: 50%` shrink-to-fit pill that wrapped into a ~190×330px tower over the selected verse — becomes a **docked full-width bottom grid** (ref+Close / centered swatches / icon-over-label Bookmark·Note·Copy·Share / half-width Commentary·Catechism / full-width note editor; stable at 320/390/430), the page reserving its **live** height via ResizeObserver → `--verse-actions-h` and selection scrolling the verse clear by the overlap only (reduced-motion aware; desktop pill untouched); the Today Mass list gets honest three-state (skeleton reserves height; quiet notice + real **Try again**; a resolved-null out-of-window date settles as failed too); the color chip gains a spoken name (`.sr-only` utility; chip `aria-hidden`); Library's views become an `aria-pressed` segmented group ("Library view", Export/Import outside); restrained `role="status"` on transition text only and `VerseQuote`'s bare "—" replaced with plain speech. Bookmark keeps a constant label + `aria-pressed` + gold ring; Note speaks `aria-expanded`; Close returns focus. Harness §31; 31 e2e browser checks (320px sweep caught the Commentary overflow pre-ship); no engine/data/golden/sw changes; shells 1.17.0/11700. → [detail](docs/history/RELEASES.md#nothing-hidden-v1170)
- **v1.16.2 — a just weight** — the audit's correctness batch (FID-FUNC-001/002/003/004/007): Search sweeps all 78 books and the section chips carry **exact** counts (only the rendered list is bounded, per section, so NT results display even when the OT fills the overall cap — "mercy" in DRB: All 434 · NT 57 · Gospels 22, formerly NT 0; pure collector in `src/lib/search.ts`, harness §29); the Reader persists `lastRead`/the default translation only after the text loads, identity-gated on `data.translation`/`data.book` (a failed NABRE pick no longer poisons settings); Library bookmarks open in their saved translation (quiet ` · abbrev` when it differs; highlights/notes stay passage-level); `VerseQuote` reports the translation actually rendered (`onShownTranslation`) and the Today card, rosary sheet, and embeddable widget follow it in citation and link (no more DRB text under a NABRE cite); the plan creator floors its date input at tomorrow and rejects past/empty dates inline instead of clamping to a one-day plan. Harness §29/§30; e2e-verified in a real browser; no engine/data/golden/sw changes; shells 1.16.2/11602. → [detail](docs/history/RELEASES.md#a-just-weight-v1162)
- **v1.16.1 — a faithful witness** — the audit's release-safety batch (the 2026-07-15 full product audit, verified claim-by-claim, then acted on): the README's four stale claims corrected (Mass/Quote widgets ship on **both** platforms; the widget target is scripted by `add-ios-widget-target.rb`; the App Intent + Dynamic Type shipped in v1.13.3; phone nav is the masthead, not a bottom bar — FID-DOC-001) and the iOS guide's retired-layout verification + future-tense §5 rewritten; the widget "never disagrees" comments now state the real policy — `calendar.json` is fixed to the USCCB region, documented as the iOS guide's "Region policy" (FID-NATIVE-001, doc half); the native workflows watch their own tooling — five native-shaping scripts added to the iOS path filters, the two widget builders to Android's, and the iOS sim build Debug→**Release**, the configuration TestFlight archives (FID-REL-002); the root Xcode Cloud hook pins `node@22` like the canonical one and the release guide gives the exact `Package.swift` revert command (FID-REL-003). No app code/engine/data/golden changes; shells 1.16.1/11601. → [detail](docs/history/RELEASES.md#a-faithful-witness-v1161)
- **v1.16.0 — upon the candlestick** — the Collapsing Masthead: the phone nav leaves the bottom edge for a top masthead — the gold brand row scrolls away in normal flow (no JS, no animation) while the slim sticky tab row pins under a fixed status-bar backdrop strip, the More menu drops down as on desktop, and the bottom bar with its `z-index: 45` escalation and the footer/verse-actions clearances is deleted; the Reader gets the folio line (`John 1 ▾ · DRB ▾ · Aa` — the extended book+chapter picker retires the "← All books" crumb; Aa gathers size/face/parallel into a Text options sheet); the Mass page's two control rows become one (`‹ date ▾ ›`, a Today chip only off-today, right-aligned translation); Search untouched by design. `--header-h` re-derives per breakpoint; desktop ≥640px unchanged; no engine/data/golden changes; sw shell cache v5→v6; shells 1.16.0/11600. → [detail](docs/history/RELEASES.md#upon-the-candlestick-v1160)
- **v1.15.1 — the lamp trimmed** — the front-page fix + the native-shell version drift closed: `VerseQuote` (the Today page's Verse of the Day card and the rosary sheet's passage) falls back to the bundled Douay-Rheims when the selected reader translation is import-only and absent on-device — it rendered a bare "—" on the app's front page (the share path and Reader already had the convention; the `lang` attribute follows the text actually shown); `loadCCCText()` retries after an IndexedDB read failure instead of memoizing the failure-`null` forever (the last loader missing the v1.14.2 retry-after-rejection treatment); harness source-shape guards for the three uncovered v1.14.2 UI fixes (`Sheet`'s layout-effect scroll lock + disabled-control focus-trap exclusion, `ScrollManager`'s `isScrollLocked()` recorder guard, the `.reader-toolbar` `top: var(--header-h)` rule) plus the stale "ADVISORY" red-list comment corrected; and the shells versioned at last — iOS `MARKETING_VERSION` and Android `versionName` 1.14.1→1.15.1, `versionCode` 11401→11501 (Xcode Cloud Build 18 had shipped v1.15.0 code labelled "1.14.1 (1)"). No engine, data, or golden changes. → [detail](docs/history/RELEASES.md#the-lamp-trimmed-v1151)
- **v1.15.0 — our own tongues** — Spanish via the Biblia Platense (Straubinger, 1948–51) as the third **import-only** translation (never bundled — its U.S. term is not clearly expired; NABRE posture exactly): a `straubinger` entry (`language: "es"`), `normalizeImport()` moving the corpus's four verified Hebrew-numbered chapters (Ex 8 +4, Num 13 +1, Ps 10 +1, Mark 9 −1) onto the Vulgate grid at import time (signature-gated, idempotent, text never altered; corpus verified chapter-by-chapter against the bundled Vulgate), roman-numeral/SWORD book-name aliases for all import formats, a textless-placeholder skip (the empty "I Esdras" could alias-clobber Ezra), and `langAttr()`/`languageLabel()` so screen readers voice Spanish as Spanish. → [detail](docs/history/RELEASES.md#our-own-tongues-v1150)
- **v1.14.4 — the watchmen** — the CI-hardening batch: an Android `assembleDebug` workflow (the shell's first CI); a monthly external-sources health check (`sources.yml` + `scripts/check-sources.mjs` — the five upstream pins via the GitHub commits API + every vatican.va CCC page); `scripts/` linted (a Node tier in the flat config; `eslint src scripts` in lint AND the test gate; six latent issues fixed); CI de-duplicated (push gates `main` only, `concurrency` groups everywhere) with `public/**` added to the iOS/Android path filters; Xcode Cloud pins `node@22`. No app code changed. → [detail](docs/history/RELEASES.md#the-watchmen-v1144)
- **v1.14.3 — the gathered fragments** — the Catena de-duplication (John 6:12): `build-catena.mjs` emits format 2 (`{format:2, blocks:[{keys,entries}]}` — each pericope's chain stored ONCE with the grid keys it covers) and `expandCatenaSpans()` (`src/lib/commentary.ts`) re-broadcasts at load time in `loadCommentary()` into the identical per-verse map (verified key-for-key against the legacy corpus across all 3,736 keys; legacy files still load, no DATA_CACHE bump). matthew.json 9.9→2.1 MB, `public/data` 56→31 MB, `dist/` 57→32 MB — ~25 MB off every install, ~5× lighter first commentary parse. → [detail](docs/history/RELEASES.md#the-gathered-fragments-v1143)
- **v1.14.2 — kept watch** — the beta-review reliability pass: the §3.3 quote red list made a hard build failure (`ALLOW_RED_LIST=1` is the explicit closed-beta escape), a today+180-day freshness gate + iOS/Android byte-parity on the widget `calendar.json`, the sheet×scroll-authority fix (`Sheet` locks in a layout effect; the recorder ignores pinned-body scrolls), the live `useToday()` (midnight + foreground resume) behind Today/Readings/accent, retry-after-rejection on the lectionary/quotes/manifest/CCC/Trent memos, honest error states (Search names the unreachable book, the Quote card stops skeleton-ing forever, VOTD Share falls back to DRB), word-boundary Father matching ("Leontius" ≠ Leo the Great), the `--header-h` Reader-toolbar fix, and `aria-label`s on the toolbar controls. → [detail](docs/history/RELEASES.md#kept-watch-v1142)
- **v1.14.1 — set right** — v1.14.0-TestFlight fixes: Mass readings cited in modern book names ("2 Kings", not the Douay "4 Kings") via `formatLectionaryCitation` across all three surfaces (Today card, Readings page, and the regenerated home-screen widget `calendar.json`); the St. Charles Borromeo `page_nodes`/`ref-ccc` Catechism export now imports on-device (all 2865 ¶, the 1258 cited ¶ covered, conservative heading drop that never deletes prose); the share card's "Save image" writes to Photos on iOS through a tiny in-app `SaveImagePlugin` — registered with the bridge by a `MainViewController` (`CAPBridgeViewController` subclass) in `capacitorDidLoad()`, since Capacitor never auto-registers a non-package plugin; add-only photo permission — and routes through the share sheet on Android; and Xcode Cloud can archive again (`ios/App/ci_scripts/ci_post_clone.sh` — beside the `.xcodeproj`, where Xcode Cloud looks — runs `npm ci`/build/`cap copy`, plus a committed shared **App** scheme). → [detail](docs/history/RELEASES.md#set-right-v1141)
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
2. **The Today page never exceeds six cards** (raised from five in v1.18.0 for Today in Church History). A new feature earns a line inside an existing card or lives on another tab before it earns a card.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
