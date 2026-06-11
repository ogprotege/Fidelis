# FIDELIS — FEATURE DESIGN AND IMPROVEMENT SPECIFICATION

**Version:** 1.0
**Date:** June 11, 2026
**Author:** Claude, for Wilson Warren
**Companion document:** *Fidelis Code Review and Improvement Plan V1* (same date). The review is the repair manual; this is the growth plan. Nothing here should be built until the review's P0 items are fixed, because several features below stand on the corrected calendar engine.

---

## 0. GOVERNING PRINCIPLE: SIMPLE SURFACE, DEEP CELLAR

The Catena app earns its place on your phone with one trick: everything you touch daily is one tap deep, and everything scholarly is one tap deeper, collapsed until wanted. Fidelis adopts that as a hard rule, stated so it can be enforced in code review:

1. **The Today page holds five cards, never more.** A new feature does not get a new card; it earns a line inside an existing card or it lives on another tab.
2. **Every deep feature ships collapsed.** Commentary, cross-links, Latin texts: present, discoverable, silent until summoned.
3. **First launch requires zero decisions.** No onboarding carousel, no account, no permission prompts. The user lands on Today and reads.
4. **The grandmother test.** If a feature needs explanation, it fails. If a control needs a label longer than two words, it fails.
5. **Sacred page discipline.** The Reader shows Scripture, verse numbers, and nothing else by default. All apparatus (highlights, notes, commentary dots) renders in the margins of attention: small, gold, quiet.

Section 13 lists what we refuse to build. Hold the line there and the app stays simple no matter how rich it grows.

---

## 1. VISUAL IDENTITY: ROYAL PURPLE AND GOLD ON A CLAUDE GRAYSCALE

The current parchment/night pair is pleasant but generic. The new identity: warm grayscale fields in the manner of the Claude interface, with two royal accents used by strict rule.

### 1.1 Color tokens

Define these as CSS custom properties in `src/styles.css` under `[data-theme="night"]` and `[data-theme="day"]`. All current hard-coded colors migrate to tokens.

**Night (default):**

| Token | Hex | Use |
|---|---|---|
| `--bg-0` | `#1B1B1E` | app background |
| `--bg-1` | `#242428` | cards, sheets |
| `--bg-2` | `#2D2D33` | hover, raised controls |
| `--border` | `#3A3A41` | hairlines |
| `--text` | `#ECEAE4` | body (warm off-white) |
| `--text-muted` | `#A19D94` | metadata, citations |
| `--purple` | `#9B7BD4` | interactive on dark |
| `--purple-strong` | `#6B46A8` | filled buttons |
| `--gold` | `#D4B254` | sacred markers on dark |

**Day:**

| Token | Hex | Use |
|---|---|---|
| `--bg-0` | `#F4F2EE` | app background (warm gray, not white) |
| `--bg-1` | `#FCFBF8` | cards |
| `--bg-2` | `#ECE9E2` | hover |
| `--border` | `#DCD8CF` | hairlines |
| `--text` | `#26241F` | body |
| `--text-muted` | `#6E6A61` | metadata |
| `--purple` | `#5B3A8E` | interactive on light |
| `--purple-strong` | `#4A2F74` | filled buttons |
| `--gold` | `#A8862C` | sacred markers on light |

### 1.2 The two-accent rule

**Purple acts. Gold honors.** Purple marks everything the user can do: links, buttons, active tab, focused input, selected translation card. Gold marks everything sacred or chosen: the ✠, the verse-of-the-day quotation marks, section labels in small caps, the rule beside a selected verse, the commentary dot, highlight color one. No element carries both. This single rule produces the royal feel without gaudiness, and it gives every screen an instant grammar: gold says *look*, purple says *touch*.

### 1.3 Liturgical accent mode

After the precedence engine is fixed, the app already knows the day's color. Add a setting, **Follow the liturgical year**, default ON, that overrides `--purple` with the day's color for accents while the brand constants (header ✠ and wordmark gold) never change:

