<div align="center">

# ✠ &nbsp;F I D E L I S

### *The Catholic Bible, kept faithfully.*

A Catholic Bible app built on one conviction — **the text is not ours to edit.**
The full 73-book canon, three unaltered translations, the daily Mass, the liturgical
year in color, and a quiet devotional life around the Word. No accounts. No tracking.
No algorithm. Just the text, kept.

<br />

[![CI](https://github.com/ogprotege/Fidelis/actions/workflows/ci.yml/badge.svg)](https://github.com/ogprotege/Fidelis/actions/workflows/ci.yml)
&nbsp;
![version](https://img.shields.io/badge/version-1.4.0%20·%20the%20daily%20soul-5B3A8E)
&nbsp;
![canon](https://img.shields.io/badge/canon-73%20books-A8862C)
&nbsp;
![texts](https://img.shields.io/badge/texts-public%20domain-2E7D32)

![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
&nbsp;
![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)
&nbsp;
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)
&nbsp;
![iOS](https://img.shields.io/badge/iOS-Capacitor%20+%20WidgetKit-000000?logo=apple&logoColor=white)
&nbsp;
![telemetry](https://img.shields.io/badge/telemetry-none-26241F)

</div>

> *"Verbum Domini manet in æternum."* — **The Word of the Lord endures for ever.** (1 Peter 1:25)
>
> Every bundled translation is reproduced verbatim from its public-domain source — no
> paraphrasing, no softening of hard sayings, no silent "updates," no red-letter editorializing.
> Where the source corpus differs from a printed edition, the difference is **disclosed, not
> patched**. Provenance is pinned to exact commits and sealed with a SHA-256 manifest the test
> suite re-verifies on every run.

---

## Contents

- [Highlights](#highlights)
- [The Bible](#the-bible)
- [The liturgy](#the-liturgy)
- [The Today page](#the-today-page)
- [The daily soul — devotion around the text](#the-daily-soul--devotion-around-the-text)
- [Reading &amp; study](#reading--study)
- [Identity &amp; design](#identity--design)
- [Platforms](#platforms)
- [What Fidelis refuses](#what-fidelis-refuses)
- [Data integrity &amp; provenance](#data-integrity--provenance)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [License &amp; attribution](#license--attribution)

---

## Highlights

| | |
|---|---|
| **73-book canon** | The complete Catholic Bible in traditional Vulgate order, deuterocanon and the Greek portions of Esther and Daniel included — plus the clearly-marked Vulgate appendix. |
| **Three translations, bundled & unaltered** | Douay-Rheims (Challoner), Catholic Public Domain Version, and the Clementine Latin Vulgate — all public domain, byte-for-byte. |
| **The daily Mass** | A liturgical engine implementing the Table of Liturgical Days: precedence, transfers, the Easter Vigil ladder, memorial propers, and Vulgate-aligned responsorial psalms — Universal or USA calendar. |
| **The liturgical year, in color** | The working accent takes the day's liturgical color; the sacred marks stay gold. The calendar catechizes without a word. |
| **The daily soul** | A tappable rosary with the traditional prayers, a quiet half-hour reading indulgence, and citation-only reading plans — devotion that never nags. |
| **The Fathers, one tap away** | Haydock across the whole canon and the Catena Aurea on the Gospels — a small gold dot marks a commented verse, a sheet opens the commentary with per-Father chips and a Doctors-only filter. Scripture stays Scripture; study stays study. |
| **Yours, on your device** | Bookmarks, highlights, notes, and reading plans live in your browser. No account, no server, no telemetry. Export/import as JSON. |
| **Everywhere** | Installable PWA with offline reading, a native iOS WidgetKit home-screen widget, and an embeddable Verse-of-the-Day iframe. |

---

## The Bible

- **The full 73-book Catholic canon** in traditional Vulgate order — all seven
  deuterocanonical books and the Greek portions of Esther and Daniel — plus the traditional
  Vulgate appendix, clearly marked as *outside* the canon (the Prayer of Manasses and 3–4
  Esdras of printed Clementine editions; Psalm 151 and Laodiceans from the wider manuscript
  tradition — listed for honesty, though the bundled corpus carries no text for them; see
  [`data-report.txt`](data-report.txt)).
- **Three complete translations bundled** — all public domain, all unaltered:
  - **Douay-Rheims, Challoner Revision** (1582–1610, rev. 1749–52)
  - **Catholic Public Domain Version** (2009)
  - **Clementine Latin Vulgate** (1592)
- **RSV-2CE and NABRE support** — these are copyrighted (Ignatius Press / CCD), so their text
  is *not* shipped; you can import a licensed copy you own on the Translations page, stored only
  in your browser via IndexedDB.

> Because the bundles follow the Vulgate, the **Psalms use the traditional Septuagint
> numbering** (the "Lord is my shepherd" psalm is Psalm 22, not 23) and the Douay names
> 1–2 Samuel as 1–2 Kings. The UI labels this wherever it matters and cites both numberings.

---

## The liturgy

**Daily Mass readings** follow the lectionary cycles — Sunday Years A/B/C and weekday Years
I/II — resolved by an engine that implements the Table of Liturgical Days: precedence, transfer
of impeded solemnities (the Annunciation in Holy Week, the Immaculate Conception on an Advent
Sunday), omission of impeded feasts, and demotion of colliding memorials. It includes:

- the **Easter Vigil** laid out as the Missal orders it (Reading I–VII, Epistle, interleaved
  psalms, shorter forms marked, Gospel last), the Triduum, Advent's December ferias, and the
  **Chrism Mass** beside the Mass of the Lord's Supper on Holy Thursday;
- **memorial proper readings** — the memorials whose readings are prescribed (St. Barnabas,
  Sts. Timothy and Titus, the Passion of St. John the Baptist, Guardian Angels, and others the
  dataset marks) take the day as "Proper of the Memorial," with the ferial cycle alongside;
- **responsorial psalms aligned to the Vulgate-versified texts** span by span (titles, split and
  joined psalms), cited with both numberings, e.g. Psalm 51(50);
- a **calendar region** setting — Universal, or United States (Epiphany on the Sunday of
  Jan 2–8, Ascension on the Seventh Sunday of Easter, the six USA obligatory memorials, the
  Guadalupe Feast).

Citation data derives from the public-domain
[jayarathina/Tamil-Catholic-Lectionary](https://github.com/jayarathina/Tamil-Catholic-Lectionary)
(`npm run lectionary` rebuilds it). Where the lectionary subdivides a verse ("12b"), whole
verses are shown and the citation marked "(approx.)" — the text itself is never altered.

---

## The Today page

Five cards, always exactly five — a standing rule, so the page never sprawls:

1. **✠ Verse of the Day** — a fixed, curated cycle, deterministic by date (web and the iOS
   widget select the same verse from the same calendar math).
2. **Quote of the Day** — from the Fathers, Doctors, and saints; public-domain, attributed.
3. **Today in the Church** — season, week, liturgical color, the principal celebrations of the
   General Roman Calendar, today's Mass citations, and the hour's Marian antiphon.
4. **The Holy Rosary** — the day's mysteries, now **tappable** (see below).
5. **Continue Reading** — picks up where you left off, and surfaces your active reading plan.

---

## The daily soul — devotion around the text

The **1.4.0 "the daily soul"** release grows a quiet devotional life around Scripture —
piety, never gamification.

- **The rosary, prayed.** Tap a mystery on the Today page and a calm sheet opens: the mystery's
  Scripture passage rendered **verbatim in your current translation** (the Annunciation,
  Luke 1:26–38; the Visitation with the Magnificat, Luke 1:39–56 …), and beneath it — collapsed
  — the five traditional prayers in **Latin and English**: Pater Noster, Ave Maria, Gloria
  Patri, the Fatima Prayer, the Salve Regina. No audio, no beads animation. A prayer book.
- **The reading-time indulgence.** While you read, the app quietly accumulates continuous
  reading time (paused when you look away; the clock resets after a ten-minute gap). At half an
  hour, one small gold line appears beneath the chapter title — the Church's plenary indulgence
  for devout reading of Sacred Scripture *(Ench. Ind., conc. 30)* — and a tap explains the usual
  conditions. No streak, no counter, no sound; one acknowledgment a day, the Church's, not ours.
  A single setting hides it entirely.
- **Reading plans, the citation-arithmetic way.** Pick books; the app does the math — *a plan is
  a list of chapter references and a divisor, nothing more.* Five citation-only presets — **The
  Four Gospels in 90 Days**, **The Deuterocanon in 30 Days**, **The Psalter in a Month**, **The
  New Testament in a Year**, and **The Whole Canon in a Year** (weighted so the Psalter is woven
  through the year and Psalm 118 never shares a day with another long chapter). Or build your own
  on one screen — grouped book checkboxes, a pace by chapters-per-day or a target date, a name.
  Today's portion shows in Continue Reading; a "Mark today's portion read" action sits at the
  chapter's end. No reminders, no streaks.

---

## Reading &amp; study

- **Reader** — translation switcher; **parallel view** (e.g. Douay beside the Vulgate);
  traditional book names per translation (1 Kings / Liber I Regum, Apocalypse / Apocalypsis); a
  choice of **reading face** (bundled EB Garamond, system serif, or sans) with four size presets
  and an A−/A+ fine adjustment; verse deep-links.
- **Bookmarks, highlights (4 colors), and notes** — stored locally; no account, no server. The
  Library **exports the lot as JSON and imports it back** (merging, newer entry per verse wins),
  so a lost device never takes your marginalia with it.
- **Search** across any bundled translation, **accent-insensitive** (Latin `misericordia` and
  `cælum` both match), with reference jumping ("John 3:16", "1 Cor 13", "Apocalypsis 21").
- **Commentary** — a small **gold dot** after a verse number marks a Haydock note; the verse
  actions gain a **Commentary** entry that opens a study sheet (a side panel on desktop, a bottom
  sheet on phones) with **Haydock** (the annotated Douay, whole canon) and **Catena Aurea**
  (Aquinas's chain of the Fathers on the Gospels, the Newman edition) tabs. The Catena tab filters
  **by Father** and to the **Doctors of the Church**. Commentary never interleaves into the page —
  it is a tap away, and a single Settings switch removes the dots entirely. No AI, no paraphrase:
  the Fathers in their own words.

---

## Identity &amp; design

- **The liturgical year, in color** — an optional setting (on by default) tints the app's
  working accent with the governing day's color: green in Ordinary Time, violet in Advent and
  Lent, rose on Gaudete and Laetare, red on martyrs' days, black on Good Friday, gold standing in
  for white on the great feasts. The sacred marks (the ✠ and the wordmark) stay gold; only the
  working accent moves.
- **Two accents, one grammar** — **purple acts** (links, buttons, the things you touch); **gold
  honors** (the ✠, the wordmark, a bookmarked or annotated verse). No element wears both. Every
  paint color lives in day/night design tokens; nothing outside them carries a raw hex.
- **A hand-drawn icon set** — bookmark, note, share, commentary, sun/moon, and the cross are
  inline SVG on one 24×24 stroke grid, not platform emoji, so the marks look the same everywhere;
  the iOS widget draws the same cross natively.
- **Five-tab navigation** — Today · Read · Search · Mass · More — a header row on wide screens, a
  thumb-friendly bottom bar on phones (honoring the iOS home-indicator inset). "More" is a popover
  over Library, Translations, Settings, and About — not a route, so deep links are unchanged.
- **One Settings screen** with a live Scripture preview (Genesis 1:1–2, re-rendering as you adjust
  the controls below): Bible version, text size, reading face, appearance, calendar region,
  per-translation offline download with real sizes, the indulgence toggle, the commentary
  controls (master switch, Haydock/Catena, Doctors-only), and JSON export/import.
- **System / Day / Night** — System tracks the device's color-scheme preference live; a pre-paint
  boot script resolves the theme and reading face before first paint, so a night reader never sees
  a flash of day.
- **The Scripture face** — EB Garamond is bundled (SIL OFL), a printed-Bible serif; the chrome
  speaks in the system sans, so apparatus never competes with the Word.

---

## Platforms

- **PWA** — installable; the app shell is precached on install (and stale assets purged on
  deploys), so the app opens offline, with offline reading of any book you have opened.
- **iOS** — via Capacitor, including a native **WidgetKit home-screen widget** (Verse of the Day;
  small / medium / large; offline). See [docs/IOS.md](docs/IOS.md).
- **Embeddable widget** — drop the Verse of the Day into any site:
  `<iframe src="https://your-domain/#/widget/votd">` (options: `?t=vulgate&theme=night`).

---

## What Fidelis refuses

A short, binding list — the product is defined as much by what it will not do:

- **No accounts, no cloud sync, no server.** Your reading is yours; it never leaves the device.
- **No AI** — no summaries, paraphrase, or chatbot over Scripture. The text speaks for itself.
- **No social layer**, no comments, no sharing-for-engagement.
- **No streaks, badges, or progress theater.** The reading indulgence is the only acknowledgment
  the app makes, and it is the Church's, not ours.
- **No ads, no in-app purchases, no telemetry.**
- **No notification pressure** — at most a single, optional, off-by-default daily-readings note
  (still deferred).
- **No red-letter text and no inspirational stock imagery.** The Word is not decorated.

---

## Data integrity &amp; provenance

- **Texts** come from the public-domain corpus collected by
  [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) (`DRC`,
  `CPDV`, `VulgClementine`), committed under `public/data/` whitespace-normalized but otherwise
  byte-for-byte.
- **Provenance is pinned and sealed.** Both upstreams are fetched at exact commit hashes
  (`scripts/pins.mjs`), never a moving branch; every file under `public/data/` is hashed into
  `public/data/manifest.json` (SHA-256 per file plus a root hash), verified by
  `npm run verify-data` and on every `npm test`. The pins were trusted only after a fresh rebuild
  reproduced the committed corpus byte-for-byte.
- **The grid is documented honestly.** The three bundles share their source corpus's aligned
  verse grid, which in a few places differs from printed editions' verse breaks; empty grid slots
  are skipped in display, never shown as bare numbers. [`data-report.txt`](data-report.txt) is a
  committed audit of every such slot — including three known DRC corpus defects (the printed Douay
  3 Kings 17:11, Proverbs 30:19, and Baruch 6:7 are absent at the pinned upstream commit, their
  slots holding misfiled verses), disclosed rather than silently patched.
- **Commentary is pinned and sealed like the Scripture.** Haydock comes from the 1883 Dunigan
  USFM transcription (`cmahte/ENG-B-Haydock1883-pd-PSFM`) and the Catena Aurea from the Newman /
  Oxford translation as the Isidore-Guild OSIS (`Isidore-Guild/catena`, CC0); both are fetched at
  commits pinned by hash and hashed into the same `manifest.json`. The Catena's attribution labels
  are normalized by a pure, harness-asserted module (`src/lib/commentary.ts`): 93.9% resolve to a
  named Father, and a corpus-wide test proves the small remainder hides no Father. The text itself
  is reproduced unaltered — no summaries, no paraphrase.

---

## Architecture

A fully static site — Vite + React + TypeScript with hash routing — that deploys `dist/` to any
static host (GitHub Pages, Netlify, …). The liturgical engines, the bundled texts, and the
harnesses are the product; everything else is chrome.

| Layer | Where |
|---|---|
| Liturgical engine (computus, precedence, transfers, regions) | `src/lib/liturgical.ts` |
| Lectionary resolution (day codes, propers, Vigil ladder, psalm mapping) | `src/lib/lectionary.ts` |
| Pure devotional logic (VOTD, rosary, reading-time, reading plans) | `src/lib/votd.ts`, `rosary.ts`, `reading.ts`, `plans.ts` |
| Canon metadata (chapter/verse counts from the real corpus) | `src/lib/canon.ts`, `src/generated/bookMeta.json` |
| Local persistence (settings, marginalia, plans) | `src/lib/storage.ts` |
| Data pipeline & integrity (build, pins, manifest, report) | `scripts/*.mjs` |
| Assertion harnesses & golden snapshots | `scripts/test-*.ts`, `scripts/golden/` |
| Native shell & widget | `ios/` (Capacitor + WidgetKit) |

Design constants are encoded once and asserted: the liturgical day never exceeds **five cards**,
the chrome speaks in **two accents**, and the Word is **never printed in red**.

---

## Development

```bash
npm install
npm run dev          # local dev server
npm test             # liturgical + data harnesses (hard assertions) + manifest verify
npm run build        # type-check (tsc) + production build to dist/
npm run preview      # serve the production build

npm run data         # rebuild public/data/ from the pinned upstream commits
npm run lectionary   # rebuild the lectionary citation tables (pinned)
npm run report       # regenerate data-report.txt (also runs after npm run data)
npm run verify-data  # SHA-256 manifest check of public/data
npm run golden       # re-bless golden-year calendar snapshots after a deliberate engine change
```

For iOS: `npm run build && npx cap sync ios && npx cap open ios` (macOS + Xcode required; see
[docs/IOS.md](docs/IOS.md)).

> **Convention:** bump `package.json` and add a `CHANGELOG.md` entry together; re-bless golden
> snapshots only after a *deliberate* engine change you can justify in the diff.

---

## Testing

`npm test` runs two assertion harnesses and the manifest check — **every expectation is a hard
assertion; any failure exits non-zero.** CI (`.github/workflows/ci.yml`) runs `npm ci`,
`npm test`, and `npm run build` on Node 22 for every push and pull request.

- **`scripts/test-liturgical.ts`** — the Easter computus against the known table; trap-year
  precedence/transfer acceptance (Annunciation on Good Friday 2016, Immaculate Conception 2024,
  Christmas-on-Sunday 2022, …); the liturgical-accent rules; the full Universal/USA region suite.
- **`scripts/test-data.ts`** — committed-data integrity: psalm-span incipits, the Easter Vigil
  label ladder, memorial-proper resolution, every lectionary span rendering text in every
  translation, the empty-slot report in sync, VOTD web/iOS parity, the SHA-256 manifest, the
  rosary passages matching the Reader, the reading-time accumulator (gap reset + midnight
  rollover), the reading-plan arithmetic (preset totals from the real canon counts, pace,
  completion, and the weighted Whole-Canon order), and **golden-year snapshots**: the full
  computed calendar and readings for every day of 2024–2027 in both regions (`scripts/golden/`),
  so any engine change that silently moves a feast is a red test run.

---

## License &amp; attribution

- **Scripture texts** — public domain (Douay-Rheims Challoner, Catholic Public Domain Version,
  Clementine Vulgate), via [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases),
  pinned and hash-sealed.
- **Lectionary citation data** — public domain, via
  [jayarathina/Tamil-Catholic-Lectionary](https://github.com/jayarathina/Tamil-Catholic-Lectionary).
- **EB Garamond** — bundled under the **SIL Open Font License**.
- RSV-2CE and NABRE are **not** distributed; users import their own licensed copies locally.

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

<div align="center">
<br />

✠

*Verbum Domini manet in æternum.*

</div>
