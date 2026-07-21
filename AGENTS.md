# AGENTS.md

[← Docs index](docs/INDEX.md)

Guidance for AI coding agents working in this repository. Assume nothing; read
this file first. The authoritative deep-dive is `CLAUDE.md` (architecture map,
release ledger, standing rules); this file is the practical summary.

## Project overview

**Fidelis** (`fidelis-catholic-bible`, currently v1.23.1) is a Catholic Bible
app — the full 73-book canon in three unaltered public-domain texts
(Douay-Rheims Challoner `drc`, Catholic Public Domain Version `cpdv`, Clementine
Latin Vulgate `vulgate`) — with a liturgical calendar engine, daily Mass
readings, Haydock + Catena Aurea commentary, a CCC citation index, full-year
saint and Church-history corpora (366 days each), and quiet devotional features
(rosary, reading plans, verse/quote of the day). Free forever: no accounts, no
server, no telemetry, no ads.

It ships as:

- an installable, offline-first **PWA** (service worker `public/sw.js`),
- **iOS and Android** apps via **Capacitor 8.4.x** shells that bundle the whole
  built `dist/` (offline by construction), with native home-screen widgets on
  both platforms,
- an embeddable Verse-of-the-Day iframe route (`#/widget/votd`).

## Technology stack

- **React 19 + TypeScript (strict) + Vite 8**, ESM (`"type": "module"`),
  `react-router-dom` v7 with **HashRouter**.
- **Node 22 required** for all tooling (CI pins it).
- No state library — `src/SettingsContext.tsx` + localStorage. No CSS framework —
  one `src/styles.css` with design tokens.
- Capacitor plugins: `@capacitor/app`, `@capacitor/status-bar` (plus platform
  shells). Native code: Swift (iOS widgets + plugin), Java (Android widgets).
- Tests: custom `tsx` assertion harnesses (no Jest/Vitest) + **Playwright**
  (system Chrome, `channel: "chrome"` — no browser download).
- Tooling: ESLint 9 flat config (typescript-eslint, react-hooks, react-refresh),
  `tsx` for TS scripts.

## Build and test commands

All run from the repo root:

```sh
npm install         # once; Node 22
npm run dev         # Vite dev server on http://localhost:5173/
npm test            # tsx harnesses + manifest verify + eslint — ALL hard assertions
npm run build       # tsc --noEmit type-check + vite build → dist/
npm run lint        # eslint src scripts e2e
npm run check-docs  # broken-link / anchor / orphan-page checker for docs
npm run e2e         # Playwright vs the BUILT app — run `npm run build` first
npm run golden      # re-bless golden-year snapshots after a DELIBERATE engine change
npm run verify-data # re-walk public/data against the SHA-256 manifest
```

Before a PR, `npm test`, `npm run build`, and `npm run check-docs` must all be
green (that is exactly what the Linux `CI` workflow runs).

**`npm test` is custom, not a test framework.** It chains:
`tsx scripts/test-liturgical.ts` (computus, precedence, region acceptance) →
`tsx scripts/test-data.ts` (reading resolution, parsers, pure helpers, both-region
gospel sweep, golden-snapshot diff, manifest re-walk) →
`node scripts/build-manifest.mjs --verify` → `eslint src scripts e2e`. Every
expectation is a hard assertion exiting non-zero; there are no print-only checks.
Golden snapshots in `scripts/golden/{2024..2027}.json` pin the full computed
calendar, day codes, and reading resolution per day for both regions — any
engine change that silently moves a feast is a red `npm test`. Re-bless only
after a *deliberate* liturgical-engine change with `npm run golden`, and review
the diff.