| Liturgical color | Accent hex (night / day) |
|---|---|
| green | `#5CA86E` / `#3E7C4F` |
| violet | `#9B7BD4` / `#5B3A8E` (the brand purple itself, so Advent and Lent feel most "Fidelis") |
| white | `#D4B254` / `#A8862C` (gold stands for white) |
| red | `#D45A6A` / `#A32638` |
| rose | `#D98BA6` / `#C76A8A` |
| black | `#8E8E96` / `#4A4A50` |

The app turns rose on Gaudete and Laetare mornings and someone asks why, and the calendar has catechized without a word. Implementation: `App.tsx` sets `document.documentElement.dataset.accent = liturgicalDay().color`; CSS maps `[data-accent="rose"]` to the variable overrides. Three to four hours, almost all of it the token migration.

### 1.4 Typography

- **Scripture:** bundle EB Garamond (SIL OFL; subset latin + latin-ext, regular and italic, roughly 130 KB of woff2). It renders the æ ligatures of the Vulgate beautifully and reads like a printed Bible.
- **Interface:** the system sans stack, as now.
- **Text size:** replace the Reader's A−/A+ stepper with four presets in Settings, in the Catena manner: Small 17, Medium 19, Large 22, X-Large 25 px, with the live preview (Section 2.2). Keep the stepper in the Reader toolbar as a fine adjustment; both write the same setting.
- **Font choice:** exactly three options: Garamond, system serif, system sans. Three is a choice; ten is a chore.
- **Deliberately rejected: red-letter text.** Printing the Lord's words in red is a 19th-century Protestant editorial overlay foreign to the Douay tradition, and it is an edit by typography. The creed applies.

### 1.5 Iconography

Replace the emoji glyphs (⚑ ✎ ☾ ⧉) with a six-piece inline SVG set drawn in a single stroke weight, gold-stroked where they mark state, neutral where they act: bookmark, note, share, commentary, sun/moon, cross. Half a day, large perceived quality gain, and emoji render inconsistently across platforms.

---

## 2. STRUCTURE: TAB BAR AND THE ONE SETTINGS SCREEN

### 2.1 Bottom tab bar

The current seven-link header wraps and cramps on phones. Adopt the five-tab bar (the structure your Catena screenshots show at the bottom edge):

**Today · Read · Search · Mass · More**

"More" holds Library, Translations, Settings, About. On desktop widths the same five render as the header row. Implementation: a `TabBar` component replacing `Header`'s nav on small viewports (CSS only, no router changes); roughly half a day.

### 2.2 The Settings screen, Catena-style

One screen, `src/pages/Settings.tsx`, with a **live Scripture preview pinned at the top** (Genesis 1:1–2 in the current translation, font, and size, exactly as in your screenshot; it re-renders as the user touches any control below). Sections in order:

1. **Scripture preview** (the living proof of every choice below).
2. **Bible version:** horizontally scrolling cards, one per translation, year and one-line provenance on each, selected card outlined in purple. Non-bundled versions show their lock state and link to import.
3. **Text size:** four pills.
4. **Font:** three pills, each rendered in itself.
5. **Appearance:** System / Day / Night, plus the **Follow the liturgical year** toggle with a one-line explanation ("Accent color follows the Church's calendar: violet in Advent, rose on Gaudete").
6. **Calendar:** region (Universal / United States), from review item P1-5.
7. **Commentaries** (appears when Tier 2 ships): master toggle, per-source toggles, Doctors-only filter. Mirrors the Catena commentary settings you admired.
8. **Daily quote and verse:** optional single daily notification, off by default.
9. **Data:** Download for offline (per translation, with size), Export my notes and highlights (JSON), and the integrity line: "Texts verified · manifest `a3f9…`" linking to About.

Engineering note: settings currently live as scattered reads of `getSettings()`. Introduce a small `SettingsContext` so the preview, Reader, and theme respond live. One day including the page.

---

## 3. QUOTE OF THE DAY

The feature you love most in Catena, built to a standard Catena does not attempt: **every quote carries a verified locus.** The Catholic internet is a sea of apocryphal saint quotes; Fidelis will be the app where the attribution is part of the gift.

### 3.1 Data model

`public/data/quotes.json`:

