# Changelog

All notable changes to Fidelis. Format follows [Keep a Changelog](https://keepachangelog.com/);
versioning is semantic. The liturgical engines, the bundled texts, and the harnesses are the
product — changes to any of them are release-worthy.

## [1.7.0] — 2026-06-13 — the one Settings screen

Design-spec §2.2. The scattered, snapshot reads of `getSettings()` give way to a
single live `SettingsContext`, and the type/theme controls fold out of the header
into one Catena-style Settings screen with a **live Scripture preview pinned on
top** — Genesis 1:1–2 in the current translation, font, and size, re-rendering the
instant any control below is touched, no reload.

### Added

- **`SettingsContext`** (`src/SettingsContext.tsx`, spec §2.2 engineering note):
  one source of truth for settings; `useSettings()` subscribes and `update(patch)`
  persists through `saveSettings()` and re-renders every consumer, so the preview,
  the Reader, and the theme respond live. The non-React engines (`liturgical.ts`,
  `votd.ts`) keep reading `getSettings()` lazily — `update()` writes localStorage
  synchronously, so the next render sees the new value.
- **The §2.2 Settings screen** (`src/pages/Settings.tsx`): live preview · Bible
  version cards (year + provenance, the chosen one outlined in purple, RSV-2CE /
  NABRE shown locked with an import link) · text-size pills · font pills, each
  rendered in its own face · **Appearance** (System / Day / Night + the *Follow the
  liturgical year* switch and its one-line catechesis) · **Calendar** region (moved
  here from the Readings toolbar) · **Data** (download-for-offline per translation
  with real sizes, export/import of notes and highlights, and the manifest
  integrity line linking to About).
- **System theme** (`src/lib/theme.ts`): theme is now System / Day / Night, with a
  pure `resolveTheme()` (asserted in the harness) and a `prefers-color-scheme`
  listener so "System" tracks the OS live. A pre-paint boot script in `index.html`
  resolves theme + face before the stylesheet paints, so a Night/System user never
  flashes Day. New installs default to **System**.
- **Real offline-download sizes**: `build-manifest.mjs` now seals a per-bundle
  `{ files, bytes }` map (DRB 4.5 MB · CPDV 4.8 MB · VUL 4.0 MB) from the same file
  walk that hashes the corpus — never hand-entered — and `--verify` checks it. The
  manifest root hash is unchanged. `downloadBundle()` warms the service-worker data
  cache and only earns a "Saved ✓" when every file actually fetched `res.ok`.

### Changed

- **Header folds to brand + five tabs** (`src/components/Header.tsx`, spec §2.1/§2.2):
  the day/night and liturgical-year toggles move into Settings (reachable via
  More → Settings).
- **Reader, Readings, Home, BookList, Search, Library** now read settings live from
  the context; the Reader's A−/A+ stepper and the size pills write the same
  `fontSize` source of truth. The Readings toolbar loses its region select (now in
  Settings) and reads the region live.

### Fixed

- The embeddable Verse-of-the-Day widget honors `?theme=night` again: App is now
  the single writer of `<html data-theme>` and applies the widget's own param
  (default day), so its palette is self-contained and no longer clobbered by the
  app's theme effect or leaked from the visitor's saved settings.
- The liturgical accent tint re-derives the moment the calendar region changes (a
  missing effect dependency had left it stale on region-divergent days).

## [1.6.0] — 2026-06-13 — the five-tab bar

Design-spec §2.1. The seven-link header that wrapped and cramped on phones gives
way to a five-tab navigation — **Today · Read · Search · Mass · More** — that
renders as the header row on wide viewports and drops to a thumb-friendly bar
pinned to the bottom edge on phones. One component, swapped by CSS alone; the URL
space is untouched.

### Added

- **`TabBar` component** (`src/components/TabBar.tsx`, spec §2.1): the five
  primary entries on the existing routes — Today (`/`), Read (`/read`), Search
  (`/search`), Mass (`/readings`) — plus **More**, a dismissable popover over the
  four secondary destinations (Library, Translations, Settings, About). "More" is
  a popover, **not a route**, so the router is unchanged. It drops down under the
  header link on desktop and rises above the bar on phones; the active tab — and
  More while you are on one of its routes — colors in `--purple` (purple acts,
  §1.2). The popover dismisses on outside-click, Escape (which returns focus to
  the trigger), and on navigation, with a correct disclosure-button contract
  (`aria-expanded`, and `aria-controls` only while the menu is mounted).

### Changed

- **Header nav replaced by `<TabBar>`** (`src/components/Header.tsx`): the inline
  seven-link `<nav>` is gone; the brand and the liturgical-accent / day-night /
  settings control cluster stay in place (the §2.2 Settings redesign will fold
  the cluster into the one Settings screen).
- **Responsive layout** (`src/styles.css`): a `@media (max-width: 640px)` block
  pins the bar to the bottom edge as five equal columns, each a ≥44px touch
  target, honoring the iOS home-indicator inset via `env(safe-area-inset-bottom)`;
  the header is held to one line (`flex-wrap: nowrap`, wordmark subtitle hidden,
  control cluster re-anchored right) so it cannot wrap at 390px. The Reader's
  floating verse-action bar and the footer motto clear the bar, and the header's
  stacking context is lifted above the verse-action bar so the More popover wins
  on the Reader page.

### Tested

- A new *Tab bar* section in the data harness (`scripts/test-data.ts`) locks the
  spec and the acceptance criteria into `npm test`: the five entries in order on
  their routes, More opening exactly the four secondary destinations, the header
  delegating to `<TabBar>` (old inline nav gone), and the three criteria the
  type-check cannot see — the header cannot wrap at phone width (`flex-wrap:
  nowrap`), the active tab is purple, and the bar honors the safe-area inset.

## [1.5.0] — 2026-06-13 — the icon set

Design-spec §1.5. The emoji glyphs — which render inconsistently from one
platform to the next — give way to a hand-drawn, six-piece inline SVG set, so
the marks of the app look the same everywhere and bend to the liturgical accent.

### Added

- **`Icon` component** (`src/components/Icon.tsx`, spec §1.5): a six-piece set —
  bookmark, note, share, commentary, sun/moon, cross — drawn in a single 1.6
  stroke weight on a 24×24 grid. Every icon strokes in `currentColor`, so the
  two-accent rule (§1.2) colors it for free: **gold where it honors or marks
  state** (the cross in the wordmark and the Verse-of-the-Day heading, a
  bookmarked or annotated verse, a saved Library entry) and the **neutral text
  color where it acts** (the Reader's Bookmark / Note / Copy buttons, the
  day/night toggle). Sized in `em` so each call site scales it exactly like the
  glyph it replaced. The commentary bubble is defined now, ready for the §4
  commentary layer.

### Changed

- **Emoji glyphs replaced** across the interactive UI: the bookmark (⚑), note
  (✎), copy/share (⧉), and day/night (☾/☀) marks in the Reader, the Library, and
  the header, and the cross (✠) in the masthead, the Verse-of-the-Day card, and
  the embeddable widget, are now SVG. The settings gear and the Angelus dove,
  outside the named six-piece set, are left as they were; typographic
  affordances (arrows, A−/A+, the ✕ close) are unchanged.
- **Native iOS widget cross drawn natively** (`ios/WidgetExtension/FidelisWidget.swift`):
  the home-screen Verse-of-the-Day widget no longer renders the cross as
  `Text("✠")` from the system emoji font — the surface §1.5's rationale bites
  hardest on — but as a SwiftUI `CrossIcon` `Path` tracing the same 24×24,
  1.6-weight geometry as the web `Icon`, so the mark matches across web and
  native (the web↔Swift lockstep already kept for VOTD selection in P1-9).

### Tested

- A new *Iconography* section in the data harness (`scripts/test-data.ts`)
  locks the rule into `npm test`: no in-scope emoji glyph survives in any `.tsx`
  under `src/` (block comments stripped, so the `Icon` component's own
  doc-comment stays legal while a *rendered* glyph anywhere is still caught), the
  native iOS widget carries none either, and the `Icon` component stays
  `currentColor`-driven, single-weight, and complete (all six names defined).
  Red before the swap, green after.

## [1.4.0] — 2026-06-13 — the Scripture face

Design-spec §1.4. Scripture now reads like a printed Bible. EB Garamond is
bundled and set as the default reading face, with a real choice of two
alternatives and four honest size presets — and the Word is still never printed
in red.

### Added

- **EB Garamond, bundled** (spec §1.4, SIL OFL 1.1): four woff2 files —
  `latin` + `latin-ext`, regular + italic, weight 400 — totalling **≈144 KB**,
  committed under `src/fonts/` with their `OFL.txt` license and a provenance
  note (pinned to `@fontsource/eb-garamond@5.2.7`, tarball SHA-1
  `68bd97f7…`). It renders the Vulgate's æ and œ ligatures the way the printed
  Douay does. `@font-face` declarations carry Google's own `unicode-range`s, so
  `latin-ext` is fetched only when extended-Latin glyphs appear, and
  `font-display: swap` keeps the system serif legible until the face loads.
- **Scripture face setting** (spec §1.4): `scriptureFont` ∈
  `garamond | serif | sans`, default Garamond — *three is a choice; ten is a
  chore*. The choice drives a new `--scripture` token via `<html data-font>`
  (mirroring the §1.3 `data-accent` mechanism) and applies to every Scripture
  surface: the Reader, the Mass readings, and the verse of the day.
- **Settings screen** (`src/pages/Settings.tsx`, the §2.2 seam): a live
  Scripture preview (Genesis 1:1–2 in the current translation) pinned above
  four **text-size pills** (Small 17 · Medium 19 · Large 22 · X-Large 25) and
  three **font pills**, each rendered in its own face. Reached from a new
  header gear. The fuller §2.2 screen (versions, appearance, calendar) folds in
  later.
- A `src/lib/typography.ts` module owns the face/size vocabulary, and a new
  *Typography* section in the data harness asserts it: the four woff2 are
  present and carry the `wOF2` signature, the OFL is committed, `styles.css`
  wires all four faces with both subsets' ranges and `swap`, the presets are
  exactly 17/19/22/25, and the stored defaults are Garamond at 19.

### Changed

- The Reader's **A− / A+ stepper is retained as a fine adjustment** (spec §1.4):
  it now writes the same `fontSize` setting the presets do, bounded by the
  shared `MIN/MAX_FONT_SIZE` constants.
- The service worker (`public/sw.js`, shell cache → `v3`) is now **font-aware**:
  fonts are referenced from CSS `url()` rather than `index.html`, so the
  all-or-nothing precache now also pulls the fonts each stylesheet names, and
  the stale-asset purge keeps them — offline reading holds the chosen face
  instead of falling back to the system serif (preserves review P2-3).

### Kept refused

- **Red-letter text** (spec §1.4, §13.7): only weight-400 faces are bundled and
  no per-word color is set on Scripture, asserted in the harness.

## [1.3.0] — 2026-06-13 — the liturgical year, in color

Design-spec §1. The app already knew the day's color; now it wears it. The §1.1
token system and §1.2 two-accent rule (the day/night token blocks, the
parchment→day storage shim) land here as the foundation, and §1.3 builds on them:
a single setting lets the calendar catechize without a word.

### Added

- **Follow the liturgical year** (spec §1.3): a setting, default on, that tints the
  *act* accent (`--purple`) with the governing day's liturgical color. `App.tsx`
  writes the resolved color to `<html data-accent>`; CSS remaps `--purple` to the
  §1.3 hex pair for each color, as a day-default rule plus a night override. White
  borrows the gold token — *gold stands for white* — so the great white feasts read
  in gold (rose on Gaudete and Laetare). A colored-dot toggle in the header shows
  the day's accent — filled when following, hollow when off — and flips it live. The
  *honors* accent (`--gold`, the ✠ and wordmark) and `--purple-strong` never move,
  so the two-accent grammar and the gold masthead are untouched. The mapping is a
  pure, total `accentFor()` in `src/lib/liturgical.ts`, asserted in the engine
  harness — Gaudete 2026-12-13 → rose, Easter 2026-04-05 → gold-for-white, the
  setting off → brand purple year-round — and the §1.3 hex table is checked against
  `src/styles.css` itself, so a mistyped override fails `npm test`.

### Changed

- The §1.1/§1.2 token migration (committed earlier on this branch) ships in this
  release: every paint color now lives in the day/night token blocks, nothing
  outside them carries a raw hex, and no element wears both accents.

## [1.2.1] — 2026-06-11 — continuous integration

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

### Added — testing and audit (B.1, B.2)

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
