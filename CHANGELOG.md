# Changelog

[← Docs index](docs/INDEX.md)

All notable changes to Fidelis. Format follows [Keep a Changelog](https://keepachangelog.com/);
versioning is semantic. The liturgical engines, the bundled texts, and the harnesses are the
product — changes to any of them are release-worthy.

## [1.24.5] — 2026-08-10 — kept faithfully (store page)

*"Thy word is truth." (John 17:17)*

A **product-page release** — no engine, corpus, golden, or service-worker change.
The live App Store was still serving the pre-caption iPhone **6.7″** screenshot set
(the slot modern phones prefer), even though captioned frames had been uploaded to
6.5″ and iPad. This release replaces every screenshot slot with the captioned
set and rewrites the listing so it leads with the README mission.

### Changed

- **Screenshots:** APP_IPHONE_67, APP_IPHONE_65, and APP_IPAD_PRO_3GEN_129 all carry
  the purple brand band + gold hairline captions. The old uncaptioned 6.7″ PNGs
  are gone from the submission version.
- **Description** opens with: *Fidelis: Catholic Bible — kept faithfully.* and the
  full mission paragraph (*the text is not ours to edit… Just the text, kept.*),
  then the Bible / liturgy / every day / study / devotion / pledge sections.
- **Promotional text** carries the same conviction (within Apple's 170-character
  limit). **Keywords** keep the ASO set including `lectionary` and `bible`.

### Notes

- Shells 1.24.5 / 12405. **Build 328** uploaded, attached, and submitted
  2026-08-10 → **WAITING_FOR_REVIEW** (AFTER_APPROVAL). Submission id
  `2af85e8d-a97e-4e60-aea2-556d7ed5212d`. Public store still shows **1.24.4**
  media until approval. Repo mirror: PR #95. Full narrative:
  [RELEASES.md](docs/history/RELEASES.md#kept-faithfully--store-page-v1245).
- **Method note (for next listing pass):** captioned frames must land on
  **APP_IPHONE_67** as well as 65 + iPad; the public iPhone gallery prefers 6.7″.
  Post-approval versions cannot replace screenshots — stage a new version.

## [1.24.4] — 2026-08-07 — the fruitless branch

*"Every branch in me that beareth not fruit, he will take away." (John 15:2)*

The release that turns CI green again. Every pull request and every push to `main`
had read `build fail 20s` since 2026-07-24: the audit gate is the **first** step
of the `build` job, so lint, the harnesses, the build, and the doc-link check
never ran at all. **No user-visible change, no engine, corpus, golden, or
service-worker change.** Shells 1.24.4 / 12404.

### Fixed

- **The production audit gate: `react-router-dom` retired for `react-router` 8.3.0.**
  [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) (RSC-mode
  CSRF bypass, high) covers react-router **7.12.0 – 7.18.1** and **8.0.0 – 8.2.x**.
  npm could not route out of it, and the reason was structural rather than a
  missing publish: the dependency was `react-router-dom`, whose latest version —
  and **final** version — is 7.18.2, because since v7 that package is a deprecated
  three-line shim (`export * from "react-router"` plus two `react-router/dom`
  re-exports). Every version npm could select therefore drags in a 7.x
  `react-router`, so the only direction the resolver could find was *backwards*,
  which is why `npm audit fix --force` kept offering to downgrade to 7.11.0. The
  fix is to delete the shim and depend on `react-router` **8.3.0** directly — the
  advisory's own patched 8.x release. **`npm audit fix --force` was not taken.**
- **The complete-graph audit gate**, which had never once run: `npm audit --omit=dev`
  exits first, so the step behind it was invisible. It was red too — `postcss`
  8.5.15 → **8.5.26**, `js-yaml` 4.3.0 → **4.3.1**, `brace-expansion` 1.1.16 →
  **1.1.18** and 5.0.8 → **5.0.9** (plus `nanoid` 3.3.12 → 3.3.18 carried along by
  postcss). All lockfile-only, no breaking change, no `overrides` needed.
- **The lockfile's own version had drifted** to 1.24.1 while `package.json` read
  1.24.3 (two releases bumped one and not the other); both now read 1.24.4.

### Changed

- **21 import sites** in `src/` moved from `react-router-dom` to `react-router`.
  Ten symbols are in use — `HashRouter`, `Link`, `NavLink`, `Route`, `Routes`,
  `useLocation`, `useNavigate`, `useNavigationType`, `useParams`,
  `useSearchParams` — and all ten are exported by `react-router` 8.3.0, verified
  by importing the installed package rather than by reading its documentation.
- `AGENTS.md`'s stack section names `react-router` v8 and the retired shim.

### Notes

- **Why the v8 majors do not reach this app.** The v8 breaking changes are
  `react-router-dom`'s removal (this release's subject), a Node ≥ 22.22.0 floor
  (CI pins 22, currently 22.23.2) and React ≥ 19.2.7 (we declare `^19.2.7`), and
  then a list confined to the data-router / RSC / framework surface Fidelis does
  not use: `hasErrorBoundary` inference, `future.v8_*` flags becoming mandatory,
  always-on middleware, `RouterContextProvider` in loader context, `data` →
  `loaderData` on meta types, and ESM-only publishing. Fidelis is a static,
  offline, client-only SPA on `HashRouter` with declarative `<Routes>`/`<Route>`:
  no loaders, no actions, no server. 8.3.0 also stopped percent-encoding
  `$ & + , ; = : @` in path segments — every route parameter this app generates
  (`:translation`, `:book`, `:chapter`, `:day`, `:id`) is a lowercase slug, and
  all 78 book ids, 772 saint/history ids, and 366 day keys were checked to contain
  none of those characters.
- **`useNavigate`'s identity still memoises on `location.pathname`** in v8
  (`useNavigateUnstable` is unchanged), so the explanatory comments left by
  v1.24.1's widget-entry fix in `src/App.tsx`, `src/lib/widgetLinks.ts`, and the
  §36 harness commentary remain accurate and were left standing. That fix does not
  depend on the memoisation either way — it mounts once and gates the launch URL.
- **The bundle is net flat**: total `dist/assets` JavaScript 555,257 → 553,779
  bytes. The main chunk falls 461.5 → 439.9 kB and v8 splits a 20.0 kB `hooks`
  chunk out of it.
- **The advisory never applied to this app.** It concerns React Server Components
  mode with server actions; the vulnerable code path does not exist in a
  client-only `HashRouter` SPA. That is why shipping continued while the gate was
  red — and it is not a reason to leave a gate broken, which is why this release
  closes it rather than allowlisting it.
- **What was reproduced, and what was not.** Both gates were re-run against the
  **pre-fix** tree using CI's own pinned client (`npm@11.17.0`), not just the
  local one. The complete-graph failure reproduces exactly — the same three high
  advisories — so that half of the red is certain and current. The `--omit=dev`
  failure did **not** reproduce: the advisory feed reachable from this environment
  serves GHSA-qwww-vcr4-c8h2 as **two** ranges, `>=7.12.0 <7.18.2` and
  `>=8.0.0 <8.3.0`, under which 7.18.2 is already the patched 7.x release, while
  CI at 14:59 UTC on 2026-08-07 printed the collapsed `7.12.0 - 8.2.0` that spans
  the 7.18.2 gap. Whether that is upstream metadata being corrected after the run
  or a difference between advisory feeds could not be settled from here — and it
  is exactly why the fix is a migration rather than a wait. **8.3.0 sits outside
  the advisory under either reading**, collapsed or split, so the gate closes
  without depending on someone else's data staying corrected.
- **Store.** v1.24.3 (the listing rename) was approved and released 2026-08-07;
  1.24.4 was staged in ASC the same evening — metadata copied forward, fresh
  What's New, the Guideline 2.1 notes paragraph dropped (2,916 → 2,414 code
  points), build 322 attached — and **submitted: WAITING_FOR_REVIEW**, release
  type AFTER_APPROVAL.

### Added

- **Harness §40 (10 checks, all proven red-first)** pins the decision from both
  ends. The shim cannot creep back (no `src/` file may import it; neither
  `package.json` nor any node in the lockfile may name it); the version cannot
  walk back into the advisory (a declared **and** locked 8.3.0 floor, with the
  floor comparison itself tested against 7.18.2 and 8.2.0 so it cannot pass a
  downgrade); every symbol `src/` imports from `react-router` must really be
  exported by the installed package, with the symbol list read off the source
  rather than hardcoded; and — because the cheapest way to turn a red audit green
  is to delete the step — **both** audit steps must remain in `ci.yml`, with
  neither `|| true`, `--audit-level`, nor an allowlist swallowing the result.

## [1.24.3] — 2026-08-07 — called by name

*"I have called thee by thy name: thou art mine." (Isaiah 43:1)*

A store-listing release after the App Store debut of v1.24.2: clearer product
name, keyword and description hygiene, What's New filled in, and captioned
screenshots so Apple's OCR can index the product page. **No liturgical engine,
corpus, or service-worker change.** Shells 1.24.3 / 12403.

### Changed

- **App Store name:** `Fidelis-Bible` → **`Fidelis: Catholic Bible`** (home-screen
  label remains **Fidelis**). Subtitle unchanged: *The Catholic Bible & Missal*.
- **Keywords** (en-US): drop `catholic,bible` (already indexed via name/subtitle);
  add `saint,prayer,holy` for cross-field combos — 94/100 characters.
- **Description:** the Mass-readings bullet now names the **lectionary** (was the
  only keyword not echoed in the copy).
- **What's New:** filled for this update (was empty on the first public version).
- **Screenshots:** 10 iPhone + 8 iPad frames with brand caption bands (purple-strong
  canvas, EB Garamond, gold hairline) — OCR-indexed by App Store search.
- **Repo mirror:** `metadata/` + `scripts/caption-screenshots.py` for the caption
  pipeline; large assets stay under gitignored `appstore/`.

### Notes

- Live **1.24.2** keeps the old store name until this version is approved and
  released. ASC version 1.24.3 is prepared with the new listing.
- Exact-name search lag on launch day is expected (new app, zero ratings); re-check
  after a few days with the store link, not only free-text search.

## [1.24.2] — 2026-07-31 — the lamps relit

*"No man lighteth a candle, and putteth it in a hidden place, nor under a bushel;
but upon a candlestick, that they that come in may see the light." (Luke 11:33)*

A bug-fix release for a reported home-screen regression: **Today at Mass** and
**Quote of the Day** both read "Open Fidelis to update" and never stopped, no
matter how many times the app was opened. **Verse of the Day**, alone, kept
working.

### Fixed

- **The calendar widgets went blank on every device, and could not recover.**
  v1.24.0's widget repair gave `loadCalendar()` a new first line —
  `guard WidgetSharedSettings.isAvailable else { return nil }` — so the Mass and
  Quote widgets refused to draw unless the Widget Extension could read the app's
  selected calendar jurisdiction through the App Group. The reasoning was sound
  (a widget must not present one jurisdiction's propers as another's), but the
  premise was false: **that entitlement had never once shipped.**
  `scripts/ios-testflight.sh` archives UNSIGNED — the way past a device-less
  account being unable to mint a development profile at archive time — and
  entitlements are written into a binary by the *signing* step. An unsigned
  archive declares none, and `xcodebuild -exportArchive` re-signs from what the
  archive declares, so `group.app.fidelis.bible` was registered on both App IDs
  and granted by both provisioning profiles and still never reached a device.
  `isAvailable` was therefore permanently false in distribution, and the two
  calendar-derived widgets were permanently empty. Verse of the Day reads
  `votd.json` and never consults the group, which is exactly why it alone
  survived — and why the failure looked like bad data rather than a dead
  entitlement. Opening the app could not help: there was no shared container to
  write to. **Android was never affected** (`WidgetSharedSettings.calendarProfile`
  falls back to `roman.us.ascension-sunday`, and in-package SharedPreferences are
  always readable).
- **The signing pipeline now makes the archive declare its entitlements.** A new
  step [2b/6] ad-hoc signs the archived `.appex` and `.app` with their committed
  entitlements files before export — nested code first — which needs no
  provisioning profile, so the original reason the archive stays unsigned is
  untouched. Export then re-signs with the real App Store distribution profile,
  which grants the group. Verified against a real export before being relied on:
  the IPA's app **and** widget both carry
  `com.apple.security.application-groups: ["group.app.fidelis.bible"]`, the first
  build in the project's history to do so. Manual signing was tried first and
  rejected — an iOS device build refuses an empty
  `PROVISIONING_PROFILE_SPECIFIER` under `CODE_SIGNING_REQUIRED` both YES and NO.
- **A missing App Group can no longer blank a widget, ever again.** Failing
  closed is now per **day**, not per widget. When nothing tells the extension
  which jurisdiction the app is set to — no App Group, or a container that exists
  but has never been written on an install whose app has not yet run — the
  snapshot's own default profile stands in, but the day is served **only where
  every supported profile resolves it identically**. No jurisdiction is guessed;
  a day whose answer genuinely depends on the selection is withheld and still
  says "Open Fidelis to update". `scripts/build-calendar-widget.ts` computes the
  table at build time into a new `unanimity` key: **2,447 of 2,556 days (95.7%)
  for the Mass surface** and **2,221 (86.9%) for the Quote surface**, gated
  separately because they read different fields. The two diverge mostly in 2029,
  where a single early-January sanctoral difference cascades through that year's
  quote rotation — `quoteOfTheDay()` is a function of (date, profile) by design,
  since feast-day authors speak first.
- **Siri keeps the same rule.** `TodaysGospelIntent` carried its own copy of the
  `isAvailable` gate, so "today's Gospel" had been silent on every build too. It
  now answers whenever the day is unanimous and says nothing when it is not — a
  spoken answer cannot carry a caveat.
- **The App Group is enforced again at release time.** v1.24.1 downgraded
  `scripts/ios-release-contract.ts` to a warning because failing closed blocked
  shipping while protecting something that had never worked. Now that the
  entitlement genuinely ships, it is a hard failure again: a build whose widgets
  cannot read the app's calendar selection does not leave this machine.
  `FIDELIS_VERIFY_ONLY=1` runs the whole archive → export → assert path and
  stops before validation and upload, so a signing change can be proved without
  spending a build number.

### Tests

