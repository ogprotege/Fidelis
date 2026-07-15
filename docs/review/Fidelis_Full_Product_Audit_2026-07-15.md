# Fidelis full product audit

*For maintainers deciding what to fix, preserve, simplify, or defer.* · [← Docs index](../INDEX.md)

- **Audit date:** 2026-07-15
- **Version:** 1.16.0, “upon the candlestick”
- **Commit:** `0e8a703f1d68d3ab6a897fdab87f65f22c67086f`
**Scope:** React application, generated-data runtime, PWA, iOS and Android shells,
native widgets, release workflows, product documentation, usability,
accessibility, performance, privacy, and security posture.

---

## 1. Executive verdict

Fidelis is a strong, unusually disciplined application. Its most important
claims are substantially true: the bundled texts are manifest-sealed, the
copyright wall is principled, the liturgical and lectionary engines are heavily
tested, the app has no telemetry or account system, and the visual identity is
coherent. The app should be refined, not redesigned.

No P0 defect was found. Five P1 findings deserve attention before calling the
product fully polished:

1. A common Search query can falsely report zero New Testament or Gospel
   matches because the global 300-result cap stops the canonical scan in the Old
   Testament.
2. Selecting an unavailable import-only translation in the Reader persists it
   as the global default even though the text failed to load.
3. The fixed Reader action bar can cover most of the selected verse and the
   chapter navigation on a phone.
4. Bible imports are unbounded and non-atomic, so a quota or write failure can
   leave a partial mixture of old and new books.
5. The App Store screenshots are explicitly stale for the current navigation
   and should block a 1.16.0 store submission.

The highest-value direction is not more functionality. It is to make current
state transitions honest, keep the selected Scripture visible, complete the
accessibility semantics, and align native/release surfaces with the current app.

### Product-goal scorecard

| Goal | Assessment | Evidence |
|---|---|---|
| Textual fidelity and provenance | **Strong** | All 319 generated files re-hash to the committed manifest; five upstream commits are pinned. |
| Liturgical and lectionary accuracy | **Strong** | Both regions pass golden years 2024–2027, trap dates, Gospel sweeps, psalm mapping, memorial propers, and Vigil ordering. |
| Simple surface, deep cellar | **Strong with one major exception** | Five-card Today and collapsed study sheets work; the Reader action bar becomes a large overlay on phones. |
| Privacy and copyright discipline | **Strong** | No telemetry, accounts, ads, or bundled copyrighted Bible/CCC text were found. |
| Failure-state honesty | **Needs work** | Today hides failed Mass data, storage writes can fail silently, and unavailable translations can become defaults. |
| Accessibility | **Good foundation, incomplete execution** | Focus management and sheets are strong; contrast, live regions, tab semantics, color naming, and touch targets need work. |
| Performance | **Acceptable locally, below Core Web Vitals targets** | Low blocking time, but mobile Lighthouse found LCP 3.2–3.9 s and CLS up to 0.304. |
| Native parity | **Mostly sound** | Widget formulas/data are shared and native builds are green; region selection and iOS widget taps are not shared. |
| Release readiness | **Needs work** | Versions and icon are correct; screenshots and portions of the iOS release gate/documentation are stale. |
| Documentation truth | **Needs reconciliation** | README still describes the retired bottom bar and shipped iOS work as future work. |

---

## 2. Method and limitations

