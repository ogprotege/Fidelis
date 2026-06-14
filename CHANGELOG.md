# Changelog

All notable changes to Fidelis. Format follows [Keep a Changelog](https://keepachangelog.com/);
versioning is semantic. The liturgical engines, the bundled texts, and the harnesses are the
product — changes to any of them are release-worthy.

## [1.5.0] — 2026-06-14 — v1.2 B2: the indulgence line (Ench. Ind. conc. 30)

Spec §6.1, the quietest feature in the app. While you read in the Reader, continuous
reading time accumulates (Page Visibility API; paused when the tab is hidden; the
continuity clock resets after a ten-minute gap; the daily total lives in localStorage and
resets at local midnight). At half an hour, one small gold line appears beneath the chapter
title — *"You have read for half an hour. The Church grants a plenary indulgence for this,
under the usual conditions (Ench. Ind., conc. 30)."* — and stays until midnight. Tapping it
opens a sheet listing the usual conditions. No streaks, no history, no badge, no sound; a
setting hides it entirely. Piety, not gamification.

### Added

- **The reading-time accumulator** (`src/lib/reading.ts`): a pure, injected-time reducer
  (`advance`) reusing `votd.dayOfYear` for DST-safe local-midnight rollover; harness-tested
  for the gap reset and the day rollover.
- **The indulgence line** (`IndulgenceNotice`): the Reader-scoped Page-Visibility timer and
  the gold line, with the conditions explained in the reused bottom-sheet.
- **A setting** (`showIndulgence`, default on) to hide it entirely.

## [1.4.0] — 2026-06-14 — v1.2 B1: rosary mystery sheets with the traditional prayers

Design-spec §6, card 4, upgraded one step. Tapping a mystery on the Today page now
opens a quiet bottom-sheet: the mystery's Scripture passage, rendered verbatim from
your current translation, and beneath it — collapsed — the five traditional prayers
of the Rosary in Latin and English. No audio, no beads, no motion. A prayer book.

### Added

- **The mystery sheet** (§6 card 4): each of the day's five mysteries is now tappable,
  opening a reusable bottom-sheet (`Sheet`) over a dimmed backdrop — Escape, tap-outside,
  or close to dismiss, with focus managed and returned. The passage renders through the
  new shared `passageText` helper, the same verse-range path the Reader uses, so the two
  can never disagree (asserted per mystery × DRC/CPDV/Vulgate).
- **Fuller meditation passages**: the twenty mysteries now carry traditional narrative
  ranges (e.g. the Annunciation, Luke 1:26–38; the Visitation with the Magnificat,
  Luke 1:39–56) rather than a single anchor verse.
- **The traditional prayers** (`src/lib/prayers.ts`): Pater Noster, Ave Maria, Gloria
  Patri, the Fatima Prayer, and the Salve Regina — public-domain Latin and English,
  collapsed beneath each mystery's passage.

### Changed

- `VerseQuote` now renders through `passageText` (no behavior change).
- The Today page still holds exactly five cards; the mystery sheet is an overlay, not
  a sixth card.

## [1.3.0] — 2026-06-14 — the identity release

Design-spec §1–§2: Fidelis takes on its visual identity and its navigation in one
release. The app already knew the day's liturgical color; now it wears it. Scripture
reads in a bundled printed-Bible face, the chrome speaks in two accents and one
hand-drawn icon set, the seven-link header becomes a five-tab bar, and every control
gathers into a single live Settings screen. Six work items (A1–A6); the Word is still
never printed in red.

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
