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
npm run verify-widgets # no-write, byte-for-byte native widget generation check
```

Harnesses assert everything (review §B.1 — no print-only expectations remain). Golden-year
snapshots (§B.2) in `scripts/golden/{2024..2031}.json` pin the full computed calendar, day
codes, and reading resolution per day for every supported profile; `test-data.ts` diffs them, so any
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

**The liturgical engines** (`src/lib/calendarProfile.ts`, `src/lib/liturgical.ts`,
`src/lib/lectionary.ts`) are pure and profile-aware. They read `calendarProfile`
**lazily** from settings, so they stay testable with an explicit profile parameter.
The v1 catalog contains General Roman, U.S. Sunday Ascension, and U.S. Thursday
Ascension for Boston, Hartford, New York, Omaha, and Philadelphia; unsupported
jurisdictions receive an explicit General Roman fallback receipt. Legacy
`universal` / `usa` values migrate without changing behavior.
`liturgicalDay(date, profile)` resolves the governing celebration through all
thirteen Table-of-Liturgical-Days classes, with stable celebration/formulary IDs,
alternatives, suppression receipts, and a whole-year transfer pass for impeded solemnities, cached per
`profile:year`. `resolveReadings(data, date, profile)` (wrapped by `readingsForDate`) resolves the
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
JSON — `scripts/build-votd-widget.mjs` + `scripts/build-calendar-widget.ts` emit
`votd.json` and an atomic, versioned `calendar.json` to **both**
`ios/WidgetExtension/` and `android/.../res/raw/` (no engine is ported;
`npm run verify-widgets` regenerates in memory and requires byte parity). The
calendar snapshot covers every supported profile from the previous year through
five future years and fails closed on schema, fingerprint, expiry, profile, or
day errors. iOS draws three
WidgetKit widgets (`ios/WidgetExtension/*.swift`; the extension target is added idempotently by
`scripts/add-ios-widget-target.rb`); Android draws the matching App Widgets
(`android/.../VotdWidget.java`, `CalendarWidget.java`, `QuoteWidget.java`). More
▸ Widgets reports WidgetKit configurations and requests allowlisted Android
pins; a requested prompt is distinct from the Android success callback. Android
refreshes and rearms all providers on boot, package replacement, date, time, and
time-zone changes. Both iOS targets request the shared App Group; a distribution
build must still prove that both signed profiles grant it.

**The quality model.** Two harnesses assert everything (no print-only checks): `scripts/test-liturgical.ts`
(computus, precedence, region acceptance) and `scripts/test-data.ts` (reading resolution, the parsers,
the pure helpers, a both-region gospel sweep, and the manifest re-walk). Golden-year snapshots in
`scripts/golden/{2024..2031}.json` pin the full computed calendar + readings per day for every profile,
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

- **v1.24.4 — the fruitless branch** — CI is green again. `npm audit --omit=dev` is the
  **first** step of the `build` job, so since 2026-07-24 lint, both harnesses, the
  type-check, the build, and the doc-link gate had **never run** — twelve straight
  `build fail 20s`. One advisory held it: **GHSA-qwww-vcr4-c8h2** (RSC-mode CSRF bypass,
  high) over react-router **7.12.0–7.18.1** and **8.0.0–8.2.x**. npm could only walk
  *backwards* (`--force` → 7.11.0) and the reason was structural, not a missing publish:
  the dependency was **`react-router-dom`**, whose latest version is also its **final**
  one, 7.18.2 — since v7 a deprecated shim of one `export * from "react-router"` plus two
  `react-router/dom` re-exports — so every version npm could select dragged in a 7.x
  `react-router`, while the advisory's own patched **8.3.0** sat published and unreachable
  behind it. The shim came out: **21 import sites** moved to `react-router`, all **10**
  symbols in use confirmed exported by importing the installed package (not its docs), and
  every v8 breaking change read against this app — all of them land on data-router / RSC /
  framework surface a `HashRouter` SPA with no loaders or actions does not have; floors met
  (Node ≥22.22.0 vs CI's 22.23.2, React ≥19.2.7 vs `^19.2.7`); 8.3.0's path-encoding change
  checked, not assumed (79 book ids, 772 saint/history ids, 366 day keys — all lowercase
  slugs). **`useNavigate` still memoises on `location.pathname`**, so v1.24.1's widget-entry
  comments stand. Behind it, a second gate that had **never once executed** (`--omit=dev`
  exits first) was red too: postcss 8.5.15→**8.5.26**, js-yaml 4.3.0→**4.3.1**,
  brace-expansion 1.1.16→**1.1.18** and 5.0.8→**5.0.9** — all lockfile-only, no `overrides`;
  the lockfile's own root version had drifted to 1.24.1 under a `package.json` reading
  1.24.3. Bundle net flat (555,257→553,779 B; main chunk 461.5→439.9 kB, v8 splitting a
  20.0 kB `hooks` chunk). Harness **§40**, 9 checks all red-first, pins the temptation
  rather than the fix: **both** audit steps must stay in `ci.yml` with no `|| true`,
  `--audit-level`, or allowlist; the shim may not return to `src/`, `package.json`, or the
  lockfile; a declared **and** locked 8.3.0 floor, the comparison itself tested against
  7.18.2 and 8.2.0; and every symbol `src/` imports checked against the installed package,
  the list read off the source. Recorded honestly: re-run against the **pre-fix** tree with
  CI's own `npm@11.17.0`, the complete-graph failure reproduced exactly, the `--omit=dev`
  one **did not** — the advisory feed reachable here serves two ranges (`>=7.12.0 <7.18.2`,
  `>=8.0.0 <8.3.0`) making 7.18.2 already patched, where CI printed the collapsed
  `7.12.0 - 8.2.0` spanning that gap; unsettleable from here, and precisely why the answer is
  a migration rather than a wait, since 8.3.0 is outside under either reading. All 31 e2e
  tests pass on v8. No engine/data/golden/sw change. Shells 1.24.4/12404.
  → [detail](docs/history/RELEASES.md#the-fruitless-branch-v1244)
- **v1.24.3 — called by name** — the store-listing release after v1.24.2's App Store debut:
  the product name becomes **Fidelis: Catholic Bible** (home-screen label stays *Fidelis*),
  keywords and description tightened, What's New filled in for the first time, and 10 iPhone
  + 8 iPad screenshots given brand caption bands so Apple's OCR can index the product page;
  `metadata/` + `scripts/caption-screenshots.py` mirror the caption pipeline in-repo. No
  engine, corpus, or service-worker change. Shells 1.24.3/12403.
- **v1.24.2 — the lamps relit** — the blank-widget repair. **Today at Mass** and **Quote of
  the Day** read "Open Fidelis to update" on every device and never recovered; **Verse of the
  Day** alone kept working. v1.24.0 had made `loadCalendar()` refuse to draw without reading the
  app's calendar jurisdiction through the App Group — sound reasoning on a false premise, because
  **that entitlement had never once shipped**: the pipeline archives UNSIGNED, entitlements are
  written by the *signing* step, and `-exportArchive` re-signs from what the archive declares, so
  a group registered on both App IDs and granted by both profiles never reached a device.
  `isAvailable` was permanently false in distribution. VOTD reads `votd.json` and never consults
  the group, which is why it alone survived and why the failure read as bad data. Android was
  never affected. Two repairs: the pipeline's new step **[2b/6]** ad-hoc signs the archived
  `.appex` then `.app` with their committed entitlements before export (no profile needed, so the
  unsigned archive stays), proved on a real export — both binaries now carry
  `group.app.fidelis.bible`, a first for this project; and failing closed becomes per **day**,
  not per widget — with no known jurisdiction the snapshot's default profile stands in but a day
  is served **only where every supported profile resolves it identically** (new build-time
  `unanimity` table: **2,447/2,556 Mass, 2,221 Quote**, gated separately). No jurisdiction is
  guessed. Siri keeps the same rule (it carried its own copy of the gate, so "today's Gospel" had
  been silent too). The release contract enforces the App Group again, and `FIDELIS_VERIFY_ONLY=1`
  proves a signing change without spending a build number. Native tests 13→18, harness §36 +7 /
  §39 +2 — the suite had **pinned the defect** (a §36 check asserted the very `guard` line), and
  the new data guard recomputes the unanimity table and demands an exact match. No engine/golden/
  sw change. Shells 1.24.2/12402. Shipped as **TestFlight build 307**. 2026-08-05: Apple
  returned the 1.24.0 (293) submission under **Guideline 2.1** — book content distributed in
  China mainland needs an Internet Publishing License; answered by subtraction — **China
  mainland removed from availability** (174 territories remain) — and the same submission
  resubmitted re-versioned in place as 1.24.2 (307): WAITING_FOR_REVIEW, release type
  AFTER_APPROVAL.
  → [detail](docs/history/RELEASES.md#the-lamps-relit-v1242)
- **v1.24.1 — a spacious place** — the widget-entry freeze, fixed. Entering from a Verse/Quote/Mass
  widget landed correctly and then the app could not be navigated at all: every tab flashed the
  requested page and snapped back, force-quit the only escape; the icon launch was unaffected. The
  OS launch URL is a **latch, not an event** (iOS `ApplicationDelegateProxy.lastURL`, written on
  every `openURL` and never cleared; Android `Bridge.intentUri`, captured once in the Bridge
  constructor), and neither is clearable from the web layer — while React Router's `navigate` is
  memoised on `location.pathname`, so `openWidgetLink` and the widget listener effect that depended
  on it were re-created and **re-run on every route change**, re-reading the latch, re-classifying it
  as a fresh **cold** activation and `replace`-navigating back to the widget's destination (with
  `replace` erasing the requested page so Back could not recover it). The 1200 ms dedupe refreshes
  only on accept, so it never covered a human-cadence tap. Repair in two layers: the listener mounts
  **once** and dispatches through a latest-callback ref, and `claimStartupLaunchUrl` makes the launch
  URL a one-shot per process — the app doing the clearing the platforms will not. Cold-replace,
  warm-push, same-target focus, the Back contract, and Mass → `/readings` unchanged. **The defect
  shipped from v1.18.3**; v1.24.0 made it unrecoverable (push → replace). Both platforms. Refuted en
  route: the focus ring (a CSS `outline`, zero hit-test area) and a stranded scroll-lock. Reproduced
  in real Chrome before the fix. Also fixed: the native widget sync no longer re-runs on unrelated
  settings writes (`individualChurchProper` identity → content fingerprint), which had been dropping
  its native listener and rebuilding the whole local calendar overlay on a theme flip. Harness §36
  +7 checks, all red-first. No engine/data/golden/sw change. Shells 1.24.1/12401. Two release
  gates had to be cleared to ship it: v1.24.0's fail-closed App Group assertion now **reports**
  instead of failing (Apple's side is correct — both App IDs carry `APP_GROUPS` and both profiles
  grant the group; the pipeline archives UNSIGNED, so the archive declares no entitlements and
  export-time re-signing claims none — no build has ever carried it, 293 included, leaving
  `WidgetSharedSettings` inert in distribution; identity drift stays hard), and react-router went
  7.17.0 → 7.18.2, clearing four of five advisories. Shipped as **TestFlight build 304**.
  Outstanding: the device pass, the `npm audit` gate (see below), and the signing repair — all in
  [docs/FOLLOW_UPS.md](docs/FOLLOW_UPS.md).
  → [detail](docs/history/RELEASES.md#a-spacious-place-v1241)
- **v1.24.0 — the doors shall not be shut** — the widget/UI/calendar repair:
  deterministic cold/warm/same-target widget routing now dismisses overlays,
  preserves honest Back history, and focuses Verse/Quote destinations; More ▸
  Widgets reports iOS configurations and offers truthful, allowlisted Android pin
  requests. Android rearms every provider after boot/package/date/time/time-zone
  changes; native calendar readers fail closed. Library/Reader keyboard and
  responsive paths, 44px targets, reduced motion, sheets, theme transitions, and
  the transparent resizing embed are repaired. A versioned Ordinary Form
  calendar-profile boundary supplies all 13 precedence classes, stable IDs,
  source/fingerprint receipts, General Roman + two verified U.S. profiles, and
  explicit fallback; native snapshots span previous year through five future
  years with no-write verification. Lockfile advisories are cleared. Shells
  1.24.0/12400, PWA shell v7. **Not store-ready until the physical iPhone and
  Pixel/Samsung matrix passes.** → [detail](docs/history/RELEASES.md#the-doors-shall-not-be-shut-v1240)
- **v1.23.2 — honour to whom honour** — all nine Garrigou-Lagrange quotations now carry his correct attribution, **Fr. Reginald Garrigou-Lagrange, O.P.**, instead of falsely naming the Dominican priest and theologian a cardinal; the emitted web corpus, manifest, and both native widget calendars were regenerated. Two harness guards pin the source and widget output, and an e2e stale-cache test proves installed PWAs replace the old title: `quotes.json` is now network-first with cache fallback and explicit HTTP-cache revalidation, while downloaded Bible bundles remain untouched. No liturgical-engine or golden-snapshot change; service-worker freshness policy changed without a data-cache-name bump. Shells 1.23.2/12302. → [detail](docs/history/RELEASES.md#honour-to-whom-honour-v1232)
- **v1.23.1 — the lip of truth** — a one-paragraph honesty correction, found by the adversarial post-ship review of v1.23.0: the About paragraph that release added took **both** memory layers as its subject and closed "every entry has been proof-read against its named edition" — true of the 406 history events (all `verified:true`), **false of the saints** (all 366 still `verified:false`, with every Saint page rendering "Sources (draft — pending verification)" underneath). A reader could be told in About that every life was proof-read and told the opposite by the very next screen. The claim is now scoped to the history layer and the lives are named as the sourced drafts they are; a **drift-guard couples the claim to the flags** in both directions (blanket claim while any saint is unverified → red; caveat left behind once they are all verified → red), proved red-first against the v1.23.0 text. Everything else in the review came back clean (corpus recomputed from disk, manifest hashes re-hashed, the no-engine-change claim confirmed by an empty diff). No engine/data/golden/sw change. Shells 1.23.1/12301. → [detail](docs/history/RELEASES.md#the-lip-of-truth-v1231)
- **v1.23.0 — remember the days of old** — the full-year chronicle: **Church history now covers every calendar date (366 days / 406 events)**, matching the saints corpus — 229 new sourced entries (CE 1913 / Butler / Martyrology / vatican.va), proof-read in four quarterly passes (208 clean, 20 corrected, 1 hedged), every `verified` flag true; harness turns red if any date lacks a history event. Corpus rebuilt, manifest re-sealed; no engine/golden/sw change. Shells 1.23.0/12300. → [detail](docs/history/RELEASES.md#remember-the-days-of-old-v1230)
- **v1.22.5 — I am the door** — the widget-entry release: **verse/quote widget taps now land on their own cards** (new `fidelis://verse` → `/#votd` and `fidelis://quote` → `/#qotd` links on iOS + Android, anchored cards on Today, `fidelis://today` kept for installed widgets; Mass still → `/readings`), and **the post-widget-entry freeze is healed at the door** — a sheet torn down by an interrupted background/foreground could leave a *zombie backdrop* (no overlay registered) that defeated the stranded-scroll-lock heal on every later touch: navigation still happened underneath, but the pinned body showed a frozen page until force-quit. The heal now treats a backdrop with an empty overlay stack as a zombie, removes it, and unpins; `appUrlOpen`/`getLaunchUrl` heal before navigating too. Harness: scroll-lock battery +zombie case (red-first), §36 pins the three links + anchors + entry-heal, e2e drives both anchors. Shells 1.22.5/12205. → [detail](docs/history/RELEASES.md#i-am-the-door-v1225)
- **v1.22.4 — the word is very nigh** — the device-fix release: v1.22.2's absence contract had two shapes (404, SPA-fallback shell) but the **native shells have a third**: the bundled corpus is served from disk and iOS's `WebViewAssetHandler` answers a missing file by *failing the URL scheme task* — a fetch rejection with no HTTP status — so an uncovered history day (July 19) kept reading "Church history couldn't be loaded" on device. `fetchDayJson` now resolves null for a rejection **on native only** (no transport to lose on-disk; the web's rejection still means a genuine failure), and **Settings drops the false "Download for offline" affordance on iOS/Android** (no service worker to persist into; the whole corpus ships in the binary — rows now read "On this device"). Harness §37 +2 checks, red-first. Shells 1.22.4/12204. → [detail](docs/history/RELEASES.md#the-word-is-very-nigh-v1224)
- **v1.22.3 — the verity of those things** — the history-chronicle proof-read, closing the §3.4 draft state: all 177 Church-history events checked against their named editions (CE 1913, vatican.va) and corroborating scholarship in twelve per-month passes — day, year, people, documents, quoted words. 155 stood as written; 22 corrected, exactly one a material error (the Porta Pia dead of 20 Sep 1870 were some fifty Italians and nineteen papal soldiers, many Zouaves — not the reverse), the rest quiet slips (Clement VII elected at Fondi, not Avignon; Gregory VII canonized 1728 by Benedict XIII, not 1606 by Paul V; Vatican II over four autumns, not three; Benedict IX deposed at the Roman continuation, not Sutri; Mehmed II entered Constantinople the day of the fall and cut the sack short — 53 days, not 55; the August Fátima apparition fell on the 19th at Valinhos; Cuthbert died on Inner Farne; Leo the Great rests beneath his altar, not in the vestibule; More refused the oath 13 April 1534), two contested details hedged (Theodosius's baptism; Nolasco's merchant origin), four CE citations repaired to articles that exist ("Visigoths", "Crusades", "Saint Bartholomew's Day Massacre", "Mercedarians"). Every event's `verified` flag now true. Corpus rebuilt, manifest re-sealed; no engine/golden/sw change. Shells 1.22.3/12203. → [detail](docs/history/RELEASES.md#the-verity-of-those-things-v1223)
- **v1.22.2 — a book of remembrance** — a bug-fix release for a reported "data error" on the Today page: on July 19 (St. Macrina the Younger) the "Today in the Church" card showed the Saint of the Day but declared underneath "Church history couldn't be loaded — it will return with your connection," as though offline, when the day simply had no Church-history event in the chronicle (147 of 366 days covered). Cause: the per-date loaders `loadSaints`/`loadHistory` were written to a "**only a 404 is absence**" contract (v1.21.0), but on every host Fidelis ships to — the static PWA host, `vite preview`, and the Capacitor iOS/Android shells — a missing file is answered by the **SPA fallback** (`index.html`, HTTP **200**, `text/html`), never a real 404; `!r.ok` passed, `r.json()` choked on `<!doctype html>`, the promise rejected, and an uncovered day looked like an offline blip. Fix: a shared `fetchDayJson<T>` helper resolves `null` for a 404 **and** for a 200-with-HTML-shell (both mean "no entry for this day on this host"), while a genuine transport error (offline, 5xx, corrupt non-shell JSON) still rejects so the honest notice stays reachable; memoize/drop-on-rejection unchanged. Harness §37 rewritten (three checks, red-first); a new e2e test fulfills the 200-HTML shell and asserts the card stays calm. No engine/data/golden/sw change. Shells 1.22.2/12202. → [detail](docs/history/RELEASES.md#a-book-of-remembrance-v1222)
- **v1.22.1 — decently and in order** — the UI polish batch (audit UX findings): the NABRE fallback notice once per Mass page (was per-reading) and re-worded; lectionary code off the Mass footnote; manifest hash out of Settings; the Mass select untruncated at ≥640px; `lang="la"` on the footer motto and rosary Latin name; a one-line reading-plans explainer on the Read tab; dependent commentary switches visually nested; TestFlight/App Store metadata reconciled to the package version and guarded against drift. Harness §39 (11 checks; the 10 UI checks were red-first). Shells 1.22.1/12201; no engine/golden/sw change. → [detail](docs/history/RELEASES.md#decently-and-in-order-v1221)
- **v1.22.0 — knowledge shall be manifold** — the enrichment release: **all 543 memory entries rewritten deep** (366 saints + 177 history events, ~100→150–200 words, ≥5 concrete facts each, patronage reasons, the 68 no-year bios given their chronology) in 46 research-verified drafting batches against CE 1913/Butler/Martyrology/vatican.va, contested details hedged, dozens of old-prose errors corrected, every entry still `verified:false` per §3.4; **the 18 same-day saint∩history pairs now complement** (events rewritten to a different angle) and **the Today card's history lead skips the saint's own subject** (`leadHistoryEvent`, pure + harness-tested); **the stranded-scroll-lock nav freeze hardened past v1.20.1** — the heal predicates on the body's actual pin (count-0 strands heal), fires on every pointerdown and native `appStateChange`, and skips scroll restoration on route change (§25 b3–b6, red-first); **five corpus-integrity gates** (one saint per day, person-name/title collision bans, shortBlurb ellipsis, corpus↔emitted byte sync). Shells 1.22.0/12200; no engine/golden/sw change. → [detail](docs/history/RELEASES.md#knowledge-shall-be-manifold-v1220)
- **v1.21.0 — that nothing be lost** — the audit-fix release: the 2026-07-16 external audit of v1.20.1 verified claim-by-claim (all eight findings confirmed; two recalibrated — the storage defect **worse** than written, the privacy finding **stronger**), then closed in full with the verification sweep's own finds. **The storage shadow** (FID-STOR-002): a refused `localStorage` write now lives in a session shadow that reads prefer — the UI stays consistent, a later settings change can no longer visibly revert an earlier one (the `setSettings(saveSettings(patch))` rebase bug), **Export genuinely contains the refused marginalia**, the next successful write re-persists every stranded key, `importMarginalia` reports `persisted:false` honestly, and the banner promises exactly this ("kept for this session only"); read path hardened (`readList` degrades corrupt non-array stores, `getLastRead` shape-guarded — one bad `plans` key used to blank Today via `activePlan()`). **Honest loader failures**: `loadSaints`/`loadHistory` treat only a 404 as absence and reject on transport failure, so Home's dead "failed" notice renders (new `saintFailed` track — the calm "being gathered" line was false with all 366 dates covered) and the Saint/History pages say "couldn't be loaded" instead of claiming absence. **One record per event** (FID-CONTENT-001): the six same-day-same-year duplicate pairs merged (curated ids kept, fuller prose adopted), `build-history.mjs` hard-fails unallowlisted day+year pairs, four feast-keyed events moved to the dates they happened (Chrysostom/Cyprian → Sep 14, Mercedarians → Aug 10, Edict of Milan → Jun 13; 183→177 events), Francis' rank Feast→**Memorial** (it contradicted the engine on-screen every Oct 4), David of Wales→Commemoration, Patrick `opt:true` — goldens byte-identical. **Privacy honesty** (FID-PRIV-001, disclose): backups stay enabled; PRIVACY.md gains a Device backups section, drops "Deleting the app deletes all of it.", qualifies "never transmitted" *by Fidelis*; the same absolutes softened across SECURITY/README/APP_STORE/About/Settings/Library/Translations; a §38 drift-guard couples `allowBackup="true"` to the disclosure. Screenshots regenerated (FID-REL-001; stale iPad set removed). Harness §37/§38 (all red-first); e2e 13→16. Shells 1.21.0/12100. Maintainer follow-ups: live ASC listing line, device backup/restore pass. → [detail](docs/history/RELEASES.md#that-nothing-be-lost-v1210)
- **v1.20.1 — them that are fettered** — a bug-fix release for a TestFlight report ("Read at Mass goes nowhere"). On-device it was app-wide: **every nav tab and "→" button dimmed on tap but didn't navigate, fixed only by force-quitting** — the tell of a stranded global lock, not routing. Cause: modal sheets pin the page with `body { position: fixed }` (the iOS-safe, reference-counted scroll-lock in `src/lib/scrollLock.ts`); the count assumes every `lockScroll` is paired with an `unlockScroll` in a React effect cleanup, but an iOS WKWebView can tear a sheet down **without running that cleanup** (a native share/permission dialog or a background/foreground mid-teardown), stranding `position: fixed` on the body — the route still changes on a tap but the new page is pinned out of view ("nothing happens"); a relaunch reset the count. Fix: **`resetScrollLock()` self-heal** wired in `src/App.tsx` on route change + foreground-resume, guarded by a `.sheet-backdrop` DOM check so it never disturbs a legitimately-open sheet — so the next tab tap both navigates and un-freezes the app, no restart. Real logic test (leak→heal) + source-shape guards. No engine/data/golden/sw change. Shells 1.20.1/12001; needs a native build for TestFlight. → [detail](docs/history/RELEASES.md#them-that-are-fettered-v1201)
- **v1.20.0 — a great multitude** — a Saint of the Day for **every day of the year**. v1.19.0 gave the Saint a home but only 53 lives, so most mornings still showed the "being gathered" placeholder. This release fills the calendar: **366 saints — one for every date (Feb 29 included)** — drawn from the General Roman Calendar and the Roman Martyrology, plus a **history chronicle grown 15→183 events** across 150 days, each richer. Built by twelve per-month research passes, merged over the curated 53 (existing win), then run through the provenance gate and audited (full coverage, unique ids, schema, sourcing; spot-checked against known feasts — all correct). **The honest-sourcing problem is solved**: modern saints (Kolbe, Padre Pio, JP2, Cabrini, Maria Goretti, Bakhita, Edith Stein, Faustina, the Korean/Ugandan martyrs) have no public-domain biography, so a new **`"church-official"`** source license (vatican.va, drawn faithfully, labelled honestly) sits beside `"public-domain"`; the build gates + harness now require **at least one of the two**, and an audit found **zero** false PD citations. Pre-1900 figures still stand on Catholic Encyclopedia 1913 / Butler / Roman Martyrology. Every entry is `verified:false` (a sourced draft; the proof-read is the maintainer's next step). Harness §35 now turns **red if any of the 366 dates lacks a saint**. No engine/golden/sw change — pure data + the one-license gate widening. Shells 1.20.0/12000. → [detail](docs/history/RELEASES.md#a-great-multitude-v1200)
- **v1.19.0 — men of renown** — the Saint of the Day, made visible. v1.18.0 built the saints/history corpora but wired the Saint into the Today page only as a faint link on the Mass card's memorial name — too quiet to notice, and dependent on the engine already naming the day's saint. It failed outright on **St. Bonaventure's own memorial, July 15**: he was **missing from the sanctoral table** in `liturgical.ts` (the "no Saint at all" bug), so the engine called the day a plain green feria and the ready-made life never appeared. Fixed: Bonaventure added (July 15 now a white memorial in both regions; golden re-blessed, scoped to that day; ferial readings untouched; explicit harness assertion). The **"Today in Church History" card is reworked into "Today in the Church"**: it leads with the **Saint of the Day** — a gold monogram medallion (gold honors), name/title/rank/dates, blurb, patronage, "Read the life →" — with the day's history event below a hairline; the Saint is **decoupled from the sanctoral engine** (shows on any day a life exists, even a feria). To keep the six-card rule, the **Mass card is retitled "Today at Mass"** (its widget name), freeing the banner and resolving the old near-duplicate title. The **corpus grows 10→53 saints and 8→15 events** across every month, drawn from public-domain sources (Catholic Encyclopedia 1913, Butler's *Lives*, the *Jesuit Relations*, *Story of a Soul*), each `verified:false`; truly modern saints with no PD source (Kolbe, Padre Pio, JP2, Cabrini) are **left out rather than falsely cited**. The native widget **`calendar.json` is regenerated** (carries Bonaventure; re-syncs the deterministic mulberry32 quote rotation that had been stale since v1.14.1; iOS/Android byte-identical). Shells 1.19.0/11900; no sw change. → [detail](docs/history/RELEASES.md#men-of-renown-v1190)
- **v1.18.5 — the ancient bounds** — a harness-hardening release, no application code and no behavior change: it turns two written-down policies into red-`npm test` guarantees after a post-ship adversarial review swept v1.18.2–v1.18.4 and found **no** runtime defect (widget deep links, the Report-Only CSP, and all nine P3 fixes verified correct). The **widget/Siri region is now harness-pinned** (FID-NATIVE-001): `build-calendar-widget.ts` fixes `REGION = "usa"` by design (the widgets/Siri follow the USCCB calendar even when the app is switched to Universal; see the iOS guide's "Region policy"), but nothing turned the suite red if it were flipped — the exact standing concern v1.18.4 recorded; a one-line §36 source-shape guard now pins it, verified to fail when the region is changed to `universal`. The **CSP drift-guard now also pins the *built* artifact** (FID-SEC-002): v1.18.3's §36 hash gate computed the pre-paint script's sha256 from the *source* `index.html`, but the browser loads the *built* `dist/index.html` — byte-identical today (Vite passes the inline script verbatim; recomputed and confirmed), so nothing was wrong, but the guard watched the unshipped file; §36 now also asserts, whenever a `dist/` exists, that its pre-paint script matches source (skipped on a bare `npm test` with no build, so it never false-fails CI). The stale README badge (drifted to 1.18.2 because v1.18.3/v1.18.4 never bumped it) is corrected. Shells 1.18.5/11805; no engine/data/golden/sw change. → [detail](docs/history/RELEASES.md#the-ancient-bounds-v1185)
- **v1.18.4 — come and see** — the Mac-only pass: the release-ops + native-acceptance batch the Linux audit environment couldn't run (audit §2.2, §10, FID-REL-001). **No application code changes** — no engine/data/golden/sw change; only screenshots, native version strings, and docs move. The **App Store screenshots** are regenerated against the v1.18.4 Release web bundle (FID-REL-001): the 2026-07-13 set predated the Collapsing Masthead and advertised the retired bottom bar — a self-declared release blocker. The shells wrap the same `dist/`, so a headless-Chrome capture at the device's pixel geometry (428×926 @3× → 1284×2778 iPhone 6.9″; 1024×1366 @2× → 2048×2732 iPad 12.9″) is faithful; every frame now carries the masthead, none a bottom bar, day/night on current tokens, first three tell Today→Reader→Mass. The capture harness is now **committed** (`scripts/capture-appstore.mjs`) so it can't go stale in a scratchpad again. The **§10 native acceptance checklist** was worked item by item in three honest tiers: *confirmed on the Mac* (Xcode 26.6 + Simulator + build inspection — the Release archive embeds the widget extension/icon/`PrivacyInfo.xcprivacy`/current bundle, no night-launch Day flash, safe areas resolve once, region policy explicit); *re-confirmed in simulator/browser* (masthead scroll+pinned tabs, sheet freeze/scroll/restore, airplane-mode reads the whole bundled corpus); and *handed to the maintainer as a [device checklist](docs/guides/DEVICE_ACCEPTANCE.md)* — VoiceOver order/pronunciation, live Dynamic Type at the largest category, the keyboard-vs-docked-action-bar interaction, edge-swipe Back, add-only Photos, widget families + midnight/tz refresh, Siri — to run from this TestFlight build. Two concerns surfaced and recorded (not fixed) in this verify-only pass: the light-pinned native night-launch splash, and the region policy that is explicit but not harness-pinned. Native versions reconciled to 1.18.4/11804 and the signed build shipped via `scripts/ios-testflight.sh`; `APP_STORE.md` refreshed (stale banner dropped; six-card Today + post-masthead controls). No harness change. → [detail](docs/history/RELEASES.md#come-and-see-v1184)
- **v1.18.3 — faithful in little** — the audit's P3 polish sweep, nine small items closed together (FID-FUNC-010/011, UX-003/004/005, PERF-004, NATIVE-002, SEC-001/002): the **embeddable VOTD** now draws its date from `useToday()`, so a long-lived `<iframe>` embed rolls at midnight instead of freezing (FUNC-010); a **parallel-pane load failure** raises a quiet Reader notice (with a Translations link for import-only panes) instead of a silent single-column fallback (FUNC-011); **Copy** flashes one polite `role="status"` line for success AND clipboard failure, near the action bar (UX-003); `.widget-grid`'s min track becomes `minmax(min(300px,100%),1fr)` so the 320px card gutters stay even (UX-004); **Search autofocus** is gated on `(hover:hover) and (pointer:fine)`, so touch phones no longer pop the keyboard over the results (UX-005). The **home-screen widgets gain real tap targets** via a new custom `fidelis://` scheme — Mass→`/readings`, Verse/Quote→Today — carried by iOS `widgetURL` + `Info.plist` `CFBundleURLTypes`, Android intent-data + a `MainActivity` intent-filter, and routed in `App.tsx` through Capacitor `appUrlOpen`/`getLaunchUrl` on both platforms (NATIVE-002). The native `calendar.json` decode is **memoized** — iOS lock-guarded process-local, Android a `SoftReference` shared by `CalendarWidget`/`QuoteWidget` (`CalendarData.java`) (PERF-004). A **Content Security Policy** ships in **Report-Only** mode via `public/_headers`, allowing the inline pre-paint script by a SHA-256 hash the harness recomputes on drift; enforcing-`<meta>` migration documented + deferred in the new [docs/SECURITY.md](docs/SECURITY.md) (SEC-002). "Texts verified" → **"verified at build"** in Settings/About, so the manifest seal reads as a build-time guarantee, not a runtime cache check (SEC-001). Harness **§36** guards all nine; shells 1.18.3/11803; no engine/data/golden/sw changes. → [detail](docs/history/RELEASES.md#faithful-in-little-v1183)
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

## Mnemoverse Memory — always use it

You have persistent memory across sessions via the Mnemoverse MCP tools
(memory_read, memory_write, memory_feedback). Treat it as required, not optional:

- Recall first. At the start of every task — and whenever the user references a
  past decision, preference, or fact — call memory_read BEFORE answering. Never
  assume a cold start.
- Save as you go. Call memory_write whenever the user states a preference, makes
  a decision, corrects you, or shares a durable fact (stack, conventions, people,
  gotchas) — even without being asked.
- Close the loop. After a recalled memory helped or misled, call memory_feedback
  so retrieval improves over time.

Never tell the user "I don't have memory of that" without first calling memory_read.

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds six cards** (raised from five in v1.18.0 for Today in Church History). A new feature earns a line inside an existing card or lives on another tab before it earns a card.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