### 2.1 What was executed

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run check-docs`
- `npm audit --audit-level=high`
- Mobile manual journeys in Chrome 148 with iPhone emulation.
- Programmatic Chrome DevTools Protocol checks at 320×568, 390×844,
  844×390, 768×1024, and 1280×800.
- Mobile Lighthouse runs on Today, Reader, Search, Mass, and Settings.
- Focused runtime probes for Search, Reader overlap, offline-cache state,
  Catena loading, long chapters, and share-card PNG creation.
- Static inspection of the Capacitor projects, WidgetKit/App Widget code,
  App Intent, Dynamic Type bridge, native privacy/configuration, release
  scripts, and GitHub workflows.
- Read-only inspection of recent GitHub workflow outcomes.

### 2.2 What could not be executed here

This Linux environment has no Xcode, iOS Simulator, Android emulator, Apple
signing identity, or App Store Connect release credentials. The latest remote
iOS and Android workflows were inspected, but the following remain device or
macOS acceptance tests:

- Safe areas and rubber-band overscroll on actual iPhone hardware.
- VoiceOver pronunciation and navigation order.
- Dynamic Type bridge behavior at every accessibility category.
- iOS edge-swipe Back while a sheet is open.
- Add-only Photos permission, Save Image plugin, and native share sheet.
- Widget rendering, midnight refresh, Siri/App Intent, and time-zone travel.
- Release archive, export signing, TestFlight upload, and App Store validation.
- Android hardware Back timing and widget refresh under power restrictions.

Static evidence is labeled separately from runtime-confirmed behavior.

### 2.3 Severity model

- **P0:** corrupts Scripture/liturgy, causes unrecoverable user-data loss, or is
  an exploitable critical security flaw.
- **P1:** breaks a core journey, materially misstates content, can leave a
  partial corpus, obscures Scripture, or blocks a release.
- **P2:** significant accessibility, reliability, performance, native-parity,
  or product-consistency defect.
- **P3:** edge case, minor polish gap, low-risk hardening item, or measured
  optimization opportunity.

---

## 3. Baseline results

| Check | Result |
|---|---|
| `npm run lint` | Pass; `src` and `scripts` clean. |
| `npm test` | Pass; all liturgical, data, parser, widget, manifest, and source-shape checks pass. |
| `npm run build` | Pass; TypeScript and Vite build clean. |
| `npm run check-docs` | Pass; 93 Markdown files, all links and anchors resolve. |
| `npm audit --audit-level=high` | Pass; zero known vulnerabilities. |
| Current Linux CI | Pass at the audited commit. |
| Latest iOS workflow | Pass at `83fd72d`; current head later changed `scripts/ios-testflight.sh`, which is outside the iOS workflow path filter. |
| Latest Android workflow | Pass at `83fd72d`; subsequent audited changes are iOS/docs-only. |
| Native versions | `package.json`, all four iOS `MARKETING_VERSION` values, and Android `versionName` all equal 1.16.0. |
| iOS icon | Tracked 1024×1024 `AppIcon-512@2x.png` exists and matches the asset catalog. |

### Production build

| Asset | Size |
|---|---:|
| Main JavaScript | 423,026 B; 134.17 kB gzip |
| Secondary JavaScript | 844 B |
| Global CSS | 38,230 B; 8.12 kB gzip |
| Four EB Garamond faces | 147,088 B |
| Full `dist/` | 32,389,067 B |
| Generated `public/data/` | 31,768,951 B |
| Commentary corpus | 16,096,213 B apparent size |
| Native `calendar.json` per platform | 428,471 B |
| Native `votd.json` per platform | 63,837 B |

The 32 MB bundle is an intentional offline-native tradeoff, not itself a defect.

---

## 4. P1 findings

### FID-FUNC-001 — Search result caps make section filters factually wrong

- **Status:** Runtime confirmed
- **Evidence:** `src/pages/Search.tsx:82-99`, manual Search run, bundled NT files
- **Impact:** Core content discovery returns a false negative.

Search appends results in canonical book order and stops the entire scan when
`found.length` reaches 300. The section chips then count only that truncated
array. A DRB search for `mercy` returned:

- All: 300
- Old Testament: 300
- New Testament: 0
- Gospels: 0

That result is false. The term occurs in at least 18 bundled New Testament book
files, including Matthew, Mark, Luke, Romans, Hebrews, James, and 1 Peter.

**Reproduction**

1. Open Search with DRB.
2. Search for `mercy`.
3. Select New Testament or Gospels.
4. Observe “No verses in this section.”

**Direction**

Continue the corpus scan after the display cap. Track exact counts by section
and retain a bounded display list per section, or apply the active section
before the cap. Do not show zero unless that section was actually scanned.

**Acceptance**

- `mercy` produces non-zero NT and Gospel counts.
- Every chip count is derived from a complete scan.
- The rendered result list remains bounded.
- Cancellation through `runId` still works.

---

### FID-FUNC-002 — Reader persists an unavailable translation as the global default

- **Status:** Runtime confirmed
- **Evidence:** `src/pages/Reader.tsx:92-103`, `151-170`; browser storage inspection
- **Impact:** One failed selection can poison later Today, Reader, Search, Library,
and last-read navigation.

The Reader persists `translation` and `lastRead` when the route has a valid book,
not when `loadBook()` succeeds. Selecting unimported NABRE produced the expected
Reader error, but browser storage then contained:

```text
fidelis:settings → translation: "nabre"
fidelis:lastRead → translation: "nabre", book: "genesis", chapter: 1
```

This is especially confusing because Settings correctly treats an unimported
card as locked.

**Reproduction**

1. Start with DRB and no NABRE import.
2. In Reader, choose NABRE.
3. Wait for the “not bundled” error.
4. Inspect Settings/last-read behavior or reload.

**Direction**

Persist a translation only after a successful `loadBook()`, or reject the
selection before navigation when an import-only translation is unavailable.
Keep an unavailable option visible as an import route, not as an active default.

**Acceptance**

- Failed loads do not change `settings.translation` or `lastRead`.
- Successful imported translations persist normally.
- Removing the active import falls back explicitly and updates affected links.

---

### FID-UX-001 — The phone Reader action bar obscures selected Scripture

- **Status:** Runtime confirmed
- **Evidence:** `src/styles.css:948-968`, `src/pages/Reader.tsx:264-268`,
  `484-574`; Chrome geometry probe
- **Impact:** The app’s primary reading surface hides the verse the user just acted on.

At 390×844, the verse-action bar measured about 188–195 px wide and 330 px tall.
At the end of John 3 it overlapped:

- 116.6 px of the selected verse.
- 37 px of chapter navigation.

The bar consumes roughly 39% of the viewport because labeled actions and
highlight swatches wrap into a narrow fixed container. Selecting a verse does
not scroll it clear of the bar and the page reserves no conditional bottom
space.

**Direction**

Use a deliberate phone action surface rather than intrinsic flex wrapping:

- Reserve bottom space while the bar is open.
- Scroll the selected verse into the visible area above it.
- Give the action surface a stable phone width.
- Keep labels, but arrange them as a compact grid or bottom sheet.
- Preserve the current desktop presentation if it remains compact.

**Acceptance**

- The selected verse and chapter controls never intersect the action surface.
- Note editing remains fully visible above the keyboard.
- Every action remains keyboard and screen-reader operable.
- The layout remains stable at 320, 390, and 430 CSS px.

---

### FID-DATA-001 — Bible import is unbounded and non-atomic

- **Status:** Code-confirmed failure path; quota injection still required
- **Evidence:** `src/pages/Translations.tsx:24-48`,
  `src/lib/data.ts:55-99`
- **Impact:** A large or interrupted import can freeze the UI or leave a partial,
mixed translation.

The importer:

1. Reads the entire file with `file.text()` without a size limit.
2. Parses and normalizes it on the main thread.
3. Writes books one at a time in separate IndexedDB transactions.
4. Does not clear or stage the previous corpus before replacement.
5. Has no rollback if book N fails.

A quota failure can therefore leave new books 1 through N−1 beside old books
that were absent from the replacement file.

**Direction**

- Reject files above a documented bound before reading.
- Parse large imports in a Worker.
- Validate the whole normalized corpus first.
- Write into a staging namespace in one transaction where practical.
- Switch an active-version marker only after every write succeeds.
- Remove the prior namespace only after the swap.

**Acceptance**

- Injecting a write failure leaves the prior corpus unchanged.
- Replacing with a smaller valid corpus cannot retain absent old books.
- Quota errors name the cause and recovery path.
- Oversized files fail before full read/parse.

---

### FID-REL-001 — Current App Store screenshots are stale

- **Status:** Documentation-confirmed release blocker
- **Evidence:** `docs/guides/APP_STORE.md:159-183`
- **Impact:** A 1.16.0 submission would advertise the retired bottom navigation.

The App Store guide explicitly marks the 2026-07-13 screenshots stale. Version
1.16.0’s primary visual change is the collapsing masthead, so this is not a
minor screenshot drift.

**Direction**

Regenerate and visually inspect the complete screenshot set against a Release
simulator build before submission. Keep the existing shot list, but show the
masthead and current Reader/Mass controls.

**Acceptance**

- Every required size is RGB and exact.
- No screenshot shows the old bottom bar.
- Day and Night screenshots use current tokens.
- The first three images tell the Today → Reader → Mass story.

---

## 5. P2 findings

### FID-FUNC-003 — Library bookmarks ignore their saved translation

- **Status:** Runtime and code confirmed
- **Evidence:** `src/lib/storage.ts:20-23`,
  `src/pages/Library.tsx:25`, `56-63`, `110-112`
- **Impact:** A bookmark can open different wording from the text the user saved.

Bookmarks store `translation`, but `Library.refLink()` always uses the current
global setting. A CPDV bookmark opened under the later NABRE/DRB default.

**Direction:** Pass `bm.translation` into the link and display name. Decide
explicitly whether highlights and notes are passage-level or
translation-specific; their current model has no translation.

---

### FID-FUNC-004 — Fallback text and navigation can name different translations

- **Status:** Code confirmed
- **Evidence:** `src/components/VerseQuote.tsx:16-70`,
  `src/pages/Home.tsx:85-111`, `178-193`,
  `src/components/MysterySheet.tsx:17-40`
- **Impact:** Today and Rosary may show DRB fallback text, then link into an
unavailable NABRE/RSV-2CE Reader route.

`VerseQuote` privately tracks the translation actually rendered, but the parent
citation and Reader link still use the requested translation.

**Direction:** Resolve availability once above the quote component and use the
effective translation for text, language, citation, link, and sharing.

---

### FID-FUNC-005 — Search cannot search imported translations despite Settings copy

- **Status:** Code and UI confirmed
- **Evidence:** `src/pages/Search.tsx:175-184`,
  `src/pages/Settings.tsx:263-266`
- **Impact:** An imported NABRE, RSV-2CE, or Straubinger can be selected as the
default but cannot be searched.

Settings says the chosen version is the default “everywhere — Today, the book
list, search, and the Reader.” Search hard-filters to `t.bundled`.

**Direction:** Either search available IndexedDB translations or change the
product promise and force an explicit bundled Search preference. Searching the
available imported corpus is the more coherent behavior.

---

### FID-FUNC-006 — Today silently removes Mass readings on load failure

- **Status:** Runtime confirmed with request blocking
- **Evidence:** `src/pages/Home.tsx:47-60`, `152-171`
- **Impact:** The first card looks complete while a core portion is missing.

Blocking `data/lectionary.json` removed First Reading, Psalm, and Gospel without
loading text, error copy, or retry affordance. The same late insertion causes a
large layout shift when loading succeeds.

**Direction:** Give Mass data explicit `loading`, `ready`, and `failed` states
inside the existing card. Reserve the final list’s approximate height, and offer
a retry or the Mass route on failure.

---

### FID-FUNC-007 — Past plan dates are accepted as one-day plans

- **Status:** Runtime confirmed
- **Evidence:** `src/lib/plans.ts:41-47`,
  `src/pages/PlanCreator.tsx:34-42`, `98-108`
- **Impact:** A malformed plan is created with no explanation.

`targetDateToPerDay(50, now, 2020-01-01)` returns 50 chapters/day and one total
day because negative duration is clamped to one.

**Direction:** Set the date input `min` to tomorrow and validate again on submit.
Keep the form in place with an inline error instead of creating the plan.

---

### FID-FUNC-008 — “Saved” offline state is not cache truth

- **Status:** Runtime confirmed
- **Evidence:** `src/lib/storage.ts:188-200`,
  `src/pages/Settings.tsx:77-99`, `587-632`
- **Impact:** The app can promise offline availability after browser cache eviction.

After setting the DRB offline record and deleting `fidelis-data-v2`, Settings
still rendered `Saved · Update` while the backing data cache did not exist.

**Direction:** Probe Cache Storage for the manifest’s required files before
showing Saved. Offer Repair/Download when incomplete. Treat localStorage as
presentation metadata only.

---

### FID-FUNC-009 — Re-importing a smaller Bible retains stale books

- **Status:** Code confirmed
- **Evidence:** `src/pages/Translations.tsx:33-46`,
  `src/lib/data.ts:115-130`
- **Impact:** A replacement corpus can become a hybrid of two editions.

The importer overwrites books present in the new file but removes nothing absent
from it. The only full clear is the separate “Remove imported text” action.

**Direction:** Solve with the atomic namespace swap in FID-DATA-001. At minimum,
clear the translation only after full validation and before a transactional
replacement.

---

### FID-STOR-001 — Local persistence failures are silent

- **Status:** Code confirmed
- **Evidence:** `src/lib/storage.ts:94-110`
- **Impact:** Settings, plans, notes, bookmarks, reading state, and offline flags
can appear saved when quota or storage policy rejected the write.

Every localStorage write catches and discards the error.

**Direction:** Return a success result from writes and surface one quiet,
deduplicated storage warning with Export as the recovery action. Do not add
toasts for routine successful writes.

---

### FID-A11Y-001 — Liturgical color has no reliable accessible name

- **Status:** Code confirmed
- **Evidence:** `src/pages/Home.tsx:129-138`,
  `src/pages/Readings.tsx:172-176`
- **Impact:** The design spec’s “color not alone” requirement is not met.

The visual chip is an empty span with a background and `title`; it has no
visible label, `aria-label`, or semantic image role.

**Direction:** Add adjacent screen-reader text such as “Liturgical color:
green,” or render a concise visible name where it does not add clutter.

---

### FID-A11Y-002 — Library controls look like tabs but are not tabs

- **Status:** Runtime and code confirmed
- **Evidence:** `src/pages/Library.tsx:68-99`
- **Impact:** Screen-reader users do not hear selection or tab relationships.

The container and buttons have no `tablist`, `tab`, `aria-selected`, or
`tabpanel` semantics.

**Direction:** Implement the ARIA tab pattern with arrow-key movement, or present
the controls honestly as an `aria-pressed` segmented button group. Keep
Export/Import outside the tab group.

---

### FID-A11Y-003 — Async content is not announced

- **Status:** Code confirmed
- **Evidence:** no `aria-live`/`aria-busy` in dynamic Today/Reader regions;
  `src/components/Skeleton.tsx`; `src/components/VerseQuote.tsx:60-63`
- **Impact:** A screen-reader user can hear silence while content appears or fails.

Only Search errors use `role="alert"`. Today Mass, VOTD, Quote, commentary, and
other asynchronous regions do not expose polite status. `VerseQuote` reduces
failure and empty text to a bare em dash.

**Direction:** Use restrained `aria-busy` and polite status text at region
boundaries. Replace the bare dash with a contextual, visually quiet message.

---

### FID-A11Y-004 — Day-theme accent text and inline links fail automated contrast checks

- **Status:** Runtime confirmed by Lighthouse and independent token calculation
- **Evidence:** `src/styles.css:104-197`, global link rules, Mass fallback copy
- **Impact:** Small text can be unreadable or indistinguishable as a link.

Observed failures include:

- Gold text `#8A6D1F` on `#F4F2EE`: 4.38:1.
- Ordinary-Time green link `#3E7C4F` on `#F4F2EE`: 4.47:1.
- The green import link versus muted surrounding text: 1.07:1, with no underline.
- Some Night red/violet accents also fall below 4.5:1 on card/raised surfaces.

