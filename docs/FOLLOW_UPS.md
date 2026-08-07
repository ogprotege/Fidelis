# Open follow-ups

*What is known-broken, known-deferred, or known-inert — and what closing it takes.*
· [← Docs index](INDEX.md)

Each item records what was **verified**, not what was assumed, so the next session
starts from evidence instead of re-deriving it. Close an item by deleting it and
writing the outcome into [CHANGELOG.md](../CHANGELOG.md).

---

## 1. v1.24.4 is merged but not shipped — the remaining release steps

**Status:** open. Code is on `main` and green; nothing has reached a device.
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

**What is left, in order:**

1. **Tag the release** — [Releasing §7](guides/RELEASING.md#7-tag--push). Tags
   currently run `v1.0.0 … v1.24.2`; **`v1.24.3` was never tagged**, so tag both
   or consciously skip the gap. The previous session did not tag, because the
   maintainer asked for a merge and tagging was not requested.
   ```sh
   git checkout main && git pull origin main
   git tag v1.24.3 <the v1.24.3 release commit>   # optional: closes the gap
   git tag v1.24.4 && git push origin v1.24.4
   ```
2. **Build and upload to TestFlight** — [Releasing §8](guides/RELEASING.md#8-ship-the-ios-build-to-testflight).
   Needs a Mac (`bash scripts/ios-testflight.sh`) **or**, with no Mac, the
   *TestFlight release* workflow (GitHub → Actions → Run workflow, on the release
   commit), which needs the four Actions secrets `TEAM_ID`, `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, `ASC_KEY_P8`. To check a signing change without spending a
   build number: `FIDELIS_VERIFY_ONLY=1`.
3. **Rename the App Store Connect version `1.24.3` → `1.24.4`.** The store version
   string must equal the uploaded build's `MARKETING_VERSION`. 1.24.3 was prepared
   in ASC but **never released**, so its What's New copy is still unseen and was
   carried forward re-labelled rather than rewritten — v1.24.4 has no user-visible
   change to announce. Rationale is recorded under "Why this text still describes
   1.24.3" in [App Store](guides/APP_STORE.md).
4. **Run device acceptance** — [Releasing §9](guides/RELEASING.md#9-run-device-acceptance-before-the-store-submission)
   and item 2 below. **CI being green is not this gate.**

**Two things to verify in ASC before acting, not to assume.** As recorded on
2026-08-05, the **1.24.2 (build 307)** submission was `WAITING_FOR_REVIEW` with
release type **AFTER_APPROVAL**, meaning approval publishes it immediately; and
China mainland was removed from availability (174 territories) after a Guideline
2.1 rejection. Both may have moved since. Check the live state first — a version
already in review interacts with preparing another one.

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

**Status:** awaiting device testing — and the review clock is now running.
**Opened:** 2026-07-31. **Updated:** 2026-08-05.

v1.24.2 **is** now built and under review: build 307 (the first ever to carry
the App Group) uploaded 2026-07-31, VALID in TestFlight. On 2026-08-05, after
Apple returned the 1.24.0 (293) submission under Guideline 2.1 (China-mainland
book-content permit), China mainland was removed from availability (174
territories remain) and the same submission was resubmitted as 1.24.2 (307) —
now WAITING_FOR_REVIEW. The version's release type is **AFTER_APPROVAL**, so
approval publishes it to the App Store immediately: run this device pass now,
from TestFlight build 307, during the review window — or switch the version to
manual release in ASC if the pass cannot happen in time.

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