- Native (`ios/App/AppTests/WidgetContractsTests.swift`), 13 → **18**: an unknown
  jurisdiction speaks only for unanimous days and stands in with the default
  profile rather than refusing; a known jurisdiction ignores the table entirely;
  a snapshot carrying no `unanimity` table still decodes and stays fail-closed
  (an older snapshot must never blank a working widget); Siri returns nil on a
  divergent day and the agreed citation on a unanimous one; and the **committed**
  `calendar.json` is required to serve **today** on both surfaces with nothing
  shared at all. The Siri divergent-day assertion is genuinely red against the
  old resolver, which fell back to the default profile and answered.
- Harness §36 +7, §39 +2. The suite had **pinned the defect**: a §36 check
  asserted the literal string `guard WidgetSharedSettings.isAvailable else
  { return nil }`, so removing it turned `npm test` red until the guard was
  rewritten. The new data guard **recomputes the unanimity table from the
  emitted profiles and requires an exact match**, so a stale or hand-edited
  table cannot let a widget speak for a jurisdiction-dependent day.
- No engine, golden, or service-worker change. `calendar.json` regenerated for
  both shells (byte-identical across iOS and Android). Shells 1.24.2/12402.

## [1.24.1] — 2026-07-31 — a spacious place

*"Thou hast not shut me up in the hands of the enemy: thou hast set my feet in a
spacious place." (Psalm 30:9)*

A bug-fix release for a TestFlight report: entering Fidelis from a home-screen
widget landed on the right card every time, but the app then could not be
navigated at all.

### Fixed

- **The app can be navigated after entering from a widget.** Tapping a Verse,
  Quote, or Mass widget opened its destination correctly, but every later tab or
  link then flashed the requested page and snapped straight back, with no way out
  short of force-quitting. Launching from the app icon was unaffected — the tell
  that the fault lay in widget entry, not in routing.

  The OS launch URL is a **latch, not an event**. iOS stores it in
  `ApplicationDelegateProxy.lastURL` (written on every `openURL`, cleared never)
  and Android in `Bridge.intentUri` (captured once in the Bridge constructor and
  never refreshed), so `getLaunchUrl()` keeps answering with the same widget URL
  for the whole process, and neither latch can be cleared from the web layer.
  Meanwhile React Router's `useNavigate()` returns a function memoised on
  `location.pathname`, so `navigate` — and therefore `openWidgetLink` — took a new
  identity on every route change, and the widget listener effect that depended on
  it tore down and re-ran each time, re-reading the latch. Each re-read was
  classified as a fresh **cold** activation and `replace`-navigated the person
  back to the widget's destination, `replace` erasing the page they had asked for
  so Back could not recover it either.

  The listener now mounts **once** and dispatches through a latest-callback ref,
  and the launch URL passes a one-shot gate (`claimStartupLaunchUrl`) that yields
  it exactly once per process and null on every re-read — the app doing the
  clearing the platforms will not do. Cold-replace, warm-push, same-target focus,
  the Back contract, and the Mass → `/readings` destination are unchanged. The
  defect had shipped since v1.18.3; v1.24.0 did not introduce it but made it
  unrecoverable by changing the bounce from `push` to `replace`. Both platforms
  were affected.

### Changed

- **The native widget sync no longer re-runs on unrelated settings.**
  `getSettings()` rebuilds `individualChurchProper` on every read and
  `saveSettings()` spreads that fresh read, so any settings write — a theme flip,
  a font change — handed back an identical-but-new object. The widget-sync effect
  depended on that identity, so it dropped and re-added its native
  `appStateChange` listener, restarted its debounce, and rebuilt the entire
  multi-year local calendar overlay for changes that could not affect it. It now
  keys on the canonical content fingerprint the layer already publishes.

### Changed (release tooling)

- **The signed-IPA App Group check is a warning, not a hard failure.** v1.24.0
  added a fail-closed assertion that the signed app and widget both carry
  `group.app.fidelis.bible`. It blocked this release — and investigation showed
  it was asserting an invariant the pipeline has never satisfied.
  Apple's side is entirely correct — verified 2026-07-31 that both App IDs carry
  the `APP_GROUPS` capability and that each Xcode-managed provisioning profile
  grants `group.app.fidelis.bible`. The loss is ours:
  `scripts/ios-testflight.sh` archives **unsigned** (the documented way past a
  device-less account being unable to mint a development profile at archive
  time), so the archived binary carries no entitlement blob;
  `xcodebuild -exportArchive` re-signs from what the archive declares, and an
  archive that declares nothing yields a binary that claims nothing. The App
  Group the profile freely grants is never asked for. So no build this pipeline
  has produced ever carried it, build 293 included, and
  `WidgetSharedSettings` has been inert in distribution since v1.24.0 — the
  widgets run from bundled `votd.json` / `calendar.json`. The check now reports
  and continues. **Bundle-identifier, marketing-version, and build-number drift
  between the app and its widget remain hard failures.** Repairing the signing
  pipeline so the archive carries its entitlements is tracked separately.

### Security

- **react-router / react-router-dom 7.17.0 → 7.18.2.** Five advisories were
  published against 7.17.0 after v1.24.0 shipped, turning `main`'s CI audit gate
  red on 2026-07-24. The bump clears four of them, including
  [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) (open
  redirect via a backslash in `<Link>` and `useNavigate`), the only one of the
  five that applies to a client-side router. Verified against the whole gate:
  1,028 harness checks, 31 browser tests, build, lint. `useNavigate` is
  semantically unchanged in 7.18.2 — still memoised on `location.pathname` — so
  the fix above is neither obviated nor altered by the upgrade.
- **One advisory remains and cannot currently be cleared.**
  [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) (RSC
  mode CSRF bypass) covers 7.12.0–8.2.0; no fixed version is published, so npm's
  only remedy is a downgrade to 7.11.0. It concerns React Server Components mode
  with server actions. Fidelis is a static, offline, client-only SPA on
  `HashRouter` — no server, no RSC, no server actions, no data router — so the
  vulnerable code path does not exist in this app. The CI audit gate therefore
  stays red on this one item until upstream publishes a fix.

### Tests

- Harness **§36** gains seven checks, each proved red against the pre-fix source:
  the launch URL is claimable once per process, an icon launch's empty latch stays
  empty, a re-read yields no activation to replay, the listener effect's shape is
  pinned (ref dispatch, empty dependency array), two independent reads of one
  stored proper carry one fingerprint while a real change moves it, and App keys
  the sync on the memoised proper.
- The freeze was first reproduced outside the harness in real Chrome, driving the
  app's own `widgetLinks` policy under the repo's React Router: a cold
  `fidelis://verse` launch followed by a tab tap returned to `/#votd`, while an
  identical run with no launch URL navigated normally.

No engine, data, golden-snapshot, or service-worker change. Shells 1.24.1/12401.

## [1.24.0] — 2026-07-23 — the doors shall not be shut

*"And the gates thereof shall not be shut by day." (Apocalypse 21:25)*

A widget, navigation, accessibility, motion, and Roman-calendar repair release.

### Fixed

- **Widget entry is deterministic.** Cold links replace history, warm links push
  only when the destination changes, duplicate delivery is coalesced, and every
  live overlay is dismissed before navigation. Verse and Quote links scroll and
  move focus to their cards. Back now returns to the caller instead of revisiting
  a synthetic launch entry. The iOS shell bridges a committed left-edge gesture
  into React Router's same-document history, so edge-Back consumes that same
  warm-entry history without letting WebKit leave the app at its root. If
  WKWebView retains a duplicate same-hash entry around native activation, the
  coordinator uses the versioned router cursor to discard the duplicate before
  returning to the caller. A rightward-horizontal begin gate and simultaneous
  WebView recognition keep vertical or diagonal edge scrolling available.
- **Native widgets fail closed and refresh at civil-time boundaries.** Android
  rearms all instances on boot, package replacement, date, manual-time, and
  time-zone broadcasts. Both platforms validate the calendar schema, expiry,
  selected profile, fingerprint, exact lectionary-corpus fingerprint, and date
  before displaying data. iOS does not cache clock-invalid snapshots and does
  not substitute a default jurisdiction when its App Group is unavailable.
  Invalid data says "Open Fidelis to update" instead of showing plausible
  generic content.
- **Native settings survive the edge cases they describe.** The containing app
  and its sparse individual-church overlay use one release-pinned seven-year
  window, so an installed build remains valid across New Year. Android System
  appearance retains day/night resource aliases instead of freezing the current
  palette into `RemoteViews`; explicit Day and Night choices remain pinned.
  Persisted local overlays bind to the exact lectionary content fingerprint, so
  an app update rejects old overlays until the app regenerates current data.
- **Responsive and keyboard paths are repaired.** Library controls no longer
  force page overflow at phone widths. Calendar settings and the Mass date
  toolbar stay inside a 320 px viewport with 44 px controls. Reader verses use
  roving tabindex, keyboard selection enters the action bar, and closing returns
  focus. Touch controls meet the 44 px target at phone and tablet widths.
- **Motion now follows input and user preference.** Keyboard and reduced-motion
  section jumps are instant. Sheets use paired, interruptible panel/backdrop
  transitions, enter from the right on desktop, and carry no false drag handle.
  Hover motion is limited to hover-capable pointers; the switch knob uses a
  transform; theme-token replacement suppresses incidental transitions.
- **The embed is isolated and resizes safely.** Its root is transparent before
  first paint, typography is pinned to Garamond, and a versioned ResizeObserver
  message replaces the fixed-height assumption. The host validates window and
  origin and clamps the reported height.
- **The iOS 15 deployment floor is consistent through archive export.** The
  committed Capacitor Swift package now matches the app target's iOS 15 floor,
  and the release harness rejects a future sync-generated iOS 17 mismatch. The
  TestFlight preflight also rejects a signed app or widget that loses the shared
  App Group, checks version/build parity, and validates the IPA before upload.
- **Corpus-backed memorial readings are not misreported as absent.** Stable
  formulary IDs now connect St. Blaise, St. Bridget, and the First Martyrs of
  the Holy Roman Church to their existing citation rows, with date-level
  regression coverage. The lectionary fingerprint now seals those mappings,
  bundled supplements, and composed Mass sets as well as the generated table.
  Regeneration also restores the source em dash in one 2030 native quote.

### Added

- **More → Widgets** reports configured native widgets, gives accurate iOS Home
  Screen instructions, and lets supported Android launchers request Verse,
  Mass, or Quote widget pinning. A pin prompt is never reported as installation;
  only the one-shot callback records confirmation.
- **Versioned Ordinary Form calendar profiles** separate calendar jurisdiction,
  lectionary edition, and displayed Bible translation. Legacy `universal` and
  `usa` settings migrate to General Roman and U.S. Sunday-Ascension profiles.
  A distinct U.S. Thursday-Ascension profile covers Boston, Hartford, New York,
  Omaha, and Philadelphia. Unsupported jurisdictions receive an explicit
  General Roman fallback notice.
- **All thirteen precedence classes, stable celebration/formulary IDs, profile
  fingerprints, alternatives, suppression receipts, and cross-year transfer
  resolution** now form the extensible calendar boundary. The General pack
  includes Holy See inscriptions through St. John Henry Newman’s 2025 decree.
- **Lawful Mass choices are explicit.** Christmas exposes Vigil, Night, Dawn,
  and Day. Easter Sunday exposes the Year C `Luke 24:1-12` Gospel option and the
  afternoon/evening Emmaus Gospel while retaining the complete Day Mass.
- **Native calendar snapshots now cover three profiles from the previous year
  through five future years.** Generation is atomic; both widget builders have
  no-write byte-verification modes, enforced by `npm test`.

### Security

- Non-major lockfile updates move `tar` to 7.5.21, `js-yaml` to 4.3.0, and
  `brace-expansion` to patched releases. Production and full audits report zero
  known vulnerabilities.

### Verification

- Calendar tests exercise all 169 precedence pairs, profile migration, U.S.
  province rules, source hashes, suppression/transfer receipts, full-year
  General snapshots, both U.S. profile deltas, Christmas, and every Easter
  cycle. Web tests cover widget Back
  behavior, overflow, keyboard focus, live reduced motion, touch geometry,
  sheets, embeds, and accessibility (**31/31 Playwright**). Android app lint,
  host unit tests, APK, and instrumentation APK build pass. iOS compiles the app
  and widget extension together, and its native suite passes **13/13** on both
  iOS 17.5 and iOS 26.5 simulators. CI carries the Android API 24/26/31/36
  instrumentation matrix. Both npm audits report zero known vulnerabilities.
- Native shells are 1.24.0 (`versionCode` 12400); the PWA shell cache is v7.
  This code is not a store-ready release until the committed iPhone and
  Pixel/Samsung physical-device matrix in `docs/guides/DEVICE_ACCEPTANCE.md`
  passes.

## [1.23.2] — 2026-07-22 — honour to whom honour

*"Render therefore to all men their dues. Tribute, to whom tribute is due:
custom, to whom custom: fear, to whom fear: honour, to whom honour."
(Romans 13:7)*

A factual correction to the Quote of the Day corpus and every surface that
displays it.

### Fixed

- **Fr. Reginald Garrigou-Lagrange, O.P., now carries his correct title.** All
  nine quotations had incorrectly named the Dominican priest and theologian a
  cardinal. The canonical corpus, emitted web data, and both native widget
  calendars now identify him as `Fr. Reginald Garrigou-Lagrange, O.P.`
- **Existing PWA installations receive the correction.** The curated quote
  corpus is now network-first with cache fallback. An online launch replaces
  an old cached attribution, while the latest successful copy remains
  available offline.

### Added

- **Regression guards cover the source and native output.** `npm test` requires
  every `garrigou-*` record to carry the exact priestly attribution and rejects
  a widget calendar that still calls him a cardinal. A browser test seeds the
  stale title and proves that an online fetch replaces it in the offline cache.

Quote corpus rebuilt, manifest re-sealed, and widget data regenerated. No
liturgical-engine or golden-snapshot change. Service-worker freshness policy
changed without a data-cache-name bump. Native shells 1.23.2 / 12302.

## [1.23.1] — 2026-07-21 — the lip of truth

*"The lip of truth shall be steadfast for ever." (Proverbs 12:19)*

A one-paragraph honesty correction to the About page, found by the post-ship
review of v1.23.0, plus the harness gate that keeps it honest.

### Fixed