```json
{
  "id": "augustine-conf-1-1",
  "text": "Thou hast made us for Thyself, and our heart is restless until it rests in Thee.",
  "author": "St. Augustine of Hippo",
  "authorTitle": "Bishop and Doctor of the Church",
  "work": "Confessions",
  "locus": "I, 1",
  "sourceEdition": "trans. E. B. Pusey (1838), public domain",
  "feast": "08-28",
  "season": null,
  "tags": ["desire", "rest", "conversion"]
}
```

### 3.2 Selection algorithm

`quoteOfTheDay(date, liturgicalDay)` resolves in order:

1. **Sanctoral match:** if the day's celebration (post-P0 engine, the *governing* celebration) names an author present in the corpus, serve that author's quote for the feast. Augustine speaks on August 28, Aquinas on January 28, Thérèse on October 1.
2. **Seasonal pool:** in Advent, Lent, and Eastertide, draw from quotes tagged for the season, deterministically by day-of-season.
3. **General cycle:** otherwise, the same deterministic index arithmetic as the VOTD, over the untagged remainder.

Deterministic everywhere: every user sees the same quote on the same day, and the cycle never shifts beneath them. This is the VOTD philosophy extended, and it means the iOS widget (Section 9) can pre-resolve a year of quotes at build time exactly as `build-votd-widget.mjs` already does for verses.

### 3.3 Sourcing: the green list and the red list

Quotes must come from public domain translations. The green list, all safely public domain in the United States:

- **Augustine:** *Confessions* (Pusey 1838); *City of God* (Dods, NPNF I/2); sermons and tractates (NPNF I).
- **Aquinas:** *Summa Theologiae* (Dominican Fathers translation, 1911–1925); *Catena Aurea* (Newman edition, 1841).
- **The Fathers wholesale:** the Ante-Nicene and Nicene/Post-Nicene Fathers sets (Schaff et al.): Chrysostom, Athanasius, Basil, the Gregories, Ambrose, Jerome, Leo, Cyprian, Ignatius of Antioch.
- **Thomas à Kempis:** *Imitation of Christ*, Challoner or Benham translations.
- **Francis de Sales:** *Introduction to the Devout Life*, 19th-century translations.
- **Teresa of Ávila and John of the Cross:** David Lewis translations (1860s–70s).
- **Thérèse of Lisieux:** *Story of a Soul*, Taylor translation (1912).
- **Newman:** everything (d. 1890; works long public domain). A Doctor-adjacent canonized saint with a quote for every day of the year if you wanted.
- **Chesterton:** works published through 1930 (*Orthodoxy*, *Heretics*, *The Everlasting Man*) are now US public domain. Not a saint; tag accordingly and use sparingly.
- **Magisterial:** Trent (Waterworth translation, 1848); older encyclicals in pre-1930 English translations.

The red list, never bundled regardless of how shareable the line is: Fulton Sheen, Josemaría Escrivá, Padre Pio's letters, John Paul II, Benedict XVI, Francis, and all post-1930 translations of anyone. Where a modern figure must be quoted (a feast-day pope), show the citation and a vatican.va link rather than the text.

### 3.4 The corpus workflow

