# App Store submission metadata

[← Docs index](../INDEX.md)

Paste-ready metadata for App Store Connect ("iOS App Version — Prepare for
Submission"). Character limits verified by script; re-verify after any edit
(`node -e` counts are recorded at the bottom).

---

## Version

```
1.23.0
```

The store version string always equals the uploaded build's
`MARKETING_VERSION` (`CFBundleShortVersionString`). For an update, create the
new version in ASC (the "+" beside "iOS App") with exactly this string. (The
first submission, 1.15.1, needed the auto-created "1.0" edited to match — an
update starts from the right place.)

## What's New in This Version (≤ 4,000 characters — updates only)

```
The Church-history chronicle now covers every day of the year — 366 dates, matching the Saint of the Day — so the "Today in the Church" card always has a history lead beneath the saint, never a quiet gap. Same texts, same pledge.
```

(ASC shows What's New only for updates after the first released version. The
same text serves as the TestFlight "What to Test" notes: open the Today tab
on any date — the "Today in the Church" card should show the Saint of the
Day and, beneath the hairline, an "In Church History" event. Days that once
had only a saint (for example July 19, St. Macrina) should now carry history
as well.)

## Promotional Text (≤ 170 characters)

```
The full 73-book Catholic canon, daily Mass readings, and the liturgical year — unaltered, offline, free forever. No accounts, no ads, no tracking, no AI rewrites.
```

## Description (≤ 4,000 characters)

```
Fidelis is the Catholic Bible, kept faithfully — the full 73-book canon, the daily Mass readings, and the liturgical year, built on one conviction: the text is not ours to edit.

Every bundled translation is reproduced verbatim from its public-domain source. No paraphrasing, no softening of hard sayings, no silent updates. Where a source differs from a printed edition, the difference is disclosed, not patched.

THE BIBLE
• The Douay-Rheims (Challoner), the Catholic Public Domain Version, and the Clementine Vulgate in Latin — all 73 books, bundled, fully offline
• Own a licensed copy of the NABRE, RSV-2CE, or the Biblia Platense (Spanish)? Import it and read it in Fidelis — your copy stays private; Fidelis never uploads it
• Typeset like a book: four Scripture faces, adjustable size, day and night themes

THE LITURGY
• The complete liturgical calendar, computed for the General Roman and USA calendars — every solemnity, feast, memorial, and feria, with correct precedence and transfers
• The Mass readings for any day of any year, laid out as they are read at Mass
• Let the app's accent follow the liturgical year — green in Ordinary Time, violet in Advent and Lent, red on the feasts of martyrs

EVERY DAY
• A Today page that never clutters: the day's celebration and Mass readings, the Saint of the Day with a full life to read, the day in Church history, a Verse of the Day, and a verified quote from the saints — never more than six cards
• Home-screen widgets for the Verse of the Day, today's Mass, and the daily quote — in light and dark
• "What's today's Gospel?" — ask Siri

STUDY
• The Haydock Commentary across the whole canon and the Catena Aurea on the four Gospels — the Church Fathers on Scripture, verse by verse, earliest first
• See where the Catechism cites a verse, with links to the official text — and read the Roman Catechism (Trent) offline
• Fast search across the canon

DEVOTION
• The Rosary, with the Scripture of each mystery
• Reading plans through the Scriptures
• No streaks, no badges, no progress theater — the only acknowledgment the app makes is the Church's

THE PLEDGE
Free forever. No accounts. No ads. No tracking or analytics of any kind. No AI summaries or paraphrase. Every text's provenance is pinned to its exact source and sealed with a SHA-256 manifest the test suite re-verifies on every run.

The simplicity is not a development phase. It is the product.
```

## Keywords (≤ 100 characters)

```
catholic,bible,douay,rheims,vulgate,latin,mass,readings,lectionary,catechism,rosary,liturgy
```

(Words already in the app name are wasted in keywords; "Fidelis" contributes
itself. Comma-separated, no spaces.)

## Support URL

```
https://github.com/ogprotege/Fidelis
```

## Marketing URL

```
https://github.com/ogprotege/Fidelis
```

## Copyright (≤ 200 characters)

```
2026 Wilson W. Warren
```

Format: year rights obtained + owner name, no URL. (21 characters ✓)

## Privacy Policy URL (App Information / App Privacy)

```
https://github.com/ogprotege/Fidelis/blob/main/PRIVACY.md
```

App Privacy questionnaire: **Data Not Collected** (truthful — no server, no
analytics, no accounts; see `PRIVACY.md`). Requires `PRIVACY.md` to be on
`main` before pasting the URL.

## Subtitle (≤ 30 characters, App Information)

```
The Catholic Bible & Missal
```

(27 characters. Alternative: "Bible, Missal, Catechism" — 24.)

## Age rating / Category

Questionnaire: all "None" → **4+**. Category — Primary: **Reference**,
Secondary: **Books**.

## Routing App Coverage File

Not applicable — Fidelis is not a routing/navigation app. Leave empty.

## App Clip / iMessage App

Not applicable. Leave empty.

## Notes for App Review (≤ 4,000 characters)

```
Fidelis is a Catholic Bible and liturgical-calendar app. Notes for review:

• No account, no sign-in, no server. The app is fully functional offline from first launch; all content ships in the binary. There are no test credentials because there is nothing to log into.

• All bundled texts are public domain: the Douay-Rheims Bible (Challoner revision), the Catholic Public Domain Version, the Clementine Vulgate (Latin), and the 1923 McHugh–Callan English translation of the Roman Catechism. Provenance is pinned to exact upstream sources and sealed with a SHA-256 manifest verified by the test suite.

• Copyrighted translations (NABRE, RSV-2CE, Biblia Platense) are NOT included and are never downloaded by the app. A user who already owns a licensed digital copy may import it from a file on their device for personal use; the imported file is stored on-device only (IndexedDB in the system WebView) and never transmitted. When no import is present, the app falls back to the bundled public-domain Douay-Rheims.

• The text of the Catechism of the Catholic Church is likewise not bundled: the app ships only citation numbers and links out to the official text on vatican.va (opens in the browser).

• Photo library access (add-only) is requested solely when the user taps "Save image" on the Scripture share card.

• The app includes three home-screen widgets (Verse of the Day, today's Mass readings, daily quote) and a Siri App Intent ("What's today's Gospel?").

• No analytics or tracking SDKs. The app makes no network requests of its own; the only egress is user-tapped external links.

Quick tour for review: the Today tab shows the liturgical day, Verse of the Day, Mass readings, and daily quote. The Read tab is the Bible reader — tap a verse for commentary, Catechism links, and sharing. The Mass tab shows the day's full readings. More → Translations shows the (optional) licensed-copy import screen.
```

## Screenshots

Requirement: JPG/PNG, RGB, portrait. Fidelis is a universal app, so **both**
sizes are required: iPhone 6.9″ **1284 × 2778** (`appstore/screenshots/`) and
iPad 12.9″ **2048 × 2732** (`appstore/screenshots-ipad/`). Up to 10; the first 3
appear on the install sheet. Shot list (day theme unless noted):

Regenerated **2026-07-18 for v1.22.1** after the visible Mass-page, Read-tab,
and Settings changes. Every replacement frame carries the masthead (iPhone) or
the one-row desktop nav (iPad), shows no bottom bar, and uses current tokens in
the night frame. Both required sizes and RGB color space were verified exactly
via `sips`; the changed Mass, reading-plan, and Settings surfaces were inspected
from the generated set.

1. **01-today** — the six-card front page: liturgical day, the day in Church history, Verse of the Day
2. **02-reader-john1** — John 1 in EB Garamond, gold Haydock dots + purple CCC marks
3. **03-mass-readings** — the day's readings (shows the honest NABRE-import notice);
   **03b-mass-readings-drb** — same page with DRB selected, no notice (pick one)
4. **04-commentary-john3** — Commentary sheet on John 3:16 (Witham, St. Augustine)
5. **05-search-charity** — 87 results with OT/NT/Gospels filters and highlights
6. **06-reader-psalm22-night** — Psalm 22 in the night theme
7. **07-settings** — Scripture preview, version cards, text size
8. **08-canon** — the 73-book canon in Vulgate order

Generated files land in `appstore/screenshots/` and
`appstore/screenshots-ipad/` (both gitignored — large, regenerable PNGs).
Regenerate with the committed harness:

```sh
npm run build
npm run preview -- --port 4173 --strictPort &   # serve the built app
node scripts/capture-appstore.mjs               # writes both sets
```

It drives headless Chrome (channel "chrome") at each device's pixel geometry
(428×926 @3× → iPhone; 1024×1366 @2× → iPad) and presets settings via
localStorage before the pre-paint script, so the night frame has no Day-flash.

---

### Character-count verification record

Counted as unicode code points (how ASC counts). Verified 2026-07-13:

- Promotional text: 163 / 170 ✓
- Description: 2,416 / 4,000 ✓ (re-counted 2026-07-16 after the Saint-of-the-Day + import-line edits)
- Keywords: 91 / 100 ✓
- Copyright: 21 / 200 ✓
- Review notes: 1,916 / 4,000 ✓
- What's New (1.23.0): 229 / 4,000 ✓ (counted 2026-07-21)