Lighthouse identified the footer motto, reading labels/citations, repeated
import links, and the USCCB link.

**Direction:** Calibrate accent text for every surface, not only `--bg-1`.
Underline links inside prose by default. Preserve luminous mark colors by
keeping the existing mark/text token split.

---

### FID-UX-002 — Many native-facing controls are below 44×44 CSS px

- **Status:** Runtime measured
- **Evidence:** `src/styles.css` control rules; Chrome geometry probes
- **Impact:** Higher mis-tap risk, especially in filters and destructive actions.

Representative measured heights at 390 CSS px:

| Control | Measured box |
|---|---:|
| Primary tab | 77.7×44 px |
| Sheet close | 44×44 px |
| Folio book/chapter | 69.3×44 px |
| SectionNav chip | 118.9×31.2 px |
| Book chip | 74.1×32.8 px |
| Today Share | 53.9×18 px |
| Rosary mystery row | 293.6×28.8 px |
| Search filter chip | 65.5×28 px |
| Library Remove | 49.5×18 px |
| Commentary tab | 68.6×33.8 px |
| Settings pill | 85.8×36 px |
| Settings switch | 43.2×24.8 px |

**Direction:** Expand hit areas without inflating visual chrome. Use min-height,
pseudo-element hit slop, and spacing that prevents overlap. Prioritize adjacent
filter chips, switches, mysteries, Share, and destructive Library actions.

