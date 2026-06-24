# CLAUDE.md — Fidelis

Catholic Bible app (DRB, CPDV, Clementine Vulgate) with liturgical calendar and
daily Mass readings. Companion documents:
`docs/review/Fidelis_Code_Review_V1_2026-06-11.md` (the repair manual — every
P0/P1/P2 item plus hygiene B.1/B.2/B.4 done as of v1.1.0 and §B.3, CI, closed in
v1.2.1 — the manual is fully implemented), `docs/review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md`
(the growth plan; its §1–§2 identity layer shipped in v1.3.0, the identity release;
its §6 card 4 / §6.1 / §7 devotional layer in v1.4.0, the daily soul; the §4
commentary layer in v1.5.0; the §8.3 share card in v1.8.0; §8.1/§8.2 Reader & Search
refinements in v1.8.1; §3.4 quote verification in v1.8.3; the buildable half of §9
in v1.8.4; the §5 CCC citation index in v1.9.0; an iOS crispness pass (safe areas,
touch feel, the gold-contrast split, CCC discoverability) in v1.10.0; NABRE as the U.S.
Mass-readings default (import-only; never bundled) in v1.11.0; a navigation & IA pass
(scroll restoration, in-page SectionNav jump bars, native-Back handling, focus) in v1.12.0;
visual-regression fixes (readable selects, chip section-bar, liturgical-outline selections) in
v1.12.1; USFM/OSIS import + a NAB-PDF converter in v1.12.2; a documentation reconciliation
in v1.12.3; the USCCB calendar + NABRE readings made the defaults in v1.13.0; and the iOS
Mass/Quote widget sources + a macOS CI in v1.13.1; and the iOS-shell fixes (a reference-counted
scroll-lock, the startup font preloader, the scripted Widget Extension target), the Chi-Rho native
app icon, and the four-face Scripture lineup in v1.13.2 — all recorded below), and `CHANGELOG.md`
(release history; bump `package.json` version and add a CHANGELOG entry together).

## Commands

```sh
npm test           # both harnesses (all hard assertions, exit 1 on any failure) + manifest verify
npm run build      # type-check (tsc) + Vite build
npm run golden     # re-bless golden-year snapshots after a DELIBERATE engine change; review the diff
npm run verify-data
```

Harnesses assert everything (review §B.1 — no print-only expectations remain). Golden-year
snapshots (§B.2) in `scripts/golden/{2024..2027}.json` pin the full computed calendar, day
codes, and reading resolution per day for both regions; `test-data.ts` diffs them, so any
engine change that silently moves a feast is a red `npm test`. §B.3 (CI) is closed:
`.github/workflows/ci.yml` runs `npm ci`, `npm test`, and `npm run build` on Node 22 for
every push and pull request, so a red harness or a type error fails the build.

## Release ledger

One line per release. The unabridged narrative is
[docs/history/RELEASES.md](docs/history/RELEASES.md); the changelog is [CHANGELOG.md](CHANGELOG.md).

