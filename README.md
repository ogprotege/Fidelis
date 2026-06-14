# ✠ Fidelis — Catholic Bible

A Catholic Bible web app built on one conviction: **the text is not ours to edit.**
Every bundled translation is reproduced verbatim from its public-domain source — no
paraphrasing, no softening of hard sayings, no silent "updates."

## Features

- **The full 73-book Catholic canon** in traditional Vulgate order, including all
  seven deuterocanonical books and the Greek portions of Esther and Daniel — plus
  the traditional Vulgate appendix, clearly marked as outside the canon (the
  Prayer of Manasses and 3–4 Esdras of printed Clementine editions; Psalm 151 and
  Laodiceans from the wider Vulgate manuscript tradition — listed, though the
  bundled source corpus carries no text for them; see `data-report.txt`).
- **Three complete translations bundled** (all public domain, all unaltered):
  - **Douay-Rheims, Challoner Revision** (1582–1610, rev. 1749–52)
  - **Catholic Public Domain Version** (2009)
  - **Clementine Latin Vulgate** (1592)
- **RSV-2CE and NABRE support** — these are copyrighted (Ignatius Press / CCD),
  so their text is *not* shipped; instead you can import a licensed copy you own
  on the Translations page (stored only in your browser via IndexedDB).
- **Daily Mass readings** following the lectionary cycles — Sunday Years A/B/C
  and weekday Years I/II — resolved by a liturgical engine that implements the
  Table of Liturgical Days: precedence, transfer of impeded solemnities
  (the Annunciation in Holy Week, the Immaculate Conception on an Advent
  Sunday), omission of impeded feasts, and demotion of colliding memorials.
  Includes:
  - the **Easter Vigil** laid out as the Missal orders it (Reading I–VII,
    Epistle, interleaved psalms, shorter forms marked, Gospel last), the
    Triduum, Advent's December ferias, and the **Chrism Mass** beside the
    Mass of the Lord's Supper on Holy Thursday;
  - **memorial proper readings**: the handful of memorials whose readings are
    prescribed (St. Barnabas, Sts. Timothy and Titus, the Passion of St. John
    the Baptist, Guardian Angels, and others the dataset marks) take the day
    as "Proper of the Memorial", with the ferial cycle offered alongside;
  - **responsorial psalms aligned to the Vulgate-versified texts** span by
    span (titles, split and joined psalms), cited with both numberings,
    e.g. Psalm 51(50);
  - a **calendar region** setting — Universal, or United States (Epiphany on
    the Sunday of Jan 2–8, Ascension on the Seventh Sunday of Easter, the six
    USA obligatory memorials and the Guadalupe Feast).
  Citation data derives from the public-domain Roman lectionary tables of
  [jayarathina/Tamil-Catholic-Lectionary](https://github.com/jayarathina/Tamil-Catholic-Lectionary)
  (`npm run lectionary` rebuilds it). Where the lectionary subdivides a verse
  ("12b"), whole verses are shown and the citation is marked "(approx.)" — the
  text itself is never altered.
- **Widgets** on the Today page:
  - ✠ **Verse of the Day** — a fixed, curated cycle; deterministic by date
  - **Daily Mass Readings** — today's citations at a glance
  - **Liturgical Day** — season, week, liturgical color, and the principal
    celebrations of the General Roman Calendar (all solemnities and feasts,
    with a representative selection of memorials), movable feasts computed
    from the Easter computus
  - **The Holy Rosary** — the day's mysteries with Scripture links
  - **Continue Reading** — picks up where you left off
- **iOS app** via Capacitor, including a native WidgetKit **home-screen
  widget** (Verse of the Day, small/medium/large, offline). See
  [docs/IOS.md](docs/IOS.md).
- **Embeddable Verse-of-the-Day widget** for any website:
  `<iframe src="https://your-domain/#/widget/votd">` (options: `?t=vulgate&theme=night`)
- **Reader**: translation switcher, parallel view (e.g. Douay side-by-side with the
  Vulgate), traditional book names per translation (1 Kings/Liber I Regum,
  Apocalypse/Apocalypsis), a choice of reading face (bundled EB Garamond, system
  serif, or sans) with four size presets and an A−/A+ fine adjustment, verse
  deep-links.
- **Bookmarks, highlights (4 colors), and notes** — stored locally; no account, no
  tracking, no server. The Library exports the lot as JSON and imports it back
  (merging, newer entry per verse wins), so a lost device does not take your
  marginalia with it.
- **Search** across any bundled translation, accent-insensitive (Latin
  `misericordia` and `cælum` both work), with reference jumping ("John 3:16",
  "1 Cor 13", "Apocalypsis 21").
- **PWA**: installable; the app shell is precached on install (and stale assets
  purged on deploys), so the app opens offline, with offline reading of any
  book you have opened.
- **The liturgical year, in color** — an optional setting (on by default) tints the
  app's working accent with the governing day's liturgical color: green in Ordinary
  Time, violet in Advent and Lent, rose on Gaudete and Laetare, red on martyrs'
  days, black on Good Friday, and gold standing in for white on the great feasts.
  The sacred marks (the ✠ and the wordmark) stay gold; only the working accent
  moves, so the calendar catechizes without a word.
- **A hand-drawn icon set** — bookmark, note, share, commentary, sun/moon, and the
  cross are inline SVG on one 24×24 stroke grid, not platform emoji, so the marks
  look the same everywhere. Each strokes in the current color, picking up gold where
  it honors and the neutral accent where it acts; the iOS home-screen widget draws
  the same cross natively.
- **Five-tab navigation** — Today · Read · Search · Mass · More: a header row on
  wide screens, a thumb-friendly bottom bar on phones (honoring the iOS
  home-indicator inset). "More" is a popover over Library, Translations, Settings,
  and About — not a route, so deep links are unchanged.
- **One Settings screen** with a live Scripture preview (Genesis 1:1–2 in the chosen
  translation, face, and size, re-rendering as you adjust the controls below): Bible
  version, text size, reading face, appearance, calendar region, per-translation
  offline download with real sizes, and JSON export/import of your marginalia.
- **System / Day / Night theme** — System tracks the device's color-scheme
  preference live; a pre-paint boot script resolves the theme and reading face
  before first paint, so a night reader never sees a flash of day.

## Notes on the texts

- The bundled translations follow the Vulgate, so the **Psalms use the traditional
  Septuagint numbering** (the "Lord is my shepherd" psalm is Psalm 22, not 23) and
  the Douay text names 1–2 Samuel as 1–2 Kings. The UI labels this where relevant.
- Texts come from the public-domain corpus collected by
  [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
  (`DRC`, `CPDV`, `VulgClementine`) and are committed under `public/data/`
  whitespace-normalized but otherwise byte-for-byte.
- **Provenance is pinned and sealed.** Both upstreams are fetched at exact
  commit hashes (`scripts/pins.mjs`), never a moving branch, and every file
  under `public/data/` is hashed into `public/data/manifest.json` (SHA-256 per
  file plus a root hash), verified by `npm run verify-data` and on every
  `npm test`. The pins were trusted only after a fresh rebuild reproduced the
  committed corpus byte-for-byte.
- **The grid is documented honestly.** The three bundles share their source
  corpus's aligned verse grid, which in a few places differs from printed
  editions' own verse breaks; empty grid slots are skipped in display, never
  shown as bare verse numbers. `data-report.txt` is a committed audit of every
  such slot — including three known DRC corpus defects (the printed Douay
  3 Kings 17:11, Proverbs 30:19, and Baruch 6:7 are absent at the pinned
  upstream commit, their slots holding misfiled verses), disclosed rather than
  silently patched.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # liturgical + data harnesses (hard assertions) + manifest verify
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run data       # rebuild public/data/ from the pinned upstream commits
npm run lectionary # rebuild the lectionary citation tables (pinned)
npm run report     # regenerate data-report.txt (also runs after npm run data)
npm run verify-data # SHA-256 manifest check of public/data
npm run golden     # re-bless golden-year calendar snapshots after engine changes
```

### Testing

`npm test` runs two assertion harnesses and the manifest check:

- `scripts/test-liturgical.ts` — the Easter computus against the known table,
  trap-year precedence/transfer acceptance (Annunciation on Good Friday 2016,
  Immaculate Conception 2024, Christmas-on-Sunday 2022, …), and the full
  Universal/USA region suite;
- `scripts/test-data.ts` — committed-data integrity: psalm-span incipits,
  Easter Vigil label ladder, memorial-proper resolution, every lectionary span
  rendering text in every translation, the empty-slot report in sync, VOTD
  web/iOS parity, the SHA-256 manifest, and **golden-year snapshots**: the
  full computed calendar and readings for every day of 2024–2027 in both
  regions (`scripts/golden/`), so any engine change that silently moves a
  feast is a red test run. `npm run golden` regenerates them — review that
  diff like a calendar change.

For iOS: `npm run build && npx cap sync ios && npx cap open ios` (macOS +
Xcode required; see [docs/IOS.md](docs/IOS.md)).

The app is a fully static site (Vite + React + TypeScript, hash routing) — deploy
`dist/` to any static host (GitHub Pages, Netlify, etc.). See
[CHANGELOG.md](CHANGELOG.md) for release history.

---

*Verbum Domini manet in æternum.* — 1 Peter 1:25