---

### FID-PERF-001 — Async layout shifts miss the Core Web Vitals target

- **Status:** Runtime confirmed
- **Evidence:** Mobile Lighthouse
- **Impact:** Content moves after first paint, especially on Today and Mass.

| Page | Performance | LCP | TBT | CLS |
|---|---:|---:|---:|---:|
| Today | 75 | 3.5 s | 10 ms | 0.241 |
| Reader, John 3 | 82 | 3.8 s | 0 ms | 0.107 |
| Search, `mercy` | 77 | 3.9 s | 20 ms | 0.159 |
| Mass | 74 | 3.2 s | 10 ms | 0.304 |
| Settings | 89 | 3.2 s | 20 ms | 0.020 |

Targets are LCP below 2.5 s and CLS below 0.1. Today’s largest shift was the
VOTD card moving after the Mass list arrived. Mass shifted its footer and
provenance block as readings populated.

**Direction:** Reserve async content geometry, consolidate repeated fallback
notices, and route-split before adding animation or visual effects.

---

### FID-PERF-002 — Every route ships in the initial JavaScript graph

- **Status:** Build confirmed
- **Evidence:** `src/App.tsx:1-25`, `vite.config.ts`, build output
- **Impact:** Today pays for Settings, import formats, plans, Search, and study
surfaces before they are used.

