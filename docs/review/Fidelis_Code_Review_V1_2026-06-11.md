# FIDELIS — CODE REVIEW AND IMPROVEMENT PLAN

**Version:** 1.0
**Date:** June 11, 2026
**Reviewer:** Claude, at Wilson Warren's request
**Scope:** Full source review of the `fidelis-main` zip (web app, data pipeline, lectionary builder, iOS shell and widget). Every source file was read (~3,600 lines). The project was installed, type-checked, and built clean (`tsc` + Vite, 308 KB JS, 97.5 KB gzipped). Two test harnesses were written and run against the liturgical engine and the committed data; both are included in this delivery (`scripts/test-liturgical.ts`, `scripts/test-data.ts`).

---

## VERDICT

The architecture is sound and the conviction is honored where it is easiest to honor: the texts ship verbatim, the copyright wall is principled, the code is small, legible, and dependency-light. The build is clean. The Easter computus is correct against an eleven-year reference table including the 2038 late-Easter and 2100 century edge cases. Full-year sweeps of 2024, 2025, and 2026 resolve Mass readings for every single day.

The defects cluster in exactly one place: **the app's fidelity claim is currently broken not in the biblical text but in the liturgy around it.** The calendar engine has no transfer or precedence logic, and the Responsorial Psalms render the wrong verses on most days because Hebrew lectionary verse numbers are applied to Vulgate-versified text. An app whose creed is "the text is not ours to edit" must not display Good Friday in white under the Annunciation, and must not open Ash Wednesday with the Miserere's superscription in place of "Have mercy on me, O God." Both happen today. Both are fixable in bounded work.

Findings are tiered: **P0** (worship-facing accuracy, fix before anyone else uses this), **P1** (correctness and integrity, fix before TestFlight), **P2** (polish). Features follow in three tiers with effort estimates.

---

## A. DEFECTS

### P0-1. The liturgical engine has no precedence or transfer logic

**File:** `src/lib/liturgical.ts` (celebration assembly, lines ~325–338).

Fixed-date celebrations fire on their nominal date unconditionally, movable feasts likewise, and the only "precedence" is a stable sort by rank that then lets any Solemnity or Feast override the day's color. The Table of Liturgical Days (*Universal Norms on the Liturgical Year and the Calendar*, nn. 59–61) is not implemented. Verified outputs from the harness:

| Date | App says | The Church says |
|---|---|---|
| **Mar 25, 2016** | Good Friday, **color white**, celebrations listed as "Annunciation" *above* "Good Friday" | Good Friday, red. Annunciation transferred to Apr 4. |
| **Mar 25, 2024** | Monday of Holy Week with the Annunciation, white | Monday of Holy Week, violet. Annunciation transferred to Apr 8. |
| **Apr 8, 2024** | Ferial Monday of Easter II, no celebration | The Annunciation (transferred solemnity). |
| **Dec 8, 2024** | Second Sunday of Advent with the Immaculate Conception, **white** | Second Sunday of Advent, violet. IC transferred to Dec 9. |
| **Dec 9, 2024** | Ferial Advent Monday | The Immaculate Conception (transferred). |
| **Nov 30, 2025** | First Sunday of Advent, **color red**, St. Andrew listed | First Sunday of Advent, violet. St. Andrew suppressed. |
| **Feb 14, 2024** | Sts. Cyril and Methodius listed *above* Ash Wednesday | Ash Wednesday only; the memorial is omitted. |
| **Nov 22, 2026** | Christ the King with St. Cecilia also listed | Christ the King; Cecilia suppressed. |
| **May 14, 2026** | Ascension with St. Matthias also listed | Ascension; Matthias suppressed that year. |
| **Dec 14, 2025** | Gaudete (rose, correct) but St. John of the Cross listed | Gaudete only; the memorial yields to the Sunday. |

**Root causes.** (1) No occurrence resolution: when two celebrations fall on one day, both are shown. (2) No transfer: an impeded solemnity vanishes instead of moving. (3) Ash Wednesday is ranked `Feria`, the lowest rank, so any memorial outsorts it; in the Table it is rank I.2, above every solemnity of the saints. (4) The color override fires for any Solemnity or Feast regardless of whether the celebration would actually be observed that day.

