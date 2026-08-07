# Open follow-ups

*What is known-broken, known-deferred, or known-inert — and what closing it takes.*
· [← Docs index](INDEX.md)

Each item records what was **verified**, not what was assumed, so the next session
starts from evidence instead of re-deriving it. Close an item by deleting it and
writing the outcome into [CHANGELOG.md](../CHANGELOG.md).

---

## 1. v1.24.4 awaits the 1.24.3 verdict — the remaining release steps

**Status:** open — blocked on Apple's 1.24.3 verdict. Tagged, released, and on
TestFlight (build 322); no device pass yet.
**Opened:** 2026-08-07. **Picking this up cold? Start here, then read item 2.**

v1.24.4 ("the fruitless branch") landed via **PR #91**. It restored CI — which
had been red since 2026-07-24 on the `npm audit` gate — by retiring the dead
`react-router-dom` shim for `react-router` 8.3.0 and clearing three dev-graph
advisories. See [CHANGELOG 1.24.4](../CHANGELOG.md) and the
[narrative](history/RELEASES.md#the-fruitless-branch-v1244) for *why*; this item
is only what is left to **do**.

**What is already done** — do not redo any of it:

- All eight checks green on the merged head: `build` (lint → both audits →
  1,048 harness checks → type-check → build → check-docs), `e2e` (31 Playwright
  tests), `ios-build`, `android-build`, and Android instrumentation on API 24,
  26, 31, 36.
- `package.json` **1.24.4**, lockfile root **1.24.4** (it had drifted to 1.24.1),
  iOS `MARKETING_VERSION` ×4 **1.24.4**, Android `versionName` **1.24.4** /
  `versionCode` **12404**, `docs/guides/APP_STORE.md` version block **1.24.4**.
- [Releasing](guides/RELEASING.md) steps **1–6** are satisfied. Step 5's "commit
  any native-project files that changed" needed only the two version strings —
  the synced web bundle is **not** committed (`cap sync` regenerates it, which is
  what the green `ios-build` / `android-build` jobs prove).
- Tagged and released: `v1.24.3` → `4ec6d1e`, `v1.24.4` → `d163a4c` (both
  pushed); GitHub releases published for both, v1.24.4 marked Latest.
- Re-verified on the release Mac 2026-08-07: 1,048 harness checks, the build,
  and all 31 Playwright e2e in real Chrome. **TestFlight build 322** uploaded
  from `d163a4c` via `bash scripts/ios-testflight.sh`.

**What is left, in order:**

1. **Wait for the 1.24.3 verdict — and touch nothing in ASC while it waits.**
   Verified live 2026-08-07 (asc CLI): **1.24.2 is READY_FOR_SALE** — approved,
   selling, the Guideline 2.1 story closed (China mainland stays off; 174
   territories) — and **1.24.3 (build 317)**, the *Fidelis: Catholic Bible*
   listing rename with captioned screenshots, is **WAITING_FOR_REVIEW**
   (submission `48c9563b…`, submitted 2026-08-07 14:55 UTC, release type
   AFTER_APPROVAL — approval publishes it by itself). An earlier revision of
   this item, written from the 08-05 facts, said to *rename ASC 1.24.3 →
   1.24.4*; that **must not be done** — editing or renaming a version waiting
   for review pulls it from the queue.
2. **After the verdict, stage 1.24.4 in ASC.** Create the new version (the "+"
   beside "iOS App" — ASC cannot hold a second in-flight version while 1.24.3
   is in review), paste [App Store](guides/APP_STORE.md) — its What's New is
   fresh copy for 1.24.4, since the rename news ships with 1.24.3 — attach
   **build 322**, drop the Guideline 2.1 paragraph from the review notes (count
   returns to 2,414), and submit.
3. **Run device acceptance** — [Releasing §9](guides/RELEASING.md#9-run-device-acceptance-before-the-store-submission)
   and item 2 below, from TestFlight build 322 (it carries the v1.24.2 widget
   repair *and* the v1.24.4 router swap). **CI being green is not this gate.**

**What a smoke test should touch first.** v1.24.4 swapped the router the whole app
runs on. The routing-sensitive paths are already covered by the green e2e suite
(ScrollManager restoring on browser Back, cross-page anchors, the widget
deep-link anchors, Back-with-a-sheet-open releasing the scroll lock), so on
hardware just confirm tab navigation, Back, and a widget cold-launch behave — then
spend the real effort on item 2, which is still the unverified one.

**One open question, deliberately left visible.** The react-router advisory
(GHSA-qwww-vcr4-c8h2) could **not** be reproduced from the previous session's
environment: its npm advisory feed served two ranges (`>=7.12.0 <7.18.2`,
`>=8.0.0 <8.3.0`), making 7.18.2 already patched, where CI printed the collapsed
`7.12.0 - 8.2.0` spanning that gap. The dev-graph half reproduced exactly. Do not
conclude the migration was unnecessary: 8.3.0 sits outside the advisory under
either reading, which is the point — a gate that goes green because someone else
edited an advisory record can go red the same way. **Harness §40 now pins this**
(9 checks): both audit steps must stay in `ci.yml` with no `|| true`,
`--audit-level`, or allowlist; the shim may not return to `src/`, `package.json`,
or the lockfile; and a declared **and** locked 8.3.0 floor must hold. If §40 turns
red, read it as the security decision being undone, not as a flaky test.

---

## 2. v1.24.2 has not been confirmed on physical hardware

**Status:** awaiting device testing — now against the **live** App Store app.
**Opened:** 2026-07-31. **Updated:** 2026-08-07.

v1.24.2 was approved and is **READY_FOR_SALE** (verified live 2026-08-07): the
widget repair reached production without this pass ever running, so it is now
unverified in the wild, not merely on TestFlight. Nothing needs pulling — the
task is unchanged, only more real. Run it from **TestFlight build 322** (same
widget code plus v1.24.4's router swap) or from the production App Store app;
build 317, in review with the 1.24.3 listing, carries identical app code.

**New in v1.24.2 — test this first.** The Mass and Quote home-screen widgets were
blank on every device (the App Group entitlement had never shipped; see
CHANGELOG 1.24.2). Both the signing repair and the per-day fallback are
unverified on hardware. Confirm: both widgets render real content; the app's
calendar-profile setting is now actually followed by the widgets (switch
General Roman <-> U.S. and check a day the two differ); and Siri "today's
Gospel" answers again.

The widget-entry navigation freeze was reproduced in real Chrome and fixed with
red-first regression coverage, but the fix has not yet been exercised on the
reporting device (iPhone 16 Pro Max, iOS 26.6).

**What to test, and why it is not obvious:**

- Cold-launch from each of Verse, Quote, and Mass; then tap **every** tab.
- **Wait 3+ seconds before the first tap.** The old defect had a 1,200 ms
  delivery-dedupe window that made a *fast* tap accidentally succeed, so a slow,
  deliberate tap is the sharper test.
- Background the app, tap a widget to re-enter warm, confirm Back returns to the
  page you were on rather than a synthetic launch entry.
- Confirm sheets (Share, Save image) still open and close from a widget
  destination.

Android carries the same defect and the same fix (`Bridge.intentUri` is captured
once in the Bridge constructor and never refreshed) and is likewise unverified on
hardware. See [Device acceptance](guides/DEVICE_ACCEPTANCE.md).

---

## 3. Two false readings taken from unvalidated shell output

**Status:** corrected in-repo; recorded as a method note.
**Opened:** 2026-07-31.

Both were wrong in the same way — a shell variable was trusted without checking
whether the command that filled it had succeeded:

1. **`npm audit` / ASC API.** `GET /v1/bundleIds/{id}/bundleIdCapabilities?limit=50`
   returns **HTTP 400** (`limit` is not allowed on that relationship). Reading
   `.data` off the error body yielded "no capabilities", and the conclusion "the
   App Group was never registered" — false. Query it **without `limit`**.
2. **`plutil -extract … json -`** writes to a **file named `-`**, not stdout, so
   the capturing variable was empty and printed as `NONE`, producing "the
   provisioning profiles do not grant the App Group" — false. Always pass
   **`-o -`**. That bug also left a junk file named `-` in the repo root, which
   `git add -A` committed (removed; `.gitignore` now covers it).

**Method note:** check the status code or exit status before reading a payload,
and prefer asserting a positive (`groups: [...]` present) over inferring from an
absence.