**The data pipeline** (all in `scripts/`): `npm run data` (build the three
bundled texts from pinned upstreams), `lectionary`, `commentary` (haydock +
catena), `ccc`, `trent`, `quotes`, `saints`, `history`, `widgets` (votd-widget +
calendar-widget), `manifest` (re-seal `public/data/manifest.json` after any
data change), `report` (`data-report.txt`). Upstream sources are pinned by
commit hash in `scripts/pins.mjs`. The saints and history corpora are curated
JSON under `scripts/{saints,history}.corpus.json` — edit those, then
`npm run saints` / `npm run history`; never hand-edit `public/data/`. Both
cover every calendar date (366, Feb 29 included); the harness turns red if
any date is missing. How to add an entry: [CONTRIBUTING.md](CONTRIBUTING.md#editing-saints--church-history).

## Repository layout

- `src/lib/` — the pure, testable core: engines and logic, **no React**.
  Key modules: `liturgical.ts` + `lectionary.ts` (calendar + Mass-readings
  engines, region-aware via lazy `currentRegion()`), `votd.ts` / `quotes.ts`
  (deterministic daily selectors, `(dayOfYear + year) mod count`), `data.ts`
  (loaders/memoization), `translations.ts`, `canon.ts`, `search.ts`,
  `passage.ts`, `storage.ts`, `scrollLock.ts`, `overlays.ts`, `import-formats.ts`
  + `import.worker.ts` + `importPlan.ts` (atomic on-device Bible import),
  `commentary.ts`, `ccc.ts`, `theme.ts`, `typography.ts`, `plans.ts`,
  `rosary.ts`, `saints.ts`, `history.ts`.
- `src/components/` — UI primitives: `Sheet.tsx` (the one dialog primitive),
  `ScrollManager.tsx` (the sole scroll authority), `TabBar.tsx` (five-tab nav),
  `Icon.tsx` (ten-mark `currentColor` SVG icon set), `SectionNav.tsx`,
  `VerseQuote.tsx`, sheets (Commentary/CCC/Mystery/Share), etc.
- `src/pages/` — route pages: Home (Today), Reader, Search, Readings (Mass),
  Library, Translations, Settings, Plans, PlanCreator, About, Saint, History,
  BookList, WidgetVotd. Secondary pages are `React.lazy` chunks; the worship
  path is eager.
- `src/App.tsx` — routes; the single writer of `<html data-theme|data-font|data-accent>`.
- `src/SettingsContext.tsx` — live React settings source of truth; `update()`
  writes localStorage synchronously so the engines' lazy `getSettings()` is current.
- `src/styles.css` — all design tokens (day/night blocks).
- `src/generated/` — generated metadata (e.g. `bookMeta.json`); `src/fonts/` —
  bundled EB Garamond (SIL OFL).
- `scripts/` — the build/data pipeline and both test harnesses (see above);
  `scripts/golden/` the snapshots; `*.corpus.json` the curated sources for
  quotes/saints/history; `scripts/history-drafts/` the v1.23.0 fact-check
  ledger (provenance only — not a build input).
- `public/data/` — **generated, manifest-sealed corpus: NEVER hand-edit.**
  Subdirs per translation (`drc/`, `cpdv/`, `vulgate/`) plus `commentary/`,
  `ccc/`, `trent/`, `saints/`, `history/`, `lectionary.json`, `quotes.json`,
  `manifest.json`.
- `public/sw.js`, `public/_headers`, `public/manifest.webmanifest` — PWA shell,
  CSP header file, web manifest (copied into `dist/` at build).
- `ios/`, `android/` — committed Capacitor native shells. iOS WidgetKit widget
  sources live in `ios/WidgetExtension/`; the widget target is created
  idempotently by `ruby scripts/add-ios-widget-target.rb`. Android App Widgets
  are Java classes under `android/app/...`; both read pre-resolved `votd.json` /
  `calendar.json` emitted by `npm run widgets` (also into
  `android/.../res/raw/`).
- `e2e/` — the committed Playwright suite (today, reader, search, library,
  import, storage, offline, axe/WCAG).
- `docs/` — `INDEX.md` (docs hub), `guides/` (IOS, ANDROID, RELEASING,
  APP_STORE, DEVICE_ACCEPTANCE), `history/RELEASES.md` (full narrative),
  `review/` (audits/specs), `SECURITY.md`.
- `capacitor.config.ts` — `appId: app.fidelis.bible`, `webDir: dist`,
  `ios.contentInset: "never"` (CSS safe-area insets are the single source of truth).

## Architecture essentials

- **Liturgical engines are pure.** `liturgicalDay(date, region)` resolves the
  governing celebration by numeric precedence with a whole-year transfer pass;
  `resolveReadings`/`readingsForDate`/`displayReadings` resolve Mass readings
  (memorial propers, Easter Vigil ladder, dual Holy Thursday Masses);
  `hebrewSpanToVulgate()` maps psalm numbering onto the Vulgate-versified bundle.
- **Copyrighted texts are never bundled** (`bundled: false` for NABRE, RSV-2CE,
  Straubinger): the user imports a licensed copy on-device (IndexedDB;
  USFM/OSIS/JSON parsers); the Reader falls back to the bundled Douay-Rheims.
  The CCC *text* likewise never ships — only citation numbers + vatican.va URLs
  (plus the bundled public-domain Roman Catechism/Trent tier).
- **Data integrity:** every file under `public/data/` is SHA-256-hashed into
  `manifest.json` (per-file + root hash + source pins), re-verified on every
  `npm test`. Corpus quirks are disclosed in `data-report.txt`, never patched.
- **Identity system:** all paint colors are tokens in `src/styles.css` — nothing
  outside them carries a raw hex. **Two-accent rule (binding): purple acts,
  gold honors** — `--purple` for interactive/structural accents, `--gold` for
  sacred marks; no element wears both. `accentFor()` remaps only `--purple` to
  the day's liturgical color when `followLiturgicalYear` is on. The
  `index.html` pre-paint inline script sets theme + font before React mounts
  (no flash); its SHA-256 is pinned in `public/_headers` and harness-checked.
- **UI invariants:** `Sheet.tsx` registers with the reference-counted body
  scroll-lock and overlay-back stack; `App.tsx` self-heals a stranded lock via
  `healStrandedScrollLock()` on route change, every pointerdown, and
  foreground-resume (visibilitychange + native `appStateChange`). `ScrollManager`
  precedence: target → skip; REPLACE → skip; POP → restore; PUSH → top
  (`history.scrollRestoration = "manual"`). **No emoji glyphs in `.tsx`** — the
  harness forbids them; use `Icon.tsx`.

## Conventions and standing rules

These are binding; the harness enforces several of them:

1. **Never hand-edit any file under `public/data/`.** Regenerate via the
   pipeline scripts and re-seal with `npm run manifest`.
2. **The Today page never exceeds six cards.** A new feature earns a line inside
   an existing card or lives on another tab first.
3. **The design-spec §13 refusal list is binding:** no accounts/cloud sync, no
   AI summaries/paraphrase/chat, no social layer, no streaks/badges/gamification,
   no ads or in-app purchases, no notification pressure, no red-letter text or
   stock imagery.
4. **Bump `package.json` `version` and add a `CHANGELOG.md` entry in the same
   commit** — always together (Keep a Changelog format; the project names its
   releases). Release names/ledger style: see `CLAUDE.md`.
5. Code style: TypeScript strict with `noUnusedLocals`/`noUnusedParameters`;
   ESLint two-tier flat config (type-aware in `src/`, recommended in `scripts/`
   and `e2e/`); unused vars error with `_`-prefix escape; floating promises are
   an error in `src/`. Match existing naming/comment density; `src/lib/` stays
   React-free and pure.
6. After a deliberate liturgical-engine change: `npm run golden` and review the
   snapshot diff.
7. If calendar logic, Mass-reading citations, lectionary data, or quotes
   change: `npm run widgets` and commit the regenerated iOS/Android JSON.

## Testing strategy

- **Harnesses** (`scripts/test-liturgical.ts`, `scripts/test-data.ts`): pure,
  fast, hard-asserting; they cover the engines, parsers, pure helpers, both-region
  gospel sweep, golden diffs, manifest seal, token contrast ratios, CSP hash,
  and many source-shape guards.
- **Golden snapshots** (`scripts/golden/{2024..2027}.json`): pin the computed
  calendar + readings per day for both regions.
- **E2E** (`e2e/`, `npm run e2e`): Playwright in real Chrome against the **built**
  app via `vite preview` (service worker included) — failure states, sheets,
  the verse-action bar, Search counts, import atomicity with injected IndexedDB
  failures, offline cache truth, and axe WCAG A/AA zero-violations. Run
  `npm run build` first.
- **CI:** `.github/workflows/ci.yml` (Linux, Node 22) = lint → `npm test` →
  `npm run build` → `npm run check-docs`, plus an e2e job, on every PR and push
  to main. `ios.yml` builds the iOS App + widget targets on macOS;
  `android.yml` builds the unsigned debug APK (JDK 21); `sources.yml` monthly
  probes the five pinned upstreams and the vatican.va CCC pages.

## Security considerations

- Fully static, offline-first: no accounts, no server, no telemetry; user data
  stays in localStorage/IndexedDB with JSON export/import. See `PRIVACY.md`.
- Text integrity is a **build-time** seal (SHA-256 manifest re-verified in CI) —
  the app does not re-hash fetched bytes at runtime; in-app copy says "verified
  at build". Runtime trust: code-signed native bundles; same-origin cache-first
  service worker for the corpus.
- A **Report-Only CSP** ships via `public/_headers` (never blocks; inert inside
  the Capacitor shells and on hosts that ignore `_headers`). The inline
  pre-paint script is allowed by SHA-256 hash, recomputed and asserted by the
  harness — editing the script without updating the header is a red `npm test`.
  Enforcing-CSP migration is documented and deferred (`docs/SECURITY.md`).
- All scripture/user text renders through React escaping; the one HTML
  commentary path is build-escaped.
- iOS builds require a **Swift ≥ 6.2 toolchain (Xcode 17+/26)** — Capacitor 8.4.x
  ships its iOS framework as a Swift 6.2 binary; older Xcodes fail with
  misleading "no member 'webView'" errors.

## Deployment and release process

- **Web/PWA:** `npm run build` → static `dist/` (base `./`); host it anywhere
  (`_headers` honored by Netlify/Cloudflare Pages).
- **Native shells:** `npx cap sync ios` / `npx cap sync android` copies `dist/`
  into the shells; device builds need Android Studio / Xcode locally.
- **Release runbook** (full ordered version: `docs/guides/RELEASING.md`):
  1. bump `package.json` + `npm install --package-lock-only` + `CHANGELOG.md`
     entry in one commit;
  2. `npm run widgets` if calendar/readings/quotes changed;
  3. gate: `npm test && npm run build && npm run check-docs`;
  4. reconcile native versions (`android/app/build.gradle` `versionName`/
     `versionCode`, iOS `MARKETING_VERSION` ×4, `scripts/add-ios-widget-target.rb`;
     keep iOS deployment targets 15.0 app / 17.0 widget);
  5. `npx cap sync ios && npx cap sync android`;
  6. tag `vX.Y.Z` and push.

## Cloud-agent environment notes

- The Cloud Agent VM is set up by the environment update script (it runs
  `npm install`); do not reinstall dependencies. Node 22 is provided.
- `npm run dev` (Vite on `http://localhost:5173/`) is the way to exercise the
  app in the cloud — all cloud work targets the **web** build.
- Mobile shells need a full native toolchain (Android Studio / Xcode) the cloud
  VM does not have: `npx cap sync`/`open` and device builds are not runnable
  there. iOS/Android compilation is still covered by the macOS/Linux CI
  workflows on every relevant change.
