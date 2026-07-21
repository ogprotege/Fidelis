# Screenshots

[← Docs index](../INDEX.md)

Captured from the **v1.23.1 build running on an iOS Simulator** (iPhone 17 Pro,
1206×2622 native) — the real app in the real shell, not a browser mock, so the
iOS status bar, safe-area insets, and native text rendering are what you see.

## The Today page, end to end

`home-day.png` and `home-night.png` are the **whole** Today page in one image —
stitched from overlapping viewport captures, so all six cards (Today at Mass,
Today in the Church, Verse of the Day, Quote of the Day, the Holy Rosary,
Continue Reading) and the closing motto appear without scrolling. These are the
two frames the root [README](../../README.md) shows.

## Every destination, in both themes

One frame per place the navigation can take you — the five-tab bar
(Today · Read · Search · Mass · More) plus the four routes behind **More**,
and the two screens you reach by clicking through.

| | Day | Night |
|---|---|---|
| Today | [`day/01-today.png`](day/01-today.png) | [`night/01-today.png`](night/01-today.png) |
| Read — the 73-book canon | [`day/02-read.png`](day/02-read.png) | [`night/02-read.png`](night/02-read.png) |
| Search | [`day/03-search.png`](day/03-search.png) | [`night/03-search.png`](night/03-search.png) |
| Mass — daily readings | [`day/04-mass.png`](day/04-mass.png) | [`night/04-mass.png`](night/04-mass.png) |
| More → Library | [`day/05-library.png`](day/05-library.png) | [`night/05-library.png`](night/05-library.png) |
| More → Translations | [`day/06-translations.png`](day/06-translations.png) | [`night/06-translations.png`](night/06-translations.png) |
| More → Settings | [`day/07-settings.png`](day/07-settings.png) | [`night/07-settings.png`](night/07-settings.png) |
| More → About | [`day/08-about.png`](day/08-about.png) | [`night/08-about.png`](night/08-about.png) |
| The Reader (from Read) | [`day/09-reader.png`](day/09-reader.png) | [`night/09-reader.png`](night/09-reader.png) |
| A Saint's life (from Today) | [`day/10-saint.png`](day/10-saint.png) | [`night/10-saint.png`](night/10-saint.png) |

## Two things that look like mistakes and are not

**The accent is green, not purple.** `accentFor()` remaps `--purple` to the
governing day's liturgical color when *Follow the liturgical year* is on, and
these were captured on **21 July 2026 — Ordinary Time**. Gold never moves: the
✠, the quote marks, and the saint's medallion stay gold in every frame. See the
two-accent rule in [CLAUDE.md](../../CLAUDE.md).

**The Library is empty.** It is a fresh install with no bookmarks, highlights,
or notes — the frame shows the real empty state rather than seeded data.

## Regenerating

These are hand-captured, not produced by a committed script — driving the
simulator needs a temporary route-file harness in `src/App.tsx` that must never
be committed. The App Store set is different and *is* scripted:
`scripts/capture-appstore.mjs` (headless Chrome at exact device geometry,
output gitignored under `appstore/`).