**Fix sketch (8–14 h).** Implement a minimal Table of Liturgical Days as a numeric rank: 1 Triduum; 2 Christmas, Epiphany, Ascension, Pentecost, Sundays of Advent/Lent/Easter, Ash Wednesday, Holy Week Mon–Thu, Easter Octave; 3 Solemnities of the General Calendar, All Souls; 5 Feasts of the Lord; 6 Sundays of Christmas and Ordinary Time; 7 Feasts of the GRC; 10 obligatory Memorials; 13 Ferias. Resolution: the highest rank wins the day; rank-3 solemnities impeded by rank-1/2 days **transfer to the nearest free day** (GNLYC 60), with the two codified modern cases your trap years exercise: Annunciation impeded by Holy Week or the Easter Octave goes to the Monday after the Second Sunday of Easter; the Immaculate Conception impeded by an Advent Sunday goes to Dec 9. Memorials impeded by anything rank 9 or higher are omitted from display (optionally shown as "commemoration" in Lent). Compute the year's calendar as a whole (a `Map<isoDate, Celebration[]>` per year, cached) rather than per-date, because transfer is inherently a whole-year operation. Keep `liturgicalDay(date)` as the API; it reads the year map. The harness already encodes the acceptance tests.

### P0-2. The lectionary resolver lets solemnity propers defeat Holy Week and the Triduum

**File:** `src/lib/lectionary.ts`, `dayCodeCandidates()` / `named()`.

`named()` correctly suppresses saints' propers on Sundays of Advent, Lent, and Easter (which is why Dec 8, 2024 accidentally produces the right readings). But it applies **no season gate on weekdays**, and it runs before the season switch. Verified: Mar 25, 2016 (Good Friday) yields candidate groups `[["Annunciation of the Lord C", "Annunciation of the Lord"], ["LW06-5Fri C", "LW06-5Fri"]]`. The resolver takes the first group with a Gospel, so **the app would display the Annunciation Mass instead of the Passion on Good Friday.** Same failure on Monday of Holy Week 2024.

**Fix (folds into P0-1, ~2 h once the rank engine exists).** Resolve the day's single governing celebration from the calendar engine first, then derive day codes from it alone. The candidates list should be a consequence of precedence, not a parallel reimplementation of it. Once the engine transfers the Annunciation to Apr 8, the proper readings follow it automatically, which also fixes the currently missing readings on transferred dates.

### P0-3. Responsorial Psalms render the wrong verses on most days

**Files:** `src/lib/lectionary.ts` (`hebrewToVulgatePsalm`), `src/components/ReadingText.tsx`.

The lectionary tables cite psalms in modern (Hebrew) chapter-and-verse numbering. The app converts **chapter only** and applies the Hebrew verse numbers directly to the Vulgate-versified bundled text. The Vulgate counts superscriptions as verses 1–2, so nearly every titled psalm is shifted. Proven from the committed data:

- **Ash Wednesday** (`LW00-3Wed`): the lectionary cites Ps 51:3–4 etc. (Hebrew). The app renders Vulgate 50:1–2: *"Unto the end, a psalm of David, / When Nathan the prophet came to him, after he had sinned with Bethsabee."* The faithful get the title instead of *Miserere mei, Deus*. The correct opening verse is DRC 50:3.
- **Holy Thursday** (`LW06-4Thu`): the psalm is Hebrew 116:12–18. Hebrew 116 splits into **Vulgate 114 (vv. 1–9) and 115 (vv. 10–19)**; the map sends all of 116 to 114, whose nine verses cannot contain the citation. The Mass of the Lord's Supper renders the wrong psalm. The data harness counts **31 spans** that run past Vulgate 114's end, **24 spans** citing Hebrew 147:12+ (which belong to Vulgate 147, not 146), and **4 rows** citing Hebrew Ps 10 (Vulgate 9:22ff, also offset).

**Fix (6–10 h).** Replace the chapter-only function with a span-level mapping `hebrewSpanToVulgate(ch, v1, v2) -> [vulgCh, v1', v2'][]` driven by a small static table: per-psalm verse offset (0, +1, or +2 by superscription length) plus the four split/join cases (9/10, 113/114–115, 114–115/116, 146–147/147). The table is ~150 small entries, mechanical to produce, and testable: assert that the rendered first line of the responsorial for a year of Sundays matches the expected incipit. Display both numbers as you already do, now with correct verse alignment. Note in passing that the citation footer's promise ("psalms are shown with both modern and Vulgate numbers") becomes true only after this fix.

