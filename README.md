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
  and weekday Years I/II, with seasonal propers (Advent's December ferias, the
  Easter Vigil's seven readings, the Triduum), solemnities and feasts with
  correct Sunday precedence, and the full text of every reading shown in your
  chosen translation. Citation data derives from the public-domain Roman
  lectionary tables of
  [jayarathina/Tamil-Catholic-Lectionary](https://github.com/jayarathina/Tamil-Catholic-Lectionary)
  (`npm run lectionary` rebuilds it).
- **Widgets** on the Today page:
  - ✠ **Verse of the Day** — a fixed, curated cycle; deterministic by date
  - **Daily Mass Readings** — today's citations at a glance
  - **Liturgical Day** — season, week, liturgical color, and celebrations of the
    General Roman Calendar, with movable feasts computed from the Easter computus
  - **The Holy Rosary** — the day's mysteries with Scripture links
  - **Continue Reading** — picks up where you left off
- **iOS app** via Capacitor, including a native WidgetKit **home-screen
  widget** (Verse of the Day, small/medium/large, offline). See
  [docs/IOS.md](docs/IOS.md).
- **Embeddable Verse-of-the-Day widget** for any website:
  `<iframe src="https://your-domain/#/widget/votd">` (options: `?t=vulgate&theme=night`)
- **Reader**: translation switcher, parallel view (e.g. Douay side-by-side with the
  Vulgate), traditional book names per translation (1 Kings/Liber I Regum,
  Apocalypse/Apocalypsis), adjustable type size, verse deep-links.
- **Bookmarks, highlights (4 colors), and notes** — stored locally; no account, no
  tracking, no server.
- **Search** across any bundled translation, accent-insensitive (Latin
  `misericordia` and `cælum` both work), with reference jumping ("John 3:16",
  "1 Cor 13", "Apocalypsis 21").
- **PWA**: installable, with offline reading of any book you have opened.
- **Parchment & night themes.**

## Notes on the texts

- The bundled translations follow the Vulgate, so the **Psalms use the traditional
  Septuagint numbering** (the "Lord is my shepherd" psalm is Psalm 22, not 23) and
  the Douay text names 1–2 Samuel as 1–2 Kings. The UI labels this where relevant.
- Texts come from the public-domain corpus collected by
  [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
  (`DRC`, `CPDV`, `VulgClementine`) and are committed under `public/data/`
  whitespace-normalized but otherwise byte-for-byte.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
npm run data      # re-fetch and rebuild public/data/ from upstream sources
npm run lectionary # re-fetch and rebuild the lectionary citation tables
```

For iOS: `npm run build && npx cap sync ios && npx cap open ios` (macOS +
Xcode required; see [docs/IOS.md](docs/IOS.md)).

The app is a fully static site (Vite + React + TypeScript, hash routing) — deploy
`dist/` to any static host (GitHub Pages, Netlify, etc.).

---

*Verbum Domini manet in æternum.* — 1 Peter 1:25