The build emits one 423 kB main chunk (134 kB gzip). Lighthouse estimates about
66 KiB of avoidable JavaScript on the audited routes.

**Direction:** Apply route-level `React.lazy()` to secondary routes and split
large sheets/import parsers behind their entry points. Keep the shell and Today
critical path simple; do not add a chunking framework.

---

### FID-NATIVE-001 — Native Mass/Quote/Siri data is permanently USA-region

- **Status:** Code confirmed
- **Evidence:** `scripts/build-calendar-widget.ts:30-35`, `49-95`
- **Impact:** A user who selects Universal in the app can see a different
celebration/readings/quote on widgets and Siri.

The generated `calendar.json` hardcodes `REGION = "usa"`. Native surfaces have
no access to the live Settings region.

**Direction:** Be explicit about the product choice:

- If widgets are always USCCB, label/document that fact.
- If parity is required, provide region-configurable widgets or generate both
  regions and let native configuration select one.

The current comments claiming the surfaces “never disagree” are only true at
the default setting.

---

### FID-QUAL-001 — UI reliability is guarded by source text, not browser behavior

- **Status:** Repository confirmed
- **Evidence:** no component/E2E tests; `scripts/test-data.ts` source-shape checks
- **Impact:** Focus traps, scroll restoration, imports, service-worker updates,
and navigation can regress while regex checks stay green.