---

### P1-4. The DRC bundle's versification drifts from printed Douay editions, and ~1,450 grid-empty verses render as blank numbered spans

All three bundles report an identical 78 books / 37,255 verses, which means the upstream (scrollmapper) forced every translation onto one verse grid. Verified consequence: in the DRC bundle, 1 Thess 4:17 holds the text printed as 4:18 in actual Douay editions ("Wherefore, comfort ye one another...") and 4:18 is an empty string; DRC Ps 150 merges its final verse into v. 5, leaving v. 6 blank, while the Vulgate and CPDV bundles keep it separate. Each translation carries ~1,443–1,450 empty verse slots. The words are unaltered; the numbering, in places, is not the Douay's own, and the Reader currently prints bare verse numbers with no text.

**Fix (4–8 h plus an audit pass).** (1) Skip rendering empty verses in Reader, parallel view, and search (one-line guards). (2) Add a data-pipeline report listing every empty slot per translation, commit it as `data-report.txt`, and spot-check the worst against your hard copies. (3) Document the grid honestly on the About page: the bundles follow the source corpus's aligned versification, which occasionally differs from printed Douay verse breaks. This is precisely a §9.8 matter: the claim "as in printed editions" must be verified or qualified.

### P1-5. No calendar region: United States transfers are absent

Epiphany is pinned to Jan 6, Ascension to Thursday, and the Second Sunday after Christmas is shown where American parishes celebrate Epiphany. For your entire likely first audience the app disagrees with their parish twice a year on solemnities of the Lord. **Fix (4–6 h, after P0-1):** a `calendarRegion` setting (`universal` | `usa`) consumed by the engine: Epiphany to the Sunday between Jan 2–8 (with Baptism moving to Monday when Epiphany lands Jan 7–8), Ascension to the Seventh Sunday of Easter, and the handful of USA proper days you care to add (Our Lady of Guadalupe is already present; consider Elizabeth Ann Seton, John Neumann, Junípero Serra, Kateri Tekakwitha, Thanksgiving votive optional). Both engines must read the same setting.

### P1-6. Memorials with proper readings are never used