- **About no longer claims the saints' lives are proof-read.** The paragraph
  v1.23.0 added took *"the Saint of the Day and Today in Church History
  layers"* as its subject and closed "every entry has been proof-read against
  its named edition." That is true of the 406 history events — all `verified:
  true` after v1.22.3 and v1.23.0 — but false of the saints: all 366 entries
  are still `verified: false`, and every Saint page renders "Sources (draft —
  pending verification)" underneath. The app contradicted itself on exactly
  the sourcing-honesty point About exists to make. The claim is now scoped to
  the history layer, and the saints' lives are named as the sourced drafts
  they are.

### Added

- **A drift-guard couples the claim to the flags.** `npm test` now turns red
  if About makes the blanket proof-read claim while any saint is unverified —
  and red the other way too, so that when the saints' §3.4 proof-read is
  finally made, the harness is what reminds the maintainer to rewrite the
  paragraph. Proved red-first against the v1.23.0 text.

No engine, data, golden-snapshot, or service-worker change. Native shells
1.23.1 / 12301.

## [1.23.0] — 2026-07-21 — remember the days of old

*"Remember the days of old, think upon every generation." (Deuteronomy 32:7)*

The Church-history chronicle now covers every day of the year.

### Added

- **A Church-history event for every calendar date (366 days, Feb 29
  included).** The chronicle grows from 147 days / 177 events to **366 days /
  406 events** — 229 new sourced entries drawn from the Catholic Encyclopedia
  (1913), Butler, the Roman Martyrology, and vatican.va, matching the saints
  corpus's full-year coverage so the "Today in the Church" card always has a
  history lead beneath the Saint of the Day.
- **Harness gate:** `npm test` turns red if any calendar date lacks a history
  event (the saints' full-year gate's twin).

### Changed

- All 229 new entries were proof-read in four quarterly passes (208 clean, 20
  corrected, 1 hedged); every corpus `verified` flag is now true. Material
  fixes included wrong years, inverted feast timing, a false attendance claim,
  and a misplaced Italy-exit claim on Paul VI's UN visit.

Corpus rebuilt, manifest re-sealed; no engine/golden/sw change. Shells
1.23.0/12300.

## [1.22.5] — 2026-07-19 — I am the door

*"I am the door. By me, if any man enter in, he shall be saved." (John 10:9)*

A fix release for the home-screen widgets' entry into the app.

### Fixed

- **Widget taps now land on their own part of the app.** The Verse of the Day
  widget opens Today scrolled to the verse card, and the Quote widget to the
  quote card (new `fidelis://verse` and `fidelis://quote` deep links;
  `fidelis://today` still opens Today for widgets already installed). The
  Mass widget still opens the day's readings.
- **The post-widget-entry freeze is healed at the door.** A sheet torn down
  by an interrupted background/foreground could leave its backdrop element
  behind with no live overlay — a zombie that defeated the stranded
  scroll-lock heal on every later touch: the app kept navigating underneath,
  but the pinned body showed a frozen page until force-quit. The heal now
  recognizes a backdrop with no registered overlay as a zombie, removes it,
  and unpins — and a widget entry heals before the new page lands.

Harness: the scroll-lock battery gains the zombie case (red-first); §36 pins
the three widget links, the card anchors, and the entry-heal; a new e2e test
drives `/#votd` and `/#qotd` and asserts the cards scroll into view. No
engine/data/golden/sw change. Shells 1.22.5/12205.

## [1.22.4] — 2026-07-19 — the word is very nigh

*"But the word is very nigh unto thee, in thy mouth and in thy heart, that thou mayest do it." (Deuteronomy 30:14)*

A device-fix release: two corrections for the native shells, where the whole corpus already lives on disk.

### Fixed

- **The calm absence now reaches iOS and Android.** v1.22.2 taught the
  per-date loaders that a missing day file arrives as a 404 or as the
  SPA-fallback shell — but on the native shells neither happens: the bundled
  corpus is served straight from disk, and the native asset handler answers a
  missing file by failing the request outright, which surfaces as a fetch
  rejection with no HTTP status at all. The loaders read that as a connection
  failure, so on device an uncovered history day (July 19, St. Macrina the
  Younger) still claimed "Church history couldn't be loaded — it will return
  with your connection." `fetchDayJson` now also treats a fetch rejection on
  the native shells as absence — on-device there is no transport to lose, so
  a rejected bundled request can only mean the file isn't in the bundle. On
  the web a rejection still means a genuine transport failure, and the honest
  notice remains.
- **Settings no longer offers "Download for offline" on iOS/Android.** The
  save-for-offline action exists for the web, where texts arrive over the
  network and persist in the service worker's cache. The native shells ship
  the whole corpus inside the app and have no service worker, so the download
  could never register — it flashed progress and snapped back to "Download."
  The section now states plainly that every bundled text and the Fathers'
  commentary already read with no connection.

Harness §37 extended (the native rejection shape and the Settings gate, both
red-first). No engine/data/golden/sw change. Shells 1.22.4/12204.

## [1.22.3] — 2026-07-19 — the verity of those things

*"That thou mayest know the verity of those things in which thou hast been instructed." (Luke 1:4)*

A data-integrity release: the whole Church-history chronicle proof-read against its sources.

### Fixed

- **All 177 Church-history events are now verified, entry by entry.** A
  twelve-pass fact-check (one pass per month) put every event's day, year,
  people, places, documents, and quoted words against its named edition — the
  Catholic Encyclopedia (1913), the Vatican's own documents — and corroborating
  scholarship. 155 entries stood exactly as written; 22 were corrected. One
  was a swapped fact: the dead of the Porta Pia breach (20 September 1870)
  were some fifty Italian soldiers and nineteen of the pope's men, many of
  them Zouaves — not the reverse. The rest were quieter slips: Clement VII was
  elected at Fondi, not at Avignon; St. Gregory VII was canonized by Benedict
  XIII in 1728 (his cult confirmed in 1584), not by Paul V in 1606; the Second
  Vatican Council sat over four autumns, not three; Benedict IX was deposed at
  the synod's Roman continuation, not at Sutri itself; Mehmed II entered
  Constantinople on the day of the fall and cut short the sack he had licensed
  (a siege of fifty-three days, not fifty-five); the Fátima apparitions did
  not all fall on the 13th (August came on the 19th, at Valinhos); St.
  Cuthbert died on Inner Farne, not on Lindisfarne; St. Leo the Great's
  remains rest beneath his altar in St. Peter's, not in the long-vanished
  vestibule; Alp Arslan outlived Manzikert by little more than a year; St.
  Scholastica's soul was seen on the day of her death, three days after the
  last meeting; St. Thomas More refused the oath at Lambeth on 13 April 1534
  (the modern date; the older biographies give the 14th). Two contested
  details are now hedged rather than asserted (Theodosius's baptism at
  Thessalonica; Peter Nolasco's merchant origin), and four citations were
  repaired to the Catholic Encyclopedia articles that actually exist
  ("Visigoths", "Crusades", "Saint Bartholomew's Day Massacre",
  "Mercedarians"). Every event's `verified` flag now reads true — the
  chronicle's draft state is closed.

Corpus rebuilt (`npm run history`) and the manifest re-sealed; no
engine/golden/sw change. Shells 1.22.3/12203.

## [1.22.2] — 2026-07-19 — a book of remembrance

*"A book of remembrance was written before him for them that fear the Lord." (Malachi 3:16)*

A bug-fix release for a reported data error on the Today page.

### Fixed

- **A day with a saint but no Church-history event no longer reports a false
  failure.** On any day the growing chronicle does not yet cover — the report
  was July 19, St. Macrina the Younger — the "Today in the Church" card showed
  the Saint of the Day but claimed "Church history couldn't be loaded — it will
  return with your connection," as though the app were offline. The cause was in
  the per-date loaders (`loadSaints`/`loadHistory`): they treated only an HTTP
  404 as calm absence, but on every host Fidelis actually ships to (the static
  PWA host, `vite preview`, and the Capacitor iOS/Android shells) a missing file
  is served by the SPA fallback as the app's `index.html` with HTTP **200**, not
  a 404 — so the loader tried to parse HTML as JSON, rejected, and rendered the
  connection notice. A shared `fetchDayJson` helper now treats both a 404 **and**
  the 200-with-HTML-shell as absence (resolve `null`, the calm state), while a
  genuine transport failure (offline, 5xx, corrupt non-shell JSON) still rejects
  so the honest "couldn't be loaded" notice remains reachable.

Harness §37 updated (three checks, red-first against the old shape); a new e2e
test reproduces the SPA-fallback shell and asserts the card stays calm. No
engine/data/golden/sw change. Shells 1.22.2/12202.

## [1.22.1] — 2026-07-18 — decently and in order

*"Let all things be done decently, and according to order." (1 Corinthians 14:40)*

The UI polish batch: the audit's six UX findings closed inside the design system.

### Fixed

- **The NABRE fallback notice shows once per Mass page** (was: once per reading —
  three identical copyright notices on a normal day), re-worded to one breath with
  the import path intact.
- **Worship surfaces drop their developer artifacts**: the raw lectionary code is
  gone from the Mass footnote (provenance text and the USCCB link stay), and the
  manifest hash prefix is gone from Settings ("Texts verified at build" stays).
- **The Mass toolbar select keeps its full label at ≥640px** — no more
  "NABRE (import…" truncation on desktop.
- **Two Latin fragments speak Latin to screen readers** (`lang="la"` on the footer
  motto and the rosary's Latin name).
- **TestFlight/App Store metadata follows the shipping version again**: the
  paste-ready version, cumulative release copy, test notes, screenshot status,
  and verified character count now describe 1.22.1. A harness guard prevents
  this document from falling behind `package.json` again.

### Added

- **The Read tab explains reading plans in one line** — the feature's only entry
  point now says what a plan is.
- **Dependent commentary switches nest visually** under their parent (Haydock,
  Church Fathers, Doctors-only) — pure presentation, no behavior change.

Harness §39 pins all eleven checks; no engine/golden/sw change.

## [1.22.0] — 2026-07-18 — knowledge shall be manifold

*"Many shall pass over, and knowledge shall be manifold." (Daniel 12:4)*

The enrichment release: every Saint of the Day and Church History entry rewritten from
a thin two-paragraph draft into a full, fact-dense life — plus the stranded-scroll-lock
hardening for the "tabs blip but nothing happens" freeze, and the Today card's
saint/history de-duplication.

### Changed

- **All 543 memory entries enriched** (366 saints + 177 history events): 2 paragraphs /
  ~100 words → 3–4 paragraphs / 150–200 words, with at least five concrete facts per
  entry — specific years, places, named works and people, causes of death, and the
  *reason* behind each patronage. The 68 biographies that named no year now carry their
  chronology in prose. Drafted in 46 research-verified batches against the Catholic
  Encyclopedia 1913, Butler's *Lives*, the Roman Martyrology, and vatican.va; contested
  details are hedged or omitted, and dozens of small old-prose errors were corrected on
  the way (Bonaventure's birthplace, the Scillitan martyrs' attested answer, Lepanto's
  gulf, John Nepomucene's legend, Soter and Caius' martyrdom, among them). Every entry
  remains `verified: false` — a sourced draft awaiting the human proof-read (§3.4).
- **The 18 same-day saint/history pairs now complement, never restate.** Where the
  Saint of the Day and a history event share a subject (Lourdes, Lepanto, Compiègne,
  Augustine, Becket…), the event was rewritten from a different angle — context,
  circumstances, aftermath — so the card and the day page teach something in each slot.
- **The Today card's history lead skips the saint's own subject.** `leadHistoryEvent()`
  (pure, harness-tested) picks the first event *not* about the Saint of the Day when
  the day has another to offer; the /history page still lists them all.

### Fixed

- **The navigation freeze (stranded body scroll-lock), hardened.** A sheet torn down
  without its cleanup (an iOS WKWebView interruption) leaves `position: fixed` on the
  body — taps still register, routes still change, but the pinned body clips every new
  page out of view ("the app blips and does nothing until force-quit"). v1.20.1 healed
  this on route change; v1.22.0 closes the remaining escape hatches: the heal now
  predicates on the **body's actual pin**, not just the lock counter (a count-0 strand
  heals too), fires on **every pointerdown** (the next touch anywhere unpins, even a
  same-tab tap), listens for the native **`appStateChange`** resume signal alongside
  `visibilitychange`, and no longer yanks the new page back to the departed page's
  scroll offset. Harness §25 (b3)–(b6), red-first.

### Added

- **Five corpus-integrity gates** (harness §35): exactly one saint per day, no two
  saints normalizing to the same person name, no two history events normalizing to the
  same title, the shortBlurb trailing-ellipsis convention, and corpus↔emitted byte
  sync for both memory corpora (editing a corpus without `npm run saints|history`
  now goes red, as quotes already did).

## [1.21.0] — 2026-07-16 — that nothing be lost

*"Gather up the fragments that remain, lest they be lost." (John 6:12)*

The audit-fix release: the 2026-07-16 external audit of v1.20.1, verified claim-by-claim, then
closed in full. Its two P1s (the discarded-write storage path, the privacy wording that OS backups
can falsify), its history-duplication P2, and the verification sweep's own finds (a saint-rank
contradiction, feast-keyed dates, an unreachable failure state, two read-path crash classes) all
land together.

### Fixed