The pure-engine harnesses are excellent. The gap is a small browser layer, not a
need to replace the existing harnesses.

**Direction:** Add a narrow Playwright suite for:

- Today load/failure states.
- Reader selection, action-bar visibility, sheets, and Back.
- Search cap/filter correctness.
- Bookmark translation.
- Import transaction failure.
- Offline cache state.
- axe checks on Today, Reader, Mass, Settings, and an open sheet.

---

### FID-REL-002 — Native workflow filters do not cover native tooling scripts

- **Status:** Workflow confirmed
- **Evidence:** `.github/workflows/ios.yml:13-33`,
  `.github/workflows/android.yml:14-34`
- **Impact:** Project-wiring, widget-builder, and release-script changes can land
without the native workflow running.

The latest audited head changed `scripts/ios-testflight.sh`, but the latest iOS
workflow ran on an earlier commit. Scripts such as
`add-ios-widget-target.rb`, `configure-ios-app-target.rb`, and widget builders
are not in native path filters. GitHub iOS CI also builds Debug while TestFlight
archives Release.

**Direction:** Include relevant `scripts/**` paths and add an unsigned Release
simulator build. Keep Debug if it provides useful diagnostics.

---

### FID-DOC-001 — Public and maintainer documentation describes old product state

- **Status:** Documentation confirmed
- **Evidence:** `README.md:104`, `254-285`; `docs/guides/IOS.md`; historical release text
- **Impact:** Users and maintainers receive contradictory platform/navigation instructions.

Current README claims:

- Today at Mass and Quote widgets are Android-only with iOS “to follow.”
- The iOS widget target cannot be scripted.
- App Intent and Dynamic Type remain future work.
- Phone navigation is a bottom bar.

All are false in 1.16.0. The iOS guide also retains bottom-bar verification copy
and future-tense implementation language inside a section marked shipped.

**Direction:** Reconcile README first, then iOS/release guides. Preserve
historical changelog statements where they are clearly historical.

---

## 6. P3 findings and hardening items

### FID-FUNC-010 — Embeddable VOTD does not roll at midnight

`src/pages/WidgetVotd.tsx:12-20` calls `verseOfTheDay()` only at render and does
not use `useToday()`. A long-lived iframe can show yesterday’s verse until reload.

### FID-FUNC-011 — Parallel-text load failure is silent

`src/pages/Reader.tsx:105-118` converts every parallel load failure to `null`.
The UI gives no explanation and leaves the saved parallel setting active.

### FID-UX-003 — Copy has no success or failure feedback

`src/pages/Reader.tsx:270-278` silently catches Clipboard errors. One brief,
polite status near the action surface is enough.

### FID-UX-004 — Small-phone Today cards lose the intended right gutter

At 320 CSS px, `.widget-grid` is 288 px wide but its 300 px minimum card extends
to x=316, leaving 16 px on the left and 4 px on the right. It does not create
global horizontal scrolling, but the visual gutter is uneven.

### FID-UX-005 — Search autofocus is disruptive on phones

`src/pages/Search.tsx:165-174` always autofocuses. On iOS this opens the keyboard
as soon as the tab is selected. Retain autofocus for keyboard/desktop contexts
or focus only after explicit mobile intent.

### FID-PERF-003 — Cold full-corpus Search makes 78 sequential book requests

`src/pages/Search.tsx:82-108` awaits each book in order. Measured locally:

- `mercy`: 333 ms, 27 book requests before the cap, +5.05 MB JS heap.
- No-match query: 418 ms, 78 requests, +5.09 MB JS heap.

Native and warmed-offline reads are fast, so a search index is not automatically
justified. For cold web use, batching/parallelism or a Worker would reduce
round-trip amplification.

### FID-PERF-004 — Native widgets repeatedly decode static JSON

Widget providers load and decode the 428 kB calendar file in placeholder,
snapshot, and timeline paths. Android widgets likewise parse it per update.
Process-local memoization would reduce repeated work, though device profiling
should precede a change.

### FID-NATIVE-002 — iOS widgets have no tap target or deep link

The Swift widget views define neither `widgetURL` nor `Link`, and the app has no
custom URL scheme/associated-domain route. Android widgets at least open the
app’s Today route. The design spec expected the Mass widget to open Mass.