`named(["Memorial"])` runs after the ferial group, and the resolver takes the first group containing a Gospel, so proper readings of memorials can never win. For most memorials that is correct praxis. But the dataset marks true propers (today's St. Barnabas carries `t: 1.001`, Acts 11:21–26; 13:1–3), and the Ordo uses them for the handful of obligatory memorials with assigned propers. **Fix (2–3 h):** when a memorial's rows include a fractional `1.00x` first reading, surface it labeled "Proper of the Memorial" alongside the ferial set, defaulting to the proper for the short list of memorials where it is prescribed (Barnabas, Mary Magdalene pre-feast era aside, Martha, the Passion of John the Baptist, Guardian Angels, etc. — the dataset itself identifies them).

### P1-7. Easter Vigil display labeling

The data is complete (Gen 1, Gen 22, Ex 14, Is 54, Is 55, Bar 3, Ez 36 as `t = 1.1–1.7`, Romans 6 as `1.8`, psalms `2.x`, Gospel per year), but `Readings.tsx` groups by `Math.floor(t)`, so the Vigil renders nine readings all labeled "First Reading — option N." **Fix (2–3 h):** special-case the `1.x` ladder: label 1.1–1.7 as "Reading I…VII," 1.8 as "Epistle," interleave each psalm after its reading, and order the Gospel last. Also fix the `.11`/`.21` alternates ("or, shorter form").

### P1-8. Reader can hang on "Loading the sacred text…"

`bookMeta` stores the max chapter/verse counts across translations. Switching translation clamps the chapter against that max, not against the target translation's actual count; if the target has fewer chapters, `verses` stays null forever with no error. **Fix (1 h):** clamp against loaded `data.chapters.length` after load, or show "chapter not present in this translation."

### P1-9. VOTD parity drifts between web and iOS widget for the first hour after a DST spring-forward

`dayOfYear()` in `votd.ts` divides wall-clock deltas by 86,400,000 ms; after spring-forward, midnight-to-1 a.m. computes one day low, while the Swift widget uses `Calendar.ordinality`, so phone widget and app disagree for an hour. **Fix (30 min):** compute day-of-year from calendar components (month/day table), not millisecond arithmetic. Mirror in `WidgetVotd`.

### P1-10. Pipeline reproducibility: unpinned upstreams, no integrity manifest

Both build scripts fetch `master` of their source repos; a silent upstream edit would flow into "unaltered" texts on the next `npm run data`. **Fix (2–3 h):** pin commit SHAs in the scripts; emit `public/data/manifest.json` with SHA-256 per file at build; verify the manifest in CI; surface "texts verified, manifest `<hash>`" on the About page. *Forma manet*, demonstrably.

---

### P2 (polish, bundled small fixes)

1. **About page and README repeat the appendix error:** the Clementine appendix is Manasses + 3–4 Esdras; Psalm 151 and Laodiceans come from the wider Vulgate manuscript tradition. Reword both (15 min).
2. **Search highlight** fails to `<mark>` accent-folded matches (query *caelum*, text *cælum*); highlight on the folded index mapping (1 h).
3. **Service worker:** nothing precaches the shell, hashed assets accumulate forever in `fidelis-shell-v1`; precache the build manifest on install and purge non-current assets on activate (2 h). Note SWs do not run inside Capacitor's webview; irrelevant on iOS since `dist/` ships in the bundle, but say so in IOS.md.
4. **Partial flag under-reports:** `parseCitation` drops letter suffixes (`12b`) without setting `partial`, contrary to its own doc comment; set it (30 min). Only 2 rows are flagged today.
5. **Epiphany naming:** "(traditional date)" reads like editorializing; after P1-5 the label becomes simply The Epiphany of the Lord on the correct regional date.
6. **Notes/bookmarks export:** localStorage only; add JSON export/import in Library so a device loss does not eat a user's marginalia (2–3 h).
7. **Holy Thursday Chrism Mass:** the dataset has `LW06-4Thu~Chrism`; offer it as a labeled alternative on Holy Thursday morning (1 h).
8. **`getSettings()` read once per render in Reader** for `showVerseNumbers`; lift to state if you ever add the toggle to the UI (it exists in Settings type but no control).

---

## B. ENGINEERING HYGIENE

1. **Keep the harnesses.** `scripts/test-liturgical.ts` and `scripts/test-data.ts` are included; convert their printed expectations into assertions and wire `npm test`. The trap-year cases are the acceptance suite for P0-1/2.
2. **Golden-year snapshots.** After the precedence engine lands, snapshot the full computed calendar and day codes for 2024–2027 to JSON and diff in CI. Any engine change that silently moves a feast becomes a red build.
3. **CI:** GitHub Actions running `tsc`, `vite build`, tests, and the data manifest check on every push (1–2 h).
4. **Versioned data:** commit the manifest with the data so the repo itself witnesses to the texts' integrity.

---

## C. DESIGN DIRECTION

Tokens for the look you described, layered on the existing two themes rather than replacing them:

- **Base (night):** Claude-style grayscale: background `#1a1a1e`, surface `#232328`, text `#e8e6e1`, muted `#9b978f`.
- **Base (day/parchment):** keep your parchment, slightly desaturated toward gray: `#f3efe7` background, `#fbf8f1` cards.
- **Royal accents:** purple `#5b3a8e` (interactive, links, active nav), gold `#b8923a` (the ✠, labels, selected states), with hover/darken variants. Purple here reads as Christ the King's royalty, not penitence, precisely because gold rides with it.
- **Liturgical accent mode (the differentiator):** a setting, default on, that drives the accent from `liturgicalDay().color` after P0-1: green `#3a7d44`, violet `#5b3a8e`, gold-white `#b8923a`, red `#a32638`, rose `#c76a8a`. The whole app turns rose on Gaudete morning and the calendar catechizes silently. The `COLOR_HEX` map already exists; this is CSS-variable plumbing (3–4 h).
- **Type:** the texts deserve a real serif. EB Garamond (OFL) bundled for scripture, system sans for chrome. Live Scripture preview inside Settings when changing font, size, or translation, in the Catena manner (3–4 h with the settings page consolidation; today's controls are scattered across Reader toolbar and a theme button).

---

## D. FEATURES BY TIER

### Tier 1 — Ship-polish (with the P-fixes, this is v1.1)

1. **Settings page** consolidating translation, parallel default, text size with live preview, theme, liturgical accent toggle, calendar region. (1 day)
2. **Download-all offline:** one button per translation that warms the data cache (each translation is ~4 MB); badge when complete. (3–4 h)
3. **Shareable verse card:** render the selected verse to a canvas image, parchment or night styling, citation and translation abbreviation included, share sheet on iOS. This is the evangelization vector. (1 day)
4. **Angelus / Regina Caeli card** on Today, season-aware (Regina Caeli in Eastertide), Latin and English, public domain. (2–3 h)
5. **Empty-verse skip + Vigil labels + region toggle** from the P-list above.

### Tier 2 — Formation layer (v1.5, the Catena answer)

1. **Haydock commentary** verse-linked under the Douay (1859, public domain; GitHub digitizations exist with uneven OCR; budget a cleanup pass). Collapsed by default beneath each verse: simple surface, deep cellar. (1–2 weeks incl. data work)
2. **Catena Aurea** on the Gospels (Newman's translation, public domain), filterable by Father, the Catena-app move done Catholic. (1 week)
3. **Quote of the Day** with the hard rule: no quote enters the corpus without a verified locus (work, book, section); keyed to the sanctoral calendar so Augustine speaks on Aug 28; deterministic by date like the VOTD; sourced from public-domain translations only. Start with 120 entries: Doctors, Fathers, conciliar lines. (3–4 days incl. curation)
4. **Reading timer with the indulgence note** (Enchiridion Indulgentiarum, conc. 30: partial for devout reading, plenary at thirty minutes under the usual conditions). A quiet line when the threshold passes. Piety, not gamification: no streaks, no badges. (3–4 h)
5. **Scripture-to-Catechism links:** verse pages list "cited at CCC nn. …" with deep links to vatican.va; the mapping is factual data compiled from the CCC's Index of Citations. (3–5 days incl. data compilation)
6. **Reading plans, Catholic-shaped:** lectio continua of a Gospel; the deuterocanon in 30 days; follow-the-ferial-lectionary. Plain citation lists, no copyrighted plan text. (2–3 days)

### Tier 3 — v2

1. **Catechism module:** Baltimore Catechism and the Roman Catechism (Donovan translation) bundled public domain; CCC importable via the same IndexedDB wall as RSV-2CE. (1–2 weeks)
2. **Audio:** LibriVox public-domain Douay recordings, chapter-level playback with background audio on iOS. (1 week)
3. **1962 calendar toggle** for the traditional calendar audience the Douay+Vulgate bundle already attracts; Divinum Officium's data is open. (1–2 weeks; substantial)
4. **More iOS widgets:** Mass readings citations and Liturgical Day (name + color) as additional WidgetKit families; lock-screen accessory widgets; App Intents so Siri can read today's Gospel citation. (3–5 days)
5. **Embeddable widgets v2:** readings-of-the-day iframe alongside VOTD for parish websites — a genuinely useful gift to parish webmasters and a distribution channel. (1–2 days)

---

## E. MISSION AND SHIPPING NOTES

1. **Import feature honesty.** The page already documents the scrollmapper JSON shape, which is more than most apps do. Add one sentence stating the user must hold rights to the file, and resist the temptation to link "where to find" anything. Your own digital copies are for your device; the wall stays.
2. **TestFlight path:** the iOS docs are accurate and complete; set the bundle ID and team, archive, invite the parish men's group. Gather a month of trap-date reports before wider release.
3. **App Store metadata:** lead with what no one else has: the 73-book canon, the unaltered texts, the liturgical calendar, no account, no tracking, no ads. The privacy story is genuinely rare and Apple's nutrition label will show all-clear.
4. **Naming check** before launch: "Fidelis" collides with a large US health insurer in App Store search; consider "Fidelis Bible" as the store display name for findability.

---

## SUMMARY OF EFFORT

| Block | Estimate |
|---|---|
| P0-1/2 precedence + transfer engine with tests | 10–16 h |
| P0-3 psalm mapping table + tests | 6–10 h |
| P1 items (4–10) | ~3 days |
| Tier 1 features | ~3–4 days |
| Tier 2 formation layer | ~3–4 weeks |
| Tier 3 | scoped per item |

The P0 work is the price of the app's own creed. Everything else is growth.

*Verbum Domini manet in æternum.*