- **The storage shadow (audit FID-STOR-002).** When the browser refuses a `localStorage` write
  (quota, private mode), the value is no longer discarded: it lives in a **session shadow** that
  reads prefer — so the UI stays consistent, a later settings change can no longer silently revert
  an earlier one (the `SettingsContext` rebase bug: theme → Night, then any other change snapped it
  back), **Export genuinely contains the refused marginalia**, and the next successful write
  re-persists every stranded key. `importMarginalia` now reports `persisted: false` honestly and
  both import surfaces say so; the banner copy states the real contract ("kept for this session
  only"). Harness §37 (red-first) + a committed browser spec (`e2e/storage.spec.ts`).
- **Read-path shape guards.** A corrupt or foreign-typed stored value (a non-array `plans` key, a
  shapeless `lastRead`) used to crash the Today page mid-render via `activePlan()`; list stores and
  `lastRead` now degrade to empty instead.
- **Honest saint/history failure states (sweep).** `loadSaints`/`loadHistory` treat only a 404 as
  absence; a transport failure now **rejects**, so Home's connection notice (previously dead code)
  renders instead of the false "being gathered" line, and the Saint/History pages say "couldn't be
  loaded" instead of claiming the entry isn't in the collection.
- **Six duplicate history events merged (audit FID-CONTENT-001).** Nicaea, Gregory VII's death,
  the capture of Jerusalem, Francis' death, Lepanto, and *Ineffabilis Deus* each existed twice
  under different ids (a v1.20.0 merge artifact); each is now one authoritative record carrying the
  fuller sourced prose and the union of sources. `build-history.mjs` hard-fails any
  same-day-same-year pair not explicitly allowlisted.
- **Events keyed to the date they happened.** Chrysostom (†14 Sept 407) and Cyprian (†14 Sept 258)
  move off their feast days to Sept 14; the Mercedarians' founding to its traditional 10 Aug 1218;
  the Edict of Milan to 13 June 313 (Licinius' Nicomedia rescript) — the Today card presents these
  as on-this-day facts, so the dates must be the events', not the feasts'.
- **Ranks agree with the calendar.** St. Francis of Assisi's corpus rank corrected Feast →
  **Memorial** (it contradicted the engine on the same screen every Oct 4); St. David of Wales →
  Commemoration (not on the GRC); the engine's St. Patrick gains `opt: true` (memoria ad libitum) —
  golden snapshots byte-identical.

### Changed

- **Privacy wording now matches what the operating systems can do (audit FID-PRIV-001).** Backups
  stay enabled — the user-protective choice — and every promise now says so: `PRIVACY.md` (the App
  Store-linked policy) gains a **Device backups** section and drops "Deleting the app deletes all
  of it."; "never transmitted" is qualified *by Fidelis* (which stays absolutely true); SECURITY,
  README, the App Store copy, and the About/Settings/Library/Translations lines lose their
  never-leaves-the-device absolutes. A harness drift-guard couples `android:allowBackup="true"` to
  the disclosure, so flipping either alone turns `npm test` red.

### Scope

No engine-behavior, golden, or service-worker change (the Patrick `opt` flag is invisible in
practice — 17 March always falls in Lent). History corpus 183 → 177 events (147 dates); saints
corpus 366 unchanged; data regenerated via `scripts/` and the manifest resealed. App Store
screenshots regenerated against this build (FID-REL-001 — the Jul 15 set predated the Saint of the
Day card). Harness grows §37/§38 (32 checks); the browser suite grows 13 → 16 tests. Shells
1.21.0 / `versionCode` 12100. Maintainer follow-ups (not in this release): update the live App
Store listing's import line to match `APP_STORE.md`, and run a device backup/restore acceptance
pass on both platforms.

## [1.20.1] — 2026-07-15 — them that are fettered

*"…The Lord looseth them that are fettered." (Psalm 145:7)*

A bug-fix release. On the native iOS shell, the whole app could freeze — every nav tab and every
"→" button would dim on tap but go nowhere, and only fully quitting and reopening the app restored
it. The report was "Read at Mass goes nowhere," but the cause was app-wide.

### Fixed

- **The frozen-navigation bug (a stranded scroll-lock).** Modal sheets pin the page behind them with
  `body { position: fixed }` (an iOS-safe scroll-lock, reference-counted so stacked sheets lock once
  and unlock once). If a sheet is torn down without its React cleanup running — which an iOS WKWebView
  can do when a native share/permission dialog or a background/foreground interrupts the teardown —
  the lock is left stranded: the body stays pinned, so navigation still changes the route but the
  new page is clipped out of view, and it reads as "nothing happens." A restart cleared it because
  the lock count reset. Now a **self-heal** (`resetScrollLock`) runs on every route change and on
  foreground-resume: if the body is pinned but **no sheet is actually mounted** (a `.sheet-backdrop`
  DOM check, so it can never disturb a legitimately-open sheet), it releases the lock — so the user's
  next tab tap both navigates *and* unfreezes the app, with no restart needed.

### Scope

No engine, data, golden, or service-worker change. The fix is in `src/lib/scrollLock.ts` and
`src/App.tsx`; a real logic test plus source-shape guards pin it. Native versions 1.20.0→1.20.1
(`versionCode` 12001). This needs a native build to reach TestFlight.

## [1.20.0] — 2026-07-15 — a great multitude

*"After this, I saw a great multitude, which no man could number, of all nations and tribes and peoples and tongues, standing before the throne…" (Apocalypse 7:9)*

A Saint of the Day for **every day of the year**, and a far richer chronicle. v1.19.0 gave the
Saint a home on the Today page but a corpus of only 53 lives; most days still showed the calm
"being gathered" placeholder. This release fills the calendar: **366 saints (one for every date,
including Feb 29)** and **183 Church-history events** across 150 days, all drawn from public-domain
sources — and, for saints too modern for one, from official Vatican biographies.

### Added

- **A saint for all 366 dates.** The saints corpus grows 53 → **366** — the principal Saint of the
  Day for every calendar date, drawn from the General Roman Calendar and the Roman Martyrology. The
  "Today in the Church" card is now populated year-round.
- **A far fuller chronicle.** The history corpus grows 15 → **183** events across 150 days, each a
  richer multi-paragraph account.

### Changed

- **The provenance gate now accepts an official-Church source.** Genuinely modern saints and events
  (Maximilian Kolbe, Padre Pio, John Paul II, Faustina Kowalska, Edith Stein, Josephine Bakhita,
  Maria Goretti, the Korean and Ugandan martyrs…) have **no public-domain biography** — so citing a
  1913 encyclopedia for them would be a false footnote. A new `"church-official"` source license
  (vatican.va), drawn faithfully and labelled honestly, sits alongside `"public-domain"`; the build
  gate (`build-saints.mjs` / `build-history.mjs`) and harness now require at least one of the two.
  Pre-1900 figures still stand on public-domain works (Catholic Encyclopedia 1913, Butler's *Lives*,
  the Roman Martyrology); an honest label always beats a false citation.

### Integrity

- Every one of the 366 saints and 183 events is `verified: false` — a **sourced draft** pending
  human verification against the cited edition (the §3.4 ledger). The content was drafted from the
  standard reference works and audited for coverage, schema, unique ids, and sourcing, but a
  proof-read remains the intended next step before any entry is marked verified.
- Harness §35 now **requires a saint for every one of the 366 calendar dates** (a red build if any
  day is missing) and accepts either accepted license.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.19.0→1.20.0, `versionCode` 11900→12000. No
  engine, golden, or service-worker change — pure data + the sourcing-gate widening.

## [1.19.0] — 2026-07-15 — men of renown

*"Let us now praise men of renown, and our fathers in their generation." (Ecclesiasticus 44:1)*

The Saint of the Day, made visible. The v1.18.0 "memory of the just" release added the saints
and history corpora but surfaced the Saint only as a faint tappable memorial name — and even that
failed on any day the calendar engine did not already celebrate. This release gives the Saint of
the Day real presence, fixes the engine gap that hid it, and broadens the corpus across the whole
calendar.

### Fixed

- **The Saint of the Day now appears (the "no Saint at all" bug).** St. Bonaventure (July 15), an
  obligatory memorial of a Doctor of the Church, was missing from the engine's sanctoral table, so
  the day resolved as a plain green feria and the Saint never showed. He is added; July 15 is now a
  white memorial in both regions (`liturgical.ts`; golden re-blessed; explicit harness assertion).

### Added

- **The "Today in the Church" card.** The former "Today in Church History" card is reworked to lead
  with the **Saint of the Day** — a gold monogram medallion, name, title, rank, dates, a blurb, the
  patronage, and a "Read the life →" link to the full page — with the day's Church-history event
  below a hairline. The Saint is now **decoupled from the sanctoral engine**: it shows on any day
  for which a life exists, even a feria, not only on celebrated days.
- **Corpus expansion.** The saints corpus grows from 10 to **53** lives and the history corpus from
  8 to **15** events, spanning every month — drawn faithfully from public-domain sources (Catholic
  Encyclopedia 1913; Butler's Lives of the Saints; the Jesuit Relations; *The Story of a Soul*),
  each `verified: false` as a sourced draft pending human check (the §3.4 ledger). Truly modern
  saints with no public-domain source are deliberately left for later rather than falsely cited.

### Changed

- **The Mass card is retitled "Today at Mass"** (its own home-screen-widget name), freeing the
  "Today in the Church" banner for the Saint card and resolving the old near-duplicate with the
  history card's title. The memorial name in the Mass card still links to the Saint's life.
- **The native widget `calendar.json` is regenerated** — carrying St. Bonaventure on July 15 and
  re-syncing the deterministic Quote-of-the-Day rotation to the current engine (the artifact had
  been stale since v1.14.1). iOS/Android byte-parity holds; the fill is a seeded (mulberry32)
  permutation, so the output is reproducible.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.18.5→1.19.0, `versionCode` 11805→11900. The
  engine change re-blesses the golden snapshots (July 15 only); no service-worker change.

## [1.18.5] — 2026-07-15 — the ancient bounds

*"Pass not beyond the ancient bounds which thy fathers have set." (Proverbs 22:28)*

A harness-hardening release — no application code, no behavior change. It closes the two items a
post-ship adversarial review confirmed as the only loose threads after the v1.18.4 audit finish:
a region policy that was explicit but unpinned, and a CSP drift-guard that watched the wrong file.
The review found **no runtime bug** anywhere in the shipped v1.18.2–v1.18.4 code (widget deep
links, the Report-Only CSP, and all nine P3 fixes verified correct).

### Fixed

- **The widget/Siri region is now harness-pinned (FID-NATIVE-001).** `build-calendar-widget.ts`
  fixes `REGION = "usa"` by design (the widgets and Siri follow the USCCB calendar, documented in
  the iOS guide's "Region policy"), but nothing turned `npm test` red if it were flipped —
  precisely the gap the v1.18.4 pass recorded as a standing concern. A one-line source-shape guard
  now pins it; verified to fail the suite if the region is changed to `universal`.
- **The CSP drift-guard now also pins the *built* artifact (FID-SEC-002).** The §36 hash gate
  computed the pre-paint script's sha256 from the *source* `index.html`, but the browser loads the
  *built* `dist/index.html`. They are byte-identical today (Vite passes the inline script through
  verbatim — recomputed and confirmed), so nothing was wrong; but the guard watched the file that
  isn't shipped. It now additionally asserts, whenever a build exists, that `dist`'s pre-paint
  script matches source — so a future HTML-transform that silently diverged them (invalidating the
  shipped hash and the deferred enforcing-`<meta>` migration) turns red instead of sailing through.
  Skipped on a bare `npm test` with no `dist`, so it never false-fails in CI.
- **README version badge corrected.** It had drifted to 1.18.2 (the v1.18.3/v1.18.4 releases never
  bumped it); now reads 1.18.5.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.18.4→1.18.5, `versionCode` 11804→11805. No
  engine, data, golden, or service-worker change; no `dist`-shipped code change.

## [1.18.4] — 2026-07-15 — come and see

*"Philip saith to him: Come and see." (John 1:46)*

The Mac-only pass — the release-ops and native-acceptance batch the Linux audit environment could
not run (audit §2.2, §10, and FID-REL-001). **No engine, data, golden, or service-worker changes —
no application code changes at all.** Only the App Store screenshots, native version strings, and
docs move; the substance is verifying the finished build on Apple hardware and shipping it.

### Fixed

- **The App Store screenshots no longer misrepresent the app (FID-REL-001).** The submitted set was
  captured 2026-07-13, before the Collapsing Masthead (v1.16.0) — every frame advertised the retired
  bottom tab bar, which `docs/guides/APP_STORE.md` explicitly flagged as a release blocker. The full
  set is regenerated against the v1.18.4 Release web bundle (the native shell *is* that bundle, so a
  browser capture at the device's pixel size is faithful to what ships): the masthead tops every
  frame, no frame shows a bottom bar, the day and night frames use the current tokens, and the first
  three tell the Today → Reader → Mass story. iPhone 6.9″ (1284 × 2778) and iPad 12.9″ (2048 × 2732),
  RGB, exact — the four acceptance criteria of FID-REL-001. The capture harness is now **committed**
  (`scripts/capture-appstore.mjs`, documented in `docs/guides/APP_STORE.md`) rather than living in a
  session scratchpad — the exact reason the set went stale in the first place — so it can be
  regenerated in two commands and can never silently drift again.

### Verified

- **The §10 native acceptance checklist, run on this Mac.** Xcode 26.6 + the iOS Simulator, plus
  source/build verification of the items the pure engines and the browser cannot reach (the archive
  embeds the widget extension, app icon, privacy manifest, and current web bundle; the night
  cold-launch has no Day-theme flash; safe-area insets resolve once; the region policy is explicit).
  The items that genuinely require physical hardware — VoiceOver order and pronunciation, live
  Dynamic Type at the largest accessibility category, the on-screen-keyboard-versus-docked-action-bar
  interaction, edge-swipe Back over an open sheet, add-only Photos, widget midnight/time-zone
  refresh, and Siri — are handed to the maintainer as a device checklist to run from this very
  TestFlight build — the committed [device-acceptance checklist](docs/guides/DEVICE_ACCEPTANCE.md)
  captures each with steps and pass criteria. Two concerns were surfaced and recorded (not fixed) in
  this verify-only pass: the light-pinned native night-launch splash, and the region policy that is
  explicit in code/docs but not harness-pinned. Full results:
  [RELEASES.md → come and see](docs/history/RELEASES.md#come-and-see-v1184).

### Changed

- **Native version strings reconciled to 1.18.4** — the four iOS `MARKETING_VERSION` entries and the
  Android `versionName` / `versionCode` (→ `11804`) — and the signed build shipped to TestFlight via
  `scripts/ios-testflight.sh`.
- **`docs/guides/APP_STORE.md` refreshed** — the stale-screenshot banner removed, the capture date
  and shot list brought to the current (six-card) Today page and the post-masthead Reader/Mass
  controls.

## [1.18.3] — 2026-07-15 — faithful in little

*"He that is faithful in that which is least, is faithful also in that which is greater." (Luke 16:10)*

The audit's P3 polish sweep — nine small items, none of them load-bearing on their own, closed
together. Behavior refinements to the embeddable widget, the Reader, and Search; the home-screen
widgets gain real tap targets; the native calendar decode is memoized; and the first, non-breaking
step of a Content Security Policy ships in Report-Only mode. No engine, data, golden, or
service-worker changes.

### Fixed

- **Embeddable VOTD rolls at midnight (FID-FUNC-010).** `WidgetVotd` read the verse once at render;
  a long-lived `<iframe>` embed could show yesterday's verse for days. It now draws the date from
  `useToday()` (the midnight-timer + foreground-resume hook), so the embed rolls when the civil day
  turns — the same hook the Today page and the liturgical accent already use.
- **Parallel-text load failure is no longer silent (FID-FUNC-011).** A parallel pane that failed to
  load (usually an import-only second translation absent on the device) fell back to a single column
  with no word said. The Reader now records the error and shows a quiet notice, with a link to
  Translations when the pane is an import-only text.
- **Copy now confirms itself (FID-UX-003).** The verse-action **Copy** silently swallowed both
  success and clipboard failure. It now flashes one brief, polite `role="status"` line near the
  action bar — "Copied to the clipboard." or a plain failure note — that clears after a moment.
- **Even card gutters at 320 px (FID-UX-004).** `.widget-grid`'s 300 px minimum track overhung the
  grid on the narrowest phones, leaving an uneven right gutter. The minimum is now
  `min(300px, 100%)`, so a single card shrinks to the column width and the gutters stay even; wider
  viewports keep the 300 px minimum unchanged.
- **Search no longer forces the keyboard open on phones (FID-UX-005).** `autoFocus` fired on every
  visit to the Search tab, popping the on-screen keyboard over the results on touch devices. It is
  now gated on a `(hover: hover) and (pointer: fine)` query, so only a keyboard/desktop context
  autofocuses; touch users reach the field on their own terms.

### Added

- **Home-screen widgets have deep links (FID-NATIVE-002).** A new custom `fidelis://` URL scheme
  lets a tapped widget open the right place: the Mass widget opens the Mass readings
  (`fidelis://mass` → `/readings`), the Verse and Quote widgets open Today (`fidelis://today`).
  iOS widgets carry a `widgetURL`; the scheme is registered in the App's `Info.plist`; Android
  widgets set the same URL as the intent's data (with a matching `MainActivity` intent-filter). The
  web layer routes it through Capacitor's `appUrlOpen` (and `getLaunchUrl` for a cold launch) in
  `src/App.tsx`, on both platforms.
- **A Content Security Policy in Report-Only mode (FID-SEC-002).** `public/_headers` ships a
  `Content-Security-Policy-Report-Only` policy (plus `X-Content-Type-Options` and `Referrer-Policy`):
  it observes and logs violations, never blocks. The single inline pre-paint `<script>` is allowed by
  its SHA-256 hash — not `'unsafe-inline'` — and the data harness (§36) recomputes that hash from
  `index.html` and fails on drift. Honored by hosts that read `_headers`; inert (and harmless)
  elsewhere and in the code-signed shells. The enforcing-`<meta>` migration is documented and deferred
  in the new [docs/SECURITY.md](docs/SECURITY.md).

### Changed

- **Native widgets memoize the calendar decode (FID-PERF-004).** The ~400 kB `calendar.json` was
  decoded in the placeholder, snapshot, and timeline paths of both the Mass and Quote providers on
  every reload. iOS now caches the decode process-locally (lock-guarded; the ephemeral extension
  process releases it); Android shares one `SoftReference`-backed decode across `CalendarWidget` and
  `QuoteWidget` (reclaimable under memory pressure, re-parsed on demand).
- **"Texts verified" now reads "verified at build" (FID-SEC-001).** The Settings and About wording is
  clarified so the SHA-256 manifest seal is understood as a build-time guarantee proven in CI — not a
  live checksum of the device's cache. Runtime trust comes from native code-signing and the immutable,
  cache-first corpus, as [docs/SECURITY.md](docs/SECURITY.md) now records.

### Release mechanics

- `package.json` 1.18.2→1.18.3; iOS `MARKETING_VERSION` and Android `versionName` 1.18.2→1.18.3,
  `versionCode` 11802→11803. New harness section **§36** guards all nine items (shape guards plus the
  CSP hash drift gate). No engine, data, golden, or service-worker changes.

## [1.18.2] — 2026-07-15 — the mended net

*"And when they had done this, they enclosed a very great multitude of fishes, and their net
broke." (Luke 5:6) — mended, it held.*

A repair release, no new behavior. Three v1.18 feature branches — "the memory of the just"
(Saint of the Day + Church History), "both are preserved" (atomic import), and "prove all
things" (route-splitting + the browser suite) — were built in parallel and merged in sequence;
GitHub's 3-way merge duplicated their edits at three seams and left `main` red. This release
reconciles the collisions; every feature from all three branches is intact.

### Fixed

- **`src/App.tsx` — duplicate route declarations.** The memory-of-the-just branch kept static
  `import Library/Translations/Settings/About` while the prove-all-things branch replaced them
  with `React.lazy` consts; the merge kept both (`TS2440`). Resolved by dropping the static
  imports and **folding the new Saint and Church History detail pages into the same route-split**
  (`const Saint = lazy(...)`, `const History = lazy(...)`) — they are secondary surfaces reached
  from the Today card and their routes already sit under `<Suspense>`, so they now load as their
  own chunks too.
- **`src/lib/data.ts` — duplicate `CccTextDoc` import.** The atomic-import branch extended the
  `import-formats` import to `{ CccTextDoc, ImportedBook }`; the merge left the older bare
  `CccTextDoc` line beside it (`TS2300`). Removed the duplicate.
- **`scripts/test-data.ts` — unbalanced brace + duplicate section number.** The memory §33 block
  lost its closing `}` in the merge (EOF parse error) and collided with the atomic-import §33.
  Brace restored; the memory section renumbered **§35** so the atomic-import (§33) and perf (§34)
  numbers — referenced in their own check labels — stay intact.
- **`e2e/today.spec.ts` — stale card count.** The committed suite predated the sixth Today card;
  its "five cards" title and heading list are updated to six and now cover the Church History card.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.18.1→1.18.2, `versionCode` 11801→11802. No
  engine, data, golden, or service-worker changes. Verified green: 624 harness checks, both e2e
  suites (13 committed + 14 saints/history), build, lint, and docs.

## [1.18.1] — 2026-07-15 — prove all things

*"But prove all things; hold fast that which is good." (1 Thessalonians 5:21)*

The perf & browser-test batch of the 2026-07-15 audit (FID-PERF-002, FID-QUAL-001,
FID-PERF-001 measured and part-addressed, FID-PERF-003): the secondary routes leave the
initial JavaScript graph, the behaviors only a browser can prove get a small committed
Playwright suite that rides CI, the cold search stops paying 78 sequential round trips, and
Lighthouse is re-run with the numbers reported honestly. No engine, data, golden, or
service-worker changes.

### Added

- **The committed browser suite (audit FID-QUAL-001).** Thirteen Playwright tests in `e2e/`
  — run with `npm run e2e` against the BUILT app (`vite preview`, service worker included),
  and as a second CI job on every PR (channel `chrome`: the runner's preinstalled browser, no
  Playwright download). Coverage is the audit's list: Today's load and failure states (the
  lectionary blocked at the network, the quiet notice, a working Try again), Reader selection
  with the docked action bar provably not covering the selected verse, the Commentary sheet's
  open/Escape/browser-Back (Back navigates AND releases the scroll lock — the v1.14.2
  regression class), Search's exact section counts against the sealed DRB corpus (All 434 ·
  OT 377 · NT 57 · Gospels 22), a bookmark opening in its SAVED translation, the
  mid-import IndexedDB write failure leaving the prior corpus untouched, offline "Saved" as
  cache truth (download → evict → Repair → never lie), and axe WCAG A/AA passes on Today,
  Reader, Mass, Settings, and an open sheet. The `e2e/` tier is linted with the rest.

### Changed

- **Secondary routes load lazily (audit FID-PERF-002).** Settings, Library, Translations,
  Plans, the plan creator, and About are route-level `React.lazy` chunks behind one quiet
  Suspense fallback; Today, the Reader, Search, Mass, and the book list stay eager — the
  worship path pays nothing. No chunking framework. The main chunk drops 426 → 393 kB
  (gzip 135 → 127 kB).
- **Cold search batches its book fetches (audit FID-PERF-003).** A six-book prefetch window
  rides ahead of the scan; fetches overlap but processing stays strictly in canon order, so
  the exact counts, ordered lists, and the named-book error (§29/§30) are unchanged.

### Fixed

- **The Mass page's largest layout shift (audit FID-PERF-001).** Each reading reserved one
  "Loading…" line and then shoved everything below it when the scripture landed (CLS 0.30 in
  the audit, 0.34 re-measured). Each reading now reserves geometry scaled from its OWN
  citation — the verse spans are known before the text is — and the page reserves a day's
  readings while the lectionary resolves: CLS 0.34 → **0.04**. The new lazy routes reserve a
  screenful under their fallback so a cold visit's footer doesn't leap (Settings CLS 0.025).
  Re-measured (Lighthouse 13.4 mobile, median where noisy): Today 81/LCP 3.6s/CLS 0.10–0.16
  (was 75/3.5/0.241), Reader 82/3.8/0.107 (unchanged), Search shell 92/2.7/**0.000**, Mass
  83/4.1/**0.042** (was 74/3.2/0.304), Settings 91/2.9/**0.025**. CLS < 0.1 holds on
  Mass/Settings/Search; Today and Reader sit just above it and LCP stays over 2.5s under
  simulated slow-4G — the residuals are the EB Garamond swap and the main bundle, named for
  a future batch rather than half-fixed in this one.

## [1.18.0] — 2026-07-15 — both are preserved

*"But new wine they put into new bottles: and both are preserved." (Matthew 9:17)*

The storage & import resilience batch of the 2026-07-15 audit (FID-DATA-001, FID-FUNC-009,
FID-STOR-001, FID-FUNC-008): the Bible import becomes atomic — new wine into a new vessel,
the old untouched until the new is whole — every silent persistence failure gets one honest
voice, and "Saved" for offline reading becomes a claim the cache must back. No engine, data,
golden, or service-worker changes.

### Added

- **Atomic Bible import (audit FID-DATA-001).** The importer used to read any file whole,
  parse it on the main thread, and write books one-by-one over the previous corpus — a quota
  failure at book N left a hybrid of two editions. Now: an oversized file is refused **before
  it is read** (a documented 64 MB bound, far above any real corpus — `checkImportSize` runs
  on `file.size`); parsing and Vulgate-grid normalization run **in a Worker**
  (`src/lib/import.worker.ts` — the parsers are pure string work, the OSIS path regex-based,
  so nothing changed but the thread); the **whole corpus is validated** before any write
  (structure named per book, textless placeholders skipped, empty corpora refused); the books
  are **staged under a fresh generation** in IndexedDB (`translation@gen/book`); the
  **active-version marker flips only after every write succeeded** — one tiny write in a
  `meta` store (DB v3) that is the entire swap — and only then are the old generation's keys
  swept. Generation 0 *is* the legacy key shape, so every existing install reads on with no
  migration. All of it is a pure, adapter-driven module (`src/lib/importPlan.ts`) that
  harness §33 drives through a fake store: an injected mid-import write failure provably
  leaves the prior corpus byte-for-byte untouched, and a quota error names the cause and the
  recovery path.
- **Replace imported text.** A translation card with an import now offers Replace beside
  Remove — riding the same atomic swap, so the old text stays readable until the new corpus
  has fully landed (previously re-importing required removing first, leaving a window with no
  text at all).

### Fixed

- **Re-importing a smaller Bible retains no stale books (audit FID-FUNC-009).** The old
  importer overwrote books present in the new file and removed nothing absent from it. The
  generation sweep removes every key outside the new generation — orphans of a crashed import
  included — so a replacement corpus can never become a hybrid of two editions.
- **Local persistence failures are no longer silent (audit FID-STOR-001).** Every
  localStorage write was a catch-and-discard; settings, plans, notes, bookmarks, and reading
  state could all vanish while looking saved. `write()` now reports success, and the first
  refused write raises **one quiet, deduplicated session warning** (`role="status"`, on every
  route) naming the risk plainly, with **Export your library** as the recovery action and a
  Dismiss that keeps it quiet for the session. Successful writes never toast.
- **"Saved" for offline reading is cache truth (audit FID-FUNC-008).** Settings claimed
  `Saved · Update` from a localStorage record even after the browser evicted the entire data
  cache. The rows now **probe Cache Storage against the manifest's file list**
  (`verifyOfflineBundle`; the page-side `DATA_CACHE` constant is pinned against `sw.js` by
  harness §33): "Saved" requires a complete cache; a partly evicted bundle the user had
  downloaded reads **Repair (n missing)** — and repair re-fetches exactly the gap, since the
  service worker's cache-first handler skips what it already holds; incidental caching from
  ordinary reading never claims anything. The record is demoted to presentation metadata.

### Quality

- Harness §33: the staging/swap acceptance as REAL logic tests (fake store, injected
  failures, orphan sweep), the size gate, corpus validation, quota naming, the storage-warning
  dedup (driven through a throwing `localStorage`), plus shape guards for the UI wiring and
  the `DATA_CACHE` name agreement. 35 e2e checks in real Chrome against `vite preview`:
  import → replace-smaller → injected mid-import quota failure → recovery sweep, the 64 MB
  refusal via a real 64 MB file, a seeded pre-v1.18 legacy corpus reading and replacing
  cleanly, download → evict-one → Repair → evict-all → never-Saved, and the storage banner's
  full dedup/dismiss lifecycle.

## [1.17.1] — 2026-07-15 — touch and see

*"See my hands and feet, that it is I myself; handle, and see." (Luke 24:39)*

The visual-calibration half of the audit's sacred-page pass, deferred from v1.17.0 by design
(audit FID-A11Y-004, FID-UX-002): everything the eye must read now clears WCAG AA on **every**
surface it sits on, and everything the thumb must touch now measures at least 44px. CSS tokens
and hit geometry only — no engine, data, or golden changes; no service-worker cache bump
(network-first shell; no sw.js/precache/index.html change).

### Fixed

- **Day-theme accent text clears 4.5:1 on all three surfaces (audit FID-A11Y-004).** The old
  values were calibrated against `--bg-1` only; the audit caught them failing on the page
  background and the raised `--bg-2` insets. Through the existing token seams only — the
  `--gold-text`/`--gold` split and the liturgical accent table — with the luminous `--gold`
  marks and `--purple-strong` untouched: day `--gold-text` `#8A6D1F` → `#7C621C` (the motto,
  section labels, Father attributions; worst pair now 4.78:1, was 4.04:1), day `--text-muted`
  `#6E6A61` → `#6B675E` (was 4.44:1 on the bg-2 copyright badge), the Ordinary-Time green
  accent `#3E7C4F` → `#377046` (link text most of the year; was 4.12:1 on bg-2), the rose
  accent `#B14F73` → `#A34767`, and the white accent borrows the new gold-text hue. Night
  lifts instead of deepening: the brand `--purple` `#9B7BD4` → `#A98EDC` (it carries link text
  on bg-2 hover rows and active pills, where it sat at 4.03:1; the violet accent moves with
  it), the red accent `#D45A6A` → `#E07A89` (was 3.56:1 on bg-2), and the black accent
  `#8E8E96` → `#97979F`. Harness §32 now parses the tokens out of `styles.css` and computes
  the WCAG ratios — 4.5:1 on bg-0/1/2, both themes, all six accents, the filled-button and
  badge pairs — so any future drift below AA is a red `npm test`, not a Lighthouse surprise.
- **Links inside prose are underlined by default (audit FID-A11Y-004).** The Mass page's
  "import your licensed NABRE" link measured 1.07:1 against the muted sentence around it with
  no other cue — color alone cannot mark a link (WCAG 1.4.1). `p a, li a, .notice a` now
  underline; chrome links (nav rows, chips, cards, toolbars) live in divs and keep the quiet
  default; the filled CTA declares its own `text-decoration: none` as insurance.
- **The nine audited sub-44px control families now tap at ≥44px (audit FID-UX-002)** without
  inflating their visible chrome: pseudo-element hit slop on the Search/Mass chips
  (`±0.6rem`), SectionNav chips (`±0.5rem`, absorbed by the rail's own padding so the scroll
  rail gains no vertical overflow), book chips in the grid and the Reader's picker sheet
  (`±0.4rem`), Settings pills (`±0.3rem`), the Settings switch (`::before` carries the slop —
  `::after` is the knob), the Today card Share line (asymmetric slop that fills its own margin
  and the card's padding, never covering the text above), Library's destructive Remove/Delete
  (`±0.9rem`, held inside the buttons' side margins so adjacent targets never overlap), and
  the Commentary tabs (`±0.4rem`); the rosary mystery rows grow by real symmetric padding
  (stacked rows cannot borrow slop without ambiguity) with the list margins tightened so the
  card grows modestly. The wrap-gaps of chip rows widen exactly to the sum of two slops —
  load-bearing spacing that keeps adjacent rows' targets from overlapping, guarded in §32.
  Verified end-to-end in real Chrome at 390×844: 25 checks measuring computed colors, WCAG
  ratios from rendered pixels, underlines, and effective hit boxes (element rect + pseudo
  slop) across Today, Mass, Read, Search, Settings, Library, the Reader, and the commentary
  sheet, in both themes — the audit's measured heights ran ~2px larger than live geometry, so
  every slop was sized to what the browser actually measured, not the table.

### Changed

- The liturgical harness §1.3 hex pins moved with the tokens (they assert the exact accent
  table transcribed onto `--purple`), and the night-brand-purple pin documents the lift.
  Shells versioned: iOS `MARKETING_VERSION` and Android `versionName` 1.17.1,
  `versionCode` 11701.

## [1.17.0] — 2026-07-15 — nothing hidden

*"For there is not any thing secret that shall not be made manifest, nor hidden that shall not
be known and come abroad." (Luke 8:17)*

The behavioral half of the audit's sacred-page + accessibility pass (audit §9.3 —
FID-UX-001, FID-FUNC-006, FID-A11Y-001/002/003): nothing hides the selected verse, no failure
hides behind a complete-looking card, and nothing is hidden from the accessibility tree. The
visual-calibration half (day-theme contrast FID-A11Y-004, touch targets FID-UX-002) is
deliberately deferred to v1.17.1. No engine, data, or golden changes; no service-worker cache
bump (network-first shell; no sw.js/precache/index.html change — v1.16.0's bump was for a
shell-architecture change, this restyles an existing element).

### Fixed

- **The phone Reader action bar no longer covers the verse it acts on (audit FID-UX-001, the
  audit's last open P1).** The root cause: `position: fixed; left: 50%` gives a box only half
  the viewport to wrap in, so the bar stacked into a ~190px-wide, ~330px-tall tower over the
  text. On phones it is now a **docked, full-width bottom bar** — a deliberate four-column
  grid (reference + Close, the highlight swatches, then Bookmark · Note · Copy · Share with
  icon-over-label, the study actions Commentary/Catechism half-width each on their own row,
  the note editor full-width) that holds its shape at 320, 390, and 430 px. The page
  **reserves the bar's live height** (`--verse-actions-h`, measured by a ResizeObserver — the
  note editor and conditional actions change it) so the selected verse and the end-of-chapter
  links can always scroll clear, and selecting a verse near the bottom **scrolls it clear by
  the overlap** — bounded so the verse's first line never passes under the pinned toolbar,
  honoring reduced motion. Desktop ≥640px keeps the floating centered pill unchanged.
- **The Today card no longer hides a failed Mass load (audit FID-FUNC-006).** The Mass list
  has honest loading/ready/failed states: a skeleton reserves the list's approximate height
  (no more layout jump when it lands), and on failure a quiet notice with a real **Try again**
  appears — including for a date outside the bundled window, which *resolves* null rather than
  rejecting and previously read as a complete card missing its readings.
- **The liturgical color now has a spoken name (audit FID-A11Y-001).** The color chip on Today
  and the Mass page is marked decorative and an adjacent visually-hidden span speaks
  "Liturgical color: green/violet/white/red/rose/black" (white says "white" while painting
  gold — the token borrowing is design, the name is liturgy). New `.sr-only` utility.
- **Library's view switcher speaks its state (audit FID-A11Y-002).** Bookmarks · Highlights ·
  Notes are now an honest segmented group — `role="group"` ("Library view") with `aria-pressed`
  on each button, the repo's established idiom — with Export/Import outside the group. A real
  nested flex wrapper, not `display: contents` (which can strip the role from the a11y tree).
- **Async boundaries announce themselves, with restraint (audit FID-A11Y-003).**
  `role="status"` on state-transition text only — the Reader's loading/error, the Mass page's
  loading/unavailable notices, both Today failure notices, Library's export/import result —
  never on content containers (no read-the-whole-list regressions), and no `aria-busy`
  anywhere (erratic support). `VerseQuote`'s bare "—" is gone: a failure says "The verse
  couldn't be loaded — it will return with your connection." and an empty versification slot
  says "This passage is not numbered in this translation."

### Changed

- Small deliberate deltas visible on desktop too: the Bookmark toggle keeps a **constant
  label** with `aria-pressed` + a gold pressed ring (the APG toggle rule — it said
  "Unbookmark" before; gold honors, a bookmark is an honor mark), the Note button speaks its
  disclosure (`aria-expanded`), Close returns focus to the verse, and the overlap-only
  scroll-clear also protects the desktop pill (it scrolls only when the verse is actually
  covered). Verses carry `scroll-margin` so keyboard focus lands clear of the pinned chrome
  and the bar on every viewport.

### Added

- **Harness §31**: source-shape guards pinning the docked-bar CSS (while the desktop pill's
  `left: 50%` survives), the measure/reserve/cleanup wiring, the scroll-clear, the bar's group
  name and toggle semantics, the Mass three-state (both settle arms), the `.sr-only` clip
  pattern and spoken color on both pages, the Library group, the status roles, and the
  banished bare em dash.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.16.2→1.17.0, `versionCode` 11602→11700
  (shells version with the web app — the v1.15.1 lesson).

## [1.16.2] — 2026-07-15 — a just weight

*"A deceitful balance is an abomination before the Lord: and a just weight is his will."
(Proverbs 11:1)*

The correctness batch from the 2026-07-15 full product audit: five places where the app's
surfaces disagreed with each other — or with the truth — now agree
(`docs/review/Fidelis_Full_Product_Audit_2026-07-15.md` — FID-FUNC-001/002/003/004/007).
No engine, data, or golden changes; no service-worker cache bump (the shell is network-first;
the v1.15.1 precedent).

### Fixed

- **Search section counts are now the whole truth (audit FID-FUNC-001).** The scan no longer
  stops at the display cap — it sweeps all 78 books, tallying **exact** per-section counts,
  while only the rendered list stays bounded (first 300 per section, so New Testament results
  are displayable even when the Old Testament fills the overall cap first). A DRB search for
  *mercy* now reads All 434 · OT 377 · **NT 57 · Gospels 22** where the NT and Gospels chips
  falsely read 0 before. The count line reports the exact total (with a quiet "Showing the
  first 300 in this section." when truncated), "No verses in this section." appears only when
  a section's true count is zero, and the chips no longer render after a failed sweep — a
  partial tally must not present itself as exact. New pure collector
  (`groupsOf`/`emptyGroupedHits`/`addHit`/`snapshotGroupedHits` in `src/lib/search.ts`),
  directly asserted by harness §29.
- **The Reader no longer adopts a translation that failed to load (audit FID-FUNC-002).**
  `lastRead` and the global default persist only once the text actually arrives, gated on the
  loaded book's own identity (`data.translation`/`data.book`), which also closes the
  navigation window where the previous book's data is still in hand. Selecting unimported
  NABRE shows the error page and changes nothing; the navigation resets (selection, sheets)
  still fire on every route change.
- **Bookmarks open in the translation they were saved in (audit FID-FUNC-003).** Library
  bookmark links and display names now carry `bm.translation`, with a quiet ` · abbrev` tag
  when it differs from the current default. Highlights and notes remain passage-level by
  design — they follow the current translation.
- **The Verse of the Day cites the text it shows (audit FID-FUNC-004).** `VerseQuote` reports
  the translation actually rendered (`onShownTranslation`), and the Today card, the rosary
  mystery sheet, and the embeddable widget follow it in their citation and Reader link — so a
  DRB fallback can no longer sit under a NABRE citation linking to an unavailable route. The
  shown abbrev is named when it differs from the ask; the Share path already did this.
- **A past target date no longer creates a one-day reading plan (audit FID-FUNC-007).** The
  plan creator's date input floors at tomorrow, and submitting a past — or now, an empty —
  date keeps the form with a quiet inline error instead of silently clamping the whole
  selection into a single day (an empty date previously fell back to the per-day pace).

### Added

- **Harness §29–§30**: real logic tests for the Search group collector (exact counts vs
  bounded lists; the load-bearing case — a section list keeps filling after "All" is full;
  canon order; snapshot semantics) and source-shape guards pinning all five fixes.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.16.1→1.16.2, `versionCode` 11601→11602
  (shells version with the web app — the v1.15.1 lesson).

## [1.16.1] — 2026-07-15 — a faithful witness

*"A faithful witness will not lie: but a deceitful witness uttereth a lie." (Proverbs 14:5)*

The documentation made to tell the truth about the product that ships, and the native
workflows made to watch the scripts that shape them. This closes the release-safety findings
of the 2026-07-15 full product audit that are closable off-device
(`docs/review/Fidelis_Full_Product_Audit_2026-07-15.md` — FID-DOC-001, FID-REL-002,
FID-REL-003, and the documentation half of FID-NATIVE-001). No app code, engine, data, or
golden changes.

### Fixed

- **The README told the story of an older app (audit FID-DOC-001).** Four stale claims
  corrected: the Mass and Quote home-screen widgets ship on **both** platforms — not
  "Android (iOS spec'd to follow)"; the iOS WidgetKit trio shipped in v1.13.1/v1.13.2 — the
  Widget Extension target is created idempotently by `scripts/add-ios-widget-target.rb`, not
  "a one-time Xcode step (it can't be scripted)"; the "today's Gospel" App Intent and the
  Dynamic Type bridge shipped in v1.13.3 rather than "remain specified"; and phone navigation
  is the v1.16.0 collapsing masthead, not a bottom bar. The version badge travels with the
  release again.
- **The iOS guide verified a retired layout.** §1's notched-simulator check now describes the
  masthead (the brand row folds away, the tab row pins below the status bar, the backdrop
  strip covers rubber-band overscroll) instead of "the tab bar lifts above the home
  indicator"; §5's App Intent and Dynamic Type paragraphs describe the shipped implementation
  in the present tense (`TodaysGospelIntent.swift`, the `AppDelegate.swift` ↔
  `src/lib/dynamicType.ts` bridge) instead of instructing the reader to build it.
- **The "never disagrees" comments told a half-truth (audit FID-NATIVE-001, documentation
  half).** `scripts/build-calendar-widget.ts` and `TodaysGospelIntent.swift` now state the
  real policy: the widget/Siri data is generated for the USCCB (USA) calendar — the app's
  default region — and is **fixed** to it, so switching the app to the Universal calendar does
  not reach the native surfaces. The policy is now documented in the iOS guide (§5 "Region
  policy"); region-configurable widgets are deliberately deferred.

### Changed

- **The native workflows now watch their own tooling (audit FID-REL-002).** The iOS
  workflow's path filters gain the five native-shaping scripts
  (`add-ios-widget-target.rb`, `configure-ios-app-target.rb`, `build-votd-widget.mjs`,
  `build-calendar-widget.ts`, `ios-testflight.sh`); the Android workflow gains the two widget
  builders. Project-wiring or widget-pipeline changes can no longer land without a native
  build. The iOS simulator build switches Debug → **Release** — the configuration
  `scripts/ios-testflight.sh` actually archives — so CI proves the shipping profile.
- **The duplicate Xcode Cloud hook pinned to Node 22 (audit FID-REL-003).** The root
  `ci_scripts/ci_post_clone.sh` fallback installs `node@22` exactly like the canonical
  `ios/App/ci_scripts/` hook (it installed an unpinned `node`), and the release guide's §4
  now gives the exact `git checkout -- ios/App/CapApp-SPM/Package.swift` revert that
  `ios-testflight.sh` runs after its sync.

### Release mechanics

- iOS `MARKETING_VERSION` and Android `versionName` 1.16.0→1.16.1, `versionCode` 11600→11601
  (shells version with the web app — the v1.15.1 lesson). No service-worker cache bump: no
  shell asset changed. The stale App Store screenshots (audit FID-REL-001) still gate a store
  submission and need a macOS session to regenerate.

## [1.16.0] — 2026-07-14 — upon the candlestick

*"Neither do men light a candle, and put it under a bushel, but upon a candlestick, that it may
shine to all that are in the house." (Matthew 5:15)*

The navigation leaves the bottom of the phone screen and takes its place at the top — the
Collapsing Masthead — with the Reader and Mass pages each giving a row of chrome back to the
text. Design spec: `docs/superpowers/specs/2026-07-13-collapsing-masthead-nav-design.md`.
No engine, data, or golden changes.

### Changed

- **The Collapsing Masthead (spec §3).** On phones the five-tab bar no longer pins to the
  bottom edge. At the top of every page: the gold brand row with the tab row beneath it; on
  scroll the brand row folds away (normal document flow — no JavaScript, no animation) and the
  slim tab row stays pinned below the status bar. A fixed, `aria-hidden` backdrop strip
  (`height: env(safe-area-inset-top)`, `--bg-1`) keeps the notch painted after the brand
  scrolls off and during rubber-band overscroll. The More menu becomes the same drop-*down*
  it is on desktop; Android Back / Escape / outside-tap dismissal are unchanged. Deleted with
  the bottom bar: the header's `z-index: 45` escalation, the footer's `3.25rem` bottom
  clearance, and the verse-actions `3.75rem` lift (the bar now floats just above the home
  indicator). `--header-h` re-derives on phones to the pinned tab row; the SectionNav chip
  bars, the Reader toolbar, and `--anchor-offset` re-anchor automatically. Desktop ≥640px is
  visually unchanged. Every tab keeps its 44px touch box.
- **The Reader folio line (spec §4).** The brand header + two-row toolbar + "← All books"
  crumb above verse 1 become one slim pinned row: **`John 1 ▾ · DRB ▾ · Aa`**. The book+chapter
  control opens the chapter picker, now extended with the full book list (one tap re-targets
  the grid; the crumb is retired); the translation select keeps its one-tap switch; **Aa**
  gathers the set-and-forget controls (A−/A+ with the live px, the Scripture-face pills, the
  parallel-view select) into a "Text options" sheet. Gold dots, CCC marks, verse selection,
  the sheets, and the end-of-passage ‹ › chapter links are untouched.
- **One-row Mass controls (spec §5).** The two control rows become
  **`‹ · July 14, 2026 ▾ · ›`** — the date text is a facade over the real native date input
  (spoken as "Choose date"), a **Today** chip appears only when the shown date is off-today,
  and the translation select right-aligns. Same functions, half the chrome. Below 480px the
  date shows a short, yearless form ("Jul 14" — the full date repeats in gold in the day card
  directly beneath) and the label clips with an ellipsis rather than ever overlapping its
  neighbors, so the row genuinely holds one line on phones.
- **Search: no page changes** (owner correction) — it simply sits under the masthead.

### Added

- **Source-shape guards (§26–§28)** in the v1.15.1 convention: the sticky tab row and status
  strip must exist, the fixed bottom bar and its clearances must stay gone, the More menu must
  stay on the overlay-back stack, the folio picker/type menu keep their spoken names, and the
  Mass date facade keeps its labelled native input. The §11 identity-release acceptance checks
  are rewritten from the bottom bar to the masthead.

### Release mechanics

- Service-worker shell cache v5→v6 (app shell CSS/JS changed). iOS `MARKETING_VERSION` and
  Android `versionName` 1.15.1→1.16.0, `versionCode` 11501→11600 (shells version with the web
  app — the v1.15.1 lesson). App Store screenshots regenerate after this ships.

## [1.15.1] — 2026-07-05 — the lamp trimmed

*"Then all those virgins arose and trimmed their lamps." (Matthew 25:7)*

The front page's lamp relit — the Verse of the Day card no longer goes dark when the selected
translation isn't on the device — plus the native shells finally carrying their real version
(the v1.15.0 Xcode Cloud artifact was labelled "1.14.1 (1)"), one loader retry, and harness
coverage for three v1.14.2 fixes that had none.

### Fixed

- **The Verse of the Day card no longer goes dark.** `VerseQuote` — the Today page's front-page
  card and the rosary sheet's passage — rendered a bare "—" when the selected reader translation
  was import-only (NABRE, RSV-2CE, Platense) and not yet imported on-device (found via a
  beta-review screenshot). It now falls back to the bundled Douay-Rheims, the convention the
  share path (v1.14.2) and the Reader already followed; the `lang` attribute follows the text
  actually shown, so a fallback is voiced in its own language.
- **A failed Catechism read no longer sticks until reload.** `loadCCCText()` memoized an
  IndexedDB read failure as `null` forever — the last loader still missing the v1.14.2
  retry-after-rejection treatment. A failed read now clears the memo and the next call retries.
- **The native shells carry their own version.** v1.14.2→v1.15.0 bumped `package.json` but never
  the committed shells, so the Xcode Cloud Build 18 artifact said "1.14.1 (1)" while containing
  v1.15.0 code. iOS `MARKETING_VERSION` 1.14.1→1.15.1 (all four configurations;
  `CURRENT_PROJECT_VERSION` stays 1 — the release script overrides it at archive time) and
  Android `versionName` "1.14.1"→"1.15.1" / `versionCode` 11401→11501.

### Added

- **Source-shape guards for the three v1.14.2 UI fixes that had no coverage:** `Sheet`'s
  scroll lock must stay a layout effect and its focus trap must keep excluding `disabled`
  controls; `ScrollManager`'s offset recorder must keep its `isScrollLocked()` guard; and the
  `.reader-toolbar` sticky `top` must stay on `var(--header-h)`. A regression in any of them is
  a red `npm test` now, not a re-discovered iOS bug. A stale "ADVISORY" comment in
  `scripts/test-data.ts` was corrected — the §3.3 quote red list has been a hard build failure
  since v1.14.2.

No engine, data, or golden-snapshot changes.

## [1.15.0] — 2026-07-02 — our own tongues

*"We have heard them speak in our own tongues the wonderful works of God." (Acts 2:11)*

Spanish arrives: the **Biblia Platense** (Mons. Juan Straubinger, La Plata 1948–51) — the
classic Spanish Catholic translation — as the app's third import-only translation. Like the
NABRE, its text is **never bundled** (its U.S. copyright term has not clearly expired; the
standing rule holds): the user imports a copy they may lawfully use, and the whole app —
Reader, parallel view, Verse of the Day, share cards, Mass readings — works in Spanish.

### Added

- **`straubinger` translation** (`src/lib/translations.ts`): Spanish (`language: "es"`),
  import-only, honest copyright note. It appears everywhere translations do — the Reader
  toolbar, parallel view, Settings, the Translations page — with zero special-casing.
- **Versification normalization at import** (`normalizeImport` in `src/lib/import-formats.ts`).
  The app's grid is the Clementine Vulgate's (every cross-reference — lectionary spans, VOTD,
  commentary keys, CCC citations — addresses Vulgate coordinates). The Platense digital corpus
  was verified against the bundled Vulgate chapter-by-chapter (a full verse-count diff plus a
  per-chapter length-correlation sweep, every flagged chapter adjudicated by content): 1,330 of
  1,334 chapters already sit on the Vulgate grid, and exactly four carry their text at
  Hebrew/critical verse numbers — Exodus 8 (+4), Numbers 13 (+1), Psalm 10 (+1), and Mark 9
  (−1, the AV chapter break: its first verse belongs at Mark 8:39). The normalizer MOVES those
  verses to their Vulgate slots — it never alters a character — and each remap is gated on the
  chapter's exact pre-remap signature, so it is idempotent and inert on any other file.
- **Book-name resolution for the SWORD/scrollmapper family** (`resolveBookSlug`): leading
  roman-numeral ordinals ("I Samuel", "III John") and traditional aliases ("Song of Solomon",
  "Revelation of John", "Prayer of Manasses") now resolve — for every import format.
- **`lang` plumbing for Spanish**: `langAttr()`/`languageLabel()` (`src/lib/translations.ts`)
  replace the scattered `language === "la"` ternaries, so screen readers voice Spanish text as
  Spanish everywhere the Latin already worked (Reader, parallel column, readings, verse cards).

### Fixed

- **A textless placeholder book can no longer overwrite a real one.** Corpus files often carry
  empty appendix placeholders; via a name alias ("I Esdras" is the Douay name of Ezra) an empty
  placeholder imported after the real book would have clobbered it. The import now skips books
  with no text at all (`importedBookHasText`).

## [1.14.4] — 2026-07-02 — the watchmen

*"Upon thy walls, O Jerusalem, I have appointed watchmen: all the day and all the night they
shall never hold their peace." (Isaiah 62:6)*

The CI-hardening batch from the beta code review. No app code changes — every change is to the
gates that keep the product honest.

### Added

- **Android build CI** (`.github/workflows/android.yml`): nothing ever compiled `android/` —
  the three App Widget classes, the manifest, and the Gradle wiring could rot silently between
  releases. The new workflow builds the unsigned debug APK (Node 22 → web build → `cap sync
  android` → `gradlew assembleDebug` on JDK 21), path-filtered like `ios.yml`. (`sync`, not
  `copy`: it generates the uncommitted `capacitor-cordova-android-plugins/` subproject the
  committed Gradle wiring applies; the copy-not-sync rule guards an iOS-only trap.)
- **Monthly external-sources health check** (`.github/workflows/sources.yml` +
  `scripts/check-sources.mjs`): probes the five pinned upstream repos (GitHub commits API — a
  deleted or force-pushed upstream ends pipeline reproducibility, and the committed outputs are
  then the only copy) and every unique vatican.va page the §5 CCC layer links to (HEAD with GET
  fallback, one retry). Either failing turns a silent, unbounded exposure into a red monthly run.

### Changed

- **`scripts/` is linted.** The eslint flat config gains a Node-globals tier for the ~4,000-line
  data pipeline and both harnesses (`eslint src scripts` in both `npm run lint` and the `npm
  test` gate). The sweep found six latent issues (four `prefer-const`, one dead `DATA_DIR` in
  `build-manifest.mjs`, one dead extraction in `test-data.ts`) — all fixed; zero warnings remain.
- **CI runs once per change, not twice.** `ci.yml` triggered on every push AND every pull
  request, doubling every feature-branch run; pushes now gate `main` only (PRs cover branches),
  and all three build workflows carry a `concurrency` group that cancels superseded runs.
- **`ios.yml` (and the new `android.yml`) trigger on `public/**`** — the entire data corpus
  ships inside the native binaries, so a corpus change now proves the shells still build.
- **Xcode Cloud pins Node 22** (`ci_post_clone.sh` installs `node@22`, keg-only PATH handled),
  matching the GitHub workflows, so an Xcode Cloud archive can never silently build with a newer
  Node major than CI tested.

## [1.14.3] — 2026-07-02 — the gathered fragments

*"Gather up the fragments that remain, lest they be lost." (John 6:12)*

The Catena Aurea de-duplication: the commentary layer drops from ~40 MB to ~10 MB on disk — a
~25 MB cut to the shipped app binary — and opening a Gospel's commentary parses ~5× less JSON.
What the Reader shows is unchanged to the character (verified: the new format expands to the
legacy corpus identically across all 3,736 verse keys of all four Gospels).

### Changed

- **The Catena is stored once per pericope (format 2).** The Catena comments by *span*: one
  patristic chain covers a pericope of verses. The legacy files broadcast that chain into every
  verse it covered — the same comments copied dozens of times (matthew.json alone was ~10 MB,
  parsed on the main thread on first open). `scripts/build-catena.mjs` now emits
  `{ format: 2, blocks: [{ keys, entries }] }` — each chain stored once with the grid verse keys
  it covers (post-remap, so a chain can legitimately span the Mark 8/9 chapter boundary) — and
  `expandCatenaSpans()` (`src/lib/commentary.ts`, pure and fixture-tested) re-broadcasts at load
  time in `loadCommentary()` into the same per-verse map the Reader and CommentarySheet always
  consumed. Sizes: matthew 9.9→2.1 MB, luke 8.9→1.5 MB, john 6.4→1.3 MB, mark 4.8→0.7 MB;
  `public/data` 56→31 MB, the built `dist/` 57→32 MB.
- **Legacy files still load.** `loadCommentary()` detects the format, so a pre-format-2 file
  served from a migrated service-worker data cache (or any legacy per-verse map, like Haydock's)
  passes through unchanged — no data-cache bump needed.
- **The harness asserts the new shape end-to-end:** the committed files must *be* format 2, the
  §15 grid/incipit checks and §16 label sweeps run over the same expanded map the app consumes,
  and new fixtures pin `expandCatenaSpans` (broadcast, document order, and the identical-comment
  collision rule a versification remap depends on). The Settings offline "commentary" download
  shrinks with it (the manifest's bundle sizes are recomputed from the same walk).

## [1.14.2] — 2026-07-02 — kept watch

A reliability pass from the beta code review: the licensing gate made unskippable, the widget
data horizon put under test, and seven traced user-facing defects fixed. No feature changes;
`public/data/` is byte-identical (the quotes corpus regenerates identically under the new gate).

### Fixed

- **Navigating with a sheet open no longer lands the destination at the wrong scroll offset.**
  `Sheet`'s scroll-lock effect is now a layout effect, so its cleanup (which restores the
  pre-lock scroll position) runs *before* `ScrollManager` positions the new page — picking a
  chapter from the chapter grid now lands at the top of the new chapter, not mid-way down it.
  `ScrollManager`'s recorder also ignores scroll events while the body is pinned
  (`isScrollLocked()` in `src/lib/scrollLock.ts`), so opening a sheet no longer clobbers the
  Back-restore offset with `0`.
- **The Reader toolbar no longer slides under the header on notched iPhones.** Its sticky `top`
  was a hardcoded `3.4rem` predating the `--header-h` token (which includes
  `env(safe-area-inset-top)`); it now uses the token, like `SectionNav` already did.
- **"Today" now rolls at midnight and on foreground resume.** A new `useToday()` hook
  (`src/useToday.ts` — timer to next local midnight + `visibilitychange`) drives the Today page,
  the Readings page's default date, and the liturgical accent, so a phone that keeps Fidelis
  resident overnight never shows yesterday's verse, readings, or color.
- **A transient network failure is no longer cached forever.** `loadLectionary()` and
  `loadQuotes()` memoized the fetch *promise*, so one offline blip pinned the Mass readings and
  the Quote of the Day to the same rejection until a full reload; the memo now clears on
  rejection and the next call retries. The same reset applies to `loadManifest()`, `loadCCC()`,
  and `loadTrent()` transport failures (a genuine 404 stays cached, as before).
- **Errors no longer masquerade as emptiness.** An offline search now says the search couldn't
  reach a book (instead of "No verses found" — telling the user scripture doesn't contain their
  word); a failed Quote of the Day shows a quiet notice instead of a skeleton forever; and the
  Verse of the Day's Share falls back to the bundled Douay-Rheims (cited honestly) when the
  selected translation isn't available, instead of silently doing nothing.
- **Search highlighting tracks the executed query, not the live input.** Editing the search box
  after a search no longer mis-highlights (or un-highlights) the results already on screen.
- **A Catena label can no longer be attributed to the wrong Father.** `matchFather` matched any
  label that merely *began* with an alias, so "Leontius" would have resolved to Leo the Great —
  and been flagged a Doctor. Aliases now match only at a word boundary; the Latin form
  "Damascenus" (which relied on the loose prefix) is an explicit John Damascene alias, and the
  harness gained negative over-match assertions.
- **A corrupt stored `calendarRegion` now falls back to the documented default** (USA) explicitly
  in `getSettings()`, like the existing theme/font/Trent-edition guards, instead of silently
  behaving as Universal while claiming otherwise.

### Changed

- **The §3.3 quote red list is now a hard build failure.** `scripts/build-quotes.mjs` refuses to
  emit a corpus containing non-public-domain authors unless `ALLOW_RED_LIST=1` is set explicitly
  (printing the flagged ids either way), so the closed-beta exception can never silently ride
  into a public App Store release.
- **The widget data horizon is under test.** The committed pre-resolved `calendar.json` covers a
  fixed window (currently through 2027-12-31); on the day it ran out, every installed home-screen
  widget would silently degrade to fallback text. The harness now fails if the window doesn't
  cover today+180 days, and asserts the iOS and Android copies are byte-identical (mirroring the
  existing `votd.json` parity check).
- **Focus is trapped correctly in sheets with disabled controls.** The `Sheet` focus trap now
  skips `disabled` buttons/inputs (a disabled boundary element let Tab escape into the page
  behind during a share/save) and recognizes `select`/`textarea`.
- **Unlabeled controls gained `aria-label`s** — the Reader toolbar's four selects, the Search
  box and its translation select, the Readings date input and translation select — and the
  Readings page's liturgical color chip now names its color (`title`), matching the Today card.

## [1.14.1] — 2026-06-28 — set right

Three fixes found in the v1.14.0 TestFlight build: a Mass reading shown under an unexpected book
name, a Catechism import that rejected a common file, and a "Save image" that claimed success but
saved nothing on iOS.

### Fixed

- **Mass readings are cited in modern book names.** The Today card and the Readings page labelled
  each reading using the *selected Bible's* naming, so a Douay-Rheims reader saw "4 Kings
  4:8-11,14-16" for the Thirteenth Sunday's first reading. Citations now pin to the modern
  lectionary name ("2 Kings"), independent of the translation the reading text is rendered in
  (`formatLectionaryCitation` in `src/lib/lectionary.ts`). This covers all three Mass-citation
  surfaces — the Today card, the Readings page, and the pre-resolved home-screen **widget** data
  (`calendar.json`, regenerated for iOS and Android, which had still carried Douay names). The
  Bible Reader and book picker stay translation-aware.
- **The St. Charles Borromeo Catechism export now imports.** `parseCccText` recognizes the
  scborromeo.org `page_nodes`/`ref-ccc` shape and converts it on-device to a `fidelis-ccc-1`
  paragraph map (all 2865 ¶, full coverage of the 1258 cited ¶). Footnote apparatus is stripped,
  block-quote/continuation paragraphs are joined with a space, and unambiguous section headings
  (all-caps, roman-numeral, or TOC-listed titles) are dropped — conservatively, so that a split
  sentence, a maxim, or a scripture quotation is never mistaken for a heading and deleted. Owners
  import that `ccc.json` directly on iOS — no desktop converter needed. The modern Catechism text
  remains **never bundled**.
- **The share card's "Save image" saves to Photos on iOS.** The web `<a download>` is a no-op
  inside the WKWebView; a minimal in-app Capacitor plugin (`ios/App/App/SaveImagePlugin.swift`)
  writes the PNG to the photo library via `UIImageWriteToSavedPhotosAlbum`, using only the
  add-only `NSPhotoLibraryAddUsageDescription` permission. The plugin is **registered** with the
  Capacitor bridge by a `MainViewController` (`CAPBridgeViewController` subclass) in
  `capacitorDidLoad()` — Capacitor only auto-registers npm-package plugins (via
  `capacitor.config.json`'s `packageClassList`), so a loose app-target plugin must be registered
  explicitly or it never loads, and the Photos permission prompt never even appears. On Android,
  where the same download also fails, Save now routes through the system share sheet rather than
  falsely reporting success. Desktop and web keep the file download.
- **Xcode Cloud archive builds.** The iOS project links the Capacitor plugins as local Swift
  packages under `node_modules/`, and the web bundle isn't committed — but Xcode Cloud never ran
  `npm`, so package resolution failed (`node_modules/@capacitor/app doesn't exist`). Added a
  post-clone hook (`npm ci` → `npm run build` → `npx cap copy ios`) at
  `ios/App/ci_scripts/ci_post_clone.sh` — Xcode Cloud resolves `ci_scripts/` **relative to the
  `.xcodeproj`**, which lives in `ios/App/`, so a repo-root copy alone is reported "not found" — and
  committed a shared **App** scheme (the workflow had been archiving the widget extension). The hook
  uses `cap copy`, not `cap sync`, so it never rewrites the committed `Package.swift` platform. Point
  the Xcode Cloud workflow's scheme at **App**.

## [1.14.0] — 2026-06-27 — the open catechism

The Catechism stops being a link out and becomes something you read in place, the Golden
Chain finally reads in the order the Fathers spoke, and the daily quote draws from a corpus
large enough never to repeat inside a year. One release, several long-promised pieces of the
§3/§4.3/§5 plan.

### Added

- **The inline Catechism (§5 text tier, CCC P1).** A cited verse's Catechism affordance now
  opens an inline sheet instead of forcing a redirect: the bundled **public-domain Roman
  Catechism (Trent), McHugh-Callan 1923**, browsable by the Creed, the Sacraments, the
  Commandments, and the Lord's Prayer, with the precise vatican.va ¶ links kept *inside* the
  sheet. Built from a pinned GitHub source (`mborders/romanus`, MIT digitization of the PD
  text) into a sealed `public/data/trent/trent.json`. The sheet wears **no gold** — purple
  acts, the source credit is muted provenance.
- **Import your own modern Catechism (§5 text tier, CCC P2).** If you own a digital copy of
  the modern *Catechism of the Catholic Church*, import it (Settings → Magisterium) as a
  `fidelis-ccc-1` JSON; it is stored **only on your device** (IndexedDB) and supersedes Trent
  for a cited verse, showing the ¶ text inline. A local-only Mac converter
  (`scripts/build-ccc-text.mjs`) turns an owned EPUB/PDF into that file. **The modern CCC text
  is never bundled or committed** — only your imported copy renders.
- **A death/floruit year on every Catena Father** plus a `PSEUDO_YEARS` map dating the
  pseudonymous voices by their composition era, behind a pure, tested `sortChronological`.
- **A 538-quote corpus** with a deterministic, seeded rotation that **never repeats a quote
  within a calendar year** (sanctoral feast → liturgical season → seeded random fill), matched
  bit-for-bit by the home-screen widgets.

### Changed

- **The Catena Aurea now reads earliest-Father-first** (§4.3 Phase 1) — Origen and Chrysostom
  before the medieval voices — with a gold `· c. 407` date inside the attribution label and a
  quiet "Glossa & other sources" divider after the Fathers. A pure render-time sort; no text,
  data file, or manifest changed.
- **The patristic commentary tab is now "Church Fathers"** (§4.3 Phase 2), not "Catena Aurea";
  the specific source moves to a per-book credit line. Haydock and the Church Fathers stay two
  tabs that never interleave, and the gold verse dot is stated and shown as **Haydock-only**.
- **The home-screen widgets follow the system appearance** (light/dark) on both iOS
  (`@Environment(\.colorScheme)`) and Android (`values-night/`), matching the app.

### Notes

- Bundled-text, liturgical-engine, and golden-snapshot behavior is unchanged. The §5 CCC
  citation index (`ccc/index.json`, `ccc/url.json`) is byte-for-byte as shipped in v1.9.0. The
  upstream source pins grow from four to five (the new Trent pin); the manifest is resealed to
  record it.
- **Closed-beta note (re-gate before any public release):** the quote corpus deliberately
  includes a small number of quotations from authors whose works are still under copyright
  (recent popes and other modern figures), so the §3.3 public-domain red list is currently an
  **advisory** in `scripts/build-quotes.mjs`, not a hard build gate. This is intentional for the
  closed TestFlight beta; the red list must be restored to a hard fail (or those quotes removed)
  before any public App Store release.

## [1.13.3] — 2026-06-25 — made ready

The release that makes Fidelis ready to hand to a tester: the iOS app archives and uploads
cleanly, the last open piece of the design spec (§9) closes with a Siri App Intent and Dynamic
Type, the documentation revamp lands, and three design finishes retire the last hand-tuned rough
edges. No change to the liturgical engines, the bundled texts, or the harnesses' computed results.

### Added

- **"What's today's Gospel?" — a Siri / Shortcuts App Intent** (spec §9). Ask Siri (or run a
  Shortcut) and Fidelis speaks the day's Mass Gospel citation, with the celebration or season as
  context — without opening the app. It reads the same pre-resolved `calendar.json` the home-screen
  widgets read, keyed by the identical Gregorian local-date key, so Siri, the widgets, Android, and
  the web app can never disagree. iOS 16+; `ios/App/App/TodaysGospelIntent.swift`.
- **Dynamic Type** (spec §9). A new "Follow the system text size" control (iOS, Settings → Text
  size) lets the reading size track iOS Settings → Display & Brightness → Text Size; the Reader's
  A−/A+ pills remain the override (touching them turns following off). The native shell mirrors
  `UIApplication.preferredContentSizeCategory` into the web layer; the pure token→px mapping
  (`contentTokenToPx`) is harness-tested. A fresh install follows the system size; an existing user
  keeps the size they already chose.
- **A first-party iOS privacy manifest** (`PrivacyInfo.xcprivacy`): declares no tracking and no
  collected data (spec §13), plus the one required-reason API the app touches (UserDefaults, CA92.1).

### Changed

- **Documentation revamp** (the seven-task `docs/` overhaul): a hub-and-spoke `docs/INDEX.md`, the
  release narrative archived to `docs/history/RELEASES.md` with a slim CLAUDE.md ledger, guides moved
  under `docs/guides/`, CONTRIBUTING + a releasing runbook + a specs/plans status index, a README
  front-door rewrite, and a `check-docs` link-checker wired into CI so a dead doc link fails the build.
- **The inline icon set retires the last raw Unicode glyphs.** A `close` (✕) and `check` (✓) mark
  join the set, replacing the bare glyphs on the Sheet close button, the highlight-clear control, the
  verse-actions close, the version checkmark, the "Saved" state, and the "Mark portion read" CTA — so
  every control draws from the one `currentColor` SVG family. The harness now forbids ✕/✓ in `.tsx`
  alongside the older glyphs.
- **The verse-action bar groups its highlight swatches.** The four colour dots (and the clear button)
  sit in one hairline-fenced segment, so on a narrow phone they never interleave with the rectangular
  labelled actions when the bar wraps.
- **Quiet loading placeholders.** The Verse-of-the-Day and Quote-of-the-Day cards reserve the height
  their text will take with dim, motion-free skeleton lines (no shimmer; reduced-motion-safe by
  construction), so the Today grid no longer reflows when the async text lands.
- **iOS build hygiene for the App Store:** the export-compliance key `ITSAppUsesNonExemptEncryption`
  is set to `false` (the app uses only exempt OS-provided HTTPS), the deprecated `"iPhone Developer"`
  code-sign identity is modernized to `"Apple Development"`, and the legacy `armv7` device capability
  is replaced with `arm64`. A new idempotent `scripts/configure-ios-app-target.rb` wires these (and the
  Intent / privacy / calendar resources) into the project, and `add-ios-widget-target.rb` now derives
  the widget's version from `package.json` instead of a frozen literal.

### Fixed

- **The docs link-checker's heading slug now matches GitHub's** (`scripts/check-doc-links.mjs`): it was
  collapsing runs of whitespace into a single hyphen, but GitHub replaces each space individually, so
  ~11 of the release-ledger "→ detail" anchors (headings with an em-dash flanked by spaces) resolved
  locally yet landed at the top of `RELEASES.md` on github.com. Fixed the slug and regenerated the
  affected anchors; the checker would now catch the regression class.
- Corrected a stale `docs/IOS.md` link label in the moved Android guide, and flipped the two
  documentation-revamp status markers in `docs/superpowers/INDEX.md` from "in progress" to shipped.

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
  faces that each look obviously different. (An older saved "serif" choice migrates to Garamond, the
  default — the boot script and `getSettings` both normalize the retired id, so it never re-applies.)

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
  `font-display: swap` then repaints. Verified on device (rendered widths now differ across the four
  faces). A no-op on the web, where the font already loaded.
- **The iOS home-screen widgets never appeared** — the WidgetKit Swift sources and JSON existed, but
  there was no Widget Extension target in the Xcode project, so nothing was built or installed.
  `scripts/add-ios-widget-target.rb` (idempotent, uses the `xcodeproj` gem) adds the
  `FidelisWidgetExtension` app-extension target, compiles `FidelisWidget.swift` +
  `CalendarWidgets.swift`, bundles `votd.json` + `calendar.json` and `Info.plist`
  (`com.apple.widgetkit-extension`), and embeds the `.appex` in the App target. All three widgets
  (Verse of the Day, Today at Mass, Quote of the Day) build and embed and support the small, medium,
  and large families. This automates the previously manual `docs/IOS.md` §5 step.

### Changed

- **Service-worker shell cache `v4`→`v5`** (`public/sw.js`) so an installed/PWA copy fetches this
  build (the new Scripture faces and the Chi-Rho icon) instead of serving stale cached assets.

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
  [docs/guides/ANDROID.md](docs/guides/ANDROID.md). The committed `android/` mirrors the iOS
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