### FID-NATIVE-003 — Calendar widgets eventually fall back after the data window

The builder emits the current and following calendar years, and CI guarantees
today + 180 days. This is a good release alarm, but an app not updated beyond
the window shows generic fallback content. Keep the freshness gate and document
the behavior.

### FID-SEC-001 — Manifest integrity is build-time, not runtime

`loadManifest()` displays the root hash, but `loadBook()` does not hash fetched
bytes. CI proves the committed corpus, and native code signing protects the app
bundle, so this is not evidence of current text corruption. The web UI wording
“Texts verified” should be understood as build verification, not a runtime
cache check.

### FID-SEC-002 — No Content Security Policy is defined

The app is static, renders user text through React, and build-escapes the one
bundled Trent HTML path, so immediate exploitability is low. A future injection
would still receive same-origin storage and service-worker scope. Start with
CSP Report-Only; the pre-paint inline script will need a hash or nonce strategy.

### FID-REL-003 — iOS release instructions have divergent duplicate hooks

The canonical `ios/App/ci_scripts/ci_post_clone.sh` pins Node 22. The root
fallback installs unpinned `node`. The release guide warns about the
`Package.swift` v15→v17 sync trap but does not give the exact post-sync
verification used by `ios-testflight.sh`. Consolidate the hook and command.

---

## 7. Performance interpretation

### 7.1 What should be optimized

1. Reserve space for Today Mass and Mass page readings.
2. Lazy-load secondary routes and heavy feature entry points.
3. Fix Search correctness before optimizing its algorithm.
4. Reduce sequential web Search round trips if cold-web Search is a priority.
5. Measure native cold start and widget decode on device.

### 7.2 What should not be optimized yet

The audit does not support adding chapter virtualization now.

Psalm 118 rendered:

- 176 verse elements.
- 1,218 DOM nodes.
- 704 event listeners.
- 4.78 MB reported JS heap.
- No observed long task in the focused probe.

Parallel mode doubled verses to 352 and increased the measured page to 3,341
nodes and 8.53 MB heap. That is worth watching, but virtualization would add
selection, focus, deep-link, commentary-marker, and scroll-restoration
complexity. Fix the action-bar overlay first and profile an actual low-end
device before virtualizing sacred text.

Catena first-open performance was also better than static size suggested:

- John Catena decoded size: 1,312,277 B.
- Ready in 76 ms locally.
- No long task observed.
- Heap growth: about 1.99 MB.

Share-card PNG creation measured 6.4 ms for a 1080×1350, 156 kB PNG. Neither
path is a current priority.

---

## 8. Page-by-page UX and design evaluation

| Surface | Keep | Refine |
|---|---|---|
| Today | Five-card discipline, date-first hierarchy, liturgical identity, restrained cards. | Honest Mass loading/error state, reserved height, accessible color name, 44 px Share/mystery targets. |
| Read | Canon grouping, testament jump bar, compact book chips. | Expand chip hit areas and surface Reading Plans one step more clearly without adding a primary tab. |
| Reader | Excellent Scripture measure, typography, folio line, collapsed apparatus, chapter picker. | Replace the intrinsic fixed action-bar wrap, keep selected verse visible, gate unavailable translations, add Copy feedback. |
| Search | Plain language, reference jump, URL state, honest transport error. | Correct capped filter counts, support imported texts, avoid forced mobile keyboard, announce progress. |
| Mass | Clear date controls, modern citation names, strong reading typography, SectionNav. | Reserve async layout, consolidate the repeated import notice into one page-level note, underline prose links, fix accent contrast. |
| Library | Useful local ownership and export message. | Preserve bookmark translation, implement tab semantics, enlarge Remove/Delete targets, separate tabs from transfer actions. |
| Translations | Copyright posture and provenance are exemplary. | Atomic import, file limits, quota recovery, clear replace semantics. |
| Settings | Strong live preview, semantic grouping, one source of truth, SectionNav. | Verify true offline state, enlarge controls, reduce repeated backup UI, keep long explanations concise. |
| Plans | Citation-only model correctly avoids gamification. | Reject past dates and improve discoverability through the existing Continue Reading card or Read page. |
| About | Trust surface matches the product’s differentiator. | Reconcile surrounding README/platform documentation and clarify build-time integrity wording. |
| Sheets | Shared primitive, focus trap, Escape, backdrop, scroll lock, and panel adaptation are strong. | Add live loading semantics and complete real-device edge-swipe/rubber-band testing. |
| Native widgets | Shared generated data and formula parity are sound. | Region policy, tap behavior, stale-window communication, and decode cost. |

### Aesthetic verdict

The app already has the correct visual direction: reverent editorial utility,
low motion, warm grayscale, Scripture-first typography, and disciplined accent
grammar. A visual overhaul would dilute the product.