- **v1.13.2 — the unbound page** — iOS-shell fixes (reference-counted scroll-lock, startup font preloader, scripted Widget Extension target), the Chi-Rho native app icon, the four-face Scripture lineup, sw cache v4→v5. → [detail](docs/history/RELEASES.md#the-unbound-page-ios-shell-fixes-v1132)
- **v1.13.1 — the second lampstand** — iOS Mass/Quote WidgetKit widgets + macOS CI; Capacitor 8.4.1. → [detail](docs/history/RELEASES.md#the-second-lampstand-ios-widgets-macos-ci-v1131)
- **v1.13.0 — the proper of the day, by default** — USCCB calendar + NABRE readings made the defaults; calendar-widget regenerated for USA region. → [detail](docs/history/RELEASES.md#the-proper-of-the-day-by-default-v1130)
- **v1.12.3 — the faithful record** — documentation reconciliation; first git tags + GitHub release. → [detail](docs/history/RELEASES.md#the-straight-paths-navigation-ia-v1120)
- **v1.12.2 — bring your own** — USFM/OSIS import parsers + NAB-PDF converter. → [detail](docs/history/RELEASES.md#the-straight-paths-navigation-ia-v1120)
- **v1.12.1 — readable again** — visual-regression fixes (selects, SectionNav chips, liturgical-outline selections, sw cache v3→v4). → [detail](docs/history/RELEASES.md#the-straight-paths-navigation-ia-v1120)
- **v1.12.0 — the straight paths** — navigation & IA pass (scroll restoration, SectionNav jump bars, native-Back handling, focus, Search URL-state). → [detail](docs/history/RELEASES.md#the-straight-paths-navigation-ia-v1120)
- **v1.11.0 — the proper of the day** — NABRE as the U.S. Mass-readings default (import-only; never bundled). → [detail](docs/history/RELEASES.md#nabre-as-the-us-mass-default-the-proper-of-the-day-v1110)
- **v1.10.0 — made plain** — iOS crispness pass (safe areas, touch feel, gold-contrast split, CCC discoverability, status bar). → [detail](docs/history/RELEASES.md#made-plain-the-ios-crispness-pass-v1100)
- **v1.9.0 — the deposit** — CCC citation index (§5): verse→¶ links to the Catechism; Catechism text never bundled. → [detail](docs/history/RELEASES.md#the-deposit-design-spec-5-v190)
- **v1.8.4 — the doorposts** — pre-resolved widget data pipeline + Android Mass/Quote widgets (buildable half of §9). → [detail](docs/history/RELEASES.md#the-open-door-a11y-polish-release-v181)
- **v1.8.3 — the cloud of witnesses** — §3.4 quote verification ledger closed (all 47 entries). → [detail](docs/history/RELEASES.md#the-open-door-a11y-polish-release-v181)
- **v1.8.2 — every tongue** — `lang="la"` on every Latin text node for screen readers. → [detail](docs/history/RELEASES.md#the-open-door-a11y-polish-release-v181)
- **v1.8.1 — the open door** — a11y + polish (operable verse spans, ARIA nav, commentary offline download, quiet quality). → [detail](docs/history/RELEASES.md#the-open-door-a11y-polish-release-v181)
- **v1.8.0 — the sower** — share card (§8.3): 1080×1350 PNG canvas, Web Share API, three entry points. → [detail](docs/history/RELEASES.md#the-share-card-design-spec-83-v180)
- **v1.7.0 — the lampstand** — Android Verse of the Day home-screen widget. → [detail](docs/history/RELEASES.md#the-lampstand-release-the-android-home-screen-widget-v170)
- **v1.6.0 — freely given** — native Android shell (Capacitor); free-forever pledge in README. → [detail](docs/history/RELEASES.md#the-android-shell-the-freely-given-release-v160)
- **v1.5.0 — formation** — commentary layer (§4): Haydock + Catena Aurea, gold dots, Commentary Sheet panel. → [detail](docs/history/RELEASES.md#the-formation-release-design-spec-4-v150)
- **v1.4.0 — the daily soul** — rosary mystery sheet, reading-time indulgence, reading plans (§6/§6.1/§7). → [detail](docs/history/RELEASES.md#the-daily-soul-release-design-spec-6-card-4-61-7-v140)
- **v1.3.0 — the identity release** — token system, liturgical color, Scripture face, icon set, five-tab nav, Settings screen (§1–§2). → [detail](docs/history/RELEASES.md#identity-release-design-spec-12-v130)
- **v1.1.0 — all P0/P1/P2 fixed** — rank engine, day codes, psalm versification, empty slots, USA calendar, memorial propers, reading display, chapter clamp, VOTD ordinal, pinned upstream. → [detail](docs/history/RELEASES.md#review-items-all-fixed-in-v110-details-below-are-the-record)

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds five cards.** A new feature earns a line inside an existing card or lives on another tab.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
