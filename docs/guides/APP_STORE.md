# App Store submission metadata

[← Docs index](../INDEX.md)

Paste-ready metadata for App Store Connect ("iOS App Version — Prepare for
Submission"). Character limits verified by script; re-verify after any edit
(`node -e` counts are recorded at the bottom).

---

## Version

```
1.24.4
```

The store version string always equals the uploaded build's
`MARKETING_VERSION` (`CFBundleShortVersionString`). For an update, create the
new version in ASC (the "+" beside "iOS App") with exactly this string. (The
first submission, 1.15.1, needed the auto-created "1.0" edited to match — an
update starts from the right place.)

**App name (en-US):** `Fidelis: Catholic Bible`  
**Subtitle:** `The Catholic Bible & Missal`

## What's New in This Version (≤ 4,000 characters — updates only)

```
Maintenance: the navigation library Fidelis is built on moved up to its current major version. Nothing visible changes — reading, search, the daily Mass readings, and the home-screen widgets all work exactly as before.
```

(ASC shows What's New only for updates after the first released version. The
same text can seed the TestFlight "What to Test" notes. Use the full physical
matrix in [Device acceptance](DEVICE_ACCEPTANCE.md), not this summary alone.)

**Store state (verified live 2026-08-07 23:50 UTC, asc CLI).** The App Store
sells **1.24.3** — approved the same day it was submitted; the *Fidelis:
Catholic Bible* rename is live. **1.24.4 — build 322**, the router-maintenance
release, is staged (metadata copied from 1.24.3, the fresh What's New above,
all three screenshot sets carried) and **WAITING_FOR_REVIEW** (submission
`2a04b983…`, release type AFTER_APPROVAL — approval publishes it by itself).
**Do not rename, edit, or resubmit a version waiting for review** — any change
pulls it from the queue.

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
• The General Roman Calendar and verified U.S. profiles, including the provinces that keep Ascension Thursday — with precedence, transfers, and an explicit General Roman fallback where no local proper is verified
• The Mass readings for any day of any year, laid out as they are read at Mass
• Let the app's accent follow the liturgical year — green in Ordinary Time, violet in Advent and Lent, red on the feasts of martyrs

EVERY DAY
• A Today page that never clutters: the day's celebration and Mass readings, the Saint of the Day with a full life to read, the day in Church history, a Verse of the Day, and a verified quote from the saints — never more than six cards
• Home-screen widgets for the Verse of the Day, today's Mass, and the daily quote — in Day, Night, or System appearance, with an in-app setup guide
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

## Availability (Pricing and Availability)

Free ($0.00) in **174 territories — every territory except China mainland** —
with automatic availability in territories Apple adds later. China mainland was
switched off on 2026-08-05: Apple's Guideline 2.1 requires an Internet
Publishing License (网络出版服务许可证) to distribute book content there, a
permit this project cannot hold. **Do not re-enable China mainland** without
one.

## Notes for App Review (≤ 4,000 characters)

The Guideline 2.1 response paragraph (2026-08-05) served its purpose — 1.24.2
was approved — and was **dropped when 1.24.4 was staged on 2026-08-07**; the
block below is the live 2,414-code-point notes. Do not re-add it, and do not
re-enable China mainland (see Availability).

```
Fidelis is a Catholic Bible and liturgical-calendar app. Notes for review:

• No account, no sign-in, no server. The app is fully functional offline from first launch; all content ships in the binary. There are no test credentials because there is nothing to log into.

• All bundled texts are public domain: the Douay-Rheims Bible (Challoner revision), the Catholic Public Domain Version, the Clementine Vulgate (Latin), and the 1923 McHugh–Callan English translation of the Roman Catechism. Provenance is pinned to exact upstream sources and sealed with a SHA-256 manifest verified by the test suite.

• Copyrighted translations (NABRE, RSV-2CE, Biblia Platense) are NOT included and are never downloaded by the app. A user who already owns a licensed digital copy may import it from a file on their device for personal use; the imported file is stored on-device only (IndexedDB in the system WebView) and never transmitted. When no import is present, the app falls back to the bundled public-domain Douay-Rheims.

• The text of the Catechism of the Catholic Church is likewise not bundled: the app ships only citation numbers and links out to the official text on vatican.va (opens in the browser).

• Photo library access (add-only) is requested solely when the user taps "Save image" on the Scripture share card.

• The app includes three home-screen widgets (Verse of the Day, today's Mass readings, daily quote), an in-app Widgets guide, and a Siri App Intent ("What's today's Gospel?"). On iOS, Apple requires the user to add widgets from the Home Screen; the app can report configured families but cannot install a widget or open the gallery.

• The verified Ordinary Form calendar catalog currently contains General Roman, U.S. Sunday Ascension, and U.S. Thursday Ascension for Boston, Hartford, New York, Omaha, and Philadelphia. Unsupported jurisdictions are identified as General Roman fallback; the app does not claim worldwide local-calendar coverage.

• No analytics or tracking SDKs. The app makes no network requests of its own; the only egress is user-tapped external links.

Quick tour for review: the Today tab shows the liturgical day, Verse of the Day, Mass readings, and daily quote. The Read tab is the Bible reader — tap a verse for commentary, Catechism links, and sharing. The Mass tab shows the day's full readings. More → Translations shows the (optional) licensed-copy import screen.
```

## Screenshots

Requirement: JPG/PNG, RGB, portrait. Fidelis is a universal app, so **both**
sizes are required: iPhone 6.9″ **1284 × 2778** (`appstore/screenshots/`) and
iPad 12.9″ **2048 × 2732** (`appstore/screenshots-ipad/`). Up to 10; the first 3
appear on the install sheet. Shot list (day theme unless noted):

The v1.22.1 set was last regenerated on **2026-07-18**. It predates the visible
v1.24.0 Widgets page, calendar-profile selector, responsive Library repair, and
motion/focus changes. **Regenerate and inspect both device classes before App
Store submission.** Do not reuse the old set as proof of the 1.24.0 UI.

1. **01-today** — the six-card front page: Today at Mass, Today in the Church
   (Saint of the Day + Church history), Verse of the Day
2. **02-reader-john1** — John 1 in EB Garamond, gold Haydock dots + purple CCC marks
3. **03-mass-readings** — the day's readings (shows the honest NABRE-import notice);
   **03b-mass-readings-drb** — same page with DRB selected, no notice (pick one)
4. **04-commentary-john3** — Commentary sheet on John 3:16 (Witham, St. Augustine)
5. **05-search-charity** — 87 results with OT/NT/Gospels filters and highlights
6. **06-reader-psalm22-night** — Psalm 22 in the night theme
7. **07-settings** — Scripture preview, calendar profiles, version cards, text size
8. **08-widgets** — native setup/status page and the truthful platform instructions
9. **09-canon** — the 73-book canon in Vulgate order

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

Counted as Unicode code points (how ASC counts), 2026-07-23. Re-run the
repository's metadata guard after any edit:

- Promotional text: 163 / 170 ✓
- Description: 2,525 / 4,000 ✓ (re-counted 2026-08-07 — the lectionary bullet,
  live since 1.24.3, is now mirrored here)
- Keywords: 94 / 100 ✓
- Copyright: 21 / 200 ✓
- Review notes: 2,414 / 4,000 ✓ (the Guideline 2.1 paragraph dropped at the
  1.24.4 staging, 2026-08-07; verified against the live detail)
- What's New (1.24.4): 218 / 4,000 ✓ (fresh copy for the maintenance release —
  the 1.24.3 rename copy shipped with the 1.24.3 submission and is not repeated)