The best aesthetic improvements are functional:

- Stop the Reader toolbar from covering text.
- Prevent cards/readings from jumping after load.
- Make hit areas generous while keeping their visible forms quiet.
- Underline links inside prose.
- Use one Mass fallback note instead of repeating it after every reading.
- Keep gold for honor and improve its text-only contrast through the existing
  `--gold-text` seam.

Do not add gradients, photography, social-style motion, extra Today cards,
achievement surfaces, or a sixth primary destination.

---

## 9. Recommended implementation order

### 9.1 Release safety

1. Regenerate the App Store screenshots.
2. Reconcile README/iOS/release documentation.
3. Expand native workflow path filters and add an unsigned Release build.
4. Complete the macOS/device acceptance list in §10.

### 9.2 Core correctness

1. Correct Search counts and section results.
2. Gate Reader translation persistence on successful availability.
3. Preserve bookmark translation in Library links.
4. Resolve one effective translation for VOTD/Rosary text, citation, and link.
5. Reject past reading-plan dates.

### 9.3 Sacred-page and accessibility pass

1. Redesign only the Reader action surface and reserve its space.
2. Add Today/Mass loading, failure, retry, and geometry reservation.
3. Add liturgical-color naming, live regions, and Library tab semantics.
4. Fix contrast and inline-link identification.
5. Expand priority touch targets.

### 9.4 Storage and import resilience

1. Make Bible replacement atomic.
2. Add import size limits and Worker parsing.
3. Surface quota/write failure.
4. Verify offline cache contents before claiming Saved.

### 9.5 Performance and test coverage

1. Route-split secondary pages and heavy feature entry points.
2. Add the small browser test suite described in FID-QUAL-001.
3. Re-run Lighthouse and target LCP <2.5 s, CLS <0.1.
4. Profile native cold start before adopting indexing or virtualization.

---

## 10. Native acceptance checklist

### iOS simulator or physical device

- Fresh install opens Today with zero onboarding or permission prompts.
- Night cold launch has no Day-theme flash.
- Notched portrait and landscape clear safe areas exactly once.
- Masthead scrolls away; tabs pin; status strip covers rubber-band overscroll.
- Search keyboard does not strand content behind fixed chrome.
- Every sheet freezes the page, scrolls internally, and restores the exact offset.
- Edge-swipe Back with an open sheet cannot leave the body locked.
- Dynamic Type updates live and remains operable at the largest category.
- VoiceOver names verse number, selected state, color, dialogs, and controls.
- Share produces the expected PNG and native sheet.
- Save Image requests add-only Photos permission and handles denial.
- Airplane-mode cold launch reads every bundled translation and commentary.
- All three widgets render in every supported family and appearance.
- Widget and app values agree at midnight and after time-zone change.
- Siri returns the same Gospel citation as Mass.
- Universal-region policy is explicit and tested.
- Release archive embeds the extension, icon, privacy manifest, and current web bundle.

### Android device

- Hardware Back closes More and sheets before navigation.
- Rapid repeated Back cannot navigate under a visible sheet.
- All three widgets update after local midnight and tap into the app.
- Airplane-mode cold launch and imported-text behavior match documentation.
- Safe areas and system navigation modes do not cover controls.

---

## 11. Strengths to preserve

1. Pure, region-aware liturgical and lectionary engines.
2. Golden snapshots and trap-date assertions.
3. Manifest-sealed generated corpus and pinned upstream commits.
4. Explicit copyright boundary for modern Bible/CCC texts.
5. Five-card Today cap and refusal list.
6. Purple-acts/gold-honors design grammar.
7. Near-motionless interaction and reduced-motion handling.
8. Shared Sheet, overlay, scroll-lock, and scroll-restoration architecture.
9. Scripture typography and language tagging.
10. Retry-after-failure memo behavior in core loaders.
11. Generated native widget data rather than duplicated liturgical engines.
12. Small dependency surface and zero known audit vulnerabilities.
13. Version synchronization, tracked app icon, privacy manifest, and native build workflows.
14. Honest Search transport errors and Mass translation fallback.

---

## 12. Conclusion

Fidelis does not need more features to become better. It needs the current
features to agree with one another under failure, imported-text, accessibility,
and native conditions.

The core is trustworthy. The next release should concentrate on Search
truthfulness, translation-state integrity, Reader visibility, atomic imports,
async layout stability, and release/documentation reconciliation. Those changes
will make the app simpler because they remove surprises, not because they add
surface area.

---

[← Docs index](../INDEX.md) · Related: [feature design specification](Fidelis_Feature_Design_Spec_V1_2026-06-11.md) · [historical code review](Fidelis_Code_Review_V1_2026-06-11.md)