Target 150 entries for launch: at minimum one quote per Doctor of the Church (all 37, each keyed to the Doctor's feast), 30 seasonal (Advent, Christmastide, Lent, Eastertide), the remainder general. Workflow in your method: I draft candidates with full loci from the green-list editions; you verify against hard copies on your shelves (you own the Lapide, the NPNF material is online in scans); nothing ships unverified. This is Protocol §9.8 applied to an app, and it becomes a quiet selling point on the About page: *every quotation in Fidelis is verified to its source.*

### 3.5 UI

A Today card directly under the Verse of the Day: the quote in Garamond italic, gold opening mark, author and title line, then in muted small type the source: *Confessions* I, 1 · trans. Pusey, 1838. A share icon renders the quote-card image (Section 8.3). Tapping does nothing more; no author pages in v1. Deep cellar can wait.

---

## 4. THE COMMENTARY LAYER: HAYDOCK AND THE CATENA AUREA

This is the formation feature, the Catholic answer to the Catena app's 62,706 commentaries, built from two public domain monuments instead of a server.

### 4.1 Sources and data work

- **Haydock (1859):** the classic annotated Douay; notes by Haydock, Challoner, Witham, and others, verse-keyed, public domain. Digitized transcriptions circulate (the long-running *haydock1859* transcription project and GitHub derivatives). Quality is uneven; budget a cleanup pass and pin whichever source you adopt with a commit hash and manifest, exactly as the Scripture pipeline now should.
- **Catena Aurea (Newman edition, 1841):** Aquinas's chain of the Fathers on the four Gospels, public domain, available in CCEL and Internet Archive transcriptions. Gospels only, and that is fine: the Gospels are where a layman opens daily.

Build scripts `scripts/build-haydock.mjs` and `scripts/build-catena.mjs` emitting per-book JSON:

```
public/data/commentary/haydock/{slug}.json
  { "3:16": [ { "src": "Challoner", "text": "..." }, ... ] }
public/data/commentary/catena/{gospel}.json
  { "5:3": [ { "father": "Chrysostom", "text": "..." }, ... ] }
```

Lazy-loaded per book, cached by the existing service-worker data cache, excluded from the iOS bundle only if size demands it (estimate 8–15 MB total; acceptable to bundle).

### 4.2 UX: the gold dot and the bottom sheet

- In the Reader, a verse with commentary gains a **small gold dot** after its number. That is the entire footprint on the sacred page.
- Tapping a verse already opens the action bar; it gains a **Commentary** action when notes exist.
- Commentary opens a **bottom sheet** (mobile) or side panel (desktop): tabs for **Haydock** and **Catena Aurea**, and within the Catena tab, **filter chips per Father** plus a **Doctors only** toggle. This is precisely the tradition-filter interaction you admired in Catena, done Catholic: filter by Chrysostom, by Augustine, by era.
- A global setting (Section 2.2) turns the dots off entirely for users who want the bare page. Default: on.

Why a sheet and not inline interleaving: inline commentary doubles page length, breaks the reading rhythm, and violates sacred page discipline. The sheet keeps Scripture as Scripture and study as study, one tap apart.

### 4.3 Effort honesty

Engineering: three to four days (loader, sheet, chips, setting). Data: one to two weeks of transcription cleanup and spot-verification against page scans. The data is the project; do not let anyone tell you otherwise.

---

## 5. SCRIPTURE-TO-MAGISTERIUM LINKS

When the Church reads a verse, show where. The Catechism's Index of Citations maps Scripture references to paragraph numbers; the mapping is fact, not expression, and may be compiled freely even though the CCC's text may not be bundled.

- **Data:** `public/data/ccc-index.json`, `{ "john 3:16": [219, 444, 458, 706], ... }`, produced by a build script from the index, with a sampled manual verification pass (twenty random entries against the printed index).
- **UX:** the verse action bar shows, when present, a quiet row: **CCC ¶219 · ¶444 · ¶458**. Tapping a number opens the paragraph on vatican.va. Where the Vatican archive's anchor scheme proves unstable for a range, fall back to the section page; resolve the URL mapping once at build time and store it in the index file so the client never guesses.
- **Scope discipline:** Catechism only in this tier. Conciliar documents (Dei Verbum on inspiration texts, Lumen Gentium on the Petrine verses) follow the identical pattern later and are explicitly deferred.

Three to five days, most of it index compilation.

---

## 6. THE TODAY PAGE, EVOLVED WITHOUT GROWING

Five cards, fixed, in this order:

1. **Verse of the Day** (as now, restyled; gold quotation marks).
2. **Quote of the Day** (Section 3).
3. **Today in the Church** (a merge of the current Liturgical Day and Mass Readings cards into one): season line with the color chip, the governing celebration, the three or four reading citations, and a single tappable line for the hour's Marian antiphon: **Angelus** ordinarily, **Regina Caeli** in Eastertide, opening a sheet with the full prayer in Latin and English (public domain). The merge funds the Quote card's slot; nothing was lost, one tap was added.
4. **The Holy Rosary** (as now), upgraded one step: tapping a mystery opens a sheet with the Scripture passage and, collapsed beneath it, the rosary prayers in Latin and English. No audio, no beads animation. A prayer book, not a toy.
5. **Continue Reading**, which also hosts the reading-plan line when a plan is active (Section 7): "Today's portion: Genesis 3–4 · Day 12 of 90."

### 6.1 The indulgence timer

The Church grants a partial indulgence for devout reading of Sacred Scripture, and a plenary indulgence when the reading continues for at least half an hour under the usual conditions (*Enchiridion Indulgentiarum*, conc. 30). Implement it as the quietest feature in the app:

- The Reader accumulates continuous reading time (Page Visibility API; pause on blur; reset the continuity clock after a ten-minute gap; daily total in localStorage).
- At thirty minutes, one line appears beneath the chapter title, gold, small: *"You have read for half an hour. The Church grants a plenary indulgence for this, under the usual conditions (Ench. Ind., conc. 30)."* Tapping it opens a sheet explaining the usual conditions (sacramental confession, Holy Communion, prayer for the Holy Father's intentions, detachment from sin).
- No streaks, no history graph, no badge, no sound. A setting hides it entirely.

Piety, not gamification. Three to four hours.

---

## 7. READING PLANS, THE CATENA WAY

Catena's plan creator has the right shape: the user picks books, the app does citation arithmetic, no copyrighted plan content exists anywhere. Adopt it.

- **Model:** `{ id, name, chapters: ["genesis/1", ...], perDay, startedAt, completedThrough }` in localStorage. A plan is a list of chapter references and a divisor. Nothing more.
- **Creator:** pick books (the existing grouped book list with checkboxes), pick a pace (chapters per day, or a target end date which computes the pace), name it, start. One screen.
- **Presets, citation-only:** The Four Gospels in 90 Days; The Deuterocanon in 30 Days (the books only Catholics have, as a front-door feature); The Psalter in a Month (Vulgate numbering, naturally); The New Testament in a Year; The Whole Canon in a Year (about 1,330 chapters in the 73-book canon, so roughly four chapters a day, weighted so Psalm 118 does not ruin anyone's Tuesday).
- **Surface:** one line in Continue Reading, plus a checkmark action at the chapter's end in the Reader ("Mark today's portion read"). Plans live under Read for management. No reminders beyond the single optional daily notification.

Two to three days.

---

## 8. READER AND SEARCH REFINEMENTS

### 8.1 Reader

- **Chapter grid picker:** tapping the chapter title opens a numbered grid (1–50 as buttons) instead of forcing the select dropdown; dramatically faster on iOS. Half a day.
- **Swipe between chapters** on touch devices, with the existing prev/next links retained. Half a day.
- **Skip empty verse slots** in rendering (review P1-4) so the grid blanks never show as naked numbers.
- **Verse focus polish:** the deep-linked verse (`?v=`) gets the gold rule beside it for three seconds, then fades, instead of a permanent selection.

### 8.2 Search

- Keep the linear scan; it is simple and correct. Make it fast by making it local: the **Download for offline** action (Settings → Data) warms every book into the cache, after which a full-canon search is near-instant. Add two refinements only: result count per book group with **OT / NT / Gospels filter chips**, and exact-phrase ranking above all-words matching. One day.
- Fix the accent-folded highlight (review P2-2) so *cælum* lights up when the user typed *caelum*.

### 8.3 The share card

The evangelization vector. From the verse action bar and the quote card: render to a canvas image, 1080×1350 (portrait, the share-sheet sweet spot): warm gray field, Garamond text, gold ✠, citation with translation abbreviation, tiny "Fidelis" wordmark. Two style options only, Day and Night. Native share sheet on iOS via the Web Share API (works in Capacitor). One day. Every shared card is a seed and a citation lesson at once.

---

## 9. iOS DEPTH

1. **Two new widgets** beside the existing Verse of the Day: **Mass Readings** (the day's citations, deep-linking into the Mass tab) and **Liturgical Day** (celebration name, season, color dot; the lock-screen accessory version is just the color dot and name). Implementation rule: do not port the calendar engine to Swift. Instead, `scripts/build-calendar-widget.mjs` pre-resolves a ±400-day window into a bundled JSON (`date → { label, color, celebrations, citations }`) at build time, exactly the pattern `build-votd-widget.mjs` already proved. The widgets stay dumb and always agree with the app. Three to four days total.
2. **Quote of the Day widget**, same pre-resolved pattern, once the corpus exists.
3. **App Intents:** a "Today's Gospel" intent so Siri can answer "What's today's Gospel?" with the citation and open the app to it. One day.
4. **Fix the DST parity drift** (review P1-9) before shipping any further widgets, so app and home screen never disagree.
5. **Dynamic Type:** map the four text-size presets onto the iOS accessibility sizes so the system setting and the in-app setting cooperate rather than fight.

---

## 10. ACCESSIBILITY AND QUIET QUALITY

- VoiceOver: verse spans announce "verse 16" before the text; the commentary sheet traps focus; the liturgical color chip carries its name in the label, never color alone.
- Contrast: every token pair above passes WCAG AA on its background; the gold on dark is the one to watch, hence `#D4B254` rather than a deeper gold.
- Motion: the app has none; keep it that way and declare `prefers-reduced-motion` honored by construction.
- Latin: `lang="la"` on Vulgate text nodes so screen readers stop attempting English phonetics on *misericordia*.

---

## 11. THE TRUST SURFACE

The creed deserves a visible apparatus. On About:

1. **The pledge, plainly:** no edits, no ads, no tracking, no account, no AI paraphrase, ever. This paragraph is the marketing.
2. **The integrity line:** "Texts verified against pinned sources · manifest `sha256:…`" (review P1-10), with a short explainer of how anyone can verify the bundles themselves.
3. **The versification note** (review P1-4), honestly stating where the source grid differs from printed Douay verse breaks.
4. **Corrected appendix wording:** the Clementine appendix proper (Prayer of Manasses, 3–4 Esdras), plus Psalm 151 and Laodiceans from the wider Vulgate manuscript tradition.
5. **Quote corpus note:** every quotation verified to its source edition.

---

## 12. ROADMAP

| Release | Contents | Effort |
|---|---|---|
| **v1.1 — Repair and identity** | Review P0-1/2/3; region setting; token system + liturgical accent; tab bar; Settings screen with live preview; download-offline; empty-verse skip; share card; icon set | 2–3 weeks |
| **v1.2 — The daily soul** | Quote of the Day (corpus + card + widget); Today-page merge with Angelus/Regina Caeli; indulgence timer; reading plans; chapter grid + swipe | 2 weeks + corpus curation |
| **v1.5 — Formation** | Haydock layer; Catena Aurea with Father filters; CCC citation links; commentary settings | 4–6 weeks, dominated by data cleanup |
| **v2.0 — The library** | Catechism module (Baltimore + Roman Catechism bundled, CCC importable); LibriVox Douay audio; additional widgets and App Intents | scoped per item |
| **v2.x — The patrimony** | 1962 calendar toggle; conciliar-document links; parish-embeddable readings widget | scoped per item |

Each release is independently shippable, and each leaves the Today page at exactly five cards.

---

## 13. WHAT FIDELIS REFUSES TO BUILD

Written down so future enthusiasm cannot erode it:

1. **No accounts and no cloud sync.** Notes export to JSON instead; the user owns their marginalia. Privacy is a feature the giants cannot copy.
2. **No AI summaries, paraphrases, or chat.** The text is not ours to edit; it is not a machine's to restate. Fidelis is the room where the Word is read, not discussed with a bot.
3. **No social layer.** No comments, no feeds, no friend graphs. The share card sends Scripture out; nothing flows back in.
4. **No streaks, badges, or progress theater.** The indulgence line is the only acknowledgment the app makes, and it is the Church's, not ours.
5. **No ads and no in-app purchases**, ever. The About pledge says so in writing.
6. **No notification pressure.** One optional daily verse-and-quote notification, off by default. The Church already has bells.
7. **No red-letter text, no inspirational stock imagery, no verse-of-the-day backgrounds with sunsets.** Parchment-grade restraint throughout.

The simplicity is not a development phase. It is the product.

---

## NEXT ACTIONS

1. Fix the review's P0 items (the precedence engine, the lectionary gate, the psalm mapping) and re-run the harnesses.
2. Approve or amend the token palette in Section 1.1; I will then produce the full `styles.css` migration as a single diff-ready file.
3. Approve the Section 3 quote schema; I will draft the first 40 corpus entries with full loci for your verification pass, Doctors first.
4. Decide the one open product question: whether the **Today in the Church** merge (Section 6, card 3) suits you, since it changes the page you see every morning.

*Simplex sigillum veri.*
